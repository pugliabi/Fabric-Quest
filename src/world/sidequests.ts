import type { GameState } from '../engine/types';
import type { PhraseRule, RuleThen, World } from './types';
import { RETURN_FLAG, SIDE_REGIONS } from './types';
import { roomIndex } from '../engine/builtins';
import { promptOf } from './copilot';

export const SIDEQUEST_ENTRY = { excel: 'excel.sheet1', copilot: 'copilot.pane' } as const;
export type Realm = keyof typeof SIDEQUEST_ENTRY;

export const inSideRealm = (s: GameState, world: World): boolean => SIDE_REGIONS.has(world.rooms[s.room]!.region);

/** The `then` for an entry: remember where we were, warp, sting. */
export function enterThen(realm: Realm, world: World, s: GameState): RuleThen {
  return {
    text: realm === 'excel'
      ? 'The screen goes white. A grid appears. Somewhere, a cell is blinking.'
      : 'The screen dims. A chat pane slides in from the right.',
    set: { [RETURN_FLAG]: roomIndex(s.room, world) },
    moveTo: SIDEQUEST_ENTRY[realm],
    sfx: 'sidequest',
    outcome: 'move',
  };
}

export const EXIT_THEN: RuleThen = { text: 'You close it. The realm is where you left it.', returnTo: true, sfx: 'sidequest-out' };

/** The question left in an entry line once Copilot has been addressed ("ask copilot for q4 sales" → "q4 sales"), or ''. */
export const copilotPromptIn = (line: string): string => (/^((ask|hey|open|tell|talk to) )?copilot\b/.test(line) ? promptOf(line) : '');

/** Typed inside a realm, QUIT leaves the realm (EXIT_THEN) and says this, instead of ending the whole run. */
export const quitInRealmText = (realm: string): string => `QUIT ends the whole quest. You've only left ${realm}. Say it again out here if you mean it.`;

export const NESTED_TEXT = 'One side quest at a time. This is a peasant, not a pipeline.';

/** Nobody dies in a side realm: a line that would have killed you gets one of these instead (engine: step.ts finish()). */
export const NO_DEATH: Record<Realm, string> = {
  excel: 'Excel does not do that. Excel does pivot tables.',
  copilot: 'Copilot declines, politely, with a small sparkle.',
};

const TALKED_TO_JEFF = /^(talk|speak|ask|chat|greet|hello|hi)\b.*\bjeff\b/;
/** The previous turn was talking to Jeff in the Square, and his line still ended in "I have Excel open." */
const jeffJustAsked = (prev: GameState): boolean =>
  !prev.flags['sq.excel.done'] && prev.recent?.room === 'village.square' && TALKED_TO_JEFF.test(prev.recent.input);

/**
 * Registered ahead of PHRASE_RULES so they win inside the realms. The engine resolves `dynamic` rules itself
 * (their `text` is never shown): entries warp in, a trigger inside a realm is the NESTED_TEXT joke, and exit words
 * outside a realm are ignored so `exit` / `leave` / `out` keep their ordinary meaning.
 */
export const SIDEQUEST_PHRASES: PhraseRule[] = [
  { id: 'sq.enter.excel', test: /^(show me (a|the) table|open excel|analy[sz]e in excel)$/, text: '', dynamic: 'excel' },
  { id: 'sq.enter.excel.jeff', room: 'village.square', test: /^(help jeff|talk to jeff about (excel|export|numbers|the numbers)|go with jeff)$/, text: '', dynamic: 'excel' },
  // `yes` as the very next command after Jeff's "Come look. I have Excel open." (his talk line until the quest is done).
  { id: 'sq.enter.excel.yes', room: 'village.square', test: /^(yes|y|yeah|yep|sure|ok|okay|fine|i will|let's go|lets go)$/, text: '', dynamic: 'excel', after: jeffJustAsked },
  // Any line that addresses Copilot ("ask copilot …", "hey copilot, …", "copilot, …") opens it; the engine asks the rest.
  { id: 'sq.enter.copilot', test: /^(what are my sales( numbers)?|show me (my )?sales( numbers)?|((ask|hey|open|tell|talk to) )?copilot\b.*)$/, text: '', dynamic: 'copilot' },
  { id: 'sq.exit.words', test: /^(exit|leave|out|go out|get out|close|close excel|close copilot|back|quit excel|quit copilot)$/, text: '', dynamic: 'exit' },
];
