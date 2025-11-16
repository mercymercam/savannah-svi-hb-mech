/**
 * Web Worker for damage calculations
 * Runs batch damage calculations off the main thread to keep UI responsive
 */

// Import the calculation logic
// Note: In a worker, we need to import the actual functions, not use dynamic imports
import { calculateBatchDamageStats } from '../utilities/batch-calculator';

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
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
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

      // Send results back to main thread
      const response: WorkerResponse = {
        id,
        type: 'result',
        payload: results,
        timing: elapsed,
      };
      self.postMessage(response);
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
