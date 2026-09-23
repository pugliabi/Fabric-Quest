# The 200-point ledger

Every point in Fabric's Quest, and — further down, behind a spoiler warning — the shortest known route to all of
them. The 70 bonus points have their own table and spoilers, further down still.

## Points

Points are awarded once per step. Where a step has more than one solution, they share the award.

| # | Step | Where | Points | Running |
|---|---|---|---|---|
| 1 | Read the prophecy on the notice board | Village Square | 5 | 5 |
| 2 | Get the Gen1 credentials from the Miller | Dataflow Gen1 Mill | 10 | 15 |
| 3 | Bring the Ferryman back online | Ferryman's Dock | 15 | 30 |
| 4 | Take the Standard (Gateway) Key | Isle of Gateway | 20 | 50 |
| 5 | Pick up the OneLake Shortcut | Gold Marsh | 10 | 60 |
| 6 | Open the Monastery gate (or wait out the Spark session) | Monastery Gate | 10 | 70 |
| 7 | Library card (your Pro license) for the Spark Scroll | Library of Deprecated Notebooks | 10 | 80 |
| 8 | Read the scroll | Library of Deprecated Notebooks | 5 | 85 |
| 9 | Fix Brother Pandas' notebook | Spark Session Chamber | 20 | 105 |
| 10 | The Hoodie of Spark, from the Abbot | Cloister | 15 | 120 |
| 11 | Say (or start) the trial SKU at the gate | Power BI Desktop Gate | 10 | 130 |
| 12 | Give the Duke something to despise (an unmarked date table, or the words 'calculated column') and get thrown in the Moat | Duke's Chamber | 25 | 155 |
| 13 | Out-stare the Card visual | The Report Studio | 10 | 165 |
| 14 | The pie becomes a bar chart → the Big Refresh finishes → Bursting Boots | The Report Studio | 15 | 180 |
| 15 | Open the Shrine door as one of the Worthy | Bursting Ledge | 5 | 185 |
| 16 | Say `star schema` to Throttlor | The Shrine | 10 | 195 |
| 17 | Take the Golden Semantic Model | The Shrine | 5 | **200** |

The three trials from the prophecy map onto steps 10 (*look like an Engineer*), 12 (*smell like a Warehouse*)
and 4 (*hold the Gateway Key*). The Shrine door checks for all three.

A finished game with fewer than 200 points still counts as a win; the Hall of Fame records whatever you had.

## Map

```
                    [Town Hall]  [Mill]
                         up |     |
         [My Workspace] -- [Village Square] -- [Refresh Fields] -- [Foothills] -- [Throttling Pass] -- [Bursting Ledge] -- [Shrine]
                                   |                                        |
             [Lake House] -- [OneLake Shore] -- [Dock] ~~ [Isle of Gateway] [PBI Desktop Gate]
                                   |                                                 |
                              [Bronze Marsh]                    [The Model View] -- [Power Query Hall] -- [Report Studio]
                                   |                                   |                     |
                              [Silver Marsh]                           |              [Duke's Chamber]
                                   |                                   |
                               [Gold Marsh] -- [Monastery Gate] ------ +
                                                      |
                                  [Sacristy] -up- [Cloister] -- [Spark Chamber]
                                                      |
                                                  [Library]
```

(The Semantic Model Keep is north of the Foothills. Inside it, the Model View has a back gate straight north
onto the Monastery Gate — a shortcut that skips the swamp entirely, since every model needs its engineers. The
swamp still reaches the Monastery the long way, east of its gold layer, and is where the Shortcut lives. The
Lake House is west of the OneLake Shore — a house, on a lake, with no points in it. The swamp itself is south of
the lake shore — bronze, silver, gold. My Workspace, west of the Square, is where the game starts; it used to be
called the Cottage. Two rooms are UP rather than on the compass: the Town Hall, up the steps from the Square, and
the Sacristy, up the spiral stair from the Cloister — sixteen books, a tenant settings shelf and a capacity ledger.)

---

## Full walkthrough — spoilers

<details>
<summary>Click to reveal the 69-turn, 200-point route</summary>

This is the exact command list the automated test replays against every build (`tests/golden-path.json`; run it
yourself with `npm run replay -- tests/golden-path.json`). Type it in and you'll finish with 200 points in 69
turns.

**Village (15 pts)**

