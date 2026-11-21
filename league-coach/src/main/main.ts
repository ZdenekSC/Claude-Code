import { app, BrowserWindow, globalShortcut, ipcMain, Menu, nativeImage, screen, shell, Tray } from 'electron';
import * as path from 'path';
import { loadChampions } from '../core/champions';
import type { CounterTable } from '../core/draft';
import type { BasicSkill } from '../core/skills';
import counters from '../data/counters.json';
import skillOrders from '../data/skill-orders.json';
import { AiCoach } from './aiCoach';
import { Coach } from './coach';
import { loadConfig } from './config';
import { KeyStore, maskKey } from './keyStore';
import { Voice } from './voice';

const ROOT = path.join(__dirname, '..', '..');

// Callouts must be able to play before the user has clicked anything in the overlay.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

function createOverlay(): BrowserWindow {
  const { bounds } = screen.getPrimaryDisplay();
  const win = new BrowserWindow({
    ...bounds,
    transparent: true,
    frame: false,
    resizable: false,
    focusable: false,
    skipTaskbar: true,
    hasShadow: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  // Stay above League (which must run in Borderless mode) and let clicks pass through to the game.
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile(path.join(ROOT, 'static', 'overlay.html'));
  return win;
}

let settingsWindow: BrowserWindow | null = null;

function openSettings(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({
    width: 520,
    height: 560,
    title: 'League Coach — Settings',
    icon: path.join(ROOT, 'static', 'icon.png'),
    alwaysOnTop: true, // so it shows above League in Borderless mode
    autoHideMenuBar: true,
    backgroundColor: '#0a0e14',
    webPreferences: {
      preload: path.join(__dirname, 'settingsPreload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  settingsWindow.loadFile(path.join(ROOT, 'static', 'settings.html'));
}

let tray: Tray | null = null; // kept referenced so it isn't garbage-collected

async function main(): Promise<void> {
  await app.whenReady();
  const { config, file } = await loadConfig(app.getPath('userData'), path.join(ROOT, 'config.example.json'));
  const overlay = createOverlay();
  const send = (channel: string, payload: unknown) => {
    if (!overlay.isDestroyed()) overlay.webContents.send(channel, payload);
  };

  globalShortcut.register(config.toggleHotkey, () => (overlay.isVisible() ? overlay.hide() : overlay.showInactive()));
  globalShortcut.register('CommandOrControl+Shift+Q', () => app.quit());
  globalShortcut.register('CommandOrControl+Shift+S', openSettings);

  const toggleOverlay = () => (overlay.isVisible() ? overlay.hide() : overlay.showInactive());
  tray = new Tray(nativeImage.createFromPath(path.join(ROOT, 'static', 'icon.png')).resize({ width: 16, height: 16 }));
  tray.setToolTip('League Coach');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Settings…', click: openSettings },
      { label: 'Show / hide overlay', click: toggleOverlay },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ]),
  );
  tray.on('click', openSettings);

  const keys = new KeyStore(app.getPath('userData'), ROOT, config.ai.apiKey || undefined);
  await keys.load();
  ipcMain.handle('settings:status', (): KeyStatus => {
    const { key, source } = keys.get();
    return { source, masked: maskKey(key), model: config.ai.model };
  });
  ipcMain.handle('settings:saveKey', async (_event, key: string) => {
    await AiCoach.testKey(String(key));
    await keys.save(String(key));
    send('status', 'API key saved — AI tips are on');
  });
  ipcMain.handle('settings:removeKey', () => keys.save(''));
  ipcMain.on('settings:openConfig', () => void shell.openPath(file));
  if (config.ai.enabled && keys.get().source === 'none') openSettings(); // first run


  // Click-through except while the mouse is over the panel ('forward' keeps mouse-move events flowing).
  ipcMain.on('interactive', (_event, interactive: boolean) => {
    overlay.setIgnoreMouseEvents(!interactive, { forward: true });
  });

  const cacheDir = path.join(app.getPath('userData'), 'cache');
  const champions = await loadChampions(cacheDir);
  const ai = config.ai.enabled ? new AiCoach({ model: config.ai.model, getApiKey: () => keys.get().key }) : null;
  const coach = new Coach(
    champions,
    config,
    counters as CounterTable,
    skillOrders as Record<string, BasicSkill[]>,
    cacheDir,
    ai,
  );
  const voice = new Voice(
    { enabled: config.voice, engine: config.voiceEngine, kokoroVoice: config.kokoroVoice, speed: config.voiceSpeed },
    path.join(app.getPath('userData'), 'models'),
  );
  voice.on('output', (output) => send('voice', output));
  voice.on('status', (text) => send('status', text));
  voice.start();

  ipcMain.handle('askTip', async (_event, championId: string) => {
    const tip = await coach.tipFor(String(championId));
    voice.say(tip, true); // a tip click interrupts whatever is being said
    return tip;
  });
  coach.on('speak', (text: string) => voice.say(text));
  for (const channel of ['phase', 'draft', 'draftAi', 'game', 'roster', 'status']) {
    coach.on(channel, (payload) => send(channel, payload));
  }
  coach.start();
  send('status', `Champion data ${champions.version} loaded — waiting for League…`);

  // Closing the settings window must not quit the app: it lives in the tray.
  app.on('window-all-closed', () => undefined);
  app.on('will-quit', () => {
    coach.stop();
    voice.stop();
    globalShortcut.unregisterAll();
  });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  main().catch((err) => {
    console.error(err);
    app.quit();
  });
}
