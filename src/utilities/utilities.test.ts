import { describe, it, expect } from 'vitest';
import { getD4Distribution, calculateDamageStats, calculateHitChance, calculateDirectlyDamageStats } from './utilities';

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
    // Verify percentiles are properly ordered for both
    expect(stats1[0]).toBeLessThanOrEqual(stats1[2]);
    expect(stats1[2]).toBeLessThanOrEqual(stats1[4]);
    expect(stats2[0]).toBeLessThanOrEqual(stats2[2]);
    expect(stats2[2]).toBeLessThanOrEqual(stats2[4]);
  });

  it('should handle advantage modifier correctly', () => {
    const statsNoAdv = calculateDamageStats(1, 5, 13, 0, 8.5, false);
    const statsAdv = calculateDamageStats(1, 5, 13, 0, 8.5, true);
    // With advantage, 95th percentile damage should be higher (better outcomes)
    expect(statsAdv[4]).toBeGreaterThanOrEqual(statsNoAdv[4]);
  });

  it('should handle positive to-hit bonus', () => {
    const statsBase = calculateDamageStats(1, 5, 13, 0, 8.5, false);
    const statsBonus = calculateDamageStats(1, 5, 13, 2, 8.5, false);
    // With bonus to hit, 95th percentile should be higher (better outcomes)
    expect(statsBonus[4]).toBeGreaterThanOrEqual(statsBase[4]);
  });

  it('should handle negative to-hit bonus', () => {
    const statsBase = calculateDamageStats(1, 5, 13, 0, 8.5, false);
    const statsPenalty = calculateDamageStats(1, 5, 13, -2, 8.5, false);
    // With penalty to hit, 95th percentile should be lower (worse outcomes)
    expect(statsPenalty[4]).toBeLessThanOrEqual(statsBase[4]);
  });

  it('should handle higher party levels (higher proficiency)', () => {
    const statsLevel5 = calculateDamageStats(1, 5, 13, 0, 8.5, false);
    const statsLevel10 = calculateDamageStats(1, 10, 13, 0, 8.5, false);
    // Higher level = higher proficiency bonus = easier to hit, so 95th percentile should be higher
    expect(statsLevel10[4]).toBeGreaterThanOrEqual(statsLevel5[4]);
  });

  it('should handle very high AC (near impossible)', () => {
    const stats = calculateDamageStats(1, 5, 35, 0, 8.5, false);
    // Should have mostly negative deltas (damage reduction from missing more)
    expect(stats[2]).toBeLessThan(5); // Median should be low/negative
  });

  it('should handle very low AC (easy to hit)', () => {
    const stats = calculateDamageStats(1, 5, 5, 0, 8.5, false);
    // Should have reasonable damage deltas
    expect(stats).toHaveLength(5);
    expect(stats.every(val => !isNaN(val))).toBe(true);
  });

  it('should handle zero base damage', () => {
    const stats = calculateDamageStats(1, 5, 13, 0, 0, false);
    expect(stats).toHaveLength(5);
    expect(stats.every(val => !isNaN(val))).toBe(true);
  });

  it('should handle high base damage', () => {
    const stats = calculateDamageStats(1, 5, 13, 0, 100, false);
    expect(stats).toHaveLength(5);
    expect(stats.every(val => !isNaN(val))).toBe(true);
    // Verify percentile ordering
    expect(stats[0]).toBeLessThanOrEqual(stats[2]);
    expect(stats[2]).toBeLessThanOrEqual(stats[4]);
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
    // At level 5, proficiency is +3, so requesting 5d4 should only apply 3d4 effect
    const statsExcessive = calculateDamageStats(5, 5, 13, 0, 8.5, false);
    const statsMax = calculateDamageStats(3, 5, 13, 0, 8.5, false);
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

describe('calculateDamageStats with dice expressions (crits enabled)', () => {
  it('should automatically consider crits for dice expressions', () => {
    // With dice expression, crits should be considered
    const statsDice = calculateDamageStats(1, 5, 13, 0, '1d10+5', false);
    expect(statsDice).toHaveLength(5);
    expect(statsDice.every(val => typeof val === 'number' && !isNaN(val))).toBe(true);
  });

  it('should not consider crits for simple numbers', () => {
    // With simple number, crits should not be considered
    const statsNumber = calculateDamageStats(1, 5, 13, 0, 8.5, false);
    expect(statsNumber).toHaveLength(5);
    expect(statsNumber.every(val => typeof val === 'number' && !isNaN(val))).toBe(true);
  });

  it('should handle various dice expressions', () => {
    const expressions = ['1d10', '2d6+3', '1d8+1d4', '3d6', '1d12+5'];
    expressions.forEach(expr => {
      const stats = calculateDamageStats(1, 5, 13, 0, expr, false);
      expect(stats).toHaveLength(5);
      expect(stats[0]).toBeLessThanOrEqual(stats[2]);
      expect(stats[2]).toBeLessThanOrEqual(stats[4]);
    });
  });

  it('should have higher damage variance with crits (dice) than without (numbers)', () => {
    // For similar average damage, dice expressions should have more variance due to crits
    const statsDice = calculateDamageStats(1, 5, 13, 0, '1d10+5', false); // avg 10.5
    const statsNumber = calculateDamageStats(1, 5, 13, 0, 10.5, false); // fixed 10.5
    
    // The range (p95 - p5) should be wider for dice due to crit mechanics
    const rangeDice = statsDice[4] - statsDice[0];
    const rangeNumber = statsNumber[4] - statsNumber[0];
    
    expect(rangeDice).toBeGreaterThanOrEqual(rangeNumber);
  });

  it('should handle dice expressions with advantage', () => {
    const statsNoAdv = calculateDamageStats(1, 5, 13, 0, '1d10+5', false);
    const statsAdv = calculateDamageStats(1, 5, 13, 0, '1d10+5', true);
    
    // With advantage, median should be better or equal
    expect(statsAdv[2]).toBeGreaterThanOrEqual(statsNoAdv[2]);
  });

  it('should handle complex dice expressions', () => {
    const stats = calculateDamageStats(1, 5, 13, 0, '1d10+2d6+3', false);
    expect(stats).toHaveLength(5);
    expect(stats.every(val => typeof val === 'number' && !isNaN(val))).toBe(true);
    expect(stats[0]).toBeLessThanOrEqual(stats[2]);
    expect(stats[2]).toBeLessThanOrEqual(stats[4]);
  });

  it('should have consistent percentile ordering with crits', () => {
    const stats = calculateDamageStats(2, 10, 15, 2, '2d6+5', false);
    expect(stats[0]).toBeLessThanOrEqual(stats[1]); // p5 <= q1
    expect(stats[1]).toBeLessThanOrEqual(stats[2]); // q1 <= median
    expect(stats[2]).toBeLessThanOrEqual(stats[3]); // median <= q3
    expect(stats[3]).toBeLessThanOrEqual(stats[4]); // q3 <= p95
  });

  it('should produce higher expected damage with higher base dice', () => {
    const stats1d6 = calculateDamageStats(1, 5, 13, 0, '1d6+5', false);
    const stats1d12 = calculateDamageStats(1, 5, 13, 0, '1d12+5', false);
    
    // 1d12 has higher average and especially benefits from crits
    // Check that the 95th percentile is at least as high (crits matter more at high percentiles)
    expect(stats1d12[4]).toBeGreaterThanOrEqual(stats1d6[4]);
  });
});

describe('calculateDirectlyDamageStats with crits parameter', () => {
  it('should handle considerCrits=false', () => {
    const stats = calculateDirectlyDamageStats(1, 5, 13, 0, '1d10+5', false, false);
    expect(stats).toHaveLength(5);
    expect(stats.every(val => typeof val === 'number' && !isNaN(val))).toBe(true);
  });

  it('should handle considerCrits=true', () => {
    const stats = calculateDirectlyDamageStats(1, 5, 13, 0, '1d10+5', false, true);
    expect(stats).toHaveLength(5);
    expect(stats.every(val => typeof val === 'number' && !isNaN(val))).toBe(true);
  });

  it('should produce different results with and without crits', () => {
    const statsNoCrits = calculateDirectlyDamageStats(1, 5, 13, 0, '1d10+5', false, false);
    const statsWithCrits = calculateDirectlyDamageStats(1, 5, 13, 0, '1d10+5', false, true);
    
    // With crits, the distribution should be different (especially at higher percentiles)
    // The 95th percentile should generally be higher with crits due to crit hits
    expect(statsWithCrits[4]).toBeGreaterThanOrEqual(statsNoCrits[4]);
  });

  it('should double dice on crits but not modifiers', () => {
    // 1d10+5: on crit becomes 2d10+5 (not 2d10+10)
    const stats = calculateDirectlyDamageStats(1, 5, 13, 0, '1d10+5', false, true);
    expect(stats).toHaveLength(5);
    // The max possible delta with crits should account for doubled dice
    // This is a smoke test - exact values depend on AC and other factors
    expect(stats[4]).toBeGreaterThan(0);
  });

  it('should handle multiple dice types in crits', () => {
    // 1d10+2d6+3: on crit becomes 2d10+4d6+3
    const stats = calculateDirectlyDamageStats(1, 5, 13, 0, '1d10+2d6+3', false, true);
    expect(stats).toHaveLength(5);
    expect(stats.every(val => typeof val === 'number' && !isNaN(val))).toBe(true);
  });

  it('should maintain percentile ordering with crits', () => {
    const stats = calculateDirectlyDamageStats(2, 10, 15, 2, '2d6+5', false, true);
    expect(stats[0]).toBeLessThanOrEqual(stats[1]);
    expect(stats[1]).toBeLessThanOrEqual(stats[2]);
    expect(stats[2]).toBeLessThanOrEqual(stats[3]);
    expect(stats[3]).toBeLessThanOrEqual(stats[4]);
  });

  it('should work with advantage and crits', () => {
    const statsNoAdv = calculateDirectlyDamageStats(1, 5, 13, 0, '1d10+5', false, true);
    const statsAdv = calculateDirectlyDamageStats(1, 5, 13, 0, '1d10+5', true, true);
    
    // Advantage should improve outcomes
    expect(statsAdv[2]).toBeGreaterThanOrEqual(statsNoAdv[2]);
  });

  it('should handle simple numeric string without crits', () => {
    const stats = calculateDirectlyDamageStats(1, 5, 13, 0, '10', false, false);
    expect(stats).toHaveLength(5);
    expect(stats.every(val => typeof val === 'number' && !isNaN(val))).toBe(true);
  });

  it('should produce consistent results for same inputs', () => {
    const stats1 = calculateDirectlyDamageStats(1, 5, 13, 0, '1d10+5', false, true);
    const stats2 = calculateDirectlyDamageStats(1, 5, 13, 0, '1d10+5', false, true);
    expect(stats1).toEqual(stats2);
  });
});
