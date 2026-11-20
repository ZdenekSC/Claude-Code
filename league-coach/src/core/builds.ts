import { ChampionInfo, isMagicDamage } from './champions';

/** Champions whose kits lean heavily on healing (anti-heal is worth considering). Extend as needed. */
export const HEAVY_HEALERS = new Set([
  'Aatrox', 'Briar', 'DrMundo', 'Fiddlesticks', 'Nami', 'Sona', 'Soraka', 'Swain', 'Sylas', 'Vladimir', 'Warwick', 'Yuumi',
]);

/**
 * Item-category reminders based on the enemy team composition.
 * Deliberately recommends categories (e.g. "magic resist") rather than exact items,
 * so it stays correct across item changes.
 */
export function buildTips(enemies: ChampionInfo[]): string[] {
  if (!enemies.length) return [];
  const ap = enemies.filter(isMagicDamage);
  const ad = enemies.filter((c) => !isMagicDamage(c));
  const tanks = enemies.filter((c) => c.tags.includes('Tank'));
  const healers = enemies.filter((c) => HEAVY_HEALERS.has(c.id));
  const assassins = enemies.filter((c) => c.tags.includes('Assassin'));
  const names = (cs: ChampionInfo[]) => cs.map((c) => c.name).join(', ');

  const tips: string[] = [];
  if (ap.length >= 3) tips.push(`Enemy damage is mostly magic (${names(ap)}) — prioritize magic resist.`);
  else if (ad.length >= 4) tips.push(`Enemy damage is mostly physical (${names(ad)}) — prioritize armor.`);
  else tips.push('Enemy damage is mixed — balance armor and magic resist.');

  if (healers.length) tips.push(`Heavy healing on ${names(healers)} — get anti-heal (Grievous Wounds) early.`);
  if (tanks.length >= 2) tips.push(`Multiple tanks (${names(tanks)}) — consider penetration or %max-health damage.`);
  if (assassins.length >= 2) tips.push(`Two or more assassins (${names(assassins)}) — consider a defensive item earlier.`);
  return tips;
}
