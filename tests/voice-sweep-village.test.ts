import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { VILLAGE_PHRASES, WORKSPACE_PHRASES } from '../src/world/village';
import { ALLUSIONS, BRANDS, MALAPROPS } from '../src/world/voice';
import type { GameState } from '../src/engine/types';

const one = (room: string, cmd: string, inventory: string[] = ['license']) => step({ ...newGame(WORLD, 3), room, inventory }, cmd, WORLD).output[0]!;
const at = (room: string, extra: Partial<GameState> = {}): GameState => ({ ...newGame(WORLD, 3), room, inventory: ['license'], ...extra });
/** The first line of each turn, and the state after them all. */
const run = (s: GameState, cmds: string[]) => {
  let state = s;
  const firsts: string[] = [];
  const ids: string[] = [];
  for (const c of cmds) { const r = step(state, c, WORLD); state = r.state; firsts.push(r.output[0]!); ids.push(r.stepId); }
  return { s: state, firsts, ids };
};
/** The same command twice in a row: both first lines, which must differ (the skill: a second identical command yields a different line). */
const twice = (s: GameState, cmd: string): [string, string] => {
  const { firsts } = run(s, [cmd, cmd]);
  expect(firsts[1], cmd).not.toBe(firsts[0]);
  return [firsts[0]!, firsts[1]!];
};
const VILLAGE = ['village.cottage', 'village.square', 'village.mill', 'village.fields'] as const;
const WITH_MUG = ['license', 'mug'];

