import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

import { WeddingRevenueChart } from '../WeddingRevenueChart';

// Mock Recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  ComposedChart: ({ children, data, onMouseEnter, onMouseLeave }: any) => (
    <div
      data-testid="composed-chart"
      data-chart-data={JSON.stringify(data)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  ),
  Bar: ({ dataKey, fill, name }: any) => (
    <div data-testid={`bar-${dataKey}`} data-fill={fill} data-name={name} />
  ),
  Line: ({ dataKey, stroke, name }: any) => (
    <div
      data-testid={`line-${dataKey}`}
      data-stroke={stroke}
      data-name={name}
    />
  ),
  XAxis: ({ dataKey }: any) => <div data-testid="x-axis" data-key={dataKey} />,
  YAxis: ({ yAxisId }: any) => (
    <div data-testid={`y-axis-${yAxisId || 'left'}`} />
  ),
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: ({ content }: any) => (
    <div data-testid="tooltip">{content && content()}</div>
  ),
  Legend: () => <div data-testid="legend" />,
  ReferenceLine: ({ y, stroke }: any) => (
    <div data-testid="reference-line" data-y={y} data-stroke={stroke} />
  ),
  Brush: () => <div data-testid="brush" />,
}));

// Mock motion
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('WeddingRevenueChart', () => {
  const mockRevenueData = [
    {
      month: 'January',
      revenue: 15000,
      bookings: 5,
      averageValue: 3000,
      previousYearRevenue: 12000,
      target: 18000,
    },
    {
      month: 'February',
      revenue: 22000,
      bookings: 8,
      averageValue: 2750,
      previousYearRevenue: 18000,
      target: 20000,
    },
    {
      month: 'March',
      revenue: 18500,
      bookings: 6,
      averageValue: 3083,
      previousYearRevenue: 15000,
      target: 19000,
    },
    {
      month: 'April',
      revenue: 28000,
      bookings: 10,
      averageValue: 2800,
      previousYearRevenue: 22000,
      target: 25000,
    },
    {
      month: 'May',
      revenue: 35000,
      bookings: 12,
      averageValue: 2917,
      previousYearRevenue: 28000,
      target: 32000,
    },
    {
      month: 'June',
      revenue: 45000,
      bookings: 15,
      averageValue: 3000,
      previousYearRevenue: 38000,
      target: 42000,
    },
  ];

  const defaultProps = {
    data: mockRevenueData,
    height: 400,
    showTrend: true,
    showComparison: true,
    showTarget: true,
    currency: 'GBP' as const,
    onDataClick: vi.fn(),
    className: 'test-revenue-chart',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Chart Rendering', () => {
    it('renders revenue chart with responsive container', () => {
      render(<WeddingRevenueChart {...defaultProps} />);

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
    });

    it('displays revenue data correctly', () => {
      render(<WeddingRevenueChart {...defaultProps} />);

      const chartData = JSON.parse(
        screen.getByTestId('composed-chart').getAttribute('data-chart-data') ||
          '[]',
      );

      expect(chartData).toHaveLength(6);
      expect(chartData[0]).toEqual(mockRevenueData[0]);
    });

    it('renders revenue bars with correct styling', () => {
      render(<WeddingRevenueChart {...defaultProps} />);

      const revenueBar = screen.getByTestId('bar-revenue');
      expect(revenueBar).toBeInTheDocument();
      expect(revenueBar).toHaveAttribute('data-fill', '#c59d6c'); // Wedding gold
    });

    it('shows bookings as line chart', () => {
      render(<WeddingRevenueChart {...defaultProps} />);

      const bookingsLine = screen.getByTestId('line-bookings');
      expect(bookingsLine).toBeInTheDocument();
      expect(bookingsLine).toHaveAttribute('data-stroke', '#8b6f47');
    });

    it('displays chart axes correctly', () => {
      render(<WeddingRevenueChart {...defaultProps} />);

      expect(screen.getByTestId('x-axis')).toHaveAttribute('data-key', 'month');
      expect(screen.getByTestId('y-axis-left')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis-right')).toBeInTheDocument();
    });

    it('includes grid lines and legend', () => {
      render(<WeddingRevenueChart {...defaultProps} />);

      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
      expect(screen.getByTestId('legend')).toBeInTheDocument();
    });
  });

  describe('Wedding Industry Features', () => {
    it('highlights peak wedding season (May-October)', () => {
      render(<WeddingRevenueChart {...defaultProps} />);

      const peakSeasonIndicators = screen.getAllByTestId(/peak-season-/);
      expect(peakSeasonIndicators.length).toBeGreaterThan(0);
    });

    it('shows seasonal trend indicators', () => {
      render(<WeddingRevenueChart {...defaultProps} />);

      expect(screen.getByTestId('seasonal-trend')).toBeInTheDocument();
      expect(screen.getByText(/peak season ahead/i)).toBeInTheDocument();
    });

    it('displays year-over-year comparison', () => {
      render(<WeddingRevenueChart {...defaultProps} />);

      const comparisonLine = screen.getByTestId('line-previousYearRevenue');
      expect(comparisonLine).toBeInTheDocument();
      expect(comparisonLine).toHaveAttribute('data-name', 'Previous Year');
    });

    it('shows target revenue line', () => {
      render(<WeddingRevenueChart {...defaultProps} />);

      const targetLine = screen.getByTestId('reference-line');
      expect(targetLine).toBeInTheDocument();
    });

    it('formats currency in GBP', () => {
      render(<WeddingRevenueChart {...defaultProps} />);

      expect(screen.getByText(/£45,000/)).toBeInTheDocument(); // Peak June revenue
    });
  });

  describe('Interactive Features', () => {
    it('handles data point clicks', () => {
      render(<WeddingRevenueChart {...defaultProps} />);

      const chart = screen.getByTestId('composed-chart');
      fireEvent.click(chart);

      expect(defaultProps.onDataClick).toHaveBeenCalled();
    });

    it('shows detailed tooltip on hover', () => {
      render(<WeddingRevenueChart {...defaultProps} />);

      const chart = screen.getByTestId('composed-chart');
      fireEvent.mouseEnter(chart);

      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });

    it('implements brush for date range selection', () => {
      render(<WeddingRevenueChart {...defaultProps} enableBrush />);

      expect(screen.getByTestId('brush')).toBeInTheDocument();
    });

    it('supports chart zoom and pan', () => {
      render(<WeddingRevenueChart {...defaultProps} enableZoom />);

      const chart = screen.getByTestId('composed-chart');
      expect(chart).toHaveAttribute('data-zoom-enabled', 'true');
    });
  });

  describe('Performance Optimizations', () => {
    it('handles large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        month: `Month ${i}`,
        revenue: Math.random() * 50000,
        bookings: Math.floor(Math.random() * 20),
        averageValue: Math.random() * 5000,
        previousYearRevenue: Math.random() * 40000,
        target: Math.random() * 45000,
      }));

      const startTime = performance.now();
      render(<WeddingRevenueChart {...defaultProps} data={largeDataset} />);
      const renderTime = performance.now() - startTime;

      expect(renderTime).toBeLessThan(200); // Should render quickly
      expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
    });

    it('implements data aggregation for performance', () => {
      const dailyData = Array.from({ length: 365 }, (_, i) => ({
        month: `Day ${i}`,
        revenue: Math.random() * 1000,
        bookings: Math.random() * 3,
        averageValue: Math.random() * 500,
        previousYearRevenue: Math.random() * 800,
        target: Math.random() * 1200,
      }));

      render(
        <WeddingRevenueChart
          {...defaultProps}
          data={dailyData}
          aggregateDaily
        />,
      );

      // Should aggregate to monthly data
      expect(screen.getByTestId('aggregation-notice')).toBeInTheDocument();
    });

    it('uses virtualization for large date ranges', () => {
      render(<WeddingRevenueChart {...defaultProps} enableVirtualization />);

      expect(screen.getByTestId('virtual-chart-container')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('adapts to mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<WeddingRevenueChart {...defaultProps} />);

      expect(screen.getByTestId('responsive-container')).toHaveClass(
        'mobile-layout',
      );
    });

    it('adjusts chart elements for small screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        value: 320,
      });

      render(<WeddingRevenueChart {...defaultProps} />);

      // Should hide some elements on very small screens
      expect(screen.queryByTestId('legend')).not.toBeInTheDocument();
    });

    it('optimizes for tablet screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        value: 768,
      });

      render(<WeddingRevenueChart {...defaultProps} />);

      expect(screen.getByTestId('responsive-container')).toHaveClass(
        'tablet-layout',
      );
    });
  });

  describe('Data Analysis Features', () => {
    it('calculates and displays growth rates', () => {
      render(<WeddingRevenueChart {...defaultProps} showGrowth />);

      expect(screen.getByText(/83.3% growth/i)).toBeInTheDocument(); // Feb vs Jan
      expect(screen.getByText(/growth rate/i)).toBeInTheDocument();
    });

    it('shows seasonal averages', () => {
      render(<WeddingRevenueChart {...defaultProps} showSeasonalAverage />);

      expect(
        screen.getByText(/seasonal average: £27,250/i),
      ).toBeInTheDocument();
    });

    it('highlights performance against targets', () => {
      render(<WeddingRevenueChart {...defaultProps} showTarget />);

      expect(screen.getByText(/above target/i)).toBeInTheDocument(); // June exceeded target
      expect(screen.getByText(/below target/i)).toBeInTheDocument(); // January below target
    });

    it('displays booking conversion metrics', () => {
      render(<WeddingRevenueChart {...defaultProps} showConversion />);

      expect(
        screen.getByText(/average booking value: £2,917/i),
      ).toBeInTheDocument();
    });
  });

  describe('Export and Sharing', () => {
    it('provides export functionality', () => {
      render(<WeddingRevenueChart {...defaultProps} enableExport />);

      const exportButton = screen.getByRole('button', {
        name: /export chart/i,
      });
      expect(exportButton).toBeInTheDocument();

      fireEvent.click(exportButton);
      expect(screen.getByTestId('export-menu')).toBeInTheDocument();
    });

    it('supports multiple export formats', () => {
      render(<WeddingRevenueChart {...defaultProps} enableExport />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      fireEvent.click(exportButton);

      expect(screen.getByText(/png/i)).toBeInTheDocument();
      expect(screen.getByText(/pdf/i)).toBeInTheDocument();
      expect(screen.getByText(/svg/i)).toBeInTheDocument();
    });

    it('generates chart annotations for sharing', () => {
      render(<WeddingRevenueChart {...defaultProps} enableAnnotations />);

      const annotateButton = screen.getByRole('button', { name: /annotate/i });
      fireEvent.click(annotateButton);

      expect(screen.getByTestId('annotation-tools')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels', () => {
      render(<WeddingRevenueChart {...defaultProps} />);

      const chart = screen.getByTestId('composed-chart');
      expect(chart).toHaveAttribute('role', 'img');
      expect(chart).toHaveAttribute(
        'aria-label',
        'Wedding revenue chart showing monthly performance',
      );
    });

    it('includes screen reader friendly data table', () => {
      render(<WeddingRevenueChart {...defaultProps} includeDataTable />);

      const dataTable = screen.getByRole('table');
      expect(dataTable).toBeInTheDocument();
      expect(screen.getByText('Revenue Data Table')).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(<WeddingRevenueChart {...defaultProps} enableKeyboardNav />);

      const chart = screen.getByTestId('composed-chart');
      expect(chart).toHaveAttribute('tabIndex', '0');

      fireEvent.keyDown(chart, { key: 'ArrowRight' });
      expect(screen.getByTestId('data-point-focus')).toBeInTheDocument();
    });

    it('provides high contrast mode', () => {
      Object.defineProperty(window, 'matchMedia', {
        value: vi.fn(() => ({
          matches: true,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      });

      render(<WeddingRevenueChart {...defaultProps} />);

      expect(screen.getByTestId('composed-chart')).toHaveClass('high-contrast');
    });
  });

  describe('Error Handling', () => {
    it('handles missing data gracefully', () => {
      const incompleteData = mockRevenueData.map((item) => ({
        month: item.month,
        revenue: item.revenue,
        // Missing other fields
      }));

      render(<WeddingRevenueChart {...defaultProps} data={incompleteData} />);

      expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
      expect(screen.queryByTestId('line-bookings')).not.toBeInTheDocument();
    });

    it('shows error state for invalid data', () => {
      const invalidData = [{ month: 'January', revenue: 'invalid' }];

      render(
        <WeddingRevenueChart {...defaultProps} data={invalidData as any} />,
      );

      expect(screen.getByTestId('chart-error')).toBeInTheDocument();
      expect(screen.getByText(/unable to display chart/i)).toBeInTheDocument();
    });

    it('provides fallback for empty datasets', () => {
      render(<WeddingRevenueChart {...defaultProps} data={[]} />);

      expect(screen.getByTestId('empty-chart-state')).toBeInTheDocument();
      expect(
        screen.getByText(/no revenue data available/i),
      ).toBeInTheDocument();
    });

    it('handles chart rendering errors', () => {
      // Mock chart rendering error
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      render(<WeddingRevenueChart {...defaultProps} data={null as any} />);

      expect(screen.getByTestId('chart-error')).toBeInTheDocument();

      consoleError.mockRestore();
    });
  });

  describe('Wedding Day Protection', () => {
    it('shows wedding day notice on Saturdays', () => {
      // Mock Saturday
      const mockSaturday = new Date('2024-06-15');
      vi.setSystemTime(mockSaturday);

      render(<WeddingRevenueChart {...defaultProps} />);

      expect(screen.getByTestId('wedding-day-notice')).toBeInTheDocument();
      expect(screen.getByText(/wedding day mode active/i)).toBeInTheDocument();
    });

    it('disables data modifications on wedding days', () => {
      const mockSaturday = new Date('2024-06-15');
      vi.setSystemTime(mockSaturday);

      render(<WeddingRevenueChart {...defaultProps} />);

      const chart = screen.getByTestId('composed-chart');
      fireEvent.click(chart);

      expect(defaultProps.onDataClick).not.toHaveBeenCalled();
      expect(
        screen.getByText(/modifications disabled on wedding days/i),
      ).toBeInTheDocument();
    });
  });

  describe('Performance Monitoring', () => {
    it('tracks chart render performance', () => {
      const performanceSpy = vi.spyOn(performance, 'mark');

      render(
        <WeddingRevenueChart {...defaultProps} enablePerformanceTracking />,
      );

      expect(performanceSpy).toHaveBeenCalledWith('chart-render-start');
      expect(performanceSpy).toHaveBeenCalledWith('chart-render-end');
    });

    it('monitors memory usage during rendering', () => {
      render(<WeddingRevenueChart {...defaultProps} enableMemoryMonitoring />);

      expect(screen.getByTestId('memory-usage')).toBeInTheDocument();
    });
  });
});
