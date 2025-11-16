import { useRef, useCallback, useEffect } from 'react';
import type { WorkerRequest, WorkerResponse } from '@/workers/damage-calculator.worker';

export interface UseWorkerCalculatorOptions {
  enabled?: boolean; // Whether to use worker or fall back to main thread
  timeout?: number; // Timeout in ms before falling back
}

export interface WorkerCalculationResult {
  results: number[][];
  timing: number;
  usedWorker: boolean;
}

type PendingRequest = {
  resolve: (value: WorkerCalculationResult) => void;
  reject: (error: Error) => void;
  timeoutId?: number;
};

/**
 * Hook to manage Web Worker for damage calculations
 * Provides automatic fallback to main thread if worker fails
 */
export function useWorkerCalculator(options: UseWorkerCalculatorOptions = {}) {
  const { enabled = true, timeout = 60000 } = options;
  
  const workerRef = useRef<Worker | null>(null);
  const pendingRequests = useRef<Map<string, PendingRequest>>(new Map());
  const requestIdCounter = useRef(0);
  const workerHealthy = useRef<boolean>(false);

  // Initialize worker
  useEffect(() => {
    if (!enabled) return;

    try {
      // Create worker
      const worker = new Worker(
        new URL('@/workers/damage-calculator.worker.ts', import.meta.url),
        { type: 'module' }
      );

      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const { id, type, payload, error, timing } = event.data;

        if (type === 'pong') {
          workerHealthy.current = true;
          return;
        }

        const pending = pendingRequests.current.get(id);
        if (!pending) return;

        // Mark when response received
        performance.mark(`main-response-received-${id}`);
        performance.measure(
          `Main: Message Round Trip (${id})`,
          `main-request-sent-${id}`,
          `main-response-received-${id}`
        );

        // Clear timeout
        if (pending.timeoutId) {
          window.clearTimeout(pending.timeoutId);
        }

        pendingRequests.current.delete(id);

        if (type === 'error') {
          pending.reject(new Error(error || 'Worker calculation failed'));
        } else if (type === 'result' && payload) {
          performance.mark(`main-resolve-start-${id}`);
          pending.resolve({
            results: payload,
            timing: timing || 0,
            usedWorker: true,
          });
          performance.mark(`main-resolve-end-${id}`);
          performance.measure(
            `Main: Resolve Promise (${id})`,
            `main-resolve-start-${id}`,
            `main-resolve-end-${id}`
          );
        }
      };

      worker.onerror = (error) => {
        console.error('Worker error:', error);
        workerHealthy.current = false;
        
        // Reject all pending requests
        for (const [, pending] of pendingRequests.current) {
          if (pending.timeoutId) {
            window.clearTimeout(pending.timeoutId);
          }
          pending.reject(new Error('Worker crashed'));
        }
        pendingRequests.current.clear();
      };

      workerRef.current = worker;

      // Health check
      const pingRequest: WorkerRequest = {
        id: 'ping',
        type: 'ping',
      };
      worker.postMessage(pingRequest);

    } catch (error) {
      console.error('Failed to create worker:', error);
      workerHealthy.current = false;
    }

    // Cleanup
    return () => {
      // Capture pending requests at cleanup time
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const currentPending = pendingRequests.current;
      
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      workerHealthy.current = false;
      
      // Clear all pending requests
      for (const [, pending] of currentPending) {
        if (pending.timeoutId) {
          window.clearTimeout(pending.timeoutId);
        }
      }
      currentPending.clear();
    };
  }, [enabled]);

  const calculate = useCallback(
    async (
      partyLevel: number,
      monsterAC: number,
      toHitBonus: number,
      baseDamage: string,
      hasAdvantage: boolean,
      considerCrits: boolean,
      viewMode: 'relative' | 'absolute'
    ): Promise<WorkerCalculationResult> => {
      // If worker not enabled or not healthy, fallback to main thread
      if (!enabled || !workerRef.current || !workerHealthy.current) {
        const { calculateBatchDamageStats } = await import('@/utilities/batch-calculator');
        const startTime = performance.now();
        
        const results = calculateBatchDamageStats(
          partyLevel,
          monsterAC,
          toHitBonus,
          baseDamage,
          hasAdvantage,
          considerCrits,
          viewMode
        );
        
        const elapsed = performance.now() - startTime;
        
        return {
          results,
          timing: elapsed,
          usedWorker: false,
        };
      }

      // Use worker
      return new Promise((resolve, reject) => {
        const id = `req-${++requestIdCounter.current}`;
        
        // Mark when request starts
        performance.mark(`main-request-start-${id}`);
        
        const timeoutId = window.setTimeout(() => {
          pendingRequests.current.delete(id);
          console.warn('Worker timeout, falling back to main thread');
          
          // Fallback to main thread
          import('@/utilities/batch-calculator').then(({ calculateBatchDamageStats }) => {
            const startTime = performance.now();
            const results = calculateBatchDamageStats(
              partyLevel,
              monsterAC,
              toHitBonus,
              baseDamage,
              hasAdvantage,
              considerCrits,
              viewMode
            );
            const elapsed = performance.now() - startTime;
            
            resolve({
              results,
              timing: elapsed,
              usedWorker: false,
            });
          }).catch(reject);
        }, timeout);

        pendingRequests.current.set(id, {
          resolve,
          reject,
          timeoutId,
        });

        const request: WorkerRequest = {
          id,
          type: 'calculate',
          payload: {
            partyLevel,
            monsterAC,
            toHitBonus,
            baseDamage,
            hasAdvantage,
            considerCrits,
            viewMode,
          },
        };

        // Mark before postMessage
        performance.mark(`main-postmessage-start-${id}`);
        workerRef.current!.postMessage(request);
        performance.mark(`main-request-sent-${id}`);
        performance.measure(
          `Main: PostMessage to Worker (${id})`,
          `main-postmessage-start-${id}`,
          `main-request-sent-${id}`
        );
      });
    },
    [enabled, timeout]
  );

  return {
    calculate,
    isWorkerHealthy: () => workerHealthy.current,
  };
}
