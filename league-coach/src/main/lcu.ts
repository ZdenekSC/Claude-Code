import { execFile } from 'child_process';
import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import * as https from 'https';
import WebSocket from 'ws';

/** Connection details for the League Client's local API (LCU). */
export interface LcuCredentials {
  port: number;
  password: string;
}

/** lockfile format: "LeagueClient:<pid>:<port>:<password>:https" */
export function parseLockfile(contents: string): LcuCredentials | null {
  const parts = contents.trim().split(':');
  if (parts.length < 5) return null;
  const port = Number(parts[2]);
  return Number.isInteger(port) && parts[3] ? { port, password: parts[3] } : null;
}

/** Parses LeagueClientUx.exe's command line, which carries the same credentials. */
export function parseCommandLine(commandLine: string): LcuCredentials | null {
  const port = /--app-port=(\d+)/.exec(commandLine)?.[1];
  const password = /--remoting-auth-token=([\w-]+)/.exec(commandLine)?.[1];
  return port && password ? { port: Number(port), password } : null;
}

const DEFAULT_LOCKFILE = 'C:\\Riot Games\\League of Legends\\lockfile';

/** Finds the running client: via its process command line first (works for any install folder), then the default lockfile. */
export async function findClient(): Promise<LcuCredentials | null> {
  if (process.platform === 'win32') {
    const fromProcess = await new Promise<string>((resolve) => {
      execFile(
        'powershell.exe',
        [
          '-NoProfile',
          '-Command',
          "Get-CimInstance Win32_Process -Filter \"name='LeagueClientUx.exe'\" | Select-Object -ExpandProperty CommandLine",
        ],
        { windowsHide: true },
        (_err, stdout) => resolve(stdout ?? ''),
      );
    });
    const creds = parseCommandLine(fromProcess);
    if (creds) return creds;
  }
  const lockfile = await fs.readFile(process.env.LCU_LOCKFILE ?? DEFAULT_LOCKFILE, 'utf8').catch(() => null);
  return lockfile ? parseLockfile(lockfile) : null;
}

const SESSION_EVENT = 'OnJsonApiEvent_lol-champ-select_v1_session';
const PHASE_EVENT = 'OnJsonApiEvent_lol-gameflow_v1_gameflow-phase';

/**
 * Watches the League Client over its WebSocket.
 * Emits 'connected', 'disconnected', 'champSelect' (session | null) and 'phase' (string).
 */
export class LcuWatcher extends EventEmitter {
  private socket: WebSocket | null = null;
  private creds: LcuCredentials | null = null;
  private retryTimer: NodeJS.Timeout | null = null;
  private stopped = false;

  start(): void {
    this.stopped = false;
    void this.connect();
  }

  /** GET a League Client API endpoint (only while connected). Resolves null on any failure. */
  get<T>(path: string, timeoutMs = 5000): Promise<T | null> {
    const creds = this.creds;
    if (!creds || !this.socket) return Promise.resolve(null);
    return new Promise((resolve) => {
      const req = https.get(
        {
          host: '127.0.0.1',
          port: creds.port,
          path,
          headers: { Authorization: `Basic ${Buffer.from(`riot:${creds.password}`).toString('base64')}`, Accept: 'application/json' },
          rejectUnauthorized: false, // the client's self-signed certificate, on 127.0.0.1 only
        },
        (res) => {
          let body = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            if (res.statusCode !== 200) return resolve(null);
            try {
              resolve(JSON.parse(body) as T);
            } catch {
              resolve(null);
            }
          });
        },
      );
      req.setTimeout(timeoutMs, () => req.destroy());
      req.on('error', () => resolve(null));
    });
  }

  stop(): void {
    this.stopped = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.socket?.close();
  }

  private scheduleRetry(): void {
    if (this.stopped) return;
    this.retryTimer = setTimeout(() => void this.connect(), 5000);
  }

  private async connect(): Promise<void> {
    const creds = await findClient();
    if (!creds) return this.scheduleRetry();

    this.creds = creds;
    const auth = Buffer.from(`riot:${creds.password}`).toString('base64');
    // The client uses a self-signed certificate on 127.0.0.1 only.
    const socket = new WebSocket(`wss://127.0.0.1:${creds.port}/`, 'wamp', {
      headers: { Authorization: `Basic ${auth}` },
      rejectUnauthorized: false,
    });
    this.socket = socket;

    socket.on('open', () => {
      socket.send(JSON.stringify([5, SESSION_EVENT]));
      socket.send(JSON.stringify([5, PHASE_EVENT]));
      this.emit('connected');
    });
    socket.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as [number, string, { data: unknown; eventType: string }];
        if (msg[0] !== 8) return;
        const [, event, payload] = msg;
        if (event === SESSION_EVENT) this.emit('champSelect', payload.eventType === 'Delete' ? null : payload.data);
        if (event === PHASE_EVENT) this.emit('phase', payload.data);
      } catch {
        // ignore non-JSON frames
      }
    });
    socket.on('close', () => {
      this.socket = null;
      this.emit('disconnected');
      this.scheduleRetry();
    });
    socket.on('error', () => socket.close());
  }
}
