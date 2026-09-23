# Fabric's Quest — Side Quests: Jeff's Excel and Copilot

**Date:** 2026-09-22 · **Status:** approved design, pending implementation plan
**Depends on:** the shipped game (spec `2026-09-22-pros-quest-design.md`, §16 addendum), the chirps layer (`src/engine/quirks.ts`), god mode.

## 1. Summary

Two quick minigame side quests, each its own small "realm" with its own look, scenes and sound, reachable
from any room at any time and returning the player to exactly where they were:

| Trigger (typed anywhere) | Realm | Goal | Bonus |
|---|---|---|---|
| `show me a table` (also `show me the table`, `open excel`, `analyze in excel`), or **`help jeff`** / `talk to jeff about excel` / `talk to jeff about export` in the Village Square | **Jeff's Excel** | Prove to Jeff, with Analyze in Excel and a pivot, that his export doesn't match the report because he used the wrong dimension, the wrong measure and no filter | **+20** |
| `what are my sales numbers` (also `show me my sales`, `ask copilot …`, `copilot`) | **Copilot** | Get Copilot to show Q4 Northeast sales from the certified model — a ladder of prompts where each "correct" answer is wrong in a new way | **+25** |

Bonus points are a separate counter on top of the 200-point ledger. The main game, its golden path and its
tests do not change.

## 2. Entering, leaving, returning

