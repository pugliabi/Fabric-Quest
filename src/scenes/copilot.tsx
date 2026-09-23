/**
 * The Copilot realm: a pane that very much wants to help, and a gallery of three models on plinths.
 * Light chrome with rounded corners (R's `rx`), purple accents, and the same 320×200 chunkiness as everything else.
 */
import { EGA, R, P, L, Label, Pedestal } from './kit';
import { STAGE_HINTS, WIN_FIGURE, type Stage } from '../world/copilot-ladder';

const CANVAS = '#f3f2f1';
const PURPLE = '#6b4fbb';
const LILAC = '#e8e3f5';
const INK = '#242424';
const MUTED = '#8a8886';
const LINE = '#c8c6c4';

/** An original four-point sparkle: four long tips, four tucked-in corners (8 points). */
export function Sparkle({ x, y, r = 10, f = PURPLE }: { x: number; y: number; r?: number; f?: string }) {
  const i = Math.max(2, Math.round(r / 4));
  return <P pts={[[x, y - r], [x + i, y - i], [x + r, y], [x + i, y + i], [x, y + r], [x - i, y + i], [x - r, y], [x - i, y - i]]} f={f} s={null} />;
}

/** The card's number, by the stage that answered with a card (see the slot model); anything else gets a dash. */
const CARD: Partial<Record<number, [string, string]>> = {
  2: ['Sales Amount', '$4,285,337'],
  3: ['Net Sales, all regions', '$4,201,377'],
  4: ['Northeast Net Sales', '$2,933,012'],
  6: ['Q4 2025 NE Net Sales', WIN_FIGURE],
};
/** Stage 2's card is whichever wrong measure was named (flags['copilot.measure']: 2 amount, 3 gross, 4 returns); stage 3's is the wrong region. */
const CARD_BY_MEASURE: Partial<Record<number, [string, string]>> = { 3: ['Gross Sales', '$4,285,337'], 4: ['Returns', '$83,960'] };
const CARD_OTHER_REGION: [string, string] = ['Net Sales, your region', '$998,101'];

function Bubble({ shape, rung, measure, region }: { shape: number | undefined; rung: number | undefined; measure?: number; region?: number }) {
  const x = 24, y = 42, w = 272, h = 96;
  return (
    <>
      <R x={x} y={y} w={w} h={h} rx={8} f={EGA.white} s={LINE} />
      {shape === undefined && (
        <>
          <Sparkle x={160} y={78} r={8} f={LILAC} />
          <Label x={160} y={104} text="Ask me anything about your data" size={5} color={MUTED} anchor="middle" />
        </>
      )}
      {shape === 0 && ['Sales', 'Sales_2', 'SalesFact', 'Sales (old)', 'sales_test …'].map((t, i) => (
        <g key={t}>
          <R x={38} y={52 + i * 16} w={4} h={4} f={PURPLE} s={null} />
          <Label x={48} y={57 + i * 16} text={t} size={5} color={INK} />
        </g>
      ))}
      {(shape === 1 || shape === 5) && (
        <>
          <R x={40} y={52} w={240} h={24} f={LILAC} s={null} />
          {[0, 1, 2].flatMap((row) => [0, 1, 2, 3].map((col) => (
            <R key={`${row}-${col}`} x={46 + col * 60} y={62 + row * 24} w={row === 0 ? 34 : 20 + ((row * 7 + col * 13) % 26)} h={4} f={row === 0 ? PURPLE : LINE} s={null} />
          )))}
          {[0, 1, 2, 3, 4].map((i) => <L key={`v${i}`} pts={[[40 + i * 60, 52], [40 + i * 60, 124]]} s={LINE} sw={1} />)}
          {[0, 1, 2, 3].map((i) => <L key={`h${i}`} pts={[[40, 52 + i * 24], [280, 52 + i * 24]]} s={LINE} sw={1} />)}
          {/* stage 5: the right number, buried in a three-page report */}
          {shape === 5 && <Label x={280} y={132} text="Page 1 of 3" size={4} color={MUTED} anchor="end" />}
        </>
      )}
      {shape === 2 && (
        <>
          <R x={36} y={50} w={224} h={12} f={LILAC} s={null} />
          <Label x={38} y={58} text="Column1" size={3} color={PURPLE} />
          {Array.from({ length: 6 }, (_, row) => Array.from({ length: 8 }, (_, col) => (row === 0 && col === 0 ? null : (
            <R key={`${row}-${col}`} x={39 + col * 28} y={54 + row * 12} w={8 + ((row * 5 + col * 3) % 16)} h={3} f={row === 0 ? PURPLE : MUTED} s={null} />
          ))))}
          {Array.from({ length: 9 }, (_, i) => <L key={`v${i}`} pts={[[36 + i * 28, 50], [36 + i * 28, 122]]} s={LINE} sw={1} />)}
          {Array.from({ length: 7 }, (_, i) => <L key={`h${i}`} pts={[[36, 50 + i * 12], [260, 50 + i * 12]]} s={LINE} sw={1} />)}
          {/* the scrollbar: a long track and a very small thumb */}
          <R x={268} y={50} w={8} h={72} f={CANVAS} s={LINE} sw={1} />
          <R x={269} y={51} w={6} h={4} f={MUTED} s={null} />
          <Label x={36} y={132} text="400 rows" size={4} color={MUTED} />
        </>
      )}
      {shape === 3 && (() => {
        const [caption, figure] = (rung === 2 && CARD_BY_MEASURE[measure ?? -1]) || (rung === 3 && region === 2 ? CARD_OTHER_REGION : undefined) || CARD[rung ?? -1] || ['Sales', '$—'];
        return (
          <>
            <R x={80} y={50} w={160} h={80} rx={6} f="#f5f3fb" s={PURPLE} />
            <Label x={160} y={70} text={caption} size={5} color={MUTED} anchor="middle" />
            <Label x={160} y={104} text={figure} size={11} color={INK} anchor="middle" bold />
          </>
        );
      })()}
      {shape === 4 && <Label x={36} y={94} text="Could you be more specific?" size={6} color={INK} />}
    </>
  );
}

