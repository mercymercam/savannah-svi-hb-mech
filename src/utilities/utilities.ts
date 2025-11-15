import nd4Data from '@/assets/nd4.json';
import { rollDice, extractDiceTokens, isDiceExpression } from './dice';
import { RangeDist, d } from './prob-eval';

export const getD4Distribution = (numD4s: number): number[] => {
  // Cast to proper type for accessing data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = nd4Data as any;
  const key = String(numD4s);

  if (!(key in data)) {
    return [0, 0, 0, 0, 0];
  }

  const distribution = data[key];
  return [
    distribution['5'],
    distribution['25'],
    distribution['50'],
    distribution['75'],
    distribution['95'],
  ];
};


// Calculate hit chance based on d20 roll needed
export const calculateHitChance = (
  partyLevel: number,
  monsterAC: number,
  numD4s: number,
  toHitBonus: number,
  hasAdvantage: boolean = false
): number => {
  const proficiencyBonus = Math.ceil(partyLevel / 4) + 1;
  const attackBonus = proficiencyBonus + toHitBonus;
  const d4Penalty = Math.min(numD4s, proficiencyBonus);

  // Need d20Roll + attackBonus - d4Penalty >= monsterAC
  // So d20Roll >= monsterAC - attackBonus + d4Penalty
  // Average d4 roll is 2.5, so we use expected value for hit chance calculation
  const averageD4Penalty = d4Penalty * 2.5;
  const d20Needed = Math.ceil(monsterAC - attackBonus + averageD4Penalty);

  // Chance to roll d20Needed or higher on a d20
  let hitChance = (21 - d20Needed) / 20;

  // If we roll a 20 we auto hit no matter what, if we roll a 1 we auto miss no matter what.
  hitChance = Math.max(.05, Math.min(.95, hitChance));

  // With advantage, the probability is: 1 - (1 - p)^2
  // This is the probability of getting at least one success on two rolls
  if (hasAdvantage) {
    hitChance = 1 - Math.pow(1 - hitChance, 2);
  }

  return Math.round(hitChance * 1000000) / 1000000;
};

// Calculate expected damage delta gained by using numD4s instead of not using any
/**
 * Calculate expected damage statistics for a set of d4 outcomes.
 *
 * Can operate in two modes:
 * - 'relative' (default): Returns damage deltas (difference between using d4s vs not using them)
 * - 'absolute': Returns total expected damage when using the d4s
 *
 * Uses getD4Distribution(numD4s) to iterate each d4 outcome, computes the hit chance via
 * calculateHitChance(partyLevel, monsterAC, d4Value, toHitBonus, hasAdvantage), and calculates
 * the expected damage based on the view mode.
 *
 * Each returned value represents the expected damage (average damage per attack)
 * for the corresponding entry in the d4 distribution.
 *
 * @param numD4s - Number of d4 dice being considered; used to derive the d4 outcome distribution.
 * @param partyLevel - Attacker/party level used when computing to-hit probabilities.
 * @param monsterAC - Target Armor Class against which to roll to-hit.
 * @param toHitBonus - Flat to-hit modifier added to the attack roll.
 * @param baseDamage - Base damage dealt on a successful hit (without the additional d4s).
 * @param hasAdvantage - Whether the attack roll has advantage (default: false).
 * @param viewMode - 'relative' for damage deltas, 'absolute' for total damage (default: 'relative').
 *
 * @returns number[] - An array of numbers (one per entry in the d4 distribution). Each element is
 * either the expected damage delta (if viewMode is 'relative') or the total expected damage 
 * (if viewMode is 'absolute'). Values are in units of average damage per attack.
 */
