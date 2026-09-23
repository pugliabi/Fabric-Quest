/**
 * Drawing kit for AGI-style 320×200 scenes: flat fills, black outlines, EGA palette.
 * Everything is SVG with crispEdges; coordinates are kept on even numbers for a chunky look.
 */
import type { ReactNode } from 'react';

export const EGA = {
  black: '#000000', blue: '#0000AA', green: '#00AA00', cyan: '#00AAAA', red: '#AA0000', magenta: '#AA00AA',
  brown: '#AA5500', lgray: '#AAAAAA', dgray: '#555555', lblue: '#5555FF', lgreen: '#55FF55', lcyan: '#55FFFF',
  lred: '#FF5555', lmagenta: '#FF55FF', yellow: '#FFFF55', white: '#FFFFFF',
} as const;
export type Color = (typeof EGA)[keyof typeof EGA];

export const W = 320;
export const H = 200;
const K = EGA.black;

export function Scene({ children, bg = K }: { children: ReactNode; bg?: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" shapeRendering="crispEdges" className="scene-svg" aria-hidden="true">
      <rect x={0} y={0} width={W} height={H} fill={bg} />
      {children}
    </svg>
  );
}

/** Rectangle. `rx` rounds the corners (modern UI chrome in the side realms); omit it for the usual square EGA block. */
export const R = ({ x, y, w, h, f, s = K, sw = 2, rx }: { x: number; y: number; w: number; h: number; f: string; s?: string | null; sw?: number; rx?: number }) => (
  <rect x={x} y={y} width={w} height={h} rx={rx} fill={f} stroke={s ?? undefined} strokeWidth={s ? sw : 0} />
);
export const P = ({ pts, f, s = K, sw = 2 }: { pts: number[][]; f: string; s?: string | null; sw?: number }) => (
  <polygon points={pts.map((p) => p.join(',')).join(' ')} fill={f} stroke={s ?? undefined} strokeWidth={s ? sw : 0} />
);
export const L = ({ pts, s = K, sw = 2 }: { pts: number[][]; s?: string; sw?: number }) => (
  <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={s} strokeWidth={sw} />
);

/** Pixel sprite from row strings. Map single chars to colors; '.' is transparent. */
export function Sprite({ rows, pal, x, y, px = 2 }: { rows: string[]; pal: Record<string, string>; x: number; y: number; px?: number }) {
  const out: ReactNode[] = [];
  rows.forEach((row, ry) => {
    let rx = 0;
    while (rx < row.length) {
      const c = row[rx]!;
      if (c === '.') { rx++; continue; }
      let len = 1;
      while (rx + len < row.length && row[rx + len] === c) len++;
      out.push(<rect key={`${rx}-${ry}`} x={x + rx * px} y={y + ry * px} width={len * px} height={px} fill={pal[c] ?? EGA.lmagenta} />);
      rx += len;
    }
  });
  return <>{out}</>;
}

/* ------------------------------------------------------------------ */
/* Room shells                                                          */
/* ------------------------------------------------------------------ */

/** One-point-perspective interior: back wall, angled side walls, floor trapezoid. */
export function Interior({ wall, wallDark, floor, floorDark, ceiling = EGA.dgray }: { wall: string; wallDark: string; floor: string; floorDark?: string; ceiling?: string }) {
  return (
    <>
      <P pts={[[0, 0], [320, 0], [272, 18], [48, 18]]} f={ceiling} />
      <P pts={[[0, 0], [48, 18], [48, 118], [0, 200]]} f={wallDark} />
      <P pts={[[320, 0], [272, 18], [272, 118], [320, 200]]} f={wallDark} />
      <R x={48} y={18} w={224} h={100} f={wall} />
      <P pts={[[0, 200], [48, 118], [272, 118], [320, 200]]} f={floor} />
      {floorDark && <P pts={[[0, 200], [48, 118], [60, 118], [20, 200]]} f={floorDark} s={null} />}
    </>
  );
}

