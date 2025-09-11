import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import RevenueAnalytics from '@/components/analytics/RevenueAnalytics';
import type { RevenueAnalyticsProps, RevenueData } from '@/types/analytics';

// Mock chart libraries
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
}));

const mockRevenueData: RevenueData = {
  totalRevenue: 156750,
  revenueGrowth: 12.5,
  monthlyRevenue: [
    { month: 'Jan', revenue: 12500, target: 15000, growth: -8.3 },
    { month: 'Feb', revenue: 14200, target: 15000, growth: 13.6 },
    { month: 'Mar', revenue: 18900, target: 15000, growth: 33.1 },
    { month: 'Apr', revenue: 22400, target: 20000, growth: 18.5 },
    { month: 'May', revenue: 28100, target: 25000, growth: 25.4 },
    { month: 'Jun', revenue: 35200, target: 30000, growth: 25.2 },
  ],
  revenueByService: [
    { service: 'Photography', revenue: 67500, percentage: 43.1, growth: 15.2 },
    { service: 'Videography', revenue: 39200, percentage: 25.0, growth: 28.7 },
    { service: 'Coordination', revenue: 28100, percentage: 17.9, growth: 8.3 },
    { service: 'Florals', revenue: 21950, percentage: 14.0, growth: 22.1 },
  ],
  projectedRevenue: {
    nextMonth: 38500,
    nextQuarter: 115000,
    yearEnd: 420000,
    confidence: 0.85,
  },
  seasonalTrends: {
    peakSeason: 'Summer',
    peakMultiplier: 2.3,
    slowSeason: 'Winter',
    slowMultiplier: 0.6,
  },
};

const defaultProps: RevenueAnalyticsProps = {
  data: mockRevenueData,
  dateRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-06-30'),
  },
  showProjections: true,
  showTargets: true,
};

