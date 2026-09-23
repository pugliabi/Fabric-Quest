export type Dir = 'n' | 's' | 'e' | 'w' | 'u' | 'd' | 'out' | 'in';

export type Verb =
  | 'look' | 'get' | 'drop' | 'use' | 'talk' | 'say' | 'give' | 'open' | 'close' | 'read'
  | 'wear' | 'wait' | 'drink' | 'attack' | 'board' | 'go' | 'inventory' | 'score' | 'save'
  | 'restore' | 'restart' | 'quit' | 'help' | 'unknown';

/** Classification of a turn, stored in telemetry. */
export type Outcome = 'move' | 'success' | 'fail' | 'snark' | 'death' | 'meta' | 'win';

export type ParsedCommand = {
  verb: Verb;
  noun?: string;
  noun2?: string;
  dir?: Dir;
  raw: string;
  unknownVerb?: string;
  /** The word(s) the player used for the verb ("apply", "sign in"), before synonyms collapse it. */
  verbWord?: string;
};

export type Flags = Record<string, boolean | number>;

export type GameState = {
  room: string;
  inventory: string[];
  worn: string[];
  flags: Flags;
  score: number;
  /** Side-quest bonus points, on top of the 200-point ledger. */
  bonus: number;
  turns: number;
  dead: boolean;
  won: boolean;
  /** Deterministic seed for snark rotation; derived from the quest id. */
  seed: number;
  /** Last command (normalized), where it was typed, and how many times in a row. Drives the repeat quirks. */
  recent?: { input: string; room: string; n: number };
};

export type StepResult = {
  state: GameState;
  output: string[];
  outcome: Outcome;
  /** Rule id, or the room id when no rule fired. Used as telemetry step_id. */
  stepId: string;
  pointsAwarded: number;
  /** Side-quest bonus points awarded this turn (0 or absent otherwise). */
  bonusAwarded?: number;
  parsed: ParsedCommand;
  deathCause?: string;
  /** Sound cue name, when a rule asked for one. */
  sfx?: string;
  /** A line the UI should show in the Sierra message box (entrance quips, side-quest events). */
  notice?: string;
};

/** How a wrapper around a command reads: wanting it, insisting on it, or losing patience with it. */
export type WrapKind = 'intent' | 'insist' | 'frustrated';

/** A line with its wrapper words taken off ("ugh just give me sales please" → "give me sales"). */
export type Unwrapped = {
  command: string;
  /** The first wrapper found (leading, else trailing); what the chirps comment on. */
  kind: WrapKind | null;
  lead?: { kind: WrapKind; word: string };
  trail?: { kind: WrapKind; word: string };
};

/** What a room's catchAll hears: the raw line, and the same line unwrapped. */
export type HeardLine = Unwrapped & { raw: string };
