/**
 * Web Worker for damage calculations
 * Runs batch damage calculations off the main thread to keep UI responsive
 * Automatically uses WASM acceleration when available
 */

// Import the calculation logic (with WASM support)
import { calculateBatchDamageStats } from '../utilities/batch-calculator';
import { initWasm } from '../utilities/wasm-bridge';

// Initialize WASM module in the worker
let wasmInitialized = false;
initWasm().then(success => {
  wasmInitialized = true;
  if (success) {
    console.log('⚡ WASM module loaded in Web Worker');
  } else {
    console.log('ℹ️ Web Worker running in JavaScript mode');
  }
}).catch(error => {
  console.warn('Failed to initialize WASM in worker:', error);
  wasmInitialized = false; 
});

export interface WorkerRequest {
  id: string;
  type: 'calculate' | 'ping';
  payload?: {
    partyLevel: number;
    monsterAC: number;
    toHitBonus: number;
    baseDamage: string;
    hasAdvantage: boolean;
    considerCrits: boolean;
    viewMode: 'relative' | 'absolute';
  };
}

export interface WorkerResponse {
  id: string;
  type: 'result' | 'error' | 'pong';
  payload?: number[][];
  error?: string;
  timing?: number;
}

// Listen for messages from the main thread
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, type, payload } = event.data;

  try {
    if (type === 'ping') {
      // Health check
      const response: WorkerResponse = {
        id,
        type: 'pong',
      };
      self.postMessage(response);
      return;
    }

    if (type === 'calculate' && payload) {
      // Mark the start of the entire request
      performance.mark(`worker-request-start-${id}`);
      
      // Wait for WASM initialization if needed
      if (!wasmInitialized) {
        performance.mark(`worker-wait-wasm-start-${id}`);
        await new Promise<void>(resolve => {
          const checkInit = setInterval(() => {
            if (wasmInitialized) {
              clearInterval(checkInit);
              resolve();
            }
          }, 10);
        });
        performance.mark(`worker-wait-wasm-end-${id}`);
        performance.measure(
          `Worker: Wait for WASM (${id})`,
          `worker-wait-wasm-start-${id}`,
          `worker-wait-wasm-end-${id}`
        );
      }

      // Mark calculation start
      performance.mark(`worker-calc-start-${id}`);
      const startTime = performance.now();

      // Perform the calculation
      const results = calculateBatchDamageStats(
        payload.partyLevel,
        payload.monsterAC,
        payload.toHitBonus,
        payload.baseDamage,
        payload.hasAdvantage,
        payload.considerCrits,
        payload.viewMode
      );

      const elapsed = performance.now() - startTime;
      
      // Mark calculation end
      performance.mark(`worker-calc-end-${id}`);
      performance.measure(
        `Worker: Calculation (${id})`,
        `worker-calc-start-${id}`,
        `worker-calc-end-${id}`
      );

      // Mark before postMessage
      performance.mark(`worker-postmessage-start-${id}`);

      // Send results back to main thread
      const response: WorkerResponse = {
        id,
        type: 'result',
        payload: results,
        timing: elapsed,
      };
      self.postMessage(response);
      
      // Mark after postMessage (measures serialization time)
      performance.mark(`worker-postmessage-end-${id}`);
      performance.measure(
        `Worker: PostMessage Serialization (${id})`,
        `worker-postmessage-start-${id}`,
        `worker-postmessage-end-${id}`
      );
      
      // Measure total worker processing time
      performance.mark(`worker-request-end-${id}`);
      performance.measure(
        `Worker: Total Request (${id})`,
        `worker-request-start-${id}`,
        `worker-request-end-${id}`
      );
    }
  } catch (error) {
    // Send error back to main thread
    const response: WorkerResponse = {
      id,
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
    self.postMessage(response);
  }
};

// Export empty object for TypeScript
export {};
