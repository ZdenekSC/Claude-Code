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

interface CoachApi {
  onPhase(cb: (phase: CoachPhase) => void): void;
  onDraft(cb: (advice: DraftAdvice | null) => void): void;
  onGame(cb: (advice: GameAdvice) => void): void;
  onSpeak(cb: (text: string) => void): void;
  onStatus(cb: (text: string) => void): void;
}

interface Window {
  coach: CoachApi;
}
