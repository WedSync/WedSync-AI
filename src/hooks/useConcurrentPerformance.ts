'use client';

import {
  useState,
  useTransition,
  useDeferredValue,
  useCallback,
  useEffect,
  useRef,
  startTransition,
  useMemo,
  unstable_useOptimistic as useOptimistic,
} from 'react';

// React 19 concurrent performance utilities
interface ConcurrentState<T> {
  data: T;
  isPending: boolean;
  optimisticData: T;
  error: Error | null;
  lastUpdated: number;
}

interface ConcurrentUpdate<T> {
  type: string;
  payload: T;
  timestamp: number;
  id: string;
}

interface PerformanceMetrics {
  renderTime: number;
  transitionTime: number;
  deferredUpdateCount: number;
  optimisticUpdateCount: number;
  batchedUpdateCount: number;
  lastMeasurement: number;
}

// Advanced concurrent state hook with React 19 features
export function useConcurrentState<T>(
  initialValue: T,
  updateFunction?: (current: T, update: any) => T,
) {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<ConcurrentState<T>>({
    data: initialValue,
    isPending: false,
    optimisticData: initialValue,
    error: null,
    lastUpdated: Date.now(),
  });

  // Optimistic updates for immediate UI feedback
  const [optimisticState, addOptimisticUpdate] = useOptimistic(
    state.data,
    (currentData: T, optimisticUpdate: ConcurrentUpdate<T>) => {
      return updateFunction
        ? updateFunction(currentData, optimisticUpdate.payload)
        : optimisticUpdate.payload;
    },
  );

  // Deferred values to reduce unnecessary re-renders
  const deferredData = useDeferredValue(state.data);
  const deferredOptimisticData = useDeferredValue(optimisticState);

  // Performance tracking
  const metricsRef = useRef<PerformanceMetrics>({
    renderTime: 0,
    transitionTime: 0,
    deferredUpdateCount: 0,
    optimisticUpdateCount: 0,
    batchedUpdateCount: 0,
    lastMeasurement: performance.now(),
  });

  // Concurrent update with automatic batching
  const updateConcurrently = useCallback(
    (
      newValue: T | ((prev: T) => T),
      options: {
        optimistic?: boolean;
        immediate?: boolean;
        batchKey?: string;
      } = {},
    ) => {
      const updateId = `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const startTime = performance.now();

      if (options.optimistic) {
        // Add optimistic update for immediate UI feedback
        addOptimisticUpdate({
          type: 'OPTIMISTIC_UPDATE',
          payload:
            typeof newValue === 'function'
              ? (newValue as Function)(state.data)
              : newValue,
          timestamp: Date.now(),
          id: updateId,
        });
        metricsRef.current.optimisticUpdateCount++;
      }

      if (options.immediate) {
        // Immediate update without transition (blocking)
        setState((prev) => ({
          ...prev,
          data:
            typeof newValue === 'function'
              ? (newValue as Function)(prev.data)
              : newValue,
          optimisticData:
            typeof newValue === 'function'
              ? (newValue as Function)(prev.optimisticData)
              : newValue,
          lastUpdated: Date.now(),
          error: null,
        }));
      } else {
        // Non-blocking update using startTransition
        startTransition(() => {
          setState((prev) => {
            const updatedData =
              typeof newValue === 'function'
                ? (newValue as Function)(prev.data)
                : newValue;
            return {
              ...prev,
              data: updatedData,
              optimisticData: updatedData,
              lastUpdated: Date.now(),
              error: null,
            };
          });

          const endTime = performance.now();
          metricsRef.current.transitionTime = endTime - startTime;
          metricsRef.current.batchedUpdateCount++;
        });
      }
    },
    [state.data, addOptimisticUpdate],
  );

  // Batch multiple updates using React's automatic batching
  const batchUpdates = useCallback((updates: Array<() => void>) => {
    startTransition(() => {
      // React 19 automatically batches these updates
      updates.forEach((update) => update());
      metricsRef.current.batchedUpdateCount += updates.length;
    });
  }, []);

  // Error boundary for concurrent operations
  const updateWithErrorHandling = useCallback(
    async (asyncUpdate: () => Promise<T>) => {
      setState((prev) => ({ ...prev, isPending: true, error: null }));

      try {
        const result = await asyncUpdate();

        startTransition(() => {
          setState((prev) => ({
            ...prev,
            data: result,
            optimisticData: result,
            isPending: false,
            lastUpdated: Date.now(),
            error: null,
          }));
        });

        return result;
      } catch (error) {
        startTransition(() => {
          setState((prev) => ({
            ...prev,
            isPending: false,
            error: error instanceof Error ? error : new Error(String(error)),
          }));
        });
        throw error;
      }
    },
    [],
  );

  // Performance metrics getter
  const getMetrics = useCallback(() => {
    return { ...metricsRef.current };
  }, []);

  // Reset state
  const reset = useCallback(() => {
    startTransition(() => {
      setState({
        data: initialValue,
        isPending: false,
        optimisticData: initialValue,
        error: null,
        lastUpdated: Date.now(),
      });
    });
  }, [initialValue]);

  return {
    // Current state
    data: deferredData,
    optimisticData: deferredOptimisticData,
    isPending: isPending || state.isPending,
    error: state.error,
    lastUpdated: state.lastUpdated,

    // Update functions
    updateConcurrently,
    batchUpdates,
    updateWithErrorHandling,
    reset,

    // Metrics
    getMetrics,
  };
}

// Concurrent performance monitoring hook
export function usePerformanceTracking() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    transitionTime: 0,
    deferredUpdateCount: 0,
    optimisticUpdateCount: 0,
    batchedUpdateCount: 0,
    lastMeasurement: performance.now(),
  });

  const frameRef = useRef<number>();
  const observerRef = useRef<PerformanceObserver>();

  // Measure render performance
  useEffect(() => {
    const measureRenderTime = () => {
      const now = performance.now();
      setMetrics((prev) => ({
        ...prev,
        renderTime: now - prev.lastMeasurement,
        lastMeasurement: now,
      }));

      frameRef.current = requestAnimationFrame(measureRenderTime);
    };

    frameRef.current = requestAnimationFrame(measureRenderTime);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  // Monitor long tasks and main thread blocking
  useEffect(() => {
    if ('PerformanceObserver' in window) {
      observerRef.current = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'measure' && entry.name.includes('React')) {
            setMetrics((prev) => ({
              ...prev,
              transitionTime: entry.duration,
            }));
          }
        });
      });

      try {
        observerRef.current.observe({ entryTypes: ['measure', 'navigation'] });
      } catch (e) {
        console.warn('Performance Observer not supported for all entry types');
      }
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {
    metrics,
    recordOptimisticUpdate: () =>
      setMetrics((prev) => ({
        ...prev,
        optimisticUpdateCount: prev.optimisticUpdateCount + 1,
      })),
    recordDeferredUpdate: () =>
      setMetrics((prev) => ({
        ...prev,
        deferredUpdateCount: prev.deferredUpdateCount + 1,
      })),
    recordBatchedUpdate: (count: number = 1) =>
      setMetrics((prev) => ({
        ...prev,
        batchedUpdateCount: prev.batchedUpdateCount + count,
      })),
  };
}

// Advanced batching hook for complex state updates
export function useAdvancedBatching<T>() {
  const [isPending, startTransition] = useTransition();
  const pendingUpdatesRef = useRef<Array<() => void>>([]);
  const batchTimeoutRef = useRef<NodeJS.Timeout>();

  // Queue update for batching
  const queueUpdate = useCallback((updateFn: () => void) => {
    pendingUpdatesRef.current.push(updateFn);

    // Clear existing timeout
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }

    // Batch updates after a short delay
    batchTimeoutRef.current = setTimeout(() => {
      if (pendingUpdatesRef.current.length > 0) {
        const updates = [...pendingUpdatesRef.current];
        pendingUpdatesRef.current = [];

        startTransition(() => {
          updates.forEach((update) => update());
        });
      }
    }, 0); // Next tick
  }, []);

  // Immediate batch execution
  const flushUpdates = useCallback(() => {
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }

    if (pendingUpdatesRef.current.length > 0) {
      const updates = [...pendingUpdatesRef.current];
      pendingUpdatesRef.current = [];

      startTransition(() => {
        updates.forEach((update) => update());
      });
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    };
  }, []);

  return {
    queueUpdate,
    flushUpdates,
    isPending,
    pendingCount: pendingUpdatesRef.current.length,
  };
}

// React 19 Compiler-ready data processing hook
export function useOptimizedDataProcessing<T, R>(
  data: T[],
  processor: (items: T[]) => R,
  dependencies: any[] = [],
) {
  // The React Compiler will automatically optimize this
  const processedData = useMemo(() => {
    const startTime = performance.now();
    const result = processor(data);
    const endTime = performance.now();

    if (process.env.NODE_ENV === 'development') {
      console.debug('Data processing time:', endTime - startTime, 'ms');
    }

    return result;
  }, [data, ...dependencies]); // eslint-disable-line react-hooks/exhaustive-deps

  // Defer the processed data to prevent blocking UI updates
  const deferredProcessedData = useDeferredValue(processedData);

  return {
    processedData: deferredProcessedData,
    isProcessing: processedData !== deferredProcessedData,
  };
}

// Concurrent list virtualization hook
export function useConcurrentVirtualization<T>(
  items: T[],
  containerHeight: number,
  itemHeight: number,
  overscan: number = 5,
) {
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);

  // Defer scroll position to reduce render frequency
  const deferredScrollTop = useDeferredValue(scrollTop);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(
      0,
      Math.floor(deferredScrollTop / itemHeight) - overscan,
    );
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((deferredScrollTop + containerHeight) / itemHeight) + overscan,
    );

    return { startIndex, endIndex };
  }, [deferredScrollTop, containerHeight, itemHeight, overscan, items.length]);

  // Get visible items
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange]);

  // Scroll handler with transition
  const handleScroll = useCallback(
    (newScrollTop: number) => {
      setScrollTop(newScrollTop);

      if (!isScrolling) {
        setIsScrolling(true);

        // Stop scrolling indicator after delay
        setTimeout(() => {
          startTransition(() => {
            setIsScrolling(false);
          });
        }, 150);
      }
    },
    [isScrolling],
  );

  return {
    visibleItems,
    visibleRange,
    isScrolling: isScrolling || scrollTop !== deferredScrollTop,
    totalHeight: items.length * itemHeight,
    offsetY: visibleRange.startIndex * itemHeight,
    handleScroll,
  };
}
