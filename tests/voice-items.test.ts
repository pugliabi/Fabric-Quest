import { describe, expect, it } from 'vitest';
import { DELAY_LINE, newGame, step } from '../src/engine/step';
import type { GameState } from '../src/engine/types';
import { WORLD } from '../src/world';
import { lintWorld } from '../src/world/lint';
import { GOLDEN_PATH } from './golden-path';

const all = Object.values(WORLD.items);
const takeable = all.filter((i) => i.takeable);

/** Sentence count: terminal punctuation followed by a space or the end. A quoted title ("'World's Okayest Analyst.'") counts. */
const sentences = (t: string): number => (t.match(/[.!?]['")]?(\s|$)/g) ?? []).length;

describe('every gettable item has a blurb and a remembered repeat (spec1 §5.2)', () => {
  it.each(takeable.map((i) => i.id))('%s', (id) => {
    const item = WORLD.items[id]!;
    expect(item.blurb, 'blurb').toBeTruthy();
    expect(sentences(item.blurb!), 'two sentences').toBeGreaterThanOrEqual(2);
    expect(item.again, 'again').toBeTruthy();
  });
  // Pre-flight ruling: the blurb is on EVERY item, not only the gettable ones (god mode's `summon` puts any of them in your pocket).
  it.each(all.filter((i) => !i.takeable).map((i) => i.id))('%s (scenery) has a two-sentence blurb', (id) => {
    const item = WORLD.items[id]!;
    expect(item.blurb, 'blurb').toBeTruthy();
    expect(sentences(item.blurb!), 'two sentences').toBeGreaterThanOrEqual(2);
  });
  it('the lint enforces it', () => {
    const w = { ...WORLD, items: { ...WORLD.items, mug: { ...WORLD.items.mug!, blurb: undefined, again: undefined } } };
    expect(lintWorld(w)).toEqual(expect.arrayContaining(['item mug: missing blurb', 'item mug: missing again']));
  });
  it('the lint wants a blurb on scenery too, and no again', () => {
    const w = { ...WORLD, items: { ...WORLD.items, candle: { ...WORLD.items.candle!, blurb: undefined, again: undefined } } };
    const problems = lintWorld(w);
    expect(problems).toContain('item candle: missing blurb');
    expect(problems).not.toContain('item candle: missing again');
  });
  it("get mug while carrying it is the mug's own line, and the second time says it again, alone", () => {
    const s = { ...newGame(WORLD, 3), inventory: ['license', 'mug'], flags: { 'taken.mug': true } };
    const a = step(s, 'get mug', WORLD);
    expect(a.output[0]).toBe(typeof WORLD.items.mug!.again === 'function' ? WORLD.items.mug!.again(s) : WORLD.items.mug!.again);
    const b = step(a.state, 'get mug', WORLD);
    expect(b.output).toEqual(a.output);
  });
  it('every gettable item answers a second get with its own line, not the generic pocket-pat', () => {
    for (const item of takeable) {
      const s = { ...newGame(WORLD, 5), inventory: ['license', item.id], flags: { [`taken.${item.id}`]: true, 'dragon.gone': true } };
      const r = step(s, `get ${item.name.toLowerCase()}`, WORLD);
      const again = typeof item.again === 'function' ? item.again(s) : item.again;
      // The Model is the win: its shrine rule owns `get model` (peaks.model), so it is checked by its line alone.
      if (item.id === 'model') { expect(again).toBeTruthy(); continue; }
      expect(r.output[0], item.id).toBe(again);
    }
  });
  it('the generic pool still answers an item the world forgot to give a line', () => {
    const w = { ...WORLD, items: { ...WORLD.items, mug: { ...WORLD.items.mug!, again: undefined } } };
    const s = { ...newGame(w, 3), inventory: ['license', 'mug'], flags: { 'taken.mug': true } };
    const r = step(s, 'get mug', w);
    expect(r.output[0]).toMatch(/already|pocket|inventory|Nothing changes hands|We all saw/);
  });
  it('inventory lists blurbs', () => {
    const out = step({ ...newGame(WORLD, 3), inventory: ['license', 'mug'], worn: [] }, 'inventory', WORLD).output;
    expect(out[0]).toBe('You are carrying: Pro License Card, mug.');
    expect(out[1]).toBe(`  Pro License Card: ${WORLD.items.license!.blurb}`);
    expect(out[2]).toBe(`  mug: ${WORLD.items.mug!.blurb}`);
  });
  it('inventory marks worn things on the blurb line too', () => {
    const out = step({ ...newGame(WORLD, 3), inventory: ['license', 'hoodie'], worn: ['hoodie'] }, 'inventory', WORLD).output;
    expect(out[0]).toBe('You are carrying: Pro License Card, hoodie (worn).');
    expect(out[2]).toBe(`  hoodie (worn): ${WORLD.items.hoodie!.blurb}`);
  });
  it('an empty inventory is one line', () => {
    const out = step({ ...newGame(WORLD, 3), inventory: [], worn: [] }, 'inventory', WORLD).output;
    expect(out).toEqual(['You are carrying nothing. Not even a license.']);
  });
});

/**
 * Fix round 1: on the Isle of Gateway a second `get personal key` used to take the STANDARD key through the builtin
 * (room items were checked before carried ones, and names match by last word), skipping the +20 rule for good.
 */
describe('fix round 1: a carried thing named in full beats a room thing that merely ends the same way', () => {
  const island = (extra: Partial<GameState> = {}): GameState => ({ ...newGame(WORLD, 42), room: 'lake.island', flags: { 'ferry.online': true }, ...extra });
  const play = (s: GameState, cmds: string[]) => {
    const outs: string[][] = [];
    const pts: number[] = [];
    for (const c of cmds) { const r = step(s, c, WORLD); s = r.state; outs.push(r.output); pts.push(r.pointsAwarded); }
    return { s, outs, pts };
  };
  const againOf = (id: string, s: GameState): string => { const a = WORLD.items[id]!.again!; return typeof a === 'function' ? a(s) : a; };

  it('get personal key twice: the second is the personal key\'s own line, and the STANDARD key stays on the plinth', () => {
    const { s, outs } = play(island(), ['get personal key', 'get personal key']);
    expect(outs[0]![0]).toMatch(/^You take the PERSONAL key\./);
    expect(outs[1]![0]).toBe(againOf('personal key', { ...s, turns: s.turns - 1 }));
    expect(s.inventory).not.toContain('standard key');
    expect(s.flags['taken.standard key']).toBeFalsy();
  });
  it.each(['get key', 'get standard key', 'get the other key', 'get gateway key'])('%s with the personal key carried fires the rule: +20, trial.key', (cmd) => {
    const { s, pts } = play(island(), ['get personal key', cmd]);
    expect(pts[1]).toBe(20);
    expect(s.flags['trial.key']).toBe(true);
    expect(s.inventory).toContain('standard key');
  });
  it('the other key, with the STANDARD key carried, is the PERSONAL one', () => {
    const { s, outs } = play(island(), ['get standard key', 'get the other key']);
    expect(outs[1]![0]).toMatch(/^You take the PERSONAL key\./);
    expect(s.inventory).toEqual(expect.arrayContaining(['standard key', 'personal key']));
  });
  it('get standard key, then get key: the second is the STANDARD key\'s own line, not "Taken: personal key."', () => {
    const { s, outs, pts } = play(island(), ['get standard key', 'get key']);
    expect(pts).toEqual([20, 0]);
    expect(outs[1]![0]).toBe(againOf('standard key', { ...s, turns: s.turns - 1 }));
    expect(s.inventory).not.toContain('personal key');
  });
  it('the golden path with get personal key typed twice before the standard key still wins at 200', () => {
    const i = GOLDEN_PATH.indexOf('get standard key');
    const path = [...GOLDEN_PATH.slice(0, i), 'get personal key', 'get personal key', ...GOLDEN_PATH.slice(i)];
    let s = newGame(WORLD, 42);
    for (const c of path) s = step(s, c, WORLD).state;
    expect(s.flags['trial.key']).toBe(true);
    expect(s.score).toBe(200);
    expect(s.won).toBe(true);
  });
  it('a room thing named exactly still wins over a carried thing named exactly (the Studio\'s wall note)', () => {
    const s: GameState = { ...newGame(WORLD, 42), room: 'fortress.yard', inventory: ['license', 'jeff-note'], flags: { 'taken.jeff-note': true } };
    expect(step(s, 'get sticky note', WORLD).output[0]).toBe(WORLD.items['sticky-note']!.untakeableText);
  });

  /** Where each rule-given item is acquired, and the flag its giving rule checks, so `get` there falls through to the builtin. */
  const GIVEN: Record<string, { room: string; flags: Record<string, boolean> }> = {
    license: { room: 'village.cottage', flags: {} },
    credentials: { room: 'village.mill', flags: { 'has.credentials': true } },
    scroll: { room: 'monastery.library', flags: { 'scroll.lent': true } },
    hoodie: { room: 'monastery.cloister', flags: { 'has.hoodie': true, 'trial.hoodie': true } },
    boots: { room: 'fortress.yard', flags: { 'refresh.done': true, 'stare.done': true } },
  };
  const homeOf = (id: string): string | undefined => Object.values(WORLD.rooms).find((r) => r.items.includes(id))?.id ?? GIVEN[id]?.room;

  /** The first narrator line of a turn: the Peaks put their interactive-delay marker ahead of it. */
  const said = (out: string[]): string | undefined => out.filter((l) => l !== DELAY_LINE)[0];

  it.each(takeable.filter((i) => i.id !== 'model').map((i) => i.id))('%s: get <name> twice in its own room gives its own line the second time', (id) => {
    const item = WORLD.items[id]!;
    const room = homeOf(id)!;
    expect(room, `${id} has a home room`).toBeTruthy();
    const name = item.name.toLowerCase();
    if (GIVEN[id]) {
      // Handed over by a rule: start holding it, the way the rule leaves you, and `get` it once.
      const s: GameState = { ...newGame(WORLD, 42), room, inventory: ['license', id], flags: { [`taken.${id}`]: true, ...GIVEN[id]!.flags } };
      expect(said(step(s, `get ${name}`, WORLD).output)).toBe(againOf(id, s));
      return;
    }
    const s: GameState = { ...newGame(WORLD, 42), room, flags: { 'ferry.online': true } };
    const first = step(s, `get ${name}`, WORLD);
    expect(first.state.inventory, `${id}: first get takes it`).toContain(id);
    const second = step(first.state, `get ${name}`, WORLD);
    expect(said(second.output)).toBe(againOf(id, first.state));
    expect(second.state.inventory).toEqual(first.state.inventory);
  });
});

describe('milestones and the win', () => {
  it('giving Jeff the mug runs one beat too long', () => {
    const r = step({ ...newGame(WORLD, 3), room: 'village.square', inventory: ['license', 'mug'] }, 'give mug to jeff', WORLD);
    expect(r.output[0]).toMatch(/^Jeff takes the mug\. 'World's Okayest Analyst\.' He reads it twice\./);
    expect(r.output[0]).toMatch(/He develops a severe DAX problem and blames you for never being there\.$/);
  });
  it('wearing the hoodie names you', () => {
    const r = step({ ...newGame(WORLD, 3), inventory: ['license', 'hoodie'] }, 'wear hoodie', WORLD);
    expect(r.output[0]).toMatch(/^You pull on the Hoodie of Spark\. You look like a Data Engineer\./);
    expect(r.output[0]).toMatch(/Now you're lookin' like a serious Engineer, .+\.$/);
    expect(r.state.worn).toContain('hoodie');
  });
  it('the win drops the act', () => {
    let s = newGame(WORLD, 42);
    for (const c of GOLDEN_PATH) s = step(s, c, WORLD).state;
    expect(s.won).toBe(true);
    const ending = step({ ...s, won: false, flags: { ...s.flags, 'game.won': false, 'pts.peaks.model': false }, inventory: s.inventory.filter((i) => i !== 'model') }, 'get model', WORLD).output[0]!;
    expect(ending).toMatch(/^You lift the Golden Semantic Model\./);
    expect(ending).toMatch(/412 columns/);
    expect(ending).toMatch(/Congratulations\. You won\. Nobody's ever gotten the Model down the mountain, and you did it with a Pro license\. Way to go\.\n\nTHE END\.$/);
  });
});
