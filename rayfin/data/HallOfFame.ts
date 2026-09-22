import { anonymous, authenticated, date, entity, int, text, uuid } from '@microsoft/rayfin-core';

/**
 * One row per finished game. Public read is limited to the leaderboard columns.
 * quest_id must be in the anonymous read list: DAB validates a create mutation's return
 * selection against the caller's read permission, and the client echoes every input field
 * back — excluding quest_id here makes the whole createHallOfFame mutation fail with
 * "not authorized to access this resource". Exposing it is harmless: Activity and Quest
 * have no anonymous read, so the id cannot be joined to anything from outside.
 */
@entity()
@authenticated('read')
@anonymous('create')
@anonymous('read', { include: ['id', 'quest_id', 'player_name', 'score', 'turns', 'elapsed_seconds', 'finished_at'] })
export class HallOfFame {
  @uuid() id!: string;
  @text({ max: 64 }) quest_id!: string;
  @text({ max: 40 }) player_name!: string;
  @int() score!: number;
  @int() turns!: number;
  @int() elapsed_seconds!: number;
  @date() finished_at!: Date;
}
