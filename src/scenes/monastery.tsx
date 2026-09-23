import { EGA, Interior, Exterior, R, P, L, Person, ProgressBar, Shelf, Desk, Screen, Label, Sun } from './kit';

function Arch({ x, y, w = 40, h = 60, fill = EGA.black }: { x: number; y: number; w?: number; h?: number; fill?: string }) {
  return (
    <>
      <R x={x} y={y + w / 2} w={w} h={h - w / 2} f={fill} />
      <P pts={[[x, y + w / 2], [x + w / 4, y + w / 8], [x + w / 2, y], [x + (3 * w) / 4, y + w / 8], [x + w, y + w / 2]]} f={fill} />
    </>
  );
}

export function Gate({ pct = 0, open = false }: { pct?: number; open?: boolean }) {
  return (
    <>
      <Exterior sky={EGA.lcyan} ground={EGA.lgray} horizon={120} />
      <Sun x={20} y={16} />
      {/* monastery wall with a great gate */}
      <R x={40} y={40} w={240} h={100} f={EGA.dgray} />
      {Array.from({ length: 12 }, (_, i) => <rect key={i} x={44 + i * 20} y={30} width={10} height={10} fill={EGA.dgray} stroke={EGA.black} strokeWidth={2} />)}
      <Arch x={130} y={60} w={60} h={80} fill={open ? EGA.black : EGA.brown} />
      {!open && <L pts={[[160, 90], [160, 140]]} />}
      {!open && <R x={164} y={106} w={4} h={6} f={EGA.yellow} s={null} />}
      {open && <P pts={[[130, 90], [118, 96], [118, 150], [130, 140]]} f={EGA.brown} />}
      {/* the stone progress bar */}
      <ProgressBar x={80} y={150} w={100} pct={open ? 1 : pct} />
      <Person x={210} y={104} robe={EGA.lgray} hood={EGA.lgray} />
      {/* a small orange flame carved above the arch */}
      <R x={156} y={46} w={8} h={10} f={EGA.lred} />
      <R x={158} y={42} w={4} h={6} f={EGA.yellow} s={null} />
    </>
  );
}

export function Cloister() {
  return (
    <>
      <Interior wall={EGA.lgray} wallDark={EGA.dgray} floor="#8a8a8a" ceiling={EGA.dgray} />
      {[60, 110, 160, 210].map((x, i) => <Arch key={i} x={x} y={36} w={36} h={80} fill={EGA.lcyan} />)}
      {[60, 110, 160, 210].map((x, i) => <R key={i} x={x - 4} y={54} w={4} h={64} f={EGA.dgray} />)}
      {/* monks pacing in a circle */}
      <Person x={70} y={130} robe={EGA.dgray} hood={EGA.dgray} px={1.5} />
      <Person x={230} y={126} robe={EGA.dgray} hood={EGA.dgray} px={1.5} />
      <Person x={110} y={160} robe={EGA.dgray} hood={EGA.dgray} px={1.5} />
      {/* the Abbot, orange flame on a black hood */}
      <Person x={150} y={132} robe={EGA.black} hood={EGA.black} skin={EGA.lred} />
      <R x={157} y={150} w={6} h={8} f={EGA.lred} s={null} />
      <Label x={106} y={192} text="spark dot read" color={EGA.white} size={5} />
    </>
  );
}

export function Spark({ fixed = false }: { fixed?: boolean }) {
  return (
    <>
      <Interior wall={EGA.dgray} wallDark="#3a3a3a" floor={EGA.lgray} ceiling={EGA.black} />
      {/* the Lakehouse on the wall: groaning under pandas, or a glowing Delta table */}
      <R x={70} y={30} w={100} h={70} f={EGA.blue} />
      {fixed ? (
        <>
          <P pts={[[120, 44], [140, 84], [100, 84]]} f={EGA.lcyan} />
          <Label x={84} y={96} text="DELTA" color={EGA.white} size={6} />
        </>
      ) : (
        <>
          {Array.from({ length: 18 }, (_, i) => (
            <g key={i}>
              <rect x={76 + (i % 6) * 15} y={36 + Math.floor(i / 6) * 20} width={10} height={8} fill={EGA.white} stroke={EGA.black} strokeWidth={1} />
              <rect x={77 + (i % 6) * 15} y={37 + Math.floor(i / 6) * 20} width={3} height={3} fill={EGA.black} />
              <rect x={83 + (i % 6) * 15} y={37 + Math.floor(i / 6) * 20} width={3} height={3} fill={EGA.black} />
            </g>
          ))}
          <Label x={74} y={96} text="11,000 pandas" color={EGA.yellow} size={5} />
        </>
      )}
      <Desk x={190} y={120} />
      <Screen x={202} y={94} w={44} h={28} color={fixed ? EGA.lgreen : EGA.lred} lines={3} running={!fixed} />
      <Person x={150} y={124} robe={EGA.dgray} hood={EGA.dgray} />
      <Label x={196} y={170} text={fixed ? '✔ 4s' : 'running… 41m'} color={fixed ? EGA.lgreen : EGA.lred} size={5} />
    </>
  );
}

