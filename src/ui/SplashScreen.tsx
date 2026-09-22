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

function LogoMark({ px = 3 }: { px?: number }) {
  return (
    <svg viewBox={`0 0 ${26 * px} ${18 * px}`} width={26 * px} height={18 * px} shapeRendering="crispEdges" aria-hidden="true" className="logo-mark">
      {LOGO_MARK.flatMap((row, y) => [...row].map((c, x) => (c === '.' ? null : <rect key={`${x}-${y}`} x={x * px} y={y * px} width={px} height={px} fill={c === 'w' ? '#fff' : PUGLIA_GREEN} />)))}
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
    const DURATION = 3200;
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

  const frame: 0 | 1 = Math.floor(t * 16) % 2 === 0 ? 0 : 1;
  const left = -12 + t * 116; // percent of width

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
        <div className="runner" style={{ left: `${left}%` }}><Runner frame={frame} /></div>
      </div>
    </div>
  );
}
