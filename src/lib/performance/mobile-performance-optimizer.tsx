'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// Types
interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay  
  cls: number | null; // Cumulative Layout Shift
  
  // Additional metrics
  fcp: number | null; // First Contentful Paint
  ttfb: number | null; // Time to First Byte
  domLoad: number | null; // DOM Load Time
  
  // Mobile-specific
  networkType: string;
  effectiveType: string;
  deviceMemory: number | null;
  isSlowDevice: boolean;
  isSlowNetwork: boolean;
}

interface PerformanceConfig {
  enableLazyLoading: boolean;
  enableImageOptimization: boolean;
  enablePrefetching: boolean;
  enableServiceWorker: boolean;
  maxBundleSize: number; // KB
  criticalResourceTimeout: number; // ms
  adaptToNetwork: boolean;
  adaptToDevice: boolean;
}

// Default configuration
const DEFAULT_CONFIG: PerformanceConfig = {
  enableLazyLoading: true,
  enableImageOptimization: true,
  enablePrefetching: true,
  enableServiceWorker: true,
  maxBundleSize: 250, // 250KB initial bundle
  criticalResourceTimeout: 3000, // 3 seconds
  adaptToNetwork: true,
  adaptToDevice: true,
};

// Performance Metrics Collection
class PerformanceMetricsCollector {
  private metrics: Partial<PerformanceMetrics> = {};
  private observers: Map<string, PerformanceObserver> = new Map();

  constructor() {
    this.initializeMetrics();
  }

  private initializeMetrics() {
    // Network information
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.metrics.networkType = connection?.type || 'unknown';
      this.metrics.effectiveType = connection?.effectiveType || 'unknown';
      this.metrics.isSlowNetwork = ['slow-2g', '2g'].includes(connection?.effectiveType);
    }

    // Device memory
    if ('deviceMemory' in navigator) {
      this.metrics.deviceMemory = (navigator as any).deviceMemory;
      this.metrics.isSlowDevice = (navigator as any).deviceMemory < 4; // Less than 4GB RAM
    }

    // Performance observers
    this.setupPerformanceObservers();
  }

  private setupPerformanceObservers() {
    // Core Web Vitals
    if ('PerformanceObserver' in window) {
      // LCP Observer
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        this.metrics.lcp = lastEntry?.renderTime || lastEntry?.loadTime;
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.set('lcp', lcpObserver);

      // FID Observer
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.metrics.fid = entry.processingStart - entry.startTime;
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.set('fid', fidObserver);

      // CLS Observer
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.metrics.cls = clsValue;
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.set('cls', clsObserver);

      // Paint timing
      const paintObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.fcp = entry.startTime;
          }
        });
      });
      paintObserver.observe({ entryTypes: ['paint'] });
      this.observers.set('paint', paintObserver);
    }

    // Navigation timing
    if ('performance' in window && 'getEntriesByType' in performance) {
      setTimeout(() => {
        const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navTiming) {
          this.metrics.ttfb = navTiming.responseStart - navTiming.requestStart;
          this.metrics.domLoad = navTiming.domContentLoadedEventEnd - navTiming.domContentLoadedEventStart;
        }
      }, 1000);
    }
  }

  getMetrics(): PerformanceMetrics {
    return {
      lcp: this.metrics.lcp || null,
      fid: this.metrics.fid || null,
      cls: this.metrics.cls || null,
      fcp: this.metrics.fcp || null,
      ttfb: this.metrics.ttfb || null,
      domLoad: this.metrics.domLoad || null,
      networkType: this.metrics.networkType || 'unknown',
      effectiveType: this.metrics.effectiveType || 'unknown',
      deviceMemory: this.metrics.deviceMemory || null,
      isSlowDevice: this.metrics.isSlowDevice || false,
      isSlowNetwork: this.metrics.isSlowNetwork || false,
    };
  }

  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

// Resource Loading Optimizer
class ResourceLoadingOptimizer {
  private config: PerformanceConfig;
  private criticalResources: Set<string> = new Set();
  private preloadedResources: Set<string> = new Set();

  constructor(config: PerformanceConfig) {
    this.config = config;
  }

  // Mark resource as critical for priority loading
  markCritical(resourceUrl: string) {
    this.criticalResources.add(resourceUrl);
    this.preloadResource(resourceUrl, 'high');
  }

