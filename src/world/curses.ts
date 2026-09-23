import type { GameState } from '../engine/types';
import type { Rule } from './types';

/**
 * Worse than death (spec1 §5.4, the skill's "non-lethal catastrophic failure"). Stored as flags so ordinary rules can
 * set and undo them; curseOf() is the one accessor (PlayScreen reads it for the status bar and the prompt, talkTo()
 * for the NPCs). The triggers live where they happen: the Duke's chamber (three wrong `say`s, fortress.ts), the Report
 * Studio (the seventh stare at the Card, fortress.ts), the Square (the eighth talk to Jeff with nothing given,
 * village.ts). The undo for each: the incremental refresh policy on yourself (here, global), `say star schema`
 * anywhere (here, global; Throttlor's own rule lifts it too), the mug to Jeff (village.jeff-mug). The Duke's moat washes
 * the column off (MOAT_THEN), so no curse can soft-lock the win.
 */
export type Curse = 'column' | 'blank' | 'jeff';
export const curseOf = (s: GameState): Curse | null => (s.flags['curse.column'] ? 'column' : s.flags['curse.blank'] ? 'blank' : s.flags['curse.jeff'] ? 'jeff' : null);

export const CURSE_COLUMN_TEXT = "'WRONG,' says the Duke. 'Three times. You are hereby a CALCULATED COLUMN.' You feel yourself computed at refresh and stored in every row. Throttlor will not negotiate with a column. You are not exactly dead. You are worse: you are in the model.";
export const CURSE_BLANK_TEXT = "You stare at the Card past the point of sense. The Card stares back. Then it isn't the Card that is (Blank). Sir Cardinality walks past and does not see you. Nobody will, until you say the two words that put a value in you.";
export const CURSE_JEFF_TEXT = 'You talk to Jeff an eighth time with nothing given. Something gives. You look down: an empty spreadsheet, held like a begging bowl. You are Jeff now. Jeff is also Jeff. The prompt has noticed.';
export const COLUMN_DRAGON = "Throttlor sniffs. 'A calculated column. I don't negotiate with columns. Come back when you're a measure.'";
/** talkTo(): every NPC, while you are (Blank). Names that start with "the" ("the Card visual") open the sentence. */
export const BLANK_LOOKS_THROUGH = (name: string): string => `${name.charAt(0).toUpperCase()}${name.slice(1)} looks through you, the way a visual looks through (Blank).`;

const POLICY = ['policy', 'incremental refresh policy', 'incremental refresh', 'refresh policy', 'incremental'];
const STAR = ['star schema', 'a star schema', 'the star schema', 'star', 'kimball'];
const SELF = ['self', 'me', 'myself', 'yourself', 'you'];

/**
 * `use policy on self` while a column. Global (spread into GLOBAL_RULES before global.say-star-elsewhere), and copied
 * ahead of the Model View's and the Studio's own `use policy` lines (fortress.ts), which would otherwise answer first.
 */
export const UNDO_COLUMN: Rule = {
  id: 'curse.undo-column',
  when: { verb: 'use', noun: POLICY, noun2: SELF, has: ['policy'], flags: [{ flag: 'curse.column' }] },
  then: { text: 'You apply the incremental refresh policy to yourself. Ten days at a time, you become a measure again. It takes a minute. It feels like 2019.', set: { 'curse.column': false, 'duke.wrong': 0 }, outcome: 'success', sfx: 'success' },
};

/** Spread into GLOBAL_RULES before global.say-star-elsewhere. */
export const CURSE_GLOBAL_RULES: Rule[] = [
  UNDO_COLUMN,
  { id: 'curse.undo-blank', when: { verb: 'say', noun: STAR, flags: [{ flag: 'curse.blank' }] }, then: { text: "You say 'star schema.' A measure finds you. You have a value again, and it is 1.", set: { 'curse.blank': false }, outcome: 'success', sfx: 'success' } },
];
