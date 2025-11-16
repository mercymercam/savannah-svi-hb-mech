import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCachedResult,
  setCachedResult,
  clearCache,
  getCacheStats,
  type CacheKey,
  type CacheValue,
} from './calculation-cache';

describe('calculation-cache', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    clearCache();
  });

  const mockParams: CacheKey = {
    partyLevel: 5,
    monsterAC: 15,
    toHitBonus: 5,
    baseDamage: '1d8+3',
    hasAdvantage: false,
    viewMode: 'relative',
  };

  const mockValue: Omit<CacheValue, 'timestamp'> = {
    rows: [
      { d4Count: 1, p5: 5, q1: 7, median: 9, q3: 11, p95: 13 },
      { d4Count: 2, p5: 6, q1: 8, median: 10, q3: 12, p95: 14 },
    ],
    boxPlotData: [
      [5, 7, 9, 11, 13],
      [6, 8, 10, 12, 14],
    ],
    boxPlotColors: ['rgb(34, 197, 94)', 'rgb(34, 197, 94)'],
    categories: ['1d4', '2d4'],
    enableBoxPlot: true,
    consideringCrits: true,
  };

  it('should return null for cache miss', () => {
    const result = getCachedResult(mockParams);
    expect(result).toBeNull();
  });

  it('should store and retrieve cached results', () => {
    setCachedResult(mockParams, mockValue);
    const result = getCachedResult(mockParams);

    expect(result).not.toBeNull();
    expect(result?.rows).toEqual(mockValue.rows);
    expect(result?.boxPlotData).toEqual(mockValue.boxPlotData);
    expect(result?.boxPlotColors).toEqual(mockValue.boxPlotColors);
    expect(result?.categories).toEqual(mockValue.categories);
    expect(result?.enableBoxPlot).toBe(mockValue.enableBoxPlot);
    expect(result?.consideringCrits).toBe(mockValue.consideringCrits);
    expect(result?.timestamp).toBeTypeOf('number');
  });

  it('should differentiate between different parameter combinations', () => {
    setCachedResult(mockParams, mockValue);

    const differentParams: CacheKey = {
      ...mockParams,
      hasAdvantage: true, // Changed parameter
    };

    const result = getCachedResult(differentParams);
    expect(result).toBeNull(); // Should be a cache miss
  });

  it('should persist cache across multiple operations', () => {
    setCachedResult(mockParams, mockValue);

    const params2: CacheKey = { ...mockParams, monsterAC: 16 };
    const value2 = { ...mockValue, rows: [] };
    setCachedResult(params2, value2);

    // Both should be retrievable
    expect(getCachedResult(mockParams)).not.toBeNull();
    expect(getCachedResult(params2)).not.toBeNull();
  });

  it('should clear cache completely', () => {
    setCachedResult(mockParams, mockValue);
    clearCache();

    const result = getCachedResult(mockParams);
    expect(result).toBeNull();
  });

  it('should track cache size correctly', () => {
    expect(getCacheStats().size).toBe(0);

    setCachedResult(mockParams, mockValue);
    expect(getCacheStats().size).toBe(1);

    const params2: CacheKey = { ...mockParams, monsterAC: 16 };
    setCachedResult(params2, mockValue);
    expect(getCacheStats().size).toBe(2);

    clearCache();
    expect(getCacheStats().size).toBe(0);
  });

  it('should evict old entries when cache exceeds max size', () => {
    // Mock MAX_CACHE_SIZE by creating 1001 entries
    for (let i = 0; i < 1001; i++) {
      const params: CacheKey = { ...mockParams, monsterAC: i };
      setCachedResult(params, mockValue);
      
      // Add small delay to ensure different timestamps
      vi.useFakeTimers();
      vi.advanceTimersByTime(1);
      vi.useRealTimers();
    }

    const stats = getCacheStats();
    expect(stats.size).toBeLessThanOrEqual(1000);
    expect(stats.maxSize).toBe(1000);

    // First entry (monsterAC: 0) should be evicted
    const oldestParams: CacheKey = { ...mockParams, monsterAC: 0 };
    expect(getCachedResult(oldestParams)).toBeNull();

    // Newest entry (monsterAC: 1000) should still exist
    const newestParams: CacheKey = { ...mockParams, monsterAC: 1000 };
    expect(getCachedResult(newestParams)).not.toBeNull();
  });

  it('should handle advantage parameter correctly', () => {
    const paramsNoAdvantage: CacheKey = { ...mockParams, hasAdvantage: false };
    const paramsWithAdvantage: CacheKey = { ...mockParams, hasAdvantage: true };

    setCachedResult(paramsNoAdvantage, mockValue);
    setCachedResult(paramsWithAdvantage, { ...mockValue, rows: [] });

    // Should be separate cache entries
    const result1 = getCachedResult(paramsNoAdvantage);
    const result2 = getCachedResult(paramsWithAdvantage);

    expect(result1?.rows).toHaveLength(2);
    expect(result2?.rows).toHaveLength(0);
  });

  it('should handle viewMode parameter correctly', () => {
    const paramsRelative: CacheKey = { ...mockParams, viewMode: 'relative' };
    const paramsAbsolute: CacheKey = { ...mockParams, viewMode: 'absolute' };

    setCachedResult(paramsRelative, mockValue);
    setCachedResult(paramsAbsolute, { ...mockValue, rows: [] });

    // Should be separate cache entries
    const result1 = getCachedResult(paramsRelative);
    const result2 = getCachedResult(paramsAbsolute);

    expect(result1?.rows).toHaveLength(2);
    expect(result2?.rows).toHaveLength(0);
  });

  it('should handle localStorage quota exceeded error gracefully', () => {
    // Mock localStorage.setItem to throw QuotaExceededError
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = vi.fn(() => {
      const error = new Error('QuotaExceededError');
      error.name = 'QuotaExceededError';
      throw error;
    });

    // Should not throw, should handle gracefully
    expect(() => setCachedResult(mockParams, mockValue)).not.toThrow();

    // Restore original setItem
    Storage.prototype.setItem = originalSetItem;
  });

  it('should handle invalid JSON in localStorage gracefully', () => {
    // Manually corrupt the localStorage
    localStorage.setItem('dnd-hb-mech-calc-cache', 'invalid json {{{');

    // Should return null instead of throwing
    const result = getCachedResult(mockParams);
    expect(result).toBeNull();
  });

  it('should update timestamp on cache access', () => {
    vi.useFakeTimers();
    
    setCachedResult(mockParams, mockValue);
    const result1 = getCachedResult(mockParams);
    const timestamp1 = result1?.timestamp;

    // Wait a bit and store again
    vi.advanceTimersByTime(1000);

    setCachedResult(mockParams, mockValue);
    const result2 = getCachedResult(mockParams);
    const timestamp2 = result2?.timestamp;

    expect(timestamp2).toBeGreaterThan(timestamp1!);
    
    vi.useRealTimers();
  });
});
