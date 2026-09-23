import { describe, expect, it } from 'vitest';
import { INTENT_NO, INTENT_OK, unwrap } from '../src/engine/quirks';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';

describe('unwrap', () => {
  it('strips intent, insistence and frustration wrappers', () => {
    expect(unwrap('I want to get mug')).toMatchObject({ command: 'get mug', kind: 'intent' });
    expect(unwrap("i'd like to read board")).toMatchObject({ command: 'read board', kind: 'intent' });
    expect(unwrap('can I get mug?')).toMatchObject({ command: 'get mug?', kind: 'intent' });
    expect(unwrap('I said get mug')).toMatchObject({ command: 'get mug', kind: 'insist' });
    expect(unwrap('get mug again')).toMatchObject({ command: 'get mug', kind: 'insist' });
    expect(unwrap('get mug, dammit')).toMatchObject({ command: 'get mug', kind: 'frustrated' });
    expect(unwrap('ugh get mug')).toMatchObject({ command: 'get mug', kind: 'frustrated' });
    expect(unwrap('come on, get mug!')).toMatchObject({ command: 'get mug!', kind: 'frustrated' });
    expect(unwrap('get mug')).toMatchObject({ command: 'get mug', kind: null });
    expect(unwrap('wait')).toMatchObject({ command: 'wait', kind: null });
    expect(unwrap('just')).toMatchObject({ command: 'just', kind: null }); // a bare wrapper is not a wrapper
    expect(unwrap('hey there')).toMatchObject({ command: 'hey there', kind: null }); // "hey" without , or ! is not a wrapper (would swallow egg.hello)
    expect(unwrap('hey, get mug')).toMatchObject({ command: 'get mug', kind: 'frustrated' });
    expect(unwrap('what now')).toMatchObject({ command: 'what now', kind: null }); // a hint request, not a frustrated "what"
    expect(unwrap('what now?')).toMatchObject({ command: 'what now?', kind: null });
    expect(unwrap('ugh, what now')).toMatchObject({ command: 'what now', kind: 'frustrated' });
    expect(unwrap('get mug now')).toMatchObject({ command: 'get mug', kind: 'frustrated' });
  });
  it('says which wrapper words it took off, front and back', () => {
    expect(unwrap('ugh get mug please')).toEqual({ command: 'get mug', kind: 'frustrated', lead: { kind: 'frustrated', word: 'ugh' }, trail: { kind: 'frustrated', word: 'please' } });
    expect(unwrap('i want to get mug again')).toMatchObject({ kind: 'intent', lead: { word: 'i want to' }, trail: { kind: 'insist', word: 'again' } });
  });
});

describe('wrapped commands in play', () => {
  const run = (cmds: string[]) => { let s = newGame(WORLD, 4); const outs: string[][] = []; for (const c of cmds) { const r = step(s, c, WORLD); s = r.state; outs.push(r.output); } return { s, outs, last: outs[outs.length - 1]! }; };
  it('i want to get mug picks up the mug and adds an intent line', () => {
    const { s, last } = run(['i want to get mug']);
    expect(s.inventory).toContain('mug');
    expect(last[0]).toMatch(/take the|get that|pocket the|acquired|grab the/i);
    expect(last.length).toBe(2);
    expect(s.flags['wrap.intent']).toBe(1);
  });
  it('i said get mug on a held mug adds an insistence line; with ! also a shout line', () => {
    const a = run(['get mug', 'i said get mug']);
    expect(a.last.length).toBe(2);
    expect(a.s.flags['wrap.insist']).toBe(1);
    const b = run(['get mug', 'I SAID GET MUG!']);
    expect(b.last.length).toBe(3);
  });
  it('the three-way escalation fires on wrapper + ! + third try', () => {
    const { last } = run(['get csv', 'get csv', 'i said get csv!']);
    expect(last.some((l) => /support ticket/i.test(l))).toBe(true);
  });
  it('a wrapped Copilot-style sentence never breaks the golden path commands', () => {
    const { s } = run(['i want to look', 'just wait', 'okay fine, inventory']);
    expect(s.turns).toBe(3);
  });
  it('the flask keeps its own repeat nag even when wrapped', () => {
    const { last } = run(['get ye flask', 'i want to get ye flask']);
    expect(last.slice(2).some((l) => /flask|wish/i.test(l))).toBe(true);
    expect(last.some((l) => INTENT_NO.includes(l))).toBe(true); // the flask never works, so the wanting is all that happened
  });
  it('"hey there" and "listen to the dragon" still hit their egg, not the frustration wrapper', () => {
    const s1 = newGame(WORLD, 1);
    expect(step(s1, 'hey there', WORLD).output[0]).toMatch(/does not say hello back/i);
    const s2 = newGame(WORLD, 1);
    expect(step(s2, 'listen to the dragon', WORLD).output[0]).toMatch(/refresh fails softly/i);
  });
});

describe('intent lines match the turn (final review M8)', () => {
  const last = (s: ReturnType<typeof newGame>, cmd: string) => { const r = step(s, cmd, WORLD); return r.output[r.output.length - 1]!; };
  it('a failed "how do i get the mug" never claims you just did it', () => {
    let s = newGame(WORLD, 4);
    s = step(s, 'get mug', WORLD).state;
    for (let t = 0; t < 12; t++) {
      const line = last({ ...s, turns: s.turns + t }, 'how do i get the mug');
      expect(INTENT_NO, line).toContain(line);
    }
  });
  it('a successful one never says only the wanting happened', () => {
    for (let t = 0; t < 12; t++) {
      const line = last({ ...newGame(WORLD, 4), turns: t }, 'i want to get mug');
      expect(INTENT_OK, line).toContain(line);
    }
  });
});