```
look
get mug
read report
out
read board                  +5   the prophecy
give mug to jeff                 quiets Jeff; he stops interrupting
n
talk to miller               +10  Gen1 credentials
s
```

**The Semantic Model Keep (60 pts)**

```
e
e
n
use trial                    +10  you start the free 60-day trial (say trial works too); the gate opens
n
w
get date table                    the unmarked date table, off its plinth in the Model View
e
n
give date table to duke      +25  UNMARKED? The Duke throws you in the Moat of T-SQL — Trial 2: you smell like a Warehouse (say calculated column works too)
n
e
look at card                 +10  the Card visual blinks first
use pie chart                +15  the pie becomes a bar chart; the Big Refresh finishes; the Bursting Boots fall out
wear boots                         no more interactive delay on the Peaks
```

**Through the Keep's back gate to the Monastery (60 pts)**

```
w
w
n
open gate                    +10  the session starts (one wait works too); the gate opens
n
w
give license to librarian     +10  your Pro license is a library card here
read scroll                   +5
e
e
use scroll on notebook        +20  Brother Pandas' notebook runs
w
talk to abbot                 +15  the Hoodie of Spark
wear hoodie                        Trial 1: you look like an Engineer
```

**Back through the Keep and the village, to the Lake (35 pts)**

```
s
s
e
s
s
w
w
s
e
give credentials to ferryman  +15  the Ferryman comes online
board boat
get standard key              +20  the Gateway Key
board boat
w
```

**The Lakehouse swamp (10 pts)**

```
s
s
s
get shortcut                  +10  a OneLake Shortcut (don't drink anything on the way)
use shortcut                       takes you straight back to the OneLake Shore
```

**The Peaks (20 pts)**

```
n
e
e
e
n
n                              +5   the Shrine door opens for the Worthy Three
say star schema                +10  Throttlor is defeated by good modeling practice
get model                      +5   the Golden Semantic Model. 200/200.
```

</details>

## Bonus

Seventy bonus points sit on top of the 200-point score above: two side quests (reachable from anywhere in the
realm at any time and left with `exit`) and three errands in the main map. Bonus is never added to `score` — the
status bar shows it separately, as `Score : N of 200 +B` — and the Hall of Fame has its own bonus column. None of
it is on the golden path.

| Bonus | Where / trigger | Points | Running |
|---|---|---|---|
| Jeff's Excel | `show me a table` (or `help jeff` / `talk to jeff about excel` in the Village Square, or `yes` right after Jeff asks) | +20 | 20 |
| Copilot | `what are my sales numbers` (or `copilot`, or `ask copilot …`, which asks the rest of the line on the way in) | +25 | 45 |
| The Applied Steps | Power Query Hall: apply the hall's seven broken steps in order | +10 | 55 |
| The Abbot's errand | Cloister: the Abbot asks you to turn Publish to web off, up in the Sacristy | +10 | 65 |
| Governance restored | The Sacristy: put every book you moved back where you found it | +5 | **70** |

<details>
<summary>Click to reveal: Jeff's Excel</summary>

The three pieces — a dimension, a measure, and a filter — can go in in any order; the pivot's total ticks
4.7M → 4.5M/4.3M (either order) → 4.2M as they land. Then show Jeff.

```
show me a table
n
use analyze in excel        sign-in required — the connection needs the license, not just a click
use license on connection   connects Analyze in Excel to Sales (Certified); after the Monastery the
                             Librarian has the card, and `sign in` still works — it never signed out
s
e
create pivot table           a blank pivot on the live model, still showing 4.7M out of habit
use sales region             Rows: Sales Region — the total moves
use net sales                Values: Net Sales — Returns fall out of the number
filter by year               Filters: Is Current Year = Yes — the total lands on 4.2M
w
show jeff                    +20  bonus. Jeff says the words no one at Finance has ever said: the report was right
```

The command list above is `SOLVE` in `tests/excel.test.ts`. `ask jeff` (repeatable) gets you his method,
one fact per ask, in order — useful for spotting what's wrong with his export before you fix the pivot.

</details>

<details>
<summary>Click to reveal: Copilot</summary>

The ladder answers one missing requirement at a time — read the `[Copilot suggests: …]` line under each reply
and it names the next thing to add: something about sales, a named semantic model (the one with the gold badge
in the Model Gallery, east of the pane, is `Sales (Certified)`), a region, a quarter, a year, the word `total`,
`net sales` specifically (plain Sales Amount still includes Returns), and finally a single figure rather than a
table.

