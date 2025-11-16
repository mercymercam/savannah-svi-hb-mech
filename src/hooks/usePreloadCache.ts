import { useEffect, useRef } from 'react';
import { InputGroupValues } from '@/components/input-group';
import { parseDamageString, isDiceExpression } from '@/utilities/dice';
import { getDefaultValues } from '@/lib/presets';
import { getCachedResult, setCachedResult, type CacheKey } from '@/utilities/calculation-cache';
import { useWorkerCalculator } from './useWorkerCalculator';

interface UsePreloadCacheOptions {
  values: InputGroupValues;
  enabled?: boolean;
  proximityThreshold?: number; // Distance in pixels to trigger preload (default: 384px ≈ 4 inches at 96 DPI)
}

/**
 * Generate a unique key for tracking preload operations
 */
function generatePreloadKey(
  values: InputGroupValues,
  hasAdvantage: boolean,
  viewMode: 'relative' | 'absolute'
): string {
  return `${values.partyLevel}|${values.monsterAC}|${values.toHitBonus}|${values.baseDamage}|${hasAdvantage}|${viewMode}`;
}

/**
 * Calculate distance from mouse to element
 */
function getDistanceToElement(mouseX: number, mouseY: number, rect: DOMRect): number {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  
  return Math.sqrt(
    Math.pow(mouseX - centerX, 2) + Math.pow(mouseY - centerY, 2)
  );
}

/**
 * Hook to preload cache when mouse approaches toggle switches.
 * Monitors mouse position and preloads the alternate state before user clicks.
 */
