export type BasicSkill = 'Q' | 'W' | 'E';
export type SkillRanks = Record<Skill, number>;

export const DEFAULT_PRIORITY: BasicSkill[] = ['Q', 'W', 'E'];

/**
 * Which ability to level next, or null when there are no unspent points.
 * Standard rules: R at 6/11/16, basic abilities capped at min(5, ceil(level / 2)),
 * one point in each basic ability over levels 1-3, then max in `priority` order.
 */
export function nextSkill(level: number, ranks: SkillRanks, priority: BasicSkill[]): Skill | null {
  const spent = ranks.Q + ranks.W + ranks.E + ranks.R;
  if (level - spent <= 0) return null;

  const ultRank = level >= 16 ? 3 : level >= 11 ? 2 : level >= 6 ? 1 : 0;
  if (ranks.R < ultRank) return 'R';

  const cap = Math.min(5, Math.floor((level + 1) / 2));
  if (level <= 3) {
    const unlearned = priority.find((s) => ranks[s] === 0);
    if (unlearned) return unlearned;
  }
  return priority.find((s) => ranks[s] < cap) ?? null;
}

export function skillTip(level: number, ranks: SkillRanks, priority: BasicSkill[] | undefined): string | null {
  const order = priority ?? DEFAULT_PRIORITY;
  const next = nextSkill(level, ranks, order);
  if (!next) return null;
  // Phrased as a suggestion: Riot's policy asks apps to highlight decisions, not make them.
  const hint = priority ? `common order ${order.join(' > ')}` : 'default order — add this champion to skill-orders.json';
  return `Suggested next skill: ${next} (${hint})`;
}
