import { describe, expect, it } from 'vitest';

import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';

const run = (cmds: string[]) => {
  let s = newGame(WORLD, 7);
  const outs: string[] = [];
  for (const c of cmds) { const r = step(s, c, WORLD); s = r.state; outs.push(r.output.join('\n')); }
  return { s, outs, last: outs[outs.length - 1]! };
};

describe('god mode (burninate)', () => {
  it('is invisible until toggled: warp/prompts/rooms are ordinary snark before burninating', () => {
    const { s, last } = run(['warp throne']);
    expect(s.room).toBe(WORLD.start);
    expect(last).not.toContain('THRONE');
  });

  it('burninate toggles the flag and prints the secret help', () => {
    const on = run(['burninate']);
    expect(on.s.flags.god).toBe(true);
    expect(on.last).toContain('BURNINATION MODE');
    const off = run(['burninate', 'burninate']);
    expect(off.s.flags.god).toBe(false);
  });

  it('warp goes anywhere by id or name fragment', () => {
    expect(run(['burninate', 'warp peaks.shrine']).s.room).toBe('peaks.shrine');
    expect(run(['burninate', 'warp throne']).s.room).toBe('fortress.throne');
    expect(run(['burninate', 'warp nowhere-real']).last).toContain('No such room');
  });

  it('prompts lists the current room rules with points, and "all" covers every room', () => {
    const one = run(['burninate', 'warp village.square', 'prompts']).last;
    expect(one).toContain('VILLAGE SQUARE');
    expect(one).toContain('read board');
    expect(one).toContain('+5');
    const all = run(['burninate', 'prompts all']).last;
    for (const id of Object.keys(WORLD.rooms)) expect(all).toContain(id);
    const global = run(['burninate', 'prompts global']).last;
    expect(global).toContain('PHRASES');
  });

  it('summon puts an item in the inventory; flags dumps state', () => {
    const r = run(['burninate', 'summon golden', 'flags']);
    expect(r.s.inventory).toContain('model');
    expect(r.last).toContain('god = true');
    expect(r.last).toContain('taken.model = true');
  });

  it('normal play keeps working while burninating — rules, points, movement, easter eggs', () => {
    const r = run(['burninate', 'get mug', 'out', 'read board', 'give mug to jeff', 'warp mill', 'talk to miller', 'get ye flask']);
    expect(r.s.flags.god).toBe(true);
    expect(r.s.score).toBe(15); // prophecy +5, credentials +10 — awarded exactly as without god mode
    expect(r.s.inventory).toContain('credentials');
    expect(r.s.room).toBe('village.mill');
    expect(r.last.length).toBeGreaterThan(0); // the flask still answers
  });

  it('locate finds the guard, the key, jeff and the hoodie', () => {
    expect(run(['burninate', 'locate sku']).last).toMatch(/fortress\.bridge[\s\S]*say trial[\s\S]*\+10/);
    expect(run(['burninate', 'locate key']).last).toMatch(/lake\.island[\s\S]*get standard key/);
    expect(run(['burninate', 'locate jeff']).last).toMatch(/village\.square[\s\S]*Jeff/);
    expect(run(['burninate', 'what do i say to the guard']).last).toMatch(/say trial/);
    expect(run(['burninate', 'locate hoodie']).last).toMatch(/monastery\.cloister[\s\S]*talk to abbot/);
    expect(run(['burninate', 'locate unicorn']).last).toMatch(/Nothing in the realm answers/);
  });

  it('locate is logged as god.locate; find/how/what are aliases; "where" stays a non-god command', () => {
    const r = run(['burninate', 'locate sku']);
    expect(r.s.flags.god).toBe(true);
    const raw = step(r.s, 'locate sku', WORLD);
    expect(raw.stepId).toBe('god.locate');
    expect(raw.outcome).toBe('meta');
    for (const cmd of ['find sku', 'how do i get sku', 'what do i say to guard']) {
      const out = step(r.s, cmd, WORLD);
      expect(out.stepId).toBe('god.locate');
      expect(out.output.join('\n')).toMatch(/fortress\.bridge/);
    }
    // "where" is reserved for a future player-facing command, not a god command.
    const whereOut = step(r.s, 'where sku', WORLD);
    expect(whereOut.stepId).not.toBe('god.locate');
  });

  it('god-mode aliases survive wrapper phrasing ("how do i get X", "what do i give to X") by trying the raw line first', () => {
    const r = run(['burninate']);
    const howGet = step(r.s, 'how do i get the key', WORLD);
    expect(howGet.stepId).toBe('god.locate');
    expect(howGet.output.join('\n')).toMatch(/lake\.island/);

    const whatGive = step(r.s, 'what do i give to the ferryman', WORLD);
    expect(whatGive.stepId).toBe('god.locate');
    expect(whatGive.output.join('\n')).toMatch(/give credentials[\s\S]*to ferryman/);
  });

  it('ordinary intent wrappers still work in god mode when the raw line is not itself a god command', () => {
    const r = run(['burninate']);
    const out = step(r.s, 'i want to get mug', WORLD);
    expect(out.stepId).not.toBe('god.locate');
    expect(out.state.inventory).toContain('mug');
    expect(out.output[0]).toMatch(/take the|get that|pocket the|acquired|grab the/i);
    expect(out.output.length).toBe(1); // the base line alone: a wrapper adds nothing
    expect(out.state.flags['wrap.intent']).toBe(1);
  });

  it('"how"/"what" only claim their recognized alias shapes; everything else falls through to normal play', () => {
    const r = run(['burninate']);
    // "how about i <verb> ..." where <verb> isn't get/find is not a locate alias — normal play,
    // and the pre-existing "how about i" intent wrapper still strips and the mug is taken.
    const grab = step(r.s, 'how about i grab the mug', WORLD);
    expect(grab.stepId).not.toBe('god.locate');
    expect(grab.state.inventory).toContain('mug');
    // "how do i <verb> ..." where <verb> isn't get/find is not a locate alias either.
    const inspect = step(r.s, 'how do i inspect the mirror', WORLD);
    expect(inspect.stepId).not.toBe('god.locate');
    // The recognized shape still resolves to locate.
    const key = step(r.s, 'how do i get the key', WORLD);
    expect(key.stepId).toBe('god.locate');
    expect(key.output.join('\n')).toMatch(/lake\.island/);
  });

  it('resolving as a god command via the raw-line check never bumps the wrap.* counter', () => {
    const r = run(['burninate']);
    const out = step(r.s, 'how do i get the key', WORLD);
    expect(out.stepId).toBe('god.locate');
    expect(out.state.flags['wrap.intent']).toBeUndefined();
    expect(out.state.flags['wrap.insist']).toBeUndefined();
    expect(out.state.flags['wrap.frustrated']).toBeUndefined();
  });

  it('locate with no argument prompts for one', () => {
    const r = run(['burninate', 'locate']);
    expect(r.last).toBe('locate what?');
  });

  it('effectText shows bonus and returnTo in prompts output', () => {
    const all = run(['burninate', 'prompts all']).last;
    expect(all).toMatch(/\+\d+ bonus/);
    expect(all).toContain('→ back');
  });

  it('every step is logged as meta with a god.* step id', () => {
    let s = newGame(WORLD, 1);
    for (const c of ['burninate', 'rooms', 'prompts', 'flags']) {
      const r = step(s, c, WORLD);
      expect(r.stepId.startsWith('god.')).toBe(true);
      expect(r.outcome === 'meta' || r.outcome === 'move').toBe(true);
      s = r.state;
    }
  });
});

