# Side Quests (Jeff's Excel + Copilot), Bonus Scoring, Entrance Quips, Wrappers — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two quick side-quest realms (Jeff's Excel, Copilot) reachable from anywhere with their own scenes, sounds and bonus points; make the narrator quip on every room entry; and teach the chirps layer to unwrap "I want to / I said / dammit" around commands.

**Architecture:** Everything stays inside the existing pure engine: new rooms are ordinary `Room`s in two new region files, entry/exit is a pair of global phrase rules plus one new `RuleThen.returnTo` flag, bonus is a second counter next to `score`, the Copilot ladder is a room-level `catchAll` hook evaluated before builtins, and wrappers are a pre-parse unwrap in `quirks.ts`. UI changes are cosmetic (status-bar color, a flash class, bonus text) plus two SVG scene files and five new sound cues. One additive schema change (`HallOfFame.bonus`).

**Tech Stack:** TypeScript strict, React 19, Vite 7, Vitest 3, Playwright, Rayfin SDK 1.35 (`@microsoft/rayfin-core` decorators), Web Audio.

**Spec:** `docs/superpowers/specs/2026-09-22-side-quests-design.md`

## Global Constraints

- The 200-point ledger does not change; `tests/golden-path.test.ts` must keep asserting `score === 200` in 59 turns.
- `src/engine` and `src/world` stay pure (no DOM, no network, no randomness beyond `state.seed`).
- Original characters and text only; Homestar Runner catchphrases may appear only as *triggers*, never as output.
- Every new room has `enterQuip`, `flaskHint`, `scene`, `describe`, and an `out` exit; `npm run lint:world` must pass.
- All new string columns use `@text({ max })`; every entity keeps `@authenticated('read')` next to `@anonymous(...)`; any column an anonymous caller writes to `HallOfFame` must be in its anonymous read `include` list.
- Bonus amounts: Excel **+20**, Copilot **+25**. Copilot's winning figure is exactly `$1,247,930`; Excel's report total `4.2M`, export `4.7M`.
- Run before every commit: `npx tsc -b && npm test && npm run lint:world`.

---

### Task 1: Engine — bonus counter, `returnTo`, side regions, `notice`

**Files:**
- Modify: `src/engine/types.ts`
- Modify: `src/world/types.ts`
- Modify: `src/engine/step.ts`
- Modify: `src/engine/builtins.ts` (score line, `roomFromIndex`)
- Test: `tests/engine-bonus.test.ts`

**Interfaces:**
- Produces: `GameState.bonus: number`; `RuleThen.bonus?: number`; `RuleThen.returnTo?: true`; `Room.region` now `'village' | 'lake' | 'swamp' | 'monastery' | 'fortress' | 'peaks' | 'excel' | 'copilot'`; `Room.enterQuip?: (s: GameState) => string | null`; `Room.catchAll?: (s: GameState, raw: string) => { then: RuleThen; id?: string } | null`; `StepResult.notice?: string`; `export const SIDE_REGIONS = new Set(['excel', 'copilot'])`; `export function roomFromIndex(i: number, world: World): string | undefined`; `export const RETURN_FLAG = 'sq.return'`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/engine-bonus.test.ts
import { describe, expect, it } from 'vitest';
import { applyRuleForTest, newGame, step } from '../src/engine/step';
import { roomFromIndex, roomIndex } from '../src/engine/builtins';
import { WORLD } from '../src/world';
import type { Rule } from '../src/world/types';

describe('bonus points', () => {
  it('newGame starts with bonus 0 and step keeps flags.bonus in sync', () => {
    const s = newGame(WORLD, 1);
    expect(s.bonus).toBe(0);
    const r = step(s, 'look', WORLD);
    expect(r.state.flags.bonus).toBe(0);
  });
  it('a rule with then.bonus awards once and never touches score', () => {
    const rule: Rule = { id: 'test.bonus', when: { verb: 'wait' }, then: { text: 'ding', bonus: 20 } };
    const s = { ...newGame(WORLD, 1), room: 'village.cottage' };
    const once = applyRuleForTest(s, rule, WORLD);
    expect(once.state.bonus).toBe(20);
    expect(once.state.score).toBe(0);
    expect(once.pointsAwarded).toBe(0);
    const twice = applyRuleForTest(once.state, rule, WORLD);
    expect(twice.state.bonus).toBe(20);
  });
});

describe('returnTo', () => {
  it('roomFromIndex inverts roomIndex', () => {
    expect(roomFromIndex(roomIndex('fortress.yard', WORLD), WORLD)).toBe('fortress.yard');
    expect(roomFromIndex(999, WORLD)).toBeUndefined();
  });
  it('a rule with returnTo moves to the room stored in sq.return and describes it', () => {
    const rule: Rule = { id: 'test.return', when: { verb: 'wait' }, then: { text: 'back you go', returnTo: true } };
    const s = { ...newGame(WORLD, 1), room: 'village.mill', flags: { 'sq.return': roomIndex('fortress.yard', WORLD) } };
    const r = applyRuleForTest(s, rule, WORLD);
    expect(r.state.room).toBe('fortress.yard');
    expect(r.output.join(' ')).toContain('PIPELINE YARD');
    expect(r.outcome).toBe('move');
  });
});

