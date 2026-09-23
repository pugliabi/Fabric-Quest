import { describeRoom } from './builtins';
import { SETTING_KEYS, flagOf } from './governance';
import type { GameState, ParsedCommand, StepResult } from './types';
import { settingByKey, settingsListing } from '../world/sacristy';
import type { Rule, RuleWhen, World } from '../world/types';

/**
 * God mode. Undocumented on purpose.
 *
 * `burninate` toggles it. While it is on, a handful of extra commands let you walk the whole
 * world and read every rule the parser would accept — handy for demos, QA, and showing off the
 * data model. Turns spent here are still logged (outcome `meta`, step ids `god.*`), and a run
 * that ever burninated is not eligible for the Hall of Fame.
 */
export const GOD_FLAG = 'god';

const TOGGLE = /^(burninate|burninate the countryside|burninate the peasants)$/;

const GOD_HELP = [
  '⚡ BURNINATION MODE — commands the peasants do not get:',
  '  rooms                 every room in the realm (* = you are here)',
  '  warp <room>           go anywhere (id or part of a name), e.g. warp throne',
  '  prompts               every command the current room will accept, with points',
  '  prompts all           the same for the whole realm',
  '  prompts global        rules that work anywhere, plus the phrase eggs and deaths',
  '  summon <item>         put any item in your inventory',
  '  locate <thing>        who wants it, where it is, what to say (e.g. locate sku, locate key)',
  '  flags                 dump the story flags',
  '  settings              both settings shelves, wherever you are',
  '  set <key> on|off      flip a setting directly (no death, no bonus), e.g. set xmla off',
  '  godhelp               this list',
  '  burninate             back to being a peasant',
].join('\n');

function prep(w: RuleWhen): string {
  return w.verb === 'give' ? 'to' : w.verb === 'use' ? 'on' : w.verb === 'talk' ? 'about' : 'with';
}

function nounText(n: string | string[] | undefined): string {
  return Array.isArray(n) ? n.join('|') : (n ?? '');
}

/** The command a player would type to fire this rule, roughly. */
export function promptFor(r: Rule): string {
  const w = r.when;
  if (w.verb === 'go' && w.dir) return `go ${w.dir}`;
  const parts: string[] = [w.verb];
  if (w.verb === 'talk') parts.push('to');
  if (w.nounMatches) parts.push(`<${w.nounMatches.source}>`);
  else if (w.noun) parts.push(nounText(w.noun));
  if (w.noun2Matches) parts.push(prep(w), w.noun2Matches.source.startsWith('^(?!') ? '<anything else>' : `<${w.noun2Matches.source}>`);
  else if (w.noun2) parts.push(prep(w), nounText(w.noun2));
  return parts.join(' ');
}

function needsText(r: Rule): string {
  const w = r.when;
  const bits: string[] = [];
  if (w.flags) bits.push(...w.flags.map((c) => (c.not ? `!${c.flag}` : c.is !== undefined ? `${c.flag}=${c.is}` : c.flag)));
  if (w.has) bits.push(...w.has.map((i) => `has:${i}`));
  if (w.notHas) bits.push(...w.notHas.map((i) => `not:${i}`));
  if (w.worn) bits.push(...w.worn.map((i) => `wearing:${i}`));
  return bits.length ? `  [needs ${bits.join(', ')}]` : '';
}

function effectText(r: Rule): string {
  const t = r.then;
  const bits: string[] = [];
  if (t.points) bits.push(`+${t.points}`);
  if (t.bonus) bits.push(`+${t.bonus} bonus`);
  if (t.give?.length) bits.push(`gives ${t.give.join(',')}`);
  if (t.moveTo) bits.push(`→ ${t.moveTo}`);
  if (t.returnTo) bits.push('→ back');
  if (t.death) bits.push('DEATH');
  if (t.win) bits.push('WIN');
  return bits.length ? `  (${bits.join(' ')})` : '';
}

