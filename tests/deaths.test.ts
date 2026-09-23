import { describe, it, expect } from 'vitest';
import { newGame, step } from '../src/engine/step';
import type { GameState, StepResult } from '../src/engine/types';
import { WORLD } from '../src/world';
import { GOLDEN_PATH } from './golden-path';

function play(cmds: string[], from?: GameState): StepResult {
  let s = from ?? newGame(WORLD, 1);
  let last: StepResult | undefined;
  for (const c of cmds) {
    last = step(s, c, WORLD);
    s = last.state;
  }
  return last!;
}
const upTo = (cmd: string): GameState => play(GOLDEN_PATH.slice(0, GOLDEN_PATH.indexOf(cmd))).state;

describe('deaths', () => {
  it('drinking in the Bronze Marsh', () => {
    const r = play(['out', 's', 's', 'drink water']);
    expect(r.state.dead).toBe(true);
    expect(r.deathCause).toBe('death.bronze');
    expect(r.outcome).toBe('death');
  });
  it('deleting the workspace, anywhere', () => {
    expect(play(['delete workspace']).deathCause).toBe('death.delete-workspace');
    expect(play(['out', 'n', 'delete the workspace']).deathCause).toBe('death.delete-workspace');
  });
  it('importing the OneLake, only at the shore', () => {
    expect(play(['out', 's', 'import onelake']).deathCause).toBe('death.import');
    expect(play(['import onelake']).state.dead).toBe(false);
  });
  it('offering Jeff a paginated report', () => {
    expect(play(['out', 'give paginated report to jeff']).deathCause).toBe('death.paginated');
  });
  it('attacking the dragon', () => {
    const r = play(['attack dragon'], upTo('say star schema'));
    expect(r.deathCause).toBe('death.dragon');
  });
});

describe('guards against double awards and sequence breaks', () => {
  it('credentials award 10 once, whichever way you get them', () => {
    expect(play(['out', 'n', 'talk to miller', 'get credentials']).state.score).toBe(10);
    expect(play(['out', 'n', 'get credentials', 'talk to miller']).state.score).toBe(10);
    expect(play(['out', 'n', 'open chest', 'get credentials']).state.inventory.filter((i) => i === 'credentials')).toHaveLength(1);
  });
  it('the shrine door stays shut until all three trials are done', () => {
    const r = play(['out', 'e', 'e', 'e', 'n', 'n']);
    expect(r.state.room).toBe('peaks.ledge');
    expect(r.outcome).toBe('fail');
    expect(r.output.join(' ')).toContain('Still dark');
  });
  it('the dragon guards the model until answered', () => {
    const s = upTo('say star schema');
    expect(play(['get model'], s).outcome).toBe('fail');
    expect(play(['say star schema', 'get model'], s).state.won).toBe(true);
    expect(play(['say star schema', 'say star schema'], s).outcome).toBe('snark');
  });
  it('the personal key is a trap', () => {
    const s = upTo('get standard key');
    const r = play(['get personal key'], s);
    expect(r.state.flags['trial.key']).toBeUndefined();
    expect(r.outcome).toBe('snark');
  });
});

describe('interactive delay', () => {
  it('costs 3 turns per command on the Pass without boots, 1 with', () => {
    const atFoothills = play(['out', 'e', 'e']).state;
    const slow = play(['e'], atFoothills);
    expect(slow.state.turns - atFoothills.turns).toBe(3);
    expect(slow.output[0]).toContain('interactive delay');
    const booted = { ...atFoothills, inventory: [...atFoothills.inventory, 'boots'], worn: ['boots'] };
    const fast = play(['e'], booted);
    expect(fast.state.turns - atFoothills.turns).toBe(1);
  });
});

describe('ye flask', () => {
  it('gives a room-specific hint everywhere and counts uses', () => {
    const a = play(['get ye flask']);
    expect(a.output[0]).toContain('Ye cannot get ye flask');
    expect(a.output[0]).toContain('mug');
    expect(a.state.flags['flask.count']).toBe(1);
    const b = play(['out', 'get ye flask', 'get flask']);
    expect(b.state.flags['flask.count']).toBe(2);
    expect(b.output[0]).toContain('notice board');
    const ledge = play(['get ye flask'], play(['out', 'e', 'e', 'e', 'n']).state);
    expect(ledge.output.join('\n')).toContain('wear the hoodie, smell like the moat, hold the key'); // spec §18: the hint names the action
  });
});

describe('easter eggs', () => {
  it.each([
    ['sudo make me a sandwich', 'sudoers'],
    ['export to excel', '1,048,576'],
    ['calculate', 'Context'],
    ['ask the ai for help', 'sourdough'],
    ['xyzzy', 'Direct Lake'],
    ['refresh', 'productive'],
  ])('%s', (cmd, expected) => {
    const r = play([cmd]);
    expect(r.output[0]).toContain(expected);
    expect(r.outcome).toBe('snark');
    expect(r.state.dead).toBe(false);
  });
});

describe('restart', () => {
  it('a fresh game after death starts clean', () => {
    const dead = play(['out', 's', 's', 'drink water']).state;
    expect(dead.dead).toBe(true);
    const fresh = newGame(WORLD, dead.seed);
    expect(fresh.score).toBe(0);
    expect(fresh.room).toBe('village.cottage');
    expect(fresh.inventory).toEqual(['license']);
  });
});
