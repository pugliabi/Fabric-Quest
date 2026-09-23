import type { GameState } from '../engine/types';
import type { FlagValue, PhraseRule, Room, Rule, RuleThen } from './types';
import { talkTo, unknownTopicPattern } from '../engine/builtins';
import { NPCS } from './npcs';
import { MALAPROPS } from './voice';

/** A second try in a row gets its own line, read off `recent` (the voice sweeps, Task F4 on): no flag moves. */
const again = (s: GameState, first: string, second: string): string => ((s.recent?.n ?? 1) >= 2 ? second : first);

const room = (r: Room): [string, Room] => [r.id, r];

// ---- Pivot arithmetic: the total depends only on how many of the three right pieces have landed. ----
const PIECES = ['excel.dim', 'excel.measure', 'excel.filter'] as const;
type Piece = (typeof PIECES)[number];
export const TOTALS = ['4.7M', '4.5M', '4.3M', '4.2M'] as const;
const GRIPES: Record<Piece, string> = {
  'excel.dim': '"Wrong region column."',
  'excel.measure': '"That measure\'s got Returns in it."',
  'excel.filter': '"You didn\'t filter the year."',
};

export const pieces = (s: GameState): number => PIECES.filter((f) => !!s.flags[f]).length;
export const total = (s: GameState): string => TOTALS[pieces(s)]!;
/** The total as it will read once `flag` is set (rule text is rendered before the rule's `set` applies). */
const totalAfter = (s: GameState, flag: Piece): string => TOTALS[PIECES.filter((f) => f === flag || !!s.flags[f]).length]!;

// ---- The story: six stages, one function (spec1 §2.1). The flask hint, `goal` and Jeff all read it. ----
export type ExcelStage = 0 | 1 | 2 | 3 | 4 | 5;
/**
 * Where Jeff's quest is. Stage 0 ends when you talk to Jeff — or when you connect without him: a player who skips the
 * exposition and signs in is at stage 2, not still being sent back to hear it.
 */
export function excelStage(s: GameState): ExcelStage {
  if (s.flags['sq.excel.done']) return 5;
  if (!s.flags['excel.jeff.asked'] && !s.flags['excel.connected']) return 0;
  if (!s.flags['excel.connected']) return 1;
  if (!s.flags['excel.pivot']) return 2;
  if (pieces(s) < 3) return 3;
  return 4;
}

const CMD: Record<Piece, string> = { 'excel.dim': '`add sales region`', 'excel.measure': '`add net sales`', 'excel.filter': '`filter by year`' };
const NEED: Record<Piece, string> = { 'excel.dim': 'Sales Region in rows', 'excel.measure': 'Net Sales in values', 'excel.filter': 'the year filter' };
const missingCmds = (s: GameState): string => PIECES.filter((f) => !s.flags[f]).map((f) => CMD[f]).join(' / ');
const missingNeeds = (s: GameState): string => PIECES.filter((f) => !s.flags[f]).map((f) => NEED[f]).join(' / ');

/** The way from here to each sheet, so the stage line never says "go east" to someone already standing there. */
type Sheet = 'sheet1' | 'data' | 'pivot';
const WAY: Record<string, Record<Sheet, string | null>> = {
  'excel.sheet1': { sheet1: null, data: 'north', pivot: 'east' },
  'excel.data': { sheet1: 'south', data: null, pivot: 'south, then east' },
  'excel.pivot': { sheet1: 'west', data: 'west, then north', pivot: null },
};
const way = (s: GameState, to: Sheet): string | null => (WAY[s.room] ?? WAY['excel.sheet1']!)[to];
const cap = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1);

/**
 * The next-step line, one per stage. Same words from the flask, from `goal`, and (in character) from Jeff; only the
 * directions bend to the room you are in.
 */
export function stageLine(s: GameState): string {
  const stage = excelStage(s);
  const toData = way(s, 'data');
  const toPivot = way(s, 'pivot');
  const toJeff = way(s, 'sheet1');
  switch (stage) {
    case 0: return toJeff ? `Talk to Jeff first. He's on Sheet1, ${toJeff}. \`talk to jeff\`.` : 'Talk to Jeff first. `talk to jeff`.';
    case 1: return toData ? `Go ${toData} to the Data tab and \`analyze in excel\`, then \`sign in\`.` : "You're on the Data tab. `analyze in excel`, then `sign in`.";
    case 2: return toPivot ? `Go ${toPivot} to the PivotTable and \`create pivot table\`.` : "You're on the PivotTable. `create pivot table`.";
    case 3: return `${toPivot ? `Go ${toPivot} to the PivotTable. ` : ''}Add what's missing: ${missingCmds(s)}.`;
    case 4: return toJeff ? `Back to Sheet1 (${toJeff}) and \`show jeff\`.` : 'Show Jeff. `show jeff`.';
    default: return 'You fixed Jeff\'s export. That was the whole quest. `exit`.';
  }
}

// ---- Jeff: a man who has already decided, who trusts the export, and who never goes north. ----
export const WIN_TEXT = 'Jeff looks at 4.2M. Jeff looks at his export. Jeff says the words no one at Finance has ever said: "Okay. The report was right."';
export const JEFF_DONE_TEXT = '"Okay. The report was right. Don\'t tell anyone I said that."';
const WIN: RuleThen = { text: WIN_TEXT, bonus: 20, pointsKey: 'sq.excel', set: { 'sq.excel.done': true }, sfx: 'bonus', returnTo: true };
const hint = (s: GameState): string => PIECES.filter((f) => !s.flags[f]).map((f) => GRIPES[f]).join(' ');
/** Showing Jeff too early: what he sees at this stage, then the stage line (the three gripes only once there is a pivot to gripe about). */
const notYet = (s: GameState): string => {
  const stage = excelStage(s);
  if (stage === 4 || stage === 5) return WIN_TEXT;
  if (stage <= 1) return `Jeff squints. "It still says 4.7M. It's my export with a pivot on top of it; of course it does." ${stageLine(s)}`;
  if (stage === 2) return `Jeff squints. "It still says 4.7M. You connected something. You didn't build anything." ${stageLine(s)}`;
  return `Jeff squints. "It still says ${total(s)}." ${hint(s)}`;
};

