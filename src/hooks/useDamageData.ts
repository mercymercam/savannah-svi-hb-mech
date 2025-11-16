import { useRef, useMemo } from 'react';
import { InputGroupValues } from '@/components/input-group';
import { calculateBatchDamageStats } from '@/utilities/batch-calculator';
import { parseDamageString, isDiceExpression } from '@/utilities/dice';
import { getDefaultValues } from '@/lib/presets';
import { getCachedResult, setCachedResult, type CacheKey } from '@/utilities/calculation-cache';

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
  /** Whether critical hits are being considered in the calculation */
  consideringCrits: boolean;
  /** The current view mode: 'relative' (delta) or 'absolute' (total damage) */
  viewMode: 'relative' | 'absolute';
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
  
  return useMemo(() => {
    // Get the default values based on the preset logic
    const defaults = getDefaultValues(values.partyLevel, values.monsterAC, values.baseDamage, values.toHitBonus);
    
    // Use the actual value if provided, otherwise use the preset default
    const partyLevel = values.partyLevel ? parseInt(values.partyLevel, 10) : parseInt(defaults.partyLevel, 10);
    const monsterAC = values.monsterAC ? parseInt(values.monsterAC, 10) : parseInt(defaults.monsterAC, 10);
    const toHitBonus = values.toHitBonus ? parseInt(values.toHitBonus, 10) : parseInt(defaults.toHitBonus, 10);
    
    // For baseDamage, use the actual value if provided, otherwise use the preset default
    const baseDamageString = values.baseDamage || defaults.baseDamage;
    
    // Check if we're considering crits (dice expressions only)
    const consideringCrits = isDiceExpression(baseDamageString);
    
    // Check if baseDamage is a simple number
    const enableBoxPlot = true; //isSimpleNumber(baseDamageString);
    
    // Parse base damage (handles both simple numbers and dice notation)
    const parsedDamage = parseDamageString(baseDamageString);
    const baseDamage = parsedDamage !== null ? baseDamageString : previousValidDamageRef.current;
    
    // Update the previous valid damage if we have a valid parse
    if (parsedDamage !== null) {
      previousValidDamageRef.current = parsedDamage;
    }

    // Calculate proficiency bonus
    const proficiencyBonus = Math.ceil(partyLevel / 4) + 1;

    // Create cache key
    const cacheKey: CacheKey = {
      partyLevel,
      monsterAC,
      toHitBonus,
      baseDamage: typeof baseDamage === 'string' ? baseDamage : String(baseDamage),
      hasAdvantage: values.hasAdvantage,
      viewMode: values.viewMode,
    };

    // Check cache first
    const cachedResult = getCachedResult(cacheKey);
    if (cachedResult) {
      // Return cached result immediately
      return {
        rows: cachedResult.rows,
        boxPlotData: cachedResult.boxPlotData,
        boxPlotColors: cachedResult.boxPlotColors,
        categories: cachedResult.categories,
        enableBoxPlot: cachedResult.enableBoxPlot,
        consideringCrits: cachedResult.consideringCrits,
        viewMode: values.viewMode,
      };
    }

    // Use batch calculation for all d4 counts at once - much more efficient!
    const start = performance.now();
    const allStats = calculateBatchDamageStats(
      partyLevel,
      monsterAC,
      toHitBonus,
      typeof baseDamage === 'string' ? baseDamage : String(baseDamage),
      values.hasAdvantage,
      consideringCrits,
      values.viewMode
    );
    const elapsed = performance.now() - start;
    console.log(`⚡ Batch calculated ${proficiencyBonus} d4 options with ${baseDamage} in ${elapsed.toFixed(2)}ms`);

    // Generate data for 1 to proficiencyBonus d4s
    const rows: DamageDataRow[] = [];
    const boxPlotData: number[][] = [];
    const boxPlotColors: string[] = [];
    const categories: string[] = [];

    for (let numD4s = 1; numD4s <= proficiencyBonus; numD4s++) {
      const stats = allStats[numD4s - 1]; // Get pre-calculated stats
      const isValidStats = Array.isArray(stats)
        && stats.length === 5
        && stats.every((v, i, arr) => typeof v === 'number' && Number.isFinite(v) && (i === 0 || v >= arr[i - 1]));

      if (!isValidStats) {
        console.error(`calculateDamageStats returned invalid stats for ${numD4s}d4 — expected 5 numeric values in non-decreasing order, got: ${JSON.stringify(stats)}`);
      }

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
      
      // Determine color based on view mode:
      // In relative mode (delta):
      //   - If median > 0: green (gain)
      //   - If median < 0: red (loss)
      //   - If median = 0: check q1 and q3 for decision
      // In absolute mode:
      //   - Use blue for all (just showing damage, not gain/loss)
      const median = stats[2];
      const q1 = stats[1];
      const q3 = stats[3];
      
      let color: string;
      if (values.viewMode === 'absolute') {
        // In absolute mode, use a consistent blue color
        color = 'rgb(59, 130, 246)'; // blue
      } else {
        // In relative mode, use green/red based on gain/loss
        if (median > 0) {
          color = 'rgb(34, 197, 94)'; // green
        } else if (median < 0) {
          color = 'rgb(239, 68, 68)'; // red
        } else {
          // median === 0
          if (q1 === 0 && q3 === 0) {
            color = 'rgb(34, 197, 94)'; // green (all zeros)
          } else if (q1 === 0) {
            color = q3 >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)';
          } else if (q3 === 0) {
            color = q1 >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)';
          } else {
            // Both q1 and q3 are non-zero, compare absolute values
            const absQ1 = Math.abs(q1);
            const absQ3 = Math.abs(q3);
            if (absQ1 > absQ3) {
              color = q1 >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)';
            } else {
              color = q3 >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)';
            }
          }
        }
      }
      
      boxPlotColors.push(color);
      categories.push(`${numD4s}d4`);
    }

    const result = { 
      rows, 
      boxPlotData, 
      boxPlotColors, 
      categories, 
      enableBoxPlot, 
      consideringCrits, 
      viewMode: values.viewMode 
    };

    // Store in cache for instant future access
    setCachedResult(cacheKey, result);

    return result;
  }, [values.partyLevel, values.monsterAC, values.baseDamage, values.toHitBonus, values.hasAdvantage, values.viewMode]);
};
