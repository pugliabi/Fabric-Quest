import type { GameState } from '../engine/types';
import type { PhraseRule, Room, RuleThen } from './types';

const room = (r: Room): [string, Room] => [r.id, r];

// ---- Pivot arithmetic: the total depends only on how many of the three right pieces have landed. ----
const PIECES = ['excel.dim', 'excel.measure', 'excel.filter'] as const;
type Piece = (typeof PIECES)[number];
export const TOTALS = ['4.7M', '4.5M', '4.3M', '4.2M'] as const;
const LABELS: Record<Piece, string> = { 'excel.dim': 'Rows: Sales Region', 'excel.measure': 'Values: Net Sales', 'excel.filter': 'Filter: Is Current Year' };
const GRIPES: Record<Piece, string> = {
  'excel.dim': '"Wrong region column."',
  'excel.measure': '"That measure\'s got Returns in it."',
  'excel.filter': '"You didn\'t filter the year."',
};

export const pieces = (s: GameState): number => PIECES.filter((f) => !!s.flags[f]).length;
export const total = (s: GameState): string => TOTALS[pieces(s)]!;
/** The total as it will read once `flag` is set (rule text is rendered before the rule's `set` applies). */
const totalAfter = (s: GameState, flag: Piece): string => TOTALS[PIECES.filter((f) => f === flag || !!s.flags[f]).length]!;
const missing = (s: GameState): string[] => PIECES.filter((f) => !s.flags[f]).map((f) => LABELS[f]);

// ---- Jeff ----
export const JEFF_FACTS = [
  "I summed Sales Amount. It's the big column.",
  'I grouped by Region A. It was the first region column I saw.',
  "Filters? I didn't filter anything. Filtering is how you lose data.",
  "That's all. That's the whole method. Why are you writing this down?",
] as const;
const askJeff = (s: GameState): string => `"${JEFF_FACTS[Math.min(Number(s.flags['excel.jeff.asked']) || 0, 3)]}"`;

export const WIN_TEXT = 'Jeff looks at 4.2M. Jeff looks at his export. Jeff says the words no one at Finance has ever said: "Okay. The report was right."';
export const JEFF_DONE_TEXT = '"Okay. The report was right. Don\'t tell anyone I said that."';
const WIN: RuleThen = { text: WIN_TEXT, bonus: 20, pointsKey: 'sq.excel', set: { 'sq.excel.done': true }, sfx: 'bonus', returnTo: true };
const hint = (s: GameState): string => PIECES.filter((f) => !s.flags[f]).map((f) => GRIPES[f]).join(' ');
const notYet = (s: GameState): string => (pieces(s) === 3 ? WIN_TEXT : `Jeff squints. "It still says ${total(s)}." ${hint(s)}`);

const JEFF = ['jeff', 'finance', 'jeff from finance'];
/** "ask jeff what did you use" parses as talk "jeff what did you use": anything that starts with Jeff is for Jeff. */
const TALK_JEFF = /^(jeff|finance)\b/;
const PIVOT = ['pivot', 'pivottable', 'pivot table', 'pivottable1', 'it'];
const ALL_THREE = PIECES.map((flag) => ({ flag }));
const NOT_DONE = { flag: 'sq.excel.done', not: true };
/** Only building verbs place a field or make the pivot: "fix filter" / "label filter" also parse as use, and must not add it. */
const BUILD = ['use', 'add', 'create', 'insert', 'filter', 'rows', 'values', 'put', 'apply', 'pivot'];
const DIM_NOUNS = ['sales region', 'sales region column'];
const MEASURE_NOUNS = ['net sales', 'net sales measure'];
const FILTER_NOUNS = ['year', 'by year', 'current year', 'by current year', 'is current year', 'by is current year', 'year 2025', 'by year 2025', 'calendar', 'active', 'by active', 'filter'];

// ---- The pivot on screen ----
function pivotDescribe(s: GameState): string {
  if (!s.flags['excel.connected']) {
    return 'PivotTable1. Built from Sales_export_v7.xlsx, which is to say from Jeff. Rows: Region A. Values: Sum of Sales Amount. Filters: none. Total: 4.7M. Sheet1 is west.';
  }
  if (!s.flags['excel.pivot']) {
    return "PivotTable1, still built on Jeff's export. The field list on the right is connected to the live model and would like to be used. Sheet1 is west.";
  }
  const rows = s.flags['excel.dim'] ? 'Sales Region' : '(none)';
  const values = s.flags['excel.measure'] ? 'Net Sales' : '(none)';
  const filters = s.flags['excel.filter'] ? 'Is Current Year = Yes' : '(none)';
  return `PivotTable1, on the live model. Rows: ${rows}. Values: ${values}. Filters: ${filters}. Grand Total: ${total(s)}. Sheet1 is west.`;
}