/** How many times Jeff has been asked at the current stage (0 = not yet at this stage). */
const jeffTalks = (s: GameState): number => (s.flags['excel.jeff.stage'] === excelStage(s) ? Number(s.flags['excel.jeff.n']) || 0 : 0);
/** Variant index for the n-th repeat: the first line once, then the variants in a loop (never the same line twice running). */
const variantAt = (n: number, count: number): number => (n === 0 || count < 2 ? 0 : 1 + ((n - 1) % (count - 1)));

/**
 * Stage 3 is composed in jeffSays() (it needs the total and the missing pieces); every other stage is a first line plus
 * variants. Stage 0 has one line only: any talk moves you to stage 1, so its "still north" variants live in stage 1's
 * pool, where a second ask actually lands. Stage 4's lines are never spoken on a talk (talking to Jeff at stage 4 IS the
 * win): Jeff calls the first one across the room the moment the third field lands (the message box), and the other two
 * are what he is saying in the Sheet1 and PivotTable1 room texts while you walk back.
 */
const JEFF_LINES: Record<Exclude<ExcelStage, 3>, [first: string, ...variants: string[]]> = {
  0: [
    "\"It's 4.7. The report says 4.2. I exported the visual, I summed it, it's 4.7. Look, I trust my export. IT said something about 'Analyze in Excel' — that it connects to the actual model. It's on the Data tab. North. I never go north.\"",
  ],
  1: [
    '"The Data tab. North. It\'s a ribbon, not a country."',
    '"North. Up. The tab with the buttons on it. I don\'t click them; that\'s what you\'re for."',
    '"You have walked past the Data tab twice now. It is the one that says Data."',
    '"Analyze in Excel. Data tab. North. I said north. I meant it in the geographic sense."',
    '"Still 4.7. Still north. You keep asking like the answer is going to be south."',
  ],
  2: [
    '"Connected? Then make the pivot. The PivotTable sheet\'s east. Put the fields in. I\'d do it but I have a call."',
    '"East. The pivot. I named it PivotTable1 so you\'d find it. I\'m on a call. It\'s the same call."',
    '"Pivot. East. I have been on this call since Q2."',
  ],
  4: [
    '"Is it done? Show me. `show jeff`. I can\'t look. I\'m looking."',
    '"Show me. I won\'t look. I\'m looking. `show jeff`."',
    '"Just show me the pivot. I have my eyes closed. They\'re open. Show me."',
  ],
  5: [JEFF_DONE_TEXT, '"I said the report was right. Once. Under my breath. That\'s the quota."', '"We don\'t talk about the export any more. The export is in a better place. It\'s in Recycle Bin."'],
};
/** Stage 4, delivered without a talk: the box when the third field lands, and the two room texts on the way back. */
const JEFF_CALLS = `Jeff, from Sheet1, not looking: ${JEFF_LINES[4][0]}`;
const JEFF_WAITING_SHEET1 = `Jeff, not looking: ${JEFF_LINES[4][1]}`;
const JEFF_WAITING_PIVOT = `From Sheet1, Jeff: ${JEFF_LINES[4][2]}`;
const atStage4 = (s: GameState): boolean => excelStage(s) === 4;

function jeffSays(s: GameState): string {
  const stage = excelStage(s);
  const n = jeffTalks(s);
  if (stage === 3) {
    const variants = [
      `"So far it says ${total(s)}. It needs ${missingNeeds(s)}."`,
      `"${total(s)}. Still not 4.2. It's missing ${missingNeeds(s)}. I'd help, but I'm on the call."`,
      `"You know what it needs. ${missingNeeds(s)}. I'm reading it off your screen."`,
    ];
    return variants[variantAt(n, variants.length)]!;
  }
  const lines = JEFF_LINES[stage];
  return lines[variantAt(n, lines.length)]!;
}

/** Every talk to Jeff: count talks at the stage, remember the stage, and (stage 0) unlock the quest's first step. */
const JEFF_TALK_SET = {
  'excel.jeff.n': (v: FlagValue | undefined, prev: GameState) => (prev.flags['excel.jeff.stage'] === excelStage(prev) ? (Number(v) || 0) + 1 : 1),
  'excel.jeff.stage': (_v: FlagValue | undefined, prev: GameState) => excelStage(prev),
  'excel.jeff.asked': true,
};

const JEFF = ['jeff', 'finance', 'jeff from finance'];
/** "ask jeff what did you use" parses as talk "jeff what did you use": anything that starts with Jeff is for Jeff. */
const TALK_JEFF = /^(jeff|finance)\b/;
/** An `about` topic that is none of the things Jeff knows here (npcs.ts): those get his brush-off, everything he knows gets the stage line. */
const UNKNOWN_TO_JEFF = unknownTopicPattern(NPCS['jeff-excel']!.knows!);
const PIVOT = ['pivot', 'pivottable', 'pivot table', 'pivottable1', 'it'];
const ALL_THREE = PIECES.map((flag) => ({ flag }));
const NOT_DONE = { flag: 'sq.excel.done', not: true };
/** Only building verbs place a field or make the pivot: "fix filter" / "label filter" also parse as use, and must not add it. */
const BUILD = ['use', 'add', 'create', 'insert', 'filter', 'rows', 'values', 'put', 'apply', 'pivot'];
const DIM_NOUNS = ['sales region', 'sales region column', 'sales region in rows', 'sales region to rows'];
const MEASURE_NOUNS = ['net sales', 'net sales measure', 'net sales in values', 'net sales to values'];
const FILTER_NOUNS = ['year', 'by year', 'current year', 'by current year', 'is current year', 'by is current year', 'year 2025', 'by year 2025', 'calendar', 'active', 'by active', 'filter',
  'to 2025', '2025', 'year filter', 'year in filters', 'year to filters', 'year filters'];
