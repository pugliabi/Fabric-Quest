# The 200-point ledger

Every point in Fabric's Quest, and — further down, behind a spoiler warning — the shortest known route to all of
them. The two side-quest bonuses have their own table and spoilers, further down still.

## Points

Points are awarded once per step. Where a step has more than one solution, they share the award.

| # | Step | Where | Points | Running |
|---|---|---|---|---|
| 1 | Read the prophecy on the notice board | Village Square | 5 | 5 |
| 2 | Get the Gen1 credentials from the Miller | Dataflow Gen1 Mill | 10 | 15 |
| 3 | Bring the Ferryman back online | Ferryman's Dock | 15 | 30 |
| 4 | Take the Standard (Gateway) Key | Isle of Gateway | 20 | 50 |
| 5 | Pick up the OneLake Shortcut | Gold Marsh | 10 | 60 |
| 6 | Wait out the Spark session at the gate | Monastery Gate | 10 | 70 |
| 7 | Library card (your Pro license) for the Spark Scroll | Library of Deprecated Notebooks | 10 | 80 |
| 8 | Read the scroll | Library of Deprecated Notebooks | 5 | 85 |
| 9 | Fix Brother Pandas' notebook | Spark Session Chamber | 20 | 105 |
| 10 | The Hoodie of Spark, from the Abbot | Cloister | 15 | 120 |
| 11 | Say the trial SKU at the gate | Power BI Desktop Gate | 10 | 130 |
| 12 | Say `select *` to the Duke and get thrown in the Moat | Duke's Chamber | 25 | 155 |
| 13 | Out-stare the Card visual | The Report Studio | 10 | 165 |
| 14 | Incremental policy → the Big Refresh → Bursting Boots | The Report Studio | 15 | 180 |
| 15 | Open the Shrine door as one of the Worthy | Bursting Ledge | 5 | 185 |
| 16 | Say `star schema` to Throttlor | The Shrine | 10 | 195 |
| 17 | Take the Golden Semantic Model | The Shrine | 5 | **200** |

The three trials from the prophecy map onto steps 10 (*look like an Engineer*), 12 (*smell like a Warehouse*)
and 4 (*hold the Gateway Key*). The Shrine door checks for all three.

A finished game with fewer than 200 points still counts as a win; the Hall of Fame records whatever you had.

## Map

```
                                 [Mill]
                                   |
              [Cottage] -- [Village Square] -- [Refresh Fields] -- [Foothills] -- [Throttling Pass] -- [Bursting Ledge] -- [Shrine]
                                   |                                        |
             [Lake House] -- [OneLake Shore] -- [Dock] ~~ [Isle of Gateway] [PBI Desktop Gate]
                                   |                                                 |
                              [Bronze Marsh]                    [The Model View] -- [Power Query Hall] -- [Report Studio]
                                   |                                   |                     |
                              [Silver Marsh]                           |              [Duke's Chamber]
                                   |                                   |
                               [Gold Marsh] -- [Monastery Gate] ------ +
                                                      |
                                                  [Cloister] -- [Spark Chamber]
                                                      |
                                                  [Library]
```

(The Semantic Model Keep is north of the Foothills. Inside it, the Model View has a back gate straight north
onto the Monastery Gate — a shortcut that skips the swamp entirely, since every model needs its engineers. The
swamp still reaches the Monastery the long way, east of its gold layer, and is where the Shortcut lives. The
Lake House is west of the OneLake Shore — a house, on a lake, with no points in it. The swamp itself is south of
the lake shore — bronze, silver, gold.)

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
say trial                    +10  the guard takes the free 60-day trial capacity; the gate opens
n
n
say select *                 +25  the Duke throws you in the Moat of T-SQL — Trial 2: you smell like a Warehouse
n
w
get policy                        an incremental refresh policy, off the lectern in the Model View
e
e
look at card
wait
wait                          +10  the Card visual blinks first
use policy on refresh         +15  the Big Refresh finishes in small bursting steps; the Bursting Boots fall out
wear boots                         no more interactive delay on the Peaks
```

**Through the Keep's back gate to the Monastery (60 pts)**

```
w
w
n
wait
wait
wait                          +10  the Spark session finally starts
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

Two side quests, reachable from anywhere in the realm at any time and left with `exit`, pay bonus points on top
of the 200-point score above. Bonus is never added to `score` — the status bar shows it separately, as
`Score : N of 200 +B` — and the Hall of Fame has its own bonus column.

| Quest | Trigger | Bonus |
|---|---|---|
| Jeff's Excel | `show me a table` (or `help jeff` / `talk to jeff about excel` in the Village Square, or `yes` right after Jeff asks) | +20 |
| Copilot | `what are my sales numbers` (or `copilot`, or `ask copilot …`, which asks the rest of the line on the way in) | +25 |

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

## Deaths (for completeness)

| Where | What you did |
|---|---|
| Anywhere (except inside the side quests, which only shrug) | `die`, `attack me`, `delete workspace`, `rm -rf` / `format c:` / `drop database` |
| Village Square | offered Jeff a paginated report |
| OneLake Shore | tried to `import` the lake into Desktop |
| Bronze Marsh | drank the water |
| Power BI Desktop Gate | swam / dove into the Moat |
| The Shrine | attacked Throttlor |

All of them are one **Restore** away from undone.
