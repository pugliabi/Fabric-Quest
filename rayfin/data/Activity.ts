import { anonymous, authenticated, date, entity, int, text, uuid } from '@microsoft/rayfin-core';

/**
 * One row per command typed. This is the table Power BI will sit on:
 * funnel by room, deaths by cause, most-typed unrecognized commands, time per trial.
 * quest_id is plain text (no @one) so anonymous creates stay simple.
 */
@entity()
@authenticated('read')
@anonymous('create')
export class Activity {
  @uuid() id!: string;
  @text({ max: 64 }) quest_id!: string;
  /** Who typed it — denormalized from Quest so this table stands on its own. */
  @text({ max: 40, optional: true }) player_name?: string;
  /** Random per-browser id (same across a player's quests on one device). */
  @text({ max: 64, optional: true }) client_id?: string;
  @int() seq!: number;
  /** Rule id that fired, or the room id when none did (e.g. 'fortress.moat', 'village.square'). */
  @text({ max: 80 }) step_id!: string;
  @text({ max: 80 }) room_id!: string;
  @text({ max: 200 }) raw_input!: string;
  @text({ max: 20, optional: true }) verb?: string;
  @text({ max: 120, optional: true }) noun?: string;
  /** move | success | fail | snark | death | meta | win */
  @text({ max: 12 }) outcome!: string;
  @text({ max: 2000 }) output_text!: string;
  @int() points_awarded!: number;
  @int() score_after!: number;
  @int() turns_after!: number;
  /** JSON-encoded flag map after the turn. */
  @text({ max: 4000 }) flags_after!: string;
  @date() occurred_at!: Date;
}
