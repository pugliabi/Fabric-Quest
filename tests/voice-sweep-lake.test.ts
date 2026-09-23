import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
import { MALAPROPS } from '../src/world/voice';

const one = (room: string, cmd: string, inventory: string[] = ['license']) => step({ ...newGame(WORLD, 3), room, inventory }, cmd, WORLD).output[0]!;

describe('lake + swamp sweep', () => {
  it('shore, dock, island, house', () => {
    const r = step({ ...newGame(WORLD, 3), room: 'lake.shore', inventory: ['license', 'pebble'] }, 'throw pebble', WORLD);
    expect(r.output[0]).toMatch(/^Skip\. Skip\. Sink\./); expect(r.state.inventory).not.toContain('pebble');
    expect(one('lake.dock', 'ask ferryman about the lake')).toBe("He mouths: 'ONE.' Then, more slowly: 'LAKE.' He holds up one finger. Then, after thought, no more fingers.");
    expect(one('lake.dock', 'sit in boat')).toBe('You sit in the boat. It does not move. Neither does the Ferryman. You are all OFFLINE together, which is almost company.');
    expect(one('lake.dock', 'look at timetable')).toMatch(/Sponsored by Refreshr™\.$/);
    expect(one('lake.island', 'use plinth')).toBe("You put your hand in the STANDARD hollow. It fits. Everyone fits. That is what shared means. The PERSONAL hollow has no capacitude for that.");
    expect(one('lake.house', 'open mailbox')).toBe('One new CSV. It has been in there since bronze. You leave it; the mailbox is also a Lakehouse, legally.');
    expect(one('lake.house', 'use chair')).toMatch(/It is the Windows XP hill with a deck chair on it\.$/);
  });
  it('bronze, silver, gold', () => {
    expect(one('swamp.bronze', 'name the columns')).toBe('You name Column1. It becomes Column1 (2). The marsh applauds, unstructured.');
    expect(one('swamp.bronze', 'look')).toMatch(/Your first semantic model was one table\. It still is\. It is somewhere under here\./);
    expect(one('swamp.silver', 'use log')).toMatch(/^You open a transaction log\. It knows exactly what happened\. It knows what you did on turn \d+, too, and filed it next to your Hotmail password\.$/);
    expect(one('swamp.silver', 'drink water')).toMatch(new RegExp(`You feel ${MALAPROPS.refreshered}\\.$`));
    expect(one('swamp.gold', 'read signpost')).toBe("SHORTCUT, it says, pointing everywhere at once. Below: 'no data was moved.' Below that, smaller: 'no data was moved.'");
    expect(one('swamp.gold', 'look')).toMatch(new RegExp(`Nothing here has been ${MALAPROPS.daxxed} yet\\. Give it time\\.`));
  });
});

// ---- The sweep beyond the plan's lines ----

import { isScenery } from '../src/engine/builtins';
import { LAKE_PHRASES } from '../src/world/lake';
import { VILLAGE_PHRASES } from '../src/world/village';
import { GATE_PHRASES } from '../src/world/gates';
import { BRUSHOFFS, brushOffLine } from '../src/world/voice';
import { talkTo } from '../src/engine/builtins';
import { WHERE, whereText } from '../src/world/where';
import type { GameState } from '../src/engine/types';

const at = (room: string, extra: Partial<GameState> = {}): GameState => ({ ...newGame(WORLD, 3), room, inventory: ['license'], ...extra });
/** The first line of each turn, and the state after them all. */
const run = (s: GameState, cmds: string[]) => {
  let state = s;
  const firsts: string[] = [];
  const outs: string[][] = [];
  for (const c of cmds) { const r = step(state, c, WORLD); state = r.state; firsts.push(r.output[0]!); outs.push(r.output); }
  return { s: state, firsts, outs };
};
/** The same command twice in a row: both first lines, which must differ, and the second turn carries no generic repeat chirp (Task F4b). */
const twice = (s: GameState, cmd: string): [string, string] => {
  const { firsts, outs } = run(s, [cmd, cmd]);
  expect(firsts[1], cmd).not.toBe(firsts[0]);
  expect(outs[1]!.some((l) => /jaunty little bit|sort of humiliating|great time was had|called consistency|slot machine|Once more, with feeling/.test(l)), `${cmd}: chirp under the second line`).toBe(false);
  return [firsts[0]!, firsts[1]!];
};
const ONLINE = { flags: { 'ferry.online': true } };

