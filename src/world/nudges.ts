import type { GameState } from '../engine/types';

/**
 * The narrator's aside for the rooms that only route (Task B4): the next trial still dark, in golden-path order
 * (the moat, the hoodie, the key), then the Peaks. Sideways — it names what the prophecy asked for and where that
 * sort of thing lives, never a direction word or a verb — so it is safe under every setting (no route is named, so
 * no bricked gate is walked through). `keepWhere` is the Keep from where you stand: "east of the village".
 */
export const trialAside = (s: GameState, keepWhere: string): string =>
  !s.flags['trial.moat'] ? `The prophecy said smell like a Warehouse. There's a Keep ${keepWhere} with a moat under it, and a Duke who throws people.` :
  !s.flags['trial.hoodie'] ? 'Look like an Engineer, the prophecy said. The people who dress like that live behind the Keep, and they chant.' :
  !s.flags['trial.key'] ? 'Hold the Gateway Key, it said. Keys live on islands. Islands need boats. Boats need a Ferryman who has stopped sulking.' :
  "You have all three. What's left is a mountain, a dragon and a lot of typing, and the mountain is the easy part.";
