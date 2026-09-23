import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { MALAPROPS } from '../src/world/voice';
import type { GameState } from '../src/engine/types';

const one = (room: string, cmd: string, flags: Record<string, boolean | number> = {}) => step({ ...newGame(WORLD, 3), room, flags }, cmd, WORLD).output[0]!;

describe('Keep sweep', () => {
  it('gate and hall', () => {
    expect(one('fortress.bridge', 'ask guard about the moat')).toBe("'The moat?' The guard looks down. 'That's the Warehouse. We built the Keep on it. Don't tell the Duke I said Warehouse.'");
    expect(one('fortress.bridge', 'fish in the moat')).toBe("You fish in the Moat of T-SQL. You catch a stored procedure. It has 400 lines and a comment that says 'temporary'. You release it.");
    expect(one('fortress.bridge', 'say f2')).toMatch(/Not enough capacity\.$/);
    expect(one('fortress.hall', 'look at portraits')).toMatch(/a paperclip with eyes\. 'It looks like you're writing a measure\.'$/);
  });
  it('model view, chamber, studio', () => {
    expect(one('fortress.model', 'ask cardinality about many to many')).toBe("'Many to many,' says Sir Cardinality. 'Is a relationship. Like yours with the truth.'");
    expect(one('fortress.model', 'use date table')).toMatch(/starts working\. No points\. It should have been done already\.$/);
    expect(one('fortress.throne', 'ask duke about sql')).toBe("'SQL,' says the Duke, and then, to himself, 'EVALUATE.' Then, quieter, 'SELECT.' He will not forgive himself.");
    expect(one('fortress.throne', 'say dax')).toBe(`You say 'DAX' to the Duke of DAX. He says nothing. You have been ${MALAPROPS.daxxed} out.`);
    expect(one('fortress.yard', 'ask card about jeff')).toBe('The Card shows (Jeff). Then (Blank). It has no relationship to Jeff; nobody does.');
    expect(one('fortress.yard', 'eat the pie')).toBe("You eat a slice. It is 'Other'. It tastes like the other eleven 'Other's.");
    expect(one('fortress.yard', 'look at refresh')).toMatch(/A sticky note on it reads DO NOT TOUCH — JEFF\.$/);
  });
});

// ---- The sweep beyond the plan's lines ----

const at = (room: string, flags: Record<string, boolean | number> = {}): GameState => ({ ...newGame(WORLD, 3), room, flags });
/** The same command typed n times in a row: the outputs, first line each. */
const run = (s: GameState, cmd: string, n: number): string[] => {
  const out: string[] = [];
  for (let i = 0; i < n; i++) { const r = step(s, cmd, WORLD); out.push(r.output[0]!); s = r.state; }
  return out;
};

describe('Keep sweep: the rulings', () => {
  it('R-7: say dax is a wrong answer with its own line, and nothing counts it', () => {
    let s = at('fortress.throne');
    for (let i = 0; i < 5; i++) {
      const r = step(s, 'say dax', WORLD);
      expect(r.stepId).toBe('fortress.say-dax-word');
      expect(r.output[0]).toBe(`You say 'DAX' to the Duke of DAX. He says nothing. You have been ${MALAPROPS.daxxed} out.`);
      s = r.state;
    }
    expect(Object.keys(s.flags).filter((k) => /^(duke\.wrong|curse\.)/.test(k))).toEqual([]);
  });
  it('R-3: the new topics are things in the room', () => {
    expect(one('fortress.model', 'look at many to many')).toMatch(/many-to-many bridge/);
    expect(one('fortress.throne', 'look at sql')).toMatch(/opens onto the moat/);
    expect(one('fortress.yard', 'look at jeff')).toMatch(/DO NOT TOUCH — JEFF/);
    expect(one('fortress.model', 'ask cardinality about both')).not.toMatch(/Like yours with the truth/);
  });
  it('C1: the sin outside the chamber is the right idea in the wrong room; inside, it is still the moat', () => {
    for (const room of ['fortress.bridge', 'fortress.hall', 'fortress.model', 'fortress.yard']) {
      expect(one(room, 'say calculated column'), room).toMatch(/^Right sin, wrong room\./);
    }
    expect(one('fortress.hall', 'say calculated column', { 'trial.moat': true })).toMatch(/^You said it once where it counted/);
    const moat = step(at('fortress.throne'), 'say calculated column', WORLD);
    expect(moat.state.flags['trial.moat']).toBe(true);
    expect(moat.pointsAwarded).toBe(25);
  });
});

describe('Keep sweep: second and third looks', () => {
  it('scenery remembers being looked at', () => {
    const cases: [string, string, RegExp][] = [
      ['fortress.bridge', 'look at moat', /suggests an index\.$/],
      ['fortress.bridge', 'look at battlements', /owes him a SKU\.$/],
      ['fortress.hall', 'look at portraits', /'It looks like you're lost\.'$/],
      ['fortress.model', 'look at plinths', /this might be a relationship\.$/],
      ['fortress.throne', 'look at throne', /Neither does your visit\.$/],
      ['fortress.throne', 'look at filter pane', /It does not need to be\.$/],
      ['fortress.yard', 'look at pie', /filed under 'Other'\.$/],
    ];
    for (const [room, cmd, second] of cases) {
      const [a, b] = run(at(room), cmd, 2);
      expect(b, `${room}: ${cmd}`).toMatch(second);
      expect(a).not.toBe(b);
    }
    expect(run(at('fortress.bridge'), 'look at moat', 3)[2]).toMatch(/billing you for the scan\.$/);
    expect(run(at('fortress.hall'), 'look at portraits', 3)[2]).toMatch(/Nobody knows what it does there either\.$/);
  });
});

describe('Keep sweep: derailments and the moat after the moat', () => {
  it('Sir Cardinality contradicts himself; the Card and the pie bicker', () => {
    expect(one('fortress.model', 'ask cardinality about date table')).toBe("'Mark it as a date table,' says Sir Cardinality. Then, quickly, 'I did not say that. A knight does not do your homework.' He has done your homework.");
    expect(one('fortress.yard', 'ask card about pie')).toBe("The Card shows (Pie). The pie shows 3.2%. That's the whole meeting.");
  });
  it('the moat remembers you', () => {
    expect(one('fortress.bridge', 'look at moat', { 'trial.moat': true, 'bridge.down': true })).toMatch(/souvenir, and it is not giving it back\.$/);
    expect(one('fortress.bridge', 'fish in the moat', { 'trial.moat': true, 'bridge.down': true })).toMatch(/You left it there on the way down\.$/);
  });
});
