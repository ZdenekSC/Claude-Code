// Runs Kokoro text-to-speech on a worker thread so synthesis never blocks the app.
// Messages in:  { type: 'speak', id, text, voice, speed }
// Messages out: { type: 'status', text } | { type: 'ready' } | { type: 'error', message }
//               { type: 'chunk', id, samples: Float32Array, sampleRate } | { type: 'done', id }
import { parentPort, workerData } from 'worker_threads';

interface SpeakRequest {
  type: 'speak';
  id: number;
  text: string;
  voice: string;
  speed: number;
}

const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const port = parentPort!;

async function main(): Promise<void> {
  const transformers = await import('@huggingface/transformers');
  // Keep the downloaded model in the app's data folder (node_modules may be read-only once packaged).
  transformers.env.cacheDir = (workerData as { cacheDir: string }).cacheDir;
  const { KokoroTTS } = await import('kokoro-js');

  let lastPercent = -1;
  const tts = await KokoroTTS.from_pretrained(MODEL_ID, {
    dtype: 'q8', // ~90 MB, good quality, fast on CPU
    device: 'cpu',
    progress_callback: (p) => {
      if (p.status !== 'progress' || !p.file.endsWith('.onnx')) return;
      const percent = Math.floor(p.progress);
      if (percent >= lastPercent + 10) {
        lastPercent = percent;
        port.postMessage({ type: 'status', text: `Downloading voice model… ${percent}%` });
      }
    },
  });
  port.postMessage({ type: 'ready' });

  // One request at a time, in order; a newer 'interrupting' request is handled by the main side dropping old ids.
  let queue = Promise.resolve();
  port.on('message', (msg: SpeakRequest) => {
    if (msg.type !== 'speak') return;
    queue = queue.then(async () => {
      try {
        // Sentence by sentence, so playback starts after the first sentence instead of the whole tip.
        for await (const { audio } of tts.stream(msg.text, { voice: msg.voice as 'af_heart', speed: msg.speed })) {
          const samples = audio.audio as Float32Array;
          port.postMessage({ type: 'chunk', id: msg.id, samples, sampleRate: audio.sampling_rate }, [samples.buffer as ArrayBuffer]);
        }
      } catch (err) {
        port.postMessage({ type: 'error', message: `Kokoro failed: ${(err as Error).message}`, id: msg.id });
      }
      port.postMessage({ type: 'done', id: msg.id });
    });
  });
}

main().catch((err) => port.postMessage({ type: 'error', message: `Kokoro unavailable: ${(err as Error).message}` }));
