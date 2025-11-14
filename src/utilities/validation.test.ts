import { describe, it, expect } from 'vitest';
import { calculateDamageStats, simulateDamageStats } from './utilities';

/**
 * Validation tests to compare the direct probability calculation (calculateDirectlyDamageStats)
 * against Monte Carlo simulation (simulateDamageStats).
 * 
 * These tests ensure that the mathematical approach matches the empirical results within
 * acceptable error margins.
 */

interface TestCase {
  name: string;
  numD4s: number;
  partyLevel: number;
  monsterAC: number;
  toHitBonus: number;
  baseDamage: string | number;
  hasAdvantage?: boolean;
}

/**
 * Calculate the acceptable margin of error based on simulation size.
 * For 100k iterations, we account for:
 * - Discrete nature of damage values (especially at Q1/Q3 boundaries)
 * - Percentile calculation rounding effects
 * - Monte Carlo variance at the tails of the distribution
 * - Edge cases where the percentile falls between discrete damage values
 * 
 * A margin of 6.5 allows for reasonable variance while catching actual errors.
 */
const MARGIN_OF_ERROR = 6.5;
const SIMULATION_ITERATIONS = 100000;

/**
 * Compare two arrays of percentiles within margin of error
 */
const expectPercentilesMatch = (
  calculated: number[],
  simulated: number[],
  margin: number = MARGIN_OF_ERROR
) => {
  expect(calculated).toHaveLength(5);
  expect(simulated).toHaveLength(5);
  
  const percentileNames = ['P5', 'Q1', 'Median', 'Q3', 'P95'];
  
  for (let i = 0; i < 5; i++) {
    const diff = Math.abs(calculated[i] - simulated[i]);
    expect(
      diff,
      `${percentileNames[i]}: Expected ${calculated[i]} to be within ${margin} of ${simulated[i]} (diff: ${diff})`
    ).toBeLessThanOrEqual(margin);
  }
};

