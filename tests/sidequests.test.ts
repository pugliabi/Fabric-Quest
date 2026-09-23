// tests/sidequests.test.ts
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';

const from = (room: string) => ({ ...newGame(WORLD, 3), room });

describe('side quests: in and out', () => {
  it.each(['village.cottage', 'lake.dock', 'monastery.library', 'fortress.yard', 'peaks.ledge'])('show me a table from %s and exit returns there', (room) => {
    const inn = step(from(room), 'show me a table', WORLD);
    expect(inn.state.room).toBe('excel.sheet1');
    expect(inn.sfx).toBe('sidequest');
    expect(inn.notice).toBeTruthy();
    const out = step(inn.state, 'exit', WORLD);
    expect(out.state.room).toBe(room);
    expect(out.sfx).toBe('sidequest-out');
  });
  it('what are my sales numbers enters Copilot; out returns', () => {
    const inn = step(from('village.square'), 'what are my sales numbers', WORLD);
    expect(inn.state.room).toBe('copilot.pane');
    expect(step(inn.state, 'out', WORLD).state.room).toBe('village.square');
  });
  it('no nesting: a trigger inside the other realm is a joke', () => {
    const inn = step(from('village.square'), 'show me a table', WORLD);
    const nested = step(inn.state, 'what are my sales numbers', WORLD);
    expect(nested.state.room).toBe('excel.sheet1');
    expect(nested.output[0]).toMatch(/one side quest at a time/i);
  });
  it('a trigger for the realm you are already in falls through (no nested joke)', () => {
    const inn = step(from('village.square'), 'what are my sales numbers', WORLD);
    expect(inn.state.room).toBe('copilot.pane');
    expect(inn.state.flags['sq.return']).toBeTypeOf('number');
    const again = step(inn.state, 'what are my sales numbers', WORLD);
    expect(again.state.room).toBe('copilot.pane');
    expect(again.output[0]).not.toMatch(/one side quest at a time/i);
    expect(again.stepId).not.toBe('sq.nested');
  });
  it('pacified Jeff points at the Excel door', () => {
    const s = { ...from('village.square'), flags: { ...from('village.square').flags, 'jeff.pacified': true } };
    expect(step(s, 'talk to jeff', WORLD).output[0]).toBe('Jeff sips from his mug. "Better. Now — the numbers don\'t match. Come look. Please. I have Excel open." (Say: help jeff.)');
  });
  it('help jeff in the square is a door into Excel', () => {
    const r = step(from('village.square'), 'help jeff', WORLD);
    expect(r.state.room).toBe('excel.sheet1');
  });
  it('side rooms are never subject to the Peaks delay or Jeff ambient', () => {
    let s = { ...from('village.square'), turns: 2 };
    const r = step(s, 'show me a table', WORLD);
    expect(r.output.some((l) => /Jeff from Finance/.test(l) && /export\?|Excel\?/.test(l))).toBe(false);
  });
});

describe('side quests: nobody dies in a side realm (final review I2)', () => {
  const lethal = ['die', 'format c:', 'talk to jeff about a paginated report'];
  it.each(lethal)('%s in Excel: the realm shrugs instead', (cmd) => {
    const inn = step(from('village.square'), 'show me a table', WORLD);
    const r = step(inn.state, cmd, WORLD);
    expect(r.state.dead).toBe(false);
    expect(r.outcome).toBe('snark');
    expect(r.deathCause).toBeUndefined();
    expect(r.output[0]).toBe('Excel does not do that. Excel does pivot tables.');
    expect(r.state.room).toBe('excel.sheet1');
  });
  it.each(lethal)('%s in Copilot: the gallery declines, the pane treats it as a prompt', (cmd) => {
    const inn = step(from('village.square'), 'copilot', WORLD);
    const pane = step(inn.state, cmd, WORLD);
    expect(pane.state.dead).toBe(false);
    const gallery = step(step(inn.state, 'e', WORLD).state, cmd, WORLD);
    expect(gallery.state.dead).toBe(false);
    expect(gallery.output[0]).toBe('Copilot declines, politely, with a small sparkle.');
    expect(gallery.state.room).toBe('copilot.gallery');
  });
  it('the same lines still kill you in the main realm', () => {
    expect(step(from('village.square'), 'die', WORLD).state.dead).toBe(true);
  });
});

