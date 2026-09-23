// The Sierra message box (App → noticeFor): final review I3 and M4.
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { noticeFor } from '../src/game/notice';
import { GOLDEN_PATH } from './golden-path';

const at = (room: string, flags = {}) => ({ ...newGame(WORLD, 5), room, flags: { ...newGame(WORLD, 5).flags, ...flags } });

describe('message box', () => {
  it('winning Jeff\'s Excel opens the box with the win line', () => {
    const s = at('excel.sheet1', { 'sq.return': 1, 'excel.connected': true, 'excel.pivot': true, 'excel.dim': true, 'excel.measure': true, 'excel.filter': true });
    const r = step(s, 'show jeff', WORLD);
    expect(r.bonusAwarded).toBe(20);
    expect(noticeFor(r, s, WORLD)?.text).toMatch(/Okay\. The report was right/);
  });
  it('winning Copilot opens the box with the answer', () => {
    const s = at('copilot.pane', { 'sq.return': 1 });
    const r = step(s, 'total q4 2025 northeast net sales from the certified model, just the number', WORLD);
    expect(r.bonusAwarded).toBe(25);
    expect(noticeFor(r, s, WORLD)?.text).toMatch(/\$1,247,930/);
  });
  it('a Copilot bonus already won does not open the box again', () => {
    const s = at('copilot.pane', { 'sq.return': 1, 'sq.copilot.done': true, 'bonus.sq.copilot': true });
    const r = step(s, 'total q4 2025 northeast net sales from the certified model, just the number', WORLD);
    expect(noticeFor(r, s, WORLD)).toBeNull();
  });
  it('the Shrine door keeps its +5 box, with the entrance quip after it', () => {
    let s = newGame(WORLD, 42);
    const door = GOLDEN_PATH.length - 3; // 'n' at the Ledge
    for (const cmd of GOLDEN_PATH.slice(0, door)) s = step(s, cmd, WORLD).state;
    const r = step(s, GOLDEN_PATH[door]!, WORLD);
    expect(r.pointsAwarded).toBe(5);
    const box = noticeFor(r, s, WORLD)!.text;
    expect(box).toMatch(/^The three sigils blaze/);
    expect(box).toContain(r.notice!);
  });
  it('the picture goes with the description, not the echo of what you typed or the delay marker (F1 fix round 1)', () => {
    const s = at('village.cottage');
    const r = step(s, 'look at the big shiny mug', WORLD);
    expect(r.output[0]).toMatch(/^Listen to you\./);
    expect(noticeFor(r, s, WORLD)).toEqual({ text: r.output[1], itemId: 'mug' });
    const pass = { ...at('peaks.pass'), inventory: ['license'] };
    const d = step(pass, 'look at license', WORLD);
    expect(d.output[0]).toBe('(…interactive delay…)');
    expect(noticeFor(d, pass, WORLD)).toEqual({ text: d.output[1], itemId: 'license' });
  });
  it('an entrance quip alone still gets the box (under the goal card, on a realm entry)', () => {
    const s = at('village.square');
    const r = step(s, 'show me a table', WORLD);
    expect(noticeFor(r, s, WORLD)?.text).toBe(`${r.box}\n\n${r.notice}`);
  });
});
