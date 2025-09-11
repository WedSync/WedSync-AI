/**
 * Performance Optimization Utilities
 * Bundle size optimization and runtime performance enhancements
 */

import { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { debounce, throttle } from 'lodash-es';

// Virtual scrolling for large datasets
export function useVirtualScrolling<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5,
) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const visibleItemsRange = useMemo(() => {
    const startIndex = Math.max(
      0,
      Math.floor(scrollTop / itemHeight) - overscan,
    );
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan,
    );

    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    const { startIndex, endIndex } = visibleItemsRange;
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
    }));
  }, [items, visibleItemsRange]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleItemsRange.startIndex * itemHeight;

  const handleScroll = useCallback(
    throttle((e: Event) => {
      const target = e.target as HTMLDivElement;
      setScrollTop(target.scrollTop);
    }, 16), // ~60fps
    [],
  );

  useEffect(() => {
    const element = scrollElementRef.current;
    if (element) {
      element.addEventListener('scroll', handleScroll, { passive: true });
      return () => element.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  return {
    scrollElementRef,
    visibleItems,
    totalHeight,
    offsetY,
    visibleItemsRange,
  };
}

// Debounced search for filtering
export function useDebouncedSearch(
  searchTerm: string,
  delay: number = 300,
): string {
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, delay]);

  return debouncedSearchTerm;
}

// Intersection Observer for lazy loading
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {},
): IntersectionObserverEntry | null {
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setEntry(entry);
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      },
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
      observer.disconnect();
    };
  }, [ref, options]);

  return entry;
}

// Memory-efficient data processing
export class DataProcessor {
  private static chunkSize = 100;

  static async processInChunks<T, R>(
    data: T[],
    processor: (chunk: T[]) => R[],
    onProgress?: (progress: number) => void,
  ): Promise<R[]> {
    const results: R[] = [];
    const totalChunks = Math.ceil(data.length / this.chunkSize);

    for (let i = 0; i < data.length; i += this.chunkSize) {
      const chunk = data.slice(i, i + this.chunkSize);
      const chunkResults = processor(chunk);
      results.push(...chunkResults);

      // Allow other tasks to run
      await new Promise((resolve) => setTimeout(resolve, 0));

      if (onProgress) {
        const progress = (i / this.chunkSize + 1) / totalChunks;
        onProgress(Math.min(progress * 100, 100));
      }
    }

    return results;
  }
}

// Performance monitoring
export class PerformanceMonitor {
  private static metrics = new Map<string, number[]>();

  static startTiming(label: string): () => void {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      if (!this.metrics.has(label)) {
        this.metrics.set(label, []);
      }

      const labelMetrics = this.metrics.get(label)!;
      labelMetrics.push(duration);

      // Keep only last 100 measurements
      if (labelMetrics.length > 100) {
        labelMetrics.shift();
      }

      // Log slow operations (> 500ms)
      if (duration > 500) {
        console.warn(
          `Slow operation detected: ${label} took ${duration.toFixed(2)}ms`,
        );
      }
    };
  }

  static getMetrics(label: string) {
    const measurements = this.metrics.get(label) || [];
    if (measurements.length === 0) return null;

    const sorted = [...measurements].sort((a, b) => a - b);
    const sum = measurements.reduce((a, b) => a + b, 0);

    return {
      count: measurements.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / measurements.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p90: sorted[Math.floor(sorted.length * 0.9)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
    };
  }

  static getAllMetrics() {
    const result: Record<string, any> = {};
    for (const [label] of this.metrics) {
      result[label] = this.getMetrics(label);
    }
    return result;
  }

  static clearMetrics() {
    this.metrics.clear();
  }
}

// Cache management for API responses
export class APICache {
  private static cache = new Map<
    string,
    { data: any; timestamp: number; ttl: number }
  >();
  private static maxSize = 100;

  static set(key: string, data: any, ttl: number = 5 * 60 * 1000): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = Array.from(this.cache.entries()).sort(
        ([, a], [, b]) => a.timestamp - b.timestamp,
      )[0][0];
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  static get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  static has(key: string): boolean {
    return this.get(key) !== null;
  }

