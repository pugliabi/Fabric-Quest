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
};

export type Flags = Record<string, boolean | number>;

export type GameState = {
  room: string;
  inventory: string[];
  worn: string[];
  flags: Flags;
  score: number;
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
  parsed: ParsedCommand;
  deathCause?: string;
  /** Sound cue name, when a rule asked for one. */
  sfx?: string;
};
