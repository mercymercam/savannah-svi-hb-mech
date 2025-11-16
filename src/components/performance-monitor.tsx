import { useState, useEffect } from 'react';
import { getLatestCalculationSummary } from '@/utilities/performance-debug';

/**
 * Visual performance monitor component for debugging
 * Shows breakdown of calculation time in real-time
 */
export function PerformanceMonitor() {
  const [summary, setSummary] = useState<ReturnType<typeof getLatestCalculationSummary>>(null);
  const [show, setShow] = useState(() => {
    // Check localStorage for persisted preference
    const stored = localStorage.getItem('showPerfMonitor');
    return stored === 'true';
  });

  useEffect(() => {
    if (!show) return;

    // Poll for updates every 500ms
    const interval = setInterval(() => {
      const latest = getLatestCalculationSummary();
      if (latest) {
        setSummary(latest);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [show]);

  // Toggle with keyboard shortcut (Ctrl+Shift+P)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setShow(prev => {
          const newValue = !prev;
          localStorage.setItem('showPerfMonitor', String(newValue));
          return newValue;
        });
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (!show) {
    return (
      <div className="fixed bottom-4 right-4 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded border">
        Press Ctrl+Shift+P to show performance monitor
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="fixed bottom-4 right-4 p-4 bg-background/95 backdrop-blur-sm rounded-lg border shadow-lg text-sm">
        <div className="font-semibold mb-2 flex items-center justify-between">
          <span>⚡ Performance Monitor</span>
          <button 
            onClick={() => {
              setShow(false);
              localStorage.setItem('showPerfMonitor', 'false');
            }}
            className="text-muted-foreground hover:text-foreground ml-4"
          >
            ✕
          </button>
        </div>
        <div className="text-muted-foreground">Waiting for calculation...</div>
        <div className="text-xs text-muted-foreground mt-2">
          Press Ctrl+Shift+P to hide
        </div>
      </div>
    );
  }

  const { totalTime, workerTime, messageOverhead, reactProcessing, cacheCheck } = summary;

  const BarItem = ({ label, time, color }: { label: string; time: number; color: string }) => {
    const percent = (time / totalTime) * 100;
    return (
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-mono">{time.toFixed(2)}ms ({percent.toFixed(1)}%)</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full ${color} transition-all duration-300`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-background/95 backdrop-blur-sm rounded-lg border shadow-lg text-sm w-80">
      <div className="font-semibold mb-3 flex items-center justify-between">
        <span>⚡ Performance Monitor</span>
        <button 
          onClick={() => {
            setShow(false);
            localStorage.setItem('showPerfMonitor', 'false');
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>
      
      <div className="mb-3 p-2 bg-muted/50 rounded">
        <div className="text-xs text-muted-foreground">Total Time</div>
        <div className="text-2xl font-bold font-mono">{totalTime.toFixed(2)}ms</div>
      </div>

      <div className="space-y-1">
        <BarItem label="Cache Check" time={cacheCheck} color="bg-blue-500" />
        <BarItem label="Worker Calculation" time={workerTime} color="bg-green-500" />
        <BarItem label="Message Overhead" time={messageOverhead} color="bg-yellow-500" />
        <BarItem label="React Processing" time={reactProcessing} color="bg-purple-500" />
      </div>

      <div className="text-xs text-muted-foreground mt-3 border-t pt-2">
        <div>💡 Tips:</div>
        <div>• Ctrl+Shift+P to hide</div>
        <div>• Open console for more: <code className="bg-muted px-1 rounded">perfDebug.print()</code></div>
      </div>
    </div>
  );
}
