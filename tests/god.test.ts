import { describe, expect, it } from 'vitest';

import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';

const run = (cmds: string[]) => {
  let s = newGame(WORLD, 7);
  const outs: string[] = [];
  for (const c of cmds) { const r = step(s, c, WORLD); s = r.state; outs.push(r.output.join('\n')); }
  return { s, outs, last: outs[outs.length - 1]! };
};

describe('god mode (burninate)', () => {
  it('is invisible until toggled: warp/prompts/rooms are ordinary snark before burninating', () => {
    const { s, last } = run(['warp throne']);
    expect(s.room).toBe(WORLD.start);
    expect(last).not.toContain('THRONE');
  });

  it('burninate toggles the flag and prints the secret help', () => {
    const on = run(['burninate']);
    expect(on.s.flags.god).toBe(true);
    expect(on.last).toContain('BURNINATION MODE');
    const off = run(['burninate', 'burninate']);
    expect(off.s.flags.god).toBe(false);
  });

  it('warp goes anywhere by id or name fragment', () => {
    expect(run(['burninate', 'warp peaks.shrine']).s.room).toBe('peaks.shrine');
    expect(run(['burninate', 'warp throne']).s.room).toBe('fortress.throne');
    expect(run(['burninate', 'warp nowhere-real']).last).toContain('No such room');
  });

  it('prompts lists the current room rules with points, and "all" covers every room', () => {
    const one = run(['burninate', 'warp village.square', 'prompts']).last;
    expect(one).toContain('VILLAGE SQUARE');
    expect(one).toContain('read board');
    expect(one).toContain('+5');
    const all = run(['burninate', 'prompts all']).last;
    for (const id of Object.keys(WORLD.rooms)) expect(all).toContain(id);
    const global = run(['burninate', 'prompts global']).last;
    expect(global).toContain('PHRASES');
  });

  it('summon puts an item in the inventory; flags dumps state', () => {
    const r = run(['burninate', 'summon golden', 'flags']);
    expect(r.s.inventory).toContain('model');
    expect(r.last).toContain('god = true');
    expect(r.last).toContain('taken.model = true');
  });

  it('every step is logged as meta with a god.* step id', () => {
    let s = newGame(WORLD, 1);
    for (const c of ['burninate', 'rooms', 'prompts', 'flags']) {
      const r = step(s, c, WORLD);
      expect(r.stepId.startsWith('god.')).toBe(true);
      expect(r.outcome === 'meta' || r.outcome === 'move').toBe(true);
      s = r.state;
    }
  });
});
