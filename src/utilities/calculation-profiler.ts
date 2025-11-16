/**
 * Calculation profiling utilities for debugging performance
 * Use these to identify bottlenecks in the calculation pipeline
 */

import { calculateBatchDamageStats } from './batch-calculator';

/**
 * Profile a single calculation with detailed timing breakdown
 */
export function profileCalculation(
  partyLevel: number,
  monsterAC: number,
  toHitBonus: number,
  baseDamage: string,
  hasAdvantage: boolean = false,
  considerCrits: boolean = false,
  viewMode: 'relative' | 'absolute' = 'relative',
): void {
  console.group(`🔬 Profiling Calculation`);
  console.log(`Inputs:
  - Party Level: ${partyLevel}
  - Monster AC: ${monsterAC}
  - To Hit Bonus: ${toHitBonus}
  - Base Damage: ${baseDamage}
  - Has Advantage: ${hasAdvantage}
  - Consider Crits: ${considerCrits}
  - View Mode: ${viewMode}`);
  
  const profStart = performance.now();
  
  try {
    const results = calculateBatchDamageStats(
      partyLevel,
      monsterAC,
      toHitBonus,
      baseDamage,
      hasAdvantage,
      considerCrits,
      viewMode
    );
    
    const profEnd = performance.now();
    const totalTime = profEnd - profStart;
    
    console.log(`\n✅ Calculation completed in ${totalTime.toFixed(2)}ms`);
    console.log(`Results: ${results.length} d4 options calculated`);
    
    // The detailed breakdown is logged by batch-calculator itself
    
  } catch (error) {
    console.error('❌ Calculation failed:', error);
  }
  
  console.groupEnd();
}

/**
 * Run multiple calculations and report statistics
 */
export function benchmarkCalculation(
  partyLevel: number,
  monsterAC: number,
  toHitBonus: number,
  baseDamage: string,
  iterations: number = 10,
  hasAdvantage: boolean = false,
  considerCrits: boolean = false,
  viewMode: 'relative' | 'absolute' = 'relative',
): void {
  console.group(`📊 Benchmark: ${iterations} iterations`);
  console.log(`Inputs:
  - Party Level: ${partyLevel}
  - Monster AC: ${monsterAC}
  - To Hit Bonus: ${toHitBonus}
  - Base Damage: ${baseDamage}
  - Has Advantage: ${hasAdvantage}
  - Consider Crits: ${considerCrits}
  - View Mode: ${viewMode}`);
  
  const times: number[] = [];
  
  // Warm-up
  console.log('Warming up...');
  calculateBatchDamageStats(partyLevel, monsterAC, toHitBonus, baseDamage, hasAdvantage, considerCrits, viewMode);
  
  console.log(`Running ${iterations} iterations...`);
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    calculateBatchDamageStats(partyLevel, monsterAC, toHitBonus, baseDamage, hasAdvantage, considerCrits, viewMode);
    const end = performance.now();
    times.push(end - start);
  }
  
  times.sort((a, b) => a - b);
  const min = times[0];
  const max = times[times.length - 1];
  const median = times[Math.floor(times.length / 2)];
  const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
  const p95 = times[Math.floor(times.length * 0.95)];
  
  console.log(`\n📈 Statistics:`);
  console.log(`  Min: ${min.toFixed(2)}ms`);
  console.log(`  Median: ${median.toFixed(2)}ms`);
  console.log(`  Average: ${avg.toFixed(2)}ms`);
  console.log(`  P95: ${p95.toFixed(2)}ms`);
  console.log(`  Max: ${max.toFixed(2)}ms`);
  
  console.groupEnd();
}

/**
 * Compare different base damage strings
 */
export function compareDamageStrings(
  damageStrings: string[],
  partyLevel: number = 5,
  monsterAC: number = 15,
  toHitBonus: number = 3,
): void {
  console.group(`🔄 Comparing ${damageStrings.length} damage strings`);
  
  const results: Array<{ damage: string; time: number }> = [];
  
  for (const damage of damageStrings) {
    const start = performance.now();
    calculateBatchDamageStats(partyLevel, monsterAC, toHitBonus, damage, false, true, 'relative');
    const end = performance.now();
    const time = end - start;
    
    results.push({ damage, time });
    console.log(`${damage}: ${time.toFixed(2)}ms`);
  }
  
  results.sort((a, b) => a.time - b.time);
  
  console.log(`\n🏆 Fastest: ${results[0].damage} (${results[0].time.toFixed(2)}ms)`);
  console.log(`🐌 Slowest: ${results[results.length - 1].damage} (${results[results.length - 1].time.toFixed(2)}ms)`);
  console.log(`📈 Slowdown: ${(results[results.length - 1].time / results[0].time).toFixed(2)}x`);
  
  console.groupEnd();
}

// Expose to window for easy console access
if (typeof window !== 'undefined') {
  interface CalcProfile {
    profile: typeof profileCalculation;
    benchmark: typeof benchmarkCalculation;
    compare: typeof compareDamageStrings;
  }
  
  (window as typeof window & { calcProfile: CalcProfile }).calcProfile = {
    profile: profileCalculation,
    benchmark: benchmarkCalculation,
    compare: compareDamageStrings,
  };
  
  console.log('💡 Calculation profiling available via window.calcProfile:');
  console.log('  - calcProfile.profile(level, ac, toHit, baseDamage) - Detailed single run');
  console.log('  - calcProfile.benchmark(level, ac, toHit, baseDamage, iterations) - Multiple runs');
  console.log('  - calcProfile.compare([damages], level, ac, toHit) - Compare different damage strings');
}
