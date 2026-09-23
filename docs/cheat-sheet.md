# The cheat sheet

The whole game, spoilers everywhere. [The ledger](ledger.md) is the points authority; this is the map of what to
type. For everything else each room answers to (gags, easter eggs, deaths, curses, what every NPC says), see
[the room guide](room-guide.md). Section 1 is replayed through the engine by
`npx tsx scripts/cheat-sheet.ts --gameplay`, so the points and totals below are what the game actually pays, not a
hand count.

## 1. The 200 in order

One command per line, grouped by room (the room is named on the first command typed there), with the points each
command earns and the running total after it. This is `tests/golden-path.json`: 200 points in 69 turns.

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
| 16 | **Duke's Chamber** | `say calculated column` (you are thrown into the moat and land at the Gate) | +25 | 50 |
| 17 | **Power BI Desktop Gate** | `n` |  |  |
| 18 | **Power Query Hall** | `w` |  |  |
| 19 | **The Model View** | `get policy` |  |  |
| 20 |  | `e` |  |  |
| 21 | **Power Query Hall** | `e` |  |  |
| 22 | **The Report Studio** | `look at card` |  |  |
| 23 |  | `wait` |  |  |
| 24 |  | `wait` (you out-stare the Card) | +10 | 60 |
| 25 |  | `use policy on refresh` | +15 | 75 |
| 26 |  | `wear boots` |  |  |
| 27 |  | `w` |  |  |
| 28 | **Power Query Hall** | `w` |  |  |
| 29 | **The Model View** | `n` |  |  |
| 30 | **Monastery Gate** | `wait` |  |  |
| 31 |  | `wait` |  |  |
| 32 |  | `wait` (the gate opens) | +10 | 85 |
| 33 |  | `n` |  |  |
| 34 | **Cloister** | `w` |  |  |
| 35 | **Library of Deprecated Notebooks** | `give license to librarian` | +10 | 95 |
| 36 |  | `read scroll` | +5 | 100 |
| 37 |  | `e` |  |  |
| 38 | **Cloister** | `e` |  |  |
| 39 | **Spark Session Chamber** | `use scroll on notebook` | +20 | 120 |
| 40 |  | `w` |  |  |
| 41 | **Cloister** | `talk to abbot` (the Hoodie of Spark) | +15 | 135 |
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
| 61 |  | `use shortcut` (back to the Shore) |  |  |
| 62 | **OneLake Shore** | `n` |  |  |
| 63 | **Village Square** | `e` |  |  |
| 64 | **Refresh Fields** | `e` |  |  |
| 65 | **Foothills** | `e` |  |  |
| 66 | **Throttling Pass** | `n` |  |  |
| 67 | **Bursting Ledge** | `n` (the door opens for the Worthy Three: hoodie, moat, key) | +5 | 185 |
| 68 | **The Shrine** | `say star schema` | +10 | 195 |
| 69 |  | `get model` (the win) | +5 | **200** |

### The side quests and the other bonuses (70)

None of these count toward the 200; they are bonus points, kept separately. Each sequence below is replayed from the
tests (`tests/golden-plus-sidequests.test.ts`, `tests/golden-plus-governance.test.ts`), and each can be slotted into
the 200 without breaking it.

**Jeff's Excel, +20.** Start anywhere outside a side realm (the tests start it at the beginning, right after the
hoodie, back in the village and in the Shrine):

| Command | What happens |
|---|---|
| `show me a table` | You are pulled into Jeff's Excel, on Sheet1. |
| `ask jeff` | Jeff's goal: a pivot of Net Sales by Sales Region, filtered by year. |
| `n` | The Data tab. |
| `use analyze in excel` | Sign-in required. |
| `sign in` | Connected to Sales (Certified) with your Pro license (it works even while the Librarian holds the card). |
| `s` · `e` | Back through Sheet1 to PivotTable1. |
| `create pivot table` · `use sales region` · `use net sales` · `filter by year` | The three fields. |
| `w` · `show jeff` | **+20**, and you are sent back to where you came in from. |

