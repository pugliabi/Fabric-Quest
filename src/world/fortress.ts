import type { Room } from './types';

const room = (r: Room): [string, Room] => [r.id, r];

const COPY = ['copy', 'copy activity', 'the copy activity'];
const CABLE = ['cable', 'connection', 'connection cable', 'wire', 'cord'];

export const FORTRESS_ROOMS: Record<string, Room> = Object.fromEntries([
  room({
    id: 'fortress.bridge', name: 'Warehouse Fortress Drawbridge', region: 'fortress',
    describe: (s) =>
      s.flags['bridge.down']
        ? 'The drawbridge is down. The Great Hall of Warehouse Fortress yawns north. The foothills are south.'
        : 'Warehouse Fortress. The drawbridge is up. A guard leans over the battlements. Below, the Moat of T-SQL glitters with semicolons. The foothills are south.',
    exits: { s: 'peaks.foothills', n: (s) => (s.flags['bridge.down'] ? 'fortress.hall' : null) },
    items: ['drawbridge'],
    npcs: ['guard'],
    scene: (s) => (s.flags['bridge.down'] ? 'fortress.bridge-down' : 'fortress.bridge'),
    flaskHint: (s) =>
      s.flags['bridge.down'] ? 'Go north. The Duke is in the room past the hall. He hates one query above all others.' :
      'The guard wants a SKU. You cannot afford a real one. There is a free one, for sixty days. Say it.',
    rules: [
      {
        id: 'fortress.sku',
        when: { verb: 'say', noun: ['trial', 'trial capacity', 'f trial', 'fabric trial', 'free trial', 'ftrial', 'trial sku'], flags: [{ flag: 'bridge.down', not: true }] },
        then: { text: "'Trial capacity, eh,' says the guard. 'Sixty days. Come in. Quickly.' The drawbridge crashes down.", set: { 'bridge.down': true }, points: 10, sfx: 'door' },
      },
      {
        id: 'fortress.sku-f64',
        when: { verb: 'say', noun: ['f64', 'f128', 'f256', 'f512', 'f1024', 'f2048', 'p3', 'p4', 'p5'] },
        then: { text: "'Nice try, peasant,' says the guard. 'Show me the invoice.'", outcome: 'snark' },
      },
      {
        id: 'fortress.sku-pro',
        when: { verb: 'say', noun: ['pro', 'ppu', 'premium', 'premium per user', 'p1', 'p2', 'power bi pro', 'free'] },
        then: { text: "'PRO?' The guard laughs so hard the drawbridge rattles but does not lower.", outcome: 'snark' },
      },
      {
        id: 'fortress.sku-f2',
        when: { verb: 'say', noun: ['f2', 'f4', 'f8', 'f16', 'f32'] },
        then: { text: "'Pause it or lose it,' mutters the guard. The bridge stays up.", outcome: 'snark' },
      },
      {
        id: 'fortress.north-closed',
        when: { verb: 'go', dir: 'n', flags: [{ flag: 'bridge.down', not: true }] },
        then: { text: 'The drawbridge is up. The moat is deep and full of GROUP BY.', outcome: 'fail' },
      },
      {
        id: 'fortress.open-bridge',
        when: { verb: 'open', noun: ['drawbridge', 'bridge', 'gate'], flags: [{ flag: 'bridge.down', not: true }] },
        then: { text: "You wave at the drawbridge. The guard shouts: 'STATE. YOUR. SKU.'", outcome: 'fail' },
      },
      {
        id: 'fortress.swim-moat',
        when: { verb: 'drink', noun: ['moat', 'water', 'moat of t-sql'] },
        then: { text: 'You sip from the Moat of T-SQL. It tastes of NOLOCK. You stop.', outcome: 'snark' },
      },
    ],
  }),
  room({
    id: 'fortress.hall', name: 'Great Hall', region: 'fortress',
    describe: () =>
      "The Great Hall. Long tables, all of them clustered columnstore. Guards line the walls. The Duke's chamber is north; a door east leads to the Pipeline Yard; the drawbridge is south.",
    exits: { s: 'fortress.bridge', n: 'fortress.throne', e: 'fortress.yard' },
    items: [],
    npcs: [],
    scene: () => 'fortress.hall',
    flaskHint: (s) => (s.flags['trial.moat'] ? 'East, the Pipeline Yard has two activities and a problem you can win by doing nothing.' : 'North. Insult the Duke properly and he will do the rest.'),
    rules: [
      {
        id: 'fortress.use-table',
        when: { verb: 'use', noun: ['table', 'tables'] },
        then: { text: 'You sit at a table. It is columnstore. You are compressed. You get up, slightly narrower.', outcome: 'snark' },
      },
    ],
  }),
  room({
    id: 'fortress.throne', name: "Duke's Chamber", region: 'fortress',
    describe: (s) =>
      s.flags['trial.moat']
        ? "The Duke's chamber. The Duke pretends not to see you. You still smell like the moat. The hall is south."
        : "The Duke's chamber. The Duke of Warehouse sits on a throne of stacked schemas. He speaks only in JOINs. The hall is south.",
    exits: { s: 'fortress.hall' },
    items: [],
    npcs: ['duke'],
    scene: () => 'fortress.throne',
    flaskHint: (s) => (s.flags['trial.moat'] ? 'You have the smell. Nothing more for you here.' : 'Say the two-word query every warehouse lord despises. Star is involved.'),
    rules: [
      {
        id: 'fortress.moat',
        when: { verb: 'say', noun: ['select *', 'select star', 'select * from', 'select *;', 'select * from table', 'select all', 'select * from everything'], flags: [{ flag: 'trial.moat', not: true }] },
        then: {
          text: "'SELECT STAR?' The Duke rises. 'IN. MY. WAREHOUSE?' Two guards seize you by the arms and hurl you from the window into the Moat of T-SQL. You surface, sputtering, covered in semicolons and something that might be a CROSS APPLY. You climb out. You will never not smell like this.",
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
        then: { text: "'ON WHAT?' the Duke bellows. You did not specify. You are LEFT OUTER, alone, with nulls.", outcome: 'snark' },
      },
      {
        id: 'fortress.attack-duke',
        when: { verb: 'attack', noun: ['duke', 'duke of warehouse', 'the duke'] },
        then: { text: 'You swing at the Duke. He INNER JOINs your fist to the wall. It hurts in every row.', outcome: 'fail' },
      },
      {
        id: 'fortress.sit-throne',
        when: { verb: 'use', noun: ['throne', 'schemas'] },
        then: { text: 'You reach for the throne. The schemas shift. One of them is named dbo. You back away.', outcome: 'fail' },
      },
    ],
  }),
  room({
    id: 'fortress.yard', name: 'Pipeline Yard', region: 'fortress',
    describe: (s) =>
      s.flags['copy.fixed']
        ? 'The Pipeline Yard. The Copy Activity hums. The Lookup Activity has gone back to looking at nothing in particular. The hall is west.'
        : s.flags['lookup.beaten']
          ? 'The Pipeline Yard. A cable lies on the flagstones where the Lookup dropped it. The Copy Activity is still stuck: WAITING ON LOOKUP. The hall is west.'
          : 'The Pipeline Yard. Pipes everywhere, none of them connected. A Copy Activity sits stuck, its status reading WAITING ON LOOKUP. The Lookup Activity stands in the corner. It is looking at you. The hall is west.',
    exits: { w: 'fortress.hall' },
    items: ['cable'],
    npcs: ['lookup', 'copy'],
    scene: (s) => (s.flags['copy.fixed'] ? 'fortress.yard-running' : 'fortress.yard'),
    flaskHint: (s) =>
      s.flags['copy.fixed'] ? 'Wear the boots. The mountain will feel shorter.' :
      s.flags['lookup.beaten'] || s.inventory.includes('cable') ? 'The cable goes on the Copy Activity.' :
      (s.flags['stare.count'] as number) >= 1 ? 'Do not blink. Wait.' :
      'Look at the Lookup Activity. Then out-wait it.',
    rules: [
      {
        id: 'fortress.stare-start',
        when: { verb: 'look', noun: ['lookup', 'lookup activity', 'the lookup'], flags: [{ flag: 'lookup.beaten', not: true }, { flag: 'stare.count', not: true }] },
        then: { text: 'You look at the Lookup Activity. It looks at you. This is going to take a while.', set: { 'stare.count': 1 }, outcome: 'success' },
      },
      {
        id: 'fortress.stare-wait-1',
        when: { verb: 'wait', flags: [{ flag: 'stare.count', is: 1 }] },
        then: { text: 'You do not blink. The Lookup does not blink. Somewhere, a pipeline times out.', set: { 'stare.count': 2 }, outcome: 'success' },
      },
      {
        id: 'fortress.stare',
        when: { verb: 'wait', flags: [{ flag: 'stare.count', is: 2 }] },
        then: { text: 'The Lookup Activity… blinks. It looks away, ashamed, and drops a connection cable at your feet.', set: { 'lookup.beaten': true, 'stare.count': 3 }, points: 10, sfx: 'success' },
      },
      {
        id: 'fortress.copy',
        when: { verb: 'use', noun: CABLE, noun2: COPY, has: ['cable'], flags: [{ flag: 'copy.fixed', not: true }] },
        then: {
          text: 'You plug the cable into the Copy Activity. Status: RUNNING. Status: RUNNING. Status: SUCCEEDED. The Copy Activity deposits, at your feet, a pair of boots. Provenance unknown.',
          set: { 'copy.fixed': true }, remove: ['cable'], give: ['boots'], points: 15, sfx: 'item',
        },
      },
      {
        id: 'fortress.copy-give',
        when: { verb: 'give', noun: CABLE, noun2: COPY, has: ['cable'], flags: [{ flag: 'copy.fixed', not: true }] },
        then: {
          text: 'You hand the Copy Activity the cable. It plugs itself in. Status: RUNNING. Status: SUCCEEDED. It deposits, at your feet, a pair of boots. Provenance unknown.',
          set: { 'copy.fixed': true }, remove: ['cable'], give: ['boots'], points: 15, pointsKey: 'fortress.copy', sfx: 'item',
        },
      },
      {
        id: 'fortress.copy-nocable',
        when: { verb: 'use', noun2: COPY, flags: [{ flag: 'copy.fixed', not: true }] },
        then: { text: 'The Copy Activity has no connection. It waits. It is very good at waiting.', outcome: 'fail' },
      },
      {
        id: 'fortress.use-copy',
        when: { verb: 'use', noun: COPY, flags: [{ flag: 'copy.fixed', not: true }] },
        then: { text: 'You press Run on the Copy Activity. Status: WAITING ON LOOKUP. It does not care that you pressed it.', outcome: 'fail' },
      },
      {
        id: 'fortress.talk-lookup-stare',
        when: { verb: 'talk', noun: ['lookup', 'lookup activity', 'the lookup'], flags: [{ flag: 'lookup.beaten', not: true }, { flag: 'stare.count', not: true }] },
        then: { text: 'The Lookup Activity says nothing. It looks at you. You realize you are now looking at it. This is going to take a while.', set: { 'stare.count': 1 }, outcome: 'success' },
      },
    ],
  }),
]);
