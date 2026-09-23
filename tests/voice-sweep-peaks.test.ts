import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { BRUSHOFFS, MALAPROPS } from '../src/world/voice';
import type { GameState } from '../src/engine/types';

/** The Pass and the Ledge, bootless, open every turn on the engine's interactive-delay line; the answer is the line after it. */
const DELAY = '(…interactive delay…)';
const answer = (out: string[]): string => out.find((l) => l !== DELAY)!;
const one = (room: string, cmd: string, inventory: string[] = ['license']) => answer(step({ ...newGame(WORLD, 3), room, inventory }, cmd, WORLD).output);
const at = (room: string, extra: Partial<GameState> = {}): GameState => ({ ...newGame(WORLD, 3), room, inventory: ['license'], ...extra });
/** First line of each turn. */
const run = (s: GameState, cmds: string[]): string[] => {
  let state = s;
  const out: string[] = [];
  for (const c of cmds) { const r = step(state, c, WORLD); state = r.state; out.push(answer(r.output)); }
  return out;
};
const OPEN = { flags: { 'trial.hoodie': true, 'trial.moat': true, 'trial.key': true, 'shrine.open': true } };

describe('Peaks sweep: the plan lines', () => {
  it('foothills, pass, ledge', () => {
    expect(one('peaks.foothills', 'climb the mountain')).toBe('You climb. The mountain bills you per vertical second. You stop at the first ledge to check the invoice.');
    expect(one('peaks.foothills', 'look at sign')).toMatch(/PLEASE DO NOT FEED THE DRAGON\.$/);
    expect(one('peaks.pass', 'pay')).toBe('You try to pay the receipt. The Pass accepts Capacity Units only. You have a Pro license and, at this altitude, opinions.');
    expect(one('peaks.pass', 'look')).toMatch(/billed per second\./);
    expect(one('peaks.ledge', 'use carabiner', ['license', 'carabiner'])).toBe('You clip the carabiner to yourself. Rated F64. You are, at best, F2.');
    expect(one('peaks.ledge', 'look at door')).toMatch(/^A great door carved with three sigils: a HOODIE, three wavy STINK LINES, and a KEY\. The hoodie sigil is dark\./);
  });
  it('shrine', () => {
    // Deviation: the first ask about the model keeps the two-word hint (tests/npc-talk.test.ts pins it); the second, in a row, says too much.
    const [first, second] = run(at('peaks.shrine'), ['ask throttlor about the model', 'ask throttlor about the model']);
    expect(first).toMatch(/Two words, peasant\. One fact table/);
    expect(second).toBe("'The model,' says Throttlor, 'is one golden table.' He glances at the pedestal. 'Don't look inside.'");
    expect(one('peaks.shrine', 'use model')).toBe('You reach past a dragon for the Model. He clears his throat, in smoke.');
    expect(one('peaks.shrine', 'look at pedestal')).toBe('A pedestal, plinth-grade. It has held the Model since the last capacity outage; before that, it held a different Model, also golden, also one table.');
    expect(one('peaks.shrine', 'say calculate')).toBe('Throttlor yawns. Context transition means nothing to a dragon.');
  });
});

