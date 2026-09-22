import { createRoot } from 'react-dom/client';

import App from '@/App';
import { DeferredRecorder } from '@/game/recorder';

import './ui/styles.css';

// Paint first, connect second. The Rayfin client is a separate chunk that loads after the game is on screen;
// anything recorded before it arrives is queued.
const recorder = new DeferredRecorder(import('@/services/gameClient').then((m) => m.bootstrapRecorder()));

createRoot(document.getElementById('root')!).render(<App recorder={recorder} />);
