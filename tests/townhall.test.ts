import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { talkTo } from '../src/engine/builtins';
import { WORLD } from '../src/world';
import { BRUSHOFFS } from '../src/world/voice';
import type { GameState } from '../src/engine/types';

const run = (cmds: string[], room = 'village.square') => {
  let s: GameState = { ...newGame(WORLD, 5), room };
  const outs: string[] = [];
  for (const c of cmds) { const r = step(s, c, WORLD); s = r.state; outs.push(r.output.join('\n')); }
  return { s, outs };
};

describe('the Town Hall (spec2 §6)', () => {
  it('is up the steps (u, in) and down/out again', () => {
    expect(run(['u']).s.room).toBe('village.hall');
    expect(run(['in']).s.room).toBe('village.hall');
    expect(run(['d'], 'village.hall').s.room).toBe('village.square');
    expect(run(['out'], 'village.hall').s.room).toBe('village.square');
    expect(run(['look']).outs[0]).toContain('The Town Hall is up the steps.');
    expect(WORLD.rooms['village.hall']!.enterQuip!(newGame(WORLD, 1))).toBe('Take a number. There is one number. It is 1.');
  });
  it('the clerk rotates and, fourth time, points at the Sacristy', () => {
    const { outs } = run(['talk to clerk', 'talk to clerk', 'talk to clerk', 'talk to clerk', 'talk to clerk'], 'village.hall');
    expect(outs.slice(0, 3)).toEqual(["That's an admin setting.", 'That would be an admin setting.', 'Admin setting. Next.']);
    expect(outs[3]).toBe('…the admins are at the Monastery. Up the stair from the Cloister. In the Sacristy. They do not come out, and they do not answer tickets.');
    expect(outs[4]).toMatch(/admin setting/i);
  });
  it('ask about anything, give anything, say anything', () => {
    const { outs } = run(['ask clerk about the dragon', 'give license to clerk', 'say hello'], 'village.hall');
    expect(outs[0]).toBe("That's an admin setting.");
    expect(outs[1]).toBe("That's an admin setting.");
    expect(outs[2]).toBe("Noted. That's an admin setting.");
  });
  it('the ticket escalates', () => {
    const { s, outs } = run(['look at ticket', 'get ticket', 'give ticket to clerk', 'talk to clerk'], 'village.hall');
    expect(outs[0]).toBe("SEV-3: 'report is wrong'. No further details.");
    expect(outs[2]).toBe('Your ticket has been escalated. Estimated response: three business dragons.');
    expect(s.inventory).not.toContain('ticket'); expect(s.flags['hall.ticket']).toBe(true); expect(s.score).toBe(0); expect(s.bonus).toBe(0);
    expect(outs[3]).toContain('Your ticket is In Progress. It has been In Progress since you left.');
  });
  it('the bell, the poster, the rope, the counter', () => {
    const { outs } = run(['ring bell', 'use bell', 'read poster', 'use rope', 'use counter'], 'village.hall');
    expect(outs[0]).toBe("The clerk looks up. 'That's an admin setting.'");
    expect(outs[1]).toBe(outs[0]);
    expect(outs[2]).toBe('TENANT SETTINGS ARE NOT A SECURITY MEASURE. — the Learn docs, on the wall, in a frame.');
    expect(outs[3]).toMatch(/queue/); expect(outs[4]).toMatch(/form/);
  });
  it('the flask hint', () => {
    expect(WORLD.rooms['village.hall']!.flaskHint(newGame(WORLD, 1))).toBe('Nothing to win here. The clerk will tell you where the admins are if you keep talking.');
  });
});

describe('the Town Hall: the extras', () => {
  it('the steps are a phrase from both ends, and "enter the town hall" works too', () => {
    for (const c of ['climb the steps', 'up the steps', 'go up the steps', 'enter the town hall', 'go to the town hall', 'climb stairs']) expect(run([c]).s.room, c).toBe('village.hall');
    for (const c of ['climb down the steps', 'down the steps', 'take the steps', 'leave the town hall']) expect(run([c], 'village.hall').s.room, c).toBe('village.square');
    // "up" from the Hall is a ceiling: the narrator corrects it and takes you down anyway.
    const up = run(['climb up the steps'], 'village.hall');
    expect(up.s.room).toBe('village.square'); expect(up.outs[0]).toMatch(/^The steps go down from here/);
  });
  it('talk 5 and up never repeat the talk before, whatever turn it is (the npc-talk harness)', () => {
    const clerk = WORLD.npcs['clerk']!;
    for (const turns of [10, 11, 12, 13]) {
      let prev = '';
      for (let n = 1; n <= 9; n++) {
        const s: GameState = { ...newGame(WORLD, 4), room: 'village.hall', turns, flags: { [`talk.clerk`]: n - 1 } };
        const line = talkTo(s, WORLD, clerk);
        expect(line, `n=${n} turns=${turns}`).not.toBe(prev);
        expect(line, `n=${n} turns=${turns}`).toMatch(/admin setting|Sacristy/i);
        prev = line;
      }
    }
    expect(clerk.brushOff).toBe(BRUSHOFFS.clerk);
    expect(clerk.knows).toBeUndefined(); // one sentence, forever: no topic gets a different answer
  });
  it('the ticket on the counter is not yours to give yet; after the escalation the clerk keeps the gimmick', () => {
    const { outs } = run(['give ticket to clerk'], 'village.hall');
    expect(outs[0]).toMatch(/Pick it up first/);
    const after = run(['get ticket', 'give ticket to clerk', 'give ticket to clerk', 'ring bell', 'look at counter'], 'village.hall');
    expect(after.outs[2]!.split('\n')[0]).toBe("That's an admin setting."); // the second line is the engine's repeat chirp
    expect(after.outs[3]).toContain("The clerk looks up. 'That's an admin setting.'");
    expect(after.outs[3]).toContain('In Progress');
    expect(after.outs[4]).toMatch(/where a ticket was/);
  });
  it('the scenery answers get/look and the ticket is the only thing you can take', () => {
    const { outs } = run(['get bell', 'get poster', 'get rope', 'get counter', 'look at clerk', 'look at rope'], 'village.hall');
    expect(outs[0]).toMatch(/screwed to the counter/); expect(outs[1]).toMatch(/frame/); expect(outs[2]).toMatch(/queue/); expect(outs[3]).toMatch(/Clerk/);
    expect(outs[4]).toMatch(/ADMIN SETTING/); expect(outs[5]).toMatch(/Nobody in it/);
  });
  it('is appended at the end of the rooms record, so no existing room index moved', () => {
    const ids = Object.keys(WORLD.rooms);
    expect(ids[ids.length - 1]).toBe('village.hall');
    expect(ids.indexOf('monastery.sacristy')).toBe(ids.indexOf('monastery.library') + 1);
  });
  it('nothing here scores', () => {
    const hall = WORLD.rooms['village.hall']!;
    for (const r of hall.rules) { expect(r.then.points, r.id).toBeUndefined(); expect(r.then.bonus, r.id).toBeUndefined(); }
  });
});