const CONNECT_TEXT = 'You sign in with your Pro license. The connection thinks about it, then: Connected — Sales (Certified). A field list unfolds in the pivot like a map.';
/** After the Monastery the card is the Librarian's collateral; Analyze in Excel only checks that it is still signed in. */
const CONNECT_LENT_TEXT = 'You pat your pockets. The card is at the Library, being collateral. Doesn\'t matter. Your Pro license is a library card here — and the card is still signed in. Connected — Sales (Certified). A field list unfolds in the pivot like a map.';
const LICENSE_NOUNS = ['license', 'card', 'pro license', 'license card', 'pro'];
const CONNECTION_NOUNS = ['connection', 'odc', 'analyze in excel', 'analyze excel', 'analyze', 'dialog', 'sign in', 'data connection', 'excel'];
const SIGN_IN = ['sign in', 'signin', 'login', 'log in'];
const LENT = [{ flag: 'scroll.lent' }];
const dataHint = (s: GameState): string => (s.flags['excel.connected'] ? 'Connected. Go build the pivot east of Sheet1.'
  : s.inventory.includes('license') ? 'Analyze in Excel wants a sign-in. You have a license. Sign in.'
    : s.flags['scroll.lent'] ? 'Analyze in Excel wants a sign-in. Your license is at the Library, but it never signed out. Sign in.'
      : 'Analyze in Excel wants a sign-in, and a sign-in wants your Pro license. You put it down somewhere. Go get it.');

