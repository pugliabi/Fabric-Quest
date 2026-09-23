// tests/copilot-slots.test.ts
import { describe, expect, it } from 'vitest';
import { mergeSlots, parseSlots, replyFor, stageOf, WIN_FIGURE } from '../src/world/copilot-ladder';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';

describe('parseSlots keeps the whole-word matchers', () => {
  it('model', () => {
    expect(parseSlots('use the certified model').slots.model).toBe('certified');
    expect(parseSlots('sales from final2').slots.model).toBe('final2');
    expect(parseSlots('sales from sales_test_DO_NOT_USE').slots.model).toBe('test');
    expect(parseSlots('the latest sales').slots.model).toBeUndefined(); // "latest" is not "test"
    expect(parseSlots('the uncertified model').slots.model).toBeUndefined();
  });
  it('measure, region, period, year, one', () => {
    expect(parseSlots('net sales').slots.measure).toBe('net');
    expect(parseSlots('sales amount').slots.measure).toBe('amount');
    expect(parseSlots('gross sales').slots.measure).toBe('gross');
    expect(parseSlots('for the northeast').slots.region).toBe('ne');
    expect(parseSlots('for the southeast').slots.region).toBe('other');
    expect(parseSlots('q4').slots.q4).toBe(true);
    expect(parseSlots('4th quarter').slots.q4).toBe(true);
    expect(parseSlots('2025').slots.year).toBe(2025);
    expect(parseSlots('2025q4').slots).toMatchObject({ q4: true, year: 2025 });
    expect(parseSlots('just the total').slots.one).toBe(true);
    expect(parseSlots('how much').slots.one).toBe(true);
    expect(parseSlots('total by product and by day').slots.one).toBe(false);
    expect(parseSlots('show me sales').sales).toBe(true);
    expect(parseSlots('show me the tables').tables).toBe(true);
  });
  it('mergeSlots keeps what was said before and overwrites what is said now', () => {
    expect(mergeSlots({ model: 'test', region: 'ne' }, { model: 'certified' })).toEqual({ model: 'certified', region: 'ne' });
  });
});

describe('stageOf: model → measure → region → period → shape', () => {
  it('walks the order', () => {
    expect(stageOf({}, false)).toBe(0);
    expect(stageOf({}, true)).toBe(1);
    expect(stageOf({ model: 'final2' }, true)).toBe(1);
    expect(stageOf({ model: 'certified' }, true)).toBe(2);
    expect(stageOf({ model: 'certified', measure: 'amount' }, true)).toBe(2);
    expect(stageOf({ model: 'certified', measure: 'net' }, true)).toBe(3);
    expect(stageOf({ model: 'certified', measure: 'net', region: 'ne' }, true)).toBe(4);
    expect(stageOf({ model: 'certified', measure: 'net', region: 'ne', q4: true }, true)).toBe(4);
    expect(stageOf({ model: 'certified', measure: 'net', region: 'ne', q4: true, year: 2025 }, true)).toBe(5);
    expect(stageOf({ model: 'certified', measure: 'net', region: 'ne', q4: true, year: 2025, one: true }, true)).toBe(6);
  });
  it('a slot set without the sales word still counts', () => expect(stageOf({ model: 'certified' }, false)).toBe(2));
});

