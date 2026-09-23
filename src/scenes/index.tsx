import type { ReactNode } from 'react';
import { Scene } from './kit';
import { Cottage, Square, Mill, Fields, TownHall } from './village';
import { Shore, DockScene, Island, Bronze, Silver, Gold, LakeHouse } from './lake';
import { Gate, Cloister, Spark, Library, Sacristy } from './monastery';
import { Bridge, Hall, Model, Throne, Studio } from './fortress';
import { Foothills, Pass, Ledge, Shrine } from './peaks';
import { Sheet1, DataTab, Pivot } from './excel';
import { Pane, Gallery } from './copilot';
import type { GameState } from '../engine/types';
import { changedFromDefault } from '../engine/governance';

type SceneFn = (s: GameState) => ReactNode;

const pivot = (n: number): SceneFn => (s) => (
  <Pivot n={n} connected={!!s.flags['excel.connected']} built={!!s.flags['excel.pivot']} dim={!!s.flags['excel.dim']} measure={!!s.flags['excel.measure']} filter={!!s.flags['excel.filter']} />
);
/** A flag that must be a non-negative number to count (the lint's "all true" probe sets every flag to `true`; a cleared Copilot chat sets −1). */
const num = (v: unknown): number | undefined => (typeof v === 'number' && v >= 0 ? v : undefined);

/** Scene id (as returned by room.scene(state)) → drawing. Variants read flags directly for richer states. */
export const SCENES: Record<string, SceneFn> = {
  'village.cottage': (s) => <Cottage mugTaken={!!s.flags['taken.mug']} />,
  'village.square': () => <Square />,
  'village.square-calm': () => <Square calm />,
  'village.mill': (s) => <Mill empty={!!s.flags['has.credentials']} />,
  'village.fields': () => <Fields />,
  'village.hall': (s) => <TownHall ticketTaken={!!s.flags['taken.ticket']} />,
  'lake.shore': () => <Shore />,
  'lake.dock': () => <DockScene />,
  'lake.dock-online': () => <DockScene online />,
  'lake.island': (s) => <Island standardTaken={!!s.flags['taken.standard key']} personalTaken={!!s.flags['taken.personal key']} />,
  'lake.house': () => <LakeHouse />,
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
  'monastery.sacristy': (s) => <Sacristy changed={changedFromDefault(s).length} />,
  'fortress.bridge': () => <Bridge />,
  'fortress.bridge-down': () => <Bridge down />,
  'fortress.hall': () => <Hall />,
  'fortress.throne': (s) => <Throne thrown={!!s.flags['trial.moat']} />,
  'fortress.model': (s) => <Model policyTaken={!!s.flags['taken.policy']} />,
  'fortress.studio': (s) => <Studio number={!!s.flags['stare.done']} />,
  'fortress.studio-running': (s) => <Studio number={!!s.flags['stare.done']} refreshed boots={!s.worn.includes('boots')} />,
  'peaks.foothills': () => <Foothills />,
  'peaks.pass': () => <Pass />,
  'peaks.ledge': (s) => <Ledge hoodie={!!s.flags['trial.hoodie']} stink={!!s.flags['trial.moat']} keyLit={!!s.flags['trial.key']} />,
  'peaks.ledge-open': () => <Ledge open />,
  'peaks.shrine': () => <Shrine />,
  'peaks.shrine-clear': () => <Shrine clear />,
  // Side realms
  'excel.sheet1': (s) => <Sheet1 happy={!!s.flags['sq.excel.done']} />,
  'excel.data': () => <DataTab />,
  'excel.data-connected': () => <DataTab connected />,
  'excel.pivot': pivot(0),
  'excel.pivot-1': pivot(1),
  'excel.pivot-2': pivot(2),
  'excel.pivot-3': pivot(3),
  'copilot.pane': (s) => <Pane shape={num(s.flags['copilot.shape'])} rung={num(s.flags['copilot.last'])} measure={num(s.flags['copilot.measure'])} region={num(s.flags['copilot.region'])} />,
  'copilot.gallery': () => <Gallery />,
};

export function DrawnScene({ sceneId, state }: { sceneId: string; state: GameState }) {
  const fn = SCENES[sceneId];
  if (!fn) return null;
  return <Scene>{fn(state)}</Scene>;
}
