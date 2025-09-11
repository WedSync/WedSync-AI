import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { FeatureUsage } from '../FeatureUsage';

// Mock the useClientAnalytics hook
const mockUseClientAnalytics = vi.fn();
vi.mock('../../hooks/useClientAnalytics', () => ({
  useClientAnalytics: () => mockUseClientAnalytics(),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Zap: () => <div data-testid="zap-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  MessageCircle: () => <div data-testid="message-circle-icon" />,
  Camera: () => <div data-testid="camera-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  TrendingDown: () => <div data-testid="trending-down-icon" />,
  Minus: () => <div data-testid="minus-icon" />,
  ChevronRight: () => <div data-testid="chevron-right-icon" />,
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
  BarChart: ({ children }: any) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: ({ dataKey }: any) => <div data-testid={`bar-${dataKey}`} />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
}));

const mockFeatureData = {
  features: {
    adoptionRates: [
      { feature: 'Client Management', usage: 95, users: 127, trend: 8.5 },
      { feature: 'Form Builder', usage: 87, users: 115, trend: 12.3 },
      { feature: 'PDF Import', usage: 73, users: 96, trend: 22.1 },
      { feature: 'Calendar Integration', usage: 68, users: 89, trend: -3.2 },
      { feature: 'Photo Galleries', usage: 54, users: 71, trend: 15.7 },
      { feature: 'Communication Hub', usage: 49, users: 64, trend: 5.4 },
    ],
    correlations: [
      {
        feature1: 'PDF Import',
        feature2: 'Form Builder',
        correlation: 0.85,
        insight:
          'Users who import PDFs are 85% more likely to use Form Builder',
      },
      {
        feature1: 'Client Management',
        feature2: 'Calendar Integration',
        correlation: 0.72,
        insight:
          'Strong correlation between client management and calendar usage',
      },
    ],
    usagePatterns: [
      {
        pattern: 'Power Users',
        percentage: 23,
        description: 'Use 5+ features regularly',
      },
      {
        pattern: 'Form Focused',
        percentage: 34,
        description: 'Primarily use form-related features',
      },
      {
        pattern: 'Basic Users',
        percentage: 28,
        description: 'Use 2-3 core features',
      },
      {
        pattern: 'Trial Users',
        percentage: 15,
        description: 'Limited feature exploration',
      },
    ],
    featureRevenue: [
      { feature: 'PDF Import', revenue: 15420, conversionRate: 34.2 },
      { feature: 'Advanced Forms', revenue: 12850, conversionRate: 28.7 },
      { feature: 'Calendar Sync', revenue: 9830, conversionRate: 22.1 },
    ],
    timeToAdoption: {
      'Client Management': { days: 1, adoptionRate: 95 },
      'Form Builder': { days: 3, adoptionRate: 87 },
      'PDF Import': { days: 7, adoptionRate: 73 },
      'Calendar Integration': { days: 14, adoptionRate: 68 },
    },
  },
  loading: false,
  error: null,
  refreshData: vi.fn(),
  exportData: vi.fn(),
};

