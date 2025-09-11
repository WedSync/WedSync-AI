/**
 * WS-145: Mobile Performance Optimizations
 * Touch optimization, adaptive loading, and mobile-specific performance enhancements
 */

import { useEffect, useState } from 'react';

// Mobile performance configuration
export const MOBILE_PERFORMANCE_CONFIG = {
  touchDelay: 50, // 50ms max touch delay
  scrollThrottle: 16, // 60fps scroll throttling
  imageLoadDelay: 100, // Stagger image loading
  chunkLoadSize: 5, // Load items in chunks
  virtualScrollBuffer: 3, // Virtual scroll buffer size
  intersectionThreshold: 0.1, // Intersection observer threshold
} as const;

// Device detection utilities
export const DeviceDetector = {
  isMobile(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      ) || window.innerWidth < 768
    );
  },

  isSlowDevice(): boolean {
    if (typeof window === 'undefined') return false;
    // Check for low-end device indicators
    const connection = (navigator as any).connection;
    const isSlowConnection =
      connection?.effectiveType === '2g' ||
      connection?.effectiveType === 'slow-2g';
    const hasLowMemory = (navigator as any).deviceMemory < 4;
    const hasFewCores = navigator.hardwareConcurrency < 4;

    return isSlowConnection || hasLowMemory || hasFewCores;
  },

  getConnectionType(): string {
    if (typeof navigator === 'undefined') return 'unknown';
    const connection = (navigator as any).connection;
    return connection?.effectiveType || 'unknown';
  },

  supportsWebP(): boolean {
    if (typeof window === 'undefined') return false;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('image/webp') === 5;
  },
};

// Touch optimization hooks
export function useTouchOptimization() {
  useEffect(() => {
    if (!DeviceDetector.isMobile()) return;

    // Add passive event listeners for better scroll performance
    const options = { passive: true, capture: false };

    // Optimize touch events
    const touchHandler = (e: TouchEvent) => {
      // Prevent 300ms delay on touch
      if (e.type === 'touchstart') {
        e.preventDefault();
      }
    };

    document.addEventListener('touchstart', touchHandler, options);
    document.addEventListener('touchmove', () => {}, options);
    document.addEventListener('wheel', () => {}, options);

    // Add will-change to scrollable elements
    const scrollables = document.querySelectorAll('[data-scrollable]');
    scrollables.forEach((el) => {
      (el as HTMLElement).style.willChange = 'scroll-position';
    });

    return () => {
      document.removeEventListener('touchstart', touchHandler);
      scrollables.forEach((el) => {
        (el as HTMLElement).style.willChange = 'auto';
      });
    };
  }, []);
}

// Adaptive loading based on device capabilities
export function useAdaptiveLoading() {
  const [loadingStrategy, setLoadingStrategy] = useState<
    'aggressive' | 'balanced' | 'conservative'
  >('balanced');

  useEffect(() => {
    const isSlowDevice = DeviceDetector.isSlowDevice();
    const connectionType = DeviceDetector.getConnectionType();

    if (
      isSlowDevice ||
      connectionType === '2g' ||
      connectionType === 'slow-2g'
    ) {
      setLoadingStrategy('conservative');
    } else if (connectionType === '4g') {
      setLoadingStrategy('aggressive');
    } else {
      setLoadingStrategy('balanced');
    }
  }, []);

  return {
    loadingStrategy,
    shouldLazyLoad: loadingStrategy !== 'aggressive',
    shouldReduceMotion: loadingStrategy === 'conservative',
    imageQuality: loadingStrategy === 'conservative' ? 'low' : 'high',
    prefetchCount:
      loadingStrategy === 'aggressive'
        ? 5
        : loadingStrategy === 'balanced'
          ? 3
          : 1,
  };
}

// Virtual scrolling for long lists
export class VirtualScroller {
  private container: HTMLElement;
  private items: any[];
  private itemHeight: number;
  private visibleCount: number;
  private bufferSize: number;
  private scrollTop: number = 0;
  private startIndex: number = 0;
  private endIndex: number = 0;

  constructor(
    container: HTMLElement,
    items: any[],
    itemHeight: number,
    visibleCount: number,
    bufferSize: number = MOBILE_PERFORMANCE_CONFIG.virtualScrollBuffer,
  ) {
    this.container = container;
    this.items = items;
    this.itemHeight = itemHeight;
    this.visibleCount = visibleCount;
    this.bufferSize = bufferSize;

    this.init();
  }

  private init() {
    this.container.addEventListener('scroll', this.handleScroll.bind(this), {
      passive: true,
    });
    this.update();
  }

  private handleScroll = throttle(() => {
    this.scrollTop = this.container.scrollTop;
    this.update();
  }, MOBILE_PERFORMANCE_CONFIG.scrollThrottle);

  private update() {
    this.startIndex = Math.max(
      0,
      Math.floor(this.scrollTop / this.itemHeight) - this.bufferSize,
    );
    this.endIndex = Math.min(
      this.items.length,
      this.startIndex + this.visibleCount + this.bufferSize * 2,
    );

    this.render();
  }

