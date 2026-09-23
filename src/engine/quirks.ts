import { pickSnark } from './snark';
import type { GameState, Outcome, Recent, StepResult, Unwrapped, WrapKind } from './types';
import { FRUSTRATION } from '../world/voice';

/**
 * The chirpy layer. Runs after a turn is resolved and appends a line when the player
 *   - shouts (the command ends in one or more "!"),
 *   - repeats the same command in the same room, it did nothing new, and the game gave the same answer as last time
 *     (Task F4b: when the answer changed, the world remembered, and that line IS the repeat joke).
 * Pure and deterministic (pool picks use state.seed + turns), so replays stay stable.
 */

export type { Recent } from './types';

/** Normalized form used to detect repeats: lowercase, punctuation and extra spaces gone. */
export function normalize(input: string): string {
  return input.toLowerCase().replace(/[!?.]+$/g, '').replace(/\s+/g, ' ').trim();
}

export function bangs(input: string): number {
  const m = /!+\s*$/.exec(input.trim());
  return m ? m[0].trim().length : 0;
}

export type { WrapKind } from './types';

/** Leading frustration wrappers. Exported so the Copilot pane can tell a frustrated prompt the same way the chirps do. */
export const FRUSTRATED_LEAD: readonly RegExp[] = [
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

/** "I want to …" that worked (or was a look / inventory): the permission was never the problem. */
export const INTENT_OK = [
  'You may. You just did.',
  'Ambition logged. Result attached.',
  'The realm does not need your consent form. Just the verb.',
  'Permission was never the issue. Look, it worked.',
];
/** "I want to …" that did not: the wanting is all that happened. */
export const INTENT_NO = [
  'Wanting is noted. Doing is a verb.',
  'Noted: you would like to. The realm would like a star schema. We all have wants.',
  'The realm does not need your consent form. It needs a better idea.',
  'Permission granted. Success sold separately.',
];
const INSIST = [
  'You said. The realm heard. The realm is choosing not to.',
  "Saying it again with 'I said' in front does not add a verb.",
  'The narrator was there the first time.',
  "'Again' is not a modifier the parser supports. Neither is 'already'.",
  'Yes. You said. It is in the log. The log is unimpressed.',
  'Yeah but like you already said the said, guy.',
];
/** One unchanging consolation, every time (spec1 §5.3). The six lines it replaced live on at the end of SHOUT_NO. */
const FRUSTRATED = [FRUSTRATION];
const ALL_THREE = 'All three. Caps, "I said", and a third try. This is a support ticket now.';

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
  // The voice pass (spec1 §5.2): refuse by remembering.
  "Come now. We've been through this jaunty little bit before.",
  'We did that already, and it was sort of humiliating.',
  'You done that already. A great time was had by all.',
];
// New lines go LAST: tests/quirks.test.ts expects "three|third" on the third repeat with seed 5, which picks an old index.
const REPEAT_3 = [
  'Third time. The realm is starting to suspect a load test.',
  'Three times. A lesser game would have crashed by now. This one is merely disappointed.',
  'You have done this three times. The narrator is writing it down in a very small notebook.',
  'Three. Three attempts. The dragon does not respect this.',
  'Are you THAT bored? Do some questing already!',
];
const REPEAT_MANY = [
  (n: number) => `That's ${n} times. Please consider a different verb. Any verb.`,
  (n: number) => `${n} attempts. The realm admires your refresh schedule.`,
  (n: number) => `Attempt ${n}. This is, technically, a retry policy. It is not a good one.`,
  (n: number) => `${n}. The number is ${n}. The peasant three rooms over just yelled 'STOP.'`,
  (n: number) => `You have now typed that ${n} times. The Miller has started a pool on when you'll quit.`,
  (n: number) => `${n}. You are an incredibly boring person.`,
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
/** Looking at the same thing by count (spec1 §5.2): the second look fishes, the third gets told, the fourth on is the old pool. Exported for the voice harness. */
export const REPEAT_LOOK_2 = [...REPEAT_LOOK, "You're really hurtin' for puzzle solutions, huh?"];
export const REPEAT_LOOK_3 = ['Shut up.', 'You are an incredibly boring person.'];

function pick<T>(s: GameState, pool: T[], salt: number): T {
  return pool[Math.abs(Math.imul(s.seed ^ 0x51ed270b, s.turns + salt) >>> 0) % pool.length]!;
}

/**
 * The per-try counters: the gates' (world/gates.ts, `gate.<id>`), the Duke's wrong answers and the Card's stares
 * (world/fortress.ts, the curses' fuses). A retry that only bumped one of those is still a repeat, and still chirped
 * when it got the same answer (a gate's plainer hint or next flavor line is a changed answer: see `answerChanged`).
 */
// The per-NPC talk counters (`talk.<id>`, bumped in step.ts finish() on every talk) are the same kind of thing (F12):
// a talk that got the same final text is a repeat whether or not its counter moved; the text comparison decides.
const TRY_COUNTER = /^(gate\.|duke\.wrong$|card\.stares$|talk\.)/;
const settled = (flags: GameState['flags']): string => JSON.stringify(Object.fromEntries(Object.entries(flags).filter(([k]) => !TRY_COUNTER.test(k))));

function unchanged(a: GameState, b: GameState): boolean {
  return a.room === b.room && a.score === b.score && a.inventory.length === b.inventory.length
    && a.worn.length === b.worn.length && settled(a.flags) === settled(b.flags);
}

export type QuirkOptions = {
  /** The turn was answered by a prompt room (Copilot), which does its own wrapper and repeat commentary: only the shout lines apply. */
  suppressWrapAndRepeat?: boolean;
  /**
   * The answer to this command is not the one it got last time (Task F4b): an item's `again` line, a rule's second
   * reading, an NPC's next variant, a gate's plainer hint. That line is the repeat joke, so the generic repeat chirp
   * stays quiet. The flask keeps its nag, the shout and wrapper lines are unaffected, and the counter still climbs.
   */
  answerChanged?: boolean;
};

/** Add the shout and repeat commentary. `prev` is the state before the turn; `input` the raw line. */
export function applyQuirks(prev: GameState, input: string, result: StepResult, recent: Recent, kind: WrapKind | null = null, opts: QuirkOptions = {}): StepResult {
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

  if (opts.suppressWrapAndRepeat) return extra.length ? { ...result, output: [...result.output, ...extra] } : result;

  if (kind === 'intent') extra.push(pick(prev, good.includes(result.outcome) || result.outcome === 'meta' ? INTENT_OK : INTENT_NO, 11));
  else if (kind === 'insist') extra.push(pick(prev, INSIST, 12));
  // A wrapper around a swear ("ugh, hell"): egg.swear already answered with the one line, so it is not said twice.
  else if (kind === 'frustrated' && !result.output.includes(FRUSTRATION)) extra.push(pick(prev, FRUSTRATED, 13));
  if (kind && n > 0 && recent.n >= 3) extra.push(ALL_THREE);

  // Repeats: failures and snark that changed nothing and got the same answer as last time, looking at the same thing
  // twice and seeing the same words, and the flask (always). A changed answer is the world remembering: no chirp.
  const looking = (result.parsed.verb === 'look' || result.parsed.verb === 'read') && result.outcome === 'success';
  const failed = result.outcome === 'fail' || result.outcome === 'snark';
  if (recent.n >= 2 && (isFlask || (!kind && !opts.answerChanged && (failed || looking) && unchanged(prev, result.state)))) {
    if (isFlask) extra.push(pick(prev, REPEAT_FLASK, 5));
    else if (looking) extra.push(pick(prev, recent.n === 2 ? REPEAT_LOOK_2 : recent.n === 3 ? REPEAT_LOOK_3 : REPEAT_LOOK, 6));
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

/** Every chirp line, flattened, for the voice harness (tests/voice-harness.test.ts). */
export const QUIRK_POOLS: readonly string[] = [
  ...INTENT_OK, ...INTENT_NO, ...INSIST, ...FRUSTRATED, ...SHOUT_OK, ...SHOUT_NO, ...SHOUT_FLASK, ...SHOUT_CRUDE, ...SHOUT_MANY,
  ...REPEAT_2, ...REPEAT_3, ...REPEAT_MANY.map((f) => f(7)), ...REPEAT_FLASK, ...REPEAT_LOOK, ...REPEAT_LOOK_2, ...REPEAT_LOOK_3, ALL_THREE,
];
