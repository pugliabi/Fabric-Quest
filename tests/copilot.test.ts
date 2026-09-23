// tests/copilot.test.ts — the pane as a room. The slot model itself is covered by tests/copilot-slots.test.ts.
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';

describe('in the pane', () => {
  const at = (cmds: string[]) => { let s = { ...newGame(WORLD, 5), room: 'copilot.pane', flags: { 'sq.return': 1 } }; const outs: string[][] = []; for (const c of cmds) { const r = step(s, c, WORLD); s = r.state; outs.push(r.output); } return { s, outs }; };
  it('any unhandled line is a prompt; ask copilot / say / copilot prefixes are stripped', () => {
    const { outs } = at(['ask copilot show me sales', 'say show me sales', 'copilot show me sales', 'show me sales']);
    for (const o of outs) expect(o[0]).toMatch(/3 semantic models/);
  });
  it('look/inventory/exit still work as commands', () => {
    const { outs } = at(['look', 'inventory']);
    expect(outs[0]![0]).toMatch(/COPILOT PANE/);
  });
  it('winning awards +25 once and returns home', () => {
    const { s } = at(['total q4 2025 northeast net sales from the certified model, just the number']);
    expect(s.bonus).toBe(25); expect(s.flags['sq.copilot.done']).toBe(true); expect(s.room).toBe('village.square');
  });
  it('frustration wrapper inside the pane adds the feedback line', () => {
    const { outs } = at(['ugh show me sales']);
    expect(outs[0]!.join(' ')).toMatch(/logged it as feedback/i);
  });
  it('the gallery reveals the certified model and its measures', () => {
    const { outs } = at(['e', 'look at models', 'look at measures']);
    expect(outs[1]![0]).toMatch(/Sales \(Certified\)/); expect(outs[2]![0]).toMatch(/Net Sales/);
  });
});

describe('in the pane: commands vs prompts (controller rulings)', () => {
  const at = (cmds: string[]) => { let s = { ...newGame(WORLD, 5), room: 'copilot.pane', flags: { 'sq.return': 1 } }; const rs = []; for (const c of cmds) { const r = step(s, c, WORLD); s = r.state; rs.push(r); } return { s, rs }; };
  it('step ids are copilot.stage.N and copilot.win; flags record stage and shape', () => {
    const { rs } = at(['sales', 'show me sales', 'show me q4 northeast sales from the certified model', 'ask copilot for total net sales for the northeast region in q4 2025 from the certified model, just the number']);
    expect(rs.map((r) => r.stepId)).toEqual(['copilot.stage.1', 'copilot.stage.1', 'copilot.stage.2', 'copilot.win']);
    expect(rs[1]!.state.flags['copilot.last']).toBe(1); expect(rs[1]!.state.flags['copilot.shape']).toBe(0);
    expect(rs[2]!.state.flags['copilot.shape']).toBe(0); // the six-measures list
    expect(rs[3]!.state.room).toBe('village.square'); expect(rs[3]!.sfx).toBe('bonus');
    expect(rs[1]!.sfx).toBe('copilot-think'); expect(rs[1]!.output[0]).toMatch(/Copilot suggests: Try: use the certified model\./);
  });
  it('the bonus is awarded once', () => {
    const win = 'total q4 2025 northeast net sales from the certified model, just the number';
    const { s } = at([win, 'copilot', win]);
    expect(s.bonus).toBe(25);
  });
  it('lines starting with parser verbs are still prompts (total, add, filter, what, how many, get me)', () => {
    const { rs } = at(['add sales from the certified model', 'filter sales by final2', 'what are my sales numbers', 'how many sales in the northeast', 'get me sales please', 'list sales tables']);
    for (const r of rs) expect(r.stepId).toMatch(/^copilot\.stage\./);
  });
  it('bare copilot in the pane is not the sourdough egg', () => {
    for (const c of ['copilot', 'ask copilot', 'talk to copilot']) expect(at([c]).rs[0]!.output[0]).toMatch(/^Copilot is right here. It has been right here since the sparkle./);
  });
  it('get ye flask, get prompt, help and e still work as commands', () => {
    const { rs } = at(['get ye flask', 'get prompt', 'help', 'e']);
    expect(rs[0]!.output[0]).toMatch(/Ye cannot get ye flask/);
    expect(rs[1]!.output[0]).toMatch(/cannot take the prompt box/);
    expect(rs[2]!.stepId).not.toMatch(/^copilot\.stage/);
    expect(rs[3]!.state.room).toBe('copilot.gallery');
  });
  it('outside / go outside leave the realm like exit', () => {
    for (const c of ['outside', 'go outside', 'walk out']) {
      const r = at([c]).rs[0]!;
      expect(r.state.room).toBe('village.square'); expect(r.sfx).toBe('sidequest-out');
    }
    const g = at(['e', 'go outside']).rs[1]!;
    expect(g.state.room).toBe('village.square');
  });
  it('the other realm\'s trigger is still the no-nesting joke', () => {
    expect(at(['show me a table']).rs[0]!.output[0]).toMatch(/one side quest at a time/i);
  });
  it('the same prompt twice: Copilot is consistent', () => {
    const { rs } = at(['show me sales', 'show me sales']);
    expect(rs[0]!.output[0]).not.toMatch(/same question/); expect(rs[1]!.output[0]).toMatch(/same question/);
  });
  it('look describes the last answer; the flask names the last hint', () => {
    const { rs } = at(['show me q4 northeast sales from the certified model', 'look', 'get ye flask']);
    expect(rs[1]!.output[0]).toMatch(/is a list/);
    expect(rs[2]!.output[0]).toMatch(/net sales/);
  });
  it('in the gallery, bare model and copilot are answered by the room', () => {
    const { rs } = at(['e', 'look at model', 'copilot', 'look at certified']);
    expect(rs[1]!.output[0]).toMatch(/Three semantic models/);
    expect(rs[2]!.output[0]).toMatch(/west, in the pane/);
    expect(rs[3]!.output[0]).toMatch(/Net Sales · Sales Amount · Returns/);
  });
  it('hey copilot is Copilot, not a greeting', () => expect(at(['hey copilot']).rs[0]!.output[0]).toMatch(/^Copilot is right here. It has been right here since the sparkle./));
  it('the prompt box shows the last answer', () => {
    const { rs } = at(['show me sales', 'read the answer', 'look at reply']);
    expect(rs[1]!.output[0]).toMatch(/is a list/); expect(rs[2]!.output[0]).toMatch(/is a list/);
  });
});

