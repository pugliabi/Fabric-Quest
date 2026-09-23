// tests/sidequest-onboarding.test.ts
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { noticeFor } from '../src/game/notice';
import { GOAL, MAIN_GOAL } from '../src/world/sidequests';

const from = (room: string) => ({ ...newGame(WORLD, 3), room });

describe('goal card on entry (spec2 §2.1, spec1 §2.1–2.2)', () => {
  it('entering Excel sets box to the goal, every time', () => {
    const a = step(from('village.square'), 'show me a table', WORLD);
    expect(a.box).toBe(`${GOAL.excel.header} — ${GOAL.excel.body}`);
    expect(a.box).toMatch(/^JEFF'S EXCEL — Jeff's export says \$4\.7M\./);
    const out = step(a.state, 'exit', WORLD);
    const b = step(out.state, 'show me a table', WORLD);
    expect(b.box).toBe(a.box);
  });
  it('entering Copilot sets the Copilot goal, also with a prompt on the way in', () => {
    expect(step(from('village.square'), 'copilot', WORLD).box).toMatch(/^COPILOT — Get one number out of Copilot/);
    expect(step(from('village.square'), 'ask copilot for sales', WORLD).box).toMatch(/^COPILOT — /);
  });
  it('the message box shows the goal before the entrance quip', () => {
    const s = from('village.square');
    const r = step(s, 'show me a table', WORLD);
    const n = noticeFor(r, s, WORLD)!.text;
    expect(n.startsWith(r.box!)).toBe(true);
    expect(n).toContain(r.notice!);
  });
});

describe('goal / objective', () => {
  it('inside a realm: the body plus the room hint', () => {
    const inn = step(from('village.square'), 'show me a table', WORLD).state;
    for (const c of ['goal', 'objective', 'what do i do', 'what am i doing', 'what is the goal', 'why am i here']) {
      const out = step(inn, c, WORLD).output[0]!;
      expect(out, c).toContain(GOAL.excel.body);
      expect(out, c).toContain(WORLD.rooms['excel.sheet1']!.flaskHint(inn));
    }
    const pane = step(from('village.square'), 'copilot', WORLD).state;
    expect(step(pane, 'goal', WORLD).output[0]).toContain(GOAL.copilot.body);
  });
  it('outside: the main-quest line', () => {
    expect(step(from('village.mill'), 'goal', WORLD).output[0]).toBe(MAIN_GOAL);
    expect(step(from('village.mill'), 'what do i do', WORLD).output[0]).toBe(MAIN_GOAL);
  });
  it('help in a realm ends with GOAL and GET YE FLASK', () => {
    const inn = step(from('village.square'), 'show me a table', WORLD).state;
    const out = step(inn, 'help', WORLD).output;
    expect(out[out.length - 1]).toBe("Type EXIT to leave Jeff's Excel; you return where you were. GOAL repeats the objective; GET YE FLASK says the next step.");
  });
  it('the notice board mentions Copilot', () => {
    expect(step(from('village.square'), 'read board', WORLD).output[0]).toContain('Copilot is available in this tenant. Ask it about sales at your own risk.');
  });
});
