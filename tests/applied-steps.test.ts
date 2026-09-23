// Spec2 §8: the hall's query is rebuilt step by step, in order, for +10; out of order you get the real M error.
import { describe, expect, it } from 'vitest';
import { MAX_SCORE, newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { APPLIED_STEP_PHRASES, STEPS, applyStep } from '../src/world/applied-steps';
import type { GameState } from '../src/engine/types';
import { GOLDEN_PATH } from './golden-path';

const hall = (flags: Record<string, boolean | number> = {}): GameState => ({ ...newGame(WORLD, 6), room: 'fortress.hall', flags });
const run = (cmds: string[], flags = {}) => {
  let s = hall(flags);
  const rs = [];
  for (const c of cmds) { const r = step(s, c, WORLD); s = r.state; rs.push(r); }
  return { s, rs, outs: rs.map((r) => r.output[0]!) };
};
const CHAIN = ['source', 'navigate', 'promote headers', 'change type', 'filter rows', 'remove other columns', 'rename columns'];

describe('Applied Steps in order (spec2 §8)', () => {
  it('the happy chain pays +10 once, with the seven success lines', () => {
    const { s, rs, outs } = run(CHAIN);
    expect(outs[0]).toBe('Source: the server name is wrong. It has been wrong since the migration. It connects anyway.');
    expect(outs[6]).toBe("Renamed Columns: 'Column3' becomes 'Year'. The hall applauds. Refresh complete.");
    expect(rs.map((r) => r.stepId)).toEqual(['pq.step.1', 'pq.step.2', 'pq.step.3', 'pq.step.4', 'pq.step.5', 'pq.step.6', 'pq.done']);
    expect(rs[6]!.bonusAwarded).toBe(10); expect(rs[6]!.sfx).toBe('bonus');
    expect(s.bonus).toBe(10); expect(s.score).toBe(0); expect(s.flags['pq.step']).toBe(7); expect(s.flags['pq.done']).toBe(true);
    const again = step(s, 'rename columns', WORLD);
    expect(again.output[0]).toBe('The query refreshes. 4.2M. It was always 4.2M.'); expect(again.state.bonus).toBe(10);
    expect(again.stepId).toBe('pq.after');
  });
  it('the first six are successes with the success cue; only the last is the bonus', () => {
    const { rs } = run(CHAIN);
    for (const r of rs.slice(0, 6)) { expect(r.outcome).toBe('success'); expect(r.sfx).toBe('success'); expect(r.bonusAwarded ?? 0).toBe(0); }
    expect(rs[6]!.outcome).toBe('success');
  });
  it('every synonym applies its step', () => {
    for (const [j, cmds] of [[1, ['add source', 'get data', 'apply source']], [2, ['navigation', 'apply navigation', 'pick table']], [3, ['promoted headers', 'use first row as headers']], [4, ['changed type', 'detect type']], [5, ['filtered rows', 'filter']], [6, ['removed other columns', 'remove columns']], [7, ['renamed columns', 'rename']]] as const) {
      for (const c of cmds) expect(run([c], { 'pq.step': j - 1 }).s.flags['pq.step'], c).toBe(j);
    }
  });
  it('`apply [the] <step> [step]` applies every one of the seven: the hall is Applied Steps (fix round 1, I1)', () => {
    STEPS.forEach((name, i) => {
      const j = i + 1;
      const noun = name.toLowerCase();
      for (const c of [`apply ${noun}`, `apply the ${noun}`, `apply the ${noun} step`, `apply ${noun} step`, `apply ${CHAIN[i]}`]) {
        const r = run([c], { 'pq.step': i });
        expect(r.s.flags['pq.step'], c).toBe(j);
        expect(r.rs[0]!.stepId, c).toBe(j === 7 ? 'pq.done' : `pq.step.${j}`);
      }
    });
    // And out of turn, `apply` gets the error like any other spelling: never the builtin shrug.
    expect(run(['apply changed type']).rs[0]!.stepId).toBe('pq.error.4');
    expect(run(['apply the renamed columns step'], { 'pq.step': 2 }).rs[0]!.stepId).toBe('pq.error.7');
  });
  it.each([
    [0, 'navigate', "Formula.Firewall: Query 'Sales' (step 'Source') references other queries or steps, so it may not directly access a data source. Please rebuild this data combination."],
    [0, 'rename columns', "Formula.Firewall: Query 'Sales' (step 'Source') references other queries or steps, so it may not directly access a data source. Please rebuild this data combination."],
    [1, 'promote headers', "Expression.Error: The key didn't match any rows in the table."],
    [1, 'filter rows', "Expression.Error: The key didn't match any rows in the table."],
    [2, 'change type', "Expression.Error: The column 'Region' of the table wasn't found. Details: Region"],
    [3, 'filter rows', 'Expression.Error: We cannot convert the value "Total" to type Number. Details: Value=Total Type=[Type]'],
    [4, 'remove other columns', 'Expression.Error: We cannot convert the value "Total" to type Number.'],
    [5, 'rename columns', "Expression.Error: The column 'Year' of the table wasn't found. Details: Year"],
  ])('at step %i, %s errors', (k, c, err) => {
    const { s, outs, rs } = run([c], { 'pq.step': k });
    expect(outs[0]).toContain(err);
    expect(outs[0]).toContain(`Every step after it turns yellow. You are back at ${k === 0 ? 'the start. There is no Source.' : ['Source', 'Navigation', 'Promoted Headers', 'Changed Type', 'Filtered Rows'][k - 1] + '.'}`);
    expect(s.flags['pq.step'] ?? 0).toBe(k); expect(rs[0]!.outcome).toBe('fail');
  });
  it('the errors are real M: the Firewall names its step, a missing column is in Details, and no Column1 or Column3 where Power Query would not say it', () => {
    const errors = [0, 1, 2, 3, 4, 5].map((k) => run(['rename columns'], { 'pq.step': k }).outs[0]!.split('\n')[0]!);
    expect(errors[0]).toContain("Query 'Sales' (step 'Source')");
    expect(errors[2]).toMatch(/Details: Region$/);
    expect(errors[5]).toMatch(/Details: Year$/);
    for (const e of errors) { expect(e).not.toMatch(/Column[13]/); expect(e).toMatch(/^(Formula\.Firewall|Expression\.Error): /); }
  });
  it('the error is the real one, then exactly one narrator line, and the step id says which step tripped', () => {
    const { outs, rs } = run(['rename columns'], { 'pq.step': 2 });
    expect(outs[0]!.split('\n')).toEqual(["Expression.Error: The column 'Region' of the table wasn't found. Details: Region", 'Every step after it turns yellow. You are back at Navigation.']);
    expect(rs[0]!.stepId).toBe('pq.error.7');
    expect(rs[0]!.bonusAwarded ?? 0).toBe(0);
  });
  it('re-applying: Changed Type1, and the past for the others', () => {
    expect(run(['change type'], { 'pq.step': 5 }).outs[0]).toBe('Changed Type1. Power Query adds a new one. It always will.');
    expect(run(['source'], { 'pq.step': 5 }).outs[0]).toBe('Source is already applied. Clicking it again shows you the past. Everything after it greys out, waiting.');
    expect(run(['source'], { 'pq.step': 5 }).s.flags['pq.step']).toBe(5);
    expect(run(['change type'], { 'pq.step': 5 }).rs[0]!.stepId).toBe('pq.repeat.4');
    expect(run(['change type'], { 'pq.step': 5 }).s.flags['pq.step']).toBe(5);
    expect(run(['filter rows'], { 'pq.step': 5 }).rs[0]!.stepId).toBe('pq.repeat.5');
  });
  it('Changed Type1 becomes Changed Type2, then 3, mid-chain and after the refresh (fix round 1, M5)', () => {
    const mid = run(['change type', 'change type', 'change type'], { 'pq.step': 5 });
    expect(mid.outs).toEqual(['Changed Type1. Power Query adds a new one. It always will.', 'Changed Type2. Power Query adds another. It always will.', 'Changed Type3. Power Query adds another. It always will.']);
    expect(mid.s.flags['pq.step']).toBe(5); expect(mid.s.flags['pq.changed']).toBe(3); expect(mid.s.bonus).toBe(0);
    for (const r of mid.rs) { expect(r.stepId).toBe('pq.repeat.4'); expect(r.outcome).toBe('snark'); }
    // After the refresh, Changed Type is still Changed Type: the counter carries on; every other step gets the 4.2M line.
    const done = run([...CHAIN, 'change type', 'changed type', 'source']);
    expect(done.outs.slice(7)).toEqual(['Changed Type1. Power Query adds a new one. It always will.', 'Changed Type2. Power Query adds another. It always will.', 'The query refreshes. 4.2M. It was always 4.2M.']);
    expect(done.s.bonus).toBe(10); expect(done.s.flags['pq.done']).toBe(true);
    const carried = run([...CHAIN.slice(0, 4), 'change type', ...CHAIN.slice(4), 'change type']);
    expect(carried.outs[4]).toMatch(/^Changed Type1\./); expect(carried.outs[8]).toMatch(/^Changed Type2\./);
  });
  it('`use custom1` and `look at custom1` agree on what Custom1 hangs off, before and after the refresh (fix round 1, M4)', () => {
    const open = (flags: Record<string, boolean | number>) => [1, 2, 3, 4, 5, 6].map((seed) => step({ ...hall(flags), seed, turns: seed }, 'use custom1', WORLD).output[0]!).filter((l) => /Table\.AddColumn/.test(l));
    const before = open({});
    const after = open({ 'pq.step': 7, 'pq.done': true });
    expect(before.length).toBeGreaterThan(0); expect(after.length).toBeGreaterThan(0);
    for (const l of before) expect(l).toContain('#"Changed Type"');
    for (const l of after) { expect(l).toContain('#"Renamed Columns"'); expect(l).not.toContain('#"Changed Type"'); }
  });
  it('the narrator\'s whisper does not nest brackets around the hall\'s hint (fix round 1, M6; the flask hint is tier 3 since Task B4)', () => {
    const DEAD = ['get csv', 'get sword', 'get csv', 'get sword'];
    const { rs, s } = run([...DEAD, ...DEAD, ...DEAD], { 'pq.step': 4 });
    expect(s.stuck).toBe(12);
    const last = rs[11]!.output[rs[11]!.output.length - 1]!;
    expect(last).toBe('Psst. North. Insult the Duke properly and he will do the rest. He hates one shortcut above all others. Or bring him the date table from the Model View, west. (Optional, for the bonus: the query is broken at step 5: Filtered Rows. `look at steps`.)');
    expect(last).not.toMatch(/\(\(|\)\)/);
    // The first two tiers (Task B4) carry no brackets of their own, so they wrap: the order at 4, the waiting step at 8.
    expect(rs[3]!.output[rs[3]!.output.length - 1]).toBe("(Psst. Seven doorways, one of them waiting, and the hall won't let you skip it. Queries are like that. You do them in order or you do them again.)");
    expect(rs[7]!.output[rs[7]!.output.length - 1]).toBe("(Psst. The waiting doorway is step 5, Filtered Rows. Steps aren't walked through. They're applied.)");
    // Elsewhere the whisper keeps its brackets.
    let c = { ...newGame(WORLD, 6) };
    let out: string[] = [];
    for (const cmd of DEAD) { const r = step(c, cmd, WORLD); c = r.state; out = r.output; }
    expect(out[out.length - 1]).toMatch(/^\(Psst\. .*\)$/);
  });
  it('the flask hint leads with the broken step; look at query lists the state', () => {
    expect(WORLD.rooms['fortress.hall']!.flaskHint(hall({ 'pq.step': 3 }))).toMatch(/\(Optional, for the bonus: the query is broken at step 4: Changed Type\. `look at steps`\.\)$/);
    expect(WORLD.rooms['fortress.hall']!.flaskHint(hall({ 'pq.step': 7, 'pq.done': true }))).not.toMatch(/broken/);
    expect(run(['look at query'], { 'pq.step': 3 }).outs[0]).toContain('✓ Source ✓ Navigation ✓ Promoted Headers ✗ Changed Type (waiting) · yellow: Filtered Rows, Removed Other Columns, Renamed Columns');
    expect(run(['look at query']).outs[0]).toMatch(/^Sales — 7 steps, 1 error\./);
    expect(run(['look at custom1'], { 'pq.done': true }).outs[0]).toBe('Custom1: = Table.AddColumn(#"Renamed Columns", "Custom", each 1). It was a placeholder. It shipped.');
  });
  it('the flask hint keeps its old tail after the clause, and the clause goes away once the query refreshes', () => {
    expect(WORLD.rooms['fortress.hall']!.flaskHint(hall())).toBe('North. Insult the Duke properly and he will do the rest. He hates one shortcut above all others. Or bring him the date table from the Model View, west. (Optional, for the bonus: the query is broken at step 1: Source. `look at steps`.)');
    expect(WORLD.rooms['fortress.hall']!.flaskHint(hall({ 'pq.step': 7, 'pq.done': true }))).toBe('North. Insult the Duke properly and he will do the rest. He hates one shortcut above all others. Or bring him the date table from the Model View, west.');
  });
  it('the query is scenery: 0 errors once done, and it cannot be taken', () => {
    expect(run(['look at sales query'], { 'pq.step': 7, 'pq.done': true }).outs[0]).toMatch(/^Sales — 7 steps, 0 errors\./);
    expect(run(['get query']).outs[0]).toBe('The query is the hall. Take it and you are standing in a Formula.Firewall.');
    expect(run(['look at custom1']).outs[0]).toBe('Custom1. A step. Nobody knows what it does. Everyone is afraid to delete it.');
  });
  it('applyStep is pure and typed: the same call twice gives the same answer', () => {
    const s = hall({ 'pq.step': 2 });
    expect(applyStep(s, 3)).toEqual(applyStep(s, 3));
    expect(applyStep(s, 3).id).toBe('pq.step.3');
    expect(applyStep(s, 5).id).toBe('pq.error.5');
    expect(applyStep(s, 1).id).toBe('pq.repeat.1');
    expect(applyStep(hall({ 'pq.step': 6 }), 7).then.bonus).toBe(10);
    expect(applyStep(hall({ 'pq.step': 6 }), 7).then.pointsKey).toBe('pq.done');
  });
  it('the step commands are hall-scoped phrases after the door poke, one per step, each spelling claiming exactly one step', () => {
    const ids = APPLIED_STEP_PHRASES.map((p) => p.id);
    expect(ids[0]).toBe('hall.door');
    expect(ids.slice(1)).toEqual([1, 2, 3, 4, 5, 6, 7].map((j) => `pq.cmd.${j}`));
    for (const p of APPLIED_STEP_PHRASES) expect(p.room, p.id).toBe('fortress.hall');
    const cmds = APPLIED_STEP_PHRASES.filter((p) => p.id.startsWith('pq.cmd.'));
    for (const c of [...CHAIN, 'add source', 'get data', 'apply source', 'navigation', 'apply navigation', 'pick table', 'promoted headers', 'use first row as headers', 'changed type', 'detect type', 'filtered rows', 'filter', 'removed other columns', 'remove columns', 'renamed columns', 'rename']) {
      expect(cmds.filter((p) => p.test.test(c)).length, c).toBe(1);
    }
  });
  it('the old `remove columns` lines are gone: step 6 owns them', () => {
    const ruleIds = Object.values(WORLD.rooms).flatMap((r) => r.rules.map((x) => x.id));
    expect(ruleIds).not.toContain('fortress.remove-columns');
    expect(WORLD.phraseRules.map((p) => p.id)).not.toContain('fortress.remove-columns-words');
    expect(run(['remove other columns']).rs[0]!.stepId).toBe('pq.error.6');
    expect(run(['remove columns'], { 'pq.step': 5 }).rs[0]!.stepId).toBe('pq.step.6');
    // A bare `use columns` is a poke at the steps now, not the old line and not the builtin shrug.
    const poke = run(['use columns']);
    expect(poke.rs[0]!.stepId).toBe('fortress.use-steps');
    expect(poke.outs[0]).not.toMatch(/You remove other columns/);
    expect(poke.s.flags['pq.step']).toBeUndefined();
  });
  it('outside the hall the step words mean nothing special', () => {
    const r = step({ ...newGame(WORLD, 6), room: 'fortress.bridge' }, 'source', WORLD);
    expect(r.stepId).not.toMatch(/^pq\./);
    expect(r.state.flags['pq.step']).toBeUndefined();
  });
  it('golden path + the applied steps on the way through the hall: 200 + 10 (spec2 §12)', () => {
    const at = GOLDEN_PATH.indexOf('use trial') + 2; // the `n` after `use trial` is the first step into the hall
    expect(GOLDEN_PATH[at - 1]).toBe('n');
    const path = [...GOLDEN_PATH.slice(0, at), ...CHAIN, ...GOLDEN_PATH.slice(at)];
    let s = newGame(WORLD, 42);
    let paid = 0;
    for (const cmd of path) {
      const r = step(s, cmd, WORLD);
      expect(r.state.dead, cmd).toBe(false);
      paid += r.bonusAwarded ?? 0;
      s = r.state;
    }
    expect(s.score).toBe(MAX_SCORE); expect(s.bonus).toBe(10); expect(paid).toBe(10); expect(s.won).toBe(true);
    expect(s.turns).toBe(65 + CHAIN.length);
  });
});
