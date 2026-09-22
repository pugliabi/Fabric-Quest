import { useEffect, useRef, useState } from 'react';
import { play } from '@/game/sfx';
import { PixelHero } from './PixelHero';

type Props = {
  onStart: (name: string) => void;
  onRestore?: () => void;
  savedName?: string;
  muted: boolean;
  onToggleMute: () => void;
};

export function TitleScreen({ onStart, onRestore, savedName, muted, onToggleMute }: Props) {
  const [name, setName] = useState('');
  const [armed, setArmed] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  // The jingle waits for the first click/keypress so autoplay policy is satisfied.
  const arm = () => {
    if (!armed) { setArmed(true); play('title'); }
    input.current?.focus();
  };

  useEffect(() => { input.current?.focus(); }, []);

  const start = () => {
    const n = name.trim().slice(0, 40);
    if (!n) { input.current?.focus(); return; }
    onStart(n);
  };

  return (
    <div className="screen title" onClick={arm} onKeyDown={arm} role="presentation">
      <button type="button" className="mute" onClick={(e) => { e.stopPropagation(); onToggleMute(); }} aria-label={muted ? 'Unmute' : 'Mute'}>
        {muted ? 'SFX OFF' : 'SFX ON'}
      </button>
      <div className="title-grid">
        <div className="title-left">
          <h1 className="logo" aria-label="Fabric's Quest">
            <span className="logo-line">Fabric&rsquo;s</span>
            <span className="logo-line">Quest</span>
          </h1>
          <p className="tagline">A journey through the realm of Fabric</p>
          <form className="name-form" onSubmit={(e) => { e.preventDefault(); start(); }}>
            <label htmlFor="player-name" className="prompt-label">ENTER YOUR NAME, PEASANT:</label>
            <div className="name-row">
              <span className="caret">&gt;</span>
              <input
                id="player-name"
                ref={input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                autoComplete="off"
                spellCheck={false}
                aria-label="Your name"
              />
            </div>
            <button type="submit" className="blink">CLICK ANYWHERE TO PLAY!</button>
          </form>
          {onRestore && (
            <button type="button" className="restore-link" onClick={(e) => { e.stopPropagation(); onRestore(); }}>
              Restore {savedName ? `${savedName}'s` : 'saved'} game
            </button>
          )}
          <p className="credits">by Puglia BI &middot; a tribute to the text adventures of yore &middot; &copy; 2026</p>
        </div>
        <div className="title-right" aria-hidden="true">
          <PixelHero />
        </div>
      </div>
    </div>
  );
}
