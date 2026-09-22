import type { Item } from './types';

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
    id: 'cable', name: 'cable', aliases: ['connection', 'connection cable', 'wire', 'cord'],
    takeable: true,
    visibleWhen: (s) => !!s.flags['lookup.beaten'],
    describe: "A connection cable. One end says 'Source'. The other end says 'Sink'. Neither end says where.",
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
    id: 'drawbridge', name: 'drawbridge', aliases: ['bridge', 'moat', 'moat of t-sql'],
    takeable: false,
    untakeableText: 'The drawbridge weighs more than your report, and your report weighs 2.3 GB.',
    describe: (s) => s.flags['bridge.down']
      ? 'The drawbridge is down. The Moat of T-SQL glitters below, full of semicolons.'
      : 'The drawbridge is up. Below it, the Moat of T-SQL glitters with semicolons and something that might be a CROSS APPLY.',
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
