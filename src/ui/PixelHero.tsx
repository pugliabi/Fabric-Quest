/**
 * An original hooded Report Builder, drawn as a 24×30 pixel grid: brown hood,
 * a "World's Okayest Analyst" mug in hand, a tiny report tucked under the arm.
 * Palette: EGA-ish. '.' transparent.
 */
const PALETTE: Record<string, string> = {
  k: '#000000', // outline
  h: '#555555', // hood shadow
  H: '#aa5500', // hood brown
  f: '#ffaa55', // face
  e: '#0000aa', // eyes
  m: '#aa0000', // mouth
  w: '#ffffff', // mug
  c: '#aaaaaa', // mug shade
  y: '#ffff55', // steam / report edge
  b: '#00aa00', // report green
  r: '#ff5555', // pie chart slice
};

const ROWS = [
  '........................',
  '..........kkkkk.........',
  '.........kHHHHHk........',
  '........kHHHHHHHk.......',
  '.......kHHhhhhhHHk......',
  '.......kHhfffffhHk......',
  '.......kHhfefefhHk......',
  '.......kHhfffffhHk......',
  '.......kHhffmmfhHk......',
  '.......kHhhfffhhHk......',
  '.......kHHHhhhHHHk......',
  '......kHHHHHHHHHHHk.....',
  '.....kHHHHHHHHHHHHHk....',
  '....kHHHHHHHHHHHHHHHk...',
  '....kHHHHHHHHHHHHHHHk...',
  '.y..kHHHHHHHHHHHHHHHk...',
  '..y.kHHHHHHHHHHHHHHHk...',
  '.kwwkHHHHHHHHHHHkbbbk...',
  '.kwwwkHHHHHHHHHHkbrbk...',
  '.kwcwkHHHHHHHHHHkbbbk...',
  '.kwwwkHHHHHHHHHHkyyyk...',
  '..kkkkHHHHHHHHHHHHHHk...',
  '....kHHHHHHHHHHHHHHHk...',
  '....kHHHHHHHHHHHHHHHk...',
  '....kHHHHHHHHHHHHHHHk...',
  '....kHHHHHHHHHHHHHHHk...',
  '....kHHHHHHHHHHHHHHHk...',
  '....kHHHHHHHHHHHHHHHk...',
  '....kkkkkkkkkkkkkkkkk...',
  '........................',
];

export function PixelHero({ size = 8 }: { size?: number }) {
  const w = ROWS[0]!.length * size;
  const h = ROWS.length * size;
  return (
    <svg className="hero" viewBox={`0 0 ${w} ${h}`} width={w} height={h} shapeRendering="crispEdges" aria-hidden="true">
      {ROWS.flatMap((row, y) =>
        [...row].map((c, x) =>
          c === '.' ? null : <rect key={`${x}-${y}`} x={x * size} y={y * size} width={size} height={size} fill={PALETTE[c]} />
        )
      )}
    </svg>
  );
}
