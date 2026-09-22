import type { Room } from './types';

const room = (r: Room): [string, Room] => [r.id, r];

const SCROLL = ['scroll', 'spark scroll', 'pyspark scroll'];
const NOTEBOOK = ['notebook', 'cell', 'brother pandas notebook', 'pandas notebook', "pandas' notebook"];
const LICENSE = ['license', 'card', 'license card', 'pro license', 'pro', 'pro license card'];

export const MONASTERY_ROOMS: Record<string, Room> = Object.fromEntries([
  room({
    id: 'monastery.gate', name: 'Monastery Gate', region: 'monastery',
    describe: (s) =>
      s.flags['gate.open']
        ? 'The Monastery gate stands open. Beyond it, north, the cloister. The Gold Marsh is west.'
        : `The Monastery gate. A gatekeeper monk stands beside a stone progress bar. It reads: SESSION STARTING… ${['0%', '33%', '67%'][(s.flags['gate.waiting'] as number) ?? 0]}. The Gold Marsh is west.`,
    exits: { w: 'swamp.gold', n: (s) => (s.flags['gate.open'] ? 'monastery.cloister' : null) },
    items: ['gate'],
    npcs: ['monk'],
    scene: (s) => (s.flags['gate.open'] ? 'monastery.gate-open' : 'monastery.gate'),
    flaskHint: (s) => {
      if (s.flags['gate.open']) return 'The gate is open. Go north.';
      const left = 3 - ((s.flags['gate.waiting'] as number) ?? 0);
      return `Spark sessions cannot be rushed. Wait ${left} more time${left === 1 ? '' : 's'}.`;
    },
    rules: [
      {
        id: 'monastery.wait',
        when: { verb: 'wait', flags: [{ flag: 'gate.waiting', is: 2 }, { flag: 'gate.open', not: true }] },
        then: { text: 'SESSION STARTED. It took four minutes, as is tradition. The gate swings open.', set: { 'gate.open': true, 'gate.waiting': 3 }, points: 10, sfx: 'door' },
      },
      {
        id: 'monastery.wait-2',
        when: { verb: 'wait', flags: [{ flag: 'gate.waiting', is: 1 }] },
        then: { text: 'The bar creeps to 67%. The monk hums.', set: { 'gate.waiting': 2 }, outcome: 'success' },
      },
      {
        id: 'monastery.wait-1',
        when: { verb: 'wait', flags: [{ flag: 'gate.open', not: true }, { flag: 'gate.waiting', not: true }] },
        then: { text: 'The bar creeps to 33%. The monk nods approvingly at your patience.', set: { 'gate.waiting': 1 }, outcome: 'success' },
      },
      {
        id: 'monastery.open-gate',
        when: { verb: 'open', noun: ['gate', 'door', 'monastery gate'], flags: [{ flag: 'gate.open', not: true }] },
        then: { text: 'You push the gate. The monk shakes his head and points at the progress bar. Some things cannot be rushed. Well — they can, with a Starter Pool, but not here.', outcome: 'fail' },
      },
      {
        id: 'monastery.go-north-closed',
        when: { verb: 'go', dir: 'n', flags: [{ flag: 'gate.open', not: true }] },
        then: { text: 'The gate is closed. SESSION STARTING…', outcome: 'fail' },
      },
      {
        id: 'monastery.attack-monk',
        when: { verb: 'attack', noun: ['monk', 'gatekeeper', 'gatekeeper monk'] },
        then: { text: 'You shove the monk. He does not move. He has been standing here since Runtime 1.1.', outcome: 'fail' },
      },
    ],
  }),
  room({
    id: 'monastery.cloister', name: 'Cloister', region: 'monastery',
    describe: () =>
      "The cloister. Monks pace in circles, each murmuring the same phrase: 'spark dot read, spark dot read.' The Abbot stands at the center. The Spark Session Chamber is east; the Library, west; the gate, south.",
    exits: { s: 'monastery.gate', e: 'monastery.spark', w: 'monastery.library' },
    items: ['floor'],
    npcs: ['abbot'],
    scene: () => 'monastery.cloister',
    flaskHint: (s) =>
      s.flags['has.hoodie'] ? 'You have the hoodie. Have you put it on?' :
      s.flags['notebook.fixed'] ? 'Talk to the Abbot. You have earned something.' :
      s.inventory.includes('scroll') ? 'The Spark chamber is east. The scroll goes on the notebook.' :
      'The Library is west. The Librarian lends to anyone with a card. Any card.',
    rules: [
      {
        id: 'monastery.hoodie',
        when: { verb: 'talk', noun: ['abbot', 'father abbot', 'father', 'the abbot'], flags: [{ flag: 'notebook.fixed' }, { flag: 'has.hoodie', not: true }] },
        then: {
          text: "'Brother Pandas' notebook runs,' says the Abbot, 'and the Lakehouse is free of pandas. Kneel.' He drapes the Hoodie of Spark over your shoulders. It is warm, and slightly too big, as is tradition.",
          give: ['hoodie'], set: { 'has.hoodie': true }, points: 15, sfx: 'item',
        },
      },
      {
        id: 'monastery.kneel',
        when: { verb: 'use', noun: ['abbot', 'floor'] },
        then: { text: 'You kneel. The Abbot waits for you to say something. You have nothing. You get up.', outcome: 'fail' },
      },
    ],
  }),
  room({
    id: 'monastery.spark', name: 'Spark Session Chamber', region: 'monastery',
    describe: (s) =>
      s.flags['notebook.fixed']
        ? "The Spark Session Chamber. Brother Pandas' notebook runs quietly. A Delta table glows on the wall. The cloister is west."
        : 'The Spark Session Chamber. Brother Pandas hunches over a notebook. One cell is running. It has been running for a while. On the wall, a Lakehouse groans under the weight of eleven thousand pandas. The cloister is west.',
    exits: { w: 'monastery.cloister' },
    items: ['notebook'],
    npcs: ['pandas'],
    scene: (s) => (s.flags['notebook.fixed'] ? 'monastery.spark-fixed' : 'monastery.spark'),
    flaskHint: (s) =>
      s.flags['notebook.fixed'] ? 'The Abbot, in the cloister, has something for you.' :
      s.inventory.includes('scroll') ? 'Use the scroll on the notebook.' :
      'That cell needs Spark, not pandas. The Library west of the cloister has a scroll about it.',
    rules: [
      {
        id: 'monastery.fix',
        when: { verb: 'use', noun: SCROLL, noun2: NOTEBOOK, has: ['scroll'], flags: [{ flag: 'notebook.fixed', not: true }] },
        then: {
          text: "You unroll the Spark Scroll over the notebook. pd.read_csv becomes spark.read.format('delta'). The cell finishes in four seconds. Brother Pandas weeps. The Lakehouse exhales. Eleven thousand pandas amble off toward the Silver Marsh.",
          set: { 'notebook.fixed': true }, remove: ['scroll'], points: 20, sfx: 'success',
        },
      },
      {
        id: 'monastery.fix-give',
        when: { verb: 'give', noun: SCROLL, noun2: ['pandas', 'brother pandas', 'brother', 'monk pandas'], has: ['scroll'], flags: [{ flag: 'notebook.fixed', not: true }] },
        then: {
          text: "Brother Pandas reads the scroll, sighs, and rewrites the cell: spark.read.format('delta'). It finishes in four seconds. He weeps. The Lakehouse exhales. Eleven thousand pandas amble off toward the Silver Marsh.",
          set: { 'notebook.fixed': true }, remove: ['scroll'], points: 20, pointsKey: 'monastery.fix', sfx: 'success',
        },
      },
      {
        id: 'monastery.fix-noscroll',
        when: { verb: 'use', noun2: NOTEBOOK, flags: [{ flag: 'notebook.fixed', not: true }] },
        then: { text: "You stare at the cell. You don't know Spark. The cell knows you don't know Spark.", outcome: 'fail' },
      },
      {
        id: 'monastery.use-notebook',
        when: { verb: 'use', noun: NOTEBOOK, flags: [{ flag: 'notebook.fixed', not: true }] },
        then: { text: 'You click Run All. The cell was already running. Now it is running twice. Brother Pandas gives you a look.', outcome: 'fail' },
      },
    ],
  }),
  room({
    id: 'monastery.library', name: 'Library of Deprecated Notebooks', region: 'monastery',
    describe: (s) =>
      "The Library of Deprecated Notebooks. Shelves of Runtime 1.1, Runtime 1.2, and a whole wing labeled 'Synapse'. The Librarian guards a single locked case." +
      (s.flags['scroll.lent'] ? ' The case is open and empty.' : ' Inside the case: the Spark Scroll.') +
      ' The cloister is east.',
    exits: { e: 'monastery.cloister' },
    items: ['shelves', 'case'],
    npcs: ['librarian'],
    scene: (s) => (s.flags['scroll.lent'] ? 'monastery.library-open' : 'monastery.library'),
    flaskHint: (s) => (s.flags['scroll.lent'] ? 'Read the scroll. Then east, then east again.' : 'Show the Librarian your license. It is, technically, a card.'),
    rules: [
      {
        id: 'monastery.card',
        when: { verb: 'give', noun: LICENSE, noun2: ['librarian', 'the librarian', 'woman'], has: ['license'], flags: [{ flag: 'scroll.lent', not: true }] },
        then: {
          text: "The Librarian examines your Pro License Card for a long moment. 'Hm. Pro.' She unlocks the case and hands you the Spark Scroll. 'Bring it back by the end of the session.' She keeps the card as collateral.",
          give: ['scroll'], remove: ['license'], set: { 'scroll.lent': true }, points: 10, sfx: 'item',
        },
      },
      {
        id: 'monastery.card-use',
        when: { verb: 'use', noun: LICENSE, has: ['license'], flags: [{ flag: 'scroll.lent', not: true }] },
        then: {
          text: "You present your Pro License Card. The Librarian examines it for a long moment. 'Hm. Pro.' She unlocks the case and hands you the Spark Scroll. 'Bring it back by the end of the session.' She keeps the card as collateral.",
          give: ['scroll'], remove: ['license'], set: { 'scroll.lent': true }, points: 10, pointsKey: 'monastery.card', sfx: 'item',
        },
      },
      {
        id: 'monastery.get-scroll-locked',
        when: { verb: 'get', noun: SCROLL, flags: [{ flag: 'scroll.lent', not: true }] },
        then: { text: 'The case is locked. The Librarian raises one eyebrow, which is somehow also locked.', outcome: 'fail' },
      },
      {
        id: 'monastery.open-case',
        when: { verb: 'open', noun: ['case', 'locked case', 'glass case'], flags: [{ flag: 'scroll.lent', not: true }] },
        then: { text: 'Locked. A small sign reads: LIBRARY CARD REQUIRED. ANY CARD.', outcome: 'fail' },
      },
      {
        id: 'monastery.read-shelves',
        when: { verb: 'read', noun: ['shelves', 'shelf', 'books', 'notebooks', 'synapse'] },
        then: { text: 'You open a Synapse notebook. It opens a Spark pool. The Spark pool opens a bill. You close all three.', outcome: 'snark' },
      },
    ],
  }),
]);
