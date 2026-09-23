import type { PhraseRule, Room, Rule, RuleThen } from './types';
import type { GameState, HeardLine } from '../engine/types';
import { vary } from '../engine/quirks';
import { CARDINALITY_ADVICE } from './npcs';

/**
 * The Semantic Model Keep: the old Warehouse Fortress, re-themed as Power BI (spec §12, §17).
 * Desktop at the gate, Power Query in the hall, the Model View west of it (and, north of that, the Monastery's
 * back gate), the Duke of DAX in the chamber, the Report Studio in the old yard. The Moat is still T-SQL: the
 * Keep stands on a Warehouse, and SQL spoken in a semantic model ends up there. Room ids and scored rule ids are
 * unchanged (fortress.sku / .moat / .stare / .copy), so the ledger still sums to 200.
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

/** Scenery that answers `use` and `get` from rotating pools, so repeated pokes are different pokes. */
const poke = (id: string, noun: string[], use: string[], get: string[]): Rule[] => [
  ...(use.length ? [{ id: `fortress.use-${id}`, when: { verb: 'use', noun }, then: { text: (s: GameState) => vary(s, use), outcome: 'fail' } } satisfies Rule] : []),
  ...(get.length ? [{ id: `fortress.get-${id}`, when: { verb: 'get', noun }, then: { text: (s: GameState) => vary(s, get), outcome: 'fail' } } satisfies Rule] : []),
];

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
      !s.flags['trial.moat'] ? `North, then north again. The Duke hates one query above all others.${s.flags['taken.policy'] ? '' : ' West of the hall, a policy waits.'}` :
      !s.flags['taken.policy'] ? 'North, then west. In the Model View, a policy waits on a lectern.' :
      !s.flags['refresh.done'] ? 'North, then east. The Report Studio has a Big Refresh that wants your policy.' :
      !s.flags['trial.hoodie'] ? "North, west, then north again: the Model View's back gate opens onto the Monastery." :
      'The Keep is done with you, and you with it. South, to the Foothills.',
    rules: [
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
        then: { text: "'Pause it or lose it,' mutters the guard. The bridge stays up.", outcome: 'snark' },
      },
      {
        id: 'fortress.sign-in',
        when: { verb: 'say', noun: ['sign in', 'log in', 'login', 'signin'] },
        then: { text: 'You are already signed in. Twice. On two tenants. One of them is wrong.', outcome: 'snark' },
      },
      {
        id: 'fortress.north-closed',
        when: { verb: 'go', dir: 'n', flags: [{ flag: 'bridge.down', not: true }] },
        then: { text: 'The drawbridge is up. It is updating (1 of 3). The moat below is deep and full of GROUP BY.', outcome: 'fail' },
      },
      {
        id: 'fortress.open-bridge',
        when: { verb: 'open', noun: ['drawbridge', 'bridge', 'gate', 'keep gate', 'splash', 'splash screen'], flags: [{ flag: 'bridge.down', not: true }] },
        then: { text: "You click the splash screen. It is not a button. The guard shouts: 'STATE. YOUR. SKU.'", outcome: 'fail' },
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
    enterQuip: () => 'A hall of Applied Steps. Every door is a Changed Type.',
    describe: () =>
      "Power Query Hall. A long hall of Applied Steps; every doorway is a Changed Type. Portraits line the walls: Source, Navigation, and a step called Custom1 that nobody remembers. The Duke's chamber is north; the Report Studio, east; the Model View, west; the gate, south.",
    exits: { s: 'fortress.bridge', n: 'fortress.throne', e: 'fortress.yard', w: 'fortress.model' },
    // Most specific first: resolveNoun takes the first suffix match ('custom step' is Custom1, not the steps).
    items: ['custom1', 'editor-door', 'steps', 'doorways', 'portraits'],
    npcs: [],
    scene: () => 'fortress.hall',
    flaskHint: (s) =>
      !s.flags['trial.moat'] ? 'North. Insult the Duke properly and he will do the rest.' :
      !s.flags['taken.policy'] ? 'West, in the Model View, a policy waits on a lectern. The Studio east will want it.' :
      !s.flags['refresh.done'] ? 'East. The Report Studio has a Card that needs out-staring and a refresh that needs your policy.' :
      !s.flags['trial.hoodie'] ? 'West, then north: the Model View has a back gate onto the Monastery.' :
      'The Keep is done with you. South, through the gate. Mind the moat; it remembers you.',
    rules: [
      {
        id: 'fortress.open-editor',
        when: { verb: 'open', noun: ['advanced editor', 'editor', 'advanced editor door', 'm', 'door'] },
        then: { text: 'The Advanced Editor opens. It is a wall of `let`. You close it gently.', outcome: 'fail' },
      },
      {
        id: 'fortress.remove-columns',
        when: { verb: 'use', noun: ['columns', 'column', 'other columns', 'removed other columns'] },
        then: { text: 'You remove other columns. The hall grows shorter. So does your refresh.', outcome: 'fail' },
      },
      ...poke('steps', ['steps', 'applied steps', 'step'], [
        'You click a step. The preview jumps back in time. Every step after it greys out, waiting.',
        'You drag a step up the list. Everything below it errors. You drag it back.',
        'You rename a step to something meaningful. The hall is shocked. Nobody has done that before.',
      ], [
        'You try to lift a step. Every step after it turns yellow. You put it back.',
        'Steps are not taken. They are applied.',
      ]),
      ...poke('doorways', ['doorways', 'doorway', 'doors', 'arches'], [
        'You walk through a Changed Type. Nothing changes. The type was already that.',
        'You step through a doorway. It is another Changed Type. They are all Changed Types.',
      ], [
        'You cannot take a Changed Type. Power Query adds them for you. It will add one to this sentence.',
        'You pull a doorway off its hinges. Power Query adds a new one: Changed Type1.',
      ]),
      ...poke('portraits', ['portraits', 'portrait', 'paintings', 'painting', 'source', 'navigation'], [
        'You straighten the portrait of Source. The server name on it is wrong. It has been wrong since the migration.',
        'You tap the portrait of Navigation. It points harder at the table out of frame.',
      ], [
        'The portraits are the query. Take one down and the whole hall errors.',
        'You lift the portrait of Source. The hall says: Expression.Error. You hang it back.',
      ]),
      ...poke('custom1', ['custom1', 'custom 1', 'custom'], [
        'You open Custom1. It says: = Table.AddColumn(#"Changed Type", "Custom", each 1). Why. Why 1.',
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
      `The Model View. Tables float on plinths, joined by relationship lines. One many-to-many bridge wobbles. A date table sits unmarked. Sir Cardinality guards the diagram${s.flags['taken.policy'] ? '' : '. On a lectern: an incremental refresh policy'}. The hall is east; a back gate, north, opens onto the Monastery.`,
    exits: { e: 'fortress.hall', n: 'monastery.gate' },
    // Most specific first: 'date table' and 'bridge table' must not fall to the plinths' 'table'.
    items: ['policy', 'm2m-bridge', 'date-table', 'plinths', 'lines', 'lectern', 'diagram'],
    npcs: ['cardinality'],
    scene: () => 'fortress.model',
    flaskHint: (s) =>
      !s.flags['taken.policy'] ? 'Take the policy. Small steps beat big refreshes.' :
      !s.flags['refresh.done'] ? 'The policy is for the Big Refresh in the Studio: east, then east.' :
      !s.flags['trial.hoodie'] ? 'North, through the back gate, the monks are waiting.' :
      'The monks are done with you and so is the Keep. East to the hall, then south, out the gate.',
    catchAll: modelLine,
    rules: [
      {
        id: 'fortress.get-policy',
        when: { verb: 'get', noun: POLICY, flags: [{ flag: 'taken.policy', not: true }] },
        then: { text: "An incremental refresh policy: 'Refresh rows from the last 10 days.' Small steps. Bursting steps, one might say.", give: ['policy'], sfx: 'item' },
      },
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
      {
        id: 'fortress.date-table-again',
        when: { verb: 'use', noun: ['date table', 'as date table', 'calendar', 'date', 'dates', 'calendar table'], flags: [{ flag: 'model.date' }] },
        then: { text: 'It is already marked. You mark it again. Time intelligence sighs: "I heard you the first time."', outcome: 'fail' },
      },
      {
        id: 'fortress.date-table',
        when: { verb: 'use', noun: ['date table', 'as date table', 'calendar', 'date', 'dates', 'calendar table'] },
        then: { text: 'You mark the date table as a date table. Time intelligence, which had been sulking, starts working. No points. It should have been done already.', set: { 'model.date': true } },
      },
      {
        id: 'fortress.talk-cardinality',
        when: { verb: 'talk', noun: CARDINALITY },
        then: {
          text: (s) => CARDINALITY_ADVICE[((s.flags['cardinality.asked'] as number) || 0) % CARDINALITY_ADVICE.length]!,
          set: { 'cardinality.asked': (v) => (typeof v === 'number' ? v : 0) + 1 },
          outcome: 'success',
        },
      },
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
    flaskHint: (s) => (s.flags['trial.moat'] ? 'You have the smell. Nothing more for you here, unless you like spinners.' : 'Say the two-word query every DAX lord despises. Star is involved.'),
    rules: [
      {
        id: 'fortress.moat',
        when: { verb: 'say', noun: ['select *', 'select star', 'select * from', 'select *;', 'select * from table', 'select all', 'select * from everything'], flags: [{ flag: 'trial.moat', not: true }] },
        then: {
          text: "'SELECT STAR?' The Duke rises. 'SQL? IN. MY. MODEL?' Two guards seize you by the arms and hurl you from the window into the Moat of T-SQL below — the Warehouse this whole Keep was built on. You surface, sputtering, covered in semicolons and something that might be a CROSS APPLY. You climb out. You will never not smell like this.",
          set: { 'trial.moat': true }, points: 25, moveTo: 'fortress.bridge', sfx: 'death',
        },
      },
      {
        id: 'fortress.select1',
        when: { verb: 'say', noun: ['select 1', 'select 1;'] },
        then: { text: "'Adequate,' says the Duke, and returns to his throne.", outcome: 'snark' },
      },
      {
        id: 'fortress.select-cols',
        when: { verb: 'say', nounMatches: /^select .+ from/ },
        then: { text: "'A column list. How… proper.' The Duke seems disappointed. 'Nobody gets thrown in the moat for a column list.'", outcome: 'snark' },
      },
      {
        id: 'fortress.say-join',
        when: { verb: 'say', nounMatches: /join/ },
        then: { text: "'JOINs,' says the Duke, 'are for the moat.'", outcome: 'snark' },
      },
      {
        id: 'fortress.dax-calculate',
        when: { verb: 'say', noun: ['calculate'] },
        then: { text: "'CALCULATE,' says the Duke, 'with no filter. A context transition, and nothing else. You may sit.' You may not sit.", outcome: 'snark' },
      },
      {
        id: 'fortress.dax-sumx',
        when: { verb: 'say', noun: ['sumx', 'sum'] },
        then: { text: "'SUMX,' the Duke corrects, 'iterates. SUM aggregates. You, peasant, do neither.'", outcome: 'snark' },
      },
      {
        id: 'fortress.dax-divide',
        when: { verb: 'say', noun: ['divide'] },
        then: { text: "'DIVIDE,' says the Duke, 'handles zero. Unlike you.'", outcome: 'snark' },
      },
      {
        id: 'fortress.dax-filter',
        when: { verb: 'say', noun: ['filter'] },
        then: { text: "'FILTER returns a table,' says the Duke. 'You return nothing.'", outcome: 'snark' },
      },
      {
        id: 'fortress.dax-measure',
        when: { verb: 'say', noun: ['measure', 'a measure', 'measures'] },
        then: { text: 'The Duke waits for the rest of the measure. It does not come. He closes the DAX query view on your fingers.', outcome: 'snark' },
      },
      {
        id: 'fortress.dax-context',
        when: { verb: 'say', noun: ['evaluation context', 'filter context', 'row context', 'context', 'context transition'] },
        then: { text: "The Duke's eyes narrow. 'Which one?' You do not know. Nobody does, the first six times.", outcome: 'snark' },
      },
      {
        id: 'fortress.dax-all',
        when: { verb: 'say', noun: ['all', 'allexcept', 'removefilters'] },
        then: { text: "'ALL removes filters,' says the Duke, 'including the ones keeping you alive.'", outcome: 'snark' },
      },
      // The right DAX, but it takes a while: a three-wait spinner, then the classic error (spec §17).
      {
        id: 'fortress.dax-busy',
        when: { verb: 'say', nounMatches: /(calculate.*filter|sumx|var .*return)/, flags: [{ flag: 'dax.spinner' }] },
        then: { text: 'The Duke raises one finger. The spinner from your last measure is still spinning. One visual at a time.', outcome: 'fail' },
      },
      {
        id: 'fortress.dax-good',
        when: { verb: 'say', nounMatches: /(calculate.*filter|sumx|var .*return)/ },
        then: { text: "The Duke nods. 'Correct.' A spinner appears. The spinner is still there. You could wait.", set: { 'dax.spinner': 1 } },
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
        id: 'fortress.open-window',
        when: { verb: 'open', noun: ['window', 'casement', 'keep window'] },
        then: { text: 'You open the window. The moat winks up at you. It is the fastest exit in the Keep. You close it; you are not ready to smell like that.', outcome: 'fail' },
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
      return s.flags['refresh.done']
        ? `The Report Studio. On the canvas: the 31-slice pie, the slicer stack, ${card}. In the corner the Big Refresh reads 100% and looks embarrassed about the last five years. The hall is west.`
        : `The Report Studio. A canvas the size of a wall. On it: a pie chart with 31 slices, a stack of slicers, and ${card}. In the corner, the Big Refresh: a progress bar at 97%, since 2019. A sticky note on it reads DO NOT TOUCH — JEFF. The hall is west.`;
    },
    exits: { w: 'fortress.hall' },
    items: ['refresh', 'pie', 'slicers', 'canvas', 'bookmarks', 'format-pane', 'perf-analyzer', 'visual-header', 'sticky-note'],
    npcs: ['card'],
    scene: (s) => (s.flags['refresh.done'] ? 'fortress.studio-running' : 'fortress.studio'),
    flaskHint: (s) => {
      const count = s.flags['stare.count'];
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
    rules: [
      // ---- The stare (+10): same mechanics as the old Lookup Activity ----
      {
        id: 'fortress.stare-start',
        when: { verb: 'look', noun: CARD, flags: [{ flag: 'stare.done', not: true }, { flag: 'stare.count', not: true }] },
        then: { text: 'You look at the Card. It shows (Blank). It looks back. Neither of you blinks.', set: { 'stare.count': 1 }, outcome: 'success' },
      },
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
      {
        id: 'fortress.look-card-again',
        when: { verb: 'look', noun: CARD, flags: [{ flag: 'stare.done' }, { flag: 'card.looked' }] },
        then: { text: '4.2M. Then 4.7M. Then 4.2M. It depends on whether Jeff is in the room.', outcome: 'success' },
      },
      {
        id: 'fortress.look-card-done',
        when: { verb: 'look', noun: CARD, flags: [{ flag: 'stare.done' }] },
        then: { text: 'The Card shows 4.2M. It is wrong, but it is a number. It looks pleased with itself.', set: { 'card.looked': true }, outcome: 'success' },
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
        id: 'fortress.talk-card',
        when: { verb: 'talk', noun: CARD },
        then: { text: (s) => (s.flags['stare.done'] ? 'The Card says 4.2M. It would like you to stop asking where it got that.' : 'The Card says (Blank). It is not being rude. It has no measure.'), outcome: 'fail' },
      },
      {
        id: 'fortress.attack-card',
        when: { verb: 'attack', noun: CARD },
        then: { text: 'You hit the Card. It shows (Blank). You cannot hurt what has no measure.', outcome: 'fail' },
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
  { id: 'fortress.update-words', room: 'fortress.bridge', test: /^(update|install)\b/, text: 'The update installs. Then another. The drawbridge does not move. This is the update.' },
  // Power Query Hall
  { id: 'fortress.fold', room: 'fortress.hall', test: /^(fold|query folding)\b/, text: 'You attempt to fold. The step before you is `Changed Type`. Folding stops here, as it always has.' },
  { id: 'fortress.changed-type', room: 'fortress.hall', test: /^(say )?changed type\b/, text: "Changed Type. Changed Type. Changed Type. The hall echoes it back. It is the hall's only word." },
  { id: 'fortress.delete-custom1', room: 'fortress.hall', test: /^(delete|remove) (step )?custom ?1\b/, text: 'You hover over the X next to Custom1. The hall goes quiet. Every step after it turns yellow in advance. You do not delete Custom1. Nobody deletes Custom1.' },
  { id: 'fortress.remove-columns-words', room: 'fortress.hall', test: /^remove (other )?columns?\b/, text: 'You remove other columns. The hall grows shorter. So does your refresh.' },
  { id: 'fortress.buffer', room: 'fortress.hall', test: /^(buffer|table\.?buffer)\b/, text: 'Table.Buffer. The hall holds its breath. Nothing is faster. Everything is in memory.' },
  { id: 'fortress.merge', room: 'fortress.hall', test: /^(merge|append)\b/, text: 'You merge queries. Left outer. It is always left outer.' },
  { id: 'fortress.advanced-editor', room: 'fortress.hall', test: /^(enter m|edit m|advanced editor|open (the )?advanced editor)\b/, text: 'The Advanced Editor opens. It is a wall of `let`. You close it gently.' },
  // Model View
  { id: 'fortress.hide', room: 'fortress.model', test: /^hide\b/, text: 'You hide the key column. It is still there. It is always still there.' },
  { id: 'fortress.circular', room: 'fortress.model', test: /^(create|add|new) (a )?(new )?(calculated )?column\b/, text: 'A circular dependency was detected. You did not touch anything. You breathed near it.' },
  // Duke's chamber
  { id: 'fortress.write-measure-words', room: 'fortress.throne', test: /^write (a |new |some )?(measure|dax)\b/, text: 'You write a measure. It works in the card and not in the table. This is normal. This is DAX.' },
  { id: 'fortress.sit', room: 'fortress.throne', test: /^sit\b/, text: 'You sit on the formula bar. It autocompletes you. You get up as SUMX(.' },
  // Report Studio
  {
    id: 'fortress.refresh-words', room: STUDIO, test: /^refresh\b/,
    text: (s) => (s.flags['refresh.done'] ? 'It refreshes. Ten days, one minute. It is almost boring. You miss the drama.'
      : s.inventory.includes('policy') ? 'You click Refresh. It was already refreshing. It is now refreshing harder. (The policy in your pocket is not helping from there.)'
      : vary(s, REFRESH_ERRORS)),
  },
  { id: 'fortress.add-slicer', room: STUDIO, test: /^add (a |another )?slicers?\b/, text: 'You add a slicer. There are now nine slicers. The page loads in the time it takes to regret this.' },
  { id: 'fortress.fix-pie', room: STUDIO, test: /^fix (the )?pie\b/, text: "A pie with 31 slices. Twelve of them are 'Other'. You could fix it. You could also leave it and let it be someone else's problem in Q3." },
  { id: 'fortress.align', room: STUDIO, test: /^(align|distribute)\b/, text: 'You align the visuals. Eleven pixels. Then ten. Then eleven again. It is never done.' },
  { id: 'fortress.bookmark', room: STUDIO, test: /^((create|add) (a )?)?bookmark$/, text: 'You create a bookmark. It captures the current state, including the part that is broken.' },
  { id: 'fortress.conditional', room: STUDIO, test: /^(conditional formatting|conditionally format|(add|apply) conditional formatting)\b/, text: 'You conditionally format the card. It is red. It was always going to be red.' },
  { id: 'fortress.perf', room: STUDIO, test: /^((run|start|open) )?(performance analyzer|analy[sz]e performance)\b/, text: 'Performance Analyzer runs. The slowest visual is the one Jeff asked for.' },
  { id: 'fortress.qna', room: STUDIO, test: /^((use|add|open) (the )?q ?& ?a( visual)?|q ?& ?a\b|ask (?!(the )?(card|jeff|copilot)\b)\S)/, text: 'Q&A shows sales by month. You asked about regions. It is very confident.' },
  // Anywhere in the Keep (spec §17)
  { id: 'fortress.directquery', region: KEEP_REGION, test: /^(say |use |switch to )?direct ?query\b/, text: 'Every click, a query. Every query, a wait. You feel the Keep slow down as you say it.' },
  { id: 'fortress.directlake', region: KEEP_REGION, test: /^(say |use |switch to )?direct ?lake\b/, text: 'Direct Lake. The Keep brightens. Then falls back to DirectQuery for reasons that will be explained in a blog post.' },
  { id: 'fortress.publish', region: KEEP_REGION, test: /^publish\b/, text: 'Publish to Power BI: which workspace? There is one. It is not the right one. You publish anyway. A red dot appears on something.' },
  { id: 'fortress.label', region: KEEP_REGION, test: /^(label|sensitivity( label)?|set sensitivity|(set|apply|add) (a )?(sensitivity )?label)\b/, text: 'Highly Confidential. The pie chart is now Highly Confidential. Jeff can still see it.' },
  { id: 'fortress.format-number', region: KEEP_REGION, test: /^format (the )?(numbers?|string|currency|percent|as)\b/, text: '0.00%. Then #,##0. Then, briefly, a date. It is not a date.' },
  { id: 'fortress.format', region: KEEP_REGION, test: /^format\b(?! c\b)/, text: 'You open the Format pane. It has 214 options. You change the font. You feel nothing.' },
];
