# Actions that fit — design

*September 23, 2026. Follows `2026-09-23-playability-and-voice-design.md` and `2026-09-23-governance-design.md`. The
ledger stays 200; the bonus ledger grows.*

Tommy, after playing the shipped build: "the actions you do should be aligned to the type of thing" — a refresh policy
handed to a report makes no sense; changing the 31-slice pie to a bar chart does. The Desktop Gate should be `use
trial`, not `say trial`. The Duke should be handed something (a date table), not told a phrase. The Model View should
be `use relationship`. Nobody should have to `wait` twice for points. And every scene should have something you can
take that matters somewhere else.

Rulings agreed with Tommy: the wait chains become one real action each, and one of them keeps a repeat as a deliberate
joke (the game tells you to do it again and pays on the second); new items are optional (gags or bonus points) and the
200 only changes where named; the old `say` lines become nudges with no points (one scoring route per puzzle).

## 1. The 200, rewired

Same 200, same order of rooms, fewer backtracks. Points move where noted; everything not named here is unchanged.

| Room | Was | Now | Points |
|---|---|---|---|
| Power BI Desktop Gate | `say trial` | `use trial` (also `start trial`, `click try free`, `try free`, `download desktop`, `install desktop`, `use link`) | +10 (same) |
| The Model View | `get policy` (0) | `use relationship` (also `fix relationship`, `activate relationship`, `use relationship lines`, `use dashed line`, `set single direction`) — the dashed inactive Date→Sales line becomes active, single direction, one to many; then `get date table` (takeable only once related) | **+10** (new) |
| Duke's Chamber | `say calculated column` | `give date table to duke` (also `show date table to duke`, `use date table on duke`, `give table to duke`) | **+20** (was 25) |
| The Report Studio | `look at card` · `wait` · `wait` | `put measure on card` twice (also `add measure to card`, `use measure on card`, `drag measure to card`, `drop net sales on card`, `add net sales`): the first shows (Blank) and the narrator says do it again; the second shows a number | +10 (same) |
| The Report Studio | `use policy on refresh` | `change pie chart to bar chart` (also `use bar chart`, `change chart`, `change pie to bar`, `change visual`, `use pie chart`, `convert pie chart`, `make it a bar chart`) — the Big Refresh finishes, the boots fall out | +15 (same) |
| Monastery Gate | `wait` ×3 | `start session` (also `start spark session`, `use gate`, `use progress bar`, `press start`, `use start`, `ring bell`, `knock`) | **+5** (was 10) |

Sum check: 5 + 10 + 10 + 10 + 20 + 10 + 15 + 5 + 10 + 5 + 20 + 15 + 15 + 20 + 10 + 5 + 10 + 5 = 200.

The new golden path (`tests/golden-path.json`), room by room: Workspace (`get mug`, `read report`) → Square (`read
board`, `give mug to jeff`) → Mill (`talk to miller`) → Fields → Foothills → Gate (`use trial`) → Hall → Model View
(`use relationship`, `get date table`) → Hall → Duke (`give date table to duke`, moat, land at the Gate) → Hall → Studio
(`put measure on card` ×2, `change pie chart to bar chart`, `wear boots`) → Hall → Model View → Monastery Gate (`start
session`) → Cloister → Library (`give license to librarian`, `read scroll`) → Spark Chamber (`use scroll on notebook`)
→ Cloister (`talk to abbot`, `wear hoodie`) → back through the Keep → Square → Shore → Dock (`give credentials to
ferryman`, `board boat`) → Isle (`get standard key`, `board boat`) → marshes (`get shortcut`, `use shortcut`) → Fields
→ Foothills → Pass → Ledge → Shrine (`say star schema`, `get model`). Target: 200 in ≤ 70 turns; the test pins the
final score and that the run wins, not the turn count.

### 1.1 The Desktop Gate: `use trial`

- The drawbridge (the splash screen) gains a link: the describe adds "Under the update dialog, a link: Try free." and
  `look at splash` / `look at dialog` / `look at link` mention it.
- `use trial` and its synonyms (bridge up) → "You click Try free. 'Sixty days,' says the guard, reading over your
  shoulder. 'Come in. Quickly.' The splash screen finishes updating (3 of 3). The drawbridge crashes down." +10,
  `bridge.down`, `sfx: 'door'`, pointsKey `fortress.sku` (unchanged key, so the ledger row stays).