export const EXCEL_ROOMS: Record<string, Room> = Object.fromEntries([
  room({
    id: 'excel.sheet1', name: 'Sheet1', region: 'excel',
    describe: (s) => `Sheet1. Grid paper to the horizon. Jeff at his desk. An export, a report on the second monitor, a ribbon. The PivotTable is east; the Data tab is north.${s.flags['sq.excel.done'] ? ' Jeff looks lighter.' : ''}`,
    exits: { e: 'excel.pivot', n: 'excel.data', out: () => null },
    items: ['export', 'report-monitor', 'ribbon'], npcs: ['jeff-excel'],
    scene: () => 'excel.sheet1',
    enterQuip: () => "Uh oh. You're in a spreadsheet. Cell A1 is blinking. Nobody knows why.",
    flaskHint: (s) => (!s.flags['excel.connected']
      ? 'Ask Jeff what he used. Then go north and connect Analyze in Excel.'
      : !s.flags['excel.pivot']
        ? 'East. Build a pivot on the live model.'
        : 'Fix the dimension, the measure and the filter, then show Jeff.'),
    rules: [
      // Already won: Jeff has said it once and will not say it again.
      { id: 'excel.jeff-done-give', when: { verb: 'give', noun: JEFF, flags: [{ flag: 'sq.excel.done' }] }, then: { text: JEFF_DONE_TEXT, outcome: 'snark' } },
      { id: 'excel.jeff-done-show', when: { verb: 'give', noun: PIVOT, noun2: JEFF, flags: [{ flag: 'sq.excel.done' }] }, then: { text: JEFF_DONE_TEXT, outcome: 'snark' } },
      { id: 'excel.jeff-done-talk', when: { verb: 'talk', nounMatches: TALK_JEFF, flags: [{ flag: 'sq.excel.done' }] }, then: { text: JEFF_DONE_TEXT, outcome: 'snark' } },
      // The win: all three pieces right.
      { id: 'excel.show-jeff-done', when: { verb: 'give', noun: PIVOT, noun2: JEFF, flags: [...ALL_THREE, NOT_DONE] }, then: WIN },
      { id: 'excel.show-jeff-done-bare', when: { verb: 'give', noun: JEFF, flags: [...ALL_THREE, NOT_DONE] }, then: WIN },
      { id: 'excel.show-jeff-done-talk', when: { verb: 'talk', nounMatches: TALK_JEFF, flags: [...ALL_THREE, NOT_DONE] }, then: WIN },
      // Not yet: Jeff names what still bothers him.
      { id: 'excel.show-jeff-early', when: { verb: 'give', noun: PIVOT, noun2: JEFF }, then: { text: notYet, outcome: 'fail' } },
      { id: 'excel.show-jeff-early-bare', when: { verb: 'give', noun: JEFF }, then: { text: notYet, outcome: 'fail' } },
      // One fact per ask (ask jeff / talk to jeff / ask jeff about export / ask jeff what did you use).
      { id: 'excel.ask-jeff', when: { verb: 'talk', nounMatches: TALK_JEFF }, then: { text: askJeff, set: { 'excel.jeff.asked': (v) => Math.min((Number(v) || 0) + 1, 3) }, outcome: 'success' } },
    ],
  }),
  room({
    id: 'excel.data', name: 'The Data tab', region: 'excel',
    describe: (s) => (s.flags['excel.connected']
      ? 'The Data tab. Analyze in Excel: Connected — Sales (Certified). The field list is waiting in the pivot. Sheet1 is south.'
      : 'The Data tab. A button says Analyze in Excel. A connection file (.odc) says Sign-in required. Sheet1 is south.'),
    exits: { s: 'excel.sheet1', out: () => null },
    items: ['connection'], npcs: [],
    scene: (s) => (s.flags['excel.connected'] ? 'excel.data-connected' : 'excel.data'),
    enterQuip: () => 'The Data tab. Where the good buttons are kept, away from Jeff.',
    flaskHint: dataHint,
    rules: [
      { id: 'excel.connect', when: { verb: 'use', noun: LICENSE_NOUNS, noun2: CONNECTION_NOUNS, has: ['license'] }, then: { text: CONNECT_TEXT, set: { 'excel.connected': true }, sfx: 'excel-ding' } },
      { id: 'excel.connect-say', when: { verb: 'say', noun: SIGN_IN, has: ['license'] }, then: { text: CONNECT_TEXT, set: { 'excel.connected': true }, sfx: 'excel-ding', pointsKey: 'excel.connect' } },
      // The license went to the Librarian as collateral (monastery.card sets scroll.lent): the sign-in still works.
      { id: 'excel.connect-lent', when: { verb: 'use', noun: LICENSE_NOUNS, noun2: CONNECTION_NOUNS, flags: LENT }, then: { text: CONNECT_LENT_TEXT, set: { 'excel.connected': true }, sfx: 'excel-ding', pointsKey: 'excel.connect' } },
      { id: 'excel.connect-say-lent', when: { verb: 'say', noun: SIGN_IN, flags: LENT }, then: { text: CONNECT_LENT_TEXT, set: { 'excel.connected': true }, sfx: 'excel-ding', pointsKey: 'excel.connect' } },
      { id: 'excel.connected-already', when: { verb: 'use', noun: ['analyze in excel', 'analyze', 'connection', 'odc', 'data connection', 'excel'], flags: [{ flag: 'excel.connected' }] }, then: { text: 'Already connected. Sales (Certified). The pivot is east of Sheet1.', outcome: 'fail' } },
      { id: 'excel.connect-try', when: { verb: 'use', noun: ['analyze in excel', 'analyze', 'connection', 'odc', 'data connection', 'excel'], flags: [{ flag: 'excel.connected', not: true }] }, then: { text: 'Analyze in Excel: Sign-in required. A tiny dialog. A tinier Sign in link.', outcome: 'fail' } },
      // Bare "connect" (or "connect to anything"): the same two answers.
      { id: 'excel.connect-bare-done', when: { verb: 'use', verbWord: ['connect'], flags: [{ flag: 'excel.connected' }] }, then: { text: 'Already connected. Sales (Certified). The pivot is east of Sheet1.', outcome: 'fail' } },
      { id: 'excel.connect-bare', when: { verb: 'use', verbWord: ['connect'], flags: [{ flag: 'excel.connected', not: true }] }, then: { text: 'Analyze in Excel: Sign-in required. A tiny dialog. A tinier Sign in link.', outcome: 'fail' } },
    ],
  }),
  room({
    id: 'excel.pivot', name: 'PivotTable1', region: 'excel',
    describe: pivotDescribe,
    exits: { w: 'excel.sheet1', out: () => null },
    items: ['pivot', 'field-pane'], npcs: [],
    scene: (s) => ['excel.pivot', 'excel.pivot-1', 'excel.pivot-2', 'excel.pivot-3'][pieces(s)]!,
    enterQuip: () => 'PivotTable1. Jeff named it. Jeff names everything 1.',
    flaskHint: (s) => (!s.flags['excel.connected']
      ? 'Nothing to pivot on until Analyze in Excel is connected (north of Sheet1).'
      : !s.flags['excel.pivot']
        ? 'create pivot table.'
        : `Missing: ${missing(s).join(', ') || 'nothing — go show Jeff'}.`),
    rules: [
      { id: 'excel.create-pivot-unconnected', when: { verb: 'use', noun: ['pivot', 'pivot table', 'pivottable'], flags: [{ flag: 'excel.connected', not: true }] }, then: { text: 'You could pivot the export again. That is how we got here. Connect Analyze in Excel first (Data tab, north of Sheet1).', outcome: 'fail' } },
      { id: 'excel.create-pivot', when: { verb: 'use', verbWord: BUILD, noun: ['pivot', 'pivot table', 'pivottable'], flags: [{ flag: 'excel.connected' }] }, then: { text: 'A blank pivot on the live model. Rows: (none). Values: (none). Filters: (none). It shows 4.7M anyway, out of habit. The field list waits on the right.', set: { 'excel.pivot': true }, sfx: 'excel-ding' } },
      { id: 'excel.dim', when: { verb: 'use', verbWord: BUILD, noun: DIM_NOUNS, flags: [{ flag: 'excel.pivot' }] }, then: { text: (s) => `Rows: Sales Region. Northeast appears exactly once. The pivot now says ${totalAfter(s, 'excel.dim')}.`, set: { 'excel.dim': true }, sfx: 'excel-ding' } },
      // "use region a" parses as "region" ("a" is filler), so bare "region" gets the legacy lecture too.
      { id: 'excel.dim-wrong', when: { verb: 'use', noun: ['region', 'region a', 'region b', 'geography', 'legacy', 'geography legacy'], flags: [{ flag: 'excel.pivot' }] }, then: { text: "Region A is the legacy column. Jeff's favorite. It has 14 regions and two of them are 'Northeast'.", outcome: 'fail' } },
      { id: 'excel.measure', when: { verb: 'use', verbWord: BUILD, noun: MEASURE_NOUNS, flags: [{ flag: 'excel.pivot' }] }, then: { text: (s) => `Values: Net Sales. Returns fall out of the number. The pivot now says ${totalAfter(s, 'excel.measure')}.`, set: { 'excel.measure': true }, sfx: 'excel-ding' } },
      { id: 'excel.measure-wrong', when: { verb: 'use', noun: ['sales amount', 'amount', 'returns', 'sales'], flags: [{ flag: 'excel.pivot' }] }, then: { text: 'Sales Amount includes Returns. It always did. Jeff never asked.', outcome: 'fail' } },
      { id: 'excel.filter', when: { verb: 'use', verbWord: BUILD, noun: FILTER_NOUNS, flags: [{ flag: 'excel.pivot' }] }, then: { text: (s) => `Filters: Is Current Year = Yes. Three years of ancient history leave the total. The pivot now says ${totalAfter(s, 'excel.filter')}.`, set: { 'excel.filter': true }, sfx: 'excel-ding' } },
      // Any other use-verb on a right field ("fix filter", "label filter"): answered, not placed. After the build rules.
      { id: 'excel.field-nonbuild', when: { verb: 'use', noun: [...DIM_NOUNS, ...MEASURE_NOUNS, ...FILTER_NOUNS], flags: [{ flag: 'excel.pivot' }] }, then: { text: 'That is not how a field gets into a pivot. Add it.', outcome: 'fail' } },
      { id: 'excel.not-yet-pivot', when: { verb: 'use', noun: ['sales region', 'region', 'net sales', 'sales amount', 'year', 'by year', 'current year', 'by current year', 'is current year'], flags: [{ flag: 'excel.pivot', not: true }] }, then: { text: (s) => (s.flags['excel.connected'] ? 'There is no pivot to put that in yet. create pivot table.' : "Jeff's pivot only knows Jeff's export. Connect Analyze in Excel first (Data tab, north of Sheet1)."), outcome: 'fail' } },
    ],
  }),
]);

