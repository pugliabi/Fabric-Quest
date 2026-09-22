# Fabric's Quest — Plan 1: Game Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A fully playable Fabric's Quest in the browser — parser, engine, all 22 rooms and 17 scored puzzles, deaths, easter eggs, Sierra-style UI with placeholder scene panels — with a golden-path test proving 200/200.

**Architecture:** A pure `step(state, input, world)` engine interprets a data-driven `World` (rooms/items/npcs/rules in TypeScript content files). A thin React UI renders the scene panel, status bar, text window, and `>` prompt, and owns save/restore in localStorage. Telemetry is a stub interface here (`Recorder`) that Plan 2 replaces with the Rayfin client.

**Tech Stack:** Node 22, Vite 6, React 18, TypeScript 5 (strict), Vitest, Playwright (Chromium preinstalled). No UI libraries.

**Spec:** `docs/superpowers/specs/2026-09-22-pros-quest-design.md`

**Out of scope for this plan (Plan 2 / Plan 3):** deployment to the *Fabric Quest* workspace (needs `rayfin login` on Tommy's machine or a service-principal GitHub Action), AI art, the BI model.

## Amendments (2026-09-22, during execution)

1. **Scaffolded with Rayfin first (Tommy's instruction).** Task 1 is replaced: the repo was created in place with `npm create @microsoft/rayfin@latest . --template blankapp --services auth,data --auth-methods fabric --dialect mssql`. Stack is therefore React 19, Vite 7, Vitest 3, `@vitejs/plugin-react-swc`, Tailwind 4 plugin (unused by the game CSS), `@microsoft/rayfin-*` 1.35.1. Vitest `include` is widened to `tests/**/*.test.ts` with `environment: 'node'` for engine tests. The template's router/auth guard is removed from `App.tsx` — players never sign in; the Rayfin client is still initialized via the template's `initRayfinClient` for anonymous data writes.
2. **Entities move into this plan (Task 13b):** `rayfin/data/Quest.ts`, `Activity.ts`, `HallOfFame.ts` with `@anonymous('create')` (+ `@anonymous('read', { include })` on HallOfFame), all strings `@text({ max })` per known-limitations, registered in `schema.ts`; `RayfinRecorder` implements `Recorder` with a batched queue. Verified against the installed docs: decorators are `@int`, `@date`, `@text({ max })`; shorthands `@anonymous()`/`@authenticated()` are preferred over `@role`.
3. **`get ye flask` easter egg (Task 4b):** a global rule matching `get` + noun in `['ye flask','flask','ye olde flask']` in every room. Output: "Ye cannot get ye flask." followed by that room's `flaskHint` — a one-line nudge toward the next useful action in that room (every `Room` gets a required `flaskHint: (s) => string`). Awards 0 points, outcome `snark`, increments `flags['flask.count']` so the telemetry shows who leaned on it. In `peaks.ledge` it additionally names the dark sigils; in `monastery.gate` it reveals how many more `wait`s are needed.
4. **Chiptune SFX (Task 12b):** `src/game/sfx.ts` synthesizes short square/triangle-wave cues with the Web Audio API (no audio files): `title` (4-note jingle on the title screen, played on the first click/keypress so autoplay rules are satisfied), `move` (soft blip), `success` (rising two-note), `item` (three-note arpeggio on `give`/`get` success), `fail` (low buzz), `snark` (descending two-note), `door` (slow rising sweep on drawbridge/gate/shrine), `death` (falling four-note), `win` (eight-note fanfare). Mapped from `StepResult.outcome` plus a `sfx?: string` override on `RuleThen`. Mute toggle in the status bar, persisted in localStorage.

## Global Constraints

- Total score is exactly **200**; every scored rule from spec §5 awards points **once**.
- Room, item, NPC, and rule IDs are stable strings from spec §3–§6 and are the telemetry `step_id`/`room_id`.
- The engine is pure: no I/O, no `Date`, no `Math.random` — snark rotation uses `state.seed`.
- No Homestar Runner names, characters, or assets anywhere in code or copy.
- Layout per spec §9: white status bar on top (`Score : N of 200` left, `Fabric's Quest` right), scene beneath, short text window, `>` prompt beneath.
- Pixel font: "Press Start 2P" (Google Fonts) for the status bar/title; monospace for the text window.
- Vite project rooted at repo root so Plan 2 can run `npx rayfin init .` without moving files.
- Commit after every task with a conventional-commit message.

---

## File Structure

```
package.json, tsconfig.json, vite.config.ts, index.html
src/main.tsx                     React entry
src/engine/types.ts              GameState, Outcome, StepResult, ParsedCommand, Verb, Dir
src/engine/parser.ts             parse(input): ParsedCommand   (synonyms, filler stripping)
src/engine/step.ts               step(state, input, world): StepResult
src/engine/builtins.ts           movement/look/get/drop/inventory/wear/score/help/wait handlers
src/engine/snark.ts              pickSnark(seed, turn, pool)
src/world/types.ts               World, Room, Item, Npc, Rule, Cond, FlagPatch
src/world/items.ts               all items
src/world/npcs.ts                all NPCs
src/world/globals.ts             global rules: easter eggs, deaths, phrase rules; snark pool
src/world/village.ts  lake.ts  monastery.ts  fortress.ts  peaks.ts
src/world/index.ts               assembles World; WORLD_VERSION
src/world/lint.ts                lintWorld(world): string[]   (used by tests and script)
src/game/save.ts                 save/load/clear GameState in localStorage
src/game/recorder.ts             Recorder interface + ConsoleRecorder (Plan 2 swaps in Rayfin)
src/ui/App.tsx                   screen router: title | play | dead | finish
src/ui/TitleScreen.tsx
src/ui/PlayScreen.tsx            status bar + scene + text window + prompt
src/ui/ScenePanel.tsx            placeholder scene (room name on EGA-colored box) until art lands
src/ui/DeathCard.tsx
src/ui/FinishScreen.tsx
src/ui/styles.css
tests/parser.test.ts
tests/step.test.ts               two-room fixture world
tests/world-lint.test.ts
tests/golden-path.test.ts        plays the whole game → 200
tests/deaths.test.ts
scripts/lint-world.ts
scripts/replay.ts                replays a JSON array of raw inputs, prints diff
e2e/smoke.spec.ts                Playwright
```

---

### Task 1: Project scaffold and tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/ui/App.tsx` (placeholder), `.gitignore`

**Interfaces:**
- Produces: `npm run dev`, `npm test`, `npm run build`, `npm run lint:world` (added in Task 10), `npm run e2e` (Task 13).

- [ ] **Step 1: Create package.json**

```json
{
  "name": "pros-quest",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -p tsconfig.json --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.6.3",
    "vite": "^6.0.3",
    "vitest": "^2.1.8",
    "jsdom": "^25.0.1",
    "tsx": "^4.19.2"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022", "module": "ESNext", "moduleResolution": "bundler",
    "jsx": "react-jsx", "strict": true, "noUncheckedIndexedAccess": true,
    "skipLibCheck": true, "isolatedModules": true, "resolveJsonModule": true,
    "types": ["vite/client"]
  },
  "include": ["src", "tests", "scripts", "e2e"]
}
```

- [ ] **Step 3: Create vite.config.ts**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
} as any);
```

- [ ] **Step 4: Create index.html and src/main.tsx**

```html
<!doctype html>
<html lang="en"><head><meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Fabric's Quest</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
</head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>
```

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import './ui/styles.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
```

`src/ui/App.tsx` placeholder: `export function App() { return <div>Fabric's Quest</div>; }`. `src/ui/styles.css` empty for now.

- [ ] **Step 5: .gitignore** — `node_modules`, `dist`, `rayfin/.temp`, `.env*`, `test-results`, `playwright-report`.

- [ ] **Step 6: Install and verify** — `npm install`, then `npm run build` → succeeds; `npm test` → "No test files found" is acceptable.

- [ ] **Step 7: Commit** — `git add -A && git commit -m "chore: scaffold Vite + React + Vitest project"`

---

### Task 2: Engine types and parser

**Files:**
- Create: `src/engine/types.ts`, `src/engine/parser.ts`
- Test: `tests/parser.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type Dir = 'n'|'s'|'e'|'w'|'u'|'d'|'out'|'in';
  type Verb = 'look'|'get'|'drop'|'use'|'talk'|'say'|'give'|'open'|'close'|'read'|'wear'|'wait'|'drink'|'attack'|'board'|'go'|'inventory'|'score'|'save'|'restore'|'restart'|'quit'|'help'|'unknown';
  type ParsedCommand = { verb: Verb; noun?: string; noun2?: string; dir?: Dir; raw: string; unknownVerb?: string };
  function parse(input: string): ParsedCommand;
  ```

- [ ] **Step 1: Write types.ts**

```ts
export type Dir = 'n' | 's' | 'e' | 'w' | 'u' | 'd' | 'out' | 'in';
export type Verb = 'look' | 'get' | 'drop' | 'use' | 'talk' | 'say' | 'give' | 'open' | 'close' | 'read'
  | 'wear' | 'wait' | 'drink' | 'attack' | 'board' | 'go' | 'inventory' | 'score' | 'save' | 'restore'
  | 'restart' | 'quit' | 'help' | 'unknown';
export type Outcome = 'move' | 'success' | 'fail' | 'snark' | 'death' | 'meta' | 'win';
export type ParsedCommand = { verb: Verb; noun?: string; noun2?: string; dir?: Dir; raw: string; unknownVerb?: string };
export type Flags = Record<string, boolean | number>;
export type GameState = {
  room: string; inventory: string[]; worn: string[]; flags: Flags;
  score: number; turns: number; dead: boolean; won: boolean; seed: number;
};
export type StepResult = {
  state: GameState; output: string[]; outcome: Outcome; stepId: string;
  pointsAwarded: number; parsed: ParsedCommand; deathCause?: string;
};
```

- [ ] **Step 2: Write the failing parser tests**

