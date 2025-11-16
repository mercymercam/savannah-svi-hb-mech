/**
 * Vitest benchmark for WASM vs JS performance
 * 
 * Run with: npm test wasm-benchmark.test.ts
 * 
 * Each test runs in isolation with cleared caches to ensure unbiased results.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { initWasm, isWasmAvailable, calculateBatchDamageStatsWasm, type BatchDamageParams } from './wasm-bridge';
import { extractDiceTokens } from './dice';
import { RangeDist, d } from './prob-eval';

/**
 * Cache for base damage distributions to avoid recalculating during test setup
 * This cache is internal to the test file and separate from production code
 */
const testDamageDistCache = new Map<string, { baseDamageDist: RangeDist; critDamageDist: RangeDist }>();

function clearTestCache(): void {
  testDamageDistCache.clear();
}

// Copy the pure JS implementation for testing
function buildDamageDistributions(
  baseDamage: string,
  considerCrits: boolean
): { baseDamageDist: RangeDist; critDamageDist: RangeDist } {
  const cacheKey = `${baseDamage}|${considerCrits}`;
  
  // Use test-local cache (separate from production cache)
  if (testDamageDistCache.has(cacheKey)) {
    return testDamageDistCache.get(cacheKey)!;
  }
  
  const baseDamageTokens = extractDiceTokens(baseDamage);
  
  if (!baseDamageTokens) {
    const zero = RangeDist.literal(0);
    return { baseDamageDist: zero, critDamageDist: zero };
  }

  let baseDamageDist = RangeDist.literal(0);
  for (const token of baseDamageTokens) {
    if (token.type === 'dice' && token.numDice && token.diceSize) {
      const diceDist = d(token.diceSize).repeatSum(token.numDice);
      if (token.op === '+') {
        baseDamageDist = baseDamageDist.add(diceDist);
      } else {
        baseDamageDist = baseDamageDist.add(diceDist.negate());
      }
    } else if (token.type === 'number' && token.value !== undefined) {
      const intValue = Math.round(token.value);
      if (token.op === '+') {
        baseDamageDist = baseDamageDist.add(intValue);
      } else {
        baseDamageDist = baseDamageDist.add(-intValue);
      }
    }
  }

  let critDamageDist = baseDamageDist;
  if (considerCrits) {
    for (const token of baseDamageTokens) {
      if (token.type === 'dice' && token.numDice && token.diceSize) {
        const diceDist = d(token.diceSize).repeatSum(token.numDice);
        if (token.op === '+') {
          critDamageDist = critDamageDist.add(diceDist);
        } else {
          critDamageDist = critDamageDist.add(diceDist.negate());
        }
      }
    }
  }

  const result = { baseDamageDist, critDamageDist };
  testDamageDistCache.set(cacheKey, result);
  return result;
}

