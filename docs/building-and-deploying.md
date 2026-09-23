# Building, deploying and extending Fabric's Quest

For anyone who wants to run the game locally, deploy their own copy as a Fabric App, publish the GitHub Pages
mirror, add rooms and puzzles, or get at the play data. Player-facing help is in [how-to-play.md](how-to-play.md).

## Prerequisites

- **Node.js 22** and npm (the CI uses 22; 20 works).
- A **Microsoft Fabric** tenant with a capacity, and a workspace to deploy into — only for deployment. Local play
  needs nothing else.
- Two Fabric tenant settings, on, for the public/anonymous version: **Fabric App Items (preview)** and
  **Anonymous data access for Fabric Apps (preview)**.
- Optional: Docker, if you want `rayfin dev` to run the backend locally; Chromium for the Playwright smoke tests.

## Quick start (local, offline)

```bash
git clone https://github.com/pugliabi/Fabric-Quest.git
cd Fabric-Quest
npm install
npm run dev:frontend
```

Open http://localhost:5173. With no backend configured the game runs fully offline: telemetry is printed to the
browser console and the finish screen says the Hall of Fame is offline. This is the fastest loop for writing
rooms and puzzles.

### All the scripts

| Command | What it does |
|---|---|
| `npm run dev:frontend` | Vite dev server, game only, no backend needed |
| `npm run dev` | `rayfin dev` — full local stack with the data API (needs Docker) |
| `npm test` | vitest: parser, engine, deaths, god mode, world lint, and the golden path (asserts 200/200) |
| `npm run lint:world` | checks for dangling exits, unknown items/NPCs in rooms, rules pointing at missing rooms |
| `npm run replay -- tests/golden-path.json` | plays the full walkthrough in the terminal and prints every reply |
| `npm run e2e` | Playwright smoke test (set `CHROMIUM_PATH` if Playwright can't find a browser) |
| `npm run build` | production build into `dist/` (used by `rayfin up`) |
| `npm run build:pages` | same build with `.env.pages` baked in — what GitHub Pages serves |

## How the project is put together

```
src/engine/    parser.ts (two-word grammar + synonyms) · step.ts (pure: step(state, input, world))
               builtins.ts (look/get/go/…) · snark.ts (seeded "I don't understand" rotation) · god.ts
src/world/     the content: one file per region (village, lake, monastery, fortress, peaks) + items, npcs, globals
               excel.ts / copilot.ts (the side quests' rooms) · copilot-ladder.ts (the prompt ladder, pure)
               sidequests.ts (shared entry/exit machinery) · keep-items.ts (the Semantic Model Keep's objects)
src/game/      recorder.ts (telemetry queue → Fabric) · save.ts (localStorage) · sfx.ts (Web Audio chiptunes)
src/scenes/    the 8-bit scenes, drawn in SVG with a tiny kit (EGA palette, 4:3, stretched like a CRT)
src/ui/        SplashScreen · TitleScreen · PlayScreen · ScenePanel · MessageBox · DeathCard · FinishScreen
rayfin/        rayfin.yml (app config) · data/*.ts (the three entities and their permissions)
tests/         vitest suites + golden-path.json (the canonical 69-command, 200-point run)
docs/          this folder, plus docs/superpowers (the original design spec and build plan)
.github/       pages.yml (GitHub Pages mirror) · deploy-to-fabric.yml (Fabric App deploy)
```

The engine is a pure function: `step(state, input, world)` returns the new state, the narrator's lines, an
outcome (`move | success | fail | snark | death | meta | win`), the id of the rule that fired, and the points
awarded. Nothing in `src/engine` or `src/world` touches the DOM or the network, which is why the whole game can be
replayed in the terminal and unit-tested in milliseconds.

## Deploying to Fabric

The game is a Fabric App built with the **Rayfin** SDK (`@microsoft/rayfin-*` 1.35). `rayfin/rayfin.yml` declares
the app (`fabrics-quest`), turns on Fabric auth and the SQL data service, and enables static hosting with
`assetAccess: public` so nobody needs to sign in to play.

### Interactive (your own account)

```bash
npx rayfin login
npx rayfin up --workspace "FabricQuest" --dry-run      # shows what will happen
npx rayfin up --workspace "FabricQuest" --yes          # creates/reuses the item, applies the schema, deploys dist/
npx rayfin up status                                   # prints the hosting URL and publishable key
```

Change `"FabricQuest"` to your workspace name. The first run creates an **AppBackend** item plus its SQL database
and SQL endpoint in the workspace; later runs find the item by name and update it. After a frontend-only change
you can use `npx rayfin up staticapp deploy` to skip the schema step.

### Service principal / CI

`.github/workflows/deploy-to-fabric.yml` deploys on every push to `main` that touches app code, and can be run by
hand from the Actions tab (with a **force** option for destructive schema changes). It needs three repository
secrets — **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|---|---|
| `TENANT_ID` | your Entra tenant id |
| `CLIENT_ID` | the service principal's application (client) id |
| `CLIENT_SECRET` | its client secret |

The service principal needs Contributor (or better) on the workspace, and the tenant setting that allows service
principals to use Fabric APIs. The workflow signs in with
`rayfin login --service-principal -t … -u … -p … --encryption-fallback-enabled` and then runs the same `rayfin up`.

### The public mirror (GitHub Pages)

The same build is published to **GitHub Pages** at [fabricquest.pugliabi.com](https://fabricquest.pugliabi.com).
The page is plain static files; scores and telemetry still go to the Fabric App's API, which answers anonymous
requests with `Access-Control-Allow-Origin: *`. Why both? Fabric static hosting sits behind the capacity, and a
small capacity that has been throttled can take 20+ seconds to serve the first byte. GitHub serves the page
instantly; the API calls happen after the game is already on screen.

`pages.yml` runs on every push to `main`: `npm ci` → `npm test` → `npm run build:pages` → deploy. `build:pages`
reads **`.env.pages`**, which holds the public API URL, the publishable key and the Fabric ids. All of those are
designed to ship in a browser; there are no secrets in it.

To set up your own mirror: push to GitHub, **Settings → Pages → Source: GitHub Actions**, then add your custom
domain there and point a `CNAME` record at `<your-github-user>.github.io`. Update `public/CNAME` and `.env.pages`
with your own values (`rayfin up status` prints them).

### Keeping both hosts in sync

Both deployments come from the same commit. A push to `main` runs **both** workflows: Pages rebuilds the mirror,
and the Fabric workflow redeploys the AppBackend — entities *and* frontend. Add a room, change a command, add a
column to `Activity`: one push, both hosts, same database. If you deploy from your laptop with `rayfin up` instead,
push the same commit afterwards so the mirror catches up.

## Configuration reference

### `.env.pages` (baked into the GitHub Pages build)

| Variable | Purpose |
|---|---|
| `VITE_RAYFIN_API_URL` | The AppBackend's API root (the long `…/appbackends/<id>/` URL). Without it the game runs offline. |
| `VITE_RAYFIN_PUBLISHABLE_KEY` | The app's publishable key (`pk-…`), safe to ship. |
| `VITE_FABRIC_ITEM_ID`, `VITE_FABRIC_WORKSPACE_ID`, `VITE_FABRIC_PORTAL_URL` | Runtime config for the Rayfin client. |

When hosted by Fabric itself these values are injected at deploy time; `.env.pages` exists only for the mirror.

### `rayfin/rayfin.yml`

| Key | Value here | Notes |
|---|---|---|
| `id` / `name` | `fabrics-quest` | The item name in the workspace |
| `auth.methods.fabric` | enabled | Sign-in exists for admins; players never use it |
| `data.dialect` | `mssql` | The app's SQL database in Fabric |
| `staticHosting.assetAccess` | `public` | **Must** be `public` for an anonymous game; the default `protected` requires sign-in |
| `staticHosting.buildCommand` | `npm run build:fabric` | |

### Rayfin entities (`rayfin/data/*.ts`)

Every entity carries `@authenticated('read')` and `@anonymous('create')`. `HallOfFame` also has
`@anonymous('read', { include: [...] })` limited to the leaderboard columns. Two hard-won rules:

1. **An entity with only `@anonymous(...)` roles breaks the whole data API** — every request, every entity,
   returns *Internal server error*. Always keep an `@authenticated(...)` role alongside.
2. **A create mutation echoes back the fields you sent**, and the data layer validates that echo against the
   caller's *read* permission. So any column an anonymous caller writes must also be in its anonymous read
   `include` list, or the create fails with *"not authorized to access this resource"*. For entities with no
   anonymous read at all, the create succeeds but returns *"mutation … was successful but the current user is
   unauthorized to view the response"* — `recorder.ts` treats that as success.

All string columns declare `@text({ max })`; the database is read-only in the portal, and schema changes flow only
through `rayfin up`.

### Browser storage

`fabricsquest.save` (the autosave), `fabricsquest.client` (a random client id), `fabricsquest.muted`, and a
mirror of the unsent telemetry queue. Nothing else.

## The data

| Table | One row per… | Key columns |
|---|---|---|
| `dbo.Quests` | game started | `id`, `player_name`, `client_id`, `user_agent`, `world_version`, `started_at` |
| `dbo.Activities` | command typed | `quest_id`, `seq`, `step_id` (rule id), `room_id`, `raw_input`, `verb`, `noun`, `outcome`, `output_text`, `points_awarded`, `score_after`, `turns_after`, `flags_after` (JSON), `occurred_at` |
| `dbo.HallOfFames` | game submitted | `quest_id`, `player_name`, `score`, `bonus`, `turns`, `elapsed_seconds`, `finished_at` |

`bonus` (side-quest points, on top of `score`) is `@int({ optional: true })` — rows written before the side
quests existed have none, and the leaderboard treats a missing value as 0. It's in `HallOfFame`'s anonymous
read `include` list alongside the rest, for the same reason `score` is: the create mutation echoes the row back,
and the echo has to pass the same read permission the caller has. **Deploying this schema needs a real
`rayfin up`** — it's an additive column, but the AppBackend's SQL database only picks it up when the entity
definition is redeployed; a frontend-only `staticapp deploy` doesn't touch it.

Telemetry is batched: rows are queued in the browser and flushed every 10 seconds or every 25 rows, four requests
in flight at a time, so a small capacity isn't hammered. God-mode turns (see below) are logged too, with step ids
`god.*`.

To analyze it, add a **OneLake shortcut** to the app's SQL database from a Lakehouse (or query the SQL endpoint
directly), and you have a ready-made fact table (`Activities`) with two dimensions (`Quests`, `HallOfFames`).

### The board's launch cutoff

`HALL_OPENED` in `src/game/recorder.ts` is the public-launch timestamp; Hall of Fame queries filter
`finished_at >= HALL_OPENED` and `score > 0`, so pre-launch test rows stay in the database (useful data) but never
show on the board. Move the date to reset the board without deleting anything.

### Housekeeping

Anonymous callers can only insert, so test rows are removed by hand in the database's query editor:

```sql
DELETE FROM dbo.HallOfFames WHERE player_name IN ('Claude the Peasant', 'Claude-smoke');
DELETE FROM dbo.Activities  WHERE quest_id IN (SELECT id FROM dbo.Quests WHERE player_name IN ('probe','Claude-smoke','Claude the Peasant'));
DELETE FROM dbo.Quests      WHERE player_name IN ('probe','Claude-smoke','Claude the Peasant');
```

## Extending the world

**Add a room.** In the region file (`src/world/village.ts`, …) add a `Room` with a stable id (`region.name`),
`name`, `describe`, `exits`, `items`, `npcs`, `rules`, a `scene` (an id from `src/scenes`) and a `flaskHint` — the
line `get ye flask` whispers there. Run `npm run lint:world`.

**Add a puzzle.** A `Rule` is `when` → `then`:

```ts
{
  id: 'village.credentials',
  when: { verb: 'talk', noun: 'miller', flags: [{ flag: 'jeff.pacified' }] },
  then: { text: 'The Miller sighs and hands you the Gen1 credentials.', give: ['credentials'], points: 10, sfx: 'item' },
}
```

`when` can match `verb`, `noun`/`noun2` (string or list), `nounMatches` (regex), `dir`, required `flags`, `has`,
`notHas`, `worn`, and `verbWord` — a list of the actual typed verb *words* ("use", "apply"), for when a rule
should only fire on one of the synonyms mapped to a verb, not all of them (Jeff's Excel uses this so `use net
sales` places a field but `fix net sales` and `label net sales` don't). `then` can set `text`, `set` flags,
`give`/`remove`/`wear` items, `moveTo`, `points` (awarded once per `pointsKey ?? id`), `death`, `win`, `sfx`, and
two fields the side quests added: `bonus` (like `points`, but added to `GameState.bonus` instead of `score`,
also once per `pointsKey ?? id`) and `returnTo: true` (moves the player back to the room stored in
`flags['sq.return']` and re-describes it — how a side quest's `exit` and its winning rule get you home). Room
rules are checked before global rules; the first match wins. Phrase rules (`src/world/globals.ts`) match the raw
line with a regex before parsing — that's where the easter eggs and instant deaths live; a `PhraseRule` can be
scoped to one `room`, or to every room in one `region` (the Keep's DirectQuery/DirectLake/publish/label eggs use
`region: 'fortress'` so they fire in all five of its rooms without repeating the rule five times).

**Give a room a first-impression line.** `Room.enterQuip?: (s) => string | null` shows once, in the Sierra
message box, the first time the player steps into that room — deadpan, one line, no points. Every room in the
game has one; a new room should too.

**Let a room read raw lines itself.** `Room.catchAll?: (s, line) => { then: RuleThen; id?: string } | null` is a
last-resort hook, checked after that room's rules and the global rules but before the builtins (`look`, `get`,
movement, …), so those still work normally. `line` is a `HeardLine`: the raw text (`line.raw`) and the same text
with its wrapper words taken off (`line.command`, plus `line.lead` / `line.trail` saying which wrappers were
there — see `unwrap()` in `src/engine/quirks.ts`). Two rooms use it: the Model View (bare relationship words
like `single` or `both`) and `copilot.pane`, where any line that isn't a recognized command is a prompt for
Copilot's ladder (`src/world/copilot-ladder.ts`, pure: `evaluatePrompt(text) → { rung, text, hint, shape }`). The
pane feeds the ladder the unwrapped line, so "i want to see …" or "ugh just give me …" is judged on the question
underneath. It's the general hook to reach for whenever a room needs to interpret free text instead of matching
fixed nouns.

**Keep the ledger at 200.** `tests/golden-path.test.ts` replays `tests/golden-path.json` and asserts the final
score; if you add points, add them to the path or rebalance.

**Add a scene.** Scenes are SVG functions in `src/scenes/<region>.tsx` built from the `kit` helpers (sky, ground,
walls, a bed, a table, a window…). Anything is allowed as long as it looks like it was drawn in 1987. A PNG
dropped at `public/scenes/<sceneId>.png` overrides the SVG automatically.

**Add a sound.** Cues are synthesized note sequences in `src/game/sfx.ts` (`CUES: Record<Cue, Note[]>`) — no
audio files, just Web Audio oscillators. Add the cue name to the `Cue` union and a `Note[]` sequence
(`[freq, ms, wave?, gain?, together?]`), then reference it from a rule's `sfx`. The side quests added five:
`sidequest` (the rising sting on entry), `sidequest-out` (the same sting, reversed, on exit), `excel-ding` (a
field landing in the pivot), `copilot-think` (every reply), and `bonus` (the cha-ching on winning either one).

### Side quests

A side quest is a self-contained `region` (`excel`, `copilot` are the two so far) with its own rooms, reachable
from anywhere and returning the player exactly where they were. Adding a third is content, not engine work —
the entry/exit machinery in `src/world/sidequests.ts` is generic:

1. Add the realm to `SIDEQUEST_ENTRY` (`src/world/sidequests.ts`) — a realm key and its entry room id.
2. Add one or more trigger phrases to `SIDEQUEST_PHRASES`, each `{ id, test: /regex/, text: '', dynamic:
   '<realm>' }` — `dynamic` is resolved by the engine (`enterThen()` stashes the current room in
   `flags['sq.return']`, plays the `sidequest` sting, and warps in), so the rule's own `text` is never shown.
   Scope a trigger to one room with `room` (Jeff's Excel also has `help jeff` in `village.square`) the way the
   Keep's phrase rules use `room`/`region`. A phrase rule can also carry `after: (prev) => boolean`, checked
   against the state before the turn (`prev.recent` is the previous command): that is how a bare `yes` enters
   Jeff's Excel only right after Jeff has asked. Copilot's trigger takes any line that addresses it (`ask
   copilot …`, `hey copilot, …`, `copilot, …`); when a question follows the trigger words, `step()` enters the
   pane and asks it on the same turn (`copilotPromptIn()` in `sidequests.ts`).
3. Build the realm's rooms in their own file (`src/world/<realm>.ts`), region set to the new key, each with
   `enterQuip`, `flaskHint`, a `scene`, and an `out` exit that returns `() => null` (the exit rules resolve
   `out`/`exit`/`leave` to `EXIT_THEN` — `{ returnTo: true, sfx: 'sidequest-out' }` — generically; a room only
   needs to *not* have a real `out` destination).
   The winning rule sets `bonus`, its own `sq.<name>.done` flag, and `returnTo: true`.
4. Register the realm's room map and its `PhraseRule`s in `src/world/index.ts`, ahead of the global
   `PHRASE_RULES` so a realm's own vocabulary (e.g. `copilot` meaning the sparkle in front of you, not the
   easter egg) wins inside it.
5. Leaving isn't something the room needs to implement. `exit`/`leave`/`close`/`back` and friends are phrase
   rules with `dynamic: 'exit'` in `SIDEQUEST_PHRASES`, and the direction `out` is intercepted before it ever
   reaches a room's own exits: `builtins.ts`'s movement handler returns `null` for `dir === 'out'` whenever
   `SIDE_REGIONS.has(room.region)` ("the sq.exit.words phrase owns leaving a realm"), and `step.ts` has a
   second fallback for the phrasings that aren't a bare `out` (`outside`, `go outside`, `walk out`). Both paths
   run the same `EXIT_THEN` (`{ returnTo: true, sfx: 'sidequest-out' }`), which `step()` resolves against
   `flags['sq.return']` (`RETURN_FLAG`, set on entry to `roomIndex()` of wherever the player was) to put them
   back exactly where they left off. A side room's `out: () => null` exit (step 3, above) is never actually
   followed; `describeRoom()` shows it in a side room's exit list as `exit (back to the realm)`, so give every
   side room one. `quit` typed inside a realm is caught the same way: it leaves the realm with the exit sting
   and a one-line warning (`quitInRealmText()`), and `App.tsx` only ends the run on the builtin quit, whose
   outcome is `meta`. `help` inside a realm adds a line naming `EXIT` (`SIDE_REALM_NAME` in
   `src/world/types.ts`). World lint
   (`src/world/lint.ts`) doesn't know about side-quest exits at all; what it does check, side rooms included,
   is that every room has an `enterQuip`, that each side quest's entry room (`SIDEQUEST_ENTRY`) exists and is
   reachable, and that no two phrase rules share the same test within the same scope (room/region/global).

No deaths happen inside a side realm: `step()` turns any rule or phrase that would kill you there into the
realm's own shrug (`NO_DEATH` in `sidequests.ts`, keyed by realm; add a line for a new one). The Peaks'
interactive delay and Jeff's square ambient are both suppressed there too. Give the realm a status-bar color in
`src/ui/styles.css` (`.play[data-region="<realm>"] .statusbar`; `PlayScreen` sets `data-region`) if you want it
to match (Jeff's Excel is spreadsheet green, Copilot is Copilot purple).

## God mode

There is an undocumented admin mode for demos and QA. It's not in the help text on purpose; the trigger is a word
Homestar Runner fans will guess. Once on, `godhelp` lists the extra commands: `rooms`, `warp <room>`, `prompts
[all|global]` to see every command a room accepts with its points and preconditions, `summon <item>`, `flags`,
and `locate <thing>` (aliases: `find <thing>`, `how do i get/find <thing>`, `what do i give/say (to) <thing>`) —
searches the whole world for who wants it, where it lives, and what to type, points-earning matches first. Runs
that used it show a ⚡ in the status bar and are not eligible for the Hall of Fame.

## Troubleshooting

**The data API returns "Internal server error" for everything, even simple queries.**
Cause: an entity with only anonymous roles. Fix: add `@authenticated('read')` to every entity and redeploy.

**`createHallOfFame` fails with "The current user is not authorized to access this resource".**
Cause: a column the anonymous role writes is missing from its read `include` list. Fix: add it to the list (see
the rule above) and run `rayfin up`.

**The finish screen says "Hall of Fame is offline in this build".**
The build has no `VITE_RAYFIN_API_URL`. Locally that's expected; on Pages, check `.env.pages`.

**The live site takes 20+ seconds to respond, or the Hall of Fame hangs.**
The Fabric capacity is throttled (interactive delay). Pause and resume it in the Azure portal, scale it, or wait
it out. The Pages mirror keeps the *game* playable during a throttle; only scores are delayed.

**`rayfin up` created a second item instead of updating the first.**
The item is matched by the `name` in `rayfin.yml` within the workspace given by `--workspace`. Make sure both are
unchanged; `rayfin/.deployments.json` (git-ignored) also caches the mapping locally.

**Playwright can't find Chromium.**
`CHROMIUM_PATH=/path/to/chrome npm run e2e`.

**Many 404s for `/scenes/*.png` in the console.**
Expected: the scene panel probes for PNG overrides and falls back to the SVG. Add PNGs if you want, or ignore.
