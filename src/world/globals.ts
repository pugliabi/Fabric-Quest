import type { PhraseRule, Rule, World } from './types';
import type { GameState } from '../engine/types';
import { sigilStatus } from './items';

/**
 * Matched against raw lowercase input BEFORE parsing. First match wins.
 * This is where the narrator's foresight lives: every dumb thing a peasant might type.
 */
export const PHRASE_RULES: PhraseRule[] = [
  // ---- Instant deaths (Press X to die) ----
  { id: 'death.die', test: /^(die|kill me|kill myself|end it|perish)$/, text: 'You die. Just like that. No dragon required. The realm makes a note of your efficiency.', death: 'death.die' },
  { id: 'death.attack-self', test: /^(attack|hit|punch|fight|stab|kill)\s+(me|myself|self|yourself)$/, text: 'You attack yourself. Nobody in the realm tries to stop you. It works. Efficient, if bleak.', death: 'death.attack-self' },
  { id: 'death.delete-workspace', test: /^(delete|drop|remove|nuke)\b.*workspace/, text: 'You delete the workspace. You were in it.', death: 'death.delete-workspace' },
  { id: 'death.rm-rf', test: /rm -rf|format c:|drop database/, text: "You run it. The realm, to its credit, had a backup. You did not.", death: 'death.rm-rf' },
  { id: 'death.paginated', test: /paginated.*jeff|jeff.*paginated/, text: "You offer Jeff a paginated report. Jeff's eyes go dark. He was not built for this. Neither were you.", death: 'death.paginated' },
  { id: 'death.import', test: /^import\b.*(lake|onelake)|^(use|get|take|open)\b.*(the )?(onelake|lake)$/, room: 'lake.shore', text: 'You attempt to Import the OneLake into Power BI Desktop. Your laptop becomes a small sun.', death: 'death.import' },
  { id: 'death.swim-moat', test: /^(swim|dive|jump)\b.*(moat|in)?/, room: 'fortress.bridge', text: 'You dive into the Moat of T-SQL. It is deeper than it looks and made entirely of nested subqueries. You are still in there. You will always be in there.', death: 'death.swim-moat' },

  // ---- Classic verbs the parser was always going to be asked ----
  { id: 'egg.sudo', test: /^sudo\b/, text: 'You are not in the sudoers file. This incident will be reported to your capacity admin.' },
  { id: 'egg.excel', test: /export.*excel|^excel\b|to excel|analyze in excel/, text: 'The game exports itself to Excel. 1,048,576 rows later, it stops. Nothing has changed.' },
  { id: 'egg.calculate', test: /^calculate\b/, text: 'CALCULATE what? Context is everything.' },
  { id: 'egg.copilot', test: /^(ask )?copilot\b/, text: "Copilot: 'Great question! To bake sourdough, first feed your starter…' It has confidently answered a different question." },
  { id: 'egg.xyzzy', test: /^(xyzzy|plugh|plover)$/, text: "A hollow voice says: 'Direct Lake.'" },
  { id: 'egg.refresh', test: /^refresh\b/, text: 'You refresh. Nothing changes, but it feels productive.' },
  { id: 'egg.dax', test: /^(dax|write dax|write a measure|measure)\b/, text: 'You write a measure. It returns BLANK(). It always returns BLANK(). You are beginning to suspect the problem is you.' },
  { id: 'egg.select-star', test: /^select \*/, text: (s) => (s.room === 'fortress.throne' ? 'The Duke did not hear you. Say it louder.' : 'Not here. The Duke would hear you, and there is no moat nearby to land in.') },
  { id: 'egg.dance', test: /^(dance|boogie|jig)\b/, text: 'You dance. Your Pro license does not include dancing. You dance anyway, poorly, in a way that will be discussed at standup.' },
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
  { id: 'egg.cheat', test: /^(cheat|hack|god mode|iddqd|idkfa|konami)\b/, text: "You attempt to cheat. A hollow voice says: 'Nice try. This is logged.' It is. It is literally in a table." },
  { id: 'egg.win', test: /^(win|beat game|finish|skip to end|end game)\b/, text: 'You cannot simply win. You must be Worthy. Have you read the notice board? You have not read the notice board.' },
  { id: 'egg.undo', test: /^(undo|ctrl z|go back|rewind)\b/, text: "There is no undo. There is only 'restore', and it only works if you saved, which — look at you." },
  { id: 'egg.laugh', test: /^(lol|haha|lmao|rofl|hehe)\b/, text: 'The realm does not laugh. The realm is a governed tenant.' },
  { id: 'egg.self', test: /^(look at (me|myself|self)|who am i|examine (me|self|myself)|x me)$/, text: (s) => {
    const bits = [
      'You look at yourself. A Report Builder from the Village of Pro.',
      s.worn.includes('hoodie') ? 'You are wearing a hoodie you did not earn by writing code.' : 'No hoodie. You look like someone who imports CSVs.',
      s.flags['trial.moat'] ? 'You smell of the Moat, permanently.' : 'You smell fine, which is a problem.',
      s.worn.includes('boots') ? 'Your boots are bursting.' : 'Your shoes are Pro-tier.',
      "You look like someone who has typed 'export to excel' at least once. You have.",
    ];
    return bits.join(' ');
  } },
  { id: 'egg.fly', test: /^(fly|flap|soar|levitate)\b/, text: 'You flap. You are not a Dataflow. You do not flow. You do not fly.' },
  { id: 'egg.lick', test: /^(lick|taste)\b/, text: 'You lick it. It tastes of stale metadata. Please stop.' },
  { id: 'egg.listen', test: /^(listen|hear)\b/, text: 'You listen. Somewhere, a refresh fails softly. Somewhere else, a Spark session starts. It is always starting.' },
  { id: 'egg.hide', test: /^(hide|sneak|crouch|stealth)\b/, text: 'You hide. The Lookup Activity finds you immediately. It was always going to.' },
  { id: 'egg.talk-self', test: /^(talk to (me|myself|self)|talk)$/, text: 'You talk to yourself. You are the only one in the realm who listens, and even you are not really listening.' },
  { id: 'egg.hello', test: /^(hello|hi|hey|yo|sup|greetings)\b/, text: 'The realm does not say hello back. The realm is busy refreshing.' },
  { id: 'egg.thanks', test: /^(thanks|thank you|ty)\b/, text: 'You are welcome. This is the first gratitude the realm has received since 2019. It does not know what to do with it.' },
  { id: 'egg.sorry', test: /^(sorry|apologize|my bad)\b/, text: 'Apology logged. Outcome: no change. Same as every retrospective.' },
  { id: 'egg.swear', test: /\b(damn|hell|crap|wtf|ffs)\b/, text: 'Language, peasant. This is a governed tenant.' },
  { id: 'egg.please', test: /^please\b/, text: 'Manners will not help you here. Two words. Verb, noun.' },
  { id: 'egg.what', test: /^(what|huh|wat|what now|what do i do)\??$/, text: "What indeed. Try 'look'. Try 'help'. Try, as a last resort, 'get ye flask'." },
  { id: 'egg.plot', test: /^(plot|graph|chart|visualize|make a chart)\b/, text: 'You make a chart. It is a pie chart. It has 31 slices. The realm looks away.' },
  { id: 'egg.publish', test: /^(publish|deploy|ship)\b/, text: 'You publish. A dialog asks: "Replace existing?" You have never been more afraid of a Yes button.' },
  { id: 'egg.git', test: /^git\b/, text: "The realm does not have version control. The realm has 'Sales_v3_FINAL_final2.pbix'." },
  { id: 'egg.dragon-name', test: /^trogdor\b/, text: 'A different dragon. A different realm. This one only throttles.' },
  { id: 'egg.boo', test: /^(boo|scare|spook)\b/, text: 'Boo. Nobody is scared. The realm has seen a 400-column table.' },
  { id: 'egg.dad', test: /^(who are you|who is this|narrator)\b/, text: 'I am the narrator. I have watched eleven thousand Report Builders die in the Bronze Marsh. You are not special. You are, so far, alive.' },
  { id: 'egg.magic', test: /^(cast|abracadabra|magic|spell|alakazam)\b/, text: 'You cast a spell. It is CALCULATETABLE. Nothing in the realm is prepared for it, least of all you.' },
  { id: 'egg.count', test: /^(count|how many)\b/, text: 'count() is not supported. Select fewer fields and compute results.length, peasant.' },
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

const JEFF = ['jeff', 'jeff from finance', 'finance', 'man'];

export const GLOBAL_RULES: Rule[] = [
  yeFlask,
  {
    id: 'global.use-shortcut',
    when: { verb: 'use', noun: ['shortcut', 'signpost', 'sign', 'onelake shortcut', 'pointer'], has: ['shortcut'] },
    then: { text: 'You take the Shortcut. No data was moved.', moveTo: 'lake.shore', outcome: 'success', sfx: 'door' },
  },
  {
    id: 'global.wear-hoodie',
    when: { verb: 'wear', noun: ['hoodie', 'hoodie of spark', 'spark hoodie', 'black hoodie'], has: ['hoodie'], flags: [{ flag: 'trial.hoodie', not: true }] },
    then: {
      text: 'You pull on the Hoodie of Spark. You look like a Data Engineer. You have never written a notebook in your life. Nobody can tell.',
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
    then: { text: 'You hit Jeff from Finance. Jeff just wanted an export. The narrator is disappointed in you, and, more quietly, so is Jeff. He asks for the export again.', outcome: 'fail' },
  },
  {
    id: 'global.give-jeff-anything',
    when: { verb: 'give', noun2: JEFF, flags: [{ flag: 'jeff.pacified', not: true }] },
    then: { text: (s) => `Jeff turns it over. "Can you export this to Excel?" He hands it back. ${s.inventory.includes('mug') ? '' : 'He looks, briefly, at your empty hands, as if they might hold a mug.'}`.trim(), outcome: 'fail' },
  },
  {
    id: 'global.talk-dragon-elsewhere',
    when: { verb: 'talk', noun: ['dragon', 'throttlor'] },
    then: { text: (s) => (s.room === 'peaks.shrine' ? 'He is right there.' : 'You address the dragon. The dragon is on a mountain. You are not. This is, for now, the best arrangement.'), outcome: 'snark' },
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
  'The parser stares at you the way the Lookup Activity does.',
  'Try again, peasant. Two words. Verb, noun.',
  'Your command has been placed in a queue. The queue is infinite.',
  'That would require a Premium capacity, and look at you.',
  'Error: the operation completed successfully. Nothing happened.',
  "Ye cannot do that. Ye can, however, type 'help'.",
  'The realm has smoothed your request over the next 24 hours.',
  'I understood the verb. I understood the noun. I am choosing not to.',
  'That is a feature request. It has been added to the backlog, which is also a swamp.',
  'The narrator has seen many peasants try that. None of them are narrators now.',
];

export const HELP_TEXT =
  'Two words, peasant. Try: look, look at <thing>, get <thing>, drop <thing>, use <thing> on <thing>, talk to <someone>, say <words>, give <thing> to <someone>, read <thing>, wear <thing>, wait, open <thing>, board boat, n/s/e/w/out, inventory, score, save, restore, restart. When lost: get ye flask.';

/** Jeff will not let it go. Every third turn near him, until pacified. */
export function ambient(s: GameState): string | null {
  if (s.flags['jeff.pacified']) return null;
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
