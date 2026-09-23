// Spec1 §2.1: Jeff's Excel as a story. One function, excelStage(), drives the flask hint, `goal` and Jeff himself,
// so the three never disagree about the next step (Tommy's playtest: "I don't know how to get to the pivot table").
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { excelStage, stageLine } from '../src/world/excel';

const play = (cmds: string[]) => {
  let s = { ...newGame(WORLD, 8), room: 'village.square' };
  const outs: string[][] = [];
  for (const c of cmds) { const r = step(s, c, WORLD); s = r.state; outs.push(r.output); }
  return { s, outs, last: outs[outs.length - 1]! };
};
const IN = ['show me a table'];

describe('excelStage 0→5', () => {
  it('advances with the flags', () => {
    const { s: s0 } = play(IN);
    expect(excelStage(s0)).toBe(0);
    const { s: s1 } = play([...IN, 'talk to jeff']);
    expect(excelStage(s1)).toBe(1);
    const { s: s2 } = play([...IN, 'talk to jeff', 'n', 'analyze in excel', 'sign in']);
    expect(excelStage(s2)).toBe(2);
    const { s: s3 } = play([...IN, 'talk to jeff', 'n', 'analyze in excel', 'sign in', 's', 'e', 'create pivot table']);
    expect(excelStage(s3)).toBe(3);
    const { s: s4 } = play([...IN, 'talk to jeff', 'n', 'analyze in excel', 'sign in', 's', 'e', 'create pivot table', 'add sales region', 'add net sales', 'filter by year']);
    expect(excelStage(s4)).toBe(4);
    const { s: s5 } = play([...IN, 'talk to jeff', 'n', 'analyze in excel', 'sign in', 's', 'e', 'create pivot table', 'add sales region', 'add net sales', 'filter by year', 'w', 'show jeff']);
    expect(excelStage(s5)).toBe(5);
    expect(s5.bonus).toBe(20);
  });
  it('the flask hint, goal and Jeff all name the same next step', () => {
    const { s } = play([...IN, 'talk to jeff']);
    expect(stageLine(s)).toBe('Go north to the Data tab and `analyze in excel`, then `sign in`.');
    expect(step(s, 'get ye flask', WORLD).output[0]).toContain(stageLine(s));
    expect(step(s, 'goal', WORLD).output[0]).toContain(stageLine(s));
    expect(step(s, 'talk to jeff', WORLD).output[0]).toMatch(/Data tab/);
  });
  it('Jeff at stage 0 sets excel.jeff.asked and points north; a second ask at the same stage is a variant', () => {
    const a = play([...IN, 'talk to jeff']);
    expect(a.last[0]).toBe("\"The report says 4.2; my export says 4.7, and I trust my export. IT says 'Analyze in Excel', on the Data tab, connects to the real model. It's north. I never go north.\"");
    expect(a.s.flags['excel.jeff.asked']).toBe(true);
    const b = play([...IN, 'talk to jeff', 'talk to jeff']);
    expect(b.last[0]).not.toBe(a.last[0]);
    expect(b.last[0]).toMatch(/north|Data tab/i);
    const c = play([...IN, 'talk to jeff', 'talk to jeff', 'ask jeff']);
    expect(c.last[0]).not.toBe(b.last[0]);
  });
  it('stage 3 names only the missing pieces', () => {
    const { s } = play([...IN, 'talk to jeff', 'n', 'analyze in excel', 'sign in', 's', 'e', 'create pivot table', 'add net sales']);
    expect(stageLine(s)).toBe('Add what\'s missing: `add sales region` / `filter by year`.');
    expect(step(s, 'w', WORLD).output[0]).toMatch(/SHEET1/);
    const jeff = step(step(s, 'w', WORLD).state, 'talk to jeff', WORLD).output[0]!;
    expect(jeff).toMatch(/4\.5M/);
    expect(jeff).toMatch(/Sales Region in rows/);
    expect(jeff).toMatch(/the year filter/);
    expect(jeff).not.toMatch(/Net Sales in values/);
  });
});