/** Outdoor shell: sky, distant band, ground. */
export function Exterior({ sky, ground, horizon = 110, band, night = false }: { sky: string; ground: string; horizon?: number; band?: string; night?: boolean }) {
  return (
    <>
      <R x={0} y={0} w={320} h={horizon} f={sky} s={null} />
      {night && <Stars />}
      {band && <R x={0} y={horizon - 14} w={320} h={14} f={band} s={null} />}
      <R x={0} y={horizon} w={320} h={200 - horizon} f={ground} s={null} />
      <L pts={[[0, horizon], [320, horizon]]} />
    </>
  );
}

export function Stars() {
  const pts = [[20, 12], [60, 30], [110, 8], [150, 26], [200, 14], [250, 34], [290, 10], [304, 44], [40, 50], [180, 40], [230, 6], [130, 46]];
  return <>{pts.map(([x, y], i) => <rect key={i} x={x} y={y} width={2} height={2} fill={EGA.white} />)}</>;
}

export function Moon({ x = 268, y = 24 }: { x?: number; y?: number }) {
  return (
    <>
      <R x={x} y={y} w={20} h={20} f={EGA.yellow} s={null} />
      <R x={x + 6} y={y - 4} w={20} h={20} f={EGA.black} s={null} />
      <R x={x + 6} y={y - 4} w={20} h={4} f={EGA.blue} s={null} />
      <R x={x + 22} y={y} w={4} h={16} f={EGA.blue} s={null} />
    </>
  );
}

export function Sun({ x = 40, y = 24 }: { x?: number; y?: number }) {
  return <R x={x} y={y} w={22} h={22} f={EGA.yellow} s={EGA.brown} />;
}

/* ------------------------------------------------------------------ */
/* Interior props                                                       */
/* ------------------------------------------------------------------ */

export function Bed({ x, y }: { x: number; y: number }) {
  return (
    <>
      <P pts={[[x, y + 26], [x + 70, y + 26], [x + 88, y + 44], [x + 18, y + 44]]} f={EGA.lblue} />
      <P pts={[[x, y + 26], [x, y + 40], [x + 18, y + 58], [x + 18, y + 44]]} f={EGA.blue} />
      <P pts={[[x + 18, y + 44], [x + 88, y + 44], [x + 88, y + 58], [x + 18, y + 58]]} f={EGA.blue} />
      <P pts={[[x + 4, y + 22], [x + 24, y + 22], [x + 30, y + 30], [x + 10, y + 30]]} f={EGA.white} />
      <R x={x - 4} y={y + 6} w={6} h={40} f={EGA.brown} />
    </>
  );
}

export function Table({ x, y, w = 60 }: { x: number; y: number; w?: number }) {
  return (
    <>
      <P pts={[[x, y + 10], [x + w, y + 10], [x + w + 16, y + 24], [x + 16, y + 24]]} f={EGA.lgreen} />
      <P pts={[[x + 16, y + 24], [x + w + 16, y + 24], [x + w + 16, y + 30], [x + 16, y + 30]]} f={EGA.green} />
      <R x={x + 18} y={y + 30} w={4} h={22} f={EGA.green} />
      <R x={x + w + 8} y={y + 30} w={4} h={22} f={EGA.green} />
      <R x={x + 2} y={y + 20} w={4} h={20} f={EGA.green} />
    </>
  );
}

export function Candle({ x, y }: { x: number; y: number }) {
  return (
    <>
      <R x={x} y={y} w={6} h={10} f={EGA.white} />
      <R x={x + 1} y={y - 5} w={4} h={5} f={EGA.yellow} s={null} />
      <R x={x + 2} y={y - 7} w={2} h={2} f={EGA.lred} s={null} />
    </>
  );
}

export function Mug({ x, y }: { x: number; y: number }) {
  return (
    <>
      <R x={x} y={y} w={8} h={8} f={EGA.white} />
      <R x={x + 8} y={y + 2} w={3} h={4} f={EGA.white} />
    </>
  );
}

