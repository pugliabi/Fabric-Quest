/**
 * Jeff's Excel: the side realm behind "show me a table". Grid paper, a green ribbon, and one #REF! that nobody fixes.
 * Not EGA on purpose: the realm is a different program, so it gets that program's colors (still chunky, still 320×200).
 */
import { EGA, R, P, L, Label, Sprite, Mug } from './kit';
import { TOTALS } from '../world/excel';

const GREEN = '#1d6f42';
const LGREEN = '#e2efda';
const GRID = '#d4d4d4';
const HEAD = '#e6e6e6';
const INK = '#333333';
const MUTED = '#999999';
const BAD_FILL = '#ffc7ce'; // Excel's "Bad" cell style
const BAD_INK = '#9c0006';
const GOOD_FILL = '#c6efce';
const GOOD_INK = '#006100';
const SKIN = '#ffcc99';

type Tab = 'Home' | 'Insert' | 'Data' | 'Analyze in Excel';
const TABS: [Tab, number][] = [['Home', 6], ['Insert', 40], ['Data', 82], ['Analyze in Excel', 114]];

/** Column x (left edge) and row y (top edge) of a cell, A1 = (0, 0). Columns are 32 px, rows 20 px. */
const cx = (col: number) => 12 + col * 32;
const cy = (row: number) => 30 + row * 20;

/** The sheet every Excel scene sits on: ribbon, headers A–I and 1–8, grid, and the #REF! at (col, row). */
function Sheet({ tab, refAt }: { tab: Tab; refAt: [number, number] }) {
  const [rc, rr] = refAt;
  return (
    <>
      <R x={0} y={0} w={320} h={200} f={EGA.white} s={null} />
      {/* ribbon */}
      <R x={0} y={0} w={320} h={22} f={GREEN} s={null} />
      {TABS.map(([name, x], i) => (
        <g key={name}>
          {name === tab && <R x={x - 3} y={5} w={name.length * 5 + 6} h={14} f={EGA.white} s={null} />}
          <Label x={x} y={15} text={name} size={5} color={name === tab ? GREEN : EGA.white} />
          {i < TABS.length - 1 && <R x={Math.round((x + name.length * 5 + TABS[i + 1]![1]) / 2)} y={11} w={2} h={2} f={EGA.white} s={null} />}
        </g>
      ))}
      {/* headers */}
      <R x={0} y={22} w={320} h={8} f={HEAD} s={null} />
      <R x={0} y={30} w={12} h={170} f={HEAD} s={null} />
      {'ABCDEFGHI'.split('').map((c, i) => <Label key={c} x={cx(i) + 16} y={29} text={c} size={5} color={INK} anchor="middle" />)}
      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <Label key={n} x={6} y={cy(n - 1) + 13} text={String(n)} size={5} color={INK} anchor="middle" />)}
      {/* grid */}
      {Array.from({ length: 10 }, (_, i) => <L key={`v${i}`} pts={[[cx(i), 22], [cx(i), 200]]} s={GRID} sw={1} />)}
      {Array.from({ length: 9 }, (_, j) => <L key={`h${j}`} pts={[[0, cy(j)], [320, cy(j)]]} s={GRID} sw={1} />)}
      <L pts={[[0, 30], [320, 30]]} s={MUTED} sw={1} />
      <L pts={[[12, 22], [12, 200]]} s={MUTED} sw={1} />
      {/* the one error nobody fixes */}
      <R x={cx(rc) + 1} y={cy(rr) + 1} w={31} h={19} f={BAD_FILL} s={null} />
      <Label x={cx(rc) + 16} y={cy(rr) + 13} text="#REF!" size={5} color={BAD_INK} anchor="middle" />
    </>
  );
}

// Jeff, 12×16. Original: shirt and tie, hair parted with confidence. The last rows sit behind the desk.
const JEFF_ROWS = [
  '...kkkkkk...',
  '..kHHHHHHk..',
  '.kHHHHHHHHk.',
  '.kHffffffHk.',
  '.kfeffffefk.',
  '.kffffffffk.',
  '..kfmmmmfk..',
  '...kffffk...',
  '..kbbwwbbk..',
  '.kbbbwwbbbk.',
  'kbbbbttbbbbk',
  'kbbbbttbbbbk',
  'kfbbbttbbbfk',
  'kfbbbbbbbbfk',
  '.kbbbbbbbbk.',
  '.kkkkkkkkkk.',
];
const JEFF_HAPPY = JEFF_ROWS.map((r, i) => (i === 5 ? '.kfmffffmfk.' : i === 6 ? '..kfmmmmfk..' : i === 7 ? '...kffffk...' : r));

