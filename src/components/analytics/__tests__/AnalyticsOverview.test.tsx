import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AnalyticsOverview } from '../AnalyticsOverview';

// Mock the useClientAnalytics hook
const mockUseClientAnalytics = vi.fn();
vi.mock('../../hooks/useClientAnalytics', () => ({
  useClientAnalytics: () => mockUseClientAnalytics(),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Users: () => <div data-testid="users-icon" />,
  Activity: () => <div data-testid="activity-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  TrendingDown: () => <div data-testid="trending-down-icon" />,
  Minus: () => <div data-testid="minus-icon" />,
  Smartphone: () => <div data-testid="smartphone-icon" />,
  Monitor: () => <div data-testid="monitor-icon" />,
  Tablet: () => <div data-testid="tablet-icon" />,
}));

// Mock recharts
vi.mock('recharts', () => ({
  PieChart: ({ children }: any) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ data }: any) => (
    <div data-testid="pie" data-length={data?.length || 0} />
  ),
  Cell: () => <div data-testid="cell" />,
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

const mockAnalyticsData = {
  overview: {
    totalClients: 125,
    activeClients: 89,
    engagementRate: 72.5,
    avgSessionDuration: 342,
    trends: {
      totalClients: 8.5,
      activeClients: 5.2,
      engagementRate: -2.1,
      avgSessionDuration: 15.3,
    },
    deviceBreakdown: [
      { name: 'Mobile', value: 68, percentage: 68 },
      { name: 'Desktop', value: 25, percentage: 25 },
      { name: 'Tablet', value: 7, percentage: 7 },
    ],
    engagementDistribution: [
      { name: 'High', value: 32, percentage: 32 },
      { name: 'Medium', value: 45, percentage: 45 },
      { name: 'Low', value: 23, percentage: 23 },
    ],
  },
  loading: false,
  error: null,
  refreshData: vi.fn(),
  exportData: vi.fn(),
};

describe('AnalyticsOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseClientAnalytics.mockReturnValue(mockAnalyticsData);
  });

  it('renders overview metrics correctly', () => {
    render(<AnalyticsOverview timeRange="30d" />);

    expect(screen.getByText('Overview Analytics')).toBeInTheDocument();
    expect(screen.getByText('125')).toBeInTheDocument(); // Total clients
    expect(screen.getByText('89')).toBeInTheDocument(); // Active clients
    expect(screen.getByText('72.5%')).toBeInTheDocument(); // Engagement rate
    expect(screen.getByText('5m 42s')).toBeInTheDocument(); // Session duration formatted
  });

  it('displays metric trends with correct styling', () => {
    render(<AnalyticsOverview timeRange="30d" />);

    // Should show positive trends in green
    const positiveTrends = screen.getAllByText('+8.5%');
    expect(positiveTrends[0]).toHaveClass('text-green-600');

    // Should show negative trends in red
    const negativeTrend = screen.getByText('-2.1%');
    expect(negativeTrend).toHaveClass('text-red-600');
  });

  it('renders device breakdown chart', () => {
    render(<AnalyticsOverview timeRange="30d" />);

    expect(screen.getByText('Device Breakdown')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();

    // Check device breakdown data
    expect(screen.getByText('Mobile: 68%')).toBeInTheDocument();
    expect(screen.getByText('Desktop: 25%')).toBeInTheDocument();
    expect(screen.getByText('Tablet: 7%')).toBeInTheDocument();
  });

  it('renders engagement distribution chart', () => {
    render(<AnalyticsOverview timeRange="30d" />);

    expect(screen.getByText('Engagement Distribution')).toBeInTheDocument();
    expect(screen.getAllByTestId('pie-chart')).toHaveLength(2); // Device + Engagement charts

    // Check engagement distribution
    expect(screen.getByText('High: 32%')).toBeInTheDocument();
    expect(screen.getByText('Medium: 45%')).toBeInTheDocument();
    expect(screen.getByText('Low: 23%')).toBeInTheDocument();
  });

  it('handles loading state', () => {
    mockUseClientAnalytics.mockReturnValue({
      ...mockAnalyticsData,
      loading: true,
      data: null,
    });

    render(<AnalyticsOverview timeRange="30d" />);

    // Should show loading skeletons
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('handles error state', () => {
    mockUseClientAnalytics.mockReturnValue({
      ...mockAnalyticsData,
      loading: false,
      data: null,
      error: 'Failed to load analytics data',
    });

    render(<AnalyticsOverview timeRange="30d" />);

    expect(
      screen.getByText('Error loading analytics data'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Failed to load analytics data'),
    ).toBeInTheDocument();
  });

  it('passes correct props to useClientAnalytics hook', () => {
    const timeRange = '7d';
    const supplierId = 'supplier-123';

    render(<AnalyticsOverview timeRange={timeRange} supplierId={supplierId} />);

    expect(mockUseClientAnalytics).toHaveBeenCalledWith({
      timeRange,
      supplierId,
      type: 'overview',
    });
  });

  it('formats session duration correctly', () => {
    // Test different duration values
    const testCases = [
      { duration: 62, expected: '1m 2s' },
      { duration: 3665, expected: '1h 1m 5s' },
      { duration: 45, expected: '45s' },
      { duration: 120, expected: '2m 0s' },
    ];

    testCases.forEach(({ duration, expected }) => {
      mockUseClientAnalytics.mockReturnValue({
        ...mockAnalyticsData,
        overview: {
          ...mockAnalyticsData.overview,
          avgSessionDuration: duration,
        },
      });

      const { rerender } = render(<AnalyticsOverview timeRange="30d" />);
      expect(screen.getByText(expected)).toBeInTheDocument();
      rerender(<div />); // Clean up for next test
    });
  });

  it('displays correct trend indicators', () => {
    render(<AnalyticsOverview timeRange="30d" />);

    // Positive trends should show up arrow
    const positiveTrendElements = screen.getAllByTestId('trending-up-icon');
    expect(positiveTrendElements.length).toBeGreaterThan(0);

    // Negative trends should show down arrow
    const negativeTrendElements = screen.getAllByTestId('trending-down-icon');
    expect(negativeTrendElements.length).toBeGreaterThan(0);
  });

  it('handles missing data gracefully', () => {
    mockUseClientAnalytics.mockReturnValue({
      overview: null,
      loading: false,
      error: null,
      refreshData: vi.fn(),
      exportData: vi.fn(),
    });

    render(<AnalyticsOverview timeRange="30d" />);

    // Should handle null data without crashing
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    const { container } = render(
      <AnalyticsOverview timeRange="30d" className="custom-overview" />,
    );

    expect(container.firstChild).toHaveClass('custom-overview');
  });

  it('displays wedding-specific metrics when available', () => {
    const weddingData = {
      ...mockAnalyticsData,
      overview: {
        ...mockAnalyticsData.overview,
        weddingMetrics: {
          upcomingWeddings: 12,
          completedWeddings: 8,
          avgWeddingValue: 2500,
        },
      },
    };

    mockUseClientAnalytics.mockReturnValue(weddingData);

    render(<AnalyticsOverview timeRange="30d" />);

    expect(screen.getByText('Upcoming: 12')).toBeInTheDocument();
    expect(screen.getByText('Completed: 8')).toBeInTheDocument();
    expect(screen.getByText('£2,500')).toBeInTheDocument();
  });
});
