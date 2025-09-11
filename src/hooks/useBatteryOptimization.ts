'use client';

import { useState, useEffect, useCallback } from 'react';

export interface BatteryOptimizationSettings {
  enableBatterySaver: boolean;
  reducedAnimations: boolean;
  optimizedRendering: boolean;
  backgroundSyncInterval: number;
  maxConcurrentSyncs: number;
  imageQuality: 'high' | 'medium' | 'low';
  networkOptimization: boolean;
}

export interface BatteryInfo {
  level: number;
  charging: boolean;
  chargingTime: number | null;
  dischargingTime: number | null;
  isLowPower: boolean;
}

export interface UseBatteryOptimizationReturn {
  batteryInfo: BatteryInfo | null;
  settings: BatteryOptimizationSettings;
  isLowPower: boolean;
  batteryLevel: number | null;
  enableBatterySaver: () => void;
  disableBatterySaver: () => void;
  updateSettings: (settings: Partial<BatteryOptimizationSettings>) => void;
  optimizeForBattery: boolean;
  getOptimizedImageQuality: () => number;
  shouldReduceAnimations: () => boolean;
  getBackgroundSyncInterval: () => number;
}

export const useBatteryOptimization = (): UseBatteryOptimizationReturn => {
  const [batteryInfo, setBatteryInfo] = useState<BatteryInfo | null>(null);
  const [settings, setSettings] = useState<BatteryOptimizationSettings>(() => {
    // Load settings from localStorage
    const stored = localStorage.getItem('battery_optimization_settings');
    return stored
      ? JSON.parse(stored)
      : {
          enableBatterySaver: false,
          reducedAnimations: false,
          optimizedRendering: true,
          backgroundSyncInterval: 30000, // 30 seconds
          maxConcurrentSyncs: 3,
          imageQuality: 'high' as const,
          networkOptimization: true,
        };
  });

  // Initialize battery monitoring
  useEffect(() => {
    const initBatteryMonitoring = async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery();

          const updateBatteryInfo = () => {
            const level = Math.round(battery.level * 100);
            const info: BatteryInfo = {
              level,
              charging: battery.charging,
              chargingTime:
                battery.chargingTime === Infinity ? null : battery.chargingTime,
              dischargingTime:
                battery.dischargingTime === Infinity
                  ? null
                  : battery.dischargingTime,
              isLowPower: level < 20,
            };
            setBatteryInfo(info);

            // Auto-enable battery saver when level is critically low
            if (level < 15 && !settings.enableBatterySaver) {
              enableBatterySaver();
            }
          };

          // Initial update
          updateBatteryInfo();

          // Listen for battery changes
          battery.addEventListener('levelchange', updateBatteryInfo);
          battery.addEventListener('chargingchange', updateBatteryInfo);
          battery.addEventListener('chargingtimechange', updateBatteryInfo);
          battery.addEventListener('dischargingtimechange', updateBatteryInfo);

          // Cleanup function
          return () => {
            battery.removeEventListener('levelchange', updateBatteryInfo);
            battery.removeEventListener('chargingchange', updateBatteryInfo);
            battery.removeEventListener(
              'chargingtimechange',
              updateBatteryInfo,
            );
            battery.removeEventListener(
              'dischargingtimechange',
              updateBatteryInfo,
            );
          };
        } catch (error) {
          console.warn('Battery API not available:', error);

          // Fallback: monitor online/offline and estimate battery based on usage
          setBatteryInfo({
            level: 75, // Estimated
            charging: false,
            chargingTime: null,
            dischargingTime: null,
            isLowPower: false,
          });
        }
      } else {
        console.warn('Battery API not supported');

        // Fallback for browsers without battery API
        setBatteryInfo({
          level: 75, // Estimated
          charging: false,
          chargingTime: null,
          dischargingTime: null,
          isLowPower: false,
        });
      }
    };

    const cleanup = initBatteryMonitoring();
    return () => {
      cleanup?.then((cleanupFn) => cleanupFn?.());
    };
  }, [settings.enableBatterySaver]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(
      'battery_optimization_settings',
      JSON.stringify(settings),
    );
  }, [settings]);

  const enableBatterySaver = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      enableBatterySaver: true,
      reducedAnimations: true,
      imageQuality: 'low',
      backgroundSyncInterval: 60000, // 1 minute
      maxConcurrentSyncs: 1,
    }));
  }, []);

  const disableBatterySaver = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      enableBatterySaver: false,
      reducedAnimations: false,
      imageQuality: 'high',
      backgroundSyncInterval: 30000, // 30 seconds
      maxConcurrentSyncs: 3,
    }));
  }, []);

  const updateSettings = useCallback(
    (newSettings: Partial<BatteryOptimizationSettings>) => {
      setSettings((prev) => ({
        ...prev,
        ...newSettings,
      }));
    },
    [],
  );

  // Derived values
  const isLowPower =
    batteryInfo?.isLowPower || settings.enableBatterySaver || false;
  const batteryLevel = batteryInfo?.level || null;
  const optimizeForBattery = settings.enableBatterySaver || isLowPower;

  // Optimization helpers
  const getOptimizedImageQuality = useCallback((): number => {
    if (optimizeForBattery || settings.imageQuality === 'low') return 0.4;
    if (settings.imageQuality === 'medium') return 0.7;
    return 0.85; // high quality
  }, [optimizeForBattery, settings.imageQuality]);

  const shouldReduceAnimations = useCallback((): boolean => {
    return settings.reducedAnimations || optimizeForBattery;
  }, [settings.reducedAnimations, optimizeForBattery]);

  const getBackgroundSyncInterval = useCallback((): number => {
    if (optimizeForBattery) {
      return Math.max(settings.backgroundSyncInterval * 2, 60000); // At least 1 minute
    }
    return settings.backgroundSyncInterval;
  }, [optimizeForBattery, settings.backgroundSyncInterval]);

  return {
    batteryInfo,
    settings,
    isLowPower,
    batteryLevel,
    enableBatterySaver,
    disableBatterySaver,
    updateSettings,
    optimizeForBattery,
    getOptimizedImageQuality,
    shouldReduceAnimations,
    getBackgroundSyncInterval,
  };
};

// Performance monitoring hook
export interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number | null;
  networkLatency: number | null;
  batteryDrain: number | null;
}

export const usePerformanceMonitoring = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: null,
    networkLatency: null,
    batteryDrain: null,
  });

  const measureRenderTime = useCallback((componentName: string) => {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      setMetrics((prev) => ({
        ...prev,
        renderTime: renderTime,
      }));

      // Log slow renders in development
      if (process.env.NODE_ENV === 'development' && renderTime > 16) {
        console.warn(
          `Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`,
        );
      }
    };
  }, []);

  const measureMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      const usage = memInfo.usedJSHeapSize / memInfo.totalJSHeapSize;

      setMetrics((prev) => ({
        ...prev,
        memoryUsage: Math.round(usage * 100),
      }));

      return usage;
    }
    return null;
  }, []);

  const measureNetworkLatency = useCallback(
    async (url: string = '/api/ping') => {
      const startTime = performance.now();

      try {
        await fetch(url, { method: 'HEAD' });
        const latency = performance.now() - startTime;

        setMetrics((prev) => ({
          ...prev,
          networkLatency: latency,
        }));

        return latency;
      } catch (error) {
        return null;
      }
    },
    [],
  );

  // Monitor performance automatically
  useEffect(() => {
    const interval = setInterval(() => {
      measureMemoryUsage();
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [measureMemoryUsage]);

  return {
    metrics,
    measureRenderTime,
    measureMemoryUsage,
    measureNetworkLatency,
  };
};