describe('FeatureUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseClientAnalytics.mockReturnValue(mockFeatureData);
  });

  it('renders feature usage analytics correctly', () => {
    render(<FeatureUsage timeRange="30d" />);

    expect(screen.getByText('Feature Usage Analytics')).toBeInTheDocument();
    expect(screen.getByText('Feature Adoption Rates')).toBeInTheDocument();
    expect(screen.getByText('Usage Patterns')).toBeInTheDocument();
  });

  it('displays feature adoption rates with metrics', () => {
    render(<FeatureUsage timeRange="30d" />);

    // Check feature names and usage percentages
    expect(screen.getByText('Client Management')).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument(); // Usage rate
    expect(screen.getByText('127 users')).toBeInTheDocument();

    expect(screen.getByText('Form Builder')).toBeInTheDocument();
    expect(screen.getByText('87%')).toBeInTheDocument();

    expect(screen.getByText('PDF Import')).toBeInTheDocument();
    expect(screen.getByText('73%')).toBeInTheDocument();
  });

  it('shows feature trends correctly', () => {
    render(<FeatureUsage timeRange="30d" />);

    // Check positive trends
    expect(screen.getByText('+8.5%')).toBeInTheDocument();
    expect(screen.getByText('+12.3%')).toBeInTheDocument();
    expect(screen.getByText('+22.1%')).toBeInTheDocument();

    // Check negative trend
    expect(screen.getByText('-3.2%')).toBeInTheDocument();

    // Verify trend colors
    const positiveTrend = screen.getByText('+8.5%');
    expect(positiveTrend).toHaveClass('text-green-600');

    const negativeTrend = screen.getByText('-3.2%');
    expect(negativeTrend).toHaveClass('text-red-600');
  });

  it('renders usage patterns pie chart', () => {
    render(<FeatureUsage timeRange="30d" />);

    expect(screen.getByText('Usage Patterns')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();

    // Check pattern descriptions
    expect(screen.getByText('Power Users: 23%')).toBeInTheDocument();
    expect(screen.getByText('Form Focused: 34%')).toBeInTheDocument();
    expect(screen.getByText('Basic Users: 28%')).toBeInTheDocument();
    expect(screen.getByText('Trial Users: 15%')).toBeInTheDocument();
  });

  it('displays feature correlations', () => {
    render(<FeatureUsage timeRange="30d" />);

    expect(screen.getByText('Feature Correlations')).toBeInTheDocument();
    expect(screen.getByText('PDF Import → Form Builder')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument(); // Correlation strength
    expect(
      screen.getByText(
        'Users who import PDFs are 85% more likely to use Form Builder',
      ),
    ).toBeInTheDocument();
  });

  it('shows feature revenue metrics', () => {
    render(<FeatureUsage timeRange="30d" />);

    expect(screen.getByText('Revenue Impact')).toBeInTheDocument();
    expect(screen.getByText('£15,420')).toBeInTheDocument(); // PDF Import revenue
    expect(screen.getByText('34.2%')).toBeInTheDocument(); // Conversion rate
    expect(screen.getByText('£12,850')).toBeInTheDocument(); // Advanced Forms revenue
  });

  it('displays time to adoption metrics', () => {
    render(<FeatureUsage timeRange="30d" />);

    expect(screen.getByText('Time to Adoption')).toBeInTheDocument();
    expect(screen.getByText('1 day')).toBeInTheDocument(); // Client Management
    expect(screen.getByText('3 days')).toBeInTheDocument(); // Form Builder
    expect(screen.getByText('7 days')).toBeInTheDocument(); // PDF Import
    expect(screen.getByText('14 days')).toBeInTheDocument(); // Calendar Integration
  });

  it('handles loading state', () => {
    mockUseClientAnalytics.mockReturnValue({
      ...mockFeatureData,
      loading: true,
      features: null,
    });

    render(<FeatureUsage timeRange="30d" />);

    expect(
      screen.getByText('Loading feature usage data...'),
    ).toBeInTheDocument();
  });

  it('handles error state', () => {
    mockUseClientAnalytics.mockReturnValue({
      ...mockFeatureData,
      loading: false,
      features: null,
      error: 'Failed to load feature usage data',
    });

    render(<FeatureUsage timeRange="30d" />);

    expect(
      screen.getByText('Error loading feature usage data'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Failed to load feature usage data'),
    ).toBeInTheDocument();
  });

  it('passes correct props to useClientAnalytics hook', () => {
    const timeRange = '7d';
    const supplierId = 'supplier-789';

    render(<FeatureUsage timeRange={timeRange} supplierId={supplierId} />);

    expect(mockUseClientAnalytics).toHaveBeenCalledWith({
      timeRange,
      supplierId,
      type: 'features',
    });
  });

  it('renders detailed feature cards with all metrics', () => {
    render(<FeatureUsage timeRange="30d" />);

    // Find Client Management card
    const clientMgmtSection = screen
      .getByText('Client Management')
      .closest('.border');
    expect(clientMgmtSection).toBeInTheDocument();

    // Should show usage percentage, user count, and trend
    expect(clientMgmtSection).toHaveTextContent('95%');
    expect(clientMgmtSection).toHaveTextContent('127 users');
    expect(clientMgmtSection).toHaveTextContent('+8.5%');
  });

  it('handles feature interaction clicks', async () => {
    const user = userEvent.setup();
    render(<FeatureUsage timeRange="30d" />);

    // Click on a feature card to see more details
    const featureCard = screen
      .getByText('Client Management')
      .closest('.border');
    await user.click(featureCard!);

    // Should show additional feature details
    await waitFor(() => {
      expect(screen.getByText('Feature Details')).toBeInTheDocument();
    });
  });

  it('displays wedding-specific feature insights', () => {
    const weddingFeatureData = {
      ...mockFeatureData,
      features: {
        ...mockFeatureData.features,
        weddingInsights: {
          seasonalUsage: {
            peakSeason: {
              features: ['Calendar Integration', 'Photo Galleries'],
              increase: 45.2,
            },
            offSeason: {
              features: ['Form Builder', 'Client Management'],
              stable: true,
            },
          },
          weddingDayFeatures: {
            mostUsed: 'Photo Galleries',
            usage: 89.7,
            criticalPath: [
              'Client Management',
              'Calendar Integration',
              'Photo Galleries',
            ],
          },
        },
      },
    };

    mockUseClientAnalytics.mockReturnValue(weddingFeatureData);

    render(<FeatureUsage timeRange="30d" />);

    expect(screen.getByText('Wedding Season Insights')).toBeInTheDocument();
    expect(screen.getByText('Peak Season Features')).toBeInTheDocument();
    expect(screen.getByText('+45.2%')).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    const { container } = render(
      <FeatureUsage timeRange="30d" className="custom-features" />,
    );

    expect(container.firstChild).toHaveClass('custom-features');
  });

  it('handles empty feature data gracefully', () => {
    mockUseClientAnalytics.mockReturnValue({
      ...mockFeatureData,
      features: {
        adoptionRates: [],
        correlations: [],
        usagePatterns: [],
        featureRevenue: [],
        timeToAdoption: {},
      },
    });

    render(<FeatureUsage timeRange="30d" />);

    expect(
      screen.getByText('No feature usage data available'),
    ).toBeInTheDocument();
  });

  it('sorts features by adoption rate correctly', () => {
    render(<FeatureUsage timeRange="30d" />);

    // Features should be displayed in order of adoption rate (highest first)
    const features = screen.getAllByText(/\d+%/).map((el) => el.textContent);
    const percentages = features.map((f) => parseInt(f!.replace('%', '')));

    // Should be in descending order
    for (let i = 1; i < percentages.length - 1; i++) {
      expect(percentages[i]).toBeLessThanOrEqual(percentages[i - 1]);
    }
  });

  it('calculates and displays feature ROI', () => {
    render(<FeatureUsage timeRange="30d" />);

    // Should show revenue per user metrics
    expect(screen.getByText('Revenue per User')).toBeInTheDocument();
    expect(screen.getByText('£121')).toBeInTheDocument(); // 15420 / 127 users for PDF Import
  });
});
