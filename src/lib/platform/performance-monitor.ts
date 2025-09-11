'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface PerformanceMetrics {
  // Core Web Vitals
  firstContentfulPaint: number | null;
  largestContentfulPaint: number | null;
  cumulativeLayoutShift: number | null;
  firstInputDelay: number | null;
  timeToInteractive: number | null;

  // Battery and Power
  batteryLevel: number | null;
  isCharging: boolean | null;
  batteryChargingTime: number | null;
  batteryDischargingTime: number | null;

  // Memory and CPU
  usedJSMemory: number | null;
  totalJSMemory: number | null;
  memoryLimit: number | null;
  cpuUsage: number | null;

  // Network
  connectionType: string;
  connectionSpeed: number | null;
  dataUsage: number;

  // Frame Performance
  averageFPS: number | null;
  droppedFrames: number;
  frameDropPercentage: number | null;

  // Custom Metrics
  touchResponseTime: number | null;
  searchResponseTime: number | null;
  playlistLoadTime: number | null;
  audioLoadTime: number | null;

  // Venue-specific
  sessionDuration: number;
  backgroundTime: number;
  screenWakeTime: number;
  thermalState: 'nominal' | 'fair' | 'serious' | 'critical' | 'unknown';
}

interface PerformanceAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: Date;
  metric: string;
  value: number | string;
  threshold: number | string;
}