```ts
import { describe, it, expect } from 'vitest';
import { parse } from '../src/engine/parser';
describe('parse', () => {
  it('strips articles and filler', () => {
    expect(parse('pick up the old scroll')).toMatchObject({ verb: 'get', noun: 'old scroll' });
  });
  it('maps synonyms to canonical verbs', () => {
    expect(parse('x mug').verb).toBe('look');
    expect(parse('examine mug').noun).toBe('mug');
    expect(parse('speak to the miller')).toMatchObject({ verb: 'talk', noun: 'miller' });
    expect(parse('z').verb).toBe('wait');
    expect(parse('i').verb).toBe('inventory');
  });
  it('parses two-noun forms', () => {
    expect(parse('use scroll on notebook')).toMatchObject({ verb: 'use', noun: 'scroll', noun2: 'notebook' });
    expect(parse('give credentials to ferryman')).toMatchObject({ verb: 'give', noun: 'credentials', noun2: 'ferryman' });
    expect(parse('put on hoodie')).toMatchObject({ verb: 'wear', noun: 'hoodie' });
  });
  it('parses movement', () => {
    expect(parse('n')).toMatchObject({ verb: 'go', dir: 'n' });
    expect(parse('go north')).toMatchObject({ verb: 'go', dir: 'n' });
    expect(parse('out')).toMatchObject({ verb: 'go', dir: 'out' });
  });
  it('keeps the full phrase for say', () => {
    expect(parse('say select *')).toMatchObject({ verb: 'say', noun: 'select *' });
    expect(parse('shout STAR SCHEMA').noun).toBe('star schema');
  });
  it('returns unknown with the offending verb', () => {
    expect(parse('frobnicate the lake')).toMatchObject({ verb: 'unknown', unknownVerb: 'frobnicate' });
  });
  it('bare look has no noun', () => {
    expect(parse('look')).toMatchObject({ verb: 'look', noun: undefined });
  });
});
```

- [ ] **Step 3: Run** `npx vitest run tests/parser.test.ts` → FAIL (module not found).

- [ ] **Step 4: Implement parser.ts**

```ts
import type { Dir, ParsedCommand, Verb } from './types';

const VERBS: Record<string, Verb> = {
  look: 'look', l: 'look', examine: 'look', x: 'look', inspect: 'look',
  get: 'get', take: 'get', grab: 'get', 'pick up': 'get', pickup: 'get',
  drop: 'drop', use: 'use', apply: 'use', put: 'use',
  talk: 'talk', speak: 'talk', ask: 'talk',
  say: 'say', shout: 'say', answer: 'say', yell: 'say',
  give: 'give', offer: 'give', hand: 'give', show: 'give',
  open: 'open', close: 'close', read: 'read',
  wear: 'wear', 'put on': 'wear', don: 'wear',
  wait: 'wait', z: 'wait', drink: 'drink', sip: 'drink',
  attack: 'attack', fight: 'attack', hit: 'attack', kill: 'attack', punch: 'attack',
  board: 'board', ride: 'board', 'enter boat': 'board', 'take boat': 'board', 'take ferry': 'board',
  go: 'go', walk: 'go', run: 'go', move: 'go',
  inventory: 'inventory', i: 'inventory', inv: 'inventory',
  score: 'score', save: 'save', restore: 'restore', load: 'restore',
  restart: 'restart', quit: 'quit', help: 'help', '?': 'help',
};
const DIRS: Record<string, Dir> = {
  n: 'n', north: 'n', s: 's', south: 's', e: 'e', east: 'e', w: 'w', west: 'w',
  u: 'u', up: 'u', d: 'd', down: 'd', out: 'out', outside: 'out', leave: 'out', in: 'in', inside: 'in', enter: 'in',
};
const FILLER = new Set(['the', 'a', 'an', 'at', 'my', 'some', 'please', 'up', 'to', 'with', 'into', 'onto']);
const PREPS = new Set(['on', 'to', 'with', 'at', 'in', 'into', 'onto', 'about']);

export function parse(input: string): ParsedCommand {
  const raw = input;
  const cleaned = input.trim().toLowerCase().replace(/[^\w\s*?']/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return { verb: 'unknown', raw, unknownVerb: '' };
  const words = cleaned.split(' ');

  if (DIRS[cleaned]) return { verb: 'go', dir: DIRS[cleaned], raw };

  // two-word verbs first
  const two = words.slice(0, 2).join(' ');
  let verb: Verb | undefined; let rest: string[];
  if (VERBS[two]) { verb = VERBS[two]; rest = words.slice(2); }
  else if (VERBS[words[0]!]) { verb = VERBS[words[0]!]; rest = words.slice(1); }
  else return { verb: 'unknown', raw, unknownVerb: words[0] };

  if (verb === 'say') return { verb, noun: rest.join(' ').trim() || undefined, raw };
  if (verb === 'go') {
    const d = rest.find((w) => DIRS[w]);
    return d ? { verb, dir: DIRS[d], raw } : { verb, raw };
  }
  if (verb === 'talk') rest = rest.filter((w) => w !== 'to' && w !== 'with');
  // "ask miller about credentials" → talk miller, noun2 credentials

  const stripped = rest.filter((w) => !FILLER.has(w) || (verb === 'wear' && false));
  const prepIx = stripped.findIndex((w, i) => i > 0 && PREPS.has(w));
  if (prepIx > 0) {
    return { verb, noun: stripped.slice(0, prepIx).join(' '), noun2: stripped.slice(prepIx + 1).join(' ') || undefined, raw };
  }
  const noun = stripped.join(' ').trim();
  return { verb, noun: noun || undefined, raw };
}
```

Note: for `give X to Y`, "to" is in `FILLER`; remove `'to'` from `FILLER` and keep it only in `PREPS`, otherwise `give credentials to ferryman` loses its split. Final `FILLER` = `['the','a','an','my','some','please','up']` (and `up` is dropped only after two-word verb detection so `pick up` still works).

- [ ] **Step 5: Run** `npx vitest run tests/parser.test.ts` → PASS (adjust FILLER/PREPS until all seven pass).

- [ ] **Step 6: Commit** — `git commit -am "feat(engine): parser with synonyms and two-noun forms"`

---

### Task 3: World types, step engine, builtins, snark

**Files:**
- Create: `src/world/types.ts`, `src/engine/step.ts`, `src/engine/builtins.ts`, `src/engine/snark.ts`
- Test: `tests/step.test.ts` (two-room fixture)

**Interfaces:**
- Consumes: `parse`, engine types.
- Produces:
  ```ts
  // world/types.ts
  type Cond = { flag: string; is?: boolean | number; not?: boolean } ;
  type FlagPatch = Record<string, boolean | number | ((v: boolean | number | undefined) => boolean | number)>;
  type RuleWhen = { verb: Verb; noun?: string | string[]; noun2?: string | string[]; flags?: Cond[]; has?: string[]; worn?: string[]; notHas?: string[]; dir?: Dir };
  type RuleThen = { text: string | ((s: GameState) => string); set?: FlagPatch; give?: string[]; remove?: string[]; moveTo?: string; points?: number; outcome?: Outcome; death?: string; win?: boolean };
  type Rule = { id: string; when: RuleWhen; then: RuleThen };
  type Room = { id: string; name: string; region: string; describe: (s: GameState) => string; exits: Partial<Record<Dir, string | ((s: GameState) => string | null)>>; items: string[]; npcs: string[]; rules: Rule[]; scene: (s: GameState) => string; onEnter?: (s: GameState) => string | null };
  type Item = { id: string; name: string; aliases: string[]; takeable: boolean; wearable?: boolean; describe: string | ((s: GameState) => string); untakeableText?: string };
  type Npc = { id: string; name: string; aliases: string[]; describe: (s: GameState) => string; talk: (s: GameState) => string };
  type World = { start: string; version: string; rooms: Record<string, Room>; items: Record<string, Item>; npcs: Record<string, Npc>; globalRules: Rule[]; snark: string[]; helpText: string };
  // engine/step.ts
  function newGame(world: World, seed: number): GameState;
  function step(state: GameState, input: string, world: World): StepResult;
  function describeRoom(state: GameState, world: World): string;  // name + describe + visible items + npcs + exits
  ```

- [ ] **Step 1: Write world/types.ts** exactly as in Interfaces.

- [ ] **Step 2: Write the failing step tests with a two-room fixture**

```ts
import { describe, it, expect } from 'vitest';
import { newGame, step } from '../src/engine/step';
import type { World } from '../src/world/types';

const fixture: World = {
  start: 'a', version: 'test', snark: ['Snark one.', 'Snark two.'], helpText: 'help!',
  items: {
    rock: { id: 'rock', name: 'rock', aliases: ['stone'], takeable: true, describe: 'A rock.' },
    anvil: { id: 'anvil', name: 'anvil', aliases: [], takeable: false, describe: 'Heavy.', untakeableText: 'Too heavy.' },
    hat: { id: 'hat', name: 'hat', aliases: [], takeable: true, wearable: true, describe: 'A hat.' },
  },
  npcs: { bob: { id: 'bob', name: 'Bob', aliases: ['man'], describe: () => 'Bob.', talk: () => 'Hi.' } },
  globalRules: [
    { id: 'death.dig', when: { verb: 'unknown' as any }, then: { text: 'never' } }, // must not match: unknown handled by snark
    { id: 'egg.xyzzy', when: { verb: 'say', noun: 'xyzzy' }, then: { text: 'Plugh.', outcome: 'snark' } },
  ],
  rooms: {
    a: { id: 'a', name: 'Room A', region: 't', describe: () => 'Room A.', exits: { n: 'b' }, items: ['rock', 'anvil', 'hat'], npcs: ['bob'], scene: () => 'a',
      rules: [
        { id: 'a.rub', when: { verb: 'use', noun: 'rock', noun2: 'anvil', has: ['rock'] }, then: { text: 'Sparks!', points: 10, set: { sparked: true } } },
        { id: 'a.die', when: { verb: 'drink', noun: 'anvil' }, then: { text: 'You die.', death: 'death.anvil' } },
      ] },
    b: { id: 'b', name: 'Room B', region: 't', describe: () => 'Room B.', exits: { s: 'a', n: (s) => (s.flags['sparked'] ? 'a' : null) }, items: [], npcs: [], scene: () => 'b', rules: [] },
  },
};

describe('step', () => {
  it('moves between rooms and reports outcome move', () => {
    const s = newGame(fixture, 1);
    const r = step(s, 'n', fixture);
    expect(r.state.room).toBe('b'); expect(r.outcome).toBe('move'); expect(r.stepId).toBe('b');
    expect(r.output.join('\n')).toContain('Room B');
  });
  it('blocks conditional exits', () => {
    const s = { ...newGame(fixture, 1), room: 'b' };
    const r = step(s, 'n', fixture);
    expect(r.state.room).toBe('b'); expect(r.outcome).toBe('fail');
  });
  it('gets and drops items, refuses untakeable', () => {
    let r = step(newGame(fixture, 1), 'take stone', fixture);
    expect(r.state.inventory).toEqual(['rock']); expect(r.outcome).toBe('success');
    r = step(r.state, 'get anvil', fixture);
    expect(r.output[0]).toBe('Too heavy.'); expect(r.outcome).toBe('fail');
    r = step(r.state, 'drop rock', fixture);
    expect(r.state.inventory).toEqual([]);
  });
  it('fires room rules once for points', () => {
    let r = step(newGame(fixture, 1), 'get rock', fixture);
    r = step(r.state, 'use rock on anvil', fixture);
    expect(r.pointsAwarded).toBe(10); expect(r.state.score).toBe(10); expect(r.state.flags['sparked']).toBe(true);
    r = step(r.state, 'use rock on anvil', fixture);
    expect(r.pointsAwarded).toBe(0); expect(r.state.score).toBe(10);
  });
  it('handles death', () => {
    const r = step(newGame(fixture, 1), 'drink anvil', fixture);
    expect(r.state.dead).toBe(true); expect(r.outcome).toBe('death'); expect(r.deathCause).toBe('death.anvil');
  });
  it('wears wearable items', () => {
    let r = step(newGame(fixture, 1), 'get hat', fixture);
    r = step(r.state, 'wear hat', fixture);
    expect(r.state.worn).toEqual(['hat']);
  });
  it('rotates snark deterministically for unknown verbs', () => {
    const a = step(newGame(fixture, 1), 'frob', fixture);
    const b = step(a.state, 'frob', fixture);
    expect(a.outcome).toBe('snark'); expect(a.output[0]).not.toBe(b.output[0]);
    expect(step(newGame(fixture, 1), 'frob', fixture).output[0]).toBe(a.output[0]);
  });
  it('global rules apply in any room', () => {
    const r = step({ ...newGame(fixture, 1), room: 'b' }, 'say xyzzy', fixture);
    expect(r.output[0]).toBe('Plugh.'); expect(r.outcome).toBe('snark');
  });
  it('increments turns on every command including meta', () => {
    const r = step(newGame(fixture, 1), 'inventory', fixture);
    expect(r.state.turns).toBe(1); expect(r.outcome).toBe('meta');
  });
});
```