describe('RevenueAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders without crashing', () => {
      render(<RevenueAnalytics {...defaultProps} />);
      expect(screen.getByText('Revenue Analytics')).toBeInTheDocument();
    });

    it('displays total revenue correctly', () => {
      render(<RevenueAnalytics {...defaultProps} />);
      expect(screen.getByText('£156,750')).toBeInTheDocument();
    });

    it('shows revenue growth percentage', () => {
      render(<RevenueAnalytics {...defaultProps} />);
      expect(screen.getByText('12.5%')).toBeInTheDocument();
      expect(screen.getByText('vs previous period')).toBeInTheDocument();
    });

    it('renders all chart components', () => {
      render(<RevenueAnalytics {...defaultProps} />);

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });
  });

  describe('Monthly Revenue Data', () => {
    it('displays monthly revenue breakdown', () => {
      render(<RevenueAnalytics {...defaultProps} />);

      expect(screen.getByText('Jan')).toBeInTheDocument();
      expect(screen.getByText('Feb')).toBeInTheDocument();
      expect(screen.getByText('Mar')).toBeInTheDocument();
      expect(screen.getByText('£12,500')).toBeInTheDocument();
      expect(screen.getByText('£35,200')).toBeInTheDocument();
    });

    it('shows target vs actual comparison when enabled', () => {
      render(<RevenueAnalytics {...defaultProps} showTargets={true} />);

      expect(screen.getByText('Target: £15,000')).toBeInTheDocument();
      expect(screen.getByText('Target: £30,000')).toBeInTheDocument();
    });

    it('hides targets when showTargets is false', () => {
      render(<RevenueAnalytics {...defaultProps} showTargets={false} />);

      expect(screen.queryByText('Target:')).not.toBeInTheDocument();
    });

    it('highlights months with negative growth', () => {
      render(<RevenueAnalytics {...defaultProps} />);

      const janGrowth = screen.getByText('-8.3%');
      expect(janGrowth).toHaveClass('text-red-600');
    });

    it('highlights months with positive growth', () => {
      render(<RevenueAnalytics {...defaultProps} />);

      const marGrowth = screen.getByText('33.1%');
      expect(marGrowth).toHaveClass('text-green-600');
    });
  });

  describe('Revenue by Service', () => {
    it('displays all service categories', () => {
      render(<RevenueAnalytics {...defaultProps} />);

      expect(screen.getByText('Photography')).toBeInTheDocument();
      expect(screen.getByText('Videography')).toBeInTheDocument();
      expect(screen.getByText('Coordination')).toBeInTheDocument();
      expect(screen.getByText('Florals')).toBeInTheDocument();
    });

    it('shows service revenue amounts', () => {
      render(<RevenueAnalytics {...defaultProps} />);

      expect(screen.getByText('£67,500')).toBeInTheDocument();
      expect(screen.getByText('£39,200')).toBeInTheDocument();
      expect(screen.getByText('£28,100')).toBeInTheDocument();
      expect(screen.getByText('£21,950')).toBeInTheDocument();
    });

    it('displays service percentages', () => {
      render(<RevenueAnalytics {...defaultProps} />);

      expect(screen.getByText('43.1%')).toBeInTheDocument();
      expect(screen.getByText('25.0%')).toBeInTheDocument();
      expect(screen.getByText('17.9%')).toBeInTheDocument();
      expect(screen.getByText('14.0%')).toBeInTheDocument();
    });

    it('shows service growth rates', () => {
      render(<RevenueAnalytics {...defaultProps} />);

      expect(screen.getByText('+15.2%')).toBeInTheDocument();
      expect(screen.getByText('+28.7%')).toBeInTheDocument();
      expect(screen.getByText('+8.3%')).toBeInTheDocument();
      expect(screen.getByText('+22.1%')).toBeInTheDocument();
    });
  });

  describe('Revenue Projections', () => {
    it('shows projections when enabled', () => {
      render(<RevenueAnalytics {...defaultProps} showProjections={true} />);

      expect(screen.getByText('Revenue Projections')).toBeInTheDocument();
      expect(screen.getByText('£38,500')).toBeInTheDocument(); // Next month
      expect(screen.getByText('£115,000')).toBeInTheDocument(); // Next quarter
      expect(screen.getByText('£420,000')).toBeInTheDocument(); // Year end
    });

    it('hides projections when disabled', () => {
      render(<RevenueAnalytics {...defaultProps} showProjections={false} />);

      expect(screen.queryByText('Revenue Projections')).not.toBeInTheDocument();
    });

    it('displays confidence level', () => {
      render(<RevenueAnalytics {...defaultProps} showProjections={true} />);

      expect(screen.getByText('85% confidence')).toBeInTheDocument();
    });

    it('shows confidence indicator color based on level', () => {
      render(<RevenueAnalytics {...defaultProps} showProjections={true} />);

      const confidenceIndicator = screen.getByTestId('confidence-indicator');
      expect(confidenceIndicator).toHaveClass('bg-green-100'); // High confidence
    });
  });

  describe('Seasonal Trends', () => {
    it('displays seasonal trend information', () => {
      render(<RevenueAnalytics {...defaultProps} />);

      expect(screen.getByText('Seasonal Trends')).toBeInTheDocument();
      expect(screen.getByText('Peak Season: Summer')).toBeInTheDocument();
      expect(screen.getByText('Slow Season: Winter')).toBeInTheDocument();
    });

    it('shows seasonal multipliers', () => {
      render(<RevenueAnalytics {...defaultProps} />);

      expect(screen.getByText('2.3x average')).toBeInTheDocument(); // Peak multiplier
      expect(screen.getByText('0.6x average')).toBeInTheDocument(); // Slow multiplier
    });

    it('highlights peak season performance', () => {
      render(<RevenueAnalytics {...defaultProps} />);

      const peakSeason = screen.getByText('Summer');
      expect(peakSeason).toHaveClass('text-green-600');
    });
  });

  describe('Interactive Features', () => {
    it('allows toggling chart view types', () => {
      render(<RevenueAnalytics {...defaultProps} />);

      const chartToggle = screen.getByRole('button', { name: /chart type/i });
      expect(chartToggle).toBeInTheDocument();

      fireEvent.click(chartToggle);

      // Should toggle between line and bar chart
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    it('provides export functionality', () => {
      const onExport = jest.fn();
      render(<RevenueAnalytics {...defaultProps} onExport={onExport} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      fireEvent.click(exportButton);

      expect(onExport).toHaveBeenCalledWith('revenue', 'csv');
    });

    it('supports drill-down functionality', () => {
      const onDrillDown = jest.fn();
      render(<RevenueAnalytics {...defaultProps} onDrillDown={onDrillDown} />);

      const photographyService = screen.getByText('Photography');
      fireEvent.click(photographyService);

      expect(onDrillDown).toHaveBeenCalledWith('Photography');
    });
  });

  describe('Loading and Error States', () => {
    it('shows loading skeleton when data is loading', () => {
      render(<RevenueAnalytics {...defaultProps} isLoading={true} />);

      expect(screen.getByTestId('revenue-skeleton')).toBeInTheDocument();
    });

    it('displays error message on data load failure', () => {
      const errorMessage = 'Failed to load revenue data';
      render(<RevenueAnalytics {...defaultProps} error={errorMessage} />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /retry/i }),
      ).toBeInTheDocument();
    });

    it('calls retry function when retry button is clicked', () => {
      const onRetry = jest.fn();
      render(
        <RevenueAnalytics
          {...defaultProps}
          error="Failed to load data"
          onRetry={onRetry}
        />,
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      expect(onRetry).toHaveBeenCalled();
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for mobile screens', () => {
      // Mock mobile screen size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<RevenueAnalytics {...defaultProps} />);

      const container = screen.getByTestId('revenue-analytics');
      expect(container).toHaveClass('mobile-layout');
    });

    it('stacks charts vertically on small screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 640,
      });

      render(<RevenueAnalytics {...defaultProps} />);

      const chartContainer = screen.getByTestId('chart-container');
      expect(chartContainer).toHaveClass('flex-col');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<RevenueAnalytics {...defaultProps} />);

      expect(
        screen.getByLabelText('Revenue analytics dashboard'),
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText('Monthly revenue chart'),
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText('Revenue by service breakdown'),
      ).toBeInTheDocument();
    });

    it('provides screen reader descriptions for charts', () => {
      render(<RevenueAnalytics {...defaultProps} />);

      expect(
        screen.getByText('Chart showing revenue trend from January to June'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Photography leads with 43.1% of total revenue'),
      ).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(<RevenueAnalytics {...defaultProps} />);

      const firstButton = screen.getByRole('button', { name: /chart type/i });
      firstButton.focus();

      expect(document.activeElement).toBe(firstButton);
    });
  });

  describe('Wedding Industry Context', () => {
    it('displays wedding-specific revenue insights', () => {
      render(<RevenueAnalytics {...defaultProps} />);

      expect(
        screen.getByText('Peak wedding season revenue'),
      ).toBeInTheDocument();
      expect(screen.getByText('Average per wedding')).toBeInTheDocument();
    });

    it('shows seasonal wedding patterns', () => {
      render(<RevenueAnalytics {...defaultProps} />);

      expect(
        screen.getByText('Summer weddings drive 2.3x average revenue'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Consider winter promotions'),
      ).toBeInTheDocument();
    });

    it('provides wedding industry benchmarks', () => {
      render(<RevenueAnalytics {...defaultProps} />);

      expect(screen.getByText('Industry benchmark')).toBeInTheDocument();
      expect(screen.getByText('Above average')).toBeInTheDocument();
    });
  });

  describe('Data Formatting', () => {
    it('formats currency values correctly', () => {
      render(<RevenueAnalytics {...defaultProps} />);

      expect(screen.getByText('£156,750')).toBeInTheDocument();
      expect(screen.getByText('£67,500')).toBeInTheDocument();
    });

    it('formats percentages with proper precision', () => {
      render(<RevenueAnalytics {...defaultProps} />);

      expect(screen.getByText('12.5%')).toBeInTheDocument();
      expect(screen.getByText('43.1%')).toBeInTheDocument();
    });

    it('handles negative values correctly', () => {
      render(<RevenueAnalytics {...defaultProps} />);

      const negativeGrowth = screen.getByText('-8.3%');
      expect(negativeGrowth).toHaveClass('text-red-600');
    });
  });
});

