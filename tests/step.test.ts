import { describe, it, expect } from 'vitest';
import { newGame, step } from '../src/engine/step';
import type { World } from '../src/world/types';

const fixture: World = {
  start: 'a',
  version: 'test',
  snark: ['Snark one.', 'Snark two.', 'Snark three.'],
  helpText: 'help!',
  items: {
    license: { id: 'license', name: 'license', aliases: ['card'], takeable: true, describe: 'A license.' },
    rock: { id: 'rock', name: 'rock', aliases: ['stone'], takeable: true, describe: 'A rock.' },
    anvil: { id: 'anvil', name: 'anvil', aliases: [], takeable: false, describe: 'Heavy.', untakeableText: 'Too heavy.' },
    hat: { id: 'hat', name: 'hat', aliases: [], takeable: true, wearable: true, describe: 'A hat.' },
    gem: { id: 'gem', name: 'gem', aliases: [], takeable: true, describe: 'Shiny.', visibleWhen: (s) => !!s.flags['sparked'] },
  },
  npcs: {
    bob: { id: 'bob', name: 'Bob', aliases: ['man'], describe: () => 'Bob.', talk: () => 'Hi.' },
    ghost: { id: 'ghost', name: 'Ghost', aliases: [], describe: () => 'Boo.', talk: () => 'Boo!', hiddenWhen: (s) => !!s.flags['sparked'] },
  },
  globalRules: [
    { id: 'egg.xyzzy', when: { verb: 'say', noun: 'xyzzy' }, then: { text: 'Plugh.', outcome: 'snark' } },
  ],
  phraseRules: [
    { id: 'egg.sudo', test: /^sudo\b/, text: 'Not in sudoers.' },
    { id: 'death.only-in-b', test: /^explode$/, text: 'Boom.', death: 'death.boom', room: 'b' },
  ],
  rooms: {
    a: {
      id: 'a', name: 'Room A', region: 'village', describe: () => 'Room A.', exits: { n: 'b' },
      items: ['rock', 'anvil', 'hat', 'gem'], npcs: ['bob', 'ghost'], scene: () => 'a', flaskHint: () => 'Try the anvil.',
      rules: [
        { id: 'a.rub', when: { verb: 'use', noun: 'rock', noun2: 'anvil', has: ['rock'] }, then: { text: 'Sparks!', points: 10, set: { sparked: true } } },
        { id: 'a.rub-alt', when: { verb: 'use', noun: 'stone', noun2: 'anvil', has: ['rock'] }, then: { text: 'Sparks again!', points: 10, pointsKey: 'a.rub', set: { sparked: true } } },
        { id: 'a.die', when: { verb: 'drink', noun: 'anvil' }, then: { text: 'You die.', death: 'death.anvil' } },
        { id: 'a.count', when: { verb: 'wait', flags: [{ flag: 'w', is: 1 }] }, then: { text: 'Second wait.', set: { w: 2 } } },
        { id: 'a.count0', when: { verb: 'wait', flags: [{ flag: 'w', not: true }] }, then: { text: 'First wait.', set: { w: 1 } } },
        { id: 'a.regex', when: { verb: 'say', nounMatches: /^select .+ from/ }, then: { text: 'Column list.', outcome: 'snark' } },
      ],
    },
    b: {
      id: 'b', name: 'Room B', region: 'village', describe: () => 'Room B.',
      exits: { s: 'a', n: (s) => (s.flags['sparked'] ? 'a' : null) },
      items: [], npcs: [], scene: () => 'b', rules: [], flaskHint: () => 'Go south.',
      onEnter: () => 'You feel watched.',
    },
  },
};

