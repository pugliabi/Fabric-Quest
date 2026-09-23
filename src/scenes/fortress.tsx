import { EGA, Interior, Exterior, R, P, L, Water, Battlements, Person, Label, Moon } from './kit';

/** The Semantic Model Keep (spec §12): Power BI, drawn in the same chunky EGA as the rest of the realm. */

export function Bridge({ down = false }: { down?: boolean }) {
  return (
    <>
      <Exterior sky={EGA.blue} ground={EGA.dgray} horizon={130} night />
      <Moon x={30} y={18} />
      {/* keep walls */}
      <R x={60} y={50} w={200} h={80} f={EGA.dgray} />
      <R x={40} y={40} w={30} h={90} f={EGA.dgray} />
      <R x={250} y={40} w={30} h={90} f={EGA.dgray} />
      <Battlements x={40} y={30} w={30} />
      <Battlements x={250} y={30} w={30} />
      <Battlements x={70} y={40} w={180} />
      {/* the gate arch */}
      <R x={130} y={76} w={60} h={54} f={down ? EGA.black : EGA.brown} />
      {/* moat of T-SQL */}
      <Water y={130} h={40} color={EGA.cyan} wave={EGA.white} />
      {[[30, 140], [100, 152], [210, 144], [290, 156]].map(([x, y], i) => <text key={i} x={x} y={y} fontSize="8" fontFamily="monospace" fill={EGA.white}>;</text>)}
      <Label x={236} y={162} text="CROSS APPLY" color={EGA.white} size={4} />
      {down ? (
        <>
          {/* drawbridge down across the moat; the finished splash lies on it as a "What's new" dialog */}
          <P pts={[[130, 130], [190, 130], [214, 172], [106, 172]]} f={EGA.brown} />
          <R x={138} y={140} w={44} h={20} f={EGA.lgray} />
          <Label x={160} y={148} text="WHAT'S" color={EGA.black} size={4} anchor="middle" />
          <Label x={160} y={156} text="NEW" color={EGA.black} size={4} anchor="middle" />
        </>
      ) : (
        <>
          {/* drawbridge up: a Power BI Desktop splash screen */}
          <R x={126} y={66} w={68} h={64} f={EGA.yellow} />
          {/* the chart logo: three bars */}
          <R x={148} y={84} w={6} h={14} f={EGA.black} s={null} />
          <R x={156} y={78} w={6} h={20} f={EGA.black} s={null} />
          <R x={164} y={72} w={6} h={26} f={EGA.black} s={null} />
          <Label x={160} y={108} text="UPDATING" color={EGA.black} size={5} anchor="middle" />
          <Label x={160} y={118} text="1 of 3" color={EGA.black} size={5} anchor="middle" />
          <R x={134} y={122} w={52} h={4} f={EGA.dgray} s={null} />
          <R x={134} y={122} w={14} h={4} f={EGA.black} s={null} />
          <L pts={[[128, 66], [116, 46]]} s={EGA.lgray} />
          <L pts={[[192, 66], [204, 46]]} s={EGA.lgray} />
        </>
      )}
      <R x={0} y={170} w={320} h={30} f={EGA.dgray} s={null} />
      <L pts={[[0, 170], [320, 170]]} />
      {/* the guard on the battlements */}
      <Person x={220} y={4} robe={EGA.lgray} hood={EGA.lgray} px={1.5} />
      <Label x={196} y={6} text="SKU?" color={EGA.yellow} size={6} />
    </>
  );
}

