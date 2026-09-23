import type { PhraseRule, Room } from './types';
import type { GameState } from '../engine/types';
import { talkTo, unknownTopicPattern } from '../engine/builtins';
import { NPCS } from './npcs';
import { isFlood, setting } from '../engine/governance';
import { doorChecklist, sigilStatus } from './items';
import { xmlaRouteFrom } from './sacristy';
import { ADE, ADE_DEATH } from './deaths';
import { nick, rotate } from './voice';

const room = (r: Room): [string, Room] => [r.id, r];
/** The same command again, in a row (read off `recent`, no flag moves): the second line is the repeat joke. */
const again = (s: GameState, first: string, second: string): string => ((s.recent?.n ?? 1) >= 2 ? second : first);

const DRAGON = ['dragon', 'throttlor', 'throttlor the capacity dragon', 'capacity dragon', 'the dragon'];
const MODEL = ['model', 'golden semantic model', 'semantic model', 'golden model', 'the model'];
const DOOR = ['door', 'shrine door', 'great door', 'shrine', 'sigils', 'sigil'];

const worthy = (s: GameState): boolean => !!s.flags['trial.hoodie'] && !!s.flags['trial.moat'] && !!s.flags['trial.key'];
/** The sigils still dark, by name. The Ledge gate (gates.ts) rotates the old shut-door line built on this. */
export const darkSigils = (s: GameState): string => {
  const dark = [
    !s.flags['trial.hoodie'] && 'the HOODIE sigil (look like an Engineer)',
    !s.flags['trial.moat'] && 'the STINK LINES sigil (smell like a Warehouse)',
    !s.flags['trial.key'] && 'the KEY sigil (hold the Gateway Key)',
  ].filter((x): x is string => !!x);
  return dark.length ? `Still dark: ${dark.join('; ')}.` : 'All sigils glow.';
};

/** The next trial still dark, as the thing to go and do (golden-path order: moat, hoodie, key). Worded from the Foothills; with XMLA off, the long way from `room`. */
const nextTrial = (s: GameState, room = 'peaks.foothills'): string =>
  !s.flags['trial.moat'] ? 'Go north into the Keep. You need to smell like a Warehouse, and the Keep has a moat for that.' :
  !s.flags['trial.hoodie'] ? (setting(s, 'xmla') ? 'Go north, through the Keep, to the Monastery behind it. Get the hoodie. Wear the hoodie.' : `${xmlaRouteFrom(room)} Get the hoodie. Wear the hoodie.`) :
  'Go west, back through the Fields to the square, then south to the OneLake. Get the standard key.';

const lowerFirst = (t: string): string => t.charAt(0).toLowerCase() + t.slice(1);

/** The Ledge's demand, minus whatever you have already done. nextTrial() is worded from the Foothills, so say how to get there. */
const worthyToDo = (s: GameState): string => {
  const todo = [
    !s.flags['trial.hoodie'] && 'wear the hoodie',
    !s.flags['trial.moat'] && 'smell like the moat',
    !s.flags['trial.key'] && 'hold the key',
  ].filter((x): x is string => !!x);
  if (todo.length === 3) return 'The door wants the Worthy Three: wear the hoodie, smell like the moat, hold the key. Go south and get started.';
  // With XMLA off and the hoodie still to get, the long way is worded from the Ledge itself (round 3), not "from the Foothills".
  if (s.flags['trial.moat'] && !s.flags['trial.hoodie'] && !setting(s, 'xmla')) return `The door still wants: ${todo.join(', ')}. North is the Shrine door, and it is not opening for you yet. ${nextTrial(s, 'peaks.ledge')}`;
  return `The door still wants: ${todo.join(', ')}. North is the Shrine door, and it is not opening for you yet. Go back south to the Foothills. From there: ${lowerFirst(nextTrial(s))}`;
};

const DRAGON_THERE = [{ flag: 'dragon.gone', not: true }];
/** An `about` topic Throttlor does not know (npcs.ts knows). */
const UNKNOWN_TO_DRAGON = unknownTopicPattern(NPCS['throttlor']!.knows!);
const ROCK = ['flat rock', 'rock', 'flat stone', 'stone'];
const NO_ROCK = 'You mime throwing a rock. You do not have a rock. The Foothills had one. The Foothills are very far away now.';
const ROCK_TEXT = 'You throw a rock at a capacity dragon. It bills you for the throw. Itemized. With a surcharge for aim.';

const WORTHY_AND_CLOSED = [
  { flag: 'trial.hoodie' }, { flag: 'trial.moat' }, { flag: 'trial.key' }, { flag: 'shrine.open', not: true },
];

