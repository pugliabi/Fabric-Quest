import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { resolveNoun } from '../src/engine/builtins';
import { WORLD } from '../src/world';
import type { Rule } from '../src/world/types';
import type { GameState } from '../src/engine/types';

// Every Keep room: anything a rule names as an object, and every item in the room, can be looked at.
const KEEP = Object.values(WORLD.rooms).filter((r) => r.region === 'fortress');
const OBJECT_VERBS = new Set(['look', 'get', 'use', 'give', 'open', 'close', 'talk', 'attack', 'drink', 'read', 'wear']);
// The builtin "don't see" pool (engine/builtins.ts dontSee), every line of it — a new line there needs a new alternative here.
const DONT_SEE = /don't see any|Not even a placeholder|in a room you haven't found|checks under the rug|has not been told about|misread the ledger|didn't animate one|never been a/;

const list = (n: string | string[] | undefined): string[] => (n === undefined ? [] : Array.isArray(n) ? n : [n]);

/** The state a rule expects: its flag conditions satisfied, and only the license plus the items it needs held. */
function stateFor(room: string, rule?: Rule): GameState {
  const flags: Record<string, boolean | number> = {};
  for (const c of rule?.when.flags ?? []) if (!c.not) flags[c.flag] = c.is ?? true;
  return { ...newGame(WORLD, 3), room, inventory: [...new Set(['license', ...(rule?.when.has ?? [])])], flags };
}

describe('Keep examinables', () => {
  it('has the five Keep rooms plus the Model View', () => {
    expect(KEEP.map((r) => r.id).sort()).toEqual(['fortress.bridge', 'fortress.hall', 'fortress.model', 'fortress.throne', 'fortress.yard']);
  });
  for (const room of KEEP) {
    it(`${room.id}: every rule noun and every item can be looked at`, () => {
      const misses: string[] = [];
      const probe = (noun: string, s: GameState) => {
        const out = step(s, `look at ${noun}`, WORLD).output.join(' ');
        if (DONT_SEE.test(out)) misses.push(`${noun}: ${out}`);
      };
      // A rule noun counts once it can be looked at in the state of any rule that names it: a "you have none" fallback
      // (fortress.give-table-none) names the date table precisely because it is not in hand, and its scoring twin holds it.
      const seen = new Map<string, string | null>();
      for (const rule of room.rules) {
        if (!OBJECT_VERBS.has(rule.when.verb)) continue;
        for (const noun of [...list(rule.when.noun), ...list(rule.when.noun2)]) {
          if (seen.get(noun) === null) continue;
          const out = step(stateFor(room.id, rule), `look at ${noun}`, WORLD).output.join(' ');
          seen.set(noun, DONT_SEE.test(out) ? `${noun}: ${out}` : null);
        }
      }
      for (const miss of seen.values()) if (miss) misses.push(miss);
      for (const id of [...room.items, ...room.npcs]) probe(id, stateFor(room.id));
      expect(misses).toEqual([]);
    });
  }
  for (const room of KEEP) {
    it(`${room.id}: every name and alias of its items and people resolves to that same thing`, () => {
      // Empty hands, so nothing carried can shadow the room (the Pro License is also a 'card').
      const s: GameState = { ...newGame(WORLD, 3), room: room.id, inventory: [] };
      const wrong: string[] = [];
      for (const id of room.items) {
        const item = WORLD.items[id]!;
        for (const name of [item.name.toLowerCase(), ...item.aliases]) {
          const r = resolveNoun(s, WORLD, name);
          const got = r ? (r.kind === 'item' ? r.item.id : r.npc.id) : 'nothing';
          if (got !== id) wrong.push(`${name} -> ${got} (want ${id})`);
        }
      }
      for (const id of room.npcs) {
        const npc = WORLD.npcs[id]!;
        for (const name of [npc.name.toLowerCase(), ...npc.aliases]) {
          const r = resolveNoun(s, WORLD, name);
          const got = r ? (r.kind === 'item' ? r.item.id : r.npc.id) : 'nothing';
          if (got !== id) wrong.push(`${name} -> ${got} (want ${id})`);
        }
      }
      expect(wrong).toEqual([]);
    });
  }
  it('every Keep scenery item has a description and a reason it stays put', () => {
    for (const room of KEEP) {
      for (const id of room.items) {
        const item = WORLD.items[id]!;
        expect(item.describe, id).toBeTruthy();
        if (!item.takeable) expect(item.untakeableText, id).toBeTruthy();
      }
    }
  });
});
