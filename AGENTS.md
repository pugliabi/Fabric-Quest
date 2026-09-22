# AGENTS.md

Context for coding agents working in this repo. Player and builder docs live in `README.md` and `docs/`.

## What this is

Fabric's Quest: a Sierra-style text adventure shipped as a Microsoft **Fabric App** (Rayfin SDK 1.35, React 19,
Vite 7, TypeScript strict, Vitest 3). Public at https://fabricquest.pugliabi.com (GitHub Pages mirror) and at the
Fabric static-hosting URL; both are built from this repo on every push to `main` (`.github/workflows/`).

## Rayfin

Load `.agents/skills/rayfin/SKILL.md` and the `rayfin` MCP server in `.mcp.json` before writing Rayfin code.
Rayfin docs are version-locked to the packages installed here: prefer the MCP tools `search_docs`, `get_doc`,
`list_docs`, `discover_packages`; if MCP is unavailable run `npx -y @microsoft/rayfin-cli docs ...` from the
project root so the CLI reads this project's `node_modules`.

## Ground rules

- `src/engine` and `src/world` are pure: no DOM, no network, no randomness beyond `state.seed`. Keep it that way;
  the terminal replay and the tests depend on it.
- The ledger is exactly **200 points**. `tests/golden-path.json` is the canonical run; `npm test` fails if the
  final score drifts.
- Every `rayfin/data` entity must keep `@authenticated('read')` next to its `@anonymous(...)` roles, and every
  column an anonymous caller writes to `HallOfFame` must be in its anonymous read `include` list. Both were
  learned the hard way (see `docs/building-and-deploying.md` → Troubleshooting).
- All string columns use `@text({ max })`.
- Original characters and art only — it's a tribute to Peasant's Quest, not a copy. No Homestar Runner assets.
- Public config (`.env.pages`, `public/CNAME`) is meant to be committed. `rayfin/.env` and
  `rayfin/.deployments.json` are not.

## Commands

`npm test` · `npm run lint:world` · `npx tsc -b` · `npm run replay -- tests/golden-path.json` ·
`npm run e2e` (`CHROMIUM_PATH=...`) · `npm run build:pages` · `npx rayfin up --workspace "FabricQuest" --yes`.

## Layout

See `docs/building-and-deploying.md` → "How the project is put together". Design spec and build plan:
`docs/superpowers/`.
