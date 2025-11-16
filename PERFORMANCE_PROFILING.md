# Web Worker Performance Profiling Guide

## Quick Start

The app now includes comprehensive performance instrumentation to help you profile worker and React performance.

### Browser Console Commands

Once the app is loaded, open your browser console and use these commands:

```javascript
// Show all performance measurements
perfDebug.print()

// Show summary of the latest calculation
perfDebug.summary()

// Clear all measurements (useful to start fresh)
perfDebug.clear()

// Get raw measurement data
perfDebug.get()
```

## Profiling Methods

### 1. Chrome DevTools Performance Profiler (Best for Deep Analysis)

**Steps:**
1. Open Chrome DevTools (`F12`)
2. Go to **Performance** tab
3. Click the **Record** button (or press `Ctrl+E`)
4. Interact with your app (change inputs, etc.)
5. Click **Stop** recording
6. Analyze the flame chart

**What to Look For:**
- **Main Thread Row**: Shows your React rendering and main thread work
- **Worker Thread Row(s)**: Shows separate row(s) for each web worker
  - Look for `onmessage` calls in the worker
  - Check WASM function calls
  - Identify calculation time
- **User Timing Section**: Shows your custom performance marks/measures
- **Gaps**: Time between worker finishing and UI updating indicates message passing overhead

### 2. Using Performance Marks (Built-in to App)

The app automatically creates performance marks for:

**Worker Thread:**
- `Worker: Wait for WASM` - Time waiting for WASM to initialize
- `Worker: Calculation` - Pure calculation time in worker
- `Worker: PostMessage Serialization` - Time to serialize results
- `Worker: Total Request` - Total worker processing time

**Main Thread (Worker Communication):**
- `Main: PostMessage to Worker` - Time to send message to worker
- `Main: Message Round Trip` - Total time from sending to receiving response
- `Main: Resolve Promise` - Time to resolve the promise and trigger React update

**React:**
- `React: Parse Inputs` - Time to parse and validate inputs
- `React: Cache Check` - Time to check calculation cache
- `React: Worker Calculate Call` - Async call to worker (includes all overhead)
- `React: Process & Set Results` - Time to process results and update state
- `React: Total Effect` - Total time for the entire useEffect

### 3. Visual Analysis in DevTools

**Timeline View:**
1. Record a performance profile
2. Look at the **Main** thread
3. Find the `useDamageDataWithWorker` calls
4. Click on individual frames to see:
   - React component renders
   - State updates
   - Effect executions

**Worker View:**
1. In the flame chart, scroll down to find **Worker** threads
2. You'll see:
   - `onmessage` handler execution
   - `calculateBatchDamageStats` calls
   - WASM functions (if enabled)

### 4. Identifying Performance Issues

**Symptom: Tests are faster than browser**

Possible causes:
1. **React re-render loops**: Check if state updates trigger multiple recalculations
   - Use `perfDebug.print()` to see if you have multiple "React: Total Effect" measurements close together
   - Check dependency array in `useDamageDataWithWorker`

2. **Message passing overhead**: Check `Main: Message Round Trip` duration
   - If this is high (>50ms), you may be serializing large objects
   - Consider using Transferable objects for large arrays

3. **Cache misses**: Check if cache is working
   - Look for "CACHE HIT" in console logs
   - Use `perfDebug.summary()` to see cache check time

4. **Worker initialization**: Check if worker is waiting for WASM
   - Look for "Worker: Wait for WASM" measurements
   - This should only happen on first calculation

**Example Console Output:**
```javascript
perfDebug.summary()
// Output:
// 📊 Latest Calculation Summary
// Total Time: 45.23ms
//   ├─ Cache Check: 0.12ms (0.3%)
//   ├─ Worker Calculation: 15.50ms (34.3%)
//   ├─ Message Overhead: 8.30ms (18.4%)
//   └─ React Processing: 21.31ms (47.1%)
```

In this example, React processing is taking almost half the time! This could indicate:
- Complex state updates
- Expensive component re-renders
- Multiple effect executions

## Debugging React Re-render Loops

If you suspect React is causing re-renders:

1. Add React DevTools Profiler:
   ```javascript
   // Wrap your App component
   import { Profiler } from 'react';
   
   function onRenderCallback(
     id, phase, actualDuration, baseDuration, startTime, commitTime
   ) {
     console.log(`${id} (${phase}) took ${actualDuration.toFixed(2)}ms`);
   }
   
   <Profiler id="App" onRender={onRenderCallback}>
     <App />
   </Profiler>
   ```

2. Check the dependency array in `useDamageDataWithWorker`:
   - Are dependencies changing unexpectedly?
   - Are you creating new object references on each render?

3. Use React DevTools:
   - Install React DevTools extension
   - Go to **Profiler** tab
   - Record interactions
   - See which components re-render and why

## Performance Optimization Tips

1. **Enable caching**: The app has a calculation cache - make sure it's working
2. **Preload common calculations**: Use `usePreloadCache` hook to warm up cache
3. **Debounce inputs**: If typing causes recalculations, add debouncing
4. **Use transferable objects**: For large data, use `postMessage(data, [transferableArray])`
5. **Reduce state updates**: Batch multiple state updates into one
6. **Memoize components**: Use `React.memo()` for expensive components
7. **Profile in production mode**: Development builds are slower due to extra checks

## Common Issues

### Issue: Multiple calculations for one input change
**Solution**: Check if dependencies in `useDamageDataWithWorker` are stable. Object/array dependencies should be memoized with `useMemo`.

### Issue: Worker slower than tests
**Solution**: Tests may run in Node.js with different JS engine optimizations. Browser has more overhead for worker communication. This is normal - check that the pure calculation time is similar.

### Issue: First calculation is slow
**Solution**: WASM initialization and JIT warm-up. Subsequent calculations should be faster. Use `usePreloadCache` to warm up during app initialization.

### Issue: Cache not working
**Solution**: Check that cache keys are stable. Object references in the cache key must be consistent.

## TypeScript Definitions

```typescript
// Add to window type for TypeScript
declare global {
  interface Window {
    perfDebug: {
      print: () => void;
      summary: () => void;
      clear: () => void;
      get: () => {
        worker: Array<{ name: string; duration: number; startTime: number }>;
        main: Array<{ name: string; duration: number; startTime: number }>;
        react: Array<{ name: string; duration: number; startTime: number }>;
      };
    };
  }
}
```