function calculateBatchDamageStatsJS(
  proficiencyBonus: number,
  attackBonus: number,
  monsterAC: number,
  d20Dist: RangeDist,
  baseDamageDist: RangeDist,
  critDamageDist: RangeDist,
  d4Dists: RangeDist[],
  considerCrits: boolean,
  viewMode: 'relative' | 'absolute'
): number[][] {
  const allResults: Array<Map<number, number>> = [];
  for (let i = 0; i < proficiencyBonus; i++) {
    allResults.push(new Map<number, number>());
  }

  if (considerCrits) {
    for (let d20Idx = 0; d20Idx < d20Dist.p.length; d20Idx++) {
      const d20Roll = d20Dist.min + d20Idx;
      const d20Prob = d20Dist.p[d20Idx];
      if (d20Prob === 0) continue;

      for (let baseIdx = 0; baseIdx < baseDamageDist.p.length; baseIdx++) {
        const baseDmg = baseDamageDist.min + baseIdx;
        const baseProb = baseDamageDist.p[baseIdx];
        if (baseProb === 0) continue;

        for (let critIdx = 0; critIdx < critDamageDist.p.length; critIdx++) {
          const critDmg = critDamageDist.min + critIdx;
          const critProb = critDamageDist.p[critIdx];
          if (critProb === 0) continue;

          const baselineDamageProb = d20Prob * baseProb * critProb;

          let damageWithoutD4s = 0;
          if (d20Roll === 1) {
            damageWithoutD4s = 0;
          } else if (d20Roll === 20) {
            damageWithoutD4s = critDmg;
          } else {
            const rollWithoutD4s = d20Roll + attackBonus;
            damageWithoutD4s = rollWithoutD4s >= monsterAC ? baseDmg : 0;
          }

          for (let d4CountIdx = 0; d4CountIdx < proficiencyBonus; d4CountIdx++) {
            const d4Dist = d4Dists[d4CountIdx];
            
            for (let d4Idx = 0; d4Idx < d4Dist.p.length; d4Idx++) {
              const d4Value = d4Dist.min + d4Idx;
              const d4Prob = d4Dist.p[d4Idx];
              if (d4Prob === 0) continue;

              const totalProb = baselineDamageProb * d4Prob;

              let damageWithD4s: number;
              if (d20Roll === 1) {
                damageWithD4s = 0;
              } else if (d20Roll === 20) {
                damageWithD4s = critDmg + (d4Value * 2);
              } else {
                const rollWithD4s = d20Roll + attackBonus - d4Value;
                damageWithD4s = rollWithD4s >= monsterAC ? (baseDmg + (d4Value * 2)) : 0;
              }

              const result = viewMode === 'absolute' ? damageWithD4s : (damageWithD4s - damageWithoutD4s);
              
              const outcomeMap = allResults[d4CountIdx];
              outcomeMap.set(result, (outcomeMap.get(result) || 0) + totalProb);
            }
          }
        }
      }
    }
  } else {
    for (let d20Idx = 0; d20Idx < d20Dist.p.length; d20Idx++) {
      const d20Roll = d20Dist.min + d20Idx;
      const d20Prob = d20Dist.p[d20Idx];
      if (d20Prob === 0) continue;

      for (let baseIdx = 0; baseIdx < baseDamageDist.p.length; baseIdx++) {
        const baseDmg = baseDamageDist.min + baseIdx;
        const baseProb = baseDamageDist.p[baseIdx];
        if (baseProb === 0) continue;

        const baselineDamageProb = d20Prob * baseProb;

        let damageWithoutD4s = 0;
        if (d20Roll === 1) {
          damageWithoutD4s = 0;
        } else if (d20Roll === 20) {
          damageWithoutD4s = baseDmg;
        } else {
          const rollWithoutD4s = d20Roll + attackBonus;
          damageWithoutD4s = rollWithoutD4s >= monsterAC ? baseDmg : 0;
        }

        for (let d4CountIdx = 0; d4CountIdx < proficiencyBonus; d4CountIdx++) {
          const d4Dist = d4Dists[d4CountIdx];
          
          for (let d4Idx = 0; d4Idx < d4Dist.p.length; d4Idx++) {
            const d4Value = d4Dist.min + d4Idx;
            const d4Prob = d4Dist.p[d4Idx];
            if (d4Prob === 0) continue;

            const totalProb = baselineDamageProb * d4Prob;

            let damageWithD4s: number;
            if (d20Roll === 1) {
              damageWithD4s = 0;
            } else if (d20Roll === 20) {
              damageWithD4s = baseDmg + (d4Value * 2);
            } else {
              const rollWithD4s = d20Roll + attackBonus - d4Value;
              damageWithD4s = rollWithD4s >= monsterAC ? (baseDmg + (d4Value * 2)) : 0;
            }

            const result = viewMode === 'absolute' ? damageWithD4s : (damageWithD4s - damageWithoutD4s);
            
            const outcomeMap = allResults[d4CountIdx];
            outcomeMap.set(result, (outcomeMap.get(result) || 0) + totalProb);
          }
        }
      }
    }
  }

  const results: number[][] = [];
  for (const outcomeMap of allResults) {
    const outcomes = Array.from(outcomeMap.entries()).sort((a, b) => a[0] - b[0]);
    
    let cumulativeProb = 0;
    const cdf: Array<{ value: number; cumProb: number }> = [];
    for (const [value, prob] of outcomes) {
      cumulativeProb += prob;
      cdf.push({ value, cumProb: cumulativeProb });
    }

    const findPercentile = (percentile: number): number => {
      const target = percentile / 100;
      for (const { value, cumProb } of cdf) {
        if (cumProb >= target) return value;
      }
      return cdf[cdf.length - 1]?.value ?? 0;
    };

    results.push([
      findPercentile(5),
      findPercentile(25),
      findPercentile(50),
      findPercentile(75),
      findPercentile(95),
    ]);
  }

  return results;
}

