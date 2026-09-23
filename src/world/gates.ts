import type { GameState } from '../engine/types';
import type { PhraseRule, RuleThen } from './types';
import { DOOR_OPENS, darkSigils } from './peaks';
import { notebookBlockerText, notebookBlockers } from './sacristy';

/** No Notebook can be made (spec2 §3.3–3.4) and this one is still broken: the plainer hint names the book, never the scroll command (E2 round 2). */
const noNotebookYet = (s: GameState): boolean => notebookBlockers(s).length > 0 && !s.flags['notebook.fixed'];
const NO_NOTEBOOK_MORE = (s: GameState): string => `No Notebook until ${notebookBlockerText(s)} back on; the Sacristy, up the stair from the Cloister, has it.`;

/**
 * Every gating object answers the obvious verbs with the shape of its puzzle (spec1 §3.2): who controls it, what
 * they want, where that comes from. Room-scoped phrase rules, so they win over the global eggs (push, kick, climb)
 * and over the room's own use/open flavor for these nouns — and never over a scored rule: a gate's verbs and nouns
 * exclude every command that scores in its room (tests/gates.test.ts guards that for every scored rule and synonym).
 * Try 1: the shape. Try 2: the shape plus `more`, the plainer hint. Try 3+: the displaced flavor lines cycle, with
 * `more`; each pool line is tagged with the verbs and nouns it narrates, so `kick duke` never reports that you opened
 * the window — when no line fits the typed command, the shape and the hint repeat. A solved gate declines (returns
 * null) so the room's ordinary lines answer again. The lines the gates displaced (the old open/use rules and the
 * pokes' use lines for these nouns) live on in the pools — add-mode, nothing deleted.
 */
export type GateText = string | ((s: GameState) => string);
export type PoolLine = {
  line: GateText;
  /** What this line narrates, matched against the typed line ("kick door"); an untagged line fits every command. */
  on?: RegExp;
  /** Say it without the hint (the Ledge's sigil list already says what is missing). */
  bare?: boolean;
};
export type GateLine = GateText | PoolLine;

export type GateSpec = {
  id: string; room: string;
  /** Regex alternation of the nouns, without anchors, e.g. '(drawbridge|bridge|gate)'. */
  nouns: string;
  shape: GateText;
  /** The plainer hint, added from the second try on. An empty string means none this turn. */
  more?: GateText;
  /** The displaced lines, cycled from the third try on among those whose `on` fits the typed line. */
  flavor?: GateLine[];
  /** The gate is still shut. */
  when: (s: GameState) => boolean;
  /** The gate opens for this player on these verbs (the Ledge for the Worthy): the effect, or null to fall through. */
  open?: (s: GameState) => { then: RuleThen; id?: string } | null;
  /** Verbs to answer; defaults to all of GATE_VERBS. */
  verbs?: string;
};

export const GATE_VERBS = '(open|unlock|use|push|pull|cross|climb|lower|raise|enter|knock( on)?|break|kick( down)?|go through|walk (across|over|through)|try)';
/** GATE_VERBS without `open`, `unlock` and `use`, for a gate whose room scores or shapes those itself (the Mill's chest). */
export const GATE_VERBS_HANDS_ONLY = '(push|pull|cross|climb|lower|raise|enter|knock( on)?|break|kick( down)?|go through|walk (across|over|through)|try)';
/** GATE_VERBS without `use`, for a gate whose room already shapes `use` itself (the Studio's refresh errors). */
export const GATE_VERBS_NO_USE = '(open|unlock|push|pull|cross|climb|lower|raise|enter|knock( on)?|break|kick( down)?|go through|walk (across|over|through)|try)';
/** GATE_VERBS plus a verb the object invites ("ring" for a bell). */
export const withVerbs = (...extra: string[]): string => `(${extra.join('|')}|${GATE_VERBS.slice(1)}`;
/** "push on", "climb over", "walk across the": a preposition between the verb and the noun is allowed, not required. */
const PREP = '( on| at| against| over| across| through| into| onto| up| down)?';
const ARTICLE = '( the| a| that| this)?';

