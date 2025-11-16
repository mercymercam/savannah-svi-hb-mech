/**
 * REAL Performance benchmarking - measures actual computation time
 * 
 * This bypasses all caching and wrapper logic to measure raw WASM vs JS speed
 */

import { isWasmAvailable, calculateBatchDamageStatsWasm, type BatchDamageParams } from './wasm-bridge';
import { extractDiceTokens } from './dice';
import { RangeDist, d } from './prob-eval';

export interface BenchmarkResult {
  wasmTime: number;
  jsTime: number;
  speedup: number;
  wasmAvailable: boolean;
  testCase: string;
}

/**
 * Build damage distributions from scratch (no caching)
 */
function buildDamageDistributions(
  baseDamage: string,
  considerCrits: boolean
): { baseDamageDist: RangeDist; critDamageDist: RangeDist } {
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

  return { baseDamageDist, critDamageDist };
}

/**
 * Pure JavaScript calculation (copied from batch-calculator.ts)
 */
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
    // No crits version
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

  // Convert to percentiles
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

/**
 * Benchmark a single calculation comparing WASM vs JS
 */
export async function benchmarkCalculation(
  partyLevel: number,
  monsterAC: number,
  toHitBonus: number,
  baseDamage: string,
  hasAdvantage: boolean = false,
  considerCrits: boolean = false,
  viewMode: 'relative' | 'absolute' = 'relative',
): Promise<BenchmarkResult> {
  const testCase = `${baseDamage} @ L${partyLevel} AC${monsterAC}`;
  
  if (!isWasmAvailable()) {
    console.warn('⚠️ WASM not available, cannot run benchmark');
    return {
      wasmTime: 0,
      jsTime: 0,
      speedup: 0,
      wasmAvailable: false,
      testCase,
    };
  }

  const proficiencyBonus = Math.ceil(partyLevel / 4) + 1;
  const attackBonus = proficiencyBonus + toHitBonus;

  // Build distributions (this is fast, not the bottleneck)
  const { baseDamageDist, critDamageDist } = buildDamageDistributions(baseDamage, considerCrits);
  let d20Dist = d(20);
  if (hasAdvantage) {
    d20Dist = RangeDist.largest(d(20), d(20));
  }
  const d4Dists: RangeDist[] = [];
  for (let numD4s = 1; numD4s <= proficiencyBonus; numD4s++) {
    d4Dists.push(d(4).repeatSum(numD4s));
  }

  // === PURE JAVASCRIPT BENCHMARK ===
  const jsStart = performance.now();
  const jsResult = calculateBatchDamageStatsJS(
    proficiencyBonus,
    attackBonus,
    monsterAC,
    d20Dist,
    baseDamageDist,
    critDamageDist,
    d4Dists,
    considerCrits,
    viewMode
  );
  const jsTime = performance.now() - jsStart;

  // === WASM BENCHMARK ===
  const wasmStart = performance.now();
  const params: BatchDamageParams = {
    proficiencyBonus,
    attackBonus,
    monsterAC,
    d20Dist: {
      min: d20Dist.min,
      max: d20Dist.max,
      p: d20Dist.p,
    },
    baseDamageDist: {
      min: baseDamageDist.min,
      max: baseDamageDist.max,
      p: baseDamageDist.p,
    },
    critDamageDist: {
      min: critDamageDist.min,
      max: critDamageDist.max,
      p: critDamageDist.p,
    },
    d4Dists: d4Dists.map(d => ({
      min: d.min,
      max: d.max,
      p: d.p,
    })),
    considerCrits,
    viewModeRelative: viewMode === 'relative',
  };
  const wasmResult = calculateBatchDamageStatsWasm(params);
  const wasmTime = performance.now() - wasmStart;

  // Verify results match
  const resultsMatch = JSON.stringify(wasmResult) === JSON.stringify(jsResult);
  if (!resultsMatch) {
    console.warn('⚠️ WASM and JS results do not match!', { wasmResult, jsResult });
  }

  const speedup = jsTime / wasmTime;

  return {
    wasmTime,
    jsTime,
    speedup,
    wasmAvailable: true,
    testCase,
  };
}

/**
 * Generate random benchmark tests
 */
