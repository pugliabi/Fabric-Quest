# Fabric's Quest — Playability and Voice: side-quest logic, stuck helpers, Keep sense, and the voice pass

**Date:** 2026-09-23 · **Status:** approved in chat (Tommy) · **Companion:** `2026-09-23-governance-design.md` (the Sacristy, Town Hall, My Workspace, Applied Steps). This spec **supersedes governance §2** (side-quest onboarding) with §2 below, and adds requirements the governance rooms must also meet (§3 stuck helpers, §5 voice).

## 1. Summary and rulings

Tommy's playtest, in his words: Jeff complains about numbers mismatching and there's no way to know how to get to the pivot table; Copilot can't be gotten anywhere with; at the Desktop Gate "go north" says the drawbridge is up, "open drawbridge" does nothing useful, and "talk to guard" says the same thing twice; `select *` makes no sense for a Duke of DAX in a Power BI Desktop fortress; the applied steps should be real, different steps done in order.

Four workstreams, each its own set of subagent tasks:

1. **Side-quest logic** (§2) — Excel becomes a story with a goal and a path; Copilot becomes a real conversation that accumulates what you've told it.
2. **Stuck helpers everywhere** (§3) — NPCs escalate and eventually hint when you talk to them again; every gating object answers the obvious verbs with the puzzle's shape; the narrator nudges after a few dead turns in a room; `hint` works.
3. **Keep sense** (§4) — the Duke is thrown by a DAX sin, not SQL; Power Query Hall reads as seven different applied steps in order; every Keep room is checked against "does this make sense in Power BI Desktop?"
4. **Voice** (§5) — the constants (sign-off, nicknames, malaprops, brush-offs) in one module; then a region-by-region pass that **adds** lines and beats from the Peasant's Quest voice skill on top of the current Fabric jokes. Overwrites only where listed.

Rulings: voice work is **add, not overwrite** (the only permitted overwrites are the system-message-tier lines in §5.3); every task uses `/anthropic-skills:peasants-quest-voice` (`/root/.claude/skills/synced/6819c24c-67de-467e-9b61-3915b9b9c2af_64ce14da-cc38-4069-9830-db40df29ffbf/peasants-quest-voice/SKILL.md` and its `reference/` files) for all new text; the Fabric/Power BI technical jokes are the engine and stay; the 200-point ledger and the golden path's *score* are unchanged (the golden path's `say select *` step changes to the DAX trigger, §4.1).

## 2. Side-quest logic

### 2.1 Jeff's Excel — the story and the path

**Goal card on entry** (message box, every entry; engine `RuleThen.box` per governance §2.1):

> JEFF'S EXCEL — Jeff's export says $4.7M. The report says $4.2M. Jeff: "I'll keep what's in my export. I trust it more." Help Jeff find the truth. +20 bonus. EXIT leaves any time.

**Sheet1** (`excel.sheet1`) describe: "Sheet1. Grid paper to the horizon. Jeff at his desk, not crying, exactly, but close. His export is open: a column of numbers and a SUM at the bottom that says 4,712,331. On the second monitor, the report says 4.2M. The ribbon has a Data tab, north. There's a PivotTable sheet, east." Items examinable: `export` ("Sales_export (3).csv. Every row of the visual, plus the Total row, plus three years of history, plus Returns counted as sales. SUM: 4,712,331. Jeff trusts it."), `report` ("The report. Net Sales, Northeast, this year: $4.2M. Certified. It has a little badge and everything."), `monitor`, `ribbon`, `desk`, `tissue box`.

**Stages** — one function `excelStage(s)` returns 0–5; the flask hint, `goal`, and *talking to Jeff* all say the same next step, Jeff in character:

