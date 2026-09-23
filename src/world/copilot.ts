import type { GameState, HeardLine } from '../engine/types';
import type { PhraseRule, Room, Rule, RuleThen } from './types';
import { MALAPROPS } from './voice';
import { setting } from '../engine/governance';
import { MEASURE_CODE, MODEL_CODE, SHAPE_INDEX, STAGE_HINTS, WIN_FIGURE, mergeSlots, parseSlots, replyFor, stageOf, type Measure, type Model, type Slots, type Stage } from './copilot-ladder';

const room = (r: Room): [string, Room] => [r.id, r];

// ---- The conversation so far: one flag per slot (spec1 §2.2). 0 / false = unset. ----
const MODELS: Model[] = ['certified', 'final2', 'test'];
const MEASURES: Measure[] = ['net', 'amount', 'gross', 'returns'];
/** The slots as stored in flags (0 / false = unset). */
export function slotsOf(s: GameState): Slots {
  const out: Slots = {};
  const m = Number(s.flags['copilot.model']) || 0; if (m) out.model = MODELS[m - 1];
  const me = Number(s.flags['copilot.measure']) || 0; if (me) out.measure = MEASURES[me - 1];
  const r = Number(s.flags['copilot.region']) || 0; if (r) out.region = r === 1 ? 'ne' : 'other';
  if (s.flags['copilot.period']) out.q4 = true;
  const y = Number(s.flags['copilot.year']) || 0; if (y) out.year = y;
  if (s.flags['copilot.one']) out.one = true;
  return out;
}
const slotFlags = (sl: Slots) => ({
  'copilot.model': sl.model ? MODEL_CODE[sl.model] : 0, 'copilot.measure': sl.measure ? MEASURE_CODE[sl.measure] : 0,
  'copilot.region': sl.region === 'ne' ? 1 : sl.region === 'other' ? 2 : 0, 'copilot.period': !!sl.q4, 'copilot.year': sl.year ?? 0, 'copilot.one': !!sl.one,
});
/** `start over`: every slot unset, and the stage / last-answer markers negative so the pane reads as empty again. */
export const CLEAR_FLAGS = { ...slotFlags({}), 'copilot.tables': false, 'copilot.stage': -1, 'copilot.stage.n': 0, 'copilot.last': -1, 'copilot.shape': -1 };
export const CLEAR_TEXT = "New chat. I remember nothing. It's my best feature.";

// ---- Prompts: everything the pane does not otherwise handle is a question for Copilot. ----
/** Addressing Copilot: "ask copilot for …", "hey copilot, …", "copilot, …", "talk to copilot about …", "say …". */
export const COPILOT_CALL = /^(say\s+|((ask|tell|hey|open|talk to)\s+)?copilot\b[,:]?\s*((to|for|about)\s+)?)/i;
/** The question in a line, minus however Copilot was addressed. */
export const promptOf = (line: string): string => line.trim().replace(COPILOT_CALL, '').trim();
export const FEEDBACK_TEXT = ' I sense frustration. I have logged it as feedback.';
export const SAME_AGAIN_TEXT = ' I gave the same answer because it is the same question. I am consistent. That is my best feature.';
export const ALREADY_TEXT = 'Already answered. It remembers.';

/**
 * Frustration, as the chirps layer read the wrappers. Copilot takes the leading ones except a bare "just" ("just the
 * total" is the hint, not a mood), and only part of the trailing set: "please" earns a "You're welcome!" instead, and
 * a bare "now" is just a word.
 */
const frustrated = (line: HeardLine): boolean =>
  (line.lead?.kind === 'frustrated' && line.lead.word !== 'just') || (line.trail?.kind === 'frustrated' && !['please', 'now'].includes(line.trail.word));

/**
 * One prompt, one reply — but the conversation remembers. The unwrapped line minus however Copilot was addressed sets
 * every slot it mentions on top of what was said before; the reply is for the first missing slot. A prompt that adds
 * nothing gets the consistency line, and the third reply at the same stage makes the hint explicit.
 */
