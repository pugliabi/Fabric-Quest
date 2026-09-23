import type { FlagPatch, PhraseRule, Room, Rule, RuleThen } from './types';
import type { GameState, HeardLine } from '../engine/types';
import { vary } from '../engine/quirks';
import { talkTo } from '../engine/builtins';
import { setting } from '../engine/governance';
import { STEPS, pqDone, pqStep } from './applied-steps';
import { BRICKS_NOUNS, BRICKS_TEXT, xmlaRouteFrom } from './sacristy';
import { CURSE_BLANK_TEXT, CURSE_COLUMN_TEXT, UNDO_COLUMN } from './curses';
import { WORD_DEATH } from './deaths';
import { MALAPROPS } from './voice';

/**
 * The Semantic Model Keep: the old Warehouse Fortress, re-themed as Power BI (spec §12, §17).
 * Desktop at the gate, Power Query in the hall, the Model View west of it (and, north of that, the Monastery's
 * back gate), the Duke of DAX in the chamber, the Report Studio in the old yard. The Moat is still T-SQL: the
 * Keep stands on a Warehouse, and the Duke's one sin, a calculated column, lands you in it (spec1 §4.1); SQL spoken
 * in a semantic model only gets you corrected. Room ids and scored rule ids are unchanged (fortress.sku / .moat /
 * .stare / .copy), so the ledger still sums to 200.
 */

const room = (r: Room): [string, Room] => [r.id, r];

const POLICY = ['policy', 'incremental refresh policy', 'incremental refresh', 'refresh policy', 'incremental'];
const REFRESH = ['refresh', 'big refresh', 'progress bar', 'refresh bar'];
const CARD = ['card', 'card visual', 'blank'];
const GUARD = ['guard', 'guards', 'bridge guard'];
const DUKE = ['duke', 'duke of dax', 'duke of warehouse'];
const CARDINALITY = ['sir cardinality', 'cardinality', 'knight', 'sir'];
const MUG = ['mug', 'coffee mug', 'cup', 'okayest mug'];
const LICENSE = ['license', 'license card', 'pro license', 'pro', 'pro license card'];
const SCROLL = ['scroll', 'spark scroll', 'pyspark scroll'];
const SHORTCUT = ['shortcut', 'signpost', 'sign', 'onelake shortcut', 'pointer'];
const KEY = ['key', 'standard key', 'standard', 'gateway key', 'standard mode key', 'standard gateway key'];
const BRIDGE = ['bridge', 'm2m bridge', 'wobbly bridge', 'm2m'];
/** The XMLA endpoint is Off (spec2 §3.4): the explicit flag, so nothing here fires at default. */
const XMLA_OFF = { flag: 'ts.xmla', is: false };

// ---- The Duke's sin (spec1 §4.1): the modeling shortcut every DAX lord despises. Not SQL; that only gets you corrected. ----
const SIN = ['calculated column', 'calculated columns', 'a calculated column', 'use a calculated column', 'add a calculated column', 'make a calculated column', 'just use a calculated column',
  'i will use a calculated column', "i'll use a calculated column", 'i will just use a calculated column', "i'll just use a calculated column"];
export const MOAT_TEXT = "'A CALCULATED COLUMN?' The Duke rises. 'IN. MY. MODEL?' Two guards seize you by the arms and hurl you from the window into the Moat of T-SQL below — the Warehouse this whole Keep was built on. You surface, sputtering, covered in semicolons and something that might be a CROSS APPLY. You climb out. You will never not smell like this.";
/**
 * Trial 2 (+25, `trial.moat`): the id, key and points are unchanged from the SQL days, so the ledger still sums to 200.
 * The moat also washes the Duke's curse off (curses.ts), and his count with it: a calculated column that finally says
 * the sin is a measure again.
 */
export const MOAT_THEN: RuleThen = { text: MOAT_TEXT, set: { 'trial.moat': true, 'curse.column': false, 'duke.wrong': 0 }, points: 25, pointsKey: 'fortress.moat', moveTo: 'fortress.bridge', sfx: 'death' };
const MOAT_AGAIN: RuleThen = { text: "'Another?' The Duke does not rise this time. 'Once was instructive. Twice is a habit.' He points at the window. You take the stairs.", outcome: 'snark' };

/**
 * The Duke's patience (spec1 §5.4, fix round 1): a WRONG answer is a `say` about DAX or the model that is not the sin
 * and not correct DAX (WRONG_RE: it names a DAX or modelling word, and is not `calculate` alone, a CALCULATE…FILTER,
 * a SUMX(…) or a VAR…RETURN). `say hello` never counts. The second and third wrong answers are counted out loud (STRIKES:
 * WRONG two, the warning at three); the fourth makes you a CALCULATED COLUMN (fortress.curse-column). Only before the moat, which
 * lifts it, so the curse can never soft-lock the win. Leaving the chamber (fortress.leave-duke) and every undo reset the
 * count. `wrong(then)` adds the count and the strike beat to a snark rule without touching its line.
 */
const DAXISH = '(select|join|evaluate|implicit|bidirectional|bi directional|both directions|cross filter|userelationship|use relationship|sumx|sum|divide|filter|measures?|context|all|allexcept|removefilters|calculate|columns?|relationships?|tables?|model|dax)';
/** Correct DAX (fix round 2): any expression starting with CALCULATE, with or without FILTER, a SUMX(…) or a VAR…RETURN. `say calculate` alone is dax-calculate, matched by exact noun first. */
const GOOD_DAX = /(^calculate\b.|calculate.*filter|sumx|var .*return)/;
export const WRONG_RE = new RegExp(`^(?!calculate\\b)(?!.*(var .*return|sumx.|calculated column))(?=.*\\b${DAXISH}\\b)`);
// The first wrong answer is its own line, unchanged (keep-sense pins it); the second and third are counted out loud.
const STRIKES = ['', '', "Two fingers go up. 'WRONG. Two.'", "A third finger. 'One more and you're a column.'"] as const;
const WRONG: FlagPatch = { 'duke.wrong': (v) => Math.min(3, (Number(v) || 0) + 1) };
/** The strike beat for this wrong answer: the count before it, plus one. Nothing while you are already a column. */
/** …and nothing after the moat either (fix round 2): the curse only applies before it, so no threat of one. */
const strike = (s: GameState): string => (s.flags['curse.column'] || s.flags['trial.moat'] ? '' : STRIKES[Math.min(3, (Number(s.flags['duke.wrong']) || 0) + 1)]!);
const wrong = (then: RuleThen): RuleThen => ({
  ...then,
  text: (s, w, cmd) => `${typeof then.text === 'function' ? then.text(s, w, cmd) : then.text} ${strike(s)}`.trim(),
  set: { ...then.set, ...WRONG },
});

/** Studio: the seventh stare at the Card after the contest is won makes you (Blank) (fortress.curse-blank). */
const STARES: FlagPatch = { 'card.stares': (v) => Math.min(6, (Number(v) || 0) + 1) };

/** Model View: ten calculated columns (spec1 §5.4). Nine warnings, each its own line, counted out loud; the tenth opens in Word. */
const COLUMNS = [
  'A circular dependency was detected. You did not touch anything. You breathed near it.',
  'Sure, add a calculated column. Add nine. Your model is a Word document now, and I say that with love.',
  'Three. The model is warm now. Not fast. Warm.',
  'Four. Sir Cardinality has stopped making eye contact.',
  'Five. Somewhere a measure that would have done this in one line weeps.',
  "Six. The refresh window sends a calendar invite for 'discussion'.",
  'Seven. The .pbix is 2.4 GB. It was 2.3. You did that.',
  'Eight. The columns have started calculating each other.',
  'Nine. You can hear Word opening.',
];

/** A poke line, or one that depends on the room's state (Custom1 quotes whichever step it hangs off). */
type PokeLine = string | ((s: GameState) => string);
const pokeLine = (s: GameState, pool: readonly PokeLine[]): string => vary(s, pool.map((l) => (typeof l === 'function' ? l(s) : l)));
/** Scenery that answers `use` and `get` from rotating pools, so repeated pokes are different pokes. */
const poke = (id: string, noun: string[], use: readonly PokeLine[], get: readonly PokeLine[]): Rule[] => [
  ...(use.length ? [{ id: `fortress.use-${id}`, when: { verb: 'use', noun }, then: { text: (s: GameState) => pokeLine(s, use), outcome: 'fail' } } satisfies Rule] : []),
  ...(get.length ? [{ id: `fortress.get-${id}`, when: { verb: 'get', noun }, then: { text: (s: GameState) => pokeLine(s, get), outcome: 'fail' } } satisfies Rule] : []),
];
/** One, two … six, for the room text's count of open doors (no numerals next to "Seven doorways"). */
const COUNT = ['', 'one', 'two', 'three', 'four', 'five', 'six'] as const;

/**
 * The Keep's aside for the hoodie still to get (Task B4): the back gate as an idea, never a route. With XMLA off the
 * gate is bricks and no hint may walk through it (E2), so the aside names the bricks and the lake, and nothing in between.
 */
const keepToMonksAside = (s: GameState): string => (setting(s, 'xmla')
  ? 'The monks are behind this Keep. The Model View has a back gate, and back gates are how engineers get in, and out.'
  : 'The monks are behind this Keep, and the back gate to them is bricks today. The long way round goes past the lake.');

/** The hall's business once its query runs (Task B4), sideways: the Duke, the policy, the refresh, the monks, then out. */
const hallRestAside = (s: GameState): string =>
  !s.flags['trial.moat'] ? 'The Duke is north of here and he throws people out of windows for one sentence. The prophecy needs you to smell like where you would land.' :
  !s.flags['taken.policy'] ? 'West, a lectern holds a piece of paper the Studio is going to ask you for. Ten days at a time, it says. Small steps.' :
  !s.flags['refresh.done'] ? 'East, a progress bar has been at 97% since 2019, and what is in your pocket is the rest of the percent.' :
  !s.flags['trial.hoodie'] ? keepToMonksAside(s) :
  "The Keep's done with you. The moat, south of the gate, would like a second go, and won't get one.";

