// Ambient types shared by the main process, preload and overlay renderer.
// Kept global (no imports/exports) so the plain-script renderer can use them.

type Lane = 'top' | 'jungle' | 'middle' | 'bottom' | 'utility';
type Skill = 'Q' | 'W' | 'E' | 'R';
type CoachPhase = 'idle' | 'champSelect' | 'inGame';

interface Suggestion {
  champion: string; // display name
  score: number;
  reasons: string[];
}

interface DraftAdvice {
  role: Lane | null;
  bans: Suggestion[];
  picks: Suggestion[];
  notes: string[];
}

interface ObjectiveTimer {
  key: string;
  label: string;
  /** Game time in seconds when the objective (re)spawns. */
  spawnsAt: number;
}

interface GameAdvice {
  gameTime: number;
  timers: ObjectiveTimer[];
  buildTips: string[];
  skillTip: string | null;
}

interface DraftAiAdvice {
  stage: 'ban' | 'pick';
  text: string;
  error: boolean;
}

interface RosterEntry {
  id: string; // Data Dragon champion id
  name: string;
  icon: string; // champion portrait URL
  role: Lane | null;
  isMe: boolean;
}

interface Roster {
  allies: RosterEntry[];
  enemies: RosterEntry[];
}

type VoiceOutput =
  | { kind: 'audio'; id: number; samples: Float32Array; sampleRate: number; interrupt: boolean }
  | { kind: 'system'; text: string; interrupt: boolean; speed: number }
  | { kind: 'stop' };

interface CoachApi {
  onPhase(cb: (phase: CoachPhase) => void): void;
  onDraft(cb: (advice: DraftAdvice | null) => void): void;
  onGame(cb: (advice: GameAdvice) => void): void;
  /** Speech from the main process: Kokoro audio chunks, text for the Windows voice, or stop. */
  onVoice(cb: (output: VoiceOutput) => void): void;
  onStatus(cb: (text: string) => void): void;
  onRoster(cb: (roster: Roster) => void): void;
  onDraftAi(cb: (advice: DraftAiAdvice) => void): void;
  /** Asks the AI about a champion in the current roster; resolves to the tip text. */
  askTip(championId: string): Promise<string>;
  /** Overlay is click-through except while the mouse is over the panel. */
  setInteractive(interactive: boolean): void;
}

interface KeyStatus {
  source: 'saved' | 'config' | 'environment' | 'embedded' | 'none';
  masked: string;
  model: string;
}

interface SettingsApi {
  getStatus(): Promise<KeyStatus>;
  /** Tests the key against the API, then saves it encrypted. Rejects if the key doesn't work. */
  saveKey(key: string): Promise<void>;
  removeKey(): Promise<void>;
  openConfig(): void;
}

interface Window {
  coach: CoachApi;
  settings: SettingsApi;
}