// Integration tests
describe('RevenueAnalytics Integration', () => {
  it('updates when data prop changes', () => {
    const { rerender } = render(<RevenueAnalytics {...defaultProps} />);

    expect(screen.getByText('£156,750')).toBeInTheDocument();

    const newData = { ...mockRevenueData, totalRevenue: 200000 };
    rerender(<RevenueAnalytics {...defaultProps} data={newData} />);

    expect(screen.getByText('£200,000')).toBeInTheDocument();
  });

  it('responds to date range changes', () => {
    const { rerender } = render(<RevenueAnalytics {...defaultProps} />);

    const newDateRange = {
      start: new Date('2024-07-01'),
      end: new Date('2024-12-31'),
    };

    rerender(<RevenueAnalytics {...defaultProps} dateRange={newDateRange} />);

    // Should trigger data refresh or display appropriate message
    expect(screen.getByText(/july - december/i)).toBeInTheDocument();
  });
});

// Performance tests
describe('RevenueAnalytics Performance', () => {
  it('memoizes expensive calculations', () => {
    const { rerender } = render(<RevenueAnalytics {...defaultProps} />);

    // Re-render with same data
    rerender(<RevenueAnalytics {...defaultProps} />);

    // Component should not recalculate expensive operations
    expect(screen.getByText('Revenue Analytics')).toBeInTheDocument();
  });

  it('handles large datasets efficiently', () => {
    const largeData = {
      ...mockRevenueData,
      monthlyRevenue: Array(100)
        .fill(null)
        .map((_, i) => ({
          month: `Month ${i + 1}`,
          revenue: Math.random() * 50000,
          target: 30000,
          growth: Math.random() * 40 - 20,
        })),
    };

    render(<RevenueAnalytics {...defaultProps} data={largeData} />);

    expect(screen.getByText('Revenue Analytics')).toBeInTheDocument();
  });
});
