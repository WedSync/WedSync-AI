import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  chartPerformanceMonitor,
  useChartPerformance,
} from '../../lib/charts/performance-monitor';
import { renderHook, act } from '@testing-library/react';

// Mock performance API
const mockPerformance = {
  now: vi.fn(),
  mark: vi.fn(),
  measure: vi.fn(),
  memory: {
    usedJSHeapSize: 50000000, // 50MB
  },
};

Object.defineProperty(global, 'performance', {
  writable: true,
  value: mockPerformance,
});

// Mock PerformanceObserver
const mockPerformanceObserver = vi.fn();
mockPerformanceObserver.prototype.observe = vi.fn();
mockPerformanceObserver.prototype.disconnect = vi.fn();
global.PerformanceObserver = mockPerformanceObserver;

describe('ChartPerformanceMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chartPerformanceMonitor.clearMetrics();
    mockPerformance.now.mockReturnValue(1000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Performance Monitoring', () => {
    it('should start and end chart render measurement', () => {
      const endRender = chartPerformanceMonitor.startChartRender('test-chart');

      expect(mockPerformance.mark).toHaveBeenCalledWith(
        'chart-render-test-chart-start',
      );

      endRender();

      expect(mockPerformance.mark).toHaveBeenCalledWith(
        'chart-render-test-chart-end',
      );
      expect(mockPerformance.measure).toHaveBeenCalledWith(
        'chart-render-test-chart',
        'chart-render-test-chart-start',
        'chart-render-test-chart-end',
      );
    });

    it('should record interaction latency', () => {
      const startTime = 1000;
      mockPerformance.now.mockReturnValue(1150); // 150ms later

      chartPerformanceMonitor.recordInteraction('test-chart', startTime);

      // Should emit warning for high latency (>100ms threshold)
      const metrics = chartPerformanceMonitor.getMetrics('test-chart');
      expect(metrics).toHaveLength(0); // No metrics stored for interactions currently
    });

    it('should record performance metrics', () => {
      const metric = {
        chartId: 'test-chart',
        renderTime: 150,
        dataPoints: 100,
        deviceType: 'desktop' as const,
        animationDuration: 500,
        interactionLatency: 50,
      };

      chartPerformanceMonitor.recordMetric(metric);

      const metrics = chartPerformanceMonitor.getMetrics('test-chart');
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toMatchObject(metric);
      expect(metrics[0].timestamp).toBeDefined();
    });

    it('should calculate average render time', () => {
      // Record multiple metrics
      chartPerformanceMonitor.recordMetric({
        chartId: 'test-chart',
        renderTime: 100,
        dataPoints: 50,
        deviceType: 'desktop',
        animationDuration: 300,
        interactionLatency: 20,
      });

      chartPerformanceMonitor.recordMetric({
        chartId: 'test-chart',
        renderTime: 200,
        dataPoints: 100,
        deviceType: 'desktop',
        animationDuration: 500,
        interactionLatency: 30,
      });

      const average =
        chartPerformanceMonitor.getAverageRenderTime('test-chart');
      expect(average).toBe(150); // (100 + 200) / 2
    });

    it('should calculate average render time by device type', () => {
      chartPerformanceMonitor.recordMetric({
        chartId: 'test-chart',
        renderTime: 100,
        dataPoints: 50,
        deviceType: 'desktop',
        animationDuration: 300,
        interactionLatency: 20,
      });

      chartPerformanceMonitor.recordMetric({
        chartId: 'test-chart',
        renderTime: 300,
        dataPoints: 50,
        deviceType: 'mobile',
        animationDuration: 300,
        interactionLatency: 50,
      });

      const desktopAverage = chartPerformanceMonitor.getAverageRenderTime(
        'test-chart',
        'desktop',
      );
      const mobileAverage = chartPerformanceMonitor.getAverageRenderTime(
        'test-chart',
        'mobile',
      );

      expect(desktopAverage).toBe(100);
      expect(mobileAverage).toBe(300);
    });

    it('should generate comprehensive performance report', () => {
      // Record metrics for different charts and devices
      const metrics = [
        {
          chartId: 'chart-1',
          renderTime: 150,
          dataPoints: 100,
          deviceType: 'desktop' as const,
          animationDuration: 400,
          interactionLatency: 25,
        },
        {
          chartId: 'chart-2',
          renderTime: 250,
          dataPoints: 200,
          deviceType: 'mobile' as const,
          animationDuration: 300,
          interactionLatency: 75,
        },
        {
          chartId: 'chart-1',
          renderTime: 100,
          dataPoints: 50,
          deviceType: 'tablet' as const,
          animationDuration: 350,
          interactionLatency: 15,
        },
      ];

      metrics.forEach((metric) => {
        chartPerformanceMonitor.recordMetric(metric);
      });

      const report = chartPerformanceMonitor.getPerformanceReport();

      expect(report.totalMetrics).toBe(3);
      expect(report.averageRenderTime).toHaveProperty('chart-1');
      expect(report.averageRenderTime).toHaveProperty('chart-2');
      expect(report.slowestCharts).toHaveLength(2);
      expect(report.deviceBreakdown).toHaveProperty('desktop');
      expect(report.deviceBreakdown).toHaveProperty('mobile');
      expect(report.deviceBreakdown).toHaveProperty('tablet');
    });

    it('should limit stored metrics to prevent memory leaks', () => {
      // Record more than 1000 metrics
      for (let i = 0; i < 1100; i++) {
        chartPerformanceMonitor.recordMetric({
          chartId: `chart-${i}`,
          renderTime: 100 + i,
          dataPoints: 100,
          deviceType: 'desktop',
          animationDuration: 400,
          interactionLatency: 25,
        });
      }

      const allMetrics = chartPerformanceMonitor.getMetrics();
      expect(allMetrics.length).toBeLessThanOrEqual(1000);
    });

    it('should clear all metrics', () => {
      chartPerformanceMonitor.recordMetric({
        chartId: 'test-chart',
        renderTime: 150,
        dataPoints: 100,
        deviceType: 'desktop',
        animationDuration: 400,
        interactionLatency: 25,
      });

      expect(chartPerformanceMonitor.getMetrics()).toHaveLength(1);

      chartPerformanceMonitor.clearMetrics();

      expect(chartPerformanceMonitor.getMetrics()).toHaveLength(0);
    });
  });

  describe('Warning System', () => {
    it('should emit warnings for high render times', () => {
      const warningCallback = vi.fn();
      const unsubscribe = chartPerformanceMonitor.onWarning(warningCallback);

      // Record metric with high render time for desktop (>100ms threshold)
      chartPerformanceMonitor.recordMetric({
        chartId: 'slow-chart',
        renderTime: 250,
        dataPoints: 500,
        deviceType: 'desktop',
        animationDuration: 1000,
        interactionLatency: 25,
      });

      expect(warningCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          chartId: 'slow-chart',
          renderTime: 250,
        }),
        expect.stringContaining('Render time exceeds threshold'),
      );

      unsubscribe();
    });

    it('should emit critical alerts for low frame rates', () => {
      const criticalCallback = vi.fn();
      const unsubscribe = chartPerformanceMonitor.onCritical(criticalCallback);

      chartPerformanceMonitor.recordMetric({
        chartId: 'laggy-chart',
        renderTime: 100,
        dataPoints: 1000,
        deviceType: 'mobile',
        animationDuration: 2000,
        interactionLatency: 25,
        frameRate: 20, // Below 30fps minimum
      });

      expect(criticalCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          chartId: 'laggy-chart',
          frameRate: 20,
        }),
        expect.stringContaining('Frame rate 20 below minimum threshold'),
      );

      unsubscribe();
    });
  });
});