export function Sheet1({ happy = false }: { happy?: boolean }) {
  return (
    <>
      <Sheet tab="Home" refAt={[7, 6]} />
      {/* Jeff, behind his desk */}
      <Sprite rows={happy ? JEFF_HAPPY : JEFF_ROWS} pal={{ k: EGA.black, H: EGA.brown, f: SKIN, e: EGA.black, m: EGA.red, b: EGA.lblue, w: EGA.white, t: EGA.red }} x={56} y={84} />
      {/* monitor 1, facing us: the export, in green */}
      <R x={96} y={76} w={50} h={36} f={EGA.dgray} />
      <R x={100} y={80} w={42} h={28} f={EGA.white} s={null} />
      {[0, 1, 2, 3].map((i) => <R key={i} x={102} y={82 + i * 6} w={38} h={4} f={i === 0 ? GREEN : LGREEN} s={null} />)}
      <R x={117} y={112} w={8} h={6} f={EGA.dgray} />
      {/* monitor 2, turned away: the report nobody reads */}
      <P pts={[[152, 74], [166, 80], [166, 110], [152, 114]]} f={EGA.dgray} />
      <P pts={[[155, 78], [163, 82], [163, 108], [155, 110]]} f={EGA.lgray} s={null} />
      <R x={156} y={112} w={6} h={6} f={EGA.dgray} />
      <Mug x={176} y={110} />
      {/* the desk */}
      <R x={40} y={118} w={152} h={6} f={EGA.brown} />
      <R x={46} y={124} w={140} h={18} f="#7a3d00" />
      <R x={50} y={142} w={6} h={6} f="#7a3d00" />
      <R x={176} y={142} w={6} h={6} f="#7a3d00" />
      {/* the export: A7:C8, one number, bold */}
      <R x={cx(0)} y={cy(6)} w={96} h={40} f={LGREEN} s={GREEN} sw={2} />
      <Label x={cx(0) + 4} y={cy(6) + 12} text="Sales_export (3).csv" size={4} color={INK} />
      <Label x={cx(0) + 4} y={cy(7) + 15} text="Total" size={5} color={INK} />
      <Label x={cx(3) - 4} y={cy(7) + 16} text="4.7M" size={9} color={EGA.black} anchor="end" bold />
    </>
  );
}

export function DataTab({ connected = false }: { connected?: boolean }) {
  return (
    <>
      <Sheet tab="Data" refAt={[2, 7]} />
      {/* the big button */}
      <R x={cx(0) + 10} y={cy(1)} w={100} h={56} f={EGA.white} s={MUTED} />
      <R x={cx(0) + 20} y={cy(1) + 8} w={24} h={20} f={GREEN} s={null} />
      {[0, 1, 2].map((i) => <R key={i} x={cx(0) + 23} y={cy(1) + 11 + i * 6} w={18} h={3} f={EGA.white} s={null} />)}
      <R x={cx(0) + 48} y={cy(1) + 12} w={52} h={12} f={LGREEN} s={null} />
      <Label x={cx(0) + 60} y={cy(1) + 42} text="Analyze" size={6} color={INK} anchor="middle" />
      <Label x={cx(0) + 60} y={cy(1) + 51} text="in Excel" size={6} color={INK} anchor="middle" />
      {/* a wire from the button to wherever the answer is */}
      <L pts={[[cx(0) + 110, cy(2) + 8], [cx(4) + 2, cy(2) + 8]]} s={connected ? GREEN : MUTED} sw={2} />
      {connected ? (
        <>
          <R x={cx(4) + 2} y={cy(1) + 10} w={150} h={46} f={GOOD_FILL} s={GREEN} />
          <L pts={[[cx(4) + 12, cy(2) + 8], [cx(4) + 18, cy(2) + 14], [cx(4) + 30, cy(2)]]} s={GOOD_INK} sw={3} />
          <Label x={cx(4) + 38} y={cy(2) + 4} text="Connected —" size={6} color={GOOD_INK} />
          <Label x={cx(4) + 38} y={cy(2) + 16} text="Sales (Certified)" size={5} color={GOOD_INK} />
        </>
      ) : (
        <>
          {/* the tiny dialog, with a tinier link */}
          <R x={cx(4) + 2} y={cy(1) + 4} w={150} h={70} f="#f0f0f0" s={INK} />
          <R x={cx(4) + 2} y={cy(1) + 4} w={150} h={12} f={INK} s={null} />
          <Label x={cx(4) + 6} y={cy(1) + 13} text="Data Connection" size={4} color={EGA.white} />
          <R x={cx(4) + 140} y={cy(1) + 6} w={8} h={8} f={EGA.lred} s={null} />
          <Label x={cx(4) + 10} y={cy(2) + 12} text="Sign-in required" size={6} color={INK} />
          <Label x={cx(4) + 10} y={cy(3)} text="Sign in" size={4} color={EGA.blue} />
          <L pts={[[cx(4) + 10, cy(3) + 2], [cx(4) + 38, cy(3) + 2]]} s={EGA.blue} sw={1} />
          <R x={cx(4) + 106} y={cy(3) + 2} w={40} h={12} f={EGA.white} s={MUTED} sw={1} />
          <Label x={cx(4) + 126} y={cy(3) + 11} text="Cancel" size={4} color={INK} anchor="middle" />
        </>
      )}
    </>
  );
}

