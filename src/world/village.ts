import type { GameState } from '../engine/types';
import type { Cond, PhraseRule, Room, Rule } from './types';
import { isFlood, setting } from '../engine/governance';
import { knowsTopic, talkTo } from '../engine/builtins';
import { xmlaRouteFrom } from './sacristy';
import { MALAPROPS } from './voice';

const room = (r: Room): [string, Room] => [r.id, r];

/** The cottage's proper name (spec2 §7). The id stays `village.cottage`: saves store rooms by index, and the scenes key on it. */
const COTTAGE = 'village.cottage';

const JEFF = ['jeff', 'jeff from finance', 'finance', 'man'];
const MILLER = ['miller', 'old miller', 'old man', 'the miller'];
const MANUAL = ['manual', 'scarecrow', 'scarecrow named manual'];
const NOTE = ['sticky note', 'note', 'sticky', 'post it', 'postit'];
const USB = ['usb stick', 'usb', 'stick', 'usb drive', 'thumb drive', 'flash drive', 'final_v2'];

/**
 * The same line typed again, in a row (the skill's "gag command, then the same gag again": commit fully the first time,
 * then "you did that already"). Read off `recent`, which the engine sets before any rule runs, so no flag is touched.
 * The second line IS the repeat joke; a third try says it again verbatim.
 */
const again = (s: GameState, first: string, second: string): string => ((s.recent?.n ?? 1) >= 2 ? second : first);

/** The scarecrow, triggered: the rule (`use manual`) and the Fields phrase (`refresh manual`, which the global egg.refresh would otherwise take). */
const TRIGGER_MANUAL = 'You trigger Manual by hand. He refreshes. It takes eleven minutes. Nothing was waiting on it.';
const triggerManual = (s: GameState): string => again(s, TRIGGER_MANUAL, `You trigger him again. Eleven more minutes. He is thoroughly ${MALAPROPS.refreshered} now, and nothing was waiting on that either.`);
/** A refresh, picked (the rule `get refresh` and the Fields phrase `pick a refresh`, since `pick` alone is not a parser verb). */
const GET_REFRESH = `You pick a refresh. It fails in your hand. Error: the gateway is offline. Somewhere, a ferryman weeps. Not enough ${MALAPROPS.capacitude}.`;
const getRefresh = (s: GameState): string => again(s, GET_REFRESH, 'You pick another. Same error, other hand.');
/**
 * The mug, drunk from, on the other three screens (the skill's environment variants: one object, a different joke on
 * every screen, and one that says you are out of ideas). `use mug on jeff` is the right idea with the wrong verb.
 */
const useMugNear = (s: GameState, cmd: { noun2?: string } | undefined, first: string, second: string): string =>
  (cmd?.noun2 && JEFF.includes(cmd.noun2)
    ? 'Right idea, wrong verb. Jeff wants it GIVEN. He has been holding his hands out since spring.'
    : again(s, first, second));
/** The chest, sat on: the rule (`use chest`) and the Mill phrase (`sit on chest`, which the global egg.sit would otherwise take). */
const sitChest = (s: GameState): string => again(s, 'You sit on the chest. The Miller sits on the other end. Neither of you says anything for a scheduled interval.', 'You sit again. The Miller sits again. This is a standup now, and it is the good kind.');
/** The desk, sat at: the rule (`use desk`) and the cottage phrase (`sit at desk`, ahead of egg.sit). */
const sitDesk = (s: GameState): string => again(s, 'You sit at the desk and open the report. Page 12 is still a pie chart with 31 slices. You close the report. Somewhere, a dragon throttles.', "You sit at the desk again. It's where the report happened to you.");

/** The mug, in the Square or the Fields (he stands in both until the mug): Jeff is pacified and leaves the Fields for the well. */
const giveMug = (prefix: string): Rule => ({
  id: prefix === 'village' ? 'village.jeff-mug' : `${prefix}.jeff-mug`,
  when: { verb: 'give', noun: ['mug', 'coffee mug', 'cup'], noun2: JEFF, has: ['mug'] },
  then: {
    // The absurd epilogue (spec1 §5.2, Task F3): the milestone runs one beat too long, out to a whole ruined life.
    text: "Jeff takes the mug. 'World's Okayest Analyst.' He reads it twice. Something in him settles. He will never ask for an Excel export again. Probably. Jeff gets promoted to Senior Finance. He mentors a junior analyst, also named Jeff. He develops a severe DAX problem and blames you for never being there.",
    set: { 'jeff.pacified': true }, remove: ['mug'], outcome: 'success', sfx: 'success',
  },
});

/** Things you can hand Jeff that are not a mug. He reads them; he keeps none of them. */
const jeffGifts = (prefix: string, flags: Cond[] = []): Rule[] => [
  {
    id: `${prefix}.give-note-jeff`,
    when: { verb: 'give', noun: NOTE, noun2: JEFF, has: ['jeff-note'], flags },
    then: { text: (s) => again(s, "He reads it. 'That's mine.' He does not take it back. He does, however, look at you like you touched his refresh.", "'Still mine.' He still doesn't take it."), outcome: 'snark' },
  },
  {
    id: `${prefix}.give-receipt-jeff`,
    when: { verb: 'give', noun: ['receipt', 'cu receipt', 'bill'], noun2: JEFF, has: ['receipt'], flags },
    then: { text: (s) => again(s, "Jeff reads the receipt twice. '400 CU-seconds. For ONE step.' He expenses it on the spot. It is the first number in the realm he has ever trusted.", 'He expenses it again. Finance now owes Finance 800 CU-seconds.'), outcome: 'snark' },
  },
  {
    id: `${prefix}.give-lanyard-jeff`,
    when: { verb: 'give', noun: ['lanyard', 'fabcon lanyard', 'conference lanyard', 'badge'], noun2: JEFF, has: ['lanyard'], flags },
    then: {
      text: (s) => again(s,
        "Jeff puts on the lanyard. 'FabCon,' he says, reverently. 'They had Excel there.' He hands it back, changed.",
        "He puts it on again. 'FabCon,' he says, less reverently. 'There was a queue for the Excel.' He hands it back."),
      outcome: 'snark',
    },
  },
];

