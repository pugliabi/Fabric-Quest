import type { GameState, Outcome, ParsedCommand } from './types';
import type { Item, Npc, World } from '../world/types';

export const MAX_SCORE = 200;

export type Handled = { state: GameState; output: string[]; outcome: Outcome; stepId?: string };

const clone = (s: GameState): GameState => ({ ...s, flags: { ...s.flags }, inventory: [...s.inventory], worn: [...s.worn] });

/** Items currently visible in the room (original items minus taken, plus dropped-here). */
export function roomItems(s: GameState, world: World): Item[] {
  const room = world.rooms[s.room]!;
  const here = room.items.filter((id) => !s.flags[`taken.${id}`] && !s.inventory.includes(id));
  const idx = roomIndex(s.room, world);
  const droppedHere = Object.entries(s.flags)
    .filter(([k, v]) => k.startsWith('droppedIn.') && v === idx)
    .map(([k]) => k.slice('droppedIn.'.length));
  const ids = [...new Set([...here, ...droppedHere])];
  return ids
    .map((id) => world.items[id])
    .filter((it): it is Item => !!it && (!it.visibleWhen || it.visibleWhen(s)));
}

/** Flags hold booleans/numbers only, so a room id is stored as its index. */
export function roomIndex(roomId: string, world: World): number {
  return Object.keys(world.rooms).indexOf(roomId);
}

export function roomNpcs(s: GameState, world: World): Npc[] {
  const room = world.rooms[s.room]!;
  return room.npcs.map((id) => world.npcs[id]).filter((n): n is Npc => !!n && !(n.hiddenWhen && n.hiddenWhen(s)));
}

function matchesName(noun: string, name: string, aliases: string[]): boolean {
  const n = noun.toLowerCase();
  const names = [name.toLowerCase(), ...aliases.map((a) => a.toLowerCase())];
  return names.some((x) => x === n || x.endsWith(' ' + n) || n.endsWith(' ' + x));
}

export type Resolved = { kind: 'item'; item: Item; where: 'room' | 'inventory' } | { kind: 'npc'; npc: Npc };

export function resolveNoun(s: GameState, world: World, noun: string | undefined): Resolved | null {
  if (!noun) return null;
  for (const item of roomItems(s, world)) if (matchesName(noun, item.name, item.aliases)) return { kind: 'item', item, where: 'room' };
  for (const id of s.inventory) {
    const item = world.items[id];
    if (item && matchesName(noun, item.name, item.aliases)) return { kind: 'item', item, where: 'inventory' };
  }
  for (const npc of roomNpcs(s, world)) if (matchesName(noun, npc.name, npc.aliases)) return { kind: 'npc', npc };
  return null;
}

export function describeRoom(s: GameState, world: World): string {
  const room = world.rooms[s.room]!;
  const parts = [room.name.toUpperCase(), room.describe(s)];
  const items = roomItems(s, world).filter((i) => i.takeable);
  if (items.length) parts.push(`You see: ${items.map((i) => i.name).join(', ')}.`);
  const npcs = roomNpcs(s, world);
  if (npcs.length) parts.push(`Here: ${npcs.map((n) => n.name).join(', ')}.`);
  const exits = Object.entries(room.exits)
    .filter(([, target]) => (typeof target === 'function' ? target(s) !== null : !!target))
    .map(([d]) => d);
  if (exits.length) parts.push(`Exits: ${exits.join(', ')}.`);
  return parts.join('\n');
}

const dontSee = (noun: string | undefined): string => (noun ? `You don't see any ${noun} here.` : 'Be more specific, peasant.');

