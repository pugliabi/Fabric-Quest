import type { Npc } from './types';

const npc = (n: Npc): [string, Npc] => [n.id, n];

/** Sir Cardinality's advice, in order (spec §12.1). */
export const CARDINALITY_ADVICE = [
  '"One. To. Many."',
  '"Star schema. Not snowflake. Not… whatever that is."',
  '"The dragon will ask you a question. The answer is two words. I have said them already."',
];

export const NPCS: Record<string, Npc> = Object.fromEntries([
  npc({
    id: 'jeff', name: 'Jeff from Finance', aliases: ['jeff', 'finance', 'man', 'jeff from finance'],
    // Once pacified he stays by the well instead of following you into the fields.
    hiddenWhen: (s) => !!s.flags['jeff.pacified'] && s.room !== 'village.square',
    describe: (s) => (s.flags['jeff.pacified']
      ? `Jeff from Finance sits by the well, sipping from a mug, at peace.${s.flags['sq.excel.done'] ? ' He is humming. The report was right. He has told no one.' : ''}`
      : `Jeff from Finance. He is holding an empty spreadsheet like a begging bowl. ${s.flags['sq.excel.done'] ? 'He looks pleased with it, for once.' : 'He would like an export.'}`),
    // After Jeff's Excel (sq.excel.done) he has nothing left to prove, and would rather you didn't bring it up.
    talk: (s) => (s.flags['sq.excel.done']
      ? s.flags['jeff.pacified']
        ? 'Jeff sips from his mug. "The report was right." He checks that nobody is listening. "I have told no one. I will go on telling no one." He looks pleased, and a little pink.'
        : 'Jeff lowers his voice. "The report was right. I have told no one. I will go on telling no one." He looks pleased, and a little pink. His other hand is empty. It looks like it wants a mug.'
      : s.flags['jeff.pacified']
        ? 'Jeff sips from his mug. "Better. Now — the numbers don\'t match. Come look. Please. I have Excel open." (Say: help jeff.)'
        : '"Hey! Hey. Can you export this to Excel? Just the whole thing. All of it. Also, the numbers don\'t match the report. Come look. I have Excel open." (Say: help jeff.)'),
  }),
  npc({
    id: 'miller', name: 'the Miller', aliases: ['miller', 'old miller', 'old man', 'the miller'],
    describe: () => 'The Miller. He has run the Dataflow Gen1 Mill since before it was called that. He looks tired in a scheduled way.',
    talk: (s) => (s.flags['has.credentials']
      ? '"They\'re decommissioning me in Q3. Take care of those creds."'
      : '"Ah, a Report Builder. The Mill\'s being decommissioned, you know. Only thing left in here is the Gen1 credentials. Been stored here since 2019."'),
  }),
  npc({
    id: 'ferryman', name: 'the Ferryman', aliases: ['ferryman', 'ferry man', 'gateway', 'boatman', 'the ferryman'],
    describe: (s) => (s.flags['ferry.online']
      ? 'The Ferryman stands tall at the tiller. His lamp glows ONLINE. He is, for the first time in years, useful.'
      : 'The Ferryman. His status lamp reads OFFLINE. He has the posture of a man whose credentials expired in 2021.'),
    talk: (s) => (s.flags['ferry.online']
      ? '"ONLINE. Where to? The Isle of Gateway is the only stop. Say the word, or board."'
      : "The Ferryman's lamp reads OFFLINE. He mouths: 'Credentials expired.' A tear runs down his cheek in a way that suggests a scheduled refresh failed."),
  }),
  npc({
    id: 'monk', name: 'the gatekeeper monk', aliases: ['monk', 'gatekeeper', 'gatekeeper monk'],
    describe: () => 'A monk in a grey robe, standing very still beside a stone progress bar.',
    talk: () => "The monk points at the progress bar without a word. 'Session starting…'",
  }),
  npc({
    id: 'abbot', name: 'the Abbot', aliases: ['abbot', 'father abbot', 'father'],
    describe: () => 'The Abbot. His robe has a hood. His hood has a flame on it. He has never once used a Dataflow.',
    talk: (s) => (s.flags['has.hoodie']
      ? '"Go, child. Write notebooks. Never look back."'
      : s.flags['notebook.fixed']
        ? '"Kneel."'
        : '"Brother Pandas has put pandas in the Lakehouse again. Fix his notebook and the Hoodie of Spark is yours."'),
  }),
  npc({
    id: 'pandas', name: 'Brother Pandas', aliases: ['pandas', 'brother pandas', 'brother', 'monk pandas'],
    describe: () => 'Brother Pandas. He is very sure this will work in production.',
    talk: () => '"It works on my laptop."',
  }),
  npc({
    id: 'librarian', name: 'the Librarian', aliases: ['librarian', 'the librarian', 'woman'],
    describe: () => 'The Librarian. She has read every deprecated notebook and remembers each one personally.',
    talk: (s) => (s.flags['scroll.lent']
      ? '"Bring it back by the end of the Spark session."'
      : '"The Spark Scroll? Library card only. Any license will do. Well. Any license we accept."'),
  }),
  npc({
    id: 'guard', name: 'the guard', aliases: ['guard', 'guards', 'bridge guard', 'the guard'],
    describe: () => 'A guard in plate mail stamped SKU. He has one job, a very loud voice for it, and a lanyard that says "Capacity Admin (acting)".',
    talk: (s) => (s.flags['bridge.down'] ? '"Sixty days, peasant. Make them count."' : '"HALT! State your SKU!"'),
  }),
  npc({
    id: 'duke', name: 'the Duke of DAX', aliases: ['duke', 'duke of dax', 'the duke', 'duke of warehouse'],
    describe: () => 'The Duke of DAX on a throne of nested CALCULATEs. He speaks only in filter context. He has never once used SQL and would like that in writing.',
    talk: (s) => (s.flags['trial.moat']
      ? 'The Duke pretends not to see you. You smell like his basement.'
      : "'CALCULATE(,' says the Duke, and waits. He is waiting for your filter argument. He will wait forever."),
  }),
  npc({
    id: 'cardinality', name: 'Sir Cardinality', aliases: ['sir cardinality', 'cardinality', 'knight', 'sir'],
    describe: () => 'A knight with one eyebrow permanently raised. He has seen your relationships.',
    // The Model View's talk rule cycles his advice (cardinality.asked); this is the fallback.
    talk: (s) => CARDINALITY_ADVICE[((s.flags['cardinality.asked'] as number) || 0) % CARDINALITY_ADVICE.length]!,
  }),
  npc({
    id: 'card', name: 'the Card visual', aliases: ['card', 'card visual', 'blank', 'the card'],
    describe: (s) => (s.flags['stare.done']
      ? 'It blinks. A number appears: 4.2M. It is wrong, but it is a number.'
      : '(Blank). It shows (Blank). It has always shown (Blank).'),
    talk: (s) => (s.flags['stare.done']
      ? 'The Card says 4.2M. It would like you to stop asking where it got that.'
      : 'The Card says (Blank). It is not being rude. It has no measure.'),
  }),
  npc({
    id: 'throttlor', name: 'Throttlor', aliases: ['dragon', 'throttlor the capacity dragon', 'capacity dragon', 'the dragon'],
    hiddenWhen: (s) => !!s.flags['dragon.gone'],
    describe: () => 'THROTTLOR, the Capacity Dragon. Smoke rises from his nostrils in neat 30-second intervals. His scales are the color of a red status bar.',
    talk: () => '"WHO DARES— oh. Oh no. You smell like a Warehouse." The dragon gags. "Answer me this, peasant: WHAT IS THE ONE TRUE MODEL?"',
  }),
  npc({
    id: 'scarecrow', name: 'Manual', aliases: ['manual', 'scarecrow', 'scarecrow named manual'],
    describe: () => 'A scarecrow named Manual. He keeps the birds off the refreshes. He has to be triggered by hand.',
    talk: () => 'Manual says nothing. He is waiting for someone to click him.',
  }),
  npc({
    id: 'jeff-excel', name: 'Jeff', aliases: ['jeff', 'jeff from finance', 'finance'],
    describe: () => 'Jeff, at his desk, two monitors, one of them turned away. He has the face of a man who has already decided.',
    // Sheet1's rules answer talk/ask/show first; this is the fallback for any path that reaches the builtin.
    talk: (s) => (s.flags['sq.excel.done']
      ? '"Okay. The report was right. Don\'t tell anyone I said that."'
      : '"The report says 4.2M. My export says 4.7M. One of them is lying and I\'ve decided it\'s the report."'),
  }),
]);
