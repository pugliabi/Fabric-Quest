import type { GameState } from '../engine/types';
import type { PhraseRule, RuleThen } from './types';

/**
 * Power Query Hall's seven Applied Steps (spec1 §4.2). Everything in the hall is a step, in order, and the order is
 * the whole joke: the room text names them, `look at steps` lists them with state, and every doorway answers the
 * obvious verbs by its place in the chain. The puzzle itself — applying them in order for +10, the real M errors out
 * of order — is spec2 §8 (applyStep() below), whose seven step commands follow the door poke in APPLIED_STEP_PHRASES.
 */

/** The seven Applied Steps of the hall's broken query, in order (spec1 §4.2; the puzzle is spec2 §8, Task E6). */
export const STEPS = ['Source', 'Navigation', 'Promoted Headers', 'Changed Type', 'Filtered Rows', 'Removed Other Columns', 'Renamed Columns'] as const;
/** The first accepted command for each step, for hints. */
export const STEP_COMMANDS = ['source', 'navigate', 'promote headers', 'change type', 'filter rows', 'remove other columns', 'rename columns'] as const;

/** Highest step applied in order, 0–7. */
export const pqStep = (s: GameState): number => Math.min(7, Math.max(0, Number(s.flags['pq.step']) || 0));
export const pqDone = (s: GameState): boolean => !!s.flags['pq.done'];

/**
 * The hall's one vocabulary for a step's state (fix round 1, M2), used by the room text, `look at steps`, `look at
 * query`, `look at doorways` and the door pokes alike: OPEN = applied; WAITING = the next one, where the query stopped;
 * YELLOW = every step after that.
 */
export const STEP_STATE = { open: 'open', waiting: 'waiting', yellow: 'yellow' } as const;

/** `✓ Source ✓ Navigation ✗ Promoted Headers (waiting) · yellow: Changed Type, Filtered Rows, …`; all ticks once done. */
export function stepsList(s: GameState): string {
  const k = pqStep(s);
  if (pqDone(s)) return STEPS.map((name) => `✓ ${name}`).join(' ');
  const shown = STEPS.slice(0, k + 1).map((name, i) => (i < k ? `✓ ${name}` : `✗ ${name} (${STEP_STATE.waiting})`));
  const rest = STEPS.slice(k + 1);
  return rest.length ? `${shown.join(' ')} · ${STEP_STATE.yellow}: ${rest.join(', ')}` : shown.join(' ');
}

/** The step names as the player types them ("filtered rows"): item aliases in keep-items.ts, nouns in the door regex. */
export const STEP_NOUNS: readonly string[] = STEPS.map((n) => n.toLowerCase());

const DOOR_NOUNS = `(${STEP_NOUNS.join('|')})`;
// The walking verbs. Not `apply`, `add`, `get`, `pick`, `detect`, `filter`, `remove`, `rename`: those open the step
// commands below ("apply source", "remove other columns"), which are registered after this poke and must still be reached.
const DOOR_VERBS = '(open|enter|use|go (to|into|through)|walk (into|through)|step (into|through)|push|pull|knock( on)?|kick|try)';
const DOOR_TEST = new RegExp(`^${DOOR_VERBS}( the)? ${DOOR_NOUNS}( door| doorway| step)?$`);

/** Per-step door pokes: "You try the Filtered Rows door. It's yellow. Changed Type first: `apply changed type`." */
function doorPoke(s: GameState, line: string): string {
  const which = new RegExp(DOOR_NOUNS).exec(line)?.[1] ?? STEP_NOUNS[0]!;
  const j = STEP_NOUNS.indexOf(which) + 1;
  const name = STEPS[j - 1]!;
  const k = pqStep(s);
  if (pqDone(s)) return `The ${name} door is open. You walk through. The query refreshes behind you: 4.2M.`;
  if (j <= k) return `The ${name} door is open. You walk through it. Nothing happens; it's applied.`;
  if (j === k + 1) return `The ${name} door is waiting; it's next. \`${STEP_COMMANDS[j - 1]}\` or \`apply ${STEP_NOUNS[j - 1]}\`.`;
  return `You try the ${name} door. It's yellow. ${STEPS[k]} first: \`apply ${STEP_NOUNS[k]}\`.`;
}

// ---- The puzzle (spec2 §8): apply the seven in order for +10; out of order, the real M error ----