type PivotProps = { n: number; connected: boolean; built: boolean; dim: boolean; measure: boolean; filter: boolean };

/** PivotTable1. `n` pieces landed (0–3) sets the total; the flags say which lines and fields are green. */
export function Pivot({ n, connected, built, dim, measure, filter }: PivotProps) {
  // Before "create pivot table" the pivot is still Jeff's; after, each line is (none) until its piece lands.
  const line = (chosen: boolean, right: string, jeffs: string): [string, string] =>
    !built ? [jeffs, INK] : chosen ? [right, GREEN] : ['(none)', MUTED];
  const lines: [string, [string, string]][] = [
    ['Rows:', line(dim, 'Sales Region', 'Region A')],
    ['Values:', line(measure, 'Net Sales', 'Sum of Sales Amount')],
    ['Filters:', line(filter, 'Is Current Year = Yes', '(none)')],
  ];
  return (
    <>
      <Sheet tab="Analyze in Excel" refAt={[0, 7]} />
      {/* the pivot block */}
      <R x={16} y={36} w={192} h={124} f={EGA.white} s={GREEN} />
      <R x={16} y={36} w={192} h={14} f={GREEN} s={null} />
      <Label x={22} y={46} text="PivotTable1" size={5} color={EGA.white} />
      <Label x={202} y={46} text={built ? 'live model' : 'Sales_export (3).csv'} size={4} color={EGA.white} anchor="end" />
      {lines.map(([k, [v, c]], i) => (
        <g key={k}>
          <Label x={22} y={66 + i * 16} text={k} size={5} color={INK} />
          <Label x={70} y={66 + i * 16} text={v} size={5} color={c} />
        </g>
      ))}
      {/* a few rows of numbers, as bars */}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <R x={22} y={114 + i * 8} w={44} h={4} f={HEAD} s={null} />
          <R x={150} y={114 + i * 8} w={30 + ((i * 11 + n * 5) % 20)} h={4} f={LGREEN} s={null} />
        </g>
      ))}
      <R x={16} y={140} w={192} h={20} f={LGREEN} s={GREEN} />
      <Label x={22} y={153} text="Grand Total" size={5} color={INK} />
      <Label x={202} y={155} text={TOTALS[n] ?? TOTALS[0]} size={9} color={EGA.black} anchor="end" bold />
      <FieldPane connected={connected} dim={dim && built} measure={measure && built} filter={filter && built} />
    </>
  );
}

function FieldPane({ connected, dim, measure, filter }: { connected: boolean; dim: boolean; measure: boolean; filter: boolean }) {
  // [text, indent (a field under a table), color, checked]
  const rows: [string, boolean, string, boolean][] = connected
    ? [
        ['Geography (legacy)', false, MUTED, false],
        ['Region A', true, EGA.lgray, false],
        ['Region B', true, EGA.lgray, false],
        ['Sales Region', false, dim ? GREEN : INK, false],
        ['Sales Region', true, dim ? GREEN : INK, dim],
        ['Territory', true, INK, false],
        ['Calendar', false, filter ? GREEN : INK, false],
        ['Year', true, INK, false],
        ['Quarter', true, INK, false],
        ['Is Current Year', true, filter ? GREEN : INK, filter],
        ['Measures', false, measure ? GREEN : INK, false],
        ['Sales Amount', true, INK, false],
        ['Net Sales', true, measure ? GREEN : INK, measure],
        ['Returns', true, INK, false],
      ]
    : [
        ['Sales_export (3).csv', false, INK, false],
        ['Region A', true, INK, true],
        ['Sales Amount', true, INK, true],
        ['(not connected)', false, MUTED, false],
      ];
  let y = 42;
  return (
    <>
      <R x={220} y={26} w={96} h={170} f="#f8f8f8" s={MUTED} />
      <Label x={224} y={34} text="PivotTable Fields" size={4} color={INK} />
      <L pts={[[222, 38], [314, 38]]} s={GRID} sw={1} />
      {rows.map(([text, indent, color, checked], i) => {
        y += indent ? 10 : 12;
        return (
          <g key={i}>
            {indent && <R x={226} y={y - 4} w={4} h={4} f={checked ? GREEN : EGA.white} s={checked ? GREEN : MUTED} sw={1} />}
            <Label x={indent ? 233 : 224} y={y} text={text} size={4} color={color} />
          </g>
        );
      })}
    </>
  );
}