**Copilot, +25.** Start anywhere outside a side realm:

| Command | What happens |
|---|---|
| `copilot` | The Copilot Pane. |
| `show me sales` | Too vague; Copilot starts asking (model, measure, region, quarter, shape). |
| `total q4 2025 northeast net sales from the certified model, just the number` | **+25.** One line that fills every slot. Slot by slot also works: `use the certified model` · `net sales` · `for the northeast` · `q4 2025` · `just the total`. The Model Gallery (`e`) has the names. |

**Applied Steps, +10.** In Power Query Hall (after `say trial`, `n`), rebuild the query in order:

`source` · `navigate` · `promote headers` · `change type` · `filter rows` · `remove other columns` · `rename columns` (**+10**)

**The Abbot's errand, +10, and governance restored, +5.** After the hoodie, in the Cloister:

| Command | Bonus |
|---|---|
| `talk to abbot` | You take the errand: turn off Publish to web. |
| `u` | The Sacristy. |
| `turn off xmla` · `turn on xmla` | **+5**, governance restored (you changed a setting and put it back; `reset settings` after a change also pays it). |
| `turn off publish to web` | **+10**, the errand. Or turn it off first, then `talk to abbot`. |
| `d` | Back to the Cloister. |

All of them: 200 + 20 + 25 + 10 + 10 + 5 = 200 + 70.

## 2. Room by room: what you need and where it comes from

All 31 rooms, in the order you meet them. "Bring" names the thing and the room that gives it; "Leave with" is what
the room hands you (items, or the flag the prophecy checks). You start with your Pro license (the card) in your
pocket.