  // Preload resource with priority
  preloadResource(resourceUrl: string, priority: 'low' | 'high' = 'low') {
    if (this.preloadedResources.has(resourceUrl)) return;
    
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = resourceUrl;
    
    // Determine resource type from URL
    if (resourceUrl.match(/\.(css)$/i)) {
      link.as = 'style';
    } else if (resourceUrl.match(/\.(js)$/i)) {
      link.as = 'script';
    } else if (resourceUrl.match(/\.(woff2?|ttf|eot)$/i)) {
      link.as = 'font';
      link.crossOrigin = 'anonymous';
    } else if (resourceUrl.match(/\.(jpg|jpeg|png|webp|svg)$/i)) {
      link.as = 'image';
    }

    // Set priority
    if ('fetchPriority' in link) {
      (link as any).fetchPriority = priority;
    }

    document.head.appendChild(link);
    this.preloadedResources.add(resourceUrl);
  }

  // Lazy load images
  setupLazyImages() {
    if (!this.config.enableLazyLoading) return;

    const imageObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.classList.remove('lazy');
              imageObserver.unobserve(img);
            }
          }
        });
      },
      { 
        rootMargin: '50px 0px',
        threshold: 0.01
      }
    );

    // Observe all lazy images
    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }

  // Prefetch next-page resources
  prefetchNextPageResources(urls: string[]) {
    if (!this.config.enablePrefetching) return;

    urls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      document.head.appendChild(link);
    });
  }

  // Network-aware loading
  shouldLoadResource(resourceSize: number): boolean {
    if (!this.config.adaptToNetwork) return true;

    const connection = (navigator as any).connection;
    if (!connection) return true;

    // Don't load large resources on slow networks
    if (['slow-2g', '2g'].includes(connection.effectiveType) && resourceSize > 100000) {
      return false;
    }

    return true;
  }
}

// Bundle Splitting Utilities
export class BundleSplittingOptimizer {
  private loadedChunks: Set<string> = new Set();

  // Dynamic import with error handling
  async loadChunk<T>(importFn: () => Promise<T>, chunkName: string): Promise<T | null> {
    if (this.loadedChunks.has(chunkName)) {
      return importFn();
    }

    try {
      const module = await importFn();
      this.loadedChunks.add(chunkName);
      return module;
    } catch (error) {
      console.warn(`Failed to load chunk: ${chunkName}`, error);
      return null;
    }
  }

  // Load component dynamically
  async loadComponent(componentName: string) {
    const componentMap: Record<string, () => Promise<any>> = {
      'PhotoGroupsMobile': () => import('../components/wedme/PhotoGroupsMobile'),
      'MobileGroupBuilder': () => import('../components/wedme/MobileGroupBuilder'),
      'MobileGuestAssignment': () => import('../components/wedme/MobileGuestAssignment'),
      'QuickShareModal': () => import('../components/wedme/QuickShareModal'),
      'OfflinePhotoGroupEditor': () => import('../components/wedme/OfflinePhotoGroupEditor'),
      'MobileConflictDetection': () => import('../components/wedme/MobileConflictDetection'),
    };

    return this.loadChunk(componentMap[componentName], componentName);
  }
}

