/**
 * The raw material for the two spoiler docs, generated from the world files.
 *   npx tsx scripts/cheat-sheet.ts --gameplay   the 200 in order (replayed through the engine: points per command,
 *                                               running total) plus the side-quest and bonus sequences, replayed too
 *   npx tsx scripts/cheat-sheet.ts --rooms      every room's inventory: rules (when.verb × nouns, points, needs, the
 *                                               line), the room/region phrase rules (regex source), items (look, get,
 *                                               again, blurb), NPCs (talk 1–4 and `ask about pickles`, through the
 *                                               engine from a fresh game placed in the room), `where`, exits
 * docs/cheat-sheet.md and docs/room-guide.md are the edited, readable versions. docs/ledger.md stays the points authority.
 */
import { ROOM_NEEDS } from './room-needs';
import { readFileSync } from 'node:fs';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { brushOffLine } from '../src/world/voice';
import { whereText } from '../src/world/where';
import { SACRISTY, SETTINGS } from '../src/world/sacristy';
import type { GameState } from '../src/engine/types';
import type { PhraseRule, Rule, RuleThen } from '../src/world/types';

const mode = process.argv[2] ?? '--rooms';
const flat = (t: string): string => t.replace(/\s*\n\s*/g, ' ').trim();
const safe = (f: () => string | undefined): string => { try { return flat(f() ?? ''); } catch { return '(depends on state)'; } };

// ---- --gameplay ----

type Row = { room: string; cmd: string; pts: number; bonus: number; total: number; bonusTotal: number; outcome: string };
function replay(path: string[], seed = 42): { rows: Row[]; s: GameState } {
  let s = newGame(WORLD, seed);
  const rows: Row[] = [];
  for (const cmd of path) {
    const room = WORLD.rooms[s.room]!.name;
    const r = step(s, cmd, WORLD);
    rows.push({ room, cmd, pts: r.state.score - s.score, bonus: r.state.bonus - s.bonus, total: r.state.score, bonusTotal: r.state.bonus, outcome: r.outcome });
    s = r.state;
  }
  return { rows, s };
}

function gameplay(): void {
  const golden = JSON.parse(readFileSync(new URL('../tests/golden-path.json', import.meta.url), 'utf8')) as string[];
  const { rows, s } = replay(golden);
  const out: string[] = ['## The 200 in order', '', '| # | Room | Command | Points | Total |', '|---|---|---|---|---|'];
  // The room is printed once per run of commands typed there (the grouping), bold, so the table reads by room.
  rows.forEach((r, i) => out.push(`| ${i + 1} | ${i && rows[i - 1]!.room === r.room ? '' : `**${r.room}**`} | \`${r.cmd}\` | ${r.pts ? `+${r.pts}` : ''} | ${r.pts ? r.total : ''} |`));
  out.push('', `Final: ${s.score} in ${s.turns} turns, won=${s.won}`);
  const seqs: Record<string, { at: string; path: string[] }> = {
    EXCEL: { at: 'wear hoodie', path: ['show me a table', 'ask jeff', 'n', 'use analyze in excel', 'sign in', 's', 'e', 'create pivot table', 'use sales region', 'use net sales', 'filter by year', 'w', 'show jeff'] },
    COPILOT: { at: 'wear hoodie', path: ['copilot', 'show me sales', 'total q4 2025 northeast net sales from the certified model, just the number'] },
    GOVERNANCE: { at: 'wear hoodie', path: ['talk to abbot', 'u', 'turn off xmla', 'turn on xmla', 'turn off publish to web', 'reset settings', 'd'] },
    STEPS: { at: 'say trial', path: ['source', 'navigate', 'promote headers', 'change type', 'filter rows', 'remove other columns', 'rename columns'] },
  };
  for (const [name, { at, path }] of Object.entries(seqs)) {
    const i = golden.indexOf(at) + (name === 'STEPS' ? 2 : 1);
    const { rows: all } = replay([...golden.slice(0, i), ...path]);
    out.push('', `## ${name} (inserted after golden #${i})`, '', '| Room | Command | Bonus | Bonus total | Outcome |', '|---|---|---|---|---|');
    for (const r of all.slice(i)) out.push(`| ${r.room} | \`${r.cmd}\` | ${r.bonus ? `+${r.bonus}` : ''} | ${r.bonusTotal} | ${r.outcome} |`);
  }
  console.log(out.join('\n'));
}