export function Window({ x, y, w = 40, h = 44, night = true, frame = EGA.yellow }: { x: number; y: number; w?: number; h?: number; night?: boolean; frame?: string }) {
  const sky = night ? EGA.blue : EGA.lcyan;
  return (
    <>
      <R x={x} y={y} w={w} h={h} f={frame} />
      <R x={x + 4} y={y + 4} w={w - 8} h={h - 8} f={sky} />
      {night && [[x + 8, y + 8], [x + w - 12, y + 12], [x + 12, y + h - 16], [x + w - 10, y + h - 20]].map(([sx, sy], i) => <rect key={i} x={sx} y={sy} width={2} height={2} fill={EGA.white} />)}
      <R x={x + w / 2 - 2} y={y + 4} w={4} h={h - 8} f={frame} s={null} />
      <R x={x + 4} y={y + h / 2 - 2} w={w - 8} h={4} f={frame} s={null} />
    </>
  );
}

export function Door({ x, y, w = 36, h = 70, open = false, color = EGA.brown }: { x: number; y: number; w?: number; h?: number; open?: boolean; color?: string }) {
  return (
    <>
      <R x={x} y={y} w={w} h={h} f={open ? EGA.black : color} />
      {!open && <R x={x + w - 10} y={y + h / 2} w={4} h={4} f={EGA.yellow} s={null} />}
      {open && <P pts={[[x, y], [x + 12, y + 8], [x + 12, y + h + 10], [x, y + h]]} f={color} />}
    </>
  );
}

export function Rug({ x, y, w = 90, h = 26, color = EGA.red }: { x: number; y: number; w?: number; h?: number; color?: string }) {
  return (
    <>
      <P pts={[[x + 10, y], [x + w - 10, y], [x + w, y + h], [x, y + h]]} f={color} />
      <P pts={[[x + 18, y + 6], [x + w - 18, y + 6], [x + w - 10, y + h - 6], [x + 10, y + h - 6]]} f={color} s={EGA.yellow} />
    </>
  );
}

export function Painting({ x, y, w = 40, h = 28, scene = 'pie' }: { x: number; y: number; w?: number; h?: number; scene?: 'pie' | 'graph' | 'portrait' }) {
  return (
    <>
      <R x={x} y={y} w={w} h={h} f={EGA.brown} />
      <R x={x + 4} y={y + 4} w={w - 8} h={h - 8} f={EGA.lgray} s={null} />
      {scene === 'pie' && (
        <>
          <R x={x + w / 2 - 8} y={y + h / 2 - 8} w={16} h={16} f={EGA.lred} s={null} />
          <R x={x + w / 2} y={y + h / 2 - 8} w={8} h={8} f={EGA.yellow} s={null} />
          <R x={x + w / 2 - 8} y={y + h / 2} w={8} h={8} f={EGA.lblue} s={null} />
        </>
      )}
      {scene === 'graph' && <L pts={[[x + 6, y + h - 6], [x + 14, y + h - 12], [x + 22, y + h - 8], [x + w - 6, y + 6]]} s={EGA.green} />}
    </>
  );
}

export function Shelf({ x, y, w = 50, rows = 3 }: { x: number; y: number; w?: number; rows?: number }) {
  return (
    <>
      <R x={x} y={y} w={w} h={rows * 22 + 4} f={EGA.brown} />
      {Array.from({ length: rows }, (_, i) => (
        <g key={i}>
          <R x={x + 4} y={y + 4 + i * 22} w={w - 8} h={16} f={EGA.dgray} s={null} />
          {[EGA.lred, EGA.lgreen, EGA.lblue, EGA.yellow, EGA.lcyan].slice(0, Math.floor((w - 8) / 8)).map((c, j) => (
            <rect key={j} x={x + 6 + j * 8} y={y + 6 + i * 22 + (j % 2) * 2} width={6} height={12 - (j % 2) * 2} fill={c} />
          ))}
        </g>
      ))}
    </>
  );
}

export function Chest({ x, y, open = false }: { x: number; y: number; open?: boolean }) {
  return (
    <>
      <R x={x} y={y + 10} w={36} h={20} f={EGA.brown} />
      <R x={x} y={open ? y - 2 : y + 2} w={36} h={10} f={open ? EGA.dgray : EGA.brown} />
      <R x={x + 15} y={y + 12} w={6} h={6} f={EGA.yellow} />
    </>
  );
}

