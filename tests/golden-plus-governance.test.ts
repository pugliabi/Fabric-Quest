// Spec2 §12: the golden path with a Sacristy detour (200 + 15) and with the applied steps (200 + 10).
import { describe, expect, it } from 'vitest';
import { MAX_SCORE, newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { GOLDEN_PATH } from './golden-path';

const play = (path: string[]) => {
  let s = newGame(WORLD, 42);
  const log: string[] = [];
  for (const cmd of path) {
    const r = step(s, cmd, WORLD);
    log.push(`> ${cmd}\n${r.output.join('\n')}\n  [${r.outcome} ${r.stepId} room=${r.state.room} score=${r.state.score} bonus=${r.state.bonus}]`);
    expect(r.state.dead, log.join('\n')).toBe(false);
    s = r.state;
  }
  return { s, log: log.join('\n') };
};

describe('golden + governance', () => {
  it('a Sacristy detour after the hoodie: xmla off/on (+5), publish to web off after the Abbot (+10), reset (nothing) → 200 + 15', () => {
    const at = GOLDEN_PATH.indexOf('wear hoodie') + 1;
    const DETOUR = ['talk to abbot', 'u', 'turn off xmla', 'turn on xmla', 'turn off publish to web', 'reset settings', 'd'];
    const { s, log } = play([...GOLDEN_PATH.slice(0, at), ...DETOUR, ...GOLDEN_PATH.slice(at)]);
    expect(s.score, log).toBe(MAX_SCORE); expect(s.bonus, log).toBe(15); expect(s.won, log).toBe(true);
    expect(s.flags['bonus.gov.abbot'], log).toBe(true); expect(s.flags['bonus.gov.restored'], log).toBe(true);
  });
  it('the applied steps in the hall on the way to the Duke → 200 + 10', () => {
    const at = GOLDEN_PATH.indexOf('use trial') + 2; // after 'use trial', 'n' (into the hall)
    const STEPS = ['source', 'navigate', 'promote headers', 'change type', 'filter rows', 'remove other columns', 'rename columns'];
    const { s, log } = play([...GOLDEN_PATH.slice(0, at), ...STEPS, ...GOLDEN_PATH.slice(at)]);
    expect(s.score, log).toBe(MAX_SCORE); expect(s.bonus, log).toBe(10); expect(s.won, log).toBe(true);
  });
});
