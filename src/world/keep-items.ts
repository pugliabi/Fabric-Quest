import type { Item } from './types';
import type { GameState } from '../engine/types';
import { STEP_NOUNS, pqDone, stepsList } from './applied-steps';

/**
 * The Semantic Model Keep (the Fortress, re-themed as Power BI): every object in its five rooms.
 * Scenery answers `look` here; `use` / `get` lines rotate in fortress.ts (poke()).
 */
/** A second and a third look in a row (the voice sweep, Task F6; the lake keeps the same helper): read off `recent`, no flag. */
const looks = (s: GameState, first: string, second: string, third?: string): string => {
  const n = s.recent?.n ?? 1;
  return n >= 3 && third ? third : n >= 2 ? second : first;
};

export const KEEP_ITEMS: Item[] = [
  // ---- Power BI Desktop Gate ----
  {
    id: 'moat', name: 'Moat of T-SQL', aliases: ['moat', 'moat of t sql', 'moat of tsql', 'water', 'semicolons', 't sql', 'tsql', 'warehouse'],
    takeable: false,
    blurb: 'The Moat of T-SQL, semicolons and all. Historically it is the moat that gets you, and it is getting you from very close range.',
    untakeableText: 'You cannot get the moat. Historically, it is the moat that gets you.',
    describe: (s) => looks(s, s.flags['trial.moat']
      ? 'The Moat of T-SQL. You have been in it. It kept a CROSS APPLY of yours as a souvenir, and it is not giving it back.'
      : 'The Moat of T-SQL: the Warehouse the whole Keep was built on. It glitters with semicolons. Deep in it, something SELECTs. Do not swim. The Duke\'s guests arrive by throw.',
      'You look at the moat again. Something down there looks back and suggests an index.',
      'A third look. The moat has started billing you for the scan.'),
  },
  {
    id: 'drawbridge', name: 'drawbridge', aliases: ['bridge', 'gate', 'keep gate', 'the gate'],
    takeable: false,
    blurb: 'A drawbridge with a splash screen painted across it. Wherever you take it, it is still 1 of 3.',
    untakeableText: 'The drawbridge weighs more than your report, and your report weighs 2.3 GB.',
    describe: (s) => (s.flags['bridge.down']
      ? 'The drawbridge is down. The splash screen painted on it has finished; a "What\'s new in this release" dialog flaps in the breeze. Nobody reads it.'
      : 'The drawbridge is up. Painted across it, a splash screen: "Loading… Power BI Desktop is updating (1 of 3)". It does not look like it is lowering. It looks like it is updating.'),
  },
  {
    id: 'splash', name: 'splash screen', aliases: ['splash', 'splash screen', 'loading screen', 'loading', 'logo', 'try free', 'link', 'trial', 'trial capacity', 'f trial', 'fabric trial', 'free trial', 'ftrial', 'trial sku'], // the trial is the splash screen's Try free link (fortress.sku-use)
    takeable: false,
    blurb: 'A splash screen. Loading, 1 of 3, and it has been 1 of 3 since it left the gatehouse.',
    untakeableText: 'It is a splash screen. It goes away when it wants to.',
    describe: (s) => (s.flags['bridge.down']
      ? 'The splash screen has finished. It is now a "What\'s new" dialog. There are eleven new things. You will discover them by accident, one a month.'
      : 'Loading… 1 of 3. It has been 1 of 3 since you arrived.'),
  },
  {
    id: 'battlements', name: 'battlements', aliases: ['battlements', 'walls', 'wall', 'ramparts', 'parapet', 'crenellations'],
    takeable: false,
    blurb: 'Battlements, crenellated like a column chart with the missing months left out. It is always December on them.',
    untakeableText: 'You cannot take the battlements. They are the only thing holding the guard up.',
    describe: (s) => looks(s, 'Battlements, crenellated like a column chart with the missing months left out. The guard leans on the tallest bar. It is December. It is always December.',
      'December, again. The guard leans on it like it owes him a SKU.'),
  },
  {
    id: 'update-dialog', name: 'update dialog', aliases: ['update dialog', 'dialog', 'update', 'updates', 'installer', 'install', 'new version'],
    takeable: false,
    blurb: 'A small grey update dialog. Install now, Install now, or Remind me in 1 day, greyed out.',
    untakeableText: 'You drag the dialog off the screen. It comes back, centred.',
    describe: 'A small grey dialog nailed to the gatehouse: "A new version of Power BI Desktop is available." Buttons: Install now. Install now. Remind me in 1 day (greyed out).',
  },
  // ---- Power Query Hall ----
  {
    // The seven step names ('source' … 'renamed columns') are aliases here, not on the doorways or the portraits: the room
    // text names them as doorways, so `look at filtered rows` must answer, and it answers with the chain. (The two
    // '… columns' names would land here anyway through 'columns', since this item precedes the doorways.)
    id: 'steps', name: 'Applied Steps', aliases: ['steps', 'applied steps', 'step', 'hall', 'columns', 'column', ...STEP_NOUNS],
    takeable: false,
    blurb: 'Seven Applied Steps in a row. Lift one and every step after it turns yellow, and you lifted all seven.',
    untakeableText: 'You try to lift a step. Every step after it turns yellow. You put it back.',
    describe: (s) => `Applied Steps, one doorway each, in order:\n${stepsList(s)}`,
  },
  {
    id: 'doorways', name: 'doorways', aliases: ['doorways', 'doorway', 'doors', 'arches'], // a bare 'door' is the Advanced Editor's
    takeable: false,
    blurb: 'Seven doorways, one per step. Power Query applied them and only Power Query removes them, and you are not Power Query.',
    untakeableText: 'You cannot take a doorway. Power Query applied it; only Power Query removes it, and only by accident.',
    // One vocabulary (applied-steps.ts STEP_STATE): open = applied, waiting = next, yellow = the rest.
    describe: (s) => (pqDone(s)
      ? `Seven doorways, each labelled with a step. ${stepsList(s)}. All open. Nothing is waiting, which is a first for this hall.`
      : `Seven doorways, each labelled with a step. ${stepsList(s)}. Open means applied. Waiting means next, where the query stopped. Yellow means not yet, and Power Query means it.`),
  },
  {
    id: 'portraits', name: 'portraits', aliases: ['portraits', 'portrait', 'paintings', 'painting'],
    takeable: false,
    blurb: 'Portraits of SOURCE and NAVIGATION, and a blank frame labelled CUSTOM1. The hall behind you is erroring.',
    untakeableText: 'The portraits are the query. Take one down and the whole hall errors.',
    describe: (s) => looks(s, "Portraits of the founding steps. SOURCE, in a server-room collar; NAVIGATION, pointing at a table out of frame; a blank frame labelled CUSTOM1. In the corner of SOURCE, a paperclip with eyes. 'It looks like you're writing a measure.'",
      "You look again. The paperclip has moved to the Navigation portrait. 'It looks like you're lost.'",
      'The paperclip is in the CUSTOM1 frame now. Nobody knows what it does there either.'),
  },
  {
    // The broken query itself (spec2 §8): first in the hall's items, so 'sales' and 'the query' are it and not a step.
    id: 'query', name: 'query', aliases: ['sales query', 'the query', 'queries', 'sales'],
    takeable: false,
    blurb: 'The Sales query, seven steps, one error. You are standing in a Formula.Firewall and you brought it with you.',
    untakeableText: 'The query is the hall. Take it and you are standing in a Formula.Firewall.',
    describe: (s) => `Sales — 7 steps, ${pqDone(s) ? '0 errors' : '1 error'}.\n${stepsList(s)}`,
  },
  {
    id: 'custom1', name: 'Custom1', aliases: ['custom1', 'custom 1', 'custom', 'blank frame'], // not 'custom step': it would swallow 'step'
    takeable: false,
    blurb: 'Custom1, the step nobody understands. Everyone was afraid to delete it, and you are the one who picked it up.',
    untakeableText: 'You reach for it. Every step after it goes yellow. You do not touch Custom1.',
    // Once the query refreshes (pq.done) the step explains itself, which is worse.
    describe: (s) => (pqDone(s)
      ? 'Custom1: = Table.AddColumn(#"Renamed Columns", "Custom", each 1). It was a placeholder. It shipped.'
      : 'Custom1. A step. Nobody knows what it does. Everyone is afraid to delete it.'),
  },
  {
    id: 'editor-door', name: 'Advanced Editor door', aliases: ['advanced editor', 'editor', 'advanced editor door', 'm', 'let'],
    takeable: false,
    blurb: 'The Advanced Editor door. Behind it, somebody is still indenting a `let` by hand, and now they are doing it very close to you.',
    untakeableText: 'The door is load-bearing. So is everything behind it.',
    describe: 'A heavy door marked ADVANCED EDITOR. Behind it, you can hear someone indenting a `let` by hand.',
  },
  // ---- The Model View ----
  {
    id: 'policy', name: 'incremental refresh policy', aliases: ['policy', 'incremental refresh', 'refresh policy', 'incremental', 'incremental refresh policy'],
    takeable: true,
    blurb: 'An incremental refresh policy, laminated. Somebody in 2019 really believed in it.',
    again: 'You already have the policy. Sir Cardinality watched you take it and said nothing, pointedly.',
    describe: "An incremental refresh policy on a laminated card: 'Refresh rows from the last 10 days. Archive the rest.' Small steps. Bursting steps, one might say.",
  },
  {
    id: 'm2m-bridge', name: 'bridge', aliases: ['bridge', 'm2m bridge', 'wobbly bridge', 'm2m', 'many to many', 'many many', 'bidirectional'], // 'many many': the parser eats the 'to' // not 'bridge table': it would swallow 'table'
    takeable: false,
    blurb: 'A many-to-many bridge. It wobbles, it filters both ways, and you are carrying it on purpose.',
    untakeableText: 'You lift one end. The other end filters both ways. You put it down.',
    describe: 'A many-to-many bridge. It wobbles. Do not stand on it. Do not build a report on it.',
  },
  {
    id: 'plinths', name: 'plinths', aliases: ['plinths', 'plinth', 'tables', 'fact tables', 'dimension', 'dimensions'], // a bare 'table' goes to the date table (suffix match)
    takeable: false,
    blurb: 'Stone plinths, five tables on top, one of them Sheet1. Each table holds a grudge, and now they hold it against you.',
    untakeableText: 'Each plinth holds a table. Each table holds a grudge. They stay.',
    describe: (s) => looks(s, 'Stone plinths, each with a table on top: Sales in the middle, big and square; Product, Customer and Date around it. Almost a star. One stray plinth holds a table called Sheet1.',
      'You look at Sheet1 a second time. It is the most attention it has had since it was imported, and it thinks this might be a relationship.'),
  },
  {
    id: 'lines', name: 'relationship lines', aliases: ['lines', 'line', 'relationships', 'relationship', 'relationship lines', 'arrows'],
    takeable: false,
    blurb: 'Relationship lines, arrows and all. The model has forgotten which Product you meant, and so have you.',
    untakeableText: 'You pick up a relationship. The model forgets which Product you meant. You put it back.',
    describe: 'Relationship lines, one to many, each with a little arrow pointing the way the filter flows. All but one are solid. The dashed one is inactive and has been since a meeting in 2021.',
  },
  {
    id: 'date-table', name: 'date table', aliases: ['date table', 'calendar', 'dates', 'date', 'calendar table', 'the date table'],
    takeable: true,
    blurb: 'A date table, 1900 to 2099, unmarked. The Duke will want a word.',
    again: "You have the date table. It's the only table in the realm that knows what day it is.",
    describe: (s) => (s.flags['model.date']
      ? 'The date table, marked as a date table. Time intelligence is working. It is quietly smug about it.'
      : 'A date table. It has every day from 1900 to 2099. It has not been marked as a date table. Time intelligence is sulking.'),
  },
  {
    id: 'lectern', name: 'lectern', aliases: ['lectern', 'podium', 'stand', 'reading stand'],
    takeable: false,
    blurb: 'The Model View lectern. It held the policy from 2019 until you came along, and it is lighter without it.',
    untakeableText: 'The lectern is bolted to the diagram. Everything here is, at 100% zoom.',
    describe: (s) => (s.flags['taken.policy']
      ? 'An empty lectern. A dust outline shaped like a laminated card.'
      : 'A lectern. On it, a laminated card: an incremental refresh policy. Someone left it here, meaning to apply it. That was in 2019.'),
  },
  {
    id: 'diagram', name: 'diagram', aliases: ['diagram', 'model view', 'model', 'layout', 'canvas'],
    takeable: false,
    blurb: 'The model diagram, floating in the dark. Someone pressed Auto-layout, and it is still rearranging.',
    untakeableText: 'You cannot take the diagram. You can only rearrange it, and it will rearrange itself back.',
    describe: 'The model diagram, floating in the dark. Sales in the middle. Everything else pulled in by lines. Someone once dragged every table into a neat star. Someone else pressed Auto-layout.',
  },
  // ---- The Duke of DAX ----
  {
    id: 'throne', name: 'throne', aliases: ['throne', 'formula bar', 'seat', 'chair', 'throne of calculates'],
    takeable: false,
    blurb: 'The throne, carved as a formula bar: CALCULATE( and nothing after it. The Duke is still waiting for the filter argument, standing up.',
    untakeableText: 'The Duke is on it. He would like you to try.',
    describe: (s) => looks(s, 'A throne carved as a giant formula bar. Across the back, in gold: CALCULATE( — and nothing after it. The Duke is still waiting for the filter argument.',
      'You read the throne again, slower. CALCULATE( still has no closing bracket. Neither does your visit.'),
  },
  {
    // No 'window' in its names: the room's other window (the one you leave by) must own that word.
    id: 'dax-window', name: 'DAX query view', aliases: ['dax query view', 'query view', 'measure', 'measures', 'code'], // not 'dax' (swallows 'duke of dax') nor 'dax pane' (swallows 'pane')
    takeable: false,
    blurb: 'A DAX query view. Line 1: CALCULATE(. Line 3: a red squiggle under nothing in particular, following you.',
    untakeableText: 'You cannot take the DAX query view. You can close it, and it will reopen with your last error.',
    describe: 'A tall DAX query view beside the throne. Line 1: CALCULATE(. Line 2: a blinking cursor. Line 3: a red squiggle under nothing in particular.',
  },
  {
    id: 'keep-window', name: 'window', aliases: ['window', 'casement', 'the window', 'exit', 'moat', 'sql', 't sql', 'tsql'],
    takeable: false,
    blurb: "The Duke's window, the fastest exit in the Keep. It opens onto the moat from anywhere now, which is worse.",
    untakeableText: 'It is a window. It stays in the wall. You, on the other hand, may not.',
    describe: 'It opens onto the moat. It is the fastest exit in the Keep.',
  },
  {
    id: 'filter-pane', name: 'filter pane', aliases: ['filter pane', 'filters', 'pane', 'filters pane', 'filter'],
    takeable: false,
    blurb: 'The filter pane, locked: Year is 2019, Region is not (Blank), Jeff is not in the room. Everything you carry is filtered by it, including you.',
    untakeableText: 'The filter pane is behind the Duke. Everything that happens here is filtered by it. Including you.',
    describe: (s) => looks(s, 'Behind the throne, a filter pane hangs like a tapestry: "Year is 2019. Region is not (Blank). Jeff is not in the room." All the filters are locked.',
      'You read the filters again. There is a new one at the bottom: "Visitor is not interesting." It is not locked. It does not need to be.'),
  },
  // ---- The Report Studio ----
  {
    id: 'refresh', name: 'the Big Refresh', aliases: ['refresh', 'big refresh', 'progress bar', 'refresh bar', 'the refresh', 'bar'],
    takeable: false,
    blurb: 'The Big Refresh, a progress bar at 97% since 2019. DO NOT TOUCH — JEFF, and you did considerably more than touch it.', untakeableText: 'It is 97% of the way through 2019. Leave it.',
    describe: (s) => (s.flags['refresh.done']
      ? 'The Big Refresh: complete. With the pie gone, it finished in a minute. Nobody learns from this.'
      : 'A progress bar, 97%, since 2019. It is stuck on one visual, and the visual is round. A sticky note on it reads DO NOT TOUCH — JEFF.'),
  },
  {
    id: 'pie', name: 'pie chart', aliases: ['pie', 'pie chart', 'chart', 'slices', 'other', 'bar chart'], // not 'visual': it would swallow 'card visual'
    takeable: false,
    blurb: "A pie with 31 slices, twelve of them 'Other'. Nobody wanted a slice, and you took the whole pie.",
    untakeableText: 'The pie is 31 slices. You cannot take it in one trip, and nobody wants a slice.',
    describe: (s) => (s.flags['refresh.done']
      ? 'A clustered bar chart. It used to be a pie. Nobody misses it except Jeff.'
      : looks(s, "A pie with 31 slices. Twelve of them are 'Other'. You could fix it and make it a bar chart. You could also leave it and let it be someone else's problem in Q3.",
        "You count the slices again. Thirty-two. The new one is labelled 'You', and it is filed under 'Other'.")),
  },
  {
    id: 'slicers', name: 'slicers', aliases: ['slicers', 'slicer', 'slicer stack', 'stack', 'dropdowns'],
    takeable: false,
    blurb: 'Eight slicers, synced across nine pages. Move one and eight others move with it, and you moved all of them.',
    untakeableText: 'The slicers are synced across nine pages. Move one and eight others move with it.',
    describe: 'A stack of eight slicers: Year, Month, Region, Region (Old), Product, Colour, "Test", and one with no field at all. It filters everything, including itself.',
  },
  // The 400-visual page; opening it is death.400 (deaths.ts, which also hears "open other page"). Nothing here ends in
  // " page": noun matching is by suffix, so that would either take bare 'page' from the canvas or be taken by it.
  {
    id: 'page-two', name: 'Page 2', aliases: ['page two', 'tab', 'second tab', 'other tab', 'warm tab', '400 visuals', 'do not open', 'page 2 do not open'],
    takeable: false,
    blurb: 'Page 2 (do not open). 400 visuals, one per product, warm to the touch, and getting warmer.',
    untakeableText: 'The tab is warm. You leave it alone. For now.',
    describe: "A second tab: 'Page 2 (do not open)'. 400 visuals, one per product, each with its own slicer. The tab is warm to the touch.",
  },
  {
    id: 'canvas', name: 'canvas', aliases: ['canvas', 'report', 'page', 'report page', 'wall'],
    takeable: false,
    blurb: 'A report canvas, 1280 by 720, mostly breathing room. It does not fit in your pocket, and you are trying anyway.',
    untakeableText: 'The canvas is 1280 by 720. You are not.',
    describe: 'A report canvas the size of a wall. The pie, the Card, the slicers, and a lot of white space someone called "breathing room" in a design review.',
  },
  {
    id: 'bookmarks', name: 'bookmarks pane', aliases: ['bookmarks', 'bookmark', 'bookmarks pane', 'bookmark pane'],
    takeable: false,
    blurb: 'The bookmarks pane: Default, Default (2), Jeff view DO NOT UPDATE, and Bookmark 14. None of them restore the thing you think they do.',
    untakeableText: 'The bookmarks pane is docked. So are you, now.',
    describe: 'The bookmarks pane: "Default", "Default (2)", "Jeff view", "Jeff view DO NOT UPDATE", and "Bookmark 14". None of them restore the thing you think they do.',
  },
  {
    id: 'format-pane', name: 'Format pane', aliases: ['format pane', 'formatting', 'format', 'paint roller'],
    takeable: false,
    blurb: "The Format pane, 214 options. None of them was 'come with you', and it came with you.",
    untakeableText: 'The Format pane has 214 options and none of them is "come with you".',
    describe: 'The Format pane. 214 options, grouped by a logic known only to the Format pane. Somewhere in here is the setting that turns the border off.',
  },
  {
    id: 'perf-analyzer', name: 'Performance Analyzer', aliases: ['performance analyzer', 'analyzer', 'performance', 'stopwatch'],
    takeable: false,
    blurb: 'The Performance Analyzer, a stopwatch on a stand. It recorded how long it took you to pick it up: 9 seconds, somehow.',
    untakeableText: 'You pick up the Performance Analyzer. It records how long that took. You put it down.',
    describe: 'The Performance Analyzer: a stopwatch on a stand. Last recording: the pie, 11,402 ms. The Card, 3 ms. The slicer with no field, somehow, 9 seconds.',
  },
  {
    id: 'visual-header', name: 'visual header', aliases: ['visual header', 'header', 'ellipsis', 'more options', 'focus mode'],
    takeable: false,
    blurb: 'A visual header. It only appears when you hover, and you are hovering, so it is here.',
    untakeableText: 'The visual header only appears when you hover. When you reach for it, it disappears.',
    describe: 'A visual header, hovering above the pie: filter icon, focus mode, and an ellipsis that opens a menu containing, among other things, "Export data".',
  },
  {
    id: 'sticky-note', name: 'sticky note', aliases: ['sticky note', 'note', 'sticky', 'post it', 'post-it', 'jeff', 'finance'],
    takeable: false,
    blurb: "A sticky note: DO NOT TOUCH — JEFF. Underneath, smaller, '(it is almost done)', in ink from 2019.",
    untakeableText: 'It says DO NOT TOUCH — JEFF. You do not touch it.',
    describe: 'A yellow sticky note on the Big Refresh: DO NOT TOUCH — JEFF. Underneath, smaller: "(it is almost done)". The ink is from 2019.',
  },
];
