// Spec1 §4.2: Power Query Hall reads as seven Applied Steps, in order. The puzzle itself (applying them, +10) is spec2 §8 / Task E6.
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { APPLIED_STEP_PHRASES, STEPS, STEP_COMMANDS, stepsList } from '../src/world/applied-steps';

const hall = (flags: Record<string, boolean | number> = {}) => ({ ...newGame(WORLD, 6), room: 'fortress.hall', flags });

describe('Power Query Hall reads as seven steps (spec1 §4.2)', () => {
  it('the room text lists the seven, in order, and says the first is waiting', () => {
    const out = step(hall(), 'look', WORLD).output[0]!;
    expect(out).toContain('Seven doorways in a row, each an Applied Step: Source, Navigation, Promoted Headers, Changed Type, Filtered Rows, Removed Other Columns, Renamed Columns.');
    expect(out).toContain('The first is waiting. The rest are yellow — you apply them in order, or the hall errors.');
    expect(WORLD.rooms['fortress.hall']!.enterQuip!(hall())).toBe("Seven steps. In order. That's the whole idea of a query.");
  });
  it('mid-chain, the applied ones are open and the next one waits: number words, and no "rest" at the last door', () => {
    expect(step(hall({ 'pq.step': 1 }), 'look', WORLD).output[0]).toContain('The first is open; the next is waiting. The rest are yellow — you apply them in order, or the hall errors.');
    expect(step(hall({ 'pq.step': 3 }), 'look', WORLD).output[0]).toContain('The first three are open; the next is waiting. The rest are yellow');
    expect(step(hall({ 'pq.step': 5 }), 'look', WORLD).output[0]).toContain('The first five are open; the next is waiting. The rest are yellow');
    const last = step(hall({ 'pq.step': 6 }), 'look', WORLD).output[0]!;
    expect(last).toContain('Six are open; the last is waiting. Nothing is yellow, and the hall does not know what to do with itself.');
    expect(last).not.toMatch(/The rest are yellow/);
    for (const k of [1, 2, 3, 4, 5, 6]) expect(step(hall({ 'pq.step': k }), 'look', WORLD).output[0], `k=${k}`).not.toMatch(/\b\d\b/);
  });
  it('after pq.done the doors are all open', () => {
    expect(step(hall({ 'pq.step': 7, 'pq.done': true }), 'look', WORLD).output[0]).toContain('All seven are open. The hall is a query again.');
  });
  it('stepsList shows the state in the hall\'s one vocabulary: ticks are open, the cross is waiting, the rest are yellow', () => {
    expect(stepsList(hall())).toBe('✗ Source (waiting) · yellow: Navigation, Promoted Headers, Changed Type, Filtered Rows, Removed Other Columns, Renamed Columns');
    expect(stepsList(hall({ 'pq.step': 3 }))).toBe('✓ Source ✓ Navigation ✓ Promoted Headers ✗ Changed Type (waiting) · yellow: Filtered Rows, Removed Other Columns, Renamed Columns');
    expect(stepsList(hall({ 'pq.step': 6 }))).toBe('✓ Source ✓ Navigation ✓ Promoted Headers ✓ Changed Type ✓ Filtered Rows ✓ Removed Other Columns ✗ Renamed Columns (waiting)');
    expect(stepsList(hall({ 'pq.step': 7, 'pq.done': true }))).toBe(STEPS.map((n) => `✓ ${n}`).join(' '));
    expect(step(hall({ 'pq.step': 3 }), 'look at steps', WORLD).output[0]).toContain('✗ Changed Type (waiting)');
  });
  it('the room text, the doorways and the list all speak the same vocabulary (open / waiting / yellow)', () => {
    const s = hall({ 'pq.step': 3 });
    const doorways = step(s, 'look at doorways', WORLD).output[0]!;
    expect(doorways).toContain('✗ Changed Type (waiting) · yellow: Filtered Rows');
    expect(doorways).toContain('Open means applied. Waiting means next, where the query stopped. Yellow means not yet, and Power Query means it.');
    expect(step(s, 'look', WORLD).output[0]).toContain('open; the next is waiting. The rest are yellow');
    expect(step(s, 'use doorways', WORLD).output.join(' ')).not.toMatch(/The yellow one stops you/);
  });
  it('the door pokes are per step: open behind you, waiting next (with `apply`), yellow beyond (with `apply` for the waiting one)', () => {
    expect(step(hall(), 'open filtered rows door', WORLD).output[0]).toBe("You try the Filtered Rows door. It's yellow. Source first: `apply source`.");
    expect(step(hall({ 'pq.step': 3 }), 'go through filtered rows', WORLD).output[0]).toBe("You try the Filtered Rows door. It's yellow. Changed Type first: `apply changed type`.");
    expect(step(hall({ 'pq.step': 3 }), 'enter changed type', WORLD).output[0]).toBe("The Changed Type door is waiting; it's next. `change type` or `apply changed type`.");
    expect(step(hall({ 'pq.step': 3 }), 'push source door', WORLD).output[0]).toBe("The Source door is open. You walk through it. Nothing happens; it's applied.");
    expect(step(hall({ 'pq.step': 7, 'pq.done': true }), 'open renamed columns', WORLD).output[0]).toMatch(/refreshes behind you: 4\.2M/);
    // What the poke names is a command that works, at every step.
    for (let k = 0; k < 7; k++) {
      const poke = step(hall({ 'pq.step': k }), `open ${STEPS[k]!.toLowerCase()} door`, WORLD).output[0]!;
      const named = /`apply ([a-z ]+)`\.$/.exec(poke)?.[1];
      expect(named, poke).toBe(STEPS[k]!.toLowerCase());
      expect(step(hall({ 'pq.step': k }), `apply ${named}`, WORLD).state.flags['pq.step'], `apply ${named}`).toBe(k + 1);
    }
  });
});

