import { describe, expect, it } from 'vitest';
import { parseCommandLine, parseLockfile } from '../main/lcu';
import { buildTips } from './builds';
import { ChampSelectSession, DraftCandidates, mergeCandidates, suggestDraft } from './draft';
import { testIndex } from './fixtures';
import { CalloutTracker, computeTimers, formatClock, LiveEvent } from './objectives';
import { nextSkill, skillTip } from './skills';

describe('LCU credentials', () => {
  it('parses the lockfile', () => {
    expect(parseLockfile('LeagueClient:1234:56789:s3cr3t-Pw:https')).toEqual({ port: 56789, password: 's3cr3t-Pw' });
    expect(parseLockfile('garbage')).toBeNull();
  });
  it('parses the client command line', () => {
    const cmd = '"C:/Riot Games/League of Legends/LeagueClientUx.exe" "--remoting-auth-token=AbC_12-x" "--app-port=61234"';
    expect(parseCommandLine(cmd)).toEqual({ port: 61234, password: 'AbC_12-x' });
    expect(parseCommandLine('')).toBeNull();
  });
});

describe('champion lookup', () => {
  it('finds by id, display name and Live Client raw name', () => {
    expect(testIndex.find('wukong')?.id).toBe('MonkeyKing');
    expect(testIndex.fromRawName('game_character_displayname_MonkeyKing')?.name).toBe('Wukong');
    expect(testIndex.byKey.get(103)?.name).toBe('Ahri');
  });
});

describe('draft suggestions', () => {
  const candidates: DraftCandidates = {
    pool: [
      { key: 103, reason: '12 recent games, 67% wins' }, // Ahri
      { key: 134, reason: '5 recent games, 60% wins' }, // Syndra
      { key: 127, reason: '3 recent games, 33% wins' }, // Lissandra
    ],
    bans: [
      { key: 238, reason: 'Beat you 3 of 4 times in lane' }, // Zed
      { key: 157, reason: 'Beat you 2 of 2 times in lane' }, // Yasuo
      { key: 134, reason: 'Beat you 1 of 3 times in lane' }, // Syndra
    ],
  };
  const counters = { Zed: ['Lissandra'] };

  function session(over: Partial<ChampSelectSession> = {}): ChampSelectSession {
    return {
      localPlayerCellId: 2,
      myTeam: [
        { cellId: 0, championId: 0, assignedPosition: 'top' },
        { cellId: 1, championId: 0, assignedPosition: 'jungle' },
        { cellId: 2, championId: 0, assignedPosition: 'middle' },
      ],
      theirTeam: [],
      actions: [],
      ...over,
    };
  }

  it('suggests bans from the role list, skipping banned champions and teammate hovers', () => {
    const s = session({
      myTeam: [
        { cellId: 0, championId: 0, championPickIntent: 134, assignedPosition: 'top' }, // teammate hovers Syndra
        { cellId: 2, championId: 0, assignedPosition: 'middle' },
      ],
      actions: [[{ actorCellId: 7, championId: 157, completed: true, type: 'ban' }]], // Yasuo banned
    });
    const advice = suggestDraft(s, testIndex, candidates, counters);
    expect(advice.role).toBe('middle');
    expect(advice.bans).toEqual([{ champion: 'Zed', score: 3, reasons: ['Beat you 3 of 4 times in lane'] }]);
  });

  it('puts config.json overrides before automatic candidates, without duplicates', () => {
    const merged = mergeCandidates(testIndex, { pools: { middle: ['Lissandra', 'Wukong'] }, bans: {} }, 'middle', candidates);
    expect(merged.pool.map((c) => c.key)).toEqual([127, 62, 103, 134]);
    expect(merged.pool[0].reason).toBe('From your config.json');
    expect(merged.bans).toEqual(candidates.bans);
  });

  it('ranks a counter pick above comfort', () => {
    const s = session({ theirTeam: [{ cellId: 5, championId: 238 }] }); // enemy Zed
    const advice = suggestDraft(s, testIndex, candidates, counters);
    expect(advice.picks[0].champion).toBe('Lissandra');
    expect(advice.picks[0].reasons).toContain('Good into Zed');
  });

  it('notes damage imbalance in the team', () => {
    const s = session({
      myTeam: [
        { cellId: 0, championId: 86, assignedPosition: 'top' }, // Garen
        { cellId: 1, championId: 64, assignedPosition: 'jungle' }, // Lee Sin
        { cellId: 3, championId: 222, assignedPosition: 'bottom' }, // Jinx
        { cellId: 2, championId: 0, assignedPosition: 'middle' },
      ],
    });
    const advice = suggestDraft(s, testIndex, { pool: [{ key: 238, reason: 'a' }, { key: 103, reason: 'b' }], bans: [] }, {});
    expect(advice.notes.join(' ')).toMatch(/mostly physical/);
    expect(advice.picks[0].champion).toBe('Ahri');
  });
});

