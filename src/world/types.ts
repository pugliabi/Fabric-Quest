import type { Dir, GameState, Outcome, Verb } from '../engine/types';

export type Cond = { flag: string; is?: boolean | number; not?: boolean };

export type FlagValue = boolean | number;
export type FlagPatch = Record<string, FlagValue | ((v: FlagValue | undefined) => FlagValue)>;

export type RuleWhen = {
  verb: Verb;
  /** Exact noun match (after parsing), or any of a list. Omit to match any/no noun. */
  noun?: string | string[];
  noun2?: string | string[];
  /** Regex on the noun, for open-ended phrases like "select x, y from t". */
  nounMatches?: RegExp;
  dir?: Dir;
  flags?: Cond[];
  has?: string[];
  notHas?: string[];
  worn?: string[];
};

export type RuleThen = {
  text: string | ((s: GameState, world: World) => string);
  set?: FlagPatch;
  give?: string[];
  remove?: string[];
  wear?: string[];
  moveTo?: string;
  points?: number;
  /** Points are awarded once per key; defaults to the rule id. Lets alternate rules share one award. */
  pointsKey?: string;
  outcome?: Outcome;
  /** Death cause id, e.g. 'death.bronze'. */
  death?: string;
  win?: boolean;
  /** Sound cue override. */
  sfx?: string;
};

export type Rule = { id: string; when: RuleWhen; then: RuleThen };

/** Matched against the raw lowercase input before parsing. */
export type PhraseRule = {
  id: string;
  test: RegExp;
  text: string | ((s: GameState, world: World) => string);
  death?: string;
  /** Restrict to one room. */
  room?: string;
  sfx?: string;
};

export type Room = {
  id: string;
  name: string;
  region: 'village' | 'lake' | 'swamp' | 'monastery' | 'fortress' | 'peaks';
  describe: (s: GameState) => string;
  exits: Partial<Record<Dir, string | ((s: GameState) => string | null)>>;
  items: string[];
  npcs: string[];
  rules: Rule[];
  scene: (s: GameState) => string;
  onEnter?: (s: GameState) => string | null;
  /** The "get ye flask" nudge for this room. */
  flaskHint: (s: GameState) => string;
};

export type Item = {
  id: string;
  name: string;
  aliases: string[];
  takeable: boolean;
  wearable?: boolean;
  describe: string | ((s: GameState) => string);
  untakeableText?: string;
  /** Hidden from the room (and from noun resolution) until this returns true. */
  visibleWhen?: (s: GameState) => boolean;
};

export type Npc = {
  id: string;
  name: string;
  aliases: string[];
  describe: (s: GameState) => string;
  talk: (s: GameState) => string;
  hiddenWhen?: (s: GameState) => boolean;
};

export type World = {
  start: string;
  version: string;
  rooms: Record<string, Room>;
  items: Record<string, Item>;
  npcs: Record<string, Npc>;
  globalRules: Rule[];
  phraseRules: PhraseRule[];
  snark: string[];
  helpText: string;
  /** Optional line appended after a turn (NPC interjections, weather). */
  ambient?: (s: GameState) => string | null;
};
