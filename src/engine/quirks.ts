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
  'Ye did it, and ye did it LOUDLY.',
  'Whoa. Okay. It worked. No need to punch the keyboard.',
  "The realm heard that in the back row. Result: the same. Everyone's awake now, though.",
  'Enthusiasm accepted. Points unchanged. Volume logged.',
  'Great job. Somebody get this peasant a cold one.',
];
const SHOUT_NO = [
  'Shouting at the parser has never once worked. The parser keeps a tally.',
  "NO. Also no. See? Caps don't help me either.",
  "The exclamation mark has been received and filed under 'not a verb.'",
  "You holler. A peasant three rooms over hollers back 'WHAT?' That is the whole exchange.",
  'Louder is not a synonym for correct. Ask any stakeholder.',
  'Ye wish. Ye wish LOUDLY.',
  'The system is not down. Your command is.',
  'Your exclamation mark echoes off the Lakehouse. Nothing echoes back.',
];
const SHOUT_FLASK = [
  'YE FLASK IS UNMOVED BY YOUR CAPS LOCK.',
  'Ye cannot get ye flask. Ye cannot shout ye flask either.',
  'The flask has heard it all. It has heard it all in caps.',
  'Ye wish! Ye wish at volume.',
];
const SHOUT_CRUDE = [
  'You announced it. Everyone in the realm now knows. Nobody wanted to.',
  'Shouting it does not make it hygienic.',
  'The exclamation mark has been added to the incident report.',
  "Say it louder — the Duke's guards didn't catch that for the log.",
];
const SHOUT_MANY = [
  'Three exclamation marks. The realm has opened a ticket.',
  'That many exclamation marks is a P1. Response time: four business days.',
  'The punctuation budget for this quest is exhausted. Refills at the Mill.',
  '!!! is not in the sudoers file either.',
  'Okay. OKAY. We heard you. So did the dragon.',
];

const REPEAT_2 = [
  "You try that again. The realm gives the same answer again. It's called consistency.",
  'Same thing. You could type it a third time, but the narrator is begging you.',
  'Once more, with feeling. Still no.',
  'Ye wish. Ye wished that already.',
  "It's a parser, not a slot machine.",
  "Nothing new. This isn't Excel — you can't fix it by clicking harder.",
];
const REPEAT_3 = [
  'Third time. The realm is starting to suspect a load test.',
  'Three times. A lesser game would have crashed by now. This one is merely disappointed.',
  'You have done this three times. The narrator is writing it down in a very small notebook.',
  'Three. Three attempts. The dragon does not respect this.',
];
const REPEAT_MANY = [
  (n: number) => `That's ${n} times. Please consider a different verb. Any verb.`,
  (n: number) => `${n} attempts. The realm admires your refresh schedule.`,
  (n: number) => `Attempt ${n}. This is, technically, a retry policy. It is not a good one.`,
  (n: number) => `${n}. The number is ${n}. The peasant three rooms over just yelled 'STOP.'`,
  (n: number) => `You have now typed that ${n} times. The Miller has started a pool on when you'll quit.`,
];
const REPEAT_FLASK = [
  'Ye still cannot get ye flask.',
  'The flask is aware of you now.',
  'Ye flask has filed a complaint.',
  'Still a flask. Still ungettable. Still the best hint in the realm.',
  'Ye wish! (Again.)',
  'You probably WISH you could get that flask. The wish has been logged.',
];
const REPEAT_LOOK = [
  'You look again. It has not changed. Neither have you.',
  'Still there. Still the same. Still a little sad.',
  'Nothing new since the last time you looked, four seconds ago.',
  'Looking twice is free. Understanding remains full price.',
  "It's not going to develop a plot if you stare at it.",
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