/** The door opening for the Worthy: `look`, `open`, `n`, and (gates.ts) every other obvious verb share one award. */
export const DOOR_OPENS = {
  text: 'The three sigils blaze. Hoodie. Stink. Key. The door grinds open. You are Worthy, apparently.',
  set: { 'shrine.open': true }, points: 5, pointsKey: 'peaks.shrine-door', sfx: 'door',
};

/**
 * The win keeps the 412-column ending, then drops the act (spec1 §5.2, the skill's "Winning"): one sincere line, one
 * small joke, THE END.
 */
const ENDING =
  "You lift the Golden Semantic Model.\n\nIt is one table.\n\n412 columns. The first is named Column1. There is a measure named 'Measure 2 (copy)'. Half the columns are dates stored as text. There is a column called 'Notes' that contains, in row 8,041, the phrase 'ask Jeff'.\n\nYou weep. Then you carry it down the mountain anyway. The village's refreshes run that night, slow but unthrottled, and the people cheer, and nobody asks what the Model looks like inside.\n\nCongratulations. You won. Nobody's ever gotten the Model down the mountain, and you did it with a Pro license. Way to go.\n\nTHE END.";

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
  // ---- The sweep (Task F8) ----
  {
    id: 'peaks.climb', room: 'peaks.foothills', test: /^(climb|scale|ascend)( the| up the)? (mountain|peaks?|capacity peaks)$/,
    text: (s) => again(s, 'You climb. The mountain bills you per vertical second. You stop at the first ledge to check the invoice.',
      'Same ledge, same invoice, now with a late fee. The path is east.'),
  },
  {
    id: 'peaks.pay', room: 'peaks.pass', test: /^(pay|pay (the )?(receipt|bill)|settle up)$/,
    text: (s) => again(s, 'You try to pay the receipt. The Pass accepts Capacity Units only. You have a Pro license and, at this altitude, opinions.',
      'Declined again. The Pass has no card reader, just a dragon.'),
  },
  {
    // The interactive delay, three ways: in your shoes, in the boots, and with Autoscale on in the Sacristy.
    id: 'peaks.hurry', room: 'peaks.pass', test: /^(run|sprint|hurry( up)?|rush|jog|dash|go faster|walk faster|speed up)$/,
    text: (s) => (setting(s, 'autoscale')
      ? 'You hurry. Autoscale notices and scales you out to two of you. Both of you are slow. Finance gets both bills.'
      : s.worn.includes('boots') ? 'You sprint. The Bursting Boots burst. The receipt keeps up with you easily.'
      : 'You try to hurry. The Pass queues the hurry and delivers it tomorrow, as a stroll.'),
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
    nudge: {
      plainer: (s) => (worthy(s) && s.inventory.includes('boots') && !s.worn.includes('boots') ? 'The Bursting Boots only work on your feet.' : ''),
    },
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
    items: ['rocks', 'receipt', 'capacityade'],
    npcs: [],
    scene: () => 'peaks.pass',
    onEnter: (s) => (s.worn.includes('boots') ? 'You burst through the Pass.' : 'Your every movement is throttled.'),
    flaskHint: (s) =>
      s.worn.includes('boots') ? 'Go north. You are bursting. Enjoy it; it is billed.' :
      s.inventory.includes('boots') ? 'Wear the boots. You are holding the solution to this entire room in your hand.' :
      'Go north, slowly. Boots would help. The Keep has some, in the Report Studio, if you want to walk all the way back for them.',
    nudge: {
      plainer: (s) => (s.inventory.includes('boots') && !s.worn.includes('boots') ? 'The boots in your bag are called Bursting. The pass is called Throttling. Only one of those is optional.' : ''),
    },
    rules: [
      // The sports drink (spec1 §5.4): a death here, and anywhere you carry it (globals.ts death.capacityade-carried).
      { id: 'death.capacityade', when: { verb: 'drink', noun: ADE }, then: { text: ADE_DEATH, death: 'death.capacityade' } },
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
    // A second look in a row gets the edge (Task F8).
    describe: (s) =>
      (s.flags['shrine.open']
        ? 'The Bursting Ledge. The Shrine door stands open to the north; three sigils glow. The pass is south.'
        : `The Bursting Ledge. ${sigilStatus(s)} The pass is south.`)
      + ((s.recent?.n ?? 1) >= 2 ? ' The drop off the edge is the only thing up here with no interactive delay. Do not test that.' : ''),
    exits: { s: 'peaks.pass', n: (s) => (s.flags['shrine.open'] ? 'peaks.shrine' : null) },
    items: ['door', 'carabiner'],
    npcs: [],
    scene: (s) => (s.flags['shrine.open'] ? 'peaks.ledge-open' : 'peaks.ledge'),
    flaskHint: (s) =>
      s.flags['shrine.open'] ? 'Go north. Do not fight what you find. Answer it.' :
      worthy(s) ? 'Open the door. Or look at it. You are Worthy. Apparently. The door is as surprised as you are.' :
      worthyToDo(s),
    // No nudge (Task B4): the flask hint lists which of the door's three things are missing, so it is the helper from 4.
    rules: [
      { id: 'peaks.shrine-door', when: { verb: 'look', noun: DOOR, flags: WORTHY_AND_CLOSED }, then: { ...DOOR_OPENS } },
      { id: 'peaks.shrine-door-open', when: { verb: 'open', noun: DOOR, flags: WORTHY_AND_CLOSED }, then: { ...DOOR_OPENS } },
      // The sigils (global.look-sigils' line first), then the checklist on a second look in a row (Task F8).
      { id: 'peaks.look-sigils', when: { verb: 'look', noun: ['sigils', 'sigil'] }, then: { text: (s) => again(s, sigilStatus(s), doorChecklist(s)), outcome: 'success' } },
      { id: 'peaks.shrine-door-go', when: { verb: 'go', dir: 'n', flags: WORTHY_AND_CLOSED }, then: { ...DOOR_OPENS, moveTo: 'peaks.shrine' } },
      {
        id: 'peaks.door-locked',
        when: { verb: 'go', dir: 'n', flags: [{ flag: 'shrine.open', not: true }] },
        // North again, in a row: the door reads you its checklist, with a new nickname (Task F8).
        then: { text: (s) => again(s, `The door does not move. ${darkSigils(s)}`, `The door does not move. ${doorChecklist(s)}`), outcome: 'fail' },
      },
      {
        // Shut, the door is the Ledge gate (gates.ts): every obvious verb gets the sigil count. Open, it is just open.
        id: 'peaks.open-open',
        when: { verb: 'open', noun: DOOR, flags: [{ flag: 'shrine.open' }] },
        then: { text: "Yeah, totally! Except it's already open, you moron. Try: north.", outcome: 'fail' },
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
        id: 'peaks.use-carabiner',
        when: { verb: 'use', noun: ['carabiner', 'clip', 'karabiner'], has: ['carabiner'] },
        then: { text: (s) => again(s, 'You clip the carabiner to yourself. Rated F64. You are, at best, F2.', 'Still F2. The carabiner has started to look away.'), outcome: 'fail' },
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
    // With the dragon here, the flood makes him bigger (spec2 §3.5) and Surge protection gives him a hat (spec2 §3.4);
    // both after the room has introduced him.
    describe: (s) =>
      s.flags['dragon.gone']
        ? 'The Shrine. The Golden Semantic Model rests on a pedestal, unguarded, glowing with the light of a thousand well-named measures. The ledge is south.'
        : `The Shrine. On a pedestal glows the Golden Semantic Model. Coiled around the pedestal is THROTTLOR, the Capacity Dragon. Smoke rises from his nostrils in neat 30-second intervals.${isFlood(s) ? ' Throttlor is enormous today. The whole organization is refreshing at once.' : ''}${setting(s, 'surge') ? ' He is wearing a hard hat. Surge protection.' : ''} The ledge is south.`,
    exits: { s: 'peaks.ledge' },
    items: ['model', 'pedestal', 'hard-hat'],
    npcs: ['throttlor'],
    scene: (s) => (s.flags['dragon.gone'] ? 'peaks.shrine-clear' : 'peaks.shrine'),
    onEnter: (s) => (s.flags['dragon.gone'] ? null : '"WHO DARES— oh. Oh no. You smell like a Warehouse." The dragon gags. "Answer me this, peasant: WHAT IS THE ONE TRUE MODEL?"'),
    flaskHint: (s) => (s.flags['dragon.gone']
      ? 'Get the model. Try not to look inside.'
      : 'Answer the dragon. Say the one true model: one fact table, several dimensions, two words. Do not attack him. People always attack him.'),
    nudge: {
      plainer: (s) => (s.flags['dragon.gone']
        ? "It's the Golden Semantic Model and it's yours. Pick it up. Do not open it."
        : "The answer is a shape: one fat table in the middle, skinny ones around it. Its name is something you'd wish on."),
    },
    rules: [
      // Asked about the model twice in a row, he stops hinting and says too much (Task F8); the first ask keeps the two-word hint.
      {
        id: 'peaks.dragon-model',
        when: { verb: 'talk', noun: DRAGON, noun2: ['model', 'the model', 'golden semantic model', 'semantic model', 'the golden semantic model', 'one true model', 'the one true model'], flags: DRAGON_THERE },
        then: {
          text: (s, world, cmd) => again(s, talkTo(s, world, world.npcs['throttlor']!, cmd?.noun2),
            "'The model,' says Throttlor, 'is one golden table.' He glances at the pedestal. 'Don't look inside.'"),
          outcome: 'success',
        },
      },
      {
        // The derailment: ask about the Warehouse and he can only talk about how you smell.
        id: 'peaks.dragon-warehouse',
        when: { verb: 'talk', noun: DRAGON, noun2: ['warehouse', 'the warehouse', 'fabric warehouse', 'moat', 'the moat', 'smell'], flags: DRAGON_THERE },
        then: { text: "'Don't bring up the Warehouse,' says Throttlor. 'You ARE the Warehouse. You taste like a view nobody documented.'", outcome: 'success' },
      },
      {
        // The brush-off, varied (Task F8): the first unknown topic gets his voice.ts line (through talkTo, below); once you have
        // talked to him at all, the talk count walks these, a new nickname each time.
        id: 'peaks.dragon-brushoff',
        when: { verb: 'talk', noun: DRAGON, noun2Matches: UNKNOWN_TO_DRAGON, flags: [...DRAGON_THERE, { flag: 'talk.throttlor' }] },
        then: {
          text: (s) => [
            `Throttlor exhales a neat 30-second puff. "Off-topic questions are smoothed over 24 hours, ${nick(s)}. Come back tomorrow."`,
            `"I know nothing about that, ${nick(s)}," says Throttlor. "I know EVERYTHING about the model. Guess which one you should ask about."`,
            `"That is a capacity question, ${nick(s)}," says Throttlor, "and I am the capacity. Ask me about the model."`,
          ][(Number(s.flags['talk.throttlor']) || 0) % 3]!,
          outcome: 'success',
        },
      },
      // Talking to Throttlor: his own escalation (npcs.ts) through the engine's talk counter, or his brush-off for an `about` topic,
      // ahead of the global "he is elsewhere" line.
      { id: 'peaks.talk-dragon', when: { verb: 'talk', noun: DRAGON, flags: DRAGON_THERE }, then: { text: (s, world, cmd) => talkTo(s, world, world.npcs['throttlor']!, cmd?.noun2), outcome: 'success' } },
      {
        id: 'death.dragon',
        when: { verb: 'attack', noun: DRAGON, flags: [{ flag: 'dragon.gone', not: true }] },
        then: { text: 'You charge Throttlor. He breathes a single, precise jet of flame. Your refresh has been throttled. Permanently. You knew you were supposed to TALK to him, right?', death: 'death.dragon' },
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
        // Any other answer (Task F8): the progress gate's shape, a new nickname each time, your own words back at you.
        id: 'peaks.dragon-wrong',
        when: { verb: 'say', nounMatches: /\S/, flags: DRAGON_THERE },
        then: {
          text: (s, _world, cmd) => rotate(s, [
            `'${cmd?.noun ?? ''}?' Throttlor bills you for the syllables. 'Wrong, ${nick(s)}. Two words. One of them is up in the sky.'`,
            `Throttlor writes '${cmd?.noun ?? ''}' on your receipt in smoke and circles it. 'Wrong answer, ${nick(s)}. Also a line item.'`,
            `'${cmd?.noun ?? ''},' Throttlor repeats, tasting it. 'No. That is a column name, ${nick(s)}. Probably Column1.'`,
          ]),
          outcome: 'fail',
        },
      },
      {
        // The sports drink, offered to the thing it is named after.
        id: 'peaks.ade-dragon',
        when: { verb: 'give', noun: ADE, noun2: DRAGON, has: ['capacityade'], flags: DRAGON_THERE },
        then: { text: "Throttlor sniffs the energy drink and hands it back. 'I don't drink my own product,' he says. 'Neither should you.'", outcome: 'snark' },
      },
      {
        id: 'peaks.reach-model',
        when: { verb: 'use', noun: MODEL, flags: DRAGON_THERE },
        then: { text: 'You reach past a dragon for the Model. He clears his throat, in smoke.', outcome: 'fail' },
      },
      {
        id: 'peaks.get-model-guarded',
        when: { verb: 'get', noun: MODEL, flags: [{ flag: 'dragon.gone', not: true }] },
        then: { text: "You reach for the Model. Throttlor's tail slaps your hand away without his even looking. 'Answer the question, peasant.'", outcome: 'fail' },
      },
      {
        id: 'peaks.look-model-guarded',
        when: { verb: 'look', noun: MODEL, flags: [{ flag: 'dragon.gone', not: true }] },
        then: { text: (s) => again(s, 'The Golden Semantic Model glows behind the dragon. From here it looks perfect. From here.', 'Still perfect, from here. Everything is, from far enough away.'), outcome: 'success' },
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
