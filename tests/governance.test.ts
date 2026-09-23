import { describe, expect, it } from 'vitest';
import { DEFAULTS, SETTING_KEYS, applyGovernance, changedFromDefault, defaultOf, isFlood, setting } from '../src/engine/governance';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import type { GameState } from '../src/engine/types';

const s0 = (): GameState => newGame(WORLD, 1);

describe('setting(): flags over defaults', () => {
  it('a fresh game is all defaults, and the defaults keep today\'s behavior', () => {
    for (const k of SETTING_KEYS) expect(setting(s0(), k)).toBe(DEFAULTS[k]);
    expect(DEFAULTS).toEqual({ export: true, copilot: true, fabricItems: true, publishToWeb: true, guests: false, publishOrg: true, blockInternet: false, feedback: false, usageMetrics: false, monitoring: false, discover: true, pause: false, autoscale: false, surge: false, xmla: true, workloads: true });
    expect(changedFromDefault(s0())).toEqual([]);
  });
  it('ts.<key> overrides; publishToWeb defaults OFF after the errand', () => {
    expect(setting({ ...s0(), flags: { 'ts.export': false } }, 'export')).toBe(false);
    expect(changedFromDefault({ ...s0(), flags: { 'ts.export': false } })).toEqual(['export']);
    expect(defaultOf({ ...s0(), flags: { 'gov.errandDone': true } }, 'publishToWeb')).toBe(false);
    expect(changedFromDefault({ ...s0(), flags: { 'gov.errandDone': true, 'ts.publishToWeb': false } })).toEqual([]);
  });
  it('isFlood needs both books', () => {
    expect(isFlood(s0())).toBe(false);
    expect(isFlood({ ...s0(), flags: { 'ts.guests': true } })).toBe(true);
    expect(isFlood({ ...s0(), flags: { 'ts.guests': true, 'ts.publishOrg': false } })).toBe(false);
  });
});

describe('applyGovernance trailing lines', () => {
  const at = (flags: Record<string, boolean | number>, turns: number) => ({ ...s0(), room: 'village.square', flags, turns });
  const res = (state: GameState) => ({ state, output: ['x'], outcome: 'meta' as const, stepId: 'x', pointsAwarded: 0, parsed: { verb: 'look' as const, raw: 'look' } });
  it('survey every 5th turn, usage every 4th, bill every 10th; nothing by default', () => {
    expect(applyGovernance(s0(), res(at({}, 20)), WORLD).output).toEqual(['x']);
    expect(applyGovernance(s0(), res(at({ 'ts.feedback': true }, 5)), WORLD).output[1]).toMatch(/^\[Survey\]/);
    expect(applyGovernance(s0(), res(at({ 'ts.feedback': true }, 6)), WORLD).output).toHaveLength(1);
    expect(applyGovernance(s0(), res(at({ 'ts.usageMetrics': true }, 8)), WORLD).output[1]).toMatch(/^Usage metrics: /);
    expect(applyGovernance(s0(), res(at({ 'ts.autoscale': true }, 10)), WORLD).output[1]).toBe('A bill arrives. Autoscale: 1 CU-hour. Finance would like a word.');
  });
  it('the survey names the room mid-sentence, lowercase "the" (fix round 1, M4)', () => {
    expect(applyGovernance(s0(), res({ ...at({ 'ts.feedback': true }, 15), room: 'monastery.sacristy' }), WORLD).output[1]).toBe('[Survey] How likely are you to recommend the Sacristy to a colleague? (0–10)');
    expect(applyGovernance(s0(), res(at({ 'ts.feedback': true }, 15)), WORLD).output[1]).toBe('[Survey] How likely are you to recommend Village Square to a colleague? (0–10)');
  });
  it('never in a side realm, never when dead', () => {
    expect(applyGovernance(s0(), res({ ...at({ 'ts.feedback': true }, 5), room: 'excel.sheet1' }), WORLD).output).toHaveLength(1);
    expect(applyGovernance(s0(), res({ ...at({ 'ts.feedback': true }, 5), dead: true }), WORLD).output).toHaveLength(1);
  });
});

describe('the delay predicate (rule 4)', () => {
  it('autoscale skips the Peaks delay; the flood delays everywhere', () => {
    const foothills = { ...s0(), room: 'peaks.foothills' };
    expect(step(foothills, 'e', WORLD).state.turns - foothills.turns).toBe(3);
    expect(step({ ...foothills, flags: { 'ts.autoscale': true } }, 'e', WORLD).state.turns - foothills.turns).toBe(1);
    const cottage = { ...s0(), flags: { 'ts.guests': true } };
    const r = step(cottage, 'look', WORLD);
    expect(r.state.turns - cottage.turns).toBe(3);
    expect(r.output[0]).toBe('(…interactive delay…)');
  });
});