- [ ] **Step 3: Run** → FAIL.

- [ ] **Step 4: Implement snark.ts**

```ts
export function pickSnark(seed: number, turn: number, pool: string[]): string {
  if (pool.length === 0) return "I don't understand.";
  const x = Math.abs(Math.imul(seed ^ 0x9e3779b9, turn + 1) >>> 0) % pool.length;
  return pool[x]!;
}
```

- [ ] **Step 5: Implement builtins.ts** — exports `resolveNoun(state, world, noun): { kind:'item'|'npc', id } | null` (matches name/aliases among room items, inventory, room npcs; case-insensitive; accepts trailing-word match e.g. "standard key"), and handlers `look`, `get`, `drop`, `inventory`, `wear`, `score`, `help`, `wait`, `go`, each `(state, cmd, world) => { output: string[]; state: GameState; outcome: Outcome; stepId?: string } | null`. `go`: resolve exit (string or function); null/undefined → `"You can't go that way."` fail; else move, output `describeRoom`, plus `room.onEnter?.(state)` text if any, outcome `move`, stepId = new room id. `look` with no noun → `describeRoom`; with noun → item/npc describe or `"You don't see any ${noun} here."` (outcome `snark`). `get`: not takeable → `untakeableText ?? "You can't take that."` fail; else move item from room to inventory (rooms track removed items via flag `taken.<item>`; items in a room are `room.items.filter(i => !flags['taken.'+i])`, dropped items tracked in `flags['dropped.'+item] = roomId`). `wait`: `"Time passes."` outcome `meta` (rules may override before builtins run). `score`: `"Score : N of 200 in T turns."`. `help`: `world.helpText`.

- [ ] **Step 6: Implement step.ts**

```ts
import { parse } from './parser';
import { pickSnark } from './snark';
import * as B from './builtins';
import type { GameState, StepResult, Outcome } from './types';
import type { Rule, World } from '../world/types';

export const MAX_SCORE = 200;

export function newGame(world: World, seed: number): GameState {
  return { room: world.start, inventory: ['license'], worn: [], flags: {}, score: 0, turns: 0, dead: false, won: false, seed };
}

function condOk(s: GameState, r: Rule): boolean {
  const w = r.when;
  if (w.flags && !w.flags.every((c) => {
    const v = s.flags[c.flag];
    if (c.not) return !v;
    if (c.is !== undefined) return v === c.is;
    return !!v;
  })) return false;
  if (w.has && !w.has.every((i) => s.inventory.includes(i))) return false;
  if (w.notHas && w.notHas.some((i) => s.inventory.includes(i))) return false;
  if (w.worn && !w.worn.every((i) => s.worn.includes(i))) return false;
  return true;
}
const nounMatch = (want: string | string[] | undefined, got: string | undefined) =>
  want === undefined ? true : got !== undefined && (Array.isArray(want) ? want : [want]).includes(got);

function applyRule(s: GameState, r: Rule, world: World): StepResult & { parsed: any } {
  let state: GameState = { ...s, flags: { ...s.flags }, inventory: [...s.inventory], worn: [...s.worn] };
  const t = r.then;
  const text = typeof t.text === 'function' ? t.text(state) : t.text;
  const output = [text];
  let points = 0;
  const key = `pts.${r.id}`;
  if (t.points && !state.flags[key]) { points = t.points; state.score += points; state.flags[key] = true; }
  if (t.set) for (const [k, v] of Object.entries(t.set)) state.flags[k] = typeof v === 'function' ? v(state.flags[k]) : v;
  if (t.give) for (const i of t.give) if (!state.inventory.includes(i)) state.inventory.push(i);
  if (t.remove) { state.inventory = state.inventory.filter((i) => !t.remove!.includes(i)); state.worn = state.worn.filter((i) => !t.remove!.includes(i)); }
  if (t.moveTo) { state.room = t.moveTo; output.push(B.describeRoom(state, world)); }
  let outcome: Outcome = t.outcome ?? (points > 0 || t.set || t.give || t.moveTo ? 'success' : 'fail');
  let deathCause: string | undefined;
  if (t.death) { state.dead = true; outcome = 'death'; deathCause = t.death; }
  if (t.win) { state.won = true; outcome = 'win'; }
  return { state, output, outcome, stepId: r.id, pointsAwarded: points, parsed: undefined as any, deathCause };
}

export function step(prev: GameState, input: string, world: World): StepResult {
  const parsed = parse(input);
  const room = world.rooms[prev.room]!;
  const base: GameState = { ...prev, turns: prev.turns + 1 };
  const matches = (r: Rule) => {
    const w = r.when;
    if (w.verb !== parsed.verb) return false;
    if (w.dir && w.dir !== parsed.dir) return false;
    if (!nounMatch(w.noun, parsed.noun)) return false;
    if (!nounMatch(w.noun2, parsed.noun2)) return false;
    return condOk(base, r);
  };
  const rule = room.rules.find(matches) ?? world.globalRules.find(matches);
  let result: StepResult;
  if (rule) result = { ...applyRule(base, rule, world), parsed };
  else {
    const built = B.handle(base, parsed, world);
    if (built) result = { ...built, parsed, pointsAwarded: 0, stepId: built.stepId ?? base.room };
    else result = { state: base, output: [pickSnark(base.seed, base.turns, world.snark)], outcome: 'snark', stepId: base.room, pointsAwarded: 0, parsed };
  }
  // interactive delay (spec §5): peaks.pass / peaks.ledge without boots worn
  if ((result.state.room === 'peaks.pass' || result.state.room === 'peaks.ledge') && !result.state.worn.includes('boots') && !result.state.dead) {
    result = { ...result, state: { ...result.state, turns: result.state.turns + 2 }, output: ['(…interactive delay…)', ...result.output] };
  }
  return result;
}
export { describeRoom } from './builtins';
```

