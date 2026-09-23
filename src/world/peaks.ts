import type { PhraseRule, Room } from './types';
import type { GameState } from '../engine/types';
import { sigilStatus } from './items';

const room = (r: Room): [string, Room] => [r.id, r];

const DRAGON = ['dragon', 'throttlor', 'throttlor the capacity dragon', 'capacity dragon', 'the dragon'];
const MODEL = ['model', 'golden semantic model', 'semantic model', 'golden model', 'the model'];
const DOOR = ['door', 'shrine door', 'great door', 'shrine', 'sigils', 'sigil'];

const worthy = (s: GameState): boolean => !!s.flags['trial.hoodie'] && !!s.flags['trial.moat'] && !!s.flags['trial.key'];
const darkSigils = (s: GameState): string => {
  const dark = [
    !s.flags['trial.hoodie'] && 'the HOODIE sigil (look like an Engineer)',
    !s.flags['trial.moat'] && 'the STINK LINES sigil (smell like a Warehouse)',
    !s.flags['trial.key'] && 'the KEY sigil (hold the Gateway Key)',
  ].filter((x): x is string => !!x);
  return dark.length ? `Still dark: ${dark.join('; ')}.` : 'All sigils glow.';
};

/** The next trial still dark, as the thing to go and do (golden-path order: moat, hoodie, key). */
const nextTrial = (s: GameState): string =>
  !s.flags['trial.moat'] ? 'Go north into the Keep. You need to smell like a Warehouse, and the Keep has a moat for that.' :
  !s.flags['trial.hoodie'] ? 'Go north, through the Keep, to the Monastery behind it. Get the hoodie. Wear the hoodie.' :
  'Go west, back through the Fields to the square, then south to the OneLake. Get the standard key.';

const lowerFirst = (t: string): string => t.charAt(0).toLowerCase() + t.slice(1);

/** The Ledge's demand, minus whatever you have already done. nextTrial() is worded from the Foothills, so say how to get there. */
const worthyToDo = (s: GameState): string => {
  const todo = [
    !s.flags['trial.hoodie'] && 'wear the hoodie',
    !s.flags['trial.moat'] && 'smell like the moat',
    !s.flags['trial.key'] && 'hold the key',
  ].filter((x): x is string => !!x);
  return todo.length === 3
    ? 'The door wants the Worthy Three: wear the hoodie, smell like the moat, hold the key. Go south and get started.'
    : `The door still wants: ${todo.join(', ')}. North is the Shrine door, and it is not opening for you yet. Go back south to the Foothills. From there: ${lowerFirst(nextTrial(s))}`;
};

const DRAGON_THERE = [{ flag: 'dragon.gone', not: true }];
const ROCK = ['flat rock', 'rock', 'flat stone', 'stone'];
const NO_ROCK = 'You mime throwing a rock. You do not have a rock. The Foothills had one. The Foothills are very far away now.';
const ROCK_TEXT = 'You throw a rock at a capacity dragon. It bills you for the throw. Itemized. With a surcharge for aim.';

const WORTHY_AND_CLOSED = [
  { flag: 'trial.hoodie' }, { flag: 'trial.moat' }, { flag: 'trial.key' }, { flag: 'shrine.open', not: true },
];

const DOOR_OPENS = {
  text: 'The three sigils blaze. Hoodie. Stink. Key. The door grinds open. You are Worthy, apparently.',
  set: { 'shrine.open': true }, points: 5, pointsKey: 'peaks.shrine-door', sfx: 'door',
};

const ENDING =
  "You lift the Golden Semantic Model.\n\nIt is one table.\n\n412 columns. The first is named Column1. There is a measure named 'Measure 2 (copy)'. Half the columns are dates stored as text. There is a column called 'Notes' that contains, in row 8,041, the phrase 'ask Jeff'.\n\nYou weep. Then you carry it down the mountain anyway. The village's refreshes run that night, slow but unthrottled, and the people cheer, and nobody asks what the Model looks like inside.\n\nTHE END.";

/**
 * Raw-line commands on the Peaks, registered ahead of PHRASE_RULES (see world/index.ts) so the scoped line beats egg.throw:
 * "throw rock at dragon" is the obvious way to say the rock gag.
 */
