'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { MobileFieldConfig, DEFAULT_MOBILE_CONFIG } from './types';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  cacheHitRatio: number;
  networkLatency: number;
  touchResponseTime: number;
  batteryLevel?: number;
}

interface MobileFieldPerformanceContextType {
  config: MobileFieldConfig;
  metrics: PerformanceMetrics;
  isLowPowerMode: boolean;
  optimizeForBattery: (enable: boolean) => void;
  clearCache: () => void;
  preloadFields: (fieldKeys: string[]) => void;
  updateConfig: (newConfig: Partial<MobileFieldConfig>) => void;
}

const MobileFieldPerformanceContext =
  createContext<MobileFieldPerformanceContextType | null>(null);

interface MobileFieldPerformanceProviderProps {
  children: React.ReactNode;
  config?: Partial<MobileFieldConfig>;
  enableMetrics?: boolean;
}

export function MobileFieldPerformanceProvider({
  children,
  config = {},
  enableMetrics = true,
}: MobileFieldPerformanceProviderProps) {
  const [performanceConfig, setPerformanceConfig] = useState<MobileFieldConfig>(
    {
      ...DEFAULT_MOBILE_CONFIG,
      ...config,
    },
  );

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    cacheHitRatio: 0,
    networkLatency: 0,
    touchResponseTime: 0,
  });

  const [isLowPowerMode, setIsLowPowerMode] = useState(false);
  const [fieldCache, setFieldCache] = useState<Map<string, any>>(new Map());
  const [preloadQueue, setPreloadQueue] = useState<Set<string>>(new Set());

  // Monitor device performance
  useEffect(() => {
    if (!enableMetrics) return;

    const monitorPerformance = () => {
      // Memory usage monitoring
      if ('memory' in performance) {
        const memInfo = (performance as any).memory;
        setMetrics((prev) => ({
          ...prev,
          memoryUsage: memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit,
        }));
      }

      // Battery monitoring
      if ('getBattery' in navigator) {
        (navigator as any).getBattery().then((battery: any) => {
          setMetrics((prev) => ({
            ...prev,
            batteryLevel: battery.level,
          }));

          // Enable low power mode if battery is low
          if (battery.level < 0.2) {
            setIsLowPowerMode(true);
          }
        });
      }

      // Connection speed monitoring
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        const isSlowConnection =
          connection.effectiveType === '2g' ||
          connection.effectiveType === 'slow-2g';

        if (isSlowConnection) {
          setIsLowPowerMode(true);
        }
      }
    };

    monitorPerformance();
    const interval = setInterval(monitorPerformance, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [enableMetrics]);

  // Auto-optimize for low power mode
  useEffect(() => {
    if (isLowPowerMode) {
      setPerformanceConfig((prev) => ({
        ...prev,
        autoSaveInterval: 5000, // Increase to 5 seconds
        enableTouchOptimizations: false, // Reduce animations
        enableVirtualization: true, // Enable virtualization for better performance
      }));
    }
  }, [isLowPowerMode]);

  // Cache management
  useEffect(() => {
    if (fieldCache.size > performanceConfig.maxCacheSize) {
      // Remove oldest entries
      const entries = Array.from(fieldCache.entries());
      const toRemove = entries.slice(
        0,
        entries.length - performanceConfig.maxCacheSize,
      );

      setFieldCache((prev) => {
        const newCache = new Map(prev);
        toRemove.forEach(([key]) => newCache.delete(key));
        return newCache;
      });
    }
  }, [fieldCache.size, performanceConfig.maxCacheSize]);

  const optimizeForBattery = useCallback(
    (enable: boolean) => {
      setIsLowPowerMode(enable);

      if (enable) {
        // Reduce performance-intensive features
        setPerformanceConfig((prev) => ({
          ...prev,
          autoSaveInterval: 10000, // Reduce network requests
          enableTouchOptimizations: false, // Reduce animations
          enableVirtualization: true, // Enable virtualization
        }));
      } else {
        // Restore full performance
        setPerformanceConfig({
          ...DEFAULT_MOBILE_CONFIG,
          ...config,
        });
      }
    },
    [config],
  );

  const clearCache = useCallback(() => {
    setFieldCache(new Map());
    setPreloadQueue(new Set());

    // Update cache hit ratio
    setMetrics((prev) => ({
      ...prev,
      cacheHitRatio: 0,
    }));
  }, []);

  const preloadFields = useCallback(
    (fieldKeys: string[]) => {
      if (isLowPowerMode) return; // Skip preloading in low power mode

      setPreloadQueue((prev) => {
        const newQueue = new Set(prev);
        fieldKeys.forEach((key) => newQueue.add(key));
        return newQueue;
      });

      // Simulate preloading (in real implementation, this would fetch field definitions)
      fieldKeys.forEach((key) => {
        if (!fieldCache.has(key)) {
          setTimeout(() => {
            setFieldCache(
              (prev) =>
                new Map(
                  prev.set(key, { preloaded: true, timestamp: Date.now() }),
                ),
            );
            setPreloadQueue((prev) => {
              const newQueue = new Set(prev);
              newQueue.delete(key);
              return newQueue;
            });
          }, Math.random() * 1000); // Simulate network delay
        }
      });
    },
    [isLowPowerMode, fieldCache],
  );

  const updateConfig = useCallback((newConfig: Partial<MobileFieldConfig>) => {
    setPerformanceConfig((prev) => ({
      ...prev,
      ...newConfig,
    }));
  }, []);

  // Performance measurement hooks
  useEffect(() => {
    if (!enableMetrics) return;

    // Measure render time
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'measure') {
          setMetrics((prev) => ({
            ...prev,
            renderTime: entry.duration,
          }));
        }
      });
    });

    observer.observe({ entryTypes: ['measure'] });

    return () => observer.disconnect();
  }, [enableMetrics]);

  const contextValue: MobileFieldPerformanceContextType = {
    config: performanceConfig,
    metrics,
    isLowPowerMode,
    optimizeForBattery,
    clearCache,
    preloadFields,
    updateConfig,
  };

  return (
    <MobileFieldPerformanceContext.Provider value={contextValue}>
      {children}

      {/* Performance Debug Panel (development only) */}
      {process.env.NODE_ENV === 'development' && enableMetrics && (
        <div className="fixed bottom-4 left-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs font-mono z-50">
          <div>Render: {metrics.renderTime.toFixed(2)}ms</div>
          <div>Memory: {(metrics.memoryUsage * 100).toFixed(1)}%</div>
          <div>
            Cache: {fieldCache.size}/{performanceConfig.maxCacheSize}
          </div>
          <div>Low Power: {isLowPowerMode ? 'ON' : 'OFF'}</div>
          {metrics.batteryLevel && (
            <div>Battery: {(metrics.batteryLevel * 100).toFixed(0)}%</div>
          )}
        </div>
      )}
    </MobileFieldPerformanceContext.Provider>
  );
}

