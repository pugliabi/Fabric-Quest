import { EGA, Exterior, R, P, L, Mountains, Signpost, Pedestal, GoldenModel, Dragon, Label, Stars } from './kit';

export function Foothills() {
  return (
    <>
      <Exterior sky={EGA.lcyan} ground={EGA.green} horizon={110} />
      <Mountains y={110} />
      {/* the fortress squats to the north */}
      <R x={30} y={80} w={70} h={30} f={EGA.dgray} />
      {Array.from({ length: 5 }, (_, i) => <rect key={i} x={32 + i * 14} y={74} width={8} height={6} fill={EGA.dgray} stroke={EGA.black} strokeWidth={2} />)}
      <P pts={[[200, 200], [240, 140], [320, 130], [320, 200]]} f={EGA.brown} />
      <Signpost x={110} y={130} w={110} text="INTERACTIVE DELAY" labelColor={EGA.lred} />
      <Label x={112} y={172} text="do not feed the dragon" color={EGA.white} size={4} />
    </>
  );
}

export function Pass() {
  return (
    <>
      <Exterior sky={EGA.blue} ground={EGA.magenta} horizon={60} night />
      <Mountains y={60} color={EGA.magenta} dark={EGA.dgray} snow={false} />
      {/* the pass climbs north between cliffs */}
      <P pts={[[0, 60], [90, 60], [130, 200], [0, 200]]} f={EGA.dgray} />
      <P pts={[[320, 60], [230, 60], [190, 200], [320, 200]]} f={EGA.dgray} />
      <P pts={[[130, 200], [90, 60], [230, 60], [190, 200]]} f={EGA.lgray} />
      {/* billing markers: every step costs */}
      {[80, 110, 140, 170].map((y, i) => <Label key={i} x={148} y={y} text={`$${i + 1}`} color={EGA.yellow} size={5} />)}
      <Label x={94} y={190} text="throttled" color={EGA.lred} size={5} />
    </>
  );
}

function Sigil({ x, y, kind, lit }: { x: number; y: number; kind: 'hoodie' | 'stink' | 'key'; lit: boolean }) {
  const c = lit ? EGA.yellow : EGA.dgray;
  if (kind === 'hoodie') return <><R x={x + 4} y={y} w={12} h={8} f={c} /><R x={x} y={y + 8} w={20} h={14} f={c} /></>;
  if (kind === 'key') return <><R x={x} y={y + 8} w={8} h={8} f={c} /><R x={x + 8} y={y + 10} w={12} h={4} f={c} /><R x={x + 16} y={y + 14} w={2} h={4} f={c} s={null} /></>;
  return <>{[0, 1, 2].map((i) => <L key={i} pts={[[x, y + 4 + i * 7], [x + 6, y + i * 7], [x + 12, y + 4 + i * 7], [x + 18, y + i * 7]]} s={c} />)}</>;
}

export function Ledge({ open = false, hoodie = false, stink = false, keyLit = false }: { open?: boolean; hoodie?: boolean; stink?: boolean; keyLit?: boolean }) {
  return (
    <>
      <R x={0} y={0} w={320} h={200} f={EGA.blue} s={null} />
      <Stars />
      <R x={0} y={150} w={320} h={50} f={EGA.dgray} s={null} />
      <L pts={[[0, 150], [320, 150]]} />
      {/* the mountain face and the great door */}
      <P pts={[[40, 150], [80, 30], [240, 30], [280, 150]]} f={EGA.magenta} />
      <R x={120} y={70} w={80} h={80} f={open ? EGA.black : EGA.brown} />
      {!open && <L pts={[[160, 70], [160, 150]]} />}
      {open && <P pts={[[120, 70], [104, 76], [104, 156], [120, 150]]} f={EGA.brown} />}
      {open && <GoldenModel x={150} y={104} />}
      <Sigil x={128} y={40} kind="hoodie" lit={hoodie || open} />
      <Sigil x={152} y={42} kind="stink" lit={stink || open} />
      <Sigil x={180} y={40} kind="key" lit={keyLit || open} />
      <Label x={100} y={180} text={open ? 'WORTHY, APPARENTLY' : 'THE WORTHY THREE'} color={EGA.white} size={6} />
    </>
  );
}

export function Shrine({ clear = false }: { clear?: boolean }) {
  return (
    <>
      <R x={0} y={0} w={320} h={200} f={EGA.black} s={null} />
      {/* stone columns, a shrine floor */}
      <P pts={[[0, 200], [40, 110], [280, 110], [320, 200]]} f={EGA.dgray} />
      <R x={40} y={20} w={240} h={90} f="#3a3a3a" />
      {[60, 110, 190, 240].map((x, i) => <R key={i} x={x} y={20} w={14} h={90} f={EGA.lgray} />)}
      <Pedestal x={140} y={100} />
      <GoldenModel x={149} y={82} glow />
      {clear ? (
        <>
          {[[60, 60], [90, 40], [230, 50]].map(([x, y], i) => <rect key={i} x={x} y={y} width={2} height={2} fill={EGA.lgray} />)}
          <Label x={96} y={184} text="faint smell of burnt CU" color={EGA.lgray} size={5} />
        </>
      ) : (
        <>
          <Dragon x={70} y={112} />
          <Label x={80} y={40} text="WHAT IS THE ONE" color={EGA.lred} size={7} />
          <Label x={96} y={54} text="TRUE MODEL?" color={EGA.lred} size={7} />
        </>
      )}
    </>
  );
}
