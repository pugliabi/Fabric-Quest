import type { ReactNode } from 'react';
import { Scene } from './kit';
import { Cottage, Square, Mill, Fields } from './village';
import { Shore, DockScene, Island, Bronze, Silver, Gold } from './lake';
import { Gate, Cloister, Spark, Library } from './monastery';
import { Bridge, Hall, Throne, Yard } from './fortress';
import { Foothills, Pass, Ledge, Shrine } from './peaks';
import type { GameState } from '../engine/types';

type SceneFn = (s: GameState) => ReactNode;

/** Scene id (as returned by room.scene(state)) → drawing. Variants read flags directly for richer states. */
export const SCENES: Record<string, SceneFn> = {
  'village.cottage': (s) => <Cottage mugTaken={!!s.flags['taken.mug']} />,
  'village.square': () => <Square />,
  'village.square-calm': () => <Square calm />,
  'village.mill': (s) => <Mill empty={!!s.flags['has.credentials']} />,
  'village.fields': () => <Fields />,
  'lake.shore': () => <Shore />,
  'lake.dock': () => <DockScene />,
  'lake.dock-online': () => <DockScene online />,
  'lake.island': (s) => <Island standardTaken={!!s.flags['taken.standard key']} personalTaken={!!s.flags['taken.personal key']} />,
  'swamp.bronze': () => <Bronze />,
  'swamp.silver': () => <Silver />,
  'swamp.gold': () => <Gold />,
  'swamp.gold-nosign': () => <Gold signTaken />,
  'monastery.gate': (s) => <Gate pct={((s.flags['gate.waiting'] as number) ?? 0) / 3} />,
  'monastery.gate-open': () => <Gate open />,
  'monastery.cloister': () => <Cloister />,
  'monastery.spark': () => <Spark />,
  'monastery.spark-fixed': () => <Spark fixed />,
  'monastery.library': () => <Library />,
  'monastery.library-open': () => <Library caseOpen />,
  'fortress.bridge': () => <Bridge />,
  'fortress.bridge-down': () => <Bridge down />,
  'fortress.hall': () => <Hall />,
  'fortress.throne': (s) => <Throne thrown={!!s.flags['trial.moat']} />,
  'fortress.yard': (s) => <Yard cableDropped={!!s.flags['lookup.beaten']} />,
  'fortress.yard-running': () => <Yard running />,
  'peaks.foothills': () => <Foothills />,
  'peaks.pass': () => <Pass />,
  'peaks.ledge': (s) => <Ledge hoodie={!!s.flags['trial.hoodie']} stink={!!s.flags['trial.moat']} keyLit={!!s.flags['trial.key']} />,
  'peaks.ledge-open': () => <Ledge open />,
  'peaks.shrine': () => <Shrine />,
  'peaks.shrine-clear': () => <Shrine clear />,
};

export function DrawnScene({ sceneId, state }: { sceneId: string; state: GameState }) {
  const fn = SCENES[sceneId];
  if (!fn) return null;
  return <Scene>{fn(state)}</Scene>;
}
