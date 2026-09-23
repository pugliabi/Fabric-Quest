import { parse } from './parser';
import { pickSnark } from './snark';
import * as B from './builtins';
import { GOD_FLAG, godStep } from './god';
import { applyQuirks, nextRecent, normalize, unwrap, type QuirkOptions } from './quirks';
import { applyGovernance, isFlood, setting } from './governance';
import type { GameState, HeardLine, Outcome, ParsedCommand, StepResult, Verb } from './types';
import type { NudgeText, PhraseRule, Room, Rule, RuleThen, World } from '../world/types';
import { RETURN_FLAG, SIDE_REALM_NAME, SIDE_REGIONS } from '../world/types';
import { EXIT_THEN, NESTED_TEXT, NO_DEATH, copilotPromptIn, enterThen, quitInRealmText, realmBlocked, type Realm } from '../world/sidequests';
import { SIGNOFF } from '../world/voice';

export { MAX_SCORE, describeRoom } from './builtins';
export { RETURN_FLAG } from '../world/types';

/** The interactive-delay marker, first line of a delayed turn. The message box skips it (game/notice.ts). */
export const DELAY_LINE = '(…interactive delay…)';
/** The boredom escalation (spec1 §5.2): the only lines the narrator adds for a player who is truly idling. */
const BOREDOM = ["Let's get moving, here, people.", 'Are you THAT bored? Do some questing already!', 'You are an incredibly boring person.'] as const;

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
  if (w.noun2Matches && !(parsed.noun2 !== undefined && w.noun2Matches.test(parsed.noun2))) return false;
  return condOk(s, r);
}

/**
 * The stuck helper's line (Task B4, made plain): `nudge.plainer` at 4 dead turns (the flask hint when the room has none,
 * or its function says ''), the flask hint itself at 8 and every 4 after.
 */
function nudgeLine(room: Room, s: GameState, stuck: number): string {
  const line = (l: NudgeText | undefined): string => (typeof l === 'function' ? l(s) : l ?? '');
  const flask = room.flaskHint(s);
  if (stuck === 4) return line(room.nudge?.plainer) || flask;
  return flask;
}

