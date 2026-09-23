// Task B4: the unasked aside after four dead turns is not straight messaging. Oblique at 4, plainer at 8, the flask
// hint itself from 12 on. The asked-for helpers (`hint`, `get ye flask`, `goal`, NPC talk 3) are untouched.
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { lintWarnings, lintWorld } from '../src/world/lint';
import { SIDE_REGIONS } from '../src/world/types';
import type { GameState } from '../src/engine/types';
import type { World } from '../src/world/types';

const at = (room: string, flags: Record<string, boolean | number> = {}, extra: Partial<GameState> = {}): GameState => ({ ...newGame(WORLD, 3), room, flags, ...extra });
const DEAD = ['get sword', 'get csv'];
/** n dead turns in one room (alternating, so the repeat chirp stays out of it); the last turn's output and its last line. */
const stuckFor = (n: number, start: GameState, world: World = WORLD) => {
  let s = start;
  let out: string[] = [];
  for (let i = 0; i < n; i++) { const r = step(s, DEAD[i % 2]!, world); s = r.state; out = r.output; }
  return { s, out, last: out[out.length - 1]! };
};
const wrapped = (hint: string): string => (/\(.*\)/.test(hint) ? `Psst. ${hint}` : `(Psst. ${hint})`);

const rooms = Object.values(WORLD.rooms).filter((r) => !SIDE_REGIONS.has(r.region));
const text = (s: GameState, l: string | ((s: GameState) => string) | undefined): string | undefined => (typeof l === 'function' ? l(s) : l);

/** Progress states the hints branch on (the same shape as the E2 sweep), so every branch of every nudge is read. */
const STATES: { flags: Record<string, boolean | number>; inventory: string[]; worn?: string[] }[] = [
  { flags: {}, inventory: ['license'] },
  { flags: {}, inventory: ['license', 'mug', 'scroll', 'credentials', 'policy', 'shortcut', 'boots', 'hoodie'] },
  { flags: { 'jeff.pacified': true, 'prophecy.read': true }, inventory: [] },
  { flags: { 'prophecy.read': true, 'jeff.pacified': true, 'has.credentials': true, 'trial.moat': true, 'bridge.down': true }, inventory: ['credentials'] },
  { flags: { 'ferry.online': true, 'trial.key': true, 'taken.standard key': true }, inventory: ['standard key'] },
  { flags: { 'ferry.online': true, 'trial.key': true, 'taken.shortcut': true }, inventory: ['standard key', 'shortcut'] },
  { flags: { 'ferry.online': true, 'trial.key': true, 'taken.shortcut': true }, inventory: ['standard key'] },
  { flags: { 'gate.waiting': 1 }, inventory: [] },
  { flags: { 'gate.waiting': 2 }, inventory: [] },
  { flags: { 'gate.open': true, 'gate.waiting': 3, 'scroll.lent': true, 'trial.moat': true }, inventory: ['scroll'] },
  { flags: { 'gate.open': true, 'scroll.lent': true, 'notebook.fixed': true, 'trial.moat': true }, inventory: [] },
  { flags: { 'gate.open': true, 'notebook.fixed': true, 'has.hoodie': true, 'trial.moat': true }, inventory: ['hoodie'] },
  { flags: { 'gate.open': true, 'notebook.fixed': true, 'has.hoodie': true, 'trial.hoodie': true, 'trial.moat': true }, inventory: [], worn: ['hoodie'] },
  { flags: { 'gate.open': true, 'notebook.fixed': true, 'has.hoodie': true, 'trial.hoodie': true, 'trial.moat': true, 'ts.xmla': false }, inventory: [], worn: ['hoodie'] },
  { flags: { 'gate.open': true, 'scroll.lent': true, 'ts.fabricItems': false }, inventory: ['scroll'] },
  { flags: { 'gate.open': true, 'scroll.lent': true, 'ts.workloads': false }, inventory: ['scroll'] },
  { flags: { 'bridge.down': true, 'trial.moat': true }, inventory: [] },
  { flags: { 'bridge.down': true, 'trial.moat': true, 'taken.policy': true }, inventory: ['policy'] },
  { flags: { 'bridge.down': true, 'trial.moat': true, 'taken.policy': true, 'stare.count': 1 }, inventory: ['policy'] },
  { flags: { 'bridge.down': true, 'trial.moat': true, 'taken.policy': true, 'stare.count': 3 }, inventory: ['policy'] },
  { flags: { 'bridge.down': true, 'trial.moat': true, 'taken.policy': true, 'stare.done': true, 'stare.count': 3 }, inventory: [] },
  { flags: { 'bridge.down': true, 'trial.moat': true, 'taken.policy': true, 'refresh.done': true, 'stare.done': true }, inventory: ['boots'] },
  { flags: { 'bridge.down': true, 'trial.moat': true, 'taken.policy': true, 'refresh.done': true, 'trial.hoodie': true }, inventory: ['hoodie', 'boots'], worn: ['boots', 'hoodie'] },
  { flags: { 'bridge.down': true, 'trial.moat': true, 'taken.policy': true, 'refresh.done': true, 'trial.hoodie': true, 'ts.xmla': false }, inventory: ['hoodie', 'boots'] },
  { flags: { 'bridge.down': true, 'trial.moat': true, 'ts.xmla': false }, inventory: [] },
  { flags: { 'pq.step': 4 }, inventory: [] },
  { flags: { 'pq.step': 7, 'pq.done': true, 'trial.moat': true }, inventory: [] },
  { flags: { 'trial.moat': true, 'trial.hoodie': true, 'ferry.online': true }, inventory: ['hoodie', 'standard key'] },
  { flags: { 'trial.moat': true, 'trial.hoodie': true, 'trial.key': true }, inventory: ['hoodie', 'standard key', 'boots'] },
  { flags: { 'trial.moat': true, 'trial.hoodie': true, 'trial.key': true }, inventory: ['hoodie', 'standard key', 'boots'], worn: ['boots'] },
  { flags: { 'trial.moat': true, 'trial.hoodie': true, 'trial.key': true, 'shrine.open': true }, inventory: ['hoodie', 'standard key'] },
  { flags: { 'trial.moat': true, 'trial.hoodie': true, 'trial.key': true, 'shrine.open': true, 'dragon.gone': true }, inventory: ['hoodie', 'standard key'] },
  { flags: { 'gov.errand': true }, inventory: [] },
  { flags: { 'gov.errand': true, 'ts.publishToWeb': false, 'gov.touched': true }, inventory: [] },
  { flags: { 'ts.feedback': true, 'gov.touched': true }, inventory: [] },
];

