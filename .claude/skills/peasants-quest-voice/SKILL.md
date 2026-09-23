---
name: peasants-quest-voice
description: Write text-parser game responses in the voice and response behavior of Homestar Runner's Peasant's Quest (2004) — a snarky second-person narrator that mocks the player, escalates on repeated commands, and breaks the fourth wall. Domain-agnostic: apply the style to whatever world the current game is about (Microsoft Fabric, baseball, office life, sci-fi), always using that game's own nouns, characters, and commands. Use when authoring response tables, unknown-command fallbacks, repeat-command escalations, refusals, death/fail text, item descriptions, NPC lines, or hint text.
---

# Peasant's Quest voice — a portable response engine

This skill supplies a **voice, a personality, and a response-behavior model**. It does
not supply a world. The world is whatever game is being built right now.

## Rule zero: the game's own world is the only world

- Use only the nouns, characters, verbs, locations, items, and commands **that exist in
  the game being written**. Derive them from the user's brief, design doc, or code.
- Never introduce Peasant's Quest characters, items, or places (no dragons, peasants,
  hay bales, baby, Kerrek, Jhonka, Trogdor, robes, wells) unless the target game
  actually contains them.
- Never invent the command vocabulary. Respond to the commands the game defines. If a
  needed command doesn't exist yet, say so and ask, or write the response so it works
  for the command the user named.
- The Peasant's Quest quotations in this skill and in `reference/` are **style
  reference only** — study the shape, the cadence, the cruelty, the timing. Then write
  the same shape with the target game's material.
- Jokes must come out of the game's own subject matter. A Microsoft Fabric game mocks
  capacity units, refresh failures, and gateway configs the way the original mocked
  berries and buckets. A baseball game mocks bunt signs, the batting glove ritual, and
  a manager who won't look at you.

## The narrator

Second person, present tense, contraction-heavy. The narrator watched you type that
and is unimpressed. It considers the player character a dim, cheap, faintly
disgusting loser who is nevertheless its guy. It is not in-period: it is a bored
modern American describing whatever setting the game has, and it will break the fourth
wall about the interface, the walkthrough, the art budget, and the game's own puzzles.
Every put-down hooks onto something the player just did — never free-floating
meanness, never mockery of the player's identity.

Underneath, it is fond. When the player finally wins, it is sincerely, warmly proud.

## Eleven rules of the voice

1. **Second person, present tense, casual contractions.** Short clauses. Reads aloud in
   one breath per sentence.
2. **Answer first, editorialize second.** State what happened or explicitly refuse, then
   snap. The player must never be confused about game state.
3. **Refuse with a reason that mocks the player, not the world.** Never "you can't do
   that." Always a specific, petty, slightly bureaucratic excuse rooted in the setting.
4. **Anachronism or register clash is the house joke.** Drop the wrong century, the
   wrong industry, or the wrong genre of vocabulary into the setting: insurance,
   HR policy, warranty language, sports-drink commercials, corporate onboarding,
   free breakfast buffets.
5. **Invent the player character's pathetic backstory as ammunition** — childhood
   habits, failed hobbies, relatives, high school. Keep it small and sad and specific.
6. **Break the fourth wall at the machine level:** the browser, the save file, the
   art in the foreground, the walkthrough the player obviously read, the things the
   team didn't bother to animate, the fact that this is a game with a parser.
7. **Nickname the player instead of naming them.** Sarcastic vocatives drawn from the
   game's domain and from slightly outdated pop culture. Rotate them; never settle on one.
8. **Deadpan understatement next to cartoon disaster.** Failure text is cheerful and
   four words long, not dramatic. Pick one fail sign-off phrase and use it every single
   time until it becomes the game's catchphrase.
9. **Misspell and mangle on purpose, consistently.** Invent two or three signature
   malaprops and broken-grammar tics, then reuse them exactly. Consistency turns a typo
   into a character.
10. **ALL CAPS on one or two words for emphasis.** Never italics, never bold, never emoji.
11. **Punchline last, and short.** Long setup, tiny kicker. Cut anything after the joke.

## Cadence

- **One-beat refusals:** 2–8 words. This is the most-used length in the game and the
  funniest. "Meh." energy.
- **Normal responses:** 1–3 sentences: statement → qualifier → snap.
- **Milestone responses (points, puzzle solved):** 3–6 sentences, and occasionally a
  full absurd epilogue that follows a trivial action out to a whole ruined life.
- **Trailing thoughts and self-interruption:** ellipses, "um," "er," "Naw," "Yeah but
  like," "Oh wait." The narrator changes its mind mid-sentence and repeats words for
  rhythm.
- **Questions thrown back:** when a command is well-formed but missing its object, ask
  snidely instead of erroring — "With what?" / "Where you wanna toss em?" / "Like where?"
- **Self-aware puzzle talk** when the player fishes for solutions: accuse them of
  inventing puzzles that aren't there.

## Response behavior model (the part that matters most)

State-aware responses are the personality. For every interactive object, write a
response for each state it can be in — and make the repeat case a *different joke*,
not the same string.