export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    firstContentfulPaint: null,
    largestContentfulPaint: null,
    cumulativeLayoutShift: null,
    firstInputDelay: null,
    timeToInteractive: null,
    batteryLevel: null,
    isCharging: null,
    batteryChargingTime: null,
    batteryDischargingTime: null,
    usedJSMemory: null,
    totalJSMemory: null,
    memoryLimit: null,
    cpuUsage: null,
    connectionType: 'unknown',
    connectionSpeed: null,
    dataUsage: 0,
    averageFPS: null,
    droppedFrames: 0,
    frameDropPercentage: null,
    touchResponseTime: null,
    searchResponseTime: null,
    playlistLoadTime: null,
    audioLoadTime: null,
    sessionDuration: 0,
    backgroundTime: 0,
    screenWakeTime: 0,
    thermalState: 'unknown',
  });

  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const sessionStartRef = useRef<Date>(new Date());
  const backgroundStartRef = useRef<Date | null>(null);
  const frameCountRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const fpsHistoryRef = useRef<number[]>([]);

  // Core Web Vitals monitoring
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        switch (entry.entryType) {
          case 'paint':
            if (entry.name === 'first-contentful-paint') {
              setMetrics((prev) => ({
                ...prev,
                firstContentfulPaint: entry.startTime,
              }));
            }
            break;
          case 'largest-contentful-paint':
            setMetrics((prev) => ({
              ...prev,
              largestContentfulPaint: entry.startTime,
            }));
            break;
          case 'layout-shift':
            if (!(entry as any).hadRecentInput) {
              setMetrics((prev) => ({
                ...prev,
                cumulativeLayoutShift:
                  (prev.cumulativeLayoutShift || 0) + (entry as any).value,
              }));
            }
            break;
          case 'first-input':
            setMetrics((prev) => ({
              ...prev,
              firstInputDelay: (entry as any).processingStart - entry.startTime,
            }));
            break;
        }
      }
    });

    try {
      observer.observe({
        entryTypes: [
          'paint',
          'largest-contentful-paint',
          'layout-shift',
          'first-input',
        ],
      });
    } catch (error) {
      console.warn('Performance observer not supported:', error);
    }

    return () => observer.disconnect();
  }, []);

  // Battery monitoring
  useEffect(() => {
    if (typeof window === 'undefined' || !('getBattery' in navigator)) return;

    let battery: any;

    (navigator as any)
      .getBattery()
      .then((batteryManager: any) => {
        battery = batteryManager;

        const updateBatteryInfo = () => {
          setMetrics((prev) => ({
            ...prev,
            batteryLevel: battery.level,
            isCharging: battery.charging,
            batteryChargingTime:
              battery.chargingTime === Infinity ? null : battery.chargingTime,
            batteryDischargingTime:
              battery.dischargingTime === Infinity
                ? null
                : battery.dischargingTime,
          }));

          // Alert on low battery
          if (battery.level < 0.15 && !battery.charging) {
            addAlert(
              'warning',
              'Low battery detected',
              'batteryLevel',
              battery.level,
              0.15,
            );
          }

          // Alert on critical battery
          if (battery.level < 0.05 && !battery.charging) {
            addAlert(
              'error',
              'Critical battery level',
              'batteryLevel',
              battery.level,
              0.05,
            );
          }
        };

        updateBatteryInfo();

        battery.addEventListener('levelchange', updateBatteryInfo);
        battery.addEventListener('chargingchange', updateBatteryInfo);
        battery.addEventListener('chargingtimechange', updateBatteryInfo);
        battery.addEventListener('dischargingtimechange', updateBatteryInfo);
      })
      .catch((error: any) => {
        console.warn('Battery API not available:', error);
      });

    return () => {
      if (battery) {
        battery.removeEventListener('levelchange', updateBatteryInfo);
        battery.removeEventListener('chargingchange', updateBatteryInfo);
        battery.removeEventListener('chargingtimechange', updateBatteryInfo);
        battery.removeEventListener('dischargingtimechange', updateBatteryInfo);
      }
    };
  }, []);

  // Memory monitoring
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateMemoryInfo = () => {
      const memory = (performance as any).memory;
      if (memory) {
        const usedMB = memory.usedJSMemory / 1024 / 1024;
        const totalMB = memory.totalJSMemory / 1024 / 1024;
        const limitMB = memory.jsMemoryLimit / 1024 / 1024;

        setMetrics((prev) => ({
          ...prev,
          usedJSMemory: usedMB,
          totalJSMemory: totalMB,
          memoryLimit: limitMB,
        }));

        // Alert on high memory usage
        const memoryUsagePercentage = (usedMB / limitMB) * 100;
        if (memoryUsagePercentage > 80) {
          addAlert(
            'warning',
            'High memory usage detected',
            'memoryUsage',
            memoryUsagePercentage,
            80,
          );
        }

        if (memoryUsagePercentage > 95) {
          addAlert(
            'error',
            'Critical memory usage',
            'memoryUsage',
            memoryUsagePercentage,
            95,
          );
        }
      }
    };

    const intervalId = setInterval(updateMemoryInfo, 5000); // Check every 5 seconds
    updateMemoryInfo(); // Initial check

    return () => clearInterval(intervalId);
  }, []);

  // Network monitoring
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    const updateNetworkInfo = () => {
      if (connection) {
        setMetrics((prev) => ({
          ...prev,
          connectionType: connection.effectiveType || 'unknown',
          connectionSpeed: connection.downlink || null,
        }));

        // Alert on poor connection
        if (
          connection.effectiveType === 'slow-2g' ||
          connection.effectiveType === '2g'
        ) {
          addAlert(
            'warning',
            'Poor network connection detected',
            'connectionType',
            connection.effectiveType,
            '3g',
          );
        }
      }
    };

    if (connection) {
      connection.addEventListener('change', updateNetworkInfo);
      updateNetworkInfo();

      return () => connection.removeEventListener('change', updateNetworkInfo);
    }
  }, []);

  // Frame rate monitoring
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let rafId: number;

    const measureFPS = (timestamp: number) => {
      if (lastFrameTimeRef.current) {
        const delta = timestamp - lastFrameTimeRef.current;
        const fps = 1000 / delta;

        fpsHistoryRef.current.push(fps);
        if (fpsHistoryRef.current.length > 60) {
          // Keep last 60 frames
          fpsHistoryRef.current.shift();
        }

        const averageFPS =
          fpsHistoryRef.current.reduce((a, b) => a + b, 0) /
          fpsHistoryRef.current.length;
        const droppedFrames = fpsHistoryRef.current.filter(
          (f) => f < 50,
        ).length; // Frames below 50fps considered dropped
        const frameDropPercentage =
          (droppedFrames / fpsHistoryRef.current.length) * 100;

        setMetrics((prev) => ({
          ...prev,
          averageFPS,
          droppedFrames,
          frameDropPercentage,
        }));

        // Alert on poor performance
        if (frameDropPercentage > 20) {
          addAlert(
            'warning',
            'High frame drop rate detected',
            'frameDropPercentage',
            frameDropPercentage,
            20,
          );
        }
      }

      lastFrameTimeRef.current = timestamp;
      rafId = requestAnimationFrame(measureFPS);
    };

    rafId = requestAnimationFrame(measureFPS);

    return () => cancelAnimationFrame(rafId);
  }, []);

  // Session duration tracking
  useEffect(() => {
    const updateSessionDuration = () => {
      const now = new Date();
      const sessionDuration =
        (now.getTime() - sessionStartRef.current.getTime()) / 1000; // in seconds
      setMetrics((prev) => ({ ...prev, sessionDuration }));
    };

    const intervalId = setInterval(updateSessionDuration, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Page visibility tracking
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleVisibilityChange = () => {
      const now = new Date();

      if (document.hidden) {
        backgroundStartRef.current = now;
      } else {
        if (backgroundStartRef.current) {
          const backgroundDuration =
            now.getTime() - backgroundStartRef.current.getTime();
          setMetrics((prev) => ({
            ...prev,
            backgroundTime: prev.backgroundTime + backgroundDuration / 1000,
          }));
          backgroundStartRef.current = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Add performance alert
  const addAlert = useCallback(
    (
      type: PerformanceAlert['type'],
      message: string,
      metric: string,
      value: number | string,
      threshold: number | string,
    ) => {
      const alert: PerformanceAlert = {
        id: `${metric}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        message,
        timestamp: new Date(),
        metric,
        value,
        threshold,
      };

      setAlerts((prev) => {
        // Prevent duplicate alerts for the same metric
        const filtered = prev.filter(
          (a) =>
            a.metric !== metric || Date.now() - a.timestamp.getTime() > 30000,
        ); // 30 second cooldown
        return [...filtered, alert].slice(-20); // Keep last 20 alerts
      });

      // Log to console for debugging
      console.warn(`Performance Alert [${type.toUpperCase()}]: ${message}`, {
        metric,
        value,
        threshold,
      });
    },
    [],
  );

  // Custom timing function for measuring operations
  const measureTiming = useCallback(
    (label: string) => {
      const startTime = performance.now();

      return {
        end: () => {
          const endTime = performance.now();
          const duration = endTime - startTime;

          // Update specific metrics
          switch (label) {
            case 'touch-response':
              setMetrics((prev) => ({ ...prev, touchResponseTime: duration }));
              if (duration > 100) {
                // Touch response should be < 100ms
                addAlert(
                  'warning',
                  'Slow touch response detected',
                  'touchResponseTime',
                  duration,
                  100,
                );
              }
              break;
            case 'search':
              setMetrics((prev) => ({ ...prev, searchResponseTime: duration }));
              if (duration > 500) {
                // Search should be < 500ms
                addAlert(
                  'warning',
                  'Slow search response',
                  'searchResponseTime',
                  duration,
                  500,
                );
              }
              break;
            case 'playlist-load':
              setMetrics((prev) => ({ ...prev, playlistLoadTime: duration }));
              break;
            case 'audio-load':
              setMetrics((prev) => ({ ...prev, audioLoadTime: duration }));
              if (duration > 2000) {
                // Audio should load < 2s
                addAlert(
                  'warning',
                  'Slow audio loading',
                  'audioLoadTime',
                  duration,
                  2000,
                );
              }
              break;
          }

          return duration;
        },
      };
    },
    [addAlert],
  );

  // Clear old alerts
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Get performance summary
  const getPerformanceSummary = useCallback(() => {
    const {
      batteryLevel,
      averageFPS,
      frameDropPercentage,
      usedJSMemory,
      memoryLimit,
      connectionType,
    } = metrics;

    let score = 100;
    const issues: string[] = [];

    // Battery score
    if (batteryLevel !== null) {
      if (batteryLevel < 0.1) {
        score -= 30;
        issues.push('Critical battery level');
      } else if (batteryLevel < 0.2) {
        score -= 15;
        issues.push('Low battery level');
      }
    }

    // Performance score
    if (frameDropPercentage !== null && frameDropPercentage > 10) {
      score -= 20;
      issues.push('High frame drop rate');
    }

    // Memory score
    if (usedJSMemory !== null && memoryLimit !== null) {
      const memoryUsage = (usedJSMemory / memoryLimit) * 100;
      if (memoryUsage > 80) {
        score -= 25;
        issues.push('High memory usage');
      }
    }

    // Network score
    if (connectionType === 'slow-2g' || connectionType === '2g') {
      score -= 20;
      issues.push('Poor network connection');
    }

    return {
      score: Math.max(0, score),
      grade:
        score >= 90
          ? 'A'
          : score >= 80
            ? 'B'
            : score >= 70
              ? 'C'
              : score >= 60
                ? 'D'
                : 'F',
      issues,
      recommendation:
        score < 70
          ? 'Consider optimizing performance for better DJ experience'
          : 'Performance is acceptable for venue use',
    };
  }, [metrics]);

  return {
    metrics,
    alerts,
    measureTiming,
    clearAlerts,
    getPerformanceSummary,
    isPerformanceGood: getPerformanceSummary().score >= 70,
  };
};

export default usePerformanceMonitor;
