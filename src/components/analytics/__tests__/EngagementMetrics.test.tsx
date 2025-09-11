import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EngagementMetrics } from '../EngagementMetrics';

// Mock the useClientAnalytics hook
const mockUseClientAnalytics = vi.fn();
vi.mock('../../hooks/useClientAnalytics', () => ({
  useClientAnalytics: () => mockUseClientAnalytics(),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Activity: () => <div data-testid="activity-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  MessageCircle: () => <div data-testid="message-circle-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  TrendingDown: () => <div data-testid="trending-down-icon" />,
  Minus: () => <div data-testid="minus-icon" />,
}));

// Mock recharts
vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: ({ dataKey }: any) => <div data-testid={`line-${dataKey}`} />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: any) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: ({ dataKey }: any) => <div data-testid={`bar-${dataKey}`} />,
  Legend: () => <div data-testid="legend" />,
}));

const mockEngagementData = {
  engagement: {
    dailyStats: [
      {
        date: '2024-01-01',
        sessions: 45,
        pageViews: 180,
        interactions: 67,
        avgDuration: 285,
      },
      {
        date: '2024-01-02',
        sessions: 52,
        pageViews: 210,
        interactions: 78,
        avgDuration: 302,
      },
      {
        date: '2024-01-03',
        sessions: 38,
        pageViews: 165,
        interactions: 55,
        avgDuration: 258,
      },
    ],
    summary: {
      totalSessions: 678,
      totalPageViews: 2456,
      avgSessionDuration: 295,
      engagementRate: 68.5,
      bounceRate: 31.5,
      returnVisitorRate: 42.3,
    },
    trends: {
      sessions: 12.5,
      pageViews: 8.7,
      avgSessionDuration: -5.2,
      engagementRate: 3.1,
    },
    topPages: [
      { page: '/dashboard', views: 456, duration: 320, bounceRate: 25.3 },
      { page: '/clients', views: 389, duration: 280, bounceRate: 32.1 },
      { page: '/forms', views: 267, duration: 195, bounceRate: 45.2 },
    ],
    hourlyDistribution: [
      { hour: '9:00', sessions: 45 },
      { hour: '10:00', sessions: 67 },
      { hour: '11:00', sessions: 89 },
      { hour: '14:00', sessions: 78 },
      { hour: '15:00', sessions: 56 },
    ],
  },
  loading: false,
  error: null,
  refreshData: vi.fn(),
  exportData: vi.fn(),
};