/** What the player types to apply each step: the spec's commands plus the obvious spellings, as regex alternatives. */
const FORMS: readonly (readonly string[])[] = [
  ['source', 'add source', 'get data'],
  ['navigate', 'navigation', 'pick (a |the )?table'],
  ['promote (the )?headers', 'promoted headers', 'use first row as headers'],
  ['change types?', 'changed type', 'detect (data )?type'],
  ['filter( the)? rows', 'filtered rows', 'filter'],
  ['remove (the )?other columns', 'removed other columns', 'remove columns'],
  ['rename( the)? columns', 'renamed columns', 'rename'],
];
/** A whole-line command: any form, or `apply [the] <form> [step]`. The hall is Applied Steps, so `apply` works for all seven (fix round 1, I1). */
const command = (forms: readonly string[]): RegExp => new RegExp(`^(?:${forms.join('|')}|apply (?:the )?(?:${forms.join('|')})(?: step)?)$`);
const COMMANDS: readonly RegExp[] = FORMS.map(command);
/** Step j applied in its turn (spec2 §8, verbatim). */
const SUCCESS: readonly string[] = [
  'Source: the server name is wrong. It has been wrong since the migration. It connects anyway.',
  'Navigation: you pick Sales. There are three tables called Sales. You pick the right one, which is not the first one.',
  'Promoted Headers: Column1 becomes Region. Column2 becomes Net Sales. Column3 stays Column3.',
  'Changed Type: everything is text. Then everything is number. Then the dates are wrong. Using Locale.',
  'Filtered Rows: the Total row at the bottom goes away. It was inflating everything by exactly 100%.',
  'Removed Other Columns: the hall grows shorter. So does your refresh.',
  "Renamed Columns: 'Column3' becomes 'Year'. The hall applauds. Refresh complete.",
];
/**
 * The real error, by the last good step (0–5), when a later step is attempted out of order (spec2 §8, made real in
 * fix round 1, M3): the Firewall names its step, a missing column is named in Details, and a rename before Removed
 * Other Columns trips on the name it was about to create.
 */
const ERRORS: readonly string[] = [
  "Formula.Firewall: Query 'Sales' (step 'Source') references other queries or steps, so it may not directly access a data source. Please rebuild this data combination.",
  "Expression.Error: The key didn't match any rows in the table.",
  "Expression.Error: The column 'Region' of the table wasn't found. Details: Region",
  'Expression.Error: We cannot convert the value "Total" to type Number. Details: Value=Total Type=[Type]',
  'Expression.Error: We cannot convert the value "Total" to type Number.',
  "Expression.Error: The column 'Year' of the table wasn't found. Details: Year",
];
const AFTER = 'The query refreshes. 4.2M. It was always 4.2M.';
/** Re-applying Changed Type, mid-chain or after the refresh: Changed Type1, then Changed Type2, and so on (fix round 1, M5). */
const CHANGED_AGAIN = 'pq.changed';
const changedType = (s: GameState): { then: RuleThen; id: string } => {
  const n = (Number(s.flags[CHANGED_AGAIN]) || 0) + 1;
  const text = n === 1 ? 'Changed Type1. Power Query adds a new one. It always will.' : `Changed Type${n}. Power Query adds another. It always will.`;
  return { id: 'pq.repeat.4', then: { text, set: { [CHANGED_AGAIN]: n }, outcome: 'snark' } };
};

/**
 * Apply step j (1–7) to the hall's query. Pure: the rule to run and its id. In turn → the success line and `pq.step`
 * (step 7 also `pq.done` and the +10, paid once on `pq.done`); already applied → the past (Changed Type gets a
 * Changed Type1, then 2, 3… instead, before and after the refresh); out of order → the real error, then the one
 * narrator line; after `pq.done` → the refresh.
 */
export function applyStep(s: GameState, j: 1 | 2 | 3 | 4 | 5 | 6 | 7): { then: RuleThen; id: string } {
  const k = pqStep(s);
  const name = STEPS[j - 1]!;
  if (j === 4 && (pqDone(s) || j <= k)) return changedType(s);
  if (pqDone(s)) return { id: 'pq.after', then: { text: AFTER, outcome: 'snark' } };
  if (j <= k) return { id: `pq.repeat.${j}`, then: { text: `${name} is already applied. Clicking it again shows you the past. Everything after it greys out, waiting.`, outcome: 'snark' } };
  if (j === k + 1) {
    if (j === 7) return { id: 'pq.done', then: { text: SUCCESS[6]!, set: { 'pq.step': 7, 'pq.done': true }, bonus: 10, pointsKey: 'pq.done', sfx: 'bonus', outcome: 'success' } };
    return { id: `pq.step.${j}`, then: { text: SUCCESS[j - 1]!, set: { 'pq.step': j }, outcome: 'success', sfx: 'success' } };
  }
  const back = k === 0 ? 'the start. There is no Source.' : `${STEPS[k - 1]}.`;
  return { id: `pq.error.${j}`, then: { text: `${ERRORS[k]}\nEvery step after it turns yellow. You are back at ${back}`, outcome: 'fail' } };
}

/** Room-scoped to the hall: the door poke first (it never claims a step command), then the seven step commands in order. */
export const APPLIED_STEP_PHRASES: PhraseRule[] = [
  { id: 'hall.door', room: 'fortress.hall', test: DOOR_TEST, text: '', then: (s, _w, line) => ({ id: 'hall.door', then: { text: doorPoke(s, line), outcome: 'fail' } }) },
  ...([1, 2, 3, 4, 5, 6, 7] as const).map((j): PhraseRule => ({ id: `pq.cmd.${j}`, room: 'fortress.hall', test: COMMANDS[j - 1]!, text: '', then: (s) => applyStep(s, j) })),
];
