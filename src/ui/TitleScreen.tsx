import { useEffect, useRef, useState } from 'react';
import { isThemePlaying, play, startTheme, stopTheme } from '@/game/sfx';
import { HALL_SIZE, type HallEntry, type Recorder } from '@/game/recorder';
import { PixelHero } from './PixelHero';

type Props = {
  onStart: (name: string) => void;
  onRestore?: () => void;
  savedName?: string;
  muted: boolean;
  onToggleMute: () => void;
  recorder: Recorder;
};

type Panel = 'none' | 'scores' | 'about';

const LINKS = [
  ['GitHub — the code', 'https://github.com/pugliabi/Fabric-Quest'],
  ['Puglia BI', 'https://pugliabi.com'],
  ['Blog — PromptingBI', 'https://promptingbi.com/'],
  ['Explicit Measures Podcast', 'https://powerbi.tips/podcast/'],
  ['LinkedIn', 'https://www.linkedin.com/in/tommypuglia/'],
  ['X — @tommypuglia', 'https://x.com/tommypuglia'],
  ['GitHub profile', 'https://github.com/pugliabi'],
  ['The Fabric App itself', 'https://early-coast-531f268ca6-centralus.webapp.fabricapps.net'],
] as const;

const fmt = (secs: number) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

export function TitleScreen({ onStart, onRestore, savedName, muted, onToggleMute, recorder }: Props) {
  const [name, setName] = useState('');
  const [armed, setArmed] = useState(false);
  const [panel, setPanel] = useState<Panel>('none');
  const [hall, setHall] = useState<HallEntry[] | null>(null);
  const [hallStatus, setHallStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const input = useRef<HTMLInputElement>(null);

  // The boot click already unlocked audio, so the theme starts the moment the title screen appears.
  // It follows the mute toggle and stops when the title screen goes away.
  useEffect(() => {
    if (muted) { stopTheme(); return; }
    startTheme();
    return () => stopTheme();
  }, [muted]);

  const arm = () => {
    if (!armed) { setArmed(true); if (!muted && !isThemePlaying()) startTheme(); } // in case audio was locked until now
    if (panel === 'none') input.current?.focus();
  };

  useEffect(() => { input.current?.focus(); }, []);

  const openScores = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setPanel('scores');
    if (hallStatus === 'idle' || hallStatus === 'error') {
      setHallStatus('loading');
      try {
        const rows = await recorder.hallOfFame(HALL_SIZE);
        setHall(rows.filter((r) => r.score > 0).slice(0, HALL_SIZE)); // zeros don't count
        setHallStatus('done');
      } catch { setHallStatus('error'); }
    }
  };

  const start = () => {
    const n = name.trim().slice(0, 40);
    if (!n) { input.current?.focus(); return; }
    stopTheme();      // the overture ends…
    play('title');    // …and the "ba ba ba baaa" sends you off
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
            <button type="submit" className="blink">{name.trim() ? 'CLICK HERE TO PLAY!' : 'TYPE YOUR NAME, THEN PRESS ENTER'}</button>
          </form>
          {onRestore && (
            <button type="button" className="restore-link" onClick={(e) => { e.stopPropagation(); onRestore(); }}>
              Restore {savedName ? `${savedName}'s` : 'saved'} game
            </button>
          )}
          <div className="title-menu">
            <button type="button" className="menu-btn" onClick={openScores}>VIEW HIGH SCORES</button>
            <button type="button" className="menu-btn" onClick={(e) => { e.stopPropagation(); setPanel('about'); }}>ABOUT THE GAME</button>
          </div>
          <p className="credits">by Puglia BI &middot; a tribute to the text adventures of yore &middot; &copy; 2026</p>
          <p className="credits">fabricquest.pugliabi.com &middot; built with Fabric Apps</p>
        </div>
        <div className="title-right" aria-hidden="true">
          <PixelHero />
        </div>
      </div>
      {panel !== 'none' && (
        <div className="title-panel-wrap" onClick={(e) => { e.stopPropagation(); setPanel('none'); input.current?.focus(); }} role="presentation">
          <div className="title-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={panel === 'scores' ? 'High scores' : 'About the game'}>
            {panel === 'scores' ? (
              <>
                <h2>HALL OF FAME</h2>
                <p className="muted-note">Top {HALL_SIZE}. Scores are posted from the finish screen — finish the quest, or type QUIT to end early and post what you have.</p>
                {hallStatus === 'loading' && <p className="muted-note">Consulting the realm…</p>}
                {hallStatus === 'error' && <p className="muted-note">The realm is slow. {recorder.live ? 'Try again in a moment.' : 'Scores are offline in this build.'}</p>}
                {hallStatus === 'done' && (hall && hall.length ? (
                  <ol className="hall-list">
                    {hall.map((h, i) => (
                      <li key={i}><span>{i + 1}. {h.player_name}</span><span>{h.score} pts{h.bonus ? ` +${h.bonus}` : ''} &middot; {h.turns} turns &middot; {fmt(h.elapsed_seconds)}</span></li>
                    ))}
                  </ol>
                ) : <p className="muted-note">No heroes yet. Be the first.</p>)}
              </>
            ) : (
              <>
                <h2>ABOUT FABRIC&rsquo;S QUEST</h2>
                <div className="about-grid">
                  <img src={`${import.meta.env.BASE_URL}about/tommy-8bit.png`} alt="Tommy Puglia, in 8 bits" className="about-portrait" width={96} height={96} />
                  <div>
                    <p>A Sierra-style text adventure through a fantasy Microsoft Fabric, and a working example of a <strong>Fabric App</strong>: every command you type is written to a SQL database in Fabric, and the Hall of Fame reads back from it.</p>
                    <p>An ode to Peasant&rsquo;s Quest and the parser games of the 1980s. Original characters and art. Made by Tommy Puglia of Puglia BI.</p>
                  </div>
                </div>
                <ul className="about-links">
                  {LINKS.map(([label, href]) => <li key={href}><a href={href} target="_blank" rel="noreferrer">{label}</a></li>)}
                </ul>
              </>
            )}
            <button type="button" className="panel-close" onClick={() => { setPanel('none'); input.current?.focus(); }}>CLOSE</button>
          </div>
        </div>
      )}
    </div>
  );
}