function applyRule(s: GameState, r: Rule, world: World, parsed: ParsedCommand): StepResult {
  const state: GameState = { ...s, flags: { ...s.flags }, inventory: [...s.inventory], worn: [...s.worn] };
  const t = r.then;
  const output = [typeof t.text === 'function' ? t.text(state, world, parsed) : t.text];
  let points = 0;
  const key = `pts.${t.pointsKey ?? r.id}`;
  if (t.points && !state.flags[key]) {
    points = t.points;
    state.score += points;
    state.flags[key] = true;
  }
  if (t.set) {
    // Setters see `s`, the untouched input state, so a counter can ask "what stage were we at before this rule".
    for (const [k, v] of Object.entries(t.set)) state.flags[k] = typeof v === 'function' ? v(state.flags[k], s) : v;
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
  const box = typeof t.box === 'function' ? t.box(state, world) : t.box;
  return { state, output, outcome, stepId: r.id, pointsAwarded: points, bonusAwarded: bonus, parsed, deathCause, sfx: t.sfx, box };
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
  const finish = (res: StepResult, quirkOpts: QuirkOptions): StepResult => {
    let result = res;
    // 3a. Nobody dies in a side realm (spec §2): whatever would have killed you there gets the realm's shrug instead.
    if (insideRealm && result.state.dead && !base.dead) {
      result = { state: base, output: [NO_DEATH[hereRegion as Realm]], outcome: 'snark', stepId: 'sq.no-death', pointsAwarded: 0, parsed: result.parsed };
    }
    // 3a'. Every death ends on the catchphrase (spec1 §5.1). Appended once, to the last line.
    if (result.state.dead && !base.dead && result.output.length) {
      const out = [...result.output];
      const i = out.length - 1;
      if (!out[i]!.endsWith(SIGNOFF)) out[i] = `${out[i]} ${SIGNOFF}`;
      result = { ...result, output: out };
    }
    // 3d. Per-NPC talk counter (spec1 §3.1): a talk aimed at an NPC who is here counts, whoever answered it.
    //     People before things (resolveNpc): "talk to card" in the Studio is the Card, not the license card you carry.
    if (parsedEarly.verb === 'talk' && parsedEarly.noun && !result.state.dead) {
      const who = B.resolveNpc(base, world, parsedEarly.noun);
      if (who) {
        const k = `talk.${who.id}`;
        result = { ...result, state: { ...result.state, flags: { ...result.state.flags, [k]: (Number(result.state.flags[k]) || 0) + 1 } } };
      }
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

    // 4. Interactive delay: the Peaks without the Bursting Boots (unless Autoscale), or the flood everywhere (spec2 §3.4–3.5).
    const r = result.state;
    const inSide = SIDE_REGIONS.has(world.rooms[result.state.room]!.region);
    const onPeaks = r.room === 'peaks.pass' || r.room === 'peaks.ledge';
    const delayed = (onPeaks && !r.worn.includes('boots') && !setting(r, 'autoscale')) || isFlood(r);
    if (!inSide && delayed && !r.dead && !r.won) {
      result = { ...result, state: { ...r, turns: r.turns + 2 }, output: [DELAY_LINE, ...result.output] };
    }
    // 5. Chirps: the shout line, and the flask's nag.
    result = applyQuirks(base, command, result, recent, quirkOpts);
    // 5b. The settings that nag (spec2 §3.3–3.4): survey, usage and bill lines, after the chirps.
    result = applyGovernance(base, result, world);
    // 6. Ambient interjections (Jeff, mostly).
    if (!inSide && !result.state.dead && !result.state.won && world.ambient) {
      const extra = world.ambient(result.state);
      if (extra) result = { ...result, output: [...result.output, extra] };
    }
    // 7. Keep the visible-in-flags bonus counter in sync (telemetry compares flags).
    result = { ...result, state: { ...result.state, flags: { ...result.state.flags, bonus: result.state.bonus }, recent } };
    // 8. Stuck (spec1 §3.3) and bored (spec1 §5.2): two counters, one place, and at most one aside per turn.
    //    Stuck: after four dead turns in one room, a helper in the `hint` command's own words ("A hollow voice adds:"):
    //    the room's plain line at 4 (nudgeLine), the flask hint at 8, 12… A dead turn is a fail or snark that moved
    //    nothing (same room, no points, no bonus). Anything else, including entering a room, resets the count. A turn
    //    that already carried the flask hint (`get ye flask`, `hint`) resets it too: the hint was asked for, so it is
    //    not said again under the same answer. Not in god mode and not in Copilot's pane, which hints in its own voice.
    //    Bored: turns in one room without progress, whatever the outcome (inventory, look, wait all count). Progress is
    //    a move, points, bonus, or a success that changed what you carry or wear. Lines at 10, 15, then every 5; not in
    //    god mode, a side realm, or once dead or won. Boredom yields to the helper (the helper is the useful one).
    const r8 = result.state;
    const hinted = result.stepId === 'egg.flask' || result.stepId.startsWith('hint.');
    const progressed = r8.room !== base.room || result.pointsAwarded > 0 || (result.bonusAwarded ?? 0) > 0
      || (result.outcome === 'success' && (r8.inventory.length !== base.inventory.length || r8.worn.length !== base.worn.length));
    // Stuck = turns in this room without progress (Tommy: "helpers after like four messages"): failures and looking
    // around both count; talking (the NPC's own ladder is the helper there), `hint`, the flask, meta commands and
    // dying don't. Progress resets it.
    const looked = (parsedEarly.verb === 'look' || parsedEarly.verb === 'read') && result.outcome === 'success';
    const talked = parsedEarly.verb === 'talk';
    const deadTurn = !progressed && !hinted && !r8.dead && !talked && (result.outcome === 'fail' || result.outcome === 'snark' || looked);
    // Meta commands (inventory, score, save) leave the count alone; anything else that isn't a dead turn resets it.
    const stuck = deadTurn ? (base.stuck ?? 0) + 1 : result.outcome === 'meta' && !hinted ? (base.stuck ?? 0) : 0;
    const idle = progressed ? 0 : (base.idle ?? 0) + 1;
    const extra: string[] = [];
    const quiet = !!r8.flags[GOD_FLAG] || r8.dead || r8.won || SIDE_REGIONS.has(world.rooms[r8.room]!.region);
    if (stuck > 0 && stuck % 4 === 0 && !r8.flags[GOD_FLAG] && r8.room !== 'copilot.pane' && !r8.dead) {
      const hint = nudgeLine(world.rooms[r8.room]!, r8, stuck) || 'Look around. Talk to people. Read things.';
      extra.push(`A hollow voice adds: "${hint}"`);
    } else if (!quiet && idle === 10) extra.push(BOREDOM[0]);
    else if (!quiet && idle === 15) extra.push(BOREDOM[1]);
    else if (!quiet && idle >= 20 && idle % 5 === 0) extra.push(BOREDOM[2]);
    result = { ...result, state: { ...r8, stuck, idle }, output: extra.length ? [...result.output, ...extra] : result.output };
    return result;
  };

  // In a prompt room (Copilot's pane) every line is a question for the room, so the global eggs stand aside:
  // only side-quest hooks and phrases scoped to this room are considered ("ask copilot how many…" is a prompt, not egg.count).
  const here = world.rooms[base.room]!;
  const promptRoom = !!here.catchAll && hereRegion === 'copilot';
  const parsed = parsedEarly;

  /** The answer: phrase rules, side-quest hooks, room and global rules, the catch-all, the builtins, the snark. Pure in `b` (`base`). */
  const resolve = (b: GameState): { res: StepResult; opts?: QuirkOptions } => {
    // 1. Phrase rules (easter eggs / deaths that don't fit the verb-noun grammar).
    //    Side-quest hooks (`dynamic`) that don't apply here are skipped as if they had not matched:
    //    an exit word outside a realm keeps its normal meaning ("exit" is a direction), a trigger for the realm you are
    //    already in is left for that realm to interpret (Copilot prompts), and nobody enters a realm dead.
    const applies = (d: PhraseRule['dynamic']): boolean => {
      if (!d) return true;
      if (d === 'exit') return insideRealm;
      if (d === hereRegion) return false;
      return insideRealm || !b.dead;
    };
    let phrase: PhraseRule | undefined;
    let phraseThen: { then: RuleThen; id?: string } | undefined;
    for (const p of world.phraseRules) {
      const inScope = p.room ? p.room === b.room : p.region ? p.region === hereRegion : !promptRoom || !!p.dynamic;
      if (!inScope || !applies(p.dynamic) || (p.after && !p.after(prev)) || !p.test.test(lower)) continue;
      if (p.then) {
        const resolved = typeof p.then === 'function' ? p.then(b, world, lower, heard) : { then: p.then };
        if (resolved === null) continue; // the handler declined: keep looking
        phrase = p; phraseThen = resolved; break;
      }
      phrase = p; break;
    }
    if (phrase?.dynamic) {
      if (phrase.dynamic === 'exit') return { res: applyRule(b, { id: 'sq.exit', when: { verb: 'unknown' }, then: EXIT_THEN }, world, parsed) };
      if (insideRealm) return { res: { state: b, output: [NESTED_TEXT], outcome: 'snark', stepId: 'sq.nested', pointsAwarded: 0, parsed } };
      // A tenant setting can keep the door shut (spec2 §3.3): the line, no move, no goal card.
      const blocked = realmBlocked(phrase.dynamic, b);
      if (blocked) return { res: { state: b, output: [blocked], outcome: 'fail', stepId: `sq.blocked.${phrase.dynamic}`, pointsAwarded: 0, parsed } };
      const entered = applyRule(b, { id: phrase.id, when: { verb: 'unknown' }, then: enterThen(phrase.dynamic, world, b) }, world, parsed);
      const prompt = phrase.dynamic === 'copilot' ? copilotPromptIn(lower) : '';
      const pane = world.rooms[entered.state.room]!;
      if (!prompt || !pane.catchAll) return { res: entered };
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
      if (!ans) return { res: entered };
      const replied = applyRule(state, { id: ans.id ?? `${pane.id}.catchall`, when: { verb: 'unknown' }, then: ans.then }, world, parsed);
      const won = (replied.bonusAwarded ?? 0) > 0;
      // A win on the way in: the message box carries the answer, not just "the screen dims".
      if (won) notice = [notice, replied.output[0]].filter(Boolean).join('\n\n');
      return { res: { ...replied, output: [...output, ...replied.output], notice, box: entered.box, sfx: won ? replied.sfx : 'sidequest', outcome: won ? replied.outcome : 'move' }, opts: { suppressWrapAndRepeat: true } };
    }
    // A phrase with effects (`then`) is a rule keyed on the raw line: flags, moves, bonus and death all apply.
    // In a prompt room a phrase ("start over", "thanks") is the pane answering, so the chirps keep only their shout
    // lines, as for a prompt.
    const quiet = { suppressWrapAndRepeat: promptRoom };
    if (phrase && phraseThen) return { res: applyRule(b, { id: phraseThen.id ?? phrase.id, when: { verb: 'unknown' }, then: phraseThen.then }, world, parsed), opts: quiet };
    if (phrase) {
      const state = { ...b, dead: b.dead || !!phrase.death };
      return { res: {
        state,
        output: [typeof phrase.text === 'function' ? phrase.text(state, world) : phrase.text],
        outcome: phrase.death ? 'death' : 'snark',
        stepId: phrase.id,
        pointsAwarded: 0,
        parsed,
        deathCause: phrase.death,
        sfx: phrase.sfx,
      }, opts: quiet };
    }
    // 1b. Inside a realm, any other way of saying "out" ("outside", "go outside", "walk out") leaves it too.
    if (insideRealm && parsed.verb === 'go' && parsed.dir === 'out') return { res: applyRule(b, { id: 'sq.exit', when: { verb: 'unknown' }, then: EXIT_THEN }, world, parsed) };
    // 1c. QUIT inside a realm leaves the realm, not the quest (the UI retires the run only on the builtin's 'meta' quit).
    if (insideRealm && parsed.verb === 'quit') {
      const left = applyRule(b, { id: 'sq.exit.quit', when: { verb: 'unknown' }, then: EXIT_THEN }, world, parsed);
      return { res: { ...left, output: [left.output[0]!, quitInRealmText(SIDE_REALM_NAME[hereRegion]!), ...left.output.slice(1)] } };
    }
    // 2. Room rules, then global rules — first match wins.
    const room = here;
    const rule = room.rules.find((r) => ruleMatches(b, parsed, r)) ?? world.globalRules.find((r) => ruleMatches(b, parsed, r));
    if (rule) return { res: applyRule(b, rule, world, parsed) };
    // A prompt room hears every line except navigation, meta and item handling; elsewhere only say / unknown / "talk … copilot".
    // get / drop / read stay commands only when their noun is something here ("get prompt box"); "get me q4 sales" is a prompt.
    const wantsCatchAll = promptRoom
      ? !NAV_VERBS.has(parsed.verb) || (ITEM_VERBS.has(parsed.verb) && !B.resolveNoun(b, world, parsed.noun))
      : parsed.verb === 'say' || parsed.verb === 'unknown' || (parsed.verb === 'talk' && /copilot/.test(lower));
    const catchAll = wantsCatchAll ? room.catchAll?.(b, heard) : undefined;
    // A prompt room answers wrappers and repeats in its own voice, so the chirps keep only their shout lines.
    if (catchAll) return { res: applyRule(b, { id: catchAll.id ?? `${b.room}.catchall`, when: { verb: 'unknown' }, then: catchAll.then }, world, parsed), opts: { suppressWrapAndRepeat: promptRoom } };
    // 3. Built-in verbs.
    const built = B.handle(b, parsed, world);
    if (built) return { res: { ...built, parsed, pointsAwarded: 0, stepId: built.stepId ?? b.room } };
    return { res: { state: b, output: [pickSnark(b.seed, b.turns, world.snark)], outcome: 'snark', stepId: b.room, pointsAwarded: 0, parsed } };
  };

  const { res, opts } = resolve(base);
  return finish(res, opts ?? {});
}

/** Test-only: apply one rule directly. */
export const applyRuleForTest = (s: GameState, r: Rule, world: World) => applyRule(s, r, world, parse(''));