/**
 * `ask jeff about <topic>` (Task F4). The derailment first: the report, in the bickering-twins shape, and a second line
 * when you ask it again in a row. Then every other `about`: a topic he knows asked twice in a row gets a second known-topic
 * line instead of the same hint (the deferred minor); everything else is handed to talkTo() exactly as the builtin would
 * (his hint, his brush-off, the flood's "Which Jeff."). A bare `talk to jeff` has no `about`, so it
 * never lands here and B1's escalation runs. The Fields copy is gated on Jeff still being there.
 */
const jeffAsks = (prefix: string, flags: Cond[] = []): Rule[] => [
  {
    id: `${prefix}.jeff-report`,
    when: { verb: 'talk', noun: JEFF, noun2: ['report', 'the report', 'numbers', 'the numbers'], flags },
    then: {
      text: (s) => again(s,
        "'The report,' says Jeff. 'The report says 4.2. I say 4.7. We've agreed to disagree. By which I mean I've disagreed.'",
        "'I've thought about it,' says Jeff. 'It's 4.7. I was right the first time I disagreed.'"),
      outcome: 'success',
    },
  },
  // The self-contradiction shape: he flubs his own name, in cardinality.
  {
    id: `${prefix}.jeff-jeff`,
    when: { verb: 'talk', noun: JEFF, noun2: ['jeff', 'jeff from finance', 'himself', 'yourself', 'you'], flags },
    then: {
      text: (s) => again(s,
        "'Jeff?' says Jeff. 'Jeff from Finance. Or Finance from Jeff. It's a many-to-one and I forget which side I'm on.'",
        "'Still Jeff.' He checks his spreadsheet. Sheet1 agrees."),
      outcome: 'success',
    },
  },
  {
    id: `${prefix}.ask-jeff`,
    when: { verb: 'talk', noun: JEFF, noun2Matches: /./, flags },
    then: {
      text: (s, w, cmd) => {
        const jeff = w.npcs['jeff']!;
        const topic = cmd?.noun2 ?? '';
        if ((s.recent?.n ?? 1) >= 2 && knowsTopic(jeff, topic)) return "'You asked,' says Jeff. 'I answered. It's still Excel. It's Excel all the way down.'";
        return talkTo(s, w, jeff, topic);
      },
      outcome: 'success',
    },
  },
];

/** Where the quest goes after the village, in golden-path order: the Keep (moat), the Monastery behind it (hoodie), the Lake (key). */
const onward = (s: GameState): string =>
  !s.flags['trial.moat'] ? 'Go east through the Fields, then north into the Keep. That is where you learn to smell like a Warehouse.' :
  !s.flags['trial.hoodie'] ? (setting(s, 'xmla') ? 'Go east, then north through the Keep. The monks are behind it, and so is your hoodie.' : xmlaRouteFrom('village.square')) :
  !s.flags['trial.key'] ? 'Go south to the OneLake. The key you need is across the water.' :
  'Go east, then east, then east. The Peaks. The dragon. The rest of your career.';