/** The Admin Portal, in stone: sixteen thin books with a toggle for a spine (green at default, red once changed), a sign, the ledger on a lectern, the stair down. */
export function Sacristy({ changed = 0 }: { changed?: number }) {
  return (
    <>
      <Interior wall={EGA.lgray} wallDark={EGA.dgray} floor="#8a8a8a" ceiling={EGA.dgray} />
      {/* the bookcase: two rows of eight */}
      <R x={52} y={24} w={140} h={96} f={EGA.brown} />
      {[0, 1].map((row) => <R key={row} x={56} y={28 + row * 46} w={132} h={40} f={EGA.dgray} s={null} />)}
      {Array.from({ length: 16 }, (_, i) => {
        const x = 60 + (i % 8) * 16;
        const y = 30 + Math.floor(i / 8) * 46;
        const flipped = i < changed;
        return (
          <g key={i}>
            <R x={x} y={y} w={10} h={36} f={EGA.white} sw={1} />
            <rect x={x + 3} y={y + 6} width={4} height={14} fill={EGA.black} />
            <rect x={x + 3} y={flipped ? y + 6 : y + 14} width={4} height={6} fill={flipped ? EGA.lred : EGA.lgreen} />
          </g>
        );
      })}
      <Label x={58} y={132} text="TENANT SETTINGS" color={EGA.yellow} size={5} />
      {/* the sign: FABRIC ADMINISTRATORS ONLY, and the smaller print nobody enforces */}
      <R x={204} y={26} w={62} h={24} f={EGA.white} />
      <Label x={208} y={36} text="ADMINS" color={EGA.red} size={5} />
      <Label x={208} y={46} text="ONLY" color={EGA.red} size={5} />
      {/* the lectern, the ledger open on it */}
      <R x={228} y={96} w={16} h={40} f={EGA.dgray} />
      <P pts={[[212, 96], [260, 96], [256, 86], [216, 86]]} f={EGA.brown} />
      <P pts={[[216, 86], [236, 84], [256, 86], [254, 80], [236, 78], [218, 80]]} f={EGA.white} />
      <L pts={[[236, 78], [236, 84]]} sw={1} />
      <Label x={216} y={150} text="LEDGER" color={EGA.white} size={5} />
      {/* the spiral stair, down and out of frame */}
      <P pts={[[0, 200], [64, 200], [64, 150], [50, 150], [50, 166], [36, 166], [36, 182], [20, 182], [20, 200]]} f={EGA.dgray} />
      <L pts={[[64, 150], [50, 150], [50, 166], [36, 166], [36, 182], [20, 182]]} s={EGA.black} />
    </>
  );
}

export function Library({ caseOpen = false }: { caseOpen?: boolean }) {
  return (
    <>
      <Interior wall={EGA.brown} wallDark="#7a3d00" floor={EGA.dgray} ceiling={EGA.black} />
      <Shelf x={56} y={24} w={70} rows={4} />
      <Shelf x={196} y={24} w={70} rows={4} />
      <Label x={60} y={116} text="Runtime 1.1" color={EGA.yellow} size={5} />
      <Label x={200} y={116} text="SYNAPSE" color={EGA.yellow} size={5} />
      {/* the locked case */}
      <R x={140} y={60} w={40} h={50} f={caseOpen ? EGA.black : EGA.lcyan} s={EGA.dgray} sw={3} />
      {!caseOpen && <R x={150} y={70} w={20} h={30} f={EGA.white} />}
      {!caseOpen && <R x={156} y={96} w={8} h={10} f={EGA.yellow} />}
      <Person x={150} y={124} robe={EGA.magenta} hood={EGA.lmagenta} />
      {/* the Librarian's eyebrow, which is somehow also locked */}
      <R x={154} y={131} w={8} h={1.5} f={EGA.black} s={null} />
    </>
  );
}
