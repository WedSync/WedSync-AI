'use client';

interface ChartPerformanceMetrics {
  chartId: string;
  renderTime: number;
  dataPoints: number;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  animationDuration: number;
  memoryUsage?: number;
  frameRate?: number;
  interactionLatency: number;
  timestamp: number;
}

interface PerformanceThresholds {
  renderTime: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  frameRate: {
    minimum: number;
    target: number;
  };
  interactionLatency: {
    maximum: number;
  };
  memoryUsage: {
    warning: number;
    critical: number;
  };
}

class ChartPerformanceMonitor {
  private metrics: ChartPerformanceMetrics[] = [];
  private performanceObserver: PerformanceObserver | null = null;
  private memoryCheckInterval: NodeJS.Timeout | null = null;

  private readonly thresholds: PerformanceThresholds = {
    renderTime: {
      mobile: 300, // 300ms max render time on mobile
      tablet: 200, // 200ms max render time on tablet
      desktop: 100, // 100ms max render time on desktop
    },
    frameRate: {
      minimum: 30, // Minimum 30fps
      target: 60, // Target 60fps
    },
    interactionLatency: {
      maximum: 100, // Max 100ms response to user interaction
    },
    memoryUsage: {
      warning: 50, // Warning at 50MB
      critical: 100, // Critical at 100MB
    },
  };

  private listeners: {
    warning: ((metric: ChartPerformanceMetrics, issue: string) => void)[];
    critical: ((metric: ChartPerformanceMetrics, issue: string) => void)[];
  } = {
    warning: [],
    critical: [],
  };

  constructor() {
    this.initializePerformanceObserver();
    this.startMemoryMonitoring();
  }

