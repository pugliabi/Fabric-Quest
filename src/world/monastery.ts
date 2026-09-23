import type { Room } from './types';

const room = (r: Room): [string, Room] => [r.id, r];

const SCROLL = ['scroll', 'spark scroll', 'pyspark scroll'];
const NOTEBOOK = ['notebook', 'cell', 'brother pandas notebook', 'pandas notebook', "pandas' notebook"];
const LICENSE = ['license', 'card', 'license card', 'pro license', 'pro', 'pro license card'];
const KPI = ['kpi', 'laminated kpi'];
const MONK = ['monk', 'gatekeeper', 'gatekeeper monk'];
const ABBOT = ['abbot', 'father abbot', 'father', 'the abbot'];
const PANDAS = ['pandas', 'brother pandas', 'brother', 'monk pandas'];
const LIBRARIAN = ['librarian', 'the librarian', 'woman'];

export const MONASTERY_ROOMS: Record<string, Room> = Object.fromEntries([
  room({
    id: 'monastery.gate', name: 'Monastery Gate', region: 'monastery',
    enterQuip: () => 'A gate. A Spark session is starting. It says so. It has said so for a while.',
    describe: (s) =>
      s.flags['gate.open']
        ? "The Monastery gate stands open. Beyond it, north, the cloister. The Gold Marsh is west. South, the Keep's back gate: the Model View opens onto the Monastery — every model needs its engineers."
        : `The Monastery gate. A gatekeeper monk stands beside a stone progress bar. It reads: SESSION STARTING… ${['0%', '33%', '67%'][(s.flags['gate.waiting'] as number) ?? 0]}. The Gold Marsh is west. South, the Keep's back gate.`,
    exits: { w: 'swamp.gold', s: 'fortress.model', n: (s) => (s.flags['gate.open'] ? 'monastery.cloister' : null) },
    items: ['gate', 'pamphlet'],
    npcs: ['monk'],
    scene: (s) => (s.flags['gate.open'] ? 'monastery.gate-open' : 'monastery.gate'),
    flaskHint: (s) => {
      if (s.flags['gate.open']) return s.flags['trial.hoodie']
        ? 'Go south, back through the Keep. The hoodie is on. The Monastery has nothing left to teach you, and it tried.'
        : 'Go north. The gate is open. Nobody knows for how long.';
      const waited = (s.flags['gate.waiting'] as number) || 0;
      if (waited === 0) return 'The session is starting. Wait. Then wait again. Then once more — three waits opens the gate.';
      if (waited === 1) return 'Wait. Then wait once more. You are a third of the way to a Spark session, which is further than most.';
      return 'Wait. One more. It is at 67%. It has been going to 100% the whole time; it just needs you to stop typing other things.';
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
        id: 'monastery.knock',
        when: { verb: 'use', verbWord: ['knock'], flags: [{ flag: 'gate.open', not: true }] },
        then: { text: 'You knock. The gate says: Session starting. Please wait. It has always said that. Knocking does not count as waiting.', outcome: 'fail' },
      },
      {
        id: 'monastery.knock-open',
        when: { verb: 'use', verbWord: ['knock'], flags: [{ flag: 'gate.open' }] },
        then: { text: 'You knock on an open gate. The monk watches you do it. He has seen a lot of retry policies. Yours is the saddest.', outcome: 'fail' },
      },
      {
        id: 'monastery.give-pamphlet',
        when: { verb: 'give', noun: ['pamphlet', 'leaflet', 'brochure', 'spark pamphlet'], noun2: MONK, has: ['pamphlet'] },
        then: { text: 'The monk glances at the pamphlet and hands it back. He already has one. He wrote it. Chapter 3 is still starting.', outcome: 'snark' },
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
    enterQuip: () => 'Monks pace in a circle chanting spark dot read. You have entered a loop.',
    describe: () =>
      "The cloister. Monks pace in circles, each murmuring the same phrase: 'spark dot read, spark dot read.' The Abbot stands at the center. The Spark Session Chamber is east; the Library, west; the gate, south.",
    exits: { s: 'monastery.gate', e: 'monastery.spark', w: 'monastery.library' },
    items: ['floor', 'kpi'],
    npcs: ['abbot'],
    scene: () => 'monastery.cloister',
    flaskHint: (s) =>
      s.flags['trial.hoodie'] ? (s.flags['trial.key']
        ? 'Go south, back through the Keep, and on to the Peaks. You look like an Engineer. Try to act like one for four more rooms.'
        : 'Go south, back through the Keep to the village, then south to the OneLake. The key is next.') :
      s.flags['has.hoodie'] ? 'Wear the hoodie. You earned it. Technically.' :
      s.flags['notebook.fixed'] ? 'Talk to the Abbot. You have earned something, and it has a hood.' :
      s.inventory.includes('scroll') ? 'Go east to the Spark chamber. Use the scroll on the notebook.' :
      'Go west to the Library. Give the Librarian your license. It is, technically, a card.',
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
        id: 'monastery.give-kpi-abbot',
        when: { verb: 'give', noun: KPI, noun2: ABBOT, has: ['kpi'] },
        then: { text: "The Abbot looks at (Blank) for a long time. 'Yes,' he says. 'This is the realm.' He hands it back. Some things are meant to be carried.", outcome: 'snark' },
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
    enterQuip: () => 'The Spark Session Chamber. Warm. Humming. Billed.',
    describe: (s) =>
      s.flags['notebook.fixed']
        ? "The Spark Session Chamber. Brother Pandas' notebook runs quietly. A Delta table glows on the wall. The cloister is west."
        : 'The Spark Session Chamber. Brother Pandas hunches over a notebook. One cell is running. It has been running for a while. On the wall, a Lakehouse groans under the weight of eleven thousand pandas. The cloister is west.',
    exits: { w: 'monastery.cloister' },
    items: ['notebook', 'bamboo'],
    npcs: ['pandas'],
    scene: (s) => (s.flags['notebook.fixed'] ? 'monastery.spark-fixed' : 'monastery.spark'),
    flaskHint: (s) =>
      s.flags['has.hoodie'] ? 'Go west, then south. Nothing left in here but a working notebook, which is unsettling.' :
      s.flags['notebook.fixed'] ? 'Go west and talk to the Abbot. He has something for you, and it has a hood.' :
      s.inventory.includes('scroll') ? 'Use the scroll on the notebook.' :
      'Go west, then west again, to the Library. That cell needs Spark, not pandas, and the scroll about it is locked in a case.',
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
        // Before fix-noscroll, which would otherwise answer any "use X on notebook".
        id: 'monastery.kpi-notebook',
        when: { verb: 'use', noun: KPI, noun2: NOTEBOOK, has: ['kpi'] },
        then: { text: 'You hold the KPI up to the notebook. The notebook prints (Blank). Brother Pandas nods; he has seen worse. He has written worse.', outcome: 'snark' },
      },
      {
        id: 'monastery.give-bamboo',
        when: { verb: 'give', noun: ['bamboo', 'bamboo shoot', 'shoot', 'lunch'], noun2: PANDAS, has: ['bamboo'] },
        then: { text: (s) => (s.flags['notebook.fixed']
          ? 'Brother Pandas eats the bamboo while his notebook finishes in four seconds. He has never had time for lunch before. He does not know what to do with it.'
          : 'Brother Pandas eats the bamboo. The cell is still running. Nothing is faster, but he is happier, and that is not nothing. It is close to nothing.'), remove: ['bamboo'], outcome: 'snark' },
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
    enterQuip: () => "Shelves of deprecated notebooks. One of them is yours. Don't look.",
    describe: (s) =>
      "The Library of Deprecated Notebooks. Shelves of Runtime 1.1, Runtime 1.2, and a whole wing labeled 'Synapse'. The Librarian guards a single locked case." +
      (s.flags['scroll.lent'] ? ' The case is open and empty.' : ' Inside the case: the Spark Scroll.') +
      ' The cloister is east.',
    exits: { e: 'monastery.cloister' },
    items: ['shelves', 'case', 'synapse-bookmark'],
    npcs: ['librarian'],
    scene: (s) => (s.flags['scroll.lent'] ? 'monastery.library-open' : 'monastery.library'),
    flaskHint: (s) =>
      !s.flags['scroll.lent'] ? 'Give the Librarian your license. It is, technically, a card.' :
      s.inventory.includes('scroll') ? 'Read the scroll. Then go east, and east again, and use it on the notebook.' :
      'Go east. Nothing else in here is supported.',
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
        id: 'monastery.give-bookmark',
        when: { verb: 'give', noun: ['bookmark', 'synapse bookmark'], noun2: LIBRARIAN, has: ['synapse-bookmark'] },
        then: { text: "'From the Synapse wing?' She files it under 'legacy'. Gently. The way you would close the eyes of a notebook.", remove: ['synapse-bookmark'], outcome: 'snark' },
      },
      {
        id: 'monastery.read-shelves',
        when: { verb: 'read', noun: ['shelves', 'shelf', 'books', 'notebooks', 'synapse'] },
        then: { text: 'You open a Synapse notebook. It opens a Spark pool. The Spark pool opens a bill. You close all three.', outcome: 'snark' },
      },
    ],
  }),
]);