describe('in the pane: one narrator, not two (review round 1)', () => {
  const at = (cmds: string[]) => { let s = { ...newGame(WORLD, 5), room: 'copilot.pane', flags: { 'sq.return': 1 } }; const outs: string[][] = []; for (const c of cmds) { const r = step(s, c, WORLD); s = r.state; outs.push(r.output); } return outs.map((o) => ({ text: o.join('\n'), lines: o.length })); };
  it('ugh show me sales: exactly one frustration mention', () => {
    const [o] = at(['ugh show me sales']);
    expect(o!.text.match(/frustrat/gi)).toHaveLength(1);
  });
  it('show me sales please: You\'re welcome, not Frustration logged', () => {
    const [o] = at(['show me sales please']);
    expect(o!.text).toMatch(/You're welcome/); expect(o!.text).not.toMatch(/Frustration logged/);
  });
  it('the same prompt twice: Copilot\'s consistency line only', () => {
    const outs = at(['show me sales', 'show me sales']);
    expect(outs[1]!.text).toMatch(/same question/); expect(outs[1]!.text).not.toMatch(/slot machine/);
    expect(outs[1]!.lines).toBe(1);
  });
  it('shouting still gets the shout line', () => {
    const [o] = at(['show me sales!']);
    expect(o!.lines).toBe(2);
  });
});

describe('Copilot: final review fixes', () => {
  const home = () => ({ ...newGame(WORLD, 5), room: 'village.square' });
  const pane = (flags: Record<string, boolean | number> = {}) => ({ ...newGame(WORLD, 5), room: 'copilot.pane', flags: { 'sq.return': 1, ...flags } });
  const WIN = 'total q4 2025 northeast net sales from the certified model, just the number';

  it('I5: ask copilot <anything> enters and asks it on the same turn', () => {
    const r = step(home(), 'ask copilot for q4 sales', WORLD);
    expect(r.state.room).toBe('copilot.pane');
    expect(r.sfx).toBe('sidequest');
    expect(r.stepId).toMatch(/^copilot\.stage\./);
    const text = r.output.join('\n');
    expect(text).toMatch(/COPILOT PANE/);
    expect(r.output[r.output.length - 1]).toMatch(/^Copilot: /);
    // the entrance quip sits between the pane and the answer, and still opens the box
    expect(text.indexOf('It would like that very much')).toBeLessThan(text.indexOf('Copilot: '));
    expect(r.notice).toMatch(/It would like that very much/);
  });
  it.each(['ask copilot what are my sales numbers', 'hey copilot, show me sales', 'copilot, show me sales', 'talk to copilot about my sales numbers'])('%s: enters with a prompt', (cmd) => {
    const r = step(home(), cmd, WORLD);
    expect(r.state.room).toBe('copilot.pane');
    expect(r.stepId).toBe('copilot.stage.1');
  });
  it.each(['ask copilot', 'copilot', 'hey copilot', 'open copilot'])('%s: just enters', (cmd) => {
    const r = step(home(), cmd, WORLD);
    expect(r.state.room).toBe('copilot.pane');
    expect(r.stepId).toBe('sq.enter.copilot');
    expect(r.output.join('\n')).not.toMatch(/^Copilot: /m);
  });
  it('I5: the winning prompt on the way in pays +25, comes straight home and opens the box with the answer', () => {
    const r = step(home(), `ask copilot for ${WIN}`, WORLD);
    expect(r.bonusAwarded).toBe(25);
    expect(r.state.room).toBe('village.square');
    expect(r.sfx).toBe('bonus');
    expect(r.notice).toMatch(/\$1,247,930/);
  });
  it('the sourdough egg no longer shadows the trigger', () => {
    expect(step(home(), 'ask the ai for help', WORLD).output[0]).toMatch(/sourdough/);
    expect(step(home(), 'ask copilot for help', WORLD).output.join(' ')).not.toMatch(/sourdough/);
  });
  it('M1: the first entry does not print the sparkle line twice', () => {
    const text = step(home(), 'copilot', WORLD).output.join('\n');
    expect(text.match(/It would like that very much/g)).toHaveLength(1);
  });
  it('M2: after stage 5 the pane does not claim a wrong model', () => {
    let s = pane();
    s = step(s, 'total q4 2025 northeast net sales from the certified model by product and by day and by salesperson and by week and by store and by hour', WORLD).state;
    expect(s.flags['copilot.last']).toBe(5);
    const look = step(s, 'look', WORLD).output[0]!;
    expect(look).not.toMatch(/wrong model/);
    expect(look).toMatch(/three pages/);
    const wrong = step(pane(), 'show me sales from final2', WORLD).state;
    expect(step(wrong, 'look', WORLD).output[0]).toMatch(/wrong model/);
  });
  it('M3: wrapper words do not count toward the prompt', () => {
    for (const cmd of [`i want to see ${WIN.replace(', just the number', '')}`, `ugh just give me ${WIN.replace(', just the number', '')}`, `${WIN} dammit`]) {
      const r = step(pane(), cmd, WORLD);
      expect(r.stepId, cmd).toBe('copilot.win');
    }
  });
  it('M3: frustration comes from the wrapper; please is thanked, not logged', () => {
    expect(step(pane(), 'show me sales, dammit', WORLD).output.join(' ')).toMatch(/logged it as feedback/);
    expect(step(pane(), 'show me sales right now', WORLD).output.join(' ')).toMatch(/logged it as feedback/);
    const please = step(pane(), 'show me sales please', WORLD).output.join(' ');
    expect(please).toMatch(/You're welcome/); expect(please).not.toMatch(/feedback/);
    expect(step(pane(), 'show me sales now', WORLD).output.join(' ')).not.toMatch(/feedback/);
  });
  it('M11: re-winning is a short reply — no cha-ching, no eject, no bonus', () => {
    const r = step(pane({ 'sq.copilot.done': true, 'bonus.sq.copilot': true }), WIN, WORLD);
    expect(r.stepId).toBe('copilot.win-again');
    expect(r.sfx).not.toBe('bonus');
    expect(r.state.room).toBe('copilot.pane');
    expect(r.bonusAwarded ?? 0).toBe(0);
    expect(r.output[0]).toMatch(/Already answered\. It remembers\./);
  });
});