describe('WASM Performance Benchmarks', () => {
  beforeAll(async () => {
    await initWasm();
  });

  it('should have WASM available', () => {
    expect(isWasmAvailable()).toBe(true);
  });

  const testCases = [
    { name: '1d6+3', params: { partyLevel: 4, monsterAC: 15, toHitBonus: 5, baseDamage: '1d6+3' }, iterations: 100 },
    { name: '3d20', params: { partyLevel: 16, monsterAC: 18, toHitBonus: 8, baseDamage: '3d20' }, iterations: 100 },
    { name: '5d100', params: { partyLevel: 15, monsterAC: 20, toHitBonus: 10, baseDamage: '5d100' }, iterations: 50 },
    { name: '8d50', params: { partyLevel: 18, monsterAC: 21, toHitBonus: 8, baseDamage: '8d50' }, iterations: 50 },
    { name: '15d100', params: { partyLevel: 20, monsterAC: 22, toHitBonus: 10, baseDamage: '15d100' }, iterations: 10 },
    { name: '20d100', params: { partyLevel: 20, monsterAC: 24, toHitBonus: 12, baseDamage: '20d100' }, iterations: 5 },
  ];

  testCases.forEach(({ name, params, iterations }) => {
    it(`should calculate ${name} correctly and show performance`, () => {
      // Clear cache to ensure fresh calculation
      clearTestCache();
      
      const { partyLevel, monsterAC, toHitBonus, baseDamage } = params;
      const proficiencyBonus = Math.ceil(partyLevel / 4) + 1;
      const attackBonus = proficiencyBonus + toHitBonus;

      // Build distributions (will be cached for both JS and WASM runs)
      const { baseDamageDist, critDamageDist } = buildDamageDistributions(baseDamage, false);
      const d20Dist = d(20);
      const d4Dists: RangeDist[] = [];
      for (let numD4s = 1; numD4s <= proficiencyBonus; numD4s++) {
        d4Dists.push(d(4).repeatSum(numD4s));
      }

      // Warm up both implementations with a single run (not timed)
      calculateBatchDamageStatsJS(
        proficiencyBonus,
        attackBonus,
        monsterAC,
        d20Dist,
        baseDamageDist,
        critDamageDist,
        d4Dists,
        false,
        'relative'
      );
      const warmupWasmParams: BatchDamageParams = {
        proficiencyBonus,
        attackBonus,
        monsterAC,
        d20Dist: { min: d20Dist.min, max: d20Dist.max, p: d20Dist.p },
        baseDamageDist: { min: baseDamageDist.min, max: baseDamageDist.max, p: baseDamageDist.p },
        critDamageDist: { min: critDamageDist.min, max: critDamageDist.max, p: critDamageDist.p },
        d4Dists: d4Dists.map(d => ({ min: d.min, max: d.max, p: d.p })),
        considerCrits: false,
        viewModeRelative: true,
      };
      calculateBatchDamageStatsWasm(warmupWasmParams);

      // Run JS version multiple times for better timing
      const jsStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        calculateBatchDamageStatsJS(
          proficiencyBonus,
          attackBonus,
          monsterAC,
          d20Dist,
          baseDamageDist,
          critDamageDist,
          d4Dists,
          false,
          'relative'
        );
      }
      const jsTime = (performance.now() - jsStart) / iterations;

      // Run WASM version multiple times
      const wasmParams: BatchDamageParams = {
        proficiencyBonus,
        attackBonus,
        monsterAC,
        d20Dist: { min: d20Dist.min, max: d20Dist.max, p: d20Dist.p },
        baseDamageDist: { min: baseDamageDist.min, max: baseDamageDist.max, p: baseDamageDist.p },
        critDamageDist: { min: critDamageDist.min, max: critDamageDist.max, p: critDamageDist.p },
        d4Dists: d4Dists.map(d => ({ min: d.min, max: d.max, p: d.p })),
        considerCrits: false,
        viewModeRelative: true,
      };

      const wasmStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        calculateBatchDamageStatsWasm(wasmParams);
      }
      const wasmTime = (performance.now() - wasmStart) / iterations;

      const speedup = jsTime / wasmTime;

      console.log(`\n${name}:`);
      console.log(`  JS:   ${jsTime.toFixed(3)}ms (avg over ${iterations} iterations)`);
      console.log(`  WASM: ${wasmTime.toFixed(3)}ms (avg over ${iterations} iterations)`);
      console.log(`  Speedup: ${speedup.toFixed(2)}x`);

      // Verify both produce same results
      const jsResult = calculateBatchDamageStatsJS(
        proficiencyBonus,
        attackBonus,
        monsterAC,
        d20Dist,
        baseDamageDist,
        critDamageDist,
        d4Dists,
        false,
        'relative'
      );
      const wasmResult = calculateBatchDamageStatsWasm(wasmParams);

      expect(wasmResult).toEqual(jsResult);
      
      // WASM should be faster (or at least not significantly slower)
      // For extreme cases (20d100), we're more lenient since warm-up matters
      const minSpeedup = name.includes('20d100') || name.includes('15d100') ? 0.3 : 0.5;
      expect(speedup).toBeGreaterThan(minSpeedup);
    });
  });

  it('benchmark: 20d100 with advantage (EXTREME worst case)', () => {
    // Clear cache to ensure fresh calculation
    clearTestCache();
    
    const partyLevel = 20;
    const monsterAC = 25;
    const toHitBonus = 12;
    const baseDamage = '20d100';
    
    const proficiencyBonus = Math.ceil(partyLevel / 4) + 1;
    const attackBonus = proficiencyBonus + toHitBonus;

    const { baseDamageDist, critDamageDist } = buildDamageDistributions(baseDamage, false);
    const d20Dist = RangeDist.largest(d(20), d(20)); // Advantage
    const d4Dists: RangeDist[] = [];
    for (let numD4s = 1; numD4s <= proficiencyBonus; numD4s++) {
      d4Dists.push(d(4).repeatSum(numD4s));
    }

    const iterations = 3;

    // Warm up both implementations
    calculateBatchDamageStatsJS(
      proficiencyBonus,
      attackBonus,
      monsterAC,
      d20Dist,
      baseDamageDist,
      critDamageDist,
      d4Dists,
      false,
      'relative'
    );
    const warmupParams: BatchDamageParams = {
      proficiencyBonus,
      attackBonus,
      monsterAC,
      d20Dist: { min: d20Dist.min, max: d20Dist.max, p: d20Dist.p },
      baseDamageDist: { min: baseDamageDist.min, max: baseDamageDist.max, p: baseDamageDist.p },
      critDamageDist: { min: critDamageDist.min, max: critDamageDist.max, p: critDamageDist.p },
      d4Dists: d4Dists.map(d => ({ min: d.min, max: d.max, p: d.p })),
      considerCrits: false,
      viewModeRelative: true,
    };
    calculateBatchDamageStatsWasm(warmupParams);

    const jsStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      calculateBatchDamageStatsJS(
        proficiencyBonus,
        attackBonus,
        monsterAC,
        d20Dist,
        baseDamageDist,
        critDamageDist,
        d4Dists,
        false,
        'relative'
      );
    }
    const jsTime = (performance.now() - jsStart) / iterations;

    const wasmParams: BatchDamageParams = {
      proficiencyBonus,
      attackBonus,
      monsterAC,
      d20Dist: { min: d20Dist.min, max: d20Dist.max, p: d20Dist.p },
      baseDamageDist: { min: baseDamageDist.min, max: baseDamageDist.max, p: baseDamageDist.p },
      critDamageDist: { min: critDamageDist.min, max: critDamageDist.max, p: critDamageDist.p },
      d4Dists: d4Dists.map(d => ({ min: d.min, max: d.max, p: d.p })),
      considerCrits: false,
      viewModeRelative: true,
    };

    const wasmStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      calculateBatchDamageStatsWasm(wasmParams);
    }
    const wasmTime = (performance.now() - wasmStart) / iterations;

    const speedup = jsTime / wasmTime;

    console.log(`\n20d100 with advantage (EXTREME WORST CASE):`);
    console.log(`  JS:   ${jsTime.toFixed(3)}ms (avg over ${iterations} iterations)`);
    console.log(`  WASM: ${wasmTime.toFixed(3)}ms (avg over ${iterations} iterations)`);
    console.log(`  Speedup: ${speedup.toFixed(2)}x`);
    console.log(`  Expected: WASM should be 2-10x faster on this massive calculation`);
    console.log(`  Distribution sizes: d20=${d20Dist.p.length}, base=${baseDamageDist.p.length}, d4s=${d4Dists.map(d => d.p.length).join(',')}`);

    // For this extreme case with warm-up, we expect at least 1.4x speedup
    expect(speedup).toBeGreaterThan(1.4);
  });
});
