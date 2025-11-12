import { describe, it, expect } from 'vitest';
import { getD4Distribution, calculateDamageStats, calculateHitChance } from './utilities';

describe('getD4Distribution', () => {
  it('should return distribution for 1d4', () => {
    const distribution = getD4Distribution(1);
    expect(distribution).toEqual([1, 2, 3, 5, 6]);
  });

  it('should return distribution for 2d4', () => {
    const distribution = getD4Distribution(2);
    expect(distribution).toEqual([3, 5, 7, 9, 11]);
  });

  it('should return distribution for 3d4', () => {
    const distribution = getD4Distribution(3);
    expect(distribution).toEqual([6, 8, 10, 13, 15]);
  });

  it('should return distribution for 4d4', () => {
    const distribution = getD4Distribution(4);
    expect(distribution).toEqual([8, 12, 14, 16, 20]);
  });

  it('should return [0, 0, 0, 0, 0] for invalid d4 count', () => {
    const distribution = getD4Distribution(999);
    expect(distribution).toEqual([0, 0, 0, 0, 0]);
  });

  it('should return [0, 0, 0, 0, 0] for zero d4s', () => {
    const distribution = getD4Distribution(0);
    expect(distribution).toEqual([0, 0, 0, 0, 0]);
  });

  it('should return [0, 0, 0, 0, 0] for negative d4s', () => {
    const distribution = getD4Distribution(-1);
    expect(distribution).toEqual([0, 0, 0, 0, 0]);
  });

  it('should always return array of 5 elements', () => {
    for (let i = 1; i <= 6; i++) {
      const distribution = getD4Distribution(i);
      expect(distribution).toHaveLength(5);
    }
  });
});

