import type { GameState, HeardLine } from '../engine/types';
import type { PhraseRule, Room, RuleThen } from './types';
import { setting } from '../engine/governance';
import { knowsTopic, talkTo } from '../engine/builtins';
import { MALAPROPS } from './voice';
import { curseOf } from './curses';
import { BRICKS_TEXT, notebookBlockerText, notebookBlockers } from './sacristy';

const room = (r: Room): [string, Room] => [r.id, r];

/**
 * A hint never names a command the game will then refuse (review E2). While a book keeps Brother Pandas from a
 * Notebook and his is still broken, the hint says so and names the book, instead of "use the scroll on the notebook".
 */
const noNotebookYet = (s: GameState): boolean => notebookBlockers(s).length > 0 && !s.flags['notebook.fixed'];
const noNotebookClause = (s: GameState): string => `No Notebook until ${notebookBlockerText(s)} back on; the Sacristy, up the stair from the Cloister, has it.`;
/** The same rule for the Keep's back gate (spec2 §3.4): the Ledger's book, by name, and the long way round. */
const XMLA_CLAUSE = "The back gate into the Keep is a wall until XMLA endpoint: Read Write is back on; the Capacity Ledger, in the Sacristy up from the Cloister, has it. West of the gate, through the Gold Marsh, is the long way round.";

const SCROLL = ['scroll', 'spark scroll', 'pyspark scroll'];
const NOTEBOOK = ['notebook', 'cell', 'brother pandas notebook', 'pandas notebook', "pandas' notebook"];
const LICENSE = ['license', 'card', 'license card', 'pro license', 'pro', 'pro license card'];
const KPI = ['kpi', 'laminated kpi'];
const MONK = ['monk', 'gatekeeper', 'gatekeeper monk'];
const ABBOT = ['abbot', 'father abbot', 'father', 'the abbot'];
const PANDAS = ['pandas', 'brother pandas', 'brother', 'monk pandas'];
const LIBRARIAN = ['librarian', 'the librarian', 'woman'];

/** Users can create Fabric items is off (spec2 §3.3): the scroll is right, the tenant says no, and the golden path waits. */
const NO_NOTEBOOK = 'Notebook creation is disabled for your tenant. Brother Pandas creates a Power BI report instead. It has one card. It says 1.';
const NOT_FIXED = { flag: 'notebook.fixed', not: true };

/**
 * The Abbot's errand (spec2 §5): once the gate is open, his next talk ADDS this to whatever he was going to say (the
 * hoodie beat, when it applies, wins first; the errand comes on the talk after). `gov.errand` marks it asked; the
 * Sacristy pays the +10 on the flip (sacristy.ts flip()), or he pays it himself when the book is already off.
 */
const ERRAND = '"Also. Someone published the prophecy to web. The whole internet can read it. Go up to the Sacristy and turn it off. I would, but I am a monk, not an admin. Those are different vows."';

/** The same line again, in a row (the voice sweep, Task F7; lake.ts has the same): read off `recent`, so no flag moves. */
const again = (s: GameState, first: string, second: string): string => ((s.recent?.n ?? 1) >= 2 ? second : first);
/** A topic line nobody says to (Blank): the curse gets talkTo()'s look-through instead, as the builtin would. */
const unlessBlank = (id: string, line: (s: GameState) => string): RuleThen['text'] =>
  (s, world, cmd) => (curseOf(s) === 'blank' ? talkTo(s, world, world.npcs[id]!, cmd?.noun2) : line(s));

/**
 * The Monastery's bare lines (Task F7). NOT registered in world/index.ts by this sweep (the sweep contract forbids it):
 * until the lead adds it right after VILLAGE_PHRASES, `chant` and `shh` still play through each room's catchAll below;
 * `count` and `eat bamboo` wait for the registration, since the global egg.count / egg.eat phrases hear them first.
 */
