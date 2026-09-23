import type { Dir, ParsedCommand, Verb } from './types';

/** Synonym table. Multi-word keys are matched before single words. */
const VERBS: Record<string, Verb> = {
  look: 'look', l: 'look', examine: 'look', x: 'look', inspect: 'look', 'look at': 'look',
  get: 'get', take: 'get', grab: 'get', 'pick up': 'get', pickup: 'get', steal: 'get',
  drop: 'drop', discard: 'drop',
  use: 'use', apply: 'use', put: 'use', plug: 'use', insert: 'use',
  // Jeff's Excel: spreadsheet verbs all mean "use" ("create pivot table", "filter by year", "add net sales").
  create: 'use', filter: 'use', add: 'use', rows: 'use', values: 'use', connect: 'use', analyze: 'use', pivot: 'use',
  // The Keep (Power BI) and the Lake House: report-building and house verbs are all ways of using a thing.
  // Not 'remove': it would read as its opposite ("remove filter" adding one in Jeff's Excel).
  fold: 'use', merge: 'use', align: 'use', distribute: 'use', bookmark: 'use', hide: 'use', mark: 'use', format: 'use', fix: 'use',
  write: 'use', knock: 'use', fish: 'use', sit: 'use', update: 'use', install: 'use', buffer: 'use', publish: 'use',
  label: 'use', refresh: 'use',
  // Room texture: plant a seed, skip a pebble, squeeze a stress ball.
  plant: 'use', skip: 'use', squeeze: 'use',
  // Actions that fit (the Desktop Gate's link, the Model View's line, the Studio's pie, the Monastery's session):
  // change a visual, click a link, start a session, drag a measure. All ways of using a thing.
  change: 'use', convert: 'use', switch: 'use', swap: 'use', start: 'use', press: 'use', click: 'use', ring: 'use', drag: 'use', compare: 'use', activate: 'use', download: 'use',
  talk: 'talk', 'talk to': 'talk', speak: 'talk', 'speak to': 'talk', ask: 'talk', chat: 'talk',
  say: 'say', shout: 'say', answer: 'say', yell: 'say', tell: 'say', whisper: 'say',
  'sign in': 'say', 'log in': 'say', login: 'say', signin: 'say',
  give: 'give', offer: 'give', hand: 'give', show: 'give',
  open: 'open', unlock: 'open', close: 'close', shut: 'close',
  read: 'read',
  wear: 'wear', 'put on': 'wear', don: 'wear', equip: 'wear',
  wait: 'wait', z: 'wait', rest: 'wait',
  drink: 'drink', sip: 'drink', taste: 'drink',
  attack: 'attack', fight: 'attack', hit: 'attack', kill: 'attack', punch: 'attack', stab: 'attack', slay: 'attack',
  board: 'board', ride: 'board', 'enter boat': 'board', 'take boat': 'board', 'take ferry': 'board', 'ride ferry': 'board', 'board boat': 'board', 'board ferry': 'board', sail: 'board',
  go: 'go', walk: 'go', run: 'go', move: 'go', head: 'go', climb: 'go',
  inventory: 'inventory', i: 'inventory', inv: 'inventory',
  score: 'score', save: 'save', restore: 'restore', load: 'restore',
  restart: 'restart', quit: 'quit', help: 'help', '?': 'help',
};

/** Say-verbs that are themselves the phrase: "sign in" parses as say "sign in", not an empty say. */
const SELF_SAY = new Set(['sign in', 'log in', 'login', 'signin']);

const DIRS: Record<string, Dir> = {
  n: 'n', north: 'n', s: 's', south: 's', e: 'e', east: 'e', w: 'w', west: 'w',
  u: 'u', up: 'u', d: 'd', down: 'd', out: 'out', outside: 'out', leave: 'out', exit: 'out',
  in: 'in', inside: 'in', enter: 'in',
};

/** Words dropped from noun phrases. Prepositions that split noun/noun2 are NOT here. */
const FILLER = new Set(['the', 'a', 'an', 'my', 'some', 'please', 'this', 'that', 'thy', 'thine']);
/** Prepositions that split "noun PREP noun2". */
const PREPS = new Set(['on', 'to', 'with', 'at', 'in', 'into', 'onto', 'about', 'from']);

export function parse(input: string): ParsedCommand {
  const raw = input;
  const cleaned = input
    .trim()
    .toLowerCase()
    .replace(/[^\w\s*?']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return { verb: 'unknown', raw, unknownVerb: '' };

  if (DIRS[cleaned]) return { verb: 'go', dir: DIRS[cleaned], raw };

  const words = cleaned.split(' ');
  const two = words.slice(0, 2).join(' ');
  let verb: Verb;
  let rest: string[];
  let key: string;
  if (words.length >= 2 && VERBS[two]) {
    key = two;
    verb = VERBS[two]!;
    rest = words.slice(2);
  } else if (VERBS[words[0]!]) {
    key = words[0]!;
    verb = VERBS[words[0]!]!;
    rest = words.slice(1);
  } else {
    return { verb: 'unknown', raw, unknownVerb: words[0] };
  }

  const cmd = finishParse(verb, key, rest, raw);
  return { ...cmd, verbWord: key };
}

function finishParse(verb: Verb, key: string, rest: string[], raw: string): ParsedCommand {
  if (verb === 'say' && SELF_SAY.has(key)) return { verb, noun: key, raw };
  if (verb === 'say') {
    const phrase = rest.filter((w) => w !== 'the').join(' ').trim();
    return { verb, noun: phrase || undefined, raw };
  }
  if (verb === 'go') {
    const d = rest.find((w) => DIRS[w]);
    return d ? { verb, dir: DIRS[d], raw } : { verb, raw };
  }
  // "look at X" when written as "look at the X" (two-word key handled above); also "look X".
  if (verb === 'look' && rest[0] === 'at') rest = rest.slice(1);
  // "talk to X" / "ask X about Y"
  if (verb === 'talk' && (rest[0] === 'to' || rest[0] === 'with')) rest = rest.slice(1);
  // "get up"/"pick up X" leftovers
  if (verb === 'get' && rest[0] === 'up') rest = rest.slice(1);

  const stripped = rest.filter((w) => !FILLER.has(w));
  const prepIx = stripped.findIndex((w, i) => i > 0 && PREPS.has(w));
  if (prepIx > 0) {
    const noun = stripped.slice(0, prepIx).join(' ');
    const noun2 = stripped.slice(prepIx + 1).filter((w) => !PREPS.has(w)).join(' ');
    return { verb, noun: noun || undefined, noun2: noun2 || undefined, raw };
  }
  const noun = stripped.filter((w) => !PREPS.has(w)).join(' ').trim();
  return { verb, noun: noun || undefined, raw };
}
