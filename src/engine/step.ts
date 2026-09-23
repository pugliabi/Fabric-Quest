import { parse } from './parser';
import { pickSnark } from './snark';
import * as B from './builtins';
import { GOD_FLAG, godStep } from './god';
import { applyQuirks, nextRecent, normalize, unwrap, type QuirkOptions } from './quirks';
import type { GameState, HeardLine, Outcome, ParsedCommand, StepResult, Verb } from './types';
import type { PhraseRule, Rule, World } from '../world/types';
import { RETURN_FLAG, SIDE_REALM_NAME, SIDE_REGIONS } from '../world/types';
import { EXIT_THEN, NESTED_TEXT, NO_DEATH, copilotPromptIn, enterThen, quitInRealmText, type Realm } from '../world/sidequests';

export { MAX_SCORE, describeRoom } from './builtins';
export { RETURN_FLAG } from '../world/types';

/** Verbs a prompt room (catchAll + region 'copilot') leaves to the builtins; every other verb there is a prompt. */
const NAV_VERBS: ReadonlySet<Verb> = new Set<Verb>(['go', 'look', 'inventory', 'score', 'help', 'save', 'restore', 'restart', 'quit', 'wait', 'get', 'drop', 'read']);

const ITEM_VERBS: ReadonlySet<Verb> = new Set<Verb>(['get', 'drop', 'read']);

