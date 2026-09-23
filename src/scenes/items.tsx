/** 16×16 pixel pictures of items, shown in the message box when you get or examine one. */
import { EGA, Sprite } from './kit';

const PAL: Record<string, string> = {
  k: EGA.black, w: EGA.white, g: EGA.lgray, d: EGA.dgray, y: EGA.yellow, b: EGA.blue, B: EGA.lblue, r: EGA.lred,
  R: EGA.red, n: EGA.brown, G: EGA.lgreen, c: EGA.lcyan, o: '#ff8800', m: EGA.lmagenta,
};

const ITEM_ROWS: Record<string, string[]> = {
  license: [
    '................', '.kkkkkkkkkkkkkk.', '.kyyyyyyyyyyyyk.', '.kyyyyyyyyyyyyk.', '.kykkkyyyyyyyyk.', '.kykwkyyyyyyyyk.',
    '.kykkkyyBBBBByk.', '.kyyyyyyyyyyyyk.', '.kyyBBBBBBBByyk.', '.kyyyyyyyyyyyyk.', '.kyyBBBBByyyyyk.', '.kyyyyyyyyyyyyk.',
    '.kyyyyyyyykkkyk.', '.kkkkkkkkkkkkkk.', '................', '................',
  ],
  mug: [
    '................', '................', '..kkkkkkkkk.....', '..kwwwwwwwkkk...', '..kwwwwwwwkwwk..', '..kwrrrrrwkwwk..',
    '..kwrrrrrwkwwk..', '..kwwwwwwwkwwk..', '..kwwwwwwwkwwk..', '..kwwwwwwwkkk...', '..kwwwwwwwk.....', '..kwwwwwwwk.....',
    '..kkkkkkkkk.....', '................', '................', '................',
  ],
  credentials: [
    '................', '...kkkkkkkkkk...', '..kyyyyyyyyyyk..', '..kyyyyyyyyyyk..', '..kykkkkkkkyyk..', '..kyyyyyyyyyyk..',
    '..kykkkkkyyyyk..', '..kyyyyyyyyyyk..', '..kykkkkkkkkyk..', '..kyyyyyyyyyyk..', '..kyykkkkyyyyk..', '..kyyyyyyyyyyk..',
    '..kyyyyyyyykk...', '..kyyyyyyyyk....', '..kkkkkkkkkk....', '................',
  ],
  scroll: [
    '................', '..kkk......kkk..', '.kwwwkkkkkkwwwk.', '.kwwwwwwwwwwwwk.', '..kkwwwwwwwwkk..', '...kwkkkkkkwk...',
    '...kwwwwwwwwk...', '...kwkkkkkwwk...', '...kwwwwwwwwk...', '...kwkkkkkkwk...', '...kwwwwwwwwk...', '..kkwwwwwwwwkk..',
    '.kwwwkkkkkkwwwk.', '..kkk......kkk..', '................', '................',
  ],
  hoodie: [
    '................', '......kkkk......', '.....kddddk.....', '....kddddddk....', '....kdkkkkdk....', '...kddddddddk...',
    '..kdddddoodddk..', '..kdddddoodddk..', '..kdddddddddk...', '..kdkdddddkdk...', '..kdkdddddkdk...', '..kkkdddddkkk...',
    '....kdddddk.....', '....kdddddk.....', '....kkkkkkk.....', '................',
  ],
  shortcut: [
    '................', '..kkkkkkkkkkkk..', '..kcccccccccck..', '..kckkckkkkcck..', '..kcccccccccck..', '..kkkkkkkkkkkk..',
    '.......kk.......', '.......kk.......', '.......kk.......', '.....kkkkkk.....', '....kckkkkck....', '.....kkkkkk.....',
    '.......kk.......', '.......kk.......', '.......kk.......', '................',
  ],
  'personal key': [
    '................', '................', '....kkkk........', '...kggggk.......', '..kggkkggk......', '..kgk..kgk......',
    '..kggkkggk......', '...kggggk.......', '....kggk........', '....kggk........', '....kggkkk......', '....kggggk......',
    '....kggkkk......', '....kggggk......', '....kkkkkk......', '................',
  ],
  'standard key': [
    '................', '................', '....kkkk........', '...kyyyyk.......', '..kyykkyyk......', '..kyk..kyk......',
    '..kyykkyyk......', '...kyyyyk.......', '....kyyk........', '....kyyk........', '....kyykkk......', '....kyyyyk......',
    '....kyykkk......', '....kyyyyk......', '....kkkkkk......', '................',
  ],
  policy: [
    '................', '..kkkkkkkkkkkk..', '..kwwwwwwwwwwk..', '..kwbbbbbbbbwk..', '..kwwwwwwwwwwk..', '..kwGGGwwwwwwk..',
    '..kwGGGGGGwwwk..', '..kwGGGGGGGGwk..', '..kwwwwwwwwwwk..', '..kwddddddddwk..', '..kwwwwwwwwwwk..', '..kwddddddwwwk..',
    '..kwwwwwwwwwwk..', '..kkkkkkkkkkkk..', '................', '................',
  ],
  boots: [
    '................', '....kkkk........', '....kRRk........', '....kRRk........', '....kRRk........', '....kRRk........',
    '....kRRkkkk.....', '....kRRRRRRk....', '...kRRRRRRRRk...', '..kRRRRRRRRRRk..', '..kkkkkkkkkkkk..', '..kyyyyyyyyyyk..',
    '..kkkkkkkkkkkk..', '................', '................', '................',
  ],
  model: [
    '................', '......kkkkk.....', '.....kyyyyyk....', '....kyyyyyyyk...', '...kyyyynnnnk...', '..kyyyyynnnnk...',
    '..kyyyyynnnnk...', '..kyyyyynnnnk...', '..kyyyyykkkkk...', '..kyyyyyk.......', '..kyyyyyk.......', '..kyyyyyk.......',
    '...kkkkkk.......', '....kkkk........', '................', '................',
  ],
  report: [
    '................', '..kkkkkkkkkkk...', '..kwwwwwwwwwkk..', '..kwwwwwwwwwwk..', '..kwyyyyyyywwk..', '..kwyyyyyyywwk..',
    '..kwwwwwwwwwwk..', '..kwrrrwBBBwwk..', '..kwrrrwBBBwwk..', '..kwrrrwBBBwwk..', '..kwwwwwwwwwwk..', '..kwGGGGGGGwwk..',
    '..kwwwwwwwwwwk..', '..kkkkkkkkkkkk..', '................', '................',
  ],
};

export function hasItemPicture(id: string): boolean {
  return id in ITEM_ROWS;
}

/** A framed item picture, 64×64 logical pixels. */
export function ItemPicture({ id, size = 4 }: { id: string; size?: number }) {
  const rows = ITEM_ROWS[id];
  if (!rows) return null;
  return (
    <svg viewBox="0 0 64 64" width={16 * size} height={16 * size} shapeRendering="crispEdges" className="item-pic" aria-hidden="true">
      <rect x={0} y={0} width={64} height={64} fill={EGA.black} />
      <Sprite rows={rows} pal={PAL} x={0} y={0} px={4} />
    </svg>
  );
}
