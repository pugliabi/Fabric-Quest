import type { RayfinClient } from '@microsoft/rayfin-client';
import type { ProsQuestSchema } from '../../rayfin/data/schema';

export type QuestStart = { questId: string; playerName: string; clientId: string; worldVersion: string; startedAt: string };
export type ActivityRecord = {
  questId: string; playerName: string; clientId: string; seq: number; stepId: string; roomId: string; rawInput: string; verb?: string; noun?: string;
  outcome: string; outputText: string; pointsAwarded: number; scoreAfter: number; turnsAfter: number; flagsAfter: string; occurredAt: string;
};
export type FinishRecord = { questId: string; playerName: string; score: number; bonus: number; turns: number; elapsedSeconds: number; finishedAt: string };
/** `bonus` is side-quest points on top of the 200-point score; 0 for rows written before side quests existed. */
export type HallEntry = { player_name: string; score: number; bonus: number; turns: number; elapsed_seconds: number; finished_at: string };

export interface Recorder {
  startQuest(q: QuestStart): void;
  record(a: ActivityRecord): void;
  finish(f: FinishRecord): Promise<void>;
  hallOfFame(limit: number): Promise<HallEntry[]>;
  /** True when writes actually go somewhere. */
  readonly live: boolean;
}

/** Fallback when no backend is reachable (plain `vite` dev without `rayfin dev`, or offline). */
export class ConsoleRecorder implements Recorder {
  readonly live = false;
  startQuest(q: QuestStart): void { console.debug('[quest]', q); }
  record(a: ActivityRecord): void { console.debug('[activity]', a.seq, a.rawInput, a.outcome, a.stepId); }
  async finish(f: FinishRecord): Promise<void> { console.debug('[finish]', f); }
  async hallOfFame(): Promise<HallEntry[]> { return []; }
}

const QUEUE_KEY = 'fabricsquest.telemetry-queue';
/** Rows before this are pre-launch test runs; they stay in the database but never on the board. */
export const HALL_OPENED = new Date('2026-09-22T19:00:00Z');
export const HALL_SIZE = 25;
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

/**
 * Anonymous callers may CREATE but not READ Quest/Activity rows, so DAB answers a successful
 * insert with a "Forbidden to view the response" GraphQL error. The row is in; treat it as success.
 */
async function createBlind(op: () => Promise<unknown>): Promise<void> {
  try {
    await op();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/was successful/i.test(msg)) return;
    throw e;
  }
}

/**
 * Writes to the Fabric SQL database through the anonymous GraphQL API.
 * Activity rows are queued and flushed in the background so the game never waits on the network;
 * the queue is mirrored to localStorage so a closed tab does not lose the tail of a run.
 */
export class RayfinRecorder implements Recorder {
  readonly live = true;
  private queue: ActivityRecord[] = [];
  private flushing = false;
  private timer: number | undefined;

  constructor(private client: RayfinClient<ProsQuestSchema>) {
    try {
      const saved = localStorage.getItem(QUEUE_KEY);
      if (saved) this.queue = JSON.parse(saved) as ActivityRecord[];
    } catch { /* storage unavailable */ }
    if (this.queue.length) this.scheduleFlush(0);
  }

  startQuest(q: QuestStart): void {
    void createBlind(() => this.client.data.Quest.create({
      id: q.questId,
      player_name: clip(q.playerName, 40),
      client_id: q.clientId,
      user_agent: clip(navigator.userAgent, 400),
      world_version: q.worldVersion,
      started_at: new Date(q.startedAt),
    })).catch((e: unknown) => console.warn('[quest] write failed', e));
  }

  record(a: ActivityRecord): void {
    this.queue.push(a);
    this.persist();
    // Gentle on a small capacity: one flush every 10 s, or when 25 rows are waiting.
    this.scheduleFlush(this.queue.length >= 25 ? 0 : 10000);
  }

