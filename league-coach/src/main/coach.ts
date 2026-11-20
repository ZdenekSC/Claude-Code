import { EventEmitter } from 'events';
import { buildTips } from '../core/builds';
import { CatalogItem, championIconUrl, ChampionIndex, ChampionInfo, loadChampionKit, loadItemCatalog } from '../core/champions';
import { ChampSelectSession, CounterTable, suggestDraft } from '../core/draft';
import { CalloutTracker, computeTimers } from '../core/objectives';
import { BasicSkill, skillTip } from '../core/skills';
import type { TipChampion, TipContext } from '../core/tips';
import type { AiCoach } from './aiCoach';
import type { CoachConfig } from './config';
import { LcuWatcher } from './lcu';
import { fetchGameData, LiveGameData } from './liveClient';

const LANES: Lane[] = ['top', 'jungle', 'middle', 'bottom', 'utility'];
function toLane(position: string | undefined): Lane | null {
  const lane = position?.toLowerCase() as Lane | undefined;
  return lane && LANES.includes(lane) ? lane : null;
}

/**
 * Ties the data sources to the coaching logic.
 * Emits 'phase', 'draft', 'game', 'roster', 'speak' and 'status' for the overlay.
 *
 * Only official local APIs are used (League Client API + Live Client Data API).
 * The app never reads game memory and never sends input to the game.
 */
export class Coach extends EventEmitter {
  private readonly lcu = new LcuWatcher();
  private pollTimer: NodeJS.Timeout | null = null;
  private phase: CoachPhase = 'idle';
  private callouts = new CalloutTracker();
  private lastSkillTip: string | null = null;
  private spokeBuildTip = false;
  private roster: Roster = { allies: [], enemies: [] };
  private rosterJson = JSON.stringify(this.roster);
  private gameTime = 0;
  private myGold: number | undefined;
  /** Per-champion in-game state (level, score, items), kept out of the roster so portraits don't re-render. */
  private liveState = new Map<string, Pick<TipChampion, 'level' | 'kda' | 'items'>>();
  private itemCatalog: Promise<CatalogItem[]> | null = null;

  constructor(
    private readonly champions: ChampionIndex,
    private readonly config: CoachConfig,
    private readonly counters: CounterTable,
    private readonly skillOrders: Record<string, BasicSkill[]>,
    private readonly cacheDir: string,
    private readonly ai: AiCoach | null,
  ) {
    super();
  }

  start(): void {
    this.lcu.on('connected', () => this.emit('status', 'Connected to League client'));
    this.lcu.on('disconnected', () => this.emit('status', 'Waiting for League client…'));
    this.lcu.on('champSelect', (session: ChampSelectSession | null) => {
      if (!session) {
        this.emit('draft', null);
        if (this.phase === 'champSelect') this.setPhase('idle');
        return;
      }
      this.setPhase('champSelect');
      this.emit('draft', suggestDraft(session, this.champions, this.config, this.counters));
      this.setRoster(this.rosterFromSession(session));
    });
    this.lcu.start();
    this.pollTimer = setInterval(() => void this.pollGame(), 1000);
  }

