import { contextBridge, ipcRenderer } from 'electron';

function listen<T>(channel: string) {
  return (cb: (payload: T) => void) => {
    ipcRenderer.on(channel, (_event, payload: T) => cb(payload));
  };
}

const api: CoachApi = {
  onPhase: listen<CoachPhase>('phase'),
  onDraft: listen<DraftAdvice | null>('draft'),
  onGame: listen<GameAdvice>('game'),
  onSpeak: listen<string>('speak'),
  onStatus: listen<string>('status'),
};

contextBridge.exposeInMainWorld('coach', api);
