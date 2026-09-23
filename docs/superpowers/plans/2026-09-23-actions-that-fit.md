# Actions That Fit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewire six puzzles of the 200 so the action fits the Power BI thing it acts on (`use trial`, `use relationship` + `get date table`, `give date table to duke`, the Card's measure twice, pie → bar chart, `start session`), and give every main-path room a takeable item with a use somewhere else.

**Architecture:** Data-only changes in `src/world/*` (rules, items, flags, hints, NPC ladders) plus `tests/golden-path.json`; the engine is untouched except the parser's verb table. Every task leaves the golden path at exactly 200 and `npm test` green. Points move in two places only (Duke 25 → 20, Monastery Gate 10 → 5) to fund the Model View's new +10.

**Tech Stack:** TypeScript strict, Vitest, `npm run lint:world`, `npm run replay -- tests/golden-path.json`, `scripts/cheat-sheet.ts`.

**Spec:** `docs/superpowers/specs/2026-09-23-actions-that-fit-design.md` — the binding authority. Every line of narration below is copied from it; where the plan and the spec differ, the spec wins.

## Global Constraints

- The ledger is exactly **200** after every task (`tests/golden-path.test.ts` pins it). Bonus is never added to `score`; the bonus cap becomes 100 in Task 6.
- One scoring route per puzzle: the old `say trial`, `say calculated column`, `wait`, `look at card` + `wait`, `use policy on refresh` lines become nudges with **no points** (spec §1).
- Add-mode voice: existing lines stay unless the spec replaces them; new lines come from the spec verbatim; variety only via `vary`, `nick`, `rotate` (no `Math.random`).
- No hint, nudge, gate line, NPC line or goal card names a command the current state refuses, and oblique nudges never name the verb (`tests/setting-effects.test.ts` and `tests/hint-tone.test.ts` are the net).
- `pointsKey`s of the 200 rows keep their names (`fortress.sku`, `fortress.moat`, `fortress.stare`, `fortress.refresh-done`, `monastery.wait`) so `docs/ledger.md` rows and any saved games line up.
- `src/engine` and `src/world` stay pure. Engine changes are limited to `src/engine/parser.ts` (verb table) in Task 1.
- Each task ends with `npx tsc -b && npm test && npm run lint:world && npm run replay -- tests/golden-path.json` green and a commit whose message ends with the two attribution lines this session uses.
- Never dispatch subagents from a task; never edit `src/world/index.ts` registration order (new rules go inside existing room `rules` arrays or existing phrase lists).

---

### Task 1: The Desktop Gate — `use trial`

**Files:**
- Modify: `src/engine/parser.ts:4-17` (verb table)
- Modify: `src/world/fortress.ts` (room `fortress.bridge`: describe, flaskHint, nudge, rules `fortress.sku`, new `fortress.say-trial`)
- Modify: `src/world/keep-items.ts` (splash / update-dialog describes mention the link)
- Modify: `src/world/gates.ts` (Desktop Gate `shape`/`more` lines)
- Modify: `src/world/npcs.ts` (guard talk ladder line 237, `knows`)
- Modify: `src/world/where.ts` if it says "say" for the gate
- Modify: `tests/golden-path.json` (`say trial` → `use trial`), `tests/golden-plus-governance.test.ts:28` (`indexOf('say trial')` → `indexOf('use trial')`), `tests/fortress.test.ts`, `tests/gates.test.ts`, `tests/npc-talk.test.ts`, `e2e/*` if they type `say trial`
- Test: `tests/fortress.test.ts`

**Interfaces:**
- Produces: verbs `change`, `convert`, `switch`, `swap`, `start`, `press`, `click`, `drag`, `compare`, `activate`, `download` all map to `'use'` in the parser (later tasks rely on them). Flag `bridge.down` unchanged.

- [ ] **Step 1: Failing tests** in `tests/fortress.test.ts`:

```ts
describe('the Desktop Gate wants the link clicked', () => {
  const atGate = () => { let s = start(); for (const c of ['out', 'e', 'e', 'n']) s = step(s, c, WORLD).state; return s; };
  it('use trial drops the bridge and pays 10', () => {
    const r = step(atGate(), 'use trial', WORLD);
    expect(r.pointsAwarded).toBe(10);
    expect(r.state.flags['bridge.down']).toBe(true);
    expect(r.output.join(' ')).toMatch(/Try free/);
  });
  it.each(['start trial', 'click try free', 'try free', 'download desktop', 'install desktop', 'use link'])('%s also works', (cmd) => {
    expect(step(atGate(), cmd, WORLD).pointsAwarded).toBe(10);
  });
  it('say trial is a nudge with no points', () => {
    const r = step(atGate(), 'say trial', WORLD);
    expect(r.pointsAwarded).toBe(0);
    expect(r.state.flags['bridge.down']).toBeFalsy();
    expect(r.output.join(' ')).toMatch(/Show me/);
  });
  it('the guard, the hint and the gate never say "say it"', () => {
    const s = atGate();
    const texts = [WORLD.rooms['fortress.bridge']!.flaskHint(s), step(s, 'hint', WORLD).output.join(' '), step(step(step(s, 'talk to guard', WORLD).state, 'talk to guard', WORLD).state, 'talk to guard', WORLD).output.join(' '), step(s, 'open drawbridge', WORLD).output.join(' ')];
    for (const t of texts) expect(t).not.toMatch(/\bsay\b/i);
  });
});
```

