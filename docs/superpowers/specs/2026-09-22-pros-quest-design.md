# Fabric's Quest — Design Spec

**Date:** 2026-09-22
**Owner:** Tommy Puglia (Puglia BI Consulting)
**Status:** Approved 2026-09-22 (art style locked from reference screenshots, no player sprite, target workspace Fabric Quest). Next step: implementation plan and build.
**Platform:** Microsoft Fabric App (Rayfin, preview), publicly playable via anonymous data access.

---

## 1. Purpose and constraints

Fabric's Quest is a Sierra-style text-parser adventure game with 8-bit scene art, set in a fantasy version of Microsoft Fabric. It is an homage to the *Peasant's Quest* genre (strict two-word parser, canned snark, "you have died" screens, three prerequisites to become "worthy"), with **original characters, names, and art** — nothing from Homestar Runner is reproduced.

- **Purpose:** marketing / community fun for Puglia BI and the Explicit Measures Podcast. Jokes land because they are true to life; it is not a teaching tool.
- **Scope:** one quest (reach the Golden Semantic Model), three trials in any order, ~22 rooms, one sitting of play.
- **Audience:** anyone with the URL. No Fabric sign-in required to play.
- **Backend:** every playthrough and every command is written to the app's SQL database in Fabric (so Tommy can analyze play in Power BI), plus a public Hall of Fame.
- **Engine approach:** data-driven world (content files) interpreted by one small generic engine.

## 2. Story

You are a humble **Report Builder** from the **Village of Pro**. Every night **Throttlor the Capacity Dragon** descends from the Capacity Peaks and burninates the village's refreshes. Legend says the **Golden Semantic Model**, kept in the Shrine at the summit, can end the throttling forever — but the Shrine door opens only for one who is *worthy*.

To be worthy you must complete **three trials**, in any order:

1. **Look like a Data Engineer** — earn the *Hoodie of Spark* at the Notebook Monastery.
2. **Smell like a Warehouse** — get thrown into the *Moat of T-SQL* at Warehouse Fortress.
3. **Hold the Gateway Key** — bring the offline *Ferryman* fresh credentials, cross the OneLake, take the key.

Then climb the Capacity Peaks (where interactive delay makes every command cost extra turns until you find the *Bursting Boots*), open the Shrine, and face Throttlor. The dragon cannot survive the one thing it fears: a properly modeled star schema. Say it and Throttlor deflates like a paused capacity. You lift the Golden Semantic Model and discover it is one flat table with 412 columns, a column named `Column1`, and a measure named `Measure 2 (copy)`. The village is saved anyway. Credits. Hall of Fame.

