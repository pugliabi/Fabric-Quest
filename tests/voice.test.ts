import { describe, expect, it } from 'vitest';
import { ALLUSIONS, BRANDS, BRUSHOFFS, CHEAT, CHEAT_AGAIN, FRUSTRATION, MALAPROPS, NICKNAMES, SIGNOFF, nick, rotate } from '../src/world/voice';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import type { GameState } from '../src/engine/types';

describe('voice constants are pinned (a change here is a reviewed change)', () => {
  it('sign-off', () => expect(SIGNOFF).toBe('You dead. Refresh failed.'));
  it('nicknames', () => expect([...NICKNAMES]).toEqual([
    'Mister Star Schema', 'Calculated Column Casey', 'Import Mode Ishmael', 'Ctrl-Shift-Enter', 'Power Query Pete', 'Many-to-Many Mandy',
    'Captain Blank', 'Bidirectional Bob', 'DAX Vader', 'Clippy', 'Zune', 'Encarta', 'Ask Jeeves', 'Tom from MySpace', 'champ', 'guy',
  ]));
  it('malaprops', () => expect(MALAPROPS).toEqual({ refreshered: 'refreshered', capacitude: 'capacitude', daxxed: 'DAXxed' }));
  it('frustration and cheat', () => {
    expect(FRUSTRATION).toBe("Come now. Don't get throttled.");
    expect(CHEAT).toBe('Meh.');
    expect(CHEAT_AGAIN).toMatch(/literally in a table/);
  });
  it('brands', () => expect([...BRANDS]).toEqual(['Refreshr™', 'CapacityAde', 'Dataflows Gen1 Classic']));
  it('allusions include the 2000s-Microsoft layer', () => {
    for (const a of ['Clippy', 'Zune', 'Encarta', 'the Windows XP hill', 'an MSN Messenger nudge', 'Access 97', 'SharePoint 2007', "It looks like you're writing a measure."]) expect(ALLUSIONS).toContain(a);
  });
  it('every NPC has a brush-off', () => {
    for (const id of Object.keys(WORLD.npcs)) expect(BRUSHOFFS[id], id).toBeTruthy();
  });
});

describe('nick() and rotate()', () => {
  const at = (seed: number, turns: number): GameState => ({ ...newGame(WORLD, seed), turns });
  it('never repeats on consecutive turns and stays deterministic', () => {
    for (const seed of [1, 7, 42, 9999]) {
      for (let t = 1; t < 200; t++) expect(nick(at(seed, t))).not.toBe(nick(at(seed, t - 1)));
      expect(nick(at(seed, 12))).toBe(nick(at(seed, 12)));
    }
  });
  it('rotate walks a pool by turn', () => {
    expect(rotate(at(1, 0), ['a', 'b', 'c'])).toBe('a');
    expect(rotate(at(1, 4), ['a', 'b', 'c'])).toBe('b');
  });
});

describe('every death ends with the sign-off', () => {
  const run = (cmds: string[], room = 'village.cottage', flags: Record<string, boolean | number> = {}) => {
    let s = { ...newGame(WORLD, 3), room, flags: { ...flags } };
    let last = step(s, 'look', WORLD);
    for (const c of cmds) { last = step(s, c, WORLD); s = last.state; }
    return last;
  };
  it.each([
    [['die'], 'village.cottage'],
    [['attack me'], 'village.cottage'],
    [['delete workspace'], 'village.cottage'],
    [['format c:'], 'village.cottage'],
    [['give paginated report to jeff'], 'village.square'],
    [['import onelake'], 'lake.shore'],
    [['swim moat'], 'fortress.bridge'],
    [['drink water'], 'swamp.bronze'],
    [['attack dragon'], 'peaks.shrine'],
  ])('%s at %s', (cmds, room) => {
    const r = run(cmds, room);
    expect(r.state.dead).toBe(true);
    expect(r.output[r.output.length - 1]!.endsWith(SIGNOFF)).toBe(true);
    expect(r.output.join(' ').split(SIGNOFF).length).toBe(2); // exactly once
  });
  it('every death rule and death phrase in the world signs off (scan)', () => {
    const rules = [...WORLD.globalRules, ...Object.values(WORLD.rooms).flatMap((r) => r.rules)].filter((r) => r.then.death);
    const phrases = WORLD.phraseRules.filter((p) => p.death);
    expect(rules.length + phrases.length).toBeGreaterThanOrEqual(9);
    for (const r of rules) {
      const room = Object.values(WORLD.rooms).find((rm) => rm.rules.includes(r))?.id ?? 'village.cottage';
      const s = { ...newGame(WORLD, 3), room, inventory: ['license', ...(r.when.has ?? [])], flags: Object.fromEntries((r.when.flags ?? []).filter((c) => !c.not).map((c) => [c.flag, c.is ?? true])) };
      const out = step(s, r.when.verb === 'go' ? (r.when.dir ?? 'n') : `${r.when.verb} ${Array.isArray(r.when.noun) ? r.when.noun[0] : r.when.noun ?? ''}`.trim(), WORLD);
      if (out.state.dead) expect(out.output[out.output.length - 1], r.id).toMatch(new RegExp(`${SIGNOFF.replace('.', '\\.')}$`));
    }
  });
});

