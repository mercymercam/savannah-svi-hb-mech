/**
 * Performance debugging utilities for profiling worker and main thread performance
 */

export interface PerformanceMeasurementSummary {
  name: string;
  duration: number;
  startTime: number;
}

/**
 * Get all performance measurements and group them by type
 */
export function getPerformanceMeasurements(): {
  worker: PerformanceMeasurementSummary[];
  main: PerformanceMeasurementSummary[];
  react: PerformanceMeasurementSummary[];
} {
  const entries = performance.getEntriesByType('measure') as PerformanceMeasure[];
  
  const worker: PerformanceMeasurementSummary[] = [];
  const main: PerformanceMeasurementSummary[] = [];
  const react: PerformanceMeasurementSummary[] = [];
  
  entries.forEach(entry => {
    const summary: PerformanceMeasurementSummary = {
      name: entry.name,
      duration: entry.duration,
      startTime: entry.startTime,
    };
    
    if (entry.name.startsWith('Worker:')) {
      worker.push(summary);
    } else if (entry.name.startsWith('Main:')) {
      main.push(summary);
    } else if (entry.name.startsWith('React:')) {
      react.push(summary);
    }
  });
  
  return { worker, main, react };
}

/**
 * Print performance measurements to console in a formatted table
 */
export function printPerformanceMeasurements(): void {
  const { worker, main, react } = getPerformanceMeasurements();
  
  if (worker.length > 0) {
    console.group('🔧 Worker Performance');
    console.table(worker.map(m => ({
      name: m.name.replace('Worker: ', ''),
      'duration (ms)': m.duration.toFixed(2),
      'start (ms)': m.startTime.toFixed(2),
    })));
    console.groupEnd();
  }
  
  if (main.length > 0) {
    console.group('📨 Main Thread (Worker Communication)');
    console.table(main.map(m => ({
      name: m.name.replace('Main: ', ''),
      'duration (ms)': m.duration.toFixed(2),
      'start (ms)': m.startTime.toFixed(2),
    })));
    console.groupEnd();
  }
  
  if (react.length > 0) {
    console.group('⚛️ React Performance');
    console.table(react.map(m => ({
      name: m.name.replace('React: ', ''),
      'duration (ms)': m.duration.toFixed(2),
      'start (ms)': m.startTime.toFixed(2),
    })));
    console.groupEnd();
  }
}

/**
 * Clear all performance marks and measurements
 */
export function clearPerformanceMeasurements(): void {
  performance.clearMarks();
  performance.clearMeasures();
  console.log('🧹 Performance measurements cleared');
}

/**
 * Get a summary of the most recent calculation cycle
 */
export function getLatestCalculationSummary(): {
  totalTime: number;
  workerTime: number;
  messageOverhead: number;
  reactProcessing: number;
  cacheCheck: number;
} | null {
  const { worker, main, react } = getPerformanceMeasurements();
  
  // Find the most recent complete cycle
  const latestReact = react
    .filter(m => m.name.includes('Total Effect'))
    .sort((a, b) => b.startTime - a.startTime)[0];
  
  if (!latestReact) return null;
  
  const effectId = latestReact.name.match(/\(([^)]+)\)/)?.[1];
  
  // Find related measurements - look for ones that overlap in time with the effect
  // or just use the most recent ones (within a reasonable time window)
  const timeWindow = 5000; // 5 seconds
  
  // Find the most recent worker calculation within the time window
  // Look for either direct worker measurements or synthetic ones from main thread
  const workerCalc = worker
    .filter(m => m.name.includes('Calculation') && 
                 Math.abs(m.startTime - latestReact.startTime) < timeWindow)
    .sort((a, b) => b.startTime - a.startTime)[0];
  
  // Find the most recent message round trip within the time window
  const messageRoundTrip = main
    .filter(m => m.name.includes('Message Round Trip') && 
                 Math.abs(m.startTime - latestReact.startTime) < timeWindow)
    .sort((a, b) => b.startTime - a.startTime)[0];
  
  // Find related measurements with the same effect ID if available
  const cacheCheck = react.find(m => m.name.includes('Cache Check') && 
                                     (effectId ? m.name.includes(effectId) : 
                                      Math.abs(m.startTime - latestReact.startTime) < timeWindow));
  
  const processResults = react.find(m => m.name.includes('Process & Set Results') && 
                                         (effectId ? m.name.includes(effectId) : 
                                          Math.abs(m.startTime - latestReact.startTime) < timeWindow));
  
  return {
    totalTime: latestReact.duration,
    workerTime: workerCalc?.duration || 0,
    messageOverhead: messageRoundTrip?.duration || 0,
    reactProcessing: processResults?.duration || 0,
    cacheCheck: cacheCheck?.duration || 0,
  };
}

/**
 * Print a summary of the latest calculation
 */
export function printLatestCalculationSummary(): void {
  const summary = getLatestCalculationSummary();
  
  if (!summary) {
    console.log('No calculation data available');
    // Debug: show what we do have
    const { worker, main, react } = getPerformanceMeasurements();
    console.log(`Found ${worker.length} worker measurements, ${main.length} main measurements, ${react.length} react measurements`);
    if (react.length > 0) {
      console.log('React measurements:', react.map(m => m.name));
    }
    return;
  }
  
  console.group('📊 Latest Calculation Summary');
  console.log(`Total Time: ${summary.totalTime.toFixed(2)}ms`);
  console.log(`  ├─ Cache Check: ${summary.cacheCheck.toFixed(2)}ms (${(summary.cacheCheck / summary.totalTime * 100).toFixed(1)}%)`);
  console.log(`  ├─ Worker Calculation: ${summary.workerTime.toFixed(2)}ms (${(summary.workerTime / summary.totalTime * 100).toFixed(1)}%)`);
  console.log(`  ├─ Message Overhead: ${summary.messageOverhead.toFixed(2)}ms (${(summary.messageOverhead / summary.totalTime * 100).toFixed(1)}%)`);
  console.log(`  └─ React Processing: ${summary.reactProcessing.toFixed(2)}ms (${(summary.reactProcessing / summary.totalTime * 100).toFixed(1)}%)`);
  
  // Debug info if worker time is 0
  if (summary.workerTime === 0) {
    const { worker } = getPerformanceMeasurements();
    console.log(`⚠️ Worker time is 0ms. Found ${worker.length} worker measurements:`, worker.map(m => `${m.name} (${m.duration.toFixed(2)}ms)`));
  }
  
  console.groupEnd();
}

// Expose to window for easy console access
if (typeof window !== 'undefined') {
  interface PerfDebug {
    print: () => void;
    summary: () => void;
    clear: () => void;
    get: () => ReturnType<typeof getPerformanceMeasurements>;
  }
  
  (window as typeof window & { perfDebug: PerfDebug }).perfDebug = {
    print: printPerformanceMeasurements,
    summary: printLatestCalculationSummary,
    clear: clearPerformanceMeasurements,
    get: getPerformanceMeasurements,
  };
  
  console.log('💡 Performance debugging available via window.perfDebug:');
  console.log('  - perfDebug.print() - Show all measurements');
  console.log('  - perfDebug.summary() - Show latest calculation summary');
  console.log('  - perfDebug.clear() - Clear all measurements');
  console.log('  - perfDebug.get() - Get raw measurements');
}
