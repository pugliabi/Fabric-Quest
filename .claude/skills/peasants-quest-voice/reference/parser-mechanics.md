# Parser mechanics of Peasant's Quest

> Style reference only. Study the shapes and cadence here, then write them with the nouns, characters, and commands of the game you are actually building. Do not import this game's world.


How the game actually works under the text box, reconstructed from the shipped
`peasantsquest61.swf` string table (constant pools, push literals, and leftover
`trace()` debug strings) plus the [Homestar Runner Wiki response index](http://www.hrwiki.org/wiki/Peasant's_Quest_Responses).

## Input model

- **Movement is not typed.** Arrow keys walk Rather Dashing; the walk continues until
  he hits something, you type text, or you press another direction
  ([StrategyWiki](https://strategywiki.org/wiki/Peasant's_Quest)). Typing a direction
  is punished: `go north` → "Use the arrow keys, pal. Just like a joypad only more
  like your day job." (`go `, `get `, `take `, `look `, `look at` all appear as bare
  prefix tokens in the string table).
- **Everything else is typed** into a single-line box, evaluated on Enter.
- `+` / `-` change walk speed (debug traces: `+ key pressed`, `- key pressed`).
- Some commands require **standing close to the object**; proximity failure gets its
  own snark rather than a silent no-op ("You can't reach from there.", "You're not
  that keen a shot. Try standing a little closer.", "Try standing closer to that
  crank.", "Who do you think you are, MJ? Try from a little closer.").
- Actions auto-walk the player to the target: debug traces `walking to well`,
  `Walking to pebbles`, `Taking pebbles`, `Got to hay jump`, `Tossing the bebe!`,
  `Hugging tree!`, `walkToThrowSwordAtTrogdor`.

## Preprocessing pipeline

Debug traces reveal the real pipeline:

```
preParse(pS): string in:        ← raw typed string
preParse(pS): illegal character in preParse - remove   ← strips : ! . ' ; ,
preParse(pS): string out:       ← normalized (lowercased; punctuation dropped)
parseForInventoryItem(pS) returned true   ← noun matched against inventory
parseAnyRoom()                  ← global commands tried before room-specific ones
displayText(): called
finishedEvent - remove event from queue and rerun displaytext
isObjL(): objL.length           ← per-room object list lookup
```

Design consequences worth copying:

1. **Punctuation and filler are ignored**, so wildly padded commands still work. The
   `look door` handler even echoes your exact words back: typing `look at the ugly
   brown door` yields `Listen to you, "look at the ugly brown door" What kinda gaming
   is that? It's a door and it's closed.` (The string table stores it as the two
   fragments `Listen to you, "` and `" What kinda gaming is that? ...`.)
2. **Global commands are resolved first** (`help`, `look`, `inv`, `where`, `map`,
   `save n`, `load n`, `quit`, plus joke words), then room-specific handlers, then
   inventory matching, then the generic fallbacks.
3. **Synonym lists are hard-coded per action**, not a general grammar — see below.

## Synonym tables (verbatim from the SWF)

The game brute-forces phrasings. Real examples of a single action's accepted forms:

| Action | Accepted strings |
|---|---|
| Say haldo to Dongolev | `mendelev says haldo`, `tell Dongolev haldo`, `tell the archer haldo`, `tell archer haldo`, `say haldo`, `tell man haldo`, `tell guy haldo`, `tell the man haldo`, `tell the guy haldo` |
| Give trinket (archers) | `trinket to archers`, `trinket to the archers`, `trinket to archer`, `trinket to the archer`, `trinket to brothers`, `trinket to guys`, `trinket to men` |
| Give trinket (baby lady) | `trinket to lady / peasant / woman / baby` each with and without `the` |
| Give riches | `riches to lady`, `riches to woman` |
| Weigh down bucket | `fill bucket`, `fill the bucket`, `stones in bucket`, `rocks in bucket`, `pebbles in bucket`, `in bucket` |
| Bucket, wrong idea | `stones in well`, `rocks in well`, `pebbles in well` |
| Baby + bucket | `baby in bucket`, `baby in the bucket`, `deploy baby`, `deploy q-baby` |
| Baby + well | `baby in well`, `baby in the well`, `baby in lake` |
| Baby + hole | `drop baby`, `drop the baby`, `use baby`, `use the baby`, `put baby in hole`, `shove baby in hole` |
| Throw baby | `throw baby`, `throw the baby` |
| Self-mutilation gag | `arms off`, `legs off`, `head off` |
| Knock gag | `knock until knuckles bleed`, `knock until your knuckles bleed`, `knock til knuckles bleed`, `knock door until knuckles bleed` |
| Enter a building | `open door`, `open the door`, `go through door`, `go through the door`, `inside house`, `inside hut`, `inside cottage` |
| Feed the fish | `feed fish`, `feed in water`, `feed in the water`, `feed in the lake`, `feed in lake`, `use feed`, `give feed`, `use chicken feed`, `given chicken feed` (sic) |
| Kerrek easter eggs | `make friends`, `buy kerrek`, `buy the kerrek`, `buy kerreck`, `buy the kerreck`, `cold one` |
| Kill Trogdor | `sword at trogdor`, `sword at dragon`, `sword at burninator`, `sword at monster` |
| Room at the inn | `get a room`, `get room` |
| Archery minigame | `play game`, `play the game`, `play again`, `play game again`, `play the game again`, `try game again`, `try the game again` |
| Quiz | `take the quiz`, `take quiz` |
| Ask/talk | `ask about`, `talk about`, `ask the`, `talk to`, `talk to the` |
| Berries | `search bush`, `reach in bush`, `get berries` |
| Misc verbs | `look in`, `look inside`, `look down`, `get in`, `climb in`, `go down`, `go up`, `put on`, `pick up`, `jump in`, `hide in`, `lie down`, `shake off`, `make wish`, `make a wish`, `empty drawer`, `empty dresser`, `open drawer`, `close drawer`, `rings on tree`, `hand over` |

Design lesson: **write synonyms per puzzle, generously, and give the near-misses
their own jokes** (`stones in well` → "Then it'd be tough to get them back. You never
go ANYwhere without your rocks").

## Command reference exposed to the player

The Blue Knight delivers the tutorial in-character on first talk:

> "Be sure to LOOK around lots. TALK to everyone you see and ASK ABOUT stuff. Type
> HELP if you get confused and INVENTORY to see your worldly stuff. Type SAVE or LOAD
> to save or load your game. Duh."

`HELP` itself prints:

> Type LOOK to see your surroundings. Type INVENTORY or INV to see your stuff. Type
> WHERE to see the name of the place you're in. Type SAVE or LOAD to save or load your
> game.
> Type MAP to read and maybe print your map of Peasantry

Also live: `get (item)`, `use (item)`, `throw (item)`, `give (item)`, `look (item)`,
`ask about (name)`, `talk (character)` ([game instructions](http://www.hrwiki.org/wiki/Peasant's_Quest)).

## Meta / system commands and their comedy

| Command | Response |
|---|---|
| `where` | "You're hanging out in {room name}." (Waterfall screen has no name — a known goof) |
| `map` before pickup | "We are neither confirming nor denying the presence of a map in this game, but irridisregardless, you don't have one." |
| `map` after pickup | "You peep the map." |
| `pwd` | `~peasantsquest/{location}` |
| `save` / `load` bare | "Como se dice 'huh?' You can save up to five games by typing \"save 1\" or \"save 2\" or \"save 3\" ... stop me when you catch on." |
| `load` malformed | "Sorry, I'm not picking up what you're putting down. To load a game type \"load 1\" for game saves 1-5" |
| save success | "Game saved to slot {n}. To load it again type \"load {n}" |
| save failure | "...failed. Make sure you have cookies enabled." |
| `save`/`load` near live Kerrek | "You can't be fumbling with a floppy while the Kerrek is bearing down on you." |
| `quit` | "Well fine Boring Sanders! Hope you saved your game cause it is OVER between us!!" (it really quits) |
| anything containing `cheat` | "Meh." |
| `die` | "That wasn't very smart. You dead." (it really kills you) |
| `smell` / `sniff` | "Smells like a computer game." |
| `boo` | "Scared me." |
| `why` | "I wish I knew." |
| `dance` | "You'd rather just stand here and soak in the scene." |
| `party` | "You are part of the Whig party. They are making gangrene-awareness their number one campaign priority." |
| `drink` (or drink anything) | "For simplicity's sake you are immune to hunger and thirst in this game. So you got that going for you." / "Which is nice." |
| anything containing `dan` | "Dan's still okay. Got a place on Dekalb with Rick and his wife. Slimmed up a bit and looking towards the future." |
| `this sucks`, `what the f---`, `give me a break` | "Come now. Don't get discouraged." |
| unparsed | "I don't understand. Type HELP for assistance." (variant: "...for assistances.") |

Screen names the game will admit to (`where`): Hidden glen · Poor Gary's glen ·
Kerrek tracks 1 · Old well · Yellow tree · That hay bale · That mud puddle · Archery
range · River and stone · Mountain pass · Cliff base · Jhonka's cave · Your
burninated cottage · Pebble lake west · Outside giant inn · Outside mysterious
cottage · Wavy tree · Kerrek tracks 2 · Outside baby lady cottage · Burninated trees
· Baby lady cottage · Inside giant inn · Mysterious cottage · Cliffland heights ·
Trogdor's outer sanctum · Trogdor's posh lair.

## Scoring

- Display: `Score : {n} of 150`; point awards are announced by a jingle plus the
  response text itself.
- Points are attached to *progress and to gags*: closing the drawer after stealing the
  robe is worth 1 point ("You already closed it, which was nice, and so we gave you
  some points. Let sleeping drawers lie.").
- The economy is exploitable on purpose-ish: `put baby in bucket` can be repeated for
  unlimited points, pushing the counter past 150
  ([GameFAQs](https://gamefaqs.gamespot.com/flash/922153-peasants-quest/cheats)).
- Perfect play is 150; the endgame tallies "Nice work on winning and everything. THE END".

## Inventory subsystem

`INV` opens a paged list; UI strings: "Press return for description", "Press ESC or
Backspace to exit", "Hit return to go back to list", "You no longer has this item."
(sic). Item blurbs are jokes in their own right — the inventory is a second humor
surface, not a data table:

- Arrow: "Boy, you sure know how to pick em! This arrow's kinda pointy even!!"
- Baby: "Awww! Peasant babies are adorable. No wonder they fetch such a pretty penny on the black market."
- Kerrek belt: "Phew! This thing stinks like all getout. Why couldn't the Kerrek have kidnapped a hot wench or something that you coulda saved?"
- Chicken feed: "Woah! Gold nuggets! Oh wait...This is just chicken feed. Crap."
- Pebbles: "Woah! Gray chicken feed! Oh wait... those are just pebbles. Heavier than they look, though."
- SuperTime FunBow TM: "This is a pretty fancy bow. You're surprised those shady archers give away such decent prizes. You half-expected gold fish in a bag."
- Monster maskus: "Man, those pagans sure can make a freaky lookin mask when they want to. It's like those theatre masks' evil uncle or something."
- Pills: "The innkeeper's medication says it's supposed to treat 'general oldness. May cause checkers playing, hiked-up pants, and overall pee smell.'"
- Riches: "Riches, dude. Riches. That peasant lady totally has to share some of this with you, right? At least that shiny, clawed sceptre thing."
- Robe: "A propa peasant robe. It smells freshly washed and has the initials 'N.N.' sewn onto the tag."
- Soda: "A full bottle of popular soda."
- Meatball sub: "A piping hot meatball sub fresh from the bottom of a dingy old well. All you need is a bag of chips and you've got a combo meal!"
- Super trinket: "This super trinket is weird. It looks like it could either kill you or make you the hit of your Christmas party."
- TrogHelmet: "The TrogHelmet is not screwing around. It's a serious helmet. It also protects against harmful UV rays."
- TrogShield: "Behold the TrogShield! No seriously, behold it. There's no way Trogdor's fire breath can penetrate this thing."
- TrogSword: "The TrogSword is for real. Hands-down the coolest item in this whole game. You can't wait to lop off that beefy arm of Trogdor's with this guy."
- Map: "What's brown and brown and read all over? This map!"
- T-shirt: "This has got to be your favorite T-Shirt ever. Oh, the times you had at Scalding Lake. Canoeing, fishing, stoning heathens. What a Blast!"

## Death handling

Deaths are frequent, cheap, and funny; the sign-off is a running gag rather than a
failure screen.

- Standard tag: **"You dead. Thanks for playing."** Variants: "Thanks for playing, and
  try not to die." · "Thanks for nothing." · "You dead. Maybe next time don't get too
  close." · "Wow. You sure dead. You had a good run, though. Thanks for playin." ·
  "Well, you not exactly dead. But..." (quiz failures).
- Deaths in canon: walking into the Kerrek; standing in Dongolev's arrow line;
  stealing an arrow too early; attacking Poor Gary; feeding yourself to a starving
  Poor Gary; leaving the screen after putting the baby down the well; answering `yes`
  to the Jhonka; typing `try` at the amputation gag; getting hit while climbing the
  cliff; approaching sleeping Trogdor; typing `die`.
- Quiz failures are non-lethal but game-ending: transformation into RON CUMBERDALE, or
  a curse of writing corny folk songs ("'Wheat Grows Sweet, But My Gal's Sweeter'").
- Failure text always blames the player: "Oops! You climbed real bad. You knew that
  you were AVOIDING the rocks right? Not collecting them."
- Trivia-adjacent: the wiki notes pterodactyl hits print "Hit by a rock!" — the SWF
  has both `Hit by a rock!` and `Hit by a bird`.

## Set-piece interruption states

While a scripted beat is live, ordinary commands are replaced by a nag (see SKILL.md
"Hint layer"). The Jhonka yes/no gate, the pot-on-head escape, the Keepers' demands,
and the awake-Trogdor countdown all lock the parser into a single expected input —
and say so rudely.

## Other mechanics worth stealing

- **Fake disk swap.** Mid-game the screen demands "Please insert floppy disk 2 into
  Drive B and press enter." then answers itself: "Disk read error." The URL is
  `disk4of12.html`.
- **Copyright 1982** on the title screen; loading screen mimics an Apple IIe boot.
- **Minigames inside the parser.** Archery (arrow keys + space bar, wind direction
  randomized per shot: `ar_updateWind(): New wind direction chosen`) and the cliff
  climb (dodge boulders and a pterodactyl). Scores get their own lines: "Not a single
  hit. Your game face must be on back-order. Maybe come back when your shipment comes
  in." / "Only 1 hit." / "Only 2 hits." / "Nice shootin! {n} hits."
- **Random pools.** Some responses pick from a set — the Jhonka's knock replies
  ("JUST US CHICKENS" / "NO FOR RENT!" / "I GIVE LAST YEAR!" / "GAVE AT OFFICE" /
  "GO WAY!") and the three scare-the-horse stories.
- **A timed cameo.** Naked Ned peeks from the wavy tree on a timer
  (`naked ned decided not to come out. Check again in ...`), and interacting scares
  him off: "'Never speak of this meeting!' says the nudie and he disappears."