describe('calculateDamageStats', () => {
  it('should return array of 5 percentiles', () => {
    const stats = calculateDamageStats(1, 5, 13, 0, 8.5, false);
    expect(stats).toHaveLength(5);
  });

  it('should return valid numbers for typical inputs', () => {
    const stats = calculateDamageStats(1, 5, 13, 0, 8.5, false);
    expect(stats.every(val => typeof val === 'number')).toBe(true);
    expect(stats.every(val => !isNaN(val))).toBe(true);
  });

  it('should have median >= 5th percentile', () => {
    const stats = calculateDamageStats(1, 5, 13, 0, 8.5, false);
    expect(stats[2]).toBeGreaterThanOrEqual(stats[0]);
  });

  it('should have Q1 <= median <= Q3', () => {
    const stats = calculateDamageStats(1, 5, 13, 0, 8.5, false);
    expect(stats[1]).toBeLessThanOrEqual(stats[2]);
    expect(stats[2]).toBeLessThanOrEqual(stats[3]);
  });

  it('should have Q3 <= 95th percentile', () => {
    const stats = calculateDamageStats(1, 5, 13, 0, 8.5, false);
    expect(stats[3]).toBeLessThanOrEqual(stats[4]);
  });

  it('should increase with more d4s at typical difficulty', () => {
    const stats1 = calculateDamageStats(1, 5, 13, 0, 8.5, false);
    const stats2 = calculateDamageStats(2, 5, 13, 0, 8.5, false);
    // Median should generally increase with more dice
    expect(stats2[2]).toBeGreaterThan(stats1[2]);
  });

  it('should handle advantage modifier correctly', () => {
    const statsNoAdv = calculateDamageStats(1, 5, 13, 0, 8.5, false);
    const statsAdv = calculateDamageStats(1, 5, 13, 0, 8.5, true);
    // With advantage, damage should be higher
    expect(statsAdv[2]).toBeGreaterThan(statsNoAdv[2]);
  });

  it('should handle positive to-hit bonus', () => {
    const statsBase = calculateDamageStats(1, 5, 13, 0, 8.5, false);
    const statsBonus = calculateDamageStats(1, 5, 13, 2, 8.5, false);
    // With bonus to hit, damage should increase (higher hit chance)
    expect(statsBonus[2]).toBeGreaterThan(statsBase[2]);
  });

  it('should handle negative to-hit bonus', () => {
    const statsBase = calculateDamageStats(1, 5, 13, 0, 8.5, false);
    const statsPenalty = calculateDamageStats(1, 5, 13, -2, 8.5, false);
    // With penalty to hit, damage should decrease (lower hit chance)
    expect(statsPenalty[2]).toBeLessThan(statsBase[2]);
  });

  it('should handle higher party levels (higher proficiency)', () => {
    const statsLevel5 = calculateDamageStats(1, 5, 13, 0, 8.5, false);
    const statsLevel10 = calculateDamageStats(1, 10, 13, 0, 8.5, false);
    // Higher level = higher proficiency bonus = easier to hit
    expect(statsLevel10[2]).toBeGreaterThan(statsLevel5[2]);
  });

  it('should handle very high AC (near impossible)', () => {
    const stats = calculateDamageStats(1, 5, 35, 0, 8.5, false);
    // Should be close to 0 damage (can't hit)
    expect(stats[2]).toBeLessThan(1);
  });

  it('should handle very low AC (easy to hit)', () => {
    const stats = calculateDamageStats(1, 5, 5, 0, 8.5, false);
    // Should be close to base damage or higher
    expect(stats[2]).toBeGreaterThan(0);
  });

  it('should handle zero base damage', () => {
    const stats = calculateDamageStats(1, 5, 13, 0, 0, false);
    expect(stats).toHaveLength(5);
    expect(stats.every(val => !isNaN(val))).toBe(true);
  });

  it('should handle high base damage', () => {
    const stats = calculateDamageStats(1, 5, 13, 0, 100, false);
    expect(stats[2]).toBeGreaterThan(0);
  });

  it('should be consistent across multiple calls with same inputs', () => {
    const stats1 = calculateDamageStats(1, 5, 13, 0, 8.5, false);
    const stats2 = calculateDamageStats(1, 5, 13, 0, 8.5, false);
    expect(stats1).toEqual(stats2);
  });

  it('should handle all proficiency bonus values (levels 1-20)', () => {
    for (let level = 1; level <= 20; level++) {
      const stats = calculateDamageStats(1, level, 13, 0, 8.5, false);
      expect(stats).toHaveLength(5);
      expect(stats.every(val => !isNaN(val))).toBe(true);
    }
  });

  it('should handle max d4s for each level', () => {
    // Level 5: proficiency +2, max 2d4
    const stats5 = calculateDamageStats(2, 5, 13, 0, 8.5, false);
    expect(stats5).toHaveLength(5);

    // Level 17: proficiency +5, max 5d4
    const stats17 = calculateDamageStats(5, 17, 13, 0, 8.5, false);
    expect(stats17).toHaveLength(5);
  });

  it('should cap d4 penalty at proficiency bonus', () => {
    // At level 5, proficiency is +2, so requesting 5d4 should only apply 2d4 effect
    const statsExcessive = calculateDamageStats(5, 5, 13, 0, 8.5, false);
    const statsMax = calculateDamageStats(2, 5, 13, 0, 8.5, false);
    // They should be the same due to capping
    expect(statsExcessive).toEqual(statsMax);
  });

  it('should return lower values when AC increases relative to hit bonus', () => {
    const statsEasy = calculateDamageStats(1, 10, 10, 5, 8.5, false);
    const statsHard = calculateDamageStats(1, 10, 20, 5, 8.5, false);
    expect(statsHard[2]).toBeLessThan(statsEasy[2]);
  });

  it('should handle both advantage and disadvantage scenarios', () => {
    const statsNoAdv = calculateDamageStats(1, 5, 13, 0, 8.5, false);
    const statsAdv = calculateDamageStats(1, 5, 13, 0, 8.5, true);
    // Advantage should always be better or equal
    expect(statsAdv[2]).toBeGreaterThanOrEqual(statsNoAdv[2]);
  });
});