describe('village Jeff after his Excel quest (final review I4)', () => {
  const sq = (flags: Record<string, boolean>) => ({ ...from('village.square'), flags: { ...from('village.square').flags, ...flags } });
  it('pacified: pleased, a little embarrassed, telling no one — not the numbers line', () => {
    const out = step(sq({ 'jeff.pacified': true, 'sq.excel.done': true }), 'talk to jeff', WORLD).output[0]!;
    expect(out).toMatch(/The report was right/);
    expect(out).toMatch(/told no one/);
    expect(out).not.toMatch(/don't match/);
  });
  it('before the mug: same news, and no more begging for Excel', () => {
    const out = step(sq({ 'sq.excel.done': true }), 'talk to jeff', WORLD).output[0]!;
    expect(out).toMatch(/told no one/);
    expect(out).not.toMatch(/export this to Excel/);
  });
  it('the ambient nagging stops once the report is proven right', () => {
    let s = sq({ 'sq.excel.done': true });
    for (let i = 0; i < 6; i++) {
      const r = step(s, 'wait', WORLD);
      expect(r.output.join(' ')).not.toMatch(/Jeff from Finance/);
      s = r.state;
    }
  });
});

describe("Jeff's door and Excel's small gaps (final review M6)", () => {
  it('pre-mug Jeff mentions the export problem too', () => {
    expect(step(from('village.square'), 'talk to jeff', WORLD).output[0]).toMatch(/numbers don't match.*I have Excel open/);
  });
  it('yes, right after his line, goes with Jeff; yes out of the blue does not', () => {
    const talked = step(from('village.square'), 'talk to jeff', WORLD);
    const yes = step(talked.state, 'yes', WORLD);
    expect(yes.state.room).toBe('excel.sheet1');
    expect(yes.stepId).toBe('sq.enter.excel.yes');
    expect(step(from('village.square'), 'yes', WORLD).state.room).toBe('village.square');
    const later = step(step(talked.state, 'look', WORLD).state, 'yes', WORLD);
    expect(later.state.room).toBe('village.square');
  });
  it('after the quest, yes is just yes', () => {
    const s = { ...from('village.square'), flags: { ...from('village.square').flags, 'sq.excel.done': true } };
    expect(step(step(s, 'talk to jeff', WORLD).state, 'yes', WORLD).state.room).toBe('village.square');
  });
  const inExcel = () => step(from('village.square'), 'show me a table', WORLD).state;
  it('ask jeff what did you use is ask jeff', () => {
    const r = step(inExcel(), 'ask jeff what did you use', WORLD);
    expect(r.stepId).toBe('excel.ask-jeff');
    expect(r.output[0]).toMatch(/Sales Amount/);
  });
  it('bare no filter gets Jeff\'s approving nod', () => {
    expect(step(inExcel(), 'no filter', WORLD).output[0]).toMatch(/nods approvingly/);
    const pivot = step(inExcel(), 'e', WORLD).state;
    expect(step(pivot, 'say no filter', WORLD).output[0]).toMatch(/from the next sheet, nods approvingly/);
  });
  it('bare connect in the Data tab asks for the sign-in', () => {
    const data = step(inExcel(), 'n', WORLD).state;
    expect(step(data, 'connect', WORLD).output[0]).toMatch(/Sign-in required/);
  });
  it('the entry triggers typed inside Excel get an Excel answer', () => {
    expect(step(inExcel(), 'show me the table', WORLD).output[0]).toMatch(/already in Excel/);
    expect(step(inExcel(), 'analyze in excel', WORLD).output[0]).toMatch(/Data tab/);
    const data = step(inExcel(), 'n', WORLD).state;
    expect(step(data, 'analyze in excel', WORLD).output[0]).toMatch(/Sign-in required/);
  });
});

describe('leaving a realm is discoverable, and QUIT does not end the run (final review I6)', () => {
  const excel = () => step(from('village.square'), 'show me a table', WORLD);
  const copilot = () => step(from('village.square'), 'copilot', WORLD);
  it('the exits line names exit in every side room', () => {
    expect(excel().output.join('\n')).toMatch(/^Exits: e, n, exit \(back to the realm\)\.$/m);
    expect(copilot().output.join('\n')).toMatch(/^Exits: e, exit \(back to the realm\)\.$/m);
    for (const [s, dir] of [[excel().state, 'n'], [excel().state, 'e'], [copilot().state, 'e']] as const) {
      expect(step(s, dir, WORLD).output[0]).toMatch(/exit \(back to the realm\)/);
    }
    expect(step(from('village.square'), 'look', WORLD).output[0]).not.toMatch(/back to the realm/);
  });
  it('help inside a realm says how to leave it', () => {
    const e = step(excel().state, 'help', WORLD).output;
    expect(e[e.length - 1]).toBe("Type EXIT to leave Jeff's Excel; you return where you were.");
    const c = step(copilot().state, 'help', WORLD).output;
    expect(c[c.length - 1]).toBe('Type EXIT to leave Copilot; you return where you were.');
    expect(step(from('village.square'), 'help', WORLD).output.join(' ')).not.toMatch(/Type EXIT/);
  });
  it.each([
    ['Excel', excel, "Jeff's Excel"],
    ['Copilot', copilot, 'Copilot'],
  ] as const)('quit in %s leaves the realm with the exit sting and a warning', (_n, enter, name) => {
    const r = step(enter().state, 'quit', WORLD);
    expect(r.state.room).toBe('village.square');
    expect(r.sfx).toBe('sidequest-out');
    expect(r.outcome).not.toBe('meta'); // App.tsx retires the run only on the builtin quit ('meta')
    expect(r.output[1]).toBe(`QUIT ends the whole quest. You've only left ${name}. Say it again out here if you mean it.`);
    const again = step(r.state, 'quit', WORLD);
    expect(again.outcome).toBe('meta');
    expect(again.parsed.verb).toBe('quit');
  });
  it('a Copilot prompt that starts with quit leaves too, instead of ending the run', () => {
    const r = step(copilot().state, 'quit total net sales', WORLD);
    expect(r.state.room).toBe('village.square');
    expect(r.outcome).toBe('move');
  });
  it('restart inside a realm is the ordinary restart (M10)', () => {
    for (const s of [excel().state, copilot().state, step(copilot().state, 'e', WORLD).state]) {
      const r = step(s, 'restart', WORLD);
      expect(r.parsed.verb).toBe('restart'); // App.tsx sees the verb and starts a fresh game
      expect(r.outcome).toBe('meta');
      expect(r.stepId).not.toMatch(/^copilot\.(rung|win)|^sq\./); // not a prompt, not an exit
    }
    const fresh = newGame(WORLD, 3);
    expect(fresh.room).toBe(WORLD.start);
    expect(fresh.flags['sq.return']).toBeUndefined();
    expect(fresh.bonus).toBe(0);
  });
});
