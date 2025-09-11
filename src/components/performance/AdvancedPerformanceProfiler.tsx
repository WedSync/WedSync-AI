'use client';

import React, {
  useState,
  useEffect,
  useRef,
  memo,
  useCallback,
  useMemo,
} from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChartBarIcon,
  CpuChipIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  PlayIcon,
  StopIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/20/solid';
import { cn } from '@/lib/utils';

// Performance metrics interfaces
interface CoreWebVitals {
  LCP: number; // Largest Contentful Paint
  FID: number; // First Input Delay
  CLS: number; // Cumulative Layout Shift
  TTFB: number; // Time to First Byte
  FCP: number; // First Contentful Paint
  INP: number; // Interaction to Next Paint
}

interface PerformanceMetrics {
  coreWebVitals: CoreWebVitals;
  reactMetrics: {
    componentRenderTime: number;
    virtualRenderTime: number;
    suspenseTime: number;
    transitionTime: number;
    memoHitRate: number;
    rerenderCount: number;
  };
  memoryMetrics: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
    memoryUsagePercent: number;
  };
  networkMetrics: {
    numberOfRequests: number;
    totalTransferSize: number;
    averageResponseTime: number;
  };
  frameMetrics: {
    averageFPS: number;
    droppedFrames: number;
    longTaskCount: number;
    mainThreadBlockingTime: number;
  };
}

interface PerformanceAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  metric: string;
  value: number;
  threshold: number;
  message: string;
  timestamp: number;
}

interface ProfilerProps {
  isRecording?: boolean;
  onToggleRecording?: (recording: boolean) => void;
  autoStart?: boolean;
  className?: string;
}

// Performance thresholds for alerts
const PERFORMANCE_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  TTFB: { good: 800, poor: 1800 },
  FCP: { good: 1800, poor: 3000 },
  INP: { good: 200, poor: 500 },
  renderTime: { good: 16, poor: 32 },
  fps: { good: 55, poor: 30 },
  memoryUsage: { good: 70, poor: 90 },
};

