import type { World } from './types';
import { ITEMS } from './items';
import { NPCS } from './npcs';
import { GLOBAL_RULES, HELP_TEXT, PHRASE_RULES, SNARK, ambient } from './globals';
import { VILLAGE_ROOMS } from './village';
import { LAKE_ROOMS } from './lake';
import { MONASTERY_ROOMS } from './monastery';
import { FORTRESS_ROOMS } from './fortress';
import { PEAKS_ROOMS } from './peaks';

export const WORLD_VERSION = '0.1.0';

export const WORLD: World = {
  start: 'village.cottage',
  version: WORLD_VERSION,
  rooms: { ...VILLAGE_ROOMS, ...LAKE_ROOMS, ...MONASTERY_ROOMS, ...FORTRESS_ROOMS, ...PEAKS_ROOMS },
  items: ITEMS,
  npcs: NPCS,
  globalRules: GLOBAL_RULES,
  phraseRules: PHRASE_RULES,
  snark: SNARK,
  helpText: HELP_TEXT,
  ambient,
};
