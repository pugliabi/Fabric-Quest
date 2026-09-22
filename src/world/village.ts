import type { Room } from './types';

const room = (r: Room): [string, Room] => [r.id, r];

export const VILLAGE_ROOMS: Record<string, Room> = Object.fromEntries([
  room({
    id: 'village.cottage', name: 'Your Cottage', region: 'village',
    describe: (s) =>
      "Your cottage. A workspace, technically. One desk, one candle, one report you have been 'about to finish' since spring." +
      (s.flags['taken.mug'] ? ' The desk looks lonely without the mug.' : ' A mug sits on the desk.') +
      ' The door is out, to the east.',
    exits: { out: 'village.square', e: 'village.square' },
    items: ['report', 'mug'],
    npcs: [],
    scene: () => 'village.cottage',
    flaskHint: (s) => (s.flags['taken.mug'] ? 'The village square is out the door. Read what you find there.' : 'Take the mug. Someone in the square will want it.'),
    rules: [
      {
        id: 'cottage.open-report',
        when: { verb: 'open', noun: ['report', 'pbix', 'sales report', 'file'] },
        then: { text: 'You open the report. 47 pages. 46 of them are a table. Page 12 is a pie chart with 31 slices. You close the report.', outcome: 'success' },
      },
      {
        id: 'cottage.use-report',
        when: { verb: 'use', noun: ['report', 'pbix', 'file'] },
        then: { text: 'You click Publish. A dialog asks which workspace. There is only one, and it is this cottage.', outcome: 'fail' },
      },
      {
        id: 'cottage.sleep',
        when: { verb: 'use', noun: ['bed', 'candle', 'desk'] },
        then: { text: 'Not now. There is a dragon.', outcome: 'fail' },
      },
    ],
  }),
  room({
    id: 'village.square', name: 'Village Square', region: 'village',
    describe: (s) =>
      'The Village Square. A well, a notice board, and roads going north to the Mill, east to the Refresh Fields, and south toward the OneLake.' +
      (s.flags['jeff.pacified'] ? ' Jeff from Finance sits by the well, content.' : ' Jeff from Finance is here, holding an empty spreadsheet like a begging bowl.'),
    exits: { n: 'village.mill', e: 'village.fields', s: 'lake.shore', w: 'village.cottage' },
    items: ['board', 'well'],
    npcs: ['jeff'],
    scene: (s) => (s.flags['jeff.pacified'] ? 'village.square-calm' : 'village.square'),
    flaskHint: (s) =>
      !s.flags['prophecy.read'] ? 'Read the notice board.' :
      !s.flags['jeff.pacified'] ? 'Jeff will follow you everywhere unless you give him something to hold.' :
      'Three roads. The Mill has something old and useful; the Lake has a boat; the Fields lead to the mountains.',
    rules: [
      {
        id: 'village.prophecy',
        when: { verb: 'read', noun: ['board', 'notice', 'notice board', 'sign', 'prophecy', 'noticeboard'] },
        then: {
          text:
            'THE PROPHECY\n\nWhen the Dragon throttles the Refreshes of the night,\nOne shall climb the Peaks and set the Model right.\nBut the Shrine door opens only for the Worthy Three:\nLook like an Engineer. Smell like a Warehouse. Hold the Gateway Key.\n\nBelow it, in different handwriting: "export to excel".',
          set: { 'prophecy.read': true }, points: 5, sfx: 'success',
        },
      },
      {
        id: 'village.jeff-mug',
        when: { verb: 'give', noun: ['mug', 'coffee mug', 'cup'], noun2: ['jeff', 'jeff from finance', 'finance', 'man'], has: ['mug'] },
        then: {
          text: "Jeff takes the mug. 'World's Okayest Analyst.' He reads it twice. Something in him settles. He will never ask for an Excel export again. Probably.",
          set: { 'jeff.pacified': true }, remove: ['mug'], outcome: 'success', sfx: 'success',
        },
      },
      {
        id: 'village.jeff-no',
        when: { verb: 'say', noun: ['no', 'no jeff', 'never'], flags: [{ flag: 'jeff.pacified', not: true }] },
        then: { text: "'No' is not a file format, Jeff explains.", outcome: 'snark' },
      },
      {
        id: 'village.jeff-yes',
        when: { verb: 'say', noun: ['yes', 'sure', 'ok', 'okay', 'fine'], flags: [{ flag: 'jeff.pacified', not: true }] },
        then: { text: 'Jeff lights up. "Great! Just the whole model. In one tab. Thanks!" He does not leave.', outcome: 'snark' },
      },
      {
        id: 'village.well-ask',
        when: { verb: 'use', noun: ['well', 'q&a well', 'qa well'] },
        then: { text: "You ask the well a question. It answers: '$4,213,908.' You did not ask about money.", outcome: 'snark' },
      },
      {
        id: 'village.well-drink',
        when: { verb: 'drink', noun: ['well', 'water'] },
        then: { text: 'You drink from the Q&A Well. You now know the answer to a question nobody asked. It is 42.', outcome: 'snark' },
      },
    ],
  }),
  room({
    id: 'village.mill', name: 'Dataflow Gen1 Mill', region: 'village',
    describe: (s) =>
      'The Dataflow Gen1 Mill. The wheel still turns, slowly, powered by a scheduled refresh nobody has touched since 2019. A banner reads: DECOMMISSION: Q3.' +
      (s.flags['has.credentials'] ? ' The chest marked CREDENTIALS is empty.' : ' The Miller sits by a chest marked CREDENTIALS.'),
    exits: { s: 'village.square' },
    items: [],
    npcs: ['miller'],
    scene: () => 'village.mill',
    flaskHint: (s) => (s.flags['has.credentials'] ? 'Someone on the water has been waiting for those credentials.' : 'Talk to the Miller, or just open the chest. He will not stop you.'),
    rules: [
      {
        id: 'village.credentials',
        when: { verb: 'talk', noun: ['miller', 'old miller', 'old man', 'the miller'], flags: [{ flag: 'has.credentials', not: true }] },
        then: {
          text: '"Ah, a Report Builder. The Mill\'s being decommissioned, you know. Only thing left in here is the Gen1 credentials. Been stored here since 2019. Take \'em — nobody else remembers the password." He hands you the credentials.',
          give: ['credentials'], set: { 'has.credentials': true }, points: 10, pointsKey: 'village.credentials', sfx: 'item',
        },
      },
      {
        id: 'village.credentials-get',
        when: { verb: 'get', noun: ['credentials', 'creds', 'chest', 'gen1 credentials', 'password'], flags: [{ flag: 'has.credentials', not: true }] },
        then: {
          text: 'You take the credentials from the chest. The Miller nods slowly. "Nobody else remembers the password anyway."',
          give: ['credentials'], set: { 'has.credentials': true }, points: 10, pointsKey: 'village.credentials', sfx: 'item',
        },
      },
      {
        id: 'village.credentials-open',
        when: { verb: 'open', noun: ['chest', 'credentials chest'], flags: [{ flag: 'has.credentials', not: true }] },
        then: {
          text: 'You open the chest. Inside: one scrap of parchment marked CREDENTIALS. You take it. The Miller nods.',
          give: ['credentials'], set: { 'has.credentials': true }, points: 10, pointsKey: 'village.credentials', sfx: 'item',
        },
      },
      {
        id: 'village.mill-use',
        when: { verb: 'use', noun: ['mill', 'wheel', 'banner'] },
        then: { text: 'You try to edit the Mill. A dialog appears: "Dataflow Gen1 is in maintenance mode. Consider upgrading." You consider it.', outcome: 'fail' },
      },
    ],
  }),
  room({
    id: 'village.fields', name: 'Refresh Fields', region: 'village',
    describe: () =>
      'The Refresh Fields. Rows of refreshes sway in the wind, most of them failed. A scarecrow named Manual keeps the birds off. East, the land rises toward the Capacity Peaks; the square is west.',
    exits: { w: 'village.square', e: 'peaks.foothills' },
    items: [],
    npcs: ['scarecrow', 'jeff'],
    scene: () => 'village.fields',
    flaskHint: () => 'East are the Peaks — and, north of the foothills, a fortress. But the Shrine wants three things first.',
    rules: [
      {
        id: 'fields.trigger',
        when: { verb: 'use', noun: ['manual', 'scarecrow', 'scarecrow named manual'] },
        then: { text: 'You trigger Manual by hand. He refreshes. It takes eleven minutes. Nothing was waiting on it.', outcome: 'success' },
      },
      {
        id: 'fields.get-refresh',
        when: { verb: 'get', noun: ['refresh', 'refreshes', 'crops'] },
        then: { text: 'You pick a refresh. It fails in your hand. Error: the gateway is offline. Somewhere, a ferryman weeps.', outcome: 'snark' },
      },
    ],
  }),
]);
