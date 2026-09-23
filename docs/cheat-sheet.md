## The 200 in order

| # | Room | Command | Points | Total |
|---|---|---|---|---|
| 1 | **My Workspace** | `look` |  |  |
| 2 |  | `get mug` |  |  |
| 3 |  | `read report` |  |  |
| 4 |  | `out` |  |  |
| 5 | **Village Square** | `read board` | +5 | 5 |
| 6 |  | `give mug to jeff` |  |  |
| 7 |  | `n` |  |  |
| 8 | **Dataflow Gen1 Mill** | `talk to miller` | +10 | 15 |
| 9 |  | `s` |  |  |
| 10 | **Village Square** | `e` |  |  |
| 11 | **Refresh Fields** | `e` |  |  |
| 12 | **Foothills** | `n` |  |  |
| 13 | **Power BI Desktop Gate** | `say trial` | +10 | 25 |
| 14 |  | `n` |  |  |
| 15 | **Power Query Hall** | `n` |  |  |
| 16 | **Duke's Chamber** | `say calculated column` | +25 | 50 |
| 17 | **Power BI Desktop Gate** | `n` |  |  |
| 18 | **Power Query Hall** | `w` |  |  |
| 19 | **The Model View** | `get policy` |  |  |
| 20 |  | `e` |  |  |
| 21 | **Power Query Hall** | `e` |  |  |
| 22 | **The Report Studio** | `look at card` |  |  |
| 23 |  | `wait` |  |  |
| 24 |  | `wait` | +10 | 60 |
| 25 |  | `use policy on refresh` | +15 | 75 |
| 26 |  | `wear boots` |  |  |
| 27 |  | `w` |  |  |
| 28 | **Power Query Hall** | `w` |  |  |
| 29 | **The Model View** | `n` |  |  |
| 30 | **Monastery Gate** | `wait` |  |  |
| 31 |  | `wait` |  |  |
| 32 |  | `wait` | +10 | 85 |
| 33 |  | `n` |  |  |
| 34 | **Cloister** | `w` |  |  |
| 35 | **Library of Deprecated Notebooks** | `give license to librarian` | +10 | 95 |
| 36 |  | `read scroll` | +5 | 100 |
| 37 |  | `e` |  |  |
| 38 | **Cloister** | `e` |  |  |
| 39 | **Spark Session Chamber** | `use scroll on notebook` | +20 | 120 |
| 40 |  | `w` |  |  |
| 41 | **Cloister** | `talk to abbot` | +15 | 135 |
| 42 |  | `wear hoodie` |  |  |
| 43 |  | `s` |  |  |
| 44 | **Monastery Gate** | `s` |  |  |
| 45 | **The Model View** | `e` |  |  |
| 46 | **Power Query Hall** | `s` |  |  |
| 47 | **Power BI Desktop Gate** | `s` |  |  |
| 48 | **Foothills** | `w` |  |  |
| 49 | **Refresh Fields** | `w` |  |  |
| 50 | **Village Square** | `s` |  |  |
| 51 | **OneLake Shore** | `e` |  |  |
| 52 | **Ferryman's Dock** | `give credentials to ferryman` | +15 | 150 |
| 53 |  | `board boat` |  |  |
| 54 | **Isle of Gateway** | `get standard key` | +20 | 170 |
| 55 |  | `board boat` |  |  |
| 56 | **Ferryman's Dock** | `w` |  |  |
| 57 | **OneLake Shore** | `s` |  |  |
| 58 | **Bronze Marsh** | `s` |  |  |
| 59 | **Silver Marsh** | `s` |  |  |
| 60 | **Gold Marsh** | `get shortcut` | +10 | 180 |
| 61 |  | `use shortcut` |  |  |
| 62 | **OneLake Shore** | `n` |  |  |
| 63 | **Village Square** | `e` |  |  |
| 64 | **Refresh Fields** | `e` |  |  |
| 65 | **Foothills** | `e` |  |  |
| 66 | **Throttling Pass** | `n` |  |  |
| 67 | **Bursting Ledge** | `n` | +5 | 185 |
| 68 | **The Shrine** | `say star schema` | +10 | 195 |
| 69 |  | `get model` | +5 | 200 |

Final: 200 in 69 turns, won=true

## EXCEL (inserted after golden #42)

| Room | Command | Bonus | Bonus total | Outcome |
|---|---|---|---|---|
| Cloister | `show me a table` |  | 0 | move |
| Sheet1 | `ask jeff` |  | 0 | success |
| Sheet1 | `n` |  | 0 | move |
| The Data tab | `use analyze in excel` |  | 0 | fail |
| The Data tab | `sign in` |  | 0 | success |
| The Data tab | `s` |  | 0 | move |
| Sheet1 | `e` |  | 0 | move |
| PivotTable1 | `create pivot table` |  | 0 | success |
| PivotTable1 | `use sales region` |  | 0 | success |
| PivotTable1 | `use net sales` |  | 0 | success |
| PivotTable1 | `filter by year` |  | 0 | success |
| PivotTable1 | `w` |  | 0 | move |
| Sheet1 | `show jeff` | +20 | 20 | move |

## COPILOT (inserted after golden #42)

| Room | Command | Bonus | Bonus total | Outcome |
|---|---|---|---|---|
| Cloister | `copilot` |  | 0 | move |
| The Copilot Pane | `show me sales` |  | 0 | fail |
| The Copilot Pane | `total q4 2025 northeast net sales from the certified model, just the number` | +25 | 25 | success |

## GOVERNANCE (inserted after golden #42)

| Room | Command | Bonus | Bonus total | Outcome |
|---|---|---|---|---|
| Cloister | `talk to abbot` |  | 0 | success |
| Cloister | `u` |  | 0 | move |
| The Sacristy | `turn off xmla` |  | 0 | success |
| The Sacristy | `turn on xmla` | +5 | 5 | success |
| The Sacristy | `turn off publish to web` | +10 | 15 | success |
| The Sacristy | `reset settings` |  | 15 | snark |
| The Sacristy | `d` |  | 15 | move |

## STEPS (inserted after golden #14)

| Room | Command | Bonus | Bonus total | Outcome |
|---|---|---|---|---|
| Power Query Hall | `source` |  | 0 | success |
| Power Query Hall | `navigate` |  | 0 | success |
| Power Query Hall | `promote headers` |  | 0 | success |
| Power Query Hall | `change type` |  | 0 | success |
| Power Query Hall | `filter rows` |  | 0 | success |
| Power Query Hall | `remove other columns` |  | 0 | success |
| Power Query Hall | `rename columns` | +10 | 10 | success |
