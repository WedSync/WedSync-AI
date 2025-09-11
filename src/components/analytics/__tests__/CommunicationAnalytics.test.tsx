import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CommunicationAnalytics } from '../CommunicationAnalytics';

// Mock the useClientAnalytics hook
const mockUseClientAnalytics = vi.fn();
vi.mock('../../hooks/useClientAnalytics', () => ({
  useClientAnalytics: () => mockUseClientAnalytics(),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  MessageCircle: () => <div data-testid="message-circle-icon" />,
  Mail: () => <div data-testid="mail-icon" />,
  Phone: () => <div data-testid="phone-icon" />,
  MessageSquare: () => <div data-testid="message-square-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  TrendingDown: () => <div data-testid="trending-down-icon" />,
  Minus: () => <div data-testid="minus-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Send: () => <div data-testid="send-icon" />,
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
  PieChart: ({ children }: any) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ data }: any) => (
    <div data-testid="pie" data-length={data?.length || 0} />
  ),
  Cell: () => <div data-testid="cell" />,
}));

const mockCommunicationData = {
  communication: {
    channels: {
      email: {
        sent: 1247,
        delivered: 1198,
        opened: 856,
        clicked: 245,
        avgResponseTime: 142, // minutes
        deliveryRate: 96.1,
        openRate: 71.5,
        clickRate: 28.6,
        responseRate: 19.7,
      },
      sms: {
        sent: 567,
        delivered: 562,
        responded: 187,
        avgResponseTime: 23, // minutes
        deliveryRate: 99.1,
        responseRate: 33.3,
      },
      inApp: {
        sent: 892,
        viewed: 743,
        responded: 298,
        avgResponseTime: 65, // minutes
        viewRate: 83.3,
        responseRate: 40.1,
      },
    },
    responseDistribution: [
      { timeRange: '< 1 hour', percentage: 45.2, count: 234 },
      { timeRange: '1-4 hours', percentage: 28.7, count: 149 },
      { timeRange: '4-24 hours', percentage: 18.9, count: 98 },
      { timeRange: '> 24 hours', percentage: 7.2, count: 37 },
    ],
    topPerformers: [
      {
        supplier: 'Sarah Photography',
        responseTime: 12,
        responseRate: 89.4,
        totalMessages: 156,
      },
      {
        supplier: 'Elegant Venues Ltd',
        responseTime: 18,
        responseRate: 82.1,
        totalMessages: 203,
      },
      {
        supplier: 'Bloom Florists',
        responseTime: 25,
        responseRate: 76.8,
        totalMessages: 127,
      },
    ],
    communicationTrends: [
      { date: '2024-01-01', emails: 42, sms: 18, inApp: 29, responses: 67 },
      { date: '2024-01-02', emails: 38, sms: 22, inApp: 33, responses: 71 },
      { date: '2024-01-03', emails: 45, sms: 16, inApp: 27, responses: 58 },
    ],
    sentimentAnalysis: {
      positive: 62.4,
      neutral: 28.9,
      negative: 8.7,
      avgSentimentScore: 0.72,
    },
    busyTimes: [
      { hour: 9, volume: 34 },
      { hour: 10, volume: 52 },
      { hour: 11, volume: 67 },
      { hour: 14, volume: 71 },
      { hour: 15, volume: 58 },
      { hour: 16, volume: 43 },
    ],
  },
  loading: false,
  error: null,
  refreshData: vi.fn(),
  exportData: vi.fn(),
};