/**
 * Lines that mean something else inside the realm. Registered right after SIDEQUEST_PHRASES: the entry triggers do not
 * apply inside their own realm, so these answer them instead of the generic snark.
 */
const NO_FILTER: Record<string, string> = {
  'excel.sheet1': 'Jeff nods approvingly. That is not a good sign.',
  'excel.data': 'From Sheet1, Jeff nods approvingly. That is not a good sign.',
  'excel.pivot': 'Jeff, from the next sheet, nods approvingly. That is not a good sign.',
};
const ANALYZE_ELSEWHERE = (from: string) => `Analyze in Excel is a button on the Data tab, ${from}. Here, it is three words you said out loud to a spreadsheet.`;
export const EXCEL_PHRASES: PhraseRule[] = [
  { id: 'excel.no-filter', region: 'excel', test: /^(say )?no filters?$/, text: (s) => NO_FILTER[s.room] ?? NO_FILTER['excel.pivot']! },
  {
    id: 'excel.already-in', region: 'excel', test: /^(show me (a|the) table|open excel)$/,
    text: (s) => `You are already in Excel. Any further in and it's VBA. The table is ${s.room === 'excel.pivot' ? 'right here: PivotTable1' : 'PivotTable1, east of Sheet1'}.`,
  },
  { id: 'excel.analyze-sheet1', room: 'excel.sheet1', test: /^analy[sz]e in excel$/, text: ANALYZE_ELSEWHERE('north of here') },
  { id: 'excel.analyze-pivot', room: 'excel.pivot', test: /^analy[sz]e in excel$/, text: ANALYZE_ELSEWHERE('west, then north') },
];
