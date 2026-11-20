/** Event from GET /liveclientdata/eventdata (Live Client Data API). */
export interface LiveEvent {
  EventID: number;
  EventName: string;
  EventTime: number; // game seconds
  DragonType?: string; // "Fire" | "Earth" | ... | "Elder"
  KillerName?: string;
}

/**
 * Spawn timings in game seconds. Riot changes these between seasons and patches —
 * verify against the current patch notes and update here.
 */
export const OBJECTIVE_TIMINGS = {
  dragon: { firstSpawn: 5 * 60, respawn: 5 * 60 },
  elder: { respawn: 6 * 60 },
  voidgrubs: { firstSpawn: 8 * 60 },
  herald: { firstSpawn: 16 * 60 },
  atakhan: { firstSpawn: 20 * 60 },
  baron: { firstSpawn: 25 * 60, respawn: 6 * 60 },
};

/** Single-spawn objectives: hidden once killed (if the API reports it) or this long after spawning. */
const ONE_SHOT_VISIBLE_AFTER_SPAWN = 4 * 60;

const KILL_EVENTS = {
  voidgrubs: ['HordeKill'],
  herald: ['HeraldKill'],
  atakhan: ['AtakhanKill'],
};

/**
 * Builds the list of upcoming / currently-up objectives.
 * `teamOf` maps a killer name to a team so dragon soul -> Elder can be detected.
 */
export function computeTimers(
  events: LiveEvent[],
  gameTime: number,
  teamOf?: (killerName: string) => string | undefined,
): ObjectiveTimer[] {
  const t = OBJECTIVE_TIMINGS;
  const timers: ObjectiveTimer[] = [];

  // Dragons / Elder
  const dragonKills = events.filter((e) => e.EventName === 'DragonKill');
  const lastDragon = dragonKills[dragonKills.length - 1];
  const soulClaimed = teamOf ? hasSoul(dragonKills, teamOf) : false;
  if (!lastDragon) {
    timers.push({ key: 'dragon', label: 'Dragon', spawnsAt: t.dragon.firstSpawn });
  } else if (lastDragon.DragonType === 'Elder' || soulClaimed) {
    timers.push({ key: 'elder', label: 'Elder Dragon', spawnsAt: lastDragon.EventTime + t.elder.respawn });
  } else {
    timers.push({ key: 'dragon', label: 'Dragon', spawnsAt: lastDragon.EventTime + t.dragon.respawn });
  }

  // One-time objectives
  for (const key of ['voidgrubs', 'herald', 'atakhan'] as const) {
    const killed = events.some((e) => KILL_EVENTS[key].includes(e.EventName));
    const spawnsAt = t[key].firstSpawn;
    if (!killed && gameTime < spawnsAt + ONE_SHOT_VISIBLE_AFTER_SPAWN) {
      timers.push({ key, label: LABELS[key], spawnsAt });
    }
  }

  // Baron
  const baronKills = events.filter((e) => e.EventName === 'BaronKill');
  const lastBaron = baronKills[baronKills.length - 1];
  timers.push({
    key: 'baron',
    label: 'Baron',
    spawnsAt: lastBaron ? lastBaron.EventTime + t.baron.respawn : t.baron.firstSpawn,
  });

  return timers.sort((a, b) => a.spawnsAt - b.spawnsAt);
}

const LABELS = { voidgrubs: 'Voidgrubs', herald: 'Rift Herald', atakhan: 'Atakhan' };

function hasSoul(dragonKills: LiveEvent[], teamOf: (killer: string) => string | undefined): boolean {
  const counts = new Map<string, number>();
  for (const e of dragonKills) {
    if (e.DragonType === 'Elder' || !e.KillerName) continue;
    const team = teamOf(e.KillerName);
    if (!team) continue;
    counts.set(team, (counts.get(team) ?? 0) + 1);
  }
  return [...counts.values()].some((n) => n >= 4);
}

/** Produces each voice callout once: one minute before a spawn and when it spawns. */
export class CalloutTracker {
  private readonly said = new Set<string>();
  private lastGameTime: number | null = null;
  /** On the first check (e.g. app started mid-game), only callouts this fresh are spoken. */
  constructor(private readonly tolerance = 5) {}

  check(timers: ObjectiveTimer[], gameTime: number): string[] {
    const out: string[] = [];
    const previous = this.lastGameTime;
    this.lastGameTime = gameTime;
    for (const timer of timers) {
      const marks: Array<[number, string]> = [
        [60, `${timer.label} spawns in one minute`],
        [0, `${timer.label} is up`],
      ];
      for (const [mark, text] of marks) {
        const markTime = timer.spawnsAt - mark;
        // Fire when the clock crosses the mark since the last check, so slow polls never skip a callout.
        const crossed = previous === null ? gameTime >= markTime && gameTime < markTime + this.tolerance : previous < markTime && gameTime >= markTime;
        const id = `${timer.key}@${timer.spawnsAt}@${mark}`;
        if (crossed && !this.said.has(id)) {
          this.said.add(id);
          out.push(text);
        }
      }
    }
    return out;
  }
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
