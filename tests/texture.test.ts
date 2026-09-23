import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { resolveNoun } from '../src/engine/builtins';
import { WORLD } from '../src/world';
import type { FlagValue } from '../src/world/types';
import type { GameState } from '../src/engine/types';

// Spec §18: every main-realm room has something to get, something to do, and a flask hint that says what to do next.
// The Keep (fortress.*) was textured by its own task; the Lake House is a pure bit; side realms have their own rules.
const MAIN = [
  'village.cottage', 'village.square', 'village.mill', 'village.fields',
  'lake.shore', 'lake.dock', 'lake.island',
  'swamp.bronze', 'swamp.silver', 'swamp.gold',
  'monastery.gate', 'monastery.cloister', 'monastery.spark', 'monastery.library',
  'peaks.foothills', 'peaks.pass', 'peaks.ledge', 'peaks.shrine',
];

const IMPERATIVE = /\b(wait|talk|give|use|read|get|wear|say|board|go|north|south|east|west|exit|show|look)\b/i;

// The same two probe states the world lint uses: every settable flag true and every item held, or nothing at all.
const allFlags = new Set<string>();
for (const r of [...WORLD.globalRules, ...Object.values(WORLD.rooms).flatMap((room) => room.rules)]) {
  for (const k of Object.keys(r.then.set ?? {})) allFlags.add(k);
}
const allTrue: GameState = {
  ...newGame(WORLD, 1), inventory: Object.keys(WORLD.items), flags: Object.fromEntries([...allFlags].map((f) => [f, true])),
};
const allFalse: GameState = { ...allTrue, inventory: [], flags: {} };

const at = (room: string, inventory: string[] = [], flags: Record<string, FlagValue> = {}): GameState =>
  ({ ...newGame(WORLD, 3), room, inventory, flags: { ...flags } });
const run = (s: GameState, ...cmds: string[]) => {
  let state = s;
  let last = step(state, 'look', WORLD);
  for (const c of cmds) { last = step(state, c, WORLD); state = last.state; }
  return { s: state, out: last.output.join('\n'), last };
};

describe('room texture (spec §18)', () => {
  it('covers exactly the 18 main-realm rooms', () => {
    for (const id of MAIN) expect(WORLD.rooms[id], id).toBeTruthy();
  });

  it.each(MAIN)('%s: something to get', (id) => {
    const room = WORLD.rooms[id]!;
    const inRoom = room.items.some((i) => WORLD.items[i]?.takeable);
    const given = room.rules.some((r) => (r.then.give ?? []).length > 0);
    expect(inRoom || given).toBe(true);
  });

  it.each(MAIN)('%s: something to do besides walk and look', (id) => {
    expect(WORLD.rooms[id]!.rules.some((r) => r.when.verb !== 'go' && r.when.verb !== 'look')).toBe(true);
  });

  it.each(MAIN)('%s: the flask hint names an action, in both extreme states', (id) => {
    const room = WORLD.rooms[id]!;
    for (const s of [allTrue, allFalse]) expect(room.flaskHint({ ...s, room: id })).toMatch(IMPERATIVE);
  });
});

// New red herrings and where they live.
const NEW_ITEMS: Record<string, string[]> = {
  'village.cottage': ['jeff-note'],
  'village.square': ['lanyard'],
  'village.mill': ['usb stick'],
  'village.fields': ['seed'],
  'lake.shore': ['pebble'],
  'lake.dock': ['timetable'],
  'swamp.bronze': ['stress ball'],
  'swamp.silver': ['name tag'],
  'monastery.gate': ['pamphlet'],
  'monastery.cloister': ['kpi'],
  'monastery.spark': ['bamboo'],
  'monastery.library': ['synapse-bookmark'],
  'peaks.foothills': ['flat-rock'],
  'peaks.pass': ['receipt'],
  'peaks.ledge': ['carabiner'],
};