const text = (s: GameState, l: GateText | undefined): string => (typeof l === 'function' ? l(s) : l ?? '');
const pool = (l: GateLine): PoolLine => (typeof l === 'string' || typeof l === 'function' ? { line: l } : l);

/** The gate's regex: verb, optional preposition and article, noun; nothing else on the line. */
export const gateTest = (nouns: string, verbs: string = GATE_VERBS): RegExp => new RegExp(`^${verbs}${PREP}${ARTICLE} ${nouns}$`);

export function gate(g: GateSpec): PhraseRule {
  const test = gateTest(g.nouns, g.verbs);
  return {
    id: `gate.${g.id}`, room: g.room, test, text: '',
    then: (s, _world, line) => {
      const opened = g.open?.(s);
      if (opened) return opened;
      if (!g.when(s)) return null;
      const n = Number(s.flags[`gate.${g.id}`]) || 0;
      const shape = text(s, g.shape);
      const more = text(s, g.more);
      // From the third try: cycle the pool lines that fit what was typed, by try, so consecutive tries differ.
      const fits = (g.flavor ?? []).map(pool).filter((f) => (!f.on || f.on.test(line)) && text(s, f.line));
      const pick = n >= 2 && fits.length ? fits[(n - 2) % fits.length]! : undefined;
      const lead = pick ? text(s, pick.line) : shape;
      const out = n >= 1 && more && !pick?.bare ? `${lead} ${more}` : lead;
      return { id: `gate.${g.id}`, then: { text: out, set: { [`gate.${g.id}`]: n + 1 }, outcome: 'fail' } };
    },
  };
}

const worthy = (s: GameState): boolean => !!s.flags['trial.hoodie'] && !!s.flags['trial.moat'] && !!s.flags['trial.key'];
const lit = (s: GameState): number => ['trial.hoodie', 'trial.moat', 'trial.key'].filter((f) => !!s.flags[f]).length;
/** Where each dark sigil's piece comes from. */
const stillToGet = (s: GameState): string => {
  const todo = [
    !s.flags['trial.hoodie'] && 'the hoodie, from the Abbot behind the Keep',
    !s.flags['trial.moat'] && "the smell, from the Duke's window",
    !s.flags['trial.key'] && 'the key, from the Isle across the OneLake',
  ].filter((x): x is string => !!x);
  return todo.length ? `Still to get: ${todo.join('; ')}.` : '';
};

const SESSION_PCT = (s: GameState): string => ['0%', '33%', '67%'][(s.flags['gate.waiting'] as number) ?? 0] ?? '0%';