| Stage | Condition | Jeff says (talk) | Flask / goal line |
|---|---|---|---|
| 0 | not yet talked | "It's 4.7. The report says 4.2. I exported the visual, I summed it, it's 4.7. Look, I trust my export. IT said something about 'Analyze in Excel' — that it connects to the actual model. It's on the Data tab. North. I never go north." (sets `excel.jeff.asked`) | "Talk to Jeff first. `talk to jeff`." |
| 1 | asked, not connected | "The Data tab. North. It's a ribbon, not a country." | "Go north to the Data tab and `analyze in excel`, then `sign in`." |
| 2 | connected, no pivot | "Connected? Then make the pivot. The PivotTable sheet's east. Put the fields in. I'd do it but I have a call." | "Go east to the PivotTable and `create pivot table`." |
| 3 | pivot, fields missing | "So far it says <current total>. It needs <the missing ones: Sales Region in rows / Net Sales in values / the year filter>." | "Add what's missing: `add sales region` / `add net sales` / `filter by year`." (names only the missing) |
| 4 | all three, not shown | "Is it done? Show me. `show jeff`. I can't look. I'm looking." | "Back to Sheet1 (west) and `show jeff`." |
| 5 | done | "Okay. The report was right." + the done text | "You fixed Jeff's export. That was the whole quest. `exit`." |

Each `talk to jeff` at the same stage a second time gives a **variant** (§3.1), never the identical line.

