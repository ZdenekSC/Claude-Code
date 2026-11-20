import { describe, expect, it } from 'vitest';
import { Voice } from './voice';

function collect(voice: Voice) {
  const outputs: VoiceOutput[] = [];
  const statuses: string[] = [];
  voice.on('output', (o: VoiceOutput) => outputs.push(o));
  voice.on('status', (s: string) => statuses.push(s));
  return { outputs, statuses };
}

/** Pretends a Kokoro worker is running, without loading the model. */
function withFakeWorker(voice: Voice) {
  const posted: Array<{ id: number; text: string }> = [];
  const v = voice as unknown as { worker: unknown; onWorkerMessage(m: unknown): void };
  v.worker = { postMessage: (m: { id: number; text: string }) => posted.push(m), terminate: async () => 0 };
  return { posted, send: (m: unknown) => v.onWorkerMessage(m) };
}

const settings = { enabled: true, engine: 'kokoro' as const, kokoroVoice: 'af_heart', speed: 1.1 };
const chunk = (id: number) => ({ type: 'chunk', id, samples: new Float32Array(4), sampleRate: 24000 });

describe('voice', () => {
  it('uses the Windows voice until Kokoro is ready', () => {
    const voice = new Voice(settings, '/tmp');
    const { outputs } = collect(voice);
    voice.say('Dragon spawns in one minute');
    expect(outputs).toEqual([{ kind: 'system', text: 'Dragon spawns in one minute', interrupt: false, speed: 1.1 }]);
  });

  it('sends text to Kokoro once ready and forwards audio chunks', () => {
    const voice = new Voice(settings, '/tmp');
    const { outputs, statuses } = collect(voice);
    const worker = withFakeWorker(voice);
    worker.send({ type: 'status', text: 'Downloading voice model… 50%' });
    worker.send({ type: 'ready' });
    voice.say('Baron is up');
    expect(worker.posted).toEqual([{ type: 'speak', id: 1, text: 'Baron is up', voice: 'af_heart', speed: 1.1 }]);
    worker.send(chunk(1));
    expect(outputs).toEqual([{ kind: 'audio', id: 1, samples: expect.any(Float32Array), sampleRate: 24000, interrupt: false }]);
    expect(statuses).toEqual(['Downloading voice model… 50%', 'Kokoro voice ready (af_heart)']);
  });

  it('a tip click interrupts older speech, including chunks still being generated', () => {
    const voice = new Voice(settings, '/tmp');
    const { outputs } = collect(voice);
    const worker = withFakeWorker(voice);
    worker.send({ type: 'ready' });
    voice.say('Dragon spawns in one minute'); // id 1
    voice.say('Careful, Darius has his Q up', true); // id 2 interrupts
    worker.send(chunk(1)); // late audio for the old line: dropped
    worker.send(chunk(2));
    worker.send(chunk(2)); // second sentence of the tip: queued, not interrupting itself
    expect(outputs.map((o) => (o.kind === 'audio' ? `audio${o.id}${o.interrupt ? '!' : ''}` : o.kind))).toEqual([
      'stop',
      'audio2!',
      'audio2',
    ]);
  });

  it('falls back to the Windows voice if Kokoro fails to load', () => {
    const voice = new Voice(settings, '/tmp');
    const { outputs, statuses } = collect(voice);
    const worker = withFakeWorker(voice);
    worker.send({ type: 'error', message: 'Kokoro unavailable: fetch failed' });
    voice.say('Herald is up');
    expect(statuses[0]).toBe('Kokoro unavailable: fetch failed — using the Windows voice instead');
    expect(outputs[0].kind).toBe('system');
  });

  it('stays silent when voice is off', () => {
    const voice = new Voice({ ...settings, enabled: false }, '/tmp');
    const { outputs } = collect(voice);
    voice.say('anything', true);
    expect(outputs).toEqual([]);
  });
});
