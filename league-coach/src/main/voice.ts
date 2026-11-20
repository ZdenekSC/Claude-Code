import { EventEmitter } from 'events';
import * as path from 'path';
import { Worker } from 'worker_threads';

export interface VoiceSettings {
  enabled: boolean;
  /** "kokoro" = natural neural voice (local, free); "system" = Windows built-in voice. */
  engine: 'kokoro' | 'system';
  /** Kokoro voice id, e.g. "af_heart", "am_michael", "bf_emma", "bm_george". */
  kokoroVoice: string;
  speed: number;
}

// VoiceOutput (what the overlay should do with a line of speech) is declared in src/shared/types.d.ts.

/**
 * Speaks coach lines with Kokoro when it's ready, and with the Windows voice otherwise
 * (while the model downloads on first run, or if Kokoro can't load on this PC).
 * Emits 'output' (VoiceOutput) and 'status' (string).
 */
export class Voice extends EventEmitter {
  private worker: Worker | null = null;
  private ready = false;
  private nextId = 1;
  /** Requests older than this are dropped (a tip click interrupts whatever was playing). */
  private minLiveId = 0;
  private readonly firstChunk = new Set<number>();
  private readonly interrupting = new Set<number>();

  constructor(
    private readonly settings: VoiceSettings,
    private readonly modelCacheDir: string,
  ) {
    super();
  }

  start(): void {
    if (!this.settings.enabled || this.settings.engine !== 'kokoro') return;
    const worker = new Worker(path.join(__dirname, 'ttsWorker.js'), { workerData: { cacheDir: this.modelCacheDir } });
    this.worker = worker;
    worker.on('message', (msg: WorkerMessage) => this.onWorkerMessage(msg));
    worker.on('error', (err) => this.fallBack(`Kokoro crashed: ${err.message}`));
    worker.on('exit', (code) => {
      if (code !== 0) this.fallBack(`Kokoro stopped (code ${code})`);
    });
  }

  stop(): void {
    void this.worker?.terminate();
    this.worker = null;
  }

  /** `interrupt` stops anything playing or queued (used for tip clicks). */
  say(text: string, interrupt = false): void {
    if (!this.settings.enabled || !text.trim()) return;
    const id = this.nextId++;
    if (interrupt) {
      this.minLiveId = id;
      this.emit('output', { kind: 'stop' } satisfies VoiceOutput);
    }
    if (this.worker && this.ready) {
      this.firstChunk.add(id);
      if (interrupt) this.interrupting.add(id);
      this.worker.postMessage({ type: 'speak', id, text, voice: this.settings.kokoroVoice, speed: this.settings.speed });
    } else {
      this.emit('output', { kind: 'system', text, interrupt, speed: this.settings.speed } satisfies VoiceOutput);
    }
  }

  private onWorkerMessage(msg: WorkerMessage): void {
    switch (msg.type) {
      case 'status':
        this.emit('status', msg.text);
        break;
      case 'ready':
        this.ready = true;
        this.emit('status', `Kokoro voice ready (${this.settings.kokoroVoice})`);
        break;
      case 'chunk': {
        if (msg.id < this.minLiveId) return; // interrupted by a newer tip
        const interrupt = this.firstChunk.has(msg.id) && this.interrupting.has(msg.id);
        this.firstChunk.delete(msg.id);
        this.emit('output', { kind: 'audio', id: msg.id, samples: msg.samples, sampleRate: msg.sampleRate, interrupt } satisfies VoiceOutput);
        break;
      }
      case 'done':
        this.firstChunk.delete(msg.id);
        this.interrupting.delete(msg.id);
        break;
      case 'error':
        if (msg.id === undefined) this.fallBack(msg.message);
        else this.emit('status', msg.message);
        break;
    }
  }

  private fallBack(reason: string): void {
    this.ready = false;
    this.worker = null;
    this.emit('status', `${reason} — using the Windows voice instead`);
  }
}

type WorkerMessage =
  | { type: 'status'; text: string }
  | { type: 'ready' }
  | { type: 'error'; message: string; id?: number }
  | { type: 'chunk'; id: number; samples: Float32Array; sampleRate: number }
  | { type: 'done'; id: number };
