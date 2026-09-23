// Spec2 §5: the Abbot's errand (+10, either order) and governance restored (+5, once).
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import type { GameState } from '../src/engine/types';

const run = (cmds: string[], start: Partial<GameState>) => {
  let s: GameState = { ...newGame(WORLD, 5), ...start };
  const outs: string[] = [];
  for (const c of cmds) { const r = step(s, c, WORLD); s = r.state; outs.push(r.output.join('\n')); }
  return { s, outs };
};
const cloister = { room: 'monastery.cloister', flags: { 'gate.open': true } };

describe("the Abbot's errand (+10, spec2 §5)", () => {
  it('Abbot first, then the Sacristy: +10 on the flip', () => {
    const { s, outs } = run(['talk to abbot', 'u', 'turn off publish to web'], cloister);
    expect(outs[0]).toMatch(/Someone published the prophecy to web\. The whole internet can read it\. Go up to the Sacristy and turn it off\./);
    expect(outs[2]).toMatch(/\+10\. The prophecy is private again\. 4,112 people already read it\./);
    expect(s.bonus).toBe(10); expect(s.flags['gov.errandDone']).toBe(true);
    // Off is the default now: on-then-off again is a restore (+5), never a second +10.
    const again = run(['turn on publish to web', 'turn off publish to web'], { ...s });
    expect(again.outs[1]).not.toMatch(/\+10/); expect(again.outs[1]).toMatch(/\+5/); expect(again.s.bonus).toBe(15);
  });
  it('Sacristy first, then the Abbot: +10 on the talk', () => {
    const { s, outs } = run(['u', 'turn off publish to web', 'd', 'talk to abbot', 'talk to abbot'], cloister);
    expect(outs[1]).not.toMatch(/\+10/);
    expect(outs[3]).toMatch(/…and it is already off\. You are ahead of me\. \+10\./);
    expect(s.bonus).toBe(10);
    expect(outs[4]).not.toMatch(/\+10/);
  });
  it('the hoodie talk comes first; the errand on the next talk', () => {
    const { outs } = run(['talk to abbot', 'talk to abbot'], { ...cloister, flags: { ...cloister.flags, 'notebook.fixed': true } });
    expect(outs[0]).toMatch(/Hoodie of Spark/); expect(outs[1]).toMatch(/published the prophecy to web/);
  });
});

describe('governance restored (+5)', () => {
  const sacristy = { room: 'monastery.sacristy' };
  it('flip away and back pays once; reset pays; nothing touched pays nothing', () => {
    const a = run(['turn off xmla', 'turn on xmla', 'turn off xmla', 'turn on xmla'], sacristy);
    expect(a.outs[1]).toMatch(/Every setting is back where you found it\. Nobody will ever know\. \+5 for governance\./);
    expect(a.s.bonus).toBe(5);
    const b = run(['turn off export', 'turn off xmla', 'reset settings'], sacristy);
    expect(b.outs[2]).toMatch(/\+5 for governance/); expect(b.s.bonus).toBe(5);
    const c = run(['reset settings'], sacristy);
    expect(c.outs[0]).not.toMatch(/\+5/); expect(c.s.bonus).toBe(0);
  });
  it('does not fight the errand: the errand flip pays 10, not 15, and a later restore still pays 5', () => {
    const { s, outs } = run(['u', 'turn off publish to web', 'turn off xmla', 'turn on xmla'], { ...cloister, flags: { ...cloister.flags, 'gov.errand': true } });
    expect(outs[1]).toMatch(/\+10/); expect(outs[1]).not.toMatch(/\+5/);
    expect(outs[3]).toMatch(/\+5/);
    expect(s.bonus).toBe(15);
  });
  it('the Sacristy hint names the errand while it is open', () => {
    expect(WORLD.rooms['monastery.sacristy']!.flaskHint({ ...newGame(WORLD, 1), flags: { 'gov.errand': true } })).toBe('The Abbot asked: `turn off publish to web`.');
  });
});
