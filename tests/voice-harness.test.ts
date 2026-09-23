import { describe, expect, it } from 'vitest';
import { WORLD } from '../src/world';
import { newGame, step } from '../src/engine/step';
import { resolveNoun } from '../src/engine/builtins';
import { QUIRK_POOLS } from '../src/engine/quirks';
import { SNARK } from '../src/world/globals';
import { whereText } from '../src/world/where';
import { GOAL, MAIN_GOAL } from '../src/world/sidequests';
import { ALLUSIONS, BRANDS, MALAPROPS, NICKNAMES, brushOffLine } from '../src/world/voice';
import { ALLOWLIST } from './voice-allowlist';
import type { GameState } from '../src/engine/types';
import type { Region } from '../src/world/types';

type Tagged = { text: string; region: Region | 'global'; from: string };

const allFlags = new Set<string>();
for (const r of [...WORLD.globalRules, ...Object.values(WORLD.rooms).flatMap((room) => room.rules)]) for (const k of Object.keys(r.then.set ?? {})) allFlags.add(k);
const allTrue: GameState = { ...newGame(WORLD, 1), inventory: Object.keys(WORLD.items), flags: Object.fromEntries([...allFlags].map((f) => [f, true])) };
const allFalse: GameState = { ...allTrue, inventory: ['license'], flags: {} };
const PROBES = [allTrue, allFalse];
const regionOfItem = new Map<string, Region>();
const regionOfNpc = new Map<string, Region>();
for (const room of Object.values(WORLD.rooms)) {
  for (const id of room.items) if (!regionOfItem.has(id)) regionOfItem.set(id, room.region);
  for (const id of room.npcs) if (!regionOfNpc.has(id)) regionOfNpc.set(id, room.region);
}

const text = (t: unknown, s: GameState): string | null => {
  try {
    const v = typeof t === 'function' ? (t as (a: GameState, b: typeof WORLD) => unknown)(s, WORLD) : t;
    return typeof v === 'string' && v ? v : null;
  } catch { return null; }
};

/** Every narrator string reachable statically, tagged with a region. */
function harvest(): Tagged[] {
  const out: Tagged[] = [];
  const add = (t: string | null | undefined, region: Region | 'global', from: string) => { if (t) out.push({ text: t, region, from }); };
  for (const room of Object.values(WORLD.rooms)) {
    for (const s of PROBES) {
      const st = { ...s, room: room.id };
      add(text(room.describe, st), room.region, room.id); add(text(room.flaskHint, st), room.region, room.id); add(text(room.enterQuip, st), room.region, room.id);
      add(whereText(st, room.id), room.region, `where ${room.id}`); // some where lines are functions of the state
    }
    for (const r of room.rules) for (const s of PROBES) add(text(r.then.text, { ...s, room: room.id }), room.region, r.id);
  }
  for (const [id, it] of Object.entries(WORLD.items)) {
    const region = regionOfItem.get(id) ?? 'global';
    for (const s of PROBES) { add(text(it.describe, s), region, id); add(text(it.again, s), region, `${id}.again`); }
    add(it.untakeableText, region, id); add(it.blurb, region, `${id}.blurb`);
  }
  for (const [id, n] of Object.entries(WORLD.npcs)) {
    const region = regionOfNpc.get(id) ?? 'global';
    for (const s of PROBES) {
      add(text(n.describe, s), region, id); add(text(n.talk, s), region, id);
      for (let k = 2; k <= 5; k++) add(n.talkMore ? text((st: GameState) => n.talkMore!(st, k), s) : null, region, `${id}.talk${k}`);
      add(brushOffLine(s, n.brushOff), region, `${id}.brushOff`); // some brush-offs are functions of the state
    }
  }
  for (const r of WORLD.globalRules) for (const s of PROBES) add(text(r.then.text, s), 'global', r.id);
  for (const p of WORLD.phraseRules) {
    const region: Region | 'global' = p.room ? WORLD.rooms[p.room]!.region : p.region ?? 'global';
    for (const s of PROBES) {
      const st = p.room ? { ...s, room: p.room } : s;
      if (p.then) {
        try {
          const th = typeof p.then === 'function' ? p.then(st, WORLD, '', undefined as never) : { then: p.then };
          if (th) add(text(th.then.text, st), region, p.id);
        } catch { /* a handler that needs a real line */ }
      } else add(text(p.text, st), region, p.id);
    }
  }
  for (const l of SNARK) add(l, 'global', 'snark');
  for (const l of QUIRK_POOLS) add(l, 'global', 'quirk');
  add(GOAL.excel.body, 'excel', 'goal'); add(GOAL.copilot.body, 'copilot', 'goal'); add(MAIN_GOAL, 'global', 'goal');
  return out;
}
const ALL = harvest();

