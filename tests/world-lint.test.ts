import { it, expect } from 'vitest';
import { lintWorld } from '../src/world/lint';
import { WORLD } from '../src/world';
import { SIDE_REGIONS } from '../src/world/types';
import { SETTING_KEYS } from '../src/engine/governance';
import { SETTINGS } from '../src/world/sacristy';

it('world has no dangling references or unreachable rooms', () => {
  expect(lintWorld(WORLD)).toEqual([]);
});

it('world has exactly 26 main-quest rooms (side-quest realms excluded) and every room has a flask hint', () => {
  expect(Object.values(WORLD.rooms).filter((r) => !SIDE_REGIONS.has(r.region))).toHaveLength(26);
});

it('the lint catches a missing brushOff, a missing catalog entry, and an empty catalog field', () => {
  const noBrush = { ...WORLD, npcs: { ...WORLD.npcs, jeff: { ...WORLD.npcs.jeff!, brushOff: undefined } } };
  expect(lintWorld(noBrush)).toContain('npc jeff: missing brushOff');
  expect(lintWorld({ ...WORLD, rooms: { ...WORLD.rooms, 'monastery.sacristy': { ...WORLD.rooms['monastery.sacristy']!, items: [] } } })).toContain('setting export: no book item in the Sacristy');
  expect(SETTINGS.map((b) => b.key).sort()).toEqual([...SETTING_KEYS].sort());
});