// Hook for using mobile performance optimization
export function useMobilePerformance(config: Partial<PerformanceConfig> = {}) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isOptimized, setIsOptimized] = useState(false);
  const metricsCollector = useRef<PerformanceMetricsCollector | null>(null);
  const resourceOptimizer = useRef<ResourceLoadingOptimizer | null>(null);
  const bundleOptimizer = useRef<BundleSplittingOptimizer | null>(null);

  const finalConfig: PerformanceConfig = { ...DEFAULT_CONFIG, ...config };

  // Initialize performance optimization
  useEffect(() => {
    metricsCollector.current = new PerformanceMetricsCollector();
    resourceOptimizer.current = new ResourceLoadingOptimizer(finalConfig);
    bundleOptimizer.current = new BundleSplittingOptimizer();

    // Setup lazy loading
    if (finalConfig.enableLazyLoading) {
      resourceOptimizer.current.setupLazyImages();
    }

    // Collect initial metrics
    const collectMetrics = () => {
      if (metricsCollector.current) {
        setMetrics(metricsCollector.current.getMetrics());
      }
    };

    // Collect metrics periodically
    const metricsInterval = setInterval(collectMetrics, 2000);
    
    // Initial collection
    setTimeout(collectMetrics, 1000);

    setIsOptimized(true);

    return () => {
      clearInterval(metricsInterval);
      if (metricsCollector.current) {
        metricsCollector.current.cleanup();
      }
    };
  }, []);

  // Performance utilities
  const preloadResource = useCallback((url: string, priority: 'low' | 'high' = 'low') => {
    resourceOptimizer.current?.preloadResource(url, priority);
  }, []);

  const markCritical = useCallback((url: string) => {
    resourceOptimizer.current?.markCritical(url);
  }, []);

  const prefetchPages = useCallback((urls: string[]) => {
    resourceOptimizer.current?.prefetchNextPageResources(urls);
  }, []);

  const loadComponent = useCallback((componentName: string) => {
    return bundleOptimizer.current?.loadComponent(componentName) || null;
  }, []);

  // Performance status
  const getPerformanceStatus = useCallback(() => {
    if (!metrics) return 'measuring';

    const issues = [];
    
    // Check Core Web Vitals
    if (metrics.lcp && metrics.lcp > 2500) issues.push('LCP too slow');
    if (metrics.fid && metrics.fid > 100) issues.push('FID too slow');
    if (metrics.cls && metrics.cls > 0.1) issues.push('CLS too high');
    
    // Check mobile-specific issues
    if (metrics.isSlowNetwork && metrics.ttfb && metrics.ttfb > 1000) {
      issues.push('Slow network detected');
    }
    
    if (metrics.isSlowDevice && metrics.domLoad && metrics.domLoad > 1000) {
      issues.push('Slow device detected');
    }

    return issues.length === 0 ? 'good' : 'needs-improvement';
  }, [metrics]);

  // Adaptive loading strategy
  const shouldLoadResource = useCallback((size: number) => {
    return resourceOptimizer.current?.shouldLoadResource(size) ?? true;
  }, []);

  return {
    metrics,
    isOptimized,
    preloadResource,
    markCritical,
    prefetchPages,
    loadComponent,
    getPerformanceStatus,
    shouldLoadResource,
    config: finalConfig,
  };
}

// Performance monitoring component
export function PerformanceMonitor({ 
  showInProduction = false,
  onMetricsUpdate,
}: {
  showInProduction?: boolean;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}) {
  const { metrics, getPerformanceStatus } = useMobilePerformance();

  useEffect(() => {
    if (metrics && onMetricsUpdate) {
      onMetricsUpdate(metrics);
    }
  }, [metrics, onMetricsUpdate]);

  if (!metrics) return null;
  if (!showInProduction && process.env.NODE_ENV === 'production') return null;

  const status = getPerformanceStatus();

  return (
    <div className="fixed bottom-20 left-4 bg-black bg-opacity-90 text-white text-xs p-3 rounded-lg font-mono max-w-xs z-50">
      <div className="mb-2">
        <strong>Performance Monitor</strong>
        <div className={`inline-block ml-2 w-2 h-2 rounded-full ${
          status === 'good' ? 'bg-green-400' : 
          status === 'needs-improvement' ? 'bg-yellow-400' : 'bg-gray-400'
        }`}></div>
      </div>
      
      <div className="space-y-1">
        <div>LCP: {metrics.lcp ? `${Math.round(metrics.lcp)}ms` : 'N/A'}</div>
        <div>FID: {metrics.fid ? `${Math.round(metrics.fid)}ms` : 'N/A'}</div>
        <div>CLS: {metrics.cls ? metrics.cls.toFixed(3) : 'N/A'}</div>
        <div>TTFB: {metrics.ttfb ? `${Math.round(metrics.ttfb)}ms` : 'N/A'}</div>
      </div>
      
      <div className="border-t border-gray-600 pt-1 mt-2">
        <div>Net: {metrics.effectiveType}</div>
        <div>RAM: {metrics.deviceMemory ? `${metrics.deviceMemory}GB` : 'N/A'}</div>
        {(metrics.isSlowNetwork || metrics.isSlowDevice) && (
          <div className="text-yellow-400">⚠️ Limited resources</div>
        )}
      </div>
    </div>
  );
}

// Image optimization utilities
export const optimizeImage = (src: string, width?: number, quality: number = 85) => {
  // For production, this would integrate with image CDN
  // For now, return original src with query parameters
  const params = new URLSearchParams();
  if (width) params.append('w', width.toString());
  params.append('q', quality.toString());
  
  return `${src}?${params.toString()}`;
};

// Service Worker registration
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered:', registration);
      return registration;
    } catch (error) {
      console.log('SW registration failed:', error);
    }
  }
};

// Critical resource timeout
export const withTimeout = <T>(promise: Promise<T>, timeout: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Resource loading timeout')), timeout)
    )
  ]);
};