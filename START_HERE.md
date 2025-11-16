# 🎯 Performance Profiling - Ready to Use!

Your app now has comprehensive performance profiling capabilities. Here's how to start debugging!

## 🚀 Getting Started (30 seconds)

1. **Start your app**:
   ```bash
   npm run dev
   ```

2. **Open browser console** (F12)

3. **Run this command**:
   ```javascript
   perfDebug.summary()
   ```

4. **You'll see something like**:
   ```
   📊 Latest Calculation Summary
   Total Time: 45.23ms
     ├─ Cache Check: 0.12ms (0.3%)
     ├─ Worker Calculation: 15.50ms (34.3%)
     ├─ Message Overhead: 8.30ms (18.4%)
     └─ React Processing: 21.31ms (47.1%)
   ```

5. **Press Ctrl+Shift+P** to toggle the visual performance monitor

## 🔍 Finding Why Browser is Slower Than Tests

### Check #1: Is React causing a re-render loop?

```javascript
perfDebug.print()
// Look at the "React Performance" table
// Count how many "Total Effect" entries you see
// Should be 1-2 per input change
// More than that = re-render loop!
```

### Check #2: Is the cache working?

Look in the console for:
- ✅ `CACHE HIT` messages = good!
- ❌ No cache hits = problem

### Check #3: Where is the time going?

```javascript
perfDebug.summary()
// Check the percentages:
// - Worker Calculation: 30-50% is normal
// - Message Overhead: 10-20% is normal  
// - React Processing: 10-30% is normal
// - React Processing >50%? Problem!
```

## 📊 What the Numbers Mean

| Metric | What It Measures | Typical Value | Red Flag |
|--------|------------------|---------------|----------|
| **Cache Check** | Cache lookup time | <1ms | >2ms |
| **Worker Calculation** | Pure calculation (WASM/JS) | 10-50ms | >100ms |
| **Message Overhead** | Worker communication + serialization | 5-20ms | >30ms |
| **React Processing** | State updates + rendering | 10-30% of total | >50% |

## 🐛 Common Issues

### Issue: "React Processing is >50% of total time"

**This means React is the bottleneck, not the calculation!**

**Check for re-render loops:**
```javascript
perfDebug.print()
// Multiple "Total Effect" entries = loop!
```

**Solution:**
1. Open `src/hooks/useDamageDataWithWorker.ts`
2. Look at lines 243-251 (the dependency array)
3. Make sure `calculate` function is stable
4. Check if any dependencies are object references that change on each render

### Issue: "Tests run in 10ms but browser takes 50ms"

**This might be normal!** Browser has overhead that tests don't:
- React state updates
- Worker message passing
- Browser environment
- DevTools overhead

**Compare just the Worker Calculation time:**
```javascript
perfDebug.summary()
// Look at "Worker Calculation" duration
// This should be similar to your test times
// If 10ms in tests and 15ms in browser = OK!
// If 10ms in tests and 100ms in browser = Problem!
```

### Issue: "Every input change is slow, no cache hits"

**Cache is broken!**

**Check:**
1. Console should show `CACHE HIT` messages after first calculation
2. If not, cache keys aren't matching
3. Open `src/hooks/useDamageDataWithWorker.ts`
4. Check cache key creation (around line 116)
5. Make sure all values are stable primitives (not objects)

## 🎮 Interactive Tools

### Visual Monitor (Ctrl+Shift+P)

- Real-time performance breakdown
- Color-coded bars showing time distribution
- Updates every 500ms
- Persists across page reloads

### Chrome DevTools Profiler

1. Open DevTools → Performance tab
2. Click Record (Ctrl+E)
3. Change a single input
4. Stop recording
5. Look for:
   - **User Timing** section: Your custom marks
   - **Worker** thread: Separate row for worker
   - Multiple effect calls: Sign of re-render loop

## 📚 Full Documentation

- **`PROFILING_QUICK_REF.md`**: Quick reference card
- **`PERFORMANCE_PROFILING.md`**: Complete profiling guide
- **`PROFILING_SUMMARY.md`**: What was added and why

## 🎓 Understanding Test vs Browser Performance

Tests are faster because they:
1. ✅ Run pure JS/WASM calculation
2. ✅ No React overhead
3. ✅ No state updates
4. ✅ No worker message passing
5. ✅ No browser environment overhead
6. ✅ No DevTools overhead

Browser has all of the above! So expect 20-50% slower.

**The key question**: Is the **Worker Calculation** time similar to test time?
- Yes? Browser slowness is from React/messaging (might be optimizable)
- No? Calculation itself is slower in browser (unusual, check CPU throttling)

## 🔧 Quick Wins

### If React is slow:

```typescript
// Memoize expensive components
import { memo } from 'react';

const MyChart = memo(function MyChart({ data }: Props) {
  return <Chart data={data} />;
});
```

### If worker communication is slow:

Check what you're sending:
- Large arrays? Consider using Transferable objects
- Complex objects? Simplify before sending

### If calculations are slow:

1. Check WASM is enabled (console should show "⚡ WASM acceleration enabled")
2. Check cache is working (should see "CACHE HIT" messages)
3. Use preload cache (already implemented in your app!)

## ✅ Success Metrics

After optimization, you should see:
- Total time <100ms for typical inputs
- React Processing <30% of total
- Cache hits on repeated calculations
- Only 1-2 effect executions per input change

## 💡 Pro Tips

1. **Always clear before measuring**: `perfDebug.clear()`
2. **Close DevTools when measuring**: It adds 10-20% overhead
3. **Test in production build**: `npm run build && npm run preview`
4. **Check CPU throttling**: DevTools → Performance → Gear icon → "No throttling"
5. **Use incognito mode**: Browser extensions can slow things down

---

## 🔬 NEW: Calculation Profiling Commands

If worker calculation is taking most of the time, use these commands to dig deeper:

```javascript
// Profile a specific calculation with detailed breakdown
calcProfile.profile(5, 15, 3, '2d8+3')
// Shows: Damage Distributions, D20 Distribution, D4 Distributions, WASM/JS time

// Benchmark multiple runs for statistics
calcProfile.benchmark(5, 15, 3, '2d8+3', 10)
// Shows: Min, Median, Average, P95, Max timings

// Compare different damage strings to find slow ones
calcProfile.compare(['2d6', '2d20', '2d50', '2d99'])
// Shows: Which damage strings are faster/slower
```

**See `CALCULATION_PROFILING.md` for detailed guide on finding bottlenecks!**

---

## 🆘 Still Having Issues?

If you're still seeing poor performance:

1. Share output of `perfDebug.summary()`
2. Share output of `perfDebug.print()`
3. Share output of `calcProfile.profile(...)` for your slow case
4. Take a Chrome DevTools performance profile
5. Check console for errors or warnings

The instrumentation should now give you visibility into exactly where time is being spent!
