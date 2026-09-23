import { pickSnark } from './snark';
import type { GameState, Outcome, Recent, StepResult, Unwrapped, WrapKind } from './types';

/**
 * The chirpy layer. Runs after a turn is resolved and appends a line when the player
 *   - shouts (the command ends in one or more "!"): the line answers the tone,
 *   - types `get ye flask` again: the flask nags, because the flask is the game's own joke.
 * Nothing else is appended: a wrapper ("i want to …", "ugh …", "… again") is stripped and the command plays, and a
 * repeat gets the game's answer alone. Pure and deterministic (pool picks use state.seed + turns), so replays stay stable.
 */

/** Normalized form used to detect repeats: lowercase, punctuation and extra spaces gone. */
export function normalize(input: string): string {
  return input.toLowerCase().replace(/[!?.]+$/g, '').replace(/\s+/g, ' ').trim();
}

function bangs(input: string): number {
  const m = /!+\s*$/.exec(input.trim());
  return m ? m[0].trim().length : 0;
}

/** Leading frustration wrappers ("ugh", "come on", "just"): stripped, so the command underneath plays. */
const FRUSTRATED_LEAD: readonly RegExp[] = [
  /^(ugh|argh|omg|come on|seriously|for the love of \w+|dammit|damn it|why won't you|why can't i|please just|just|okay fine|fine)[,!]?\s+/i,
  /^(listen|hey)[,!]\s+/i,
];

const LEAD: [RegExp, WrapKind][] = [
  [/^(i want to|i wanna|i would like to|i'd like to|can i|could i|may i|let me|i will|i'll|i'm going to|im going to|try to|attempt to|how do i|how about i)\s+/i, 'intent'],
  [/^(i said|i told you|i already said|like i said|as i said|again,?)\s+/i, 'insist'],
  ...FRUSTRATED_LEAD.map((re): [RegExp, WrapKind] => [re, 'frustrated']),
];
const TRAIL: [RegExp, WrapKind][] = [
  [/[,!]?\s+(again|already|like i said)\s*([!?.]*)$/i, 'insist'],
  [/[,!]?\s+(dammit|damn it|you idiot|you stupid game|right now|now|please)\s*([!?.]*)$/i, 'frustrated'],
];
/** Whole lines the trailing wrappers leave alone: "what now" asks for the hint (world/globals.ts HINT_PHRASES), it is not a frustrated "what". */
const WHOLE_LINE = /^what now\s*[!?.]*$/i;

/** Strip one leading and/or one trailing wrapper. Keeps the trailing punctuation so bangs() still sees it. */
export function unwrap(raw: string): Unwrapped {
  let s = raw.trim();
  const out: Unwrapped = { command: s, kind: null };
  for (const [re, k] of LEAD) {
    const m = re.exec(s);
    if (m && m[0].length < s.length) { s = s.slice(m[0].length); out.lead = { kind: k, word: m[1]!.toLowerCase() }; break; }
  }
  if (!WHOLE_LINE.test(s)) for (const [re, k] of TRAIL) {
    const m = re.exec(s);
    if (m && m.index > 0) { s = s.slice(0, m.index) + (m[2] ?? ''); out.trail = { kind: k, word: m[1]!.toLowerCase() }; break; }
  }
  out.command = s.trim();
  out.kind = out.lead?.kind ?? out.trail?.kind ?? null;
  return out;
}

const SHOUT_OK = [
  'Ye did it, and ye did it LOUDLY.',
  'Whoa. Okay. It worked. No need to punch the keyboard.',
  "The realm heard that in the back row. Everyone's awake now.",
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
  'Frustration logged. It does not count toward the 200.',
  "Okay, okay. Same answer, but I'll say it slower.",
  'Ye wish. Ye wish with feeling.',
  'The dragon is not fed by tone.',
  'Deep breaths. The realm has all day. The realm is billed by the second, but it has all day.',
  'The narrator senses frustration. The narrator has a certification in that.',
  'NO MAN! JEEZ!',
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
  '!!! is not in the sudoers file.',
  'Okay. OKAY. We heard you. So did the dragon.',
];

const REPEAT_FLASK = [
  'Ye still cannot get ye flask.',
  'The flask is aware of you now.',
  'Ye flask has filed a complaint.',
  'Still a flask. Still ungettable. Still the best hint in the realm.',
  'Ye wish! (Again.)',
  'You probably WISH you could get that flask. The wish has been logged.',
];

function pick<T>(s: GameState, pool: T[], salt: number): T {
  return pool[Math.abs(Math.imul(s.seed ^ 0x51ed270b, s.turns + salt) >>> 0) % pool.length]!;
}

export type QuirkOptions = {
  /** The turn was answered by a prompt room (Copilot), which does its own repeat commentary: only the shout lines apply. */
  suppressWrapAndRepeat?: boolean;
};

/** Add the shout line and the flask's nag. `prev` is the state before the turn; `input` the command, trailing "!" kept. */
export function applyQuirks(prev: GameState, input: string, result: StepResult, recent: Recent, opts: QuirkOptions = {}): StepResult {
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

  // The flask, typed again: its own nag, every time. No other repeat gets a line of its own.
  if (!opts.suppressWrapAndRepeat && isFlask && recent.n >= 2) extra.push(pick(prev, REPEAT_FLASK, 5));

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

/** Every chirp line, flattened, for the voice harness (tests/voice-harness.test.ts). */
export const QUIRK_POOLS: readonly string[] = [...SHOUT_OK, ...SHOUT_NO, ...SHOUT_FLASK, ...SHOUT_CRUDE, ...SHOUT_MANY, ...REPEAT_FLASK];