describe('useChartPerformance Hook', () => {
  beforeEach(() => {
    chartPerformanceMonitor.clearMetrics();
  });

  it('should provide chart performance monitoring functions', () => {
    const { result } = renderHook(() => useChartPerformance('test-chart'));

    expect(result.current.startRender).toBeInstanceOf(Function);
    expect(result.current.recordInteraction).toBeInstanceOf(Function);
    expect(result.current.recordMetric).toBeInstanceOf(Function);
    expect(result.current.getMetrics).toBeInstanceOf(Function);
    expect(result.current.getAverageRenderTime).toBeInstanceOf(Function);
  });

  it('should record metrics through hook', () => {
    const { result } = renderHook(() => useChartPerformance('hook-test-chart'));

    act(() => {
      result.current.recordMetric({
        renderTime: 125,
        dataPoints: 75,
        deviceType: 'tablet',
        animationDuration: 375,
        interactionLatency: 20,
      });
    });

    const metrics = result.current.getMetrics();
    expect(metrics).toHaveLength(1);
    expect(metrics[0]).toMatchObject({
      chartId: 'hook-test-chart',
      renderTime: 125,
      dataPoints: 75,
    });
  });

  it('should calculate average render time through hook', () => {
    const { result } = renderHook(() =>
      useChartPerformance('average-test-chart'),
    );

    act(() => {
      result.current.recordMetric({
        renderTime: 100,
        dataPoints: 50,
        deviceType: 'desktop',
        animationDuration: 300,
        interactionLatency: 15,
      });

      result.current.recordMetric({
        renderTime: 200,
        dataPoints: 100,
        deviceType: 'desktop',
        animationDuration: 400,
        interactionLatency: 25,
      });
    });

    const average = result.current.getAverageRenderTime('desktop');
    expect(average).toBe(150);
  });

  it('should track render timing through hook', () => {
    const { result } = renderHook(() =>
      useChartPerformance('timing-test-chart'),
    );

    act(() => {
      const endRender = result.current.startRender();
      expect(mockPerformance.mark).toHaveBeenCalledWith(
        'chart-render-timing-test-chart-start',
      );

      endRender();
      expect(mockPerformance.mark).toHaveBeenCalledWith(
        'chart-render-timing-test-chart-end',
      );
    });
  });
});
