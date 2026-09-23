// Spec2 §3.3–3.5: every non-default setting changes something real in the world; every default leaves it as it was.
import { describe, expect, it } from 'vitest';
import { MAX_SCORE, newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import type { GameState } from '../src/engine/types';
import { GOLDEN_PATH } from './golden-path';
import { DEFAULTS, SETTING_KEYS, flagOf, type SettingKey } from '../src/engine/governance';
import { SIDE_REGIONS } from '../src/world/types';
import { GATES, type GateText } from '../src/world/gates';
import { XMLA_DETOUR } from '../src/world/sacristy';

const at = (room: string, flags: Record<string, boolean | number> = {}, extra: Partial<GameState> = {}): GameState => ({ ...newGame(WORLD, 3), room, flags, ...extra });
const one = (room: string, cmd: string, flags = {}, extra = {}) => step(at(room, flags, extra), cmd, WORLD);

describe('export off (spec2 §3.3)', () => {
  it.each(['show me a table', 'help jeff', 'open excel'])('%s: no entry', (c) => {
    const r = one('village.square', c, { 'ts.export': false });
    expect(r.state.room).toBe('village.square');
    expect(r.output[0]).toBe('Export is disabled by your administrator. Jeff looks at you the way a man looks at a locked fridge.');
    expect(r.stepId).toBe('sq.blocked.excel');
  });
  it('yes right after Jeff asks is blocked too, and Jeff mentions it', () => {
    const talked = one('village.square', 'talk to jeff', { 'ts.export': false });
    expect(talked.output[0]).toMatch(/and now Export is off\. Was that you\?/);
    expect(step(talked.state, 'yes', WORLD).state.room).toBe('village.square');
  });
});

describe('copilot off', () => {
  it.each(['copilot', 'ask copilot for sales', 'what are my sales numbers'])('%s: no entry', (c) => {
    const r = one('village.square', c, { 'ts.copilot': false });
    expect(r.state.room).toBe('village.square');
    expect(r.output[0]).toBe('Copilot is not available in your tenant. Contact your administrator. You are your administrator.');
  });
  it('the board says so', () => {
    expect(one('village.square', 'read board', { 'ts.copilot': false }).output[0]).toContain('Copilot is not available in this tenant.');
    expect(one('village.square', 'read board').output[0]).toContain('The prophecy has been published to web. 4,112 views.');
    expect(one('village.square', 'read board', { 'ts.publishToWeb': false }).output[0]).not.toContain('4,112 views');
  });
});

describe('fabricItems / workloads off', () => {
  const chamber = { inventory: ['license', 'scroll'] };
  it('the scroll cannot fix the notebook; on again, it can', () => {
    const off = one('monastery.spark', 'use scroll on notebook', { 'ts.fabricItems': false }, chamber);
    expect(off.output[0]).toBe('Notebook creation is disabled for your tenant. Brother Pandas creates a Power BI report instead. It has one card. It says 1.');
    expect(off.state.flags['notebook.fixed']).toBeUndefined(); expect(off.state.score).toBe(0);
    const delegated = one('monastery.spark', 'give scroll to pandas', { 'ts.workloads': false }, chamber);
    expect(delegated.output[0]).toMatch(/\(Delegated\. Also off\.\)$/);
    const on = one('monastery.spark', 'use scroll on notebook', { 'ts.fabricItems': true }, chamber);
    expect(on.state.flags['notebook.fixed']).toBe(true); expect(on.state.score).toBe(20);
  });
  it('Brother Pandas knows', () => {
    expect(one('monastery.spark', 'talk to pandas', { 'ts.fabricItems': false }).output[0]).toBe('"I can make a report. I can make a dashboard. I cannot make a Notebook. Who did this."');
  });
});

describe('xmla off', () => {
  it('closes the back gate and says whose fault it is', () => {
    const r = one('fortress.model', 'n', { 'ts.xmla': false });
    expect(r.state.room).toBe('fortress.model');
    expect(r.output[0]).toBe('The back gate is an XMLA endpoint. Your capacity admin set it to Off. Your capacity admin is you.');
    expect(step(at('fortress.model', { 'ts.xmla': false }), 'look', WORLD).output[0]).not.toMatch(/Exits: .*\bn\b/);
    expect(WORLD.rooms['fortress.model']!.flaskHint(at('fortress.model', { 'ts.xmla': false }))).toMatch(/XMLA/);
    expect(one('fortress.model', 'n', { 'ts.xmla': true }).state.room).toBe('monastery.gate');
  });
});

describe('feedback, usage, monitoring, discover, surge', () => {
  it('a bare number answers the survey only while feedback is on', () => {
    expect(one('village.cottage', '7', { 'ts.feedback': true }).output[0]).toBe('Thank you. Your participation is voluntary. It was not.');
    expect(one('village.cottage', '7').output[0]).not.toMatch(/voluntary/);
  });
  it('the survey line lands on turn multiples of 5', () => {
    const r = one('village.cottage', 'look', { 'ts.feedback': true }, { turns: 4 });
    expect(r.output[r.output.length - 1]).toMatch(/^\[Survey\]/);
  });
  it('monitoring: an Eventhouse in My Workspace', () => {
    expect(one('village.cottage', 'look', { 'ts.monitoring': true }).output[0]).toContain('A read-only Eventhouse hums in the corner. It is logging this sentence.');
    expect(one('village.cottage', 'look at eventhouse', { 'ts.monitoring': true }).output[0]).toBe('It has already logged that you looked.');
    expect(one('village.cottage', 'look at eventhouse').output[0]).not.toBe('It has already logged that you looked.');
  });
  it('discover off: the badge has no name, and Copilot still wins', () => {
    const g = at('copilot.gallery', { 'ts.discover': false, 'sq.return': 1 });
    expect(step(g, 'look at models', WORLD).output[0]).toContain('A model with a gold badge and no name. Discovery is off. You will have to guess.');
    expect(step(g, 'look at badge', WORLD).output[0]).toContain('no name');
    const win = step(at('copilot.pane', { 'ts.discover': false, 'sq.return': 1 }), 'total q4 2025 northeast net sales from the certified model, just the number', WORLD);
    expect(win.bonusAwarded).toBe(25);
  });
  it('surge: a hard hat', () => {
    expect(one('peaks.shrine', 'look at throttlor', { 'ts.surge': true }).output[0]).toContain('He is wearing a hard hat. Surge protection.');
    expect(one('peaks.shrine', 'look', { 'ts.surge': true }).output[0]).toContain('hard hat');
  });
});

describe('the back gate is one gate (xmla off, both sides)', () => {
  it('from the Monastery Gate, s is a wall too, and the hint sends you round', () => {
    const r = one('monastery.gate', 's', { 'ts.xmla': false, 'gate.open': true });
    expect(r.state.room).toBe('monastery.gate');
    expect(r.stepId).toBe('monastery.south-xmla');
    expect(r.output[0]).toMatch(/^The back gate is an XMLA endpoint\. Your capacity admin set it to Off\./);
    expect(one('monastery.gate', 'look', { 'ts.xmla': false, 'gate.open': true }).output[0]).toMatch(/XMLA endpoint: Off/);
    expect(one('monastery.gate', 'look', { 'ts.xmla': false, 'gate.open': true }).output[0]).not.toMatch(/Exits: .*\bs\b/);
    expect(WORLD.rooms['monastery.gate']!.flaskHint(at('monastery.gate', { 'ts.xmla': false, 'gate.open': true, 'trial.hoodie': true }))).toMatch(/XMLA endpoint/);
    expect(one('monastery.gate', 's', { 'gate.open': true }).state.room).toBe('fortress.model');
  });
  it("the Model View's hint never says north through a closed gate", () => {
    const hint = WORLD.rooms['fortress.model']!.flaskHint(at('fortress.model', { 'ts.xmla': false, 'taken.policy': true, 'refresh.done': true }));
    expect(hint).toMatch(/^The back gate is closed \(XMLA endpoint: Off\)/);
    expect(hint).not.toMatch(/North, through the back gate/);
    expect(WORLD.rooms['fortress.model']!.flaskHint(at('fortress.model', { 'taken.policy': true, 'refresh.done': true }))).toBe('North, through the back gate, the monks are waiting.');
  });
});

describe('Brother Pandas, escalated, with no Notebook', () => {
  it('talks 2 and 3 are his own lines and talk 3 names the Sacristy; fixed, the shelf no longer matters', () => {
    let s = at('monastery.spark', { 'ts.workloads': false });
    const lines: string[] = [];
    for (let i = 0; i < 5; i++) { const r = step(s, 'talk to pandas', WORLD); lines.push(r.output[0]!); s = r.state; }
    expect(lines[0]).toBe('"I can make a report. I can make a dashboard. I cannot make a Notebook. Who did this."');
    expect(lines[1]).toMatch(/^"Who did this," Brother Pandas says again\./);
    expect(lines[2]).toMatch(/Sacristy/);
    expect(new Set(lines).size).toBe(5);
    expect(s.flags['talk.pandas']).toBe(5);
    expect(step(at('monastery.spark', { 'ts.fabricItems': false, 'notebook.fixed': true, 'talk.pandas': 1 }), 'talk to pandas', WORLD).output[0]).toMatch(/^"Four seconds,"/);
  });
});

describe('the flood (spec2 §3.5)', () => {
  it('"Which Jeff." is the Square only; the interactive delay follows Jeff everywhere', () => {
    const r = one('village.fields', 'talk to jeff', { 'ts.guests': true });
    expect(r.output[0]).toBe('(…interactive delay…)');
    expect(r.output[1]).not.toMatch(/^Which Jeff\./);
  });
  it('reset settings ends the flood too', () => {
    const r = one('monastery.sacristy', 'reset settings', { 'ts.guests': true, 'gov.touched': true });
    expect(r.output[0]).toMatch(/The organization files out\. Jeff from Ops takes a mug\. Not yours\. Nobody will ever know\. \+5 for governance\.$/); // E3: touched and all back, so the restore is paid too
    expect(one('monastery.sacristy', 'reset settings', { 'ts.surge': true }).output[0]).not.toMatch(/files out/);
  });
  const FLOOD = { 'ts.guests': true };
  it('the Square is full of Jeffs, and talking to Jeff asks which', () => {
    expect(one('village.square', 'look', FLOOD).output.join('\n')).toContain('The entire organization is here. Jeff from Ops. Jeff from HR. A Jeff you do not recognize. They all have a question about the report.');
    expect(one('village.square', 'talk to jeff', FLOOD).output.join('\n')).toMatch(/^\(…interactive delay…\)\nWhich Jeff\. /);
  });
  it('Throttlor is enormous; flipping either book off ends it', () => {
    expect(one('peaks.shrine', 'look', FLOOD).output.join('\n')).toContain('Throttlor is enormous today. The whole organization is refreshing at once.');
    const end = one('monastery.sacristy', 'turn off guests', { ...FLOOD, 'gov.touched': true });
    expect(end.output[0]).toContain('The organization files out. Jeff from Ops takes a mug. Not yours.');
    const end2 = one('monastery.sacristy', 'turn off publish apps', FLOOD);
    expect(end2.output[0]).toContain('The organization files out.');
  });
});

describe('defaults: none of it shows', () => {
  const EFFECTS = [
    /locked fridge/, /You are your administrator/, /Export is off/, /Notebook creation is disabled/, /Delegated\. Also off/, /I cannot make a Notebook/,
    /XMLA/, /^\[Survey\]/m, /^Usage metrics:/m, /A bill arrives/, /Eventhouse/, /no name/, /hard hat/, /The entire organization is here/, /Which Jeff\./, /files out/,
    /Copilot is not available/, /voluntary/,
  ];
  it('the golden path is 200 in 69 turns with no effect line, and the only delay is the Peaks without boots', () => {
    let s = newGame(WORLD, 42);
    const transcript: string[] = [];
    for (const cmd of GOLDEN_PATH) {
      const r = step(s, cmd, WORLD);
      transcript.push(r.output.join('\n'));
      if (r.output[0] === '(…interactive delay…)') expect(['peaks.pass', 'peaks.ledge']).toContain(r.state.room);
      s = r.state;
    }
    const all = transcript.join('\n');
    for (const re of EFFECTS) expect(all).not.toMatch(re);
    expect(s.score).toBe(MAX_SCORE); expect(s.turns).toBe(69); expect(s.won).toBe(true);
  });
  it('a bare number at default is not a survey answer, and the cottage has no Eventhouse', () => {
    expect(one('village.cottage', '7').stepId).not.toBe('survey.reply');
    expect(one('village.cottage', 'look at eventhouse').outcome).toBe('snark');
    expect(one('village.cottage', 'look').output[0]).not.toMatch(/Eventhouse/);
  });
});

// ---- Fix round 1 (review E2): a hint never names a command the game will then refuse; flood reset; scenery ----
describe('fix round 1: hints name the right book, never a refused command', () => {
  const talks = (flags: Record<string, boolean | number>, n: number) => { let s = at('monastery.spark', flags); const out: string[] = []; for (let i = 0; i < n; i++) { const r = step(s, 'talk to pandas', WORLD); out.push(r.output[0]!); s = r.state; } return out; };
  it('I1: Brother Pandas points at the Ledger when the Delegated book is the one off, at the shelf when the shelf is, at both when both are', () => {
    const ledger = talks({ 'ts.workloads': false }, 5);
    expect(ledger[2]).toMatch(/Ledger|Delegated/); expect(ledger[2]).not.toMatch(/on the shelf/);
    expect(ledger[4]).toMatch(/The Ledger\. Delegated\. On\./);
    const shelf = talks({ 'ts.fabricItems': false }, 5);
    expect(shelf[2]).toMatch(/on the shelf says Users can create Fabric items/); expect(shelf[2]).not.toMatch(/Ledger/);
    expect(shelf[4]).toMatch(/The shelf\. Fabric items\. On\./);
    const both = talks({ 'ts.fabricItems': false, 'ts.workloads': false }, 5);
    expect(both[2]).toMatch(/shelf/); expect(both[2]).toMatch(/Ledger/);
    expect(both[4]).toMatch(/shelf AND the Ledger/);
  });
  it('M5: with his notebook fixed, the shelf no longer changes his first line either', () => {
    expect(one('monastery.spark', 'talk to pandas', { 'ts.fabricItems': false, 'notebook.fixed': true }).output[0]).toBe('"It works on my laptop."');
  });
  it('M1: while Export is off, Jeff drops the narrator\'s (Say: help jeff.) and keeps his own asking', () => {
    const off = one('village.square', 'talk to jeff', { 'ts.export': false }).output[0]!;
    expect(off).not.toMatch(/\(Say: help jeff\.\)/);
    expect(off).toMatch(/I have Excel open\." "…and now Export is off\. Was that you\?"$/);
    const calm2 = step(at('village.square', { 'ts.export': false, 'jeff.pacified': true, 'talk.jeff': 1 }), 'talk to jeff', WORLD).output[0]!;
    expect(calm2).not.toMatch(/\(Say: help jeff\.\)/);
    expect(step(at('village.square', { 'ts.export': false, 'jeff.pacified': true, 'talk.jeff': 2 }), 'talk to jeff', WORLD).output[0]).toMatch(/^"Come look at Excel\. I would tell you what to say, but Export is off/); // round 2: not even in his own voice
    expect(step(at('village.square', { 'jeff.pacified': true, 'talk.jeff': 2 }), 'talk to jeff', WORLD).output[0]).toMatch(/Say help jeff/);
    expect(one('village.square', 'talk to jeff').output[0]).toMatch(/\(Say: help jeff\.\)$/);
  });
  it('M2: the Spark Chamber and Cloister hints name the book while no Notebook can be made', () => {
    const spark = WORLD.rooms['monastery.spark']!;
    const cloister = WORLD.rooms['monastery.cloister']!;
    const scroll = { inventory: ['scroll'] };
    expect(spark.flaskHint(at('monastery.spark', { 'ts.fabricItems': false }, scroll))).toMatch(/^No Notebook until Users can create Fabric items, on the shelf, is back on/);
    expect(spark.flaskHint(at('monastery.spark', { 'ts.fabricItems': false }, scroll))).not.toMatch(/Use the scroll/);
    expect(spark.flaskHint(at('monastery.spark', { 'ts.workloads': false }, scroll))).toMatch(/Delegated tenant settings, in the Capacity Ledger, is back on/);
    expect(spark.flaskHint(at('monastery.spark', { 'ts.workloads': false, 'ts.fabricItems': false }))).toMatch(/on the shelf, and Delegated tenant settings, in the Capacity Ledger, are both back on/);
    expect(cloister.flaskHint(at('monastery.cloister', { 'ts.fabricItems': false }, scroll))).toMatch(/^No Notebook until/);
    expect(cloister.flaskHint(at('monastery.cloister', { 'ts.fabricItems': false }, scroll))).not.toMatch(/Use the scroll/);
    expect(spark.flaskHint(at('monastery.spark', { 'ts.fabricItems': false, 'notebook.fixed': true }))).toMatch(/talk to the Abbot/);
    expect(spark.flaskHint(at('monastery.spark', {}, scroll))).toBe('Use the scroll on the notebook.');
  });
  it('M2: the Cloister and Gate hints with XMLA off name the book and the long way, never south through the wall', () => {
    const cloister = WORLD.rooms['monastery.cloister']!;
    for (const flags of [{ 'ts.xmla': false, 'trial.hoodie': true }, { 'ts.xmla': false, 'trial.hoodie': true, 'trial.key': true }]) {
      const h = cloister.flaskHint(at('monastery.cloister', flags));
      expect(h).toMatch(/XMLA endpoint: Read Write/); expect(h).toMatch(/Capacity Ledger/); expect(h).toMatch(/Gold Marsh/);
      expect(h).not.toMatch(/Go south/);
    }
    expect(WORLD.rooms['monastery.gate']!.flaskHint(at('monastery.gate', { 'ts.xmla': false, 'gate.open': true, 'trial.hoodie': true }))).toMatch(/XMLA endpoint: Read Write is back on/);
    expect(cloister.flaskHint(at('monastery.cloister', { 'trial.hoodie': true }))).toMatch(/^Go south, back through the Keep/);
  });
  it('M3: reset during the flood is one line, and the organization does notice', () => {
    const r = one('monastery.sacristy', 'reset settings', { 'ts.guests': true, 'gov.touched': true });
    // Still one line: the restore (E3, spec2 §5) is appended to it, since the books were touched and are all back.
    expect(r.output[0]).toBe('You put every book back the way you found it. The organization files out. Jeff from Ops takes a mug. Not yours. Nobody will ever know. +5 for governance.');
    expect(r.output).toHaveLength(1);
    expect(one('monastery.sacristy', 'reset settings', { 'ts.surge': true }).output[0]).toBe('You put every book back the way you found it. The organization notices nothing. That is the job.');
  });
});

describe('fix round 1: the nouns the settings put in the room answer (M4)', () => {
  it('bricks and the back gate, from both sides, while XMLA is off; not at default', () => {
    const off = { 'ts.xmla': false };
    for (const noun of ['bricks', 'wall', 'gate', 'back gate', 'xmla endpoint']) expect(one('fortress.model', `look at ${noun}`, off).output[0]).toMatch(/^Bricks, where the back gate was\./);
    expect(one('fortress.model', 'get bricks', off).output[0]).toBe('You pull at a brick. It is Read Only.');
    expect(one('monastery.gate', 'look at bricks', off).output[0]).toMatch(/Three monks lean on it/);
    expect(one('monastery.gate', 'look at gate', off).output[0]).toMatch(/progress bar/);
    expect(one('fortress.model', 'look at bricks').outcome).toBe('snark');
    expect(one('fortress.model', 'look at gate').outcome).toBe('snark');
  });
  it('the hard hat while surge is on; not at default; not once the dragon is gone', () => {
    expect(one('peaks.shrine', 'look at hard hat', { 'ts.surge': true }).output[0]).toMatch(/^A hard hat, dragon-sized/);
    expect(one('peaks.shrine', 'get hat', { 'ts.surge': true }).output[0]).toMatch(/not taking a hat off a dragon/);
    expect(one('peaks.shrine', 'look at hard hat').outcome).toBe('snark');
    expect(one('peaks.shrine', 'look at hard hat', { 'ts.surge': true, 'dragon.gone': true }).outcome).toBe('snark');
    expect(one('peaks.shrine', 'look', { 'ts.guests': true, 'ts.surge': true }).output.join('\n')).toMatch(/30-second intervals\. Throttlor is enormous today\. The whole organization is refreshing at once\. He is wearing a hard hat/);
  });
  it('the other Jeffs in the flooded Square; Jeff from Finance is still "jeff"; nothing at default', () => {
    const flood = { 'ts.guests': true };
    for (const noun of ['jeffs', 'jeff from ops', 'jeff from hr', 'the organization', 'everyone']) expect(one('village.square', `look at ${noun}`, flood).output[1]).toMatch(/^Jeffs\. Jeff from Ops, Jeff from HR/);
    expect(one('village.square', 'look at jeff', flood).output[1]).toMatch(/^Jeff from Finance/);
    expect(one('village.square', 'talk to jeff from ops', flood).output[1]).toMatch(/^"Which Jeff\." You point\. Jeff from Ops steps forward/);
    expect(one('village.square', 'talk to jeff from ops', flood).stepId).toBe('flood.talk-jeffs');
    expect(one('village.square', 'get jeffs', flood).output[1]).toMatch(/That is how organizations work\.$/);
    expect(one('village.square', 'look at jeff from ops').output[0]).toMatch(/^Jeff from Finance/);
    expect(one('village.square', 'talk to jeff from ops').output[0]).toBe('"Is it in Excel? Then I don\'t know it."'); // pre-existing: the parser hands him 'ops' as a topic
    expect(one('village.square', 'look at jeffs').outcome).toBe('snark');
    expect(one('village.fields', 'look at jeffs', flood).outcome).toBe('snark');
  });
});

// ---- Fix rounds 2–3 (review E2): NPC hints respect closed gates and missing books; the long way is worded from each room ----
describe('fix rounds 2–3: no hint, NPC line or gate line names a command the same state refuses', () => {
  // What each non-default setting refuses, as a hint might name it. Every pattern here is proven live at default below;
  // the Excel triggers (`show me a table`, `open excel`, …), `give scroll to` and every Copilot trigger are absent because
  // no main-realm hint ever names them, so they could not be asserted against.
  const NOTEBOOK = [/use (the )?scroll on/i, /use it on (the )?notebook/i, /notebook\. use it\./i, /use the scroll on it/i, /goes on the notebook/i];
  const REFUSED: Partial<Record<SettingKey, RegExp[]>> = {
    fabricItems: NOTEBOOK, workloads: NOTEBOOK,
    // `n` from the Model View and `s` from the Monastery Gate, and every route that runs through them.
    xmla: [/north, through the back gate/i, /through the keep/i, /south, child/i, /the monks are that way/i, /then north again/i, /west, then north\b/i, /go west, then south/i, /go south, back/i, /back gate opens onto/i, /back gate onto the monastery/i],
    export: [/help jeff/i],
  };
  // Progress states a hint, an NPC or a gate branches on, so the check sees every branch that matters.
  const STATES: { flags: Record<string, boolean | number>; inventory: string[] }[] = [
    { flags: {}, inventory: ['license'] },
    { flags: {}, inventory: ['license', 'scroll'] },
    { flags: { 'jeff.pacified': true, 'prophecy.read': true }, inventory: [] },
    { flags: { 'jeff.pacified': true, 'sq.excel.done': true }, inventory: ['mug'] },
    { flags: { 'prophecy.read': true, 'jeff.pacified': true, 'has.credentials': true, 'trial.moat': true, 'bridge.down': true }, inventory: ['credentials'] },
    { flags: { 'gate.open': true, 'gate.waiting': 3, 'scroll.lent': true, 'trial.moat': true }, inventory: ['scroll'] },
    { flags: { 'gate.open': true, 'scroll.lent': true, 'notebook.fixed': true, 'trial.moat': true }, inventory: [] },
    { flags: { 'gate.open': true, 'notebook.fixed': true, 'has.hoodie': true, 'trial.hoodie': true, 'trial.moat': true }, inventory: ['hoodie'] },
    { flags: { 'bridge.down': true, 'trial.moat': true, 'taken.policy': true }, inventory: ['policy'] },
    { flags: { 'bridge.down': true, 'trial.moat': true, 'taken.policy': true, 'refresh.done': true, 'stare.done': true }, inventory: ['boots'] },
    { flags: { 'bridge.down': true, 'trial.moat': true, 'taken.policy': true, 'refresh.done': true, 'trial.hoodie': true }, inventory: ['hoodie', 'boots'] },
    { flags: { 'trial.moat': true, 'trial.hoodie': true, 'ferry.online': true }, inventory: ['hoodie', 'standard key'] },
    { flags: { 'trial.moat': true, 'trial.hoodie': true, 'trial.key': true, 'shrine.open': true }, inventory: ['hoodie', 'standard key'] },
  ];
  const rooms = Object.values(WORLD.rooms).filter((r) => !SIDE_REGIONS.has(r.region));
  const txt = (s: GameState, l: GateText | undefined): string => (typeof l === 'function' ? l(s) : l ?? '');
  /** Every hint-like line in one room and state: the flask hint, the narrator's two nudge tiers (Task B4), the NPCs' talks 1–6, and each shut gate's shape, plainer hint and flavor pool. */
  const linesIn = (s: GameState, room: (typeof rooms)[number]): [string, string][] => {
    const out: [string, string][] = [[`${room.id} flaskHint`, room.flaskHint(s)]];
    for (const [tier, l] of [['oblique', room.nudge?.oblique], ['plainer', room.nudge?.plainer]] as const) {
      const t = typeof l === 'function' ? l(s) : l;
      if (t) out.push([`${room.id} nudge ${tier}`, t]);
    }
    for (const id of room.npcs) {
      const npc = WORLD.npcs[id]!;
      if (npc.hiddenWhen?.(s)) continue;
      out.push([`${id} talk 1 in ${room.id}`, npc.talk(s)]);
      if (npc.talkMore) for (const n of [2, 3, 4, 5, 6]) out.push([`${id} talk ${n} in ${room.id}`, npc.talkMore(s, n)]);
    }
    for (const g of GATES) {
      if (g.room !== room.id || !g.when(s)) continue;
      out.push([`gate ${g.id} shape`, txt(s, g.shape)], [`gate ${g.id} more`, txt(s, g.more)]);
      for (const f of g.flavor ?? []) out.push([`gate ${g.id} flavor`, txt(s, typeof f === 'object' && 'line' in f ? f.line : f)]);
    }
    return out;
  };
  const keys = SETTING_KEYS.filter((k) => REFUSED[k]);
  it.each(keys)('%s at its non-default value', (key) => {
    const bad: string[] = [];
    for (const st of STATES) for (const room of rooms) {
      const s = at(room.id, { ...st.flags, [flagOf(key)]: !DEFAULTS[key] }, { inventory: st.inventory });
      for (const [where, text] of linesIn(s, room)) for (const re of REFUSED[key]!) if (re.test(text)) bad.push(`${where}: ${JSON.stringify(text)} matches ${re}`);
    }
    expect(bad).toEqual([]);
  });
  it('every pattern is live: the same walk at defaults finds each one somewhere (none is vacuous)', () => {
    const dead: string[] = [];
    const all = STATES.flatMap((st) => rooms.flatMap((room) => linesIn(at(room.id, st.flags, { inventory: st.inventory }), room).map(([, text]) => text)));
    for (const [key, res] of Object.entries(REFUSED)) for (const re of res) if (!all.some((text) => re.test(text))) dead.push(`${key}: ${re}`);
    expect(dead).toEqual([]);
  });
  it('the long way is worded from each room, and walking it as worded reaches the Monastery gate', () => {
    // The stage at which each room hints the route: the moat done, the hoodie not, and whatever opens the room's own exits.
    const STAGE: Record<string, Record<string, boolean | number>> = {
      'village.square': { 'prophecy.read': true, 'jeff.pacified': true, 'has.credentials': true, 'trial.moat': true },
      'village.fields': { 'trial.moat': true }, 'peaks.foothills': { 'trial.moat': true }, 'peaks.ledge': { 'trial.moat': true },
      'fortress.bridge': { 'bridge.down': true, 'trial.moat': true, 'taken.policy': true, 'refresh.done': true },
      'fortress.hall': { 'bridge.down': true, 'trial.moat': true, 'taken.policy': true, 'refresh.done': true },
    };
    const DIR_WORD: Record<string, string> = { n: 'north', s: 'south', e: 'east', w: 'west' };
    expect(Object.keys(XMLA_DETOUR).sort()).toEqual(Object.keys(STAGE).sort());
    for (const [room, { steps, words }] of Object.entries(XMLA_DETOUR)) {
      const flags = { ...STAGE[room]!, 'ts.xmla': false };
      const hint = WORLD.rooms[room]!.flaskHint(at(room, flags));
      expect(hint, room).toContain(`The monks are reached the long way: ${words}.`);
      expect(words.split(/[ ,]/)[0], room).toBe(DIR_WORD[steps[0]!]);
      let s = at(room, flags, { worn: ['boots'], inventory: ['boots'] });
      for (const dir of steps) {
        const r = step(s, dir, WORLD);
        expect(r.state.room, `${room}: ${dir} from ${s.room}`).not.toBe(s.room);
        s = r.state;
      }
      expect(s.room, room).toBe('monastery.gate');
      expect(WORLD.rooms[room]!.flaskHint(at(room, STAGE[room]!)), `${room} at default`).not.toContain('bricked');
    }
  });
  it('N1/N2 in particular: the Abbot, Sir Cardinality, the Librarian and the Model View after the hoodie', () => {
    const abbot = WORLD.npcs['abbot']!, knight = WORLD.npcs['cardinality']!, librarian = WORLD.npcs['librarian']!;
    expect(abbot.talkMore!(at('monastery.cloister', { 'ts.xmla': false, 'has.hoodie': true }), 3)).toMatch(/XMLA endpoint: Read Write.*Capacity Ledger.*Gold Marsh/);
    expect(abbot.talkMore!(at('monastery.cloister', { 'ts.fabricItems': false }, { inventory: ['scroll'] }), 3)).toMatch(/^"No Notebook until Users can create Fabric items, on the shelf, is back on\./);
    expect(abbot.talkMore!(at('monastery.cloister', { 'ts.workloads': false }), 3)).toMatch(/Delegated tenant settings, in the Capacity Ledger/);
    expect(abbot.talkMore!(at('monastery.cloister', { 'ts.fabricItems': false }, { inventory: ['scroll'] }), 4)).not.toMatch(/Use it/);
    expect(knight.talkMore!(at('fortress.model', { 'ts.xmla': false }), 3)).toMatch(/which is bricks.*XMLA endpoint: Read Write.*Capacity Ledger/);
    expect(knight.talkMore!(at('fortress.model', {}), 3)).toMatch(/The monks are that way/);
    expect(librarian.talkMore!(at('monastery.library', { 'ts.fabricItems': false, 'scroll.lent': true }), 3)).toMatch(/will not take the scroll until Users can create Fabric items/);
    const done = { 'ts.xmla': false, 'taken.policy': true, 'refresh.done': true, 'trial.hoodie': true };
    expect(WORLD.rooms['fortress.model']!.flaskHint(at('fortress.model', done))).toBe('The back gate is closed (XMLA endpoint: Off), and the monks are done with you, so let it be. East to the hall, then south, out the gate.');
    expect(WORLD.rooms['fortress.model']!.flaskHint(at('fortress.model', { ...done, 'ts.xmla': true }))).toBe('The monks are done with you and so is the Keep. East to the hall, then south, out the gate.');
    expect(WORLD.rooms['fortress.bridge']!.flaskHint(at('fortress.bridge', { 'ts.xmla': false, 'bridge.down': true, 'trial.moat': true, 'taken.policy': true, 'refresh.done': true }))).toMatch(/^The Keep's back gate to the Monastery is bricked until XMLA endpoint: Read Write/);
    expect(WORLD.rooms['village.square']!.flaskHint(at('village.square', { 'ts.xmla': false, 'prophecy.read': true, 'jeff.pacified': true, 'has.credentials': true, 'trial.moat': true }))).toMatch(/^The Keep's back gate to the Monastery is bricked/);
  });
  it('the back gate at the Monastery Gate is its own examinable; the gate objects\' second try names the book', () => {
    expect(one('monastery.gate', 'look at back gate', { 'gate.open': true }).output[0]).toMatch(/^The Keep's back gate, south: the XMLA endpoint, Read Write\./);
    expect(one('monastery.gate', 'look at back gate', { 'ts.xmla': false }).output[0]).toMatch(/^Bricks, where the Keep's back gate was\./);
    expect(one('monastery.gate', 'look at gate').output[0]).toMatch(/progress bar/);
    let s = at('monastery.spark', { 'ts.fabricItems': false }, { inventory: ['scroll'] });
    s = step(s, 'open notebook', WORLD).state;
    const second = step(s, 'open notebook', WORLD).output[0]!;
    expect(second).toMatch(/No Notebook until Users can create Fabric items, on the shelf, is back on/);
    expect(second).not.toMatch(/use scroll on notebook/);
    let c = at('monastery.cloister', { 'ts.workloads': false }, { inventory: ['scroll'] });
    c = step(c, 'push abbot', WORLD).state;
    expect(step(c, 'push abbot', WORLD).output[0]).toMatch(/Delegated tenant settings, in the Capacity Ledger/);
  });
});
