# Performance Profiling Quick Reference

## 🚀 Quick Start

1. Start your app: `npm run dev`
2. Open browser console (F12)
3. Run: `perfDebug.summary()`

## 🎯 Console Commands

```javascript
// Show breakdown of latest calculation
perfDebug.summary()

// Show all measurements in tables
perfDebug.print()

// Start fresh
perfDebug.clear()

// Get raw data
perfDebug.get()
```

## ⌨️ Keyboard Shortcuts

- **Ctrl+Shift+P**: Toggle visual performance monitor

## 📊 Understanding the Output

### perfDebug.summary() Output

```
📊 Latest Calculation Summary
Total Time: 45.23ms
  ├─ Cache Check: 0.12ms (0.3%)       ← Should be <1ms
  ├─ Worker Calculation: 15.50ms (34.3%)  ← Pure calculation time
  ├─ Message Overhead: 8.30ms (18.4%)     ← Worker communication
  └─ React Processing: 21.31ms (47.1%)    ← React render + state
```

### What's Normal?

- **Cache Check**: <1ms (instant)
- **Worker Calculation**: 10-50ms depending on inputs
- **Message Overhead**: 5-20ms (serialization + IPC)
- **React Processing**: 10-30% of total time

### Red Flags 🚩

- **Multiple calculations** per input change → Re-render loop
- **Message Overhead >30%** → Too much data transfer
- **React Processing >50%** → Expensive renders or loops
- **No cache hits** → Cache not working

## 🔍 Chrome DevTools

1. Open DevTools → **Performance** tab
2. Click **Record** (Ctrl+E)
3. Change an input
4. Click **Stop**
5. Look for:
   - **User Timing** section (your custom marks)
   - **Worker thread** row (separate from main thread)
   - Multiple effect executions (bad!)

## 🐛 Debugging Workflows

### "Tests are faster than browser"

1. Check: `perfDebug.summary()`
2. Compare **Worker Calculation** time to test time
   - Should be similar (within 2x)
   - If drastically different, browser may be throttling
3. Check **React Processing**
   - If >30%, React overhead is the issue
4. Check for re-render loops:
   ```javascript
   perfDebug.print()
   // Look at React Performance table
   // Multiple "Total Effect" entries? You have a loop!
   ```

### "App feels sluggish"

1. Enable visual monitor: **Ctrl+Shift+P**
2. Change inputs and watch bars
3. Identify the largest bar
4. Solutions:
   - **Large Cache Check**: Cache lookup is slow (unlikely)
   - **Large Worker Calculation**: Normal, can't optimize much
   - **Large Message Overhead**: Reduce data size or use Transferables
   - **Large React Processing**: See "Optimizing React" below

### "Multiple calculations for one change"

1. Run: `perfDebug.print()`
2. Count "React: Total Effect" entries
3. Should be 1-2 per input change
4. If more: Check dependency array in `useDamageDataWithWorker.ts` (lines 243-251)
5. Look for objects/arrays being recreated on each render

## 🔧 Optimizing React

If React Processing is high:

```tsx
// 1. Memoize expensive components
import { memo } from 'react';
const MyComponent = memo(function MyComponent() { ... });

// 2. Use React Profiler to find culprit
import { ReactProfiler } from './components/react-profiler';
<ReactProfiler id="Chart">
  <Chart data={data} />
</ReactProfiler>

// 3. Check console for render logs
// Look for components rendering too often

// 4. Verify cache is working
// Console should show "CACHE HIT" messages
```

## 📈 Performance Goals

| Metric | Target | Max Acceptable |
|--------|--------|----------------|
| Total Time | <50ms | <100ms |
| Cache Hit | <1ms | <2ms |
| Worker Calc | 10-50ms | <100ms |
| Message Overhead | <20ms | <30ms |
| React Processing | <20ms | <50ms |

## 🎓 Learning More

- Read: `PERFORMANCE_PROFILING.md` - Complete guide
- Read: `PROFILING_SUMMARY.md` - What was added
- Chrome DevTools: [Performance Profiling Guide](https://developer.chrome.com/docs/devtools/performance/)

## 💡 Pro Tips

1. **Clear measurements** before testing: `perfDebug.clear()`
2. **Record in incognito** mode to avoid extension interference
3. **Close DevTools** when measuring (it slows things down)
4. **Check CPU throttling** in DevTools (should be "No throttling")
5. **Use production build** for final testing: `npm run build && npm run preview`
