import nd4Data from '@/assets/nd4.json';
import { rollDice, extractDiceTokens } from './dice';

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
 * Calculate expected damage deltas for a set of d4 outcomes relative to not using those d4s.
 *
 * Uses getD4Distribution(numD4s) to iterate each d4 outcome, computes the hit chance via
 * calculateHitChance(partyLevel, monsterAC, d4Value, toHitBonus, hasAdvantage), and compares
 * the expected bonus damage from the d4s to the baseline expected damage without them.
 *
 * Each returned value represents the expected change in damage (average damage per attack)
 * for the corresponding entry in the d4 distribution.
 *
 * @param numD4s - Number of d4 dice being considered; used to derive the d4 outcome distribution.
 * @param partyLevel - Attacker/party level used when computing to-hit probabilities.
 * @param monsterAC - Target Armor Class against which to roll to-hit.
 * @param toHitBonus - Flat to-hit modifier added to the attack roll.
 * @param baseDamage - Base damage dealt on a successful hit (without the additional d4s).
 * @param hasAdvantage - Whether the attack roll has advantage (default: false).
 *
 * @returns number[] - An array of numbers (one per entry in the d4 distribution). Each element is
 * the expected damage delta (bonus expected damage from the d4s, weighted by hit chance, minus
 * the baseline expected damage without those d4s). Values are in units of average damage per attack
 * and may be negative if the addition reduces expected damage relative to the baseline.
 */
export const calculateDamageStats = (
  numD4s: number,
  partyLevel: number,
  monsterAC: number,
  toHitBonus: number,
  baseDamage: number | string,
  hasAdvantage: boolean = false,
): number[] => {
  const d4Distribution = getD4Distribution(numD4s);

  console.log('Calculating Damage Stats with baseDamage:', baseDamage);

  // Parse baseDamage if it's a string
  let baseDamageValue: number;
  if (typeof baseDamage === 'string') {
    return simulateDamageStats(
      numD4s,
      partyLevel,
      monsterAC,
      toHitBonus,
      baseDamage,
      hasAdvantage,
      10000
    ) as number[];
  } else {
    baseDamageValue = baseDamage;
  }

  const baseHitChance = calculateHitChance(partyLevel, monsterAC, 0, toHitBonus, hasAdvantage);
  const baseExpectedDmg =  baseDamageValue * baseHitChance;

  // Calculate damage delta for each percentile: (d4 value * 2) weighted by hit chance
  return d4Distribution.map((d4Value) => {
    const damageBonus = d4Value * 2;
    const hitChance = calculateHitChance(partyLevel, monsterAC, d4Value, toHitBonus, hasAdvantage);
    const bonusDamageWithHitChance = (baseExpectedDmg + damageBonus) * hitChance;
    // Return the delta gain compared to not using d4s
    const delta = bonusDamageWithHitChance - baseExpectedDmg;
    return Math.round(delta * 1000000) / 1000000;
  });
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
  
  // Calculate baseline hit chance
  const baseHitChance = calculateHitChance(partyLevel, monsterAC, 0, toHitBonus, hasAdvantage);
  
  // Frequency map to store damage outcomes
  const frequencyMap = new Map<number, number>();
  
  // Run simulation
  for (let i = 0; i < iterations; i++) {
    // Roll all base damage dice
    let baseDamageRoll = 0;
    for (const token of baseDamageTokens) {
      if (token.type === 'dice' && token.numDice && token.diceSize) {
        baseDamageRoll += rollDice(token.numDice, token.diceSize, token.op);
      } else if (token.type === 'number' && token.value !== undefined) {
        // simple number
        if (token.op === '+') {
          baseDamageRoll += token.value;
        } else {
          baseDamageRoll -= token.value;
        }
      }
    }
    
    // Roll d4s for this iteration
    let d4Roll = 0;
    for (let j = 0; j < Math.min(numD4s, Math.ceil(partyLevel / 4) + 1); j++) {
      d4Roll += Math.floor(Math.random() * 4) + 1;
    }
    
    // Calculate hit chance with this d4 roll
    const hitChance = calculateHitChance(partyLevel, monsterAC, d4Roll, toHitBonus, hasAdvantage);
    
    // Calculate expected damage delta for this roll
    const damageBonus = d4Roll * 2;
    const baseExpectedDmg = baseDamageRoll * baseHitChance;
    const bonusDamageWithHitChance = (baseDamageRoll + damageBonus) * hitChance;
    const delta = bonusDamageWithHitChance - baseExpectedDmg;
    
    // Round to 6 decimal places for consistency
    const roundedDelta = Math.round(delta * 1000000) / 1000000;
    
    // Record in frequency map
    frequencyMap.set(roundedDelta, (frequencyMap.get(roundedDelta) || 0) + 1);
  }
  
  // Convert frequency map to sorted array of values
  const sortedValues = Array.from(frequencyMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([value]) => value);
  
  // Calculate percentiles
  const p5Index = Math.floor(sortedValues.length * 0.05);
  const q1Index = Math.floor(sortedValues.length * 0.25);
  const medianIndex = Math.floor(sortedValues.length * 0.5);
  const q3Index = Math.floor(sortedValues.length * 0.75);
  const p95Index = Math.floor(sortedValues.length * 0.95);
  
  console.log('Simulated Damage Stats:', {
    p5: sortedValues[p5Index],
    q1: sortedValues[q1Index],
    median: sortedValues[medianIndex],
    q3: sortedValues[q3Index],
    p95: sortedValues[p95Index],
  });

  return [
    sortedValues[p5Index],
    sortedValues[q1Index],
    sortedValues[medianIndex],
    sortedValues[q3Index],
    sortedValues[p95Index],
  ];
};