export const calculateDamageStats = (
  numD4s: number,
  partyLevel: number,
  monsterAC: number,
  toHitBonus: number,
  baseDamage: number | string,
  hasAdvantage: boolean = false,
  viewMode: 'relative' | 'absolute' = 'relative',
): number[] => {
  console.log('Calculating Damage Stats with baseDamage:', baseDamage);

  // Determine if we should consider crits based on whether baseDamage contains dice
  const considerCrits = typeof baseDamage === 'string' && isDiceExpression(baseDamage);
  
  console.log('Considering crits:', considerCrits);

  // Parse baseDamage
  if (typeof baseDamage === 'string') {
    // Use the full distribution method for dice notation
    return calculateDirectlyDamageStats(
      numD4s,
      partyLevel,
      monsterAC,
      toHitBonus,
      baseDamage,
      hasAdvantage,
      considerCrits,
      viewMode,
    ) as number[];
  } else {
    // For numeric base damage, convert to dice notation (treating as constant damage)
    // This ensures we use the proper probability distribution calculation
    const baseDamageStr = `${Math.round(baseDamage)}`;
    return calculateDirectlyDamageStats(
      numD4s,
      partyLevel,
      monsterAC,
      toHitBonus,
      baseDamageStr,
      hasAdvantage,
      false, // Never consider crits for numeric damage
      viewMode,
    ) as number[];
  }
};

/*
* Calculate expected delta damage from d4 using simulation.
*/
export const simulateDamageStats = (
  numD4s: number,
  partyLevel: number,
  monsterAC: number,
  toHitBonus: number,
  baseDamage: string,
  hasAdvantage: boolean = false,
  iterations: number = 100000
) => {
  // Parse base damage string to extract all dice components
  const baseDamageTokens = extractDiceTokens(baseDamage);
  
  if (!baseDamageTokens) {
    return null;
  }
  
  // Calculate proficiency bonus
  const proficiencyBonus = Math.ceil(partyLevel / 4) + 1;
  const maxD4s = Math.min(numD4s, proficiencyBonus);
  
  // Calculate attack bonus
  const attackBonus = proficiencyBonus + toHitBonus;
  
  // Array to store all delta values from simulation
  const deltas: number[] = [];
  
  // Run simulation
  for (let i = 0; i < iterations; i++) {
    // Roll a d20 (with advantage if needed)
    let d20Roll: number;
    if (hasAdvantage) {
      const roll1 = Math.floor(Math.random() * 20) + 1;
      const roll2 = Math.floor(Math.random() * 20) + 1;
      d20Roll = Math.max(roll1, roll2);
    } else {
      d20Roll = Math.floor(Math.random() * 20) + 1;
    }
    
    // Roll base damage dice
    let baseDamageRoll = 0;
    for (const token of baseDamageTokens) {
      if (token.type === 'dice' && token.numDice && token.diceSize) {
        baseDamageRoll += rollDice(token.numDice, token.diceSize, token.op);
      } else if (token.type === 'number' && token.value !== undefined) {
        if (token.op === '+') {
          baseDamageRoll += token.value;
        } else {
          baseDamageRoll -= token.value;
        }
      }
    }
    
    // Roll d4s for this iteration
    let d4Roll = 0;
    for (let j = 0; j < maxD4s; j++) {
      d4Roll += Math.floor(Math.random() * 4) + 1;
    }
    
    // Calculate damage without d4s for this scenario
    let damageWithoutD4s: number;
    if (d20Roll === 1) {
      damageWithoutD4s = 0; // Auto-miss
    } else if (d20Roll === 20) {
      damageWithoutD4s = baseDamageRoll; // Auto-hit
    } else {
      const rollWithoutD4s = d20Roll + attackBonus;
      damageWithoutD4s = rollWithoutD4s >= monsterAC ? baseDamageRoll : 0;
    }
    
    // Calculate damage with d4s for this scenario
    let damageWithD4s: number;
    if (d20Roll === 1) {
      damageWithD4s = 0; // Auto-miss
    } else if (d20Roll === 20) {
      damageWithD4s = baseDamageRoll + (d4Roll * 2); // Auto-hit with bonus
    } else {
      const rollWithD4s = d20Roll + attackBonus - d4Roll;
      damageWithD4s = rollWithD4s >= monsterAC ? (baseDamageRoll + (d4Roll * 2)) : 0;
    }
    
    // Calculate the delta
    const delta = damageWithD4s - damageWithoutD4s;
    deltas.push(delta);
  }
  
  // Sort deltas to calculate percentiles
  deltas.sort((a, b) => a - b);
  
  // Calculate percentiles
  const p5Index = Math.floor(iterations * 0.05);
  const q1Index = Math.floor(iterations * 0.25);
  const medianIndex = Math.floor(iterations * 0.50);
  const q3Index = Math.floor(iterations * 0.75);
  const p95Index = Math.floor(iterations * 0.95);
  
  console.log('Simulated Damage Stats:', {
    p5: deltas[p5Index],
    q1: deltas[q1Index],
    median: deltas[medianIndex],
    q3: deltas[q3Index],
    p95: deltas[p95Index],
  });

  return [
    deltas[p5Index],
    deltas[q1Index],
    deltas[medianIndex],
    deltas[q3Index],
    deltas[p95Index],
  ];
};

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

