import { it, expect } from 'vitest';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { WORLD } from '../src/world';
import { SCENES } from '../src/scenes';
import type { GameState } from '../src/engine/types';

// The same two probe states the world lint uses: every settable flag true (and every item held), and nothing at all.
const allFlags = new Set<string>();
for (const r of [...WORLD.globalRules, ...Object.values(WORLD.rooms).flatMap((room) => room.rules)]) {
  for (const k of Object.keys(r.then.set ?? {})) allFlags.add(k);
}
const allTrue: GameState = {
  room: WORLD.start, inventory: Object.keys(WORLD.items), worn: [], score: 0, bonus: 0, turns: 0, dead: false, won: false, seed: 1,
  flags: Object.fromEntries([...allFlags].map((f) => [f, true])),
};
const allFalse: GameState = { ...allTrue, inventory: [], flags: {} };
// Plain .ts test (no JSX): wrap the scene's nodes in a Fragment to render them.
const draw = (node: ReturnType<(typeof SCENES)[string]>): string => renderToStaticMarkup(createElement(Fragment, null, node));
const html = (id: string, s: GameState): string => draw(SCENES[id]!(s));

it('every room scene id (all-true and all-false states) has a drawing in SCENES', () => {
  const missing: string[] = [];
  for (const room of Object.values(WORLD.rooms)) {
    for (const state of [allTrue, allFalse]) {
      const id = room.scene({ ...state, room: room.id });
      if (!SCENES[id]) missing.push(`${room.id} -> ${id}`);
    }
  }
  expect(missing).toEqual([]);
});

it('the pivot has a drawing for 0..3 pieces and each shows its own total', () => {
  const pivot = WORLD.rooms['excel.pivot']!;
  const flagSets = [{}, { 'excel.dim': true }, { 'excel.dim': true, 'excel.measure': true }, { 'excel.dim': true, 'excel.measure': true, 'excel.filter': true }];
  const totals = ['4.7M', '4.5M', '4.3M', '4.2M'];
  flagSets.forEach((flags, i) => {
    const s: GameState = { ...allFalse, room: pivot.id, flags: { 'excel.connected': true, 'excel.pivot': true, ...flags } };
    const id = pivot.scene(s);
    expect(SCENES[id], id).toBeDefined();
    expect(html(id, s)).toContain(totals[i]);
  });
});

it('the Copilot pane draws a different bubble for each answer shape, and an empty one before any prompt', () => {
  const base: GameState = { ...allFalse, room: 'copilot.pane' };
  const empty = html('copilot.pane', base);
  expect(empty).toContain('Ask me anything');
  const shapes = [0, 1, 2, 3, 4, 5].map((shape) => html('copilot.pane', { ...base, flags: { 'copilot.last': 1, 'copilot.shape': shape } }));
  expect(new Set([empty, ...shapes]).size).toBe(7);
  for (const s of shapes) expect(s).not.toContain('Ask me anything');
});

it('the Copilot pane: a cleared chat draws the empty bubble again; the card shows the stage\'s wrong number', () => {
  const base: GameState = { ...allFalse, room: 'copilot.pane' };
  const cleared = html('copilot.pane', { ...base, flags: { 'copilot.last': -1, 'copilot.shape': -1, 'copilot.stage': -1 } });
  expect(cleared).toContain('Ask me anything'); expect(cleared).toContain('Try: What are my sales?');
  const card = (flags: Record<string, number>) => html('copilot.pane', { ...base, flags: { 'copilot.shape': 3, ...flags } });
  expect(card({ 'copilot.last': 2, 'copilot.measure': 2 })).toContain('$4,285,337');
  expect(card({ 'copilot.last': 2, 'copilot.measure': 4 })).toContain('$83,960');
  expect(card({ 'copilot.last': 3, 'copilot.region': 0 })).toContain('$4,201,377');
  expect(card({ 'copilot.last': 3, 'copilot.region': 2 })).toContain('$998,101');
  expect(card({ 'copilot.last': 4 })).toContain('$2,933,012');
  expect(card({ 'copilot.last': 6 })).toContain('$1,247,930');
  expect(card({ 'copilot.last': 2 })).toContain('Try: net sales.');
});

it('every drawn scene renders without throwing in both probe states', () => {
  for (const [id, fn] of Object.entries(SCENES)) {
    for (const state of [allTrue, allFalse]) expect(() => draw(fn(state)), id).not.toThrow();
  }
});
