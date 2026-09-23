// Task B4, made plain: the helper after four dead turns speaks like the `hint` command ("A hollow voice adds: …"). The
// room's plain line at 4, the flask hint itself at 8 and every 4 after; no cryptic tier. The asked-for helpers (`hint`,
// `get ye flask`, `goal`, NPC talk 3) are untouched.
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { lintWarnings, lintWorld } from '../src/world/lint';
import { SIDE_REGIONS } from '../src/world/types';
import type { GameState } from '../src/engine/types';
import type { World } from '../src/world/types';

const at = (room: string, flags: Record<string, boolean | number> = {}, extra: Partial<GameState> = {}): GameState => ({ ...newGame(WORLD, 3), room, flags, ...extra });
const DEAD = ['get sword', 'get csv'];
/** n dead turns in one room (alternating, as a player trying things would); the last turn's output and its last line. */
const stuckFor = (n: number, start: GameState, world: World = WORLD) => {
  let s = start;
  let out: string[] = [];
  for (let i = 0; i < n; i++) { const r = step(s, DEAD[i % 2]!, world); s = r.state; out = r.output; }
  return { s, out, last: out[out.length - 1]! };
};
const helped = (hint: string): string => `A hollow voice adds: "${hint}"`;

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
  { flags: { 'bridge.down': true, 'taken.date': true }, inventory: ['date-table'] },
  { flags: { 'bridge.down': true, 'trial.moat': true, 'taken.date': true, 'model.date': true }, inventory: [] },
  { flags: { 'bridge.down': true, 'trial.moat': true, 'taken.date': true, 'stare.count': 3 }, inventory: [] },
  { flags: { 'bridge.down': true, 'trial.moat': true, 'taken.date': true, 'stare.done': true, 'stare.count': 3 }, inventory: [] },
  { flags: { 'bridge.down': true, 'trial.moat': true, 'taken.date': true, 'refresh.done': true }, inventory: ['boots'] },
  { flags: { 'bridge.down': true, 'trial.moat': true, 'taken.date': true, 'refresh.done': true, 'stare.done': true }, inventory: ['boots'] },
  { flags: { 'bridge.down': true, 'trial.moat': true, 'taken.date': true, 'refresh.done': true, 'stare.done': true, 'trial.hoodie': true }, inventory: ['hoodie', 'boots'], worn: ['boots', 'hoodie'] },
  { flags: { 'bridge.down': true, 'trial.moat': true, 'taken.date': true, 'refresh.done': true, 'stare.done': true, 'trial.hoodie': true, 'ts.xmla': false }, inventory: ['hoodie', 'boots'] },
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

describe('the ladder at the Desktop Gate (Task B4, made plain)', () => {
  const gate = () => at('fortress.bridge');
  it('4: the plain line, in the hint command\'s words', () => {
    expect(stuckFor(4, gate()).last).toBe(helped("He wants a SKU. There's a free one. It rhymes with denial."));
  });
  it('8 and on: the flask hint verbatim', () => {
    const eight = stuckFor(8, gate());
    expect(eight.s.stuck).toBe(8);
    expect(eight.last).toBe(helped(WORLD.rooms['fortress.bridge']!.flaskHint(eight.s)));
    const twelve = stuckFor(12, gate());
    expect(twelve.last).toBe(helped(WORLD.rooms['fortress.bridge']!.flaskHint(twelve.s)));
  });
  it('nothing is said off the ladder', () => {
    for (const n of [1, 2, 3, 5, 6, 7, 9, 10, 11, 13]) expect(stuckFor(n, gate()).out.join(' '), `${n}`).not.toMatch(/A hollow voice/);
  });
});

