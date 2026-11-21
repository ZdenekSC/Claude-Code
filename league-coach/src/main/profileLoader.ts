import { buildProfile, MasteryEntry, PlayedGame, PlayerProfile, roleFromTimeline } from '../core/profile';
import type { LcuWatcher } from './lcu';

/** Summoner's Rift queues worth learning from (draft, ranked solo/flex, blind, quickplay, swiftplay). */
const RIFT_QUEUES = new Set([400, 420, 430, 440, 480, 490]);
const HISTORY_GAMES = 60; // pages of 20
const DETAILED_LOSSES = 25; // full games loaded to find who beat you in lane

interface LcuParticipant {
  participantId: number;
  championId: number;
  teamId: number;
  stats: { win: boolean };
  timeline?: { lane?: string; role?: string };
}

interface LcuGame {
  gameId: number;
  queueId: number;
  participants: LcuParticipant[];
  participantIdentities: Array<{ participantId: number; player: { puuid: string } }>;
}

interface LcuMatchList {
  games: { games: LcuGame[] };
}

function myParticipant(game: LcuGame, puuid: string): LcuParticipant | undefined {
  const id = game.participantIdentities.find((p) => p.player.puuid === puuid)?.participantId;
  return game.participants.find((p) => p.participantId === id) ?? (game.participants.length === 1 ? game.participants[0] : undefined);
}

/**
 * Reads the logged-in player's own match history and mastery from the League client.
 * Only official local endpoints; nothing about other players is stored.
 */
export async function loadPlayerProfile(lcu: LcuWatcher): Promise<PlayerProfile | null> {
  const me = await lcu.get<{ puuid: string }>('/lol-summoner/v1/current-summoner');
  if (!me) return null;

  const games: Array<PlayedGame & { lost: boolean }> = [];
  for (let beg = 0; beg < HISTORY_GAMES; beg += 20) {
    const page = await lcu.get<LcuMatchList>(
      `/lol-match-history/v1/products/lol/current-summoner/matches?begIndex=${beg}&endIndex=${beg + 19}`,
      10000,
    );
    const list = page?.games?.games ?? [];
    for (const g of list) {
      if (!RIFT_QUEUES.has(g.queueId)) continue;
      const p = myParticipant(g, me.puuid);
      if (!p) continue;
      const role = roleFromTimeline(p.timeline?.lane, p.timeline?.role);
      games.push({ gameId: g.gameId, championId: p.championId, role, win: p.stats.win, lost: !p.stats.win });
    }
    if (list.length < 20) break;
  }

  // Load the full game for your recent losses (and as many wins) to see who you faced in lane.
  const toDetail = [...games.filter((g) => g.lost).slice(0, DETAILED_LOSSES), ...games.filter((g) => !g.lost).slice(0, DETAILED_LOSSES)];
  for (const g of toDetail) {
    if (!g.role) continue;
    const full = await lcu.get<LcuGame>(`/lol-match-history/v1/games/${g.gameId}`);
    if (!full) continue;
    const mine = myParticipant(full, me.puuid);
    if (!mine) continue;
    const opponent = full.participants.find(
      (p) => p.teamId !== mine.teamId && roleFromTimeline(p.timeline?.lane, p.timeline?.role) === g.role,
    );
    if (opponent) g.laneOpponentId = opponent.championId;
  }

  const mastery =
    (await lcu.get<Array<{ championId: number; championPoints: number }>>('/lol-champion-mastery/v1/local-player/champion-mastery')) ?? [];
  return buildProfile(
    games.map(({ lost: _lost, ...g }) => g),
    mastery.map((m): MasteryEntry => ({ championId: m.championId, points: m.championPoints })),
  );
}