/** Studio: what the Big Refresh says when you push it without a policy (spec §17). */
export const REFRESH_ERRORS = [
  "Refresh failed: the credentials for 'Sales_export_v7.xlsx' are not valid. They were valid yesterday. Nothing changed. Nothing ever changes.",
  "Refresh failed: The column 'Column1' of the table wasn't found. It was found last week. Jeff renamed it. Jeff denies this.",
  'Refresh failed: The gateway is offline. The gateway is on a laptop. The laptop is closed. The laptop belongs to someone on vacation.',
  'Refresh failed: There is not enough memory to complete this operation. There was, before the 31-slice pie.',
  'Refresh succeeded. Nobody believes it.',
];

// ---- Model View: the relationship settings, as rules (say …) and as bare lines (catchAll) ----
const M2M: RuleThen = { text: 'You set it to Both. The model sighs. Somewhere a measure becomes ambiguous. Sir Cardinality writes your name down.', set: { 'model.m2m': true }, outcome: 'fail' };
const AMBIGUOUS: RuleThen = { text: 'An ambiguous path between tables was detected. Sir Cardinality does not look up. He knew.', outcome: 'fail' };
const SINGLE: RuleThen = { text: 'Single direction, one to many. Sir Cardinality nods once. It is the only time he will nod.', set: { 'model.m2m': false }, outcome: 'success' };
const M2M_WORDS = ['many to many', 'bidirectional', 'both directions', 'both', 'm2m', 'cross filter both', 'set to both'];
const SINGLE_WORDS = ['single direction', 'one to many', 'single', 'set to single'];

/** The Model View hears "many to many" / "one to many" as settings, not as verbs it doesn't know. */
function modelLine(s: GameState, { raw }: HeardLine): { then: RuleThen; id: string } | null {
  const line = raw.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^(say|set( it)?( to)?|make it) /, '');
  if (line === 'both' && s.flags['model.m2m']) return { then: AMBIGUOUS, id: 'fortress.ambiguous' };
  if (M2M_WORDS.includes(line)) return { then: M2M, id: 'fortress.m2m' };
  if (SINGLE_WORDS.includes(line)) return { then: SINGLE, id: 'fortress.single' };
  return null;
}

