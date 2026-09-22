import { ConsoleRecorder, RayfinRecorder, type Recorder } from '../game/recorder';
import { initRayfinClient } from './rayfinClient';

function isLocalBackendUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

/**
 * Players never sign in, so this only initializes the anonymous data client.
 * If the backend is not configured (plain `vite` without `rayfin dev`, or a missing key)
 * the game still runs and telemetry goes to the console.
 */
export async function bootstrapRecorder(): Promise<Recorder> {
  // No API URL at all means plain `vite` without `rayfin dev` (or a static preview): play offline.
  if (!import.meta.env.VITE_RAYFIN_API_URL) return new ConsoleRecorder();
  const apiUrl: string = import.meta.env.VITE_RAYFIN_API_URL;
  const localDev = isLocalBackendUrl(apiUrl);
  const publishableKey = import.meta.env.VITE_RAYFIN_PUBLISHABLE_KEY;
  if (!publishableKey && !localDev) return new ConsoleRecorder();
  try {
    const client = await initRayfinClient({
      baseUrl: apiUrl.endsWith('/') ? apiUrl : `${apiUrl}/`,
      publishableKey: publishableKey ?? 'local-dev-key',
      localDev,
      runtimeConfig: {
        workspaceId: import.meta.env.VITE_FABRIC_WORKSPACE_ID,
        itemId: import.meta.env.VITE_FABRIC_ITEM_ID,
        portalUrl: import.meta.env.VITE_FABRIC_PORTAL_URL,
      },
    });
    return new RayfinRecorder(client);
  } catch (e) {
    console.warn('Rayfin client unavailable; telemetry disabled.', e);
    return new ConsoleRecorder();
  }
}
