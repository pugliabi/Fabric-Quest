import { useState } from 'react';
import { HALL_SIZE, type HallEntry, type Recorder } from '@/game/recorder';

type Props = {
  playerName: string;
  score: number;
  maxScore: number;
  /** Side-quest bonus points, shown next to the score when there are any. */
  bonus: number;
  turns: number;
  startedAt: string;
  finishedAt: string;
  endingText: string;
  recorder: Recorder;
  /** True when the run used god mode — no Hall of Fame for burninators. */
  cheated?: boolean;
  onSubmit: () => Promise<void>;
  onPlayAgain: () => void;
};

const fmt = (secs: number) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

export function FinishScreen({ playerName, score, maxScore, bonus, turns, startedAt, finishedAt, endingText, recorder, cheated, onSubmit, onPlayAgain }: Props) {
  const elapsed = Math.max(0, Math.round((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000));
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [hall, setHall] = useState<HallEntry[] | null>(null);
  const [hallStatus, setHallStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  // The board is read only when asked for (or right after a submit), never on mount — it costs capacity.
  const loadHall = async () => {
    setHallStatus('loading');
    try { setHall((await recorder.hallOfFame(HALL_SIZE)).filter((h) => h.score > 0)); setHallStatus('done'); } catch { setHallStatus('error'); }
  };

  const submit = async () => {
    setStatus('sending');
    try { await onSubmit(); setStatus('done'); await loadHall(); } catch { setStatus('error'); }
  };

  return (
    <div className="screen finish">
      <div className="statusbar"><span>Score : {score} of {maxScore}</span><span>Fabric&rsquo;s Quest</span></div>
      <div className="ending">
        {endingText.split('\n').map((l, i) => <p key={i}>{l || ' '}</p>)}
      </div>
      <div className="summary">
        <div>{playerName}</div>
        <div>Score {score} / {maxScore}{bonus > 0 ? ` · +${bonus} bonus` : ''} &middot; {turns} turns &middot; {fmt(elapsed)}</div>
      </div>
      <div className="buttons">
        {cheated ? (
          <span className="muted-note">Burninators are not eligible for the Hall of Fame.</span>
        ) : score <= 0 ? (
          <span className="muted-note">Zero points. The Hall of Fame politely declines.</span>
        ) : recorder.live ? (
          <button type="button" onClick={submit} disabled={status === 'sending' || status === 'done'}>
            {status === 'done' ? 'Submitted!' : status === 'sending' ? 'Submitting…' : status === 'error' ? 'Try again' : 'Submit to Hall of Fame'}
          </button>
        ) : (
          <span className="muted-note">Hall of Fame is offline in this build.</span>
        )}
        <button type="button" onClick={onPlayAgain}>Play again</button>
      </div>
      <div className="hall">
        <h3>HALL OF FAME</h3>
        {hall === null ? (
          <p className="muted-note">
            {recorder.live ? (
              <button type="button" className="link-btn" onClick={loadHall} disabled={hallStatus === 'loading'}>
                {hallStatus === 'loading' ? 'Consulting the realm…' : hallStatus === 'error' ? 'The realm is slow. Try again' : 'Show the Hall of Fame'}
              </button>
            ) : 'Goes live once the app is deployed to Fabric.'}
          </p>
        ) : hall.length === 0 ? (
          <p className="muted-note">No heroes yet. Be the first.</p>
        ) : (
          <ol>
            {hall.map((h, i) => (
              <li key={i}><span>{h.player_name}</span><span>{h.score} pts{h.bonus ? ` +${h.bonus}` : ''} &middot; {h.turns} turns &middot; {fmt(h.elapsed_seconds)}</span></li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
