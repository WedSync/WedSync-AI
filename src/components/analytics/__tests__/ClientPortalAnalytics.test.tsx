import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ClientPortalAnalytics } from '../ClientPortalAnalytics';

// Mock the child components
vi.mock('../AnalyticsOverview', () => ({
  AnalyticsOverview: ({ timeRange, supplierId }: any) => (
    <div data-testid="analytics-overview">
      Overview - TimeRange: {timeRange}, SupplierId: {supplierId || 'all'}
    </div>
  ),
}));

vi.mock('../EngagementMetrics', () => ({
  EngagementMetrics: ({ timeRange, supplierId }: any) => (
    <div data-testid="engagement-metrics">
      Engagement - TimeRange: {timeRange}, SupplierId: {supplierId || 'all'}
    </div>
  ),
}));

vi.mock('../FeatureUsage', () => ({
  FeatureUsage: ({ timeRange, supplierId }: any) => (
    <div data-testid="feature-usage">
      Features - TimeRange: {timeRange}, SupplierId: {supplierId || 'all'}
    </div>
  ),
}));

vi.mock('../CommunicationAnalytics', () => ({
  CommunicationAnalytics: ({ timeRange, supplierId }: any) => (
    <div data-testid="communication-analytics">
      Communication - TimeRange: {timeRange}, SupplierId: {supplierId || 'all'}
    </div>
  ),
}));

vi.mock('../ClientJourney', () => ({
  ClientJourney: ({ timeRange, supplierId }: any) => (
    <div data-testid="client-journey">
      Journey - TimeRange: {timeRange}, SupplierId: {supplierId || 'all'}
    </div>
  ),
}));

// Mock the useClientAnalytics hook
vi.mock('../../hooks/useClientAnalytics', () => ({
  useClientAnalytics: () => ({
    data: {
      overview: {
        totalClients: 125,
        activeClients: 89,
        engagementRate: 72.5,
        avgSessionDuration: 342,
      },
    },
    loading: false,
    error: null,
    refreshData: vi.fn(),
    exportData: vi.fn(),
  }),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  BarChart3: () => <div data-testid="bar-chart-icon" />,
  Download: () => <div data-testid="download-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  Users: () => <div data-testid="users-icon" />,
  MessageCircle: () => <div data-testid="message-icon" />,
  TrendingUp: () => <div data-testid="trending-icon" />,
  Map: () => <div data-testid="map-icon" />,
  Activity: () => <div data-testid="activity-icon" />,
}));

describe('ClientPortalAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the analytics dashboard with default tab', async () => {
    render(<ClientPortalAnalytics />);

    expect(screen.getByText('Client Portal Analytics')).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByTestId('analytics-overview')).toBeInTheDocument();
  });

  it('renders with custom time range and supplier ID', async () => {
    render(<ClientPortalAnalytics timeRange="7d" supplierId="supplier-123" />);

    await waitFor(() => {
      expect(screen.getByTestId('analytics-overview')).toHaveTextContent(
        'TimeRange: 7d, SupplierId: supplier-123',
      );
    });
  });

  it('switches between tabs correctly', async () => {
    const user = userEvent.setup();
    render(<ClientPortalAnalytics />);

    // Default should show overview
    expect(screen.getByTestId('analytics-overview')).toBeInTheDocument();
    expect(screen.queryByTestId('engagement-metrics')).not.toBeInTheDocument();

    // Click on Engagement tab
    await user.click(screen.getByText('Engagement'));

    await waitFor(() => {
      expect(
        screen.queryByTestId('analytics-overview'),
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('engagement-metrics')).toBeInTheDocument();
    });

    // Click on Features tab
    await user.click(screen.getByText('Features'));

    await waitFor(() => {
      expect(
        screen.queryByTestId('engagement-metrics'),
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('feature-usage')).toBeInTheDocument();
    });

    // Click on Communication tab
    await user.click(screen.getByText('Communication'));

    await waitFor(() => {
      expect(screen.queryByTestId('feature-usage')).not.toBeInTheDocument();
      expect(screen.getByTestId('communication-analytics')).toBeInTheDocument();
    });

    // Click on Journey tab
    await user.click(screen.getByText('Journey'));

    await waitFor(() => {
      expect(
        screen.queryByTestId('communication-analytics'),
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('client-journey')).toBeInTheDocument();
    });
  });

  it('handles time range selection', async () => {
    const user = userEvent.setup();
    render(<ClientPortalAnalytics />);

    // Find and click time range selector
    const timeRangeButton = screen.getByText('Last 30 days');
    await user.click(timeRangeButton);

    // Should show dropdown options
    expect(screen.getByText('Last 7 days')).toBeInTheDocument();
    expect(screen.getByText('Last 90 days')).toBeInTheDocument();

    // Select different time range
    await user.click(screen.getByText('Last 7 days'));

    await waitFor(() => {
      expect(screen.getByTestId('analytics-overview')).toHaveTextContent(
        'TimeRange: 7d',
      );
    });
  });

  it('displays export functionality', () => {
    render(<ClientPortalAnalytics />);

    const exportButton = screen.getByText('Export Data');
    expect(exportButton).toBeInTheDocument();
  });

  it('displays refresh functionality', () => {
    render(<ClientPortalAnalytics />);

    const refreshButton = screen.getByTitle('Refresh data');
    expect(refreshButton).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ClientPortalAnalytics className="custom-analytics" />,
    );

    expect(container.firstChild).toHaveClass('custom-analytics');
  });

  it('handles all tab navigation correctly', async () => {
    const user = userEvent.setup();
    render(<ClientPortalAnalytics />);

    const tabs = [
      'Overview',
      'Engagement',
      'Features',
      'Communication',
      'Journey',
    ];
    const testIds = [
      'analytics-overview',
      'engagement-metrics',
      'feature-usage',
      'communication-analytics',
      'client-journey',
    ];

    for (let i = 0; i < tabs.length; i++) {
      await user.click(screen.getByText(tabs[i]));

      await waitFor(() => {
        expect(screen.getByTestId(testIds[i])).toBeInTheDocument();

        // Check that other tabs are not visible
        testIds.forEach((testId, index) => {
          if (index !== i) {
            expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
          }
        });
      });
    }
  });

  it('maintains time range across tab switches', async () => {
    const user = userEvent.setup();
    render(<ClientPortalAnalytics />);

    // Change time range
    await user.click(screen.getByText('Last 30 days'));
    await user.click(screen.getByText('Last 7 days'));

    // Switch to different tab
    await user.click(screen.getByText('Engagement'));

    await waitFor(() => {
      expect(screen.getByTestId('engagement-metrics')).toHaveTextContent(
        'TimeRange: 7d',
      );
    });
  });

  it('passes supplierId to all child components', async () => {
    const user = userEvent.setup();
    const supplierId = 'test-supplier-123';

    render(<ClientPortalAnalytics supplierId={supplierId} />);

    // Test each tab maintains the supplierId
    const tabs = [
      'Overview',
      'Engagement',
      'Features',
      'Communication',
      'Journey',
    ];
    const testIds = [
      'analytics-overview',
      'engagement-metrics',
      'feature-usage',
      'communication-analytics',
      'client-journey',
    ];

    for (let i = 0; i < tabs.length; i++) {
      await user.click(screen.getByText(tabs[i]));

      await waitFor(() => {
        expect(screen.getByTestId(testIds[i])).toHaveTextContent(
          `SupplierId: ${supplierId}`,
        );
      });
    }
  });
});
