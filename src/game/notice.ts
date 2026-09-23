import { ECHO_PREFIX, resolveNoun } from '@/engine/builtins';
import { DELAY_LINE } from '@/engine/step';
import type { GameState, StepResult } from '@/engine/types';
import type { World } from '@/world/types';
import { hasItemPicture } from '@/scenes/items';

export type Notice = { text: string; itemId?: string };

/**
 * The Sierra message box for one turn, or null to close it. A goal card (`box`, the side-quest entries) comes first,
 * with the entrance quip under it when the same turn also reached a new room. Otherwise big moments (points, a
 * side-quest bonus) show the turn's first line, followed by the entrance quip; otherwise the entrance quip, the
 * picture of something picked up or examined, or a door opening.
 */
export function noticeFor(r: StepResult, prev: GameState, world: World): Notice | null {
  if (r.state.dead || r.state.won) return null;
  const gained = r.state.inventory.filter((i) => !prev.inventory.includes(i));
  const pic = gained.find(hasItemPicture);
  const first = r.output[0] ?? '';
  if (r.box) return { text: r.notice ? `${r.box}\n\n${r.notice}` : r.box, itemId: pic };
  if (r.pointsAwarded > 0 || (r.bonusAwarded ?? 0) > 0) return { text: r.notice ? `${first}\n\n${r.notice}` : first, itemId: pic };
  if (r.notice) return { text: r.notice };
  if (pic) return { text: first, itemId: pic };
  const v = r.parsed.verb;
  if ((v === 'look' || v === 'read') && r.parsed.noun) {
    const res = resolveNoun(r.state, world, r.parsed.noun);
    // The picture goes with the description, not with the echo of what you typed or the interactive-delay marker.
    const described = r.output.find((l) => !l.startsWith(ECHO_PREFIX) && l !== DELAY_LINE) ?? first;
    if (res && res.kind === 'item' && hasItemPicture(res.item.id)) return { text: described, itemId: res.item.id };
  }
  if (r.sfx === 'door') return { text: first };
  return null;
}
