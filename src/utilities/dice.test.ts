import { describe, it, expect } from 'vitest';
import { isDiceExpression, parseDamageString, extractDiceTokens } from './dice';

describe('isDiceExpression', () => {
  it('should return true for simple dice notation', () => {
    expect(isDiceExpression('1d10')).toBe(true);
    expect(isDiceExpression('2d6')).toBe(true);
    expect(isDiceExpression('3d8')).toBe(true);
  });

  it('should return true for dice notation with modifiers', () => {
    expect(isDiceExpression('1d10+5')).toBe(true);
    expect(isDiceExpression('2d6-3')).toBe(true);
    expect(isDiceExpression('1d8+3+2d4')).toBe(true);
  });

  it('should return true for complex dice expressions', () => {
    expect(isDiceExpression('1d10+3d8-5')).toBe(true);
    expect(isDiceExpression('3d6+1d4+2')).toBe(true);
  });

  it('should return false for simple numbers', () => {
    expect(isDiceExpression('8.5')).toBe(false);
    expect(isDiceExpression('10')).toBe(false);
    expect(isDiceExpression('0')).toBe(false);
    expect(isDiceExpression('15.25')).toBe(false);
  });

  it('should return false for expressions with only numbers', () => {
    expect(isDiceExpression('5+3')).toBe(false);
    expect(isDiceExpression('10-2')).toBe(false);
  });

  it('should handle whitespace', () => {
    expect(isDiceExpression('  1d10+5  ')).toBe(true);
    expect(isDiceExpression('  8.5  ')).toBe(false);
  });

  it('should be case insensitive', () => {
    expect(isDiceExpression('1D10')).toBe(true);
    expect(isDiceExpression('2D6+5')).toBe(true);
  });
});

describe('parseDamageString', () => {
  describe('with simple numbers', () => {
    it('should parse integer values', () => {
      expect(parseDamageString('8')).toBe(8);
      expect(parseDamageString('10')).toBe(10);
      expect(parseDamageString('0')).toBe(0);
    });

    it('should parse decimal values', () => {
      expect(parseDamageString('8.5')).toBe(8.5);
      expect(parseDamageString('10.25')).toBe(10.25);
    });

    it('should handle whitespace', () => {
      expect(parseDamageString('  8.5  ')).toBe(8.5);
    });
  });

  describe('with dice notation', () => {
    it('should calculate average for simple dice', () => {
      // 1d10 average: (1+10)/2 = 5.5
      expect(parseDamageString('1d10')).toBe(5.5);
      // 1d6 average: (1+6)/2 = 3.5
      expect(parseDamageString('1d6')).toBe(3.5);
      // 1d20 average: (1+20)/2 = 10.5
      expect(parseDamageString('1d20')).toBe(10.5);
    });

    it('should handle multiple dice', () => {
      // 2d6 average: 2 * 3.5 = 7
      expect(parseDamageString('2d6')).toBe(7);
      // 3d6 average: 3 * 3.5 = 10.5
      expect(parseDamageString('3d6')).toBe(10.5);
    });

    it('should handle dice with modifiers', () => {
      // 1d10+5 average: 5.5 + 5 = 10.5
      expect(parseDamageString('1d10+5')).toBe(10.5);
      // 2d6-3 average: 7 - 3 = 4
      expect(parseDamageString('2d6-3')).toBe(4);
    });

    it('should handle complex dice expressions', () => {
      // 1d10+3d8+5
      // 1d10 avg: 5.5, 3d8 avg: 13.5, total: 5.5 + 13.5 + 5 = 24
      expect(parseDamageString('1d10+3d8+5')).toBe(24);
    });

    it('should be case insensitive', () => {
      expect(parseDamageString('1D10')).toBe(5.5);
      expect(parseDamageString('2D6+5')).toBe(12);
    });
  });

  describe('with invalid input', () => {
    it('should return null for invalid expressions', () => {
      expect(parseDamageString('abc')).toBe(null);
      expect(parseDamageString('1d')).toBe(null);
      expect(parseDamageString('d10')).toBe(null);
      expect(parseDamageString('1d10+')).toBe(null);
    });
  });
});

describe('extractDiceTokens', () => {
  it('should extract simple dice tokens', () => {
    const tokens = extractDiceTokens('1d10');
    expect(tokens).toHaveLength(1);
    expect(tokens![0]).toEqual({ type: 'dice', op: '+', numDice: 1, diceSize: 10 });
  });

  it('should extract dice with modifiers', () => {
    const tokens = extractDiceTokens('1d10+5');
    expect(tokens).toHaveLength(2);
    expect(tokens![0]).toEqual({ type: 'dice', op: '+', numDice: 1, diceSize: 10 });
    expect(tokens![1]).toEqual({ type: 'number', op: '+', value: 5 });
  });

  it('should extract complex expressions', () => {
    const tokens = extractDiceTokens('2d6+1d4-3');
    expect(tokens).toHaveLength(3);
    expect(tokens![0]).toEqual({ type: 'dice', op: '+', numDice: 2, diceSize: 6 });
    expect(tokens![1]).toEqual({ type: 'dice', op: '+', numDice: 1, diceSize: 4 });
    expect(tokens![2]).toEqual({ type: 'number', op: '-', value: 3 });
  });

  it('should handle leading operators', () => {
    const tokens = extractDiceTokens('+1d10-5');
    expect(tokens).toHaveLength(2);
    expect(tokens![0]).toEqual({ type: 'dice', op: '+', numDice: 1, diceSize: 10 });
    expect(tokens![1]).toEqual({ type: 'number', op: '-', value: 5 });
  });

  it('should extract simple numbers', () => {
    const tokens = extractDiceTokens('8.5');
    expect(tokens).toHaveLength(1);
    expect(tokens![0]).toEqual({ type: 'number', op: '+', value: 8.5 });
  });

  it('should return null for invalid expressions', () => {
    expect(extractDiceTokens('abc')).toBe(null);
    expect(extractDiceTokens('1d')).toBe(null);
    expect(extractDiceTokens('d10')).toBe(null);
  });
});