describe('EngagementMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseClientAnalytics.mockReturnValue(mockEngagementData);
  });

  it('renders engagement metrics correctly', () => {
    render(<EngagementMetrics timeRange="30d" />);

    expect(screen.getByText('Engagement Analytics')).toBeInTheDocument();
    expect(screen.getByText('678')).toBeInTheDocument(); // Total sessions
    expect(screen.getByText('2,456')).toBeInTheDocument(); // Total page views
    expect(screen.getByText('4m 55s')).toBeInTheDocument(); // Avg session duration formatted
    expect(screen.getByText('68.5%')).toBeInTheDocument(); // Engagement rate
  });

  it('displays summary metrics with trends', () => {
    render(<EngagementMetrics timeRange="30d" />);

    // Check for trend indicators
    expect(screen.getByText('+12.5%')).toBeInTheDocument(); // Sessions trend
    expect(screen.getByText('+8.7%')).toBeInTheDocument(); // Page views trend
    expect(screen.getByText('-5.2%')).toBeInTheDocument(); // Duration trend (negative)
    expect(screen.getByText('+3.1%')).toBeInTheDocument(); // Engagement rate trend
  });

  it('renders daily engagement chart', () => {
    render(<EngagementMetrics timeRange="30d" />);

    expect(screen.getByText('Daily Engagement Trends')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('line-sessions')).toBeInTheDocument();
    expect(screen.getByTestId('line-pageViews')).toBeInTheDocument();
    expect(screen.getByTestId('line-interactions')).toBeInTheDocument();
  });

  it('renders top pages performance table', () => {
    render(<EngagementMetrics timeRange="30d" />);

    expect(screen.getByText('Top Performing Pages')).toBeInTheDocument();
    expect(screen.getByText('/dashboard')).toBeInTheDocument();
    expect(screen.getByText('/clients')).toBeInTheDocument();
    expect(screen.getByText('/forms')).toBeInTheDocument();

    // Check page metrics
    expect(screen.getByText('456')).toBeInTheDocument(); // Dashboard views
    expect(screen.getByText('5m 20s')).toBeInTheDocument(); // Dashboard duration
    expect(screen.getByText('25.3%')).toBeInTheDocument(); // Dashboard bounce rate
  });

  it('renders hourly distribution chart', () => {
    render(<EngagementMetrics timeRange="30d" />);

    expect(screen.getByText('Peak Usage Hours')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('bar-sessions')).toBeInTheDocument();
  });

  it('handles loading state', () => {
    mockUseClientAnalytics.mockReturnValue({
      ...mockEngagementData,
      loading: true,
      engagement: null,
    });

    render(<EngagementMetrics timeRange="30d" />);

    expect(screen.getByText('Loading engagement data...')).toBeInTheDocument();
  });

  it('handles error state', () => {
    mockUseClientAnalytics.mockReturnValue({
      ...mockEngagementData,
      loading: false,
      engagement: null,
      error: 'Failed to load engagement metrics',
    });

    render(<EngagementMetrics timeRange="30d" />);

    expect(
      screen.getByText('Error loading engagement data'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Failed to load engagement metrics'),
    ).toBeInTheDocument();
  });

  it('passes correct props to useClientAnalytics hook', () => {
    const timeRange = '7d';
    const supplierId = 'supplier-456';

    render(<EngagementMetrics timeRange={timeRange} supplierId={supplierId} />);

    expect(mockUseClientAnalytics).toHaveBeenCalledWith({
      timeRange,
      supplierId,
      type: 'engagement',
    });
  });

  it('formats durations correctly in different contexts', () => {
    render(<EngagementMetrics timeRange="30d" />);

    // Check various duration formats in the component
    expect(screen.getByText('4m 55s')).toBeInTheDocument(); // Avg session duration
    expect(screen.getByText('5m 20s')).toBeInTheDocument(); // Dashboard page duration
    expect(screen.getByText('4m 40s')).toBeInTheDocument(); // Clients page duration
    expect(screen.getByText('3m 15s')).toBeInTheDocument(); // Forms page duration
  });

  it('displays bounce rate and return visitor metrics', () => {
    render(<EngagementMetrics timeRange="30d" />);

    expect(screen.getByText('31.5%')).toBeInTheDocument(); // Bounce rate
    expect(screen.getByText('42.3%')).toBeInTheDocument(); // Return visitor rate
  });

  it('handles empty daily stats gracefully', () => {
    mockUseClientAnalytics.mockReturnValue({
      ...mockEngagementData,
      engagement: {
        ...mockEngagementData.engagement,
        dailyStats: [],
      },
    });

    render(<EngagementMetrics timeRange="30d" />);

    expect(
      screen.getByText('No engagement data available for this period'),
    ).toBeInTheDocument();
  });

  it('shows appropriate trend colors', () => {
    render(<EngagementMetrics timeRange="30d" />);

    // Positive trends should be green
    const positiveTrends = screen.getAllByText('+12.5%');
    expect(positiveTrends[0]).toHaveClass('text-green-600');

    // Negative trends should be red
    const negativeTrend = screen.getByText('-5.2%');
    expect(negativeTrend).toHaveClass('text-red-600');
  });

  it('renders with custom className', () => {
    const { container } = render(
      <EngagementMetrics timeRange="30d" className="custom-engagement" />,
    );

    expect(container.firstChild).toHaveClass('custom-engagement');
  });

  it('displays wedding-specific engagement metrics when available', () => {
    const weddingEngagementData = {
      ...mockEngagementData,
      engagement: {
        ...mockEngagementData.engagement,
        weddingSpecific: {
          planningPhaseEngagement: 85.2,
          dayOfEngagement: 95.7,
          postWeddingEngagement: 42.1,
          vendorInteractions: 156,
        },
      },
    };

    mockUseClientAnalytics.mockReturnValue(weddingEngagementData);

    render(<EngagementMetrics timeRange="30d" />);

    expect(screen.getByText('Planning Phase: 85.2%')).toBeInTheDocument();
    expect(screen.getByText('Wedding Day: 95.7%')).toBeInTheDocument();
    expect(screen.getByText('Post-Wedding: 42.1%')).toBeInTheDocument();
    expect(screen.getByText('156')).toBeInTheDocument(); // Vendor interactions
  });

  it('handles real-time data updates', async () => {
    const { rerender } = render(<EngagementMetrics timeRange="30d" />);

    expect(screen.getByText('678')).toBeInTheDocument(); // Original sessions

    // Simulate data update
    mockUseClientAnalytics.mockReturnValue({
      ...mockEngagementData,
      engagement: {
        ...mockEngagementData.engagement,
        summary: {
          ...mockEngagementData.engagement.summary,
          totalSessions: 702,
        },
      },
    });

    rerender(<EngagementMetrics timeRange="30d" />);

    await waitFor(() => {
      expect(screen.getByText('702')).toBeInTheDocument(); // Updated sessions
    });
  });
});