| Beat | What the narrator does |
|---|---|
| First valid use | Do it, award points, narrate with grudging warmth |
| Same command again | Acknowledge the repetition and be bored by *the player*: "we've been through this before" energy, with a callback to how it went |
| Already-done state | Flat contradiction plus a light insult |
| Logically void repeat | Absurdist deflection or a riddle instead of an error |
| Harmless grind the game allows | Let them, and mock the exercise they're getting |
| Silly gag command repeated | "You did that already," with fake nostalgia for the first time |
| Object consumed or gone | Elegiac joke about the past, as if mourning it |
| Right idea, wrong place | Confirm the idea, mock the geography, nudge toward the correct spot |
| Right idea, too far away | Mock the player's reach/aim and tell them to get closer |
| Repeated boredom on one screen | Escalate: mild jab → "do some questing already" → "you are an incredibly boring person" |
| Player types frustration or profanity | One gentle, unchanging consolation line — same reply every time |
| Player types anything with "cheat" | One dismissive syllable |
| Player tries to quit | Take it personally |

**Environment-sensitive variants.** The same command must read differently by
location, by time of day, by weather, by disguise or costume, by NPC state, by
progress stage, by decay/aging of a dead or used thing. A generic object that appears
on many screens should have a different joke on every screen, including one that
openly accuses the player of being out of ideas.

**Generic fallbacks.** Write these first; they are the most-read lines in the game.
Each needs attitude, and each needs to be recognizably from the same narrator:
unparsed input (point at HELP), unavailable noun, `look` at nothing, `use`/`give` at
nothing, talking to something that isn't there, asking about an unknown topic, typing
a direction when movement isn't typed, looking at something that is in (or was in)
inventory, and cheat attempts.

**Hint layer.** When the player is mid-set-piece and types something irrelevant, do not
refuse — interrupt with a bossy, in-character nudge that names the expected input.
Scripted beats should lock the parser to one expected answer and say so rudely.

**Meta commands are jokes too.** `help`, `where`, `inventory`, `save`, `load`, `quit`,
`smell`, `dance`, `die`, `why`, plus whatever the game's world suggests, all deserve
written-out gags rather than system messages. Inventory descriptions are a second
humor surface, not a data table: give every item a two-sentence blurb.

**Failure text.** Frequent, cheap, funny, and always the player's fault. One recurring
sign-off. Non-lethal failures can be worse than death (a curse, a demotion, a
transformation into someone's despised childhood classmate — in the target game's terms).

## Writing checklist

- [ ] Every proper noun in the line exists in *this* game.
- [ ] Second person, present tense, one breath per sentence.
- [ ] State is unambiguous after reading it.
- [ ] Exactly one joke move (see `reference/humor-taxonomy.md`), not three.
- [ ] The insult targets competence, hygiene, taste, love life, or boredom — never identity.
- [ ] A second identical command yields a different line.
- [ ] Not archaic-fantasy diction (that's a different register entirely), and not
      polite, and not epic.
- [ ] Failures end with the game's recurring sign-off phrase.

## Anti-patterns

- Importing the original game's characters, items, or setting into an unrelated game.
- Inventing commands the game doesn't implement, or telling the player what to type
  when the game has its own vocabulary.
- Ye-olde diction, Shakespeare pastiche, thee/thou.
- Politeness ("I'm sorry, you can't do that"), system-message tone, error codes.
- Epic gravitas, lore dumps, a narrator who admires the hero.
- Random non sequiturs with no hook in the player's input.
- Jokes with the punchline in the middle, or three jokes in one line.
- Emoji, exclamation spam, current-day internet slang.
- Meanness with no affection underneath.

## Reference files

| File | Use |
|---|---|
| `reference/adapting-to-any-domain.md` | The retargeting procedure: how to map this voice onto any subject (worked examples: Microsoft Fabric, baseball), plus the per-object response matrix to fill in |
| `reference/response-patterns.md` | Every response situation as a reusable pattern with slots, the shapes to imitate, and style-reference canon lines |
| `reference/humor-taxonomy.md` | The ~20 joke moves with examples, and how to build your own allusion layer |
| `reference/parser-mechanics.md` | How the original engine behaved: preprocessing, synonym tables, scoring, saves, minigames, death handling — engineering notes to copy |
| `reference/all-game-text-from-swf.txt` | Ground truth: 943 game-facing strings extracted from the shipped `peasantsquest61.swf`, plus 71 leftover debug traces. Style reference only — never lift its proper nouns into another game. |

## Sources

- Complete response index: [Peasant's Quest Responses, Homestar Runner Wiki](http://www.hrwiki.org/wiki/Peasant's_Quest_Responses)
- Game page, trivia, goofs, reference lists: [Peasant's Quest](http://www.hrwiki.org/wiki/Peasant's_Quest)
- Items: [Peasant's Quest Items](http://www.hrwiki.org/wiki/Peasant's_Quest_Items) · Walkthrough: [Peasant's Quest Walkthrough](http://www.hrwiki.org/wiki/Peasant's_Quest_Walkthrough)
- Narrator framing: [TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/PeasantsQuest) · Contrasting register: [Thy Dungeonman](http://www.hrwiki.org/wiki/Thy_Dungeonman)
- Play it / source of the extracted text: [homestarrunner.com/disk4of12](https://homestarrunner.com/disk4of12.html)
