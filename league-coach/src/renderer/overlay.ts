// Overlay renderer (plain script, no imports — types come from src/shared/types.d.ts).

(() => {
  const $ = (id: string) => document.getElementById(id) as HTMLElement;

  function clock(seconds: number): string {
    const s = Math.max(0, Math.floor(seconds));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  function fill(list: HTMLElement, items: HTMLElement[]): void {
    list.replaceChildren(...items);
  }

  function li(text: string, className?: string): HTMLLIElement {
    const el = document.createElement('li');
    el.textContent = text;
    if (className) el.className = className;
    return el;
  }

  function suggestionItem(s: Suggestion): HTMLLIElement {
    const el = li(s.champion);
    if (s.reasons.length) {
      const reason = document.createElement('span');
      reason.className = 'reason';
      reason.textContent = s.reasons.join(' · ');
      el.appendChild(reason);
    }
    return el;
  }

  function showSection(which: 'draft' | 'game' | null): void {
    $('draft').hidden = which !== 'draft';
    $('game').hidden = which !== 'game';
  }

  window.coach.onPhase((phase) => {
    $('phase').textContent = phase === 'champSelect' ? 'champ select' : phase === 'inGame' ? 'in game' : 'idle';
    showSection(phase === 'champSelect' ? 'draft' : phase === 'inGame' ? 'game' : null);
  });

  window.coach.onDraft((advice) => {
    if (!advice) return;
    fill($('bans'), advice.bans.length ? advice.bans.map(suggestionItem) : [li('—', 'reason')]);
    fill($('picks'), advice.picks.length ? advice.picks.map(suggestionItem) : [li('—', 'reason')]);
    fill($('draft-notes'), advice.notes.map((n) => li(n)));
  });

  window.coach.onGame((advice) => {
    fill(
      $('timers'),
      advice.timers.map((t) => {
        const remaining = t.spawnsAt - advice.gameTime;
        const el = li('', remaining <= 0 ? 'up' : remaining <= 60 ? 'soon' : undefined);
        const label = document.createElement('span');
        label.textContent = t.label;
        const time = document.createElement('span');
        time.textContent = remaining <= 0 ? 'UP' : clock(remaining);
        el.append(label, time);
        return el;
      }),
    );
    $('skill').textContent = advice.skillTip ?? '';
    fill($('builds'), advice.buildTips.map((t) => li(t)));
  });

  // Free, offline voice using the Windows built-in speech engine.
  window.coach.onSpeak((text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    speechSynthesis.speak(utterance);
  });

  window.coach.onStatus((text) => {
    $('status').textContent = text;
  });
})();