export function handle(s: GameState, cmd: ParsedCommand, world: World): Handled | null {
  const room = world.rooms[s.room]!;
  switch (cmd.verb) {
    case 'unknown':
      return null;
    case 'go': {
      if (!cmd.dir) return { state: s, output: ['Go where?'], outcome: 'fail' };
      const target = room.exits[cmd.dir];
      const dest = typeof target === 'function' ? target(s) : target ?? null;
      if (!dest || !world.rooms[dest]) return { state: s, output: ["You can't go that way."], outcome: 'fail' };
      const next = { ...clone(s), room: dest };
      const out = [describeRoom(next, world)];
      const enter = world.rooms[dest]!.onEnter?.(next);
      if (enter) out.push(enter);
      return { state: next, output: out, outcome: 'move', stepId: dest };
    }
    case 'look': {
      if (!cmd.noun) return { state: s, output: [describeRoom(s, world)], outcome: 'meta' };
      const r = resolveNoun(s, world, cmd.noun);
      if (!r) return { state: s, output: [dontSee(cmd.noun)], outcome: 'snark' };
      const text = r.kind === 'item' ? (typeof r.item.describe === 'function' ? r.item.describe(s) : r.item.describe) : r.npc.describe(s);
      return { state: s, output: [text], outcome: 'success' };
    }
    case 'get': {
      const r = resolveNoun(s, world, cmd.noun);
      if (!r) return { state: s, output: [dontSee(cmd.noun)], outcome: 'snark' };
      if (r.kind === 'npc') return { state: s, output: [`${r.npc.name} would prefer you didn't.`], outcome: 'fail' };
      if (r.where === 'inventory') return { state: s, output: ['You already have that.'], outcome: 'fail' };
      if (!r.item.takeable) return { state: s, output: [r.item.untakeableText ?? "You can't take that."], outcome: 'fail' };
      const next = clone(s);
      next.inventory.push(r.item.id);
      next.flags[`taken.${r.item.id}`] = true;
      delete next.flags[`droppedIn.${r.item.id}`];
      return { state: next, output: [`Taken: ${r.item.name}.`], outcome: 'success' };
    }
    case 'drop': {
      const r = resolveNoun(s, world, cmd.noun);
      if (!r || r.kind !== 'item' || r.where !== 'inventory') return { state: s, output: ["You don't have that."], outcome: 'fail' };
      const next = clone(s);
      next.inventory = next.inventory.filter((i) => i !== r.item.id);
      next.worn = next.worn.filter((i) => i !== r.item.id);
      next.flags[`droppedIn.${r.item.id}`] = roomIndex(s.room, world);
      return { state: next, output: [`Dropped: ${r.item.name}.`], outcome: 'success' };
    }
    case 'inventory': {
      const names = s.inventory.map((i) => (world.items[i]?.name ?? i) + (s.worn.includes(i) ? ' (worn)' : ''));
      const line = names.length ? `You are carrying: ${names.join(', ')}.` : 'You are carrying nothing. Not even a license.';
      return { state: s, output: [line], outcome: 'meta' };
    }
    case 'wear': {
      const r = resolveNoun(s, world, cmd.noun);
      if (!r || r.kind !== 'item' || r.where !== 'inventory') return { state: s, output: ["You don't have that."], outcome: 'fail' };
      if (!r.item.wearable) return { state: s, output: [`You cannot wear the ${r.item.name}. You try anyway. No.`], outcome: 'fail' };
      if (s.worn.includes(r.item.id)) return { state: s, output: ['You are already wearing that.'], outcome: 'fail' };
      const next = clone(s);
      next.worn.push(r.item.id);
      return { state: next, output: [`You put on the ${r.item.name}.`], outcome: 'success' };
    }
    case 'score':
      return { state: s, output: [`Score : ${s.score} of ${MAX_SCORE}, in ${s.turns} turns.`], outcome: 'meta' };
    case 'help':
      return { state: s, output: [world.helpText], outcome: 'meta' };
    case 'save':
      return { state: s, output: ['Game saved.'], outcome: 'meta' };
    case 'restore':
      return { state: s, output: ['Restoring…'], outcome: 'meta' };
    case 'restart':
      return { state: s, output: ['Restarting…'], outcome: 'meta' };
    case 'quit':
      return { state: s, output: ['Quitting. The dragon wins this one — but your score can still make the Hall of Fame.'], outcome: 'meta' };
    case 'wait':
      return { state: s, output: ['Time passes.'], outcome: 'meta' };
    case 'talk': {
      const r = resolveNoun(s, world, cmd.noun);
      if (!r) return { state: s, output: [cmd.noun ? `There is no ${cmd.noun} here to talk to.` : 'Talk to whom?'], outcome: 'snark' };
      if (r.kind === 'item') return { state: s, output: [`You talk to the ${r.item.name}. It has nothing to add.`], outcome: 'fail' };
      return { state: s, output: [r.npc.talk(s)], outcome: 'success' };
    }
    case 'read': {
      const r = resolveNoun(s, world, cmd.noun);
      if (!r) return { state: s, output: [dontSee(cmd.noun)], outcome: 'snark' };
      if (r.kind === 'npc') return { state: s, output: [`You try to read ${r.npc.name}. ${r.npc.name} is not that kind of open.`], outcome: 'fail' };
      return { state: s, output: [typeof r.item.describe === 'function' ? r.item.describe(s) : r.item.describe], outcome: 'success' };
    }
    case 'use':
    case 'give':
    case 'open':
    case 'close':
    case 'drink':
    case 'attack':
    case 'board':
    case 'say': {
      if (cmd.verb === 'say') return { state: s, output: [cmd.noun ? `You say "${cmd.noun}." Nobody reacts. Somewhere a semantic model refreshes.` : 'Say what?'], outcome: 'fail' };
      if (cmd.verb === 'board') return { state: s, output: ['There is nothing to board here.'], outcome: 'fail' };
      const r = resolveNoun(s, world, cmd.noun);
      if (!r) return { state: s, output: [dontSee(cmd.noun)], outcome: 'snark' };
      if (cmd.verb === 'attack') return { state: s, output: [r.kind === 'npc' ? `${r.npc.name} is unimpressed by your violence.` : `You attack the ${r.item.name}. It does not respond. It is winning.`], outcome: 'fail' };
      if (cmd.verb === 'drink') return { state: s, output: ["You can't drink that."], outcome: 'fail' };
      if (cmd.verb === 'give') {
        if (!cmd.noun2) return { state: s, output: ['Give it to whom?'], outcome: 'fail' };
        const target = resolveNoun(s, world, cmd.noun2);
        if (!target) return { state: s, output: [dontSee(cmd.noun2)], outcome: 'snark' };
        if (target.kind === 'npc') return { state: s, output: [`${target.npc.name} doesn't want that.`], outcome: 'fail' };
        return { state: s, output: ["That's not someone you can give things to."], outcome: 'fail' };
      }
      return { state: s, output: ["That doesn't do anything here."], outcome: 'fail' };
    }
  }
}
