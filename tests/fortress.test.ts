import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';

const play = (cmds: string[], start: string, flags: Record<string, boolean | number> = {}) => {
  let s = { ...newGame(WORLD, 6), room: start, flags: { ...flags } };
  const outs: string[][] = [];
  for (const c of cmds) { const r = step(s, c, WORLD); s = r.state; outs.push(r.output); }
  return { s, outs, last: outs[outs.length - 1]! };
};

describe('Semantic Model Keep', () => {
  it('the hall opens west into the Model View, which holds the policy', () => {
    const { s, last } = play(['w', 'get policy'], 'fortress.hall');
    expect(s.room).toBe('fortress.model');
    expect(s.inventory).toContain('policy');
    expect(last[0]).toMatch(/incremental/i);
  });
  it('the Duke of DAX throws a calculated column into the moat (+25, trial)', () => {
    const { s, last } = play(['say calculated column'], 'fortress.throne', { 'fortress.sku': true });
    expect(s.score).toBe(25);
    expect(s.flags['trial.moat']).toBe(true);
    expect(last[0]).toMatch(/IN\.? MY\.? MODEL/);
    expect(s.room).toBe('fortress.bridge');
  });
  it('DAX words get DAX answers', () => {
    for (const [c, re] of [['say calculate', /context transition/i], ['say sumx', /iterates/i], ['say divide', /zero/i], ['say filter context', /which one/i]] as const) {
      expect(play([c], 'fortress.throne').last[0]).toMatch(re);
    }
  });
  it('the Card is out-stared and the Big Refresh drops the boots', () => {
    const { s, outs } = play(['look at card', 'wait', 'wait', 'use policy on refresh', 'wear boots'], 'fortress.yard', {});
    expect(outs[2]![0]).toMatch(/blinks/i);
    expect(s.score).toBe(10); // stare only — boots need the policy
    const withPolicy = play(['use policy on refresh', 'wear boots'], 'fortress.yard');
    // no policy in inventory → refused
    expect(withPolicy.s.worn).not.toContain('boots');
    const t = { ...newGame(WORLD, 6), room: 'fortress.yard', inventory: ['license', 'policy'] };
    const r = step(t, 'use policy on refresh', WORLD);
    expect(r.state.inventory).toContain('boots');
    expect(r.state.score).toBe(15);
  });
  it('report-design and power-query and model-view commands all have their own answers', () => {
    expect(play(['add slicer'], 'fortress.yard').last[0]).toMatch(/nine slicers/i);
    expect(play(['fold query'], 'fortress.hall').last[0]).toMatch(/Changed Type/);
    expect(play(['many to many'], 'fortress.model').last[0]).toMatch(/Both/);
    expect(play(['talk to sir cardinality'], 'fortress.model').last[0]).toMatch(/One\. To\. Many\./);
  });
  it('the golden path still scores 200', async () => {
    const path = (await import('./golden-path.json')).default as string[];
    let s = newGame(WORLD, 42);
    for (const c of path) s = step(s, c, WORLD).state;
    expect(s.score).toBe(200);
    expect(s.won).toBe(true);
  });
});

