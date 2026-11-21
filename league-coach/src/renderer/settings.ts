// Settings window (plain script; types from src/shared/types.d.ts).

(() => {
  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const api = window.settings;

  const SOURCES: Record<KeyStatus['source'], string> = {
    saved: 'Using the key saved on this PC',
    config: 'Using the key from config.json',
    environment: 'Using the ANTHROPIC_API_KEY environment variable',
    embedded: 'Using the key built into this installer',
    none: 'No key yet: AI tips are off until you add one',
  };

  async function refresh(): Promise<void> {
    const status = await api.getStatus();
    $('key-status').textContent = `${SOURCES[status.source]}${status.masked ? ` (${status.masked})` : ''}. Model: ${status.model}.`;
    $<HTMLButtonElement>('remove').hidden = status.source !== 'saved';
  }

  function result(text: string, ok: boolean): void {
    const el = $('key-result');
    el.textContent = text;
    el.className = `result ${ok ? 'ok' : 'error'}`;
  }

  $('key-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = $<HTMLInputElement>('key');
    const button = (event.target as HTMLFormElement).querySelector('button[type="submit"]') as HTMLButtonElement;
    if (!input.value.trim()) return result('Paste a key first.', false);
    button.disabled = true;
    result('Checking the key…', true);
    try {
      await api.saveKey(input.value);
      input.value = '';
      result('Key works and is saved. AI tips are on.', true);
    } catch (err) {
      result(String((err as Error).message ?? err).replace(/^.*?Error: /, ''), false);
    } finally {
      button.disabled = false;
      void refresh();
    }
  });

  $('remove').addEventListener('click', async () => {
    await api.removeKey();
    result('Saved key removed.', true);
    void refresh();
  });

  $('open-config').addEventListener('click', () => api.openConfig());

  void refresh();
})();