export const MONASTERY_PHRASES: PhraseRule[] = [
  { id: 'monastery.count', room: 'monastery.gate', test: /^count( to (three|3|ten|10))?$/, text: 'One. Two. The session hears you counting and restarts.' },
  { id: 'monastery.chant', room: 'monastery.cloister', test: /^(chant|join (the )?(monks|loop|circle)|spark dot read)$/, text: (s) => again(s, "You chant 'spark dot read' with the monks. You get the rhythm wrong. Three monks fall out of the loop. The Abbot restarts them.", 'You chant it again. You get it wrong again. This time the Abbot restarts YOU.') },
  { id: 'monastery.eat-bamboo', room: 'monastery.spark', test: /^(eat|bite|chew)( the)? (bamboo|shoot|lunch)$/, text: "You eat Brother Pandas' lunch. It is a dependency. Something downstream fails." },
  { id: 'monastery.shh', room: 'monastery.library', test: /^(shh+|shush|quiet|be quiet)$/, text: (s) => again(s, "'Shh,' she says back, faster. She has been waiting.", 'You shush her again. She shushes back twice, once per offense. She keeps a tally.') },
];
/** A room's catchAll: the line as a Monastery phrase, for this room only (null lets the builtins have it). */
const monasteryLine = (s: GameState, { command }: HeardLine): { then: RuleThen; id: string } | null => {
  const line = command.toLowerCase().replace(/[^\w\s']/g, ' ').replace(/\s+/g, ' ').trim();
  const p = MONASTERY_PHRASES.find((r) => r.room === s.room && r.test.test(line));
  return p ? { id: p.id, then: { text: p.text, outcome: 'snark' } } : null;
};

export const MONASTERY_ROOMS: Record<string, Room> = Object.fromEntries([
  room({
    id: 'monastery.gate', name: 'Monastery Gate', region: 'monastery',
    enterQuip: () => 'A gate. A Spark session is starting. It says so. It has said so for a while.',
    // The Keep's back gate is the XMLA endpoint from this side too (spec2 §3.4): Off, and it is a wall both ways.
    describe: (s) =>
      s.flags['gate.open']
        ? `The Monastery gate stands open. Beyond it, north, the cloister. The Gold Marsh is west. South, the Keep's back gate${setting(s, 'xmla') ? ': the Model View opens onto the Monastery — every model needs its engineers.' : ', which is a wall now. XMLA endpoint: Off.'}`
        : `The Monastery gate. A gatekeeper monk stands beside a stone progress bar. It reads: SESSION STARTING… ${['0%', '33%', '67%'][(s.flags['gate.waiting'] as number) ?? 0]}. The Gold Marsh is west. South, the Keep's back gate${setting(s, 'xmla') ? '' : ', which is a wall now. XMLA endpoint: Off'}.`,
    exits: { w: 'swamp.gold', s: (s) => (setting(s, 'xmla') ? 'fortress.model' : null), n: (s) => (s.flags['gate.open'] ? 'monastery.cloister' : null) },
    items: ['gate', 'pamphlet', 'xmla-bricks'], // the bricks after the gate: 'gate' / 'back gate' stay the progress-bar gate
    npcs: ['monk'],
    scene: (s) => (s.flags['gate.open'] ? 'monastery.gate-open' : 'monastery.gate'),
    flaskHint: (s) => {
      if (s.flags['gate.open']) return s.flags['trial.hoodie']
        ? (setting(s, 'xmla')
          ? 'Go south, back through the Keep. The hoodie is on. The Monastery has nothing left to teach you, and it tried.'
          : XMLA_CLAUSE)
        : 'Go north. The gate is open. Nobody knows for how long.';
      const waited = (s.flags['gate.waiting'] as number) || 0;
      if (waited === 0) return 'The session is starting. Wait. Then wait again. Then once more — three waits opens the gate.';
      if (waited === 1) return 'Wait. Then wait once more. You are a third of the way to a Spark session, which is further than most.';
      return 'Wait. One more. It is at 67%. It has been going to 100% the whole time; it just needs you to stop typing other things.';
    },
    // The aside (Task B4): the progress bar moves on the one thing you have not typed. No route is named, so XMLA off changes nothing here.
    nudge: {
      oblique: (s) => {
        if (s.flags['gate.open']) return s.flags['trial.hoodie']
          ? 'The monks are finished with you, hoodie and all. Everything left to do is on the far side of a Keep, and the Keep remembers your smell.'
          : "The gate's open and the session is running, which means it's billing. Everything past this point costs by the second, so stop admiring the gate.";
        const waited = (s.flags['gate.waiting'] as number) || 0;
        if (waited === 0) return "The session's starting. It's been starting. Nothing you type makes a progress bar move except the thing you haven't typed, which is nothing.";
        if (waited === 1) return "33%. It's a third of the way and so are you. The trick is the same trick, twice more.";
        return "67%. One more of whatever you did last time and the monk will hum. He hums at 100%. It's the only time.";
      },
      plainer: (s) => (s.flags['gate.open'] ? '' : "It's a progress bar. It moves when you stop typing at it. Three times."),
    },
    catchAll: monasteryLine,
    rules: [
      {
        id: 'monastery.monk-session',
        when: { verb: 'talk', noun: MONK, noun2: ['session', 'the session', 'spark session', 'progress bar', 'bar'] },
        then: { text: unlessBlank('monk', () => 'The monk points at the bar. Then at the sky. Then at the bar. It is a lineage view.'), outcome: 'success' },
      },
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
      // The harmless grind (Task F7): waiting on a session that already started. Once with delight, then the drama.
      {
        id: 'monastery.wait-open',
        when: { verb: 'wait', flags: [{ flag: 'gate.open' }, { flag: 'gate.idled', not: true }] },
        then: { text: "You wait some more. The session's up and billing by the second. You could do this all day!", set: { 'gate.idled': true }, outcome: 'snark' },
      },
      {
        id: 'monastery.wait-open-again',
        when: { verb: 'wait', flags: [{ flag: 'gate.open' }] },
        then: { text: "The drama grips you, but the bar hasn't moved. It's at 100%. The meter, however, has.", outcome: 'snark' },
      },
      {
        // Shut, the gate is a gate (gates.ts): every obvious verb says the session is starting, and the old push line
        // rotates in its pool. Open, it is just open.
        id: 'monastery.open-gate-open',
        when: { verb: 'open', noun: ['gate', 'door', 'monastery gate'], flags: [{ flag: 'gate.open' }] },
        then: { text: "Yeah, totally! Except it's already open, you moron. Try: north.", outcome: 'fail' },
      },
      {
        id: 'monastery.go-north-closed',
        when: { verb: 'go', dir: 'n', flags: [{ flag: 'gate.open', not: true }] },
        then: { text: 'The gate is closed. SESSION STARTING…', outcome: 'fail' },
      },
      {
        // The Keep's back gate is its own thing here (round 2, M4 nit): the builtin would suffix-match 'back gate' to the
        // progress-bar gate. Open, it is the endpoint; off, the bricks.
        id: 'monastery.look-back-gate',
        when: { verb: 'look', noun: ['back gate', 'keep gate', "keep's back gate", 'keeps back gate', 'south gate', 'the back gate', 'xmla endpoint', 'endpoint'] },
        then: { text: (s) => (setting(s, 'xmla')
          ? "The Keep's back gate, south: the XMLA endpoint, Read Write. Through it, the Model View, Sir Cardinality, and one eyebrow, already raised."
          : BRICKS_TEXT.gate), outcome: 'success' },
      },
      {
        // The other side of fortress.north-xmla: only on the explicit `false` flag, so at default `s` walks through.
        id: 'monastery.south-xmla',
        when: { verb: 'go', dir: 's', flags: [{ flag: 'ts.xmla', is: false }] },
        then: { text: 'The back gate is an XMLA endpoint. Your capacity admin set it to Off. From this side it is a wall, and the monks are using it to lean on.', outcome: 'fail' },
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
      "The cloister. Monks pace in circles, each murmuring the same phrase: 'spark dot read, spark dot read.' The Abbot stands at the center. The Spark Session Chamber is east; the Library, west; the gate, south. A spiral stair climbs, up, to the Sacristy.",
    exits: { s: 'monastery.gate', e: 'monastery.spark', w: 'monastery.library', u: 'monastery.sacristy' },
    items: ['floor', 'kpi', 'stair'],
    npcs: ['abbot'],
    scene: () => 'monastery.cloister',
    catchAll: monasteryLine,
    // With XMLA off, "south through the Keep" is a wall, so the hint names the book and the long way (review E2 M2);
    // with no Notebook to be had, it names that book instead of the scroll command the chamber would refuse.
    flaskHint: (s) =>
      s.flags['trial.hoodie'] ? (setting(s, 'xmla')
        ? (s.flags['trial.key']
          ? 'Go south, back through the Keep, and on to the Peaks. You look like an Engineer. Try to act like one for four more rooms.'
          : 'Go south, back through the Keep to the village, then south to the OneLake. The key is next.')
        : `${XMLA_CLAUSE} ${s.flags['trial.key'] ? 'Either way, the Peaks are next.' : 'Either way, the OneLake and its key are next.'}`) :
      s.flags['has.hoodie'] ? 'Wear the hoodie. You earned it. Technically.' :
      s.flags['notebook.fixed'] ? 'Talk to the Abbot. You have earned something, and it has a hood.' :
      noNotebookYet(s) ? `${noNotebookClause(s)} ${s.inventory.includes('scroll') ? 'Then the chamber, east.' : 'Then the Library, west, for the scroll.'}` :
      s.inventory.includes('scroll') ? 'Go east to the Spark chamber. Use the scroll on the notebook.' :
      'Go west to the Library. Give the Librarian your license. It is, technically, a card.',
    nudge: {
      oblique: (s) =>
        s.flags['trial.hoodie'] ? "You look like an Engineer now, and the monks have run out of things to teach you. What's left is outside, and it's mostly walking." :
        s.flags['has.hoodie'] ? "You're carrying a hoodie. The prophecy said look like an Engineer, and nobody has ever looked like anything by carrying it." :
        s.flags['notebook.fixed'] ? "Brother Pandas is crying happy tears and the Abbot saw the whole thing. He's holding something at arm's length, and it's for you." :
        noNotebookYet(s) ? "The scroll is right, the cell is ready, and a book upstairs with a switch for a spine says no. An admin wrote that book. You're the admin." :
        s.inventory.includes('scroll') ? "You've got the scroll. The cell that needs it is running, east, and has been since Runtime 1.1. Nobody has told it yet." :
        "Brother Pandas is stuck on a cell, and the fix is under glass in the Library, west. The Librarian takes collateral, and you've been carrying some since the cottage.",
      plainer: (s) =>
        s.flags['has.hoodie'] && !s.flags['trial.hoodie'] ? "It's a hoodie. Hoodies go on. Then you look like an Engineer, which is the entire point of the garment." :
        s.flags['notebook.fixed'] && !s.flags['has.hoodie'] ? "The Abbot has a hoodie with your name on it. He wants a word first. One word; he's a monk." :
        '',
    },
    rules: [
      // (Blank) gets nothing handed over (curses.ts, fix round 1): no hoodie and no errand until there is a you.
      {
        id: 'monastery.abbot-blank',
        when: { verb: 'talk', noun: ABBOT, flags: [{ flag: 'curse.blank' }] },
        then: { text: 'The Abbot looks straight through you and blesses the wall behind you. Whatever he has for you, he keeps until there is a you.', outcome: 'fail' },
      },
      {
        id: 'monastery.abbot-pandas',
        when: { verb: 'talk', noun: ABBOT, noun2: ['pandas', 'brother pandas', 'brother'] },
        then: { text: "'Brother Pandas,' says the Abbot, 'was a Data Scientist. Then he was a Data Engineer. Then he was a Pandas. It happens gradually and then all at once.'", outcome: 'success' },
      },
      {
        id: 'monastery.hoodie',
        when: { verb: 'talk', noun: ['abbot', 'father abbot', 'father', 'the abbot'], flags: [{ flag: 'notebook.fixed' }, { flag: 'has.hoodie', not: true }] },
        then: {
          text: "'Brother Pandas' notebook runs,' says the Abbot, 'and the Lakehouse is free of pandas. Kneel.' He drapes the Hoodie of Spark over your shoulders. It is warm, and slightly too big, as is tradition.",
          give: ['hoodie'], set: { 'has.hoodie': true }, points: 15, sfx: 'item',
        },
      },
      {
        // The errand, with the book already off (spec2 §5, either order): his line, the errand, and the +10 paid here.
        // `ts.publishToWeb` is checked as the explicit false: at default the book is on and the flip pays instead.
        // The talk counter (finish()) still counts this talk; talkTo() gives the line the builtin would have.
        id: 'monastery.errand-done',
        when: { verb: 'talk', noun: ABBOT, flags: [{ flag: 'gate.open' }, { flag: 'gov.errand', not: true }, { flag: 'ts.publishToWeb', is: false }] },
        then: {
          text: (s, world, cmd) => `${talkTo(s, world, world.npcs['abbot']!, cmd?.noun2)}\n${ERRAND}\n"…and it is already off. You are ahead of me. +10."`,
          set: { 'gov.errand': true, 'gov.errandDone': true }, bonus: 10, pointsKey: 'gov.abbot', sfx: 'bonus', outcome: 'success',
        },
      },
      {
        id: 'monastery.errand',
        when: { verb: 'talk', noun: ABBOT, flags: [{ flag: 'gate.open' }, { flag: 'gov.errand', not: true }] },
        then: { text: (s, world, cmd) => `${talkTo(s, world, world.npcs['abbot']!, cmd?.noun2)}\n${ERRAND}`, set: { 'gov.errand': true }, outcome: 'success' },
      },
      {
        // A topic he knows, asked twice in a row, gets his second line (Task F7); the rest is talkTo(), as the builtin would.
        id: 'monastery.ask-abbot',
        when: { verb: 'talk', noun: ABBOT, noun2Matches: /./ },
        then: {
          text: (s, world, cmd) => ((s.recent?.n ?? 1) >= 2 && knowsTopic(world.npcs['abbot']!, cmd?.noun2 ?? '')
            ? '"Same question, same answer," says the Abbot. "That is not faith. That is a retry policy."'
            : talkTo(s, world, world.npcs['abbot']!, cmd?.noun2)),
          outcome: 'success',
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
    catchAll: monasteryLine,
    flaskHint: (s) =>
      s.flags['has.hoodie'] ? (setting(s, 'xmla') ? 'Go west, then south. Nothing left in here but a working notebook, which is unsettling.'
        : 'Go west. The Cloister has a stair up to the Capacity Ledger, and a gate south that is a wall until XMLA endpoint: Read Write is back on. Nothing left in here but a working notebook, which is unsettling.') :
      s.flags['notebook.fixed'] ? 'Go west and talk to the Abbot. He has something for you, and it has a hood.' :
      // The book, not the command the chamber would refuse (review E2 M2).
      noNotebookYet(s) ? `${noNotebookClause(s)} ${s.inventory.includes('scroll') ? 'Keep the scroll; it is right, and the tenant is wrong.' : 'The scroll is west, then west again, in the Library; it keeps.'}` :
      s.inventory.includes('scroll') ? 'Use the scroll on the notebook.' :
      'Go west, then west again, to the Library. That cell needs Spark, not pandas, and the scroll about it is locked in a case.',
    // The aside never names the scroll, the notebook or the verb (Task B4); with no Notebook to be had it points upstairs, like the flask hint.
    nudge: {
      oblique: (s) =>
        s.flags['has.hoodie'] ? "Nothing left in here but a working notebook, which is the least Fabric thing you've seen all day. The rest of the quest is west, and then it's walking." :
        s.flags['notebook.fixed'] ? 'The cell runs in four seconds now and Brother Pandas has nothing left to cry about. The man who hands out hoodies is in the cloister, and he watched the whole thing.' :
        noNotebookYet(s) ? "The cell is ready and you're carrying the fix, rolled up, and a book upstairs with a switch for a spine says no. Somebody has to go and be an admin about it." :
        s.inventory.includes('scroll') ? "Somebody taught that cell pandas and it has been running ever since. You're carrying the thing that un-teaches it, rolled up, and it isn't doing much good in your pocket." :
        'Somebody taught that cell pandas and it has been running ever since. The cure is under glass in the Library, west, and the Librarian charges collateral.',
      plainer: (s) =>
        s.flags['has.hoodie'] || s.flags['notebook.fixed'] || noNotebookYet(s) ? '' :
        s.inventory.includes('scroll') ? 'The cell wants Spark. The scroll says Spark. You see where this is going.' :
        "The scroll that fixes this cell is in the Library, two rooms west, in a case. Your Pro license opens the case; the Librarian won't say so, but she'll take it.",
    },
    rules: [
      {
        // His derailment (Task F7). With a book upstairs keeping him from a Notebook, talkTo() answers instead, so the
        // switch-naming line (review E2 I1) still reaches you.
        id: 'monastery.pandas-spark',
        when: { verb: 'talk', noun: PANDAS, noun2: ['spark', 'pyspark', 'the session', 'session', 'notebook'] },
        then: {
          text: (s, world, cmd) => (noNotebookYet(s) || curseOf(s) === 'blank' ? talkTo(s, world, world.npcs['pandas']!, cmd?.noun2)
            : again(s, "'Spark,' says Brother Pandas. 'It's not broken, it's deprecated.' 'It's broken.' 'Deprecated.' 'Broken.' (You see where this is going.)",
              "'Deprecated,' says Brother Pandas, before you finish asking. The notebook prints 'Broken.' It has picked a side.")),
          outcome: 'success',
        },
      },
      // The tenant (ts.fabricItems) or the capacity (ts.workloads) says no Notebooks (spec2 §3.3–3.4): these sit ahead of the
      // scored fix rules and match only the explicit `false` flag, so at default they never fire. No points, no flag.
      { id: 'monastery.fix-disabled', when: { verb: 'use', noun: SCROLL, noun2: NOTEBOOK, has: ['scroll'], flags: [NOT_FIXED, { flag: 'ts.fabricItems', is: false }] }, then: { text: NO_NOTEBOOK, outcome: 'fail' } },
      { id: 'monastery.fix-delegated', when: { verb: 'use', noun: SCROLL, noun2: NOTEBOOK, has: ['scroll'], flags: [NOT_FIXED, { flag: 'ts.workloads', is: false }] }, then: { text: `${NO_NOTEBOOK} (Delegated. Also off.)`, outcome: 'fail' } },
      { id: 'monastery.fix-give-disabled', when: { verb: 'give', noun: SCROLL, noun2: PANDAS, has: ['scroll'], flags: [NOT_FIXED, { flag: 'ts.fabricItems', is: false }] }, then: { text: NO_NOTEBOOK, outcome: 'fail' } },
      { id: 'monastery.fix-give-delegated', when: { verb: 'give', noun: SCROLL, noun2: PANDAS, has: ['scroll'], flags: [NOT_FIXED, { flag: 'ts.workloads', is: false }] }, then: { text: `${NO_NOTEBOOK} (Delegated. Also off.)`, outcome: 'fail' } },
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
        // Unfixed, the notebook is a gate (gates.ts) and this line rotates in its pool; it still answers `use cell` and the like.
        id: 'monastery.use-notebook',
        when: { verb: 'use', noun: NOTEBOOK, flags: [{ flag: 'notebook.fixed', not: true }] },
        then: { text: 'You click Run All. The cell was already running. Now it is running twice. Brother Pandas gives you a look.', outcome: 'fail' },
      },
      {
        id: 'monastery.use-notebook-fixed',
        when: { verb: 'use', noun: NOTEBOOK },
        then: { text: 'You click Run All. Four seconds. Brother Pandas mouths "four seconds" along with it.', outcome: 'fail' },
      },
    ],
  }),
  room({
    id: 'monastery.library', name: 'Library of Deprecated Notebooks', region: 'monastery',
    enterQuip: () => "Shelves of deprecated notebooks. One of them is yours. Don't look.",
    describe: (s) =>
      "The Library of Deprecated Notebooks. Shelves of Runtime 1.1, Runtime 1.2, and a whole wing labeled 'Synapse'. A bookmark from Encarta holds someone's place in Runtime 1.1. The Librarian guards a single locked case." +
      (s.flags['scroll.lent'] ? ' The case is open and empty.' : ' Inside the case: the Spark Scroll.') +
      ' The cloister is east.',
    exits: { e: 'monastery.cloister' },
    items: ['shelves', 'case', 'synapse-bookmark'],
    npcs: ['librarian'],
    scene: (s) => (s.flags['scroll.lent'] ? 'monastery.library-open' : 'monastery.library'),
    catchAll: monasteryLine,
    flaskHint: (s) =>
      !s.flags['scroll.lent'] ? 'Give the Librarian your license. It is, technically, a card.' :
      s.inventory.includes('scroll') ? (notebookBlockers(s).length ? `Read the scroll. ${noNotebookClause(s)}` : 'Read the scroll. Then go east, and east again, and use it on the notebook.') :
      'Go east. Nothing else in here is supported.',
    nudge: {
      oblique: (s) =>
        !s.flags['scroll.lent'] ? "The Librarian lends to members. You've been carrying your membership since the cottage, and it's the only thing in your pocket that says Pro." :
        s.inventory.includes('scroll') ? "You've got the scroll. It's a two-line fix for a cell east of here that has been running since Runtime 1.1, and it reads better than it sounds." :
        'Nothing in here is supported anymore, and the Librarian would like you to stop browsing like it is.',
      plainer: (s) => (!s.flags['scroll.lent'] ? "She wants collateral. The thing in your pocket that says Pro will do; she'll sneer, but it'll do." : ''),
    },
    rules: [
      {
        id: 'monastery.librarian-synapse',
        when: { verb: 'talk', noun: LIBRARIAN, noun2: ['synapse', 'the synapse wing', 'synapse wing', 'wing', 'runtime'] },
        then: { text: unlessBlank('librarian', () => "'Synapse,' she says, and looks at the roped-off wing the way you look at a photo of a house you sold. 'Still supported.' She does not say by whom."), outcome: 'success' },
      },
      {
        // Asked twice in a row (Task F7): her "Shh." gets a second beat, and a topic she knows gets a second line.
        id: 'monastery.ask-librarian',
        when: { verb: 'talk', noun: LIBRARIAN, noun2Matches: /./ },
        then: {
          text: (s, world, cmd) => {
            const librarian = world.npcs['librarian']!;
            if ((s.recent?.n ?? 1) < 2 || curseOf(s) === 'blank') return talkTo(s, world, librarian, cmd?.noun2);
            return knowsTopic(librarian, cmd?.noun2 ?? '')
              ? '"I answered that," she says. "The answer is in the stacks now. Deprecated."'
              : '"Shh," she says again, and writes your name down. In pencil. For now.';
          },
          outcome: 'success',
        },
      },
      {
        id: 'monastery.say-dax-library',
        when: { verb: 'say', noun: ['dax'] },
        then: { text: `'No DAX in the Library,' says the Librarian. 'Shh.' You have been ${MALAPROPS.daxxed} and shushed.`, outcome: 'snark' },
      },
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
        // Locked, the case is the Library gate (gates.ts) and the old sign line rotates in its pool. Lent: empty.
        id: 'monastery.open-case-lent',
        when: { verb: 'open', noun: ['case', 'locked case', 'glass case'], flags: [{ flag: 'scroll.lent' }] },
        then: { text: 'The case is open and empty. You open it wider. The Librarian writes something down.', outcome: 'fail' },
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
