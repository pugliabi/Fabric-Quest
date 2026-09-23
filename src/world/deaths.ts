import type { PhraseRule } from './types';

/**
 * The new Fabric deaths (spec1 §5.4). Room-scoped; registered right before VOICE_PHRASES (world/index.ts) so they beat
 * the global eggs they overlap (refresh, dax, merge). The skill's death shape: the kill sentence, then the blame; the
 * engine appends the sign-off (step.ts finish()), so no text here carries it. The CapacityAde and the ten calculated
 * columns are rules, not phrases: the bottle lives in items.ts and dies in peaks.ts / globals.ts / lake.ts (ADE,
 * ADE_DEATH below); the columns count in fortress.ts (`fortress.circular`, `model.calc`).
 */

/** Only a FULL refresh kills in the Fields (fix round 1): `refresh manual` stays the scarecrow, `schedule refresh` is safe. */
const FULL_REFRESH = /^(run (a |the )?(full )?refresh|(full )?refresh( all| everything| now| all now| everything now| the fields| the realm| the village)?)$/;

/** Every relationship Both, verb-first and noun-first (fix round 1). Bare `enable bidirectional` in the Model View dies too. */
const BOTH = '(bidirectional|bi[- ]?directional|both|both directions|cross ?filter(ing)? (direction )?(to )?both)';
const EVERY = '(everything|all|all of them|every one|(all |every |all the |all of the )?(relationships|relationship lines|lines|filters)|every relationship|every line)';
const ALL_BOTH = new RegExp([
  `^(enable|turn on|switch on) ${BOTH}( filtering| cross ?filter(ing)?)?(( on| for| to| across)? ${EVERY})?$`,
  `^(set|make|change|switch|flip) (the )?(cross ?filter( direction)?|filter direction|direction)( to)? ${BOTH}(( on| for| across)? ${EVERY})?$`,
  `^(set|make|change|switch|flip)( to)? ${BOTH}( filtering)?( on| for| to| across) ${EVERY}$`,
  `^(set|make|change|switch|flip) ${EVERY}( to| as)? ${BOTH}( filtering)?$`,
  `^${BOTH} (on|for|across) ${EVERY}$`,
].join('|'));

/** Page 2, by every verb Power BI would use for a tab (fix round 1). */
const OPEN_TAB = /^(open|click( on)?|select|switch to|view|go to|visit|tap|show) (the )?(other page|page 2|second page|400[- ]visual (page|report)|400 visuals?|page two|do not open|page 2 \(?do not open\)?|(other |second |warm )?tab)$/;

export const DEATH_PHRASES: PhraseRule[] = [
  { id: 'death.monday', room: 'village.fields', test: FULL_REFRESH, text: 'You kick off a full refresh at 9:02 a.m. on a Monday. Every report in the village goes grey at once. The villagers find you before the capacity does. The sundial said 9:02 and the scarecrow said Monday, and you clicked anyway.', death: 'death.monday' },
  { id: 'death.both', room: 'fortress.model', test: ALL_BOTH, text: "You set every relationship to Both. The model finds a path from Sales to Sales through Sales. So do you. Ambiguous path. Sir Cardinality told you three times, and you heard 'Both' and thought it sounded thorough.", death: 'death.both' },
  { id: 'death.400', room: 'fortress.yard', test: OPEN_TAB, text: 'You open the other page. 400 visuals. Your laptop fan hits a note only dogs and Throttlor can hear. The fan wins. The tab said DO NOT OPEN. You read it as a dare.', death: 'death.400' },
  { id: 'death.final4', room: 'village.cottage', test: /^merge\b/, text: 'You merge the FINAL files. There is now a Sales_v3_FINAL_final4 and you are not in it. Two files called FINAL, and you thought the fix was a third.', death: 'death.final4' },
  { id: 'death.dax-in-m', room: 'fortress.hall', test: /^(type|write|enter|paste|put) (some |a |the |in )?(dax|measure|a measure|new measure|calculate)\b/, text: 'You type DAX into the M editor. The hall does not error. It does something worse: it evaluates. Seven Applied Steps on the wall, all of them M, and you looked right at them.', death: 'death.dax-in-m' },
];

/** The bottle's nouns (items.ts `capacityade`), for the drink rules. */
export const ADE = ['capacityade', 'capacity ade', 'bottle', 'sports drink', 'ade', 'drink', 'the ade', 'label'];
/** `drink capacityade`: on the Pass (peaks.ts), in the swamps (lake.ts) or anywhere you carry it (globals.ts, before global.drink-mug). */
export const ADE_DEATH = 'Electrolytes. Autoscale. Your heart hits 64 CUs and the bill arrives before you do. The label said not on a capacity. Everything in this realm is on a capacity. That is what the dragon is FOR.';
/** The swamps, without the bottle (fix round 1): there is none here, and the water is worse. */
export const NO_ADE_IN_SWAMP = 'There is no energy drink in the marsh. There is marsh water, which is worse, and free.';
/** The tenth calculated column (fortress.ts `fortress.circular`). */
export const WORD_DEATH = 'Your model is a Word document now. It opens in Word. You are in it. Nine warnings, counted out loud, and you wanted a round number.';