describe('locate layout (final review M7)', () => {
  it('each NPC block stays under its header; the output never starts indented', () => {
    for (const q of ['jeff', 'guard', 'abbot', 'librarian']) {
      const lines = run(['burninate', `locate ${q}`]).last.split('\n');
      expect(lines[0], q).not.toMatch(/^\s/);
      // every indented rule line belongs to the nearest header above it, which must be an "(npc …)" header
      let header = '';
      for (const l of lines) {
        if (!/^\s/.test(l)) header = l;
        else expect(header, `${q}: ${l}`).toMatch(/\(npc /);
      }
    }
  });
  it('a rule is listed once, however it was found', () => {
    for (const q of ['key', 'hoodie', 'policy', 'jeff', 'sku']) {
      // A rule's identity here: its room (or its NPC block's header), its prompt and its needs; the effect text is dropped.
      let header = '';
      const rules: string[] = [];
      for (const l of run(['burninate', `locate ${q}`]).last.split('\n')) {
        if (!/^\s/.test(l)) header = l.split(':')[0]!;
        if (!l.includes('> ')) continue;
        const prompt = l.slice(l.indexOf('> ')).replace(/\s+\([^)]*\)/g, '').replace(/ gives [^[]*?(?=\s+\[|$)/, '').replace(/\s+/g, ' ');
        rules.push(`${header} ${prompt}`);
      }
      expect(new Set(rules).size, `${q}:\n${rules.join('\n')}`).toBe(rules.length);
    }
  });
});
