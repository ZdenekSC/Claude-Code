import { contextBridge, ipcRenderer } from 'electron';

const api: SettingsApi = {
  getStatus: () => ipcRenderer.invoke('settings:status') as Promise<KeyStatus>,
  saveKey: (key) => ipcRenderer.invoke('settings:saveKey', key) as Promise<void>,
  removeKey: () => ipcRenderer.invoke('settings:removeKey') as Promise<void>,
  openConfig: () => ipcRenderer.send('settings:openConfig'),
};

contextBridge.exposeInMainWorld('settings', api);