**Commands accepted** (in addition to what exists): `go to pivot table` / `open pivot table` / `pivot table` / `pivot` (on Sheet1 → moves east); `data tab` / `go to data tab` / `analyze in excel` / `connect` (on Sheet1 → moves north and, on the Data tab, `analyze in excel` starts the connect); `sign in` / `log in` / `use license`; `add <field>`, `put <field> in rows|values|filters`, `drag <field> to rows`, `rows sales region`, `values net sales`, `filter by year` / `filter to 2025` / `filter current year` / `add year filter`; `show jeff` / `show jeff the pivot` / `tell jeff` / `give pivot to jeff` / `talk to jeff` at stage 4; `compare` / `look at difference` (explains 4.7 vs current total: what's still inflating it). Wrong fields keep their existing jokes (Region A/B, Sales Amount includes Returns). The totals ladder stays 4.7M → 4.5M → 4.3M → 4.2M.

**Field pane**: `look at fields` / `fields` / `field list` on the PivotTable lists the model's fields: dimensions (Sales Region, Region A (legacy), Region B (legacy), Product, Salesperson, Date), measures (Net Sales, Sales Amount, Returns, Gross Sales, Sales YTD, Measure 2 (copy)), filters (Is Current Year, Year, Quarter) — the wrong ones are in the list on purpose.

**Win**: the existing WIN plus the voice addition (§5.4 milestone epilogue) and the Square's post-win Jeff line (already built).

### 2.2 Copilot — a conversation that remembers

Copilot stops grading one perfect sentence and starts **accumulating what you've told it** across prompts, like a chat. It answers by the *first missing slot* in a fixed order, and every answer shows you something wrong-but-plausible for that stage (Tommy: "keep showing wrong things"), plus what it currently understands, plus a hint.

**Slots** (flags, persist until `start over` / `clear` / `new chat`; they survive exit and re-entry, so a trip to the Model Gallery or the Square costs nothing): `copilot.model` ∈ {certified, final2, test}; `copilot.measure` ∈ {net, amount, gross, returns}; `copilot.region` ∈ {ne, other}; `copilot.period` (q4 set), `copilot.year` (2025 or other); `copilot.shape` (wants one number: "total/just the number/one number/how much/as a card"). Each prompt sets every slot it mentions (whole-word matching as today), then Copilot replies for the first missing slot in this order: **model → measure → region → period → shape**.

| Missing | Copilot shows (wrong-but-plausible) | Context line | Hint |
|---|---|---|---|
| everything, no "sales" word | "I can help with that! Here are the top 5 things in your tenant: a lakehouse, a lakehouse, a report named 'test', a lakehouse, and a warehouse called DO NOT DELETE." | — | "Try asking about sales." |
| model | "I found 3 semantic models with sales: **Sales (Certified)**, Sales_v3_FINAL_final2, sales_test_DO_NOT_USE. Which one?" · if the prompt says "tables": the 14-table list | "Understood: —" | "Try: use the certified model." |
| measure (model set) | "From <model>: 14 tables. The Sales table has 400 rows. Here they are." (if they asked for a table) · otherwise "Sales in <model>: I found 6 measures: Sales Amount, Net Sales, Gross Sales, Returns, Sales YTD, Measure 2 (copy). Which?" | "Understood: model = Sales (Certified)" | "Try: net sales." |
| region | "Net Sales, Sales (Certified): $4,201,377 — all regions, all time. Did you want a region? I can do regions: Northeast, Southeast, Midwest, West, Unknown." | "…measure = Net Sales" | "Try: for the Northeast." |
| period | "Northeast Net Sales, all time: $2,933,012. Since 2019. Also some from 2018 that were keyed in late. Which quarter?" | "…region = Northeast" | "Try: Q4 2025." |
| shape | "Q4 2025 Northeast Net Sales — by product, by day, by salesperson, pivoted, 3 pages." (the raw-rows joke) | "…period = Q4 2025" | "Try: just the total." |
| none | WIN: "Q4 2025 Northeast Net Sales, Sales (Certified): $1,247,930." +25 | | |

Rules: a wrong model (final2/test) is used happily until you name the certified one ("From sales_test_DO_NOT_USE: $12. The sign said not to. I did anyway."); a wrong measure (Sales Amount) gives the includes-Returns joke and keeps the slot until you say net sales; a wrong region/year gives the current wrong-thing with a note; a prompt that adds nothing → the existing SAME_AGAIN line plus the hint; the third reply at the same stage makes the hint explicit ("Say: **net sales**"). A single perfect prompt still wins in one turn. "please" still gets "You're welcome!". `start over` / `clear` / `new chat` → "New chat. I remember nothing. It's my best feature." and clears slots. Wrappers/frustration handled as today. The Model Gallery is unchanged. Re-win: no cha-ching (built).

**Goal card**: `COPILOT — Get one number out of Copilot: Q4 2025 Northeast net sales, from the certified model. It will show you everything else first. Tell it what you want, a piece at a time, or all at once. +25 bonus. EXIT leaves any time.`

### 2.3 Onboarding (from governance §2, kept)

`goal` / `objective` / `what do i do` in a realm → the goal text + the stage line; outside a realm → the main-quest line. `help` in a realm ends with "GOAL repeats the objective; GET YE FLASK says the next step." The village notice board gains the Copilot line. Engine `RuleThen.box` → `StepResult.box` → `App.tsx` message box (before `notice`; both joined when both).

## 3. Stuck helpers everywhere

### 3.1 NPC talk escalation (the skill's "progress gate, repeated with variants")

Every NPC gets a per-NPC talk counter (`talk.<npc>`, incremented on talk/ask) and these beats:

| Talk # | Beat |
|---|---|
| 1 | The current line (unchanged) |
| 2 | A **variant** of the same information, shorter, mildly annoyed — never the identical string |
| 3 | The variant plus the NPC's **hint** in their own voice: what they want, named plainly (the guard: "'A SKU. S-K-U. Trial's free, peasant, if you can't afford one.'") |
| 4+ | Rotate through 3 nickname lines (§5.1 pool) restating the checklist adjusted for what's done: "'Still no SKU, Matthew Broderick.'" / "'Almost there, Dirk the Daring, but that's PRO.'" / after it's done: "'Lookin' good, Mr. Trial.'" |

`ask <npc> about <unknown>` → the NPC's **brush-off** (§5.1), one per NPC, in their gimmick. NPC definitions gain `talkMore?: (s, n) => string` and `brushOff: string`; NPCs without `talkMore` fall back to an engine default: "<Name> says the same thing, slower." then "<Name>, slower still: '<room flaskHint>.'"

The NPCs: Jeff, the Miller, the Ferryman (offline and online), the Spark monk, the Abbot, Brother Pandas, the Librarian, the Guard, the Duke, the cardinality NPC, the Card, Throttlor, Manual, Jeff-in-Excel, the Clerk and the Sacristy books' "voices" don't count (governance).

### 3.2 Puzzle objects answer the obvious verbs

Every gating object answers `open`, `use`, `push`, `pull`, `cross`, `climb`, `lower`, `raise`, `enter`, `knock`, `unlock`, `break`, `kick` with the **shape of the puzzle**, not "nothing happens":

| Gate | Object(s) | Reply shape |
|---|---|---|
| Desktop Gate | drawbridge, gate, splash screen | "The bridge answers to the guard. The guard answers to SKUs. Say one to him." (+ after 2 tries: "Trial's free.") |
| `n` at the Gate (bridge up) | — | keep the "updating (1 of 3)" line, add: "The guard is right there. He wants a SKU." |
| Duke's Chamber | throne, window, Duke | "The Duke throws people from that window for one sin. Say it." (§4.1) |
| Report Studio | Card, Big Refresh | "The Card wants staring at. The refresh wants a policy. The Model View, west of the hall, keeps one." |
| Monastery Gate | gate, door, bell | "Locked. The Keep's back gate opens onto it from the Model View — or the swamp's gold layer, the long way." |
| Spark Session Chamber | session, progress bar, notebook | "It's starting. `wait`. That's the puzzle. Really." |
| Library | scroll, librarian | "Library card only. Any license will do. Well. Any license she accepts." |
| OneLake Shore / Dock | boat, ferryman (offline) | "The Ferryman's OFFLINE. Credentials expired. The Mill has the ones that haven't." |
| Isle of Gateway | the key | (already gettable) |
| Throttling Pass | sign, delay | "Interactive operations may be delayed. Boots help. The Studio's Big Refresh drops a pair." |
| Bursting Ledge / Shrine door | door, sigils | "Three sigils. Look like an Engineer, smell like a Warehouse, hold the Key. It counts them for you: <n> of 3." |
| Throttlor | dragon | "He asked you a question. Answer it. `say <answer>`." |
| Cottage | door | (already fine) |

The implementer audits every function-exit and every NPC-gated milestone in the world for missing obvious-verb replies and adds them.

### 3.3 The narrator nudges

Engine: `state.stuck` = consecutive turns in the same room whose outcome was `fail`/`snark` (reset on success, points, move, or a realm change). At 4, 8, 12…, the turn's output gains a final line: `(Narrator, aside: <flaskHint>)` — in voice, e.g. "(Psst. The guard wants a SKU. Trial's free.)". Rooms without a flaskHint get "(Psst. Look around. Talk to people. Read things.)". Not in god mode. Not inside Copilot's pane (its own hints).

