// Spec §10: the golden path with both side quests played along the way still wins 200, plus the 45 bonus.
import { describe, expect, it } from 'vitest';
import { MAX_SCORE, newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { GOLDEN_PATH } from './golden-path';

const EXCEL = ['show me a table', 'ask jeff', 'n', 'use analyze in excel', 'sign in', 's', 'e', 'create pivot table', 'use sales region', 'use net sales', 'filter by year', 'w', 'show jeff'];
const COPILOT = ['copilot', 'show me sales', 'total q4 2025 northeast net sales from the certified model, just the number'];

const run = (at: number) => {
  const path = [...GOLDEN_PATH.slice(0, at), ...EXCEL, ...COPILOT, ...GOLDEN_PATH.slice(at)];
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

const AFTER_MONASTERY = GOLDEN_PATH.indexOf('wear hoodie') + 1;
const BACK_IN_VILLAGE = AFTER_MONASTERY + 7;
const AT_THE_SHRINE = GOLDEN_PATH.length - 1;

describe('golden path + both side quests (spec §10)', () => {
  it('the license is already with the Librarian at these points', () => {
    let s = newGame(WORLD, 42);
    for (const cmd of GOLDEN_PATH.slice(0, AFTER_MONASTERY)) s = step(s, cmd, WORLD).state;
    expect(s.inventory).not.toContain('license');
    expect(s.flags['scroll.lent']).toBe(true);
  });
  it.each([
    ['at the start', 0],
    ['right after the Monastery', AFTER_MONASTERY],
    ['back in the village', BACK_IN_VILLAGE],
    ['in the Shrine, before the Model', AT_THE_SHRINE],
  ])('%s: 200 + 45 and a win', (_where, at) => {
    const { s, log } = run(at);
    expect(s.score, log).toBe(MAX_SCORE);
    expect(s.bonus, log).toBe(45);
    expect(s.flags['sq.excel.done'], log).toBe(true);
    expect(s.flags['sq.copilot.done'], log).toBe(true);
    expect(s.won, log).toBe(true);
  });
});
