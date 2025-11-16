import { extractDiceTokens } from './dice';

/**
 * Roll a single die with the given number of sides
 */
function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Roll multiple dice and sum them
 */
function rollDice(numDice: number, sides: number): number {
  let sum = 0;
  for (let i = 0; i < numDice; i++) {
    sum += rollDie(sides);
  }
  return sum;
}

/**
 * Parse and roll a dice expression like "2d6+5"
 */
function rollDiceExpression(expression: string): number {
  const tokens = extractDiceTokens(expression);
  if (!tokens) return 0;

  let total = 0;
  for (const token of tokens) {
    if (token.type === 'dice' && token.numDice && token.diceSize) {
      const diceTotal = rollDice(token.numDice, token.diceSize);
      total += token.op === '+' ? diceTotal : -diceTotal;
    } else if (token.type === 'number' && token.value !== undefined) {
      total += token.op === '+' ? token.value : -token.value;
    }
  }
  return total;
}

/**
 * Simulate a single attack with the mechanic
 * CRITICAL: We must use the SAME damage roll for both "with" and "without" d4s scenarios
 * to properly compare the mechanic's effect on the same attack
 */
function simulateSingleAttack(
  attackBonus: number,
  monsterAC: number,
  baseDamage: string,
  numD4s: number,
  hasAdvantage: boolean,
  considerCrits: boolean
): { withD4s: number; withoutD4s: number } {
  // Roll d20 (with advantage if applicable)
  let d20Roll = rollDie(20);
  if (hasAdvantage) {
    const roll2 = rollDie(20);
    d20Roll = Math.max(d20Roll, roll2);
  }

  // Roll the d4s
  const d4Total = rollDice(numD4s, 4);

  // Pre-roll ALL damage dice once so both scenarios use the same values
  let baseDamageRoll = 0;
  let critDamageRoll = 0;
  
  if (considerCrits) {
    // Roll both base and crit damage
    const tokens = extractDiceTokens(baseDamage);
    if (tokens) {
      for (const token of tokens) {
        if (token.type === 'dice' && token.numDice && token.diceSize) {
          const baseDiceTotal = rollDice(token.numDice, token.diceSize);
          const critDiceTotal = rollDice(token.numDice * 2, token.diceSize);
          baseDamageRoll += token.op === '+' ? baseDiceTotal : -baseDiceTotal;
          critDamageRoll += token.op === '+' ? critDiceTotal : -critDiceTotal;
        } else if (token.type === 'number' && token.value !== undefined) {
          const value = token.op === '+' ? token.value : -token.value;
          baseDamageRoll += value;
          critDamageRoll += value;
        }
      }
    }
  } else {
    // Only need base damage
    baseDamageRoll = rollDiceExpression(baseDamage);
    critDamageRoll = baseDamageRoll; // No crit consideration, so crit = base
  }

  // Calculate damage without d4s (baseline)
  let damageWithoutD4s = 0;
  if (d20Roll === 1) {
    // Critical miss
    damageWithoutD4s = 0;
  } else if (d20Roll === 20) {
    // Critical hit - use pre-rolled crit damage
    damageWithoutD4s = considerCrits ? critDamageRoll : baseDamageRoll;
  } else {
    // Normal roll
    const totalRoll = d20Roll + attackBonus;
    if (totalRoll >= monsterAC) {
      damageWithoutD4s = baseDamageRoll;
    }
  }

  // Calculate damage with d4s - using the SAME damage rolls
  let damageWithD4s = 0;
  if (d20Roll === 1) {
    // Critical miss
    damageWithD4s = 0;
  } else if (d20Roll === 20) {
    // Critical hit - use the SAME pre-rolled crit damage, plus d4 bonus
    const baseCritDamage = considerCrits ? critDamageRoll : baseDamageRoll;
    damageWithD4s = baseCritDamage + (d4Total * 2);
  } else {
    // Normal roll with d4 penalty
    const totalRoll = d20Roll + attackBonus - d4Total;
    if (totalRoll >= monsterAC) {
      damageWithD4s = baseDamageRoll + (d4Total * 2);
    }
  }

  return { withD4s: damageWithD4s, withoutD4s: damageWithoutD4s };
}

/**
 * Run a Monte Carlo simulation for a single d4 count
 */
function simulateDamageForD4Count(
  partyLevel: number,
  monsterAC: number,
  toHitBonus: number,
  baseDamage: string,
  numD4s: number,
  hasAdvantage: boolean,
  considerCrits: boolean,
  viewMode: 'relative' | 'absolute',
  iterations: number
): number[] {
  const proficiencyBonus = Math.ceil(partyLevel / 4) + 1;
  const attackBonus = proficiencyBonus + toHitBonus;

  const results: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const { withD4s, withoutD4s } = simulateSingleAttack(
      attackBonus,
      monsterAC,
      baseDamage,
      numD4s,
      hasAdvantage,
      considerCrits
    );
    
    const result = viewMode === 'absolute' ? withD4s : (withD4s - withoutD4s);
    results.push(result);
  }

  // Sort for percentile calculation
  results.sort((a, b) => a - b);

  // Calculate percentiles using linear interpolation (matches statistical convention)
  // This aligns with how the analytical calculation finds percentiles via CDF
  const getPercentile = (p: number): number => {
    const target = p / 100;
    const index = target * (results.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return results[lower];
    }
    
    // Linear interpolation between the two closest values
    const weight = index - lower;
    return Math.round(results[lower] * (1 - weight) + results[upper] * weight);
  };

  return [
    getPercentile(5),   // 5th percentile
    getPercentile(25),  // Q1
    getPercentile(50),  // Median
    getPercentile(75),  // Q3
    getPercentile(95),  // 95th percentile
  ];
}

/**
 * Run Monte Carlo simulation for all d4 counts
 * This matches the interface of calculateBatchDamageStats
 */
export function monteCarloSimulation(
  partyLevel: number,
  monsterAC: number,
  toHitBonus: number,
  baseDamage: string,
  hasAdvantage: boolean = false,
  considerCrits: boolean = false,
  viewMode: 'relative' | 'absolute' = 'relative',
  iterations: number = 100000
): number[][] {
  const proficiencyBonus = Math.ceil(partyLevel / 4) + 1;
  const results: number[][] = [];

  for (let numD4s = 1; numD4s <= proficiencyBonus; numD4s++) {
    results.push(
      simulateDamageForD4Count(
        partyLevel,
        monsterAC,
        toHitBonus,
        baseDamage,
        numD4s,
        hasAdvantage,
        considerCrits,
        viewMode,
        iterations
      )
    );
  }

  return results;
}
