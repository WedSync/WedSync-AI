'use client';

interface TouchMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  type: 'tap' | 'swipe' | 'pinch' | 'drag' | 'longpress';
  targetElement?: string;
  successful: boolean;
}

interface PerformanceReport {
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  totalInteractions: number;
  over16msCount: number;
  under16msCount: number;
  successRate: number;
  timestamp: number;
}

class TouchPerformanceMonitor {
  private metrics: TouchMetrics[] = [];
  private isMonitoring: boolean = false;
  private readonly TARGET_RESPONSE_TIME = 16.67; // 60fps target
  private readonly MAX_METRICS = 1000; // Prevent memory leaks

  constructor() {
    this.setupPerformanceObserver();
  }

  private setupPerformanceObserver() {
    if (typeof window === 'undefined') return;

    try {
      // Monitor long tasks that could affect touch response
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > this.TARGET_RESPONSE_TIME) {
              console.warn(`Long task detected: ${entry.duration}ms`, entry);
            }
          }
        });

        observer.observe({ entryTypes: ['longtask'] });
      }
    } catch (error) {
      console.error('Failed to setup performance observer:', error);
    }
  }

  startMonitoring(): void {
    this.isMonitoring = true;
    console.log('Touch performance monitoring started');
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
    console.log('Touch performance monitoring stopped');
  }

  recordInteraction(
    type: TouchMetrics['type'],
    startTime: number,
    endTime: number,
    targetElement?: string,
    successful: boolean = true,
  ): void {
    if (!this.isMonitoring) return;

    const duration = endTime - startTime;

    const metric: TouchMetrics = {
      startTime,
      endTime,
      duration,
      type,
      targetElement,
      successful,
    };

    this.metrics.push(metric);

    // Prevent memory leaks
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS / 2);
    }

    // Log warnings for slow responses
    if (duration > this.TARGET_RESPONSE_TIME) {
      console.warn(`Slow touch response: ${duration.toFixed(2)}ms (${type})`, {
        target: targetElement,
        acceptable: false,
      });
    }
  }

  getPerformanceReport(): PerformanceReport {
    if (this.metrics.length === 0) {
      return {
        averageResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: 0,
        totalInteractions: 0,
        over16msCount: 0,
        under16msCount: 0,
        successRate: 0,
        timestamp: Date.now(),
      };
    }

    const durations = this.metrics.map((m) => m.duration);
    const successful = this.metrics.filter((m) => m.successful);

    const averageResponseTime =
      durations.reduce((a, b) => a + b, 0) / durations.length;
    const maxResponseTime = Math.max(...durations);
    const minResponseTime = Math.min(...durations);
    const over16msCount = durations.filter(
      (d) => d > this.TARGET_RESPONSE_TIME,
    ).length;
    const under16msCount = durations.filter(
      (d) => d <= this.TARGET_RESPONSE_TIME,
    ).length;

    return {
      averageResponseTime,
      maxResponseTime,
      minResponseTime,
      totalInteractions: this.metrics.length,
      over16msCount,
      under16msCount,
      successRate: (successful.length / this.metrics.length) * 100,
      timestamp: Date.now(),
    };
  }

  getMetricsByType(type: TouchMetrics['type']): TouchMetrics[] {
    return this.metrics.filter((m) => m.type === type);
  }

  clearMetrics(): void {
    this.metrics = [];
  }

  exportMetrics(): string {
    return JSON.stringify(
      {
        metrics: this.metrics,
        report: this.getPerformanceReport(),
        exportTime: new Date().toISOString(),
      },
      null,
      2,
    );
  }

  // Real-time performance check
  isPerformanceAcceptable(): boolean {
    const report = this.getPerformanceReport();
    return (
      report.averageResponseTime <= this.TARGET_RESPONSE_TIME &&
      report.over16msCount / Math.max(report.totalInteractions, 1) < 0.1
    ); // Less than 10% slow responses
  }

  // Get performance grade
  getPerformanceGrade(): 'A' | 'B' | 'C' | 'D' | 'F' {
    const report = this.getPerformanceReport();
    const avgResponse = report.averageResponseTime;

    if (avgResponse <= 8) return 'A'; // Excellent
    if (avgResponse <= 12) return 'B'; // Good
    if (avgResponse <= 16) return 'C'; // Acceptable
    if (avgResponse <= 25) return 'D'; // Poor
    return 'F'; // Unacceptable
  }
}

