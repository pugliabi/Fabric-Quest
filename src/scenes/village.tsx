import { EGA, Interior, Exterior, R, P, L, Bed, Table, Candle, Mug, Window, Rug, Painting, Shelf, Chest, Hut, Tree, Well, Signpost, Person, Scarecrow, Moon, Sun, Label } from './kit';

export function Cottage({ mugTaken = false }: { mugTaken?: boolean }) {
  return (
    <>
      <Interior wall={EGA.brown} wallDark="#7a3d00" floor="#5a2e00" ceiling={EGA.dgray} />
      {/* crack in the wall, a painting of a pie chart, a window onto night */}
      <L pts={[[200, 24], [206, 40], [198, 52], [204, 66]]} s={EGA.dgray} />
      <Painting x={84} y={34} scene="pie" />
      <Window x={210} y={34} w={40} h={44} night />
      <R x={236} y={40} w={8} h={8} f={EGA.yellow} s={null} />
      <R x={240} y={38} w={6} h={6} f={EGA.blue} s={null} />
      <Shelf x={150} y={40} w={44} rows={2} />
      {/* door on the left wall, in perspective */}
      <P pts={[[6, 60], [40, 74], [40, 140], [6, 176]]} f={EGA.brown} />
      <P pts={[[10, 66], [36, 78], [36, 136], [10, 168]]} f="#7a3d00" />
      <R x={30} y={110} w={4} h={6} f={EGA.yellow} s={null} />
      {/* desk with the report, candle, mug */}
      <Table x={70} y={118} w={64} />
      <Candle x={120} y={116} />
      {!mugTaken && <Mug x={78} y={120} />}
      <R x={92} y={122} w={22} h={6} f={EGA.white} />
      <Label x={86} y={148} text="FINAL_final2" color={EGA.yellow} size={5} />
      <Rug x={120} y={160} w={90} h={26} />
      <Bed x={210} y={110} />
    </>
  );
}

export function Square({ calm = false }: { calm?: boolean }) {
  return (
    <>
      <Exterior sky={EGA.blue} ground={EGA.green} horizon={100} band={EGA.lgreen} night />
      <Moon />
      <Hut x={20} y={60} w={70} h={40} wall={EGA.brown} roof={EGA.dgray} />
      <Hut x={230} y={64} w={60} h={36} wall={EGA.dgray} roof={EGA.brown} />
      <Tree x={110} y={56} s={1.4} />
      <Tree x={200} y={62} />
      {/* roads: north (up the middle), east, south */}
      <P pts={[[150, 100], [170, 100], [230, 200], [90, 200]]} f={EGA.brown} />
      <Well x={60} y={124} />
      <Signpost x={228} y={118} w={64} text="PROPHECY" />
      {/* Jeff: bareheaded, blue shirt, holding an empty spreadsheet */}
      <Person x={calm ? 100 : 180} y={calm ? 128 : 136} robe={EGA.lblue} hood={EGA.brown} skin={EGA.lred} />
      {!calm && <R x={200} y={152} w={14} h={10} f={EGA.white} />}
      {calm && <Mug x={122} y={150} />}
    </>
  );
}

export function Mill({ empty = false }: { empty?: boolean }) {
  return (
    <>
      <Interior wall={EGA.dgray} wallDark="#3a3a3a" floor={EGA.brown} ceiling={EGA.black} />
      {/* the wheel, turning slowly on the back wall */}
      <R x={200} y={30} w={60} h={60} f={EGA.dgray} s={EGA.brown} sw={4} />
      <L pts={[[230, 30], [230, 90]]} s={EGA.brown} sw={4} />
      <L pts={[[200, 60], [260, 60]]} s={EGA.brown} sw={4} />
      <L pts={[[208, 38], [252, 82]]} s={EGA.brown} sw={4} />
      <L pts={[[252, 38], [208, 82]]} s={EGA.brown} sw={4} />
      {/* banner */}
      <R x={60} y={26} w={120} h={20} f={EGA.lred} />
      <Label x={66} y={40} text="DECOMMISSION: Q3" color={EGA.white} size={6} />
      <Shelf x={64} y={56} w={60} rows={2} />
      <Chest x={200} y={134} open={empty} />
      <Person x={130} y={118} robe={EGA.lgray} hood={EGA.white} />
      {/* sacks of 2019 */}
      <P pts={[[70, 170], [100, 170], [96, 148], [74, 148]]} f={EGA.brown} />
      <Label x={72} y={166} text="2019" color={EGA.yellow} size={5} />
    </>
  );
}

export function Fields() {
  return (
    <>
      <Exterior sky={EGA.lcyan} ground={EGA.green} horizon={96} band={EGA.lgreen} />
      <Sun />
      {/* peaks in the distance, east */}
      <P pts={[[220, 96], [270, 50], [320, 96]]} f={EGA.magenta} />
      <P pts={[[262, 58], [270, 50], [278, 58]]} f={EGA.white} />
      {/* rows of refreshes (mostly failed) */}
      {[112, 130, 148, 166, 184].map((ry, i) => (
        <g key={i}>
          {Array.from({ length: 12 }, (_, j) => {
            const failed = (i * 7 + j * 3) % 5 !== 0;
            return <rect key={j} x={10 + j * 26 + (i % 2) * 10} y={ry - 8} width={6} height={12} fill={failed ? EGA.lred : EGA.lgreen} stroke={EGA.black} strokeWidth={1} />;
          })}
        </g>
      ))}
      <Scarecrow x={150} y={100} />
      <Label x={132} y={168} text="MANUAL" color={EGA.white} size={6} />
    </>
  );
}

/** The Town Hall (spec2 §6): a counter, a Clerk in a cardigan, a bell, the poster in its frame, and a queue rope with nobody in it. */
export function TownHall({ ticketTaken = false }: { ticketTaken?: boolean }) {
  return (
    <>
      <Interior wall={EGA.lgray} wallDark={EGA.dgray} floor={EGA.brown} ceiling={EGA.dgray} />
      {/* the poster in its frame */}
      <R x={70} y={30} w={70} h={30} f={EGA.white} s={EGA.brown} sw={4} />
      <Label x={74} y={42} text="TENANT SETTINGS" color={EGA.black} size={4} />
      <Label x={74} y={52} text="ARE NOT SECURITY" color={EGA.black} size={4} />
      {/* the counter, the bell, the ticket (or the clean rectangle where it was) */}
      <R x={160} y={110} w={110} h={40} f={EGA.brown} />
      <R x={176} y={104} w={10} h={6} f={EGA.yellow} />
      {!ticketTaken && <R x={200} y={106} w={14} h={5} f={EGA.white} />}
      {/* the Clerk, in a cardigan */}
      <Person x={220} y={80} robe={EGA.dgray} hood={EGA.brown} skin={EGA.lred} />
      {/* the queue rope, with nobody in it */}
      <L pts={[[60, 130], [60, 160], [120, 160], [120, 130]]} s={EGA.red} sw={3} />
      <R x={58} y={126} w={4} h={40} f={EGA.yellow} />
      <R x={118} y={126} w={4} h={40} f={EGA.yellow} />
      <Label x={60} y={186} text="NOW SERVING: 1" color={EGA.white} size={5} />
    </>
  );
}