function generateRandomBenchmarks(count: number): Array<{
  name: string;
  params: Parameters<typeof benchmarkCalculation>;
}> {
  const benchmarks: Array<{
    name: string;
    params: Parameters<typeof benchmarkCalculation>;
  }> = [];
  
  for (let i = 0; i < count; i++) {
    const numDice = Math.floor(Math.random() * 4) + 5; // 5-8 dice
    const diceSize = Math.floor(Math.random() * 51) + 20; // 20-70
    const partyLevel = Math.floor(Math.random() * 16) + 5; // 5-20
    const monsterAC = Math.floor(Math.random() * 8) + 15; // 15-22
    const toHitBonus = Math.floor(Math.random() * 6) + 3; // 3-8
    const hasAdvantage = Math.random() > 0.7; // 30% chance
    
    benchmarks.push({
      name: `Random #${i + 1}: ${numDice}d${diceSize}${hasAdvantage ? ' +adv' : ''} @ L${partyLevel}`,
      params: [partyLevel, monsterAC, toHitBonus, `${numDice}d${diceSize}`, hasAdvantage, false, 'relative'],
    });
  }
  
  return benchmarks;
}

/**
 * Run a comprehensive benchmark suite
 */
export async function runBenchmarkSuite(): Promise<BenchmarkResult[]> {
  console.log('🔬 Running REAL WASM Performance Benchmark Suite...\n');
  console.log('⚡ This measures actual computation time (no caching)\n');
  
  const benchmarks: Array<{
    name: string;
    params: Parameters<typeof benchmarkCalculation>;
  }> = [
    {
      name: 'Small dice (1d6+3)',
      params: [4, 15, 5, '1d6+3', false, false, 'relative'],
    },
    {
      name: 'Medium dice (2d8+5)',
      params: [8, 16, 6, '2d8+5', false, false, 'relative'],
    },
    {
      name: 'Large dice (3d6)',
      params: [12, 17, 7, '3d6', false, false, 'relative'],
    },
    {
      name: 'Very large dice (3d20)',
      params: [16, 18, 8, '3d20', false, false, 'relative'],
    },
    {
      name: 'Extreme case (9d20 @ L20)',
      params: [20, 19, 9, '9d20', false, false, 'relative'],
    },
    {
      name: 'Huge dice (5d100 @ L10)',
      params: [15, 20, 10, '5d100', false, false, 'relative'],
    },
    {
      name: 'Monster damage (10d12 @ L15)',
      params: [18, 21, 15, '10d12', false, false, 'relative'],
    },
    {
      name: 'Absurd case (20d20 @ L20)',
      params: [20, 22, 20, '20d20', false, false, 'relative'],
    },
  ];
  
  // Add 5 random generated tests
  console.log('🎲 Generating 5 random benchmark tests...\n');
  const randomBenchmarks = generateRandomBenchmarks(5);
  benchmarks.push(...randomBenchmarks);
  
  const results: BenchmarkResult[] = [];
  
  for (const benchmark of benchmarks) {
    console.log(`Running: ${benchmark.name}...`);
    const result = await benchmarkCalculation(...benchmark.params);
    results.push(result);
    
    console.log(`  JS:   ${result.jsTime.toFixed(2)}ms`);
    console.log(`  WASM: ${result.wasmTime.toFixed(2)}ms`);
    console.log(`  Speedup: ${result.speedup.toFixed(2)}x faster\n`);
  }
  
  return results;
}

/**
 * Display benchmark results in a formatted table
 */
export function displayBenchmarkResults(results: BenchmarkResult[]): void {
  console.log('\n📊 Benchmark Results Summary\n');
  console.log('┌─────────────────────────┬──────────┬──────────┬──────────┐');
  console.log('│ Test Case               │ JS       │ WASM     │ Speedup  │');
  console.log('├─────────────────────────┼──────────┼──────────┼──────────┤');
  
  results.forEach(result => {
    const testCase = result.testCase.padEnd(23);
    const jsTime = `${result.jsTime.toFixed(1)}ms`.padStart(8);
    const wasmTime = `${result.wasmTime.toFixed(1)}ms`.padStart(8);
    const speedup = `${result.speedup.toFixed(1)}x`.padStart(8);
    
    console.log(`│ ${testCase} │ ${jsTime} │ ${wasmTime} │ ${speedup} │`);
  });
  
  console.log('└─────────────────────────┴──────────┴──────────┴──────────┘');
  
  const avgSpeedup = results.reduce((sum, r) => sum + r.speedup, 0) / results.length;
  console.log(`\n⚡ Average Speedup: ${avgSpeedup.toFixed(2)}x faster with WASM\n`);
}

/**
 * Expose benchmark functions to window for easy access from DevTools console
 */
export function setupBenchmarkTools(): void {
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).runRealWasmBenchmark = async () => {
      const results = await runBenchmarkSuite();
      displayBenchmarkResults(results);
      return results;
    };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).benchmarkSingle = benchmarkCalculation;
    
    console.log('🔧 REAL Benchmark tools available:');
    console.log('  • runRealWasmBenchmark() - Run full benchmark suite (measures actual computation)');
    console.log('  • benchmarkSingle(level, ac, bonus, damage, ...) - Test single case');
  }
}