- **Trigger rules** are global phrase rules, active in every main-realm room while the player is alive and not
  already inside a side realm. Jeff's Excel has a second, in-story door: in the Village Square, once Jeff has
  the mug (or even before), `talk to jeff` mentions his export problem ("The numbers don't match. Come look.
  Please. I have Excel open."), and `help jeff` / `talk to jeff about excel|export|numbers` / `go with jeff` /
  `yes` (as the next command after that line) warps in exactly like `show me a table`. Typing a trigger inside the *other* side realm gets a joke, not a warp
  ("One side quest at a time. This is a peasant, not a pipeline.").
- **Entering** stores the current room as `flags['sq.return']` (room index, via `roomIndex`), plays the
  **side-quest sting** (a big rising "doot-doot-DOOT" cue, `sfx: 'sidequest'`), flashes the scene panel white
  for ~250 ms (`.scene.flash` CSS animation; the one deliberate animation outside the splash), then moves the
  player to the realm's entry room and shows its entrance quip in the Sierra message box.
- **Leaving**: `exit`, `leave`, `close`, `close excel`, `close copilot`, `back`, `out` from any side room, or
  the direction `out`, returns the player to `sq.return` (engine support: `RuleThen.returnTo: true`, resolved
  by `step()`); the sting plays reversed (`sfx: 'sidequest-out'`) and the narrator says where you are again
  by re-describing the room. Turns and score are unaffected by leaving; a side quest can be re-entered and
  finished later — its flags persist.
- **Completing** a side quest awards its bonus once (`pointsKey`), sets `flags['sq.<name>.done']`, shows a
  message box, plays `sfx: 'bonus'` (cha-ching), and returns the player automatically on the next command
  or immediately (the completion rule has `returnTo: true`; the description of the home room follows the win
  text).
- **No deaths** in side realms. Side realms are excluded from the Peaks interactive delay and from Jeff's
  square ambient (he's busy in Excel).
- Saves/restores work unchanged (room + flags are all the state there is). `restart` from inside a side realm
  restarts the whole game as usual.

## 3. Scoring: bonus points

- `GameState.bonus: number` (default 0). `RuleThen.bonus?: number` awards it once per `pointsKey ?? id`
  (same `pts.` flag mechanism as `points`). `MAX_SCORE` stays 200.
- Status bar: `Score : 120 of 200` becomes `Score : 120 of 200 +20` once bonus > 0.
- `score` command: `Score : 120 of 200 (+20 bonus), in 44 turns.`
- Finish screen: `Score 200 / 200 · +45 bonus · 71 turns · 9:12`.
- HallOfFame entity: new `@int({ optional: true }) bonus` column (additive schema change). Board sorts by
  `score desc, bonus desc, turns asc`; rows show `200 pts +45`. Anonymous read include list gets `bonus`.
- Telemetry: `flags_after` already carries `pts.*` and `sq.*`; add `bonus` to the flags map (`flags.bonus`
  mirrors `state.bonus`) so the Activity table can chart it without a schema change. `score_after` stays the
  main score.
- God mode's `prompts` shows `(+20 bonus)` on bonus rules.

## 4. Jeff's Excel

**Region:** `excel`. **Look:** white grid paper, green ribbon strip along the top, column letters/row numbers,
a fat red `#REF!` somewhere on every scene; the play-screen status bar turns Excel green while inside
(`data-region="excel"` on `.play`). **Sounds:** `excel-ding` (soft two-note chime) on pivot changes; the
side-quest sting on entry.

### 4.1 Rooms

| id | Name | What's here |
|---|---|---|
| `excel.sheet1` | Sheet1 | Jeff at his desk; `export` (Sales_export_v7.xlsx); `report` (the published report on a second monitor, total 4.2M); the ribbon. Exits: `e` → pivot, `n` → data tab, `out` → return. |
| `excel.pivot` | PivotTable1 | The pivot Jeff built from the export. Field list on the right of the scene once Analyze in Excel is connected. Exits: `w` → sheet1, `out` → return. |
| `excel.data` | The Data tab | The Analyze in Excel connection (`.odc`), "Sign-in required". Exits: `s` → sheet1, `out` → return. |

Entrance quip (message box): *"Uh oh. You're in a spreadsheet. Cell A1 is blinking. Nobody knows why."*

### 4.2 The story

Jeff's export says **4.7M**; the report says **4.2M**. Jeff has decided the report is wrong. `talk to jeff`
gives the mismatch. `ask jeff what did you use` / `talk to jeff about export` / `ask jeff` reveals his method,
one fact per ask, in order:

1. "I summed **Sales Amount**. It's the big column."
2. "I grouped by **Region A**. It was the first region column I saw."
3. "Filters? I didn't filter anything. Filtering is how you lose data."

### 4.3 The puzzle

1. **Connect Analyze in Excel.** In the Data tab: `use analyze in excel` / `analyze in excel` / `connect` →
   "Sign-in required." `use license on connection` / `sign in` (needs `license`, which every player starts
   with) → connected: `flags['excel.connected']`. Scene gains the **field pane** on the right: three tables
   with a few columns each —
   - `Geography (legacy)`: Region A, Region B *(greyed: "deprecated")*
   - `Sales Region`: Sales Region, Territory
   - `Calendar`: Year, Quarter, Is Current Year
   - Measures: `Sales Amount`, `Net Sales`, `Returns`
2. **Build the pivot.** In PivotTable1: `create pivot table` / `create pivot` / `insert pivot` → empty pivot
   (`excel.pivot.created`). Then, in any order:
   - `use sales region` / `add sales region` / `rows sales region` → dimension right (`excel.dim`)
     (`use region a` → "Region A is the legacy column. Jeff's favorite. It has 14 regions and two of them are
     'Northeast'.")
   - `use net sales` / `add net sales` / `values net sales` → measure right (`excel.measure`)
     (`use sales amount` → "Sales Amount includes Returns. It always did. Jeff never asked.")
   - `filter by year` / `filter year 2025` / `filter by current year` / `filter by active` → filter right
     (`excel.filter`) (`no filter` → Jeff nods approvingly. That is not a good sign.)
   Each correct step: `excel-ding`, the pivot in the scene fills in, and the narrator narrates the total
   moving: 4.7M → 4.4M → 4.3M → **4.2M** (order-independent text: it reports "the pivot now says X" from the
   set of correct pieces: none 4.7, one 4.5, two 4.3, three 4.2).
3. **Show Jeff.** With all three right: `show jeff` / `show pivot to jeff` / `talk to jeff` → *"Jeff looks
   at 4.2M. Jeff looks at his export. Jeff says the words no one at Finance has ever said: 'Okay. The report
   was right.'"* → **+20 bonus**, `sq.excel.done`, `returnTo`.
   Before all three: Jeff says which one still bothers him ("It still says 4.5M. You're filtering wrong. Or
   right. I can't tell.").

Room-level chirps: `export to excel` inside Excel → "You are already in Excel. This is as exported as it gets."
`get ye flask` hints per room (the flask works here too). `help` mentions `exit`.

## 5. Copilot

**Region:** `copilot`. **Look:** a chat pane — light grey canvas, a rounded input bar at the bottom of the
scene, reply bubbles that show the *last* Copilot answer as a tiny table/card drawn in the scene, and an
original four-point sparkle mark; status bar turns purple. **Sounds:** `copilot-think` (three soft rising
blips, the "thinking" cue) before every reply; the side-quest sting on entry.

### 5.1 Rooms

| id | Name | What's here |
|---|---|---|
| `copilot.pane` | The Copilot Pane | The prompt box. Exits: `e` → gallery, `out` → return. |
| `copilot.gallery` | The Model Gallery | Three semantic models on plinths: `Sales_v3_FINAL_final2` (no badge), `sales_test_DO_NOT_USE` (a sign says exactly that), **`Sales (Certified)`** (endorsement badge, gold). `look at models` / `look at certified` reveals names, and `look at measures` on the certified one lists `Net Sales`, `Sales Amount`, `Returns`. Exits: `w` → pane, `out` → return. |

Entrance quip: *"A sparkle appears. It would like to help. It would like that very much."*

### 5.2 Prompting

Inside `copilot.pane`, **any** line not otherwise handled (the parser's `say …`, `ask copilot …`,
`copilot …`, or plain text with no known verb) is treated as a prompt. Copilot's reply is chosen by a
**ladder**: the first rung whose requirement the prompt fails answers, in this order. A prompt that passes
every rung wins.

| Rung | Requirement (case-insensitive) | Copilot's reply when missing |
|---|---|---|
| 0 | at least 3 words | "Could you be more specific? I found 1,204 things." |
| 1 | mentions sales | "I can help with that! Here are the top 5 things in your tenant: a lakehouse, a lakehouse, a report named 'test', a lakehouse, and a warehouse called 'DO NOT DELETE'." |
| 2 | names a model (`certified`, `final2`, `do_not_use` / `test`) | Lists **fourteen** tables with "sales" in the name, across three models, and asks which one. |
| 3 | names the **certified** model (`certified`) | Answers from the wrong model with a confident wrong number: `Sales_v3_FINAL_final2 → Sales: $9,104,220` ("Note: this model is not endorsed. I picked it because it has the most rows."), `sales_test_DO_NOT_USE → Sales: $12`. |
| 4 | `northeast` (or `north east`, `ne region`) | "Total Sales, Sales (Certified): $4,201,377 — all regions. Did you want a region? I can do regions." |
| 5 | `q4` / `fourth quarter` / `quarter 4` | "Northeast Sales, all time: $2,933,012. Since 2019. Also some from 2018 that were keyed in late." |
| 6 | a year (`2025` — the certified model's current year; any other year: "I only have 2019–2025. I've assumed 2025." *and passes*) | "Q4 Northeast Sales… **here are 400 rows.** I've included every product, every day, and a column called Column1." (raw data — the scene shows a scrolled table) |
| 7 | asks for a total (`total`, `sum`, `how much`, `number`, `measure`, `amount`) | Still the 400 rows: "You asked for sales. These are the sales. Each one." |
| 8 | names the **right measure** (`net sales`; `sales amount` → "Q4 2025 Northeast **Sales Amount**: $1,331,890. That includes Returns. Returns are $83,960. Just so you know. I didn't subtract them. You didn't ask.") | wrong-measure answer above |
| 9 | asks for a single figure / card (`just the number`, `one number`, `as a card`, `only the total`, `summarize`) — **or** the prompt is ≤ 14 words | "Q4 2025 Northeast Net Sales, Sales (Certified) — by product, by day, by salesperson, pivoted, 3 pages." |
| ✓ | all of the above | **"Q4 2025 Northeast Net Sales, Sales (Certified): $1,247,930."** The scene shows a single clean card. **+25 bonus**, `sq.copilot.done`, returnTo. |

Extra finickiness (deterministic, on top of the ladder):
- Prompts over 30 words: "I've summarized your question to 'sales'." and answer rung 2.
- The exact same prompt twice in a row: the chirps layer's repeat lines apply, plus Copilot adds "I gave the
  same answer because it is the same question. I am consistent. That is my best feature."
- A prompt with `please`: "You're welcome!" appended (it did not help).
- Every reply ends with a one-line *suggestion chip* in the scene ("Try: ask about a region") that is the
  rung's hint — so the ladder is discoverable without being spoiled.

Sample winning prompt: `ask copilot for total net sales for the northeast region in q4 2025 from the certified model, just the number` (20 words, passes 0–9).

## 6. Narrator everywhere: entrance quips

Every room in the game gets an `enterQuip` — a short Sierra-message-box line the first time you enter it
(subsequent entries: none, or a shorter `revisitQuip` for a few rooms). Style: Peasant's Quest deadpan.
Examples: Village Square — *"A square. A well. A man with a spreadsheet. You are going to regret the
spreadsheet."*; Bronze Marsh — *"Everything here is a string. Including, briefly, you."*; Duke's Chamber —
*"The Duke speaks only in JOINs. Try not to be a cross join."*; The Shrine — *"Uh oh."*. Implemented as
`Room.enterQuip?: (s) => string | null` surfaced through the existing `onEnter` output *and* shown in the
message box (the UI already boxes door/points lines; entrance quips get the same treatment with a
`notice` flag from the engine: `StepResult.notice?: string`).

All 22 main rooms + 5 side rooms get one. They are content, in the region files.

## 6b. Wrappers: wanting, insisting, and frustration — everywhere

The chirps layer already reacts to `!` and to the same command repeated. Three kinds of **wrapper** are
recognized around a command; each is stripped before parsing, the bare command runs normally, and a line
from the matching pool is appended. They stack with `!` and with plain repeats.

| Kind | Wrappers (leading unless noted) | Pool voice | Examples |
|---|---|---|---|
| **Intent** — polite wanting | `i want to`, `i wanna`, `i would like to`, `i'd like to`, `can i`, `could i`, `may i`, `let me`, `i will`, `i'll`, `i'm going to`, `try to`, `attempt to`, `how do i`, `how about i` | Dry: wanting is not doing | *"Wanting is noted. Doing is a verb."* · *"You may. You just did."* · *"Ambition logged. Result attached."* · *"The realm does not need your consent form. Just the verb."* |
| **Insistence** — repeating yourself with words | leading `i said`, `i told you`, `i already said`, `like i said`, `as i said`, `again,`; trailing `again`, `already`, `like i said` | Deadpan: the realm heard you | *"You said. The realm heard. The realm is choosing not to."* · *"Saying it again with 'I said' in front does not add a verb."* · *"The narrator was there the first time."* · *"'Again' is not a modifier the parser supports. Neither is 'already'."* |
| **Frustration** — heat | leading `ugh`, `argh`, `omg`, `come on`, `seriously`, `for the love of`, `dammit`, `damn it`, `why won't you`, `why can't i`, `just`, `please just`, `fine`, `okay fine`, `listen`, `hey`; trailing `dammit`, `you idiot`, `you stupid game`, `right now`, `now`, `please` | Snark with a wink; escalates | *"Frustration logged. It does not count toward the 200."* · *"Okay, okay. Same answer, but I'll say it slower."* · *"Ye wish. Ye wish with feeling."* · *"The dragon is not fed by tone."* · *"Deep breaths. The realm has all day. The realm is billed by the second, but it has all day."* |

- `I want to feed the dragon` → runs `feed the dragon`, adds an Intent line. `I said feed the dragon` →
  Insistence line. `Feed the dragon, dammit` → Frustration line. `I SAID FEED THE DRAGON!` → Insistence +
  shout. Same command a third time with a wrapper and a `!` → the three-way escalation: *"All three. Caps,
  'I said', and a third try. This is a support ticket now."*
- Wrappers work in every realm, including the side quests (Copilot answers the unwrapped prompt and adds
  "I sense frustration. I have logged it as feedback." for Frustration wrappers).
- Telemetry: `verb`/`noun` record the unwrapped command; `raw_input` keeps the whole line;
  `flags.wrap.intent`, `flags.wrap.insist`, `flags.wrap.frustrated` count per quest (for the "most
  frustrated peasant" chart).
- The plain REPEAT pool (same bare command twice) stays as is; the flask keeps its own pools.

## 7. Engine changes (small, additive)

- `GameState.bonus: number`; `RuleThen.bonus?: number`, `RuleThen.returnTo?: true`; `Room.region` gains
  `'excel' | 'copilot'`; `Room.enterQuip?`; `StepResult.notice?`.
- `step()`: resolves `returnTo` to the stored room; skips interactive delay/ambient in side regions;
  copies `state.bonus` into `flags.bonus` for telemetry; `quirks.ts` gains `unwrap(raw)` →
  `{ command, kind: 'intent' | 'insist' | 'frustrated' | null }` used before `normalize()`.
- Copilot prompt handling is a `Room`-level `catchAll?: (s, raw) => RuleThen | null` hook (only
  `copilot.pane` uses it) evaluated after room/global rules and before builtins — the ladder lives in
  `src/world/copilot.ts` as pure data + one function, unit-tested rung by rung.
- `describeRoom` unchanged. World lint: side regions must have an `out` exit; every side room must be
  reachable from its entry; trigger phrases must not collide with existing phrase rules.

## 8. UI / audio

- `PlayScreen`: `data-region` attribute drives status-bar color (`excel` green `#1d6f42`, `copilot` purple
  `#6b4fbb`; main realm unchanged white).
- `ScenePanel`: `.flash` class for 250 ms on side-quest entry (engine `sfx === 'sidequest'` triggers it);
  `prefers-reduced-motion` disables it.
- `sfx.ts` cues: `sidequest` (big rising doot-doot-DOOT, square + triangle), `sidequest-out` (the reverse),
  `excel-ding`, `copilot-think`, `bonus` (cha-ching).
- Scenes: `src/scenes/excel.tsx` (sheet with grid, ribbon, Jeff sprite, the pivot that fills in, the field
  pane overlay listing the three tables), `src/scenes/copilot.tsx` (pane, sparkle, last-reply bubble
  rendered from `flags['copilot.last']` — a small enum of reply shapes: list / table / raw / card).

## 9. Docs and telemetry

- README "The quest" gets a short "Side quests" paragraph (no spoilers); `docs/how-to-play.md` gets a "Side
  quests" section (how to enter/leave, that bonus is separate); `docs/ledger.md` gets a "Bonus" table with
  both quests and their walkthroughs behind spoiler tags.
- Step ids: `excel.*`, `copilot.*` (rung replies: `copilot.rung.N`, win `copilot.win`). This makes the
  Copilot funnel a one-query chart in Power BI: which rung do players get stuck on.

## 10. Testing

- Entry/exit from five different rooms restores the exact room; entering while inside the other realm does not
  warp; `restart` inside a side realm works.
- Excel: all three pieces in any order reach 4.2M; `show jeff` before completion gives the "still bothers him"
  line; bonus awarded exactly once across repeated `show jeff`; Jeff's three answers cycle in order.
- Copilot: a table-driven test of ~16 prompts, one per rung plus the winner plus the over-30-words and
  wrong-year cases; bonus once; `copilot.last` shape per rung.
- Golden path still 200 / 59 turns; a golden path + both side quests run asserts 200 + 45.
- World lint passes with the new regions; every new room has `enterQuip`, `flaskHint`, scene and `out`.
- Playwright: the flash class appears on entry, status bar changes color, message box shows the quip.
- Wrappers: `i want to get mug` picks up the mug and adds an Intent line; `i said get mug` (already held)
  adds an Insistence line; `get mug, dammit` adds a Frustration line; `I SAID GET MUG!` adds Insistence +
  shout; the three-way escalation appears on the combined case; the `flags.wrap.*` counters increment;
  wrappers never break the golden path (none of its commands are wrappers) and `wait`/`look` wrapped are
  still `wait`/`look`.

## 11. Out of scope

Real Copilot/LLM calls; deaths inside side realms; side-quest leaderboards of their own; more than two side
quests (the trigger/return machinery is generic so a third is a content-only addition).

## 12. The Fortress becomes the Semantic Model Keep (Power BI)

The Fortress is re-themed from "Warehouse" to **Power BI**: Desktop at the gate, Power Query in the hall, the
Model View, the Duke of **DAX** in the chamber, and a Report Studio in the yard. The Moat stays the **Moat of
T-SQL** — the Keep is built on top of a Warehouse, and that is where SQL goes when it is spoken in a semantic
model — so the prophecy line *"Smell like a Warehouse"*, the moat trial (+25), the sigils and the dragon's gag
are all unchanged. The four scored steps keep their points and `pointsKey`s; only their skins and the commands
change. Ledger stays 200.

| Room | Was | Becomes | Scored step |
|---|---|---|---|
| `fortress.bridge` | Warehouse Fortress Drawbridge | **Power BI Desktop Gate** — the drawbridge is a splash screen stuck on "Loading… Power BI Desktop is updating (1 of 3)". The guard still wants a SKU. | `say trial` +10 (unchanged) |
| `fortress.hall` | Great Hall (columnstore) | **Power Query Hall** — a long hall of Applied Steps; every doorway is a `Changed Type`; portraits of Source, Navigation and a step named `Custom1` nobody remembers. Exits: s bridge, n throne, e studio, **w model** (new). | none (pass-through, quirks only) |
| `fortress.model` (new) | — | **The Model View** — tables float on plinths joined by relationships; one many-to-many bridge wobbles; a date table is not marked; Sir Cardinality (NPC) guards the diagram. Holds the **incremental refresh policy** (item `policy`, replaces `cable`). | none |
| `fortress.throne` | Duke of Warehouse | **The Duke of DAX** — speaks only in CALCULATE; every sentence has a filter context. `say select *` → "SQL? IN MY MODEL?" → guards hurl you from the window into the Moat of T-SQL below (the Warehouse the Keep stands on). | `say select *` +25 (unchanged, `fortress.moat`) |
| `fortress.yard` | Pipeline Yard | **The Report Studio** — a canvas: a **Card visual showing (Blank)** that must be out-stared (was the Lookup Activity); a 31-slice pie; a slicer stack; **the Big Refresh** (a progress bar at 97% since 2019). `use policy on refresh` / `use policy on big refresh` → the refresh finishes in small steps and drops the **Bursting Boots**. | stare +10 (`fortress.stare`), boots +15 (`fortress.copy`) |

Golden path changes (Task 9 updates `tests/golden-path.json` and the ledger doc): `look at lookup` → `look at
card`; `get cable` / `use cable on copy activity` → `w`, `get policy`, `e`, `e` … `use policy on refresh`.
Turns: 59 → 61.

### 12.1 Commands and quirks per room (all `outcome: 'fail'` or `'snark'` unless stated; each a room rule or phrase rule scoped to the room)

- **Gate:** `look at splash` → "Loading… 1 of 3. It has been 1 of 3 since you arrived."; `say pro` / `say ppu` / `say premium` → guard: "Pro gets you a report. It does not get you a Keep."; `update` / `install update` → "The update installs. Then another. The drawbridge does not move. This is the update."; `sign in` → "You are already signed in. Twice. On two tenants. One of them is wrong."
- **Power Query Hall:** `fold` / `fold query` / `query folding` → "You attempt to fold. The step before you is `Changed Type`. Folding stops here, as it always has."; `changed type` → "Changed Type. Changed Type. Changed Type. The hall echoes it back. It is the hall's only word."; `remove columns` → "You remove other columns. The hall grows shorter. So does your refresh."; `buffer` / `table.buffer` → "Table.Buffer. The hall holds its breath. Nothing is faster. Everything is in memory."; `look at custom1` → "Custom1. A step. Nobody knows what it does. Everyone is afraid to delete it."; `merge` → "You merge queries. Left outer. It is always left outer."; `enter m` / `advanced editor` → "The Advanced Editor opens. It is a wall of `let`. You close it gently."
- **Model View:** `create relationship` / `add relationship` → "Between which tables? Sir Cardinality raises an eyebrow. Both eyebrows. He has many-to-many eyebrows."; `many to many` / `bidirectional` / `both directions` → "You set it to Both. The model sighs. Somewhere a measure becomes ambiguous. Sir Cardinality writes your name down."; `single direction` / `one to many` → "Single direction, one to many. Sir Cardinality nods once. It is the only time he will nod."; `mark as date table` → "You mark the date table as a date table. Time intelligence, which had been sulking, starts working. No points. It should have been done already."; `hide column` / `hide` → "You hide the key column. It is still there. It is always still there."; `look at bridge` → "A many-to-many bridge. It wobbles. Do not stand on it. Do not build a report on it."; `talk to sir cardinality` → advice in order: "One. To. Many." / "Star schema. Not snowflake. Not… whatever that is." / "The dragon will ask you a question. The answer is two words. I have said them already."; `get policy` → item (this is the golden-path step: "An incremental refresh policy: 'Refresh rows from the last 10 days.' Small steps. Bursting steps, one might say.")
- **Duke of DAX:** `say calculate` → "'CALCULATE,' says the Duke, 'with no filter. A context transition, and nothing else. You may sit.' You may not sit."; `say sumx` / `say sum` → "'SUMX,' the Duke corrects, 'iterates. SUM aggregates. You, peasant, do neither.'"; `say divide` → "'DIVIDE,' says the Duke, 'handles zero. Unlike you.'"; `say filter` → "'FILTER returns a table,' says the Duke. 'You return nothing.'"; `say measure` → "The Duke waits for the rest of the measure. It does not come. He closes the DAX window on your fingers."; `say evaluation context` / `say filter context` / `say row context` → "The Duke's eyes narrow. 'Which one?' You do not know. Nobody does, the first six times."; `write measure` → "You write a measure. It works in the card and not in the table. This is normal. This is DAX."; `say all` → "'ALL removes filters,' says the Duke, 'including the ones keeping you alive.'"; existing `say join` line stays as the Warehouse-in-the-moat joke ("JOINs are for the moat.").
- **Report Studio:** `look at pie` / `fix pie` → "A pie with 31 slices. Twelve of them are 'Other'. You could fix it. You could also leave it and let it be someone else's problem in Q3." / `use bar chart on pie` → "You turn the pie into a bar chart. Three stakeholders weep. The fourth sends a thumbs-up."; `add slicer` → "You add a slicer. There are now nine slicers. The page loads in the time it takes to regret this."; `align` / `align visuals` / `distribute` → "You align the visuals. Eleven pixels. Then ten. Then eleven again. It is never done."; `bookmark` → "You create a bookmark. It captures the current state, including the part that is broken."; `conditional formatting` → "You conditionally format the card. It is red. It was always going to be red."; `performance analyzer` / `analyze performance` → "Performance Analyzer runs. The slowest visual is the one Jeff asked for."; `format` → "You open the Format pane. It has 214 options. You change the font. You feel nothing."; `look at card` starts the stare (unchanged mechanics; the card shows (Blank) until it blinks).
- **Entrance quips:** Gate: "Power BI Desktop. It is updating. It will be updating when you leave." · Hall: "A hall of Applied Steps. Every door is a Changed Type." · Model View: "Tables float on plinths, joined by lines. One line wobbles. Everyone pretends not to see it." · Duke: "The Duke speaks only in CALCULATE. Every sentence has a filter context. Mind yours." · Studio: "A canvas. A pie. A card that says (Blank). Someone has aligned nothing."

Items renamed/added: `cable` → **`policy`** (incremental refresh policy; aliases `incremental refresh`, `refresh policy`, `incremental`); `lookup` NPC → **`card`** (the Card visual, aliases `card visual`, `blank`, `the card`); `copy` (Copy Activity) → **`refresh`** (the Big Refresh, aliases `big refresh`, `progress bar`, `refresh bar`); new NPC **`cardinality`** (Sir Cardinality). Scenes: `fortress.bridge` (Desktop splash on the gate), `fortress.hall` (steps hall), `fortress.model` (diagram view), `fortress.throne` (DAX window as a throne), `fortress.yard` → Studio canvas with pie/card/slicers/progress bar (variants for stare states and boots dropped, as today).

## 13. The Lake House

A new room off the OneLake Shore (`lake.shore` exits gain `w: 'lake.house'`): **`lake.house` — The Lake
House.** *"A house. On a lake. That's it. That's the whole thing. Somebody in marketing is very proud."*
A porch, a deck chair, a mailbox, a sign reading `LAKEHOUSE` with the two halves painted in different fonts.
No points, no items to take, pure bit. Commands: `open door` / `enter` / `in` → "Inside: files on the left,
tables on the right, and a shortcut to another house across the lake. You back out slowly."; `sit` / `sit in
chair` → "You sit on the deck. The lake refreshes. It is lovely. You are billed."; `look at sign` → "LAKE, in
serif. HOUSE, in sans. They were added at different times, by different teams."; `knock` → "Nobody answers. A
Spark session starts inside, out of politeness."; `buy house` / `buy` → "It is not for sale. It is for
*storage*. Very different, the realtor insists, without making eye contact."; `swim` → "You wade in. It is a
lake. It is also, somehow, a house. You are now inside a house while swimming. You get out."; `look at mailbox`
→ "Mailbox: 1 new. It is a CSV. It has been in the mailbox since bronze."; `fish` → "You fish. You catch a
Delta log. You put it back; it was not fully committed."; flask hint: "This room is a joke. The joke is the
whole room. The shore is east."; enterQuip: "A house. On a lake. Take a moment."

Scene `lake.house`: a small wooden house on stilts at the water's edge, a porch with a deck chair, the sign in
two fonts, the lake filling the bottom third of the frame.

## 14. God mode: `where`

In burninate mode, `where <thing>` answers "where is this / who wants this / what do I say" by searching the
world: items (which room holds it, or which rule gives it), NPCs (which room), rule nouns and `say` phrases
(which room, the exact command, points, preconditions), and rooms by name. Examples:

- `where sku` → `fortress.bridge — Power BI Desktop Gate: > say trial (+10) [needs nothing]  ·  also: say f64, say pro …`
- `where key` → `lake.island — Isle of Gateway: > get standard key (+20) [needs ferry.online]  ·  item 'standard key' lives in lake.island`
- `where jeff` → `village.square — Village Square (npc Jeff from Finance) · excel.sheet1 — Sheet1 (npc Jeff)`
- `where hoodie` → `monastery.cloister — Cloister: > talk to abbot (+15, gives hoodie) [needs monastery.fixed]`
- `where guard` / `what do i give the guard` → same as `where sku` (NPC match lists every rule in that NPC's room that names the NPC or fires there).

Output is one block per match, most specific first (rules that award points, then rules, then items, then
NPCs, then rooms). Unknown → "Nothing in the realm answers to '<thing>'. Try: rooms, prompts all." Aliases:
`where is <thing>`, `where's <thing>`, `find <thing>`, `how do i get <thing>`, `what do i (give|say) (to )?<npc>`.

## 15. World order: the Keep comes before the swamp

The intended order becomes **Village → Fortress (Keep) → Monastery → Lake → Swamp → Peaks**. Geography:

- `fortress.model` (the Model View) gains a north exit to `monastery.gate`; `monastery.gate` gains a south
  exit back to `fortress.model` ("the Keep's back gate: the Model View opens onto the Monastery — every model
  needs its engineers"). The existing swamp link (`swamp.gold` e → gate, gate w → gold) stays, so the swamp
  remains a second way in and the Shortcut still lives in the Gold Marsh.
- Monastery Gate `describe` and the village notice board mention the Keep: the prophecy's "Look like an
  Engineer" line gets a second handwriting note: *"the monks are behind the Keep"*.
- Golden path (canonical run) is re-sequenced: village (15) → fortress via fields/foothills (SKU, moat, policy,
  stare, boots: 60) → model view north to the monastery (wait, card, scroll, notebook, hoodie: 60) → back
  through the Keep to the village → lake (ferry, key: 35) → swamp (shortcut: 10) → `use shortcut` → peaks
  (door, dragon, model: 20). 200 points, ~73 turns. `tests/golden-path.json`, `tests/golden-path.ts`,
  `docs/ledger.md` (table order, walkthrough, map) and `README` hints ("The village has three things…" →
  "the Keep is east, past the fields; the monks are behind it") change accordingly.
- Flask hints that pointed "south to the lake" as the next step from the village now point east to the Keep
  first; the Lookup/Card stare text no longer assumes you already hold the key.

## 16. Village ideas (open — not yet in the plan)

Candidate additions, to be picked: **the Tenant Settings Town Hall** (a clerk who says "that's an admin
setting" to everything); **the Gateway Shed** behind the Mill (a personal-mode gateway that only works when
its owner's laptop is open); **Refresh Fields** scarecrow named Manual gets a puzzle (`schedule refresh` →
the crops turn green, no points); **My Workspace** as the cottage's proper name with a "Publish" button
that asks which workspace and offers only this one.

## 17. Keep humor pass: Power BI failure modes, gifts, and examinables

Every room in the Keep also gets the **classic Power BI failure modes** as bits, and every object in it can be
examined, taken (or refused with a reason), used, and given, so `look at <thing>` never dead-ends.

**Failure-mode bits (rules or phrase rules, deterministic, no points):**
- *The right DAX, but it takes a while.* In the Duke's chamber, `say <a plausible measure>` (anything containing
  `calculate` + `filter`, or `sumx`, or `var … return`) → *"The Duke nods. 'Correct.' A spinner appears. The
  spinner is still there. You could wait. `wait` ×3 → 'Visual has exceeded the available resources.' The
  Duke: 'Correct, though.'"* (a small three-step stare-alike: `dax.spinner` counter; on the third wait the
  Card in the Studio flips to `(Blank)` again as a running gag).
- *Unexpected number.* `look at card` after the stare shows 4.2M; `look at card` a second time → *"4.2M.
  Then 4.7M. Then 4.2M. It depends on whether Jeff is in the room."*; in the Model View `look at bridge`
  twice → *"The wobble is a many-to-many. Your totals will be right, until someone filters by Territory."*
- *Refresh errors.* In the Studio `use refresh` / `refresh` with no policy → one of: *"Refresh failed: the
  credentials for 'Sales_export_v7.xlsx' are not valid. They were valid yesterday. Nothing changed. Nothing
  ever changes."* · *"Refresh failed: The column 'Column1' of the table wasn't found. It was found last week.
  Jeff renamed it. Jeff denies this."* · *"Refresh failed: The gateway is offline. The gateway is on a laptop.
  The laptop is closed. The laptop belongs to someone on vacation."* · *"Refresh failed: There is not enough
  memory to complete this operation. There was, before the 31-slice pie."* · *"Refresh succeeded. Nobody
  believes it."*
- *Circular dependency.* In the Model View `create calculated column` / `add column` → *"A circular dependency
  was detected. You did not touch anything. You breathed near it."*
- *Ambiguous path.* `say both` after `many to many` → *"An ambiguous path between tables was detected.
  Sir Cardinality does not look up. He knew."*
- *DirectQuery.* Anywhere in the Keep, `say directquery` / `say direct query` → *"Every click, a query. Every
  query, a wait. You feel the Keep slow down as you say it."*; `say direct lake` → *"Direct Lake. The Keep
  brightens. Then falls back to DirectQuery for reasons that will be explained in a blog post."*
- *Publish.* `publish` in any Keep room → *"Publish to Power BI: which workspace? There is one. It is not the
  right one. You publish anyway. A red dot appears on something."*
- *Sensitivity label.* `label` / `set sensitivity` → *"Highly Confidential. The pie chart is now Highly
  Confidential. Jeff can still see it."*
- *The Q&A visual.* In the Studio `ask <question>` / `use q&a` → *"Q&A shows sales by month. You asked about
  regions. It is very confident."*
- *Format string.* `format number` → *"0.00%. Then #,##0. Then, briefly, a date. It is not a date."*

**Gifts and objects (the `give` graph):** every NPC in the Keep answers `give <any item> to <npc>` with a
specific line for the *right* item, a specific line for each *tempting wrong* item, and a rotating generic
refusal for the rest. Right/tempting pairs: **guard** ← `say trial` is the answer; `give license to guard` →
"He reads it. 'Pro.' He hands it back like a wet napkin."; `give mug` → "He has a mug. It says WORLD'S OKAYEST
GUARD." **Duke of DAX** ← `say select *` (nothing to give); `give scroll to duke` → "'PySpark?' The Duke holds
it at arm's length. 'In the Keep?' You are not thrown in the moat, but it is close."; `give policy` → "'Ten
days at a time? I compute everything, every time, always.' He does not want it. Keep it for the Studio."
**Sir Cardinality** ← `give shortcut` → "He turns it over. 'A shortcut. To a table. In another house.' He hands
it back and says a prayer." · `give key` → "He inspects the STANDARD key. 'Shared,' he says, approvingly.
'Not personal.' He gives it back; he is a knight, not a gateway." **the Card** ← `give policy to card` →
"The Card does not take input. That is the Card's whole thing." · `give mug to card` → "The Card shows
(Mug). Then (Blank)."

**Examinables (every scenery item has `describe`, `untakeableText`, and a `use` line):** Gate: splash screen,
battlements, moat, drawbridge, update dialog. Hall: steps, doorways, portraits (Source, Navigation, Custom1),
the Advanced Editor door. Model View: plinths, relationship lines, the wobbly bridge, the unmarked date table,
the lectern, the diagram. Duke's chamber: the throne (a formula bar), the DAX window, the window (the one
you get thrown from: "It opens onto the moat. It is the fastest exit in the Keep."), the filter pane behind
the throne. Studio: canvas, pie, card, slicers, bookmarks pane, Format pane, Performance Analyzer, the Big
Refresh, the boots (after they drop), a visual header, a sticky note reading "DO NOT TOUCH — JEFF".

Each examinable's `use` and `get` answers follow the same rotating-pool mechanism as the rest of the game
(`vary`), so repeated pokes are different pokes.

## 18. Room texture pass: something to do, get, or give everywhere

Every main-realm room gets at least one **takeable object** (some relevant to a puzzle, some pure red
herrings with a good `describe`), at least one **action** beyond walking through (a `use`/`give`/`talk`/`read`
that answers specifically), and a **flask hint that names the next concrete thing to do in that room** —
e.g. Monastery Gate: *"The session is starting. Wait. Then wait again. Then once more — three waits opens
the gate."*; Ferryman's Dock (offline): *"The Ferryman needs credentials. The Mill has them."*; Bursting
Ledge: *"The door wants the Worthy Three: wear the hoodie, smell like the moat, hold the key."* Not
cumbersome: no new required puzzles; the 200-point ledger and golden path do not change. Red-herring items
are small and funny (a `sticky note`, a `USB stick labelled FINAL`, a `laminated KPI`, a `lanyard`, a `stress
ball shaped like a cube`) and each has one place where using or giving it earns a line (never points). The
`give` graph rule from §17 applies to every NPC in the realm: right item, tempting wrong items, rotating
generic refusal.