function roomPrompts(world: World, roomId: string): string[] {
  const room = world.rooms[roomId]!;
  const out = [`${room.name.toUpperCase()} — ${room.id}`];
  for (const r of room.rules) out.push(`  > ${promptFor(r)}${effectText(r)}${needsText(r)}`);
  const exits = Object.keys(room.exits);
  if (exits.length) out.push(`  exits: ${exits.join(', ')}`);
  if (room.items.length) out.push(`  items: ${room.items.join(', ')}`);
  if (room.npcs.length) out.push(`  npcs: ${room.npcs.join(', ')}`);
  return out;
}

function meta(state: GameState, output: string[], id: string, parsed: ParsedCommand): StepResult {
  return { state, output, outcome: 'meta', stepId: id, pointsAwarded: 0, parsed };
}

function findRoom(world: World, q: string): string | undefined {
  if (world.rooms[q]) return q;
  const needle = q.toLowerCase();
  return Object.values(world.rooms).find((r) => r.id.includes(needle) || r.name.toLowerCase().includes(needle))?.id;
}

function findItem(world: World, q: string): string | undefined {
  if (world.items[q]) return q;
  const needle = q.toLowerCase();
  return Object.values(world.items).find((i) => i.name.toLowerCase().includes(needle) || i.aliases.includes(needle))?.id;
}

/** Strips a leading article off a `locate`-family query, e.g. "the key" -> "key". */
function cleanArticle(s: string): string {
  return s.replace(/^(the|a|an)\s+/, '').trim();
}

/**
 * `locate <thing>` search. Answers "who wants this, where is it, what do I say" by scanning the
 * whole world: NPCs and the rules that mention them, rules matched by noun/noun2/id, items and
 * whatever gives them, and rooms by name. Points-earning entries surface first; within the rest,
 * rules come before items, items before NPC room lines, and NPC lines before room-name matches.
 */
function whereIs(world: World, q: string): string {
  const needle = q.toLowerCase();
  const hit = (s: string | undefined) => !!s && s.toLowerCase().includes(needle);
  type Cat = 'rule' | 'item' | 'npc' | 'room';
  // One hit is one block: a line, or an NPC's header with its rules indented under it. Blocks sort as units.
  const hits: { lines: string[]; cat: Cat; pts: boolean }[] = [];
  const push = (cat: Cat, lines: string[], pts = false) => hits.push({ lines, cat, pts });
  const awards = (t: Rule['then']) => !!(t.points || t.bonus);
  // Each rule is listed once, wherever it is first found (an NPC block, a noun match, or an item giver).
  const listed = new Set<Rule>();
  const fresh = (rule: Rule) => !listed.has(rule) && !!listed.add(rule);

  // NPC matches: their room, plus every rule in that room that names them or is a say-rule
  const npcs = Object.values(world.npcs).filter((n) => hit(n.name) || n.aliases.some(hit));
  for (const n of npcs) for (const r of Object.values(world.rooms)) if (r.npcs.includes(n.id)) {
    const lines = [`${r.id} — ${r.name} (npc ${n.name})`];
    let pts = false;
    for (const rule of r.rules) {
      const w = rule.when;
      const names = ([] as string[]).concat(w.noun ?? [], w.noun2 ?? []);
      if ((names.some(hit) || w.verb === 'say' || (w.nounMatches?.test(needle) ?? false)) && fresh(rule)) {
        lines.push(`  > ${promptFor(rule)}${effectText(rule)}${needsText(rule)}`);
        pts ||= awards(rule.then);
      }
    }
    push('npc', lines, pts);
  }
  // Rule matches by noun / noun2 / id across all rooms and globals
  for (const r of Object.values(world.rooms)) for (const rule of r.rules) {
    const w = rule.when;
    const names = ([] as string[]).concat(w.noun ?? [], w.noun2 ?? [], [rule.id]);
    if (names.some(hit) && fresh(rule)) push('rule', [`${r.id} — ${r.name}: > ${promptFor(rule)}${effectText(rule)}${needsText(rule)}`], awards(rule.then));
  }
  for (const rule of world.globalRules) {
    const w = rule.when;
    if (([] as string[]).concat(w.noun ?? [], w.noun2 ?? [], [rule.id]).some(hit) && fresh(rule)) push('rule', [`anywhere: > ${promptFor(rule)}${effectText(rule)}${needsText(rule)}`], awards(rule.then));
  }
  // Items: where they sit, and which rule gives them
  for (const it of Object.values(world.items)) if (hit(it.name) || it.aliases.some(hit) || hit(it.id)) {
    for (const r of Object.values(world.rooms)) if (r.items.includes(it.id)) push('item', [`item '${it.name}' lives in ${r.id} — ${r.name}`]);
    for (const r of Object.values(world.rooms)) for (const rule of r.rules) if (rule.then.give?.includes(it.id) && fresh(rule)) push('item', [`${r.id} — ${r.name}: > ${promptFor(rule)} gives ${it.name}${needsText(rule)}`], awards(rule.then));
  }
  // The settings live in one room; `locate settings` (or tenant/capacity settings) points there (spec2 §3.6).
  if (/^(tenant |capacity )?settings?$/.test(needle)) push('room', ['room monastery.sacristy — The Sacristy (monastery): the tenant settings shelf and the capacity ledger; up from the Cloister']);
  // Rooms by name
  for (const r of Object.values(world.rooms)) if (hit(r.name) || hit(r.id)) push('room', [`room ${r.id} — ${r.name} (${r.region})`]);

  const uniq = [...new Map(hits.map((h) => [h.lines.join('\n'), h])).values()];
  const catRank: Record<Cat, number> = { rule: 0, item: 1, npc: 2, room: 3 };
  uniq.sort((a, b) => {
    const pa = a.pts ? 0 : 1;
    const pb = b.pts ? 0 : 1;
    return pa !== pb ? pa - pb : catRank[a.cat] - catRank[b.cat];
  });
  return uniq.length ? uniq.flatMap((h) => h.lines).join('\n') : `Nothing in the realm answers to '${q}'. Try: rooms, prompts all.`;
}