export const calculateDirectlyDamageStats = (
  numD4s: number,
  partyLevel: number,
  monsterAC: number,
  toHitBonus: number,
  baseDamage: string,
  hasAdvantage: boolean = false,
  considerCrits: boolean = false,
  viewMode: 'relative' | 'absolute' = 'relative',
): number[] => {
  // Parse base damage string to extract all dice components
  const baseDamageTokens = extractDiceTokens(baseDamage);
  
  if (!baseDamageTokens) {
    return [0, 0, 0, 0, 0];
  }
  
  // Build the base damage distribution using RangeDist
  let baseDamageDist = RangeDist.literal(0);
  for (const token of baseDamageTokens) {
    if (token.type === 'dice' && token.numDice && token.diceSize) {
      // Create distribution for this dice roll
      const diceDist = d(token.diceSize).repeatSum(token.numDice);
      if (token.op === '+') {
        baseDamageDist = baseDamageDist.add(diceDist);
      } else {
        baseDamageDist = baseDamageDist.add(diceDist.negate());
      }
    } else if (token.type === 'number' && token.value !== undefined) {
      // Add/subtract constant (round to integer for RangeDist)
      const intValue = Math.round(token.value);
      if (token.op === '+') {
        baseDamageDist = baseDamageDist.add(intValue);
      } else {
        baseDamageDist = baseDamageDist.add(-intValue);
      }
    }
  }
  
  // Build crit damage distribution if considering crits
  // On a crit, all dice are doubled (rolled twice), but flat modifiers are not
  let critDamageDist = RangeDist.literal(0);
  if (considerCrits) {
    for (const token of baseDamageTokens) {
      if (token.type === 'dice' && token.numDice && token.diceSize) {
        // On a crit, roll the dice twice
        const diceDist = d(token.diceSize).repeatSum(token.numDice * 2);
        if (token.op === '+') {
          critDamageDist = critDamageDist.add(diceDist);
        } else {
          critDamageDist = critDamageDist.add(diceDist.negate());
        }
      } else if (token.type === 'number' && token.value !== undefined) {
        // Flat modifiers are not doubled on crits (round to integer for RangeDist)
        const intValue = Math.round(token.value);
        if (token.op === '+') {
          critDamageDist = critDamageDist.add(intValue);
        } else {
          critDamageDist = critDamageDist.add(-intValue);
        }
      }
    }
  }
  
  // Calculate proficiency bonus and max d4s we can use
  const proficiencyBonus = Math.ceil(partyLevel / 4) + 1;
  const maxD4s = Math.min(numD4s, proficiencyBonus);
  
  // Create d20 distribution (with advantage if needed)
  let d20Dist = d(20);
  if (hasAdvantage) {
    // Advantage: take the max of two d20 rolls
    d20Dist = RangeDist.largest(d(20), d(20));
  }
  
  // Calculate attack bonus
  const attackBonus = proficiencyBonus + toHitBonus;
  
  // Create d4 distribution
  const d4Dist = d(4).repeatSum(maxD4s);
  
  // Calculate damage distribution with d4s, then compute delta or absolute based on viewMode
  // For each combination of (d20 roll, d4 roll, base damage roll):
  //   - If d20 == 1: miss (0 damage)
  //   - If d20 == 20: crit hit (crit damage + 2*d4 if considerCrits, else base damage + 2*d4)
  //   - Otherwise: if d20 + attackBonus - d4 >= AC: hit (base damage + 2*d4), else miss (0 damage)
  //   - In relative mode: Delta = damage_with_d4s - damage_baseline
  //   - In absolute mode: Return damage_with_d4s
  const damageDeltaDist = d20Dist.map((d20Roll: number) => {
    return d4Dist.map((d4Value: number) => {
      if (considerCrits) {
        // When considering crits, we need to handle critical hits differently
        return baseDamageDist.map((baseDmg: number) => {
          return critDamageDist.map((critDmg: number) => {
            // Calculate damage without d4s for this scenario (only needed in relative mode)
            let damageWithoutD4s = 0;
            if (viewMode === 'relative') {
              if (d20Roll === 1) {
                damageWithoutD4s = 0; // Auto-miss
              } else if (d20Roll === 20) {
                damageWithoutD4s = critDmg; // Crit hit with crit damage
              } else {
                const rollWithoutD4s = d20Roll + attackBonus;
                damageWithoutD4s = rollWithoutD4s >= monsterAC ? baseDmg : 0;
              }
            }
            
            // Calculate damage with d4s for this scenario
            let damageWithD4s: number;
            if (d20Roll === 1) {
              damageWithD4s = 0; // Auto-miss
            } else if (d20Roll === 20) {
              damageWithD4s = critDmg + (d4Value * 2); // Crit hit with crit damage and bonus
            } else {
              const rollWithD4s = d20Roll + attackBonus - d4Value;
              damageWithD4s = rollWithD4s >= monsterAC ? (baseDmg + (d4Value * 2)) : 0;
            }
            
            // Return the delta or absolute value based on viewMode
            return viewMode === 'absolute' ? damageWithD4s : (damageWithD4s - damageWithoutD4s);
          });
        });
      } else {
        // When not considering crits, treat everything as non-crit
        return baseDamageDist.map((baseDmg: number) => {
          // Calculate damage without d4s for this scenario (only needed in relative mode)
          let damageWithoutD4s = 0;
          if (viewMode === 'relative') {
            if (d20Roll === 1) {
              damageWithoutD4s = 0; // Auto-miss
            } else if (d20Roll === 20) {
              damageWithoutD4s = baseDmg; // Auto-hit
            } else {
              const rollWithoutD4s = d20Roll + attackBonus;
              damageWithoutD4s = rollWithoutD4s >= monsterAC ? baseDmg : 0;
            }
          }
          
          // Calculate damage with d4s for this scenario
          let damageWithD4s: number;
          if (d20Roll === 1) {
            damageWithD4s = 0; // Auto-miss
          } else if (d20Roll === 20) {
            damageWithD4s = baseDmg + (d4Value * 2); // Auto-hit with bonus
          } else {
            const rollWithD4s = d20Roll + attackBonus - d4Value;
            damageWithD4s = rollWithD4s >= monsterAC ? (baseDmg + (d4Value * 2)) : 0;
          }
          
          // Return the delta or absolute value based on viewMode
          return viewMode === 'absolute' ? damageWithD4s : (damageWithD4s - damageWithoutD4s);
        });
      }
    });
  });
  
  // Calculate percentiles from the damage delta distribution
  const percentiles = calculatePercentilesFromDist(damageDeltaDist);
  
  console.log(`Damage Distribution (${viewMode} mode):`, {
    min: damageDeltaDist.min,
    max: damageDeltaDist.max,
    pLength: damageDeltaDist.p.length,
    firstFewProbs: Array.from(damageDeltaDist.p.slice(0, 10)),
    lastFewProbs: Array.from(damageDeltaDist.p.slice(-10)),
  });
  console.log('Percentiles:', percentiles);
  
  return percentiles;
};