// ---- --rooms ----
// Written for a player, not a parser: one example command per rule (never a regex), conditions in plain words (never a
// flag), the narrator quoted when short and trimmed when not, grouped by what the player is trying to do.

const DIRS: Record<string, string> = { n: 'north', s: 'south', e: 'east', w: 'west', u: 'up', d: 'down', in: 'in', out: 'out' };
const words = (t: string): number => t.split(/\s+/).filter(Boolean).length;
/** The narrator's line in full when it is short (≤ 20 words); otherwise its leading sentences, trimmed to about 20 words. */
function short(t: string, max = 20): string {
  t = flat(t);
  if (words(t) <= max) return t;
  const sentences = t.match(/[^.!?]+[.!?]+['"’)]*\s*/g) ?? [t];
  let out = '';
  for (const x of sentences) { if (words(out + x) > max) break; out += x; }
  if (!out) {
    const ws = t.split(/\s+/).slice(0, max).join(' ');
    const k = Math.max(ws.lastIndexOf(', '), ws.lastIndexOf('; '), ws.lastIndexOf(': '), ws.lastIndexOf(' — '));
    out = `${(k > 15 ? ws.slice(0, k) : ws).replace(/[,;:—\s]+$/, '')}…`;
  }
  return out.trim();
}
const first = (n: string | string[] | undefined): string => (Array.isArray(n) ? n[0] ?? '' : n ?? '');

/** One command a person would type that the regex accepts: the first alternative of each group, optional parts dropped. */
function exampleOf(src: string): string | null {
  let i = 0;
  const seq = (): string => {
    let out = ''; let firstAlt: string | null = null;
    while (i < src.length && src[i] !== ')') {
      if (src[i] === '|') { if (firstAlt === null) firstAlt = out; out = ''; i++; continue; }
      out += atom();
    }
    return firstAlt ?? out;
  };
  const atom = (): string => {
    const c = src[i]!;
    let a: string;
    if (c === '(') {
      i++;
      let skip = false;
      if (src[i] === '?') { if (src[i + 1] === ':') i += 2; else { skip = true; i += src[i + 1] === '<' ? 3 : 2; } }
      const inner = seq(); i++;
      a = skip ? '' : inner;
    } else if (c === '[') {
      const j = src.indexOf(']', i + 1); const body = src.slice(i + 1, j); i = j + 1;
      a = body.startsWith('^') ? 'x' : body[0] === '\\' ? (body[1] === 's' ? ' ' : body[1] ?? '') : body[0] ?? '';
    } else if (c === '\\') {
      const n = src[i + 1]!; i += 2;
      a = n === 's' ? ' ' : n === 'b' || n === 'B' ? '' : n === 'd' ? '4' : n === 'w' ? 'x' : n;
    } else if (c === '^' || c === '$') { i++; a = ''; }
    else if (c === '.') { i++; a = '…'; }
    else { i++; a = c; }
    const q = src[i];
    if (q === '?' || q === '*') { i++; if (src[i] === '?') i++; return a === ' ' || a === '…' ? ' ' : ''; }
    if (q === '+') { i++; if (src[i] === '?') i++; return a; }
    if (q === '{') { const j = src.indexOf('}', i); const min = parseInt(src.slice(i + 1, j), 10) || 0; i = j + 1; return a.repeat(min); }
    return a;
  };
  const r = seq().replace(/\s+/g, ' ').trim();
  return !r || /[\\[\](){}|^$]/.test(r) || /x{2,}/.test(r) ? null : r.replace(/…+/g, '…');
}

/** A rule's command, as a player would type it. */
function commandOf(r: Rule): string | null {
  const w = r.when;
  if (w.verb === 'go') return w.dir ? DIRS[w.dir] ?? w.dir : null;
  const noun = w.nounMatches ? exampleOf(w.nounMatches.source) : first(w.noun);
  if (noun === null) return null;
  const verb = w.verbWord?.[0] ?? (w.verb === 'look' && noun ? 'look at' : w.verb === 'talk' ? 'talk to' : w.verb);
  const parts = [verb, noun];
  if (w.noun2Matches) {
    if (w.noun2Matches.source.startsWith('^(?!')) return null; // the brush-off; People covers it
    const n2 = exampleOf(w.noun2Matches.source); if (n2 === null) return null;
    parts.push(w.verb === 'give' ? 'to' : w.verb === 'use' ? 'on' : 'about', n2);
  } else if (w.noun2) parts.push(w.verb === 'give' ? 'to' : w.verb === 'use' ? 'on' : w.verb === 'talk' || w.verb === 'ask' ? 'about' : 'with', first(w.noun2));
  return parts.filter(Boolean).join(' ');
}

const itemName = (id: string): string => WORLD.items[id]?.name ?? id;
/** When a rule fires, in words, or '' when it does not matter to a player (staged counters, "not cursed" guards). */
const FLAG_WORDS: Record<string, string> = {
  'bridge.down': 'once the bridge is down', '!bridge.down': 'before the bridge is down', 'bridge.looked': 'after you have looked at the bridge',
  'dragon.gone': 'after the dragon is gone', 'curse.blank': 'while you are (Blank)', 'curse.column': 'while you are a calculated column',
  'excel.connected': 'once Excel is connected', '!excel.connected': 'before you connect', 'excel.pivot': 'once the pivot exists',
  'excel.dim': 'once the pivot has its rows', 'excel.measure': 'once the pivot has its values', 'excel.filter': 'once the pivot is filtered',
  'excel.jeff.asked': 'after Jeff has told you what he wants', 'sq.excel.done': "after you have finished Jeff's Excel",
  'ferry.online': 'once the ferry is online', '!ferry.online': 'before the ferry is online',
  'gate.open': 'once the gate is open', '!gate.open': 'before the gate opens', 'jeff.pacified': 'once Jeff has his mug',
  '!jeff.pacified': 'while Jeff still wants his mug', 'notebook.fixed': 'once the notebook is fixed', '!notebook.fixed': 'before the notebook is fixed',
  '!refresh.done': 'before the Big Refresh is fed', 'scroll.lent': 'once you have borrowed the scroll', '!scroll.lent': 'before you borrow the scroll',
  'shrine.open': 'once the Shrine is open', '!shrine.open': 'before the Shrine opens', 'stare.done': 'after you win the staring contest',
  '!stare.done': 'before you win the staring contest', 'trial.hoodie': 'once you wear the hoodie', 'trial.moat': 'once you smell like a Warehouse',
  '!trial.moat': 'before the Duke throws you in the moat', 'trial.key': 'once you have the standard key', 'model.m2m': 'after the many-to-many mistake',
  'seed.planted': 'once the seed is planted', 'pebble.skipped': 'after you skip the pebble', 'card.looked': 'after you have looked at the Card',
  'ts.xmla=false': 'while the XMLA endpoint is off', 'ts.fabricItems=false': 'while Fabric items are off', 'ts.workloads=false': 'while workloads are off',
  'ts.publishToWeb=false': 'once Publish to web is off', 'talk.jeff=7': 'on the eighth talk with nothing given', 'duke.wrong=3': 'on the third wrong answer',
  'card.stares=6': 'on the seventh stare', 'gov.errand': 'once the Abbot has given you the errand', 'has.credentials': 'once you have the credentials',
};
function when(r: Rule): string {
  const w = r.when;
  const bits = [
    ...(w.flags ?? []).map((c) => FLAG_WORDS[c.not ? `!${c.flag}` : c.is !== undefined ? `${c.flag}=${c.is}` : c.flag] ?? ''),
    ...(w.has ?? []).map((i) => `once you have the ${itemName(i)}`), ...(w.worn ?? []).map((i) => `while wearing the ${itemName(i)}`),
  ].filter(Boolean);
  return bits.length ? ` (${[...new Set(bits)].join(', ')})` : '';
}

type Line = { cmd: string; cond: string; text: string; points: number; bonus: number; death: boolean; curse: boolean; cure: boolean };
const setsCurse = (t: RuleThen | undefined, on: boolean): boolean => !!t?.set && Object.entries(t.set).some(([k, v]) => k.startsWith('curse.') && (on ? v === true : v === false));
const lineOfRule = (r: Rule, s: GameState): Line | null => {
  const cmd = commandOf(r);
  if (!cmd) return null;
  return { cmd, cond: when(r), text: ruleText(r, s), points: r.then.points ?? 0, bonus: r.then.bonus ?? 0, death: !!r.then.death,
    curse: setsCurse(r.then, true), cure: setsCurse(r.then, false) && !r.when.flags?.some((c) => c.flag.startsWith('curse.') && c.not) };
};
const ruleText = (r: Rule, s: GameState): string => safe(() => (typeof r.then.text === 'function' ? r.then.text(s, WORLD) : r.then.text));
function lineOfPhrase(p: PhraseRule, s: GameState): Line | null {
  const cmd = exampleOf(p.test.source);
  if (!cmd || cmd.includes('…')) return null;
  let then: RuleThen | undefined;
  let text: string;
  if (typeof p.then === 'function') {
    const got = (() => { try { return p.then(s, WORLD, cmd, { raw: cmd, command: cmd, kind: null } as never); } catch { return null; } })();
    if (!got) return null;
    then = got.then;
    text = safe(() => (typeof got.then.text === 'function' ? got.then.text(s, WORLD) : got.then.text));
  } else if (p.then) { then = p.then; text = safe(() => (typeof p.then!.text === 'function' ? (p.then!.text as (s: GameState, w: typeof WORLD) => string)(s, WORLD) : p.then!.text as string)); }
  else text = safe(() => (typeof p.text === 'function' ? p.text(s, WORLD) : p.text));
  if (p.dynamic === 'excel') text = `${text ? `${text} ` : ''}(This opens Jeff's Excel, a side quest.)`;
  if (p.dynamic === 'copilot') text = `${text ? `${text} ` : ''}(This opens Copilot, a side quest.)`;
  if (p.dynamic === 'exit') text = text || 'Leaves the side quest, back to where you came in.';
  if (!flat(text)) return null;
  return { cmd, cond: p.after ? ' (as an answer, right after the question)' : '', text, points: then?.points ?? 0, bonus: then?.bonus ?? 0, death: !!(p.death || then?.death), curse: setsCurse(then, true), cure: setsCurse(then, false) };
}
const say = (l: Line): string => `- \`${l.cmd}\`${l.cond} — ${short(l.text)}`;
const pts = (l: Line): string => (l.points ? ` **+${l.points}**` : l.bonus ? ` **+${l.bonus} bonus**` : '');
const probe = (room: string): GameState => ({ ...newGame(WORLD, 1), room });
const article = (name: string): string => (/^(The |My |Sheet1|PivotTable1)|'s /.test(name) ? name : `the ${name}`);

function exitsLine(room: (typeof WORLD.rooms)[string], s: GameState): string {
  const byDest = new Map<string, string[]>();
  const later: string[] = [];
  for (const [d, to] of Object.entries(room.exits)) {
    const dest = typeof to === 'function' ? (() => { try { return to(s); } catch { return null; } })() : to;
    if (!dest || !WORLD.rooms[dest]) { later.push(DIRS[d] ?? d); continue; }
    byDest.set(dest, [...(byDest.get(dest) ?? []), DIRS[d] ?? d]);
  }
  const parts = [...byDest].map(([dest, ds]) => `${ds[0]}${ds.length > 1 ? ` (or ${ds.slice(1).join(', ')})` : ''} to ${article(WORLD.rooms[dest]!.name)}`);
  if (later.length) parts.push(`${later.join(', ')} once the way opens`);
  return parts.length ? `Exits: ${parts.join('; ')}.` : 'No exits: you leave the way the room tells you to.';
}

/** Commands typed in each room on the way to 200, with what each scored (replayed through the engine). */
function goldenByRoom(): Map<string, { cmd: string; pts: number; text: string }[]> {
  const golden = JSON.parse(readFileSync(new URL('../tests/golden-path.json', import.meta.url), 'utf8')) as string[];
  let s = newGame(WORLD, 42);
  const by = new Map<string, { cmd: string; pts: number; text: string }[]>();
  for (const cmd of golden) {
    const room = s.room;
    const r = step(s, cmd, WORLD);
    const gained = r.state.score - s.score;
    if (!((DIRS[cmd] !== undefined || cmd === 'look') && !gained)) by.set(room, [...(by.get(room) ?? []), { cmd, pts: gained, text: r.output.join(' ') }]);
    s = r.state;
  }
  return by;
}

const REGION_NAME: Record<string, string> = {
  village: 'the village', lake: 'the OneLake', swamp: 'the marshes', monastery: 'the Monastery', fortress: 'the Keep', peaks: 'the Peaks',
  excel: "Jeff's Excel", copilot: 'Copilot',
};
const CAP = 15;

function renderLines(out: string[], lines: Line[], s: GameState, skip: Set<string>, cap = CAP, heading = 'Things to try'): void {
  const seen = new Set(skip);
  const uniq = lines.filter((l) => !seen.has(l.cmd) && (seen.add(l.cmd), true));
  const deaths = uniq.filter((l) => l.death);
  const curses = uniq.filter((l) => !l.death && (l.curse || l.cure));
  const rest = uniq.filter((l) => !l.death && !l.curse && !l.cure);
  const scored = rest.filter((l) => l.points || l.bonus);
  const tries = rest.filter((l) => !l.points && !l.bonus).sort((a, b) => (a.cond ? 1 : 0) - (b.cond ? 1 : 0));
  if (scored.length) { out.push('', '**Also scores:**', ''); for (const l of scored) out.push(`${say(l)}${pts(l)}`); }
  if (tries.length) {
    out.push('', `**${heading}:**`, '');
    for (const l of tries.slice(0, cap)) out.push(say(l));
    if (tries.length > cap) out.push(`- …and ${tries.length - cap} more.`);
  }
  if (deaths.length) { out.push('', '**Ways to die ☠:**', ''); for (const l of deaths) out.push(say(l)); }
  if (curses.length) { out.push('', '**Curses:**', ''); for (const l of curses) out.push(`${say(l)}${l.cure ? ' *(the cure)*' : ''}`); }
  void s;
}

function rooms(): void {
  const golden = goldenByRoom();
  const out: string[] = [
    '# The room guide',
    '',
    `All ${Object.keys(WORLD.rooms).length} rooms, and what each one answers to: what you need to do, the jokes worth typing, the ways to die,`,
    'and what everybody says. Spoilers everywhere. Points are in **bold**. [The cheat sheet](cheat-sheet.md) is the short',
    'version (what to type to win); [the ledger](ledger.md) keeps the score.',
    '',
    'Most commands have other wordings that work too; this guide shows one.',
  ];
  const regionsDone = new Set<string>();
  for (const room of Object.values(WORLD.rooms)) {
    const s = probe(room.id);
    if (!regionsDone.has(room.region)) {
      regionsDone.add(room.region);
      const regional = WORLD.phraseRules.filter((p) => !p.room && p.region === room.region).map((p) => lineOfPhrase(p, s)).filter((l): l is Line => !!l);
      if (regional.length) { out.push('', `## Anywhere in ${REGION_NAME[room.region] ?? room.region}`, '', `These work in every room of ${REGION_NAME[room.region] ?? room.region}.`); renderLines(out, regional, s, new Set()); }
    }
    out.push('', `## ${room.name}`, '', `${safe(() => whereText(s, room.id))} ${exitsLine(room, s)}`);
    // Goal and hint first (Tommy: "the goal and hint, then the rules, then items, then the phrases at the end").
    { const need = ROOM_NEEDS[room.name]; if (need) out.push('', `**Goal:** ${need.replace(/ Type: .*$/, '')}`); }
    out.push('', `**Hint:** ${safe(() => room.flaskHint(s))}`);
    const todo = golden.get(room.id) ?? [];
    if (todo.length) { out.push('', '**The way to 200 here:**', ''); for (const t of todo) out.push(`- \`${t.cmd}\` — ${short(t.text)}${t.pts ? ` **+${t.pts}**` : ''}`); }
    // Rules and phrases, split per item: an item's block lists what it does and every action you can take on it
    // (Tommy: "the item, what it does, then the phrases you can use, and the actions on it"); the rest stay general.
    const ruleLines = room.rules.filter((r) => !(r.when.verb === 'talk' && room.npcs.length)).map((r) => lineOfRule(r, s)).filter((l): l is Line => !!l);
    const phraseLines = WORLD.phraseRules.filter((p) => p.room === room.id).map((p) => lineOfPhrase(p, s)).filter((l): l is Line => !!l);
    const wordsOf = (id: string) => { const it = WORLD.items[id]!; return [it.name, ...it.aliases].map((w) => w.toLowerCase()); };
    const mentions = (l: Line, words: string[]) => words.some((w) => new RegExp(`(^|\\s)${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`).test(l.cmd.toLowerCase()));
    const itemLines = new Map<string, Line[]>();
    const claimed = new Set<string>();
    for (const id of room.items) {
      const ws = wordsOf(id);
      const mine = [...ruleLines, ...phraseLines].filter((l) => !claimed.has(l.cmd) && mentions(l, ws));
      for (const l of mine) claimed.add(l.cmd);
      itemLines.set(id, mine);
    }
    const generalRules = ruleLines.filter((l) => !claimed.has(l.cmd));
    const generalPhrases = phraseLines.filter((l) => !claimed.has(l.cmd));
    renderLines(out, generalRules, s, new Set(todo.map((t) => t.cmd)), 999, 'Rules — what this room answers to');
    // Items: what it does, then every action on it.
    if (room.id === SACRISTY) {
      out.push('', '**The books** (`read <book>` for the long version; `turn on <book>` / `turn off <book>` to flip one):', '');
      for (const b of SETTINGS) out.push(`- *${b.title}* (${b.shelf === 'tenant' ? 'tenant setting' : 'capacity'}) — ${short(b.effect, 30)}`);
    } else if (room.items.length) {
      out.push('', '**Items:**', '');
      for (const id of room.items) {
        const it = WORLD.items[id]!;
        if (it.visibleWhen && !safe(() => it.visibleWhen!(s))) continue; // not here at the start (the flood's Jeffs, the Eventhouse)
        const d = safe(() => (typeof it.describe === 'function' ? it.describe(s) : it.describe));
        out.push(`- **${it.name}**${it.takeable ? ' (you can take it)' : ''} — ${short(d, 30)}`);
        if (it.takeable) {
          const got = step(s, `get ${it.name}`, WORLD);
          out.push(`  - \`get ${it.name}\` — ${short(got.output[0] ?? '', 20)}`);
          if (it.again) out.push(`  - \`get ${it.name}\` again — ${short(typeof it.again === 'function' ? safe(() => (it.again as (s: GameState) => string)(got.state)) : it.again, 24)}`);
        }
        for (const l of itemLines.get(id) ?? []) out.push(`  ${say(l).replace(/^- /, '- ')}${pts(l)}${l.death ? ' ☠' : ''}`);
      }
    }
    // People.
    if (room.npcs.length) {
      out.push('', '**People:**');
      for (const id of room.npcs) {
        const n = WORLD.npcs[id]!;
        const alias = n.aliases[0] ?? n.id;
        out.push('', `*${n.name}* (\`talk to ${alias}\`, again and again):`, '');
        let st = probe(room.id);
        const said = new Set<string>();
        for (let k = 1; k <= 4; k++) {
          const r = step(st, `talk to ${alias}`, WORLD); st = r.state;
          const line = short(r.output.join(' '), 30);
          if (!said.has(line)) { said.add(line); out.push(`${k}. ${line}`); }
        }
        out.push('', `Ask about anything else: ${short(safe(() => brushOffLine(s, n.brushOff)), 30)}`);
      }
    }
    // Phrases last: whole sentences the room understands that aren't about one item.
    renderLines(out, generalPhrases, s, new Set([...todo.map((t) => t.cmd), ...generalRules.map((l) => l.cmd)]), 999, 'Phrases — other things you can say here');
  }
  // Anywhere: the global commands, through the engine from the start of a fresh game.
  const s = probe(WORLD.start);
  out.push('', '## Anywhere', '', 'These work in every room. The replies shown are from the start of the game; most of them change as you go.', '');
  for (const cmd of ['hint', 'get ye flask', 'goal', 'where', 'why', 'inventory', 'dance', 'sing', 'xyzzy', 'cheat', 'die']) {
    out.push(`- \`${cmd}\` — ${short(step(probe(WORLD.start), cmd, WORLD).output.join(' '), 30)}`);
  }
  const globals = [...WORLD.globalRules.map((r) => lineOfRule(r, s)), ...WORLD.phraseRules.filter((p) => !p.room && !p.region).map((p) => lineOfPhrase(p, s))].filter((l): l is Line => !!l);
  renderLines(out, globals, s, new Set(['hint', 'get ye flask', 'goal', 'where', 'why', 'inventory', 'dance', 'sing', 'xyzzy', 'cheat', 'die']), 30);
  out.push('', '**God mode:** type `burninate`. Then `godhelp` lists everything; `warp <room>` takes you anywhere, `summon <item>` puts',
    'anything in your pocket, `locate <thing>` finds anything, `prompts` lists what the room you are in answers to, `settings`',
    'and `set <setting> on|off` flip the Sacristy books from afar, `flags` shows the game state. `burninate` again turns it off.');
  console.log(out.join('\n'));
}

if (mode === '--gameplay') gameplay(); else rooms();
