import { useState, useEffect, useRef } from 'react';
import { InputGroupValues } from '@/components/input-group';
import { parseDamageString, isDiceExpression } from '@/utilities/dice';
import { getDefaultValues } from '@/lib/presets';
import { useWorkerCalculator } from './useWorkerCalculator';
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
      // Mark the start of the effect
      const effectId = `effect-${Date.now()}`;
      performance.mark(`effect-start-${effectId}`);
      
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
        performance.mark(`effect-parse-start-${effectId}`);
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
        performance.mark(`effect-parse-end-${effectId}`);
        performance.measure(
          `React: Parse Inputs (${effectId})`,
          `effect-parse-start-${effectId}`,
          `effect-parse-end-${effectId}`
        );
        
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

        // Create cache key
        performance.mark(`effect-cache-check-start-${effectId}`);
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
        performance.mark(`effect-cache-check-end-${effectId}`);
        performance.measure(
          `React: Cache Check (${effectId})`,
          `effect-cache-check-start-${effectId}`,
          `effect-cache-check-end-${effectId}`
        );
        
        if (cachedResult) {
          // Clear the show delay timer since we have instant results
          if (showDelayTimerRef.current !== null) {
            window.clearTimeout(showDelayTimerRef.current);
            showDelayTimerRef.current = null;
          }
          
          // Set result immediately from cache
          setResult({
            rows: cachedResult.rows,
            boxPlotData: cachedResult.boxPlotData,
            boxPlotColors: cachedResult.boxPlotColors,
            categories: cachedResult.categories,
            enableBoxPlot: cachedResult.enableBoxPlot,
            consideringCrits: cachedResult.consideringCrits,
            viewMode: values.viewMode,
          });
          setIsLoading(false);
          setUsedWorker(false); // Cache hit, no worker needed
          
          performance.mark(`effect-end-${effectId}`);
          performance.measure(
            `React: Total Effect (CACHE HIT) (${effectId})`,
            `effect-start-${effectId}`,
            `effect-end-${effectId}`
          );
          return;
        }

        // Use worker calculation
        performance.mark(`effect-worker-call-start-${effectId}`);
        const calculationResult = await calculate(
          partyLevel,
          monsterAC,
          toHitBonus,
          typeof baseDamage === 'string' ? baseDamage : String(baseDamage),
          values.hasAdvantage,
          consideringCrits,
          values.viewMode
        );
        performance.mark(`effect-worker-call-end-${effectId}`);
        performance.measure(
          `React: Worker Calculate Call (${effectId})`,
          `effect-worker-call-start-${effectId}`,
          `effect-worker-call-end-${effectId}`
        );

        performance.mark(`effect-process-results-start-${effectId}`);
        const allStats = calculationResult.results;
        setUsedWorker(calculationResult.usedWorker);

        // Create a synthetic performance measure for the worker calculation time
        // (Worker's performance timeline is separate, so we manually record it here)
        if (calculationResult.usedWorker && calculationResult.timing > 0) {
          // Record the worker timing as a measure on the main thread
          // We'll use dummy marks and set them to create the right duration
          const now = performance.now();
          const workerStartTime = now - calculationResult.timing;
          
          performance.measure(
            `Worker: Calculation (from worker)`,
            { start: workerStartTime, duration: calculationResult.timing }
          );
        }

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

        const resultData = {
          rows,
          categories,
          boxPlotData,
          boxPlotColors,
          enableBoxPlot,
          consideringCrits,
          viewMode: values.viewMode,
        };

        setResult(resultData);

        // Store in cache for instant future access
        setCachedResult(cacheKey, resultData);
        
        performance.mark(`effect-process-results-end-${effectId}`);
        performance.measure(
          `React: Process & Set Results (${effectId})`,
          `effect-process-results-start-${effectId}`,
          `effect-process-results-end-${effectId}`
        );
        
        performance.mark(`effect-end-${effectId}`);
        performance.measure(
          `React: Total Effect (WORKER) (${effectId})`,
          `effect-start-${effectId}`,
          `effect-end-${effectId}`
        );
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
