import type { GameState } from '../engine/types';
import type { PhraseRule, Room, RuleThen } from './types';

const room = (r: Room): [string, Room] => [r.id, r];

const KEY_NOUNS = ['standard key', 'gateway key', 'standard mode key', 'key', 'standard', 'standard gateway key'];
const PERSONAL_NOUNS = ['personal key', 'personal mode key', 'personal', 'personal gateway key'];
const FERRY_NOUNS = ['ferryman', 'ferry man', 'gateway', 'boatman', 'the ferryman'];
const LAKE_NOUNS = ['lake', 'onelake', 'water', 'the lake', 'one lake'];
const PEBBLE = ['pebble', 'skipping stone', 'flat pebble', 'stone'];
const MARSH = ['marsh', 'gold marsh', 'water', 'itself', 'here', 'the marsh'];
const SKIP: RuleThen = {
  text: 'Skip. Skip. Sink. Three hops, then it becomes a Delta file. Somewhere a table gains one row: pebble, 1, you.',
  remove: ['pebble'], set: { 'pebble.skipped': true }, outcome: 'snark',
};

/** Past the Lake: the shortcut, then the Peaks (or whatever trial is still dark). */
const afterKey = (s: GameState): string =>
  !s.flags['taken.shortcut'] ? 'Go south, through Bronze and Silver, to the Gold Marsh. Get the signpost. It is lighter than it looks.' :
  !s.flags['trial.moat'] || !s.flags['trial.hoodie'] ? 'Go north to the square, then east and north into the Keep. The Worthy Three are not going to collect themselves.' :
  'Go north to the square, then east, east, east. The Peaks. Bring the key.';

