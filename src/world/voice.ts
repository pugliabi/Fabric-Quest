import type { GameState } from '../engine/types';
import type { BrushOff } from './types';

/**
 * The voice constants (spec1 §5.1). One module, pinned by tests/voice.test.ts: a change here is a deliberate,
 * reviewed change. Every narrator line written after this task draws its nicknames, malaprops, brands and
 * allusions from here so the game develops one signature instead of thirty.
 */

/** Appended by the engine to every death (step.ts finish()). The catchphrase. */
export const SIGNOFF = 'You dead. Refresh failed.';

/** Sarcastic vocatives: half Fabric, half 2000s Microsoft. Sixteen, so a stride of 7 walks all of them. */
export const NICKNAMES = [
  'Mister Star Schema', 'Calculated Column Casey', 'Import Mode Ishmael', 'Ctrl-Shift-Enter', 'Power Query Pete', 'Many-to-Many Mandy',
  'Captain Blank', 'Bidirectional Bob', 'DAX Vader', 'Clippy', 'Zune', 'Encarta', 'Ask Jeeves', 'Tom from MySpace', 'champ', 'guy',
] as const;

/** A nickname for this turn. Deterministic (seed + turn); the stride is coprime with the pool size, so two consecutive turns never get the same name. */
export function nick(s: GameState): string {
  const offset = Math.abs(Math.imul(s.seed ^ 0x7f4a7c15, 0x9e3779b1) >>> 0) % NICKNAMES.length;
  return NICKNAMES[(offset + s.turns * 7) % NICKNAMES.length]!;
}

/** Walk a short pool by turn: line 0 on turn 0, line 1 on turn 1 … (for the 3-line checklist rotations of §3.1). */
export function rotate(s: GameState, lines: readonly string[]): string {
  return lines[s.turns % lines.length]!;
}

/** Misspelled on purpose, reused exactly. Each must appear verbatim in at least six lines across the game (tests/voice-harness.test.ts, Task F12). */
export const MALAPROPS = { refreshered: 'refreshered', capacitude: 'capacitude', daxxed: 'DAXxed' } as const;

/** The one unchanging reply to frustration and profanity (spec1 §5.3). */
export const FRUSTRATION = "Come now. Don't get throttled.";

/** Cheating: one syllable the first time, the table the second. */
export const CHEAT = 'Meh.';
export const CHEAT_AGAIN = "Still meh. It's logged, by the way. It is literally in a table.";

/**
 * `ask <npc> about <unknown>`: one brush-off per NPC, in that NPC's gimmick (spec1 §3.1). Keyed by NPC id. The Ferryman
 * (offline and online) and the Card (before and after the stare) answer from their state, so those two are functions.
 */
export const BRUSHOFFS: Record<string, BrushOff> = {
  jeff: '"Is it in Excel? Then I don\'t know it."',
  miller: '"I don\'t know nothing about no whatever you just said. Ask me after Q3. Oh wait."',
  // Online, his own brush-off (Task F5): the one word, and the hum for the rest (Sir Cardinality keeps "a question that was not about that").
  ferryman: (s) => (s.flags['ferry.online']
    ? '"ONLINE," he says, and hums the rest. He has one word this year and he is not wasting it on that.'
    : "He mouths: 'CREDENTIALS. EXPIRED.' He mouthed it at his own wedding."),
  monk: 'The monk points at the progress bar. It is his answer to everything, and it is always the same percent.',
  abbot: '"Either we don\'t know anything about that, or you\'re real boring. The monks are voting."',
  pandas: '"Does it work on my laptop? No? Then I don\'t know it either."',
  librarian: '"Shh." Then, quieter: "Shh."',
  guard: '"Is it a SKU? No? Then it\'s not my department, and my department is the whole gate."',
  duke: 'The Duke waits for a filter argument. Whatever that was, it was not one.',
  cardinality: '"One to many," says Sir Cardinality, to a question that was not about that.',
  card: (s) => (s.flags['stare.done']
    ? 'The Card shows 4.2M. It is its answer to that, and to everything, and it is wrong.'
    : 'The Card shows (Blank). It is its answer to that, and to everything.'),
  throttlor: '"I bill for questions like that," says Throttlor. "Ask me about the model."',
  scarecrow: 'Manual says nothing. Manual would need to be triggered to say nothing about that specifically.',
  'jeff-excel': '"Is it in Sheet1? No? Then it\'s not real."',
  clerk: "That's an admin setting.",
};

/** The brush-off line for this state (a plain one is returned as is). */
export function brushOffLine(s: GameState, b: BrushOff | undefined): string | undefined {
  return typeof b === 'function' ? b(s) : b;
}

/** Twisted brands, one syllable off. */
export const BRANDS = ['Refreshr™', 'CapacityAde', 'Dataflows Gen1 Classic'] as const;

/** The 2000s-Microsoft allusion layer. The region sweeps (Tasks F4–F11) use at least one per region. */
export const ALLUSIONS = [
  'Clippy', 'Zune', 'Encarta', 'the Windows XP hill', 'an MSN Messenger nudge', 'Access 97', 'SharePoint 2007',
  "It looks like you're writing a measure.", 'a Hotmail inbox', 'Windows Vista', 'Internet Explorer 6', 'Minesweeper',
  'the Recycle Bin', 'a screensaver of pipes', 'Microsoft Bob',
] as const;
