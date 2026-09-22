import { anonymous, authenticated, date, entity, int, text, uuid } from '@microsoft/rayfin-core';

/**
 * One row per finished game. Public read is limited to the leaderboard columns;
 * quest_id stays private so nobody can join the public board to the activity log.
 */
@entity()
@authenticated('read')
@anonymous('create')
@anonymous('read', { include: ['id', 'player_name', 'score', 'turns', 'elapsed_seconds', 'finished_at'] })
export class HallOfFame {
  @uuid() id!: string;
  @text({ max: 64 }) quest_id!: string;
  @text({ max: 40 }) player_name!: string;
  @int() score!: number;
  @int() turns!: number;
  @int() elapsed_seconds!: number;
  @date() finished_at!: Date;
}