describe('score line', () => {
  it('mentions the bonus only when there is one', () => {
    const s = newGame(WORLD, 1);
    expect(step(s, 'score', WORLD).output[0]).toBe('Score : 0 of 200, in 1 turns.');
    expect(step({ ...s, bonus: 25 }, 'score', WORLD).output[0]).toBe('Score : 0 of 200 (+25 bonus), in 1 turns.');
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/engine-bonus.test.ts`
Expected: FAIL — `applyRuleForTest` / `roomFromIndex` not exported, `bonus` missing.

- [ ] **Step 3: Extend the types**

In `src/engine/types.ts`, inside `GameState` add after `score: number;`:

```ts
  /** Side-quest bonus points, on top of the 200-point ledger. */
  bonus: number;
```

and inside `StepResult` add:

```ts
  /** A line the UI should show in the Sierra message box (entrance quips, side-quest events). */
  notice?: string;
```

In `src/world/types.ts`:

```ts
export type Region = 'village' | 'lake' | 'swamp' | 'monastery' | 'fortress' | 'peaks' | 'excel' | 'copilot';
export const SIDE_REGIONS: ReadonlySet<Region> = new Set<Region>(['excel', 'copilot']);
```

change `Room.region` to `region: Region;` and add to `Room`:

```ts
  /** Shown in the message box the first time the player enters (null = nothing). */
  enterQuip?: (s: GameState) => string | null;
  /** Last-resort handler for any line the room wants to interpret itself (Copilot prompts). Runs after rules, before builtins. */
  catchAll?: (s: GameState, raw: string) => { then: RuleThen; id?: string } | null;
```

and to `RuleThen`:

```ts
  /** Bonus points (side quests). Awarded once per pointsKey ?? id, never added to score. */
  bonus?: number;
  /** Move back to the room stored in flags['sq.return'] (see RETURN_FLAG) and describe it. */
  returnTo?: true;
```

- [ ] **Step 4: Engine support**

In `src/engine/builtins.ts` add next to `roomIndex`:

```ts
export function roomFromIndex(i: number, world: World): string | undefined {
  return Object.keys(world.rooms)[i];
}
```

and change the `score` case to:

```ts
    case 'score':
      return { state: s, output: [`Score : ${s.score} of ${MAX_SCORE}${s.bonus > 0 ? ` (+${s.bonus} bonus)` : ''}, in ${s.turns} turns.`], outcome: 'meta' };
```

In `src/engine/step.ts`:

```ts
export const RETURN_FLAG = 'sq.return';
```

`newGame` gets `bonus: 0,` after `score: 0,`.

In `applyRule`, after the points block add:

```ts
  const bkey = `bonus.${t.pointsKey ?? r.id}`;
  let bonus = 0;
  if (t.bonus && !state.flags[bkey]) {
    bonus = t.bonus;
    state.bonus += bonus;
    state.flags[bkey] = true;
  }
```

replace the `moveTo` block with:

```ts
  if (t.moveTo && world.rooms[t.moveTo]) {
    state.room = t.moveTo;
    output.push(B.describeRoom(state, world));
  }
  if (t.returnTo) {
    const idx = state.flags[RETURN_FLAG];
    const home = typeof idx === 'number' ? B.roomFromIndex(idx, world) : undefined;
    state.room = home ?? world.start;
    delete state.flags[RETURN_FLAG];
    output.push(B.describeRoom(state, world));
  }
  const changed = points > 0 || bonus > 0 || !!t.set || !!t.give || !!t.remove || !!t.wear || !!t.moveTo || !!t.returnTo;
  let outcome: Outcome = t.outcome ?? (t.moveTo || t.returnTo ? 'move' : changed ? 'success' : 'fail');
```

Export a test seam at the bottom of the file:

```ts
/** Test-only: apply one rule directly. */
export const applyRuleForTest = (s: GameState, r: Rule, world: World) => applyRule(s, r, world, parse(''));
```

In `step()`, after the builtins fallback and before "4. Interactive delay", insert the catch-all:

```ts
    } else {
      const catchAll = room.catchAll?.(base, rawInput);
      if (catchAll) {
        result = applyRule(base, { id: catchAll.id ?? `${base.room}.catchall`, when: { verb: 'unknown' }, then: catchAll.then }, world, parsed);
      } else {
        // 3. Built-in verbs.
        const built = B.handle(base, parsed, world);
        ...existing code...
      }
    }
```

Guard the interactive delay and ambient with the side regions:

```ts
  const inSide = SIDE_REGIONS.has(world.rooms[result.state.room]!.region);
  if (!inSide && (r.room === 'peaks.pass' || r.room === 'peaks.ledge') && ...)   // existing condition
  ...
  if (!inSide && !result.state.dead && !result.state.won && world.ambient) { ... }
```

and, right before `return result;`, keep telemetry in sync:

```ts
  result = { ...result, state: { ...result.state, flags: { ...result.state.flags, bonus: result.state.bonus } } };
  return result;
```

Import `SIDE_REGIONS` from `'../world/types'` and `RETURN_FLAG` is defined locally. Note `notice` is set in Task 3.

- [ ] **Step 5: Run the tests and the whole suite**

Run: `npx vitest run tests/engine-bonus.test.ts && npx tsc -b && npm test && npm run lint:world`
Expected: all green; golden path still 200. (`tests/quirks.test.ts` compares `JSON.stringify(a.flags)` — `bonus` is on both sides, so unchanged() still works.)

- [ ] **Step 6: Commit**

```bash
git add src/engine src/world/types.ts tests/engine-bonus.test.ts
git commit -m "engine: bonus counter, returnTo, side regions, room catchAll, notice"
```

---

### Task 2: Wrappers — intent / insistence / frustration

**Files:**
- Modify: `src/engine/quirks.ts`
- Modify: `src/engine/step.ts` (call `unwrap` before `normalize`)
- Test: `tests/wrappers.test.ts`

**Interfaces:**
- Produces: `export type WrapKind = 'intent' | 'insist' | 'frustrated'`; `export function unwrap(raw: string): { command: string; kind: WrapKind | null }`; flags `wrap.intent`, `wrap.insist`, `wrap.frustrated` (numbers).

- [ ] **Step 1: Write the failing tests**

```ts
// tests/wrappers.test.ts
import { describe, expect, it } from 'vitest';
import { unwrap } from '../src/engine/quirks';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';

describe('unwrap', () => {
  it('strips intent, insistence and frustration wrappers', () => {
    expect(unwrap('I want to get mug')).toEqual({ command: 'get mug', kind: 'intent' });
    expect(unwrap("i'd like to read board")).toEqual({ command: 'read board', kind: 'intent' });
    expect(unwrap('can I get mug?')).toEqual({ command: 'get mug?', kind: 'intent' });
    expect(unwrap('I said get mug')).toEqual({ command: 'get mug', kind: 'insist' });
    expect(unwrap('get mug again')).toEqual({ command: 'get mug', kind: 'insist' });
    expect(unwrap('get mug, dammit')).toEqual({ command: 'get mug', kind: 'frustrated' });
    expect(unwrap('ugh get mug')).toEqual({ command: 'get mug', kind: 'frustrated' });
    expect(unwrap('come on, get mug!')).toEqual({ command: 'get mug!', kind: 'frustrated' });
    expect(unwrap('get mug')).toEqual({ command: 'get mug', kind: null });
    expect(unwrap('wait')).toEqual({ command: 'wait', kind: null });
    expect(unwrap('just')).toEqual({ command: 'just', kind: null }); // a bare wrapper is not a wrapper
  });
});

describe('wrapped commands in play', () => {
  const run = (cmds: string[]) => { let s = newGame(WORLD, 4); const outs: string[][] = []; for (const c of cmds) { const r = step(s, c, WORLD); s = r.state; outs.push(r.output); } return { s, outs, last: outs[outs.length - 1]! }; };
  it('i want to get mug picks up the mug and adds an intent line', () => {
    const { s, last } = run(['i want to get mug']);
    expect(s.inventory).toContain('mug');
    expect(last[0]).toContain('Taken');
    expect(last.length).toBe(2);
    expect(s.flags['wrap.intent']).toBe(1);
  });
  it('i said get mug on a held mug adds an insistence line; with ! also a shout line', () => {
    const a = run(['get mug', 'i said get mug']);
    expect(a.last.length).toBe(2);
    expect(a.s.flags['wrap.insist']).toBe(1);
    const b = run(['get mug', 'I SAID GET MUG!']);
    expect(b.last.length).toBe(3);
  });
  it('the three-way escalation fires on wrapper + ! + third try', () => {
    const { last } = run(['get csv', 'get csv', 'i said get csv!']);
    expect(last.some((l) => /support ticket/i.test(l))).toBe(true);
  });
  it('a wrapped Copilot-style sentence never breaks the golden path commands', () => {
    const { s } = run(['i want to look', 'just wait', 'okay fine, inventory']);
    expect(s.turns).toBe(3);
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run tests/wrappers.test.ts` — Expected: FAIL (`unwrap` not exported).

- [ ] **Step 3: Implement `unwrap` and the pools**

Add to `src/engine/quirks.ts` (below `bangs`):

```ts
export type WrapKind = 'intent' | 'insist' | 'frustrated';

const LEAD: [RegExp, WrapKind][] = [
  [/^(i want to|i wanna|i would like to|i'd like to|can i|could i|may i|let me|i will|i'll|i'm going to|im going to|try to|attempt to|how do i|how about i)\s+/i, 'intent'],
  [/^(i said|i told you|i already said|like i said|as i said|again,?)\s+/i, 'insist'],
  [/^(ugh|argh|omg|come on|seriously|for the love of \w+|dammit|damn it|why won't you|why can't i|please just|just|okay fine|fine|listen|hey)[,!]?\s+/i, 'frustrated'],
];
const TRAIL: [RegExp, WrapKind][] = [
  [/[,!]?\s+(again|already|like i said)\s*([!?.]*)$/i, 'insist'],
  [/[,!]?\s+(dammit|damn it|you idiot|you stupid game|right now|now|please)\s*([!?.]*)$/i, 'frustrated'],
];

/** Strip one leading and/or one trailing wrapper. Keeps the trailing punctuation so bangs() still sees it. */
export function unwrap(raw: string): { command: string; kind: WrapKind | null } {
  let s = raw.trim();
  let kind: WrapKind | null = null;
  for (const [re, k] of LEAD) { const m = re.exec(s); if (m && m[0].length < s.length) { s = s.slice(m[0].length); kind = k; break; } }
  for (const [re, k] of TRAIL) { const m = re.exec(s); if (m && m.index > 0) { s = s.slice(0, m.index) + (m[2] ?? ''); kind = kind ?? k; break; } }
  return { command: s.trim(), kind };
}

const INTENT = [
  'Wanting is noted. Doing is a verb.',
  'You may. You just did.',
  'Ambition logged. Result attached.',
  'The realm does not need your consent form. Just the verb.',
  'Noted: you would like to. The realm would like a star schema. We all have wants.',
];
const INSIST = [
  'You said. The realm heard. The realm is choosing not to.',
  "Saying it again with 'I said' in front does not add a verb.",
  'The narrator was there the first time.',
  "'Again' is not a modifier the parser supports. Neither is 'already'.",
  'Yes. You said. It is in the log. The log is unimpressed.',
];
const FRUSTRATED = [
  'Frustration logged. It does not count toward the 200.',
  "Okay, okay. Same answer, but I'll say it slower.",
  'Ye wish. Ye wish with feeling.',
  'The dragon is not fed by tone.',
  'Deep breaths. The realm has all day. The realm is billed by the second, but it has all day.',
  'The narrator senses frustration. The narrator has a certification in that.',
];
const ALL_THREE = 'All three. Caps, "I said", and a third try. This is a support ticket now.';
```

In `applyQuirks`, add a parameter `kind: WrapKind | null` and, after the shout block:

```ts
  if (kind === 'intent') extra.push(pick(prev, INTENT, 11));
  else if (kind === 'insist') extra.push(pick(prev, INSIST, 12));
  else if (kind === 'frustrated') extra.push(pick(prev, FRUSTRATED, 13));
  if (kind && n > 0 && recent.n >= 3) extra.push(ALL_THREE);
```

and make the repeat block skip its own line when `ALL_THREE` was pushed (`if (!extra.includes(ALL_THREE) && recent.n >= 2 && ...)`).

In `src/engine/step.ts`, at the top of `step()`:

```ts
  const { command, kind } = unwrap(rawInput);
  const recent = nextRecent(prev.recent, command, prev.room);
  const wrapFlags = kind ? { [`wrap.${kind}`]: (Number(prev.flags[`wrap.${kind}`]) || 0) + 1 } : {};
  const base: GameState = { ...prev, turns: prev.turns + 1, recent, flags: { ...prev.flags, ...wrapFlags } };
  const input = normalize(command);
```

and pass `kind` into `applyQuirks(base, command, result, recent, kind)` (bangs must be computed on `command`, which keeps trailing `!`). `parsedEarly.raw` stays `rawInput`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/wrappers.test.ts tests/quirks.test.ts && npm test` — Expected: green. If `tests/quirks.test.ts` "escalates" test changes count because `get csv` ×4 is unaffected by wrappers — it should not.

- [ ] **Step 5: Commit**

```bash
git add src/engine/quirks.ts src/engine/step.ts tests/wrappers.test.ts
git commit -m "chirps: intent / insistence / frustration wrappers with their own pools and telemetry counters"
```

---

### Task 3: Entrance quips on every room

**Files:**
- Modify: `src/engine/step.ts` (emit `notice`), `src/engine/builtins.ts` (`go`)
- Modify: `src/world/village.ts`, `lake.ts`, `monastery.ts`, `fortress.ts`, `peaks.ts` (add `enterQuip` to all 22 rooms)
- Modify: `src/world/lint.ts` (require `enterQuip` on every room)
- Modify: `src/App.tsx` (show `r.notice` in the message box)
- Test: `tests/enter-quips.test.ts`

**Interfaces:**
- Consumes: `Room.enterQuip`, `StepResult.notice` (Task 1).
- Produces: flag `seen.<roomId>` set on first entry; `StepResult.notice` populated on first entry to a room with a quip.

- [ ] **Step 1: Failing tests**

```ts
// tests/enter-quips.test.ts
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';

describe('entrance quips', () => {
  it('every room has one', () => {
    for (const r of Object.values(WORLD.rooms)) expect(typeof r.enterQuip, r.id).toBe('function');
  });
  it('fires as a notice the first time only', () => {
    const s = newGame(WORLD, 1);
    const first = step(s, 'out', WORLD);
    expect(first.notice).toBeTruthy();
    expect(first.state.flags['seen.village.square']).toBe(true);
    const back = step(first.state, 'w', WORLD);
    const again = step(back.state, 'out', WORLD);
    expect(again.notice).toBeUndefined();
  });
  it('the quip is also in the text output', () => {
    const r = step(newGame(WORLD, 1), 'out', WORLD);
    expect(r.output.join('\n')).toContain(r.notice!);
  });
});
```

- [ ] **Step 2: Run to fail** — `npx vitest run tests/enter-quips.test.ts`

- [ ] **Step 3: Engine emits the notice**

In `src/engine/step.ts`, after the phrase/rules/builtins block and before the interactive delay:

```ts
  // 3b. First entry into a room: the narrator's quip goes to the text and to the message box.
  if (result.state.room !== prev.room && !result.state.dead) {
    const dest = world.rooms[result.state.room]!;
    const seenKey = `seen.${dest.id}`;
    if (!result.state.flags[seenKey]) {
      const quip = dest.enterQuip?.(result.state) ?? null;
      result = { ...result, state: { ...result.state, flags: { ...result.state.flags, [seenKey]: true } } };
      if (quip) result = { ...result, output: [...result.output, quip], notice: quip };
    }
  }
```

(`newGame` should also mark `seen.<start>` true so the cottage quip is not shown on turn 1 — the welcome box covers it: add `flags: { [`seen.${world.start}`]: true }` in `newGame`.)

- [ ] **Step 4: Content — one `enterQuip` per room**

Add `enterQuip: () => '…'` to every room. Use these lines (edit freely, keep the voice):

| room | quip |
|---|---|
| village.cottage | `A cottage. A desk. A report. Home, technically.` |
| village.square | `A square. A well. A man with a spreadsheet. You are going to regret the spreadsheet.` |
| village.mill | `The Mill. Deprecated since Q3. Which Q3, nobody says.` |
| village.fields | `Rows of refreshes. Most of them failed overnight. So did you, once.` |
| lake.shore | `The OneLake. One. Lake. They were very clear about the number.` |
| lake.dock | `A dock. A boat. A Ferryman who has been "offline" since the credentials expired.` |
| lake.island | `An island with two keys and a plaque that says CHOOSE. Classic.` |
| swamp.bronze | `Everything here is a string. Including, briefly, you.` |
| swamp.silver | `Silver Marsh. Things have names now. Some of them are wrong, but they have names.` |
| swamp.gold | `Gold Marsh. Clean, modeled, and suspiciously quiet.` |
| monastery.gate | `A gate. A Spark session is starting. It says so. It has said so for a while.` |
| monastery.cloister | `Monks pace in a circle chanting spark dot read. You have entered a loop.` |
| monastery.spark | `The Spark Session Chamber. Warm. Humming. Billed.` |
| monastery.library | `Shelves of deprecated notebooks. One of them is yours. Don't look.` |
| fortress.bridge | `The Moat of T-SQL glitters below. Do not swim. Do not even skim.` |
| fortress.hall | `The Great Hall. Every table is clustered columnstore. Even the dinner ones.` |
| fortress.throne | `The Duke speaks only in JOINs. Try not to be a cross join.` |
| fortress.yard | `The Pipeline Yard. Something is looking at you. It is a Lookup Activity.` |
| peaks.foothills | `The Foothills. The air is thin and the bill is thick.` |
| peaks.pass | `Throttling Pass. Every step costs more than the last one. Like a consultant.` |
| peaks.ledge | `The Bursting Ledge. A door. It only opens for the Worthy. Are you? Be honest.` |
| peaks.shrine | `Uh oh.` |

- [ ] **Step 5: Lint requires it; the UI shows it**

In `src/world/lint.ts` inside the room loop add `if (!room.enterQuip) problems.push(`${room.id}: missing enterQuip`);`.

In `src/App.tsx`, in the notice block (`if (!r.state.dead && !r.state.won) { … }`) add as the first branch:

```ts
      if (r.notice) setNotice({ text: r.notice });
      else if (r.pointsAwarded > 0 || pic) …
```

- [ ] **Step 6: Run everything**

`npx tsc -b && npm test && npm run lint:world` — Expected: green; golden path 200 (quips only add output lines).

- [ ] **Step 7: Commit**

```bash
git add src tests/enter-quips.test.ts
git commit -m "narrator: entrance quips on every room, shown in the message box on first entry"
```

---

### Task 4: Side-quest scaffolding — triggers, entry, exit, lint

**Files:**
- Create: `src/world/sidequests.ts`
- Modify: `src/world/globals.ts` (add trigger phrase rules), `src/world/index.ts` (register rooms), `src/world/lint.ts` (side-region checks)
- Test: `tests/sidequests.test.ts`

**Interfaces:**
- Produces: `enterSideQuest(realm: 'excel' | 'copilot'): (s: GameState, world: World) => string` text factory not needed — instead `SIDEQUEST_ENTRY: Record<'excel'|'copilot', string>` = `{ excel: 'excel.sheet1', copilot: 'copilot.pane' }`; phrase rule ids `sq.enter.excel`, `sq.enter.copilot`, `sq.nested`; global rule `sq.exit` (verbs `go`/`open`/`close`); exit words handled by a phrase rule `sq.exit.words`. Uses `RETURN_FLAG` from Task 1. Rooms for both realms are stubs here (`describe`, `scene: () => 'excel.sheet1'`, etc.) and get real content in Tasks 5–6.

- [ ] **Step 1: Failing tests**

```ts
// tests/sidequests.test.ts
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';

const from = (room: string) => ({ ...newGame(WORLD, 3), room });

describe('side quests: in and out', () => {
  it.each(['village.cottage', 'lake.dock', 'monastery.library', 'fortress.yard', 'peaks.ledge'])('show me a table from %s and exit returns there', (room) => {
    const inn = step(from(room), 'show me a table', WORLD);
    expect(inn.state.room).toBe('excel.sheet1');
    expect(inn.sfx).toBe('sidequest');
    expect(inn.notice).toBeTruthy();
    const out = step(inn.state, 'exit', WORLD);
    expect(out.state.room).toBe(room);
    expect(out.sfx).toBe('sidequest-out');
  });
  it('what are my sales numbers enters Copilot; out returns', () => {
    const inn = step(from('village.square'), 'what are my sales numbers', WORLD);
    expect(inn.state.room).toBe('copilot.pane');
    expect(step(inn.state, 'out', WORLD).state.room).toBe('village.square');
  });
  it('no nesting: a trigger inside the other realm is a joke', () => {
    const inn = step(from('village.square'), 'show me a table', WORLD);
    const nested = step(inn.state, 'what are my sales numbers', WORLD);
    expect(nested.state.room).toBe('excel.sheet1');
    expect(nested.output[0]).toMatch(/one side quest at a time/i);
  });
  it('help jeff in the square is a door into Excel', () => {
    const r = step(from('village.square'), 'help jeff', WORLD);
    expect(r.state.room).toBe('excel.sheet1');
  });
  it('side rooms are never subject to the Peaks delay or Jeff ambient', () => {
    let s = { ...from('village.square'), turns: 2 };
    const r = step(s, 'show me a table', WORLD);
    expect(r.output.some((l) => /Jeff from Finance/.test(l) && /export\?|Excel\?/.test(l))).toBe(false);
  });
});
```

- [ ] **Step 2: Run to fail**

- [ ] **Step 3: Implement**

`src/world/sidequests.ts`:

```ts
import type { GameState } from '../engine/types';
import type { PhraseRule, Room, RuleThen, World } from './types';
import { SIDE_REGIONS } from './types';
import { roomIndex } from '../engine/builtins';
import { RETURN_FLAG } from '../engine/step';

export const SIDEQUEST_ENTRY = { excel: 'excel.sheet1', copilot: 'copilot.pane' } as const;
export type Realm = keyof typeof SIDEQUEST_ENTRY;

export const inSideRealm = (s: GameState, world: World): boolean => SIDE_REGIONS.has(world.rooms[s.room]!.region);

/** The `then` for an entry: remember where we were, warp, sting. */
export function enterThen(realm: Realm, world: World, s: GameState): RuleThen {
  return {
    text: realm === 'excel'
      ? 'The screen goes white. A grid appears. Somewhere, a cell is blinking.'
      : 'A sparkle appears. It would like to help. It would like that very much.',
    set: { [RETURN_FLAG]: roomIndex(s.room, world) },
    moveTo: SIDEQUEST_ENTRY[realm],
    sfx: 'sidequest',
    outcome: 'move',
  };
}

export const EXIT_THEN: RuleThen = { text: 'You close it. The realm is where you left it.', returnTo: true, sfx: 'sidequest-out' };

const NESTED = 'One side quest at a time. This is a peasant, not a pipeline.';

/** Phrase rules that live in globals.phraseRules; they need `world`, so they resolve the text lazily. */
export const SIDEQUEST_PHRASES: PhraseRule[] = [
  { id: 'sq.enter.excel', test: /^(show me (a|the) table|open excel|analy[sz]e in excel|help jeff|talk to jeff about (excel|export|numbers|the numbers)|go with jeff)$/, text: '', dynamic: 'excel' },
  { id: 'sq.enter.copilot', test: /^(what are my sales( numbers)?|show me (my )?sales( numbers)?|copilot|ask copilot|open copilot)$/, text: '', dynamic: 'copilot' },
  { id: 'sq.exit.words', test: /^(exit|leave|close|close excel|close copilot|back|quit excel|quit copilot)$/, text: '', dynamic: 'exit' },
];
export const NESTED_TEXT = NESTED;
```

This needs one engine hook: a `PhraseRule.dynamic?: 'excel' | 'copilot' | 'exit'` field. In `src/engine/step.ts`, where a phrase rule is applied, add before building `result`:

```ts
  if (phrase?.dynamic) {
    const inside = SIDE_REGIONS.has(world.rooms[base.room]!.region);
    if (phrase.dynamic === 'exit') {
      if (!inside) { /* fall through: not a side-quest exit; let builtins/eggs handle "exit" (it is a direction synonym) */ }
      else return finish(applyRule(base, { id: 'sq.exit', when: { verb: 'unknown' }, then: EXIT_THEN }, world, parsed));
    } else if (inside) {
      return finish({ state: base, output: [NESTED_TEXT], outcome: 'snark', stepId: 'sq.nested', pointsAwarded: 0, parsed });
    } else if (!base.dead) {
      return finish(applyRule(base, { id: `sq.enter.${phrase.dynamic}`, when: { verb: 'unknown' }, then: enterThen(phrase.dynamic, world, base) }, world, parsed));
    }
  }
```

where `finish(r)` is the tail of `step()` (quips, entrance notice, ambient, bonus flag) extracted into a local function so both paths share it. Add `dynamic?: 'excel' | 'copilot' | 'exit'` to `PhraseRule` in `src/world/types.ts`. Only `help jeff` / `go with jeff` / `talk to jeff about …` should enter Excel from the **square**: give the phrase rule `room: 'village.square'` by splitting it into two rules (`sq.enter.excel` global with the Excel words; `sq.enter.excel.jeff` with `room: 'village.square'` and the Jeff words).

`out` as a direction inside a side realm: every side room's `exits.out` is the function `(s) => null` and the `go` builtin returns "You can't go that way" — instead, in `builtins.handle` `go` case, before the exits lookup:

```ts
      if (cmd.dir === 'out' && SIDE_REGIONS.has(room.region)) return null; // let the sq.exit.words phrase handle it
```

and add `out` to the exit-words regex. Register the two stub realms in `src/world/index.ts`: `rooms: { ...VILLAGE_ROOMS, ..., ...EXCEL_ROOMS, ...COPILOT_ROOMS }` and `phraseRules: [...SIDEQUEST_PHRASES, ...PHRASE_RULES]` (side-quest phrases first so `exit` wins inside the realms). Stub rooms (replaced in Tasks 5–6) in `src/world/excel.ts` and `src/world/copilot.ts`:

```ts
export const EXCEL_ROOMS: Record<string, Room> = Object.fromEntries([room({
  id: 'excel.sheet1', name: 'Sheet1', region: 'excel', describe: () => 'A spreadsheet.', exits: {}, items: [], npcs: [], rules: [],
  scene: () => 'excel.sheet1', flaskHint: () => 'Try: exit.', enterQuip: () => "Uh oh. You're in a spreadsheet. Cell A1 is blinking. Nobody knows why.",
})]);
```

Lint (`src/world/lint.ts`): for rooms whose region is in `SIDE_REGIONS`, reachability is seeded from `SIDEQUEST_ENTRY` values (add them to `reachable` at the start) and each must have `enterQuip`; also assert no two phrase rules share a `test.source`.

Jeff's square `talk` (in `src/world/npcs.ts`) gains the door line once pacified: append `' The numbers don\'t match. Come look. Please. I have Excel open. (Say: help jeff.)'` to the pacified text.

- [ ] **Step 4: Run tests** — `npx tsc -b && npm test && npm run lint:world`. Playwright is not needed yet.

- [ ] **Step 5: Commit** — `git commit -am "side quests: triggers, entry/exit with return, no-nesting, lint"`

---

### Task 5: Jeff's Excel — content

**Files:**
- Modify: `src/world/excel.ts` (replace stub), `src/world/items.ts` (Excel items), `src/world/npcs.ts` (`jeff-excel`)
- Test: `tests/excel.test.ts`

**Interfaces:**
- Consumes: bonus/returnTo (Task 1), entry (Task 4).
- Produces: flags `excel.connected`, `excel.pivot`, `excel.dim`, `excel.measure`, `excel.filter`, `excel.jeff.asked` (0–3), `sq.excel.done`; rule ids `excel.*`; scene ids `excel.sheet1`, `excel.pivot`, `excel.pivot-1`, `excel.pivot-2`, `excel.pivot-3`, `excel.data`, `excel.data-connected`.

- [ ] **Step 1: Failing tests**

```ts
// tests/excel.test.ts
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';

const play = (cmds: string[], start = 'village.square') => {
  let s = { ...newGame(WORLD, 8), room: start };
  const outs: string[][] = [];
  for (const c of cmds) { const r = step(s, c, WORLD); s = r.state; outs.push(r.output); }
  return { s, outs, last: outs[outs.length - 1]! };
};
const SOLVE = ['show me a table', 'n', 'use analyze in excel', 'use license on connection', 's', 'e', 'create pivot table', 'use sales region', 'use net sales', 'filter by year', 'w', 'show jeff'];

describe("Jeff's Excel", () => {
  it('Jeff explains his method one fact per ask, in order', () => {
    const { outs } = play(['show me a table', 'ask jeff', 'ask jeff', 'ask jeff', 'ask jeff']);
    expect(outs[1]![0]).toMatch(/Sales Amount/);
    expect(outs[2]![0]).toMatch(/Region A/);
    expect(outs[3]![0]).toMatch(/didn't filter/i);
    expect(outs[4]![0]).toMatch(/that's all|nothing else/i);
  });
  it('the connection needs the license; the pivot needs the connection', () => {
    const a = play(['show me a table', 'n', 'use analyze in excel']);
    expect(a.last[0]).toMatch(/sign-?in required/i);
    const b = play(['show me a table', 'e', 'create pivot table']);
    expect(b.last[0]).toMatch(/connect/i);
    expect(b.s.flags['excel.pivot']).toBeUndefined();
  });
  it('the total moves 4.7 → 4.5 → 4.3 → 4.2 as pieces land, in any order', () => {
    const { outs } = play(['show me a table', 'n', 'use analyze in excel', 'use license on connection', 's', 'e', 'create pivot table', 'filter by year', 'use net sales', 'use sales region']);
    expect(outs[7]![0]).toMatch(/4\.5M/); expect(outs[8]![0]).toMatch(/4\.3M/); expect(outs[9]![0]).toMatch(/4\.2M/);
  });
  it('wrong choices are explained, not accepted', () => {
    const { last } = play(['show me a table', 'n', 'use analyze in excel', 'use license on connection', 's', 'e', 'create pivot table', 'use region a']);
    expect(last[0]).toMatch(/legacy/i);
  });
  it('show jeff early: he is not convinced; show jeff done: +20 once and back home', () => {
    const early = play(['show me a table', 'show jeff']);
    expect(early.last[0]).toMatch(/still says 4\.7M/i);
    const done = play(SOLVE);
    expect(done.s.bonus).toBe(20); expect(done.s.score).toBe(0);
    expect(done.s.flags['sq.excel.done']).toBe(true);
    expect(done.s.room).toBe('village.square');
    const again = play([...SOLVE, 'show me a table', 'show jeff']);
    expect(again.s.bonus).toBe(20);
  });
});
```

- [ ] **Step 2: Run to fail**

- [ ] **Step 3: Content**

Items (add to `src/world/items.ts`, all `takeable: false`):
`export` (aliases `sales_export_v7.xlsx`, `xlsx`, `spreadsheet`, `sheet`): *"Sales_export_v7.xlsx. 4.7M at the bottom, in bold, with a border. Jeff formats his mistakes."*; `report-monitor` name `report` (aliases `second monitor`, `monitor`, `published report`): *"The published report on the second monitor. Total Sales: 4.2M. Certified. Jeff has turned it slightly away."*; `ribbon`: *"Home · Insert · Data · Analyze in Excel. The last one is new. Jeff has not clicked it."*; `pivot` (aliases `pivottable`, `pivot table`, `pivottable1`): describe from flags (see below); `field-pane` name `field list` (aliases `fields`, `field pane`, `pane`, `tables`): visible only when connected — lists the three tables and measures exactly as the spec §4.3; `connection` (aliases `odc`, `analyze in excel`, `analyze`, `data connection`): describe "Sign-in required." or "Connected: Sales (Certified)."

NPC `jeff-excel` (name `Jeff`, aliases `jeff`, `jeff from finance`, `finance`): `describe` "Jeff, at his desk, two monitors, one of them turned away. He has the face of a man who has already decided."; `talk`: if `sq.excel.done`: *"Okay. The report was right. Don't tell anyone I said that."*; else if pivot complete: the win line is handled by the rule; else *"The report says 4.2M. My export says 4.7M. One of them is lying and I've decided it's the report."*

Rooms:

```ts
room({
  id: 'excel.sheet1', name: 'Sheet1', region: 'excel',
  describe: (s) => `Sheet1. Grid paper to the horizon. Jeff at his desk. An export, a report on the second monitor, a ribbon. The PivotTable is east; the Data tab is north.${s.flags['sq.excel.done'] ? ' Jeff looks lighter.' : ''}`,
  exits: { e: 'excel.pivot', n: 'excel.data', out: () => null },
  items: ['export', 'report-monitor', 'ribbon'], npcs: ['jeff-excel'],
  scene: () => 'excel.sheet1',
  enterQuip: () => "Uh oh. You're in a spreadsheet. Cell A1 is blinking. Nobody knows why.",
  flaskHint: (s) => !s.flags['excel.connected'] ? 'Ask Jeff what he used. Then go north and connect Analyze in Excel.' : !s.flags['excel.pivot'] ? 'East. Build a pivot on the live model.' : 'Fix the dimension, the measure and the filter, then show Jeff.',
  rules: [
    { id: 'excel.ask-jeff', when: { verb: 'talk', noun: ['jeff', 'finance', 'jeff from finance'], noun2: ['export', 'method', 'numbers', 'what', 'it'] }, then: { text: askJeff } },
    { id: 'excel.ask-jeff-2', when: { verb: 'talk', noun: ['jeff'], flags: [{ flag: 'excel.asked-mode' }] }, then: { text: askJeff } }, // see note
    { id: 'excel.show-jeff-done', when: { verb: ['give','use','talk'].includes('give') ? 'give' : 'give', noun: ['pivot', 'pivottable', 'pivot table', 'it'], noun2: ['jeff'], flags: [{ flag: 'excel.dim' }, { flag: 'excel.measure' }, { flag: 'excel.filter' }] }, then: WIN },
    { id: 'excel.show-jeff-done-talk', when: { verb: 'talk', noun: ['jeff'], flags: [{ flag: 'excel.dim' }, { flag: 'excel.measure' }, { flag: 'excel.filter' }] }, then: { ...WIN } },
    { id: 'excel.show-jeff-early', when: { verb: 'give', noun: ['pivot', 'pivottable', 'pivot table', 'it'], noun2: ['jeff'] }, then: { text: notYet, outcome: 'fail' } },
  ],
}),
```

Because `ask jeff` parses as `talk jeff` with no noun2, implement "one fact per ask" with a counter flag: `askJeff = (s) => { const n = Number(s.flags['excel.jeff.asked']) || 0; return JEFF_FACTS[Math.min(n, 3)]; }` and give those rules `set: { 'excel.jeff.asked': (v) => (Number(v) || 0) + 1 }`. Make `ask jeff` itself hit this rule by adding `'ask jeff'` handling: the parser maps `ask` → `talk`, so a rule `when: { verb: 'talk', noun: ['jeff', …] }` catches all four phrasings — drop the noun2 requirement and the second rule. Order in `rules`: win rules first (flags-gated), then the early "not yet" for `show`/`give`, then ask. `JEFF_FACTS = ["I summed Sales Amount. It's the big column.", "I grouped by Region A. It was the first region column I saw.", "Filters? I didn't filter anything. Filtering is how you lose data.", "That's all. That's the whole method. Why are you writing this down?"]`. `show jeff` parses as `give jeff` (show → give) with no noun2 — add `when: { verb: 'give', noun: ['jeff'] }` variants for both win and early rules. `notYet = (s) => total(s) === '4.2M' ? WIN_TEXT : `Jeff squints. "It still says ${total(s)}." ${hint(s)}` where `total(s)` = `['4.7M','4.5M','4.3M','4.2M'][count of excel.dim/measure/filter]` and `hint` names the missing piece(s) in Jeff's words ("Wrong region column." / "That measure's got Returns in it." / "You didn't filter the year."). `WIN = { text: WIN_TEXT, bonus: 20, pointsKey: 'sq.excel', set: { 'sq.excel.done': true }, sfx: 'bonus', returnTo: true }` with `WIN_TEXT = 'Jeff looks at 4.2M. Jeff looks at his export. Jeff says the words no one at Finance has ever said: "Okay. The report was right."'`.

```ts
room({
  id: 'excel.data', name: 'The Data tab', region: 'excel',
  describe: (s) => s.flags['excel.connected'] ? 'The Data tab. Analyze in Excel: Connected — Sales (Certified). The field list is waiting in the pivot. Sheet1 is south.' : 'The Data tab. A button says Analyze in Excel. A connection file (.odc) says Sign-in required. Sheet1 is south.',
  exits: { s: 'excel.sheet1', out: () => null }, items: ['connection'], npcs: [],
  scene: (s) => (s.flags['excel.connected'] ? 'excel.data-connected' : 'excel.data'),
  enterQuip: () => 'The Data tab. Where the good buttons are kept, away from Jeff.',
  flaskHint: (s) => (s.flags['excel.connected'] ? 'Connected. Go build the pivot east of Sheet1.' : 'Analyze in Excel wants a sign-in. You have a license.'),
  rules: [
    { id: 'excel.connect-try', when: { verb: 'use', noun: ['analyze in excel', 'analyze', 'connection', 'odc', 'data connection'], flags: [{ flag: 'excel.connected', not: true }], notHas: [] }, then: { text: 'Analyze in Excel: Sign-in required. A tiny dialog. A tinier Sign in link.', outcome: 'fail' } },
    { id: 'excel.connect', when: { verb: 'use', noun: ['license', 'card', 'pro license', 'license card'], noun2: ['connection', 'odc', 'analyze in excel', 'analyze', 'dialog', 'sign in'], has: ['license'] }, then: { text: 'You sign in with your Pro license. The connection thinks about it, then: Connected — Sales (Certified). A field list unfolds in the pivot like a map.', set: { 'excel.connected': true }, sfx: 'excel-ding' } },
    { id: 'excel.connect-say', when: { verb: 'say', noun: ['sign in', 'signin', 'login', 'log in'], has: ['license'] }, then: { /* same as excel.connect */ text: '…', set: { 'excel.connected': true }, sfx: 'excel-ding', pointsKey: 'excel.connect' } },
  ],
}),
room({
  id: 'excel.pivot', name: 'PivotTable1', region: 'excel',
  describe: (s) => pivotDescribe(s),
  exits: { w: 'excel.sheet1', out: () => null }, items: ['pivot', 'field-pane'], npcs: [],
  scene: (s) => ['excel.pivot', 'excel.pivot-1', 'excel.pivot-2', 'excel.pivot-3'][pieces(s)]!,
  enterQuip: () => 'PivotTable1. Jeff named it. Jeff names everything 1.',
  flaskHint: (s) => !s.flags['excel.connected'] ? 'Nothing to pivot on until Analyze in Excel is connected (north of Sheet1).' : !s.flags['excel.pivot'] ? 'create pivot table.' : `Missing: ${missing(s).join(', ') || 'nothing — go show Jeff'}.`,
  rules: [
    { id: 'excel.create-pivot-unconnected', when: { verb: 'use', noun: ['pivot', 'pivot table', 'pivottable'], flags: [{ flag: 'excel.connected', not: true }] }, then: { text: 'You could pivot the export again. That is how we got here. Connect Analyze in Excel first (Data tab, north of Sheet1).', outcome: 'fail' } },
    { id: 'excel.create-pivot', when: { verb: 'use', noun: ['pivot', 'pivot table', 'pivottable'], flags: [{ flag: 'excel.connected' }] }, then: { text: 'A blank pivot on the live model. Rows: (none). Values: (none). Filters: (none). It shows 4.7M anyway, out of habit. The field list waits on the right.', set: { 'excel.pivot': true }, sfx: 'excel-ding' } },
    { id: 'excel.dim', when: { verb: 'use', noun: ['sales region', 'sales region column', 'region'], flags: [{ flag: 'excel.pivot' }] }, then: { text: (s) => `Rows: Sales Region. Northeast appears exactly once. The pivot now says ${totalAfter(s, 'excel.dim')}.`, set: { 'excel.dim': true }, sfx: 'excel-ding' } },
    { id: 'excel.dim-wrong', when: { verb: 'use', noun: ['region a', 'region b', 'geography', 'legacy'], flags: [{ flag: 'excel.pivot' }] }, then: { text: "Region A is the legacy column. Jeff's favorite. It has 14 regions and two of them are 'Northeast'.", outcome: 'fail' } },
    { id: 'excel.measure', when: { verb: 'use', noun: ['net sales', 'net sales measure'], flags: [{ flag: 'excel.pivot' }] }, then: { text: (s) => `Values: Net Sales. Returns fall out of the number. The pivot now says ${totalAfter(s, 'excel.measure')}.`, set: { 'excel.measure': true }, sfx: 'excel-ding' } },
    { id: 'excel.measure-wrong', when: { verb: 'use', noun: ['sales amount', 'amount', 'returns'], flags: [{ flag: 'excel.pivot' }] }, then: { text: 'Sales Amount includes Returns. It always did. Jeff never asked.', outcome: 'fail' } },
    { id: 'excel.filter', when: { verb: 'use', noun: ['year', 'current year', 'is current year', 'calendar', 'active', 'filter'], flags: [{ flag: 'excel.pivot' }] }, then: { text: (s) => `Filters: Is Current Year = Yes. Three years of ancient history leave the total. The pivot now says ${totalAfter(s, 'excel.filter')}.`, set: { 'excel.filter': true }, sfx: 'excel-ding' } },
    { id: 'excel.no-filter', when: { verb: 'say', noun: ['no filter', 'no filters'] }, then: { text: 'Jeff, from the next sheet, nods approvingly. That is not a good sign.', outcome: 'fail' } },
  ],
}),
```

`filter by year` parses as verb `unknown` ("filter" is not a verb) — add `filter: 'use'`, `add: 'use'`, `rows: 'use'`, `values: 'use'`, `create: 'use'`, `insert: 'use'` (`insert` already), `connect: 'use'`, `analyze: 'use'`, `pivot: 'use'` to the parser's `VERBS` table in `src/engine/parser.ts`, and `'sign in': 'say'`. `pieces(s)` counts the three flags; `totalAfter(s, flag)` = total with that flag counted; `missing(s)` lists `['Rows: Sales Region', 'Values: Net Sales', 'Filter: Is Current Year']` for unset flags. `pivotDescribe` prints `Rows/Values/Filters` lines from the flags plus the current total.

- [ ] **Step 4: Run tests** — `npx vitest run tests/excel.test.ts && npm test && npm run lint:world`

- [ ] **Step 5: Commit** — `git commit -am "side quest: Jeff's Excel (Analyze in Excel, pivot, show Jeff, +20)"`

---

### Task 6: Copilot — the prompt ladder

**Files:**
- Create: `src/world/copilot-ladder.ts` (pure: `evaluatePrompt`)
- Modify: `src/world/copilot.ts` (replace stub; rooms, gallery, `catchAll`)
- Modify: `src/world/items.ts` (models)
- Test: `tests/copilot.test.ts`

**Interfaces:**
- Produces: `export type Rung = 0|1|2|3|4|5|6|7|8|9|10` (10 = win); `export type LadderResult = { rung: Rung; text: string; hint: string; shape: 'list'|'table'|'raw'|'card'|'text' }`; `export function evaluatePrompt(prompt: string): LadderResult`; flags `copilot.last` (rung number), `copilot.shape` (0 list,1 table,2 raw,3 card,4 text), `sq.copilot.done`; step ids `copilot.rung.N` / `copilot.win`.

- [ ] **Step 1: Failing tests**

```ts
// tests/copilot.test.ts
import { describe, expect, it } from 'vitest';
import { evaluatePrompt } from '../src/world/copilot-ladder';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';

describe('the ladder', () => {
  const cases: [string, number][] = [
    ['sales', 0],
    ['show me the numbers', 1],
    ['show me sales', 2],
    ['show me sales from final2', 3],
    ['show me sales from the certified model', 4],
    ['show me northeast sales from the certified model', 5],
    ['show me q4 northeast sales from the certified model', 6],
    ['show me q4 2025 northeast sales from the certified model', 7],
    ['total q4 2025 northeast sales from the certified model', 8],
    ['total q4 2025 northeast net sales from the certified model by product and by day and by salesperson please', 9],
    ['total q4 2025 northeast net sales from the certified model, just the number', 10],
    ['q4 2025 northeast net sales certified total', 10], // ≤ 14 words counts as "one figure"
  ];
  it.each(cases)('%s → rung %i', (p, rung) => expect(evaluatePrompt(p).rung).toBe(rung));
  it('the winner has the exact figure', () => expect(evaluatePrompt('total q4 2025 northeast net sales from the certified model just the number').text).toContain('$1,247,930'));
  it('a wrong year is assumed to be 2025 and still passes', () => expect(evaluatePrompt('total q4 2019 northeast net sales certified, just the number').text).toMatch(/assumed 2025/i));
  it('over 30 words is summarized to rung 2', () => expect(evaluatePrompt(Array(31).fill('sales').join(' ')).rung).toBe(2));
  it('please gets a You\'re welcome', () => expect(evaluatePrompt('show me sales please').text).toMatch(/You're welcome/));
});

describe('in the pane', () => {
  const at = (cmds: string[]) => { let s = { ...newGame(WORLD, 5), room: 'copilot.pane', flags: { 'sq.return': 1 } }; const outs: string[][] = []; for (const c of cmds) { const r = step(s, c, WORLD); s = r.state; outs.push(r.output); } return { s, outs }; };
  it('any unhandled line is a prompt; ask copilot / say / copilot prefixes are stripped', () => {
    const { outs } = at(['ask copilot show me sales', 'say show me sales', 'copilot show me sales', 'show me sales']);
    for (const o of outs) expect(o[0]).toMatch(/fourteen|14 tables/i);
  });
  it('look/inventory/exit still work as commands', () => {
    const { outs } = at(['look', 'inventory']);
    expect(outs[0]![0]).toMatch(/COPILOT PANE/);
  });
  it('winning awards +25 once and returns home', () => {
    const { s } = at(['total q4 2025 northeast net sales from the certified model, just the number']);
    expect(s.bonus).toBe(25); expect(s.flags['sq.copilot.done']).toBe(true); expect(s.room).toBe('village.square');
  });
  it('frustration wrapper inside the pane adds the feedback line', () => {
    const { outs } = at(['ugh show me sales']);
    expect(outs[0]!.join(' ')).toMatch(/logged it as feedback/i);
  });
  it('the gallery reveals the certified model and its measures', () => {
    const { outs } = at(['e', 'look at models', 'look at measures']);
    expect(outs[1]![0]).toMatch(/Sales \(Certified\)/); expect(outs[2]![0]).toMatch(/Net Sales/);
  });
});
```

- [ ] **Step 2: Run to fail**

- [ ] **Step 3: The ladder (pure)**

```ts
// src/world/copilot-ladder.ts
export type Rung = 0|1|2|3|4|5|6|7|8|9|10;
export type Shape = 'list' | 'table' | 'raw' | 'card' | 'text';
export type LadderResult = { rung: Rung; text: string; hint: string; shape: Shape };
export const SHAPE_INDEX: Record<Shape, number> = { list: 0, table: 1, raw: 2, card: 3, text: 4 };
export const WIN_FIGURE = '$1,247,930';

const has = (p: string, re: RegExp) => re.test(p);
const words = (p: string) => p.trim().split(/\s+/).filter(Boolean).length;

export function evaluatePrompt(raw: string): LadderResult {
  let p = raw.toLowerCase().replace(/[^a-z0-9$_ ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const polite = /\bplease\b/.test(p) ? " You're welcome!" : '';
  const done = (r: Rung, text: string, hint: string, shape: Shape): LadderResult => ({ rung: r, text: text + polite, hint, shape });
  if (words(p) > 30) return done(2, "I've summarized your question to 'sales'. " + FOURTEEN, 'Try: name the semantic model.', 'list');
  if (words(p) < 3) return done(0, 'Could you be more specific? I found 1,204 things.', 'Try: a full sentence.', 'text');
  if (!has(p, /\bsales?\b/)) return done(1, "I can help with that! Here are the top 5 things in your tenant: a lakehouse, a lakehouse, a report named 'test', a lakehouse, and a warehouse called 'DO NOT DELETE'.", 'Try: ask about sales.', 'list');
  const model = has(p, /certified/) ? 'certified' : has(p, /final ?2|final_final|v3/) ? 'final2' : has(p, /do_?not_?use|test/) ? 'test' : null;
  if (!model) return done(2, FOURTEEN, 'Try: name the semantic model.', 'list');
  if (model !== 'certified') return done(3, model === 'final2'
    ? "From Sales_v3_FINAL_final2: Sales: $9,104,220. Note: this model is not endorsed. I picked it because it has the most rows."
    : 'From sales_test_DO_NOT_USE: Sales: $12. The sign said not to. I did anyway.', 'Try: the certified model.', 'table');
  if (!has(p, /north ?east|\bne\b/)) return done(4, 'Total Sales, Sales (Certified): $4,201,377 — all regions. Did you want a region? I can do regions.', 'Try: ask about a region.', 'card');
  if (!has(p, /\bq4\b|fourth quarter|quarter 4/)) return done(5, 'Northeast Sales, all time: $2,933,012. Since 2019. Also some from 2018 that were keyed in late.', 'Try: name a quarter.', 'card');
  const year = /\b(20\d\d)\b/.exec(p)?.[1];
  const yearNote = year && year !== '2025' ? ` (I only have 2019–2025. I've assumed 2025.)` : '';
  if (!year) return done(6, "Q4 Northeast Sales… here are 400 rows. I've included every product, every day, and a column called Column1.", 'Try: which year?', 'raw');
  if (!has(p, /\btotal\b|\bsum\b|how much|\bnumber\b|\bmeasure\b|\bamount\b/)) return done(7, 'You asked for sales. These are the sales. Each one. 400 rows.' + yearNote, 'Try: ask for a total.', 'raw');
  if (!has(p, /net sales/)) return done(8, `Q4 2025 Northeast Sales Amount: $1,331,890. That includes Returns. Returns are $83,960. Just so you know. I didn't subtract them. You didn't ask.${yearNote}`, 'Try: name the right measure.', 'card');
  const single = has(p, /just the number|one number|as a card|only the total|summari[sz]e|single number|the number/) || words(p) <= 14;
  if (!single) return done(9, 'Q4 2025 Northeast Net Sales, Sales (Certified) — by product, by day, by salesperson, pivoted, 3 pages.' + yearNote, 'Try: just the number.', 'table');
  return done(10, `Q4 2025 Northeast Net Sales, Sales (Certified): ${WIN_FIGURE}.${yearNote}`, '', 'card');
}

const FOURTEEN = 'I found 14 tables with "sales" in the name across 3 semantic models: Sales, Sales_2, SalesFact, Sales Fact, sales_bronze, sales_silver, sales_gold, Sales (old), Sales (older), Sales_v3, Sales_v3_FINAL, Sales_v3_FINAL_final2, sales_test, and Sales. Which one?';
```

- [ ] **Step 4: Rooms with `catchAll`**

```ts
// src/world/copilot.ts
const PROMPT_PREFIX = /^(ask copilot( to| for)?|copilot,?|say|tell copilot( to)?|hey copilot,?)\s+/i;
function reply(s: GameState, raw: string): RuleThen {
  const prompt = raw.replace(PROMPT_PREFIX, '').trim();
  const r = evaluatePrompt(prompt);
  const frustrated = /^(ugh|argh|omg|come on|seriously|dammit|damn it|why won't you|why can't i|please just|just|fine|okay fine|listen|hey)\b/i.test(raw) || /(dammit|damn it|you idiot|you stupid game|right now)[!?.]*$/i.test(raw);
  const feedback = frustrated ? ' I sense frustration. I have logged it as feedback.' : '';
  const hint = r.hint ? `\n[Copilot suggests: ${r.hint}]` : '';
  const base: RuleThen = { text: `Copilot: ${r.text}${feedback}${hint}`, set: { 'copilot.last': r.rung, 'copilot.shape': SHAPE_INDEX[r.shape] }, sfx: 'copilot-think', outcome: r.rung === 10 ? 'success' : 'fail' };
  if (r.rung === 10) return { ...base, bonus: 25, pointsKey: 'sq.copilot', set: { ...base.set, 'sq.copilot.done': true }, sfx: 'bonus', returnTo: true };
  return base;
}
```

The pane room: `catchAll: (s, raw) => (isCommandWord(raw) ? null : reply(s, raw))` where `isCommandWord` returns true when the parsed verb is a known verb that is **not** `say` and the line does not start with a Copilot prefix (so `look`, `inventory`, `e`, `exit`, `get ye flask` keep working; `say …`, `ask copilot …`, `copilot …` and unknown-verb lines become prompts). Because `catchAll` runs after rules and builtins would otherwise catch `say`, add a room rule `{ id: 'copilot.say', when: { verb: 'say' }, then: … }` — rules can't call `reply` with the raw line, so instead make `step()` consult `catchAll` **before** builtins for verbs `say`/`talk`/`unknown` only (Task 1's insertion point; extend the condition: `if (room.catchAll && (parsed.verb === 'say' || parsed.verb === 'unknown' || (parsed.verb === 'talk' && /copilot/.test(lower))))`). Step id: `copilot.rung.${rung}` or `copilot.win` — set by returning `then` with an `id` hint: extend the catchAll contract to `{ then: RuleThen; id?: string }` and use `id ?? \`${room}.catchall\``.

Gallery room: items `model-final2`, `model-test`, `model-certified` (names as in spec; `look at models` → item `models` listing all three with the badge on the certified one; `look at measures`/`look at certified` → "Net Sales · Sales Amount · Returns. Net Sales is the one with the checkmark next to it. The checkmark was earned."). Exits `w: 'copilot.pane'`, `out: () => null`. `enterQuip: 'Three models on plinths. One has a badge. The badge is not decorative.'`

Pane room: `describe`: "The Copilot Pane. A prompt box glows softly. Above it, your last answer${lastShape}. The Model Gallery is east." `enterQuip` per spec. `flaskHint`: names the current rung's hint (`copilot.last`).

- [ ] **Step 5: Run tests** — `npx vitest run tests/copilot.test.ts && npm test && npm run lint:world`

- [ ] **Step 6: Commit** — `git commit -am "side quest: Copilot prompt ladder (+25), model gallery"`

---

### Task 7: Sounds, status bar, flash, bonus in the UI and Hall of Fame

**Files:**
- Modify: `src/game/sfx.ts` (cues `sidequest`, `sidequest-out`, `excel-ding`, `copilot-think`, `bonus`)
- Modify: `src/ui/PlayScreen.tsx` (bonus in status bar, `data-region`, flash), `src/ui/styles.css`, `src/ui/FinishScreen.tsx`, `src/ui/TitleScreen.tsx`
- Modify: `src/App.tsx` (pass `bonus` to finish/record), `src/game/recorder.ts` (`bonus` in `FinishRecord`/`HallEntry`, orderBy), `rayfin/data/HallOfFame.ts` (`bonus` column + include)
- Test: `e2e/smoke.spec.ts` (new test), manual `rayfin up` later (Task 9)

- [ ] **Step 1: Cues**

In `src/game/sfx.ts` extend `Cue` with `'sidequest' | 'sidequest-out' | 'excel-ding' | 'copilot-think' | 'bonus'` and add to `CUES`:

```ts
  // the side-quest sting: doot doot DOOOT, with a bass hit under the last one
  sidequest: [[G4, 90], [0, 30], [G4, 90], [0, 30], [C5, 90], [E5, 90], [G5, 90], [C6, 520, 'square', 0.16], [C3, 520, 'triangle', 0.2]],
  'sidequest-out': [[C6, 90], [G5, 90], [E5, 90], [C5, 90], [0, 30], [G4, 90], [0, 30], [G4, 260]],
  'excel-ding': [[E5, 60, 'triangle', 0.14], [G5, 160, 'triangle', 0.14]],
  'copilot-think': [[C5, 50, 'triangle', 0.1], [E5, 50, 'triangle', 0.1], [G5, 50, 'triangle', 0.1], [0, 80], [C5, 50, 'triangle', 0.1], [E5, 50, 'triangle', 0.1], [G5, 50, 'triangle', 0.1]],
  bonus: [[C5, 60], [E5, 60], [G5, 60], [C6, 60], [E6 ?? 1318.51, 60], [G6 ?? 1567.98, 300, 'square', 0.16]],
```

(add `const E6 = 1318.51, G6 = 1567.98;` next to the other frequencies; the two notes play simultaneously only if scheduled at the same `t` — for the bass under the sting, schedule notes with `ms` 0 offset: extend `play()` so a note with `wave === 'triangle'` immediately following a note with the same `ms` starts at the same time: simplest is a fourth tuple field `together?: boolean`; implement as `[freq, ms, wave, gain, together]` and in `play()` do `if (!together) t += dur + 0.012;` after scheduling, using the *previous* note's start for a `together` note.)

- [ ] **Step 2: Status bar, flash, region colors**

`PlayScreen.tsx`: `<span>Score : {score} of {maxScore}{state.bonus > 0 ? ` +${state.bonus}` : ''}</span>`; root div gets `data-region={room.region}`; accept a new prop `flash: boolean` and render `<ScenePanel … className={flash ? 'flash' : ''}>` (ScenePanel takes an optional `className` merged onto `.scene`). In `App.tsx`, when `r.sfx === 'sidequest'`, `setFlash(true)` and clear it after 300 ms with `setTimeout`.

`styles.css`:

```css
.play[data-region="excel"] .statusbar { background: #1d6f42; color: #fff; }
.play[data-region="copilot"] .statusbar { background: #6b4fbb; color: #fff; }
.scene.flash::after { content: ''; position: absolute; inset: 0; background: #fff; animation: sqflash 260ms steps(3, end) forwards; pointer-events: none; }
@keyframes sqflash { from { opacity: 1; } to { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .scene.flash::after { animation: none; display: none; } }
```

- [ ] **Step 3: Bonus through to the Hall of Fame**

`rayfin/data/HallOfFame.ts`: add `@int({ optional: true }) bonus?: number;` and `'bonus'` to the anonymous read `include` list. `recorder.ts`: `FinishRecord` gains `bonus: number`; `HallEntry` gains `bonus: number` (default 0 when null); `finish()` sends `bonus: f.bonus`; `hallOfFame()` selects `bonus` and orders `{ score: 'desc', bonus: 'desc', turns: 'asc' }`. `App.tsx` `submitScore` passes `bonus: state.bonus`. `FinishScreen.tsx` summary: `Score {score} / {maxScore}{bonus > 0 ? ` · +${bonus} bonus` : ''} · {turns} turns · {fmt(elapsed)}` (new prop `bonus`), and list rows `{h.score} pts{h.bonus ? ` +${h.bonus}` : ''}`; same row format in `TitleScreen.tsx`.

- [ ] **Step 4: Playwright**

Append to `e2e/smoke.spec.ts`:

```ts
test('side quest: sting, flash, green status bar, quip, and exit', async ({ page }) => {
  await boot(page);
  await page.getByLabel('Your name').fill('Tester'); await page.keyboard.press('Enter'); await page.keyboard.press('Enter');
  const cmd = page.getByLabel('Command');
  await cmd.fill('show me a table'); await page.keyboard.press('Enter');
  await expect(page.locator('.play')).toHaveAttribute('data-region', 'excel');
  await expect(page.getByRole('dialog')).toContainText('spreadsheet');
  await page.keyboard.press('Enter');
  await cmd.fill('exit'); await page.keyboard.press('Enter');
  await expect(page.locator('.play')).toHaveAttribute('data-region', 'village');
  await expect(page.locator('.textwin')).toContainText('YOUR COTTAGE');
});
```

- [ ] **Step 5: Run** — `npx tsc -b && npm test && CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run e2e`

- [ ] **Step 6: Commit** — `git commit -am "side quests: sting/flash/region colors, bonus in status bar, finish screen and Hall of Fame"`

---

### Task 8: Scenes

**Files:**
- Create: `src/scenes/excel.tsx`, `src/scenes/copilot.tsx`
- Modify: `src/scenes/index.tsx` (register 7 + 2 ids), `src/ui/ScenePanel.tsx` (`REGION_BG` entries `excel: ['#ffffff', '#1d6f42']`, `copilot: ['#f3f2f1', '#6b4fbb']`)
- Test: `tests/world-lint.test.ts` already asserts every room's `scene()` id exists in `SCENES` — if not, add: `for (const r of Object.values(WORLD.rooms)) expect(SCENES[r.scene(state)], r.id).toBeDefined()` for the all-true and all-false lint states.

- [ ] **Step 1: Excel scenes** — using the `kit` helpers (`Scene`, `R`, `L`, `Label`, `Sprite`): a white sheet with a light-grey grid (`L` lines every 32 px horizontally / 20 px vertically), a green ribbon bar `R x=0 y=0 w=320 h=22 f='#1d6f42'` with `Label`s Home · Insert · Data · Analyze in Excel, column letters A–I and row numbers 1–8 in dark grey, one red `#REF!` cell, and:
  - `excel.sheet1`: Jeff sprite (reuse the village Jeff `Sprite` rows if exported; otherwise a 12×16 figure at a desk) at left, two monitor rectangles (one turned: a narrow parallelogram via `P`), an export cell block bottom-left reading `4.7M` in bold.
  - `excel.data`: a big button `Analyze in Excel` and a small dialog "Sign-in required"; `excel.data-connected`: the dialog replaced by a green "Connected — Sales (Certified)".
  - `excel.pivot`, `-1`, `-2`, `-3`: a pivot block (Rows/Values/Filters lines) whose total reads `4.7M / 4.5M / 4.3M / 4.2M` and a field pane on the right (`R x=220 y=26 w=96 h=170 f='#f8f8f8'`) listing `Geography (legacy)`, `Sales Region`, `Calendar`, `Measures` with their fields as tiny `Label`s; the pieces already chosen are drawn in green.
- [ ] **Step 2: Copilot scenes** — `copilot.pane`: light-grey canvas, a rounded input bar at the bottom (`R` with `rx`; extend `R` to accept `rx`), a four-point sparkle (`P` with 8 points) top-left, and a reply bubble whose content depends on `state.flags['copilot.shape']`: `list` = five short lines, `table` = a 4×3 grid, `raw` = a dense 8×6 grid with a scrollbar, `card` = one big number box, `text` = one line; a suggestion chip under the bubble. `copilot.gallery`: three plinths (reuse `Pedestal`) with model names and a gold badge on the third.
- [ ] **Step 3: Register** in `src/scenes/index.tsx` and run `npm test`; screenshot each via a throwaway Playwright script and eyeball it.
- [ ] **Step 4: Commit** — `git commit -am "scenes: Jeff's Excel and Copilot"`

---

### Task 9: The Fortress becomes the Semantic Model Keep

**Files:**
- Modify: `src/world/fortress.ts` (all five rooms; `fortress.model` is new), `src/world/items.ts` (`policy` replaces `cable`; `refresh` replaces `copy`), `src/world/npcs.ts` (`duke` → Duke of DAX text; `lookup` → `card`; new `cardinality`), `src/engine/parser.ts` (verbs `fold`, `merge`, `align`, `bookmark`, `hide`, `mark`, `format`, `knock`, `fish`, `sit` map to `use`/`say` as noted), `src/scenes/fortress.tsx` (+ `Model` scene), `src/scenes/index.tsx`
- Modify: `tests/golden-path.json`, `tests/golden-path.test.ts` (turn count 61), `docs/ledger.md` (Task 11 does the doc)
- Test: `tests/fortress.test.ts`

**Interfaces:**
- Consumes: `enterQuip` (Task 3), `vary`/chirps (existing).
- Produces: rule ids `fortress.*` (all existing ids kept where the step is the same: `fortress.sku`, `fortress.moat`, `fortress.stare*`, `fortress.copy` — the boots step keeps its `pointsKey: 'fortress.copy'` so the ledger doc stays valid); new room `fortress.model`; items `policy`, `refresh`; NPCs `card`, `cardinality`; scene ids `fortress.model`, and the existing `fortress.yard*` variants renamed to `fortress.studio*` (update `scene()` and `SCENES`).

- [ ] **Step 1: Failing tests**

```ts
// tests/fortress.test.ts
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';

const play = (cmds: string[], start: string, flags: Record<string, boolean | number> = {}) => {
  let s = { ...newGame(WORLD, 6), room: start, flags: { ...flags } };
  const outs: string[][] = [];
  for (const c of cmds) { const r = step(s, c, WORLD); s = r.state; outs.push(r.output); }
  return { s, outs, last: outs[outs.length - 1]! };
};

describe('Semantic Model Keep', () => {
  it('the hall opens west into the Model View, which holds the policy', () => {
    const { s, last } = play(['w', 'get policy'], 'fortress.hall');
    expect(s.room).toBe('fortress.model');
    expect(s.inventory).toContain('policy');
    expect(last[0]).toMatch(/incremental/i);
  });
  it('the Duke of DAX still throws SQL into the moat (+25, trial)', () => {
    const { s, last } = play(['say select *'], 'fortress.throne', { 'fortress.sku': true });
    expect(s.score).toBe(25);
    expect(s.flags['trial.moat']).toBe(true);
    expect(last[0]).toMatch(/IN MY MODEL/);
    expect(s.room).toBe('fortress.bridge');
  });
  it('DAX words get DAX answers', () => {
    for (const [c, re] of [['say calculate', /context transition/i], ['say sumx', /iterates/i], ['say divide', /zero/i], ['say filter context', /which one/i]] as const) {
      expect(play([c], 'fortress.throne').last[0]).toMatch(re);
    }
  });
  it('the Card is out-stared and the Big Refresh drops the boots', () => {
    const { s, outs } = play(['look at card', 'wait', 'wait', 'use policy on refresh', 'wear boots'], 'fortress.yard', {});
    expect(outs[2]![0]).toMatch(/blinks/i);
    expect(s.score).toBe(10); // stare only — boots need the policy
    const withPolicy = play(['use policy on refresh', 'wear boots'], 'fortress.yard');
    // no policy in inventory → refused
    expect(withPolicy.s.worn).not.toContain('boots');
    let t = { ...newGame(WORLD, 6), room: 'fortress.yard', inventory: ['license', 'policy'] };
    const r = step(t, 'use policy on refresh', WORLD);
    expect(r.state.inventory).toContain('boots');
    expect(r.state.score).toBe(15);
  });
  it('report-design and power-query and model-view commands all have their own answers', () => {
    expect(play(['add slicer'], 'fortress.yard').last[0]).toMatch(/nine slicers/i);
    expect(play(['fold query'], 'fortress.hall').last[0]).toMatch(/Changed Type/);
    expect(play(['many to many'], 'fortress.model').last[0]).toMatch(/Both/);
    expect(play(['talk to sir cardinality'], 'fortress.model').last[0]).toMatch(/One\. To\. Many\./);
  });
  it('the golden path still scores 200', async () => {
    const path = (await import('./golden-path.json')).default as string[];
    let s = newGame(WORLD, 42);
    for (const c of path) s = step(s, c, WORLD).state;
    expect(s.score).toBe(200);
    expect(s.won).toBe(true);
  });
});
```

- [ ] **Step 2: Run to fail** — `npx vitest run tests/fortress.test.ts`

- [ ] **Step 3: Items and NPCs**

In `src/world/items.ts` replace `cable` with:

```ts
  item({
    id: 'policy', name: 'incremental refresh policy', aliases: ['policy', 'incremental refresh', 'refresh policy', 'incremental', 'the policy'],
    takeable: true,
    describe: "An incremental refresh policy on a laminated card: 'Refresh rows from the last 10 days. Archive the rest.' Small steps. Bursting steps, one might say.",
  }),
```

replace the Copy Activity item (`copy`) with:

```ts
  item({
    id: 'refresh', name: 'the Big Refresh', aliases: ['refresh', 'big refresh', 'progress bar', 'refresh bar', 'the refresh'],
    takeable: false, untakeableText: 'It is 97% of the way through 2019. Leave it.',
    describe: (s) => (s.flags['pts.fortress.copy'] ? 'The Big Refresh: complete. It took ten days at a time and finished in a minute. Nobody learns from this.' : 'A progress bar, 97%, since 2019. It is refreshing everything, every time, all at once. It needs smaller steps.'),
  }),
```

and add a `pie`, `slicers`, `canvas` (Studio scenery) and `splash` (Gate) and `steps`, `custom1` (Hall) and `bridge-m2m` name `bridge` (Model) as non-takeable scenery with the describe texts in spec §12.1.

In `src/world/npcs.ts`: `duke` → name `the Duke of DAX`, aliases `duke`, `duke of dax`, `the duke`; `describe`: "The Duke of DAX on a throne of nested CALCULATEs. He speaks only in filter context. He has never once used SQL and would like that in writing."; `talk`: "'CALCULATE(,' says the Duke, and waits. He is waiting for your filter argument. He will wait forever." (after the moat: "The Duke pretends not to see you. You smell like his basement."). Replace `lookup` with `card` (name `the Card visual`, aliases `card`, `card visual`, `blank`, `the card`): describe from stare flags as the Lookup did ("(Blank). It shows (Blank). It has always shown (Blank)." → "It blinks. A number appears. It is wrong, but it is a number."); `talk`: "The Card says (Blank). It is not being rude. It has no measure." Add `cardinality` (name `Sir Cardinality`, aliases `sir cardinality`, `cardinality`, `knight`, `sir`): describe "A knight with one eyebrow permanently raised. He has seen your relationships."; `talk` cycles the three lines from spec §12.1 using flag `cardinality.asked`.

- [ ] **Step 4: Rooms**

Rewrite `src/world/fortress.ts`. Keep every existing scored rule (`fortress.sku*`, `fortress.moat`, `fortress.stare-start/-wait-1/stare`) with new text; keep `fortress.north-closed`/`open-bridge`/`swim-moat`. New/changed pieces:

```ts
room({
  id: 'fortress.bridge', name: 'Power BI Desktop Gate', region: 'fortress',
  describe: (s) => `The gate of the Semantic Model Keep. The drawbridge is a splash screen: "Power BI Desktop is updating (1 of 3)". A guard leans over the battlements. Below, the Moat of T-SQL — the Warehouse the Keep was built on — glitters with semicolons.${s.flags['fortress.sku'] ? ' The splash screen has finished. The bridge is down. North is open.' : ''} The foothills are south.`,
  enterQuip: () => 'Power BI Desktop. It is updating. It will be updating when you leave.',
  ...existing exits/items/rules, plus:
  { id: 'fortress.update', when: { verb: 'use', noun: ['update', 'splash', 'splash screen', 'installer'] }, then: { text: 'The update installs. Then another. The drawbridge does not move. This is the update.', outcome: 'fail' } },
  { id: 'fortress.sku-pro-ppu', when: { verb: 'say', noun: ['pro', 'ppu', 'premium', 'premium per user'] }, then: { text: 'The guard: "Pro gets you a report. It does not get you a Keep."', outcome: 'fail' } },
}),
room({
  id: 'fortress.hall', name: 'Power Query Hall', region: 'fortress',
  describe: () => 'A long hall of Applied Steps. Every doorway is a Changed Type. Portraits of Source, Navigation and a step called Custom1 that nobody remembers. The Duke\'s chamber is north; the Report Studio, east; the Model View, west; the gate, south.',
  exits: { s: 'fortress.bridge', n: 'fortress.throne', e: 'fortress.yard', w: 'fortress.model' },
  items: ['steps', 'custom1'], npcs: [],
  enterQuip: () => 'A hall of Applied Steps. Every door is a Changed Type.',
  flaskHint: () => 'Nothing to solve here. West has a model and a policy; north has a Duke; east has a canvas.',
  rules: [
    { id: 'fortress.fold', when: { verb: 'use', noun: ['fold', 'query folding', 'folding', 'query'] }, then: { text: 'You attempt to fold. The step before you is Changed Type. Folding stops here, as it always has.', outcome: 'fail' } },
    { id: 'fortress.changed-type', when: { verb: 'say', noun: ['changed type'] }, then: { text: 'Changed Type. Changed Type. Changed Type. The hall echoes it back. It is the hall\'s only word.', outcome: 'snark' } },
    { id: 'fortress.remove-columns', when: { verb: 'use', noun: ['remove columns', 'remove other columns', 'columns'] }, then: { text: 'You remove other columns. The hall grows shorter. So does your refresh.', outcome: 'fail' } },
    { id: 'fortress.buffer', when: { verb: 'use', noun: ['buffer', 'table.buffer'] }, then: { text: 'Table.Buffer. The hall holds its breath. Nothing is faster. Everything is in memory.', outcome: 'fail' } },
    { id: 'fortress.merge', when: { verb: 'use', noun: ['merge', 'merge queries', 'append'] }, then: { text: 'You merge queries. Left outer. It is always left outer.', outcome: 'fail' } },
    { id: 'fortress.advanced-editor', when: { verb: 'open', noun: ['advanced editor', 'editor', 'm'] }, then: { text: 'The Advanced Editor opens. It is a wall of let. You close it gently.', outcome: 'fail' } },
  ],
}),
room({
  id: 'fortress.model', name: 'The Model View', region: 'fortress',
  describe: (s) => `Tables float on plinths, joined by relationship lines. One many-to-many bridge wobbles. A date table sits unmarked. Sir Cardinality guards the diagram${s.flags['taken.policy'] ? '' : '. On a lectern: an incremental refresh policy'}. The hall is east.`,
  exits: { e: 'fortress.hall' }, items: ['policy', 'bridge'], npcs: ['cardinality'],
  scene: () => 'fortress.model',
  enterQuip: () => 'Tables float on plinths, joined by lines. One line wobbles. Everyone pretends not to see it.',
  flaskHint: (s) => (s.flags['taken.policy'] ? 'The policy is for the Big Refresh in the Studio, east then east.' : 'Take the policy. Small steps beat big refreshes.'),
  rules: [
    { id: 'fortress.relationship', when: { verb: 'use', noun: ['relationship', 'relationships'] }, then: { text: 'Between which tables? Sir Cardinality raises an eyebrow. Both eyebrows. He has many-to-many eyebrows.', outcome: 'fail' } },
    { id: 'fortress.m2m', when: { verb: 'say', noun: ['many to many', 'bidirectional', 'both directions', 'both'] }, then: { text: 'You set it to Both. The model sighs. Somewhere a measure becomes ambiguous. Sir Cardinality writes your name down.', outcome: 'fail' } },
    { id: 'fortress.single', when: { verb: 'say', noun: ['single direction', 'one to many', 'single'] }, then: { text: 'Single direction, one to many. Sir Cardinality nods once. It is the only time he will nod.', outcome: 'success' } },
    { id: 'fortress.date-table', when: { verb: 'use', noun: ['date table', 'mark as date table', 'calendar'] }, then: { text: 'You mark the date table as a date table. Time intelligence, which had been sulking, starts working. No points. It should have been done already.', set: { 'model.date': true } } },
    { id: 'fortress.hide', when: { verb: 'use', noun: ['hide', 'hide column', 'key column', 'key'] }, then: { text: 'You hide the key column. It is still there. It is always still there.', outcome: 'fail' } },
  ],
}),
```

Throne: keep `fortress.moat` (text → `"'SELECT STAR?' The Duke rises. 'SQL? IN. MY. MODEL?' Two guards seize you by the arms and hurl you from the window into the Moat of T-SQL below — the Warehouse this whole Keep was built on. You surface, sputtering, covered in semicolons and something that might be a CROSS APPLY. You climb out. You will never not smell like this."`), keep `select1`/`select-cols`/`say-join` (join text: "'JOINs,' says the Duke, 'are for the moat.'"), `attack-duke`, `sit-throne`; add the DAX rules from spec §12.1 as `say` rules (`fortress.dax-calculate`, `-sumx`, `-divide`, `-filter`, `-measure`, `-context`, `-all`) and `fortress.write-measure` (`use measure`). Yard → Studio: `name: 'The Report Studio'`, describe with the pie/card/slicers/Big Refresh; `npcs: ['card']`; `items: ['refresh', 'pie', 'slicers', 'canvas', ...boots when dropped]`; replace `fortress.copy` `when` with `{ verb: 'use', noun: ['policy', 'incremental refresh', 'refresh policy', 'incremental'], noun2: ['refresh', 'big refresh', 'progress bar', 'refresh bar'], has: ['policy'] }` and text "You hand the Big Refresh a policy: ten days at a time. It blinks. It finishes 2019. Then 2020. Then all of it, in a minute, in small bursting steps. Something falls out of the progress bar: a pair of boots." (`give` variant `fortress.copy-give` likewise; `fortress.copy-nocable` → `fortress.copy-nopolicy` with text "The Big Refresh looks at you. 97%. It needs a policy, not encouragement."); `fortress.use-copy` → `fortress.use-refresh` ("You click Refresh. It was already refreshing. It is now refreshing harder."); the stare rules reference the `card` NPC (`noun: ['card', 'card visual', 'blank', 'the card']`), texts: start "You look at the Card. It shows (Blank). It looks back. Neither of you blinks."; wait-1 "Still (Blank). Your eyes water. The Card's do not; it has none."; stare "The Card blinks. A number appears: 4.2M. It is wrong, but it is a number. You win."; and the Studio quirks (`add slicer`, `align`, `bookmark`, `conditional formatting`, `performance analyzer`, `format`, `fix pie`/`use bar chart on pie`) as rules with the §12.1 texts. Parser additions (`src/engine/parser.ts` VERBS): `fold: 'use'`, `merge: 'use'`, `align: 'use'`, `distribute: 'use'`, `bookmark: 'use'`, `hide: 'use'`, `mark: 'use'`, `format: 'use'`, `fix: 'use'`, `add: 'use'`, `write: 'use'`, `knock: 'use'`, `fish: 'use'`, `sit: 'use'`, `update: 'use'`, `install: 'use'`, `buffer: 'use'`, `remove: 'use'`. (`sit` and `fish` currently hit phrase eggs first — phrase rules run before room rules, so give the Lake House / Studio rules precedence by adding `room:` scoping to the existing `egg.sit` … no: simpler, make the room rules phrase rules with `room: 'lake.house'` placed *before* the global eggs in `PHRASE_RULES`.)

- [ ] **Step 5: Geography — the Keep comes before the swamp (spec §15)**

`fortress.model` exits: `{ e: 'fortress.hall', n: 'monastery.gate' }`; its describe ends "The hall is east; a back gate, north, opens onto the Monastery." `monastery.gate` exits gain `s: 'fortress.model'` and its describe adds "South, the Keep's back gate." `village.square` prophecy text (rule `village.prophecy`) gains a third line of handwriting: `"the monks are behind the Keep"`. Flask hints: `village.square` after the prophecy → "Three roads. East past the Fields is the Keep; the monks are behind it. The Lake can wait."; `village.fields` → "East. The Keep."

- [ ] **Step 5b: Golden path, re-sequenced**

Replace `tests/golden-path.json` (and `GOLDEN_PATH` in `tests/golden-path.ts`) with this order — village, Keep, monastery, back, lake, swamp, shortcut, peaks:

```json
["look","get mug","read report","out","read board","give mug to jeff","n","talk to miller","s",
 "e","e","n","say trial","n","n","say select *","n","w","get policy","e","e","look at card","wait","wait","use policy on refresh","wear boots","w","w",
 "n","wait","wait","wait","n","w","give license to librarian","read scroll","e","e","use scroll on notebook","w","talk to abbot","wear hoodie",
 "s","s","e","s","s","w","w",
 "s","e","give credentials to ferryman","board boat","get standard key","board boat","w","s","s","s","get shortcut","use shortcut",
 "e","e","e","n","n","say star schema","get model"]
```

Walk it in the terminal (`npm run replay -- tests/golden-path.json`) and fix any exit that does not line up (the Keep → village return is model `e` hall `s` bridge `s` foothills `w` fields `w` square: `"s","s","e"…` above must be replaced by the actual sequence `"e","s","s","w","w"` — verify against `describeRoom`). Then set the expected turn count in `tests/golden-path.test.ts` to the replay's final `turns`, and `expect(s.score).toBe(200)` must hold. Also update the "59 turns" mentions in `docs/ledger.md` and `README.md` (Task 11).

- [ ] **Step 5c: The old Fortress section edit is superseded** — ignore the two-line diff that follows; the full path above is canonical.

Edit `tests/golden-path.json`: replace the Fortress section

```
"n", "say trial", "n", "n", "say select *", "n", "e", "look at lookup", "wait", "wait", "get cable", "use cable on copy activity", "wear boots", "w", "s", "s",
```
with
```
"n", "say trial", "n", "n", "say select *", "n", "w", "get policy", "e", "e", "look at card", "wait", "wait", "use policy on refresh", "wear boots", "w", "s", "s",
```

and in `tests/golden-path.test.ts` change the expected turn count from 59 to **61** (if asserted). Update `tests/golden-path.ts` (`GOLDEN_PATH`) identically.

- [ ] **Step 5d: Failure modes, gifts and examinables (spec §17)**

Add to the Keep rooms:
- Duke's chamber: `fortress.dax-good` `{ when: { verb: 'say', nounMatches: /(calculate.*filter|sumx|var .*return)/ }, then: { text: "The Duke nods. 'Correct.' A spinner appears. The spinner is still there.", set: { 'dax.spinner': 1 } } }`; `fortress.dax-wait-1/2` on `wait` while `dax.spinner` is 1 / 2 ("Still spinning. The Duke hums a measure.") and `fortress.dax-timeout` on the third wait: "Visual has exceeded the available resources. The Duke: 'Correct, though.'" with `set: { 'dax.spinner': 0, 'stare.done': false }` (the Card in the Studio reverts to (Blank) — describe reads the flag). `fortress.directquery` / `fortress.directlake` / `fortress.publish` / `fortress.label` as `say`/`use` rules in `globalRules` scoped by a `flags` check on region — simpler: room-scoped phrase rules with `room:` for each of the five Keep rooms generated from one array in `fortress.ts` (`KEEP_PHRASES.flatMap((p) => KEEP_ROOMS.map((room) => ({ ...p, id: `${p.id}.${room}`, room })))`) and spread into `PHRASE_RULES`.
- Studio: `fortress.refresh-fail` `{ when: { verb: 'use', noun: ['refresh', 'big refresh', 'progress bar', 'refresh bar'], notHas: ['policy'] }, then: { text: (s) => vary(s, REFRESH_ERRORS), outcome: 'fail' } }` with the five error strings from §17; `fortress.qna` (`use q&a`, `ask <question>` → `talk` with noun not an NPC — add a room rule on `talk` with `nounMatches: /./` placed after the Card rules); `fortress.format-number`.
- Model View: `fortress.circular` (`use column`/`add column`/`create calculated column`), `fortress.ambiguous` (`say both` when `model.m2m` set by the m2m rule).
- Second-look gags: `look at card` when `stare.done` and `card.looked` → the 4.2M/4.7M line (set `card.looked` on the first post-stare look); `look at bridge` twice via `bridge.looked`.
- Gifts: on `guard`, `duke`, `cardinality`, `card` add `give` rules for the pairs in §17 (`noun` = the item aliases, `noun2` = the NPC aliases) placed before the generic `give` fallback; the generic fallback already rotates (`vary`).
- Examinables: add every scenery item from §17's list to `items.ts` with `describe`, `untakeableText` and, where named, a `use` rule in the room; run the rule-noun audit from `tests/quirks.test.ts`'s spirit — add `tests/keep-examinables.test.ts`: for each Keep room, for every noun in its rules and every item id, `look at <noun>` must not answer "don't see" (same probe as the earlier audit script, permissive state).

- [ ] **Step 6: Scenes** — in `src/scenes/fortress.tsx`: `Bridge` gains a splash-screen rectangle on the gate ("Power BI Desktop · updating 1 of 3"); `Hall` becomes a corridor of doorways each labelled `Changed Type`; new `Model` (three plinths with table boxes, lines between them, one dashed/wobbly, a knight sprite); `Throne` (a giant DAX formula bar as the throne back, `CALCULATE(` carved above); `Yard` → `Studio` (canvas with a pie of many slices, a card box reading `(Blank)` or `4.2M`, a slicer stack, a progress bar at 97%, boots on the floor when dropped). Rename scene ids `fortress.yard*` → `fortress.studio*` in the room's `scene()` and `SCENES`.

- [ ] **Step 7: Run** — `npx tsc -b && npm test && npm run lint:world` (expect 200; lint sees `fortress.model` reachable via hall `w`).

- [ ] **Step 8: Commit** — `git commit -am "fortress: the Semantic Model Keep — Desktop gate, Power Query hall, Model View, Duke of DAX, Report Studio; moat unchanged"`

---

### Task 10: The Lake House

**Files:**
- Modify: `src/world/lake.ts` (new room `lake.house`; `lake.shore` exits gain `w`), `src/world/items.ts` (`porch-sign` name `sign`, `deck-chair` name `chair`, `mailbox`, `house-door` name `door`), `src/world/globals.ts` (room-scoped phrase rules placed before the global eggs), `src/scenes/lake.tsx` (+ `LakeHouse`), `src/scenes/index.tsx`, `docs/ledger.md` map (Task 11)
- Test: `tests/lakehouse.test.ts`

- [ ] **Step 1: Failing tests**

```ts
// tests/lakehouse.test.ts
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
const at = (c: string) => step({ ...newGame(WORLD, 2), room: 'lake.house' }, c, WORLD).output[0]!;
describe('the Lake House', () => {
  it('is west of the shore and says what it is', () => {
    const r = step({ ...newGame(WORLD, 2), room: 'lake.shore' }, 'w', WORLD);
    expect(r.state.room).toBe('lake.house');
    expect(r.output.join(' ')).toMatch(/A house\. On a lake\./);
  });
  it('every bit lands', () => {
    expect(at('open door')).toMatch(/files on the left/i);
    expect(at('sit')).toMatch(/billed/i);
    expect(at('look at sign')).toMatch(/serif/i);
    expect(at('knock')).toMatch(/Spark session/);
    expect(at('buy house')).toMatch(/storage/i);
    expect(at('swim')).toMatch(/inside a house while swimming/i);
    expect(at('look at mailbox')).toMatch(/CSV/);
    expect(at('fish')).toMatch(/Delta log/);
  });
  it('awards nothing and the golden path is unaffected', async () => {
    const path = (await import('./golden-path.json')).default as string[];
    let s = newGame(WORLD, 42); for (const c of path) s = step(s, c, WORLD).state;
    expect(s.score).toBe(200);
  });
});
```

- [ ] **Step 2: Run to fail**

- [ ] **Step 3: Room, items, phrase rules**

```ts
room({
  id: 'lake.house', name: 'The Lake House', region: 'lake',
  describe: () => "A house. On a lake. That's it. That's the whole thing. Somebody in marketing is very proud. A porch, a deck chair, a mailbox, and a sign that says LAKEHOUSE in two fonts. The shore is east.",
  exits: { e: 'lake.shore' }, items: ['sign', 'chair', 'mailbox', 'door'], npcs: [],
  scene: () => 'lake.house',
  enterQuip: () => 'A house. On a lake. Take a moment.',
  flaskHint: () => 'This room is a joke. The joke is the whole room. The shore is east.',
  rules: [
    { id: 'lake.house.enter', when: { verb: 'open', noun: ['door', 'house', 'front door'] }, then: { text: 'Inside: files on the left, tables on the right, and a shortcut to another house across the lake. You back out slowly.', outcome: 'fail' } },
    { id: 'lake.house.in', when: { verb: 'go', dir: 'in' }, then: { text: 'Inside: files on the left, tables on the right, and a shortcut to another house across the lake. You back out slowly.', outcome: 'fail' } },
    { id: 'lake.house.sit', when: { verb: 'use', noun: ['chair', 'deck chair', 'sit', 'porch'] }, then: { text: 'You sit on the deck. The lake refreshes. It is lovely. You are billed.', outcome: 'fail' } },
    { id: 'lake.house.knock', when: { verb: 'use', noun: ['knock', 'door'] }, then: { text: 'Nobody answers. A Spark session starts inside, out of politeness.', outcome: 'fail' } },
    { id: 'lake.house.buy', when: { verb: 'use', noun: ['buy', 'buy house', 'house', 'purchase'] }, then: { text: 'It is not for sale. It is for storage. Very different, the realtor insists, without making eye contact.', outcome: 'fail' } },
    { id: 'lake.house.fish', when: { verb: 'use', noun: ['fish', 'fishing', 'rod'] }, then: { text: 'You fish. You catch a Delta log. You put it back; it was not fully committed.', outcome: 'fail' } },
  ],
}),
```

Items: `sign` ("LAKE, in serif. HOUSE, in sans. They were added at different times, by different teams."), `chair` ("A deck chair. Adirondack. Lakehouse-adjacent."), `mailbox` ("Mailbox: 1 new. It is a CSV. It has been in the mailbox since bronze."), `door` (aliases `front door`; "A door. Behind it, files and tables in the same building. Nobody thought that was strange until the invoice."). Because `sit`, `fish`, `knock`, `swim`, `buy` are currently global phrase eggs, add room-scoped phrase rules **before** the global eggs in `PHRASE_RULES`:

```ts
  { id: 'lake.house.sit-egg', room: 'lake.house', test: /^(sit|sit down|sit in chair|sit on porch|rest)$/, text: 'You sit on the deck. The lake refreshes. It is lovely. You are billed.' },
  { id: 'lake.house.swim-egg', room: 'lake.house', test: /^(swim|dive|jump in|wade)\b/, text: 'You wade in. It is a lake. It is also, somehow, a house. You are now inside a house while swimming. You get out.' },
  { id: 'lake.house.knock-egg', room: 'lake.house', test: /^knock\b/, text: 'Nobody answers. A Spark session starts inside, out of politeness.' },
  { id: 'lake.house.buy-egg', room: 'lake.house', test: /^(buy|purchase|make an offer)\b/, text: 'It is not for sale. It is for storage. Very different, the realtor insists, without making eye contact.' },
  { id: 'lake.house.fish-egg', room: 'lake.house', test: /^(fish|go fishing|cast)\b/, text: 'You fish. You catch a Delta log. You put it back; it was not fully committed.' },
```

`lake.shore`: `exits: { n: 'village.square', e: 'lake.dock', s: 'swamp.bronze', w: 'lake.house' }` and append to its `describe`: " West, at the water's edge, a house. On the lake."

- [ ] **Step 4: Scene** — `LakeHouse` in `src/scenes/lake.tsx`: `Exterior` with water for the bottom third (blue band), a small wooden house on stilts (brown `R`s), a porch with a chair, a mailbox on a post, the sign with `LAKE` and `HOUSE` as two `Label`s in different sizes; register as `'lake.house'`.

- [ ] **Step 5: Run** — `npx tsc -b && npm test && npm run lint:world`

- [ ] **Step 6: Commit** — `git commit -am "lake: the Lake House. A house. On a lake."`

---

### Task 11: Docs, god mode, deploy

**Files:**
- Modify: `README.md` (Side quests paragraph under "The quest"; the Moat trial text now mentions the Duke of DAX; Lake House one-liner), `docs/how-to-play.md` (Side quests + wrappers), `docs/ledger.md` (Bonus table + spoiler walkthroughs; Fortress room names, steps 13–14 re-skinned: "Out-stare the Card visual", "Incremental policy → the Big Refresh → Bursting Boots"; walkthrough is now 61 turns; map gains The Model View and The Lake House), `docs/building-and-deploying.md` (bonus column, catchAll, wrappers, new cues), `src/engine/god.ts` (`effectText` shows `+N bonus`)
- Deploy: `npx rayfin up --workspace "FabricQuest" --yes` (additive schema: `HallOfFame.bonus`), then push to GitHub (Pages).

- [ ] **Step 1: god.ts** — in `effectText` add `if (t.bonus) bits.push(`+${t.bonus} bonus`);` and `if (t.returnTo) bits.push('→ back');`.
- [ ] **Step 2: Docs** — README: *"Two side quests hide in the realm: type `show me a table` and you're in Jeff's Excel, trying to make his export match the report; type `what are my sales numbers` and you're arguing with Copilot. Both pay bonus points on top of the 200. Both can be left with `exit`."* how-to-play: a "Side quests" section (entering, leaving, bonus separate, the ladder is discoverable via Copilot's suggestions) and a "Wrappers" paragraph under "The narrator talks back". ledger: `## Bonus` table (`Jeff's Excel +20`, `Copilot +25`) and two `<details>` walkthroughs: the Excel command list from `tests/excel.test.ts` `SOLVE` and the winning Copilot prompt.
- [ ] **Step 3: Verify** — `npx tsc -b && npm test && npm run lint:world && npm run build:pages`.
- [ ] **Step 4: Deploy** — `RAYFIN_TELEMETRY_OPTOUT=1 npx rayfin up --workspace "FabricQuest" --yes`; then a live Playwright run: enter Excel, exit, enter Copilot, win, finish via `quit`, submit, confirm the board row shows `+25`.
- [ ] **Step 5: Commit and sync** — `git commit -am "docs + god mode: side quests, bonus, wrappers"`; copy the changed files into `C:\Github\Fabric-Quest`, commit there, Tommy pushes (Pages rebuilds).

---

### Task 12: God mode — `where`

**Files:**
- Modify: `src/engine/god.ts`
- Test: `tests/god.test.ts` (append)

**Interfaces:**
- Consumes: `promptFor`, `effectText`, `needsText` (existing in god.ts), `WORLD` structure.
- Produces: god commands `where <thing>`, `where is <thing>`, `where's <thing>`, `find <thing>`, `how do i get <thing>`, `what do i give|say to <npc>`; step id `god.where`.

- [ ] **Step 1: Failing tests** (append to `tests/god.test.ts`)

```ts
  it('where finds the guard, the key, jeff and the hoodie', () => {
    expect(run(['burninate', 'where sku']).last).toMatch(/fortress\.bridge[\s\S]*say trial[\s\S]*\+10/);
    expect(run(['burninate', 'where key']).last).toMatch(/lake\.island[\s\S]*get standard key/);
    expect(run(['burninate', 'where jeff']).last).toMatch(/village\.square[\s\S]*Jeff/);
    expect(run(['burninate', 'what do i say to the guard']).last).toMatch(/say trial/);
    expect(run(['burninate', 'where hoodie']).last).toMatch(/monastery\.cloister[\s\S]*talk to abbot/);
    expect(run(['burninate', 'where unicorn']).last).toMatch(/Nothing in the realm answers/);
  });
```

- [ ] **Step 2: Implement** — in `godStep`'s switch add:

```ts
    case 'where':
    case 'find':
    case "where's":
    case 'how':
    case 'what': {
      const q = arg.replace(/^(is|are|do i (get|find|give|say)( to)?|to)\s+/, '').replace(/^(the|a|an)\s+/, '').trim();
      if (!q) return meta(base, ['where what?'], 'god.where', parsed);
      return meta(base, [whereIs(world, q)], 'god.where', parsed);
    }
```

and the search:

```ts
function whereIs(world: World, q: string): string {
  const needle = q.toLowerCase();
  const hit = (s: string | undefined) => !!s && s.toLowerCase().includes(needle);
  const out: string[] = [];
  // NPC matches: their room, plus every rule in that room that names them or is a say-rule
  const npcs = Object.values(world.npcs).filter((n) => hit(n.name) || n.aliases.some(hit));
  for (const n of npcs) for (const r of Object.values(world.rooms)) if (r.npcs.includes(n.id)) {
    out.push(`${r.id} — ${r.name} (npc ${n.name})`);
    for (const rule of r.rules) { const w = rule.when; const names = ([] as string[]).concat(w.noun ?? [], w.noun2 ?? []); if (names.some(hit) || w.verb === 'say') out.push(`  > ${promptFor(rule)}${effectText(rule)}${needsText(rule)}`); }
  }
  // Rule matches by noun / noun2 / id across all rooms and globals
  for (const r of Object.values(world.rooms)) for (const rule of r.rules) {
    const w = rule.when; const names = ([] as string[]).concat(w.noun ?? [], w.noun2 ?? [], [rule.id]);
    if (names.some(hit) && !out.some((l) => l.includes(promptFor(rule)))) out.push(`${r.id} — ${r.name}: > ${promptFor(rule)}${effectText(rule)}${needsText(rule)}`);
  }
  for (const rule of world.globalRules) { const w = rule.when; if (([] as string[]).concat(w.noun ?? [], w.noun2 ?? [], [rule.id]).some(hit)) out.push(`anywhere: > ${promptFor(rule)}${effectText(rule)}${needsText(rule)}`); }
  // Items: where they sit, and which rule gives them
  for (const it of Object.values(world.items)) if (hit(it.name) || it.aliases.some(hit) || hit(it.id)) {
    for (const r of Object.values(world.rooms)) if (r.items.includes(it.id)) out.push(`item '${it.name}' lives in ${r.id} — ${r.name}`);
    for (const r of Object.values(world.rooms)) for (const rule of r.rules) if (rule.then.give?.includes(it.id)) out.push(`${r.id} — ${r.name}: > ${promptFor(rule)} gives ${it.name}${needsText(rule)}`);
  }
  // Rooms by name
  for (const r of Object.values(world.rooms)) if (hit(r.name) || hit(r.id)) out.push(`room ${r.id} — ${r.name} (${r.region})`);
  const uniq = [...new Set(out)];
  // points first
  uniq.sort((a, b) => Number(/\+\d+/.test(b)) - Number(/\+\d+/.test(a)));
  return uniq.length ? uniq.join('\n') : `Nothing in the realm answers to '${q}'. Try: rooms, prompts all.`;
}
```

`what do i say to the guard` → `cmd` is `what`, `arg` = `do i say to the guard` → stripped to `guard`. Add `where` to `GOD_HELP`: `  where <thing>         who wants it, where it is, what to say (e.g. where sku, where key)`.

- [ ] **Step 3: Run** — `npx vitest run tests/god.test.ts && npm test`
- [ ] **Step 4: Commit** — `git commit -am "god mode: where <thing>"`

---

### Task 13: Room texture pass (spec §18)

**Files:**
- Modify: `src/world/village.ts`, `lake.ts`, `monastery.ts`, `peaks.ts` (fortress is covered by Task 9), `src/world/items.ts`, `src/world/npcs.ts` (give responses)
- Test: `tests/texture.test.ts`

- [ ] **Step 1: Failing test** — for every main-realm room: (a) at least one item in `room.items` with `takeable: true` (counting items given by that room's rules), (b) at least one room rule whose verb is not `go`/`look`, (c) `flaskHint` returns a string that contains an imperative verb from the set [wait, talk, give, use, read, get, wear, say, board, go, north, south, east, west, exit, show, look]. Write it as a table-driven `it.each(Object.keys(WORLD.rooms).filter(main))`.
- [ ] **Step 2: Content** — add per room (append to the existing `items`/`rules`; keep every existing rule id):
  - **Cottage:** takeable `sticky note` ("DO NOT REFRESH — JEFF"; `give sticky note to jeff` → "He reads it. 'That's mine.' He does not take it back."). **Square:** takeable `lanyard` ("A conference lanyard. FabCon. Still has a coffee stain from the keynote."; `wear lanyard` → "You now look like you belong. Nobody checks."). **Mill:** takeable `usb stick` ("USB stick labelled FINAL_v2. It contains a dataflow. Gen1."; `use usb stick on wheel` → "The Mill accepts it. Nothing changes. It was already running that."). **Fields:** takeable `seed` ("A refresh seed. Plant it and in 24 hours you have another failed refresh."; `use seed on crops` → "You plant it. A tiny refresh sprouts, considers its options, and fails.").
  - **Shore:** takeable `pebble` (`use pebble on lake` → "Skip. Skip. Sink. Three hops, then it becomes a Delta file."). **Dock:** action `talk to ferryman` when offline already exists — add `give lanyard to ferryman` → "'FabCon?' The Ferryman almost smiles. 'I was there. In spirit. My credentials had expired.'" **Island:** takeable `personal key` already exists; add `read plaque` (exists) and `use personal key on plinth` → "It fits. It is yours alone. Nobody else can ever use it. That is the problem."
  - **Bronze/Silver/Gold:** takeable `stress ball` in Bronze ("A stress ball shaped like a cube. 'OLAP' is printed on one face."; `use stress ball` → "You squeeze. It is oddly calming. It is also oddly deprecated."); Silver: `read column names` → "Column1 became CustomerName. Column2 became Customer_Name. Column3 is still Column3."; Gold: `look at shortcut` exists; add `use shortcut on marsh` → "The shortcut points at itself. The marsh briefly contains the marsh."
  - **Monastery Gate:** flask hint per §18; action `knock` → "The gate says: Session starting. Please wait. It has always said that." **Cloister:** takeable `KPI` (laminated card, "Target: 100%. Actual: (Blank)."; `give kpi to abbot` → "The Abbot looks at (Blank) for a long time. 'Yes,' he says. 'This is the realm.'"). **Spark chamber:** action `use kpi on notebook` → "The notebook prints (Blank). Brother Pandas nods; he has seen worse." **Library:** takeable `bookmark` ("A bookmark from the Synapse wing. It marks a page nobody will return to."; `give bookmark to librarian` → "'From the Synapse wing?' She files it under 'legacy'. Gently.").
  - **Foothills / Pass / Ledge / Shrine:** Foothills takeable `rock` (already scenery in Pass — make Foothills' `pebble2` name `flat rock`; `use flat rock on dragon` in Shrine → "You throw a rock at a capacity dragon. It bills you for the throw."); Ledge: `read door` → "WORTHY ONLY. Below, smaller: 'and no interactive delay'."; Shrine: `give kpi to dragon` → "'(Blank)?' Throttlor is briefly delighted. Then remembers he is a dragon."
  - **Flask hints:** rewrite every main-room `flaskHint` to name the concrete next action in that room (state-aware, as today, but always an imperative sentence).
- [ ] **Step 3: Run** — `npx tsc -b && npm test && npm run lint:world` (golden path unchanged).
- [ ] **Step 4: Commit** — `git commit -am "texture: something to get, do, or give in every room; flask hints say what to do next"`

---

## Self-review

- **Spec coverage (§12–16):** Fortress re-theme → Task 9 (rooms, items, NPCs, parser verbs, scenes); world order + re-sequenced golden path → Task 9 Steps 5–5b; Lake House → Task 10; docs for all → Task 11; god-mode `where` → Task 12; §16 village ideas are open and intentionally not planned.
- **§18 room texture** → Task 13 (after the Keep and Lake House so it does not collide with Task 9's rewrite of the fortress).
- **Everything else asked for is covered:** wrappers ("I want to…", "I said…", frustration) → Task 2; `!` reactions were already shipped and are extended by Task 2's three-way escalation; repeat nagging shipped, kept; entrance quips everywhere → Task 3; the new environments (Excel, Copilot, Keep, Lake House) → Tasks 4–6, 9, 10.
- **Spec coverage:** §2 entry/exit/nesting/return/no-death → Task 4 (+Task 1 `returnTo`, side-region exclusions); §3 bonus → Tasks 1, 7; §4 Excel → Task 5 (+ scenes Task 8, cues Task 7); §5 Copilot ladder + gallery + finickiness → Task 6; §6 entrance quips → Task 3; §6b wrappers → Task 2 (Copilot feedback line in Task 6); §7 engine → Task 1 (+`dynamic` phrase field Task 4, catchAll gating Task 6); §8 UI/audio → Tasks 7, 8; §9 docs/telemetry → Task 9 (step ids in Tasks 5–6); §10 tests → each task; save/restore untouched (state is room+flags+bonus; `SaveBlob` serializes `GameState` whole — Task 1 adds `bonus`, and `load()` should default `bonus: 0` for older saves: add `bonus: b.state.bonus ?? 0` in `src/game/save.ts` `load()` — include in Task 1 Step 4).
- **Placeholders:** the `excel.connect-say` rule text is marked `'…'` — use the same text as `excel.connect`. The `show-jeff-done` `when.verb` expression is a leftover: it is simply `verb: 'give'`. Fixed in place when implementing.
- **Type consistency:** `RETURN_FLAG` exported from `step.ts` and imported by `sidequests.ts` (no cycle: `step.ts` does not import `sidequests.ts`; `enterThen`/`EXIT_THEN`/`NESTED_TEXT` are imported by `step.ts` from `../world/sidequests` — that *is* a cycle through `world/index` only if `sidequests.ts` imports `WORLD`; it doesn't, it takes `world` as a parameter). `catchAll` returns `RuleThen | null` in Task 1 and `{ then, id }` in Task 6 — settle on `{ then: RuleThen; id?: string } | null` in Task 1.