- `say trial` (and the SKU words) → the nudge, no points: "'Trial,' the guard repeats. 'I've heard of it. Everyone's
  heard of it. Show me.' There's a link under the dialog." `outcome: 'fail'`. `say f64` etc. keep their lines.
- The flask hint, the oblique/plainer nudges, the guard's talk ladder and `knows`, `gates.ts` (Desktop Gate answers),
  `where.ts`, ROOM_NEEDS and the cheat sheet say "a link" / "try it", never "say it".

### 1.2 The Model View: `use relationship`, then the date table

- New flag `model.related` (false at start). The describe adds, before it: "One line is dashed: Date to Sales,
  inactive since a meeting in 2021." After: "Date to Sales is solid now. Single direction. One to many. Sir
  Cardinality has stopped sighing."
- `use relationship` and synonyms, not yet related → "You double-click the dashed line. Date[Date] to Sales[OrderDate].
  Active: on. Cross-filter: single. Cardinality: one to many. Sir Cardinality nods once. It is the only time he will
  nod. The date table, which has been related to nothing since 2021, sits up." +10, `model.related`, `sfx: 'item'`.
  Related already → "It's active. It's single. It's one to many. You can stop double-clicking it." (fail).
- The existing `fortress.relationship` ("Between which tables?") becomes the answer to `use relationship` **with a wrong
  noun2** (e.g. `use relationship on sheet1`, `use relationship on bridge`) and to `create relationship`; the many-to-many
  line stays on `say many to many` / `use bridge` and the bidirectional death is untouched.
- The **date table** becomes takeable (`takeable: true`, id `date-table` stays), with `visibleWhen` unchanged (always).
  `get date table` before `model.related` → "You lift the date table. It is related to nothing, and Sir Cardinality
  will not let a table leave the diagram unrelated. 'Nothing leaves this view without a relationship,' he says. 'Not
  even you.'" (fail, no give). After → "You take the date table. Every day from 1900 to 2099, and now a line to Sales.
  Heavier than it looks; most of it is weekends." give `date-table`, flag `taken.date`, `sfx: 'item'`. `again`:
  "You have the date table. It's the only table in the realm that knows what day it is."
- Inventory blurb (voice-items): "The date table: 1900 to 2099, related to Sales, not yet marked. The Duke will
  notice."
- `use date table` (mark it, existing rule) still works in the Model View and — new — anywhere while carried
  (`model.date`). Marking changes what the Duke says, never whether he throws you.
- The **incremental refresh policy** stays takeable and stays the cure for the Calculated Column curse (`use policy on
  self`). Its Studio use becomes a nudge: `use policy on refresh` → "The Big Refresh doesn't want a policy. It wants
  the thing it's been chewing on since 2019 gone: look at the pie." (fail, no points, the item stays). `taken.policy`
  is no longer on the golden path; every hint that pointed at the lectern points at the dashed line instead.
- The flask hint ladder: not related → "One line in the diagram is dashed. Double-click it." / related, no table →
  "The date table is free to leave now. Take it; the Duke will want to see it." / carried, no moat → "North of the
  hall, the Duke. Show him what you're carrying." / moat, no refresh → east to the Studio; then the monks as today.
  Oblique/plainer nudges rewritten to match (oblique never names the verb).

### 1.3 The Duke: `give date table to duke`

- `give date table to duke` (has `date-table`, no `trial.moat`) → the moat. Text branches on `model.date`:
  - unmarked: "The Duke takes the table. Turns it over. 'A date table,' he says. 'UNMARKED.' The room goes quiet.
    'You built time intelligence on a table you never marked as a date table.' He does not finish the sentence. He
    finishes you." then the existing moat paragraph (MOAT_TEXT: the window, the Moat of T-SQL, landing at the Gate,
    smelling like a Warehouse).
  - marked: "The Duke takes the table. 'Marked,' he says, almost pleased. He reads the M. There is no M. 'CALENDARAUTO.'
    He says it like a diagnosis. 'You made your date table in DAX. In the model. A calculated table.' The window is
    already open." then MOAT_TEXT.
  - Either way: +20, pointsKey `fortress.moat`, set `trial.moat`, `curse.column: false`, `duke.wrong: 0`, remove
    `date-table` (he keeps it), `moveTo: 'fortress.bridge'`, `sfx: 'death'`. The Duke's `describe` after the moat adds
    "Your date table is on his desk. He has marked it." (`model.date` true after the moat — he did it).
