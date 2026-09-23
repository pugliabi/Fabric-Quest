# Fabric's Quest

**Play it now: [fabricquest.pugliabi.com](https://fabricquest.pugliabi.com)**

A Sierra-style text adventure set in a fantasy version of Microsoft Fabric. You are a humble Report Builder
from the Village of Pro. The Golden Semantic Model has gone missing, Throttlor the Capacity Dragon is
throttling the nightly refreshes, and Jeff from Finance would still like an Excel export, whenever you get a sec.

```
                         ┌──────────────────────────────────────────────┐
                         │ Score : 0 of 200              Fabric's Quest │
                         ├──────────────────────────────────────────────┤
                         │    [ 8-bit scene of My Workspace here ]      │
                         ├──────────────────────────────────────────────┤
                         │ MY WORKSPACE                                 │
                         │ Your cottage. My Workspace, officially.      │
                         │ Nobody else can see in. One desk, one candle,│
                         │ one report 'about to finish' since spring.   │
                         │ You see: mug.   Exits: out, e.               │
                         │                                              │
                         │ > get ye flask_                              │
                         └──────────────────────────────────────────────┘
```

## What this is

Fabric's Quest is a **parser adventure** — the kind of game where you type two-word commands (`look`, `get mug`,
`talk to miller`, `give credentials to ferryman`) and a narrator tells you what happened, usually with an opinion
about it. It's a tribute to the Sierra AGI games of the 1980s and, more specifically, an ode to *Peasant's Quest*
from Homestar Runner: white status bar on top, one 4:3 scene, a `>` prompt underneath, no hand-holding, and a
narrator who will happily let you die for typing the wrong thing. All the characters, art and jokes here are
original; the tone is borrowed with love.

It was built for two reasons:

1. **It's fun.** Fabric has enough lore — OneLake, Lakehouses, Spark sessions that take forever to start, the
   Moat of T-SQL, capacity throttling, "just export it to Excel" — that it deserved a dragon.
2. **It's a working example of a [Fabric App](https://learn.microsoft.com/fabric/).** The game is a Fabric App
   built with the Rayfin SDK and deployed to a Fabric workspace. Every command every player types is written to
   the app's SQL database in Fabric — quest id, sequence number, room, raw input, parsed verb/noun, outcome,
   the narrator's reply, and the score/turns/flags afterward — and the Hall of Fame reads back from it. That
   data is immediately available to a Lakehouse, a semantic model and a Power BI report. It's a small, silly,
   end-to-end demonstration of what a Fabric App can do: public frontend, anonymous writes, real data.

Where it runs:

