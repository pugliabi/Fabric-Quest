import { EGA, Interior, Exterior, R, P, L, Water, Battlements, Person, Pipe, Screen, Label, Moon } from './kit';

export function Bridge({ down = false }: { down?: boolean }) {
  return (
    <>
      <Exterior sky={EGA.blue} ground={EGA.dgray} horizon={130} night />
      <Moon x={30} y={18} />
      {/* fortress walls */}
      <R x={60} y={50} w={200} h={80} f={EGA.dgray} />
      <R x={40} y={40} w={30} h={90} f={EGA.dgray} />
      <R x={250} y={40} w={30} h={90} f={EGA.dgray} />
      <Battlements x={40} y={30} w={30} />
      <Battlements x={250} y={30} w={30} />
      <Battlements x={70} y={40} w={180} />
      {/* the gate arch */}
      <R x={140} y={80} w={40} h={50} f={down ? EGA.black : EGA.brown} />
      {/* moat of T-SQL */}
      <Water y={130} h={40} color={EGA.cyan} wave={EGA.white} />
      {[[30, 140], [120, 152], [200, 144], [270, 156]].map(([x, y], i) => <text key={i} x={x} y={y} fontSize="8" fontFamily="monospace" fill={EGA.white}>;</text>)}
      <Label x={230} y={160} text="CROSS APPLY" color={EGA.white} size={4} />
      {/* drawbridge: up (vertical over the gate) or down (across the moat) */}
      {down ? <P pts={[[140, 130], [180, 130], [200, 172], [120, 172]]} f={EGA.brown} /> : <R x={138} y={70} w={44} h={60} f={EGA.brown} />}
      {!down && <L pts={[[140, 70], [128, 50]]} s={EGA.lgray} />}
      {!down && <L pts={[[180, 70], [192, 50]]} s={EGA.lgray} />}
      <R x={0} y={170} w={320} h={30} f={EGA.dgray} s={null} />
      <L pts={[[0, 170], [320, 170]]} />
      {/* the guard on the battlements */}
      <Person x={150} y={44} robe={EGA.lgray} hood={EGA.lgray} px={1.5} />
      <Label x={128} y={40} text="SKU?" color={EGA.yellow} size={6} />
    </>
  );
}

export function Hall() {
  return (
    <>
      <Interior wall={EGA.dgray} wallDark="#3a3a3a" floor={EGA.red} floorDark={EGA.red} ceiling={EGA.black} />
      {/* long columnstore tables in perspective */}
      <P pts={[[70, 130], [130, 130], [120, 180], [40, 180]]} f={EGA.brown} />
      <P pts={[[190, 130], [250, 130], [280, 180], [200, 180]]} f={EGA.brown} />
      {[0, 1, 2, 3].map((i) => <R key={i} x={76 + i * 12} y={134} w={8} h={40} f={EGA.dgray} s={null} />)}
      {[0, 1, 2, 3].map((i) => <R key={i} x={196 + i * 14} y={134} w={8} h={40} f={EGA.dgray} s={null} />)}
      {/* banners and the doors north and east */}
      <R x={140} y={30} w={40} h={60} f={EGA.black} />
      <P pts={[[60, 24], [90, 24], [90, 60], [75, 70], [60, 60]]} f={EGA.lred} />
      <P pts={[[230, 24], [260, 24], [260, 60], [245, 70], [230, 60]]} f={EGA.lred} />
      <Label x={64} y={44} text="dbo" color={EGA.white} size={6} />
      <Label x={234} y={44} text="CCI" color={EGA.white} size={6} />
      <P pts={[[280, 60], [312, 40], [312, 160], [280, 130]]} f={EGA.brown} />
      <Person x={100} y={72} robe={EGA.lgray} hood={EGA.lgray} px={1.5} />
      <Person x={210} y={72} robe={EGA.lgray} hood={EGA.lgray} px={1.5} />
    </>
  );
}

export function Throne({ thrown = false }: { thrown?: boolean }) {
  return (
    <>
      <Interior wall={EGA.red} wallDark={EGA.red} floor={EGA.dgray} ceiling={EGA.black} />
      {/* throne of stacked schemas */}
      {[0, 1, 2, 3, 4].map((i) => <R key={i} x={130 - i * 4} y={110 - i * 14} w={60 + i * 8} h={14} f={[EGA.lgray, EGA.dgray, EGA.lgray, EGA.dgray, EGA.lgray][i]!} />)}
      <Label x={136} y={108} text="dbo" color={EGA.black} size={5} />
      <Label x={132} y={94} text="stg" color={EGA.black} size={5} />
      <Label x={128} y={80} text="gold" color={EGA.black} size={5} />
      <Person x={150} y={74} robe={EGA.magenta} hood={EGA.yellow} />
      {/* the window you get thrown out of */}
      <R x={230} y={36} w={30} h={40} f={EGA.blue} s={EGA.yellow} />
      {thrown && <L pts={[[236, 40], [254, 72]]} s={EGA.white} />}
      {thrown && <L pts={[[254, 40], [236, 72]]} s={EGA.white} />}
      <Label x={80} y={40} text="INNER JOIN" color={EGA.white} size={6} />
      <Label x={90} y={54} text="ME, PEASANT" color={EGA.white} size={6} />
      <Person x={84} y={90} robe={EGA.lgray} hood={EGA.lgray} px={1.5} />
      <Person x={218} y={90} robe={EGA.lgray} hood={EGA.lgray} px={1.5} />
    </>
  );
}

export function Yard({ running = false, cableDropped = false }: { running?: boolean; cableDropped?: boolean }) {
  return (
    <>
      <Exterior sky={EGA.dgray} ground={EGA.brown} horizon={110} />
      <Battlements x={0} y={20} w={320} />
      <R x={0} y={28} w={320} h={82} f={EGA.dgray} s={null} />
      {/* pipes everywhere, none connected */}
      <Pipe x={20} y={40} w={90} h={10} />
      <Pipe x={130} y={40} w={10} h={50} />
      <Pipe x={160} y={60} w={80} h={10} />
      <Pipe x={260} y={30} w={10} h={70} />
      <Pipe x={40} y={70} w={60} h={10} />
      {/* the Copy Activity: a box with a status */}
      <R x={60} y={120} w={70} h={50} f={EGA.lgray} />
      <Screen x={68} y={126} w={54} h={22} color={running ? EGA.lgreen : EGA.lred} lines={2} running={!running} />
      <Label x={64} y={164} text={running ? 'SUCCEEDED' : 'WAITING ON'} color={running ? EGA.lgreen : EGA.lred} size={5} />
      {!running && <Label x={64} y={172} text="LOOKUP" color={EGA.lred} size={5} />}
      {/* the Lookup Activity: a tall box with one big eye, in the corner */}
      <R x={230} y={110} w={50} h={70} f={EGA.dgray} />
      <R x={243} y={128} w={24} h={16} f={EGA.white} />
      <R x={running ? 258 : 251} y={132} w={8} h={8} f={EGA.black} s={null} />
      {cableDropped && !running && <L pts={[[200, 176], [180, 182], [160, 176], [140, 182]]} s={EGA.yellow} sw={3} />}
      {running && <L pts={[[130, 150], [180, 150], [230, 150]]} s={EGA.yellow} sw={3} />}
    </>
  );
}
