import { extractDiceTokens } from './dice';
import { RangeDist, d } from './prob-eval';
import { isWasmAvailable, calculateBatchDamageStatsWasm, type BatchDamageParams } from './wasm-bridge';

/**
 * Cache for base damage distributions to avoid recalculating
 */
const damageDistCache = new Map<string, { base: RangeDist; crit: RangeDist }>();

/**
 * Build base and crit damage distributions from a dice expression
 * Results are cached to avoid redundant calculations
 */
function buildDamageDistributions(
  baseDamage: string,
  considerCrits: boolean
): { baseDamageDist: RangeDist; critDamageDist: RangeDist } {
  const cacheKey = `${baseDamage}|${considerCrits}`;
  
  if (damageDistCache.has(cacheKey)) {
    const cached = damageDistCache.get(cacheKey)!;
    return { baseDamageDist: cached.base, critDamageDist: cached.crit };
  }

  const baseDamageTokens = extractDiceTokens(baseDamage);
  
  if (!baseDamageTokens) {
    const zero = RangeDist.literal(0);
    return { baseDamageDist: zero, critDamageDist: zero };
  }

  // Build the base damage distribution
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

  // Build crit damage distribution
  let critDamageDist = RangeDist.literal(0);
  if (considerCrits) {
    for (const token of baseDamageTokens) {
      if (token.type === 'dice' && token.numDice && token.diceSize) {
        const diceDist = d(token.diceSize).repeatSum(token.numDice * 2);
        if (token.op === '+') {
          critDamageDist = critDamageDist.add(diceDist);
        } else {
          critDamageDist = critDamageDist.add(diceDist.negate());
        }
      } else if (token.type === 'number' && token.value !== undefined) {
        const intValue = Math.round(token.value);
        if (token.op === '+') {
          critDamageDist = critDamageDist.add(intValue);
        } else {
          critDamageDist = critDamageDist.add(-intValue);
        }
      }
    }
  }

  // Cache the results
  damageDistCache.set(cacheKey, { base: baseDamageDist, crit: critDamageDist });

  return { baseDamageDist, critDamageDist };
}

/**
 * Helper function to calculate percentiles from a RangeDist
 */
function calculatePercentilesFromDist(dist: RangeDist): number[] {
  const cdf: number[] = [];
  let cumulative = 0;
  
  for (let i = 0; i < dist.p.length; i++) {
    cumulative += dist.p[i];
    cdf.push(cumulative);
  }
  
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
}

/**
 * Batch calculate damage stats for multiple d4 counts at once
 * 
 * WASM-ACCELERATED: Automatically uses WebAssembly if available for 10-100x speedup
 * Falls back to optimized JavaScript if WASM fails to load
 * 
 * @returns Array of percentile arrays, one for each d4Count from 1 to proficiencyBonus
 */
export function calculateBatchDamageStats(
  partyLevel: number,
  monsterAC: number,
  toHitBonus: number,
  baseDamage: string,
  hasAdvantage: boolean = false,
  considerCrits: boolean = false,
  viewMode: 'relative' | 'absolute' = 'relative',
): number[][] {
  const proficiencyBonus = Math.ceil(partyLevel / 4) + 1;
  const attackBonus = proficiencyBonus + toHitBonus;

  // Build damage distributions once (with caching)
  const { baseDamageDist, critDamageDist } = buildDamageDistributions(baseDamage, considerCrits);

  // Build d20 distribution once
  let d20Dist = d(20);
  if (hasAdvantage) {
    d20Dist = RangeDist.largest(d(20), d(20));
  }

  // Pre-build all d4 distributions
  const d4Dists: RangeDist[] = [];
  for (let numD4s = 1; numD4s <= proficiencyBonus; numD4s++) {
    d4Dists.push(d(4).repeatSum(numD4s));
  }

  // Try WASM first if available
  if (isWasmAvailable()) {
    try {
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

      const result = calculateBatchDamageStatsWasm(params);
      const wasmTime = performance.now() - wasmStart;
      
      console.log(`⚡ WASM calculated ${baseDamage} @ L${partyLevel} in ${wasmTime.toFixed(2)}ms`);
      
      return result;
    } catch (error) {
      console.warn('⚠️ WASM calculation failed, falling back to JavaScript:', error);
      // Fall through to JavaScript implementation
    }
  }

  // JavaScript fallback implementation
  const jsStart = performance.now();
  const result = calculateBatchDamageStatsJS(
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
  
  console.log(`📜 JS calculated ${baseDamage} @ L${partyLevel} in ${jsTime.toFixed(2)}ms`);
  
  return result;
}

/**
 * JavaScript fallback for batch damage calculation
 * This is the original optimized implementation
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

  // Single pass through all combinations
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
          if (viewMode === 'relative') {
            if (d20Roll === 1) {
              damageWithoutD4s = 0;
            } else if (d20Roll === 20) {
              damageWithoutD4s = critDmg;
            } else {
              const rollWithoutD4s = d20Roll + attackBonus;
              damageWithoutD4s = rollWithoutD4s >= monsterAC ? baseDmg : 0;
            }
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
        if (viewMode === 'relative') {
          if (d20Roll === 1) {
            damageWithoutD4s = 0;
          } else if (d20Roll === 20) {
            damageWithoutD4s = baseDmg;
          } else {
            const rollWithoutD4s = d20Roll + attackBonus;
            damageWithoutD4s = rollWithoutD4s >= monsterAC ? baseDmg : 0;
          }
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

  // Convert Maps to percentiles
  const results: number[][] = [];
  for (let i = 0; i < proficiencyBonus; i++) {
    const outcomeMap = allResults[i];
    
    if (outcomeMap.size === 0) {
      results.push([0, 0, 0, 0, 0]);
      continue;
    }

    const sortedValues = Array.from(outcomeMap.keys()).sort((a, b) => a - b);
    const min = sortedValues[0];
    const max = sortedValues[sortedValues.length - 1];
    const p = new Float64Array(max - min + 1);

    for (const [value, prob] of outcomeMap) {
      p[value - min] = prob;
    }

    const dist = new RangeDist(min, max, p);
    results.push(calculatePercentilesFromDist(dist));
  }

  return results;
}

/**
 * Clear the damage distribution cache
 */
export function clearDamageDistCache(): void {
  damageDistCache.clear();
}