function reply(s: GameState, line: HeardLine): { then: RuleThen; id: string } {
  const prevStage = Number(s.flags['copilot.stage'] ?? -1);
  // "The first one" answers the list the last reply read out, so the parser hears which stage that was.
  const parsed = parseSlots(promptOf(line.command), prevStage);
  const before = slotsOf(s);
  const slots = mergeSlots(before, parsed.slots);
  // Compared as flags, so "by product" (one = false) on an empty slot is not a change.
  const changed = JSON.stringify(slotFlags(slots)) !== JSON.stringify(slotFlags(before));
  // Once the chat is about sales it stays about sales: "show me the tables" after "show me sales" is still the model stage.
  const stage: Stage = stageOf(slots, parsed.sales || Object.keys(slots).length > 0 || prevStage >= 1);
  const nth = prevStage === stage ? (Number(s.flags['copilot.stage.n']) || 0) + 1 : 1;
  const r = replyFor(slots, stage, { tables: parsed.tables, polite: /\bplease\b/i.test(line.raw), nth });
  // "I gave the same answer" only when it is the same answer: nothing new was said AND the wrong thing shown is the
  // same wrong thing (asking for tables at the same stage shows a different one).
  const plain = { polite: false, nth: 1 };
  const sameAnswer = !changed && prevStage >= 0
    && replyFor(before, prevStage as Stage, { ...plain, tables: !!s.flags['copilot.tables'] }).text === replyFor(slots, stage, { ...plain, tables: parsed.tables }).text;
  const again = sameAnswer ? SAME_AGAIN_TEXT : '';
  const feedback = frustrated(line) ? FEEDBACK_TEXT : '';
  const hint = r.hint ? `\n[Copilot suggests: ${r.hint}]` : '';
  const base: RuleThen = {
    text: `Copilot: ${r.text}${again}${feedback}\n${r.context}${hint}`,
    set: { ...slotFlags(slots), 'copilot.tables': parsed.tables, 'copilot.stage': stage, 'copilot.stage.n': nth, 'copilot.last': stage, 'copilot.shape': SHAPE_INDEX[r.shape] },
    sfx: 'copilot-think',
    outcome: stage === 6 ? 'success' : 'fail',
  };
  if (stage === 6) {
    // Already won: the same number, no cha-ching, and you stay in the pane.
    if (s.flags['sq.copilot.done']) return { id: 'copilot.win-again', then: { ...base, text: `Copilot: ${WIN_FIGURE}. ${ALREADY_TEXT}` } };
    return { id: 'copilot.win', then: { ...base, bonus: 25, pointsKey: 'sq.copilot', set: { ...base.set, 'sq.copilot.done': true }, sfx: 'bonus', returnTo: true } };
  }
  return { id: `copilot.stage.${stage}`, then: base };
}

// ---- The pane on screen: the last answer's shape (flags['copilot.shape']) is what hangs above the prompt box. ----
const SHAPE_LINES = [
  ' is a list. A long one. It is still asking which one',
  ' is a confident table from the wrong model',
  ' is 400 rows, still scrolling, and a column called Column1',
  ' is a single card',
  ' is one short, unhelpful sentence',
  ' is three pages of the right number, by product, by day and by salesperson. It is still paginating',
] as const;
/** A cleared chat (`copilot.stage` < 0) reads as empty again, whatever the old shape flag says. */
export const lastAnswer = (s: GameState): string => {
  const shape = s.flags['copilot.shape'];
  const answered = typeof s.flags['copilot.last'] === 'number' && Number(s.flags['copilot.stage']) >= 0;
  return answered && typeof shape === 'number' ? SHAPE_LINES[shape] ?? '' : ' is empty. It is waiting for you';
};

/** The prompt box's last word (items.ts): idle compute, in the house malaprop. */
export const PROMPT_SPARE = ` It has ${MALAPROPS.capacitude} to spare and nothing to spend it on.`;

/** Before the first prompt (and after `start over`): how to begin, without restating the goal card that `goal` puts in front of it. */
export const FIRST_HINT = 'Say SALES and answer its questions one at a time. The Model Gallery, east, has the names. Copilot does not; it has confidence.';

/** The flask / `goal` next step: how to start before the first prompt, then whatever the last stage is missing. */
function paneHint(s: GameState): string {
  if (s.flags['sq.copilot.done']) return 'You got the number. That was the whole quest. exit.';
  const stage = Number(s.flags['copilot.stage'] ?? -1);
  if (stage < 0) return FIRST_HINT;
  return `${STAGE_HINTS[stage as Stage] || 'Ask again.'} (The Model Gallery, east, has names worth knowing.)`;
}

/**
 * Every way of asking for a fresh chat. A bare `start` is here because "start again" reaches the rules with its "again"
 * already taken off as a wrapper (the rule declines a bare `start` typed as just that: see `copilot.clear`);
 * `restart the chat` is here because the restart question invites exactly that answer (this rule sits before
 * `copilot.restart` in the list, so it wins).
 */