**Player:** unnamed until the title screen asks for a name (that name is the Quest row's `player_name` and the Hall of Fame entry).

## 3. World map

Five regions, 22 rooms. IDs are stable and are used as telemetry `step_id`/`room_id`.

| Region | Room ID | Name | Exits | Notes |
|---|---|---|---|---|
| Village | `village.cottage` | Your Cottage | out→square | **Start.** Contains `report` (untakeable), `mug` (takeable). Player starts holding `license`. |
| Village | `village.square` | Village Square | n→mill, e→fields, s→lake.shore, w→cottage | Notice board (`read board` = the prophecy). Jeff from Finance wanders here and in the fields. |
| Village | `village.mill` | Dataflow Gen1 Mill | s→square | The Miller; `credentials` stored here since 2019. |
| Village | `village.fields` | Refresh Fields | w→square, e→peaks.foothills | Scarecrow named Manual. Flavor + route to the Peaks. |
| OneLake | `lake.shore` | OneLake Shore | n→square, e→dock, s→swamp.bronze | Destination of `use shortcut`. |
| OneLake | `lake.dock` | Ferryman's Dock | w→shore, (boat)→island when ferryman online | The Ferryman (OFFLINE until credentials given). |
| OneLake | `lake.island` | Isle of Gateway | (boat)→dock | Two keys on a plinth: `personal key`, `standard key`. |
| OneLake | `swamp.bronze` | Bronze Marsh | n→shore, s→silver | Raw data. `drink water` = death. |
| OneLake | `swamp.silver` | Silver Marsh | n→bronze, s→gold | `_delta_log` logs floating. `get log` snark. |
| OneLake | `swamp.gold` | Gold Marsh | n→silver, e→monastery.gate | Contains `shortcut` (takeable signpost). |
| Monastery | `monastery.gate` | Monastery Gate | w→swamp.gold, n→cloister (when open) | Gate shows "Session starting…". Opens after the player `wait`s 3 turns. |
| Monastery | `monastery.cloister` | Cloister | s→gate, e→spark, w→library | The Abbot. Will grant the Hoodie when Brother Pandas' notebook is fixed. |
| Monastery | `monastery.spark` | Spark Session Chamber | w→cloister | Brother Pandas and his `notebook` (`df = pd.read_csv("onelake/gold/*.csv")`). |
| Monastery | `monastery.library` | Library of Deprecated Notebooks | e→cloister | Librarian lends the `scroll` only against a library card (the `license` works). |
| Fortress | `fortress.bridge` | Drawbridge | s→peaks.foothills, n→hall (when down) | Guard: "Halt! State your SKU!" `say trial` lowers the bridge. |
| Fortress | `fortress.hall` | Great Hall | s→bridge, n→throne, e→yard | Flavor; guards. |
| Fortress | `fortress.throne` | Duke's Chamber | s→hall | The Duke of Warehouse speaks only in JOINs. `say select *` → thrown in the moat. |
| Fortress | `fortress.yard` | Pipeline Yard | w→hall | Copy Activity (stuck), Lookup Activity (staring). |
| Peaks | `peaks.foothills` | Foothills | w→fields, n→bridge (fortress), e→pass | Sign: "CAPACITY PEAKS — interactive operations may be delayed." |
| Peaks | `peaks.pass` | Throttling Pass | w→foothills, n→ledge | Interactive delay zone. |
| Peaks | `peaks.ledge` | Bursting Ledge | s→pass, n→shrine (when door open) | Shrine door with three sigils (hoodie, stink lines, key). |
| Peaks | `peaks.shrine` | The Shrine | s→ledge | Throttlor and the Golden Semantic Model. |

Region adjacency summary: Village is the hub; OneLake is south; the Monastery is reached through the Gold Marsh; the Fortress is reached from the Foothills; the Peaks are east of the Fields.

## 4. Items, NPCs, flags

**Items** (id — name — where — notes)

- `license` — Pro License Card — starting inventory — "The only license you have. Also the only one the Library accepts."
- `mug` — "World's Okayest Analyst" mug — cottage — give to Jeff to make him stop following you (no points; quality of life).
- `report` — `Sales_v3_FINAL_final2.pbix` — cottage — untakeable: "It's 2.3 GB. You'd need a Premium license to lift it."
- `credentials` — Gen1 credentials — mill — the Miller hands them over: "Been stored here since 2019. Nobody else remembers the password."
- `scroll` — Spark Scroll — library — `read scroll` teaches `spark.read`; `use scroll on notebook` fixes the notebook.
- `hoodie` — Hoodie of Spark — given by the Abbot — wearing it sets flag `trial.hoodie`.
- `shortcut` — OneLake Shortcut (a signpost) — gold marsh — "It weighs nothing. It's just a pointer." `use shortcut` from anywhere teleports to `lake.shore`: "You take the Shortcut. No data was moved."
- `personal key` — island — takeable, worthless: "It only works for you, and only while your laptop is open."
- `standard key` — island — taking it sets `trial.key`.
- `cable` — Connection Cable — dropped by the Lookup Activity after the staring contest — `use cable on copy activity`.
- `boots` — Bursting Boots — produced by the Copy Activity — wearing them removes interactive delay.
- `model` — Golden Semantic Model — shrine — taking it (after the dragon is gone) ends the game.

**NPCs**

- **Jeff from Finance** (village.square, village.fields) — follows you around the village asking for an Excel export. `talk to jeff`: "Can you export this to Excel?" `give mug to jeff`: he wanders off happily. Random interjections every few turns in the village until then.
- **The Miller** (village.mill) — mournful; the mill is scheduled for decommission. Gives credentials on `talk`/`ask miller about credentials`.
- **The Ferryman** (lake.dock) — status OFFLINE. `give credentials to ferryman` → ONLINE. `board boat` / `ride ferry` → island (and back).
- **Gatekeeper Monk** (monastery.gate) — just points at the "Session starting…" progress bar.
- **The Abbot** (monastery.cloister) — grants the Hoodie when `notebook.fixed` is set.
- **Brother Pandas** (monastery.spark) — "It works on my laptop."
- **The Librarian** (monastery.library) — lends the scroll for a library card.
- **The Guard** (fortress.bridge) — "Halt! State your SKU!"
- **The Duke of Warehouse** (fortress.throne) — speaks in JOINs. "INNER JOIN me, peasant, ON what?"
- **Copy Activity / Lookup Activity** (fortress.yard) — the Lookup stares; the Copy is stuck "Waiting on Lookup".
- **Throttlor** (peaks.shrine) — the Capacity Dragon.

**Flags** (all boolean unless noted)

`prophecy.read`, `jeff.pacified`, `gate.waiting` (int 0–3), `gate.open`, `scroll.lent`, `notebook.fixed`, `trial.hoodie`, `bridge.down`, `trial.moat`, `lookup.beaten`, `copy.fixed`, `ferry.online`, `on.island`, `trial.key`, `shrine.open`, `dragon.gone`, `game.won`.

## 5. Puzzles and scoring (200 points total)

| # | Step ID | Action | Points |
|---|---|---|---|
| 1 | `village.prophecy` | `read board` in the square | 5 |
| 2 | `monastery.wait` | `wait` ×3 at the gate ("Session starting… 33%… 67%… Session started. Took 4 minutes, as is tradition.") | 10 |
| 3 | `monastery.card` | `give license to librarian` / `show license` → scroll lent | 10 |
| 4 | `monastery.read-scroll` | `read scroll` (first time) | 5 |
| 5 | `monastery.fix` | `use scroll on notebook` → `notebook.fixed` | 20 |
| 6 | `monastery.hoodie` | `talk to abbot` after fix → hoodie; `wear hoodie` → `trial.hoodie` | 15 |
| 7 | `fortress.sku` | `say trial` at the drawbridge → bridge down ("Trial capacity, eh. Sixty days. Quickly.") | 10 |
| 8 | `fortress.moat` | `say select *` to the Duke → "SELECT STAR? In MY warehouse?!" Guards throw you in the moat → `trial.moat` | 25 |
| 9 | `fortress.stare` | `look at lookup` then `wait` ×2 → the Lookup blinks → `lookup.beaten`; it drops a `cable` | 10 |
| 10 | `fortress.copy` | `use cable on copy activity` → it runs and deposits a pair of boots ("Provenance unknown.") | 15 |
| 11 | `village.credentials` | `talk to miller` / `get credentials` | 10 |
| 12 | `lake.ferry` | `give credentials to ferryman` → ONLINE | 15 |
| 13 | `lake.key` | `get standard key` on the island | 20 |
| 14 | `swamp.shortcut` | `get shortcut` in the Gold Marsh | 10 |
| 15 | `peaks.shrine-door` | arrive at the ledge with all three trial flags → door opens | 5 |
| 16 | `peaks.dragon` | `say star schema` to Throttlor → `dragon.gone` | 10 |
| 17 | `peaks.model` | `get model` → ending | 5 |

Total: 5+10+10+5+20+15+10+25+10+15+10+15+20+10+5+10+5 = **200**.

Wrong-but-funny answers that score nothing but get a line: `say f64` at the bridge ("Nice try, peasant."), `say select 1` to the Duke ("Adequate."), `get personal key` (allowed, useless), `say calculate` to the dragon ("Throttlor yawns. Context transition means nothing to a dragon.").

**Interactive delay mechanic:** in `peaks.pass` and `peaks.ledge`, if `boots` is not worn, every command adds +2 turns and the output is prefixed "(…interactive delay…)". With boots: "You burst through."

## 6. Deaths and easter eggs

Deaths show the Sierra-style card: *"You have died. Restore, Restart, or Quit?"* Death is recorded as outcome `death` in telemetry with the step ID of the cause.

- `drink water` in the Bronze Marsh — "You drink raw data. Nothing is typed. Everything is a string. You are a string." (`death.bronze`)
- `delete workspace` anywhere — "You delete the workspace. You were in it." (`death.delete-workspace`)
- `attack dragon` / `fight throttlor` — "Your refresh has been throttled. Permanently." (`death.dragon`)
- `import lake` / `import onelake` at the shore — "You attempt to Import the OneLake into Power BI Desktop. Your laptop becomes a small sun." (`death.import`)
- `give paginated report to jeff` / `offer paginated report to jeff` (a phrase rule; there is no such item) — "Jeff's eyes go dark. He was not built for this." (`death.paginated`)

Global easter eggs (work in every room, outcome `snark`):

- `sudo <anything>` — "You are not in the sudoers file. This incident will be reported to your capacity admin."
- `export to excel` — "The game exports itself to Excel. 1,048,576 rows later, it stops. Nothing has changed."
- `calculate` — "CALCULATE what? Context is everything."
- `ask copilot <anything>` — Copilot confidently answers a different question.
- `xyzzy` — "A hollow voice says: 'Direct Lake.'"
- `get ye flask` — works in every room. "Ye cannot get ye flask." followed by a one-line, room-specific nudge toward the next useful action (each room defines a `flaskHint`). Zero points; increments `flask.count` so play data shows who used it. On the Bursting Ledge it also names which sigils are still dark; at the Monastery gate it says how many more `wait`s remain.
- `refresh` — "You refresh. Nothing changes, but it feels productive."
- `help` — verb list, in character.
- Unknown verbs draw from a rotating snark pool (at least 12 lines) so repeat typing feels alive.

## 7. Parser

Two-word grammar with articles/filler stripped and a synonym table. Canonical verbs:

`look` (`l`, `examine`, `x`, `inspect`), `get` (`take`, `pick up`, `grab`), `drop`, `use X on Y` (`apply`, `put`), `talk to X` (`speak`, `ask`), `say X` (`shout`, `answer`), `give X to Y` (`offer`, `hand`, `show`), `open`, `close`, `read`, `wear` (`put on`), `wait` (`z`), `drink`, `attack` (`fight`, `hit`, `kill`), `board` (`ride`, `enter boat`), `go <dir>` and bare `n s e w u d out` (`north`… ), `inventory` (`i`, `inv`), `score`, `save`, `restore`, `restart`, `quit`, `help`.

Parse result: `{ verb, noun?, noun2?, raw }`. Classification of each turn's outcome, stored in telemetry:

- `move` — room changed
- `success` — a rule with points or a state change fired
- `fail` — recognized verb, valid target, nothing happened ("You can't do that.")
- `snark` — unknown verb, unknown noun, or an easter egg
- `death`
- `meta` — inventory, score, save, restore, help, restart

## 8. Engine

Single pure function:

```ts
step(state: GameState, input: string, world: World): StepResult
// StepResult = { state: GameState, output: string[], outcome: Outcome, stepId: string, pointsAwarded: number }
```

```ts
type GameState = {
  room: RoomId; inventory: ItemId[]; worn: ItemId[];
  flags: Record<string, boolean | number>;
  score: number; turns: number; dead: boolean; won: boolean;
  seed: number; // for rotating snark, deterministic per quest
}
```

Content types (in `src/world/types.ts`):

```ts
type Room = { id: RoomId; name: string; region: string;
  describe: (s: GameState) => string;          // may vary by flags
  exits: Partial<Record<Dir, RoomId | ((s: GameState) => RoomId | null)>>;
  items: ItemId[]; npcs: NpcId[]; rules: Rule[]; scene: (s: GameState) => SceneId; }
type Item = { id: ItemId; name: string; aliases: string[]; takeable: boolean; wearable?: boolean; describe: string; }
type Npc  = { id: NpcId; name: string; aliases: string[]; describe: (s: GameState) => string; }
type Rule = { id: string;                      // becomes step_id
  when: { verb: Verb; noun?: string; noun2?: string; flags?: Cond[]; has?: ItemId[]; worn?: ItemId[] };
  then: { text: string | ((s: GameState) => string); set?: FlagPatch; give?: ItemId[]; remove?: ItemId[];
          moveTo?: RoomId; points?: number; outcome?: Outcome; death?: boolean; win?: boolean }; }
type World = { rooms: Record<RoomId, Room>; items: Record<ItemId, Item>; npcs: Record<NpcId, Npc>;
  globalRules: Rule[]; snark: string[]; start: RoomId; version: string; }
```

Rule resolution order: room rules → global rules → built-in verb handlers (movement, get/drop/inventory/look) → fallback snark. First matching rule wins. Rules with `points` award them once (tracked in `flags` as `pts.<ruleId>`).

Files:

```
src/engine/parser.ts      tokenize + synonyms → ParsedCommand
src/engine/step.ts        the pure step function
src/engine/builtins.ts    movement, look, get, drop, inventory, wear, score, help
src/world/types.ts
src/world/index.ts        assembles World, version string
src/world/village.ts  lake.ts  monastery.ts  fortress.ts  peaks.ts
src/world/items.ts  npcs.ts  globals.ts (easter eggs, deaths, snark pool)
src/ui/…                  React components
src/telemetry/…           Rayfin client, queue
tests/…                   vitest
scripts/replay.ts         re-run an Activity log
scripts/lint-world.ts     every exit → real room, every item/npc referenced exists, every rule id unique
```

Save/restore: `GameState` serialized to `localStorage` under `prosquest.save`. Restart clears state but keeps `client_id`.

## 9. UI

Vite + React, single screen, pixel font (e.g. "Press Start 2P" via Google Fonts or a bundled bitmap font), 4:3 scene panel.

1. **Title screen** — logo, "Enter your name, peasant:" input → creates the `Quest` row → cottage.
2. **Play screen** (matches the reference layout)
   - White status bar across the **top** of the scene, bold pixel font, black text: `Score : 12 of 200` on the left, `Fabric's Quest` on the right. Turn count is available via `score`, not shown in the bar.
   - Scene image for the current room directly beneath (variant chosen by `room.scene(state)`), letterboxed on black.
   - Beneath the scene: the `>` prompt with the input line, always focused; up-arrow recalls history. Output text appears in a short text area between the scene and the prompt (last ~8 lines visible, full log scrollable), so it reads like a Sierra text window rather than a chat log.
3. **Death card** — "You have died." + cause line + `Restore / Restart / Quit` (typed or clicked).
4. **Finish screen** — ending text, score, turns, elapsed; name pre-filled; "Submit to Hall of Fame"; top-20 Hall of Fame list.

Mobile: stacked layout, scene image scales to width, input stays above the keyboard.

**Sound (chiptune cues, not music).** Short square/triangle-wave effects synthesized in the browser with the Web Audio API — no audio files. Cues: title jingle (on first interaction), move blip, success (rising two-note), item found (three-note arpeggio), fail (low buzz), snark (descending two-note), door/gate opening (rising sweep), death (falling four-note), victory fanfare. Chosen from the turn's outcome, with a per-rule override for special moments. Mute toggle in the status bar, remembered per browser.

## 10. Art

- Style (locked from reference screenshots, 2026-09-22): Sierra AGI look. Flat solid fills, thick black outlines, **no dithering or gradients**, ~16-color EGA palette (olive/mustard interiors, brown floors, saturated red/blue accents). Scenes are 320×200 at 4:3, letterboxed on black; exteriors may float on a black background rather than filling the frame. Perspective is simple one-point interiors and side-on exteriors.
- **No player sprite.** Each room is a scene painting only; the player is implied by the prompt.
- Pipeline: one master style prompt + one line per room; AI-generate at 320×200; post-process every image through the same script (downscale → quantize to a fixed 16-color palette → upscale nearest-neighbor) so drift between generations disappears.
- Title screen: black background, blackletter-style title in yellow with a red drop shadow, "CLICK ANYWHERE TO PLAY!", a one-line credit ("by Puglia BI"), and an original hooded-character portrait on the right.
- Inventory: 22 base scenes + variants: monastery gate open, drawbridge down, ferryman online, Copy Activity running, shrine door open, dragon gone, ending. ~29 images, PNG, all well under the 100 MB static limit.
- No Homestar Runner assets or likenesses.

## 11. Data model and telemetry (Rayfin)

`rayfin/data/quest.ts`

```ts
@entity() @anonymous('create')
export class Quest {
  @uuid() id!: string;
  @text() player_name!: string;
  @text() client_id!: string;          // random UUID persisted in localStorage
  @text({ optional: true }) user_agent?: string;
  @text() world_version!: string;
  @datetime() started_at!: Date;
}
```

`rayfin/data/activity.ts`

```ts
@entity() @anonymous('create')
export class Activity {
  @uuid() id!: string;
  @text() quest_id!: string;           // plain text FK; no @one() so anonymous create stays simple
  @integer() seq!: number;
  @text() step_id!: string;            // rule id or room id
  @text() room_id!: string;
  @text() raw_input!: string;
  @text({ optional: true }) verb?: string;
  @text({ optional: true }) noun?: string;
  @text() outcome!: string;            // move | success | fail | snark | death | meta
  @text() output_text!: string;
  @integer() points_awarded!: number;
  @integer() score_after!: number;
  @integer() turns_after!: number;
  @text() flags_after!: string;        // JSON
  @datetime() occurred_at!: Date;
}
```

`rayfin/data/hall-of-fame.ts`

```ts
@entity() @anonymous('create')
@anonymous('read', { include: ['player_name', 'score', 'turns', 'elapsed_seconds', 'finished_at'] })
export class HallOfFame {
  @uuid() id!: string;
  @text() quest_id!: string;
  @text() player_name!: string;
  @integer() score!: number;
  @integer() turns!: number;
  @integer() elapsed_seconds!: number;
  @datetime() finished_at!: Date;
}
```

Rules:

- **No anonymous `update` or `delete` anywhere.** Completion is a new HallOfFame row, not a Quest edit. Anonymous visitors can never touch another player's data.
- Activity rows are written fire-and-forget from a client-side queue (batched every ~2 s or on 10 pending), retried with backoff, persisted in `localStorage` if offline; the game never blocks on the network.
- Known, accepted risk: the anonymous-create Hall of Fame can be spammed by anyone who reads the page source. Mitigation is moderation (delete rows in SQL) and, if it becomes a problem, a v2 server-side validation via Rayfin Functions when available.
- Tenant setting "Anonymous data access for Fabric Apps" must be enabled by the tenant admin (Tommy, on the PBIC tenant), scoped to a security group containing the deploying account.

**Analytics (post-launch, the Puglia BI move):** shortcut/mirror the app's SQL database into a lakehouse, small star schema (`DimRoom`, `DimStep`, `FactActivity`, `FactQuest`), Power BI report: funnel by room, deaths by cause, most-typed unrecognized commands, time per trial, completion rate, Hall of Fame. Material for a promptingbi.com post and an Explicit Measures segment.

## 12. Deployment

- Target workspace: the existing **Fabric Quest** workspace on the PBIC tenant (Tommy's call, 2026-09-22). Fabric Apps (preview) workload enabled.
- `npm create @microsoft/rayfin@latest -- pros-quest --workspace "Fabric Quest"` (Blank App, React). Entities under `rayfin/data/`, registered in `rayfin/data/schema.ts`.
- Local dev: `npm run dev` (Docker for the backend).
- Deploy: `npx rayfin login` → `npx rayfin up --dry-run` → `npx rayfin up` → `npx rayfin up status`. Frontend-only iterations: `npx rayfin up staticapp deploy`.
- The SQL database is read-only in the portal; schema changes only from code.
- Public URL is `https://<app>-app.rayfin.windows.net/`; a friendlier redirect from pugliabi.com or promptingbi.com can come later.
- Decorator names verified against the installed SDK (1.35.1): `@int`, `@date`, `@text({ max })` (every string field needs a `max` on MSSQL or the GraphQL schema can fail to build), `@anonymous()` shorthand preferred over `@role('anonymous', …)`. The code in §11 uses `@integer`/`@datetime` as shorthand for intent; the implementation uses `@int`/`@date`.

## 13. Testing

- **Parser table tests** (vitest): every synonym maps to its canonical verb; filler stripping; two-noun forms.
- **Golden path test**: a scripted list of commands plays the entire game and asserts `score === 200`, `won === true`, and exact turn count. This doubles as the walkthrough.
- **Death tests**: each death rule from a fresh state.
- **Rule-once test**: points never awarded twice.
- **World lint** (`scripts/lint-world.ts`, runs in CI/pre-commit): every exit targets an existing room; every item/NPC reference exists; rule ids unique; every room has a scene id with an image on disk.
- **Replay** (`scripts/replay.ts`): fetches a quest's Activity rows (or reads a JSON export) and re-runs them through `step`, diffing output — makes any bug report reproducible.
- **Playwright smoke**: title → name → `look` → `n` renders output and enqueues telemetry.

## 14. Build order

1. Engine + parser with tests (no content beyond a two-room fixture).
2. World content, all five regions, playable in the browser with placeholder scene boxes; golden-path test passes at 200.
3. Rayfin project, entities, telemetry queue, local dev against Docker backend.
4. Art pass (style locked to the reference video), image post-processing script, scene variants.
5. Death card, finish screen, Hall of Fame.
6. Deploy to PBIC workspace, enable anonymous access, smoke test the public URL.
7. Lakehouse shortcut + semantic model + Power BI report on play data.

## 15. Open items

- Final name: "Fabric's Quest" is the working title.
- Whether to show the Hall of Fame on the title screen as well as the finish screen (default: both).

## 16. Addendum — 2026-09-22 (evening), approved changes during play-testing

- **Name:** the game is **Fabric's Quest** (Rayfin app id `fabrics-quest`). "Village of Pro" stays as the peasant-class joke.
- **Scenes are code-drawn, not AI-generated.** Every room and variant (32 scene ids) is an SVG composed from a small AGI-style kit (`src/scenes/kit.tsx`: one-point-perspective interiors, exteriors, props, people, the dragon) in the 16-color EGA palette, stretched to 4:3 like a CRT. A PNG at `public/scenes/<sceneId>.png` still overrides a drawn scene, so AI or hand art can replace any room later without code changes. "Drawn a little wonky" is on-style and acceptable.
- **Message box.** A Sierra-style box (white ground, blue border, blue pixel text) appears over the scene for big moments: the welcome, any turn that scores points, door/gate/bridge openings, and whenever the player gets or examines an item that has a picture. Dismissed with Enter or a click; the same text is also in the text window.
- **Item pictures.** 16×16 pixel pictures for license, mug, credentials, scroll, hoodie, shortcut, both keys, cable, boots, the model, the report — shown in a black frame under the message box.
- **Boot + splash.** First load shows a black "CLICK ANYWHERE TO BOOT" screen (satisfies browser autoplay rules); the click plays the big startup jingle and runs the publisher splash — "PUGLIA BI presents" with one white pixel figure running across — then the title. This is the game's only animation. Clicking skips it.
- **Layout.** Panel widened to 860px; the scene stays 4:3 at up to 640px wide and centered; the text window fills all remaining height below it (full width) and scrolls internally, so the prompt is always pinned at the bottom.
- **Narrator foresight pass.** 60 phrase rules covering the verbs a peasant will inevitably type (dance, sing, sit, sleep, pray, cry, why, party, dig, swim, cheat, win, undo, git, publish…), several new instant deaths (`die`, attacking yourself, `rm -rf`, diving in the moat), a room-aware `smell`, a `look at me` that reflects your state, and Jeff interjecting every third turn in the village until pacified.

## 17. Deployment record — 2026-09-22

- Live at **https://early-coast-531f268ca6-centralus.webapp.fabricapps.net**. Workspace FabricQuest (`0d39df9e-b4aa-41ad-97ce-27eec6074e35`, Central US), AppBackend item `c8d31d60-56d7-4015-870e-175ecc619788`, SQL database `fabrics-quest`. Deployed by the Claude-Fabric-MCP service principal via `rayfin login --service-principal` (works despite the CLI reference saying otherwise).
- `staticHosting.assetAccess: public`; `auth.password.enabled: false`; Fabric auth left enabled but unused by the game.
- Entities carry `@authenticated('read')` in addition to the anonymous roles — required, or the data service fails to build its schema. Anonymous reads of Quest/Activity are denied (`AUTH_NOT_AUTHORIZED`), anonymous creates succeed, HallOfFame anonymous read exposes only the leaderboard columns.
- Verified live: full golden path to 200/200 in a headless browser; HallOfFame row written and read back through the anonymous API.
- Custom domains: not supported by Fabric Apps hosting today; a redirect or a reverse proxy in front of the fabricapps host are the options.
