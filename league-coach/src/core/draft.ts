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
  isInProgress?: boolean;
  type: string; // "ban" | "pick" | ...
}

export interface DraftConfig {
  /** Optional overrides: champions to always consider per role, most comfortable first. Ids or names. */
  pools: Partial<Record<Lane, string[]>>;
  /** Optional overrides: champions you always want banned per role. */
  bans: Partial<Record<Lane, string[]>>;
}

/** A champion to consider, with why (e.g. "12 recent games, 67% wins"). Ordered best first. */
export interface DraftCandidate {
  key: number; // numeric champion id
  reason: string;
}

export interface DraftCandidates {
  pool: DraftCandidate[];
  bans: DraftCandidate[];
}

/** enemy champion id -> champions that do well against it. */
export type CounterTable = Record<string, string[]>;

const LANES: Lane[] = ['top', 'jungle', 'middle', 'bottom', 'utility'];

function toLane(position: string | undefined): Lane | null {
  return LANES.includes(position as Lane) ? (position as Lane) : null;
}

/** The local player's assigned role ('' in blind pick → null). */
export function myRole(session: ChampSelectSession): Lane | null {
  return toLane(session.myTeam.find((m) => m.cellId === session.localPlayerCellId)?.assignedPosition);
}

/** config.json overrides first, then the automatic candidates, without duplicates. */
export function mergeCandidates(
  index: ChampionIndex,
  config: DraftConfig,
  role: Lane | null,
  auto: DraftCandidates,
): DraftCandidates {
  const roles = role ? [role] : LANES;
  const fromConfig = (lists: Partial<Record<Lane, string[]>>): DraftCandidate[] =>
    roles
      .flatMap((r) => lists[r] ?? [])
      .map((n) => index.find(n))
      .filter((c): c is ChampionInfo => !!c)
      .map((c) => ({ key: c.key, reason: 'From your config.json' }));
  const dedupe = (list: DraftCandidate[]) => {
    const seen = new Set<number>();
    return list.filter((c) => (seen.has(c.key) ? false : (seen.add(c.key), true)));
  };
  return {
    pool: dedupe([...fromConfig(config.pools), ...auto.pool]),
    bans: dedupe([...fromConfig(config.bans), ...auto.bans]),
  };
}

export function suggestDraft(
  session: ChampSelectSession,
  index: ChampionIndex,
  candidates: DraftCandidates,
  counters: CounterTable,
): DraftAdvice {
  const role = myRole(session);

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

  const free = (key: number) => !unavailable.has(key) && !allyIntents.has(key);
  const resolve = (list: DraftCandidate[]) =>
    list
      .filter((c) => free(c.key))
      .map((c) => ({ champ: index.byKey.get(c.key), reason: c.reason }))
      .filter((c): c is { champ: ChampionInfo; reason: string } => !!c.champ);

  const bans: Suggestion[] = resolve(candidates.bans)
    .slice(0, 3)
    .map(({ champ, reason }, i) => ({ champion: champ.name, score: 3 - i, reasons: [reason] }));

  const allyAp = allies.filter(isMagicDamage).length;
  const allyAd = allies.length - allyAp;
  const allyHasTank = allies.some((c) => c.tags.includes('Tank'));
  const notes: string[] = [];
  if (allies.length >= 2 && allyAd - allyAp >= 2) notes.push('Your team is mostly physical damage — magic damage picks are favored.');
  if (allies.length >= 2 && allyAp - allyAd >= 2) notes.push('Your team is mostly magic damage — physical damage picks are favored.');
  if (allies.length >= 3 && !allyHasTank) notes.push('Your team has no tank yet.');

  const pool = resolve(candidates.pool);
  const picks: Suggestion[] = pool
    .map(({ champ: c, reason }, i) => {
      const reasons: string[] = [reason];
      let score = Math.max(0, 2 - i * 0.25); // comfort: candidates come best first

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

  if (!pool.length) notes.push('No match history for this role yet: play a few games, or add champions to config.json.');

  return { role, bans, picks, notes };
}