- [ ] **Step 2: Run** `npx vitest run tests/fortress.test.ts` — expect the new block to fail.
- [ ] **Step 3: Parser**: add to `VERBS` (after the `plant: 'use'` line): `change: 'use', convert: 'use', switch: 'use', swap: 'use', start: 'use', press: 'use', click: 'use', drag: 'use', compare: 'use', activate: 'use', download: 'use',`. Run `npx vitest run tests/parser.test.ts tests/copilot.test.ts` — `start over` / `new chat` in Copilot are phrase rules on the raw line and must still work.
- [ ] **Step 4: The rule.** Replace `fortress.sku`'s `when` with `{ verb: 'use', noun: ['trial', 'trial capacity', 'f trial', 'fabric trial', 'free trial', 'ftrial', 'trial sku', 'try free', 'link', 'try free link', 'the link', 'desktop', 'power bi desktop'], flags: [{ flag: 'bridge.down', not: true }] }` and its text with the spec §1.1 line ("You click Try free. 'Sixty days,' says the guard, reading over your shoulder. 'Come in. Quickly.' The splash screen finishes updating (3 of 3). The drawbridge crashes down."). Keep `points: 10`, `set`, `sfx`. The parser reads `click try free` as verb `click` + noun `try free`; `try free` alone has no verb — add a phrase rule in the fortress phrase list: `{ id: 'fortress.try-free', room: 'fortress.bridge', test: /^(try (it )?free|use the link|click (the )?link)$/, then: (s) => s.flags['bridge.down'] ? null : { then: <same RuleThen as fortress.sku> } }` (share the object: `const TRIAL_THEN: RuleThen = …`). Note `fortress.update` currently answers `use installer`/`use install`; put `fortress.sku` **before** it in the array so `install desktop` scores (the noun list carries `desktop`), and keep `use update`/`use dialog` on `fortress.update`.
- [ ] **Step 5: The nudge.** New rule `fortress.say-trial`: `when: { verb: 'say', noun: [same trial words], flags: [{ flag: 'bridge.down', not: true }] }`, `then: { text: "'Trial,' the guard repeats. 'I've heard of it. Everyone's heard of it. Show me.' There's a link under the dialog.", outcome: 'fail' }`. Bridge down: `say trial` falls to the existing snark.
- [ ] **Step 6: Everything that said "say".** `describe` (bridge up) appends ` Under the update dialog, a link: Try free.`; `flaskHint` first tier → `'The guard wants a SKU. You cannot afford a real one. There is a free one, for sixty days, and a link under the dialog that starts it.'`; `nudge.plainer` first tier → `"He wants a SKU. There's a free one. It's a link, under the dialog, and it rhymes with denial."`; `gates.ts` Desktop Gate `shape`/`more` → the link, never "say"; `npcs.ts` guard talk 3 → `` `'The link, ${nick(s)}. Under the dialog. Try free. It's free. That's the joke.'` ``; guard `knows` adds `'link', 'try free', 'trial'`; keep-items `splash` and `update-dialog` describes mention the link. Grep `src/world` for `say trial|Say it|say it` in the bridge context and fix each.
- [ ] **Step 7: Golden path.** `tests/golden-path.json`: `"say trial"` → `"use trial"`. `tests/golden-plus-governance.test.ts`: `indexOf('say trial')` → `indexOf('use trial')`. Update any test that types `say trial` (grep `tests/ e2e/`).
- [ ] **Step 8: Run** `npx tsc -b && npm test && npm run lint:world && npm run replay -- tests/golden-path.json` — 200, won.
- [ ] **Step 9: Commit** `git add -A src tests e2e && git commit -m "Desktop Gate: use trial (the link under the dialog); say trial is a nudge"` + attribution lines.

---

### Task 2: The Model View and the Duke — `use relationship`, the date table, the moat

**Files:**
- Modify: `src/world/fortress.ts` (rooms `fortress.model`, `fortress.throne`; constants `MOAT_THEN`, `MOAT_AGAIN`, `SIN` handling)
- Modify: `src/world/keep-items.ts:147` (`date-table` takeable, `again`, blurb), `src/world/items.ts` if blurbs live there
- Modify: `src/world/monastery.ts:109-112` (`monastery.wait` points 10 → 5 — the mechanic changes in Task 3)
- Modify: `src/world/gates.ts:116` (Duke shape), `src/world/npcs.ts` (Duke talk 3, Sir Cardinality `knows`, Duke `knows`), `src/world/curses.ts` if hints say "say the thing", `src/world/globals.ts:67`, the region phrase `fortress.sin-elsewhere`
- Modify: `tests/golden-path.json`, `tests/keep-sense.test.ts`, `tests/fortress.test.ts`, `tests/deaths-and-curses.test.ts`, `tests/voice-items.test.ts` (new takeable needs a blurb)
- Test: `tests/fortress.test.ts`

**Interfaces:**
- Consumes: parser verbs from Task 1 (`activate`, `fix` → use).
- Produces: flags `model.related` (boolean), `taken.date` (boolean); item `date-table` takeable; `MOAT_THEN` keyed `fortress.moat` at **20** points; the golden path's Keep segment becomes `n, n, w, use relationship, get date table, e, n, give date table to duke, n, w, get policy, e, e, …` (the policy is still on the path until Task 4 replaces `use policy on refresh`).

- [ ] **Step 1: Failing tests** in `tests/fortress.test.ts`:

```ts
describe('the Model View relates, then the Duke throws', () => {
  const atModel = () => { let s = start(); for (const c of ['out', 'e', 'e', 'n', 'use trial', 'n', 'w']) s = step(s, c, WORLD).state; return s; };
  it('the date table cannot leave unrelated', () => {
    const r = step(atModel(), 'get date table', WORLD);
    expect(r.state.inventory).not.toContain('date-table');
    expect(r.output.join(' ')).toMatch(/related to nothing/);
  });
  it('use relationship pays 10 once and frees the table', () => {
    const r = step(atModel(), 'use relationship', WORLD);
    expect(r.pointsAwarded).toBe(10);
    expect(r.state.flags['model.related']).toBe(true);
    expect(step(r.state, 'use relationship', WORLD).pointsAwarded).toBe(0);
    const g = step(r.state, 'get date table', WORLD);
    expect(g.state.inventory).toContain('date-table');
  });
  it.each(['fix relationship', 'activate relationship', 'use relationship lines', 'use dashed line', 'set single direction'])('%s relates too', (cmd) => {
    expect(step(atModel(), cmd, WORLD).pointsAwarded).toBe(10);
  });
  it('give date table to duke: the moat, 20 points, unmarked text', () => {
    let s = atModel();
    for (const c of ['use relationship', 'get date table', 'e', 'n']) s = step(s, c, WORLD).state;
    const r = step(s, 'give date table to duke', WORLD);
    expect(r.pointsAwarded).toBe(20);
    expect(r.state.flags['trial.moat']).toBe(true);
    expect(r.state.room).toBe('fortress.bridge');
    expect(r.state.inventory).not.toContain('date-table');
    expect(r.output.join(' ')).toMatch(/UNMARKED/);
  });
  it('a marked table gets the CALENDARAUTO line and the same moat', () => {
    let s = atModel();
    for (const c of ['use relationship', 'get date table', 'use date table', 'e', 'n']) s = step(s, c, WORLD).state;
    const r = step(s, 'give date table to duke', WORLD);
    expect(r.pointsAwarded).toBe(20);
    expect(r.output.join(' ')).toMatch(/CALENDARAUTO/);
  });
  it('say calculated column is a strike now, not the moat', () => {
    let s = atModel();
    for (const c of ['e', 'n']) s = step(s, c, WORLD).state;
    const r = step(s, 'say calculated column', WORLD);
    expect(r.pointsAwarded).toBe(0);
    expect(r.state.flags['trial.moat']).toBeFalsy();
    expect(r.state.flags['duke.wrong']).toBe(1);
    expect(r.output.join(' ')).toMatch(/Bring me a table/);
  });
});
```

- [ ] **Step 2: Run** — expect failures.
- [ ] **Step 3: The relationship.** In `fortress.model.rules`, before `fortress.relationship`, add:

