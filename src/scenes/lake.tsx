import { EGA, Exterior, R, P, L, Water, Reeds, Dock, Boat, Lamp, Person, Signpost, Tree, Moon, Label } from './kit';

export function Shore() {
  return (
    <>
      <Exterior sky={EGA.blue} ground={EGA.green} horizon={90} night />
      <Moon x={40} y={20} />
      <Water y={90} h={70} />
      {/* it is one lake: a single reflection */}
      <R x={44} y={104} w={12} h={4} f={EGA.yellow} s={null} />
      <P pts={[[0, 160], [320, 160], [320, 200], [0, 200]]} f={EGA.brown} s={null} />
      <L pts={[[0, 160], [320, 160]]} />
      <Reeds x={20} y={162} n={6} />
      <Reeds x={260} y={162} n={6} />
      <Signpost x={130} y={130} w={60} text="ONE LAKE" />
      <Label x={124} y={192} text="marshes ↓" color={EGA.lgreen} size={5} />
    </>
  );
}

export function DockScene({ online = false }: { online?: boolean }) {
  return (
    <>
      <Exterior sky={EGA.blue} ground={EGA.blue} horizon={80} night />
      <Moon x={250} y={18} />
      <Water y={80} h={120} />
      <Dock x={40} y={120} />
      <Lamp x={54} y={90} online={online} />
      <Label x={66} y={86} text={online ? 'ONLINE' : 'OFFLINE'} color={online ? EGA.lgreen : EGA.lred} size={6} />
      <Boat x={150} y={140} />
      {/* the Ferryman: grey robe, hood; stands taller when online */}
      <Person x={90} y={online ? 100 : 104} robe={EGA.dgray} hood={EGA.lgray} />
      {!online && <R x={96} y={132} w={2} h={6} f={EGA.lcyan} s={null} />}
      {/* the far isle */}
      <P pts={[[250, 96], [300, 84], [320, 96]]} f={EGA.green} />
    </>
  );
}

export function Island({ standardTaken = false, personalTaken = false }: { standardTaken?: boolean; personalTaken?: boolean }) {
  return (
    <>
      <Exterior sky={EGA.blue} ground={EGA.blue} horizon={70} night />
      <Water y={70} h={130} />
      <P pts={[[40, 200], [80, 130], [240, 130], [280, 200]]} f={EGA.green} />
      <Tree x={90} y={104} leaf={EGA.lgreen} />
      {/* the plinth and two keys */}
      <R x={128} y={122} w={64} h={14} f={EGA.lgray} />
      <R x={136} y={136} w={48} h={30} f={EGA.dgray} />
      {!personalTaken && (
        <>
          <R x={136} y={112} w={14} h={6} f={EGA.lgray} />
          <R x={136} y={106} w={6} h={6} f={EGA.lgray} />
          <Label x={130} y={104} text="P" color={EGA.lgray} size={6} />
        </>
      )}
      {!standardTaken && (
        <>
          <R x={168} y={112} w={16} h={6} f={EGA.yellow} />
          <R x={168} y={104} w={8} h={8} f={EGA.yellow} />
          <Label x={178} y={102} text="S" color={EGA.yellow} size={6} />
        </>
      )}
      <Label x={122} y={180} text="CHOOSE. LIVE WITH IT." color={EGA.white} size={5} />
      <Boat x={230} y={170} />
    </>
  );
}

function Marsh({ water, wave, band, children }: { water: string; wave: string; band: string; children?: React.ReactNode }) {
  return (
    <>
      <Exterior sky={EGA.dgray} ground={band} horizon={84} />
      <Water y={110} h={90} color={water} wave={wave} />
      <P pts={[[0, 110], [60, 100], [120, 112], [200, 102], [260, 114], [320, 106], [320, 120], [0, 120]]} f={band} />
      <Reeds x={30} y={112} n={4} color={wave} />
      <Reeds x={250} y={116} n={5} color={wave} />
      <Tree x={20} y={60} leaf={EGA.dgray} />
      <Tree x={270} y={56} leaf={EGA.dgray} s={1.2} />
      {children}
    </>
  );
}