/** A corridor of Applied Steps: every doorway a Changed Type. */
export function Hall() {
  // Doorways recede toward the back wall in pairs, left and right.
  const doors = [
    { x: 6, y: 58, w: 26, h: 96 }, { x: 288, y: 58, w: 26, h: 96 },
    { x: 58, y: 50, w: 20, h: 58 }, { x: 242, y: 50, w: 20, h: 58 },
  ];
  return (
    <>
      <Interior wall={EGA.dgray} wallDark="#3a3a3a" floor={EGA.brown} floorDark={EGA.brown} ceiling={EGA.black} />
      {/* the long runner down the middle: the steps */}
      <P pts={[[140, 118], [180, 118], [230, 200], [90, 200]]} f={EGA.red} />
      {[132, 146, 164, 186].map((y, i) => <L key={i} pts={[[140 - i * 12, y], [180 + i * 12, y]]} s={EGA.lred} />)}
      {/* the back doorway north (to the Duke) */}
      <R x={138} y={40} w={44} h={78} f={EGA.black} />
      <Label x={160} y={36} text="CHANGED TYPE" color={EGA.yellow} size={4} anchor="middle" />
      {doors.map((d, i) => (
        <g key={i}>
          <R x={d.x} y={d.y} w={d.w} h={d.h} f={EGA.black} s={EGA.lgray} />
          <Label x={d.x + d.w / 2} y={d.y + 10} text="CHANGED" color={EGA.yellow} size={3} anchor="middle" />
          <Label x={d.x + d.w / 2} y={d.y + 16} text="TYPE" color={EGA.yellow} size={3} anchor="middle" />
        </g>
      ))}
      {/* portraits: Source, Navigation, and a blank Custom1 */}
      {[['SOURCE', 92], ['NAV', 196]].map(([t, x]) => (
        <g key={t as string}>
          <R x={x as number} y={40} w={32} h={28} f={EGA.brown} />
          <R x={(x as number) + 4} y={44} w={24} h={20} f={EGA.lcyan} />
          <Person x={(x as number) + 10} y={46} robe={EGA.blue} hood={EGA.dgray} px={0.6} />
          <Label x={(x as number) + 16} y={76} text={t as string} color={EGA.white} size={4} anchor="middle" />
        </g>
      ))}
      {/* Custom1: a blank frame nobody dares take down */}
      <R x={92} y={84} w={32} h={24} f={EGA.brown} />
      <R x={96} y={88} w={24} h={16} f={EGA.white} />
      <Label x={108} y={100} text="?" color={EGA.black} size={7} anchor="middle" />
      <Label x={108} y={116} text="CUSTOM1" color={EGA.white} size={4} anchor="middle" />
    </>
  );
}

