/**
 * Calculation Cache using localStorage
 * 
 * Stores calculation results to make repeated parameter combinations load instantly.
 * - Uses localStorage for persistence across sessions
 * - LRU eviction when cache exceeds MAX_CACHE_SIZE
 * - Serializes complex data structures efficiently
 */

import { DamageDataRow } from '@/hooks/useDamageData';

const CACHE_KEY = 'dnd-hb-mech-calc-cache';
const MAX_CACHE_SIZE = 1000;

export interface CacheKey {
  partyLevel: number;
  monsterAC: number;
  toHitBonus: number;
  baseDamage: string;
  hasAdvantage: boolean;
  viewMode: 'relative' | 'absolute';
}

export interface CacheValue {
  rows: DamageDataRow[];
  boxPlotData: number[][];
  boxPlotColors: string[];
  categories: string[];
  enableBoxPlot: boolean;
  consideringCrits: boolean;
  timestamp: number; // For LRU tracking
}

interface CacheStorage {
  [key: string]: CacheValue;
}

/**
 * Generate a unique cache key from input parameters
 */
function generateCacheKey(params: CacheKey): string {
  return `${params.partyLevel}|${params.monsterAC}|${params.toHitBonus}|${params.baseDamage}|${params.hasAdvantage}|${params.viewMode}`;
}

/**
 * Load cache from localStorage
 */
function loadCache(): CacheStorage {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (!stored) return {};
    return JSON.parse(stored) as CacheStorage;
  } catch (error) {
    console.warn('Failed to load calculation cache:', error);
    return {};
  }
}

/**
 * Save cache to localStorage
 */
function saveCache(cache: CacheStorage): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn('Failed to save calculation cache:', error);
    // If localStorage is full, clear the cache and try again
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded, clearing calculation cache');
      localStorage.removeItem(CACHE_KEY);
    }
  }
}

/**
 * Evict oldest entries if cache exceeds max size (LRU eviction)
 */
function evictOldEntries(cache: CacheStorage): CacheStorage {
  const entries = Object.entries(cache);
  
  if (entries.length <= MAX_CACHE_SIZE) {
    return cache;
  }

  // Sort by timestamp (oldest first)
  entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
  
  // Keep only the most recent MAX_CACHE_SIZE entries
  const kept = entries.slice(-MAX_CACHE_SIZE);
  
  return Object.fromEntries(kept);
}

/**
 * Get cached calculation result
 */
export function getCachedResult(params: CacheKey): CacheValue | null {
  const cache = loadCache();
  const key = generateCacheKey(params);
  const result = cache[key];
  
  if (result) {
    console.log('⚡ Cache HIT - loaded instantly');
    return result;
  }
  
  console.log('⚡ Cache MISS - calculating...');
  return null;
}

/**
 * Store calculation result in cache
 */
export function setCachedResult(
  params: CacheKey,
  value: Omit<CacheValue, 'timestamp'>
): void {
  let cache = loadCache();
  const key = generateCacheKey(params);
  
  // Add timestamp for LRU tracking
  cache[key] = {
    ...value,
    timestamp: Date.now(),
  };
  
  // Evict old entries if needed
  cache = evictOldEntries(cache);
  
  // Save to localStorage
  saveCache(cache);
}

/**
 * Clear the entire cache (useful for debugging or after major updates)
 */
export function clearCache(): void {
  localStorage.removeItem(CACHE_KEY);
  console.log('⚡ Calculation cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; maxSize: number } {
  const cache = loadCache();
  return {
    size: Object.keys(cache).length,
    maxSize: MAX_CACHE_SIZE,
  };
}

/**
 * Debug utility: Expose cache management functions to browser console
 * Call window.cacheDebug.inspect() to see all cached entries
 * Call window.cacheDebug.clear() to clear the cache
 * Call window.cacheDebug.stats() to see cache statistics
 */
export function setupCacheDebug(): void {
  if (typeof window !== 'undefined') {
    (window as typeof window & { cacheDebug: unknown }).cacheDebug = {
      inspect: () => {
        const cache = loadCache();
        console.table(
          Object.entries(cache).map(([key, value]) => ({
            key,
            timestamp: new Date(value.timestamp).toLocaleString(),
            rowCount: value.rows.length,
            enableBoxPlot: value.enableBoxPlot,
            consideringCrits: value.consideringCrits,
          }))
        );
        return cache;
      },
      clear: () => {
        clearCache();
        console.log('✅ Cache cleared');
      },
      stats: () => {
        const stats = getCacheStats();
        console.log(`📊 Cache: ${stats.size}/${stats.maxSize} entries`);
        return stats;
      },
      get: (key: string) => {
        const cache = loadCache();
        return cache[key];
      },
    };
    console.log('🔍 Cache debug tools available: window.cacheDebug.inspect(), .clear(), .stats(), .get(key)');
  }
}