export function newGame(world: World, seed: number): GameState {
  return {
    room: world.start,
    inventory: world.items['license'] ? ['license'] : [],
    worn: [],
    flags: { [`seen.${world.start}`]: true },
    score: 0,
    bonus: 0,
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
  if (w.verbWord && !(parsed.verbWord && w.verbWord.includes(parsed.verbWord))) return false;
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
  const bkey = `bonus.${t.pointsKey ?? r.id}`;
  let bonus = 0;
  if (t.bonus && !state.flags[bkey]) {
    bonus = t.bonus;
    state.bonus += bonus;
    state.flags[bkey] = true;
  }
  if (t.moveTo && world.rooms[t.moveTo]) {
    state.room = t.moveTo;
    output.push(B.describeRoom(state, world));
  }
  if (t.returnTo) {
    const idx = state.flags[RETURN_FLAG];
    const home = typeof idx === 'number' ? B.roomFromIndex(idx, world) : undefined;
    state.room = home ?? world.start;
    delete state.flags[RETURN_FLAG];
    output.push(B.describeRoom(state, world));
  }
  const changed = points > 0 || bonus > 0 || !!t.set || !!t.give || !!t.remove || !!t.wear || !!t.moveTo || !!t.returnTo;
  let outcome: Outcome = t.outcome ?? (t.moveTo || t.returnTo ? 'move' : changed ? 'success' : 'fail');
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
  return { state, output, outcome, stepId: r.id, pointsAwarded: points, bonusAwarded: bonus, parsed, deathCause, sfx: t.sfx };
}

/** The whole game, one turn at a time. Pure: no I/O, no randomness beyond state.seed. */
export function step(prev: GameState, rawInput: string, world: World): StepResult {
  const unwrapped = unwrap(rawInput);
  const { command, kind } = unwrapped;
  const heard: HeardLine = { ...unwrapped, raw: rawInput };
  const recent = nextRecent(prev.recent, command, prev.room);

  // 0. God mode (undocumented). Checked first so nothing else can shadow it.
  // 0a. When god mode is already on, try the RAW (pre-unwrap) line first, against a base state
  // that has NOT had any wrap.* counter bump applied yet: wrapper-stripping below (e.g. "how do i "
  // as an intent lead) would otherwise consume god-mode aliases like "how do i get X" / "what do i
  // give to X" before godStep ever saw them, and computing wrapFlags first would wrongly bump
  // wrap.* for a line that resolves as a god command rather than an ordinary wrapped one. Falls
  // through to the unwrapped path (including the toggle) when the raw line isn't a god command.
  if (prev.flags[GOD_FLAG]) {
    const rawBase: GameState = { ...prev, turns: prev.turns + 1, recent, flags: { ...prev.flags } };
    const rawLower = normalize(rawInput);
    const rawParsed = { ...parse(rawLower), raw: rawInput };
    const godRaw = godStep(rawBase, rawLower, world, rawParsed);
    if (godRaw) return godRaw;
  }
  const wrapFlags = kind ? { [`wrap.${kind}`]: (Number(prev.flags[`wrap.${kind}`]) || 0) + 1 } : {};
  const base: GameState = { ...prev, turns: prev.turns + 1, recent, flags: { ...prev.flags, ...wrapFlags } };
  const input = normalize(command); // "GET YE FLASK!!!" plays as "get ye flask"; the shout is handled by the quirks layer
  const lower = input;

  const parsedEarly = { ...parse(input), raw: rawInput };
  const god = godStep(base, lower, world, parsedEarly);
  if (god) return god;

  const hereRegion = world.rooms[base.room]!.region;
  const insideRealm = SIDE_REGIONS.has(hereRegion);

  // The shared tail: every path below (phrase, dynamic side-quest, rule, catchAll, builtin, snark) flows through here.
  const finish = (res: StepResult, quirkOpts: QuirkOptions = {}): StepResult => {
    let result = res;
    // 3a. Nobody dies in a side realm (spec §2): whatever would have killed you there gets the realm's shrug instead.
    if (insideRealm && result.state.dead && !base.dead) {
      result = { state: base, output: [NO_DEATH[hereRegion as Realm]], outcome: 'snark', stepId: 'sq.no-death', pointsAwarded: 0, parsed: result.parsed };
    }
    // 3b. First entry into a room: the narrator's quip goes to the text and to the message box.
    if (result.state.room !== prev.room && !result.state.dead) {
      const dest = world.rooms[result.state.room]!;
      const seenKey = `seen.${dest.id}`;
      if (!result.state.flags[seenKey]) {
        const quip = dest.enterQuip?.(result.state) ?? null;
        result = { ...result, state: { ...result.state, flags: { ...result.state.flags, [seenKey]: true } } };
        if (quip) result = { ...result, output: [...result.output, quip], notice: quip };
      }
    }

    // 4. Interactive delay on the Peaks without the Bursting Boots.
    const r = result.state;
    const inSide = SIDE_REGIONS.has(world.rooms[result.state.room]!.region);
    if (!inSide && (r.room === 'peaks.pass' || r.room === 'peaks.ledge') && !r.worn.includes('boots') && !r.dead && !r.won) {
      result = { ...result, state: { ...r, turns: r.turns + 2 }, output: ['(…interactive delay…)', ...result.output] };
    }
    // 5. Chirps: shouting and repeating yourself.
    result = applyQuirks(base, command, result, recent, kind, quirkOpts);
    // 6. Ambient interjections (Jeff, mostly).
    if (!inSide && !result.state.dead && !result.state.won && world.ambient) {
      const extra = world.ambient(result.state);
      if (extra) result = { ...result, output: [...result.output, extra] };
    }
    // 7. Keep the visible-in-flags bonus counter in sync (telemetry / quirks compare flags).
    return { ...result, state: { ...result.state, flags: { ...result.state.flags, bonus: result.state.bonus } } };
  };

  // 1. Phrase rules (easter eggs / deaths that don't fit the verb-noun grammar).
  //    Side-quest hooks (`dynamic`) that don't apply here are skipped as if they had not matched:
  //    an exit word outside a realm keeps its normal meaning ("exit" is a direction), a trigger for the realm you are
  //    already in is left for that realm to interpret (Copilot prompts), and nobody enters a realm dead.
  const applies = (d: PhraseRule['dynamic']): boolean => {
    if (!d) return true;
    if (d === 'exit') return insideRealm;
    if (d === hereRegion) return false;
    return insideRealm || !base.dead;
  };
  // In a prompt room (Copilot's pane) every line is a question for the room, so the global eggs stand aside:
  // only side-quest hooks and phrases scoped to this room are considered ("ask copilot how many…" is a prompt, not egg.count).
  const here = world.rooms[base.room]!;
  const promptRoom = !!here.catchAll && hereRegion === 'copilot';
  const phrase = world.phraseRules.find((p) => (p.room ? p.room === base.room : p.region ? p.region === hereRegion : !promptRoom || !!p.dynamic) && applies(p.dynamic) && (!p.after || p.after(prev)) && p.test.test(lower));
  const parsed = parsedEarly;
  if (phrase?.dynamic) {
    if (phrase.dynamic === 'exit') return finish(applyRule(base, { id: 'sq.exit', when: { verb: 'unknown' }, then: EXIT_THEN }, world, parsed));
    if (insideRealm) return finish({ state: base, output: [NESTED_TEXT], outcome: 'snark', stepId: 'sq.nested', pointsAwarded: 0, parsed });
    const entered = applyRule(base, { id: phrase.id, when: { verb: 'unknown' }, then: enterThen(phrase.dynamic, world, base) }, world, parsed);
    const prompt = phrase.dynamic === 'copilot' ? copilotPromptIn(lower) : '';
    const pane = world.rooms[entered.state.room]!;
    if (!prompt || !pane.catchAll) return finish(entered);
    // "ask copilot for q4 sales" from the main realm: enter, then the rest of the line is the pane's first prompt.
    // The entrance quip goes between the two here (finish() would append it after the answer).
    let state = entered.state;
    const output = [...entered.output];
    let notice: string | undefined;
    const seenKey = `seen.${pane.id}`;
    if (!state.flags[seenKey]) {
      notice = pane.enterQuip?.(state) ?? undefined;
      state = { ...state, flags: { ...state.flags, [seenKey]: true } };
      if (notice) output.push(notice);
    }
    const ans = pane.catchAll(state, heard);
    if (!ans) return finish(entered);
    const replied = applyRule(state, { id: ans.id ?? `${pane.id}.catchall`, when: { verb: 'unknown' }, then: ans.then }, world, parsed);
    const won = (replied.bonusAwarded ?? 0) > 0;
    // A win on the way in: the message box carries the answer, not just "the screen dims".
    if (won) notice = [notice, replied.output[0]].filter(Boolean).join('\n\n');
    return finish({ ...replied, output: [...output, ...replied.output], notice, sfx: won ? replied.sfx : 'sidequest', outcome: won ? replied.outcome : 'move' }, { suppressWrapAndRepeat: true });
  }
  if (phrase) {
    const state = { ...base, dead: base.dead || !!phrase.death };
    return finish({
      state,
      output: [typeof phrase.text === 'function' ? phrase.text(state, world) : phrase.text],
      outcome: phrase.death ? 'death' : 'snark',
      stepId: phrase.id,
      pointsAwarded: 0,
      parsed,
      deathCause: phrase.death,
      sfx: phrase.sfx,
    });
  }
  // 1b. Inside a realm, any other way of saying "out" ("outside", "go outside", "walk out") leaves it too.
  if (insideRealm && parsed.verb === 'go' && parsed.dir === 'out') return finish(applyRule(base, { id: 'sq.exit', when: { verb: 'unknown' }, then: EXIT_THEN }, world, parsed));
  // 1c. QUIT inside a realm leaves the realm, not the quest (the UI retires the run only on the builtin's 'meta' quit).
  if (insideRealm && parsed.verb === 'quit') {
    const left = applyRule(base, { id: 'sq.exit.quit', when: { verb: 'unknown' }, then: EXIT_THEN }, world, parsed);
    return finish({ ...left, output: [left.output[0]!, quitInRealmText(SIDE_REALM_NAME[hereRegion]!), ...left.output.slice(1)] });
  }
  // 2. Room rules, then global rules — first match wins.
  const room = here;
  const rule = room.rules.find((r) => ruleMatches(base, parsed, r)) ?? world.globalRules.find((r) => ruleMatches(base, parsed, r));
  if (rule) return finish(applyRule(base, rule, world, parsed));
  // A prompt room hears every line except navigation, meta and item handling; elsewhere only say / unknown / "talk … copilot".
  // get / drop / read stay commands only when their noun is something here ("get prompt box"); "get me q4 sales" is a prompt.
  const wantsCatchAll = promptRoom
    ? !NAV_VERBS.has(parsed.verb) || (ITEM_VERBS.has(parsed.verb) && !B.resolveNoun(base, world, parsed.noun))
    : parsed.verb === 'say' || parsed.verb === 'unknown' || (parsed.verb === 'talk' && /copilot/.test(lower));
  const catchAll = wantsCatchAll ? room.catchAll?.(base, heard) : undefined;
  // A prompt room answers wrappers and repeats in its own voice, so the chirps keep only their shout lines.
  if (catchAll) return finish(applyRule(base, { id: catchAll.id ?? `${base.room}.catchall`, when: { verb: 'unknown' }, then: catchAll.then }, world, parsed), { suppressWrapAndRepeat: promptRoom });
  // 3. Built-in verbs.
  const built = B.handle(base, parsed, world);
  if (built) return finish({ ...built, parsed, pointsAwarded: 0, stepId: built.stepId ?? base.room });
  return finish({ state: base, output: [pickSnark(base.seed, base.turns, world.snark)], outcome: 'snark', stepId: base.room, pointsAwarded: 0, parsed });
}

/** Test-only: apply one rule directly. */
export const applyRuleForTest = (s: GameState, r: Rule, world: World) => applyRule(s, r, world, parse(''));
