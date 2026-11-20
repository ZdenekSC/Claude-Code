import { ChampionIndex, ChampionInfo, isMagicDamage } from './champions';

/** Subset of GET /lol-champ-select/v1/session from the League Client API. */
export interface ChampSelectSession {
  localPlayerCellId: number;
  myTeam: ChampSelectMember[];
  theirTeam: ChampSelectMember[];
  bans?: { myTeamBans: number[]; theirTeamBans: number[] };
  actions: ChampSelectAction[][];
}

export interface ChampSelectMember {
  cellId: number;
  championId: number;
  championPickIntent?: number;
  assignedPosition?: string;
}

export interface ChampSelectAction {
  actorCellId: number;
  championId: number;
  completed: boolean;
  type: string; // "ban" | "pick" | ...
}

export interface DraftConfig {
  /** Champions you play per role, most comfortable first. Ids or display names. */
  pools: Partial<Record<Lane, string[]>>;
  /** Champions you'd like banned per role, highest priority first. */
  bans: Partial<Record<Lane, string[]>>;
}

/** enemy champion id -> champions that do well against it. */
export type CounterTable = Record<string, string[]>;

const LANES: Lane[] = ['top', 'jungle', 'middle', 'bottom', 'utility'];

function toLane(position: string | undefined): Lane | null {
  return LANES.includes(position as Lane) ? (position as Lane) : null;
}

function resolveAll(index: ChampionIndex, names: string[] | undefined): ChampionInfo[] {
  return (names ?? []).map((n) => index.find(n)).filter((c): c is ChampionInfo => !!c);
}

export function suggestDraft(
  session: ChampSelectSession,
  index: ChampionIndex,
  config: DraftConfig,
  counters: CounterTable,
): DraftAdvice {
  const me = session.myTeam.find((m) => m.cellId === session.localPlayerCellId);
  const role = toLane(me?.assignedPosition);

  // Everything already banned or locked in is unavailable.
  const unavailable = new Set<number>();
  for (const m of [...session.myTeam, ...session.theirTeam]) if (m.championId > 0) unavailable.add(m.championId);
  for (const id of [...(session.bans?.myTeamBans ?? []), ...(session.bans?.theirTeamBans ?? [])]) unavailable.add(id);
  for (const a of session.actions.flat()) if (a.completed && a.championId > 0) unavailable.add(a.championId);

  // Don't ban or steal what a teammate is hovering.
  const allyIntents = new Set(
    session.myTeam.filter((m) => m.cellId !== session.localPlayerCellId).map((m) => m.championPickIntent ?? 0),
  );

  const allies = session.myTeam
    .filter((m) => m.cellId !== session.localPlayerCellId && m.championId > 0)
    .map((m) => index.byKey.get(m.championId))
    .filter((c): c is ChampionInfo => !!c);
  const enemies = session.theirTeam
    .filter((m) => m.championId > 0)
    .map((m) => index.byKey.get(m.championId))
    .filter((c): c is ChampionInfo => !!c);

  const free = (c: ChampionInfo) => !unavailable.has(c.key) && !allyIntents.has(c.key);
  const roles = role ? [role] : LANES;

  const bans: Suggestion[] = dedupe(roles.flatMap((r) => resolveAll(index, config.bans[r])))
    .filter(free)
    .slice(0, 3)
    .map((c, i) => ({ champion: c.name, score: 3 - i, reasons: [role ? `Your ${role} ban list` : 'Your ban list'] }));

  const allyAp = allies.filter(isMagicDamage).length;
  const allyAd = allies.length - allyAp;
  const allyHasTank = allies.some((c) => c.tags.includes('Tank'));
  const notes: string[] = [];
  if (allies.length >= 2 && allyAd - allyAp >= 2) notes.push('Your team is mostly physical damage — magic damage picks are favored.');
  if (allies.length >= 2 && allyAp - allyAd >= 2) notes.push('Your team is mostly magic damage — physical damage picks are favored.');
  if (allies.length >= 3 && !allyHasTank) notes.push('Your team has no tank yet.');

  const pool = dedupe(roles.flatMap((r) => resolveAll(index, config.pools[r]))).filter(free);
  const picks: Suggestion[] = pool
    .map((c, i) => {
      const reasons: string[] = [];
      let score = Math.max(0, 2 - i * 0.25); // comfort: earlier in your pool = more comfortable
      if (i === 0) reasons.push('Your most comfortable pick');

      const beats = enemies.filter((e) => (counters[e.id] ?? []).some((x) => index.find(x)?.id === c.id));
      if (beats.length) {
        score += 2 * beats.length;
        reasons.push(`Good into ${beats.map((e) => e.name).join(', ')}`);
      }
      if (allies.length >= 2 && allyAd - allyAp >= 2 && isMagicDamage(c)) {
        score += 1.5;
        reasons.push('Adds magic damage');
      }
      if (allies.length >= 2 && allyAp - allyAd >= 2 && !isMagicDamage(c)) {
        score += 1.5;
        reasons.push('Adds physical damage');
      }
      if (allies.length >= 3 && !allyHasTank && c.tags.includes('Tank')) {
        score += 1;
        reasons.push('Adds frontline');
      }
      return { champion: c.name, score: Math.round(score * 10) / 10, reasons };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (!pool.length) notes.push(`Add champions to your ${role ?? ''} pool in config.json to get pick suggestions.`.replace('  ', ' '));

  return { role, bans, picks, notes };
}

function dedupe(list: ChampionInfo[]): ChampionInfo[] {
  const seen = new Set<string>();
  return list.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
}