export const FORTRESS_ROOMS: Record<string, Room> = Object.fromEntries([
  room({
    id: 'fortress.bridge', name: 'Power BI Desktop Gate', region: 'fortress',
    enterQuip: () => 'Power BI Desktop. It is updating. It will be updating when you leave.',
    describe: (s) =>
      s.flags['bridge.down']
        ? 'The gate of the Semantic Model Keep. The splash screen has finished; the drawbridge is down and Power Query Hall yawns north. Below, the Moat of T-SQL — the Warehouse the Keep was built on — glitters with semicolons. The foothills are south.'
        : 'The gate of the Semantic Model Keep. The drawbridge is a splash screen: "Power BI Desktop is updating (1 of 3)". A guard leans over the battlements. Below, the Moat of T-SQL — the Warehouse the Keep was built on — glitters with semicolons. The foothills are south.',
    exits: { s: 'peaks.foothills', n: (s) => (s.flags['bridge.down'] ? 'fortress.hall' : null) },
    items: ['drawbridge', 'moat', 'splash', 'battlements', 'update-dialog'],
    npcs: ['guard'],
    scene: (s) => (s.flags['bridge.down'] ? 'fortress.bridge-down' : 'fortress.bridge'),
    flaskHint: (s) =>
      !s.flags['bridge.down'] ? 'The guard wants a SKU. You cannot afford a real one. There is a free one, for sixty days. Say it.' :
      !s.flags['trial.moat'] ? `North, then north again. The Duke hates one shortcut above all others.${s.flags['taken.policy'] ? '' : ' West of the hall, a policy waits.'}` :
      !s.flags['taken.policy'] ? 'North, then west. In the Model View, a policy waits on a lectern.' :
      !s.flags['refresh.done'] ? 'North, then east. The Report Studio has a Big Refresh that wants your policy.' :
      !s.flags['trial.hoodie'] ? (setting(s, 'xmla') ? "North, west, then north again: the Model View's back gate opens onto the Monastery." : xmlaRouteFrom('fortress.bridge')) :
      'The Keep is done with you, and you with it. South, to the Foothills.',
    // The aside (Task B4), the tier ladder the plan spells out for this gate: sideways at 4, a rhyme at 8, the flask hint at 12.
    nudge: {
      oblique: (s) =>
        !s.flags['bridge.down'] ? "The guard's been asked for one thing all day and it wasn't your name." :
        !s.flags['trial.moat'] ? 'The Duke throws people in the moat for exactly one sentence, and the prophecy needs you to smell like the moat. You can see where this is going.' :
        !s.flags['taken.policy'] ? "Somewhere inside there's a lectern with a piece of paper on it, and the paper is the difference between a refresh and a career." :
        !s.flags['refresh.done'] ? "The Studio inside has a progress bar stuck at 97% since 2019, and you're carrying the thing that unsticks it." :
        !s.flags['trial.hoodie'] ? keepToMonksAside(s) :
        "The Keep is finished with you. So is the moat, though it'd take you back.",
      plainer: (s) => (!s.flags['bridge.down'] ? "He wants a SKU. There's a free one. It rhymes with denial." : ''),
    },
    rules: [
      { id: 'fortress.guard-moat', when: { verb: 'talk', noun: GUARD, noun2: ['moat', 'the moat', 'warehouse', 'water'] }, then: { text: "'The moat?' The guard looks down. 'That's the Warehouse. We built the Keep on it. Don't tell the Duke I said Warehouse.' He tells the Duke himself, later, in the log.", outcome: 'success' } },
      {
        id: 'fortress.sku',
        when: { verb: 'say', noun: ['trial', 'trial capacity', 'f trial', 'fabric trial', 'free trial', 'ftrial', 'trial sku'], flags: [{ flag: 'bridge.down', not: true }] },
        then: { text: "'Trial capacity, eh,' says the guard. 'Sixty days. Come in. Quickly.' The splash screen finishes updating (3 of 3). The drawbridge crashes down.", set: { 'bridge.down': true }, points: 10, sfx: 'door' },
      },
      {
        id: 'fortress.sku-f64',
        when: { verb: 'say', noun: ['f64', 'f128', 'f256', 'f512', 'f1024', 'f2048', 'p3', 'p4', 'p5'] },
        then: { text: "'Nice try, peasant,' says the guard. 'Show me the invoice.'", outcome: 'snark' },
      },
      {
        id: 'fortress.sku-pro',
        when: { verb: 'say', noun: ['pro', 'ppu', 'premium', 'premium per user', 'p1', 'p2', 'power bi pro', 'free'] },
        then: { text: "The guard: 'Pro gets you a report. It does not get you a Keep.'", outcome: 'snark' },
      },
      {
        id: 'fortress.sku-f2',
        when: { verb: 'say', noun: ['f2', 'f4', 'f8', 'f16', 'f32'] },
        then: { text: `'Pause it or lose it,' mutters the guard. The bridge stays up. Not enough ${MALAPROPS.capacitude}.`, outcome: 'snark' },
      },
      {
        id: 'fortress.sign-in',
        when: { verb: 'say', noun: ['sign in', 'log in', 'login', 'signin'] },
        then: { text: 'You are already signed in. Twice. On two tenants. One of them is wrong.', outcome: 'snark' },
      },
      {
        id: 'fortress.north-closed',
        when: { verb: 'go', dir: 'n', flags: [{ flag: 'bridge.down', not: true }] },
        then: { text: 'The drawbridge is up. It is updating (1 of 3). The moat below is deep and full of GROUP BY. The guard is right there. He wants a SKU.', outcome: 'fail' },
      },
      // Bridge up, every obvious verb on the drawbridge / gate / splash screen / guard is the Desktop Gate (gates.ts);
      // the old open-bridge line rotates in its pool. Down, it is just down.
      {
        id: 'fortress.open-bridge-down',
        when: { verb: 'open', noun: ['drawbridge', 'bridge', 'gate', 'keep gate'], flags: [{ flag: 'bridge.down' }] },
        then: { text: "Yeah, totally! Except it's already down, you moron. Try: north.", outcome: 'fail' },
      },
      {
        id: 'fortress.update',
        when: { verb: 'use', noun: ['update', 'updates', 'update dialog', 'dialog', 'installer', 'install', 'new version', 'splash', 'splash screen'] },
        then: { text: 'The update installs. Then another. The drawbridge does not move. This is the update.', outcome: 'fail' },
      },
      {
        id: 'fortress.swim-moat',
        when: { verb: 'drink', noun: ['moat', 'water', 'moat of t sql'] },
        then: { text: 'You sip from the Moat of T-SQL. It tastes of NOLOCK. You stop.', outcome: 'snark' },
      },
      {
        id: 'fortress.give-license-guard',
        when: { verb: 'give', noun: LICENSE, noun2: GUARD, has: ['license'] },
        then: { text: "He reads it. 'Pro.' He hands it back like a wet napkin.", outcome: 'fail' },
      },
      {
        id: 'fortress.give-mug-guard',
        when: { verb: 'give', noun: MUG, noun2: GUARD, has: ['mug'] },
        then: { text: "He has a mug. It says WORLD'S OKAYEST GUARD.", outcome: 'fail' },
      },
      ...poke('drawbridge', ['drawbridge', 'bridge', 'gate', 'keep gate'], [
        'You push the drawbridge. It is a splash screen. Splash screens are not pushed; they are waited out, or bribed with a SKU.',
        'You tap the drawbridge twice. It shows a tooltip: "Updating". You knew that.',
        'You try to lower it by hand. It is heavier than the whole .pbix, and the .pbix is 2.3 GB.',
      ], [
        'The drawbridge weighs more than your report, and your report weighs 2.3 GB.',
        'You grab the chains. The guard grabs his halberd. You let go of the chains.',
      ]),
      ...poke('moat', ['moat', 'moat of t sql', 'water', 'semicolons', 't sql'], [
        'You dip a toe in the Moat of T-SQL. It autocompletes to SELECT TOE.',
        'You stir the moat with a stick. A stored procedure surfaces, looks at you, and sinks.',
        'You skim a stone. It returns 1 row affected.',
      ], [
        'You cannot get the moat. Historically, it is the moat that gets you.',
        'You scoop a handful of moat. It is a CTE. It evaporates at the end of the statement.',
      ]),
      ...poke('battlements', ['battlements', 'walls', 'wall', 'ramparts', 'parapet'], [
        'You knock on the battlements. The guard knocks back: "SKU?"',
        'You lean on the battlements, like the guard does. It does not make you a guard. It makes you tired.',
      ], [
        'You cannot take the battlements. They are the only thing holding the guard up.',
        'You pull at a merlon. It is part of a column chart. December comes off in your hand; you put it back.',
      ]),
      ...poke('update-dialog', ['dialog', 'update dialog'], [
        'You click Remind me in 1 day. It is greyed out. It has always been greyed out.',
      ], [
        'You drag the dialog off the screen. It comes back, centred.',
        'You close the dialog. A second dialog asks if you are sure. A third one is installing.',
      ]),
      ...poke('splash', ['loading screen', 'loading', 'logo'], [
        'You click the splash screen. It is not a button. Nothing on a splash screen is a button.',
        'You wait politely at the splash screen. It notices. It goes slower.',
      ], [
        'It is a splash screen. It goes away when it wants to.',
        'You peel at a corner of the splash screen. Underneath: another splash screen.',
      ]),
    ],
  }),
  room({
    id: 'fortress.hall', name: 'Power Query Hall', region: 'fortress',
    // Seven Applied Steps, in order (spec1 §4.2). The doorways answer by their place in the chain (applied-steps.ts);
    // `look at steps` lists them with state; applying them in order, for +10, is spec2 §8 (applyStep, same file).
    enterQuip: () => "Seven steps. In order. That's the whole idea of a query.",
    describe: (s) => {
      const k = pqStep(s);
      // One vocabulary (applied-steps.ts STEP_STATE): open = applied, waiting = next, yellow = the rest.
      const doors = pqDone(s) ? 'All seven are open. The hall is a query again.'
        : k === 0 ? 'The first is waiting. The rest are yellow — you go through them in order, or the hall errors.'
        : k === 6 ? 'Six are open; the last is waiting. Nothing is yellow, and the hall does not know what to do with itself.'
        : `The first ${k === 1 ? 'is' : `${COUNT[k]} are`} open; the next is waiting. The rest are yellow — you go through them in order, or the hall errors.`;
      return `Power Query Hall. Seven doorways in a row, each an Applied Step: Source, Navigation, Promoted Headers, Changed Type, Filtered Rows, Removed Other Columns, Renamed Columns. ${doors} Portraits line the walls. The Duke's chamber is north; the Report Studio, east; the Model View, west; the gate, south.`;
    },
    exits: { s: 'fortress.bridge', n: 'fortress.throne', e: 'fortress.yard', w: 'fortress.model' },
    // Most specific first: resolveNoun takes the first suffix match ('custom step' is Custom1, not the steps).
    items: ['query', 'custom1', 'editor-door', 'steps', 'doorways', 'portraits'],
    npcs: [],
    scene: () => 'fortress.hall',
    // While the query is broken (spec2 §8) the hint leads with the step it broke at, then the Keep's own business.
    flaskHint: (s) => {
      const rest =
        !s.flags['trial.moat'] ? 'North. Insult the Duke properly and he will do the rest. He hates one shortcut above all others.' :
        !s.flags['taken.policy'] ? 'West, in the Model View, a policy waits on a lectern. The Studio east will want it.' :
        !s.flags['refresh.done'] ? 'East. The Report Studio has a Card that needs out-staring and a refresh that needs your policy.' :
        !s.flags['trial.hoodie'] ? (setting(s, 'xmla') ? 'West, then north: the Model View has a back gate onto the Monastery.' : xmlaRouteFrom('fortress.hall')) :
        'The Keep is done with you. South, through the gate. Mind the moat; it remembers you.';
      const k = pqStep(s);
      return pqDone(s) ? rest : `${rest} (Optional, for the bonus: the query is broken at step ${k + 1}: ${STEPS[k]}. \`look at steps\`.)`;
    },
    // The aside (Task B4): the order is the idea. The plainer tier names the waiting step; the flask hint, at 12, names the command.
    nudge: {
      oblique: (s) => (pqDone(s) ? hallRestAside(s)
        : "Seven doorways, one of them waiting, and the hall won't let you skip it. Queries are like that. You do them in order or you do them again."),
      plainer: (s) => (pqDone(s) ? '' : `The waiting doorway is step ${pqStep(s) + 1}, ${STEPS[pqStep(s)]}. Steps aren't walked through. They're applied.`),
    },
    rules: [
      {
        id: 'fortress.open-editor',
        when: { verb: 'open', noun: ['advanced editor', 'editor', 'advanced editor door', 'm', 'door'] },
        then: { text: 'The Advanced Editor opens. It is a wall of `let`. You close it gently.', outcome: 'fail' },
      },
      // `remove other columns` / `remove columns` are step 6 of the query now (applied-steps.ts), not a line of their own;
      // a bare `use columns` is a poke at the steps (the item already answers to 'columns').
      ...poke('steps', ['steps', 'applied steps', 'step', 'columns', 'column', 'other columns'], [
        'You click a step. The preview jumps back in time. Every step after it greys out, waiting. That is the whole hall.',
        'You drag a step up the list. Everything below it errors. You drag it back.',
        'You rename a step to something meaningful. The hall is shocked. Nobody has done that before.',
      ], [
        'You try to lift a step. Every step after it turns yellow. You put it back.',
        'Steps are not taken. They are applied.',
      ]),
      // A named doorway ("open filtered rows") is the per-step poke in applied-steps.ts; these are the doorways as a set.
      ...poke('doorways', ['doorways', 'doorway', 'doors', 'arches'], [
        'You walk through the open doorways, in order. The waiting one stops you like a turnstile that wants exact change.',
        'You step into a yellow doorway. Expression.Error. You step back out. Expression.Fine.',
      ], [
        'You cannot take a doorway. Power Query applied it; only Power Query removes it, and only by accident.',
        'You pull a doorway off its hinges. Power Query adds a new one: Changed Type1.',
      ]),
      // Not `source` / `navigation`: those are step names now (the `steps` item answers them).
      ...poke('portraits', ['portraits', 'portrait', 'paintings', 'painting'], [
        'You straighten the portrait of Source. The server name on it is wrong. It has been wrong since the migration.',
        'You tap the portrait of Navigation. It points harder at the table out of frame.',
      ], [
        'The portraits are the query. Take one down and the whole hall errors.',
        'You lift the portrait of Source. The hall says: Expression.Error. You hang it back.',
      ]),
      ...poke('custom1', ['custom1', 'custom 1', 'custom'], [
        // Once the query refreshes it hangs off Renamed Columns, as `look at custom1` says (keep-items.ts).
        (s) => `You open Custom1. It says: = Table.AddColumn(#"${pqDone(s) ? 'Renamed Columns' : 'Changed Type'}", "Custom", each 1). Why. Why 1.`,
        'You hover over the X next to Custom1. The hall goes quiet. You move your hand away.',
      ], [
        'You reach for it. Every step after it goes yellow. You do not touch Custom1.',
        'Nobody takes Custom1. Custom1 takes you.',
      ]),
      ...poke('editor-door', ['advanced editor', 'editor', 'advanced editor door', 'm', 'let'], [
        'You open the Advanced Editor. It is a wall of `let`. You close it gently.',
        'You peek into the Advanced Editor. Someone has formatted it with tabs AND spaces. You close it before it notices you.',
      ], [
        'The door is load-bearing. So is everything behind it.',
      ]),
    ],
  }),
  room({
    id: 'fortress.model', name: 'The Model View', region: 'fortress',
    enterQuip: () => 'Tables float on plinths, joined by lines. One line wobbles. Everyone pretends not to see it.',
    describe: (s) =>
      `The Model View. Tables float on plinths, joined by relationship lines. One many-to-many bridge wobbles. A date table sits unmarked. Sir Cardinality guards the diagram${s.flags['taken.policy'] ? '' : '. On a lectern: an incremental refresh policy'}. The hall is east; a back gate, north, ${setting(s, 'xmla') ? 'opens onto the Monastery' : 'has been bricked up. It says XMLA on the bricks'}.`,
    // The back gate is the XMLA endpoint (spec2 §3.4): Read Write by default; Off, and it is a wall.
    exits: { e: 'fortress.hall', n: (s) => (setting(s, 'xmla') ? 'monastery.gate' : null) },
    // Most specific first: 'date table' and 'bridge table' must not fall to the plinths' 'table'.
    items: ['policy', 'm2m-bridge', 'date-table', 'plinths', 'lines', 'lectern', 'diagram'],
    npcs: ['cardinality'],
    scene: () => 'fortress.model',
    // XMLA off (spec2 §3.4): before the hoodie the hint opens with the closed gate and the two ways round it, and never
    // then says "north"; after the hoodie the monks are done with you, so it does not send you to them at all (round 2, N2).
    flaskHint: (s) => {
      const xmla = setting(s, 'xmla');
      if (s.flags['trial.hoodie'] && s.flags['taken.policy'] && s.flags['refresh.done']) {
        return xmla ? 'The monks are done with you and so is the Keep. East to the hall, then south, out the gate.'
          : 'The back gate is closed (XMLA endpoint: Off), and the monks are done with you, so let it be. East to the hall, then south, out the gate.';
      }
      const stage = !s.flags['taken.policy'] ? 'Take the policy. Small steps beat big refreshes.' :
        !s.flags['refresh.done'] ? 'The policy is for the Big Refresh in the Studio: east, then east.' :
        xmla ? 'North, through the back gate, the monks are waiting.' : 'The monks are waiting on the other side of the bricks.';
      return `${xmla ? '' : 'The back gate is closed (XMLA endpoint: Off). The Sacristy, up from the Cloister, has the switch; reach the Monastery the long way, east of the Gold Marsh. '}${stage}`;
    },
    // The aside (Task B4): Sir Cardinality guards the diagram, not the paper; the back gate is an idea, never a route (E2).
    nudge: {
      oblique: (s) =>
        s.flags['trial.hoodie'] && s.flags['taken.policy'] && s.flags['refresh.done'] ? "The monks are done with you and so's the Keep. The hall's east, the gate's south of that, and the moat waves." :
        !s.flags['taken.policy'] ? "There's a lectern here with a piece of paper on it, and Sir Cardinality is guarding the diagram, not the paper." :
        !s.flags['refresh.done'] ? "That paper isn't for this model. This model is fine. The thing that has been at 97% since 2019 is two rooms east." :
        keepToMonksAside(s),
      plainer: (s) =>
        !s.flags['taken.policy'] ? "The paper on the lectern is a refresh policy. Ten days at a time. Nobody's reading it, so it's yours." :
        !s.flags['refresh.done'] ? 'The policy in your pocket is for the Big Refresh. The Big Refresh is in the Studio. The Studio is east of the hall, and the hall is east of here.' :
        '',
    },
    catchAll: modelLine,
    rules: [
      // First, so the closed gate answers `n` itself instead of the builtin's "You can't go that way."
      {
        id: 'fortress.north-xmla',
        when: { verb: 'go', dir: 'n', flags: [XMLA_OFF] },
        then: { text: 'The back gate is an XMLA endpoint. Your capacity admin set it to Off. Your capacity admin is you.', outcome: 'fail' },
      },
      // The bricks the describe mentions (review E2 M4), only on the explicit `false` flag: at default the Model View has no gate to look at.
      { id: 'fortress.look-bricks', when: { verb: 'look', noun: BRICKS_NOUNS, flags: [XMLA_OFF] }, then: { text: BRICKS_TEXT.model, outcome: 'success' } },
      { id: 'fortress.read-bricks', when: { verb: 'read', noun: BRICKS_NOUNS, flags: [XMLA_OFF] }, then: { text: BRICKS_TEXT.model, outcome: 'success' } },
      { id: 'fortress.get-bricks', when: { verb: 'get', noun: BRICKS_NOUNS, flags: [XMLA_OFF] }, then: { text: BRICKS_TEXT.take, outcome: 'fail' } },
      { id: 'fortress.use-bricks', when: { verb: 'use', noun: BRICKS_NOUNS, flags: [XMLA_OFF] }, then: { text: BRICKS_TEXT.push, outcome: 'fail' } },
      { id: 'fortress.open-bricks', when: { verb: 'open', noun: BRICKS_NOUNS, flags: [XMLA_OFF] }, then: { text: BRICKS_TEXT.push, outcome: 'fail' } },
      {
        id: 'fortress.get-policy',
        when: { verb: 'get', noun: POLICY, flags: [{ flag: 'taken.policy', not: true }] },
        then: { text: "An incremental refresh policy: 'Refresh rows from the last 10 days.' Small steps. Bursting steps, one might say.", give: ['policy'], sfx: 'item' },
      },
      // The policy on yourself while a column (curses.ts): the global undo, copied ahead of the room's own `use policy` line.
      { ...UNDO_COLUMN, id: 'fortress.undo-column-model' },
      {
        id: 'fortress.use-policy-model',
        when: { verb: 'use', noun: POLICY, has: ['policy'] },
        then: { text: 'Not here. The model is fine with its refresh; it is the Big Refresh in the Report Studio that has been at 97% since 2019.', outcome: 'fail' },
      },
      {
        id: 'fortress.look-bridge-again',
        when: { verb: 'look', noun: BRIDGE, flags: [{ flag: 'bridge.looked' }] },
        then: { text: 'The wobble is a many-to-many. Your totals will be right, until someone filters by Territory.', outcome: 'success' },
      },
      {
        id: 'fortress.look-bridge',
        when: { verb: 'look', noun: BRIDGE },
        then: { text: 'A many-to-many bridge. It wobbles. Do not stand on it. Do not build a report on it.', set: { 'bridge.looked': true }, outcome: 'success' },
      },
      {
        id: 'fortress.relationship',
        when: { verb: 'use', noun: ['relationship', 'relationships', 'new relationship', 'a relationship'] },
        then: { text: 'Between which tables? Sir Cardinality raises an eyebrow. Both eyebrows. He has many-to-many eyebrows.', outcome: 'fail' },
      },
      { id: 'fortress.ambiguous-say', when: { verb: 'say', noun: ['both'], flags: [{ flag: 'model.m2m' }] }, then: AMBIGUOUS },
      { id: 'fortress.m2m-say', when: { verb: 'say', noun: M2M_WORDS }, then: M2M },
      { id: 'fortress.single-say', when: { verb: 'say', noun: SINGLE_WORDS }, then: SINGLE },
      // A derailment (self-contradiction): he gives the advice, takes it back, and has still given it.
      { id: 'fortress.cardinality-date', when: { verb: 'talk', noun: CARDINALITY, noun2: ['date table', 'date', 'calendar', 'dates'] }, then: { text: "'Mark it as a date table,' says Sir Cardinality. Then, quickly, 'I did not say that. A knight does not do your homework.' He has done your homework.", outcome: 'success' } },
      { id: 'fortress.cardinality-m2m', when: { verb: 'talk', noun: CARDINALITY, noun2: ['many to many', 'many many', 'm2m', 'bidirectional'] }, then: { text: "'Many to many,' says Sir Cardinality. 'Is a relationship. Like yours with the truth.'", outcome: 'success' } },
      {
        id: 'fortress.date-table-again',
        when: { verb: 'use', noun: ['date table', 'as date table', 'calendar', 'date', 'dates', 'calendar table'], flags: [{ flag: 'model.date' }] },
        then: { text: 'It is already marked. You mark it again. Time intelligence sighs: "I heard you the first time."', outcome: 'fail' },
      },
      {
        id: 'fortress.date-table',
        when: { verb: 'use', noun: ['date table', 'as date table', 'calendar', 'date', 'dates', 'calendar table'] },
        then: { text: `You mark the date table as a date table. Time intelligence, which had been sulking, starts working. No points. It should have been done already. Time intelligence feels ${MALAPROPS.refreshered}.`, set: { 'model.date': true } },
      },
      // Talking to Sir Cardinality reaches the builtin: his three pieces of advice are talk 1, 2 and 3 there (npcs.ts).
      {
        id: 'fortress.give-shortcut-cardinality',
        when: { verb: 'give', noun: SHORTCUT, noun2: CARDINALITY, has: ['shortcut'] },
        then: { text: "He turns it over. 'A shortcut. To a table. In another house.' He hands it back and says a prayer.", outcome: 'fail' },
      },
      {
        id: 'fortress.give-key-cardinality',
        when: { verb: 'give', noun: KEY, noun2: CARDINALITY, has: ['standard key'] },
        then: { text: "He inspects the STANDARD key. 'Shared,' he says, approvingly. 'Not personal.' He gives it back; he is a knight, not a gateway.", outcome: 'fail' },
      },
      {
        id: 'fortress.attack-cardinality',
        when: { verb: 'attack', noun: CARDINALITY },
        then: { text: 'You swing at Sir Cardinality. He parries: one to many. You are the many.', outcome: 'fail' },
      },
      ...poke('m2m-bridge', BRIDGE, [
        'You step onto the bridge. It filters both ways at once. You step off, ambiguously.',
        'You steady the bridge. It wobbles the other way. Both directions, as configured.',
      ], [
        'You lift one end. The other end filters both ways. You put it down.',
      ]),
      ...poke('plinths', ['plinths', 'plinth', 'tables', 'fact tables', 'dimension', 'dimensions'], [
        'You push a plinth into a neater star. Somebody, somewhere, presses Auto-layout.',
        'You lean on the Sheet1 plinth. It is the only table without a relationship. It is grateful for the company.',
      ], [
        'Each plinth holds a table. Each table holds a grudge. They stay.',
        'You try to lift the Sales table. It is 400 million rows. It is not coming.',
      ]),
      ...poke('lines', ['lines', 'line', 'relationship lines', 'arrows'], [
        'You double-click a relationship line. A dialog opens with two dropdowns and four ways to be wrong. You cancel.',
        'You click the dashed line. It is inactive. You could USERELATIONSHIP it, but you would have to mean it.',
      ], [
        'You pick up a relationship. The model forgets which Product you meant. You put it back.',
      ]),
      ...poke('date-table', ['date table', 'calendar table'], [], [
        'The date table is the most important table in the model. It is also the one nobody bothered to mark.',
        'You try to take the date table. It is 73,000 rows of days. You leave them where they are.',
      ]),
      ...poke('lectern', ['lectern', 'podium', 'stand'], [
        'You stand at the lectern and clear your throat. Sir Cardinality waits for a relationship. You have none.',
      ], [
        'The lectern is bolted to the diagram. Everything here is, at 100% zoom.',
      ]),
      ...poke('diagram', ['diagram', 'model view', 'layout'], [
        'You press Auto-layout. The tables scatter like pigeons. They come back in a different shape. It is worse.',
        'You zoom out. The model gets smaller. So does your understanding of it.',
      ], [
        'You cannot take the diagram. You can only rearrange it, and it will rearrange itself back.',
      ]),
    ],
  }),
  room({
    id: 'fortress.throne', name: "Duke's Chamber", region: 'fortress',
    enterQuip: () => 'The Duke speaks only in CALCULATE. Every sentence has a filter context. Mind yours.',
    describe: (s) =>
      s.flags['trial.moat']
        ? "The Duke's chamber. The Duke of DAX pretends not to see you. You still smell like the moat. The window is shut, for now. The hall is south."
        : "The Duke's chamber. The Duke of DAX sits on a throne carved as a giant formula bar: CALCULATE( . He speaks only in filter context. A window looks down on the moat. The hall is south.",
    exits: { s: 'fortress.hall' },
    items: ['throne', 'dax-window', 'keep-window', 'filter-pane'],
    npcs: ['duke'],
    scene: () => 'fortress.throne',
    // Cursed (curses.ts): the way out first, and the sin is still one of them, so the moat can never be missed.
    flaskHint: (s) => (s.flags['trial.moat'] ? 'You have the smell. Nothing more for you here, unless you like spinners.'
      : s.flags['curse.column'] ? 'You are a calculated column. Columns are computed at refresh, and the Model View has a refresh policy on a lectern: apply it to yourself, ten days at a time. Or say the thing he despises and let the moat wash it off.'
      : 'Say the thing every DAX lord despises. It has two words and it goes in a table.'),
    // The aside (Task B4). No nick() in here: one of the nicknames IS the sin, and the first two tiers never say it.
    nudge: {
      oblique: (s) => (s.flags['trial.moat']
        ? 'You have the smell. The Duke has nothing else for you but spinners, and the spinners never finish.'
        : "The Duke has exactly one thing he will not hear in this room, and it's the first thing you'd do to his model if he weren't looking."),
      plainer: (s) => (s.flags['trial.moat'] ? '' : "He hates one shortcut above all others. It's a column. It isn't a real one."),
    },
    rules: [
      // The moat first: the sin scores, the repeat is a habit, and SQL only gets you corrected.
      { id: 'fortress.moat', when: { verb: 'say', noun: SIN, flags: [{ flag: 'trial.moat', not: true }] }, then: MOAT_THEN },
      { id: 'fortress.moat-again', when: { verb: 'say', noun: SIN, flags: [{ flag: 'trial.moat' }] }, then: MOAT_AGAIN },
      { id: 'fortress.duke-sql', when: { verb: 'talk', noun: DUKE, noun2: ['sql', 't sql', 'tsql', 'the moat', 'moat', 'warehouse'] }, then: { text: "'SQL,' says the Duke, and then, to himself, 'EVALUATE.' Then, quieter, 'SELECT.' He has caught himself. He will not forgive himself.", outcome: 'success' } },
      // Three wrong answers, then a fourth (curses.ts): only a wrong answer (WRONG_RE), never `say hello` or correct DAX.
      // Before the moat only; the moat lifts it. Pre-flight R-7: fortress.say-dax-word (F6), when it comes, goes after this.
      {
        id: 'fortress.curse-column',
        when: { verb: 'say', nounMatches: WRONG_RE, flags: [{ flag: 'duke.wrong', is: 3 }, { flag: 'trial.moat', not: true }, { flag: 'curse.column', not: true }] },
        then: { text: CURSE_COLUMN_TEXT, set: { 'curse.column': true, 'duke.wrong': 0 }, outcome: 'snark', sfx: 'curse' },
      },
      // R-7: right after the curse, so a fourth wrong `say dax` still makes you a column. A wrong answer like the rest (wrong()).
      { id: 'fortress.say-dax-word', when: { verb: 'say', noun: ['dax'] }, then: wrong({ text: `You say 'DAX' to the Duke of DAX. He says nothing. You have been ${MALAPROPS.daxxed}; it feels like a filter you cannot see.`, outcome: 'snark' }) },
      // The count does not survive the door (fix round 1): south with strikes on the board forgets them.
      {
        id: 'fortress.leave-duke',
        when: { verb: 'go', dir: 's', flags: [{ flag: 'duke.wrong' }] },
        then: { text: 'You back out of the chamber. The Duke loses count of you; nothing here survives leaving the filter context.', set: { 'duke.wrong': 0 }, moveTo: 'fortress.hall', outcome: 'move' },
      },
      {
        id: 'fortress.select-star',
        when: { verb: 'say', noun: ['select *', 'select star', 'select * from', 'select *;', 'select * from table', 'select all', 'select * from everything'] },
        then: wrong({ text: "The Duke blinks. 'SELECT? This is a semantic model. We EVALUATE here.' He does not throw you. He corrects you, which is worse.", outcome: 'snark' }),
      },
      { id: 'fortress.dax-evaluate', when: { verb: 'say', noun: ['evaluate', 'evaluate table', 'evaluate sales'] }, then: { text: "'Correct,' says the Duke, disappointed. 'And useless.'", outcome: 'snark' } },
      { id: 'fortress.dax-implicit', when: { verb: 'say', noun: ['implicit measure', 'implicit measures', 'implicit'] }, then: wrong({ text: "The Duke shudders. 'Implicit.' But he has heard worse today.", outcome: 'snark' }) },
      // 'bi directional': the parser strips the hyphen before the noun is matched.
      { id: 'fortress.dax-bidirectional', when: { verb: 'say', noun: ['bidirectional', 'bi-directional', 'bi directional', 'both directions', 'bidirectional filtering', 'cross filter both'] }, then: wrong({ text: "'Both directions,' says the Duke, 'is how ambiguity gets a seat at the table.' He does not throw you. He wants you to hear that again on the way out.", outcome: 'snark' }) },
      { id: 'fortress.dax-userelationship', when: { verb: 'say', noun: ['userelationship', 'use relationship'] }, then: wrong({ text: "'USERELATIONSHIP,' says the Duke. 'The inactive one. You are the inactive one.'", outcome: 'snark' }) },
      {
        id: 'fortress.select1',
        when: { verb: 'say', noun: ['select 1', 'select 1;'] },
        then: wrong({ text: "'Adequate,' says the Duke, and returns to his throne.", outcome: 'snark' }),
      },
      {
        id: 'fortress.select-cols',
        when: { verb: 'say', nounMatches: /^select .+ from/ },
        then: wrong({ text: "'A column list. How… proper.' The Duke seems disappointed. 'Nobody gets thrown in the moat for a column list.'", outcome: 'snark' }),
      },
      {
        id: 'fortress.say-join',
        when: { verb: 'say', nounMatches: /join/ },
        then: wrong({ text: "'JOINs,' says the Duke, 'are for the moat.'", outcome: 'snark' }),
      },
      {
        id: 'fortress.dax-calculate',
        when: { verb: 'say', noun: ['calculate'] },
        then: { text: "'CALCULATE,' says the Duke. 'The one true function.' He nods; the guards relax. 'With no filter, though. A context transition, and nothing else. You may sit.' You may not sit.", outcome: 'snark' },
      },
      {
        id: 'fortress.dax-sumx',
        when: { verb: 'say', noun: ['sumx', 'sum'] },
        then: wrong({ text: "'SUMX,' the Duke corrects, 'iterates. SUM aggregates. You, peasant, do neither.'", outcome: 'snark' }),
      },
      {
        id: 'fortress.dax-divide',
        when: { verb: 'say', noun: ['divide'] },
        then: wrong({ text: "'DIVIDE,' says the Duke, 'handles zero. Unlike you.'", outcome: 'snark' }),
      },
      {
        id: 'fortress.dax-filter',
        when: { verb: 'say', noun: ['filter'] },
        then: wrong({ text: "'FILTER returns a table,' says the Duke. 'You return nothing.'", outcome: 'snark' }),
      },
      {
        id: 'fortress.dax-measure',
        when: { verb: 'say', noun: ['measure', 'a measure', 'measures'] },
        then: wrong({ text: 'The Duke waits for the rest of the measure. It does not come. He closes the DAX query view on your fingers.', outcome: 'snark' }),
      },
      {
        id: 'fortress.dax-context',
        when: { verb: 'say', noun: ['evaluation context', 'filter context', 'row context', 'context', 'context transition'] },
        then: wrong({ text: "The Duke's eyes narrow. 'Which one?' You do not know. Nobody does, the first six times.", outcome: 'snark' }),
      },
      {
        id: 'fortress.dax-all',
        when: { verb: 'say', noun: ['all', 'allexcept', 'removefilters'] },
        then: wrong({ text: "'ALL removes filters,' says the Duke, 'including the ones keeping you alive.'", outcome: 'snark' }),
      },
      // The right DAX, but it takes a while: a three-wait spinner, then the classic error (spec §17).
      {
        id: 'fortress.dax-busy',
        when: { verb: 'say', nounMatches: GOOD_DAX, flags: [{ flag: 'dax.spinner' }] },
        then: { text: 'The Duke raises one finger. The spinner from your last measure is still spinning. One visual at a time.', outcome: 'fail' },
      },
      {
        id: 'fortress.dax-good',
        when: { verb: 'say', nounMatches: GOOD_DAX },
        // With strikes on the board, correct DAX is grudging and does not count (fix round 1).
        then: {
          text: (s) => (Number(s.flags['duke.wrong']) > 0
            ? "'Correct,' says the Duke. 'And beside the point.' A spinner appears. The spinner is still there. You could wait."
            : "The Duke nods. 'Correct.' A spinner appears. The spinner is still there. You could wait."),
          set: { 'dax.spinner': 1 },
        },
      },
      // Any other word about DAX or the model (WRONG_RE) is a wrong answer too, and counts; anything else is not his business.
      {
        id: 'fortress.dax-wrong',
        when: { verb: 'say', nounMatches: WRONG_RE },
        then: wrong({ text: "'That is not DAX,' says the Duke. 'That is a word that has met DAX.'", outcome: 'snark' }),
      },
      {
        id: 'fortress.dax-wait-1',
        when: { verb: 'wait', flags: [{ flag: 'dax.spinner', is: 1 }] },
        then: { text: 'Still spinning. The Duke hums a measure.', set: { 'dax.spinner': 2 } },
      },
      {
        id: 'fortress.dax-wait-2',
        when: { verb: 'wait', flags: [{ flag: 'dax.spinner', is: 2 }] },
        then: { text: 'Still spinning. The Duke checks a sundial. The sundial is also a spinner.', set: { 'dax.spinner': 3 } },
      },
      {
        id: 'fortress.dax-timeout',
        when: { verb: 'wait', flags: [{ flag: 'dax.spinner', is: 3 }] },
        // The running gag: somewhere east, the Card goes back to (Blank).
        then: { text: "Visual has exceeded the available resources. The Duke: 'Correct, though.' Somewhere east, in the Studio, a Card quietly goes back to (Blank).", set: { 'dax.spinner': 0, 'stare.done': false } },
      },
      {
        id: 'fortress.write-measure',
        when: { verb: 'use', noun: ['measure', 'a measure', 'new measure', 'dax query view', 'query view'] },
        then: { text: 'You write a measure. It works in the card and not in the table. This is normal. This is DAX.', outcome: 'fail' },
      },
      {
        id: 'fortress.attack-duke',
        when: { verb: 'attack', noun: DUKE },
        then: { text: 'You swing at the Duke. He wraps your fist in CALCULATE and removes its filters. It hurts in every context.', outcome: 'fail' },
      },
      {
        id: 'fortress.sit-throne',
        when: { verb: 'use', noun: ['throne', 'formula bar', 'seat', 'chair'] },
        then: { text: 'You reach for the throne. It is a formula bar. It autocompletes your hand to SUMX( and you back away.', outcome: 'fail' },
      },
      {
        // Before the moat, the window is the Duke's gate (gates.ts) and the old line rotates in its pool. After: history.
        id: 'fortress.open-window-moat',
        when: { verb: 'open', noun: ['window', 'casement', 'keep window'], flags: [{ flag: 'trial.moat' }] },
        then: { text: 'You open the window. The moat winks up at you. You wink back. You two have history now.', outcome: 'fail' },
      },
      {
        id: 'fortress.give-scroll-duke',
        when: { verb: 'give', noun: SCROLL, noun2: DUKE, has: ['scroll'] },
        then: { text: "'PySpark?' The Duke holds it at arm's length. 'In the Keep?' You are not thrown in the moat, but it is close.", outcome: 'fail' },
      },
      {
        id: 'fortress.give-policy-duke',
        when: { verb: 'give', noun: POLICY, noun2: DUKE, has: ['policy'] },
        then: { text: "'Ten days at a time? I compute everything, every time, always.' He does not want it. Keep it for the Studio.", outcome: 'fail' },
      },
      ...poke('throne', ['throne of calculates'], [], [
        'The Duke is on it. He would like you to try.',
        'You tug at the formula bar. It expands to three lines. The Duke frowns at the extra lines.',
      ]),
      ...poke('dax-window', ['query view', 'code'], [
        'You type into the DAX query view. It suggests CALCULATE. You type something else. It suggests CALCULATE again.',
        'You press Format. The DAX indents itself into a staircase. The Duke approves of staircases.',
      ], [
        'You cannot take the DAX query view. You can close it, and it will reopen with your last error.',
      ]),
      ...poke('keep-window', ['window', 'casement', 'keep window'], [
        'You lean out. The moat winks at you. You lean back in.',
        'You measure the window with your eyes. You would fit. Everyone fits.',
      ], [
        'It is a window. It stays in the wall. You, on the other hand, may not.',
      ]),
      ...poke('filter-pane', ['filter pane', 'filters', 'pane', 'filters pane'], [
        'You try to clear a filter. It is locked. They are all locked. The Duke locked them in 2019.',
        'You add a filter to the filter pane: "Duke is not (Blank)". The Duke disappears for a moment. Then comes back, annoyed.',
      ], [
        'The filter pane is behind the Duke. Everything that happens here is filtered by it. Including you.',
      ]),
    ],
  }),
  room({
    id: 'fortress.yard', name: 'The Report Studio', region: 'fortress',
    enterQuip: () => 'A canvas. A pie. A card that says (Blank). Someone has aligned nothing.',
    describe: (s) => {
      const card = s.flags['stare.done'] ? 'a Card visual showing 4.2M' : 'a Card visual showing (Blank)';
      // The second tab is the 400-visual page (deaths.ts death.400): named here so it can be opened, and warned about so it should not be.
      return s.flags['refresh.done']
        ? `The Report Studio. On the canvas: the 31-slice pie, the slicer stack, ${card}. In the corner the Big Refresh reads 100% and looks embarrassed about the last five years. Below the canvas, a second tab: Page 2 (do not open). The hall is west.`
        : `The Report Studio. A canvas the size of a wall. On it: a pie chart with 31 slices, a stack of slicers, and ${card}. In the corner, the Big Refresh: a progress bar at 97%, since 2019. A sticky note on it reads DO NOT TOUCH — JEFF. Below the canvas, a second tab: Page 2 (do not open). The hall is west.`;
    },
    exits: { w: 'fortress.hall' },
    items: ['refresh', 'pie', 'slicers', 'canvas', 'page-two', 'bookmarks', 'format-pane', 'perf-analyzer', 'visual-header', 'sticky-note'],
    npcs: ['card'],
    scene: (s) => (s.flags['refresh.done'] ? 'fortress.studio-running' : 'fortress.studio'),
    flaskHint: (s) => {
      const count = s.flags['stare.count'];
      // (Blank) first (curses.ts): the two words are the dragon's, and Sir Cardinality has them next door.
      if (s.flags['curse.blank']) return 'You are (Blank). Two words put a value back in you, and Sir Cardinality says them in his sleep, two rooms west. The Card can wait; it has practice.';
      if (s.flags['refresh.done']) {
        if (!s.worn.includes('boots')) return 'Wear the boots. The mountain will feel shorter.';
        return s.flags['trial.hoodie'] ? 'Nothing left here but the pie. Leave the pie. West, then south, out of the Keep.' : 'Nothing left here but the pie. Leave the pie. West, then west, then north: the Monastery.';
      }
      if (count === 1 || count === 2) return 'Do not blink. Wait.';
      if (s.inventory.includes('policy')) return 'The policy goes on the Big Refresh.';
      // After the Duke's spinner times out the Card is (Blank) again, but the stare is won and cannot restart.
      if (count === 3 && !s.flags['stare.done']) return "The Card went back to (Blank) when the Duke's spinner gave up. Your stare still counts. The Big Refresh wants a policy: the Model View, west of the hall, has one.";
      if (!s.flags['stare.done']) return 'Look at the Card. Then out-wait it.';
      return 'The Big Refresh needs a policy. The Model View, west of the hall, has one on a lectern.';
    },
    // The aside (Task B4), stage for stage with the flask hint above: the stare is a contest, the policy is a thing in a pocket. No brackets: the Card's Blank goes bare here so the aside always wraps.
    nudge: {
      oblique: (s) => {
        const count = s.flags['stare.count'];
        if (s.flags['refresh.done']) {
          if (!s.worn.includes('boots')) return "Something fell out of the progress bar and you're carrying it like a souvenir. It goes on your feet.";
          return "Nothing left in here but a pie with 31 slices, and the pie isn't going anywhere, which is the nicest thing anyone has said about it.";
        }
        if (count === 1 || count === 2) return "The Card's not going to blink first. It has no eyelids. You do, and that's the whole contest.";
        if (s.inventory.includes('policy')) return "The Big Refresh has been at 97% since 2019, and you're standing here with ten days at a time in your pocket.";
        if (count === 3 && !s.flags['stare.done']) return "The Card went Blank again, and that's the Duke's spinner, not you. The thing in the corner still wants what's on a lectern west of here.";
        if (!s.flags['stare.done']) return "There's a Card on that canvas showing Blank, and it has never once lost a staring contest, mostly because nobody has tried.";
        return "The Big Refresh has been at 97% since 2019. What it needs is on a lectern west of here, and it's smaller than it sounds.";
      },
      plainer: (s) => {
        const count = s.flags['stare.count'];
        if (s.flags['refresh.done']) return s.worn.includes('boots') ? '' : "They're called Bursting Boots and they've never touched your feet. That's the whole room.";
        if (count === 1 || count === 2) return "It's a staring contest. You're losing by typing.";
        if (s.inventory.includes('policy')) return 'That thing in your pocket is a refresh policy. The refresh is the thing in the corner. The rest is prepositions.';
        if (count === 3 && !s.flags['stare.done']) return '';
        if (!s.flags['stare.done']) return "It's a staring contest. Eyes on the Card, then don't type anything clever. Twice.";
        return "The paper on the lectern in the Model View is a refresh policy. The Big Refresh has wanted one since 2019, and it's the only thing it wants.";
      },
    },
    rules: [
      // ---- The stare (+10): same mechanics as the old Lookup Activity ----
      {
        id: 'fortress.stare-start',
        when: { verb: 'look', noun: CARD, flags: [{ flag: 'stare.done', not: true }, { flag: 'stare.count', not: true }] },
        then: { text: 'You look at the Card. It shows (Blank). It looks back. Neither of you blinks.', set: { 'stare.count': 1 }, outcome: 'success' },
      },
      // Before the stare's talk rule too: a question about Jeff is not a staring contest.
      // A derailment (bickering): the Card and the pie, one value each, forever.
      { id: 'fortress.card-pie', when: { verb: 'talk', noun: CARD, noun2: ['pie', 'pie chart', 'slices'] }, then: { text: 'The Card shows (Pie). The pie shows 3.2%. The Card shows (Blank). The pie shows 3.2%. (You see where this is going.)', outcome: 'success' } },
      { id: 'fortress.card-jeff', when: { verb: 'talk', noun: CARD, noun2: ['jeff', 'finance', 'jeff from finance'] }, then: { text: 'The Card shows (Jeff). Then (Blank). It has no relationship to Jeff; nobody does.', outcome: 'success' } },
      {
        id: 'fortress.talk-card-stare',
        when: { verb: 'talk', noun: CARD, flags: [{ flag: 'stare.done', not: true }, { flag: 'stare.count', not: true }] },
        then: { text: 'The Card says (Blank). You realize you are now staring at it. It is staring back. This is going to take a while.', set: { 'stare.count': 1 }, outcome: 'success' },
      },
      {
        id: 'fortress.stare-wait-1',
        when: { verb: 'wait', flags: [{ flag: 'stare.count', is: 1 }] },
        then: { text: "Still (Blank). Your eyes water. The Card's do not; it has none.", set: { 'stare.count': 2 }, outcome: 'success' },
      },
      {
        id: 'fortress.stare',
        when: { verb: 'wait', flags: [{ flag: 'stare.count', is: 2 }] },
        then: { text: 'The Card blinks. A number appears: 4.2M. It is wrong, but it is a number. You win.', set: { 'stare.done': true, 'stare.count': 3 }, points: 10, sfx: 'success' },
      },
      // The stare past the point of sense (curses.ts): six looks after the contest are counted; the seventh makes you (Blank).
      // Leaving the Studio (fortress.leave-studio) ends the stare, so it is one stare and not a career.
      {
        id: 'fortress.leave-studio',
        when: { verb: 'go', dir: 'w', flags: [{ flag: 'card.stares' }] },
        then: { text: 'You leave the Studio. The Card loses count of you; it was the only one counting.', set: { 'card.stares': 0 }, moveTo: 'fortress.hall', outcome: 'move' },
      },
      {
        id: 'fortress.curse-blank',
        when: { verb: 'look', noun: CARD, flags: [{ flag: 'stare.done' }, { flag: 'card.stares', is: 6 }, { flag: 'curse.blank', not: true }] },
        then: { text: CURSE_BLANK_TEXT, set: { 'curse.blank': true, 'card.stares': 0 }, outcome: 'snark', sfx: 'curse' },
      },
      {
        id: 'fortress.look-card-again',
        when: { verb: 'look', noun: CARD, flags: [{ flag: 'stare.done' }, { flag: 'card.looked' }] },
        then: { text: '4.2M. Then 4.7M. Then 4.2M. It depends on whether Jeff is in the room.', set: STARES, outcome: 'success' },
      },
      {
        id: 'fortress.look-card-done',
        when: { verb: 'look', noun: CARD, flags: [{ flag: 'stare.done' }] },
        then: { text: 'The Card shows 4.2M. It is wrong, but it is a number. It looks pleased with itself.', set: { 'card.looked': true, ...STARES }, outcome: 'success' },
      },
      {
        id: 'fortress.look-card-reblank',
        when: { verb: 'look', noun: CARD, flags: [{ flag: 'stare.count', is: 3 }] },
        then: { text: '(Blank). Again. Somewhere upstairs a spinner gave up, and the Card took it personally.', outcome: 'success' },
      },
      {
        id: 'fortress.look-card-staring',
        when: { verb: 'look', noun: CARD },
        then: { text: '(Blank). You are mid-stare. Do not blink. Wait.', outcome: 'success' },
      },
      {
        // Every talk after the stare starts: the Card's own escalation (npcs.ts) through the engine's talk counter, or its brush-off for an `about` topic.
        id: 'fortress.talk-card',
        when: { verb: 'talk', noun: CARD },
        then: { text: (s, world, cmd) => talkTo(s, world, world.npcs['card']!, cmd?.noun2), outcome: 'fail' },
      },
      {
        id: 'fortress.attack-card',
        when: { verb: 'attack', noun: CARD },
        then: { text: 'You hit the Card. It shows (Blank). You cannot hurt what has no measure.', outcome: 'fail' },
      },
      // `use card`: the Studio gate (gates.ts) leaves `use` to the room, so the Card says what it wants here.
      {
        id: 'fortress.use-card',
        when: { verb: 'use', noun: CARD, flags: [{ flag: 'stare.done', not: true }] },
        then: {
          text: (s) => (s.flags['stare.count'] === 1 || s.flags['stare.count'] === 2
            ? 'You are mid-stare. The Card takes no input and, right now, neither do you. Wait.'
            // After the Duke's spinner times out the Card is (Blank) again, but the stare is won and cannot restart.
            : s.flags['stare.count'] === 3 ? "The Card takes no input. It went (Blank) when the Duke's spinner gave up; your stare still counts. The refresh is the one that wants something."
            : 'The Card takes no input. It wants staring at: look at it, then wait, then wait again.'),
          outcome: 'fail',
        },
      },
      {
        id: 'fortress.use-card-done',
        when: { verb: 'use', noun: CARD },
        then: { text: 'It shows 4.2M. You cannot use a number that is wrong. Finance can, and will.', outcome: 'fail' },
      },
      // ---- The Big Refresh (+15, the Bursting Boots) ----
      {
        id: 'fortress.copy',
        when: { verb: 'use', noun: POLICY, noun2: REFRESH, has: ['policy'], flags: [{ flag: 'refresh.done', not: true }] },
        then: {
          text: 'You hand the Big Refresh a policy: ten days at a time. It blinks. It finishes 2019. Then 2020. Then all of it, in a minute, in small bursting steps. Something falls out of the progress bar: a pair of boots.',
          set: { 'refresh.done': true }, remove: ['policy'], give: ['boots'], points: 15, sfx: 'item',
        },
      },
      {
        id: 'fortress.copy-give',
        when: { verb: 'give', noun: POLICY, noun2: REFRESH, has: ['policy'], flags: [{ flag: 'refresh.done', not: true }] },
        then: {
          text: 'You give the Big Refresh the policy. It reads it twice, then refreshes ten days at a time: 2019, 2020, all of it, in a minute. Something falls out of the progress bar: a pair of boots.',
          set: { 'refresh.done': true }, remove: ['policy'], give: ['boots'], points: 15, pointsKey: 'fortress.copy', sfx: 'item',
        },
      },
      {
        id: 'fortress.copy-nopolicy',
        when: { verb: 'use', noun2: REFRESH, flags: [{ flag: 'refresh.done', not: true }] },
        then: { text: 'The Big Refresh looks at you. 97%. It needs a policy, not encouragement.', outcome: 'fail' },
      },
      {
        id: 'fortress.refresh-fail',
        when: { verb: 'use', noun: REFRESH, notHas: ['policy'], flags: [{ flag: 'refresh.done', not: true }] },
        then: { text: (s) => vary(s, REFRESH_ERRORS), outcome: 'fail' },
      },
      {
        id: 'fortress.use-refresh',
        when: { verb: 'use', noun: REFRESH, flags: [{ flag: 'refresh.done', not: true }] },
        then: { text: 'You click Refresh. It was already refreshing. It is now refreshing harder. (The policy in your pocket is not helping from there.)', outcome: 'fail' },
      },
      {
        id: 'fortress.refresh-done',
        when: { verb: 'use', noun: REFRESH },
        then: { text: 'It refreshes. Ten days, one minute. It is almost boring. You miss the drama.', outcome: 'fail' },
      },
      {
        id: 'fortress.get-refresh',
        when: { verb: 'get', noun: REFRESH },
        then: { text: (s) => (s.flags['refresh.done'] ? 'It is done. Let it rest. It has earned it.' : 'It is 97% of the way through 2019. Leave it.'), outcome: 'fail' },
      },
      // ---- The Card takes no input ----
      {
        id: 'fortress.give-policy-card',
        when: { verb: 'give', noun: POLICY, noun2: CARD, has: ['policy'] },
        then: { text: "The Card does not take input. That is the Card's whole thing.", outcome: 'fail' },
      },
      {
        id: 'fortress.give-mug-card',
        when: { verb: 'give', noun: MUG, noun2: CARD, has: ['mug'] },
        then: { text: 'The Card shows (Mug). Then (Blank).', outcome: 'fail' },
      },
      {
        id: 'fortress.give-license-card',
        when: { verb: 'give', noun: LICENSE, noun2: CARD, has: ['license'] },
        then: { text: 'The Card shows (Pro). Then (Blank). It is not impressed either.', outcome: 'fail' },
      },
      {
        id: 'fortress.give-card',
        when: { verb: 'give', noun2: CARD },
        then: { text: (s) => vary(s, ['The Card does not take input.', 'You hold it up to the Card. The Card shows (Blank), politely.', 'The Card displays. It does not receive. It is a Card.']), outcome: 'fail' },
      },
      // ---- Report design (spec §12.1) ----
      {
        id: 'fortress.bar-chart-pie',
        when: { verb: 'use', noun: ['bar chart', 'bar', 'chart', 'column chart'], noun2: ['pie', 'pie chart', 'chart', 'slices'] },
        then: { text: 'You turn the pie into a bar chart. Three stakeholders weep. The fourth sends a thumbs-up.', outcome: 'fail' },
      },
      // The policy on yourself while a column (curses.ts): the global undo, copied ahead of the Studio's own `use policy` line.
      { ...UNDO_COLUMN, id: 'fortress.undo-column-studio' },
      {
        id: 'fortress.use-policy-studio',
        when: { verb: 'use', noun: POLICY, has: ['policy'] },
        then: { text: 'On what? The Big Refresh is right there, at 97%. Use the policy on the refresh.', outcome: 'fail' },
      },
      ...poke('pie', ['pie', 'pie chart', 'chart', 'slices', 'other'], [
        "You click a slice. It is 'Other'. Inside 'Other' is more 'Other'.",
        'You hover over the pie. A tooltip says 3.2%. It does not say of what.',
        'You drag the pie a little to the left. It is still a pie.',
      ], [
        'The pie is 31 slices. You cannot take it in one trip, and nobody wants a slice.',
        "You take a slice. It is 'Other'. You put it back.",
      ]),
      ...poke('slicers', ['slicers', 'slicer', 'slicer stack', 'stack', 'dropdowns'], [
        'You select 2019 in the Year slicer. Every visual on the page flashes (Blank), then recovers, then does not.',
        'You clear all slicers. The page loads everything. The page regrets it.',
        'You open the slicer with no field. It is empty. It has always been empty. It filters anyway.',
      ], [
        'The slicers are synced across nine pages. Move one and eight others move with it.',
      ]),
      ...poke('canvas', ['canvas', 'report', 'page', 'report page'], [
        'You click on the empty canvas. Everything deselects. It is the most peaceful the report has ever been.',
        'You add a page. It is called Page 1 (2). You delete it. The name is reserved forever.',
      ], [
        'The canvas is 1280 by 720. You are not.',
      ]),
      ...poke('bookmarks', ['bookmarks', 'bookmarks pane', 'bookmark pane'], [
        'You click "Jeff view". Three visuals vanish and one reappears in the wrong place. This is the Jeff view.',
        'You click "Default (2)". It is identical to "Default", except for one slicer nobody can find.',
      ], [
        'The bookmarks pane is docked. So are you, now.',
      ]),
      ...poke('format-pane', ['format pane', 'formatting', 'paint roller'], [
        'You open the Format pane. It has 214 options. You change the font. You feel nothing.',
        'You search the Format pane for "border". It finds twelve. None of them is the border.',
      ], [
        'The Format pane has 214 options and none of them is "come with you".',
      ]),
      ...poke('perf-analyzer', ['performance analyzer', 'analyzer', 'performance', 'stopwatch'], [
        'Performance Analyzer runs. The slowest visual is the one Jeff asked for.',
        'You start recording and refresh the visuals. The pie takes eleven seconds. The pie is not sorry.',
      ], [
        'You pick up the Performance Analyzer. It records how long that took. You put it down.',
      ]),
      ...poke('visual-header', ['visual header', 'header', 'ellipsis', 'more options', 'focus mode'], [
        'You click the ellipsis. The first option is "Export data". Somewhere in the village, Jeff sits up.',
        'You click focus mode. The pie fills the screen. That was a mistake.',
      ], [
        'The visual header only appears when you hover. When you reach for it, it disappears.',
      ]),
      ...poke('sticky-note', ['sticky note', 'note', 'sticky', 'post it'], [
        'You press the sticky note down firmly. It was already stuck. It is now load-bearing.',
      ], [
        'It says DO NOT TOUCH — JEFF. You do not touch it.',
        'You peel the corner. Underneath, an older note: DO NOT TOUCH — ALSO JEFF.',
      ]),
    ],
  }),
]);