/** Every gating object, as data (the sweep in tests/setting-effects.test.ts reads their hint lines). */
export const GATES: GateSpec[] = [
  // ---- The Keep ----
  {
    id: 'desktop', room: 'fortress.bridge', nouns: '(drawbridge|bridge|gate|keep gate|splash( screen)?|guard|guards|bridge guard)', when: (s) => !s.flags['bridge.down'],
    shape: 'The bridge answers to the guard. The guard answers to SKUs. Say one to him.', more: "Trial's free.",
    flavor: [
      { on: /^(open|unlock|use|push|try)\b.*\b(splash|drawbridge|bridge|gate)\b/, line: "You click the splash screen. It is not a button. The guard shouts: 'STATE. YOUR. SKU.'" },
      { on: /^(use|push|pull|try)\b.*\b(drawbridge|bridge|gate)\b/, line: 'You push the drawbridge. It is a splash screen. Splash screens are not pushed; they are waited out, or bribed with a SKU.' },
      { on: /^(use|push|try|knock)\b.*\b(drawbridge|bridge|gate|splash)\b/, line: 'You tap the drawbridge twice. It shows a tooltip: "Updating". You knew that.' },
      { on: /^(use|lower|pull|try)\b.*\b(drawbridge|bridge|gate)\b/, line: 'You try to lower it by hand. It is heavier than the whole .pbix, and the .pbix is 2.3 GB.' },
      { on: /\b(splash|drawbridge|bridge|gate)\b/, line: 'The update installs. Then another. The drawbridge does not move. This is the update.' },
    ],
  },
  {
    id: 'duke', room: 'fortress.throne', nouns: '(throne|formula bar|window|casement|keep window|duke|duke of dax|duke of warehouse|guards)', when: (s) => !s.flags['trial.moat'],
    shape: 'The Duke throws people from that window for one sin. Say it.', more: 'Two words. They go in a table.',
    flavor: [
      { on: /^(open|unlock)\b.*\b(window|casement)\b/, line: 'You open the window. The moat winks up at you. It is the fastest exit in the Keep. You close it; you are not ready to smell like that.' },
      { on: /^(use|push|pull|try|enter|climb)\b.*\b(throne|formula bar)\b/, line: 'You reach for the throne. It is a formula bar. It autocompletes your hand to SUMX( and you back away.' },
      { on: /^(use|climb|enter|go through|cross|open|try)\b.*\b(window|casement)\b/, line: 'You lean out. The moat winks at you. You lean back in.' },
      { on: /\b(window|casement)\b/, line: 'You measure the window with your eyes. You would fit. Everyone fits.' },
    ],
  },
  {
    id: 'studio', room: 'fortress.yard', nouns: '(card|card visual|big refresh|refresh|progress bar|refresh bar)', when: (s) => !s.flags['refresh.done'],
    verbs: GATE_VERBS_NO_USE,
    // After the Duke's spinner times out the Card is (Blank) again (stare.count 3, stare.done off), but the stare is won.
    shape: (s) => (s.flags['stare.done'] || s.flags['stare.count'] === 3
      ? 'The Card is stared at. The refresh wants a policy. The Model View, west of the hall, keeps one.'
      : 'The Card wants staring at. The refresh wants a policy. The Model View, west of the hall, keeps one.'),
    more: (s) => [
      !s.flags['stare.done'] && !s.flags['stare.count'] && 'Look at the Card, then wait, twice.',
      s.inventory.includes('policy') ? 'The policy in your pocket goes on the refresh.' : !s.flags['taken.policy'] && 'The policy is on a lectern, west of the hall.',
    ].filter(Boolean).join(' '),
    flavor: [{ on: /^(push|try)\b.*\b(refresh|progress bar)\b/, line: 'You push the Big Refresh. 97%. It has been pushed before; there is a sticky note about it.' }],
  },
  // ---- The Monastery ----
  {
    id: 'monastery', room: 'monastery.gate', nouns: '(gate|door|bell|monastery gate|lock)', when: (s) => !s.flags['gate.open'],
    verbs: withVerbs('ring'),
    shape: 'Locked. The session is starting. `wait`. Three times; the bar counts them.',
    more: (s) => `Type \`wait\`. The bar is at ${SESSION_PCT(s)}; it counts waits, and only waits.`,
    flavor: [
      { on: /^(open|unlock|use|push|pull|try)\b.*\b(gate|door)\b/, line: 'You push the gate. The monk shakes his head and points at the progress bar. Some things cannot be rushed. Well — they can, with a Starter Pool, but not here.' },
      { on: /^knock\b/, line: 'You knock. The gate says: Session starting. Please wait. It has always said that. Knocking does not count as waiting.' },
      { on: /^ring\b/, line: 'You ring the bell. It rings at the speed of a Spark session, which is to say it will, later.' },
    ],
  },
  {
    id: 'session', room: 'monastery.gate', nouns: '(session|spark session|progress bar|bar|stone progress bar|monk|gatekeeper|gatekeeper monk)', when: (s) => !s.flags['gate.open'],
    shape: "It's starting. `wait`. That's the puzzle. Really.",
    more: (s) => `Three of them. The bar is at ${SESSION_PCT(s)}; it is counting.`,
    flavor: [{ on: /^(use|push|pull|try|climb)\b.*\bbar\b/, line: 'You lean on the progress bar. It is stone. It moves at the speed of stone, which is also the speed of a Spark session.' }],
  },
  {
    id: 'notebook', room: 'monastery.spark', nouns: '(notebook|cell|session|spark session|pandas|brother pandas|brother|monk pandas|lakehouse)', when: (s) => !s.flags['notebook.fixed'],
    shape: 'The cell wants Spark, not pandas. The Library, west of the cloister, keeps a scroll about it.',
    more: (s) => (noNotebookYet(s) ? NO_NOTEBOOK_MORE(s)
      : s.inventory.includes('scroll') ? 'The scroll is in your pocket. `use scroll on notebook`.'
      : s.flags['scroll.lent'] ? 'You had the scroll. You do not have it now. Check your inventory, then your life choices.'
      : 'Your license is the library card. Give it to the Librarian.'),
    flavor: [
      { on: /^(use|push|try)\b.*\b(notebook|cell)\b/, line: 'You click Run All. The cell was already running. Now it is running twice. Brother Pandas gives you a look.' },
      { on: /^(push|use|try|knock)\b.*\b(cell|notebook)\b/, line: 'You poke the running cell. The progress bar takes it personally and adds a minute.' },
    ],
  },
  {
    id: 'library', room: 'monastery.library', nouns: '(scroll|spark scroll|pyspark scroll|case|locked case|glass case|lock|librarian|woman)', when: (s) => !s.flags['scroll.lent'],
    shape: 'Library card only. Any license will do. Well. Any license she accepts.',
    more: 'Give her the license. It is, technically, a card.',
    flavor: [
      { on: /\b(case|lock|scroll)\b/, line: 'Locked. A small sign reads: LIBRARY CARD REQUIRED. ANY CARD.' },
      { on: /^(push|pull|use|kick|break|knock|try)\b.*\b(case|lock)\b/, line: "You rattle the case. The Librarian says 'Shh' at a volume that is not a shh." },
    ],
  },
  {
    id: 'abbot', room: 'monastery.cloister', nouns: '(abbot|father abbot|father)', when: (s) => !s.flags['has.hoodie'],
    shape: (s) => (s.flags['notebook.fixed']
      ? 'He has your hoodie. Talk to him. The kneeling is included.'
      : "The Abbot has one hoodie and one price: a notebook that runs. Brother Pandas' cell, east, does not."),
    more: (s) => (s.flags['notebook.fixed'] ? '`talk to abbot`. Two words. He does the rest.'
      : noNotebookYet(s) ? NO_NOTEBOOK_MORE(s)
      : s.inventory.includes('scroll') ? 'The scroll in your pocket goes on the notebook, east.'
      : 'The Library, west, lends the scroll. Your license is the card.'),
    flavor: [{ on: /^(use|try)\b/, line: (s) => (s.flags['notebook.fixed']
      ? 'You kneel. The Abbot waits for you to say something. Try talking; the hoodie is right there in his hands.'
      : 'You kneel. The Abbot waits for you to say something. You have nothing. You get up.') }],
  },
  // ---- The Lake ----
  {
    id: 'dock', room: 'lake.dock', nouns: '(boat|ferry|ferryman|ferry man|boatman|gateway|lamp|status lamp|post|lake|onelake)', when: (s) => !s.flags['ferry.online'],
    shape: "The Ferryman's OFFLINE. Credentials expired. The Mill has the ones that haven't.",
    more: (s) => (s.inventory.includes('credentials') ? 'They are in your pocket. Give them to him. Give, not say.' : 'North of the square: the Mill. Talk to the Miller, or open his chest.'),
    flavor: [
      { on: /^(use|push|try|knock)\b.*\b(lamp|post)\b/, line: 'You tap the lamp. It blinks OFFLINE a little faster, which is somehow worse.' },
      { on: /^(push|pull|use|try)\b.*\b(ferryman|ferry man|boatman|gateway)\b/, line: 'You push the Ferryman. He sways, OFFLINE, and settles back. It is the most he has moved since 2021.' },
      { on: /^(use|push|pull|try|enter|open|unlock)\b.*\b(boat|ferry)\b/, line: 'You untie the boat. It drifts one foot, remembers it has no gateway, and comes back.' },
    ],
  },
  // ---- The Village ----
  {
    // `open`/`unlock chest` score (village.credentials-open) and `use chest` is the Mill's own line: hands only here.
    id: 'mill', room: 'village.mill', nouns: '(chest|credentials chest|credentials|creds|lock|miller|old miller|old man)', when: (s) => !s.flags['has.credentials'],
    verbs: GATE_VERBS_HANDS_ONLY,
    shape: 'Nothing here is locked. Open the chest, or ask the Miller; he stopped guarding it in 2019.',
    more: '`open chest`. Or `get credentials`. Or `talk to miller`. Any of the three.',
    flavor: [{ on: /^(push|pull|try|climb|enter)\b.*\bchest\b/, line: 'You lean on the chest. It creaks open a little on its own. Nothing from 2019 is latched.' }],
  },
  // ---- The Peaks ----
  {
    id: 'pass', room: 'peaks.pass', nouns: '(sign|delay|interactive delay|pass|throttling pass|air|throttle|throttling|rocks?)', when: (s) => !s.worn.includes('boots'),
    shape: "Interactive operations may be delayed. Boots help. The Studio's Big Refresh drops a pair.",
    more: (s) => (s.inventory.includes('boots') ? 'They are in your pack. `wear boots`. You have been carrying the fix.'
      : 'The policy in the Model View goes on the Big Refresh in the Studio. Wear what falls out.'),
    flavor: [{ on: /^(push|pull|try|knock|use)\b.*\bsign\b/, line: 'You push the sign. The push is queued. It arrives a moment later, smoothed.' }],
  },
  {
    id: 'ledge', room: 'peaks.ledge', nouns: '(door|shrine door|shrine|great door|sigils?|lock)', when: (s) => !s.flags['shrine.open'] && !worthy(s),
    // The Worthy: any of the obvious verbs on the door opens it, the same way `open door` and `look at door` do.
    open: (s) => (worthy(s) && !s.flags['shrine.open'] ? { id: 'peaks.shrine-door-open', then: { ...DOOR_OPENS } satisfies RuleThen } : null),
    shape: (s) => `Three sigils. Look like an Engineer, smell like a Warehouse, hold the Key. It counts them for you: ${lit(s)} of 3.`,
    more: stillToGet,
    flavor: [
      { on: /^(open|unlock|push|pull|try|enter|go through|walk)\b.*\b(door|shrine|lock)\b/, bare: true, line: (s) => `The door does not move. ${darkSigils(s)}` },
      { on: /^(kick|break)\b.*\b(door|shrine)\b/, line: 'You kick the door. The door is a mountain. The mountain does not notice.' },
    ],
  },
  {
    // Not `model`: `use model` is the Shrine's own line (F8's peaks.reach-model); `get model` scores.
    id: 'dragon', room: 'peaks.shrine', nouns: '(dragon|throttlor|capacity dragon|throttlor the capacity dragon)', when: (s) => !s.flags['dragon.gone'],
    shape: 'He asked you a question. Answer it. `say <answer>`.',
    more: 'Two words. Sir Cardinality said them three times; he was right every time.',
    flavor: [{ on: /^(push|pull|try|use)\b.*\b(dragon|throttlor)\b/, line: 'You push Throttlor. He bills you for the contact. Itemized.' }],
  },
];
/** The gates as phrase rules, room-scoped (see gate()). */
export const GATE_PHRASES: PhraseRule[] = GATES.map(gate);
