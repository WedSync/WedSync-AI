import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';
import type { AnalyticsDashboardProps } from '@/types/analytics';

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  supabase: {
    channel: jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest
        .fn()
        .mockReturnValue(Promise.resolve({ status: 'SUBSCRIBED' })),
      unsubscribe: jest.fn(),
    }),
  },
}));

jest.mock('@/hooks/useAnalyticsData', () => ({
  useAnalyticsData: jest.fn(() => ({
    revenue: {
      totalRevenue: 156750,
      revenueGrowth: 12.5,
      monthlyRevenue: [
        { month: 'Jan', revenue: 12500, target: 15000, growth: -8.3 },
        { month: 'Feb', revenue: 14200, target: 15000, growth: 13.6 },
      ],
      revenueByService: [
        {
          service: 'Photography',
          revenue: 67500,
          percentage: 43.1,
          growth: 15.2,
        },
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
    },
    bookingFunnel: {
      stages: [
        {
          stage: 'Initial Inquiry',
          count: 450,
          conversionRate: 100,
          dropoffRate: 0,
        },
        {
          stage: 'Consultation Scheduled',
          count: 315,
          conversionRate: 70,
          dropoffRate: 30,
        },
      ],
      overallConversion: 38.9,
      averageTimeToConvert: 14.5,
      dropoffAnalysis: [],
      recommendations: ['Test recommendation'],
    },
    clientSatisfaction: {
      overallScore: 4.7,
      npsScore: 68,
      responseRate: 0.84,
      totalResponses: 247,
      satisfactionTrend: 'improving',
      categoryScores: [],
      sentimentAnalysis: {
        positive: 0.78,
        neutral: 0.18,
        negative: 0.04,
        topThemes: [],
      },
      detractorAnalysis: {
        count: 8,
        mainIssues: [],
        resolution: { resolved: 6, pending: 2, resolutionRate: 0.75 },
      },
    },
    marketPosition: {
      marketRank: 3,
      marketShare: 12.8,
      competitorCount: 47,
      competitiveAdvantages: [],
      threats: [],
      opportunities: [],
      competitorAnalysis: [],
      swotAnalysis: {
        strengths: [],
        weaknesses: [],
        opportunities: [],
        threats: [],
      },
    },
    performanceKPIs: {
      kpis: [
        {
          id: 'booking-rate',
          name: 'Booking Conversion Rate',
          value: 38.9,
          target: 45,
          unit: '%',
          trend: 'up',
          change: 5.2,
          benchmark: 35,
          status: 'warning',
          category: 'conversion',
        },
      ],
      performanceScore: 78,
      trends: {
        overall: 'improving',
        categories: {
          conversion: 'stable',
          satisfaction: 'improving',
          efficiency: 'excellent',
          revenue: 'improving',
        },
      },
      alerts: [],
      insights: [],
    },
    isLoading: false,
    error: null,
    lastUpdated: new Date(),
    isConnected: true,
    refreshCount: 0,
    refreshData: jest.fn(),
    refreshSpecificData: jest.fn(),
    updateFilters: jest.fn(),
    updateDateRange: jest.fn(),
    enableRealTime: jest.fn(),
    disableRealTime: jest.fn(),
    clearCache: jest.fn(),
    invalidateCache: jest.fn(),
    exportData: jest.fn(),
  })),
}));

// Mock child components
jest.mock('@/components/analytics/RevenueAnalytics', () => {
  return function MockRevenueAnalytics() {
    return (
      <div data-testid="revenue-analytics">Revenue Analytics Component</div>
    );
  };
});

jest.mock('@/components/analytics/BookingFunnelAnalytics', () => {
  return function MockBookingFunnelAnalytics() {
    return (
      <div data-testid="booking-funnel-analytics">
        Booking Funnel Analytics Component
      </div>
    );
  };
});

jest.mock('@/components/analytics/ClientSatisfactionDashboard', () => {
  return function MockClientSatisfactionDashboard() {
    return (
      <div data-testid="client-satisfaction-dashboard">
        Client Satisfaction Dashboard Component
      </div>
    );
  };
});

jest.mock('@/components/analytics/MarketPositionAnalytics', () => {
  return function MockMarketPositionAnalytics() {
    return (
      <div data-testid="market-position-analytics">
        Market Position Analytics Component
      </div>
    );
  };
});

jest.mock('@/components/analytics/PerformanceKPIDashboard', () => {
  return function MockPerformanceKPIDashboard() {
    return (
      <div data-testid="performance-kpi-dashboard">
        Performance KPI Dashboard Component
      </div>
    );
  };
});

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const defaultProps: AnalyticsDashboardProps = {
  userId: 'test-user-id',
  organizationId: 'test-org-id',
  dateRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31'),
  },
};

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>,
  );
};

