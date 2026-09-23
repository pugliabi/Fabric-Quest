import type { Dir, GameState, HeardLine, Outcome, ParsedCommand, Verb } from '../engine/types';

export type Region = 'village' | 'lake' | 'swamp' | 'monastery' | 'fortress' | 'peaks' | 'excel' | 'copilot';
export const SIDE_REGIONS: ReadonlySet<Region> = new Set<Region>(['excel', 'copilot']);
/** What the narrator calls each side realm when telling you how to leave it. */
export const SIDE_REALM_NAME: Partial<Record<Region, string>> = { excel: "Jeff's Excel", copilot: 'Copilot' };
/** Flag holding roomIndex() of the room a side quest was entered from. Lives here (not in engine/step) to keep imports acyclic. */
export const RETURN_FLAG = 'sq.return';

export type Cond = { flag: string; is?: boolean | number; not?: boolean };

export type FlagValue = boolean | number;
/** A flag's new value, or a setter given the old value and `prev`, the state before this rule's `set` (Jeff's stage counters read it). */
export type FlagPatch = Record<string, FlagValue | ((v: FlagValue | undefined, prev: GameState) => FlagValue)>;

export type RuleWhen = {
  verb: Verb;
  /** Exact noun match (after parsing), or any of a list. Omit to match any/no noun. */
  noun?: string | string[];
  noun2?: string | string[];
  /** Regex on the noun, for open-ended phrases like "select x, y from t". */
  nounMatches?: RegExp;
  /** Regex on noun2 (the `about` topic, the `to` target). Requires a noun2; a talk rule uses it to claim only unknown topics. */
  noun2Matches?: RegExp;
  dir?: Dir;
  flags?: Cond[];
  has?: string[];
  notHas?: string[];
  worn?: string[];
  /** Only when the player used one of these verb words ("use", "apply"), not a synonym that maps to the same verb. */
  verbWord?: string[];
};

export type RuleThen = {
  /** The line. A callback also gets the parsed command, so a talk rule can hand an `about` topic to talkTo() the way the builtin does. */
  text: string | ((s: GameState, world: World, cmd?: ParsedCommand) => string);
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
  /** A line for the Sierra message box, shown before the entrance quip (the side-quest goal cards). */
  box?: string | ((s: GameState, world: World) => string);
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
  /**
   * A raw-line rule with effects. Applied through the engine's applyRule (flags, moves, bonus, death, sfx, box all
   * work). A function form sees the lowercased line and may return null to decline, in which case the search
   * continues with the next phrase rule. `text` is ignored when `then` is present (set it to ''). `heard` is the line
   * as typed, wrappers included ("start again" reaches `line` as "start").
   */
  then?: RuleThen | ((s: GameState, world: World, line: string, heard: HeardLine) => { then: RuleThen; id?: string } | null);
};

/** A nudge line, or one that depends on the room's state. A function may return '' to hand its tier to the flask hint. */
export type NudgeText = string | ((s: GameState) => string);

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
  /** The "get ye flask" nudge for this room: what `hint`, `get ye flask` and the aside's last tier say. */
  flaskHint: (s: GameState) => string;
  /**
   * The narrator's UNASKED aside (spec1 §3.3, Task B4), tiered by dead turns in the room: `oblique` at 4 points at the
   * idea, never the command (no backticks, no verb-and-noun); `plainer` at 8 (the flask hint when absent or ''); from 12
   * the flask hint itself. Without it, the flask hint at every tier (lint warns). Side realms have their own hints.
   */
  nudge?: { oblique: NudgeText; plainer?: NudgeText };
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
  /**
   * Two sentences for the inventory: a joke, not a data table (spec1 §5.2). Lint requires it on every item, scenery
   * included, because god mode's `summon` can put any of them in your pocket.
   */
  blurb?: string;
  /** `get <item>` when it is already carried: refuse by remembering the first time. Lint requires it on every takeable item. */
  again?: string | ((s: GameState) => string);
};

/** A brush-off line, or one that depends on the NPC's state (the Ferryman online, the Card after the stare). */
export type BrushOff = string | ((s: GameState) => string);

export type Npc = {
  id: string;
  name: string;
  aliases: string[];
  describe: (s: GameState) => string;
  talk: (s: GameState) => string;
  /** Talk 2 and up (spec1 §3.1): a variant, then the variant plus the hint, then nickname lines. Without it the engine's default escalation runs. */
  talkMore?: (s: GameState, n: number) => string;
  /** `ask <npc> about <unknown>`, in the NPC's gimmick. World lint requires it. */
  brushOff?: BrushOff;
  /** Words and phrases the NPC knows (their checklist, the room's puzzle nouns). `ask <npc> about <one of these>` gets the hint, not the brush-off. */
  knows?: string[];
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
