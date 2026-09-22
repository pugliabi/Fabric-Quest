import { parse } from './parser';
import { pickSnark } from './snark';
import * as B from './builtins';
import { godStep } from './god';
import { applyQuirks, nextRecent, normalize } from './quirks';
import type { GameState, Outcome, ParsedCommand, StepResult } from './types';
import type { Rule, World } from '../world/types';

export { MAX_SCORE, describeRoom } from './builtins';

export function newGame(world: World, seed: number): GameState {
  return {
    room: world.start,
    inventory: world.items['license'] ? ['license'] : [],
    worn: [],
    flags: {},
    score: 0,
    turns: 0,
    dead: false,
    won: false,
    seed,
  };
}

function condOk(s: GameState, r: Rule): boolean {
  const w = r.when;
  if (w.flags) {
    for (const c of w.flags) {
      const v = s.flags[c.flag];
      if (c.not) {
        if (v) return false;
      } else if (c.is !== undefined) {
        if (v !== c.is) return false;
      } else if (!v) return false;
    }
  }
  if (w.has && !w.has.every((i) => s.inventory.includes(i))) return false;
  if (w.notHas && w.notHas.some((i) => s.inventory.includes(i))) return false;
  if (w.worn && !w.worn.every((i) => s.worn.includes(i))) return false;
  return true;
}

function nounMatch(want: string | string[] | undefined, got: string | undefined): boolean {
  if (want === undefined) return true;
  if (got === undefined) return false;
  return (Array.isArray(want) ? want : [want]).includes(got);
}

function ruleMatches(s: GameState, parsed: ParsedCommand, r: Rule): boolean {
  const w = r.when;
  if (w.verb !== parsed.verb) return false;
  if (w.dir && w.dir !== parsed.dir) return false;
  if (!nounMatch(w.noun, parsed.noun)) return false;
  if (!nounMatch(w.noun2, parsed.noun2)) return false;
  if (w.nounMatches && !(parsed.noun !== undefined && w.nounMatches.test(parsed.noun))) return false;
  return condOk(s, r);
}

function applyRule(s: GameState, r: Rule, world: World, parsed: ParsedCommand): StepResult {
  const state: GameState = { ...s, flags: { ...s.flags }, inventory: [...s.inventory], worn: [...s.worn] };
  const t = r.then;
  const output = [typeof t.text === 'function' ? t.text(state, world) : t.text];
  let points = 0;
  const key = `pts.${t.pointsKey ?? r.id}`;
  if (t.points && !state.flags[key]) {
    points = t.points;
    state.score += points;
    state.flags[key] = true;
  }
  if (t.set) {
    for (const [k, v] of Object.entries(t.set)) state.flags[k] = typeof v === 'function' ? v(state.flags[k]) : v;
  }
  if (t.give) for (const i of t.give) if (!state.inventory.includes(i)) { state.inventory.push(i); state.flags[`taken.${i}`] = true; }
  if (t.remove) {
    state.inventory = state.inventory.filter((i) => !t.remove!.includes(i));
    state.worn = state.worn.filter((i) => !t.remove!.includes(i));
  }
  if (t.wear) for (const i of t.wear) if (!state.worn.includes(i)) state.worn.push(i);
  if (t.moveTo && world.rooms[t.moveTo]) {
    state.room = t.moveTo;
    output.push(B.describeRoom(state, world));
  }
  const changed = points > 0 || !!t.set || !!t.give || !!t.remove || !!t.wear || !!t.moveTo;
  let outcome: Outcome = t.outcome ?? (changed ? 'success' : 'fail');
  let deathCause: string | undefined;
  if (t.death) {
    state.dead = true;
    outcome = 'death';
    deathCause = t.death;
  }
  if (t.win) {
    state.won = true;
    outcome = 'win';
  }
  return { state, output, outcome, stepId: r.id, pointsAwarded: points, parsed, deathCause, sfx: t.sfx };
}

/** The whole game, one turn at a time. Pure: no I/O, no randomness beyond state.seed. */
export function step(prev: GameState, rawInput: string, world: World): StepResult {
  const recent = nextRecent(prev.recent, rawInput, prev.room);
  const base: GameState = { ...prev, turns: prev.turns + 1, recent };
  const input = normalize(rawInput); // "GET YE FLASK!!!" plays as "get ye flask"; the shout is handled by the quirks layer
  const lower = input;

  // 0. God mode (undocumented). Checked first so nothing else can shadow it.
  const parsedEarly = { ...parse(input), raw: rawInput };
  const god = godStep(base, lower, world, parsedEarly);
  if (god) return god;

  // 1. Phrase rules (easter eggs / deaths that don't fit the verb-noun grammar).
  const phrase = world.phraseRules.find((p) => (!p.room || p.room === base.room) && p.test.test(lower));
  const parsed = parsedEarly;
  let result: StepResult;
  if (phrase) {
    const state = { ...base, dead: base.dead || !!phrase.death };
    result = {
      state,
      output: [typeof phrase.text === 'function' ? phrase.text(state, world) : phrase.text],
      outcome: phrase.death ? 'death' : 'snark',
      stepId: phrase.id,
      pointsAwarded: 0,
      parsed,
      deathCause: phrase.death,
      sfx: phrase.sfx,
    };
  } else {
    // 2. Room rules, then global rules — first match wins.
    const room = world.rooms[base.room]!;
    const rule = room.rules.find((r) => ruleMatches(base, parsed, r)) ?? world.globalRules.find((r) => ruleMatches(base, parsed, r));
    if (rule) {
      result = applyRule(base, rule, world, parsed);
    } else {
      // 3. Built-in verbs.
      const built = B.handle(base, parsed, world);
      if (built) result = { ...built, parsed, pointsAwarded: 0, stepId: built.stepId ?? base.room };
      else result = { state: base, output: [pickSnark(base.seed, base.turns, world.snark)], outcome: 'snark', stepId: base.room, pointsAwarded: 0, parsed };
    }
  }

  // 4. Interactive delay on the Peaks without the Bursting Boots.
  const r = result.state;
  if ((r.room === 'peaks.pass' || r.room === 'peaks.ledge') && !r.worn.includes('boots') && !r.dead && !r.won) {
    result = { ...result, state: { ...r, turns: r.turns + 2 }, output: ['(…interactive delay…)', ...result.output] };
  }
  // 5. Chirps: shouting and repeating yourself.
  result = applyQuirks(base, rawInput, result, recent);
  // 6. Ambient interjections (Jeff, mostly).
  if (!result.state.dead && !result.state.won && world.ambient) {
    const extra = world.ambient(result.state);
    if (extra) result = { ...result, output: [...result.output, extra] };
  }
  return result;
}
