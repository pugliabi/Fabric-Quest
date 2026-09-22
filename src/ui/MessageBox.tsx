import { ItemPicture } from '@/scenes/items';

/**
 * The Sierra message box: blue border, white ground, blue pixel text, drawn over the scene.
 * Dismissed by click or Enter. Optionally shows an item picture beneath it.
 */
export function MessageBox({ text, itemId, onDismiss }: { text: string; itemId?: string; onDismiss: () => void }) {
  return (
    <div className="msgbox-wrap" onClick={(e) => { e.stopPropagation(); onDismiss(); }} role="status">
      <div className="msgbox">
        {text.split('\n').map((l, i) => <p key={i}>{l || ' '}</p>)}
        <span className="msgbox-hint">Enter</span>
      </div>
      {itemId && <div className="msgbox-item"><ItemPicture id={itemId} /></div>}
    </div>
  );
}
