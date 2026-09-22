import type { GameState } from '../engine/types';

export type SaveBlob = {
  state: GameState;
  questId: string;
  playerName: string;
  startedAt: string;
  seq: number;
  log: string[];
  savedAt: string;
};

const SAVE_KEY = 'fabricsquest.save';
const CLIENT_KEY = 'fabricsquest.client';
const MUTE_KEY = 'fabricsquest.muted';

export function save(b: SaveBlob): boolean {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(b)); return true; } catch { return false; }
}
export function load(): SaveBlob | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const b = JSON.parse(raw) as SaveBlob;
    return b && b.state && b.questId ? b : null;
  } catch { return null; }
}
export function clearSave(): void {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}

/** A random id that persists per browser so repeat plays can be linked in the data. */
export function getClientId(): string {
  try {
    let id = localStorage.getItem(CLIENT_KEY);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(CLIENT_KEY, id); }
    return id;
  } catch { return crypto.randomUUID(); }
}

export function getMuted(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
}
export function setMuted(m: boolean): void {
  try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch { /* ignore */ }
}

/** Stable 32-bit hash of a string, for the engine seed. */
export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
