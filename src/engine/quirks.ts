import { pickSnark } from './snark';
import type { GameState, Outcome, StepResult } from './types';

/**
 * The chirpy layer. Runs after a turn is resolved and appends a line when the player
 *   - shouts (the command ends in one or more "!"),
 *   - repeats the same command in the same room and it did nothing new.
 * Pure and deterministic (pool picks use state.seed + turns), so replays stay stable.
 */

export type Recent = { input: string; room: string; n: number };

/** Normalized form used to detect repeats: lowercase, punctuation and extra spaces gone. */
export function normalize(input: string): string {
  return input.toLowerCase().replace(/[!?.]+$/g, '').replace(/\s+/g, ' ').trim();
}

export function bangs(input: string): number {
  const m = /!+\s*$/.exec(input.trim());
  return m ? m[0].trim().length : 0;
}

const SHOUT_OK = [
  'The exclamation mark helped. Probably.',
  'Enthusiasm noted. The realm awards no points for enthusiasm, but it noticed.',
  'It would also have worked quietly. But sure.',
  'The narrator appreciates the energy.',
];
const SHOUT_NO = [
  'Shouting does not change the parser\'s mind. It has been shouted at before.',
  'The realm hears you. The realm is unmoved.',
  'Volume is not a verb.',
  'You said it louder. The result is the same, but louder.',
  'Your exclamation mark echoes off the Lakehouse. Nothing echoes back.',
  'Somewhere, a capacity admin flinches. That is all that happens.',
];
const SHOUT_FLASK = [
  'YE FLASK REMAINS UNGOTTEN. Louder now.',
  'Ye cannot get ye flask, and the capitals do not help.',
  'The flask hears you. The flask has heard everyone. The flask is tired.',
];
const SHOUT_CRUDE = [
  'Shouting it does not make it hygienic.',
  'Louder does not mean cleaner.',
  'The exclamation mark has been added to the incident report.',
  'You announced it. Everyone in the realm now knows. Nobody wanted to.',
];
const SHOUT_MANY = [
  'Three exclamation marks. The realm has opened a ticket.',
  'That many exclamation marks is a P1. The realm will get back to you within four business days.',
  'The punctuation budget for this quest is now exhausted.',
];

const REPEAT_2 = [
  'Same command, same room, same answer.',
  'You try again. The realm tries the same answer again.',
  'It went about the same as last time.',
  'Once more, with feeling. Still no.',
];
const REPEAT_3 = [
  'Third time. The realm is starting to suspect a load test.',
  'You have now done this three times. The narrator is writing it down.',
  'Three attempts. A lesser game would have crashed by now.',
];
const REPEAT_MANY = [
  (n: number) => `That is ${n} times. Please consider a different verb.`,
  (n: number) => `${n} attempts. The realm admires your refresh schedule.`,
  (n: number) => `Attempt ${n}. This is, technically, a retry policy.`,
];
const REPEAT_FLASK = [
  'Ye still cannot get ye flask.',
  'The flask is aware of you now.',
  'Ye flask has filed a complaint.',
  'Still a flask. Still ungettable. Still the best hint in the realm.',
];
const REPEAT_LOOK = [
  'You look again. It has not changed. Neither have you.',
  'Still there. Still the same. Still a little sad.',
  'Nothing new since the last time you looked, four seconds ago.',
];

function pick<T>(s: GameState, pool: T[], salt: number): T {
  return pool[Math.abs(Math.imul(s.seed ^ 0x51ed270b, s.turns + salt) >>> 0) % pool.length]!;
}

function unchanged(a: GameState, b: GameState): boolean {
  return a.room === b.room && a.score === b.score && a.inventory.length === b.inventory.length
    && a.worn.length === b.worn.length && JSON.stringify(a.flags) === JSON.stringify(b.flags);
}

/** Add the shout and repeat commentary. `prev` is the state before the turn; `input` the raw line. */
export function applyQuirks(prev: GameState, input: string, result: StepResult, recent: Recent): StepResult {
  if (result.state.dead || result.state.won) return result;
  const extra: string[] = [];
  const isFlask = /^get ye flask$/.test(normalize(input));
  const isCrude = /^egg\.(pee|poop|fart|puke|swear)$/.test(result.stepId);
  const good: Outcome[] = ['success', 'move', 'win'];

  const n = bangs(input);
  if (n > 0) {
    if (n >= 3) extra.push(pick(prev, SHOUT_MANY, 1));
    else if (isFlask) extra.push(pick(prev, SHOUT_FLASK, 2));
    else if (isCrude) extra.push(pick(prev, SHOUT_CRUDE, 10));
    else if (good.includes(result.outcome)) extra.push(pick(prev, SHOUT_OK, 3));
    else if (result.outcome !== 'meta') extra.push(pick(prev, SHOUT_NO, 4));
  }

  // Repeats: failures and snark that changed nothing, looking at the same thing twice, and the flask (always).
  const looking = (result.parsed.verb === 'look' || result.parsed.verb === 'read') && result.outcome === 'success';
  const failed = result.outcome === 'fail' || result.outcome === 'snark';
  if (recent.n >= 2 && (isFlask || ((failed || looking) && unchanged(prev, result.state)))) {
    if (isFlask) extra.push(pick(prev, REPEAT_FLASK, 5));
    else if (looking) extra.push(pick(prev, REPEAT_LOOK, 6));
    else if (recent.n === 2) extra.push(pick(prev, REPEAT_2, 7));
    else if (recent.n === 3) extra.push(pick(prev, REPEAT_3, 8));
    else extra.push(pick(prev, REPEAT_MANY, 9)(recent.n));
  }

  return extra.length ? { ...result, output: [...result.output, ...extra] } : result;
}

/** Track the command for repeat detection. */
export function nextRecent(prevRecent: Recent | undefined, input: string, room: string): Recent {
  const key = normalize(input);
  if (prevRecent && prevRecent.input === key && prevRecent.room === room) return { input: key, room, n: prevRecent.n + 1 };
  return { input: key, room, n: 1 };
}

/** Deterministic variety for the built-in "that didn't work" answers. */
export function vary(s: GameState, pool: string[]): string {
  return pickSnark(s.seed ^ 0x2545f491, s.turns, pool);
}
