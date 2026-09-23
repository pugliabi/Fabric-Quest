import type { Item } from './types';

/**
 * The Semantic Model Keep (the Fortress, re-themed as Power BI): every object in its five rooms.
 * Scenery answers `look` here; `use` / `get` lines rotate in fortress.ts (poke()).
 */
export const KEEP_ITEMS: Item[] = [
  // ---- Power BI Desktop Gate ----
  {
    id: 'moat', name: 'Moat of T-SQL', aliases: ['moat', 'moat of t sql', 'moat of tsql', 'water', 'semicolons', 't sql', 'tsql', 'warehouse'],
    takeable: false,
    untakeableText: 'You cannot get the moat. Historically, it is the moat that gets you.',
    describe: 'The Moat of T-SQL: the Warehouse the whole Keep was built on. It glitters with semicolons. Deep in it, something SELECTs. Do not swim. The Duke\'s guests arrive by throw.',
  },
  {
    id: 'drawbridge', name: 'drawbridge', aliases: ['bridge', 'gate', 'keep gate', 'the gate'],
    takeable: false,
    untakeableText: 'The drawbridge weighs more than your report, and your report weighs 2.3 GB.',
    describe: (s) => (s.flags['bridge.down']
      ? 'The drawbridge is down. The splash screen painted on it has finished; a "What\'s new in this release" dialog flaps in the breeze. Nobody reads it.'
      : 'The drawbridge is up. Painted across it, a splash screen: "Loading… Power BI Desktop is updating (1 of 3)". It does not look like it is lowering. It looks like it is updating.'),
  },
  {
    id: 'splash', name: 'splash screen', aliases: ['splash', 'splash screen', 'loading screen', 'loading', 'logo'],
    takeable: false,
    untakeableText: 'It is a splash screen. It goes away when it wants to.',
    describe: (s) => (s.flags['bridge.down']
      ? 'The splash screen has finished. It is now a "What\'s new" dialog. There are eleven new things. You will discover them by accident, one a month.'
      : 'Loading… 1 of 3. It has been 1 of 3 since you arrived.'),
  },
  {
    id: 'battlements', name: 'battlements', aliases: ['battlements', 'walls', 'wall', 'ramparts', 'parapet', 'crenellations'],
    takeable: false,
    untakeableText: 'You cannot take the battlements. They are the only thing holding the guard up.',
    describe: 'Battlements, crenellated like a column chart with the missing months left out. The guard leans on the tallest bar. It is December. It is always December.',
  },
  {
    id: 'update-dialog', name: 'update dialog', aliases: ['update dialog', 'dialog', 'update', 'updates', 'installer', 'install', 'new version'],
    takeable: false,
    untakeableText: 'You drag the dialog off the screen. It comes back, centred.',
    describe: 'A small grey dialog nailed to the gatehouse: "A new version of Power BI Desktop is available." Buttons: Install now. Install now. Remind me in 1 day (greyed out).',
  },
  // ---- Power Query Hall ----
  {
    id: 'steps', name: 'Applied Steps', aliases: ['steps', 'applied steps', 'step', 'hall', 'columns', 'column', 'removed other columns'],
    takeable: false,
    untakeableText: 'You try to lift a step. Every step after it turns yellow. You put it back.',
    describe: 'Applied Steps, stretching the length of the hall: Source · Navigation · Promoted Headers · Changed Type · Removed Other Columns · Changed Type1 · Custom1 · Changed Type2. The last one is where you are.',
  },
  {
    id: 'doorways', name: 'doorways', aliases: ['doorways', 'doorway', 'doors', 'changed type', 'arches'], // a bare 'door' is the Advanced Editor's
    takeable: false,
    untakeableText: 'You cannot take a Changed Type. Power Query adds them for you. It will add one to this sentence.',
    describe: 'Every doorway is labelled Changed Type. Some are labelled Changed Type1. One, at the end, says Changed Type7 and nobody has walked through it since the column was renamed.',
  },
  {
    id: 'portraits', name: 'portraits', aliases: ['portraits', 'portrait', 'paintings', 'painting', 'source', 'navigation'],
    takeable: false,
    untakeableText: 'The portraits are the query. Take one down and the whole hall errors.',
    describe: 'Portraits of the founding steps. SOURCE, stern, in a server-room collar. NAVIGATION, pointing at a table just out of frame. And a blank frame labelled CUSTOM1.',
  },
  {
    id: 'custom1', name: 'Custom1', aliases: ['custom1', 'custom 1', 'custom', 'blank frame'], // not 'custom step': it would swallow 'step'
    takeable: false,
    untakeableText: 'You reach for it. Every step after it goes yellow. You do not touch Custom1.',
    describe: 'Custom1. A step. Nobody knows what it does. Everyone is afraid to delete it.',
  },
  {
    id: 'editor-door', name: 'Advanced Editor door', aliases: ['advanced editor', 'editor', 'advanced editor door', 'm', 'let'],
    takeable: false,
    untakeableText: 'The door is load-bearing. So is everything behind it.',
    describe: 'A heavy door marked ADVANCED EDITOR. Behind it, you can hear someone indenting a `let` by hand.',
  },
  // ---- The Model View ----
  {
    id: 'policy', name: 'incremental refresh policy', aliases: ['policy', 'incremental refresh', 'refresh policy', 'incremental', 'incremental refresh policy'],
    takeable: true,
    describe: "An incremental refresh policy on a laminated card: 'Refresh rows from the last 10 days. Archive the rest.' Small steps. Bursting steps, one might say.",
  },
  {
    id: 'm2m-bridge', name: 'bridge', aliases: ['bridge', 'm2m bridge', 'wobbly bridge', 'm2m'], // not 'bridge table': it would swallow 'table'
    takeable: false,
    untakeableText: 'You lift one end. The other end filters both ways. You put it down.',
    describe: 'A many-to-many bridge. It wobbles. Do not stand on it. Do not build a report on it.',
  },
  {
    id: 'plinths', name: 'plinths', aliases: ['plinths', 'plinth', 'tables', 'fact tables', 'dimension', 'dimensions'], // a bare 'table' goes to the date table (suffix match)
    takeable: false,
    untakeableText: 'Each plinth holds a table. Each table holds a grudge. They stay.',
    describe: 'Stone plinths, each with a table on top: Sales in the middle, big and square; Product, Customer and Date around it. Almost a star. One stray plinth holds a table called Sheet1.',
  },
  {
    id: 'lines', name: 'relationship lines', aliases: ['lines', 'line', 'relationships', 'relationship', 'relationship lines', 'arrows'],
    takeable: false,
    untakeableText: 'You pick up a relationship. The model forgets which Product you meant. You put it back.',
    describe: 'Relationship lines, one to many, each with a little arrow pointing the way the filter flows. All but one are solid. The dashed one is inactive and has been since a meeting in 2021.',
  },
  {
    id: 'date-table', name: 'date table', aliases: ['date table', 'calendar', 'dates', 'date', 'calendar table'],
    takeable: false,
    untakeableText: 'The date table is the most important table in the model. It is also the one nobody bothered to mark.',
    describe: (s) => (s.flags['model.date']
      ? 'The date table, marked as a date table. Time intelligence is working. It is quietly smug about it.'
      : 'A date table. It has every day from 1900 to 2099. It has not been marked as a date table. Time intelligence is sulking.'),
  },
  {
    id: 'lectern', name: 'lectern', aliases: ['lectern', 'podium', 'stand', 'reading stand'],
    takeable: false,
    untakeableText: 'The lectern is bolted to the diagram. Everything here is, at 100% zoom.',
    describe: (s) => (s.flags['taken.policy']
      ? 'An empty lectern. A dust outline shaped like a laminated card.'
      : 'A lectern. On it, a laminated card: an incremental refresh policy. Someone left it here, meaning to apply it. That was in 2019.'),
  },
  {
    id: 'diagram', name: 'diagram', aliases: ['diagram', 'model view', 'model', 'layout', 'canvas'],
    takeable: false,
    untakeableText: 'You cannot take the diagram. You can only rearrange it, and it will rearrange itself back.',
    describe: 'The model diagram, floating in the dark. Sales in the middle. Everything else pulled in by lines. Someone once dragged every table into a neat star. Someone else pressed Auto-layout.',
  },
  // ---- The Duke of DAX ----
  {
    id: 'throne', name: 'throne', aliases: ['throne', 'formula bar', 'seat', 'chair', 'throne of calculates'],
    takeable: false,
    untakeableText: 'The Duke is on it. He would like you to try.',
    describe: 'A throne carved as a giant formula bar. Across the back, in gold: CALCULATE( — and nothing after it. The Duke is still waiting for the filter argument.',
  },
  {
    // No 'window' in its names: the room's other window (the one you leave by) must own that word.
    id: 'dax-window', name: 'DAX query view', aliases: ['dax query view', 'query view', 'measure', 'measures', 'code'], // not 'dax' (swallows 'duke of dax') nor 'dax pane' (swallows 'pane')
    takeable: false,
    untakeableText: 'You cannot take the DAX query view. You can close it, and it will reopen with your last error.',
    describe: 'A tall DAX query view beside the throne. Line 1: CALCULATE(. Line 2: a blinking cursor. Line 3: a red squiggle under nothing in particular.',
  },
  {
    id: 'keep-window', name: 'window', aliases: ['window', 'casement', 'the window', 'exit'],
    takeable: false,
    untakeableText: 'It is a window. It stays in the wall. You, on the other hand, may not.',
    describe: 'It opens onto the moat. It is the fastest exit in the Keep.',
  },
  {
    id: 'filter-pane', name: 'filter pane', aliases: ['filter pane', 'filters', 'pane', 'filters pane', 'filter'],
    takeable: false,
    untakeableText: 'The filter pane is behind the Duke. Everything that happens here is filtered by it. Including you.',
    describe: 'Behind the throne, a filter pane hangs like a tapestry: "Year is 2019. Region is not (Blank). Jeff is not in the room." All the filters are locked.',
  },
  // ---- The Report Studio ----
  {
    id: 'refresh', name: 'the Big Refresh', aliases: ['refresh', 'big refresh', 'progress bar', 'refresh bar', 'the refresh', 'bar'],
    takeable: false, untakeableText: 'It is 97% of the way through 2019. Leave it.',
    describe: (s) => (s.flags['refresh.done']
      ? 'The Big Refresh: complete. It took ten days at a time and finished in a minute. Nobody learns from this.'
      : 'A progress bar, 97%, since 2019. It is refreshing everything, every time, all at once. It needs smaller steps. A sticky note on it reads DO NOT TOUCH — JEFF.'),
  },
  {
    id: 'pie', name: 'pie chart', aliases: ['pie', 'pie chart', 'chart', 'slices', 'other'], // not 'visual': it would swallow 'card visual'
    takeable: false,
    untakeableText: 'The pie is 31 slices. You cannot take it in one trip, and nobody wants a slice.',
    describe: "A pie with 31 slices. Twelve of them are 'Other'. You could fix it. You could also leave it and let it be someone else's problem in Q3.",
  },
  {
    id: 'slicers', name: 'slicers', aliases: ['slicers', 'slicer', 'slicer stack', 'stack', 'dropdowns'],
    takeable: false,
    untakeableText: 'The slicers are synced across nine pages. Move one and eight others move with it.',
    describe: 'A stack of eight slicers: Year, Month, Region, Region (Old), Product, Colour, "Test", and one with no field at all. It filters everything, including itself.',
  },
  {
    id: 'canvas', name: 'canvas', aliases: ['canvas', 'report', 'page', 'report page', 'wall'],
    takeable: false,
    untakeableText: 'The canvas is 1280 by 720. You are not.',
    describe: 'A report canvas the size of a wall. The pie, the Card, the slicers, and a lot of white space someone called "breathing room" in a design review.',
  },
  {
    id: 'bookmarks', name: 'bookmarks pane', aliases: ['bookmarks', 'bookmark', 'bookmarks pane', 'bookmark pane'],
    takeable: false,
    untakeableText: 'The bookmarks pane is docked. So are you, now.',
    describe: 'The bookmarks pane: "Default", "Default (2)", "Jeff view", "Jeff view DO NOT UPDATE", and "Bookmark 14". None of them restore the thing you think they do.',
  },
  {
    id: 'format-pane', name: 'Format pane', aliases: ['format pane', 'formatting', 'format', 'paint roller'],
    takeable: false,
    untakeableText: 'The Format pane has 214 options and none of them is "come with you".',
    describe: 'The Format pane. 214 options, grouped by a logic known only to the Format pane. Somewhere in here is the setting that turns the border off.',
  },
  {
    id: 'perf-analyzer', name: 'Performance Analyzer', aliases: ['performance analyzer', 'analyzer', 'performance', 'stopwatch'],
    takeable: false,
    untakeableText: 'You pick up the Performance Analyzer. It records how long that took. You put it down.',
    describe: 'The Performance Analyzer: a stopwatch on a stand. Last recording: the pie, 11,402 ms. The Card, 3 ms. The slicer with no field, somehow, 9 seconds.',
  },
  {
    id: 'visual-header', name: 'visual header', aliases: ['visual header', 'header', 'ellipsis', 'more options', 'focus mode'],
    takeable: false,
    untakeableText: 'The visual header only appears when you hover. When you reach for it, it disappears.',
    describe: 'A visual header, hovering above the pie: filter icon, focus mode, and an ellipsis that opens a menu containing, among other things, "Export data".',
  },
  {
    id: 'sticky-note', name: 'sticky note', aliases: ['sticky note', 'note', 'sticky', 'post it', 'post-it'],
    takeable: false,
    untakeableText: 'It says DO NOT TOUCH — JEFF. You do not touch it.',
    describe: 'A yellow sticky note on the Big Refresh: DO NOT TOUCH — JEFF. Underneath, smaller: "(it is almost done)". The ink is from 2019.',
  },
];