export const PEAKS_PHRASES: PhraseRule[] = [
  {
    id: 'peaks.throw-rock', room: 'peaks.shrine', test: /^(throw|toss|chuck|hurl|lob)\b.*\b(rock|stone)\b.*\b(dragon|throttlor)\b/,
    text: (s) => (!s.inventory.includes('flat-rock') ? NO_ROCK
      : s.flags['dragon.gone'] ? 'You throw the rock at where the dragon used to be. Nobody bills you. It feels wrong. You pick it back up.'
        : ROCK_TEXT),
  },
  {
    // Any other target (or none): still in the Shrine, still billed.
    id: 'peaks.throw-rock-elsewhere', room: 'peaks.shrine', test: /^(throw|toss|chuck|hurl|lob)\b.*\b(rock|stone)\b/,
    text: (s) => (s.inventory.includes('flat-rock') ? 'You throw the rock. It lands. The realm bills you for the landing.' : NO_ROCK),
  },
];

export const PEAKS_ROOMS: Record<string, Room> = Object.fromEntries([
  room({
    id: 'peaks.foothills', name: 'Foothills', region: 'peaks',
    enterQuip: () => 'The Foothills. The air is thin and the bill is thick.',
    describe: () =>
      'The Foothills of the Capacity Peaks. A sign reads: CAPACITY PEAKS — INTERACTIVE OPERATIONS MAY BE DELAYED. The Semantic Model Keep squats to the north; the Throttling Pass climbs east; the Refresh Fields lie west.',
    exits: { w: 'village.fields', n: 'fortress.bridge', e: 'peaks.pass' },
    items: ['peaks sign', 'flat-rock'],
    npcs: [],
    scene: () => 'peaks.foothills',
    flaskHint: (s) =>
      !worthy(s) ? nextTrial(s) :
      s.worn.includes('boots') ? 'Go east, and up. Nothing stands between you and the Shrine but altitude and your own typing.' :
      s.inventory.includes('boots') ? 'Wear the boots. Then go east. You have been carrying them like a souvenir.' :
      "Go north to the Keep's Report Studio and get boots. East is slow going without them. Or go east anyway, slowly, like a refresh.",
    rules: [
      {
        id: 'peaks.climb-sign',
        when: { verb: 'use', noun: ['sign', 'peaks sign', 'warning sign'] },
        then: { text: 'You lean on the sign. It leans back. Neither of you is going anywhere fast.', outcome: 'fail' },
      },
      {
        id: 'peaks.rock-sign',
        when: { verb: 'use', noun: ROCK, noun2: ['sign', 'peaks sign', 'warning sign', 'signboard'], has: ['flat-rock'] },
        then: { text: 'You tap the sign with the rock. It says INTERACTIVE OPERATIONS MAY BE DELAYED. The tap arrives a moment later.', outcome: 'snark' },
      },
    ],
  }),
  room({
    id: 'peaks.pass', name: 'Throttling Pass', region: 'peaks',
    enterQuip: () => 'Throttling Pass. Every step costs more than the last one. Like a consultant.',
    describe: () =>
      'The Throttling Pass. Every step takes longer than the last. The air is thin and billed per second. The Bursting Ledge is north; the foothills, west.',
    exits: { w: 'peaks.foothills', n: 'peaks.ledge' },
    items: ['rocks', 'receipt'],
    npcs: [],
    scene: () => 'peaks.pass',
    onEnter: (s) => (s.worn.includes('boots') ? 'You burst through the Pass.' : 'Your every movement is throttled.'),
    flaskHint: (s) =>
      s.worn.includes('boots') ? 'Go north. You are bursting. Enjoy it; it is billed.' :
      s.inventory.includes('boots') ? 'Wear the boots. You are holding the solution to this entire room in your hand.' :
      'Go north, slowly. Boots would help. The Keep has some, in the Report Studio, if you want to walk all the way back for them.',
    rules: [
      {
        id: 'peaks.pass-rocks',
        when: { verb: 'get', noun: ['rock', 'rocks', 'stone', 'air'] },
        then: { text: 'You reach for a rock. The reach is queued. The rock is delivered to you 24 hours later, smoothed.', outcome: 'snark' },
      },
      {
        id: 'peaks.read-receipt',
        when: { verb: 'read', noun: ['receipt', 'cu receipt', 'bill'] },
        then: { text: 'CU consumption: 1 step, 400 CU-seconds. 1 reach for a rock, queued. 1 thought about turning back, 0 CU-seconds; nobody bills for that, because nobody has ever done it.', outcome: 'success' },
      },
    ],
  }),
  room({
    id: 'peaks.ledge', name: 'Bursting Ledge', region: 'peaks',
    enterQuip: () => 'The Bursting Ledge. A door. It only opens for the Worthy. Are you? Be honest.',
    describe: (s) =>
      s.flags['shrine.open']
        ? 'The Bursting Ledge. The Shrine door stands open to the north; three sigils glow. The pass is south.'
        : `The Bursting Ledge. ${sigilStatus(s)} The pass is south.`,
    exits: { s: 'peaks.pass', n: (s) => (s.flags['shrine.open'] ? 'peaks.shrine' : null) },
    items: ['door', 'carabiner'],
    npcs: [],
    scene: (s) => (s.flags['shrine.open'] ? 'peaks.ledge-open' : 'peaks.ledge'),
    flaskHint: (s) =>
      s.flags['shrine.open'] ? 'Go north. Do not fight what you find. Answer it.' :
      worthy(s) ? 'Open the door. Or look at it. You are Worthy. Apparently. The door is as surprised as you are.' :
      worthyToDo(s),
    rules: [
      { id: 'peaks.shrine-door', when: { verb: 'look', noun: DOOR, flags: WORTHY_AND_CLOSED }, then: { ...DOOR_OPENS } },
      { id: 'peaks.shrine-door-open', when: { verb: 'open', noun: DOOR, flags: WORTHY_AND_CLOSED }, then: { ...DOOR_OPENS } },
      { id: 'peaks.shrine-door-go', when: { verb: 'go', dir: 'n', flags: WORTHY_AND_CLOSED }, then: { ...DOOR_OPENS, moveTo: 'peaks.shrine' } },
      {
        id: 'peaks.door-locked',
        when: { verb: 'go', dir: 'n', flags: [{ flag: 'shrine.open', not: true }] },
        then: { text: (s) => `The door does not move. ${darkSigils(s)}`, outcome: 'fail' },
      },
      {
        id: 'peaks.open-locked',
        when: { verb: 'open', noun: DOOR, flags: [{ flag: 'shrine.open', not: true }] },
        then: { text: (s) => `The door does not move. ${darkSigils(s)}`, outcome: 'fail' },
      },
      {
        id: 'peaks.read-door',
        when: { verb: 'read', noun: DOOR },
        then: { text: (s) => `WORTHY ONLY. Below, smaller: 'and no interactive delay'. ${sigilStatus(s)}`, outcome: 'success' },
      },
      {
        id: 'peaks.carabiner-door',
        when: { verb: 'use', noun: ['carabiner', 'clip', 'karabiner'], noun2: DOOR, has: ['carabiner'] },
        then: { text: 'You clip onto the door. You are now attached to a door you cannot open. This is called governance.', outcome: 'snark' },
      },
      {
        id: 'peaks.attack-door',
        when: { verb: 'attack', noun: DOOR },
        then: { text: 'You kick the door. The door is a mountain. The mountain does not notice.', outcome: 'fail' },
      },
    ],
  }),
  room({
    id: 'peaks.shrine', name: 'The Shrine', region: 'peaks',
    enterQuip: () => 'Uh oh.',
    describe: (s) =>
      s.flags['dragon.gone']
        ? 'The Shrine. The Golden Semantic Model rests on a pedestal, unguarded, glowing with the light of a thousand well-named measures. The ledge is south.'
        : 'The Shrine. On a pedestal glows the Golden Semantic Model. Coiled around the pedestal is THROTTLOR, the Capacity Dragon. Smoke rises from his nostrils in neat 30-second intervals. The ledge is south.',
    exits: { s: 'peaks.ledge' },
    items: ['model'],
    npcs: ['throttlor'],
    scene: (s) => (s.flags['dragon.gone'] ? 'peaks.shrine-clear' : 'peaks.shrine'),
    onEnter: (s) => (s.flags['dragon.gone'] ? null : '"WHO DARES— oh. Oh no. You smell like a Warehouse." The dragon gags. "Answer me this, peasant: WHAT IS THE ONE TRUE MODEL?"'),
    flaskHint: (s) => (s.flags['dragon.gone']
      ? 'Get the model. Try not to look inside.'
      : 'Answer the dragon. Say the one true model: one fact table, several dimensions, two words. Do not attack him. People always attack him.'),
    rules: [
      {
        id: 'death.dragon',
        when: { verb: 'attack', noun: DRAGON, flags: [{ flag: 'dragon.gone', not: true }] },
        then: { text: 'You charge Throttlor. He breathes a single, precise jet of flame. Your refresh has been throttled. Permanently.', death: 'death.dragon' },
      },
      {
        id: 'peaks.rock-dragon',
        when: { verb: 'use', noun: ROCK, noun2: DRAGON, has: ['flat-rock'], flags: DRAGON_THERE },
        then: { text: ROCK_TEXT, outcome: 'snark' },
      },
      {
        id: 'peaks.kpi-dragon',
        when: { verb: 'give', noun: ['kpi', 'laminated kpi'], noun2: DRAGON, has: ['kpi'], flags: DRAGON_THERE },
        then: { text: "'(Blank)?' Throttlor is briefly delighted. Then remembers he is a dragon. He hands it back with one claw. 'Answer the question, peasant.'", outcome: 'snark' },
      },
      {
        id: 'peaks.receipt-dragon',
        when: { verb: 'give', noun: ['receipt', 'cu receipt', 'bill'], noun2: DRAGON, has: ['receipt'], flags: DRAGON_THERE },
        then: { text: "Throttlor reads the receipt, adds a line in smoke, and hands it back. You now owe more. 'Consumption,' he purrs, 'is a lifestyle.'", outcome: 'snark' },
      },
      {
        id: 'peaks.dragon',
        when: { verb: 'say', noun: ['star schema', 'a star schema', 'the star schema', 'star', 'star-schema', 'kimball'], flags: [{ flag: 'dragon.gone', not: true }] },
        then: {
          text: "'STAR… SCHEMA?' Throttlor recoils. 'One fact table? Conformed dimensions? Single-direction filters?' He shrieks, deflates like a paused capacity, and drifts out of the Shrine, whistling faintly. He does not come back.",
          set: { 'dragon.gone': true }, points: 10, sfx: 'success',
        },
      },
      {
        id: 'peaks.dragon-calculate',
        when: { verb: 'say', noun: ['calculate', 'dax', 'measure', 'a measure'], flags: [{ flag: 'dragon.gone', not: true }] },
        then: { text: 'Throttlor yawns. Context transition means nothing to a dragon.', outcome: 'snark' },
      },
      {
        id: 'peaks.dragon-flat',
        when: { verb: 'say', noun: ['flat table', 'one big table', 'obt', 'wide table', 'a flat table', 'one table', 'snowflake', 'snowflake schema'], flags: [{ flag: 'dragon.gone', not: true }] },
        then: { text: "Throttlor purrs. 'Yes. YES. Feed me.' The pedestal glows brighter. You have made things worse.", outcome: 'snark' },
      },
      {
        id: 'peaks.dragon-direct-lake',
        when: { verb: 'say', noun: ['direct lake', 'import', 'directquery', 'direct query'], flags: [{ flag: 'dragon.gone', not: true }] },
        then: { text: "'That is a storage mode, peasant, not a model.' Throttlor sighs a small, patient flame.", outcome: 'snark' },
      },
      {
        id: 'peaks.get-model-guarded',
        when: { verb: 'get', noun: MODEL, flags: [{ flag: 'dragon.gone', not: true }] },
        then: { text: "You reach for the Model. Throttlor's tail slaps your hand away without his even looking. 'Answer the question, peasant.'", outcome: 'fail' },
      },
      {
        id: 'peaks.look-model-guarded',
        when: { verb: 'look', noun: MODEL, flags: [{ flag: 'dragon.gone', not: true }] },
        then: { text: 'The Golden Semantic Model glows behind the dragon. From here it looks perfect. From here.', outcome: 'success' },
      },
      {
        id: 'peaks.model',
        when: { verb: 'get', noun: MODEL, flags: [{ flag: 'dragon.gone' }] },
        then: { text: ENDING, give: ['model'], set: { 'game.won': true }, points: 5, win: true, sfx: 'win' },
      },
      {
        id: 'peaks.read-model',
        when: { verb: 'read', noun: MODEL, flags: [{ flag: 'dragon.gone' }] },
        then: { text: ENDING, give: ['model'], set: { 'game.won': true }, points: 5, pointsKey: 'peaks.model', win: true, sfx: 'win' },
      },
    ],
  }),
]);
