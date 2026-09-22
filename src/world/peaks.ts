import type { Room } from './types';
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

const WORTHY_AND_CLOSED = [
  { flag: 'trial.hoodie' }, { flag: 'trial.moat' }, { flag: 'trial.key' }, { flag: 'shrine.open', not: true },
];

const DOOR_OPENS = {
  text: 'The three sigils blaze. Hoodie. Stink. Key. The door grinds open. You are Worthy, apparently.',
  set: { 'shrine.open': true }, points: 5, pointsKey: 'peaks.shrine-door', sfx: 'door',
};

const ENDING =
  "You lift the Golden Semantic Model.\n\nIt is one table.\n\n412 columns. The first is named Column1. There is a measure named 'Measure 2 (copy)'. Half the columns are dates stored as text. There is a column called 'Notes' that contains, in row 8,041, the phrase 'ask Jeff'.\n\nYou weep. Then you carry it down the mountain anyway. The village's refreshes run that night, slow but unthrottled, and the people cheer, and nobody asks what the Model looks like inside.\n\nTHE END.";

export const PEAKS_ROOMS: Record<string, Room> = Object.fromEntries([
  room({
    id: 'peaks.foothills', name: 'Foothills', region: 'peaks',
    describe: () =>
      'The Foothills of the Capacity Peaks. A sign reads: CAPACITY PEAKS — INTERACTIVE OPERATIONS MAY BE DELAYED. Warehouse Fortress squats to the north; the Throttling Pass climbs east; the Refresh Fields lie west.',
    exits: { w: 'village.fields', n: 'fortress.bridge', e: 'peaks.pass' },
    items: ['peaks sign'],
    npcs: [],
    scene: () => 'peaks.foothills',
    flaskHint: (s) =>
      worthy(s) ? (s.worn.includes('boots') ? 'East, and up. Nothing stands between you and the Shrine but altitude.' : 'East is slow going without boots. The Fortress yard might help with that.') :
      `The Shrine wants three things. ${darkSigils(s)}`,
    rules: [
      {
        id: 'peaks.climb-sign',
        when: { verb: 'use', noun: ['sign', 'peaks sign', 'warning sign'] },
        then: { text: 'You lean on the sign. It leans back. Neither of you is going anywhere fast.', outcome: 'fail' },
      },
    ],
  }),
  room({
    id: 'peaks.pass', name: 'Throttling Pass', region: 'peaks',
    describe: () =>
      'The Throttling Pass. Every step takes longer than the last. The air is thin and billed per second. The Bursting Ledge is north; the foothills, west.',
    exits: { w: 'peaks.foothills', n: 'peaks.ledge' },
    items: ['rocks'],
    npcs: [],
    scene: () => 'peaks.pass',
    onEnter: (s) => (s.worn.includes('boots') ? 'You burst through the Pass.' : 'Your every movement is throttled.'),
    flaskHint: (s) => (s.worn.includes('boots') ? 'North.' : 'Boots would help here. Boots would help a lot. Otherwise: north, slowly.'),
    rules: [
      {
        id: 'peaks.pass-rocks',
        when: { verb: 'get', noun: ['rock', 'rocks', 'stone', 'air'] },
        then: { text: 'You reach for a rock. The reach is queued. The rock is delivered to you 24 hours later, smoothed.', outcome: 'snark' },
      },
    ],
  }),
  room({
    id: 'peaks.ledge', name: 'Bursting Ledge', region: 'peaks',
    describe: (s) =>
      s.flags['shrine.open']
        ? 'The Bursting Ledge. The Shrine door stands open to the north; three sigils glow. The pass is south.'
        : `The Bursting Ledge. ${sigilStatus(s)} The pass is south.`,
    exits: { s: 'peaks.pass', n: (s) => (s.flags['shrine.open'] ? 'peaks.shrine' : null) },
    items: ['door'],
    npcs: [],
    scene: (s) => (s.flags['shrine.open'] ? 'peaks.ledge-open' : 'peaks.ledge'),
    flaskHint: (s) => (s.flags['shrine.open'] ? 'North. Do not fight what you find. Answer it.' : darkSigils(s)),
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
        id: 'peaks.attack-door',
        when: { verb: 'attack', noun: DOOR },
        then: { text: 'You kick the door. The door is a mountain. The mountain does not notice.', outcome: 'fail' },
      },
    ],
  }),
  room({
    id: 'peaks.shrine', name: 'The Shrine', region: 'peaks',
    describe: (s) =>
      s.flags['dragon.gone']
        ? 'The Shrine. The Golden Semantic Model rests on a pedestal, unguarded, glowing with the light of a thousand well-named measures. The ledge is south.'
        : 'The Shrine. On a pedestal glows the Golden Semantic Model. Coiled around the pedestal is THROTTLOR, the Capacity Dragon. Smoke rises from his nostrils in neat 30-second intervals. The ledge is south.',
    exits: { s: 'peaks.ledge' },
    items: ['model'],
    npcs: ['throttlor'],
    scene: (s) => (s.flags['dragon.gone'] ? 'peaks.shrine-clear' : 'peaks.shrine'),
    onEnter: (s) => (s.flags['dragon.gone'] ? null : '"WHO DARES— oh. Oh no. You smell like a Warehouse." The dragon gags. "Answer me this, peasant: WHAT IS THE ONE TRUE MODEL?"'),
    flaskHint: (s) => (s.flags['dragon.gone'] ? 'Take the model. Try not to look inside.' : 'The dragon asked a question. The answer has one fact table and several dimensions. Say it.'),
    rules: [
      {
        id: 'death.dragon',
        when: { verb: 'attack', noun: DRAGON, flags: [{ flag: 'dragon.gone', not: true }] },
        then: { text: 'You charge Throttlor. He breathes a single, precise jet of flame. Your refresh has been throttled. Permanently.', death: 'death.dragon' },
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
