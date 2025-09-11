import { useRef, useCallback } from 'react';

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

export interface PerformanceMonitorAPI {
  measurePerformance: (name: string, duration: number) => void;
  getMetrics: () => PerformanceMetric[];
  clearMetrics: () => void;
  getAverageDuration: (name: string) => number | null;
  getLastDuration: (name: string) => number | null;
}

/**
 * Simple performance monitoring hook for measuring operation durations
 * Memory efficient using useRef to avoid re-renders
 * Compatible with any component that needs basic performance tracking
 */
export function usePerformanceMonitor(
  componentName: string,
): PerformanceMonitorAPI {
  // Use refs to avoid causing re-renders when metrics change
  const metricsRef = useRef<PerformanceMetric[]>([]);

  const measurePerformance = useCallback(
    (name: string, duration: number) => {
      // Store the metric
      const metric: PerformanceMetric = {
        name: `${componentName}.${name}`,
        duration,
        timestamp: Date.now(),
      };

      metricsRef.current.push(metric);

      // Keep only last 100 metrics to prevent memory leaks
      if (metricsRef.current.length > 100) {
        metricsRef.current = metricsRef.current.slice(-100);
      }

      // Log slow operations in development
      if (process.env.NODE_ENV === 'development' && duration > 100) {
        console.warn(
          `🐌 Slow operation detected: ${metric.name} took ${duration.toFixed(2)}ms`,
        );
      }
    },
    [componentName],
  );

  const getMetrics = useCallback((): PerformanceMetric[] => {
    return [...metricsRef.current];
  }, []);

  const clearMetrics = useCallback(() => {
    metricsRef.current = [];
  }, []);

  const getAverageDuration = useCallback(
    (name: string): number | null => {
      const fullName = `${componentName}.${name}`;
      const filteredMetrics = metricsRef.current.filter(
        (metric) => metric.name === fullName,
      );
      if (filteredMetrics.length === 0) return null;

      const totalDuration = filteredMetrics.reduce(
        (sum, metric) => sum + metric.duration,
        0,
      );
      return totalDuration / filteredMetrics.length;
    },
    [componentName],
  );

  const getLastDuration = useCallback(
    (name: string): number | null => {
      const fullName = `${componentName}.${name}`;
      const filteredMetrics = metricsRef.current.filter(
        (metric) => metric.name === fullName,
      );
      if (filteredMetrics.length === 0) return null;

      return filteredMetrics[filteredMetrics.length - 1].duration;
    },
    [componentName],
  );

  return {
    measurePerformance,
    getMetrics,
    clearMetrics,
    getAverageDuration,
    getLastDuration,
  };
}

// Helper hook for measuring async operations
export function useAsyncPerformanceMonitor(componentName: string) {
  const performanceMonitor = usePerformanceMonitor(componentName);

  const measureAsync = useCallback(
    async <T>(name: string, asyncOperation: () => Promise<T>): Promise<T> => {
      const startTime = performance.now();
      try {
        const result = await asyncOperation();
        const duration = performance.now() - startTime;
        performanceMonitor.measurePerformance(name, duration);
        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        performanceMonitor.measurePerformance(`${name}-error`, duration);
        throw error;
      }
    },
    [performanceMonitor],
  );

  return {
    ...performanceMonitor,
    measureAsync,
  };
}

export default usePerformanceMonitor;