const RIGHT_FIELDS = [...DIM_NOUNS, ...MEASURE_NOUNS, ...FILTER_NOUNS];
const DIM_WRONG_NOUNS = ['region', 'region a', 'region b', 'geography', 'legacy', 'geography legacy'];
const MEASURE_WRONG_NOUNS = ['sales amount', 'amount', 'returns', 'sales'];
/** The rest of the field list: they go in, and nothing happens, which is the joke. */
const OTHER_FIELD_NOUNS = ['gross sales', 'sales ytd', 'ytd', 'measure 2', 'measure 2 copy', 'product', 'salesperson', 'date', 'quarter'];
const WRONG_FIELDS = [...DIM_WRONG_NOUNS, ...MEASURE_WRONG_NOUNS, ...OTHER_FIELD_NOUNS];
/** "put the fields in" / "add fields" / "put them in": Jeff's own words, so they get an answer that names the fields. */
const FIELDS_NOUNS = ['fields', 'field', 'field list', 'all fields', 'all the fields', 'them', 'those'];
const PIVOT_NOUNS = ['pivot', 'pivot table', 'pivottable', 'pivottable1'];

/** Placing a field: the three build rules and the `drag` phrase share these, so every phrasing lands the same way. */
const PLACE: Record<Piece, RuleThen> = {
  'excel.dim': { text: (s) => `Rows: Sales Region. Northeast appears exactly once. The pivot now says ${totalAfter(s, 'excel.dim')}.`, set: { 'excel.dim': true }, sfx: 'excel-ding', box: (s) => (atStage4(s) ? JEFF_CALLS : '') },
  'excel.measure': { text: (s) => `Values: Net Sales. Returns fall out of the number. The pivot now says ${totalAfter(s, 'excel.measure')}.`, set: { 'excel.measure': true }, sfx: 'excel-ding', box: (s) => (atStage4(s) ? JEFF_CALLS : '') },
  'excel.filter': { text: (s) => `Filters: Is Current Year = Yes. Three years of ancient history leave the total. The pivot now says ${totalAfter(s, 'excel.filter')}.`, set: { 'excel.filter': true }, sfx: 'excel-ding', box: (s) => (atStage4(s) ? JEFF_CALLS : '') },
};
/** A field that is already in (Task F9): answered by the repeat, so nothing is re-set and Jeff's stage-4 call is not re-sent. */
const PLACED_AGAIN: Record<Piece, RuleThen> = {
  'excel.dim': { text: 'Sales Region is already in Rows. Northeast is in there exactly once. Twice is how Jeff got Region A.', outcome: 'fail' },
  'excel.measure': { text: 'Net Sales is already in Values. Two of it would put Returns right back in, by another name.', outcome: 'fail' },
  'excel.filter': { text: "The year filter is already on. Filtering it twice doesn't make it any more this year.", outcome: 'fail' },
};
const DIM_WRONG: RuleThen = { text: "Region A is the legacy column. Jeff's favorite. It has 14 regions and two of them are 'Northeast'.", outcome: 'fail' };
const MEASURE_WRONG: RuleThen = { text: 'Sales Amount includes Returns. It always did. Jeff never asked.', outcome: 'fail' };
const OTHER_FIELD: RuleThen = { text: 'In it goes. The total does not move. That is not one of the three.', outcome: 'fail' };
const notYetPivotText = (s: GameState): string => (s.flags['excel.connected'] ? 'There is no pivot to put that in yet. create pivot table.' : "Jeff's pivot only knows Jeff's export. Connect Analyze in Excel first (Data tab, north of Sheet1).");
const NOT_YET_PIVOT: RuleThen = { text: notYetPivotText, outcome: 'fail' };
const CREATE_PIVOT: RuleThen = { text: 'A blank pivot on the live model. Rows: (none). Values: (none). Filters: (none). It shows 4.7M anyway, out of habit. The field list waits on the right.', set: { 'excel.pivot': true }, sfx: 'excel-ding' };
const CREATE_UNCONNECTED: RuleThen = { text: 'You could pivot the export again. That is how we got here. Connect Analyze in Excel first (Data tab, north of Sheet1).', outcome: 'fail' };
const PIVOT_ALREADY: RuleThen = { text: (s) => `You made it already. It's the one that says PivotTable1. ${stageLine(s)}`, outcome: 'fail' };
/** "put the fields in": which ones? The stage line names them. */
const WHICH_FIELDS: RuleThen = { text: (s) => (!s.flags['excel.pivot'] ? notYetPivotText(s) : pieces(s) < 3 ? `Which ones? ${stageLine(s)}` : `They're in. All three. ${stageLine(s)}`), outcome: 'fail' };
/** A right or wrong field named in a `drag` line, and what placing it does (the same ids as the build rules). */
const place = (s: GameState, piece: Piece): { id: string; then: RuleThen } => (s.flags[piece] ? { id: `${piece}-again`, then: PLACED_AGAIN[piece] } : { id: piece, then: PLACE[piece] });
const fieldThen = (s: GameState, field: string): { id: string; then: RuleThen } => (
  DIM_NOUNS.includes(field) ? place(s, 'excel.dim')
    : MEASURE_NOUNS.includes(field) ? place(s, 'excel.measure')
      : FILTER_NOUNS.includes(field) ? place(s, 'excel.filter')
        : DIM_WRONG_NOUNS.includes(field) ? { id: 'excel.dim-wrong', then: DIM_WRONG }
          : MEASURE_WRONG_NOUNS.includes(field) ? { id: 'excel.measure-wrong', then: MEASURE_WRONG }
            : { id: 'excel.other-field', then: OTHER_FIELD });

// ---- The pivot on screen ----
function pivotDescribe(s: GameState): string {
  if (!s.flags['excel.connected']) {
    return 'PivotTable1. Built from Sales_export (3).csv, which is to say from Jeff. Rows: Region A. Values: Sum of Sales Amount. Filters: none. Total: 4.7M. Sheet1 is west.';
  }
  if (!s.flags['excel.pivot']) {
    return "PivotTable1, still built on Jeff's export. The field list on the right is connected to the live model and would like to be used. Sheet1 is west.";
  }
  const rows = s.flags['excel.dim'] ? 'Sales Region' : '(none)';
  const values = s.flags['excel.measure'] ? 'Net Sales' : '(none)';
  const filters = s.flags['excel.filter'] ? 'Is Current Year = Yes' : '(none)';
  return `PivotTable1, on the live model. Rows: ${rows}. Values: ${values}. Filters: ${filters}. Grand Total: ${total(s)}. Sheet1 is west.${atStage4(s) ? ` ${JEFF_WAITING_PIVOT}` : ''}`;
}