/** Capitalized words mid-sentence that are not a name from this game, keyed by word, with the region and line. */
function unknownProperNouns(): Map<string, Tagged> {
  const known = new Set<string>();
  const learn = (s: string) => { for (const w of s.split(/[\s/·—–-]+/)) { const c = w.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9']+$/g, ''); if (c) known.add(c.toLowerCase()); } };
  for (const r of Object.values(WORLD.rooms)) learn(r.name);
  for (const it of Object.values(WORLD.items)) { learn(it.name); it.aliases.forEach(learn); }
  for (const n of Object.values(WORLD.npcs)) { learn(n.name); n.aliases.forEach(learn); }
  [...NICKNAMES, ...ALLUSIONS, ...BRANDS, ...ALLOWLIST].forEach(learn);
  const offenders = new Map<string, Tagged>();
  for (const t of ALL) {
    for (const raw of t.text.split(/[.!?:;\n]+\s*/)) {
      const sentence = raw.replace(/^[\s"'“‘(\[]+/, '');
      for (const w of sentence.split(/\s+/).slice(1)) {
        if (/^["'“‘(]/.test(w)) continue; // a quote opens a sentence of its own: 'Sacristy,' says the Clerk
        // "Jeff's" is Jeff; "Lakehouse-adjacent" and "Customer_Name" are checked part by part.
        for (const part of w.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '').replace(/['’]s$/, '').split(/[-_]/)) {
          if (!/^[A-Z][a-z]/.test(part)) continue; // lowercase, digits and ALL CAPS emphasis are fine
          if (!known.has(part.toLowerCase()) && !offenders.has(part)) offenders.set(part, t);
        }
      }
    }
  }
  return offenders;
}

/**
 * First run (F12): 26 unknowns, all this game's own UI / field vocabulary, now in tests/voice-allowlist.ts. So the
 * baseline is 0: a new capitalized word mid-sentence fails here until it is allowlisted or the line is rewritten.
 */
const UNKNOWN_BASELINE = 0;

describe('voice harness (spec1 §7)', () => {
  it('harvests a real corpus from every region', () => {
    for (const region of ['village', 'lake', 'swamp', 'monastery', 'fortress', 'peaks', 'excel', 'copilot', 'global'] as const) {
      expect(ALL.filter((t) => t.region === region).length, region).toBeGreaterThan(5);
    }
  });
  it('no proper noun from the other realm ever reaches the screen', () => {
    const banned = /\b(trogdor|kerrek|jhonka|strong ?bad|homestar|marzipan|peasantry|naked ned|rather dashing|coach z|bubs|poopsmith|king of town|pom pom|trogdorkilla|dirk the daring|matthew broderick|boring sanders|swimmer dan|mispeller jones|smarty-short-pants)\b/i;
    // "Sparkles" the name is banned; "it sparkles harder" (Copilot's sparkle, copilot.sparkle) is this game's verb.
    const bannedCased = /\bSparkles\b/;
    const hits = ALL.filter((t) => banned.test(t.text) || bannedCased.test(t.text)).map((t) => `${t.from}: ${t.text}`);
    expect(hits).toEqual([]);
  });
  it('the proper-noun heuristic finds no more unknown capitalized words than the baseline (ratchet, per region)', () => {
    const offenders = unknownProperNouns();
    const byRegion: Record<string, string[]> = {};
    for (const [w, t] of offenders) (byRegion[t.region] ??= []).push(`${w} ← ${t.from}: ${t.text}`);
    expect(offenders.size, JSON.stringify(byRegion, null, 1)).toBeLessThanOrEqual(UNKNOWN_BASELINE);
  });
});

describe('a second identical command: the item answers for itself, the NPC has a next line', () => {
  const homeOf = (id: string) => Object.values(WORLD.rooms).find((r) => r.items.includes(id));
  const realmFlags = (roomId: string) => (roomId.startsWith('excel') || roomId.startsWith('copilot') ? { 'sq.return': 1 } : {});

  it.each(Object.values(WORLD.items).filter((i) => i.takeable).map((i) => i.id))('get %s twice in its own room while carrying it: its own line, and no chirp stacked under the second', (id) => {
    const it = WORLD.items[id]!;
    const room = homeOf(id);
    const s: GameState = { ...newGame(WORLD, 2), ...(room ? { room: room.id } : {}), inventory: ['license', id], flags: { ...(room ? realmFlags(room.id) : {}), [`taken.${id}`]: true } };
    const noun = [it.name.toLowerCase(), ...it.aliases].find((n) => { const r = resolveNoun(s, WORLD, n); return r?.kind === 'item' && r.item.id === id; });
    expect(noun, `${id}: no noun resolves to it`).toBeDefined();
    const a = step(s, `get ${noun}`, WORLD);
    const b = step(a.state, `get ${noun}`, WORLD);
    expect(a.output.join('\n').length).toBeGreaterThan(0);
    expect(b.output.length, `${id}: "get ${noun}" twice`).toBe(a.output.length);
    expect(b.output.filter((l) => QUIRK_POOLS.includes(l)), `${id}: "get ${noun}" twice`).toEqual([]);
  });

  it.each(Object.values(WORLD.npcs).map((n) => n.id))('talk to %s twice', (id) => {
    const npc = WORLD.npcs[id]!;
    const room = Object.values(WORLD.rooms).find((r) => r.npcs.includes(id))!;
    const s: GameState = { ...newGame(WORLD, 2), room: room.id, flags: realmFlags(room.id) };
    const noun = [npc.name.toLowerCase(), ...npc.aliases].find((n) => resolveNoun(s, WORLD, n)?.kind === 'npc');
    expect(noun, `${id}: no noun resolves to the NPC in ${room.id}`).toBeDefined();
    const a = step(s, `talk to ${noun}`, WORLD);
    const b = step(a.state, `talk to ${noun}`, WORLD);
    expect(b.output.join('\n'), `${id}: "talk to ${noun}" twice`).not.toBe(a.output.join('\n'));
  });
});
