import { EventEmitter } from 'events';
import { buildTips } from '../core/builds';
import { ChampionIndex, ChampionInfo } from '../core/champions';
import { ChampSelectSession, CounterTable, suggestDraft } from '../core/draft';
import { CalloutTracker, computeTimers } from '../core/objectives';
import { BasicSkill, skillTip } from '../core/skills';
import type { CoachConfig } from './config';
import { LcuWatcher } from './lcu';
import { fetchGameData, LiveGameData } from './liveClient';

/**
 * Ties the data sources to the coaching logic.
 * Emits 'phase', 'draft', 'game', 'speak' and 'status' for the overlay.
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

  constructor(
    private readonly champions: ChampionIndex,
    private readonly config: CoachConfig,
    private readonly counters: CounterTable,
    private readonly skillOrders: Record<string, BasicSkill[]>,
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
    });
    this.lcu.start();
    this.pollTimer = setInterval(() => void this.pollGame(), 1000);
  }

  stop(): void {
    this.lcu.stop();
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  private setPhase(phase: CoachPhase): void {
    if (phase === this.phase) return;
    this.phase = phase;
    if (phase === 'inGame') {
      this.callouts = new CalloutTracker();
      this.lastSkillTip = null;
      this.spokeBuildTip = false;
    }
    this.emit('phase', phase);
  }

  private async pollGame(): Promise<void> {
    const data = await fetchGameData();
    if (!data) {
      if (this.phase === 'inGame') this.setPhase('idle');
      return;
    }
    this.setPhase('inGame');
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

    const enemies = data.allPlayers
      .filter((p) => myTeam && p.team !== myTeam)
      .map((p) => this.champions.fromRawName(p.rawChampionName))
      .filter((c): c is ChampionInfo => !!c);
    const myChampion = me ? this.champions.fromRawName(me.rawChampionName) : undefined;

    const a = data.activePlayer.abilities;
    const ranks = { Q: a.Q?.abilityLevel ?? 0, W: a.W?.abilityLevel ?? 0, E: a.E?.abilityLevel ?? 0, R: a.R?.abilityLevel ?? 0 };

    return {
      gameTime: data.gameData.gameTime,
      timers: computeTimers(data.events.Events, data.gameData.gameTime, (killer) => nameToTeam.get(killer)),
      buildTips: buildTips(enemies),
      skillTip: skillTip(data.activePlayer.level, ranks, myChampion && this.skillOrders[myChampion.id]),
    };
  }
}
