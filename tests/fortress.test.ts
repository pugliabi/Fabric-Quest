import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { GOLDEN_PATH } from './golden-path';

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
  it('the Duke of DAX throws the date table into the moat, and you with it (+20, trial)', () => {
    const { s, last } = play(['give date table to duke'], 'fortress.throne', { 'fortress.sku': true });
    expect(s.score).toBe(0); // no table in hand
    const t = { ...s, inventory: ['date-table'] };
    const r = step(t, 'give date table to duke', WORLD);
    expect(r.state.score).toBe(20);
    expect(r.state.flags['trial.moat']).toBe(true);
    expect(r.output[0]).toMatch(/IN\.? MY\.? MODEL/);
    expect(r.state.room).toBe('fortress.bridge');
    expect(last[0]).toMatch(/You have no table/);
  });
  it('DAX words get DAX answers', () => {
    for (const [c, re] of [['say calculate', /context transition/i], ['say sumx', /iterates/i], ['say divide', /zero/i], ['say filter context', /which one/i]] as const) {
      expect(play([c], 'fortress.throne').last[0]).toMatch(re);
    }
  });
  it('the Card is out-stared and the Big Refresh drops the boots', () => {
    const { s, outs } = play(['put measure on card', 'put measure on card', 'change pie chart to bar chart', 'wear boots'], 'fortress.yard', {});
    expect(outs[1]![0]).toMatch(/blinks first/i);
    expect(s.score).toBe(25);
    expect(s.worn).toContain('boots');
    const t = { ...newGame(WORLD, 6), room: 'fortress.yard', inventory: ['license', 'policy'] };
    const r = step(t, 'use policy on refresh', WORLD);
    expect(r.state.inventory).not.toContain('boots');
    expect(r.state.score).toBe(0);
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
    const card = play(['put measure on card', 'put measure on card', 'look at card', 'look at card'], 'fortress.yard');
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
  it('after the spinner blanks the Card again, the Studio hint points at the pie, not at a measure that already counted', () => {
    const { last } = play(['get ye flask'], 'fortress.yard', { 'card.measure': 2, 'stare.done': false });
    expect(last.join(' ')).toMatch(/thirty-one slices/);
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

describe('the Desktop Gate wants the link clicked', () => {
  const start = () => newGame(WORLD, 6);
  const atGate = () => { let s = start(); for (const c of ['out', 'e', 'e', 'n']) s = step(s, c, WORLD).state; return s; };
  it('use trial drops the bridge and pays 10', () => {
    const r = step(atGate(), 'use trial', WORLD);
    expect(r.pointsAwarded).toBe(10);
    expect(r.state.flags['bridge.down']).toBe(true);
    expect(r.output.join(' ')).toMatch(/Try free/);
  });
  it.each(['start trial', 'click try free', 'try free', 'download desktop', 'install desktop', 'use link'])('%s also works', (cmd) => {
    expect(step(atGate(), cmd, WORLD).pointsAwarded).toBe(10);
  });
  it('say trial is a nudge with no points', () => {
    const r = step(atGate(), 'say trial', WORLD);
    expect(r.pointsAwarded).toBe(0);
    expect(r.state.flags['bridge.down']).toBeFalsy();
    expect(r.output.join(' ')).toMatch(/Show me/);
  });
  it('the guard, the hint and the gate never say "say it"', () => {
    const s = atGate();
    const texts = [WORLD.rooms['fortress.bridge']!.flaskHint(s), step(s, 'hint', WORLD).output.join(' '), step(step(step(s, 'talk to guard', WORLD).state, 'talk to guard', WORLD).state, 'talk to guard', WORLD).output.join(' '), step(s, 'open drawbridge', WORLD).output.join(' ')];
    for (const t of texts) expect(t).not.toMatch(/\bsay\b/i);
  });
  it('the room, the splash, the dialog and the link itself all show the link', () => {
    const s = atGate();
    for (const c of ['look', 'look at splash', 'look at dialog', 'look at link', 'look at trial', 'look at desktop']) expect(step(s, c, WORLD).output.join(' '), c).toMatch(/link: Try free/);
  });
  it('the update is still the update, and the trial scores once', () => {
    for (const c of ['use installer', 'use update', 'use dialog']) {
      const r = step(atGate(), c, WORLD);
      expect(r.stepId, c).toBe('fortress.update');
      expect(r.pointsAwarded, c).toBe(0);
    }
    const down = step(atGate(), 'use trial', WORLD).state;
    for (const c of ['use trial', 'try free', 'install desktop', 'say trial']) {
      const r = step(down, c, WORLD);
      expect(r.pointsAwarded, c).toBe(0);
      expect(r.output.join(' '), c).not.toMatch(/Show me|You click Try free/);
    }
    expect(step(down, 'look at link', WORLD).output.join(' ')).toMatch(/visited purple/);
  });
});

describe('the Model View relates, then the Duke throws', () => {
  const start = () => newGame(WORLD, 6);
  const atModel = () => { let s = start(); for (const c of ['out', 'e', 'e', 'n', 'use trial', 'n', 'w']) s = step(s, c, WORLD).state; return s; };
  it('the date table cannot leave unrelated', () => {
    const r = step(atModel(), 'get date table', WORLD);
    expect(r.state.inventory).not.toContain('date-table');
    expect(r.output.join(' ')).toMatch(/related to nothing/);
  });
  it('use relationship pays 10 once and frees the table', () => {
    const r = step(atModel(), 'use relationship', WORLD);
    expect(r.pointsAwarded).toBe(10);
    expect(r.state.flags['model.related']).toBe(true);
    expect(step(r.state, 'use relationship', WORLD).pointsAwarded).toBe(0);
    const g = step(r.state, 'get date table', WORLD);
    expect(g.state.inventory).toContain('date-table');
  });
  it.each(['fix relationship', 'activate relationship', 'use relationship lines', 'use dashed line', 'set single direction'])('%s relates too', (cmd) => {
    expect(step(atModel(), cmd, WORLD).pointsAwarded).toBe(10);
  });
  it('give date table to duke: the moat, 20 points, unmarked text', () => {
    let s = atModel();
    for (const c of ['use relationship', 'get date table', 'e', 'n']) s = step(s, c, WORLD).state;
    const r = step(s, 'give date table to duke', WORLD);
    expect(r.pointsAwarded).toBe(20);
    expect(r.state.flags['trial.moat']).toBe(true);
    expect(r.state.room).toBe('fortress.bridge');
    expect(r.state.inventory).not.toContain('date-table');
    expect(r.output.join(' ')).toMatch(/UNMARKED/);
  });
  it('a marked table gets the CALENDARAUTO line and the same moat', () => {
    let s = atModel();
    for (const c of ['use relationship', 'get date table', 'use date table', 'e', 'n']) s = step(s, c, WORLD).state;
    const r = step(s, 'give date table to duke', WORLD);
    expect(r.pointsAwarded).toBe(20);
    expect(r.output.join(' ')).toMatch(/CALENDARAUTO/);
  });
  it('say calculated column is a strike now, not the moat', () => {
    let s = atModel();
    for (const c of ['e', 'n']) s = step(s, c, WORLD).state;
    const r = step(s, 'say calculated column', WORLD);
    expect(r.pointsAwarded).toBe(0);
    expect(r.state.flags['trial.moat']).toBeFalsy();
    expect(r.state.flags['duke.wrong']).toBe(1);
    expect(r.output.join(' ')).toMatch(/Bring me a table/);
  });
});

describe('the Studio: a measure twice, then the pie', () => {
  const atStudio = () => { let s = newGame(WORLD, 6); for (const c of GOLDEN_PATH.slice(0, GOLDEN_PATH.indexOf('put measure on card'))) s = step(s, c, WORLD).state; return s; };
  it('the first measure shows Blank and says do it again; the second pays 10', () => {
    const a = step(atStudio(), 'put measure on card', WORLD);
    expect(a.pointsAwarded).toBe(0);
    expect(a.output.join(' ')).toMatch(/Do it again/);
    const b = step(a.state, 'put measure on card', WORLD);
    expect(b.pointsAwarded).toBe(10);
    expect(b.state.flags['stare.done']).toBe(true);
    expect(step(b.state, 'put measure on card', WORLD).pointsAwarded).toBe(0);
  });
  it.each(['add measure to card', 'use measure on card', 'drag measure to card', 'drop net sales on card', 'add net sales'])('%s counts as the measure', (cmd) => {
    expect(step(atStudio(), cmd, WORLD).output.join(' ')).toMatch(/Blank/);
  });
  it('staring no longer pays', () => {
    let s = atStudio();
    for (const c of ['look at card', 'wait']) s = step(s, c, WORLD).state;
    expect(step(s, 'wait', WORLD).pointsAwarded).toBe(0);
  });
  it('the pie to a bar finishes the refresh and drops the boots (15)', () => {
    const r = step(atStudio(), 'change pie chart to bar chart', WORLD);
    expect(r.pointsAwarded).toBe(15);
    expect(r.state.flags['refresh.done']).toBe(true);
    expect(r.state.inventory).toContain('boots');
    expect(step(r.state, 'change pie chart to bar chart', WORLD).pointsAwarded).toBe(0);
  });
  it.each(['use bar chart', 'change chart', 'change pie to bar', 'change visual', 'use pie chart', 'convert pie chart', 'make it a bar chart'])('%s changes the pie', (cmd) => {
    expect(step(atStudio(), cmd, WORLD).pointsAwarded).toBe(15);
  });
  it('the policy on the refresh is a nudge', () => {
    let s = atStudio();
    s = { ...s, inventory: [...s.inventory, 'policy'] };
    const r = step(s, 'use policy on refresh', WORLD);
    expect(r.pointsAwarded).toBe(0);
    expect(r.state.inventory).toContain('policy');
    expect(r.output.join(' ')).toMatch(/look at the pie/);
  });
});