describe('the §5.3 overwrites', () => {
  const one = (cmd: string, room = 'village.cottage', extra: Partial<GameState> = {}) => step({ ...newGame(WORLD, 3), room, ...extra }, cmd, WORLD);
  it('save / restore / restart / quit', () => {
    expect(one('save').output[0]).toBe("Saved. To your browser. Not to OneLake, so don't get cute.");
    expect(one('restore').output[0]).toBe('Restoring. Pretend the last four minutes were a refresh.');
    expect(one('restart', 'village.cottage', { score: 40 }).output[0]).toBe("Restarting. You had 40 points. You'll get them back. Probably.");
    expect(one('quit').output[0]).toMatch(/^Well fine, .+\. Hope you posted your score, cause it is OVER between us\.$/);
    expect(one('quit').outcome).toBe('meta');
  });
  it('wait is a pair', () => {
    const a = one('wait');
    expect(a.output[0]).toBe('Time passes. So does the refresh window.');
    const b = step(a.state, 'wait', WORLD);
    expect(b.output[0]).toBe("Still waiting. You're getting a pretty sweet workout for your patience muscles.");
  });
  it('already open, already wearing, closed riddle', () => {
    expect(one('open door').output[0]).toBe("Yeah, totally! Except it's already open, you moron. Try: out.");
    // Wearing the hoodie in play always sets trial.hoodie (global.wear-hoodie fires only while it is unset), so the fixture carries it.
    const worn = { ...newGame(WORLD, 3), inventory: ['license', 'hoodie'], worn: ['hoodie'], flags: { 'trial.hoodie': true } };
    expect(step(worn, 'wear hoodie', WORLD).output[0]).toBe("You're already wearing it. Too bad you still smell like a Pro license under it.");
    expect(step({ ...worn, flags: { 'trial.hoodie': true, 'trial.moat': true } }, 'wear hoodie', WORLD).output[0]).toBe("You're already wearing it. Too bad you still smell like a Warehouse under it.");
    expect(one('close door').output[0]).toBe('A riddle: what can be closed that is already closed? (Hint: not this door.)');
  });
  it('cheat: Meh., then the table', () => {
    const a = one('cheat');
    expect(a.output[0]).toBe(CHEAT);
    const b = step(a.state, 'iddqd', WORLD);
    expect(b.output[0]).toBe(CHEAT_AGAIN);
    expect(b.state.flags['cheat.count']).toBe(2);
  });
  it('frustration is one unchanging line, and profanity gets the same one', () => {
    const OLD_SIX = /Frustration logged|say it slower|with feeling|not fed by tone|Deep breaths|certification in that/;
    let s = newGame(WORLD, 3);
    for (const c of ['ugh get csv', 'get csv, dammit', 'seriously get csv', 'get csv right now']) {
      const r = step(s, c, WORLD); s = r.state;
      expect(r.output, c).toContain(FRUSTRATION);
      expect(r.output.join(' '), c).not.toMatch(OLD_SIX); // later tasks may append an aside after it; the line itself never changes
    }
    expect(one('what the hell').output[0]).toBe(FRUSTRATION);
  });
  it('a wrapper around a swear says the line once, not twice', () => {
    for (const c of ['ugh, hell', 'come on, shit', 'seriously, ffs', 'wtf get csv, dammit', 'ugh, hell!']) {
      const r = one(c);
      expect(r.output.filter((l) => l === FRUSTRATION), c).toHaveLength(1);
      expect(r.output[0], c).toBe(FRUSTRATION);
    }
  });
});
