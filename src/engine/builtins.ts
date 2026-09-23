import type { Dir, GameState, Outcome, ParsedCommand } from './types';
import type { Item, Npc, Rule, World } from '../world/types';
import { SIDE_REALM_NAME, SIDE_REGIONS } from '../world/types';
import { brushOffLine, nick, rotate } from '../world/voice';
import { BLANK_LOOKS_THROUGH, curseOf } from '../world/curses';
import { vary } from './quirks';

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

export function roomFromIndex(i: number, world: World): string | undefined {
  return Object.keys(world.rooms)[i];
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
/** The noun is one of the thing's names, whole ("personal key"), not merely its last word ("key"). */
function isNamed(noun: string, name: string, aliases: string[]): boolean {
  const n = noun.toLowerCase();
  return name.toLowerCase() === n || aliases.some((a) => a.toLowerCase() === n);
}

export type Resolved = { kind: 'item'; item: Item; where: 'room' | 'inventory' } | { kind: 'npc'; npc: Npc };

/**
 * The thing a noun means here: room items, then what you carry, then the people. Two passes (F3 fix round 1): a
 * thing named in full first, then a thing the noun merely ends the same way as, room before pocket in each. So on the
 * Isle of Gateway, holding the PERSONAL key, `get personal key` is that key's remembered line and not a second take of
 * the STANDARD one through the builtin (which skipped its rule and the +20 for good). A room thing named in full
 * still wins over a carried thing named in full: the Studio's wall note over the one from your desk.
 */
export function resolveNoun(s: GameState, world: World, noun: string | undefined): Resolved | null {
  if (!noun) return null;
  const here = roomItems(s, world);
  const carried = s.inventory.map((id) => world.items[id]).filter((it): it is Item => !!it);
  for (const item of here) if (isNamed(noun, item.name, item.aliases)) return { kind: 'item', item, where: 'room' };
  for (const item of carried) if (isNamed(noun, item.name, item.aliases)) return { kind: 'item', item, where: 'inventory' };
  for (const item of here) if (matchesName(noun, item.name, item.aliases)) return { kind: 'item', item, where: 'room' };
  for (const item of carried) if (matchesName(noun, item.name, item.aliases)) return { kind: 'item', item, where: 'inventory' };
  for (const npc of roomNpcs(s, world)) if (matchesName(noun, npc.name, npc.aliases)) return { kind: 'npc', npc };
  return null;
}

/** The NPC here that `noun` names, if any. `talk` looks for people before things: "card" in the Report Studio is the Card visual, not the license card in your pocket. */
export function resolveNpc(s: GameState, world: World, noun: string | undefined): Npc | null {
  if (!noun) return null;
  return roomNpcs(s, world).find((npc) => matchesName(noun, npc.name, npc.aliases)) ?? null;
}

export function describeRoom(s: GameState, world: World): string {
  const room = world.rooms[s.room]!;
  const parts = [room.name.toUpperCase(), room.describe(s)];
  // Everything you can look at or use is listed, not just what you can pocket (Tommy: objects you can act on must show up).
  const all = roomItems(s, world);
  const items = [...all.filter((i) => i.takeable), ...all.filter((i) => !i.takeable)];
  if (items.length) parts.push(`You see: ${items.map((i) => i.name).join(', ')}.`);
  const npcs = roomNpcs(s, world);
  if (npcs.length) parts.push(`Here: ${npcs.map((n) => n.name).join(', ')}.`);
  const exits = Object.entries(room.exits)
    .filter(([, target]) => (typeof target === 'function' ? target(s) !== null : !!target))
    .map(([d]) => d);
  // A side room's `out` resolves to null (the engine returns you to where you came from), so it is named here instead.
  if (SIDE_REGIONS.has(room.region) && 'out' in room.exits) exits.push('exit (back to the realm)');
  if (exits.length) parts.push(`Exits: ${exits.join(', ')}.`);
  return parts.join('\n');
}

const escapeRe = (t: string): string => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** A whole-word match on any of these words or phrases. */
export const topicPattern = (words: readonly string[]): RegExp => new RegExp(`\\b(?:${words.map(escapeRe).join('|')})\\b`, 'i');
/** The opposite: a topic that names none of them (for a talk rule that should claim only unknown topics). */
export const unknownTopicPattern = (words: readonly string[]): RegExp => new RegExp(`^(?!.*\\b(?:${words.map(escapeRe).join('|')})\\b)`, 'i');

/** Whether `ask <npc> about <topic>` names something on the NPC's list (Npc.knows). */
export function knowsTopic(npc: Npc, topic: string): boolean {
  return !!npc.knows?.length && topicPattern(npc.knows).test(topic);
}

/** The escalation line for talk `n` (2 and up): Npc.talkMore, or the engine default (the same thing slower, then the room's flask hint). */
function talkMore(s: GameState, world: World, npc: Npc, n: number): string {
  if (npc.talkMore) return npc.talkMore(s, n);
  return n === 2 ? `${npc.name} says the same thing, slower. ${npc.talk(s)}` : `${npc.name}, slower still: '${world.rooms[s.room]!.flaskHint(s)}'`;
}

/**
 * The NPC's line for this talk: line 1, then the escalation (Npc.talkMore, or the engine default). With an `about`
 * `topic`: something the NPC knows gets their hint (the talk-3 line); anything else gets the brush-off (spec1 §3.1).
 * While you are (Blank) (spec1 §5.4, world/curses.ts) nobody sees you: every NPC looks through you instead.
 */
export function talkTo(s: GameState, world: World, npc: Npc, topic?: string): string {
  if (curseOf(s) === 'blank') return BLANK_LOOKS_THROUGH(npc.name);
  if (topic) return knowsTopic(npc, topic) ? talkMore(s, world, npc, 3) : brushOffLine(s, npc.brushOff) ?? `${npc.name} has nothing to say about ${topic}.`;
  const n = (Number(s.flags[`talk.${npc.id}`]) || 0) + 1;
  return n === 1 ? npc.talk(s) : talkMore(s, world, npc, n);
}

// ---- Grammar for the generic lines: the player's noun, and an item's name, with the right article ----

/** Names that end in s but are one thing. Everything else ending in s (not ss) reads as a plural. */
const SINGULAR_S = new Set(['canvas', 'glass', 'bass', 'mess', 'moss', 'grass', 'boss']);
/** Whether a lowercase noun phrase reads as a plural ("keys", "portraits", but not "canvas"). */
export const plural = (n: string): boolean => /s$/.test(n) && !/ss$/.test(n) && !SINGULAR_S.has(n);
/** "a"/"an" by first letter (good enough: no item or typed noun here starts with a silent h or a "u" that says "you"). */
const an = (n: string): string => (/^[aeiou]/i.test(n) ? 'an' : 'a');
/** The player's noun with an article, for the unknown-noun lines: "a sword", "an apple". A plural gets none. */
const aNoun = (n: string): string => (plural(n) ? n : `${an(n)} ${n}`);

/**
 * An item's name as the thing it is, for the echo's punchline: "a door", "an update dialog", "the Applied Steps",
 * "the Big Refresh", "Custom1" (a proper name with a number takes no article), "portraits" (a plural).
 */
export function named(item: Item): string {
  const n = item.name;
  if (/^the /i.test(n)) return n;
  if (/\d$/.test(n)) return n;
  if (/^[A-Z]/.test(n)) return `the ${n}`;
  return plural(n) ? n : `${an(n)} ${n}`;
}
/** "It's a door." / "They're portraits." */
const itIs = (item: Item): string => (plural(item.name) && !/^[A-Z]/.test(item.name) ? `They're ${named(item)}.` : `It's ${named(item)}.`);
/** The echo line starts with this; the message box skips it (game/notice.ts) so the picture shows the description. */
export const ECHO_PREFIX = 'Listen to you. "';

/** The unknown-noun pool. tests/keep-examinables.test.ts keeps a regex over these (DONT_SEE): a new line here needs a new alternative there. */
const dontSee = (s: GameState, noun: string | undefined): string => (noun
  ? vary(s, [
    `You don't see any ${noun} here.`,
    `No ${noun} here. Not even a placeholder.`,
    `There is no ${noun} in this room. There may be one in a room you haven't found. There may not.`,
    `${noun}? The realm checks under the rug. Nothing.`,
    `You look for ${aNoun(noun)}. The room has not been told about ${aNoun(noun)}.`,
    // The voice pass (spec1 §5.2): the walkthrough, the art budget, the browser window.
    `${aNoun(noun).replace(/^./, (c) => c.toUpperCase())}? In this room? You misread the ledger, guy.`,
    `Yeah, there's no ${noun}. We didn't animate ${plural(noun) ? 'any' : 'one'}. You don't see me typing 'get browser window.'`,
    plural(noun)
      ? `No ${noun}. There've never been ${noun}. You're thinking of a different game with a bigger art budget.`
      : `No ${noun}. There's never been ${aNoun(noun)}. You're thinking of a different game with a bigger art budget.`,
  ])
  : 'Be more specific, peasant.');

const DIR_NAME: Record<Dir, string> = { n: 'North', s: 'South', e: 'East', w: 'West', u: 'Up', d: 'Down', out: 'Out', in: 'In' };

/**
 * `use` / `open` and friends on something that is here and does nothing: the shared shrug. A bare `use X` (no second
 * noun) also gets asked what it meant to use it on; a `use X on Y` or an `open X` named its target, so it never does.
 */
const NOTHING_HAPPENS = (s: GameState, bareUse: boolean): string => vary(s, [
  "That doesn't do anything here.",
  'You try it. The realm shrugs, in Delta format.',
  "Nothing happens. A pipeline somewhere logs 'Succeeded' anyway.",
  'It does not do anything. It was not going to. You had to check.',
  ...(bareUse ? ['On what? Discuss.', 'Like where?'] : []),
]);

/**
 * The prop for "The candle? The candle has no budget.": the candle where there is one, else the first thing here that
 * isn't going anywhere, else the wall. Lowercased and without its leading "the", so it sits after "The".
 */
function budgetLine(s: GameState, world: World): string {
  const here = roomItems(s, world).filter((i) => !i.takeable);
  const prop = here.find((i) => i.id === 'candle') ?? here[0];
  const name = prop ? prop.name.replace(/^the /i, '') : 'wall';
  const shown = /^[A-Z]/.test(name) ? name : name.toLowerCase();
  return `To whom? The ${shown}? The ${shown} ${plural(name) && !/^[A-Z]/.test(name) ? 'have' : 'has'} no budget.`;
}

/** Whether a rule's `then` changes anything (points, bonus, flags, items, a move, a death): the mark of a puzzle, not texture. */
const hasEffect = (t: Rule['then']): boolean =>
  !!(t.points || t.bonus || t.set || t.give || t.remove || t.wear || t.moveTo || t.returnTo || t.death || t.win || t.box);
const namesOf = (item: Item): string[] => [item.name.toLowerCase(), ...item.aliases.map((a) => a.toLowerCase())];
const listed = (n: string | string[] | undefined): string[] => (n === undefined ? [] : Array.isArray(n) ? n : [n]);
/**
 * Pure scenery (spec1 §5.2, the "making up puzzles" count): an untakeable item that nothing in this room can do anything
 * with. Not scenery when a rule with an effect (here or global) names it, when a room-scoped phrase with effects answers
 * to its name (the hall's step commands, the gates), or when the room's flask hint names it right now (the hall while
 * the query is broken names the steps). A poke that only talks back (`use candle`) leaves it scenery.
 */
export function isScenery(s: GameState, world: World, item: Item): boolean {
  if (item.takeable) return false;
  const room = world.rooms[s.room]!;
  const names = namesOf(item);
  const byRule = [...room.rules, ...world.globalRules].some((r) => hasEffect(r.then) && [...listed(r.when.noun), ...listed(r.when.noun2)].some((n) => names.includes(n.toLowerCase())));
  if (byRule) return false;
  const forms = names.flatMap((n) => [n, `open ${n}`, `use ${n}`, `push ${n}`, `try ${n}`]);
  const byPhrase = world.phraseRules.some((p) => p.room === s.room && !!p.then && forms.some((f) => p.test.test(f)));
  if (byPhrase) return false;
  const hint = room.flaskHint(s).toLowerCase();
  const byHint = names.some((n) => n.length >= 3 && new RegExp(`\\b${escapeRe(n)}\\b`).test(hint));
  return !byHint;
}

export function handle(s: GameState, cmd: ParsedCommand, world: World): Handled | null {
  const room = world.rooms[s.room]!;
  switch (cmd.verb) {
    case 'unknown':
      return null;
    case 'go': {
      if (!cmd.dir) return { state: s, output: ['Go where?'], outcome: 'fail' };
      if (cmd.dir === 'out' && SIDE_REGIONS.has(room.region)) return null; // the sq.exit.words phrase owns leaving a realm
      const target = room.exits[cmd.dir];
      const dest = typeof target === 'function' ? target(s) : target ?? null;
      if (!dest || !world.rooms[dest]) {
        return { state: s, output: [vary(s, [
          "You can't go that way.",
          'There is no exit that way. There is a wall, doing its job.',
          'That direction is not in the schema.',
          'You walk into the edge of the map. The map apologizes.',
          `${DIR_NAME[cmd.dir]} is a wall. It's been a wall since the migration.`,
          'Naw. Wall.',
        ])], outcome: 'fail' };
      }
      const next = { ...clone(s), room: dest };
      const out = [describeRoom(next, world)];
      const enter = world.rooms[dest]!.onEnter?.(next);
      if (enter) out.push(enter);
      return { state: next, output: out, outcome: 'move', stepId: dest };
    }
    case 'look': {
      if (!cmd.noun) return { state: s, output: [describeRoom(s, world)], outcome: 'meta' };
      const r = resolveNoun(s, world, cmd.noun);
      if (!r) return { state: s, output: [dontSee(s, cmd.noun)], outcome: 'snark' };
      const text = r.kind === 'item' ? (typeof r.item.describe === 'function' ? r.item.describe(s) : r.item.describe) : r.npc.describe(s);
      // Echo-your-words (spec1 §5.2): a three-word-or-longer noun phrase that is not one of the thing's own names
      // ("look at the big ugly brown door") is read back before the answer. People are spared; so are exact aliases.
      const words = cmd.noun.split(' ');
      const exact = r.kind === 'item' ? namesOf(r.item).includes(cmd.noun) : true;
      const quoted = cmd.raw.trim().replace(/[?!.]+$/, '');
      const echo = words.length >= 3 && !exact && r.kind === 'item' ? [`${ECHO_PREFIX}${quoted}." What kinda gaming is that? ${itIs(r.item)}`] : [];
      return { state: s, output: [...echo, text], outcome: 'success' };
    }
    case 'get': {
      const r = resolveNoun(s, world, cmd.noun);
      if (!r) return { state: s, output: [dontSee(s, cmd.noun)], outcome: 'snark' };
      if (r.kind === 'npc') return { state: s, output: [`${r.npc.name} would prefer you didn't.`], outcome: 'fail' };
      // Already carried: the item's own remembered line first (spec1 §5.2, every gettable item has one); the pool is for
      // anything that has not been given one (fixture worlds, a summoned bit of scenery).
      if (r.where === 'inventory') {
        const again = typeof r.item.again === 'function' ? r.item.again(s) : r.item.again;
        return { state: s, output: [again ?? vary(s, ['You already have that.', "It's in your inventory. It has been the whole time.", 'You pat your pocket. Still there.', 'You pick it up again, from yourself. Nothing changes hands.', `You already got it, ${nick(s)}. We all saw.`])], outcome: 'fail' };
      }
      if (!r.item.takeable) return { state: s, output: [r.item.untakeableText ?? "You can't take that."], outcome: 'fail' };
      const next = clone(s);
      next.inventory.push(r.item.id);
      next.flags[`taken.${r.item.id}`] = true;
      delete next.flags[`droppedIn.${r.item.id}`];
      const n = r.item.name;
      return { state: next, output: [vary(s, [
        `You take the ${n}. Nobody stops you. Nobody was going to.`,
        `Yeah! Get that ${n}!`,
        `You pocket the ${n}. It's yours now, the way things are yours when nobody else wanted them.`,
        `${n.charAt(0).toUpperCase() + n.slice(1)}: acquired. Your inventory grows. Your prospects don't.`,
        `You grab the ${n} like someone who read the ledger and is pretending they didn't.`,
      ])], outcome: 'success' };
    }
    case 'drop': {
      const r = resolveNoun(s, world, cmd.noun);
      if (!r || r.kind !== 'item' || r.where !== 'inventory') return { state: s, output: [vary(s, ["You don't have that.", "You can't drop what you don't carry. This is also true of grudges.", 'You mime dropping it. The realm mimes not caring.'])], outcome: 'fail' };
      const next = clone(s);
      next.inventory = next.inventory.filter((i) => i !== r.item.id);
      next.worn = next.worn.filter((i) => i !== r.item.id);
      next.flags[`droppedIn.${r.item.id}`] = roomIndex(s.room, world);
      return { state: next, output: [`Dropped: ${r.item.name}.`], outcome: 'success' };
    }
    case 'inventory': {
      const names = s.inventory.map((i) => (world.items[i]?.name ?? i) + (s.worn.includes(i) ? ' (worn)' : ''));
      const line = names.length ? `You are carrying: ${names.join(', ')}.` : 'You are carrying nothing. Not even a license.';
      // The second humor surface (spec1 §5.2): one blurb line per carried thing, under the list, in list order.
      const blurbs = s.inventory.flatMap((id, i) => (world.items[id]?.blurb ? [`  ${names[i]}: ${world.items[id]!.blurb}`] : []));
      return { state: s, output: [line, ...blurbs], outcome: 'meta' };
    }
    case 'wear': {
      const r = resolveNoun(s, world, cmd.noun);
      if (!r || r.kind !== 'item' || r.where !== 'inventory') return { state: s, output: [vary(s, ["You don't have that.", "You'd need to be holding it first. Fashion has rules.", 'You are not carrying that. You are barely carrying yourself.'])], outcome: 'fail' };
      if (!r.item.wearable) return { state: s, output: [`You cannot wear the ${r.item.name}. You try anyway. No.`], outcome: 'fail' };
      if (s.worn.includes(r.item.id)) return { state: s, output: [`You're already wearing it. Too bad you still smell like ${s.flags['trial.moat'] ? 'a Warehouse' : 'a Pro license'} under it.`], outcome: 'fail' };
      const next = clone(s);
      next.worn.push(r.item.id);
      return { state: next, output: [`You put on the ${r.item.name}.`], outcome: 'success' };
    }
    case 'score': {
      const line = `Score : ${s.score} of ${MAX_SCORE}${s.bonus > 0 ? ` (+${s.bonus} bonus)` : ''}, in ${s.turns} turns.`;
      // rotate, not vary: two `score`s in a row get two different asides.
      return { state: s, output: [line, rotate(s, ['The Miller has seen worse. Not many.', 'Somewhere, a Hall of Fame shrugs.', 'Turns count. Jeff counts them.'])], outcome: 'meta' };
    }
    case 'help': {
      const realm = SIDE_REALM_NAME[room.region];
      const okay = `Okay, ${nick(s)}.`;
      return { state: s, output: realm ? [okay, world.helpText, `Type EXIT to leave ${realm}; you return where you were. GOAL repeats the objective; GET YE FLASK says the next step.`] : [okay, world.helpText], outcome: 'meta' };
    }
    case 'save':
      return { state: s, output: ["Saved. To your browser. Not to OneLake, so don't get cute."], outcome: 'meta' };
    case 'restore':
      return { state: s, output: ['Restoring. Pretend the last four minutes were a refresh.'], outcome: 'meta' };
    case 'restart':
      return { state: s, output: [`Restarting. You had ${s.score} points. You'll get them back. Probably.`], outcome: 'meta' };
    case 'quit':
      return { state: s, output: [`Well fine, ${nick(s)}. Hope you posted your score, cause it is OVER between us.`], outcome: 'meta' };
    case 'wait':
      return { state: s, output: [(s.recent?.n ?? 1) >= 2 ? "Still waiting. You're getting a pretty sweet workout for your patience muscles." : 'Time passes. So does the refresh window.'], outcome: 'meta' };
    case 'talk': {
      const npc = resolveNpc(s, world, cmd.noun);
      if (npc) return { state: s, output: [talkTo(s, world, npc, cmd.noun2)], outcome: 'success' };
      // No NPC answers to that name here, so whatever resolveNoun finds is a thing, not a person.
      const r = resolveNoun(s, world, cmd.noun);
      if (!r || r.kind !== 'item') {
        const nobody = cmd.noun
          ? vary(s, [
            `There is no ${cmd.noun} here to talk to.`,
            "It's sad when you have to make up people to talk to.",
            `There's no ${cmd.noun} here. There's you, and there's me, and I'm not talking to you either.`,
          ])
          : 'Talk to whom?';
        return { state: s, output: [nobody], outcome: 'snark' };
      }
      return { state: s, output: [vary(s, [`You talk to the ${r.item.name}. It has nothing to add.`, `The ${r.item.name} listens politely. It has no relationship to you, so it cannot respond.`, `You address the ${r.item.name}. It is a ${r.item.name}. Conversation stalls.`])], outcome: 'fail' };
    }
    case 'read': {
      const r = resolveNoun(s, world, cmd.noun);
      if (!r) return { state: s, output: [dontSee(s, cmd.noun)], outcome: 'snark' };
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
      if (cmd.verb === 'say') return { state: s, output: [cmd.noun ? vary(s, [`You say "${cmd.noun}." Nobody reacts. Somewhere a semantic model refreshes.`, `"${cmd.noun}," you announce. The nearest listener pretends to check a notification.`, `You say "${cmd.noun}." It is not the password to anything here.`, `"${cmd.noun}." The realm writes it down, in case it matters later. It does not.`]) : 'Say what?'], outcome: 'fail' };
      if (cmd.verb === 'board') return { state: s, output: [vary(s, ['There is nothing to board here.', 'You board nothing. Nothing departs on schedule.', 'No vessel. You stand very still, which is similar.'])], outcome: 'fail' };
      const r = resolveNoun(s, world, cmd.noun);
      if (!r) return { state: s, output: [dontSee(s, cmd.noun)], outcome: 'snark' };
      if (cmd.verb === 'close') return { state: s, output: [`A riddle: what can be closed that is already closed? (Hint: not this ${r.kind === 'item' ? r.item.name : r.npc.name}.)`], outcome: 'fail' };
      if (cmd.verb === 'attack') return { state: s, output: [r.kind === 'npc' ? `${r.npc.name} is unimpressed by your violence.` : `You attack the ${r.item.name}. It does not respond. It is winning.`], outcome: 'fail' };
      if (cmd.verb === 'drink') return { state: s, output: [vary(s, ["You can't drink that.", 'It is not a beverage. It is barely a noun.', `You consider drinking the ${r.kind === 'item' ? r.item.name : r.npc.name}. You reconsider. Good.`])], outcome: 'fail' };
      if (cmd.verb === 'give') {
        if (!cmd.noun2) return { state: s, output: [vary(s, ['Give it to whom?', budgetLine(s, world), 'Give it to whom? Discuss.'])], outcome: 'fail' };
        const target = resolveNoun(s, world, cmd.noun2);
        if (!target) return { state: s, output: [dontSee(s, cmd.noun2)], outcome: 'snark' };
        if (target.kind === 'npc') return { state: s, output: [vary(s, [`${target.npc.name} doesn't want that.`, `${target.npc.name} looks at it, then at you, then politely away.`, `${target.npc.name} declines. In writing.`, `${target.npc.name}: "Is that… for me? No. No thank you."`])], outcome: 'fail' };
        return { state: s, output: ["That's not someone you can give things to."], outcome: 'fail' };
      }
      return { state: s, output: [NOTHING_HAPPENS(s, cmd.verb === 'use' && !cmd.noun2)], outcome: 'fail' };
    }
  }
}
