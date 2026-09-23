import type { GameState } from '../engine/types';

/** A room's `where` line: a string, or a function of the state where the screen itself changes (the dock, the isle, the Studio). */
export type WhereLine = string | ((s: GameState) => string);

/**
 * `where` (spec1 §5.2): one line per room. The narrator names the screen and mocks you for being on it.
 * Lint requires an entry for every room (world/lint.ts); the phrase that says it is `where.main` / `where.pane`
 * (world/globals.ts VOICE_PHRASES). `where` is the player's word; god mode's search is `locate`.
 */
export const WHERE: Record<string, WhereLine> = {
  'village.cottage': "You're hanging out in My Workspace. Nobody else can see in, which is the only reason you're allowed to look like that.",
  'village.square': "The Village Square. A well, a board, and a Jeff. You're the fourth thing.",
  'village.mill': 'The Dataflow Gen1 Mill. Deprecated, like your first semantic model, which was one table and still is.',
  'village.fields': 'The Refresh Fields. Rows of failures, and you, standing among them like you belong. You do.',
  'village.hall': "The Town Hall. The queue has one person in it and it's you and you're not moving.",
  'lake.shore': "The OneLake Shore. One lake. You've counted twice. Still one.",
  'lake.dock': (s) => (s.flags['ferry.online']
    ? "The Ferryman's Dock. ONLINE. Nobody who set up the gateway stayed long enough to see it."
    : "The Ferryman's Dock. OFFLINE, like the guy who set up the gateway and left for a company that appreciates him."),
  'lake.island': (s) => {
    const left = 2 - Number(!!s.flags['taken.standard key']) - Number(!!s.flags['taken.personal key']);
    return left === 2 ? "The Isle of Gateway. Two keys, one plinth, and a decision you'll be explaining in a postmortem."
      : left === 1 ? "The Isle of Gateway. One key left on the plinth, and the decision's made. The postmortem isn't."
      : 'The Isle of Gateway. An empty plinth and a plaque that says CHOOSE. You took both, and nobody has told the plaque.';
  },
  'lake.house': "The Lake House. A house. On a lake. You keep saying it like it'll start meaning something.",
  'swamp.bronze': 'The Bronze Marsh. Everything here is a string, including your plan.',
  'swamp.silver': "The Silver Marsh. Things have names now. Yours is still 'peasant'.",
  'swamp.gold': 'The Gold Marsh. Clean, typed, modeled. You lower the tone just by standing here.',
  'monastery.gate': "The Monastery Gate. A session is starting. It was starting when you got here and it'll be starting at your funeral.",
  'monastery.cloister': "The Cloister. Monks in a circle, chanting. You're in the loop now. There's no break statement.",
  'monastery.spark': 'The Spark Session Chamber. Warm, humming, billed. Like a hot tub with an invoice.',
  'monastery.library': 'The Library of Deprecated Notebooks. One of them is yours. She knows.',
  'monastery.sacristy': 'The Sacristy. The Admin Portal. You have the keys to the tenant and the judgment of a Zune.',
  'fortress.bridge': "The Power BI Desktop Gate. Still updating. 1 of 3. It's been 1 of 3 since Windows Vista.",
  'fortress.hall': 'Power Query Hall. Seven doors, one order, and you, trying them like a raccoon at a vending machine.',
  'fortress.model': 'The Model View. Tables on plinths, lines between them, and one bridge that wobbles like your DAX.',
  'fortress.throne': "The Duke's Chamber. Filter context only. Your outside voice doesn't work in here.",
  'fortress.yard': (s) => (s.flags['stare.done']
    ? `The Report Studio. ${s.flags['refresh.done'] ? 'A bar chart that used to be a pie' : 'A pie with 31 slices'} and a Card that says 4.2M now, which is wrong, but at least it's a number.`
    : 'The Report Studio. A pie with 31 slices and a Card that says (Blank), which is also your plan.'),
  'peaks.foothills': "The Foothills. The air's thin and so is the excuse you'll give Finance.",
  'peaks.pass': 'Throttling Pass. Every step costs more than the last one, like a consultant.',
  'peaks.ledge': "The Bursting Ledge. A door that checks three things about you. It's found more than three.",
  'peaks.shrine': 'The Shrine. A dragon, a model, and you. Two of you are impressive.',
  'excel.sheet1': "Sheet1. Jeff's desk. Grid paper to the horizon and a SUM that's wrong to four decimal places.",
  'excel.data': "The Data tab. Where the good buttons are, away from Jeff. He's watching you use them.",
  'excel.pivot': 'PivotTable1. Jeff named it. Jeff names everything 1, including, briefly, his son.',
  'copilot.pane': "The Copilot Pane. A sparkle that would like to help. It has helped four people. They're in a meeting about it.",
  'copilot.gallery': "The Model Gallery. Three models on plinths. One's certified. Guess which one Copilot picks.",
};

/** The line for this room now (a function entry is read against the state). */
export const whereText = (s: GameState, id: string): string | undefined => {
  const w = WHERE[id];
  return typeof w === 'function' ? w(s) : w;
};
