import { useCallback, useMemo, useRef, useState, useEffect } from 'react';

// Memoization for expensive calculations as specified in WS-145
export const memoizeExpensiveCalculation = <T, U>(
  fn: (input: T) => U,
  isEqual: (a: T, b: T) => boolean = Object.is,
) => {
  let lastInput: T;
  let lastResult: U;
  let hasResult = false;

  return (input: T): U => {
    if (!hasResult || !isEqual(input, lastInput)) {
      lastInput = input;
      lastResult = fn(input);
      hasResult = true;
    }
    return lastResult;
  };
};

// Optimistic update hook as specified in WS-145
export const useOptimisticUpdate = <T>(
  initialData: T,
  updateFn: (data: T) => Promise<T>,
) => {
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = useCallback(
    async (optimisticData: T) => {
      // Store current state for potential rollback
      const previousData = data;

      // Immediately update UI
      setData(optimisticData);
      setIsLoading(true);
      setError(null);

      try {
        // Send to server
        const serverData = await updateFn(optimisticData);
        setData(serverData);
      } catch (err) {
        // Revert on error
        setData(previousData);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    },
    [data, updateFn],
  );

  return { data, isLoading, error, update };
};

// Performance monitoring hook
export const usePerformanceMonitor = (componentName: string) => {
  const renderCount = useRef(0);
  const startTime = useRef(performance.now());

  useEffect(() => {
    renderCount.current += 1;
    const renderTime = performance.now() - startTime.current;

    // GUARDIAN FIX: Ultra-strict wedding day performance thresholds
    if (renderTime > 8.33) {
      // 120fps threshold for wedding day operations (was 60fps)
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `CRITICAL PERFORMANCE: ${componentName} took ${renderTime.toFixed(2)}ms to render (render #${renderCount.current}) - Exceeds wedding day 120fps requirement`,
        );
      }

      // Log to performance monitoring in production
      if (typeof window !== 'undefined' && window.performance) {
        performance.mark(`slow-render-${componentName}-${Date.now()}`);
      }
    }

    // GUARDIAN FIX: Add warning threshold for proactive optimization
    if (renderTime > 5.0) {
      // Warning at 5ms for 200fps target
      if (process.env.NODE_ENV === 'development') {
        console.info(
          `Performance Notice: ${componentName} render time ${renderTime.toFixed(2)}ms approaching threshold`,
        );
      }
    }

    startTime.current = performance.now();
  });

  return {
    renderCount: renderCount.current,
    logMetric: (metricName: string, value: number) => {
      console.log(
        `Performance Metric: ${componentName}.${metricName} = ${value}`,
      );
    },
  };
};

// Debounced state hook for search performance
export const useDebouncedState = <T>(initialValue: T, delay: number = 300) => {
  const [value, setValue] = useState<T>(initialValue);
  const [debouncedValue, setDebouncedValue] = useState<T>(initialValue);
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [value, delay]);

  return [debouncedValue, setValue] as const;
};

// Virtual scrolling calculations hook
export const useVirtualScrolling = (
  itemCount: number,
  itemHeight: number,
  containerHeight: number,
  scrollTop: number,
  overscan: number = 3,
) => {
  return useMemo(() => {
    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(containerHeight / itemHeight),
      itemCount,
    );

    const startIndex = Math.max(0, visibleStart - overscan);
    const endIndex = Math.min(itemCount, visibleEnd + overscan);

    return {
      startIndex,
      endIndex,
      visibleStart,
      visibleEnd,
      totalHeight: itemCount * itemHeight,
      offsetY: startIndex * itemHeight,
      visibleItemCount: endIndex - startIndex,
    };
  }, [itemCount, itemHeight, containerHeight, scrollTop, overscan]);
};

