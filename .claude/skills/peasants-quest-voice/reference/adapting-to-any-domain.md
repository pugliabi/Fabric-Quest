# Retargeting the voice to any game

The voice is portable; the world is not. This file is the procedure for pointing the
same narrator at a different subject, plus two worked examples.

## Step 1 — Harvest the game's own material

Before writing a single line, list from the user's game (design doc, code, brief):

1. **Player character** — who they are, and what makes them mockable.
2. **Locations / screens** — with an internal name for each (the `where` command gag).
3. **Objects and items** — each with states: untouched, in use, taken, consumed, gone.
4. **NPCs** — one speech gimmick each, drawn from the domain's real-life archetypes.
5. **Verbs the parser implements** — plus the near-miss phrasings players will type.
6. **Set pieces** — moments where the parser locks to one expected input.
7. **Fail states** — what "you dead" means in this world.
8. **Scoring** — what the points are called, and the max.

Nothing outside this list may appear in the responses.

## Step 2 — Fix the five style constants

Choose once, then use everywhere so the game develops a signature:

| Constant | What it is | How to choose |
|---|---|---|
| Fail sign-off | The four-word catchphrase after every failure | Flat, cheerful, slightly wrong grammar |
| Malaprops | 2–4 misspellings/manglings reused verbatim | Mangle a term the domain uses constantly |
| Nickname pool | 10–20 sarcastic vocatives | Half from the domain, half from slightly dated pop culture |
| Anachronism axis | The register that keeps intruding | Pick the funniest clash with the setting |
| Fake brands | 3–6 invented products/companies | Twist real ones one syllable |

## Step 3 — Fill the response matrix for every object

For each interactive object, write a line per state. This table is the deliverable:

| Situation | Needed? |
|---|---|
| Look at it, first time | always |
| Look at it, after state change | if state changes |
| Use it correctly | always |
| Use it correctly a second time | always (different joke) |
| Use it too early (prereq missing) | if prereq exists |
| Use it from too far away / wrong screen | if position matters |
| Right idea, wrong object | usually |
| Take it, when it can't be taken | always |
| Take it, after already taking it | always |
| It's consumed/gone | if consumable |
| Destructive or cruel use | if plausible — reward the player with the best joke |
| Gag use players will try | at least one per object |

## Step 4 — Write the generic fallbacks in the domain's language

Unparsed input · unknown noun · look at nothing · use/give at nothing · talk to
nothing · ask about unknown · typing movement · looking at an inventory item · cheat
attempt · frustration/profanity · quit. These get read more than any puzzle line.

## Step 5 — Write the meta and inventory layer

`help`, `where`, `inventory`, `save`, `load`, `score`, `quit`, plus domain-native joke
commands players will try. Every item gets a two-sentence inventory blurb that is a
joke, not a description.

---

# Worked example A — Microsoft Fabric / BI workplace game

**Player character:** a junior analyst who inherited an unowned workspace.
**Screens:** The Lakehouse Floor · Semantic Model Basement · Gateway Closet · Capacity
Metrics App · The Governance Council Chamber · Somebody's Personal Workspace.
**Fail sign-off:** "You throttled. Thanks for reporting."
**Malaprops:** "refreshered", "capacitude", "one-lake" spelled "wunlake", "DAXxed".
**Nickname pool:** Mister Star Schema · Calculated Column Casey · Ctrl-Shift-Enter ·
Import Mode Ishmael · Sparkles · Power Query Pete · champ · guy.
**Anachronism axis:** enterprise HR/procurement language intruding on heroic quest
framing (change advisory boards, warranty voids, purchase orders, "please open a ticket").
**Fake brands:** Refreshr(tm), CapacityAde, Semantico Classic, DirectQuench.

Lines in the voice, using only this world's material:

- `look model` → "It's a semantic model. Forty-one tables and not one relationship you'd take home to your mother."
- `refresh model` (first) → "You kick off the refresh. Eleven minutes later it succeeds, which you will now take personal credit for in two separate meetings."
- `refresh model` (again) → "We've already done this bit and it went fine, ya? The data hasn't changed. Neither have you."
- `refresh model` (no gateway) → "The gateway's offline. It's been offline since the guy who set it up took a job at a company that appreciates him."
- `get capacity` → "You probably WISH you could get that. Capacity is bought by people with badges nicer than yours."
- `delete workspace` → "Bold. You delete the workspace. Somewhere, a director's favorite bookmark breaks and a Teams message begins composing itself. You throttled. Thanks for reporting."
- `add calculated column` → "Sure, add a calculated column. Add nine. Your model is a Word document now, and I say that with love."
- unparsed → "I don't understand. Type HELP, or file a ticket like a real professional."
- `where` → "You're hanging out in the Gateway Closet."
- inventory blurb, Pro license → "A Pro license. It gets you in the building and absolutely no capacity. Framed on your wall next to a participation ribbon."

Note what did *not* happen: no dragon, no peasant, no hay. The jokes come from
gateways, licenses, and meetings.

---

# Worked example B — Baseball game ("RBI"-style)

**Player character:** a career minor-leaguer who got called up in September.
**Screens:** On Deck Circle · The Cage · Dugout Steps · Third Base Coach's Corner ·
Bullpen Bench · Clubhouse Spread.
**Fail sign-off:** "You struck out. Thanks for swinging."
**Malaprops:** "batterin' glove", "runs battered in", "the ol' horsecowhide".
**Nickname pool:** Slugger · Mendoza · Mr. Launch Angle · Bunt Kid · Cooperstown ·
Sunflower Seeds · pal · champ.
**Anachronism axis:** analytics-department jargon intruding on old-timey baseball
superstition (exit velocity, WAR projections, "per our shift policy").
**Fake brands:** Pine-Tacky, Gatorlyte Classic, WARometer, Chaw-Nots.

Lines in the voice:

- `look coach` → "He's giving you a sign. Could be steal, could be bunt, could be an itch he's had since 1998."
- `adjust batting gloves` (first) → "You adjust the gloves. Both of them. Twice. The pitcher waits, the crowd waits, your batting average waits."
- `adjust batting gloves` (again) → "You done that already. A great time was had by all, mostly by you."
- `swing` (bad count) → "You swing at a pitch that was headed for the parking lot. Somewhere in the front office, a spreadsheet updates itself and sighs."
- `steal second` (too slow) → "Who do you think you are, prime Rickey? You're forty feet of good intentions and a bad hamstring."
- `eat sunflower seeds` → "You work through half a bag. The dugout floor is now a crime scene and you are the suspect, the witness, and the weather."
- `take the quiz`-style set-piece nudge → "The coach wants a yes or a no, Slugger. Just answer him."
- inventory blurb, lucky bat → "Your lucky bat. Zero home runs, but you did once hit a double off a guy who's an accountant now."

---

# Quality test before shipping a retarget

1. Cover the game's proper nouns with a word list; every response should draw only from it.
2. Read ten random responses aloud; if any could belong to a different game's world, rewrite it.
3. Check that at least a third of your lines are under nine words.
4. Check that every object has at least one repeat-command line and one gag line.
5. Check that the win text is genuinely kind.
