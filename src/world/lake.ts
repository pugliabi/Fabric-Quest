import type { GameState } from '../engine/types';
import type { PhraseRule, Room, Rule, RuleThen, World } from './types';
import { knowsTopic, roomIndex, talkTo, unknownTopicPattern } from '../engine/builtins';
import { curseOf } from './curses';
import { MALAPROPS, nick } from './voice';
import { trialAside } from './nudges';
import { ADE, ADE_DEATH, NO_ADE_IN_SWAMP } from './deaths';
import { NPCS } from './npcs';

const room = (r: Room): [string, Room] => [r.id, r];

/**
 * The same line typed again, in a row (the voice sweep, Task F5; the same helper the village keeps in village.ts). Read
 * off `recent`, which the engine sets before any rule runs, so no flag is touched and a bit of scenery that carries a
 * gag stays scenery for the fishing count. The second line IS the repeat joke, so the chirp layer stays quiet under it
 * (Task F4b); a third try says the second again, and the chirp's ladder picks up from there.
 */
const again = (s: GameState, first: string, second: string): string => ((s.recent?.n ?? 1) >= 2 ? second : first);
/** A second and a third look in a row, for the scenery the rooms answer themselves (items.ts has the same for items). */
const looks = (s: GameState, first: string, second: string, third?: string): string => {
  const n = s.recent?.n ?? 1;
  return n >= 3 && third ? third : n >= 2 ? second : first;
};
const online = (s: GameState): boolean => !!s.flags['ferry.online'];
/** The lamp's state picks the line; each state has its second line. */
const byLamp = (s: GameState, off: [string, string], on: [string, string]): string => (online(s) ? again(s, on[0], on[1]) : again(s, off[0], off[1]));

/** The CapacityAde in a swamp (fix round 1), ahead of the marsh's own `drink` line: carried, it kills you here too; otherwise there is none. */
const adeInSwamp = (prefix: string): Rule[] => [
  { id: `${prefix}.drink-ade`, when: { verb: 'drink', noun: ADE, has: ['capacityade'] }, then: { text: ADE_DEATH, death: 'death.capacityade' } },
  { id: `${prefix}.no-ade`, when: { verb: 'drink', noun: ADE }, then: { text: NO_ADE_IN_SWAMP, outcome: 'fail' } },
];

// 'other key' is on both lists (F3 fix round 1): it is whichever key you are not holding, and the STANDARD rule is
// checked first, so `get the other key` with the PERSONAL key in your pocket is the +20 and never a builtin take.
const KEY_NOUNS = ['standard key', 'gateway key', 'standard mode key', 'key', 'standard', 'standard gateway key', 'other key'];
const PERSONAL_NOUNS = ['personal key', 'personal mode key', 'personal', 'personal gateway key', 'other key'];
const FERRY_NOUNS = ['ferryman', 'ferry man', 'gateway', 'boatman', 'the ferryman'];
const LAKE_NOUNS = ['lake', 'onelake', 'water', 'the lake', 'one lake'];
const PEBBLE = ['pebble', 'skipping stone', 'flat pebble', 'stone'];
const MARSH = ['marsh', 'gold marsh', 'water', 'itself', 'here', 'the marsh'];
const LICENSE = ['license', 'card', 'license card', 'pro license', 'pro'];
const PLINTH = ['plinth', 'stone plinth', 'stand', 'hollow', 'hollows'];
const PLAQUE = ['plaque', 'inscription', 'sign'];
const SIGNPOST = ['shortcut', 'signpost', 'sign', 'onelake shortcut', 'pointer'];
const LOG = ['log', 'delta log', '_delta_log', 'transaction log', 'logs', 'json', 'the log'];
const CSV = ['csv', 'file', 'column1', 'column2', 'column3', 'the csv'];
const SKIP: RuleThen = {
  text: 'Skip. Skip. Sink. Three hops, then it becomes a Delta file. Somewhere a table gains one row: pebble, 1, you.',
  remove: ['pebble'], set: { 'pebble.skipped': true }, outcome: 'snark',
};
const PEBBLE_GONE = 'The pebble is a Delta file now. It has a transaction log. It has moved on. You should too.';

/** Past the Lake: the shortcut, then the Peaks (or whatever trial is still dark). */
const afterKey = (s: GameState): string =>
  !s.flags['taken.shortcut'] ? 'Go south, through Bronze and Silver, to the Gold Marsh. Get the signpost. It is lighter than it looks.' :
  !s.flags['trial.moat'] || !s.flags['trial.hoodie'] ? 'Go north to the square, then east and north into the Keep. The Worthy Three are not going to collect themselves.' :
  'Go north to the square, then east, east, east. The Peaks. Bring the key.';
/** The same, sideways (Task B4): the marsh has something that weighs nothing; after that, the next trial. */
const afterKeyAside = (s: GameState): string =>
  !s.flags['taken.shortcut'] ? "The marshes south of here go bronze, silver, gold, and the gold one has something standing at the water's edge that weighs nothing." :
  trialAside(s, 'east of the village');

// ---- The voice sweep (Task F5): the Ferryman's derailments, offline and online, each with its second line ----

/**
 * A topic the Ferryman does not know (polish round, review M1): the derailments claim only these, so `ask ferryman
 * about gateway` or `about tear` (both on his `knows` list) still get his talk-3 hint from `dock.ask-ferryman`.
 */
const UNKNOWN_TO_FERRYMAN = unknownTopicPattern(NPCS['ferryman']!.knows!);

/** `ask ferryman about the lake`: the one word he is sure of, counted on one finger. */
const FERRY_LAKE = (s: GameState): string => byLamp(s,
  ["He mouths: 'ONE.' Then, more slowly: 'LAKE.' He holds up one finger. Then, after thought, no more fingers.",
    "'ONE,' he mouths again, and stops there. The finger stays up. He has said everything he knows about the lake, twice."],
  ['"One," he says. "Lake." Out loud, now that he can. He holds up the finger anyway; he has grown fond of the finger.',
    '"One," he says again, and then, generously, "lake." The finger is up before he is finished.']);
/** The tears: not crying, in the self-contradiction shape; online, they were scheduled. */
const FERRY_TEARS = (s: GameState): string => byLamp(s,
  ["He mouths: 'NOT. CRYING.' A tear runs down. 'SCHEDULED,' he mouths. 'REFRESH.'",
    "'NOT,' he mouths. 'CRYING.' Two tears, both scheduled."],
  ['"Those were scheduled," he says of the tears. "Every one. I put them on a schedule in 2021 and they have run every night since."',
    '"Every night," he says. "I could turn them off now. I haven\'t." He looks at the lamp.']);
/** Himself: he flubs his own title, and likes the flub. */
const FERRY_SELF = (s: GameState): string => byLamp(s,
  ["He mouths: 'GATEWAY.' Then: 'FERRYMAN.' Then, slower and pleased: 'FERRYWAY.' Four years alone with two words.",
    "'FERRYWAY,' he mouths again, firmer. It is going on the boat, next to GATEWAY."],
  ['"The Ferryman," he says. "The Gateway. Standard mode." He tries them in another order. "Standard Ferryman. Gateway mode." He likes that one less.',
    '"Gateway mode," he says, testing it again. No. "Standard." He will stick with what the lamp said.']);

/**
 * The pebble, thrown, from any shore of it (the skill's environment variants: the same throw reads differently by marsh
 * layer). Carried, each room does its own thing; without it, where it went, or the mime.
 */