describe('objective timers', () => {
  const ev = (EventName: string, EventTime: number, extra: Partial<LiveEvent> = {}): LiveEvent => ({
    EventID: EventTime,
    EventName,
    EventTime,
    ...extra,
  });

  it('shows first spawns at game start', () => {
    const timers = computeTimers([], 60);
    expect(timers.map((t) => t.key)).toEqual(['dragon', 'voidgrubs', 'herald', 'atakhan', 'baron']);
  });

  it('uses the respawn time after a kill', () => {
    const timers = computeTimers([ev('DragonKill', 400, { DragonType: 'Fire' }), ev('BaronKill', 1600)], 1700);
    expect(timers.find((t) => t.key === 'dragon')?.spawnsAt).toBe(700);
    expect(timers.find((t) => t.key === 'baron')?.spawnsAt).toBe(1960);
  });

  it('switches to Elder after a team takes soul', () => {
    const kills = [300, 700, 1100, 1500].map((t) => ev('DragonKill', t, { DragonType: 'Earth', KillerName: 'A' }));
    const timers = computeTimers(kills, 1600, () => 'ORDER');
    expect(timers.find((t) => t.key === 'elder')?.spawnsAt).toBe(1860);
    expect(timers.find((t) => t.key === 'dragon')).toBeUndefined();
  });

  it('hides Herald once killed', () => {
    expect(computeTimers([ev('HeraldKill', 1000)], 1010).some((t) => t.key === 'herald')).toBe(false);
  });

  it('calls each warning once and skips stale ones', () => {
    const tracker = new CalloutTracker();
    const timers = [{ key: 'dragon', label: 'Dragon', spawnsAt: 300 }];
    expect(tracker.check(timers, 240)).toEqual(['Dragon spawns in one minute']);
    expect(tracker.check(timers, 241)).toEqual([]);
    expect(tracker.check(timers, 300)).toEqual(['Dragon is up']);
    expect(new CalloutTracker().check(timers, 200)).toEqual([]); // nothing due yet
    expect(new CalloutTracker().check(timers, 280)).toEqual([]); // started late: no stale callout
  });

  it('does not skip callouts when polls are far apart', () => {
    const tracker = new CalloutTracker();
    const timers = [{ key: 'dragon', label: 'Dragon', spawnsAt: 300 }];
    tracker.check(timers, 230);
    expect(tracker.check(timers, 260)).toEqual(['Dragon spawns in one minute']);
    expect(tracker.check(timers, 320)).toEqual(['Dragon is up']);
  });

  it('formats clocks', () => {
    expect(formatClock(65.7)).toBe('1:05');
  });
});

describe('skill suggestions', () => {
  const ranks = (Q: number, W: number, E: number, R: number) => ({ Q, W, E, R });

  it('takes each basic ability once in the first three levels', () => {
    expect(nextSkill(1, ranks(0, 0, 0, 0), ['E', 'Q', 'W'])).toBe('E');
    expect(nextSkill(2, ranks(0, 0, 1, 0), ['E', 'Q', 'W'])).toBe('Q');
    expect(nextSkill(3, ranks(1, 0, 1, 0), ['E', 'Q', 'W'])).toBe('W');
  });

  it('prioritizes R at 6, 11 and 16', () => {
    expect(nextSkill(6, ranks(3, 1, 1, 0), ['Q', 'W', 'E'])).toBe('R');
    expect(nextSkill(11, ranks(5, 3, 1, 1), ['Q', 'W', 'E'])).toBe('R');
  });

  it('respects the per-level rank cap', () => {
    // Level 4: Q capped at 2, so the next point goes to W.
    expect(nextSkill(4, ranks(2, 1, 0, 0), ['Q', 'W', 'E'])).toBe('W');
  });

  it('returns nothing without unspent points', () => {
    expect(nextSkill(5, ranks(3, 1, 1, 0), ['Q', 'W', 'E'])).toBeNull();
    expect(skillTip(5, ranks(3, 1, 1, 0), undefined)).toBeNull();
  });

  it('phrases tips as suggestions', () => {
    expect(skillTip(1, ranks(0, 0, 0, 0), ['Q', 'W', 'E'])).toBe('Suggested next skill: Q (common order Q > W > E)');
  });
});

describe('build reminders', () => {
  it('flags magic-heavy teams, healers and tanks', () => {
    const enemies = ['Malphite', 'Soraka', 'Syndra', 'Zed', 'Sejuani'].map((n) => testIndex.find(n)!);
    const tips = buildTips(enemies);
    expect(tips[0]).toMatch(/mostly magic/);
    expect(tips.join(' ')).toMatch(/Soraka.*anti-heal/);
    expect(tips.join(' ')).toMatch(/Multiple tanks \(Malphite, Sejuani\)/);
  });
});