/** The field list (spec1 §2.1): the wrong ones are in it on purpose. Shared by the `field list` item and the bare `fields` phrase. */
export const fieldListText = (s: GameState): string => (s.flags['excel.connected']
  ? 'PivotTable Fields — Sales (Certified).\n'
    + '  Dimensions: Sales Region, Region A (legacy), Region B (legacy), Product, Salesperson, Date\n'
    + '  Measures: Net Sales, Sales Amount, Returns, Gross Sales, Sales YTD, Measure 2 (copy)\n'
    + '  Filters: Is Current Year, Year, Quarter\n'
    + 'The wrong ones are in the list on purpose. Nobody removes a field.'
  : "PivotTable Fields — Sales_export (3).csv: Region A, Sales Amount, and a column called Column1. This is Jeff's export. Connect Analyze in Excel (north of Sheet1) and the real model's fields appear.");
/** The report on Jeff's second monitor: the `report` item, and `look at second monitor` (which the monitors would otherwise catch). */
export const REPORT_MONITOR_TEXT = 'The report. Net Sales, Northeast, this year: $4.2M. Certified. It has a little badge and everything.';

/** `compare` / `look at difference`: the export, the pivot and the report side by side, and what is still inflating the pivot. */
const INFLATING: Record<Piece, string> = {
  'excel.dim': 'Region A counts Northeast twice',
  'excel.measure': 'Sales Amount still has Returns in it',
  'excel.filter': 'three years of history are still in there',
};
function compareText(s: GameState): string {
  if (!s.flags['excel.pivot']) {
    return s.flags['excel.connected']
      ? 'Export: 4,712,331. Report: 4.2M. Pivot: 4.7M, because it is still the export wearing a hat. You are connected now. `create pivot table` and the difference explains itself.'
      : 'Export: 4,712,331. Report: 4.2M. Pivot: 4.7M, because it is the export wearing a hat. Connect the model and build a real one; the difference explains itself.';
  }
  const left = PIECES.filter((f) => !s.flags[f]).map((f) => INFLATING[f]);
  if (!left.length) {
    return s.flags['sq.excel.done']
      ? 'The pivot says 4.2M. So does the report. Jeff\'s export says 4.7M because it was wrong. He knows. He said so, once, and he is not saying it again.'
      : 'The pivot says 4.2M. So does the report. Jeff\'s export says 4.7M because it was wrong. Go show him.';
  }
  return `Export: 4,712,331. Pivot: ${total(s)}. Report: 4.2M. Still inflating it: ${left.join('; ')}.`;
}

const CONNECT_TEXT = 'You sign in with your Pro license. The connection thinks about it, then: Connected — Sales (Certified). A field list unfolds in the pivot like a map.';
/** After the Monastery the card is the Librarian's collateral; Analyze in Excel only checks that it is still signed in. */
const CONNECT_LENT_TEXT = 'You pat your pockets. The card is at the Library, being collateral. Doesn\'t matter. Your Pro license is a library card here — and the card is still signed in. Connected — Sales (Certified). A field list unfolds in the pivot like a map.';
const ALREADY_CONNECTED = (s: GameState): string => `Already connected. Sales (Certified). The pivot is ${way(s, 'pivot') ?? 'right here'}.`;
const SIGN_IN_REQUIRED = 'Analyze in Excel: Sign-in required. A tiny dialog. A tinier Sign in link.';
const LICENSE_NOUNS = ['license', 'card', 'pro license', 'license card', 'pro'];
const CONNECTION_NOUNS = ['connection', 'odc', 'analyze in excel', 'analyze excel', 'analyze', 'dialog', 'sign in', 'data connection', 'excel', 'in excel'];
const ANALYZE_NOUNS = ['analyze in excel', 'analyze', 'connection', 'odc', 'data connection', 'excel', 'in excel'];
const SIGN_IN = ['sign in', 'signin', 'login', 'log in'];
const LENT = [{ flag: 'scroll.lent' }];
const NOT_CONNECTED = [{ flag: 'excel.connected', not: true }];
const CONNECTED = [{ flag: 'excel.connected' }];
const CONNECT: RuleThen = { text: CONNECT_TEXT, set: { 'excel.connected': true }, sfx: 'excel-ding', pointsKey: 'excel.connect' };
const CONNECT_LENT: RuleThen = { text: CONNECT_LENT_TEXT, set: { 'excel.connected': true }, sfx: 'excel-ding', pointsKey: 'excel.connect' };
const CONNECTED_ALREADY: RuleThen = { text: ALREADY_CONNECTED, outcome: 'fail' };
/** The Data tab's flask hint is the stage line plus, while the sign-in is still ahead, where your license actually is (final review I1). */
const dataHint = (s: GameState): string => (excelStage(s) !== 1 ? stageLine(s)
  : `${stageLine(s)} ${s.inventory.includes('license') ? 'You have a license. Sign in.'
    : s.flags['scroll.lent'] ? 'Your license is at the Library, but it never signed out. Sign in.'
      : 'A sign-in wants your Pro license. You put it down somewhere. Go get it.'}`);