export const CLEAR_TEST = /^(let'?s |please )?(start( over| again| fresh| (a )?new (chat|conversation))?|restart( the| this)? (chat|conversation|copilot)|clear( the| this)?( chat| conversation| it)?|(a )?new (chat|conversation)|reset( the chat| it)?|forget (everything|it all|all (of )?that))$/;
export const RESTART_TEXT = 'Restart the whole quest, or the chat? Say NEW CHAT for the chat. Say RESTART again for the quest.';

/**
 * Inside the realm, `copilot` means the thing in front of you, not the global sourdough egg.
 * Spread into WORLD.phraseRules right after SIDEQUEST_PHRASES / GOAL_PHRASES / EXCEL_PHRASES so these win over PHRASE_RULES.
 * Order within the list: `copilot.here`, `copilot.gallery-copilot`, `copilot.clear`, `copilot.restart`.
 */
export const COPILOT_PHRASES: PhraseRule[] = [
  { id: 'copilot.here', room: 'copilot.pane', test: /^(ask |open |talk to |hey )?copilot$/, text: 'Copilot is right here. Type a question.' },
  { id: 'copilot.gallery-copilot', room: 'copilot.gallery', test: /^(ask |open |talk to )?copilot\b/, text: 'Copilot is west, in the pane. It can see these models. It will not look at them unless you name one.' },
  // `start over` / `clear` / `new chat` / `reset` (and their longer forms), anywhere in the realm: the slots go, the pane
  // reads as empty, and the next prompt starts a fresh chat.
  // A bare `start` is a word, not a request: only `start again` (whose "again" the wrappers took off) clears; the pane
  // hears a bare `start` as a prompt. Clearing in a huff ("ugh, start over") gets logged, like any other mood.
  { id: 'copilot.clear', region: 'copilot', test: CLEAR_TEST, text: '', then: (_s, _w, line, heard) => (line === 'start' && !/\bagain\b/i.test(heard.raw) ? null
    : { then: { text: CLEAR_TEXT + (frustrated(heard) ? FEEDBACK_TEXT : ''), set: CLEAR_FLAGS, sfx: 'copilot-think', outcome: 'snark' } }) },
  // `restart` next to a chat that has a reset is a trap: ask once; the same word again falls through to the real restart.
  { id: 'copilot.restart', region: 'copilot', test: /^restart$/, text: RESTART_TEXT, after: (prev) => prev.recent?.input !== 'restart' },
  // The pane skips the global phrases, so these are the only way a non-prompt line is answered there.
  { id: 'copilot.thanks', room: 'copilot.pane', test: /^(thanks|thank you|ty)( copilot)?[!.]?$/, text: "Copilot: You're welcome! I've logged your gratitude as feedback. It will be reviewed." },
  { id: 'copilot.who', room: 'copilot.pane', test: /^(who|what) are you\??$/, text: "Copilot: I'm Copilot! I can help with data, questions, and, if you ask nicely, a sourdough starter." },
  { id: 'copilot.are-you-ai', room: 'copilot.pane', test: /^are you (an? )?(ai|human|real|a robot|alive)\??$/, text: "Copilot: I'm a large language model, but I'm also here for you. Mostly the first thing." },
  { id: 'copilot.measure', room: 'copilot.pane', test: /^(write|add|create|make) (me )?(a |new )?(dax )?measure$/, text: `Copilot: Here's a measure! It returns BLANK(). You have been ${MALAPROPS.daxxed} by a sparkle.` },
  { id: 'copilot.sparkle', room: 'copilot.pane', test: /^(click|press|tap|touch|poke|pet|use)( on)?( the)? sparkle$/, text: 'You click the sparkle. It sparkles harder. That is the entire feature, and it shipped on time.' },
  { id: 'copilot.push-model', room: 'copilot.gallery', test: /^(push|kick|move|shove|tip)( the| a)? (model|models|plinth|biggest model|final2|big one)$/, text: 'You push the biggest model. It does not move. It has the most rows; it has the most everything except a badge.' },
];

/** The three plinths. With Discover content off (spec2 §3.3) the certified one keeps its badge and loses its label. */
export const modelsText = (s: GameState): string => 'Three semantic models on plinths:\n'
  + '  Sales_v3_FINAL_final2 — no badge. The biggest. Most rows. That is its whole personality.\n'
  + '  sales_test_DO_NOT_USE — a small sign says exactly that.\n'
  + (setting(s, 'discover') ? '  Sales (Certified) — a gold endorsement badge. Try looking at its measures.' : '  A model with a gold badge and no name. Discovery is off. You will have to guess.');

/**
 * The second and third look at each plinth (the badge, the big one, the sign). The first look is the item's own
 * description; the count stops at 2, so the fourth look is the third again and the repeat chirp gets its turn.
 * `measures` stays with the item: the measure list is the hint, and it is never swapped for a joke.
 */
const plinthLook = (key: string, item: string, noun: string[], again: [string, string]): Rule => ({
  id: `copilot.look-${key}`, when: { verb: 'look', noun },
  then: {
    text: (s, world) => {
      const n = Number(s.flags[`copilot.looked.${key}`]) || 0;
      if (n > 0) return again[n - 1]!;
      const d = world.items[item]!.describe;
      return typeof d === 'function' ? d(s) : d;
    },
    set: { [`copilot.looked.${key}`]: (v) => Math.min((Number(v) || 0) + 1, 2) },
    outcome: 'success',
  },
});
const PLINTH_LOOKS: Rule[] = [
  plinthLook('certified', 'model-certified', ['certified', 'certified model', 'sales certified', 'badge', 'gold badge'], [
    'The gold badge, again. Net Sales still has the checkmark. The badge took a steering committee and three meetings; you are giving it one squint.',
    "You stare at the badge a third time. It does not get MORE certified. That's not how endorsement works.",
  ]),
  plinthLook('final2', 'model-final2', ['final2', 'final', 'sales_v3_final_final2', 'v3', 'sales v3', 'biggest', 'biggest model', 'big one'], [
    'Sales_v3_FINAL_final2, still enormous. 11 GB, no badge, and a row count it brings up at parties.',
    'You look at the big one a third time. It has an older sibling called Sales_v3_FINAL. Nobody talks about Sales_v3_FINAL.',
  ]),
  plinthLook('test', 'model-test', ['test', 'sales_test_do_not_use', 'do not use', 'sign', 'test model'], [
    "The sign still says DO NOT USE. It's laminated. Somebody expected a fight.",
    "You read the sign a third time, hunting for a loophole. It's three words long. You're the reason it got laminated.",
  ]),
];

export const COPILOT_ROOMS: Record<string, Room> = Object.fromEntries([
  room({
    id: 'copilot.pane', name: 'The Copilot Pane', region: 'copilot',
    describe: (s) => `The Copilot Pane. A prompt box glows softly. Above it, your last answer${lastAnswer(s)}. The Model Gallery is east. A paperclip's silhouette in the corner of the sparkle. It looks like it's writing a measure.`,
    exits: { e: 'copilot.gallery', out: () => null },
    items: ['prompt-box'], npcs: [],
    rules: [
      { id: 'copilot.talk-prompt', when: { verb: 'talk', noun: ['prompt box', 'prompt', 'box', 'input', 'chat', 'sparkle'] }, then: { text: 'You talk to the prompt box. It listens beautifully. It is the best listener in the realm and it has never once heard you.', outcome: 'fail' } },
    ],
    scene: () => 'copilot.pane',
    enterQuip: () => 'A sparkle appears. It would like to help. It would like that very much.',
    flaskHint: paneHint,
    catchAll: reply,
  }),
  room({
    id: 'copilot.gallery', name: 'The Model Gallery', region: 'copilot',
    describe: () => 'The Model Gallery. Three semantic models on plinths, lit like museum pieces. One has a gold badge. One has a sign. One has neither and is the biggest. The Copilot Pane is west.',
    exits: { w: 'copilot.pane', out: () => null },
    items: ['models', 'model-certified', 'model-final2', 'model-test'], npcs: [],
    rules: [
      { id: 'copilot.look-model', when: { verb: 'look', noun: ['model', 'semantic model'] }, then: { text: modelsText, outcome: 'success' } },
      ...PLINTH_LOOKS,
      { id: 'copilot.lean-plinth', when: { verb: 'use', noun: ['plinth', 'plinths', 'models'] }, then: { text: 'You lean on a plinth. The model on it recalculates a measure out of nerves.', outcome: 'fail' } },
      { id: 'copilot.polish-badge', when: { verb: 'use', noun: ['badge', 'gold badge', 'certified', 'certified model'] }, then: { text: `You polish the badge. The certified model feels ${MALAPROPS.refreshered}. It was already certified; now it is shiny.`, outcome: 'snark' } },
    ],
    scene: () => 'copilot.gallery',
    enterQuip: () => 'Three models on plinths. One has a badge. The badge is not decorative.',
    flaskHint: () => 'The one with the badge. Its name is the word Copilot is waiting for. Look at its measures, too.',
    nudge: { oblique: 'Three models, one badge. Copilot is west, and it only knows the names you bring it.' },
  }),
]);