/** The Model View: tables on plinths, joined by relationships; one dashed and wobbly. Sir Cardinality stands guard. */
export function Model({ policyTaken = false }: { policyTaken?: boolean }) {
  const table = (x: number, y: number, name: string, color: string) => (
    <g key={name}>
      {/* plinth */}
      <P pts={[[x - 4, y + 34], [x + 48, y + 34], [x + 42, y + 48], [x + 2, y + 48]]} f={EGA.lgray} />
      {/* table box: header + rows */}
      <R x={x} y={y} w={44} h={34} f={EGA.white} />
      <R x={x} y={y} w={44} h={9} f={color} />
      <Label x={x + 22} y={y + 7} text={name} color={EGA.white} size={4} anchor="middle" />
      {[14, 20, 26].map((dy) => <R key={dy} x={x + 4} y={y + dy} w={30} h={2} f={EGA.dgray} s={null} />)}
    </g>
  );
  return (
    <>
      <R x={0} y={0} w={320} h={200} f={EGA.black} s={null} />
      {/* faint diagram grid */}
      {Array.from({ length: 16 }, (_, i) => <L key={`v${i}`} pts={[[i * 20, 0], [i * 20, 160]]} s="#1a1a3a" sw={1} />)}
      {Array.from({ length: 8 }, (_, i) => <L key={`h${i}`} pts={[[0, i * 20], [320, i * 20]]} s="#1a1a3a" sw={1} />)}
      <R x={0} y={160} w={320} h={40} f={EGA.dgray} s={null} />
      <L pts={[[0, 160], [320, 160]]} />
      {/* relationships (drawn first so the boxes sit on top) */}
      <L pts={[[80, 50], [138, 80]]} s={EGA.yellow} />
      <L pts={[[240, 50], [182, 80]]} s={EGA.yellow} />
      {/* the many-to-many bridge: dashed, wobbling */}
      <polyline points="182,100 204,94 226,106 248,98 270,110" fill="none" stroke={EGA.lred} strokeWidth={3} strokeDasharray="6 4" />
      <Label x={226} y={90} text="*:*" color={EGA.lred} size={5} anchor="middle" />
      {/* the dashed, inactive one (Date to Sales, since a meeting in 2021) */}
      <polyline points="56,124 138,100" fill="none" stroke={EGA.lgray} strokeWidth={2} strokeDasharray="3 3" />
      <Label x={108} y={64} text="1:*" color={EGA.yellow} size={4} anchor="middle" />
      <Label x={212} y={64} text="1:*" color={EGA.yellow} size={4} anchor="middle" />
      {table(36, 16, 'Product', EGA.blue)}
      {table(196, 16, 'Customer', EGA.blue)}
      {table(138, 70, 'Sales', EGA.green)}
      {table(252, 100, 'Sheet1', EGA.dgray)}
      {/* the unmarked date table */}
      {table(12, 106, 'Date', EGA.magenta)}
      <Label x={34} y={104} text="NOT MARKED" color={EGA.lmagenta} size={4} anchor="middle" />
      {/* Sir Cardinality, one eyebrow raised, on guard in front of the diagram */}
      <Person x={96} y={140} robe={EGA.lgray} hood={EGA.lgray} px={1.6} />
      <R x={100} y={144} w={6} h={2} f={EGA.black} s={null} />
      <L pts={[[124, 130], [124, 170]]} s={EGA.white} sw={3} />
      <L pts={[[118, 162], [130, 162]]} s={EGA.yellow} sw={3} />
      {/* the lectern with the incremental refresh policy */}
      <R x={196} y={150} w={10} h={30} f={EGA.brown} />
      <P pts={[[186, 144], [216, 144], [212, 152], [190, 152]]} f={EGA.brown} />
      {!policyTaken && <R x={192} y={138} w={18} h={8} f={EGA.white} />}
    </>
  );
}

/** The Duke of DAX on a throne that is a giant formula bar. */
export function Throne({ thrown = false }: { thrown?: boolean }) {
  return (
    <>
      <Interior wall={EGA.red} wallDark={EGA.red} floor={EGA.dgray} ceiling={EGA.black} />
      {/* the throne back: a giant formula bar */}
      <R x={70} y={26} w={180} h={20} f={EGA.white} />
      <Label x={78} y={40} text="fx" color={EGA.dgray} size={7} />
      <Label x={98} y={40} text="CALCULATE(" color={EGA.blue} size={8} />
      <R x={220} y={30} w={2} h={12} f={EGA.black} s={null} />
      {/* the seat: nested CALCULATEs, stacked */}
      {[0, 1, 2, 3].map((i) => <R key={i} x={122 - i * 6} y={112 - i * 14} w={76 + i * 12} h={14} f={i % 2 ? EGA.lgray : EGA.white} />)}
      <Label x={160} y={122} text="CALCULATE(" color={EGA.black} size={4} anchor="middle" />
      <Label x={160} y={108} text="CALCULATE(" color={EGA.black} size={4} anchor="middle" />
      <Person x={150} y={60} robe={EGA.magenta} hood={EGA.yellow} />
      {/* the filter pane behind the throne */}
      <R x={56} y={54} w={40} h={52} f={EGA.lgray} />
      <Label x={76} y={62} text="FILTERS" color={EGA.black} size={4} anchor="middle" />
      {[70, 80, 90].map((y) => <R key={y} x={62} y={y} w={28} h={6} f={EGA.white} />)}
      {/* the window you get thrown out of */}
      <R x={232} y={54} w={30} h={40} f={EGA.blue} s={EGA.yellow} />
      <L pts={[[247, 54], [247, 94]]} s={EGA.yellow} />
      {thrown && <L pts={[[236, 58], [258, 90]]} s={EGA.white} />}
      {thrown && <L pts={[[258, 58], [236, 90]]} s={EGA.white} />}
      <Person x={84} y={124} robe={EGA.lgray} hood={EGA.lgray} px={1.5} />
      <Person x={220} y={124} robe={EGA.lgray} hood={EGA.lgray} px={1.5} />
    </>
  );
}

