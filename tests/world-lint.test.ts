import { it, expect } from 'vitest';
import { lintWorld } from '../src/world/lint';
import { WORLD } from '../src/world';

it('world has no dangling references or unreachable rooms', () => {
  expect(lintWorld(WORLD)).toEqual([]);
});

it('world has exactly 22 rooms and every room has a flask hint', () => {
  expect(Object.keys(WORLD.rooms)).toHaveLength(22);
});
