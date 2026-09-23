import { describe, expect, it } from 'vitest';
import { CUES } from '../src/game/sfx';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';

describe('cues (spec2 §10)', () => {
  it('toggle is two notes up, toggle-off two notes down, survey a ding-dong', () => {
    expect(CUES.toggle.map((n) => n[0])).toEqual([659.25, 783.99]);
    expect(CUES['toggle-off'].map((n) => n[0])).toEqual([783.99, 659.25]);
    expect(CUES.survey).toHaveLength(2);
  });
  it('a flip asks for toggle / toggle-off; a survey turn asks for survey', () => {
    const s = { ...newGame(WORLD, 1), room: 'monastery.sacristy' };
    expect(step(s, 'turn off export', WORLD).sfx).toBe('toggle-off');
    expect(step(s, 'turn on guests', WORLD).sfx).toBe('toggle');
    expect(step({ ...newGame(WORLD, 1), flags: { 'ts.feedback': true }, turns: 4 }, 'look', WORLD).sfx).toBe('survey');
  });
  it('every cue a world rule names is defined (play() no longer guards against unknown names)', () => {
    const named = new Set<string>();
    for (const r of WORLD.globalRules) if (r.then.sfx) named.add(r.then.sfx);
    for (const room of Object.values(WORLD.rooms)) for (const r of room.rules) if (r.then.sfx) named.add(r.then.sfx);
    for (const p of WORLD.phraseRules) {
      if (p.sfx) named.add(p.sfx);
      if (p.then && typeof p.then !== 'function' && p.then.sfx) named.add(p.then.sfx);
    }
    expect(named.size).toBeGreaterThan(0);
    for (const cue of named) expect(Object.keys(CUES), cue).toContain(cue);
  });
});
