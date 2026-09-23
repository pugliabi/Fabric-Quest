import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { talkTo } from '../src/engine/builtins';
import { WORLD } from '../src/world';
import { BRUSHOFFS, NICKNAMES, brushOffLine } from '../src/world/voice';
import type { GameState } from '../src/engine/types';

const talk = (room: string, npc: string, n: number, extra: Partial<GameState> = {}) => {
  let s: GameState = { ...newGame(WORLD, 4), room, ...extra };
  const outs: string[] = [];
  for (let i = 0; i < n; i++) { const r = step(s, `talk to ${npc}`, WORLD); s = r.state; outs.push(r.output[0]!); }
  return { s, outs };
};
const anyNick = new RegExp(NICKNAMES.map((n) => n.replace(/[-]/g, '\\-')).join('|'));
const at = (room: string, flags: Record<string, boolean | number> = {}): GameState => ({ ...newGame(WORLD, 4), room, flags });
/** The brush-off for this NPC in this state (two of them depend on the state). */
const bo = (id: string, s: GameState): string => brushOffLine(s, BRUSHOFFS[id])!;

describe('talk counters and escalation (spec1 §3.1)', () => {
  it('counts every talk aimed at an NPC, whoever answered', () => {
    expect(talk('village.square', 'jeff', 3).s.flags['talk.jeff']).toBe(3);
    expect(talk('fortress.model', 'sir cardinality', 2).s.flags['talk.cardinality']).toBe(2);
    expect(talk('village.mill', 'miller', 1).s.flags['talk.miller']).toBe(1); // the credentials rule answered
    expect(talk('fortress.yard', 'card', 2).s.flags['talk.card']).toBe(2); // "card" is also the license in your pocket; talk means the person
  });
  it.each([
    ['village.square', 'jeff'], ['village.mill', 'miller'], ['lake.dock', 'ferryman'], ['monastery.gate', 'monk'], ['monastery.cloister', 'abbot'],
    ['monastery.spark', 'brother pandas'], ['monastery.library', 'librarian'], ['fortress.bridge', 'guard'], ['fortress.throne', 'duke'],
    ['fortress.model', 'sir cardinality'], ['fortress.yard', 'card'], ['peaks.shrine', 'throttlor'], ['village.fields', 'manual'],
  ])('%s / %s: talks 1–4 are four different lines, 3 carries a hint, 4 carries a nickname', (room, npc) => {
    const { outs } = talk(room, npc, 5);
    expect(new Set(outs.slice(0, 4)).size).toBe(4);
    expect(outs[3]).toMatch(anyNick);
    expect(outs[4]).toMatch(anyNick);
    expect(outs[4]).not.toBe(outs[3]); // the nickname rotation moves
  });
  it('the guard: SKU checklist, then the spelled-out hint, then Matthew-Broderick energy with our own names', () => {
    const { outs } = talk('fortress.bridge', 'guard', 4);
    expect(outs[0]).toBe('"HALT! State your SKU!"');
    expect(outs[2]).toMatch(/S-K-U\. Trial's free/);
    expect(outs[3]).toMatch(/Still no SKU|Almost there|The link/);
    const done = talk('fortress.bridge', 'guard', 4, { flags: { 'bridge.down': true } });
    expect(done.outs[3]).toMatch(/Lookin' good, Mr\. Trial\./);
  });
  it('the engine default: same thing slower, then the flask hint', () => {
    const w = { ...WORLD, npcs: { ...WORLD.npcs, bob: { id: 'bob', name: 'Bob', aliases: [], describe: () => 'Bob.', talk: () => 'Hi.' } }, rooms: { ...WORLD.rooms, 'village.cottage': { ...WORLD.rooms['village.cottage']!, npcs: ['bob'] } } };
    let s = newGame(w, 1);
    const outs: string[] = [];
    for (let i = 0; i < 3; i++) { const r = step(s, 'talk to bob', w); s = r.state; outs.push(r.output[0]!); }
    expect(outs).toEqual(['Hi.', 'Bob says the same thing, slower. Hi.', `Bob, slower still: '${w.rooms['village.cottage']!.flaskHint(s)}'`]);
  });
  it('ask <npc> about <unknown> is the brush-off, in the gimmick', () => {
    expect(step(at('village.square'), 'ask jeff about the weather', WORLD).output[0]).toBe(BRUSHOFFS.jeff);
    expect(step(at('monastery.library'), 'ask librarian about dragons', WORLD).output[0]).toBe(BRUSHOFFS.librarian);
    expect(step(at('lake.dock'), 'ask ferryman about the weather', WORLD).output[0]).toBe(bo('ferryman', at('lake.dock')));
  });
  it('every NPC has brushOff and (except the ones with room-rule variants) talkMore', () => {
    for (const npc of Object.values(WORLD.npcs)) {
      expect(npc.brushOff, npc.id).toBe(BRUSHOFFS[npc.id]);
      if (!['jeff-excel'].includes(npc.id)) expect(typeof npc.talkMore, npc.id).toBe('function');
    }
  });
  it('the Card and Throttlor escalate through their room rules', () => {
    expect(talk('fortress.yard', 'card', 2, { flags: { 'stare.done': true } }).outs[1]).toMatch(/slightly louder/);
    expect(talk('peaks.shrine', 'throttlor', 2).outs[1]).toMatch(/repeats, slower, with more smoke/);
  });
  it('the Card and Throttlor brush off an unknown topic through their room rules too', () => {
    const studio = at('fortress.yard', { 'stare.done': true });
    expect(step(studio, 'ask card about the weather', WORLD).output[0]).toBe(bo('card', studio));
    expect(step(at('peaks.shrine'), 'ask dragon about capacity', WORLD).output[0]).toBe(BRUSHOFFS.throttlor);
  });
  it('talking to the dragon after he has gone is the global line, not "he is right there"', () => {
    const r = step(at('peaks.shrine', { 'dragon.gone': true }), 'talk to dragon', WORLD);
    expect(r.output[0]).toMatch(/^You address the dragon\./);
    expect(r.state.flags['talk.throttlor']).toBeUndefined(); // he is hidden, so nothing counts
  });
});

describe('fix round 1: known topics get the hint, unknown ones the brush-off (spec1 §3.1 "<unknown>")', () => {
  it('the guard: sku / trial / drawbridge → the spelled-out hint; the weather → the brush-off', () => {
    for (const t of ['sku', 'the trial', 'drawbridge', 'a pro license']) expect(step(at('fortress.bridge'), `ask guard about ${t}`, WORLD).output[0], t).toMatch(/S-K-U\. Trial's free/);
    expect(step(at('fortress.bridge', { 'bridge.down': true }), 'ask guard about the keep', WORLD).output[0]).toMatch(/Sixty\. Days\. Go in\./);
    expect(step(at('fortress.bridge'), 'ask guard about the weather', WORLD).output[0]).toBe(BRUSHOFFS.guard);
  });
  it('the librarian: scroll / license / card → the hint; dragons → "Shh."', () => {
    for (const t of ['the scroll', 'my license', 'library card']) expect(step(at('monastery.library'), `ask librarian about ${t}`, WORLD).output[0], t).toMatch(/give license to librarian/);
    expect(step(at('monastery.library', { 'scroll.lent': true }), 'ask librarian about the scroll', WORLD).output[0]).toMatch(/East, then east/);
    expect(step(at('monastery.library'), 'ask librarian about dragons', WORLD).output[0]).toBe(BRUSHOFFS.librarian);
  });
  it('Throttlor: model / star schema → the two-word hint, never the "ask me about the model" loop; capacity → he bills for it', () => {
    for (const c of ['ask dragon about the model', 'ask throttlor about star schema', 'talk to dragon about the one true model']) {
      const out = step(at('peaks.shrine'), c, WORLD).output[0]!;
      expect(out, c).toMatch(/Two words, peasant\. One fact table/);
      expect(out, c).not.toBe(BRUSHOFFS.throttlor);
    }
    expect(step(at('peaks.shrine'), 'ask dragon about capacity', WORLD).output[0]).toBe(BRUSHOFFS.throttlor);
  });
  it('a known-topic ask still counts as a talk', () => {
    expect(step(at('fortress.bridge'), 'ask guard about sku', WORLD).state.flags['talk.guard']).toBe(1);
  });
  it('the Ferryman and the Card brush off from their state', () => {
    const dock = at('lake.dock', { 'ferry.online': true });
    expect(step(dock, 'ask ferryman about the weather', WORLD).output[0]).toMatch(/^"ONLINE," he says/);
    expect(step(at('lake.dock'), 'ask ferryman about the weather', WORLD).output[0]).toMatch(/CREDENTIALS\. EXPIRED/);
    expect(step(at('fortress.yard', { 'stare.done': true }), 'ask card about the weather', WORLD).output[0]).toMatch(/^The Card shows 4\.2M\./);
    expect(step(at('fortress.yard', { 'stare.count': 3 }), 'ask card about the weather', WORLD).output[0]).toMatch(/^The Card shows \(Blank\)\./);
  });
  it("Jeff-in-Excel: an unknown topic on Sheet1 reaches his brush-off; a known one is Excel's stage line", () => {
    let s = at('village.square');
    s = step(s, 'help jeff', WORLD).state;
    expect(s.room).toBe('excel.sheet1');
    expect(step(s, 'ask jeff about the weather', WORLD).output[0]).toBe(BRUSHOFFS['jeff-excel']);
    expect(step(s, 'ask jeff about the pivot', WORLD).output[0]).not.toBe(BRUSHOFFS['jeff-excel']);
    expect(step(s, 'ask jeff about the pivot', WORLD).stepId).toBe('excel.ask-jeff');
    expect(step(s, 'talk to jeff', WORLD).stepId).toBe('excel.ask-jeff');
  });
});

describe('fix round 1: every NPC, every gate state, talks 1–9 (the C1 sweep)', () => {
  const GATE_FLAGS = ['sq.excel.done', 'jeff.pacified', 'has.credentials', 'ferry.online', 'gate.open', 'notebook.fixed', 'has.hoodie', 'scroll.lent', 'bridge.down', 'trial.moat', 'stare.done', 'dragon.gone'];
  const INVENTORIES = [['license'], ['license', 'credentials', 'scroll']];
  const homeOf = (id: string) => Object.values(WORLD.rooms).find((r) => r.npcs.includes(id))!.id;

  it('the Miller with the ferry online: talks 2–4 are three different lines (the branch that returned undefined)', () => {
    const { outs } = talk('village.mill', 'miller', 3, { flags: { 'has.credentials': true, 'ferry.online': true, 'talk.miller': 1 } });
    for (const o of outs) expect(typeof o === 'string' && o.length > 0).toBe(true);
    expect(new Set(outs).size).toBe(3);
    expect(outs[0]).toMatch(/Heard the lamp came on/);
  });
  it('yields a non-empty string every time; talk n never repeats talk n-1 where the NPC escalates; the brush-off holds too', () => {
    const problems: string[] = [];
    for (const npc of Object.values(WORLD.npcs)) {
      const room = homeOf(npc.id);
      for (let mask = 0; mask < 1 << GATE_FLAGS.length; mask++) {
        const flags = Object.fromEntries(GATE_FLAGS.filter((_, i) => mask & (1 << i)).map((f) => [f, true]));
        for (const inventory of INVENTORIES) {
          let prev = '';
          for (let n = 1; n <= 9; n++) {
            const s: GameState = { ...newGame(WORLD, 4), room, inventory, turns: 10, flags: { ...flags, [`talk.${npc.id}`]: n - 1 } };
            const line = talkTo(s, WORLD, npc);
            if (typeof line !== 'string' || !line.length) problems.push(`${npc.id} n=${n} ${JSON.stringify(flags)} → ${String(line)}`);
            else if (npc.talkMore && n > 1 && line === prev) problems.push(`${npc.id} n=${n} repeats n=${n - 1}: ${line}`);
            prev = line;
            if (n === 1) {
              const off = talkTo(s, WORLD, npc, 'pickles');
              if (typeof off !== 'string' || !off.length) problems.push(`${npc.id} brush-off ${JSON.stringify(flags)} → ${String(off)}`);
            }
          }
        }
      }
    }
    expect(problems).toEqual([]);
  });
});
