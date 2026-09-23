import { describe, expect, it } from 'vitest';
import { pickSnark } from '../src/engine/snark';
import { vary } from '../src/engine/quirks';
import { newGame } from '../src/engine/step';
import { WORLD } from '../src/world';

const POOL8 = ['l0', 'l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7'];

describe('the pool hash reaches every line (F12)', () => {
  it('pickSnark: over turns 0..99 with one seed, every index of an 8-line pool is hit', () => {
    for (const seed of [1, 2, 42, 0x9e3779b9]) {
      const hit = new Set<string>();
      for (let turn = 0; turn < 100; turn++) hit.add(pickSnark(seed, turn, POOL8));
      expect([...hit].sort(), `seed ${seed}`).toEqual(POOL8);
    }
  });
  it('vary: over turns 0..99 with one seed, every index of an 8-line pool is hit', () => {
    const s0 = newGame(WORLD, 1);
    const hit = new Set<string>();
    for (let turns = 0; turns < 100; turns++) hit.add(vary({ ...s0, turns }, POOL8));
    expect([...hit].sort()).toEqual(POOL8);
  });
  it('two consecutive turns never get the same line, and every line comes up in each window of n turns', () => {
    for (const seed of [1, 2, 7, 1234567]) for (let n = 2; n <= 12; n++) {
      const pool = Array.from({ length: n }, (_, i) => `l${i}`);
      const picks = Array.from({ length: 200 }, (_, t) => pickSnark(seed, t, pool));
      for (let t = 1; t < picks.length; t++) expect(picks[t], `seed ${seed} n ${n} turn ${t}`).not.toBe(picks[t - 1]);
      for (let b = 0; b + n <= picks.length; b += n) expect(new Set(picks.slice(b, b + n)).size, `seed ${seed} n ${n} bag ${b / n}`).toBe(n);
    }
  });
  it('is deterministic: same seed + turn, same line', () => {
    expect(pickSnark(7, 13, POOL8)).toBe(pickSnark(7, 13, POOL8));
  });
});
