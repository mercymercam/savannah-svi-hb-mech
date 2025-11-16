/**
 * WebAssembly module wrapper for high-performance damage calculations
 * 
 * This module provides a clean TypeScript interface to the WASM implementation
 * with automatic fallback to JavaScript if WASM fails to load.
 */

import type * as WasmModule from './wasm-pkg/damage_calculator_wasm';

let wasmModule: typeof WasmModule | null = null;
let wasmInitialized = false;
let wasmLoadError: Error | null = null;

/**
 * Initialize the WASM module
 * This should be called early in the app lifecycle
 */
export async function initWasm(): Promise<boolean> {
  if (wasmInitialized) {
    return wasmModule !== null;
  }

  try {
    // Dynamic import of the WASM module
    const module = await import('./wasm-pkg/damage_calculator_wasm');
    
    // In Node.js environment (tests), we need to load the WASM file directly
    if (typeof process !== 'undefined' && process.versions?.node) {
      const fs = await import('fs/promises');
      const path = await import('path');
      const url = await import('url');
      
      // Get the directory of this file
      const __filename = url.fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      
      // Load the WASM file
      const wasmPath = path.join(__dirname, 'wasm-pkg', 'damage_calculator_wasm_bg.wasm');
      const wasmBuffer = await fs.readFile(wasmPath);
      
      // Initialize with the buffer
      await module.default(wasmBuffer);
    } else {
      // In browser, use default fetch-based initialization
      await module.default();
    }
    
    wasmModule = module;
    wasmInitialized = true;
    console.log('✅ WebAssembly module loaded successfully');
    return true;
  } catch (error) {
    wasmLoadError = error as Error;
    wasmInitialized = true;
    console.warn('⚠️ WebAssembly failed to load, falling back to JavaScript:', error);
    return false;
  }
}

/**
 * Check if WASM is available
 */
export function isWasmAvailable(): boolean {
  return wasmInitialized && wasmModule !== null;
}

/**
 * Get WASM load error if any
 */
export function getWasmError(): Error | null {
  return wasmLoadError;
}

/**
 * High-performance convolution using WASM
 * Falls back to JS implementation if WASM is unavailable
 */
export function convolve(a: Float64Array, b: Float64Array): Float64Array {
  if (wasmModule) {
    try {
      const result = wasmModule.convolve(a, b);
      return new Float64Array(result);
    } catch (error) {
      console.warn('WASM convolve failed, falling back to JS:', error);
    }
  }
  
  // Fallback to JavaScript
  return convolveJS(a, b);
}

/**
 * JavaScript fallback for convolution
 */
function convolveJS(a: Float64Array, b: Float64Array): Float64Array {
  const result = new Float64Array(a.length + b.length - 1);
  for (let i = 0; i < a.length; i++) {
    if (a[i] === 0) continue;
    for (let j = 0; j < b.length; j++) {
      if (b[j] === 0) continue;
      result[i + j] += a[i] * b[j];
    }
  }
  return result;
}

/**
 * Parameters for batch damage calculation
 */
export interface BatchDamageParams {
  proficiencyBonus: number;
  attackBonus: number;
  monsterAC: number;
  
  d20Dist: { min: number; max: number; p: Float64Array };
  baseDamageDist: { min: number; max: number; p: Float64Array };
  critDamageDist: { min: number; max: number; p: Float64Array };
  d4Dists: Array<{ min: number; max: number; p: Float64Array }>;
  
  considerCrits: boolean;
  viewModeRelative: boolean;
}

/**
 * High-performance batch damage calculation using WASM
 * Returns array of percentile arrays (5 percentiles per d4 count)
 */
export function calculateBatchDamageStatsWasm(params: BatchDamageParams): number[][] {
  if (!wasmModule) {
    throw new Error('WASM module not initialized. Call initWasm() first.');
  }

  try {
    // Flatten d4 distributions for WASM
    const d4Mins = new Int32Array(params.d4Dists.map(d => d.min));
    const d4Maxs = new Int32Array(params.d4Dists.map(d => d.max));
    const d4PLengths = new Uint32Array(params.d4Dists.map(d => d.p.length));
    
    // Flatten all d4 probabilities into a single array
    const totalD4PLength = params.d4Dists.reduce((sum, d) => sum + d.p.length, 0);
    const d4PFlat = new Float64Array(totalD4PLength);
    let offset = 0;
    for (const d4Dist of params.d4Dists) {
      d4PFlat.set(d4Dist.p, offset);
      offset += d4Dist.p.length;
    }

    const result = wasmModule.calculate_batch_damage_stats(
      params.proficiencyBonus,
      params.attackBonus,
      params.monsterAC,
      
      params.d20Dist.min,
      params.d20Dist.max,
      params.d20Dist.p,
      
      params.baseDamageDist.min,
      params.baseDamageDist.max,
      params.baseDamageDist.p,
      
      params.critDamageDist.min,
      params.critDamageDist.max,
      params.critDamageDist.p,
      
      d4Mins,
      d4Maxs,
      d4PLengths,
      d4PFlat,
      
      params.considerCrits,
      params.viewModeRelative,
    );

    // Convert flat result back to 2D array (5 percentiles per d4 count)
    const results: number[][] = [];
    for (let i = 0; i < params.proficiencyBonus; i++) {
      results.push(Array.from(result.slice(i * 5, (i + 1) * 5)));
    }
    
    return results;
  } catch (error) {
    console.error('WASM batch calculation failed:', error);
    throw error;
  }
}

/**
 * Calculate percentiles from a distribution using WASM
 */
export function calculatePercentilesWasm(
  min: number,
  max: number,
  p: Float64Array
): number[] {
  if (!wasmModule) {
    throw new Error('WASM module not initialized. Call initWasm() first.');
  }

  try {
    return Array.from(wasmModule.calculate_percentiles(min, max, p));
  } catch (error) {
    console.error('WASM percentile calculation failed:', error);
    throw error;
  }
}

/**
 * Max/min distribution calculation for advantage/disadvantage
 */
export function maxOrMinDistWasm(
  minA: number,
  maxA: number,
  pA: Float64Array,
  minB: number,
  maxB: number,
  pB: Float64Array,
  useMax: boolean
): { min: number; max: number; p: Float64Array } {
  if (!wasmModule) {
    throw new Error('WASM module not initialized. Call initWasm() first.');
  }

  try {
    const result = wasmModule.max_or_min_dist(minA, maxA, pA, minB, maxB, pB, useMax);
    
    // Last two elements are min and max
    const resultArray = Array.from(result);
    const min = resultArray[resultArray.length - 2];
    const max = resultArray[resultArray.length - 1];
    const p = new Float64Array(resultArray.slice(0, resultArray.length - 2));
    
    return { min, max, p };
  } catch (error) {
    console.error('WASM max/min distribution failed:', error);
    throw error;
  }
}