- `say calculated column` before the moat → a strike (`wrong()`), no points: "'Calculated column,' says the Duke. 'You'd
  say that.' He looks at your hands. 'Show me one. Bring me a table and I'll show you the moat.'" After the moat →
  MOAT_AGAIN unchanged. `fortress.sin-elsewhere` (the region phrase) keeps its lines but the hint text inside it points
  at the table, not the words.
- `give policy to duke` (existing) stays. `give date table to duke` after the moat → "'Another?' He already has one. He
  points at the window. You take the stairs." (snark). Without the table: `give date table to duke` → "You have no
  table. The Model View, west of the hall, has one — related to nothing, which he'd also throw you for."
- Flask hint / nudges / `knows` for the Duke: "He wants to see a table, not hear a phrase. The Model View has one."
  Oblique at 4: "The Duke has thrown people in the moat for a phrase, but lately he wants evidence. Something with
  every day in it." Plainer at 8: "Bring him a table. The one that knows what day it is."

### 1.4 The Report Studio: the Card, then the pie

**The Card (+10), the deliberate repeat.**
- `put measure on card` (and synonyms; noun words: measure, net sales, sales, a measure, total sales, the measure),
  `stare.done` false, no `card.measure` flag → "You drop Net Sales on the Card. It shows (Blank). It looked at you the
  whole time. Every one of us has done this: the first one never counts. Do it again." set `card.measure: 1`,
  `outcome: 'fail'`, sfx none.
- Again, `card.measure` 1 → "You drop Net Sales on the Card again. $4,213,908. The Card blinks first. It has never done
  that." +10, pointsKey `fortress.stare` (ledger row unchanged), set `stare.done`, `card.measure: 2`, `sfx: 'item'`.
- A third time → "It shows $4,213,908. It will keep showing it. That's what a measure is." (snark).
- `look at card` / `wait` keep their staring-contest lines and the (Blank) curse at six stares (curses.ts) — the stare
  no longer pays and `stare.count` no longer gates anything but the curse. The Card's talk ladder mentions the measure
  on talk 3 ("Put something on me. Anything. Net Sales. I've heard good things.").

**The pie (+15).**
- `change pie chart to bar chart` and synonyms (verbs change/use/convert/make/swap/switch; nouns pie, pie chart, chart,
  visual, bar chart, bar, the pie), `refresh.done` false → "You select the pie. Thirty-one slices tense up. Visualizations
  pane: clustered bar. The slices unroll into bars, longest first, and for the first time you can read December. In
  the corner, the Big Refresh — which has been chewing on a 31-slice pie since 2019 — reads 98%. 99%. 100%. Something
  falls out of the progress bar: a pair of boots." +15, pointsKey `fortress.refresh-done`, set `refresh.done`, give
  `boots`, `sfx: 'item'`. The pie item's describe after: "A clustered bar chart. It used to be a pie. Nobody misses it
  except Jeff." The old pie is on the floor: see §2 (the **pie chart** becomes takeable after the change).