// Memory leak prevention hook
export const useMemoryOptimization = () => {
  const subscriptions = useRef<Array<() => void>>([]);
  const timers = useRef<Array<NodeJS.Timeout>>([]);
  const observers = useRef<
    Array<ResizeObserver | IntersectionObserver | MutationObserver>
  >([]);

  const addSubscription = useCallback((cleanup: () => void) => {
    subscriptions.current.push(cleanup);
  }, []);

  const addTimer = useCallback((timer: NodeJS.Timeout) => {
    timers.current.push(timer);
  }, []);

  const addObserver = useCallback(
    (observer: ResizeObserver | IntersectionObserver | MutationObserver) => {
      observers.current.push(observer);
    },
    [],
  );

  useEffect(() => {
    return () => {
      // Cleanup all subscriptions
      subscriptions.current.forEach((cleanup) => {
        try {
          cleanup();
        } catch (error) {
          // GUARDIAN FIX: Use environment-aware logging
          if (process.env.NODE_ENV === 'development') {
            console.error('Error cleaning up subscription:', error);
          }
        }
      });

      // Clear all timers
      timers.current.forEach((timer) => {
        try {
          clearTimeout(timer);
        } catch (error) {
          // GUARDIAN FIX: Use environment-aware logging
          if (process.env.NODE_ENV === 'development') {
            console.error('Error clearing timer:', error);
          }
        }
      });

      // Disconnect all observers
      observers.current.forEach((observer) => {
        try {
          observer.disconnect();
        } catch (error) {
          // GUARDIAN FIX: Use environment-aware logging
          if (process.env.NODE_ENV === 'development') {
            console.error('Error disconnecting observer:', error);
          }
        }
      });
    };
  }, []);

  return { addSubscription, addTimer, addObserver };
};

// Advanced caching hook with multi-level strategy
export const useAdvancedCaching = <T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options: {
    staleTime?: number;
    cacheTime?: number;
    refetchOnWindowFocus?: boolean;
  } = {},
) => {
  const {
    staleTime = 5 * 60 * 1000, // 5 minutes
    cacheTime = 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus = true,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);

  const cacheRef = useRef<Map<string, { data: T; timestamp: number }>>(
    new Map(),
  );
  const maxCacheSize = 100; // Prevent unlimited cache growth

  const isStale = useCallback(() => {
    return Date.now() - lastFetch > staleTime;
  }, [lastFetch, staleTime]);

  const fetchData = useCallback(
    async (force = false) => {
      const cachedEntry = cacheRef.current.get(cacheKey);
      const now = Date.now();

      // Return cached data if not stale and not forced
      if (!force && cachedEntry && now - cachedEntry.timestamp < staleTime) {
        setData(cachedEntry.data);
        setLastFetch(cachedEntry.timestamp);
        return cachedEntry.data;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await fetcher();

        // Update cache
        cacheRef.current.set(cacheKey, { data: result, timestamp: now });

        // Clean up old cache entries and enforce size limit
        const entriesToDelete: string[] = [];
        for (const [key, entry] of cacheRef.current.entries()) {
          if (now - entry.timestamp > cacheTime) {
            entriesToDelete.push(key);
          }
        }

        // Delete expired entries
        entriesToDelete.forEach((key) => cacheRef.current.delete(key));

        // Enforce cache size limit by removing oldest entries
        if (cacheRef.current.size > maxCacheSize) {
          const sortedEntries = Array.from(cacheRef.current.entries()).sort(
            ([, a], [, b]) => a.timestamp - b.timestamp,
          );

          const entriesToRemove = sortedEntries.slice(
            0,
            cacheRef.current.size - maxCacheSize,
          );
          entriesToRemove.forEach(([key]) => cacheRef.current.delete(key));
        }

        setData(result);
        setLastFetch(now);
        return result;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cacheKey, fetcher, staleTime, cacheTime],
  );

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refetch on window focus if enabled
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      if (isStale()) {
        fetchData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, isStale, fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: () => fetchData(true),
    isStale: isStale(),
  };
};

// Background synchronization hook
export const useBackgroundSync = <T>(
  syncFn: () => Promise<T>,
  interval: number = 30000, // 30 seconds
) => {
  const [lastSync, setLastSync] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<Error | null>(null);

  const timerRef = useRef<NodeJS.Timeout>();

  const sync = useCallback(async () => {
    if (isSyncing) return; // Prevent concurrent syncs

    setIsSyncing(true);
    setSyncError(null);

    try {
      await syncFn();
      setLastSync(Date.now());
    } catch (error) {
      setSyncError(error as Error);
    } finally {
      setIsSyncing(false);
    }
  }, [syncFn, isSyncing]);

  useEffect(() => {
    const startSync = () => {
      sync();
      timerRef.current = setTimeout(startSync, interval);
    };

    startSync();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [sync, interval]);

  return {
    lastSync,
    isSyncing,
    syncError,
    forceSync: sync,
  };
};

export default {
  memoizeExpensiveCalculation,
  useOptimisticUpdate,
  usePerformanceMonitor,
  useDebouncedState,
  useVirtualScrolling,
  useMemoryOptimization,
  useAdvancedCaching,
  useBackgroundSync,
};
