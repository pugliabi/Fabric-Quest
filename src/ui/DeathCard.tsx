import { useEffect, useRef, useState } from 'react';

type Choice = 'restore' | 'restart' | 'quit';

export function DeathCard({ cause, onChoice }: { cause: string; onChoice: (c: Choice) => void }) {
  const [typed, setTyped] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  const submit = () => {
    const t = typed.trim().toLowerCase();
    if (t.startsWith('res') && t.includes('to')) onChoice('restore');
    else if (t.startsWith('restart') || t === 'r') onChoice('restart');
    else if (t.startsWith('q')) onChoice('quit');
    else if (t.startsWith('restore')) onChoice('restore');
    setTyped('');
  };

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="death-title">
      <div className="card death">
        <h2 id="death-title">You have died.</h2>
        <p className="cause">{cause}</p>
        <p className="choices">Restore, Restart, or Quit?</p>
        <div className="buttons">
          <button type="button" onClick={() => onChoice('restore')}>Restore</button>
          <button type="button" onClick={() => onChoice('restart')}>Restart</button>
          <button type="button" onClick={() => onChoice('quit')}>Quit</button>
        </div>
        <form className="prompt inline" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <span className="caret">&gt;</span>
          <input ref={ref} value={typed} onChange={(e) => setTyped(e.target.value)} aria-label="Restore, restart, or quit" autoComplete="off" />
        </form>
      </div>
    </div>
  );
}
