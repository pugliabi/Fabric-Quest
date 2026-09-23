import type { GameState } from '../engine/types';
import type { Cond, Room, Rule } from './types';

const room = (r: Room): [string, Room] => [r.id, r];

const JEFF = ['jeff', 'jeff from finance', 'finance', 'man'];
const NOTE = ['sticky note', 'note', 'sticky', 'post it', 'postit'];

/** Things you can hand Jeff that are not a mug. He reads them; he keeps none of them. */
const jeffGifts = (prefix: string, flags: Cond[] = []): Rule[] => [
  {
    id: `${prefix}.give-note-jeff`,
    when: { verb: 'give', noun: NOTE, noun2: JEFF, has: ['jeff-note'], flags },
    then: { text: "He reads it. 'That's mine.' He does not take it back. He does, however, look at you like you touched his refresh.", outcome: 'snark' },
  },
  {
    id: `${prefix}.give-receipt-jeff`,
    when: { verb: 'give', noun: ['receipt', 'cu receipt', 'bill'], noun2: JEFF, has: ['receipt'], flags },
    then: { text: "Jeff reads the receipt twice. '400 CU-seconds. For ONE step.' He expenses it on the spot. It is the first number in the realm he has ever trusted.", outcome: 'snark' },
  },
];

/** Where the quest goes after the village, in golden-path order: the Keep (moat), the Monastery behind it (hoodie), the Lake (key). */
const onward = (s: GameState): string =>
  !s.flags['trial.moat'] ? 'Go east through the Fields, then north into the Keep. That is where you learn to smell like a Warehouse.' :
  !s.flags['trial.hoodie'] ? 'Go east, then north through the Keep. The monks are behind it, and so is your hoodie.' :
  !s.flags['trial.key'] ? 'Go south to the OneLake. The key you need is across the water.' :
  'Go east, then east, then east. The Peaks. The dragon. The rest of your career.';

