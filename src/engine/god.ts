import { describeRoom } from './builtins';
import type { GameState, ParsedCommand, StepResult } from './types';
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
  '  flags                 dump the story flags',
  '  godhelp               this list',
  '  burninate             back to being a peasant',
].join('\n');

function prep(w: RuleWhen): string {
  return w.verb === 'give' ? 'to' : w.verb === 'use' ? 'on' : 'with';
}

function nounText(n: string | string[] | undefined): string {
  return Array.isArray(n) ? n.join('|') : (n ?? '');
}

/** The command a player would type to fire this rule, roughly. */
export function promptFor(r: Rule): string {
  const w = r.when;
  if (w.verb === 'go' && w.dir) return `go ${w.dir}`;
  const parts: string[] = [w.verb];
  if (w.nounMatches) parts.push(`<${w.nounMatches.source}>`);
  else if (w.noun) parts.push(nounText(w.noun));
  if (w.noun2) parts.push(prep(w), nounText(w.noun2));
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
  if (t.give?.length) bits.push(`gives ${t.give.join(',')}`);
  if (t.moveTo) bits.push(`→ ${t.moveTo}`);
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
    default:
      return null;
  }
}
