import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { SIGNOFF } from '../src/world/voice';
import { ADE_DEATH, DEATH_PHRASES } from '../src/world/deaths';
import { CUES } from '../src/game/sfx';
import type { GameState } from '../src/engine/types';

const at = (room: string, extra: Partial<GameState> = {}): GameState => ({ ...newGame(WORLD, 7), room, ...extra });
const one = (room: string, cmd: string, extra: Partial<GameState> = {}) => step(at(room, extra), cmd, WORLD);
const run = (room: string, cmds: string[], extra: Partial<GameState> = {}) => { let s = at(room, extra); let last = step(s, 'look', WORLD); for (const c of cmds) { last = step(s, c, WORLD); s = last.state; } return { s, last }; };

describe('blame beats on the nine (spec1 §5.4)', () => {
  it.each([
    ['village.cottage', 'die', /Your mom told you this game had a dragon in it and you did this instead\./],
    ['village.cottage', 'attack me', /It works, which is a first for one of your plans\./],
    ['village.cottage', 'delete workspace', /You delete the workspace\. You were in it\./],
    ['village.cottage', 'format c:', /had a backup\. You did not\./],
    ['village.square', 'give paginated report to jeff', /He was not built for this, and neither were you\./],
    ['lake.shore', 'import onelake', /Nice one, Import Mode Ishmael\./],
    ['fortress.bridge', 'swim moat', /Report Builders can't swim; it's in the license\./],
    ['swamp.bronze', 'drink water', /Your mom told you never to drink from the Bronze layer\. And NOW look\./],
    ['peaks.shrine', 'attack dragon', /You knew you were supposed to TALK to him, right\?/],
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
    ['fortress.model', ['enable bidirectional on all relationships'], 'death.both', /ambiguous path/],
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
  it('the energy drink kills you anywhere you carry it', () => {
    const { s } = run('village.square', ['drink the ade'], { inventory: ['license', 'capacityade'] });
    expect(s.dead).toBe(true);
  });
  it('the energy drink is a thing on the Pass: gettable, readable, and the label warns you', () => {
    const booted = { inventory: ['license', 'boots'], worn: ['boots'] }; // no interactive delay in the way
    const got = one('peaks.pass', 'get capacityade', booted);
    expect(got.state.inventory).toContain('capacityade');
    expect(one('peaks.pass', 'look at bottle', booted).output[0]).toMatch(/Now with 64 CUs/);
    expect(one('peaks.pass', 'drink sports drink', booted).output.join(' ')).toContain(ADE_DEATH);
    expect(one('peaks.pass', 'look', booted).output.join(' ')).toMatch(/You see: .*energy drink/);
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
    expect(tenth.state.dead).toBe(true); expect(tenth.deathCause).toBe('death.word'); expect(tenth.output.join(' ')).toMatch(/a Word document now, and you are in it\./);
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

describe('no curses (Tommy, Sep 23: the biggest source of "this doesn\'t make sense")', () => {
  const rules = [...WORLD.globalRules, ...Object.values(WORLD.rooms).flatMap((r) => r.rules)];
  it('no rule sets or reads a curse flag, the Duke\'s count or the Card\'s stares, and nothing plays a curse cue', () => {
    const GONE = /^(curse\.|duke\.wrong$|card\.stares$)/;
    for (const r of rules) {
      expect(Object.keys(r.then.set ?? {}).filter((k) => GONE.test(k)), r.id).toEqual([]);
      expect((r.when.flags ?? []).map((c) => c.flag).filter((k) => GONE.test(k)), r.id).toEqual([]);
    }
    expect(rules.filter((r) => r.then.sfx === 'curse').map((r) => r.id)).toEqual([]);
    expect(Object.keys(CUES)).not.toContain('curse');
  });
  it('the Duke: each wrong answer keeps its own line, nothing is counted, and many of them change nothing', () => {
    const { s, last } = run('fortress.throne', ['say sumx', 'say divide', 'say filter', 'say evaluate', 'say table', 'say measure', 'say sumx']);
    expect(last.output[0]).toBe("'SUMX,' the Duke corrects, 'iterates. SUM aggregates. You, peasant, do neither.'");
    expect(Object.keys(s.flags).filter((k) => /^(duke\.wrong|curse\.)/.test(k))).toEqual([]);
    expect(s.room).toBe('fortress.throne'); expect(s.dead).toBe(false);
    expect(step(s, 'say calculated column', WORLD).pointsAwarded).toBe(25); // the moat is still the way out
    const table = one('fortress.throne', 'say table');
    expect(table.stepId).toBe('fortress.dax-wrong'); expect(table.output[0]).toBe("'That is not DAX,' says the Duke. 'That is a word that has met DAX.'");
    expect(one('fortress.throne', 'say hello').output[0]).not.toMatch(/Duke/); // not DAX: not his business
  });
  it('any CALCULATE expression is correct DAX, with the plain nod, however many wrong answers came first', () => {
    const wrongs = run('fortress.throne', ['say sumx', 'say divide']).s;
    for (const c of ['say calculate(sum(sales))', 'say calculate(sum(sales), filter(all(date)))', 'say calculate sum sales']) {
      const r = step(wrongs, c, WORLD);
      expect(r.stepId, c).toBe('fortress.dax-good'); expect(r.output[0], c).toBe("The Duke nods. 'Correct.' A spinner appears. The spinner is still there. You could wait.");
    }
    expect(step(at('fortress.throne'), 'say calculate', WORLD).stepId).toBe('fortress.dax-calculate'); // alone, still the one true function
    const after = run('fortress.throne', ['say sumx', 'say divide', 'say filter', 'say evaluate'], { flags: { 'trial.moat': true } });
    expect(after.last.output.join(' ')).not.toMatch(/finger|column/);
  });
  it('leaving the chamber is just leaving', () => {
    const r = run('fortress.throne', ['say sumx', 'say divide', 's'], { flags: { 'bridge.down': true } });
    expect(r.s.room).toBe('fortress.hall'); expect(r.last.stepId).toBe('fortress.hall');
  });
  it('the Card: staring as long as you like changes nothing, and leaving the Studio is just leaving', () => {
    const { s, last } = run('fortress.yard', Array(9).fill('look at card'), { flags: { 'stare.done': true } });
    expect(last.output[0]).toBe('4.2M. Then 4.7M. Then 4.2M. It depends on whether Jeff is in the room.');
    expect(Object.keys(s.flags).filter((k) => /^(card\.stares|curse\.)/.test(k))).toEqual([]);
    const left = step(s, 'w', WORLD);
    expect(left.state.room).toBe('fortress.hall'); expect(left.output[0]).not.toMatch(/counting/);
    expect(one('fortress.yard', 'hint', { flags: { 'stare.done': true } }).output[0]).not.toMatch(/\(Blank\)\. Two words|You are \(Blank\)/);
  });
  it('Jeff: the talk ladder keeps cycling, and you stay you', () => {
    const { s, last } = run('village.square', Array(9).fill('talk to jeff'));
    expect(s.flags['talk.jeff']).toBe(9); expect(last.sfx).not.toBe('curse');
    expect(last.output[0]).toMatch(/^"/); // still Jeff talking
    expect(Object.keys(s.flags).filter((k) => k.startsWith('curse.'))).toEqual([]);
    expect(step({ ...s, inventory: ['license', 'mug'] }, 'give mug to jeff', WORLD).output[0]).toMatch(/^Jeff takes the mug\./);
  });
  it('NPCs always see you: the Miller hands over the credentials, the Abbot the hoodie, Throttlor hears the answer', () => {
    expect(one('village.mill', 'talk to miller').state.inventory).toContain('credentials');
    expect(one('monastery.cloister', 'talk to abbot', { flags: { 'notebook.fixed': true, 'gate.open': true } }).state.inventory).toContain('hoodie');
    const shrine = one('peaks.shrine', 'say star schema', { flags: { 'trial.hoodie': true, 'trial.moat': true, 'trial.key': true, 'shrine.open': true } });
    expect(shrine.state.flags['dragon.gone']).toBe(true);
  });
  it('the policy is a gag item, not a cure: on yourself it does nothing special', () => {
    for (const room of ['fortress.model', 'fortress.yard', 'village.square']) {
      const r = one(room, 'use policy on self', { inventory: ['license', 'policy'] });
      expect(r.output[0], room).not.toMatch(/a measure again/); expect(r.state.inventory, room).toContain('policy');
    }
    expect(one('fortress.model', 'use policy', { inventory: ['license', 'policy'] }).output[0]).toMatch(/Not here/);
  });
});

describe('fix round 1: the rulings that stay', () => {
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
  it('I-4: the mug works in the Fields too', () => {
    const { s } = run('village.fields', Array(8).fill('talk to jeff'), { inventory: ['license', 'mug'] });
    const mug = step(s, 'give mug to jeff', WORLD);
    expect(mug.state.flags['jeff.pacified']).toBe(true); expect(mug.state.inventory).not.toContain('mug');
    expect(mug.output[0]).toMatch(/^Jeff takes the mug\. 'World's Okayest Analyst\.'/);
    expect(step(mug.state, 'look', WORLD).output.join(' ')).not.toMatch(/Here: Jeff/); // he has gone to the well
  });
  it('I-5: every new death blames you', () => {
    const blames: [string, string, Partial<GameState>, RegExp][] = [
      ['village.fields', 'refresh', {}, /and you clicked anyway\./],
      ['fortress.model', 'set both on everything', {}, /thought it sounded thorough\./],
      ['fortress.yard', 'open other page', {}, /you read it as a dare\./],
      ['village.cottage', 'merge the final files', {}, /you thought the fix was a third\./],
      ['fortress.hall', 'type dax', {}, /you looked right at them\./],
      ['peaks.pass', 'drink capacityade', {}, /you were standing on one\./],
      ['fortress.model', 'add column', { flags: { 'model.calc': 9 } }, /you wanted a round number\./],
    ];
    for (const [room, cmd, extra, re] of blames) {
      const r = one(room, cmd, extra);
      expect(r.state.dead, cmd).toBe(true); expect(r.output.join(' '), cmd).toMatch(re);
      expect(r.output.at(-1)!.endsWith(SIGNOFF)).toBe(true);
    }
  });
  it('minors: the swamps, the tab verbs, the mirror', () => {
    for (const room of ['swamp.bronze', 'swamp.silver', 'swamp.gold']) {
      expect(one(room, 'drink capacityade', { inventory: ['license', 'capacityade'] }).deathCause, room).toBe('death.capacityade');
      const none = one(room, 'drink capacityade');
      expect(none.state.dead, room).toBe(false); expect(none.output[0], room).toMatch(/no energy drink in the marsh/);
    }
    for (const c of ['click page 2', 'go to page 2', 'click on tab', 'select page 2', 'switch to page 2', 'view page 2']) expect(one('fortress.yard', c).deathCause, c).toBe('death.400');
    expect(one('village.square', 'look at me').output[0]).toMatch(/^You look at yourself\. A Report Builder from the Village of Pro\. No hoodie\./);
  });
});
