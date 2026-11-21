/**
 * The player's champion pool and "nemeses", learned automatically from their own
 * match history and champion mastery (read from the League client).
 */

export interface PlayedGame {
  gameId: number;
  championId: number;
  role: Lane | null;
  win: boolean;
  /** The enemy who played the same role, when the full game was loaded. */
  laneOpponentId?: number;
}

export interface MasteryEntry {
  championId: number;
  points: number;
}

/** A champion with the evidence for suggesting it, as the overlay shows it. */
export interface ProfileEntry {
  championId: number;
  score: number;
  reason: string;
}

export interface PlayerProfile {
  gamesAnalyzed: number;
  /** Most played role first. */
  mainRoles: Lane[];
  pool: Record<Lane, ProfileEntry[]>;
  nemeses: Record<Lane, ProfileEntry[]>;
  topMastery: ProfileEntry[];
}

const LANES: Lane[] = ['top', 'jungle', 'middle', 'bottom', 'utility'];
const emptyByLane = <T>(): Record<Lane, T[]> => ({ top: [], jungle: [], middle: [], bottom: [], utility: [] });

/** Match-history timeline data: lane TOP/JUNGLE/MIDDLE/BOTTOM, role SOLO/DUO_CARRY/DUO_SUPPORT/... */
export function roleFromTimeline(lane: string | undefined, role: string | undefined): Lane | null {
  switch ((lane ?? '').toUpperCase()) {
    case 'TOP':
      return 'top';
    case 'JUNGLE':
      return 'jungle';
    case 'MIDDLE':
    case 'MID':
      return 'middle';
    case 'BOTTOM':
    case 'BOT':
      return /SUPPORT/i.test(role ?? '') ? 'utility' : 'bottom';
    default:
      return null;
  }
}

function pct(wins: number, games: number): string {
  return `${Math.round((100 * wins) / games)}%`;
}

export function buildProfile(games: PlayedGame[], mastery: MasteryEntry[]): PlayerProfile {
  const pool = emptyByLane<ProfileEntry>();
  const nemeses = emptyByLane<ProfileEntry>();
  const roleGames = new Map<Lane, number>();
  const masteryPoints = new Map(mastery.map((m) => [m.championId, m.points]));

  for (const lane of LANES) {
    const inRole = games.filter((g) => g.role === lane);
    roleGames.set(lane, inRole.length);

    // Pool: games played (comfort) weighted by how well it goes, plus a little mastery.
    const byChamp = new Map<number, { games: number; wins: number }>();
    for (const g of inRole) {
      const s = byChamp.get(g.championId) ?? { games: 0, wins: 0 };
      s.games++;
      if (g.win) s.wins++;
      byChamp.set(g.championId, s);
    }
    pool[lane] = [...byChamp.entries()]
      .map(([championId, s]) => {
        // Smoothed win rate so a single lucky win doesn't dominate.
        const winRate = (s.wins + 1) / (s.games + 2);
        const masteryBonus = Math.min(1, (masteryPoints.get(championId) ?? 0) / 200_000);
        return {
          championId,
          score: s.games * (0.5 + winRate) + masteryBonus,
          reason: `${s.games} recent game${s.games === 1 ? '' : 's'}, ${pct(s.wins, s.games)} wins`,
        };
      })
      .sort((a, b) => b.score - a.score);

    // Nemeses: lane opponents you lost to most, relative to how often you faced them.
    const faced = new Map<number, { games: number; losses: number }>();
    for (const g of inRole) {
      if (!g.laneOpponentId) continue;
      const s = faced.get(g.laneOpponentId) ?? { games: 0, losses: 0 };
      s.games++;
      if (!g.win) s.losses++;
      faced.set(g.laneOpponentId, s);
    }
    nemeses[lane] = [...faced.entries()]
      .filter(([, s]) => s.losses > 0)
      .map(([championId, s]) => ({
        championId,
        score: s.losses * (s.losses / s.games),
        reason: `Beat you ${s.losses} of ${s.games} time${s.games === 1 ? '' : 's'} in lane`,
      }))
      .sort((a, b) => b.score - a.score);
  }

  const topMastery = [...mastery]
    .sort((a, b) => b.points - a.points)
    .slice(0, 10)
    .map((m) => ({ championId: m.championId, score: m.points, reason: `${Math.round(m.points / 1000)}k mastery` }));

  const mainRoles = LANES.filter((l) => (roleGames.get(l) ?? 0) > 0).sort((a, b) => roleGames.get(b)! - roleGames.get(a)!);
  return { gamesAnalyzed: games.length, mainRoles, pool, nemeses, topMastery };
}

/**
 * Champions to suggest for a role: history in that role first, then high-mastery champions
 * to fill up thin pools (new accounts, off-role). Filtered to what's pickable right now.
 */
export function poolFor(profile: PlayerProfile, role: Lane | null, pickable?: Set<number>, size = 6): ProfileEntry[] {
  const roles = role ? [role] : profile.mainRoles.slice(0, 2);
  const seen = new Set<number>();
  const out: ProfileEntry[] = [];
  const add = (e: ProfileEntry) => {
    if (seen.has(e.championId) || (pickable && !pickable.has(e.championId))) return;
    seen.add(e.championId);
    out.push(e);
  };
  for (const r of roles) profile.pool[r].forEach(add);
  for (const m of profile.topMastery) if (out.length < size) add(m);
  return out.slice(0, size);
}

export function bansFor(profile: PlayerProfile, role: Lane | null, bannable?: Set<number>): ProfileEntry[] {
  const roles = role ? [role] : profile.mainRoles.slice(0, 1);
  return roles
    .flatMap((r) => profile.nemeses[r])
    .filter((e) => !bannable || bannable.has(e.championId))
    .slice(0, 5);
}
