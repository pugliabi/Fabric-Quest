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
import { readFileSync } from 'node:fs';
import { newGame, step } from '../src/engine/step';
import { promptFor } from '../src/engine/god';
import { WORLD } from '../src/world';
import { brushOffLine } from '../src/world/voice';
import { whereText } from '../src/world/where';
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

const needs = (r: Rule): string => {
  const w = r.when;
  const bits = [
    ...(w.flags ?? []).map((c) => (c.not ? `!${c.flag}` : c.is !== undefined ? `${c.flag}=${c.is}` : c.flag)),
    ...(w.has ?? []).map((i) => `has:${i}`), ...(w.notHas ?? []).map((i) => `not:${i}`), ...(w.worn ?? []).map((i) => `wearing:${i}`),
  ];
  return bits.length ? ` [needs ${bits.join(', ')}]` : '';
};
const effect = (t: RuleThen): string => {
  const bits: string[] = [];
  if (t.points) bits.push(`+${t.points}`);
  if (t.bonus) bits.push(`+${t.bonus} bonus`);
  if (t.give?.length) bits.push(`gives ${t.give.join(',')}`);
  if (t.moveTo) bits.push(`→ ${t.moveTo}`);
  if (t.returnTo) bits.push('→ back');
  if (t.death) bits.push('☠');
  if (t.win) bits.push('WIN');
  if (t.set && Object.keys(t.set).some((k) => k.startsWith('curse.'))) bits.push('CURSE');
  return bits.length ? ` (${bits.join(' ')})` : '';
};
const ruleText = (r: Rule, s: GameState): string => safe(() => (typeof r.then.text === 'function' ? r.then.text(s, WORLD) : r.then.text));
const phraseLine = (p: PhraseRule, s: GameState): string => {
  const th = p.then && typeof p.then !== 'function' ? effect(p.then) : '';
  const text = p.then ? (typeof p.then === 'function' ? '[dynamic then]' : safe(() => (typeof p.then!.text === 'function' ? (p.then as RuleThen & { text: (s: GameState) => string }).text(s) : p.then!.text as string)))
    : safe(() => (typeof p.text === 'function' ? p.text(s, WORLD) : p.text));
  return `- ~ \`/${p.test.source}/\`${p.death ? ' ☠' : ''}${th}${p.dynamic ? ` [${p.dynamic}]` : ''} — ${text}  #${p.id}`;
};
const probe = (room: string): GameState => ({ ...newGame(WORLD, 1), room });
const talkLines = (room: string, alias: string): string[] => {
  let s = probe(room);
  const lines: string[] = [];
  for (let k = 1; k <= 4; k++) { const r = step(s, `talk to ${alias}`, WORLD); lines.push(`talk ${k}: ${flat(r.output.join(' '))}`); s = r.state; }
  lines.push(`ask about pickles: ${flat(step(probe(room), `ask ${alias} about pickles`, WORLD).output.join(' '))}`);
  return lines;
};

function rooms(): void {
  const out: string[] = [
    '# The room guide',
    '',
    `Every room (${Object.keys(WORLD.rooms).length} of them), and everything each one answers to: the useful commands, the gags, the easter eggs, the`,
    'deaths (☠), the curses, and what every NPC says on talks 1–4. Spoilers everywhere. [The ledger](ledger.md) is the',
    'points authority; [the cheat sheet](cheat-sheet.md) is the short version (what to type to win).',
    '',
    'Generated by `npx tsx scripts/cheat-sheet.ts --rooms > docs/room-guide.md` from the world files. Every line is read',
    'in a fresh game placed in the room, so a line that changes as you play shows its first form. How to read it:',
    '',
    '- `where` is what `where` says here; `flask` is what `hint` / `get ye flask` says at the start.',
    '- `> verb noun|alias|alias` is a rule: any one of the aliases works. `(+10)` is points, `(+20 bonus)` bonus, `gives`',
    '  an item, `→` a move, ☠ a death, CURSE a curse (or its cure). `[needs …]` is when it fires: `!flag` means not yet,',
    '  `has:` carried, `wearing:` worn. The trailing `#id` is the rule id (the one telemetry records).',
    '- `~ /regex/` is a phrase rule matched against the whole line you type (this room, or its whole region).',
    '- Items: `look` is `look at <item>`, `get` is the refusal for scenery, `again` is `get` when you already have it, `blurb`',
    '  is its inventory line. NPCs: `talk 1–4` is `talk to <npc>` four times in a row; `ask about pickles` shows the brush-off.',
    '- God mode (`burninate`): `prompts` lists these rules for the room you are in; `locate <thing>` finds anything.',
  ];
  for (const room of Object.values(WORLD.rooms)) {
    const s = probe(room.id);
    out.push('', `## ${room.name} (${room.id}, ${room.region})`);
    out.push(`where: ${safe(() => whereText(s, room.id))}`);
    out.push(`Exits: ${Object.keys(room.exits).join(', ') || '—'}`);
    out.push(`flask: ${safe(() => room.flaskHint(s))}`);
    out.push('### Rules');
    for (const r of room.rules) out.push(`- > \`${promptFor(r)}\`${effect(r.then)}${needs(r)} — ${ruleText(r, s)}  #${r.id}`);
    const phrases = WORLD.phraseRules.filter((p) => p.room === room.id || (!p.room && p.region === room.region));
    if (phrases.length) { out.push('### Phrases (this room / region)'); for (const p of phrases) out.push(phraseLine(p, s)); }
    out.push('### Items');
    for (const id of room.items) {
      const it = WORLD.items[id]!;
      const desc = safe(() => (typeof it.describe === 'function' ? it.describe(s) : it.describe));
      out.push(`- ${it.name} [${it.aliases.join(', ')}]${it.takeable ? ' (gettable)' : ''} — look: ${desc}`);
      if (!it.takeable && it.untakeableText) out.push(`    get: ${flat(it.untakeableText)}`);
      if (it.again) out.push(`    again: ${safe(() => (typeof it.again === 'function' ? it.again(s) : it.again))}`);
      if (it.blurb) out.push(`    blurb: ${flat(it.blurb)}`);
    }
    if (room.npcs.length) {
      out.push('### NPCs');
      for (const id of room.npcs) {
        const n = WORLD.npcs[id]!;
        out.push(`- ${n.name} [${n.aliases.join(', ')}]`);
        for (const l of talkLines(room.id, n.aliases[0] ?? n.id)) out.push(`    ${l}`);
        out.push(`    brush-off: ${safe(() => brushOffLine(s, n.brushOff))}`);
        if (n.knows?.length) out.push(`    knows: ${n.knows.join(', ')}`);
      }
    }
  }
  const s = probe(WORLD.start);
  out.push('', '## Anywhere', '### Global rules');
  for (const r of WORLD.globalRules) out.push(`- > \`${promptFor(r)}\`${effect(r.then)}${needs(r)} — ${ruleText(r, s)}  #${r.id}`);
  out.push('### Global phrases');
  for (const p of WORLD.phraseRules.filter((p) => !p.room && !p.region)) out.push(phraseLine(p, s));
  out.push('### God mode (burninate)', '- godhelp · rooms · warp <room> · prompts [all|global] · summon <item> · locate <thing> · flags · settings · set <key> on|off · burninate');
  console.log(out.join('\n'));
}

if (mode === '--gameplay') gameplay(); else rooms();