  stop(): void {
    this.lcu.stop();
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  /** AI tip about a champion currently shown in the roster, using the whole game as context. */
  async tipFor(championId: string): Promise<string> {
    if (!this.ai) throw new Error('AI tips are turned off in config.json.');
    const entries = [
      ...this.roster.allies.map((e) => ({ e, relation: e.isMe ? ('me' as const) : ('ally' as const) })),
      ...this.roster.enemies.map((e) => ({ e, relation: 'enemy' as const })),
    ];
    const target = entries.find(({ e }) => e.id === championId);
    if (!target) throw new Error('That champion is not in this game.');

    this.itemCatalog ??= loadItemCatalog(this.champions.version, this.cacheDir);
    const [itemCatalog, kits] = await Promise.all([
      this.itemCatalog,
      Promise.all(entries.map(({ e }) => loadChampionKit(this.champions.version, e.id, this.cacheDir))),
    ]);
    const inGame = this.phase === 'inGame';
    const champions: TipChampion[] = entries.map(({ e, relation }, i) => ({
      name: e.name,
      relation,
      role: e.role,
      kit: kits[i],
      ...(inGame ? this.liveState.get(e.id) : {}),
    }));
    const ctx: TipContext = {
      phase: inGame ? 'inGame' : 'champSelect',
      gameTime: inGame ? this.gameTime : undefined,
      myGold: inGame ? this.myGold : undefined,
      champions,
      target: target.e.name,
      itemCatalog,
    };
    return this.ai.tip(ctx);
  }

  private setPhase(phase: CoachPhase): void {
    if (phase === this.phase) return;
    this.phase = phase;
    if (phase === 'inGame') {
      this.callouts = new CalloutTracker();
      this.lastSkillTip = null;
      this.spokeBuildTip = false;
    }
    if (phase !== 'idle') this.ai?.resetCache();
    this.setRoster({ allies: [], enemies: [] });
    this.emit('phase', phase);
  }

  private setRoster(roster: Roster): void {
    const json = JSON.stringify(roster);
    if (json === this.rosterJson) return;
    this.rosterJson = json;
    this.roster = roster;
    this.emit('roster', roster);
  }

  private entry(c: ChampionInfo, role: Lane | null, isMe: boolean): RosterEntry {
    return { id: c.id, name: c.name, icon: championIconUrl(this.champions.version, c.id), role, isMe };
  }

  private rosterFromSession(session: ChampSelectSession): Roster {
    const allies: RosterEntry[] = [];
    for (const m of session.myTeam) {
      // Show locked picks, and teammates' hovers so you can ask about them early.
      const c = this.champions.byKey.get(m.championId || m.championPickIntent || 0);
      if (c) allies.push(this.entry(c, toLane(m.assignedPosition), m.cellId === session.localPlayerCellId));
    }
    const enemies: RosterEntry[] = [];
    for (const m of session.theirTeam) {
      const c = this.champions.byKey.get(m.championId);
      if (c) enemies.push(this.entry(c, toLane(m.assignedPosition), false));
    }
    return { allies, enemies };
  }

  private async pollGame(): Promise<void> {
    const data = await fetchGameData();
    if (!data) {
      if (this.phase === 'inGame') this.setPhase('idle');
      return;
    }
    this.setPhase('inGame');
    this.gameTime = data.gameData.gameTime;
    const advice = this.adviseGame(data);
    this.emit('game', advice);

    if (!this.config.voice) return;
    for (const line of this.callouts.check(advice.timers, advice.gameTime)) this.emit('speak', line);
    if (advice.skillTip && advice.skillTip !== this.lastSkillTip) this.emit('speak', advice.skillTip.split(' (')[0]);
    if (!this.spokeBuildTip && advice.buildTips.length) {
      this.spokeBuildTip = true;
      this.emit('speak', advice.buildTips[0].split(' — ')[1] ?? advice.buildTips[0]);
    }
    this.lastSkillTip = advice.skillTip;
  }

  private adviseGame(data: LiveGameData): GameAdvice {
    const meId = data.activePlayer.riotId ?? data.activePlayer.summonerName;
    const me = data.allPlayers.find((p) => (p.riotId ?? p.summonerName) === meId);
    const myTeam = me?.team;
    const nameToTeam = new Map<string, string>();
    for (const p of data.allPlayers) {
      for (const n of [p.riotId, p.summonerName, p.riotId?.split('#')[0]]) if (n) nameToTeam.set(n, p.team);
    }

    const allies: RosterEntry[] = [];
    const enemies: RosterEntry[] = [];
    this.liveState.clear();
    for (const p of data.allPlayers) {
      const c = this.champions.fromRawName(p.rawChampionName);
      if (!c || !myTeam) continue;
      const entry = this.entry(c, toLane(p.position), p === me);
      (p.team === myTeam ? allies : enemies).push(entry);
      this.liveState.set(c.id, {
        level: p.level,
        kda: p.scores ? `${p.scores.kills}/${p.scores.deaths}/${p.scores.assists}` : undefined,
        items: (p.items ?? []).filter((i) => !i.consumable).map((i) => i.displayName),
      });
    }
    this.myGold = data.activePlayer.currentGold;
    this.setRoster({ allies, enemies });

    const enemyChamps = enemies.map((e) => this.champions.find(e.id)).filter((c): c is ChampionInfo => !!c);
    const myChampion = me ? this.champions.fromRawName(me.rawChampionName) : undefined;
    const a = data.activePlayer.abilities;
    const ranks = { Q: a.Q?.abilityLevel ?? 0, W: a.W?.abilityLevel ?? 0, E: a.E?.abilityLevel ?? 0, R: a.R?.abilityLevel ?? 0 };

    return {
      gameTime: data.gameData.gameTime,
      timers: computeTimers(data.events.Events, data.gameData.gameTime, (killer) => nameToTeam.get(killer)),
      buildTips: buildTips(enemyChamps),
      skillTip: skillTip(data.activePlayer.level, ranks, myChampion && this.skillOrders[myChampion.id]),
    };
  }
}
