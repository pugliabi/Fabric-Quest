import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';

const play = (cmds: string[], start = 'village.square') => {
  let s = { ...newGame(WORLD, 8), room: start };
  const outs: string[][] = [];
  for (const c of cmds) { const r = step(s, c, WORLD); s = r.state; outs.push(r.output); }
  return { s, outs, last: outs[outs.length - 1]! };
};
const SOLVE = ['show me a table', 'n', 'use analyze in excel', 'use license on connection', 's', 'e', 'create pivot table', 'use sales region', 'use net sales', 'filter by year', 'w', 'show jeff'];

describe("Jeff's Excel", () => {
  it('Jeff never repeats himself: four asks, four lines, the first points at the Data tab', () => {
    const { outs } = play(['show me a table', 'ask jeff', 'ask jeff', 'ask jeff', 'ask jeff']);
    const lines = outs.slice(1).map((o) => o[0]!);
    expect(lines[0]).toMatch(/Data tab/);
    expect(new Set(lines).size).toBe(4);
  });
  it('the connection needs the license; the pivot needs the connection', () => {
    const a = play(['show me a table', 'n', 'use analyze in excel']);
    expect(a.last[0]).toMatch(/sign-?in required/i);
    const b = play(['show me a table', 'e', 'create pivot table']);
    expect(b.last[0]).toMatch(/connect/i);
    expect(b.s.flags['excel.pivot']).toBeUndefined();
  });
  it('the total moves 4.7 → 4.5 → 4.3 → 4.2 as pieces land, in any order', () => {
    const { outs } = play(['show me a table', 'n', 'use analyze in excel', 'use license on connection', 's', 'e', 'create pivot table', 'filter by year', 'use net sales', 'use sales region']);
    expect(outs[7]![0]).toMatch(/4\.5M/); expect(outs[8]![0]).toMatch(/4\.3M/); expect(outs[9]![0]).toMatch(/4\.2M/);
  });
  it('only building verbs place a field: "fix filter" and "label filter" do not add the filter', () => {
    const ready = ['show me a table', 'n', 'use analyze in excel', 'use license on connection', 's', 'e', 'create pivot table'];
    for (const cmd of ['fix filter', 'label filter', 'format net sales', 'mark sales region']) {
      const { s } = play([...ready, cmd]);
      expect(s.flags['excel.filter'], cmd).toBeUndefined();
      expect(s.flags['excel.measure'], cmd).toBeUndefined();
      expect(s.flags['excel.dim'], cmd).toBeUndefined();
    }
    expect(play(['show me a table', 'n', 'use analyze in excel', 'use license on connection', 's', 'e', 'fix pivot table']).s.flags['excel.pivot']).toBeUndefined();
    expect(play([...ready, 'apply filter']).s.flags['excel.filter']).toBe(true);
    expect(play([...ready, 'add net sales']).s.flags['excel.measure']).toBe(true);
    expect(play([...ready, 'put sales region in rows']).s.flags['excel.dim']).toBe(true);
    expect(play([...ready, 'pivot sales region']).s.flags['excel.dim']).toBe(true);
    expect(play([...ready, 'pivot by year']).s.flags['excel.filter']).toBe(true);
    expect(play([...ready, 'fix filter']).last[0]).toMatch(/not how a field gets into a pivot/);
  });
  it('wrong choices are explained, not accepted', () => {
    const { last } = play(['show me a table', 'n', 'use analyze in excel', 'use license on connection', 's', 'e', 'create pivot table', 'use region a']);
    expect(last[0]).toMatch(/legacy/i);
  });
  it('show jeff early: he is not convinced; show jeff done: +20 once and back home', () => {
    const early = play(['show me a table', 'show jeff']);
    expect(early.last[0]).toMatch(/still says 4\.7M/i);
    const done = play(SOLVE);
    expect(done.s.bonus).toBe(20); expect(done.s.score).toBe(0);
    expect(done.s.flags['sq.excel.done']).toBe(true);
    expect(done.s.room).toBe('village.square');
    const again = play([...SOLVE, 'show me a table', 'show jeff']);
    expect(again.s.bonus).toBe(20);
  });
});

describe("Jeff's Excel after the Monastery (final review I1)", () => {
  const lent = (cmds: string[]) => {
    const s0 = { ...newGame(WORLD, 8), room: 'village.square' };
    let s = { ...s0, inventory: s0.inventory.filter((i) => i !== 'license'), flags: { ...s0.flags, 'scroll.lent': true } };
    const outs: string[][] = [];
    for (const c of cmds) { const r = step(s, c, WORLD); s = r.state; outs.push(r.output); }
    return { s, outs, last: outs[outs.length - 1]! };
  };
  it.each(['sign in', 'use license on connection'])('%s works with the license on loan to the Librarian', (cmd) => {
    const { s, last } = lent(['show me a table', 'n', cmd]);
    expect(s.flags['excel.connected']).toBe(true);
    expect(last[0]).toMatch(/it never signed out\. Connected — Sales \(Certified\)\./);
  });
  it('the Data tab flask hint never claims a license you do not have', () => {
    const on = play(['show me a table', 'talk to jeff', 'n', 'get ye flask']).last.join(' ');
    expect(on).toMatch(/`analyze in excel`, then `sign in`\. You have a license/);
    const off = lent(['show me a table', 'talk to jeff', 'n', 'get ye flask']).last.join(' ');
    expect(off).not.toMatch(/You have a license/);
    expect(off).toMatch(/at the Library/);
  });
  it('the whole solve still pays +20 after the Monastery', () => {
    const { s } = lent(['show me a table', 'n', 'sign in', 's', 'e', 'create pivot table', 'use sales region', 'use net sales', 'filter by year', 'w', 'show jeff']);
    expect(s.bonus).toBe(20);
    expect(s.flags['sq.excel.done']).toBe(true);
  });
});
