import { Profiler, ProfilerOnRenderCallback } from 'react';

/**
 * Wrapper component to profile React render performance
 * Use this to wrap components you want to profile
 * 
 * @example
 * <ReactProfiler id="MyComponent">
 *   <MyComponent />
 * </ReactProfiler>
 */

const onRenderCallback: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime,
) => {
  // Only log if render took more than 1ms to avoid noise
  if (actualDuration > 1) {
    console.log(
      `⚛️ Profiler: ${id} (${phase})`,
      `\n  Actual: ${actualDuration.toFixed(2)}ms`,
      `\n  Base: ${baseDuration.toFixed(2)}ms`,
      `\n  Start: ${startTime.toFixed(2)}ms`,
      `\n  Commit: ${commitTime.toFixed(2)}ms`
    );
  }
  
  // Create performance marks for Chrome DevTools
  performance.mark(`react-render-${id}-${phase}-start`);
  performance.mark(`react-render-${id}-${phase}-end`);
  performance.measure(
    `React Render: ${id} (${phase})`,
    `react-render-${id}-${phase}-start`,
    `react-render-${id}-${phase}-end`
  );
};

interface ReactProfilerProps {
  id: string;
  children: React.ReactNode;
}

/**
 * React Profiler component for performance monitoring
 * Logs render timings to console and creates performance marks
 * 
 * Only enabled in development mode to avoid production overhead
 */
export function ReactProfiler({ id, children }: ReactProfilerProps) {
  // Only enable in development
  if (import.meta.env.DEV) {
    return (
      <Profiler id={id} onRender={onRenderCallback}>
        {children}
      </Profiler>
    );
  }
  
  return <>{children}</>;
}