`B.handle(state, parsed, world)` dispatches on `parsed.verb` to the builtin handlers; returns `null` for `unknown` and for verbs with no builtin (`use`, `talk` → resolves NPC and returns `npc.talk(state)` with outcome `success`; `say`, `give`, `open`, `close`, `read`, `drink`, `attack`, `board` → `"Nothing happens."` / `"You can't do that here."` outcome `fail` when noun resolves, `"You don't see any X here."` outcome `snark` when it doesn't).

- [ ] **Step 7: Run** `npx vitest run tests/step.test.ts` → PASS.

- [ ] **Step 8: Commit** — `git commit -am "feat(engine): pure step engine, builtins, deterministic snark"`

---

### Task 4: Items, NPCs, globals (easter eggs, deaths, snark pool, help)

**Files:**
- Create: `src/world/items.ts`, `src/world/npcs.ts`, `src/world/globals.ts`
- Test: covered by Task 9 golden path and Task 11 deaths.

**Interfaces:**
- Produces: `ITEMS: Record<string, Item>`, `NPCS: Record<string, Npc>`, `GLOBAL_RULES: Rule[]`, `SNARK: string[]`, `HELP_TEXT: string`.

- [ ] **Step 1: items.ts** — every item from spec §4 with these IDs and aliases:

| id | name | aliases | takeable | wearable | describe / untakeableText |
|---|---|---|---|---|---|
| `license` | Pro License Card | card, license card, pro license | true | | "A Power BI Pro license. The only license you have. Also, it turns out, the only one the Library accepts." |
| `mug` | mug | coffee mug, cup | true | | "'World's Okayest Analyst.' It has never been washed." |
| `report` | report | pbix, sales report, sales_v3_final_final2.pbix, file | false | | untakeableText: "It's 2.3 GB. You'd need a Premium license to lift it." describe: "Sales_v3_FINAL_final2.pbix. There is also a Sales_v3_FINAL_final3.pbix, but you don't talk about that one." |
| `credentials` | credentials | creds, gen1 credentials, password | true | | "Gen1 credentials on a scrap of parchment. Stored at the Mill since 2019. Somehow still valid." |
| `scroll` | scroll | spark scroll | true | | "A scroll of PySpark. The first line reads: `df = spark.read.format("delta")`. The rest is comments." |
| `hoodie` | hoodie | hoodie of spark, spark hoodie | true | true | "A black hoodie with a small orange flame on the chest. Wearing it makes you 40% more likely to say 'just write a notebook.'" |
| `shortcut` | shortcut | signpost, sign, onelake shortcut | true | | "A OneLake Shortcut. It weighs nothing. It's just a pointer." |
| `personal key` | personal key | personal mode key, personal | true | | "A Personal Mode gateway key. It only works for you, and only while your laptop is open." |
| `standard key` | standard key | gateway key, standard mode key, key, standard | true | | "A Standard Mode gateway key. Heavy, cold, enterprise-grade." |
| `cable` | cable | connection, connection cable, wire | true | | "A connection cable. One end says 'Source'. The other end says 'Sink'. Neither end says where." |
| `boots` | boots | bursting boots, pair of boots | true | true | "Bursting Boots. Provenance unknown. They smell faintly of Gold." |
| `model` | golden semantic model | model, semantic model, golden model | true | | "The Golden Semantic Model. It glows. Somehow it also has a 'Column1'." |
| `notebook` | notebook | brother pandas notebook, cell | false | | untakeableText: "It's a shared notebook. Take it and Brother Pandas loses his session." describe: `"Cell 1: df = pd.read_csv(\"onelake/gold/*.csv\")  # works on my laptop"` |
| `board` | notice board | board, notice, sign | false | | untakeableText: "It's nailed to the well." describe: "A notice board. Someone has written the Prophecy on it, and someone else has written 'export to excel' under that." |
| `water` | water | marsh, marsh water, bronze water, raw data | false | | untakeableText: "It's raw data. It runs through your fingers as strings." describe: "Bronze water. Untyped, unvalidated, unloved." |
| `log` | log | delta log, _delta_log, transaction log | false | | untakeableText: "You lift the log. It's just a _delta_log folder. You put it back, exactly where it was, which is the whole point." describe: "Transaction logs float past in the Silver Marsh. Each one is a JSON file that knows exactly what happened." |
| `well` | well | q&a well | false | | untakeableText: "It's a well." describe: "The Q&A Well. Ask it anything. It answers something else." |

- [ ] **Step 2: npcs.ts** — every NPC from spec §4 with `id`, `name`, `aliases`, `describe(s)`, `talk(s)`:

| id | aliases | talk(s) |
|---|---|---|
| `jeff` | jeff from finance, finance, man | `s.flags['jeff.pacified'] ? "Jeff sips from his mug and says nothing. Bliss." : "\"Hey! Hey. Can you export this to Excel? Just the whole thing. All of it. Excel.\""` |
| `miller` | old miller, old man | `s.flags['pts.village.credentials'] ? "\"They're decommissioning me in Q3. Take care of those creds.\"" : "\"Ah, a Report Builder. The Mill's being decommissioned, you know. Only thing left in here is the Gen1 credentials. Been stored here since 2019. Take 'em — nobody else remembers the password.\""` (and Task 5's rule gives the item) |
| `ferryman` | ferry man, gateway, boatman | online: `"\"ONLINE. Where to? The Isle of Gateway is the only stop.\""`; offline: `"The Ferryman's status lamp reads OFFLINE. He mouths: 'Credentials expired.' A tear runs down his cheek in a way that suggests a scheduled refresh failed."` |
| `monk` | gatekeeper, gatekeeper monk | `"The monk points at the progress bar without a word. 'Session starting…'"` |
| `abbot` | father abbot | see Task 7 rule; default: `"\"Brother Pandas has put pandas in the Lakehouse again. Fix his notebook and the Hoodie of Spark is yours.\""` |
| `pandas` | brother pandas, brother, monk pandas | `"\"It works on my laptop.\""` |
| `librarian` | | `s.flags['scroll.lent'] ? "\"Bring it back by the end of the Spark session.\"" : "\"The Spark Scroll? Library card only. Any license will do. Well. Any license we accept.\""` |
| `guard` | guards, bridge guard | `s.flags['bridge.down'] ? "\"Sixty days, peasant. Make them count.\"" : "\"HALT! State your SKU!\""` |
| `duke` | duke of warehouse, the duke | `"\"INNER JOIN me, peasant, ON what? Speak, or be LEFT OUTER.\""` |
| `lookup` | lookup activity | `"The Lookup Activity says nothing. It looks at you. It has always been looking at you."` |
| `copy` | copy activity, copy | `s.flags['copy.fixed'] ? "The Copy Activity hums contentedly. Status: Succeeded." : "The Copy Activity is stuck at 'Waiting on Lookup'. It has been stuck since a Tuesday."` |
| `throttlor` | dragon, throttlor the capacity dragon, capacity dragon | gone: `"Throttlor is gone. Only a faint smell of burnt CU remains."`; else `"\"WHO DARES— oh. Oh no. You smell like a Warehouse.\" The dragon gags. \"Answer me this, peasant: WHAT IS THE ONE TRUE MODEL?\""` |
| `scarecrow` | manual, scarecrow named manual | `"The scarecrow is named Manual. He has to be triggered by hand."` |

- [ ] **Step 3: globals.ts** — `GLOBAL_RULES` (each `outcome: 'snark'` unless a death), `SNARK` (12 lines), `HELP_TEXT`:

Rules (verb / noun match → text):
- `egg.sudo`: `unknown` is not usable for `sudo` since the parser returns unknownVerb. Instead add `sudo: 'say'`? No — add a dedicated pre-check in `globals.ts` export `PHRASE_RULES: { test: (raw: string) => boolean; id: string; text: string; death?: string }[]` evaluated by `step` **before** parsing (add this hook to `step.ts` in this task: if a phrase rule matches `input.trim().toLowerCase()`, return it with outcome `snark` or `death`, stepId = its id). Phrase rules:
  - `egg.sudo` `/^sudo\b/` → "You are not in the sudoers file. This incident will be reported to your capacity admin."
  - `egg.excel` `/export.*excel|excel/` → "The game exports itself to Excel. 1,048,576 rows later, it stops. Nothing has changed."
  - `egg.calculate` `/^calculate\b/` → "CALCULATE what? Context is everything."
  - `egg.copilot` `/^ask copilot\b|^copilot\b/` → "Copilot: 'Great question! To bake sourdough, first feed your starter…' It has confidently answered a different question."
  - `egg.xyzzy` `/^xyzzy$|^plugh$/` → "A hollow voice says: 'Direct Lake.'"
  - `egg.refresh` `/^refresh\b/` → "You refresh. Nothing changes, but it feels productive."
  - `death.delete-workspace` `/^delete\b.*workspace|^delete workspace/` → death: "You delete the workspace. You were in it."
  - `death.paginated` `/paginated report.*jeff|jeff.*paginated/` → death: "You offer Jeff a paginated report. Jeff's eyes go dark. He was not built for this. Neither were you."
- `SNARK`: "You can't do that. Not with a Pro license.", "That command has been deprecated. Like Dataflows Gen1.", "The realm does not recognize that verb. Have you tried 'look'?", "Nothing happens. A capacity admin somewhere frowns.", "You try. The realm returns HTTP 429: Too Many Requests.", "That's not a thing. Even in preview.", "You mutter the words. A nearby Lakehouse quietly ignores you.", "The parser stares at you the way the Lookup Activity does.", "Try again, peasant. Two words. Verb, noun.", "Your command has been placed in a queue. The queue is infinite.", "That would require a Premium capacity, and look at you.", "Error: the operation completed successfully. Nothing happened."
- `HELP_TEXT`: "Two words, peasant. Try: look, look at <thing>, get <thing>, drop <thing>, use <thing> on <thing>, talk to <someone>, say <words>, give <thing> to <someone>, read, wear, wait, open, board boat, n/s/e/w/out, inventory, score, save, restore, restart."

- [ ] **Step 4: Add the phrase-rule hook to `step.ts`** (before `parse`) and a test in `tests/step.test.ts`: `step(newGame(fixture,1), 'sudo make me a sandwich', fixtureWithPhrases)` → output contains "sudoers", outcome `snark`. Run → PASS.

- [ ] **Step 5: Commit** — `git commit -am "feat(world): items, npcs, easter eggs, deaths, snark pool"`

---

### Task 5: Village region

**Files:**
- Create: `src/world/village.ts` exporting `VILLAGE_ROOMS: Record<string, Room>`

**Interfaces:**
- Consumes: `Room`, `Rule` types; item/npc IDs from Task 4.
- Produces: rooms `village.cottage`, `village.square`, `village.mill`, `village.fields` with exits per spec §3.

- [ ] **Step 1: Write the four rooms**

`village.cottage` — describe: "Your cottage. A workspace, technically. One desk, one candle, one report you have been 'about to finish' since spring. A mug sits on the desk." (append " The mug is gone; the desk looks lonely." when `taken.mug`). items `['report','mug']`, exits `{ out: 'village.square', e: 'village.square' }`. Rules:
- `cottage.open-report`: `read`/`open` noun `report` → "You open the report. 47 pages. 46 of them are a table. Page 12 is a pie chart with 31 slices. You close the report."
- `cottage.refresh-report`: handled by egg.refresh.

`village.square` — describe: "The Village Square. A well, a notice board, and a road going north to the Mill, east to the Refresh Fields, and south toward the OneLake." + (not `jeff.pacified` ? " Jeff from Finance is here, holding an empty spreadsheet like a begging bowl." : " Jeff from Finance sits by the well, content."). items `['board','well']`, npcs `['jeff']`, exits `{ n: 'village.mill', e: 'village.fields', s: 'lake.shore', w: 'village.cottage' }`. Rules:
- `village.prophecy` (points 5): `read` noun in `['board','notice','notice board','sign','prophecy']` → text: "THE PROPHECY\n\nWhen the Dragon throttles the Refreshes of the night,\nOne shall climb the Peaks and set the Model right.\nBut the Shrine door opens only for the Worthy Three:\nLook like an Engineer. Smell like a Warehouse. Hold the Gateway Key.\n\nBelow it, in different handwriting: 'export to excel'." set `{ 'prophecy.read': true }`.
- `village.jeff-mug`: `give` noun `mug` noun2 in `['jeff','jeff from finance']` has `['mug']` → "Jeff takes the mug. 'World's Okayest Analyst.' He reads it twice. Something in him settles. He will never ask for an Excel export again. Probably." set `{ 'jeff.pacified': true }`, remove `['mug']`, outcome success.
- `village.jeff-no`: `say` noun `no` flags not `jeff.pacified` → "'No' is not a file format, Jeff explains."
- `village.well`: `look` noun in `['well','q&a well']` handled by item describe; `say` any noun when noun2 undefined and noun !== 'no' … skip; keep simple: rule `village.well-ask`: `use` noun `well` → "You ask the well a question. It answers: '$4,213,908.' You did not ask about money."

`village.mill` — describe: "The Dataflow Gen1 Mill. The wheel still turns, slowly, powered by a scheduled refresh nobody has touched since 2019. A banner reads: DECOMMISSION: Q3." + (not `pts.village.credentials` ? " The Miller sits by a chest marked CREDENTIALS." : " The chest is empty."). npcs `['miller']`, items `[]`, exits `{ s: 'village.square' }`. Rules:
- `village.credentials` (points 10): verb in `talk`|`get`|`open` with noun in `['miller','credentials','creds','chest','gen1 credentials']` OR `talk` noun `miller` — implement as two rules sharing text? Points are keyed by rule id, so make **one** rule id `village.credentials` with `when: { verb: 'get', noun: ['credentials','creds','chest','gen1 credentials'] }` and a second rule `village.credentials-talk` with `when: { verb: 'talk', noun: ['miller','old miller','old man'] , flags:[{flag:'pts.village.credentials', not:true}] }` whose `then` is the Miller's speech **plus** `give: ['credentials']`, `set: { 'pts.village.credentials': true }`, `points: 0`, and manually add 10 to score via `set`? No — scores must only flow through `points`. Instead: make the talk rule `then: { text: <speech + "He hands you the credentials.">, give: ['credentials'], points: 10 }` with id `village.credentials`, and the `get` rule id `village.credentials-get` with `then: { text: "You take the credentials from the chest. The Miller nods.", give: ['credentials'], points: 10 }`. Both award 10 — **wrong** (double award possible). Resolution: both rules use `flags: [{ flag: 'has.credentials', not: true }]`, both set `'has.credentials': true`, and both carry `points: 10` under **different** ids → a player can only trigger one because the flag blocks the second. Test in Task 9 asserts score stays 200 on the golden path; Task 11 adds a test that talk-then-get yields 10, not 20.

`village.fields` — describe: "The Refresh Fields. Rows of refreshes sway in the wind, most of them failed. A scarecrow named Manual keeps the birds off. East, the land rises toward the Capacity Peaks." npcs `['scarecrow']` (+ `jeff` unless pacified — implement `npcs` as static `['scarecrow','jeff']` and have `describeRoom` hide `jeff` when `jeff.pacified`; add `hiddenWhen?: (s)=>boolean` to `Npc` in `world/types.ts` and honor it in builtins `describeRoom`/`resolveNoun`). exits `{ w: 'village.square', e: 'peaks.foothills' }`. Rules:
- `fields.trigger`: `use`/`talk` noun in `['manual','scarecrow']` → "You trigger Manual by hand. He refreshes. It takes eleven minutes. Nothing was waiting on it."

- [ ] **Step 2: Quick check** — temporary test in `tests/world-lint.test.ts` is Task 10; for now run `npx tsc --noEmit` → clean.

- [ ] **Step 3: Commit** — `git commit -am "feat(world): village region"`

---

### Task 6: OneLake and Lakehouse Swamp region

**Files:**
- Create: `src/world/lake.ts` exporting `LAKE_ROOMS`

- [ ] **Step 1: Write the six rooms**

`lake.shore` — describe: "The shore of the OneLake. It is one lake. There is only ever one. A dock lies east; the marshes of the Lakehouse spread south, colored bronze, then silver, then gold." exits `{ n: 'village.square', e: 'lake.dock', s: 'swamp.bronze' }`. Rules:
- `death.import`: `use`|`get`|`open` noun in `['lake','onelake','import']` → death `death.import`: "You attempt to Import the OneLake into Power BI Desktop. Your laptop becomes a small sun." Also add `PHRASE_RULE` `death.import` `/^import\b.*(lake|onelake)/` in globals but **scoped**: phrase rules are global — add optional `room?: string` to the phrase rule type and check it in the hook.
- `lake.swim`: `use`|`drink` noun `lake` → "You dip a toe in the OneLake. It is exactly one lake deep."

`lake.dock` — describe: (ferry.online ? "The Ferryman's dock. His lamp glows ONLINE. The boat, painted GATEWAY, rocks gently." : "The Ferryman's dock. A lamp on the post reads OFFLINE in a sad red. The boat, painted GATEWAY, is tied up. The Ferryman stares at the water."). npcs `['ferryman']`, exits `{ w: 'lake.shore', e: (s) => s.flags['ferry.online'] ? 'lake.island' : null }`. Rules:
- `lake.ferry` (points 15): `give` noun in `['credentials','creds']` noun2 in `['ferryman','ferry man','gateway','boatman']` has `['credentials']` → "The Ferryman takes the credentials with shaking hands. The lamp flickers… ONLINE. 'Standard mode,' he whispers, and begins to weep. 'Board when ready.'" set `{ 'ferry.online': true }`, remove `['credentials']`.
- `lake.board`: `board` (any noun or none) flags `ferry.online` → moveTo `lake.island`, text "You board the GATEWAY. The crossing takes exactly as long as the first refresh after a gateway update."
- `lake.board-offline`: `board` flags not `ferry.online` → "The Ferryman shakes his head. OFFLINE. You could swim, but the OneLake is one lake deep, and that is very deep." outcome fail.

`lake.island` — describe: "The Isle of Gateway. A stone plinth holds two keys: a PERSONAL key and a STANDARD key. A plaque reads: CHOOSE. THEN LIVE WITH IT." + (taken.standard key ? " The STANDARD key is gone." : ""). items `['personal key','standard key']`, exits `{ w: 'lake.dock' }`. Rules:
- `lake.key` (points 20): `get` noun in `['standard key','gateway key','standard mode key','key','standard']` flags not `taken.standard key` → "You take the STANDARD key. It is heavy in the way things are heavy when many people depend on them." give `['standard key']`, set `{ 'trial.key': true, 'taken.standard key': true }`.
- `lake.personal`: `get` noun in `['personal key','personal mode key','personal']` → "You take the PERSONAL key. It only works for you, and only while your laptop is open. You feel a strong urge to close your laptop." give `['personal key']`, set `{ 'taken.personal key': true }`, outcome snark.
- `lake.board-back`: `board` → moveTo `lake.dock`, text "You ride the GATEWAY back."

`swamp.bronze` — describe: "The Bronze Marsh. Raw data pools in every footprint. Nothing has a type. Nothing has a name. A CSV floats by with 'Column1, Column2, Column3' on its face." items `['water']`, exits `{ n: 'lake.shore', s: 'swamp.silver' }`. Rules:
- `death.bronze`: `drink` noun in `['water','marsh','marsh water','bronze water','raw data']` or no noun → death `death.bronze`: "You drink raw data. Nothing is typed. Everything is a string. You are a string."

`swamp.silver` — describe: "The Silver Marsh. The water is cleaner here, and slightly judgmental. Transaction logs drift by in neat JSON." items `['log']`, exits `{ n: 'swamp.bronze', s: 'swamp.gold' }`. Rules:
- `swamp.drink-silver`: `drink` → "You drink Silver water. It has been deduplicated. You feel slightly less redundant."

`swamp.gold` — describe: "The Gold Marsh. Everything here has a business name and a data type. It is beautiful. A signpost reading SHORTCUT stands at the water's edge, pointing everywhere at once. East, a path climbs to a monastery." + (taken.shortcut ? " The signpost is gone; the marsh is somehow unchanged." : ""). items `['shortcut']`, exits `{ n: 'swamp.silver', e: 'monastery.gate' }`. Rules:
- `swamp.shortcut` (points 10): `get` noun in `['shortcut','signpost','sign','onelake shortcut']` flags not `taken.shortcut` → "You pick up the Shortcut. It weighs nothing. It's just a pointer." give `['shortcut']`, set `{ 'taken.shortcut': true }`.
- `swamp.drink-gold`: `drink` → "You drink Gold water. It tastes like a well-named measure."

Global (add to `globals.ts` `GLOBAL_RULES`): `global.use-shortcut`: `use` noun in `['shortcut','signpost','sign']` has `['shortcut']` → moveTo `lake.shore`, text "You take the Shortcut. No data was moved.", outcome success.

- [ ] **Step 2:** `npx tsc --noEmit` clean. **Commit** — `git commit -am "feat(world): OneLake and Lakehouse Swamp region"`

---

### Task 7: Notebook Monastery region

**Files:**
- Create: `src/world/monastery.ts` exporting `MONASTERY_ROOMS`

- [ ] **Step 1: Write the four rooms**

`monastery.gate` — describe: (gate.open ? "The Monastery gate stands open. Beyond it, the cloister." : `The Monastery gate. A gatekeeper monk stands beside a stone progress bar. It reads: SESSION STARTING… ${['0%','33%','67%'][(s.flags['gate.waiting'] as number) ?? 0]}`). npcs `['monk']`, exits `{ w: 'swamp.gold', n: (s) => s.flags['gate.open'] ? 'monastery.cloister' : null }`. Rules:
- `monastery.wait` (points 10): `wait` flags `[{flag:'gate.waiting', is: 2}]` → "SESSION STARTED. It took four minutes, as is tradition. The gate swings open." set `{ 'gate.open': true, 'gate.waiting': 3 }`.
- `monastery.wait-2`: `wait` flags `[{flag:'gate.waiting', is: 1}]` → "The bar creeps to 67%. The monk hums." set `{ 'gate.waiting': 2 }`, outcome success.
- `monastery.wait-1`: `wait` flags `[{flag:'gate.open', not:true},{flag:'gate.waiting', not:true}]` → "The bar creeps to 33%. The monk nods approvingly at your patience." set `{ 'gate.waiting': 1 }`, outcome success. (Order in `rules` array: wait (is 2) first, wait-2, wait-1.)
- `monastery.open-gate`: `open` noun in `['gate','door']` flags not `gate.open` → "You push the gate. The monk shakes his head and points at the progress bar. Some things cannot be rushed. Well — they can, with a Starter Pool, but not here." outcome fail.
- `monastery.go-north-closed`: `go` dir `n` flags not `gate.open` → "The gate is closed. SESSION STARTING…" outcome fail.

`monastery.cloister` — describe: "The cloister. Monks pace in circles, each murmuring the same phrase: 'spark dot read, spark dot read.' The Abbot stands at the center. The Spark Session Chamber is east; the Library, west." npcs `['abbot']`, exits `{ s: 'monastery.gate', e: 'monastery.spark', w: 'monastery.library' }`. Rules:
- `monastery.hoodie` (points 15): `talk` noun in `['abbot','father abbot']` flags `notebook.fixed`, not `has.hoodie` → "'Brother Pandas' notebook runs,' says the Abbot, 'and the Lakehouse is free of pandas. Kneel.' He drapes the Hoodie of Spark over your shoulders. It is warm, and slightly too big, as is tradition." give `['hoodie']`, set `{ 'has.hoodie': true }`.

Global: `global.wear-hoodie`: `wear` noun in `['hoodie','hoodie of spark','spark hoodie']` has `['hoodie']` flags not `trial.hoodie` → "You pull on the Hoodie of Spark. You look like a Data Engineer. You have never written a notebook in your life. Nobody can tell." set `{ 'trial.hoodie': true }` plus the builtin `wear` behavior — implement by having the rule's `then` also include a new field `wear?: string[]` handled in `applyRule` (adds to `state.worn`, adds to `world/types.ts RuleThen`). Points for the trial were counted in `monastery.hoodie`; this rule awards 0.

`monastery.spark` — describe: (notebook.fixed ? "The Spark Session Chamber. Brother Pandas' notebook runs quietly. A Delta table glows on the wall." : "The Spark Session Chamber. Brother Pandas hunches over a notebook. One cell is running. It has been running for a while. On the wall, a Lakehouse groans under the weight of eleven thousand pandas."). items `['notebook']`, npcs `['pandas']`, exits `{ w: 'monastery.cloister' }`. Rules:
- `monastery.fix` (points 20): `use` noun in `['scroll','spark scroll']` noun2 in `['notebook','cell','brother pandas notebook']` has `['scroll']` → "You unroll the Spark Scroll over the notebook. `pd.read_csv` becomes `spark.read.format('delta')`. The cell finishes in four seconds. Brother Pandas weeps. The Lakehouse exhales. Eleven thousand pandas amble off toward the Silver Marsh." set `{ 'notebook.fixed': true }`, remove `['scroll']`.
- `monastery.fix-noscroll`: `use` noun2 in `['notebook','cell']` flags not `notebook.fixed` → "You stare at the cell. You don't know Spark. The cell knows you don't know Spark." outcome fail.
- `monastery.read-notebook`: `read` noun in `['notebook','cell']` → item describe text (delegate: `then.text: (s) => ITEMS['notebook'].describe as string`).

`monastery.library` — describe: "The Library of Deprecated Notebooks. Shelves of Runtime 1.1, Runtime 1.2, and a whole wing labeled 'Synapse'. The Librarian guards a single locked case containing the Spark Scroll." + (scroll.lent ? " The case is open and empty." : ""). npcs `['librarian']`, exits `{ e: 'monastery.cloister' }`. Rules:
- `monastery.card` (points 10): `give` noun in `['license','card','license card','pro license']` noun2 `librarian` has `['license']` flags not `scroll.lent` → "The Librarian examines your Pro License Card for a long moment. 'Hm. Pro.' She unlocks the case and hands you the Spark Scroll. 'Bring it back by the end of the session.' She keeps the card as collateral." give `['scroll']`, remove `['license']`, set `{ 'scroll.lent': true }`.
- `monastery.get-scroll-locked`: `get` noun in `['scroll','spark scroll']` flags not `scroll.lent` → "The case is locked. The Librarian raises one eyebrow, which is somehow also locked." outcome fail.
- `monastery.read-scroll`: handled globally below.

Global: `monastery.read-scroll` (points 5): `read` noun in `['scroll','spark scroll']` has `['scroll']` → "You read the Spark Scroll. `df = spark.read.format('delta').load(path)`. Then, in smaller letters: `# TODO: figure out the path`. You feel enlightened and slightly worried."

- [ ] **Step 2:** `npx tsc --noEmit` clean. **Commit** — `git commit -am "feat(world): Notebook Monastery region"`

---

### Task 8: Warehouse Fortress and Capacity Peaks regions

**Files:**
- Create: `src/world/fortress.ts` (`FORTRESS_ROOMS`), `src/world/peaks.ts` (`PEAKS_ROOMS`)

- [ ] **Step 1: Fortress rooms**

`fortress.bridge` — describe: (bridge.down ? "The drawbridge is down. The Great Hall of Warehouse Fortress yawns north." : "Warehouse Fortress. The drawbridge is up. A guard leans over the battlements. Below, the Moat of T-SQL glitters with semicolons."). npcs `['guard']`, exits `{ s: 'peaks.foothills', n: (s) => s.flags['bridge.down'] ? 'fortress.hall' : null }`. Rules:
- `fortress.sku` (points 10): `say` noun in `['trial','trial capacity','f trial','fabric trial']` flags not `bridge.down` → "'Trial capacity, eh,' says the guard. 'Sixty days. Come in. Quickly.' The drawbridge crashes down." set `{ 'bridge.down': true }`.
- `fortress.sku-f64`: `say` noun in `['f64','f128','f256','f512','f1024','f2048']` → "'Nice try, peasant,' says the guard. 'Show me the invoice.'" outcome snark.
- `fortress.sku-pro`: `say` noun in `['pro','ppu','premium','premium per user','p1']` → "'PRO?' The guard laughs so hard the drawbridge rattles but does not lower." outcome snark.
- `fortress.sku-f2`: `say` noun in `['f2','f4','f8','f16','f32']` → "'Pause it or lose it,' mutters the guard. The bridge stays up." outcome snark.
- `fortress.north-closed`: `go` dir `n` flags not `bridge.down` → "The drawbridge is up. The moat is deep and full of GROUP BY." fail.

`fortress.hall` — describe: "The Great Hall. Long tables, all of them clustered columnstore. Guards line the walls. The Duke's chamber is north; a door east leads to the Pipeline Yard." exits `{ s: 'fortress.bridge', n: 'fortress.throne', e: 'fortress.yard' }`. Rules: none beyond builtins.

`fortress.throne` — describe: (trial.moat ? "The Duke's chamber. The Duke pretends not to see you. You still smell like the moat." : "The Duke's chamber. The Duke of Warehouse sits on a throne of stacked schemas. He speaks only in JOINs."). npcs `['duke']`, exits `{ s: 'fortress.hall' }`. Rules:
- `fortress.moat` (points 25): `say` noun in `['select *','select star','select * from','select *;']` flags not `trial.moat` → "'SELECT STAR?' The Duke rises. 'IN. MY. WAREHOUSE?' Two guards seize you by the arms and hurl you from the window into the Moat of T-SQL. You surface, sputtering, covered in semicolons and something that might be a CROSS APPLY. You climb out. You will never not smell like this." set `{ 'trial.moat': true }`, moveTo `fortress.bridge`.
- `fortress.select1`: `say` noun in `['select 1','select 1;']` → "'Adequate,' says the Duke, and returns to his throne." outcome snark.
- `fortress.select-cols`: `say` noun matches (use `noun: undefined` and a `then.text` function is not enough — add `RuleWhen.nounMatches?: RegExp` to `world/types.ts` and honor it in `step.ts`) `/^select .+ from/` → "'A column list. How… proper.' The Duke seems disappointed. 'Nobody gets thrown in the moat for a column list.'" outcome snark.
- `fortress.attack-duke`: `attack` noun in `['duke','duke of warehouse','the duke']` → "You swing at the Duke. He INNER JOINs your fist to the wall. It hurts in every row." fail.

`fortress.yard` — describe: (copy.fixed ? "The Pipeline Yard. The Copy Activity hums. The Lookup Activity has gone back to looking at nothing in particular." : lookup.beaten ? "The Pipeline Yard. A cable lies on the flagstones where the Lookup dropped it. The Copy Activity is still stuck: Waiting on Lookup." : "The Pipeline Yard. Pipes everywhere, none of them connected. A Copy Activity sits stuck, its status reading WAITING ON LOOKUP. The Lookup Activity stands in the corner. It is looking at you."). npcs `['lookup','copy']`, items `['cable']` (hidden until `lookup.beaten`: add `visibleWhen?: (s) => boolean` to `Item` and honor in `describeRoom`/`resolveNoun`), exits `{ w: 'fortress.hall' }`. Rules:
- `fortress.stare-start`: `look` noun in `['lookup','lookup activity']` flags not `lookup.beaten`, not `stare.count` → "You look at the Lookup Activity. It looks at you. This is going to take a while." set `{ 'stare.count': 1 }`, outcome success.
- `fortress.stare-wait-1`: `wait` flags `[{flag:'stare.count', is:1}]` → "You do not blink. The Lookup does not blink. Somewhere, a pipeline times out." set `{ 'stare.count': 2 }`, outcome success.
- `fortress.stare` (points 10): `wait` flags `[{flag:'stare.count', is:2}]` → "The Lookup Activity… blinks. It looks away, ashamed, and drops a connection cable at your feet." set `{ 'lookup.beaten': true, 'stare.count': 3 }`.
- `fortress.copy` (points 15): `use` noun in `['cable','connection','connection cable','wire']` noun2 in `['copy','copy activity']` has `['cable']` → "You plug the cable into the Copy Activity. Status: RUNNING. Status: RUNNING. Status: SUCCEEDED. The Copy Activity deposits, at your feet, a pair of boots. Provenance unknown." set `{ 'copy.fixed': true }`, remove `['cable']`, give `['boots']`.
- `fortress.copy-nocable`: `use` noun2 in `['copy','copy activity']` flags not `copy.fixed` → "The Copy Activity has no connection. It waits. It is very good at waiting." fail.

Global: `global.wear-boots`: `wear` noun in `['boots','bursting boots','pair of boots']` has `['boots']` → "You lace up the Bursting Boots. You feel faster, and slightly over budget." `wear: ['boots']`.

- [ ] **Step 2: Peaks rooms**

`peaks.foothills` — describe: "The Foothills of the Capacity Peaks. A sign reads: CAPACITY PEAKS — INTERACTIVE OPERATIONS MAY BE DELAYED. Warehouse Fortress squats to the north; the Throttling Pass climbs east; the Refresh Fields lie west." exits `{ w: 'village.fields', n: 'fortress.bridge', e: 'peaks.pass' }`. Rules:
- `peaks.read-sign`: `read`/`look` noun `sign` → "CAPACITY PEAKS — INTERACTIVE OPERATIONS MAY BE DELAYED. BACKGROUND OPERATIONS WILL BE SMOOTHED OVER 24 HOURS. PLEASE DO NOT FEED THE DRAGON."

`peaks.pass` — describe: "The Throttling Pass. Every step takes longer than the last. The air is thin and billed per second. The Bursting Ledge is north." onEnter: (s) => s.worn.includes('boots') ? "You burst through the Pass." : "Your every movement is throttled." exits `{ w: 'peaks.foothills', n: 'peaks.ledge' }`. Rules: none.

`peaks.ledge` — describe: (shrine.open ? "The Bursting Ledge. The Shrine door stands open to the north; three sigils glow." : "The Bursting Ledge. A great door is carved with three sigils: a HOODIE, three wavy STINK LINES, and a KEY. " + sigil status: for each trial flag append `"The hoodie sigil glows." / "The hoodie sigil is dark."`, etc.). exits `{ s: 'peaks.pass', n: (s) => s.flags['shrine.open'] ? 'peaks.shrine' : null }`. onEnter: `peaks.shrine-door` logic — implement as a **rule** instead so it can award points: rule `peaks.shrine-door` (points 5) when `look` noun in `['door','sigils','shrine','shrine door']` OR `open` noun `door` OR `go` dir `n`, flags `trial.hoodie`, `trial.moat`, `trial.key`, not `shrine.open` → "The three sigils blaze. Hoodie. Stink. Key. The door grinds open. You are Worthy, apparently." set `{ 'shrine.open': true }`. (Three rules with ids `peaks.shrine-door`, `peaks.shrine-door-open`, `peaks.shrine-door-go`, all gated on not `shrine.open`, only the first carries points; the others set `shrine.open` and award 0 — **but** then a player who opens via `go n` never gets the 5. Fix: all three share `then.points: 5`, and `applyRule` keys points by `then.pointsKey ?? rule.id` — add optional `pointsKey?: string` to `RuleThen`; set `pointsKey: 'peaks.shrine-door'` on all three.)
- `peaks.door-locked`: `go` dir `n` flags not `shrine.open` → "The door does not move. " + list of dark sigils ("The hoodie sigil is dark." etc.). fail.
- `peaks.open-locked`: `open` noun `door` flags not `shrine.open` → same text. fail.

`peaks.shrine` — describe: (dragon.gone ? "The Shrine. The Golden Semantic Model rests on a pedestal, unguarded, glowing with the light of a thousand well-named measures." : "The Shrine. On a pedestal glows the Golden Semantic Model. Coiled around the pedestal is THROTTLOR, the Capacity Dragon. Smoke rises from his nostrils in neat 30-second intervals."). npcs `['throttlor']`, items `['model']` (visibleWhen `dragon.gone`), exits `{ s: 'peaks.ledge' }`. Rules:
- `death.dragon`: `attack` noun in `['dragon','throttlor','throttlor the capacity dragon','capacity dragon']` → death `death.dragon`: "You charge Throttlor. He breathes a single, precise jet of flame. Your refresh has been throttled. Permanently."
- `peaks.dragon` (points 10): `say` noun in `['star schema','a star schema','the star schema','star']` flags not `dragon.gone` → "'STAR… SCHEMA?' Throttlor recoils. 'One fact table? Conformed dimensions? Single-direction filters?' He shrieks, deflates like a paused capacity, and drifts out of the Shrine, whistling faintly. He does not come back." set `{ 'dragon.gone': true }`.
- `peaks.dragon-calculate`: `say` noun in `['calculate','dax','measure']` → "Throttlor yawns. Context transition means nothing to a dragon." snark.
- `peaks.dragon-flat`: `say` noun in `['flat table','one big table','obt','wide table']` → "Throttlor purrs. 'Yes. YES. Feed me.' The pedestal glows brighter. You have made things worse." snark.
- `peaks.get-model-guarded`: `get` noun in `['model','golden semantic model','semantic model','golden model']` flags not `dragon.gone` → "You reach for the Model. Throttlor's tail slaps your hand away without his even looking. 'Answer the question, peasant.'" fail.
- `peaks.model` (points 5, win): `get` noun in `['model','golden semantic model','semantic model','golden model']` flags `dragon.gone` → win, text: "You lift the Golden Semantic Model.\n\nIt is one table.\n\n412 columns. The first is named Column1. There is a measure named 'Measure 2 (copy)'. Half the columns are dates stored as text. There is a column called 'Notes' that contains, in row 8,041, the phrase 'ask Jeff'.\n\nYou weep. Then you carry it down the mountain anyway. The village's refreshes run that night, slow but unthrottled, and the people cheer, and nobody asks what the Model looks like inside.\n\nTHE END." give `['model']`, set `{ 'game.won': true }`.

- [ ] **Step 3:** `npx tsc --noEmit` clean. **Commit** — `git commit -am "feat(world): Fortress and Peaks regions; ending"`

---

### Task 9: World assembly and golden-path test

**Files:**
- Create: `src/world/index.ts`
- Test: `tests/golden-path.test.ts`

**Interfaces:**
- Produces: `WORLD: World`, `WORLD_VERSION = '0.1.0'`, `GOLDEN_PATH: string[]` (exported from the test file's sibling `tests/golden-path.ts` so the replay script and e2e can reuse it).

- [ ] **Step 1: index.ts** merges `VILLAGE_ROOMS`, `LAKE_ROOMS`, `MONASTERY_ROOMS`, `FORTRESS_ROOMS`, `PEAKS_ROOMS`; `items: ITEMS`, `npcs: NPCS`, `globalRules: GLOBAL_RULES`, `snark: SNARK`, `helpText: HELP_TEXT`, `start: 'village.cottage'`, `version: WORLD_VERSION`.

- [ ] **Step 2: Write `tests/golden-path.ts`**

```ts
export const GOLDEN_PATH = [
  'look', 'get mug', 'read report', 'out', 'read board', 'give mug to jeff',            // 5
  'n', 'talk to miller', 's',                                                            // +10 = 15
  's', 'e', 'give credentials to ferryman', 'board boat', 'get standard key', 'board boat', 'w', // +15 +20 = 50
  's', 's', 's', 'get shortcut',                                                          // +10 = 60
  'e', 'wait', 'wait', 'wait', 'n',                                                       // +10 = 70
  'w', 'give license to librarian', 'read scroll', 'e', 'e', 'use scroll on notebook', 'w', 'talk to abbot', 'wear hoodie', // +10 +5 +20 +15 = 120
  'use shortcut', 'n', 'e', 'e', 'n',                                                     // shore→square→fields→foothills→bridge
  'say trial', 'n', 'n', 'say select *',                                                  // +10 +25 = 155 (thrown back to bridge)
  'n', 'e', 'look at lookup', 'wait', 'wait', 'use cable on copy activity', 'wear boots', // +10 +15 = 180
  'w', 's', 's', 'e', 'n', 'say star schema', 'get model',                                // +5 +10 +5 = 200
];
```

- [ ] **Step 3: Write the failing golden-path test**

```ts
import { describe, it, expect } from 'vitest';
import { newGame, step, MAX_SCORE } from '../src/engine/step';
import { WORLD } from '../src/world';
import { GOLDEN_PATH } from './golden-path';

describe('golden path', () => {
  it('reaches 200/200 and wins without dying', () => {
    let s = newGame(WORLD, 42);
    const log: string[] = [];
    for (const cmd of GOLDEN_PATH) {
      const r = step(s, cmd, WORLD);
      log.push(`> ${cmd}\n${r.output.join('\n')}  [${r.outcome} ${r.stepId} +${r.pointsAwarded}]`);
      expect(r.state.dead, log.join('\n')).toBe(false);
      s = r.state;
    }
    expect(s.score, log.join('\n')).toBe(MAX_SCORE);
    expect(s.won).toBe(true);
    expect(s.flags['trial.hoodie']).toBe(true); expect(s.flags['trial.moat']).toBe(true); expect(s.flags['trial.key']).toBe(true);
  });
  it('sum of all scored rules in the world is exactly 200', () => {
    const seen = new Map<string, number>();
    for (const room of Object.values(WORLD.rooms)) for (const r of room.rules) if (r.then.points) seen.set(r.then.pointsKey ?? r.id, r.then.points);
    for (const r of WORLD.globalRules) if (r.then.points) seen.set(r.then.pointsKey ?? r.id, r.then.points);
    expect([...seen.values()].reduce((a, b) => a + b, 0)).toBe(200);
  });
});
```

- [ ] **Step 4: Run** → fix world content and path until PASS. Print `log` on failure to find the first broken step. (Note `village.credentials` and `village.credentials-get` both carry 10 with different ids — the sum test must key them together: give both `pointsKey: 'village.credentials'`.)

- [ ] **Step 5: Commit** — `git commit -am "feat(world): assemble world; golden path proves 200/200"`

---

### Task 10: World lint

**Files:**
- Create: `src/world/lint.ts`, `scripts/lint-world.ts`
- Test: `tests/world-lint.test.ts`
- Modify: `package.json` scripts: `"lint:world": "tsx scripts/lint-world.ts"`

- [ ] **Step 1: Test**

```ts
import { it, expect } from 'vitest';
import { lintWorld } from '../src/world/lint';
import { WORLD } from '../src/world';
it('world has no dangling references', () => { expect(lintWorld(WORLD)).toEqual([]); });
```

- [ ] **Step 2: Implement `lintWorld(world): string[]`** — checks: every static exit target exists; function exits are probed with a state having every known flag set to `true` (collect flag names from all `then.set` keys) and must return an existing room or null; every `room.items`/`room.npcs` id exists; every `give`/`remove`/`has`/`worn` id exists in items; rule ids unique across the world (excluding `pointsKey` groups); every room has `scene` returning a non-empty string; `world.start` exists; every rule with `moveTo` targets a real room. Returns a list of `"room.x: exit n -> missing.room"` strings.

- [ ] **Step 3: scripts/lint-world.ts** prints problems and exits 1 if any. Run `npm run lint:world` → "World OK (22 rooms, N items, N rules)".

- [ ] **Step 4: Commit** — `git commit -am "feat(world): lint for dangling references"`

---

### Task 11: Death and double-award tests

**Files:**
- Test: `tests/deaths.test.ts`

- [ ] **Step 1: Write tests** — helper `play(cmds: string[])` runs from `newGame(WORLD, 1)`. Cases:
  - `['out','s','s','drink water']` → dead, `deathCause === 'death.bronze'`.
  - `['delete workspace']` → dead, `death.delete-workspace`.
  - `['out','s','import onelake']` → dead, `death.import`; and `['import onelake']` in the cottage → **not** dead (room-scoped phrase rule).
  - `['out','give paginated report to jeff']` → dead, `death.paginated`.
  - Golden path up to the shrine then `'attack dragon'` → dead, `death.dragon`.
  - `['out','n','talk to miller','get credentials']` → score 10 (not 20), inventory has one `credentials`.
  - `['out','n','get credentials','talk to miller']` → score 10.
  - Interactive delay: golden path up to `peaks.pass` **without** `wear boots` → turns increase by 3 per command; with boots → 1.
  - Restart semantics: `newGame` after death yields score 0, room cottage.
- [ ] **Step 2: Run** → PASS (fix content as needed). **Commit** — `git commit -am "test: deaths, double-award guard, interactive delay"`

---

### Task 12: UI — title, play, death, finish screens; save/restore; recorder stub

**Files:**
- Create: `src/game/save.ts`, `src/game/recorder.ts`, `src/ui/App.tsx` (replace), `src/ui/TitleScreen.tsx`, `src/ui/PlayScreen.tsx`, `src/ui/ScenePanel.tsx`, `src/ui/DeathCard.tsx`, `src/ui/FinishScreen.tsx`, `src/ui/styles.css`

**Interfaces:**
- Produces:
  ```ts
  // game/recorder.ts
  type QuestStart = { questId: string; playerName: string; clientId: string; worldVersion: string; startedAt: string };
  type ActivityRecord = { questId: string; seq: number; stepId: string; roomId: string; rawInput: string; verb?: string; noun?: string; outcome: string; outputText: string; pointsAwarded: number; scoreAfter: number; turnsAfter: number; flagsAfter: string; occurredAt: string };
  type FinishRecord = { questId: string; playerName: string; score: number; turns: number; elapsedSeconds: number; finishedAt: string };
  interface Recorder { startQuest(q: QuestStart): void; record(a: ActivityRecord): void; finish(f: FinishRecord): void; }
  class ConsoleRecorder implements Recorder { /* console.debug */ }
  // game/save.ts
  type SaveBlob = { state: GameState; questId: string; playerName: string; startedAt: string; seq: number; log: string[] };
  save(b: SaveBlob): void; load(): SaveBlob | null; clear(): void; getClientId(): string;  // all try/catch around localStorage
  ```

- [ ] **Step 1: Write recorder.ts and save.ts** as specified (`getClientId` creates and persists `crypto.randomUUID()` under `prosquest.client`; save key `prosquest.save`).

- [ ] **Step 2: App.tsx** — state machine `screen: 'title' | 'play' | 'dead' | 'finish'`. On title submit: `questId = crypto.randomUUID()`, `recorder.startQuest(...)`, `state = newGame(WORLD, hash(questId))`, initial log = `describeRoom`. On each command: `r = step(state, input, WORLD)`; append `> input` and `r.output` to log; `recorder.record({...})` with `seq++`; `save(...)`; if `r.state.dead` → `dead`; if `r.state.won` → `finish` and `recorder.finish(...)`. Meta verbs handled in App before `step`: `save` → explicit save + "Game saved."; `restore` → `load()` or "No saved game."; `restart` → back to cottage with same questId (new `newGame`), "Restarted."; `quit` → title. (They still go through `step` for the turn count and telemetry: call `step` first, then act on `r.parsed.verb`.) On mount: if `load()` returns a blob, show "Restore saved game?" on the title screen.

- [ ] **Step 3: PlayScreen.tsx** — layout per Global Constraints: `<div class="statusbar"><span>Score : {score} of 200</span><span>Fabric's Quest</span></div>`, `<ScenePanel roomId sceneId/>`, `<div class="textwin">` showing the last 8 log lines (full log scrollable on click/expand), `<form class="prompt">&gt; <input autoFocus/></form>` with ↑/↓ history. Enter submits; input cleared; focus retained.

- [ ] **Step 4: ScenePanel.tsx** — placeholder until Plan 3: a 4:3 box (max-width 640px) with EGA-ish background color per region (`village` #AA5500 brown/ olive, `lake` #0000AA, `swamp` #00AA00, `monastery` #AAAAAA, `fortress` #555555, `peaks` #AA00AA) and the room name centered in Press Start 2P; if `/scenes/${sceneId}.png` exists (probe with `<img onError>`), render it instead.

- [ ] **Step 5: TitleScreen.tsx** — black background, title "Fabric's Quest" in yellow with red text-shadow (Press Start 2P, 32px), "ENTER YOUR NAME, PEASANT:" + input + "CLICK ANYWHERE TO PLAY!" (click focuses the input; Enter starts), footer "by Puglia BI · a tribute to the text adventures of yore". No character portrait until Plan 3 (leave a 160×200 black box on the right).

- [ ] **Step 6: DeathCard.tsx** — centered box over the play screen: "You have died." + cause line (the last output) + "Restore, Restart, or Quit?" with three buttons; typing `restore`/`restart`/`quit` also works.

- [ ] **Step 7: FinishScreen.tsx** — ending text (scrollable), "Score : 200 of 200 · Turns: N · Time: mm:ss", "Play again" button, and a "Hall of Fame" panel that says "Hall of Fame goes live in Plan 2." (placeholder text).

- [ ] **Step 8: styles.css** — body black, `#root` centered column max-width 640px, 16px side gutters, `.statusbar` white bg black text Press Start 2P 12px flex space-between, `.scene` 4:3 `aspect-ratio`, `.textwin` black bg white monospace 14px min-height 8 lines, `.prompt` white monospace with blinking caret; respects `prefers-color-scheme` trivially (always dark).

- [ ] **Step 9: Run** `npm run dev`, play the first five golden-path commands manually in Chromium via Playwright screenshot (`npx playwright screenshot --viewport-size=800,900 http://localhost:5173 /tmp/title.png` after `npm run dev &`) and view the screenshot. Fix layout until it matches spec §9. **Commit** — `git commit -am "feat(ui): title, play, death, finish screens; localStorage save; recorder stub"`

---

### Task 13: Replay script and Playwright smoke test

**Files:**
- Create: `scripts/replay.ts`, `e2e/smoke.spec.ts`, `playwright.config.ts`
- Modify: `package.json` scripts: `"replay": "tsx scripts/replay.ts"`, `"e2e": "playwright test"`; devDependency `@playwright/test` (do **not** run `playwright install`; `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` is preset).

- [ ] **Step 1: replay.ts** — `npm run replay -- path/to/inputs.json [seed]` reads a JSON array of raw inputs (Plan 2 adds fetching from the DB), runs them through `step`, prints `> cmd` / output / `[outcome stepId +pts]` per line and a final score; exits 1 if any step throws. Verify with `npm run replay -- tests/golden-path.json` (write that JSON from `GOLDEN_PATH` in this step).

- [ ] **Step 2: e2e/smoke.spec.ts**

```ts
import { test, expect } from '@playwright/test';
test('title → name → look → move', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText("Fabric's Quest")).toBeVisible();
  await page.getByRole('textbox').fill('Tester');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Score : 0 of 200')).toBeVisible();
  await page.getByRole('textbox').fill('look'); await page.keyboard.press('Enter');
  await expect(page.getByText(/Your cottage/)).toBeVisible();
  await page.getByRole('textbox').fill('out'); await page.keyboard.press('Enter');
  await expect(page.getByText(/Village Square/)).toBeVisible();
});
```

`playwright.config.ts`: `use: { baseURL: 'http://localhost:5173' }`, `webServer: { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: true }`, `projects: [{ name: 'chromium', use: { browserName: 'chromium' } }]`.

- [ ] **Step 3: Run** `npm run e2e` → PASS. **Commit** — `git commit -am "test: replay script and Playwright smoke"`

---

### Task 14: Wrap-up

- [ ] **Step 1:** `npm test && npm run lint:world && npm run build` all green.
- [ ] **Step 2:** Write `README.md` (how to run, test, the world file layout, how to add a room/rule, the 200-point ledger) — short.
- [ ] **Step 3:** Save a build log to the Claude project as `claude/pros-quest-plan1-game-core-build-sep22.md`: what was built, test counts, golden path, anything deviating from the spec.
- [ ] **Step 4:** Commit; produce a zip of the repo (excluding node_modules) to `/mnt/user-data/outputs/pros-quest-plan1.zip` and send it.

---

## Self-review

- **Spec coverage:** §2 story (Task 8 ending), §3 rooms/exits (Tasks 5–8, lint Task 10), §4 items/NPCs/flags (Task 4), §5 all 17 scored steps (Tasks 5–8; sum asserted Task 9), interactive delay (Task 3 + Task 11), §6 deaths/easter eggs (Task 4/6/8 + Task 11), §7 parser and outcome classification (Task 2/3), §8 engine API and file layout (Tasks 3, 9), save/restore (Task 12), replay and lint (Tasks 10, 13), §9 UI (Task 12), §13 tests (Tasks 2, 3, 9, 10, 11, 13). §10 art, §11 entities, §12 deploy → Plans 2/3 by design.
- **Placeholder scan:** ScenePanel and Hall of Fame panels are *deliberate* placeholders scoped out to Plans 2/3 and labeled as such; no TBDs in engine or content.
- **Type consistency:** `RuleThen` gains `wear?: string[]` (Task 7) and `pointsKey?: string` (Task 8); `RuleWhen` gains `nounMatches?: RegExp` (Task 8); `Item` gains `visibleWhen?` (Task 8); `Npc` gains `hiddenWhen?` (Task 5); phrase rules gain `room?` (Task 6). Task 3's `types.ts` must include all of these from the start to avoid churn — add them there.
