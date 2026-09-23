import type { World } from './types';
import { ITEMS } from './items';
import { NPCS } from './npcs';
import { GLOBAL_RULES, HELP_TEXT, HINT_PHRASES, PHRASE_RULES, SNARK, VOICE_PHRASES, ambient } from './globals';
import { VILLAGE_PHRASES, VILLAGE_ROOMS, WORKSPACE_PHRASES } from './village';
import { LAKE_PHRASES, LAKE_ROOMS, LAKEHOUSE_PHRASES } from './lake';
import { MONASTERY_PHRASES, MONASTERY_ROOMS } from './monastery';
import { FORTRESS_ROOMS, KEEP_PHRASES } from './fortress';
import { PEAKS_PHRASES, PEAKS_ROOMS } from './peaks';
import { EXCEL_PHRASES, EXCEL_ROOMS } from './excel';
import { COPILOT_PHRASES, COPILOT_ROOMS } from './copilot';
import { GOAL_PHRASES, SIDEQUEST_PHRASES } from './sidequests';
import { GATE_PHRASES } from './gates';
import { APPLIED_STEP_PHRASES } from './applied-steps';
import { GOVERNANCE_PHRASES, SACRISTY_PHRASES, SACRISTY_ROOM } from './sacristy';
import { HALL_ROOM, TOWNHALL_PHRASES } from './townhall';
import { DEATH_PHRASES } from './deaths';

export const WORLD_VERSION = '0.1.0';

export const WORLD: World = {
  start: 'village.cottage',
  version: WORLD_VERSION,
  // The Town Hall goes LAST, not next to the village: saves store rooms by index (roomIndex: `droppedIn.<item>`,
  // `sq.return`), so a room appended at the end shifts nobody. Only god mode's listing order notices.
  rooms: { ...VILLAGE_ROOMS, ...LAKE_ROOMS, ...MONASTERY_ROOMS, [SACRISTY_ROOM.id]: SACRISTY_ROOM, ...FORTRESS_ROOMS, ...PEAKS_ROOMS, ...EXCEL_ROOMS, ...COPILOT_ROOMS, [HALL_ROOM.id]: HALL_ROOM },
  items: ITEMS,
  npcs: NPCS,
  globalRules: GLOBAL_RULES,
  // Side-quest phrases first so exit words win inside the realms; then `goal` (its region-scoped copies answer inside the
  // realms, the global one everywhere else, ahead of egg.what); then `hint` (its pane copy answers inside Copilot, the
  // global one everywhere else, ahead of egg.what's `what now`); then the governance phrases (the survey's bare-number
  // reply, global, gated on Product Feedback being on); then the room- and region-scoped lines (Copilot, the
  // Sacristy — room-scoped, so `enable export to excel` flips the book instead of tripping egg.excel, and `restore
  // defaults` is a reset, not the builtin restore — the Town Hall — its bell, and the Square's steps up to it, which
  // beat the global egg.climb — My Workspace's Publish dialog, cottage-scoped, so `publish` there is a menu and not
  // the global egg.publish — the village's gag phrases (Task F4: the well, the candle, the mug, the wheel, the crows;
  // room- or region-scoped, so they beat the global egg.jump / egg.climb / egg.swim / egg.boo / egg.push, and none
  // shadows the Mill's chest gate: no gate verb on a gate noun) — the lake's and the marshes' gag phrases (Task F5: the
  // pebble thrown, the boat sat in and rowed, the hum and the weeping at the dock, the columns named, and one smell, swim
  // and dig per marsh layer; room-scoped, so they beat the global egg.throw / egg.sit / egg.sing / egg.cry / egg.smell /
  // egg.swim / egg.dig, and none uses a gate verb on a gate noun, so the Dock's OFFLINE gate keeps its verbs) — the
  // hall's Applied Steps — its door pokes now, the step commands in
  // Task E6, ahead of the Keep's own `changed type` / `remove columns` lines — the gates — room-scoped, so they beat the
  // global egg.push/egg.kick/egg.climb and the rooms' own use/open rules for the gate nouns — the Keep, Excel's own
  // answers to its triggers, the Lake House, the Shrine's rock) ahead of the global eggs they deliberately shadow; then
  // the new deaths (room-scoped: the Fields' `refresh`, the Model View's Both, the Studio's other page, My Workspace's
  // `merge`, the hall's DAX — they beat the global egg.refresh / egg.dax; the Keep's own `merge` is hall-scoped anyway);
  // then the voice phrases (`where` — its pane copy answers inside Copilot — and bare `why`, which must beat egg.why's
  // "why me"), right before the global eggs.
  phraseRules: [...SIDEQUEST_PHRASES, ...GOAL_PHRASES, ...HINT_PHRASES, ...GOVERNANCE_PHRASES, ...EXCEL_PHRASES, ...COPILOT_PHRASES, ...SACRISTY_PHRASES, ...TOWNHALL_PHRASES, ...WORKSPACE_PHRASES, ...VILLAGE_PHRASES, ...LAKE_PHRASES, ...MONASTERY_PHRASES, ...APPLIED_STEP_PHRASES, ...GATE_PHRASES, ...KEEP_PHRASES, ...LAKEHOUSE_PHRASES, ...PEAKS_PHRASES, ...DEATH_PHRASES, ...VOICE_PHRASES, ...PHRASE_RULES],
  snark: SNARK,
  helpText: HELP_TEXT,
  ambient,
};