export function Desk({ x, y }: { x: number; y: number }) {
  return (
    <>
      <P pts={[[x, y], [x + 60, y], [x + 72, y + 12], [x + 12, y + 12]]} f={EGA.brown} />
      <R x={x + 12} y={y + 12} w={60} h={6} f={EGA.dgray} />
      <R x={x + 14} y={y + 18} w={4} h={24} f={EGA.brown} />
      <R x={x + 66} y={y + 18} w={4} h={24} f={EGA.brown} />
    </>
  );
}

export function Screen({ x, y, w = 40, h = 26, color = EGA.lcyan, lines = 3, running = false }: { x: number; y: number; w?: number; h?: number; color?: string; lines?: number; running?: boolean }) {
  return (
    <>
      <R x={x} y={y} w={w} h={h} f={EGA.dgray} />
      <R x={x + 3} y={y + 3} w={w - 6} h={h - 6} f={EGA.black} s={null} />
      {Array.from({ length: lines }, (_, i) => <rect key={i} x={x + 6} y={y + 6 + i * 5} width={w - 12 - i * 6} height={2} fill={color} />)}
      {running && <rect x={x + 6} y={y + h - 8} width={w - 12} height={3} fill={EGA.lred} />}
    </>
  );
}

export function Pedestal({ x, y }: { x: number; y: number }) {
  return (
    <>
      <P pts={[[x + 6, y], [x + 34, y], [x + 40, y + 6], [x, y + 6]]} f={EGA.lgray} />
      <R x={x + 8} y={y + 6} w={24} h={30} f={EGA.dgray} />
      <P pts={[[x - 4, y + 36], [x + 44, y + 36], [x + 48, y + 44], [x - 8, y + 44]]} f={EGA.lgray} />
    </>
  );
}