describe('Peaks sweep: beyond the plan', () => {
  it('the Shrine door is a progress gate: n of 3, adjusted for what is done, a new nickname each look', () => {
    const zero = run(at('peaks.ledge'), ['look at door', 'look at door', 'look at door']);
    expect(zero[1]).toMatch(/^Zero of 3, [^.]+\. You don't LOOK like an Engineer, you don't SMELL like a Warehouse and you're not HOLDING the Key\. The door has had better peasants\.$/);
    expect(zero[2]).toMatch(/^Zero of 3, [^.]+\. You don't LOOK like an Engineer, you don't SMELL like a Warehouse and you're not HOLDING the Key\. The door has had better peasants\.$/);
    expect(zero[2]!.split('.')[0]).not.toBe(zero[1]!.split('.')[0]); // a new nickname
    const one3 = run(at('peaks.ledge', { flags: { 'trial.moat': true } }), ['look at sigils', 'look at sigils'])[1]!;
    expect(one3).toMatch(/^One of 3, [^.]+\. Frankly, you smell like a Warehouse\. But you don't LOOK like an Engineer and you're not HOLDING the Key\.$/);
    const two3 = run(at('peaks.ledge', { flags: { 'trial.moat': true, 'trial.hoodie': true } }), ['look at door', 'look at door'])[1]!;
    expect(two3).toMatch(/^Almost there, [^.]+\. But you're not HOLDING the Key\.$/);
    expect(run(at('peaks.ledge', OPEN), ['look at door', 'look at door'])[1]).toMatch(/^Lookin' good, /);
    // North twice at a shut door: the checklist, not the same line.
    const north = run(at('peaks.ledge', { flags: { 'trial.key': true } }), ['n', 'n']);
    expect(north[0]).toMatch(/^The door does not move\. Still dark:/);
    expect(north[1]).toMatch(/^The door does not move\. One of 3, [^.]+\. You hold the Key like a man who expects to give it back\. But /);
  });
  it('the Worthy still open the door with a look; the golden path is untouched', () => {
    const r = step(at('peaks.ledge', { flags: { 'trial.hoodie': true, 'trial.moat': true, 'trial.key': true } }), 'look at door', WORLD);
    expect([r.stepId, r.pointsAwarded]).toEqual(['peaks.shrine-door', 5]);
  });
  it("Throttlor's wrong answers rotate with a nickname and echo you; the scored answer still scores", () => {
    const wrong = run(at('peaks.shrine'), ['say banana', 'say banana', 'say banana']);
    expect(new Set(wrong).size).toBe(3);
    for (const l of wrong) expect(l).toMatch(/banana/);
    expect(wrong.join('\n')).toMatch(/Wrong, [^.]+\. Two words\. One of them is up in the sky\./);
    expect(wrong.join('\n')).toMatch(/Probably Column1\.'$/m);
    expect(step(at('peaks.shrine'), 'say star schema', WORLD).pointsAwarded).toBe(10);
    expect(one('peaks.shrine', 'say one big table')).toMatch(/You have made things worse\./);
    expect(one('peaks.shrine', 'say')).toBe('Say what?');
    expect(step(at('peaks.shrine', { flags: { 'dragon.gone': true } }), 'say banana', WORLD).output.find((l) => l !== DELAY)).not.toMatch(/Throttlor/);
  });
  it("Throttlor's brush-off: the voice line first, then variants by talk count; the warehouse derails him", () => {
    expect(step(at('peaks.shrine'), 'ask dragon about capacity', WORLD).output.find((l) => l !== DELAY)).toBe(BRUSHOFFS.throttlor);
    const later = run(at('peaks.shrine', { flags: { 'talk.throttlor': 1 } }), ['ask dragon about capacity', 'ask dragon about the weather', 'ask dragon about lunch']);
    expect(new Set(later).size).toBe(3);
    for (const l of later) expect(l).not.toBe(BRUSHOFFS.throttlor);
    expect(later.join('\n')).toMatch(/smoothed over 24 hours, [^.]+\. Come back tomorrow\./);
    expect(one('peaks.shrine', 'ask throttlor about the warehouse')).toMatch(/You ARE the Warehouse\..*a view nobody documented\.'$/);
    const looks = run(at('peaks.shrine'), ['look at throttlor', 'look at throttlor']);
    expect(looks[1]).toMatch(/^Still THROTTLOR\./);
    expect(run(at('peaks.shrine'), ['look at model', 'look at model'])[1]).toBe('Still perfect, from here. Everything is, from far enough away.');
    expect(step(at('peaks.shrine', { inventory: ['license', 'capacityade'] }), 'give capacityade to throttlor', WORLD).output.find((l) => l !== DELAY)).toMatch(/I don't drink my own product/);
  });
  it('the Pass: the interactive delay without boots, in boots, and with Autoscale', () => {
    expect(one('peaks.pass', 'hurry')).toBe('You try to hurry. The Pass queues the hurry and delivers it tomorrow, as a stroll.');
    expect(step(at('peaks.pass', { worn: ['boots'], inventory: ['license', 'boots'] }), 'run', WORLD).output.find((l) => l !== DELAY)).toMatch(/Bursting Boots burst/);
    expect(step(at('peaks.pass', { flags: { 'ts.autoscale': true } }), 'sprint', WORLD).output.find((l) => l !== DELAY)).toMatch(/Autoscale notices.*Finance gets both bills\.$/);
    expect(run(at('peaks.pass'), ['pay', 'pay'])[1]).toMatch(/no card reader, just a dragon/);
  });
  it('second and third looks: the sign, the ledge, the ade, the receipt, the rocks, the carabiner, the pedestal', () => {
    const sign = run(at('peaks.foothills'), ['look at sign', 'look at sign', 'look at sign']);
    expect(sign[1]).toMatch(/same sign, arriving late\.$/); expect(sign[2]).toMatch(/it has one visual\.$/);
    expect(run(at('peaks.ledge'), ['look', 'look'])[1]).toMatch(/The pass is south\. The drop off the edge is the only thing up here with no interactive delay\. Do not test that\.\n/);
    const ade = run(at('peaks.pass', { inventory: ['license', 'capacityade'] }), ['look at capacityade', 'look at capacityade', 'look at capacityade']);
    expect(ade[1]).toMatch(/always standing on one\.$/); expect(ade[2]).toMatch(/started on the death text\.$/);
    expect(run(at('peaks.pass'), ['look at receipt', 'look at receipt'])[1]).toMatch(/1 look at a receipt, 400 CU-seconds\.$/);
    expect(run(at('peaks.pass'), ['look at rocks', 'look at rocks'])[1]).toMatch(/That look took longer than the first one\.$/);
    expect(run(at('peaks.ledge', { inventory: ['license', 'carabiner'] }), ['look at carabiner', 'look at carabiner'])[1]).toBe('Still F64. You checked twice. You are still not F64.');
    expect(run(at('peaks.shrine'), ['look at pedestal', 'look at pedestal'])[1]).toMatch(/outlast your interest\.$/);
    expect(run(at('peaks.foothills'), ['climb mountain', 'climb mountain'])[1]).toMatch(/late fee\./);
  });
});