### 3.4 `hint`

`hint`, `hints`, `clue`, `what now`, `what next`, `i'm stuck`, `im stuck`, `stuck` → the flask hint, with the hollow-voice framing ("A hollow voice adds: …"). Same text as `get ye flask` without the flask joke.

## 4. Keep sense (Power BI Desktop)

### 4.1 The Duke of DAX and the moat

`say select *` no longer throws you in the moat — it isn't a DAX sin, it's a different language. New trigger, the sin every DAX lord despises: **"I'll just use a calculated column."** Rule `fortress.moat` `when.verb: 'say'`, nouns: `calculated column`, `calculated columns`, `a calculated column`, `i will use a calculated column`, `just use a calculated column`, `add a calculated column`, plus the phrase rule `^(say )?(i('ll| will)? )?(just )?(use|add|make) a calculated column` in the chamber. Text: "'A CALCULATED COLUMN?' The Duke rises. 'IN. MY. MODEL?' Two guards seize you by the arms and hurl you from the window into the Moat of T-SQL below — the Warehouse this whole Keep was built on. You surface, sputtering, covered in semicolons and something that might be a CROSS APPLY. You climb out. You will never not smell like this." (+25, `trial.moat`, unchanged points).

`say select *` in the chamber now: "The Duke blinks. 'SELECT? This is a semantic model. We EVALUATE here.' He does not throw you. He corrects you, which is worse." (`snark`). `say evaluate` → "'Correct,' says the Duke, disappointed. 'And useless.'" Other DAX-purist sins get flavor, no moat: `say sumx`, `say implicit measure` ("The Duke shudders. 'Implicit.' But he has heard worse today."), `say bidirectional`, `say userelationship`, `say calculate` ("He nods. 'The one true function.' The guards relax.").

Hints and docs update everywhere the old line lived: the chamber flaskHint ("Say the thing every DAX lord despises. It has two words and it goes in a table."), the Gate/hall hints ("the Duke hates one shortcut above all others"), README hints ("In the Duke's chamber, the modeling shortcut every DAX purist hates gets you exactly where you need to go."), how-to-play's `say` example, the ledger row 12 and walkthrough, `tests/golden-path.json` (`say select *` → `say calculated column`; 69 turns, 200 unchanged), `tests/golden-path.ts`.

