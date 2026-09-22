# Fabric's Quest

A Sierra-style text adventure through the realm of Microsoft Fabric, built as a **Fabric App (Rayfin)**.
You are a humble Report Builder from the Village of Pro. Find the Golden Semantic Model. Beware Throttlor.

Every command a player types is written to the app's SQL database in Fabric (anonymous create only), so the play data is
immediately queryable from a lakehouse, semantic model, and Power BI. A public Hall of Fame reads back the top scores.

## Run it

```bash
npm install
npm run dev:frontend      # game only, telemetry to the console (no Docker needed)
npm run dev               # full local stack via `rayfin dev` (needs Docker)
npm test                  # engine + world tests (vitest)
npm run lint:world        # dangling exits/items/rules
npm run e2e               # Playwright smoke (CHROMIUM_PATH=... to point at a local Chromium)
npm run replay -- tests/golden-path.json   # play the 200-point walkthrough in the terminal
```

## Deploy to Fabric

**Live:** https://early-coast-531f268ca6-centralus.webapp.fabricapps.net (workspace **FabricQuest**, item `c8d31d60-56d7-4015-870e-175ecc619788`).

Deployed with the Claude-Fabric-MCP service principal (`rayfin login --service-principal`). Tenant settings required:
*Fabric App Items (preview)* and *Anonymous data access for Fabric Apps (preview)*, both on. `rayfin.yml` sets
`staticHosting.assetAccess: public` so no sign-in is needed to open the game.

```bash
npx rayfin login                                       # or --service-principal -t/-u/-p in CI
npx rayfin up --workspace "FabricQuest" --dry-run      # preview
npx rayfin up --workspace "FabricQuest" --yes          # deploy app + apply schema
npx rayfin up staticapp deploy                         # frontend-only redeploy
npx rayfin up status                                   # prints the public URL
```

Gotchas learned the hard way: an entity with **only** `@anonymous(...)` roles makes the data service return
*Internal server error* for every request — each entity also carries `@authenticated('read')`. And DAB answers a
successful anonymous create with a "Forbidden to view the response" GraphQL error; `recorder.ts` treats that as success.

The SQL database is read-only in the portal; schema changes flow only from `rayfin/data/*.ts` via `rayfin up`.
For CI, see the Microsoft Learn article *Deploy a Fabric app with GitHub Actions* (service-principal login).

## Public mirror on GitHub Pages — fabricquest.pugliabi.com

The same build is published to GitHub Pages so the public URL loads instantly regardless of the Fabric capacity's mood;
the page still talks to the Fabric app's anonymous GraphQL API (it answers `Access-Control-Allow-Origin: *`).
`.github/workflows/pages.yml` builds with `npm run build:pages` (`.env.pages` bakes in the public API URL and
publishable key) and deploys on every push to `main`. `public/CNAME` pins the custom domain.

One-time setup:
1. Create the GitHub repo (e.g. `pugliabi/fabrics-quest`), push this folder, and in **Settings → Pages** set Source to **GitHub Actions**.
2. At Squarespace (**Domains → pugliabi.com → DNS → Custom records**) add: `CNAME` · host `fabricquest` · value `pugliabi.github.io` (your GitHub username + `.github.io`).
3. Back in **Settings → Pages**, enter `fabricquest.pugliabi.com` as the custom domain and tick **Enforce HTTPS** once the check passes.

## Housekeeping SQL (run in the fabrics-quest database query editor)

Anonymous callers can only insert, so test rows are removed by hand:

```sql
DELETE FROM dbo.HallOfFames WHERE player_name IN ('Claude the Peasant');
DELETE FROM dbo.Activities  WHERE quest_id IN (SELECT id FROM dbo.Quests WHERE player_name IN ('probe','Claude-smoke','Claude the Peasant'));
DELETE FROM dbo.Quests      WHERE player_name IN ('probe','Claude-smoke','Claude the Peasant');
```

## How the game is built

```
src/engine/      parser.ts (two-word grammar + synonyms), step.ts (pure: step(state, input, world)), builtins.ts, snark.ts
src/world/       the content. One file per region (village, lake, monastery, fortress, peaks) + items, npcs, globals, lint
src/game/        recorder.ts (Rayfin telemetry queue), save.ts (localStorage), sfx.ts (Web Audio chiptune cues)
src/ui/          TitleScreen, PlayScreen, ScenePanel (placeholder until art lands), DeathCard, FinishScreen
rayfin/data/     Quest, Activity, HallOfFame entities (@anonymous('create'); HallOfFame also @anonymous('read'))
tests/           parser, engine fixture, golden path (asserts 200/200), deaths, world lint
docs/superpowers spec + implementation plan
```

**Adding a room:** add a `Room` to the region file with a stable id (`region.name`), `exits`, `items`, `npcs`, `rules`,
`scene`, and a `flaskHint` (what "get ye flask" whispers there). Run `npm run lint:world`.

**Adding a puzzle:** add a `Rule` — `when: { verb, noun, flags, has }` → `then: { text, set, give, remove, points, sfx }`.
Points are awarded once per `pointsKey ?? id`. Keep the ledger at 200; `tests/golden-path.test.ts` will tell you if you don't.

## The 200-point ledger

| Step | Points |
|---|---|
| Read the prophecy | 5 |
| Wait out the Spark session at the Monastery gate | 10 |
| Library card (your Pro license) → Spark Scroll | 10 |
| Read the scroll | 5 |
| Fix Brother Pandas' notebook | 20 |
| Hoodie of Spark from the Abbot | 15 |
| Say the right SKU at the drawbridge | 10 |
| `say select *` to the Duke → thrown in the Moat | 25 |
| Out-stare the Lookup Activity | 10 |
| Cable → Copy Activity → Bursting Boots | 15 |
| Gen1 credentials from the Mill | 10 |
| Bring the Ferryman online | 15 |
| Take the Standard key | 20 |
| Pick up the OneLake Shortcut | 10 |
| Open the Shrine door | 5 |
| `say star schema` to Throttlor | 10 |
| Take the Golden Semantic Model | 5 |

Original characters and art. A tribute to the parser adventures of the 1980s; no assets from any existing game.
