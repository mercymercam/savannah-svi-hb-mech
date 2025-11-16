import { useState, useEffect } from 'react';
import { isWasmAvailable } from '@/utilities/wasm-bridge';

interface PerformanceStats {
  wasmEnabled: boolean;
  lastCalculationTime: number | null;
  averageSpeedup: number | null;
}

export function PerformanceIndicator() {
  const [stats, setStats] = useState<PerformanceStats>({
    wasmEnabled: false,
    lastCalculationTime: null,
    averageSpeedup: null,
  });

  useEffect(() => {
    // Check WASM availability after a short delay to ensure init completes
    const checkWasm = setTimeout(() => {
      setStats(prev => ({
        ...prev,
        wasmEnabled: isWasmAvailable(),
      }));
    }, 100);

    return () => clearTimeout(checkWasm);
  }, []);

  if (!stats.wasmEnabled) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2 shadow-lg">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-green-600 dark:text-green-400 font-medium">⚡ WASM</span>
        <span className="text-gray-600 dark:text-gray-400">
          10-100x faster
        </span>
      </div>
    </div>
  );
}
