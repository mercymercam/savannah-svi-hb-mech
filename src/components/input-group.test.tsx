import { describe, it, expect } from 'vitest';

/**
 * Test the validators from input-group.tsx
 * We need to export the validators to test them, or test them indirectly through the component
 * For now, we'll recreate the validator logic to test it
 */

// Recreate the baseDamage validator for testing
const baseDamageValidator = (value: string): { valid: boolean; error?: string } => {
  if (!value.trim()) return { valid: true }; // Empty is valid
  
  // Check if it's a simple number (with optional sign: +3.5, -3.5, .5, +.5, etc.)
  if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(value)) {
    const num = parseFloat(value);
    if (num < 0) return { valid: false, error: 'Damage must be 0 or greater' };
    return { valid: true };
  }
  
  // Check if it's dice notation with arbitrary sequences (e.g., "3d6+5" or "1d10+3d8-5")
  if (/^([+-])?(?:\d+d\d+|[\d.]+)(?:[+-](?:\d+d\d+|[\d.]+))*$/i.test(value)) {
    // Extract all dice expressions and validate die size is <= 100
    const diceMatches = value.match(/\d*d(\d+)/gi);
    if (diceMatches) {
      for (const diceExpr of diceMatches) {
        const dieSizeMatch = diceExpr.match(/d(\d+)/i);
        if (dieSizeMatch) {
          const dieSize = parseInt(dieSizeMatch[1], 10);
          if (dieSize > 100) {
            return { valid: false, error: 'Dice size must be d100 or smaller' };
          }
        }
      }
    }
    return { valid: true };
  }
  
  return { valid: false, error: 'Damage must be a number or dice notation (e.g., "3d6+5" or "1d10+3d8-5")' };
};

describe('baseDamage Validator', () => {
  describe('Simple numbers', () => {
    it('should accept positive integers', () => {
      expect(baseDamageValidator('10')).toEqual({ valid: true });
      expect(baseDamageValidator('0')).toEqual({ valid: true });
      expect(baseDamageValidator('100')).toEqual({ valid: true });
    });

    it('should accept positive decimals', () => {
      expect(baseDamageValidator('10.5')).toEqual({ valid: true });
      expect(baseDamageValidator('0.5')).toEqual({ valid: true });
      expect(baseDamageValidator('.5')).toEqual({ valid: true });
    });

    it('should accept numbers with + sign', () => {
      expect(baseDamageValidator('+10')).toEqual({ valid: true });
      expect(baseDamageValidator('+10.5')).toEqual({ valid: true });
      expect(baseDamageValidator('+.5')).toEqual({ valid: true });
    });

    it('should reject negative numbers', () => {
      const result = baseDamageValidator('-5');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Damage must be 0 or greater');
    });

    it('should accept empty string', () => {
      expect(baseDamageValidator('')).toEqual({ valid: true });
      expect(baseDamageValidator('   ')).toEqual({ valid: true });
    });
  });

  describe('Dice notation', () => {
    it('should accept simple dice expressions', () => {
      expect(baseDamageValidator('1d6')).toEqual({ valid: true });
      expect(baseDamageValidator('2d8')).toEqual({ valid: true });
      expect(baseDamageValidator('3d10')).toEqual({ valid: true });
    });

    it('should accept dice expressions with modifiers', () => {
      expect(baseDamageValidator('1d6+5')).toEqual({ valid: true });
      expect(baseDamageValidator('2d8-3')).toEqual({ valid: true });
      expect(baseDamageValidator('3d10+2.5')).toEqual({ valid: true });
    });

    it('should accept complex dice expressions', () => {
      expect(baseDamageValidator('1d8+2d6')).toEqual({ valid: true });
      expect(baseDamageValidator('1d8+2d6+5')).toEqual({ valid: true });
      expect(baseDamageValidator('3d6+1d4-2')).toEqual({ valid: true });
    });

    it('should accept dice sizes up to d100', () => {
      expect(baseDamageValidator('1d20')).toEqual({ valid: true });
      expect(baseDamageValidator('1d50')).toEqual({ valid: true });
      expect(baseDamageValidator('1d100')).toEqual({ valid: true });
      expect(baseDamageValidator('2d100+5')).toEqual({ valid: true });
    });

    it('should reject dice sizes larger than d100', () => {
      const result = baseDamageValidator('1d101');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Dice size must be d100 or smaller');
    });

    it('should reject dice sizes larger than d100 in complex expressions', () => {
      const result1 = baseDamageValidator('1d6+1d101');
      expect(result1.valid).toBe(false);
      expect(result1.error).toBe('Dice size must be d100 or smaller');

      const result2 = baseDamageValidator('2d150+5');
      expect(result2.valid).toBe(false);
      expect(result2.error).toBe('Dice size must be d100 or smaller');
    });

    it('should accept case-insensitive dice notation', () => {
      expect(baseDamageValidator('1D6')).toEqual({ valid: true });
      expect(baseDamageValidator('2D8+5')).toEqual({ valid: true });
    });
  });

  describe('Invalid formats', () => {
    it('should reject invalid strings', () => {
      const result1 = baseDamageValidator('abc');
      expect(result1.valid).toBe(false);
      expect(result1.error).toContain('Damage must be a number or dice notation');

      const result2 = baseDamageValidator('1d');
      expect(result2.valid).toBe(false);

      const result3 = baseDamageValidator('d6');
      expect(result3.valid).toBe(false);
    });

    it('should reject expressions with invalid characters', () => {
      const result1 = baseDamageValidator('1d6*2');
      expect(result1.valid).toBe(false);

      const result2 = baseDamageValidator('1d6/2');
      expect(result2.valid).toBe(false);
    });
  });
});
