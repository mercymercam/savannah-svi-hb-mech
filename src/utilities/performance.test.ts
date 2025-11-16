import { describe, it, expect } from 'vitest';
import { calculateDirectlyDamageStats } from './utilities';
import { RangeDist, d } from './prob-eval';

/**
 * Performance test suite for damage calculation and RangeDist operations
 */
describe('Performance Tests', () => {
  // Helper to measure execution time
  const measureTime = <T>(fn: () => T): { result: T; timeMs: number } => {
    const start = performance.now();
    const result = fn();
    const timeMs = performance.now() - start;
    return { result, timeMs };
  };

  describe('RangeDist.map performance', () => {
    it('should measure single map operation on small distribution', () => {
      const dist = d(20); // 20 values
      const { timeMs } = measureTime(() => {
        return dist.map((v) => v * 2);
      });
      console.log(`Single map on d20: ${timeMs.toFixed(2)}ms`);
      expect(timeMs).toBeLessThan(10);
    });

    it('should measure nested map operations (2 levels)', () => {
      const d20Dist = d(20);
      const d4Dist = d(4);
      
      const { timeMs } = measureTime(() => {
        return d20Dist.map((d20Val) => {
          return d4Dist.map((d4Val) => {
            return d20Val + d4Val;
          });
        });
      });
      console.log(`Nested map (2 levels, 20x4): ${timeMs.toFixed(2)}ms`);
      expect(timeMs).toBeLessThan(50);
    });

    it('should measure nested map operations (3 levels)', () => {
      const d20Dist = d(20);
      const d4Dist = d(4).repeatSum(2); // 2d4: 7 values
      const baseDist = d(6).repeatSum(2); // 2d6: 11 values
      
      const { timeMs } = measureTime(() => {
        return d20Dist.map((d20Val) => {
          return d4Dist.map((d4Val) => {
            return baseDist.map((baseVal) => {
              return d20Val + d4Val + baseVal;
            });
          });
        });
      });
      console.log(`Nested map (3 levels, 20x7x11): ${timeMs.toFixed(2)}ms`);
      console.log(`Total iterations: ${20 * 7 * 11} = 1,540`);
    });

    it('should measure nested map operations (4 levels - similar to crit path)', () => {
      const d20Dist = d(20);
      const d4Dist = d(4).repeatSum(3); // 3d4: 10 values
      const baseDist = d(6).repeatSum(3); // 3d6: 16 values
      const critDist = d(6).repeatSum(6); // 6d6: 31 values
      
      const { timeMs } = measureTime(() => {
        return d20Dist.map((d20Val) => {
          return d4Dist.map((d4Val) => {
            return baseDist.map((baseVal) => {
              return critDist.map((critVal) => {
                return d20Val + d4Val + baseVal + critVal;
              });
            });
          });
        });
      });
      console.log(`Nested map (4 levels, 20x10x16x31): ${timeMs.toFixed(2)}ms`);
      console.log(`Total iterations: ${20 * 10 * 16 * 31} = 99,200`);
    });

    it('should measure large base damage distribution (3d20)', () => {
      const baseDist = d(20).repeatSum(3); // 3d20: 58 values (3 to 60)
      console.log(`3d20 distribution size: ${baseDist.p.length} values (${baseDist.min} to ${baseDist.max})`);
      
      const { timeMs } = measureTime(() => {
        return baseDist.map((v) => v * 2);
      });
      console.log(`Single map on 3d20: ${timeMs.toFixed(2)}ms`);
    });

    it('should measure crit damage distribution (6d20)', () => {
      const critDist = d(20).repeatSum(6); // 6d20: 116 values (6 to 120)
      console.log(`6d20 distribution size: ${critDist.p.length} values (${critDist.min} to ${critDist.max})`);
      
      const { timeMs } = measureTime(() => {
        return critDist.map((v) => v * 2);
      });
      console.log(`Single map on 6d20: ${timeMs.toFixed(2)}ms`);
    });

    it('should measure problematic nested structure (3d20 base damage)', () => {
      const d20Dist = d(20); // 20 values
      const d4Dist = d(4).repeatSum(3); // 3d4: 10 values
      const baseDist = d(20).repeatSum(3); // 3d20: 58 values
      const critDist = d(20).repeatSum(6); // 6d20: 116 values
      
      console.log('Distribution sizes:');
      console.log(`  d20: ${d20Dist.p.length} values`);
      console.log(`  3d4: ${d4Dist.p.length} values`);
      console.log(`  3d20: ${baseDist.p.length} values`);
      console.log(`  6d20: ${critDist.p.length} values`);
      console.log(`  Total iterations: ${20 * 10 * 58 * 116} = ${20 * 10 * 58 * 116}`);
      
      const { timeMs } = measureTime(() => {
        return d20Dist.map((d20Val) => {
          return d4Dist.map((d4Val) => {
            return baseDist.map((baseVal) => {
              return critDist.map((critVal) => {
                // Simulate the actual calculation
                let result: number;
                if (d20Val === 1) {
                  result = 0;
                } else if (d20Val === 20) {
                  result = critVal + (d4Val * 2);
                } else {
                  const rollWithD4s = d20Val + 5 - d4Val;
                  result = rollWithD4s >= 15 ? (baseVal + (d4Val * 2)) : 0;
                }
                return result;
              });
            });
          });
        });
      });
      console.log(`Nested map (4 levels with 3d20): ${timeMs.toFixed(2)}ms`);
      
      // This should complete, but may be slow
      expect(timeMs).toBeLessThan(30000); // 30 seconds timeout
    });
  });

  describe('calculateDirectlyDamageStats performance', () => {
    it('should measure small damage (1d6)', () => {
      const { timeMs } = measureTime(() => {
        return calculateDirectlyDamageStats(
          3, // numD4s
          5, // partyLevel
          15, // monsterAC
          3, // toHitBonus
          '1d6+3', // baseDamage
          false, // hasAdvantage
          true, // considerCrits
          'relative'
        );
      });
      console.log(`calculateDirectlyDamageStats with 1d6+3: ${timeMs.toFixed(2)}ms`);
      expect(timeMs).toBeLessThan(1000);
    });

    it('should measure medium damage (2d8+5)', () => {
      const { timeMs } = measureTime(() => {
        return calculateDirectlyDamageStats(
          3,
          5,
          15,
          3,
          '2d8+5',
          false,
          true,
          'relative'
        );
      });
      console.log(`calculateDirectlyDamageStats with 2d8+5: ${timeMs.toFixed(2)}ms`);
      expect(timeMs).toBeLessThan(2000);
    });

    it('should measure large damage (3d6)', () => {
      const { timeMs } = measureTime(() => {
        return calculateDirectlyDamageStats(
          3,
          5,
          15,
          3,
          '3d6',
          false,
          true,
          'relative'
        );
      });
      console.log(`calculateDirectlyDamageStats with 3d6: ${timeMs.toFixed(2)}ms`);
      expect(timeMs).toBeLessThan(3000);
    });

    it.skip('should measure very large damage (3d20) - EXPECTED TO BE SLOW', () => {
      const { timeMs } = measureTime(() => {
        return calculateDirectlyDamageStats(
          3,
          5,
          15,
          3,
          '3d20',
          false,
          true,
          'relative'
        );
      });
      console.log(`calculateDirectlyDamageStats with 3d20: ${timeMs.toFixed(2)}ms`);
      // This is the problematic case
    });

    it('should measure very large damage (3d20) with optimization', () => {
      const { result, timeMs } = measureTime(() => {
        return calculateDirectlyDamageStats(
          3,
          5,
          15,
          3,
          '3d20',
          false,
          true,
          'relative'
        );
      });
      console.log(`calculateDirectlyDamageStats with 3d20 (optimized): ${timeMs.toFixed(2)}ms`);
      console.log(`Result:`, result);
      expect(timeMs).toBeLessThan(5000); // Should be much faster now
      expect(result).toHaveLength(5);
    });

    it('should measure extreme case (5d20)', () => {
      const { result, timeMs } = measureTime(() => {
        return calculateDirectlyDamageStats(
          4,
          9,
          18,
          5,
          '5d20',
          false,
          true,
          'relative'
        );
      });
      console.log(`calculateDirectlyDamageStats with 5d20 (optimized): ${timeMs.toFixed(2)}ms`);
      console.log(`Result:`, result);
      expect(timeMs).toBeLessThan(10000);
      expect(result).toHaveLength(5);
    });
  });

  describe('Alternative approaches', () => {
    it('should test flattening nested maps', () => {
      // Instead of nested maps, we can iterate through all combinations
      // and build the result distribution directly
      const d20Dist = d(20);
      const d4Dist = d(4).repeatSum(3);
      const baseDist = d(20).repeatSum(3);
      
      const { timeMs: nestedTime } = measureTime(() => {
        return d20Dist.map((d20Val) => {
          return d4Dist.map((d4Val) => {
            return baseDist.map((baseVal) => {
              return d20Val + d4Val + baseVal;
            });
          });
        });
      });
      
      const { timeMs: flatTime } = measureTime(() => {
        // Calculate all possible outcomes and their probabilities
        const outcomes = new Map<number, number>();
        
        for (let i = 0; i < d20Dist.p.length; i++) {
          const d20Val = d20Dist.min + i;
          const d20Prob = d20Dist.p[i];
          
          for (let j = 0; j < d4Dist.p.length; j++) {
            const d4Val = d4Dist.min + j;
            const d4Prob = d4Dist.p[j];
            
            for (let k = 0; k < baseDist.p.length; k++) {
              const baseVal = baseDist.min + k;
              const baseProb = baseDist.p[k];
              
              const result = d20Val + d4Val + baseVal;
              const prob = d20Prob * d4Prob * baseProb;
              
              outcomes.set(result, (outcomes.get(result) || 0) + prob);
            }
          }
        }
        
        // Convert to RangeDist
        const values = Array.from(outcomes.keys()).sort((a, b) => a - b);
        const min = values[0];
        const max = values[values.length - 1];
        const p = new Float64Array(max - min + 1);
        
        for (const [value, prob] of outcomes) {
          p[value - min] = prob;
        }
        
        return new RangeDist(min, max, p);
      });
      
      const { timeMs: combineTime } = measureTime(() => {
        return RangeDist.combineMany(
          [d20Dist, d4Dist, baseDist],
          ([d20Val, d4Val, baseVal]) => d20Val + d4Val + baseVal
        );
      });
      
      console.log(`Nested map approach: ${nestedTime.toFixed(2)}ms`);
      console.log(`Flat iteration approach: ${flatTime.toFixed(2)}ms`);
      console.log(`combineMany approach: ${combineTime.toFixed(2)}ms`);
      console.log(`Speedup (nested vs combineMany): ${(nestedTime / combineTime).toFixed(2)}x`);
    });

    it('should test combineMany with 4 distributions (the critical case)', () => {
      const d20Dist = d(20);
      const d4Dist = d(4).repeatSum(3);
      const baseDist = d(20).repeatSum(3);
      const critDist = d(20).repeatSum(6);
      
      console.log('4-way combination:');
      console.log(`  d20: ${d20Dist.p.length} values`);
      console.log(`  3d4: ${d4Dist.p.length} values`);
      console.log(`  3d20: ${baseDist.p.length} values`);
      console.log(`  6d20: ${critDist.p.length} values`);
      console.log(`  Total combinations: ${d20Dist.p.length * d4Dist.p.length * baseDist.p.length * critDist.p.length}`);
      
      const { result, timeMs } = measureTime(() => {
        return RangeDist.combineMany(
          [d20Dist, d4Dist, baseDist, critDist],
          ([d20Val, d4Val, baseVal, critVal]) => {
            // Simulate the damage calculation logic
            if (d20Val === 1) return 0;
            if (d20Val === 20) return critVal + (d4Val * 2);
            const roll = d20Val + 5 - d4Val;
            return roll >= 15 ? (baseVal + (d4Val * 2)) : 0;
          }
        );
      });
      
      console.log(`combineMany with 4 distributions: ${timeMs.toFixed(2)}ms`);
      console.log(`Result range: ${result.min} to ${result.max}`);
      expect(timeMs).toBeLessThan(5000);
    });
  });
});
