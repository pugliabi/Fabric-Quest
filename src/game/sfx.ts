/**
 * Chiptune cues synthesized with the Web Audio API — no audio files.
 * Square waves for the "PC speaker / NES" feel, a triangle for softer blips.
 */
export type Cue = 'title' | 'splash' | 'move' | 'success' | 'item' | 'fail' | 'snark' | 'door' | 'death' | 'win' | 'flask' | 'type';

type Note = [freq: number, ms: number, wave?: OscillatorType, gain?: number];

// Frequencies in Hz. 0 = rest.
const C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23, G4 = 392.0, A4 = 440.0, B4 = 493.88;
const C5 = 523.25, D5 = 587.33, E5 = 659.25, G5 = 783.99, C6 = 1046.5;
const B3 = 246.94, A3 = 220.0, E3 = 164.81, C3 = 130.81;

const CUES: Record<Cue, Note[]> = {
  // "do, do, do, dooo" — the title jingle
  title: [[C4, 120], [E4, 120], [G4, 120], [C5, 260], [0, 60], [G4, 100], [C5, 380]],
  // the big boot-up: "do do do DOOO" with a bass under it
  splash: [[C3, 140, 'square', 0.2], [C4, 140], [E4, 140], [G4, 140], [C5, 420, 'square', 0.16], [0, 80], [G4, 90], [A4, 90], [B4, 90], [C5, 700, 'square', 0.18], [0, 120], [C6, 260, 'triangle', 0.14]],
  move: [[E4, 40, 'triangle', 0.15]],
  type: [[C6, 12, 'square', 0.05]],
  success: [[G4, 80], [C5, 160]],
  item: [[C5, 70], [E5, 70], [G5, 70], [C6, 180]],
  fail: [[B3, 90, 'square', 0.18], [A3, 160, 'square', 0.18]],
  snark: [[D5, 70], [A4, 140]],
  door: [[C4, 60], [D4, 60], [E4, 60], [F4, 60], [G4, 60], [A4, 60], [B4, 60], [C5, 220]],
  death: [[E4, 180], [D4, 180], [C4, 180], [B3, 260], [0, 80], [E3, 420, 'square', 0.22]],
  win: [[C4, 100], [E4, 100], [G4, 100], [C5, 200], [0, 40], [E5, 100], [D5, 100], [C5, 100], [G5, 380], [0, 60], [C6, 500]],
  flask: [[A4, 60], [G4, 60], [F4, 60], [E4, 60], [0, 40], [C3, 200, 'square', 0.2]],
};

let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch { return null; }
}

export function setSfxMuted(m: boolean): void { muted = m; if (m) stopTheme(); }
export function isSfxMuted(): boolean { return muted; }

/** Must first be called from a user gesture (click/keypress) so the browser allows audio. */
export function play(cue: Cue): void {
  if (muted) return;
  const ac = getCtx();
  if (!ac) return;
  let t = ac.currentTime;
  for (const [freq, ms, wave = 'square', gain = 0.12] of CUES[cue]) {
    const dur = ms / 1000;
    if (freq > 0) {
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(g).connect(ac.destination);
      osc.start(t);
      osc.stop(t + dur);
    }
    t += dur + 0.012;
  }
}

/** Map a turn outcome to a cue when the rule did not name one. */
export function cueForOutcome(outcome: string, pointsAwarded: number): Cue | null {
  switch (outcome) {
    case 'move': return 'move';
    case 'success': return pointsAwarded > 0 ? 'item' : 'success';
    case 'fail': return 'fail';
    case 'snark': return 'snark';
    case 'death': return 'death';
    case 'win': return 'win';
    default: return null;
  }
}

/* ------------------------------------------------------------------ */
/* Title theme — a looping 8-bit overture                                */
/* ------------------------------------------------------------------ */

const A2 = 110.0, C3b = 130.81, E2 = 82.41, F2 = 87.31, G2 = 98.0;
const A5 = 880.0, B5 = 987.77, F5 = 698.46;
const REST = 0;