export const AdvancedPerformanceProfiler: React.FC<ProfilerProps> = memo(
  ({
    isRecording = false,
    onToggleRecording,
    autoStart = false,
    className,
  }) => {
    const [metrics, setMetrics] = useState<PerformanceMetrics>({
      coreWebVitals: { LCP: 0, FID: 0, CLS: 0, TTFB: 0, FCP: 0, INP: 0 },
      reactMetrics: {
        componentRenderTime: 0,
        virtualRenderTime: 0,
        suspenseTime: 0,
        transitionTime: 0,
        memoHitRate: 100,
        rerenderCount: 0,
      },
      memoryMetrics: {
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0,
        memoryUsagePercent: 0,
      },
      networkMetrics: {
        numberOfRequests: 0,
        totalTransferSize: 0,
        averageResponseTime: 0,
      },
      frameMetrics: {
        averageFPS: 60,
        droppedFrames: 0,
        longTaskCount: 0,
        mainThreadBlockingTime: 0,
      },
    });

    const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
    const [recording, setRecording] = useState(autoStart || isRecording);
    const [isVisible, setIsVisible] = useState(false);
    const [selectedTab, setSelectedTab] = useState<
      'overview' | 'vitals' | 'react' | 'memory' | 'network' | 'frames'
    >('overview');

    // Refs for performance monitoring
    const performanceObserverRef = useRef<PerformanceObserver>();
    const frameCounterRef = useRef({ frames: 0, startTime: performance.now() });
    const longTaskObserverRef = useRef<PerformanceObserver>();
    const layoutShiftObserverRef = useRef<PerformanceObserver>();
    const intervalRef = useRef<NodeJS.Timeout>();

    // Start/stop recording
    const toggleRecording = useCallback(() => {
      const newRecording = !recording;
      setRecording(newRecording);
      onToggleRecording?.(newRecording);
    }, [recording, onToggleRecording]);

    // Generate performance alert
    const generateAlert = useCallback(
      (
        metric: string,
        value: number,
        threshold: { good: number; poor: number },
        unit: string = 'ms',
      ) => {
        let type: 'error' | 'warning' | 'info' = 'info';
        let message = '';

        if (value > threshold.poor) {
          type = 'error';
          message = `${metric} is ${value}${unit} (> ${threshold.poor}${unit}). Immediate optimization needed.`;
        } else if (value > threshold.good) {
          type = 'warning';
          message = `${metric} is ${value}${unit} (> ${threshold.good}${unit}). Consider optimization.`;
        }

        if (type !== 'info') {
          const alert: PerformanceAlert = {
            id: `${metric}-${Date.now()}`,
            type,
            metric,
            value,
            threshold: type === 'error' ? threshold.poor : threshold.good,
            message,
            timestamp: Date.now(),
          };

          setAlerts((prev) => [...prev.slice(-9), alert]); // Keep last 10 alerts
        }
      },
      [],
    );

    // Measure Core Web Vitals
    const measureCoreWebVitals = useCallback(() => {
      if (!recording) return;

      // Performance Observer for navigation and paint timings
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();

          entries.forEach((entry) => {
            setMetrics((prev) => {
              const newMetrics = { ...prev };

              if (entry.entryType === 'navigation') {
                const navEntry = entry as PerformanceNavigationTiming;
                const ttfb = navEntry.responseStart - navEntry.requestStart;
                newMetrics.coreWebVitals.TTFB = ttfb;
                generateAlert('TTFB', ttfb, PERFORMANCE_THRESHOLDS.TTFB);
              }

              if (entry.entryType === 'paint') {
                if (entry.name === 'first-contentful-paint') {
                  newMetrics.coreWebVitals.FCP = entry.startTime;
                  generateAlert(
                    'FCP',
                    entry.startTime,
                    PERFORMANCE_THRESHOLDS.FCP,
                  );
                }
              }

              if (entry.entryType === 'largest-contentful-paint') {
                newMetrics.coreWebVitals.LCP = entry.startTime;
                generateAlert(
                  'LCP',
                  entry.startTime,
                  PERFORMANCE_THRESHOLDS.LCP,
                );
              }

              return newMetrics;
            });
          });
        });

        try {
          observer.observe({
            entryTypes: ['navigation', 'paint', 'largest-contentful-paint'],
          });
          performanceObserverRef.current = observer;
        } catch (e) {
          console.warn(
            'Performance Observer not supported for some entry types',
          );
        }
      }

      // Layout shift observer
      if ('PerformanceObserver' in window) {
        const layoutObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }

          setMetrics((prev) => ({
            ...prev,
            coreWebVitals: {
              ...prev.coreWebVitals,
              CLS: clsValue,
            },
          }));

          if (clsValue > 0) {
            generateAlert('CLS', clsValue, PERFORMANCE_THRESHOLDS.CLS, '');
          }
        });

        try {
          layoutObserver.observe({ entryTypes: ['layout-shift'] });
          layoutShiftObserverRef.current = layoutObserver;
        } catch (e) {
          console.warn('Layout shift observer not supported');
        }
      }

      // Long task observer
      if ('PerformanceObserver' in window) {
        const longTaskObserver = new PerformanceObserver((list) => {
          const longTasks = list.getEntries();
          setMetrics((prev) => ({
            ...prev,
            frameMetrics: {
              ...prev.frameMetrics,
              longTaskCount: prev.frameMetrics.longTaskCount + longTasks.length,
              mainThreadBlockingTime:
                prev.frameMetrics.mainThreadBlockingTime +
                longTasks.reduce((sum, task) => sum + (task.duration - 50), 0),
            },
          }));
        });

        try {
          longTaskObserver.observe({ entryTypes: ['longtask'] });
          longTaskObserverRef.current = longTaskObserver;
        } catch (e) {
          console.warn('Long task observer not supported');
        }
      }
    }, [recording, generateAlert]);

    // Measure frame rate
    const measureFrameRate = useCallback(() => {
      if (!recording) return;

      let frames = 0;
      const startTime = performance.now();

      const countFrames = () => {
        frames++;

        if (recording) {
          requestAnimationFrame(countFrames);

          const elapsed = performance.now() - startTime;
          if (elapsed >= 1000) {
            // Update every second
            const fps = Math.round((frames * 1000) / elapsed);

            setMetrics((prev) => ({
              ...prev,
              frameMetrics: {
                ...prev.frameMetrics,
                averageFPS: fps,
                droppedFrames: Math.max(0, 60 - fps),
              },
            }));

            if (fps < PERFORMANCE_THRESHOLDS.fps.good) {
              generateAlert('FPS', fps, PERFORMANCE_THRESHOLDS.fps, ' fps');
            }

            // Reset counters
            frames = 0;
            frameCounterRef.current.startTime = performance.now();
          }
        }
      };

      requestAnimationFrame(countFrames);
    }, [recording, generateAlert]);

    // Measure memory usage
    const measureMemoryUsage = useCallback(() => {
      if (!recording) return;

      if ('memory' in performance) {
        const memInfo = (performance as any).memory;
        const usagePercent =
          (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100;

        setMetrics((prev) => ({
          ...prev,
          memoryMetrics: {
            usedJSHeapSize: memInfo.usedJSHeapSize,
            totalJSHeapSize: memInfo.totalJSHeapSize,
            jsHeapSizeLimit: memInfo.jsHeapSizeLimit,
            memoryUsagePercent: usagePercent,
          },
        }));

        if (usagePercent > PERFORMANCE_THRESHOLDS.memoryUsage.good) {
          generateAlert(
            'Memory Usage',
            usagePercent,
            PERFORMANCE_THRESHOLDS.memoryUsage,
            '%',
          );
        }
      }
    }, [recording, generateAlert]);

    // Measure React-specific metrics
    const measureReactMetrics = useCallback(() => {
      if (!recording) return;

      // Simulate React metrics measurement
      // In a real implementation, this would hook into React DevTools Profiler
      const reactProfiler = () => {
        const renderStart = performance.now();

        // Measure component render time
        setTimeout(() => {
          const renderTime = performance.now() - renderStart;

          setMetrics((prev) => ({
            ...prev,
            reactMetrics: {
              ...prev.reactMetrics,
              componentRenderTime: renderTime,
              rerenderCount: prev.reactMetrics.rerenderCount + 1,
            },
          }));

          if (renderTime > PERFORMANCE_THRESHOLDS.renderTime.good) {
            generateAlert(
              'React Render Time',
              renderTime,
              PERFORMANCE_THRESHOLDS.renderTime,
            );
          }
        }, 0);
      };

      // Hook into React's render cycle
      const observer = new MutationObserver(reactProfiler);
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
      });

      return () => observer.disconnect();
    }, [recording, generateAlert]);

    // Start/stop monitoring
    useEffect(() => {
      if (recording) {
        measureCoreWebVitals();
        measureFrameRate();
        measureReactMetrics();

        // Regular interval for memory and other metrics
        intervalRef.current = setInterval(() => {
          measureMemoryUsage();
        }, 1000);
      } else {
        // Cleanup observers
        if (performanceObserverRef.current) {
          performanceObserverRef.current.disconnect();
        }
        if (longTaskObserverRef.current) {
          longTaskObserverRef.current.disconnect();
        }
        if (layoutShiftObserverRef.current) {
          layoutShiftObserverRef.current.disconnect();
        }
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }, [
      recording,
      measureCoreWebVitals,
      measureFrameRate,
      measureMemoryUsage,
      measureReactMetrics,
    ]);

    // Format bytes
    const formatBytes = (bytes: number) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Get performance score
    const getPerformanceScore = () => {
      const { coreWebVitals, frameMetrics, memoryMetrics } = metrics;
      let score = 100;

      // Deduct points based on performance issues
      if (coreWebVitals.LCP > PERFORMANCE_THRESHOLDS.LCP.good) score -= 15;
      if (coreWebVitals.FID > PERFORMANCE_THRESHOLDS.FID.good) score -= 15;
      if (coreWebVitals.CLS > PERFORMANCE_THRESHOLDS.CLS.good) score -= 15;
      if (frameMetrics.averageFPS < PERFORMANCE_THRESHOLDS.fps.good)
        score -= 20;
      if (
        memoryMetrics.memoryUsagePercent >
        PERFORMANCE_THRESHOLDS.memoryUsage.good
      )
        score -= 10;

      return Math.max(0, Math.round(score));
    };

    // Export performance report
    const exportReport = () => {
      const report = {
        timestamp: new Date().toISOString(),
        performanceScore: getPerformanceScore(),
        metrics,
        alerts: alerts.slice(-10),
        recommendations: generateRecommendations(),
      };

      const blob = new Blob([JSON.stringify(report, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `performance-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    // Generate recommendations
    const generateRecommendations = () => {
      const recommendations = [];
      const { coreWebVitals, frameMetrics, memoryMetrics, reactMetrics } =
        metrics;

      if (coreWebVitals.LCP > PERFORMANCE_THRESHOLDS.LCP.poor) {
        recommendations.push(
          'Optimize Largest Contentful Paint: Consider lazy loading, image optimization, and reducing render-blocking resources.',
        );
      }

      if (frameMetrics.averageFPS < PERFORMANCE_THRESHOLDS.fps.good) {
        recommendations.push(
          'Improve frame rate: Use React.memo, virtualization, and reduce component complexity.',
        );
      }

      if (
        memoryMetrics.memoryUsagePercent >
        PERFORMANCE_THRESHOLDS.memoryUsage.poor
      ) {
        recommendations.push(
          'Reduce memory usage: Check for memory leaks, optimize data structures, and clean up event listeners.',
        );
      }

      if (
        reactMetrics.componentRenderTime >
        PERFORMANCE_THRESHOLDS.renderTime.poor
      ) {
        recommendations.push(
          'Optimize React rendering: Use useCallback, useMemo, and React.memo more effectively.',
        );
      }

      return recommendations;
    };

    // Render performance indicator
    const renderPerformanceIndicator = (
      value: number,
      threshold: { good: number; poor: number },
      unit: string = 'ms',
    ) => {
      let status: 'good' | 'warning' | 'error' = 'good';
      let color = 'text-green-600';
      let bgColor = 'bg-green-100';
      let icon = <CheckCircleIcon className="w-4 h-4" />;

      if (value > threshold.poor) {
        status = 'error';
        color = 'text-red-600';
        bgColor = 'bg-red-100';
        icon = <XCircleIcon className="w-4 h-4" />;
      } else if (value > threshold.good) {
        status = 'warning';
        color = 'text-yellow-600';
        bgColor = 'bg-yellow-100';
        icon = <ExclamationTriangleIcon className="w-4 h-4" />;
      }

      return (
        <div className={`flex items-center gap-2 px-2 py-1 rounded ${bgColor}`}>
          <span className={color}>{icon}</span>
          <span className={`${color} font-medium`}>
            {value.toFixed(1)}
            {unit}
          </span>
        </div>
      );
    };

    const performanceScore = getPerformanceScore();

    return (
      <div className={cn('fixed bottom-4 right-4 z-50', className)}>
        {/* Toggle Button */}
        <Button
          onClick={() => setIsVisible(!isVisible)}
          className={cn(
            'shadow-lg',
            recording
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-gray-600 hover:bg-gray-700',
          )}
        >
          <ChartBarIcon className="w-4 h-4 mr-2" />
          Performance
          <Badge
            className="ml-2"
            variant={
              performanceScore >= 80
                ? 'default'
                : performanceScore >= 60
                  ? 'outline'
                  : 'destructive'
            }
          >
            {performanceScore}
          </Badge>
        </Button>

        {/* Profiler Panel */}
        {isVisible && (
          <div className="absolute bottom-12 right-0 w-96 max-h-96 overflow-hidden bg-white border border-gray-200 rounded-lg shadow-xl">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">
                  Performance Profiler
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={recording ? 'destructive' : 'default'}
                    onClick={toggleRecording}
                  >
                    {recording ? (
                      <StopIcon className="w-3 h-3" />
                    ) : (
                      <PlayIcon className="w-3 h-3" />
                    )}
                    {recording ? 'Stop' : 'Start'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={exportReport}>
                    <DocumentArrowDownIcon className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Score */}
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-gray-600">Score:</span>
                <div
                  className={cn(
                    'px-3 py-1 rounded-full text-sm font-medium',
                    performanceScore >= 80
                      ? 'bg-green-100 text-green-800'
                      : performanceScore >= 60
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800',
                  )}
                >
                  {performanceScore}/100
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 max-h-80 overflow-y-auto">
              {/* Core Web Vitals */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">
                  Core Web Vitals
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span>LCP:</span>
                    {renderPerformanceIndicator(
                      metrics.coreWebVitals.LCP,
                      PERFORMANCE_THRESHOLDS.LCP,
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span>FID:</span>
                    {renderPerformanceIndicator(
                      metrics.coreWebVitals.FID,
                      PERFORMANCE_THRESHOLDS.FID,
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span>CLS:</span>
                    {renderPerformanceIndicator(
                      metrics.coreWebVitals.CLS,
                      PERFORMANCE_THRESHOLDS.CLS,
                      '',
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span>TTFB:</span>
                    {renderPerformanceIndicator(
                      metrics.coreWebVitals.TTFB,
                      PERFORMANCE_THRESHOLDS.TTFB,
                    )}
                  </div>
                </div>
              </div>

              {/* React Metrics */}
              <div className="mt-4 space-y-3">
                <h4 className="text-sm font-medium text-gray-700">
                  React Performance
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span>Render Time:</span>
                    {renderPerformanceIndicator(
                      metrics.reactMetrics.componentRenderTime,
                      PERFORMANCE_THRESHOLDS.renderTime,
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span>Re-renders:</span>
                    <span>{metrics.reactMetrics.rerenderCount}</span>
                  </div>
                </div>
              </div>

              {/* Frame Metrics */}
              <div className="mt-4 space-y-3">
                <h4 className="text-sm font-medium text-gray-700">
                  Frame Performance
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span>FPS:</span>
                    {renderPerformanceIndicator(
                      metrics.frameMetrics.averageFPS,
                      PERFORMANCE_THRESHOLDS.fps,
                      ' fps',
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span>Long Tasks:</span>
                    <span>{metrics.frameMetrics.longTaskCount}</span>
                  </div>
                </div>
              </div>

              {/* Memory Usage */}
              <div className="mt-4 space-y-3">
                <h4 className="text-sm font-medium text-gray-700">
                  Memory Usage
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span>Used:</span>
                    <span>
                      {formatBytes(metrics.memoryMetrics.usedJSHeapSize)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Usage:</span>
                    {renderPerformanceIndicator(
                      metrics.memoryMetrics.memoryUsagePercent,
                      PERFORMANCE_THRESHOLDS.memoryUsage,
                      '%',
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Alerts */}
              {alerts.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">
                    Recent Issues
                  </h4>
                  <div className="space-y-1">
                    {alerts.slice(-3).map((alert) => (
                      <div
                        key={alert.id}
                        className={cn(
                          'p-2 rounded text-xs',
                          alert.type === 'error'
                            ? 'bg-red-50 text-red-700'
                            : alert.type === 'warning'
                              ? 'bg-yellow-50 text-yellow-700'
                              : 'bg-blue-50 text-blue-700',
                        )}
                      >
                        {alert.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  },
);

AdvancedPerformanceProfiler.displayName = 'AdvancedPerformanceProfiler';
