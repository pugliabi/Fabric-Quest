import { describe, it, expect } from 'vitest';
import { newGame, step, MAX_SCORE } from '../src/engine/step';
import { WORLD } from '../src/world';
import { GOLDEN_PATH } from './golden-path';

describe('golden path', () => {
  it('reaches 200/200 and wins without dying', () => {
    let s = newGame(WORLD, 42);
    const log: string[] = [];
    for (const cmd of GOLDEN_PATH) {
      const r = step(s, cmd, WORLD);
      log.push(`> ${cmd}\n${r.output.join('\n')}\n  [${r.outcome} ${r.stepId} +${r.pointsAwarded} score=${r.state.score}]`);
      expect(r.state.dead, log.join('\n')).toBe(false);
      expect(r.outcome, log.join('\n')).not.toBe('snark');
      s = r.state;
    }
    expect(s.score, log.join('\n')).toBe(MAX_SCORE);
    expect(s.won).toBe(true);
    expect(s.flags['trial.hoodie']).toBe(true);
    expect(s.flags['trial.moat']).toBe(true);
    expect(s.flags['trial.key']).toBe(true);
  });

  it('sum of all distinct scored rules in the world is exactly 200', () => {
    const seen = new Map<string, number>();
    const add = (id: string, key: string | undefined, pts: number | undefined) => {
      if (!pts) return;
      const k = key ?? id;
      if (seen.has(k) && seen.get(k) !== pts) throw new Error(`pointsKey ${k} has conflicting values`);
      seen.set(k, pts);
    };
    for (const room of Object.values(WORLD.rooms)) for (const r of room.rules) add(r.id, r.then.pointsKey, r.then.points);
    for (const r of WORLD.globalRules) add(r.id, r.then.pointsKey, r.then.points);
    expect(seen.size).toBe(17);
    expect([...seen.values()].reduce((a, b) => a + b, 0)).toBe(200);
  });
});
