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
  onVoice: listen<VoiceOutput>('voice'),
  onStatus: listen<string>('status'),
  onRoster: listen<Roster>('roster'),
  askTip: (championId) => ipcRenderer.invoke('askTip', championId) as Promise<string>,
  setInteractive: (interactive) => ipcRenderer.send('interactive', interactive),
};

contextBridge.exposeInMainWorld('coach', api);
