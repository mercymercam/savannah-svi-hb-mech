# Calculation Cache Implementation

## Overview
Implemented a localStorage-based caching system for damage calculation results, making repeated parameter combinations load **instantly** (< 1ms).

## Key Features

### ✅ Instant Cache Hits
- **Toggle advantage ON/OFF**: 0ms (instant)
- **Switch view modes**: 0ms (instant)
- **Re-enter previous parameters**: 0ms (instant)

### ✅ Smart Cache Management
- **LRU Eviction**: Automatically removes oldest entries when exceeding 1000 cached combinations
- **Cross-session Persistence**: Cache survives browser refreshes via localStorage
- **Graceful Degradation**: Handles localStorage quota exceeded and corrupted data

### ✅ Developer Tools
Debug tools exposed via browser console:
```javascript
window.cacheDebug.inspect()  // View all cached entries in a table
window.cacheDebug.stats()    // See cache size (e.g., "50/1000 entries")
window.cacheDebug.clear()    // Clear the entire cache
window.cacheDebug.get(key)   // Get specific cache entry
```

## How It Works

### Cache Key Generation
Unique cache keys are generated from all input parameters:
```
"partyLevel|monsterAC|toHitBonus|baseDamage|hasAdvantage|viewMode"
Example: "5|15|5|1d8+3|false|relative"
```

### Cache Storage
Each cached entry stores:
- Complete calculation results (rows, boxPlotData, colors, categories)
- Timestamp for LRU eviction
- All metadata needed to render chart and table

### Cache Flow
1. User changes parameters
2. Hook (`useDamageData` or `useDamageDataWithWorker`) generates cache key
3. **Cache Hit** → Return instantly (< 1ms) ✅
4. **Cache Miss** → Calculate (10-2000ms) → Store result → Display

**Important**: Both the main thread and worker versions of the hook use the same cache, so switching between them doesn't lose cached results!

## Console Output

When you use the app, you'll see:
```
⚡ Cache MISS - calculating...
⚡ Batch calculated 3 d4 options with 1d8+3 in 12.34ms
[toggle advantage]
⚡ Cache HIT - loaded instantly
[toggle advantage back]
⚡ Cache HIT - loaded instantly
```

## Files Modified

### New Files
- `src/utilities/calculation-cache.ts` - Core caching logic
- `src/utilities/calculation-cache.test.ts` - Comprehensive tests (12/12 passing)

### Modified Files
- `src/hooks/useDamageData.ts` - Integrated cache lookup/storage (main thread version)
- `src/hooks/useDamageDataWithWorker.ts` - Integrated cache lookup/storage (worker version)
- `src/App.tsx` - Setup cache debug tools on mount
- `vitest.config.ts` - Changed environment to 'jsdom' for localStorage support
- `PERFORMANCE_OPTIMIZATION.md` - Updated with Phase 7 details

## Performance Impact

### Before Cache
- Toggle advantage: ~1800ms (full calculation)
- Switch view mode: ~1800ms (full calculation)
- User frustration: High 😞

### After Cache
- Toggle advantage: **< 1ms** ⚡
- Switch view mode: **< 1ms** ⚡
- User experience: Instant! 😊

## Testing

All 12 cache tests pass:
```bash
✓ should return null for cache miss
✓ should store and retrieve cached results
✓ should differentiate between different parameter combinations
✓ should persist cache across multiple operations
✓ should clear cache completely
✓ should track cache size correctly
✓ should evict old entries when cache exceeds max size
✓ should handle advantage parameter correctly
✓ should handle viewMode parameter correctly
✓ should handle localStorage quota exceeded error gracefully
✓ should handle invalid JSON in localStorage gracefully
✓ should update timestamp on cache access
```

## Browser Storage

Cache is stored in `localStorage` under key: `dnd-hb-mech-calc-cache`

To inspect in Chrome DevTools:
1. F12 → Application tab → Local Storage
2. Find: `dnd-hb-mech-calc-cache`
3. See JSON structure of all cached entries

## Future Enhancements

Potential improvements:
- Compression for large cache entries
- IndexedDB for larger storage limits
- Service Worker caching for offline support
- Cache warming for common parameter sets
