import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';

describe('entrance quips', () => {
  it('every room has one', () => {
    for (const r of Object.values(WORLD.rooms)) expect(typeof r.enterQuip, r.id).toBe('function');
  });
  it('fires as a notice the first time only', () => {
    const s = newGame(WORLD, 1);
    const first = step(s, 'out', WORLD);
    expect(first.notice).toBeTruthy();
    expect(first.state.flags['seen.village.square']).toBe(true);
    const back = step(first.state, 'w', WORLD);
    const again = step(back.state, 'out', WORLD);
    expect(again.notice).toBeUndefined();
  });
  it('the quip is also in the text output', () => {
    const r = step(newGame(WORLD, 1), 'out', WORLD);
    expect(r.output.join('\n')).toContain(r.notice!);
  });
});
