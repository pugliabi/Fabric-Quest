import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { CLEAR_TEXT, FEEDBACK_TEXT } from '../src/world/copilot';
import type { GameState } from '../src/engine/types';

const one = (room: string, cmd: string) => step({ ...newGame(WORLD, 3), room, flags: { 'sq.return': 1 } }, cmd, WORLD).output[0]!;
const run = (room: string, cmds: string[]) => {
  let s: GameState = { ...newGame(WORLD, 3), room, flags: { 'sq.return': 1 } };
  return cmds.map((c) => { const r = step(s, c, WORLD); s = r.state; return r; });
};

describe('Copilot sweep', () => {
  it('the pane', () => {
    expect(one('copilot.pane', 'thanks')).toBe("Copilot: You're welcome! I've logged your gratitude as feedback. It will be reviewed.");
    expect(one('copilot.pane', 'who are you')).toBe("Copilot: I'm Copilot! I can help with data, questions, and, if you ask nicely, a sourdough starter.");
    expect(one('copilot.pane', 'are you an ai')).toBe("Copilot: I'm a large language model, but I'm also here for you. Mostly the first thing.");
    expect(one('copilot.pane', 'write a measure')).toBe("Copilot: Here's a measure! It returns BLANK().");
    expect(one('copilot.pane', 'talk to prompt box')).toBe('You talk to the prompt box. It listens beautifully. It is the best listener in the realm and it has never once heard you.');
    expect(one('copilot.pane', 'look')).toMatch(/A paperclip's silhouette in the corner of the sparkle\. It looks like it's writing a measure\./);
    expect(one('copilot.pane', 'look at sparkle')).toMatch(/It does not promise to answer the thing you asked\. Above it, your last answer is empty\. It is waiting for you\.$/);
    expect(one('copilot.pane', 'click the sparkle')).toBe('You click the sparkle. It sparkles harder. That is the entire feature, and it shipped on time.');
  });
  it('the gallery', () => {
    expect(one('copilot.gallery', 'push the model')).toBe('You push the biggest model. It does not move. It has the most rows; it has the most everything except a badge.');
    expect(one('copilot.gallery', 'use plinth')).toBe('You lean on a plinth. The model on it recalculates a measure out of nerves.');
    expect(one('copilot.gallery', 'use badge')).toBe('You polish the badge. It was already certified; now it is shiny.');
    expect(one('copilot.gallery', 'look at final2')).toMatch(/Copilot likes it because it has the most rows\.$/);
  });
  it('the gallery: second and third looks at each plinth, then the third again', () => {
    for (const [noun, second, third] of [
      ['badge', /steering committee/, /MORE certified/],
      ['big one', /brings up at parties/, /Nobody talks about Sales_v3_FINAL\.$/],
      ['sign', /laminated\. Somebody expected a fight\.$/, /You're the reason it got laminated\.$/],
    ] as const) {
      const rs = run('copilot.gallery', [`look at ${noun}`, `look at ${noun}`, `look at ${noun}`, `look at ${noun}`]);
      expect(rs[0]!.output[0], noun).not.toMatch(second);
      expect(rs[1]!.output[0], noun).toMatch(second);
      expect(rs[2]!.output[0], noun).toMatch(third);
      expect(rs[3]!.output[0], noun).toMatch(third);
    }
    // The measures are the hint: every look at them is the list.
    const ms = run('copilot.gallery', ['look at measures', 'look at measures']);
    for (const r of ms) expect(r.output[0]).toMatch(/Net Sales · Sales Amount · Returns/);
  });
  it('clearing the chat in the pane gets no main-realm chirps', () => {
    const rs = run('copilot.pane', ['sales', 'start over', 'start over', 'ugh start over']);
    expect(rs[1]!.output).toEqual([CLEAR_TEXT]);
    expect(rs[2]!.output).toEqual([CLEAR_TEXT]);
    expect(rs[3]!.output).toEqual([CLEAR_TEXT + FEEDBACK_TEXT]);
    expect(rs[3]!.output.join('\n')).not.toMatch(/throttled|slot machine/);
  });
  it('bare start is a prompt; start again, start over and new chat clear', () => {
    const bare = run('copilot.pane', ['certified net sales', 'start']);
    expect(bare[1]!.stepId).not.toBe('copilot.clear');
    expect(bare[1]!.state.flags['copilot.model']).toBe(1);
    for (const c of ['start again', 'start over', 'new chat']) {
      const rs = run('copilot.pane', ['certified net sales', c]);
      expect(rs[1]!.stepId, c).toBe('copilot.clear'); expect(rs[1]!.state.flags['copilot.model'], c).toBe(0);
    }
  });
  it('the second reply at the same stage opens differently; please has its own beats', () => {
    const rs = run('copilot.pane', ['sales', 'sales', 'sales please']);
    expect(rs[0]!.output[0]).toMatch(/^Copilot: I found 3 semantic models/);
    expect(rs[1]!.output[0]).toMatch(/^Copilot: Love a follow-up! I found 3 semantic models/);
    expect(rs[2]!.output[0]).toMatch(/You're SO welcome\. Manners don't change the answer, but they are logged\./);
  });
});
