import { describe, expect, it } from 'vitest';
import { bansFor, buildProfile, PlayedGame, poolFor, roleFromTimeline } from './profile';

const AHRI = 103, SYNDRA = 134, LUX = 99, GAREN = 86, ZED = 238, YASUO = 157, FIZZ = 105, JINX = 222;

let id = 0;
const game = (championId: number, role: Lane | null, win: boolean, laneOpponentId?: number): PlayedGame => ({
  gameId: ++id, championId, role, win, laneOpponentId,
});

const history: PlayedGame[] = [
  ...Array.from({ length: 8 }, (_, i) => game(AHRI, 'middle', i < 6, i < 6 ? FIZZ : ZED)), // 6 wins, both losses to Zed
  ...Array.from({ length: 4 }, (_, i) => game(SYNDRA, 'middle', i < 1, i < 1 ? FIZZ : YASUO)), // 1 win, 3 losses to Yasuo
  game(GAREN, 'top', true),
  game(JINX, null, false), // unknown role (e.g. remake): ignored for roles
];
const mastery = [
  { championId: LUX, points: 450_000 },
  { championId: AHRI, points: 120_000 },
  { championId: GAREN, points: 30_000 },
];

describe('roles from match history', () => {
  it('maps timeline lane/role, splitting bot lane into carry and support', () => {
    expect(roleFromTimeline('MIDDLE', 'SOLO')).toBe('middle');
    expect(roleFromTimeline('MID', 'SOLO')).toBe('middle');
    expect(roleFromTimeline('JUNGLE', 'NONE')).toBe('jungle');
    expect(roleFromTimeline('BOTTOM', 'DUO_CARRY')).toBe('bottom');
    expect(roleFromTimeline('BOTTOM', 'DUO_SUPPORT')).toBe('utility');
    expect(roleFromTimeline('NONE', 'DUO')).toBeNull();
  });
});

describe('player profile', () => {
  const profile = buildProfile(history, mastery);

  it('finds main roles by games played', () => {
    expect(profile.gamesAnalyzed).toBe(14);
    expect(profile.mainRoles).toEqual(['middle', 'top']);
  });

  it('ranks the role pool by games and results, with readable reasons', () => {
    expect(profile.pool.middle.map((e) => e.championId)).toEqual([AHRI, SYNDRA]);
    expect(profile.pool.middle[0].reason).toBe('8 recent games, 75% wins');
  });

  it('pads a thin pool with high-mastery champions, and respects what is pickable', () => {
    expect(poolFor(profile, 'middle').map((e) => e.championId)).toEqual([AHRI, SYNDRA, LUX, GAREN]);
    expect(poolFor(profile, 'middle').at(2)?.reason).toBe('450k mastery');
    expect(poolFor(profile, 'middle', new Set([SYNDRA, GAREN])).map((e) => e.championId)).toEqual([SYNDRA, GAREN]);
    // Blind pick (no role): uses the main roles.
    expect(poolFor(profile, null).slice(0, 3).map((e) => e.championId)).toEqual([AHRI, SYNDRA, GAREN]);
  });

  it('suggests banning the lane opponents who beat you most', () => {
    const bans = bansFor(profile, 'middle');
    expect(bans.map((e) => e.championId)).toEqual([YASUO, ZED]);
    expect(bans[0].reason).toBe('Beat you 3 of 3 times in lane');
    expect(bansFor(profile, 'middle', new Set([ZED])).map((e) => e.championId)).toEqual([ZED]);
    expect(bansFor(profile, 'jungle')).toEqual([]);
  });

  it('works with no history at all (new account)', () => {
    const empty = buildProfile([], mastery);
    expect(empty.mainRoles).toEqual([]);
    expect(poolFor(empty, 'top').map((e) => e.championId)).toEqual([LUX, AHRI, GAREN]);
    expect(bansFor(empty, 'top')).toEqual([]);
  });
});
