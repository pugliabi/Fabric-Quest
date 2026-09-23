# Fabric's Quest — Governance: the Sacristy, the Town Hall, My Workspace, Applied Steps, and side-quest onboarding

**Date:** 2026-09-23 · **Status:** approved in chat (Tommy) · **Builds on:** `2026-09-22-side-quests-design.md` (side quests, bonus, Keep) and `2026-09-22-pros-quest-design.md` (core).

## 1. Summary

Five things, one theme — *the settings that break Power BI people's day*:

1. **Side-quest onboarding rework** — both side quests state their goal when you walk in, keep a `goal` command, and lead you step by step (Tommy's playtest: "Jeff is complaining about numbers mismatching, I don't know how to get to the pivot table").
2. **The Sacristy** — a new Monastery room: the Admin Portal. Books on a shelf are real Fabric **tenant settings**; a ledger on a lectern holds real **capacity settings**. `turn on` / `turn off` a book and the world changes: Jeff loses Export, Copilot vanishes, the monks can't make Notebooks, the whole org floods the Square, the Peaks' delay comes back, or you die. Two errands pay bonus.
3. **The Town Hall** — off the Village Square. A clerk who says "That's an admin setting." to everything and escalates support tickets. The comedic front door that points at the Sacristy.
4. **My Workspace** — the cottage's proper name, with a `publish` command that offers only this workspace — or, with Publish to Web on, the entire internet.
5. **Applied Steps in order** — Power Query Hall's query is broken; rebuild it step by step, in order, or get the real `Expression.Error`. +10 bonus.

Bonus total rises from 45 to **70** (+10 Abbot's errand, +5 governance restored, +10 applied steps). The 200-point main ledger is untouched and the golden path (69 turns) does not change: every setting's **default keeps the current behavior**.

Rulings from Tommy: settings that "break the game" are **deaths** (Block public internet, Pause capacity — both); the Sacristy is **open to anyone**, with a warning sign.

## 2. Side-quest onboarding rework

### 2.1 Goal card on entry

Entering a realm shows a **message box** (the Sierra box, like a points box) stating the goal, then the room description. New engine field `RuleThen.box?: string` → `StepResult.box?: string`; `App.tsx` shows `box` with the same priority as a points box (before `notice`; if both, `box + '\n\n' + notice`). The entry `then` in `sidequests.ts` sets it:

- **Excel:** `JEFF'S EXCEL — Jeff's export says $4.7M. The report says $4.2M. Make his PivotTable match the report. Ask Jeff what he used, connect Analyze in Excel (the Data tab, north), build the pivot (east) with the right region, measure and filter, then show Jeff. +20 bonus. EXIT leaves any time.`
- **Copilot:** `COPILOT — Get one number out of Copilot: Q4 2025 Northeast net sales, from the certified model. Copilot would rather show you everything else. Type your question at the prompt. +25 bonus. EXIT leaves any time.`

The box is shown on every entry (also re-entry), not just the first.

### 2.2 `goal` in a realm

Phrase rule, region-scoped to `excel` and `copilot`: `goal`, `objective`, `what do i do`, `what am i doing`, `what is the goal`, `why am i here` → the goal text from §2.1 (without the header) plus the current stage line from §2.3. Outside a realm, `goal` → "Find the Golden Semantic Model. Read the notice board if you forgot how. (Inside a side quest, GOAL tells you that quest's goal.)"

### 2.3 Stage hints (flask + goal + Jeff)

**Excel** stages, derived from flags; the flask hint, `goal`, and `ask jeff` all say the *same next step* (Jeff says it in character):

| Stage | Condition | Next-step line |
|---|---|---|
| 0 | `!excel.jeff.asked` | "Ask Jeff what he used: `ask jeff`." — Jeff (talk): "I used Sales Region, Net Sales, and the year. Twenty twenty-five. I think. Can you just… connect it properly? Data tab. North." |
| 1 | asked, `!excel.connected` | "Go north to the Data tab and `use analyze in excel`, then `sign in`." |
| 2 | connected, `!excel.pivot` | "Go to the PivotTable (Sheet1 east) and `create pivot table`." |
| 3 | pivot, missing dim/measure/filter | "Add what's missing: `use sales region` / `use net sales` / `filter by year`." — the line names only the missing ones |
| 4 | all three, `!sq.excel.done` | "Back to Sheet1 (west) and `show jeff`." |
| 5 | done | "You fixed Jeff's export. That was the whole quest. `exit`." |

**Copilot**: the pane hint stays rung-driven (`RUNG_HINTS`) but the first-time hint becomes the goal itself: "Ask for Q4 2025 Northeast net sales from the certified model. Start anywhere; Copilot will tell you what it wants." The Gallery hint is unchanged. Jeff's pacified line in the Square already invites `help jeff`; the Copilot trigger gets a village hint too: the notice board gains a line "Copilot is available in this tenant. Ask it about sales at your own risk." (`read board` unchanged in points).

### 2.4 In-realm `help`

The realm line already appended to `help` ("Type EXIT to leave …") gains the goal: `help` inside a realm ends with `GOAL repeats the objective; GET YE FLASK says the next step.`

## 3. The Sacristy (Admin Portal)

### 3.1 Room

- `monastery.sacristy`, name **The Sacristy**, region `monastery`. Reached `up` from the Cloister (a spiral stair; Cloister gains `u: 'monastery.sacristy'`; Sacristy has `d: 'monastery.cloister'`). Scene: a stone room, a tall bookshelf of thin books with toggles for spines, a lectern with a ledger, a sign.
- `enterQuip`: "A sign says FABRIC ADMINISTRATORS ONLY. Under it, smaller: everyone here is an admin. It was easier."
- `describe`: "The Sacristy. The Admin Portal, in stone. A shelf of thin books, each with a switch for a spine — the Tenant Settings. A lectern holds the Capacity Ledger. A sign warns you. Nobody enforces the sign. The stair is down." Then a status line: `Changed from default: <n>` (or "Everything is at its default. Bless.").
- Items (scenery, all examinable): `shelf`, `sign`, `lectern`, `ledger`, `stair`, plus one item per book (§3.3) so `look at export` works.
- Deaths here are normal (not a side realm).

### 3.2 Commands (phrase rules scoped to the room, plus room rules)

| You type | Effect |
|---|---|
| `settings`, `tenant settings`, `list settings`, `look at shelf` | Lists every book: `[ON ] Export to Excel`, `[OFF] Guest users can access Fabric` … with `*` on any that differs from default |
| `capacity settings`, `look at ledger`, `read ledger` | Lists the capacity settings the same way |
| `read <book>`, `look at <book>` | The book's description (§3.3), its current state, and what it does *here* (one line, the consequence in narrator voice) |
| `turn on <book>`, `enable <book>`, `turn off <book>`, `disable <book>`, `toggle <book>`, `flip <book>` | Flips it. Reply: the flip line from §3.3, then the line **"It can take up to 15 minutes for a setting change to take effect for everyone in your organization. It takes effect now."** Flipping to the state it is already in: "It is already <on/off>. You click it anyway. Nothing changes. It felt good." |
| `turn on everything`, `enable all`, `turn off everything`, `disable all` | "You are not that kind of admin. One book at a time." (`fail`) |
| `reset settings`, `restore defaults`, `defaults` | Restores every setting to default in one turn: "You put every book back the way you found it. The organization notices nothing. That is the job." (then §5's +5 if earned) |
| `get <book>` | "The books are bolted to the shelf. Governance." |
| `delegate <book>` | "Delegated to capacity admins. The capacity admin is also you. You feel the weight of it." (no state change) |

Book names match by any distinctive word or the full title (`turn off export`, `turn off export to excel`, `disable copilot`, `turn on guests`, `turn on block public internet`, `pause capacity`). Ambiguous → "Which book? <the candidates>".

Setting state lives in flags: `ts.<key>: boolean` (absent = default). Helper `setting(s, key)` returns the effective boolean.

### 3.3 The Tenant Settings shelf

Defaults are chosen so a fresh game behaves exactly as today. Each row: key · title (real Fabric setting name) · default · description (narrator paraphrase of the Learn text) · **effect while non-default** · flip lines.

| Key | Title | Default | Effect when flipped away from default |
|---|---|---|---|
| `export` | **Users can export data** (Export to Excel, Analyze in Excel) | ON | OFF: `show me a table` / `help jeff` / `yes` → no entry: "Export is disabled by your administrator. Jeff looks at you the way a man looks at a locked fridge." Inside Excel the Data tab's `use analyze in excel` (if already inside when… impossible; flips happen in the Sacristy) — no in-realm handling needed. Village Jeff: talk adds "…and now Export is off. Was that you?" |
| `copilot` | **Users can use Copilot and other features powered by Azure OpenAI** | ON | OFF: every Copilot trigger → no entry: "Copilot is not available in your tenant. Contact your administrator. You are your administrator." The board line (§2.3) reads "Copilot is not available in this tenant." |
| `fabricItems` | **Users can create Fabric items** | ON | OFF: Spark Chamber `use scroll on notebook` → "Notebook creation is disabled for your tenant. Brother Pandas creates a Power BI report instead. It has one card. It says 1." (`fail`, no points, flag unchanged); Brother Pandas talk: "I can make a report. I can make a dashboard. I cannot make a Notebook. Who did this." Golden path breaks until ON. |
| `publishToWeb` | **Publish to web** | **ON** (the errand, §7) | ON: the cottage `publish` offers "the entire internet" (§7). Village board gains "The prophecy has been published to web. 4,112 views." while ON. |
| `guests` | **Guest users can access Microsoft Fabric** | OFF | ON *and* `publishOrg` ON → **the flood** (§3.5). |
| `publishOrg` | **Publish apps to the entire organization** | ON | see `guests` |
| `blockInternet` | **Block Public Internet Access** | OFF | ON → **death** the same turn (§4). |
| `feedback` | **Product Feedback** (in-product surveys) | OFF | ON: every 5th turn (turns % 5 === 0) the output gains a trailing survey line, rotating: "[Survey] How likely are you to recommend this <region> to a colleague? (0–10)", "[Survey] Was this dragon helpful?", "[Survey] Rate your refresh." Typing a bare number 0–10 anywhere while ON → "Thank you. Your participation is voluntary. It was not." (`snark`). |
| `usageMetrics` | **Per-user data in usage metrics for content creators** | OFF | ON: every 4th turn a trailing line: "Usage metrics: Jeff viewed this room 14 times.", "Usage metrics: someone in Finance opened your report at 2:14 a.m.", "Usage metrics: you. It was you." |
| `monitoring` | **Workspace admins can turn on monitoring for their workspaces** | OFF | ON: the cottage / My Workspace description gains "A read-only Eventhouse hums in the corner. It is logging this sentence." `look at eventhouse` → "It has already logged that you looked." (The game really does log every command; the README says so.) |
| `discover` | **Discover content** (Make certified content discoverable) | ON | OFF: the Model Gallery's gold-badge model loses its plinth label: "A model with a gold badge and no name. Discovery is off. You will have to guess." (Copilot still wins on the same prompt; the hint just gets harder.) |

Every book also has a `read` description: two sentences in narrator voice paraphrasing the Learn description, ending with the effect line ("Here, that means: …"). Titles are the real setting names; the narrator never invents settings.

### 3.4 The Capacity Ledger

| Key | Title | Default | Effect |
|---|---|---|---|
| `pause` | **Pause capacity** | OFF | ON → **death** (§4). |
| `autoscale` | **Autoscale** | OFF | ON: the Peaks' interactive delay (step.ts rule 4) is skipped even without the Boots; every 10th turn: "A bill arrives. Autoscale: 1 CU-hour. Finance would like a word." |
| `surge` | **Surge protection** | OFF | ON: Throttlor's description gains "He is wearing a hard hat. Surge protection." and `look at throttlor` mentions it. No mechanics. |
| `xmla` | **XMLA endpoint: Read Write** | ON | OFF: the Model View's `n` exit to the Monastery Gate closes: "The back gate is an XMLA endpoint. Your capacity admin set it to Off. Your capacity admin is you." Golden path breaks until ON. Also `fortress.model` flask hint mentions it while OFF. |
| `workloads` | **Fabric workloads delegated to capacity** | ON | OFF: same as `fabricItems` OFF (the Learn text says this setting can be managed at capacity level) — the Spark Chamber line adds "(Delegated. Also off.)" |

### 3.5 The flood (give everyone access)

While `guests` ON and `publishOrg` ON, flag `gov.flood` is effectively true (computed, not stored):

- Village Square description gains: "The entire organization is here. Jeff from Ops. Jeff from HR. A Jeff you do not recognize. They all have a question about the report." `talk to jeff` in the Square while flooded → "Which Jeff." then the normal line.
- **Interactive delay everywhere**: step.ts rule 4 applies in every room, boots or not (`(…interactive delay…)`, +2 turns).
- Throttlor (Shrine) description: "Throttlor is enormous today. The whole organization is refreshing at once."
- Flipping either book OFF ends it: "The organization files out. Jeff from Ops takes a mug. Not yours."

### 3.6 God mode

`settings` in burninate mode works anywhere (lists both shelves); `set <key> on|off` works anywhere as a god command (`god.set`). `locate settings` → the Sacristy.

## 4. Two deaths

- **Block Public Internet Access → ON**: output: "Keep in mind, turning this on could take 10 to 20 minutes to take effect. It takes four seconds. You are on the public internet. You were." Death card: "You blocked public internet access. From the public internet. Someone will need to finish the set-up process in Azure. It will not be you." `die: true` on the flip rule. The setting is NOT persisted (the restore/restart puts you back before it).
- **Pause capacity → ON**: "You pause the capacity. Everything stops. The refreshes. The dragon. The part of you that was running on it." Death card: "You paused the capacity you were standing on. Capacities are billed per second. So, it turns out, are peasants." `die: true`.

Both are ordinary deaths (Sierra card, restore/restart), counted in `deaths` like any other, listed in the ledger's death table under the Sacristy.

## 5. Errands (bonus)

- **The Abbot's errand (+10, `pointsKey: gov.abbot`)**: in the Cloister, once `gate.open`, `talk to abbot` adds (after the hoodie business, or before it — independent): "Also. Someone published the prophecy to web. The whole internet can read it. Go up to the Sacristy and turn it off. I would, but I am a monk, not an admin. Those are different vows." Flag `gov.errand`. Turning `publishToWeb` OFF while `gov.errand` and not yet paid → the flip line plus "+10. The prophecy is private again. 4,112 people already read it." `bonus: 10`. Turning it OFF *before* talking to the Abbot → no points then; talking to the Abbot afterwards: "…and it is already off. You are ahead of me. +10." (same pointsKey, awarded on that talk).
- **Governance restored (+5, `pointsKey: gov.restored`)**: once any setting has been flipped away from default (`gov.touched` set on first flip), returning *every* setting to default — by individual flips or `reset settings` — pays +5 once: "Every setting is back where you found it. Nobody will ever know. +5 for governance." The errand's `publishToWeb` OFF counts as non-default for this purpose? **No** — after the errand, `publishToWeb` OFF is the new default (the world stores `gov.errandDone` and the default flips). Otherwise the two bonuses fight.

## 6. The Town Hall

- `village.hall`, name **Town Hall**, region `village`. From the Square: `u` ("up the steps") and `in`; Town Hall `d` and `out` → Square. Square description gains "The Town Hall is up the steps." Scene: a counter, a clerk, a bell, a poster, a queue rope with nobody in it.
- `enterQuip`: "Take a number. There is one number. It is 1."
- NPC **the Clerk** (`clerk`, `admin`, `receptionist`). `talk to clerk` rotates: "That's an admin setting." / "That would be an admin setting." / "Admin setting. Next." / (4th) "…the admins are at the Monastery. Up the stair from the Cloister. In the Sacristy. They do not come out, and they do not answer tickets." `ask clerk about <anything>` → "That's an admin setting." `give <anything> to clerk` → "That's an admin setting." except the ticket (below). `say <anything>` → "Noted. That's an admin setting."
- Items: `ticket` (a support ticket on the counter, gettable: "SEV-3: 'report is wrong'. No further details."), `bell` (ring → "The clerk looks up. 'That's an admin setting.'"), `poster` (read → "TENANT SETTINGS ARE NOT A SECURITY MEASURE. — the Learn docs, on the wall, in a frame."), `rope`, `counter`.
- `give ticket to clerk` → "Your ticket has been escalated. Estimated response: three business dragons." Ticket consumed; flag `hall.ticket`. Later `talk to clerk` adds "Your ticket is In Progress. It has been In Progress since you left." No points.
- Flask hint: "Nothing to win here. The clerk will tell you where the admins are if you keep talking."

## 7. My Workspace

- The cottage keeps its id `village.cottage`; its **name** becomes **My Workspace**; describe: "Your cottage. My Workspace, officially. Nobody else can see in. That is the point, and also the problem. …" (rest unchanged). The README/how-to-play sample screen updates.
- `publish` (phrase rule, cottage only; elsewhere: "Publish from where? You are not in Desktop."): "Publish to which workspace? · My Workspace" — and while `publishToWeb` ON: " · The entire internet". Then:
  - `say my workspace` / `publish to my workspace` / `my workspace` → "Published. To yourself. Your report is now available to you, in the workspace you were already in. Success." (`snark`)
  - `the entire internet` / `publish to web` / `publish to the internet` while ON → **death**: "You publish to web. The embed code is beautiful. The dragon has your report. So does everyone." Card: "You published to web. The prophecy said nothing about this, because the prophecy is also on the web now."
  - while OFF → "Publish to web is disabled by your administrator. For once, thank them."

## 8. Applied Steps in order (Power Query Hall)

The hall's query is broken; a room item `query` ("Sales — 7 steps, 1 error") and the `steps` item (`look at steps`) list the chain with state. Order and commands (phrase rules scoped to `fortress.hall`, each with synonyms):

| # | Step | Commands |
|---|---|---|
| 1 | Source | `source`, `add source`, `get data`, `apply source` |
| 2 | Navigation | `navigate`, `navigation`, `apply navigation`, `pick table` |
| 3 | Promoted Headers | `promote headers`, `promoted headers`, `use first row as headers` |
| 4 | Changed Type | `change type`, `changed type`, `detect type` |
| 5 | Filtered Rows | `filter rows`, `filtered rows`, `filter` |
| 6 | Removed Other Columns | `remove other columns`, `removed other columns`, `remove columns` (replaces the existing `fortress.remove-columns` rule) |
| 7 | Renamed Columns | `rename columns`, `renamed columns`, `rename` |

State: `pq.step` = highest step applied in order (0–7). Applying step k when `pq.step === k-1` → success line ("Source: the server name is wrong. It has been wrong since the migration. It connects anyway.", "Navigation: you pick Sales. There are three tables called Sales. You pick the right one, which is not the first one.", "Promoted Headers: Column1 becomes Region. Column2 becomes Net Sales. Column3 stays Column3.", "Changed Type: everything is text. Then everything is number. Then the dates are wrong. Using Locale.", "Filtered Rows: the Total row at the bottom goes away. It was inflating everything by exactly 100%.", "Removed Other Columns: the hall grows shorter. So does your refresh.", "Renamed Columns: 'Column3' becomes 'Year'. The hall applauds. Refresh complete.") — step 7 also pays **+10 bonus** (`pointsKey: pq.done`, `bonus: 10`, sfx `bonus`), sets `pq.done`, and the Custom1 portrait's look text changes to "Custom1: = Table.AddColumn(#"Renamed Columns", "Custom", each 1). It was a placeholder. It shipped."

Out of order (step k when `pq.step < k-1`) → the real error, and every step after the last good one turns yellow: `pq.step` stays. Error table (first matching row):

| Attempt | Error |
|---|---|
| anything before Source | `Formula.Firewall: Query 'Sales' references other queries or steps, so it may not directly access a data source. Please rebuild this data combination.` |
| Promote/Change/Filter/Remove/Rename before Navigation | `Expression.Error: The key didn't match any rows in the table.` |
| Change Type / Filter / Remove / Rename before Promoted Headers | `Expression.Error: The column 'Region' of the table wasn't found. Details: Column1` |
| Filter / Remove / Rename before Changed Type | `Expression.Error: We cannot convert the value "Total" to type Number. Details: Value=Total Type=[Type]` |
| Remove / Rename before Filtered Rows | `Expression.Error: We cannot convert the value "Total" to type Number.` (the Total row is still there) |
| Rename before Removed Other Columns | `Expression.Error: The column 'Column3' of the table wasn't found.` |

Each error is followed by one narrator line: "Every step after it turns yellow. You are back at <last good step>." Re-applying an already-applied step: Changed Type → "Changed Type1. Power Query adds a new one. It always will." (no state change); others → "<Step> is already applied. Clicking it again shows you the past. Everything after it greys out, waiting." (no state change). After `pq.done`, any step → "The query refreshes. 4.2M. It was always 4.2M."

Flask hint in the hall gains a leading clause while `!pq.done`: "The query is broken at step <k+1>: <step name>. (`look at steps`.)" before the existing hint. `look at query` → the state list, e.g. `✓ Source ✓ Navigation ✓ Promoted Headers ✗ Changed Type (yellow) · Filtered Rows · Removed Other Columns · Renamed Columns`.

## 9. Engine changes (additive)

- `RuleThen.box?: string`, `StepResult.box?: string` (§2.1). `App.tsx` shows `box` like a points box.
- A **governance layer** `src/engine/governance.ts`: `setting(s, key)`; `isFlood(s)`; `applyGovernance(prev, result, world)` called from `finish()` **after** quirks: trailing survey/usage/bill lines (§3.3, §3.4), flood delay (§3.5), autoscale delay skip. Pure, tested.
- step.ts rule 4 (Peaks delay) becomes: delay if `(onPeaks && !boots && !autoscale) || flood`.
- `PhraseRule` scope `room` already exists; the Sacristy commands are room-scoped phrase rules with a dynamic handler `dynamic: 'setting'` resolved in `src/world/sacristy.ts` (parse the book name, flip, compose the reply, set `die` when needed).
- Exits as functions already exist (Monastery gate) — the Model View's `n` and the flood/fabricItems gating use the same pattern.
- Bonus: existing `RuleThen.bonus` + `pointsKey`.
- World: `src/world/sacristy.ts` (room, books, ledger, commands), `src/world/townhall.ts`, `src/world/applied-steps.ts`; village/monastery/fortress/lake/peaks edits are small hooks. `SETTINGS` catalog is data: `{ key, title, shelf: 'tenant'|'capacity', default, read, on, off, effect }`.
- Lint: every catalog entry has non-empty `title`, `read`, `on`, `off`; every book title maps to an item in the Sacristy; the seven steps' phrase ids are unique per scope.

## 10. UI / audio

- Scenes: `monastery.sacristy` (shelf, lectern, sign, stair), `village.hall` (counter, clerk, bell, poster). Kit only; no new assets.
- Sfx: `toggle` (a two-note click: up for ON, down for OFF), `survey` (a soft "ding-dong" for the survey line), reuse `bonus`, `death`, `refresh` (if present, else `bonus`) for step 7.
- The status bar is unchanged. God-mode `settings` listing prints in the text window.

## 11. Docs and telemetry

- README: "31 rooms · N items · 15 characters · 200 points + 70 bonus"; the sample screen says MY WORKSPACE; a paragraph on the Sacristy ("real tenant settings; flip them and find out"); hints rows for the Town Hall, the Sacristy, the applied steps.
- how-to-play: `goal`, `publish`, `settings`, `turn on/off`, the step commands.
- ledger: bonus table 70; the three new bonus entries; the three new deaths; the map gains the Sacristy (up from the Cloister) and the Town Hall (up from the Square).
- building-and-deploying: layout block (sacristy.ts, townhall.ts, applied-steps.ts, governance.ts), how to add a setting (catalog entry + effect hook + test).
- Telemetry: setting flips are ordinary Activities (rule ids `sacristy.<key>.on|off`), so a Power BI report can count who turned what off. No schema change.

## 12. Testing

- `tests/sidequest-onboarding.test.ts`: entry sets `box` for both realms (and on re-entry); `goal` inside each realm returns the goal + the right stage line; Excel stage lines 0→5 track the flags; `ask jeff` at stage 0 names Sales Region / Net Sales / 2025 and says "Data tab"; `help` in a realm mentions GOAL and GET YE FLASK; outside, `goal` gives the main-quest line.
- `tests/sacristy.test.ts`: listing shows all books with default states; `read` each book; flip on/off/toggle/already-on; ambiguous name; `reset settings`; each effect: export off blocks entry (all three triggers), copilot off blocks entry, fabricItems off breaks the notebook then on fixes it, xmla off closes the gate then on opens it, feedback survey on turn multiples + numeric reply, usage lines, monitoring eventhouse line, discover off relabels the gallery, autoscale skips the peaks delay + bill line, surge line, flood: description + delay in the cottage + ends on either flip; deaths: blockInternet and pause set `dead` with the card text, and after restore the setting is back to default.
- `tests/errands.test.ts`: Abbot errand both orders, +10 once; restored +5 once, not paid when nothing was touched, not fighting the errand.
- `tests/townhall.test.ts`: reachability from the Square (`up`, `in`), clerk rotation reaching the Sacristy pointer, ticket give/escalate, poster, bell.
- `tests/my-workspace.test.ts`: name, `publish` menu with/without publishToWeb, both outcomes, `publish` elsewhere.
- `tests/applied-steps.test.ts`: the happy chain pays +10 once; every out-of-order row's error text; yellow line names the last good step; repeat-step lines; Changed Type1; flask hint stage; `look at query`.
- Golden path: unchanged, 200 in 69 turns. Golden + side quests: 200 + 45 still. New: golden + a Sacristy detour that flips xmla off/on, publishToWeb off after the Abbot, and reset → 200 + 15 bonus; golden + applied steps → 200 + 10.
- Lint + e2e smoke unchanged; one e2e assertion that entering Excel shows the goal box.

## 13. Out of scope

Real tenant-settings API; per-user/group setting scopes; delegation to capacity admins as mechanics; the Gateway Shed and Manual the scarecrow (§16 leftovers, still open); more capacity settings; a Sacristy scene with per-book art.