export const VILLAGE_ROOMS: Record<string, Room> = Object.fromEntries([
  room({
    id: 'village.cottage', name: 'Your Cottage', region: 'village',
    enterQuip: () => 'A cottage. A desk. A report. Home, technically.',
    describe: (s) =>
      "Your cottage. A workspace, technically. One desk, one candle, one report you have been 'about to finish' since spring." +
      (s.flags['taken.mug'] ? ' The desk looks lonely without the mug.' : ' A mug sits on the desk.') +
      ' The door is out, to the east.',
    exits: { out: 'village.square', e: 'village.square' },
    items: ['report', 'mug', 'bed', 'candle', 'desk', 'window', 'cottage-door', 'jeff-note'],
    npcs: [],
    scene: () => 'village.cottage',
    flaskHint: (s) =>
      !s.flags['taken.mug'] ? 'Get the mug. Someone in the square wants it more than you do.' :
      !s.flags['prophecy.read'] ? 'Go out, east, to the square. Read the notice board. It is a prophecy, and also a feature request.' :
      'Go out. The quest is not in this cottage. It never was.',
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
        when: { verb: 'use', noun: ['bed', 'cot', 'bunk', 'blanket', 'pillow'] },
        then: { text: 'You lie down. Not now. There is a dragon. Also the 2 AM refresh would run across your face.', outcome: 'fail' },
      },
      {
        id: 'cottage.candle',
        when: { verb: 'use', noun: ['candle', 'light', 'flame', 'wax'] },
        then: { text: 'You hold the candle up. The room gets no bigger. The report gets no shorter.', outcome: 'fail' },
      },
      {
        id: 'cottage.desk',
        when: { verb: 'use', noun: ['desk', 'table', 'workbench', 'workstation'] },
        then: { text: 'You sit at the desk and open the report. Page 12 is still a pie chart with 31 slices. You close the report. Somewhere, a dragon throttles.', outcome: 'fail' },
      },
      {
        id: 'cottage.window',
        when: { verb: 'use', noun: ['window', 'glass', 'shutters'] },
        then: { text: 'You open the window. Jeff from Finance, in the square, looks up hopefully. You close the window.', outcome: 'fail' },
      },
      {
        id: 'cottage.open-window',
        when: { verb: 'open', noun: ['window', 'glass', 'shutters'] },
        then: { text: 'You open the window. Jeff from Finance, in the square, looks up hopefully. You close the window.', outcome: 'fail' },
      },
      {
        id: 'cottage.open-door',
        when: { verb: 'open', noun: ['door', 'front door', 'exit door'] },
        then: { text: 'It is already open. It is always open. Try: out.', outcome: 'fail' },
      },
      {
        id: 'cottage.use-note',
        when: { verb: 'use', noun: NOTE, noun2: ['report', 'pbix', 'file', 'desk'], has: ['jeff-note'] },
        then: { text: 'You stick DO NOT REFRESH on the report. The report has not refreshed since spring. Jeff, somehow, is already satisfied.', outcome: 'snark' },
      },
    ],
  }),
  room({
    id: 'village.square', name: 'Village Square', region: 'village',
    enterQuip: () => 'A square. A well. A man with a spreadsheet. You are going to regret the spreadsheet.',
    describe: (s) =>
      'The Village Square. A well, a notice board, and roads going north to the Mill, east to the Refresh Fields, and south toward the OneLake.' +
      (s.flags['jeff.pacified'] ? ' Jeff from Finance sits by the well, content.' : ' Jeff from Finance is here, holding an empty spreadsheet like a begging bowl.'),
    exits: { n: 'village.mill', e: 'village.fields', s: 'lake.shore', w: 'village.cottage' },
    items: ['board', 'well', 'lanyard'],
    npcs: ['jeff'],
    scene: (s) => (s.flags['jeff.pacified'] ? 'village.square-calm' : 'village.square'),
    flaskHint: (s) =>
      !s.flags['prophecy.read'] ? 'Read the notice board. Out loud, if it helps. It will not help.' :
      !s.flags['jeff.pacified'] ? (s.inventory.includes('mug')
        ? 'Give the mug to Jeff. Nothing else will make him stop.'
        : 'Go west and get the mug off your desk. Then give it to Jeff. Nothing else will make him stop.') :
      !s.flags['has.credentials'] ? 'Go north to the Mill. Talk to the Miller. He has something a Ferryman will cry about later.' :
      onward(s),
    rules: [
      {
        id: 'village.prophecy',
        when: { verb: 'read', noun: ['board', 'notice', 'notice board', 'sign', 'prophecy', 'noticeboard'] },
        then: {
          text:
            'THE PROPHECY\n\nWhen the Dragon throttles the Refreshes of the night,\nOne shall climb the Peaks and set the Model right.\nBut the Shrine door opens only for the Worthy Three:\nLook like an Engineer. Smell like a Warehouse. Hold the Gateway Key.\n\nBelow it, in different handwriting: "export to excel".\nAnd in a third hand, squeezed in beside "Look like an Engineer": "the monks are behind the Keep".',
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
      ...jeffGifts('square'),
      {
        id: 'village.well-drink',
        when: { verb: 'drink', noun: ['well', 'water'] },
        then: { text: 'You drink from the Q&A Well. You now know the answer to a question nobody asked. It is 42.', outcome: 'snark' },
      },
    ],
  }),
  room({
    id: 'village.mill', name: 'Dataflow Gen1 Mill', region: 'village',
    enterQuip: () => 'The Mill. Deprecated since Q3. Which Q3, nobody says.',
    describe: (s) =>
      'The Dataflow Gen1 Mill. The wheel still turns, slowly, powered by a scheduled refresh nobody has touched since 2019. A banner reads: DECOMMISSION: Q3.' +
      (s.flags['has.credentials'] ? ' The chest marked CREDENTIALS is empty.' : ' The Miller sits by a chest marked CREDENTIALS.'),
    exits: { s: 'village.square' },
    items: ['wheel', 'banner', 'chest', 'usb stick'],
    npcs: ['miller'],
    scene: () => 'village.mill',
    flaskHint: (s) => (s.flags['has.credentials']
      ? 'Go south. When you reach the OneLake dock, give those credentials to the Ferryman. He has been waiting since 2021.'
      : 'Talk to the Miller. Or just open the chest. He will not stop you. He stopped stopping people in 2019.'),
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
        id: 'village.mill-usb',
        when: { verb: 'use', noun: ['usb stick', 'usb', 'stick', 'usb drive', 'thumb drive', 'flash drive', 'final_v2'], noun2: ['wheel', 'mill', 'mill wheel', 'water wheel'], has: ['usb stick'] },
        then: { text: 'You plug FINAL_v2 into the Mill. The Mill accepts it. Nothing changes. It was already running that.', outcome: 'snark' },
      },
      {
        id: 'village.give-usb-miller',
        when: { verb: 'give', noun: ['usb stick', 'usb', 'stick', 'usb drive', 'thumb drive', 'flash drive', 'final_v2'], noun2: ['miller', 'old miller', 'old man', 'the miller'], has: ['usb stick'] },
        then: { text: "The Miller turns FINAL_v2 over in his hands. 'I wrote this,' he says. 'In 2019. There is a FINAL_v3. Nobody has ever found it.' He hands it back.", outcome: 'snark' },
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
    enterQuip: () => 'Rows of refreshes. Most of them failed overnight. So did you, once.',
    describe: () =>
      'The Refresh Fields. Rows of refreshes sway in the wind, most of them failed. A scarecrow named Manual keeps the birds off. East, the land rises toward the Capacity Peaks; the square is west.',
    exits: { w: 'village.square', e: 'peaks.foothills' },
    items: ['crops', 'seed'],
    npcs: ['scarecrow', 'jeff'],
    scene: () => 'village.fields',
    flaskHint: (s) => (!s.flags['trial.moat'] || !s.flags['trial.hoodie']
      ? 'Go east to the Foothills, then north into the Keep. The Monastery is behind it.'
      : !s.flags['trial.key'] ? 'Go west to the square, then south to the OneLake. The key is across the water.' : 'Go east. Then keep going east. The Peaks do not climb themselves.'),
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
      {
        id: 'fields.plant-seed',
        when: { verb: 'use', verbWord: ['use', 'plant', 'put', 'insert'], noun: ['seed', 'refresh seed', 'seeds'], has: ['seed'] },
        then: { text: 'You plant it. A tiny refresh sprouts, considers its options, and fails. It had its whole life ahead of it. Most of that was retries.', remove: ['seed'], set: { 'seed.planted': true }, outcome: 'snark' },
      },
      {
        id: 'fields.plant-again',
        when: { verb: 'use', noun: ['seed', 'refresh seed', 'seeds'], notHas: ['seed'], flags: [{ flag: 'seed.planted' }] },
        then: { text: 'You already planted it. It already failed. You are standing over its tiny grave, holding nothing, which is also how most on-call rotations end.', outcome: 'snark' },
      },
      ...jeffGifts('fields', [{ flag: 'jeff.pacified', not: true }]),
    ],
  }),
]);
