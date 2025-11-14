import { describe, it, expect } from 'vitest';
import { RangeDist, d } from './prob-eval';

/**
 * Helper function to calculate percentiles from a RangeDist
 */
const calculatePercentilesFromDist = (dist: RangeDist): number[] => {
  // Build cumulative distribution
  const cdf: number[] = [];
  let cumulative = 0;
  
  for (let i = 0; i < dist.p.length; i++) {
    cumulative += dist.p[i];
    cdf.push(cumulative);
  }
  
  // Find values at specific percentiles
  const findPercentile = (percentile: number): number => {
    const target = percentile / 100;
    for (let i = 0; i < cdf.length; i++) {
      if (cdf[i] >= target) {
        return dist.min + i;
      }
    }
    return dist.max;
  };
  
  return [
    findPercentile(5),   // 5th percentile
    findPercentile(25),  // Q1
    findPercentile(50),  // Median
    findPercentile(75),  // Q3
    findPercentile(95),  // 95th percentile
  ];
};

describe('Percentile Calculation', () => {
  it('should calculate percentiles correctly for a simple d6', () => {
    const d6 = d(6);
    const percentiles = calculatePercentilesFromDist(d6);
    
    console.log('d6 percentiles:', percentiles);
    console.log('d6 dist:', { min: d6.min, max: d6.max, p: Array.from(d6.p) });
    
    // For uniform distribution d6 (1-6):
    // 5th percentile should be 1 (first 16.67% includes value 1)
    // 25th percentile should be 2 (first 33.33% includes values 1-2)
    // 50th percentile should be 3 or 4 (median)
    // 75th percentile should be 5 (first 83.33% includes values 1-5)
    // 95th percentile should be 6
    
    expect(percentiles[0]).toBeLessThanOrEqual(percentiles[1]); // 5th <= Q1
    expect(percentiles[1]).toBeLessThanOrEqual(percentiles[2]); // Q1 <= Median
    expect(percentiles[2]).toBeLessThanOrEqual(percentiles[3]); // Median <= Q3
    expect(percentiles[3]).toBeLessThanOrEqual(percentiles[4]); // Q3 <= 95th
  });

  it('should calculate percentiles correctly for 2d6', () => {
    const twod6 = d(6).add(d(6));
    const percentiles = calculatePercentilesFromDist(twod6);
    
    console.log('2d6 percentiles:', percentiles);
    console.log('2d6 dist:', { min: twod6.min, max: twod6.max, pLength: twod6.p.length });
    
    // Verify ordering
    expect(percentiles[0]).toBeLessThanOrEqual(percentiles[1]); // 5th <= Q1
    expect(percentiles[1]).toBeLessThanOrEqual(percentiles[2]); // Q1 <= Median
    expect(percentiles[2]).toBeLessThanOrEqual(percentiles[3]); // Median <= Q3
    expect(percentiles[3]).toBeLessThanOrEqual(percentiles[4]); // Q3 <= 95th
  });

  it('should handle literal value correctly', () => {
    const lit = RangeDist.literal(5);
    const percentiles = calculatePercentilesFromDist(lit);
    
    console.log('Literal 5 percentiles:', percentiles);
    
    // All percentiles should be 5
    expect(percentiles).toEqual([5, 5, 5, 5, 5]);
  });

  it('should handle boolean distribution', () => {
    const bool = RangeDist.boolean(0.7);
    const percentiles = calculatePercentilesFromDist(bool);
    
    console.log('Boolean percentiles:', percentiles);
    console.log('Boolean dist:', { min: bool.min, max: bool.max, p: Array.from(bool.p) });
    
    // With 70% probability of 1 and 30% of 0:
    // 5th, 25th percentiles should be 0
    // 50th, 75th, 95th should be 1
    expect(percentiles[0]).toBe(0); // 5th
    expect(percentiles[1]).toBe(0); // Q1
    expect(percentiles[2]).toBe(1); // Median
    expect(percentiles[3]).toBe(1); // Q3
    expect(percentiles[4]).toBe(1); // 95th
  });

  it('should maintain ordering for any distribution', () => {
    // Test with a complex distribution
    const complex = d(20).add(d(6)).add(-5);
    const percentiles = calculatePercentilesFromDist(complex);
    
    console.log('Complex percentiles:', percentiles);
    
    // Verify strict ordering
    expect(percentiles[0]).toBeLessThanOrEqual(percentiles[1]);
    expect(percentiles[1]).toBeLessThanOrEqual(percentiles[2]);
    expect(percentiles[2]).toBeLessThanOrEqual(percentiles[3]);
    expect(percentiles[3]).toBeLessThanOrEqual(percentiles[4]);
  });

  it('should handle negative values correctly', () => {
    const negative = d(6).add(-10);
    const percentiles = calculatePercentilesFromDist(negative);
    
    console.log('Negative distribution percentiles:', percentiles);
    console.log('Negative dist:', { min: negative.min, max: negative.max });
    
    // Should range from -9 to -4
    expect(negative.min).toBe(-9);
    expect(negative.max).toBe(-4);
    expect(percentiles[0]).toBeLessThanOrEqual(percentiles[1]);
    expect(percentiles[1]).toBeLessThanOrEqual(percentiles[2]);
    expect(percentiles[2]).toBeLessThanOrEqual(percentiles[3]);
    expect(percentiles[3]).toBeLessThanOrEqual(percentiles[4]);
  });

  it('should verify CDF sums to 1.0', () => {
    const dist = d(20);
    
    let cumulative = 0;
    for (let i = 0; i < dist.p.length; i++) {
      cumulative += dist.p[i];
    }
    
    expect(cumulative).toBeCloseTo(1.0, 10);
  });

  it('should test the problematic case from the failing test', () => {
    // Simulate what calculateDamageStats does
    const numD4s = 1;
    const partyLevel = 5;
    const proficiencyBonus = Math.ceil(partyLevel / 4) + 1;
    const maxD4s = Math.min(numD4s, proficiencyBonus);
    
    console.log('Test parameters:', { numD4s, partyLevel, proficiencyBonus, maxD4s });
    
    // Create a d4 distribution
    const d4Dist = d(4).repeatSum(maxD4s);
    console.log('d4 distribution:', { min: d4Dist.min, max: d4Dist.max, p: Array.from(d4Dist.p) });
    
    const percentiles = calculatePercentilesFromDist(d4Dist);
    console.log('d4 percentiles:', percentiles);
    
    // Verify ordering
    expect(percentiles[0]).toBeLessThanOrEqual(percentiles[1]);
    expect(percentiles[1]).toBeLessThanOrEqual(percentiles[2]);
    expect(percentiles[2]).toBeLessThanOrEqual(percentiles[3]);
    expect(percentiles[3]).toBeLessThanOrEqual(percentiles[4]);
  });

  it('should test the actual damage delta calculation from utilities', () => {
    // Replicate what calculateDirectlyDamageStats does
    const numD4s = 1;
    const partyLevel = 5;
    const monsterAC = 13;
    const toHitBonus = 0;
    const baseDamage = 9; // Use integer for RangeDist.literal
    const hasAdvantage = false;
    
    const proficiencyBonus = Math.ceil(partyLevel / 4) + 1;
    const maxD4s = Math.min(numD4s, proficiencyBonus);
    const attackBonus = proficiencyBonus + toHitBonus;
    
    console.log('Damage calc parameters:', {
      numD4s,
      partyLevel,
      proficiencyBonus,
      maxD4s,
      attackBonus,
      monsterAC,
    });
    
    // Create d20 distribution
    let d20Dist = d(20);
    if (hasAdvantage) {
      d20Dist = RangeDist.largest(d(20), d(20));
    }
    
    // Create d4 distribution
    const d4Dist = d(4).repeatSum(maxD4s);
    
    // Create base damage as literal (since it's a number)
    const baseDamageDist = RangeDist.literal(baseDamage);
    
    // Calculate damage distribution with d4s
    const damageDeltaDist = d20Dist.map((d20Roll: number) => {
      return d4Dist.map((d4Value: number) => {
        return baseDamageDist.map((baseDmg: number) => {
          // Calculate damage without d4s
          let damageWithoutD4s: number;
          if (d20Roll === 1) {
            damageWithoutD4s = 0; // Auto-miss
          } else if (d20Roll === 20) {
            damageWithoutD4s = baseDmg; // Auto-hit
          } else {
            const rollWithoutD4s = d20Roll + attackBonus;
            damageWithoutD4s = rollWithoutD4s >= monsterAC ? baseDmg : 0;
          }
          
          // Calculate damage with d4s
          let damageWithD4s: number;
          if (d20Roll === 1) {
            damageWithD4s = 0; // Auto-miss
          } else if (d20Roll === 20) {
            damageWithD4s = baseDmg + (d4Value * 2); // Auto-hit with bonus
          } else {
            const rollWithD4s = d20Roll + attackBonus - d4Value;
            damageWithD4s = rollWithD4s >= monsterAC ? (baseDmg + (d4Value * 2)) : 0;
          }
          
          // Return the delta
          return damageWithD4s - damageWithoutD4s;
        });
      });
    });
    
    console.log('Damage delta distribution:', {
      min: damageDeltaDist.min,
      max: damageDeltaDist.max,
      pLength: damageDeltaDist.p.length,
    });
    
    // Print some sample probabilities
    console.log('First 20 probability values:');
    for (let i = 0; i < Math.min(20, damageDeltaDist.p.length); i++) {
      const value = damageDeltaDist.min + i;
      const prob = damageDeltaDist.p[i];
      if (prob > 0.0001) {
        console.log(`  value=${value}, prob=${prob.toFixed(6)}`);
      }
    }
    
    const percentiles = calculatePercentilesFromDist(damageDeltaDist);
    console.log('Percentiles:', percentiles);
    
    // Verify ordering
    expect(percentiles[0]).toBeLessThanOrEqual(percentiles[1]);
    expect(percentiles[1]).toBeLessThanOrEqual(percentiles[2]);
    expect(percentiles[2]).toBeLessThanOrEqual(percentiles[3]);
    expect(percentiles[3]).toBeLessThanOrEqual(percentiles[4]);
  });
});