  static delete(key: string): void {
    this.cache.delete(key);
  }

  static clear(): void {
    this.cache.clear();
  }

  static size(): number {
    return this.cache.size;
  }
}

// Image optimization utilities
export function optimizeImageLoading() {
  // Preload critical images
  const preloadImage = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = src;
    });
  };

  // Lazy load images with intersection observer
  const setupLazyLoading = () => {
    const images = document.querySelectorAll('img[data-src]');

    const imageObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            img.src = img.dataset.src!;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
        });
      },
      {
        rootMargin: '50px',
      },
    );

    images.forEach((img) => imageObserver.observe(img));
  };

  return { preloadImage, setupLazyLoading };
}

// Bundle analysis utilities
export function getBundleInfo() {
  if (typeof window === 'undefined') return null;

  const scripts = Array.from(document.querySelectorAll('script[src]'));
  const styles = Array.from(
    document.querySelectorAll('link[rel="stylesheet"]'),
  );

  const scriptSizes = scripts.map((script) => ({
    src: (script as HTMLScriptElement).src,
    size: 'unknown', // Would need server-side info for actual sizes
  }));

  const styleSizes = styles.map((style) => ({
    href: (style as HTMLLinkElement).href,
    size: 'unknown',
  }));

  return {
    scripts: scriptSizes,
    styles: styleSizes,
    totalScripts: scripts.length,
    totalStyles: styles.length,
  };
}

// React performance hooks
export function useOptimizedState<T>(
  initialState: T,
  equality?: (prev: T, next: T) => boolean,
): [T, (newState: T) => void] {
  const [state, setState] = useState<T>(initialState);

  const optimizedSetState = useCallback(
    (newState: T) => {
      setState((prevState) => {
        // Use custom equality function or shallow comparison
        const areEqual = equality
          ? equality(prevState, newState)
          : prevState === newState;

        return areEqual ? prevState : newState;
      });
    },
    [equality],
  );

  return [state, optimizedSetState];
}

export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
): T {
  const callbackRef = useRef<T>(callback);
  callbackRef.current = callback;

  return useCallback(
    ((...args: any[]) => {
      return callbackRef.current(...args);
    }) as T,
    [],
  );
}

// Memory leak prevention
export class MemoryLeakPrevention {
  private static activeSubscriptions = new Set<() => void>();
  private static activeTimeouts = new Set<NodeJS.Timeout>();
  private static activeIntervals = new Set<NodeJS.Timeout>();

  static addSubscription(cleanup: () => void): void {
    this.activeSubscriptions.add(cleanup);
  }

  static removeSubscription(cleanup: () => void): void {
    this.activeSubscriptions.delete(cleanup);
  }

  static addTimeout(id: NodeJS.Timeout): void {
    this.activeTimeouts.add(id);
  }

  static addInterval(id: NodeJS.Timeout): void {
    this.activeIntervals.add(id);
  }

  static clearAllTimeouts(): void {
    this.activeTimeouts.forEach(clearTimeout);
    this.activeTimeouts.clear();
  }

  static clearAllIntervals(): void {
    this.activeIntervals.forEach(clearInterval);
    this.activeIntervals.clear();
  }

  static cleanupAll(): void {
    this.activeSubscriptions.forEach((cleanup) => cleanup());
    this.activeSubscriptions.clear();
    this.clearAllTimeouts();
    this.clearAllIntervals();
  }
}

// Web Worker utilities for heavy computations
export function createWebWorker(workerScript: string): Worker | null {
  if (typeof Worker === 'undefined') {
    console.warn('Web Workers are not supported in this environment');
    return null;
  }

  try {
    return new Worker(workerScript);
  } catch (error) {
    console.error('Failed to create Web Worker:', error);
    return null;
  }
}

// Service Worker utilities for caching
export async function registerServiceWorker(
  swPath: string = '/sw.js',
): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers are not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(swPath);
    console.log('Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

// Export performance utilities
export { debounce, throttle };