  private initializePerformanceObserver() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        this.processPerformanceEntries(entries);
      });

      this.performanceObserver.observe({
        entryTypes: [
          'measure',
          'navigation',
          'paint',
          'largest-contentful-paint',
        ],
      });
    }
  }

  private startMemoryMonitoring() {
    if (typeof window !== 'undefined') {
      this.memoryCheckInterval = setInterval(() => {
        this.checkMemoryUsage();
      }, 5000); // Check every 5 seconds
    }
  }

  private processPerformanceEntries(entries: PerformanceEntry[]) {
    entries.forEach((entry) => {
      if (entry.name.startsWith('chart-render-')) {
        this.processChartRenderMetric(entry);
      }
    });
  }

  private processChartRenderMetric(entry: PerformanceEntry) {
    const chartId = entry.name.replace('chart-render-', '');
    const renderTime = entry.duration;
    const deviceType = this.getDeviceType();

    const threshold = this.thresholds.renderTime[deviceType];

    if (renderTime > threshold) {
      this.emitWarning(
        {
          chartId,
          renderTime,
          dataPoints: 0,
          deviceType,
          animationDuration: 0,
          interactionLatency: 0,
          timestamp: Date.now(),
        },
        `Render time ${renderTime.toFixed(2)}ms exceeds threshold of ${threshold}ms for ${deviceType}`,
      );
    }
  }

  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    if (typeof window === 'undefined') return 'desktop';

    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private checkMemoryUsage() {
    if (
      typeof window !== 'undefined' &&
      'performance' in window &&
      'memory' in window.performance
    ) {
      const memory = (window.performance as any).memory;
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;

      if (usedMB > this.thresholds.memoryUsage.critical) {
        this.emitCritical(
          {
            chartId: 'system',
            renderTime: 0,
            dataPoints: 0,
            deviceType: this.getDeviceType(),
            animationDuration: 0,
            interactionLatency: 0,
            memoryUsage: usedMB,
            timestamp: Date.now(),
          },
          `Critical memory usage: ${usedMB.toFixed(2)}MB`,
        );
      } else if (usedMB > this.thresholds.memoryUsage.warning) {
        this.emitWarning(
          {
            chartId: 'system',
            renderTime: 0,
            dataPoints: 0,
            deviceType: this.getDeviceType(),
            animationDuration: 0,
            interactionLatency: 0,
            memoryUsage: usedMB,
            timestamp: Date.now(),
          },
          `High memory usage: ${usedMB.toFixed(2)}MB`,
        );
      }
    }
  }

  public startChartRender(chartId: string): () => void {
    const startTime = performance.now();
    performance.mark(`chart-render-${chartId}-start`);

    return () => {
      performance.mark(`chart-render-${chartId}-end`);
      performance.measure(
        `chart-render-${chartId}`,
        `chart-render-${chartId}-start`,
        `chart-render-${chartId}-end`,
      );
    };
  }

  public recordInteraction(chartId: string, startTime: number): void {
    const endTime = performance.now();
    const latency = endTime - startTime;

    if (latency > this.thresholds.interactionLatency.maximum) {
      this.emitWarning(
        {
          chartId,
          renderTime: 0,
          dataPoints: 0,
          deviceType: this.getDeviceType(),
          animationDuration: 0,
          interactionLatency: latency,
          timestamp: Date.now(),
        },
        `Interaction latency ${latency.toFixed(2)}ms exceeds threshold`,
      );
    }
  }

  public recordMetric(
    metric: Omit<ChartPerformanceMetrics, 'timestamp'>,
  ): void {
    const fullMetric: ChartPerformanceMetrics = {
      ...metric,
      timestamp: Date.now(),
    };

    this.metrics.push(fullMetric);
    this.analyzeMetric(fullMetric);

    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  private analyzeMetric(metric: ChartPerformanceMetrics): void {
    const deviceThreshold = this.thresholds.renderTime[metric.deviceType];

    if (metric.renderTime > deviceThreshold) {
      this.emitWarning(
        metric,
        `Render time exceeds threshold for ${metric.deviceType}`,
      );
    }

    if (
      metric.frameRate &&
      metric.frameRate < this.thresholds.frameRate.minimum
    ) {
      this.emitCritical(
        metric,
        `Frame rate ${metric.frameRate} below minimum threshold`,
      );
    }

    if (
      metric.interactionLatency > this.thresholds.interactionLatency.maximum
    ) {
      this.emitWarning(metric, `Interaction latency too high`);
    }
  }

  private emitWarning(metric: ChartPerformanceMetrics, issue: string): void {
    this.listeners.warning.forEach((listener) => listener(metric, issue));

    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `Chart Performance Warning [${metric.chartId}]:`,
        issue,
        metric,
      );
    }
  }

  private emitCritical(metric: ChartPerformanceMetrics, issue: string): void {
    this.listeners.critical.forEach((listener) => listener(metric, issue));

    if (process.env.NODE_ENV === 'development') {
      console.error(
        `Chart Performance Critical [${metric.chartId}]:`,
        issue,
        metric,
      );
    }
  }

  public onWarning(
    listener: (metric: ChartPerformanceMetrics, issue: string) => void,
  ): () => void {
    this.listeners.warning.push(listener);
    return () => {
      const index = this.listeners.warning.indexOf(listener);
      if (index > -1) this.listeners.warning.splice(index, 1);
    };
  }

  public onCritical(
    listener: (metric: ChartPerformanceMetrics, issue: string) => void,
  ): () => void {
    this.listeners.critical.push(listener);
    return () => {
      const index = this.listeners.critical.indexOf(listener);
      if (index > -1) this.listeners.critical.splice(index, 1);
    };
  }

  public getMetrics(chartId?: string): ChartPerformanceMetrics[] {
    if (chartId) {
      return this.metrics.filter((m) => m.chartId === chartId);
    }
    return [...this.metrics];
  }

  public getAverageRenderTime(
    chartId?: string,
    deviceType?: 'mobile' | 'tablet' | 'desktop',
  ): number {
    let filteredMetrics = this.metrics;

    if (chartId) {
      filteredMetrics = filteredMetrics.filter((m) => m.chartId === chartId);
    }

    if (deviceType) {
      filteredMetrics = filteredMetrics.filter(
        (m) => m.deviceType === deviceType,
      );
    }

    if (filteredMetrics.length === 0) return 0;

    const totalRenderTime = filteredMetrics.reduce(
      (sum, m) => sum + m.renderTime,
      0,
    );
    return totalRenderTime / filteredMetrics.length;
  }

  public getPerformanceReport(): {
    totalMetrics: number;
    averageRenderTime: Record<string, number>;
    warningCount: number;
    criticalCount: number;
    slowestCharts: Array<{ chartId: string; averageRenderTime: number }>;
    deviceBreakdown: Record<string, number>;
  } {
    const now = Date.now();
    const lastHourMetrics = this.metrics.filter(
      (m) => now - m.timestamp < 3600000,
    ); // Last hour

    const deviceBreakdown = lastHourMetrics.reduce(
      (acc, m) => {
        acc[m.deviceType] = (acc[m.deviceType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const chartRenderTimes = lastHourMetrics.reduce(
      (acc, m) => {
        if (!acc[m.chartId]) acc[m.chartId] = [];
        acc[m.chartId].push(m.renderTime);
        return acc;
      },
      {} as Record<string, number[]>,
    );

    const averageRenderTime = Object.entries(chartRenderTimes).reduce(
      (acc, [chartId, times]) => {
        acc[chartId] =
          times.reduce((sum, time) => sum + time, 0) / times.length;
        return acc;
      },
      {} as Record<string, number>,
    );

    const slowestCharts = Object.entries(averageRenderTime)
      .map(([chartId, time]) => ({ chartId, averageRenderTime: time }))
      .sort((a, b) => b.averageRenderTime - a.averageRenderTime)
      .slice(0, 5);

    const warningCount = lastHourMetrics.filter((m) => {
      const threshold = this.thresholds.renderTime[m.deviceType];
      return m.renderTime > threshold;
    }).length;

    const criticalCount = lastHourMetrics.filter((m) => {
      return m.frameRate && m.frameRate < this.thresholds.frameRate.minimum;
    }).length;

    return {
      totalMetrics: lastHourMetrics.length,
      averageRenderTime,
      warningCount,
      criticalCount,
      slowestCharts,
      deviceBreakdown,
    };
  }

  public clearMetrics(): void {
    this.metrics = [];
  }

  public destroy(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }

    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }

    this.listeners.warning = [];
    this.listeners.critical = [];
  }
}

// Global instance
const chartPerformanceMonitor = new ChartPerformanceMonitor();

// React hook for using the performance monitor
export const useChartPerformance = (chartId: string) => {
  const startRender = () => chartPerformanceMonitor.startChartRender(chartId);
  const recordInteraction = (startTime: number) =>
    chartPerformanceMonitor.recordInteraction(chartId, startTime);
  const recordMetric = (
    metric: Omit<ChartPerformanceMetrics, 'timestamp' | 'chartId'>,
  ) => chartPerformanceMonitor.recordMetric({ ...metric, chartId });

  return {
    startRender,
    recordInteraction,
    recordMetric,
    getMetrics: () => chartPerformanceMonitor.getMetrics(chartId),
    getAverageRenderTime: (deviceType?: 'mobile' | 'tablet' | 'desktop') =>
      chartPerformanceMonitor.getAverageRenderTime(chartId, deviceType),
  };
};

export { chartPerformanceMonitor, ChartPerformanceMonitor };
export type { ChartPerformanceMetrics, PerformanceThresholds };