/** The Report Studio: a canvas with a 31-slice pie, a Card, slicers, and the Big Refresh. */
export function Studio({ number = false, refreshed = false, boots = false }: { number?: boolean; refreshed?: boolean; boots?: boolean }) {
  const cx = 92;
  const cy = 88;
  const r = 36;
  const slices = 31;
  const colors = [EGA.lblue, EGA.lred, EGA.yellow, EGA.lgreen, EGA.lmagenta, EGA.lcyan, EGA.brown, EGA.lgray];
  return (
    <>
      <Interior wall={EGA.lgray} wallDark={EGA.dgray} floor={EGA.blue} floorDark={EGA.blue} ceiling={EGA.black} />
      {/* the canvas */}
      <R x={52} y={22} w={216} h={94} f={EGA.white} />
      {/* the pie: 31 slices, twelve of them "Other" (grey) */}
      {Array.from({ length: slices }, (_, i) => {
        const a0 = (i / slices) * Math.PI * 2;
        const a1 = ((i + 1) / slices) * Math.PI * 2;
        const pt = (a: number) => [Math.round(cx + r * Math.cos(a)), Math.round(cy + r * Math.sin(a))];
        return <P key={i} pts={[[cx, cy], pt(a0), pt(a1)]} f={i >= slices - 12 ? EGA.dgray : colors[i % colors.length]!} s={EGA.black} sw={1} />;
      })}
      {/* the Card */}
      <R x={140} y={30} w={64} h={34} f={EGA.white} s={EGA.dgray} />
      <Label x={172} y={52} text={number ? '4.2M' : '(Blank)'} color={number ? EGA.black : EGA.dgray} size={number ? 10 : 6} anchor="middle" bold={number} />
      <Label x={172} y={60} text="Total Sales" color={EGA.dgray} size={3} anchor="middle" />
      {/* the slicer stack */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <g key={i}>
          <R x={214} y={28 + i * 13} w={48} h={10} f={EGA.white} s={EGA.dgray} sw={1} />
          <R x={254} y={30 + i * 13} w={6} h={6} f={EGA.lgray} s={null} />
          <Label x={217} y={35 + i * 13} text={['Year', 'Month', 'Region', 'Region(Old)', 'Colour', 'Test'][i]!} color={EGA.dgray} size={3} />
        </g>
      ))}
      {/* the Big Refresh: a progress bar, 97% since 2019 */}
      <R x={140} y={76} w={70} h={32} f={EGA.lgray} />
      <Label x={175} y={86} text={refreshed ? 'REFRESHED' : 'REFRESHING'} color={EGA.black} size={4} anchor="middle" />
      <R x={146} y={92} w={58} h={8} f={EGA.dgray} />
      <R x={148} y={94} w={refreshed ? 54 : 52} h={4} f={EGA.lgreen} s={null} />
      <Label x={175} y={106} text={refreshed ? '100%' : '97%'} color={EGA.black} size={4} anchor="middle" />
      {/* the sticky note */}
      <R x={196} y={70} w={20} h={14} f={EGA.yellow} />
      <Label x={206} y={79} text="JEFF" color={EGA.black} size={3} anchor="middle" />
      {/* the boots, fallen out of the refresh */}
      {boots && (
        <>
          <R x={150} y={160} w={10} h={16} f={EGA.red} />
          <R x={150} y={172} w={18} h={6} f={EGA.red} />
          <R x={170} y={160} w={10} h={16} f={EGA.red} />
          <R x={170} y={172} w={18} h={6} f={EGA.red} />
          <R x={150} y={178} w={38} h={2} f={EGA.yellow} s={null} />
        </>
      )}
    </>
  );
}
