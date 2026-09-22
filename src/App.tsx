import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { MAX_SCORE, describeRoom, newGame, step } from '@/engine/step';
import { resolveNoun } from '@/engine/builtins';
import { hasItemPicture } from '@/scenes/items';
import { SplashScreen } from '@/ui/SplashScreen';
import type { GameState, StepResult } from '@/engine/types';
import { WORLD, WORLD_VERSION } from '@/world';
import type { Recorder } from '@/game/recorder';
import { clearSave, getClientId, getMuted, hashSeed, load, save, setMuted, type SaveBlob } from '@/game/save';
import { cueForOutcome, play, setSfxMuted, type Cue } from '@/game/sfx';
import { TitleScreen } from '@/ui/TitleScreen';
import { PlayScreen } from '@/ui/PlayScreen';
import { DeathCard } from '@/ui/DeathCard';
import { FinishScreen } from '@/ui/FinishScreen';

type Screen = 'splash' | 'title' | 'play' | 'dead' | 'finish';
export type Notice = { text: string; itemId?: string };

type Session = {
  questId: string;
  playerName: string;
  startedAt: string;
  seq: number;
};

export default function App({ recorder }: { recorder: Recorder }) {
  const [screen, setScreen] = useState<Screen>('splash');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [muted, setMutedState] = useState<boolean>(() => getMuted());
  const [savedGame] = useState<SaveBlob | null>(() => load());
  const [lastDeath, setLastDeath] = useState<string>('');
  const [finishedAt, setFinishedAt] = useState<string>('');
  const seqRef = useRef(0);

  useEffect(() => { setSfxMuted(muted); setMuted(muted); }, [muted]);

  const sfx = useCallback((cue: Cue | null) => { if (cue) play(cue); }, []);

  const persist = useCallback((s: GameState, sess: Session, lines: string[]) => {
    save({ state: s, questId: sess.questId, playerName: sess.playerName, startedAt: sess.startedAt, seq: seqRef.current, log: lines.slice(-200), savedAt: new Date().toISOString() });
  }, []);

  const startGame = useCallback((playerName: string) => {
    const questId = crypto.randomUUID();
    const startedAt = new Date().toISOString();
    const s = newGame(WORLD, hashSeed(questId));
    const sess: Session = { questId, playerName, startedAt, seq: 0 };
    seqRef.current = 0;
    recorder.startQuest({ questId, playerName, clientId: getClientId(), worldVersion: WORLD_VERSION, startedAt });
    const intro = [
      `Welcome, ${playerName}, Report Builder of the Village of Pro, to FABRIC'S QUEST.`,
      'Every night, THROTTLOR the Capacity Dragon throttles the village\'s refreshes. Only the Golden Semantic Model can end it. Only the Worthy may take it.',
      'Type two words at a time. Type "help" if lost. Type "get ye flask" if very lost.',
      '',
      describeRoom(s, WORLD),
    ];
    setSession(sess); setState(s); setLog(intro); setScreen('play');
    setNotice({ text: `Welcome, ${playerName}. Every night THROTTLOR throttles the village's refreshes. Find the Golden Semantic Model. Be Worthy.\n\nYour game autosaves here. Your SCORE reaches the Hall of Fame only when you finish — or type QUIT to end early and post it.` });
    persist(s, sess, intro);
  }, [recorder, persist]);

  const restoreGame = useCallback(() => {
    const b = load();
    if (!b) return;
    seqRef.current = b.seq;
    const sess: Session = { questId: b.questId, playerName: b.playerName, startedAt: b.startedAt, seq: b.seq };
    setSession(sess); setState(b.state); setLog([...b.log, '', '(Game restored.)', describeRoom(b.state, WORLD)]);
    setScreen(b.state.dead ? 'dead' : b.state.won ? 'finish' : 'play');
  }, []);

  const restartGame = useCallback(() => {
    if (!session) return;
    const s = newGame(WORLD, hashSeed(session.questId + ':' + seqRef.current));
    const lines = ['(Restarted. Same quest, fresh peasant.)', describeRoom(s, WORLD)];
    setState(s); setLog(lines); setScreen('play');
    persist(s, session, lines);
    sfx('title');
  }, [session, persist, sfx]);

  const submit = useCallback((input: string) => {
    if (!state || !session) return;
    const trimmed = input.trim();
    if (!trimmed) return;
    const r: StepResult = step(state, trimmed, WORLD);
    seqRef.current += 1;
    const lines = [...log, `> ${trimmed}`, ...r.output];
    recorder.record({
      questId: session.questId, seq: seqRef.current, stepId: r.stepId, roomId: r.state.room, rawInput: trimmed,
      verb: r.parsed.verb, noun: [r.parsed.noun, r.parsed.noun2].filter(Boolean).join(' / ') || undefined,
      outcome: r.outcome, outputText: r.output.join('\n'), pointsAwarded: r.pointsAwarded, scoreAfter: r.state.score,
      turnsAfter: r.state.turns, flagsAfter: JSON.stringify(r.state.flags), occurredAt: new Date().toISOString(),
    });

    // Meta verbs that the UI owns.
    const v = r.parsed.verb;
    if (v === 'restore') {
      const b = load();
      if (b && b.questId === session.questId && !b.state.dead) { restoreGame(); sfx('success'); }
      else { setLog([...lines, 'No saved game for this quest.']); setState(r.state); sfx('fail'); }
      return;
    }
    if (v === 'restart') { setState(r.state); setLog(lines); restartGame(); return; }
    if (v === 'quit') {
      // Retire: the run ends here, but the score can still be posted to the Hall of Fame.
      const retired = [...lines, `You retire from the quest with ${r.state.score} points in ${r.state.turns} turns. The dragon keeps the Model. For now.`];
      setState(r.state);
      setLog(retired);
      setNotice(null);
      setFinishedAt(new Date().toISOString());
      setScreen('finish');
      clearSave();
      sfx('door');
      return;
    }

    setState(r.state);
    setLog(lines);
    sfx((r.sfx as Cue | undefined) ?? cueForOutcome(r.outcome, r.pointsAwarded));

    // The Sierra message box: big moments, and pictures of things you pick up or examine.
    const gained = r.state.inventory.filter((i) => !state.inventory.includes(i));
    const pic = gained.find(hasItemPicture);
    let examined: string | undefined;
    if ((v === 'look' || v === 'read') && r.parsed.noun) {
      const res = resolveNoun(r.state, WORLD, r.parsed.noun);
      if (res && res.kind === 'item' && hasItemPicture(res.item.id)) examined = res.item.id;
    }
    if (!r.state.dead && !r.state.won) {
      if (r.pointsAwarded > 0 || pic) setNotice({ text: r.output[0] ?? '', itemId: pic });
      else if (examined) setNotice({ text: r.output[0] ?? '', itemId: examined });
      else if (r.sfx === 'door') setNotice({ text: r.output[0] ?? '' });
      else setNotice(null);
    } else setNotice(null);

    if (r.state.dead) {
      setLastDeath(r.output.join(' '));
      setScreen('dead');
      return; // don't overwrite the pre-death save: 'restore' should bring the player back
    }
    persist(r.state, session, lines);
    if (r.state.won) {
      const now = new Date().toISOString();
      setFinishedAt(now);
      setScreen('finish');
      clearSave();
    }
  }, [state, session, log, recorder, persist, restoreGame, restartGame, sfx]);

  // Leaving mid-quest is safe (autosave), but the score only reaches the Hall of Fame from the finish screen.
  useEffect(() => {
    if (screen !== 'play') return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [screen]);

  const submitScore = useCallback(async () => {
    if (!state || !session) return;
    const elapsed = Math.max(0, Math.round((new Date(finishedAt).getTime() - new Date(session.startedAt).getTime()) / 1000));
    await recorder.finish({ questId: session.questId, playerName: session.playerName, score: state.score, turns: state.turns, elapsedSeconds: elapsed, finishedAt });
  }, [state, session, recorder, finishedAt]);

  const onDeathChoice = useCallback((choice: 'restore' | 'restart' | 'quit') => {
    if (choice === 'restore') {
      const b = load();
      if (b && b.questId === session?.questId && !b.state.dead) { restoreGame(); sfx('success'); }
      else restartGame();
    } else if (choice === 'restart') restartGame();
    else { clearSave(); setState(null); setSession(null); setLog([]); setScreen('title'); }
  }, [session, restoreGame, restartGame, sfx]);

  const toggleMute = useCallback(() => setMutedState((m) => !m), []);

  const statusScore = useMemo(() => state?.score ?? 0, [state]);

  if (screen === 'splash') {
    return <SplashScreen onDone={() => setScreen('title')} />;
  }
  if (screen === 'title' || !state || !session) {
    return (
      <TitleScreen
        onStart={startGame}
        onRestore={savedGame && !savedGame.state.won ? restoreGame : undefined}
        savedName={savedGame?.playerName}
        muted={muted}
        onToggleMute={toggleMute}
        recorder={recorder}
      />
    );
  }
  if (screen === 'finish') {
    return (
      <FinishScreen
        playerName={session.playerName}
        score={state.score}
        maxScore={MAX_SCORE}
        turns={state.turns}
        startedAt={session.startedAt}
        finishedAt={finishedAt}
        endingText={log.slice(-1)[0] ?? ''}
        recorder={recorder}
        cheated={!!state.flags.god}
        onSubmit={submitScore}
        onPlayAgain={() => { clearSave(); setScreen('title'); setState(null); setSession(null); setLog([]); }}
      />
    );
  }
  return (
    <>
      <PlayScreen
        state={state}
        score={statusScore}
        maxScore={MAX_SCORE}
        log={log}
        onSubmit={submit}
        muted={muted}
        onToggleMute={toggleMute}
        disabled={screen === 'dead'}
        notice={notice}
        onDismissNotice={() => setNotice(null)}
      />
      {screen === 'dead' && <DeathCard cause={lastDeath} onChoice={onDeathChoice} />}
    </>
  );
}