describe('the tier ladder at the Desktop Gate (Task B4)', () => {
  const gate = () => at('fortress.bridge');
  it('4: oblique, in the narrator\'s voice, pointing at the idea', () => {
    expect(stuckFor(4, gate()).last).toBe("(Psst. The guard's been asked for one thing all day and it wasn't your name.)");
  });
  it('8: plainer, still never the command', () => {
    expect(stuckFor(8, gate()).last).toBe("(Psst. He wants a SKU. There's a free one. It's a link, under the dialog, and it rhymes with denial.)");
  });
  it('12 and on: the flask hint verbatim', () => {
    const twelve = stuckFor(12, gate());
    expect(twelve.s.stuck).toBe(12);
    expect(twelve.last).toBe(wrapped(WORLD.rooms['fortress.bridge']!.flaskHint(twelve.s)));
    const sixteen = stuckFor(16, gate());
    expect(sixteen.last).toBe(wrapped(WORLD.rooms['fortress.bridge']!.flaskHint(sixteen.s)));
  });
  it('nothing is whispered off the ladder', () => {
    for (const n of [1, 2, 3, 5, 6, 7, 9, 10, 11, 13]) expect(stuckFor(n, gate()).out.join(' '), `${n}`).not.toMatch(/Psst/);
  });
});

