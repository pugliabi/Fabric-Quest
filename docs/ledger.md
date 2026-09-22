# The 200-point ledger

Every point in Fabric's Quest, and — further down, behind a spoiler warning — the shortest known route to all of
them.

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
| 11 | Say the right SKU at the drawbridge | Warehouse Fortress Drawbridge | 10 | 130 |
| 12 | Say `select *` to the Duke and get thrown in the Moat | Duke's Chamber | 25 | 155 |
| 13 | Out-stare the Lookup Activity | Pipeline Yard | 10 | 165 |
| 14 | Cable → Copy Activity → Bursting Boots | Pipeline Yard | 15 | 180 |
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
                                   |                           |
                             [OneLake Shore] -- [Dock] ~~ [Isle of Gateway]   [Fortress Bridge]
                                   |                                       |
                              [Bronze Marsh]                          [Great Hall] -- [Pipeline Yard]
                                   |                                       |
                              [Silver Marsh]                          [Duke's Chamber]
                                   |
                               [Gold Marsh] -- [Monastery Gate] -- [Cloister] -- [Spark Chamber]
                                                                       |
                                                                   [Library]
```

(The Fortress is north of the Foothills; the Monastery is east of the swamp's gold layer. The swamp is south of
the lake shore — bronze, silver, gold.)

---

## Full walkthrough — spoilers

<details>
<summary>Click to reveal the 59-turn, 200-point route</summary>

This is the exact command list the automated test replays against every build. Type it in and you'll finish with
200 points in 59 turns.

**Village (15 pts)**

```
look
get mug
read report
out
read board                  +5   the prophecy
give mug to jeff                 quiets Jeff; he stops interrupting
n
talk to miller              +10  Gen1 credentials
s
```

**OneLake (35 pts)**

```
s
e
give credentials to ferryman  +15  the Ferryman comes online
board boat
get standard key            +20  the Gateway Key
board boat
w
```

**Lakehouse swamp (10 pts)**

```
s
s
s
get shortcut                +10  a OneLake Shortcut (don't drink anything on the way)
```

**Monastery (60 pts)**

```
e
wait
wait
wait                        +10  the Spark session finally starts
n
w
give license to librarian   +10  your Pro license is a library card here
read scroll                 +5
e
e
use scroll on notebook      +20  Brother Pandas' notebook runs
w
talk to abbot               +15  the Hoodie of Spark
wear hoodie                      Trial 1: you look like an Engineer
use shortcut                     the Shortcut takes you straight back to the Village Square
```

**Fortress (60 pts)**

```
e
e
n
say trial                   +10  the guard accepts the SKU
n
n
say select *                +25  the Duke throws you in the Moat of T-SQL and you wash up at the drawbridge — Trial 2: you smell like a Warehouse
n
e
look at lookup
wait
wait                        +10  the Lookup Activity blinks first
get cable
use cable on copy activity  +15  the Copy Activity produces the Bursting Boots
wear boots                       no more interactive delay on the Peaks
```

**Peaks (20 pts)**

```
w
s
s
e
n
n                           +5   the Shrine door opens for the Worthy Three
say star schema             +10  Throttlor is defeated by good modeling practice
get model                   +5   the Golden Semantic Model. 200/200.
```

</details>

## Deaths (for completeness)

| Where | What you did |
|---|---|
| Anywhere | `die`, `attack me`, `delete workspace`, `rm -rf` / `format c:` / `drop database` |
| Village Square | offered Jeff a paginated report |
| OneLake Shore | tried to `import` the lake into Desktop |
| Bronze Marsh | drank the water |
| Warehouse Fortress Drawbridge | swam / dove into the Moat |
| The Shrine | attacked Throttlor |

All of them are one **Restore** away from undone.
