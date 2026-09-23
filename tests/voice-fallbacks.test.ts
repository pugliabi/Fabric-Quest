import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { WHERE } from '../src/world/where';
import { SNARK } from '../src/world/globals';
import { FRUSTRATION, NICKNAMES } from '../src/world/voice';
import { named } from '../src/engine/builtins';
import type { GameState } from '../src/engine/types';

const run = (cmds: string[], start: Partial<GameState> = {}) => {
  let s: GameState = { ...newGame(WORLD, 11), ...start };
  const outs: string[][] = [];
  for (const c of cmds) { const r = step(s, c, WORLD); s = r.state; outs.push(r.output); }
  return { s, outs };
};
const SEEDS = Array.from({ length: 24 }, (_, i) => i + 1);
/**
 * Every first line the command gets across the seeds. `warm` waits first: vary() multiplies by turn + 1, so a pool of n
 * lines is only fully reachable on a turn where turn + 1 is coprime with n (turn 1 covers a 3-pool; turn 2 an 8-pool).
 */
const seen = (cmds: string[], seeds: number[], room = 'village.cottage', warm = 0) => { const set = new Set<string>(); for (const seed of seeds) { let s = { ...newGame(WORLD, seed), room }; for (const c of [...Array<string>(warm).fill('wait'), ...cmds]) { const r = step(s, c, WORLD); s = r.state; if (c !== 'wait') set.add(r.output[0]!); } } return set; };

