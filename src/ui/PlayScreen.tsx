import { useEffect, useRef, useState } from 'react';
import type { GameState } from '@/engine/types';
import { WORLD } from '@/world';
import { play } from '@/game/sfx';
import { ScenePanel } from './ScenePanel';
import { MessageBox } from './MessageBox';
import type { Notice } from '@/App';

type Props = {
  state: GameState;
  score: number;
  maxScore: number;
  log: string[];
  onSubmit: (input: string) => void;
  muted: boolean;
  onToggleMute: () => void;
  disabled?: boolean;
  notice?: Notice | null;
  onDismissNotice?: () => void;
  /** A one-shot white flash over the scene (the side-quest sting). */
  flash?: boolean;
};

export function PlayScreen({ state, score, maxScore, log, onSubmit, muted, onToggleMute, disabled, notice, onDismissNotice, flash }: Props) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [histIx, setHistIx] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  const room = WORLD.rooms[state.room]!;
  const sceneId = room.scene(state);

  useEffect(() => { if (!disabled) inputRef.current?.focus(); }, [disabled, log]);
  useEffect(() => { textRef.current?.scrollTo({ top: textRef.current.scrollHeight }); }, [log]);

  const submit = () => {
    const v = input.trim();
    if (notice) onDismissNotice?.();
    if (!v) return;
    setHistory((h) => [...h.slice(-49), v]);
    setHistIx(-1);
    setInput('');
    onSubmit(v);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const ix = histIx < 0 ? history.length - 1 : Math.max(0, histIx - 1);
      setHistIx(ix); setInput(history[ix] ?? '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const ix = histIx < 0 ? -1 : histIx + 1;
      if (ix >= history.length) { setHistIx(-1); setInput(''); } else { setHistIx(ix); setInput(history[ix] ?? ''); }
    } else if (e.key.length === 1) {
      play('type');
    }
  };

  return (
    <div className="screen play" data-region={room.region} onClick={() => { if (!disabled) inputRef.current?.focus(); }} role="presentation">
      <div className="statusbar">
        <span>Score : {score} of {maxScore}{state.bonus > 0 ? ` +${state.bonus}` : ''}</span>
        <span className="statusbar-right">
          <button type="button" className="mute inline" onClick={(e) => { e.stopPropagation(); onToggleMute(); }} aria-label={muted ? 'Unmute' : 'Mute'}>
            {muted ? '♪ off' : '♪ on'}
          </button>
          Fabric’s Quest{state.flags.god ? ' ⚡' : ''}
        </span>
      </div>
      <ScenePanel room={room} sceneId={sceneId} state={state} className={flash ? 'flash' : undefined}>
        {notice && <MessageBox text={notice.text} itemId={notice.itemId} onDismiss={() => { onDismissNotice?.(); inputRef.current?.focus(); }} />}
      </ScenePanel>
      <div className="textwin" ref={textRef} aria-live="polite">
        {log.map((line, i) => (
          <div key={i} className={line.startsWith('> ') ? 'echo' : line === line.toUpperCase() && line.length > 3 && /^[A-Z' ]+$/.test(line) ? 'roomname' : undefined}>
            {line || ' '}
          </div>
        ))}
      </div>
      <form className="prompt" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <span className="caret">&gt;</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          disabled={disabled}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Command"
          placeholder={disabled ? '' : 'what now?'}
        />
      </form>
    </div>
  );
}