/** Right idea, wrong sheet: the pivot verbs typed anywhere but on PivotTable1; the sign-in typed anywhere but on the Data tab. */
const WRONG_SHEET = (s: GameState): string => `Right idea, wrong sheet. PivotTable1 is ${way(s, 'pivot')}. The fields go in there, not here.`;
const WRONG_SHEET_LOOK = (s: GameState): string => `It's on PivotTable1, ${way(s, 'pivot')}. Everything pivot-shaped is.`;
const WRONG_TAB = (s: GameState): string => (s.flags['excel.connected'] ? 'Already signed in. Sales (Certified). Once was plenty.' : `Right idea, wrong tab. The sign-in dialog is on the Data tab, ${way(s, 'data')}. Nothing here takes a license.`);
const wrongSheet = (sheet: string): Rule[] => [
  { id: `excel.pivot-from-${sheet}`, when: { verb: 'use', noun: [...PIVOT_NOUNS, ...RIGHT_FIELDS, ...WRONG_FIELDS, ...FIELDS_NOUNS] }, then: { text: WRONG_SHEET, outcome: 'fail' } },
  { id: `excel.look-pivot-from-${sheet}`, when: { verb: 'look', noun: [...PIVOT_NOUNS, 'fields', 'field', 'field list', 'field pane', 'pane', 'pivottable fields'] }, then: { text: WRONG_SHEET_LOOK, outcome: 'fail' } },
];
const signInElsewhere = (sheet: string): Rule[] => [
  { id: `excel.sign-in-from-${sheet}`, when: { verb: 'say', noun: SIGN_IN }, then: { text: WRONG_TAB, outcome: 'fail' } },
  { id: `excel.license-from-${sheet}`, when: { verb: 'use', noun: LICENSE_NOUNS }, then: { text: WRONG_TAB, outcome: 'fail' } },
];
/** Walking to a sheet by naming it (Excel's tabs work from any sheet). */
const GO_DATA: RuleThen = { text: 'You click the Data tab. Jeff watches you go north like you are leaving the country.', moveTo: 'excel.data', sfx: 'move' };
const GO_DATA_FROM_PIVOT: RuleThen = { text: 'You click back through Sheet1 to the Data tab. Jeff watches you go north like you are leaving the country.', moveTo: 'excel.data', sfx: 'move' };
const GO_PIVOT: RuleThen = { text: 'You click over to PivotTable1.', moveTo: 'excel.pivot', sfx: 'move' };
const GO_PIVOT_FROM_DATA: RuleThen = { text: 'You click through Sheet1 to PivotTable1. Jeff does not look up.', moveTo: 'excel.pivot', sfx: 'move' };
const GO_SHEET1: RuleThen = { text: 'You click back to Sheet1. Jeff is exactly where you left him.', moveTo: 'excel.sheet1', sfx: 'move' };
/** Naming the sheet you are already on. */
const ON_PIVOT = (s: GameState): string => (!s.flags['excel.connected'] ? "You're on it. It's Jeff's, built on the export. Connect Analyze in Excel first (Data tab, west, then north)."
  : !s.flags['excel.pivot'] ? "You're on it. It's blank. `create pivot table`." : `You're on it. ${stageLine(s)}`);
const ON_DATA = (s: GameState): string => (s.flags['excel.connected'] ? `You're on it. ${ALREADY_CONNECTED(s)}` : "You're on it. `analyze in excel`, then `sign in`.");
const ON_SHEET1 = (s: GameState): string => `You're on Sheet1. So is Jeff. ${stageLine(s)}`;
const dataDescribe = (s: GameState): string => (s.flags['excel.connected']
  ? 'The Data tab. Analyze in Excel: Connected — Sales (Certified). The field list is waiting in the pivot. Sheet1 is south.'
  : 'The Data tab. A button says Analyze in Excel. A connection file (.odc) says Sign-in required. Sheet1 is south.');

