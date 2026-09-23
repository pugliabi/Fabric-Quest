import { useEffect, useState, type ReactNode } from 'react';
import type { Room } from '@/world/types';
import type { GameState } from '@/engine/types';
import { DrawnScene, SCENES } from '@/scenes';
import { GodDragon, H, W } from '@/scenes/kit';

const REGION_BG: Record<Room['region'], [string, string]> = {
  village: ['#aa5500', '#ffff55'],
  lake: ['#0000aa', '#55ffff'],
  swamp: ['#00aa00', '#55ff55'],
  monastery: ['#555555', '#aaaaaa'],
  fortress: ['#aa0000', '#ff5555'],
  peaks: ['#aa00aa', '#ff55ff'],
  excel: ['#ffffff', '#1d6f42'],
  copilot: ['#f3f2f1', '#6b4fbb'],
};

/**
 * The scene panel. Priority: a PNG at /scenes/<sceneId>.png (hand or AI art) →
 * the code-drawn SVG scene → a flat EGA placeholder with the room name.
 * `children` renders on top (message box, item card).
 */
export function ScenePanel({ room, sceneId, state, children, className }: { room: Room; sceneId: string; state: GameState; children?: ReactNode; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const url = `${import.meta.env.BASE_URL}scenes/${sceneId}.png`;
    const img = new Image();
    img.onload = () => { if (!cancelled) setSrc(url); };
    img.onerror = () => { if (!cancelled) setSrc(null); };
    img.src = url;
    return () => { cancelled = true; };
  }, [sceneId]);

  const [bg, fg] = REGION_BG[room.region];
  const drawn = !!SCENES[sceneId];
  return (
    <div className={className ? `scene ${className}` : 'scene'} data-scene={sceneId} style={{ background: bg }}>
      {src ? (
        <img src={src} alt={room.name} className="scene-img" />
      ) : drawn ? (
        <DrawnScene sceneId={sceneId} state={state} />
      ) : (
        <div className="scene-placeholder" style={{ color: fg, borderColor: fg }}>
          <div className="scene-region">{room.region.toUpperCase()}</div>
          <div className="scene-name">{room.name}</div>
        </div>
      )}
      {state.flags.god && (
        <svg className="scene-svg scene-overlay" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          <GodDragon />
        </svg>
      )}
      {children}
    </div>
  );
}
