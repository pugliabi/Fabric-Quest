import type { PhraseRule, Rule, World } from './types';
import type { GameState } from '../engine/types';
import { sigilStatus } from './items';
import { CHEAT, CHEAT_AGAIN, FRUSTRATION, nick } from './voice';
import { whereText } from './where';
import { ADE, ADE_DEATH } from './deaths';

/**
 * Matched against raw lowercase input BEFORE parsing. First match wins.
 * This is where the narrator's foresight lives: every dumb thing a peasant might type.
 */
export const PHRASE_RULES: PhraseRule[] = [
  // ---- Instant deaths (Press X to die) ----
  // The skill's death shape (spec1 §5.4): the kill sentence, then the blame sentence; the engine appends the sign-off.
  { id: 'death.die', test: /^(die|kill me|kill myself|end it|perish)$/, text: 'You die, just like that, no dragon required. Your mom told you this game had a dragon in it and you did this instead.', death: 'death.die' },
  { id: 'death.attack-self', test: /^(attack|hit|punch|fight|stab|kill)\s+(me|myself|self|yourself)$/, text: 'You attack yourself, and nobody in the realm tries to stop you. It works, which is a first for one of your plans.', death: 'death.attack-self' },
  { id: 'death.delete-workspace', test: /^(delete|drop|remove|nuke)\b.*workspace/, text: 'You delete the workspace. You were in it.', death: 'death.delete-workspace' },
  { id: 'death.rm-rf', test: /rm -rf|format c:|drop database/, text: 'You run it, and the realm, to its credit, had a backup. You did not.', death: 'death.rm-rf' },
  { id: 'death.paginated', test: /paginated.*jeff|jeff.*paginated/, text: "You offer Jeff a paginated report, and his eyes go dark. He was not built for this, and neither were you.", death: 'death.paginated' },
  { id: 'death.import', test: /^import\b.*(lake|onelake)|^(use|get|take|open)\b(?!.*\b(pebble|stone)\b).*(the )?(onelake|lake)$/, room: 'lake.shore', text: 'You Import the OneLake into Power BI Desktop, and your laptop becomes a small sun. Nice one, Import Mode Ishmael.', death: 'death.import' },
  { id: 'death.swim-moat', test: /^(swim|dive|jump)\b.*(moat|in)?/, room: 'fortress.bridge', text: "You dive into the Moat of T-SQL, which is made entirely of nested subqueries, and you will always be in there. Report Builders can't swim; it's in the license.", death: 'death.swim-moat' },

  // ---- Classic verbs the parser was always going to be asked ----
  // ---- Greetings from another realm (triggers only; the lines are ours) ----
  { id: 'egg.fhqwhgads', test: /fhqwhgads/, text: 'Come on, everybody, to the Lakehouse. It is not a good song.' },
  { id: 'egg.system-down', test: /^the system is down/, text: 'The system is not down. It is throttled. There is a difference, and the dragon would like you to learn it.' },
  { id: 'egg.deleted', test: /^deleted?!?$/, text: 'DELETED! …the command, that is. Your quest remains, regrettably, undeleted.' },
  { id: 'egg.preeow', test: /^pre+e*ow/, text: 'That is the sound of a scheduled refresh starting. Or a floppy disk. Nobody alive remembers which.' },
  { id: 'egg.throw-baby', test: /^throw (the )?baby/, text: 'There is no baby in this realm. This is a data platform. Please stop looking for one.' },
  { id: 'egg.other-realm', test: /^(strong ?bad|homestar|the cheat|kerrek|jhonka|dennis|marzipan|coach z|bubs|pom pom|king of town|poopsmith)\b/, text: 'You call out a name from another realm. A monk looks up, hopeful, then no: different realm, better computer.' },
  { id: 'egg.beefy', test: /(consummate v|beefy arm|majesty)/, text: 'The dragon here has no beefy arm. He has an F2 and opinions.' },
  { id: 'egg.email', test: /^(check )?(sb)?e-?mail\b/, text: 'You check your email. 47 unread. All of them are Jeff. All of them say "Excel?"' },
  { id: 'egg.dos', test: /^(dir|ls|cd |cd$|reboot|ctrl.?alt.?del|format|defrag)\b/, text: 'This is not that kind of prompt. It is a worse kind.' },
  // ---- Bodily functions. The realm has a policy. ----
  {
    id: 'egg.pee',
    test: /^(pee|piss|wee|urinate|take a (leak|whiz)|relieve myself|go to the bathroom|go potty)\b/,
    text: (s, w) => {
      const region = w.rooms[s.room]?.region;
      if (region === 'lake') return 'You relieve yourself into the OneLake. Somewhere, a lineage view updates. It has your name on it.';
      if (region === 'swamp') return 'The marsh does not notice. The marsh has seen worse. The marsh is worse.';
      if (region === 'monastery') return 'The monks pause their chanting. Then resume, slightly faster.';
      if (region === 'fortress') return 'The guards write it down. Everything in the Keep is logged, and this now has a row in the audit table.';
      if (region === 'peaks') return 'It freezes instantly. It is billed per second until it thaws.';
      if (s.room === 'village.cottage') return 'In your own workspace? There is a well outside. Show some governance.';
      return 'In the square? Jeff from Finance looks up, mildly impressed, then goes back to waiting for his export.';
    },
  },
  { id: 'egg.poop', test: /^(poop|poo|crap|defecate|take a (dump|poop|crap)|number two)\b/, text: 'You leave a small unstructured file. It will be ingested on Monday, by someone who did not sign up for this.' },
  { id: 'egg.fart', test: /^(fart|toot|break wind|pass gas)\b/, text: 'A small burst of Spark. Nobody claims it. The session timer restarts.' },
  { id: 'egg.puke', test: /^(spit|vomit|puke|throw up|barf|hurl)\b/, text: 'You add to the data lake. Quality, as always, varies by source.' },
  { id: 'egg.sudo', test: /^sudo\b/, text: 'You are not in the sudoers file. This incident will be reported to your capacity admin.' },
  // "analyze in excel" is not here: outside Excel the exact phrase enters the side quest; inside, the Data tab's rules need it.
  {
    id: 'egg.excel', test: /export.*excel|^excel\b|to excel/,
    text: (s, world) => (world.rooms[s.room]?.region === 'excel'
      ? 'You are already in Excel. This is as exported as it gets.'
      : 'The game exports itself to Excel. 1,048,576 rows later, it stops. Nothing has changed.'),
  },
  { id: 'egg.calculate', test: /^calculate\b/, text: 'CALCULATE what? Context is everything.' },
  // Not "ask copilot …": that opens the Copilot side quest. This is for asking some other AI, which Copilot answers anyway.
  { id: 'egg.copilot', test: /^(ask|hey|use|talk to) (the |an? )?(ai|chat ?gpt|chatbot|llm|robot)\b/, text: "Copilot, uninvited: 'Great question! To bake sourdough, first feed your starter…' It has confidently answered a different question." },
  { id: 'egg.xyzzy', test: /^(xyzzy|plugh|plover)$/, text: "A hollow voice says: 'Direct Lake.'" },
  { id: 'egg.refresh', test: /^refresh\b/, text: 'You refresh. Nothing changes, but it feels productive.' },
  { id: 'egg.dax', test: /^(dax|write dax|write a measure|measure)\b/, text: 'You write a measure. It returns BLANK(). It always returns BLANK(). You are beginning to suspect the problem is you.' },
  { id: 'egg.select-star', test: /^select \*/, text: (s) => (s.room === 'fortress.throne' ? 'The Duke did not hear you. Say it louder.' : 'Not here. This is not even a Warehouse. Say it to the Duke and get corrected.') },
  { id: 'egg.dance', test: /^(dance|boogie|jig)\b/, text: 'You dance, poorly. It will be discussed at standup.' },
  { id: 'egg.sing', test: /^(sing|hum|whistle)\b/, text: 'You sing the DAX song. It has one verse, and the verse is CALCULATE. Birds leave.' },
  { id: 'egg.jump', test: /^(jump|hop|leap)\b/, text: 'You jump. Owing to interactive delay, you land next Tuesday.' },
  { id: 'egg.sit', test: /^(sit|sit down|rest|relax|chill)\b/, text: 'You sit. Ah. Nice. This is the most productive you have been all quest.' },
  { id: 'egg.sleep', test: /^(sleep|nap|lie down|go to bed|snooze)\b/, text: 'You lie down. A scheduled refresh runs across your face at 2 AM. You wake up throttled.' },
  { id: 'egg.smell', test: /^(smell|sniff)\b/, text: (s) => (s.flags['trial.moat']
    ? 'You smell yourself. Warehouse. Deeply, permanently, Warehouse. You have never been prouder.'
    : 'You smell of Pro license and mild panic. The Shrine will not accept this.') },
  { id: 'egg.eat', test: /^(eat|bite|chew|consume|nom)\b/, text: "You are not eating that. There's no telling what its data type is." },
  { id: 'egg.pray', test: /^(pray|worship|kneel|beg)\b/, text: 'You pray to the Capacity Admin. The Capacity Admin is at lunch. The Capacity Admin is always at lunch.' },
  { id: 'egg.kiss', test: /^(kiss|hug|cuddle|marry|love|flirt|date)\b/, text: 'The realm has an HR department. It is a Lakehouse. Your incident has been landed in Bronze.' },
  { id: 'egg.cry', test: /^(cry|weep|sob)\b/, text: 'You cry. Your tears are semi-structured. Somebody will have to flatten them later.' },
  { id: 'egg.scream', test: /^(scream|aaa+)\b/, text: "You scream. It echoes back as an error: 'Scream failed. Retry?'" },
  { id: 'egg.think', test: /^(think|ponder|meditate|reflect)\b/, text: "You think. A dialog appears: 'Thinking… this may take several minutes.' It does." },
  { id: 'egg.why', test: /^(why|but why|why me)\b/, text: 'Because someone in Finance asked for it in 2019 and nobody has been brave enough to remove it since.' },
  { id: 'egg.party', test: /^(party|celebrate|rave)\b/, text: 'You party. Three people show up. All of them are Jeff.' },
  { id: 'egg.swim', test: /^(swim|dive|bathe|wade)\b/, text: (s) => (s.room.startsWith('lake') || s.room.startsWith('swamp')
    ? 'You swim. The water is exactly one lake deep. You surface three workspaces over, unharmed but Shortcut-ed.'
    : 'There is nothing to swim in here except your own inadequacy, and you are already doing that.') },
  { id: 'egg.dig', test: /^(dig|excavate|burrow)\b/, text: "You dig. Beneath the soil: more soil, then a Parquet file, then a note reading 'DO NOT DIG HERE — Ops'." },
  { id: 'egg.climb', test: /^(climb|scale)\b/, text: 'You climb. Nothing here is climbable, so you climb a hierarchy instead. Parent-child. Ragged. You fall off a ragged bit.' },
  { id: 'egg.push', test: /^(push|pull|shove|drag)\b/, text: 'You push. Nothing moves. Somewhere, a pull request is opened against your behavior.' },
  { id: 'egg.kick', test: /^(kick|stomp|smash|break)\b/, text: 'You kick it. The realm logs a Sev 2. You are the Sev 2.' },
  { id: 'egg.throw', test: /^(throw|toss|hurl|chuck)\b/, text: 'You wind up to throw it, then remember you are a Report Builder. You put it down gently and apologize to it.' },
  { id: 'egg.buy', test: /^(buy|pay|sell|purchase|bribe|tip)\b/, text: 'The realm accepts only Capacity Units. You have a Pro license and, possibly, a mug. Neither is legal tender.' },
  {
    id: 'egg.cheat', test: /^(cheat|hack|god mode|iddqd|idkfa|konami)\b/, text: '',
    then: { text: (s) => ((Number(s.flags['cheat.count']) || 0) === 0 ? CHEAT : CHEAT_AGAIN), set: { 'cheat.count': (v) => (Number(v) || 0) + 1 }, outcome: 'snark' },
  },
  { id: 'egg.win', test: /^(win|beat game|finish|skip to end|end game)\b/, text: 'You cannot simply win. You must be Worthy. Have you read the notice board? You have not read the notice board.' },
  { id: 'egg.undo', test: /^(undo|ctrl z|go back|rewind)\b/, text: "There is no undo. There is only 'restore', and it only works if you saved, which — look at you." },
  { id: 'egg.laugh', test: /^(lol|haha|lmao|rofl|hehe)\b/, text: 'The realm does not laugh. The realm is a governed tenant.' },
  { id: 'egg.self', test: /^(look at (me|myself|self|yourself|you)|who am i|examine (me|self|myself|yourself|you)|x me)$/, text: (s) => {
    const bits = [
      'You look at yourself. A Report Builder from the Village of Pro.',
      s.worn.includes('hoodie') ? 'You are wearing a hoodie you did not earn by writing code.' : 'No hoodie. You look like someone who imports CSVs.',
      s.flags['trial.moat'] ? 'You smell of the Moat, permanently.' : 'You smell fine, which is a problem.',
      s.worn.includes('boots') ? 'Your boots are bursting.' : 'Your shoes are Pro-tier.',
      "You look like someone who has typed 'export to excel' at least once. You have.",
    ];
    return bits.filter(Boolean).join(' ');
  } },
  { id: 'egg.fly', test: /^(fly|flap|soar|levitate)\b/, text: 'You flap. You are not a Dataflow. You do not flow. You do not fly.' },
  { id: 'egg.lick', test: /^(lick|taste)\b/, text: 'You lick it. It tastes of stale metadata. Please stop.' },
  { id: 'egg.listen', test: /^(listen|hear)\b/, text: 'You listen. Somewhere, a refresh fails softly. Somewhere else, a Spark session starts. It is always starting.' },
  { id: 'egg.hide', test: /^(hide|sneak|crouch|stealth)\b/, text: 'You hide. The Card visual finds you immediately. It shows (Blank), which is where you were hiding.' },
  { id: 'egg.talk-self', test: /^(talk to (me|myself|self)|talk)$/, text: 'You talk to yourself. You are the only one in the realm who listens, and even you are not really listening.' },
  { id: 'egg.hello', test: /^(hello|hi|hey|yo|sup|greetings)\b/, text: 'The realm does not say hello back. The realm is busy refreshing.' },
  { id: 'egg.thanks', test: /^(thanks|thank you|ty)\b/, text: 'You are welcome. This is the first gratitude the realm has received since 2019. It does not know what to do with it.' },
  { id: 'egg.sorry', test: /^(sorry|apologize|my bad)\b/, text: 'Apology logged. Outcome: no change. Same as every retrospective.' },
  // Profanity anywhere in the line, or a bare interjection as the whole line ("ugh", "argh", "dammit", "seriously"): the
  // one unchanging line. (A leading "ugh " is a wrapper the engine strips first; a bare "ugh" reaches here.)
  { id: 'egg.swear', test: /\b(damn|hell|crap|wtf|ffs|fuck|shit)\b|^(ugh+|argh+|dammit|damn it|seriously|jeez|grr+|bah|hmph|omg)$/, text: FRUSTRATION },
  { id: 'egg.please', test: /^please\b/, text: 'Manners will not help you here. Two words. Verb, noun.' },
  { id: 'egg.what', test: /^(what|huh|wat|what now|what do i do)\??$/, text: "What indeed. Try 'look'. Try 'help'. Try, as a last resort, 'get ye flask'." },
  { id: 'egg.plot', test: /^(plot|graph|chart|visualize|make a chart)\b/, text: 'You make a chart. It is a pie chart. It has 31 slices. The realm looks away.' },
  // Publishing happens from Desktop, which is My Workspace (WORKSPACE_PHRASES, village.ts); the Keep has its own line.
  { id: 'egg.publish', test: /^(publish|deploy|ship)\b/, text: 'Publish from where? You are not in Desktop.' },
  { id: 'egg.git', test: /^git\b/, text: "The realm does not have version control. The realm has 'Sales_v3_FINAL_final2.pbix'." },
  { id: 'egg.dragon-name', test: /^trogdor\b/, text: 'A different dragon. A different realm. This one only throttles.' },
  { id: 'egg.boo', test: /^(boo|scare|spook)\b/, text: 'Boo. Nobody is scared. The realm has seen a 400-column table.' },
  { id: 'egg.dad', test: /^(who are you|who is this|narrator)\b/, text: 'I am the narrator. I have watched eleven thousand Report Builders die in the Bronze Marsh. You are not special. You are, so far, alive.' },
  { id: 'egg.magic', test: /^(cast|abracadabra|magic|spell|alakazam)\b/, text: 'You cast a spell. It is CALCULATETABLE. Nothing in the realm is prepared for it, least of all you.' },
  { id: 'egg.count', test: /^(count|how many)\b/, text: 'COUNT is not supported here, peasant. Select fewer fields and count them yourself.' },
];

