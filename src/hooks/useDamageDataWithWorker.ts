import { useState, useEffect, useRef } from 'react';
import { InputGroupValues } from '@/components/input-group';
import { parseDamageString, isDiceExpression } from '@/utilities/dice';
import { getDefaultValues } from '@/lib/presets';
import { useWorkerCalculator } from './useWorkerCalculator';

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
  /** Whether the calculation is in progress */
  isLoading: boolean;
  /** Whether the worker was used for the calculation */
  usedWorker: boolean;
}

/**
 * Custom hook to calculate damage statistics using Web Worker when available.
 * Provides loading state and automatic fallback to main thread.
 * 
 * @param values - Form input values
 * @returns Damage data in multiple formats for different consumers, plus loading state
 */
export const useDamageDataWithWorker = (values: InputGroupValues): UseDamageDataResult => {
  const previousValidDamageRef = useRef<number>(8.5);
  const [isLoading, setIsLoading] = useState(false);
  const [usedWorker, setUsedWorker] = useState(false);
  const [result, setResult] = useState<Omit<UseDamageDataResult, 'isLoading' | 'usedWorker'>>({
    rows: [],
    categories: [],
    boxPlotData: [],
    boxPlotColors: [],
    enableBoxPlot: true,
    consideringCrits: false,
    viewMode: 'relative',
  });

  const { calculate } = useWorkerCalculator({ enabled: true });
  const showDelayTimerRef = useRef<number | null>(null);
  const minDisplayTimerRef = useRef<number | null>(null);
  const calculationStartTimeRef = useRef<number>(0);

  useEffect(() => {
    const calculateData = async () => {
      // Clear any existing timers
      if (showDelayTimerRef.current !== null) {
        window.clearTimeout(showDelayTimerRef.current);
        showDelayTimerRef.current = null;
      }
      if (minDisplayTimerRef.current !== null) {
        window.clearTimeout(minDisplayTimerRef.current);
        minDisplayTimerRef.current = null;
      }

      // Track when calculation started
      calculationStartTimeRef.current = performance.now();
      let loadingShown = false;

      // Show loading indicator only if calculation takes longer than 500ms
      showDelayTimerRef.current = window.setTimeout(() => {
        setIsLoading(true);
        loadingShown = true;
      }, 500);

      try {
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
        const enableBoxPlot = true;
        
        // Parse base damage (handles both simple numbers and dice notation)
        const parsedDamage = parseDamageString(baseDamageString);
        const baseDamage = parsedDamage !== null ? baseDamageString : previousValidDamageRef.current;
        
        // Update the previous valid damage if we have a valid parse
        if (parsedDamage !== null) {
          previousValidDamageRef.current = parsedDamage;
        }

        // Calculate proficiency bonus
        const proficiencyBonus = Math.ceil(partyLevel / 4) + 1;

        // Use worker calculation
        const calculationResult = await calculate(
          partyLevel,
          monsterAC,
          toHitBonus,
          typeof baseDamage === 'string' ? baseDamage : String(baseDamage),
          values.hasAdvantage,
          consideringCrits,
          values.viewMode
        );

        const allStats = calculationResult.results;
        setUsedWorker(calculationResult.usedWorker);

        console.log(`⚡ ${calculationResult.usedWorker ? 'Worker' : 'Main thread'} calculated ${proficiencyBonus} d4 options with ${baseDamage} in ${calculationResult.timing.toFixed(2)}ms`);

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
            continue;
          }

          const [p5, q1, median, q3, p95] = stats;

          rows.push({ d4Count: numD4s, p5, q1, median, q3, p95 });
          boxPlotData.push([p5, q1, median, q3, p95]);
          
          // Color based on median value
          const isPositive = median >= 0;
          boxPlotColors.push(isPositive ? '#22c55e' : '#ef4444');
          
          categories.push(`${numD4s}d4`);
        }

        setResult({
          rows,
          categories,
          boxPlotData,
          boxPlotColors,
          enableBoxPlot,
          consideringCrits,
          viewMode: values.viewMode,
        });
      } catch (error) {
        console.error('Error calculating damage data:', error);
      } finally {
        // Cancel the show delay timer if calculation finished before 500ms
        if (showDelayTimerRef.current !== null) {
          window.clearTimeout(showDelayTimerRef.current);
          showDelayTimerRef.current = null;
        }

        // If loading was shown, ensure it stays visible for at least 500ms total
        if (loadingShown) {
          const elapsed = performance.now() - calculationStartTimeRef.current;
          const remainingTime = Math.max(0, 1000 - elapsed); // Show for at least 1s after it appears
          
          minDisplayTimerRef.current = window.setTimeout(() => {
            setIsLoading(false);
            minDisplayTimerRef.current = null;
          }, remainingTime);
        } else {
          // Calculation finished before loading was shown, don't show it at all
          setIsLoading(false);
        }
      }
    };

    calculateData();

    // Cleanup function
    return () => {
      if (showDelayTimerRef.current !== null) {
        window.clearTimeout(showDelayTimerRef.current);
      }
      if (minDisplayTimerRef.current !== null) {
        window.clearTimeout(minDisplayTimerRef.current);
      }
    };
  }, [
    values.monsterAC,
    values.partyLevel,
    values.baseDamage,
    values.toHitBonus,
    values.hasAdvantage,
    values.viewMode,
    calculate,
  ]);

  return {
    ...result,
    isLoading,
    usedWorker,
  };
};