export const EXCEL_ROOMS: Record<string, Room> = Object.fromEntries([
  room({
    id: 'excel.sheet1', name: 'Sheet1', region: 'excel',
    describe: (s) => `Sheet1. Grid paper to the horizon. Jeff at his desk, not crying, exactly, but close. His export is open: a column of numbers and a SUM at the bottom that says 4,712,331. On the second monitor, the report says 4.2M. The ribbon has a Data tab, north. There's a PivotTable sheet, east.${s.flags['sq.excel.done'] ? ' Jeff looks lighter.' : atStage4(s) ? ` ${JEFF_WAITING_SHEET1}` : ''}`,
    exits: { e: 'excel.pivot', n: 'excel.data', out: () => null },
    // `monitor` sits before `report-monitor` so `look at monitor` resolves to the monitors, not to the report on the second one.
    items: ['export', 'monitor', 'report-monitor', 'ribbon', 'desk-jeff', 'tissues'], npcs: ['jeff-excel'],
    scene: () => 'excel.sheet1',
    enterQuip: () => "Uh oh. You're in a spreadsheet. Cell A1 is blinking. Nobody knows why.",
    flaskHint: stageLine,
    rules: [
      // Already won: Jeff has said it once and will not say it again.
      { id: 'excel.jeff-done-give', when: { verb: 'give', noun: JEFF, flags: [{ flag: 'sq.excel.done' }] }, then: { text: JEFF_DONE_TEXT, outcome: 'snark' } },
      { id: 'excel.jeff-done-show', when: { verb: 'give', noun: PIVOT, noun2: JEFF, flags: [{ flag: 'sq.excel.done' }] }, then: { text: JEFF_DONE_TEXT, outcome: 'snark' } },
      // `ask jeff about <something he doesn't know>`: his brush-off. A known topic (the pivot, the export…) falls through to the talk rules below.
      { id: 'excel.ask-jeff-unknown', when: { verb: 'talk', nounMatches: TALK_JEFF, noun2Matches: UNKNOWN_TO_JEFF }, then: { text: (s, world, cmd) => talkTo(s, world, world.npcs['jeff-excel']!, cmd?.noun2), outcome: 'snark' } },
      // The win: all three pieces right.
      { id: 'excel.show-jeff-done', when: { verb: 'give', noun: PIVOT, noun2: JEFF, flags: [...ALL_THREE, NOT_DONE] }, then: WIN },
      { id: 'excel.show-jeff-done-bare', when: { verb: 'give', noun: JEFF, flags: [...ALL_THREE, NOT_DONE] }, then: WIN },
      { id: 'excel.show-jeff-done-talk', when: { verb: 'talk', nounMatches: TALK_JEFF, flags: [...ALL_THREE, NOT_DONE] }, then: WIN },
      // Not yet: Jeff names what still bothers him.
      { id: 'excel.show-jeff-early', when: { verb: 'give', noun: PIVOT, noun2: JEFF }, then: { text: notYet, outcome: 'fail' } },
      { id: 'excel.show-jeff-early-bare', when: { verb: 'give', noun: JEFF }, then: { text: notYet, outcome: 'fail' } },
      // The voice sweep (Task F9): the report and the export are topics Jeff has opinions on, after the win rules.
      { id: 'excel.jeff-report', when: { verb: 'talk', nounMatches: TALK_JEFF, noun2: ['report', 'the report', 'badge'], flags: [NOT_DONE] }, then: { text: (s) => again(s, "'The report,' says Jeff. 'It has a badge. I have a spreadsheet. A spreadsheet is a badge you make yourself.'", "'Badges,' says Jeff. 'Anyone can get a badge. I made this total with my own two hands and one F2.'"), outcome: 'success' } },
      // His derailment: once he has told you about the export, asking about it starts a fight he has with it, not you.
      { id: 'excel.jeff-export', when: { verb: 'talk', nounMatches: TALK_JEFF, noun2: ['export', 'the export', 'csv', 'his export', 'sales export'], flags: [{ flag: 'excel.jeff.asked' }] }, then: { text: (s) => again(s, "'My export,' says Jeff, and turns to it. 'You said 4.7.' It says 4.7. 'Then say it to the report.' It doesn't. He turns back to you, betrayed by a CSV.", "Jeff and the export aren't speaking. The export has 1,048,576 rows on its side, so it thinks it's winning."), outcome: 'snark' } },
      { id: 'excel.use-tissues', when: { verb: 'use', noun: ['tissue box', 'tissues', 'tissue', 'kleenex'] }, then: { text: (s) => (s.flags['sq.excel.done'] ? "You offer Jeff a tissue. He doesn't need one now. He takes one anyway, for the export." : 'You hand Jeff a tissue. He blows his nose into a printout of the total instead. It rounds up.'), outcome: 'snark' } },
      // Talking to Jeff at any stage (done included): the stage line in character, a variant on repeats.
      { id: 'excel.ask-jeff', when: { verb: 'talk', nounMatches: TALK_JEFF }, then: { text: jeffSays, set: JEFF_TALK_SET, outcome: 'success' } },
      // The second monitor is the report; the suffix match would hand `look at second monitor` to the monitors.
      { id: 'excel.look-second-monitor', when: { verb: 'look', noun: ['second monitor', 'right monitor', 'other monitor'] }, then: { text: REPORT_MONITOR_TEXT, outcome: 'success' } },
      // The Data tab's verbs typed here walk you north (or say you are already connected); the pivot's verbs typed here point you east.
      { id: 'excel.analyze-from-sheet1-done', when: { verb: 'use', noun: ANALYZE_NOUNS, flags: CONNECTED }, then: CONNECTED_ALREADY },
      { id: 'excel.analyze-bare-from-sheet1-done', when: { verb: 'use', verbWord: ['analyze', 'connect'], flags: CONNECTED }, then: CONNECTED_ALREADY },
      { id: 'excel.analyze-from-sheet1', when: { verb: 'use', noun: ANALYZE_NOUNS }, then: GO_DATA },
      { id: 'excel.analyze-bare-from-sheet1', when: { verb: 'use', verbWord: ['analyze', 'connect'] }, then: GO_DATA },
      ...wrongSheet('sheet1'),
      ...signInElsewhere('sheet1'),
    ],
  }),
  room({
    id: 'excel.data', name: 'The Data tab', region: 'excel',
    describe: dataDescribe,
    exits: { s: 'excel.sheet1', out: () => null },
    items: ['connection', 'ribbon'], npcs: [],
    scene: (s) => (s.flags['excel.connected'] ? 'excel.data-connected' : 'excel.data'),
    enterQuip: () => 'The Data tab. Where the good buttons are kept, away from Jeff.',
    flaskHint: dataHint,
    rules: [
      { id: 'excel.connect', when: { verb: 'use', noun: LICENSE_NOUNS, noun2: CONNECTION_NOUNS, has: ['license'], flags: NOT_CONNECTED }, then: CONNECT },
      { id: 'excel.connect-say', when: { verb: 'say', noun: SIGN_IN, has: ['license'], flags: NOT_CONNECTED }, then: CONNECT },
      // The license went to the Librarian as collateral (monastery.card sets scroll.lent): the sign-in still works.
      { id: 'excel.connect-lent', when: { verb: 'use', noun: LICENSE_NOUNS, noun2: CONNECTION_NOUNS, flags: [...LENT, ...NOT_CONNECTED] }, then: CONNECT_LENT },
      { id: 'excel.connect-say-lent', when: { verb: 'say', noun: SIGN_IN, flags: [...LENT, ...NOT_CONNECTED] }, then: CONNECT_LENT },
      // `use license` on its own: the license is the sign-in.
      { id: 'excel.connect-use-license', when: { verb: 'use', noun: LICENSE_NOUNS, has: ['license'], flags: NOT_CONNECTED }, then: CONNECT },
      { id: 'excel.connect-use-license-lent', when: { verb: 'use', noun: LICENSE_NOUNS, flags: [...LENT, ...NOT_CONNECTED] }, then: CONNECT_LENT },
      { id: 'excel.connected-already', when: { verb: 'use', noun: [...ANALYZE_NOUNS, ...LICENSE_NOUNS], flags: CONNECTED }, then: CONNECTED_ALREADY },
      { id: 'excel.connected-already-say', when: { verb: 'say', noun: SIGN_IN, flags: CONNECTED }, then: CONNECTED_ALREADY },
      { id: 'excel.connect-try', when: { verb: 'use', noun: ANALYZE_NOUNS, flags: NOT_CONNECTED }, then: { text: SIGN_IN_REQUIRED, outcome: 'fail' } },
      // Bare "connect" (or "connect to anything"): the same two answers.
      { id: 'excel.connect-bare-done', when: { verb: 'use', verbWord: ['connect'], flags: CONNECTED }, then: CONNECTED_ALREADY },
      { id: 'excel.connect-bare', when: { verb: 'use', verbWord: ['connect'], flags: NOT_CONNECTED }, then: { text: SIGN_IN_REQUIRED, outcome: 'fail' } },
      { id: 'excel.use-ribbon', when: { verb: 'use', noun: ['ribbon', 'toolbar', 'menu', 'tabs'] }, then: { text: 'You click the Home tab. Then Insert. Then Data. The ribbon has seen people wander before.', outcome: 'fail' } },
      { id: 'excel.look-data-tab', when: { verb: 'look', noun: ['data tab', 'data', 'tab', 'ribbon', 'button', 'analyze in excel button'] }, then: { text: dataDescribe, outcome: 'success' } },
      ...wrongSheet('data'),
    ],
  }),
  room({
    id: 'excel.pivot', name: 'PivotTable1', region: 'excel',
    describe: pivotDescribe,
    exits: { w: 'excel.sheet1', out: () => null },
    items: ['pivot', 'field-pane'], npcs: [],
    scene: (s) => ['excel.pivot', 'excel.pivot-1', 'excel.pivot-2', 'excel.pivot-3'][pieces(s)]!,
    enterQuip: () => 'PivotTable1. Jeff named it. Jeff names everything 1.',
    flaskHint: stageLine,
    rules: [
      { id: 'excel.create-pivot-unconnected', when: { verb: 'use', noun: PIVOT_NOUNS, flags: NOT_CONNECTED }, then: CREATE_UNCONNECTED },
      { id: 'excel.pivot-already', when: { verb: 'use', verbWord: BUILD, noun: PIVOT_NOUNS, flags: [{ flag: 'excel.pivot' }] }, then: PIVOT_ALREADY },
      { id: 'excel.create-pivot', when: { verb: 'use', verbWord: BUILD, noun: PIVOT_NOUNS, flags: CONNECTED }, then: CREATE_PIVOT },
      { id: 'excel.which-fields', when: { verb: 'use', noun: FIELDS_NOUNS }, then: WHICH_FIELDS },
      // Already in (Task F9): the repeat, ahead of the build rules, so re-adding a field neither re-sets it nor re-sends Jeff's call.
      { id: 'excel.dim-again', when: { verb: 'use', verbWord: BUILD, noun: DIM_NOUNS, flags: [{ flag: 'excel.dim' }] }, then: PLACED_AGAIN['excel.dim'] },
      { id: 'excel.measure-again', when: { verb: 'use', verbWord: BUILD, noun: MEASURE_NOUNS, flags: [{ flag: 'excel.measure' }] }, then: PLACED_AGAIN['excel.measure'] },
      { id: 'excel.filter-again', when: { verb: 'use', verbWord: BUILD, noun: FILTER_NOUNS, flags: [{ flag: 'excel.filter' }] }, then: PLACED_AGAIN['excel.filter'] },
      { id: 'excel.dim', when: { verb: 'use', verbWord: BUILD, noun: DIM_NOUNS, flags: [{ flag: 'excel.pivot' }] }, then: PLACE['excel.dim'] },
      // "use region a" parses as "region" ("a" is filler), so bare "region" gets the legacy lecture too.
      { id: 'excel.dim-wrong', when: { verb: 'use', noun: DIM_WRONG_NOUNS, flags: [{ flag: 'excel.pivot' }] }, then: DIM_WRONG },
      { id: 'excel.measure', when: { verb: 'use', verbWord: BUILD, noun: MEASURE_NOUNS, flags: [{ flag: 'excel.pivot' }] }, then: PLACE['excel.measure'] },
      { id: 'excel.measure-wrong', when: { verb: 'use', noun: MEASURE_WRONG_NOUNS, flags: [{ flag: 'excel.pivot' }] }, then: MEASURE_WRONG },
      { id: 'excel.filter', when: { verb: 'use', verbWord: BUILD, noun: FILTER_NOUNS, flags: [{ flag: 'excel.pivot' }] }, then: PLACE['excel.filter'] },
      { id: 'excel.other-field', when: { verb: 'use', noun: OTHER_FIELD_NOUNS, flags: [{ flag: 'excel.pivot' }] }, then: OTHER_FIELD },
      { id: 'excel.add-measure', when: { verb: 'use', noun: ['measure', 'a measure', 'new measure', 'dax measure'] }, then: { text: `You add a measure to a pivot. You have ${MALAPROPS.daxxed} a spreadsheet. Jeff will never forgive you, and he will never notice.`, outcome: 'snark' } },
      // Any other use-verb on a right field ("fix filter", "label filter"): answered, not placed. After the build rules.
      { id: 'excel.field-nonbuild', when: { verb: 'use', noun: RIGHT_FIELDS, flags: [{ flag: 'excel.pivot' }] }, then: { text: 'That is not how a field gets into a pivot. Add it.', outcome: 'fail' } },
      { id: 'excel.not-yet-pivot', when: { verb: 'use', noun: [...RIGHT_FIELDS, ...WRONG_FIELDS], flags: [{ flag: 'excel.pivot', not: true }] }, then: NOT_YET_PIVOT },
      ...signInElsewhere('pivot'),
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
/** The sheet-movement words: `go to`, `go to the`, `click`, `click on`, `switch to`, `open`, `select`, or bare; an optional ` sheet` / ` tab` after. */
const SHEET_PREFIX = String.raw`(?:(?:go|click|switch)(?: over| back)?(?: to| on)? |open |select )?(?:the )?`;
const SHEET_SUFFIX = String.raw`(?: sheet| tab)?`;
const GO_PIVOT_TEST = new RegExp(`^${SHEET_PREFIX}(?:pivot|pivot ?table|pivottable1?)${SHEET_SUFFIX}$`);
const GO_DATA_TEST = new RegExp(`^(?:${SHEET_PREFIX}data(?: tab| sheet)?|analy[sz]e in excel|connect)$`);
const GO_SHEET1_TEST = new RegExp(`^${SHEET_PREFIX}(?:sheet ?1|jeff'?s sheet|first sheet)${SHEET_SUFFIX}$`);
const DRAG_FIELDS = [...RIGHT_FIELDS.filter((f) => !/ (in|to) /.test(f)), ...WRONG_FIELDS].sort((a, b) => b.length - a.length).join('|');
const DRAG_TEST = new RegExp(`^(drag|move|put) (${DRAG_FIELDS}) (to|into|in) (the )?(rows|values|filters?)( area)?$`);
const DRAG_FIELD = new RegExp(`^(?:drag|move|put) (${DRAG_FIELDS}) `);
const MAKE_PIVOT_TEST = /^(make|build|new|create|insert|add|do)( me)?( a| the| new| another)* (pivot|pivot ?table|pivottable1?)$/;
/** Addressing Jeff from a sheet he is not on: he never moves, so at stage 4 you walk back and show him in the same turn. */
const JEFF_ELSEWHERE_TEST = /^((show|talk to|talk with|speak to|speak with|ask|tell|chat with|greet) jeff\b.*|give .+ to jeff)$/;
export const EXCEL_PHRASES: PhraseRule[] = [
  { id: 'excel.no-filter', region: 'excel', test: /^(say )?no filters?$/, text: (s) => NO_FILTER[s.room] ?? NO_FILTER['excel.pivot']! },
  {
    id: 'excel.already-in', region: 'excel', test: /^(show me (a|the) table|open excel)$/,
    text: (s) => `You are already in Excel. Any further in and it's VBA. The table is ${s.room === 'excel.pivot' ? 'right here: PivotTable1' : 'PivotTable1, east of Sheet1'}.`,
  },
  { id: 'excel.analyze-pivot', room: 'excel.pivot', test: /^analy[sz]e in excel$/, text: (s) => (s.flags['excel.connected'] ? ALREADY_CONNECTED(s) : ANALYZE_ELSEWHERE('west, then north')) },
  // The movement words (spec1 §2.1): naming a sheet walks you to it from any sheet; naming the one you are on says so.
  { id: 'excel.go-pivot', region: 'excel', test: GO_PIVOT_TEST, text: '', then: (s) => (
    s.room === 'excel.pivot' ? { id: 'excel.on-pivot', then: { text: ON_PIVOT, outcome: 'fail' } }
      : s.room === 'excel.data' ? { id: 'excel.go-pivot', then: GO_PIVOT_FROM_DATA }
        : { id: 'excel.go-pivot', then: GO_PIVOT }) },
  { id: 'excel.go-data', region: 'excel', test: GO_DATA_TEST, text: '', then: (s, _w, line) => {
    const action = /^(analy[sz]e in excel|connect)$/.test(line);
    if (s.room === 'excel.data') return action ? null : { id: 'excel.on-data', then: { text: ON_DATA, outcome: 'fail' } }; // the Data tab's own rules answer the action words
    if (action && s.flags['excel.connected']) return { id: 'excel.connected-already', then: CONNECTED_ALREADY };
    return { id: 'excel.go-data', then: s.room === 'excel.pivot' ? GO_DATA_FROM_PIVOT : GO_DATA };
  } },
  { id: 'excel.go-sheet1', region: 'excel', test: GO_SHEET1_TEST, text: '', then: (s) => (
    s.room === 'excel.sheet1' ? { id: 'excel.on-sheet1', then: { text: ON_SHEET1, outcome: 'fail' } } : { id: 'excel.go-sheet1', then: GO_SHEET1 }) },
  { id: 'excel.jeff-elsewhere', region: 'excel', test: JEFF_ELSEWHERE_TEST, text: '', then: (s) => {
    if (s.room === 'excel.sheet1') return null; // Sheet1's rules own Jeff
    const dir = way(s, 'sheet1')!;
    if (atStage4(s)) return { id: 'excel.show-jeff-done-walk', then: { ...WIN, text: `You go ${dir} to Sheet1 and turn the pivot toward Jeff. ${WIN_TEXT}` } };
    return { id: 'excel.jeff-elsewhere', then: { text: `Jeff is on Sheet1. ${cap(dir)}. He hasn't moved. He never moves.`, outcome: 'fail' } };
  } },
  // Jeff's own words for the pivot ("make the pivot", "build the pivot"): `make` is not a parser verb, so the phrase does what `create pivot table` does.
  { id: 'excel.make-pivot', region: 'excel', test: MAKE_PIVOT_TEST, text: '', then: (s) => {
    if (s.room !== 'excel.pivot') return { id: `excel.pivot-from-${s.room === 'excel.data' ? 'data' : 'sheet1'}`, then: { text: WRONG_SHEET, outcome: 'fail' } };
    if (!s.flags['excel.connected']) return { id: 'excel.create-pivot-unconnected', then: CREATE_UNCONNECTED };
    if (s.flags['excel.pivot']) return { id: 'excel.pivot-already', then: PIVOT_ALREADY };
    return { id: 'excel.create-pivot', then: CREATE_PIVOT };
  } },
  // `drag` is not a parser verb, so the phrase places the field itself through the same `then`s the build rules use (wrong fields keep their jokes).
  { id: 'excel.drag', room: 'excel.pivot', test: DRAG_TEST, text: '', then: (s, _w, line) => {
    const field = DRAG_FIELD.exec(line)![1]!;
    if (!s.flags['excel.pivot']) return { id: 'excel.not-yet-pivot', then: NOT_YET_PIVOT };
    return fieldThen(s, field); // the same step id as the build rule it stands in for
  } },
  { id: 'excel.compare', region: 'excel', test: /^(compare|look at (the )?difference|diff|what('s| is) the difference|why (is it|are they) different)\??$/, text: compareText },
  // `show jeff the pivot` parses as give "jeff pivot"; `tell jeff …` as say. The room rules own `give pivot to jeff`.
  { id: 'excel.show-jeff-words', room: 'excel.sheet1', test: /^(show jeff (the )?(pivot|pivot ?table|pivottable1?|numbers?|total)|tell jeff\b.*)$/, text: '', then: (s) => ({
    id: 'excel.show-jeff-words',
    then: s.flags['sq.excel.done'] ? { text: JEFF_DONE_TEXT, outcome: 'snark' } : pieces(s) === 3 ? WIN : { text: notYet(s), outcome: 'fail' },
  }) },
  // Bare `fields` has no verb; on PivotTable1 it is the field list, elsewhere it is on PivotTable1.
  // The voice sweep (Task F9).
  { id: 'excel.save', region: 'excel', test: /^save( the)? (workbook|sheet|file|export|spreadsheet)$/, text: 'Saved as Sales_export (4).csv. The (3) was the good one. It always is.' },
  { id: 'excel.cell-a1', room: 'excel.sheet1', test: /^(look at|examine|x|click|select)( cell)? a1$/, text: 'Cell A1. Blinking. Somewhere in it, Clippy is composing a suggestion.' },
  { id: 'excel.refresh-pivot', room: 'excel.pivot', test: /^refresh( the| all| pivot| data)?( pivot)?$/, text: `You refresh the pivot. It says the same number, but bolder. It feels ${MALAPROPS.refreshered}.` },
  { id: 'excel.format-pivot', room: 'excel.pivot', test: /^(format|style|band)( the)? (pivot|pivot table|pivottable|rows)$/, text: 'You format the pivot. Banded rows. Jeff likes banded rows. The number is still wrong, now in stripes.' },
  { id: 'excel.fields', region: 'excel', test: /^(fields|field list|field pane|pivottable fields|list fields|show fields)$/, text: (s) => (s.room === 'excel.pivot' ? fieldListText(s) : WRONG_SHEET_LOOK(s)) },
];
