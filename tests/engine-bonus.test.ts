import { describe, expect, it } from 'vitest';
import { applyRuleForTest, newGame, step } from '../src/engine/step';
import { roomFromIndex, roomIndex } from '../src/engine/builtins';
import { WORLD } from '../src/world';
import type { Rule } from '../src/world/types';

describe('bonus points', () => {
  it('newGame starts with bonus 0 and step keeps flags.bonus in sync', () => {
    const s = newGame(WORLD, 1);
    expect(s.bonus).toBe(0);
    const r = step(s, 'look', WORLD);
    expect(r.state.flags.bonus).toBe(0);
  });
  it('a rule with then.bonus awards once and never touches score', () => {
    const rule: Rule = { id: 'test.bonus', when: { verb: 'wait' }, then: { text: 'ding', bonus: 20 } };
    const s = { ...newGame(WORLD, 1), room: 'village.cottage' };
    const once = applyRuleForTest(s, rule, WORLD);
    expect(once.state.bonus).toBe(20);
    expect(once.state.score).toBe(0);
    expect(once.pointsAwarded).toBe(0);
    const twice = applyRuleForTest(once.state, rule, WORLD);
    expect(twice.state.bonus).toBe(20);
  });
});

describe('returnTo', () => {
  it('roomFromIndex inverts roomIndex', () => {
    expect(roomFromIndex(roomIndex('fortress.yard', WORLD), WORLD)).toBe('fortress.yard');
    expect(roomFromIndex(999, WORLD)).toBeUndefined();
  });
  it('a rule with returnTo moves to the room stored in sq.return and describes it', () => {
    const rule: Rule = { id: 'test.return', when: { verb: 'wait' }, then: { text: 'back you go', returnTo: true } };
    const s = { ...newGame(WORLD, 1), room: 'village.mill', flags: { 'sq.return': roomIndex('fortress.yard', WORLD) } };
    const r = applyRuleForTest(s, rule, WORLD);
    expect(r.state.room).toBe('fortress.yard');
    expect(r.output.join(' ')).toContain('THE REPORT STUDIO');
    expect(r.outcome).toBe('move');
  });
});

describe('score line', () => {
  it('mentions the bonus only when there is one', () => {
    const s = newGame(WORLD, 1);
    expect(step(s, 'score', WORLD).output[0]).toBe('Score : 0 of 200, in 1 turns.');
    expect(step({ ...s, bonus: 25 }, 'score', WORLD).output[0]).toBe('Score : 0 of 200 (+25 bonus), in 1 turns.');
  });
});
