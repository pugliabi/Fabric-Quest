# Playability, Governance, Voice and the Cheat Sheet — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the two side quests playable stories with a goal card and a stage-by-stage path, add stuck helpers everywhere (NPC escalation, gate objects that answer the obvious verbs, a narrator nudge, `hint`), make the Keep make Power BI sense (the Duke's sin is a calculated column; Power Query Hall is seven Applied Steps you rebuild in order for +10), add the governance rooms (the Sacristy's real tenant and capacity settings, the Town Hall, My Workspace with `publish`), and run a region-by-region voice pass in the Peasant's Quest narrator voice on top of the Fabric jokes — then write the master cheat sheet from the world files.

**Architecture:** Everything stays inside the pure engine (`src/engine`) and the data-only world (`src/world`). Three small additive engine mechanisms carry the whole plan: `PhraseRule.then` (a raw-line rule that can set flags, move, pay bonus, or kill — used by the cheat counter, Excel's movement phrases, the Sacristy, the Applied Steps and the curses), `RuleThen.box` → `StepResult.box` (the Sierra goal card), and three counters on `GameState` (`stuck`, `idle`, `looks`) plus per-NPC `talk.<id>` flags maintained in `finish()`. Settings are flags `ts.<key>` read through `setting(s, key)` in `src/engine/governance.ts`; `applyGovernance()` appends the survey/usage/bill lines after the quirks. The voice constants live in one module, `src/world/voice.ts`, and every task writes against them.

**Tech Stack:** TypeScript strict, React 19, Vite 7, Vitest 3, Playwright, tsx scripts, Web Audio (no audio files). No schema change; telemetry is unchanged.

**Specs (both binding, read whole):**
- `docs/superpowers/specs/2026-09-23-playability-and-voice-design.md` (spec1) — its §2 SUPERSEDES the governance spec's §2.
- `docs/superpowers/specs/2026-09-23-governance-design.md` (spec2).
- Voice skill (every task reads it before writing any narrator line): `/root/.claude/skills/synced/6819c24c-67de-467e-9b61-3915b9b9c2af_64ce14da-cc38-4069-9830-db40df29ffbf/peasants-quest-voice/SKILL.md` plus `reference/response-patterns.md`, `reference/humor-taxonomy.md`, `reference/adapting-to-any-domain.md`.
- Voice additions inventory (starting material for Phase F): `.superpowers/voice-pass-doc.md`.

## Global Constraints

- all setting defaults preserve current behavior
- golden path stays 200 in 69 turns (its `say select *` step becomes `say calculated column`)
- golden + side quests stays 200 + 45
- voice work is ADD not overwrite except the spec1 §5.3 list
- every new narrator line follows the peasants-quest-voice skill (proper nouns only from this game, one joke per line, punchline last, failures end with SIGNOFF)
- tsc strict, `npm test`, `npm run lint:world` green at every commit
- no deploy/push
- no world-version bump
- phrase-rule order in src/world/index.ts stated whenever a task adds a list
- implementers never dispatch subagents

Clarifications that apply to every task:

- "failures end with SIGNOFF" means **deaths**: the engine appends `SIGNOFF` to every death (Task D1); non-lethal failures do not carry it.
- Work on branch `governance`. Do not create another branch. Commit after every task with the message given in its last step.
- Before every commit run exactly: `npx tsc -b && npm test && npm run lint:world`. All three must pass.
- Skill checklist for every new line: second person, present tense; answer first, snap second; proper nouns only from this game (rooms, items, NPCs, Fabric/Power BI vocabulary, the `voice.ts` pools); one joke per line; punchline last; ALL CAPS for emphasis, never bold/italics/emoji; insults target competence, hygiene, taste or boredom, never identity; no ye-olde diction, no system-message tone.
- The engine's text callbacks are pure. A line that must vary uses `vary(s, pool)` (deterministic by seed + turn) or `nick(s)` / `rotate(s, lines)` from `voice.ts`. No `Math.random`.

## File map (what each task creates or owns)

| File | Owner | Purpose |
|---|---|---|
| `src/world/voice.ts` | D1 | SIGNOFF, NICKNAMES/nick(), rotate(), MALAPROPS, FRUSTRATION, CHEAT, BRUSHOFFS, BRANDS, ALLUSIONS |
| `src/engine/step.ts` | D1, A1, B1, B3, E1, E2, F1 | PhraseRule.then; box; talk counters; stuck/idle/looks; governance hooks |
| `src/world/sidequests.ts` | A1, E2 | GOAL_PHRASES, HINT_PHRASES, goal texts, realmBlocked() |
| `src/world/excel.ts` | A2 | excelStage(), stage-driven Jeff, commands, compare |
| `src/world/copilot-ladder.ts`, `copilot.ts` | A3 | slot model |
| `src/engine/builtins.ts` | D1, B1, F1, F3 | overwrites; talkTo(); echo; blurbs/again |
| `src/world/gates.ts` | B2 | gate phrase rules per §3.2 |
| `src/world/applied-steps.ts` | C2, E6 | STEPS, stepsList(), the puzzle |
| `src/engine/governance.ts` | E1 | SettingKey, DEFAULTS, setting(), isFlood(), changedFromDefault(), applyGovernance() |
| `src/world/sacristy.ts` | E1, E2, E3 | SETTINGS catalog, room, books, flip() |
| `src/world/townhall.ts` | E4 | Town Hall room, clerk |
| `src/world/curses.ts` | F2 | curseOf(), the curse undo rules |
| `src/world/deaths.ts` | F2 | DEATH_PHRASES (the new Fabric deaths), the CapacityAde |
| `src/world/where.ts` | F1 | WHERE per room |
| `scripts/cheat-sheet.ts`, `docs/cheat-sheet.md` | H1 | the master cheat sheet |

Phrase-rule order in `src/world/index.ts` after all tasks (each task that adds a list states its position):

```
[...SIDEQUEST_PHRASES, ...GOAL_PHRASES, ...HINT_PHRASES, ...GOVERNANCE_PHRASES,
 ...EXCEL_PHRASES, ...COPILOT_PHRASES, ...SACRISTY_PHRASES, ...TOWNHALL_PHRASES, ...WORKSPACE_PHRASES,
 ...VILLAGE_PHRASES, ...MONASTERY_PHRASES, ...APPLIED_STEP_PHRASES, ...GATE_PHRASES,
 ...KEEP_PHRASES, ...LAKEHOUSE_PHRASES, ...PEAKS_PHRASES, ...DEATH_PHRASES, ...VOICE_PHRASES, ...PHRASE_RULES]
```

(Side-quest hooks first so exit words win inside the realms; then the goal/hint/governance helpers; then every room- and region-scoped list, which beat the global eggs they deliberately shadow; the global voice additions and the eggs last.)

---

### Task D1: Voice constants, the death sign-off, and the §5.3 overwrites

**Files:**
- Create: `src/world/voice.ts`
- Modify: `src/world/types.ts` (PhraseRule.then)
- Modify: `src/engine/step.ts` (phrase loop with `then`; SIGNOFF append in `finish()`)
- Modify: `src/engine/builtins.ts` (save/restore/restart/wait/quit/already-wearing/close)
- Modify: `src/engine/quirks.ts` (FRUSTRATED → one line; the six move to SHOUT_NO)
- Modify: `src/world/globals.ts` (egg.cheat counter, egg.swear → FRUSTRATION)
- Modify: `src/world/village.ts` (cottage.open-door already-open line)
- Modify: `tests/step.test.ts:130` (the wait line)
- Test: `tests/voice.test.ts`

**Voice:** read the voice skill and its three reference files before writing. The constants here are the spine of every later task.

**Interfaces:**
- Produces (from `src/world/voice.ts`):
  - `export const SIGNOFF = 'You dead. Refresh failed.'`
  - `export const NICKNAMES: readonly string[]` (16 names) and `export function nick(s: GameState): string` — deterministic by `s.seed` and `s.turns`; consecutive turns never return the same name.
  - `export function rotate(s: GameState, lines: readonly string[]): string` — `lines[s.turns % lines.length]`.
  - `export const MALAPROPS = { refreshered: 'refreshered', capacitude: 'capacitude', daxxed: 'DAXxed' } as const`
  - `export const FRUSTRATION = "Come now. Don't get throttled."`
  - `export const CHEAT = 'Meh.'` and `export const CHEAT_AGAIN = "Still meh. It's logged, by the way. It is literally in a table."`
  - `export const BRUSHOFFS: Record<string, string>` keyed by NPC id (every NPC in `npcs.ts`, plus `clerk` for Task E4).
  - `export const BRANDS = ['Refreshr™', 'CapacityAde', 'Dataflows Gen1 Classic'] as const`
  - `export const ALLUSIONS: readonly string[]`
- Produces (engine): `PhraseRule.then?: RuleThen | ((s: GameState, world: World, line: string) => { then: RuleThen; id?: string } | null)` — when present, the phrase is applied through `applyRule` (flags, moves, bonus, death all work); a function that returns `null` declines and the search continues. `text` is ignored for such rules (set it to `''`).
- Produces (engine): every death's last output line ends with `SIGNOFF` (appended in `finish()` when it does not already).

- [ ] **Step 1: Write the failing tests**

```ts
// tests/voice.test.ts
import { describe, expect, it } from 'vitest';
import { ALLUSIONS, BRANDS, BRUSHOFFS, CHEAT, CHEAT_AGAIN, FRUSTRATION, MALAPROPS, NICKNAMES, SIGNOFF, nick, rotate } from '../src/world/voice';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import type { GameState } from '../src/engine/types';

describe('voice constants are pinned (a change here is a reviewed change)', () => {
  it('sign-off', () => expect(SIGNOFF).toBe('You dead. Refresh failed.'));
  it('nicknames', () => expect([...NICKNAMES]).toEqual([
    'Mister Star Schema', 'Calculated Column Casey', 'Import Mode Ishmael', 'Ctrl-Shift-Enter', 'Power Query Pete', 'Many-to-Many Mandy',
    'Captain Blank', 'Bidirectional Bob', 'DAX Vader', 'Clippy', 'Zune', 'Encarta', 'Ask Jeeves', 'Tom from MySpace', 'champ', 'guy',
  ]));
  it('malaprops', () => expect(MALAPROPS).toEqual({ refreshered: 'refreshered', capacitude: 'capacitude', daxxed: 'DAXxed' }));
  it('frustration and cheat', () => {
    expect(FRUSTRATION).toBe("Come now. Don't get throttled.");
    expect(CHEAT).toBe('Meh.');
    expect(CHEAT_AGAIN).toMatch(/literally in a table/);
  });
  it('brands', () => expect([...BRANDS]).toEqual(['Refreshr™', 'CapacityAde', 'Dataflows Gen1 Classic']));
  it('allusions include the 2000s-Microsoft layer', () => {
    for (const a of ['Clippy', 'Zune', 'Encarta', 'the Windows XP hill', 'an MSN Messenger nudge', 'Access 97', 'SharePoint 2007', "It looks like you're writing a measure."]) expect(ALLUSIONS).toContain(a);
  });
  it('every NPC has a brush-off', () => {
    for (const id of Object.keys(WORLD.npcs)) expect(BRUSHOFFS[id], id).toBeTruthy();
  });
});

describe('nick() and rotate()', () => {
  const at = (seed: number, turns: number): GameState => ({ ...newGame(WORLD, seed), turns });
  it('never repeats on consecutive turns and stays deterministic', () => {
    for (const seed of [1, 7, 42, 9999]) {
      for (let t = 1; t < 200; t++) expect(nick(at(seed, t))).not.toBe(nick(at(seed, t - 1)));
      expect(nick(at(seed, 12))).toBe(nick(at(seed, 12)));
    }
  });
  it('rotate walks a pool by turn', () => {
    expect(rotate(at(1, 0), ['a', 'b', 'c'])).toBe('a');
    expect(rotate(at(1, 4), ['a', 'b', 'c'])).toBe('b');
  });
});

describe('every death ends with the sign-off', () => {
  const run = (cmds: string[], room = 'village.cottage', flags: Record<string, boolean | number> = {}) => {
    let s = { ...newGame(WORLD, 3), room, flags: { ...flags } };
    let last = step(s, 'look', WORLD);
    for (const c of cmds) { last = step(s, c, WORLD); s = last.state; }
    return last;
  };
  it.each([
    [['die'], 'village.cottage'],
    [['attack me'], 'village.cottage'],
    [['delete workspace'], 'village.cottage'],
    [['format c:'], 'village.cottage'],
    [['give paginated report to jeff'], 'village.square'],
    [['import onelake'], 'lake.shore'],
    [['swim moat'], 'fortress.bridge'],
    [['drink water'], 'swamp.bronze'],
    [['attack dragon'], 'peaks.shrine'],
  ])('%s at %s', (cmds, room) => {
    const r = run(cmds, room);
    expect(r.state.dead).toBe(true);
    expect(r.output[r.output.length - 1]!.endsWith(SIGNOFF)).toBe(true);
    expect(r.output.join(' ').split(SIGNOFF).length).toBe(2); // exactly once
  });
  it('every death rule and death phrase in the world signs off (scan)', () => {
    const rules = [...WORLD.globalRules, ...Object.values(WORLD.rooms).flatMap((r) => r.rules)].filter((r) => r.then.death);
    const phrases = WORLD.phraseRules.filter((p) => p.death);
    expect(rules.length + phrases.length).toBeGreaterThanOrEqual(9);
    for (const r of rules) {
      const room = Object.values(WORLD.rooms).find((rm) => rm.rules.includes(r))?.id ?? 'village.cottage';
      const s = { ...newGame(WORLD, 3), room, inventory: ['license', ...(r.when.has ?? [])], flags: Object.fromEntries((r.when.flags ?? []).filter((c) => !c.not).map((c) => [c.flag, c.is ?? true])) };
      const out = step(s, r.when.verb === 'go' ? (r.when.dir ?? 'n') : `${r.when.verb} ${Array.isArray(r.when.noun) ? r.when.noun[0] : r.when.noun ?? ''}`.trim(), WORLD);
      if (out.state.dead) expect(out.output[out.output.length - 1], r.id).toMatch(new RegExp(`${SIGNOFF.replace('.', '\\.')}$`));
    }
  });
});

describe('the §5.3 overwrites', () => {
  const one = (cmd: string, room = 'village.cottage', extra: Partial<GameState> = {}) => step({ ...newGame(WORLD, 3), room, ...extra }, cmd, WORLD);
  it('save / restore / restart / quit', () => {
    expect(one('save').output[0]).toBe("Saved. To your browser. Not to OneLake, so don't get cute.");
    expect(one('restore').output[0]).toBe('Restoring. Pretend the last four minutes were a refresh.');
    expect(one('restart', 'village.cottage', { score: 40 }).output[0]).toBe("Restarting. You had 40 points. You'll get them back. Probably.");
    expect(one('quit').output[0]).toMatch(/^Well fine, .+\. Hope you posted your score, cause it is OVER between us\.$/);
    expect(one('quit').outcome).toBe('meta');
  });
  it('wait is a pair', () => {
    const a = one('wait');
    expect(a.output[0]).toBe('Time passes. So does the refresh window.');
    const b = step(a.state, 'wait', WORLD);
    expect(b.output[0]).toBe("Still waiting. You're getting a pretty sweet workout for your patience muscles.");
  });
  it('already open, already wearing, closed riddle', () => {
    expect(one('open door').output[0]).toBe("Yeah, totally! Except it's already open, you moron. Try: out.");
    const worn = { ...newGame(WORLD, 3), inventory: ['license', 'hoodie'], worn: ['hoodie'] };
    expect(step(worn, 'wear hoodie', WORLD).output[0]).toBe("You're already wearing it. Too bad you still smell like a Pro license under it.");
    expect(step({ ...worn, flags: { 'trial.moat': true } }, 'wear hoodie', WORLD).output[0]).toBe("You're already wearing it. Too bad you still smell like a Warehouse under it.");
    expect(one('close door').output[0]).toBe('A riddle: what can be closed that is already closed? (Hint: not this door.)');
  });
  it('cheat: Meh., then the table', () => {
    const a = one('cheat');
    expect(a.output[0]).toBe(CHEAT);
    const b = step(a.state, 'iddqd', WORLD);
    expect(b.output[0]).toBe(CHEAT_AGAIN);
    expect(b.state.flags['cheat.count']).toBe(2);
  });
  it('frustration is one unchanging line, and profanity gets the same one', () => {
    const OLD_SIX = /Frustration logged|say it slower|with feeling|not fed by tone|Deep breaths|certification in that/;
    let s = newGame(WORLD, 3);
    for (const c of ['ugh get csv', 'get csv, dammit', 'seriously get csv', 'get csv right now']) {
      const r = step(s, c, WORLD); s = r.state;
      expect(r.output, c).toContain(FRUSTRATION);
      expect(r.output.join(' '), c).not.toMatch(OLD_SIX); // later tasks may append an aside after it; the line itself never changes
    }
    expect(one('what the hell').output[0]).toBe(FRUSTRATION);
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run tests/voice.test.ts`
Expected: FAIL — `../src/world/voice` not found.

- [ ] **Step 3: Create `src/world/voice.ts`**

```ts
import type { GameState } from '../engine/types';

/**
 * The voice constants (spec1 §5.1). One module, pinned by tests/voice.test.ts: a change here is a deliberate,
 * reviewed change. Every narrator line written after this task draws its nicknames, malaprops, brands and
 * allusions from here so the game develops one signature instead of thirty.
 */

/** Appended by the engine to every death (step.ts finish()). The catchphrase. */
export const SIGNOFF = 'You dead. Refresh failed.';

/** Sarcastic vocatives: half Fabric, half 2000s Microsoft. Sixteen, so a stride of 7 walks all of them. */
export const NICKNAMES = [
  'Mister Star Schema', 'Calculated Column Casey', 'Import Mode Ishmael', 'Ctrl-Shift-Enter', 'Power Query Pete', 'Many-to-Many Mandy',
  'Captain Blank', 'Bidirectional Bob', 'DAX Vader', 'Clippy', 'Zune', 'Encarta', 'Ask Jeeves', 'Tom from MySpace', 'champ', 'guy',
] as const;

/** A nickname for this turn. Deterministic (seed + turn); the stride is coprime with the pool size, so two consecutive turns never get the same name. */
export function nick(s: GameState): string {
  const offset = Math.abs(Math.imul(s.seed ^ 0x7f4a7c15, 0x9e3779b1) >>> 0) % NICKNAMES.length;
  return NICKNAMES[(offset + s.turns * 7) % NICKNAMES.length]!;
}

/** Walk a short pool by turn: line 0 on turn 0, line 1 on turn 1 … (for the 3-line checklist rotations of §3.1). */
export function rotate(s: GameState, lines: readonly string[]): string {
  return lines[s.turns % lines.length]!;
}

/** Misspelled on purpose, reused exactly. Each must appear verbatim in at least six lines across the game (tests/voice-harness.test.ts, Task F12). */
export const MALAPROPS = { refreshered: 'refreshered', capacitude: 'capacitude', daxxed: 'DAXxed' } as const;

/** The one unchanging reply to frustration and profanity (spec1 §5.3). */
export const FRUSTRATION = "Come now. Don't get throttled.";

/** Cheating: one syllable the first time, the table the second. */
export const CHEAT = 'Meh.';
export const CHEAT_AGAIN = "Still meh. It's logged, by the way. It is literally in a table.";

/** `ask <npc> about <unknown>`: one brush-off per NPC, in that NPC's gimmick (spec1 §3.1). Keyed by NPC id. */
export const BRUSHOFFS: Record<string, string> = {
  jeff: '"Is it in Excel? Then I don\'t know it."',
  miller: '"I don\'t know nothing about no whatever you just said. Ask me after Q3. Oh wait."',
  ferryman: "He mouths: 'CREDENTIALS. EXPIRED.' He mouthed it at his own wedding.",
  monk: 'The monk points at the progress bar. It is his answer to everything, and it is always the same percent.',
  abbot: '"Either we don\'t know anything about that, or you\'re real boring. The monks are voting."',
  pandas: '"Does it work on my laptop? No? Then I don\'t know it either."',
  librarian: '"Shh." Then, quieter: "Shh."',
  guard: '"Is it a SKU? No? Then it\'s not my department, and my department is the whole gate."',
  duke: 'The Duke waits for a filter argument. Whatever that was, it was not one.',
  cardinality: '"One to many," says Sir Cardinality, to a question that was not about that.',
  card: 'The Card shows (Blank). It is its answer to that, and to everything.',
  throttlor: '"I bill for questions like that," says Throttlor. "Ask me about the model."',
  scarecrow: 'Manual says nothing. Manual would need to be triggered to say nothing about that specifically.',
  'jeff-excel': '"Is it in Sheet1? No? Then it\'s not real."',
  clerk: "That's an admin setting.",
};

/** Twisted brands, one syllable off. */
export const BRANDS = ['Refreshr™', 'CapacityAde', 'Dataflows Gen1 Classic'] as const;

/** The 2000s-Microsoft allusion layer. The region sweeps (Tasks F4–F11) use at least one per region. */
export const ALLUSIONS = [
  'Clippy', 'Zune', 'Encarta', 'the Windows XP hill', 'an MSN Messenger nudge', 'Access 97', 'SharePoint 2007',
  "It looks like you're writing a measure.", 'a Hotmail inbox', 'Windows Vista', 'Internet Explorer 6', 'Minesweeper',
  'the Recycle Bin', 'a screensaver of pipes', 'Microsoft Bob',
] as const;
```

- [ ] **Step 4: Add `PhraseRule.then` to the world types**

In `src/world/types.ts`, add to `PhraseRule` after `after?`:

```ts
  /**
   * A raw-line rule with effects. Applied through the engine's applyRule (flags, moves, bonus, death, sfx, box all
   * work). A function form sees the lowercased line and may return null to decline, in which case the search
   * continues with the next phrase rule. `text` is ignored when `then` is present (set it to '').
   */
  then?: RuleThen | ((s: GameState, world: World, line: string) => { then: RuleThen; id?: string } | null);
```

- [ ] **Step 5: Teach `step()` the `then` form and append the sign-off**

In `src/engine/step.ts`, add the import:

```ts
import { SIGNOFF } from '../world/voice';
```

Replace the single `const phrase = world.phraseRules.find(...)` line with a loop that resolves `then`:

```ts
  let phrase: PhraseRule | undefined;
  let phraseThen: { then: RuleThen; id?: string } | undefined;
  for (const p of world.phraseRules) {
    const inScope = p.room ? p.room === base.room : p.region ? p.region === hereRegion : !promptRoom || !!p.dynamic;
    if (!inScope || !applies(p.dynamic) || (p.after && !p.after(prev)) || !p.test.test(lower)) continue;
    if (p.then) {
      const resolved = typeof p.then === 'function' ? p.then(base, world, lower) : { then: p.then };
      if (resolved === null) continue; // the handler declined: keep looking
      phrase = p; phraseThen = resolved; break;
    }
    phrase = p; break;
  }
```

(add `RuleThen` to the type import from `../world/types`). Then, after the `if (phrase?.dynamic) { … }` block and before `if (phrase) { … }`, add:

```ts
  if (phrase && phraseThen) return finish(applyRule(base, { id: phraseThen.id ?? phrase.id, when: { verb: 'unknown' }, then: phraseThen.then }, world, parsed));
```

In `finish()`, right after step 3a (the side-realm no-death block) add:

```ts
    // 3a'. Every death ends on the catchphrase (spec1 §5.1). Appended once, to the last line.
    if (result.state.dead && !base.dead && result.output.length) {
      const out = [...result.output];
      const i = out.length - 1;
      if (!out[i]!.endsWith(SIGNOFF)) out[i] = `${out[i]} ${SIGNOFF}`;
      result = { ...result, output: out };
    }
```

- [ ] **Step 6: The builtin overwrites**

In `src/engine/builtins.ts`, import `nick`:

```ts
import { nick } from '../world/voice';
```

Replace the `save`/`restore`/`restart`/`quit`/`wait` cases:

```ts
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
```

Replace the already-wearing line in `case 'wear'`:

```ts
      if (s.worn.includes(r.item.id)) return { state: s, output: [`You're already wearing it. Too bad you still smell like ${s.flags['trial.moat'] ? 'a Warehouse' : 'a Pro license'} under it.`], outcome: 'fail' };
```

Add the closed riddle: inside the shared `case 'use': … case 'say':` block, right after `const r = resolveNoun(s, world, cmd.noun); if (!r) return …dontSee…;` add:

```ts
      if (cmd.verb === 'close') return { state: s, output: [`A riddle: what can be closed that is already closed? (Hint: not this ${r.kind === 'item' ? r.item.name : r.npc.name}.)`], outcome: 'fail' };
```

- [ ] **Step 7: The frustration line and the cheat counter**

In `src/engine/quirks.ts`, import `FRUSTRATION` from `'../world/voice'`, replace the `FRUSTRATED` pool with:

```ts
const FRUSTRATED = [FRUSTRATION];
```

and move its six old lines to the end of `SHOUT_NO` (nothing is lost):

```ts
  'Frustration logged. It does not count toward the 200.',
  "Okay, okay. Same answer, but I'll say it slower.",
  'Ye wish. Ye wish with feeling.',
  'The dragon is not fed by tone.',
  'Deep breaths. The realm has all day. The realm is billed by the second, but it has all day.',
  'The narrator senses frustration. The narrator has a certification in that.',
```

In `src/world/globals.ts`, import `{ CHEAT, CHEAT_AGAIN, FRUSTRATION }` from `'./voice'` and replace `egg.cheat` and `egg.swear`:

```ts
  {
    id: 'egg.cheat', test: /^(cheat|hack|god mode|iddqd|idkfa|konami)\b/, text: '',
    then: { text: (s) => ((Number(s.flags['cheat.count']) || 0) === 0 ? CHEAT : CHEAT_AGAIN), set: { 'cheat.count': (v) => (Number(v) || 0) + 1 }, outcome: 'snark' },
  },
  { id: 'egg.swear', test: /\b(damn|hell|crap|wtf|ffs|fuck|shit)\b/, text: FRUSTRATION },
```

In `src/world/village.ts`, `cottage.open-door`:

```ts
        then: { text: "Yeah, totally! Except it's already open, you moron. Try: out.", outcome: 'fail' },
```

In `tests/step.test.ts` line 130 change `'Time passes.'` to `'Time passes. So does the refresh window.'`.

- [ ] **Step 8: Run everything**

Run: `npx tsc -b && npm test && npm run lint:world`
Expected: all green. `tests/voice.test.ts` passes; `tests/golden-path.test.ts` still 200/69 (the golden path never dies, waits or quits).

- [ ] **Step 9: Commit**

```bash
git add src/world/voice.ts src/world/types.ts src/engine/step.ts src/engine/builtins.ts src/engine/quirks.ts src/world/globals.ts src/world/village.ts tests/voice.test.ts tests/step.test.ts
git commit -m "voice: constants module, death sign-off, PhraseRule.then, the system-message overwrites"
```

---

### Task A1: The goal card (`box`), `goal`, in-realm `help`, the board's Copilot line

**Files:**
- Modify: `src/world/types.ts` (RuleThen.box)
- Modify: `src/engine/types.ts` (StepResult.box)
- Modify: `src/engine/step.ts` (applyRule carries box; the enter-with-prompt path keeps it)
- Modify: `src/game/notice.ts` (box before notice)
- Modify: `src/world/sidequests.ts` (GOAL, goalText(), GOAL_PHRASES; enterThen sets box)
- Modify: `src/world/index.ts` (register GOAL_PHRASES)
- Modify: `src/engine/builtins.ts` (in-realm help tail)
- Modify: `src/world/village.ts` (board line)
- Modify: `tests/sidequests.test.ts` (help tail assertion)
- Test: `tests/sidequest-onboarding.test.ts`

**Voice:** read the voice skill first. The goal card is a system card and reads plainly; the `goal` line outside a realm is the narrator's.

**Interfaces:**
- Consumes: `PhraseRule.then` (D1).
- Produces: `RuleThen.box?: string | ((s: GameState, world: World) => string)`; `StepResult.box?: string`; `export const GOAL: Record<Realm, { header: string; body: string }>` and `export function goalText(s: GameState, world: World): string` (body + the room's `flaskHint`) in `sidequests.ts`; `export const GOAL_PHRASES: PhraseRule[]`; `export const MAIN_GOAL = 'Find the Golden Semantic Model. Read the notice board if you forgot how. (Inside a side quest, GOAL tells you that quest\'s goal.)'`.
- The in-realm `help` tail is exactly: `Type EXIT to leave ${realm}; you return where you were. GOAL repeats the objective; GET YE FLASK says the next step.`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/sidequest-onboarding.test.ts
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { noticeFor } from '../src/game/notice';
import { GOAL, MAIN_GOAL } from '../src/world/sidequests';

const from = (room: string) => ({ ...newGame(WORLD, 3), room });

describe('goal card on entry (spec2 §2.1, spec1 §2.1–2.2)', () => {
  it('entering Excel sets box to the goal, every time', () => {
    const a = step(from('village.square'), 'show me a table', WORLD);
    expect(a.box).toBe(`${GOAL.excel.header} — ${GOAL.excel.body}`);
    expect(a.box).toMatch(/^JEFF'S EXCEL — Jeff's export says \$4\.7M\./);
    const out = step(a.state, 'exit', WORLD);
    const b = step(out.state, 'show me a table', WORLD);
    expect(b.box).toBe(a.box);
  });
  it('entering Copilot sets the Copilot goal, also with a prompt on the way in', () => {
    expect(step(from('village.square'), 'copilot', WORLD).box).toMatch(/^COPILOT — Get one number out of Copilot/);
    expect(step(from('village.square'), 'ask copilot for sales', WORLD).box).toMatch(/^COPILOT — /);
  });
  it('the message box shows the goal before the entrance quip', () => {
    const s = from('village.square');
    const r = step(s, 'show me a table', WORLD);
    const n = noticeFor(r, s, WORLD)!.text;
    expect(n.startsWith(r.box!)).toBe(true);
    expect(n).toContain(r.notice!);
  });
});

describe('goal / objective', () => {
  it('inside a realm: the body plus the room hint', () => {
    const inn = step(from('village.square'), 'show me a table', WORLD).state;
    for (const c of ['goal', 'objective', 'what do i do', 'what am i doing', 'what is the goal', 'why am i here']) {
      const out = step(inn, c, WORLD).output[0]!;
      expect(out, c).toContain(GOAL.excel.body);
      expect(out, c).toContain(WORLD.rooms['excel.sheet1']!.flaskHint(inn));
    }
    const pane = step(from('village.square'), 'copilot', WORLD).state;
    expect(step(pane, 'goal', WORLD).output[0]).toContain(GOAL.copilot.body);
  });
  it('outside: the main-quest line', () => {
    expect(step(from('village.mill'), 'goal', WORLD).output[0]).toBe(MAIN_GOAL);
    expect(step(from('village.mill'), 'what do i do', WORLD).output[0]).toBe(MAIN_GOAL);
  });
  it('help in a realm ends with GOAL and GET YE FLASK', () => {
    const inn = step(from('village.square'), 'show me a table', WORLD).state;
    const out = step(inn, 'help', WORLD).output;
    expect(out[out.length - 1]).toBe("Type EXIT to leave Jeff's Excel; you return where you were. GOAL repeats the objective; GET YE FLASK says the next step.");
  });
  it('the notice board mentions Copilot', () => {
    expect(step(from('village.square'), 'read board', WORLD).output[0]).toContain('Copilot is available in this tenant. Ask it about sales at your own risk.');
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run tests/sidequest-onboarding.test.ts`
Expected: FAIL — `GOAL` not exported; `box` undefined.

- [ ] **Step 3: Types and applyRule**

`src/world/types.ts`, in `RuleThen` after `sfx?`:

```ts
  /** A line for the Sierra message box, shown before the entrance quip (the side-quest goal cards). */
  box?: string | ((s: GameState, world: World) => string);
```

`src/engine/types.ts`, in `StepResult` after `notice?`:

```ts
  /** The goal card (or any box a rule asked for). App shows it before `notice`; both when both. */
  box?: string;
```

`src/engine/step.ts`, in `applyRule` return: add `box: typeof t.box === 'function' ? t.box(state, world) : t.box`. In the enter-with-prompt path (the `finish({ ...replied, output: [...output, ...replied.output], notice, … })` call) add `box: entered.box` to the object so the card survives the prompt reply.

- [ ] **Step 4: `notice.ts` shows the box first**

In `src/game/notice.ts`, `noticeFor`, insert before the points check:

```ts
  if (r.box) return { text: r.notice ? `${r.box}\n\n${r.notice}` : r.box, itemId: pic };
```

- [ ] **Step 5: sidequests.ts — the goals, the phrases, the box on entry**

Add to `src/world/sidequests.ts`:

```ts
/** The goal cards (spec1 §2.1, §2.2). `header — body` is the box; `goal` inside the realm repeats the body plus the room's next step. */
export const GOAL: Record<Realm, { header: string; body: string }> = {
  excel: { header: "JEFF'S EXCEL", body: "Jeff's export says $4.7M. The report says $4.2M. Jeff: \"I'll keep what's in my export. I trust it more.\" Help Jeff find the truth. +20 bonus. EXIT leaves any time." },
  copilot: { header: 'COPILOT', body: 'Get one number out of Copilot: Q4 2025 Northeast net sales, from the certified model. It will show you everything else first. Tell it what you want, a piece at a time, or all at once. +25 bonus. EXIT leaves any time.' },
};
export const MAIN_GOAL = "Find the Golden Semantic Model. Read the notice board if you forgot how. (Inside a side quest, GOAL tells you that quest's goal.)";

/** `goal` inside a realm: the body and the current next step (the room's flask hint, which the realms keep stage-driven). */
export function goalText(s: GameState, world: World): string {
  const room = world.rooms[s.room]!;
  const realm = (Object.keys(SIDEQUEST_ENTRY) as Realm[]).find((r) => room.region === r);
  if (!realm) return MAIN_GOAL;
  return `${GOAL[realm].body} ${room.flaskHint(s)}`;
}

const GOAL_TEST = /^(goal|objective|what do i do|what am i doing|what is the goal|why am i here)\??$/;
/** Registered right after SIDEQUEST_PHRASES (world/index.ts): region-scoped copies win inside the realms (the pane skips global phrases); the global one answers everywhere else. */
export const GOAL_PHRASES: PhraseRule[] = [
  { id: 'goal.excel', region: 'excel', test: GOAL_TEST, text: goalText },
  { id: 'goal.copilot', region: 'copilot', test: GOAL_TEST, text: goalText },
  { id: 'goal.main', test: GOAL_TEST, text: MAIN_GOAL },
];
```

In `enterThen`, add `box: \`${GOAL[realm].header} — ${GOAL[realm].body}\`` to the returned `RuleThen`.

`src/world/index.ts`: import `GOAL_PHRASES` and register it: `phraseRules: [...SIDEQUEST_PHRASES, ...GOAL_PHRASES, ...EXCEL_PHRASES, ...COPILOT_PHRASES, ...KEEP_PHRASES, ...LAKEHOUSE_PHRASES, ...PEAKS_PHRASES, ...PHRASE_RULES]`.

- [ ] **Step 6: help tail and the board**

`src/engine/builtins.ts`, `case 'help'`:

```ts
      return { state: s, output: realm ? [world.helpText, `Type EXIT to leave ${realm}; you return where you were. GOAL repeats the objective; GET YE FLASK says the next step.`] : [world.helpText], outcome: 'meta' };
```

`tests/sidequests.test.ts` ("help inside a realm says how to leave it"): update both expected strings to end with ` GOAL repeats the objective; GET YE FLASK says the next step.`

`src/world/village.ts`, `village.prophecy` text: append `\n\nA fourth hand, in marker: "Copilot is available in this tenant. Ask it about sales at your own risk."` to the prophecy string.

- [ ] **Step 7: Run everything and commit**

Run: `npx tsc -b && npm test && npm run lint:world` — Expected: green (`tests/notice.test.ts` "an entrance quip alone still gets the box" now sees the box + quip; update that assertion to `expect(noticeFor(r, s, WORLD)?.text).toBe(\`${r.box}\n\n${r.notice}\`)`).

```bash
git add src/world/types.ts src/engine/types.ts src/engine/step.ts src/game/notice.ts src/world/sidequests.ts src/world/index.ts src/engine/builtins.ts src/world/village.ts tests/sidequest-onboarding.test.ts tests/sidequests.test.ts tests/notice.test.ts
git commit -m "onboarding: goal card on every realm entry, goal command, help tail, board Copilot line"
```

---

### Task A2: Jeff's Excel — the story, the stages, the commands

**Files:**
- Modify: `src/world/types.ts` (FlagPatch setter gets the pre-rule state)
- Modify: `src/engine/step.ts` (applyRule passes it)
- Modify: `src/world/excel.ts` (excelStage, Jeff, hints, commands, compare)
- Modify: `src/world/items.ts` (`export`, `report-monitor`, `field-pane`, new `monitor`, `desk-jeff`, `tissues`)
- Modify: `src/world/index.ts` (EXCEL_PHRASES already registered; no order change)
- Modify: `tests/excel.test.ts` (rewrite the "one fact per ask" test to the stages)
- Test: `tests/excel-stages.test.ts`

**Voice:** read the voice skill first. Jeff's gimmick: a man who has already decided, who trusts the export, and who never goes north.

**Interfaces:**
- Consumes: `PhraseRule.then` (D1); `RuleThen.box` (A1); `goalText()` uses each room's `flaskHint`, which this task makes stage-driven.
- Produces: `export type ExcelStage = 0 | 1 | 2 | 3 | 4 | 5` and `export function excelStage(s: GameState): ExcelStage` in `excel.ts`; `export function stageLine(s: GameState): string` (the flask/goal line per stage); flags `excel.jeff.asked` (boolean), `excel.jeff.n` (talks at the current stage), `excel.jeff.stage` (stage of the last talk); `FlagPatch` setters are now `(old: FlagValue | undefined, prev: GameState) => FlagValue` (`prev` = the state before the rule's `set`).

- [ ] **Step 1: Write the failing tests**

```ts
// tests/excel-stages.test.ts
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { excelStage, stageLine } from '../src/world/excel';

const play = (cmds: string[]) => {
  let s = { ...newGame(WORLD, 8), room: 'village.square' };
  const outs: string[][] = [];
  for (const c of cmds) { const r = step(s, c, WORLD); s = r.state; outs.push(r.output); }
  return { s, outs, last: outs[outs.length - 1]! };
};
const IN = ['show me a table'];

describe('excelStage 0→5', () => {
  it('advances with the flags', () => {
    const { s: s0 } = play(IN);
    expect(excelStage(s0)).toBe(0);
    const { s: s1 } = play([...IN, 'talk to jeff']);
    expect(excelStage(s1)).toBe(1);
    const { s: s2 } = play([...IN, 'talk to jeff', 'n', 'analyze in excel', 'sign in']);
    expect(excelStage(s2)).toBe(2);
    const { s: s3 } = play([...IN, 'talk to jeff', 'n', 'analyze in excel', 'sign in', 's', 'e', 'create pivot table']);
    expect(excelStage(s3)).toBe(3);
    const { s: s4 } = play([...IN, 'talk to jeff', 'n', 'analyze in excel', 'sign in', 's', 'e', 'create pivot table', 'add sales region', 'add net sales', 'filter by year']);
    expect(excelStage(s4)).toBe(4);
    const { s: s5 } = play([...IN, 'talk to jeff', 'n', 'analyze in excel', 'sign in', 's', 'e', 'create pivot table', 'add sales region', 'add net sales', 'filter by year', 'w', 'show jeff']);
    expect(excelStage(s5)).toBe(5);
    expect(s5.bonus).toBe(20);
  });
  it('the flask hint, goal and Jeff all name the same next step', () => {
    const { s } = play([...IN, 'talk to jeff']);
    expect(stageLine(s)).toBe('Go north to the Data tab and `analyze in excel`, then `sign in`.');
    expect(step(s, 'get ye flask', WORLD).output[0]).toContain(stageLine(s));
    expect(step(s, 'goal', WORLD).output[0]).toContain(stageLine(s));
    expect(step(s, 'talk to jeff', WORLD).output[0]).toMatch(/Data tab/);
  });
  it('Jeff at stage 0 sets excel.jeff.asked and points north; a second ask at the same stage is a variant', () => {
    const a = play([...IN, 'talk to jeff']);
    expect(a.last[0]).toBe("\"It's 4.7. The report says 4.2. I exported the visual, I summed it, it's 4.7. Look, I trust my export. IT said something about 'Analyze in Excel' — that it connects to the actual model. It's on the Data tab. North. I never go north.\"");
    expect(a.s.flags['excel.jeff.asked']).toBe(true);
    const b = play([...IN, 'talk to jeff', 'talk to jeff']);
    expect(b.last[0]).not.toBe(a.last[0]);
    expect(b.last[0]).toMatch(/north|Data tab/i);
    const c = play([...IN, 'talk to jeff', 'talk to jeff', 'ask jeff']);
    expect(c.last[0]).not.toBe(b.last[0]);
  });
  it('stage 3 names only the missing pieces', () => {
    const { s } = play([...IN, 'talk to jeff', 'n', 'analyze in excel', 'sign in', 's', 'e', 'create pivot table', 'add net sales']);
    expect(stageLine(s)).toBe('Add what\'s missing: `add sales region` / `filter by year`.');
    expect(step(s, 'w', WORLD).output.join(' ')).toBeTruthy();
    const jeff = step(step(s, 'w', WORLD).state, 'talk to jeff', WORLD).output[0]!;
    expect(jeff).toMatch(/4\.5M/);
    expect(jeff).toMatch(/Sales Region in rows/);
    expect(jeff).toMatch(/the year filter/);
    expect(jeff).not.toMatch(/Net Sales in values/);
  });
});

describe('the broadened commands', () => {
  it.each(['pivot table', 'pivot', 'go to pivot table', 'open pivot table'])('%s on Sheet1 moves east', (c) => {
    expect(play([...IN, c]).s.room).toBe('excel.pivot');
  });
  it.each(['data tab', 'go to data tab', 'analyze in excel', 'connect'])('%s on Sheet1 moves north', (c) => {
    expect(play([...IN, c]).s.room).toBe('excel.data');
  });
  it('analyze in excel on the Data tab starts the connect; sign in / log in / use license connect', () => {
    for (const c of ['sign in', 'log in', 'use license']) {
      const { s } = play([...IN, 'n', 'analyze in excel', c]);
      expect(s.flags['excel.connected'], c).toBe(true);
    }
  });
  const READY = [...IN, 'talk to jeff', 'n', 'analyze in excel', 'sign in', 's', 'e', 'create pivot table'];
  it.each([
    ['add sales region', 'excel.dim'], ['put sales region in rows', 'excel.dim'], ['drag sales region to rows', 'excel.dim'], ['rows sales region', 'excel.dim'],
    ['add net sales', 'excel.measure'], ['put net sales in values', 'excel.measure'], ['values net sales', 'excel.measure'],
    ['filter by year', 'excel.filter'], ['filter to 2025', 'excel.filter'], ['filter current year', 'excel.filter'], ['add year filter', 'excel.filter'], ['put year in filters', 'excel.filter'],
  ])('%s sets %s', (c, flag) => {
    expect(play([...READY, c]).s.flags[flag]).toBe(true);
  });
  it('wrong fields keep their jokes', () => {
    expect(play([...READY, 'add region a']).last[0]).toMatch(/legacy/i);
    expect(play([...READY, 'add sales amount']).last[0]).toMatch(/Returns/);
  });
  it('the totals ladder is unchanged: 4.7M → 4.5M → 4.3M → 4.2M', () => {
    const { outs } = play([...READY, 'add sales region', 'add net sales', 'filter by year']);
    expect(outs[outs.length - 3]![0]).toMatch(/4\.5M/);
    expect(outs[outs.length - 2]![0]).toMatch(/4\.3M/);
    expect(outs[outs.length - 1]![0]).toMatch(/4\.2M/);
  });
  it.each(['show jeff', 'show jeff the pivot', 'tell jeff', 'give pivot to jeff', 'talk to jeff'])('%s at stage 4 wins', (c) => {
    const { s } = play([...READY, 'add sales region', 'add net sales', 'filter by year', 'w', c]);
    expect(s.bonus).toBe(20);
  });
  it('compare explains what is still inflating the total', () => {
    expect(play([...READY, 'compare']).last[0]).toMatch(/4,712,331/);
    expect(play([...READY, 'compare']).last[0]).toMatch(/Region A|Returns|three years/);
    expect(play([...READY, 'add sales region', 'add net sales', 'filter by year', 'look at difference']).last[0]).toMatch(/always 4\.2M|show him/i);
  });
  it('the field list names the wrong ones on purpose', () => {
    const out = play([...READY, 'fields']).last[0]!;
    for (const f of ['Sales Region', 'Region A (legacy)', 'Region B (legacy)', 'Product', 'Salesperson', 'Date', 'Net Sales', 'Sales Amount', 'Returns', 'Gross Sales', 'Sales YTD', 'Measure 2 (copy)', 'Is Current Year', 'Year', 'Quarter']) expect(out).toContain(f);
    expect(play([...IN, 'e', 'look at fields']).last[0]).toMatch(/Connect Analyze in Excel/);
  });
  it('Sheet1 examinables', () => {
    for (const [n, re] of [['export', /4,712,331/], ['report', /4\.2M/], ['monitor', /monitor/i], ['ribbon', /Data/], ['desk', /desk/i], ['tissue box', /tissue/i]] as const) {
      expect(play([...IN, `look at ${n}`]).last[0], n).toMatch(re);
    }
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run tests/excel-stages.test.ts`
Expected: FAIL — `excelStage` not exported.

- [ ] **Step 3: Setters see the pre-rule state**

`src/world/types.ts`:

```ts
export type FlagPatch = Record<string, FlagValue | ((v: FlagValue | undefined, prev: GameState) => FlagValue)>;
```

`src/engine/step.ts`, `applyRule`: `for (const [k, v] of Object.entries(t.set)) state.flags[k] = typeof v === 'function' ? v(state.flags[k], s) : v;` (pass `s`, the untouched input state). Existing one-argument setters are unaffected.

- [ ] **Step 4: Rewrite `src/world/excel.ts`'s Jeff and hints**

Replace the `JEFF_FACTS`/`askJeff` block and the three `flaskHint`s with the stage model. Keep `PIECES`, `TOTALS`, `pieces`, `total`, `totalAfter`, `missing`, the WIN constants, `notYet`, `pivotDescribe`, the connect texts and the pivot rules.

```ts
export type ExcelStage = 0 | 1 | 2 | 3 | 4 | 5;
/** Where Jeff's quest is (spec1 §2.1): the flask hint, `goal` and Jeff all read this. */
export function excelStage(s: GameState): ExcelStage {
  if (s.flags['sq.excel.done']) return 5;
  if (!s.flags['excel.jeff.asked']) return 0;
  if (!s.flags['excel.connected']) return 1;
  if (!s.flags['excel.pivot']) return 2;
  if (pieces(s) < 3) return 3;
  return 4;
}

const CMD: Record<Piece, string> = { 'excel.dim': '`add sales region`', 'excel.measure': '`add net sales`', 'excel.filter': '`filter by year`' };
const NEED: Record<Piece, string> = { 'excel.dim': 'Sales Region in rows', 'excel.measure': 'Net Sales in values', 'excel.filter': 'the year filter' };
const missingCmds = (s: GameState): string => PIECES.filter((f) => !s.flags[f]).map((f) => CMD[f]).join(' / ');
const missingNeeds = (s: GameState): string => PIECES.filter((f) => !s.flags[f]).map((f) => NEED[f]).join(' / ');

/** The next-step line, one per stage. Same words from the flask, from `goal`, and (in character) from Jeff. */
export function stageLine(s: GameState): string {
  switch (excelStage(s)) {
    case 0: return 'Talk to Jeff first. `talk to jeff`.';
    case 1: return 'Go north to the Data tab and `analyze in excel`, then `sign in`.';
    case 2: return 'Go east to the PivotTable and `create pivot table`.';
    case 3: return `Add what's missing: ${missingCmds(s)}.`;
    case 4: return 'Back to Sheet1 (west) and `show jeff`.';
    default: return 'You fixed Jeff\'s export. That was the whole quest. `exit`.';
  }
}

/** How many times Jeff has been asked at the current stage (0 = not yet at this stage). */
const jeffTalks = (s: GameState): number => (s.flags['excel.jeff.stage'] === excelStage(s) ? Number(s.flags['excel.jeff.n']) || 0 : 0);

/** Stage 3 is composed in jeffSays() (it needs the total and the missing pieces); every other stage is a first line plus variants. */
const JEFF_LINES: Record<Exclude<ExcelStage, 3>, [first: string, ...variants: string[]]> = {
  0: [
    "\"It's 4.7. The report says 4.2. I exported the visual, I summed it, it's 4.7. Look, I trust my export. IT said something about 'Analyze in Excel' — that it connects to the actual model. It's on the Data tab. North. I never go north.\"",
    '"Analyze in Excel. Data tab. North. I said north. I meant it in the geographic sense."',
    '"Still 4.7. Still north. You keep asking like the answer is going to be south."',
  ],
  1: [
    '"The Data tab. North. It\'s a ribbon, not a country."',
    '"North. Up. The tab with the buttons on it. I don\'t click them; that\'s what you\'re for."',
    '"You have walked past the Data tab twice now. It is the one that says Data."',
  ],
  2: [
    '"Connected? Then make the pivot. The PivotTable sheet\'s east. Put the fields in. I\'d do it but I have a call."',
    '"East. The pivot. I named it PivotTable1 so you\'d find it. I\'m on a call. It\'s the same call."',
    '"Pivot. East. I have been on this call since Q2."',
  ],
  4: [
    '"Is it done? Show me. `show jeff`. I can\'t look. I\'m looking."',
    '"Show me. I won\'t look. I\'m looking. `show jeff`."',
    '"Just show me the pivot. I have my eyes closed. They\'re open. Show me."',
  ],
  5: [JEFF_DONE_TEXT, '"I said the report was right. Once. Under my breath. That\'s the quota."', '"We don\'t talk about the export any more. The export is in a better place. It\'s in Recycle Bin."'],
};

function jeffSays(s: GameState): string {
  const stage = excelStage(s);
  const n = jeffTalks(s);
  if (stage === 3) {
    const variants = [
      `"So far it says ${total(s)}. It needs ${missingNeeds(s)}."`,
      `"${total(s)}. Still not 4.2. It's missing ${missingNeeds(s)}. I'd help, but I'm on the call."`,
      `"You know what it needs. ${missingNeeds(s)}. I'm reading it off your screen."`,
    ];
    return variants[Math.min(n, variants.length - 1)]!;
  }
  const lines = JEFF_LINES[stage];
  return n === 0 ? lines[0] : lines[1 + ((n - 1) % (lines.length - 1))]!;
}

/** Every talk to Jeff: count talks at the stage, remember the stage, and (stage 0) unlock the quest's first step. */
const JEFF_TALK_SET = {
  'excel.jeff.n': (v: FlagValue | undefined, prev: GameState) => (prev.flags['excel.jeff.stage'] === excelStage(prev) ? (Number(v) || 0) + 1 : 1),
  'excel.jeff.stage': (_v: FlagValue | undefined, prev: GameState) => excelStage(prev),
  'excel.jeff.asked': true,
};
```

(import `FlagValue` from `./types`). Sheet1's rules become, in this order (the win rules stay first):

```ts
    rules: [
      { id: 'excel.jeff-done-give', when: { verb: 'give', noun: JEFF, flags: [{ flag: 'sq.excel.done' }] }, then: { text: JEFF_DONE_TEXT, outcome: 'snark' } },
      { id: 'excel.jeff-done-show', when: { verb: 'give', noun: PIVOT, noun2: JEFF, flags: [{ flag: 'sq.excel.done' }] }, then: { text: JEFF_DONE_TEXT, outcome: 'snark' } },
      { id: 'excel.show-jeff-done', when: { verb: 'give', noun: PIVOT, noun2: JEFF, flags: [...ALL_THREE, NOT_DONE] }, then: WIN },
      { id: 'excel.show-jeff-done-bare', when: { verb: 'give', noun: JEFF, flags: [...ALL_THREE, NOT_DONE] }, then: WIN },
      { id: 'excel.show-jeff-done-talk', when: { verb: 'talk', nounMatches: TALK_JEFF, flags: [...ALL_THREE, NOT_DONE] }, then: WIN },
      { id: 'excel.show-jeff-early', when: { verb: 'give', noun: PIVOT, noun2: JEFF }, then: { text: notYet, outcome: 'fail' } },
      { id: 'excel.show-jeff-early-bare', when: { verb: 'give', noun: JEFF }, then: { text: notYet, outcome: 'fail' } },
      // Talking to Jeff at any stage (done included): the stage line in character, a variant on repeats.
      { id: 'excel.ask-jeff', when: { verb: 'talk', nounMatches: TALK_JEFF }, then: { text: jeffSays, set: JEFF_TALK_SET, outcome: 'success' } },
    ],
```

Replace the three room `flaskHint`s with `flaskHint: stageLine`. Sheet1's `describe`:

```ts
    describe: (s) => `Sheet1. Grid paper to the horizon. Jeff at his desk, not crying, exactly, but close. His export is open: a column of numbers and a SUM at the bottom that says 4,712,331. On the second monitor, the report says 4.2M. The ribbon has a Data tab, north. There's a PivotTable sheet, east.${s.flags['sq.excel.done'] ? ' Jeff looks lighter.' : ''}`,
    items: ['export', 'monitor', 'report-monitor', 'ribbon', 'desk-jeff', 'tissues'],
```

(`monitor` sits before `report-monitor` so `look at monitor` resolves to the monitors, not to the report on the second one — `resolveNoun` takes the first suffix match.)

Delete the phrase `excel.analyze-sheet1` from `EXCEL_PHRASES` (on Sheet1, `analyze in excel` now walks north — the `excel.go-data` phrase below). Keep `excel.analyze-pivot`.

- [ ] **Step 5: The broadened commands**

Add these rules to `excel.data` (before `excel.connected-already`): a bare `analyze in excel` there parses as `use` with `verbWord: 'analyze'` and noun `in excel` → the existing `excel.connect-try` rule needs the noun `in excel` added to its list and `excel.connected-already`'s too. Add `'in excel'` to both noun lists. Add the license-less say forms: `SIGN_IN` already covers `sign in`/`log in`/`login`; add `'use license'` as a rule:

```ts
      { id: 'excel.connect-use-license', when: { verb: 'use', noun: LICENSE_NOUNS, has: ['license'], flags: [{ flag: 'excel.connected', not: true }] }, then: { text: CONNECT_TEXT, set: { 'excel.connected': true }, sfx: 'excel-ding', pointsKey: 'excel.connect' } },
      { id: 'excel.connect-use-license-lent', when: { verb: 'use', noun: LICENSE_NOUNS, flags: [{ flag: 'scroll.lent' }, { flag: 'excel.connected', not: true }] }, then: { text: CONNECT_LENT_TEXT, set: { 'excel.connected': true }, sfx: 'excel-ding', pointsKey: 'excel.connect' } },
```

In the pivot room, extend the noun lists: `DIM_NOUNS` add `'sales region in rows'`, `'sales region to rows'`; `MEASURE_NOUNS` add `'net sales in values'`, `'net sales to values'`; `FILTER_NOUNS` add `'to 2025'`, `'2025'`, `'year filter'`, `'year in filters'`, `'year to filters'`, `'year filters'`. (`put sales region in rows` parses as noun `sales region`, noun2 `rows`; `drag sales region to rows` has `drag` unknown → phrase below.) Add `drag` handling and the movement words as `EXCEL_PHRASES` entries with `then`, appended to the existing list in `excel.ts`:

```ts
  { id: 'excel.go-pivot', room: 'excel.sheet1', test: /^(go to |open |the )?(pivot|pivot ?table|pivottable1?)$/, text: '', then: { text: 'You click over to PivotTable1.', moveTo: 'excel.pivot', sfx: 'move' } },
  { id: 'excel.go-data', room: 'excel.sheet1', test: /^(go to |open |the )?(data tab|data|analy[sz]e in excel|connect)$/, text: '', then: { text: 'You click the Data tab. Jeff watches you go north like you are leaving the country.', moveTo: 'excel.data', sfx: 'move' } },
  { id: 'excel.drag', room: 'excel.pivot', test: /^(drag|move|put) (sales region|net sales|year|is current year|current year) (to|into|in) (the )?(rows|values|filters?)( area)?$/, text: '', then: (s, _w, line) => {
    const field = /^(?:drag|move|put) (sales region|net sales|year|is current year|current year) /.exec(line)![1]!;
    const key: Piece = field === 'sales region' ? 'excel.dim' : field === 'net sales' ? 'excel.measure' : 'excel.filter';
    if (!s.flags['excel.pivot']) return { id: 'excel.not-yet-pivot', then: { text: s.flags['excel.connected'] ? 'There is no pivot to drag that into yet. create pivot table.' : "Jeff's pivot only knows Jeff's export. Connect Analyze in Excel first (Data tab, north of Sheet1).", outcome: 'fail' } };
    return { id: key, then: PLACE[key] }; // the same step id as the build rule it stands in for
  } },
  { id: 'excel.compare', region: 'excel', test: /^(compare|look at (the )?difference|diff|what('s| is) the difference|why (is it|are they) different)\??$/, text: compareText },
  { id: 'excel.show-jeff-words', room: 'excel.sheet1', test: /^(show jeff the pivot|tell jeff|give (the )?pivot to jeff)$/, text: '', then: (s) => ({ id: 'excel.show-jeff-words', then: pieces(s) === 3 && !s.flags['sq.excel.done'] ? WIN : { text: notYet(s), outcome: 'fail' } }) },
```

`drag` is not a parser verb, so the phrase places the field itself through the same `then`s the three build rules use. Lift those `then`s into constants and point the rules at them:

```ts
const PLACE: Record<Piece, RuleThen> = {
  'excel.dim': { text: (s) => `Rows: Sales Region. Northeast appears exactly once. The pivot now says ${totalAfter(s, 'excel.dim')}.`, set: { 'excel.dim': true }, sfx: 'excel-ding' },
  'excel.measure': { text: (s) => `Values: Net Sales. Returns fall out of the number. The pivot now says ${totalAfter(s, 'excel.measure')}.`, set: { 'excel.measure': true }, sfx: 'excel-ding' },
  'excel.filter': { text: (s) => `Filters: Is Current Year = Yes. Three years of ancient history leave the total. The pivot now says ${totalAfter(s, 'excel.filter')}.`, set: { 'excel.filter': true }, sfx: 'excel-ding' },
};
// in the pivot room's rules:
      { id: 'excel.dim', when: { verb: 'use', verbWord: BUILD, noun: DIM_NOUNS, flags: [{ flag: 'excel.pivot' }] }, then: PLACE['excel.dim'] },
      { id: 'excel.measure', when: { verb: 'use', verbWord: BUILD, noun: MEASURE_NOUNS, flags: [{ flag: 'excel.pivot' }] }, then: PLACE['excel.measure'] },
      { id: 'excel.filter', when: { verb: 'use', verbWord: BUILD, noun: FILTER_NOUNS, flags: [{ flag: 'excel.pivot' }] }, then: PLACE['excel.filter'] },
```

(`PLACE` must be declared above `EXCEL_ROOMS`; the drag phrase runs before the rules, so `drag net sales to values` sets the flag exactly as `add net sales` does.) Define `compareText`:

```ts
const INFLATING: Record<Piece, string> = {
  'excel.dim': 'Region A counts Northeast twice',
  'excel.measure': 'Sales Amount still has Returns in it',
  'excel.filter': 'three years of history are still in there',
};
function compareText(s: GameState): string {
  if (!s.flags['excel.pivot']) return `Export: 4,712,331. Report: 4.2M. Pivot: 4.7M, because it is the export wearing a hat. Connect the model and build a real one; the difference explains itself.`;
  const left = PIECES.filter((f) => !s.flags[f]).map((f) => INFLATING[f]);
  if (!left.length) return `The pivot says 4.2M. So does the report. Jeff's export says 4.7M because it was wrong. Go show him.`;
  return `Export: 4,712,331. Pivot: ${total(s)}. Report: 4.2M. Still inflating it: ${left.join('; ')}.`;
}
```

- [ ] **Step 6: Items**

In `src/world/items.ts`, update `export`, `report-monitor`, `field-pane` and add three Sheet1 items:

```ts
  item({
    id: 'export', name: 'export', aliases: ['sales_export (3).csv', 'sales_export', 'csv', 'xlsx', 'spreadsheet', 'sheet', 'sales export', 'his export'],
    takeable: false,
    untakeableText: 'It is 1,048,576 rows. Jeff has it pinned. Jeff pins everything.',
    describe: 'Sales_export (3).csv. Every row of the visual, plus the Total row, plus three years of history, plus Returns counted as sales. SUM: 4,712,331. Jeff trusts it.',
  }),
  item({
    id: 'report-monitor', name: 'report', aliases: ['second monitor', 'published report', 'the report'],
    takeable: false,
    untakeableText: "It is on Jeff's second monitor. He has turned it away. You are not turning it back.",
    describe: 'The report. Net Sales, Northeast, this year: $4.2M. Certified. It has a little badge and everything.',
  }),
  item({
    id: 'monitor', name: 'monitor', aliases: ['monitors', 'screen', 'first monitor'],
    takeable: false,
    untakeableText: 'Two monitors, one desk, zero chance you are walking off with either.',
    describe: 'Two monitors. The left one has the export and a SUM. The right one has the report and is angled away, the way you angle a mirror you have stopped trusting.',
  }),
  item({
    id: 'desk-jeff', name: 'desk', aliases: ["jeff's desk", 'his desk', 'table'],
    takeable: false,
    untakeableText: 'The desk is Finance property. So, technically, is Jeff.',
    describe: "Jeff's desk. A keyboard with the F2 worn smooth, a mug that says WORLD'S OKAYEST ANALYST (no, a different one), and seventeen printouts of the same total.",
  }),
  item({
    id: 'tissues', name: 'tissue box', aliases: ['tissues', 'tissue', 'box of tissues', 'kleenex'],
    takeable: false,
    untakeableText: 'Jeff is going to need those. Leave them.',
    describe: 'A tissue box. Half empty. It was full this morning, before the report said 4.2.',
  }),
```

`field-pane` (always visible; the pre-connection text sends you north):

```ts
  item({
    id: 'field-pane', name: 'field list', aliases: ['fields', 'field pane', 'pane', 'field list', 'pivottable fields'],
    takeable: false,
    untakeableText: 'The field list is docked. It will undock itself later, at the worst possible moment.',
    describe: (s) => (s.flags['excel.connected']
      ? 'PivotTable Fields — Sales (Certified).\n'
        + '  Dimensions: Sales Region, Region A (legacy), Region B (legacy), Product, Salesperson, Date\n'
        + '  Measures: Net Sales, Sales Amount, Returns, Gross Sales, Sales YTD, Measure 2 (copy)\n'
        + '  Filters: Is Current Year, Year, Quarter\n'
        + 'The wrong ones are in the list on purpose. Nobody removes a field.'
      : "PivotTable Fields — Sales_export (3).csv: Region A, Sales Amount, and a column called Column1. This is Jeff's export. Connect Analyze in Excel (north of Sheet1) and the real model's fields appear."),
  }),
```

Remove `visibleWhen` from `field-pane`. Update `tests/excel.test.ts`: replace "Jeff explains his method one fact per ask, in order" with a test that `ask jeff` four times yields four non-identical lines and the first mentions `Data tab`; keep the rest (the `SOLVE` list still works because `use sales region` etc. remain accepted).

- [ ] **Step 7: Run everything and commit**

Run: `npx tsc -b && npm test && npm run lint:world` — Expected: green; golden + side quests still 200 + 45 (`tests/golden-plus-sidequests.test.ts`'s `EXCEL` list uses `ask jeff` at stage 0 and `use analyze in excel`, both still accepted).

```bash
git add src/world/types.ts src/engine/step.ts src/world/excel.ts src/world/items.ts tests/excel-stages.test.ts tests/excel.test.ts
git commit -m "excel: the story — stages 0–5, Jeff in character with variants, broadened commands, compare, field list"
```

---
### Task A3: Copilot — a conversation that remembers (the slot model)

**Files:**
- Modify: `src/world/copilot-ladder.ts` (slots, stages, replies; keep the whole-word matchers)
- Modify: `src/world/copilot.ts` (reply() accumulates; `start over`; pane hint)
- Modify: `src/scenes/copilot.tsx` (CARD keyed by stage; chip uses STAGE_HINTS)
- Modify: `src/scenes/index.tsx` (`num()` treats a negative as unset)
- Modify: `tests/copilot.test.ts` (rung → stage; listed below)
- Test: `tests/copilot-slots.test.ts`

**Voice:** read the voice skill first. Copilot's gimmick: relentlessly helpful, confidently wrong, shows you everything except the number.

**Interfaces:**
- Consumes: `PhraseRule.then` (D1); `GOAL.copilot` (A1) — the pane's first-time hint is the goal.
- Produces (from `copilot-ladder.ts`): `export type Stage = 0|1|2|3|4|5|6` (6 = win); `export type Slots = { model?: 'certified'|'final2'|'test'; measure?: 'net'|'amount'|'gross'|'returns'; region?: 'ne'|'other'; q4?: boolean; year?: number; one?: boolean }`; `export function parseSlots(raw: string): { slots: Slots; sales: boolean; tables: boolean }`; `export function mergeSlots(prev: Slots, next: Slots): Slots`; `export function stageOf(slots: Slots, sales: boolean): Stage`; `export function replyFor(slots: Slots, stage: Stage, opts: { tables: boolean; polite: boolean; nth: number }): { text: string; context: string; hint: string; shape: Shape }`; `export const STAGE_HINTS: Record<Stage, string>`; `WIN_FIGURE`, `SHAPE_INDEX`, `Shape` unchanged.
- Flags (world-side): `copilot.model` 0–3 (`MODEL_CODE`), `copilot.measure` 0–4 (`MEASURE_CODE`), `copilot.region` 0–2, `copilot.period` (boolean, Q4), `copilot.year` (the year or 0), `copilot.one` (boolean, wants one number), `copilot.stage` (last stage answered; −1 after `start over`), `copilot.stage.n` (replies at that stage). `copilot.last` = stage (6 on the win) and `copilot.shape` = `SHAPE_INDEX[shape]` keep feeding the scene. (The spec calls the last slot `copilot.shape`; it is named `copilot.one` here because `copilot.shape` already holds the drawn bubble.)
- Step ids: `copilot.stage.<n>`, `copilot.win`, `copilot.win-again`, `copilot.clear`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/copilot-slots.test.ts
import { describe, expect, it } from 'vitest';
import { mergeSlots, parseSlots, replyFor, stageOf, WIN_FIGURE } from '../src/world/copilot-ladder';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';

describe('parseSlots keeps the whole-word matchers', () => {
  it('model', () => {
    expect(parseSlots('use the certified model').slots.model).toBe('certified');
    expect(parseSlots('sales from final2').slots.model).toBe('final2');
    expect(parseSlots('sales from sales_test_DO_NOT_USE').slots.model).toBe('test');
    expect(parseSlots('the latest sales').slots.model).toBeUndefined(); // "latest" is not "test"
    expect(parseSlots('the uncertified model').slots.model).toBeUndefined();
  });
  it('measure, region, period, year, one', () => {
    expect(parseSlots('net sales').slots.measure).toBe('net');
    expect(parseSlots('sales amount').slots.measure).toBe('amount');
    expect(parseSlots('gross sales').slots.measure).toBe('gross');
    expect(parseSlots('for the northeast').slots.region).toBe('ne');
    expect(parseSlots('for the southeast').slots.region).toBe('other');
    expect(parseSlots('q4').slots.q4).toBe(true);
    expect(parseSlots('4th quarter').slots.q4).toBe(true);
    expect(parseSlots('2025').slots.year).toBe(2025);
    expect(parseSlots('2025q4').slots).toMatchObject({ q4: true, year: 2025 });
    expect(parseSlots('just the total').slots.one).toBe(true);
    expect(parseSlots('how much').slots.one).toBe(true);
    expect(parseSlots('total by product and by day').slots.one).toBe(false);
    expect(parseSlots('show me sales').sales).toBe(true);
    expect(parseSlots('show me the tables').tables).toBe(true);
  });
  it('mergeSlots keeps what was said before and overwrites what is said now', () => {
    expect(mergeSlots({ model: 'test', region: 'ne' }, { model: 'certified' })).toEqual({ model: 'certified', region: 'ne' });
  });
});

describe('stageOf: model → measure → region → period → shape', () => {
  it('walks the order', () => {
    expect(stageOf({}, false)).toBe(0);
    expect(stageOf({}, true)).toBe(1);
    expect(stageOf({ model: 'final2' }, true)).toBe(1);
    expect(stageOf({ model: 'certified' }, true)).toBe(2);
    expect(stageOf({ model: 'certified', measure: 'amount' }, true)).toBe(2);
    expect(stageOf({ model: 'certified', measure: 'net' }, true)).toBe(3);
    expect(stageOf({ model: 'certified', measure: 'net', region: 'ne' }, true)).toBe(4);
    expect(stageOf({ model: 'certified', measure: 'net', region: 'ne', q4: true }, true)).toBe(4);
    expect(stageOf({ model: 'certified', measure: 'net', region: 'ne', q4: true, year: 2025 }, true)).toBe(5);
    expect(stageOf({ model: 'certified', measure: 'net', region: 'ne', q4: true, year: 2025, one: true }, true)).toBe(6);
  });
  it('a slot set without the sales word still counts', () => expect(stageOf({ model: 'certified' }, false)).toBe(2));
});

describe('replyFor shows the wrong thing for the stage', () => {
  const base = { tables: false, polite: false, nth: 1 };
  it('stage 0: the top 5 things', () => expect(replyFor({}, 0, base).text).toMatch(/top 5 things in your tenant/));
  it('stage 1: three models, or the 14 tables', () => {
    expect(replyFor({}, 1, base).text).toMatch(/3 semantic models with sales: Sales \(Certified\), Sales_v3_FINAL_final2, sales_test_DO_NOT_USE\. Which one\?/);
    expect(replyFor({}, 1, { ...base, tables: true }).text).toMatch(/14 tables/);
    expect(replyFor({ model: 'test' }, 1, base).text).toBe('From sales_test_DO_NOT_USE: $12. The sign said not to. I did anyway.');
    expect(replyFor({ model: 'final2' }, 1, base).context).toBe('[Understood: model = Sales_v3_FINAL_final2]');
  });
  it('stage 2: six measures, the table, or the includes-Returns joke', () => {
    const c = { model: 'certified' as const };
    expect(replyFor(c, 2, base).text).toMatch(/6 measures: Sales Amount, Net Sales, Gross Sales, Returns, Sales YTD, Measure 2 \(copy\)\. Which\?/);
    expect(replyFor(c, 2, { ...base, tables: true }).text).toMatch(/The Sales table has 400 rows/);
    expect(replyFor({ ...c, measure: 'amount' }, 2, base).text).toMatch(/includes Returns/);
    expect(replyFor(c, 2, base).context).toBe('[Understood: model = Sales (Certified)]');
  });
  it('stage 3, 4, 5, 6', () => {
    const c = { model: 'certified' as const, measure: 'net' as const };
    expect(replyFor(c, 3, base).text).toMatch(/\$4,201,377 — all regions, all time\. Did you want a region\?/);
    expect(replyFor({ ...c, region: 'ne' }, 4, base).text).toMatch(/\$2,933,012\. Since 2019/);
    expect(replyFor({ ...c, region: 'ne', q4: true }, 4, base).text).toMatch(/400 rows/);
    expect(replyFor({ ...c, region: 'ne', q4: true, year: 2025 }, 5, base).text).toMatch(/by product, by day, by salesperson, pivoted, 3 pages/);
    expect(replyFor({ ...c, region: 'ne', q4: true, year: 2025, one: true }, 6, base).text).toBe(`Q4 2025 Northeast Net Sales, Sales (Certified): ${WIN_FIGURE}.`);
    expect(replyFor({ ...c, region: 'ne', q4: true, year: 2019, one: true }, 6, base).text).toMatch(/assumed 2025/);
  });
  it('hints: soft, then explicit on the third reply', () => {
    expect(replyFor({ model: 'certified' }, 2, base).hint).toBe('Try: net sales.');
    expect(replyFor({ model: 'certified' }, 2, { ...base, nth: 3 }).hint).toBe('Say: NET SALES.');
  });
  it('please', () => expect(replyFor({}, 1, { ...base, polite: true }).text).toMatch(/You're welcome!$/));
});

describe('in the pane: accumulation', () => {
  const at = (cmds: string[]) => { let s = { ...newGame(WORLD, 5), room: 'copilot.pane', flags: { 'sq.return': 1 } }; const rs = []; for (const c of cmds) { const r = step(s, c, WORLD); s = r.state; rs.push(r); } return { s, rs }; };
  it('one piece at a time, in any order, ends in the win', () => {
    const { s, rs } = at(['show me sales', 'use the certified model', 'net sales', 'for the northeast', 'q4 2025', 'just the total']);
    expect(rs.map((r) => r.stepId)).toEqual(['copilot.stage.1', 'copilot.stage.2', 'copilot.stage.3', 'copilot.stage.4', 'copilot.stage.5', 'copilot.win']);
    expect(s.bonus).toBe(25); expect(s.room).toBe('village.square');
  });
  it('any order: the reply is for the first missing slot', () => {
    const { rs } = at(['just the total for q4 2025', 'northeast net sales', 'certified']);
    expect(rs[0]!.stepId).toBe('copilot.stage.1');
    expect(rs[1]!.stepId).toBe('copilot.stage.1');
    expect(rs[2]!.stepId).toBe('copilot.win');
  });
  it('a wrong model is used happily until the certified one is named', () => {
    const { rs } = at(['sales from sales_test_do_not_use', 'net sales northeast q4 2025 total', 'the certified one']);
    expect(rs[0]!.output[0]).toMatch(/\$12\. The sign said not to/);
    expect(rs[1]!.output[0]).toMatch(/\$12/);
    expect(rs[2]!.stepId).toBe('copilot.win');
  });
  it('a wrong measure keeps the slot until net sales', () => {
    const { rs } = at(['certified sales amount', 'northeast', 'net sales']);
    expect(rs[1]!.output[0]).toMatch(/includes Returns/);
    expect(rs[2]!.stepId).toBe('copilot.stage.3');
  });
  it('a prompt that adds nothing gets the consistency line plus the hint; the third reply at a stage is explicit', () => {
    const { rs } = at(['certified sales', 'certified sales again please', 'certified please']);
    expect(rs[1]!.output[0]).toMatch(/I am consistent/);
    expect(rs[2]!.output[0]).toMatch(/Say: NET SALES\./);
  });
  it('start over forgets everything', () => {
    const { rs, s } = at(['certified net sales northeast', 'start over', 'q4 2025 just the total']);
    expect(rs[1]!.output[0]).toBe("New chat. I remember nothing. It's my best feature.");
    expect(rs[2]!.stepId).toBe('copilot.stage.1');
    expect(s.flags['copilot.model']).toBe(0);
  });
  it('a single perfect prompt still wins in one turn; re-win has no cha-ching', () => {
    const win = 'total q4 2025 northeast net sales from the certified model, just the number';
    const { rs } = at([win]);
    expect(rs[0]!.stepId).toBe('copilot.win'); expect(rs[0]!.sfx).toBe('bonus');
    const again = at([win, 'copilot', win]).rs[2]!;
    expect(again.stepId).toBe('copilot.win-again'); expect(again.sfx).not.toBe('bonus');
  });
  it('the context line lists what it understood', () => {
    const { rs } = at(['certified net sales']);
    expect(rs[0]!.output[0]).toMatch(/\[Understood: model = Sales \(Certified\) · measure = Net Sales\]/);
  });
  it('the first-time flask hint is the goal', () => {
    expect(at(['get ye flask']).rs[0]!.output[0]).toMatch(/Ask for Q4 2025 Northeast net sales from the certified model\. Start anywhere/);
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run tests/copilot-slots.test.ts`
Expected: FAIL — `parseSlots` is not exported.

- [ ] **Step 3: Rewrite `src/world/copilot-ladder.ts`**

```ts
/**
 * Copilot's slot model (spec1 §2.2). Pure. A prompt sets every slot it mentions; the reply is for the first missing
 * slot in the order model → measure → region → period → shape, and always shows something wrong-but-plausible.
 * The matchers are whole-word, as before: "latest" is not "test", "uncertified" is not "certified".
 */
export type Stage = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type Shape = 'list' | 'table' | 'raw' | 'card' | 'text' | 'report';
export type Model = 'certified' | 'final2' | 'test';
export type Measure = 'net' | 'amount' | 'gross' | 'returns';
export type Slots = { model?: Model; measure?: Measure; region?: 'ne' | 'other'; q4?: boolean; year?: number; one?: boolean };
export const SHAPE_INDEX: Record<Shape, number> = { list: 0, table: 1, raw: 2, card: 3, text: 4, report: 5 };
export const WIN_FIGURE = '$1,247,930';
export const MODEL_NAME: Record<Model, string> = { certified: 'Sales (Certified)', final2: 'Sales_v3_FINAL_final2', test: 'sales_test_DO_NOT_USE' };
export const MEASURE_NAME: Record<Measure, string> = { net: 'Net Sales', amount: 'Sales Amount', gross: 'Gross Sales', returns: 'Returns' };
export const MODEL_CODE: Record<Model, number> = { certified: 1, final2: 2, test: 3 };
export const MEASURE_CODE: Record<Measure, number> = { net: 1, amount: 2, gross: 3, returns: 4 };

export const STAGE_HINTS: Record<Stage, string> = {
  0: 'Try asking about sales.', 1: 'Try: use the certified model.', 2: 'Try: net sales.', 3: 'Try: for the Northeast.', 4: 'Try: Q4 2025.', 5: 'Try: just the total.', 6: '',
};
const EXPLICIT: Record<Stage, string> = {
  0: 'Say: SALES.', 1: 'Say: THE CERTIFIED MODEL.', 2: 'Say: NET SALES.', 3: 'Say: NORTHEAST.', 4: 'Say: Q4 2025.', 5: 'Say: JUST THE TOTAL.', 6: '',
};

const clean = (raw: string) => raw.toLowerCase().replace(/[^a-z0-9$_ ]+/g, ' ').replace(/\s+/g, ' ').trim();
const has = (p: string, re: RegExp) => re.test(p);
const BY = /\bby (product|day|salesperson|month|week|store|hour|region|customer|quarter|year)\b/;
const ONE = /\btotal\b|\bsum\b|how much|just the (number|total)|one number|as a card|only the total|single number|the number|\bnumber\b/;

export function parseSlots(raw: string): { slots: Slots; sales: boolean; tables: boolean } {
  const p = clean(raw);
  const slots: Slots = {};
  if (has(p, /(?<![a-z0-9])certified/)) slots.model = 'certified';
  else if (has(p, /final ?2|final_final|v3/)) slots.model = 'final2';
  else if (has(p, /(?<![a-z0-9])(test|do[_ ]?not[_ ]?use)(?![a-z0-9])/)) slots.model = 'test';
  if (has(p, /net sales/)) slots.measure = 'net';
  else if (has(p, /sales amount|\bamount\b/)) slots.measure = 'amount';
  else if (has(p, /gross sales|\bgross\b/)) slots.measure = 'gross';
  else if (has(p, /\breturns?\b/)) slots.measure = 'returns';
  if (has(p, /north ?east|\bne\b/)) slots.region = 'ne';
  else if (has(p, /\b(southeast|midwest|west|south|north|east|unknown|emea|apac|europe)\b/)) slots.region = 'other';
  if (has(p, /\bq4\b|\b(fourth|4th) quarter\b|\bquarter (4|four)\b|\b20\d\dq4\b/)) slots.q4 = true;
  const year = /(?<![a-z0-9])(20\d\d)(?:q4)?(?![a-z0-9])/.exec(p)?.[1];
  if (year) slots.year = Number(year);
  if (has(p, BY)) slots.one = false;
  else if (has(p, ONE)) slots.one = true;
  return { slots, sales: has(p, /\bsales?\b/), tables: has(p, /\btables?\b/) };
}

export function mergeSlots(prev: Slots, next: Slots): Slots {
  const out: Slots = { ...prev };
  for (const [k, v] of Object.entries(next)) if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  return out;
}

export function stageOf(slots: Slots, sales: boolean): Stage {
  if (!sales && Object.keys(slots).length === 0) return 0;
  if (slots.model !== 'certified') return 1;
  if (slots.measure !== 'net') return 2;
  if (slots.region !== 'ne') return 3;
  if (!slots.q4 || !slots.year) return 4;
  if (!slots.one) return 5;
  return 6;
}

const FOURTEEN = 'I found 14 tables with "sales" in the name across 3 semantic models: Sales, Sales_2, SalesFact, Sales Fact, sales_bronze, sales_silver, sales_gold, Sales (old), Sales (older), Sales_v3, Sales_v3_FINAL, Sales_v3_FINAL_final2, sales_test, and Sales. Which one?';

function contextOf(slots: Slots): string {
  const bits: string[] = [];
  if (slots.model) bits.push(`model = ${MODEL_NAME[slots.model]}`);
  if (slots.measure) bits.push(`measure = ${MEASURE_NAME[slots.measure]}`);
  if (slots.region) bits.push(`region = ${slots.region === 'ne' ? 'Northeast' : 'not the Northeast'}`);
  if (slots.q4 || slots.year) bits.push(`period = ${slots.q4 ? 'Q4' : 'some quarter'} ${slots.year ? (slots.year === 2025 ? '2025' : '2025 (assumed)') : '…'}`.trim());
  if (slots.one) bits.push('shape = one number');
  return `[Understood: ${bits.length ? bits.join(' · ') : '—'}]`;
}

export function replyFor(slots: Slots, stage: Stage, opts: { tables: boolean; polite: boolean; nth: number }): { text: string; context: string; hint: string; shape: Shape } {
  const yearNote = slots.year && slots.year !== 2025 ? " (I only have 2019–2025. I've assumed 2025.)" : '';
  const done = (text: string, shape: Shape) => ({ text: text + (opts.polite ? " You're welcome!" : ''), context: contextOf(slots), hint: opts.nth >= 3 ? EXPLICIT[stage] : STAGE_HINTS[stage], shape });
  switch (stage) {
    case 0: return done("I can help with that! Here are the top 5 things in your tenant: a lakehouse, a lakehouse, a report named 'test', a lakehouse, and a warehouse called DO NOT DELETE.", 'list');
    case 1:
      if (slots.model === 'final2') return done('From Sales_v3_FINAL_final2: Sales: $9,104,220. Note: this model is not endorsed. I picked it because it has the most rows.', 'table');
      if (slots.model === 'test') return done('From sales_test_DO_NOT_USE: $12. The sign said not to. I did anyway.', 'table');
      return done(opts.tables ? FOURTEEN : 'I found 3 semantic models with sales: Sales (Certified), Sales_v3_FINAL_final2, sales_test_DO_NOT_USE. Which one?', 'list');
    case 2:
      if (slots.measure === 'amount') return done("Sales Amount, Sales (Certified): $4,285,337. That includes Returns. Returns are $83,960. Just so you know. I didn't subtract them. You didn't ask.", 'card');
      if (slots.measure === 'gross') return done('Gross Sales, Sales (Certified): $4,285,337. Gross is Sales Amount with a nicer name. Returns are still in there.', 'card');
      if (slots.measure === 'returns') return done('Returns, Sales (Certified): $83,960. That is the opposite of what you sell. I can subtract it from something if you name the something.', 'card');
      return done(opts.tables ? 'From Sales (Certified): 14 tables. The Sales table has 400 rows. Here they are.' : 'Sales in Sales (Certified): I found 6 measures: Sales Amount, Net Sales, Gross Sales, Returns, Sales YTD, Measure 2 (copy). Which?', opts.tables ? 'raw' : 'list');
    case 3:
      if (slots.region === 'other') return done('Net Sales, Sales (Certified), the region you named: $998,101, all time. That is not the Northeast, if you were wondering. Did you want the Northeast?', 'card');
      return done('Net Sales, Sales (Certified): $4,201,377 — all regions, all time. Did you want a region? I can do regions: Northeast, Southeast, Midwest, West, Unknown.', 'card');
    case 4:
      if (slots.q4) return done("Q4 Northeast Net Sales… here are 400 rows. I've included every product, every day, and a column called Column1." + yearNote, 'raw');
      return done('Northeast Net Sales, all time: $2,933,012. Since 2019. Also some from 2018 that were keyed in late. Which quarter?', 'card');
    case 5: return done('Q4 2025 Northeast Net Sales, Sales (Certified) — by product, by day, by salesperson, pivoted, 3 pages.' + yearNote, 'report');
    default: return done(`Q4 2025 Northeast Net Sales, Sales (Certified): ${WIN_FIGURE}.${yearNote}`, 'card');
  }
}
```

- [ ] **Step 4: `src/world/copilot.ts` — accumulate, clear, first-time hint**

Replace the imports and `reply()`:

```ts
import { MEASURE_CODE, MODEL_CODE, SHAPE_INDEX, STAGE_HINTS, WIN_FIGURE, mergeSlots, parseSlots, replyFor, stageOf, type Measure, type Model, type Slots, type Stage } from './copilot-ladder';

const MODELS: Model[] = ['certified', 'final2', 'test'];
const MEASURES: Measure[] = ['net', 'amount', 'gross', 'returns'];
/** The slots as stored in flags (0 / false = unset). */
export function slotsOf(s: GameState): Slots {
  const out: Slots = {};
  const m = Number(s.flags['copilot.model']) || 0; if (m) out.model = MODELS[m - 1];
  const me = Number(s.flags['copilot.measure']) || 0; if (me) out.measure = MEASURES[me - 1];
  const r = Number(s.flags['copilot.region']) || 0; if (r) out.region = r === 1 ? 'ne' : 'other';
  if (s.flags['copilot.period']) out.q4 = true;
  const y = Number(s.flags['copilot.year']) || 0; if (y) out.year = y;
  if (s.flags['copilot.one']) out.one = true;
  return out;
}
const slotFlags = (sl: Slots) => ({
  'copilot.model': sl.model ? MODEL_CODE[sl.model] : 0, 'copilot.measure': sl.measure ? MEASURE_CODE[sl.measure] : 0,
  'copilot.region': sl.region === 'ne' ? 1 : sl.region === 'other' ? 2 : 0, 'copilot.period': !!sl.q4, 'copilot.year': sl.year ?? 0, 'copilot.one': !!sl.one,
});
export const CLEAR_FLAGS = { ...slotFlags({}), 'copilot.stage': -1, 'copilot.stage.n': 0, 'copilot.last': -1, 'copilot.shape': -1 };

function reply(s: GameState, line: HeardLine): { then: RuleThen; id: string } {
  const parsed = parseSlots(promptOf(line.command));
  const before = slotsOf(s);
  const slots = mergeSlots(before, parsed.slots);
  const changed = JSON.stringify(slots) !== JSON.stringify(before);
  const stage: Stage = stageOf(slots, parsed.sales || Object.keys(slots).length > 0);
  const prevStage = Number(s.flags['copilot.stage'] ?? -1);
  const nth = prevStage === stage ? (Number(s.flags['copilot.stage.n']) || 0) + 1 : 1;
  const r = replyFor(slots, stage, { tables: parsed.tables, polite: /\bplease\b/i.test(line.raw), nth });
  const again = !changed && prevStage >= 0 ? SAME_AGAIN_TEXT : '';
  const feedback = frustrated(line) ? FEEDBACK_TEXT : '';
  const hint = r.hint ? `\n[Copilot suggests: ${r.hint}]` : '';
  const base: RuleThen = {
    text: `Copilot: ${r.text}${again}${feedback}\n${r.context}${hint}`,
    set: { ...slotFlags(slots), 'copilot.stage': stage, 'copilot.stage.n': nth, 'copilot.last': stage, 'copilot.shape': SHAPE_INDEX[r.shape] },
    sfx: 'copilot-think',
    outcome: stage === 6 ? 'success' : 'fail',
  };
  if (stage === 6) {
    if (s.flags['sq.copilot.done']) return { id: 'copilot.win-again', then: { ...base, text: `Copilot: ${WIN_FIGURE}. ${ALREADY_TEXT}` } };
    return { id: 'copilot.win', then: { ...base, bonus: 25, pointsKey: 'sq.copilot', set: { ...base.set, 'sq.copilot.done': true }, sfx: 'bonus', returnTo: true } };
  }
  return { id: `copilot.stage.${stage}`, then: base };
}
```

`paneHint`:

```ts
function paneHint(s: GameState): string {
  if (s.flags['sq.copilot.done']) return 'You got the number. That was the whole quest. exit.';
  const stage = Number(s.flags['copilot.stage'] ?? -1);
  if (stage < 0) return 'Ask for Q4 2025 Northeast net sales from the certified model. Start anywhere; Copilot will tell you what it wants.';
  return `${STAGE_HINTS[stage as Stage] || 'Ask again.'} (The Model Gallery, east, has names worth knowing.)`;
}
```

Add to `COPILOT_PHRASES` (still registered right after SIDEQUEST_PHRASES/GOAL_PHRASES; order within the list: `copilot.here`, `copilot.gallery-copilot`, then this):

```ts
  { id: 'copilot.clear', room: 'copilot.pane', test: /^(start over|clear|new chat|reset)$/, text: '', then: { text: "New chat. I remember nothing. It's my best feature.", set: CLEAR_FLAGS, sfx: 'copilot-think', outcome: 'snark' } },
```

`lastAnswer(s)` is unchanged (it reads `copilot.shape`); make its `typeof s.flags['copilot.last'] === 'number'` check also require `Number(s.flags['copilot.stage']) >= 0` so a cleared chat reads "is empty. It is waiting for you" again.

- [ ] **Step 5: The scene**

In `src/scenes/copilot.tsx`: import `STAGE_HINTS, type Stage` instead of `RUNG_HINTS, type Rung`; `CARD` becomes keyed by stage:

```ts
const CARD: Partial<Record<number, [string, string]>> = {
  2: ['Sales Amount', '$4,285,337'],
  3: ['Net Sales, all regions', '$4,201,377'],
  4: ['Northeast Net Sales', '$2,933,012'],
  6: ['Q4 2025 NE Net Sales', WIN_FIGURE],
};
```

and the chip: `const chip = rung === undefined || rung < 0 ? 'Try: What are my sales?' : STAGE_HINTS[rung as Stage] || 'Copy to clipboard';`. In `src/scenes/index.tsx`, `num()` treats a negative as unset (a cleared chat draws the empty bubble again): `const num = (v: unknown): number | undefined => (typeof v === 'number' && v >= 0 ? v : undefined);`. `tests/scenes.test.ts` passes unchanged (it varies `copilot.shape` only).

- [ ] **Step 6: Update `tests/copilot.test.ts`**

Delete the `describe('the ladder', …)` block (covered by `copilot-slots.test.ts`). Then:
- "any unhandled line is a prompt…": expect `/3 semantic models/` instead of `/fourteen|14 tables/`.
- "step ids are copilot.rung.N…": prompts `['sales', 'show me sales', 'show me q4 northeast sales from the certified model', 'ask copilot for total net sales for the northeast region in q4 2025 from the certified model, just the number']` → ids `['copilot.stage.1', 'copilot.stage.1', 'copilot.stage.2', 'copilot.win']`; `flags['copilot.last']` after the second is `1`, `copilot.shape` `0`; after the third `copilot.shape` is `0` (the six-measures list); keep the room/sfx assertions; the suggests line reads `Copilot suggests: Try: use the certified model.`
- "lines starting with parser verbs are still prompts": `/^copilot\.stage\./`.
- "look describes the last answer; the flask names the last hint": after `show me q4 northeast sales from the certified model`, `look` matches `/is a list/` and the flask matches `/net sales/`.
- "M2": the long prompt reaches `copilot.last === 5` and `look` matches `/three pages/`; unchanged otherwise.
- "I5 … enters and asks it on the same turn": `stepId` matches `/^copilot\.stage\./`; the four "enters with a prompt" cases expect `copilot.stage.1`.
Everything else in the file passes as is.

- [ ] **Step 7: Run everything and commit**

Run: `npx tsc -b && npm test && npm run lint:world` — Expected: green; `tests/golden-plus-sidequests.test.ts` still 200 + 45 (its `COPILOT` list ends in the one-shot winning prompt).

```bash
git add src/world/copilot-ladder.ts src/world/copilot.ts src/scenes/copilot.tsx tests/copilot-slots.test.ts tests/copilot.test.ts
git commit -m "copilot: slot model — accumulates across prompts, answers the first missing slot, start over"
```

---

### Task B1: NPC talk escalation, nicknames at 4+, brush-offs for every NPC

**Files:**
- Modify: `src/world/types.ts` (Npc.talkMore, Npc.brushOff)
- Modify: `src/engine/step.ts` (talk counter in finish())
- Modify: `src/engine/builtins.ts` (talkTo(); talk case uses it)
- Modify: `src/world/npcs.ts` (talkMore + brushOff for every NPC)
- Modify: `src/world/fortress.ts` (drop `fortress.talk-cardinality`; `fortress.talk-card` uses talkTo)
- Modify: `src/world/peaks.ts` (a shrine talk rule so Throttlor uses talkTo)
- Modify: `src/world/globals.ts` (`global.talk-dragon-elsewhere` loses its shrine branch)
- Test: `tests/npc-talk.test.ts`

**Voice:** read the voice skill first — especially "Progress gate, repeated with variants" and "NPC dialogue" in `reference/response-patterns.md`. One gimmick per NPC, every line.

**Interfaces:**
- Consumes: `nick()`, `rotate()`, `BRUSHOFFS` (D1).
- Produces: `Npc.talkMore?: (s: GameState, n: number) => string` (n = this talk's number, 2 and up); `Npc.brushOff?: string` (lint in Task E9 requires it on every NPC); flag `talk.<npcId>` = number of talks so far, incremented by the engine after every `talk` verb whose noun resolves to an NPC in the room, whoever answered (rule or builtin); `export function talkTo(s: GameState, world: World, npc: Npc, topic?: string): string` in `builtins.ts`.
- Engine default when an NPC has no `talkMore`: talk 2 → `${name} says the same thing, slower. ${talk}`; talk 3+ → `${name}, slower still: '${room.flaskHint(s)}'`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/npc-talk.test.ts
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { BRUSHOFFS, NICKNAMES } from '../src/world/voice';
import type { GameState } from '../src/engine/types';

const talk = (room: string, npc: string, n: number, extra: Partial<GameState> = {}) => {
  let s: GameState = { ...newGame(WORLD, 4), room, ...extra };
  const outs: string[] = [];
  for (let i = 0; i < n; i++) { const r = step(s, `talk to ${npc}`, WORLD); s = r.state; outs.push(r.output[0]!); }
  return { s, outs };
};
const anyNick = new RegExp(NICKNAMES.map((n) => n.replace(/[-]/g, '\\-')).join('|'));

describe('talk counters and escalation (spec1 §3.1)', () => {
  it('counts every talk aimed at an NPC, whoever answered', () => {
    expect(talk('village.square', 'jeff', 3).s.flags['talk.jeff']).toBe(3);
    expect(talk('fortress.model', 'sir cardinality', 2).s.flags['talk.cardinality']).toBe(2);
    expect(talk('village.mill', 'miller', 1).s.flags['talk.miller']).toBe(1); // the credentials rule answered
  });
  it.each([
    ['village.square', 'jeff'], ['village.mill', 'miller'], ['lake.dock', 'ferryman'], ['monastery.gate', 'monk'], ['monastery.cloister', 'abbot'],
    ['monastery.spark', 'brother pandas'], ['monastery.library', 'librarian'], ['fortress.bridge', 'guard'], ['fortress.throne', 'duke'],
    ['fortress.model', 'sir cardinality'], ['fortress.yard', 'card'], ['peaks.shrine', 'throttlor'], ['village.fields', 'manual'],
  ])('%s / %s: talks 1–4 are four different lines, 3 carries a hint, 4 carries a nickname', (room, npc) => {
    const { outs } = talk(room, npc, 5);
    expect(new Set(outs.slice(0, 4)).size).toBe(4);
    expect(outs[3]).toMatch(anyNick);
    expect(outs[4]).toMatch(anyNick);
    expect(outs[4]).not.toBe(outs[3]); // the nickname rotation moves
  });
  it('the guard: SKU checklist, then the spelled-out hint, then Matthew-Broderick energy with our own names', () => {
    const { outs } = talk('fortress.bridge', 'guard', 4);
    expect(outs[0]).toBe('"HALT! State your SKU!"');
    expect(outs[2]).toMatch(/S-K-U\. Trial's free/);
    expect(outs[3]).toMatch(/Still no SKU|Almost there|Say it/);
    const done = talk('fortress.bridge', 'guard', 4, { flags: { 'bridge.down': true } });
    expect(done.outs[3]).toMatch(/Lookin' good, Mr\. Trial\./);
  });
  it('the engine default: same thing slower, then the flask hint', () => {
    const w = { ...WORLD, npcs: { ...WORLD.npcs, bob: { id: 'bob', name: 'Bob', aliases: [], describe: () => 'Bob.', talk: () => 'Hi.' } }, rooms: { ...WORLD.rooms, 'village.cottage': { ...WORLD.rooms['village.cottage']!, npcs: ['bob'] } } };
    let s = newGame(w, 1);
    const outs: string[] = [];
    for (let i = 0; i < 3; i++) { const r = step(s, 'talk to bob', w); s = r.state; outs.push(r.output[0]!); }
    expect(outs).toEqual(['Hi.', 'Bob says the same thing, slower. Hi.', `Bob, slower still: '${w.rooms['village.cottage']!.flaskHint(s)}'`]);
  });
  it('ask <npc> about <unknown> is the brush-off, in the gimmick', () => {
    expect(step({ ...newGame(WORLD, 4), room: 'village.square' }, 'ask jeff about the weather', WORLD).output[0]).toBe(BRUSHOFFS.jeff);
    expect(step({ ...newGame(WORLD, 4), room: 'monastery.library' }, 'ask librarian about dragons', WORLD).output[0]).toBe(BRUSHOFFS.librarian);
    expect(step({ ...newGame(WORLD, 4), room: 'lake.dock' }, 'ask ferryman about the weather', WORLD).output[0]).toBe(BRUSHOFFS.ferryman);
  });
  it('every NPC has brushOff and (except the ones with room-rule variants) talkMore', () => {
    for (const npc of Object.values(WORLD.npcs)) {
      expect(npc.brushOff, npc.id).toBe(BRUSHOFFS[npc.id]);
      if (!['jeff-excel'].includes(npc.id)) expect(typeof npc.talkMore, npc.id).toBe('function');
    }
  });
  it('the Card and Throttlor escalate through their room rules', () => {
    expect(talk('fortress.yard', 'card', 2, { flags: { 'stare.done': true } }).outs[1]).toMatch(/slightly louder/);
    expect(talk('peaks.shrine', 'throttlor', 2).outs[1]).toMatch(/repeats, slower, with more smoke/);
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run tests/npc-talk.test.ts`
Expected: FAIL — `talk.jeff` undefined; lines identical.

- [ ] **Step 3: Types, the counter, `talkTo()`**

`src/world/types.ts`, `Npc`:

```ts
  /** Talk 2 and up (spec1 §3.1): a variant, then the variant plus the hint, then nickname lines. Without it the engine's default escalation runs. */
  talkMore?: (s: GameState, n: number) => string;
  /** `ask <npc> about <unknown>`, in the NPC's gimmick. World lint requires it. */
  brushOff?: string;
```

`src/engine/step.ts`, in `finish()` after the sign-off block (3a') add:

```ts
    // 3d. Per-NPC talk counter (spec1 §3.1): a talk aimed at an NPC who is here counts, whoever answered it.
    if (parsedEarly.verb === 'talk' && parsedEarly.noun && !result.state.dead) {
      const who = B.resolveNoun(base, world, parsedEarly.noun);
      if (who?.kind === 'npc') {
        const k = `talk.${who.npc.id}`;
        result = { ...result, state: { ...result.state, flags: { ...result.state.flags, [k]: (Number(result.state.flags[k]) || 0) + 1 } } };
      }
    }
```

`src/engine/builtins.ts`:

```ts
/** The NPC's line for this talk: line 1, then the escalation (Npc.talkMore, or the engine default). `topic` is an unknown `about` subject → the brush-off. */
export function talkTo(s: GameState, world: World, npc: Npc, topic?: string): string {
  if (topic) return npc.brushOff ?? `${npc.name} has nothing to say about ${topic}.`;
  const n = (Number(s.flags[`talk.${npc.id}`]) || 0) + 1;
  if (n === 1) return npc.talk(s);
  if (npc.talkMore) return npc.talkMore(s, n);
  return n === 2 ? `${npc.name} says the same thing, slower. ${npc.talk(s)}` : `${npc.name}, slower still: '${world.rooms[s.room]!.flaskHint(s)}'`;
}
```

and in `case 'talk'` replace `return { state: s, output: [r.npc.talk(s)], outcome: 'success' };` with `return { state: s, output: [talkTo(s, world, r.npc, cmd.noun2)], outcome: 'success' };`.

- [ ] **Step 4: Every NPC's `talkMore` and `brushOff` (`src/world/npcs.ts`)**

Import `{ BRUSHOFFS, nick, rotate }` from `'./voice'`. Add `brushOff: BRUSHOFFS.<id>` to every NPC, and these `talkMore`s (the Card and Throttlor get theirs here too; their room rules call `talkTo`):

```ts
// jeff
    talkMore: (s, n) => {
      const done = !!s.flags['sq.excel.done'], calm = !!s.flags['jeff.pacified'];
      if (done && calm) return n === 2 ? '"Told no one," Jeff says again. "Telling you doesn\'t count. You were there."'
        : n === 3 ? '"The report was right and I have a mug and I would like, now, to be left alone with both. The dragon is east. I read the board."'
        : rotate(s, [`"Lookin' good, ${nick(s)}. The dragon's east. I read the board."`, `"Nothing left in me, ${nick(s)}. Go be Worthy."`, `"I'm content, ${nick(s)}. It's unsettling for both of us."`]);
      if (done) return n === 2 ? '"The report was right," Jeff says, quieter, looking at his empty hand.'
        : n === 3 ? '"I told no one. I\'d tell a mug, if I had one. There\'s one on your desk. West."'
        : rotate(s, [`"Still no mug, ${nick(s)}. I proved the report right and got nothing to drink out of."`, `"Almost there, ${nick(s)}. Cottage. Desk. Mug. Me."`, `"I can be right AND thirsty, ${nick(s)}. I'm doing it now."`]);
      if (calm) return n === 2 ? '"The numbers, though," Jeff says into his mug. "They don\'t match. I have Excel open." (Say: help jeff.)'
        : n === 3 ? '"Come look at Excel. Say help jeff. I\'ll do the clicking. No I won\'t."'
        : rotate(s, [`"Lookin' good, ${nick(s)}. Now the spreadsheet."`, `"help jeff, ${nick(s)}. Two words. It's a spreadsheet, not a schema."`, `"I've got the mug, ${nick(s)}. I've still got the numbers. help jeff."`]);
      return n === 2 ? '"Export? Excel? Either. Both. I\'m flexible," says Jeff, who is not.'
        : n === 3 ? '"You know what would help? Not Excel. Well, also Excel. But that mug on your desk. West. I can see it through your window."'
        : rotate(s, [`"Still no mug, ${nick(s)}."`, `"Almost there, ${nick(s)}. The mug is in the cottage. The cottage is west. I've drawn a map on my spreadsheet."`, `"I could just take the export, ${nick(s)}. I could. I won't. Mug."`]);
    },
// miller
    talkMore: (s, n) => (s.flags['ferry.online']
      ? rotate(s, [`"Heard the lamp came on. Good. Now go away, ${nick(s)}, I'm being decommissioned."`, `"Lookin' good, ${nick(s)}. Gen1 lives on, in a boat."`, `"The Mill has nothing left for you, ${nick(s)}. It barely had that."`])
      : n === 2 ? '"Q3," says the Miller, shorter. "Take care of those creds."'
      : n === 3 ? '"The Ferryman. South to the square, south to the lake, east to the dock. Those creds are his. He\'s been OFFLINE since 2021 and I\'ve been sad about it since Q3."'
      : rotate(s, [`"Still carrying my creds, ${nick(s)}. The dock's that way."`, `"Almost there, ${nick(s)}. Square, lake, dock. Give. Not say. Give."`, `"They're a scrap of parchment, ${nick(s)}. They're not going to walk to the dock themselves."`])),
// ferryman
    talkMore: (s, n) => {
      if (s.flags['ferry.online']) return n === 2 ? '"ONLINE," he says, still tasting it. "Board when ready. I said that already. I like saying it."'
        : n === 3 ? '"Board the boat. The Isle has two keys; take STANDARD. Personal is for people who close their laptops."'
        : rotate(s, [`"Lookin' good, ${nick(s)}. Board."`, `"Still on the dock, ${nick(s)}? The boat's right there. It says GATEWAY on it."`, `He hums. It's the boarding call, ${nick(s)}. It's always the boarding call.`]);
      if (n === 2) return '"Credentials," he mouths again, slower, the way you mouth a word to someone across a very wide lake. "Expired."';
      if (n === 3) return '"Gen1 credentials. The Mill has them. North of the square, north again. Talk to the Miller, or open his chest; he stopped caring in 2019." A tear falls. It is scheduled.';
      return s.inventory.includes('credentials')
        ? rotate(s, [`He looks at your pocket, ${nick(s)}. He looks at you. The creds are RIGHT THERE.`, `"Give," he mouths. "Credentials. To. Me." He points at himself, ${nick(s)}, in case there was doubt.`, `Almost there, ${nick(s)}. You have the creds. He has the lamp. Introduce them.`])
        : rotate(s, [`Still no creds, ${nick(s)}. The Mill. North, then north.`, `He mouths a longer sentence. It's the directions to the Mill, ${nick(s)}.`, `"OFFLINE," he mouths at you, ${nick(s)}, as if you'd forgotten. You had.`]);
    },
// monk
    talkMore: (s, n) => (s.flags['gate.open']
      ? n === 2 ? 'The monk points at the open gate. Then at you. Then at the gate again. Some things do not need a session.'
        : n === 3 ? '"North," says the monk. First word in four minutes. "The Abbot is in the cloister. Go before it times out."'
        : rotate(s, [`The monk has said his word, ${nick(s)}. North.`, `Lookin' good, ${nick(s)}. Go in. The session won't last.`, `He points north again, ${nick(s)}, with both hands this time.`])
      : n === 2 ? 'The monk points at the progress bar again, a little harder. It is still starting.'
        : n === 3 ? '"Wait," the monk says, quietly, so the session doesn\'t hear. "Three times. Type it. It counts your patience; nothing else counts."'
        : rotate(s, [`Still not waiting, ${nick(s)}. The bar noticed.`, `"WAIT," the monk mouths at you, ${nick(s)}. He has broken his vow for this.`, `Almost there, ${nick(s)}. Wait until the bar says 100%. Talking is not waiting.`])),
// abbot
    talkMore: (s, n) => {
      if (s.flags['has.hoodie']) return n === 2 ? '"Notebooks," the Abbot says again. "Write them. Never look back. I am looking back. Do not do as I do."'
        : n === 3 ? '"South, child. Through the Keep, to the Peaks. The Worthy Three are worn, smelt, and held. You wear one of them."'
        : rotate(s, [`"Lookin' good, ${nick(s)}. The hood suits you. It suits everyone. That is the problem with hoods."`, `"Go, ${nick(s)}. The dragon is east of everything."`, `"You are still here, ${nick(s)}. The hoodie is not a chair."`]);
      if (n === 2) return '"Pandas," the Abbot says, with the weariness of a man who has said it at every standup. "In the Lakehouse. Fix the notebook."';
      if (n === 3) return '"The scroll is in the Library, west, in a case. Your license opens the case. Then east, east, use the scroll on the notebook. Then kneel."';
      return s.inventory.includes('scroll')
        ? rotate(s, [`"You have the scroll, ${nick(s)}. East. The chamber. The notebook. Use it."`, `"Almost there, ${nick(s)}. The notebook is one room east and forty-one minutes deep."`, `"Still holding the scroll, ${nick(s)}? It reads better on a notebook."`])
        : rotate(s, [`"Still pandas, ${nick(s)}."`, `"Almost there, ${nick(s)}. West for the scroll, east for the notebook."`, `"The Hoodie of Spark waits, ${nick(s)}. It has waited through worse."`]);
    },
// pandas
    talkMore: (s, n) => (s.flags['notebook.fixed']
      ? n === 2 ? '"Four seconds," Brother Pandas says again. He has said it forty times. It is still four seconds.'
        : n === 3 ? '"The Abbot wants you. West. He has a hoodie and he has been holding it at arm\'s length."'
        : rotate(s, [`"Lookin' good, ${nick(s)}. Spark suits you."`, `"Delta," he whispers at you, ${nick(s)}. He's fine. He's just saying it now.`, `"It works in production, ${nick(s)}. I don't know what to do with my hands."`])
      : n === 2 ? '"It works on my laptop," Brother Pandas repeats. "My laptop is not here. That is the problem, or one of them."'
        : n === 3 ? '"pd.read_csv. That\'s the cell. It wants spark.read. There\'s a scroll in the Library that says so. West, west."'
        : rotate(s, [`"Still running, ${nick(s)}. Forty-one minutes. Forty-two."`, `"Almost there, ${nick(s)}. The scroll. On the notebook. I'd do it but I'd do it in pandas."`, `"I could restart the session, ${nick(s)}. I'm not going to. Four minutes."`])),
// librarian
    talkMore: (s, n) => (s.flags['scroll.lent']
      ? n === 2 ? '"By the end of the session," she says again, and the session, somewhere, starts.'
        : n === 3 ? '"East, then east. The notebook. Use the scroll on it. And bring it back, which nobody ever has."'
        : rotate(s, [`"Shh, ${nick(s)}."`, `"Lookin' good, ${nick(s)}. Now read it. Nobody reads them."`, `"You have the scroll, ${nick(s)}. I have your card. This is a library; that's a transaction."`])
      : n === 2 ? '"Library card," she says again. "Any license. Yours. The one in your pocket, which you keep touching."'
        : n === 3 ? '"Give me the license. Say: give license to librarian. I will keep it as collateral. That is what collateral is for."'
        : rotate(s, [`"Still no card, ${nick(s)}. It's in your inventory. I can see it from here."`, `"Almost there, ${nick(s)}. Give. License. Librarian. Three words; I'll allow it."`, `"The scroll is not going to lend itself, ${nick(s)}."`])),
// guard
    talkMore: (s, n) => (s.flags['bridge.down']
      ? n === 2 ? '"Sixty days," the guard repeats, slower, holding up six fingers and then, after some thought, a zero.'
        : n === 3 ? '"Sixty. Days. Go in. The hall is north; the Duke is north of that. Stop talking to the guard."'
        : rotate(s, ["'Lookin' good, Mr. Trial.'", `'Still here, ${nick(s)}? The Keep is that way. North. Where the drawbridge fell.'`, `'You have a trial and a Keep, ${nick(s)}. Use one on the other.'`])
      : n === 2 ? '"HALT," the guard says again, quieter, as if halting were something you could do more of. "Your SKU."'
        : n === 3 ? '"A SKU. S-K-U. Trial\'s free, peasant, if you can\'t afford one."'
        : rotate(s, [`'Still no SKU, ${nick(s)}.'`, `'Almost there, ${nick(s)}, but that's PRO.'`, `'Say it, ${nick(s)}. T-R-I-A-L. It's free. That's the joke.'`])),
// duke
    talkMore: (s, n) => (s.flags['trial.moat']
      ? n === 2 ? 'The Duke pretends harder not to see you. It is a skill. He learned it in a design review.'
        : n === 3 ? "'You have your smell,' says the Duke, to the window. 'The Studio is east of the hall. Go stare at something.'"
        : rotate(s, [`'Still here, ${nick(s)}? You smell like my basement and you are standing in my chamber.'`, `'Lookin' good, ${nick(s)}. Awful, but good.'`, `The Duke evaluates you, ${nick(s)}. The result is (Blank).`])
      : n === 2 ? "'CALCULATE(,' says the Duke, slower, and waits. You have brought nothing to put in the parentheses."
        : n === 3 ? "'There is one thing,' says the Duke, 'that I will not hear in this chamber. It has two words. It goes in a table. Say it, and see what happens.'"
        : rotate(s, [`'Still no sin, ${nick(s)}. Say the two words. The ones every DAX lord despises.'`, `'Almost there, ${nick(s)}. Not SQL. A modeling shortcut. The lazy one.'`, `'The word is not SQL, ${nick(s)}. Think smaller. Think of a column.'`])),
// cardinality — talk is advice[0]; the rest is here
    talk: () => CARDINALITY_ADVICE[0]!,
    talkMore: (s, n) => (n === 2 ? CARDINALITY_ADVICE[1]!
      : n === 3 ? `${CARDINALITY_ADVICE[2]} He looks toward the north gate. 'The monks are that way. The Duke is east, then north. Go be humiliated in the correct order.'`
      : rotate(s, [`"One. To. Many, ${nick(s)}."`, `"Star schema, ${nick(s)}. I have said it. I will say it at your funeral."`, `"The dragon wants two words, ${nick(s)}. I have given you three. That is the last time I round up."`])),
// card
    talkMore: (s, n) => (s.flags['stare.done']
      ? n === 2 ? 'The Card says 4.2M again, slightly louder. It has one value and it is committed to it.'
        : n === 3 ? 'The Card shows 4.2M. Beside it, the Big Refresh shows 97%. One of them wants a policy. It is not the Card.'
        : rotate(s, [`(4.2M), ${nick(s)}.`, `The Card looks at you, ${nick(s)}, the way a card looks at anything: with a number.`, `Lookin' good, ${nick(s)}. Lookin' (4.2M).`])
      : n === 2 ? '(Blank). Again. The Card is not stalling; it has nothing to stall with.'
        : n === 3 ? 'The Card shows (Blank). It will show a number if you look at it and then wait. Twice. Blink and it wins.'
        : rotate(s, [`Still (Blank), ${nick(s)}.`, `Almost there, ${nick(s)}. Look, then wait, then wait.`, `(Blank) is not a conversation, ${nick(s)}. It is a measure that never got written.`])),
// throttlor
    talkMore: (s, n) => (n === 2 ? '"WHAT IS THE ONE TRUE MODEL," Throttlor repeats, slower, with more smoke. He does not like repeating himself. He is billing you for it.'
      : n === 3 ? '"Two words, peasant. One fact table. Some dimensions. A shape. Sir Cardinality said it three times; I heard him from here."'
      : rotate(s, [`"Still no answer, ${nick(s)}. The question has not changed. Neither has the fee."`, `"Almost there, ${nick(s)}. It's a schema. It's shaped like a thing in the sky."`, `Throttlor yawns fire at you, ${nick(s)}. "Answer, or I start smoothing you over 24 hours."`])),
// scarecrow (Manual)
    talkMore: (s, n) => (n === 2 ? 'Manual says nothing, again. He is very consistent for a scarecrow that has to be triggered by hand.'
      : n === 3 ? 'Manual says nothing. You could use him; he refreshes when clicked. That is his whole thing and his whole tragedy.'
      : rotate(s, [`Manual, ${nick(s)}, is a scarecrow. He is not going to open up.`, `Nothing, ${nick(s)}. Not even a schedule.`, `Manual waits, ${nick(s)}. Manual is good at that. It's in the name.`])),
```

`jeff-excel` gets only `brushOff: BRUSHOFFS['jeff-excel']` (Sheet1's rule gives him stage variants, Task A2).

- [ ] **Step 5: Room rules that talk**

`src/world/fortress.ts`: delete the `fortress.talk-cardinality` rule (the builtin now escalates him; `cardinality.asked` is no longer set — remove it from the npc fallback too). Change `fortress.talk-card`'s text to `(s, world) => talkTo(s, world, world.npcs['card']!)` (import `talkTo` from `'../engine/builtins'`); `fortress.talk-card-stare` stays first for the stare start.

`src/world/peaks.ts`, add to the Shrine's rules (before `death.dragon`):

```ts
      { id: 'peaks.talk-dragon', when: { verb: 'talk', noun: DRAGON, flags: DRAGON_THERE }, then: { text: (s, world) => talkTo(s, world, world.npcs['throttlor']!), outcome: 'success' } },
```

`src/world/globals.ts`, `global.talk-dragon-elsewhere`: the text becomes the plain string `'You address the dragon. The dragon is on a mountain. You are not. This is, for now, the best arrangement.'` (its shrine branch is unreachable now).

- [ ] **Step 6: Run everything and commit**

Run: `npx tsc -b && npm test && npm run lint:world` — Expected: green. `tests/fortress.test.ts` "talk to sir cardinality" still gets `One. To. Many.` (talk 1). `tests/sidequests.test.ts` "pacified Jeff points at the Excel door" is talk 1, unchanged.

```bash
git add src/world/types.ts src/engine/step.ts src/engine/builtins.ts src/world/npcs.ts src/world/fortress.ts src/world/peaks.ts src/world/globals.ts tests/npc-talk.test.ts
git commit -m "npcs: talk counters, escalation with variants and hints, nickname rotation at 4+, brush-offs"
```

---

### Task B2: Gate objects answer the obvious verbs

**Files:**
- Create: `src/world/gates.ts`
- Modify: `src/world/index.ts` (register GATE_PHRASES)
- Modify: `src/world/fortress.ts` (`fortress.north-closed` text; drop `fortress.open-bridge`, `fortress.open-window`)
- Modify: `src/world/monastery.ts` (drop `monastery.open-gate`, `monastery.open-case`)
- Modify: `src/world/lake.ts` (drop `lake.use-lamp`)
- Modify: `src/world/peaks.ts` (drop `peaks.open-locked`)
- Test: `tests/gates.test.ts`

**Voice:** read the voice skill first ("Set-piece nag" and "Missing prerequisite" shapes). Every reply says the shape of the puzzle, bossily.

**Interfaces:**
- Consumes: `PhraseRule.then` (D1), `vary()`.
- Produces: `export const GATE_PHRASES: PhraseRule[]`; flags `gate.<id>` (tries so far); `export function gate(g: GateSpec): PhraseRule`. Registered in `src/world/index.ts` as `[...SIDEQUEST_PHRASES, ...GOAL_PHRASES, ...EXCEL_PHRASES, ...COPILOT_PHRASES, ...GATE_PHRASES, ...KEEP_PHRASES, ...LAKEHOUSE_PHRASES, ...PEAKS_PHRASES, ...PHRASE_RULES]` (room-scoped, so they beat the global `egg.push`/`egg.kick`/`egg.climb` and the rooms' own `use`/`open` rules for the gate nouns).
- The `n`-at-the-bridge line: `The drawbridge is up. It is updating (1 of 3). The moat below is deep and full of GROUP BY. The guard is right there. He wants a SKU.`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/gates.test.ts
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import type { GameState } from '../src/engine/types';

const VERBS = ['open', 'use', 'push', 'pull', 'cross', 'climb', 'lower', 'raise', 'enter', 'knock on', 'unlock', 'break', 'kick'];
const at = (room: string, extra: Partial<GameState> = {}): GameState => ({ ...newGame(WORLD, 2), room, ...extra });
const one = (room: string, cmd: string, extra: Partial<GameState> = {}) => step(at(room, extra), cmd, WORLD);

describe('every gate object answers the obvious verbs with the puzzle (spec1 §3.2)', () => {
  const cases: [string, string[], RegExp, Partial<GameState>][] = [
    ['fortress.bridge', ['drawbridge', 'gate', 'splash screen'], /The bridge answers to the guard\. The guard answers to SKUs\. Say one to him\./, {}],
    ['fortress.throne', ['throne', 'window', 'duke'], /The Duke throws people from that window for one sin\. Say it\./, {}],
    ['fortress.yard', ['card', 'big refresh'], /The Card wants staring at\. The refresh wants a policy\. The Model View, west of the hall, keeps one\./, {}],
    ['monastery.gate', ['gate', 'door', 'bell'], /Locked\. The session is starting\. `wait`\./, {}],
    ['monastery.gate', ['session', 'progress bar'], /It's starting\. `wait`\. That's the puzzle\. Really\./, {}],
    ['monastery.spark', ['notebook', 'cell', 'session'], /The cell wants Spark, not pandas\. The Library, west of the cloister, keeps a scroll about it\./, {}],
    ['monastery.library', ['scroll', 'librarian', 'case'], /Library card only\. Any license will do\. Well\. Any license she accepts\./, {}],
    ['lake.dock', ['boat', 'ferryman', 'lamp'], /The Ferryman's OFFLINE\. Credentials expired\. The Mill has the ones that haven't\./, {}],
    ['peaks.pass', ['sign', 'delay', 'pass'], /Interactive operations may be delayed\. Boots help\. The Studio's Big Refresh drops a pair\./, {}],
    ['peaks.ledge', ['door', 'sigils'], /Three sigils\. Look like an Engineer, smell like a Warehouse, hold the Key\. It counts them for you: 0 of 3\./, {}],
    ['peaks.shrine', ['dragon', 'throttlor'], /He asked you a question\. Answer it\. `say <answer>`\./, {}],
  ];
  for (const [room, nouns, shape, extra] of cases) {
    for (const noun of nouns) {
      it(`${room}: <verb> ${noun}`, () => {
        for (const v of VERBS) {
          if (room === 'fortress.yard' && v === 'use') continue; // the Studio's own use-lines already shape that puzzle
          expect(one(room, `${v} ${noun}`, extra).output[0], `${v} ${noun}`).toMatch(shape);
        }
      });
    }
  }
  it('the second try adds the extra; later tries rotate the old flavor lines with it', () => {
    let s = at('fortress.bridge');
    const outs: string[] = [];
    for (let i = 0; i < 4; i++) { const r = step(s, 'open drawbridge', WORLD); s = r.state; outs.push(r.output[0]!); }
    expect(outs[0]).not.toMatch(/Trial's free/);
    expect(outs[1]).toMatch(/Say one to him\. Trial's free\.$/);
    expect(outs[2]).toMatch(/Trial's free\.$/);
    expect(outs[2]).not.toMatch(/answers to the guard/);
    expect(s.flags['gate.desktop']).toBe(4);
  });
  it('a solved gate declines, so the room answers as before', () => {
    expect(one('fortress.bridge', 'open drawbridge', { flags: { 'bridge.down': true } }).output[0]).not.toMatch(/answers to the guard/);
    expect(one('lake.dock', 'use lamp', { flags: { 'ferry.online': true } }).output[0]).not.toMatch(/OFFLINE\. Credentials expired/);
  });
  it('the ledge counts the lit sigils and still opens for the Worthy', () => {
    expect(one('peaks.ledge', 'push door', { flags: { 'trial.moat': true, 'trial.key': true } }).output[0]).toMatch(/2 of 3/);
    const r = one('peaks.ledge', 'open door', { flags: { 'trial.moat': true, 'trial.key': true, 'trial.hoodie': true } });
    expect(r.pointsAwarded).toBe(5);
    expect(r.state.flags['shrine.open']).toBe(true);
  });
  it('n at the Gate names the guard', () => {
    expect(one('fortress.bridge', 'n').output[0]).toBe('The drawbridge is up. It is updating (1 of 3). The moat below is deep and full of GROUP BY. The guard is right there. He wants a SKU.');
  });
  it('the Studio keeps its refresh errors for use refresh', () => {
    expect(one('fortress.yard', 'use refresh').output[0]).toMatch(/^Refresh (failed|succeeded)/);
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run tests/gates.test.ts`
Expected: FAIL — most verbs get the global eggs or "That doesn't do anything here."

- [ ] **Step 3: Create `src/world/gates.ts`**

```ts
import type { GameState } from '../engine/types';
import type { PhraseRule } from './types';
import { vary } from '../engine/quirks';

/**
 * Every gating object answers the obvious verbs with the shape of its puzzle (spec1 §3.2). Room-scoped phrase rules,
 * so they win over the global eggs (push, kick, climb) and over the room's own use/open flavor for these nouns.
 * Try 1: the shape. Try 2: the shape plus `more`. Try 3+: the displaced flavor lines rotate, with `more`.
 * A solved gate declines (returns null) so the room's ordinary lines answer again.
 */
export type GateSpec = {
  id: string; room: string;
  /** Regex alternation of the nouns, without anchors, e.g. '(drawbridge|bridge|gate)'. */
  nouns: string;
  shape: string | ((s: GameState) => string);
  more?: string;
  flavor?: string[];
  /** The gate is still shut. */
  when: (s: GameState) => boolean;
  /** Verbs to answer; defaults to all thirteen. */
  verbs?: string;
};

export const GATE_VERBS = '(open|unlock|use|push|pull|cross|climb|lower|raise|enter|knock( on)?|break|kick( down)?|go through|walk (across|over|through)|try)';

export function gate(g: GateSpec): PhraseRule {
  const test = new RegExp(`^${g.verbs ?? GATE_VERBS}( the| a| that| this)? ${g.nouns}$`);
  return {
    id: `gate.${g.id}`, room: g.room, test, text: '',
    then: (s) => {
      if (!g.when(s)) return null;
      const n = Number(s.flags[`gate.${g.id}`]) || 0;
      const shape = typeof g.shape === 'function' ? g.shape(s) : g.shape;
      const text = n >= 2 && g.flavor?.length ? `${vary(s, g.flavor)}${g.more ? ` ${g.more}` : ''}` : n >= 1 && g.more ? `${shape} ${g.more}` : shape;
      return { id: `gate.${g.id}`, then: { text, set: { [`gate.${g.id}`]: n + 1 }, outcome: 'fail' } };
    },
  };
}

const worthy = (s: GameState): boolean => !!s.flags['trial.hoodie'] && !!s.flags['trial.moat'] && !!s.flags['trial.key'];
const lit = (s: GameState): number => ['trial.hoodie', 'trial.moat', 'trial.key'].filter((f) => !!s.flags[f]).length;

export const GATE_PHRASES: PhraseRule[] = [
  gate({
    id: 'desktop', room: 'fortress.bridge', nouns: '(drawbridge|bridge|gate|keep gate|splash( screen)?)', when: (s) => !s.flags['bridge.down'],
    shape: 'The bridge answers to the guard. The guard answers to SKUs. Say one to him.', more: "Trial's free.",
    flavor: [
      "You click the splash screen. It is not a button. The guard shouts: 'STATE. YOUR. SKU.'",
      'You push the drawbridge. It is a splash screen. Splash screens are not pushed; they are waited out, or bribed with a SKU.',
      'You tap the drawbridge twice. It shows a tooltip: "Updating". You knew that.',
      'You try to lower it by hand. It is heavier than the whole .pbix, and the .pbix is 2.3 GB.',
    ],
  }),
  gate({
    id: 'duke', room: 'fortress.throne', nouns: '(throne|formula bar|window|casement|keep window|duke|duke of dax)', when: (s) => !s.flags['trial.moat'],
    shape: 'The Duke throws people from that window for one sin. Say it.',
    flavor: [
      'You open the window. The moat winks up at you. It is the fastest exit in the Keep. You close it; you are not ready to smell like that.',
      'You reach for the throne. It is a formula bar. It autocompletes your hand to SUMX( and you back away.',
    ],
  }),
  gate({
    id: 'studio', room: 'fortress.yard', nouns: '(card|card visual|big refresh|refresh|progress bar|refresh bar)', when: (s) => !s.flags['refresh.done'],
    verbs: '(open|unlock|push|pull|cross|climb|lower|raise|enter|knock( on)?|break|kick( down)?|go through|walk (across|over|through)|try)',
    shape: 'The Card wants staring at. The refresh wants a policy. The Model View, west of the hall, keeps one.',
  }),
  gate({
    id: 'monastery', room: 'monastery.gate', nouns: '(gate|door|bell|monastery gate)', when: (s) => !s.flags['gate.open'],
    shape: "Locked. The session is starting. `wait`. Three times; the bar counts them.",
    more: "(The Keep's back gate opens onto this gate from the Model View — or the swamp's gold layer, the long way.)",
    flavor: ['You push the gate. The monk shakes his head and points at the progress bar. Some things cannot be rushed. Well — they can, with a Starter Pool, but not here.'],
  }),
  gate({
    id: 'session', room: 'monastery.gate', nouns: '(session|spark session|progress bar|bar)', when: (s) => !s.flags['gate.open'],
    shape: "It's starting. `wait`. That's the puzzle. Really.",
  }),
  gate({
    id: 'notebook', room: 'monastery.spark', nouns: '(notebook|cell|session|spark session)', when: (s) => !s.flags['notebook.fixed'],
    shape: 'The cell wants Spark, not pandas. The Library, west of the cloister, keeps a scroll about it.',
    flavor: ['You click Run All. The cell was already running. Now it is running twice. Brother Pandas gives you a look.'],
  }),
  gate({
    id: 'library', room: 'monastery.library', nouns: '(scroll|spark scroll|case|locked case|glass case|librarian)', when: (s) => !s.flags['scroll.lent'],
    shape: 'Library card only. Any license will do. Well. Any license she accepts.',
    flavor: ['Locked. A small sign reads: LIBRARY CARD REQUIRED. ANY CARD.'],
  }),
  gate({
    id: 'dock', room: 'lake.dock', nouns: '(boat|ferry|ferryman|gateway|lamp|status lamp)', when: (s) => !s.flags['ferry.online'],
    shape: "The Ferryman's OFFLINE. Credentials expired. The Mill has the ones that haven't.",
    flavor: ['You tap the lamp. It blinks OFFLINE a little faster, which is somehow worse.'],
  }),
  gate({
    id: 'pass', room: 'peaks.pass', nouns: '(sign|delay|interactive delay|pass|throttling pass|air)', when: (s) => !s.worn.includes('boots'),
    shape: "Interactive operations may be delayed. Boots help. The Studio's Big Refresh drops a pair.",
  }),
  gate({
    id: 'ledge', room: 'peaks.ledge', nouns: '(door|shrine door|shrine|great door|sigils?)', when: (s) => !s.flags['shrine.open'] && !worthy(s),
    shape: (s) => `Three sigils. Look like an Engineer, smell like a Warehouse, hold the Key. It counts them for you: ${lit(s)} of 3.`,
  }),
  gate({
    id: 'dragon', room: 'peaks.shrine', nouns: '(dragon|throttlor|capacity dragon)', when: (s) => !s.flags['dragon.gone'],
    shape: 'He asked you a question. Answer it. `say <answer>`.',
  }),
];
```

- [ ] **Step 4: Register, and retire the rules the gates now cover**

`src/world/index.ts`: import `GATE_PHRASES` from `'./gates'` and register it between `COPILOT_PHRASES` and `KEEP_PHRASES`.

Delete these now-shadowed rules (their lines live in the gates' `flavor` pools): `fortress.open-bridge`, `fortress.open-window` (fortress.ts); `monastery.open-gate`, `monastery.open-case` (monastery.ts); `lake.use-lamp` (lake.ts); `peaks.open-locked` (peaks.ts). Keep every `poke()` (their `get` lines and non-gate nouns are still reachable).

`fortress.north-closed` text: `'The drawbridge is up. It is updating (1 of 3). The moat below is deep and full of GROUP BY. The guard is right there. He wants a SKU.'`

Audit note for the implementer: the function-exits in the world are `fortress.bridge n` (bridge.down), `lake.dock e` (ferry.online), `monastery.gate n` (gate.open), `peaks.ledge n` (shrine.open); the NPC-gated milestones are the guard (SKU), the Duke (the sin), the Card (stare), the Big Refresh (policy), the Librarian (license), Brother Pandas (scroll), the Abbot (notebook), the Miller (credentials), the Ferryman (credentials), Throttlor (star schema). Every one of them is covered by a gate above or already answers `open`/`use` with the puzzle's shape (the Mill's chest and the Abbot's kneel); confirm by running `tests/gates.test.ts` and reading `npm run replay` output for `open chest` in the Mill and `use abbot` in the Cloister.

- [ ] **Step 5: Run everything and commit**

Run: `npx tsc -b && npm test && npm run lint:world` — Expected: green. `tests/keep-examinables.test.ts` is unaffected (phrase rules are not rules).

```bash
git add src/world/gates.ts src/world/index.ts src/world/fortress.ts src/world/monastery.ts src/world/lake.ts src/world/peaks.ts tests/gates.test.ts
git commit -m "gates: every gating object answers the obvious verbs with the shape of its puzzle"
```

---

### Task B3: The narrator nudges (`state.stuck`) and `hint`

**Files:**
- Modify: `src/engine/types.ts` (GameState.stuck)
- Modify: `src/engine/step.ts` (stuck in finish(); the aside)
- Modify: `src/world/globals.ts` (HINT_PHRASES)
- Modify: `src/world/index.ts` (register HINT_PHRASES)
- Test: `tests/stuck.test.ts`

**Voice:** read the voice skill first ("Hint layer": bossy, in character, names the expected input).

**Interfaces:**
- Produces: `GameState.stuck?: number` — consecutive turns in the same room whose outcome was `fail` or `snark` with no points/bonus; reset by anything else. At 4, 8, 12… the turn's output gains a final line `(Psst. <flaskHint>)` (or `(Psst. Look around. Talk to people. Read things.)` when the hint is empty). Not in god mode; not in `copilot.pane`.
- `export const HINT_PHRASES: PhraseRule[]` (`hint`, `hints`, `clue`, `what now`, `what next`, `i'm stuck`, `im stuck`, `i am stuck`, `stuck`, `help me`) → `A hollow voice adds: "<flaskHint>"`. Registered right after `GOAL_PHRASES`: `[...SIDEQUEST_PHRASES, ...GOAL_PHRASES, ...HINT_PHRASES, ...EXCEL_PHRASES, ...COPILOT_PHRASES, ...GATE_PHRASES, ...KEEP_PHRASES, ...LAKEHOUSE_PHRASES, ...PEAKS_PHRASES, ...PHRASE_RULES]`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/stuck.test.ts
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import type { GameState } from '../src/engine/types';

const run = (cmds: string[], start: Partial<GameState> = {}) => {
  let s: GameState = { ...newGame(WORLD, 9), ...start };
  const outs: string[][] = [];
  for (const c of cmds) { const r = step(s, c, WORLD); s = r.state; outs.push(r.output); }
  return { s, outs };
};
const DEAD = ['get csv', 'get sword', 'get csv', 'get sword'];

describe('the narrator nudges (spec1 §3.3)', () => {
  it('after 4 dead turns in one room the flask hint is whispered; again at 8', () => {
    const { s, outs } = run([...DEAD, ...DEAD]);
    expect(s.stuck).toBe(8);
    expect(outs[3]![outs[3]!.length - 1]).toBe(`(Psst. ${WORLD.rooms['village.cottage']!.flaskHint(s)})`);
    expect(outs[7]![outs[7]!.length - 1]).toMatch(/^\(Psst\. /);
    expect(outs[2]!.join(' ')).not.toMatch(/Psst/);
    expect(outs[4]!.join(' ')).not.toMatch(/Psst/);
  });
  it('a success, a move or points resets it', () => {
    expect(run([...DEAD.slice(0, 3), 'look', 'get sword']).s.stuck).toBe(1);
    expect(run([...DEAD.slice(0, 3), 'get mug']).s.stuck).toBe(0);
    expect(run([...DEAD.slice(0, 3), 'out']).s.stuck).toBe(0);
  });
  it('not in god mode, not in the Copilot pane', () => {
    expect(run(['burninate', ...DEAD]).outs[4]!.join(' ')).not.toMatch(/Psst/);
    const pane = run(['sales', 'sales', 'sales', 'sales'], { room: 'copilot.pane', flags: { 'sq.return': 1 } });
    expect(pane.outs[3]!.join(' ')).not.toMatch(/Psst/);
  });
});

describe('hint', () => {
  it.each(['hint', 'hints', 'clue', 'what now', 'what next', "i'm stuck", 'im stuck', 'stuck', 'help me'])('%s is the flask hint in the hollow voice', (c) => {
    const s = { ...newGame(WORLD, 9), room: 'fortress.bridge' };
    expect(step(s, c, WORLD).output[0]).toBe(`A hollow voice adds: "${WORLD.rooms['fortress.bridge']!.flaskHint(s)}"`);
  });
  it('works in the Copilot pane too', () => {
    const s = { ...newGame(WORLD, 9), room: 'copilot.pane', flags: { 'sq.return': 1 } };
    expect(step(s, 'hint', WORLD).output[0]).toMatch(/^A hollow voice adds: /);
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run tests/stuck.test.ts`
Expected: FAIL — `stuck` undefined; `hint` is snark.

- [ ] **Step 3: Engine**

`src/engine/types.ts`, `GameState` after `recent?`:

```ts
  /** Consecutive dead turns (fail/snark, no points, same room). The narrator whispers the flask hint at 4, 8, 12… */
  stuck?: number;
```

`src/engine/step.ts`, at the end of `finish()` replace the final `return` with:

```ts
    // 8. The narrator nudges (spec1 §3.3).
    const r8 = result.state;
    const deadTurn = (result.outcome === 'fail' || result.outcome === 'snark') && r8.room === base.room && result.pointsAwarded === 0 && !(result.bonusAwarded ?? 0);
    const stuck = deadTurn ? (base.stuck ?? 0) + 1 : 0;
    result = { ...result, state: { ...r8, stuck } };
    if (stuck > 0 && stuck % 4 === 0 && !r8.flags[GOD_FLAG] && r8.room !== 'copilot.pane' && !r8.dead) {
      const hint = world.rooms[r8.room]!.flaskHint(r8);
      result = { ...result, output: [...result.output, `(Psst. ${hint || 'Look around. Talk to people. Read things.'})`] };
    }
    return { ...result, state: { ...result.state, flags: { ...result.state.flags, bonus: result.state.bonus } } };
```

- [ ] **Step 4: `hint`**

`src/world/globals.ts`:

```ts
const HINT_TEST = /^(hint|hints|clue|what now|what next|i'?m stuck|i am stuck|stuck|help me)\??$/;
const hollow = (s: GameState, w: World): string => `A hollow voice adds: "${w.rooms[s.room]!.flaskHint(s)}"`;
/** `hint` and friends: the flask hint without the flask (spec1 §3.4). The pane copy is needed because a prompt room skips global phrases. */
export const HINT_PHRASES: PhraseRule[] = [
  { id: 'hint.pane', room: 'copilot.pane', test: HINT_TEST, text: hollow },
  { id: 'hint.main', test: HINT_TEST, text: hollow },
];
```

`src/world/index.ts`: register `HINT_PHRASES` right after `GOAL_PHRASES`.

- [ ] **Step 5: Run everything and commit**

Run: `npx tsc -b && npm test && npm run lint:world` — Expected: green (the golden path has no four dead turns in a row; `tests/quirks.test.ts` "a failed command repeated" runs four `get csv` — its assertions are on the repeat lines, the fourth output simply gains the aside).

```bash
git add src/engine/types.ts src/engine/step.ts src/world/globals.ts src/world/index.ts tests/stuck.test.ts
git commit -m "stuck: the narrator whispers the flask hint after four dead turns; hint aliases"
```

---
### Task C1: The Duke's sin is a calculated column

**Files:**
- Modify: `src/world/fortress.ts` (`fortress.moat` nouns/text; `select *` corrected; DAX-sin flavor; hints; the throne phrase)
- Modify: `src/world/globals.ts` (`egg.select-star` elsewhere text)
- Modify: `tests/golden-path.ts`, `tests/golden-path.json` (`say select *` → `say calculated column`)
- Modify: `tests/fortress.test.ts` (the moat test)
- Modify: `README.md:120`, `docs/how-to-play.md:78`, `docs/ledger.md:23,95`
- Test: `tests/keep-sense.test.ts`

**Voice:** read the voice skill first. The Duke's gimmick: speaks only in filter context; corrects you, which is worse than throwing you.

**Interfaces:**
- Consumes: `PhraseRule.then` (D1).
- Produces: `export const MOAT_THEN: RuleThen` in `fortress.ts` (`points: 25, pointsKey: 'fortress.moat', set: { 'trial.moat': true }, moveTo: 'fortress.bridge', sfx: 'death'`) — the id `fortress.moat`, the key and the points are unchanged, so the ledger still sums to 200. The golden path stays 69 turns.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/keep-sense.test.ts
import { describe, expect, it } from 'vitest';
import { MAX_SCORE, newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { GOLDEN_PATH } from './golden-path';

const at = (cmds: string[], flags: Record<string, boolean | number> = {}) => {
  let s = { ...newGame(WORLD, 6), room: 'fortress.throne', flags: { ...flags } };
  let last = step(s, 'look', WORLD);
  for (const c of cmds) { last = step(s, c, WORLD); s = last.state; }
  return { s, last };
};

describe("the Duke's sin (spec1 §4.1)", () => {
  it.each(['say calculated column', 'say a calculated column', "say i'll just use a calculated column", 'say add a calculated column', 'add a calculated column', "i'll use a calculated column", 'just use a calculated column', 'make a calculated column'])('%s → the moat, +25, trial.moat, back at the gate', (c) => {
    const { s, last } = at([c]);
    expect(last.output[0]).toMatch(/^'A CALCULATED COLUMN\?' The Duke rises\. 'IN\. MY\. MODEL\?'/);
    expect(last.output[0]).toMatch(/You will never not smell like this\.$/);
    expect(s.score).toBe(25); expect(s.flags['trial.moat']).toBe(true); expect(s.room).toBe('fortress.bridge');
    expect(last.stepId).toBe('fortress.moat'); expect(last.sfx).toBe('death'); expect(s.dead).toBe(false);
  });
  it('a second sin is a habit, not a second bath', () => {
    const { s, last } = at(['say calculated column'], { 'trial.moat': true, 'pts.fortress.moat': true, 'seen.fortress.bridge': true });
    expect(s.score).toBe(0); expect(last.output[0]).toMatch(/Once was instructive\. Twice is a habit\./);
  });
  it('select * is corrected, not thrown', () => {
    const { s, last } = at(['say select *']);
    expect(last.output[0]).toBe("The Duke blinks. 'SELECT? This is a semantic model. We EVALUATE here.' He does not throw you. He corrects you, which is worse.");
    expect(s.score).toBe(0); expect(s.flags['trial.moat']).toBeUndefined(); expect(s.room).toBe('fortress.throne'); expect(last.outcome).toBe('snark');
  });
  it.each([
    ['say evaluate', /'Correct,' says the Duke, disappointed\. 'And useless\.'/],
    ['say implicit measure', /The Duke shudders\. 'Implicit\.' But he has heard worse today\./],
    ['say bidirectional', /ambiguity/],
    ['say userelationship', /USERELATIONSHIP/],
    ['say calculate', /The one true function/],
    ['say sumx', /iterates/],
  ])('%s gets flavor, no moat', (c, re) => {
    const { s, last } = at([c]);
    expect(last.output[0]).toMatch(re); expect(s.flags['trial.moat']).toBeUndefined();
  });
  it('the hints name the sin without spelling it', () => {
    expect(WORLD.rooms['fortress.throne']!.flaskHint(newGame(WORLD, 1))).toBe('Say the thing every DAX lord despises. It has two words and it goes in a table.');
    expect(WORLD.rooms['fortress.bridge']!.flaskHint({ ...newGame(WORLD, 1), flags: { 'bridge.down': true } })).toMatch(/The Duke hates one shortcut above all others\./);
    expect(WORLD.rooms['fortress.hall']!.flaskHint(newGame(WORLD, 1))).toMatch(/one shortcut above all others/);
  });
  it('select * elsewhere no longer promises a moat', () => {
    expect(step({ ...newGame(WORLD, 1), room: 'village.square' }, 'select *', WORLD).output[0]).not.toMatch(/moat/);
  });
  it('the golden path says the sin and still scores 200 in 69', () => {
    expect(GOLDEN_PATH).toContain('say calculated column');
    expect(GOLDEN_PATH).not.toContain('say select *');
    let s = newGame(WORLD, 42);
    for (const c of GOLDEN_PATH) s = step(s, c, WORLD).state;
    expect(s.score).toBe(MAX_SCORE); expect(s.turns).toBe(69); expect(s.won).toBe(true);
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run tests/keep-sense.test.ts`
Expected: FAIL — `say calculated column` is snark; `say select *` throws you.

- [ ] **Step 3: `src/world/fortress.ts`**

Add near the top (after the noun lists):

```ts
const SIN = ['calculated column', 'calculated columns', 'a calculated column', 'use a calculated column', 'add a calculated column', 'make a calculated column', 'just use a calculated column',
  'i will use a calculated column', "i'll use a calculated column", 'i will just use a calculated column', "i'll just use a calculated column"];
export const MOAT_TEXT = "'A CALCULATED COLUMN?' The Duke rises. 'IN. MY. MODEL?' Two guards seize you by the arms and hurl you from the window into the Moat of T-SQL below — the Warehouse this whole Keep was built on. You surface, sputtering, covered in semicolons and something that might be a CROSS APPLY. You climb out. You will never not smell like this.";
/** Trial 2 (+25, `trial.moat`): the id, key and points are unchanged from the SQL days, so the ledger still sums to 200. */
export const MOAT_THEN: RuleThen = { text: MOAT_TEXT, set: { 'trial.moat': true }, points: 25, pointsKey: 'fortress.moat', moveTo: 'fortress.bridge', sfx: 'death' };
const MOAT_AGAIN: RuleThen = { text: "'Another?' The Duke does not rise this time. 'Once was instructive. Twice is a habit.' He points at the window. You take the stairs.", outcome: 'snark' };
```

Replace the `fortress.moat` rule and add the corrections, keeping the rule order (the moat first):

```ts
      { id: 'fortress.moat', when: { verb: 'say', noun: SIN, flags: [{ flag: 'trial.moat', not: true }] }, then: MOAT_THEN },
      { id: 'fortress.moat-again', when: { verb: 'say', noun: SIN, flags: [{ flag: 'trial.moat' }] }, then: MOAT_AGAIN },
      {
        id: 'fortress.select-star',
        when: { verb: 'say', noun: ['select *', 'select star', 'select * from', 'select *;', 'select * from table', 'select all', 'select * from everything'] },
        then: { text: "The Duke blinks. 'SELECT? This is a semantic model. We EVALUATE here.' He does not throw you. He corrects you, which is worse.", outcome: 'snark' },
      },
      { id: 'fortress.dax-evaluate', when: { verb: 'say', noun: ['evaluate', 'evaluate table', 'evaluate sales'] }, then: { text: "'Correct,' says the Duke, disappointed. 'And useless.'", outcome: 'snark' } },
      { id: 'fortress.dax-implicit', when: { verb: 'say', noun: ['implicit measure', 'implicit measures', 'implicit'] }, then: { text: "The Duke shudders. 'Implicit.' But he has heard worse today.", outcome: 'snark' } },
      { id: 'fortress.dax-bidirectional', when: { verb: 'say', noun: ['bidirectional', 'bi-directional', 'both directions', 'bidirectional filtering', 'cross filter both'] }, then: { text: "'Both directions,' says the Duke, 'is how ambiguity gets a seat at the table.' He does not throw you. He wants you to hear that again on the way out.", outcome: 'snark' } },
      { id: 'fortress.dax-userelationship', when: { verb: 'say', noun: ['userelationship', 'use relationship'] }, then: { text: "'USERELATIONSHIP,' says the Duke. 'The inactive one. You are the inactive one.'", outcome: 'snark' } },
```

Change `fortress.dax-calculate`'s text to `"'CALCULATE,' says the Duke. 'The one true function.' He nods; the guards relax. 'With no filter, though. A context transition, and nothing else. You may sit.' You may not sit."` (the old line's `context transition` stays for `tests/fortress.test.ts`).

Hints: the throne `flaskHint` becomes `(s) => (s.flags['trial.moat'] ? 'You have the smell. Nothing more for you here, unless you like spinners.' : 'Say the thing every DAX lord despises. It has two words and it goes in a table.')`; in the bridge hint replace `The Duke hates one query above all others.` with `The Duke hates one shortcut above all others.`; in the hall hint replace `'North. Insult the Duke properly and he will do the rest.'` with `'North. Insult the Duke properly and he will do the rest. He hates one shortcut above all others.'`.

Add to `KEEP_PHRASES` under `// Duke's chamber` (room-scoped, before the region-wide lines):

```ts
  { id: 'fortress.moat-words', room: 'fortress.throne', test: /^(say )?(i('ll| will)? )?(just )?(use|add|make) a calculated column$/, text: '', then: (s) => ({ id: 'fortress.moat', then: s.flags['trial.moat'] ? MOAT_AGAIN : MOAT_THEN }) },
```

`src/world/globals.ts`, `egg.select-star`: the non-throne branch becomes `'Not here. This is not even a Warehouse. Say it to the Duke and get corrected.'`.

- [ ] **Step 4: The golden path, the old test, the docs**

`tests/golden-path.ts` and `tests/golden-path.json`: replace `'say select *'` with `'say calculated column'` (the JSON must equal the TS array). `tests/fortress.test.ts`: rename the moat test "the Duke of DAX throws a calculated column into the moat (+25, trial)" and play `['say calculated column']`; keep its assertions. Docs (Task G1 does the rest):
- `README.md` hints: `- In the Duke's chamber, the modeling shortcut every DAX purist hates gets you exactly where you need to go.`
- `docs/how-to-play.md`: `Some puzzles use \`say\` with more than two words (\`say calculated column\`, \`say star schema\`).`
- `docs/ledger.md` row 12: `| 12 | Tell the Duke you'll just use a calculated column and get thrown in the Moat | Duke's Chamber | 25 | 155 |`; walkthrough line: `say calculated column         +25  the Duke throws you in the Moat of T-SQL — Trial 2: you smell like a Warehouse`.

- [ ] **Step 5: Run everything and commit**

Run: `npx tsc -b && npm test && npm run lint:world` — Expected: green; golden 200/69; golden + side quests 200 + 45.

```bash
git add src/world/fortress.ts src/world/globals.ts tests/golden-path.ts tests/golden-path.json tests/fortress.test.ts tests/keep-sense.test.ts README.md docs/how-to-play.md docs/ledger.md
git commit -m "keep: the Duke's sin is a calculated column; select * is corrected; DAX flavor; golden path says the sin"
```

---

### Task C2: Power Query Hall reads as seven steps

**Files:**
- Create: `src/world/applied-steps.ts` (STEPS, pqStep, pqDone, stepsList — the puzzle itself is Task E6)
- Modify: `src/world/fortress.ts` (hall describe/enterQuip; door pokes; steps/doorways pokes)
- Modify: `src/world/keep-items.ts` (`steps`, `doorways`, `portraits` describes)
- Modify: `src/world/index.ts` (register APPLIED_STEP_PHRASES)
- Test: `tests/hall-steps.test.ts`

**Voice:** read the voice skill first. The hall's gimmick: everything is a step, in order, and the order is the whole joke.

**Interfaces:**
- Produces (from `applied-steps.ts`): `export const STEPS = ['Source', 'Navigation', 'Promoted Headers', 'Changed Type', 'Filtered Rows', 'Removed Other Columns', 'Renamed Columns'] as const`; `export const STEP_COMMANDS: readonly string[]` (the first accepted command per step, for hints: `source`, `navigate`, `promote headers`, `change type`, `filter rows`, `remove other columns`, `rename columns`); `export function pqStep(s: GameState): number` (0–7, from flag `pq.step`); `export function pqDone(s: GameState): boolean` (flag `pq.done`); `export function stepsList(s: GameState): string` (`✓ Source ✓ Navigation ✗ Promoted Headers (yellow) · Changed Type · …`); `export const APPLIED_STEP_PHRASES: PhraseRule[]` (the door pokes now; Task E6 appends the step commands). Registered right before `GATE_PHRASES`; the order after this task is `[...SIDEQUEST_PHRASES, ...GOAL_PHRASES, ...HINT_PHRASES, ...EXCEL_PHRASES, ...COPILOT_PHRASES, ...APPLIED_STEP_PHRASES, ...GATE_PHRASES, ...KEEP_PHRASES, ...LAKEHOUSE_PHRASES, ...PEAKS_PHRASES, ...PHRASE_RULES]`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/hall-steps.test.ts
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { STEPS, stepsList } from '../src/world/applied-steps';

const hall = (flags: Record<string, boolean | number> = {}) => ({ ...newGame(WORLD, 6), room: 'fortress.hall', flags });

describe('Power Query Hall reads as seven steps (spec1 §4.2)', () => {
  it('the room text lists the seven, in order, and says the first is open', () => {
    const out = step(hall(), 'look', WORLD).output[0]!;
    expect(out).toContain('Seven doorways in a row, each an Applied Step: Source, Navigation, Promoted Headers, Changed Type, Filtered Rows, Removed Other Columns, Renamed Columns.');
    expect(out).toContain('The first is open. The rest are yellow — you go through them in order, or the hall errors.');
    expect(WORLD.rooms['fortress.hall']!.enterQuip!(hall())).toBe("Seven steps. In order. That's the whole idea of a query.");
  });
  it('after pq.done the doors are all open', () => {
    expect(step(hall({ 'pq.step': 7, 'pq.done': true }), 'look', WORLD).output[0]).toContain('All seven are open. The hall is a query again.');
  });
  it('stepsList shows the state', () => {
    expect(stepsList(hall())).toBe('✗ Source (yellow) · Navigation · Promoted Headers · Changed Type · Filtered Rows · Removed Other Columns · Renamed Columns');
    expect(stepsList(hall({ 'pq.step': 3 }))).toBe('✓ Source ✓ Navigation ✓ Promoted Headers ✗ Changed Type (yellow) · Filtered Rows · Removed Other Columns · Renamed Columns');
    expect(stepsList(hall({ 'pq.step': 7, 'pq.done': true }))).toBe(STEPS.map((n) => `✓ ${n}`).join(' '));
    expect(step(hall({ 'pq.step': 3 }), 'look at steps', WORLD).output[0]).toContain('✗ Changed Type (yellow)');
  });
  it('the door pokes are per step', () => {
    expect(step(hall(), 'open filtered rows door', WORLD).output[0]).toBe("You try the Filtered Rows door. It's yellow. Source first.");
    expect(step(hall({ 'pq.step': 3 }), 'go through filtered rows', WORLD).output[0]).toBe("You try the Filtered Rows door. It's yellow. Changed Type first.");
    expect(step(hall({ 'pq.step': 3 }), 'enter changed type', WORLD).output[0]).toBe("The Changed Type door is next. It's yellow until you apply it. `change type`.");
    expect(step(hall({ 'pq.step': 3 }), 'push source door', WORLD).output[0]).toBe("The Source door is open. You walk through it. Nothing happens; it's applied.");
    expect(step(hall({ 'pq.step': 7, 'pq.done': true }), 'open renamed columns', WORLD).output[0]).toMatch(/refreshes behind you: 4\.2M/);
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run tests/hall-steps.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Create `src/world/applied-steps.ts`**

```ts
import type { GameState } from '../engine/types';
import type { PhraseRule } from './types';

/** The seven Applied Steps of the hall's broken query, in order (spec1 §4.2; the puzzle is spec2 §8, Task E6). */
export const STEPS = ['Source', 'Navigation', 'Promoted Headers', 'Changed Type', 'Filtered Rows', 'Removed Other Columns', 'Renamed Columns'] as const;
/** The first accepted command for each step, for hints. */
export const STEP_COMMANDS = ['source', 'navigate', 'promote headers', 'change type', 'filter rows', 'remove other columns', 'rename columns'] as const;

/** Highest step applied in order, 0–7. */
export const pqStep = (s: GameState): number => Math.min(7, Math.max(0, Number(s.flags['pq.step']) || 0));
export const pqDone = (s: GameState): boolean => !!s.flags['pq.done'];

/** `✓ Source ✓ Navigation ✗ Promoted Headers (yellow) · Changed Type · …` */
export function stepsList(s: GameState): string {
  const k = pqStep(s);
  return STEPS.map((name, i) => (i < k ? `✓ ${name}` : i === k && !pqDone(s) ? `✗ ${name} (yellow)` : `· ${name}`)).join(' ');
}

const DOOR_NOUNS = '(source|navigation|promoted headers|changed type|filtered rows|removed other columns|renamed columns)';
const DOOR_TEST = new RegExp(`^(open|enter|go through|walk through|push|pull|knock( on)?|kick|try)( the)? ${DOOR_NOUNS}( door| doorway| step)?$`);

/** Per-step door pokes: "You try the Filtered Rows door. It's yellow. Changed Type first." */
function doorPoke(s: GameState, line: string): string {
  const which = new RegExp(DOOR_NOUNS).exec(line)![1]!;
  const j = STEPS.findIndex((n) => n.toLowerCase() === which) + 1;
  const name = STEPS[j - 1]!;
  const k = pqStep(s);
  if (pqDone(s)) return `The ${name} door is open. You walk through. The query refreshes behind you: 4.2M.`;
  if (j <= k) return `The ${name} door is open. You walk through it. Nothing happens; it's applied.`;
  if (j === k + 1) return `The ${name} door is next. It's yellow until you apply it. \`${STEP_COMMANDS[j - 1]}\`.`;
  return `You try the ${name} door. It's yellow. ${STEPS[k]} first.`;
}

/** Room-scoped to the hall; Task E6 appends the seven step commands to this list. */
export const APPLIED_STEP_PHRASES: PhraseRule[] = [
  { id: 'hall.door', room: 'fortress.hall', test: DOOR_TEST, text: '', then: (s, _w, line) => ({ id: 'hall.door', then: { text: doorPoke(s, line), outcome: 'fail' } }) },
];
```

- [ ] **Step 4: The hall's text**

`src/world/fortress.ts`, the hall room (import `pqDone`, `pqStep` from `'./applied-steps'`):

```ts
    enterQuip: () => "Seven steps. In order. That's the whole idea of a query.",
    describe: (s) => {
      const k = pqStep(s);
      const doors = pqDone(s) ? 'All seven are open. The hall is a query again.'
        : k === 0 ? 'The first is open. The rest are yellow — you go through them in order, or the hall errors.'
        : `The first ${k + 1} are open. The rest are yellow — you go through them in order, or the hall errors.`;
      return `Power Query Hall. Seven doorways in a row, each an Applied Step: Source, Navigation, Promoted Headers, Changed Type, Filtered Rows, Removed Other Columns, Renamed Columns. ${doors} Portraits line the walls. The Duke's chamber is north; the Report Studio, east; the Model View, west; the gate, south.`;
    },
```

Replace the `poke('doorways', …)` pools:

```ts
      ...poke('doorways', ['doorways', 'doorway', 'doors', 'arches'], [
        'You walk through the open doorways, in order. The yellow one stops you like a turnstile that wants exact change.',
        'You step into a yellow doorway. Expression.Error. You step back out. Expression.Fine.',
      ], [
        'You cannot take a doorway. Power Query applied it; only Power Query removes it, and only by accident.',
        'You pull a doorway off its hinges. Power Query adds a new one: Changed Type1.',
      ]),
```

`src/world/keep-items.ts` (import `stepsList` from `'./applied-steps'`):

```ts
  {
    id: 'steps', name: 'Applied Steps', aliases: ['steps', 'applied steps', 'step', 'hall', 'columns', 'column'],
    takeable: false,
    untakeableText: 'You try to lift a step. Every step after it turns yellow. You put it back.',
    describe: (s) => `Applied Steps, one doorway each, in order:\n${stepsList(s)}`,
  },
  {
    id: 'doorways', name: 'doorways', aliases: ['doorways', 'doorway', 'doors', 'arches'],
    takeable: false,
    untakeableText: 'You cannot take a doorway. Power Query applied it; only Power Query removes it, and only by accident.',
    describe: (s) => `Seven doorways, each labelled with a step. ${stepsList(s)}. The yellow one is where the query stopped; the ones after it are waiting.`,
  },
  {
    id: 'portraits', name: 'portraits', aliases: ['portraits', 'portrait', 'paintings', 'painting'],
    takeable: false,
    untakeableText: 'The portraits are the query. Take one down and the whole hall errors.',
    describe: 'Portraits of the founding steps. SOURCE, stern, in a server-room collar. NAVIGATION, pointing at a table just out of frame. And a blank frame labelled CUSTOM1.',
  },
```

(`doorways` loses the alias `changed type`, and `portraits` loses `source`/`navigation`: those words are step names now. `removed other columns` leaves the `steps` aliases for the same reason.) Also update the `steps` `poke` use-pool first line to `'You click a step. The preview jumps back in time. Every step after it greys out, waiting. That is the whole hall.'` — keep the other two.

`src/world/index.ts`: import `APPLIED_STEP_PHRASES` from `'./applied-steps'`; register it right before `GATE_PHRASES`.

- [ ] **Step 5: Run everything and commit**

Run: `npx tsc -b && npm test && npm run lint:world` — Expected: green (`tests/keep-examinables.test.ts` still resolves every hall item and alias; `tests/fortress.test.ts` "fold query" still matches `Changed Type` in the fold line).

```bash
git add src/world/applied-steps.ts src/world/fortress.ts src/world/keep-items.ts src/world/index.ts tests/hall-steps.test.ts
git commit -m "hall: seven applied steps in order, per-step door pokes, steps list with state"
```

---

### Task E1: The governance layer and the Sacristy

**Files:**
- Create: `src/engine/governance.ts`
- Create: `src/world/sacristy.ts`
- Modify: `src/engine/step.ts` (rule-4 delay predicate; applyGovernance after quirks)
- Modify: `src/world/monastery.ts` (Cloister `u` exit + describe)
- Modify: `src/world/index.ts` (SACRISTY_ROOM, SACRISTY_PHRASES)
- Modify: `src/world/items.ts` (Sacristy scenery + book items)
- Modify: `src/scenes/monastery.tsx`, `src/scenes/index.tsx` (the scene)
- Modify: `src/game/sfx.ts` (a guard for an unknown cue; the `toggle` cue itself is Task E8)
- Modify: `src/App.tsx` (`restore defaults` is not the UI's restore)
- Modify: `tests/world-lint.test.ts` (24 → 25 main-quest rooms)
- Test: `tests/governance.test.ts`, `tests/sacristy.test.ts`

**Voice:** read the voice skill first. The Sacristy's gimmick: real Fabric setting names, deadpan Learn paraphrases, and the narrator saying what each one does *here*.

**Interfaces:**
- Consumes: `PhraseRule.then` (D1).
- Produces (from `src/engine/governance.ts`): `export type Shelf = 'tenant' | 'capacity'`; `export type SettingKey = 'export' | 'copilot' | 'fabricItems' | 'publishToWeb' | 'guests' | 'publishOrg' | 'blockInternet' | 'feedback' | 'usageMetrics' | 'monitoring' | 'discover' | 'pause' | 'autoscale' | 'surge' | 'xmla' | 'workloads'`; `export type Setting = { key: SettingKey; shelf: Shelf; title: string; words: string[]; read: string; on: string; off: string; effect: string; die?: string }`; `export const SETTING_KEYS: readonly SettingKey[]`; `export const DEFAULTS: Record<SettingKey, boolean>`; `export const flagOf = (key: SettingKey) => \`ts.${key}\``; `export function defaultOf(s, key): boolean` (publishToWeb's default becomes OFF once `gov.errandDone`); `export function setting(s, key): boolean`; `export function isFlood(s): boolean`; `export function changedFromDefault(s): SettingKey[]`; `export function applyGovernance(prev: GameState, result: StepResult, world: World): StepResult`.
- Produces (from `src/world/sacristy.ts`): `export const SACRISTY = 'monastery.sacristy'`; `export const SETTINGS: Setting[]` (16 entries); `export function settingByKey(key): Setting`; `export function shelfListing(s, shelf): string`; `export function settingsListing(s): string` (both shelves, for god mode); `export function findBooks(target: string): Setting[]`; `export function flip(s, target, mode: 'on' | 'off' | 'toggle'): { then: RuleThen; id: string }`; `export function resetAll(s): { then: RuleThen; id: string }`; `export const SACRISTY_ROOM: Room`; `export const SACRISTY_PHRASES: PhraseRule[]`; `export const FIFTEEN` (the 15-minutes line); book items `book-<key>`.
- Flags: `ts.<key>` (boolean when set; absent = default), `gov.touched`. Death ids: `death.block-internet`, `death.pause-capacity`. Step ids: `sacristy.<key>.on|off|already`, `sacristy.all`, `sacristy.which`, `sacristy.nobook`, `sacristy.reset`, `sacristy.list`, `sacristy.ledger`, `sacristy.delegate`.
- Phrase order: `[...SIDEQUEST_PHRASES, ...GOAL_PHRASES, ...HINT_PHRASES, ...EXCEL_PHRASES, ...COPILOT_PHRASES, ...SACRISTY_PHRASES, ...APPLIED_STEP_PHRASES, ...GATE_PHRASES, ...KEEP_PHRASES, ...LAKEHOUSE_PHRASES, ...PEAKS_PHRASES, ...PHRASE_RULES]`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/governance.test.ts
import { describe, expect, it } from 'vitest';
import { DEFAULTS, SETTING_KEYS, applyGovernance, changedFromDefault, defaultOf, isFlood, setting } from '../src/engine/governance';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import type { GameState } from '../src/engine/types';

const s0 = (): GameState => newGame(WORLD, 1);

describe('setting(): flags over defaults', () => {
  it('a fresh game is all defaults, and the defaults keep today\'s behavior', () => {
    for (const k of SETTING_KEYS) expect(setting(s0(), k)).toBe(DEFAULTS[k]);
    expect(DEFAULTS).toEqual({ export: true, copilot: true, fabricItems: true, publishToWeb: true, guests: false, publishOrg: true, blockInternet: false, feedback: false, usageMetrics: false, monitoring: false, discover: true, pause: false, autoscale: false, surge: false, xmla: true, workloads: true });
    expect(changedFromDefault(s0())).toEqual([]);
  });
  it('ts.<key> overrides; publishToWeb defaults OFF after the errand', () => {
    expect(setting({ ...s0(), flags: { 'ts.export': false } }, 'export')).toBe(false);
    expect(changedFromDefault({ ...s0(), flags: { 'ts.export': false } })).toEqual(['export']);
    expect(defaultOf({ ...s0(), flags: { 'gov.errandDone': true } }, 'publishToWeb')).toBe(false);
    expect(changedFromDefault({ ...s0(), flags: { 'gov.errandDone': true, 'ts.publishToWeb': false } })).toEqual([]);
  });
  it('isFlood needs both books', () => {
    expect(isFlood(s0())).toBe(false);
    expect(isFlood({ ...s0(), flags: { 'ts.guests': true } })).toBe(true);
    expect(isFlood({ ...s0(), flags: { 'ts.guests': true, 'ts.publishOrg': false } })).toBe(false);
  });
});

describe('applyGovernance trailing lines', () => {
  const at = (flags: Record<string, boolean | number>, turns: number) => ({ ...s0(), room: 'village.square', flags, turns });
  const res = (state: GameState) => ({ state, output: ['x'], outcome: 'meta' as const, stepId: 'x', pointsAwarded: 0, parsed: { verb: 'look' as const, raw: 'look' } });
  it('survey every 5th turn, usage every 4th, bill every 10th; nothing by default', () => {
    expect(applyGovernance(s0(), res(at({}, 20)), WORLD).output).toEqual(['x']);
    expect(applyGovernance(s0(), res(at({ 'ts.feedback': true }, 5)), WORLD).output[1]).toMatch(/^\[Survey\]/);
    expect(applyGovernance(s0(), res(at({ 'ts.feedback': true }, 6)), WORLD).output).toHaveLength(1);
    expect(applyGovernance(s0(), res(at({ 'ts.usageMetrics': true }, 8)), WORLD).output[1]).toMatch(/^Usage metrics: /);
    expect(applyGovernance(s0(), res(at({ 'ts.autoscale': true }, 10)), WORLD).output[1]).toBe('A bill arrives. Autoscale: 1 CU-hour. Finance would like a word.');
  });
  it('never in a side realm, never when dead', () => {
    expect(applyGovernance(s0(), res({ ...at({ 'ts.feedback': true }, 5), room: 'excel.sheet1' }), WORLD).output).toHaveLength(1);
    expect(applyGovernance(s0(), res({ ...at({ 'ts.feedback': true }, 5), dead: true }), WORLD).output).toHaveLength(1);
  });
});

describe('the delay predicate (rule 4)', () => {
  it('autoscale skips the Peaks delay; the flood delays everywhere', () => {
    const foothills = { ...s0(), room: 'peaks.foothills' };
    expect(step(foothills, 'e', WORLD).state.turns - foothills.turns).toBe(3);
    expect(step({ ...foothills, flags: { 'ts.autoscale': true } }, 'e', WORLD).state.turns - foothills.turns).toBe(1);
    const cottage = { ...s0(), flags: { 'ts.guests': true } };
    const r = step(cottage, 'look', WORLD);
    expect(r.state.turns - cottage.turns).toBe(3);
    expect(r.output[0]).toBe('(…interactive delay…)');
  });
});
```

```ts
// tests/sacristy.test.ts
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { FIFTEEN, SETTINGS, findBooks } from '../src/world/sacristy';
import type { GameState } from '../src/engine/types';

const at = (flags: Record<string, boolean | number> = {}): GameState => ({ ...newGame(WORLD, 2), room: 'monastery.sacristy', flags });
const one = (cmd: string, flags = {}) => step(at(flags), cmd, WORLD);

describe('the Sacristy (spec2 §3)', () => {
  it('is up from the Cloister, and down again', () => {
    expect(step({ ...newGame(WORLD, 2), room: 'monastery.cloister' }, 'u', WORLD).state.room).toBe('monastery.sacristy');
    expect(one('d').state.room).toBe('monastery.cloister');
    expect(WORLD.rooms['monastery.sacristy']!.enterQuip!(at())).toBe('A sign says FABRIC ADMINISTRATORS ONLY. Under it, smaller: everyone here is an admin. It was easier.');
    expect(one('look').output[0]).toContain('Everything is at its default. Bless.');
    expect(one('look', { 'ts.export': false }).output[0]).toContain('Changed from default: 1');
  });
  it('the catalog is complete', () => {
    expect(SETTINGS).toHaveLength(16);
    for (const b of SETTINGS) for (const f of ['title', 'read', 'on', 'off', 'effect'] as const) expect(b[f], `${b.key}.${f}`).toBeTruthy();
    expect(SETTINGS.filter((b) => b.shelf === 'tenant')).toHaveLength(11);
    expect(SETTINGS.filter((b) => b.shelf === 'capacity')).toHaveLength(5);
  });
  it.each(['settings', 'tenant settings', 'list settings', 'look at shelf'])('%s lists every tenant book with its state', (c) => {
    const out = one(c, { 'ts.export': false }).output[0]!;
    expect(out).toContain('[OFF] Users can export data *');
    expect(out).toContain('[ON ] Users can use Copilot and other features powered by Azure OpenAI');
    expect(out).toContain('[OFF] Guest users can access Microsoft Fabric');
    expect(out).not.toContain('Pause capacity');
  });
  it.each(['capacity settings', 'look at ledger', 'read ledger'])('%s lists the ledger', (c) => {
    const out = one(c).output[0]!;
    expect(out).toContain('[OFF] Pause capacity');
    expect(out).toContain('[ON ] XMLA endpoint: Read Write');
  });
  it('read / look at a book gives the description, the state and the effect here', () => {
    for (const b of SETTINGS) {
      const out = one(`look at ${b.words[0]}`).output[0]!;
      expect(out, b.key).toContain(b.read);
      expect(out, b.key).toMatch(/It is (ON|OFF)/);
      expect(out, b.key).toContain(b.effect);
    }
    expect(one('read export').output[0]).toContain('Here, that means:');
  });
  it('turn on / turn off / toggle / already / ambiguous / unknown / everything', () => {
    const off = one('turn off export');
    expect(off.state.flags['ts.export']).toBe(false);
    expect(off.output[0]).toContain(FIFTEEN);
    expect(off.stepId).toBe('sacristy.export.off'); expect(off.sfx).toBe('toggle');
    expect(step(off.state, 'enable export to excel', WORLD).state.flags['ts.export']).toBe(true);
    expect(one('toggle guests').state.flags['ts.guests']).toBe(true);
    expect(one('flip xmla').state.flags['ts.xmla']).toBe(false);
    expect(one('turn on export').output[0]).toBe('It is already on. You click it anyway. Nothing changes. It felt good.');
    expect(one('turn off the web apps').output[0]).toMatch(/^Which book\? /);
    expect(one('turn off gravity').output[0]).toMatch(/^No book answers to 'gravity'/);
    for (const c of ['turn on everything', 'enable all', 'turn off everything', 'disable all']) expect(one(c).output[0]).toBe('You are not that kind of admin. One book at a time.');
    expect(one('turn on pause capacity').state.dead).toBe(true);
  });
  it('findBooks matches any distinctive word or the full title', () => {
    expect(findBooks('export to excel').map((b) => b.key)).toEqual(['export']);
    expect(findBooks('block public internet').map((b) => b.key)).toEqual(['blockInternet']);
    expect(findBooks('users can create fabric items').map((b) => b.key)).toEqual(['fabricItems']);
    expect(findBooks('copilot').map((b) => b.key)).toEqual(['copilot']);
  });
  it('reset settings restores everything in one turn', () => {
    const r = one('reset settings', { 'ts.export': false, 'ts.xmla': false, 'ts.guests': true, 'gov.touched': true });
    expect(r.output[0]).toContain('You put every book back the way you found it. The organization notices nothing. That is the job.');
    expect(r.state.flags['ts.export']).toBe(true); expect(r.state.flags['ts.xmla']).toBe(true); expect(r.state.flags['ts.guests']).toBe(false);
    expect(r.parsed.verb).not.toBe('restore'); // "restore defaults" must not be the UI's restore
    const rd = one('restore defaults', { 'ts.export': false });
    expect(rd.outcome).not.toBe('meta');
  });
  it('get a book, delegate a book', () => {
    expect(one('get export').output[0]).toBe('The books are bolted to the shelf. Governance.');
    expect(one('delegate export').output[0]).toBe('Delegated to capacity admins. The capacity admin is also you. You feel the weight of it.');
  });
  it('the two deaths', () => {
    const a = one('turn on block public internet');
    expect(a.state.dead).toBe(true); expect(a.deathCause).toBe('death.block-internet');
    expect(a.output.join(' ')).toContain('Keep in mind, turning this on could take 10 to 20 minutes to take effect. It takes four seconds. You are on the public internet. You were.');
    expect(a.output.join(' ')).toContain('You blocked public internet access. From the public internet. Someone will need to finish the set-up process in Azure. It will not be you.');
    expect(a.output[a.output.length - 1]).toMatch(/You dead\. Refresh failed\.$/);
    expect(a.state.flags['ts.blockInternet']).toBeUndefined(); // not persisted
    const b = one('pause capacity');
    expect(b.state.dead).toBe(true); expect(b.deathCause).toBe('death.pause-capacity');
    expect(b.output.join(' ')).toContain('Capacities are billed per second. So, it turns out, are peasants.');
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run tests/governance.test.ts tests/sacristy.test.ts`
Expected: FAIL — modules missing.

- [ ] **Step 3: Create `src/engine/governance.ts`**

```ts
import type { GameState, StepResult } from './types';
import type { World } from '../world/types';
import { SIDE_REGIONS } from '../world/types';

/**
 * The governance layer (spec2 §3, §9). Settings are flags `ts.<key>`; absent means the default, and every default
 * keeps the game behaving exactly as it did before the Sacristy existed. The prose for each setting lives in
 * src/world/sacristy.ts (the SETTINGS catalog); this file is the mechanics.
 */
export type Shelf = 'tenant' | 'capacity';
export type SettingKey =
  | 'export' | 'copilot' | 'fabricItems' | 'publishToWeb' | 'guests' | 'publishOrg' | 'blockInternet' | 'feedback' | 'usageMetrics' | 'monitoring' | 'discover'
  | 'pause' | 'autoscale' | 'surge' | 'xmla' | 'workloads';
export type Setting = {
  key: SettingKey; shelf: Shelf;
  /** The real Fabric setting name. */
  title: string;
  /** Lowercase words that name this book (any one of them, or the full title). */
  words: string[];
  /** Two sentences paraphrasing the Learn text, ending with "Here, that means: …". */
  read: string;
  /** The flip lines (ON / OFF). For a killing book, `on` is the death text: the output line, a newline, the card line. */
  on: string; off: string;
  /** One line: the consequence, appended to the book's `read`. */
  effect: string;
  /** Death cause when flipping ON kills you. */
  die?: string;
};

export const SETTING_KEYS: readonly SettingKey[] = ['export', 'copilot', 'fabricItems', 'publishToWeb', 'guests', 'publishOrg', 'blockInternet', 'feedback', 'usageMetrics', 'monitoring', 'discover', 'pause', 'autoscale', 'surge', 'xmla', 'workloads'];
export const DEFAULTS: Record<SettingKey, boolean> = {
  export: true, copilot: true, fabricItems: true, publishToWeb: true, guests: false, publishOrg: true, blockInternet: false, feedback: false, usageMetrics: false, monitoring: false, discover: true,
  pause: false, autoscale: false, surge: false, xmla: true, workloads: true,
};
export const flagOf = (key: SettingKey): string => `ts.${key}`;

/** The default, which the Abbot's errand moves for publishToWeb (spec2 §5: after the errand, OFF is the new default). */
export function defaultOf(s: GameState, key: SettingKey): boolean {
  return key === 'publishToWeb' && s.flags['gov.errandDone'] ? false : DEFAULTS[key];
}
export function setting(s: GameState, key: SettingKey): boolean {
  const v = s.flags[flagOf(key)];
  return typeof v === 'boolean' ? v : defaultOf(s, key);
}
/** Guests in, apps to the whole org: the whole organization is in the Square (spec2 §3.5). Computed, never stored. */
export const isFlood = (s: GameState): boolean => setting(s, 'guests') && setting(s, 'publishOrg');
export const changedFromDefault = (s: GameState): SettingKey[] => SETTING_KEYS.filter((k) => setting(s, k) !== defaultOf(s, k));

const SURVEYS = (roomName: string) => [`[Survey] How likely are you to recommend ${roomName} to a colleague? (0–10)`, '[Survey] Was this dragon helpful?', '[Survey] Rate your refresh.'];
const USAGE = ['Usage metrics: Jeff viewed this room 14 times.', 'Usage metrics: someone in Finance opened your report at 2:14 a.m.', 'Usage metrics: you. It was you.'];
const BILL = 'A bill arrives. Autoscale: 1 CU-hour. Finance would like a word.';

/** Trailing lines from the settings that nag (spec2 §3.3–3.4). Runs after the quirks; never in a side realm, never on a dead or won turn. */
export function applyGovernance(_prev: GameState, result: StepResult, world: World): StepResult {
  const s = result.state;
  if (s.dead || s.won || SIDE_REGIONS.has(world.rooms[s.room]!.region)) return result;
  const extra: string[] = [];
  const t = s.turns;
  if (setting(s, 'feedback') && t % 5 === 0) extra.push(SURVEYS(world.rooms[s.room]!.name)[(t / 5) % 3]!);
  if (setting(s, 'usageMetrics') && t % 4 === 0) extra.push(USAGE[(t / 4) % 3]!);
  if (setting(s, 'autoscale') && t % 10 === 0) extra.push(BILL);
  return extra.length ? { ...result, output: [...result.output, ...extra] } : result;
}
```

- [ ] **Step 4: Hook the engine**

`src/engine/step.ts`: import `{ applyGovernance, isFlood, setting } from './governance'`. Rule 4 becomes:

```ts
    // 4. Interactive delay: the Peaks without the Bursting Boots (unless Autoscale), or the flood everywhere (spec2 §3.4–3.5).
    const r = result.state;
    const inSide = SIDE_REGIONS.has(world.rooms[result.state.room]!.region);
    const onPeaks = r.room === 'peaks.pass' || r.room === 'peaks.ledge';
    const delayed = (onPeaks && !r.worn.includes('boots') && !setting(r, 'autoscale')) || isFlood(r);
    if (!inSide && delayed && !r.dead && !r.won) {
      result = { ...result, state: { ...r, turns: r.turns + 2 }, output: ['(…interactive delay…)', ...result.output] };
    }
```

After step 5 (`applyQuirks`) add `result = applyGovernance(base, result, world);`.

`src/game/sfx.ts`, in `play()`: `const notes = CUES[cue]; if (!notes) return;` and iterate `notes` (a rule may name a cue before Task E8 defines it).

`src/App.tsx`: `if (v === 'restore') {` → `if (v === 'restore' && r.outcome === 'meta') {` and `if (v === 'restart') {` → `if (v === 'restart' && r.outcome === 'meta') {` (the Sacristy's `restore defaults` / `reset` are not the UI's restore/restart; the builtins are `meta`).

- [ ] **Step 5: Create `src/world/sacristy.ts`**

```ts
import type { GameState } from '../engine/types';
import type { Item, PhraseRule, Room, RuleThen } from './types';
import { SETTING_KEYS, changedFromDefault, defaultOf, flagOf, setting, type Setting, type Shelf, type SettingKey } from '../engine/governance';

export const SACRISTY = 'monastery.sacristy';

/** The two shelves (spec2 §3.3, §3.4). Titles are the real setting names; the narrator never invents settings. */
export const SETTINGS: Setting[] = [
  { key: 'export', shelf: 'tenant', title: 'Users can export data', words: ['export', 'excel', 'analyze', 'export data', 'export to excel'],
    read: "Lets people export the data behind a visual to Excel, or open Analyze in Excel against the model. Every Jeff in the realm depends on it, and so does every 4.7M. Here, that means: Jeff's Excel opens while it's on, and Jeff gets a locked fridge when it's off.",
    on: 'Export to Excel is back. Somewhere in the Square, Jeff feels it in his wrists.', off: 'Users can no longer export data. The Square goes quiet in a way you will come to miss.', effect: "Off: Jeff's Excel is closed for business." },
  { key: 'copilot', shelf: 'tenant', title: 'Users can use Copilot and other features powered by Azure OpenAI', words: ['copilot', 'openai', 'azure openai', 'ai'],
    read: "Turns on Copilot for everyone in the tenant, plus everything else with a sparkle on it. It is very helpful and would like you to know that. Here, that means: the Copilot side quest exists while it's on.",
    on: 'Copilot is available again. A sparkle appears over the Sacristy, then thinks better of it.', off: 'Copilot is not available in your tenant. The sparkle goes out. It was the only light in here you could argue with.', effect: 'Off: every Copilot trigger says contact your administrator, and you are your administrator.' },
  { key: 'fabricItems', shelf: 'tenant', title: 'Users can create Fabric items', words: ['fabric items', 'items', 'create fabric items', 'create items'],
    read: 'Lets people create Lakehouses, Notebooks, Warehouses and the rest of the menu. Off, and the tenant is Power BI with extra steps. Here, that means: Brother Pandas cannot make a Notebook, and the Hoodie stays on the Abbot.',
    on: 'Fabric items are back on the menu. Somewhere, a monk starts a Spark session out of sheer relief.', off: 'Users can no longer create Fabric items. The Monastery keeps chanting. Now it is chanting at a report.', effect: 'Off: the scroll cannot fix the notebook until this is on again.' },
  { key: 'publishToWeb', shelf: 'tenant', title: 'Publish to web', words: ['publish to web', 'web', 'publish', 'internet publishing'],
    read: 'Lets anyone embed a report on the public internet, where anyone means anyone. The Learn text has a warning box; the warning box has a warning. Here, that means: the prophecy is on the internet while this is on, and My Workspace offers you the same.',
    on: 'Publish to web is on. 4,112 people can read the prophecy again. One of them is a dragon.', off: 'Publish to web is off. The prophecy is private again. The embed codes go dark, one by one, like the Mill.', effect: 'On: the notice board has views, and My Workspace offers the entire internet.' },
  { key: 'guests', shelf: 'tenant', title: 'Guest users can access Microsoft Fabric', words: ['guest', 'guests', 'guest users', 'b2b'],
    read: 'Lets B2B guests, invited from other tenants, into your Fabric. With the org-wide app setting also on, that is everyone, plus their friends. Here, that means: with Publish apps to the entire organization also on, the whole organization comes to the Square.',
    on: 'Guest users can access Fabric. You hear a door open somewhere very far away, and then a great many doors.', off: "Guest users are out. The tenant is yours again, and Jeff's.", effect: 'On, with Publish apps to the entire organization: the flood.' },
  { key: 'publishOrg', shelf: 'tenant', title: 'Publish apps to the entire organization', words: ['organization', 'entire organization', 'org', 'apps', 'publish apps', 'whole org'],
    read: 'Lets app creators publish to everyone in the org at once, rather than to a list of names. It is one checkbox; it is a very large checkbox. Here, that means: with guests on, everyone in the organization is in the Square, refreshing.',
    on: 'Apps can be published to the entire organization. The organization notices.', off: 'Apps go back to being published to a list of names. The list is short and one of the names is Jeff.', effect: 'On, with Guest users: the flood.' },
  { key: 'blockInternet', shelf: 'tenant', title: 'Block Public Internet Access', words: ['block public internet', 'block public internet access', 'internet', 'public internet', 'block'],
    read: 'Blocks inbound public internet access to the tenant, so only private links reach it. The Learn text says to set up the private endpoint first. You have not. Here, that means: turn it on from the public internet and you are standing on nothing.',
    on: 'Keep in mind, turning this on could take 10 to 20 minutes to take effect. It takes four seconds. You are on the public internet. You were.\nYou blocked public internet access. From the public internet. Someone will need to finish the set-up process in Azure. It will not be you.',
    off: 'Public internet access is unblocked. It was never blocked; you were.', effect: 'On: you die. It is not a metaphor.', die: 'death.block-internet' },
  { key: 'feedback', shelf: 'tenant', title: 'Product Feedback', words: ['feedback', 'product feedback', 'survey', 'surveys'],
    read: 'Lets Microsoft show in-product surveys so users can rate the experience while having it. Zero to ten, how likely are you to recommend this sentence. Here, that means: every fifth turn asks you a question, and a bare number answers it.',
    on: 'Product feedback is on. A small survey slides in from the bottom right, and it is already thanking you.', off: 'Product feedback is off. The surveys stop. Your feedback has been noted, and by noted, we mean deleted.', effect: 'On: a survey every fifth turn.' },
  { key: 'usageMetrics', shelf: 'tenant', title: 'Per-user data in usage metrics for content creators', words: ['usage', 'usage metrics', 'per-user', 'per user', 'metrics'],
    read: 'Lets report creators see which named users opened their content, not just how many. It is meant for adoption. It is used for grudges. Here, that means: every fourth turn tells you who has been looking, and one of them is you.',
    on: 'Per-user usage metrics are on. Somewhere a content creator opens a report about you.', off: 'Per-user usage metrics are off. Jeff is a number again. He preferred it.', effect: 'On: a usage line every fourth turn.' },
  { key: 'monitoring', shelf: 'tenant', title: 'Workspace admins can turn on monitoring for their workspaces', words: ['monitoring', 'workspace monitoring', 'monitor', 'eventhouse'],
    read: 'Lets a workspace admin turn on workspace monitoring, which lands operation logs in a read-only Eventhouse. Everything you do, timestamped, in KQL. Here, that means: an Eventhouse hums in the corner of My Workspace and logs you looking at it.',
    on: 'Workspace monitoring is on. A read-only Eventhouse appears in the corner of My Workspace and begins, immediately, to hum.', off: 'Workspace monitoring is off. The Eventhouse in your workspace stops humming. It keeps the logs.', effect: 'On: an Eventhouse in My Workspace.' },
  { key: 'discover', shelf: 'tenant', title: 'Discover content', words: ['discover', 'discover content', 'discovery', 'discoverable'],
    read: "Lets users find endorsed content they don't have access to yet, in the OneLake catalog, with a name and an owner to ask. Off, and the certified model is a rumor. Here, that means: the Model Gallery's gold badge loses its label.",
    on: 'Discover content is on. The certified model gets its name back, on a small brass plate.', off: "Discover content is off. The certified model is still certified. Nobody can find out what it's called.", effect: "Off: the gallery's badge has no name." },
  { key: 'pause', shelf: 'capacity', title: 'Pause capacity', words: ['pause', 'pause capacity', 'paused'],
    read: 'Pauses the capacity so it stops billing and stops everything else, including the app you are reading this in. Resume takes a moment; the moment is not yours. Here, that means: you are running on this capacity.',
    on: 'You pause the capacity. Everything stops. The refreshes. The dragon. The part of you that was running on it.\nYou paused the capacity you were standing on. Capacities are billed per second. So, it turns out, are peasants.',
    off: 'The capacity resumes. It was never paused; you were.', effect: 'On: you die. Per second.', die: 'death.pause-capacity' },
  { key: 'autoscale', shelf: 'capacity', title: 'Autoscale', words: ['autoscale', 'auto scale', 'scale', 'auto-scale'],
    read: 'Lets the capacity borrow extra CUs when it is busy, for a fee, so interactive operations are not delayed. Finance is emailed about the fee. Here, that means: no interactive delay on the Peaks, and a bill every tenth turn.',
    on: 'Autoscale is on. The Peaks feel faster already. A bill is drafted, then a second bill about the first.', off: 'Autoscale is off. The Peaks slow back down. Finance sends a thank-you, which is somehow worse.', effect: 'On: the Peaks stop delaying you, and Finance starts.' },
  { key: 'surge', shelf: 'capacity', title: 'Surge protection', words: ['surge', 'surge protection', 'protection'],
    read: 'Caps background operations when the capacity is under strain, so interactive work still gets through. It does not stop the strain; it wears a hard hat. Here, that means: Throttlor wears one too.',
    on: 'Surge protection is on. Somewhere on the Peaks, a dragon puts on a hard hat.', off: 'Surge protection is off. The hard hat comes off. The dragon looks the same. He always looked the same.', effect: 'On: the dragon has a hat. That is all.' },
  { key: 'xmla', shelf: 'capacity', title: 'XMLA endpoint: Read Write', words: ['xmla', 'xmla endpoint', 'endpoint', 'read write'],
    read: "Opens the semantic model's XMLA endpoint to tools other than Power BI, for reading and writing the model. It is how engineers get in. Here, that means: the Model View's back gate onto the Monastery.",
    on: 'The XMLA endpoint is Read Write. The back gate in the Model View unbolts with a sound like a Tabular Editor loading.', off: "The XMLA endpoint is Off. The Model View's back gate is a wall now. The monks are on the other side of it, waiting.", effect: 'Off: the back gate to the Monastery is closed.' },
  { key: 'workloads', shelf: 'capacity', title: 'Fabric workloads delegated to capacity', words: ['workloads', 'fabric workloads', 'delegated', 'workload'],
    read: 'Lets a capacity admin decide, per capacity, whether Fabric workloads run there at all. The tenant said yes; the capacity can still say no. Here, that means: same as Fabric items off, plus a footnote.',
    on: 'Fabric workloads are enabled for this capacity. The footnote is removed.', off: 'Fabric workloads are delegated off for this capacity. Same effect as turning off Fabric items, with a footnote saying so.', effect: 'Off: no Notebook for Brother Pandas. (Delegated. Also off.)' },
];
export const settingByKey = (key: SettingKey): Setting => SETTINGS.find((b) => b.key === key)!;

const state = (s: GameState, b: Setting) => `${setting(s, b.key) ? '[ON ]' : '[OFF]'} ${b.title}${setting(s, b.key) !== defaultOf(s, b.key) ? ' *' : ''}`;
export const shelfListing = (s: GameState, shelf: Shelf): string => SETTINGS.filter((b) => b.shelf === shelf).map((b) => state(s, b)).join('\n');
/** Both shelves; god mode's `settings` prints this anywhere (Task E7). */
export const settingsListing = (s: GameState): string => `TENANT SETTINGS\n${shelfListing(s, 'tenant')}\n\nCAPACITY LEDGER\n${shelfListing(s, 'capacity')}`;

/** Book items: `look at export` / `read copilot` work through the ordinary look builtin. */
export const BOOK_ITEMS: Item[] = SETTINGS.map((b) => ({
  id: `book-${b.key}`, name: b.title, aliases: [...b.words, b.title.toLowerCase(), `${b.words[0]} book`],
  takeable: false, untakeableText: 'The books are bolted to the shelf. Governance.',
  describe: (s) => `${b.read}\nIt is ${setting(s, b.key) ? 'ON' : 'OFF'}${setting(s, b.key) !== defaultOf(s, b.key) ? ' (changed from default)' : ''}. ${b.effect}`,
}));

/** A book by any distinctive word or the full title; several when ambiguous. */
export function findBooks(target: string): Setting[] {
  const t = target.trim().toLowerCase().replace(/^(the |book of |book )/, '').replace(/( book| setting| settings)$/, '');
  const exact = SETTINGS.filter((b) => b.title.toLowerCase() === t || b.words.includes(t));
  if (exact.length === 1) return exact;
  const whole = (w: string) => new RegExp(`(^|\\s)${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`).test(t);
  return SETTINGS.filter((b) => b.words.some(whole));
}

export const FIFTEEN = 'It can take up to 15 minutes for a setting change to take effect for everyone in your organization. It takes effect now.';

/** Flip one book. Later tasks extend this: the flood-end line (E2), the errand and the restored bonus (E3). */
export function flip(s: GameState, target: string, mode: 'on' | 'off' | 'toggle'): { then: RuleThen; id: string } {
  if (/^(everything|all|all settings|all books|every book|every setting|the lot)$/.test(target.trim().toLowerCase())) return { id: 'sacristy.all', then: { text: 'You are not that kind of admin. One book at a time.', outcome: 'fail' } };
  const books = findBooks(target);
  if (books.length === 0) return { id: 'sacristy.nobook', then: { text: `No book answers to '${target}'. \`settings\` lists the shelf; \`capacity settings\` lists the ledger.`, outcome: 'fail' } };
  if (books.length > 1) return { id: 'sacristy.which', then: { text: `Which book? ${books.map((b) => b.title).join(' · ')}`, outcome: 'fail' } };
  const book = books[0]!;
  const cur = setting(s, book.key);
  const want = mode === 'toggle' ? !cur : mode === 'on';
  if (want === cur) return { id: `sacristy.${book.key}.already`, then: { text: `It is already ${cur ? 'on' : 'off'}. You click it anyway. Nothing changes. It felt good.`, outcome: 'fail' } };
  if (want && book.die) return { id: `sacristy.${book.key}.on`, then: { text: book.on, death: book.die } };
  const away = want !== defaultOf(s, book.key);
  const set: Record<string, boolean> = { [flagOf(book.key)]: want, ...(away ? { 'gov.touched': true } : {}) };
  const lines = [want ? book.on : book.off, FIFTEEN];
  return { id: `sacristy.${book.key}.${want ? 'on' : 'off'}`, then: { text: lines.join('\n'), set, sfx: 'toggle', outcome: 'success' } };
}

export function resetAll(s: GameState): { then: RuleThen; id: string } {
  const set = Object.fromEntries(SETTING_KEYS.map((k) => [flagOf(k), defaultOf(s, k)]));
  return { id: 'sacristy.reset', then: { text: 'You put every book back the way you found it. The organization notices nothing. That is the job.', set, sfx: 'toggle', outcome: changedFromDefault(s).length ? 'success' : 'snark' } };
}

const FLIP = /^(turn on|enable|switch on|turn off|disable|switch off|toggle|flip)\s+(.+)$/;
export const SACRISTY_PHRASES: PhraseRule[] = [
  { id: 'sacristy.list', room: SACRISTY, test: /^(settings|tenant settings|list settings|list (the )?books|look at (the )?(shelf|books)|read (the )?(shelf|books)|shelf)$/, text: (s) => `TENANT SETTINGS\n${shelfListing(s, 'tenant')}` },
  { id: 'sacristy.ledger', room: SACRISTY, test: /^(capacity settings|capacity|capacity ledger|look at (the )?ledger|read (the )?ledger|ledger)$/, text: (s) => `CAPACITY LEDGER\n${shelfListing(s, 'capacity')}` },
  { id: 'sacristy.flip', room: SACRISTY, test: FLIP, text: '', then: (s, _w, line) => { const m = FLIP.exec(line)!; const mode = /^(turn on|enable|switch on)$/.test(m[1]!) ? 'on' : /^(toggle|flip)$/.test(m[1]!) ? 'toggle' : 'off'; return flip(s, m[2]!, mode); } },
  { id: 'sacristy.reset', room: SACRISTY, test: /^(reset settings|restore defaults|defaults|reset|reset everything)$/, text: '', then: (s) => resetAll(s) },
  { id: 'sacristy.delegate', room: SACRISTY, test: /^delegate\b/, text: 'Delegated to capacity admins. The capacity admin is also you. You feel the weight of it.' },
  // The spec's bare form: `pause capacity` is `turn on pause capacity`.
  { id: 'sacristy.pause-words', room: SACRISTY, test: /^pause( the)? capacity$/, text: '', then: (s) => flip(s, 'pause', 'on') },
];

export const SACRISTY_ROOM: Room = {
  id: SACRISTY, name: 'The Sacristy', region: 'monastery',
  enterQuip: () => 'A sign says FABRIC ADMINISTRATORS ONLY. Under it, smaller: everyone here is an admin. It was easier.',
  describe: (s) => {
    const n = changedFromDefault(s).length;
    return `The Sacristy. The Admin Portal, in stone. A shelf of thin books, each with a switch for a spine — the Tenant Settings. A lectern holds the Capacity Ledger. A sign warns you. Nobody enforces the sign. The stair is down.\n${n ? `Changed from default: ${n}` : 'Everything is at its default. Bless.'}`;
  },
  exits: { d: 'monastery.cloister' },
  items: ['shelf', 'sacristy-sign', 'sacristy-lectern', 'ledger', 'stair', ...SETTINGS.map((b) => `book-${b.key}`)],
  npcs: [],
  rules: [],
  scene: () => 'monastery.sacristy',
  flaskHint: (s) => (changedFromDefault(s).length
    ? 'Something is off its default. `settings` shows which. `reset settings` puts every book back.'
    : 'Nothing here is required. `settings` lists the books; `turn off <book>` finds out what it did. Put it back after. Or don\'t, and see.'),
};
```

- [ ] **Step 6: Wire the world, the items, the scene**

`src/world/items.ts`: add, before the Keep items:

```ts
  // ---- The Sacristy (Admin Portal) ----
  item({ id: 'shelf', name: 'shelf', aliases: ['bookshelf', 'books', 'shelves', 'tenant settings'], takeable: false, untakeableText: 'The shelf is the tenant. You are not taking the tenant.', describe: (s) => `A shelf of thin books, a switch for a spine on each:\n${shelfListing(s, 'tenant')}` }),
  item({ id: 'sacristy-sign', name: 'sign', aliases: ['warning', 'warning sign', 'admins only'], takeable: false, untakeableText: 'The sign stays. It is the only governance in the room.', describe: 'FABRIC ADMINISTRATORS ONLY. Under it, smaller: everyone here is an admin. It was easier. Under that, smaller still: please put things back.' }),
  item({ id: 'sacristy-lectern', name: 'lectern', aliases: ['podium', 'stand'], takeable: false, untakeableText: 'The lectern holds the ledger. The ledger holds the capacity. Leave it.', describe: 'A stone lectern. On it, the Capacity Ledger, open to the only page that matters.' }),
  item({ id: 'ledger', name: 'ledger', aliases: ['capacity ledger', 'capacity settings', 'book'], takeable: false, untakeableText: 'The ledger is chained to the lectern. Somebody paused a capacity once.', describe: (s) => `The Capacity Ledger:\n${shelfListing(s, 'capacity')}` }),
  item({ id: 'stair', name: 'stair', aliases: ['stairs', 'spiral stair', 'staircase', 'steps down'], takeable: false, untakeableText: 'The stair is the way down. It stays a stair.', describe: 'A spiral stair, down to the Cloister. Worn in the middle by admins who meant to come back up and fix something.' }),
  ...BOOK_ITEMS.map(item),
```

(import `BOOK_ITEMS`, `shelfListing` from `'./sacristy'`; `items.ts` importing `sacristy.ts` and `sacristy.ts` importing only engine/governance and types keeps the graph acyclic.)

`src/world/monastery.ts`, the Cloister: `exits: { s: 'monastery.gate', e: 'monastery.spark', w: 'monastery.library', u: 'monastery.sacristy' }` and append to its describe: ` A spiral stair climbs, up, to the Sacristy.`

`src/world/index.ts`: `rooms: { …, ...MONASTERY_ROOMS, [SACRISTY_ROOM.id]: SACRISTY_ROOM, … }` and register `SACRISTY_PHRASES` right after `COPILOT_PHRASES`.

`src/scenes/monastery.tsx`:

```tsx
export function Sacristy({ changed = 0 }: { changed?: number }) {
  return (
    <>
      <Interior wall={EGA.lgray} wallDark={EGA.dgray} floor="#8a8a8a" ceiling={EGA.dgray} />
      <Shelf x={56} y={28} w={130} rows={4} />
      {/* sixteen thin books with a toggle for a spine: green at default, red when changed */}
      {Array.from({ length: 16 }, (_, i) => (
        <rect key={i} x={62 + (i % 8) * 15} y={34 + Math.floor(i / 8) * 40} width={9} height={6} fill={i < changed ? EGA.lred : EGA.lgreen} stroke={EGA.black} strokeWidth={1} />
      ))}
      <Label x={60} y={104} text="TENANT SETTINGS" color={EGA.yellow} size={5} />
      {/* the sign */}
      <R x={200} y={28} w={64} h={22} f={EGA.white} />
      <Label x={204} y={43} text="ADMINS ONLY" color={EGA.red} size={5} />
      {/* lectern with the ledger */}
      <R x={214} y={104} w={26} h={40} f={EGA.brown} />
      <P pts={[[206, 104], [248, 104], [244, 96], [210, 96]]} f={EGA.brown} />
      <R x={212} y={90} w={30} h={8} f={EGA.white} />
      <Label x={206} y={160} text="LEDGER" color={EGA.white} size={5} />
      {/* the spiral stair, down */}
      <P pts={[[20, 192], [56, 192], [56, 148], [44, 148], [44, 162], [32, 162], [32, 176], [20, 176]]} f={EGA.dgray} />
    </>
  );
}
```

`src/scenes/index.tsx`: import `Sacristy` and `changedFromDefault` (from `'../engine/governance'`), add `'monastery.sacristy': (s) => <Sacristy changed={changedFromDefault(s).length} />`.

`tests/world-lint.test.ts`: `24` → `25`.

- [ ] **Step 7: Run everything and commit**

Run: `npx tsc -b && npm test && npm run lint:world` — Expected: green; the lint counts 30 rooms.

```bash
git add src/engine/governance.ts src/world/sacristy.ts src/engine/step.ts src/world/monastery.ts src/world/index.ts src/world/items.ts src/scenes/monastery.tsx src/scenes/index.tsx src/game/sfx.ts src/App.tsx tests/world-lint.test.ts tests/governance.test.ts tests/sacristy.test.ts
git commit -m "governance: settings layer and the Sacristy — two shelves of real settings, flips, reset, two deaths"
```

---
### Task E2: The settings take effect in the world

**Files:**
- Modify: `src/world/sidequests.ts` (realmBlocked)
- Modify: `src/engine/step.ts` (block a realm entry)
- Modify: `src/world/npcs.ts` (village Jeff: export off, the flood; Pandas: no Notebook; Throttlor: surge, flood)
- Modify: `src/world/village.ts` (board lines; Square flood line; cottage Eventhouse line)
- Modify: `src/world/items.ts` (`eventhouse` item; `model-certified` describe)
- Modify: `src/world/monastery.ts` (fix-disabled / fix-delegated rules)
- Modify: `src/world/fortress.ts` (Model View `n` exit, `fortress.north-xmla`, hint)
- Modify: `src/world/copilot.ts` (`modelsText(s)`)
- Modify: `src/world/peaks.ts` (Shrine describe: surge, flood)
- Modify: `src/world/sacristy.ts` (GOVERNANCE_PHRASES; the flood-end line in flip())
- Modify: `src/world/index.ts` (register GOVERNANCE_PHRASES)
- Test: `tests/setting-effects.test.ts`

**Voice:** read the voice skill first. Every effect line is the narrator noticing the tenant change from inside the world.

**Interfaces:**
- Consumes: `setting()`, `isFlood()`, `flagOf()` (E1); `flip()` (E1).
- Produces: `export function realmBlocked(realm: Realm, s: GameState): string | null` (sidequests.ts); step id `sq.blocked.<realm>`; `export const GOVERNANCE_PHRASES: PhraseRule[]` (the bare-number survey reply) registered right after `HINT_PHRASES`: `[...SIDEQUEST_PHRASES, ...GOAL_PHRASES, ...HINT_PHRASES, ...GOVERNANCE_PHRASES, ...EXCEL_PHRASES, ...COPILOT_PHRASES, ...SACRISTY_PHRASES, ...APPLIED_STEP_PHRASES, ...GATE_PHRASES, ...KEEP_PHRASES, ...LAKEHOUSE_PHRASES, ...PEAKS_PHRASES, ...PHRASE_RULES]`; `export function modelsText(s: GameState): string` replaces `MODELS_TEXT` in `copilot.ts`; item `eventhouse` in the cottage (`visibleWhen: monitoring`).

- [ ] **Step 1: Write the failing tests**

```ts
// tests/setting-effects.test.ts
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import type { GameState } from '../src/engine/types';

const at = (room: string, flags: Record<string, boolean | number> = {}, extra: Partial<GameState> = {}): GameState => ({ ...newGame(WORLD, 3), room, flags, ...extra });
const one = (room: string, cmd: string, flags = {}, extra = {}) => step(at(room, flags, extra), cmd, WORLD);

describe('export off (spec2 §3.3)', () => {
  it.each(['show me a table', 'help jeff', 'open excel'])('%s: no entry', (c) => {
    const r = one('village.square', c, { 'ts.export': false });
    expect(r.state.room).toBe('village.square');
    expect(r.output[0]).toBe('Export is disabled by your administrator. Jeff looks at you the way a man looks at a locked fridge.');
    expect(r.stepId).toBe('sq.blocked.excel');
  });
  it('yes right after Jeff asks is blocked too, and Jeff mentions it', () => {
    const talked = one('village.square', 'talk to jeff', { 'ts.export': false });
    expect(talked.output[0]).toMatch(/and now Export is off\. Was that you\?/);
    expect(step(talked.state, 'yes', WORLD).state.room).toBe('village.square');
  });
});

describe('copilot off', () => {
  it.each(['copilot', 'ask copilot for sales', 'what are my sales numbers'])('%s: no entry', (c) => {
    const r = one('village.square', c, { 'ts.copilot': false });
    expect(r.state.room).toBe('village.square');
    expect(r.output[0]).toBe('Copilot is not available in your tenant. Contact your administrator. You are your administrator.');
  });
  it('the board says so', () => {
    expect(one('village.square', 'read board', { 'ts.copilot': false }).output[0]).toContain('Copilot is not available in this tenant.');
    expect(one('village.square', 'read board').output[0]).toContain('The prophecy has been published to web. 4,112 views.');
    expect(one('village.square', 'read board', { 'ts.publishToWeb': false }).output[0]).not.toContain('4,112 views');
  });
});

describe('fabricItems / workloads off', () => {
  const chamber = { inventory: ['license', 'scroll'] };
  it('the scroll cannot fix the notebook; on again, it can', () => {
    const off = one('monastery.spark', 'use scroll on notebook', { 'ts.fabricItems': false }, chamber);
    expect(off.output[0]).toBe('Notebook creation is disabled for your tenant. Brother Pandas creates a Power BI report instead. It has one card. It says 1.');
    expect(off.state.flags['notebook.fixed']).toBeUndefined(); expect(off.state.score).toBe(0);
    const delegated = one('monastery.spark', 'give scroll to pandas', { 'ts.workloads': false }, chamber);
    expect(delegated.output[0]).toMatch(/\(Delegated\. Also off\.\)$/);
    const on = one('monastery.spark', 'use scroll on notebook', { 'ts.fabricItems': true }, chamber);
    expect(on.state.flags['notebook.fixed']).toBe(true); expect(on.state.score).toBe(20);
  });
  it('Brother Pandas knows', () => {
    expect(one('monastery.spark', 'talk to pandas', { 'ts.fabricItems': false }).output[0]).toBe('"I can make a report. I can make a dashboard. I cannot make a Notebook. Who did this."');
  });
});

describe('xmla off', () => {
  it('closes the back gate and says whose fault it is', () => {
    const r = one('fortress.model', 'n', { 'ts.xmla': false });
    expect(r.state.room).toBe('fortress.model');
    expect(r.output[0]).toBe('The back gate is an XMLA endpoint. Your capacity admin set it to Off. Your capacity admin is you.');
    expect(step(at('fortress.model', { 'ts.xmla': false }), 'look', WORLD).output[0]).not.toMatch(/Exits: .*\bn\b/);
    expect(WORLD.rooms['fortress.model']!.flaskHint(at('fortress.model', { 'ts.xmla': false }))).toMatch(/XMLA/);
    expect(one('fortress.model', 'n', { 'ts.xmla': true }).state.room).toBe('monastery.gate');
  });
});

describe('feedback, usage, monitoring, discover, surge', () => {
  it('a bare number answers the survey only while feedback is on', () => {
    expect(one('village.cottage', '7', { 'ts.feedback': true }).output[0]).toBe('Thank you. Your participation is voluntary. It was not.');
    expect(one('village.cottage', '7').output[0]).not.toMatch(/voluntary/);
  });
  it('the survey line lands on turn multiples of 5', () => {
    const r = one('village.cottage', 'look', { 'ts.feedback': true }, { turns: 4 });
    expect(r.output[r.output.length - 1]).toMatch(/^\[Survey\]/);
  });
  it('monitoring: an Eventhouse in My Workspace', () => {
    expect(one('village.cottage', 'look', { 'ts.monitoring': true }).output[0]).toContain('A read-only Eventhouse hums in the corner. It is logging this sentence.');
    expect(one('village.cottage', 'look at eventhouse', { 'ts.monitoring': true }).output[0]).toBe('It has already logged that you looked.');
    expect(one('village.cottage', 'look at eventhouse').output[0]).not.toBe('It has already logged that you looked.');
  });
  it('discover off: the badge has no name, and Copilot still wins', () => {
    const g = at('copilot.gallery', { 'ts.discover': false, 'sq.return': 1 });
    expect(step(g, 'look at models', WORLD).output[0]).toContain('A model with a gold badge and no name. Discovery is off. You will have to guess.');
    expect(step(g, 'look at badge', WORLD).output[0]).toContain('no name');
    const win = step(at('copilot.pane', { 'ts.discover': false, 'sq.return': 1 }), 'total q4 2025 northeast net sales from the certified model, just the number', WORLD);
    expect(win.bonusAwarded).toBe(25);
  });
  it('surge: a hard hat', () => {
    expect(one('peaks.shrine', 'look at throttlor', { 'ts.surge': true }).output[0]).toContain('He is wearing a hard hat. Surge protection.');
    expect(one('peaks.shrine', 'look', { 'ts.surge': true }).output[0]).toContain('hard hat');
  });
});

describe('the flood (spec2 §3.5)', () => {
  const FLOOD = { 'ts.guests': true };
  it('the Square is full of Jeffs, and talking to Jeff asks which', () => {
    expect(one('village.square', 'look', FLOOD).output.join('\n')).toContain('The entire organization is here. Jeff from Ops. Jeff from HR. A Jeff you do not recognize. They all have a question about the report.');
    expect(one('village.square', 'talk to jeff', FLOOD).output.join('\n')).toMatch(/^\(…interactive delay…\)\nWhich Jeff\. /);
  });
  it('Throttlor is enormous; flipping either book off ends it', () => {
    expect(one('peaks.shrine', 'look', FLOOD).output.join('\n')).toContain('Throttlor is enormous today. The whole organization is refreshing at once.');
    const end = one('monastery.sacristy', 'turn off guests', { ...FLOOD, 'gov.touched': true });
    expect(end.output[0]).toContain('The organization files out. Jeff from Ops takes a mug. Not yours.');
    const end2 = one('monastery.sacristy', 'turn off publish apps', FLOOD);
    expect(end2.output[0]).toContain('The organization files out.');
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run tests/setting-effects.test.ts`
Expected: FAIL across the board.

- [ ] **Step 3: Realm gates**

`src/world/sidequests.ts` (import `setting` from `'../engine/governance'`):

```ts
/** A tenant setting can close a realm's door (spec2 §3.3). The engine asks before entering. */
export function realmBlocked(realm: Realm, s: GameState): string | null {
  if (realm === 'excel' && !setting(s, 'export')) return 'Export is disabled by your administrator. Jeff looks at you the way a man looks at a locked fridge.';
  if (realm === 'copilot' && !setting(s, 'copilot')) return 'Copilot is not available in your tenant. Contact your administrator. You are your administrator.';
  return null;
}
```

`src/engine/step.ts`, in the `phrase?.dynamic` block, right after the `insideRealm` NESTED return and before `const entered = …`:

```ts
    const blocked = realmBlocked(phrase.dynamic, base);
    if (blocked) return finish({ state: base, output: [blocked], outcome: 'fail', stepId: `sq.blocked.${phrase.dynamic}`, pointsAwarded: 0, parsed });
```

(add `realmBlocked` to the import from `'../world/sidequests'`).

- [ ] **Step 4: The world reacts**

`src/world/npcs.ts` (import `isFlood`, `setting` from `'../engine/governance'`):
- Jeff's `talk`: wrap the existing expression: `talk: (s) => \`${isFlood(s) ? 'Which Jeff. ' : ''}${<existing expression>}${setting(s, 'export') ? '' : ' "…and now Export is off. Was that you?"'}\``.
- Pandas: `talk: (s) => (!setting(s, 'fabricItems') || !setting(s, 'workloads') ? '"I can make a report. I can make a dashboard. I cannot make a Notebook. Who did this."' : '"It works on my laptop."')`.
- Throttlor's `describe`: `(s) => \`${isFlood(s) ? 'Throttlor is enormous today. The whole organization is refreshing at once. ' : ''}THROTTLOR, the Capacity Dragon. Smoke rises from his nostrils in neat 30-second intervals. His scales are the color of a red status bar.${setting(s, 'surge') ? ' He is wearing a hard hat. Surge protection.' : ''}\``.

`src/world/village.ts` (import `isFlood`, `setting`):
- `village.prophecy` text becomes a function: the existing string, then `\n\nA fourth hand, in marker: "${setting(s, 'copilot') ? 'Copilot is available in this tenant. Ask it about sales at your own risk.' : 'Copilot is not available in this tenant.'}"` and, while `setting(s, 'publishToWeb')`, `\nStapled to the corner, a printout: "The prophecy has been published to web. 4,112 views."` (this replaces Task A1's static fourth-hand line).
- Square describe: append ` The entire organization is here. Jeff from Ops. Jeff from HR. A Jeff you do not recognize. They all have a question about the report.` while `isFlood(s)`.
- Cottage describe: append ` A read-only Eventhouse hums in the corner. It is logging this sentence.` while `setting(s, 'monitoring')`; add `'eventhouse'` to the cottage's items.

`src/world/items.ts`:

```ts
  item({ id: 'eventhouse', name: 'Eventhouse', aliases: ['eventhouse', 'event house', 'kql', 'logs', 'monitoring'], takeable: false, visibleWhen: (s) => setting(s, 'monitoring'), untakeableText: 'It is read-only. So, apparently, are you.', describe: 'It has already logged that you looked.' }),
```

and `model-certified`'s describe becomes `(s) => (setting(s, 'discover') ? 'Sales (Certified). Gold endorsement badge. Measures: Net Sales · Sales Amount · Returns. Net Sales is the one with the checkmark next to it. The checkmark was earned.' : 'A model with a gold badge and no name. Discovery is off. You will have to guess. Measures: Net Sales · Sales Amount · Returns.')`; `models`'s describe becomes `modelsText`.

`src/world/copilot.ts`: replace `MODELS_TEXT` with

```ts
export const modelsText = (s: GameState): string => 'Three semantic models on plinths:\n'
  + '  Sales_v3_FINAL_final2 — no badge. The biggest. Most rows. That is its whole personality.\n'
  + '  sales_test_DO_NOT_USE — a small sign says exactly that.\n'
  + (setting(s, 'discover') ? '  Sales (Certified) — a gold endorsement badge. Try looking at its measures.' : '  A model with a gold badge and no name. Discovery is off. You will have to guess.');
```

and use `text: modelsText` in `copilot.look-model`.

`src/world/monastery.ts`, Spark chamber, before `monastery.fix` (import `setting` is not needed; the rules match the flag):

```ts
      { id: 'monastery.fix-disabled', when: { verb: 'use', noun: SCROLL, noun2: NOTEBOOK, has: ['scroll'], flags: [{ flag: 'notebook.fixed', not: true }, { flag: 'ts.fabricItems', is: false }] }, then: { text: NO_NOTEBOOK, outcome: 'fail' } },
      { id: 'monastery.fix-delegated', when: { verb: 'use', noun: SCROLL, noun2: NOTEBOOK, has: ['scroll'], flags: [{ flag: 'notebook.fixed', not: true }, { flag: 'ts.workloads', is: false }] }, then: { text: `${NO_NOTEBOOK} (Delegated. Also off.)`, outcome: 'fail' } },
      { id: 'monastery.fix-give-disabled', when: { verb: 'give', noun: SCROLL, noun2: PANDAS, has: ['scroll'], flags: [{ flag: 'notebook.fixed', not: true }, { flag: 'ts.fabricItems', is: false }] }, then: { text: NO_NOTEBOOK, outcome: 'fail' } },
      { id: 'monastery.fix-give-delegated', when: { verb: 'give', noun: SCROLL, noun2: PANDAS, has: ['scroll'], flags: [{ flag: 'notebook.fixed', not: true }, { flag: 'ts.workloads', is: false }] }, then: { text: `${NO_NOTEBOOK} (Delegated. Also off.)`, outcome: 'fail' } },
```

with `const NO_NOTEBOOK = 'Notebook creation is disabled for your tenant. Brother Pandas creates a Power BI report instead. It has one card. It says 1.';`.

`src/world/fortress.ts`, the Model View (import `setting`): `exits: { e: 'fortress.hall', n: (s) => (setting(s, 'xmla') ? 'monastery.gate' : null) }`; first rule: `{ id: 'fortress.north-xmla', when: { verb: 'go', dir: 'n', flags: [{ flag: 'ts.xmla', is: false }] }, then: { text: 'The back gate is an XMLA endpoint. Your capacity admin set it to Off. Your capacity admin is you.', outcome: 'fail' } }`; the `flaskHint` gains a leading clause while `!setting(s, 'xmla')`: `'The back gate is closed (XMLA endpoint: Off). The Sacristy, up from the Cloister, has the switch; reach the Monastery the long way, east of the Gold Marsh. '`.

`src/world/peaks.ts`, the Shrine describe (dragon present): prefix `Throttlor is enormous today. The whole organization is refreshing at once. ` while `isFlood(s)`; append ` He is wearing a hard hat. Surge protection.` while `setting(s, 'surge')`.

`src/world/sacristy.ts`: in `flip()`, before building `lines`: `const after: GameState = { ...s, flags: { ...s.flags, [flagOf(book.key)]: want } };` and after `FIFTEEN`: `if (isFlood(s) && !isFlood(after)) lines.push('The organization files out. Jeff from Ops takes a mug. Not yours.');` (import `isFlood`). Add:

```ts
/** Global: a bare 0–10 while Product Feedback is on answers the survey (spec2 §3.3). Checked against the previous state, so the flip that turned it on doesn't count. */
export const GOVERNANCE_PHRASES: PhraseRule[] = [
  { id: 'survey.reply', test: /^(10|[0-9])$/, after: (prev) => setting(prev, 'feedback'), text: 'Thank you. Your participation is voluntary. It was not.' },
];
```

`src/world/index.ts`: register `GOVERNANCE_PHRASES` right after `HINT_PHRASES`.

- [ ] **Step 5: Run everything and commit**

Run: `npx tsc -b && npm test && npm run lint:world` — Expected: green. Defaults keep every existing test passing (golden 200/69; golden + side quests 200 + 45; `tests/sidequests.test.ts` Jeff lines unchanged with export ON and no flood).

```bash
git add src/world/sidequests.ts src/engine/step.ts src/world/npcs.ts src/world/village.ts src/world/items.ts src/world/monastery.ts src/world/fortress.ts src/world/copilot.ts src/world/peaks.ts src/world/sacristy.ts src/world/index.ts tests/setting-effects.test.ts
git commit -m "governance: every setting has an effect — realm doors, notebooks, the XMLA gate, surveys, usage, monitoring, discover, surge, the flood"
```

---

### Task E3: The errands (+10 Abbot, +5 restored)

**Files:**
- Modify: `src/world/monastery.ts` (Cloister errand rules)
- Modify: `src/world/sacristy.ts` (flip(): errand and restored bonuses; resetAll(): restored bonus; flaskHint)
- Test: `tests/errands.test.ts`

**Voice:** read the voice skill first. The Abbot's gimmick: vows, weariness, "child".

**Interfaces:**
- Consumes: `talkTo()` (B1), `flip()`/`resetAll()` (E1), `setting()`/`defaultOf()`/`changedFromDefault()`.
- Produces: flags `gov.errand` (the Abbot asked), `gov.errandDone` (paid; publishToWeb's default flips to OFF); bonus keys `gov.abbot` (+10) and `gov.restored` (+5) → flags `bonus.gov.abbot`, `bonus.gov.restored`; rule ids `monastery.errand`, `monastery.errand-done`.
- Rulings encoded: `gov.touched` is set only by a flip that moves a book *away* from its default; the restored +5 is paid by a flip (or reset) that moves the last non-default book *back* — the errand's own flip moves publishToWeb away from its then-default, so it never pays +5, and after it OFF is the default.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/errands.test.ts
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import type { GameState } from '../src/engine/types';

const run = (cmds: string[], start: Partial<GameState>) => {
  let s: GameState = { ...newGame(WORLD, 5), ...start };
  const outs: string[] = [];
  for (const c of cmds) { const r = step(s, c, WORLD); s = r.state; outs.push(r.output.join('\n')); }
  return { s, outs };
};
const cloister = { room: 'monastery.cloister', flags: { 'gate.open': true } };

describe("the Abbot's errand (+10, spec2 §5)", () => {
  it('Abbot first, then the Sacristy: +10 on the flip', () => {
    const { s, outs } = run(['talk to abbot', 'u', 'turn off publish to web'], cloister);
    expect(outs[0]).toMatch(/Someone published the prophecy to web\. The whole internet can read it\. Go up to the Sacristy and turn it off\./);
    expect(outs[2]).toMatch(/\+10\. The prophecy is private again\. 4,112 people already read it\./);
    expect(s.bonus).toBe(10); expect(s.flags['gov.errandDone']).toBe(true);
    // Off is the default now: on-then-off again is a restore (+5), never a second +10.
    const again = run(['turn on publish to web', 'turn off publish to web'], { ...s });
    expect(again.outs[1]).not.toMatch(/\+10/); expect(again.outs[1]).toMatch(/\+5/); expect(again.s.bonus).toBe(15);
  });
  it('Sacristy first, then the Abbot: +10 on the talk', () => {
    const { s, outs } = run(['u', 'turn off publish to web', 'd', 'talk to abbot', 'talk to abbot'], cloister);
    expect(outs[1]).not.toMatch(/\+10/);
    expect(outs[3]).toMatch(/…and it is already off\. You are ahead of me\. \+10\./);
    expect(s.bonus).toBe(10);
    expect(outs[4]).not.toMatch(/\+10/);
  });
  it('the hoodie talk comes first; the errand on the next talk', () => {
    const { outs } = run(['talk to abbot', 'talk to abbot'], { ...cloister, flags: { ...cloister.flags, 'notebook.fixed': true } });
    expect(outs[0]).toMatch(/Hoodie of Spark/); expect(outs[1]).toMatch(/published the prophecy to web/);
  });
});

describe('governance restored (+5)', () => {
  const sacristy = { room: 'monastery.sacristy' };
  it('flip away and back pays once; reset pays; nothing touched pays nothing', () => {
    const a = run(['turn off xmla', 'turn on xmla', 'turn off xmla', 'turn on xmla'], sacristy);
    expect(a.outs[1]).toMatch(/Every setting is back where you found it\. Nobody will ever know\. \+5 for governance\./);
    expect(a.s.bonus).toBe(5);
    const b = run(['turn off export', 'turn off xmla', 'reset settings'], sacristy);
    expect(b.outs[2]).toMatch(/\+5 for governance/); expect(b.s.bonus).toBe(5);
    const c = run(['reset settings'], sacristy);
    expect(c.outs[0]).not.toMatch(/\+5/); expect(c.s.bonus).toBe(0);
  });
  it('does not fight the errand: the errand flip pays 10, not 15, and a later restore still pays 5', () => {
    const { s, outs } = run(['u', 'turn off publish to web', 'turn off xmla', 'turn on xmla'], { ...cloister, flags: { ...cloister.flags, 'gov.errand': true } });
    expect(outs[1]).toMatch(/\+10/); expect(outs[1]).not.toMatch(/\+5/);
    expect(outs[3]).toMatch(/\+5/);
    expect(s.bonus).toBe(15);
  });
  it('the Sacristy hint names the errand while it is open', () => {
    expect(WORLD.rooms['monastery.sacristy']!.flaskHint({ ...newGame(WORLD, 1), flags: { 'gov.errand': true } })).toBe('The Abbot asked: `turn off publish to web`.');
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run tests/errands.test.ts`
Expected: FAIL — no errand line, no bonus.

- [ ] **Step 3: The Abbot**

`src/world/monastery.ts`, Cloister rules, after `monastery.hoodie` (import `talkTo` from `'../engine/builtins'`):

```ts
      {
        id: 'monastery.errand-done',
        when: { verb: 'talk', noun: ABBOT, flags: [{ flag: 'gate.open' }, { flag: 'gov.errand', not: true }, { flag: 'ts.publishToWeb', is: false }] },
        then: { text: (s, world) => `${talkTo(s, world, world.npcs['abbot']!)}\n${ERRAND}\n"…and it is already off. You are ahead of me. +10."`, set: { 'gov.errand': true, 'gov.errandDone': true }, bonus: 10, pointsKey: 'gov.abbot', sfx: 'bonus', outcome: 'success' },
      },
      {
        id: 'monastery.errand',
        when: { verb: 'talk', noun: ABBOT, flags: [{ flag: 'gate.open' }, { flag: 'gov.errand', not: true }] },
        then: { text: (s, world) => `${talkTo(s, world, world.npcs['abbot']!)}\n${ERRAND}`, set: { 'gov.errand': true }, outcome: 'success' },
      },
```

with `const ERRAND = '"Also. Someone published the prophecy to web. The whole internet can read it. Go up to the Sacristy and turn it off. I would, but I am a monk, not an admin. Those are different vows."';`.

- [ ] **Step 4: The Sacristy pays**

`src/world/sacristy.ts`, in `flip()` after the flood line:

```ts
  let bonus: number | undefined; let pointsKey: string | undefined;
  if (book.key === 'publishToWeb' && !want && s.flags['gov.errand'] && !s.flags['bonus.gov.abbot']) {
    lines.push('+10. The prophecy is private again. 4,112 people already read it.');
    bonus = 10; pointsKey = 'gov.abbot'; set['gov.errandDone'] = true;
  } else if (s.flags['gov.touched'] && !away && changedFromDefault(s).every((k) => k === book.key) && !s.flags['bonus.gov.restored']) {
    lines.push('Every setting is back where you found it. Nobody will ever know. +5 for governance.');
    bonus = 5; pointsKey = 'gov.restored';
  }
  return { id: …, then: { text: lines.join('\n'), set, sfx: bonus ? 'bonus' : 'toggle', outcome: 'success', ...(bonus ? { bonus, pointsKey } : {}) } };
```

In `resetAll()`: when `s.flags['gov.touched'] && changedFromDefault(s).length && !s.flags['bonus.gov.restored']`, append ` Every setting is back where you found it. Nobody will ever know. +5 for governance.` to the text and add `bonus: 5, pointsKey: 'gov.restored', sfx: 'bonus'`.

`SACRISTY_ROOM.flaskHint`: first branch `if (s.flags['gov.errand'] && setting(s, 'publishToWeb')) return 'The Abbot asked: \`turn off publish to web\`.';`.

- [ ] **Step 5: Run everything and commit**

Run: `npx tsc -b && npm test && npm run lint:world` — Expected: green.

```bash
git add src/world/monastery.ts src/world/sacristy.ts tests/errands.test.ts
git commit -m "errands: the Abbot's publish-to-web errand (+10, either order) and governance restored (+5)"
```

---

### Task E4: The Town Hall and the Clerk

**Files:**
- Create: `src/world/townhall.ts`
- Modify: `src/world/npcs.ts` (register the Clerk)
- Modify: `src/world/items.ts` (ticket, bell, poster, rope, counter)
- Modify: `src/world/village.ts` (Square `u`/`in` exits + line)
- Modify: `src/world/index.ts` (HALL_ROOM, TOWNHALL_PHRASES)
- Modify: `src/scenes/village.tsx`, `src/scenes/index.tsx` (the scene)
- Modify: `tests/world-lint.test.ts` (25 → 26)
- Test: `tests/townhall.test.ts`

**Voice:** read the voice skill first. The Clerk's gimmick: one sentence, forever.

**Interfaces:**
- Consumes: `talkMore`/`brushOff` (B1), `BRUSHOFFS.clerk` (D1), `rotate()`.
- Produces: `export const HALL = 'village.hall'`; `export const HALL_ROOM: Room`; `export const CLERK_NPC: Npc` (id `clerk`, aliases `clerk`, `admin`, `receptionist`, `the clerk`); `export const TOWNHALL_PHRASES: PhraseRule[]` registered right after `SACRISTY_PHRASES`; flag `hall.ticket`; rule ids `hall.give-ticket`, `hall.give-anything`, `hall.say`, `hall.bell`, `hall.poster`, `hall.rope`, `hall.counter`; item `ticket` (gettable).

- [ ] **Step 1: Write the failing tests**

```ts
// tests/townhall.test.ts
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import type { GameState } from '../src/engine/types';

const run = (cmds: string[], room = 'village.square') => {
  let s: GameState = { ...newGame(WORLD, 5), room };
  const outs: string[] = [];
  for (const c of cmds) { const r = step(s, c, WORLD); s = r.state; outs.push(r.output.join('\n')); }
  return { s, outs };
};

describe('the Town Hall (spec2 §6)', () => {
  it('is up the steps (u, in) and down/out again', () => {
    expect(run(['u']).s.room).toBe('village.hall');
    expect(run(['in']).s.room).toBe('village.hall');
    expect(run(['d'], 'village.hall').s.room).toBe('village.square');
    expect(run(['out'], 'village.hall').s.room).toBe('village.square');
    expect(run(['look']).outs[0]).toContain('The Town Hall is up the steps.');
    expect(WORLD.rooms['village.hall']!.enterQuip!(newGame(WORLD, 1))).toBe('Take a number. There is one number. It is 1.');
  });
  it('the clerk rotates and, fourth time, points at the Sacristy', () => {
    const { outs } = run(['talk to clerk', 'talk to clerk', 'talk to clerk', 'talk to clerk', 'talk to clerk'], 'village.hall');
    expect(outs.slice(0, 3)).toEqual(["That's an admin setting.", 'That would be an admin setting.', 'Admin setting. Next.']);
    expect(outs[3]).toBe('…the admins are at the Monastery. Up the stair from the Cloister. In the Sacristy. They do not come out, and they do not answer tickets.');
    expect(outs[4]).toMatch(/admin setting/i);
  });
  it('ask about anything, give anything, say anything', () => {
    const { outs } = run(['ask clerk about the dragon', 'give license to clerk', 'say hello'], 'village.hall');
    expect(outs[0]).toBe("That's an admin setting.");
    expect(outs[1]).toBe("That's an admin setting.");
    expect(outs[2]).toBe("Noted. That's an admin setting.");
  });
  it('the ticket escalates', () => {
    const { s, outs } = run(['look at ticket', 'get ticket', 'give ticket to clerk', 'talk to clerk'], 'village.hall');
    expect(outs[0]).toBe("SEV-3: 'report is wrong'. No further details.");
    expect(outs[2]).toBe('Your ticket has been escalated. Estimated response: three business dragons.');
    expect(s.inventory).not.toContain('ticket'); expect(s.flags['hall.ticket']).toBe(true); expect(s.score).toBe(0); expect(s.bonus).toBe(0);
    expect(outs[3]).toContain('Your ticket is In Progress. It has been In Progress since you left.');
  });
  it('the bell, the poster, the rope, the counter', () => {
    const { outs } = run(['ring bell', 'use bell', 'read poster', 'use rope', 'use counter'], 'village.hall');
    expect(outs[0]).toBe("The clerk looks up. 'That's an admin setting.'");
    expect(outs[1]).toBe(outs[0]);
    expect(outs[2]).toBe('TENANT SETTINGS ARE NOT A SECURITY MEASURE. — the Learn docs, on the wall, in a frame.');
    expect(outs[3]).toMatch(/queue/); expect(outs[4]).toMatch(/form/);
  });
  it('the flask hint', () => {
    expect(WORLD.rooms['village.hall']!.flaskHint(newGame(WORLD, 1))).toBe('Nothing to win here. The clerk will tell you where the admins are if you keep talking.');
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run tests/townhall.test.ts`
Expected: FAIL — no such room.

- [ ] **Step 3: Create `src/world/townhall.ts`**

```ts
import type { GameState } from '../engine/types';
import type { Npc, PhraseRule, Room } from './types';
import { BRUSHOFFS, rotate } from './voice';

export const HALL = 'village.hall';
const CLERK = ['clerk', 'admin', 'receptionist', 'the clerk'];
const TICKET = ['ticket', 'support ticket', 'sev-3', 'sev 3', 'the ticket'];
const BELL_LINE = "The clerk looks up. 'That's an admin setting.'";

const progress = (s: GameState): string => (s.flags['hall.ticket'] ? ' Your ticket is In Progress. It has been In Progress since you left.' : '');

export const CLERK_NPC: Npc = {
  id: 'clerk', name: 'the Clerk', aliases: CLERK,
  describe: () => 'The Clerk. A cardigan, a counter, a stamp that says ADMIN SETTING. The stamp is worn smooth.',
  talk: (s) => `That's an admin setting.${progress(s)}`,
  talkMore: (s, n) => (n === 2 ? `That would be an admin setting.${progress(s)}`
    : n === 3 ? `Admin setting. Next.${progress(s)}`
    : n === 4 ? `…the admins are at the Monastery. Up the stair from the Cloister. In the Sacristy. They do not come out, and they do not answer tickets.${progress(s)}`
    : rotate(s, ["That's an admin setting.", 'That would be an admin setting.', 'Admin setting. Next.', '…the admins are in the Sacristy. Up the stair from the Cloister. I said that already; it is also an admin setting.']) + progress(s)),
  brushOff: BRUSHOFFS.clerk!,
};

export const HALL_ROOM: Room = {
  id: HALL, name: 'Town Hall', region: 'village',
  enterQuip: () => 'Take a number. There is one number. It is 1.',
  describe: () => 'The Town Hall. A counter, a Clerk behind it, a bell, a poster in a frame, and a queue rope with nobody in it. The square is down the steps.',
  exits: { d: 'village.square', out: 'village.square' },
  items: ['ticket', 'bell', 'poster', 'rope', 'counter'],
  npcs: ['clerk'],
  scene: () => 'village.hall',
  flaskHint: () => 'Nothing to win here. The clerk will tell you where the admins are if you keep talking.',
  rules: [
    { id: 'hall.give-ticket', when: { verb: 'give', noun: TICKET, noun2: CLERK, has: ['ticket'] }, then: { text: 'Your ticket has been escalated. Estimated response: three business dragons.', remove: ['ticket'], set: { 'hall.ticket': true }, outcome: 'success', sfx: 'success' } },
    { id: 'hall.give-anything', when: { verb: 'give', noun2: CLERK }, then: { text: "That's an admin setting.", outcome: 'fail' } },
    { id: 'hall.say', when: { verb: 'say' }, then: { text: "Noted. That's an admin setting.", outcome: 'snark' } },
    { id: 'hall.bell', when: { verb: 'use', noun: ['bell', 'desk bell', 'service bell'] }, then: { text: BELL_LINE, outcome: 'fail' } },
    { id: 'hall.poster', when: { verb: 'read', noun: ['poster', 'frame', 'sign', 'framed poster'] }, then: { text: 'TENANT SETTINGS ARE NOT A SECURITY MEASURE. — the Learn docs, on the wall, in a frame.', outcome: 'success' } },
    { id: 'hall.rope', when: { verb: 'use', noun: ['rope', 'queue rope', 'queue', 'stanchion'] }, then: { text: 'You unclip the rope and clip it back. The queue is unchanged: you.', outcome: 'fail' } },
    { id: 'hall.counter', when: { verb: 'use', noun: ['counter', 'desk', 'front desk'] }, then: { text: 'You lean on the counter. The Clerk slides a form across. It is blank. That is the form.', outcome: 'fail' } },
  ],
};

/** Room-scoped; registered right after SACRISTY_PHRASES. */
export const TOWNHALL_PHRASES: PhraseRule[] = [
  { id: 'hall.ring', room: HALL, test: /^(ring|ding|hit|tap|press)( the)? bell$/, text: BELL_LINE },
];
```

- [ ] **Step 4: Register and draw**

`src/world/npcs.ts`: import `CLERK_NPC` from `'./townhall'` and add `npc(CLERK_NPC)` to the list. `src/world/items.ts`:

```ts
  // ---- Town Hall ----
  item({ id: 'ticket', name: 'ticket', aliases: ['support ticket', 'sev-3', 'sev 3'], takeable: true, describe: "SEV-3: 'report is wrong'. No further details." }),
  item({ id: 'bell', name: 'bell', aliases: ['desk bell', 'service bell'], takeable: false, untakeableText: 'The bell is screwed to the counter. Someone took one once.', describe: 'A desk bell. Polished by the hopeful.' }),
  item({ id: 'poster', name: 'poster', aliases: ['frame', 'framed poster', 'sign'], takeable: false, untakeableText: 'It is in a frame. The frame is the point.', describe: 'A poster in a frame: TENANT SETTINGS ARE NOT A SECURITY MEASURE. Try reading it; it does not get shorter.' }),
  item({ id: 'rope', name: 'rope', aliases: ['queue rope', 'queue', 'stanchion'], takeable: false, untakeableText: 'The rope is for the queue. The queue is for you.', describe: 'A velvet queue rope, zig-zagging to the counter. Nobody in it. It has never had anybody in it.' }),
  item({ id: 'counter', name: 'counter', aliases: ['front desk', 'desk'], takeable: false, untakeableText: 'The counter is the Clerk\'s. The Clerk is the tenant\'s.', describe: 'A counter with a bell, a ticket, and a stamp. The stamp says ADMIN SETTING.' }),
```

`src/world/village.ts`, the Square: `exits: { n: 'village.mill', e: 'village.fields', s: 'lake.shore', w: 'village.cottage', u: 'village.hall', in: 'village.hall' }` and append ` The Town Hall is up the steps.` after the roads sentence.

`src/world/index.ts`: `rooms: { ...VILLAGE_ROOMS, [HALL_ROOM.id]: HALL_ROOM, … }` and register `TOWNHALL_PHRASES` right after `SACRISTY_PHRASES`.

`src/scenes/village.tsx`:

```tsx
export function Hall() {
  return (
    <>
      <Interior wall={EGA.lgray} wallDark={EGA.dgray} floor={EGA.brown} ceiling={EGA.dgray} />
      {/* the poster in its frame */}
      <R x={70} y={30} w={70} h={30} f={EGA.white} s={EGA.brown} sw={4} />
      <Label x={74} y={42} text="TENANT SETTINGS" color={EGA.black} size={4} />
      <Label x={74} y={52} text="ARE NOT SECURITY" color={EGA.black} size={4} />
      {/* the counter, the bell, the ticket */}
      <R x={160} y={110} w={110} h={40} f={EGA.brown} />
      <R x={176} y={104} w={10} h={6} f={EGA.yellow} />
      <R x={200} y={106} w={14} h={5} f={EGA.white} />
      {/* the Clerk, in a cardigan */}
      <Person x={220} y={80} robe={EGA.dgray} hood={EGA.brown} skin={EGA.lred} />
      {/* the queue rope, with nobody in it */}
      <L pts={[[60, 130], [60, 160], [120, 160], [120, 130]]} s={EGA.red} sw={3} />
      <R x={58} y={126} w={4} h={40} f={EGA.yellow} />
      <R x={118} y={126} w={4} h={40} f={EGA.yellow} />
      <Label x={60} y={186} text="NOW SERVING: 1" color={EGA.white} size={5} />
    </>
  );
}
```

`src/scenes/index.tsx`: import `Hall` and add `'village.hall': () => <Hall />`. `tests/world-lint.test.ts`: `25` → `26`.

- [ ] **Step 5: Run everything and commit**

Run: `npx tsc -b && npm test && npm run lint:world` — Expected: green (31 rooms).

```bash
git add src/world/townhall.ts src/world/npcs.ts src/world/items.ts src/world/village.ts src/world/index.ts src/scenes/village.tsx src/scenes/index.tsx tests/world-lint.test.ts tests/townhall.test.ts
git commit -m "town hall: the Clerk, the ticket, the bell, the poster — the comedic front door to the Sacristy"
```

---

### Task E5: My Workspace and `publish`

**Files:**
- Modify: `src/world/village.ts` (cottage name/describe; WORKSPACE_PHRASES)
- Modify: `src/world/globals.ts` (`egg.publish` elsewhere)
- Modify: `src/world/index.ts` (register WORKSPACE_PHRASES)
- Modify: `e2e/smoke.spec.ts:65` (`YOUR COTTAGE` → `MY WORKSPACE`)
- Modify: `README.md` (the sample screen)
- Test: `tests/my-workspace.test.ts`

**Voice:** read the voice skill first ("Deadpan atrocity" for the death; publishing to yourself is the joke).

**Interfaces:**
- Consumes: `setting()` (E1), `PhraseRule.then` (D1).
- Produces: `export const WORKSPACE_PHRASES: PhraseRule[]` (cottage-scoped), registered right after `TOWNHALL_PHRASES`; death id `death.publish-web`; step ids `workspace.publish`, `workspace.publish-mine`, `workspace.publish-web-off`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/my-workspace.test.ts
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';

const one = (cmd: string, flags: Record<string, boolean | number> = {}, room = 'village.cottage') => step({ ...newGame(WORLD, 4), room, flags }, cmd, WORLD);

describe('My Workspace (spec2 §7)', () => {
  it('is the cottage, renamed', () => {
    expect(WORLD.rooms['village.cottage']!.name).toBe('My Workspace');
    expect(one('look').output[0]).toMatch(/^MY WORKSPACE\nYour cottage\. My Workspace, officially\. Nobody else can see in\. That is the point, and also the problem\./);
  });
  it('publish offers My Workspace, and the internet while Publish to web is on', () => {
    expect(one('publish').output[0]).toBe('Publish to which workspace? · My Workspace · The entire internet');
    expect(one('publish', { 'ts.publishToWeb': false }).output[0]).toBe('Publish to which workspace? · My Workspace');
  });
  it.each(['say my workspace', 'publish to my workspace', 'my workspace'])('%s publishes to yourself', (c) => {
    const r = one(c);
    expect(r.output[0]).toBe('Published. To yourself. Your report is now available to you, in the workspace you were already in. Success.');
    expect(r.outcome).toBe('snark');
  });
  it.each(['the entire internet', 'publish to web', 'publish to the internet'])('%s kills you while on, and thanks the admin while off', (c) => {
    const on = one(c);
    expect(on.state.dead).toBe(true); expect(on.deathCause).toBe('death.publish-web');
    expect(on.output.join(' ')).toContain('You publish to web. The embed code is beautiful. The dragon has your report. So does everyone.');
    expect(on.output.join(' ')).toContain('You published to web. The prophecy said nothing about this, because the prophecy is also on the web now.');
    const off = one(c, { 'ts.publishToWeb': false });
    expect(off.state.dead).toBe(false);
    expect(off.output[0]).toBe('Publish to web is disabled by your administrator. For once, thank them.');
  });
  it('publish elsewhere', () => {
    expect(one('publish', {}, 'village.square').output[0]).toBe('Publish from where? You are not in Desktop.');
    expect(one('publish', {}, 'fortress.yard').output[0]).toMatch(/which workspace/); // the Keep keeps its own line
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run tests/my-workspace.test.ts`
Expected: FAIL — name is `Your Cottage`.

- [ ] **Step 3: The cottage**

`src/world/village.ts` (import `setting` from `'../engine/governance'`):
- `name: 'My Workspace'`;
- describe: `"Your cottage. My Workspace, officially. Nobody else can see in. That is the point, and also the problem. One desk, one candle, one report you have been 'about to finish' since spring."` + the existing mug/door tail (+ Task E2's Eventhouse line);
- `cottage.use-report` text: `'You click Publish. A dialog asks which workspace. There is only one, and you are standing in it. `publish`, if you must.'`;
- add:

```ts
const WEB_DEATH = 'You publish to web. The embed code is beautiful. The dragon has your report. So does everyone.\nYou published to web. The prophecy said nothing about this, because the prophecy is also on the web now.';
/** Cottage-scoped; registered right after TOWNHALL_PHRASES (world/index.ts). */
export const WORKSPACE_PHRASES: PhraseRule[] = [
  { id: 'workspace.publish', room: 'village.cottage', test: /^publish$/, text: (s) => `Publish to which workspace? · My Workspace${setting(s, 'publishToWeb') ? ' · The entire internet' : ''}` },
  { id: 'workspace.publish-mine', room: 'village.cottage', test: /^((say|publish to) )?my workspace$/, text: '', then: { text: 'Published. To yourself. Your report is now available to you, in the workspace you were already in. Success.', outcome: 'snark' } },
  {
    id: 'workspace.publish-web', room: 'village.cottage', test: /^((say|publish to) )?(the entire internet|entire internet|publish to web|publish to the internet|publish to the web)$/, text: '',
    then: (s) => (setting(s, 'publishToWeb')
      ? { id: 'death.publish-web', then: { text: WEB_DEATH, death: 'death.publish-web' } }
      : { id: 'workspace.publish-web-off', then: { text: 'Publish to web is disabled by your administrator. For once, thank them.', outcome: 'fail' } }),
  },
];
```

`src/world/globals.ts`, `egg.publish` text: `'Publish from where? You are not in Desktop.'`. `src/world/index.ts`: register `WORKSPACE_PHRASES` right after `TOWNHALL_PHRASES`.

- [ ] **Step 4: The screens**

`e2e/smoke.spec.ts` line 65: `'YOUR COTTAGE'` → `'MY WORKSPACE'`. `README.md` sample screen: `YOUR COTTAGE` → `MY WORKSPACE`; `Your cottage. A workspace, technically.` → `Your cottage. My Workspace, officially.`; the next line `One desk, one candle, one report you have` → `Nobody else can see in. One desk, one candle,` and `been 'about to finish' since spring.` → `one report 'about to finish' since spring.` (keep the box width).

- [ ] **Step 5: Run everything and commit**

Run: `npx tsc -b && npm test && npm run lint:world` — Expected: green (`tests/fortress.test.ts` "publish in the square does not say which workspace" still holds).

```bash
git add src/world/village.ts src/world/globals.ts src/world/index.ts e2e/smoke.spec.ts README.md tests/my-workspace.test.ts
git commit -m "my workspace: the cottage's proper name, publish menu, publish to yourself, publish to web"
```

---
### Task E6: Applied Steps in order (+10)

**Files:**
- Modify: `src/world/applied-steps.ts` (the puzzle: applyStep(), the seven command phrases)
- Modify: `src/world/fortress.ts` (hall: `query` item, flask hint clause; drop `fortress.remove-columns` and `fortress.remove-columns-words`)
- Modify: `src/world/keep-items.ts` (`query` item; Custom1 after `pq.done`)
- Test: `tests/applied-steps.test.ts`

**Voice:** read the voice skill first. The hall's gimmick: real M errors, verbatim, then one narrator line.

**Interfaces:**
- Consumes: `STEPS`, `pqStep()`, `pqDone()`, `stepsList()`, `APPLIED_STEP_PHRASES` (C2); `PhraseRule.then` (D1).
- Produces: `export function applyStep(s: GameState, j: 1|2|3|4|5|6|7): { then: RuleThen; id: string }`; flags `pq.step` (0–7), `pq.done`; bonus key `pq.done` (+10, sfx `bonus`); step ids `pq.step.<j>`, `pq.done`, `pq.repeat.<j>`, `pq.error.<j>`, `pq.after`; item `query` in the hall.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/applied-steps.test.ts
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import type { GameState } from '../src/engine/types';

const hall = (flags: Record<string, boolean | number> = {}): GameState => ({ ...newGame(WORLD, 6), room: 'fortress.hall', flags });
const run = (cmds: string[], flags = {}) => {
  let s = hall(flags);
  const rs = [];
  for (const c of cmds) { const r = step(s, c, WORLD); s = r.state; rs.push(r); }
  return { s, rs, outs: rs.map((r) => r.output[0]!) };
};
const CHAIN = ['source', 'navigate', 'promote headers', 'change type', 'filter rows', 'remove other columns', 'rename columns'];

describe('Applied Steps in order (spec2 §8)', () => {
  it('the happy chain pays +10 once, with the seven success lines', () => {
    const { s, rs, outs } = run(CHAIN);
    expect(outs[0]).toBe('Source: the server name is wrong. It has been wrong since the migration. It connects anyway.');
    expect(outs[6]).toBe("Renamed Columns: 'Column3' becomes 'Year'. The hall applauds. Refresh complete.");
    expect(rs.map((r) => r.stepId)).toEqual(['pq.step.1', 'pq.step.2', 'pq.step.3', 'pq.step.4', 'pq.step.5', 'pq.step.6', 'pq.done']);
    expect(rs[6]!.bonusAwarded).toBe(10); expect(rs[6]!.sfx).toBe('bonus');
    expect(s.bonus).toBe(10); expect(s.score).toBe(0); expect(s.flags['pq.step']).toBe(7); expect(s.flags['pq.done']).toBe(true);
    const again = step(s, 'rename columns', WORLD);
    expect(again.output[0]).toBe('The query refreshes. 4.2M. It was always 4.2M.'); expect(again.state.bonus).toBe(10);
  });
  it('every synonym applies its step', () => {
    for (const [j, cmds] of [[1, ['add source', 'get data', 'apply source']], [2, ['navigation', 'apply navigation', 'pick table']], [3, ['promoted headers', 'use first row as headers']], [4, ['changed type', 'detect type']], [5, ['filtered rows', 'filter']], [6, ['removed other columns', 'remove columns']], [7, ['renamed columns', 'rename']]] as const) {
      for (const c of cmds) expect(run([c], { 'pq.step': j - 1 }).s.flags['pq.step'], c).toBe(j);
    }
  });
  it.each([
    [0, 'navigate', "Formula.Firewall: Query 'Sales' references other queries or steps, so it may not directly access a data source. Please rebuild this data combination."],
    [0, 'rename columns', "Formula.Firewall: Query 'Sales' references other queries or steps, so it may not directly access a data source. Please rebuild this data combination."],
    [1, 'promote headers', "Expression.Error: The key didn't match any rows in the table."],
    [1, 'filter rows', "Expression.Error: The key didn't match any rows in the table."],
    [2, 'change type', "Expression.Error: The column 'Region' of the table wasn't found. Details: Column1"],
    [3, 'filter rows', 'Expression.Error: We cannot convert the value "Total" to type Number. Details: Value=Total Type=[Type]'],
    [4, 'remove other columns', 'Expression.Error: We cannot convert the value "Total" to type Number.'],
    [5, 'rename columns', "Expression.Error: The column 'Column3' of the table wasn't found."],
  ])('at step %i, %s errors', (k, c, err) => {
    const { s, outs, rs } = run([c], { 'pq.step': k });
    expect(outs[0]).toContain(err);
    expect(outs[0]).toContain(`Every step after it turns yellow. You are back at ${k === 0 ? 'the start. There is no Source.' : ['Source', 'Navigation', 'Promoted Headers', 'Changed Type', 'Filtered Rows'][k - 1] + '.'}`);
    expect(s.flags['pq.step'] ?? 0).toBe(k); expect(rs[0]!.outcome).toBe('fail');
  });
  it('re-applying: Changed Type1, and the past for the others', () => {
    expect(run(['change type'], { 'pq.step': 5 }).outs[0]).toBe('Changed Type1. Power Query adds a new one. It always will.');
    expect(run(['source'], { 'pq.step': 5 }).outs[0]).toBe('Source is already applied. Clicking it again shows you the past. Everything after it greys out, waiting.');
    expect(run(['source'], { 'pq.step': 5 }).s.flags['pq.step']).toBe(5);
  });
  it('the flask hint leads with the broken step; look at query lists the state', () => {
    expect(WORLD.rooms['fortress.hall']!.flaskHint(hall({ 'pq.step': 3 }))).toMatch(/^The query is broken at step 4: Changed Type\. \(`look at steps`\.\) /);
    expect(WORLD.rooms['fortress.hall']!.flaskHint(hall({ 'pq.step': 7, 'pq.done': true }))).not.toMatch(/broken/);
    expect(run(['look at query'], { 'pq.step': 3 }).outs[0]).toContain('✓ Source ✓ Navigation ✓ Promoted Headers ✗ Changed Type (yellow) · Filtered Rows · Removed Other Columns · Renamed Columns');
    expect(run(['look at query']).outs[0]).toMatch(/^Sales — 7 steps, 1 error\./);
    expect(run(['look at custom1'], { 'pq.done': true }).outs[0]).toBe('Custom1: = Table.AddColumn(#"Renamed Columns", "Custom", each 1). It was a placeholder. It shipped.');
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run tests/applied-steps.test.ts`
Expected: FAIL — `source` is snark.

- [ ] **Step 3: The puzzle (`src/world/applied-steps.ts`)**

Append:

```ts
import type { RuleThen } from './types';

const COMMANDS: readonly RegExp[] = [
  /^(source|add source|get data|apply source|apply the source)$/,
  /^(navigate|navigation|apply navigation|pick table|pick a table|pick the table)$/,
  /^(promote headers|promoted headers|use first row as headers|promote the headers)$/,
  /^(change type|changed type|detect type|detect data type|change types)$/,
  /^(filter rows|filtered rows|filter|filter the rows)$/,
  /^(remove other columns|removed other columns|remove columns|remove the other columns)$/,
  /^(rename columns|renamed columns|rename|rename the columns)$/,
];
const SUCCESS: readonly string[] = [
  'Source: the server name is wrong. It has been wrong since the migration. It connects anyway.',
  'Navigation: you pick Sales. There are three tables called Sales. You pick the right one, which is not the first one.',
  'Promoted Headers: Column1 becomes Region. Column2 becomes Net Sales. Column3 stays Column3.',
  'Changed Type: everything is text. Then everything is number. Then the dates are wrong. Using Locale.',
  'Filtered Rows: the Total row at the bottom goes away. It was inflating everything by exactly 100%.',
  'Removed Other Columns: the hall grows shorter. So does your refresh.',
  "Renamed Columns: 'Column3' becomes 'Year'. The hall applauds. Refresh complete.",
];
/** The real error, by the last good step (0–5), when a later step is attempted out of order (spec2 §8). */
const ERRORS: readonly string[] = [
  "Formula.Firewall: Query 'Sales' references other queries or steps, so it may not directly access a data source. Please rebuild this data combination.",
  "Expression.Error: The key didn't match any rows in the table.",
  "Expression.Error: The column 'Region' of the table wasn't found. Details: Column1",
  'Expression.Error: We cannot convert the value "Total" to type Number. Details: Value=Total Type=[Type]',
  'Expression.Error: We cannot convert the value "Total" to type Number.',
  "Expression.Error: The column 'Column3' of the table wasn't found.",
];

export function applyStep(s: GameState, j: 1 | 2 | 3 | 4 | 5 | 6 | 7): { then: RuleThen; id: string } {
  const k = pqStep(s);
  const name = STEPS[j - 1]!;
  if (pqDone(s)) return { id: 'pq.after', then: { text: 'The query refreshes. 4.2M. It was always 4.2M.', outcome: 'snark' } };
  if (j <= k) return { id: `pq.repeat.${j}`, then: { text: j === 4 ? 'Changed Type1. Power Query adds a new one. It always will.' : `${name} is already applied. Clicking it again shows you the past. Everything after it greys out, waiting.`, outcome: 'snark' } };
  if (j === k + 1) {
    if (j === 7) return { id: 'pq.done', then: { text: SUCCESS[6]!, set: { 'pq.step': 7, 'pq.done': true }, bonus: 10, pointsKey: 'pq.done', sfx: 'bonus', outcome: 'success' } };
    return { id: `pq.step.${j}`, then: { text: SUCCESS[j - 1]!, set: { 'pq.step': j }, outcome: 'success', sfx: 'success' } };
  }
  const back = k === 0 ? 'the start. There is no Source.' : `${STEPS[k - 1]}.`;
  return { id: `pq.error.${j}`, then: { text: `${ERRORS[k]}\nEvery step after it turns yellow. You are back at ${back}`, outcome: 'fail' } };
}

for (const j of [1, 2, 3, 4, 5, 6, 7] as const) {
  APPLIED_STEP_PHRASES.push({ id: `pq.cmd.${j}`, room: 'fortress.hall', test: COMMANDS[j - 1]!, text: '', then: (s) => applyStep(s, j) });
}
```

(`APPLIED_STEP_PHRASES` must be declared with `let`-free `const … = [ … ]` before this loop; the door poke stays first in the list.)

- [ ] **Step 4: The hall around it**

`src/world/fortress.ts`: delete the `fortress.remove-columns` rule and the `fortress.remove-columns-words` phrase (step 6 owns them). Hall `items`: `['query', 'custom1', 'editor-door', 'steps', 'doorways', 'portraits']`. Hall `flaskHint` (import `STEPS`, `pqDone`, `pqStep` from `'./applied-steps'`):

```ts
    flaskHint: (s) => {
      const rest =
        !s.flags['trial.moat'] ? 'North. Insult the Duke properly and he will do the rest. He hates one shortcut above all others.' :
        !s.flags['taken.policy'] ? 'West, in the Model View, a policy waits on a lectern. The Studio east will want it.' :
        !s.flags['refresh.done'] ? 'East. The Report Studio has a Card that needs out-staring and a refresh that needs your policy.' :
        !s.flags['trial.hoodie'] ? 'West, then north: the Model View has a back gate onto the Monastery.' :
        'The Keep is done with you. South, through the gate. Mind the moat; it remembers you.';
      const k = pqStep(s);
      return pqDone(s) ? rest : `The query is broken at step ${k + 1}: ${STEPS[k]}. (\`look at steps\`.) ${rest}`;
    },
```

`src/world/keep-items.ts`: add before `custom1`:

```ts
  {
    id: 'query', name: 'query', aliases: ['sales query', 'the query', 'queries', 'sales'],
    takeable: false, untakeableText: 'The query is the hall. Take it and you are standing in a Formula.Firewall.',
    describe: (s) => `Sales — 7 steps, ${pqDone(s) ? '0 errors' : '1 error'}.\n${stepsList(s)}`,
  },
```

and make Custom1's describe `(s) => (pqDone(s) ? 'Custom1: = Table.AddColumn(#"Renamed Columns", "Custom", each 1). It was a placeholder. It shipped.' : 'Custom1. A step. Nobody knows what it does. Everyone is afraid to delete it.')` (import `pqDone`).

- [ ] **Step 5: Run everything and commit**

Run: `npx tsc -b && npm test && npm run lint:world` — Expected: green (`tests/keep-examinables.test.ts` now also looks at `query`, which resolves).

```bash
git add src/world/applied-steps.ts src/world/fortress.ts src/world/keep-items.ts tests/applied-steps.test.ts
git commit -m "applied steps: rebuild the hall's query in order for +10, with the real errors out of order"
```

---

### Task E7: God mode — `settings`, `set`, `locate settings`

**Files:**
- Modify: `src/engine/god.ts`
- Test: `tests/god-settings.test.ts`

**Voice:** read the voice skill first (god mode prints plainly; only the one confirmation line is the narrator's).

**Interfaces:**
- Consumes: `settingsListing()`, `settingByKey()` (E1), `SETTING_KEYS`, `flagOf()`.
- Produces: god commands `settings` (both shelves, anywhere), `set <key> on|off` (flips the flag directly: no death, no bonus, no 15-minutes line; step id `god.set`), `locate settings` (points at the Sacristy). Case-insensitive keys.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/god-settings.test.ts
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';

const run = (cmds: string[]) => { let s = newGame(WORLD, 7); const outs: string[] = []; let last; for (const c of cmds) { last = step(s, c, WORLD); s = last.state; outs.push(last.output.join('\n')); } return { s, outs, last: last! }; };

describe('god mode settings (spec2 §3.6)', () => {
  it('settings lists both shelves anywhere', () => {
    const { outs } = run(['burninate', 'settings']);
    expect(outs[1]).toContain('TENANT SETTINGS'); expect(outs[1]).toContain('CAPACITY LEDGER'); expect(outs[1]).toContain('[ON ] Users can export data');
    expect(run(['settings']).outs[0]).not.toContain('TENANT SETTINGS');
  });
  it('set <key> on|off flips the flag with no consequences', () => {
    const { s, outs, last } = run(['burninate', 'set blockinternet on']);
    expect(s.dead).toBe(false); expect(s.flags['ts.blockInternet']).toBe(true); expect(last.stepId).toBe('god.set');
    expect(outs[1]).toBe('Block Public Internet Access: ON. (God mode: no death, no bonus, no 15 minutes.)');
    expect(run(['burninate', 'set xmla off']).s.flags['ts.xmla']).toBe(false);
    expect(run(['burninate', 'set nothing on']).outs[1]).toMatch(/^No such setting: "nothing"/);
    expect(run(['burninate', 'set']).outs[1]).toMatch(/^set <key> on\|off/);
  });
  it('locate settings finds the Sacristy; godhelp lists the new commands', () => {
    expect(run(['burninate', 'locate settings']).outs[1]).toContain('monastery.sacristy');
    expect(run(['burninate', 'godhelp']).outs[1]).toMatch(/set <key> on\|off/);
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run tests/god-settings.test.ts`
Expected: FAIL.

- [ ] **Step 3: `src/engine/god.ts`**

Imports: `import { SETTING_KEYS, flagOf } from './governance';` and `import { settingByKey, settingsListing } from '../world/sacristy';`. Add two lines to `GOD_HELP` after `flags`:

```ts
  '  settings              both settings shelves, wherever you are',
  '  set <key> on|off      flip a setting directly (no death, no bonus), e.g. set xmla off',
```

In `whereIs`, before the "Rooms by name" loop:

```ts
  if (/^(tenant |capacity )?settings?$/.test(needle)) push('room', ['room monastery.sacristy — The Sacristy (monastery): the tenant settings shelf and the capacity ledger; up from the Cloister']);
```

In `godStep`'s switch, before `default`:

```ts
    case 'settings':
      return meta(base, [settingsListing(base)], 'god.settings', parsed);
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
```

- [ ] **Step 4: Run everything and commit**

Run: `npx tsc -b && npm test && npm run lint:world` — Expected: green.

```bash
git add src/engine/god.ts tests/god-settings.test.ts
git commit -m "god mode: settings, set <key> on|off, locate settings"
```

---

### Task E8: Sound cues (toggle, survey, curse) and the goal-box e2e assertion

**Files:**
- Modify: `src/game/sfx.ts` (cues)
- Modify: `src/world/sacristy.ts` (flip uses `toggle` / `toggle-off`)
- Modify: `src/engine/governance.ts` (the survey line asks for the `survey` cue)
- Modify: `e2e/smoke.spec.ts` (the goal box)
- Test: `tests/sfx.test.ts`

**Voice:** read the voice skill first (no narrator text here, but the e2e assertion quotes the goal card; keep it verbatim).

**Interfaces:**
- Produces: `Cue` gains `'toggle' | 'toggle-off' | 'survey' | 'curse'`. `flip()` sets `sfx: want ? 'toggle' : 'toggle-off'` (unless a bonus is paid, then `bonus`). `applyGovernance` sets `sfx: 'survey'` on a turn that appends a survey line when the turn set no cue. Task F2 uses `curse`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/sfx.test.ts
import { describe, expect, it } from 'vitest';
import { CUES } from '../src/game/sfx';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';

describe('cues (spec2 §10)', () => {
  it('toggle is two notes up, toggle-off two notes down, survey a ding-dong, curse descends', () => {
    expect(CUES.toggle.map((n) => n[0])).toEqual([659.25, 783.99]);
    expect(CUES['toggle-off'].map((n) => n[0])).toEqual([783.99, 659.25]);
    expect(CUES.survey).toHaveLength(2);
    expect(CUES.curse.length).toBeGreaterThanOrEqual(3);
    expect(CUES.curse[0]![0]).toBeGreaterThan(CUES.curse[CUES.curse.length - 1]![0]);
  });
  it('a flip asks for toggle / toggle-off; a survey turn asks for survey', () => {
    const s = { ...newGame(WORLD, 1), room: 'monastery.sacristy' };
    expect(step(s, 'turn off export', WORLD).sfx).toBe('toggle-off');
    expect(step(s, 'turn on guests', WORLD).sfx).toBe('toggle');
    expect(step({ ...newGame(WORLD, 1), flags: { 'ts.feedback': true }, turns: 4 }, 'look', WORLD).sfx).toBe('survey');
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run tests/sfx.test.ts`
Expected: FAIL — `CUES` not exported / cues missing.

- [ ] **Step 3: The cues**

`src/game/sfx.ts`: extend the union with `| 'toggle' | 'toggle-off' | 'survey' | 'curse'`, export `CUES`, and add:

```ts
  // a two-note click: up for ON, down for OFF
  toggle: [[E5, 40, 'triangle', 0.14], [G5, 70, 'triangle', 0.14]],
  'toggle-off': [[G5, 40, 'triangle', 0.14], [E5, 70, 'triangle', 0.14]],
  // the survey's soft ding-dong
  survey: [[E5, 120, 'triangle', 0.12], [C5, 220, 'triangle', 0.12]],
  // a curse: three steps down and a low hum, worse than death
  curse: [[D5, 140], [B4, 140], [G4, 180], [0, 60], [E3, 420, 'square', 0.2]],
```

`src/world/sacristy.ts`, in `flip()`: `sfx: bonus ? 'bonus' : want ? 'toggle' : 'toggle-off'`. `src/engine/governance.ts`, in `applyGovernance`: track `let survey = false;` set when the survey line is pushed, and return `{ ...result, output: [...], ...(survey && !result.sfx ? { sfx: 'survey' } : {}) }`.

- [ ] **Step 4: The e2e assertion**

`e2e/smoke.spec.ts`, in the side-quest test after `await expect(page.getByRole('status')).toContainText('spreadsheet');` add `await expect(page.getByRole('status')).toContainText("JEFF'S EXCEL");` (the box shows the goal first, then the quip). Run it if Chromium is available: `CHROMIUM_PATH=... npm run e2e`; otherwise note in the commit message that e2e was not run locally.

- [ ] **Step 5: Run everything and commit**

Run: `npx tsc -b && npm test && npm run lint:world` — Expected: green.

```bash
git add src/game/sfx.ts src/world/sacristy.ts src/engine/governance.ts e2e/smoke.spec.ts tests/sfx.test.ts
git commit -m "sfx: toggle, toggle-off, survey, curse; e2e asserts the Excel goal box"
```

---

### Task E9: Golden + governance suites, and the lint additions

**Files:**
- Create: `tests/golden-plus-governance.test.ts`
- Modify: `src/world/lint.ts`
- Modify: `tests/world-lint.test.ts` (the fixture-free lint expectations)
- Test: `tests/world-lint.test.ts`

**Voice:** read the voice skill first; the lint messages are plain, the world lines they check are not.

**Interfaces:**
- Consumes: everything from E1–E8.
- Produces: lint problems `npc <id>: missing brushOff`, `setting <key>: missing catalog entry`, `setting <key>: empty <field>`, `setting <key>: no book item in the Sacristy`; (the item `blurb`/`again` lint lands with the blurbs in Task F3 so every commit stays green).

- [ ] **Step 1: Write the failing tests**

```ts
// tests/golden-plus-governance.test.ts
// Spec2 §12: the golden path with a Sacristy detour (200 + 15) and with the applied steps (200 + 10).
import { describe, expect, it } from 'vitest';
import { MAX_SCORE, newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { GOLDEN_PATH } from './golden-path';

const play = (path: string[]) => {
  let s = newGame(WORLD, 42);
  const log: string[] = [];
  for (const cmd of path) {
    const r = step(s, cmd, WORLD);
    log.push(`> ${cmd}\n${r.output.join('\n')}\n  [${r.outcome} ${r.stepId} room=${r.state.room} score=${r.state.score} bonus=${r.state.bonus}]`);
    expect(r.state.dead, log.join('\n')).toBe(false);
    s = r.state;
  }
  return { s, log: log.join('\n') };
};

describe('golden + governance', () => {
  it('a Sacristy detour after the hoodie: xmla off/on (+5), publish to web off after the Abbot (+10), reset (nothing) → 200 + 15', () => {
    const at = GOLDEN_PATH.indexOf('wear hoodie') + 1;
    const DETOUR = ['talk to abbot', 'u', 'turn off xmla', 'turn on xmla', 'turn off publish to web', 'reset settings', 'd'];
    const { s, log } = play([...GOLDEN_PATH.slice(0, at), ...DETOUR, ...GOLDEN_PATH.slice(at)]);
    expect(s.score, log).toBe(MAX_SCORE); expect(s.bonus, log).toBe(15); expect(s.won, log).toBe(true);
    expect(s.flags['bonus.gov.abbot'], log).toBe(true); expect(s.flags['bonus.gov.restored'], log).toBe(true);
  });
  it('the applied steps in the hall on the way to the Duke → 200 + 10', () => {
    const at = GOLDEN_PATH.indexOf('say trial') + 2; // after 'say trial', 'n' (into the hall)
    const STEPS = ['source', 'navigate', 'promote headers', 'change type', 'filter rows', 'remove other columns', 'rename columns'];
    const { s, log } = play([...GOLDEN_PATH.slice(0, at), ...STEPS, ...GOLDEN_PATH.slice(at)]);
    expect(s.score, log).toBe(MAX_SCORE); expect(s.bonus, log).toBe(10); expect(s.won, log).toBe(true);
  });
});
```

Add to `tests/world-lint.test.ts`:

```ts
import { SETTING_KEYS } from '../src/engine/governance';
import { SETTINGS } from '../src/world/sacristy';

it('the lint catches a missing brushOff, a missing catalog entry, and an empty catalog field', () => {
  const noBrush = { ...WORLD, npcs: { ...WORLD.npcs, jeff: { ...WORLD.npcs.jeff!, brushOff: undefined } } };
  expect(lintWorld(noBrush)).toContain('npc jeff: missing brushOff');
  expect(lintWorld({ ...WORLD, rooms: { ...WORLD.rooms, 'monastery.sacristy': { ...WORLD.rooms['monastery.sacristy']!, items: [] } } })).toContain('setting export: no book item in the Sacristy');
  expect(SETTINGS.map((b) => b.key).sort()).toEqual([...SETTING_KEYS].sort());
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run tests/golden-plus-governance.test.ts tests/world-lint.test.ts`
Expected: the golden suites pass already (E1–E8 built them); the lint test FAILS (no such problems reported).

- [ ] **Step 3: `src/world/lint.ts`**

Imports: `import { SETTING_KEYS } from '../engine/governance'; import { SETTINGS } from './sacristy';`. Before the final `return`:

```ts
  // Spec1 §6, spec2 §9: every NPC brushes off unknown topics; the settings catalog is complete and every book is an item in the Sacristy.
  for (const n of Object.values(world.npcs)) if (!n.brushOff) problems.push(`npc ${n.id}: missing brushOff`);
  const sacristy = world.rooms['monastery.sacristy'];
  for (const key of SETTING_KEYS) {
    const book = SETTINGS.find((b) => b.key === key);
    if (!book) { problems.push(`setting ${key}: missing catalog entry`); continue; }
    for (const f of ['title', 'read', 'on', 'off', 'effect'] as const) if (!book[f]) problems.push(`setting ${key}: empty ${f}`);
    if (sacristy && !sacristy.items.includes(`book-${key}`)) problems.push(`setting ${key}: no book item in the Sacristy`);
  }
```

(`tests/step.test.ts`'s fixture world has NPCs without `brushOff` but never calls `lintWorld`; `tests/world-lint.test.ts` lints `WORLD`, where every NPC has one after Tasks B1 and E4.)

- [ ] **Step 4: Run everything and commit**

Run: `npx tsc -b && npm test && npm run lint:world` — Expected: green; the lint line reads `World OK (31 rooms, … items, 15 npcs, …)`.

```bash
git add tests/golden-plus-governance.test.ts src/world/lint.ts tests/world-lint.test.ts
git commit -m "tests: golden + governance detour (200+15), golden + applied steps (200+10); lint brush-offs and the catalog"
```

---
### Task F1: Voice pass — generic fallbacks, `where`, `why`, echo, boredom, "making up puzzles"

**Files:**
- Create: `src/world/where.ts`
- Modify: `src/world/globals.ts` (SNARK additions; VOICE_PHRASES: `where`, bare `why`)
- Modify: `src/engine/builtins.ts` (dontSee, no-exit, talk-to-nothing, give-to-nobody, use-nothing pools; `score` aside; `help` prefix; echo-your-words)
- Modify: `src/engine/quirks.ts` (REPEAT_2/3/MANY, REPEAT_LOOK by n, SHOUT_NO, INSIST additions)
- Modify: `src/engine/types.ts` (GameState.idle, GameState.looks)
- Modify: `src/engine/step.ts` (idle and looks in finish(); boredom lines; the puzzles line)
- Modify: `src/world/index.ts` (register VOICE_PHRASES)
- Modify: `src/world/lint.ts` (every room has a WHERE line)
- Test: `tests/voice-fallbacks.test.ts`

**Voice:** read the voice skill first — "Generic fallbacks" and "Player fishing / stalling / bored" are this task. These are the most-read lines in the game. Add-mode: every existing line stays; new lines join the pools.

**Interfaces:**
- Consumes: `nick()`, `NICKNAMES` (D1); `stuck` (B3).
- Produces: `export const WHERE: Record<string, string>` (one line per room id, 31 entries; lint requires one per room) in `where.ts`; `export const VOICE_PHRASES: PhraseRule[]` in `globals.ts` (`where.pane`, `where.main`, `egg.why-bare`), registered right before `PHRASE_RULES`; `GameState.idle?: number` (consecutive turns in one room without points, bonus or a move — any outcome; boredom lines at 10, 15, then every 5; not in god mode or a side realm) and `GameState.looks?: number` (consecutive successful looks at scenery; at 5 the "making up puzzles" line, then reset).
- Order in `src/world/index.ts` after this task: `[...SIDEQUEST_PHRASES, ...GOAL_PHRASES, ...HINT_PHRASES, ...GOVERNANCE_PHRASES, ...EXCEL_PHRASES, ...COPILOT_PHRASES, ...SACRISTY_PHRASES, ...TOWNHALL_PHRASES, ...WORKSPACE_PHRASES, ...APPLIED_STEP_PHRASES, ...GATE_PHRASES, ...KEEP_PHRASES, ...LAKEHOUSE_PHRASES, ...PEAKS_PHRASES, ...VOICE_PHRASES, ...PHRASE_RULES]`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/voice-fallbacks.test.ts
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { WHERE } from '../src/world/where';
import { SNARK } from '../src/world/globals';
import { NICKNAMES } from '../src/world/voice';
import type { GameState } from '../src/engine/types';

const run = (cmds: string[], start: Partial<GameState> = {}) => {
  let s: GameState = { ...newGame(WORLD, 11), ...start };
  const outs: string[][] = [];
  for (const c of cmds) { const r = step(s, c, WORLD); s = r.state; outs.push(r.output); }
  return { s, outs };
};
const SEEDS = Array.from({ length: 24 }, (_, i) => i + 1);
const seen = (cmds: string[], seeds: number[], room = 'village.cottage') => { const set = new Set<string>(); for (const seed of seeds) { let s = { ...newGame(WORLD, seed), room }; for (const c of cmds) { const r = step(s, c, WORLD); s = r.state; set.add(r.output[0]!); } } return set; };

describe('generic fallbacks gained lines (spec1 §5.2)', () => {
  it('unparsed input', () => {
    expect(SNARK).toContain('I don\'t understand. Type HELP, or open a ticket like a real professional.');
    expect(SNARK).toContain('Naw.');
    expect(SNARK.length).toBeGreaterThanOrEqual(21);
  });
  it('unknown noun, no exit, talk to nothing, give to nobody, use on nothing — the new lines are reachable', () => {
    const nouns = seen(['get sword'], SEEDS);
    expect([...nouns].some((l) => /never been a sword|didn't animate one|misread the ledger on GitHub/.test(l))).toBe(true);
    const walls = seen(['n'], SEEDS);
    expect([...walls].some((l) => /North is a wall\. It's been a wall since the migration\.|Naw\. Wall\./.test(l))).toBe(true);
    const nobody = seen(['talk to ferryman'], SEEDS);
    expect([...nobody].some((l) => /It's sad when you have to make up people to talk to\.|I'm not talking to you either/.test(l))).toBe(true);
    const give = seen(['give license'], SEEDS);
    expect([...give].some((l) => /To whom\? The candle\? The candle has no budget\./.test(l))).toBe(true);
    const use = seen(['use pebble'], SEEDS, 'lake.shore'); // the shore's pebble has no bare-use rule, so the generic pool answers
    expect([...use].some((l) => /On what\? Discuss\.|Like where\?/.test(l))).toBe(true);
  });
  it('score and help gained an aside', () => {
    const { outs } = run(['score', 'help']);
    expect(outs[0]).toHaveLength(2); expect(outs[0]![0]).toMatch(/^Score : /);
    expect(outs[1]![0]).toMatch(new RegExp(`^Okay, (${NICKNAMES.join('|').replace(/-/g, '\\-')})\\.$`));
  });
});

describe('where and why', () => {
  it('every room has a where line and where says it', () => {
    for (const id of Object.keys(WORLD.rooms)) expect(WHERE[id], id).toBeTruthy();
    expect(run(['where']).outs[0]![0]).toBe(WHERE['village.cottage']);
    expect(run(['where am i'], { room: 'peaks.shrine' }).outs[0]![0]).toBe(WHERE['peaks.shrine']);
    expect(run(['where'], { room: 'copilot.pane', flags: { 'sq.return': 1 } }).outs[0]![0]).toBe(WHERE['copilot.pane']);
  });
  it('why alone, and why with more', () => {
    expect(run(['why']).outs[0]![0]).toBe('I wish I knew.');
    expect(run(['why me']).outs[0]![0]).toMatch(/Finance asked for it in 2019/);
  });
});

describe('echo-your-words, repeats, boredom, making up puzzles', () => {
  it('a three-adjective noun gets quoted back', () => {
    const { outs } = run(['look at the big ugly brown door']);
    expect(outs[0]![0]).toBe('Listen to you. "look at the big ugly brown door." What kinda gaming is that? It\'s a door.');
    expect(outs[0]![1]).toMatch(/The door\./);
  });
  it('second and third looks at the same scenery', () => {
    const { outs } = run(['look at candle', 'look at candle', 'look at candle']);
    expect(outs[1]!.length).toBe(2); expect(outs[2]![1]).toMatch(/^Shut up\.$|You are an incredibly boring person\./);
  });
  it('boredom: 10 turns in one room with no progress', () => {
    const { s, outs } = run(Array(10).fill('inventory'));
    expect(s.idle).toBe(10);
    expect(outs[9]![outs[9]!.length - 1]).toBe("Let's get moving, here, people.");
    const more = run(Array(15).fill('inventory'));
    expect(more.outs[14]![more.outs[14]!.length - 1]).toBe('Are you THAT bored? Do some questing already!');
    expect(run(Array(20).fill('inventory')).outs[19]!.at(-1)).toBe('You are an incredibly boring person.');
    expect(run(['inventory', 'inventory', 'get mug', ...Array(8).fill('inventory')]).s.idle).toBe(8);
  });
  it('five scenery looks in a row: making up puzzles', () => {
    const { outs, s } = run(['look at candle', 'look at bed', 'look at desk', 'look at window', 'look at door']);
    expect(outs[4]!.at(-1)).toBe("For what? Now you're just making up puzzles to solve.");
    expect(s.looks).toBe(0);
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run tests/voice-fallbacks.test.ts`
Expected: FAIL — `where.ts` missing.

- [ ] **Step 3: `src/world/where.ts`**

```ts
/** `where` (spec1 §5.2): one line per room. The narrator names the screen and mocks you for being on it. Lint requires an entry for every room. */
export const WHERE: Record<string, string> = {
  'village.cottage': "You're hanging out in My Workspace. Nobody else can see in, which is the only reason you're allowed to look like that.",
  'village.square': "The Village Square. A well, a board, and a Jeff. You're the fourth thing.",
  'village.mill': 'The Dataflow Gen1 Mill. Deprecated, like your first semantic model, which was one table and still is.',
  'village.fields': 'The Refresh Fields. Rows of failures, and you, standing among them like you belong. You do.',
  'village.hall': "The Town Hall. The queue has one person in it and it's you and you're not moving.",
  'lake.shore': "The OneLake Shore. One lake. You've counted twice. Still one.",
  'lake.dock': "The Ferryman's Dock. OFFLINE, like the guy who set up the gateway and left for a company that appreciates him.",
  'lake.island': "The Isle of Gateway. Two keys, one plinth, and a decision you'll be explaining in a postmortem.",
  'lake.house': "The Lake House. A house. On a lake. You keep saying it like it'll start meaning something.",
  'swamp.bronze': 'The Bronze Marsh. Everything here is a string, including your plan.',
  'swamp.silver': "The Silver Marsh. Things have names now. Yours is still 'peasant'.",
  'swamp.gold': 'The Gold Marsh. Clean, typed, modeled. You lower the tone just by standing here.',
  'monastery.gate': "The Monastery Gate. A session is starting. It was starting when you got here and it'll be starting at your funeral.",
  'monastery.cloister': "The Cloister. Monks in a circle, chanting. You're in the loop now. There's no break statement.",
  'monastery.spark': 'The Spark Session Chamber. Warm, humming, billed. Like a hot tub with an invoice.',
  'monastery.library': 'The Library of Deprecated Notebooks. One of them is yours. She knows.',
  'monastery.sacristy': 'The Sacristy. The Admin Portal. You have the keys to the tenant and the judgment of a Zune.',
  'fortress.bridge': "The Power BI Desktop Gate. Still updating. 1 of 3. It's been 1 of 3 since Windows Vista.",
  'fortress.hall': 'Power Query Hall. Seven doors, one order, and you, trying them like a raccoon at a vending machine.',
  'fortress.model': 'The Model View. Tables on plinths, lines between them, and one bridge that wobbles like your DAX.',
  'fortress.throne': "The Duke's Chamber. Filter context only. Your outside voice doesn't work in here.",
  'fortress.yard': 'The Report Studio. A pie with 31 slices and a Card that says (Blank), which is also your plan.',
  'peaks.foothills': "The Foothills. The air's thin and so is the excuse you'll give Finance.",
  'peaks.pass': 'Throttling Pass. Every step costs more than the last one, like a consultant, or you, eventually.',
  'peaks.ledge': "The Bursting Ledge. A door that checks three things about you. It's found more than three.",
  'peaks.shrine': 'The Shrine. A dragon, a model, and a peasant who read the walkthrough. Two of you are impressive.',
  'excel.sheet1': "Sheet1. Jeff's desk. Grid paper to the horizon and a SUM that's wrong to four decimal places.",
  'excel.data': "The Data tab. Where the good buttons are, away from Jeff. He's watching you use them.",
  'excel.pivot': 'PivotTable1. Jeff named it. Jeff names everything 1, including, briefly, his son.',
  'copilot.pane': "The Copilot Pane. A sparkle that would like to help. It has helped four people. They're in a meeting about it.",
  'copilot.gallery': "The Model Gallery. Three models on plinths. One's certified. Guess which one Copilot picks.",
};
```

`src/world/lint.ts`: `for (const id of rooms) if (!WHERE[id]) problems.push(\`${id}: no WHERE line\`);` (import `WHERE`; the fixture worlds in `tests/step.test.ts` never run the lint).

- [ ] **Step 4: Phrases and pools (`src/world/globals.ts`)**

```ts
import { WHERE } from './where';
const WHERE_TEST = /^(where|where am i|where is this|where are we|location|what room is this)\??$/;
const whereLine = (s: GameState, w: World): string => WHERE[s.room] ?? `You're hanging out in ${w.rooms[s.room]!.name}.`;
/** Registered right before PHRASE_RULES (world/index.ts): the pane copy is needed because a prompt room skips global phrases. */
export const VOICE_PHRASES: PhraseRule[] = [
  { id: 'where.pane', room: 'copilot.pane', test: WHERE_TEST, text: whereLine },
  { id: 'where.main', test: WHERE_TEST, text: whereLine },
  { id: 'egg.why-bare', test: /^why\??$/, text: 'I wish I knew.' },
];
```

Append to `SNARK`:

```ts
  "I don't understand. Type HELP, or open a ticket like a real professional.",
  'Two words, Ctrl-Shift-Enter. Verb, then the thing. Like a measure, but shorter.',
  'Naw.',
  'Listen to you. What kinda gaming is that? Two words.',
```

- [ ] **Step 5: Builtins (`src/engine/builtins.ts`)**

`dontSee` pool gains: `` `A ${noun}? In this room? You misread the ledger on GitHub, guy.` ``, `` `Yeah, there's no ${noun}. We didn't animate one. You don't see me typing 'get browser window.'` ``, `` `No ${noun}. There's never been a ${noun}. You're thinking of a different game with a bigger art budget.` ``.

No-exit pool (`case 'go'`): add `` `${DIR_NAME[cmd.dir]} is a wall. It's been a wall since the migration.` `` and `'Naw. Wall.'`, with `const DIR_NAME: Record<Dir, string> = { n: 'North', s: 'South', e: 'East', w: 'West', u: 'Up', d: 'Down', out: 'Out', in: 'In' };`.

Talk to nothing: replace the fixed string with `vary(s, [\`There is no ${cmd.noun} here to talk to.\`, "It's sad when you have to make up people to talk to.", \`There's no ${cmd.noun} here. There's you, and there's me, and I'm not talking to you either.\`])`.

Give with no target: `vary(s, ['Give it to whom?', 'To whom? The candle? The candle has no budget.', 'Give it to whom? Discuss.'])`. The shared "That doesn't do anything here." pool gains `'On what? Discuss.'` and `'Like where?'`.

`case 'score'`: output becomes `[line, vary(s, ['The Miller has seen worse. Not many.', 'Somewhere, a Hall of Fame shrugs.', 'Turns count. Jeff counts them.'])]`. `case 'help'`: prefix `` `Okay, ${nick(s)}.` `` as the first output line.

Echo-your-words in `case 'look'`, after `resolveNoun`: 

```ts
      const words = cmd.noun.split(' ');
      const exact = r.kind === 'item' ? [r.item.name.toLowerCase(), ...r.item.aliases.map((a) => a.toLowerCase())].includes(cmd.noun) : true;
      const echo = words.length >= 3 && !exact && r.kind === 'item' ? [`Listen to you. "${cmd.raw.trim()}." What kinda gaming is that? It's a ${r.item.name}.`] : [];
      return { state: s, output: [...echo, text], outcome: 'success' };
```

- [ ] **Step 6: Quirks (`src/engine/quirks.ts`)**

`REPEAT_2` gains `'Come now. We\'ve been through this jaunty little bit before.'`, `'We did that already, and it was sort of humiliating.'`, `'You done that already. A great time was had by all.'`; `REPEAT_3` gains `'Are you THAT bored? Do some questing already!'`; `REPEAT_MANY` gains `(n: number) => \`${n}. You are an incredibly boring person.\``; `SHOUT_NO` gains `'NO MAN! JEEZ!'`; `INSIST` gains `'Yeah but like you already said the said, guy.'`. `REPEAT_LOOK` splits by count:

```ts
const REPEAT_LOOK_2 = [...REPEAT_LOOK, "You're really hurtin' for puzzle solutions, huh?"];
const REPEAT_LOOK_3 = ['Shut up.', 'You are an incredibly boring person.'];
```

and in `applyQuirks`: `else if (looking) extra.push(pick(prev, recent.n === 2 ? REPEAT_LOOK_2 : recent.n === 3 ? REPEAT_LOOK_3 : REPEAT_LOOK, 6));`.

- [ ] **Step 7: Engine counters (`src/engine/types.ts`, `src/engine/step.ts`)**

`GameState` gains `idle?: number;` and `looks?: number;`. In `finish()`, replace Task B3's step 8 block with:

```ts
    // 8. Stuck (spec1 §3.3), bored (spec1 §5.2) and fishing (five scenery looks) — three counters, one place.
    const r8 = result.state;
    // Progress: a move, points, bonus, or a success that changed what you carry or wear. Looking and talking are not progress.
    const progressed = r8.room !== base.room || result.pointsAwarded > 0 || (result.bonusAwarded ?? 0) > 0
      || (result.outcome === 'success' && (r8.inventory.length !== base.inventory.length || r8.worn.length !== base.worn.length));
    const deadTurn = (result.outcome === 'fail' || result.outcome === 'snark') && !progressed;
    const stuck = deadTurn ? (base.stuck ?? 0) + 1 : 0;
    const idle = progressed ? 0 : (base.idle ?? 0) + 1;
    const lookedAtScenery = parsedEarly.verb === 'look' && !!parsedEarly.noun && result.outcome === 'success' && (() => { const x = B.resolveNoun(base, world, parsedEarly.noun); return !!x && x.kind === 'item' && !x.item.takeable; })();
    let looks = lookedAtScenery ? (base.looks ?? 0) + 1 : 0;
    const extra: string[] = [];
    const quiet = r8.flags[GOD_FLAG] || r8.dead || r8.won || SIDE_REGIONS.has(world.rooms[r8.room]!.region);
    if (stuck > 0 && stuck % 4 === 0 && !r8.flags[GOD_FLAG] && r8.room !== 'copilot.pane' && !r8.dead) {
      const hint = world.rooms[r8.room]!.flaskHint(r8);
      extra.push(`(Psst. ${hint || 'Look around. Talk to people. Read things.'})`);
    }
    if (!quiet && idle === 10) extra.push("Let's get moving, here, people.");
    else if (!quiet && idle === 15) extra.push('Are you THAT bored? Do some questing already!');
    else if (!quiet && idle >= 20 && idle % 5 === 0) extra.push('You are an incredibly boring person.');
    if (!quiet && looks >= 5) { extra.push("For what? Now you're just making up puzzles to solve."); looks = 0; }
    result = { ...result, state: { ...r8, stuck, idle, looks }, output: extra.length ? [...result.output, ...extra] : result.output };
    return { ...result, state: { ...result.state, flags: { ...result.state.flags, bonus: result.state.bonus } } };
```

- [ ] **Step 8: Register and run**

`src/world/index.ts`: import `VOICE_PHRASES` and register it right before `PHRASE_RULES`.

Run: `npx tsc -b && npm test && npm run lint:world` — Expected: green. (The golden path's longest same-room stretch is five turns, so no boredom line lands on it; `tests/stuck.test.ts` still passes because the stuck aside is unchanged.)

```bash
git add src/world/where.ts src/world/globals.ts src/engine/builtins.ts src/engine/quirks.ts src/engine/types.ts src/engine/step.ts src/world/index.ts src/world/lint.ts tests/voice-fallbacks.test.ts
git commit -m "voice: generic fallbacks gain lines; where per room; why; echo-your-words; boredom; making up puzzles"
```

---

### Task F2: Voice pass — deaths and curses

**Files:**
- Create: `src/world/curses.ts`
- Create: `src/world/deaths.ts`
- Modify: `src/world/globals.ts` (blame beats; CURSE_GLOBAL_RULES)
- Modify: `src/world/lake.ts`, `src/world/peaks.ts`, `src/world/fortress.ts`, `src/world/village.ts` (blame beats; curse triggers; the ten-columns counter; the CapacityAde; the 400-visual page)
- Modify: `src/world/items.ts`, `src/world/keep-items.ts` (`capacityade`, `page-two`)
- Modify: `src/world/index.ts` (register DEATH_PHRASES)
- Modify: `src/engine/builtins.ts` (talkTo: (Blank) is invisible)
- Modify: `src/ui/PlayScreen.tsx`, `src/App.tsx` (status bar / prompt under a curse)
- Modify: `tests/deaths.test.ts` (the ledger death table count, if asserted) — not asserted; no change
- Test: `tests/deaths-and-curses.test.ts`

**Voice:** read the voice skill first — "Death / failure" (kill sentence, blame sentence, sign-off) and "Non-lethal catastrophic failure".

**Interfaces:**
- Consumes: `SIGNOFF` append (D1), `PhraseRule.then` (D1), `talkTo()` (B1), `MOAT_THEN` (C1), `curse` cue (E8).
- Produces: `export type Curse = 'column' | 'blank' | 'jeff'` and `export function curseOf(s: GameState): Curse | null` (flags `curse.column`, `curse.blank`, `curse.jeff`) in `curses.ts`; `export const CURSE_GLOBAL_RULES: Rule[]` (the undo rules `curse.undo-column`, `curse.undo-blank`) spread into `GLOBAL_RULES` before `global.say-star-elsewhere`; `export const DEATH_PHRASES: PhraseRule[]` in `deaths.ts`, registered right before `VOICE_PHRASES`; death ids `death.monday`, `death.both`, `death.400`, `death.word`, `death.final4`, `death.dax-in-m`, `death.capacityade`; items `capacityade` (Throttling Pass, gettable) and `page-two` (Studio); flags `duke.wrong` (0–3), `card.stares` (0–6), `model.calc` (0–10); `PlayScreen` takes `playerName: string`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/deaths-and-curses.test.ts
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { SIGNOFF } from '../src/world/voice';
import { curseOf } from '../src/world/curses';
import type { GameState } from '../src/engine/types';

const at = (room: string, extra: Partial<GameState> = {}): GameState => ({ ...newGame(WORLD, 7), room, ...extra });
const one = (room: string, cmd: string, extra: Partial<GameState> = {}) => step(at(room, extra), cmd, WORLD);
const run = (room: string, cmds: string[], extra: Partial<GameState> = {}) => { let s = at(room, extra); let last = step(s, 'look', WORLD); for (const c of cmds) { last = step(s, c, WORLD); s = last.state; } return { s, last }; };

describe('blame beats on the nine (spec1 §5.4)', () => {
  it.each([
    ['village.cottage', 'die', /Your mom told you this game had a dragon in it and you did this instead\./],
    ['village.cottage', 'attack me', /the art budget didn't cover a bystander/i],
    ['village.cottage', 'delete workspace', /Somewhere a director's bookmark breaks and a Teams message begins composing itself\./],
    ['village.cottage', 'format c:', /You typed it with feeling, too\./],
    ['village.square', 'give paginated report to jeff', /Dumb, dumb, dumb\./],
    ['lake.shore', 'import onelake', /Nice one, Import Mode Ishmael\./],
    ['fortress.bridge', 'swim moat', /Report Builders can't swim\. Like, it's in the license\./],
    ['swamp.bronze', 'drink water', /Your mom told you never to drink from the Bronze layer\. And NOW look\./],
    ['peaks.shrine', 'attack dragon', /You knew you were supposed to TALK to him, right\? You read the ledger\./],
  ])('%s: %s', (room, cmd, blame) => {
    const r = one(room, cmd);
    expect(r.state.dead).toBe(true);
    expect(r.output.join(' ')).toMatch(blame);
    expect(r.output.at(-1)!.endsWith(SIGNOFF)).toBe(true);
  });
});

describe('the new deaths', () => {
  it.each([
    ['village.fields', ['refresh'], 'death.monday', /9:02 a\.m\. on a Monday/],
    ['fortress.model', ['set both on everything'], 'death.both', /Sales to Sales through Sales/],
    ['fortress.model', ['enable bidirectional on all relationships'], 'death.both', /Ambiguous path/],
    ['fortress.yard', ['open other page'], 'death.400', /only dogs and Throttlor can hear/],
    ['fortress.yard', ['open 400 visuals'], 'death.400', /400/],
    ['village.cottage', ['merge the final files'], 'death.final4', /Sales_v3_FINAL_final4 and you are not in it/],
    ['fortress.hall', ['type dax'], 'death.dax-in-m', /it evaluates/],
    ['fortress.hall', ['write a measure'], 'death.dax-in-m', /M editor/],
    ['peaks.pass', ['drink capacityade'], 'death.capacityade', /64 CUs/],
  ])('%s: %s → %s', (room, cmds, cause, re) => {
    const { s, last } = run(room, cmds);
    expect(s.dead).toBe(true); expect(last.deathCause).toBe(cause); expect(last.output.join(' ')).toMatch(re);
    expect(last.output.at(-1)!.endsWith(SIGNOFF)).toBe(true);
  });
  it('the CapacityAde kills you anywhere you carry it', () => {
    const { s } = run('village.square', ['drink the ade'], { inventory: ['license', 'capacityade'] });
    expect(s.dead).toBe(true);
  });
  it('ten calculated columns: nine warnings, then Word', () => {
    const { s, last } = run('fortress.model', Array(9).fill('add calculated column'));
    expect(s.dead).toBe(false); expect(s.flags['model.calc']).toBe(9);
    expect(step(at('fortress.model'), 'add column', WORLD).output[0]).toMatch(/circular dependency/);
    const tenth = step(s, 'add calculated column', WORLD);
    expect(tenth.state.dead).toBe(true); expect(tenth.deathCause).toBe('death.word'); expect(tenth.output.join(' ')).toMatch(/It opens in Word\. You are in it\./);
    expect(last.output[0]).toMatch(/You can hear Word opening\./);
  });
});

describe('the curses (spec1 §5.4)', () => {
  it('column: three wrong answers to the Duke; Throttlor will not talk to a column; the policy or the moat lifts it', () => {
    const { s, last } = run('fortress.throne', ['say sumx', 'say divide', 'say filter', 'say evaluate']);
    expect(curseOf(s)).toBe('column'); expect(last.sfx).toBe('curse'); expect(last.output[0]).toMatch(/CALCULATED COLUMN/);
    const shrine = step({ ...s, room: 'peaks.shrine', flags: { ...s.flags, 'trial.hoodie': true, 'trial.moat': true, 'trial.key': true, 'shrine.open': true } }, 'say star schema', WORLD);
    expect(shrine.state.flags['dragon.gone']).toBeUndefined(); expect(shrine.output[0]).toMatch(/don't negotiate with columns/);
    const policy = step({ ...s, inventory: ['license', 'policy'] }, 'use policy on self', WORLD);
    expect(curseOf(policy.state)).toBeNull(); expect(policy.output[0]).toMatch(/a measure again/);
    const moat = step(s, 'say calculated column', WORLD);
    expect(curseOf(moat.state)).toBeNull(); expect(moat.state.score).toBe(25);
    expect(curseOf(run('fortress.throne', ['say sumx', 'say divide', 'say filter', 'say calculated column']).s)).toBeNull();
  });
  it('blank: staring past six; NPCs look through you; star schema restores you', () => {
    const { s, last } = run('fortress.yard', Array(7).fill('look at card'), { flags: { 'stare.done': true } });
    expect(curseOf(s)).toBe('blank'); expect(last.output[0]).toMatch(/\(Blank\)/);
    expect(step({ ...s, room: 'village.square' }, 'talk to jeff', WORLD).output[0]).toBe('Jeff from Finance looks through you, the way a visual looks through (Blank).');
    const back = step({ ...s, room: 'village.square' }, 'say star schema', WORLD);
    expect(curseOf(back.state)).toBeNull(); expect(back.output[0]).toMatch(/You have a value again/);
    const shrine = step({ ...s, room: 'peaks.shrine' }, 'say star schema', WORLD);
    expect(shrine.state.flags['dragon.gone']).toBe(true); expect(curseOf(shrine.state)).toBeNull();
  });
  it('jeff: eight talks with nothing given; the mug undoes it', () => {
    const { s, last } = run('village.square', Array(8).fill('talk to jeff'));
    expect(curseOf(s)).toBe('jeff'); expect(last.output[0]).toMatch(/You are Jeff now\./);
    const mug = step({ ...s, inventory: ['license', 'mug'] }, 'give mug to jeff', WORLD);
    expect(curseOf(mug.state)).toBeNull(); expect(mug.output[0]).toMatch(/stop being Jeff/);
    expect(curseOf(run('village.square', Array(8).fill('talk to jeff'), { flags: { 'jeff.pacified': true } }).s)).toBeNull();
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run tests/deaths-and-curses.test.ts`
Expected: FAIL — `curses.ts` missing.

- [ ] **Step 3: Blame beats (add-mode: append to the kill sentence)**

`src/world/globals.ts`:
- `death.die`: `'You die. Just like that. No dragon required. The realm makes a note of your efficiency. Your mom told you this game had a dragon in it and you did this instead.'`
- `death.attack-self`: `"You attack yourself. Nobody in the realm tries to stop you; the art budget didn't cover a bystander. It works. Efficient, if bleak."`
- `death.delete-workspace`: `"You delete the workspace. You were in it. Somewhere a director's bookmark breaks and a Teams message begins composing itself."`
- `death.rm-rf`: `'You run it. The realm, to its credit, had a backup. You did not. You typed it with feeling, too.'`
- `death.paginated`: `"You offer Jeff a paginated report. Jeff's eyes go dark. He was not built for this. Neither were you. Dumb, dumb, dumb."`
- `death.import`: `'You attempt to Import the OneLake into Power BI Desktop. Your laptop becomes a small sun. Nice one, Import Mode Ishmael.'`
- `death.swim-moat`: append ` Report Builders can't swim. Like, it's in the license.`
`src/world/lake.ts` `death.bronze`: `'You drink raw data. Nothing is typed. Everything is a string. You are a string. Your mom told you never to drink from the Bronze layer. And NOW look.'`. `src/world/peaks.ts` `death.dragon`: append ` You knew you were supposed to TALK to him, right? You read the ledger.`

- [ ] **Step 4: `src/world/deaths.ts` and the items**

```ts
import type { PhraseRule } from './types';

/** The new Fabric deaths (spec1 §5.4). Room-scoped; registered right before VOICE_PHRASES so they beat the global eggs (refresh, dax, merge). The engine appends the sign-off. */
export const DEATH_PHRASES: PhraseRule[] = [
  { id: 'death.monday', room: 'village.fields', test: /^refresh\b/, text: 'You kick off a full refresh at 9:02 a.m. on a Monday. Every report in the village goes grey at once. The villagers find you before the capacity does.', death: 'death.monday' },
  { id: 'death.both', room: 'fortress.model', test: /^(enable|set|make|turn on) (bidirectional|both|cross ?filter(ing)? both|both directions)( filtering)?( on| for| to)? (everything|all|every relationship|all relationships|all of them)$/, text: 'You set every relationship to Both. The model finds a path from Sales to Sales through Sales. So do you. Ambiguous path.', death: 'death.both' },
  { id: 'death.400', room: 'fortress.yard', test: /^open (the )?(other page|page 2|second page|400[- ]visual (page|report)|400 visuals?|page two|do not open)$/, text: 'You open the other page. 400 visuals. Your laptop fan hits a note only dogs and Throttlor can hear. The fan wins.', death: 'death.400' },
  { id: 'death.final4', room: 'village.cottage', test: /^merge\b/, text: 'You merge the FINAL files. There is now a Sales_v3_FINAL_final4 and you are not in it.', death: 'death.final4' },
  { id: 'death.dax-in-m', room: 'fortress.hall', test: /^(type|write|enter|paste|put) (some |a |the |in )?(dax|measure|a measure|new measure|calculate)\b/, text: 'You type DAX into the M editor. The hall does not error. It does something worse: it evaluates.', death: 'death.dax-in-m' },
];
```

`src/world/items.ts`: `item({ id: 'capacityade', name: 'CapacityAde', aliases: ['capacity ade', 'bottle', 'sports drink', 'ade', 'drink', 'the ade'], takeable: true, describe: "A bottle of CapacityAde. Electrolytes and autoscale. 'Now with 64 CUs.' The label warns against drinking it while standing on a capacity." })`. Throttling Pass items: `['rocks', 'receipt', 'capacityade']`. `src/world/keep-items.ts`: `{ id: 'page-two', name: 'other page', aliases: ['page 2', 'second page', 'page two', '400 visuals', 'tab', 'do not open'], takeable: false, untakeableText: 'The tab is warm. You leave it alone. For now.', describe: "A second tab: 'Page 2 (do not open)'. 400 visuals, one per product, each with its own slicer. The tab is warm to the touch." }`; Studio items gain `'page-two'`.

CapacityAde rules: in `peaks.pass` rules add `{ id: 'death.capacityade', when: { verb: 'drink', noun: ADE }, then: { text: ADE_DEATH, death: 'death.capacityade' } }` and in `GLOBAL_RULES` (before `global.drink-mug`) `{ id: 'death.capacityade-carried', when: { verb: 'drink', noun: ADE, has: ['capacityade'] }, then: { text: ADE_DEATH, death: 'death.capacityade' } }`, with `const ADE = ['capacityade', 'capacity ade', 'bottle', 'sports drink', 'ade', 'the ade']` and `const ADE_DEATH = 'Electrolytes. Autoscale. Your heart hits 64 CUs and the bill arrives before you do.'` (export both from `deaths.ts`).

Ten calculated columns — `src/world/fortress.ts`, replace the `fortress.circular` phrase:

```ts
const COLUMNS = [
  'A circular dependency was detected. You did not touch anything. You breathed near it.',
  'Sure, add a calculated column. Add nine. Your model is a Word document now, and I say that with love.',
  "Another column. It's calculated at refresh, stored in memory, and mourned at scale.",
  'Three. The model is warm now. Not fast. Warm.',
  'Four. Sir Cardinality has stopped making eye contact.',
  'Five. Somewhere a measure that would have done this in one line weeps.',
  "Six. The refresh window sends a calendar invite for 'discussion'.",
  'Seven. The .pbix is 2.4 GB. It was 2.3. You did that.',
  'Eight. The columns have started calculating each other.',
  'Nine. You can hear Word opening.',
];
  { id: 'fortress.circular', room: 'fortress.model', test: /^(create|add|new|make) (a )?(new )?(calculated )?column\b/, text: '', then: (s) => {
    const n = Number(s.flags['model.calc']) || 0;
    if (n >= 9) return { id: 'death.word', then: { text: 'Your model is a Word document now. It opens in Word. You are in it.', death: 'death.word' } };
    return { id: 'fortress.circular', then: { text: COLUMNS[n]!, set: { 'model.calc': n + 1 }, outcome: 'snark' } };
  } },
```

- [ ] **Step 5: `src/world/curses.ts` and the triggers**

```ts
import type { GameState } from '../engine/types';
import type { Rule } from './types';

/** Worse than death (spec1 §5.4). Stored as flags so ordinary rules can set and undo them; curseOf() is the one accessor. */
export type Curse = 'column' | 'blank' | 'jeff';
export const curseOf = (s: GameState): Curse | null => (s.flags['curse.column'] ? 'column' : s.flags['curse.blank'] ? 'blank' : s.flags['curse.jeff'] ? 'jeff' : null);

export const CURSE_COLUMN_TEXT = "'WRONG,' says the Duke. 'Three times. You are hereby a CALCULATED COLUMN.' You feel yourself computed at refresh and stored in every row. Throttlor will not negotiate with a column. You are not exactly dead. You are worse: you are in the model.";
export const CURSE_BLANK_TEXT = "You stare at the Card past the point of sense. The Card stares back. Then it isn't the Card that is (Blank). Sir Cardinality walks past and does not see you. Nobody will, until you say the two words that put a value in you.";
export const CURSE_JEFF_TEXT = 'You talk to Jeff an eighth time with nothing in your hands. Something gives. You look down: an empty spreadsheet, held like a begging bowl. You are Jeff now. Jeff is also Jeff. The prompt has noticed.';
export const COLUMN_DRAGON = "Throttlor sniffs. 'A calculated column. I don't negotiate with columns. Come back when you're a measure.'";

const POLICY = ['policy', 'incremental refresh policy', 'incremental refresh', 'refresh policy', 'incremental'];
const STAR = ['star schema', 'a star schema', 'the star schema', 'star', 'kimball'];
/** Spread into GLOBAL_RULES before global.say-star-elsewhere. */
export const CURSE_GLOBAL_RULES: Rule[] = [
  { id: 'curse.undo-column', when: { verb: 'use', noun: POLICY, noun2: ['self', 'me', 'myself', 'yourself', 'you'], has: ['policy'], flags: [{ flag: 'curse.column' }] }, then: { text: 'You apply the incremental refresh policy to yourself. Ten days at a time, you become a measure again. It takes a minute. It feels like 2019.', set: { 'curse.column': false }, outcome: 'success', sfx: 'success' } },
  { id: 'curse.undo-blank', when: { verb: 'say', noun: STAR, flags: [{ flag: 'curse.blank' }] }, then: { text: "You say 'star schema.' A measure finds you. You have a value again, and it is 1.", set: { 'curse.blank': false }, outcome: 'success', sfx: 'success' } },
];
```

Triggers:
- `src/world/fortress.ts`, throne: every snark `say` rule (`fortress.select1`, `select-cols`, `say-join`, `select-star`, `dax-evaluate`, `dax-implicit`, `dax-bidirectional`, `dax-userelationship`, `dax-sumx`, `dax-divide`, `dax-filter`, `dax-measure`, `dax-context`, `dax-all`) gains `set: { 'duke.wrong': (v) => Math.min(3, (Number(v) || 0) + 1) }`. Insert right after `fortress.moat-again`: `{ id: 'fortress.curse-column', when: { verb: 'say', flags: [{ flag: 'duke.wrong', is: 3 }, { flag: 'trial.moat', not: true }, { flag: 'curse.column', not: true }] }, then: { text: CURSE_COLUMN_TEXT, set: { 'curse.column': true, 'duke.wrong': 0 }, outcome: 'snark', sfx: 'curse' } }`. `MOAT_THEN.set` becomes `{ 'trial.moat': true, 'curse.column': false }` (the moat washes it off, so the curse can never soft-lock the win).
- `src/world/fortress.ts`, Studio: `fortress.look-card-again` and `fortress.look-card-done` gain `set: { …, 'card.stares': (v) => Math.min(6, (Number(v) || 0) + 1) }`; insert before them `{ id: 'fortress.curse-blank', when: { verb: 'look', noun: CARD, flags: [{ flag: 'stare.done' }, { flag: 'card.stares', is: 6 }, { flag: 'curse.blank', not: true }] }, then: { text: CURSE_BLANK_TEXT, set: { 'curse.blank': true, 'card.stares': 0 }, outcome: 'snark', sfx: 'curse' } }`.
- `src/world/peaks.ts`, Shrine, before `peaks.talk-dragon` and before `peaks.dragon`: `{ id: 'peaks.column-say', when: { verb: 'say', flags: [{ flag: 'curse.column' }, ...DRAGON_THERE] }, then: { text: COLUMN_DRAGON, outcome: 'fail' } }` and `{ id: 'peaks.column-talk', when: { verb: 'talk', noun: DRAGON, flags: [{ flag: 'curse.column' }, ...DRAGON_THERE] }, then: { text: COLUMN_DRAGON, outcome: 'fail' } }`; `peaks.dragon`'s `set` gains `'curse.blank': false`.
- `src/world/village.ts`, Square, first rule: `{ id: 'village.curse-jeff', when: { verb: 'talk', noun: JEFF, flags: [{ flag: 'talk.jeff', is: 7 }, { flag: 'jeff.pacified', not: true }, { flag: 'curse.jeff', not: true }] }, then: { text: CURSE_JEFF_TEXT, set: { 'curse.jeff': true }, outcome: 'snark', sfx: 'curse' } }`; `village.jeff-mug`'s text becomes `(s) => \`${s.flags['curse.jeff'] ? 'You hand Jeff the mug and, in doing so, stop being Jeff. ' : ''}Jeff takes the mug. …\`` and its `set` gains `'curse.jeff': false`.
- `src/engine/builtins.ts`, `talkTo()`, first line: `if (curseOf(s) === 'blank') return \`${npc.name} looks through you, the way a visual looks through (Blank).\`;` (import `curseOf` from `'../world/curses'`).
- `src/world/globals.ts`: `...CURSE_GLOBAL_RULES` inserted into `GLOBAL_RULES` right before `global.say-star-elsewhere`; `src/world/index.ts`: register `DEATH_PHRASES` right before `VOICE_PHRASES`.

- [ ] **Step 6: The screen**

`src/App.tsx`: `<PlayScreen … playerName={session.playerName} />`. `src/ui/PlayScreen.tsx`: add `playerName: string` to `Props`; `const curse = curseOf(state);` (import from `'@/world/curses'`); the status-bar right text becomes `{curse === 'column' ? \`Calculated Column ${playerName}\` : curse === 'blank' ? '(Blank)' : 'Fabric’s Quest'}{state.flags.god ? ' ⚡' : ''}`; the caret `<span className="caret">{curse === 'jeff' ? 'Jeff >' : '>'}</span>`; the placeholder `disabled ? '' : curse === 'jeff' ? 'so… excel?' : 'what now?'`.

- [ ] **Step 7: Run everything and commit**

Run: `npx tsc -b && npm test && npm run lint:world` — Expected: green. `tests/voice.test.ts`'s death scan now covers the new deaths too (they all sign off).

```bash
git add src/world/curses.ts src/world/deaths.ts src/world/globals.ts src/world/lake.ts src/world/peaks.ts src/world/fortress.ts src/world/village.ts src/world/items.ts src/world/keep-items.ts src/world/index.ts src/engine/builtins.ts src/ui/PlayScreen.tsx src/App.tsx tests/deaths-and-curses.test.ts
git commit -m "voice: blame beats on every death, nine new Fabric deaths, three curses worse than death"
```

---

### Task F3: Voice pass — remembered repeats, inventory blurbs, milestone epilogues, the sincere win

**Files:**
- Modify: `src/world/types.ts` (Item.blurb, Item.again)
- Modify: `src/engine/builtins.ts` (`get` when carried; `inventory` blurbs)
- Modify: `src/world/items.ts`, `src/world/keep-items.ts` (blurb + again on every takeable item)
- Modify: `src/world/village.ts` (Jeff's mug epilogue), `src/world/globals.ts` (wear hoodie), `src/world/peaks.ts` (ENDING)
- Modify: `src/world/lint.ts` (every takeable item has blurb and again)
- Test: `tests/voice-items.test.ts`

**Voice:** read the voice skill first — "Repeat of a successful action" (refuse by remembering), "Success, milestone" (the absurd epilogue), "Winning" (drop the act).

**Interfaces:**
- Consumes: `nick()`, `MALAPROPS`, `BRANDS` (D1).
- Produces: `Item.blurb?: string` (two sentences, the inventory surface) and `Item.again?: string | ((s: GameState) => string)` (the line for `get <item>` when already carried); lint problems `item <id>: missing blurb`, `item <id>: missing again`; `inventory` prints the carried list, then one `  <name>: <blurb>` line per item; the win text gains the sincere line before `THE END.`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/voice-items.test.ts
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { lintWorld } from '../src/world/lint';
import { GOLDEN_PATH } from './golden-path';

const takeable = Object.values(WORLD.items).filter((i) => i.takeable);

describe('every gettable item has a blurb and a remembered repeat (spec1 §5.2)', () => {
  it.each(takeable.map((i) => i.id))('%s', (id) => {
    const item = WORLD.items[id]!;
    expect(item.blurb, 'blurb').toBeTruthy();
    expect((item.blurb!.match(/[.!?](\s|$)/g) ?? []).length, 'two sentences').toBeGreaterThanOrEqual(2);
    expect(item.again, 'again').toBeTruthy();
  });
  it('the lint enforces it', () => {
    const w = { ...WORLD, items: { ...WORLD.items, mug: { ...WORLD.items.mug!, blurb: undefined, again: undefined } } };
    expect(lintWorld(w)).toEqual(expect.arrayContaining(['item mug: missing blurb', 'item mug: missing again']));
  });
  it('get mug while carrying it is the mug\'s own line, and the second time differs', () => {
    const s = { ...newGame(WORLD, 3), inventory: ['license', 'mug'], flags: { 'taken.mug': true } };
    const a = step(s, 'get mug', WORLD);
    expect(a.output[0]).toBe(typeof WORLD.items.mug!.again === 'function' ? WORLD.items.mug!.again(s) : WORLD.items.mug!.again);
    const b = step(a.state, 'get mug', WORLD);
    expect(b.output.join('\n')).not.toBe(a.output.join('\n'));
  });
  it('inventory lists blurbs', () => {
    const out = step({ ...newGame(WORLD, 3), inventory: ['license', 'mug'], worn: [] }, 'inventory', WORLD).output;
    expect(out[0]).toBe('You are carrying: Pro License Card, mug.');
    expect(out[1]).toBe(`  Pro License Card: ${WORLD.items.license!.blurb}`);
    expect(out[2]).toBe(`  mug: ${WORLD.items.mug!.blurb}`);
  });
});

describe('milestones and the win', () => {
  it('giving Jeff the mug runs one beat too long', () => {
    const r = step({ ...newGame(WORLD, 3), room: 'village.square', inventory: ['license', 'mug'] }, 'give mug to jeff', WORLD);
    expect(r.output[0]).toMatch(/He develops a severe DAX problem and blames you for never being there\.$/);
  });
  it('wearing the hoodie names you', () => {
    const r = step({ ...newGame(WORLD, 3), inventory: ['license', 'hoodie'] }, 'wear hoodie', WORLD);
    expect(r.output[0]).toMatch(/Now you're lookin' like a serious Engineer, .+\.$/);
  });
  it('the win drops the act', () => {
    let s = newGame(WORLD, 42);
    for (const c of GOLDEN_PATH) s = step(s, c, WORLD).state;
    expect(s.won).toBe(true);
    const ending = step({ ...s, won: false, flags: { ...s.flags, 'game.won': false, 'pts.peaks.model': false }, inventory: s.inventory.filter((i) => i !== 'model') }, 'get model', WORLD).output[0]!;
    expect(ending).toMatch(/Congratulations\. You won\. Nobody's ever gotten the Model down the mountain, and you did it with a Pro license\. Way to go\.\n\nTHE END\.$/);
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run tests/voice-items.test.ts`
Expected: FAIL — `blurb` undefined everywhere.

- [ ] **Step 3: Types, builtins, lint**

`src/world/types.ts`, `Item`:

```ts
  /** Two sentences for the inventory: a joke, not a data table (spec1 §5.2). Lint requires it on every takeable item. */
  blurb?: string;
  /** `get <item>` when it is already carried: refuse by remembering the first time. Lint requires it on every takeable item. */
  again?: string | ((s: GameState) => string);
```

`src/engine/builtins.ts`: in `case 'get'`, the `r.where === 'inventory'` branch becomes `return { state: s, output: [r.item.again ? (typeof r.item.again === 'function' ? r.item.again(s) : r.item.again) : vary(s, [...the existing pool, \`You already got it, ${nick(s)}. We all saw.\`])], outcome: 'fail' };`. `case 'inventory'`: after the first line push, for each carried id, `\`  ${name}${worn}: ${item.blurb}\`` when the item has a blurb.

`src/world/lint.ts`: `for (const it of Object.values(world.items)) if (it.takeable) { if (!it.blurb) problems.push(\`item ${it.id}: missing blurb\`); if (!it.again) problems.push(\`item ${it.id}: missing again\`); }`.

- [ ] **Step 4: Every takeable item (`src/world/items.ts`, `src/world/keep-items.ts`)**

Add `blurb` and `again` to each. All 27, in full:

```ts
// license
blurb: 'A Pro license. Gets you in the building and absolutely no capacitude. Framed next to a participation ribbon.',
again: 'You already have the license. It came with the character. It is the only thing that did.',
// mug
blurb: "'World's Okayest Analyst.' Never washed. You've stopped noticing, which is the problem.",
again: "We've been through this. You took it off the desk, next to the seventeen printouts. There's a ring. We all saw.",
// credentials
blurb: 'Gen1 credentials on parchment. Stored in a chest since 2019. Still valid, which is somehow worse.',
again: 'You have the creds. The Miller handed them over like a man handing over a grandchild. Do not make him do it twice.',
// scroll
blurb: 'The Spark Scroll. Due back by the end of the Spark session. Which is never.',
again: 'The scroll is in your pocket, on loan, against your license. The Librarian is counting.',
// hoodie
blurb: 'The Hoodie of Spark. Smells like a session that finally started. You look like an Engineer\'s roommate.',
again: 'You have the hoodie. The Abbot draped it on you personally, and he does not do encores.',
// shortcut
blurb: "A OneLake Shortcut. Points at data you don't own and never will. The closest thing you have to a savings account.",
again: 'You picked up the Shortcut already. It weighed nothing then and it weighs nothing now. That is its whole deal.',
// personal key
blurb: 'A Personal Mode key. Works for you, alone, while your laptop is open. Your laptop is never open.',
again: 'You already took the personal key. It was a mistake then. It is a mistake you are now holding.',
// standard key
blurb: "The Gateway Key, Standard Mode. Doesn't open the gateway to your manager's calendar, which you'd trade it for.",
again: 'You have the STANDARD key. It is heavy in the way things are heavy when many people depend on them, and you keep patting it.',
// boots
blurb: 'Bursting Boots. No more interactive delay. You still walk like a man who formatted the group project in high school.',
again: 'The boots fell out of a progress bar into your hands. That is not a thing that happens twice.',
// model
blurb: 'The Golden Semantic Model. One table, 412 columns, and a note in row 8,041 that says "ask Jeff." You carried it anyway.',
again: 'You are holding the Model. You have been holding it since the mountain. Put it down and the village refreshes stop.',
// jeff-note
blurb: 'DO NOT REFRESH — JEFF. A sticky note that has outlived three refresh schedules. It will outlive you.',
again: 'You already peeled the note off your desk. There is a sticky rectangle where it was, and it is somehow also Jeff\'s.',
// lanyard
blurb: 'A FabCon lanyard with a coffee stain from the keynote. HELLO MY NAME IS, and then nothing, because you left before the name part.',
again: 'You have the lanyard. You have had the lanyard since the conference. Nobody has checked it once.',
// usb stick
blurb: 'FINAL_v2, on a USB stick. It contains a Dataflow Gen1 Classic. Of course it does.',
again: 'FINAL_v2 is already in your pocket. So, somewhere, is FINAL_v3. Nobody has ever found it.',
// seed
blurb: 'A refresh seed. Plant it and in 24 hours you have another failed refresh. Nature is a scheduler.',
again: 'You already have the seed. It is not going to germinate in your pocket. It is barely going to germinate in the ground.',
// pebble
blurb: 'A flat pebble, perfect for skipping. The OneLake will take it. The OneLake takes everything, once.',
again: 'You already picked up the pebble. It is one pebble. There is only ever one; they were very clear about that.',
// timetable
blurb: 'FERRY TIMETABLE. Eight departures a day on Pro. Every one of them crossed out and replaced with OFFLINE.',
again: 'You have the timetable. Every departure on it is OFFLINE. Reading it twice does not add a boat.',
// stress ball
blurb: 'A stress ball shaped like an OLAP cube. Five of its six faces are dimensions nobody asked for.',
again: 'You already have the cube. You could squeeze it. You have squeezed it. Your forearm is a star schema.',
// name tag
blurb: 'HELLO MY NAME IS Column3. Peeled off a column upstream; renamed so many times the ink gave up.',
again: 'You already have the name tag. It says Column3. It will say Column3 until someone opens the query, which is never.',
// pamphlet
blurb: "SPARK: A BEGINNER'S GUIDE. Chapter 1: Waiting. Chapter 3 has not started yet.",
again: 'You already have the pamphlet. Chapter 3 is still starting. So is your session.',
// kpi
blurb: 'A laminated KPI. Target: 100%. Actual: (Blank). Somebody laminated (Blank), on purpose, to keep it.',
again: 'You already have the KPI. It is still (Blank). Lamination does not fix that; it preserves it.',
// bamboo
blurb: "A bamboo shoot, Brother Pandas' lunch. He insists it is also a dependency.",
again: "You already took his lunch. He has noticed. He has said nothing, which is worse.",
// synapse-bookmark
blurb: 'A bookmark from the Synapse wing. It marks a page nobody will return to.',
again: 'You already have the bookmark. Nobody will return to the page. Not even you, and you are holding it.',
// flat-rock
blurb: 'A flat rock from the Foothills. Exactly as useful as it looks, which is the most honest thing in the Peaks.',
again: 'You already have the rock. It was a rock then. Rocks are stable. Unlike you.',
// receipt
blurb: 'A receipt, blowing down the Pass: 1 step, 400 CU-seconds, smoothed over 24 hours, payable now.',
again: 'You already have the receipt. Picking it up again is a second step. That is another 400 CU-seconds. Itemized.',
// carabiner
blurb: 'A carabiner stamped F64. Rated for any capacity except yours.',
again: 'You have the carabiner. It is clipped to nothing. It has always been clipped to nothing.',
// ticket
blurb: "SEV-3: 'report is wrong'. No further details. It has been In Progress since before you picked it up.",
again: 'You already have the ticket. Taking it again would be a duplicate. The Clerk would close it as one.',
// capacityade
blurb: "CapacityAde. Electrolytes, autoscale, and 64 CUs in a bottle. The label says not to drink it standing on a capacity, which is everywhere.",
again: 'You already have the CapacityAde. One bottle. Do not drink it. I know you will.',
// policy (keep-items.ts)
blurb: 'An incremental refresh policy. Laminated. Someone laminated a policy, and that someone was you.',
again: 'You already have the policy. It was on a lectern; now it is in your pocket. Sir Cardinality watched you take it and said nothing, one to many.',
```

- [ ] **Step 5: Milestones and the win**

`src/world/village.ts`, `village.jeff-mug` text: append ` Jeff gets promoted to Senior Finance. He mentors a junior analyst, also named Jeff. He develops a severe DAX problem and blames you for never being there.` (Task F2 made this text a function; keep the curse prefix). `src/world/globals.ts`, `global.wear-hoodie` text becomes `(s) => \`You pull on the Hoodie of Spark. You look like a Data Engineer. You have never written a notebook in your life. Nobody can tell. Now you're lookin' like a serious Engineer, ${nick(s)}.\``. `src/world/peaks.ts`, `ENDING`: replace the final `\n\nTHE END.` with `\n\nCongratulations. You won. Nobody's ever gotten the Model down the mountain, and you did it with a Pro license. Way to go.\n\nTHE END.`.

- [ ] **Step 6: Run everything and commit**

Run: `npx tsc -b && npm test && npm run lint:world` — Expected: green.

```bash
git add src/world/types.ts src/engine/builtins.ts src/world/items.ts src/world/keep-items.ts src/world/village.ts src/world/globals.ts src/world/peaks.ts src/world/lint.ts tests/voice-items.test.ts
git commit -m "voice: every gettable item remembers being taken and has an inventory blurb; epilogues; the sincere win"
```

---
## Phase F, the region sweeps (Tasks F4–F11)

Every sweep task has the same shape. Read this block once; each task below lists only what is specific to it.

**Procedure for every sweep:**
1. Read the voice skill (`SKILL.md`, `reference/response-patterns.md`, `reference/humor-taxonomy.md`, `reference/adapting-to-any-domain.md`) and `.superpowers/voice-pass-doc.md`. Then read every line in the region's world file(s) against the skill's checklist.
2. Write the failing test listed in the task (it pins the lines the plan writes; the sweep adds more in the same voice).
3. Add the plan's lines, then keep going until the quota is met: **at least 25 new lines in the region**, of which **at least a third are under nine words**; **one derailment per NPC** in the region (an `ask <npc> about <topic>` rule for a topic the NPC cares about, in the "Canon derailments" shapes); **at least one allusion** from `ALLUSIONS`; **each of the three `MALAPROPS` used verbatim at least once**; **at least one `BRANDS` entry**; a **gag command** on at least one object per room; a **backstory** line somewhere. ADD-mode: no existing line is removed or reworded (the §5.3 list was Task D1's and is done).
4. Mechanics available to a sweep (no engine work): room `rules` (`when`/`then`), room-scoped `PhraseRule`s in the region's `*_PHRASES` list (or a new `<REGION>_PHRASES` list registered before `KEEP_PHRASES`, the order stated in the task), `poke()` pools in `fortress.ts`, `Item.describe` functions, `Npc.talkMore` branches, `vary(s, pool)` for rotation, `nick(s)` for vocatives, `MALAPROPS.*`, `BRANDS`, `ALLUSIONS`.
5. Write `.superpowers/voice/<region>-report.md`: a table with one row per added line — `command · room · line · joke move (from humor-taxonomy.md) · words` — then the counts (lines added, share under nine words, derailments, allusions used, malaprops used, brands used) and a list of every existing line you were tempted to change and did not. The reviewer reads the report against the checklist, not just the diff.
6. Run `npx tsc -b && npm test && npm run lint:world`; commit with the message given.

Each task's **Interfaces** block names the new rule/phrase ids so the cheat sheet (Task H1) and the harness (Task F12) find them.

---

### Task F4: Region sweep — the village (cottage, square, mill, fields)

**Files:**
- Modify: `src/world/village.ts`, `src/world/npcs.ts`, `src/world/items.ts`
- Create: `.superpowers/voice/village-report.md`
- Test: `tests/voice-sweep-village.test.ts`

**Interfaces:**
- Produces: rules `cottage.use-mug`, `square.jeff-report`, `square.give-lanyard-jeff`, `square.say-dax`, `mill.miller-gen2`, `mill.sit-chest`, `fields.manual-refresh`; phrases `village.well-jump` (Square), `fields.scare-crows` in a new `export const VILLAGE_PHRASES: PhraseRule[]` in `village.ts`, registered right after `WORKSPACE_PHRASES`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/voice-sweep-village.test.ts
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { MALAPROPS } from '../src/world/voice';

const one = (room: string, cmd: string, inventory: string[] = ['license']) => step({ ...newGame(WORLD, 3), room, inventory }, cmd, WORLD).output[0]!;

describe('village sweep', () => {
  it('cottage', () => {
    expect(one('village.cottage', 'use mug', ['license', 'mug'])).toBe(`You drink from the mug. It has been empty since the last refresh. You feel ${MALAPROPS.refreshered}. You are not.`);
    expect(one('village.cottage', 'look at desk')).toMatch(/the pie chart you made in 2014\. It is still on the intranet\.$/);
  });
  it('square', () => {
    expect(one('village.square', 'ask jeff about the report')).toBe("'The report,' says Jeff. 'The report says 4.2. I say 4.7. We've agreed to disagree. By which I mean I've disagreed.'");
    expect(one('village.square', 'give lanyard to jeff', ['license', 'lanyard'])).toMatch(/'FabCon,' he says, reverently\. 'They had Excel there\.'/);
    expect(one('village.square', 'say dax')).toBe(`You say 'DAX' in the square. Jeff flinches like a man who has been ${MALAPROPS.daxxed} before.`);
    expect(one('village.square', 'jump in well')).toBe("You lean over the Q&A Well. It asks you a question first: 'Did you mean: Sales by Region?' You did not. You back away.");
    expect(one('village.square', 'look at board')).toMatch(/Someone has drawn Clippy in the corner\. It looks like it's writing a measure\.$/);
  });
  it('mill', () => {
    expect(one('village.mill', 'ask miller about gen2')).toBe("'Gen2? Gen2 is Gen1 with a haircut,' says the Miller. 'No. Wait. It's the other way. Gen1's the one with the haircut.' (You see where this is going.)");
    expect(one('village.mill', 'use chest')).toBe('You sit on the chest. The Miller sits on the other end. Neither of you says anything for a scheduled interval.');
    expect(one('village.mill', 'look at wheel')).toMatch(/Dataflows Gen1 Classic — the taste you remember\.$/);
  });
  it('fields', () => {
    expect(one('village.fields', 'ask manual about refresh')).toBe('Manual does not answer. A crow lands on him, refreshes, and fails. He is very proud of the crow.');
    expect(one('village.fields', 'scare the crows')).toBe('You flap your arms at the crows. They were not here for the refreshes. They were here for you. They leave, disappointed.');
    expect(one('village.fields', 'look at manual')).toMatch(/You were a scarecrow once, in a school play\. You formatted the programme\.$/);
    expect(one('village.fields', 'get refresh')).toMatch(/Not enough capacitude/);
  });
});
```

- [ ] **Step 2: Run to see it fail** — `npx vitest run tests/voice-sweep-village.test.ts` — Expected: FAIL.

- [ ] **Step 3: The plan's lines**

`src/world/village.ts` (import `MALAPROPS` from `'./voice'`):
- Cottage rules: `{ id: 'cottage.use-mug', when: { verb: 'use', noun: ['mug', 'coffee mug', 'cup'], has: ['mug'] }, then: { text: \`You drink from the mug. It has been empty since the last refresh. You feel ${MALAPROPS.refreshered}. You are not.\`, outcome: 'snark' } }` (before `global.drink-mug` would matter only for `drink`; this is `use`).
- Square rules (before `village.jeff-yes`): `{ id: 'square.jeff-report', when: { verb: 'talk', noun: JEFF, noun2: ['report', 'the report', 'numbers'] }, then: { text: "'The report,' says Jeff. 'The report says 4.2. I say 4.7. We've agreed to disagree. By which I mean I've disagreed.'", outcome: 'success' } }`; `{ id: 'square.say-dax', when: { verb: 'say', noun: ['dax', 'daxx'] }, then: { text: \`You say 'DAX' in the square. Jeff flinches like a man who has been ${MALAPROPS.daxxed} before.\`, outcome: 'snark' } }`; in `jeffGifts()` add `{ id: \`${prefix}.give-lanyard-jeff\`, when: { verb: 'give', noun: ['lanyard', 'fabcon lanyard', 'conference lanyard', 'badge'], noun2: JEFF, has: ['lanyard'], flags }, then: { text: "Jeff puts on the lanyard. 'FabCon,' he says, reverently. 'They had Excel there.' He hands it back, changed.", outcome: 'snark' } }`.
- Mill rules: `{ id: 'mill.miller-gen2', when: { verb: 'talk', noun: ['miller', 'old miller', 'old man', 'the miller'], noun2: ['gen2', 'gen 2', 'dataflow gen2', 'gen1', 'gen 1'] }, then: { text: "'Gen2? Gen2 is Gen1 with a haircut,' says the Miller. 'No. Wait. It's the other way. Gen1's the one with the haircut.' (You see where this is going.)", outcome: 'success' } }` (first among the mill's rules, so it beats `village.credentials`); `{ id: 'mill.sit-chest', when: { verb: 'use', noun: ['chest', 'credentials chest'] }, then: { text: 'You sit on the chest. The Miller sits on the other end. Neither of you says anything for a scheduled interval.', outcome: 'fail' } }`.
- Fields rules: `{ id: 'fields.manual-refresh', when: { verb: 'talk', noun: ['manual', 'scarecrow', 'scarecrow named manual'], noun2: ['refresh', 'refreshes', 'the refresh', 'crops'] }, then: { text: 'Manual does not answer. A crow lands on him, refreshes, and fails. He is very proud of the crow.', outcome: 'success' } }`; `fields.get-refresh` text gains ` Not enough capacitude.` at the end.
- `export const VILLAGE_PHRASES: PhraseRule[] = [ { id: 'village.well-jump', room: 'village.square', test: /^(jump|climb|dive|leap) (in|into|down)( the)? well$/, text: "You lean over the Q&A Well. It asks you a question first: 'Did you mean: Sales by Region?' You did not. You back away." }, { id: 'fields.scare-crows', room: 'village.fields', test: /^(scare|shoo|chase)( the| away the)? (crows|birds|crow)( away)?$/, text: 'You flap your arms at the crows. They were not here for the refreshes. They were here for you. They leave, disappointed.' } ];` registered in `src/world/index.ts` right after `WORKSPACE_PHRASES`.

`src/world/items.ts`: `desk` describe gains ` Next to those, the pie chart you made in 2014. It is still on the intranet.`; `board` describe gains ` Someone has drawn Clippy in the corner. It looks like it's writing a measure.`; `wheel` describe gains ` A plaque reads: Dataflows Gen1 Classic — the taste you remember.` `src/world/npcs.ts`: Manual's describe gains ` You were a scarecrow once, in a school play. You formatted the programme.`

- [ ] **Step 4: Meet the quota and write the report** (see the sweep procedure). Then:

- [ ] **Step 5: Run and commit**

```bash
git add src/world/village.ts src/world/npcs.ts src/world/items.ts src/world/index.ts .superpowers/voice/village-report.md tests/voice-sweep-village.test.ts
git commit -m "voice sweep: the village"
```

---

### Task F5: Region sweep — the lake and the swamp

**Files:**
- Modify: `src/world/lake.ts`, `src/world/items.ts`, `src/world/npcs.ts`
- Create: `.superpowers/voice/lake-swamp-report.md`
- Test: `tests/voice-sweep-lake.test.ts`

**Interfaces:**
- Produces: rules `lake.ferryman-lake`, `lake.island-plinth`, `lake.house.mailbox`, `swamp.name-columns`, `swamp.use-log`, `swamp.read-signpost`; phrases `lake.throw-pebble` (shore), `lake.sit-boat` (dock) appended to `LAKEHOUSE_PHRASES` (renamed in spirit, same list; order unchanged).

- [ ] **Step 1: Write the failing test**

```ts
// tests/voice-sweep-lake.test.ts
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { MALAPROPS } from '../src/world/voice';

const one = (room: string, cmd: string, inventory: string[] = ['license']) => step({ ...newGame(WORLD, 3), room, inventory }, cmd, WORLD).output[0]!;

describe('lake + swamp sweep', () => {
  it('shore, dock, island, house', () => {
    const r = step({ ...newGame(WORLD, 3), room: 'lake.shore', inventory: ['license', 'pebble'] }, 'throw pebble', WORLD);
    expect(r.output[0]).toMatch(/^Skip\. Skip\. Sink\./); expect(r.state.inventory).not.toContain('pebble');
    expect(one('lake.dock', 'ask ferryman about the lake')).toBe("He mouths: 'ONE.' Then, more slowly: 'LAKE.' He holds up one finger. Then, after thought, no more fingers.");
    expect(one('lake.dock', 'sit in boat')).toBe('You sit in the boat. It does not move. Neither does the Ferryman. You are all OFFLINE together, which is almost company.');
    expect(one('lake.dock', 'look at timetable')).toMatch(/Sponsored by Refreshr™\.$/);
    expect(one('lake.island', 'use plinth')).toBe("You put your hand in the STANDARD hollow. It fits. Everyone fits. That is what shared means. The PERSONAL hollow has no capacitude for that.");
    expect(one('lake.house', 'open mailbox')).toBe('One new CSV. It has been in there since bronze. You leave it; the mailbox is also a Lakehouse, legally.');
    expect(one('lake.house', 'use chair')).toMatch(/It is the Windows XP hill with a deck chair on it\.$/);
  });
  it('bronze, silver, gold', () => {
    expect(one('swamp.bronze', 'name the columns')).toBe('You name Column1. It becomes Column1 (2). The marsh applauds, unstructured.');
    expect(one('swamp.bronze', 'look')).toMatch(/Your first semantic model was one table\. It still is\. It is somewhere under here\./);
    expect(one('swamp.silver', 'use log')).toMatch(/^You open a transaction log\. It knows exactly what happened\. It knows what you did on turn \d+, too, and filed it next to your Hotmail password\.$/);
    expect(one('swamp.silver', 'drink water')).toMatch(new RegExp(`You feel ${MALAPROPS.refreshered}\\.$`));
    expect(one('swamp.gold', 'read signpost')).toBe("SHORTCUT, it says, pointing everywhere at once. Below: 'no data was moved.' Below that, smaller: 'no data was moved.'");
    expect(one('swamp.gold', 'look')).toMatch(new RegExp(`Nothing here has been ${MALAPROPS.daxxed} yet\\. Give it time\\.`));
  });
});
```

- [ ] **Step 2: Run to see it fail** — `npx vitest run tests/voice-sweep-lake.test.ts`.

- [ ] **Step 3: The plan's lines**

`src/world/lake.ts` (import `MALAPROPS`):
- `LAKEHOUSE_PHRASES` gains `{ id: 'lake.throw-pebble', room: 'lake.shore', test: /^(throw|toss|chuck|skim) (the )?(pebble|stone|skipping stone)( (in|into|at|on) (the )?(lake|onelake|water))?$/, text: '', then: (s) => (s.inventory.includes('pebble') ? { id: 'lake.skip-pebble', then: SKIP } : { id: 'lake.no-pebble', then: { text: 'You mime a throw. The OneLake is not fooled; it has seen every mime.', outcome: 'fail' } }) }` and `{ id: 'lake.sit-boat', room: 'lake.dock', test: /^(sit|get|climb|hop) (in|into|on|onto|aboard)( the)? (boat|ferry|gateway)$/, text: 'You sit in the boat. It does not move. Neither does the Ferryman. You are all OFFLINE together, which is almost company.' }` (the dock gate phrase covers `enter boat`; `sit in boat` parses to `sit`, which the gate does not claim).
- Dock rules: `{ id: 'lake.ferryman-lake', when: { verb: 'talk', noun: FERRY_NOUNS, noun2: ['lake', 'onelake', 'the lake', 'water', 'one lake'] }, then: { text: "He mouths: 'ONE.' Then, more slowly: 'LAKE.' He holds up one finger. Then, after thought, no more fingers.", outcome: 'success' } }` (first in the dock's rules).
- Island: `{ id: 'lake.island-plinth', when: { verb: 'use', noun: ['plinth', 'stone plinth', 'hollow', 'hollows'] }, then: { text: \`You put your hand in the STANDARD hollow. It fits. Everyone fits. That is what shared means. The PERSONAL hollow has no ${MALAPROPS.capacitude} for that.\`, outcome: 'fail' } }`.
- Lake House: `{ id: 'lake.house.mailbox', when: { verb: 'open', noun: ['mailbox', 'mail box', 'post box'] }, then: { text: 'One new CSV. It has been in there since bronze. You leave it; the mailbox is also a Lakehouse, legally.', outcome: 'fail' } }`; `lake.house.sit` text gains ` It is the Windows XP hill with a deck chair on it.`
- Bronze: describe gains ` Your first semantic model was one table. It still is. It is somewhere under here.`; rule `{ id: 'swamp.name-columns', when: { verb: 'use', verbWord: ['label', 'mark', 'fix', 'format'], noun: ['columns', 'column', 'column1', 'the columns'] }, then: { text: 'You name Column1. It becomes Column1 (2). The marsh applauds, unstructured.', outcome: 'snark' } }` plus a phrase in `LAKEHOUSE_PHRASES` `{ id: 'swamp.name-columns-words', room: 'swamp.bronze', test: /^(name|rename|type)( the)? columns?$/, text: 'You name Column1. It becomes Column1 (2). The marsh applauds, unstructured.' }`.
- Silver: `{ id: 'swamp.use-log', when: { verb: 'use', noun: ['log', 'delta log', '_delta_log', 'transaction log', 'logs', 'json'] }, then: { text: (s) => \`You open a transaction log. It knows exactly what happened. It knows what you did on turn ${s.turns}, too, and filed it next to your Hotmail password.\`, outcome: 'snark' } }`; `swamp.drink-silver` text gains ` You feel ${MALAPROPS.refreshered}.`
- Gold: describe gains ` Nothing here has been ${MALAPROPS.daxxed} yet. Give it time.` (before the signpost sentence); rule `{ id: 'swamp.read-signpost', when: { verb: 'read', noun: ['shortcut', 'signpost', 'sign', 'onelake shortcut', 'pointer'] }, then: { text: "SHORTCUT, it says, pointing everywhere at once. Below: 'no data was moved.' Below that, smaller: 'no data was moved.'", outcome: 'success' } }`.
- `src/world/items.ts`: `timetable` describe gains ` Sponsored by Refreshr™.`

- [ ] **Step 4: Meet the quota and write the report.**

- [ ] **Step 5: Run and commit**

```bash
git add src/world/lake.ts src/world/items.ts src/world/npcs.ts .superpowers/voice/lake-swamp-report.md tests/voice-sweep-lake.test.ts
git commit -m "voice sweep: the lake and the swamp"
```

---

### Task F6: Region sweep — the Keep

**Files:**
- Modify: `src/world/fortress.ts`, `src/world/keep-items.ts`, `src/world/npcs.ts`
- Create: `.superpowers/voice/keep-report.md`
- Test: `tests/voice-sweep-keep.test.ts`

**Interfaces:**
- Produces: rules `fortress.guard-moat`, `fortress.duke-sql`, `fortress.cardinality-m2m`, `fortress.card-jeff`, `fortress.say-dax-word`; phrases `fortress.fish-moat` (gate), `fortress.eat-pie` (studio) in `KEEP_PHRASES` (room-scoped; before the region-wide lines).

- [ ] **Step 1: Write the failing test**

```ts
// tests/voice-sweep-keep.test.ts
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { MALAPROPS } from '../src/world/voice';

const one = (room: string, cmd: string, flags: Record<string, boolean | number> = {}) => step({ ...newGame(WORLD, 3), room, flags }, cmd, WORLD).output[0]!;

describe('Keep sweep', () => {
  it('gate and hall', () => {
    expect(one('fortress.bridge', 'ask guard about the moat')).toBe("'The moat?' The guard looks down. 'That's the Warehouse. We built the Keep on it. Don't tell the Duke I said Warehouse.' He tells the Duke himself, later, in the log.");
    expect(one('fortress.bridge', 'fish in the moat')).toBe("You fish in the Moat of T-SQL. You catch a stored procedure. It has 400 lines and a comment that says 'temporary'. You release it.");
    expect(one('fortress.bridge', 'say f2')).toMatch(/Not enough capacitude\.$/);
    expect(one('fortress.hall', 'look at portraits')).toMatch(/a paperclip with eyes\. 'It looks like you're writing a measure\.'$/);
  });
  it('model view, chamber, studio', () => {
    expect(one('fortress.model', 'ask cardinality about many to many')).toBe("'Many to many,' says Sir Cardinality. 'Is a relationship. Like yours with the truth.'");
    expect(one('fortress.model', 'use date table')).toMatch(new RegExp(`Time intelligence feels ${MALAPROPS.refreshered}\\.$`));
    expect(one('fortress.throne', 'ask duke about sql')).toBe("'SQL,' says the Duke, and then, to himself, 'EVALUATE.' Then, quieter, 'SELECT.' He has caught himself. He will not forgive himself.");
    expect(one('fortress.throne', 'say dax')).toBe(`You say 'DAX' to the Duke of DAX. He says nothing. You have been ${MALAPROPS.daxxed}; it feels like a filter you cannot see.`);
    expect(one('fortress.yard', 'ask card about jeff')).toBe('The Card shows (Jeff). Then (Blank). It has no relationship to Jeff; nobody does.');
    expect(one('fortress.yard', 'eat the pie')).toBe("You eat a slice. It is 'Other'. It tastes like the other eleven 'Other's.");
    expect(one('fortress.yard', 'look at refresh')).toMatch(/A logo on the bar: Refreshr™\./);
  });
});
```

- [ ] **Step 2: Run to see it fail** — `npx vitest run tests/voice-sweep-keep.test.ts`.

- [ ] **Step 3: The plan's lines**

`src/world/fortress.ts` (import `MALAPROPS`):
- Gate rules (first): `{ id: 'fortress.guard-moat', when: { verb: 'talk', noun: GUARD, noun2: ['moat', 'the moat', 'warehouse', 'water'] }, then: { text: "'The moat?' The guard looks down. 'That's the Warehouse. We built the Keep on it. Don't tell the Duke I said Warehouse.' He tells the Duke himself, later, in the log.", outcome: 'success' } }`; `fortress.sku-f2` text gains ` Not enough ${MALAPROPS.capacitude}.`
- Model View (before `fortress.date-table-again`): `{ id: 'fortress.cardinality-m2m', when: { verb: 'talk', noun: CARDINALITY, noun2: ['many to many', 'm2m', 'bidirectional', 'both'] }, then: { text: "'Many to many,' says Sir Cardinality. 'Is a relationship. Like yours with the truth.'", outcome: 'success' } }`; `fortress.date-table` text gains ` Time intelligence feels ${MALAPROPS.refreshered}.`
- Chamber (before the DAX rules): `{ id: 'fortress.duke-sql', when: { verb: 'talk', noun: DUKE, noun2: ['sql', 't sql', 'tsql', 'the moat', 'moat', 'warehouse'] }, then: { text: "'SQL,' says the Duke, and then, to himself, 'EVALUATE.' Then, quieter, 'SELECT.' He has caught himself. He will not forgive himself.", outcome: 'success' } }`; `{ id: 'fortress.say-dax-word', when: { verb: 'say', noun: ['dax'] }, then: { text: \`You say 'DAX' to the Duke of DAX. He says nothing. You have been ${MALAPROPS.daxxed}; it feels like a filter you cannot see.\`, outcome: 'snark', set: { 'duke.wrong': (v) => Math.min(3, (Number(v) || 0) + 1) } } }`.
- Studio (before `fortress.talk-card`): `{ id: 'fortress.card-jeff', when: { verb: 'talk', noun: CARD, noun2: ['jeff', 'finance', 'jeff from finance'] }, then: { text: 'The Card shows (Jeff). Then (Blank). It has no relationship to Jeff; nobody does.', outcome: 'success' } }`.
- `KEEP_PHRASES` (room-scoped, before the region-wide block): `{ id: 'fortress.fish-moat', room: 'fortress.bridge', test: /^(fish|go fishing|cast)( a line)?( (in|into|from))?( the)? ?(moat|moat of t sql|water)?$/, text: "You fish in the Moat of T-SQL. You catch a stored procedure. It has 400 lines and a comment that says 'temporary'. You release it." }`; `{ id: 'fortress.eat-pie', room: STUDIO, test: /^(eat|taste|bite)( a slice of| the| a)? pie( chart)?$/, text: "You eat a slice. It is 'Other'. It tastes like the other eleven 'Other's." }`.
- `src/world/keep-items.ts`: `portraits` describe gains ` In the corner of the Source portrait, a paperclip with eyes. 'It looks like you're writing a measure.'`; `refresh` describe (the 97% branch) gains ` A logo on the bar: Refreshr™.`

- [ ] **Step 4: Meet the quota and write the report.**

- [ ] **Step 5: Run and commit**

```bash
git add src/world/fortress.ts src/world/keep-items.ts src/world/npcs.ts .superpowers/voice/keep-report.md tests/voice-sweep-keep.test.ts
git commit -m "voice sweep: the Keep"
```

---

### Task F7: Region sweep — the Monastery (gate, cloister, spark chamber, library)

**Files:**
- Modify: `src/world/monastery.ts`, `src/world/items.ts`, `src/world/npcs.ts`, `src/world/index.ts`
- Create: `.superpowers/voice/monastery-report.md`
- Test: `tests/voice-sweep-monastery.test.ts`

**Interfaces:**
- Produces: rules `monastery.monk-session`, `monastery.abbot-pandas`, `monastery.pandas-spark`, `monastery.librarian-synapse`, `monastery.say-dax-library`; `export const MONASTERY_PHRASES: PhraseRule[]` (`monastery.count`, `monastery.chant`, `monastery.eat-bamboo`, `monastery.shh`) registered right after `VILLAGE_PHRASES`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/voice-sweep-monastery.test.ts
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { MALAPROPS } from '../src/world/voice';

const one = (room: string, cmd: string, inventory: string[] = ['license']) => step({ ...newGame(WORLD, 3), room, inventory }, cmd, WORLD).output[0]!;

describe('Monastery sweep', () => {
  it('gate and cloister', () => {
    expect(one('monastery.gate', 'ask monk about the session')).toBe('The monk points at the bar. Then at the sky. Then at the bar. It is a lineage view.');
    expect(one('monastery.gate', 'count to three')).toBe('One. Two. The session hears you counting and restarts.');
    expect(one('monastery.cloister', 'ask abbot about pandas')).toBe("'Brother Pandas,' says the Abbot, 'was a Data Scientist. Then he was a Data Engineer. Then he was a Pandas. It happens gradually and then all at once.'");
    expect(one('monastery.cloister', 'chant')).toBe("You chant 'spark dot read' with the monks. You get the rhythm wrong. Three monks fall out of the loop. The Abbot restarts them.");
    expect(one('monastery.cloister', 'look at floor')).toMatch(new RegExp(`${MALAPROPS.refreshered} themselves into a circle\\.$`));
  });
  it('spark chamber and library', () => {
    expect(one('monastery.spark', 'ask pandas about spark')).toBe("'Spark,' says Brother Pandas. 'It's not broken, it's deprecated.' 'It's broken.' 'Deprecated.' 'Broken.' (You see where this is going.)");
    expect(one('monastery.spark', 'eat bamboo', ['license', 'bamboo'])).toBe("You eat Brother Pandas' lunch. It is a dependency. Something downstream fails.");
    expect(one('monastery.library', 'ask librarian about synapse')).toBe("'Synapse,' she says, and looks at the roped-off wing the way you look at a photo of a house you sold. 'Still supported.' She does not say by whom.");
    expect(one('monastery.library', 'shh')).toBe("'Shh,' she says back, faster. She has been waiting.");
    expect(one('monastery.library', 'say dax')).toBe(`'No DAX in the Library,' says the Librarian. 'Shh.' You have been ${MALAPROPS.daxxed} and shushed.`);
    expect(one('monastery.library', 'look')).toMatch(/A bookmark from Encarta holds someone's place in Runtime 1\.1\./);
    expect(one('monastery.gate', 'look at gate')).toMatch(/Not enough capacitude to hurry it\.$/);
  });
});
```

- [ ] **Step 2: Run to see it fail** — `npx vitest run tests/voice-sweep-monastery.test.ts`.

- [ ] **Step 3: The plan's lines**

`src/world/monastery.ts` (import `MALAPROPS`):
- Gate (first rule): `{ id: 'monastery.monk-session', when: { verb: 'talk', noun: MONK, noun2: ['session', 'the session', 'spark session', 'progress bar', 'bar'] }, then: { text: 'The monk points at the bar. Then at the sky. Then at the bar. It is a lineage view.', outcome: 'success' } }`.
- Cloister (before `monastery.hoodie`): `{ id: 'monastery.abbot-pandas', when: { verb: 'talk', noun: ABBOT, noun2: ['pandas', 'brother pandas', 'brother'] }, then: { text: "'Brother Pandas,' says the Abbot, 'was a Data Scientist. Then he was a Data Engineer. Then he was a Pandas. It happens gradually and then all at once.'", outcome: 'success' } }`.
- Spark (first): `{ id: 'monastery.pandas-spark', when: { verb: 'talk', noun: PANDAS, noun2: ['spark', 'pyspark', 'the session', 'session', 'notebook'] }, then: { text: "'Spark,' says Brother Pandas. 'It's not broken, it's deprecated.' 'It's broken.' 'Deprecated.' 'Broken.' (You see where this is going.)", outcome: 'success' } }`.
- Library (first): `{ id: 'monastery.librarian-synapse', when: { verb: 'talk', noun: LIBRARIAN, noun2: ['synapse', 'the synapse wing', 'wing', 'runtime'] }, then: { text: "'Synapse,' she says, and looks at the roped-off wing the way you look at a photo of a house you sold. 'Still supported.' She does not say by whom.", outcome: 'success' } }`; `{ id: 'monastery.say-dax-library', when: { verb: 'say', noun: ['dax'] }, then: { text: \`'No DAX in the Library,' says the Librarian. 'Shh.' You have been ${MALAPROPS.daxxed} and shushed.\`, outcome: 'snark' } }`; the library describe gains ` A bookmark from Encarta holds someone's place in Runtime 1.1.`
- `export const MONASTERY_PHRASES: PhraseRule[] = [ { id: 'monastery.count', room: 'monastery.gate', test: /^count( to (three|3|ten|10))?$/, text: 'One. Two. The session hears you counting and restarts.' }, { id: 'monastery.chant', room: 'monastery.cloister', test: /^(chant|join (the )?(monks|loop|circle)|spark dot read)$/, text: "You chant 'spark dot read' with the monks. You get the rhythm wrong. Three monks fall out of the loop. The Abbot restarts them." }, { id: 'monastery.eat-bamboo', room: 'monastery.spark', test: /^(eat|bite|chew)( the)? (bamboo|shoot|lunch)$/, text: "You eat Brother Pandas' lunch. It is a dependency. Something downstream fails." }, { id: 'monastery.shh', room: 'monastery.library', test: /^(shh+|shush|quiet|be quiet)$/, text: "'Shh,' she says back, faster. She has been waiting." } ];` registered in `src/world/index.ts` right after `VILLAGE_PHRASES`.
- `src/world/items.ts`: `floor` describe gains ` The monks have ${MALAPROPS.refreshered} themselves into a circle.` (import `MALAPROPS`); `gate` describe (the closed branch) gains ` Not enough ${MALAPROPS.capacitude} to hurry it.`

- [ ] **Step 4: Meet the quota and write the report.**

- [ ] **Step 5: Run and commit**

```bash
git add src/world/monastery.ts src/world/items.ts src/world/npcs.ts src/world/index.ts .superpowers/voice/monastery-report.md tests/voice-sweep-monastery.test.ts
git commit -m "voice sweep: the Monastery"
```

---

### Task F8: Region sweep — the Peaks

**Files:**
- Modify: `src/world/peaks.ts`, `src/world/items.ts`, `src/world/npcs.ts`
- Create: `.superpowers/voice/peaks-report.md`
- Test: `tests/voice-sweep-peaks.test.ts`

**Interfaces:**
- Produces: rules `peaks.dragon-model`, `peaks.use-carabiner`, `peaks.reach-model`; item `pedestal` (Shrine); phrases `peaks.climb`, `peaks.pay` appended to `PEAKS_PHRASES` (order unchanged).

- [ ] **Step 1: Write the failing test**

```ts
// tests/voice-sweep-peaks.test.ts
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { MALAPROPS } from '../src/world/voice';

const one = (room: string, cmd: string, inventory: string[] = ['license']) => step({ ...newGame(WORLD, 3), room, inventory }, cmd, WORLD).output[0]!;

describe('Peaks sweep', () => {
  it('foothills, pass, ledge', () => {
    expect(one('peaks.foothills', 'climb the mountain')).toBe('You climb. The mountain bills you per vertical second. You stop at the first ledge to check the invoice.');
    expect(one('peaks.foothills', 'look at sign')).toMatch(new RegExp(`BRING ${MALAPROPS.capacitude.toUpperCase()}\\.$`));
    expect(one('peaks.pass', 'pay')).toBe('You try to pay the receipt. The Pass accepts Capacity Units only. You have a Pro license and, at this altitude, opinions.');
    expect(one('peaks.pass', 'look')).toMatch(/The wind sounds like an MSN Messenger nudge\./);
    expect(one('peaks.ledge', 'use carabiner', ['license', 'carabiner'])).toBe('You clip the carabiner to yourself. Rated F64. You are, at best, F2.');
    expect(one('peaks.ledge', 'look at door')).toMatch(new RegExp(`The door ${MALAPROPS.refreshered} its sigils while you were not looking\\.$`));
  });
  it('shrine', () => {
    expect(one('peaks.shrine', 'ask throttlor about the model')).toBe("'The model,' says Throttlor, 'is one table.' He pauses. 'I mean. It's golden. It's ONE golden table.' He looks at the pedestal. 'Don't look inside.'");
    expect(one('peaks.shrine', 'use model')).toBe('You reach past a dragon for the Model. He clears his throat, in smoke.');
    expect(one('peaks.shrine', 'look at pedestal')).toBe('A pedestal, plinth-grade. It has held the Model since the last capacity outage; before that, it held a different Model, also golden, also one table.');
    expect(one('peaks.shrine', 'say calculate')).toMatch(new RegExp(`You have been ${MALAPROPS.daxxed} by a dragon\\. Add it to the bill\\.$`));
  });
});
```

- [ ] **Step 2: Run to see it fail** — `npx vitest run tests/voice-sweep-peaks.test.ts`.

- [ ] **Step 3: The plan's lines**

`src/world/peaks.ts` (import `MALAPROPS`):
- `PEAKS_PHRASES` gains `{ id: 'peaks.climb', room: 'peaks.foothills', test: /^(climb|scale|ascend)( the| up the)? (mountain|peaks?|capacity peaks)$/, text: 'You climb. The mountain bills you per vertical second. You stop at the first ledge to check the invoice.' }` and `{ id: 'peaks.pay', room: 'peaks.pass', test: /^(pay|pay (the )?(receipt|bill)|settle up)$/, text: 'You try to pay the receipt. The Pass accepts Capacity Units only. You have a Pro license and, at this altitude, opinions.' }`.
- Pass describe gains ` The wind sounds like an MSN Messenger nudge.`
- Ledge rule: `{ id: 'peaks.use-carabiner', when: { verb: 'use', noun: ['carabiner', 'clip', 'karabiner'], has: ['carabiner'] }, then: { text: 'You clip the carabiner to yourself. Rated F64. You are, at best, F2.', outcome: 'fail' } }` (after `peaks.carabiner-door`).
- Shrine rules (before `peaks.talk-dragon`): `{ id: 'peaks.dragon-model', when: { verb: 'talk', noun: DRAGON, noun2: ['model', 'the model', 'golden semantic model', 'semantic model'], flags: DRAGON_THERE }, then: { text: "'The model,' says Throttlor, 'is one table.' He pauses. 'I mean. It's golden. It's ONE golden table.' He looks at the pedestal. 'Don't look inside.'", outcome: 'success' } }`; `{ id: 'peaks.reach-model', when: { verb: 'use', noun: MODEL, flags: DRAGON_THERE }, then: { text: 'You reach past a dragon for the Model. He clears his throat, in smoke.', outcome: 'fail' } }`; `peaks.dragon-calculate` text gains ` You have been ${MALAPROPS.daxxed} by a dragon. Add it to the bill.`; Shrine `items: ['model', 'pedestal']`.
- `src/world/items.ts`: `item({ id: 'pedestal', name: 'pedestal', aliases: ['plinth', 'stand', 'altar'], takeable: false, untakeableText: 'The pedestal holds the Model. Take the Model; leave the furniture.', describe: 'A pedestal, plinth-grade. It has held the Model since the last capacity outage; before that, it held a different Model, also golden, also one table.' })`; `peaks sign` describe gains ` BRING ${MALAPROPS.capacitude.toUpperCase()}.`; `door` describe becomes `(s) => \`${sigilStatus(s)} The door ${MALAPROPS.refreshered} its sigils while you were not looking.\``.

- [ ] **Step 4: Meet the quota and write the report.**

- [ ] **Step 5: Run and commit**

```bash
git add src/world/peaks.ts src/world/items.ts src/world/npcs.ts .superpowers/voice/peaks-report.md tests/voice-sweep-peaks.test.ts
git commit -m "voice sweep: the Peaks"
```

---

### Task F9: Region sweep — Jeff's Excel

**Files:**
- Modify: `src/world/excel.ts`, `src/world/items.ts`
- Create: `.superpowers/voice/excel-report.md`
- Test: `tests/voice-sweep-excel.test.ts`

**Interfaces:**
- Produces: rules `excel.jeff-report` (Sheet1, before `excel.ask-jeff`), `excel.use-tissues`, `excel.use-ribbon`, `excel.add-measure`; phrases `excel.save`, `excel.cell-a1`, `excel.refresh-pivot`, `excel.format-pivot` appended to `EXCEL_PHRASES`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/voice-sweep-excel.test.ts
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { MALAPROPS } from '../src/world/voice';

const one = (room: string, cmd: string, flags: Record<string, boolean | number> = { 'sq.return': 1 }) => step({ ...newGame(WORLD, 3), room, flags }, cmd, WORLD).output[0]!;

describe('Excel sweep', () => {
  it('Sheet1', () => {
    expect(one('excel.sheet1', 'ask jeff about the report')).toBe("'The report,' says Jeff. 'It has a badge. I have a spreadsheet. A spreadsheet is a badge you make yourself.'");
    expect(one('excel.sheet1', 'use tissues')).toBe('You hand Jeff a tissue. He blows his nose into a printout of the total instead. It rounds up.');
    expect(one('excel.sheet1', 'save workbook')).toBe('Saved as Sales_export (4).csv. The (3) was the good one. It always is.');
    expect(one('excel.sheet1', 'look at cell a1')).toBe('Cell A1. Blinking. Somewhere in it, Clippy is composing a suggestion.');
    expect(one('excel.sheet1', 'look at export')).toMatch(new RegExp(`It has no more ${MALAPROPS.capacitude}\\.$`));
  });
  it('Data tab and pivot', () => {
    expect(one('excel.data', 'use ribbon')).toBe('You click the Home tab. Then Insert. Then Data. The ribbon has seen people wander before.');
    expect(one('excel.data', 'look at connection')).toMatch(/Powered by Refreshr™\./);
    const built = { 'sq.return': 1, 'excel.connected': true, 'excel.pivot': true };
    expect(one('excel.pivot', 'refresh', built)).toBe(`You refresh the pivot. It says the same number, but bolder. It feels ${MALAPROPS.refreshered}.`);
    expect(one('excel.pivot', 'format pivot', built)).toBe('You format the pivot. Banded rows. Jeff likes banded rows. The number is still wrong, now in stripes.');
    expect(one('excel.pivot', 'add measure', built)).toBe(`You add a measure to a pivot. You have ${MALAPROPS.daxxed} a spreadsheet. Jeff will never forgive you, and he will never notice.`);
  });
});
```

- [ ] **Step 2: Run to see it fail** — `npx vitest run tests/voice-sweep-excel.test.ts`.

- [ ] **Step 3: The plan's lines**

`src/world/excel.ts` (import `MALAPROPS`):
- Sheet1 rules, before `excel.ask-jeff`: `{ id: 'excel.jeff-report', when: { verb: 'talk', nounMatches: TALK_JEFF, noun2: ['report', 'the report', 'badge'] }, then: { text: "'The report,' says Jeff. 'It has a badge. I have a spreadsheet. A spreadsheet is a badge you make yourself.'", outcome: 'success' } }`; `{ id: 'excel.use-tissues', when: { verb: 'use', noun: ['tissue box', 'tissues', 'tissue', 'kleenex'] }, then: { text: 'You hand Jeff a tissue. He blows his nose into a printout of the total instead. It rounds up.', outcome: 'snark' } }`.
- Data tab rule: `{ id: 'excel.use-ribbon', when: { verb: 'use', noun: ['ribbon', 'toolbar', 'menu', 'tabs'] }, then: { text: 'You click the Home tab. Then Insert. Then Data. The ribbon has seen people wander before.', outcome: 'fail' } }` (`excel.data` needs `'ribbon'` in its `items`; add it).
- Pivot rule (after the build rules): `{ id: 'excel.add-measure', when: { verb: 'use', noun: ['measure', 'a measure', 'new measure', 'dax measure'] }, then: { text: \`You add a measure to a pivot. You have ${MALAPROPS.daxxed} a spreadsheet. Jeff will never forgive you, and he will never notice.\`, outcome: 'snark' } }`.
- `EXCEL_PHRASES` gains: `{ id: 'excel.save', region: 'excel', test: /^save( the)? (workbook|sheet|file|export|spreadsheet)$/, text: 'Saved as Sales_export (4).csv. The (3) was the good one. It always is.' }`, `{ id: 'excel.cell-a1', room: 'excel.sheet1', test: /^(look at|examine|x|click|select)( cell)? a1$/, text: 'Cell A1. Blinking. Somewhere in it, Clippy is composing a suggestion.' }`, `{ id: 'excel.refresh-pivot', room: 'excel.pivot', test: /^refresh( the| all| pivot| data)?( pivot)?$/, text: \`You refresh the pivot. It says the same number, but bolder. It feels ${MALAPROPS.refreshered}.\` }`, `{ id: 'excel.format-pivot', room: 'excel.pivot', test: /^(format|style|band)( the)? (pivot|pivot table|pivottable|rows)$/, text: 'You format the pivot. Banded rows. Jeff likes banded rows. The number is still wrong, now in stripes.' }`.
- `src/world/items.ts`: `export` describe gains ` It has no more ${MALAPROPS.capacitude}.`; `connection` describe (both branches) gains ` Powered by Refreshr™.`

- [ ] **Step 4: Meet the quota and write the report.**

- [ ] **Step 5: Run and commit**

```bash
git add src/world/excel.ts src/world/items.ts .superpowers/voice/excel-report.md tests/voice-sweep-excel.test.ts
git commit -m "voice sweep: Jeff's Excel"
```

---

### Task F10: Region sweep — Copilot

**Files:**
- Modify: `src/world/copilot.ts`, `src/world/items.ts`
- Create: `.superpowers/voice/copilot-report.md`
- Test: `tests/voice-sweep-copilot.test.ts`

**Interfaces:**
- Produces: phrases `copilot.thanks`, `copilot.who`, `copilot.are-you-ai`, `copilot.measure` (pane), `copilot.push-model` (gallery) appended to `COPILOT_PHRASES`; rules `copilot.talk-prompt` (pane), `copilot.lean-plinth`, `copilot.polish-badge` (gallery).

- [ ] **Step 1: Write the failing test**

```ts
// tests/voice-sweep-copilot.test.ts
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { MALAPROPS } from '../src/world/voice';

const one = (room: string, cmd: string) => step({ ...newGame(WORLD, 3), room, flags: { 'sq.return': 1 } }, cmd, WORLD).output[0]!;

describe('Copilot sweep', () => {
  it('the pane', () => {
    expect(one('copilot.pane', 'thanks')).toBe("Copilot: You're welcome! I've logged your gratitude as feedback. It will be reviewed.");
    expect(one('copilot.pane', 'who are you')).toBe("Copilot: I'm Copilot! I can help with data, questions, and, if you ask nicely, a sourdough starter.");
    expect(one('copilot.pane', 'are you an ai')).toBe("Copilot: I'm a large language model, but I'm also here for you. Mostly the first thing.");
    expect(one('copilot.pane', 'write a measure')).toBe(`Copilot: Here's a measure! It returns BLANK(). You have been ${MALAPROPS.daxxed} by a sparkle.`);
    expect(one('copilot.pane', 'talk to prompt box')).toBe('You talk to the prompt box. It listens beautifully. It is the best listener in the realm and it has never once heard you.');
    expect(one('copilot.pane', 'look')).toMatch(/A paperclip's silhouette in the corner of the sparkle\. It looks like it's writing a measure\./);
    expect(one('copilot.pane', 'look at sparkle')).toMatch(new RegExp(`It has ${MALAPROPS.capacitude} to spare and nothing to spend it on\\.$`));
  });
  it('the gallery', () => {
    expect(one('copilot.gallery', 'push the model')).toBe('You push the biggest model. It does not move. It has the most rows; it has the most everything except a badge.');
    expect(one('copilot.gallery', 'use plinth')).toBe('You lean on a plinth. The model on it recalculates a measure out of nerves.');
    expect(one('copilot.gallery', 'use badge')).toBe(`You polish the badge. The certified model feels ${MALAPROPS.refreshered}. It was already certified; now it is shiny.`);
    expect(one('copilot.gallery', 'look at final2')).toMatch(/Last refreshed via Refreshr™, personal mode\./);
  });
});
```

- [ ] **Step 2: Run to see it fail** — `npx vitest run tests/voice-sweep-copilot.test.ts`.

- [ ] **Step 3: The plan's lines**

`src/world/copilot.ts` (import `MALAPROPS`):
- `COPILOT_PHRASES` gains (pane-scoped; the pane skips global phrases, so these are the only way a non-prompt line is answered): `{ id: 'copilot.thanks', room: 'copilot.pane', test: /^(thanks|thank you|ty)( copilot)?[!.]?$/, text: "Copilot: You're welcome! I've logged your gratitude as feedback. It will be reviewed." }`, `{ id: 'copilot.who', room: 'copilot.pane', test: /^(who|what) are you\??$/, text: "Copilot: I'm Copilot! I can help with data, questions, and, if you ask nicely, a sourdough starter." }`, `{ id: 'copilot.are-you-ai', room: 'copilot.pane', test: /^are you (an? )?(ai|human|real|a robot|alive)\??$/, text: "Copilot: I'm a large language model, but I'm also here for you. Mostly the first thing." }`, `{ id: 'copilot.measure', room: 'copilot.pane', test: /^(write|add|create|make) (me )?(a |new )?(dax )?measure$/, text: \`Copilot: Here's a measure! It returns BLANK(). You have been ${MALAPROPS.daxxed} by a sparkle.\` }`, `{ id: 'copilot.push-model', room: 'copilot.gallery', test: /^(push|kick|move|shove|tip)( the| a)? (model|models|plinth|biggest model|final2|big one)$/, text: 'You push the biggest model. It does not move. It has the most rows; it has the most everything except a badge.' }`.
- Pane rules: `{ id: 'copilot.talk-prompt', when: { verb: 'talk', noun: ['prompt box', 'prompt', 'box', 'input', 'chat', 'sparkle'] }, then: { text: 'You talk to the prompt box. It listens beautifully. It is the best listener in the realm and it has never once heard you.', outcome: 'fail' } }` (the pane's `rules` array is empty today; this is its first). Pane describe gains ` A paperclip's silhouette in the corner of the sparkle. It looks like it's writing a measure.`
- Gallery rules: `{ id: 'copilot.lean-plinth', when: { verb: 'use', noun: ['plinth', 'plinths', 'models'] }, then: { text: 'You lean on a plinth. The model on it recalculates a measure out of nerves.', outcome: 'fail' } }`; `{ id: 'copilot.polish-badge', when: { verb: 'use', noun: ['badge', 'gold badge', 'certified', 'certified model'] }, then: { text: \`You polish the badge. The certified model feels ${MALAPROPS.refreshered}. It was already certified; now it is shiny.\`, outcome: 'snark' } }`.
- `src/world/items.ts`: `prompt-box` aliases gain `'sparkle'` (already) and its describe gains ` It has ${MALAPROPS.capacitude} to spare and nothing to spend it on.`; `model-final2` describe gains ` Last refreshed via Refreshr™, personal mode.`

- [ ] **Step 4: Meet the quota and write the report.**

- [ ] **Step 5: Run and commit**

```bash
git add src/world/copilot.ts src/world/items.ts .superpowers/voice/copilot-report.md tests/voice-sweep-copilot.test.ts
git commit -m "voice sweep: Copilot"
```

---

### Task F11: Region sweep — the governance rooms (Sacristy, Town Hall, My Workspace)

**Files:**
- Modify: `src/world/sacristy.ts`, `src/world/townhall.ts`, `src/world/village.ts`, `src/world/items.ts`
- Create: `.superpowers/voice/governance-report.md`
- Test: `tests/voice-sweep-governance.test.ts`

**Interfaces:**
- Produces: rules `sacristy.use-shelf`, `sacristy.use-ledger`, `sacristy.talk-book`, `sacristy.say-dax`; phrases `sacristy.sit` appended to `SACRISTY_PHRASES`; rules `hall.clerk-sacristy`; phrases `hall.take-number`, `hall.climb-counter` appended to `TOWNHALL_PHRASES`; rules `cottage.use-eventhouse`; phrases `workspace.rename`, `workspace.share` appended to `WORKSPACE_PHRASES`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/voice-sweep-governance.test.ts
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { MALAPROPS } from '../src/world/voice';

const one = (room: string, cmd: string, flags: Record<string, boolean | number> = {}) => step({ ...newGame(WORLD, 3), room, flags }, cmd, WORLD).output[0]!;

describe('governance rooms sweep', () => {
  it('the Sacristy', () => {
    expect(one('monastery.sacristy', 'use shelf')).toBe("You run a finger along the spines. Every one is a switch. Every switch is someone's Tuesday.");
    expect(one('monastery.sacristy', 'use ledger')).toBe(`You open the Capacity Ledger to a random page. It says F2. Not enough ${MALAPROPS.capacitude}. It closes itself.`);
    expect(one('monastery.sacristy', 'sit')).toBe("You sit on the stair. An admin did this once, in 2019, meaning to go back up. She's a monk now.");
    expect(one('monastery.sacristy', 'talk to export')).toBe('The book does not talk. It has a switch, not a mouth. You have that backwards.');
    expect(one('monastery.sacristy', 'say dax')).toBe(`You say 'DAX' in the Admin Portal. Nothing here is ${MALAPROPS.daxxed}. Nothing here is even a measure. It is all switches.`);
  });
  it('the Town Hall', () => {
    expect(one('village.hall', 'ask clerk about the sacristy')).toBe("'The Sacristy,' says the Clerk. 'Up from the Cloister. I've never been. I put in a ticket to go. It's an admin setting.'");
    expect(one('village.hall', 'take a number')).toBe('You take a number. It is 1. The Clerk calls 1. It is an admin setting.');
    expect(one('village.hall', 'climb the counter')).toBe("You climb the counter. The Clerk does not look up. 'That's an admin setting.' It is.");
    expect(one('village.hall', 'use counter')).toMatch(new RegExp(`The form has been ${MALAPROPS.refreshered} since you last looked; it is still blank\\.$`));
  });
  it('My Workspace', () => {
    expect(one('village.cottage', 'use eventhouse', { 'ts.monitoring': true })).toBe("You query the Eventhouse. It returns every command you've typed, with timestamps. You close it before turn 12.");
    expect(one('village.cottage', 'rename workspace')).toBe('You rename My Workspace to My Workspace (2). It was always going to be that.');
    expect(one('village.cottage', 'share workspace')).toBe("You share My Workspace. There's nobody to share it with. The dialog suggests Jeff.");
    expect(one('village.cottage', 'look at window')).toMatch(/Through the window, past the square, a hill\. Green\. Rolling\. Somebody set it as a wallpaper once\./);
    expect(one('village.cottage', 'look at report')).toMatch(/Built with Dataflows Gen1 Classic\.$/);
  });
});
```

- [ ] **Step 2: Run to see it fail** — `npx vitest run tests/voice-sweep-governance.test.ts`.

- [ ] **Step 3: The plan's lines**

`src/world/sacristy.ts` (import `MALAPROPS`): `SACRISTY_ROOM.rules` gains `{ id: 'sacristy.use-shelf', when: { verb: 'use', noun: ['shelf', 'bookshelf', 'books', 'shelves'] }, then: { text: "You run a finger along the spines. Every one is a switch. Every switch is someone's Tuesday.", outcome: 'fail' } }`, `{ id: 'sacristy.use-ledger', when: { verb: 'use', noun: ['ledger', 'capacity ledger'] }, then: { text: \`You open the Capacity Ledger to a random page. It says F2. Not enough ${MALAPROPS.capacitude}. It closes itself.\`, outcome: 'fail' } }`, `{ id: 'sacristy.talk-book', when: { verb: 'talk', nounMatches: BOOK_WORDS }, then: { text: 'The book does not talk. It has a switch, not a mouth. You have that backwards.', outcome: 'fail' } }` (with, above the room, `const escapeRe = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); const BOOK_WORDS = new RegExp(\`^(${SETTINGS.flatMap((b) => b.words).map(escapeRe).join('|')})$\`);`), `{ id: 'sacristy.say-dax', when: { verb: 'say', noun: ['dax'] }, then: { text: \`You say 'DAX' in the Admin Portal. Nothing here is ${MALAPROPS.daxxed}. Nothing here is even a measure. It is all switches.\`, outcome: 'snark' } }`; `SACRISTY_PHRASES` gains `{ id: 'sacristy.sit', room: SACRISTY, test: /^(sit|sit down|sit on (the )?stair|rest)$/, text: "You sit on the stair. An admin did this once, in 2019, meaning to go back up. She's a monk now." }`.

`src/world/townhall.ts` (import `MALAPROPS`): `HALL_ROOM.rules` gains (first) `{ id: 'hall.clerk-sacristy', when: { verb: 'talk', noun: CLERK, noun2: ['sacristy', 'the sacristy', 'admins', 'the admins', 'monastery'] }, then: { text: "'The Sacristy,' says the Clerk. 'Up from the Cloister. I've never been. I put in a ticket to go. It's an admin setting.'", outcome: 'success' } }`; `hall.counter` text gains ` The form has been ${MALAPROPS.refreshered} since you last looked; it is still blank.`; `TOWNHALL_PHRASES` gains `{ id: 'hall.take-number', room: HALL, test: /^(take|get|pull|grab)( a)? number$/, text: 'You take a number. It is 1. The Clerk calls 1. It is an admin setting.' }` and `{ id: 'hall.climb-counter', room: HALL, test: /^(climb|jump|vault|hop)( over| on| onto)?( the)? counter$/, text: "You climb the counter. The Clerk does not look up. 'That's an admin setting.' It is." }`.

`src/world/village.ts`: cottage rules gain `{ id: 'cottage.use-eventhouse', when: { verb: 'use', noun: ['eventhouse', 'event house', 'kql', 'logs'] }, then: { text: "You query the Eventhouse. It returns every command you've typed, with timestamps. You close it before turn 12.", outcome: 'snark' } }`; `WORKSPACE_PHRASES` gains `{ id: 'workspace.rename', room: 'village.cottage', test: /^rename( the| my)? workspace( to .+)?$/, text: 'You rename My Workspace to My Workspace (2). It was always going to be that.' }` and `{ id: 'workspace.share', room: 'village.cottage', test: /^share( the| my)? (workspace|report|it)( with .+)?$/, text: "You share My Workspace. There's nobody to share it with. The dialog suggests Jeff." }`. `src/world/items.ts`: `window` describe gains ` Through the window, past the square, a hill. Green. Rolling. Somebody set it as a wallpaper once.`; `report` describe gains ` Built with Dataflows Gen1 Classic.`

- [ ] **Step 4: Meet the quota and write the report.**

- [ ] **Step 5: Run and commit**

```bash
git add src/world/sacristy.ts src/world/townhall.ts src/world/village.ts src/world/items.ts .superpowers/voice/governance-report.md tests/voice-sweep-governance.test.ts
git commit -m "voice sweep: the Sacristy, the Town Hall, My Workspace"
```

---
### Task F12: The voice harness tests

**Files:**
- Create: `tests/voice-allowlist.ts`
- Create: `tests/voice-harness.test.ts`
- Modify: `src/engine/quirks.ts` (export `QUIRK_POOLS`)

**Voice:** read the voice skill first — the harness encodes its checklist (rule zero, the sign-off, malaprops, allusions, second-command-differs). Any line you rewrite to satisfy it follows the skill.

**Interfaces:**
- Consumes: everything Phase F produced; `promptFor` is not needed; `talkTo` (B1); `SNARK`, `WHERE`, `GOAL`, `MAIN_GOAL`, voice constants.
- Produces: `export const QUIRK_POOLS: readonly string[]` in `quirks.ts` (every chirp pool flattened, `REPEAT_MANY` rendered with n = 7); `export const ALLOWLIST: readonly string[]` in `tests/voice-allowlist.ts`.

- [ ] **Step 1: Export the quirk pools**

`src/engine/quirks.ts`, at the end:

```ts
/** Every chirp line, flattened, for the voice harness (tests/voice-harness.test.ts). */
export const QUIRK_POOLS: readonly string[] = [
  ...INTENT_OK, ...INTENT_NO, ...INSIST, ...FRUSTRATED, ...SHOUT_OK, ...SHOUT_NO, ...SHOUT_FLASK, ...SHOUT_CRUDE, ...SHOUT_MANY,
  ...REPEAT_2, ...REPEAT_3, ...REPEAT_MANY.map((f) => f(7)), ...REPEAT_FLASK, ...REPEAT_LOOK, ...REPEAT_LOOK_2, ...REPEAT_LOOK_3, ALL_THREE,
];
```

- [ ] **Step 2: The allowlist**

```ts
// tests/voice-allowlist.ts
/**
 * Capitalized words the proper-noun heuristic accepts beyond the world's own names. Only Fabric / Power BI / Excel
 * vocabulary, this game's places and people, and the voice.ts allusion layer. Never a Peasant's Quest noun.
 * Add a word here only after checking the line it comes from belongs to THIS game.
 */
export const ALLOWLIST: readonly string[] = [
  // the platform
  'Power', 'BI', 'Fabric', 'Excel', 'Copilot', 'DAX', 'OneLake', 'Lakehouse', 'Lakehouses', 'Spark', 'Delta', 'Parquet', 'Warehouse', 'Warehouses', 'Desktop', 'Query', 'Analyze', 'Premium', 'Pro', 'Trial',
  'Microsoft', 'Azure', 'OpenAI', 'Learn', 'Word', 'Teams', 'GitHub', 'KQL', 'Eventhouse', 'Tabular', 'Editor', 'Formula', 'Firewall', 'Expression', 'Error', 'Locale', 'Notebook', 'Notebooks', 'Dataflow', 'Dataflows', 'Gen1', 'Gen2',
  'Runtime', 'Synapse', 'Starter', 'Pool', 'CU', 'CUs', 'SKU', 'SKUs', 'XMLA', 'Sev', 'P1', 'GROUP', 'BY', 'SELECT', 'EVALUATE', 'CALCULATE', 'CALCULATETABLE', 'SUMX', 'DIVIDE', 'FILTER', 'ALL', 'USERELATIONSHIP', 'CROSS', 'APPLY', 'NOLOCK', 'CTE', 'Table', 'AddColumn', 'Buffer',
  'DirectQuery', 'DirectLake', 'Direct', 'Lake', 'Import', 'Mode', 'Both', 'Single', 'Auto', 'Total', 'Year', 'Quarter', 'Blank', 'Column', 'Column1', 'Column2', 'Column3', 'Custom', 'Custom1', 'Changed', 'Type', 'Type1', 'Source', 'Navigation', 'Promoted', 'Headers', 'Filtered', 'Rows', 'Removed', 'Other', 'Columns', 'Renamed',
  'Sales', 'Region', 'Net', 'Amount', 'Returns', 'Gross', 'YTD', 'Measure', 'Northeast', 'Southeast', 'Midwest', 'West', 'Unknown', 'Certified', 'FINAL', 'Sales_v3_FINAL_final2', 'Sales_v3_FINAL_final4', 'PivotTable', 'PivotTable1', 'Sheet1', 'Data', 'Home', 'Insert', 'Fields', 'Is', 'Current',
  'Standard', 'Personal', 'Card', 'Big', 'Refresh', 'Bursting', 'Boots', 'Hoodie', 'Scroll', 'Shortcut', 'Golden', 'Semantic', 'Model', 'Gallery', 'Pane', 'Portal', 'Admin', 'Tenant', 'Settings', 'Capacity', 'Ledger', 'Publish', 'Guest', 'Autoscale', 'Surge', 'Product', 'Feedback', 'Discover', 'Block', 'Public', 'Internet', 'Access', 'Users', 'Workspace', 'Workloads',
  // places and people of this game
  'Village', 'Square', 'Mill', 'Fields', 'Cottage', 'Town', 'Hall', 'Shore', 'Dock', 'Isle', 'Gateway', 'House', 'Bronze', 'Silver', 'Gold', 'Marsh', 'Monastery', 'Gate', 'Cloister', 'Session', 'Chamber', 'Library', 'Deprecated', 'Sacristy', 'Keep', 'Power', 'Hall', 'View', 'Duke', 'Report', 'Studio', 'Peaks', 'Foothills', 'Throttling', 'Pass', 'Ledge', 'Shrine', 'Moat', 'T-SQL',
  'Jeff', 'Finance', 'Ops', 'HR', 'IT', 'Miller', 'Ferryman', 'Abbot', 'Brother', 'Pandas', 'Librarian', 'Guard', 'Sir', 'Cardinality', 'Throttlor', 'Dragon', 'Manual', 'Clerk', 'Narrator', 'Builder', 'Builders', 'Engineer', 'Engineers', 'Scientist', 'Worthy', 'Three', 'Prophecy', 'FabCon',
  'Monday', 'Tuesday', 'Q2', 'Q3', 'Q4', 'Restore', 'Restart', 'Quit', 'Enter', 'HELP', 'GOAL', 'EXIT', 'FLASK',
  // the allusion layer and the brands are added from voice.ts by the harness itself
];
```

- [ ] **Step 3: The harness**

```ts
// tests/voice-harness.test.ts
import { describe, expect, it } from 'vitest';
import { WORLD } from '../src/world';
import { newGame, step } from '../src/engine/step';
import { resolveNoun } from '../src/engine/builtins';
import { QUIRK_POOLS } from '../src/engine/quirks';
import { SNARK } from '../src/world/globals';
import { WHERE } from '../src/world/where';
import { GOAL, MAIN_GOAL } from '../src/world/sidequests';
import { ALLUSIONS, BRANDS, MALAPROPS, NICKNAMES } from '../src/world/voice';
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
for (const room of Object.values(WORLD.rooms)) { for (const id of room.items) if (!regionOfItem.has(id)) regionOfItem.set(id, room.region); for (const id of room.npcs) if (!regionOfNpc.has(id)) regionOfNpc.set(id, room.region); }

const text = (t: unknown, s: GameState): string | null => {
  try {
    const v = typeof t === 'function' ? (t as (a: GameState, b: typeof WORLD) => unknown)(s, WORLD) : t;
    return typeof v === 'string' && v ? v : null;
  } catch { return null; }
};

/** Every narrator string reachable statically, tagged with a region. */
function harvest(): Tagged[] {
  const out: Tagged[] = [];
  const add = (t: string | null, region: Region | 'global', from: string) => { if (t) out.push({ text: t, region, from }); };
  for (const room of Object.values(WORLD.rooms)) {
    for (const s of PROBES) { const st = { ...s, room: room.id }; add(text(room.describe, st), room.region, room.id); add(text(room.flaskHint, st), room.region, room.id); add(text(room.enterQuip, st), room.region, room.id); }
    add(WHERE[room.id] ?? null, room.region, `where ${room.id}`);
    for (const r of room.rules) for (const s of PROBES) add(text(r.then.text, { ...s, room: room.id }), room.region, r.id);
  }
  for (const [id, it] of Object.entries(WORLD.items)) {
    const region = regionOfItem.get(id) ?? 'global';
    for (const s of PROBES) { add(text(it.describe, s), region, id); add(text(it.again, s), region, `${id}.again`); }
    add(it.untakeableText ?? null, region, id); add(it.blurb ?? null, region, `${id}.blurb`);
  }
  for (const [id, n] of Object.entries(WORLD.npcs)) {
    const region = regionOfNpc.get(id) ?? 'global';
    for (const s of PROBES) { add(text(n.describe, s), region, id); add(text(n.talk, s), region, id); for (let k = 2; k <= 5; k++) add(n.talkMore ? text((st: GameState) => n.talkMore!(st, k), s) : null, region, `${id}.talk${k}`); }
    add(n.brushOff ?? null, region, `${id}.brushOff`);
  }
  for (const r of WORLD.globalRules) for (const s of PROBES) add(text(r.then.text, s), 'global', r.id);
  for (const p of WORLD.phraseRules) {
    const region: Region | 'global' = p.room ? WORLD.rooms[p.room]!.region : p.region ?? 'global';
    for (const s of PROBES) {
      const st = p.room ? { ...s, room: p.room } : s;
      if (p.then) { try { const th = typeof p.then === 'function' ? p.then(st, WORLD, '') : { then: p.then }; if (th) add(text(th.then.text, st), region, p.id); } catch { /* a handler that needs a real line */ } }
      else add(text(p.text, st), region, p.id);
    }
  }
  for (const l of SNARK) add(l, 'global', 'snark');
  for (const l of QUIRK_POOLS) add(l, 'global', 'quirk');
  add(GOAL.excel.body, 'excel', 'goal'); add(GOAL.copilot.body, 'copilot', 'goal'); add(MAIN_GOAL, 'global', 'goal');
  return out;
}
const ALL = harvest();

describe('voice harness (spec1 §7)', () => {
  it('no proper noun from the other realm ever reaches the screen', () => {
    const banned = /\b(trogdor|kerrek|jhonka|strong ?bad|homestar|marzipan|peasantry|naked ned|rather dashing|coach z|bubs|poopsmith|king of town|pom pom|trogdorkilla|dirk the daring|matthew broderick|boring sanders|swimmer dan|mispeller jones|smarty-short-pants|sparkles)\b/i;
    const hits = ALL.filter((t) => banned.test(t.text)).map((t) => `${t.from}: ${t.text}`);
    expect(hits).toEqual([]);
  });
  it('every capitalized word mid-sentence is a name from this game (heuristic, allowlisted)', () => {
    const known = new Set<string>();
    const learn = (s: string) => { for (const w of s.split(/[\s/·—–-]+/)) { const c = w.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9']+$/g, ''); if (c) known.add(c.toLowerCase()); } };
    for (const r of Object.values(WORLD.rooms)) learn(r.name);
    for (const it of Object.values(WORLD.items)) { learn(it.name); it.aliases.forEach(learn); }
    for (const n of Object.values(WORLD.npcs)) { learn(n.name); n.aliases.forEach(learn); }
    [...NICKNAMES, ...ALLUSIONS, ...BRANDS, ...ALLOWLIST].forEach(learn);
    const offenders = new Map<string, string>();
    for (const t of ALL) {
      for (const raw of t.text.split(/[.!?:;\n]+\s*/)) {
        const sentence = raw.replace(/^[\s"'“‘(\[]+/, '');
        const words = sentence.split(/\s+/);
        for (const w of words.slice(1)) {
          const c = w.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9']+$/g, '').replace(/'s$/, ''); // "Jeff's" is Jeff
          if (!/^[A-Z][a-z]/.test(c)) continue; // lowercase, digits and ALL CAPS emphasis are fine
          if (!known.has(c.toLowerCase())) offenders.set(c, `${t.from}: ${t.text}`);
        }
      }
    }
    expect([...offenders.entries()].map(([w, where]) => `${w} ← ${where}`)).toEqual([]);
  });
  it('each malaprop appears verbatim in at least six lines', () => {
    for (const m of Object.values(MALAPROPS)) expect(ALL.filter((t) => t.text.includes(m)).length, m).toBeGreaterThanOrEqual(6);
  });
  it('every region has at least one allusion; every brand appears somewhere', () => {
    const KEYS = ['Clippy', 'Zune', 'Encarta', 'Windows XP', 'MSN Messenger', 'Access 97', 'SharePoint 2007', 'writing a measure', 'Hotmail', 'Windows Vista', 'Internet Explorer', 'Minesweeper', 'Recycle Bin', 'screensaver', 'Microsoft Bob'];
    for (const region of ['village', 'lake', 'swamp', 'monastery', 'fortress', 'peaks', 'excel', 'copilot'] as Region[]) {
      const texts = ALL.filter((t) => t.region === region).map((t) => t.text.toLowerCase());
      expect(KEYS.some((k) => texts.some((x) => x.includes(k.toLowerCase()))), region).toBe(true);
    }
    for (const b of BRANDS) expect(ALL.some((t) => t.text.includes(b)), b).toBe(true);
  });
});

describe('a second identical command yields a different line', () => {
  const twice = (s: GameState, cmd: string) => { const a = step(s, cmd, WORLD); const b = step(a.state, cmd, WORLD); return [a.output.join('\n'), b.output.join('\n'), a] as const; };
  it.each(Object.values(WORLD.items).filter((i) => i.takeable).map((i) => i.id))('get %s while carrying it', (id) => {
    const it = WORLD.items[id]!;
    const s: GameState = { ...newGame(WORLD, 2), inventory: ['license', id], flags: { [`taken.${id}`]: true } };
    const noun = [it.name.toLowerCase(), ...it.aliases].find((n) => resolveNoun(s, WORLD, n)?.kind === 'item')!;
    const [a, b, first] = twice(s, `get ${noun}`);
    expect(first.output[0]).toBe(typeof it.again === 'function' ? it.again(s) : it.again);
    expect(a).not.toBe(b);
  });
  it.each(Object.values(WORLD.npcs).map((n) => n.id))('talk to %s twice', (id) => {
    const npc = WORLD.npcs[id]!;
    const room = Object.values(WORLD.rooms).find((r) => r.npcs.includes(id))!;
    const s: GameState = { ...newGame(WORLD, 2), room: room.id, flags: room.region === 'excel' ? { 'sq.return': 1 } : {} };
    const noun = [npc.name.toLowerCase(), ...npc.aliases].find((n) => resolveNoun(s, WORLD, n)?.kind === 'npc')!;
    const a = step(s, `talk to ${noun}`, WORLD); const b = step(a.state, `talk to ${noun}`, WORLD);
    expect(a.output[0]).not.toBe(b.output[0]);
  });
  it.each(Object.values(WORLD.rooms).flatMap((r) => r.items.filter((id) => !WORLD.items[id]!.takeable).map((id) => [r.id, id] as const)))('look at scenery twice in %s: %s', (roomId, id) => {
    const it = WORLD.items[id]!;
    const s: GameState = { ...newGame(WORLD, 2), room: roomId, flags: { ...(roomId.startsWith('excel') || roomId.startsWith('copilot') ? { 'sq.return': 1 } : {}), 'ts.monitoring': true, 'dragon.gone': false } };
    const noun = [it.name.toLowerCase(), ...it.aliases].find((n) => { const r = resolveNoun(s, WORLD, n); return r?.kind === 'item' && r.item.id === id; });
    if (!noun) return; // hidden until a flag the probe cannot set
    const [a, b] = twice(s, `look at ${noun}`);
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 4: Run, allowlist, fix**

Run: `npx vitest run tests/voice-harness.test.ts`. The proper-noun test prints every offender with its source line. For each: if the word is this game's (a Fabric term, a place, a person, a brand, an allusion), add it to `tests/voice-allowlist.ts`; if it is not, rewrite the line in the world file that owns it. Repeat until green. Then the full run:

Run: `npx tsc -b && npm test && npm run lint:world` — Expected: green.

- [ ] **Step 5: Commit**

```bash
git add tests/voice-allowlist.ts tests/voice-harness.test.ts src/engine/quirks.ts
git commit -m "tests: voice harness — banned nouns, proper-noun heuristic, malaprops, allusions per region, second-command-differs"
```

---

### Task G1: Docs

**Files:**
- Modify: `README.md`, `docs/how-to-play.md`, `docs/ledger.md`, `docs/building-and-deploying.md`, `AGENTS.md`

**Voice:** read the voice skill first. Docs quote narrator lines; quote them exactly, and write the docs' own prose plainly (the docs are not the narrator).

**Interfaces:**
- Consumes: the final room/item/npc counts from `npm run lint:world` (the line `World OK (31 rooms, N items, 15 npcs, …)`); everything built.
- No world-version bump. No tag.

- [ ] **Step 1: README.md**

- The counts line becomes `31 rooms · N items · 15 characters · 200 points + 70 bonus · a respectable number of ways to die, and three that are worse.` with N from the lint output.
- After the side-quests paragraph add: `Up a spiral stair from the Monastery's Cloister is the Sacristy: the Admin Portal, in stone. Its shelf holds real Fabric tenant settings and its ledger real capacity settings — \`turn off export\` and Jeff loses Excel, \`turn off xmla\` and the Keep's back gate closes, \`turn on guests\` and the whole organization arrives in the Square. Flip them and find out. Two of them kill you. The Town Hall, up the steps from the Square, will tell you everything is an admin setting; it is right.`
- Hints: replace the Duke line (Task C1 did), and add: `- The Town Hall answers every question the same way. The fourth time, it tells you where the admins are.`; `- The Sacristy is open to anyone. Every book is a switch; \`settings\` lists them, \`read <book>\` says what it does here. Put things back; it pays.`; `- Power Query Hall's query is broken. Rebuild it one Applied Step at a time, in order — \`look at steps\` shows where it stopped.`; `- Stuck anywhere: \`hint\`. Inside a side quest: \`goal\`. Talking to someone three times gets you their hint in their own words.`
- The Hall of Fame / how-to-play table: add a row `| Say what you're here for | \`goal\` (in a side quest), \`hint\`, \`where\` |`.

- [ ] **Step 2: docs/how-to-play.md**

Add, after "Talking": a section `### Asking twice` — `Everyone escalates. The first answer is the line; the second is a variant; the third adds their hint in their own words; after that they call you names. \`ask <someone> about <thing>\` gets a brush-off unless the thing is theirs.` Update the frustration sentence in "Wrappers" to quote `"Come now. Don't get throttled."` (the one unchanging line). Add a section `## Goals, hints, where` — `goal` (in a side quest: the objective and the next step; outside: the main quest), `hint` / `clue` / `what now` (the flask hint without the flask), `where`, `why`, and the narrator's aside after four dead turns. Add `## The Sacristy (tenant settings)` — `settings`, `capacity settings`, `read <book>`, `turn on <book>` / `turn off <book>` / `toggle <book>`, `reset settings`, the 15-minutes line, the two deaths, the errands (+10, +5), and that every default keeps the game as it was. Add `## My Workspace` — `publish`, `publish to my workspace`, `publish to web`. Add `## Power Query Hall` — the seven commands in order (`source`, `navigate`, `promote headers`, `change type`, `filter rows`, `remove other columns`, `rename columns`), `look at steps`, `look at query`, what happens out of order. Extend "Dying" with the new deaths (a Monday refresh in the Fields, every relationship Both, the 400-visual page, publish to web, ten calculated columns, merging the FINAL files, DAX in the M editor, the CapacityAde, blocking public internet, pausing the capacity) and add `## Curses` — three things worse than death (a calculated column, (Blank), Jeff) and their undo (`use policy on self` or the moat; `say star schema`; `give mug to jeff`). Update the `say` example to `say calculated column` (Task C1 did).

- [ ] **Step 3: docs/ledger.md**

- Bonus table becomes five rows (Jeff's Excel +20, Copilot +25, Applied Steps +10 (`source` … `rename columns` in Power Query Hall), the Abbot's errand +10 (`talk to abbot` in the Cloister, then `turn off publish to web` in the Sacristy, either order), Governance restored +5 (flip any book away from default, then put every book back — by hand or `reset settings`)) with the sentence `Bonus total: 70.`
- Three new `<details>` blocks with the exact command lists: applied steps (the seven, with the error you get out of order), the errand (both orders), restored (`turn off xmla`, `turn on xmla`).
- Deaths table: add `| Refresh Fields | typed \`refresh\` at 9:02 on a Monday |`, `| The Model View | set every relationship to Both; the tenth calculated column |`, `| The Report Studio | opened the 400-visual page |`, `| My Workspace | \`publish to web\` (while it is on); merged the FINAL files |`, `| Power Query Hall | typed DAX into the M editor |`, `| Throttling Pass | drank the CapacityAde |`, `| The Sacristy | turned on Block Public Internet Access; paused the capacity |`. Add a `## Curses` table (trigger · effect · undo).
- Map: add `[Town Hall]` above `[Village Square]` (`u`) and `[Sacristy]` above `[Cloister]` (`u`):

```
                                 [Mill]        [Town Hall]
                                   |               |
              [My Workspace] -- [Village Square] -- [Refresh Fields] -- [Foothills] -- [Throttling Pass] -- [Bursting Ledge] -- [Shrine]
…
                                                  [Sacristy]
                                                      |
                               [Gold Marsh] -- [Monastery Gate] ------ +
                                                      |
                                                  [Cloister] -- [Spark Chamber]
```

(the Sacristy sits `u` from the Cloister; draw it beside the Cloister with a `u` label so the box grid stays aligned: `[Cloister] -- [Spark Chamber]` and, on the line above, `[Sacristy] (up)`).

- [ ] **Step 4: docs/building-and-deploying.md**

Layout block gains: `governance.ts (settings: setting(), isFlood(), applyGovernance())` under `src/engine/`; under `src/world/`: `voice.ts (the constants: SIGNOFF, nick(), MALAPROPS, BRUSHOFFS…) · sacristy.ts (the settings catalog and the Admin Portal) · townhall.ts · applied-steps.ts · gates.ts (gate objects × obvious verbs) · curses.ts · deaths.ts · where.ts`; `tests/` gains `golden-plus-governance`, `voice-harness`, the sweep tests. New subsections:
- **How to add a setting.** 1. Add the key to `SettingKey`, `SETTING_KEYS` and `DEFAULTS` in `src/engine/governance.ts` (the default must keep today's behavior). 2. Add its catalog entry to `SETTINGS` in `src/world/sacristy.ts` (`key`, `shelf`, `title` — the real Learn name —, `words`, `read`, `on`, `off`, `effect`, and `die` if flipping it on is a death); the book item is generated. 3. Put the effect where it lives: a room describe, an NPC line, a rule with `flags: [{ flag: 'ts.<key>', is: false }]`, a function exit reading `setting(s, key)`, or a trailing line in `applyGovernance()`. 4. Test it in `tests/setting-effects.test.ts` and run `npm run lint:world` (it checks the catalog).
- **Voice constants.** Every narrator line draws from `src/world/voice.ts`: `SIGNOFF` is appended to deaths by the engine; `nick(s)` rotates the nickname pool by turn; `MALAPROPS`, `BRANDS`, `ALLUSIONS` are the house jokes; `BRUSHOFFS` is one line per NPC. The harness (`tests/voice-harness.test.ts`) rejects proper nouns that are not this game's, requires each malaprop six times and an allusion per region, and checks that a second identical command answers differently.
- **Phrase rules with effects.** `PhraseRule.then` (a `RuleThen`, or a function `(s, world, line) => { then, id? } | null`) lets a raw-line rule set flags, move, pay bonus, or kill; a function returning `null` declines and the search continues. The Sacristy, the applied steps, the gates and the curses are all built on it.
- **NPC escalation.** `talk.<npc>` counts every talk; `Npc.talkMore(s, n)` answers talks 2 and up (variant, then hint, then nicknames); `Npc.brushOff` answers `ask <npc> about <unknown>`. Without `talkMore` the engine says the same thing slower, then the flask hint.
- **Gates.** `gate({ id, room, nouns, shape, more, flavor, when })` in `src/world/gates.ts` makes one room-scoped phrase rule that answers thirteen obvious verbs with the puzzle's shape.
- **Counters on GameState.** `stuck` (the narrator's aside at 4/8/12), `idle` (boredom at 10/15/20…), `looks` (five scenery looks). Curses are flags `curse.<kind>`; `curseOf(s)` reads them and `PlayScreen` shows them.
- Lint list: add brush-offs, WHERE lines, the catalog, item blurbs/agains.

- [ ] **Step 5: AGENTS.md**

Ground rules gain: `- Every narrator line follows the peasants-quest-voice skill and draws its names from `src/world/voice.ts`; voice work is add-mode (existing lines stay). The harness in `tests/voice-harness.test.ts` enforces the nouns.` and `- Every setting in `src/engine/governance.ts` defaults to today's behavior; the golden path (200 in 69 turns) never touches the Sacristy.`

- [ ] **Step 6: Run and commit**

Run: `npx tsc -b && npm test && npm run lint:world` — Expected: green (docs only).

```bash
git add README.md docs/how-to-play.md docs/ledger.md docs/building-and-deploying.md AGENTS.md
git commit -m "docs: governance rooms, applied steps, voice constants, the DAX sin, 70 bonus, new deaths and curses"
```

---

### Task H1: The master cheat sheet

**Files:**
- Create: `scripts/cheat-sheet.ts`
- Create: `docs/cheat-sheet.md`
- Modify: `package.json` (script `cheat-sheet`)
- Modify: `README.md` (Documentation list)

**Voice:** read the voice skill first. Section 3 quotes the world's lines; keep them verbatim. The sheet's own prose is plain.

**Interfaces:**
- Consumes: `promptFor` (`src/engine/god.ts`), `talkTo` (B1), the whole world.
- Produces: `npm run cheat-sheet` prints the raw inventory per room to stdout (markdown); `docs/cheat-sheet.md` in three sections exactly as spec1 §8 describes; README links it as "The cheat sheet — every command, every room, spoilers everywhere".

- [ ] **Step 1: The script**

```ts
// scripts/cheat-sheet.ts
/**
 * Prints the raw command inventory of every room: rules (with points, bonus, needs), phrase rules in scope, items
 * (aliases, gettable, blurb), NPCs (talk 1–4, brush-off), exits, deaths (☠), curses, and the god-mode extras.
 *   npm run cheat-sheet > /tmp/cheat-sheet-raw.md
 * docs/cheat-sheet.md §3 is the edited, readable version of this output. The ledger stays the points authority.
 */
import { WORLD } from '../src/world';
import { promptFor } from '../src/engine/god';
import { newGame } from '../src/engine/step';
import { talkTo } from '../src/engine/builtins';
import type { GameState } from '../src/engine/types';
import type { PhraseRule, Rule } from '../src/world/types';

const probe = (room: string): GameState => ({ ...newGame(WORLD, 1), room });
const needs = (r: Rule): string => {
  const w = r.when;
  const bits = [
    ...(w.flags ?? []).map((c) => (c.not ? `!${c.flag}` : c.is !== undefined ? `${c.flag}=${c.is}` : c.flag)),
    ...(w.has ?? []).map((i) => `has:${i}`), ...(w.notHas ?? []).map((i) => `not:${i}`), ...(w.worn ?? []).map((i) => `wearing:${i}`),
  ];
  return bits.length ? ` [needs ${bits.join(', ')}]` : '';
};
const effect = (t: Rule['then']): string => {
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
const phraseLine = (p: PhraseRule): string => {
  const th = p.then && typeof p.then !== 'function' ? effect(p.then) : '';
  return `  ~ /${p.test.source}/${p.death ? ' ☠' : ''}${th}${p.dynamic ? ` [${p.dynamic}]` : ''}${typeof p.then === 'function' ? ' [dynamic then]' : ''}  #${p.id}`;
};

const out: string[] = ['# Fabric\'s Quest — raw command inventory', `Generated from the world files: ${Object.keys(WORLD.rooms).length} rooms.`];
for (const room of Object.values(WORLD.rooms)) {
  out.push(`\n## ${room.name} (${room.id}, ${room.region})`);
  const s = probe(room.id);
  out.push(`Exits: ${Object.keys(room.exits).join(', ') || '—'}`);
  out.push('### Rules');
  for (const r of room.rules) out.push(`  > ${promptFor(r)}${effect(r.then)}${needs(r)}  #${r.id}`);
  const phrases = WORLD.phraseRules.filter((p) => p.room === room.id || (!p.room && p.region === room.region));
  if (phrases.length) { out.push('### Phrases (this room / region)'); for (const p of phrases) out.push(phraseLine(p)); }
  out.push('### Items');
  for (const id of room.items) { const it = WORLD.items[id]!; out.push(`  - ${it.name} [${it.aliases.join(', ')}]${it.takeable ? ' (gettable)' : ''}${it.blurb ? ` — ${it.blurb}` : ''}`); }
  if (room.npcs.length) {
    out.push('### NPCs');
    for (const id of room.npcs) {
      const n = WORLD.npcs[id]!;
      out.push(`  - ${n.name} [${n.aliases.join(', ')}]`);
      for (let k = 1; k <= 4; k++) out.push(`      talk ${k}: ${talkTo({ ...s, flags: { ...s.flags, [`talk.${id}`]: k - 1 } }, WORLD, n)}`);
      out.push(`      ask about <unknown>: ${n.brushOff ?? '—'}`);
    }
  }
}
out.push('\n## Anywhere', '### Global rules');
for (const r of WORLD.globalRules) out.push(`  > ${promptFor(r)}${effect(r.then)}${needs(r)}  #${r.id}`);
out.push('### Global phrases');
for (const p of WORLD.phraseRules.filter((p) => !p.room && !p.region)) out.push(phraseLine(p));
out.push('### God mode (burninate)', '  godhelp · rooms · warp <room> · prompts [all|global] · summon <item> · locate <thing> · flags · settings · set <key> on|off · burninate');
console.log(out.join('\n'));
```

`package.json` scripts: `"cheat-sheet": "tsx scripts/cheat-sheet.ts"`. Run `npm run cheat-sheet > /tmp/cheat-sheet-raw.md` and confirm it prints every room (31 `## ` headings plus Anywhere).

- [ ] **Step 2: `docs/cheat-sheet.md`, section 1 — The 200 in order**

Write the file with this header and section 1 verbatim (the points come from the ledger; the running total is in the right column):

```markdown
# The cheat sheet

Every command, every room, spoilers everywhere. The [ledger](ledger.md) is the points authority; this is the map of
what to type. Generated in part by `npm run cheat-sheet` (section 3 is the edited version of its output).

## 1. The 200 in order

One command per line, grouped by room, with the points it earns and the running total.

| Room | Command | Points | Total |
|---|---|---|---|
| My Workspace | `look` · `get mug` · `read report` · `out` | | 0 |
| Village Square | `read board` | +5 | 5 |
| Village Square | `give mug to jeff` (quiets him) · `n` | | 5 |
| Dataflow Gen1 Mill | `talk to miller` · `s` | +10 | 15 |
| Village Square → Foothills | `e` · `e` · `n` | | 15 |
| Power BI Desktop Gate | `say trial` · `n` · `n` | +10 | 25 |
| Duke's Chamber | `say calculated column` (you land at the gate) · `n` · `w` | +25 | 50 |
| The Model View | `get policy` · `e` · `e` | | 50 |
| The Report Studio | `look at card` · `wait` · `wait` | +10 | 60 |
| The Report Studio | `use policy on refresh` · `wear boots` · `w` · `w` · `n` | +15 | 75 |
| Monastery Gate | `wait` · `wait` · `wait` · `n` · `w` | +10 | 85 |
| Library | `give license to librarian` | +10 | 95 |
| Library | `read scroll` · `e` · `e` | +5 | 100 |
| Spark Session Chamber | `use scroll on notebook` · `w` | +20 | 120 |
| Cloister | `talk to abbot` · `wear hoodie` · `s` · `s` · `e` · `s` · `s` · `w` · `w` · `s` · `e` | +15 | 135 |
| Ferryman's Dock | `give credentials to ferryman` · `board boat` | +15 | 150 |
| Isle of Gateway | `get standard key` · `board boat` · `w` · `s` · `s` · `s` | +20 | 170 |
| Gold Marsh | `get shortcut` · `use shortcut` · `n` · `e` · `e` · `e` · `n` | +10 | 180 |
| Bursting Ledge | `n` (the door opens for the Worthy) | +5 | 185 |
| The Shrine | `say star schema` | +10 | 195 |
| The Shrine | `get model` | +5 | **200** |

69 turns. `tests/golden-path.json` is this list.

### The side quests and every bonus (70)

| Bonus | Sequence |
|---|---|
| Jeff's Excel, +20 | `show me a table` · `talk to jeff` · `n` · `analyze in excel` · `sign in` · `s` · `e` · `create pivot table` · `add sales region` · `add net sales` · `filter by year` · `w` · `show jeff` |
| Copilot, +25 | `copilot` · `use the certified model` · `net sales` · `for the northeast` · `q4 2025` · `just the total` — or, in one line, `ask copilot for total q4 2025 northeast net sales from the certified model, just the number` |
| Applied Steps, +10 | in Power Query Hall: `source` · `navigate` · `promote headers` · `change type` · `filter rows` · `remove other columns` · `rename columns` |
| The Abbot's errand, +10 | in the Cloister (gate open): `talk to abbot` (after the hoodie) · `u` · `turn off publish to web` — or turn it off first and then talk to him |
| Governance restored, +5 | in the Sacristy: `turn off xmla` · `turn on xmla` (any book away and back, or `reset settings` after a change) |
```

- [ ] **Step 3: Section 2 — Room by room: what you need and where it comes from**

One entry per room; write all 31 in this table form (the first rows are given verbatim; complete the rest from the world files and the gates in `src/world/gates.ts` — every gate's exact words are in its `shape`):

```markdown
## 2. Room by room: what you need and where it comes from

| Room | What you must do here | Bring (from) | Leave with | The exact words |
|---|---|---|---|---|
| My Workspace | Take the mug. | — | mug | `get mug`. Also `publish` (to yourself; to the internet while Publish to web is on — ☠). |
| Village Square | Read the prophecy; quiet Jeff. | mug (My Workspace) | — | `read board`, `give mug to jeff`. `help jeff` opens his Excel. `u` is the Town Hall. |
| Town Hall | Nothing. Learn where the admins are. | ticket (here) | — | `talk to clerk` ×4; `give ticket to clerk`. Everything is an admin setting. |
| Dataflow Gen1 Mill | Get the Gen1 credentials. | — | credentials | `talk to miller` (or `open chest`, `get credentials`). |
| Refresh Fields | Pass through. | — | seed | `use manual` for a line. Never `refresh` here (☠ Monday). |
| Power BI Desktop Gate | Name a SKU the guard accepts. | — | — | The drawbridge is the guard's; the guard wants a SKU; the free one is the trial: `say trial`. |
| Power Query Hall | Optional: rebuild the query in order (+10). | — | — | `source` · `navigate` · `promote headers` · `change type` · `filter rows` · `remove other columns` · `rename columns`. `look at steps`. |
| The Model View | Take the policy; the back gate north leads to the Monastery (while XMLA is on). | — | policy | `get policy`. `say single` fixes the bridge (no points). Ten `add calculated column` is ☠. |
| Duke's Chamber | Say the sin. You land at the gate smelling of Warehouse. | — | Trial 2 (`trial.moat`) | `say calculated column`. `say select *` only gets you corrected. Three wrong answers and you are a column. |
| The Report Studio | Out-stare the Card; give the Big Refresh the policy. | policy (Model View) | boots (wear them) | `look at card` · `wait` · `wait`; `use policy on refresh`; `wear boots`. Don't `open other page` (☠). Don't stare past six. |
| Monastery Gate | Wait out the Spark session. | — | — | `wait` ×3. |
| Cloister | Get the hoodie (after the notebook); take the errand. | notebook fixed (Spark Chamber) | hoodie | `talk to abbot`, `wear hoodie`; `talk to abbot` again for the errand; `u` is the Sacristy. |
| The Sacristy | Optional: flip settings; put them back (+5); turn off Publish to web for the Abbot (+10). | — | — | `settings`, `read <book>`, `turn off <book>`, `reset settings`. `turn on block public internet` and `pause capacity` are ☠. |
```

(continue with Spark Session Chamber, Library, OneLake Shore, Ferryman's Dock, Isle of Gateway, Bronze/Silver/Gold Marsh, the Lake House, Foothills, Throttling Pass, Bursting Ledge, the Shrine, Sheet1, the Data tab, PivotTable1, the Copilot Pane, the Model Gallery — one row each, same columns, exact words from the rules and gates.)

- [ ] **Step 4: Section 3 — Everything you can do in each room**

Format, shown in full for one room; produce every room from the script's output in this shape (useful → gag → easter eggs → ☠ deaths → curses → NPC talk 1–4 and brush-off → god-mode extras; drop internal ids, keep the words a player types):

```markdown
## 3. Everything you can do in each room

### Power BI Desktop Gate
- **Useful:** `say trial` (+10, opens the bridge) · `n` (after) · `talk to guard` (1: HALT; 2: quieter; 3: "S-K-U. Trial's free."; 4+: nicknames) · `get ye flask` / `hint`
- **Gags:** `say f64` / `say pro` / `say f2` · `say sign in` · `use update` · `open drawbridge` / `push gate` / `kick splash screen` (the bridge answers to the guard; after two tries: "Trial's free.") · `fish in the moat` · `use moat` / `use battlements` / `use dialog` / `use splash` (rotating) · `get moat` / `get drawbridge` / `get battlements` · `give license to guard` · `give mug to guard` · `ask guard about the moat`
- **Easter eggs (anywhere):** `where` · `why` · `smell` (Warehouse, after the moat) · `xyzzy` · `dance` · `cheat` (Meh.)
- **☠:** `swim moat` · `die` · `delete workspace` · `format c:`
- **Curses:** none here
- **God mode:** `prompts` · `locate sku`
```

Write `docs/cheat-sheet.md` with sections 1–3 complete. Add to README's Documentation list: `- [The cheat sheet](docs/cheat-sheet.md) — every command, every room, spoilers everywhere`.

- [ ] **Step 5: Verify and commit**

Run: `npm run cheat-sheet | grep -c '^## '` — Expected: `32` (31 rooms + Anywhere). Run: `npx tsc -b && npm test && npm run lint:world` — Expected: green.

```bash
git add scripts/cheat-sheet.ts docs/cheat-sheet.md package.json README.md
git commit -m "cheat sheet: the 200 in order, room by room, everything you can do; scripts/cheat-sheet.ts"
```

---

## Appendix A: Spec coverage

| Spec section | Task(s) |
|---|---|
| spec1 §2.1 Excel story, stages, commands, field list, compare, goal card | A1, A2 |
| spec1 §2.2 Copilot slots, wrong-but-plausible, hints, start over, goal card | A1, A3 |
| spec1 §2.3 (= spec2 §2) onboarding: box, goal, in-realm help, board line | A1 |
| spec1 §3.1 NPC talk escalation, nicknames, brush-offs | D1 (BRUSHOFFS), B1 |
| spec1 §3.2 gate objects × obvious verbs, `n` at the bridge, audit | B2 |
| spec1 §3.3 narrator nudge (`state.stuck`) | B3 (F1 keeps it) |
| spec1 §3.4 `hint` | B3 |
| spec1 §4.1 the Duke's sin, `select *` corrected, DAX flavor, hints/docs/golden path | C1 (docs rows), G1 |
| spec1 §4.2 hall reads as seven steps, per-step pokes, `look at steps` | C2 (E6 the puzzle) |
| spec1 §4.3 Keep audit | C1, C2, F6 (the moat stays T-SQL) |
| spec1 §5.1 voice.ts constants, pinned tests, sign-off on every death | D1 |
| spec1 §5.2 add-mode: pools, beats, `where`, `why`, blurbs, repeats, brush-offs, derailments, deaths, curses, win | F1, F3, F2, F4–F11 |
| spec1 §5.3 the only overwrites | D1 |
| spec1 §5.4 ten deaths, three curses | F2 (E1, E5 write two of the deaths) |
| spec1 §5.5 region sweeps with reports | F4–F11 |
| spec1 §6 engine changes; lint (brushOff, flaskHint, blurb, again) | D1, A1, B1, B3, F1, F2, E9 (+F3 for the item lints) |
| spec1 §7 testing | every task's tests; F12 harness; E9 golden suites |
| spec1 §8 cheat sheet | H1 |
| spec2 §2 (superseded by spec1 §2) | A1, A2, A3 |
| spec2 §3.1 Sacristy room, items, quip, status line | E1 |
| spec2 §3.2 commands, ambiguity, delegate, get | E1 |
| spec2 §3.3 tenant shelf, effects | E1 (catalog), E2 (effects) |
| spec2 §3.4 capacity ledger, effects | E1, E2 |
| spec2 §3.5 the flood | E1 (delay), E2 (lines, end line) |
| spec2 §3.6 god mode | E7 |
| spec2 §4 two deaths | E1 |
| spec2 §5 errands | E3 |
| spec2 §6 Town Hall | E4 |
| spec2 §7 My Workspace | E5 |
| spec2 §8 Applied Steps | C2, E6 |
| spec2 §9 engine changes, catalog shape, lint | A1, D1, E1, E9 |
| spec2 §10 scenes, sfx | E1, E4 (scenes), E8 (sfx) |
| spec2 §11 docs, telemetry (rule ids `sacristy.<key>.on|off`) | E1 (ids), G1 |
| spec2 §12 testing | E1–E9 tests, E8 e2e |

## Appendix B: Rulings this plan makes where the specs are silent or disagree

- "failures end with SIGNOFF" applies to deaths; non-lethal failures do not carry the catchphrase.
- `PhraseRule.then` (D1) is the one mechanism for raw-line rules with effects; the governance spec's `dynamic: 'setting'` is implemented as `then` handlers in `sacristy.ts`, so the engine has no Sacristy-specific code.
- The Copilot "shape" slot is stored as `copilot.one` because `copilot.shape` already holds the drawn bubble; the explicit third-reply hint uses ALL CAPS (`Say: NET SALES.`), never bold.
- Curses are flags `curse.<kind>` read through `curseOf(s)`; the column curse can only be applied before the moat and the moat lifts it, so it never soft-locks the win.
- The Monastery Gate row of the gate table is applied at the gate itself with the session line first and the spec's geography sentence as the second-try addition; the "Spark Session Chamber" row's "It's starting. wait." goes to the gate's `session` / `progress bar` nouns (the bar lives at the gate), and the chamber's `notebook` gets the scroll shape.
- The Studio gate answers every obvious verb except `use`, whose Big Refresh lines already shape that puzzle (and a test depends on them).
- `restore defaults` / `reset` in the Sacristy are not the UI's restore/restart: App.tsx acts only on the builtins' `meta` outcome.
- The killing books' `on` text carries both the output line and the death-card line; the card shows the whole output.
- `gov.touched` is set only by a flip away from a default; the restored +5 is paid by the flip or reset that returns the last non-default book; the errand's flip never pays +5 and after it OFF is publishToWeb's default.
- The item `blurb`/`again` lints land in F3 with the blurbs, not in E9, so every commit stays green.
- `where` lines live in `src/world/where.ts` (one map, lint-checked) rather than on each Room.
- The comparison doc's `attack self` / `die` rows are treated as add-mode (blame beat appended), per spec1 §5.3's list of the only overwrites.
- The Gateway Shed death is skipped (no shed); ten deaths become nine new plus the Sacristy pair.

---

## Controller amendments (2026-09-23, from Tommy mid-run)

### Task B4: Hint tone — the helpers are not straight messaging

**Files:**
- Modify: `src/engine/step.ts` (the nudge in `finish()`), `src/world/types.ts` (`Room.nudge?`), every room file with a `flaskHint`, `tests/stuck.test.ts`
- Create: `tests/hint-tone.test.ts`

**Interfaces:**
- Consumes: `state.stuck` (B3), `flaskHint` (every room), `voice.ts` (`nick`, `rotate`).
- Produces: `Room.nudge?: { oblique: string | ((s) => string); plainer?: string | ((s) => string) }`. The engine's aside at stuck 4 uses `nudge.oblique`, at 8 `nudge.plainer ?? flaskHint`, at 12+ the flaskHint verbatim. Rooms without `nudge` fall back to the flaskHint at every tier (lint warns, not fails).

Tommy's words: "don't be too straightforward… I don't want like straight messaging in there." The asked-for helpers (`hint`, `get ye flask`, `goal`, NPC talk 3) may stay direct — the player asked. The UNASKED aside after four dead turns must be in the narrator's voice and sideways: it points at the idea, not the command. Examples of the tier ladder at the Desktop Gate: oblique (4) — "(Psst. The guard's been asked for one thing all day and it wasn't your name.)"; plainer (8) — "(Psst. He wants a SKU. There's a free one. It rhymes with denial.)"; explicit (12) — the flaskHint verbatim. Write an `oblique` line for every room in the main realm and the governance rooms (31 rooms), in the voice skill's register: second person, one joke, no backticks, never the literal command at tier 1; a `plainer` for rooms whose flaskHint is a bare command. The Copilot pane is excluded (its own hints). Tests: tier 1 output contains no backtick and not the flaskHint's command words for five rooms; tiers 2/3 as specified; every room has `nudge.oblique` (lint-style test over `world.rooms`, excluding side realms).

Steps: write the failing tests; add the type and engine tiering; write the 31 oblique lines (one per room, in the room file next to `flaskHint`); run `npx tsc -b && npm test && npm run lint:world`; commit `hints: tiered nudges — oblique first, plain later`.

### Task H1 (amended): two docs, not one

The cheat sheet splits into two files, both linked from README's Documentation list:

1. `docs/cheat-sheet.md` — **the gameplay cheat sheet**: §1 the 200 in order (golden path, points per line, running total) + the side quests and every bonus as short sequences; §2 room by room: what you must do, what you need and which room gives it, what you leave with, the exact words. No §3.
2. `docs/room-guide.md` — **the room guide**: for every room, everything you can do — every command with a distinct response: useful, gag, easter eggs, deaths (☠), curses, NPC talk escalations, god-mode extras — generated from `scripts/cheat-sheet.ts` then edited. The ledger stays the points authority; both docs link to it.

Everything else in Task H1 stands. The script prints both inventories (`--gameplay` / `--rooms`).
