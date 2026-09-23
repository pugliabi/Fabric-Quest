import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { FIFTEEN, SETTINGS, findBooks } from '../src/world/sacristy';
import type { GameState } from '../src/engine/types';

const at = (flags: Record<string, boolean | number> = {}): GameState => ({ ...newGame(WORLD, 2), room: 'monastery.sacristy', flags });
const one = (cmd: string, flags = {}) => step(at(flags), cmd, WORLD);

describe('the Sacristy (spec2 §3)', () => {
  it('is up from the Cloister, and down again', () => {
    expect(step({ ...newGame(WORLD, 2), room: 'monastery.cloister' }, 'u', WORLD).state.room).toBe('monastery.sacristy');
    expect(one('d').state.room).toBe('monastery.cloister');
    expect(WORLD.rooms['monastery.sacristy']!.enterQuip!(at())).toBe('A sign says FABRIC ADMINISTRATORS ONLY. Under it, smaller: everyone here is an admin. It was easier.');
    expect(one('look').output[0]).toContain('Everything is at its default. Bless.');
    expect(one('look', { 'ts.export': false }).output[0]).toContain('Changed from default: 1');
  });
  it('the catalog is complete', () => {
    expect(SETTINGS).toHaveLength(16);
    for (const b of SETTINGS) for (const f of ['title', 'read', 'on', 'off', 'effect'] as const) expect(b[f], `${b.key}.${f}`).toBeTruthy();
    expect(SETTINGS.filter((b) => b.shelf === 'tenant')).toHaveLength(11);
    expect(SETTINGS.filter((b) => b.shelf === 'capacity')).toHaveLength(5);
  });
  it.each(['settings', 'tenant settings', 'list settings', 'look at shelf'])('%s lists every tenant book with its state', (c) => {
    const out = one(c, { 'ts.export': false }).output[0]!;
    expect(out).toContain('[OFF] Export to Excel *'); // the real setting name (Learn: Export and sharing settings), not the spec's paraphrase
    expect(out).toContain('[ON ] Users can use Copilot and other features powered by Azure OpenAI');
    expect(out).toContain('[OFF] Guest users can access Microsoft Fabric');
    expect(out).not.toContain('Pause capacity');
  });
  it.each(['capacity settings', 'look at ledger', 'read ledger'])('%s lists the ledger', (c) => {
    const out = one(c).output[0]!;
    expect(out).toContain('[OFF] Pause capacity');
    expect(out).toContain('[ON ] XMLA endpoint: Read Write');
  });
  it('read / look at a book gives the description, the state and the effect here', () => {
    for (const b of SETTINGS) {
      const out = one(`look at ${b.words[0]}`).output[0]!;
      expect(out, b.key).toContain(b.read);
      expect(out, b.key).toMatch(/It is (ON|OFF)/);
      expect(out, b.key).toContain(b.effect);
    }
    expect(one('read export').output[0]).toContain('Here, that means:');
  });
  it('every book reads by the full title the shelf prints (fix round 1, I1)', () => {
    for (const b of SETTINGS) {
      for (const c of [`read ${b.title}`, `look at ${b.title}`, `x ${b.title.toLowerCase()}`]) {
        const r = one(c);
        expect(r.output[0], c).toContain(b.read);
        expect(r.output[0], c).toMatch(/It is (ON|OFF)/);
        expect(r.stepId, c).toBe('sacristy.read');
      }
    }
    // The four that used to go wrong: the Excel egg, the parser's "in"/"on" split, the suffix match on the delegated title.
    expect(one('read export to excel').output[0]).toContain("Jeff's Excel opens while it's on");
    expect(one('look at delegated tenant settings').output[0]).toContain('override the tenant');
    expect(one('read per-user data in usage metrics for content creators').output[0]).toContain('used for grudges');
    // Scenery keeps its own lines: the read phrase declines when no book is named.
    expect(one('look at sign').output[0]).toMatch(/^FABRIC ADMINISTRATORS ONLY/);
    expect(one('read lectern').output[0]).toMatch(/^A stone lectern/);
    expect(one('look at users').output[0]).toMatch(/^Which book\? /);
  });
  it('a shared title word is an ambiguity, not a missing book (fix round 1, M1)', () => {
    expect(one('turn off users').output[0]).toMatch(/^Which book\? .*Users can use Copilot.*Users can create Fabric items/);
    expect(one('turn off fabric').output[0]).toMatch(/^Which book\? /);
    expect(findBooks('users').length).toBeGreaterThan(1);
    expect(findBooks('the').length).toBe(0);
  });
  it('the killing books flip only when named: no accidental internet death (fix round 1, M2)', () => {
    for (const c of ['enable internet', 'enable public internet access', 'turn on internet', 'turn on public internet', 'toggle internet', 'switch on internet access']) {
      const r = one(c);
      expect(r.state.dead, c).toBe(false);
      expect(r.output[0], c).toBe('Which book? Block Public Internet Access is the only one about the internet, and it does the opposite of what you said. Say BLOCK if you mean it.');
      expect(r.state.flags['ts.blockInternet'], c).toBeUndefined();
    }
    const cap = one('turn on capacity');
    expect(cap.state.dead).toBe(false); expect(cap.output[0]).toMatch(/^Which book\? Pause capacity is the only one about the capacity/);
    expect(one('read internet').output[0]).toContain('Blocks inbound public internet access'); // reading it is safe
    for (const c of ['turn on block public internet', 'turn on block internet', 'enable block public internet access', 'flip block', 'pause capacity', 'turn on pause', 'toggle pause capacity']) expect(one(c).state.dead, c).toBe(true);
  });
  it('the stair answers in both rooms (fix round 1, M3)', () => {
    const cloister = (): GameState => ({ ...newGame(WORLD, 2), room: 'monastery.cloister' });
    expect(step(cloister(), 'look at stair', WORLD).output[0]).toContain('up to the Sacristy');
    for (const c of ['climb stairs', 'climb the stair', 'go up the stair', 'go upstairs', 'take the stairs', 'climb down the stairs']) {
      const r = step(cloister(), c, WORLD);
      expect(r.state.room, c).toBe('monastery.sacristy'); expect(r.outcome, c).toBe('move');
    }
    expect(step(cloister(), 'climb down the stairs', WORLD).output[0]).toContain('The stair goes up from here');
    expect(one('look at stair').output[0]).toContain('down to the Cloister');
    for (const c of ['climb stairs', 'climb down the stairs', 'go downstairs', 'go up the stair', 'descend the spiral staircase']) {
      const r = one(c);
      expect(r.state.room, c).toBe('monastery.cloister'); expect(r.outcome, c).toBe('move');
    }
    expect(one('go up the stair').output[0]).toContain('The stair goes down from here');
    expect(one('get stair').output[0]).toBe('The stair is attached to the Monastery at both ends. It stays.');
  });
  it('turn on / turn off / toggle / already / ambiguous / unknown / everything', () => {
    const off = one('turn off export');
    expect(off.state.flags['ts.export']).toBe(false);
    expect(off.output[0]).toContain(FIFTEEN);
    expect(off.stepId).toBe('sacristy.export.off'); expect(off.sfx).toBe('toggle-off'); // E8: down for OFF (pre-flight R-1)
    expect(step(off.state, 'enable export to excel', WORLD).state.flags['ts.export']).toBe(true);
    expect(one('toggle guests').state.flags['ts.guests']).toBe(true);
    expect(one('flip xmla').state.flags['ts.xmla']).toBe(false);
    expect(one('turn on export').output[0]).toBe('It is already on. You click it anyway. Nothing changes. It felt good.');
    expect(one('turn off the web apps').output[0]).toMatch(/^Which book\? /);
    expect(one('turn off gravity').output[0]).toMatch(/^No book answers to 'gravity'/);
    for (const c of ['turn on everything', 'enable all', 'turn off everything', 'disable all']) expect(one(c).output[0]).toBe('You are not that kind of admin. One book at a time.');
    expect(one('turn on pause capacity').state.dead).toBe(true);
  });
  it('findBooks matches any distinctive word or the full title', () => {
    expect(findBooks('export to excel').map((b) => b.key)).toEqual(['export']);
    expect(findBooks('block public internet').map((b) => b.key)).toEqual(['blockInternet']);
    expect(findBooks('users can create fabric items').map((b) => b.key)).toEqual(['fabricItems']);
    expect(findBooks('copilot').map((b) => b.key)).toEqual(['copilot']);
  });
  it('reset settings restores everything in one turn', () => {
    const r = one('reset settings', { 'ts.export': false, 'ts.xmla': false, 'ts.guests': true, 'gov.touched': true });
    // Guests were on, so this reset also ends the flood: the files-out line takes the notices-nothing line's place that turn (E2 fix round 1, M3).
    // Books were touched and are all back, so the reset also pays governance restored (E3, spec2 §5).
    expect(r.output[0]).toBe('You put every book back the way you found it. The organization files out. Jeff from Ops takes a mug. Not yours. Every setting is back where you found it. Nobody will ever know. +5 for governance.');
    expect(r.state.bonus).toBe(5);
    expect(r.state.flags['ts.export']).toBe(true); expect(r.state.flags['ts.xmla']).toBe(true); expect(r.state.flags['ts.guests']).toBe(false);
    expect(r.parsed.verb).not.toBe('restore'); // "restore defaults" must not be the UI's restore
    const rd = one('restore defaults', { 'ts.export': false });
    expect(rd.outcome).not.toBe('meta');
  });
  it('get a book, delegate a book', () => {
    expect(one('get export').output[0]).toBe('The books are bolted to the shelf. Governance.');
    expect(one('delegate export').output[0]).toBe('Delegated to capacity admins. The capacity admin is also you. You feel the weight of it.');
  });
  it('the two deaths', () => {
    const a = one('turn on block public internet');
    expect(a.state.dead).toBe(true); expect(a.deathCause).toBe('death.block-internet');
    expect(a.output.join(' ')).toContain('Keep in mind, turning this on could take 10 to 20 minutes to take effect. It takes four seconds. You are on the public internet. You were.');
    expect(a.output.join(' ')).toContain('You blocked public internet access. From the public internet. Someone will need to finish the set-up process in Azure. It will not be you.');
    expect(a.output[a.output.length - 1]).toMatch(/You dead\. Refresh failed\.$/);
    expect(a.state.flags['ts.blockInternet']).toBeUndefined(); // not persisted
    const b = one('pause capacity');
    expect(b.state.dead).toBe(true); expect(b.deathCause).toBe('death.pause-capacity');
    expect(b.output.join(' ')).toContain('Capacities are billed per second. So, it turns out, are peasants.');
  });
});