/**
 * `shape` is flags['copilot.shape'] (0 list, 1 table, 2 raw, 3 card, 4 text, 5 report) or undefined before any prompt (or after
 * `start over`); `rung` is flags['copilot.last'], the stage that answered. `measure` / `region` pick the card's wrong number.
 */
export function Pane({ shape, rung, measure, region }: { shape?: number; rung?: number; measure?: number; region?: number }) {
  const chip = rung === undefined || rung < 0 ? 'Try: What are my sales?' : STAGE_HINTS[rung as Stage] || 'Copy to clipboard';
  return (
    <>
      <R x={0} y={0} w={320} h={200} f={CANVAS} s={null} />
      <Sparkle x={18} y={17} r={11} />
      <Sparkle x={30} y={8} r={4} f="#55aaff" />
      <Label x={36} y={21} text="Copilot" size={7} color={INK} />
      <L pts={[[0, 34], [320, 34]]} s={LINE} sw={2} />
      <Bubble shape={shape} rung={rung} measure={measure} region={region} />
      {/* suggestion chip */}
      <R x={24} y={144} w={chip.length * 4 + 14} h={14} rx={7} f={EGA.white} s={PURPLE} sw={1} />
      <Label x={31} y={154} text={chip} size={4} color={PURPLE} />
      {/* input bar */}
      <R x={16} y={170} w={288} h={22} rx={10} f={EGA.white} s={MUTED} />
      <Label x={28} y={184} text="Ask Copilot a question…" size={5} color={MUTED} />
      <P pts={[[282, 175], [296, 181], [282, 187], [285, 181]]} f={PURPLE} s={null} />
    </>
  );
}

/** A semantic model as a little stack of tables, `w` wide. */
function Model({ x, y, w, f, top }: { x: number; y: number; w: number; f: string; top: string }) {
  const h = Math.round(w * 0.35);
  return (
    <>
      {[2, 1, 0].map((i) => (
        <g key={i}>
          <P pts={[[x, y - i * h], [x + w / 2, y - i * h - h / 2], [x + w, y - i * h], [x + w / 2, y - i * h + h / 2]]} f={i === 2 ? top : f} />
        </g>
      ))}
    </>
  );
}

export function Gallery() {
  const plinths = [
    { cx: 60, name: 'Sales_v3_FINAL_final2', w: 34, f: EGA.lgray, top: EGA.white },
    { cx: 160, name: 'sales_test_DO_NOT_USE', w: 18, f: EGA.lgray, top: EGA.white },
    { cx: 260, name: 'Sales (Certified)', w: 24, f: PURPLE, top: LILAC },
  ];
  return (
    <>
      <R x={0} y={0} w={320} h={132} f={CANVAS} s={null} />
      <R x={0} y={132} w={320} h={68} f="#e1dfdd" s={null} />
      <L pts={[[0, 132], [320, 132]]} s={LINE} sw={2} />
      <Sparkle x={14} y={14} r={8} />
      <Label x={28} y={18} text="Model Gallery" size={6} color={INK} />
      {plinths.map(({ cx, name, w, f, top }) => (
        <g key={name}>
          {/* museum spotlight */}
          <P pts={[[cx - 6, 26], [cx + 6, 26], [cx + 30, 112], [cx - 30, 112]]} f="#fff6cc" s={null} />
          <R x={cx - 8} y={22} w={16} h={6} f={INK} s={null} />
          <Pedestal x={cx - 20} y={110} />
          <Model x={cx - w / 2} y={104} w={w} f={f} top={top} />
          <R x={cx - 46} y={162} w={92} h={16} f={EGA.white} s={INK} />
          <Label x={cx} y={173} text={name} size={4} color={INK} anchor="middle" />
        </g>
      ))}
      {/* the sign by the test model, saying exactly that */}
      <R x={203} y={140} w={2} h={18} f={INK} s={null} />
      <R x={184} y={128} w={40} h={14} f={EGA.white} s={EGA.red} />
      <Label x={204} y={134} text="DO NOT" size={3} color={EGA.red} anchor="middle" />
      <Label x={204} y={140} text="USE" size={3} color={EGA.red} anchor="middle" />
      {/* the gold endorsement badge on the certified one */}
      <P pts={[[276, 88], [280, 104], [284, 100], [288, 106], [286, 90]]} f={EGA.brown} />
      <P pts={[[274, 80], [278, 76], [286, 76], [290, 80], [290, 88], [286, 92], [278, 92], [274, 88]]} f={EGA.yellow} s={EGA.brown} />
      <L pts={[[278, 84], [281, 87], [287, 80]]} s={EGA.brown} sw={2} />
    </>
  );
}
