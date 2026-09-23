import type { Item } from './types';
import type { GameState } from '../engine/types';
import { isFlood, setting } from '../engine/governance';
import { REPORT_MONITOR_TEXT, fieldListText, total as pivotTotal } from './excel';
import { PROMPT_SPARE, lastAnswer, modelsText } from './copilot';
import { KEEP_ITEMS } from './keep-items';
import { BOOK_ITEMS, BRICKS_NOUNS, BRICKS_TEXT, JEFFS_TEXT, shelfListing } from './sacristy';
import { MALAPROPS, nick } from './voice';

const item = (i: Item): [string, Item] => [i.id, i];

/**
 * A second look in a row (the voice sweeps, Task F4 on): the same `look` typed again gets its own line, read off
 * `recent` (set by the engine before the builtin runs), so no flag moves. The second line IS the repeat joke; a third
 * look gets a third line where one is given (the board), else the second again.
 */
const secondLook = (s: GameState, first: string, second: string, third?: string): string => {
  const n = s.recent?.n ?? 1;
  return n >= 3 && third ? third : n >= 2 ? second : first;
};

export const ITEMS: Record<string, Item> = Object.fromEntries([
  item({
    id: 'license', name: 'Pro License Card', aliases: ['license', 'card', 'license card', 'pro license', 'pro'],
    takeable: true,
    blurb: `A Pro license. Gets you in the building and absolutely no ${MALAPROPS.capacitude}. Framed next to a participation ribbon.`,
    again: 'You already have the license. It came with the character. It is the only thing that did.',
    describe: 'A Power BI Pro license. The only license you have. Also, it turns out, the only one the Library accepts.',
  }),
  item({
    id: 'mug', name: 'mug', aliases: ['coffee mug', 'cup', 'okayest mug'],
    takeable: true,
    blurb: "'World's Okayest Analyst.' Never washed. You've stopped noticing, which is the problem.",
    again: "We've been through this. You took it off the desk, next to the seventeen printouts. There's a ring. We all saw.",
    describe: "'World's Okayest Analyst.' It has never been washed.",
  }),
  item({
    id: 'report', name: 'report', aliases: ['pbix', 'sales report', 'sales_v3_final_final2.pbix', 'file', 'sales'],
    takeable: false,
    blurb: 'Sales_v3_FINAL_final2.pbix, 2.3 GB, somehow on your person. We both know about final3.',
    untakeableText: "It's 2.3 GB. You'd need a Premium license to lift it.",
    describe: (s) => secondLook(s, "Sales_v3_FINAL_final2.pbix. There is also a Sales_v3_FINAL_final3.pbix, but you don't talk about that one. Built with Dataflows Gen1 Classic.", 'Still 2.3 GB. Still FINAL. Still final2.'),
  }),
  item({
    id: 'bed', name: 'bed', aliases: ['cot', 'bunk', 'blanket', 'pillow'],
    takeable: false,
    blurb: 'A narrow bed with a decommissioned Report Server banner for a blanket. Nobody has slept in it since the refresh schedule moved to 2 AM.',
    untakeableText: 'It is bolted to the workspace. Everything here is.',
    // The second look is backstory ammo (Task F4): small, sad, specific.
    describe: (s) => secondLook(s, 'A narrow bed. The blanket is a decommissioned Report Server banner. You have not slept in it since the refresh schedule moved to 2 AM.', 'Still a bed. You had a bunk until 26.'),
  }),
  item({
    id: 'candle', name: 'candle', aliases: ['light', 'flame', 'wax'],
    takeable: false,
    blurb: 'A candle burning at both ends, on its third Fabric trial. It was the only light in the workspace, and the workspace is dark now.',
    untakeableText: 'It is the only light source in the workspace. Leave it.',
    describe: (s) => secondLook(s, 'A candle burning at both ends. It is on its third Fabric trial.', 'Still burning. When the wax goes, it starts a fourth trial.'),
  }),
  item({
    id: 'desk', name: 'desk', aliases: ['table', 'workbench', 'workstation'],
    takeable: false,
    blurb: 'A desk, seventeen printouts of the same DAX error still taped under it. You are carrying furniture, which is not a strategy.',
    untakeableText: 'It has a 2.3 GB report on it. You are not lifting that.',
    // The backstory beat (Task F4): small, sad, specific, and still on the intranet.
    describe: (s) => `A desk. On it: the report${s.flags['taken.mug'] ? ', and a ring where a mug used to be' : ', and a mug'}. Under it: seventeen printouts of the same DAX error. Next to those, the pie chart you made in 2014. It is still on the intranet.`,
  }),
  item({
    id: 'window', name: 'window', aliases: ['glass', 'shutters', 'outside', 'view'],
    takeable: false,
    blurb: 'A window, out of its wall. It still shows the Village Square from every room, which is not how windows work.',
    untakeableText: 'The window stays. The draft is load-bearing.',
    // After the mug (Task F4): the view changes with the man in it.
    describe: (s) => (s.flags['jeff.pacified']
      ? 'Through the window: the Village Square, a well, and Jeff, content, holding a mug at nothing. It is unsettling from any angle.'
      : 'Through the window: the Village Square, a well, and a man holding an empty spreadsheet toward the sky as if it might fill on its own.')
      // The allusion layer (Task F11): the Windows XP hill, out past the square.
      + ' Through the window, past the square, a hill. Green. Rolling. Somebody set it as a wallpaper once.',
  }),
  item({
    id: 'cottage-door', name: 'door', aliases: ['front door', 'exit door'],
    takeable: false,
    blurb: 'The cottage door. It was never locked, because nobody in the realm wanted what was in there, and that includes the door.',
    untakeableText: 'The door is a shared dataset. It stays where it is.',
    describe: (s) => secondLook(s, 'The door. It is out, to the east. It has never been locked; nobody in the realm wants what is in here.', 'Still out. Still east. Still open.'),
  }),
  item({
    // Workspace monitoring (spec2 §3.3): in the cottage only while the book is on. The game really does log every command.
    id: 'eventhouse', name: 'Eventhouse', aliases: ['eventhouse', 'event house', 'kql', 'logs', 'monitoring'],
    takeable: false,
    blurb: 'A read-only Eventhouse. It logged you picking it up, and it has already logged you reading this.',
    visibleWhen: (s) => setting(s, 'monitoring'),
    untakeableText: 'It is read-only. So, apparently, are you.',
    describe: (s) => secondLook(s, 'It has already logged that you looked.', "Logged again. It's building a table about you.", 'Third row. You are now its most engaged user, and it has told Finance.'),
  }),
  item({
    id: 'wheel', name: 'mill wheel', aliases: ['wheel', 'mill', 'water wheel', 'the wheel'],
    takeable: false,
    blurb: 'The mill wheel. It still creaks once per scheduled refresh, in Power Query M, and now the creaking follows you.',
    untakeableText: 'It is part of the Mill. The Mill is part of the deprecation plan.',
    // The fake brand (Task F4, voice.ts BRANDS) on a plaque; the second look is the allusion layer's screensaver.
    describe: (s) => secondLook(s,
      'The wheel turns once every scheduled refresh. It creaks in Power Query M. Nobody has clicked \'Edit\' on it since 2019. A plaque reads: Dataflows Gen1 Classic — the taste you remember.',
      'Still turning. Like a screensaver of pipes, and about as load-bearing.'),
  }),
  item({
    id: 'banner', name: 'banner', aliases: ['sign', 'decommission banner', 'decommission'],
    takeable: false,
    blurb: 'DECOMMISSION: Q3, the year painted over four times. The roadmap is exactly as heavy off the beam as it was on it.',
    untakeableText: 'It is stapled to the beam. Also to the roadmap.',
    describe: (s) => secondLook(s, 'DECOMMISSION: Q3. The year has been painted over four times.', 'Still Q3. The paint on the year is wet.'),
  }),
  item({
    id: 'chest', name: 'credentials chest', aliases: ['chest', 'credentials chest', 'box', 'strongbox'],
    takeable: false,
    blurb: "A chest marked CREDENTIALS. The Miller's hand is still on it, and so, somewhere behind you, is the Miller.",
    untakeableText: 'The Miller\'s hand is on it. Talk to him.',
    // Emptied (Task F4): the room text already says so; now the chest does too, and mourns.
    describe: (s) => (s.flags['has.credentials']
      ? 'A chest marked CREDENTIALS. Empty now. It held one scrap of parchment for six years and it misses the weight.'
      : 'A chest marked CREDENTIALS. Inside, presumably, the Gen1 credentials. The Miller is the lock.'),
  }),
  item({
    id: 'crops', name: 'refreshes', aliases: ['crops', 'refresh', 'refreshes', 'rows', 'field', 'fields'],
    takeable: false,
    blurb: "Rows of scheduled refreshes, uprooted. A third of them are green, and those are the ones you'll be blamed for.",
    untakeableText: 'You pull one up. It fails. You put it back.',
    describe: (s) => secondLook(s, 'Rows of scheduled refreshes, swaying. About a third are green. The rest are the colour of a 2 AM email.', 'Still a third green. You counted.'),
  }),
  // The clock behind death.monday (deaths.ts, fix round 1): it warns, in so many words.
  item({
    id: 'sundial', name: 'sundial', aliases: ['clock', 'dial', 'sun dial', 'time'],
    takeable: false,
    blurb: 'A sundial, in your pocket. It reads 9:02 in there too, because the migration was on a Monday.',
    untakeableText: 'The sundial is set in the ground and the time is set in stone. Both are 9:02.',
    describe: (s) => secondLook(s,
      'A sundial. It reads 9:02. It has read 9:02 since the migration, which was also on a Monday. Every report in the village opens at nine, and a full refresh at 9:02 would find all of them at once.',
      'Still 9:02. Not a clock. A grudge.'),
  }),
  item({
    id: 'plinth', name: 'plinth', aliases: ['plinth', 'stone plinth', 'stand'],
    takeable: false,
    blurb: 'A stone plinth with two hollows shaped like keys. You chose, then you took the thing you chose from, and the Council did not plan for that.',
    untakeableText: 'It\'s a plinth. It is the island.',
    // The voice sweep (Task F5): the hollows know which key went, and a second look in a row says what that means.
    describe: (s) => {
      const std = !!s.flags['taken.standard key'], per = !!s.flags['taken.personal key'];
      return secondLook(s,
        'A stone plinth with two hollows shaped like keys. One says PERSONAL. One says STANDARD. Only one hollow has ever been used.'
        + (std ? ' The STANDARD hollow is empty, and worn smooth.' : '') + (per ? ' The PERSONAL hollow is empty, and never worn.' : ''),
        std && per ? 'Both hollows empty. You took both, which was the third option, and nobody carved a line for it.'
          : `Two hollows. The STANDARD one is worn smooth. The PERSONAL one has ${per ? 'met exactly one hand, and it was yours' : 'never met a hand, and it shows'}.`);
    },
  }),
  item({
    id: 'plaque', name: 'plaque', aliases: ['plaque', 'inscription', 'sign'],
    takeable: false,
    blurb: 'CHOOSE. THEN LIVE WITH IT. You took the plaque, which was the third option, and nobody on the Gateway Council has a line for it.',
    untakeableText: 'It is bolted to the plinth.',
    describe: (s) => secondLook(s,
      'CHOOSE. THEN LIVE WITH IT. — the Gateway Council. Below, smaller: \'Personal mode cannot be shared. Standard mode cannot be unshared.\'',
      "CHOOSE. THEN LIVE WITH IT. You've read it twice. That's the living-with-it part."),
  }),
  item({
    id: 'csv', name: 'CSV', aliases: ['csv', 'column1', 'column2', 'column3', 'file', 'the csv'],
    takeable: false,
    blurb: 'A CSV: Column1, Column2, Column3. It is still delimited, and it is still leaking through the lining.',
    untakeableText: 'It slips through your fingers, delimited.',
    describe: (s) => secondLook(s,
      'A CSV drifting face-up. Column1, Column2, Column3. Somewhere, someone is about to name them all in Power Query, by hand, for the fourth time.',
      "Column1, Column2, Column3. It's waiting for a fourth person to name them by hand."),
  }),
  item({
    id: 'floor', name: 'cloister floor', aliases: ['floor', 'flagstones', 'stones', 'circle'],
    takeable: false,
    blurb: "The cloister floor, worn in a circle by monks pacing 'spark dot read'. The monks are pacing on nothing now, and they have not noticed.",
    untakeableText: 'It\'s a floor.',
    describe: (s) => secondLook(s,
      `Worn in a perfect circle by monks pacing 'spark dot read'. The centre stone has a burn mark shaped like a cluster starting. The monks have ${MALAPROPS.refreshered} themselves into a circle.`,
      'Same circle. The monks have lapped it twice while you stared, which is two more laps than you have done all quest.'),
  }),
  item({
    id: 'shelves', name: 'shelves', aliases: ['shelf', 'shelves', 'books', 'notebooks', 'runtime', 'synapse', 'wing'],
    takeable: false,
    blurb: "The Library shelves: Runtime 1.1, Runtime 1.2, the whole Synapse wing. The sign said 'please don't,' and you did.",
    untakeableText: 'The Librarian clears her throat. Loudly.',
    describe: (s) => secondLook(s,
      'Runtime 1.1. Runtime 1.2. A whole wing labelled SYNAPSE, roped off, with a sign: \'Still supported. Please don\'t.\'',
      'The same shelves, slightly more deprecated than a minute ago. That is how shelves work in here.',
      'A third look. The Librarian is about to charge you a late fee on browsing.'),
  }),
  item({
    id: 'case', name: 'locked case', aliases: ['case', 'glass case', 'locked case', 'display case'],
    takeable: false,
    blurb: "A glass case from the Library, lock and all. You are carrying the Librarian's policy, in glass, and she is looking at you.",
    untakeableText: 'Locked. The Librarian has the key and a policy.',
    describe: (s) => secondLook(s,
      'A glass case. Inside: the Spark Scroll. The lock takes a library card — any Pro license will do, she says, looking at yours.',
      s.flags['scroll.lent']
        ? "Open and empty. You're staring at where the scroll was, like it owes you money."
        : 'The Spark Scroll, behind glass. Looking is free. It is the only free thing in the Library.'),
  }),
  item({
    id: 'rocks', name: 'rocks', aliases: ['rock', 'rocks', 'stone', 'stones', 'air', 'scree'],
    takeable: false,
    blurb: 'Rocks from the Foothills, metered. Each one costs more to hold than the last, and you are holding all of them.',
    untakeableText: 'You lift a rock. It is billed per second. You put it down.',
    describe: (s) => secondLook(s, 'Rocks. Each one takes a little longer to look at than the last. The air is thin and metered.',
      'Same rocks. The second look took longer than the first. That is the whole Pass, in rocks.'),
  }),
  item({
    id: 'credentials', name: 'credentials', aliases: ['creds', 'gen1 credentials', 'password', 'parchment'],
    takeable: true,
    blurb: 'Gen1 credentials on parchment. Stored in a chest since 2019. Still valid, which is somehow worse.',
    again: 'You have the creds. The Miller handed them over like a man handing over a grandchild. Do not make him do it twice.',
    describe: 'Gen1 credentials on a scrap of parchment. Stored at the Mill since 2019. Somehow still valid.',
  }),
  item({
    id: 'scroll', name: 'scroll', aliases: ['spark scroll', 'pyspark scroll'],
    takeable: true,
    blurb: 'The Spark Scroll. Due back by the end of the Spark session. Which is never.',
    again: 'The scroll is in your pocket, on loan, against your license. The Librarian is counting.',
    describe: 'A scroll of PySpark. The first line reads: df = spark.read.format("delta"). The rest is comments.',
  }),
  item({
    id: 'hoodie', name: 'hoodie', aliases: ['hoodie of spark', 'spark hoodie', 'black hoodie'],
    takeable: true, wearable: true,
    blurb: "The Hoodie of Spark. Smells like a session that finally started. You look like an Engineer's roommate.",
    again: 'You have the hoodie. The Abbot draped it on you personally, and he does not do encores.',
    describe: "A black hoodie with a small orange flame on the chest. Wearing it makes you 40% more likely to say 'just write a notebook.'",
  }),
  item({
    id: 'shortcut', name: 'shortcut', aliases: ['signpost', 'sign', 'onelake shortcut', 'pointer'],
    takeable: true,
    blurb: "A OneLake Shortcut. Points at data you don't own and never will. The closest thing you have to a savings account.",
    again: 'You picked up the Shortcut already. It weighed nothing then and it weighs nothing now. That is its whole deal.',
    describe: (s) => secondLook(s, "A OneLake Shortcut. It weighs nothing. It's just a pointer.", "It weighs nothing. It's the only thing in the realm with a healthy relationship to data."),
  }),
  item({
    id: 'personal key', name: 'personal key', aliases: ['personal mode key', 'personal', 'personal gateway key'],
    takeable: true,
    blurb: 'A Personal Mode key. Works for you, alone, while your laptop is open. Your laptop is never open.',
    again: 'You already took the personal key. It was a mistake then. It is a mistake you are now holding.',
    describe: (s) => secondLook(s, 'A Personal Mode gateway key. It only works for you, and only while your laptop is open.', "Works while a laptop's open. Somewhere, a laptop is closing."),
  }),
  item({
    id: 'standard key', name: 'standard key', aliases: ['gateway key', 'standard mode key', 'key', 'standard', 'standard gateway key'],
    takeable: true,
    blurb: "The Gateway Key, Standard Mode. Doesn't open the gateway to your manager's calendar, which you'd trade it for.",
    again: 'We did the island already. You lifted the STANDARD key off the plinth while the Ferryman hummed, and you have been patting your pocket ever since.',
    describe: (s) => secondLook(s, 'A Standard Mode gateway key. Heavy, cold, enterprise-grade.', 'Heavy. Enterprise-grade means someone else is paying.'),
  }),
  item({
    id: 'boots', name: 'boots', aliases: ['bursting boots', 'pair of boots', 'boot'],
    takeable: true, wearable: true,
    blurb: 'Bursting Boots. No more interactive delay. You still walk like a man who formatted the group project in high school.',
    again: 'The boots fell out of a progress bar into your hands. That is not a thing that happens twice.',
    describe: 'Bursting Boots. Provenance unknown. They smell faintly of Gold.',
  }),
  item({
    id: 'model', name: 'golden semantic model', aliases: ['model', 'semantic model', 'golden model', 'the model'],
    takeable: true,
    blurb: 'The Golden Semantic Model. One table, 412 columns, and a note in row 8,041 that says "ask Jeff." You carried it anyway.',
    again: 'You are holding the Model. You have been holding it since the mountain. Put it down and the village refreshes stop.',
    visibleWhen: (s) => !!s.flags['dragon.gone'],
    describe: "The Golden Semantic Model. It glows. Somehow it also has a 'Column1'.",
  }),
  item({
    id: 'pedestal', name: 'pedestal', aliases: ['plinth', 'stand', 'altar'],
    takeable: false,
    blurb: "The Shrine's pedestal, plinth-grade. You carried off the furniture and left the Model, which is very on brand.",
    untakeableText: 'The pedestal holds the Model. Take the Model; leave the furniture.',
    describe: (s) => secondLook(s, 'A pedestal, plinth-grade. It has held the Model since the last capacity outage; before that, it held a different Model, also golden, also one table.',
      'The pedestal again. It has outlasted two Models, and it will outlast your interest.'),
  }),
  item({
    id: 'notebook', name: 'notebook', aliases: ['brother pandas notebook', 'cell', "pandas' notebook", 'pandas notebook'],
    takeable: false,
    blurb: "Brother Pandas' notebook. It is a shared notebook, so his session is wherever you are now, which is not his laptop.",
    untakeableText: "It's a shared notebook. Take it and Brother Pandas loses his session.",
    describe: (s) => s.flags['notebook.fixed']
      ? secondLook(s, 'Cell 1: df = spark.read.format("delta").load(path)   # ✔ 4s',
        '✔ 4s, again. You keep checking, like someone who grew up on Dataflows Gen1.')
      : secondLook(s, 'Cell 1: df = pd.read_csv("onelake/gold/*.csv")   # works on my laptop   [running… 41 min]',
        '[running… 42 min] You have now spent a whole billable minute watching it.'),
  }),
  item({
    id: 'board', name: 'notice board', aliases: ['board', 'notice', 'prophecy', 'noticeboard'],
    takeable: false,
    blurb: "The notice board, with the Prophecy still nailed to it. Someone wrote 'export to excel' underneath, and that came too.",
    untakeableText: "It's nailed to the well.",
    // The 2000s-Microsoft allusion (Task F4, voice.ts ALLUSIONS): he is in the corner, and he has a suggestion. The
    // second look is the fourth-handwriting jab; the third is Clippy done, with the realm's favourite result.
    describe: (s) => secondLook(s,
      "A notice board. Someone has written the Prophecy on it, and someone else has written 'export to excel' under that. Try reading it. Someone has drawn Clippy in the corner. It looks like it's writing a measure.",
      'Four handwritings. None of them yours. Nobody asked.',
      "Clippy's finished the measure. It returns (Blank)."),
  }),
  item({
    id: 'well', name: 'well', aliases: ['q&a well', 'qa well', 'the well'],
    takeable: false,
    blurb: 'The Q&A Well, uprooted. Ask it anything, on the road. It answers Sales by Region.',
    untakeableText: "It's a well.",
    describe: (s) => secondLook(s, 'The Q&A Well. Ask it anything. It answers something else.', "Still a well. You're not a well person. You're more of a Lakehouse person."),
  }),
  item({
    id: 'water', name: 'water', aliases: ['marsh', 'marsh water', 'bronze water', 'raw data', 'data'],
    takeable: false,
    blurb: 'Bronze water. Untyped, unvalidated, and soaking through everything else you own.',
    untakeableText: "It's raw data. It runs through your fingers as strings.",
    describe: (s) => secondLook(s, 'Bronze water. Untyped, unvalidated, unloved.', "Untyped. It's not going to declare itself."),
  }),
  item({
    id: 'log', name: 'log', aliases: ['delta log', '_delta_log', 'transaction log', 'logs', 'json'],
    takeable: false,
    blurb: 'A _delta_log folder. It knows exactly what happened, including this, and it will never let it go.',
    untakeableText: "You lift the log. It's just a _delta_log folder. You put it back, exactly where it was, which is the whole point.",
    describe: (s) => secondLook(s, 'Transaction logs float past in the Silver Marsh. Each one is a JSON file that knows exactly what happened.', "It versioned this look. You're on version 2."),
  }),
  item({
    id: 'peaks sign', name: 'sign', aliases: ['peaks sign', 'warning sign', 'signboard'],
    takeable: false,
    blurb: 'CAPACITY PEAKS — INTERACTIVE OPERATIONS MAY BE DELAYED. You took the warning, and the delay stayed on the mountain, waiting for you.',
    untakeableText: 'The sign is bolted to the mountain. The mountain is bolted to the capacity.',
    describe: (s) => secondLook(s,
      `CAPACITY PEAKS — INTERACTIVE OPERATIONS MAY BE DELAYED. BACKGROUND OPERATIONS WILL BE SMOOTHED OVER 24 HOURS. PLEASE DO NOT FEED THE DRAGON. BRING ${MALAPROPS.capacitude.toUpperCase()}.`,
      'You read the sign again. The delay it warns about has kicked in: this is the same sign, arriving late.',
      'Third read. The sign is now the most-viewed report in the Peaks, and it has one visual.'),
  }),
  item({
    id: 'door', name: 'door', aliases: ['shrine door', 'sigils', 'sigil', 'great door', 'shrine'],
    takeable: false,
    blurb: 'The shrine door, three sigils and all. You took the door off the mountain, and the mountain is thinking about it.',
    untakeableText: 'The door is the mountain. You cannot take the mountain.',
    // The progress gate (Task F8): a second look reads you the checklist, minus what you've done, with a new nickname.
    describe: (s) => secondLook(s, `${sigilStatus(s)} The door ${MALAPROPS.refreshered} its sigils while you were not looking.`,
      doorChecklist(s),
      `${doorChecklist(s)} The sigils are not a screensaver of pipes; staring does not make them move.`),
  }),
  item({
    id: 'gate', name: 'gate', aliases: ['monastery gate', 'progress bar', 'bar'],
    takeable: false,
    blurb: 'The Monastery gate, stone progress bar included. SESSION STARTING, wherever you carry it, at the same percent.',
    untakeableText: 'The gate is attached to the monastery, the monastery to the mountain, the mountain to a session that has not started.',
    describe: (s) => s.flags['gate.open']
      ? secondLook(s, 'The gate is open. The progress bar reads 100%, forever.',
        "100%. You're checking on a progress bar that finished, which is how the monks can tell you came from Power BI.")
      : secondLook(s, `A stone gate with a stone progress bar. SESSION STARTING… 0%. Not enough ${MALAPROPS.capacitude} to hurry it. Enough to open a gate, though.`,
        'The bar has not moved while you looked at it. Looking at it is not one of the things that moves it.'),
  }),
  item({
    id: 'lamp', name: 'lamp', aliases: ['status lamp', 'status', 'post'],
    takeable: false,
    blurb: "The Ferryman's status lamp. It was the only thing he had left, and you knew that when you took it.",
    untakeableText: 'The lamp is the Ferryman\'s. It is the only thing he has left.',
    describe: (s) => (s.flags['ferry.online']
      ? secondLook(s, 'The lamp glows a warm ONLINE green.', "Green. You keep checking it, like a refresh you don't trust.")
      : secondLook(s, 'The lamp reads OFFLINE in a sad, blinking red.', 'Red. It blinks like a man refreshing his email for a password reset.')),
  }),
  item({
    id: 'boat', name: 'boat', aliases: ['ferry', 'gateway boat', 'the gateway'],
    takeable: false,
    blurb: 'The Gateway boat, GATEWAY painted on the side in a 2017 font. You cannot take the boat, and yet here it is.',
    untakeableText: 'You cannot take the boat. You can board it. Try that.',
    describe: (s) => secondLook(s, 'A flat-bottomed boat with GATEWAY painted on the side in a font that was fashionable in 2017.', "GATEWAY, in 2017's favourite font. The boat has aged better than the font."),
  }),
  // ---- Room texture (spec §18): small, funny, worth zero points, and each good for exactly one line somewhere ----
  item({
    id: 'jeff-note', name: 'sticky note', aliases: ['note', 'sticky', 'post it', 'postit'],
    takeable: true,
    blurb: 'DO NOT REFRESH — JEFF. A sticky note that has outlived three refresh schedules. It will outlive you.',
    again: "You already peeled the note off your desk. There is a sticky rectangle where it was, and it is somehow also Jeff's.",
    describe: 'A yellow sticky note: DO NOT REFRESH — JEFF. You have no idea how it got on your desk. You have a pretty good idea.',
  }),
  item({
    id: 'lanyard', name: 'lanyard', aliases: ['fabcon lanyard', 'conference lanyard', 'badge'],
    takeable: true, wearable: true,
    blurb: 'A FabCon lanyard with a coffee stain from the keynote. HELLO MY NAME IS, and then nothing, because you left before the name part.',
    again: 'You have the lanyard. You have had the lanyard since the conference. Nobody has checked it once.',
    describe: 'A conference lanyard. FabCon. Still has a coffee stain from the keynote. The badge says HELLO MY NAME IS, and then nothing, because you left before the name part.',
  }),
  item({
    id: 'usb stick', name: 'USB stick', aliases: ['usb', 'stick', 'usb drive', 'thumb drive', 'flash drive', 'final_v2'],
    takeable: true,
    blurb: 'FINAL_v2, on a USB stick. It contains a Dataflow Gen1 Classic. Of course it does.',
    again: 'You already picked FINAL_v2 up off the Mill floor, under the DECOMMISSION banner. FINAL_v3 is still down there somewhere. Nobody has ever found it.',
    describe: 'A USB stick labelled FINAL_v2. It contains a dataflow. Gen1. Of course it does.',
  }),
  item({
    id: 'seed', name: 'seed', aliases: ['refresh seed', 'seeds'],
    takeable: true,
    blurb: 'A refresh seed. Plant it and in 24 hours you have another failed refresh. Nature is a scheduler.',
    again: "We did the Fields already. You dug the seed out from between two failed refreshes while Manual watched, and it hasn't sprouted since.",
    describe: 'A refresh seed. Plant it and in 24 hours you have another failed refresh. Nature is a scheduler.',
  }),
  item({
    id: 'pebble', name: 'pebble', aliases: ['skipping stone', 'flat pebble'],
    takeable: true,
    blurb: 'A flat pebble, perfect for skipping. The OneLake will take it. The OneLake takes everything, once.',
    again: 'You already picked up the pebble. It is one pebble. There is only ever one; they were very clear about that.',
    // The second look is backstory ammo (Task F5): small, sad, specific.
    describe: (s) => secondLook(s, 'A smooth, flat pebble. Perfect for skipping. The OneLake would take it. The OneLake takes everything, once.', "You kept one like it on your desk until 2019, as a 'database.'"),
  }),
  item({
    id: 'timetable', name: 'timetable', aliases: ['ferry timetable', 'schedule', 'ferry schedule'],
    takeable: true,
    blurb: 'FERRY TIMETABLE. Eight departures a day on Pro. Every one of them crossed out and replaced with OFFLINE.',
    again: "You already peeled the timetable off the post at the dock, right under the Ferryman's lamp. He watched you do it. Every departure was OFFLINE then, too.",
    // The fake brand (Task F5, voice.ts BRANDS) sponsors the schedule; the second look is the pen.
    describe: (s) => secondLook(s,
      'FERRY TIMETABLE. Departures: 8 per day (Pro), 48 per day (Premium). Every departure this year has been crossed out and replaced with OFFLINE.',
      'Eight departures, all crossed out, in the same pen, in one sitting.'),
  }),
  item({
    id: 'stress ball', name: 'stress ball', aliases: ['ball', 'cube', 'stress cube', 'olap cube'],
    takeable: true,
    blurb: 'A stress ball shaped like an OLAP cube. Five of its six faces are dimensions nobody asked for.',
    again: 'You already have the cube. You could squeeze it. You have squeezed it. Your forearm is a star schema.',
    describe: (s) => secondLook(s, "A stress ball shaped like a cube. 'OLAP' is printed on one face. The other five faces are dimensions nobody asked for.", 'You had one on your desk in 2008. You thought it was a dice.'),
  }),
  item({
    id: 'name tag', name: 'name tag', aliases: ['tag', 'nametag', 'hello tag'],
    takeable: true, wearable: true,
    blurb: 'HELLO MY NAME IS Column3. Peeled off a column upstream; renamed so many times the ink gave up.',
    again: 'You already fished the name tag out of the Silver Marsh while the transaction logs drifted past and judged you. It still says Column3.',
    describe: (s) => secondLook(s, "A name tag, peeled off a column somewhere upstream: HELLO MY NAME IS Column3. It has been renamed so many times the ink gave up.", "You wore one like it at your first user group. You wrote 'Column3' on it as a joke. You sat alone."),
  }),
  item({
    id: 'pamphlet', name: 'pamphlet', aliases: ['leaflet', 'brochure', 'spark pamphlet'],
    takeable: true,
    blurb: "SPARK: A BEGINNER'S GUIDE. Chapter 1: Waiting. Chapter 3 has not started yet.",
    again: "You already took the pamphlet off the gatekeeper monk while he pointed at the progress bar. Chapter 3 still hasn't started.",
    describe: "SPARK: A BEGINNER'S GUIDE. Chapter 1: Waiting. Chapter 2: Waiting, Continued. Chapter 3 has not started yet.",
  }),
  item({
    id: 'kpi', name: 'laminated KPI', aliases: ['kpi', 'laminated kpi'],
    takeable: true,
    blurb: 'A laminated KPI. Target: 100%. Actual: (Blank). Somebody laminated (Blank), on purpose, to keep it.',
    again: "You already picked the KPI up off the cloister floor, from the middle of the circle the monks pace in. They stepped around you. It's still (Blank).",
    describe: 'A laminated KPI card. Target: 100%. Actual: (Blank). Somebody laminated (Blank). On purpose. To keep it.',
  }),
  item({
    id: 'bamboo', name: 'bamboo', aliases: ['bamboo shoot', 'shoot', 'lunch'],
    takeable: true,
    blurb: "A bamboo shoot, Brother Pandas' lunch. He insists it is also a dependency.",
    again: 'You already took his lunch. He has noticed. He has said nothing, which is worse.',
    describe: "A bamboo shoot. Brother Pandas' lunch. He insists it is also a dependency.",
  }),
  item({
    id: 'synapse-bookmark', name: 'bookmark', aliases: ['synapse bookmark'],
    takeable: true,
    blurb: 'A bookmark from the Synapse wing. It marks a page nobody will return to.',
    again: 'You already slid the bookmark out of the Synapse wing while the Librarian shushed you. Nobody has gone back for the page. Nobody will.',
    describe: 'A bookmark from the Synapse wing. It marks a page nobody will return to.',
  }),
  item({
    id: 'flat-rock', name: 'flat rock', aliases: ['rock', 'flat stone', 'stone'],
    takeable: true,
    blurb: 'A flat rock from the Foothills. Exactly as useful as it looks, which is the most honest thing in the Peaks.',
    again: 'You already have the rock. It was a rock then. Rocks are stable. Unlike you.',
    describe: 'A flat rock from the Foothills. It is exactly as useful as it looks, which is the most honest thing in the Peaks.',
  }),
  item({
    id: 'receipt', name: 'receipt', aliases: ['cu receipt', 'bill'],
    takeable: true,
    blurb: 'A receipt, blowing down the Pass. 1 step, 400 CU-seconds, smoothed over 24 hours, payable now.',
    again: 'You already have the receipt. Picking it up again is a second step. That is another 400 CU-seconds. Itemized.',
    describe: (s) => secondLook(s, 'A receipt, blowing down the Pass. CU consumption: 1 step, 400 CU-seconds. Smoothed over 24 hours. Payable now.',
      'The receipt again. A new line has appeared at the bottom: 1 look at a receipt, 400 CU-seconds.'),
  }),
  // The sports drink (voice.ts BRANDS). Drinking it is a death on the Pass and anywhere you carry it (deaths.ts ADE_DEATH).
  item({
    id: 'capacityade', name: 'energy drink', aliases: ['capacityade', 'capacity ade', 'energy drink', 'can', 'bottle', 'sports drink', 'ade', 'drink', 'the ade', 'label'],
    takeable: true,
    blurb: 'An energy drink. Electrolytes, autoscale, and 64 CUs in a bottle. The label says not to drink it standing on a capacity, which is everywhere.',
    again: 'You already picked the energy drink up on the Pass, and the reach was billed per second. Do not drink it. I know you will.',
    describe: (s) => secondLook(s, "A bottle of energy drink. Electrolytes and autoscale. 'Now with 64 CUs.' The label warns against drinking it while standing on a capacity.",
      "The fine print: 'Do not operate a capacity after drinking.' You are standing on one. You are always standing on one.",
      "Third read of the label. You are going to drink it anyway. I've started on the death text."),
  }),
  item({
    id: 'carabiner', name: 'carabiner', aliases: ['clip', 'karabiner'],
    takeable: true,
    blurb: 'A carabiner stamped F64. Rated for any capacity except yours.',
    again: "You already unclipped the carabiner from the Ledge, under the three sigils. It was clipped to nothing then. It's clipped to nothing now.",
    describe: (s) => secondLook(s, 'A carabiner stamped F64. Rated for any capacity except yours.', 'Still F64. You checked twice. You are still not F64.'),
  }),
  // ---- The Lake House ----
  item({
    id: 'porch-sign', name: 'sign', aliases: ['lakehouse sign'],
    takeable: false,
    blurb: 'LAKE, in serif. HOUSE, in sans, added later by a different team, and you have both halves.',
    untakeableText: 'It is bolted above the porch. Every deed in the realm is bolted to something.',
    describe: (s) => secondLook(s, 'LAKE, in serif. HOUSE, in sans. They were added at different times, by different teams.', 'Two fonts. The teams have since merged; the sign has not.', "LAKE. HOUSE. Three reads. It's not a puzzle; it's a naming decision."),
  }),
  item({
    id: 'deck-chair', name: 'chair', aliases: ['deck chair'],
    takeable: false,
    blurb: 'An Adirondack deck chair, Lakehouse-adjacent. Nobody sat in it while it was on the deck, and nobody is sitting in it now.',
    untakeableText: 'The chair stays on the deck. Sit in it instead.',
    describe: (s) => secondLook(s, 'A deck chair. Adirondack. Lakehouse-adjacent.', "It faces the lake. So does everything; it's a house on a lake."),
  }),
  item({
    id: 'mailbox', name: 'mailbox', aliases: ['mail box', 'post box'],
    takeable: false,
    blurb: 'A mailbox: 1 new. It is the same CSV, and it has been in there since bronze.',
    untakeableText: 'The mailbox is on a post. The post is not going anywhere. Neither, apparently, is the mail.',
    // The second look is the allusion layer (voice.ts ALLUSIONS) and backstory at once; the third is the flag.
    describe: (s) => secondLook(s, 'Mailbox: 1 new. It is a CSV. It has been in the mailbox since bronze.', '1 new. You had a Hotmail inbox that said that for six years.', "1 new. It's the CSV. It always was."),
  }),
  item({
    id: 'house-door', name: 'door', aliases: ['front door'],
    takeable: false,
    blurb: 'The Lake House door. Files and tables are in the same building behind it, and the invoice is on its way.',
    untakeableText: 'It is a door. It stays on the house, which is the whole point of a door.',
    describe: (s) => secondLook(s, 'A door. Behind it, files and tables in the same building. Nobody thought that was strange until the invoice.', 'Files left, tables right, invoice underneath.'),
  }),
  // ---- What the settings put in the rooms (spec2 §3.3–3.5; review E2 M4): scenery, visible only while its book is set ----
  item({
    // The Keep's back gate with XMLA off, from the Monastery side (the Model View answers the same nouns with room rules,
    // fortress.ts). It sits after 'gate' in that room, so the progress-bar gate keeps 'gate' and 'back gate'.
    id: 'xmla-bricks', name: 'bricks', aliases: BRICKS_NOUNS.filter((n) => n !== 'bricks'),
    takeable: false,
    blurb: "Bricks, from where the Model View's back gate was. XMLA is off, and you are carrying the wall.",
    visibleWhen: (s) => !setting(s, 'xmla'),
    untakeableText: BRICKS_TEXT.take,
    describe: BRICKS_TEXT.gate,
  }),
  item({
    id: 'hard-hat', name: 'hard hat', aliases: ['hardhat', 'hat', 'helmet', 'surge protection', 'yellow hat'],
    takeable: false,
    blurb: 'A dragon-sized hard hat, SURGE PROTECTION in stencil. It protected the capacity from the dragon, and it does nothing for you.',
    visibleWhen: (s) => setting(s, 'surge') && !s.flags['dragon.gone'],
    untakeableText: 'It is on a dragon. You are not taking a hat off a dragon.',
    describe: 'A hard hat, dragon-sized, yellow. SURGE PROTECTION on the front, in stencil. It protects the capacity from the dragon. Nothing protects you.',
  }),
  item({
    // The flood. A bare 'jeff' is still Jeff from Finance (no alias here ends in ' jeff'); the rest of the organization is this.
    id: 'jeffs', name: 'organization', aliases: ['jeffs', 'the jeffs', 'other jeffs', 'jeff from ops', 'jeff from hr', 'ops', 'hr', 'the organization', 'entire organization', 'whole organization', 'org', 'everyone', 'crowd', 'the crowd', 'a jeff you do not recognize', 'the jeff you do not recognize'],
    takeable: false,
    blurb: 'The entire organization, every Jeff of it, refreshing on your person. Three more arrive.',
    visibleWhen: (s) => isFlood(s) && s.room === 'village.square',
    untakeableText: 'You take one Jeff by the elbow. Three more arrive. That is how organizations work.',
    describe: JEFFS_TEXT,
  }),
  // ---- The Sacristy (Admin Portal) ----
  // No item here answers to a bare 'book': the noun matcher is suffix-based, so 'book' on the ledger would swallow
  // 'export book'. A bare 'book' gets the sacristy.which-book phrase instead.
  item({ id: 'shelf', name: 'shelf', aliases: ['bookshelf', 'books', 'shelves', 'tenant settings'], takeable: false, blurb: 'The tenant settings shelf, a switch for a spine on every book. That is the tenant, and you took it.', untakeableText: 'The shelf is the tenant. You are not taking the tenant.', describe: (s) => `A shelf of thin books, a switch for a spine on each:\n${shelfListing(s, 'tenant')}${(s.recent?.n ?? 1) >= 2 ? '\nEleven switches, read twice. None of them is labeled UNDO.' : ''}` }),
  item({ id: 'sacristy-sign', name: 'sign', aliases: ['warning', 'warning sign', 'admins only'], takeable: false, blurb: 'FABRIC ADMINISTRATORS ONLY. Everyone here is an admin, and one of them took the sign.', untakeableText: 'The sign stays. It is the only governance in the room.', describe: (s) => secondLook(s, 'FABRIC ADMINISTRATORS ONLY. Under it, smaller: everyone here is an admin. It was easier. Under that, smaller still: please put things back.', "You read the sign again, looking for the line that says you can't. There isn't one. That's the problem with it.", 'The sign is the one thing in the Sacristy without a switch. You have checked.') }),
  item({ id: 'sacristy-lectern', name: 'lectern', aliases: ['podium', 'stand'], takeable: false, blurb: 'A stone lectern from the Sacristy. It held the ledger, the ledger held the capacity, and you hold neither well.', untakeableText: 'The lectern holds the ledger. The ledger holds the capacity. Leave it.', describe: (s) => secondLook(s, 'A stone lectern. On it, the Capacity Ledger, open to the only page that matters.', 'The lectern again. Same page. The ledger has other pages, and it would rather you never saw them.', 'You are staring at furniture in the Admin Portal. This is how audits start.') }),
  item({ id: 'ledger', name: 'ledger', aliases: ['capacity ledger', 'capacity settings'], takeable: false, blurb: 'The Capacity Ledger, chain and all. Somebody paused a capacity once, and the chain was added the next morning.', untakeableText: 'The ledger is chained to the lectern. Somebody paused a capacity once.', describe: (s) => `The Capacity Ledger:\n${shelfListing(s, 'capacity')}` }),
  // The stair is in both rooms (the Cloister looks up it, the Sacristy down it); the phrase sacristy.stair-up/-down climbs it.
  item({ id: 'stair', name: 'stair', aliases: ['stairs', 'spiral stair', 'staircase', 'steps', 'steps down', 'steps up', 'spiral staircase'], takeable: false, blurb: 'A spiral stair, both ends. Admins wore it in the middle going up to fix one thing, and you took the whole thing.', untakeableText: 'The stair is attached to the Monastery at both ends. It stays.', describe: (s) => (s.room === 'monastery.cloister'
    ? 'A spiral stair, up to the Sacristy. Worn in the middle by admins who went up to fix one thing and came down having fixed several.'
    : secondLook(s, 'A spiral stair, down to the Cloister. Worn in the middle by admins who meant to come back up and fix something.', 'The stair, down. It is the only thing in the Sacristy that goes one way and admits it.')) }),
  ...BOOK_ITEMS.map(item),
  // ---- Town Hall (spec2 §6) ----
  item({ id: 'ticket', name: 'ticket', aliases: ['support ticket', 'sev-3', 'sev 3'], takeable: true, blurb: "SEV-3: 'report is wrong'. No further details. It has been In Progress since before you picked it up.", again: "You already took the ticket off the counter, next to the bell, while the Clerk stamped something else. Taking it again would be a duplicate, and the Clerk would close it as one.", describe: "SEV-3: 'report is wrong'. No further details." }),
  item({ id: 'bell', name: 'bell', aliases: ['desk bell', 'service bell'], takeable: false, blurb: 'A desk bell, polished by the hopeful. It was screwed to the counter, and someone took one once, and now that someone is you.', untakeableText: 'The bell is screwed to the counter. Someone took one once.', describe: (s) => secondLook(s, 'A desk bell. Polished by the hopeful.', 'A desk bell. You are looking at it the way the hopeful do. That is where the polish comes from.') }),
  item({ id: 'poster', name: 'poster', aliases: ['frame', 'framed poster', 'sign'], takeable: false, blurb: 'TENANT SETTINGS ARE NOT A SECURITY MEASURE, in a frame. Neither, it turns out, was the frame.', untakeableText: 'It is in a frame. The frame is the point.', describe: (s) => secondLook(s, 'A poster in a frame: TENANT SETTINGS ARE NOT A SECURITY MEASURE. Try reading it; it does not get shorter.', 'TENANT SETTINGS ARE NOT A SECURITY MEASURE. Second read. The frame is the only thing on that wall doing any securing.', 'Same poster. Framed posters do not get release notes.') }),
  item({ id: 'rope', name: 'rope', aliases: ['queue rope', 'queue', 'stanchion'], takeable: false, blurb: 'A velvet queue rope. Nobody has ever stood in it, and now nobody can.', untakeableText: 'The rope is for the queue. The queue is for you.', describe: (s) => secondLook(s, 'A velvet queue rope, zig-zagging to the counter. Nobody in it. It has never had anybody in it.', 'The queue again. Nobody in it. You are the closest thing to a customer it has had, and you are standing next to it.') }),
  // The counter remembers the ticket: once it has been picked up (or escalated), a clean rectangle marks the spot.
  item({ id: 'counter', name: 'counter', aliases: ['front desk', 'desk'], takeable: false, blurb: 'The Town Hall counter, bell and stamp included. The stamp says ADMIN SETTING, and so, from now on, does everything you touch.', untakeableText: 'The counter is the Clerk\'s. The Clerk is the tenant\'s.', describe: (s) => secondLook(s, `A counter with a bell, ${s.flags['taken.ticket'] ? 'a clean rectangle where a ticket was' : 'a ticket'}, and a stamp. The stamp says ADMIN SETTING.`, `A counter with a bell, ${s.flags['taken.ticket'] ? 'a clean rectangle where a ticket was' : 'a ticket'}, and a stamp. The stamp has said ADMIN SETTING so often the letters have gone soft, like the Clerk.`) }),
  // ---- The Semantic Model Keep (Power BI): see keep-items.ts ----
  ...KEEP_ITEMS.map(item),
  // ---- Jeff's Excel (side quest) ----
  item({
    // The parser turns "sales_export (3).csv" into "sales_export 3 csv", so that spelling is an alias too.
    id: 'export', name: 'export', aliases: ['sales_export (3).csv', 'sales_export 3 csv', 'sales_export', 'csv', 'xlsx', 'spreadsheet', 'sheet', 'sales export', 'his export', 'sales data'],
    takeable: false,
    blurb: 'Sales_export (3).csv, 1,048,576 rows, every one of them trusted. Row 1,048,577 is where the truth would have gone.',
    untakeableText: 'It is 1,048,576 rows. Jeff has it pinned. Jeff pins everything.',
    describe: `Sales_export (3).csv. Every row of the visual, plus the Total row, plus three years of history, plus Returns counted as sales. SUM: 4,712,331. Jeff trusts it. It has no more ${MALAPROPS.capacitude}.`,
  }),
  item({
    // 'second monitor' would never reach this item (the monitors suffix-match it first); Sheet1 has a look rule for it.
    id: 'report-monitor', name: 'report', aliases: ['published report', 'certified report'],
    takeable: false,
    blurb: "The certified report, off Jeff's second monitor. He turned it away for a reason, and the reason is 4.2.",
    untakeableText: "It is on Jeff's second monitor. He has turned it away. You are not turning it back.",
    describe: REPORT_MONITOR_TEXT,
  }),
  item({
    id: 'monitor', name: 'monitor', aliases: ['monitors', 'screen', 'first monitor'],
    takeable: false,
    blurb: 'Two monitors and one desk. The right one is angled away, the way you angle a mirror you have stopped trusting.',
    untakeableText: 'Two monitors, one desk, zero chance you are walking off with either.',
    describe: (s) => secondLook(s, 'Two monitors. The left one has the export and a SUM. The right one has the report and is angled away, the way you angle a mirror you have stopped trusting.',
      'Left: 4,712,331. Right: turned away. Jeff has picked a side, and it is the one he can see.',
      'You keep looking at the monitors. Jeff keeps not looking at the right one. Between you, that is one whole analyst.'),
  }),
  item({
    // No 'table' alias: "pivot table" would suffix-match it and Sheet1 would describe the desk.
    id: 'desk-jeff', name: 'desk', aliases: ["jeff's desk", 'his desk'],
    takeable: false,
    blurb: "Jeff's desk: F2 worn smooth, a different WORLD'S OKAYEST ANALYST mug. Finance property, and so, technically, is Jeff.",
    untakeableText: 'The desk is Finance property. So, technically, is Jeff.',
    describe: "Jeff's desk. A keyboard with the F2 worn smooth, a mug that says WORLD'S OKAYEST ANALYST (no, a different one), and seventeen printouts of the same total.",
  }),
  item({
    id: 'tissues', name: 'tissue box', aliases: ['tissues', 'tissue', 'box of tissues', 'kleenex'],
    takeable: false,
    blurb: "Jeff's tissue box, half empty. It was full this morning, before the report said 4.2.",
    untakeableText: 'Jeff is going to need those. Leave them.',
    describe: (s) => secondLook(s, 'A tissue box. Half empty. It was full this morning, before the report said 4.2.',
      'Half empty. Jeff would call it half full. Jeff would SUM it and call it 4.7 boxes.',
      `You are staring at a tissue box, ${nick(s)}. Jeff has noticed. He takes one, for you.`),
  }),
  item({
    id: 'ribbon', name: 'ribbon', aliases: ['toolbar', 'menu', 'tabs', 'data tab', 'data'],
    takeable: false,
    blurb: 'The Excel ribbon: Home, Insert, Data, Analyze in Excel. It is load-bearing, and Excel is sagging without it.',
    untakeableText: 'The ribbon is load-bearing. It holds up the whole of Excel.',
    describe: (s) => secondLook(s, 'Home · Insert · Data · Analyze in Excel. The last one is new. Jeff has not clicked it.',
      'Home, Insert, Data, and past the little chevron, a whole tab of features nobody has ever opened.',
      "A paperclip slides out from behind Analyze in Excel. It looks like you're looking at a ribbon."),
  }),
  item({
    id: 'pivot', name: 'PivotTable1', aliases: ['pivottable', 'pivot table', 'pivottable1', 'pivot'],
    takeable: false,
    blurb: "PivotTable1, built on Jeff's export. It says 4.7M with the confidence of a thing that has never met a model.",
    untakeableText: 'You cannot take a pivot. You can only show it to Jeff.',
    describe: (s) => {
      if (!s.flags['excel.connected']) return "Jeff's pivot, built on Jeff's export. Rows: Region A. Values: Sum of Sales Amount. Filters: none. 4.7M.";
      if (!s.flags['excel.pivot']) return "Jeff's pivot is still pointed at the export. The live model is connected now. create pivot table.";
      return `A pivot on the live model. Rows: ${s.flags['excel.dim'] ? 'Sales Region' : '(none)'}. Values: ${s.flags['excel.measure'] ? 'Net Sales' : '(none)'}. Filters: ${s.flags['excel.filter'] ? 'Is Current Year = Yes' : '(none)'}. Grand Total: ${pivotTotal(s)}.`;
    },
  }),
  item({
    // Always visible: before the connection it lists Jeff's export and sends you north (excel.ts owns the text).
    id: 'field-pane', name: 'field list', aliases: ['fields', 'field pane', 'pane', 'field list', 'pivottable fields'],
    takeable: false,
    blurb: 'The PivotTable field list, docked. It will undock itself later, at the worst possible moment.',
    untakeableText: 'The field list is docked. It will undock itself later, at the worst possible moment.',
    describe: (s) => secondLook(s, fieldListText(s),
      s.flags['excel.connected'] ? 'The same fields. Sales Region is still the right one. Region A is still in there, being legacy at you.'
        : 'Region A, Sales Amount, Column1. Column1 has no idea what it is either.',
      'Third read. The list has not got shorter. It never will. Nobody removes a field.'),
  }),
  item({
    id: 'connection', name: 'connection', aliases: ['odc', 'analyze in excel', 'analyze', 'data connection', 'connection file'],
    takeable: false,
    blurb: "An Analyze in Excel connection file. It is the one thing on Jeff's desk that knows where the real numbers live, and he has never double-clicked it.",
    untakeableText: 'It is a connection file. It goes where the Data tab goes.',
    describe: (s) => (s.flags['excel.connected'] ? 'Analyze in Excel. Connected: Sales (Certified).' : 'Analyze in Excel (.odc). Sign-in required.'),
  }),
  // ---- Copilot (side quest) ----
  item({
    id: 'prompt-box', name: 'prompt box', aliases: ['prompt', 'box', 'input', 'chat', 'sparkle', 'answer', 'last answer', 'reply'],
    takeable: false,
    blurb: "A rounded prompt box. 'Ask Copilot anything,' it says, and it does not promise to answer that.",
    untakeableText: 'You cannot take the prompt box. You can only type into it. Type a question.',
    describe: (s) => `A rounded prompt box. "Ask Copilot anything," it says. It does not promise to answer the thing you asked. Above it, your last answer${lastAnswer(s)}.${PROMPT_SPARE}`,
  }),
  item({
    id: 'models', name: 'models', aliases: ['plinths', 'plinth', 'semantic models', 'names'], // bare 'model' is a gallery rule: as an alias it would swallow 'certified model'
    takeable: false,
    blurb: 'Three semantic models on three plinths. The certified one has a badge to protect, and you are not protecting it.',
    untakeableText: 'They are semantic models on plinths. They are not coming with you. The certified one has a badge to protect.',
    describe: modelsText,
  }),
  item({
    id: 'model-certified', name: 'Sales (Certified)', aliases: ['certified', 'certified model', 'sales certified', 'badge', 'gold badge', 'measures', 'measure'],
    takeable: false,
    blurb: 'Sales (Certified), gold badge, three measures. Net Sales has the checkmark, and the checkmark was earned by someone else.',
    untakeableText: 'The badge was earned. It stays on its plinth.',
    // Discover content off (spec2 §3.3): the badge stays, the brass plate goes. The measures are still on it; the name is the hint.
    describe: (s) => (setting(s, 'discover')
      ? 'Sales (Certified). Gold endorsement badge. Measures: Net Sales · Sales Amount · Returns. Net Sales is the one with the checkmark next to it. The checkmark was earned.'
      : 'A model with a gold badge and no name. Discovery is off. You will have to guess. Measures: Net Sales · Sales Amount · Returns.'),
  }),
  item({
    id: 'model-final2', name: 'Sales_v3_FINAL_final2', aliases: ['final2', 'final', 'sales_v3_final_final2', 'v3', 'sales v3', 'biggest', 'biggest model', 'big one'],
    takeable: false,
    blurb: 'Sales_v3_FINAL_final2, 11 GB, no badge. Last refreshed by someone who has left the company, which you are considering.',
    untakeableText: 'It is 11 GB. Nobody is taking it anywhere. Nobody ever has.',
    describe: 'Sales_v3_FINAL_final2. No badge. Last refreshed by someone who has left the company. Copilot likes it because it has the most rows. Last refreshed through a personal-mode gateway on a laptop that is closed.',
  }),
  item({
    id: 'model-test', name: 'sales_test_DO_NOT_USE', aliases: ['test', 'sales_test_do_not_use', 'do not use', 'sign', 'test model'],
    takeable: false,
    blurb: 'sales_test_DO_NOT_USE, with a sign that says DO NOT USE and a total of $12. Someone used it anyway, in a board deck.',
    untakeableText: 'The sign says DO NOT USE. Taking it is using it.',
    describe: 'sales_test_DO_NOT_USE. A small sign: DO NOT USE. Its total is $12. Someone used it anyway, in a board deck.',
  }),
]);

