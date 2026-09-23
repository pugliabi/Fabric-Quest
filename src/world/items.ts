import type { Item } from './types';
import { total as pivotTotal } from './excel';
import { MODELS_TEXT, lastAnswer } from './copilot';
import { KEEP_ITEMS } from './keep-items';

const item = (i: Item): [string, Item] => [i.id, i];

export const ITEMS: Record<string, Item> = Object.fromEntries([
  item({
    id: 'license', name: 'Pro License Card', aliases: ['license', 'card', 'license card', 'pro license', 'pro'],
    takeable: true,
    describe: 'A Power BI Pro license. The only license you have. Also, it turns out, the only one the Library accepts.',
  }),
  item({
    id: 'mug', name: 'mug', aliases: ['coffee mug', 'cup', 'okayest mug'],
    takeable: true,
    describe: "'World's Okayest Analyst.' It has never been washed.",
  }),
  item({
    id: 'report', name: 'report', aliases: ['pbix', 'sales report', 'sales_v3_final_final2.pbix', 'file', 'sales'],
    takeable: false,
    untakeableText: "It's 2.3 GB. You'd need a Premium license to lift it.",
    describe: "Sales_v3_FINAL_final2.pbix. There is also a Sales_v3_FINAL_final3.pbix, but you don't talk about that one.",
  }),
  item({
    id: 'bed', name: 'bed', aliases: ['cot', 'bunk', 'blanket', 'pillow'],
    takeable: false,
    untakeableText: 'It is bolted to the workspace. Everything here is.',
    describe: 'A narrow bed. The blanket is a decommissioned Report Server banner. You have not slept in it since the refresh schedule moved to 2 AM.',
  }),
  item({
    id: 'candle', name: 'candle', aliases: ['light', 'flame', 'wax'],
    takeable: false,
    untakeableText: 'It is the only light source in the workspace. Leave it.',
    describe: 'A candle burning at both ends. It is on its third Fabric trial.',
  }),
  item({
    id: 'desk', name: 'desk', aliases: ['table', 'workbench', 'workstation'],
    takeable: false,
    untakeableText: 'It has a 2.3 GB report on it. You are not lifting that.',
    describe: (s) => `A desk. On it: the report${s.flags['taken.mug'] ? ', and a ring where a mug used to be' : ', and a mug'}. Under it: seventeen printouts of the same DAX error.`,
  }),
  item({
    id: 'window', name: 'window', aliases: ['glass', 'shutters', 'outside', 'view'],
    takeable: false,
    untakeableText: 'The window stays. The draft is load-bearing.',
    describe: 'Through the window: the Village Square, a well, and a man holding an empty spreadsheet toward the sky as if it might fill on its own.',
  }),
  item({
    id: 'cottage-door', name: 'door', aliases: ['front door', 'exit door'],
    takeable: false,
    untakeableText: 'The door is a shared dataset. It stays where it is.',
    describe: 'The door. It is out, to the east. It has never been locked; nobody in the realm wants what is in here.',
  }),
  item({
    id: 'wheel', name: 'mill wheel', aliases: ['wheel', 'mill', 'water wheel', 'the wheel'],
    takeable: false,
    untakeableText: 'It is part of the Mill. The Mill is part of the deprecation plan.',
    describe: 'The wheel turns once every scheduled refresh. It creaks in Power Query M. Nobody has clicked \'Edit\' on it since 2019.',
  }),
  item({
    id: 'banner', name: 'banner', aliases: ['sign', 'decommission banner', 'decommission'],
    takeable: false,
    untakeableText: 'It is stapled to the beam. Also to the roadmap.',
    describe: 'DECOMMISSION: Q3. The year has been painted over four times.',
  }),
  item({
    id: 'chest', name: 'credentials chest', aliases: ['chest', 'credentials chest', 'box', 'strongbox'],
    takeable: false,
    untakeableText: 'The Miller\'s hand is on it. Talk to him.',
    describe: 'A chest marked CREDENTIALS. Inside, presumably, the Gen1 credentials. The Miller is the lock.',
  }),
  item({
    id: 'crops', name: 'refreshes', aliases: ['crops', 'refresh', 'refreshes', 'rows', 'field', 'fields'],
    takeable: false,
    untakeableText: 'You pull one up. It fails. You put it back.',
    describe: 'Rows of scheduled refreshes, swaying. About a third are green. The rest are the colour of a 2 AM email.',
  }),
  item({
    id: 'plinth', name: 'plinth', aliases: ['plinth', 'stone plinth', 'stand'],
    takeable: false,
    untakeableText: 'It\'s a plinth. It is the island.',
    describe: 'A stone plinth with two hollows shaped like keys. One says PERSONAL. One says STANDARD. Only one hollow has ever been used.',
  }),
  item({
    id: 'plaque', name: 'plaque', aliases: ['plaque', 'inscription', 'sign'],
    takeable: false,
    untakeableText: 'It is bolted to the plinth.',
    describe: 'CHOOSE. THEN LIVE WITH IT. — the Gateway Council. Below, smaller: \'Personal mode cannot be shared. Standard mode cannot be unshared.\'',
  }),
  item({
    id: 'csv', name: 'CSV', aliases: ['csv', 'column1', 'column2', 'column3', 'file', 'the csv'],
    takeable: false,
    untakeableText: 'It slips through your fingers, delimited.',
    describe: 'A CSV drifting face-up. Column1, Column2, Column3. Somewhere, someone is about to name them all in Power Query, by hand, for the fourth time.',
  }),
  item({
    id: 'floor', name: 'cloister floor', aliases: ['floor', 'flagstones', 'stones', 'circle'],
    takeable: false,
    untakeableText: 'It\'s a floor.',
    describe: 'Worn in a perfect circle by monks pacing \'spark dot read\'. The centre stone has a burn mark shaped like a cluster starting.',
  }),
  item({
    id: 'shelves', name: 'shelves', aliases: ['shelf', 'shelves', 'books', 'notebooks', 'runtime', 'synapse', 'wing'],
    takeable: false,
    untakeableText: 'The Librarian clears her throat. Loudly.',
    describe: 'Runtime 1.1. Runtime 1.2. A whole wing labelled SYNAPSE, roped off, with a sign: \'Still supported. Please don\'t.\'',
  }),
  item({
    id: 'case', name: 'locked case', aliases: ['case', 'glass case', 'locked case', 'display case'],
    takeable: false,
    untakeableText: 'Locked. The Librarian has the key and a policy.',
    describe: 'A glass case. Inside: the Spark Scroll. The lock takes a library card — any Pro license will do, she says, looking at yours.',
  }),
  item({
    id: 'rocks', name: 'rocks', aliases: ['rock', 'rocks', 'stone', 'stones', 'air', 'scree'],
    takeable: false,
    untakeableText: 'You lift a rock. It is billed per second. You put it down.',
    describe: 'Rocks. Each one takes a little longer to look at than the last. The air is thin and metered.',
  }),
  item({
    id: 'credentials', name: 'credentials', aliases: ['creds', 'gen1 credentials', 'password', 'parchment'],
    takeable: true,
    describe: 'Gen1 credentials on a scrap of parchment. Stored at the Mill since 2019. Somehow still valid.',
  }),
  item({
    id: 'scroll', name: 'scroll', aliases: ['spark scroll', 'pyspark scroll'],
    takeable: true,
    describe: 'A scroll of PySpark. The first line reads: df = spark.read.format("delta"). The rest is comments.',
  }),
  item({
    id: 'hoodie', name: 'hoodie', aliases: ['hoodie of spark', 'spark hoodie', 'black hoodie'],
    takeable: true, wearable: true,
    describe: "A black hoodie with a small orange flame on the chest. Wearing it makes you 40% more likely to say 'just write a notebook.'",
  }),
  item({
    id: 'shortcut', name: 'shortcut', aliases: ['signpost', 'sign', 'onelake shortcut', 'pointer'],
    takeable: true,
    describe: "A OneLake Shortcut. It weighs nothing. It's just a pointer.",
  }),
  item({
    id: 'personal key', name: 'personal key', aliases: ['personal mode key', 'personal', 'personal gateway key'],
    takeable: true,
    describe: 'A Personal Mode gateway key. It only works for you, and only while your laptop is open.',
  }),
  item({
    id: 'standard key', name: 'standard key', aliases: ['gateway key', 'standard mode key', 'key', 'standard', 'standard gateway key'],
    takeable: true,
    describe: 'A Standard Mode gateway key. Heavy, cold, enterprise-grade.',
  }),
  item({
    id: 'boots', name: 'boots', aliases: ['bursting boots', 'pair of boots', 'boot'],
    takeable: true, wearable: true,
    describe: 'Bursting Boots. Provenance unknown. They smell faintly of Gold.',
  }),
  item({
    id: 'model', name: 'golden semantic model', aliases: ['model', 'semantic model', 'golden model', 'the model'],
    takeable: true,
    visibleWhen: (s) => !!s.flags['dragon.gone'],
    describe: "The Golden Semantic Model. It glows. Somehow it also has a 'Column1'.",
  }),
  item({
    id: 'notebook', name: 'notebook', aliases: ['brother pandas notebook', 'cell', "pandas' notebook", 'pandas notebook'],
    takeable: false,
    untakeableText: "It's a shared notebook. Take it and Brother Pandas loses his session.",
    describe: (s) => s.flags['notebook.fixed']
      ? 'Cell 1: df = spark.read.format("delta").load(path)   # ✔ 4s'
      : 'Cell 1: df = pd.read_csv("onelake/gold/*.csv")   # works on my laptop   [running… 41 min]',
  }),
  item({
    id: 'board', name: 'notice board', aliases: ['board', 'notice', 'prophecy', 'noticeboard'],
    takeable: false,
    untakeableText: "It's nailed to the well.",
    describe: "A notice board. Someone has written the Prophecy on it, and someone else has written 'export to excel' under that. Try reading it.",
  }),
  item({
    id: 'well', name: 'well', aliases: ['q&a well', 'qa well', 'the well'],
    takeable: false,
    untakeableText: "It's a well.",
    describe: 'The Q&A Well. Ask it anything. It answers something else.',
  }),
  item({
    id: 'water', name: 'water', aliases: ['marsh', 'marsh water', 'bronze water', 'raw data', 'data'],
    takeable: false,
    untakeableText: "It's raw data. It runs through your fingers as strings.",
    describe: 'Bronze water. Untyped, unvalidated, unloved.',
  }),
  item({
    id: 'log', name: 'log', aliases: ['delta log', '_delta_log', 'transaction log', 'logs', 'json'],
    takeable: false,
    untakeableText: "You lift the log. It's just a _delta_log folder. You put it back, exactly where it was, which is the whole point.",
    describe: 'Transaction logs float past in the Silver Marsh. Each one is a JSON file that knows exactly what happened.',
  }),
  item({
    id: 'peaks sign', name: 'sign', aliases: ['peaks sign', 'warning sign', 'signboard'],
    takeable: false,
    untakeableText: 'The sign is bolted to the mountain. The mountain is bolted to the capacity.',
    describe: 'CAPACITY PEAKS — INTERACTIVE OPERATIONS MAY BE DELAYED. BACKGROUND OPERATIONS WILL BE SMOOTHED OVER 24 HOURS. PLEASE DO NOT FEED THE DRAGON.',
  }),
  item({
    id: 'door', name: 'door', aliases: ['shrine door', 'sigils', 'sigil', 'great door', 'shrine'],
    takeable: false,
    untakeableText: 'The door is the mountain. You cannot take the mountain.',
    describe: (s) => sigilStatus(s),
  }),
  item({
    id: 'gate', name: 'gate', aliases: ['monastery gate', 'progress bar', 'bar'],
    takeable: false,
    untakeableText: 'The gate is attached to the monastery, the monastery to the mountain, the mountain to a session that has not started.',
    describe: (s) => s.flags['gate.open']
      ? 'The gate is open. The progress bar reads 100%, forever.'
      : `A stone gate with a stone progress bar. SESSION STARTING… ${['0%', '33%', '67%'][(s.flags['gate.waiting'] as number) ?? 0]}`,
  }),
  item({
    id: 'lamp', name: 'lamp', aliases: ['status lamp', 'status', 'post'],
    takeable: false,
    untakeableText: 'The lamp is the Ferryman\'s. It is the only thing he has left.',
    describe: (s) => (s.flags['ferry.online'] ? 'The lamp glows a warm ONLINE green.' : 'The lamp reads OFFLINE in a sad, blinking red.'),
  }),
  item({
    id: 'boat', name: 'boat', aliases: ['ferry', 'gateway boat', 'the gateway'],
    takeable: false,
    untakeableText: 'You cannot take the boat. You can board it. Try that.',
    describe: 'A flat-bottomed boat with GATEWAY painted on the side in a font that was fashionable in 2017.',
  }),
  // ---- Room texture (spec §18): small, funny, worth zero points, and each good for exactly one line somewhere ----
  item({
    id: 'jeff-note', name: 'sticky note', aliases: ['note', 'sticky', 'post it', 'postit'],
    takeable: true,
    describe: 'A yellow sticky note: DO NOT REFRESH — JEFF. You have no idea how it got on your desk. You have a pretty good idea.',
  }),
  item({
    id: 'lanyard', name: 'lanyard', aliases: ['fabcon lanyard', 'conference lanyard', 'badge'],
    takeable: true, wearable: true,
    describe: 'A conference lanyard. FabCon. Still has a coffee stain from the keynote. The badge says HELLO MY NAME IS, and then nothing, because you left before the name part.',
  }),
  item({
    id: 'usb stick', name: 'USB stick', aliases: ['usb', 'stick', 'usb drive', 'thumb drive', 'flash drive', 'final_v2'],
    takeable: true,
    describe: 'A USB stick labelled FINAL_v2. It contains a dataflow. Gen1. Of course it does.',
  }),
  item({
    id: 'seed', name: 'seed', aliases: ['refresh seed', 'seeds'],
    takeable: true,
    describe: 'A refresh seed. Plant it and in 24 hours you have another failed refresh. Nature is a scheduler.',
  }),
  item({
    id: 'pebble', name: 'pebble', aliases: ['skipping stone', 'flat pebble'],
    takeable: true,
    describe: 'A smooth, flat pebble. Perfect for skipping. The OneLake would take it. The OneLake takes everything, once.',
  }),
  item({
    id: 'timetable', name: 'timetable', aliases: ['ferry timetable', 'schedule', 'ferry schedule'],
    takeable: true,
    describe: 'FERRY TIMETABLE. Departures: 8 per day (Pro), 48 per day (Premium). Every departure this year has been crossed out and replaced with OFFLINE.',
  }),
  item({
    id: 'stress ball', name: 'stress ball', aliases: ['ball', 'cube', 'stress cube', 'olap cube'],
    takeable: true,
    describe: "A stress ball shaped like a cube. 'OLAP' is printed on one face. The other five faces are dimensions nobody asked for.",
  }),
  item({
    id: 'name tag', name: 'name tag', aliases: ['tag', 'nametag', 'hello tag'],
    takeable: true, wearable: true,
    describe: "A name tag, peeled off a column somewhere upstream: HELLO MY NAME IS Column3. It has been renamed so many times the ink gave up.",
  }),
  item({
    id: 'pamphlet', name: 'pamphlet', aliases: ['leaflet', 'brochure', 'spark pamphlet'],
    takeable: true,
    describe: "SPARK: A BEGINNER'S GUIDE. Chapter 1: Waiting. Chapter 2: Waiting, Continued. Chapter 3 has not started yet.",
  }),
  item({
    id: 'kpi', name: 'laminated KPI', aliases: ['kpi', 'laminated kpi'],
    takeable: true,
    describe: 'A laminated KPI card. Target: 100%. Actual: (Blank). Somebody laminated (Blank). On purpose. To keep it.',
  }),
  item({
    id: 'bamboo', name: 'bamboo', aliases: ['bamboo shoot', 'shoot', 'lunch'],
    takeable: true,
    describe: "A bamboo shoot. Brother Pandas' lunch. He insists it is also a dependency.",
  }),
  item({
    id: 'synapse-bookmark', name: 'bookmark', aliases: ['synapse bookmark'],
    takeable: true,
    describe: 'A bookmark from the Synapse wing. It marks a page nobody will return to.',
  }),
  item({
    id: 'flat-rock', name: 'flat rock', aliases: ['rock', 'flat stone', 'stone'],
    takeable: true,
    describe: 'A flat rock from the Foothills. It is exactly as useful as it looks, which is the most honest thing in the Peaks.',
  }),
  item({
    id: 'receipt', name: 'receipt', aliases: ['cu receipt', 'bill'],
    takeable: true,
    describe: 'A receipt, blowing down the Pass. CU consumption: 1 step, 400 CU-seconds. Smoothed over 24 hours. Payable now.',
  }),
  item({
    id: 'carabiner', name: 'carabiner', aliases: ['clip', 'karabiner'],
    takeable: true,
    describe: 'A carabiner stamped F64. Rated for any capacity except yours.',
  }),
  // ---- The Lake House ----
  item({
    id: 'porch-sign', name: 'sign', aliases: ['lakehouse sign'],
    takeable: false,
    untakeableText: 'It is bolted above the porch. Every deed in the realm is bolted to something.',
    describe: 'LAKE, in serif. HOUSE, in sans. They were added at different times, by different teams.',
  }),
  item({
    id: 'deck-chair', name: 'chair', aliases: ['deck chair'],
    takeable: false,
    untakeableText: 'The chair stays on the deck. Sit in it instead.',
    describe: 'A deck chair. Adirondack. Lakehouse-adjacent.',
  }),
  item({
    id: 'mailbox', name: 'mailbox', aliases: ['mail box', 'post box'],
    takeable: false,
    untakeableText: 'The mailbox is on a post. The post is not going anywhere. Neither, apparently, is the mail.',
    describe: 'Mailbox: 1 new. It is a CSV. It has been in the mailbox since bronze.',
  }),
  item({
    id: 'house-door', name: 'door', aliases: ['front door'],
    takeable: false,
    untakeableText: 'It is a door. It stays on the house, which is the whole point of a door.',
    describe: 'A door. Behind it, files and tables in the same building. Nobody thought that was strange until the invoice.',
  }),
  // ---- The Semantic Model Keep (Power BI): see keep-items.ts ----
  ...KEEP_ITEMS.map(item),
  // ---- Jeff's Excel (side quest) ----
  item({
    id: 'export', name: 'export', aliases: ['sales_export_v7 xlsx', 'sales_export_v7.xlsx', 'xlsx', 'spreadsheet', 'sheet', 'sales export'],
    takeable: false,
    untakeableText: 'It is 1,048,576 rows. Jeff has it pinned. Jeff pins everything.',
    describe: 'Sales_export_v7.xlsx. 4.7M at the bottom, in bold, with a border. Jeff formats his mistakes.',
  }),
  item({
    id: 'report-monitor', name: 'report', aliases: ['second monitor', 'monitor', 'published report'],
    takeable: false,
    untakeableText: 'It is on Jeff\'s second monitor. He has turned it away. You are not turning it back.',
    describe: 'The published report on the second monitor. Total Sales: 4.2M. Certified. Jeff has turned it slightly away.',
  }),
  item({
    id: 'ribbon', name: 'ribbon', aliases: ['toolbar', 'menu', 'tabs'],
    takeable: false,
    untakeableText: 'The ribbon is load-bearing. It holds up the whole of Excel.',
    describe: 'Home · Insert · Data · Analyze in Excel. The last one is new. Jeff has not clicked it.',
  }),
  item({
    id: 'pivot', name: 'PivotTable1', aliases: ['pivottable', 'pivot table', 'pivottable1', 'pivot'],
    takeable: false,
    untakeableText: 'You cannot take a pivot. You can only show it to Jeff.',
    describe: (s) => {
      if (!s.flags['excel.connected']) return "Jeff's pivot, built on Jeff's export. Rows: Region A. Values: Sum of Sales Amount. Filters: none. 4.7M.";
      if (!s.flags['excel.pivot']) return "Jeff's pivot is still pointed at the export. The live model is connected now. create pivot table.";
      return `A pivot on the live model. Rows: ${s.flags['excel.dim'] ? 'Sales Region' : '(none)'}. Values: ${s.flags['excel.measure'] ? 'Net Sales' : '(none)'}. Filters: ${s.flags['excel.filter'] ? 'Is Current Year = Yes' : '(none)'}. Grand Total: ${pivotTotal(s)}.`;
    },
  }),
  item({
    id: 'field-pane', name: 'field list', aliases: ['fields', 'field pane', 'pane', 'tables', 'field list'],
    takeable: false,
    untakeableText: 'The field list is docked. It will undock itself later, at the worst possible moment.',
    visibleWhen: (s) => !!s.flags['excel.connected'],
    describe: 'PivotTable Fields — Sales (Certified).\n'
      + '  Geography (legacy): Region A, Region B (greyed: "deprecated")\n'
      + '  Sales Region: Sales Region, Territory\n'
      + '  Calendar: Year, Quarter, Is Current Year\n'
      + '  Measures: Sales Amount, Net Sales, Returns',
  }),
  item({
    id: 'connection', name: 'connection', aliases: ['odc', 'analyze in excel', 'analyze', 'data connection', 'connection file'],
    takeable: false,
    untakeableText: 'It is a connection file. It goes where the Data tab goes.',
    describe: (s) => (s.flags['excel.connected'] ? 'Analyze in Excel. Connected: Sales (Certified).' : 'Analyze in Excel (.odc). Sign-in required.'),
  }),
  // ---- Copilot (side quest) ----
  item({
    id: 'prompt-box', name: 'prompt box', aliases: ['prompt', 'box', 'input', 'chat', 'sparkle', 'answer', 'last answer', 'reply'],
    takeable: false,
    untakeableText: 'You cannot take the prompt box. You can only type into it. Type a question.',
    describe: (s) => `A rounded prompt box. "Ask Copilot anything," it says. It does not promise to answer the thing you asked. Above it, your last answer${lastAnswer(s)}.`,
  }),
  item({
    id: 'models', name: 'models', aliases: ['plinths', 'plinth', 'semantic models', 'names'], // bare 'model' is a gallery rule: as an alias it would swallow 'certified model'
    takeable: false,
    untakeableText: 'They are semantic models on plinths. They are not coming with you. The certified one has a badge to protect.',
    describe: MODELS_TEXT,
  }),
  item({
    id: 'model-certified', name: 'Sales (Certified)', aliases: ['certified', 'certified model', 'sales certified', 'badge', 'gold badge', 'measures', 'measure'],
    takeable: false,
    untakeableText: 'The badge was earned. It stays on its plinth.',
    describe: 'Sales (Certified). Gold endorsement badge. Measures: Net Sales · Sales Amount · Returns. Net Sales is the one with the checkmark next to it. The checkmark was earned.',
  }),
  item({
    id: 'model-final2', name: 'Sales_v3_FINAL_final2', aliases: ['final2', 'final', 'sales_v3_final_final2', 'v3', 'sales v3', 'biggest'],
    takeable: false,
    untakeableText: 'It is 11 GB. Nobody is taking it anywhere. Nobody ever has.',
    describe: 'Sales_v3_FINAL_final2. No badge. Last refreshed by someone who has left the company. Copilot likes it because it has the most rows.',
  }),
  item({
    id: 'model-test', name: 'sales_test_DO_NOT_USE', aliases: ['test', 'sales_test_do_not_use', 'do not use', 'sign', 'test model'],
    takeable: false,
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