describe('the hall around the steps', () => {
  it('every step name can be looked at, and answers with the state list', () => {
    for (const name of STEPS) {
      const out = step(hall({ 'pq.step': 2 }), `look at ${name.toLowerCase()}`, WORLD).output[0]!;
      expect(out, name).toContain('✗ Promoted Headers (waiting)');
    }
    expect(step(hall(), 'look at doorways', WORLD).output[0]).toContain('✗ Source (waiting)');
    expect(step(hall(), 'look at portraits', WORLD).output[0]).toMatch(/^Portraits of the founding steps\./);
  });
  it('`use <step>` and the plainer walking verbs are door pokes too', () => {
    expect(step(hall({ 'pq.step': 3 }), 'use changed type', WORLD).output[0]).toBe("The Changed Type door is waiting; it's next. `change type` or `apply changed type`.");
    expect(step(hall(), 'walk into the navigation doorway', WORLD).output[0]).toBe("You try the Navigation door. It's yellow. Source first: `apply source`.");
    expect(step(hall({ 'pq.step': 1 }), 'step through source', WORLD).output[0]).toBe("The Source door is open. You walk through it. Nothing happens; it's applied.");
    expect(step(hall(), 'knock on the promoted headers door', WORLD).output[0]).toBe("You try the Promoted Headers door. It's yellow. Source first: `apply source`.");
  });
  it('the door pokes are room-scoped and never claim a step command (the step commands follow them in the list)', () => {
    const door = APPLIED_STEP_PHRASES.find((p) => p.id === 'hall.door')!;
    expect(door.room).toBe('fortress.hall');
    expect(APPLIED_STEP_PHRASES.indexOf(door)).toBe(0);
    const stepCmds = APPLIED_STEP_PHRASES.filter((p) => p.id.startsWith('pq.cmd.'));
    expect(stepCmds).toHaveLength(7);
    for (const c of STEP_COMMANDS) expect(door.test.test(c), c).toBe(false);
    // Every spelling a step command accepts, and none of them is a door poke. `apply [the] <step> [step]` for all seven (fix round 1, I1).
    const SPELLINGS = ['add source', 'get data', 'apply source', 'apply the source', 'navigation', 'apply navigation', 'pick table', 'pick a table', 'pick the table',
      'promoted headers', 'use first row as headers', 'promote the headers', 'changed type', 'detect type', 'detect data type', 'change types',
      'filtered rows', 'filter', 'filter the rows', 'removed other columns', 'remove columns', 'remove the other columns', 'renamed columns', 'rename', 'rename the columns',
      ...STEPS.flatMap((n) => [`apply ${n.toLowerCase()}`, `apply the ${n.toLowerCase()}`, `apply the ${n.toLowerCase()} step`, `apply ${n.toLowerCase()} step`]),
      ...STEP_COMMANDS.map((c) => `apply ${c}`)];
    for (const c of [...STEP_COMMANDS, ...SPELLINGS]) {
      expect(door.test.test(c), c).toBe(false);
      expect(stepCmds.some((p) => p.test.test(c)), c).toBe(true);
    }
    // And the other way round: a door poke is never a step command, so `use changed type` pokes and `changed type` applies.
    for (const c of ['open source door', 'use changed type', 'walk into the navigation doorway', 'knock on the promoted headers door', 'go through filtered rows']) {
      expect(door.test.test(c), c).toBe(true);
      expect(stepCmds.some((p) => p.test.test(c)), c).toBe(false);
    }
    expect(step({ ...newGame(WORLD, 6), room: 'fortress.bridge' }, 'open source door', WORLD).output[0]).not.toMatch(/Source door/);
  });
  it('the Advanced Editor still owns the bare door, and the steps still answer use/get', () => {
    expect(step(hall(), 'open door', WORLD).output[0]).toMatch(/Advanced Editor/);
    expect(step(hall(), 'use steps', WORLD).output[0]).toMatch(/step/i);
    expect(step(hall(), 'get source', WORLD).output[0]).toBe('You try to lift a step. Every step after it turns yellow. You put it back.');
    // Pinned to the pick the F12 pool hash (shuffled bags) makes for this seed and turn.
    expect(step(hall(), 'get doorway', WORLD).output[0]).toBe('You pull a doorway off its hinges. Power Query adds a new one: Changed Type1.');
  });
});