```ts
{
  id: 'fortress.relate',
  when: { verb: 'use', noun: ['relationship', 'relationships', 'relationship lines', 'lines', 'line', 'dashed line', 'inactive relationship', 'date relationship', 'single direction', 'a relationship', 'the relationship'], flags: [{ flag: 'model.related', not: true }] },
  then: { text: "You double-click the dashed line. Date[Date] to Sales[OrderDate]. Active: on. Cross-filter: single. Cardinality: one to many. Sir Cardinality nods once. It is the only time he will nod. The date table, which has been related to nothing since 2021, sits up.", set: { 'model.related': true }, points: 10, pointsKey: 'fortress.relate', sfx: 'item' },
},
{
  id: 'fortress.relate-again',
  when: { verb: 'use', noun: [same list], flags: [{ flag: 'model.related' }] },
  then: { text: "It's active. It's single. It's one to many. You can stop double-clicking it.", outcome: 'fail' },
},
```

`set single direction` parses as verb `set`? It does not — add `set: 'use'` to the parser **only if** `set <setting> on|off` (god mode) is a phrase rule on the raw line (check `src/engine/god.ts`); otherwise drop `set single direction` from the spec's synonyms and ledger the ruling. The old `fortress.relationship` ("Between which tables?") keeps its id and now needs `noun2` present or verb `create`: change its `when` to `{ verb: 'use', noun: ['relationship', 'relationships', 'new relationship', 'a relationship'], noun2: ['sheet1', 'bridge', 'sales', 'product', 'customer', 'plinth', 'plinths', 'sheet'] }` and add a twin `fortress.create-relationship` with `when: { verb: 'use', noun: ['new relationship', 'create relationship'] }` — `create` maps to `use`. Describe: prepend (before `model.related`) `One line is dashed: Date to Sales, inactive since a meeting in 2021.` and after `Date to Sales is solid now. Single direction. One to many. Sir Cardinality has stopped sighing.` (edit the existing `describe` function; keep the XMLA-off variants).

- [ ] **Step 4: The date table takeable.** `keep-items.ts` `date-table`: `takeable: true`, `blurb: 'The date table: 1900 to 2099, related to Sales, not yet marked. The Duke will notice.'` (make it a function of state: if `model.date`, `'…related to Sales, marked at last. The Duke will still notice.'`), `again: "You have the date table. It's the only table in the realm that knows what day it is."`. Replace the room's existing `get date table` gag rule (the "most important table… nobody bothered to mark" line: keep that text as the **untakeable-while-unrelated** line's second sentence) with:

```ts
{
  id: 'fortress.get-date-unrelated',
  when: { verb: 'get', noun: ['date table', 'calendar', 'dates', 'date', 'calendar table', 'table'], flags: [{ flag: 'model.related', not: true }] },
  then: { text: "You lift the date table. It is related to nothing, and Sir Cardinality will not let a table leave the diagram unrelated. 'Nothing leaves this view without a relationship,' he says. 'Not even you.'", outcome: 'fail' },
},
{
  id: 'fortress.get-date',
  when: { verb: 'get', noun: [same], flags: [{ flag: 'model.related' }, { flag: 'taken.date', not: true }] },
  then: { text: 'You take the date table. Every day from 1900 to 2099, and now a line to Sales. Heavier than it looks; most of it is weekends.', give: ['date-table'], set: { 'taken.date': true }, sfx: 'item' },
},
```