// Lead, in eighth notes: [freq, eighths]. Am – F – C – G (x2), Am – G – F – E, Am – F – C/G – Am.
const THEME_LEAD: [number, number][] = [
  [A4, 2], [E5, 2], [A5, 2], [G5, 1], [E5, 1],
  [F5, 2], [E5, 1], [D5, 1], [C5, 2], [D5, 2],
  [E5, 2], [C5, 2], [G5, 2], [E5, 2],
  [D5, 3], [B4, 1], [G4, 2], [B4, 1], [D5, 1],
  [A4, 2], [E5, 2], [A5, 2], [B5, 1], [A5, 1],
  [G5, 2], [F5, 1], [E5, 1], [F5, 2], [A5, 2],
  [G5, 2], [E5, 2], [C6, 2], [B5, 1], [G5, 1],
  [A5, 2], [G5, 1], [F5, 1], [E5, 2], [D5, 2],
  [C5, 2], [A4, 2], [E5, 4],
  [D5, 2], [B4, 2], [G5, 4],
  [C5, 2], [A4, 2], [F5, 2], [E5, 2],
  [D5, 1], [C5, 1], [B4, 2], [E5, 4],
  [A5, 2], [E5, 2], [C6, 2], [B5, 1], [A5, 1],
  [G5, 3], [F5, 1], [E5, 2], [F5, 2],
  [E5, 2], [G5, 2], [D5, 2], [B4, 2],
  [A4, 6], [REST, 2],
];
// Bass roots per bar, one bar = 8 eighths; pattern R R 5 R  R R 5 5 (5 = fifth, an octave up feel).
const THEME_BASS_ROOTS = [A2, F2, C3b, G2, A2, F2, C3b, G2, A2, G2, F2, E2, A2, F2, C3b, A2];
const BASS_PATTERN = [0, 0, 7, 0, 0, 0, 7, 7]; // semitone offsets
const EIGHTH = 0.19; // seconds — ~158 BPM

let themeTimer: number | undefined;
let themeNodes: AudioNode[] = [];
let themeOn = false;

function scheduleThemeLoop(ac: AudioContext, start: number): number {
  let t = start;
  for (const [freq, n] of THEME_LEAD) {
    const dur = n * EIGHTH;
    if (freq > 0) {
      const osc = ac.createOscillator(); const g = ac.createGain();
      osc.type = 'square'; osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.09, t); g.gain.setValueAtTime(0.09, t + dur * 0.8); g.gain.exponentialRampToValueAtTime(0.001, t + dur - 0.01);
      osc.connect(g).connect(ac.destination); osc.start(t); osc.stop(t + dur); themeNodes.push(osc);
    }
    t += dur;
  }
  let b = start;
  for (const root of THEME_BASS_ROOTS) {
    for (const semis of BASS_PATTERN) {
      const osc = ac.createOscillator(); const g = ac.createGain();
      osc.type = 'triangle'; osc.frequency.setValueAtTime(root * Math.pow(2, semis / 12), b);
      g.gain.setValueAtTime(0.16, b); g.gain.exponentialRampToValueAtTime(0.001, b + EIGHTH * 0.9);
      osc.connect(g).connect(ac.destination); osc.start(b); osc.stop(b + EIGHTH); themeNodes.push(osc);
      b += EIGHTH;
    }
  }
  return t; // end of the loop
}

/** Start the looping title theme. Safe to call repeatedly; needs a prior user gesture. */
export function startTheme(): void {
  if (muted || themeOn) return;
  const ac = getCtx();
  if (!ac) return;
  themeOn = true;
  const loop = (at: number) => {
    if (!themeOn) return;
    themeNodes = [];
    const end = scheduleThemeLoop(ac, at);
    themeTimer = window.setTimeout(() => loop(end), Math.max(0, (end - ac.currentTime) * 1000 - 250));
  };
  loop(ac.currentTime + 0.05);
}

export function stopTheme(): void {
  themeOn = false;
  if (themeTimer !== undefined) { window.clearTimeout(themeTimer); themeTimer = undefined; }
  for (const n of themeNodes) { try { (n as OscillatorNode).stop(); } catch { /* already stopped */ } }
  themeNodes = [];
}

export function isThemePlaying(): boolean { return themeOn; }