describe('tier 1 is oblique: no backtick, none of the flask hint\'s command words', () => {
  const CASES: [string, GameState, RegExp][] = [
    ['fortress.bridge', at('fortress.bridge'), /`|\btrial\b|\bsku\b|\bsay\b/i],
    ['village.cottage', at('village.cottage'), /`|\bmug\b|\bget\b/i],
    ['monastery.spark', at('monastery.spark', { 'gate.open': true, 'scroll.lent': true }, { inventory: ['scroll'] }), /`|\bscroll\b|\bnotebook\b|\buse\b/i],
    ["fortress.throne", at('fortress.throne', { 'bridge.down': true }), /`|calculated|\bcolumn\b|\bsay\b/i],
    ['monastery.sacristy', at('monastery.sacristy', { 'gov.errand': true }), /`|turn off|publish to web|\bsettings\b|\breset\b/i],
    ['lake.island', at('lake.island', { 'ferry.online': true }), /`|\bget\b|\bstandard\b/i],
    ['fortress.yard', at('fortress.yard', { 'bridge.down': true, 'trial.moat': true, 'taken.policy': true, 'stare.done': true }, { inventory: ['policy'] }), /`|\bpolicy\b|\buse\b|\bgive\b/i],
  ];
  it.each(CASES)('%s', (room, start, forbidden) => {
    const { s, last } = stuckFor(4, start);
    expect(s.room).toBe(room);
    expect(s.stuck).toBe(4);
    expect(last).toMatch(/^\(Psst\. .*\)$/);
    expect(last).not.toMatch(forbidden);
    expect(last).not.toBe(wrapped(WORLD.rooms[room]!.flaskHint(s)));
  });
});

describe('tier 2 is the plainer line where there is one, the flask hint where there is not', () => {
  it('the Studio, policy in hand, names the thing and not the verb', () => {
    const { last } = stuckFor(8, at('fortress.yard', { 'bridge.down': true, 'trial.moat': true, 'taken.policy': true, 'stare.done': true }, { inventory: ['policy'] }));
    expect(last).toBe('(Psst. Change the pie to a bar chart. The refresh has been choking on it since 2019.)');
  });
  it('the Lake House has no plainer line: its flask hint whispers at 8', () => {
    const { s, last } = stuckFor(8, at('lake.house'));
    expect(WORLD.rooms['lake.house']!.nudge?.plainer).toBeUndefined();
    expect(last).toBe(wrapped(WORLD.rooms['lake.house']!.flaskHint(s)));
  });
  it('a plainer function that returns nothing falls back to the flask hint (the Spark chamber with no Notebook to be had)', () => {
    const start = at('monastery.spark', { 'gate.open': true, 'scroll.lent': true, 'ts.fabricItems': false }, { inventory: ['scroll'] });
    const { s, last } = stuckFor(8, start);
    expect(last).toBe(wrapped(WORLD.rooms['monastery.spark']!.flaskHint(s)));
    expect(last).toMatch(/Users can create Fabric items/);
  });
});

describe('every main-realm room has an oblique nudge', () => {
  it('lint-style: oblique on every room outside the side realms; none on the side realms', () => {
    for (const r of rooms) expect(r.nudge?.oblique, r.id).toBeTruthy();
    // Jeff's Excel whispers obliquely too (Task F9, tests/voice-sweep-excel.test.ts); the other side realms hint in their own voice.
    for (const r of Object.values(WORLD.rooms).filter((r) => SIDE_REGIONS.has(r.region) && r.region !== 'excel' && r.id !== 'copilot.gallery')) expect(r.nudge, r.id).toBeUndefined();
    expect(lintWarnings(WORLD)).toEqual([]);
  });
  it('over every progress state: a non-empty line, no backtick, no bracket (so the aside always wraps), never the flask hint itself', () => {
    const bad: string[] = [];
    for (const st of STATES) for (const r of rooms) {
      const s = at(r.id, st.flags, { inventory: st.inventory, worn: st.worn ?? [] });
      const flask = r.flaskHint(s);
      for (const [tier, line] of [['oblique', text(s, r.nudge?.oblique)], ['plainer', text(s, r.nudge?.plainer)]] as const) {
        if (tier === 'plainer' && line === '') continue; // an explicit "nothing plainer to say": the flask hint takes the tier
        if (!line) { if (tier === 'oblique') bad.push(`${r.id} ${tier}: empty`); continue; }
        if (/[`()]/.test(line)) bad.push(`${r.id} ${tier}: ${JSON.stringify(line)}`);
        if (line === flask) bad.push(`${r.id} ${tier}: is the flask hint`);
        if (!/[.!?]$/.test(line)) bad.push(`${r.id} ${tier}: no full stop: ${JSON.stringify(line)}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('a room without a nudge', () => {
  const cottage = WORLD.rooms['village.cottage']!;
  const { nudge: _dropped, ...bare } = cottage;
  const world: World = { ...WORLD, rooms: { ...WORLD.rooms, 'village.cottage': bare } };
  it('whispers its flask hint at every tier', () => {
    for (const n of [4, 8, 12]) {
      const { s, last } = stuckFor(n, newGame(world, 3), world);
      expect(last, `${n}`).toBe(wrapped(bare.flaskHint(s)));
    }
  });
  it('is a lint warning, not a lint failure', () => {
    expect(lintWarnings(world)).toEqual(['village.cottage: no nudge (the flask hint whispers at every tier)']);
    expect(lintWorld(world)).toEqual([]);
  });
});

describe('the asked-for helpers are untouched', () => {
  it('hint and get ye flask still give the flask hint, and reset the count', () => {
    const start = at('fortress.bridge');
    const three = stuckFor(3, start);
    for (const ask of ['hint', 'get ye flask']) {
      const r = step(three.s, ask, WORLD);
      expect(r.output[0], ask).toContain(`A hollow voice adds: "${WORLD.rooms['fortress.bridge']!.flaskHint(three.s)}"`);
      expect(r.output.join(' '), ask).not.toMatch(/Psst/);
      expect(r.state.stuck, ask).toBe(0);
    }
  });
});