export function sigilStatus(s: import('../engine/types').GameState): string {
  if (s.flags['shrine.open']) return 'The door stands open. All three sigils blaze: HOODIE, STINK LINES, KEY.';
  const parts = [
    s.flags['trial.hoodie'] ? 'The hoodie sigil glows.' : 'The hoodie sigil is dark.',
    s.flags['trial.moat'] ? 'The stink-lines sigil glows.' : 'The stink-lines sigil is dark.',
    s.flags['trial.key'] ? 'The key sigil glows.' : 'The key sigil is dark.',
  ];
  return `A great door carved with three sigils: a HOODIE, three wavy STINK LINES, and a KEY. ${parts.join(' ')}`;
}

/** The Worthy Three that are done, in the door's words; and the ones still missing. */
const DONE_LINE: Record<string, string> = {
  'trial.hoodie': 'You look like an Engineer, sort of.',
  'trial.moat': 'Frankly, you smell like a Warehouse.',
  'trial.key': 'You hold the Key like a man who expects to give it back.',
};
const MISSING_LINE: Record<string, string> = {
  'trial.hoodie': "you don't LOOK like an Engineer",
  'trial.moat': "you don't SMELL like a Warehouse",
  'trial.key': "you're not HOLDING the Key",
};

/**
 * The Shrine door as a progress gate (the skill's "Progress gate, repeated with variants", Task F8): it counts the
 * sigils, restates only what is still missing, and calls you something new every time (nick). No flag moves.
 */
export function doorChecklist(s: GameState): string {
  const keys = ['trial.hoodie', 'trial.moat', 'trial.key'];
  const done = keys.filter((k) => !!s.flags[k]);
  const missing = keys.filter((k) => !s.flags[k]).map((k) => MISSING_LINE[k]!);
  const list = missing.length > 1 ? `${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]!}` : missing[0] ?? '';
  if (!missing.length) return `Lookin' good, ${nick(s)}. Three of 3. The door is just being dramatic now.`;
  if (!done.length) return `Zero of 3, ${nick(s)}. ${list.charAt(0).toUpperCase()}${list.slice(1)}. The door has had better peasants.`;
  if (done.length === 1) return `One of 3, ${nick(s)}. ${DONE_LINE[done[0]!]!} But ${list}.`;
  return `Almost there, ${nick(s)}. But ${list}.`;
}
