/**
 * Dice rolling utilities for Fighting Fantasy mechanics
 */

/**
 * Roll a single die (1-6)
 */
export function rollD6(): number {
  return Math.floor(Math.random() * 6) + 1;
}

/**
 * Roll two dice and return the sum (2-12)
 */
export function roll2D6(): number {
  return rollD6() + rollD6();
}

/**
 * Roll two dice and return individual results
 */
export function roll2D6Individual(): [number, number] {
  return [rollD6(), rollD6()];
}

/**
 * Generate Fighting Fantasy SKILL attribute (1D6 + 6)
 */
export function generateSkill(): number {
  return rollD6() + 6;
}

/**
 * Generate Fighting Fantasy STAMINA attribute (2D6 + 12)
 */
export function generateStamina(): number {
  return roll2D6() + 12;
}

/**
 * Generate Fighting Fantasy LUCK attribute (1D6 + 6)
 */
export function generateLuck(): number {
  return rollD6() + 6;
}

/**
 * Calculate Attack Strength (2D6 + SKILL)
 */
export function calculateAttackStrength(skill: number): { total: number; dice: [number, number] } {
  const dice = roll2D6Individual();
  const total = dice[0] + dice[1] + skill;
  return { total, dice };
}

/**
 * Test your luck (roll 2D6, compare to current LUCK)
 * Returns true if lucky, false if unlucky
 */
export function testLuck(currentLuck: number): {
  lucky: boolean;
  roll: number;
  dice: [number, number];
} {
  const dice = roll2D6Individual();
  const roll = dice[0] + dice[1];
  const lucky = roll <= currentLuck;

  return { lucky, roll, dice };
}

/**
 * Format dice roll for display
 */
export function formatDiceRoll(dice: [number, number]): string {
  return `[${dice[0]}] [${dice[1]}]`;
}
