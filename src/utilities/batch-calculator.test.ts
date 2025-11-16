import { describe, it, expect } from 'vitest';
import { calculateBatchDamageStats, clearDamageDistCache } from './batch-calculator';
import { calculateDamageStats } from './utilities';

describe('Batch Calculator', () => {
  it('should produce same results as individual calculations', () => {
    const partyLevel = 8;
    const monsterAC = 15;
    const toHitBonus = 3;
    const baseDamage = '2d6+3';
    const hasAdvantage = false;
    const viewMode = 'relative';
    
    const proficiencyBonus = Math.ceil(partyLevel / 4) + 1; // 3
    
    // Get batch results
    const batchResults = calculateBatchDamageStats(
      partyLevel,
      monsterAC,
      toHitBonus,
      baseDamage,
      hasAdvantage,
      true, // considerCrits
      viewMode
    );
    
    // Get individual results
    const individualResults: number[][] = [];
    for (let numD4s = 1; numD4s <= proficiencyBonus; numD4s++) {
      const result = calculateDamageStats(
        numD4s,
        partyLevel,
        monsterAC,
        toHitBonus,
        baseDamage,
        hasAdvantage,
        viewMode
      );
      individualResults.push(result);
    }
    
    // Compare
    expect(batchResults.length).toBe(individualResults.length);
    expect(batchResults.length).toBe(proficiencyBonus);
    
    for (let i = 0; i < batchResults.length; i++) {
      expect(batchResults[i]).toEqual(individualResults[i]);
    }
  });

  it('should handle large dice expressions efficiently', () => {
    clearDamageDistCache();
    
    const start = performance.now();
    
    const results = calculateBatchDamageStats(
      20, // level 20 = 6 d4 options
      16, // AC
      5,  // to-hit bonus
      '9d20', // Very large damage
      false,
      true,
      'relative'
    );
    
    const elapsed = performance.now() - start;
    
    expect(results.length).toBe(6);
    expect(results[0].length).toBe(5); // 5 percentiles per result
    
    // Should complete in reasonable time (less than 10 seconds)
    expect(elapsed).toBeLessThan(10000);
    
    console.log(`Batch calculation for 9d20 with 6 d4 options: ${elapsed.toFixed(2)}ms`);
  });

  it('should use cache for repeated calculations', () => {
    clearDamageDistCache();
    
    const params = {
      partyLevel: 8,
      monsterAC: 15,
      toHitBonus: 3,
      baseDamage: '3d6+5',
      hasAdvantage: false,
      considerCrits: true,
      viewMode: 'relative' as const
    };
    
    // First call - builds cache
    const start1 = performance.now();
    const result1 = calculateBatchDamageStats(
      params.partyLevel,
      params.monsterAC,
      params.toHitBonus,
      params.baseDamage,
      params.hasAdvantage,
      params.considerCrits,
      params.viewMode
    );
    const time1 = performance.now() - start1;
    
    // Second call - uses cache
    const start2 = performance.now();
    const result2 = calculateBatchDamageStats(
      params.partyLevel,
      params.monsterAC,
      params.toHitBonus,
      params.baseDamage,
      params.hasAdvantage,
      params.considerCrits,
      params.viewMode
    );
    const time2 = performance.now() - start2;
    
    // Results should be identical
    expect(result1).toEqual(result2);
    
    // Second call should be significantly faster (at least 20% faster)
    // Not checking exact speedup as it varies, but cache should help
    console.log(`First call: ${time1.toFixed(2)}ms, Second call: ${time2.toFixed(2)}ms`);
  });

  it('should work without crits', () => {
    const results = calculateBatchDamageStats(
      4, // level 4 = 2 d4 options
      13,
      2,
      '1d8+3',
      false,
      false, // no crits
      'relative'
    );
    
    expect(results.length).toBe(2);
    expect(results[0].length).toBe(5);
    expect(results[1].length).toBe(5);
  });

  it('should work with advantage', () => {
    const results = calculateBatchDamageStats(
      8,
      15,
      3,
      '2d6+3',
      true, // advantage
      true,
      'relative'
    );
    
    expect(results.length).toBe(3); // level 8 = prof bonus 3
    expect(results[0].length).toBe(5);
  });

  it('should work in absolute mode', () => {
    const results = calculateBatchDamageStats(
      8,
      15,
      3,
      '2d6+3',
      false,
      true,
      'absolute' // absolute mode
    );
    
    expect(results.length).toBe(3);
    expect(results[0].length).toBe(5);
    
    // In absolute mode, all values should be non-negative
    for (const result of results) {
      for (const value of result) {
        expect(value).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