const THROW = /^(throw|toss|chuck|skim|fling) (the )?(pebble|stone|skipping stone|flat pebble|rock|flat rock)( (in|into|at|to|on) (the )?(lake|onelake|water|marsh|it|him|ferryman|ferry man|boatman|boat|lamp|bronze|silver|gold))?$/;
const noPebble = (s: GameState, line: string, mime: string): { id: string; then: RuleThen } => {
  // The flat rock (polish round): a rock in your hand is the rock thrown, whatever became of the pebble. It sinks, so it
  // leaves your pockets; `throw rock` after that mourns it.
  if (/\b(stone|rock)\b/.test(line) && s.inventory.includes('flat-rock')) return { id: 'lake.throw-rock', then: { text: 'You throw the flat rock. It is from the Peaks, and skips are billed per second. Zero skips. It sinks, and you are billed anyway.', remove: ['flat-rock'], set: { 'rock.sunk': true }, outcome: 'snark' } };
  if (/\brock\b/.test(line) && s.flags['rock.sunk']) return { id: 'lake.throw-rock-sunk', then: { text: 'Your flat rock is on the bottom of the OneLake, still being billed.', outcome: 'snark' } };
  if (s.flags['pebble.skipped']) return { id: 'lake.throw-pebble-gone', then: { text: PEBBLE_GONE, outcome: 'snark' } };
  if (s.flags['pebble.bronzed']) return { id: 'swamp.throw-pebble-string', then: { text: "It's a string in the Bronze now. You don't throw strings; you concatenate them.", outcome: 'snark' } };
  if (s.flags['pebble.golded']) return { id: 'swamp.throw-pebble-named', then: { text: "It's Pebble (Active) now, in the Gold, with a business name. Things with business names don't get thrown.", outcome: 'snark' } };
  if (s.room === 'lake.shore' && !s.flags['taken.pebble']) return { id: 'lake.pebble-at-feet', then: { text: "It's at your feet. Pick it up first; the OneLake does not accept throws by reference.", outcome: 'fail' } };
  return { id: 'lake.no-pebble', then: { text: mime, outcome: 'fail' } };
};
const throwPebble = (id: string, roomId: string, mime: string, carried: (s: GameState, line: string) => { id: string; then: RuleThen }): PhraseRule => ({
  id, room: roomId, test: THROW, text: '',
  then: (s, _w, line) => (s.inventory.includes('pebble') ? carried(s, line) : noPebble(s, line, mime)),
});
const MIME_LAKE = 'You mime a throw. The OneLake is not fooled; it has seen every mime.';
const MIME_DOCK = 'You mime a throw. The Ferryman is not fooled; he has seen every mime.';
const MIME_MARSH = 'You mime a throw. The marsh is not fooled; it has ingested every mime.';

/** The Lake House's deck, sat on: the rule (`use chair`) and the phrase (`sit`, ahead of egg.sit). The XP hill is the allusion layer (voice.ts ALLUSIONS). */
const SIT_DECK = 'You sit on the deck. The lake refreshes. It is lovely. You are billed. It is the Windows XP hill with a deck chair on it.';
const sitDeck = (s: GameState): string => again(s, SIT_DECK, "You sit again. Refreshed again. Billed again. It's a subscription now.");
const knock = (s: GameState): string => again(s, 'Nobody answers. A Spark session starts inside, out of politeness.', "You knock again. A second Spark session starts. Two now, out of politeness, and you're paying for both.");
const buy = (s: GameState): string => again(s, 'It is not for sale. It is for storage. Very different, the realtor insists, without making eye contact.', "You make a second offer. 'It's for storage,' the realtor repeats, to the lake.");
const fish = (s: GameState): string => again(s, 'You fish. You catch a Delta log. You put it back; it was not fully committed.', "Another Delta log. Also uncommitted. There's a whole checkpoint of them down there.");
const goIn = (s: GameState): string => again(s, 'Inside: files on the left, tables on the right, and a shortcut to another house across the lake. You back out slowly.', 'Files left, tables right, shortcut across the lake. You back out again, slower.');
/** The Bronze's columns, named: the rule (`label columns`) and the phrase (`name the columns`, since `name` is not a parser verb). */
const nameColumns = (s: GameState): string => again(s, 'You name Column1. It becomes Column1 (2). The marsh applauds, unstructured.', 'Column1 (3). The marsh is out of parentheses.');
const READ_COLUMNS = 'Column1 became CustomerName. Column2 became Customer_Name. Column3 is still Column3. Its name tag is floating nearby, unclaimed.';
const readColumns = (s: GameState): string => again(s, READ_COLUMNS, "Two spellings of the customer, both here. Merged in Q3. Which Q3, nobody says.");
/** The signpost is in the Gold Marsh or in your pocket (never taken, carried, or dropped right here). */
const signHere = (s: GameState, w: World): boolean =>
  !s.flags['taken.shortcut'] || s.inventory.includes('shortcut') || s.flags['droppedIn.shortcut'] === roomIndex('swamp.gold', w);
