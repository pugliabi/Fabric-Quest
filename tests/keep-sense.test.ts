// Spec1 §4: the Keep makes Power BI sense. The Duke of DAX is thrown by a DAX sin, not SQL.
import { describe, expect, it } from 'vitest';
import { MAX_SCORE, newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { GOLDEN_PATH } from './golden-path';

const at = (cmds: string[], flags: Record<string, boolean | number> = {}) => {
  let s = { ...newGame(WORLD, 6), room: 'fortress.throne', flags: { ...flags } };
  let last = step(s, 'look', WORLD);
  for (const c of cmds) { last = step(s, c, WORLD); s = last.state; }
  return { s, last };
};

describe("the Duke's sin (spec1 §4.1)", () => {
  it.each(['say calculated column', 'say a calculated column', "say i'll just use a calculated column", 'say add a calculated column', 'add a calculated column', "i'll use a calculated column", 'just use a calculated column', 'make a calculated column', 'add calculated column'])('%s → the moat, +25, trial.moat, back at the gate', (c) => {
    const { s, last } = at([c]);
    expect(last.output[0]).toMatch(/^'A CALCULATED COLUMN\?' The Duke rises\. 'IN\. MY\. MODEL\?'/);
    expect(last.output[0]).toMatch(/You will never not smell like this\.$/);
    expect(s.score).toBe(25); expect(s.flags['trial.moat']).toBe(true); expect(s.room).toBe('fortress.bridge');
    expect(last.stepId).toBe('fortress.moat'); expect(last.sfx).toBe('death'); expect(s.dead).toBe(false);
  });
  it('a second sin is a habit, not a second bath', () => {
    const { s, last } = at(['say calculated column'], { 'trial.moat': true, 'pts.fortress.moat': true, 'seen.fortress.bridge': true });
    expect(s.score).toBe(0); expect(last.output[0]).toBe("'Another?' The Duke just points at the window. You take the stairs.");
  });
  it('select * is corrected, not thrown', () => {
    const { s, last } = at(['say select *']);
    expect(last.output[0]).toBe("'SELECT? We EVALUATE here.' The Duke does not throw you; he corrects you, which is worse.");
    expect(s.score).toBe(0); expect(s.flags['trial.moat']).toBeUndefined(); expect(s.room).toBe('fortress.throne'); expect(last.outcome).toBe('snark');
  });
  it.each([
    ['say evaluate', /'Correct,' says the Duke, disappointed\. 'And useless\.'/],
    ['say implicit measure', /The Duke shudders\. 'Implicit\.' But he has heard worse today\./],
    ['say bidirectional', /ambiguity/],
    ['say bi-directional', /ambiguity/],
    ['say userelationship', /USERELATIONSHIP/],
    ['say calculate', /A context transition, and nothing else/],
    ['say sumx', /iterates/],
  ])('%s gets flavor, no moat', (c, re) => {
    const { s, last } = at([c]);
    expect(last.output[0]).toMatch(re); expect(s.flags['trial.moat']).toBeUndefined();
  });
  it('the hints name the sin without spelling it', () => {
    expect(WORLD.rooms['fortress.throne']!.flaskHint(newGame(WORLD, 1))).toBe('Say the thing every DAX lord despises. It has two words and it goes in a table. Or bring him a table he can despise: the date table, west of the hall.');
    expect(WORLD.rooms['fortress.throne']!.flaskHint({ ...newGame(WORLD, 1), inventory: ['date-table'] })).toBe('Show him the date table. Or say the thing every DAX lord despises; it has two words and it goes in a table. Either way, mind the window.');
    expect(WORLD.rooms['fortress.bridge']!.flaskHint({ ...newGame(WORLD, 1), flags: { 'bridge.down': true } })).toMatch(/The Duke hates one shortcut above all others\./);
    expect(WORLD.rooms['fortress.hall']!.flaskHint(newGame(WORLD, 1))).toMatch(/one shortcut above all others/);
  });
  it('select * elsewhere no longer promises a moat', () => {
    expect(step({ ...newGame(WORLD, 1), room: 'village.square' }, 'select *', WORLD).output[0]).not.toMatch(/moat/);
  });
  it('the golden path hands the Duke the date table and still scores 200 in 65', () => {
    expect(GOLDEN_PATH).toContain('give date table to duke');
    expect(GOLDEN_PATH).not.toContain('say select *');
    let s = newGame(WORLD, 42);
    for (const c of GOLDEN_PATH) s = step(s, c, WORLD).state;
    expect(s.score).toBe(MAX_SCORE); expect(s.turns).toBe(65); expect(s.won).toBe(true);
  });
});
