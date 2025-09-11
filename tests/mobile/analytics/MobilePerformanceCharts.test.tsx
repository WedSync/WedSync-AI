import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import { MobilePerformanceCharts } from '../../../src/components/mobile/analytics/MobilePerformanceCharts';
import { VendorMetrics, TouchGesture, MobileChartConfig, ChartDataPoint } from '../../../src/types/mobile-analytics';

// Mock Recharts
jest.mock('recharts', () => ({
  LineChart: ({ children, ...props }: any) => (
    <div data-testid="line-chart" {...props}>
      {children}
    </div>
  ),
  AreaChart: ({ children, ...props }: any) => (
    <div data-testid="area-chart" {...props}>
      {children}
    </div>
  ),
  BarChart: ({ children, ...props }: any) => (
    <div data-testid="bar-chart" {...props}>
      {children}
    </div>
  ),
  PieChart: ({ children, ...props }: any) => (
    <div data-testid="pie-chart" {...props}>
      {children}
    </div>
  ),
  ResponsiveContainer: ({ children, ...props }: any) => (
    <div data-testid="responsive-container" {...props}>
      {children}
    </div>
  ),
  Line: (props: any) => <div data-testid="chart-line" {...props} />,
  Area: (props: any) => <div data-testid="chart-area" {...props} />,
  Bar: (props: any) => <div data-testid="chart-bar" {...props} />,
  Cell: (props: any) => <div data-testid="chart-cell" {...props} />,
  XAxis: (props: any) => <div data-testid="x-axis" {...props} />,
  YAxis: (props: any) => <div data-testid="y-axis" {...props} />,
  CartesianGrid: (props: any) => <div data-testid="cartesian-grid" {...props} />,
  Tooltip: (props: any) => <div data-testid="chart-tooltip" {...props} />,
  Legend: (props: any) => <div data-testid="chart-legend" {...props} />,
}));

// Mock chart virtualization
jest.mock('../../../src/lib/services/mobile/ChartVirtualization', () => ({
  ChartVirtualization: {
    getInstance: () => ({
      virtualizeData: jest.fn((data) => data.slice(0, 50)),
      updateViewport: jest.fn(),
      cleanup: jest.fn(),
      getVisibleData: jest.fn((data) => data),
    }),
  },
}));

// Mock touch debouncing
jest.mock('../../../src/lib/services/mobile/TouchDebouncing', () => ({
  TouchDebouncing: {
    getInstance: () => ({
      debounce: jest.fn((callback) => callback),
      setTouchTarget: jest.fn(),
      cleanup: jest.fn(),
    }),
  },
}));

// Mock haptic feedback
Object.defineProperty(window.navigator, 'vibrate', {
  value: jest.fn(),
  writable: true,
});

// Mock data
const mockVendorData: VendorMetrics[] = [
  {
    id: 'vendor1',
    name: 'Photography Studio A',
    type: 'photographer',
    overallScore: 8.5,
    responseTime: 2.5,
    clientSatisfaction: 9.2,
    completionRate: 95,
    revenue: 125000,
    bookingsCount: 45,
    averageBookingValue: 2777.78,
    lastActive: new Date('2025-01-14T10:00:00Z'),
    performanceTrend: 'improving',
    communicationScore: 8.8,
    punctualityScore: 9.1,
    qualityScore: 8.9,
    valueScore: 8.3,
    reviewsCount: 127,
    averageRating: 4.6,
    monthlyGrowth: 12.5,
    repeatClientRate: 68,
    referralRate: 23,
  },
  {
    id: 'vendor2',
    name: 'Floral Designs B',
    type: 'florist',
    overallScore: 7.8,
    responseTime: 4.2,
    clientSatisfaction: 8.5,
    completionRate: 88,
    revenue: 85000,
    bookingsCount: 32,
    averageBookingValue: 2656.25,
    lastActive: new Date('2025-01-13T15:30:00Z'),
    performanceTrend: 'stable',
    communicationScore: 7.9,
    punctualityScore: 8.2,
    qualityScore: 8.1,
    valueScore: 7.6,
    reviewsCount: 94,
    averageRating: 4.3,
    monthlyGrowth: 3.2,
    repeatClientRate: 45,
    referralRate: 18,
  },
];