/** The Silver's log, opened (`use log` / `open log`): it knows what you did, and when. */
const useLog = (s: GameState): string => again(s, `You open a transaction log. It knows exactly what happened. It knows what you did on turn ${s.turns}, too, and filed it next to your Hotmail password.`, 'You open the next one. It logged you opening the last one.');

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
    nudge: {
      oblique: (s) =>
        s.flags['trial.key'] ? afterKeyAside(s) :
        s.flags['ferry.online'] ? "The lamp says ONLINE, the boat says GATEWAY, and neither of them is going to stay that way if you keep standing on the shore." :
        s.inventory.includes('credentials') ? "The Ferryman east of here has been OFFLINE since 2021, and you're carrying the one thing that flips a lamp." :
        "There's a Ferryman east of here whose lamp says OFFLINE, and lamps like that only come back on for a password somebody wrote down in 2019.",
    },
    rules: [
      {
        id: 'lake.swim',
        when: { verb: 'drink', noun: ['lake', 'onelake', 'water'] },
        then: { text: (s) => again(s, 'You dip a toe in the OneLake. It is exactly one lake deep.', 'You dip the other toe. Also one lake deep. It is consistent, which is more than your report.'), outcome: 'snark' },
      },
      {
        id: 'lake.look-lake',
        when: { verb: 'look', noun: ['lake', 'onelake', 'water', 'the lake'] },
        then: {
          text: (s) => looks(s,
            'The OneLake. Every file in the realm is in there, somewhere, once. Reflected in it you see a workspace you forgot you owned.',
            'Same one. Even the reflection is that one.',
            "One lake. You've stared at it longer than the guy who named it."),
          outcome: 'success',
        },
      },
      { id: 'lake.skip-pebble', when: { verb: 'use', noun: PEBBLE, noun2: LAKE_NOUNS, has: ['pebble'] }, then: SKIP },
      { id: 'lake.skip-pebble-bare', when: { verb: 'use', verbWord: ['skip'], noun: PEBBLE, has: ['pebble'] }, then: SKIP },
      {
        id: 'lake.skip-pebble-again',
        when: { verb: 'use', noun: PEBBLE, notHas: ['pebble'], flags: [{ flag: 'pebble.skipped' }] },
        then: { text: PEBBLE_GONE, outcome: 'snark' },
      },
      // The voice sweep (Task F5): the rest of the view, each with a second look; the dock and the man on it are east.
      {
        id: 'shore.look-shore',
        when: { verb: 'look', noun: ['shore', 'beach', 'sand', 'the shore', 'bank', 'edge', 'ground'] },
        then: { text: (s) => again(s, 'Sand. Dry, at least. The lake starts where your Pro license stops.', 'Same sand. Same one lake past it.'), outcome: 'success' },
      },
      {
        id: 'shore.look-marsh',
        when: { verb: 'look', noun: ['marsh', 'marshes', 'swamp', 'the marshes', 'south', 'bronze', 'silver', 'gold', 'lakehouse'] },
        then: { text: (s) => again(s, "South: bronze, then silver, then gold. It's a medal ceremony for data, and none of the medals are yours.", "Bronze, silver, gold. Your shoes learn the order."), outcome: 'success' },
      },
      {
        id: 'shore.look-house',
        when: { verb: 'look', noun: ['house', 'lake house', 'the house', 'west'] },
        then: { text: (s) => again(s, "A house. On a lake. From here, it's a house on a lake. Distance doesn't help.", "Same house. Same lake. Marketing checked the angle."), outcome: 'success' },
      },
      // Right idea, too far away: he is east, and so is his lamp.
      {
        id: 'shore.look-dock',
        when: { verb: 'look', noun: ['dock', 'the dock', 'ferry', 'boat', 'lamp', 'east', ...FERRY_NOUNS] },
        then: {
          text: (s) => byLamp(s,
            ["East: a dock, a boat, and a man who's been OFFLINE since 2021. You can see the lamp from here. It's the sad red.", 'Red, from here. Red carries.'],
            ["East: the dock, the boat, and a green lamp you can see from here. He's still there; he's just useful now.", 'Green carries too, it turns out.']),
          outcome: 'success',
        },
      },
      {
        id: 'shore.talk-ferryman',
        when: { verb: 'talk', noun: FERRY_NOUNS },
        then: {
          text: (s) => byLamp(s,
            ["He's east, on the dock. You wave. He mouths something. It's 'OFFLINE'; it carries.", 'Second wave. Same mouthing. It carries.'],
            ["He's east, on the dock. He waves back, ONLINE. It's the first wave he's returned in four years.", "Another wave. He's got the hang of it."]),
          outcome: 'snark',
        },
      },
      {
        id: 'shore.say-dax',
        when: { verb: 'say', noun: ['dax', 'daxx'] },
        then: { text: (s) => again(s, "You say 'DAX' at the lake. Lakes don't do measures. The reflection flinches; it's a workspace.", 'The lake stays a lake. The reflection left.'), outcome: 'snark' },
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
    nudge: {
      oblique: (s) =>
        s.flags['ferry.online'] ? (s.flags['trial.key'] ? afterKeyAside(s) : "The lamp's ONLINE and the man's weeping. The boat is the only thing on this dock that hasn't done its job yet.") :
        s.inventory.includes('credentials') ? "He's been OFFLINE since 2021. You're carrying the reason he doesn't have to be, and he can smell it." :
        'The lamp says OFFLINE and the Ferryman says nothing. Somewhere north, a mill grinds on a password nobody has asked for since 2019.',
      plainer: (s) =>
        s.flags['ferry.online'] ? (s.flags['trial.key'] ? '' : "It's a boat. There's one thing people do with boats, and it isn't admire them.") :
        s.inventory.includes('credentials') ? "Those credentials in your pocket are his. Hand them over; he's too polite to grab." :
        '',
    },
    rules: [
      // The voice sweep (Task F5): the Ferryman's derailments go first (an `about` beats nothing here that scores: the
      // hand-over is a `give`); a bare `talk to ferryman` has no `about` and B1's ladder runs. Not while you are (Blank),
      // and only on a topic he does not know (UNKNOWN_TO_FERRYMAN): a known one keeps his hint.
      {
        id: 'lake.ferryman-lake',
        when: { verb: 'talk', noun: FERRY_NOUNS, noun2: ['lake', 'onelake', 'the lake', 'water', 'one lake'], noun2Matches: UNKNOWN_TO_FERRYMAN, flags: [{ flag: 'curse.blank', not: true }] },
        then: { text: FERRY_LAKE, outcome: 'success' },
      },
      {
        id: 'dock.ferryman-tears',
        when: { verb: 'talk', noun: FERRY_NOUNS, noun2: ['tears', 'the tears', 'his tears', 'crying', 'weeping', 'cheek', 'his cheek'], noun2Matches: UNKNOWN_TO_FERRYMAN, flags: [{ flag: 'curse.blank', not: true }] },
        then: { text: FERRY_TEARS, outcome: 'success' },
      },
      {
        id: 'dock.ferryman-himself',
        when: { verb: 'talk', noun: FERRY_NOUNS, noun2: ['ferryman', 'the ferryman', 'himself', 'yourself', 'you', 'boatman'], noun2Matches: UNKNOWN_TO_FERRYMAN, flags: [{ flag: 'curse.blank', not: true }] },
        then: { text: FERRY_SELF, outcome: 'success' },
      },
      // Every other `ask ferryman about <topic>`: a topic he knows asked twice in a row gets a second known-topic line, in
      // whichever voice the lamp allows him; the rest is talkTo(), as the builtin would (his hint, his brush-off, (Blank)).
      {
        id: 'dock.ask-ferryman',
        when: { verb: 'talk', noun: FERRY_NOUNS, noun2Matches: /./ },
        then: {
          text: (s, w, cmd) => {
            const ferryman = w.npcs['ferryman']!;
            const topic = cmd?.noun2 ?? '';
            if ((s.recent?.n ?? 1) >= 2 && curseOf(s) !== 'blank' && knowsTopic(ferryman, topic)) {
              return online(s)
                ? '"Asked," he says. "Answered. ONLINE." He is using the word as punctuation now.'
                : 'He mouths it again, slower, in case the mouthing was the problem. It was not the problem.';
            }
            return talkTo(s, w, ferryman, topic);
          },
          outcome: 'success',
        },
      },
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
      // Missing object, in a well-formed command: the creds in your hand, and nobody named. Ask back.
      {
        id: 'dock.use-creds-bare',
        when: { verb: 'use', noun: ['credentials', 'creds', 'gen1 credentials', 'password', 'parchment'], has: ['credentials'] },
        then: { text: (_s, _w, cmd) => (cmd?.noun2 ? "Not on that. On him. He's the one with the lamp." : "On whom? There's one man on this dock, and his hand has been out since 2021."), outcome: 'fail' },
      },
      {
        id: 'lake.board',
        when: { verb: 'board', flags: [{ flag: 'ferry.online' }] },
        then: { text: 'You board the GATEWAY. The crossing takes exactly as long as the first refresh after a gateway update.', moveTo: 'lake.island', sfx: 'move' },
      },
      {
        id: 'lake.board-offline',
        when: { verb: 'board', flags: [{ flag: 'ferry.online', not: true }] },
        then: { text: (s) => again(s, 'The Ferryman shakes his head. OFFLINE. You could swim, but the OneLake is one lake deep, and that is very deep.', "He shakes his head again, slower, so it'll take. OFFLINE. The lake got no shallower while you asked."), outcome: 'fail' },
      },
      {
        id: 'lake.east-offline',
        when: { verb: 'go', dir: 'e', flags: [{ flag: 'ferry.online', not: true }] },
        then: { text: (s) => again(s, 'The boat is tied up and the Ferryman is OFFLINE. Nothing crosses the OneLake without a gateway.', "No. The boat's tied to the dock, the dock to a lamp."), outcome: 'fail' },
      },
      {
        id: 'lake.give-lanyard',
        when: { verb: 'give', noun: ['lanyard', 'fabcon lanyard', 'conference lanyard', 'badge'], noun2: FERRY_NOUNS, has: ['lanyard'] },
        then: { text: (s) => byLamp(s,
          ["'FabCon?' The Ferryman almost smiles. 'I was there. In spirit. My credentials had expired.' He hands it back, carefully, like it might still get him into a session.", "'FabCon,' he mouths. He hands it back again. He has been there in spirit twice now."],
          ["'FabCon?' The Ferryman almost smiles. 'I was there. In spirit. My credentials had expired.' He hands it back, carefully, like it might still get him into a session.", '"FabCon," he says again, out loud. He hands it back again. He has been there in spirit twice now.']), outcome: 'snark' },
      },
      {
        id: 'lake.give-timetable',
        when: { verb: 'give', noun: ['timetable', 'ferry timetable', 'schedule', 'ferry schedule'], noun2: FERRY_NOUNS, has: ['timetable'] },
        then: { text: (s) => byLamp(s,
          ["The Ferryman reads the timetable. 'Eight departures a day. On a Pro license.' He laughs until his lamp flickers, then stops, because it did not flicker ONLINE.",
            "He reads it again. Eight a day, on Pro. He does not laugh this time; he's checking the math."],
          ["The Ferryman crosses out OFFLINE on the timetable, writes ONLINE, and hands it back. A moment later he leans over and adds 'for now'.",
            "He hands it back with 'for now' crossed out, and 'for now' written under it, smaller."]), outcome: 'snark' },
      },
      // The rest of your pockets, offered: he counts, he reads, he does not take (the skill's give-anything beats).
      {
        id: 'dock.give-pebble',
        when: { verb: 'give', noun: PEBBLE, noun2: FERRY_NOUNS, has: ['pebble'] },
        then: { text: (s) => byLamp(s,
          ["He weighs the pebble in his palm and mouths: 'ONE.' He hands it back; he is very strict about the number.", "'ONE,' he mouths again. He hands it back again. The number has not changed, and neither has he."],
          ['"One," he says, and hands it back. He counts everything now; it is the lamp\'s doing.', '"One," he says again. Back it comes.']), outcome: 'snark' },
      },
      {
        id: 'dock.give-license',
        when: { verb: 'give', noun: LICENSE, noun2: FERRY_NOUNS, has: ['license'] },
        then: { text: (s) => byLamp(s,
          ["He reads it and hands it back. 'PRO,' he mouths. 'EIGHT. A. DAY.' He looks at the lamp.", "'PRO,' he mouths again. Same eight. Same lamp."],
          ['He reads it and hands it back. "Pro," he says. "Eight a day." He looks at the lamp. "I\'ll do one."', 'He hands it back faster this time. "Pro. One."']), outcome: 'fail' },
      },
      {
        id: 'dock.give-mug',
        when: { verb: 'give', noun: ['mug', 'coffee mug', 'cup'], noun2: FERRY_NOUNS, has: ['mug'] },
        then: { text: (s) => again(s, 'He looks into the mug and hands it back. Empty. It is the first thing on this dock he has felt understood by.', 'He looks in again. Empty, understood, returned.'), outcome: 'snark' },
      },
      {
        id: 'dock.give-standard-key',
        when: { verb: 'give', noun: KEY_NOUNS, noun2: FERRY_NOUNS, has: ['standard key'] },
        then: { text: (s) => again(s, '"Standard," he says, with feeling, and does not take it. "Shared. You keep it, and I\'ve still got it."', '"Shared," he says again. Not taking it.'), outcome: 'fail' },
      },
      {
        id: 'dock.give-personal-key',
        when: { verb: 'give', noun: PERSONAL_NOUNS, noun2: FERRY_NOUNS, has: ['personal key'] },
        then: { text: (s) => again(s, '"Personal," he says, and steps back from it, the way you would step back from a laptop about to close.', "He steps back further. There's a lake behind him; he checks."), outcome: 'fail' },
      },
      // The one word, said instead of given; and the lamp's two words, said at it.
      {
        id: 'dock.say-creds',
        when: { verb: 'say', noun: ['credentials', 'creds', 'password', 'the password', 'gen1 credentials', 'my credentials'] },
        then: {
          text: (s) => (online(s)
            ? again(s, 'You say \'credentials.\' "ONLINE," he says. That chapter is closed; he has a lamp to prove it.', '"ONLINE," he says again. The chapter stays closed.')
            : s.inventory.includes('credentials')
              ? again(s, "You say 'credentials.' He mouths it back and looks at your pocket. Give, not say.", "Said, not given. His hand's still out.")
              : again(s, "You say 'credentials.' He mouths it back. Neither of you is holding any.", "He mouths it again. Nobody's holding anything.")),
          outcome: 'fail',
        },
      },
      {
        id: 'dock.say-online',
        when: { verb: 'say', noun: ['online', 'on'] },
        then: { text: (s) => byLamp(s,
          ["You say 'ONLINE' at the lamp. The lamp does not take dictation.", "Still doesn't."],
          ["You say 'ONLINE.' He says it back, delighted. You have started something.", '"ONLINE." This is going to be a while.']), outcome: 'snark' },
      },
      {
        id: 'dock.say-offline',
        when: { verb: 'say', noun: ['offline', 'off'] },
        then: { text: (s) => byLamp(s,
          ["You say 'OFFLINE.' The Ferryman nods. It is the first time anyone has agreed with the lamp.", 'He nods again. You agree on one thing, the worst one.'],
          ["You say 'OFFLINE.' He flinches. Don't say that near the lamp.", "He flinches again. The lamp doesn't; it's braver."]), outcome: 'snark' },
      },
      {
        id: 'dock.say-dax',
        when: { verb: 'say', noun: ['dax', 'daxx'] },
        then: { text: (s) => byLamp(s,
          ["You say 'DAX' on the dock. The Ferryman mouths it back. He doesn't know what it is; he mouths everything.", "He mouths it again. He still doesn't know."],
          ["You say 'DAX' on the dock. \"ONLINE,\" he says. It is not an answer; it is a reflex.", '"ONLINE," again. A reflex with a lamp.']), outcome: 'snark' },
      },
      {
        id: 'dock.look-lake',
        when: { verb: 'look', noun: LAKE_NOUNS },
        then: { text: (s) => byLamp(s,
          ["The OneLake, from the dock. One lake wide. You could swim it; the Ferryman has watched people try. They're in Bronze now.", "One lake wide. Nobody's swum it yet."],
          ["The OneLake, from the dock. There's a green lamp in the reflection now. It looks like a lake that's about to get crossed.", "Green in the reflection. Uncrossed. That's on you."]), outcome: 'success' },
      },
      {
        id: 'dock.drink-lake',
        when: { verb: 'drink', noun: LAKE_NOUNS },
        then: { text: (s) => byLamp(s,
          ['You drink from the OneLake, dock side. One lake. The Ferryman watches, OFFLINE, and does not stop you; stopping people takes a gateway.', "Another sip. One lake. He doesn't stop you."],
          ['You drink from the OneLake, dock side. The Ferryman winces. "ONLINE," he says, which is not a health warning, but it is the closest he has.', 'Another sip. He winces again. Same word.']), outcome: 'snark' },
      },
      {
        id: 'dock.talk-lamp',
        when: { verb: 'talk', noun: ['lamp', 'status lamp', 'post', 'the lamp', 'status'] },
        then: { text: (s) => byLamp(s,
          ["You address the lamp. OFFLINE, it says. It's the chattiest thing on the dock.", 'OFFLINE, again. One word, already used.'],
          ["You address the lamp. ONLINE, it says, warmly. It has been dying to tell someone.", "ONLINE, again. One word; it's a family thing."]), outcome: 'snark' },
      },
      {
        id: 'dock.talk-boat',
        when: { verb: 'talk', noun: ['boat', 'ferry', 'gateway boat', 'the boat'] },
        then: { text: (s) => again(s, "You talk to the boat. It's named GATEWAY. It does not get the joke either.", "It's still GATEWAY. It's still not laughing."), outcome: 'snark' },
      },
      {
        id: 'dock.use-timetable',
        when: { verb: 'use', noun: ['timetable', 'ferry timetable', 'schedule', 'ferry schedule'] },
        then: { text: (s) => byLamp(s,
          ['You consult the timetable. Next departure: OFFLINE. The one after: OFFLINE. It is the most reliable schedule in the realm.', "OFFLINE on paper. Paper's slower than lamps."],
          ['You consult the timetable. Every departure still says OFFLINE. The lamp came on four minutes ago; paperwork takes years.', 'OFFLINE on paper, still. Paper is losing.']), outcome: 'fail' },
      },
      // ONLINE, the boat is a boat: `board` (or `enter boat`) is the verb; use and open point at it.
      {
        id: 'lake.use-boat-online',
        when: { verb: 'use', noun: ['boat', 'ferry', 'gateway boat'], flags: [{ flag: 'ferry.online' }] },
        then: { text: 'It is a boat. Boats are boarded, not used. `board`, and the Ferryman does the rest, weeping.', outcome: 'fail' },
      },
      {
        id: 'lake.open-boat-online',
        when: { verb: 'open', noun: ['boat', 'ferry', 'gateway boat'], flags: [{ flag: 'ferry.online' }] },
        then: { text: 'It is a boat. Boats are boarded, not opened. `board`, and the Ferryman does the rest, weeping.', outcome: 'fail' },
      },
      {
        // OFFLINE, the lamp is the Dock gate (gates.ts) and the old tap line rotates in its pool. ONLINE, it stays that way.
        id: 'lake.use-lamp-online',
        when: { verb: 'use', noun: ['lamp', 'status lamp', 'post'], flags: [{ flag: 'ferry.online' }] },
        then: { text: 'You tap the lamp. ONLINE. It stays ONLINE. You tap it again to be sure, and the Ferryman flinches.', outcome: 'fail' },
      },
      {
        id: 'dock.open-lamp-online',
        when: { verb: 'open', noun: ['lamp', 'status lamp', 'post'], flags: [{ flag: 'ferry.online' }] },
        then: { text: "It's a lamp, not a dialog.", outcome: 'fail' },
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
    nudge: {
      oblique: (s) => (s.flags['trial.key']
        ? "You've got the key other people can use, which is the whole point of a key. The boat's still there, and the Ferryman's humming."
        : "Two keys, and the plaque says CHOOSE like it's a coin flip. It isn't. One of them dies when a laptop closes."),
      plainer: (s) => (s.flags['trial.key'] ? '' : "The Ferryman said it when he came back to life: Standard mode. He wasn't reviewing a hotel."),
    },
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
      // The voice sweep (Task F5): both at once is not a choice (a one-beat refusal, by how many you have taken).
      {
        id: 'island.get-keys',
        when: { verb: 'get', noun: ['keys', 'both keys', 'both', 'two keys', 'the keys', 'both of them'] },
        then: {
          text: (s) => (s.flags['taken.standard key'] && s.flags['taken.personal key'] ? 'Both. The plaque has given up on you.'
            : s.flags['taken.standard key'] || s.flags['taken.personal key'] ? 'You chose. The other one is not a second choice; it is a collection.'
            : 'One at a time. CHOOSE, not COLLECT.'),
          outcome: 'fail',
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
        then: { text: (s) => again(s, 'CHOOSE. THEN LIVE WITH IT. — The Gateway Council, 2018', 'Same words. 2018. The Council has not reconvened.'), outcome: 'success' },
      },
      {
        id: 'lake.personal-plinth',
        when: { verb: 'use', noun: PERSONAL_NOUNS, noun2: ['plinth', 'stone plinth', 'stand', 'hollow'], has: ['personal key'] },
        then: { text: (s) => again(s, 'It fits. It is yours alone. Nobody else can ever use it. That is the problem.', "Fits again. Only yours, again. Not an improvement."), outcome: 'snark' },
      },
      {
        id: 'island.standard-plinth',
        when: { verb: 'use', noun: KEY_NOUNS, noun2: ['plinth', 'stone plinth', 'stand', 'hollow'], has: ['standard key'] },
        then: { text: (s) => again(s, 'It fits. It fits everyone\'s hand, which is the point, and also why it is cold.', 'It fits again. Pocket it; the Ledge wants it more than the hollow does.'), outcome: 'snark' },
      },
      {
        id: 'island.use-key-plaque',
        when: { verb: 'use', noun: [...KEY_NOUNS, ...PERSONAL_NOUNS], noun2: PLAQUE },
        then: { text: "The plaque doesn't take keys. It takes decisions, and it has yours on file.", outcome: 'fail' },
      },
      {
        id: 'lake.island-plinth',
        when: { verb: 'use', noun: PLINTH },
        then: {
          text: (s) => again(s,
            `You put your hand in the STANDARD hollow. It fits. Everyone fits. That is what shared means. The PERSONAL hollow has no ${MALAPROPS.capacitude} for that.`,
            "It fits again. Shared doesn't stop fitting."),
          outcome: 'fail',
        },
      },
      {
        id: 'island.open-plinth',
        when: { verb: 'open', noun: PLINTH },
        then: { text: 'The hollows are as open as they get.', outcome: 'fail' },
      },
      {
        id: 'island.open-plaque',
        when: { verb: 'open', noun: PLAQUE },
        then: { text: "A plaque doesn't open. It's read, then lived with.", outcome: 'fail' },
      },
      // He is in the boat, humming; the island has no ferryman in it, only a ferryman next to it.
      {
        id: 'island.talk-ferryman',
        when: { verb: 'talk', noun: FERRY_NOUNS },
        then: {
          text: (s, _w, cmd) => (cmd?.noun2 && /key|standard|personal|choose|plinth|plaque/.test(cmd.noun2)
            ? again(s, "He hums louder. He said it on the dock: standard mode. He's not saying it on an island.", "Louder still. Standard mode was said, once, on a dock. That's the policy.")
            : again(s, "He hums from the boat. He's not getting out; islands are for choosing, not for ferrymen.", "Same hum. One tune: the boarding call.")),
          outcome: 'snark',
        },
      },
      {
        id: 'island.say-standard',
        when: { verb: 'say', noun: ['standard', 'standard mode', 'standard key'] },
        then: { text: (s) => again(s, "You say 'standard.' Good choice. Saying it isn't taking it, and the plinth has heard a lot of good choices.", 'A good choice, twice. Said, not taken.'), outcome: 'snark' },
      },
      {
        id: 'island.say-personal',
        when: { verb: 'say', noun: ['personal', 'personal mode', 'personal key'] },
        then: { text: (s) => again(s, "You say 'personal.' The plinth has heard that one too, usually from people with one laptop and no friends.", 'Personal, again. One laptop, again.'), outcome: 'snark' },
      },
      {
        id: 'island.look-boat',
        when: { verb: 'look', noun: ['boat', 'ferry', 'gateway boat', 'the gateway', 'gateway', 'the boat'] },
        then: { text: (s) => again(s, "The GATEWAY, tied to the island. The Ferryman's in it, humming, ready to take you and exactly one decision back.", "Tied up, humming. He's in no hurry; he was OFFLINE four years."), outcome: 'success' },
      },
      {
        id: 'island.look-ferryman',
        when: { verb: 'look', noun: ['ferryman', 'ferry man', 'boatman', 'the ferryman'] },
        then: { text: (s) => again(s, "He's in the boat, humming. He has the posture of a man whose credentials work. It's new on him.", "He checks the dock's lamp from here, with his eyes, every few seconds."), outcome: 'success' },
      },
      {
        id: 'island.look-island',
        when: { verb: 'look', noun: ['island', 'isle', 'the island', 'the isle', 'isle of gateway', 'ground'] },
        then: {
          text: (s) => {
            const left = 2 - Number(!!s.flags['taken.standard key']) - Number(!!s.flags['taken.personal key']);
            return again(s, `An island with a plinth, ${left === 2 ? 'two keys' : left === 1 ? 'one key' : 'no keys'} and a plaque. Small. A gateway doesn't need room; it needs one machine that stays on.`, "No gift shop. It's a gateway.");
          },
          outcome: 'success',
        },
      },
      {
        id: 'island.look-keys',
        when: { verb: 'look', noun: ['keys', 'both keys', 'the keys', 'two keys', 'both'] },
        then: {
          text: (s) => {
            const std = !!s.flags['taken.standard key'], per = !!s.flags['taken.personal key'];
            return std && per ? 'No keys. Two hollows. You did that.'
              : std ? "One key left, PERSONAL. The other one's in your pocket, being a decision."
              : per ? "One key left, STANDARD. The other one's in your pocket, being a mistake."
              : 'Two keys: PERSONAL and STANDARD. One of them is a decision, and the other is a mistake with a lanyard.';
          },
          outcome: 'success',
        },
      },
      {
        id: 'island.drink',
        when: { verb: 'drink', noun: LAKE_NOUNS },
        then: { text: (s) => again(s, 'You drink from the OneLake, island side. Same lake. Same one. You taste the workspace you forgot you owned.', 'Same lake, second sip. The workspace tastes abandoned.'), outcome: 'snark' },
      },
    ],
  }),
  room({
    id: 'swamp.bronze', name: 'Bronze Marsh', region: 'swamp',
    enterQuip: () => 'Everything here is a string. Including, briefly, you.',
    describe: () =>
      "The Bronze Marsh. Raw data pools in every footprint. Nothing has a type. Nothing has a name. A CSV floats by with 'Column1, Column2, Column3' on its face. Your first semantic model was one table. It still is. It is somewhere under here. The shore is north; the marsh silvers to the south.",
    exits: { n: 'lake.shore', s: 'swamp.silver' },
    items: ['water', 'csv', 'stress ball'],
    npcs: [],
    scene: () => 'swamp.bronze',
    flaskHint: (s) => (s.inventory.includes('shortcut')
      ? 'Use the shortcut. You are carrying a pointer and walking through raw data anyway.'
      : 'Do not drink anything. Go south until things have names.'),
    nudge: {
      oblique: (s) => (s.inventory.includes('shortcut')
        ? "You're wading through raw data with a pointer in your pocket. Even Column3 knows what a pointer is for."
        : "Everything in here is a string and you're the only one with a data type. Keep it that way; the marsh improves the further you get from the shore."),
    },
    rules: [
      ...adeInSwamp('bronze'),
      {
        id: 'death.bronze',
        when: { verb: 'drink' },
        then: { text: 'You drink raw data. Nothing is typed. Everything is a string. You are a string. Your mom told you never to drink from the Bronze layer. And NOW look.', death: 'death.bronze' },
      },
      {
        id: 'swamp.get-csv',
        when: { verb: 'get', noun: ['csv', 'file', 'column1'] },
        then: { text: (s) => again(s, 'You grab the CSV. It has 3 columns and 9 million rows, and every one of them is a header. You let it go.', "You grab it again. Nine million headers. You let go; it's getting used to it."), outcome: 'snark' },
      },
      {
        id: 'swamp.tag-csv',
        when: { verb: 'use', noun: ['name tag', 'tag', 'nametag', 'hello tag'], noun2: CSV, has: ['name tag'] },
        then: { text: (s) => again(s, "You stick 'Column3' on the CSV. It already had a Column3. Power Query notices and helpfully renames yours Column3_1. You have made it worse, with a suffix.", "You stick it on again. Column3_2. It's a hierarchy now; parent-child, and ragged."), outcome: 'snark' },
      },
      // The voice sweep (Task F5): the columns, named by hand; the CSV, opened and spoken to; the marsh, in every verb.
      {
        id: 'swamp.name-columns',
        when: { verb: 'use', verbWord: ['label', 'mark', 'fix', 'format'], noun: ['columns', 'column', 'column1', 'the columns'] },
        then: { text: nameColumns, outcome: 'snark' },
      },
      {
        id: 'bronze.open-csv',
        when: { verb: 'open', noun: CSV },
        then: { text: (s) => again(s, 'You open the CSV. Nine million rows, all headers. It opens in Excel by default; everything does.', 'All headers, again. Excel asks whether to save your changes. You made none. It asks anyway.'), outcome: 'snark' },
      },
      {
        id: 'bronze.talk-csv',
        when: { verb: 'talk', noun: CSV },
        then: { text: (s) => again(s, "'Column1,' it says. 'Column2. Column3.' It's introducing itself. It only knows the one way.", "'Column1,' again. It's never getting to Column4."), outcome: 'snark' },
      },
      {
        id: 'bronze.talk-marsh',
        when: { verb: 'talk', noun: ['marsh', 'water', 'the marsh', 'bronze', 'raw data', 'data', 'swamp'] },
        then: { text: (s) => again(s, "You address the marsh. It answers in strings. All of them say 'null', and none of them are null.", "'null,' again. A string. Not null."), outcome: 'snark' },
      },
      {
        id: 'bronze.use-marsh',
        when: { verb: 'use', noun: ['marsh', 'water', 'the marsh', 'raw data', 'data', 'bronze', 'swamp'] },
        then: { text: (s) => again(s, 'You use raw data. Directly. In a report. Somewhere, a Gold layer weeps.', "Directly, again. The Gold layer has stopped weeping; it's filing a ticket."), outcome: 'snark' },
      },
      {
        id: 'bronze.open-marsh',
        when: { verb: 'open', noun: ['marsh', 'water', 'the marsh', 'bronze', 'swamp', 'raw data'] },
        then: { text: "Open? Nothing in Bronze is closed; that's the problem.", outcome: 'fail' },
      },
      {
        id: 'bronze.say-dax',
        when: { verb: 'say', noun: ['dax', 'daxx'] },
        then: { text: (s) => again(s, `You say 'DAX' in the Bronze. Nothing here has a type, so nothing can be ${MALAPROPS.daxxed}. The strings don't look up.`, 'Strings. Untyped. Not looking up.'), outcome: 'snark' },
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
    nudge: {
      oblique: (s) => (s.inventory.includes('shortcut')
        ? "You're standing in Silver with a pointer, walking. The pointer is embarrassed for you."
        : "Things have names here. One layer further in, they have types, and something's standing at the water's edge that would fit in a pocket."),
    },
    rules: [
      ...adeInSwamp('silver'),
      {
        id: 'swamp.drink-silver',
        when: { verb: 'drink' },
        then: { text: (s) => again(s, `You drink Silver water. It has been deduplicated. You feel slightly less redundant. You feel ${MALAPROPS.refreshered}.`, 'Another sip. Nothing removed; you were already unique, in the bad way.'), outcome: 'snark' },
      },
      {
        id: 'swamp.read-columns',
        when: { verb: 'read', noun: ['column names', 'columns', 'column', 'names', 'column name', 'headers'] },
        then: { text: readColumns, outcome: 'success' },
      },
      {
        id: 'silver.look-columns',
        when: { verb: 'look', noun: ['column names', 'columns', 'column', 'names', 'column name', 'headers'] },
        then: { text: readColumns, outcome: 'success' },
      },
      // The voice sweep (Task F5): the log, opened, read and spoken to; the tag on things that are not columns; the marsh.
      {
        id: 'swamp.use-log',
        when: { verb: 'use', noun: LOG },
        then: { text: useLog, outcome: 'snark' },
      },
      {
        id: 'silver.open-log',
        when: { verb: 'open', noun: LOG },
        then: { text: useLog, outcome: 'snark' },
      },
      {
        id: 'silver.read-log',
        when: { verb: 'read', noun: LOG },
        then: { text: (s) => again(s, 'You read one. {"add": "you"}. Then {"remove": "you"}. It has done this with other Report Builders, and it will again.', "Same two entries. Not a story; a ledger."), outcome: 'success' },
      },
      {
        id: 'silver.talk-log',
        when: { verb: 'talk', noun: LOG },
        then: { text: (s) => again(s, "You talk to the log. It writes that down. It writes everything down; that's the whole personality.", 'Written down. Version 2 of the conversation.'), outcome: 'snark' },
      },
      {
        id: 'silver.tag-log',
        when: { verb: 'use', noun: ['name tag', 'tag', 'nametag', 'hello tag'], noun2: LOG, has: ['name tag'] },
        then: { text: (s) => again(s, 'You stick Column3 on the log. It logs it: add, Column3. It never takes it off; it just never counts it.', 'Logged again. add, Column3. Not counted.'), outcome: 'snark' },
      },
      {
        id: 'silver.tag-water',
        when: { verb: 'use', noun: ['name tag', 'tag', 'nametag', 'hello tag'], noun2: ['water', 'marsh', 'silver', 'the marsh', 'swamp'], has: ['name tag'] },
        then: { text: (s) => again(s, 'You drop the tag in the Silver. It comes back: Column3, once. There was only ever one.', 'Column3 again. One. The marsh is sure.'), outcome: 'snark' },
      },
      {
        id: 'silver.look-water',
        when: { verb: 'look', noun: ['water', 'marsh', 'the marsh', 'silver', 'silver water', 'the water', 'swamp'] },
        then: { text: (s) => again(s, 'Silver water. Cleaner, and it knows it. It reflects you once; the duplicates were removed.', 'One of you in it. The marsh checked.'), outcome: 'success' },
      },
      {
        id: 'silver.get-water',
        when: { verb: 'get', noun: ['water', 'marsh', 'the marsh', 'silver', 'silver water', 'the water', 'swamp'] },
        then: { text: (s) => again(s, "Deduplicated. There's one of it, and it's staying.", 'Still one of it. Your second try is a duplicate. Removed.'), outcome: 'fail' },
      },
      {
        id: 'silver.open-marsh',
        when: { verb: 'open', noun: ['water', 'marsh', 'the marsh', 'silver', 'swamp'] },
        then: { text: "It's a marsh, not a folder. Well. It's also a folder.", outcome: 'fail' },
      },
      {
        id: 'silver.say-dax',
        when: { verb: 'say', noun: ['dax', 'daxx'] },
        then: { text: (s) => again(s, "You say 'DAX' in the Silver. The transaction logs write it down. Verbatim. With a timestamp.", 'They write it down again. Two entries now, one second apart, both you.'), outcome: 'snark' },
      },
    ],
  }),
  room({
    id: 'swamp.gold', name: 'Gold Marsh', region: 'swamp',
    enterQuip: () => 'Gold Marsh. Clean, modeled, and suspiciously quiet.',
    describe: (s) =>
      `The Gold Marsh. Everything here has a business name and a data type. It is beautiful. Nothing here has been ${MALAPROPS.daxxed} yet. Give it time.` +
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
    nudge: {
      oblique: (s) => (!s.flags['taken.shortcut']
        ? "Something at the water's edge is pointing everywhere at once. It weighs nothing, because it isn't the data, and it would fit in your pocket."
        : s.inventory.includes('shortcut') ? "You're carrying a pointer through a marsh. Pointers are for not walking."
          : 'You had a pointer and you put it down somewhere, which is how most data engineering incidents start.'),
      plainer: (s) => (!s.flags['taken.shortcut'] ? "That signpost is a OneLake shortcut. Nobody has ever moved a byte by picking one up." : ''),
    },
    rules: [
      {
        id: 'swamp.shortcut',
        when: { verb: 'get', noun: SIGNPOST, flags: [{ flag: 'taken.shortcut', not: true }] },
        then: { text: "You pick up the Shortcut. It weighs nothing. It's just a pointer.", give: ['shortcut'], points: 10, sfx: 'item' },
      },
      {
        // Room rules run before the global use-shortcut teleport, so this one stays put.
        id: 'swamp.shortcut-marsh',
        when: { verb: 'use', noun: SIGNPOST, noun2: MARSH, has: ['shortcut'] },
        then: { text: (s) => again(s, 'The shortcut points at itself. The marsh briefly contains the marsh. No data was moved. Nothing was learned.', 'It points at itself again. The marsh contains the marsh, which contains the marsh. No data moved, three times.'), outcome: 'snark' },
      },
      ...adeInSwamp('gold'),
      {
        id: 'swamp.drink-gold',
        when: { verb: 'drink' },
        then: { text: (s) => again(s, 'You drink Gold water. It tastes like a well-named measure.', "Another measure. This one's called Total Sips."), outcome: 'snark' },
      },
      // The voice sweep (Task F5): the signpost, read where it stands or in your hand; the marsh, the names, the path east.
      {
        id: 'swamp.read-signpost',
        when: { verb: 'read', noun: SIGNPOST },
        then: {
          text: (s, w) => (!signHere(s, w)
            ? 'Nothing to read where it stood. It is wherever you put it down, pointing at here.'
            : again(s, "SHORTCUT, it says, pointing everywhere at once. Below: 'no data was moved.' Below that, smaller: 'no data was moved.'", "SHORTCUT. 'no data was moved.' 'no data was moved.' Read twice; still nothing moved, including you.")),
          outcome: 'success',
        },
      },
      {
        id: 'gold.talk-signpost',
        when: { verb: 'talk', noun: SIGNPOST },
        then: { text: (s, w) => (!signHere(s, w) ? 'You talk to where the signpost was. It points somewhere else, from wherever it is; that is the whole idea.' : again(s, `You talk to the ${s.inventory.includes('shortcut') ? 'shortcut in your pocket' : 'signpost'}. It points somewhere else. It's not rude; it's a pointer.`, "Pointing away. Pointers don't do eye contact.")), outcome: 'snark' },
      },
      {
        id: 'gold.open-signpost',
        when: { verb: 'open', noun: SIGNPOST },
        then: { text: "It's a pointer. Nothing is inside; that's what a pointer is.", outcome: 'fail' },
      },
      {
        // Not carried and still standing: leaning on it is not using it (carried, the global teleport answers `use`).
        id: 'gold.use-signpost-standing',
        when: { verb: 'use', noun: SIGNPOST, notHas: ['shortcut'], flags: [{ flag: 'taken.shortcut', not: true }] },
        then: { text: 'You lean on the signpost. It points at you, briefly. Pick it up; it weighs nothing.', outcome: 'fail' },
      },
      {
        id: 'gold.look-water',
        when: { verb: 'look', noun: ['water', 'marsh', 'the marsh', 'gold', 'gold water', 'the water', 'swamp'] },
        then: { text: (s) => again(s, 'Gold water. Typed, named, modeled. It reflects you back with a business name: Peasant (Active).', 'Peasant (Active). Reviewed; the name stays.'), outcome: 'success' },
      },
      {
        id: 'gold.get-water',
        when: { verb: 'get', noun: ['water', 'marsh', 'the marsh', 'gold', 'gold water', 'the water', 'swamp'] },
        then: { text: (s) => again(s, "You can't take Gold water. It's modeled. It belongs to the business now.", "The business says no, in a meeting."), outcome: 'fail' },
      },
      {
        id: 'gold.open-marsh',
        when: { verb: 'open', noun: ['water', 'marsh', 'the marsh', 'gold', 'swamp'] },
        then: { text: "Open the Gold? You'd need a business reason, and a name for it.", outcome: 'fail' },
      },
      {
        id: 'gold.look-names',
        when: { verb: 'look', noun: ['names', 'business names', 'measures', 'measure', 'types', 'data types', 'the names', 'business name'] },
        then: { text: (s) => again(s, 'Everything has a business name. Three of them are Net Sales. The fight is scheduled for Q3.', 'Three Net Sales. Q3 never comes.'), outcome: 'success' },
      },
      {
        id: 'gold.look-path',
        when: { verb: 'look', noun: ['path', 'monastery', 'east', 'the path', 'trail', 'the monastery'] },
        then: { text: (s) => again(s, "East, a path climbs to a monastery. You can hear a session starting from here. You'll hear it for a while.", 'You can hear the percent from here.'), outcome: 'success' },
      },
      {
        id: 'gold.say-dax',
        when: { verb: 'say', noun: ['dax', 'daxx'] },
        then: { text: (s) => again(s, "You say 'DAX' in the Gold. The measures look up. It is the first time anything in a marsh has looked up.", `They look up again. One of them glows. It is about to be ${MALAPROPS.daxxed}, and it knows.`), outcome: 'snark' },
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
    nudge: { oblique: (s) => `You've been standing in a house on a lake for four turns waiting for it to become a puzzle, ${nick(s)}. It's a house. On a lake. Marketing did the rest.` },
    rules: [
      { id: 'lake.house.enter', when: { verb: 'open', noun: ['door', 'house', 'front door'] }, then: { text: goIn, outcome: 'fail' } },
      { id: 'lake.house.in', when: { verb: 'go', dir: 'in' }, then: { text: goIn, outcome: 'fail' } },
      { id: 'lake.house.sit', when: { verb: 'use', noun: ['chair', 'deck chair', 'sit', 'porch', 'deck'] }, then: { text: sitDeck, outcome: 'fail' } },
      { id: 'lake.house.knock', when: { verb: 'use', noun: ['knock', 'door'] }, then: { text: knock, outcome: 'fail' } },
      { id: 'lake.house.buy', when: { verb: 'use', noun: ['buy', 'buy house', 'house', 'purchase'] }, then: { text: buy, outcome: 'fail' } },
      { id: 'lake.house.fish', when: { verb: 'use', noun: ['fish', 'fishing', 'rod'] }, then: { text: fish, outcome: 'fail' } },
      // The voice sweep (Task F5): the mailbox, the sign, the house itself, each answering the obvious verbs, no points anywhere.
      { id: 'lake.house.mailbox', when: { verb: 'open', noun: ['mailbox', 'mail box', 'post box'] }, then: { text: (s) => again(s, 'One new CSV. It has been in there since bronze. You leave it; the mailbox is also a Lakehouse, legally.', 'One new. You leave it again. Legally, a Lakehouse.'), outcome: 'fail' } },
      { id: 'house.use-mailbox', when: { verb: 'use', noun: ['mailbox', 'mail box', 'post box', 'flag'] }, then: { text: (s) => again(s, 'You put the flag up. Outgoing: nothing. The mailbox lowers it again; it knows you.', 'Up. Down. It has a policy about you.'), outcome: 'fail' } },
      { id: 'house.get-mail', when: { verb: 'get', noun: ['mail', 'csv', 'letter', 'post', 'the mail', 'new mail', 'the csv'] }, then: { text: (s) => again(s, "You reach in. It's the same CSV. You know it. It knows you. You leave it.", 'Same CSV. Same you. Still leaving it.'), outcome: 'fail' } },
      { id: 'house.talk-mailbox', when: { verb: 'talk', noun: ['mailbox', 'mail box', 'post box'] }, then: { text: (s) => again(s, "'1 new,' says the mailbox. It is the only thing it has ever said, and it has never been wrong.", "'1 new.' Not a conversation. A status."), outcome: 'snark' } },
      { id: 'house.get-house', when: { verb: 'get', noun: ['house', 'lake house', 'lakehouse', 'the house'] }, then: { text: "It's a house. On a lake. No.", outcome: 'fail' } },
      { id: 'house.use-sign', when: { verb: 'use', noun: ['sign', 'lakehouse sign', 'porch sign'], notHas: ['shortcut'] }, then: { text: "The sign's not a control. It's a compromise, in two fonts.", outcome: 'fail' } },
      { id: 'house.open-sign', when: { verb: 'open', noun: ['sign', 'lakehouse sign', 'porch sign'] }, then: { text: "It's two fonts. Neither opens.", outcome: 'fail' } },
      { id: 'house.look-house', when: { verb: 'look', noun: ['house', 'lake house', 'the house', 'lakehouse', 'the lake house'] }, then: { text: (s) => looks(s, "A house. On a lake. You're looking right at it. It doesn't get more house, or more lake.", 'You look harder. House. Lake.', 'House. Lake. The realtor has stopped making eye contact with you too.'), outcome: 'success' } },
      { id: 'house.look-lake', when: { verb: 'look', noun: LAKE_NOUNS }, then: { text: (s) => again(s, "The lake. The house is on it. That's the pitch. That's the whole pitch.", "On it, yes. That's the pitch."), outcome: 'success' } },
      { id: 'house.look-porch', when: { verb: 'look', noun: ['porch', 'deck', 'veranda', 'the porch', 'the deck'] }, then: { text: (s) => again(s, 'A porch. It faces the lake. So do the chair, the mailbox and the sign; nothing here faces the files.', "Facing the lake. Nothing's turned around."), outcome: 'success' } },
      { id: 'house.say-lakehouse', when: { verb: 'say', noun: ['lakehouse', 'lake house', 'the lakehouse'] }, then: { text: (s) => again(s, "You say 'Lakehouse.' The sign lights up, half in serif. Marketing feels it from here.", "You say it again. Both fonts light up this time. Somebody's getting promoted."), outcome: 'snark' } },
      { id: 'house.drink', when: { verb: 'drink', noun: LAKE_NOUNS }, then: { text: (s) => again(s, "You drink the lake. It tastes like a house. That shouldn't be possible, and marketing agrees.", "House, again. Marketing's looking into it."), outcome: 'snark' } },
    ],
  }),
]);

/**
 * Raw-line commands at the Lake House. Registered ahead of PHRASE_RULES (see world/index.ts), so these scoped
 * lines beat the global eggs they overlap (sit, swim, knock, buy, fish). Every one has a second line for the same
 * command typed again (Task F5, `again`).
 */
export const LAKEHOUSE_PHRASES: PhraseRule[] = [
  { id: 'lake.house.sit-egg', room: 'lake.house', test: /^(sit|sit down|sit in chair|sit on porch|rest|relax|chill|lounge|sunbathe|recline)$/, text: sitDeck },
  { id: 'lake.house.swim-egg', room: 'lake.house', test: /^(swim|dive|jump in|wade)\b/, text: (s) => again(s, 'You wade in. It is a lake. It is also, somehow, a house. You are now inside a house while swimming. You get out.', 'In again. House. Lake. You in both. Out.') },
  { id: 'lake.house.knock-egg', room: 'lake.house', test: /^knock\b/, text: knock },
  { id: 'lake.house.buy-egg', room: 'lake.house', test: /^(buy|purchase|make an offer)\b/, text: buy },
  { id: 'lake.house.fish-egg', room: 'lake.house', test: /^(fish|go fishing|cast)\b/, text: fish },
];

/**
 * The lake's and the marshes' gag phrases (Task F5): raw-line rules for the verbs the parser has no word for (throw,
 * sit in, row, hum, weep, name, smell, swim, dig). Room-scoped, so each beats the global egg it would otherwise fall to
 * (egg.throw, egg.sit, egg.sing, egg.cry, egg.smell, egg.swim, egg.dig); registered right after VILLAGE_PHRASES
 * (world/index.ts), ahead of APPLIED_STEP_PHRASES and the gates. None of them uses a gate verb on a gate noun, so the
 * Dock's OFFLINE gate keeps every `open`/`use`/`push`/`climb`/`enter` on the boat, the lamp and the man (`sit in boat`
 * parses to `sit`, which the gate does not claim). Only the throws carry `then` (the pebble leaves your pocket in the
 * OneLake, the Bronze and the Gold), and no phrase here answers an `open`/`use`/`push`/`try` form, so no bit of scenery
 * stops counting for the fishing line (builtins isScenery). Every one has a second line for the same command typed
 * again (`again`); the same throw, smell, swim and dig read differently by marsh layer.
 */
const SIT_BOAT = /^(sit|get|hop|settle) (in|into|on|onto|aboard|down in)( the)? (boat|ferry|gateway)$/;
const SMELL = /^(smell|sniff)( the| this| that)? (marsh|water|air|it|bronze|silver|gold|swamp|data|here)$/;
const SWIM = /^(swim|dive|bathe|wade)\b/;
const DIG = /^(dig|excavate|burrow)\b/;
export const LAKE_PHRASES: PhraseRule[] = [
  // ---- The shore ----
  throwPebble('lake.throw-pebble', 'lake.shore', MIME_LAKE, (_s, line) => (/\b(him|ferryman|ferry man|boatman|boat|lamp)\b/.test(line)
    // Right idea, too far away: he is a whole dock east.
    ? { id: 'shore.throw-pebble-ferryman', then: { text: "He's east, on the dock. You'd need an arm like a gateway, and you have an arm like a Pro license.", outcome: 'fail' } }
    : { id: 'lake.skip-pebble', then: SKIP })),
  // ---- The dock ----
  throwPebble('dock.throw-pebble', 'lake.dock', MIME_DOCK, (s, line) => (/\b(him|ferryman|ferry man|boatman|boat|lamp)\b/.test(line)
    ? { id: 'dock.throw-pebble-ferryman', then: { text: (online(s)
      ? 'You throw the pebble at the Ferryman. He catches it, ONLINE, and drops it back in your pocket without comment. Gateways pass things through.'
      : 'You throw the pebble at the Ferryman. It gets a foot from him, remembers he has no gateway, and comes back to your hand.'), outcome: 'snark' } }
    : { id: 'dock.skip-pebble', then: { ...SKIP, text: `Skip. Skip. Sink. Three hops off the dock, then a Delta file. The Ferryman watches, ${online(s) ? 'ONLINE, and nods once, professionally' : "OFFLINE, like a man watching someone else's refresh succeed"}.` } })),
  { id: 'lake.sit-boat', room: 'lake.dock', test: SIT_BOAT, text: (s) => byLamp(s,
    ['You sit in the boat. It does not move. Neither does the Ferryman. You are all OFFLINE together, which is almost company.', 'You sit again. Nobody is shamed into a crossing, least of all a lamp.'],
    ['You sit in the boat. The Ferryman clears his throat. Sitting is not boarding, and he has waited four years for someone to know the difference.', "He waits. He has one word this year, and it isn't 'board.'"]) },
  { id: 'dock.row-boat', room: 'lake.dock', test: /^((row|paddle)( the)? (boat|ferry|gateway)|row|paddle)$/, text: (s) => byLamp(s,
    ["You row. The boat's tied to the dock, the dock's tied to the lamp, and the lamp says no.", "You row again. The lamp's still the anchor."],
    ["You row. The Ferryman takes the oars from you, gently, the way you'd take a mouse from a director.", "He takes the oars again, faster."]) },
  { id: 'dock.untie-boat', room: 'lake.dock', test: /^(untie|unmoor|launch|cast off)( the)? (boat|ferry|gateway)$/, text: (s) => byLamp(s,
    ['The boat comes untied. It stays. A rope was never what was holding it.', 'Untied, and here. It was never the rope.'],
    ["The boat comes untied. The Ferryman ties it again, and waits. He'd rather you boarded.", 'Untied, retied. He can do this all day; he has.']) },
  { id: 'dock.hum', room: 'lake.dock', test: /^(hum|whistle)( (the )?(boarding call|tune|along))?$/, text: (s) => byLamp(s,
    ["You hum. He mouths along. He doesn't know the tune; he mouths everything.", 'He mouths along again. No tune yet.'],
    ["You hum. The Ferryman hums back. Same tune; it's the only one he has, and it's the boarding call.", "A duet now, and it's the boarding call."]) },
  { id: 'dock.weep', room: 'lake.dock', test: /^(cry|weep|sob)( with (the )?ferryman)?$/, text: (s) => byLamp(s,
    ["You weep. He weeps. The lamp stays red; it doesn't do sympathy, it does status.", "More weeping. The lamp's unmoved; it's a lamp."],
    ['You weep. He weeps. Two grown men at a green lamp, and the boat, which has seen worse.', "Again. The boat has seen this now, too."]) },
  // ---- The isle ----
  { id: 'island.sit-boat', room: 'lake.island', test: SIT_BOAT, text: (s) => again(s, "You sit in the boat. The Ferryman hums and waits. Sitting isn't boarding here either.", "He'll wait. He has had practice.") },
  // ---- The marshes: one verb, three layers ----
  { id: 'swamp.name-columns-words', room: 'swamp.bronze', test: /^(name|rename|type)( the)? columns?$/, text: nameColumns },
  throwPebble('bronze.throw-pebble', 'swamp.bronze', MIME_MARSH, () => ({ id: 'bronze.pebble-string', then: { text: "You throw the pebble into the Bronze. It lands as a string: 'pebble'. Lowercase. Nothing here will ever cast it back.", remove: ['pebble'], set: { 'pebble.bronzed': true }, outcome: 'snark' } })),
  throwPebble('silver.throw-pebble', 'swamp.silver', MIME_MARSH, (s) => ({ id: 'silver.pebble-back', then: { text: again(s, 'You throw the pebble into the Silver. It comes back. There was already one, and the marsh does not keep duplicates.', "Back again. One pebble here, and it's yours; take the hint."), outcome: 'snark' } })),
  throwPebble('gold.throw-pebble', 'swamp.gold', MIME_MARSH, () => ({ id: 'gold.pebble-named', then: { text: 'You throw the pebble into the Gold. It lands, gets a business name, and is now Pebble (Active). You leave it; it has a career.', remove: ['pebble'], set: { 'pebble.golded': true }, outcome: 'snark' } })),
  { id: 'bronze.smell', room: 'swamp.bronze', test: SMELL, text: (s) => again(s, 'You sniff. Raw data. It smells like a CSV that has been in a hot car.', 'Same hot car. Same CSV.') },
  { id: 'silver.smell', room: 'swamp.silver', test: SMELL, text: (s) => again(s, 'You sniff. Cleaner. Judgmental, like a code review.', 'Judgmental, and it has read your Column3.') },
  { id: 'gold.smell', room: 'swamp.gold', test: SMELL, text: (s) => again(s, "You sniff. It smells like a well-named measure. You didn't know they had a smell. They do; it's expensive.", "Expensive. Somebody's paying for the naming.") },
  { id: 'bronze.swim', room: 'swamp.bronze', test: SWIM, text: (s) => again(s, "You wade into the Bronze. Everything you're wearing is a string now, including the license.", 'Strings, again. Wetter ones.') },
  { id: 'silver.swim', room: 'swamp.silver', test: SWIM, text: (s) => again(s, "You wade into the Silver. You come out deduplicated. There was only ever one of you, but now it's enforced.", 'One of you. The marsh checked twice.') },
  { id: 'gold.swim', room: 'swamp.gold', test: SWIM, text: (s) => again(s, 'You wade into the Gold. You come out with a business name and a data type. Neither is flattering.', "Typed, unflattering. The name is Peasant (Active); the type is your problem.") },
  { id: 'bronze.dig', room: 'swamp.bronze', test: DIG, text: (s) => again(s, "You dig. Under the strings: more strings. Under those, a header row. It's headers all the way down.", "More headers. Second row. They go on.") },
  { id: 'silver.dig', room: 'swamp.silver', test: DIG, text: (s) => again(s, 'You dig. A _delta_log. It logs the dig.', "Logged too. There's a folder for you now.") },
  { id: 'gold.dig', room: 'swamp.gold', test: DIG, text: (s) => again(s, 'You dig. You hit a shortcut. It points at the hole.', 'Another shortcut. It points at the first one.') },
];