describe('Validation: Direct Calculation vs Simulation', () => {
  // Test cases covering various scenarios
  const testCases: TestCase[] = [
    // Basic scenarios with flat damage
    {
      name: 'Low level, low AC, flat damage',
      numD4s: 1,
      partyLevel: 1,
      monsterAC: 12,
      toHitBonus: 3,
      baseDamage: 8,
    },
    {
      name: 'Mid level, mid AC, flat damage',
      numD4s: 3,
      partyLevel: 10,
      monsterAC: 16,
      toHitBonus: 5,
      baseDamage: 15,
    },
    {
      name: 'High level, high AC, flat damage',
      numD4s: 6,
      partyLevel: 20,
      monsterAC: 22,
      toHitBonus: 8,
      baseDamage: 25,
    },
    
    // Scenarios with simple dice rolls
    {
      name: 'Low level with 1d8 damage',
      numD4s: 1,
      partyLevel: 3,
      monsterAC: 13,
      toHitBonus: 4,
      baseDamage: '1d8',
    },
    {
      name: 'Mid level with 2d6 damage',
      numD4s: 2,
      partyLevel: 8,
      monsterAC: 15,
      toHitBonus: 4,
      baseDamage: '2d6',
    },
    {
      name: 'High level with 3d10 damage',
      numD4s: 4,
      partyLevel: 15,
      monsterAC: 19,
      toHitBonus: 6,
      baseDamage: '3d10',
    },
    
    // Complex dice expressions
    {
      name: 'Complex: 1d8+5 damage',
      numD4s: 2,
      partyLevel: 5,
      monsterAC: 14,
      toHitBonus: 3,
      baseDamage: '1d8+5',
    },
    {
      name: 'Complex: 2d6+3 damage',
      numD4s: 3,
      partyLevel: 9,
      monsterAC: 17,
      toHitBonus: 5,
      baseDamage: '2d6+3',
    },
    {
      name: 'Complex: 1d10+1d6+4 damage',
      numD4s: 3,
      partyLevel: 11,
      monsterAC: 18,
      toHitBonus: 6,
      baseDamage: '1d10+1d6+4',
    },
    
    // Edge cases
    {
      name: 'Zero d4s (baseline)',
      numD4s: 0,
      partyLevel: 5,
      monsterAC: 15,
      toHitBonus: 4,
      baseDamage: '2d6+3',
    },
    {
      name: 'Very high to-hit bonus',
      numD4s: 2,
      partyLevel: 10,
      monsterAC: 14,
      toHitBonus: 10,
      baseDamage: '2d8+5',
    },
    {
      name: 'Low to-hit bonus vs high AC',
      numD4s: 3,
      partyLevel: 6,
      monsterAC: 20,
      toHitBonus: 1,
      baseDamage: '1d6+2',
    },
    {
      name: 'Max d4s beyond proficiency',
      numD4s: 10,
      partyLevel: 8,
      monsterAC: 16,
      toHitBonus: 4,
      baseDamage: '2d6+4',
    },
  ];

  // Run tests for each scenario
  testCases.forEach((testCase) => {
    it(`should match simulation: ${testCase.name}`, () => {
      const { numD4s, partyLevel, monsterAC, toHitBonus, baseDamage, hasAdvantage = false } = testCase;
      
      // Calculate using direct probability method
      const calculated = calculateDamageStats(
        numD4s,
        partyLevel,
        monsterAC,
        toHitBonus,
        baseDamage,
        hasAdvantage
      );
      
      // Calculate using simulation
      const simulated = simulateDamageStats(
        numD4s,
        partyLevel,
        monsterAC,
        toHitBonus,
        typeof baseDamage === 'string' ? baseDamage : baseDamage.toString(),
        hasAdvantage,
        SIMULATION_ITERATIONS
      );
      
      expect(simulated).not.toBeNull();
      expectPercentilesMatch(calculated, simulated!);
    });
  });

  // Test with advantage
  describe('With Advantage', () => {
    const advantageTestCases: TestCase[] = [
      {
        name: 'Low level with advantage, flat damage',
        numD4s: 1,
        partyLevel: 3,
        monsterAC: 14,
        toHitBonus: 3,
        baseDamage: 10,
        hasAdvantage: true,
      },
      {
        name: 'Mid level with advantage, 2d6+3',
        numD4s: 2,
        partyLevel: 9,
        monsterAC: 17,
        toHitBonus: 5,
        baseDamage: '2d6+3',
        hasAdvantage: true,
      },
      {
        name: 'High level with advantage, 3d8+5',
        numD4s: 4,
        partyLevel: 16,
        monsterAC: 20,
        toHitBonus: 7,
        baseDamage: '3d8+5',
        hasAdvantage: true,
      },
    ];

    advantageTestCases.forEach((testCase) => {
      it(`should match simulation: ${testCase.name}`, () => {
        const { numD4s, partyLevel, monsterAC, toHitBonus, baseDamage, hasAdvantage = false } = testCase;
        
        const calculated = calculateDamageStats(
          numD4s,
          partyLevel,
          monsterAC,
          toHitBonus,
          baseDamage,
          hasAdvantage
        );
        
        const simulated = simulateDamageStats(
          numD4s,
          partyLevel,
          monsterAC,
          toHitBonus,
          typeof baseDamage === 'string' ? baseDamage : baseDamage.toString(),
          hasAdvantage,
          SIMULATION_ITERATIONS
        );
        
        expect(simulated).not.toBeNull();
        expectPercentilesMatch(calculated, simulated!);
      });
    });
  });

  // Stress test with multiple d4 counts for same base scenario
  describe('Varying d4 counts', () => {
    const baseScenario = {
      partyLevel: 10,
      monsterAC: 16,
      toHitBonus: 5,
      baseDamage: '2d6+4',
    };

    [0, 1, 2, 3, 4, 5].forEach((numD4s) => {
      it(`should match simulation with ${numD4s} d4s`, () => {
        const calculated = calculateDamageStats(
          numD4s,
          baseScenario.partyLevel,
          baseScenario.monsterAC,
          baseScenario.toHitBonus,
          baseScenario.baseDamage,
          false
        );
        
        const simulated = simulateDamageStats(
          numD4s,
          baseScenario.partyLevel,
          baseScenario.monsterAC,
          baseScenario.toHitBonus,
          baseScenario.baseDamage,
          false,
          SIMULATION_ITERATIONS
        );
        
        expect(simulated).not.toBeNull();
        expectPercentilesMatch(calculated, simulated!);
      });
    });
  });

  // Test different AC values with same setup
  describe('Varying AC values', () => {
    const baseScenario = {
      numD4s: 3,
      partyLevel: 8,
      toHitBonus: 4,
      baseDamage: '2d6+3',
    };

    [12, 14, 16, 18, 20].forEach((monsterAC) => {
      it(`should match simulation with AC ${monsterAC}`, () => {
        const calculated = calculateDamageStats(
          baseScenario.numD4s,
          baseScenario.partyLevel,
          monsterAC,
          baseScenario.toHitBonus,
          baseScenario.baseDamage,
          false
        );
        
        const simulated = simulateDamageStats(
          baseScenario.numD4s,
          baseScenario.partyLevel,
          monsterAC,
          baseScenario.toHitBonus,
          baseScenario.baseDamage,
          false,
          SIMULATION_ITERATIONS
        );
        
        expect(simulated).not.toBeNull();
        expectPercentilesMatch(calculated, simulated!);
      });
    });
  });
});
