'use client';

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import {
  usePerformanceMonitor,
  useMemoryOptimization,
} from '../../hooks/usePerformanceOptimization';
import { useIntelligentCache } from './IntelligentCacheProvider';
import { useOptimisticUpdates } from './OptimisticUpdateProvider';
import { useRealtime } from './RealtimeProvider';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  severity: 'good' | 'warning' | 'critical';
  timestamp: number;
  category:
    | 'rendering'
    | 'network'
    | 'memory'
    | 'cache'
    | 'realtime'
    | 'user_interaction';
}

interface PerformanceAlert {
  id: string;
  type:
    | 'performance_degradation'
    | 'memory_leak'
    | 'cache_miss_rate'
    | 'network_latency'
    | 'rendering_slowdown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  acknowledged: boolean;
  autoResolved: boolean;
  affectedComponents: string[];
  suggestedActions: string[];
}

interface ComponentPerformance {
  componentName: string;
  renderCount: number;
  averageRenderTime: number;
  maxRenderTime: number;
  minRenderTime: number;
  memoryUsage: number;
  reRenderReasons: Array<{
    reason: string;
    count: number;
    lastOccurrence: number;
  }>;
  optimizationScore: number; // 0-100
}

interface NetworkMetrics {
  requestCount: number;
  averageResponseTime: number;
  errorRate: number;
  cacheHitRate: number;
  bandwidthUsage: number;
  activeConnections: number;
  websocketLatency: number;
  retryAttempts: number;
}

interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  heapLimit: number;
  usedJSSize: number;
  totalJSSize: number;
  gcCollections: number;
  memoryLeakDetected: boolean;
  componentMemoryMap: Map<string, number>;
}

interface PerformanceDashboardState {
  metrics: Map<string, PerformanceMetric>;
  alerts: PerformanceAlert[];
  componentPerformance: Map<string, ComponentPerformance>;
  networkMetrics: NetworkMetrics;
  memoryMetrics: MemoryMetrics;
  isRecording: boolean;
  recordingStartTime: number;
  sessionDuration: number;
  performanceScore: number; // Overall score 0-100
  vitalsTracking: {
    fcp: number; // First Contentful Paint
    lcp: number; // Largest Contentful Paint
    fid: number; // First Input Delay
    cls: number; // Cumulative Layout Shift
    ttfb: number; // Time to First Byte
  };
}

interface AdvancedPerformanceDashboardProps {
  onAlert?: (alert: PerformanceAlert) => void;
  onMetricThresholdExceeded?: (metric: PerformanceMetric) => void;
  autoOptimize?: boolean;
  collectDetailedMetrics?: boolean;
  className?: string;
  'data-testid'?: string;
}

export const AdvancedPerformanceDashboard: React.FC<
  AdvancedPerformanceDashboardProps
