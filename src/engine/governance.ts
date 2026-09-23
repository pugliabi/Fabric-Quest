import type { GameState, StepResult } from './types';
import type { World } from '../world/types';
import { SIDE_REGIONS } from '../world/types';

/**
 * The governance layer (spec2 §3, §9). Settings are flags `ts.<key>`; absent means the default, and every default
 * keeps the game behaving exactly as it did before the Sacristy existed. The prose for each setting lives in
 * src/world/sacristy.ts (the SETTINGS catalog); this file is the mechanics.
 */
export type Shelf = 'tenant' | 'capacity';
export type SettingKey =
  | 'export' | 'copilot' | 'fabricItems' | 'publishToWeb' | 'guests' | 'publishOrg' | 'blockInternet' | 'feedback' | 'usageMetrics' | 'monitoring' | 'discover'
  | 'pause' | 'autoscale' | 'surge' | 'xmla' | 'workloads';
export type Setting = {
  key: SettingKey; shelf: Shelf;
  /** The real Fabric setting name. */
  title: string;
  /** Lowercase words that name this book (any one of them, or the full title). */
  words: string[];
  /** Two sentences paraphrasing the Learn text, ending with "Here, that means: …". */
  read: string;
  /** The flip lines (ON / OFF). For a killing book, `on` is the death text: the output line, a newline, the card line. */
  on: string; off: string;
  /** One line: the consequence, appended to the book's `read`. */
  effect: string;
  /** Death cause when flipping ON kills you. */
  die?: string;
};

export const SETTING_KEYS: readonly SettingKey[] = ['export', 'copilot', 'fabricItems', 'publishToWeb', 'guests', 'publishOrg', 'blockInternet', 'feedback', 'usageMetrics', 'monitoring', 'discover', 'pause', 'autoscale', 'surge', 'xmla', 'workloads'];
export const DEFAULTS: Record<SettingKey, boolean> = {
  export: true, copilot: true, fabricItems: true, publishToWeb: true, guests: false, publishOrg: true, blockInternet: false, feedback: false, usageMetrics: false, monitoring: false, discover: true,
  pause: false, autoscale: false, surge: false, xmla: true, workloads: true,
};
export const flagOf = (key: SettingKey): string => `ts.${key}`;

/** The default, which the Abbot's errand moves for publishToWeb (spec2 §5: after the errand, OFF is the new default). */
export function defaultOf(s: GameState, key: SettingKey): boolean {
  return key === 'publishToWeb' && s.flags['gov.errandDone'] ? false : DEFAULTS[key];
}
export function setting(s: GameState, key: SettingKey): boolean {
  const v = s.flags[flagOf(key)];
  return typeof v === 'boolean' ? v : defaultOf(s, key);
}
/** Guests in, apps to the whole org: the whole organization is in the Square (spec2 §3.5). Computed, never stored. */
export const isFlood = (s: GameState): boolean => setting(s, 'guests') && setting(s, 'publishOrg');
export const changedFromDefault = (s: GameState): SettingKey[] => SETTING_KEYS.filter((k) => setting(s, k) !== defaultOf(s, k));

/** "The Sacristy" reads as "the Sacristy" mid-sentence. */
const SURVEYS = (roomName: string) => [`[Survey] How likely are you to recommend ${roomName.replace(/^The /, 'the ')} to a colleague? (0–10)`, '[Survey] Was this dragon helpful?', '[Survey] Rate your refresh.',
  // The voice sweep (Task F11) added two; the walk is offset (below) so the fifteenth turn still asks the first one.
  '[Survey] How satisfied are you with this survey? (0–10)', '[Survey] We noticed you paused. Is everything OK? (0–10)'];
const USAGE = ['Usage metrics: Jeff viewed this room 14 times.', 'Usage metrics: someone in Finance opened your report at 2:14 a.m.', 'Usage metrics: you. It was you.',
  'Usage metrics: 0 views this week. The report would like to talk.', 'Usage metrics: Jeff exported this sentence to Excel.'];
const BILL = 'A bill arrives. Autoscale: 1 CU-hour. Finance would like a word.';

/** Trailing lines from the settings that nag (spec2 §3.3–3.4). Runs after the quirks; never in a side realm, never on a dead or won turn. */
export function applyGovernance(_prev: GameState, result: StepResult, world: World): StepResult {
  const s = result.state;
  if (s.dead || s.won || SIDE_REGIONS.has(world.rooms[s.room]!.region)) return result;
  const extra: string[] = [];
  const t = s.turns;
  let survey = false;
  if (setting(s, 'feedback') && t % 5 === 0) { const pool = SURVEYS(world.rooms[s.room]!.name); extra.push(pool[(t / 5 + 2) % pool.length]!); survey = true; }
  if (setting(s, 'usageMetrics') && t % 4 === 0) extra.push(USAGE[(t / 4) % USAGE.length]!);
  if (setting(s, 'autoscale') && t % 10 === 0) extra.push(BILL);
  if (!extra.length) return result;
  // The survey's ding-dong (spec2 §10), unless the turn already asked for a cue of its own.
  return { ...result, output: [...result.output, ...extra], ...(survey && !result.sfx ? { sfx: 'survey' } : {}) };
}