  private render() {
    // Virtual rendering logic
    const visibleItems = this.items.slice(this.startIndex, this.endIndex);
    // Render only visible items with proper transforms
  }

  public getVisibleItems() {
    return this.items.slice(this.startIndex, this.endIndex);
  }

  public destroy() {
    this.container.removeEventListener('scroll', this.handleScroll);
  }
}

// Intersection Observer for lazy loading
export function useLazyLoading(
  ref: React.RefObject<HTMLElement>,
  onIntersect: () => void,
  options?: IntersectionObserverInit,
) {
  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            onIntersect();
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: MOBILE_PERFORMANCE_CONFIG.intersectionThreshold,
        rootMargin: '50px',
        ...options,
      },
    );

    observer.observe(ref.current);

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [ref, onIntersect]);
}

// Progressive image loading
export class ProgressiveImageLoader {
  private queue: Array<{ src: string; element: HTMLImageElement }> = [];
  private loading = false;
  private batchSize = MOBILE_PERFORMANCE_CONFIG.chunkLoadSize;

  addImage(src: string, element: HTMLImageElement) {
    this.queue.push({ src, element });
    this.processQueue();
  }

  private async processQueue() {
    if (this.loading || this.queue.length === 0) return;

    this.loading = true;
    const batch = this.queue.splice(0, this.batchSize);

    await Promise.all(
      batch.map(({ src, element }) => this.loadImage(src, element)),
    );

    this.loading = false;

    // Process next batch after delay
    if (this.queue.length > 0) {
      setTimeout(
        () => this.processQueue(),
        MOBILE_PERFORMANCE_CONFIG.imageLoadDelay,
      );
    }
  }

  private loadImage(src: string, element: HTMLImageElement): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        element.src = src;
        element.classList.add('loaded');
        resolve();
      };
      img.onerror = () => resolve();

      // Use appropriate format based on device support
      if (DeviceDetector.supportsWebP() && !src.includes('.webp')) {
        img.src = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      } else {
        img.src = src;
      }
    });
  }
}

// Request Idle Callback polyfill for older mobile browsers
export const requestIdleCallback =
  (typeof window !== 'undefined' && window.requestIdleCallback) ||
  function (callback: IdleRequestCallback) {
    const start = Date.now();
    return setTimeout(() => {
      callback({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
      } as IdleDeadline);
    }, 1);
  };

// Throttle function for performance
function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  let lastFunc: ReturnType<typeof setTimeout>;
  let lastRan: number;

  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      lastRan = Date.now();
      inThrottle = true;
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(
        () => {
          if (Date.now() - lastRan >= limit) {
            func.apply(this, args);
            lastRan = Date.now();
          }
        },
        Math.max(limit - (Date.now() - lastRan), 0),
      );
    }
  };
}

// Debounce function for performance
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;

  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Mobile-specific performance monitoring
export class MobilePerformanceMonitor {
  private static instance: MobilePerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): MobilePerformanceMonitor {
    if (!MobilePerformanceMonitor.instance) {
      MobilePerformanceMonitor.instance = new MobilePerformanceMonitor();
    }
    return MobilePerformanceMonitor.instance;
  }

  measureTouch(eventName: string, duration: number) {
    if (!this.metrics.has(eventName)) {
      this.metrics.set(eventName, []);
    }
    this.metrics.get(eventName)!.push(duration);

    // Alert if touch response is slow
    if (duration > MOBILE_PERFORMANCE_CONFIG.touchDelay) {
      console.warn(`Slow touch response for ${eventName}: ${duration}ms`);
    }
  }

  measureScroll(fps: number) {
    if (!this.metrics.has('scroll_fps')) {
      this.metrics.set('scroll_fps', []);
    }
    this.metrics.get('scroll_fps')!.push(fps);

    // Alert if scroll FPS drops below 30
    if (fps < 30) {
      console.warn(`Low scroll FPS detected: ${fps}`);
    }
  }

  getMetrics() {
    const report: Record<string, any> = {};

    this.metrics.forEach((values, key) => {
      report[key] = {
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length,
      };
    });

    return report;
  }

  reset() {
    this.metrics.clear();
  }
}

// Export singleton instance
export const mobilePerformanceMonitor = MobilePerformanceMonitor.getInstance();

// React hook for mobile performance optimization
export function useMobilePerformance() {
  const [isMobile, setIsMobile] = useState(false);
  const [isSlowDevice, setIsSlowDevice] = useState(false);

  useEffect(() => {
    setIsMobile(DeviceDetector.isMobile());
    setIsSlowDevice(DeviceDetector.isSlowDevice());
  }, []);

  // Apply optimizations
  useTouchOptimization();
  const adaptiveLoading = useAdaptiveLoading();

  return {
    isMobile,
    isSlowDevice,
    ...adaptiveLoading,
    imageLoader: new ProgressiveImageLoader(),
    requestIdleCallback,
    debounce,
    throttle,
  };
}