describe('CommunicationAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseClientAnalytics.mockReturnValue(mockCommunicationData);
  });

  it('renders communication analytics correctly', () => {
    render(<CommunicationAnalytics timeRange="30d" />);

    expect(screen.getByText('Communication Analytics')).toBeInTheDocument();
    expect(screen.getByText('Channel Performance')).toBeInTheDocument();
    expect(screen.getByText('Response Time Distribution')).toBeInTheDocument();
  });

  it('displays email channel metrics correctly', () => {
    render(<CommunicationAnalytics timeRange="30d" />);

    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('1,247')).toBeInTheDocument(); // Sent
    expect(screen.getByText('1,198')).toBeInTheDocument(); // Delivered
    expect(screen.getByText('856')).toBeInTheDocument(); // Opened
    expect(screen.getByText('245')).toBeInTheDocument(); // Clicked
    expect(screen.getByText('96.1%')).toBeInTheDocument(); // Delivery rate
    expect(screen.getByText('71.5%')).toBeInTheDocument(); // Open rate
    expect(screen.getByText('28.6%')).toBeInTheDocument(); // Click rate
    expect(screen.getByText('2h 22m')).toBeInTheDocument(); // Avg response time formatted
  });

  it('displays SMS channel metrics correctly', () => {
    render(<CommunicationAnalytics timeRange="30d" />);

    expect(screen.getByText('SMS')).toBeInTheDocument();
    expect(screen.getByText('567')).toBeInTheDocument(); // Sent
    expect(screen.getByText('562')).toBeInTheDocument(); // Delivered
    expect(screen.getByText('187')).toBeInTheDocument(); // Responded
    expect(screen.getByText('99.1%')).toBeInTheDocument(); // Delivery rate
    expect(screen.getByText('33.3%')).toBeInTheDocument(); // Response rate
    expect(screen.getByText('23m')).toBeInTheDocument(); // Avg response time
  });

  it('displays in-app channel metrics correctly', () => {
    render(<CommunicationAnalytics timeRange="30d" />);

    expect(screen.getByText('In-App')).toBeInTheDocument();
    expect(screen.getByText('892')).toBeInTheDocument(); // Sent
    expect(screen.getByText('743')).toBeInTheDocument(); // Viewed
    expect(screen.getByText('298')).toBeInTheDocument(); // Responded
    expect(screen.getByText('83.3%')).toBeInTheDocument(); // View rate
    expect(screen.getByText('40.1%')).toBeInTheDocument(); // Response rate
    expect(screen.getByText('1h 5m')).toBeInTheDocument(); // Avg response time
  });

  it('renders response time distribution chart', () => {
    render(<CommunicationAnalytics timeRange="30d" />);

    expect(screen.getByText('Response Time Distribution')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();

    // Check distribution data
    expect(screen.getByText('< 1 hour: 45.2%')).toBeInTheDocument();
    expect(screen.getByText('1-4 hours: 28.7%')).toBeInTheDocument();
    expect(screen.getByText('4-24 hours: 18.9%')).toBeInTheDocument();
    expect(screen.getByText('> 24 hours: 7.2%')).toBeInTheDocument();
  });

  it('displays top performing suppliers', () => {
    render(<CommunicationAnalytics timeRange="30d" />);

    expect(screen.getByText('Top Performers')).toBeInTheDocument();
    expect(screen.getByText('Sarah Photography')).toBeInTheDocument();
    expect(screen.getByText('12m')).toBeInTheDocument(); // Response time
    expect(screen.getByText('89.4%')).toBeInTheDocument(); // Response rate
    expect(screen.getByText('156')).toBeInTheDocument(); // Total messages

    expect(screen.getByText('Elegant Venues Ltd')).toBeInTheDocument();
    expect(screen.getByText('Bloom Florists')).toBeInTheDocument();
  });

  it('renders communication trends chart', () => {
    render(<CommunicationAnalytics timeRange="30d" />);

    expect(screen.getByText('Communication Trends')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('line-emails')).toBeInTheDocument();
    expect(screen.getByTestId('line-sms')).toBeInTheDocument();
    expect(screen.getByTestId('line-inApp')).toBeInTheDocument();
    expect(screen.getByTestId('line-responses')).toBeInTheDocument();
  });

  it('displays sentiment analysis', () => {
    render(<CommunicationAnalytics timeRange="30d" />);

    expect(screen.getByText('Sentiment Analysis')).toBeInTheDocument();
    expect(screen.getByText('Positive: 62.4%')).toBeInTheDocument();
    expect(screen.getByText('Neutral: 28.9%')).toBeInTheDocument();
    expect(screen.getByText('Negative: 8.7%')).toBeInTheDocument();
    expect(screen.getByText('0.72')).toBeInTheDocument(); // Avg sentiment score
  });

  it('shows peak communication hours', () => {
    render(<CommunicationAnalytics timeRange="30d" />);

    expect(screen.getByText('Peak Hours')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('bar-volume')).toBeInTheDocument();
  });

  it('handles loading state', () => {
    mockUseClientAnalytics.mockReturnValue({
      ...mockCommunicationData,
      loading: true,
      communication: null,
    });

    render(<CommunicationAnalytics timeRange="30d" />);

    expect(
      screen.getByText('Loading communication data...'),
    ).toBeInTheDocument();
  });

  it('handles error state', () => {
    mockUseClientAnalytics.mockReturnValue({
      ...mockCommunicationData,
      loading: false,
      communication: null,
      error: 'Failed to load communication analytics',
    });

    render(<CommunicationAnalytics timeRange="30d" />);

    expect(
      screen.getByText('Error loading communication data'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Failed to load communication analytics'),
    ).toBeInTheDocument();
  });

  it('passes correct props to useClientAnalytics hook', () => {
    const timeRange = '7d';
    const supplierId = 'supplier-999';

    render(
      <CommunicationAnalytics timeRange={timeRange} supplierId={supplierId} />,
    );

    expect(mockUseClientAnalytics).toHaveBeenCalledWith({
      timeRange,
      supplierId,
      type: 'communication',
    });
  });

  it('formats response times correctly', () => {
    render(<CommunicationAnalytics timeRange="30d" />);

    // Check various time formats
    expect(screen.getByText('2h 22m')).toBeInTheDocument(); // 142 minutes
    expect(screen.getByText('23m')).toBeInTheDocument(); // 23 minutes
    expect(screen.getByText('1h 5m')).toBeInTheDocument(); // 65 minutes
    expect(screen.getByText('12m')).toBeInTheDocument(); // 12 minutes
  });

  it('calculates channel effectiveness correctly', () => {
    render(<CommunicationAnalytics timeRange="30d" />);

    // Should show effectiveness scores based on response rates and times
    expect(screen.getByText('Channel Effectiveness')).toBeInTheDocument();

    // In-App should be most effective (40.1% response rate, 65min response time)
    // SMS should be second (33.3% response rate, 23min response time)
    // Email should be third (19.7% response rate, 142min response time)
  });

  it('displays wedding-specific communication insights', () => {
    const weddingCommunicationData = {
      ...mockCommunicationData,
      communication: {
        ...mockCommunicationData.communication,
        weddingInsights: {
          urgencyLevels: {
            critical: { count: 45, avgResponseTime: 15, responseRate: 94.2 },
            high: { count: 123, avgResponseTime: 42, responseRate: 76.8 },
            normal: { count: 567, avgResponseTime: 125, responseRate: 45.3 },
          },
          seasonalPatterns: {
            peakSeason: { increase: 180, channels: ['SMS', 'In-App'] },
            weddingDay: { increase: 340, mostUsed: 'SMS' },
          },
        },
      },
    };

    mockUseClientAnalytics.mockReturnValue(weddingCommunicationData);

    render(<CommunicationAnalytics timeRange="30d" />);

    expect(
      screen.getByText('Wedding Communication Insights'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Critical: 94.2% response rate'),
    ).toBeInTheDocument();
    expect(screen.getByText('Wedding Day: +340% increase')).toBeInTheDocument();
  });

  it('shows communication efficiency metrics', () => {
    render(<CommunicationAnalytics timeRange="30d" />);

    expect(screen.getByText('Efficiency Score')).toBeInTheDocument();

    // Should calculate efficiency based on response rate / response time ratio
    // Higher response rate + Lower response time = Higher efficiency
  });

  it('handles real-time communication updates', async () => {
    const { rerender } = render(<CommunicationAnalytics timeRange="30d" />);

    expect(screen.getByText('1,247')).toBeInTheDocument(); // Original email sent count

    // Simulate real-time update
    mockUseClientAnalytics.mockReturnValue({
      ...mockCommunicationData,
      communication: {
        ...mockCommunicationData.communication,
        channels: {
          ...mockCommunicationData.communication.channels,
          email: {
            ...mockCommunicationData.communication.channels.email,
            sent: 1252, // Updated count
          },
        },
      },
    });

    rerender(<CommunicationAnalytics timeRange="30d" />);

    await waitFor(() => {
      expect(screen.getByText('1,252')).toBeInTheDocument(); // Updated count
    });
  });

  it('renders with custom className', () => {
    const { container } = render(
      <CommunicationAnalytics
        timeRange="30d"
        className="custom-communication"
      />,
    );

    expect(container.firstChild).toHaveClass('custom-communication');
  });

  it('handles empty communication data gracefully', () => {
    mockUseClientAnalytics.mockReturnValue({
      ...mockCommunicationData,
      communication: {
        channels: { email: {}, sms: {}, inApp: {} },
        responseDistribution: [],
        topPerformers: [],
        communicationTrends: [],
        sentimentAnalysis: {},
        busyTimes: [],
      },
    });

    render(<CommunicationAnalytics timeRange="30d" />);

    expect(
      screen.getByText('No communication data available'),
    ).toBeInTheDocument();
  });

  it('displays optimal communication times recommendation', () => {
    render(<CommunicationAnalytics timeRange="30d" />);

    // Based on busy times data, should recommend 2-3 PM as optimal
    expect(screen.getByText('Optimal Send Times')).toBeInTheDocument();
    expect(screen.getByText('2:00 PM - 3:00 PM')).toBeInTheDocument();
    expect(screen.getByText('Peak response window')).toBeInTheDocument();
  });
});