The winning prompt, from `tests/copilot.test.ts`:

```
total q4 2025 northeast net sales from the certified model, just the number
```

→ `Copilot: Q4 2025 Northeast Net Sales, Sales (Certified): $1,247,930.` +25 bonus, and you're back where you
left off. From outside the realm, `ask copilot for` followed by the same prompt enters and wins in one turn.

</details>

<details>
<summary>Click to reveal: the Applied Steps</summary>

`look at steps` (or `look at query`) lists the chain with its state: open, waiting, yellow. Apply them in order:

```
source
navigate
promote headers
change type
filter rows
remove other columns
rename columns                +10  the query refreshes
```

Out of order, you get the real Power Query error and every step after the last good one turns yellow; you are
back where the query stopped. Three places where the game departs from the governance spec's §8, on purpose:

- **The errors are the real M strings.** Where the spec's table had placeholders (`Details: Column1`,
  `'Column3'`), the game prints what Power Query actually says for this query (`Details: Region`, `'Year'`).
- **Changed Type counts.** Re-applying Changed Type gives `Changed Type1`, then `Changed Type2`, and so on — a
  counter, not the same line every time. Power Query adds a new one. It always will.
- **After the query is done, `change type` still does it.** Once all seven are applied, `change type` gives the
  next `Changed TypeN` instead of an "already applied" line.

</details>

<details>
<summary>Click to reveal: the Sacristy (the Abbot's errand, governance restored)</summary>

The Sacristy is up the spiral stair from the Cloister (`u`, or `climb stairs`). `settings` lists the tenant
settings shelf; `capacity settings` lists the capacity ledger; `read <book>` says what a setting does, in real
admin-portal words and then in game words; `turn on <book>` / `turn off <book>` flips it. They are real tenant
settings, and flipping them changes the realm — Copilot off means every Copilot trigger says contact your
administrator, Export to Excel off closes Jeff's Excel for business, and so on.

```
talk to abbot                 (once the gate is open) he asks you to take Publish to web down
up
turn off publish to web       +10  the errand, paid on the flip (or paid by the Abbot if the book was already off)
```

Governance restored (+5) is paid the first time every book you moved away from its default is back on its default
again — flip each one back by hand, or `reset settings` to put the whole shelf back at once. Turning Publish to web
off for the Abbot makes off its default from then on, so the errand never counts against the +5 (and never doubles
as it). Nobody will ever know.

</details>

## Deaths (for completeness)

| Where | What you did |
|---|---|
| Anywhere (except inside the side quests, which only shrug) | `die`, `attack me`, `delete workspace`, `rm -rf` / `format c:` / `drop database` |
| Anywhere you carry it, and on the Throttling Pass | drank the CapacityAde (`drink capacityade`) — 64 CUs, billed before you arrive |
| Village Square | offered Jeff a paginated report |
| My Workspace | `merge` the FINAL files — there is now a `Sales_v3_FINAL_final4` and you are not in it |
| My Workspace | `publish` to the entire internet (`publish to web`) while the Publish to web setting is still on |
| Refresh Fields | a full `refresh` at 9:02 on a Monday (`schedule refresh` is safe; `refresh manual` is the scarecrow) |
| OneLake Shore | tried to `import` the lake into Desktop |
| Bronze Marsh | drank the water |
| Power BI Desktop Gate | swam / dove into the Moat |
| The Model View | set every relationship to Both (`set all relationships to both`, `enable bidirectional`) — ambiguous path |
| The Model View | a tenth calculated column (`add calculated column`) — nine warnings, counted out loud, then Word |
| Power Query Hall | typed DAX into the M editor (`type dax`, `write a measure`) |
| The Report Studio | opened the 400-visual page (`open page 2`, `open the other page`, `open do not open`) |
| The Sacristy | turned on Block Public Internet Access, by its name |
| The Sacristy | turned on Pause capacity (or said `pause capacity`), by its name |
| The Shrine | attacked Throttlor |

All of them are one **Restore** away from undone. The two Sacristy deaths only fire when you name the book: a
title word that happens to match (`turn on internet`) gets a warning instead, and the setting is never saved, so a
restore puts you back on the stair.

