import { describe, expect, it } from 'vitest';

import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';

const play = (cmds: string[], seed = 5) => {
  let s = newGame(WORLD, seed);
  const outs: string[][] = [];
  for (const c of cmds) { const r = step(s, c, WORLD); s = r.state; outs.push(r.output); }
  return { s, outs, last: outs[outs.length - 1]! };
};

describe('chirps: shouting', () => {
  it('a trailing "!" still parses the command and adds a reaction line', () => {
    const { s, last } = play(['get mug!']);
    expect(s.inventory).toContain('mug');
    expect(last[0]).toContain('Taken');
    expect(last.length).toBe(2);
  });
  it('get ye flask! gets the flask-specific reaction', () => {
    const { last } = play(['get ye flask!']);
    expect(last.some((l) => /flask/i.test(l) && /caps|shout|volume/i.test(l))).toBe(true);
  });
  it('three or more marks get the ticket line', () => {
    const { last } = play(['dance!!!']);
    expect(last.some((l) => /ticket|P1|punctuation budget/.test(l))).toBe(true);
  });
  it('the raw line (with the !) is what telemetry sees', () => {
    const r = step(newGame(WORLD, 1), 'look!', WORLD);
    expect(r.parsed.raw).toBe('look!');
  });
});

describe('chirps: repeating yourself', () => {
  it('a failed command repeated in the same room escalates', () => {
    const { outs } = play(['get csv', 'get csv', 'get csv', 'get csv']);
    expect(outs[0]!.length).toBe(1);
    expect(outs[1]!.length).toBe(2);
    expect(outs[2]!.some((l) => /three|third/i.test(l))).toBe(true);
    expect(outs[3]!.some((l) => /4/.test(l))).toBe(true);
  });
  it('the counter resets when you move rooms or change the command', () => {
    const { outs } = play(['get csv', 'inventory', 'get csv']); // stays in the cottage (Jeff would interject in the square)
    expect(outs[2]!.length).toBe(1);
  });
  it('deliberate waits are never nagged (the Spark session puzzle needs them)', () => {
    const { outs } = play(['wait', 'wait', 'wait']);
    for (const o of outs) expect(o.length).toBe(1);
  });
  it('the flask is nagged even though it changes a flag', () => {
    const { outs } = play(['get ye flask', 'get ye flask']);
    expect(outs[1]!.length).toBeGreaterThan(outs[0]!.length);
  });
  it('the golden path is untouched (no repeat lines on its 200-point run)', async () => {
    const path = (await import('./golden-path.json')).default as string[];
    const { s } = play(path, 42);
    expect(s.score).toBe(200);
  });
});

describe('chirps: the realm has a policy', () => {
  it('bodily functions are room-aware', () => {
    const at = (room: string, c: string) => step({ ...newGame(WORLD, 2), room }, c, WORLD).output[0]!;
    expect(at('lake.shore', 'pee in the lake')).toMatch(/OneLake/);
    expect(at('monastery.cloister', 'pee')).toMatch(/monks/);
    expect(at('village.square', 'pee')).toMatch(/Jeff/);
    expect(at('lake.shore', 'poop')).toMatch(/unstructured/);
  });
  it('generic failures rotate instead of repeating one line', () => {
    const seen = new Set<string>();
    let s = newGame(WORLD, 11);
    for (const c of ['get csv', 'get csv', 'get csv', 'get csv', 'get csv', 'get csv']) { const r = step(s, c, WORLD); s = r.state; seen.add(r.output[0]!); }
    expect(seen.size).toBeGreaterThan(1);
  });
});