// Global instance
let touchMonitor: TouchPerformanceMonitor | null = null;

export function getTouchPerformanceMonitor(): TouchPerformanceMonitor {
  if (!touchMonitor) {
    touchMonitor = new TouchPerformanceMonitor();
  }
  return touchMonitor;
}

// Hook for React components
export function useTouchPerformanceMonitor() {
  const monitor = getTouchPerformanceMonitor();

  const measureInteraction = (
    type: TouchMetrics['type'],
    callback: () => void | Promise<void>,
    targetElement?: string,
  ): void => {
    const startTime = performance.now();

    const finish = () => {
      const endTime = performance.now();
      monitor.recordInteraction(type, startTime, endTime, targetElement, true);
    };

    try {
      const result = callback();

      if (result instanceof Promise) {
        result.then(finish).catch((error) => {
          const endTime = performance.now();
          monitor.recordInteraction(
            type,
            startTime,
            endTime,
            targetElement,
            false,
          );
          throw error;
        });
      } else {
        finish();
      }
    } catch (error) {
      const endTime = performance.now();
      monitor.recordInteraction(type, startTime, endTime, targetElement, false);
      throw error;
    }
  };

  return {
    monitor,
    measureInteraction,
    startMonitoring: () => monitor.startMonitoring(),
    stopMonitoring: () => monitor.stopMonitoring(),
    getReport: () => monitor.getPerformanceReport(),
    isPerformanceAcceptable: () => monitor.isPerformanceAcceptable(),
    getGrade: () => monitor.getPerformanceGrade(),
  };
}

// Enhanced touch event handlers with performance monitoring
export function withTouchPerformanceMonitoring<
  T extends (...args: any[]) => any,
>(handler: T, type: TouchMetrics['type'], targetElement?: string): T {
  const monitor = getTouchPerformanceMonitor();

  return ((...args: Parameters<T>) => {
    const startTime = performance.now();

    try {
      const result = handler(...args);

      if (result instanceof Promise) {
        return result
          .then((value) => {
            const endTime = performance.now();
            monitor.recordInteraction(
              type,
              startTime,
              endTime,
              targetElement,
              true,
            );
            return value;
          })
          .catch((error) => {
            const endTime = performance.now();
            monitor.recordInteraction(
              type,
              startTime,
              endTime,
              targetElement,
              false,
            );
            throw error;
          });
      } else {
        const endTime = performance.now();
        monitor.recordInteraction(
          type,
          startTime,
          endTime,
          targetElement,
          true,
        );
        return result;
      }
    } catch (error) {
      const endTime = performance.now();
      monitor.recordInteraction(type, startTime, endTime, targetElement, false);
      throw error;
    }
  }) as T;
}

// Performance validation utilities
export const TouchPerformanceUtils = {
  validate60FPS: (metrics: TouchMetrics[]): boolean => {
    const durations = metrics.map((m) => m.duration);
    const average = durations.reduce((a, b) => a + b, 0) / durations.length;
    return average <= 16.67;
  },

  getSlowInteractions: (metrics: TouchMetrics[]): TouchMetrics[] => {
    return metrics.filter((m) => m.duration > 16.67);
  },

  generateCSVReport: (metrics: TouchMetrics[]): string => {
    const headers = [
      'Timestamp',
      'Type',
      'Duration (ms)',
      'Target',
      'Successful',
    ];
    const rows = metrics.map((m) => [
      new Date(m.startTime).toISOString(),
      m.type,
      m.duration.toFixed(2),
      m.targetElement || 'unknown',
      m.successful ? 'Yes' : 'No',
    ]);

    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  },

  analyzePerformanceTrends: (
    metrics: TouchMetrics[],
  ): {
    improving: boolean;
    degrading: boolean;
    stable: boolean;
  } => {
    if (metrics.length < 10) {
      return { improving: false, degrading: false, stable: true };
    }

    const halfPoint = Math.floor(metrics.length / 2);
    const firstHalf = metrics.slice(0, halfPoint);
    const secondHalf = metrics.slice(halfPoint);

    const firstAvg =
      firstHalf.reduce((a, m) => a + m.duration, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((a, m) => a + m.duration, 0) / secondHalf.length;

    const difference = secondAvg - firstAvg;
    const threshold = 2; // 2ms threshold

    return {
      improving: difference < -threshold,
      degrading: difference > threshold,
      stable: Math.abs(difference) <= threshold,
    };
  },
};

export type { TouchMetrics, PerformanceReport };
