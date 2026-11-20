import { app, BrowserWindow, globalShortcut, ipcMain, screen } from 'electron';
import * as path from 'path';
import { loadChampions } from '../core/champions';
import type { CounterTable } from '../core/draft';
import type { BasicSkill } from '../core/skills';
import counters from '../data/counters.json';
import skillOrders from '../data/skill-orders.json';
import { AiCoach } from './aiCoach';
import { Coach } from './coach';
import { loadConfig } from './config';

const ROOT = path.join(__dirname, '..', '..');

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

async function main(): Promise<void> {
  await app.whenReady();
  const { config, file } = await loadConfig(app.getPath('userData'), path.join(ROOT, 'config.example.json'));
  const overlay = createOverlay();
  const send = (channel: string, payload: unknown) => {
    if (!overlay.isDestroyed()) overlay.webContents.send(channel, payload);
  };

  globalShortcut.register(config.toggleHotkey, () => (overlay.isVisible() ? overlay.hide() : overlay.showInactive()));
  globalShortcut.register('CommandOrControl+Shift+Q', () => app.quit());

  overlay.webContents.once('did-finish-load', () => send('status', `Config: ${file}`));

  // Click-through except while the mouse is over the panel ('forward' keeps mouse-move events flowing).
  ipcMain.on('interactive', (_event, interactive: boolean) => {
    overlay.setIgnoreMouseEvents(!interactive, { forward: true });
  });

  const cacheDir = path.join(app.getPath('userData'), 'cache');
  const champions = await loadChampions(cacheDir);
  const ai = config.ai.enabled ? new AiCoach({ model: config.ai.model, apiKey: config.ai.apiKey || undefined }) : null;
  const coach = new Coach(
    champions,
    config,
    counters as CounterTable,
    skillOrders as Record<string, BasicSkill[]>,
    cacheDir,
    ai,
  );
  ipcMain.handle('askTip', (_event, championId: string) => coach.tipFor(String(championId)));
  for (const channel of ['phase', 'draft', 'game', 'roster', 'speak', 'status']) {
    coach.on(channel, (payload) => send(channel, payload));
  }
  coach.start();
  send('status', `Champion data ${champions.version} loaded — waiting for League…`);

  app.on('will-quit', () => {
    coach.stop();
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
