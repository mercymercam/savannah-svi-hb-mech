# Performance Profiling Summary

## What Was Added

I've instrumented your app with comprehensive performance profiling tools to help you debug the discrepancy between test performance and browser performance. Here's what you now have:

## 1. Performance Marks Throughout the Stack

### Worker Thread (`damage-calculator.worker.ts`)
- Marks when worker receives request
- Tracks WASM initialization wait time
- Measures pure calculation time
- Measures `postMessage` serialization overhead
- Tracks total worker processing time

### Main Thread Worker Communication (`useWorkerCalculator.ts`)
- Marks when sending message to worker
- Measures round-trip time from send to receive
- Tracks promise resolution time

### React Layer (`useDamageDataWithWorker.ts`)
- Measures input parsing time
- Tracks cache checking time
- Measures async worker call duration
- Tracks result processing and state update time
- Measures total effect execution time

## 2. Debugging Tools

### Browser Console API (`window.perfDebug`)
Open browser console and use:

```javascript
// Show all performance measurements in formatted tables
perfDebug.print()

// Show summary of latest calculation with percentages
perfDebug.summary()

// Clear all measurements (start fresh)
perfDebug.clear()

// Get raw measurement data
perfDebug.get()
```

### Visual Performance Monitor
- Press **Ctrl+Shift+P** to toggle
- Shows real-time breakdown of calculation time
- Visual bars showing percentage of time in each phase
- Persists preference across sessions

### React Profiler Component
Wrap any component to track its render performance:

```tsx
import { ReactProfiler } from './components/react-profiler';

<ReactProfiler id="MyComponent">
  <MyComponent />
</ReactProfiler>
```

## 3. Chrome DevTools Integration

All performance marks appear in Chrome DevTools Performance tab:
1. Open DevTools → Performance
2. Click Record (Ctrl+E)
3. Interact with app
4. Stop recording
5. See your custom marks in "User Timing" section
6. See worker thread activity in separate row

## How to Use

### Step 1: Initial Check
```javascript
// Open browser console
perfDebug.summary()
```

Example output:
```
📊 Latest Calculation Summary
Total Time: 45.23ms
  ├─ Cache Check: 0.12ms (0.3%)
  ├─ Worker Calculation: 15.50ms (34.3%)
  ├─ Message Overhead: 8.30ms (18.4%)
  └─ React Processing: 21.31ms (47.1%)
```

### Step 2: Check for Re-render Loops

If React Processing is high (>30% of total time):

1. Look for multiple calculations happening:
```javascript
perfDebug.print()
// Look at the "React Performance" table
// Are there multiple "Total Effect" entries close together?
```

2. Check dependency array in `useDamageDataWithWorker.ts`:
   - Lines 243-251 show the dependencies
   - Are any creating new object references on each render?
   - Is `calculate` function stable?

### Step 3: Deep Dive with Chrome DevTools

1. Open DevTools → Performance
2. Click Record
3. Change a single input value
4. Stop recording
5. Look for:
   - Multiple effect executions (should be only 1-2)
   - Long frames on main thread
   - Worker thread activity

### Step 4: Enable Visual Monitor

1. Press **Ctrl+Shift+P** in your app
2. Change inputs and watch the bars
3. Identify which phase is taking most time

## Common Issues & Solutions

### Issue: Multiple effect executions
**Symptom**: `perfDebug.print()` shows many "React: Total Effect" entries
**Cause**: Dependencies changing on every render
**Solution**: Check that objects in dependency array are memoized

### Issue: High message overhead
**Symptom**: "Message Overhead" >20ms in summary
**Cause**: Large data serialization
**Solution**: Reduce data size or use Transferable objects

### Issue: High React processing time
**Symptom**: "React Processing" >30% of total
**Cause**: Complex state updates or expensive re-renders
**Solution**: 
- Memoize expensive components with `React.memo()`
- Batch state updates
- Check if child components re-render unnecessarily

### Issue: Cache not working
**Symptom**: No cache hits in console, every input change triggers calculation
**Cause**: Cache key not matching (object references changing)
**Solution**: Ensure cache key values are stable primitives

## Files Modified

1. `src/workers/damage-calculator.worker.ts` - Added worker performance marks
2. `src/hooks/useWorkerCalculator.ts` - Added main thread communication marks
3. `src/hooks/useDamageDataWithWorker.ts` - Added React effect marks
4. `src/utilities/performance-debug.ts` - NEW: Console debugging API
5. `src/components/performance-monitor.tsx` - NEW: Visual monitor
6. `src/components/react-profiler.tsx` - NEW: React profiler wrapper
7. `src/main.tsx` - Import performance-debug to initialize
8. `src/App.tsx` - Added PerformanceMonitor component
9. `PERFORMANCE_PROFILING.md` - Complete guide

## Next Steps

1. **Start the app**: `npm run dev`
2. **Open browser console**: Press F12
3. **Run initial check**: Type `perfDebug.summary()`
4. **Toggle visual monitor**: Press Ctrl+Shift+P
5. **Change inputs** and watch the metrics

### What to Look For

The most likely culprits for browser slowness vs tests:

1. **React re-render loops**: Check if effect runs multiple times per input change
2. **Cache misses**: Check console for "CACHE HIT" messages
3. **State update overhead**: React processing should be <30% of total time
4. **Message passing overhead**: Should be <20% of total time

### Comparing to Tests

Tests run calculations directly without:
- React overhead
- State updates
- Message serialization/deserialization
- Browser environment overhead
- DevTools overhead (if open)

A 20-50% slowdown in browser vs tests is normal. If it's worse than that, use these tools to find the bottleneck.

## TypeScript Support

Add this to a `.d.ts` file for TypeScript autocompletion:

```typescript
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

export {};
```