describe('the broadened commands', () => {
  it.each(['pivot table', 'pivot', 'go to pivot table', 'open pivot table'])('%s on Sheet1 moves east', (c) => {
    expect(play([...IN, c]).s.room).toBe('excel.pivot');
  });
  it.each(['data tab', 'go to data tab', 'analyze in excel', 'connect'])('%s on Sheet1 moves north', (c) => {
    expect(play([...IN, c]).s.room).toBe('excel.data');
  });
  it('analyze in excel on the Data tab starts the connect; sign in / log in / use license connect', () => {
    for (const c of ['sign in', 'log in', 'use license']) {
      const { s } = play([...IN, 'n', 'analyze in excel', c]);
      expect(s.flags['excel.connected'], c).toBe(true);
    }
  });
  const READY = [...IN, 'talk to jeff', 'n', 'analyze in excel', 'sign in', 's', 'e', 'create pivot table'];
  it.each([
    ['add sales region', 'excel.dim'], ['put sales region in rows', 'excel.dim'], ['drag sales region to rows', 'excel.dim'], ['rows sales region', 'excel.dim'],
    ['add net sales', 'excel.measure'], ['put net sales in values', 'excel.measure'], ['values net sales', 'excel.measure'],
    ['filter by year', 'excel.filter'], ['filter to 2025', 'excel.filter'], ['filter current year', 'excel.filter'], ['add year filter', 'excel.filter'], ['put year in filters', 'excel.filter'],
  ])('%s sets %s', (c, flag) => {
    expect(play([...READY, c]).s.flags[flag]).toBe(true);
  });
  it('wrong fields keep their jokes', () => {
    expect(play([...READY, 'add region a']).last[0]).toMatch(/legacy/i);
    expect(play([...READY, 'add sales amount']).last[0]).toMatch(/Returns/);
  });
  it('the totals ladder is unchanged: 4.7M → 4.5M → 4.3M → 4.2M', () => {
    const { outs } = play([...READY, 'add sales region', 'add net sales', 'filter by year']);
    expect(outs[outs.length - 3]![0]).toMatch(/4\.5M/);
    expect(outs[outs.length - 2]![0]).toMatch(/4\.3M/);
    expect(outs[outs.length - 1]![0]).toMatch(/4\.2M/);
  });
  it.each(['show jeff', 'show jeff the pivot', 'tell jeff', 'give pivot to jeff', 'talk to jeff'])('%s at stage 4 wins', (c) => {
    const { s } = play([...READY, 'add sales region', 'add net sales', 'filter by year', 'w', c]);
    expect(s.bonus).toBe(20);
  });
  it('compare explains what is still inflating the total', () => {
    expect(play([...READY, 'compare']).last[0]).toMatch(/4,712,331/);
    expect(play([...READY, 'compare']).last[0]).toMatch(/Region A|Returns|three years/);
    expect(play([...READY, 'add sales region', 'add net sales', 'filter by year', 'look at difference']).last[0]).toMatch(/always 4\.2M|show him/i);
  });
  it('the field list names the wrong ones on purpose', () => {
    const out = play([...READY, 'fields']).last[0]!;
    for (const f of ['Sales Region', 'Region A (legacy)', 'Region B (legacy)', 'Product', 'Salesperson', 'Date', 'Net Sales', 'Sales Amount', 'Returns', 'Gross Sales', 'Sales YTD', 'Measure 2 (copy)', 'Is Current Year', 'Year', 'Quarter']) expect(out).toContain(f);
    expect(play([...IN, 'e', 'look at fields']).last[0]).toMatch(/Connect Analyze in Excel/);
  });
  it('Sheet1 examinables', () => {
    for (const [n, re] of [['export', /4,712,331/], ['report', /4\.2M/], ['monitor', /monitor/i], ['ribbon', /Data/], ['desk', /desk/i], ['tissue box', /tissue/i]] as const) {
      expect(play([...IN, `look at ${n}`]).last[0], n).toMatch(re);
    }
  });
});

