import type { Room } from './types';

const room = (r: Room): [string, Room] => [r.id, r];

const KEY_NOUNS = ['standard key', 'gateway key', 'standard mode key', 'key', 'standard', 'standard gateway key'];
const PERSONAL_NOUNS = ['personal key', 'personal mode key', 'personal', 'personal gateway key'];
const FERRY_NOUNS = ['ferryman', 'ferry man', 'gateway', 'boatman', 'the ferryman'];

export const LAKE_ROOMS: Record<string, Room> = Object.fromEntries([
  room({
    id: 'lake.shore', name: 'OneLake Shore', region: 'lake',
    describe: () =>
      'The shore of the OneLake. It is one lake. There is only ever one. A dock lies east; the marshes of the Lakehouse spread south, colored bronze, then silver, then gold. The village is north.',
    exits: { n: 'village.square', e: 'lake.dock', s: 'swamp.bronze' },
    items: [],
    npcs: [],
    scene: () => 'lake.shore',
    flaskHint: (s) => (s.flags['trial.key'] ? 'South through the marshes, the Gold one has a path east.' : 'The dock is east. The Ferryman there needs something from the Mill.'),
    rules: [
      {
        id: 'lake.swim',
        when: { verb: 'drink', noun: ['lake', 'onelake', 'water'] },
        then: { text: 'You dip a toe in the OneLake. It is exactly one lake deep.', outcome: 'snark' },
      },
      {
        id: 'lake.look-lake',
        when: { verb: 'look', noun: ['lake', 'onelake', 'water', 'the lake'] },
        then: { text: 'The OneLake. Every file in the realm is in there, somewhere, once. Reflected in it you see a workspace you forgot you owned.', outcome: 'success' },
      },
    ],
  }),
  room({
    id: 'lake.dock', name: "Ferryman's Dock", region: 'lake',
    describe: (s) =>
      s.flags['ferry.online']
        ? "The Ferryman's dock. His lamp glows ONLINE. The boat, painted GATEWAY, rocks gently, ready. The shore is west."
        : "The Ferryman's dock. A lamp on the post reads OFFLINE in a sad red. The boat, painted GATEWAY, is tied up. The Ferryman stares at the water. The shore is west.",
    exits: { w: 'lake.shore', e: (s) => (s.flags['ferry.online'] ? 'lake.island' : null) },
    items: ['lamp', 'boat'],
    npcs: ['ferryman'],
    scene: (s) => (s.flags['ferry.online'] ? 'lake.dock-online' : 'lake.dock'),
    flaskHint: (s) =>
      s.flags['ferry.online'] ? 'Board the boat.' :
      s.inventory.includes('credentials') ? 'Give the Ferryman what you are carrying from the Mill.' :
      'The Ferryman needs credentials. Old ones. The Mill north of the square has kept some since 2019.',
    rules: [
      {
        id: 'lake.ferry',
        when: { verb: 'give', noun: ['credentials', 'creds', 'gen1 credentials', 'password', 'parchment'], noun2: FERRY_NOUNS, has: ['credentials'] },
        then: {
          text: "The Ferryman takes the credentials with shaking hands. The lamp flickers… ONLINE. 'Standard mode,' he whispers, and begins to weep. 'Board when ready.'",
          set: { 'ferry.online': true }, remove: ['credentials'], points: 15, sfx: 'door',
        },
      },
      {
        id: 'lake.ferry-use',
        when: { verb: 'use', noun: ['credentials', 'creds'], noun2: [...FERRY_NOUNS, 'lamp', 'boat'], has: ['credentials'] },
        then: {
          text: "You hand the Ferryman the credentials. The lamp flickers… ONLINE. 'Standard mode,' he whispers, and begins to weep. 'Board when ready.'",
          set: { 'ferry.online': true }, remove: ['credentials'], points: 15, pointsKey: 'lake.ferry', sfx: 'door',
        },
      },
      {
        id: 'lake.board',
        when: { verb: 'board', flags: [{ flag: 'ferry.online' }] },
        then: { text: 'You board the GATEWAY. The crossing takes exactly as long as the first refresh after a gateway update.', moveTo: 'lake.island', sfx: 'move' },
      },
      {
        id: 'lake.board-offline',
        when: { verb: 'board', flags: [{ flag: 'ferry.online', not: true }] },
        then: { text: 'The Ferryman shakes his head. OFFLINE. You could swim, but the OneLake is one lake deep, and that is very deep.', outcome: 'fail' },
      },
      {
        id: 'lake.east-offline',
        when: { verb: 'go', dir: 'e', flags: [{ flag: 'ferry.online', not: true }] },
        then: { text: 'The boat is tied up and the Ferryman is OFFLINE. Nothing crosses the OneLake without a gateway.', outcome: 'fail' },
      },
      {
        id: 'lake.use-lamp',
        when: { verb: 'use', noun: ['lamp', 'status lamp', 'post'] },
        then: { text: 'You tap the lamp. It blinks OFFLINE a little faster, which is somehow worse.', outcome: 'fail' },
      },
    ],
  }),
  room({
    id: 'lake.island', name: 'Isle of Gateway', region: 'lake',
    describe: (s) =>
      'The Isle of Gateway. A stone plinth holds two keys: a PERSONAL key and a STANDARD key. A plaque reads: CHOOSE. THEN LIVE WITH IT.' +
      (s.flags['taken.standard key'] ? ' The STANDARD key is gone.' : '') +
      (s.flags['taken.personal key'] ? ' The PERSONAL key is gone.' : '') +
      ' The boat waits to take you back west.',
    exits: { w: 'lake.dock' },
    items: ['personal key', 'standard key'],
    npcs: [],
    scene: () => 'lake.island',
    flaskHint: (s) => (s.flags['trial.key'] ? 'Board the boat back. Two trials remain, unless they don\'t.' : 'One key works for everyone. The other works for one person with an open laptop. Choose like a grown-up.'),
    rules: [
      {
        id: 'lake.key',
        when: { verb: 'get', noun: KEY_NOUNS, flags: [{ flag: 'taken.standard key', not: true }] },
        then: {
          text: 'You take the STANDARD key. It is heavy in the way things are heavy when many people depend on them.',
          give: ['standard key'], set: { 'trial.key': true }, points: 20, sfx: 'item',
        },
      },
      {
        id: 'lake.personal',
        when: { verb: 'get', noun: PERSONAL_NOUNS, flags: [{ flag: 'taken.personal key', not: true }] },
        then: {
          text: 'You take the PERSONAL key. It only works for you, and only while your laptop is open. You feel a strong urge to close your laptop.',
          give: ['personal key'], outcome: 'snark', sfx: 'snark',
        },
      },
      {
        id: 'lake.board-back',
        when: { verb: 'board' },
        then: { text: 'You ride the GATEWAY back. The Ferryman hums. It is the first time anyone has heard him hum.', moveTo: 'lake.dock', sfx: 'move' },
      },
      {
        id: 'lake.read-plaque',
        when: { verb: 'read', noun: ['plaque', 'plinth', 'sign'] },
        then: { text: 'CHOOSE. THEN LIVE WITH IT. — The Gateway Council, 2018', outcome: 'success' },
      },
    ],
  }),
  room({
    id: 'swamp.bronze', name: 'Bronze Marsh', region: 'swamp',
    describe: () =>
      "The Bronze Marsh. Raw data pools in every footprint. Nothing has a type. Nothing has a name. A CSV floats by with 'Column1, Column2, Column3' on its face. The shore is north; the marsh silvers to the south.",
    exits: { n: 'lake.shore', s: 'swamp.silver' },
    items: ['water'],
    npcs: [],
    scene: () => 'swamp.bronze',
    flaskHint: () => 'Do not drink here. Keep going south until things have names.',
    rules: [
      {
        id: 'death.bronze',
        when: { verb: 'drink' },
        then: { text: 'You drink raw data. Nothing is typed. Everything is a string. You are a string.', death: 'death.bronze' },
      },
      {
        id: 'swamp.get-csv',
        when: { verb: 'get', noun: ['csv', 'file', 'column1'] },
        then: { text: 'You grab the CSV. It has 3 columns and 9 million rows, and every one of them is a header. You let it go.', outcome: 'snark' },
      },
    ],
  }),
  room({
    id: 'swamp.silver', name: 'Silver Marsh', region: 'swamp',
    describe: () =>
      'The Silver Marsh. The water is cleaner here, and slightly judgmental. Transaction logs drift by in neat JSON. Bronze is north; the marsh turns gold to the south.',
    exits: { n: 'swamp.bronze', s: 'swamp.gold' },
    items: ['log'],
    npcs: [],
    scene: () => 'swamp.silver',
    flaskHint: () => 'The Gold Marsh south of here has something worth carrying, and a path to a monastery.',
    rules: [
      {
        id: 'swamp.drink-silver',
        when: { verb: 'drink' },
        then: { text: 'You drink Silver water. It has been deduplicated. You feel slightly less redundant.', outcome: 'snark' },
      },
    ],
  }),
  room({
    id: 'swamp.gold', name: 'Gold Marsh', region: 'swamp',
    describe: (s) =>
      'The Gold Marsh. Everything here has a business name and a data type. It is beautiful.' +
      (s.flags['taken.shortcut'] ? ' Where the signpost stood, the marsh is somehow unchanged.' : ' A signpost reading SHORTCUT stands at the water\'s edge, pointing everywhere at once.') +
      ' Silver is north; east, a path climbs to a monastery.',
    exits: { n: 'swamp.silver', e: 'monastery.gate' },
    items: ['shortcut'],
    npcs: [],
    scene: (s) => (s.flags['taken.shortcut'] ? 'swamp.gold-nosign' : 'swamp.gold'),
    flaskHint: (s) => (s.flags['taken.shortcut'] ? 'Use the shortcut whenever the walk back feels long. Then go east.' : 'That signpost is lighter than it looks. Take it.'),
    rules: [
      {
        id: 'swamp.shortcut',
        when: { verb: 'get', noun: ['shortcut', 'signpost', 'sign', 'onelake shortcut', 'pointer'], flags: [{ flag: 'taken.shortcut', not: true }] },
        then: { text: "You pick up the Shortcut. It weighs nothing. It's just a pointer.", give: ['shortcut'], points: 10, sfx: 'item' },
      },
      {
        id: 'swamp.drink-gold',
        when: { verb: 'drink' },
        then: { text: 'You drink Gold water. It tastes like a well-named measure.', outcome: 'snark' },
      },
    ],
  }),
]);