The existing `fortress.date-table` / `fortress.date-table-again` (`use date table` marks it) must also work while carried anywhere: add `{ ...thatRule, id: 'global.mark-date', when: { ...when, has: ['date-table'] } }` to the global rules list in `globals.ts` (spread into `GLOBAL_RULES` near the curses' undo).

- [ ] **Step 5: The Duke.** In `fortress.ts`: `MOAT_THEN.points` → `20`. New constant:

```ts
const DATE_TABLE = ['date table', 'table', 'calendar', 'dates', 'date', 'calendar table', 'the date table', 'my date table'];
const MOAT_UNMARKED = "The Duke takes the table. Turns it over. 'A date table,' he says. 'UNMARKED.' The room goes quiet. 'You built time intelligence on a table you never marked as a date table.' He does not finish the sentence. He finishes you. ";
const MOAT_MARKED = "The Duke takes the table. 'Marked,' he says, almost pleased. He reads the M. There is no M. 'CALENDARAUTO.' He says it like a diagnosis. 'You made your date table in DAX. In the model. A calculated table.' The window is already open. ";
```

In `fortress.throne.rules`, **first**:

```ts
{
  id: 'fortress.moat',
  when: { verb: 'give', noun: DATE_TABLE, noun2: DUKE, has: ['date-table'], flags: [{ flag: 'trial.moat', not: true }] },
  then: { ...MOAT_THEN, text: (s) => `${s.flags['model.date'] ? MOAT_MARKED : MOAT_UNMARKED}${MOAT_TEXT}`, remove: ['date-table'], set: { ...MOAT_THEN.set, 'model.date': true } },
},
{ id: 'fortress.moat-use', when: { verb: 'use', noun: DATE_TABLE, noun2: DUKE, has: ['date-table'], flags: [{ flag: 'trial.moat', not: true }] }, then: <same then> },
{ id: 'fortress.moat-again', when: { verb: 'give', noun: DATE_TABLE, noun2: DUKE, flags: [{ flag: 'trial.moat' }] }, then: { text: "'Another?' He already has one. He points at the window. You take the stairs.", outcome: 'snark' } },
{ id: 'fortress.give-date-none', when: { verb: 'give', noun: DATE_TABLE, noun2: DUKE, flags: [{ flag: 'trial.moat', not: true }] }, then: { text: "You have no table. The Model View, west of the hall, has one — related to nothing, which he'd also throw you for.", outcome: 'fail' } },
```

(`show` maps to `give` already.) Check `MOAT_THEN.text` type — if `RuleThen.text` allows a function, use it; if `MOAT_TEXT` is built as a function already, compose accordingly. Replace the old `fortress.moat` (`say SIN`) with `{ id: 'fortress.sin-strike', when: { verb: 'say', noun: SIN, flags: [{ flag: 'trial.moat', not: true }] }, then: wrong({ text: "'Calculated column,' says the Duke. 'You'd say that.' He looks at your hands. 'Show me one. Bring me a table and I'll show you the moat.'", outcome: 'snark' }) }` and keep `fortress.moat-again` for `say SIN` after the moat as `fortress.sin-again`. `wrong()` must not treat the sin as GOOD_DAX; `WRONG_RE` excludes `calculated column` — the strike is added by `wrong()` directly, so no regex change. Throne `describe` after the moat: append ` Your date table is on his desk. He has marked it.`

- [ ] **Step 6: Hints, nudges, ladders.** Model View `flaskHint` ladder per spec §1.2 (dashed line → take the table → show the Duke → the Studio → the monks); `nudge.oblique` per stage never names the verb ("There's a line in that diagram that's been dashed since 2021, and one table that's related to nothing because of it." / "The table's free to go now, and the Duke north of the hall has opinions about tables." / …); `plainer` may say "double-click the dashed line", "take the date table", "bring the Duke the table". Duke `flaskHint` → `'He wants to see a table, not hear a phrase. The Model View, west of the hall, has one.'` (curse tier keeps the policy-on-yourself cure, then "or bring him the date table"); Duke nudges per spec §1.3; `gates.ts:116` Duke shape → `'The Duke throws people from that window for one thing, and lately he wants to see it, not hear it. Bring him a table.'`, `more: 'The date table. The Model View has it, once it's related.'`; Duke talk 3 (`npcs.ts:252`) → `"'There is one thing,' says the Duke, 'that I will not have in this chamber. It has every day in it and nobody marked it. Bring it, and see what happens.'"`; Duke `knows` adds `'date table', 'date', 'calendar', 'marked'`; Sir Cardinality `knows` adds `'relationship', 'dashed', 'inactive', 'date table'`; `fortress.sin-elsewhere` text: the moat hint says "bring him the date table" instead of "say it"; `globals.ts:67` egg.select-star keeps its line. Bridge `flaskHint`/nudges (Task 1's room) that mention the policy/lectern stages now read: no moat → `'North, then west. The Model View has a dashed line and a table that wants relating. Then the Duke, north of the hall.'`; the `taken.policy` tiers become `taken.date` tiers. Search `src/world` for `taken.policy` and decide each: the Model View's own policy hint lines are replaced (the policy is no longer on the path); the Studio's `inventory.includes('policy')` tiers stay until Task 4.
- [ ] **Step 7: Golden path & tests.** `tests/golden-path.json` Keep segment: `"n", "n", "w", "use relationship", "get date table", "e", "n", "give date table to duke", "n", "w", "get policy", "e", "e", "look at card", "wait", "wait", "use policy on refresh", "wear boots", …` (the rest unchanged). `monastery.ts` `monastery.wait` `points: 10` → `5` (mechanic unchanged this task). Fix pins in `tests/keep-sense.test.ts`, `tests/deaths-and-curses.test.ts`, `tests/golden-plus-*.test.ts` (`indexOf('say calculated column')` if any), `tests/voice-items.test.ts` (blurb present), `tests/setting-effects.test.ts` sweep (hints never name refused commands — with XMLA off the Model View's `n` is refused; the new hints only say north once `model.related && taken.date && trial.moat && refresh.done`, same gate as before).
- [ ] **Step 8: Run** the full gate — 200, won.
- [ ] **Step 9: Commit** `"Model View: use relationship frees the date table; the Duke wants to see it, not hear it (moat 20); gate wait 5"`.

---

### Task 3: The Monastery Gate — `start session`

**Files:**
- Modify: `src/world/monastery.ts:66-140` (room `monastery.gate`), `src/world/gates.ts:141-151` (Monastery Gate shape/more/knock/ring), `src/world/npcs.ts:149` (monk talk 2 + `knows`), `src/world/where.ts` if it says wait
- Modify: `tests/golden-path.json` (`"wait", "wait", "wait", "n"` → `"start session", "n"`), `tests/monastery*` / `tests/gates.test.ts` / `tests/npc-talk.test.ts` pins
- Test: `tests/gates.test.ts`

**Interfaces:**
- Consumes: parser verbs `start`, `press` → use (Task 1); `monastery.wait` pointsKey at 5 (Task 2).
- Produces: flag `gate.open` set by `monastery.wait` (id kept, `when` changed); `gate.waiting` no longer counts.

- [ ] **Step 1: Failing tests** (`tests/gates.test.ts`):

```ts
describe('the Monastery Gate starts when somebody presses Start', () => {
  const atGate = () => { let s = start(); for (const c of GOLDEN_PATH.slice(0, GOLDEN_PATH.indexOf('start session'))) s = step(s, c, WORLD).state; return s; };
  it('start session opens the gate for 5', () => {
    const r = step(atGate(), 'start session', WORLD);
    expect(r.pointsAwarded).toBe(5);
    expect(r.state.flags['gate.open']).toBe(true);
    expect(r.output.join(' ')).toMatch(/SESSION STARTED/);
  });
  it.each(['start spark session', 'use gate', 'use progress bar', 'press start', 'use start', 'ring bell', 'knock'])('%s starts it too', (cmd) => {
    expect(step(atGate(), cmd, WORLD).pointsAwarded).toBe(5);
  });
  it('wait pays nothing and moves nothing', () => {
    const r = step(atGate(), 'wait', WORLD);
    expect(r.pointsAwarded).toBe(0);
    expect(r.state.flags['gate.open']).toBeFalsy();
    expect(r.output.join(' ')).toMatch(/pressed Start/);
    expect(step(r.state, 'wait', WORLD).state.flags['gate.open']).toBeFalsy();
  });
});
```

(Import `GOLDEN_PATH` from `./golden-path`; write the golden path first so the slice works.)

- [ ] **Step 2: Run** — failures.
- [ ] **Step 3: Rules.** Replace `monastery.wait`, `monastery.wait-1`, `monastery.wait-2` with:

```ts
{
  id: 'monastery.wait', // the ledger key stays
  when: { verb: 'use', noun: ['session', 'spark session', 'start', 'start button', 'button', 'gate', 'progress bar', 'bar', 'stone bar', 'monastery gate', 'bell', 'door'], flags: [{ flag: 'gate.open', not: true }] },
  then: { text: 'You press Start. The stone bar jumps to 33%, hums at 67%, and stops at 99% for exactly as long as it takes you to doubt it. SESSION STARTED. Four minutes, as is tradition. The gate swings open.', set: { 'gate.open': true, 'gate.waiting': 3 }, points: 5, sfx: 'door' },
},
{
  id: 'monastery.wait-closed',
  when: { verb: 'wait', flags: [{ flag: 'gate.open', not: true }] },
  then: { text: "You wait. The bar doesn't. Sessions don't start because you're patient; they start because somebody pressed Start.", outcome: 'fail' },
},
```

`knock` and `ring` map to `use` (`knock` already; add `ring: 'use'` to the parser). Remove the gate's `knock`/`ring` gag lines from `gates.ts` (they would shadow the score) — the Desktop Gate keeps its own. Describe before: `SESSION STOPPED. A Start button nobody has pressed since 2023.` replaces the percentage; after: unchanged. `flaskHint` (closed) → `"There's a Start button on the progress bar. Nobody has pressed it since 2023."`; `nudge.oblique` (closed) → `"The bar has a button and a monk, and only one of them has ever started a session."`; `plainer` → `"It's a progress bar with a Start button. Press it."`; `gates.ts` Monastery Gate `shape: 'Locked. The session is stopped. There is a Start button on the bar.'`, `more: 'Press Start. That is the whole puzzle. Really.'`; monk talk 2 → `"'Press Start,' says the monk. 'Nobody ever presses Start. They wait, and they bill.'"`; monk `knows` adds `'start', 'button'`. Keep `monastery.wait-open` / `-again` (billing lines).
- [ ] **Step 4: Golden path**: replace the three `"wait"` before the Cloister with `"start session"`. Fix pins (`tests/gates.test.ts` old wait tests, `tests/npc-talk.test.ts`, `tests/voice-sweep-monastery.test.ts`, `tests/scenes.test.ts` if it steps waits).
- [ ] **Step 5: Run** the gate — 200, won. **Step 6: Commit** `"Monastery Gate: start session (one press, 5); waiting only bills"`.

---

### Task 4: The Report Studio — the Card's measure, twice; the pie becomes a bar

**Files:**
- Modify: `src/world/fortress.ts` (room `fortress.yard`: describe, flaskHint, nudge, rules), `src/world/keep-items.ts:213` (`pie` describe by state, aliases add `bar chart`, `bar`, `visual`? — no: `visual` swallows `card visual`; add `'bar chart', 'bar', 'the pie'`), `src/world/gates.ts:129-133, 214`, `src/world/npcs.ts:281-287` (Card ladder + knows), `src/world/curses.ts` (the (Blank) curse stays on stares), `src/world/where.ts`
- Modify: `tests/golden-path.json`, `tests/fortress.test.ts`, `tests/keep-sense.test.ts`, `tests/deaths-and-curses.test.ts`, `tests/keep-examinables.test.ts`
- Test: `tests/fortress.test.ts`

**Interfaces:**
- Consumes: parser verbs `change/convert/switch/swap/drag` (Task 1); flags `stare.done`, `refresh.done`, item `boots` unchanged.
- Produces: flag `card.measure` (0/1/2). Golden Keep segment becomes `… "give date table to duke", "n", "e", "put measure on card", "put measure on card", "change pie chart to bar chart", "wear boots", "w", "w", "n", "start session", …` — `get policy` leaves the path.

- [ ] **Step 1: Failing tests**:

```ts
describe('the Studio: a measure twice, then the pie', () => {
  const atStudio = () => { let s = start(); for (const c of GOLDEN_PATH.slice(0, GOLDEN_PATH.indexOf('put measure on card'))) s = step(s, c, WORLD).state; return s; };
  it('the first measure shows Blank and says do it again; the second pays 10', () => {
    const a = step(atStudio(), 'put measure on card', WORLD);
    expect(a.pointsAwarded).toBe(0);
    expect(a.output.join(' ')).toMatch(/Do it again/);
    const b = step(a.state, 'put measure on card', WORLD);
    expect(b.pointsAwarded).toBe(10);
    expect(b.state.flags['stare.done']).toBe(true);
    expect(step(b.state, 'put measure on card', WORLD).pointsAwarded).toBe(0);
  });
  it.each(['add measure to card', 'use measure on card', 'drag measure to card', 'drop net sales on card', 'add net sales'])('%s counts as the measure', (cmd) => {
    expect(step(atStudio(), cmd, WORLD).output.join(' ')).toMatch(/Blank/);
  });
  it('staring no longer pays', () => {
    let s = atStudio();
    for (const c of ['look at card', 'wait']) s = step(s, c, WORLD).state;
    expect(step(s, 'wait', WORLD).pointsAwarded).toBe(0);
  });
  it('the pie to a bar finishes the refresh and drops the boots (15)', () => {
    const r = step(atStudio(), 'change pie chart to bar chart', WORLD);
    expect(r.pointsAwarded).toBe(15);
    expect(r.state.flags['refresh.done']).toBe(true);
    expect(r.state.inventory).toContain('boots');
    expect(step(r.state, 'change pie chart to bar chart', WORLD).pointsAwarded).toBe(0);
  });
  it.each(['use bar chart', 'change chart', 'change pie to bar', 'change visual', 'use pie chart', 'convert pie chart', 'make it a bar chart'])('%s changes the pie', (cmd) => {
    expect(step(atStudio(), cmd, WORLD).pointsAwarded).toBe(15);
  });
  it('the policy on the refresh is a nudge', () => {
    let s = atStudio(); // carry the policy in: warp
    s = { ...s, inventory: [...s.inventory, 'policy'] };
    const r = step(s, 'use policy on refresh', WORLD);
    expect(r.pointsAwarded).toBe(0);
    expect(r.state.inventory).toContain('policy');
    expect(r.output.join(' ')).toMatch(/look at the pie/);
  });
});
```

`make it a bar chart`: `make` is not a verb — add a phrase rule `fortress.make-bar` on `/^(make|turn) (it|the pie|the pie chart|this) (into )?(a |an )?bar( chart)?$/` in the Studio that returns the same `then` as the rule (share `PIE_TO_BAR: RuleThen`).

- [ ] **Step 2: Run** — failures.
- [ ] **Step 3: The Card.** In `fortress.yard.rules`, ahead of the stare rules:

```ts
const MEASURE = ['measure', 'a measure', 'net sales', 'sales', 'total sales', 'the measure', 'measures', 'value', 'a value', 'field'];
const CARD_NOUN2 = [...CARD, 'the card', 'card visual'];
{
  id: 'fortress.card-measure-1',
  when: { verb: 'use', noun: MEASURE, noun2: CARD_NOUN2, flags: [{ flag: 'stare.done', not: true }, { flag: 'card.measure', not: true }] },
  then: { text: 'You drop Net Sales on the Card. It shows (Blank). It looked at you the whole time. Every one of us has done this: the first one never counts. Do it again.', set: { 'card.measure': 1 }, outcome: 'fail' },
},
{
  id: 'fortress.stare', // ledger key stays
  when: { verb: 'use', noun: MEASURE, noun2: CARD_NOUN2, flags: [{ flag: 'card.measure', is: 1 }, { flag: 'stare.done', not: true }] },
  then: { text: 'You drop Net Sales on the Card again. $4,213,908. The Card blinks first. It has never done that.', set: { 'stare.done': true, 'card.measure': 2 }, points: 10, sfx: 'item' },
},
{
  id: 'fortress.card-measure-more',
  when: { verb: 'use', noun: MEASURE, noun2: CARD_NOUN2, flags: [{ flag: 'stare.done' }] },
  then: { text: "It shows $4,213,908. It will keep showing it. That's what a measure is.", outcome: 'snark' },
},
```

`add net sales` (no noun2) → same as with the card: add `{ id: 'fortress.card-measure-bare', when: { verb: 'use', noun: MEASURE } … }` twins that delegate (a `then` function reading `card.measure`), placed after the noun2 forms. `drop net sales on card` parses as verb `drop` — add `drop` handling: a rule with `verb: 'drop', noun: MEASURE, noun2: CARD_NOUN2` sharing the same `then` function. Rename the old `fortress.stare` (wait #2 payer) to `fortress.stare-wait-2` with `points` removed and `stare.done` **not** set (the stare only feeds `stare.count` and the (Blank) curse in `curses.ts` — confirm the curse reads `stare.count`/`card.stares` and not `stare.done`). Card talk 3 (`npcs.ts:284`) → `"Put something on me. Anything. Net Sales. I've heard good things."`; the cycle line "Look, then wait, then wait" → `"Almost there, ${nick(s)}. A measure. Then the same measure, because the first one never counts."`; Card `knows` adds `'net sales', 'sales', 'bar chart', 'pie'`.

- [ ] **Step 4: The pie.** Add, ahead of `fortress.refresh-fail`:

```ts
const PIE_TO_BAR: RuleThen = { text: 'You select the pie. Thirty-one slices tense up. Visualizations pane: clustered bar. The slices unroll into bars, longest first, and for the first time you can read December. In the corner, the Big Refresh — which has been chewing on a 31-slice pie since 2019 — reads 98%. 99%. 100%. Something falls out of the progress bar: a pair of boots.', set: { 'refresh.done': true }, give: ['boots'], points: 15, pointsKey: 'fortress.refresh-done', sfx: 'item' };
{ id: 'fortress.refresh-done', when: { verb: 'use', noun: ['pie', 'pie chart', 'chart', 'visual', 'bar chart', 'bar', 'the pie', 'pie to bar', 'pie chart to bar chart', 'chart to bar chart', 'visual to bar chart', 'pie to bar chart'], flags: [{ flag: 'refresh.done', not: true }] }, then: PIE_TO_BAR },
{ id: 'fortress.refresh-done-again', when: { verb: 'use', noun: [same], flags: [{ flag: 'refresh.done' }] }, then: { text: "It's a bar chart. It's been a bar chart for a minute. Leave it.", outcome: 'fail' } },
```

Check how the parser splits `change pie chart to bar chart`: if `to` splits noun/noun2 (noun `pie chart`, noun2 `bar chart`), match on `noun` only (noun2 free). The old `fortress.refresh-done` (`use policy on refresh`) becomes `fortress.policy-nudge`: `then: { text: "The Big Refresh doesn't want a policy. It wants the thing it's been chewing on since 2019 gone: look at the pie.", outcome: 'fail' }` (no `remove`, no `give`, no points). `pie` item: `describe` by state — after `refresh.done`: `'A clustered bar chart. It used to be a pie. Nobody misses it except Jeff.'`; aliases add `'bar chart', 'bar'`. Studio describe after: "the bar chart that used to be a pie" replaces "the 31-slice pie" in the done branch; `fortress.refresh-words` keep their lines.

- [ ] **Step 5: Hints.** Studio `flaskHint` ladder per spec §1.4 (Blank curse → unchanged; no card → "There's a Card on the canvas showing Blank. Blank means nothing's on it."; card, no chart → "The Big Refresh is stuck on one visual. The one with thirty-one slices. Change it."; done → boots / leave as today). `card.measure === 1` tier → `'The first one never counts. Same measure, same Card.'`. Nudges rewritten (oblique never names the verb: "The refresh has been at 97% since 2019 and the thing it chokes on is the roundest thing on the canvas."; "Blank means nothing's on it. Nobody's put anything on it."; plainer may say "put a measure on the Card", "change the pie to a bar chart"). Remove every `inventory.includes('policy')` / `taken.policy` tier in the Studio and the bridge; `gates.ts:129-133, 214` → the Card wants a measure, the refresh wants the pie changed, wear what falls out; `where.ts` likewise.
- [ ] **Step 6: Golden path**: the Keep segment per Interfaces (remove `"n", "w", "get policy", "e", "e"` → after the moat `"n", "e"`; replace `"look at card", "wait", "wait", "use policy on refresh"` with `"put measure on card", "put measure on card", "change pie chart to bar chart"`). Fix pins in `tests/fortress.test.ts`, `tests/keep-sense.test.ts`, `tests/deaths-and-curses.test.ts` (Blank curse via stares still works), `tests/keep-examinables.test.ts`, `tests/golden-plus-*`.
- [ ] **Step 7: Run** the gate — 200, won, ≤ 70 turns. **Step 8: Commit** `"Report Studio: a measure on the Card, twice; the pie becomes a bar and the refresh finishes"`.

---

### Task 5: Six new things to take

**Files:**
- Modify: `src/world/keep-items.ts` (new `installer`, `napkin`, `filter-card`; `pie` takeable-after-change), `src/world/items.ts` (new `csv`; `hard-hat` takeable + wearable), `src/world/fortress.ts` (rooms bridge/hall/throne/yard `items` arrays, `get pie` gating), `src/world/lake.ts` (Lake House: `get csv` / `open mailbox` gives it), `src/world/peaks.ts` (Shrine: hard hat worn line)
- Modify: `tests/voice-items.test.ts` (blurbs), `tests/world-lint.test.ts` if it counts items
- Test: `tests/items-that-fit.test.ts` (new)

**Interfaces:**
- Produces: item ids `installer`, `napkin`, `filter-card`, `csv`, `hard-hat` (takeable), `pie` (takeable once `refresh.done`), flag `pie.taken`. Task 6 consumes these ids.

- [ ] **Step 1: Failing tests** (`tests/items-that-fit.test.ts`): for each `[room path, command, id]` — Gate `get installer`, Hall `get napkin`, Throne `get filter`, Studio (after the change) `get pie chart`, Lake House `get csv` and `open mailbox`, Shrine `get hard hat` then `wear hard hat` — assert the id lands in `inventory` (or `worn`), a second `get` returns the item's `again` line, and `inventory` lists a blurb (`step(s, 'inventory')` output mentions the item name). Studio: `get pie chart` **before** the change → fail line "It's on the canvas. It's the reason the refresh is at 97%. Change it first." and no give.
- [ ] **Step 2: Run** — failures.
- [ ] **Step 3: Items.** In `keep-items.ts`:

```ts
{ id: 'installer', name: 'installer', aliases: ['pbidesktopsetup', 'setup', 'exe', 'desktop installer', 'pbidesktopsetup_x64.exe', 'installer file'], takeable: true,
  blurb: 'PBIDesktopSetup_x64.exe, 2.1 GB, November build. You could install it anywhere. Anywhere would be worse for it.',
  again: 'You have the installer. It has been downloading since you took it. It is 2.1 GB and it will be 2.4 next month.',
  describe: 'PBIDesktopSetup_x64.exe, lying by the drawbridge where the guard dropped it. November build. There is a newer one. There is always a newer one.' },
{ id: 'napkin', name: 'napkin', aliases: ['star schema napkin', 'drawing', 'sketch', 'diagram napkin', 'schema'], takeable: true,
  blurb: 'A napkin with a star schema drawn on it: Sales in the middle, four dimensions around it, and a coffee ring where Sheet1 would go.',
  again: 'You have the napkin. It is the only documentation the model has ever had.',
  describe: 'A napkin under the portraits. Someone has drawn a star schema on it: Sales in the middle, four dimensions around it. A coffee ring where Sheet1 would go. It is the only documentation the model has ever had.' },
{ id: 'filter-card', name: 'filter', aliases: ['filter card', 'year filter', 'year is 2019', 'locked filter', 'the filter', 'year 2019'], takeable: true,
  blurb: 'A filter card from the pane: Year is 2019. Locked. It has been on every page of every report you have ever opened.',
  again: "You have the filter. Year is 2019. It's locked; you can carry it but you can't change it. Nobody can.",
  describe: 'A filter card, pried loose from the filter pane: Year is 2019. Locked, so nobody can clear it. This explains more than it should.' },
```

`filter-card` alias `filter` collides with `filter-pane`'s alias `'filter'` (`keep-items.ts:196`): remove `'filter'` from `filter-pane`'s aliases (keep `'filters'`, `'filter pane'`). `pie`: `takeable: true`, `visibleWhen` unchanged, `blurb: 'The pie chart. Thirty-one slices, still warm from 2019. Someone will want it back. Someone always does.'`, `again: "You have the pie. All thirty-one slices. Nobody has asked for it back yet, which is the longest it has ever gone."`; in `fortress.yard.rules` add `{ id: 'fortress.get-pie-early', when: { verb: 'get', noun: ['pie', 'pie chart', 'chart', 'the pie', 'slices'], flags: [{ flag: 'refresh.done', not: true }] }, then: { text: "It's on the canvas. It's the reason the refresh is at 97%. Change it first.", outcome: 'fail' } }` and `{ id: 'fortress.get-pie', when: { verb: 'get', noun: [same], flags: [{ flag: 'refresh.done' }, { flag: 'pie.taken', not: true }] }, then: { text: 'You pick up the pie. Thirty-one slices, still warm from 2019. Someone will want it back. Someone always does.', give: ['pie'], set: { 'pie.taken': true }, sfx: 'item' } }`. The Studio's `describe` after `refresh.done && pie.taken` drops the pie from the canvas sentence. In `items.ts`: `csv` — `{ id: 'csv', name: 'CSV', aliases: ['csv', 'csv file', 'sales_2019.csv', 'the csv', 'file', 'mail', 'letter'], takeable: true, blurb: 'Sales_2019.csv, from the mailbox. It has been in the mailbox since bronze. It has a header row and opinions.', again: 'You have the CSV. The mailbox is empty now, for the first time since bronze.', describe: 'Sales_2019.csv. One file, 400,000 rows, a header row, and a column called Column1. It has been in the mailbox since bronze.' }`; Lake House room `items` adds `'csv'` with `visibleWhen: (s) => !s.flags['csv.taken']`; rules `lake.get-csv` (`get csv`, `open mailbox`, `get mail`) → the take (give `csv`, set `csv.taken`), and the mailbox's existing describe reads "1 new" only before. `hard-hat`: `takeable: true, wearable: true`, `blurb`, `again`, and Shrine rule: the dragon's brush-off while `worn.includes('hard-hat')` → `"'Hard hat,' says the dragon. 'Rated for falling capacity.'"` (add to the brush-off function in `peaks.ts` via `brushOffLine` or the NPC's `brushOff` fn). Bronze Marsh already has an untakeable `CSV` item (`swamp.bronze`): rename its aliases so `csv` in the marsh resolves to the carried one when carried (drop `'csv'` from the marsh item's aliases, keep `'the csv in the water'`, `'floating csv'`), and ledger the ruling.
- [ ] **Step 4: Run** the gate (voice-items requires blurbs; world lint requires every item in a room or reachable via `give`). **Step 5: Commit** `"Six more things to take: the installer, a napkin, a locked filter, the pie, a CSV, the hard hat"`.

---

### Task 6: Fourteen uses somewhere else

**Files:**
- Modify: `src/world/village.ts` (Square: `give filter to jeff`, `give pie chart to jeff`; Fields: `give timetable to scarecrow`), `src/world/lake.ts` (Isle: `use usb stick`, `use installer`; Dock: `use carabiner`; Lake House: `plant bamboo`; Bronze: `drop csv`; Silver: `plant seed`), `src/world/monastery.ts` (Library: `give pamphlet to librarian`, `give installer to librarian`), `src/world/fortress.ts` (Model View: `use napkin`; Studio: `use bookmark`, `use filter on chart`), `src/world/peaks.ts` (Shrine: `give ticket to throttlor`, `give napkin to throttlor`, `give pie chart to throttlor`; Pass: `wear hard hat`), `src/world/npcs.ts` (`knows` for Jeff, the scarecrow, the librarian, Throttlor, the Ferryman)
- Modify: `docs/ledger.md` (bonus table: six new rows, cap 100), `tests/golden-plus-sidequests.test.ts` (the all-bonus replay asserts 100), `tests/engine-bonus.test.ts` if it pins 70
- Test: `tests/items-that-fit.test.ts`

**Interfaces:**
- Consumes: item ids from Task 5; existing ids `ticket`, `usb stick`, `seed`, `timetable`, `pamphlet`, `bamboo`, `synapse-bookmark`, `carabiner`.
- Produces: bonus pointsKeys `swamp.plant-seed`, `village.timetable`, `swamp.land-csv`, `village.filter-jeff`, `peaks.pie-dragon`, `lake.carabiner` (+5 each, once).

- [ ] **Step 1: Failing tests**: one `it` per row of spec §2's table: warp with god mode (`burninate`, `warp <room>`, `summon <item>` — see `src/engine/god.ts`; god mode does not add score) or walk, then assert the output matches a distinctive fragment of the spec line (e.g. `/platinum layer/`, `/forty-eight a day/`, `/now loaded/`, `/It was FILTERED/`, `/wasn't a capacity/`, `/the form asks/`, `/for the mouse/`, `/under Deprecated/`, `/Files folder/`, `/decommissioned in 2023/`, `/except for Sheet1/`, `/two words. Not a drawing/`, `/ticket with details/`, `/Rated for falling capacity/`, `/That's what the F64 was for/`), `bonusAwarded` 5 on the six paying ones (0 on repeat), and that `score` is unchanged. Plus: a full replay — golden path with every bonus sequence (Excel 20, Copilot 25, Applied Steps 10, Abbot 10, restore 5, the six new 30) → `bonus === 100`, `score === 200`.
- [ ] **Step 2: Run** — failures.
- [ ] **Step 3: Rules.** Each as a room rule, `has: ['<id>']` (the hat: `worn: ['hard-hat']`), text verbatim from spec §2, `outcome: 'success'`, `bonus: 5` + `pointsKey` on the six paying ones, and `remove` where the thing is consumed: the dragon eats the ticket and the pie (`remove`), Jeff keeps the pie (`remove`), the CSV lands (`remove`), the seed is planted (`remove`), the bamboo is planted (`remove`), the timetable stays with the scarecrow (`remove`); the filter, napkin, installer, bookmark, carabiner, USB stick, pamphlet are kept (the librarian files the pamphlet: `remove`). Place each rule **before** any generic `give`/`use` gag in that room (e.g. the Shrine's `give <x> to throttlor` brush-off, the Square's `give <x> to jeff` fallback, `poke()` blocks) so it wins. Verb/noun details: `plant seed` = verb `use` noun `seed`; `drop csv` = verb `drop` (add a `drop` rule; the builtin drop would otherwise leave it in the marsh — the rule must come first and `remove` it); `use csv on water` / `put csv in water` = use + noun2 `water`; `give timetable to scarecrow` (scarecrow NPC id from `village.ts`); `use carabiner on boat` and bare `use carabiner` in the Dock; `use usb stick` / `use usb stick on plinth` on the Isle; `use installer` on the Isle; `use napkin` / `compare napkin` in the Model View; `give napkin to throttlor` / `show napkin` at the Shrine (`show` → give; bare `show napkin` has no noun2 — match noun only in the Shrine); `use bookmark` / `use bookmark on bookmarks pane` in the Studio (the existing `bookmarks` item's `use` gag must not shadow it: place first, `has: ['synapse-bookmark']`); `use filter on chart` / `use filter on bar chart` in the Studio (only after `refresh.done`; before: `"The pie has thirty-one slices and you want to add a filter. Change it first."`); `wear hard hat` in the Pass → the rock line (the wear builtin then equips it: return the line and `wear: ['hard-hat']` from the rule). NPC `knows`: Jeff + `'filter', 'pie', 'pie chart', '2019'`; scarecrow + `'timetable', 'schedule'`; librarian + `'pamphlet', 'installer'`; Throttlor + `'ticket', 'napkin', 'pie'`; Ferryman + `'carabiner'`.
- [ ] **Step 4: Docs & tests.** `docs/ledger.md`: the bonus section header says 100; six rows appended with the room and the words; `tests/golden-plus-sidequests.test.ts` all-bonus replay expects 100; `tests/engine-bonus.test.ts` cap pins updated. `README.md` / `docs/how-to-play.md` mention "100 bonus points" where they said 70.
- [ ] **Step 5: Run** the gate. **Step 6: Commit** `"Every main room carries something: fourteen uses elsewhere, six of them bonus (100)"`.

---

### Task 7: Everything that reads the map

**Files:**
- Modify: `scripts/room-needs.ts` (ROOM_NEEDS for Gate, Model View, Duke's Chamber, Studio, Monastery Gate, Lake House, Hall, Shrine, Town Hall, Fields, Dock, Ledge, Silver Marsh, Bronze Marsh, Library, Isle, Spark Chamber — one line each: what you must do, bring, leave with, and the exact words), `docs/cheat-sheet.md` (§1 table regenerated by `npx tsx scripts/cheat-sheet.ts --gameplay` and pasted **into** the hand-framed file — the generator prints only the table; the bonus block gains a "Things to take, and where they go" table with the six paying uses and the eight gags; §2 lines rewritten for the changed rooms), `docs/room-guide.md` (regenerated: `npx tsx scripts/cheat-sheet.ts --rooms > docs/room-guide.md`), `docs/ledger.md` (rows 6, 11, 12, 13, 14 renamed: "Start the Spark session at the gate" 5, "Click Try free at the gate" 10, "Hand the Duke an unmarked date table and get thrown in the Moat" 20, "Put a measure on the Card. Twice." 10, "Change the pie to a bar chart; the Big Refresh finishes; Bursting Boots" 15, new row "Relate the date table in the Model View" 10 — renumber, running totals recomputed to 200), `docs/how-to-play.md`, `README.md` (any named command), `src/world/where.ts` (any remaining "say"/"wait"/"policy" stage words), `e2e/` smoke if it types old commands
- Test: `tests/golden-path.test.ts` (unchanged), `npm run e2e` after `npm run build` with `CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`

- [ ] **Step 1:** `grep -rn "say trial\|say calculated column\|use policy on refresh\|wait ×3\|wait\*3\|look at card\b.*wait\|Out-stare\|out-stare" docs README.md src/world scripts e2e` — every hit is rewritten or justified in the commit message.
- [ ] **Step 2:** Update ROOM_NEEDS, ledger.md, how-to-play, README; regenerate both docs (paste the §1 table into cheat-sheet.md between its header and "### The side quests…"; keep every hand-written paragraph).
- [ ] **Step 3:** `npm run build && CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run e2e`; fix any e2e that typed old commands.
- [ ] **Step 4:** Run the gate. **Step 5: Commit** `"Docs and needs follow the rewired 200; bonus 100"`.

---

### Task 8: Final review and the run-through

The controller (Fable) dispatches the whole-branch reviewer on the most capable available model with the spec, then plays the golden path and every bonus sequence through `npm run replay` and a hand session (`npx tsx` a script that steps the path and prints every output), reading for: voice, a hint that names a refused command, a room whose new item has no home line, a `get` that shadows a scored rule. Fix round, re-review, then `superpowers:finishing-a-development-branch`: merge to `master`, `rayfin up`, sync to `C:\Github\Fabric-Quest`, commit there as Tommy.

## Self-review

- **Spec coverage:** §1.1 → T1; §1.2 + §1.3 → T2; §1.5 → T3; §1.4 → T4; §2 → T5 + T6; §3 → T7 (with T1–T4 each carrying their own hints/ladders); §4 nothing to do.
- **Points at every commit:** T1 200 (10 → 10); T2 200 (+10 relate, −5 Duke, −5 gate); T3 200 (gate mechanic only); T4 200 (10 → 10, 15 → 15); T5–T7 no score changes.
- **Names used across tasks:** `model.related`, `taken.date`, `date-table`, `card.measure`, `refresh.done`, `stare.done`, `pie.taken`, `csv.taken`, `installer`, `napkin`, `filter-card`, `csv`, `hard-hat`, `pie`; pointsKeys `fortress.sku`, `fortress.relate`, `fortress.moat`, `fortress.stare`, `fortress.refresh-done`, `monastery.wait`, and the six bonus keys — consistent above.
