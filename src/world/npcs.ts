import type { Npc } from './types';

const npc = (n: Npc): [string, Npc] => [n.id, n];

export const NPCS: Record<string, Npc> = Object.fromEntries([
  npc({
    id: 'jeff', name: 'Jeff from Finance', aliases: ['jeff', 'finance', 'man', 'jeff from finance'],
    // Once pacified he stays by the well instead of following you into the fields.
    hiddenWhen: (s) => !!s.flags['jeff.pacified'] && s.room !== 'village.square',
    describe: (s) => (s.flags['jeff.pacified']
      ? 'Jeff from Finance sits by the well, sipping from a mug, at peace.'
      : 'Jeff from Finance. He is holding an empty spreadsheet like a begging bowl. He would like an export.'),
    talk: (s) => (s.flags['jeff.pacified']
      ? 'Jeff sips from his mug and says nothing. Bliss.'
      : '"Hey! Hey. Can you export this to Excel? Just the whole thing. All of it. Excel."'),
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
    describe: () => 'A guard in plate mail stamped SKU. He has one job and a very loud voice for it.',
    talk: (s) => (s.flags['bridge.down'] ? '"Sixty days, peasant. Make them count."' : '"HALT! State your SKU!"'),
  }),
  npc({
    id: 'duke', name: 'the Duke of Warehouse', aliases: ['duke', 'duke of warehouse', 'the duke'],
    describe: () => 'The Duke of Warehouse, seated on a throne of stacked schemas. He speaks only in JOINs.',
    talk: () => '"INNER JOIN me, peasant, ON what? Speak, or be LEFT OUTER."',
  }),
  npc({
    id: 'lookup', name: 'the Lookup Activity', aliases: ['lookup', 'lookup activity', 'the lookup'],
    describe: () => 'The Lookup Activity. It is looking at you. It has always been looking at you.',
    talk: () => 'The Lookup Activity says nothing. It looks at you. It has always been looking at you.',
  }),
  npc({
    id: 'copy', name: 'the Copy Activity', aliases: ['copy', 'copy activity', 'the copy activity'],
    describe: (s) => (s.flags['copy.fixed'] ? 'The Copy Activity hums. Status: Succeeded.' : "The Copy Activity. Status: WAITING ON LOOKUP. It has been waiting since a Tuesday."),
    talk: (s) => (s.flags['copy.fixed'] ? 'The Copy Activity hums contentedly. Status: Succeeded.' : "The Copy Activity is stuck at 'Waiting on Lookup'. It has been stuck since a Tuesday."),
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
]);
