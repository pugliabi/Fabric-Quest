// tests/voice-sweep-governance.test.ts
import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import type { GameState } from '../src/engine/types';
import { WORLD } from '../src/world';
import { FLIP_BACK } from '../src/world/sacristy';
import { MALAPROPS } from '../src/world/voice';

const one = (room: string, cmd: string, flags: Record<string, boolean | number> = {}) => step({ ...newGame(WORLD, 3), room, flags }, cmd, WORLD).output[0]!;
const run = (room: string, cmds: string[], flags: Record<string, boolean | number> = {}) => {
  let s: GameState = { ...newGame(WORLD, 3), room, flags };
  const outs: string[] = [];
  for (const c of cmds) { const r = step(s, c, WORLD); s = r.state; outs.push(r.output[0]!); }
  return { s, outs };
};

describe('governance rooms sweep', () => {
  it('the Sacristy', () => {
    expect(one('monastery.sacristy', 'use shelf')).toBe("You run a finger along the spines. Every one is a switch. Every switch is someone's Tuesday.");
    expect(one('monastery.sacristy', 'use ledger')).toBe(`You open the Capacity Ledger to a random page. It says F2. Not enough ${MALAPROPS.capacitude}. It closes itself.`);
    expect(one('monastery.sacristy', 'sit')).toBe("You sit on the stair. An admin did this once, in 2019, meaning to go back up. She's a monk now.");
    expect(one('monastery.sacristy', 'talk to export')).toBe('The book does not talk. It has a switch, not a mouth. You have that backwards.');
    expect(one('monastery.sacristy', 'say dax')).toBe(`You say 'DAX' in the Admin Portal. Nothing here is ${MALAPROPS.daxxed}. Nothing here is even a measure. It is all switches.`);
  });
  it('the Town Hall', () => {
    expect(one('village.hall', 'ask clerk about the sacristy')).toBe("'The Sacristy,' says the Clerk. 'Up from the Cloister. I've never been. I put in a ticket to go. It's an admin setting.'");
    expect(one('village.hall', 'take a number')).toBe('You take a number. It is 1. The Clerk calls 1. It is an admin setting.');
    expect(one('village.hall', 'climb the counter')).toBe("You climb the counter. The Clerk does not look up. 'That's an admin setting.' It is.");
    expect(one('village.hall', 'use counter')).toMatch(new RegExp(`The form has been ${MALAPROPS.refreshered} since you last looked; it is still blank\\.$`));
  });
  it('My Workspace', () => {
    expect(one('village.cottage', 'use eventhouse', { 'ts.monitoring': true })).toBe("You query the Eventhouse. It returns every command you've typed, with timestamps. You close it before turn 12.");
    expect(one('village.cottage', 'rename workspace')).toBe('You rename My Workspace to My Workspace (2). It was always going to be that.');
    expect(one('village.cottage', 'share workspace')).toBe("You share My Workspace. There's nobody to share it with. The dialog suggests Jeff.");
    expect(one('village.cottage', 'look at window')).toMatch(/Through the window, past the square, a hill\. Green\. Rolling\. Somebody set it as a wallpaper once\./);
    expect(one('village.cottage', 'look at report')).toMatch(/Built with Dataflows Gen1 Classic\.$/);
  });
});

describe('governance rooms sweep: the second looks and the repeats', () => {
  it('the Sacristy scenery answers a second and a third look', () => {
    for (const noun of ['sign', 'lectern']) {
      const { outs } = run('monastery.sacristy', [`look at ${noun}`, `look at ${noun}`, `look at ${noun}`]);
      expect(new Set(outs).size, noun).toBe(3);
    }
    const stair = run('monastery.sacristy', ['look at stair', 'look at stair']).outs;
    expect(stair[0]).toContain('down to the Cloister'); expect(stair[1]).toMatch(/one way and admits it/);
    const shelf = run('monastery.sacristy', ['look at bookshelf', 'look at bookshelf']).outs;
    expect(shelf[1]).toContain('[ON ] Export to Excel'); expect(shelf[1]).toMatch(/labeled UNDO\.$/);
    const list = run('monastery.sacristy', ['settings', 'settings']).outs;
    expect(list[0]).not.toMatch(/one turn older/); expect(list[1]).toMatch(/^TENANT SETTINGS\n[\s\S]*Nothing in here flips itself\. That is what you are for\.$/);
  });
  it('the lectern is furniture you can use', () => {
    expect(one('monastery.sacristy', 'use lectern')).toMatch(/Nobody ever comes to the capacity plan\.$/);
  });
  it('a book flipped back to its default is noted by the audit log, unless the restore pays', () => {
    const r = run('monastery.sacristy', ['turn off export', 'turn off copilot', 'turn on export']);
    expect(r.outs[2]).toContain(FLIP_BACK);
    expect(r.outs[0]).not.toContain(FLIP_BACK);
    const paid = run('monastery.sacristy', ['turn off export', 'turn on export']);
    expect(paid.outs[1]).toContain('+5 for governance'); expect(paid.outs[1]).not.toContain(FLIP_BACK);
  });
  it('the Town Hall scenery answers a second look', () => {
    for (const noun of ['bell', 'poster', 'rope', 'counter']) {
      const { outs } = run('village.hall', [`look at ${noun}`, `look at ${noun}`]);
      expect(outs[1], noun).not.toBe(outs[0]);
    }
    expect(run('village.hall', ['look at poster', 'look at poster', 'look at poster']).outs[2]).toBe('Same poster. Framed posters do not get release notes.');
  });
  it('the Clerk derails on the ticket, and the ticket status is In Progress', () => {
    expect(one('village.hall', 'ask clerk about ticket')).toMatch(/You haven't filed it\. 'That's an admin setting\.'$/);
    expect(one('village.hall', 'ask clerk about ticket', { 'hall.ticket': true })).toMatch(/'Is it you\?' 'In Progress\.'$/);
    expect(one('village.hall', 'check ticket')).toMatch(/In Progress anyway\. It came that way\.$/);
    const status = run('village.hall', ['check ticket', 'check ticket'], { 'hall.ticket': true }).outs;
    expect(status[0]).toMatch(/newer timestamp/); expect(status[1]).toContain(MALAPROPS.refreshered);
    expect(run('village.hall', ['take a number', 'take a number']).outs[1]).toMatch(/duplicate ticket\.$/);
  });
  it('My Workspace: the menu asked twice, the Eventhouse queried twice, looked at three times', () => {
    const menu = run('village.cottage', ['publish', 'publish']).outs;
    expect(menu[0]).toBe('Publish to which workspace? · My Workspace · The entire internet');
    expect(menu[1]).toBe('Publish to which workspace? · My Workspace · The entire internet\nThe list has not grown while you were thinking. It never does.');
    const eh = run('village.cottage', ['use eventhouse', 'use eventhouse'], { 'ts.monitoring': true }).outs;
    expect(eh[1]).toMatch(/The newest row is you, querying it\./);
    expect(run('village.cottage', ['look at eventhouse', 'look at eventhouse', 'look at eventhouse'], { 'ts.monitoring': true }).outs[2]).toMatch(/most engaged user/);
  });
});
