import type { World } from './types';
import { SIDEQUEST_ENTRY } from './sidequests';
import type { GameState } from '../engine/types';

/** Static checks over the world: dangling references, duplicate ids, unreachable rooms. */
export function lintWorld(world: World): string[] {
  const problems: string[] = [];
  const rooms = Object.keys(world.rooms);
  if (!world.rooms[world.start]) problems.push(`start room ${world.start} does not exist`);

  // Every flag name that any rule can set, so function exits can be probed in the "all true" state.
  const allFlags = new Set<string>();
  const allRules = [...world.globalRules, ...Object.values(world.rooms).flatMap((r) => r.rules)];
  for (const r of allRules) for (const k of Object.keys(r.then.set ?? {})) allFlags.add(k);
  const allTrue: GameState = {
    room: world.start, inventory: Object.keys(world.items), worn: [], score: 0, bonus: 0, turns: 0, dead: false, won: false, seed: 1,
    flags: Object.fromEntries([...allFlags].map((f) => [f, true])),
  };
  const allFalse: GameState = { ...allTrue, inventory: [], flags: {} };

  // Side realms have no map exits in; they are entered by phrase (SIDEQUEST_ENTRY), so seed those as reachable.
  const reachable = new Set<string>([world.start, ...Object.values(SIDEQUEST_ENTRY)]);
  for (const id of Object.values(SIDEQUEST_ENTRY)) if (!world.rooms[id]) problems.push(`side-quest entry room ${id} does not exist`);
  for (const room of Object.values(world.rooms)) {
    if (room.id !== room.id.trim() || !room.id) problems.push(`room with bad id: "${room.id}"`);
    if (!room.enterQuip) problems.push(`${room.id}: missing enterQuip`); // required everywhere, side rooms included
    for (const [dir, target] of Object.entries(room.exits)) {
      const candidates = typeof target === 'function' ? [target(allTrue), target(allFalse)] : [target];
      for (const c of candidates) {
        if (c === null || c === undefined) continue;
        if (!world.rooms[c]) problems.push(`${room.id}: exit ${dir} -> missing room ${c}`);
        else reachable.add(c);
      }
    }
    for (const id of room.items) if (!world.items[id]) problems.push(`${room.id}: unknown item ${id}`);
    for (const id of room.npcs) if (!world.npcs[id]) problems.push(`${room.id}: unknown npc ${id}`);
    for (const state of [allTrue, allFalse]) {
      const scene = room.scene({ ...state, room: room.id });
      if (!scene) problems.push(`${room.id}: scene() returned empty`);
      if (!room.describe({ ...state, room: room.id })) problems.push(`${room.id}: describe() returned empty`);
      if (!room.flaskHint({ ...state, room: room.id })) problems.push(`${room.id}: flaskHint() returned empty`);
    }
  }
  for (const r of allRules) {
    if (r.then.moveTo && !world.rooms[r.then.moveTo]) problems.push(`rule ${r.id}: moveTo missing room ${r.then.moveTo}`);
    reachable.add(r.then.moveTo ?? world.start);
    for (const list of [r.then.give, r.then.remove, r.then.wear, r.when.has, r.when.notHas, r.when.worn]) {
      for (const id of list ?? []) if (!world.items[id]) problems.push(`rule ${r.id}: unknown item ${id}`);
    }
  }
  const ids = allRules.map((r) => r.id);
  for (const id of ids) if (ids.filter((x) => x === id).length > 1) problems.push(`duplicate rule id ${id}`);
  const phraseIds = world.phraseRules.map((p) => p.id);
  for (const id of phraseIds) if (phraseIds.filter((x) => x === id).length > 1) problems.push(`duplicate phrase rule id ${id}`);
  for (const p of world.phraseRules) if (p.room && !world.rooms[p.room]) problems.push(`phrase rule ${p.id}: unknown room ${p.room}`);
  const sources = new Map<string, string>();
  // Same test in the same scope is a dead rule; a room- or region-scoped phrase may deliberately shadow a global one.
  for (const p of world.phraseRules) {
    const key = `${p.room ?? p.region ?? '*'}|${p.test.source}`;
    const other = sources.get(key);
    if (other) problems.push(`phrase rules ${other} and ${p.id} share the same test ${p.test.source}`);
    else sources.set(key, p.id);
  }
  for (const id of rooms) if (!reachable.has(id)) problems.push(`room ${id} is unreachable`);
  return [...new Set(problems)];
}