### 4.2 Power Query Hall reads as seven steps

Room text (replaces the all-Changed-Type framing): "Power Query Hall. Seven doorways in a row, each an Applied Step: Source, Navigation, Promoted Headers, Changed Type, Filtered Rows, Removed Other Columns, Renamed Columns. The first is open. The rest are yellow — you go through them in order, or the hall errors. Portraits line the walls. The Duke's chamber is north; the Report Studio, east; the Model View, west; the gate, south." `enterQuip`: "Seven steps. In order. That's the whole idea of a query." The `doorways` pokes become per-step ("You try the Filtered Rows door. It's yellow. Changed Type first."); `look at steps` / `look at query` lists them with state (governance §8). The applied-steps puzzle itself is governance §8 (+10). After `pq.done` the room text says the doors are all open.

### 4.3 Keep audit

Each Keep room is checked against "does this make sense in Power BI Desktop / a semantic model?" and any line that's SQL-flavored where it should be DAX/M/Desktop-flavored is fixed: the Gate (SKU/Desktop updating — fine), the hall (M), the chamber (DAX), the Model View (relationships/cardinality — fine), the Studio (Card, refresh — fine), the moat itself stays T-SQL (it's the Warehouse the Keep sits on — that's the joke, and it's a Fabric truth).

## 5. Voice

### 5.1 `src/world/voice.ts` — the constants

