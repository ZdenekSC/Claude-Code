import { promises as fs } from 'fs';
import * as path from 'path';
import type { DraftConfig } from '../core/draft';

export interface CoachConfig extends DraftConfig {
  /** Spoken callouts and tips on/off. */
  voice: boolean;
  /** "kokoro" (natural, runs locally, ~90 MB download on first run) or "system" (Windows voice). */
  voiceEngine: 'kokoro' | 'system';
  /** Kokoro voice: af_heart, af_bella, am_michael, am_fenrir, bf_emma, bm_george, ... */
  kokoroVoice: string;
  voiceSpeed: number;
  toggleHotkey: string;
  ai: {
    enabled: boolean;
    /** Claude model id. "claude-haiku-5-5" is far cheaper per tip. */
    model: string;
    /** Optional; the ANTHROPIC_API_KEY environment variable is used when this is empty. */
    apiKey?: string;
  };
}

const DEFAULTS: CoachConfig = {
  pools: {},
  bans: {},
  voice: true,
  voiceEngine: 'kokoro',
  kokoroVoice: 'af_heart',
  voiceSpeed: 1.1,
  toggleHotkey: 'CommandOrControl+Shift+L',
  ai: { enabled: true, model: 'claude-opus-5-5' },
};

/**
 * Reads config.json from the app's user-data folder
 * (%APPDATA%\league-coach\config.json), creating it from config.example.json on first run.
 */
export async function loadConfig(userDataDir: string, examplePath: string): Promise<{ config: CoachConfig; file: string }> {
  const file = path.join(userDataDir, 'config.json');
  let raw = await fs.readFile(file, 'utf8').catch(() => null);
  if (raw === null) {
    raw = await fs.readFile(examplePath, 'utf8').catch(() => '{}');
    await fs.mkdir(userDataDir, { recursive: true });
    await fs.writeFile(file, raw);
  }
  const parsed = JSON.parse(raw) as Partial<CoachConfig>;
  return { config: { ...DEFAULTS, ...parsed, ai: { ...DEFAULTS.ai, ...parsed.ai } }, file };
}