export const LAKE_ROOMS: Record<string, Room> = Object.fromEntries([
  room({
    id: 'lake.shore', name: 'OneLake Shore', region: 'lake',
    enterQuip: () => 'The OneLake. One. Lake. They were very clear about the number.',
    describe: () =>
      "The shore of the OneLake. It is one lake. There is only ever one. A dock lies east; the marshes of the Lakehouse spread south, colored bronze, then silver, then gold. The village is north. West, at the water's edge, a house. On the lake.",
    exits: { n: 'village.square', e: 'lake.dock', s: 'swamp.bronze', w: 'lake.house' },
    items: ['pebble'],
    npcs: [],
    scene: () => 'lake.shore',
    flaskHint: (s) =>
      s.flags['trial.key'] ? afterKey(s) :
      s.flags['ferry.online'] ? 'Go east to the dock and board the boat. The Ferryman is ONLINE and would like to feel useful.' :
      s.inventory.includes('credentials') ? 'Go east to the dock. Give the Ferryman your credentials. Watch a grown man weep.' :
      'Go east to the dock and talk to the Ferryman. Then go get him credentials from the Mill, north of the square.',
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
      { id: 'lake.skip-pebble', when: { verb: 'use', noun: PEBBLE, noun2: LAKE_NOUNS, has: ['pebble'] }, then: SKIP },
      { id: 'lake.skip-pebble-bare', when: { verb: 'use', verbWord: ['skip'], noun: PEBBLE, has: ['pebble'] }, then: SKIP },
      {
        id: 'lake.skip-pebble-again',
        when: { verb: 'use', noun: PEBBLE, notHas: ['pebble'], flags: [{ flag: 'pebble.skipped' }] },
        then: { text: 'The pebble is a Delta file now. It has a transaction log. It has moved on. You should too.', outcome: 'snark' },
      },
    ],
  }),
  room({
    id: 'lake.dock', name: "Ferryman's Dock", region: 'lake',
    enterQuip: () => 'A dock. A boat. A Ferryman who has been "offline" since the credentials expired.',
    describe: (s) =>
      s.flags['ferry.online']
        ? "The Ferryman's dock. His lamp glows ONLINE. The boat, painted GATEWAY, rocks gently, ready. The shore is west."
        : "The Ferryman's dock. A lamp on the post reads OFFLINE in a sad red. The boat, painted GATEWAY, is tied up. The Ferryman stares at the water. The shore is west.",
    exits: { w: 'lake.shore', e: (s) => (s.flags['ferry.online'] ? 'lake.island' : null) },
    items: ['lamp', 'boat', 'timetable'],
    npcs: ['ferryman'],
    scene: (s) => (s.flags['ferry.online'] ? 'lake.dock-online' : 'lake.dock'),
    flaskHint: (s) =>
      s.flags['ferry.online'] ? (s.flags['trial.key'] ? afterKey(s) : 'Board the boat. It is ONLINE. It will not stay that way forever. Nothing does.') :
      s.inventory.includes('credentials') ? 'Give the credentials to the Ferryman. He has been waiting since 2021. Do not make him wait while you look for the verb.' :
      'The Ferryman needs credentials. The Mill has them. Go get them: west, north, north, and talk to the Miller.',
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
        id: 'lake.give-lanyard',
        when: { verb: 'give', noun: ['lanyard', 'fabcon lanyard', 'conference lanyard', 'badge'], noun2: FERRY_NOUNS, has: ['lanyard'] },
        then: { text: "'FabCon?' The Ferryman almost smiles. 'I was there. In spirit. My credentials had expired.' He hands it back, carefully, like it might still get him into a session.", outcome: 'snark' },
      },
      {
        id: 'lake.give-timetable',
        when: { verb: 'give', noun: ['timetable', 'ferry timetable', 'schedule', 'ferry schedule'], noun2: FERRY_NOUNS, has: ['timetable'] },
        then: { text: (s) => (s.flags['ferry.online']
          ? "The Ferryman crosses out OFFLINE on the timetable and writes ONLINE. Then, after a moment, 'for now'. He hands it back."
          : "The Ferryman reads the timetable. 'Eight departures a day. On a Pro license.' He laughs until his lamp flickers, then stops, because it did not flicker ONLINE."), outcome: 'snark' },
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
    enterQuip: () => 'An island with two keys and a plaque that says CHOOSE. Classic.',
    describe: (s) =>
      'The Isle of Gateway. A stone plinth holds two keys: a PERSONAL key and a STANDARD key. A plaque reads: CHOOSE. THEN LIVE WITH IT.' +
      (s.flags['taken.standard key'] ? ' The STANDARD key is gone.' : '') +
      (s.flags['taken.personal key'] ? ' The PERSONAL key is gone.' : '') +
      ' The boat waits to take you back west.',
    exits: { w: 'lake.dock' },
    items: ['personal key', 'standard key', 'plinth', 'plaque'],
    npcs: [],
    scene: () => 'lake.island',
    flaskHint: (s) => (s.flags['trial.key']
      ? 'Board the boat back. You have the key. The rest of the quest is on the mainland, where you left it.'
      : 'Get the standard key. The personal one works for one person with an open laptop. Choose like a grown-up.'),
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
      {
        id: 'lake.personal-plinth',
        when: { verb: 'use', noun: PERSONAL_NOUNS, noun2: ['plinth', 'stone plinth', 'stand', 'hollow'], has: ['personal key'] },
        then: { text: 'It fits. It is yours alone. Nobody else can ever use it. That is the problem.', outcome: 'snark' },
      },
    ],
  }),
  room({
    id: 'swamp.bronze', name: 'Bronze Marsh', region: 'swamp',
    enterQuip: () => 'Everything here is a string. Including, briefly, you.',
    describe: () =>
      "The Bronze Marsh. Raw data pools in every footprint. Nothing has a type. Nothing has a name. A CSV floats by with 'Column1, Column2, Column3' on its face. The shore is north; the marsh silvers to the south.",
    exits: { n: 'lake.shore', s: 'swamp.silver' },
    items: ['water', 'csv', 'stress ball'],
    npcs: [],
    scene: () => 'swamp.bronze',
    flaskHint: (s) => (s.inventory.includes('shortcut')
      ? 'Use the shortcut. You are carrying a pointer and walking through raw data anyway.'
      : 'Do not drink anything. Go south until things have names.'),
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
      {
        id: 'swamp.tag-csv',
        when: { verb: 'use', noun: ['name tag', 'tag', 'nametag', 'hello tag'], noun2: ['csv', 'file', 'column1', 'column2', 'column3', 'the csv'], has: ['name tag'] },
        then: { text: "You stick 'Column3' on the CSV. It already had a Column3. Power Query notices and helpfully renames yours Column3_1. You have made it worse, with a suffix.", outcome: 'snark' },
      },
    ],
  }),
  room({
    id: 'swamp.silver', name: 'Silver Marsh', region: 'swamp',
    enterQuip: () => 'Silver Marsh. Things have names now. Some of them are wrong, but they have names.',
    describe: () =>
      'The Silver Marsh. The water is cleaner here, and slightly judgmental. Transaction logs drift by in neat JSON. Bronze is north; the marsh turns gold to the south.',
    exits: { n: 'swamp.bronze', s: 'swamp.gold' },
    items: ['log', 'name tag'],
    npcs: [],
    scene: () => 'swamp.silver',
    flaskHint: (s) => (s.inventory.includes('shortcut')
      ? 'Use the shortcut. Walking back is for people without pointers.'
      : 'Go south to the Gold Marsh. Get the signpost there. It weighs nothing; it is just a pointer.'),
    rules: [
      {
        id: 'swamp.drink-silver',
        when: { verb: 'drink' },
        then: { text: 'You drink Silver water. It has been deduplicated. You feel slightly less redundant.', outcome: 'snark' },
      },
      {
        id: 'swamp.read-columns',
        when: { verb: 'read', noun: ['column names', 'columns', 'column', 'names', 'column name', 'headers'] },
        then: { text: 'Column1 became CustomerName. Column2 became Customer_Name. Column3 is still Column3. Its name tag is floating nearby, unclaimed.', outcome: 'success' },
      },
    ],
  }),
  room({
    id: 'swamp.gold', name: 'Gold Marsh', region: 'swamp',
    enterQuip: () => 'Gold Marsh. Clean, modeled, and suspiciously quiet.',
    describe: (s) =>
      'The Gold Marsh. Everything here has a business name and a data type. It is beautiful.' +
      (s.flags['taken.shortcut'] ? ' Where the signpost stood, the marsh is somehow unchanged.' : ' A signpost reading SHORTCUT stands at the water\'s edge, pointing everywhere at once.') +
      ' Silver is north; east, a path climbs to a monastery.',
    exits: { n: 'swamp.silver', e: 'monastery.gate' },
    items: ['shortcut'],
    npcs: [],
    scene: (s) => (s.flags['taken.shortcut'] ? 'swamp.gold-nosign' : 'swamp.gold'),
    flaskHint: (s) => (!s.flags['taken.shortcut']
      ? 'Get the signpost. It is a shortcut. It weighs nothing. It is just a pointer.'
      : s.inventory.includes('shortcut') ? 'Use the shortcut to get back to the shore, no data moved. Or go east, if the monks still owe you a hoodie.'
        : 'Go east to the Monastery, or north the long way. You dropped your pointer somewhere, which is very on brand.'),
    rules: [
      {
        id: 'swamp.shortcut',
        when: { verb: 'get', noun: ['shortcut', 'signpost', 'sign', 'onelake shortcut', 'pointer'], flags: [{ flag: 'taken.shortcut', not: true }] },
        then: { text: "You pick up the Shortcut. It weighs nothing. It's just a pointer.", give: ['shortcut'], points: 10, sfx: 'item' },
      },
      {
        // Room rules run before the global use-shortcut teleport, so this one stays put.
        id: 'swamp.shortcut-marsh',
        when: { verb: 'use', noun: ['shortcut', 'signpost', 'sign', 'onelake shortcut', 'pointer'], noun2: MARSH, has: ['shortcut'] },
        then: { text: 'The shortcut points at itself. The marsh briefly contains the marsh. No data was moved. Nothing was learned.', outcome: 'snark' },
      },
      {
        id: 'swamp.drink-gold',
        when: { verb: 'drink' },
        then: { text: 'You drink Gold water. It tastes like a well-named measure.', outcome: 'snark' },
      },
    ],
  }),
  room({
    id: 'lake.house', name: 'The Lake House', region: 'lake',
    describe: () => "A house. On a lake. That's it. That's the whole thing. Somebody in marketing is very proud. A porch, a deck chair, a mailbox, and a sign that says LAKEHOUSE in two fonts. The shore is east.",
    exits: { e: 'lake.shore' }, items: ['porch-sign', 'deck-chair', 'mailbox', 'house-door'], npcs: [],
    scene: () => 'lake.house',
    enterQuip: () => 'A house. On a lake. Take a moment.',
    flaskHint: () => 'This room is a joke. The joke is the whole room. The shore is east.',
    rules: [
      { id: 'lake.house.enter', when: { verb: 'open', noun: ['door', 'house', 'front door'] }, then: { text: 'Inside: files on the left, tables on the right, and a shortcut to another house across the lake. You back out slowly.', outcome: 'fail' } },
      { id: 'lake.house.in', when: { verb: 'go', dir: 'in' }, then: { text: 'Inside: files on the left, tables on the right, and a shortcut to another house across the lake. You back out slowly.', outcome: 'fail' } },
      { id: 'lake.house.sit', when: { verb: 'use', noun: ['chair', 'deck chair', 'sit', 'porch'] }, then: { text: 'You sit on the deck. The lake refreshes. It is lovely. You are billed.', outcome: 'fail' } },
      { id: 'lake.house.knock', when: { verb: 'use', noun: ['knock', 'door'] }, then: { text: 'Nobody answers. A Spark session starts inside, out of politeness.', outcome: 'fail' } },
      { id: 'lake.house.buy', when: { verb: 'use', noun: ['buy', 'buy house', 'house', 'purchase'] }, then: { text: 'It is not for sale. It is for storage. Very different, the realtor insists, without making eye contact.', outcome: 'fail' } },
      { id: 'lake.house.fish', when: { verb: 'use', noun: ['fish', 'fishing', 'rod'] }, then: { text: 'You fish. You catch a Delta log. You put it back; it was not fully committed.', outcome: 'fail' } },
    ],
  }),
]);