describe('generic fallbacks gained lines (spec1 §5.2)', () => {
  it('unparsed input', () => {
    expect(SNARK).toContain('I don\'t understand. Type HELP, or open a ticket like a real professional.');
    expect(SNARK).toContain('Naw.');
    expect(SNARK.length).toBeGreaterThanOrEqual(21);
  });
  it('unknown noun, no exit, talk to nothing, give to nobody, use on nothing — the new lines are reachable', () => {
    const nouns = seen(['get sword'], SEEDS);
    expect([...nouns].some((l) => /never been a sword|didn't animate one|misread the ledger, guy/.test(l))).toBe(true);
    const walls = seen(['n'], SEEDS);
    expect([...walls].some((l) => /North is a wall\. It's been a wall since the migration\.|Naw\. Wall\./.test(l))).toBe(true);
    const nobody = seen(['talk to ferryman'], SEEDS);
    expect([...nobody].some((l) => /It's sad when you have to make up people to talk to\.|I'm not talking to you either/.test(l))).toBe(true);
    const give = seen(['give license'], SEEDS);
    expect([...give].some((l) => /To whom\? The candle\? The candle has no budget\./.test(l))).toBe(true);
    const use = seen(['use pebble'], SEEDS, 'lake.shore'); // the shore's pebble has no bare-use rule, so the generic pool answers
    expect([...use].some((l) => /On what\? Discuss\.|Like where\?/.test(l))).toBe(true);
  });
  it('score and help gained an aside', () => {
    const { outs } = run(['score', 'help']);
    expect(outs[0]).toHaveLength(2); expect(outs[0]![0]).toMatch(/^Score : /);
    expect(outs[1]![0]).toMatch(new RegExp(`^Okay, (${NICKNAMES.join('|').replace(/-/g, '\\-')})\\.$`));
  });
});

describe('where and why', () => {
  it('every room has a where line and where says it', () => {
    for (const id of Object.keys(WORLD.rooms)) expect(WHERE[id], id).toBeTruthy();
    expect(run(['where']).outs[0]![0]).toBe(WHERE['village.cottage']);
    expect(run(['where am i'], { room: 'peaks.shrine' }).outs[0]![0]).toBe(WHERE['peaks.shrine']);
    expect(run(['where'], { room: 'copilot.pane', flags: { 'sq.return': 1 } }).outs[0]![0]).toBe(WHERE['copilot.pane']);
  });
  it('why alone, and why with more', () => {
    expect(run(['why']).outs[0]![0]).toBe('I wish I knew.');
    expect(run(['why me']).outs[0]![0]).toMatch(/Finance asked for it in 2019/);
  });
});

describe('echo-your-words, repeats, boredom', () => {
  it('a three-adjective noun gets quoted back', () => {
    const { outs } = run(['look at the big ugly brown door']);
    expect(outs[0]![0]).toBe('Listen to you. "look at the big ugly brown door." What kinda gaming is that? It\'s a door.');
    expect(outs[0]![1]).toMatch(/The door\./);
  });
  it('second and third looks at the same scenery', () => {
    const { outs } = run(['look at candle', 'look at candle', 'look at candle']);
    // The candle's second look is its own remembered line, and that IS the repeat joke. The third says it again, alone:
    // nothing is stacked on a line that already answered.
    expect(outs[1]!.length).toBe(1); expect(outs[1]![0]).not.toBe(outs[0]![0]);
    expect(outs[2]).toEqual(outs[1]);
  });
  it('boredom: 10 turns in one room with no progress', () => {
    const { s, outs } = run(Array(10).fill('inventory'));
    expect(s.idle).toBe(10);
    expect(outs[9]![outs[9]!.length - 1]).toBe("Let's get moving, here, people.");
    const more = run(Array(15).fill('inventory'));
    expect(more.outs[14]![more.outs[14]!.length - 1]).toBe('Are you THAT bored? Do some questing already!');
    expect(run(Array(20).fill('inventory')).outs[19]!.at(-1)).toBe('You are an incredibly boring person.');
    expect(run(['inventory', 'inventory', 'get mug', ...Array(8).fill('inventory')]).s.idle).toBe(8);
  });
});

// ---- Fix round 1 ----

const BORED_LINES = /Let's get moving, here, people\.|Are you THAT bored\? Do some questing already!|You are an incredibly boring person\./;
const count = (out: string[], re: RegExp) => out.filter((l) => re.test(l)).length;

describe('I-1: "On what?" only answers a bare use', () => {
  it('use X alone can ask; use X on Y and open X never do', () => {
    const asks = /On what\? Discuss\.|Like where\?/;
    expect([...seen(['use pebble'], SEEDS, 'lake.shore', 3)].some((l) => asks.test(l))).toBe(true);
    for (const c of ['use mug on candle', 'open desk', 'open candle', 'use pebble on shore']) for (const warm of [0, 3]) expect([...seen([c], SEEDS, c.includes('pebble') ? 'lake.shore' : 'village.cottage', warm)].some((l) => asks.test(l)), c).toBe(false);
  });
});

describe('I-3: the echo has grammar', () => {
  it('names take the right article, plurals take They\'re, the quote loses its question mark', () => {
    expect(run(['look at the creepy old portraits'], { room: 'fortress.hall' }).outs[0]![0]).toMatch(/What kinda gaming is that\? They're portraits\.$/);
    expect(run(['look at the old applied steps'], { room: 'fortress.hall' }).outs[0]![0]).toMatch(/It's the Applied Steps\.$/);
    expect(run(['look at the dead refresh crops'], { room: 'village.fields' }).outs[0]![0]).toMatch(/They're refreshes\.$/);
    expect(run(['look at the stupid update dialog'], { room: 'fortress.bridge' }).outs[0]![0]).toMatch(/It's an update dialog\.$/);
    expect(run(['look at the big ugly brown door?']).outs[0]![0]).toBe('Listen to you. "look at the big ugly brown door." What kinda gaming is that? It\'s a door.');
    expect(named(WORLD.items['refresh']!)).toBe('the Big Refresh');
    expect(named(WORLD.items['custom1']!)).toBe('Custom1');
    expect(named(WORLD.items['canvas']!)).toBe('a canvas');
  });
  it('an exact name or alias, with or without the article, is not echoed', () => {
    for (const c of ['look at mug', 'look at the mug', 'look at coffee mug', 'look at the okayest mug']) expect(run([c]).outs[0]![0], c).not.toMatch(/^Listen to you/);
  });
});

describe('M-1: one scold per turn', () => {
  it('a repeat and the boredom line never stack a scold', () => {
    const { outs } = run([...Array(12).fill('inventory'), 'get sword', 'get sword', 'get sword'], {}, );
    expect(count(outs[14]!, /Are you THAT bored\?/)).toBeLessThanOrEqual(1);
    const looks = run([...Array(22).fill('inventory'), 'look at candle', 'look at candle', 'look at candle']);
    expect(count(looks.outs[24]!, BORED_LINES)).toBeLessThanOrEqual(1);
    for (const seed of SEEDS) {
      let s: GameState = newGame(WORLD, seed);
      for (const c of [...Array(12).fill('inventory'), 'get sword', 'get sword', 'get sword']) { const r = step(s, c, WORLD); s = r.state; expect(count(r.output, BORED_LINES), `seed ${seed}`).toBeLessThanOrEqual(1); }
    }
  });
});

describe('M-3 / M-4 / M-5 / M-6: state, room, grammar, rotation', () => {
  it('the dock knows when the Ferryman is online', () => {
    expect(run(['where'], { room: 'lake.dock' }).outs[0]![0]).toMatch(/OFFLINE/);
    expect(run(['where'], { room: 'lake.dock', flags: { 'ferry.online': true } }).outs[0]![0]).toMatch(/ONLINE/);
    expect(run(['where'], { room: 'lake.island', flags: { 'taken.standard key': true } }).outs[0]![0]).toMatch(/One key left/);
    expect(run(['where'], { room: 'fortress.yard', flags: { 'stare.done': true } }).outs[0]![0]).toMatch(/4\.2M/);
  });
  it('the budget line names something that is actually here', () => {
    expect([...seen(['give license'], SEEDS, 'village.square')].some((l) => /The notice board\? The notice board has no budget\./.test(l))).toBe(true);
    expect([...seen(['give license'], SEEDS, 'lake.shore')].some((l) => /The wall\? The wall has no budget\./.test(l))).toBe(true);
    expect([...seen(['give license'], SEEDS, 'fortress.hall')].some((l) => /The query\? The query has no budget\./.test(l))).toBe(true);
    for (const l of seen(['give license'], SEEDS, 'village.square')) expect(l).not.toMatch(/candle/);
  });
  it('an apple, not a apple; keys, not a keys', () => {
    const apples = new Set([...seen(['get apple'], SEEDS), ...seen(['get apple'], SEEDS, 'village.cottage', 1)]);
    for (const l of apples) expect(l).not.toMatch(/\ba apple\b|\bA apple\b/);
    expect([...apples].some((l) => /^An apple\? In this room\?/.test(l))).toBe(true);
    expect([...apples].some((l) => /never been an apple/.test(l))).toBe(true);
    const keys = new Set([...seen(['get keys'], SEEDS), ...seen(['get keys'], SEEDS, 'village.cottage', 1)]);
    for (const l of keys) expect(l).not.toMatch(/\ba keys\b|animate one/);
    expect([...keys].some((l) => /never been keys/.test(l))).toBe(true);
    expect([...keys].some((l) => /didn't animate any/.test(l))).toBe(true);
  });
  it('two scores in a row get two asides', () => {
    for (const seed of SEEDS) { const { outs } = run(['score', 'score'], {}); expect(outs[0]![1], `seed ${seed}`).not.toBe(outs[1]![1]); }
  });
});

describe('M-7: the gaps', () => {
  it('a bare interjection gets the one frustration line', () => {
    for (const c of ['ugh', 'argh', 'dammit', 'seriously', 'jeez', 'omg', 'ffs', 'ugh!']) expect(run([c]).outs[0]![0], c).toBe(FRUSTRATION);
  });
  it('boredom yields to the stuck helper on the same turn, and lands where the helper does not', () => {
    const { outs } = run(Array(20).fill('get sword'));
    expect(outs[19]!.at(-1)).toMatch(/^A hollow voice adds: /);
    expect(outs[19]!.join(' ')).not.toMatch(/incredibly boring/);
    expect(outs[9]!.at(-1)).toBe("Let's get moving, here, people.");
    expect(outs[14]!.at(-1)).toBe('Are you THAT bored? Do some questing already!');
  });
  it('a side realm is quiet', () => {
    const { s, outs } = run(['show me a table', ...Array(15).fill('inventory')]);
    expect(s.room).toBe('excel.sheet1');
    expect(outs.flat().join(' ')).not.toMatch(BORED_LINES);
  });
});