describe('village sweep', () => {
  it('cottage', () => {
    expect(one('village.cottage', 'use mug', WITH_MUG)).toBe(`You drink from the mug. It has been empty since the last refresh. You feel ${MALAPROPS.refreshered}. You are not.`);
    expect(one('village.cottage', 'look at desk')).toMatch(/seventeen printouts of the same DAX error\.$/);
  });
  it('square', () => {
    expect(one('village.square', 'ask jeff about the report')).toBe("'The report,' says Jeff. 'The report says 4.2. I say 4.7. We've agreed to disagree. By which I mean I've disagreed.'");
    expect(one('village.square', 'give lanyard to jeff', ['license', 'lanyard'])).toMatch(/'FabCon,' he says, reverently\. 'They had Excel there\.'/);
    expect(one('village.square', 'say dax')).toBe(`You say 'DAX' in the square. Jeff flinches like a man who has been ${MALAPROPS.daxxed} before.`);
    expect(one('village.square', 'jump in well')).toBe("You lean over the Q&A Well. It asks you a question first: 'Did you mean: Sales by Region?' You did not. You back away.");
    expect(one('village.square', 'look at board')).toMatch(/Someone has drawn Clippy in the corner, and it looks like it's writing a measure\.$/);
  });
  it('mill', () => {
    expect(one('village.mill', 'ask miller about gen2')).toBe("'Gen2? Gen2 is Gen1 with a haircut,' says the Miller. 'No, wait. The other way.'");
    expect(one('village.mill', 'use chest')).toBe('You sit on the chest. The Miller sits on the other end. Neither of you says anything for a scheduled interval.');
    expect(one('village.mill', 'look at wheel')).toMatch(/Dataflows Gen1 Classic — the taste you remember\.$/);
  });
  it('fields', () => {
    expect(one('village.fields', 'ask manual about refresh')).toBe('Manual does not answer. A crow lands on him, refreshes, and fails. He is very proud of the crow.');
    expect(one('village.fields', 'scare the crows')).toBe('You flap your arms at the crows. They were not here for the refreshes. They were here for you. They leave, disappointed.');
    expect(one('village.fields', 'look at manual')).toMatch(/It is not a surname; it is a warning about full refreshes\.$/);
    expect(one('village.fields', 'get refresh')).toMatch(/Somewhere, a ferryman weeps\.$/);
  });
});

describe('village sweep: registration and the gate it must not shadow', () => {
  it('VILLAGE_PHRASES sit right after WORKSPACE_PHRASES (pre-flight ruling R-2)', () => {
    const ids = WORLD.phraseRules.map((p) => p.id);
    const lastWorkspace = ids.indexOf(WORKSPACE_PHRASES[WORKSPACE_PHRASES.length - 1]!.id);
    expect(ids.slice(lastWorkspace + 1, lastWorkspace + 1 + VILLAGE_PHRASES.length)).toEqual(VILLAGE_PHRASES.map((p) => p.id));
    expect(VILLAGE_PHRASES.map((p) => p.id)).toContain('village.well-jump');
    expect(VILLAGE_PHRASES.map((p) => p.id)).toContain('fields.scare-crows');
  });
  it('the chest gate keeps its +10 on open/unlock; use/sit are the Mill\'s own lines and score nothing', () => {
    for (const cmd of ['unlock chest', 'open chest']) {
      const r = step(at('village.mill'), cmd, WORLD);
      expect([r.stepId, r.pointsAwarded], cmd).toEqual(['village.credentials-open', 10]);
    }
    for (const cmd of ['use chest', 'sit on chest', 'sit on the chest']) {
      const r = step(at('village.mill'), cmd, WORLD);
      expect(r.pointsAwarded, cmd).toBe(0);
      expect(r.output[0], cmd).toMatch(/^You sit on the chest\./);
    }
    // The village's own phrases beat the global eggs they shadow, and only there.
    expect(one('village.square', 'jump in well')).not.toMatch(/interactive delay/);
    expect(one('village.mill', 'jump in well')).toMatch(/^You jump\./);
    expect(one('village.fields', 'scare the crows')).not.toMatch(/^Boo\./);
    expect(one('village.square', 'scare the crows')).toMatch(/^Boo\./);
  });
});

describe('village sweep: the same gag twice is a different line', () => {
  it('cottage', () => {
    const c = at('village.cottage', { inventory: WITH_MUG });
    expect(twice(c, 'use mug')[1]).toBe("Still empty. You're drinking a habit now.");
    expect(twice(c, 'open report')[1]).toBe('Done that. Page 12 still has 31 slices.');
    expect(twice(c, 'use report')[1]).toBe('Same dialog. Same one workspace. Same you in it.');
    expect(twice(c, 'use bed')[1]).toMatch(/has your face on file now\.$/);
    expect(twice(c, 'use candle')[1]).toBe('Higher this time. Still one room. Still 47 pages.');
    expect(twice(c, 'light candle')).toEqual(['Already lit. Both ends. You want a THIRD?', "Still two ends. Wax doesn't scale."]);
    expect(twice(c, 'blow out the candle')[1]).toBe("You blow again. The trial's still got 58 days.");
    expect(twice(c, 'sit at desk')[1]).toBe("You sit at the desk again. It's where the report happened to you.");
    expect(twice(c, 'use desk')[1]).toBe("You sit at the desk again. It's where the report happened to you.");
    expect(twice(c, 'open window')[1]).toBe("Jeff looks up again. It's bidirectional now.");
    expect(twice(c, 'open door')).toEqual(["Yeah, totally! Except it's already open, you moron. Try: out.", "Still open. It's a door, not a dialog."]);
    expect(twice(c, 'talk to jeff')).toEqual(["Jeff is outside. He hears 'Excel' anyway. He hears it in everything.", "He heard. He's at the window now."]);
    expect(twice(c, 'wash mug')[1]).toBe("Still considering. It's a heritage stain now.");
    expect(twice(at('village.cottage', { inventory: [...WITH_MUG, 'jeff-note'] }), 'use note on report')[1]).toBe("It's already on there. Jeff nods twice.");
  });
  it('square', () => {
    const sq = at('village.square', { inventory: [...WITH_MUG, 'lanyard', 'jeff-note', 'receipt'] });
    expect(twice(sq, 'say dax')[1]).toBe(`Jeff flinches again. He's been ${MALAPROPS.daxxed} twice today.`);
    expect(twice(sq, 'jump in well')[1]).toBe("You lean over again. 'Did you mean: the same thing?' You did.");
    expect(twice(sq, 'make a wish')).toEqual([`You wish for more ${MALAPROPS.capacitude}. The well answers: 'Did you mean: Pro?' You always mean Pro.`, "Again? 'Did you mean: Pro?' It did."]);
    expect(twice(sq, 'use well')[1]).toBe("'$4,213,908.' Same number. It's not a well, it's a measure.");
    expect(twice(sq, 'drink from well')[1]).toBe("Still 42. You're getting a sweet workout for your Q&A muscles.");
    expect(twice(sq, 'talk to well')[1]).toBe("It says 'Hello by Region' again. It's very proud of it.");
    expect(twice(sq, 'use board')[1]).toBe("Already pinned. Jeff's still waiting.");
    expect(twice(sq, 'open board')).toEqual(["It's nailed shut. To a well.", 'Still nailed. Still a well.']);
    expect(twice(sq, 'look at spreadsheet')[1]).toBe("Sheet1 (2) is also empty. He's saving room for Sheet1 (3).");
    expect(twice(sq, 'read spreadsheet')).toEqual(['Blank. Both tabs.', "Still blank. He's very proud of the tabs."]);
    expect(twice(sq, 'say yes')[1]).toBe('"Great!" he says again. He still does not leave.');
    expect(twice(sq, 'say no')[1]).toBe('Still not a file format. Jeff checked.');
    expect(twice(sq, 'ask jeff about the report')[1]).toBe("'I've thought about it,' says Jeff. 'It's 4.7. I was right the first time I disagreed.'");
    expect(twice(sq, 'ask jeff about jeff')).toEqual(["'Jeff?' says Jeff. 'Jeff from Finance. Or Finance from Jeff. It's a many-to-one and I forget which side I'm on.'", "'Still Jeff.' He checks his spreadsheet. Sheet1 agrees."]);
    expect(twice(sq, 'give lanyard to jeff')[1]).toBe("'FabCon,' he says again, less reverently. He hands it back.");
    expect(twice(sq, 'give note to jeff')[1]).toBe("'Still mine.' He still doesn't take it.");
    expect(twice(sq, 'give receipt to jeff')[1]).toBe('He expenses it again. Finance now owes Finance 800 CU-seconds.');
  });
  it('mill', () => {
    const m = at('village.mill', { inventory: ['license', 'usb stick', 'credentials'], flags: { ...at('village.mill').flags, 'has.credentials': true } });
    expect(twice(m, 'ask miller about gen2')[1]).toBe("'Look,' says the Miller. 'ONE of them has the haircut.'");
    expect(twice(m, 'ask miller about final_v3')).toEqual(["'FINAL_v3?' The Miller goes quiet. 'We don't say that name in the Mill.'", "'We don't say it TWICE, either.'"]);
    expect(twice(m, 'use chest')[1]).toBe("You sit again. So does the Miller. It's a standup now, the good kind.");
    expect(twice(m, 'turn the wheel')[1]).toBe("You turn it again. The Miller looks up. 'That's a schedule now.'");
    expect(twice(m, 'stop the wheel')[1]).toBe('It stops. It starts. You are not on the schedule.');
    expect(twice(m, 'upgrade to gen2')[1]).toBe('You upgraded already. There are two mills now. Nobody has told the Miller.');
    expect(twice(m, 'use wheel')[1]).toBe('Same dialog. It has considered you back.');
    expect(twice(m, 'give usb to miller')[1]).toBe("He hands it back faster. He's had practice.");
    expect(twice(m, 'open usb')[1]).toBe('Still a dataflow. Still mostly old.');
    expect(twice(m, 'use credentials')).toEqual(['Good idea. Wrong screen. The man who weeps for these is at the dock.', 'Still the wrong screen. The dock is south, south, then east.']);
    expect(twice(m, 'give credentials to miller')[1]).toBe("Still won't. 'Decommissioned means decommissioned.'");
    expect(twice(m, 'give license to miller')[1]).toBe("'Still Pro.' He hands it back again, gentler.");
  });
  it('fields', () => {
    const f = at('village.fields', { inventory: WITH_MUG });
    expect(twice(f, 'ask manual about refresh')[1]).toBe('You ask again. The crow refreshes again. Fails again. Manual is prouder.');
    expect(twice(f, 'ask manual about monday')[1]).toBe("He still won't say it. The sign still will.");
    expect(twice(f, 'use manual')[1]).toBe(`Eleven more minutes. He is thoroughly ${MALAPROPS.refreshered}. Still nothing waiting.`);
    expect(twice(f, 'refresh manual')[1]).toMatch(/thoroughly refreshed\./);
    expect(twice(f, 'get refresh')[1]).toBe('You pick another. Same error, other hand.');
    expect(twice(f, 'pick a refresh')[0]).toMatch(/^You pick a refresh\. It fails in your hand\./);
    expect(twice(f, 'scare the crows')[1]).toBe('You flap again. The crows are gone. The refreshes were never scared.');
    expect(twice(f, 'water the crops')).toEqual(['You water the refreshes. They fail, but wetter.', 'Wetter still. Same fail.']);
    expect(twice(f, 'get crow')).toEqual(['The crow declines. It has seen what you do with refreshes.', 'Nope. The crow has a schedule.']);
    expect(twice(f, 'look at sign')[1]).toBe("Still MONDAY. It's a warning, not a calendar.");
    expect(twice(f, 'look at crows')[1]).toBe('Still waiting. Crows are patient. Mondays are inevitable.');
    expect(twice(f, 'use sundial')).toEqual(['You turn the sundial to 2 AM. The sun checks its refresh schedule and declines.', "The sun still says no. It's in a meeting until 9:02."]);
    expect(twice(f, 'look at spreadsheet')[1]).toBe("Still empty. Now with a crow's footprint in B2.");
  });
});

describe('village sweep: one object, a different joke on every screen', () => {
  it('use mug', () => {
    const lines = VILLAGE.map((room) => one(room, 'use mug', WITH_MUG));
    expect(new Set(lines).size).toBe(4);
    expect(lines[1]).toBe('You drink from the empty mug. Jeff watches it go up and come down like a refresh bar.');
    expect(lines[2]).toBe("You drink from the empty mug. 'Empty since 2019?' asks the Miller. 'Spring.' 'Close.'");
    expect(lines[3]).toBe('You drink from the empty mug. A crow lands on the rim, checks it, and fails.');
    // The square's second time says you are out of ideas; the right idea with the wrong verb is corrected where Jeff stands.
    expect(twice(at('village.square', { inventory: WITH_MUG }), 'use mug')[1]).toBe("Again. Jeff watches again. You're out of ideas, and he can tell.");
    for (const room of ['village.square', 'village.fields']) expect(one(room, 'use mug on jeff', WITH_MUG)).toBe('Right idea, wrong verb. Jeff wants it GIVEN. He has been holding his hands out since spring.');
  });
  it('say dax', () => {
    const lines = VILLAGE.map((room) => one(room, 'say dax'));
    expect(new Set(lines).size).toBe(4);
    expect(lines[0]).toBe("You say 'DAX' to your own workspace. The seventeen printouts under the desk rustle.");
    expect(lines[2]).toBe("You say 'DAX' in the Mill. The Miller covers the wheel's ears. 'She only knows M.'");
    expect(lines[3]).toBe(`You say 'DAX' in the fields. Manual does not flinch. Straw cannot be ${MALAPROPS.daxxed}.`);
  });
  it('say excel, and the spreadsheet, follow Jeff', () => {
    expect(one('village.square', 'say excel')).toBe("Jeff's head turns like a Card finding a measure. 'Yes?' he says. 'YES?' You have made a mistake.");
    expect(one('village.fields', 'say excel')).toBe('Jeff turns. So does Manual, who was not built to turn.');
    const calm = { 'jeff.pacified': true };
    expect(step(at('village.square', { flags: { ...at('village.square').flags, ...calm } }), 'say excel', WORLD).output[0]).toBe('Jeff, content, does not turn. He heard the word. He has chosen the mug.');
    expect(step(at('village.fields', { flags: { ...at('village.fields').flags, ...calm } }), 'say excel', WORLD).output[0]).toBe("Nobody turns. The crows don't do Excel.");
    expect(one('village.fields', 'look at spreadsheet')).toBe("He brought it to the fields. It's empty out here too.");
    expect(step(at('village.fields', { flags: { ...at('village.fields').flags, ...calm } }), 'look at spreadsheet', WORLD).output[0]).toMatch(/^You don't see any spreadsheet here\.|^No spreadsheet here|^There is no spreadsheet|^spreadsheet\?|^You look for a spreadsheet|^A spreadsheet\?|^Yeah, there's no spreadsheet|^No spreadsheet\./);
    expect(step(at('village.square', { flags: { ...at('village.square').flags, ...calm } }), 'look at spreadsheet', WORLD).output[0]).toBe("He set it down by the well. It's empty, and for once, nobody minds.");
    // In the flood every Jeff turns; the delay line comes first.
    expect(step(at('village.square', { flags: { ...at('village.square').flags, 'ts.guests': true } }), 'say excel', WORLD).output[1]).toBe('Every Jeff turns at once. They all have Excel open. It was a mistake.');
    expect(step(at('village.square', { flags: { ...at('village.square').flags, 'ts.guests': true } }), 'say dax', WORLD).output[1]).toBe("You say 'DAX' in the square. Every Jeff flinches at once. It sounds like a spreadsheet closing.");
  });
});

describe('village sweep: looking twice, and a third time', () => {
  it('scenery has its own second look under the chirp', () => {
    const cases: [string, string, string][] = [
      ['village.cottage', 'look at candle', 'Still burning. When the wax goes, it starts a fourth trial.'],
      ['village.cottage', 'look at bed', 'Still a bed. You had a bunk until 26.'],
      ['village.cottage', 'look at report', 'Still 2.3 GB. Still FINAL. Still final2.'],
      ['village.cottage', 'look at door', 'Still out. Still east. Still open.'],
      ['village.square', 'look at well', "Still a well. You're not a well person. You're more of a Lakehouse person."],
      ['village.mill', 'look at wheel', 'Still turning. Like a screensaver of pipes, and about as load-bearing.'],
      ['village.mill', 'look at banner', 'Still Q3. The paint on the year is wet.'],
      ['village.mill', 'look at miller', 'Still tired. Still scheduled.'],
      ['village.fields', 'look at sundial', 'Still 9:02. Not a clock. A grudge.'],
      ['village.fields', 'look at refreshes', 'Still a third green. You counted.'],
      ['village.fields', 'look at manual', 'Still straw. Still Monday.'],
    ];
    for (const [room, cmd, second] of cases) {
      const r = run(at(room), [cmd, cmd]);
      expect(r.firsts[1], cmd).toBe(second);
      expect(r.firsts[0], cmd).not.toBe(second);
    }
    const ev = run(at('village.cottage', { flags: { ...at('village.cottage').flags, 'ts.monitoring': true } }), ['look at eventhouse', 'look at eventhouse']);
    expect(ev.firsts).toEqual(['An Eventhouse. It has already logged that you looked.', "Logged again. It's building a table about you."]);
  });
  it('the board has a third look, and Clippy is the allusion', () => {
    const r = run(at('village.square'), ['look at board', 'look at board', 'look at board', 'look at board']);
    expect(r.firsts[1]).toBe('Clippy is still writing the measure.');
    expect(r.firsts[2]).toBe("Clippy's finished the measure. It returns (Blank).");
    expect(r.firsts[3]).toBe(r.firsts[2]);
    expect(r.firsts[0]).toContain(ALLUSIONS[0]);
    expect(twice(at('village.mill'), 'look at wheel')[1]).toContain(ALLUSIONS[13]);
  });
  it('the chest and the window change with the story', () => {
    expect(step(at('village.mill', { flags: { ...at('village.mill').flags, 'has.credentials': true } }), 'look at chest', WORLD).output[0]).toBe('A chest marked CREDENTIALS. Empty now. It held one scrap of parchment for six years and it misses the weight.');
    expect(step(at('village.cottage', { flags: { ...at('village.cottage').flags, 'jeff.pacified': true } }), 'look out window', WORLD).output[0]).toMatch(/Jeff, content, holding a mug at nothing/);
    expect(step(at('village.mill', { flags: { ...at('village.mill').flags, 'ferry.online': true } }), 'look at miller', WORLD).output[0]).toMatch(/he looks less tired\.$/);
  });
});

describe('village sweep: the deferred minors', () => {
  it('a known topic asked twice in a row gets a second line from Jeff and from the Miller', () => {
    const j = run(at('village.square'), ['ask jeff about excel', 'ask jeff about excel', 'ask jeff about excel']);
    expect(j.firsts[0]).toMatch(/^"That mug on your desk would help\./);
    expect(j.firsts[1]).toBe("'You asked,' says Jeff. 'I answered. It's still Excel. It's Excel all the way down.'");
    expect(j.firsts[2]).toBe(j.firsts[1]);
    expect(j.s.flags['talk.jeff']).toBe(3);
    // An unknown topic is still his brush-off, twice.
    const b = run(at('village.square'), ['ask jeff about kimball', 'ask jeff about kimball']);
    expect(b.firsts).toEqual(['"Is it in Excel? Then I don\'t know it."', '"Is it in Excel? Then I don\'t know it."']);
    const m = run(at('village.mill', { flags: { ...at('village.mill').flags, 'has.credentials': true } }), ['ask miller about the ferryman', 'ask miller about the ferryman']);
    expect(m.firsts[0]).toMatch(/^"Those creds are the Ferryman's\. South to the square/);
    expect(m.firsts[1]).toBe("'Asked and answered,' says the Miller. 'In Q3. This one.'");
    // Before the creds are yours, any talk to the Miller is the hand-over (+10), topic or not.
    const r = step(at('village.mill'), 'ask miller about the ferryman', WORLD);
    expect([r.stepId, r.pointsAwarded]).toEqual(['village.credentials', 10]);
  });
  it('in the flood, talking to Jeff from HR does not count toward Jeff from Finance', () => {
    const flood = at('village.square', { flags: { ...at('village.square').flags, 'ts.guests': true } });
    const r = run(flood, ['talk to jeff from hr', 'ask jeff from ops about the report', 'talk to jeff']);
    expect(r.firsts[0]).toMatch(/^\(…interactive delay…\)$/);
    expect(r.ids.slice(0, 2)).toEqual(['flood.talk-jeffs', 'flood.talk-jeffs']);
    expect(r.s.flags['talk.jeff']).toBe(1);
    // Seven talks to the wrong Jeffs never count toward Jeff from Finance.
    const seven = run(flood, Array(7).fill('talk to jeff from ops'));
    expect(seven.s.flags['talk.jeff']).toBe(0);
  });
});

describe('village sweep: the voice constants land here', () => {
  it('each plain word, verbatim; the one brand; the blurbs no longer share a formula', () => {
    const f = at('village.fields', { inventory: WITH_MUG });
    const refreshered = [one('village.cottage', 'use mug', WITH_MUG), twice(f, 'use manual')[1]];
    for (const l of refreshered) expect(l).toContain(MALAPROPS.refreshered);
    const capacitude = [one('village.square', 'make a wish')];
    for (const l of capacitude) expect(l).toContain(MALAPROPS.capacitude);
    const daxxed = [...twice(at('village.square'), 'say dax'), one('village.fields', 'say dax')];
    for (const l of daxxed) expect(l).toContain(MALAPROPS.daxxed);
    expect(one('village.mill', 'look at wheel')).toContain(BRANDS[0]);
    expect(one('village.fields', 'use sundial')).not.toMatch(/™/);
    for (const id of ['window', 'board', 'sundial', 'well']) expect(WORLD.items[id]!.blurb, id).not.toMatch(/and all\b|wherever you/);
  });
  it('a third of the sweep\'s lines are short: a sample of one-beat refusals', () => {
    const creds = at('village.mill', { inventory: ['license', 'credentials'], flags: { ...at('village.mill').flags, 'has.credentials': true } });
    const short = [
      one('village.square', 'open board'), one('village.square', 'read spreadsheet'), twice(at('village.fields'), 'get crow')[1],
      twice(at('village.cottage'), 'light candle')[1], twice(at('village.fields'), 'water the crops')[1], twice(at('village.mill'), 'look at miller')[1],
      one('village.square', 'open well'), one('village.square', 'get spreadsheet'), one('village.fields', 'get sign'), one('village.fields', 'use sign'),
      step(creds, 'open chest', WORLD).output[0]!,
    ];
    for (const l of short) expect(l.split(' ').length, l).toBeLessThan(9);
    expect(short.slice(6)).toEqual(["It's open. That's the whole well.", "It's Jeff's. He'd rather hold a mug.", "It's his. He's wearing it.", "You can't use MONDAY. It uses you.", 'Already open. Already empty. Already yours.']);
    expect(step(creds, 'open chest', WORLD).pointsAwarded).toBe(0);
    // With the Shortcut in your pocket, `sign` is the Shortcut: its teleport and its again-line win in the Fields.
    const withShortcut = at('village.fields', { inventory: ['license', 'shortcut'] });
    expect(step(withShortcut, 'use sign', WORLD).state.room).toBe('lake.shore');
    expect(step(withShortcut, 'get sign', WORLD).output[0]).not.toBe("It's his. He's wearing it.");
  });
});