  async finish(f: FinishRecord): Promise<void> {
    // The leaderboard row goes first so the player sees "Submitted!" immediately; the activity tail keeps draining behind it.
    await createBlind(() => this.client.data.HallOfFame.create({
      quest_id: f.questId,
      player_name: clip(f.playerName, 40),
      score: f.score,
      bonus: f.bonus,
      turns: f.turns,
      elapsed_seconds: f.elapsedSeconds,
      finished_at: new Date(f.finishedAt),
    }));
    void this.flush();
  }

  async hallOfFame(limit: number): Promise<HallEntry[]> {
    const rows = await this.client.data.HallOfFame
      .select(['player_name', 'score', 'bonus', 'turns', 'elapsed_seconds', 'finished_at'])
      .where({ finished_at: { gte: HALL_OPENED }, score: { gt: 0 } }) // the board reset at public launch; zeros don't count
      .orderBy({ score: 'desc', bonus: 'desc', turns: 'asc' }) // bonus breaks score ties
      .first(limit)
      .execute();
    return rows.map((r) => ({
      player_name: r.player_name, score: r.score, bonus: r.bonus ?? 0, turns: r.turns, elapsed_seconds: r.elapsed_seconds,
      finished_at: r.finished_at instanceof Date ? r.finished_at.toISOString() : String(r.finished_at),
    }));
  }

  private persist(): void {
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue)); } catch { /* ignore */ }
  }

  private scheduleFlush(ms: number): void {
    if (this.timer !== undefined) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => void this.flush(), ms);
  }

  private async flush(): Promise<void> {
    if (this.flushing) return;
    this.flushing = true;
    try {
      while (this.queue.length) {
        // Up to 4 rows in flight at once; each row is removed from the queue only after its own write succeeds.
        const batch = this.queue.slice(0, 4);
        await Promise.all(batch.map((a) => this.writeActivity(a).then(() => {
          this.queue = this.queue.filter((q) => q !== a);
          this.persist();
        })));
      }
    } catch (e) {
      console.warn('[activity] flush failed, will retry', e);
      this.scheduleFlush(10000);
    } finally {
      this.flushing = false;
    }
  }

  private writeActivity(a: ActivityRecord): Promise<void> {
    return createBlind(() => this.client.data.Activity.create({
          quest_id: a.questId,
          player_name: clip(a.playerName, 40),
          client_id: a.clientId,
          seq: a.seq,
          step_id: clip(a.stepId, 80),
          room_id: clip(a.roomId, 80),
          raw_input: clip(a.rawInput, 200),
          verb: a.verb,
          noun: a.noun ? clip(a.noun, 120) : undefined,
          outcome: a.outcome,
          output_text: clip(a.outputText, 2000),
          points_awarded: a.pointsAwarded,
          score_after: a.scoreAfter,
          turns_after: a.turnsAfter,
          flags_after: clip(a.flagsAfter, 4000),
          occurred_at: new Date(a.occurredAt),
        }));
  }
}

/**
 * Wraps a recorder that is still being resolved (the Rayfin client fetches runtime config from the
 * backend, which can take a while on a throttled capacity). Calls made before it resolves are queued,
 * so the game can render and be played immediately.
 */
export class DeferredRecorder implements Recorder {
  private inner: Recorder | null = null;
  private pending: Array<(r: Recorder) => void> = [];
  private ready: Promise<Recorder>;
  constructor(promise: Promise<Recorder>) {
    this.ready = promise.then((r) => {
      this.inner = r;
      for (const fn of this.pending) fn(r);
      this.pending = [];
      return r;
    });
  }
  get live(): boolean { return this.inner?.live ?? true; }
  startQuest(q: QuestStart): void { this.inner ? this.inner.startQuest(q) : this.pending.push((r) => r.startQuest(q)); }
  record(a: ActivityRecord): void { this.inner ? this.inner.record(a) : this.pending.push((r) => r.record(a)); }
  async finish(f: FinishRecord): Promise<void> { return (await this.ready).finish(f); }
  async hallOfFame(limit: number): Promise<HallEntry[]> { return (await this.ready).hallOfFame(limit); }
}
