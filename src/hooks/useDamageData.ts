import { useMemo, useRef } from 'react';
import { InputGroupValues } from '@/components/input-group';
import { calculateDamageStats } from '@/utilities/utilities';
import { parseDamageString } from '@/utilities/dice';


/**
 * Check if a damage string is a simple number (not dice notation).
 * 
 * @param damageString - The damage string to check
 * @returns True if the string is a simple number, false otherwise
 */
const isSimpleNumber = (damageString: string): boolean => {
  const trimmed = damageString.trim();
  if (!trimmed) return true; // Empty string is considered simple
  
  const simpleNumber = parseFloat(trimmed);
  return !isNaN(simpleNumber) && simpleNumber.toString() === trimmed;
};

export interface DamageDataRow {
  d4Count: number;
  p5: number;
  q1: number;
  median: number;
  q3: number;
  p95: number;
}

export interface UseDamageDataResult {
  /** Raw damage data for table consumption */
  rows: DamageDataRow[];
  /** Categories for chart x-axis */
  categories: string[];
  /** Box plot data for echarts - array of [p5, q1, median, q3, p95] */
  boxPlotData: number[][];
  /** Colors for each box plot - green if median >= 0, red otherwise */
  boxPlotColors: string[];
  /** Whether box plot view is enabled (true if baseDamage is a simple number) */
  enableBoxPlot: boolean;
}

/**
 * Custom hook to calculate damage statistics for all d4 penalty options.
 * Provides data in formats ready for both table and chart consumption.
 * 
 * @param values - Form input values
 * @returns Damage data in multiple formats for different consumers
 */
export const useDamageData = (values: InputGroupValues): UseDamageDataResult => {
  const previousValidDamageRef = useRef<number>(8.5);
  
  const result = useMemo(() => {
    const partyLevel = parseInt(values.partyLevel, 10) || 1;
    const monsterAC = parseInt(values.monsterAC, 10) || 13;
    const toHitBonus = parseInt(values.toHitBonus, 10) || 0;
    
    // Check if baseDamage is a simple number
    const enableBoxPlot = isSimpleNumber(values.baseDamage) || values === undefined || values.baseDamage.trim() === '';
    
    // Parse base damage (handles both simple numbers and dice notation)
    const parsedDamage = parseDamageString(values.baseDamage);
    const baseDamage = parsedDamage !== null ? parsedDamage : previousValidDamageRef.current;
    
    // Update the previous valid damage if we have a valid parse
    if (parsedDamage !== null) {
      previousValidDamageRef.current = parsedDamage;
    }

    // Calculate proficiency bonus
    const proficiencyBonus = Math.ceil(partyLevel / 4) + 1;

    // Generate data for 1 to proficiencyBonus d4s
    const rows: DamageDataRow[] = [];
    const boxPlotData: number[][] = [];
    const boxPlotColors: string[] = [];
    const categories: string[] = [];

    for (let numD4s = 1; numD4s <= proficiencyBonus; numD4s++) {
      const stats = calculateDamageStats(
        numD4s,
        partyLevel,
        monsterAC,
        toHitBonus,
        baseDamage,
        values.hasAdvantage
      );

      // Add to table data
      rows.push({
        d4Count: numD4s,
        p5: stats[0],
        q1: stats[1],
        median: stats[2],
        q3: stats[3],
        p95: stats[4],
      });

      // Add to chart data
      boxPlotData.push(stats);
      // Determine color based on median (index 2)
      boxPlotColors.push(stats[2] >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)');
      categories.push(`${numD4s}d4`);
    }

    return { rows, boxPlotData, boxPlotColors, categories, enableBoxPlot };
  }, [values]);

  return result;
};