- Already done → "It's a bar chart. It's been a bar chart for a minute. Leave it." (fail).
- `use policy on refresh` → the nudge in §1.2. `refresh` words keep their lines (`fortress.refresh-words`).
- Order is free: the Card and the pie can be done in either order; the golden path does the Card first.
- Flask hint ladder: no card → "There's a Card on the canvas showing Blank. Blank means nothing's on it." / card, no
  chart → "The Big Refresh is stuck on one visual. The one with thirty-one slices. Change it." / done, boots not worn →
  unchanged / done → unchanged. Nudges rewritten: oblique never names the verb ("The refresh has been at 97% since
  2019 and the thing it chokes on is the roundest thing on the canvas.").

### 1.5 The Monastery Gate: `start session`

- `start session` and synonyms (`gate.open` false) → "You press Start. The stone bar jumps to 33%, hums at 67%, and
  stops at 99% for exactly as long as it takes you to doubt it. SESSION STARTED. Four minutes, as is tradition. The
  gate swings open." +5, pointsKey `monastery.wait` (ledger row keeps its key; label updated), set `gate.open`,
  `gate.waiting: 3`, `sfx: 'door'`.
- `wait` (gate closed) → one line, no points, no counter: "You wait. The bar doesn't. Sessions don't start because
  you're patient; they start because somebody pressed Start." `wait` after open keeps the billing lines. The
  `gate.waiting` counter rules go; the describe shows "SESSION STOPPED" before and "SESSION STARTED" after.
- The monk's talk ladder: talk 2 → "'Press Start,' says the monk. 'Nobody ever presses Start. They wait, and they
  bill.'" The monk tells you; you press. One scoring route.
- Flask hint: "There's a Start button on the progress bar. Nobody has pressed it since 2023." Oblique: "The bar has a
  button and a monk, and only one of them has ever started a session."

## 2. Every main room carries something

The 21 main-path rooms each get (or keep) one takeable item with a use in a **different** room. New items and new
cross-room uses; nothing existing is removed. Bonus points are paid through the existing bonus ledger (never `score`),
each once, with a pointsKey named below. The bonus cap in `docs/ledger.md` rises from 70 to **100**.

| Home | Item | New / existing | Use elsewhere | Pays |
|---|---|---|---|---|
| My Workspace | mug, sticky note | existing | existing | — |
| Village Square | lanyard | existing | existing | — |
| Town Hall | ticket | existing | **Shrine:** `give ticket to throttlor` → "The dragon reads SEV-3: 'report is wrong'. No details. It has waited four hundred years for a ticket with details. It eats this one." | — |
| Dataflow Gen1 Mill | USB stick | existing | **Isle of Gateway:** `use usb stick` / `use usb stick on plinth` → "The gateway machine has one USB port. It's for the mouse. You unplug the mouse. The gateway goes offline in four regions." | — |
| Refresh Fields | seed | existing | **Silver Marsh:** `plant seed` → "You plant the seed in the silver mud. It sprouts bronze, turns silver, will be gold by Friday. Then someone will ask for a platinum layer." | bonus +5 `swamp.plant-seed` |
| OneLake Shore | pebble | existing | existing (dock) | — |
| Ferryman's Dock | timetable | existing | **Refresh Fields:** `give timetable to scarecrow` → "The scarecrow reads the timetable. 'Every hour. On the hour.' He weeps into the refreshes. That is forty-eight a day on a Pro workspace, and eight is the limit." | bonus +5 `village.timetable` |
| Isle of Gateway | standard key, personal key | existing | existing | — |
| The Lake House | **CSV** (new: `Sales_2019.csv`, in the mailbox; `get csv` / `open mailbox`) | new | **Bronze Marsh:** `drop csv` / `use csv on water` / `put csv in water` → "You drop Sales_2019.csv into the bronze water. It lands. Untyped, unvalidated, and now loaded. Somewhere a Dataflow refreshes for no reason." | bonus +5 `swamp.land-csv` |
| Bronze Marsh | stress ball | existing | existing (global) | — |
| Silver Marsh | name tag | existing | existing | — |
| Gold Marsh | shortcut | existing | existing | — |
| Monastery Gate | pamphlet | existing | **Library:** `give pamphlet to librarian` → "'Spark for the Faithful: three minutes to your first session.' She reads it and files it under Deprecated. Everything here is." | — |
| Cloister | laminated KPI | existing | existing | — |
| Spark Session Chamber | bamboo | existing | **The Lake House:** `plant bamboo` → "Bamboo, beside a lakehouse. It grows a foot a day, like the Files folder. Somebody will shortcut to it." | — |
| Library | Synapse bookmark | existing | **Report Studio:** `use bookmark` / `use bookmark on bookmarks pane` → "You add the Synapse bookmark to the Bookmarks pane. It navigates to a page that was decommissioned in 2023. So, briefly, does the pane." | — |
| Power BI Desktop Gate | **installer** (new: `PBIDesktopSetup_x64.exe`, by the drawbridge; `get installer`) | new | **Isle of Gateway:** `use installer` → "You install Power BI Desktop on the gateway machine. It's a gateway with a Desktop now. Every gateway is, eventually." **Library:** `give installer to librarian` → "She reads the version. 'November.' Deprecated." | — |
| Power Query Hall | **napkin** (new: a star schema drawn on a napkin, under a portrait; `get napkin`) | new | **Model View:** `use napkin` / `compare napkin` → "You hold the napkin up to the diagram. It matches, except for Sheet1. It always matches except for Sheet1." **Shrine:** `give napkin to throttlor` / `show napkin` → "The dragon looks at the napkin. 'STAR SCHEMA,' it says, 'is two words. Not a drawing. Say them.'" | — |
| The Model View | date table (new takeable, §1.2), policy | new / existing | Duke (§1.3); policy cures the column curse | — |
| Duke's Chamber | **filter** (new: a filter card from the filter pane, `Year is 2019`, locked; `get filter`) | new | **Village Square:** `give filter to jeff` → "Jeff applies Year = 2019 to his export. The numbers match the report now. He is furious. 'It was FILTERED?' It was always filtered, Jeff." **Report Studio:** `use filter on chart` → "The bar chart now shows 2019. Everything was better in 2019. The bars were, anyway." | bonus +5 `village.filter-jeff` |
| The Report Studio | boots (given), **pie chart** (takeable after the bar-chart change: `get pie chart` → "You pick up the pie. Thirty-one slices, still warm from 2019. Someone will want it back. Someone always does.") | existing / new | **Village Square:** `give pie chart to jeff` → "Jeff holds the pie up to the light. Thirty-one slices. 'This is the one,' he says. He puts it in the export." **Shrine:** `give pie chart to throttlor` → "The dragon eats the pie. Thirty-one slices. It is the first thing it has eaten since 2019 that wasn't a capacity. It looks, briefly, grateful." | bonus +5 `peaks.pie-dragon` |
| Foothills | flat rock | existing | existing | — |
| Throttling Pass | receipt, CapacityAde | existing | existing | — |
| Bursting Ledge | carabiner | existing | **Ferryman's Dock:** `use carabiner on boat` / `use carabiner` → "You clip yourself to the boat. The Ferryman approves. Nobody has ever fallen off a Fabric ferry, but the form asks." | bonus +5 `lake.carabiner` |
| The Shrine | **hard hat** (takeable + wearable; `get hard hat`, `wear hard hat`) | new | worn at the Shrine, the dragon's brush-off changes: "'Hard hat,' says the dragon. 'Rated for falling capacity.'" **Throttling Pass** (if carried back before the win): `wear hard hat` → "Rocks fall. The hard hat takes it. That's what the F64 was for." | — |

Rules for the new items: every one has `describe`, a `get` line (the builtin pool or its own), an `again` line, an
inventory blurb in the voice-items pool, and `look`/`use`/`open` gags at home (two lines each, `poke()` where the
region has it). Every cross-room use is a `give`/`use`/`plant`/`drop` rule with `has: [item]` (worn for the hat), and
never shadows a scored rule. Every NPC that receives an item gets it in `knows`. Bonus lines carry `bonus: 5` and a
unique pointsKey; the sidequests bonus test replays all six new bonus commands and asserts 100.

## 3. Everything that reads the map

- `tests/golden-path.json` — rewritten; `golden-plus-sidequests`, `golden-plus-governance`, `sidequest-onboarding`
  and every test that replays a golden prefix follow it.
- `scripts/room-needs.ts` (ROOM_NEEDS), `docs/cheat-sheet.md` (§1 table replayed by the script; §1 bonus block +30;
  §2 per-room lines), `docs/room-guide.md` (regenerated), `docs/ledger.md` (the 200 rows renamed, bonus 100),
  `docs/how-to-play.md` and `README.md` where they name a command.
- `src/world/where.ts`, gates.ts (the Desktop Gate answers), the NPC `knows`/talk ladders (guard, Sir Cardinality,
  Duke, Card, monk), `hint`/flask hints/nudges for the six rooms, the region phrases (`fortress.sin-elsewhere`), the
  Sierra goal cards if any name the old commands, `src/world/copilot.ts` or Excel if any hint names them (none known).
- The game-wide hint rule holds: no hint or nudge names a command the current state refuses (the sweep test
  `tests/setting-effects.test.ts` is the net), and oblique nudges never name the verb.
- e2e: the Playwright smoke that types the opening commands is updated if it types `say trial`.

## 4. Out of scope

Side-quest rooms (Jeff's Excel, Copilot) keep their items; the Sacristy's books stay books; the prophecy, the Worthy
Three and the dragon's question are unchanged; no new rooms; no changes to governance settings' effects (XMLA off
still bricks the Model View's back gate; the new relationship puzzle sits in front of it either way).
