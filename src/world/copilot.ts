import type { GameState, HeardLine } from '../engine/types';
import type { PhraseRule, Room, RuleThen } from './types';
import { RUNG_HINTS, SHAPE_INDEX, WIN_FIGURE, evaluatePrompt, type Rung } from './copilot-ladder';

const room = (r: Room): [string, Room] => [r.id, r];

// ---- Prompts: everything the pane does not otherwise handle is a question for Copilot. ----
/** Addressing Copilot: "ask copilot for …", "hey copilot, …", "copilot, …", "talk to copilot about …", "say …". */
export const COPILOT_CALL = /^(say\s+|((ask|tell|hey|open|talk to)\s+)?copilot\b[,:]?\s*((to|for|about)\s+)?)/i;
/** The question in a line, minus however Copilot was addressed. */
export const promptOf = (line: string): string => line.trim().replace(COPILOT_CALL, '').trim();
export const FEEDBACK_TEXT = ' I sense frustration. I have logged it as feedback.';
export const SAME_AGAIN_TEXT = ' I gave the same answer because it is the same question. I am consistent. That is my best feature.';
export const ALREADY_TEXT = 'Already answered. It remembers.';

/**
 * Frustration, as the chirps layer read the wrappers. Copilot takes every leading one, but only part of the trailing
 * set: "please" earns a "You're welcome!" instead, and a bare "now" is just a word.
 */
const frustrated = (line: HeardLine): boolean =>
  line.lead?.kind === 'frustrated' || (line.trail?.kind === 'frustrated' && !['please', 'now'].includes(line.trail.word));

/** One prompt, one reply. The unwrapped line minus however Copilot was addressed goes up the ladder. */
function reply(s: GameState, line: HeardLine): { then: RuleThen; id: string } {
  const r = evaluatePrompt(promptOf(line.command), { polite: /\bplease\b/i.test(line.raw) });
  const feedback = frustrated(line) ? FEEDBACK_TEXT : '';
  const again = (s.recent?.n ?? 0) >= 2 ? SAME_AGAIN_TEXT : '';
  const hint = r.hint ? `\n[Copilot suggests: ${r.hint}]` : '';
  const base: RuleThen = {
    text: `Copilot: ${r.text}${again}${feedback}${hint}`,
    set: { 'copilot.last': r.rung, 'copilot.shape': SHAPE_INDEX[r.shape] },
    sfx: 'copilot-think',
    outcome: r.rung === 10 ? 'success' : 'fail',
  };
  if (r.rung === 10) {
    // Already won: the same number, no cha-ching, and you stay in the pane.
    if (s.flags['sq.copilot.done']) return { id: 'copilot.win-again', then: { ...base, text: `Copilot: ${WIN_FIGURE}. ${ALREADY_TEXT}` } };
    return { id: 'copilot.win', then: { ...base, bonus: 25, pointsKey: 'sq.copilot', set: { ...base.set, 'sq.copilot.done': true }, sfx: 'bonus', returnTo: true } };
  }
  return { id: `copilot.rung.${r.rung}`, then: base };
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
export const lastAnswer = (s: GameState): string => {
  const shape = s.flags['copilot.shape'];
  return typeof s.flags['copilot.last'] === 'number' && typeof shape === 'number' ? SHAPE_LINES[shape] ?? '' : ' is empty. It is waiting for you';
};

function paneHint(s: GameState): string {
  if (s.flags['sq.copilot.done']) return 'You got the number. That was the whole quest. exit.';
  const last = s.flags['copilot.last'];
  if (typeof last !== 'number') return 'Type a question. Any question. Copilot will answer a question.';
  return `${RUNG_HINTS[last as Rung] || 'Ask again.'} (The Model Gallery, east, has names worth knowing.)`;
}

/**
 * Inside the realm, `copilot` means the thing in front of you, not the global sourdough egg.
 * Spread into WORLD.phraseRules right after SIDEQUEST_PHRASES so these win over PHRASE_RULES.
 */
export const COPILOT_PHRASES: PhraseRule[] = [
  { id: 'copilot.here', room: 'copilot.pane', test: /^(ask |open |talk to |hey )?copilot$/, text: 'Copilot is right here. Type a question.' },
  { id: 'copilot.gallery-copilot', room: 'copilot.gallery', test: /^(ask |open |talk to )?copilot\b/, text: 'Copilot is west, in the pane. It can see these models. It will not look at them unless you name one.' },
];

export const MODELS_TEXT = 'Three semantic models on plinths:\n'
  + '  Sales_v3_FINAL_final2 — no badge. The biggest. Most rows. That is its whole personality.\n'
  + '  sales_test_DO_NOT_USE — a small sign says exactly that.\n'
  + '  Sales (Certified) — a gold endorsement badge. Try looking at its measures.';

export const COPILOT_ROOMS: Record<string, Room> = Object.fromEntries([
  room({
    id: 'copilot.pane', name: 'The Copilot Pane', region: 'copilot',
    describe: (s) => `The Copilot Pane. A prompt box glows softly. Above it, your last answer${lastAnswer(s)}. The Model Gallery is east.`,
    exits: { e: 'copilot.gallery', out: () => null },
    items: ['prompt-box'], npcs: [], rules: [],
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
      { id: 'copilot.look-model', when: { verb: 'look', noun: ['model', 'semantic model'] }, then: { text: MODELS_TEXT, outcome: 'success' } },
    ],
    scene: () => 'copilot.gallery',
    enterQuip: () => 'Three models on plinths. One has a badge. The badge is not decorative.',
    flaskHint: () => 'The one with the badge. Its name is the word Copilot is waiting for. Look at its measures, too.',
  }),
]);
