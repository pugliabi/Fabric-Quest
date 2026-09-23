import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import type { GameState, Verb } from '../src/engine/types';
import type { Rule } from '../src/world/types';
import { GOLDEN_PATH } from './golden-path';

const VERBS = ['open', 'use', 'push', 'pull', 'cross', 'climb', 'lower', 'raise', 'enter', 'knock on', 'unlock', 'break', 'kick'];
const at = (room: string, extra: Partial<GameState> = {}): GameState => ({ ...newGame(WORLD, 2), room, ...extra });
const one = (room: string, cmd: string, extra: Partial<GameState> = {}) => step(at(room, extra), cmd, WORLD);
/** The verbs a gate leaves to its room: the Studio shapes `use` itself; the Monastery Gate scores `open`/`unlock`/`use` (monastery.open-gate, monastery.use-gate). */
const roomVerb = (room: string, v: string): boolean =>
  (room === 'fortress.yard' && v === 'use') || (room === 'monastery.gate' && ['open', 'unlock', 'use'].includes(v));
/** The gate's reply: the first line that is not the Peaks' interactive-delay marker (step.ts prepends it on the Pass and Ledge without boots). */
const first = (r: ReturnType<typeof step>): string => r.output.find((l) => l !== '(…interactive delay…)')!;

describe('every gate object answers the obvious verbs with the puzzle (spec1 §3.2)', () => {
  const cases: [string, string[], RegExp, Partial<GameState>][] = [
    ['fortress.bridge', ['drawbridge', 'gate', 'splash screen'], /The bridge answers to the guard\. The guard answers to SKUs\. Say one to him\./, {}],
    ['fortress.throne', ['throne', 'window', 'duke'], /The Duke throws people from that window for one sin\. Say it\./, {}],
    ['fortress.yard', ['card', 'big refresh'], /The Card wants staring at\. The refresh is stuck on the pie\. Thirty-one slices; make it a bar chart\./, {}],
    ['monastery.gate', ['gate', 'door', 'bell'], /Shut\. The session is starting\. Open the gate, or wait for it; either one gets you in\./, {}],
    ['monastery.gate', ['session', 'progress bar'], /It's starting\. Open the gate, or wait\. That's the puzzle\. Really\./, {}],
    ['monastery.spark', ['notebook', 'cell', 'session'], /The cell wants Spark, not pandas\. The Library, west of the cloister, keeps a scroll about it\./, {}],
    ['monastery.library', ['scroll', 'librarian', 'case'], /Library card only\. Any license will do\. Well\. Any license she accepts\./, {}],
    ['lake.dock', ['boat', 'ferryman', 'lamp'], /The Ferryman's OFFLINE\. Credentials expired\. The Mill has the ones that haven't\./, {}],
    ['peaks.pass', ['sign', 'delay', 'pass'], /Interactive operations may be delayed\. Boots help\. The Studio's Big Refresh drops a pair\./, {}],
    ['peaks.ledge', ['door', 'sigils'], /Three sigils\. Look like an Engineer, smell like a Warehouse, hold the Key\. It counts them for you: 0 of 3\./, {}],
    ['peaks.shrine', ['dragon', 'throttlor'], /He asked you a question\. Answer it\. `say <answer>`\./, {}],
  ];
  for (const [room, nouns, shape, extra] of cases) {
    for (const noun of nouns) {
      it(`${room}: <verb> ${noun}`, () => {
        for (const v of VERBS) {
          if (roomVerb(room, v)) continue; // the Studio's own use-lines already shape that puzzle; the Monastery Gate's open/use score
          expect(first(one(room, `${v} ${noun}`, extra)), `${v} ${noun}`).toMatch(shape);
        }
      });
    }
  }
  it('the second try adds the extra; later tries rotate the old flavor lines with it', () => {
    let s = at('fortress.bridge');
    const outs: string[] = [];
    for (let i = 0; i < 4; i++) { const r = step(s, 'open drawbridge', WORLD); s = r.state; outs.push(r.output[0]!); }
    expect(outs[0]).not.toMatch(/Trial's free/);
    expect(outs[1]).toMatch(/Say one to him\. Trial's free\.$/);
    expect(outs[2]).toMatch(/Trial's free\.$/);
    expect(outs[2]).not.toMatch(/answers to the guard/);
    expect(s.flags['gate.desktop']).toBe(4);
  });
  it('a solved gate declines, so the room answers as before', () => {
    expect(one('fortress.bridge', 'open drawbridge', { flags: { 'bridge.down': true } }).output[0]).not.toMatch(/answers to the guard/);
    expect(one('lake.dock', 'use lamp', { flags: { 'ferry.online': true } }).output[0]).not.toMatch(/OFFLINE\. Credentials expired/);
  });
  it('the retired open/use rules answer their solved state instead of the generic line', () => {
    expect(one('fortress.bridge', 'open drawbridge', { flags: { 'bridge.down': true } }).output[0]).toMatch(/already down, you moron\. Try: north\./);
    expect(one('fortress.throne', 'open window', { flags: { 'trial.moat': true } }).output[0]).toMatch(/You two have history now\./);
    expect(one('monastery.gate', 'open gate', { flags: { 'gate.open': true } }).output[0]).toMatch(/already open, you moron\. Try: north\./);
    expect(one('monastery.library', 'open case', { flags: { 'scroll.lent': true } }).output[0]).toMatch(/open and empty/);
    expect(one('monastery.spark', 'use notebook', { flags: { 'notebook.fixed': true } }).output[0]).toMatch(/Four seconds/);
    expect(one('lake.dock', 'use lamp', { flags: { 'ferry.online': true } }).output[0]).toMatch(/ONLINE\. It stays ONLINE/);
    expect(one('lake.dock', 'use boat', { flags: { 'ferry.online': true } }).output[0]).toMatch(/Boats are boarded, not used/);
    expect(one('lake.dock', 'open boat', { flags: { 'ferry.online': true } }).output[0]).toMatch(/Boats are boarded, not opened/);
    expect(one('peaks.ledge', 'open door', { flags: { 'shrine.open': true }, worn: ['boots'], inventory: ['boots'] }).output[0]).toMatch(/already open, you moron\. Try: north\./);
  });
  it('the shape never leaks a generic line for any verb, any noun, any gate', () => {
    const generic = /nothing happens|That doesn't do anything here|You push\. Nothing moves|You kick it\. The realm logs|climb a hierarchy|I don't understand/i;
    for (const [room, nouns, , extra] of cases) for (const noun of nouns) for (const v of VERBS) {
      if (roomVerb(room, v)) continue;
      expect(first(one(room, `${v} ${noun}`, extra)), `${room}: ${v} ${noun}`).not.toMatch(generic);
    }
  });
  it('the ledge counts the lit sigils and still opens for the Worthy', () => {
    expect(first(one('peaks.ledge', 'push door', { flags: { 'trial.moat': true, 'trial.key': true } }))).toMatch(/2 of 3/);
    const r = one('peaks.ledge', 'open door', { flags: { 'trial.moat': true, 'trial.key': true, 'trial.hoodie': true } });
    expect(r.pointsAwarded).toBe(5);
    expect(r.state.flags['shrine.open']).toBe(true);
  });
  it('n at the Gate names the guard', () => {
    expect(one('fortress.bridge', 'n').output[0]).toBe('The drawbridge is up. It is updating (1 of 3). The moat below is deep and full of GROUP BY. The guard is right there. He wants a SKU.');
  });
  it('the Studio keeps its refresh errors for use refresh', () => {
    expect(one('fortress.yard', 'use refresh').output[0]).toMatch(/^Refresh (failed|succeeded)/);
  });
});

describe('the displaced open/use lines live on in the third-try rotation (add-mode)', () => {
  /** Every line the gate says from try 3 on: the pool cycles by try count, so sweep the counter (and a few seeds). */
  const rotation = (room: string, cmd: string, gateId: string, extra: Partial<GameState> = {}): Set<string> => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 3; seed++) for (let n = 2; n < 10; n++) {
      const s: GameState = { ...newGame(WORLD, seed), room, ...extra, flags: { ...extra.flags, [`gate.${gateId}`]: n } };
      seen.add(step(s, cmd, WORLD).output[0]!);
    }
    return seen;
  };
  it.each([
    ['fortress.bridge', 'open drawbridge', 'desktop', {}, /STATE\. YOUR\. SKU\./],
    ['fortress.bridge', 'use splash screen', 'desktop', {}, /This is the update\./],
    ['fortress.throne', 'open window', 'duke', {}, /The moat winks up at you/],
    ['fortress.throne', 'use throne', 'duke', {}, /autocompletes your hand to SUMX\(/],
    ['monastery.spark', 'use notebook', 'notebook', {}, /Run All/],
    ['monastery.library', 'open case', 'library', {}, /LIBRARY CARD REQUIRED/],
    ['lake.dock', 'use lamp', 'dock', {}, /blinks OFFLINE a little faster/],
    ['peaks.ledge', 'open door', 'ledge', { worn: ['boots'], inventory: ['boots'] }, /The door does not move\. Still dark:/],
    ['peaks.ledge', 'kick door', 'ledge', { worn: ['boots'], inventory: ['boots'] }, /The door is a mountain/],
    ['monastery.cloister', 'use abbot', 'abbot', {}, /You kneel\./],
  ] as [string, string, string, Partial<GameState>, RegExp][])('%s: %s rotates in the old line', (room, cmd, id, extra, want) => {
    expect([...rotation(room, cmd, id, extra)].some((l) => want.test(l)), [...rotation(room, cmd, id, extra)].join('\n')).toBe(true);
  });
  it('a third try never repeats the shape verbatim when there is a flavor pool', () => {
    for (const l of rotation('fortress.bridge', 'push drawbridge', 'desktop')) expect(l).not.toMatch(/^The bridge answers to the guard/);
  });
});

describe('fix round 1: the pools are verb- and noun-aware', () => {
  const tries = (room: string, cmd: string, k: number, extra: Partial<GameState> = {}): string[] => {
    let s = at(room, extra);
    const outs: string[] = [];
    for (let i = 0; i < k; i++) { const r = step(s, cmd, WORLD); s = r.state; outs.push(first(r)); }
    return outs;
  };
  it('kick duke never says you opened the window; a command no pool line fits repeats the shape and the hint', () => {
    for (const l of tries('fortress.throne', 'kick duke', 6)) expect(l).not.toMatch(/You open the window|You lean out|You measure the window|reach for the throne/);
    const outs = tries('fortress.throne', 'kick duke', 4);
    expect(outs[2]).toBe('The Duke throws people from that window for one sin. Say it. Two words. They go in a table.');
    expect(outs[3]).toBe(outs[2]);
    for (const l of tries('lake.dock', 'kick ferryman', 6)) expect(l).not.toMatch(/untie the boat|tap the lamp/);
    for (const l of tries('lake.dock', 'use lamp', 6)) expect(l).not.toMatch(/push the Ferryman|untie the boat/);
    for (const l of tries('monastery.cloister', 'kick abbot', 6)) expect(l).not.toMatch(/You kneel/);
    for (const l of tries('peaks.pass', 'climb rocks', 6)) expect(l).not.toMatch(/push the sign/);
  });
  it('the Ledge: open gets the door line, kick gets the mountain, never the other way round', () => {
    const boots = { worn: ['boots'], inventory: ['boots'] };
    for (const l of tries('peaks.ledge', 'open door', 6, boots).slice(2)) expect(l).toMatch(/^The door does not move\. Still dark:/);
    for (const l of tries('peaks.ledge', 'kick door', 6, boots).slice(2)) expect(l).toMatch(/^You kick the door\. The door is a mountain/);
  });
  it('a multi-line pool cycles, so consecutive tries differ', () => {
    const outs = tries('fortress.bridge', 'push drawbridge', 6).slice(2);
    expect(new Set(outs).size).toBe(4);
    expect(outs[0]).not.toBe(outs[1]);
  });
  it("a gate retry is not a state change, but the gate's own ladder is the repeat answer: the chirp returns only when the gate repeats itself (Task F4b)", () => {
    const [a, b, c, d] = [1, 2, 3, 4].map((k) => { let s = at('peaks.shrine'); let r = step(s, 'push dragon', WORLD); for (let i = 1; i < k; i++) { s = r.state; r = step(s, 'push dragon', WORLD); } return r; });
    expect(a!.output).toHaveLength(1);
    // The second try adds the plainer hint and the third is the displaced flavor line: each a new answer, so no chirp under it.
    expect(b!.output).toHaveLength(1);
    expect(b!.output[0]).not.toBe(a!.output[0]);
    expect(c!.output).toHaveLength(1);
    expect(c!.output[0]).not.toBe(b!.output[0]);
    // `push dragon` has one flavor line, so the fourth try says the third's words again: the try counter alone moved
    // (quirks.ts TRY_COUNTER), and that is not a state change, so the ladder is back.
    expect(d!.output[0]).toBe(c!.output[0]);
    expect(d!.output).toHaveLength(3);
    expect(d!.output[1]).toMatch(/4/);
    expect(d!.state.flags['gate.dragon']).toBe(4);
  });
  it("the Monastery Gate's second try names the real solve", () => {
    const outs = tries('monastery.gate', 'push gate', 3);
    expect(outs[0]).toBe('Shut. The session is starting. Open the gate, or wait for it; either one gets you in.');
    expect(outs[1]).toBe('Shut. The session is starting. Open the gate, or wait for it; either one gets you in. `open gate`. Or `wait`. The bar moves for both, and for nothing else.');
    for (const l of outs) expect(l).not.toMatch(/gold layer|back gate/);
  });
  it('ring bell', () => {
    const outs = tries('monastery.gate', 'ring bell', 3);
    expect(outs[0]).toMatch(/^Shut\. The session is starting\./);
    expect(outs[2]).toMatch(/^You ring the bell\./);
    expect(one('monastery.gate', 'ring the bell').output[0]).toMatch(/^Shut\./);
  });
  it("the Studio's shape knows the stare is won after the Duke's spinner blanks the Card", () => {
    expect(one('fortress.yard', 'push card', { flags: { 'stare.count': 3 } }).output[0]).toMatch(/^The Card is stared at\./);
    expect(one('fortress.yard', 'push card', { flags: { 'stare.count': 3, 'gate.studio': 1 } }).output[0]).not.toMatch(/Look at the Card/);
  });
  it("the Ledge's sigil line does not list the sigils twice, and the hint says where, not 'Missing:'", () => {
    const l = one('peaks.ledge', 'open door', { flags: { 'gate.ledge': 2, 'trial.moat': true }, worn: ['boots'], inventory: ['boots'] }).output[0]!;
    expect(l).toMatch(/Still dark/);
    expect(l).not.toMatch(/Still to get|Missing:/);
    expect(one('peaks.ledge', 'push door', { flags: { 'gate.ledge': 1, 'trial.moat': true }, worn: ['boots'], inventory: ['boots'] }).output[0]).toMatch(/Still to get: the hoodie, from the Abbot behind the Keep; the key, from the Isle across the OneLake\.$/);
  });
  it('the Spark chamber names the Librarian', () => {
    expect(one('monastery.spark', 'push notebook', { flags: { 'gate.notebook': 1 } }).output[0]).toMatch(/Give it to the Librarian\.$/);
  });
  it('the retired ids are gone; the solved-state rules have their own', () => {
    const ids = new Set(Object.values(WORLD.rooms).flatMap((r) => r.rules.map((x) => x.id)));
    for (const old of ['fortress.open-bridge', 'fortress.open-window', 'monastery.open-case', 'lake.use-lamp', 'peaks.open-locked']) expect(ids.has(old), old).toBe(false);
    for (const now of ['fortress.open-bridge-down', 'fortress.open-window-moat', 'monastery.open-gate-open', 'monastery.open-case-lent', 'lake.use-lamp-online', 'peaks.open-open']) expect(ids.has(now), now).toBe(true);
  });
});

describe('fix round 1: a gate never shadows a scored rule', () => {
  it("the Monastery Gate's open and use are the room's scoring rules: 10 on the first, 0 after", () => {
    const cmds = ['open gate', 'use gate', 'use session', 'use progress bar'];
    for (const cmd of cmds) expect(one('monastery.gate', cmd).pointsAwarded, cmd).toBe(10);
    let s = at('monastery.gate');
    cmds.forEach((cmd, i) => {
      const r = step(s, cmd, WORLD);
      expect(r.pointsAwarded, cmd).toBe(i === 0 ? 10 : 0);
      s = r.state;
    });
    expect(s.flags['gate.open']).toBe(true);
    expect(s.score).toBe(10);
  });
  it('unlock chest still hands over the credentials (+10)', () => {
    for (const cmd of ['unlock chest', 'open chest', 'unlock credentials chest', 'use chest', 'get credentials', 'talk to miller']) {
      const r = one('village.mill', cmd);
      expect(r.pointsAwarded, cmd).toBe(cmd === 'use chest' ? 0 : 10);
      expect(r.output[0], cmd).not.toMatch(/Nothing here is locked/);
    }
    expect(one('peaks.shrine', 'use model').output[0]).not.toMatch(/He asked you a question/);
  });
  it('the golden path scores the ledger, line by line', () => {
    const LEDGER: [string, number][] = [
      ['village.prophecy', 5], ['village.credentials', 10], ['fortress.sku-use', 10], ['fortress.moat-table', 25], ['fortress.stare', 10], ['fortress.copy', 15],
      ['monastery.open-gate', 10], ['monastery.card', 10], ['monastery.read-scroll', 5], ['monastery.fix', 20], ['monastery.hoodie', 15],
      ['lake.ferry', 15], ['lake.key', 20], ['swamp.shortcut', 10], ['peaks.shrine-door-go', 5], ['peaks.dragon', 10], ['peaks.model', 5],
    ];
    let s = newGame(WORLD, 42);
    let total = 0;
    let next = 0;
    for (const cmd of GOLDEN_PATH) {
      const r = step(s, cmd, WORLD);
      if (r.pointsAwarded > 0) {
        const [id, pts] = LEDGER[next++]!;
        expect([r.stepId, r.pointsAwarded], cmd).toEqual([id, pts]);
        total += pts;
      }
      expect(r.state.score, `${cmd}: running total`).toBe(total);
      s = r.state;
    }
    expect(next).toBe(LEDGER.length);
    expect(s.score).toBe(200);
  });
  /** The verb words the parser maps to each verb (parser.ts); `rest` is left out: egg.sit has always taken it. */
  const SYN: Partial<Record<Verb, string[]>> = {
    talk: ['talk to', 'speak to', 'ask', 'chat'], say: ['say', 'shout', 'answer', 'yell', 'tell', 'whisper'], get: ['get', 'take', 'grab', 'pick up', 'steal'],
    open: ['open', 'unlock'], give: ['give', 'offer', 'hand', 'show'], use: ['use', 'apply', 'put', 'plug', 'insert'], look: ['look at', 'look', 'examine', 'x', 'inspect'],
    wait: ['wait', 'z'], read: ['read'],
  };
  const satisfy = (rule: Rule, room: string): GameState => {
    const flags: Record<string, boolean | number> = {};
    for (const c of rule.when.flags ?? []) if (!c.not) flags[c.flag] = c.is ?? true;
    const worn = rule.when.worn ?? [];
    return { ...at(room), inventory: ['license', ...(rule.when.has ?? []), ...worn], worn, flags: { ...flags } };
  };
  const commands = (rule: Rule): string[] => {
    const w = rule.when;
    if (w.verb === 'go') return w.dir === 'n' ? ['n', 'north', 'go north', 'walk north'] : [w.dir!];
    const nouns = w.noun === undefined ? [''] : Array.isArray(w.noun) ? w.noun : [w.noun];
    const noun2s = w.noun2 === undefined ? [] : Array.isArray(w.noun2) ? w.noun2 : [w.noun2];
    const prep = w.verb === 'give' ? 'to' : 'on';
    const out: string[] = [];
    for (const v of SYN[w.verb] ?? [w.verb]) for (const n of nouns) {
      if (!noun2s.length) out.push(`${v} ${n}`.trim());
      else for (const n2 of noun2s) out.push(`${v} ${n} ${prep} ${n2}`);
    }
    return out;
  };
  const scored: [string, Rule][] = [
    ...Object.values(WORLD.rooms).flatMap((room) => room.rules.filter((r) => r.then.points).map((r): [string, Rule] => [room.id, r])),
    ...WORLD.globalRules.filter((r) => r.then.points).flatMap((r) => Object.values(WORLD.rooms).filter((room) => WORLD.phraseRules.some((p) => p.room === room.id)).map((room): [string, Rule] => [room.id, r])),
  ];
  it.each(scored.map(([room, r]) => [r.id, room, r] as const))('%s scores in %s for every synonym and noun', (_id, room, rule) => {
    for (const cmd of commands(rule)) {
      const r = step(satisfy(rule, room), cmd, WORLD);
      expect(r.pointsAwarded, `${room} > ${cmd} → [${r.stepId}] ${r.output[0]}`).toBe(rule.then.points);
    }
  });
});

describe('the audit: NPC-gated milestones answer the obvious verbs too', () => {
  it('the guard is part of the Desktop Gate', () => {
    for (const v of VERBS) expect(one('fortress.bridge', `${v} guard`).output[0], v).toMatch(/The bridge answers to the guard/);
  });
  it('the monk and Brother Pandas answer with their rooms\' puzzles', () => {
    for (const v of VERBS) {
      if (!roomVerb('monastery.gate', v)) expect(one('monastery.gate', `${v} monk`).output[0], v).toMatch(/It's starting\. Open the gate, or wait\./);
      expect(one('monastery.spark', `${v} pandas`).output[0], v).toMatch(/The cell wants Spark, not pandas/);
    }
  });
  it('the Abbot names the notebook, then the kneel', () => {
    for (const v of VERBS) expect(one('monastery.cloister', `${v} abbot`).output[0], v).toMatch(/The Abbot has one hoodie and one price: a notebook that runs\. Brother Pandas' cell, east, does not\./);
    expect(one('monastery.cloister', 'push abbot', { flags: { 'notebook.fixed': true } }).output[0]).toMatch(/He has your hoodie\. Talk to him\. The kneeling is included\./);
    expect(one('monastery.cloister', 'push abbot', { flags: { 'notebook.fixed': true, 'has.hoodie': true } }).output[0]).not.toMatch(/hoodie/i);
  });
  it('the Mill: the chest is not a lock, and the hands-on verbs say so — open/unlock chest still hand over the credentials, use chest stays the room\'s (F4)', () => {
    for (const v of VERBS.filter((x) => !['open', 'unlock', 'use'].includes(x))) {
      expect(one('village.mill', `${v} chest`).output[0], v).toMatch(/Nothing here is locked\. Open the chest, or ask the Miller; he stopped guarding it in 2019\./);
      expect(one('village.mill', `${v} miller`).output[0], v).toMatch(/Nothing here is locked/);
    }
    const r = one('village.mill', 'open chest');
    expect(r.pointsAwarded).toBe(10);
    expect(r.state.inventory).toContain('credentials');
    expect(one('village.mill', 'push chest', { flags: { 'has.credentials': true } }).output[0]).not.toMatch(/Nothing here is locked/);
  });
  it('use card in the Studio says what the Card wants', () => {
    expect(one('fortress.yard', 'use card').output[0]).toMatch(/The Card takes no input\. It wants staring at\. Look at it\./);
    expect(one('fortress.yard', 'use card', { flags: { 'stare.done': true, 'stare.count': 3 } }).output[0]).toMatch(/4\.2M/);
  });
  it('the scored paths through the gates are untouched', () => {
    expect(one('fortress.bridge', 'say trial').pointsAwarded).toBe(10);
    expect(one('monastery.spark', 'use scroll on notebook', { inventory: ['scroll'] }).pointsAwarded).toBe(20);
    expect(one('monastery.library', 'give license to librarian', { inventory: ['license'] }).pointsAwarded).toBe(10);
    expect(one('lake.dock', 'give credentials to ferryman', { inventory: ['credentials'] }).pointsAwarded).toBe(15);
    expect(one('lake.dock', 'enter boat', { flags: { 'ferry.online': true } }).state.room).toBe('lake.island');
    expect(one('peaks.shrine', 'say star schema').pointsAwarded).toBe(10);
    expect(one('monastery.gate', 'knock').output[0]).toMatch(/Session starting/i);
  });
});
