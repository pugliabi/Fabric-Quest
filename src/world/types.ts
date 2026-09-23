import type { Dir, GameState, HeardLine, Outcome, Verb } from '../engine/types';

export type Region = 'village' | 'lake' | 'swamp' | 'monastery' | 'fortress' | 'peaks' | 'excel' | 'copilot';
export const SIDE_REGIONS: ReadonlySet<Region> = new Set<Region>(['excel', 'copilot']);
/** What the narrator calls each side realm when telling you how to leave it. */
export const SIDE_REALM_NAME: Partial<Record<Region, string>> = { excel: "Jeff's Excel", copilot: 'Copilot' };
/** Flag holding roomIndex() of the room a side quest was entered from. Lives here (not in engine/step) to keep imports acyclic. */
export const RETURN_FLAG = 'sq.return';

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
  /** Only when the player used one of these verb words ("use", "apply"), not a synonym that maps to the same verb. */
  verbWord?: string[];
};

export type RuleThen = {
  text: string | ((s: GameState, world: World) => string);
  set?: FlagPatch;
  give?: string[];
  remove?: string[];
  wear?: string[];
  moveTo?: string;
  /** Bonus points (side quests). Awarded once per pointsKey ?? id, never added to score. */
  bonus?: number;
  /** Move back to the room stored in flags['sq.return'] (see RETURN_FLAG) and describe it. */
  returnTo?: true;
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
  /** Restrict to every room of one region (e.g. the Keep's DirectQuery line). Ignored when `room` is set. */
  region?: Region;
  sfx?: string;
  /** Side-quest hook resolved by the engine: enter a realm, or leave one (see world/sidequests.ts). */
  dynamic?: 'excel' | 'copilot' | 'exit';
  /** Only right after this: checked against the state BEFORE the turn (its `recent` is the previous command). */
  after?: (prev: GameState) => boolean;
};

export type Room = {
  id: string;
  name: string;
  region: Region;
  describe: (s: GameState) => string;
  exits: Partial<Record<Dir, string | ((s: GameState) => string | null)>>;
  items: string[];
  npcs: string[];
  rules: Rule[];
  scene: (s: GameState) => string;
  onEnter?: (s: GameState) => string | null;
  /** The "get ye flask" nudge for this room. */
  flaskHint: (s: GameState) => string;
  /** Shown in the message box the first time the player enters (null = nothing). */
  enterQuip?: (s: GameState) => string | null;
  /** Last-resort handler for any line the room wants to interpret itself (Copilot prompts). Runs after rules, before builtins. */
  catchAll?: (s: GameState, line: HeardLine) => { then: RuleThen; id?: string } | null;
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