export function GoldenModel({ x, y, glow = true }: { x: number; y: number; glow?: boolean }) {
  return (
    <>
      {glow && [[x - 6, y + 4], [x + 24, y - 4], [x + 30, y + 14], [x - 10, y + 18]].map(([sx, sy], i) => <rect key={i} x={sx} y={sy} width={2} height={2} fill={EGA.yellow} />)}
      <P pts={[[x, y + 6], [x + 10, y], [x + 22, y], [x + 22, y + 14], [x + 12, y + 20], [x, y + 20]]} f={EGA.yellow} />
      <P pts={[[x + 10, y], [x + 22, y], [x + 22, y + 14], [x + 10, y + 14]]} f={EGA.brown} />
      <L pts={[[x, y + 6], [x + 10, y + 14], [x + 22, y + 14]]} />
      <L pts={[[x + 10, y + 14], [x + 12, y + 20]]} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Exterior props                                                       */
/* ------------------------------------------------------------------ */

export function Hut({ x, y, w = 80, h = 50, wall = EGA.dgray, roof = EGA.brown, door = true }: { x: number; y: number; w?: number; h?: number; wall?: string; roof?: string; door?: boolean }) {
  return (
    <>
      <R x={x} y={y} w={w} h={h} f={wall} />
      <P pts={[[x - 8, y], [x + w / 2, y - 26], [x + w + 8, y]]} f={roof} />
      {door && <R x={x + w / 2 - 8} y={y + h - 26} w={16} h={26} f={EGA.brown} />}
      <R x={x + 8} y={y + 10} w={14} h={12} f={EGA.yellow} />
    </>
  );
}

export function Tree({ x, y, s = 1, leaf = EGA.green }: { x: number; y: number; s?: number; leaf?: string }) {
  return (
    <>
      <R x={x + 8 * s} y={y + 20 * s} w={6 * s} h={18 * s} f={EGA.brown} />
      <P pts={[[x, y + 22 * s], [x + 11 * s, y], [x + 22 * s, y + 22 * s]]} f={leaf} />
      <P pts={[[x + 2 * s, y + 14 * s], [x + 11 * s, y - 6 * s], [x + 20 * s, y + 14 * s]]} f={leaf} />
    </>
  );
}

export function Well({ x, y }: { x: number; y: number }) {
  return (
    <>
      <R x={x} y={y + 20} w={30} h={16} f={EGA.lgray} />
      <R x={x + 2} y={y} w={4} h={20} f={EGA.brown} />
      <R x={x + 24} y={y} w={4} h={20} f={EGA.brown} />
      <P pts={[[x - 4, y], [x + 15, y - 12], [x + 34, y]]} f={EGA.brown} />
      <R x={x + 10} y={y + 22} w={10} h={6} f={EGA.black} s={null} />
    </>
  );
}

export function Signpost({ x, y, w = 40, text = '', color = EGA.brown, labelColor = EGA.yellow }: { x: number; y: number; w?: number; text?: string; color?: string; labelColor?: string }) {
  return (
    <>
      <R x={x + w / 2 - 3} y={y + 16} w={6} h={30} f={color} />
      <R x={x} y={y} w={w} h={18} f={color} />
      {text && <text x={x + w / 2} y={y + 13} fontSize="8" fontFamily="monospace" fontWeight="bold" fill={labelColor} textAnchor="middle">{text}</text>}
    </>
  );
}

export function Mountains({ y = 110, color = EGA.magenta, dark = EGA.dgray, snow = true }: { y?: number; color?: string; dark?: string; snow?: boolean }) {
  return (
    <>
      <P pts={[[0, y], [50, 40], [110, y]]} f={dark} />
      <P pts={[[80, y], [160, 20], [240, y]]} f={color} />
      <P pts={[[200, y], [270, 46], [320, y]]} f={dark} />
      {snow && <P pts={[[146, 46], [160, 20], [174, 46]]} f={EGA.white} />}
    </>
  );
}

export function Water({ y, h, color = EGA.blue, wave = EGA.lblue }: { y: number; h: number; color?: string; wave?: string }) {
  return (
    <>
      <R x={0} y={y} w={320} h={h} f={color} s={null} />
      {Array.from({ length: Math.floor(h / 12) }, (_, i) => (
        <g key={i}>
          {[20, 90, 160, 230, 290].map((wx, j) => <rect key={j} x={(wx + i * 17) % 300} y={y + 6 + i * 12} width={14} height={2} fill={wave} />)}
        </g>
      ))}
    </>
  );
}

export function Reeds({ x, y, n = 5, color = EGA.lgreen }: { x: number; y: number; n?: number; color?: string }) {
  return <>{Array.from({ length: n }, (_, i) => <rect key={i} x={x + i * 6} y={y - 10 - (i % 3) * 4} width={2} height={10 + (i % 3) * 4} fill={color} />)}</>;
}

export function Dock({ x, y }: { x: number; y: number }) {
  return (
    <>
      <P pts={[[x, y], [x + 70, y], [x + 90, y + 30], [x - 10, y + 30]]} f={EGA.brown} />
      {[0, 8, 16, 24].map((d, i) => <line key={i} x1={x - d / 3} y1={y + d} x2={x + 70 + d * 0.7} y2={y + d} stroke={EGA.black} strokeWidth={1} />)}
      <R x={x + 10} y={y + 30} w={4} h={20} f={EGA.brown} />
      <R x={x + 70} y={y + 30} w={4} h={20} f={EGA.brown} />
    </>
  );
}

export function Boat({ x, y, label = 'GATEWAY' }: { x: number; y: number; label?: string }) {
  return (
    <>
      <P pts={[[x, y], [x + 70, y], [x + 60, y + 16], [x + 10, y + 16]]} f={EGA.brown} />
      <R x={x + 32} y={y - 30} w={4} h={30} f={EGA.brown} />
      <P pts={[[x + 36, y - 28], [x + 58, y - 12], [x + 36, y - 6]]} f={EGA.white} />
      <text x={x + 35} y={y + 12} fontSize="7" fontFamily="monospace" fontWeight="bold" fill={EGA.yellow} textAnchor="middle">{label}</text>
    </>
  );
}

export function Lamp({ x, y, online }: { x: number; y: number; online: boolean }) {
  return (
    <>
      <R x={x} y={y} w={4} h={40} f={EGA.brown} />
      <R x={x - 4} y={y - 12} w={12} h={12} f={online ? EGA.lgreen : EGA.lred} />
    </>
  );
}

export function Battlements({ x, y, w, color = EGA.dgray }: { x: number; y: number; w: number; color?: string }) {
  return <>{Array.from({ length: Math.floor(w / 16) }, (_, i) => <rect key={i} x={x + i * 16} y={y} width={8} height={8} fill={color} stroke={EGA.black} strokeWidth={2} />)}</>;
}

export function Pipe({ x, y, w, h, color = EGA.lgray }: { x: number; y: number; w: number; h: number; color?: string }) {
  return (
    <>
      <R x={x} y={y} w={w} h={h} f={color} />
      {w > h ? <R x={x} y={y + 2} w={w} h={2} f={EGA.white} s={null} /> : <R x={x + 2} y={y} w={2} h={h} f={EGA.white} s={null} />}
    </>
  );
}

export function ProgressBar({ x, y, w = 100, pct }: { x: number; y: number; w?: number; pct: number }) {
  return (
    <>
      <R x={x} y={y} w={w} h={12} f={EGA.dgray} />
      <R x={x + 2} y={y + 2} w={Math.max(0, (w - 4) * pct)} h={8} f={EGA.lgreen} s={null} />
      <text x={x + w / 2} y={y - 4} fontSize="7" fontFamily="monospace" fill={EGA.white} textAnchor="middle">SESSION STARTING… {Math.round(pct * 100)}%</text>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* People                                                               */
/* ------------------------------------------------------------------ */

const PERSON_ROWS = [
  '...kkkk...',
  '..khhhhk..',
  '.khhhhhhk.',
  '.khffffhk.',
  '.khfefefhk',
  '.khffffhk.',
  '.khhffhhk.',
  '..khhhhk..',
  '.kbbbbbbk.',
  'kbbbbbbbbk',
  'kbbbbbbbbk',
  'kbbbbbbbbk',
  'kbbbbbbbbk',
  'kbbbbbbbbk',
  '.kbbbbbbk.',
  '.kbbbbbbk.',
  '.kbbbbbbk.',
  '.kkkkkkkk.',
];

/** A hooded/robed figure, 10×18 cells. robe = body color, hood = head covering (or skin for bareheaded). */
export function Person({ x, y, robe, hood, px = 2, skin = EGA.lred }: { x: number; y: number; robe: string; hood: string; px?: number; skin?: string }) {
  return <Sprite rows={PERSON_ROWS} pal={{ k: EGA.black, h: hood, f: skin, e: EGA.black, b: robe }} x={x} y={y} px={px} />;
}

const DRAGON_ROWS = [
  '..........................kk...........',
  '.........................kRRk..........',
  '........................kRRRRk.........',
  '.......................kRRRRRRk........',
  '..............kkkkk...kRRRRRRRRk.......',
  '.............kRRRRRkkkRRRRyRRRRk.......',
  '............kRRRRRRRRRRRRRRRRRRk.......',
  '...........kRRRRRRRRRRRRRRRRRRRk.......',
  '..........kRRRRRRRRRRRRRRRRRRRRk.......',
  '.........kRRRRRRRRRRRRRRRRRRRRk........',
  '........kRRRRRRRRRRRRRRRRRRRRk.........',
  '.......kRRRRRRRRRRRRRRRRRRRRRRk........',
  '......kRRRRRRRRRRRRRRRRRRRRRRRRk.......',
  '.....kRRRRRRRRRRRRRRRRRRRRRRRRRRk......',
  '....kRRRRRRRRRRRRkkkkkkRRRRRRRRRRk.....',
  '...kRRRRRRRRRRRRk......kRRRRRRRRRRk....',
  '..kRRRRRRRRRRRRk........kRRRRRRRRRRk...',
  '.kRRRRRRRRRRRRk..........kRRRRRRRRRRk..',
  'kRRRRRRRRRRRRk............kRRRRRRRRRRk.',
  'kRRRRRRRRRRRk..............kRRRRRRRRRk.',
  '.kRRRRRRRRRk................kRRRRRRRk..',
  '..kkkkkkkkk..................kkkkkkk...',
];

/** Throttlor, coiled. About 78×44 at px=2. */
export function Dragon({ x, y, px = 2 }: { x: number; y: number; px?: number }) {
  return (
    <>
      <Sprite rows={DRAGON_ROWS} pal={{ k: EGA.black, R: EGA.lred, y: EGA.yellow }} x={x} y={y} px={px} />
      {/* smoke, in neat intervals */}
      <rect x={x + 56 * px} y={y - 6} width={2} height={2} fill={EGA.lgray} />
      <rect x={x + 58 * px} y={y - 12} width={2} height={2} fill={EGA.lgray} />
      <rect x={x + 60 * px} y={y - 18} width={2} height={2} fill={EGA.lgray} />
    </>
  );
}

export function Scarecrow({ x, y }: { x: number; y: number }) {
  return (
    <>
      <R x={x + 8} y={y} w={4} h={50} f={EGA.brown} />
      <R x={x - 8} y={y + 14} w={36} h={4} f={EGA.brown} />
      <R x={x + 2} y={y - 10} w={16} h={14} f={EGA.yellow} />
      <R x={x + 6} y={y - 4} w={2} h={2} f={EGA.black} s={null} />
      <R x={x + 12} y={y - 4} w={2} h={2} f={EGA.black} s={null} />
      <R x={x - 2} y={y + 18} w={24} h={22} f={EGA.red} />
    </>
  );
}

/** Pixel-font text. `anchor` centres or right-aligns at x; `bold` for the rare number that must shout. */
export function Label({ x, y, text, color = EGA.white, size = 7, anchor, bold = false }: { x: number; y: number; text: string; color?: string; size?: number; anchor?: 'start' | 'middle' | 'end'; bold?: boolean }) {
  return <text x={x} y={y} fontSize={size} fontFamily="'Press Start 2P', monospace" fill={color} textAnchor={anchor} fontWeight={bold ? 'bold' : undefined}>{text}</text>;
}

/* ------------------------------------------------------------------ */
/* God mode                                                             */
/* ------------------------------------------------------------------ */

// A small dragon, facing left, burninating. Original sprite; not the one at the Shrine.
const GOD_DRAGON_ROWS = [
  '....................kk............',
  '...................kGGk...........',
  '..................kGGGGk..........',
  '..........kkkk...kGGGGGGk.........',
  '.........kGGGGk.kGGGGGGGGk........',
  '........kGyGGGGkGGGGGGGGGGk.......',
  '....YY.kGGGGGGGGGGGGGGGGGGGk......',
  '..YYRRkGkkkGGGGGGGGGGGGGGGGGk.....',
  'YYRRRRkGGGGGGGGGGGGGGGGGGGGGGk....',
  '.YYRRRkGGGGGGGGGGGGGGGGGGGGGGGk...',
  '...YYRkGGGGGGGGGkkkkGGGGGGkGGGGk..',
  '......kGGGGGGGGk....kGGGGkk.kGGGk.',
  '.......kkGGGGk.......kGGk....kGGGk',
  '.........kGkGk.......kGkGk....kkkk',
  '.........kk.kk.......kk.kk........',
];

/** The burninating dragon that hangs in the sky while god mode is on. */
export function GodDragon({ x = 186, y = 6, px = 2 }: { x?: number; y?: number; px?: number }) {
  return (
    <>
      <Sprite rows={GOD_DRAGON_ROWS} pal={{ k: EGA.black, G: EGA.green, y: EGA.yellow, Y: EGA.yellow, R: EGA.lred }} x={x} y={y} px={px} />
      <Label x={x + 8} y={y + 40} text="burninating" color={EGA.yellow} size={5} />
    </>
  );
}