describe('new items', () => {
  it.each(Object.entries(NEW_ITEMS))('%s: every name and alias of its new items resolves to that same item', (room, ids) => {
    const s: GameState = { ...newGame(WORLD, 3), room, inventory: [] };
    const wrong: string[] = [];
    for (const id of ids) {
      const item = WORLD.items[id];
      expect(item, id).toBeTruthy();
      expect(WORLD.rooms[room]!.items).toContain(id);
      expect(item!.takeable, id).toBe(true);
      for (const name of [item!.name.toLowerCase(), ...item!.aliases]) {
        const r = resolveNoun(s, WORLD, name);
        const got = r ? (r.kind === 'item' ? r.item.id : r.npc.id) : 'nothing';
        if (got !== id) wrong.push(`${name} -> ${got} (want ${id})`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('each new item can be picked up where it lies', () => {
    for (const [room, ids] of Object.entries(NEW_ITEMS)) {
      for (const id of ids) {
        const { s } = run(at(room), `get ${WORLD.items[id]!.name}`);
        expect(s.inventory, `${room}: get ${id}`).toContain(id);
      }
    }
  });
});

describe('something to do, give or use in every room', () => {
  it.each([
    ['village.cottage', [], {}, ['get sticky note', 'read sticky note'], /DO NOT REFRESH/],
    ['village.square', ['jeff-note'], {}, ['give sticky note to jeff'], /That's mine/],
    ['village.square', [], {}, ['get lanyard', 'wear lanyard'], /Nobody checks/],
    ['village.mill', ['usb stick'], {}, ['use usb stick on wheel'], /already running that/],
    ['village.fields', ['seed'], {}, ['use seed on crops'], /considers its options, and fails/],
    ['village.fields', ['seed'], {}, ['plant seed'], /considers its options, and fails/],
    ['lake.shore', ['pebble'], {}, ['use pebble on lake'], /Delta file/],
    ['lake.shore', ['pebble'], {}, ['skip pebble'], /Delta file/],
    ['lake.dock', ['lanyard'], {}, ['give lanyard to ferryman'], /FabCon/],
    ['lake.dock', ['timetable'], {}, ['give timetable to ferryman'], /timetable|schedule/i],
    ['lake.island', ['personal key'], {}, ['use personal key on plinth'], /yours alone/],
    ['swamp.bronze', ['stress ball'], {}, ['use stress ball'], /oddly calming. It is also oddly deprecated/],
    ['swamp.bronze', ['stress ball'], {}, ['squeeze ball', 'squeeze ball', 'squeeze ball'], /most you have processed/],
    ['swamp.bronze', ['name tag'], {}, ['use name tag on csv'], /Column3/],
    ['swamp.silver', [], {}, ['read column names'], /Column3 is still Column3/],
    ['swamp.gold', ['shortcut'], {}, ['use shortcut on marsh'], /contains the marsh/],
    ['monastery.gate', [], {}, ['knock'], /Session starting/i],
    ['monastery.gate', ['pamphlet'], {}, ['give pamphlet to monk'], /wrote it/],
    ['monastery.cloister', ['kpi'], {}, ['give kpi to abbot'], /This is the realm/],
    ['monastery.spark', ['kpi'], {}, ['use kpi on notebook'], /seen worse/],
    ['monastery.spark', ['bamboo'], {}, ['give bamboo to pandas'], /bamboo/i],
    ['monastery.library', ['synapse-bookmark'], {}, ['give bookmark to librarian'], /legacy/],
    ['peaks.shrine', ['flat-rock'], {}, ['use flat rock on dragon'], /bills you for the throw/],
    ['peaks.shrine', ['flat-rock'], {}, ['throw rock at dragon'], /bills you for the throw/],
    ['peaks.shrine', ['flat-rock'], {}, ['throw rock at model'], /bills you for the landing/],
    ['peaks.shrine', ['kpi'], {}, ['give kpi to dragon'], /briefly delighted/],
    ['peaks.shrine', ['receipt'], {}, ['give receipt to dragon'], /Throttlor/],
    ['peaks.ledge', [], {}, ['read door'], /WORTHY ONLY/],
    ['peaks.ledge', ['carabiner'], {}, ['use carabiner on door'], /governance/],
  ] as [string, string[], Record<string, FlagValue>, string[], RegExp][])('%s: %j → line', (room, inv, flags, cmds, want) => {
    const { s, out, last } = run(at(room, inv, flags), ...cmds);
    expect(out).toMatch(want);
    expect(s.dead).toBe(false);
    expect(last.pointsAwarded).toBe(0);
    expect(s.score).toBe(0);
  });

  it('skipping the pebble does not import the OneLake (death.import still works for the lake itself)', () => {
    expect(run(at('lake.shore', ['pebble']), 'use pebble on lake').s.dead).toBe(false);
    expect(run(at('lake.shore'), 'use onelake').s.dead).toBe(true);
  });

  it('the Gold Marsh shortcut still teleports when simply used', () => {
    expect(run(at('swamp.gold', ['shortcut']), 'use shortcut').s.room).toBe('lake.shore');
    expect(run(at('swamp.gold', ['shortcut']), 'use shortcut on marsh').s.room).toBe('swamp.gold');
  });

  it('the Monastery gate hint names both ways in', () => {
    const hint = () => WORLD.rooms['monastery.gate']!.flaskHint(at('monastery.gate', [], {}));
    expect(hint()).toMatch(/Open the gate, or wait for it\./);
    expect(WORLD.rooms['monastery.gate']!.flaskHint(at('monastery.gate', [], { 'gate.open': true }))).toMatch(/north/i);
  });

  it('fixing a seed does not plant it', () => {
    expect(run(at('village.fields', ['seed']), 'fix seed').s.inventory).toContain('seed');
  });

  it('the Ledge hint, partway there, names what is missing once and where to go', () => {
    const hint = WORLD.rooms['peaks.ledge']!.flaskHint(at('peaks.ledge', [], { 'trial.moat': true, 'trial.hoodie': true }));
    expect(hint).toMatch(/still wants: hold the key/);
    expect(hint).toMatch(/south to the Foothills\. From there: go west/);
    expect(hint).not.toMatch(/sigil/i);
  });

  it('the Dock and the Ledge hints say what the spec says', () => {
    expect(WORLD.rooms['lake.dock']!.flaskHint(at('lake.dock'))).toMatch(/The Ferryman needs credentials\. The Mill has them\./);
    expect(WORLD.rooms['peaks.ledge']!.flaskHint(at('peaks.ledge'))).toMatch(/wear the hoodie, smell like the moat, hold the key/);
  });
});

describe('flask hints stay current (final review M5)', () => {
  const hint = (room: string, flags: Record<string, FlagValue>, worn: string[] = []) => WORLD.rooms[room]!.flaskHint({ ...at(room, [], flags), worn });
  const keepDone = { 'bridge.down': true, 'trial.moat': true, 'taken.date': true, 'refresh.done': true, 'stare.done': true };
  it('the Gate stops sending you to the Duke and the pie once both are done', () => {
    expect(hint('fortress.bridge', { 'bridge.down': true })).toMatch(/Duke.*date table/);
    expect(hint('fortress.bridge', { 'bridge.down': true, 'trial.moat': true })).not.toMatch(/Duke/);
    expect(hint('fortress.bridge', { 'bridge.down': true, 'trial.moat': true })).toMatch(/pie chart/);
    const done = hint('fortress.bridge', { ...keepDone, 'trial.hoodie': true });
    expect(done).not.toMatch(/Duke|date table|pie|Monastery/);
  });
  it('once the hoodie is earned, the hall, the Model View and the Studio stop pointing at the monks', () => {
    for (const room of ['fortress.hall', 'fortress.model', 'fortress.yard']) {
      expect(hint(room, keepDone, ['boots']), room).toMatch(/Monastery|monks/);
      expect(hint(room, { ...keepDone, 'trial.hoodie': true }, ['boots']), room).not.toMatch(/Monastery|monks are waiting/);
    }
  });
  it('the Ledge does not send you north: north is the Shrine door', () => {
    for (const flags of [{ 'trial.moat': true }, { 'trial.moat': true, 'trial.hoodie': true }]) {
      const h = hint('peaks.ledge', flags);
      expect(h).toMatch(/North is the Shrine door/);
      expect(h).toMatch(/south to the Foothills/);
      expect(h).not.toMatch(/^Go north/);
    }
  });
});
