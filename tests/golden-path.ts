/** The canonical 200-point walkthrough. Also used by the replay script and e2e. */
export const GOLDEN_PATH: string[] = [
  // Village (+5)
  'look', 'get mug', 'read report', 'out', 'read board', 'give mug to jeff',
  // Mill (+10)
  'n', 'talk to miller', 's',
  // The Keep: SKU, moat (+10 +25) — the moat throws you back to the gate
  'e', 'e', 'n', 'say trial', 'n', 'n', 'say select *',
  // Model View: the policy; Report Studio: stare, Big Refresh, boots (+10 +15)
  'n', 'w', 'get policy', 'e', 'e', 'look at card', 'wait', 'wait', 'use policy on refresh', 'wear boots',
  // Out the Model View's back gate to the Monastery (+10)
  'w', 'w', 'n', 'wait', 'wait', 'wait', 'n',
  // Library, scroll, fix, hoodie (+10 +5 +20 +15)
  'w', 'give license to librarian', 'read scroll', 'e', 'e', 'use scroll on notebook', 'w', 'talk to abbot', 'wear hoodie',
  // Back through the Keep to the village
  's', 's', 'e', 's', 's', 'w', 'w',
  // Lake: ferry + key (+15 +20)
  's', 'e', 'give credentials to ferryman', 'board boat', 'get standard key', 'board boat', 'w',
  // Swamp: shortcut (+10), and take it home to the shore
  's', 's', 's', 'get shortcut', 'use shortcut',
  // Peaks: door, dragon, model (+5 +10 +5)
  'n', 'e', 'e', 'e', 'n', 'n', 'say star schema', 'get model',
];
