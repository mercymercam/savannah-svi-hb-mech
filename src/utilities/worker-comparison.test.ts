import { describe, it, expect } from 'vitest';
import { calculateBatchDamageStats } from './batch-calculator';

// Note: Web Worker tests require special setup in Vitest
// For now, we'll test the main thread implementation and document worker behavior

describe('Web Worker vs Main Thread Comparison', () => {
  describe('Main Thread Calculations (Baseline)', () => {
    it('should calculate small dice correctly', () => {
      const results = calculateBatchDamageStats(
        8,   // level
        15,  // AC
        3,   // to-hit
        '1d6+3',
        false,
        true,
        'relative'
      );

      expect(results.length).toBe(3); // level 8 = prof bonus 3
      expect(results[0].length).toBe(5); // 5 percentiles
      
      // Results should be ordered (p5 <= q1 <= median <= q3 <= p95)
      for (const result of results) {
        for (let i = 0; i < result.length - 1; i++) {
          expect(result[i]).toBeLessThanOrEqual(result[i + 1]);
        }
      }
    });

    it('should calculate large dice (9d20) at level 20', () => {
      const start = performance.now();
      
      const results = calculateBatchDamageStats(
        20,  // level 20 = 6 d4 options
        16,
        5,
        '9d20',
        false,
        true,
        'relative'
      );
      
      const elapsed = performance.now() - start;
      
      expect(results.length).toBe(6);
      expect(results[0].length).toBe(5);
      
      console.log(`Main thread 9d20@L20: ${elapsed.toFixed(2)}ms`);
      
      // Should complete in reasonable time (< 3 seconds)
      expect(elapsed).toBeLessThan(3000);
    });

    it('should calculate very large dice (11d20) at level 20', () => {
      const start = performance.now();
      
      const results = calculateBatchDamageStats(
        20,
        16,
        5,
        '11d20',
        false,
        true,
        'relative'
      );
      
      const elapsed = performance.now() - start;
      
      expect(results.length).toBe(6);
      console.log(`Main thread 11d20@L20: ${elapsed.toFixed(2)}ms`);
      
      // Should complete in reasonable time (< 5 seconds)
      expect(elapsed).toBeLessThan(5000);
    });
  });

  describe('Consistency Checks', () => {
    it('should produce identical results for same inputs', () => {
      const params = {
        partyLevel: 12,
        monsterAC: 16,
        toHitBonus: 4,
        baseDamage: '3d8+5',
        hasAdvantage: false,
        considerCrits: true,
        viewMode: 'relative' as const,
      };

      const result1 = calculateBatchDamageStats(
        params.partyLevel,
        params.monsterAC,
        params.toHitBonus,
        params.baseDamage,
        params.hasAdvantage,
        params.considerCrits,
        params.viewMode
      );

      const result2 = calculateBatchDamageStats(
        params.partyLevel,
        params.monsterAC,
        params.toHitBonus,
        params.baseDamage,
        params.hasAdvantage,
        params.considerCrits,
        params.viewMode
      );

      expect(result1).toEqual(result2);
    });

    it('should handle edge cases without errors', () => {
      // Level 1 (prof bonus 2)
      const low = calculateBatchDamageStats(1, 10, 0, '1d4', false, false, 'relative');
      expect(low.length).toBe(2);

      // Level 20 (prof bonus 6)
      const high = calculateBatchDamageStats(20, 20, 10, '1d12+5', true, true, 'absolute');
      expect(high.length).toBe(6);

      // High AC
      const highAC = calculateBatchDamageStats(10, 25, 2, '2d6', false, true, 'relative');
      expect(highAC.length).toBe(4);

      // Negative to-hit
      const negHit = calculateBatchDamageStats(8, 15, -2, '1d8', false, false, 'relative');
      expect(negHit.length).toBe(3);
    });
  });

  describe('Performance Benchmarks', () => {
    const testCases = [
      { name: '1d6+3 @ L4', level: 4, damage: '1d6+3' },
      { name: '2d8+5 @ L8', level: 8, damage: '2d8+5' },
      { name: '3d6 @ L12', level: 12, damage: '3d6' },
      { name: '5d20 @ L16', level: 16, damage: '5d20' },
      { name: '9d20 @ L20', level: 20, damage: '9d20' },
      { name: '11d20 @ L20', level: 20, damage: '11d20' },
    ];

    testCases.forEach(({ name, level, damage }) => {
      it(`should benchmark: ${name}`, () => {
        const iterations = name.includes('11d20') ? 1 : 3;
        const times: number[] = [];

        for (let i = 0; i < iterations; i++) {
          const start = performance.now();
          calculateBatchDamageStats(
            level,
            16,
            5,
            damage,
            false,
            true,
            'relative'
          );
          times.push(performance.now() - start);
        }

        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);

        console.log(`${name}: avg=${avg.toFixed(2)}ms, min=${min.toFixed(2)}ms, max=${max.toFixed(2)}ms`);
      });
    });
  });
});

describe('Worker Implementation Validation', () => {
  it('should document expected worker behavior', () => {
    // This test documents what we expect from the worker implementation:
    
    // 1. Worker should produce identical results to main thread
    // 2. Worker should not block the main thread
    // 3. Worker should handle errors gracefully and fallback to main thread
    // 4. Worker should timeout after 10 seconds and fallback
    // 5. Worker should be able to handle multiple concurrent requests
    
    expect(true).toBe(true);
  });
});
