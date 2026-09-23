# How to play Fabric's Quest

This is the in-depth help page. If you only want the gist, the [README](../README.md#how-to-play) has it in a
table. This page covers the parser's grammar, every command, saving and dying, sound, and the odd corners.

Play at **[fabricquest.pugliabi.com](https://fabricquest.pugliabi.com)**.

## Starting a game

1. The page boots with a **PUGLIA BI presents** splash (click once to start — browsers won't play sound until you
   do). Click again to skip the splash.
2. The title screen asks **ENTER YOUR NAME, PEASANT:** Type a name (up to 40 characters) and press Enter. This is
   the name that goes on the Hall of Fame if you finish.
3. If you played before in this browser, a **Restore …'s game** link appears under the prompt.
4. **VIEW HIGH SCORES** shows the public Hall of Fame (top 25; a score of zero doesn't make the board).
   **ABOUT THE GAME** has the short version of why this exists and links to the code, the blog, the podcast and
   Tommy's profiles.

The title screen plays a looping 8-bit theme; the `SFX` toggle silences it.

The screen is laid out the way Sierra did it in 1987: a white **status bar** with your score, the **scene** of the
room you're in, a **text window** with the narration, and the `>` **prompt** at the bottom. Blue-bordered
message boxes pop over the scene for important moments (points, doors opening, items found); press Enter or
click to dismiss them.

## The parser

The parser understands **verb + noun**, optionally **verb + noun + preposition + noun**. It ignores filler words
(`the`, `a`, `my`, `please`, `thy`), so `get the mug`, `pick up mug` and `grab thy mug` are all `get mug`.
Everything is case-insensitive.

### Movement

| Type | Meaning |
|---|---|
| `n` `s` `e` `w` (or `north`…) | walk that way |
| `u` / `up`, `d` / `down` | climb |
| `out` / `outside` / `leave` / `exit` | leave a building |
| `in` / `inside` / `enter` | go in |
| `go north`, `walk west`, `climb up` | same as the short forms |
| `board boat` (`ride ferry`, `take boat`, `sail`) | ride the ferry, once it's running |

The room description ends with `Exits: …`. Exits can appear and disappear as the story moves.

### Looking and reading

| Type | Meaning |
|---|---|
| `look` / `l` | describe the room again |
| `look at mug` / `examine mug` / `x mug` / `inspect mug` | describe a thing (works on characters too) |
| `read board`, `read scroll`, `read report` | read something written |
| `inventory` / `i` / `inv` | what you're carrying and wearing |
| `score` | score and turn count |
| `help` / `?` | the short in-game command list |
| `goal` / `objective` / `what do i do` | what you're here for; inside a side quest, what that quest wants |
| `hint` / `clue` / `what now` / `stuck` | the room's hint, in a hollow voice — the flask hint without the flask |
| `where` / `where am i` | the room's name, and the narrator's opinion of you for standing in it |
| `why` | the narrator's honest answer, which is that it wishes it knew |

### Doing things

| Type | Meaning |
|---|---|
| `get mug` / `take` / `grab` / `pick up` / `steal` | pick something up |
| `drop mug` / `discard` | put it down (it stays in the room) |
| `wear hoodie` / `put on` / `don` / `equip` | wear something wearable |
| `use pie chart` / `apply` / `put` / `plug` / `insert` | use one thing on another |
| `give mug to jeff` / `offer` / `hand` / `show` | hand something to someone |
| `open door` / `unlock`, `close door` / `shut` | doors and lids |
| `drink water` / `sip` / `taste` | usually a bad idea |
| `attack dragon` / `fight` / `hit` / `kill` / `punch` / `stab` / `slay` | also usually a bad idea |
| `wait` / `z` / `rest` | let a turn pass (some puzzles need this) |
| `publish` (in My Workspace) | asks which workspace; answer `my workspace`. The other answer is a death, and only appears while Publish to web is on |
| `plant seed`, `skip pebble`, `squeeze ball`, `knock` | more ways of using a thing; every room has something small to pick up and one place it earns a line (never points) |

### Talking

| Type | Meaning |
|---|---|
| `talk to miller` / `speak to` / `ask` / `chat` | hear what someone has to say right now |
| `say star schema` / `shout` / `answer` / `tell` / `whisper` | say specific words out loud — the guard, the Duke and the dragon all want to hear something particular |

Some puzzles use `say` with more than two words (`say calculated column`, `say star schema`). The parser passes the
whole phrase through.

### Meta commands

| Type | Meaning |
|---|---|
| `save` | the game already autosaves after every turn; this just says so |
| `restore` | reload the last save (useful after a death) |
| `restart` | new game, same name |
| `quit` | ends the quest early and takes you to the finish screen, where you can post whatever score you have |

## Scoring

There are exactly **200 points**. Each is awarded once for a specific piece of progress — reading the prophecy,
fixing the notebook, out-staring the Card visual, and so on — and the status bar updates immediately. Some
steps have more than one way to complete them; you get the points once either way. `score` shows the count with
your turn total. The complete list is in [the ledger](ledger.md).

Turns count every command, including `look` and `help`. The Hall of Fame records score, turns and elapsed time,
so a tight run is worth something.

## Side quests

Two extra rooms of trouble hide behind ordinary-looking sentences. Type `show me a table` (or, once you're in the
Village Square, `help jeff`) and the screen goes white: you're in **Jeff's Excel**, trying to prove — with Analyze
in Excel and a pivot — that his export is wrong in three specific ways. Type `what are my sales numbers` (or
`ask copilot` and your question, which it answers on the way in) and a sparkle shows up: you're in **Copilot**,
working your way up a ladder of prompts toward one that actually answers the question. Neither quest interrupts the other; typing one realm's trigger while you're
inside the other just gets a joke about pipelines.

Both quests pay a **bonus**, on top of the 200-point score, the moment you solve them — shown in the status bar as
`Score : N of 200 +B` and, separately, in the Hall of Fame. `exit` (or `leave`, `out`, `close`) gets you out of
either one at any point, finished or not, and puts you back where you were; the exits line and `help` in there both
say so, and your progress is remembered if you go back in. `quit` inside a side quest only leaves the side quest —
say it again outside if you really mean to retire. Nothing about a side quest is timed, and neither one can kill
you.

If you get stuck in Copilot, look at what it suggests under its own reply — those `[Copilot suggests: …]` lines
are Copilot telling on itself, and following them up the ladder is the fastest way to the number you're after.

## The Sacristy: tenant settings

Up the spiral stair from the Cloister, the Sacristy keeps the realm's tenant settings — sixteen books across a
tenant shelf and a capacity ledger, named exactly as they are in the Fabric admin portal. Flip them and find out.

| Type | Meaning |
|---|---|
| `settings` / `shelf` | list the tenant settings shelf, with each book's state |
| `capacity settings` / `ledger` | list the capacity ledger |
| `read <book>` | what the setting really does, then what it does here |
| `turn on <book>` / `turn off <book>` (`enable`, `disable`, `toggle`, `flip`) | change one setting |
| `reset settings` / `restore defaults` | put every book back the way you found it |

A book answers to any word in its title (`turn off copilot`, `read export`). Settings change the realm outside the
Sacristy: the Copilot sparkle, Jeff's Excel, the Model Gallery's badge, what `publish` offers in My Workspace, and
more. Two books kill you when you turn them on; those two only answer to their own names, so you can't do it by
accident. Put everything back before you leave and you're paid for the governance.

## The Applied Steps

The Power Query Hall's query is broken, and every doorway in the hall is one of its seven Applied Steps.
`look at steps` (or `look at query`) lists them: open, waiting, yellow. Apply them in order, one command each:

| Step | Command |
|---|---|
| Source | `source` (`get data`) |
| Navigation | `navigate` (`pick table`) |
| Promoted Headers | `promote headers` (`use first row as headers`) |
| Changed Type | `change type` (`detect type`) |
| Filtered Rows | `filter rows` |
| Removed Other Columns | `remove other columns` |
| Renamed Columns | `rename columns` |

Out of order, you get the real Power Query error, and every step after the last good one turns yellow. Apply
Changed Type again and Power Query adds another one — `Changed Type1`, `Changed Type2` — as it always will.

## Saving, leaving, and getting on the board

Two different things are going on, and it's worth knowing which is which:

- **Your progress** is autosaved to this browser after every turn. Close the tab, come back tomorrow, click
  **Restore …'s game** on the title screen and you're where you left off. (The browser will ask "leave site?" if
  you close mid-game — that's just a reminder; nothing is lost.)
- **Your score** reaches the public Hall of Fame only from the **finish screen**, by clicking *Submit to Hall of
  Fame*. You get there by finishing the quest, or by typing **`quit`** at any time to retire with the points you
  have. A run you abandon without doing either is never posted.

The board shows the top 25. A score of zero doesn't make it. Runs that used god mode aren't eligible.

## Dying

You will die. Drinking swamp water, importing OneLake into Desktop, swimming the Moat of T-SQL, attacking the
dragon, offering Jeff a paginated report, running `rm -rf`, deleting the workspace — the narrator has a short list
of things it has been waiting for you to try. Death brings up the Sierra card:

- **Restore** — back to the turn before you died. Nothing lost.
- **Restart** — new game.
- **Quit** — back to the title.

The game saves to your browser's local storage after every turn, and deliberately does *not* overwrite that save
with the turn that killed you, so Restore always works.

Some things are worse than death. Push the Duke, the Card or Jeff too far and you are cursed — a calculated
column, (Blank), or Jeff — and the status bar says so until you find the undo. No curse can lock you out of the
win. The [ledger](ledger.md#curses-worse-than-death) has every death and every curse, with the cure.

## Sound

Chiptune sound effects are synthesized in the browser — nothing is downloaded. There's a cue for the splash, the
title, moves, successful actions, found items, failures, snark, doors, deaths, the victory fanfare, and the flask.
The `♪ on/off` toggle in the status bar (and `SFX ON/OFF` on the title screen) mutes everything; the setting is
remembered.

## When you're stuck

- **`get ye flask`** — works in every room. You won't get a flask. You *will* get a nudge that names the next thing
  to do in this room, and it changes as you make progress. It's the game's hint system, disguised as a joke.
- `look` again. Room descriptions change as flags flip; things you couldn't see before may be visible now.
- `talk to` everyone twice. NPCs say different things once you've done something for them.
- Check `inventory` — you start with something useful already in your pocket.
- **`hint`** — the same nudge as the flask, without the flask. **`goal`** reminds you what you're here for.
- The [README hints](../README.md#hints) are spoiler-light; the [cheat sheet](cheat-sheet.md) and the
  [room guide](room-guide.md) are the next step up; the [ledger](ledger.md) is the full walkthrough.

You don't always have to ask. After four dead turns in one room — commands that fail or only get snark — the
narrator whispers, sideways: a line about what the prophecy wanted and where that sort of thing lives. Keep
failing and it gets plainer; keep going after that and it just tells you the room's hint. A hint you ask for resets
the count.

## The narrator talks back

Shout a command (`get ye flask!`) and the narrator has something to say about the volume. Repeat a command that
didn't work — same room, same words — and it notices, and keeps noticing. Type the sort of thing people type
into text adventures when nobody is watching and the realm has a policy about that, adjusted for where you are
standing. Most "that doesn't work" answers rotate rather than repeat.

### Wrappers

You don't have to type the bare verb-noun. Dress a command up and the parser strips the dressing, runs the
command underneath, and the narrator comments on the dressing:

- **Wanting it politely** — `i want to get mug`, `could i get mug`, `let me get mug`, `how do i get mug` — runs
  `get mug` and adds a line about wanting not being doing (*"Wanting is noted. Doing is a verb."*).
- **Insisting you already said it** — `i said get mug`, `again, get mug`, `get mug already` — runs `get mug` and
  adds a line about the realm having heard you the first time.
- **Getting frustrated** — `ugh, get mug`, `get mug, dammit`, `get mug now` — runs `get mug` and adds a line
  acknowledging the heat, with a wink (*"The dragon is not fed by tone."*).

Wrappers stack with shouting and with repeats — `I SAID GET MUG!` for the third time in a row gets its own line
about that being a support ticket now — and they work everywhere, including inside both side quests (Copilot logs
a frustrated prompt as feedback and answers the question underneath anyway).

## Things the narrator has opinions about

Typing the following is safe (mostly) and rewarded with commentary: `export to excel`, `ask the ai`, `refresh`,
`calculate`, `sudo`, `xyzzy`, `dance`, `sing`, `pray`, `cheat`, `win`, `undo`, `thanks`. There are around sixty of
these. Finding them is its own side quest.

## Privacy note

Every command you type is stored, along with the room you were in and the game's reply, in the app's database in
Microsoft Fabric — that's the point of the demo. Your name is whatever you typed at the title screen. A random
client id is kept in your browser so your quests can be told apart; nothing else about you is collected.