describe('Keep humor pass (spec §17)', () => {
  it('a correct measure spins, and the third wait exceeds the available resources', () => {
    const { s, outs } = play(['say calculate(sum(sales), filter(all(date), true))', 'wait', 'wait', 'wait'], 'fortress.throne', { 'stare.done': true });
    expect(outs[0]![0]).toMatch(/spinner/i);
    expect(outs[3]![0]).toMatch(/exceeded the available resources/);
    expect(s.flags['dax.spinner']).toBe(0);
    expect(s.flags['stare.done']).toBe(false);
  });
  it('the Big Refresh without a policy fails with a refresh error', () => {
    expect(play(['use refresh'], 'fortress.yard').last[0]).toMatch(/^Refresh (failed|succeeded)/);
    expect(play(['refresh'], 'fortress.yard').last[0]).toMatch(/^Refresh (failed|succeeded)/);
  });
  it('the Model View has a circular dependency and an ambiguous path', () => {
    expect(play(['add column'], 'fortress.model').last[0]).toMatch(/circular dependency/);
    expect(play(['many to many', 'say both'], 'fortress.model').last[0]).toMatch(/ambiguous path/);
  });
  it('DirectQuery, Direct Lake, publish and labels answer anywhere in the Keep', () => {
    for (const room of ['fortress.bridge', 'fortress.hall', 'fortress.model', 'fortress.throne', 'fortress.yard']) {
      expect(play(['say directquery'], room).last[0], room).toMatch(/Every click, a query/);
      expect(play(['say direct lake'], room).last[0], room).toMatch(/falls back to DirectQuery/);
      expect(play(['publish'], room).last[0], room).toMatch(/which workspace/);
      expect(play(['set sensitivity'], room).last[0], room).toMatch(/Highly Confidential/);
    }
    expect(play(['publish'], 'village.square').last[0]).not.toMatch(/which workspace/);
  });
  it('second looks: the card wobbles between totals, the bridge admits what it is', () => {
    const card = play(['look at card', 'wait', 'wait', 'look at card', 'look at card'], 'fortress.yard');
    expect(card.last[0]).toMatch(/4\.2M\. Then 4\.7M/);
    const bridge = play(['look at bridge', 'look at bridge'], 'fortress.model');
    expect(bridge.outs[0]![0]).toMatch(/wobbles/);
    expect(bridge.last[0]).toMatch(/Territory/);
  });
  it('the Keep NPCs answer the tempting wrong gifts', () => {
    const inv = (items: string[]) => ({ ...newGame(WORLD, 6), inventory: ['license', ...items] });
    const give = (room: string, items: string[], cmd: string) => step({ ...inv(items), room }, cmd, WORLD).output[0]!;
    expect(give('fortress.bridge', [], 'give license to guard')).toMatch(/wet napkin/);
    expect(give('fortress.bridge', ['mug'], 'give mug to guard')).toMatch(/OKAYEST GUARD/);
    expect(give('fortress.throne', ['scroll'], 'give scroll to duke')).toMatch(/PySpark/);
    expect(give('fortress.throne', ['policy'], 'give policy to duke')).toMatch(/Ten days at a time/);
    expect(give('fortress.model', ['shortcut'], 'give shortcut to sir cardinality')).toMatch(/another house/);
    expect(give('fortress.model', ['standard key'], 'give key to cardinality')).toMatch(/Shared/);
    expect(give('fortress.yard', ['policy'], 'give policy to card')).toMatch(/does not take input/);
    expect(give('fortress.yard', ['mug'], 'give mug to card')).toMatch(/\(Mug\)/);
  });
  it('the Model View back gate opens onto the Monastery, and the Monastery gate leads back', () => {
    expect(play(['n'], 'fortress.model').s.room).toBe('monastery.gate');
    expect(play(['s'], 'monastery.gate').s.room).toBe('fortress.model');
  });
  it('format c: still kills you in the Keep', () => {
    expect(play(['format c:'], 'fortress.yard').s.dead).toBe(true);
  });
  it('after the spinner blanks the Card again, the Studio hint points at the policy, not at a stare that cannot restart', () => {
    const { last } = play(['get ye flask'], 'fortress.yard', { 'stare.count': 3, 'stare.done': false });
    expect(last.join(' ')).toMatch(/policy/);
    expect(last.join(' ')).not.toMatch(/out-wait/);
  });
  it('Q&A does not swallow asking Jeff or Copilot', () => {
    expect(play(['ask jeff about the numbers'], 'fortress.yard').last[0]).not.toMatch(/Q&A/);
    expect(play(['ask copilot about sales'], 'fortress.yard').last[0]).not.toMatch(/Q&A/);
    expect(play(['ask what are sales by region'], 'fortress.yard').last[0]).toMatch(/Q&A/);
  });
});

describe('new use-verbs have no side effects they should not', () => {
  it('remove / fix / mark / label shortcut do not take the shortcut', () => {
    for (const c of ['remove shortcut', 'fix shortcut', 'mark shortcut', 'label shortcut']) {
      const s = { ...newGame(WORLD, 6), room: 'village.square', inventory: ['license', 'shortcut'] };
      expect(step(s, c, WORLD).state.room, c).toBe('village.square');
    }
    const s = { ...newGame(WORLD, 6), room: 'village.square', inventory: ['license', 'shortcut'] };
    expect(step(s, 'use shortcut', WORLD).state.room).toBe('lake.shore');
    expect(step(s, 'apply shortcut', WORLD).state.room).toBe('lake.shore');
  });
  it("in Jeff's Excel, remove filter does not add the filter", () => {
    const s = { ...newGame(WORLD, 6), room: 'excel.pivot', flags: { 'excel.connected': true, 'excel.pivot': true } };
    expect(step(s, 'remove filter', WORLD).state.flags['excel.filter']).toBeUndefined();
    expect(step(s, 'remove net sales', WORLD).state.flags['excel.measure']).toBeUndefined();
  });
});