describe('replyFor shows the wrong thing for the stage', () => {
  const base = { tables: false, polite: false, nth: 1 };
  it('stage 0: the top 5 things', () => expect(replyFor({}, 0, base).text).toMatch(/top 5 things in your tenant/));
  it('stage 1: three models, or the 14 tables', () => {
    expect(replyFor({}, 1, base).text).toMatch(/3 semantic models with sales: Sales \(Certified\), Sales_v3_FINAL_final2, sales_test_DO_NOT_USE\. Which one\?/);
    expect(replyFor({}, 1, { ...base, tables: true }).text).toMatch(/14 tables/);
    expect(replyFor({ model: 'test' }, 1, base).text).toBe('From sales_test_DO_NOT_USE: $12. The sign said not to. I did anyway.');
    expect(replyFor({ model: 'final2' }, 1, base).context).toBe('[Understood: model = Sales_v3_FINAL_final2]');
  });
  it('stage 2: six measures, the table, or the includes-Returns joke', () => {
    const c = { model: 'certified' as const };
    expect(replyFor(c, 2, base).text).toMatch(/6 measures: Sales Amount, Net Sales, Gross Sales, Returns, Sales YTD, Measure 2 \(copy\)\. Which\?/);
    expect(replyFor(c, 2, { ...base, tables: true }).text).toMatch(/The Sales table has 400 rows/);
    expect(replyFor({ ...c, measure: 'amount' }, 2, base).text).toMatch(/includes Returns/);
    expect(replyFor(c, 2, base).context).toBe('[Understood: model = Sales (Certified)]');
  });
  it('stage 3, 4, 5, 6', () => {
    const c = { model: 'certified' as const, measure: 'net' as const };
    expect(replyFor(c, 3, base).text).toMatch(/\$4,201,377 — all regions, all time\. Did you want a region\?/);
    expect(replyFor({ ...c, region: 'ne' }, 4, base).text).toMatch(/\$2,933,012\. Since 2019/);
    expect(replyFor({ ...c, region: 'ne', q4: true }, 4, base).text).toMatch(/400 rows/);
    expect(replyFor({ ...c, region: 'ne', q4: true, year: 2025 }, 5, base).text).toMatch(/by product, by day, by salesperson, pivoted, 3 pages/);
    expect(replyFor({ ...c, region: 'ne', q4: true, year: 2025, one: true }, 6, base).text).toBe(`Q4 2025 Northeast Net Sales, Sales (Certified): ${WIN_FIGURE}.`);
    expect(replyFor({ ...c, region: 'ne', q4: true, year: 2019, one: true }, 6, base).text).toMatch(/assumed 2025/);
  });
  it('hints: soft, then explicit on the third reply', () => {
    expect(replyFor({ model: 'certified' }, 2, base).hint).toBe('Try: net sales.');
    expect(replyFor({ model: 'certified' }, 2, { ...base, nth: 3 }).hint).toBe('Say: NET SALES.');
  });
  it('please', () => expect(replyFor({}, 1, { ...base, polite: true }).text).toMatch(/You're welcome!$/));
});

describe('in the pane: accumulation', () => {
  const at = (cmds: string[]) => { let s = { ...newGame(WORLD, 5), room: 'copilot.pane', flags: { 'sq.return': 1 } }; const rs = []; for (const c of cmds) { const r = step(s, c, WORLD); s = r.state; rs.push(r); } return { s, rs }; };
  it('one piece at a time, in any order, ends in the win', () => {
    const { s, rs } = at(['show me sales', 'use the certified model', 'net sales', 'for the northeast', 'q4 2025', 'just the total']);
    expect(rs.map((r) => r.stepId)).toEqual(['copilot.stage.1', 'copilot.stage.2', 'copilot.stage.3', 'copilot.stage.4', 'copilot.stage.5', 'copilot.win']);
    expect(s.bonus).toBe(25); expect(s.room).toBe('village.square');
  });
  it('any order: the reply is for the first missing slot', () => {
    const { rs } = at(['just the total for q4 2025', 'northeast net sales', 'certified']);
    expect(rs[0]!.stepId).toBe('copilot.stage.1');
    expect(rs[1]!.stepId).toBe('copilot.stage.1');
    expect(rs[2]!.stepId).toBe('copilot.win');
  });
  it('a wrong model is used happily until the certified one is named', () => {
    const { rs } = at(['sales from sales_test_do_not_use', 'net sales northeast q4 2025 total', 'the certified one']);
    expect(rs[0]!.output[0]).toMatch(/\$12\. The sign said not to/);
    expect(rs[1]!.output[0]).toMatch(/\$12/);
    expect(rs[2]!.stepId).toBe('copilot.win');
  });
  it('a wrong measure keeps the slot until net sales', () => {
    const { rs } = at(['certified sales amount', 'northeast', 'net sales']);
    expect(rs[1]!.output[0]).toMatch(/includes Returns/);
    // "northeast" was remembered while the measure was still wrong, so once the measure is right the period is what is missing.
    expect(rs[2]!.stepId).toBe('copilot.stage.4');
    expect(rs[2]!.output[0]).toMatch(/\[Understood: model = Sales \(Certified\) · measure = Net Sales · region = Northeast\]/);
  });
  it('a prompt that adds nothing gets the consistency line plus the hint; the third reply at a stage is explicit', () => {
    const { rs } = at(['certified sales', 'certified sales again please', 'certified please']);
    expect(rs[1]!.output[0]).toMatch(/I am consistent/);
    expect(rs[2]!.output[0]).toMatch(/Say: NET SALES\./);
  });
  it('start over forgets everything', () => {
    const { rs, s } = at(['certified net sales northeast', 'start over', 'q4 2025 just the total']);
    expect(rs[1]!.output[0]).toBe("New chat. I remember nothing. It's my best feature.");
    expect(rs[2]!.stepId).toBe('copilot.stage.1');
    expect(s.flags['copilot.model']).toBe(0);
  });
  it('a single perfect prompt still wins in one turn; re-win has no cha-ching', () => {
    const win = 'total q4 2025 northeast net sales from the certified model, just the number';
    const { rs } = at([win]);
    expect(rs[0]!.stepId).toBe('copilot.win'); expect(rs[0]!.sfx).toBe('bonus');
    const again = at([win, 'copilot', win]).rs[2]!;
    expect(again.stepId).toBe('copilot.win-again'); expect(again.sfx).not.toBe('bonus');
  });
  it('the context line lists what it understood', () => {
    const { rs } = at(['certified net sales']);
    expect(rs[0]!.output[0]).toMatch(/\[Understood: model = Sales \(Certified\) · measure = Net Sales\]/);
  });
  it('the first-time flask hint says how to start, and goal does not repeat itself', () => {
    expect(at(['get ye flask']).rs[0]!.output[0]).toMatch(/Say SALES and answer its questions one at a time/);
    const goal = at(['goal']).rs[0]!.output[0]!;
    expect(goal).toMatch(/^Get one number out of Copilot/); expect(goal).toMatch(/Say SALES and answer its questions/);
    expect(goal.match(/Q4 2025 Northeast net sales/g)).toHaveLength(1);
    expect(goal.match(/show you everything/g)).toHaveLength(1); // the card says it; the hint does not say it again
  });
  it('after start over, look and the flask read as a fresh chat', () => {
    const { rs } = at(['certified net sales', 'start over', 'look', 'get ye flask']);
    expect(rs[2]!.output[0]).toMatch(/is empty\. It is waiting for you/);
    expect(rs[3]!.output[0]).toMatch(/Say SALES and answer its questions/);
  });
  it('the consistency line only when it really is the same answer (the tables at a stage are a different one)', () => {
    const { rs } = at(['the certified one', 'show me the tables', 'the sales table', 'the sales metric']);
    expect(rs[1]!.output[0]).toMatch(/The Sales table has 400 rows/); expect(rs[1]!.output[0]).not.toMatch(/I am consistent/);
    expect(rs[2]!.output[0]).toMatch(/I am consistent/);
    expect(rs[3]!.output[0]).toMatch(/6 measures/); expect(rs[3]!.output[0]).not.toMatch(/I am consistent/);
  });
  it('following the hint literally is not frustration: "just the total" wins without the feedback line', () => {
    const { rs } = at(['certified net sales northeast q4 2025', 'just the total']);
    expect(rs[1]!.stepId).toBe('copilot.win');
    expect(rs[1]!.output[0]).not.toMatch(/frustration/);
    expect(at(['please just show me sales']).rs[0]!.output[0]).toMatch(/logged it as feedback/);
  });
  it('the slots survive leaving and coming back; the goal card still shows on re-entry', () => {
    const { rs } = at(['certified net sales northeast', 'exit', 'copilot', 'q4 2025 just the total']);
    expect(rs[1]!.state.room).toBe('village.square');
    expect(rs[2]!.box).toMatch(/^COPILOT — /);
    expect(rs[3]!.stepId).toBe('copilot.win');
  });
});

describe('fix round 1: the chat remembers it is about sales (I1); clear words; net alone (m2, m3)', () => {
  const at = (cmds: string[]) => { let s = { ...newGame(WORLD, 5), room: 'copilot.pane', flags: { 'sq.return': 1 } }; const rs = []; for (const c of cmds) { const r = step(s, c, WORLD); s = r.state; rs.push(r); } return { s, rs }; };
  it('show me sales → show me the tables is the 14-table list at the model stage, not the top-5 things', () => {
    const { rs } = at(['show me sales', 'show me the tables']);
    expect(rs[1]!.stepId).toBe('copilot.stage.1'); expect(rs[1]!.output[0]).toMatch(/14 tables/);
    expect(rs[1]!.output[0]).not.toMatch(/top 5 things/); expect(rs[1]!.state.flags['copilot.stage.n']).toBe(2);
  });
  it('which one / which one is best stay at the model stage and keep counting toward the explicit hint', () => {
    const { rs } = at(['show me sales', 'which one', 'which one is best']);
    expect(rs.map((r) => r.stepId)).toEqual(['copilot.stage.1', 'copilot.stage.1', 'copilot.stage.1']);
    expect(rs[1]!.output[0]).toMatch(/3 semantic models/); expect(rs[2]!.output[0]).toMatch(/Say: THE CERTIFIED MODEL\./);
  });
  it('the one with the badge / the endorsed one / the gold one / the first one name Sales (Certified) at the model stage', () => {
    for (const answer of ['the one with the badge', 'the endorsed one', 'the gold one', 'the first one', 'first', 'option 1']) {
      const { rs } = at(['show me sales', answer]);
      expect(rs[1]!.stepId, answer).toBe('copilot.stage.2');
      expect(rs[1]!.output[0], answer).toMatch(/\[Understood: model = Sales \(Certified\)\]/);
    }
    expect(at(['show me sales', 'the not endorsed one']).rs[1]!.output[0]).toMatch(/Sales_v3_FINAL_final2/);
    expect(at(['show me sales', 'the second one']).rs[1]!.output[0]).toMatch(/Sales_v3_FINAL_final2/);
    expect(at(['show me sales', 'the third one']).rs[1]!.output[0]).toMatch(/\$12/);
  });
  it('an ordinal answers the list of the stage it was asked at: the second one at the measure stage is Net Sales', () => {
    const { rs } = at(['the certified model', 'the second one']);
    expect(rs[1]!.stepId).toBe('copilot.stage.3');
    expect(at(['the certified model', 'the first one']).rs[1]!.output[0]).toMatch(/includes Returns/);
    // an ordinal before any list has been read out means nothing
    expect(parseSlots('the first one').slots).toEqual({});
  });
  it('start over still returns to stage 0 (a cleared chat has forgotten it was about sales)', () => {
    const { rs } = at(['show me sales', 'start over', 'hello']);
    expect(rs[2]!.stepId).toBe('copilot.stage.0');
  });
  it('net alone, summarize / summarise / sum it up, last quarter (m3)', () => {
    expect(parseSlots('net').slots.measure).toBe('net');
    expect(parseSlots('the net one').slots.measure).toBe('net');
    expect(parseSlots('summarize').slots.one).toBe(true);
    expect(parseSlots('summarise it').slots.one).toBe(true);
    expect(parseSlots('sum it up').slots.one).toBe(true);
    expect(parseSlots('last quarter of 2025').slots).toMatchObject({ q4: true, year: 2025 });
    expect(at(['certified sales', 'net']).rs[1]!.stepId).toBe('copilot.stage.3');
  });
  it('more clear words (m2)', () => {
    for (const c of ['clear chat', 'clear the chat', 'start a new chat', 'start again', 'new conversation', "let's start over", 'lets start over', 'forget everything', 'reset', 'new chat']) {
      const { rs } = at(['certified net sales', c]);
      expect(rs[1]!.stepId, c).toBe('copilot.clear'); expect(rs[1]!.state.flags['copilot.model'], c).toBe(0);
    }
  });
  it('restart the chat / restart chat / restart this conversation / restart copilot clear the chat and never restart the run', () => {
    for (const c of ['restart the chat', 'restart chat', 'restart this conversation', 'restart copilot']) {
      for (const room of ['copilot.pane', 'copilot.gallery']) {
        const s = { ...newGame(WORLD, 5), room, flags: { 'sq.return': 1, 'copilot.model': 1, 'copilot.stage': 2 } };
        const r = step(s, c, WORLD);
        expect(r.stepId, `${c} in ${room}`).toBe('copilot.clear');
        expect(r.outcome, `${c} in ${room}`).not.toBe('meta');
        expect(r.state.flags['copilot.model'], c).toBe(0); expect(r.state.room).toBe(room);
      }
    }
  });
  it('new chat works from the gallery too (the restart question points at it)', () => {
    const { rs } = at(['certified net sales', 'e', 'new chat', 'w', 'look']);
    expect(rs[2]!.stepId).toBe('copilot.clear'); expect(rs[2]!.state.room).toBe('copilot.gallery');
    expect(rs[4]!.output[0]).toMatch(/is empty\. It is waiting for you/);
  });
});