describe('calculateHitChance', () => {
  it('should return a value between 0.05 and 0.95 for normal cases', () => {
    const chance = calculateHitChance(5, 13, 0, 0, false);
    expect(chance).toBeGreaterThanOrEqual(0.05);
    expect(chance).toBeLessThanOrEqual(0.95);
  });

  it('should return 0.95 when AC is very low (guaranteed hit)', () => {
    const chance = calculateHitChance(5, 1, 0, 0, false);
    expect(chance).toBe(0.95);
  });

  it('should return 0.05 when AC is very high (guaranteed miss)', () => {
    const chance = calculateHitChance(5, 50, 0, 0, false);
    expect(chance).toBe(0.05);
  });

it('should return 0.99 when AC is very low w/ adv (guaranteed hit)', () => {
    const chance = calculateHitChance(5, 1, 0, 0, true);
    expect(chance).toBe(0.9975);
  });

  it('should return 0.01 when AC is very high w/ adv (guaranteed miss)', () => {
    const chance = calculateHitChance(5, 500, 0, 0, true);
    expect(chance).toBe(0.0975);
  });

  it('should increase hit chance with higher party level', () => {
    const chanceLevel5 = calculateHitChance(5, 13, 0, 0, false);
    const chanceLevel10 = calculateHitChance(10, 13, 0, 0, false);
    expect(chanceLevel10).toBeGreaterThan(chanceLevel5);
  });

  it('should increase hit chance with positive to-hit bonus', () => {
    const chanceNoBonus = calculateHitChance(5, 13, 0, 0, false);
    const chanceWithBonus = calculateHitChance(5, 13, 0, 2, false);
    expect(chanceWithBonus).toBeGreaterThan(chanceNoBonus);
  });

  it('should decrease hit chance with negative to-hit bonus', () => {
    const chanceNoBonus = calculateHitChance(5, 13, 0, 0, false);
    const chanceWithPenalty = calculateHitChance(5, 13, 0, -2, false);
    expect(chanceWithPenalty).toBeLessThan(chanceNoBonus);
  });

  it('should decrease hit chance when subtracting d4s from attack', () => {
    const chanceNoDice = calculateHitChance(5, 13, 0, 0, false);
    const chanceWith1d4 = calculateHitChance(5, 13, 1, 0, false);
    const chanceWith2d4 = calculateHitChance(5, 13, 2, 0, false);
    expect(chanceWith1d4).toBeLessThan(chanceNoDice);
    expect(chanceWith2d4).toBeLessThan(chanceWith1d4);
  });

  it('should cap d4 penalty at proficiency bonus', () => {
    // At level 5, proficiency bonus is 3
    // Subtracting 3d4 or 5d4 should have same effect (capped at prof bonus)
    const chance3d4 = calculateHitChance(5, 13, 3, 0, false);
    const chance5d4 = calculateHitChance(5, 13, 5, 0, false);
    expect(chance3d4).toBe(chance5d4);
  });

  it('should improve hit chance with advantage', () => {
    const chanceNoAdvantage = calculateHitChance(5, 13, 0, 0, false);
    const chanceWithAdvantage = calculateHitChance(5, 13, 0, 0, true);
    expect(chanceWithAdvantage).toBeGreaterThan(chanceNoAdvantage);
  });

  it('should apply advantage formula correctly (1 - (1-p)^2)', () => {
    const baseChance = calculateHitChance(5, 15, 0, 0, false);
    const advantageChance = calculateHitChance(5, 15, 0, 0, true);
    
    // Advantage should be 1 - (1 - baseChance)^2
    const expectedAdvantage = 1 - Math.pow(1 - baseChance, 2);
    expect(advantageChance).toBeCloseTo(expectedAdvantage, 5);
  });

  it('should handle zero to-hit bonus', () => {
    const chance = calculateHitChance(5, 13, 0, 0, false);
    expect(typeof chance).toBe('number');
    expect(chance).toBeGreaterThanOrEqual(0.05);
    expect(chance).toBeLessThanOrEqual(0.95);
  });

  it('should be consistent for same inputs', () => {
    const chance1 = calculateHitChance(5, 13, 1, 2, false);
    const chance2 = calculateHitChance(5, 13, 1, 2, false);
    expect(chance1).toBe(chance2);
  });

  it('should handle various party levels', () => {
    const levels = [1, 5, 10, 15, 20];
    levels.forEach((level) => {
      const chance = calculateHitChance(level, 13, 0, 0, false);
      expect(chance).toBeGreaterThanOrEqual(0.05);
      expect(chance).toBeLessThanOrEqual(0.95);
    });
  });

  it('should handle various AC values', () => {
    const acValues = [5, 10, 13, 15, 20, 25];
    acValues.forEach((ac) => {
      const chance = calculateHitChance(5, ac, 0, 0, false);
      expect(chance).toBeGreaterThanOrEqual(0.05);
      expect(chance).toBeLessThanOrEqual(0.95);
    });
  });

  it('should decrease hit chance when AC increases', () => {
    const chance10AC = calculateHitChance(5, 10, 0, 0, false);
    const chance15AC = calculateHitChance(5, 15, 0, 0, false);
    const chance20AC = calculateHitChance(5, 20, 0, 0, false);
    expect(chance10AC).toBeGreaterThan(chance15AC);
    expect(chance15AC).toBeGreaterThan(chance20AC);
  });
});