/** The 'get ye flask' egg: a nudge in every room. */
const yeFlask: Rule = {
  id: 'egg.flask',
  when: { verb: 'get', noun: ['ye flask', 'flask', 'ye olde flask', 'the flask', 'thy flask'] },
  then: {
    text: (s: GameState, world: World) => {
      const room = world.rooms[s.room];
      const hint = room ? `A hollow voice adds: "${room.flaskHint(s)}"` : 'A hollow voice adds nothing.';
      return `Ye cannot get ye flask.\n${hint}`;
    },
    set: { 'flask.count': (v) => ((typeof v === 'number' ? v : 0) + 1) },
    outcome: 'snark',
    sfx: 'flask',
  },
};

const HINT_TEST = /^(hint|hints|clue|what now|what next|i'?m stuck|i am stuck|stuck|help me)\??$/;
const hollow = (s: GameState, w: World): string => `A hollow voice adds: "${w.rooms[s.room]!.flaskHint(s)}"`;
/**
 * `hint` and friends: the flask hint without the flask (spec1 §3.4). Registered right after GOAL_PHRASES (world/index.ts),
 * so `what now` reaches the hint before egg.what does. The pane copy is needed because a prompt room skips global phrases.
 * The engine treats a `hint.*` turn as the hint delivered: it resets the narrator's stuck counter (step.ts, finish() 8).
 */
export const HINT_PHRASES: PhraseRule[] = [
  { id: 'hint.pane', room: 'copilot.pane', test: HINT_TEST, text: hollow },
  { id: 'hint.main', test: HINT_TEST, text: hollow },
];

const WHERE_TEST = /^(where|where am i|where is this|where are we|location|what room is this)\??$/;
const whereLine = (s: GameState, w: World): string => whereText(s, s.room) ?? `You're hanging out in ${w.rooms[s.room]!.name}.`;
/**
 * `where` and bare `why` (spec1 §5.2). Registered right before PHRASE_RULES (world/index.ts): `egg.why-bare` must beat
 * `egg.why` (which keeps "why me" / "but why"), and the pane copy of `where` is needed because a prompt room skips global
 * phrases. `where` is the player's word; god mode's search stays `locate`.
 */
export const VOICE_PHRASES: PhraseRule[] = [
  { id: 'where.pane', room: 'copilot.pane', test: WHERE_TEST, text: whereLine },
  { id: 'where.main', test: WHERE_TEST, text: whereLine },
  { id: 'egg.why-bare', test: /^why\??$/, text: 'I wish I knew.' },
];

const JEFF = ['jeff', 'jeff from finance', 'finance', 'man'];

const SQUEEZES = [
  'You squeeze. It is oddly calming. It is also oddly deprecated.',
  'You squeeze the cube. The OLAP face stares back. It has been processing since 2008. So, you realize, have you.',
  'Squeeze. Release. Squeeze. Your forearm is now a star schema.',
];

export const GLOBAL_RULES: Rule[] = [
  yeFlask,
  {
    id: 'global.use-shortcut',
    // Only a real use: "fix shortcut" / "label shortcut" parse as use too, and must not teleport you.
    when: { verb: 'use', verbWord: ['use', 'apply'], noun: ['shortcut', 'signpost', 'sign', 'onelake shortcut', 'pointer'], has: ['shortcut'] },
    then: { text: 'You take the Shortcut. No data was moved.', moveTo: 'lake.shore', outcome: 'success', sfx: 'door' },
  },
  {
    id: 'global.wear-hoodie',
    when: { verb: 'wear', noun: ['hoodie', 'hoodie of spark', 'spark hoodie', 'black hoodie'], has: ['hoodie'], flags: [{ flag: 'trial.hoodie', not: true }] },
    then: {
      // The milestone names you (spec1 §5.2, Task F3): the canon "Now you're lookin like a serious peasant" shape, with a nickname.
      text: (s) => `You pull on the Hoodie of Spark. You look like a Data Engineer, and nobody can tell you have never written a notebook. Now you're lookin' like a serious Engineer, ${nick(s)}.`,
      set: { 'trial.hoodie': true }, wear: ['hoodie'], sfx: 'item',
    },
  },
  {
    id: 'global.wear-boots',
    when: { verb: 'wear', noun: ['boots', 'bursting boots', 'pair of boots', 'boot'], has: ['boots'] },
    then: { text: 'You lace up the Bursting Boots. You feel faster, and slightly over budget.', wear: ['boots'], sfx: 'item' },
  },
  {
    id: 'monastery.read-scroll',
    when: { verb: 'read', noun: ['scroll', 'spark scroll', 'pyspark scroll'], has: ['scroll'] },
    then: {
      text: "You read the Spark Scroll. df = spark.read.format('delta').load(path). Then, in smaller letters: # TODO: figure out the path. You feel enlightened and slightly worried.",
      points: 5, outcome: 'success',
    },
  },
  // ---- Room texture (spec §18): red herrings that work wherever you carry them ----
  {
    id: 'global.wear-lanyard',
    when: { verb: 'wear', noun: ['lanyard', 'fabcon lanyard', 'conference lanyard', 'badge'], has: ['lanyard'], flags: [{ flag: 'lanyard.worn', not: true }] },
    then: { text: 'You put on the FabCon lanyard. You now look like you belong. Nobody checks. Nobody ever checks.', wear: ['lanyard'], set: { 'lanyard.worn': true }, outcome: 'snark' },
  },
  {
    id: 'global.wear-name-tag',
    when: { verb: 'wear', noun: ['name tag', 'tag', 'nametag', 'hello tag'], has: ['name tag'], flags: [{ flag: 'name-tag.worn', not: true }] },
    then: { text: 'You stick it on. HELLO MY NAME IS Column3. It suits you. Nobody will ever rename you, because nobody will ever open you.', wear: ['name tag'], set: { 'name-tag.worn': true }, outcome: 'snark' },
  },
  {
    id: 'global.squeeze-stress-ball',
    when: { verb: 'use', noun: ['stress ball', 'ball', 'cube', 'stress cube', 'olap cube'], has: ['stress ball'] },
    // Escalates, then settles on the last line: the grind is allowed, and mocked.
    then: {
      text: (s) => SQUEEZES[Math.min(Number(s.flags['stress.squeezes']) || 0, SQUEEZES.length - 1)]!,
      set: { 'stress.squeezes': (v) => (Number(v) || 0) + 1 },
      outcome: 'snark',
    },
  },
  {
    id: 'global.read-license',
    when: { verb: 'read', noun: ['license', 'card', 'license card', 'pro license'], has: ['license'] },
    then: { text: 'POWER BI PRO. Valid until: someone notices. Holder: you. Capacity: none.', outcome: 'success' },
  },
  {
    id: 'global.use-license',
    when: { verb: 'use', noun: ['license', 'card', 'license card', 'pro license'], has: ['license'] },
    then: { text: 'You wave your Pro License Card. Nothing in the realm respects it. A monk somewhere feels a brief, unexplained pity.', outcome: 'fail' },
  },
  {
    id: 'global.look-sigils',
    when: { verb: 'look', noun: ['sigils', 'sigil'] },
    then: { text: (s) => (s.room === 'peaks.ledge' ? sigilStatus(s) : 'There are no sigils here. Sigils are a Peaks thing.'), outcome: 'success' },
  },
  {
    id: 'global.say-star-elsewhere',
    when: { verb: 'say', noun: ['star schema', 'a star schema', 'the star schema'] },
    then: { text: 'You say "star schema" to no one in particular. A nearby table quietly normalizes itself.', outcome: 'snark' },
  },
  // The CapacityAde kills you anywhere you carry it (deaths.ts); on the Pass, the room's own rule answers first.
  { id: 'death.capacityade-carried', when: { verb: 'drink', noun: ADE, has: ['capacityade'] }, then: { text: ADE_DEATH, death: 'death.capacityade' } },
  {
    id: 'global.drink-mug',
    when: { verb: 'drink', noun: ['coffee', 'mug'] },
    then: { text: 'The mug is empty. It has been empty since the last refresh. You drink the idea of coffee.', outcome: 'fail' },
  },
  {
    id: 'global.drink-nothing',
    when: { verb: 'drink' },
    then: { text: 'Drink what? The realm is dry. Even the moat is mostly syntax.', outcome: 'fail' },
  },
  {
    id: 'global.attack-jeff',
    when: { verb: 'attack', noun: JEFF },
    then: { text: 'You hit Jeff from Finance. He just wanted an export, and he asks for it again, more quietly.', outcome: 'fail' },
  },
  {
    id: 'global.give-jeff-anything',
    when: { verb: 'give', noun2: JEFF, flags: [{ flag: 'jeff.pacified', not: true }] },
    then: { text: (s) => `Jeff turns it over. "Can you export this to Excel?" He hands it back. ${s.inventory.includes('mug') ? '' : 'He looks, briefly, at your empty hands, as if they might hold a mug.'}`.trim(), outcome: 'fail' },
  },
  {
    id: 'global.talk-dragon-elsewhere',
    when: { verb: 'talk', noun: ['dragon', 'throttlor'] },
    // At the Shrine the room's own talk rule (peaks.talk-dragon) answers first while he is there.
    then: { text: 'You address the dragon. The dragon is on a mountain. You are not. This is, for now, the best arrangement.', outcome: 'snark' },
  },
  {
    id: 'global.open-anything',
    when: { verb: 'open', noun: ['inventory', 'bag', 'pockets'] },
    then: { text: 'You open your pockets. See "inventory". See also: a mug-shaped absence.', outcome: 'meta' },
  },
  {
    id: 'global.attack-anything',
    when: { verb: 'attack', noun: ['everything', 'everyone', 'all', 'world', 'realm'] },
    then: { text: 'You attack the realm. The realm is a managed service. It scales. You do not.', outcome: 'fail' },
  },
];

export const SNARK: string[] = [
  "You can't do that. Not with a Pro license.",
  'That command has been deprecated. Like Dataflows Gen1.',
  "The realm does not recognize that verb. Have you tried 'look'?",
  'Nothing happens. A capacity admin somewhere frowns.',
  'You try. The realm returns HTTP 429: Too Many Requests.',
  "That's not a thing. Even in preview.",
  'You mutter the words. A nearby Lakehouse quietly ignores you.',
  'The parser stares at you the way the Card visual stares at (Blank).',
  'Try again, peasant. Two words. Verb, noun.',
  'Your command has been placed in a queue. The queue is infinite.',
  'That would require a Premium capacity, and look at you.',
  'Error: the operation completed successfully. Nothing happened.',
  "Ye cannot do that. Ye can, however, type 'help'.",
  'The realm has smoothed your request over the next 24 hours.',
  'I understood the verb. I understood the noun. I am choosing not to.',
  'That is a feature request. It has been added to the backlog, which is also a swamp.',
  'The narrator has seen many peasants try that. None of them are here now.',
  "Something went wrong. That's the whole error. Microsoft has been notified; you have not.",
  'Direct Lake can\'t do that. It falls back to DirectQuery, and then to you.',
  'The SQL endpoint hasn\'t synced that yet. Check back in a minute. Or a week.',
  'Your capacity is throttled. Interactive operations are delayed, and that was one.',
  'A gateway is required for that. The gateway is on a laptop. The laptop is closed.',
  "That's in preview. Preview means it works, on a Tuesday, for the person who demoed it.",
  // The voice pass (spec1 §5.2): the same narrator, less patient.
  "I don't understand. Type HELP, or open a ticket like a real professional.",
  'Two words, Ctrl-Shift-Enter. Verb, then the thing.',
  'Naw.',
  'Listen to you. What kinda gaming is that? Two words.',
];

export const HELP_TEXT =
  'Two words, peasant. Try: look, look at <thing>, get <thing>, drop <thing>, use <thing> on <thing>, talk to <someone>, say <words>, give <thing> to <someone>, read <thing>, wear <thing>, wait, open <thing>, board boat, n/s/e/w/out, inventory, score, save, restore, restart, quit (ends the quest and lets you post your score). When lost: get ye flask.';

/** Jeff will not let it go. Every third turn near him, until pacified (or until his Excel quest proves the report right). */
export function ambient(s: GameState): string | null {
  if (s.flags['jeff.pacified'] || s.flags['sq.excel.done']) return null;
  if (s.room !== 'village.square' && s.room !== 'village.fields') return null;
  if (s.turns % 3 !== 0) return null;
  const lines = [
    'Jeff from Finance, hovering: "So… Excel?"',
    'Jeff from Finance clears his throat. "Just a quick export. Whenever."',
    'Jeff from Finance holds up his empty spreadsheet like a menu. "Anything? Any export?"',
    'Jeff from Finance: "It doesn\'t have to be formatted. Just… all of it."',
  ];
  return lines[(s.turns / 3) % lines.length]!;
}