const KEEP_REGION = 'fortress' as const;
const STUDIO = 'fortress.yard';

/**
 * Raw-line commands in the Keep. Registered ahead of PHRASE_RULES (see world/index.ts), so these scoped lines beat
 * the global eggs they overlap (refresh, hide, format, publish, sit, write a measure). No flags are set here: the
 * rules above own every state change.
 */
export const KEEP_PHRASES: PhraseRule[] = [
  // Gate
  { id: 'fortress.fish-moat', room: 'fortress.bridge', test: /^(fish|go fishing|cast)( a line)?( (in|into|from))?( the)? ?(moat|moat of t sql|water)?$/, text: (s) => (s.flags['trial.moat']
    ? 'You fish in the moat you were thrown into. You catch a semicolon. It is yours. You left it there on the way down.'
    : "You fish in the Moat of T-SQL. You catch a stored procedure. It has 400 lines and a comment that says 'temporary'. You release it.") },
  { id: 'fortress.update-words', room: 'fortress.bridge', test: /^(update|install)\b/, text: 'The update installs. Then another. The drawbridge does not move. This is the update.' },
  // Power Query Hall
  { id: 'fortress.fold', room: 'fortress.hall', test: /^(fold|query folding)\b/, text: 'You attempt to fold. The step before you is `Changed Type`. Folding stops here, as it always has.' },
  // Bare `changed type` is step 4's command (applied-steps.ts, registered ahead of this); `say changed type` stays the echo.
  { id: 'fortress.changed-type', room: 'fortress.hall', test: /^(say )?changed type\b/, text: 'Changed Type. Changed Type. Changed Type. The hall echoes it back. It has seven words now, and that one is still its favourite.' },
  { id: 'fortress.delete-custom1', room: 'fortress.hall', test: /^(delete|remove) (step )?custom ?1\b/, text: 'You hover over the X next to Custom1. The hall goes quiet. Every step after it turns yellow in advance. You do not delete Custom1. Nobody deletes Custom1.' },
  // `remove (other) columns` is step 6 of the query (applied-steps.ts), so it is no longer a line of its own here.
  { id: 'fortress.buffer', room: 'fortress.hall', test: /^(buffer|table\.?buffer)\b/, text: 'Table.Buffer. The hall holds its breath. Nothing is faster. Everything is in memory.' },
  { id: 'fortress.merge', room: 'fortress.hall', test: /^(merge|append)\b/, text: 'You merge queries. Left outer. It is always left outer.' },
  { id: 'fortress.advanced-editor', room: 'fortress.hall', test: /^(enter m|edit m|advanced editor|open (the )?advanced editor)\b/, text: 'The Advanced Editor opens. It is a wall of `let`. You close it gently.' },
  // Model View
  { id: 'fortress.hide', room: 'fortress.model', test: /^hide\b/, text: 'You hide the key column. It is still there. It is always still there.' },
  // Ten calculated columns (spec1 §5.4): the count is `model.calc`; the tenth is death.word. The engine signs it off.
  { id: 'fortress.circular', room: 'fortress.model', test: /^(create|add|new|make) (a )?(new )?(calculated )?column\b/, text: '', then: (s) => {
    const n = Number(s.flags['model.calc']) || 0;
    if (n >= 9) return { id: 'death.word', then: { text: WORD_DEATH, death: 'death.word' } };
    return { id: 'fortress.circular', then: { text: COLUMNS[n]!, set: { 'model.calc': n + 1 }, outcome: 'snark' } };
  } },
  // Duke's chamber
  // The sin as a sentence ("i'll just use a calculated column", with or without `say`): the moat rule by another door.
  { id: 'fortress.moat-words', room: 'fortress.throne', test: /^(say )?(i('ll| will)? )?(just )?(use|add|make) (a )?calculated column$/, text: '', then: (s) => (s.flags['trial.moat'] ? { id: 'fortress.moat-again', then: MOAT_AGAIN } : { id: 'fortress.moat', then: MOAT_THEN }) },
  { id: 'fortress.write-measure-words', room: 'fortress.throne', test: /^write (a |new |some )?(measure|dax)\b/, text: 'You write a measure. It works in the card and not in the table. This is normal. This is DAX.' },
  { id: 'fortress.sit', room: 'fortress.throne', test: /^sit\b/, text: 'You sit on the formula bar. It autocompletes you. You get up as SUMX(.' },
  // Report Studio
  {
    id: 'fortress.refresh-words', room: STUDIO, test: /^refresh\b/,
    text: (s) => (s.flags['refresh.done'] ? 'It refreshes. Ten days, one minute. It is almost boring. You miss the drama.'
      : s.inventory.includes('policy') ? 'You click Refresh. It was already refreshing. It is now refreshing harder. (The policy in your pocket is not helping from there.)'
      : vary(s, REFRESH_ERRORS)),
  },
  { id: 'fortress.eat-pie', room: STUDIO, test: /^(eat|taste|bite)( a slice of| the| a)? pie( chart)?$/, text: "You eat a slice. It is 'Other'. It tastes like the other eleven 'Other's." },
  { id: 'fortress.add-slicer', room: STUDIO, test: /^add (a |another )?slicers?\b/, text: 'You add a slicer. There are now nine slicers. The page loads in the time it takes to regret this.' },
  { id: 'fortress.fix-pie', room: STUDIO, test: /^fix (the )?pie\b/, text: "A pie with 31 slices. Twelve of them are 'Other'. You could fix it. You could also leave it and let it be someone else's problem in Q3." },
  { id: 'fortress.align', room: STUDIO, test: /^(align|distribute)\b/, text: 'You align the visuals. Eleven pixels. Then ten. Then eleven again. It is never done.' },
  { id: 'fortress.bookmark', room: STUDIO, test: /^((create|add) (a )?)?bookmark$/, text: 'You create a bookmark. It captures the current state, including the part that is broken.' },
  { id: 'fortress.conditional', room: STUDIO, test: /^(conditional formatting|conditionally format|(add|apply) conditional formatting)\b/, text: 'You conditionally format the card. It is red. It was always going to be red.' },
  { id: 'fortress.perf', room: STUDIO, test: /^((run|start|open) )?(performance analyzer|analy[sz]e performance)\b/, text: 'Performance Analyzer runs. The slowest visual is the one Jeff asked for.' },
  { id: 'fortress.qna', room: STUDIO, test: /^((use|add|open) (the )?q ?& ?a( visual)?|q ?& ?a\b|ask (?!(the )?(card|jeff|copilot)\b)\S)/, text: 'Q&A shows sales by month. You asked about regions. It is very confident.' },
  // Anywhere in the Keep (spec §17)
  // The sin anywhere but the chamber (C1's deferred minor): right idea, wrong room. The chamber declines it to the moat rules.
  { id: 'fortress.sin-elsewhere', region: KEEP_REGION, test: /^(say )?(a )?calculated columns?$/, text: '', then: (s) => (s.room === 'fortress.throne' ? null : { then: { outcome: 'snark', text: s.flags['trial.moat']
    ? 'You said it once where it counted, and you still smell like it. Out here it is just two words and a draught.'
    : 'Right sin, wrong room. Nobody here owns a window worth throwing you out of. The Duke does, north of the hall.' } }) },
  { id: 'fortress.directquery', region: KEEP_REGION, test: /^(say |use |switch to )?direct ?query\b/, text: 'Every click, a query. Every query, a wait. You feel the Keep slow down as you say it.' },
  { id: 'fortress.directlake', region: KEEP_REGION, test: /^(say |use |switch to )?direct ?lake\b/, text: 'Direct Lake. The Keep brightens. Then falls back to DirectQuery for reasons that will be explained in a blog post.' },
  { id: 'fortress.publish', region: KEEP_REGION, test: /^publish\b/, text: 'Publish to Power BI: which workspace? There is one. It is not the right one. You publish anyway. A red dot appears on something.' },
  { id: 'fortress.label', region: KEEP_REGION, test: /^(label|sensitivity( label)?|set sensitivity|(set|apply|add) (a )?(sensitivity )?label)\b/, text: 'Highly Confidential. The pie chart is now Highly Confidential. Jeff can still see it.' },
  { id: 'fortress.format-number', region: KEEP_REGION, test: /^format (the )?(numbers?|string|currency|percent|as)\b/, text: '0.00%. Then #,##0. Then, briefly, a date. It is not a date.' },
  { id: 'fortress.format', region: KEEP_REGION, test: /^format\b(?! c\b)/, text: 'You open the Format pane. It has 214 options. You change the font. You feel nothing.' },
];