- `SIGNOFF = 'You dead. Refresh failed.'` — appended to **every** death text (engine: `finish()` appends it when `dead` and the text doesn't already end with it).
- `NICKNAMES` — Mister Star Schema, Calculated Column Casey, Import Mode Ishmael, Ctrl-Shift-Enter, Power Query Pete, Many-to-Many Mandy, Captain Blank, Bidirectional Bob, DAX Vader, Clippy, Zune, Encarta, Ask Jeeves, Tom from MySpace, champ, guy. `nick(s)` picks deterministically by turn (never the same twice in a row).
- `MALAPROPS` — refreshered, capacitude, DAXxed — used verbatim in at least 6 lines each across the game.
- `FRUSTRATION = "Come now. Don't get throttled."` — the one unchanging reply to frustration/profanity (§5.3).
- `CHEAT = 'Meh.'` first attempt; the "logged in a table" line second.
- `BRUSHOFFS` — one per NPC (§3.1).
- `BRANDS` — Refreshr™, CapacityAde, Dataflows Gen1 Classic.
- `ALLUSIONS` — the 2000s-Microsoft layer (Clippy, Zune, Encarta, the XP hill, MSN nudges, Access 97, SharePoint 2007, "It looks like you're writing a measure.") — a list the sweeps draw from; at least one per region.

Tests pin every constant (a change to the sign-off is a deliberate, reviewed change).

### 5.2 Add-mode

The pass **adds**: new lines in existing pools (unparsed, unknown noun, no-exit, talk-to-nothing, repeat, shout, wrapper), new beats (second-look and third-look on scenery, per-object remembered repeat for every gettable item, gag-command second time, echo-your-words on 3+ adjective nouns, boredom escalation, "making up puzzles" after five scenery looks), new commands (`where` per room, `why`), inventory blurbs (every item, two sentences), NPC brush-offs and one derailment each, the blame beat + sign-off on every death, ten new deaths, three curses, the sincere win line. Existing lines are kept unless listed in §5.3.

Source of the additions: the comparison doc `claude/fabrics-quest-voice-pass-before-after-sep23.md` (project) — its "Add with the skill" column is the starting inventory; the sweeps write more in the same voice.

### 5.3 The only overwrites

System-message-tier lines: `save` ("Saved. To your browser. Not to OneLake, so don't get cute."), `restore`, `restart`, `wait` (pair), `quit` (the breakup), already-open, already-wearing, closed-riddle, cheat first line ("Meh."), and the frustration reply (one unchanging line — the current six move into the shout-failure pool so nothing is lost). Tommy can veto any of these in review.

### 5.4 New deaths and curses

The ten deaths and three curses from the comparison doc, exactly as tabled there (refresh at 9:02 Monday; every relationship Both; the 400-visual page; publish to web; close the gateway laptop — only if the Gateway Shed exists, else skipped; ten calculated columns; merging the FINAL files; DAX in the M editor; CapacityAde; the two Sacristy deaths get the blame beat). Curses are engine features: `state.curse` ∈ {column, blank, jeff} changes the status-bar name / prompt / NPC visibility as tabled, gates Throttlor, and is undone by the tabled command; each curse is a `snark` outcome with `sfx: 'death'`-adjacent cue `curse`.

### 5.5 Region sweeps

One task per region (village, lake + swamp, Keep, monastery, peaks, Excel, Copilot, then governance rooms once built). Each sweep: read every line in the region's world file against the skill's checklist (proper nouns only from this game; one joke per line; a third of new lines under nine words; second identical command yields a different line; insults target competence/hygiene/taste/boredom, never identity; failures end with the sign-off), add lines per §5.2, and produce a per-region report listing every added line. The reviewer reads the report against the checklist, not just the diff.

## 6. Engine changes (additive)

`RuleThen.box`/`StepResult.box` (governance); `state.stuck` + nudge (§3.3); `talk.<npc>` counters + `Npc.talkMore`/`brushOff` + engine default escalation (§3.1); Copilot slot flags (§2.2, world-side, no engine change beyond flags); `state.curse` + display hooks in PlayScreen/App (§5.4); death sign-off append in `finish()` (§5.1); `hint` builtin alias (§3.4); `where`/`why` phrase rules (§5.2). Lint: every NPC has `brushOff`; every room has `flaskHint` (nudge needs it — or the default); every gettable item has an inventory blurb and a remembered-repeat line.

## 7. Testing

Per workstream: Excel stages 0–5 with each accepted phrasing; the totals ladder; `compare`; field list. Copilot: slot accumulation across prompts in every order, wrong model/measure behavior, `start over`, one-shot win, third-reply explicit hint, SAME_AGAIN. Stuck: talk 1–4 for every NPC (variant ≠ line 1; hint present at 3; nickname rotation at 4+), every gate object × obvious verbs, nudge at 4/8, `hint`. Keep: `say calculated column` +25 and the moat flag; `say select *` no moat; golden path 200/69 with the new line; hall text and step doors. Voice: constants pinned; sign-off on every death (a test iterates all `death:` rules); curses set/undo; inventory blurbs for every item; per-region "no proper noun outside the world" test (a word list from the world's items/npcs/rooms vs. new lines — heuristic, allowlisted). Existing suites stay green; golden + side quests 200 + 45; golden + governance suites per that spec.

## 8. The master cheat sheet (`docs/cheat-sheet.md`)

A single doc, written last (after everything above is built), maintained from the world files, in three sections:

1. **The 200 in order** — the direct command sequence from the cottage to the Golden Semantic Model (the golden path, one command per line, grouped by room, with the points each line earns and the running total), then the side quests and every bonus (Excel +20, Copilot +25, applied steps +10, the Abbot's errand +10, governance restored +5) as their own short sequences.
2. **Room by room: what you need and where it comes from** — one entry per room: what you must do here, what you need to have brought (and which room gives it), what you leave with, and the exact words (`say trial` at the Desktop Gate: the drawbridge is the guard's, the guard wants a SKU, the free one is the trial; the Duke: `say calculated column`; and so on for every gate in §3.2).
3. **Everything you can do in each room** — per room/scene: every command that gives a distinct response — the useful ones, the gag ones, the easter eggs, the deaths (marked ☠), the curses, the NPC talk escalations, and the god-mode extras — generated by walking the room's rules, phrase rules, items and NPCs (a script `scripts/cheat-sheet.ts` prints the raw inventory; the doc is the edited, readable version). The ledger stays the points authority; the cheat sheet links to it.

The README's Documentation list links it as "The cheat sheet — every command, every room, spoilers everywhere".

## 9. Out of scope

A voice toggle / v2 mode / world-version bump (ruled out by Tommy: the work is additive, nothing is replaced wholesale, so nothing to version). Perplexity research (only if a sweep runs dry). The Gateway Shed and Manual's puzzle (§16 leftovers).
