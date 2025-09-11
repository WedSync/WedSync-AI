'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  DeviceCapabilities,
  MobileOptimizationMetrics,
  OfflineCapabilities,
  BatteryOptimization,
} from '@/types/platform-scaling';

export interface MobilePerformanceState {
  isLoading: boolean;
  deviceCapabilities: DeviceCapabilities | null;
  metrics: MobileOptimizationMetrics | null;
  isOffline: boolean;
  batteryLevel: number | null;
  connectionType: string;
  optimizationLevel: 'low' | 'medium' | 'high';
  error: string | null;
}

export interface MobilePerformanceActions {
  refreshMetrics: () => Promise<void>;
  optimizeForDevice: (level: 'low' | 'medium' | 'high') => void;
  enableOfflineMode: () => Promise<void>;
  disableOfflineMode: () => Promise<void>;
  resetError: () => void;
}

export function useMobilePerformance(): MobilePerformanceState &
  MobilePerformanceActions {
  const [state, setState] = useState<MobilePerformanceState>({
    isLoading: true,
    deviceCapabilities: null,
    metrics: null,
    isOffline: false,
    batteryLevel: null,
    connectionType: 'unknown',
    optimizationLevel: 'medium',
    error: null,
  });

  const metricsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const performanceObserverRef = useRef<PerformanceObserver | null>(null);

  // Detect device capabilities
  const detectDeviceCapabilities = useCallback((): DeviceCapabilities => {
    const deviceMemory = (navigator as any).deviceMemory || 4;
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    const userAgent = navigator.userAgent.toLowerCase();

    // Determine device type
    let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
    if (/mobile|android|iphone/.test(userAgent)) {
      deviceType = 'mobile';
    } else if (/tablet|ipad/.test(userAgent)) {
      deviceType = 'tablet';
    }

    // Determine memory category
    let memory: 'low' | 'medium' | 'high' = 'medium';
    if (deviceMemory <= 2) memory = 'low';
    else if (deviceMemory >= 8) memory = 'high';

    // Determine CPU category
    let cpu: 'low' | 'medium' | 'high' = 'medium';
    if (hardwareConcurrency <= 2) cpu = 'low';
    else if (hardwareConcurrency >= 8) cpu = 'high';

    // Check for specific optimizations
    const supportsWebP = (() => {
      try {
        const canvas = document.createElement('canvas');
        return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
      } catch {
        return false;
      }
    })();

    const supportsServiceWorker = 'serviceWorker' in navigator;
    const supportsIndexedDB = 'indexedDB' in window;
    const supportsWebGL = (() => {
      try {
        const canvas = document.createElement('canvas');
        return !!(
          canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
        );
      } catch {
        return false;
      }
    })();

    return {
      deviceType,
      memory,
      cpu,
      screenSize: {
        width: window.screen.width,
        height: window.screen.height,
      },
      pixelRatio: window.devicePixelRatio || 1,
      touchSupported: 'ontouchstart' in window,
      supportsWebP,
      supportsServiceWorker,
      supportsIndexedDB,
      supportsWebGL,
      networkType: (navigator as any).connection?.effectiveType || 'unknown',
      estimatedBandwidth: (navigator as any).connection?.downlink || 0,
    };
  }, []);

  // Monitor network connectivity
  useEffect(() => {
    const updateOnlineStatus = () => {
      setState((prev) => ({
        ...prev,
        isOffline: !navigator.onLine,
      }));
    };

    const updateConnection = () => {
      const connection = (navigator as any).connection;
      if (connection) {
        setState((prev) => ({
          ...prev,
          connectionType: connection.effectiveType || 'unknown',
        }));
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    if ('connection' in navigator) {
      (navigator as any).connection.addEventListener(
        'change',
        updateConnection,
      );
    }

    // Initial status
    updateOnlineStatus();
    updateConnection();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      if ('connection' in navigator) {
        (navigator as any).connection.removeEventListener(
          'change',
          updateConnection,
        );
      }
    };
  }, []);

  // Monitor battery status
  useEffect(() => {
    const updateBatteryInfo = (battery: any) => {
      setState((prev) => ({
        ...prev,
        batteryLevel: battery.level * 100,
      }));
    };

    if ('getBattery' in navigator) {
      (navigator as any)
        .getBattery()
        .then((battery: any) => {
          updateBatteryInfo(battery);
          battery.addEventListener('levelchange', () =>
            updateBatteryInfo(battery),
          );
        })
        .catch(() => {
          // Battery API not supported
        });
    }
  }, []);

  // Collect performance metrics
  const collectPerformanceMetrics =
    useCallback((): MobileOptimizationMetrics => {
      const navigation = performance.getEntriesByType(
        'navigation',
      )[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');

      const fcp =
        paint.find((entry) => entry.name === 'first-contentful-paint')
          ?.startTime || 0;
      const lcp =
        paint.find((entry) => entry.name === 'largest-contentful-paint')
          ?.startTime || 0;

      // Calculate Core Web Vitals
      const coreWebVitals = {
        fcp: fcp / 1000, // Convert to seconds
        lcp: lcp / 1000,
        fid: 0, // Would need to track actual user interactions
        cls: 0, // Would need layout shift observer
        ttfb: navigation
          ? navigation.responseStart - navigation.requestStart
          : 0,
      };

      // Memory usage (if available)
      const memoryInfo = (performance as any).memory;
      const memoryUsage = memoryInfo
        ? {
            used: memoryInfo.usedJSHeapSize / (1024 * 1024), // MB
            total: memoryInfo.totalJSHeapSize / (1024 * 1024), // MB
            limit: memoryInfo.jsHeapSizeLimit / (1024 * 1024), // MB
          }
        : {
            used: 0,
            total: 0,
            limit: 0,
          };

      // Bundle size estimation
      const resources = performance.getEntriesByType(
        'resource',
      ) as PerformanceResourceTiming[];
      const bundleSize =
        resources
          .filter((r) => r.name.includes('.js') || r.name.includes('.css'))
          .reduce(
            (total, resource) => total + (resource.transferSize || 0),
            0,
          ) / 1024; // KB

      return {
        coreWebVitals,
        memoryUsage,
        bundleSize,
        imageOptimization: {
          webpUsage: 85, // Would calculate from actual image loads
          lazyLoadingEffectiveness: 92,
          compressionRatio: 0.75,
        },
        networkMetrics: {
          effectiveType:
            (navigator as any).connection?.effectiveType || 'unknown',
          downlink: (navigator as any).connection?.downlink || 0,
          rtt: (navigator as any).connection?.rtt || 0,
          saveData: (navigator as any).connection?.saveData || false,
        },
        batteryOptimization: {
          level: state.batteryLevel || 100,
          isCharging: false, // Would get from battery API
          optimizationLevel: state.optimizationLevel,
        },
      };
    }, [state.batteryLevel, state.optimizationLevel]);

  // Initialize performance monitoring
  useEffect(() => {
    const initializePerformanceMonitoring = async () => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        const deviceCapabilities = detectDeviceCapabilities();
        const metrics = collectPerformanceMetrics();

        // Set initial optimization level based on device
        let optimizationLevel: 'low' | 'medium' | 'high' = 'medium';
        if (
          deviceCapabilities.memory === 'low' ||
          deviceCapabilities.cpu === 'low'
        ) {
          optimizationLevel = 'high';
        } else if (
          deviceCapabilities.memory === 'high' &&
          deviceCapabilities.cpu === 'high'
        ) {
          optimizationLevel = 'low';
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          deviceCapabilities,
          metrics,
          optimizationLevel,
        }));

        // Set up performance observer for ongoing monitoring
        if ('PerformanceObserver' in window) {
          performanceObserverRef.current = new PerformanceObserver((list) => {
            const entries = list.getEntries();

            // Update metrics based on new performance entries
            entries.forEach((entry) => {
              if (entry.entryType === 'largest-contentful-paint') {
                setState((prev) =>
                  prev.metrics
                    ? {
                        ...prev,
                        metrics: {
                          ...prev.metrics,
                          coreWebVitals: {
                            ...prev.metrics.coreWebVitals,
                            lcp: entry.startTime / 1000,
                          },
                        },
                      }
                    : prev,
                );
              }
            });
          });

          performanceObserverRef.current.observe({
            entryTypes: [
              'largest-contentful-paint',
              'first-input',
              'layout-shift',
            ],
          });
        }
      } catch (error) {
        console.error(
          'Failed to initialize mobile performance monitoring:',
          error,
        );
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Failed to initialize performance monitoring',
        }));
      }
    };

    initializePerformanceMonitoring();

    return () => {
      if (performanceObserverRef.current) {
        performanceObserverRef.current.disconnect();
      }
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
    };
  }, [detectDeviceCapabilities, collectPerformanceMetrics]);

  // Periodic metrics collection
  useEffect(() => {
    metricsIntervalRef.current = setInterval(() => {
      try {
        const updatedMetrics = collectPerformanceMetrics();
        setState((prev) => ({ ...prev, metrics: updatedMetrics }));
      } catch (error) {
        console.error('Failed to collect performance metrics:', error);
      }
    }, 30000); // Every 30 seconds

    return () => {
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
    };
  }, [collectPerformanceMetrics]);

  const refreshMetrics = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const deviceCapabilities = detectDeviceCapabilities();
      const metrics = collectPerformanceMetrics();

      setState((prev) => ({
        ...prev,
        isLoading: false,
        deviceCapabilities,
        metrics,
      }));
    } catch (error) {
      console.error('Failed to refresh mobile performance metrics:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Failed to refresh performance metrics',
      }));
    }
  }, [detectDeviceCapabilities, collectPerformanceMetrics]);

  const optimizeForDevice = useCallback((level: 'low' | 'medium' | 'high') => {
    setState((prev) => ({ ...prev, optimizationLevel: level }));

    // Apply optimizations based on level
    const root = document.documentElement;

    switch (level) {
      case 'high':
        // Aggressive optimizations for low-end devices
        root.style.setProperty('--image-quality', '0.6');
        root.style.setProperty('--animation-duration', '0.1s');
        root.style.setProperty('--blur-amount', '2px');
        break;
      case 'medium':
        // Balanced optimizations
        root.style.setProperty('--image-quality', '0.8');
        root.style.setProperty('--animation-duration', '0.2s');
        root.style.setProperty('--blur-amount', '4px');
        break;
      case 'low':
        // Full quality for high-end devices
        root.style.setProperty('--image-quality', '1.0');
        root.style.setProperty('--animation-duration', '0.3s');
        root.style.setProperty('--blur-amount', '8px');
        break;
    }

    // Store preference in localStorage
    localStorage.setItem('mobile-optimization-level', level);
  }, []);

  const enableOfflineMode = useCallback(async () => {
    try {
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker not supported');
      }

      // Register service worker for offline capabilities
      const registration = await navigator.serviceWorker.register('/sw.js');

      setState((prev) => ({ ...prev, error: null }));

      // Cache critical wedding data
      if ('caches' in window) {
        const cache = await caches.open('wedding-data-v1');

        // Cache essential pages and resources
        await cache.addAll([
          '/',
          '/dashboard',
          '/weddings',
          '/offline',
          '/manifest.json',
        ]);
      }

      // Enable IndexedDB for offline data storage
      if ('indexedDB' in window) {
        const request = indexedDB.open('WedSyncOffline', 1);

        request.onupgradeneeded = (event) => {
          const db = (event.target as any).result;

          // Create object stores for offline data
          if (!db.objectStoreNames.contains('weddings')) {
            db.createObjectStore('weddings', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('vendors')) {
            db.createObjectStore('vendors', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('forms')) {
            db.createObjectStore('forms', { keyPath: 'id' });
          }
        };
      }
    } catch (error) {
      console.error('Failed to enable offline mode:', error);
      setState((prev) => ({
        ...prev,
        error: 'Failed to enable offline mode',
      }));
    }
  }, []);

  const disableOfflineMode = useCallback(async () => {
    try {
      // Unregister service worker
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }

      // Clear caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      setState((prev) => ({ ...prev, error: null }));
    } catch (error) {
      console.error('Failed to disable offline mode:', error);
      setState((prev) => ({
        ...prev,
        error: 'Failed to disable offline mode',
      }));
    }
  }, []);

  const resetError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    refreshMetrics,
    optimizeForDevice,
    enableOfflineMode,
    disableOfflineMode,
    resetError,
  };
}
