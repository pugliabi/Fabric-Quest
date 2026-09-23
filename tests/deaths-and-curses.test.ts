import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { SIGNOFF } from '../src/world/voice';
import { curseOf } from '../src/world/curses';
import { ADE_DEATH, DEATH_PHRASES } from '../src/world/deaths';
import { CUES } from '../src/game/sfx';
import type { GameState } from '../src/engine/types';

const at = (room: string, extra: Partial<GameState> = {}): GameState => ({ ...newGame(WORLD, 7), room, ...extra });
const one = (room: string, cmd: string, extra: Partial<GameState> = {}) => step(at(room, extra), cmd, WORLD);
const run = (room: string, cmds: string[], extra: Partial<GameState> = {}) => { let s = at(room, extra); let last = step(s, 'look', WORLD); for (const c of cmds) { last = step(s, c, WORLD); s = last.state; } return { s, last }; };

describe('blame beats on the nine (spec1 §5.4)', () => {
  it.each([
    ['village.cottage', 'die', /Your mom told you this game had a dragon in it and you did this instead\./],
    ['village.cottage', 'attack me', /the art budget didn't cover a bystander/i],
    ['village.cottage', 'delete workspace', /Somewhere a director's bookmark breaks and a Teams message begins composing itself\./],
    ['village.cottage', 'format c:', /You typed it with feeling, too\./],
    ['village.square', 'give paginated report to jeff', /Dumb, dumb, dumb\./],
    ['lake.shore', 'import onelake', /Nice one, Import Mode Ishmael\./],
    ['fortress.bridge', 'swim moat', /Report Builders can't swim\. Like, it's in the license\./],
    ['swamp.bronze', 'drink water', /Your mom told you never to drink from the Bronze layer\. And NOW look\./],
    ['peaks.shrine', 'attack dragon', /You knew you were supposed to TALK to him, right\? You read the ledger\./],
  ])('%s: %s', (room, cmd, blame) => {
    const r = one(room, cmd);
    expect(r.state.dead).toBe(true);
    expect(r.output.join(' ')).toMatch(blame);
    expect(r.output.at(-1)!.endsWith(SIGNOFF)).toBe(true);
  });
  it('the governance deaths (E4, E5) get their blame beat too', () => {
    const web = one('village.cottage', 'publish to web');
    expect(web.deathCause).toBe('death.publish-web');
    expect(web.output.join(' ')).toMatch(/The dialog listed two options and you picked the one with the word ENTIRE in it\./);
    const internet = one('monastery.sacristy', 'turn on block public internet');
    expect(internet.deathCause).toBe('death.block-internet');
    expect(internet.output.join(' ')).toMatch(/The book said private endpoint first\. You read that part the way you read a license agreement\./);
    const pause = one('monastery.sacristy', 'turn on pause capacity');
    expect(pause.deathCause).toBe('death.pause-capacity');
    expect(pause.output.join(' ')).toMatch(/The book said 'including the app you are reading this in\.' You were reading it in the app\./);
    for (const r of [web, internet, pause]) expect(r.output.at(-1)!.endsWith(SIGNOFF)).toBe(true);
  });
});

describe('the new deaths', () => {
  it.each([
    ['village.fields', ['refresh'], 'death.monday', /9:02 a\.m\. on a Monday/],
    ['fortress.model', ['set both on everything'], 'death.both', /Sales to Sales through Sales/],
    ['fortress.model', ['enable bidirectional on all relationships'], 'death.both', /Ambiguous path/],
    ['fortress.yard', ['open other page'], 'death.400', /only dogs and Throttlor can hear/],
    ['fortress.yard', ['open 400 visuals'], 'death.400', /400/],
    ['village.cottage', ['merge the final files'], 'death.final4', /Sales_v3_FINAL_final4 and you are not in it/],
    ['fortress.hall', ['type dax'], 'death.dax-in-m', /it evaluates/],
    ['fortress.hall', ['write a measure'], 'death.dax-in-m', /M editor/],
    ['peaks.pass', ['drink capacityade'], 'death.capacityade', /64 CUs/],
  ])('%s: %s → %s', (room, cmds, cause, re) => {
    const { s, last } = run(room, cmds);
    expect(s.dead).toBe(true); expect(last.deathCause).toBe(cause); expect(last.output.join(' ')).toMatch(re);
    expect(last.output.at(-1)!.endsWith(SIGNOFF)).toBe(true);
  });
  it('the CapacityAde kills you anywhere you carry it', () => {
    const { s } = run('village.square', ['drink the ade'], { inventory: ['license', 'capacityade'] });
    expect(s.dead).toBe(true);
  });
  it('the CapacityAde is a thing on the Pass: gettable, readable, and the label warns you', () => {
    const booted = { inventory: ['license', 'boots'], worn: ['boots'] }; // no interactive delay in the way
    const got = one('peaks.pass', 'get capacityade', booted);
    expect(got.state.inventory).toContain('capacityade');
    expect(one('peaks.pass', 'look at bottle', booted).output[0]).toMatch(/Now with 64 CUs/);
    expect(one('peaks.pass', 'drink sports drink', booted).output.join(' ')).toContain(ADE_DEATH);
    expect(one('peaks.pass', 'look', booted).output.join(' ')).toMatch(/You see: .*CapacityAde/);
  });
  it('the other page is a thing in the Studio: named in the room, warm, and not for taking', () => {
    expect(one('fortress.yard', 'look').output.join(' ')).toMatch(/a second tab: Page 2 \(do not open\)/);
    expect(one('fortress.yard', 'look at page 2').output[0]).toMatch(/Page 2 \(do not open\)/);
    expect(one('fortress.yard', 'look at tab').output[0]).toMatch(/400 visuals/);
    expect(one('fortress.yard', 'get page two').output[0]).toMatch(/The tab is warm\. You leave it alone\. For now\./);
    expect(one('fortress.yard', 'look at page').output[0]).not.toMatch(/Page 2/); // the canvas keeps its own 'page'
  });
  it('the new deaths are scoped: the same words elsewhere are the old eggs', () => {
    expect(one('village.square', 'refresh').state.dead).toBe(false);
    expect(one('fortress.hall', 'merge queries').state.dead).toBe(false);
    expect(one('fortress.throne', 'write a measure').state.dead).toBe(false);
    expect(one('fortress.hall', 'set both on everything').state.dead).toBe(false);
  });
  it('ten calculated columns: nine warnings, then Word', () => {
    const { s, last } = run('fortress.model', Array(9).fill('add calculated column'));
    expect(s.dead).toBe(false); expect(s.flags['model.calc']).toBe(9);
    expect(step(at('fortress.model'), 'add column', WORLD).output[0]).toMatch(/circular dependency/);
    const tenth = step(s, 'add calculated column', WORLD);
    expect(tenth.state.dead).toBe(true); expect(tenth.deathCause).toBe('death.word'); expect(tenth.output.join(' ')).toMatch(/It opens in Word\. You are in it\./);
    expect(last.output[0]).toMatch(/You can hear Word opening\./);
  });
  it('the nine column lines are nine different lines', () => {
    const outs: string[] = [];
    let s = at('fortress.model');
    for (let i = 0; i < 9; i++) { const r = step(s, 'add column', WORLD); outs.push(r.output[0]!); s = r.state; }
    expect(new Set(outs).size).toBe(9);
  });
});

describe('every death signs off exactly once (spec1 §5.1, the scan)', () => {
  const DEATHS: [string, string, Partial<GameState>][] = [
    ['village.cottage', 'die', {}], ['village.cottage', 'attack me', {}], ['village.cottage', 'delete workspace', {}], ['village.cottage', 'format c:', {}],
    ['village.square', 'give paginated report to jeff', {}], ['lake.shore', 'import onelake', {}], ['fortress.bridge', 'swim moat', {}],
    ['swamp.bronze', 'drink water', {}], ['peaks.shrine', 'attack dragon', {}], ['village.cottage', 'publish to web', {}],
    ['monastery.sacristy', 'turn on block public internet', {}], ['monastery.sacristy', 'turn on pause capacity', {}],
    ['village.fields', 'refresh', {}], ['fortress.model', 'set both on everything', {}], ['fortress.yard', 'open other page', {}],
    ['village.cottage', 'merge the final files', {}], ['fortress.hall', 'type dax', {}], ['peaks.pass', 'drink capacityade', {}],
    ['village.square', 'drink capacityade', { inventory: ['license', 'capacityade'] }], ['fortress.model', 'add column', { flags: { 'model.calc': 9 } }],
  ];
  it.each(DEATHS)('%s: %s', (room, cmd, extra) => {
    const r = one(room, cmd, extra);
    expect(r.state.dead).toBe(true);
    expect(r.outcome).toBe('death');
    expect(r.deathCause).toMatch(/^death\./);
    expect(r.output.at(-1)!.endsWith(SIGNOFF)).toBe(true);
    expect(r.output.join(' ').split(SIGNOFF).length).toBe(2);
  });
  it('every death: rule and death: phrase leaves the sign-off to the engine', () => {
    const rules = [...WORLD.globalRules, ...Object.values(WORLD.rooms).flatMap((r) => r.rules)].filter((r) => r.then.death);
    const phrases = WORLD.phraseRules.filter((p) => p.death);
    expect(rules.length + phrases.length).toBeGreaterThanOrEqual(16);
    for (const r of rules) if (typeof r.then.text === 'string') expect(r.then.text, r.id).not.toContain(SIGNOFF);
    for (const p of phrases) if (typeof p.text === 'string') expect(p.text, p.id).not.toContain(SIGNOFF);
    for (const p of DEATH_PHRASES) expect(WORLD.phraseRules.map((x) => x.id), p.id).toContain(p.id);
  });
  it('the ledger death table (G1) can count them: every new death id is reachable by id', () => {
    const ids = new Set([...WORLD.phraseRules.filter((p) => p.death).map((p) => p.death), ...[...WORLD.globalRules, ...Object.values(WORLD.rooms).flatMap((r) => r.rules)].filter((r) => r.then.death).map((r) => r.then.death)]);
    for (const id of ['death.monday', 'death.both', 'death.400', 'death.final4', 'death.dax-in-m', 'death.capacityade']) expect(ids.has(id), id).toBe(true);
  });
});

describe('the curses (spec1 §5.4)', () => {
  it('column: three wrong answers to the Duke; Throttlor will not talk to a column; the policy or the moat lifts it', () => {
    const { s, last } = run('fortress.throne', ['say sumx', 'say divide', 'say filter', 'say evaluate']);
    expect(curseOf(s)).toBe('column'); expect(last.sfx).toBe('curse'); expect(last.output[0]).toMatch(/CALCULATED COLUMN/);
    const shrine = step({ ...s, room: 'peaks.shrine', flags: { ...s.flags, 'trial.hoodie': true, 'trial.moat': true, 'trial.key': true, 'shrine.open': true } }, 'say star schema', WORLD);
    expect(shrine.state.flags['dragon.gone']).toBeUndefined(); expect(shrine.output[0]).toMatch(/don't negotiate with columns/);
    const policy = step({ ...s, inventory: ['license', 'policy'] }, 'use policy on self', WORLD);
    expect(curseOf(policy.state)).toBeNull(); expect(policy.output[0]).toMatch(/a measure again/);
    const moat = step(s, 'say calculated column', WORLD);
    expect(curseOf(moat.state)).toBeNull(); expect(moat.state.score).toBe(25);
    expect(curseOf(run('fortress.throne', ['say sumx', 'say divide', 'say filter', 'say calculated column']).s)).toBeNull();
  });
  it('column: the counter is capped, the curse fires once, and it never fires after the moat', () => {
    const { s } = run('fortress.throne', ['say sumx', 'say divide', 'say filter', 'say evaluate', 'say sumx', 'say sumx', 'say sumx', 'say sumx']);
    expect(curseOf(s)).toBe('column'); expect(s.flags['duke.wrong']).toBeLessThanOrEqual(3);
    const after = run('fortress.throne', ['say sumx', 'say divide', 'say filter', 'say evaluate'], { flags: { 'trial.moat': true } });
    expect(curseOf(after.s)).toBeNull();
  });
  it('column: the policy works on yourself in the Model View and the Studio too (their own use-policy lines step aside)', () => {
    const cursed = { flags: { 'curse.column': true }, inventory: ['license', 'policy'] };
    for (const room of ['fortress.model', 'fortress.yard', 'fortress.hall', 'village.square']) {
      const r = one(room, 'use policy on myself', cursed);
      expect(curseOf(r.state), room).toBeNull(); expect(r.output[0], room).toMatch(/a measure again/);
    }
    expect(one('fortress.model', 'use policy', cursed).output[0]).toMatch(/Not here/); // the room's own line, when it is not on yourself
    expect(curseOf(one('village.square', 'use policy on self', { inventory: ['license', 'policy'] }).state)).toBeNull(); // not cursed: nothing to undo
  });
  it('blank: staring past six; NPCs look through you; star schema restores you', () => {
    const { s, last } = run('fortress.yard', Array(7).fill('look at card'), { flags: { 'stare.done': true } });
    expect(curseOf(s)).toBe('blank'); expect(last.output[0]).toMatch(/\(Blank\)/);
    expect(step({ ...s, room: 'village.square' }, 'talk to jeff', WORLD).output[0]).toBe('Jeff from Finance looks through you, the way a visual looks through (Blank).');
    const back = step({ ...s, room: 'village.square' }, 'say star schema', WORLD);
    expect(curseOf(back.state)).toBeNull(); expect(back.output[0]).toMatch(/You have a value again/);
    const shrine = step({ ...s, room: 'peaks.shrine' }, 'say star schema', WORLD);
    expect(shrine.state.flags['dragon.gone']).toBe(true); expect(curseOf(shrine.state)).toBeNull();
  });
  it('blank: six looks are fine, the curse takes the seventh, and it carries the cue', () => {
    const six = run('fortress.yard', Array(6).fill('look at card'), { flags: { 'stare.done': true } });
    expect(curseOf(six.s)).toBeNull(); expect(six.s.flags['card.stares']).toBe(6);
    const seventh = step(six.s, 'look at card', WORLD);
    expect(curseOf(seventh.state)).toBe('blank'); expect(seventh.sfx).toBe('curse');
    expect(step(seventh.state, 'talk to card', WORLD).output[0]).toMatch(/looks through you/);
  });
  it('jeff: eight talks with nothing given; the mug undoes it', () => {
    const { s, last } = run('village.square', Array(8).fill('talk to jeff'));
    expect(curseOf(s)).toBe('jeff'); expect(last.output[0]).toMatch(/You are Jeff now\./); expect(last.sfx).toBe('curse');
    const mug = step({ ...s, inventory: ['license', 'mug'] }, 'give mug to jeff', WORLD);
    expect(curseOf(mug.state)).toBeNull(); expect(mug.output[0]).toMatch(/stop being Jeff/);
    expect(curseOf(run('village.square', Array(8).fill('talk to jeff'), { flags: { 'jeff.pacified': true } }).s)).toBeNull();
    expect(curseOf(run('village.square', Array(7).fill('talk to jeff')).s)).toBeNull();
  });
  it('jeff: the talks count across the Square and the Fields (one counter, one Jeff)', () => {
    const fields = run('village.fields', Array(8).fill('talk to jeff'));
    expect(curseOf(fields.s)).toBe('jeff'); expect(fields.last.stepId).toBe('fields.curse-jeff');
    const mixed = run('village.fields', Array(5).fill('talk to jeff'));
    expect(curseOf(run('village.square', Array(3).fill('talk to jeff'), { flags: mixed.s.flags }).s)).toBe('jeff');
  });
  it('blank: the Card visual and the Duke look through you too, with a capital letter', () => {
    const blank = { flags: { 'curse.blank': true, 'stare.done': true } };
    expect(one('fortress.yard', 'talk to card', blank).output[0]).toBe('The Card visual looks through you, the way a visual looks through (Blank).');
    expect(one('fortress.throne', 'talk to duke', blank).output[0]).toBe('The Duke of DAX looks through you, the way a visual looks through (Blank).');
    expect(one('fortress.yard', 'hint', blank).output[0]).toMatch(/You are \(Blank\)/);
  });
  it('the curse cue is a real cue (RuleThen.sfx is a free string)', () => {
    expect(Object.keys(CUES)).toContain('curse');
    const rules = [...WORLD.globalRules, ...Object.values(WORLD.rooms).flatMap((r) => r.rules)];
    const cursing = rules.filter((r) => r.then.sfx === 'curse').map((r) => r.id);
    expect(cursing.sort()).toEqual(['fields.curse-jeff', 'fortress.curse-blank', 'fortress.curse-column', 'village.curse-jeff']);
    for (const r of rules) if (r.then.sfx) expect(Object.keys(CUES), r.id).toContain(r.then.sfx);
  });
  // ---- Fix round 1 ----
  it('I-1: only DAX-ish wrong answers count; hello never; correct DAX is grudging and free; the count is spoken', () => {
    const { s, last } = run('fortress.throne', ['say hello', 'say star schema', 'say trial']);
    expect(s.flags['duke.wrong']).toBeUndefined(); expect(curseOf(s)).toBeNull(); expect(last.output[0]).not.toMatch(/Duke/);
    const one1 = one('fortress.throne', 'say sumx');
    expect(one1.state.flags['duke.wrong']).toBe(1); expect(one1.output[0]).toBe("'SUMX,' the Duke corrects, 'iterates. SUM aggregates. You, peasant, do neither.'"); // the first is its own line
    const two = step(one1.state, 'say table', WORLD); // a modelling word the chamber has no line for: still wrong
    expect(two.stepId).toBe('fortress.dax-wrong'); expect(two.state.flags['duke.wrong']).toBe(2); expect(two.output[0]).toMatch(/Two fingers go up\. 'WRONG\. Two\.'$/);
    const good = step(two.state, 'say calculate(sum(sales), filter(all(date), true))', WORLD);
    expect(good.stepId).toBe('fortress.dax-good'); expect(good.state.flags['duke.wrong']).toBe(2); expect(good.output[0]).toMatch(/^'Correct,' says the Duke\. 'And beside the point\.'/);
    const three = step({ ...good.state, flags: { ...good.state.flags, 'dax.spinner': 0 } }, 'say divide', WORLD);
    expect(three.state.flags['duke.wrong']).toBe(3); expect(three.output[0]).toMatch(/A third finger\. 'One more and you're a column\.'$/);
    expect(curseOf(step(three.state, 'say hello', WORLD).state)).toBeNull(); // not DAX: not the fourth
    expect(curseOf(step(three.state, 'say calculate', WORLD).state)).toBeNull(); // the one true function: not wrong
    expect(curseOf(step(three.state, 'say sumx(sales, sales[amount])', WORLD).state)).toBeNull(); // correct DAX: not wrong
    const cursed = step(three.state, 'say measure', WORLD);
    expect(curseOf(cursed.state)).toBe('column'); expect(cursed.stepId).toBe('fortress.curse-column');
    expect(step(cursed.state, 'say sumx', WORLD).output[0]).not.toMatch(/finger/); // no strike beats on a column
  });
  it('fix round 2: any CALCULATE expression is correct DAX (grudging, no strike); no strikes after the moat', () => {
    const two = run('fortress.throne', ['say sumx', 'say divide']).s;
    expect(two.flags['duke.wrong']).toBe(2);
    for (const c of ['say calculate(sum(sales))', 'say calculate(sum(sales), filter(all(date)))', 'say calculate sum sales']) {
      const r = step(two, c, WORLD);
      expect(r.stepId, c).toBe('fortress.dax-good'); expect(r.state.flags['duke.wrong'], c).toBe(2);
      expect(r.output[0], c).toMatch(/^'Correct,' says the Duke\. 'And beside the point\.'/); expect(r.output[0], c).not.toMatch(/finger/);
    }
    expect(step(at('fortress.throne'), 'say calculate(sum(sales))', WORLD).output[0]).toMatch(/^The Duke nods\. 'Correct\.'/); // no strikes yet: the plain nod
    expect(step(at('fortress.throne'), 'say calculate', WORLD).stepId).toBe('fortress.dax-calculate'); // alone, still the one true function
    const after = run('fortress.throne', ['say sumx', 'say divide', 'say filter', 'say evaluate'], { flags: { 'trial.moat': true } });
    expect(after.last.output.join(' ')).not.toMatch(/finger|column/); expect(curseOf(after.s)).toBeNull();
  });
  it('I-1: the count resets when you leave the chamber, and after every undo', () => {
    const { s } = run('fortress.throne', ['say sumx', 'say divide', 'say filter', 's'], { flags: { 'bridge.down': true } });
    expect(s.room).toBe('fortress.hall'); expect(s.flags['duke.wrong']).toBe(0);
    expect(curseOf(step(step(s, 'n', WORLD).state, 'say evaluate', WORLD).state)).toBeNull();
    const cursed = run('fortress.throne', ['say sumx', 'say divide', 'say filter', 'say evaluate']).s;
    const undone = step({ ...cursed, inventory: ['license', 'policy'] }, 'use policy on self', WORLD).state;
    expect(undone.flags['duke.wrong']).toBe(0);
    expect(curseOf(step(undone, 'say sumx', WORLD).state)).toBeNull();
    expect(step(cursed, 'say calculated column', WORLD).state.flags['duke.wrong']).toBe(0);
  });
  it.each([
    'set all relationships to both', 'enable bidirectional', 'enable bidirectional filtering', 'make all relationships bidirectional',
    'set cross filter direction to both', 'both on everything', 'set every relationship to both', 'make everything bidirectional',
    'set relationships to both', 'turn on bidirectional for everything', 'set both on everything', 'enable bidirectional on all relationships',
  ])('I-2: %s is the Both death', (c) => {
    const r = one('fortress.model', c);
    expect(r.deathCause).toBe('death.both'); expect(r.output.join(' ')).toMatch(/sounded thorough/);
  });
  it.each(['set to both', 'both', 'say both', 'many to many', 'bidirectional'])('I-2: %s is still one relationship, not the death', (c) => {
    expect(one('fortress.model', c).state.dead).toBe(false);
  });
  it('I-3: the Fields tell you the time and the day, and only a full refresh kills', () => {
    const look = one('village.fields', 'look').output.join(' ');
    expect(look).toMatch(/The sundial says 9:02\. The scarecrow says Monday\./);
    expect(one('village.fields', 'look at sundial').output[0]).toMatch(/9:02.*full refresh/);
    expect(one('village.fields', 'look at manual').output[0]).toMatch(/MONDAY/);
    for (const c of ['refresh', 'refresh all', 'refresh everything', 'refresh now', 'run refresh', 'full refresh']) expect(one('village.fields', c).deathCause, c).toBe('death.monday');
    expect(one('village.fields', 'refresh manual').output[0]).toMatch(/You trigger Manual by hand/);
    expect(one('village.fields', 'refresh scarecrow').state.dead).toBe(false);
    const sched = one('village.fields', 'schedule refresh');
    expect(sched.state.dead).toBe(false); expect(sched.output[0]).toMatch(/2 AM/);
    expect(one('village.fields', 'refresh at night').state.dead).toBe(false);
  });
  it('I-4: the mug undoes the Jeff curse in the Fields too', () => {
    const { s } = run('village.fields', Array(8).fill('talk to jeff'), { inventory: ['license', 'mug'] });
    expect(curseOf(s)).toBe('jeff');
    const mug = step(s, 'give mug to jeff', WORLD);
    expect(curseOf(mug.state)).toBeNull(); expect(mug.state.flags['jeff.pacified']).toBe(true); expect(mug.state.inventory).not.toContain('mug');
    expect(mug.output[0]).toMatch(/He takes it from himself\. You snap out of it\./);
    expect(step(mug.state, 'look', WORLD).output.join(' ')).not.toMatch(/Here: Jeff/); // he has gone to the well
  });
  it('I-5: every new death blames you', () => {
    const blames: [string, string, Partial<GameState>, RegExp][] = [
      ['village.fields', 'refresh', {}, /and you clicked anyway\./],
      ['fortress.model', 'set both on everything', {}, /thought it sounded thorough\./],
      ['fortress.yard', 'open other page', {}, /You read it as a dare\./],
      ['village.cottage', 'merge the final files', {}, /you thought the fix was a third\./],
      ['fortress.hall', 'type dax', {}, /you looked right at them\./],
      ['peaks.pass', 'drink capacityade', {}, /That is what the dragon is FOR\./],
      ['fortress.model', 'add column', { flags: { 'model.calc': 9 } }, /you wanted a round number\./],
    ];
    for (const [room, cmd, extra, re] of blames) {
      const r = one(room, cmd, extra);
      expect(r.state.dead, cmd).toBe(true); expect(r.output.join(' '), cmd).toMatch(re);
      expect(r.output.at(-1)!.endsWith(SIGNOFF)).toBe(true);
    }
  });
  it('minors: the swamps, the tab verbs, (Blank) and the Miller and the Abbot, the stare resets, the mirror', () => {
    for (const room of ['swamp.bronze', 'swamp.silver', 'swamp.gold']) {
      expect(one(room, 'drink capacityade', { inventory: ['license', 'capacityade'] }).deathCause, room).toBe('death.capacityade');
      const none = one(room, 'drink capacityade');
      expect(none.state.dead, room).toBe(false); expect(none.output[0], room).toMatch(/no CapacityAde in the marsh/);
    }
    for (const c of ['click page 2', 'go to page 2', 'click on tab', 'select page 2', 'switch to page 2', 'view page 2']) expect(one('fortress.yard', c).deathCause, c).toBe('death.400');
    const miller = one('village.mill', 'talk to miller', { flags: { 'curse.blank': true } });
    expect(miller.state.inventory).not.toContain('credentials'); expect(miller.output[0]).toMatch(/looks straight through you/);
    const abbot = one('monastery.cloister', 'talk to abbot', { flags: { 'curse.blank': true, 'notebook.fixed': true, 'gate.open': true } });
    expect(abbot.state.inventory).not.toContain('hoodie'); expect(abbot.state.flags['gov.errand']).toBeUndefined(); expect(abbot.output[0]).toMatch(/looks straight through you/);
    const left = run('fortress.yard', ['look at card', 'look at card', 'look at card', 'w'], { flags: { 'stare.done': true } }).s;
    expect(left.room).toBe('fortress.hall'); expect(left.flags['card.stares']).toBe(0);
    expect(one('village.square', 'look at me', { flags: { 'curse.column': true } }).output[0]).toMatch(/calculated column/);
    expect(one('village.square', 'look at me', { flags: { 'curse.blank': true } }).output[0]).toMatch(/\(Blank\)/);
    expect(one('village.square', 'look at me', { flags: { 'curse.jeff': true } }).output[0]).toMatch(/Jeff looks back/);
    expect(one('village.square', 'look at me').output[0]).not.toMatch(/Jeff looks back|\(Blank\)|calculated column/);
  });
  it('only one curse at a time is reported, and curseOf reads flags only', () => {
    expect(curseOf(at('village.square'))).toBeNull();
    expect(curseOf(at('village.square', { flags: { 'curse.jeff': true } }))).toBe('jeff');
    expect(curseOf(at('village.square', { flags: { 'curse.blank': true, 'curse.jeff': true } }))).toBe('blank');
    expect(curseOf(at('village.square', { flags: { 'curse.column': false, 'curse.jeff': true } }))).toBe('jeff');
  });
});