| Room | What you must do here | Bring (from) | Leave with | The exact words |
|---|---|---|---|---|
| My Workspace | Take the mug. | — | mug | `get mug`, `out`. `read report` for the setup. `publish` publishes to yourself; while Publish to web is on in the Sacristy, publishing to the internet is ☠. |
| Village Square | Read the prophecy (+5); quiet Jeff. | mug (My Workspace) | — | `read board`, `give mug to jeff`. `n` Mill, `e` Refresh Fields, `s` OneLake Shore, `u` Town Hall, `in` My Workspace. `show me a table` starts Jeff's Excel. |
| Town Hall | Nothing scores. The Clerk says where the admins are. | ticket (here) | — | `talk to clerk` ×4, `get ticket`, `give ticket to clerk`. Everything is an admin setting. `d` back to the square. |
| Dataflow Gen1 Mill | Get the Gen1 credentials (+10). | — | credentials | `talk to miller` (or `open chest`, `get credentials`). |
| Refresh Fields | Pass through, east to the Foothills. | — | — | Never `refresh` here (☠). |
| Foothills | The crossroads: north to the Keep, east up the Peaks. | — | — | `n` Power BI Desktop Gate; `e` Throttling Pass. |
| Power BI Desktop Gate | Name a SKU the guard accepts (+10). | — | bridge down | The guard wants a SKU; the free one is the trial: `say trial`, then `n`. Don't `swim moat` (☠). |
| Power Query Hall | Pass through. Optional: rebuild the query in order (+10 bonus). | — | — | `source` · `navigate` · `promote headers` · `change type` · `filter rows` · `remove other columns` · `rename columns`. `look at steps`. `n` Duke, `w` Model View, `e` Report Studio. Don't type DAX into the M editor (☠). |
| Duke's Chamber | Say the sin every DAX lord despises (+25): you are thrown into the Moat of T-SQL and land at the Gate. | — | Trial 2: you smell like a Warehouse (`trial.moat`) | `say calculated column`. `say select *` only gets you corrected; three wrong answers and you are a column (curse). |
| The Model View | Take the policy. North is the back gate to the Monastery. | — | policy | `get policy`, `n`. Don't turn on bidirectional filtering (☠). |
| The Report Studio | Out-stare the Card (+10); give the Big Refresh the policy (+15). | policy (Model View) | boots (wear them) | `look at card` · `wait` · `wait`; `use policy on refresh`; `wear boots`. Don't `open other page` (☠). Don't stare past six (the Blank curse). |
| Monastery Gate | Wait out the Spark session (+10). | — | gate open | `wait` ×3, then `n`. |
| Cloister | Get the Hoodie of Spark (+15) once the notebook runs; optional errand. | notebook fixed (Spark Session Chamber) | hoodie (wear it: Trial 1) | `talk to abbot`, `wear hoodie`. `talk to abbot` again for the errand (+10 bonus). `w` Library, `e` Spark Chamber, `u` Sacristy, `s` Gate. |
| Library of Deprecated Notebooks | Trade your license for the PySpark scroll (+10); read it (+5). | license (you start with it) | scroll | `give license to librarian`, `read scroll`. |
| Spark Session Chamber | Fix Brother Pandas' notebook (+20). | scroll (Library) | notebook fixed | `use scroll on notebook` (or `give scroll to pandas`). |
| The Sacristy | Optional: flip tenant and capacity settings; put them back (+5); turn off Publish to web for the Abbot (+10). | — | — | `settings`, `read <book>`, `turn off <book>`, `turn on <book>`, `reset settings`. `turn on block public internet` and `pause capacity` are ☠. `d` back. |
| OneLake Shore | The lake crossroads. | — | — | `e` Ferryman's Dock, `s` the marshes, `w` The Lake House, `n` the square. Don't `import the lake` (☠). |
| Ferryman's Dock | Bring the Ferryman online (+15). | credentials (Mill) | ferry online | `give credentials to ferryman`, `board boat`. |
| Isle of Gateway | Take the standard key (+20), not the personal one. | — | standard key (Trial 3) | `get standard key`, `board boat`. |
| The Lake House | Nothing; the room is the joke. | — | — | `e` back to the Shore. |
| Bronze Marsh | Pass through south. Drink nothing. | — | — | `s`. `drink` is ☠. |
| Silver Marsh | Pass through south. | — | — | `s`. |
| Gold Marsh | Take the shortcut (+10); it takes you home. | — | shortcut | `get shortcut`, `use shortcut` (back to the Shore, from anywhere). |
| Throttling Pass | Pass through north (boots help). | boots (Report Studio) | — | `n`. Don't drink the CapacityAde (☠). |
| Bursting Ledge | The door opens for the Worthy Three (+5). | hoodie worn (Cloister), the moat smell (Duke's Chamber), standard key (Isle of Gateway) | Shrine open | `n` (or `open door`). |
| The Shrine | Answer the dragon (+10); take the model (+5, the win). | — | the Golden Semantic Model | `say star schema`, `get model`. `attack dragon` is ☠. |
| Sheet1 (Jeff's Excel) | Get Jeff's goal; show him the pivot (+20 bonus). | the finished pivot (PivotTable1) | — | `ask jeff`, later `show jeff`. `n` Data tab, `e` PivotTable1, `out` leaves. |
| The Data tab (Jeff's Excel) | Connect to the certified model. | your license (or its library receipt) | a connection | `use analyze in excel`, `sign in`. `s` Sheet1. |
| PivotTable1 (Jeff's Excel) | Build the pivot. | the connection (Data tab) | a finished pivot | `create pivot table`, `use sales region`, `use net sales`, `filter by year`. `w` Sheet1. |
| The Copilot Pane | Get Copilot to one number (+25 bonus). | the names (Model Gallery) | — | `total q4 2025 northeast net sales from the certified model, just the number`, or one slot at a time. `e` Gallery, `out` leaves. |
| The Model Gallery | Read the certified model's name and measures. | — | the words Copilot wants | `look at certified`. `w` back to the Pane. |
