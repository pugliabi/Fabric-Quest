import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import type { GameState } from '../src/engine/types';

const run = (cmds: string[], start: Partial<GameState> = {}) => {
  let s: GameState = { ...newGame(WORLD, 9), ...start };
  const outs: string[][] = [];
  for (const c of cmds) { const r = step(s, c, WORLD); s = r.state; outs.push(r.output); }
  return { s, outs };
};
const DEAD = ['get csv', 'get sword', 'get csv', 'get sword'];
/** The stuck helper speaks in the `hint` command's own words. */
const helped = (line: string): string => `A hollow voice adds: "${line}"`;
const HELPER = /A hollow voice adds/;

describe('the narrator helps (spec1 §3.3)', () => {
  it('after 4 dead turns in one room the helper speaks up: the plain line at 4, the flask hint itself at 8 and 12 (Task B4, made plain)', () => {
    const { s, outs } = run([...DEAD, ...DEAD, ...DEAD]);
    expect(s.stuck).toBe(12);
    // The cottage, mug still on the desk: the plain line says what Jeff wants; the flask hint names the command.
    expect(outs[3]![outs[3]!.length - 1]).toBe(helped("Jeff wants the thing you drink coffee out of. It says Okayest on it. He'd agree."));
    expect(outs[7]![outs[7]!.length - 1]).toBe(helped(WORLD.rooms['village.cottage']!.flaskHint(s)));
    expect(outs[11]![outs[11]!.length - 1]).toBe(helped(WORLD.rooms['village.cottage']!.flaskHint(s)));
    expect(outs[2]!.join(' ')).not.toMatch(HELPER);
    expect(outs[4]!.join(' ')).not.toMatch(HELPER);
  });
  it('a success, a move or points resets it', () => {
    expect(run([...DEAD.slice(0, 3), 'look', 'get sword']).s.stuck).toBe(4); // a bare look is meta and leaves the count alone; the failed get is the fourth dead turn
    expect(run([...DEAD.slice(0, 3), 'get mug']).s.stuck).toBe(0);
    expect(run([...DEAD.slice(0, 3), 'out']).s.stuck).toBe(0);
  });
  it('not in god mode, not in the Copilot pane', () => {
    expect(run(['burninate', ...DEAD]).outs[4]!.join(' ')).not.toMatch(HELPER);
    const pane = run(['sales', 'sales', 'sales', 'sales'], { room: 'copilot.pane', flags: { 'sq.return': 1 } });
    expect(pane.outs[3]!.join(' ')).not.toMatch(HELPER);
  });
});

describe('the helper, at the edges', () => {
  it('the entrance turn does not count, and the count starts fresh in the new room', () => {
    // Three dead in the cottage, out to the square (entrance quip), three dead there: still no helper; the fourth gets it.
    const { s, outs } = run([...DEAD.slice(0, 3), 'out', ...DEAD.slice(0, 3)]);
    expect(s.room).toBe('village.square');
    expect(s.stuck).toBe(3);
    expect(outs.flat().join(' ')).not.toMatch(HELPER);
    const more = run([...DEAD.slice(0, 3), 'out', ...DEAD]);
    expect(more.s.stuck).toBe(4);
    // The square, prophecy unread: the helper at 4 is the room's plain line, not the flask hint.
    expect(more.outs[7]![more.outs[7]!.length - 1]).toBe(helped("It's a notice board. Notices are for reading. The prophecy is on it, and so is a feature request."));
    expect(more.outs[7]![more.outs[7]!.length - 1]).not.toContain(WORLD.rooms['village.square']!.flaskHint(more.s));
  });
  it('the helper is the last line even when Jeff interjects', () => {
    // In the square Jeff speaks every third turn; the helper still closes the turn.
    const { outs } = run(['out', 'get csv', 'get sword', 'get csv', 'get sword', 'get csv', 'get sword', 'get csv', 'get sword']);
    const helpedTurns = outs.filter((o) => o.some((l) => l.startsWith('A hollow voice adds: ')));
    expect(helpedTurns.length).toBe(2);
    for (const o of helpedTurns) expect(o[o.length - 1]).toMatch(/^A hollow voice adds: /);
    expect(outs.flat().some((l) => /^Jeff from Finance/.test(l))).toBe(true);
  });
  it('asking for the hint is not a dead turn: the hollow voice speaks once, and the count restarts', () => {
    for (const ask of ['hint', 'get ye flask']) {
      const { s, outs } = run([...DEAD.slice(0, 3), ask]);
      expect(s.stuck, ask).toBe(0);
      expect(outs[3]!.join('\n').match(/A hollow voice adds/g) ?? [], ask).toHaveLength(1);
    }
  });
  it('a gate try is a dead turn: four tries at the drawbridge and the helper says the plain line', () => {
    const { s, outs } = run(['open drawbridge', 'push gate', 'cross moat', 'climb gate'], { room: 'fortress.bridge' });
    expect(s.stuck).toBe(4);
    expect(outs[3]![outs[3]!.length - 1]).toBe(helped("He wants a SKU. There's a free one. It rhymes with denial."));
  });
  it('a room whose hint is empty, and which has no nudge, gets the generic helper', () => {
    const cottage = WORLD.rooms['village.cottage']!;
    const world = { ...WORLD, rooms: { ...WORLD.rooms, 'village.cottage': { ...cottage, flaskHint: () => '', nudge: undefined } } };
    let s: GameState = newGame(world, 9);
    let last: string[] = [];
    for (const c of DEAD) { const r = step(s, c, world); s = r.state; last = r.output; }
    expect(last[last.length - 1]).toBe(helped('Look around. Talk to people. Read things.'));
  });
  it('dying resets nothing it needs to: the counter is 0 on a death turn', () => {
    const { s } = run([...DEAD.slice(0, 3), 'die']);
    expect(s.dead).toBe(true);
    expect(s.stuck).toBe(0);
  });
});

describe('hint', () => {
  it.each(['hint', 'hints', 'clue', 'what now', 'what next', "i'm stuck", 'im stuck', 'stuck', 'help me'])('%s is the flask hint in the hollow voice', (c) => {
    const s = { ...newGame(WORLD, 9), room: 'fortress.bridge' };
    expect(step(s, c, WORLD).output[0]).toBe(`A hollow voice adds: "${WORLD.rooms['fortress.bridge']!.flaskHint(s)}"`);
  });
  it('works in the Copilot pane too', () => {
    const s = { ...newGame(WORLD, 9), room: 'copilot.pane', flags: { 'sq.return': 1 } };
    expect(step(s, 'hint', WORLD).output[0]).toMatch(/^A hollow voice adds: /);
  });
});
