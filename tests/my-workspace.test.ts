import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';

const one = (cmd: string, flags: Record<string, boolean | number> = {}, room = 'village.cottage') => step({ ...newGame(WORLD, 4), room, flags }, cmd, WORLD);

describe('My Workspace (spec2 §7)', () => {
  it('is the cottage, renamed', () => {
    expect(WORLD.rooms['village.cottage']!.name).toBe('My Workspace');
    expect(one('look').output[0]).toMatch(/^MY WORKSPACE\nYour cottage\. My Workspace, officially\. Nobody else can see in\. That is the point, and also the problem\./);
  });
  it('keeps the rest of the cottage: the mug, the door, and the Eventhouse while monitoring is on', () => {
    expect(one('look').output[0]).toContain("One desk, one candle, one report you have been 'about to finish' since spring. A mug sits on the desk. The door is out, to the east.");
    expect(one('look', { 'taken.mug': true }).output[0]).toContain('The desk looks lonely without the mug.');
    expect(one('look', { 'ts.monitoring': true }).output[0]).toContain('A read-only Eventhouse hums in the corner. It is logging this sentence.');
    expect(one('look').output[0]).not.toContain('Eventhouse');
  });
  it('publish offers My Workspace, and the internet while Publish to web is on', () => {
    expect(one('publish').output[0]).toBe('Publish to which workspace? · My Workspace · The entire internet');
    expect(one('publish', { 'ts.publishToWeb': false }).output[0]).toBe('Publish to which workspace? · My Workspace');
    // After the Abbot's errand, OFF is the default (spec2 §5).
    expect(one('publish', { 'gov.errandDone': true }).output[0]).toBe('Publish to which workspace? · My Workspace');
  });
  it.each(['publish report', 'publish the report', 'publish it'])('%s is the same menu', (c) => {
    expect(one(c).output[0]).toBe('Publish to which workspace? · My Workspace · The entire internet');
  });
  it('use report points at publish', () => {
    expect(one('use report').output[0]).toBe('You click Publish. A dialog asks which workspace. There is only one, and you are standing in it. `publish`, if you must.');
  });
  it.each(['say my workspace', 'publish to my workspace', 'my workspace'])('%s publishes to yourself', (c) => {
    const r = one(c);
    expect(r.output[0]).toBe('Published. To yourself. Your report is now available to you, in the workspace you were already in. Success.');
    expect(r.outcome).toBe('snark');
    expect(r.state.dead).toBe(false);
    expect(r.state.score).toBe(0);
  });
  it.each(['the entire internet', 'publish to web', 'publish to the internet'])('%s kills you while on, and thanks the admin while off', (c) => {
    const on = one(c);
    expect(on.state.dead).toBe(true); expect(on.deathCause).toBe('death.publish-web');
    expect(on.output.join(' ')).toContain('You publish to web. The embed code is beautiful. The dragon has your report. So does everyone.');
    expect(on.output.join(' ')).toContain('You published to web. The prophecy said nothing about this, because the prophecy is also on the web now.');
    const off = one(c, { 'ts.publishToWeb': false });
    expect(off.state.dead).toBe(false);
    expect(off.output[0]).toBe('Publish to web is disabled by your administrator. For once, thank them.');
  });
  it('the death ends on the sign-off, once', () => {
    const on = one('publish to web');
    // F2: the blame beat sits between the card line and the sign-off.
    expect(on.output[on.output.length - 1]).toMatch(/on the web now\. The dialog listed two options and you picked the one with the word ENTIRE in it\. You dead\. Refresh failed\.$/);
    expect(on.output.join(' ').match(/You dead\. Refresh failed\./g)).toHaveLength(1);
  });
  it('publish elsewhere', () => {
    expect(one('publish', {}, 'village.square').output[0]).toBe('Publish from where? You are not in Desktop.');
    expect(one('publish', {}, 'monastery.sacristy').output[0]).toBe('Publish from where? You are not in Desktop.');
    expect(one('publish', {}, 'fortress.yard').output[0]).toMatch(/which workspace/); // the Keep keeps its own line
    // The menu's answers mean nothing outside the workspace: no death from the square.
    expect(one('publish to web', {}, 'village.square').state.dead).toBe(false);
    expect(one('my workspace', {}, 'village.square').output[0]).not.toMatch(/Published/);
  });
});
