import { anonymous, authenticated, date, entity, text, uuid } from '@microsoft/rayfin-core';

/**
 * One row per playthrough, created when the player types their name.
 * Anonymous visitors may only CREATE — never read, update or delete another player's quest.
 */
@entity()
@authenticated('read')
@anonymous('create')
export class Quest {
  @uuid() id!: string;
  @text({ max: 40 }) player_name!: string;
  /** Random UUID persisted in the player's browser so repeat visits link up. */
  @text({ max: 64 }) client_id!: string;
  @text({ max: 400, optional: true }) user_agent?: string;
  @text({ max: 20 }) world_version!: string;
  @date() started_at!: Date;
}