const mockChartData: ChartDataPoint[] = [
  { timestamp: new Date('2025-01-01'), value: 8.2, label: 'Jan 1' },
  { timestamp: new Date('2025-01-02'), value: 8.5, label: 'Jan 2' },
  { timestamp: new Date('2025-01-03'), value: 8.1, label: 'Jan 3' },
  { timestamp: new Date('2025-01-04'), value: 8.7, label: 'Jan 4' },
  { timestamp: new Date('2025-01-05'), value: 8.9, label: 'Jan 5' },
];

const mockChartConfig: MobileChartConfig = {
  type: 'line',
  responsive: true,
  maintainAspectRatio: false,
  touchEnabled: true,
  gestureHandling: {
    pinchToZoom: true,
    panEnabled: true,
    tapToSelect: true,
  },
  mobileOptimizations: {
    reducedData: true,
    simplifiedLabels: true,
    largerTouchTargets: true,
  },
  performance: {
    enableVirtualization: true,
    maxDataPoints: 100,
    updateInterval: 1000,
  },
};

describe('MobilePerformanceCharts', () => {
  let mockOnChartTypeChange: jest.MockedFunction<(type: string) => void>;
  let mockOnDataPointSelect: jest.MockedFunction<(dataPoint: ChartDataPoint) => void>;

  beforeEach(() => {
    mockOnChartTypeChange = jest.fn();
    mockOnDataPointSelect = jest.fn();
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render performance charts with data', () => {
      render(
        <MobilePerformanceCharts
          data={mockChartData}
          vendors={mockVendorData}
          config={mockChartConfig}
          onChartTypeChange={mockOnChartTypeChange}
          onDataPointSelect={mockOnDataPointSelect}
        />
      );

      expect(screen.getByTestId('mobile-performance-charts')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should render different chart types', () => {
      const { rerender } = render(
        <MobilePerformanceCharts
          data={mockChartData}
          vendors={mockVendorData}
          config={{ ...mockChartConfig, type: 'area' }}
          onChartTypeChange={mockOnChartTypeChange}
          onDataPointSelect={mockOnDataPointSelect}
        />
      );

      expect(screen.getByTestId('area-chart')).toBeInTheDocument();

      rerender(
        <MobilePerformanceCharts
          data={mockChartData}
          vendors={mockVendorData}
          config={{ ...mockChartConfig, type: 'bar' }}
          onChartTypeChange={mockOnChartTypeChange}
          onDataPointSelect={mockOnDataPointSelect}
        />
      );

      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();

      rerender(
        <MobilePerformanceCharts
          data={mockChartData}
          vendors={mockVendorData}
          config={{ ...mockChartConfig, type: 'pie' }}
          onChartTypeChange={mockOnChartTypeChange}
          onDataPointSelect={mockOnDataPointSelect}
        />
      );

      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });

    it('should render loading state', () => {
      render(
        <MobilePerformanceCharts
          data={[]}
          vendors={mockVendorData}
          config={mockChartConfig}
          onChartTypeChange={mockOnChartTypeChange}
          onDataPointSelect={mockOnDataPointSelect}
          loading={true}
        />
      );

      expect(screen.getByText('Loading chart data...')).toBeInTheDocument();
    });

    it('should render error state', () => {
      render(
        <MobilePerformanceCharts
          data={[]}
          vendors={mockVendorData}
          config={mockChartConfig}
          onChartTypeChange={mockOnChartTypeChange}
          onDataPointSelect={mockOnDataPointSelect}
          error="Failed to load chart data"
        />
      );

      expect(screen.getByText('Failed to load chart data')).toBeInTheDocument();
    });

    it('should render empty state with no data', () => {
      render(
        <MobilePerformanceCharts
          data={[]}
          vendors={mockVendorData}
          config={mockChartConfig}
          onChartTypeChange={mockOnChartTypeChange}
          onDataPointSelect={mockOnDataPointSelect}
        />
      );

      expect(screen.getByText('No chart data available')).toBeInTheDocument();
    });
  });

  describe('Touch Gestures', () => {
    it('should handle pinch-to-zoom gesture', async () => {
      render(
        <MobilePerformanceCharts
          data={mockChartData}
          vendors={mockVendorData}
          config={mockChartConfig}
          onChartTypeChange={mockOnChartTypeChange}
          onDataPointSelect={mockOnDataPointSelect}
        />
      );

      const chart = screen.getByTestId('mobile-performance-charts');

      // Simulate pinch gesture
      fireEvent.touchStart(chart, {
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 200 },
        ],
      });

      fireEvent.touchMove(chart, {
        touches: [
          { clientX: 80, clientY: 80 },
          { clientX: 220, clientY: 220 },
        ],
      });

      fireEvent.touchEnd(chart);

      await waitFor(() => {
        expect(chart).toHaveAttribute('data-zoom-level');
      });
    });

    it('should handle pan gesture', async () => {
      render(
        <MobilePerformanceCharts
          data={mockChartData}
          vendors={mockVendorData}
          config={mockChartConfig}
          onChartTypeChange={mockOnChartTypeChange}
          onDataPointSelect={mockOnDataPointSelect}
        />
      );

      const chart = screen.getByTestId('mobile-performance-charts');

      // Simulate pan gesture
      fireEvent.touchStart(chart, {
        touches: [{ clientX: 150, clientY: 150 }],
      });

      fireEvent.touchMove(chart, {
        touches: [{ clientX: 200, clientY: 150 }],
      });

      fireEvent.touchEnd(chart);

      await waitFor(() => {
        expect(chart).toHaveAttribute('data-pan-offset');
      });
    });

    it('should handle tap-to-select data points', async () => {
      render(
        <MobilePerformanceCharts
          data={mockChartData}
          vendors={mockVendorData}
          config={mockChartConfig}
          onChartTypeChange={mockOnChartTypeChange}
          onDataPointSelect={mockOnDataPointSelect}
        />
      );

      const chart = screen.getByTestId('mobile-performance-charts');

      // Simulate tap on data point
      fireEvent.touchStart(chart, {
        touches: [{ clientX: 150, clientY: 100 }],
      });

      fireEvent.touchEnd(chart, {
        changedTouches: [{ clientX: 150, clientY: 100 }],
      });

      await waitFor(() => {
        expect(mockOnDataPointSelect).toHaveBeenCalledWith(
          expect.objectContaining({
            timestamp: expect.any(Date),
            value: expect.any(Number),
          })
        );
      });
    });

    it('should provide haptic feedback on gestures', async () => {
      render(
        <MobilePerformanceCharts
          data={mockChartData}
          vendors={mockVendorData}
          config={mockChartConfig}
          onChartTypeChange={mockOnChartTypeChange}
          onDataPointSelect={mockOnDataPointSelect}
        />
      );

      const chart = screen.getByTestId('mobile-performance-charts');

      // Tap gesture
      fireEvent.touchStart(chart, {
        touches: [{ clientX: 150, clientY: 100 }],
      });
      fireEvent.touchEnd(chart);

      await waitFor(() => {
        expect(window.navigator.vibrate).toHaveBeenCalledWith(5);
      });
    });
  });

  describe('Chart Type Switching', () => {
    it('should handle chart type button presses', async () => {
      render(
        <MobilePerformanceCharts
          data={mockChartData}
          vendors={mockVendorData}
          config={mockChartConfig}
          onChartTypeChange={mockOnChartTypeChange}
          onDataPointSelect={mockOnDataPointSelect}
        />
      );

      const areaChartButton = screen.getByRole('button', { name: /area chart/i });
      fireEvent.click(areaChartButton);

      await waitFor(() => {
        expect(mockOnChartTypeChange).toHaveBeenCalledWith('area');
      });
    });

    it('should update chart type with animation', async () => {
      const { rerender } = render(
        <MobilePerformanceCharts
          data={mockChartData}
          vendors={mockVendorData}
          config={mockChartConfig}
          onChartTypeChange={mockOnChartTypeChange}
          onDataPointSelect={mockOnDataPointSelect}
        />
      );

      rerender(
        <MobilePerformanceCharts
          data={mockChartData}
          vendors={mockVendorData}
          config={{ ...mockChartConfig, type: 'bar' }}
          onChartTypeChange={mockOnChartTypeChange}
          onDataPointSelect={mockOnDataPointSelect}
        />
      );

      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-performance-charts')).toHaveClass('chart-transition');
    });
  });

  describe('Mobile Optimizations', () => {
    it('should implement data virtualization for large datasets', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        timestamp: new Date(2025, 0, i + 1),
        value: Math.random() * 10,
        label: `Day ${i + 1}`,
      }));

      render(
        <MobilePerformanceCharts
          data={largeDataset}
          vendors={mockVendorData}
          config={mockChartConfig}
          onChartTypeChange={mockOnChartTypeChange}
          onDataPointSelect={mockOnDataPointSelect}
        />
      );

      // Chart virtualization should limit visible data points
      const chartVirtualization = require('../../../src/lib/services/mobile/ChartVirtualization').ChartVirtualization.getInstance();
      expect(chartVirtualization.virtualizeData).toHaveBeenCalledWith(largeDataset);
    });

    it('should adapt to different screen sizes', () => {
      const { rerender } = render(
        <MobilePerformanceCharts
          data={mockChartData}
          vendors={mockVendorData}
          config={mockChartConfig}
          onChartTypeChange={mockOnChartTypeChange}
          onDataPointSelect={mockOnDataPointSelect}
        />
      );

      // Mock small screen
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320,
      });

      fireEvent(window, new Event('resize'));

      rerender(
        <MobilePerformanceCharts
          data={mockChartData}
          vendors={mockVendorData}
          config={mockChartConfig}
          onChartTypeChange={mockOnChartTypeChange}
          onDataPointSelect={mockOnDataPointSelect}
        />
      );

      expect(screen.getByTestId('mobile-performance-charts')).toHaveClass('small-screen');
    });

    it('should handle low memory situations', async () => {
      // Mock memory pressure
      const mockMemoryInfo = {
        usedJSHeapSize: 900 * 1024 * 1024, // 900MB
        totalJSHeapSize: 1000 * 1024 * 1024, // 1GB
      };

      Object.defineProperty(performance, 'memory', {
        value: mockMemoryInfo,
        writable: true,
      });

      render(
        <MobilePerformanceCharts
          data={mockChartData}
          vendors={mockVendorData}
          config={mockChartConfig}
          onChartTypeChange={mockOnChartTypeChange}
          onDataPointSelect={mockOnDataPointSelect}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('mobile-performance-charts')).toHaveClass('memory-optimized');
      });
    });
  });

  describe('Responsiveness', () => {
    it('should handle orientation changes', () => {
      render(
        <MobilePerformanceCharts
          data={mockChartData}
          vendors={mockVendorData}
          config={mockChartConfig}
          onChartTypeChange={mockOnChartTypeChange}
          onDataPointSelect={mockOnDataPointSelect}
        />
      );

      // Mock orientation change to landscape
      Object.defineProperty(screen, 'orientation', {
        value: { angle: 90 },
        writable: true,
      });

      fireEvent(window, new Event('orientationchange'));

      expect(screen.getByTestId('mobile-performance-charts')).toHaveClass('landscape-mode');
    });

    it('should adjust chart height based on viewport', () => {
      const { rerender } = render(
        <MobilePerformanceCharts
          data={mockChartData}
          vendors={mockVendorData}
          config={mockChartConfig}
          onChartTypeChange={mockOnChartTypeChange}
          onDataPointSelect={mockOnDataPointSelect}
        />
      );

      // Mock viewport change
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 400,
      });

      fireEvent(window, new Event('resize'));

      rerender(
        <MobilePerformanceCharts
          data={mockChartData}
          vendors={mockVendorData}
          config={mockChartConfig}
          onChartTypeChange={mockOnChartTypeChange}
          onDataPointSelect={mockOnDataPointSelect}
        />
      );

      const chart = screen.getByTestId('mobile-performance-charts');
      expect(chart).toHaveStyle({ height: expect.stringContaining('px') });
    });
  });

  describe('Performance Monitoring', () => {
    it('should track rendering performance', () => {
      const performanceMarkSpy = jest.spyOn(performance, 'mark');
      const performanceMeasureSpy = jest.spyOn(performance, 'measure');

      render(
        <MobilePerformanceCharts
          data={mockChartData}
          vendors={mockVendorData}
          config={mockChartConfig}
          onChartTypeChange={mockOnChartTypeChange}
          onDataPointSelect={mockOnDataPointSelect}
        />
      );

      expect(performanceMarkSpy).toHaveBeenCalledWith('chart-render-start');
      expect(performanceMeasureSpy).toHaveBeenCalledWith(
        'chart-render-duration',
        'chart-render-start',
        expect.any(String)
      );
    });

    it('should throttle expensive operations', async () => {
      const { rerender } = render(
        <MobilePerformanceCharts
          data={mockChartData}
          vendors={mockVendorData}
          config={mockChartConfig}
          onChartTypeChange={mockOnChartTypeChange}
          onDataPointSelect={mockOnDataPointSelect}
        />
      );

      // Rapid re-renders
      for (let i = 0; i < 10; i++) {
        rerender(
          <MobilePerformanceCharts
            data={[...mockChartData, { timestamp: new Date(), value: i, label: `Point ${i}` }]}
            vendors={mockVendorData}
            config={mockChartConfig}
            onChartTypeChange={mockOnChartTypeChange}
            onDataPointSelect={mockOnDataPointSelect}
          />
        );
      }

      // Should throttle updates
      const chart = screen.getByTestId('mobile-performance-charts');
      expect(chart).toHaveAttribute('data-throttled', 'true');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <MobilePerformanceCharts
          data={mockChartData}
          vendors={mockVendorData}
          config={mockChartConfig}
          onChartTypeChange={mockOnChartTypeChange}
          onDataPointSelect={mockOnDataPointSelect}
        />
      );

      expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Performance Chart');
      expect(screen.getByTestId('mobile-performance-charts')).toHaveAttribute(
        'aria-description',
        expect.stringContaining('chart showing performance data')
      );
    });

    it('should support keyboard navigation', () => {
      render(
        <MobilePerformanceCharts
          data={mockChartData}
          vendors={mockVendorData}
          config={mockChartConfig}
          onChartTypeChange={mockOnChartTypeChange}
          onDataPointSelect={mockOnDataPointSelect}
        />
      );

      const chart = screen.getByTestId('mobile-performance-charts');

      fireEvent.keyDown(chart, { key: 'ArrowRight' });
      expect(chart).toHaveAttribute('data-selected-index', '1');

      fireEvent.keyDown(chart, { key: 'Enter' });
      expect(mockOnDataPointSelect).toHaveBeenCalled();
    });

    it('should announce data changes to screen readers', async () => {
      const { rerender } = render(
        <MobilePerformanceCharts
          data={mockChartData}
          vendors={mockVendorData}
          config={mockChartConfig}
          onChartTypeChange={mockOnChartTypeChange}
          onDataPointSelect={mockOnDataPointSelect}
        />
      );

      const newData = [...mockChartData, { timestamp: new Date(), value: 9.0, label: 'New Data' }];

      rerender(
        <MobilePerformanceCharts
          data={newData}
          vendors={mockVendorData}
          config={mockChartConfig}
          onChartTypeChange={mockOnChartTypeChange}
          onDataPointSelect={mockOnDataPointSelect}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('Chart data updated');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed data gracefully', () => {
      const malformedData = [
        { timestamp: 'invalid-date', value: 'invalid-number', label: '' },
        { timestamp: new Date(), value: 8.5, label: 'Valid' },
      ];

      render(
        <MobilePerformanceCharts
          data={malformedData as any}
          vendors={mockVendorData}
          config={mockChartConfig}
          onChartTypeChange={mockOnChartTypeChange}
          onDataPointSelect={mockOnDataPointSelect}
        />
      );

      // Should filter out invalid data and show valid points
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.queryByText('Data validation error')).not.toBeInTheDocument();
    });

    it('should recover from gesture conflicts', async () => {
      render(
        <MobilePerformanceCharts
          data={mockChartData}
          vendors={mockVendorData}
          config={mockChartConfig}
          onChartTypeChange={mockOnChartTypeChange}
          onDataPointSelect={mockOnDataPointSelect}
        />
      );

      const chart = screen.getByTestId('mobile-performance-charts');

      // Simulate conflicting gestures
      fireEvent.touchStart(chart, {
        touches: [{ clientX: 100, clientY: 100 }],
      });

      fireEvent.touchStart(chart, {
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 },
        ],
      });

      fireEvent.touchEnd(chart);

      await waitFor(() => {
        expect(chart).toHaveAttribute('data-gesture-state', 'resolved');
      });
    });
  });
});