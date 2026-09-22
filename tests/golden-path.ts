/** The canonical 200-point walkthrough. Also used by the replay script and e2e. */
export const GOLDEN_PATH: string[] = [
  // Village (+5)
  'look', 'get mug', 'read report', 'out', 'read board', 'give mug to jeff',
  // Mill (+10)
  'n', 'talk to miller', 's',
  // Lake: ferry + key (+15 +20)
  's', 'e', 'give credentials to ferryman', 'board boat', 'get standard key', 'board boat', 'w',
  // Swamp: shortcut (+10)
  's', 's', 's', 'get shortcut',
  // Monastery gate (+10)
  'e', 'wait', 'wait', 'wait', 'n',
  // Library, scroll, fix, hoodie (+10 +5 +20 +15)
  'w', 'give license to librarian', 'read scroll', 'e', 'e', 'use scroll on notebook', 'w', 'talk to abbot', 'wear hoodie',
  // Shortcut home, walk to the fortress
  'use shortcut', 'n', 'e', 'e', 'n',
  // Fortress: SKU, moat (+10 +25) — the moat throws you back to the bridge
  'say trial', 'n', 'n', 'say select *',
  // Yard: stare, copy, boots (+10 +15)
  'n', 'e', 'look at lookup', 'wait', 'wait', 'get cable', 'use cable on copy activity', 'wear boots',
  // Peaks: door, dragon, model (+5 +10 +5)
  'w', 's', 's', 'e', 'n', 'n', 'say star schema', 'get model',
];
