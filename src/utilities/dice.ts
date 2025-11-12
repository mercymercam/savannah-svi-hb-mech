/**
 * Roll one or more dice with a specific size.
 * 
 * @param numDice - Number of dice to roll
 * @param diceSize - Size of each die (e.g., 6 for d6)
 * @param op - Operator for this roll ('+' or '-')
 * @returns Total result of the roll, with operator applied
 */
export const rollDice = (numDice: number, diceSize: number, op: '+' | '-'): number => {
  let total = 0;
  for (let i = 0; i < numDice; i++) {
    total += Math.floor(Math.random() * diceSize) + 1;
  }
  return op === '+' ? total : -total;
};

/**
 * Extract dice tokens from a damage string.
 * Returns an array of tokens with their operators.
 * 
 * @param damageString - The damage string to parse
 * @returns Array of tokens with type, operator, and values, or null if invalid
 */
interface DiceToken {
  type: 'dice' | 'number';
  op: '+' | '-';
  numDice?: number;
  diceSize?: number;
  value?: number;
}

export const extractDiceTokens = (damageString: string): DiceToken[] | null => {
  const trimmed = damageString.trim();
  
  // Try to parse as a simple number first
  const simpleNumber = parseFloat(trimmed);
  if (!isNaN(simpleNumber) && simpleNumber.toString() === trimmed) {
    return [{ type: 'number', op: '+', value: simpleNumber }];
  }
  
  // Validate format
  const pattern = /^([+-])?(?:\d+d\d+|[\d.]+)(?:[+-](?:\d+d\d+|[\d.]+))*$/i;
  if (!pattern.test(trimmed)) {
    return null;
  }
  
  const tokens: DiceToken[] = [];
  const matches = trimmed.match(/([+-]?)(?:\d+d\d+|[\d.]+)/gi);
  
  if (!matches) {
    return null;
  }
  
  for (const match of matches) {
    let op: '+' | '-' = '+';
    let value = match;
    
    if (match.startsWith('+')) {
      op = '+';
      value = match.substring(1);
    } else if (match.startsWith('-')) {
      op = '-';
      value = match.substring(1);
    }
    
    // Check if it's dice notation
    if (/^\d+d\d+$/i.test(value)) {
      const diceMatch = value.match(/^(\d+)d(\d+)$/i);
      if (diceMatch) {
        const numDice = parseInt(diceMatch[1], 10);
        const diceSize = parseInt(diceMatch[2], 10);
        tokens.push({ type: 'dice', op, numDice, diceSize });
      }
    } else {
      // It's a simple number
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        tokens.push({ type: 'number', op, value: numValue });
      }
    }
  }
  
  return tokens.length > 0 ? tokens : null;
};

/**
 * Parse a damage string which can be either a simple number (e.g., "8.5")
 * or dice notation (e.g., "3d6+5" or "1d10+3d8-5").
 * Supports arbitrary sequences of dice and modifiers.
 * 
 * @param damageString - The damage string to parse
 * @returns Average damage value, or null if invalid
 */
export const parseDamageString = (damageString: string): number | null => {
  const trimmed = damageString.trim();
  
  // Try to parse as a simple number first
  const simpleNumber = parseFloat(trimmed);
  if (!isNaN(simpleNumber) && simpleNumber.toString() === trimmed) {
    return simpleNumber;
  }
  
  // Try to parse as dice notation with arbitrary sequences
  // Valid formats: 1d10, 3d6+5, 1d10+3d8-5, +3d10-1d10-5+1d15, etc.
  const pattern = /^([+-])?(?:\d+d\d+|[\d.]+)(?:[+-](?:\d+d\d+|[\d.]+))*$/i;
  
  if (!pattern.test(trimmed)) {
    return null;
  }
  
  let total = 0;
  
  // Split by + and -, keeping the operators
  const tokens = trimmed.match(/([+-]?)(?:\d+d\d+|[\d.]+)/gi);
  
  if (!tokens) {
    return null;
  }
  
  for (const token of tokens) {
    // Extract operator and value
    let op = '+';
    let value = token;
    
    if (token.startsWith('+')) {
      op = '+';
      value = token.substring(1);
    } else if (token.startsWith('-')) {
      op = '-';
      value = token.substring(1);
    }
    
    let result = 0;
    
    // Check if it's dice notation
    if (/^\d+d\d+$/i.test(value)) {
      const diceMatch = value.match(/^(\d+)d(\d+)$/i);
      if (diceMatch) {
        const numDice = parseInt(diceMatch[1], 10);
        const diceSize = parseInt(diceMatch[2], 10);
        // Average of a single die is (1 + sides) / 2
        const avgRoll = (1 + diceSize) / 2;
        result = numDice * avgRoll;
      }
    } else {
      // It's a simple number
      result = parseFloat(value);
      if (isNaN(result)) {
        return null;
      }
    }
    
    // Apply operator
    if (op === '+') {
      total += result;
    } else if (op === '-') {
      total -= result;
    }
  }
  
  return total;
};
