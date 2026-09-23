import { describe, expect, it } from 'vitest';
import type { RayfinClient } from '@microsoft/rayfin-client';
import type { ProsQuestSchema } from '../rayfin/data/schema';
import { RayfinRecorder } from '../src/game/recorder';

/** A stand-in for the Rayfin client: records the HallOfFame calls, returns canned rows. */
function fakeClient(rows: Record<string, unknown>[]) {
  const calls: { created?: Record<string, unknown>; select?: string[]; orderBy?: Record<string, string> } = {};
  const query = {
    select(cols: string[]) { calls.select = cols; return query; },
    where() { return query; },
    orderBy(o: Record<string, string>) { calls.orderBy = o; return query; },
    first() { return query; },
    async execute() { return rows; },
  };
  const client = {
    data: {
      HallOfFame: {
        ...query,
        async create(row: Record<string, unknown>) { calls.created = row; return row; },
      },
    },
  } as unknown as RayfinClient<ProsQuestSchema>;
  return { client, calls };
}

describe('RayfinRecorder Hall of Fame bonus', () => {
  it('sends the bonus with the finish row', async () => {
    const { client, calls } = fakeClient([]);
    await new RayfinRecorder(client).finish({ questId: 'q', playerName: 'P', score: 120, bonus: 45, turns: 300, elapsedSeconds: 60, finishedAt: '2026-09-23T00:00:00Z' });
    expect(calls.created?.bonus).toBe(45);
  });

  it('selects bonus, breaks score ties on it, and reads a missing bonus as 0', async () => {
    const at = new Date('2026-09-23T00:00:00Z');
    const { client, calls } = fakeClient([
      { player_name: 'New', score: 200, bonus: 45, turns: 300, elapsed_seconds: 900, finished_at: at },
      { player_name: 'Old', score: 200, bonus: null, turns: 280, elapsed_seconds: 800, finished_at: at },
      { player_name: 'Older', score: 150, turns: 250, elapsed_seconds: 700, finished_at: at },
    ]);
    const hall = await new RayfinRecorder(client).hallOfFame(25);
    expect(calls.select).toContain('bonus');
    expect(calls.orderBy).toEqual({ score: 'desc', bonus: 'desc', turns: 'asc' });
    expect(Object.keys(calls.orderBy!)).toEqual(['score', 'bonus', 'turns']); // key order is sort priority
    expect(hall.map((h) => h.bonus)).toEqual([45, 0, 0]);
  });
});