describe('the helper at 4 is the plain line where there is one, the flask hint where there is not', () => {
  it('the Studio, stare won, names the pie', () => {
    const { last } = stuckFor(4, at('fortress.yard', { 'bridge.down': true, 'trial.moat': true, 'taken.date': true, 'stare.done': true }));
    expect(last).toBe(helped('The pie chart. Thirty-one slices. Use it and it becomes a bar chart, and the refresh can finally finish.'));
  });
  it('the Lake House has no nudge: its flask hint at 4', () => {
    const { s, last } = stuckFor(4, at('lake.house'));
    expect(WORLD.rooms['lake.house']!.nudge).toBeUndefined();
    expect(last).toBe(helped(WORLD.rooms['lake.house']!.flaskHint(s)));
  });
  it('a plainer function that returns nothing falls back to the flask hint (the Spark chamber with no Notebook to be had)', () => {
    const start = at('monastery.spark', { 'gate.open': true, 'scroll.lent': true, 'ts.fabricItems': false }, { inventory: ['scroll'] });
    const { s, last } = stuckFor(4, start);
    expect(last).toBe(helped(WORLD.rooms['monastery.spark']!.flaskHint(s)));
    expect(last).toMatch(/Users can create Fabric items/);
  });
});

describe('the plain lines', () => {
  it('lint-style: the main-realm rooms without one are the lint warnings; the side realms carry none', () => {
    const bare = rooms.filter((r) => !r.nudge).map((r) => r.id);
    expect(bare.sort()).toEqual(['lake.house', 'lake.shore', 'peaks.ledge', 'swamp.bronze', 'swamp.silver', 'village.fields', 'village.hall']);
    expect(lintWarnings(WORLD)).toEqual(rooms.filter((r) => !r.nudge).map((r) => `${r.id}: no nudge (the flask hint from 4 dead turns)`));
    for (const r of Object.values(WORLD.rooms).filter((r) => SIDE_REGIONS.has(r.region))) expect(r.nudge, r.id).toBeUndefined();
  });
  it('over every progress state: no backtick (the flask hint names the command, the plain line does not), never the flask hint itself, a full stop', () => {
    const bad: string[] = [];
    for (const st of STATES) for (const r of rooms) {
      const s = at(r.id, st.flags, { inventory: st.inventory, worn: st.worn ?? [] });
      const line = text(s, r.nudge?.plainer);
      if (!line) continue; // no nudge, or an explicit "nothing plainer to say": the flask hint takes the turn
      if (/`/.test(line)) bad.push(`${r.id}: ${JSON.stringify(line)}`);
      if (line === r.flaskHint(s)) bad.push(`${r.id}: is the flask hint`);
      if (!/[.!?]$/.test(line)) bad.push(`${r.id}: no full stop: ${JSON.stringify(line)}`);
    }
    expect(bad).toEqual([]);
  });
});

describe('a room without a nudge', () => {
  const cottage = WORLD.rooms['village.cottage']!;
  const { nudge: _dropped, ...bare } = cottage;
  const world: World = { ...WORLD, rooms: { ...WORLD.rooms, 'village.cottage': bare } };
  it('says its flask hint at 4, 8 and 12', () => {
    for (const n of [4, 8, 12]) {
      const { s, last } = stuckFor(n, newGame(world, 3), world);
      expect(last, `${n}`).toBe(helped(bare.flaskHint(s)));
    }
  });
  it('is a lint warning, not a lint failure', () => {
    expect(lintWarnings(world)).toContain('village.cottage: no nudge (the flask hint from 4 dead turns)');
    expect(lintWorld(world)).toEqual([]);
  });
});

describe('the asked-for helpers are untouched', () => {
  it('hint and get ye flask still give the flask hint, once, and reset the count', () => {
    const start = at('fortress.bridge');
    const three = stuckFor(3, start);
    for (const ask of ['hint', 'get ye flask']) {
      const r = step(three.s, ask, WORLD);
      expect(r.output[0], ask).toContain(helped(WORLD.rooms['fortress.bridge']!.flaskHint(three.s)));
      expect(r.output.join('\n').match(/A hollow voice adds/g) ?? [], ask).toHaveLength(1);
      expect(r.state.stuck, ask).toBe(0);
    }
  });
});