/** Returns a result when the input is a god-mode command, otherwise null. */
export function godStep(base: GameState, lower: string, world: World, parsed: ParsedCommand): StepResult | null {
  if (TOGGLE.test(lower)) {
    const on = !base.flags[GOD_FLAG];
    const state = { ...base, flags: { ...base.flags, [GOD_FLAG]: on } };
    return {
      ...meta(state, on
        ? ['A dragon-shaped shadow passes over the realm. Every string is a string, and you can read all of them.', GOD_HELP]
        : ['The countryside is spared. You are a peasant again.'], on ? 'god.on' : 'god.off', parsed),
      sfx: on ? 'win' : 'door',
    };
  }
  if (!base.flags[GOD_FLAG]) return null;

  const [cmd, ...rest] = lower.split(/\s+/);
  const arg = rest.join(' ');
  switch (cmd) {
    case 'godhelp':
      return meta(base, [GOD_HELP], 'god.help', parsed);
    case 'rooms':
      return meta(base, [Object.values(world.rooms).map((r) => `${r.id === base.room ? '*' : ' '} ${r.id.padEnd(20)} ${r.name} (${r.region})`).join('\n')], 'god.rooms', parsed);
    case 'warp':
    case 'teleport': {
      const id = findRoom(world, arg);
      if (!id) return meta(base, [`No such room: "${arg}". Try: rooms`], 'god.warp', parsed);
      const state = { ...base, room: id };
      return { ...meta(state, [describeRoom(state, world)], 'god.warp', parsed), outcome: 'move', sfx: 'move' };
    }
    case 'prompts': {
      if (arg === 'all') return meta(base, [Object.keys(world.rooms).flatMap((id) => [...roomPrompts(world, id), '']).join('\n')], 'god.prompts', parsed);
      if (arg === 'global') {
        const out = ['ANYWHERE'];
        for (const r of world.globalRules) out.push(`  > ${promptFor(r)}${effectText(r)}${needsText(r)}`);
        out.push('', 'PHRASES (matched on the raw line)');
        for (const p of world.phraseRules) out.push(`  ${p.death ? '☠ ' : '  '}/${p.test.source}/${p.room ? `  [${p.room}]` : ''}`);
        return meta(base, [out.join('\n')], 'god.prompts', parsed);
      }
      return meta(base, [roomPrompts(world, base.room).join('\n')], 'god.prompts', parsed);
    }
    case 'summon': {
      const id = findItem(world, arg);
      if (!id) return meta(base, [`No such item: "${arg}".`], 'god.summon', parsed);
      if (base.inventory.includes(id)) return meta(base, [`You already carry the ${world.items[id]!.name}.`], 'god.summon', parsed);
      const state = { ...base, inventory: [...base.inventory, id], flags: { ...base.flags, [`taken.${id}`]: true } };
      return { ...meta(state, [`The ${world.items[id]!.name} appears in your hands. Nobody saw that.`], 'god.summon', parsed), sfx: 'item' };
    }
    case 'flags':
      return meta(base, [Object.keys(base.flags).length ? Object.entries(base.flags).map(([k, v]) => `${k} = ${v}`).join('\n') : '(no flags yet)'], 'god.flags', parsed);
    // "where" is intentionally NOT a god command here — reserved for a future player-facing command.
    case 'locate':
    case 'find': {
      const q = cleanArticle(arg.replace(/^(is|are|do i (get|find|give|say)( to)?|to)\s+/, ''));
      if (!q) return meta(base, ['locate what?'], 'god.locate', parsed);
      return meta(base, [whereIs(world, q)], 'god.locate', parsed);
    }
    // "how" and "what" only claim the specific alias shapes below ("how do i get/find X", "how
    // about i get/find X", "what do i give/say (to) X"); anything else — "how about i grab the
    // mug", "how do i inspect the mirror", a bare "what" — falls through (return null) to normal
    // play. Matched against `arg`, not `lower`, since `cmd` (the first word) is already 'how'/'what'.
    case 'how': {
      const m = /^(do i (get|find)|about i (get|find))\s+(.+)$/.exec(arg);
      if (!m) return null;
      const q = cleanArticle(m[4]!);
      if (!q) return meta(base, ['locate what?'], 'god.locate', parsed);
      return meta(base, [whereIs(world, q)], 'god.locate', parsed);
    }
    case 'what': {
      const m = /^do i (give|say)( to)?\s+(.+)$/.exec(arg);
      if (!m) return null;
      const q = cleanArticle(m[3]!);
      if (!q) return meta(base, ['locate what?'], 'god.locate', parsed);
      return meta(base, [whereIs(world, q)], 'god.locate', parsed);
    }
    // The Sacristy's shelves, from anywhere (spec2 §3.6). Inside the Sacristy the room's own `settings` phrase never
    // runs while god mode is on: this one prints both shelves instead of the tenant shelf alone, which is a superset.
    case 'settings':
      return meta(base, [settingsListing(base)], 'god.settings', parsed);
    // Flip a setting's flag directly: no death, no bonus, no FIFTEEN line, and no `gov.touched` — that flag records a
    // Sacristy flip (the +5 governance-restored bonus), and a god-mode flip is not governance (E3).
    case 'set': {
      const m = /^(\S+)\s+(on|off)$/.exec(arg);
      if (!arg) return meta(base, [`set <key> on|off — keys: ${SETTING_KEYS.join(', ')}`], 'god.set', parsed);
      if (!m) return null; // "set it to both" in the Model View is the room's, not ours
      const key = SETTING_KEYS.find((k) => k.toLowerCase() === m[1]!.toLowerCase());
      if (!key) return meta(base, [`No such setting: "${m[1]}". Keys: ${SETTING_KEYS.join(', ')}`], 'god.set', parsed);
      const want = m[2] === 'on';
      const state = { ...base, flags: { ...base.flags, [flagOf(key)]: want } };
      return meta(state, [`${settingByKey(key).title}: ${want ? 'ON' : 'OFF'}. (God mode: no death, no bonus, no 15 minutes.)`], 'god.set', parsed);
    }
    default:
      return null;
  }
}