- **[fabricquest.pugliabi.com](https://fabricquest.pugliabi.com)** — the public address. This is a static mirror
  on GitHub Pages that talks to the Fabric App's API for scores and telemetry. It loads instantly whatever mood the
  capacity is in.
- **The Fabric App itself** — hosted by Fabric at
  [early-coast-531f268ca6-centralus.webapp.fabricapps.net](https://early-coast-531f268ca6-centralus.webapp.fabricapps.net),
  also public. Same build, same database. Both are deployed from this repository on every push, so they never drift.

## The quest

You must find the Golden Semantic Model. The prophecy on the village notice board says the Shrine door on the
Peaks opens only for the **Worthy Three** — *Look like an Engineer. Smell like a Warehouse. Hold the Gateway Key.*
That means three trials, in any order:

- **The Hoodie of Spark** — earned at the Monastery of Data Engineering, if you can outwait a Spark session and fix
  Brother Pandas' notebook.
- **The Moat of T-SQL** — the Duke of DAX, holding court in the Semantic Model Keep, throws people in it for
  saying the wrong thing. You will need to say the wrong thing on purpose.
- **The Gateway Key** — the Ferryman on OneLake has it, but the Ferryman has been offline since the Gen1 credentials
  expired.

Then it's up the Peaks, past the interactive delay, to Throttlor. Bring a star schema.

Two side quests hide in the realm: type `show me a table` and you're in Jeff's Excel, trying to make his export
match the report; type `what are my sales numbers` and you're arguing with Copilot. Both pay bonus points on top
of the 200. Both can be left with `exit`. Three more bonuses sit in the main map: the seven Applied Steps in the
Power Query Hall, the Abbot's errand, and putting the tenant settings back the way you found them.

Up the spiral stair from the Cloister is the **Sacristy**: sixteen books, a tenant settings shelf and a capacity
ledger. They are real tenant settings — the same names you'd find in the Fabric admin portal — and each one does
something to the realm. Flip them and find out. Two of them kill you. Up the steps from the Village Square, the
Town Hall's Clerk will tell you where the admins are, if you keep talking.

West of the OneLake Shore, there's also a house. On a lake. It's called the Lake House. That's the whole joke;
there are no points in it.

31 rooms · 134 items · 15 characters · 200 points + 70 bonus · a respectable number of ways to die.

## How to play

1. Open [fabricquest.pugliabi.com](https://fabricquest.pugliabi.com), click to boot, and enter your name at the prompt.
2. Type commands at the `>` prompt. **Two words, peasant.** Verb first, then the thing:

   | You want to… | Type |
   |---|---|
   | See where you are | `look` (or `l`) |
   | Examine something | `look at mug`, `x board` |
   | Move | `n` `s` `e` `w` `up` `down` `out` `in` |
   | Pick up / drop | `get mug`, `drop mug` |
   | Talk | `talk to miller` |
   | Say something specific | `say star schema` |
   | Hand something over | `give mug to jeff` |
   | Use one thing on another | `use policy on refresh` |
   | Read, wear, open, board, wait | `read board`, `wear hoodie`, `open door`, `board boat`, `wait` |
   | Check yourself | `inventory` (or `i`), `score` |
   | Save / restore / restart | `save`, `restore`, `restart` |
   | Get the command list in-game | `help` |

   Synonyms are understood (`take`/`grab`/`pick up`, `examine`/`inspect`, `speak to`/`ask`, `equip`/`put on`…).
3. Points are awarded for progress, once each, out of **200**. The status bar keeps count.
4. When you die — you will — the Sierra death card offers **Restore**, **Restart** or **Quit**. The game autosaves
   after every turn to your browser, so restoring costs you nothing but dignity.
5. Finish — or type `quit` to retire early — and you can submit your name, score, turn count and time to the
   public **Hall of Fame** (top 25), plus any side-quest bonus you picked up along the way. Your progress
   autosaves as you play; your *score* (and bonus) is posted only from that finish screen.

Sound is on by default (chiptune cues for moves, items, doors, deaths and the victory fanfare). The `♪` toggle in
the status bar mutes it.

## Hints

Spoiler-light, in rough order of "how stuck are you":

- **Read everything and talk to everyone.** Every notice board, scroll and NPC is there for a reason, and the
  narrator drops hints in the flavor text.
- **`get ye flask` works in every room.** It won't give you a flask. It will tell you what you're missing here.
- The village has three things you need before you leave it. One of them is in My Workspace.
- Jeff from Finance will not stop asking. Giving him *something* makes the square quieter.
- The Keep is east, past the fields; the monks are behind it. At the gate, the guard wants a SKU. The cheapest
  one gets you in.
- In the Duke's chamber, say the modeling shortcut every DAX purist hates. It gets you exactly where you need
  to go, which is the Moat.
- The Report Studio has a Card that needs out-staring, and a Big Refresh that wants a policy — the Model View,
  west of the hall, keeps one on a lectern.
- The Ferryman is offline for a boring, real-world reason. The Mill knows more.
- At the Monastery, waiting is sometimes the correct answer. So is having a library card.
- Throttlor wants one thing said to his face. It's the same thing every Power BI consultant wants said.
- The Town Hall, up from the Square, has no points in it. Keep talking to the Clerk anyway: it's how you find
  out where the admins are.
- The Sacristy, up from the Cloister, is the tenant settings. `settings` reads the shelf, `read` any book to see
  what it does, `turn off` the one the Abbot asked about. Put everything back before you leave and the realm pays
  you for it.
- The Power Query Hall's query is broken at a step. `look at steps`, then apply them in order, one command each,
  the way the Applied Steps pane lists them.
- Don't drink the water in the swamp. Don't import the lake. Don't swim the moat. The narrator did warn you.

The full spoiler walkthrough and every point in the 200-point ledger are in [docs/ledger.md](docs/ledger.md).
A longer command reference with the parser's quirks is in [docs/how-to-play.md](docs/how-to-play.md).

## About the data (for the Fabric-curious)

Three tables live in the app's Fabric SQL database:

| Table | One row per… | Notes |
|---|---|---|
| `Quests` | game started | player name, browser client id, user agent, world version, start time |
| `Activities` | command typed | quest id, sequence, room, raw input, verb/noun, rule id, outcome, narrator output, points awarded, score/turns/flags after |
| `HallOfFames` | game finished and submitted | player name, score, bonus, turns, elapsed seconds |

Players write anonymously and can read only the Hall of Fame columns; everything else needs a signed-in Fabric
identity. Point a Lakehouse shortcut at the database and the play data is yours to model.

## Running it yourself

```bash
git clone https://github.com/pugliabi/Fabric-Quest.git
cd Fabric-Quest
npm install
npm run dev:frontend      # play locally at http://localhost:5173 — telemetry goes to the console
npm test                  # engine + world tests
```

To deploy your own copy to a Fabric workspace, publish the static mirror, add rooms and puzzles, or query the data,
see **[docs/building-and-deploying.md](docs/building-and-deploying.md)**.

## Documentation

- [How to play](docs/how-to-play.md) — full command reference, the parser's grammar, saving, sound, the death card
- [The ledger](docs/ledger.md) — all 200 points and the 70 bonus, a complete spoiler walkthrough, every death
  and curse
- [The cheat sheet](docs/cheat-sheet.md) — one page of every command worth typing
- [The room guide](docs/room-guide.md) — all 31 rooms, what's in each, and how to get there
- [Building & deploying](docs/building-and-deploying.md) — local dev, deploying to Fabric, the GitHub Pages mirror,
  configuration, extending the world, troubleshooting

## Credits

Written and built by [Puglia BI](https://pugliabi.com). A tribute to the parser adventures of the 1980s and to
*Peasant's Quest*; no assets from any existing game. Original characters and art. © 2026.
