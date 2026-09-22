import { useEffect, useRef, useState } from 'react';
import { play } from '@/game/sfx';

/** Two-frame running figure, 12×16 cells. */
const RUN_A = [
  '.....kkk....', '....kwwwk...', '....kwwwk...', '.....kwk....', '....kwwwk...', '...kwwwwwk..', '..kwkwwwkwk.', '.kwk.kwk.kwk',
  '.....kwk....', '....kwwwk...', '...kwk.kwk..', '..kwk...kwk.', '.kwk.....kwk', 'kwk.......kk', 'kk..........', '............',
];
const RUN_B = [
  '.....kkk....', '....kwwwk...', '....kwwwk...', '.....kwk....', '....kwwwk...', '...kwwwwwk..', '....kwwwk...', '...kwkwkwk..',
  '.....kwk....', '....kwwwk...', '....kwkwk...', '....kwkwk...', '....kwkwk...', '...kwk.kwk..', '...kk...kk..', '............',
];

/** Puglia BI mark, 26×18 cells: rising bars inside the angled bracket. */
const LOGO_MARK = [
  '........................ww',
  '.....................www.w',
  '..................www....w',
  '...............www.......w',
  '...........wwww....ggg...w',
  '........www........ggg...w',
  '.....www...........ggg...w',
  '..www.........ggg..ggg...w',
  'ww............ggg..ggg...w',
  'w.............ggg..ggg...w',
  'w........ggg..ggg..ggg...w',
  'w........ggg..ggg..ggg...w',
  'w........ggg..ggg..ggg...w',
  'w...ggg..ggg..ggg..ggg...w',
  'w...ggg..ggg..ggg..ggg...w',
  'w...ggg..ggg..ggg..ggg...w',
  'w...ggg..ggg..ggg..ggg...w',
  'wwwwwwwwwwwwwwwwwwwwwwwwww',
];
export const PUGLIA_GREEN = '#4ce88c';
const PBI_YELLOW = '#f2c811'; // the Power BI yellow

function LogoMark({ px = 3 }: { px?: number }) {
  return (
    <svg viewBox={`0 0 ${26 * px} ${18 * px}`} width={26 * px} height={18 * px} shapeRendering="crispEdges" aria-hidden="true" className="logo-mark">
      {LOGO_MARK.flatMap((row, y) => [...row].map((c, x) => (c === '.' ? null : <rect key={`${x}-${y}`} x={x * px} y={y * px} width={px} height={px} fill={c === 'w' ? '#fff' : PUGLIA_GREEN} />)))}
    </svg>
  );
}

/** Batter, 16×16 cells: ready stance (bat up) and the swing (bat out front). 'b' = bat. */
const BAT_READY = [
  '.....kkk......bb', '....kwwwk....bb.', '....kwwwk...bb..', '.....kwk...bb...', '....kwwwk.bb....', '...kwwwwwkb.....', '..kwkwwwkwk.....', '.kwk.kwk.kk.....',
  '.....kwk........', '....kwwwk.......', '...kwk.kwk......', '..kwk...kwk.....', '.kwk.....kwk....', 'kwk.......kk....', 'kk..............', '................',
];
const BAT_SWING = [
  '.....kkk........', '....kwwwk.......', '....kwwwk.......', '.....kwk........', '....kwwwk.......', '...kwwwwwk......', '..kwkwwwkwkbbbbb', '.kwk.kwk.kkbbbbb',
  '.....kwk........', '....kwwwk.......', '...kwk.kwk......', '..kwk...kwk.....', '.kwk.....kwk....', 'kwk.......kk....', 'kk..............', '................',
];

function Batter({ frame, px = 6 }: { frame: 0 | 1; px?: number }) {
  const rows = frame === 0 ? BAT_READY : BAT_SWING;
  return (
    <svg viewBox={`0 0 ${16 * px} ${16 * px}`} width={16 * px} height={16 * px} shapeRendering="crispEdges" aria-hidden="true">
      {rows.flatMap((row, y) => [...row].map((c, x) => (c === '.' ? null : <rect key={`${x}-${y}`} x={x * px} y={y * px} width={px} height={px} fill={c === 'k' ? '#000' : c === 'b' ? '#c8a060' : '#fff'} />)))}
    </svg>
  );
}

function Ball({ px = 6 }: { px?: number }) {
  return (
    <svg viewBox={`0 0 ${3 * px} ${3 * px}`} width={3 * px} height={3 * px} shapeRendering="crispEdges" aria-hidden="true">
      <rect x={px} y={0} width={px} height={px} fill={PBI_YELLOW} /><rect x={0} y={px} width={3 * px} height={px} fill={PBI_YELLOW} /><rect x={px} y={2 * px} width={px} height={px} fill={PBI_YELLOW} />
    </svg>
  );
}

