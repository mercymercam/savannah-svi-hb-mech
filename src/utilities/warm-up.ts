/**
 * Function Warm-up for JIT Optimization
 * 
 * Calls hot functions during app initialization to trigger V8's JIT compiler.
 * This ensures they're optimized before the user interacts with them.
 */

import { calculateBatchDamageStats } from './batch-calculator';
import { RangeDist, d } from './prob-eval';

/**
 * Warm up hot functions by calling them with typical inputs
 * This triggers JIT compilation so they're optimized when actually needed
 */
export function warmUpCalculations() {
  const startTime = performance.now();
  
  try {
    // Warm up RangeDist operations
    const d6 = d(6);
    const d20 = d(20);
    d6.add(d6);
    d20.repeatSum(2);
    RangeDist.largest(d20, d20);
    
    // Warm up batch calculator with small, medium, and large cases
    // Small: Fast calculation to warm up basic path
    calculateBatchDamageStats(4, 13, 2, '1d6+3', false, false, 'relative');
    
    // Medium: Typical use case
    calculateBatchDamageStats(8, 15, 3, '2d6+3', false, true, 'relative');
    
    // Large: Exercise the crit path and larger distributions
    calculateBatchDamageStats(12, 16, 4, '3d8+5', true, true, 'relative');
    
    const elapsed = performance.now() - startTime;
    console.log(`[Optimization] Hot functions warmed up in ${elapsed.toFixed(2)}ms`);
    
  } catch (error) {
    console.warn('[Optimization] Warm-up failed:', error);
  }
}

/**
 * Check if we're already using optimal data structures
 */
export function verifyOptimizations() {
  const dist = d(20);
  
  // Verify we're using TypedArrays (Float64Array)
  const usingTypedArrays = dist.p instanceof Float64Array;
  
  console.log('[Optimization] Status:');
  console.log(`  - Using TypedArrays: ${usingTypedArrays ? '✅' : '❌'}`);
  console.log(`  - Distribution size: ${dist.p.length} values`);
  console.log(`  - Memory layout: ${usingTypedArrays ? 'Contiguous (Fast)' : 'Sparse (Slow)'}`);
  
  return usingTypedArrays;
}
