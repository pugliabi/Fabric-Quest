import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';

const run = (cmds: string[]) => { let s = newGame(WORLD, 7); const outs: string[] = []; let last; for (const c of cmds) { last = step(s, c, WORLD); s = last.state; outs.push(last.output.join('\n')); } return { s, outs, last: last! }; };

describe('god mode settings (spec2 §3.6)', () => {
  it('settings lists both shelves anywhere', () => {
    const { outs } = run(['burninate', 'settings']);
    // The export book prints under its real Admin Portal title (E1: 'Export to Excel'), not the spec's paraphrase 'Users can export data'.
    expect(outs[1]).toContain('TENANT SETTINGS'); expect(outs[1]).toContain('CAPACITY LEDGER'); expect(outs[1]).toContain('[ON ] Export to Excel');
    expect(run(['settings']).outs[0]).not.toContain('TENANT SETTINGS');
  });
  it('set <key> on|off flips the flag with no consequences', () => {
    const { s, outs, last } = run(['burninate', 'set blockinternet on']);
    expect(s.dead).toBe(false); expect(s.flags['ts.blockInternet']).toBe(true); expect(last.stepId).toBe('god.set');
    expect(outs[1]).toBe('Block Public Internet Access: ON. (God mode: no death, no bonus, no 15 minutes.)');
    expect(run(['burninate', 'set xmla off']).s.flags['ts.xmla']).toBe(false);
    expect(run(['burninate', 'set nothing on']).outs[1]).toMatch(/^No such setting: "nothing"/);
    expect(run(['burninate', 'set']).outs[1]).toMatch(/^set <key> on\|off/);
    // Not governance: a god flip never marks the books as touched (E3), so it can neither earn nor spoil the +5 restore.
    expect(run(['burninate', 'set xmla off']).s.flags['gov.touched']).toBeUndefined();
    expect(run(['burninate', 'set xmla off', 'set xmla on']).s.bonus).toBe(0);
    // Only the `set <key> on|off` shape is ours: the Model View's "set it to both" is still Sir Cardinality's.
    const m2m = run(['burninate', 'warp fortress.model', 'set it to both']);
    expect(m2m.last.stepId).toBe('fortress.m2m'); expect(m2m.s.flags['model.m2m']).toBe(true);
  });
  it('locate settings finds the Sacristy; godhelp lists the new commands', () => {
    expect(run(['burninate', 'locate settings']).outs[1]).toContain('monastery.sacristy');
    expect(run(['burninate', 'godhelp']).outs[1]).toMatch(/set <key> on\|off/);
  });
});
