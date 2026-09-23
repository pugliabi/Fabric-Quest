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
    expect(last[0]).toMatch(/take the|get that|pocket the|acquired|grab the/i);
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
  it('a failed command repeated in the same room gets the answer alone: nothing is stacked on a line that answered', () => {
    const { s, outs } = play(['get csv', 'get csv', 'get csv', 'get csv']);
    for (const o of outs.slice(0, 3)) expect(o.length).toBe(1);
    // The fourth dead turn in the room brings the stuck helper (step.ts), not a repeat chirp.
    expect(outs[3]!.length).toBe(2);
    expect(outs[3]![1]).toMatch(/^A hollow voice adds: /);
    expect(s.recent).toMatchObject({ input: 'get csv', n: 4 });
  });
  it('the counter resets when you move rooms or change the command', () => {
    const { s, outs } = play(['get csv', 'inventory', 'get csv']); // stays in the cottage (Jeff would interject in the square)
    expect(outs[2]!.length).toBe(1);
    expect(s.recent).toMatchObject({ input: 'get csv', n: 1 });
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

describe('chirps: a repeat gets the game\'s answer, and only the flask nags', () => {
  const mugAgain = WORLD.items.mug!.again as string;
  it('(a) get mug twice: the second answer is the mug\'s own line, and that IS the repeat joke', () => {
    const { outs } = play(['get mug', 'get mug']);
    expect(outs[0]).toHaveLength(1); expect(outs[0]![0]).toMatch(/take the|get that|pocket the|acquired|grab the/i);
    expect(outs[1]).toEqual([mugAgain]);
  });
  it('(a\') the third get mug says the mug\'s line again, alone — and the counter kept climbing', () => {
    const { s, outs } = play(['get mug', 'get mug', 'get mug']);
    expect(outs[2]).toEqual([mugAgain]);
    expect(s.recent).toMatchObject({ input: 'get mug', n: 3 });
  });
  it('(b) sing twice: the same answer, and nothing under it', () => {
    const { outs } = play(['sing', 'sing']);
    expect(outs[1]).toEqual(outs[0]);
    expect(outs[1]!.length).toBe(1);
  });
  it('(c) get ye flask twice: its own nag, regardless', () => {
    const { outs } = play(['get ye flask', 'get ye flask']);
    expect(outs[1]!.length).toBe(outs[0]!.length + 1);
    expect(outs[1]![outs[1]!.length - 1]).toMatch(/flask|wish/i);
  });
  it('(d) get mug! twice: the shout line as before, and no repeat chirp under the mug\'s line', () => {
    const { outs } = play(['get mug!', 'get mug!']);
    expect(outs[0]![0]).toMatch(/take the|get that|pocket the|acquired|grab the/i);
    expect(outs[0]!.length).toBe(2);
    expect(outs[1]![0]).toBe(mugAgain);
    expect(outs[1]!.length).toBe(2); // the shout reaction only
    expect(outs[1]![1]).not.toMatch(/three|third|Same thing|slot machine|consistency|jaunty|humiliating|great time/i);
  });
  it('a generic failure typed again rotates its pool, and gets nothing else', () => {
    let rotated = 0;
    for (let seed = 1; seed <= 24; seed++) {
      const { outs } = play(['get sword', 'get sword'], seed);
      if (outs[1]![0] !== outs[0]![0]) rotated++;
      expect(outs[1]!.length, `seed ${seed}`).toBe(1);
    }
    expect(rotated).toBeGreaterThan(0);
  });
  it('a remembered second reading in a rule is the repeat answer; the third says it again, alone', () => {
    const { outs } = play(['open door', 'open door', 'open door'], 3);
    expect(outs[1]).toEqual(["Still open. It's a door, not a dialog."]);
    expect(outs[2]).toEqual(outs[1]);
  });
  it('the state remembers the command, where, and how many times in a row — not the answer', () => {
    const { s } = play(['get csv']);
    expect(s.recent).toEqual({ input: 'get csv', room: 'village.cottage', n: 1 });
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