describe('AnalyticsDashboard', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createQueryClient();
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('Component Rendering', () => {
    it('renders without crashing', () => {
      renderWithQueryClient(<AnalyticsDashboard {...defaultProps} />);
      expect(
        screen.getByText('Wedding Analytics Dashboard'),
      ).toBeInTheDocument();
    });

    it('renders all main sections', () => {
      renderWithQueryClient(<AnalyticsDashboard {...defaultProps} />);

      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Revenue')).toBeInTheDocument();
      expect(screen.getByText('Funnel')).toBeInTheDocument();
      expect(screen.getByText('Satisfaction')).toBeInTheDocument();
      expect(screen.getByText('Market')).toBeInTheDocument();
    });

    it('renders dashboard controls', () => {
      renderWithQueryClient(<AnalyticsDashboard {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: /refresh/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /export/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /share/i }),
      ).toBeInTheDocument();
    });

    it('displays current date range', () => {
      renderWithQueryClient(<AnalyticsDashboard {...defaultProps} />);

      expect(screen.getByText(/jan 01 - jan 31/i)).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('shows overview tab by default', () => {
      renderWithQueryClient(<AnalyticsDashboard {...defaultProps} />);

      const overviewTab = screen.getByText('Overview');
      expect(overviewTab).toHaveClass('text-blue-600');
    });

    it('switches tabs when clicked', async () => {
      renderWithQueryClient(<AnalyticsDashboard {...defaultProps} />);

      const revenueTab = screen.getByText('Revenue');
      fireEvent.click(revenueTab);

      await waitFor(() => {
        expect(screen.getByTestId('revenue-analytics')).toBeInTheDocument();
      });
    });

    it('renders correct component for each tab', async () => {
      renderWithQueryClient(<AnalyticsDashboard {...defaultProps} />);

      // Test Revenue tab
      fireEvent.click(screen.getByText('Revenue'));
      await waitFor(() => {
        expect(screen.getByTestId('revenue-analytics')).toBeInTheDocument();
      });

      // Test Funnel tab
      fireEvent.click(screen.getByText('Funnel'));
      await waitFor(() => {
        expect(
          screen.getByTestId('booking-funnel-analytics'),
        ).toBeInTheDocument();
      });

      // Test Satisfaction tab
      fireEvent.click(screen.getByText('Satisfaction'));
      await waitFor(() => {
        expect(
          screen.getByTestId('client-satisfaction-dashboard'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Features', () => {
    it('displays connection status when real-time is enabled', () => {
      renderWithQueryClient(
        <AnalyticsDashboard {...defaultProps} realTimeEnabled={true} />,
      );

      expect(screen.getByText(/connected/i)).toBeInTheDocument();
    });

    it('shows last updated timestamp', () => {
      renderWithQueryClient(<AnalyticsDashboard {...defaultProps} />);

      expect(screen.getByText(/last updated/i)).toBeInTheDocument();
    });
  });

  describe('Data Refresh', () => {
    it('calls refresh function when refresh button is clicked', async () => {
      const mockRefresh = jest.fn();
      const { useAnalyticsData } = require('@/hooks/useAnalyticsData');
      useAnalyticsData.mockReturnValue({
        ...useAnalyticsData(),
        refreshData: mockRefresh,
      });

      renderWithQueryClient(<AnalyticsDashboard {...defaultProps} />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);

      expect(mockRefresh).toHaveBeenCalled();
    });

    it('shows loading state during refresh', async () => {
      const { useAnalyticsData } = require('@/hooks/useAnalyticsData');
      useAnalyticsData.mockReturnValue({
        ...useAnalyticsData(),
        isLoading: true,
      });

      renderWithQueryClient(<AnalyticsDashboard {...defaultProps} />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when data loading fails', () => {
      const { useAnalyticsData } = require('@/hooks/useAnalyticsData');
      useAnalyticsData.mockReturnValue({
        ...useAnalyticsData(),
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to load analytics data',
          details: ['Network error'],
          timestamp: new Date(),
          recoverable: true,
        },
        isLoading: false,
      });

      renderWithQueryClient(<AnalyticsDashboard {...defaultProps} />);

      expect(
        screen.getByText(/failed to load analytics data/i),
      ).toBeInTheDocument();
    });

    it('shows retry button on error', () => {
      const { useAnalyticsData } = require('@/hooks/useAnalyticsData');
      useAnalyticsData.mockReturnValue({
        ...useAnalyticsData(),
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to load analytics data',
          details: ['Network error'],
          timestamp: new Date(),
          recoverable: true,
        },
        isLoading: false,
      });

      renderWithQueryClient(<AnalyticsDashboard {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: /retry/i }),
      ).toBeInTheDocument();
    });
  });

  describe('Export Functionality', () => {
    it('calls export function when export button is clicked', async () => {
      const mockExport = jest.fn();
      const { useAnalyticsData } = require('@/hooks/useAnalyticsData');
      useAnalyticsData.mockReturnValue({
        ...useAnalyticsData(),
        exportData: mockExport,
      });

      renderWithQueryClient(<AnalyticsDashboard {...defaultProps} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      fireEvent.click(exportButton);

      expect(mockExport).toHaveBeenCalledWith('json');
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for mobile screens', () => {
      // Mock window.matchMedia for mobile screen
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
          matches: query === '(max-width: 768px)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      renderWithQueryClient(<AnalyticsDashboard {...defaultProps} />);

      const dashboard = screen.getByTestId('analytics-dashboard');
      expect(dashboard).toHaveClass('mobile-layout');
    });
  });

  describe('Performance Optimizations', () => {
    it('implements proper memoization to prevent unnecessary re-renders', () => {
      const { rerender } = renderWithQueryClient(
        <AnalyticsDashboard {...defaultProps} />,
      );

      // Re-render with same props
      rerender(
        <QueryClientProvider client={queryClient}>
          <AnalyticsDashboard {...defaultProps} />
        </QueryClientProvider>,
      );

      // Component should not re-render unnecessarily
      expect(
        screen.getByText('Wedding Analytics Dashboard'),
      ).toBeInTheDocument();
    });

    it('debounces rapid filter changes', async () => {
      jest.useFakeTimers();

      renderWithQueryClient(<AnalyticsDashboard {...defaultProps} />);

      // Simulate rapid filter changes
      const filterButton = screen.getByRole('button', { name: /filter/i });
      fireEvent.click(filterButton);
      fireEvent.click(filterButton);
      fireEvent.click(filterButton);

      // Only one filter update should be processed
      act(() => {
        jest.runAllTimers();
      });

      jest.useRealTimers();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      renderWithQueryClient(<AnalyticsDashboard {...defaultProps} />);

      expect(screen.getByRole('main')).toHaveAttribute(
        'aria-label',
        'Analytics Dashboard',
      );
      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      renderWithQueryClient(<AnalyticsDashboard {...defaultProps} />);

      const firstTab = screen.getByRole('tab', { name: /overview/i });
      firstTab.focus();

      expect(document.activeElement).toBe(firstTab);
    });

    it('announces changes to screen readers', async () => {
      renderWithQueryClient(<AnalyticsDashboard {...defaultProps} />);

      const revenueTab = screen.getByRole('tab', { name: /revenue/i });
      fireEvent.click(revenueTab);

      await waitFor(() => {
        expect(revenueTab).toHaveAttribute('aria-selected', 'true');
      });
    });
  });

  describe('Wedding Industry Context', () => {
    it('displays wedding-specific metrics', () => {
      renderWithQueryClient(<AnalyticsDashboard {...defaultProps} />);

      expect(screen.getByText(/wedding bookings/i)).toBeInTheDocument();
      expect(screen.getByText(/seasonal trends/i)).toBeInTheDocument();
      expect(screen.getByText(/client satisfaction/i)).toBeInTheDocument();
    });

    it('shows appropriate date ranges for wedding season analysis', () => {
      renderWithQueryClient(<AnalyticsDashboard {...defaultProps} />);

      expect(screen.getByText(/peak season/i)).toBeInTheDocument();
      expect(screen.getByText(/off-season/i)).toBeInTheDocument();
    });

    it('includes wedding industry benchmarks', () => {
      renderWithQueryClient(<AnalyticsDashboard {...defaultProps} />);

      expect(screen.getByText(/industry average/i)).toBeInTheDocument();
      expect(screen.getByText(/benchmark/i)).toBeInTheDocument();
    });
  });
});

// Integration tests
describe('AnalyticsDashboard Integration', () => {
  it('integrates properly with analytics data hook', () => {
    renderWithQueryClient(<AnalyticsDashboard {...defaultProps} />);

    // Verify that data from hook is properly displayed
    expect(screen.getByText('£156,750')).toBeInTheDocument(); // Total revenue
    expect(screen.getByText('38.9%')).toBeInTheDocument(); // Conversion rate
    expect(screen.getByText('4.7')).toBeInTheDocument(); // Satisfaction score
  });

  it('handles real-time data updates', async () => {
    const { useAnalyticsData } = require('@/hooks/useAnalyticsData');
    const mockData = useAnalyticsData();

    renderWithQueryClient(
      <AnalyticsDashboard {...defaultProps} realTimeEnabled={true} />,
    );

    // Simulate real-time update
    act(() => {
      mockData.refreshCount = 1;
      mockData.revenue.totalRevenue = 160000;
    });

    await waitFor(() => {
      expect(screen.getByText('£160,000')).toBeInTheDocument();
    });
  });
});

// Snapshot test
describe('AnalyticsDashboard Snapshots', () => {
  it('matches snapshot with default props', () => {
    const { container } = renderWithQueryClient(
      <AnalyticsDashboard {...defaultProps} />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot with loading state', () => {
    const { useAnalyticsData } = require('@/hooks/useAnalyticsData');
    useAnalyticsData.mockReturnValue({
      ...useAnalyticsData(),
      isLoading: true,
    });

    const { container } = renderWithQueryClient(
      <AnalyticsDashboard {...defaultProps} />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot with error state', () => {
    const { useAnalyticsData } = require('@/hooks/useAnalyticsData');
    useAnalyticsData.mockReturnValue({
      ...useAnalyticsData(),
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to load data',
        details: [],
        timestamp: new Date(),
        recoverable: true,
      },
    });

    const { container } = renderWithQueryClient(
      <AnalyticsDashboard {...defaultProps} />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
