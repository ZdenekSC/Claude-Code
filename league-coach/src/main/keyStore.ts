import { safeStorage } from 'electron';
import { promises as fs } from 'fs';
import * as path from 'path';

export type KeySource = 'saved' | 'config' | 'environment' | 'embedded' | 'none';

/**
 * Where the Anthropic API key comes from, in priority order:
 * 1. saved in Settings (encrypted with Windows DPAPI via Electron safeStorage),
 * 2. "ai.apiKey" in config.json, 3. the ANTHROPIC_API_KEY environment variable,
 * 4. a key embedded at build time (dist/embedded-key.json, never committed).
 */
export class KeyStore {
  private saved: string | undefined;
  private embedded: string | undefined;

  constructor(
    private readonly userDataDir: string,
    private readonly appRoot: string,
    private readonly configKey: string | undefined,
  ) {}

  private get file(): string {
    return path.join(this.userDataDir, 'api-key.bin');
  }

  async load(): Promise<void> {
    const encrypted = await fs.readFile(this.file).catch(() => null);
    if (encrypted && safeStorage.isEncryptionAvailable()) {
      try {
        this.saved = safeStorage.decryptString(encrypted);
      } catch {
        this.saved = undefined; // e.g. copied from another Windows account
      }
    }
    const embedded = await fs.readFile(path.join(this.appRoot, 'dist', 'embedded-key.json'), 'utf8').catch(() => null);
    if (embedded) this.embedded = (JSON.parse(embedded) as { apiKey?: string }).apiKey || undefined;
  }

  get(): { key: string | undefined; source: KeySource } {
    if (this.saved) return { key: this.saved, source: 'saved' };
    if (this.configKey) return { key: this.configKey, source: 'config' };
    if (process.env.ANTHROPIC_API_KEY) return { key: process.env.ANTHROPIC_API_KEY, source: 'environment' };
    if (this.embedded) return { key: this.embedded, source: 'embedded' };
    return { key: undefined, source: 'none' };
  }

  async save(key: string): Promise<void> {
    const trimmed = key.trim();
    if (!trimmed) {
      this.saved = undefined;
      await fs.rm(this.file, { force: true });
      return;
    }
    if (!safeStorage.isEncryptionAvailable()) throw new Error('Windows encryption is not available on this PC.');
    await fs.mkdir(this.userDataDir, { recursive: true });
    await fs.writeFile(this.file, safeStorage.encryptString(trimmed));
    this.saved = trimmed;
  }
}

/** "sk-ant-api03-…abcd" — enough to recognise a key without showing it. */
export function maskKey(key: string | undefined): string {
  if (!key) return '';
  return key.length <= 16 ? '••••' : `${key.slice(0, 10)}…${key.slice(-4)}`;
}
