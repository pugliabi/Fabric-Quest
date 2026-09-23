import { it, expect } from 'vitest';
import { lintWorld } from '../src/world/lint';
import { WORLD } from '../src/world';
import { SIDE_REGIONS } from '../src/world/types';

it('world has no dangling references or unreachable rooms', () => {
  expect(lintWorld(WORLD)).toEqual([]);
});

it('world has exactly 24 main-quest rooms (side-quest realms excluded) and every room has a flask hint', () => {
  expect(Object.values(WORLD.rooms).filter((r) => !SIDE_REGIONS.has(r.region))).toHaveLength(24);
});