describe('lake + swamp sweep: registration and what it must not touch', () => {
  it('LAKE_PHRASES sit right after VILLAGE_PHRASES, ahead of the gates', () => {
    const ids = WORLD.phraseRules.map((p) => p.id);
    const lastVillage = ids.indexOf(VILLAGE_PHRASES[VILLAGE_PHRASES.length - 1]!.id);
    expect(ids.slice(lastVillage + 1, lastVillage + 1 + LAKE_PHRASES.length)).toEqual(LAKE_PHRASES.map((p) => p.id));
    expect(ids.indexOf(LAKE_PHRASES[LAKE_PHRASES.length - 1]!.id)).toBeLessThan(ids.indexOf(GATE_PHRASES[0]!.id));
    for (const id of ['lake.throw-pebble', 'lake.sit-boat', 'swamp.name-columns-words', 'bronze.swim', 'silver.dig', 'gold.smell']) expect(LAKE_PHRASES.map((p) => p.id)).toContain(id);
  });
  it('no lake phrase uses a gate verb on a gate noun: the Dock gate keeps every obvious verb OFFLINE', () => {
    for (const cmd of ['open boat', 'use lamp', 'push ferryman', 'climb into boat', 'enter boat', 'kick lamp', 'use lake']) {
      expect(step(at('lake.dock'), cmd, WORLD).output[0], cmd).toMatch(/^The Ferryman's OFFLINE\. Credentials expired\./);
    }
  });
  it('the scored rules still score: the credentials (+15), the STANDARD key (+20), the signpost (+10); board still crosses', () => {
    const creds = step(at('lake.dock', { inventory: ['license', 'credentials'] }), 'give credentials to ferryman', WORLD);
    expect([creds.stepId, creds.pointsAwarded]).toEqual(['lake.ferry', 15]);
    expect(step(creds.state, 'board boat', WORLD).state.room).toBe('lake.island');
    expect(step(at('lake.island', ONLINE), 'get standard key', WORLD).pointsAwarded).toBe(20);
    expect(step(at('swamp.gold'), 'get signpost', WORLD).pointsAwarded).toBe(10);
    expect(step(at('swamp.gold', { inventory: ['license', 'shortcut'] }), 'use shortcut', WORLD).state.room).toBe('lake.shore');
  });
  it('nothing the sweep added turns lake or marsh scenery into a puzzle (the fishing count still sees it)', () => {
    // (Not the plaque or the porch sign: `sign` is a noun of global.use-shortcut, which has been so since before the sweep, like the Fields' banner.)
    const scenery: [string, string, Partial<GameState>][] = [['lake.island', 'plinth', ONLINE], ['swamp.bronze', 'water', {}], ['swamp.bronze', 'csv', {}], ['swamp.silver', 'log', {}], ['lake.house', 'mailbox', {}], ['lake.house', 'deck-chair', {}], ['lake.house', 'house-door', {}]];
    for (const [room, id, extra] of scenery) expect(isScenery(at(room, extra), WORLD, WORLD.items[id]!), `${room} ${id}`).toBe(true);
  });
  it('the shore keeps no untakeable item (the budget line still names the wall) and a bare `use pebble` still falls to the generic pool', () => {
    expect(WORLD.rooms['lake.shore']!.items.every((id) => WORLD.items[id]!.takeable)).toBe(true);
    expect(step(at('lake.shore', { inventory: ['license', 'pebble'] }), 'use pebble', WORLD).stepId).toBe('lake.shore');
  });
  it('the Lake House still scores nothing and keeps no plainer nudge', () => {
    const { s } = run(at('lake.house'), ['open mailbox', 'use mailbox', 'get mail', 'use chair', 'sit', 'knock', 'fish', 'buy house', 'say lakehouse', 'look at house', 'drink water', 'get house', 'use sign', 'open sign']);
    expect(s.score).toBe(0); expect(s.bonus).toBe(0); expect(s.dead).toBe(false);
    expect(WORLD.rooms['lake.house']!.nudge?.plainer).toBeUndefined();
  });
});

describe('lake + swamp sweep: the pebble, thrown', () => {
  it('skips from the shore, is remembered after, and is refused before it is picked up', () => {
    expect(step(at('lake.shore'), 'throw pebble', WORLD).output[0]).toBe("It's at your feet. Pick it up first; the OneLake does not accept throws by reference.");
    const { s, firsts } = run(at('lake.shore', { inventory: ['license', 'pebble'] }), ['throw pebble', 'throw pebble', 'skip pebble']);
    expect(firsts[1]).toMatch(/^The pebble is a Delta file now\./); expect(firsts[2]).toBe(firsts[1]); expect(s.flags['pebble.skipped']).toBe(true);
    expect(step(at('lake.shore', { inventory: ['license', 'pebble'] }), 'throw pebble at ferryman', WORLD).output[0]).toMatch(/an arm like a Pro license\.$/);
    expect(step(at('lake.shore', { inventory: ['license'], flags: { 'taken.pebble': true } }), 'throw pebble', WORLD).output[0]).toBe('You mime a throw. The OneLake is not fooled; it has seen every mime.');
    expect(step(at('lake.shore', { inventory: ['license', 'flat-rock'] }), 'throw stone', WORLD).output[0]).toMatch(/^You throw the flat rock\./);
  });
  it('reads differently by marsh layer: a string in Bronze, back in Silver, a career in Gold', () => {
    const bronze = step(at('swamp.bronze', { inventory: ['license', 'pebble'] }), 'throw pebble', WORLD);
    expect(bronze.output[0]).toMatch(/^You throw the pebble into the Bronze\. It lands as a string/); expect(bronze.state.inventory).not.toContain('pebble');
    expect(step(bronze.state, 'throw pebble', WORLD).output[0]).toMatch(/^It's a string in the Bronze now\./);
    const silver = step(at('swamp.silver', { inventory: ['license', 'pebble'] }), 'throw pebble', WORLD);
    expect(silver.output[0]).toMatch(/It comes back\./); expect(silver.state.inventory).toContain('pebble');
    const gold = step(at('swamp.gold', { inventory: ['license', 'pebble'] }), 'throw pebble', WORLD);
    expect(gold.output[0]).toMatch(/Pebble \(Active\)/); expect(gold.state.inventory).not.toContain('pebble');
    twice(at('swamp.silver', { inventory: ['license', 'pebble'] }), 'throw pebble');
  });
  it('at the dock: at him, it comes back; into the lake, it skips, and he watches', () => {
    expect(step(at('lake.dock', { inventory: ['license', 'pebble'] }), 'throw pebble at ferryman', WORLD).output[0]).toMatch(/remembers he has no gateway, and comes back to your hand\.$/);
    const r = step(at('lake.dock', { inventory: ['license', 'pebble'] }), 'throw pebble into the lake', WORLD);
    expect(r.output[0]).toMatch(/^Skip\. Skip\. Sink\. Three hops off the dock/); expect(r.state.inventory).not.toContain('pebble');
  });
});

describe('lake + swamp sweep: every gag has a second line, and the same verb reads differently by screen', () => {
  it('the shore', () => {
    for (const cmd of ['look at lake', 'look at shore', 'look at marshes', 'look at house', 'look at dock', 'talk to ferryman', 'say dax', 'drink lake', 'look at pebble']) twice(at('lake.shore'), cmd);
    const [, , third] = run(at('lake.shore'), ['look at lake', 'look at lake', 'look at lake']).firsts;
    expect(third).toBe("One lake. You've stared at it longer than the guy who named it.");
  });
  it('the dock, OFFLINE and ONLINE', () => {
    const offline = ['ask ferryman about the lake', 'ask ferryman about his tears', 'ask ferryman about himself', 'ask ferryman about credentials', 'sit in boat', 'row boat', 'hum', 'cry', 'say credentials', 'say online', 'say offline', 'say dax', 'look at lake', 'talk to lamp', 'talk to boat', 'use timetable', 'look at timetable', 'look at lamp', 'look at boat', 'look at ferryman', 'board', 'e', 'drink water'];
    for (const cmd of offline) twice(at('lake.dock'), cmd);
    for (const cmd of ['give pebble to ferryman', 'give license to ferryman', 'give mug to ferryman', 'give timetable to ferryman', 'give lanyard to ferryman']) twice(at('lake.dock', { inventory: ['license', 'pebble', 'mug', 'timetable', 'lanyard'] }), cmd);
    const online = ['ask ferryman about the lake', 'ask ferryman about the tears', 'ask ferryman about yourself', 'ask ferryman about the boat', 'sit in boat', 'row boat', 'hum', 'weep', 'say credentials', 'say online', 'say offline', 'say dax', 'look at lake', 'talk to lamp', 'use timetable', 'look at lamp', 'look at ferryman', 'drink water'];
    for (const cmd of online) twice(at('lake.dock', ONLINE), cmd);
    for (const cmd of ['give key to ferryman', 'give personal key to ferryman']) twice(at('lake.dock', { ...ONLINE, inventory: ['license', 'standard key', 'personal key'] }), cmd);
    // The same line, by the lamp: the derailments and the gags know which state he is in.
    for (const cmd of ['ask ferryman about the lake', 'sit in boat', 'row boat', 'say online', 'look at lamp', 'use timetable']) {
      expect(step(at('lake.dock'), cmd, WORLD).output[0], cmd).not.toBe(step(at('lake.dock', ONLINE), cmd, WORLD).output[0]);
    }
    expect(step(at('lake.dock', ONLINE), 'ask ferryman about the lake', WORLD).output[0]).toBe('"One," he says. "Lake." Out loud, now that he can. He holds up the finger anyway; he has grown fond of the finger.');
  });
  it("the Ferryman's second known-topic line, offline and online; unknown topics keep the brush-off, which is now his own", () => {
    expect(run(at('lake.dock'), ['ask ferryman about credentials', 'ask ferryman about credentials']).firsts[1]).toBe('He mouths it again, slower, in case the mouthing was the problem. It was not the problem.');
    expect(run(at('lake.dock', ONLINE), ['ask ferryman about the boat', 'ask ferryman about the boat']).firsts[1]).toBe('"Asked," he says. "Answered. ONLINE." He is using the word as punctuation now.');
    const off = run(at('lake.dock'), ['ask ferryman about the weather', 'ask ferryman about the weather']).firsts;
    expect(off[0]).toBe(brushOffLine(at('lake.dock'), BRUSHOFFS.ferryman)); expect(off[1]).toBe(off[0]);
    const on = brushOffLine(at('lake.dock', ONLINE), BRUSHOFFS.ferryman)!;
    expect(on).toMatch(/^"ONLINE," he says, and hums the rest\./);
    expect(on).not.toMatch(/a question that was not about that/);
    expect(BRUSHOFFS.cardinality).toMatch(/a question that was not about that/);
  });
  it('the isle', () => {
    for (const cmd of ['look at plinth', 'look at plaque', 'read plaque', 'use plinth', 'talk to ferryman', 'ask ferryman about the key', 'say standard', 'say personal', 'look at boat', 'look at ferryman', 'look at island', 'drink water', 'sit in boat', 'look at standard key', 'look at personal key']) twice(at('lake.island', ONLINE), cmd);
    twice(at('lake.island', { ...ONLINE, inventory: ['license', 'personal key'], flags: { ...ONLINE.flags, 'taken.personal key': true } }), 'use personal key on plinth');
    twice(at('lake.island', { ...ONLINE, inventory: ['license', 'standard key'], flags: { ...ONLINE.flags, 'taken.standard key': true } }), 'use key on plinth');
    const { firsts } = run(at('lake.island', ONLINE), ['get keys', 'get personal key', 'get keys', 'get key', 'get keys']);
    expect(firsts[0]).toBe('One at a time. CHOOSE, not COLLECT.');
    expect(firsts[2]).toBe('You chose. The other one is not a second choice; it is a collection.');
    expect(firsts[4]).toBe('Both. The plaque has given up on you.');
    expect(step(at('lake.island', ONLINE), 'open plinth', WORLD).output[0]).toBe('The hollows are as open as they get.');
    // The F3 fix stays: `get personal key` twice is its again line, and the STANDARD key stays on the plinth.
    const again = run(at('lake.island', ONLINE), ['get personal key', 'get personal key']);
    expect(again.firsts[1]).toMatch(/^You already took the personal key\./); expect(again.s.inventory).not.toContain('standard key');
  });
  it('the Lake House', () => {
    for (const cmd of ['open mailbox', 'use mailbox', 'get mail', 'talk to mailbox', 'use chair', 'sit', 'knock', 'use door', 'buy house', 'fish', 'open door', 'in', 'swim', 'look at house', 'look at lake', 'look at porch', 'say lakehouse', 'drink water', 'look at sign', 'look at chair', 'look at mailbox', 'look at door']) twice(at('lake.house'), cmd);
    const { firsts } = run(at('lake.house'), ['look at mailbox', 'look at mailbox', 'look at mailbox']);
    expect(firsts[1]).toBe('1 new. You had a Hotmail inbox that said that for six years.');
    expect(firsts[2]).toBe("1 new. It's the CSV. It always was.");
    expect(run(at('lake.house'), ['look at sign', 'look at sign', 'look at sign']).firsts[2]).toBe("LAKE. HOUSE. Three reads. It's not a puzzle; it's a naming decision.");
    for (const cmd of ['get house', 'open sign']) expect(step(at('lake.house'), cmd, WORLD).output[0]!.split(' ').length, cmd).toBeLessThan(9);
  });
  it('the marshes: one verb, three layers, each with a second line', () => {
    const layers = ['swamp.bronze', 'swamp.silver', 'swamp.gold'];
    for (const cmd of ['swim', 'dig', 'smell the marsh', 'say dax', 'drink water', 'look at water', 'open marsh']) {
      const lines = layers.map((room) => step(at(room), cmd, WORLD).output[0]!);
      expect(new Set(lines).size, cmd).toBe(3);
    }
    for (const cmd of ['swim', 'dig', 'smell the marsh', 'say dax', 'look at water']) for (const room of layers) twice(at(room), cmd);
    for (const cmd of ['drink water']) for (const room of ['swamp.silver', 'swamp.gold']) twice(at(room), cmd);
    for (const cmd of ['name the columns', 'label columns', 'open csv', 'get csv', 'talk to csv', 'talk to marsh', 'use water', 'look at csv', 'look at stress ball']) twice(at('swamp.bronze'), cmd);
    twice(at('swamp.bronze', { inventory: ['license', 'name tag'] }), 'use name tag on csv');
    for (const cmd of ['use log', 'read log', 'talk to log', 'look at columns', 'read columns', 'look at log', 'look at name tag', 'get water']) twice(at('swamp.silver'), cmd);
    expect(twice(at('swamp.silver'), 'get water')).toEqual(["Deduplicated. There's one of it, and it's staying.", 'Still one of it. Your second try is a duplicate. Removed.']);
    for (const cmd of ['use name tag on log', 'use name tag on water']) twice(at('swamp.silver', { inventory: ['license', 'name tag'] }), cmd);
    for (const cmd of ['read signpost', 'talk to signpost', 'look at names', 'look at path', 'get gold', 'look at signpost']) twice(at('swamp.gold'), cmd);
    twice(at('swamp.gold', { inventory: ['license', 'shortcut'], flags: { 'taken.shortcut': true } }), 'use shortcut on marsh');
    // The marsh smell needs an object; a bare `smell` is still about you (egg.smell).
    expect(step(at('swamp.bronze'), 'smell', WORLD).stepId).toBe('egg.smell');
    // Drinking in the Bronze is still the death, in the marshes the bottle still kills, and its absence still answers.
    expect(step(at('swamp.bronze'), 'drink water', WORLD).state.dead).toBe(true);
    for (const room of layers) {
      expect(step(at(room, { inventory: ['license', 'capacityade'] }), 'drink capacityade', WORLD).deathCause, room).toBe('death.capacityade');
      expect(step(at(room), 'drink capacityade', WORLD).output[0], room).toMatch(/no CapacityAde in the marsh/);
    }
  });
  it('the signpost knows whether it is here: dropped in Gold it still reads; dropped elsewhere, nothing to read', () => {
    const here = run(at('swamp.gold'), ['get signpost', 'drop shortcut', 'read signpost']);
    expect(here.firsts[2]).toMatch(/^SHORTCUT, it says/);
    const gone = run(at('swamp.gold'), ['get signpost', 'n', 'drop shortcut', 's', 'read signpost', 'talk to signpost']);
    expect(gone.firsts[4]).toBe('Nothing to read where it stood. It is wherever you put it down, pointing at here.');
    expect(gone.firsts[5]).toMatch(/^You talk to where the signpost was\./);
  });
});

describe('lake + swamp sweep: the deferred minor and the constants', () => {
  it("the isle's where line stays in second person once both keys are gone", () => {
    const line = whereText(at('lake.island', { flags: { 'taken.standard key': true, 'taken.personal key': true } }), 'lake.island')!;
    expect(line).toBe('The Isle of Gateway. An empty plinth and a plaque that says CHOOSE. You took both, and nobody has told the plaque.');
    expect(line).not.toMatch(/a man who/);
    expect(typeof WHERE['lake.island']).toBe('function');
  });
  it('malaprops twice or more, the allusions, the brand', () => {
    const lines = [
      step(at('lake.island', ONLINE), 'use plinth', WORLD).output[0]!,
      step(at('swamp.silver'), 'drink water', WORLD).output[0]!,
      step(at('swamp.gold'), 'look', WORLD).output[0]!,
      step(at('swamp.bronze'), 'say dax', WORLD).output[0]!,
      run(at('swamp.gold'), ['say dax', 'say dax']).firsts[1]!,
    ].join('\n');
    expect(lines.match(new RegExp(MALAPROPS.daxxed, 'g'))!.length).toBeGreaterThanOrEqual(3);
    expect(lines).toMatch(MALAPROPS.capacitude); expect(lines).toMatch(MALAPROPS.refreshered);
    expect(step(at('lake.house'), 'use chair', WORLD).output[0]).toMatch(/the Windows XP hill/);
    expect(run(at('lake.house'), ['look at mailbox', 'look at mailbox']).firsts[1]).toMatch(/a Hotmail inbox/);
    expect(step(at('lake.dock'), 'look at timetable', WORLD).output[0]).toMatch(/Refreshr™/);
  });
});

describe('lake + swamp sweep: the polish round (review lines 1-9, M1, M2, M4)', () => {
  it('the dock skip is narrated in the present tense, in both lamp states', () => {
    for (const extra of [{}, ONLINE]) {
      const line = step(at('lake.dock', { inventory: ['license', 'pebble'], ...extra }), 'throw pebble into the lake', WORLD).output[0]!;
      expect(line).toMatch(/The Ferryman watches, (OFFLINE|ONLINE)/); expect(line).not.toMatch(/watched|nodded/);
    }
  });
  it('the flat rock sinks, so it leaves your pockets; after that it is mourned, and a rock in hand beats the pebble\'s fate', () => {
    const { s, firsts } = run(at('lake.shore', { inventory: ['license', 'flat-rock'] }), ['throw stone', 'throw rock']);
    expect(firsts[0]).toBe('You throw the flat rock. It is from the Peaks, and skips are billed per second. Zero skips. It sinks, and you are billed anyway.');
    expect(s.inventory).not.toContain('flat-rock');
    expect(step(s, 'inventory', WORLD).output.join(' ')).not.toMatch(/flat rock/);
    expect(firsts[1]).toBe('Your flat rock is on the bottom of the OneLake, still being billed.');
    const skipped = step(at('lake.dock', { inventory: ['license', 'flat-rock'], flags: { 'pebble.skipped': true } }), 'throw rock', WORLD);
    expect(skipped.output[0]).toMatch(/^You throw the flat rock\./); expect(skipped.state.inventory).not.toContain('flat-rock');
  });
  it('the lanyard, again: he mouths it OFFLINE and says it ONLINE, and nothing claims he mouthed it before', () => {
    const second = (extra: Partial<GameState>) => run(at('lake.dock', { inventory: ['license', 'lanyard'], ...extra }), ['give lanyard to ferryman', 'give lanyard to ferryman']).firsts[1];
    expect(second({})).toBe("'FabCon,' he mouths. He hands it back again. He has been there in spirit twice now.");
    expect(second(ONLINE)).toBe('"FabCon," he says again, out loud. He hands it back again. He has been there in spirit twice now.');
  });
  it('the gifts end on the joke: no line closes on "hands it back."', () => {
    const inv = ['license', 'mug', 'timetable', 'lanyard', 'pebble'];
    for (const extra of [{}, ONLINE]) for (const item of ['license', 'mug', 'timetable', 'lanyard', 'pebble']) {
      for (const line of run(at('lake.dock', { inventory: inv, ...extra }), [`give ${item} to ferryman`, `give ${item} to ferryman`]).firsts) {
        expect(line, `${item} ${extra === ONLINE ? 'online' : 'offline'}`).not.toMatch(/hands it back\.$/);
      }
    }
    expect(run(at('lake.dock', { ...ONLINE, inventory: inv }), ['give timetable to ferryman', 'give timetable to ferryman']).firsts).toEqual([
      "The Ferryman crosses out OFFLINE on the timetable, writes ONLINE, and hands it back. A moment later he leans over and adds 'for now'.",
      "He hands it back with 'for now' crossed out, and 'for now' written under it, smaller.",
    ]);
    expect(step(at('lake.dock', { ...ONLINE, inventory: inv }), 'give license to ferryman', WORLD).output[0]).toMatch(/"I'll do one\."$/);
    expect(step(at('lake.dock', { inventory: inv }), 'give mug to ferryman', WORLD).output[0]).toMatch(/he has felt understood by\.$/);
  });
  it('the shore is one joke; the plaque answers about the plaque', () => {
    expect(step(at('lake.shore'), 'look at shore', WORLD).output[0]).toBe('Sand. Dry, at least. The lake starts where your Pro license stops.');
    expect(step(at('lake.island', ONLINE), 'open plaque', WORLD).output[0]).toBe("A plaque doesn't open. It's read, then lived with.");
    expect(step(at('lake.island', ONLINE), 'open plinth', WORLD).output[0]).toBe('The hollows are as open as they get.');
  });
  it('M1: a topic the Ferryman knows keeps his hint; the derailments take only what he does not know', () => {
    const ferryman = WORLD.npcs['ferryman']!;
    for (const extra of [{}, ONLINE]) for (const topic of ['gateway', 'the gateway', 'tear', 'the tear', 'ferry man']) {
      const s = at('lake.dock', extra);
      const r = step(s, `ask ferryman about ${topic}`, WORLD);
      expect(r.stepId, topic).toBe('dock.ask-ferryman');
      expect(r.output[0], topic).toBe(talkTo(s, WORLD, ferryman, topic));
    }
    expect(step(at('lake.dock'), 'ask ferryman about gateway', WORLD).output[0]).toMatch(/credentials/i);
    for (const [cmd, id] of [['ask ferryman about his tears', 'dock.ferryman-tears'], ['ask ferryman about himself', 'dock.ferryman-himself'], ['ask ferryman about the lake', 'lake.ferryman-lake']]) {
      expect(step(at('lake.dock'), cmd!, WORLD).stepId, cmd).toBe(id);
    }
  });
  it("M2: untie, launch, cast off: the boat comes untied, nobody rows, and the lamp picks the line", () => {
    for (const cmd of ['untie boat', 'launch the boat', 'cast off boat']) for (const extra of [{}, ONLINE]) {
      const r = step(at('lake.dock', extra), cmd, WORLD);
      expect(r.stepId, cmd).toBe('dock.untie-boat'); expect(r.output[0], cmd).toMatch(/^The boat comes untied\./); expect(r.output[0]).not.toMatch(/You row/);
    }
    for (const extra of [{}, ONLINE]) twice(at('lake.dock', extra), 'untie boat');
    expect(step(at('lake.dock'), 'untie boat', WORLD).output[0]).not.toBe(step(at('lake.dock', ONLINE), 'untie boat', WORLD).output[0]);
    expect(step(at('lake.dock'), 'row boat', WORLD).output[0]).toMatch(/^You row\./);
  });
});