/**
 * Raw-line commands at the Lake House. Registered ahead of PHRASE_RULES (see world/index.ts), so these scoped
 * lines beat the global eggs they overlap (sit, swim, knock, buy, fish).
 */
export const LAKEHOUSE_PHRASES: PhraseRule[] = [
  { id: 'lake.house.sit-egg', room: 'lake.house', test: /^(sit|sit down|sit in chair|sit on porch|rest)$/, text: 'You sit on the deck. The lake refreshes. It is lovely. You are billed.' },
  { id: 'lake.house.swim-egg', room: 'lake.house', test: /^(swim|dive|jump in|wade)\b/, text: 'You wade in. It is a lake. It is also, somehow, a house. You are now inside a house while swimming. You get out.' },
  { id: 'lake.house.knock-egg', room: 'lake.house', test: /^knock\b/, text: 'Nobody answers. A Spark session starts inside, out of politeness.' },
  { id: 'lake.house.buy-egg', room: 'lake.house', test: /^(buy|purchase|make an offer)\b/, text: 'It is not for sale. It is for storage. Very different, the realtor insists, without making eye contact.' },
  { id: 'lake.house.fish-egg', room: 'lake.house', test: /^(fish|go fishing|cast)\b/, text: 'You fish. You catch a Delta log. You put it back; it was not fully committed.' },
];