export function useMobileFieldPerformance(): MobileFieldPerformanceContextType {
  const context = useContext(MobileFieldPerformanceContext);
  if (!context) {
    throw new Error(
      'useMobileFieldPerformance must be used within a MobileFieldPerformanceProvider',
    );
  }
  return context;
}

// Performance measurement utilities
export class MobileFieldPerformanceUtils {
  static measureRenderTime(componentName: string, fn: () => void) {
    performance.mark(`${componentName}-start`);
    fn();
    performance.mark(`${componentName}-end`);
    performance.measure(
      componentName,
      `${componentName}-start`,
      `${componentName}-end`,
    );
  }

  static measureTouchResponse(callback: () => void) {
    const startTime = performance.now();

    const measureCallback = () => {
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Log if touch response is slow (>100ms)
      if (responseTime > 100) {
        console.warn(`Slow touch response: ${responseTime.toFixed(2)}ms`);
      }

      callback();
    };

    return measureCallback;
  }

  static optimizeForTouch() {
    // Disable hover effects on mobile
    const style = document.createElement('style');
    style.innerHTML = `
      @media (hover: none) {
        .hover\\:bg-gray-50:hover {
          background-color: inherit;
        }
        .hover\\:bg-blue-50:hover {
          background-color: inherit;
        }
      }
    `;
    document.head.appendChild(style);
  }

  static enablePassiveScrolling() {
    // Add passive event listeners for better scroll performance
    let supportsPassive = false;
    try {
      const opts = Object.defineProperty({}, 'passive', {
        get: function () {
          supportsPassive = true;
        },
      });
      window.addEventListener('test', null as any, opts);
    } catch (e) {}

    if (supportsPassive) {
      document.addEventListener('touchstart', () => {}, { passive: true });
      document.addEventListener('touchmove', () => {}, { passive: true });
    }
  }
}
