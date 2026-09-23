import type { World } from './types';
import { ITEMS } from './items';
import { NPCS } from './npcs';
import { GLOBAL_RULES, HELP_TEXT, PHRASE_RULES, SNARK, ambient } from './globals';
import { VILLAGE_ROOMS } from './village';
import { LAKE_ROOMS, LAKEHOUSE_PHRASES } from './lake';
import { MONASTERY_ROOMS } from './monastery';
import { FORTRESS_ROOMS, KEEP_PHRASES } from './fortress';
import { PEAKS_PHRASES, PEAKS_ROOMS } from './peaks';
import { EXCEL_PHRASES, EXCEL_ROOMS } from './excel';
import { COPILOT_PHRASES, COPILOT_ROOMS } from './copilot';
import { SIDEQUEST_PHRASES } from './sidequests';

export const WORLD_VERSION = '0.1.0';

export const WORLD: World = {
  start: 'village.cottage',
  version: WORLD_VERSION,
  rooms: { ...VILLAGE_ROOMS, ...LAKE_ROOMS, ...MONASTERY_ROOMS, ...FORTRESS_ROOMS, ...PEAKS_ROOMS, ...EXCEL_ROOMS, ...COPILOT_ROOMS },
  items: ITEMS,
  npcs: NPCS,
  globalRules: GLOBAL_RULES,
  // Side-quest phrases first so exit words win inside the realms; then the room- and region-scoped lines (Copilot, the Keep,
  // Excel's own answers to its triggers, the Lake House, the Shrine's rock) ahead of the global eggs they deliberately shadow.
  phraseRules: [...SIDEQUEST_PHRASES, ...EXCEL_PHRASES, ...COPILOT_PHRASES, ...KEEP_PHRASES, ...LAKEHOUSE_PHRASES, ...PEAKS_PHRASES, ...PHRASE_RULES],
  snark: SNARK,
  helpText: HELP_TEXT,
  ambient,
};
