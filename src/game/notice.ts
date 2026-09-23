import { resolveNoun } from '@/engine/builtins';
import type { GameState, StepResult } from '@/engine/types';
import type { World } from '@/world/types';
import { hasItemPicture } from '@/scenes/items';

export type Notice = { text: string; itemId?: string };

/**
 * The Sierra message box for one turn, or null to close it. Big moments (points, a side-quest bonus) show the
 * turn's first line, followed by the entrance quip when the same turn also reached a new room; otherwise the
 * entrance quip, the picture of something picked up or examined, or a door opening.
 */
export function noticeFor(r: StepResult, prev: GameState, world: World): Notice | null {
  if (r.state.dead || r.state.won) return null;
  const gained = r.state.inventory.filter((i) => !prev.inventory.includes(i));
  const pic = gained.find(hasItemPicture);
  const first = r.output[0] ?? '';
  if (r.pointsAwarded > 0 || (r.bonusAwarded ?? 0) > 0) return { text: r.notice ? `${first}\n\n${r.notice}` : first, itemId: pic };
  if (r.notice) return { text: r.notice };
  if (pic) return { text: first, itemId: pic };
  const v = r.parsed.verb;
  if ((v === 'look' || v === 'read') && r.parsed.noun) {
    const res = resolveNoun(r.state, world, r.parsed.noun);
    if (res && res.kind === 'item' && hasItemPicture(res.item.id)) return { text: first, itemId: res.item.id };
  }
  if (r.sfx === 'door') return { text: first };
  return null;
}