> = ({
  onAlert,
  onMetricThresholdExceeded,
  autoOptimize = false,
  collectDetailedMetrics = true,
  className = '',
  'data-testid': testId,
}) => {
  const performanceMonitor = usePerformanceMonitor(
    'AdvancedPerformanceDashboard',
  );
  const memoryOpt = useMemoryOptimization();
  const cache = useIntelligentCache();
  const optimistic = useOptimisticUpdates();
  const realtime = useRealtime();

  const metricsCollectionRef = useRef<NodeJS.Timeout | null>(null);
  const vitalsObserverRef = useRef<PerformanceObserver | null>(null);
  const alertTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const [state, setState] = useState<PerformanceDashboardState>({
    metrics: new Map(),
    alerts: [],
    componentPerformance: new Map(),
    networkMetrics: {
      requestCount: 0,
      averageResponseTime: 0,
      errorRate: 0,
      cacheHitRate: 0,
      bandwidthUsage: 0,
      activeConnections: 0,
      websocketLatency: 0,
      retryAttempts: 0,
    },
    memoryMetrics: {
      heapUsed: 0,
      heapTotal: 0,
      heapLimit: 0,
      usedJSSize: 0,
      totalJSSize: 0,
      gcCollections: 0,
      memoryLeakDetected: false,
      componentMemoryMap: new Map(),
    },
    isRecording: false,
    recordingStartTime: 0,
    sessionDuration: 0,
    performanceScore: 100,
    vitalsTracking: {
      fcp: 0,
      lcp: 0,
      fid: 0,
      cls: 0,
      ttfb: 0,
    },
  });

  // Calculate performance thresholds
  const thresholds = useMemo(
    () => ({
      renderTime: { warning: 16, critical: 33 }, // 60fps = 16ms, 30fps = 33ms
      memoryUsage: { warning: 50 * 1024 * 1024, critical: 100 * 1024 * 1024 }, // 50MB, 100MB
      cacheHitRate: { warning: 70, critical: 50 }, // Percentages
      networkLatency: { warning: 200, critical: 500 }, // Milliseconds
      errorRate: { warning: 1, critical: 5 }, // Percentages
      lcp: { good: 2500, needs_improvement: 4000 },
      fid: { good: 100, needs_improvement: 300 },
      cls: { good: 0.1, needs_improvement: 0.25 },
      fcp: { good: 1800, needs_improvement: 3000 },
      ttfb: { good: 600, needs_improvement: 1500 },
    }),
    [],
  );

  // Create performance alert
  const createAlert = useCallback(
    (
      type: PerformanceAlert['type'],
      severity: PerformanceAlert['severity'],
      message: string,
      affectedComponents: string[] = [],
      suggestedActions: string[] = [],
    ) => {
      const alert: PerformanceAlert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        severity,
        message,
        timestamp: Date.now(),
        acknowledged: false,
        autoResolved: false,
        affectedComponents,
        suggestedActions,
      };

      setState((prev) => ({
        ...prev,
        alerts: [...prev.alerts, alert],
      }));

      if (onAlert) {
        onAlert(alert);
      }

      // Auto-resolve alert after timeout based on severity
      const timeout =
        severity === 'critical' ? 300000 : severity === 'high' ? 180000 : 60000;
      const alertTimeout = setTimeout(() => {
        setState((prev) => ({
          ...prev,
          alerts: prev.alerts.map((a) =>
            a.id === alert.id ? { ...a, autoResolved: true } : a,
          ),
        }));
        alertTimeoutRef.current.delete(alert.id);
      }, timeout);

      alertTimeoutRef.current.set(alert.id, alertTimeout);

      performanceMonitor.logMetric('performanceAlertCreated', 1);
      return alert;
    },
    [onAlert, performanceMonitor],
  );

  // Update performance metric
  const updateMetric = useCallback(
    (
      name: string,
      value: number,
      unit: string,
      category: PerformanceMetric['category'],
      previousValue?: number,
    ) => {
      const trend: PerformanceMetric['trend'] =
        previousValue !== undefined
          ? value > previousValue
            ? 'up'
            : value < previousValue
              ? 'down'
              : 'stable'
          : 'stable';

      let severity: PerformanceMetric['severity'] = 'good';

      // Determine severity based on thresholds
      if (name.includes('renderTime')) {
        severity =
          value > thresholds.renderTime.critical
            ? 'critical'
            : value > thresholds.renderTime.warning
              ? 'warning'
              : 'good';
      } else if (name.includes('memory')) {
        severity =
          value > thresholds.memoryUsage.critical
            ? 'critical'
            : value > thresholds.memoryUsage.warning
              ? 'warning'
              : 'good';
      } else if (name.includes('latency')) {
        severity =
          value > thresholds.networkLatency.critical
            ? 'critical'
            : value > thresholds.networkLatency.warning
              ? 'warning'
              : 'good';
      } else if (name.includes('errorRate')) {
        severity =
          value > thresholds.errorRate.critical
            ? 'critical'
            : value > thresholds.errorRate.warning
              ? 'warning'
              : 'good';
      }

      const metric: PerformanceMetric = {
        name,
        value,
        unit,
        trend,
        severity,
        timestamp: Date.now(),
        category,
      };

      setState((prev) => ({
        ...prev,
        metrics: new Map(prev.metrics).set(name, metric),
      }));

      // Check for threshold violations
      if (severity === 'critical' || severity === 'warning') {
        if (onMetricThresholdExceeded) {
          onMetricThresholdExceeded(metric);
        }

        // Create alert for critical metrics
        if (severity === 'critical') {
          createAlert(
            'performance_degradation',
            'high',
            `${name} has reached critical threshold: ${value}${unit}`,
            [name],
            [
              `Optimize ${category} performance`,
              'Check for memory leaks',
              'Review component implementations',
            ],
          );
        }
      }

      performanceMonitor.logMetric(`dashboard_${name}`, value);
    },
    [thresholds, onMetricThresholdExceeded, createAlert, performanceMonitor],
  );

  // Collect Web Vitals
  const collectWebVitals = useCallback(() => {
    if (!window.performance || !collectDetailedMetrics) return;

    // First Contentful Paint
    try {
      const fcpEntry = performance.getEntriesByName(
        'first-contentful-paint',
      )[0] as PerformanceEntry;
      if (fcpEntry) {
        const fcp = fcpEntry.startTime;
        setState((prev) => ({
          ...prev,
          vitalsTracking: { ...prev.vitalsTracking, fcp },
        }));
        updateMetric('first_contentful_paint', fcp, 'ms', 'rendering');
      }
    } catch (error) {
      console.warn('FCP collection failed:', error);
    }

    // Largest Contentful Paint
    if (window.PerformanceObserver) {
      try {
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          if (lastEntry) {
            const lcp = lastEntry.startTime;
            setState((prev) => ({
              ...prev,
              vitalsTracking: { ...prev.vitalsTracking, lcp },
            }));
            updateMetric('largest_contentful_paint', lcp, 'ms', 'rendering');
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (error) {
        console.warn('LCP observation failed:', error);
      }
    }

    // First Input Delay (if supported)
    if (window.PerformanceObserver) {
      try {
        const fidObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          entries.forEach((entry: any) => {
            if (entry.name === 'first-input') {
              const fid = entry.processingStart - entry.startTime;
              setState((prev) => ({
                ...prev,
                vitalsTracking: { ...prev.vitalsTracking, fid },
              }));
              updateMetric('first_input_delay', fid, 'ms', 'user_interaction');
            }
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (error) {
        console.warn('FID observation failed:', error);
      }
    }

    // Cumulative Layout Shift
    if (window.PerformanceObserver) {
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          setState((prev) => ({
            ...prev,
            vitalsTracking: { ...prev.vitalsTracking, cls: clsValue },
          }));
          updateMetric('cumulative_layout_shift', clsValue, '', 'rendering');
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('CLS observation failed:', error);
      }
    }

    // Time to First Byte (approximate)
    try {
      const navigationTiming = performance.getEntriesByType(
        'navigation',
      )[0] as PerformanceNavigationTiming;
      if (navigationTiming) {
        const ttfb =
          navigationTiming.responseStart - navigationTiming.requestStart;
        setState((prev) => ({
          ...prev,
          vitalsTracking: { ...prev.vitalsTracking, ttfb },
        }));
        updateMetric('time_to_first_byte', ttfb, 'ms', 'network');
      }
    } catch (error) {
      console.warn('TTFB collection failed:', error);
    }
  }, [collectDetailedMetrics, updateMetric]);

  // Collect memory metrics
  const collectMemoryMetrics = useCallback(() => {
    if (!collectDetailedMetrics) return;

    try {
      // @ts-ignore - performance.memory is not in types but exists in Chrome
      const memory = performance.memory;
      if (memory) {
        const memoryMetrics: MemoryMetrics = {
          heapUsed: memory.usedJSHeapSize,
          heapTotal: memory.totalJSHeapSize,
          heapLimit: memory.jsHeapSizeLimit,
          usedJSSize: memory.usedJSHeapSize,
          totalJSSize: memory.totalJSHeapSize,
          gcCollections: 0, // Would need more sophisticated tracking
          memoryLeakDetected: false, // Would need trend analysis
          componentMemoryMap: new Map(),
        };

        setState((prev) => ({
          ...prev,
          memoryMetrics,
        }));

        updateMetric('heap_used', memoryMetrics.heapUsed, 'bytes', 'memory');
        updateMetric('heap_total', memoryMetrics.heapTotal, 'bytes', 'memory');

        // Check for potential memory leaks
        if (memoryMetrics.heapUsed > thresholds.memoryUsage.warning) {
          createAlert(
            'memory_leak',
            memoryMetrics.heapUsed > thresholds.memoryUsage.critical
              ? 'high'
              : 'medium',
            `High memory usage detected: ${Math.round(memoryMetrics.heapUsed / 1024 / 1024)}MB`,
            ['memory'],
            [
              'Check for memory leaks',
              'Review component lifecycle',
              'Clear unused references',
            ],
          );
        }
      }
    } catch (error) {
      console.warn('Memory metrics collection failed:', error);
    }
  }, [
    collectDetailedMetrics,
    updateMetric,
    thresholds.memoryUsage,
    createAlert,
  ]);

  // Collect network metrics
  const collectNetworkMetrics = useCallback(() => {
    if (!collectDetailedMetrics) return;

    try {
      // Get cache statistics
      const cacheStats = cache.getStatistics();
      const realtimeStats = realtime.getStatistics();

      const networkMetrics: NetworkMetrics = {
        requestCount: 0, // Would need request interceptor
        averageResponseTime: 0, // Would need request timing
        errorRate: 0, // Would need error tracking
        cacheHitRate: cacheStats.hitRate,
        bandwidthUsage: 0, // Would need network monitoring
        activeConnections: realtime.state.isConnected ? 1 : 0,
        websocketLatency: realtime.getLatency(),
        retryAttempts: realtimeStats.reconnections,
      };

      setState((prev) => ({
        ...prev,
        networkMetrics,
      }));

      updateMetric('cache_hit_rate', networkMetrics.cacheHitRate, '%', 'cache');
      updateMetric(
        'websocket_latency',
        networkMetrics.websocketLatency,
        'ms',
        'realtime',
      );

      // Check for poor cache performance
      if (networkMetrics.cacheHitRate < thresholds.cacheHitRate.critical) {
        createAlert(
          'cache_miss_rate',
          'medium',
          `Low cache hit rate: ${networkMetrics.cacheHitRate}%`,
          ['cache'],
          [
            'Review cache strategy',
            'Optimize cache keys',
            'Increase cache size',
          ],
        );
      }

      // Check for high network latency
      if (
        networkMetrics.websocketLatency > thresholds.networkLatency.critical
      ) {
        createAlert(
          'network_latency',
          'high',
          `High network latency: ${networkMetrics.websocketLatency}ms`,
          ['realtime'],
          [
            'Check network connection',
            'Optimize data payload',
            'Consider regional servers',
          ],
        );
      }
    } catch (error) {
      console.warn('Network metrics collection failed:', error);
    }
  }, [
    collectDetailedMetrics,
    cache,
    realtime,
    updateMetric,
    thresholds.cacheHitRate,
    thresholds.networkLatency,
    createAlert,
  ]);

  // Calculate overall performance score
  const calculatePerformanceScore = useCallback(() => {
    let score = 100;
    const { vitalsTracking } = state;

    // LCP scoring (25% weight)
    if (vitalsTracking.lcp > 0) {
      if (vitalsTracking.lcp <= thresholds.lcp.good) score -= 0;
      else if (vitalsTracking.lcp <= thresholds.lcp.needs_improvement)
        score -= 10;
      else score -= 25;
    }

    // FID scoring (25% weight)
    if (vitalsTracking.fid > 0) {
      if (vitalsTracking.fid <= thresholds.fid.good) score -= 0;
      else if (vitalsTracking.fid <= thresholds.fid.needs_improvement)
        score -= 10;
      else score -= 25;
    }

    // CLS scoring (25% weight)
    if (vitalsTracking.cls > 0) {
      if (vitalsTracking.cls <= thresholds.cls.good) score -= 0;
      else if (vitalsTracking.cls <= thresholds.cls.needs_improvement)
        score -= 10;
      else score -= 25;
    }

    // Additional metrics (25% weight)
    const criticalAlerts = state.alerts.filter(
      (a) => a.severity === 'critical' && !a.acknowledged,
    ).length;
    const warningAlerts = state.alerts.filter(
      (a) => a.severity === 'warning' && !a.acknowledged,
    ).length;

    score -= criticalAlerts * 10;
    score -= warningAlerts * 5;

    score = Math.max(0, Math.min(100, score));

    setState((prev) => ({
      ...prev,
      performanceScore: score,
    }));

    updateMetric('overall_performance_score', score, '', 'rendering');
  }, [state, thresholds, updateMetric]);

  // Auto-optimization based on metrics
  const performAutoOptimization = useCallback(() => {
    if (!autoOptimize) return;

    const { memoryMetrics, networkMetrics } = state;

    // Memory optimization
    if (memoryMetrics.heapUsed > thresholds.memoryUsage.warning) {
      // Trigger garbage collection if possible
      try {
        if (window.gc) {
          window.gc();
        }
        // Clear old cache entries
        cache.clearExpired();
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Auto memory optimization failed:', error);
        }
        // Log to monitoring service in production
        // errorTracker.captureError(error, { context: 'memory_optimization' });
      }
    }

    // Cache optimization
    if (networkMetrics.cacheHitRate < thresholds.cacheHitRate.warning) {
      try {
        // Preload commonly accessed data
        cache.preloadCriticalData();
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Auto cache optimization failed:', error);
        }
        // Log to monitoring service in production
        // errorTracker.captureError(error, { context: 'cache_optimization' });
      }
    }
  }, [autoOptimize, state, thresholds, cache]);

  // Start performance recording
  const startRecording = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isRecording: true,
      recordingStartTime: Date.now(),
    }));

    // Start collecting metrics
    metricsCollectionRef.current = setInterval(() => {
      collectWebVitals();
      collectMemoryMetrics();
      collectNetworkMetrics();
      calculatePerformanceScore();
      performAutoOptimization();

      setState((prev) => ({
        ...prev,
        sessionDuration: Date.now() - prev.recordingStartTime,
      }));
    }, 1000); // Collect every second

    performanceMonitor.logMetric('performanceRecordingStarted', 1);
  }, [
    collectWebVitals,
    collectMemoryMetrics,
    collectNetworkMetrics,
    calculatePerformanceScore,
    performAutoOptimization,
    performanceMonitor,
  ]);

  // Stop performance recording
  const stopRecording = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isRecording: false,
    }));

    if (metricsCollectionRef.current) {
      clearInterval(metricsCollectionRef.current);
      metricsCollectionRef.current = null;
    }

    performanceMonitor.logMetric('performanceRecordingStopped', 1);
  }, [performanceMonitor]);

  // Clear all alerts
  const clearAllAlerts = useCallback(() => {
    setState((prev) => ({
      ...prev,
      alerts: [],
    }));

    // Clear all alert timeouts
    alertTimeoutRef.current.forEach((timeout) => clearTimeout(timeout));
    alertTimeoutRef.current.clear();
  }, []);

  // Export performance report
  const exportReport = useCallback(() => {
    const report = {
      timestamp: Date.now(),
      sessionDuration: state.sessionDuration,
      performanceScore: state.performanceScore,
      metrics: Object.fromEntries(state.metrics),
      alerts: state.alerts,
      vitalsTracking: state.vitalsTracking,
      memoryMetrics: {
        ...state.memoryMetrics,
        componentMemoryMap: Object.fromEntries(
          state.memoryMetrics.componentMemoryMap,
        ),
      },
      networkMetrics: state.networkMetrics,
      componentPerformance: Object.fromEntries(state.componentPerformance),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    performanceMonitor.logMetric('performanceReportExported', 1);
  }, [state, performanceMonitor]);

  // Initialize on mount
  useEffect(() => {
    startRecording();
    return () => {
      stopRecording();
    };
  }, [startRecording, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (metricsCollectionRef.current) {
        clearInterval(metricsCollectionRef.current);
      }
      if (vitalsObserverRef.current) {
        vitalsObserverRef.current.disconnect();
      }
      alertTimeoutRef.current.forEach((timeout) => clearTimeout(timeout));
    };
  }, []);

  // Get metrics by category
  const metricsByCategory = useMemo(() => {
    const categories = new Map<string, PerformanceMetric[]>();
    state.metrics.forEach((metric) => {
      if (!categories.has(metric.category)) {
        categories.set(metric.category, []);
      }
      categories.get(metric.category)!.push(metric);
    });
    return categories;
  }, [state.metrics]);

  // Get severity counts
  const severityCounts = useMemo(() => {
    const counts = { good: 0, warning: 0, critical: 0 };
    state.metrics.forEach((metric) => {
      counts[metric.severity]++;
    });
    return counts;
  }, [state.metrics]);

  return (
    <div
      className={`space-y-6 p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg ${className}`}
      data-testid={testId}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Advanced Performance Dashboard
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Real-time performance monitoring and optimization
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div
            className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
              state.performanceScore >= 90
                ? 'bg-green-100 text-green-800'
                : state.performanceScore >= 70
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-current"></div>
            <span className="text-sm font-medium">
              Score: {state.performanceScore}/100
            </span>
          </div>
          <button
            onClick={exportReport}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Export Report
          </button>
        </div>
      </div>

      {/* Web Vitals */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          {
            name: 'LCP',
            value: state.vitalsTracking.lcp,
            unit: 'ms',
            good: thresholds.lcp.good,
            needsImprovement: thresholds.lcp.needs_improvement,
          },
          {
            name: 'FID',
            value: state.vitalsTracking.fid,
            unit: 'ms',
            good: thresholds.fid.good,
            needsImprovement: thresholds.fid.needs_improvement,
          },
          {
            name: 'CLS',
            value: state.vitalsTracking.cls,
            unit: '',
            good: thresholds.cls.good,
            needsImprovement: thresholds.cls.needs_improvement,
          },
          {
            name: 'FCP',
            value: state.vitalsTracking.fcp,
            unit: 'ms',
            good: thresholds.fcp.good,
            needsImprovement: thresholds.fcp.needs_improvement,
          },
          {
            name: 'TTFB',
            value: state.vitalsTracking.ttfb,
            unit: 'ms',
            good: thresholds.ttfb.good,
            needsImprovement: thresholds.ttfb.needs_improvement,
          },
        ].map((vital) => (
          <div
            key={vital.name}
            className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {vital.name}
              </span>
              <div
                className={`w-3 h-3 rounded-full ${
                  vital.value <= vital.good
                    ? 'bg-green-500'
                    : vital.value <= vital.needsImprovement
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                }`}
              ></div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {vital.value > 0
                  ? `${Math.round(vital.value * 100) / 100}${vital.unit}`
                  : '—'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {state.alerts.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-400">
              Performance Alerts
            </h3>
            <button
              onClick={clearAllAlerts}
              className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              Clear All
            </button>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {state.alerts.slice(-5).map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start space-x-3 p-3 rounded-md ${
                  alert.severity === 'critical'
                    ? 'bg-red-100 dark:bg-red-900/20'
                    : alert.severity === 'high'
                      ? 'bg-orange-100 dark:bg-orange-900/20'
                      : 'bg-yellow-100 dark:bg-yellow-900/20'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full mt-2 ${
                    alert.severity === 'critical'
                      ? 'bg-red-500'
                      : alert.severity === 'high'
                        ? 'bg-orange-500'
                        : 'bg-yellow-500'
                  }`}
                ></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {alert.message}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Memory Metrics */}
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Memory Usage
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Heap Used
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {Math.round(state.memoryMetrics.heapUsed / 1024 / 1024)}MB
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Heap Total
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {Math.round(state.memoryMetrics.heapTotal / 1024 / 1024)}MB
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, (state.memoryMetrics.heapUsed / state.memoryMetrics.heapTotal) * 100)}%`,
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Network Metrics */}
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Network Performance
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Cache Hit Rate
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {Math.round(state.networkMetrics.cacheHitRate)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                WebSocket Latency
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {Math.round(state.networkMetrics.websocketLatency)}ms
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Connection Status
              </span>
              <div className="flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    realtime.state.isConnected ? 'bg-green-500' : 'bg-red-500'
                  }`}
                ></div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {realtime.state.isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Session Info */}
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
        <span>
          Session Duration: {Math.floor(state.sessionDuration / 1000)}s
        </span>
        <span>Metrics Collected: {state.metrics.size}</span>
        <div className="flex items-center space-x-2">
          <div
            className={`w-2 h-2 rounded-full ${state.isRecording ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}
          ></div>
          <span>{state.isRecording ? 'Recording' : 'Stopped'}</span>
        </div>
      </div>
    </div>
  );
};

export default AdvancedPerformanceDashboard;
