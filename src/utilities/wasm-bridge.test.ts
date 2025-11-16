import { describe, it, expect, beforeAll } from 'vitest';
import { initWasm, isWasmAvailable, convolve } from './wasm-bridge';

describe('WASM Integration', () => {
  beforeAll(async () => {
    // Try to initialize WASM, but don't fail if it's not available
    await initWasm();
  });

  describe('Initialization', () => {
    it('should report WASM availability status', () => {
      const available = isWasmAvailable();
      expect(typeof available).toBe('boolean');
      
      if (available) {
        console.log('✅ WASM is available for testing');
      } else {
        console.log('ℹ️ WASM not available, tests will use JS fallback');
      }
    });
  });

  describe('Convolution', () => {
    it('should convolve two probability distributions correctly', () => {
      const a = new Float64Array([0.5, 0.5]); // Fair coin
      const b = new Float64Array([0.5, 0.5]); // Fair coin
      
      const result = convolve(a, b);
      
      // Sum of two coins: [0,1,2] with probabilities [0.25, 0.5, 0.25]
      expect(result.length).toBe(3);
      expect(result[0]).toBeCloseTo(0.25, 10);
      expect(result[1]).toBeCloseTo(0.5, 10);
      expect(result[2]).toBeCloseTo(0.25, 10);
    });

    it('should handle d6 convolution', () => {
      const d6 = new Float64Array(Array(6).fill(1/6));
      
      const result = convolve(d6, d6);
      
      // 2d6 has 11 outcomes (2-12)
      expect(result.length).toBe(11);
      
      // Probabilities should sum to 1
      const sum = Array.from(result).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 10);
      
      // Middle value (7) should be most likely
      const maxProb = Math.max(...Array.from(result));
      expect(result[5]).toBe(maxProb); // Index 5 = outcome 7
    });

    it('should skip zero probabilities efficiently', () => {
      const sparse = new Float64Array([1.0, 0, 0, 0, 0]);
      const b = new Float64Array([0.5, 0.5]);
      
      const result = convolve(sparse, b);
      
      expect(result.length).toBe(6);
      expect(result[0]).toBeCloseTo(0.5, 10);
      expect(result[1]).toBeCloseTo(0.5, 10);
      expect(result[2]).toBeCloseTo(0.0, 10);
    });
  });

  describe('Performance Comparison', () => {
    it('should handle large convolutions efficiently', () => {
      // Create two large distributions (simulating complex dice)
      const size = 100;
      const a = new Float64Array(size).fill(1/size);
      const b = new Float64Array(size).fill(1/size);
      
      const start = performance.now();
      const result = convolve(a, b);
      const elapsed = performance.now() - start;
      
      expect(result.length).toBe(199);
      
      // Should complete in reasonable time (WASM or JS)
      expect(elapsed).toBeLessThan(100); // 100ms max
      
      if (isWasmAvailable()) {
        console.log(`  WASM convolution (100x100): ${elapsed.toFixed(2)}ms`);
      } else {
        console.log(`  JS convolution (100x100): ${elapsed.toFixed(2)}ms`);
      }
    });
  });
});
