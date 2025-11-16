# Finding Calculation Bottlenecks

## Quick Answer

You now have detailed calculation profiling! Open the browser console and you'll automatically see:

```
🔍 Calculation Breakdown (1769.00ms total):
  ├─ Damage Distributions: 0.15ms (0.0%)
  ├─ D20 Distribution: 0.02ms (0.0%)
  ├─ D4 Distributions: 0.08ms (0.0%)
  └─ WASM Calculation: 1768.75ms (99.9%)
```

This tells you exactly where time is spent!

## What the Breakdown Shows

### For WASM Calculations:
- **Damage Distributions**: Time to parse and build base/crit damage dice (e.g., "2d8+3")
- **D20 Distribution**: Time to build d20 distribution (with advantage if applicable)
- **D4 Distributions**: Time to build penalty dice distributions (1d4, 2d4, etc.)
- **WASM Calculation**: Time spent in Rust/WASM doing the actual probability math

### For JS Calculations (fallback):
- **Damage Distributions**: Same as above
- **D20 Distribution**: Same as above
- **D4 Distributions**: Same as above
- **Main Loop**: Time iterating through all probability combinations
- **Percentile Calc**: Time calculating 5th/25th/50th/75th/95th percentiles

## Console Commands

### 1. Profile Current Settings

```javascript
// Profile with your current settings
calcProfile.profile(5, 15, 3, '2d8+3')

// With all options
calcProfile.profile(
  5,      // partyLevel
  15,     // monsterAC
  3,      // toHitBonus
  '2d8+3', // baseDamage
  false,  // hasAdvantage
  true,   // considerCrits
  'relative' // viewMode
)
```

### 2. Benchmark Performance

Run multiple iterations to get statistics:

```javascript
// Run 10 times with default settings
calcProfile.benchmark(5, 15, 3, '2d8+3')

// Run 50 times
calcProfile.benchmark(5, 15, 3, '2d8+3', 50)

// Output:
// 📊 Benchmark: 50 iterations
//   Min: 15.20ms
//   Median: 16.50ms
//   Average: 16.75ms
//   P95: 18.30ms
//   Max: 20.10ms
```

### 3. Compare Different Inputs

Find out which damage strings are slower:

```javascript
// Compare simple vs complex damage
calcProfile.compare([
  '8',      // Simple number
  '2d6+3',  // Standard 2d6
  '2d99',   // Large dice (your slow case!)
  '8d6+24', // Many dice
])

// Output:
// 8: 12.50ms
// 2d6+3: 15.30ms
// 2d99: 1750.20ms ← THIS IS YOUR PROBLEM!
// 8d6+24: 25.80ms
// 
// 🏆 Fastest: 8 (12.50ms)
// 🐌 Slowest: 2d99 (1750.20ms)
// 📈 Slowdown: 140.02x
```

## Understanding Your Problem: 2d99

Your calculation with `2d99` is slow because:

1. **Huge probability space**: 
   - `d99` has 99 possible outcomes
   - `2d99` has 99 × 99 = **9,801 possible sums**
   - This creates a massive distribution to iterate through

2. **Nested loops multiply**:
   - d20 rolls: 20 outcomes (or 210 with advantage)
   - Base damage (2d99): ~9,801 outcomes
   - Crit damage (4d99): ~19,602 outcomes
   - D4 penalties: 6 different distributions
   - Total iterations: **billions of probability combinations**

3. **Percentile calculation**:
   - Must sort and process all possible outcomes
   - With huge distributions, this takes significant time

## Solutions

### Option 1: Use Monte Carlo for Large Dice

For dice >d20, consider switching to Monte Carlo simulation instead of exact probability:

```javascript
// Instead of exact probabilities for 2d99
// Use Monte Carlo with 10,000 samples (much faster)
```

### Option 2: Warn Users

Add a warning when dice are >d20:
```
"⚠️ Large dice (d99) will be slow. Consider using smaller dice or a fixed number."
```

### Option 3: Optimize WASM Further

The WASM code could be optimized for large distributions:
- Early termination for low-probability outcomes
- Sparse array representation
- Parallel processing in WASM

### Option 4: Cache Aggressively

The cache should handle this, but verify:
```javascript
// Check if 2d99 is being cached
// Change an input, then change back
// Should see CACHE HIT in console
```

## Recommended Workflow

1. **Run your slow calculation** - The console will automatically show breakdown
2. **Identify the bottleneck**:
   - If "Damage Distributions" is high: Dice parsing is slow
   - If "WASM Calculation" is high: Probability space is too large
   - If "Main Loop" is high (JS fallback): Need better algorithm
3. **Use `calcProfile.compare()`** to confirm which inputs are slow
4. **Optimize accordingly**

## Example Investigation

```javascript
// Your slow case
calcProfile.profile(5, 15, 3, '2d99', false, true, 'relative')

// Compare to normal case
calcProfile.compare(['2d6+3', '2d20', '2d50', '2d99'])

// You'll see exponential growth with dice size!
```

## The Real Issue: Probability Space Explosion

The calculation time grows with:
- **O(d20_outcomes × base_outcomes × crit_outcomes × d4_outcomes)**

For `2d99`:
- d20: 20 outcomes
- Base (2d99): ~9,801 outcomes  
- Crit (4d99): ~19,602 outcomes
- Each d4: 4-24 outcomes

**Total: 20 × 9,801 × 19,602 × 6 ≈ 23 billion probability combinations**

That's why it takes 1.7 seconds even in optimized WASM!

## Quick Test

```javascript
// See how calculation time scales with dice size
calcProfile.compare([
  '2d6',   // ~36 outcomes
  '2d12',  // ~144 outcomes
  '2d20',  // ~400 outcomes
  '2d50',  // ~2,500 outcomes
  '2d99',  // ~9,801 outcomes
])

// You'll see it grows quadratically!
```