export function Bronze() {
  return (
    <Marsh water={EGA.brown} wave={EGA.yellow} band="#7a3d00">
      {/* a CSV floating by */}
      <R x={120} y={140} w={70} h={24} f={EGA.white} />
      <Label x={124} y={150} text="Column1,Column2" color={EGA.black} size={5} />
      <Label x={124} y={160} text="Column3,..." color={EGA.black} size={5} />
      <Label x={110} y={100} text="BRONZE" color={EGA.yellow} size={7} />
    </Marsh>
  );
}

export function Silver() {
  return (
    <Marsh water={EGA.lgray} wave={EGA.white} band={EGA.dgray}>
      {[[70, 134], [160, 150], [230, 138]].map(([x, y], i) => (
        <g key={i}>
          <R x={x} y={y} w={30} h={14} f={EGA.white} />
          <Label x={x + 2} y={y + 10} text="{json}" color={EGA.dgray} size={5} />
        </g>
      ))}
      <Label x={116} y={100} text="SILVER" color={EGA.white} size={7} />
    </Marsh>
  );
}

export function LakeHouse() {
  return (
    <>
      <Exterior sky={EGA.blue} ground={EGA.green} horizon={100} night />
      <Moon x={252} y={16} />
      {/* water band: the bottom third of the scene */}
      <Water y={133} h={67} />
      <Reeds x={10} y={136} n={4} />
      {/* mailbox, on land, on a post */}
      <R x={30} y={108} w={4} h={26} f={EGA.brown} />
      <R x={24} y={100} w={16} h={10} f={EGA.lred} />
      {/* the house on stilts, standing in the water */}
      <R x={148} y={130} w={6} h={40} f={EGA.brown} s={null} />
      <R x={188} y={130} w={6} h={40} f={EGA.brown} s={null} />
      <R x={228} y={130} w={6} h={40} f={EGA.brown} s={null} />
      <R x={120} y={70} w={160} h={60} f={EGA.brown} />
      <P pts={[[110, 70], [200, 34], [290, 70]]} f={EGA.dgray} />
      <R x={230} y={96} w={22} h={34} f={EGA.dgray} />
      <R x={140} y={90} w={26} h={20} f={EGA.yellow} />
      {/* porch, with a deck chair, extending over the water toward the shore */}
      <R x={92} y={122} w={40} h={10} f={EGA.brown} />
      <R x={96} y={132} w={4} h={30} f={EGA.brown} s={null} />
      <R x={122} y={132} w={4} h={30} f={EGA.brown} s={null} />
      <R x={100} y={104} w={4} h={20} f={EGA.lgray} />
      <R x={98} y={120} w={16} h={4} f={EGA.lgray} />
      {/* the sign: LAKE and HOUSE, added at different times, in different fonts */}
      <R x={140} y={40} w={90} h={26} f={EGA.white} />
      <Label x={185} y={55} text="LAKE" color={EGA.black} size={9} anchor="middle" />
      <Label x={185} y={63} text="HOUSE" color={EGA.dgray} size={5} anchor="middle" />
    </>
  );
}

export function Gold({ signTaken = false }: { signTaken?: boolean }) {
  return (
    <Marsh water={EGA.yellow} wave={EGA.white} band={EGA.brown}>
      {!signTaken && <Signpost x={120} y={118} w={64} text="SHORTCUT" color={EGA.dgray} labelColor={EGA.lcyan} />}
      {!signTaken && <L pts={[[184, 126], [196, 126], [192, 122]]} s={EGA.lcyan} />}
      {/* the path east to the monastery */}
      <P pts={[[250, 110], [320, 96], [320, 130], [270, 132]]} f={EGA.lgray} />
      <Label x={124} y={100} text="GOLD" color={EGA.white} size={7} />
    </Marsh>
  );
}
