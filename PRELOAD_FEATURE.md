# Preload Cache Feature

## Overview

The preload cache feature enhances user experience by **predictively loading calculations** when the user's mouse approaches toggle switches. This ensures that when users interact with controls, the results appear **instantly** with no delay.

## How It Works

### Proximity Detection

The system monitors the mouse cursor position in real-time and detects when it gets within a configurable distance (default: **384 pixels ≈ 4 inches at 96 DPI**) of either:

1. **Has Advantage** toggle switch
2. **Absolute Damage View** toggle switch

### Predictive Calculation

When the mouse enters the proximity zone:

1. The system calculates what the **alternate state** would be (e.g., if advantage is currently OFF, it calculates what the result would be if it were ON)
2. The calculation runs in the background using the **Web Worker**
3. Results are stored in the **cache** before the user clicks
4. When the user actually clicks, the results load **instantly from cache** with zero delay

### Throttling

To avoid excessive calculations, mouse position checks are throttled to run **every 100ms**. This provides a good balance between responsiveness and performance.

## Implementation Details

### Hook: `usePreloadCache`

```typescript
usePreloadCache({ 
  values: inputValues,        // Current form values
  enabled: true,              // Enable/disable preloading
  proximityThreshold: 384     // Distance in pixels (~4 inches at 96 DPI)
})
```

### Key Features

- **Non-blocking**: Calculations run asynchronously in the background
- **Smart caching**: Only preloads if result isn't already cached
- **Duplicate prevention**: Tracks in-progress preloads to avoid redundant calculations
- **Automatic cleanup**: Properly removes event listeners on unmount

### Cache Integration

The preload system integrates seamlessly with the existing cache infrastructure:

- Uses `getCachedResult()` to check if alternate state is already cached
- Uses `setCachedResult()` to store preloaded results
- Respects the LRU eviction policy
- Leverages localStorage for persistence

## Performance Impact

### Benefits

✅ **Instant toggling**: No perceptible delay when clicking switches  
✅ **Better UX**: Feels more responsive and polished  
✅ **Worker-powered**: Doesn't block the main thread  
✅ **Smart loading**: Only preloads when user is likely to click  

### Overhead

- **~100ms** mouse position checks (throttled)
- **Minimal**: Only triggers when cursor is near switches
- **One-time cost**: Preload happens once per state combination

## Console Feedback

When preloading occurs, you'll see console messages like:

```
🚀 Preloaded cache for hasAdvantage=true (42.15ms)
🚀 Preloaded cache for viewMode=absolute (38.27ms)
```

## Configuration

You can adjust the proximity threshold to make the preload trigger earlier or later:

```typescript
// More aggressive preloading (triggers from ~5 inches away at 96 DPI)
proximityThreshold: 480

// More conservative preloading (triggers from ~2 inches away at 96 DPI)
proximityThreshold: 192
```

## Future Enhancements

Possible improvements:

1. **Direction-based prediction**: Only preload if cursor is moving *toward* the switch
2. **Velocity detection**: Preload sooner if cursor is moving quickly
3. **Machine learning**: Learn user patterns to predict which toggle they're likely to use
4. **Hover timing**: Preload after hovering near a switch for X milliseconds
5. **Multiple alternates**: Preload both possible toggle states simultaneously

## Testing

See `src/hooks/usePreloadCache.test.ts` for unit tests covering:

- Event listener registration/cleanup
- DOM element detection
- Cache integration
- Enable/disable functionality
