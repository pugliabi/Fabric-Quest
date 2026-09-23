// Task F9: the voice sweep of Jeff's Excel, plus the region's deferred fixes (export labels, the stage-4 box on a
// re-add, analyze-in-excel when connected, `sales data`, `ask jeff about the result`, the three rooms' stuck helper).
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import type { GameState } from '../src/engine/types';
import { WORLD } from '../src/world';

const one = (room: string, cmd: string, flags: Record<string, boolean | number> = { 'sq.return': 1 }) => step({ ...newGame(WORLD, 3), room, flags }, cmd, WORLD).output[0]!;
/** The same command typed n times in a row: each turn's first line. */
const times = (room: string, cmd: string, n: number, flags: Record<string, boolean | number> = { 'sq.return': 1 }) => {
  let s: GameState = { ...newGame(WORLD, 3), room, flags };
  const outs: string[] = [];
  for (let i = 0; i < n; i++) { const r = step(s, cmd, WORLD); s = r.state; outs.push(r.output[0]!); }
  return outs;
};
const BUILT = { 'sq.return': 1, 'excel.connected': true, 'excel.pivot': true, 'excel.jeff.asked': true };

describe('Excel sweep', () => {
  it('Sheet1', () => {
    expect(one('excel.sheet1', 'ask jeff about the report')).toBe("'The report,' says Jeff. 'It has a badge. I have a spreadsheet. A spreadsheet is a badge you make yourself.'");
    expect(one('excel.sheet1', 'use tissues')).toBe('You hand Jeff a tissue. He blows his nose into a printout of the total instead. It rounds up.');
    expect(one('excel.sheet1', 'save workbook')).toBe('Saved as Sales_export (4).csv. The (3) was the good one. It always is.');
    expect(one('excel.sheet1', 'look at cell a1')).toBe('Cell A1. Blinking. Somewhere in it, Clippy is composing a suggestion.');
    expect(one('excel.sheet1', 'look at export')).toMatch(/Jeff trusts it\.$/);
  });
  it('Data tab and pivot', () => {
    expect(one('excel.data', 'use ribbon')).toBe('You click the Home tab. Then Insert. Then Data. The ribbon has seen people wander before.');
    expect(one('excel.data', 'look at connection')).toBe('Analyze in Excel (.odc). Sign-in required.');
    const built = { 'sq.return': 1, 'excel.connected': true, 'excel.pivot': true };
    expect(one('excel.pivot', 'refresh', built)).toBe('You refresh the pivot. It says the same number, but bolder.');
    expect(one('excel.pivot', 'format pivot', built)).toBe('You format the pivot. Banded rows. Jeff likes banded rows. The number is still wrong, now in stripes.');
    expect(one('excel.pivot', 'add measure', built)).toBe('You add a measure to a pivot. Jeff will never forgive you, and he will never notice.');
  });
});

describe('Excel deferred fixes', () => {
  it('re-adding a field that is already in answers the repeat, and the stage-4 box does not come back', () => {
    const four = { ...BUILT, 'excel.dim': true, 'excel.measure': true, 'excel.filter': true };
    for (const cmd of ['add sales region', 'add net sales', 'filter by year', 'drag net sales to values']) {
      const r = step({ ...newGame(WORLD, 3), room: 'excel.pivot', flags: four }, cmd, WORLD);
      expect(r.box, cmd).toBeFalsy();
      expect(r.output[0], cmd).toMatch(/already/);
    }
  });
  it('`analyze in excel` on PivotTable1 once connected says Already connected, like `connect`', () => {
    expect(one('excel.pivot', 'analyze in excel', BUILT)).toMatch(/^Already connected\. Sales \(Certified\)\./);
    expect(one('excel.pivot', 'analyze in excel')).toMatch(/^Analyze in Excel is a button on the Data tab/);
  });
  it('`look at sales data` on Sheet1 is the export, not the ribbon', () => {
    expect(one('excel.sheet1', 'look at sales data')).toMatch(/^Sales_export \(3\)\.csv/);
  });
  it('`ask jeff about the result` at stage 4 is the win', () => {
    const r = step({ ...newGame(WORLD, 3), room: 'excel.sheet1', flags: { ...BUILT, 'excel.dim': true, 'excel.measure': true, 'excel.filter': true } }, 'ask jeff about the result', WORLD);
    expect(r.state.flags['sq.excel.done']).toBe(true);
  });
  it('the three rooms have no plain line of their own: the helper at 4 dead turns is the stage\'s flask hint', () => {
    for (const room of ['excel.sheet1', 'excel.data', 'excel.pivot']) {
      expect(WORLD.rooms[room]!.nudge, room).toBeUndefined();
      for (const flags of [{ 'sq.return': 1 }, { 'sq.return': 1, 'excel.jeff.asked': true }, { 'sq.return': 1, 'excel.connected': true }, BUILT, { ...BUILT, 'excel.dim': true, 'excel.measure': true, 'excel.filter': true }, { ...BUILT, 'sq.excel.done': true }]) {
        let s: GameState = { ...newGame(WORLD, 3), room, flags };
        let last: string[] = [];
        for (let i = 0; i < 4; i++) { const r = step(s, 'xyzzy', WORLD); s = r.state; last = r.output; }
        expect(last[last.length - 1], `${room} ${JSON.stringify(flags)}`).toBe(`A hollow voice adds: "${WORLD.rooms[room]!.flaskHint(s)}"`);
      }
    }
  });
  it('the export is labelled Sales_export (3).csv in every scene', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(new URL('../src/scenes/excel.tsx', import.meta.url), 'utf8');
    expect(src).not.toContain('Sales_export_v7');
    expect(src.split('Sales_export (3).csv').length - 1).toBe(3);
  });
});

describe('Excel voice adds', () => {
  it('second and third looks on the Sheet1 scenery and the field list', () => {
    for (const [room, cmd, first] of [['excel.sheet1', 'look at ribbon', /^Home · Insert/], ['excel.sheet1', 'look at tissue box', /^A tissue box/], ['excel.sheet1', 'look at monitor', /^Two monitors/], ['excel.pivot', 'look at field list', /^PivotTable Fields/]] as const) {
      const [a, b, c] = times(room, cmd, 3, room === 'excel.pivot' ? BUILT : { 'sq.return': 1 });
      expect(a, cmd).toMatch(first);
      expect(b, cmd).not.toBe(a);
      expect(c, cmd).not.toBe(b);
    }
    expect(times('excel.sheet1', 'look at ribbon', 3)[2]).toMatch(/paperclip/);
  });
  it('Jeff argues with his own export, once he has told you about it', () => {
    const [a, b] = times('excel.sheet1', 'ask jeff about the export', 2, { 'sq.return': 1, 'excel.jeff.asked': true });
    expect(a).toMatch(/^'My export says 4\.7,' says Jeff/);
    expect(b).not.toBe(a);
    // Stage 0: the exposition still comes first.
    expect(one('excel.sheet1', 'ask jeff about the export')).toMatch(/I trust my export/);
  });
  it('a second ask about the report remembers the first', () => {
    expect(times('excel.sheet1', 'ask jeff about the report', 2)[1]).toMatch(/F2/);
  });
  it('no deaths in the realm', () => {
    for (const cmd of ['use tissues', 'use ribbon', 'save workbook', 'refresh', 'add measure']) {
      for (const room of ['excel.sheet1', 'excel.data', 'excel.pivot']) {
        expect(step({ ...newGame(WORLD, 3), room, flags: BUILT }, cmd, WORLD).state.dead, `${room} ${cmd}`).toBe(false);
      }
    }
  });
});
