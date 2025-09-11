'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

interface VirtualScrollOptimizationOptions {
  itemCount: number;
  itemHeight: number;
  containerHeight: number;
  overscanCount?: number;
  enableInfiniteScroll?: boolean;
  loadMoreThreshold?: number;
  scrollDebounceMs?: number;
}

interface VirtualScrollMetrics {
  virtualizedHeight: number;
  visibleStartIndex: number;
  visibleEndIndex: number;
  shouldLoadMore: (scrollOffset: number, threshold: number) => boolean;
  scrollToIndex: (index: number) => void;
  resetAfterIndex: (index: number) => void;
  getScrollOffset: () => number;
  isScrolling: boolean;
}

export function useVirtualScrollOptimization({
  itemCount,
  itemHeight,
  containerHeight,
  overscanCount = 5,
  enableInfiniteScroll = true,
  loadMoreThreshold = 0.8,
  scrollDebounceMs = 16,
}: VirtualScrollOptimizationOptions): VirtualScrollMetrics {
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const lastScrollTime = useRef<number>(0);

  // Calculate virtualized height
  const virtualizedHeight = useMemo(() => {
    return Math.min(containerHeight, itemCount * itemHeight);
  }, [containerHeight, itemCount, itemHeight]);

  // Calculate visible range with optimization
  const { visibleStartIndex, visibleEndIndex } = useMemo(() => {
    const visibleItemCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.floor(scrollOffset / itemHeight);
    const endIndex = Math.min(
      itemCount - 1,
      startIndex + visibleItemCount + overscanCount,
    );

    return {
      visibleStartIndex: Math.max(0, startIndex - overscanCount),
      visibleEndIndex: endIndex,
    };
  }, [scrollOffset, itemHeight, containerHeight, itemCount, overscanCount]);

  // Optimized scroll handler with debouncing
  const handleScroll = useCallback(
    (offset: number) => {
      const now = performance.now();

      // Throttle scroll events for performance
      if (now - lastScrollTime.current < scrollDebounceMs) {
        return;
      }

      lastScrollTime.current = now;
      setScrollOffset(offset);

      if (!isScrolling) {
        setIsScrolling(true);
      }

      // Clear existing timeout and set new one
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 150); // Stop scrolling indicator after 150ms of inactivity
    },
    [scrollDebounceMs, isScrolling],
  );

  // Infinite scroll detection
  const shouldLoadMore = useCallback(
    (currentScrollOffset: number, threshold: number) => {
      if (!enableInfiniteScroll || itemCount === 0) return false;

      const totalHeight = itemCount * itemHeight;
      const scrollPercentage =
        (currentScrollOffset + containerHeight) / totalHeight;

      return scrollPercentage >= loadMoreThreshold;
    },
    [
      enableInfiniteScroll,
      itemCount,
      itemHeight,
      containerHeight,
      loadMoreThreshold,
    ],
  );

  // Scroll to specific index
  const scrollToIndex = useCallback(
    (index: number) => {
      const clampedIndex = Math.max(0, Math.min(index, itemCount - 1));
      const targetOffset = clampedIndex * itemHeight;
      handleScroll(targetOffset);
    },
    [itemCount, itemHeight, handleScroll],
  );

  // Reset scroll calculations after data changes
  const resetAfterIndex = useCallback((index: number) => {
    // Force recalculation of visible range
    setScrollOffset((prev) => prev); // Trigger re-render
  }, []);

  // Get current scroll offset
  const getScrollOffset = useCallback(() => {
    return scrollOffset;
  }, [scrollOffset]);

  // Performance optimization: Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Performance monitoring in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const visibleItems = visibleEndIndex - visibleStartIndex + 1;
      const totalItems = itemCount;
      const optimizationRatio = visibleItems / totalItems;

      console.debug('Virtual Scroll Optimization:', {
        totalItems,
        visibleItems,
        optimizationRatio: `${(optimizationRatio * 100).toFixed(1)}%`,
        scrollOffset,
        isScrolling,
      });
    }
  }, [
    visibleStartIndex,
    visibleEndIndex,
    itemCount,
    scrollOffset,
    isScrolling,
  ]);

  return {
    virtualizedHeight,
    visibleStartIndex,
    visibleEndIndex,
    shouldLoadMore,
    scrollToIndex,
    resetAfterIndex,
    getScrollOffset,
    isScrolling,
  };
}

// Additional hook for advanced virtual scroll performance monitoring
export function useVirtualScrollPerformance() {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    scrollFPS: 0,
    memoryUsage: 0,
    visibleItemsCount: 0,
  });

  const frameTimeRef = useRef<number[]>([]);
  const lastFrameTime = useRef<number>(0);

  const recordFrame = useCallback(() => {
    const now = performance.now();

    if (lastFrameTime.current > 0) {
      const frameTime = now - lastFrameTime.current;
      frameTimeRef.current.push(frameTime);

      // Keep only last 60 frame times (1 second at 60fps)
      if (frameTimeRef.current.length > 60) {
        frameTimeRef.current = frameTimeRef.current.slice(-60);
      }

      // Calculate average FPS
      const avgFrameTime =
        frameTimeRef.current.reduce((a, b) => a + b) /
        frameTimeRef.current.length;
      const fps = Math.round(1000 / avgFrameTime);

      setMetrics((prev) => ({
        ...prev,
        scrollFPS: fps,
        renderTime: avgFrameTime,
      }));
    }

    lastFrameTime.current = now;
  }, []);

  const recordMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      setMetrics((prev) => ({
        ...prev,
        memoryUsage: memInfo.usedJSHeapSize,
      }));
    }
  }, []);

  const recordVisibleItems = useCallback((count: number) => {
    setMetrics((prev) => ({
      ...prev,
      visibleItemsCount: count,
    }));
  }, []);

  return {
    metrics,
    recordFrame,
    recordMemoryUsage,
    recordVisibleItems,
  };
}

// Hook for optimizing large dataset rendering
export function useLargeDatasetOptimization<T>(
  data: T[],
  pageSize: number = 100,
  preloadPages: number = 1,
) {
  const [visibleData, setVisibleData] = useState<T[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const totalPages = Math.ceil(data.length / pageSize);

  const loadPage = useCallback(
    async (page: number) => {
      if (page < 0 || page >= totalPages) return;

      setIsLoading(true);

      // Simulate async loading delay for large datasets
      await new Promise((resolve) => setTimeout(resolve, 1));

      const startIndex = page * pageSize;
      const endIndex = Math.min(startIndex + pageSize, data.length);
      const pageData = data.slice(startIndex, endIndex);

      setVisibleData((prev) => {
        const newData = [...prev];
        // Replace data at the specific page position
        pageData.forEach((item, index) => {
          newData[startIndex + index] = item;
        });
        return newData;
      });

      setIsLoading(false);
    },
    [data, pageSize, totalPages],
  );

  const preloadAdjacentPages = useCallback(
    async (centerPage: number) => {
      const pagesToLoad = [];

      for (let i = -preloadPages; i <= preloadPages; i++) {
        const page = centerPage + i;
        if (page >= 0 && page < totalPages && page !== currentPage) {
          pagesToLoad.push(loadPage(page));
        }
      }

      await Promise.all(pagesToLoad);
    },
    [currentPage, preloadPages, totalPages, loadPage],
  );

  useEffect(() => {
    if (data.length > 0) {
      loadPage(0);
      preloadAdjacentPages(0);
    }
  }, [data, loadPage, preloadAdjacentPages]);

  return {
    visibleData,
    totalPages,
    currentPage,
    isLoading,
    loadPage,
    preloadAdjacentPages,
  };
}