/** The pitcher, 12×16: a figure with the throwing arm out to the left. */
const PITCHER = [
  '.....kkk....', '....kwwwk...', '....kwwwk...', '.....kwk....', '....kwwwk...', 'kkkkwwwwwk..', 'kwwwkwwwkwk.', 'kkk.kwk.kwk.',
  '.....kwk....', '....kwwwk...', '...kwk.kwk..', '...kwk.kwk..', '...kwk.kwk..', '...kwk.kwk..', '...kk...kk..', '............',
];
function Pitcher({ px = 6 }: { px?: number }) {
  return (
    <svg viewBox={`0 0 ${12 * px} ${16 * px}`} width={12 * px} height={16 * px} shapeRendering="crispEdges" aria-hidden="true">
      {PITCHER.flatMap((row, y) => [...row].map((c, x) => (c === '.' ? null : <rect key={`${x}-${y}`} x={x * px} y={y * px} width={px} height={px} fill={c === 'k' ? '#000' : '#fff'} />)))}
    </svg>
  );
}

function Runner({ frame, px = 6 }: { frame: 0 | 1; px?: number }) {
  const rows = frame === 0 ? RUN_A : RUN_B;
  return (
    <svg viewBox={`0 0 ${12 * px} ${16 * px}`} width={12 * px} height={16 * px} shapeRendering="crispEdges" aria-hidden="true">
      {rows.flatMap((row, y) => [...row].map((c, x) => (c === '.' ? null : <rect key={`${x}-${y}`} x={x * px} y={y * px} width={px} height={px} fill={c === 'k' ? '#000' : '#fff'} />)))}
    </svg>
  );
}

/**
 * Publisher splash: a black screen, the wordmark, one figure running across it, one big jingle.
 * The first click "boots" the game (satisfies autoplay rules), then the splash plays and hands off to the title.
 */
export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [booted, setBooted] = useState(false);
  const [t, setT] = useState(0); // 0..1 progress of the run
  const raf = useRef<number | null>(null);
  const done = useRef(false);

  useEffect(() => {
    if (!booted) return;
    play('splash');
    const start = performance.now();
    const DURATION = 4600;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / DURATION);
      setT(p);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else finish();
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booted]);

  const finish = () => { if (!done.current) { done.current = true; onDone(); } };

  // 0–0.24: the pitch comes in from the right. 0.24–0.32: the swing. 0.32–1: the ball sails out and he runs it out.
  const PITCH_START = 0.04, CONTACT = 0.24, RUN = 0.32;
  const phase: 'ready' | 'swing' | 'run' = t < CONTACT ? 'ready' : t < RUN ? 'swing' : 'run';
  const runT = Math.max(0, (t - RUN) / (1 - RUN));
  const frame: 0 | 1 = Math.floor(runT * 22) % 2 === 0 ? 0 : 1;
  const left = runT * 108; // percent of width
  let ballLeft = -10, ballTop = 0, ballVisible = false;
  if (t >= PITCH_START && t < CONTACT) {
    // pitched: straight in from the right edge to the bat, at bat height
    const p = (t - PITCH_START) / (CONTACT - PITCH_START);
    ballLeft = 90 - p * 76; ballTop = 52 + Math.sin(p * Math.PI) * 4; ballVisible = true;
  } else if (t >= CONTACT && t < CONTACT + 0.5) {
    // hit: up and away over the wordmark
    const p = (t - CONTACT) / 0.5;
    ballLeft = 14 + p * 95; ballTop = 52 - p * 70 + p * p * 24; ballVisible = true;
  }
  if (!booted) {
    return (
      <div className="screen splash" onClick={() => setBooted(true)} onKeyDown={() => setBooted(true)} tabIndex={0} role="button" aria-label="Boot the game">
        <div className="boot">
          <div className="boot-line">FABRIC&rsquo;S QUEST</div>
          <div className="boot-line dim">320×200 · 16 colors · 1 dragon</div>
          <div className="boot-line blink">CLICK ANYWHERE TO BOOT</div>
        </div>
      </div>
    );
  }
  return (
    <div className="screen splash" onClick={finish} role="presentation">
      <div className="splash-stage">
        <div className="wordmark">
          <LogoMark />
          <span className="wordmark-big">PUGLIA</span>
          <span className="wordmark-small">BI</span>
        </div>
        <div className="wordmark-sub">consulting &middot; analytics &middot; training</div>
        <div className="wordmark-presents">presents</div>
        {phase === 'run' ? (
          <div className="runner" style={{ left: `${left}%` }}><Runner frame={frame} /></div>
        ) : (
          <div className="runner" style={{ left: 0 }}><Batter frame={phase === 'swing' ? 1 : 0} /></div>
        )}
        {t < RUN + 0.35 && <div className="runner pitcher" style={{ right: 0 }}><Pitcher /></div>}
        {ballVisible && <div className="ball" style={{ left: `${ballLeft}%`, top: `${ballTop}%` }}><Ball /></div>}
      </div>
    </div>
  );
}