describe('step', () => {
  it('moves between rooms and reports outcome move', () => {
    const r = step(newGame(fixture, 1), 'n', fixture);
    expect(r.state.room).toBe('b');
    expect(r.outcome).toBe('move');
    expect(r.stepId).toBe('b');
    expect(r.output.join('\n')).toContain('Room B');
    expect(r.output.join('\n')).toContain('You feel watched.');
  });
  it('blocks conditional and missing exits', () => {
    const r = step({ ...newGame(fixture, 1), room: 'b' }, 'n', fixture);
    expect(r.state.room).toBe('b');
    expect(r.outcome).toBe('fail');
    expect(step(newGame(fixture, 1), 'w', fixture).outcome).toBe('fail');
  });
  it('gets and drops items, refuses untakeable', () => {
    let r = step(newGame(fixture, 1), 'take stone', fixture);
    expect(r.state.inventory).toContain('rock');
    expect(r.outcome).toBe('success');
    r = step(r.state, 'get anvil', fixture);
    expect(r.output[0]).toBe('Too heavy.');
    expect(r.outcome).toBe('fail');
    r = step(r.state, 'drop rock', fixture);
    expect(r.state.inventory).not.toContain('rock');
    expect(step(r.state, 'look', fixture).output.join(' ')).toContain('rock');
  });
  it('fires room rules once for points, shared via pointsKey', () => {
    let r = step(newGame(fixture, 1), 'get rock', fixture);
    r = step(r.state, 'use rock on anvil', fixture);
    expect(r.pointsAwarded).toBe(10);
    expect(r.state.score).toBe(10);
    expect(r.state.flags['sparked']).toBe(true);
    r = step(r.state, 'use stone on anvil', fixture);
    expect(r.pointsAwarded).toBe(0);
    expect(r.state.score).toBe(10);
  });
  it('handles death', () => {
    const r = step(newGame(fixture, 1), 'drink anvil', fixture);
    expect(r.state.dead).toBe(true);
    expect(r.outcome).toBe('death');
    expect(r.deathCause).toBe('death.anvil');
  });
  it('wears wearable items and refuses others', () => {
    let r = step(newGame(fixture, 1), 'get hat', fixture);
    r = step(r.state, 'wear hat', fixture);
    expect(r.state.worn).toEqual(['hat']);
    r = step(r.state, 'get rock', fixture);
    r = step(r.state, 'wear rock', fixture);
    expect(r.outcome).toBe('fail');
  });
  it('rotates snark deterministically for unknown verbs', () => {
    const a = step(newGame(fixture, 1), 'frob', fixture);
    const b = step(a.state, 'frob', fixture);
    expect(a.outcome).toBe('snark');
    expect(a.output[0]).not.toBe(b.output[0]);
    expect(step(newGame(fixture, 1), 'frob', fixture).output[0]).toBe(a.output[0]);
  });
  it('global rules apply in any room', () => {
    const r = step({ ...newGame(fixture, 1), room: 'b' }, 'say xyzzy', fixture);
    expect(r.output[0]).toBe('Plugh.');
    expect(r.outcome).toBe('snark');
  });
  it('increments turns on every command including meta', () => {
    const r = step(newGame(fixture, 1), 'inventory', fixture);
    expect(r.state.turns).toBe(1);
    expect(r.outcome).toBe('meta');
  });
  it('phrase rules run before parsing and respect room scoping', () => {
    const r = step(newGame(fixture, 1), 'sudo make me a sandwich', fixture);
    expect(r.output[0]).toBe('Not in sudoers.');
    expect(r.outcome).toBe('snark');
    expect(step(newGame(fixture, 1), 'explode', fixture).state.dead).toBe(false);
    expect(step({ ...newGame(fixture, 1), room: 'b' }, 'explode', fixture).state.dead).toBe(true);
  });
  it('flag counters gate rules in array order', () => {
    let r = step(newGame(fixture, 1), 'wait', fixture);
    expect(r.output[0]).toBe('First wait.');
    r = step(r.state, 'wait', fixture);
    expect(r.output[0]).toBe('Second wait.');
    r = step(r.state, 'wait', fixture);
    // Third `wait` in a row: the builtin's second line of the pair (recent.n is 3 by now).
    expect(r.output[0]).toBe("Still waiting. You're getting a pretty sweet workout for your patience muscles.");
  });
  it('supports regex noun matching', () => {
    expect(step(newGame(fixture, 1), 'say select a, b from t', fixture).output[0]).toBe('Column list.');
  });
  it('hides items and npcs until visible', () => {
    let r = step(newGame(fixture, 1), 'get gem', fixture);
    expect(r.outcome).toBe('snark');
    expect(step(newGame(fixture, 1), 'look', fixture).output.join(' ')).toContain('Ghost');
    r = step(newGame(fixture, 1), 'get rock', fixture);
    r = step(r.state, 'use rock on anvil', fixture);
    expect(step(r.state, 'look', fixture).output.join(' ')).not.toContain('Ghost');
    r = step(r.state, 'get gem', fixture);
    expect(r.state.inventory).toContain('gem');
  });
  it('talks to npcs', () => {
    expect(step(newGame(fixture, 1), 'talk to bob', fixture).output[0]).toBe('Hi.');
    expect(step(newGame(fixture, 1), 'talk to nobody', fixture).outcome).toBe('snark');
  });
});
