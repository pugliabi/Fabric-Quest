import { Activity } from './Activity.js';
import { HallOfFame } from './HallOfFame.js';
import { Quest } from './Quest.js';

export type ProsQuestSchema = {
  Quest: Quest;
  Activity: Activity;
  HallOfFame: HallOfFame;
};

/** Every entity must be listed here or it will not exist in the API or the client. */
export const schema = [Quest, Activity, HallOfFame];