export const VILLAGE_ROOMS: Record<string, Room> = Object.fromEntries([
  room({
    // My Workspace (spec2 §7): the cottage, under its proper name. The banner prints it uppercased.
    id: COTTAGE, name: 'My Workspace', region: 'village',
    enterQuip: () => 'A cottage. A desk. A report. Home, technically.',
    describe: (s) =>
      "Your cottage. My Workspace, officially. Nobody else can see in. That is the point, and also the problem. One desk, one candle, one report you have been 'about to finish' since spring." +
      (s.flags['taken.mug'] ? ' The desk looks lonely without the mug.' : ' A mug sits on the desk.') +
      ' The door is out, to the east.' +
      // Workspace monitoring (spec2 §3.3): the Eventhouse is only here, and only visible, while the book is on.
      (setting(s, 'monitoring') ? ' A read-only Eventhouse hums in the corner. It is logging this sentence.' : ''),
    exits: { out: 'village.square', e: 'village.square' },
    items: ['report', 'mug', 'bed', 'candle', 'desk', 'window', 'cottage-door', 'jeff-note', 'eventhouse'],
    npcs: [],
    scene: () => 'village.cottage',
    flaskHint: (s) =>
      !s.flags['taken.mug'] ? 'Get the mug. Someone in the square wants it more than you do.' :
      !s.flags['prophecy.read'] ? 'Go out, east, to the square. Read the notice board. It is a prophecy, and also a feature request.' :
      'Go out. The quest is not in this cottage. It never was.',
    // The helper (Task B4): the desk has two things on it, and the one Jeff wants is not the report.
    nudge: {
      plainer: (s) => (!s.flags['taken.mug'] ? "Jeff wants the thing you drink coffee out of. It says Okayest on it. He'd agree." : ''),
    },
    rules: [
      // The voice sweep (Task F4): every gag here has a second line when it is typed again in a row (`again`).
      {
        id: 'cottage.use-mug',
        when: { verb: 'use', noun: ['mug', 'coffee mug', 'cup'], has: ['mug'] },
        then: {
          text: (s) => again(s, `You drink from the mug. It has been empty since the last refresh. You feel ${MALAPROPS.refreshered}. You are not.`, "Still empty. You're drinking a habit now."),
          outcome: 'snark',
        },
      },
      {
        id: 'cottage.open-report',
        when: { verb: 'open', noun: ['report', 'pbix', 'sales report', 'file'] },
        then: { text: (s) => again(s, 'You open the report. 47 pages. 46 of them are a table. Page 12 is a pie chart with 31 slices. You close the report.', 'Done that. Page 12 still has 31 slices.'), outcome: 'success' },
      },
      {
        id: 'cottage.use-report',
        when: { verb: 'use', noun: ['report', 'pbix', 'file'] },
        then: { text: (s) => again(s, 'You click Publish. A dialog asks which workspace. There is only one, and you are standing in it. `publish`, if you must.', 'Same dialog. Same one workspace. Same you in it.'), outcome: 'fail' },
      },
      {
        id: 'cottage.sleep',
        when: { verb: 'use', noun: ['bed', 'cot', 'bunk', 'blanket', 'pillow'] },
        then: { text: (s) => again(s, 'You lie down. Not now. There is a dragon. Also the 2 AM refresh would run across your face.', 'You lie down again. The 2 AM refresh has your face on file now.'), outcome: 'fail' },
      },
      {
        id: 'cottage.candle',
        when: { verb: 'use', noun: ['candle', 'light', 'flame', 'wax'] },
        then: { text: (s) => again(s, 'You hold the candle up. The room gets no bigger. The report gets no shorter.', 'Higher this time. Still one room. Still 47 pages.'), outcome: 'fail' },
      },
      {
        id: 'cottage.desk',
        when: { verb: 'use', noun: ['desk', 'table', 'workbench', 'workstation'] },
        then: { text: sitDesk, outcome: 'fail' },
      },
      {
        id: 'cottage.window',
        when: { verb: 'use', noun: ['window', 'glass', 'shutters'] },
        then: { text: (s) => again(s, 'You open the window. Jeff from Finance, in the square, looks up hopefully. You close the window.', "You open it again. Jeff looks up again. This is a relationship now, and it's bidirectional."), outcome: 'fail' },
      },
      {
        id: 'cottage.open-window',
        when: { verb: 'open', noun: ['window', 'glass', 'shutters'] },
        then: { text: (s) => again(s, 'You open the window. Jeff from Finance, in the square, looks up hopefully. You close the window.', "You open it again. Jeff looks up again. This is a relationship now, and it's bidirectional."), outcome: 'fail' },
      },
      // Right idea, wrong place: Jeff is in the square, and he hears the one word through any wall.
      {
        id: 'cottage.talk-jeff',
        when: { verb: 'talk', noun: JEFF },
        then: { text: (s) => again(s, "Jeff is outside. He hears 'Excel' anyway. He hears it in everything.", "He heard. He's at the window now."), outcome: 'snark' },
      },
      // The one word, in your own workspace: the printouts know it.
      {
        id: 'cottage.say-dax',
        when: { verb: 'say', noun: ['dax', 'daxx'] },
        then: { text: (s) => again(s, "You say 'DAX' to your own workspace. The seventeen printouts under the desk rustle.", 'They rustle again. Same error, all seventeen.'), outcome: 'snark' },
      },
      {
        id: 'cottage.open-door',
        when: { verb: 'open', noun: ['door', 'front door', 'exit door'] },
        then: { text: (s) => again(s, "Yeah, totally! Except it's already open, you moron. Try: out.", "Still open. It's a door, not a dialog."), outcome: 'fail' },
      },
      {
        id: 'cottage.use-note',
        when: { verb: 'use', noun: NOTE, noun2: ['report', 'pbix', 'file', 'desk'], has: ['jeff-note'] },
        then: { text: (s) => again(s, 'You stick DO NOT REFRESH on the report. The report has not refreshed since spring. Jeff, somehow, is already satisfied.', "It's already on there. Jeff nods twice."), outcome: 'snark' },
      },
      // Workspace monitoring (Task F11): the item is only visible while the book is on, so the rule only fires then.
      {
        id: 'cottage.use-eventhouse',
        when: { verb: 'use', noun: ['eventhouse', 'event house', 'kql', 'logs'] },
        then: { text: (s) => again(s, "You query the Eventhouse. It returns every command you've typed, with timestamps. You close it before turn 12.", 'You query it again. The newest row is you, querying it. The row before that is also you.'), outcome: 'snark' },
      },
    ],
  }),
  room({
    id: 'village.square', name: 'Village Square', region: 'village',
    enterQuip: () => 'A square. A well. A man with a spreadsheet. You are going to regret the spreadsheet.',
    describe: (s) =>
      'The Village Square. A well, a notice board, and roads going north to the Mill, east to the Refresh Fields, and south toward the OneLake. The Town Hall is up the steps.' +
      (s.flags['jeff.pacified'] ? ' Jeff from Finance sits by the well, content.' : ' Jeff from Finance is here, holding an empty spreadsheet like a begging bowl.') +
      // The flood (spec2 §3.5): guests in, apps to the whole org, and the whole org is here.
      (isFlood(s) ? ' The entire organization is here. Jeff from Ops. Jeff from HR. A Jeff you do not recognize. They all have a question about the report.' : ''),
    // The Town Hall (spec2 §6) is up the steps: `u` and `in` both climb them; the steps in words are a phrase (world/townhall.ts).
    exits: { n: 'village.mill', e: 'village.fields', s: 'lake.shore', w: 'village.cottage', u: 'village.hall', in: 'village.hall' },
    items: ['board', 'well', 'lanyard', 'jeffs'],
    npcs: ['jeff'],
    scene: (s) => (s.flags['jeff.pacified'] ? 'village.square-calm' : 'village.square'),
    flaskHint: (s) =>
      !s.flags['prophecy.read'] ? 'Read the notice board. Out loud, if it helps. It will not help.' :
      !s.flags['jeff.pacified'] ? (s.inventory.includes('mug')
        ? 'Give the mug to Jeff. Nothing else will make him stop.'
        : 'Go west and get the mug off your desk. Then give it to Jeff. Nothing else will make him stop.') :
      !s.flags['has.credentials'] ? 'Go north to the Mill. Talk to the Miller. He has something a Ferryman will cry about later.' :
      onward(s),
    nudge: {
      plainer: (s) =>
        !s.flags['prophecy.read'] ? "It's a notice board. Notices are for reading. The prophecy is on it, and so is a feature request." :
        !s.flags['jeff.pacified'] ? (s.inventory.includes('mug') ? 'Jeff. Mug. He has wanted it since spring and he is not going to ask nicely, because he cannot.' : "Jeff wants a mug. Yours is on your desk, west, where you left it and every other good idea.") :
        '',
    },
    rules: [
      {
        id: 'village.prophecy',
        when: { verb: 'read', noun: ['board', 'notice', 'notice board', 'sign', 'prophecy', 'noticeboard'] },
        then: {
          // The fourth hand reads the tenant (spec2 §3.3): Copilot on or off, and the publish-to-web printout while that book is on.
          text: (s) =>
            'THE PROPHECY\n\nWhen the Dragon throttles the Refreshes of the night,\nOne shall climb the Peaks and set the Model right.\nBut the Shrine door opens only for the Worthy Three:\nLook like an Engineer. Smell like a Warehouse. Hold the Gateway Key.\n\nBelow it, in different handwriting: "export to excel".\nAnd in a third hand, squeezed in beside "Look like an Engineer": "the monks are behind the Keep".\n\n'
            + `A fourth hand, in marker: "${setting(s, 'copilot') ? 'Copilot is available in this tenant. Ask it about sales at your own risk.' : 'Copilot is not available in this tenant.'}"`
            + (setting(s, 'publishToWeb') ? '\nStapled to the corner, a printout: "The prophecy has been published to web. 4,112 views."' : ''),
          set: { 'prophecy.read': true }, points: 5, sfx: 'success',
        },
      },
      giveMug('village'),
      // The mug, drunk from in front of the man who wants it (the environment variant; the cottage's is the malaprop).
      {
        id: 'square.use-mug',
        when: { verb: 'use', noun: ['mug', 'coffee mug', 'cup'], has: ['mug'] },
        then: {
          text: (s, _w, cmd) => useMugNear(s, cmd, 'You drink from the empty mug. Jeff watches it go up and come down like a refresh bar.', "Again. Jeff watches again. You're out of ideas, and he can tell."),
          outcome: 'snark',
        },
      },
      // The voice sweep (Task F4): Jeff's derailment and his second known-topic line, ahead of the say rules.
      ...jeffAsks('square'),
      {
        id: 'square.say-dax',
        when: { verb: 'say', noun: ['dax', 'daxx'] },
        then: {
          text: (s) => (isFlood(s)
            ? "You say 'DAX' in the square. Every Jeff flinches at once. It sounds like a spreadsheet closing."
            : again(s, `You say 'DAX' in the square. Jeff flinches like a man who has been ${MALAPROPS.daxxed} before.`, `You say it again. Jeff flinches again. ${MALAPROPS.daxxed} twice in one afternoon, once by you.`)),
          outcome: 'snark',
        },
      },
      // The one word. Before the mug he turns; in the flood they all do; with the mug he has chosen.
      {
        id: 'square.say-excel',
        when: { verb: 'say', noun: ['excel', 'export', 'spreadsheet'] },
        then: {
          text: (s) => (isFlood(s) ? 'Every Jeff turns at once. They all have Excel open. It was a mistake.'
            : s.flags['jeff.pacified'] ? "Jeff, content, does not turn. He nods at his mug. He heard the word. He has chosen the mug."
            : "Jeff's head turns like a Card finding a measure. 'Yes?' he says. 'YES?' You have made a mistake."),
          outcome: 'snark',
        },
      },
      {
        id: 'village.jeff-no',
        when: { verb: 'say', noun: ['no', 'no jeff', 'never'], flags: [{ flag: 'jeff.pacified', not: true }] },
        then: { text: (s) => again(s, "'No' is not a file format, Jeff explains.", 'Still not a file format. Jeff checked.'), outcome: 'snark' },
      },
      {
        id: 'village.jeff-yes',
        when: { verb: 'say', noun: ['yes', 'sure', 'ok', 'okay', 'fine'], flags: [{ flag: 'jeff.pacified', not: true }] },
        then: { text: (s) => again(s, 'Jeff lights up. "Great! Just the whole model. In one tab. Thanks!" He does not leave.', '"Great!" he says again. He still does not leave.'), outcome: 'snark' },
      },
      {
        id: 'village.well-ask',
        when: { verb: 'use', noun: ['well', 'q&a well', 'qa well'] },
        then: { text: (s) => again(s, "You ask the well a question. It answers: '$4,213,908.' You did not ask about money.", "You ask again. '$4,213,908.' Same number. It's not a well, it's a measure."), outcome: 'snark' },
      },
      ...jeffGifts('square'),
      {
        id: 'village.well-drink',
        when: { verb: 'drink', noun: ['well', 'water'] },
        then: { text: (s) => again(s, 'You drink from the Q&A Well. You now know the answer to a question nobody asked. It is 42.', "Still 42. You're getting a sweet workout for your Q&A muscles."), outcome: 'snark' },
      },
      {
        id: 'square.talk-well',
        when: { verb: 'talk', noun: ['well', 'q&a well', 'qa well', 'the well'] },
        then: { text: (s) => again(s, "'Hello,' you say. The well answers: 'Hello by Region.' It has one trick.", "It says 'Hello by Region' again. It's very proud of it."), outcome: 'snark' },
      },
      {
        id: 'square.use-board',
        when: { verb: 'use', noun: ['board', 'notice', 'notice board', 'noticeboard'] },
        then: { text: (s) => again(s, 'You pin up OUT OF OFFICE. Jeff reads it and waits for you to get back. You are standing right there.', "Already pinned. Jeff's still waiting."), outcome: 'snark' },
      },
      {
        id: 'square.open-board',
        when: { verb: 'open', noun: ['board', 'notice', 'notice board', 'noticeboard'] },
        then: { text: (s) => again(s, "It's nailed shut. To a well.", 'Still nailed. Still a well.'), outcome: 'fail' },
      },
      {
        id: 'square.open-well',
        when: { verb: 'open', noun: ['well', 'q&a well', 'qa well', 'the well'] },
        then: { text: "It's open. That's the whole well.", outcome: 'fail' },
      },
      // The spreadsheet is in his hands, not on the item list: before the mug it is his; after, it is by the well.
      {
        id: 'square.get-spreadsheet',
        when: { verb: 'get', noun: ['spreadsheet', 'empty spreadsheet', 'begging bowl', 'his spreadsheet', "jeff's spreadsheet"] },
        then: { text: (s) => (s.flags['jeff.pacified'] ? "It's by the well. Leave it. It's finally resting." : "It's Jeff's. He'd rather hold a mug."), outcome: 'fail' },
      },
      {
        id: 'square.look-spreadsheet',
        when: { verb: 'look', noun: ['spreadsheet', 'empty spreadsheet', 'begging bowl', 'excel', 'his spreadsheet', "jeff's spreadsheet"] },
        then: {
          text: (s) => (s.flags['jeff.pacified']
            ? "He set it down by the well. It's empty, and for once, nobody minds."
            : again(s, "It's empty. It has been empty since spring. It has a tab called Sheet1 and a tab called Sheet1 (2).", "Sheet1 (2) is also empty. He's saving room for Sheet1 (3).")),
          outcome: 'success',
        },
      },
      {
        id: 'square.read-spreadsheet',
        when: { verb: 'read', noun: ['spreadsheet', 'empty spreadsheet', 'his spreadsheet', "jeff's spreadsheet"] },
        then: { text: (s) => again(s, 'Blank. Both tabs.', "Still blank. He's very proud of the tabs."), outcome: 'success' },
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
    nudge: {
      plainer: (s) => (s.flags['has.credentials'] ? '' : 'The chest says CREDENTIALS. The Miller says nothing. Neither of them is locked.'),
    },
    rules: [
      // The voice sweep (Task F4): the Miller's derailments go first, so an `about` beats the credentials hand-over
      // (which takes any talk); a bare `talk to miller` has no `about` and still scores.
      {
        id: 'mill.miller-gen2',
        when: { verb: 'talk', noun: MILLER, noun2: ['gen2', 'gen 2', 'dataflow gen2', 'gen1', 'gen 1'] },
        then: {
          text: (s) => again(s,
            "'Gen2? Gen2 is Gen1 with a haircut,' says the Miller. 'No. Wait. It's the other way. Gen1's the one with the haircut.' (You see where this is going.)",
            "'The haircut one,' says the Miller. 'Gen1. No. Look, ONE of them has the haircut.'"),
          outcome: 'success',
        },
      },
      {
        id: 'mill.miller-v3',
        when: { verb: 'talk', noun: MILLER, noun2: ['final_v3', 'final v3', 'v3', 'final 3', 'final_v3 pbix'] },
        then: { text: (s) => again(s, "'FINAL_v3?' The Miller goes quiet. 'We don't say that name in the Mill.'", "'We don't say it TWICE, either.'"), outcome: 'success' },
      },
      // The one word, where they only speak M; and the mug, in front of a man who remembers when it was full.
      {
        id: 'mill.say-dax',
        when: { verb: 'say', noun: ['dax', 'daxx'] },
        then: { text: (s) => again(s, "You say 'DAX' in the Mill. The Miller covers the wheel's ears. 'She only knows M.'", "'M,' says the Miller, firmly. The wheel creaks in agreement."), outcome: 'snark' },
      },
      {
        id: 'mill.use-mug',
        when: { verb: 'use', noun: ['mug', 'coffee mug', 'cup'], has: ['mug'] },
        then: {
          text: (s, _w, cmd) => useMugNear(s, cmd, "You drink from the empty mug. 'Empty since 2019?' asks the Miller. 'Spring.' 'Close.'", "'Still spring?' 'Still spring.' He nods. Q3 is spring somewhere."),
          outcome: 'snark',
        },
      },
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
      // Every other `ask miller about <topic>`, once the creds are yours (before that, any talk is the hand-over above):
      // a known topic asked twice in a row gets a second line; the rest is talkTo(), as the builtin would.
      {
        id: 'mill.ask-miller',
        when: { verb: 'talk', noun: MILLER, noun2Matches: /./ },
        then: {
          text: (s, w, cmd) => {
            const miller = w.npcs['miller']!;
            const topic = cmd?.noun2 ?? '';
            if ((s.recent?.n ?? 1) >= 2 && knowsTopic(miller, topic)) return "'Asked and answered,' says the Miller. 'In Q3. This one.'";
            return talkTo(s, w, miller, topic);
          },
          outcome: 'success',
        },
      },
      // Already in that state: the chest, once it is yours to open (the gate only answers while the creds are in it).
      {
        id: 'mill.open-chest-empty',
        when: { verb: 'open', noun: ['chest', 'credentials chest'], flags: [{ flag: 'has.credentials' }] },
        then: { text: 'Already open. Already empty. Already yours.', outcome: 'fail' },
      },
      // `use chest` / `sit on chest` (the parser reads `sit` as use): the Mill's own line, so the gate leaves `use` to it.
      {
        id: 'mill.sit-chest',
        when: { verb: 'use', noun: ['chest', 'credentials chest'] },
        then: { text: sitChest, outcome: 'fail' },
      },
      {
        id: 'village.mill-usb',
        when: { verb: 'use', noun: USB, noun2: ['wheel', 'mill', 'mill wheel', 'water wheel'], has: ['usb stick'] },
        then: { text: 'You plug FINAL_v2 into the Mill. The Mill accepts it. Nothing changes. It was already running that.', outcome: 'snark' },
      },
      {
        id: 'village.give-usb-miller',
        when: { verb: 'give', noun: USB, noun2: MILLER, has: ['usb stick'] },
        then: { text: (s) => again(s, "The Miller turns FINAL_v2 over in his hands. 'I wrote this,' he says. 'In 2019. There is a FINAL_v3. Nobody has ever found it.' He hands it back.", "He hands it back faster. He's had practice."), outcome: 'snark' },
      },
      {
        id: 'mill.open-usb',
        when: { verb: 'open', noun: USB, has: ['usb stick'] },
        then: { text: (s) => again(s, 'You open FINAL_v2. Inside: a dataflow, and a folder called old. The folder called old is bigger.', 'Still a dataflow. Still mostly old.'), outcome: 'snark' },
      },
      // Right idea, wrong place: the creds are for a man at the dock, not the man who gave them to you.
      {
        id: 'mill.use-creds',
        when: { verb: 'use', noun: ['credentials', 'creds', 'gen1 credentials', 'password', 'parchment'], has: ['credentials'] },
        then: { text: (s) => again(s, 'Good idea. Wrong screen. The man who weeps for these is at the dock, and he has been practicing his face.', 'Still the wrong screen. The dock is south, then south, then east, and it knows you are coming.'), outcome: 'fail' },
      },
      // Object consumed: he will not take the creds back, and he reads your license like a photograph.
      {
        id: 'mill.give-creds-back',
        when: { verb: 'give', noun: ['credentials', 'creds', 'gen1 credentials', 'password', 'parchment'], noun2: MILLER, has: ['credentials'] },
        then: { text: (s) => again(s, "You hand them back. He won't take them. 'They're yours now. That's what decommissioned means.'", "Still won't. 'Decommissioned means decommissioned.'"), outcome: 'fail' },
      },
      {
        id: 'mill.give-license',
        when: { verb: 'give', noun: ['license', 'card', 'license card', 'pro license', 'pro'], noun2: MILLER, has: ['license'] },
        then: { text: (s) => again(s, "'Pro,' the Miller reads. 'We were all Pro once.' He hands it back like a photograph.", "'Still Pro.' He hands it back again, gentler."), outcome: 'fail' },
      },
      {
        id: 'village.mill-use',
        when: { verb: 'use', noun: ['mill', 'wheel', 'banner'] },
        then: { text: (s) => again(s, 'You try to edit the Mill. A dialog appears: "Dataflow Gen1 is in maintenance mode. Consider upgrading." You consider it.', 'Same dialog. It has considered you back.'), outcome: 'fail' },
      },
    ],
  }),
  room({
    id: 'village.fields', name: 'Refresh Fields', region: 'village',
    enterQuip: () => 'Rows of refreshes. Most of them failed overnight. So did you, once.',
    // The tell for death.monday (fix round 1): the clock and the day are in the room, and `look at sundial` / `look at manual` warn.
    describe: () =>
      'The Refresh Fields. Rows of refreshes sway in the wind, most of them failed. A scarecrow named Manual keeps the birds off. The sundial says 9:02. The scarecrow says Monday. East, the land rises toward the Capacity Peaks; the square is west.',
    exits: { w: 'village.square', e: 'peaks.foothills' },
    items: ['crops', 'seed', 'sundial'],
    npcs: ['scarecrow', 'jeff'],
    scene: () => 'village.fields',
    flaskHint: (s) => (!s.flags['trial.moat'] || !s.flags['trial.hoodie']
      ? (!s.flags['trial.moat'] || setting(s, 'xmla') ? 'Go east to the Foothills, then north into the Keep. The Monastery is behind it.' : xmlaRouteFrom('village.fields'))
      : !s.flags['trial.key'] ? 'Go west to the square, then south to the OneLake. The key is across the water.' : 'Go east. Then keep going east. The Peaks do not climb themselves.'),
    // No nudge (Task B4): nothing here is the quest, so the helper is the flask hint from 4.
    rules: [
      giveMug('fields'),
      // The voice sweep (Task F4): Manual's derailments (the refresh, the sign), then Jeff's, while he is still here.
      {
        id: 'fields.manual-refresh',
        when: { verb: 'talk', noun: MANUAL, noun2: ['refresh', 'refreshes', 'the refresh', 'crops'] },
        then: { text: (s) => again(s, 'Manual does not answer. A crow lands on him, refreshes, and fails. He is very proud of the crow.', 'You ask again. The crow refreshes again. Fails again. Manual is prouder.'), outcome: 'success' },
      },
      {
        id: 'fields.manual-monday',
        when: { verb: 'talk', noun: MANUAL, noun2: ['monday', 'the sign', 'sign', 'his sign', 'full refresh', 'the full refresh'] },
        then: { text: (s) => again(s, 'Manual says nothing about Monday. The sign says it for him. It has said it every day since, which is the trouble with signs.', "He still won't say it. The sign still will."), outcome: 'success' },
      },
      ...jeffAsks('fields', [{ flag: 'jeff.pacified', not: true }]),
      // The one word, out here: Jeff turns, and so does something that was not built to. Once he has the mug, nothing does.
      {
        id: 'fields.say-excel',
        when: { verb: 'say', noun: ['excel', 'export', 'spreadsheet'] },
        then: {
          text: (s) => (s.flags['jeff.pacified'] ? "Nobody turns. The crows don't do Excel." : 'Jeff turns. So does Manual, who was not built to turn.'),
          outcome: 'snark',
        },
      },
      {
        id: 'fields.say-dax',
        when: { verb: 'say', noun: ['dax', 'daxx'] },
        then: { text: (s) => again(s, `You say 'DAX' in the fields. Manual does not flinch. Straw cannot be ${MALAPROPS.daxxed}.`, 'Still no flinch. Still straw.'), outcome: 'snark' },
      },
      {
        id: 'fields.use-mug',
        when: { verb: 'use', noun: ['mug', 'coffee mug', 'cup'], has: ['mug'] },
        then: {
          text: (s, _w, cmd) => useMugNear(s, cmd, 'You drink from the empty mug. A crow lands on the rim, checks it, and fails.', 'The crow checks again. Same result. It logs it.'),
          outcome: 'snark',
        },
      },
      // His spreadsheet came out here with him (the Square's has the tabs; this one has the weather).
      {
        id: 'fields.look-spreadsheet',
        when: { verb: 'look', noun: ['spreadsheet', 'empty spreadsheet', 'begging bowl', 'his spreadsheet', "jeff's spreadsheet"], flags: [{ flag: 'jeff.pacified', not: true }] },
        then: { text: (s) => again(s, "He brought it to the fields. It's empty out here too.", "Still empty. Now with a crow's footprint in B2."), outcome: 'success' },
      },
      {
        id: 'fields.trigger',
        when: { verb: 'use', noun: MANUAL },
        then: { text: triggerManual, outcome: 'success' },
      },
      {
        id: 'fields.get-refresh',
        when: { verb: 'get', noun: ['refresh', 'refreshes', 'crops'] },
        then: { text: getRefresh, outcome: 'snark' },
      },
      // The sign around his neck is not on the item list; `look` and `read` answer it here.
      {
        id: 'fields.look-sign',
        when: { verb: 'look', noun: ['sign', 'monday', 'monday sign', 'his sign', 'the sign'] },
        then: { text: (s) => again(s, 'MONDAY, in red. The red came off a status bar, after a full refresh at 9:02, and it has not dried.', "Still MONDAY. It's a warning, not a calendar."), outcome: 'success' },
      },
      {
        id: 'fields.read-sign',
        when: { verb: 'read', noun: ['sign', 'monday', 'monday sign', 'his sign', 'the sign'] },
        then: { text: 'MONDAY. It reads the same every day. That is the warning.', outcome: 'success' },
      },
      // Not while the Shortcut is in your pocket: it answers to `sign` too, and `use sign` is its teleport (globals.ts).
      {
        id: 'fields.get-sign',
        when: { verb: 'get', noun: ['sign', 'monday', 'monday sign', 'his sign', 'the sign'], notHas: ['shortcut'] },
        then: { text: "It's his. He's wearing it.", outcome: 'fail' },
      },
      {
        id: 'fields.use-sign',
        when: { verb: 'use', noun: ['sign', 'monday', 'monday sign', 'his sign', 'the sign'], notHas: ['shortcut'] },
        then: { text: "You can't use MONDAY. It uses you.", outcome: 'fail' },
      },
      {
        id: 'fields.look-crows',
        when: { verb: 'look', noun: ['crows', 'crow', 'birds', 'bird'] },
        then: { text: (s) => again(s, "The crows sit on the failed rows. They're not eating. They're waiting for Monday, like everyone.", 'Still waiting. Crows are patient. Mondays are inevitable.'), outcome: 'success' },
      },
      {
        id: 'fields.get-crow',
        when: { verb: 'get', noun: ['crows', 'crow', 'birds', 'bird'] },
        then: { text: (s) => again(s, 'The crow declines. It has seen what you do with refreshes.', 'Nope. The crow has a schedule.'), outcome: 'fail' },
      },
      {
        id: 'fields.use-sundial',
        when: { verb: 'use', noun: ['sundial', 'clock', 'dial', 'sun dial', 'time'] },
        then: { text: (s) => again(s, 'You turn the sundial to 2 AM. The sun checks its refresh schedule and declines.', "The sun still says no. It's in a meeting until 9:02."), outcome: 'fail' },
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

/**
 * The Publish dialog (spec2 §7). Only from My Workspace: anywhere else, `publish` gets the global egg's "Publish from
 * where? You are not in Desktop." (the Keep keeps its own line). The menu lists this workspace, and, while the tenant's
 * Publish to web is on (default until the Abbot's errand), the entire internet. Publishing to yourself is the joke;
 * publishing to the internet is the death.
 */
const MENU = /^(publish|deploy|ship)( (the |my |this )?(report|pbix|file|it|sales report))?$/;
/** An optional "say" or "publish [the report] to" in front of the answer. */
const ANSWER = '(say |publish( (the |my |this )?(report|pbix|file|it))? to )?';
const MINE = new RegExp(`^${ANSWER}my workspace$`);
const WEB = new RegExp(`^${ANSWER}(the )?(entire internet|internet|web)$`);
// The kill, the card line, then the blame (spec1 §5.4); the engine appends the sign-off.
const WEB_DEATH = 'You publish to web. The embed code is beautiful. The dragon has your report. So does everyone.\nYou published to web. The prophecy said nothing about this, because the prophecy is also on the web now. The dialog listed two options and you picked the one with the word ENTIRE in it.';

/** Cottage-scoped (and one Fields line); registered right after TOWNHALL_PHRASES (world/index.ts), ahead of the global egg.publish. */
export const WORKSPACE_PHRASES: PhraseRule[] = [
  // The Fields (fix round 1): a scheduled refresh is the safe one, and `refresh manual` is the scarecrow; a full refresh at
  // 9:02 on a Monday is death.monday (deaths.ts). Both are room-scoped so they beat the global egg.refresh.
  { id: 'fields.schedule', room: 'village.fields', test: /^schedule (a |the )?refresh\b|^refresh (on a )?schedule$/, text: 'You schedule the refresh for 2 AM. It will fail at 2 AM, quietly, with nobody standing in it. That is what schedules are for.' },
  { id: 'fields.refresh-manual', room: 'village.fields', test: /^(refresh|trigger|click|run) (the )?(manual|scarecrow|scarecrow named manual)$/, text: triggerManual },
  // Asked again in a row (Task F11), the same menu and a note that it has not grown.
  { id: 'workspace.publish', room: COTTAGE, test: MENU, text: (s) => `Publish to which workspace? · My Workspace${setting(s, 'publishToWeb') ? ' · The entire internet' : ''}${(s.recent?.n ?? 1) >= 2 ? '\nThe list has not grown while you were thinking. It never does.' : ''}` },
  { id: 'workspace.publish-mine', room: COTTAGE, test: MINE, text: '', then: { text: 'Published. To yourself. Your report is now available to you, in the workspace you were already in. Success.', outcome: 'snark' } },
  {
    id: 'workspace.publish-web', room: COTTAGE, test: WEB, text: '',
    then: (s) => (setting(s, 'publishToWeb')
      ? { id: 'death.publish-web', then: { text: WEB_DEATH, death: 'death.publish-web' } }
      : { id: 'workspace.publish-web-off', then: { text: 'Publish to web is disabled by your administrator. For once, thank them.', outcome: 'fail' } }),
  },
  // The voice sweep (Task F11): the two other things a workspace menu offers.
  { id: 'workspace.rename', room: COTTAGE, test: /^rename( the| my)? workspace( to .+)?$/, text: 'You rename My Workspace to My Workspace (2). It was always going to be that.' },
  { id: 'workspace.share', room: COTTAGE, test: /^share( the| my)? (workspace|report|it)( with .+)?$/, text: "You share My Workspace. There's nobody to share it with. The dialog suggests Jeff." },
];

/**
 * The village's gag phrases (Task F4): raw-line rules for the verbs the parser has no word for (jump, wish, light,
 * wash, turn, upgrade, scare, water, pick). Room-scoped, so each beats the global egg it would otherwise fall to
 * (egg.jump, egg.climb, egg.swim, egg.boo, egg.push); registered right after WORKSPACE_PHRASES (world/index.ts), ahead
 * of APPLIED_STEP_PHRASES. Only the mug's carries `then` (it declines without the mug). Every one has a second line for
 * the same command typed again (`again`).
 */
export const VILLAGE_PHRASES: PhraseRule[] = [
  { id: 'village.well-jump', room: 'village.square', test: /^(jump|climb|dive|leap) (in|into|down)( the)? well$/, text: (s) => again(s, "You lean over the Q&A Well. It asks you a question first: 'Did you mean: Sales by Region?' You did not. You back away.", "You lean over again. 'Did you mean: the same thing?' You did.") },
  { id: 'village.well-wish', room: 'village.square', test: /^(make a wish|wish)( (at|in|on|into|down)( the)? well)?$/, text: (s) => again(s, `You wish for more ${MALAPROPS.capacitude}. The well answers: 'Did you mean: Pro?' You always mean Pro.`, "Again? 'Did you mean: Pro?' It did.") },
  { id: 'cottage.light-candle', room: COTTAGE, test: /^(light|relight|ignite)( the)? candle$/, text: (s) => again(s, 'Already lit. Both ends. You want a THIRD?', "Still two ends. Wax doesn't scale.") },
  { id: 'cottage.blow-candle', room: COTTAGE, test: /^(blow out|blow on|blow|extinguish|snuff|snuff out|put out)( the)? candle$/, text: (s) => again(s, "You blow. It relights. It's on a trial; trials don't end when you want them to.", "You blow again. The trial's still got 58 days.") },
  // `sit at desk` / `sit on chest`: the room's own line (the global egg.sit would take the raw line before the parser read `sit` as use).
  { id: 'cottage.sit-desk', room: COTTAGE, test: /^sit( down)?( at| on| by)?( the| my)? (desk|table|workstation)$/, text: sitDesk },
  { id: 'mill.sit-chest-words', room: 'village.mill', test: /^sit( down)?( on| at| upon)?( the)? (chest|credentials chest)$/, text: sitChest },
  {
    // In your pocket, the hygiene line; still on the desk, the reach; anywhere else in the village without it, nothing (the snark answers).
    id: 'village.wash-mug', region: 'village', test: /^(wash|clean|rinse|scrub)( the| my)? (mug|cup|coffee mug)$/, text: '',
    then: (s) => (s.inventory.includes('mug')
      ? { then: { text: again(s, "You consider washing it. You've considered it since 2019. Jeff wants it as is.", "Still considering. It's a heritage stain now."), outcome: 'snark' } }
      : s.room === COTTAGE && !s.flags['taken.mug'] ? { then: { text: "It's on the desk, where it has been fermenting since spring. You'd have to touch it.", outcome: 'snark' } }
      : null),
  },
  { id: 'mill.turn-wheel', room: 'village.mill', test: /^(turn|spin|crank|rotate)( the)?( mill| water)? wheel$/, text: (s) => again(s, 'You turn the wheel by hand. One refresh. It succeeds, which nobody has seen since 2019, and nobody saw now.', "You turn it again. The Miller looks up. 'That's a schedule now.'") },
  { id: 'mill.stop-wheel', room: 'village.mill', test: /^(stop|halt|block|hold)( the)?( mill| water)? wheel$/, text: (s) => again(s, 'You lean on the wheel. It stops. Then it starts again; the schedule is stronger than you.', 'It stops. It starts. You are not on the schedule.') },
  { id: 'mill.upgrade', room: 'village.mill', test: /^(upgrade|migrate|convert|modernize|modernise)( (the |this )?(mill|dataflow|it|gen ?1|wheel))?( to gen ?2)?$/, text: (s) => again(s, "You click Upgrade. A dialog: 'This will create a Gen2 copy. The Gen1 will remain.' Everything in this realm remains.", 'You upgraded already. There are two mills now. Nobody has told the Miller.') },
  { id: 'fields.scare-crows', room: 'village.fields', test: /^(scare|shoo|chase)( the| away the)? (crows|birds|crow)( away)?$/, text: (s) => again(s, 'You flap your arms at the crows. They were not here for the refreshes. They were here for you. They leave, disappointed.', 'You flap again. Nothing leaves. The crows are gone and the refreshes were never scared of you.') },
  { id: 'fields.water-crops', room: 'village.fields', test: /^(water|tend|weed|feed)( the)? (crops|refreshes|refresh|rows|fields?)$/, text: (s) => again(s, 'You water the refreshes. They fail, but wetter.', 'Wetter still. Same fail.') },
  { id: 'fields.pick-refresh', room: 'village.fields', test: /^(pick|harvest|pluck|gather)( a| the| some)? (refresh|refreshes|crops|rows)$/, text: getRefresh },
];
