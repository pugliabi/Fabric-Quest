import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { MALAPROPS, BRUSHOFFS } from '../src/world/voice';
import { MONASTERY_PHRASES } from '../src/world/monastery';
import { VILLAGE_PHRASES } from '../src/world/village';
import type { GameState } from '../src/engine/types';
import type { World } from '../src/world/types';

/**
 * MONASTERY_PHRASES is not registered by this sweep (the parallel-sweep contract forbids touching world/index.ts).
 * Until the lead registers it right after VILLAGE_PHRASES, the bare lines the global phrases would otherwise hear
 * first (count, eat) are tested against a WORLD with it spliced in at that spot; once registered, WORLD is used as is.
 */
const registered = WORLD.phraseRules.some((p) => p.id === 'monastery.count');
const afterVillage = WORLD.phraseRules.findIndex((p) => p.id === VILLAGE_PHRASES[VILLAGE_PHRASES.length - 1]!.id) + 1;
const W: World = registered ? WORLD : { ...WORLD, phraseRules: [...WORLD.phraseRules.slice(0, afterVillage), ...MONASTERY_PHRASES, ...WORLD.phraseRules.slice(afterVillage)] };

const one = (room: string, cmd: string, inventory: string[] = ['license'], world: World = WORLD) => step({ ...newGame(WORLD, 3), room, inventory }, cmd, world).output[0]!;
const at = (room: string, flags: Record<string, boolean | number> = {}): GameState => ({ ...newGame(WORLD, 3), room, inventory: ['license'], flags: { ...newGame(WORLD, 3).flags, ...flags } });
const twice = (s: GameState, cmd: string): [string, string] => {
  const a = step(s, cmd, WORLD);
  const b = step(a.state, cmd, WORLD);
  return [a.output[0]!, b.output[0]!];
};

describe('Monastery sweep', () => {
  it('gate and cloister', () => {
    expect(one('monastery.gate', 'ask monk about the session')).toBe('The monk points at the bar. Then at the sky. Then at the bar. It is a lineage view.');
    expect(one('monastery.gate', 'count to three', ['license'], W)).toBe('One. Two. The session hears you counting and restarts.');
    expect(one('monastery.cloister', 'ask abbot about pandas')).toBe("'Brother Pandas,' says the Abbot, 'was a Data Scientist. Then he was a Data Engineer. Then he was a Pandas. It happens gradually and then all at once.'");
    expect(one('monastery.cloister', 'chant')).toBe("You chant 'spark dot read' with the monks. You get the rhythm wrong. Three monks fall out of the loop. The Abbot restarts them.");
    expect(one('monastery.cloister', 'look at floor')).toMatch(/a burn mark shaped like a cluster starting\.$/);
  });
  it('spark chamber and library', () => {
    expect(one('monastery.spark', 'ask pandas about spark')).toBe("'Spark,' says Brother Pandas. 'It's not broken, it's deprecated.' His own cell is still running.");
    expect(one('monastery.spark', 'eat bamboo', ['license', 'bamboo'], W)).toBe("You eat Brother Pandas' lunch. It is a dependency. Something downstream fails.");
    expect(one('monastery.library', 'ask librarian about synapse')).toBe("'Synapse,' she says, and looks at the roped-off wing the way you look at a photo of a house you sold. 'Still supported.' She does not say by whom.");
    expect(one('monastery.library', 'shh')).toBe("'Shh,' she says back, faster. She has been waiting.");
    expect(one('monastery.library', 'say dax')).toBe(`'No DAX in the Library,' says the Librarian. 'Shh.' You have been ${MALAPROPS.daxxed} and shushed.`);
    expect(one('monastery.library', 'look')).toMatch(/a whole wing labeled 'Synapse'\. The Librarian guards a single locked case\./);
    expect(one('monastery.gate', 'look at gate')).toMatch(new RegExp(`Not enough ${MALAPROPS.capacitude} to hurry it\\. Enough to open a gate, though\\.$`));
  });
});

describe('Monastery sweep: second beats', () => {
  it('the Spark session grind: delight, then the drama', () => {
    const open = at('monastery.gate', { 'gate.open': true, 'gate.waiting': 3 });
    const a = step(open, 'wait', WORLD);
    expect(a.output[0]).toMatch(/You could do this all day!$/);
    expect(step(a.state, 'wait', WORLD).output[0]).toMatch(/^The drama grips you, but the bar hasn't moved\./);
  });
  it('Brother Pandas argues with the notebook the second time', () => {
    const [first, second] = twice(at('monastery.spark'), 'ask pandas about spark');
    expect(first).toMatch(/His own cell is still running\.$/);
    expect(second).toMatch(/^'Deprecated,' says Brother Pandas.*It has picked a side\.$/);
  });
  it("the Librarian's Shh. gets a second beat; a known topic, a second line", () => {
    const [first, second] = twice(at('monastery.library'), 'ask librarian about dragons');
    expect(first).toBe(BRUSHOFFS.librarian);
    expect(second).toMatch(/writes your name down\. In pencil\. For now\.$/);
    expect(twice(at('monastery.library'), 'ask librarian about the scroll')[1]).toMatch(/in the stacks now\. Deprecated\."$/);
    expect(twice(at('monastery.library'), 'shh')[1]).toMatch(/She keeps a tally\.$/);
  });
  it("the Abbot's second known-topic line", () => {
    const [first, second] = twice(at('monastery.cloister'), 'ask abbot about the scroll');
    expect(first).not.toBe(second);
    expect(second).toMatch(/That is a retry policy\."$/);
  });
  it('second looks on the scenery and the people', () => {
    for (const [room, cmd] of [['monastery.gate', 'look at gate'], ['monastery.gate', 'look at monk'], ['monastery.cloister', 'look at floor'], ['monastery.cloister', 'look at abbot'],
      ['monastery.spark', 'look at notebook'], ['monastery.spark', 'look at pandas'], ['monastery.library', 'look at shelves'], ['monastery.library', 'look at case'], ['monastery.library', 'look at librarian']] as const) {
      const [a, b] = twice(at(room), cmd);
      expect(b, `${room}: ${cmd}`).not.toBe(a);
    }
  });
  it('E2 stays intact: with Fabric items off, asking Pandas about the notebook still names the switch, not the scroll command', () => {
    const out = one('monastery.spark', 'ask pandas about the notebook', ['license'], WORLD);
    expect(out).toMatch(/Brother Pandas/);
    const off = step(at('monastery.spark', { 'ts.fabricItems': false }), 'ask pandas about the notebook', WORLD).output[0]!;
    expect(off).toMatch(/Sacristy/);
    expect(off).not.toMatch(/use the scroll/i);
  });
});