// Fix round 1: the movement words work from every sheet with the natural prefixes, Jeff's own words work when typed,
// every one of his lines is reachable, and the wrong-place replies point somewhere.
describe('fix round 1: movement words everywhere', () => {
  const CONNECTED = [...IN, 'n', 'sign in'];
  it.each(['go to the pivot table', 'go to pivot table', 'click pivot table', 'click on the pivot table', 'switch to pivot', 'open the pivot table', 'select pivottable1', 'pivot table', 'pivot', 'pivottable', 'pivottable1', 'the pivot sheet'])(
    '%s moves to PivotTable1 from Sheet1 and from the Data tab', (c) => {
      expect(play([...IN, c]).s.room).toBe('excel.pivot');
      const fromData = play([...CONNECTED, c]);
      expect(fromData.s.room).toBe('excel.pivot');
      expect(fromData.last[0]).toMatch(/through Sheet1 to PivotTable1/);
    },
  );
  it.each(['go to the data tab', 'go to data tab', 'click data tab', 'click on the data tab', 'switch to data', 'open the data tab', 'data tab', 'data', 'connect'])(
    '%s moves to the Data tab from Sheet1 and from PivotTable1', (c) => {
      expect(play([...IN, c]).s.room).toBe('excel.data');
      const fromPivot = play([...IN, 'e', c]);
      expect(fromPivot.s.room).toBe('excel.data');
      expect(fromPivot.last[0]).toMatch(/back through Sheet1 to the Data tab/);
    },
  );
  it.each(['sheet1', 'sheet 1', 'go to sheet1', 'go to the sheet1', 'click sheet1', "jeff's sheet", 'switch to sheet 1', 'the first sheet'])('%s moves back to Sheet1 from both sheets', (c) => {
    expect(play([...IN, 'e', c]).s.room).toBe('excel.sheet1');
    expect(play([...IN, 'n', c]).s.room).toBe('excel.sheet1');
  });
  it('naming the sheet you are on says so, with the next step', () => {
    expect(play([...IN, 'sheet1']).last[0]).toMatch(/^You're on Sheet1\. So is Jeff\. Talk to Jeff first/);
    expect(play([...IN, 'n', 'data tab']).last[0]).toBe("You're on it. `analyze in excel`, then `sign in`.");
    expect(play([...CONNECTED, 'the data tab']).last[0]).toMatch(/^You're on it\. Already connected/);
    expect(play([...IN, 'e', 'pivot']).last[0]).toMatch(/^You're on it\. It's Jeff's/);
    expect(play([...CONNECTED, 's', 'e', 'pivot table']).last[0]).toBe("You're on it. It's blank. `create pivot table`.");
    expect(play([...CONNECTED, 's', 'e', 'create pivot table', 'go to pivot table']).last[0]).toMatch(/^You're on it\. Add what's missing/);
  });
  it('connect / analyze in excel once connected say so and stay, from any sheet', () => {
    for (const [pre, c] of [[['s'], 'connect'], [['s'], 'analyze in excel'], [['s'], 'use analyze in excel'], [['s', 'e'], 'connect'], [[], 'connect'], [[], 'analyze in excel']] as const) {
      const r = play([...CONNECTED, ...pre, c]);
      expect(r.last[0], `${pre.join(' ')} ${c}`).toMatch(/^Already connected\. Sales \(Certified\)\. The pivot is (east|south, then east|right here)\./);
    }
    expect(play([...CONNECTED, 's', 'e', 'connect']).s.room).toBe('excel.pivot');
  });
  it('on the Data tab the action words are still the connect (not a move)', () => {
    expect(play([...IN, 'n', 'connect']).last[0]).toMatch(/Sign-in required/);
    expect(play([...IN, 'n', 'analyze in excel']).last[0]).toMatch(/Sign-in required/);
  });
});

describe('fix round 1: Jeff from the other sheets', () => {
  const READY = [...IN, 'talk to jeff', 'n', 'analyze in excel', 'sign in', 's', 'e', 'create pivot table'];
  const ALL = [...READY, 'add sales region', 'add net sales', 'filter by year'];
  it.each(['show jeff', 'show jeff the pivot', 'talk to jeff', 'tell jeff', 'give pivot to jeff', 'ask jeff'])('%s on PivotTable1 at stage 4 walks back and wins', (c) => {
    const r = play([...ALL, c]);
    expect(r.s.bonus).toBe(20);
    expect(r.s.room).toBe('village.square');
    expect(r.last[0]).toMatch(/^You go west to Sheet1 and turn the pivot toward Jeff\. Jeff looks at 4\.2M/);
  });
  it('from the Data tab at stage 4 too, and only once', () => {
    const r = play([...ALL, 'w', 'n', 'show jeff']);
    expect(r.s.bonus).toBe(20);
    expect(r.last[0]).toMatch(/^You go south to Sheet1/);
    expect(play([...ALL, 'w', 'n', 'show jeff', 'show me a table', 'e', 'show jeff']).s.bonus).toBe(20);
  });
  it('at earlier stages Jeff is on Sheet1 and never moves', () => {
    expect(play([...READY, 'talk to jeff']).last[0]).toBe("Jeff is on Sheet1. West. He hasn't moved. He never moves.");
    expect(play([...IN, 'n', 'show jeff']).last[0]).toBe("Jeff is on Sheet1. South. He hasn't moved. He never moves.");
    expect(play([...IN, 'n', 'show jeff']).s.bonus).toBe(0);
  });
});

describe("fix round 1: Jeff's own words work when typed", () => {
  const CONNECTED = [...IN, 'talk to jeff', 'n', 'sign in', 's', 'e'];
  it.each(['make the pivot', 'make a pivot', 'build the pivot', 'make pivot table', 'make a pivot table', 'new pivot table', 'build pivot table', 'make me a pivot'])('%s creates the pivot on PivotTable1', (c) => {
    const r = play([...CONNECTED, c]);
    expect(r.s.flags['excel.pivot']).toBe(true);
    expect(r.last[0]).toMatch(/^A blank pivot on the live model/);
  });
  it('make the pivot elsewhere, unconnected, or twice', () => {
    expect(play([...IN, 'make the pivot']).last[0]).toMatch(/^Right idea, wrong sheet\. PivotTable1 is east/);
    expect(play([...IN, 'n', 'build the pivot']).last[0]).toMatch(/^Right idea, wrong sheet\. PivotTable1 is south, then east/);
    expect(play([...IN, 'e', 'make the pivot']).last[0]).toMatch(/Connect Analyze in Excel first/);
    const twice = play([...CONNECTED, 'make the pivot', 'create pivot table']);
    expect(twice.last[0]).toMatch(/^You made it already\. It's the one that says PivotTable1\. Add what's missing/);
    expect(twice.s.flags['excel.pivot']).toBe(true);
  });
  it.each(['put the fields in', 'add the fields', 'add fields', 'put fields in', 'put them in'])('%s names what is missing', (c) => {
    expect(play([...CONNECTED, 'create pivot table', 'add net sales', c]).last[0]).toBe("Which ones? Add what's missing: `add sales region` / `filter by year`.");
    expect(play([...CONNECTED, 'create pivot table', 'add net sales', 'add sales region', 'filter by year', c]).last[0]).toMatch(/^They're in\. All three\. Back to Sheet1 \(west\) and `show jeff`\./);
    expect(play([...CONNECTED, c]).last[0]).toMatch(/There is no pivot to put that in yet/);
    expect(play([...IN, c]).last[0]).toMatch(/^Right idea, wrong sheet/);
  });
});

describe('fix round 1: every one of Jeff\'s lines is reachable', () => {
  it('six talks before connecting give six different lines (the stage-0 variants live in stage 1)', () => {
    const { outs } = play([...IN, 'talk to jeff', 'talk to jeff', 'talk to jeff', 'talk to jeff', 'talk to jeff', 'talk to jeff']);
    const lines = outs.slice(1).map((o) => o[0]!);
    expect(new Set(lines).size).toBe(6);
    expect(lines).toContain('"Analyze in Excel, on the Data tab, north. I meant it in the geographic sense."');
    expect(lines).toContain('"Still 4.7. Still north. You keep asking like the answer is going to be south."');
  });
  it('stage 3: the third and later talks rotate, never the same line twice running', () => {
    const base = [...IN, 'talk to jeff', 'n', 'sign in', 's', 'e', 'create pivot table', 'add sales region', 'w'];
    const { outs } = play([...base, 'talk to jeff', 'talk to jeff', 'talk to jeff', 'talk to jeff', 'talk to jeff']);
    const lines = outs.slice(base.length).map((o) => o[0]!);
    for (let i = 1; i < lines.length; i++) expect(lines[i], `talk ${i + 1}`).not.toBe(lines[i - 1]);
    expect(new Set(lines).size).toBe(3);
  });
  it('stage 4: Jeff calls across the room when the third field lands, and waits in both room texts', () => {
    const base = [...IN, 'talk to jeff', 'n', 'sign in', 's', 'e', 'create pivot table', 'add sales region', 'add net sales'];
    let s = { ...newGame(WORLD, 8), room: 'village.square' };
    for (const c of base) s = step(s, c, WORLD).state;
    const third = step(s, 'filter by year', WORLD);
    expect(third.box).toBe('Jeff, from Sheet1, not looking: "Show me: `show jeff`. I can\'t look. I\'m looking."');
    expect(step(s, 'add net sales', WORLD).box).toBeFalsy();
    expect(step(third.state, 'look', WORLD).output[0]).toMatch(/Sheet1 is west\. From Sheet1, Jeff: "Just show me the pivot\. I have my eyes closed\. They're open\. Show me\."/);
    expect(step(third.state, 'w', WORLD).output[0]).toMatch(/Jeff, not looking: "Show me\. I won't look\. I'm looking\. `show jeff`\."/);
    expect(step(step(third.state, 'w', WORLD).state, 'talk to jeff', WORLD).state.bonus).toBe(20);
  });
});

describe('fix round 1: the minor findings', () => {
  const CONNECTED = [...IN, 'talk to jeff', 'n', 'sign in', 's', 'e'];
  it('M3: before the pivot, "put" is answered with put', () => {
    expect(play([...CONNECTED, 'put net sales in values']).last[0]).toBe('There is no pivot to put that in yet. create pivot table.');
    expect(play([...CONNECTED, 'drag net sales to values']).last[0]).toBe('There is no pivot to put that in yet. create pivot table.');
  });
  it('M4: drag keeps the wrong-field jokes, and the other fields go in and do nothing', () => {
    expect(play([...CONNECTED, 'create pivot table', 'drag region a to rows']).last[0]).toMatch(/legacy/);
    expect(play([...CONNECTED, 'create pivot table', 'drag sales amount to values']).last[0]).toMatch(/Returns/);
    expect(play([...CONNECTED, 'create pivot table', 'drag sales region column to rows']).s.flags).toMatchObject({ 'excel.dim': true });
    expect(play([...CONNECTED, 'create pivot table', 'add gross sales']).last[0]).toBe('In it goes. The total does not move. That is not one of the three.');
    expect(play([...CONNECTED, 'create pivot table', 'drag product to rows']).s.flags['excel.dim']).toBeUndefined();
  });
  it('M5: compare and show jeff match their stage', () => {
    expect(play([...CONNECTED, 'compare']).last[0]).toMatch(/You are connected now\. `create pivot table`/);
    expect(play([...CONNECTED, 'compare']).last[0]).not.toMatch(/Connect the model/);
    const done = play([...CONNECTED, 'create pivot table', 'add sales region', 'add net sales', 'filter by year', 'w', 'show jeff', 'show me a table', 'compare']).last[0];
    expect(done).toMatch(/He knows\./);
    expect(done).not.toMatch(/Go show him/);
    const early = play([...IN, 'show jeff']).last[0];
    expect(early).not.toMatch(/Wrong region column/);
    expect(early).toMatch(/still says 4\.7M.*Talk to Jeff first/);
    expect(play([...CONNECTED, 'w', 'show jeff']).last[0]).toMatch(/You connected something\. You didn't build anything\.".*Go east to the PivotTable and `create pivot table`\./);
  });
  it('M6: the wrong-place replies', () => {
    expect(play([...IN, 'create pivot table']).last[0]).toBe('Right idea, wrong sheet. PivotTable1 is east. The fields go in there, not here.');
    expect(play([...IN, 'n', 'add sales region']).last[0]).toBe('Right idea, wrong sheet. PivotTable1 is south, then east. The fields go in there, not here.');
    expect(play([...IN, 'sign in']).last[0]).toBe('Right idea, wrong tab. The sign-in dialog is on the Data tab, north. Nothing here takes a license.');
    expect(play([...IN, 'e', 'use license']).last[0]).toBe('Right idea, wrong tab. The sign-in dialog is on the Data tab, west, then north. Nothing here takes a license.');
    expect(play([...CONNECTED, 'log in']).last[0]).toBe('Already signed in. Sales (Certified). Once was plenty.');
    expect(play([...IN, 'use analyze in excel']).s.room).toBe('excel.data');
    expect(play([...IN, 'analyze']).s.room).toBe('excel.data');
    expect(play([...IN, 'n', 'sign in', 'sign in']).last[0]).toMatch(/^Already connected/);
    const won = [...CONNECTED, 'create pivot table', 'add sales region', 'add net sales', 'filter by year', 'w', 'show jeff', 'show me a table'];
    expect(play([...won, 'show jeff the pivot']).last[0]).toBe('"Okay. The report was right. Don\'t tell anyone I said that."');
    expect(play([...won, 'tell jeff']).s.bonus).toBe(20);
  });
  it('M7: the second monitor is the report', () => {
    expect(play([...IN, 'look at second monitor']).last[0]).toMatch(/^The report\. Net Sales, Northeast, this year: \$4\.2M/);
    expect(play([...IN, 'look at monitor']).last[0]).toMatch(/^Two monitors/);
  });
  it('M8: Sheet1 and the Data tab point at the pivot for pivot things; the Data tab and ribbon answer look', () => {
    for (const c of ['look at pivot table', 'look at fields', 'fields', 'look at field list']) {
      expect(play([...IN, c]).last[0], c).toBe("It's on PivotTable1, east. Everything pivot-shaped is.");
      expect(play([...IN, 'n', c]).last[0], c).toBe("It's on PivotTable1, south, then east. Everything pivot-shaped is.");
    }
    expect(play([...IN, 'look at data tab']).last[0]).toMatch(/Data/);
    expect(play([...IN, 'n', 'look at data tab']).last[0]).toMatch(/^The Data tab\./);
  });
});
