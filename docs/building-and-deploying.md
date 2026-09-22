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
src/game/      recorder.ts (telemetry queue → Fabric) · save.ts (localStorage) · sfx.ts (Web Audio chiptunes)
src/scenes/    the 8-bit scenes, drawn in SVG with a tiny kit (EGA palette, 4:3, stretched like a CRT)
src/ui/        SplashScreen · TitleScreen · PlayScreen · ScenePanel · MessageBox · DeathCard · FinishScreen
rayfin/        rayfin.yml (app config) · data/*.ts (the three entities and their permissions)
tests/         vitest suites + golden-path.json (the canonical 59-command, 200-point run)
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
| `dbo.HallOfFames` | game submitted | `quest_id`, `player_name`, `score`, `turns`, `elapsed_seconds`, `finished_at` |

Telemetry is batched: rows are queued in the browser and flushed every 10 seconds or every 25 rows, four requests
in flight at a time, so a small capacity isn't hammered. God-mode turns (see below) are logged too, with step ids
`god.*`.

To analyze it, add a **OneLake shortcut** to the app's SQL database from a Lakehouse (or query the SQL endpoint
directly), and you have a ready-made fact table (`Activities`) with two dimensions (`Quests`, `HallOfFames`).

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
`notHas`, `worn`. `then` can set `text`, `set` flags, `give`/`remove`/`wear` items, `moveTo`, `points`
(awarded once per `pointsKey ?? id`), `death`, `win`, `sfx`. Room rules are checked before global rules; the
first match wins. Phrase rules (`src/world/globals.ts`) match the raw line with a regex before parsing — that's
where the easter eggs and instant deaths live.

**Keep the ledger at 200.** `tests/golden-path.test.ts` replays `tests/golden-path.json` and asserts the final
score; if you add points, add them to the path or rebalance.

**Add a scene.** Scenes are SVG functions in `src/scenes/<region>.tsx` built from the `kit` helpers (sky, ground,
walls, a bed, a table, a window…). Anything is allowed as long as it looks like it was drawn in 1987. A PNG
dropped at `public/scenes/<sceneId>.png` overrides the SVG automatically.

## God mode

There is an undocumented admin mode for demos and QA. It's not in the help text on purpose; the trigger is a word
Homestar Runner fans will guess. Once on, `godhelp` lists the extra commands (`rooms`, `warp <room>`,
`prompts [all|global]` to see every command a room accepts with its points and preconditions, `summon <item>`,
`flags`). Runs that used it show a ⚡ in the status bar and are not eligible for the Hall of Fame.

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