export function usePreloadCache({
  values,
  enabled = true,
  proximityThreshold = 384, // ~4 inches at 96 DPI
}: UsePreloadCacheOptions) {
  const { calculate } = useWorkerCalculator({ enabled: true });
  const preloadInProgressRef = useRef<Set<string>>(new Set());
  const hasAdvantageElementRef = useRef<HTMLElement | null>(null);
  const viewModeElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Find the switch elements
    const hasAdvantageSwitch = document.getElementById('has-advantage');
    const viewModeSwitch = document.getElementById('view-mode');

    if (hasAdvantageSwitch) {
      hasAdvantageElementRef.current = hasAdvantageSwitch;
    }
    if (viewModeSwitch) {
      viewModeElementRef.current = viewModeSwitch;
    }

    /**
     * Preload cache for alternate hasAdvantage state
     */
    async function preloadAlternateAdvantage(
      currentValues: InputGroupValues,
      alternateAdvantage: boolean
    ) {
    const preloadKey = generatePreloadKey(currentValues, alternateAdvantage, currentValues.viewMode);
    
    // Skip if already preloading or preloaded
    if (preloadInProgressRef.current.has(preloadKey)) {
      return;
    }

    // Parse and validate inputs
    const defaults = getDefaultValues(
      currentValues.partyLevel,
      currentValues.monsterAC,
      currentValues.baseDamage,
      currentValues.toHitBonus
    );

    const partyLevel = currentValues.partyLevel ? parseInt(currentValues.partyLevel, 10) : parseInt(defaults.partyLevel, 10);
    const monsterAC = currentValues.monsterAC ? parseInt(currentValues.monsterAC, 10) : parseInt(defaults.monsterAC, 10);
    const toHitBonus = currentValues.toHitBonus ? parseInt(currentValues.toHitBonus, 10) : parseInt(defaults.toHitBonus, 10);
    const baseDamageString = currentValues.baseDamage || defaults.baseDamage;
    const parsedDamage = parseDamageString(baseDamageString);

    if (parsedDamage === null) {
      return; // Invalid input, skip preload
    }

    const consideringCrits = isDiceExpression(baseDamageString);

    // Check if already cached
    const cacheKey: CacheKey = {
      partyLevel,
      monsterAC,
      toHitBonus,
      baseDamage: baseDamageString,
      hasAdvantage: alternateAdvantage,
      viewMode: currentValues.viewMode,
    };

    if (getCachedResult(cacheKey)) {
      return; // Already cached
    }

    // Mark as in progress
    preloadInProgressRef.current.add(preloadKey);

    try {
      const proficiencyBonus = Math.ceil(partyLevel / 4) + 1;

      // Calculate using worker
      const calculationResult = await calculate(
        partyLevel,
        monsterAC,
        toHitBonus,
        baseDamageString,
        alternateAdvantage,
        consideringCrits,
        currentValues.viewMode
      );

      const allStats = calculationResult.results;

      // Generate cache data
      const rows = [];
      const boxPlotData = [];
      const boxPlotColors = [];
      const categories = [];

      for (let numD4s = 1; numD4s <= proficiencyBonus; numD4s++) {
        const stats = allStats[numD4s - 1];
        const isValidStats = Array.isArray(stats)
          && stats.length === 5
          && stats.every((v, i, arr) => typeof v === 'number' && Number.isFinite(v) && (i === 0 || v >= arr[i - 1]));

        if (!isValidStats) {
          console.error(`Preload: Invalid stats for ${numD4s}d4`);
          continue;
        }

        const [p5, q1, median, q3, p95] = stats;

        rows.push({ d4Count: numD4s, p5, q1, median, q3, p95 });
        boxPlotData.push([p5, q1, median, q3, p95]);
        
        const isPositive = median >= 0;
        boxPlotColors.push(isPositive ? '#22c55e' : '#ef4444');
        
        categories.push(`${numD4s}d4`);
      }

      // Store in cache
      setCachedResult(cacheKey, {
        rows,
        categories,
        boxPlotData,
        boxPlotColors,
        enableBoxPlot: true,
        consideringCrits,
      });

      console.log(`🚀 Preloaded cache for hasAdvantage=${alternateAdvantage} (${calculationResult.timing.toFixed(2)}ms)`);
    } catch (error) {
      console.error('Error preloading advantage cache:', error);
    } finally {
      preloadInProgressRef.current.delete(preloadKey);
    }
  }

  /**
   * Preload cache for alternate viewMode state
   */
  async function preloadAlternateViewMode(
    currentValues: InputGroupValues,
    alternateViewMode: 'relative' | 'absolute'
  ) {
    const preloadKey = generatePreloadKey(currentValues, currentValues.hasAdvantage, alternateViewMode);
    
    // Skip if already preloading or preloaded
    if (preloadInProgressRef.current.has(preloadKey)) {
      return;
    }

    // Parse and validate inputs
    const defaults = getDefaultValues(
      currentValues.partyLevel,
      currentValues.monsterAC,
      currentValues.baseDamage,
      currentValues.toHitBonus
    );

    const partyLevel = currentValues.partyLevel ? parseInt(currentValues.partyLevel, 10) : parseInt(defaults.partyLevel, 10);
    const monsterAC = currentValues.monsterAC ? parseInt(currentValues.monsterAC, 10) : parseInt(defaults.monsterAC, 10);
    const toHitBonus = currentValues.toHitBonus ? parseInt(currentValues.toHitBonus, 10) : parseInt(defaults.toHitBonus, 10);
    const baseDamageString = currentValues.baseDamage || defaults.baseDamage;
    const parsedDamage = parseDamageString(baseDamageString);

    if (parsedDamage === null) {
      return; // Invalid input, skip preload
    }

    const consideringCrits = isDiceExpression(baseDamageString);

    // Check if already cached
    const cacheKey: CacheKey = {
      partyLevel,
      monsterAC,
      toHitBonus,
      baseDamage: baseDamageString,
      hasAdvantage: currentValues.hasAdvantage,
      viewMode: alternateViewMode,
    };

    if (getCachedResult(cacheKey)) {
      return; // Already cached
    }

    // Mark as in progress
    preloadInProgressRef.current.add(preloadKey);

    try {
      const proficiencyBonus = Math.ceil(partyLevel / 4) + 1;

      // Calculate using worker
      const calculationResult = await calculate(
        partyLevel,
        monsterAC,
        toHitBonus,
        baseDamageString,
        currentValues.hasAdvantage,
        consideringCrits,
        alternateViewMode
      );

      const allStats = calculationResult.results;

      // Generate cache data
      const rows = [];
      const boxPlotData = [];
      const boxPlotColors = [];
      const categories = [];

      for (let numD4s = 1; numD4s <= proficiencyBonus; numD4s++) {
        const stats = allStats[numD4s - 1];
        const isValidStats = Array.isArray(stats)
          && stats.length === 5
          && stats.every((v, i, arr) => typeof v === 'number' && Number.isFinite(v) && (i === 0 || v >= arr[i - 1]));

        if (!isValidStats) {
          console.error(`Preload: Invalid stats for ${numD4s}d4`);
          continue;
        }

        const [p5, q1, median, q3, p95] = stats;

        rows.push({ d4Count: numD4s, p5, q1, median, q3, p95 });
        boxPlotData.push([p5, q1, median, q3, p95]);
        
        const isPositive = median >= 0;
        boxPlotColors.push(isPositive ? '#22c55e' : '#ef4444');
        
        categories.push(`${numD4s}d4`);
      }

      // Store in cache
      setCachedResult(cacheKey, {
        rows,
        categories,
        boxPlotData,
        boxPlotColors,
        enableBoxPlot: true,
        consideringCrits,
      });

      console.log(`🚀 Preloaded cache for viewMode=${alternateViewMode} (${calculationResult.timing.toFixed(2)}ms)`);
    } catch (error) {
      console.error('Error preloading view mode cache:', error);
    } finally {
      preloadInProgressRef.current.delete(preloadKey);
    }
  }

    const handleMouseMove = (e: MouseEvent) => {
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      // Check proximity to Has Advantage switch
      if (hasAdvantageElementRef.current) {
        const rect = hasAdvantageElementRef.current.getBoundingClientRect();
        const distance = getDistanceToElement(mouseX, mouseY, rect);

        if (distance < proximityThreshold) {
          preloadAlternateAdvantage(values, !values.hasAdvantage);
        }
      }

      // Check proximity to View Mode switch
      if (viewModeElementRef.current) {
        const rect = viewModeElementRef.current.getBoundingClientRect();
        const distance = getDistanceToElement(mouseX, mouseY, rect);

        if (distance < proximityThreshold) {
          const alternateViewMode = values.viewMode === 'absolute' ? 'relative' : 'absolute';
          preloadAlternateViewMode(values, alternateViewMode);
        }
      }
    };

    // Throttle mousemove events to avoid excessive calculations
    let throttleTimeout: number | null = null;
    const throttledMouseMove = (e: MouseEvent) => {
      if (throttleTimeout) return;
      
      throttleTimeout = window.setTimeout(() => {
        handleMouseMove(e);
        throttleTimeout = null;
      }, 250); // Check every 250ms
    };

    document.addEventListener('mousemove', throttledMouseMove);

    return () => {
      document.removeEventListener('mousemove', throttledMouseMove);
      if (throttleTimeout) {
        window.clearTimeout(throttleTimeout);
      }
    };
  }, [
    enabled,
    values,
    proximityThreshold,
    calculate,
  ]);
}
