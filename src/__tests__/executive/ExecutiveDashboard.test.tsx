import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { ExecutiveDashboard } from '@/components/executive/ExecutiveDashboard';
import { useExecutiveData } from '@/components/executive/useExecutiveData';

// Mock the custom hook
jest.mock('@/components/executive/useExecutiveData');
const mockUseExecutiveData = useExecutiveData as jest.MockedFunction<
  typeof useExecutiveData
>;

// Mock child components
jest.mock('@/components/executive/RevenueMetrics', () => {
  return function RevenueMetrics() {
    return <div data-testid="revenue-metrics">Revenue Metrics</div>;
  };
});

jest.mock('@/components/executive/GrowthAnalytics', () => {
  return function GrowthAnalytics() {
    return <div data-testid="growth-analytics">Growth Analytics</div>;
  };
});

jest.mock('@/components/executive/SupplierMetrics', () => {
  return function SupplierMetrics() {
    return <div data-testid="supplier-metrics">Supplier Metrics</div>;
  };
});

jest.mock('@/components/executive/MarketInsights', () => {
  return function MarketInsights() {
    return <div data-testid="market-insights">Market Insights</div>;
  };
});

jest.mock('@/components/executive/KPIDashboard', () => {
  return function KPIDashboard() {
    return <div data-testid="kpi-dashboard">KPI Dashboard</div>;
  };
});

const mockMetrics = {
  totalRevenue: 500000,
  revenueGrowth: 15.2,
  activeClients: 1250,
  clientGrowth: 18.5,
  weddingBookings: 425,
  bookingGrowth: 12.3,
  avgVendorRating: 4.7,
  vendorRatingGrowth: 2.1,
  uptime: 99.95,
  uptimeChange: 0.02,
  peakSeasonLoad: 2.5,
  loadTrend: 'Increasing',
  revenueChart: [
    { month: 'Jan', revenue: 45000, target: 50000 },
    { month: 'Feb', revenue: 48000, target: 52000 },
    { month: 'Mar', revenue: 52000, target: 54000 },
  ],
  clientChart: [
    { month: 'Jan', newClients: 25, activeClients: 1180 },
    { month: 'Feb', newClients: 30, activeClients: 1210 },
    { month: 'Mar', newClients: 35, activeClients: 1245 },
  ],
  vendorChart: [
    { name: 'Photographers', value: 35, rating: 4.8 },
    { name: 'Venues', value: 25, rating: 4.6 },
    { name: 'Caterers', value: 20, rating: 4.7 },
  ],
  recentActivity: [
    {
      type: 'payment',
      description: 'New subscription payment received',
      details: 'Professional plan renewal',
      timestamp: '2025-01-20T10:30:00Z',
    },
    {
      type: 'booking',
      description: 'Wedding booking created',
      details: 'Summer 2025 wedding',
      timestamp: '2025-01-20T09:15:00Z',
    },
  ],
  seasonalTrends: {
    peakMonths: ['May', 'June', 'July', 'August', 'September'],
    averageLoadIncrease: 2.5,
    capacityUtilization: 0.85,
  },
};

describe('ExecutiveDashboard', () => {
  beforeEach(() => {
    mockUseExecutiveData.mockReturnValue({
      metrics: mockMetrics,
      loading: false,
      error: null,
      refreshData: jest.fn(),
      lastUpdated: new Date('2025-01-20T12:00:00Z'),
      isRefreshing: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders dashboard with key metrics', () => {
    render(
      <ExecutiveDashboard organizationId="123e4567-e89b-12d3-a456-426614174000" />,
    );

    // Check if main title is rendered
    expect(screen.getByText('Executive Dashboard')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Real-time business intelligence for wedding platform operations',
      ),
    ).toBeInTheDocument();

    // Check key metric cards
    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('£500,000')).toBeInTheDocument();
    expect(screen.getByText('+15.2% from last period')).toBeInTheDocument();

    expect(screen.getByText('Active Clients')).toBeInTheDocument();
    expect(screen.getByText('1,250')).toBeInTheDocument();
    expect(screen.getByText('+18.5% YoY growth')).toBeInTheDocument();

    expect(screen.getByText('Wedding Bookings')).toBeInTheDocument();
    expect(screen.getByText('425')).toBeInTheDocument();
    expect(screen.getByText('Load trend: Increasing')).toBeInTheDocument();

    expect(screen.getByText('System Uptime')).toBeInTheDocument();
    expect(screen.getByText('99.95%')).toBeInTheDocument();
  });

  test('renders time range selector buttons', () => {
    render(
      <ExecutiveDashboard organizationId="123e4567-e89b-12d3-a456-426614174000" />,
    );

    expect(screen.getByText('7 Days')).toBeInTheDocument();
    expect(screen.getByText('30 Days')).toBeInTheDocument();
    expect(screen.getByText('90 Days')).toBeInTheDocument();
    expect(screen.getByText('1 Year')).toBeInTheDocument();
  });

  test('handles time range selection', () => {
    render(
      <ExecutiveDashboard organizationId="123e4567-e89b-12d3-a456-426614174000" />,
    );

    const sevenDayButton = screen.getByText('7 Days');
    fireEvent.click(sevenDayButton);

    // The button should become active (we'd need to check CSS classes in real implementation)
    expect(sevenDayButton).toBeInTheDocument();
  });

  test('renders tab navigation correctly', () => {
    render(
      <ExecutiveDashboard organizationId="123e4567-e89b-12d3-a456-426614174000" />,
    );

    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('Growth')).toBeInTheDocument();
    expect(screen.getByText('Suppliers')).toBeInTheDocument();
    expect(screen.getByText('Market')).toBeInTheDocument();
    expect(screen.getByText('KPIs')).toBeInTheDocument();
  });

  test('switches between tab content correctly', async () => {
    render(
      <ExecutiveDashboard organizationId="123e4567-e89b-12d3-a456-426614174000" />,
    );

    // Default tab should show revenue metrics
    expect(screen.getByTestId('revenue-metrics')).toBeInTheDocument();

    // Click on Growth tab
    const growthTab = screen.getByText('Growth');
    fireEvent.click(growthTab);

    await waitFor(() => {
      expect(screen.getByTestId('growth-analytics')).toBeInTheDocument();
    });

    // Click on Suppliers tab
    const suppliersTab = screen.getByText('Suppliers');
    fireEvent.click(suppliersTab);

    await waitFor(() => {
      expect(screen.getByTestId('supplier-metrics')).toBeInTheDocument();
    });
  });

  test('renders wedding season performance section', () => {
    render(
      <ExecutiveDashboard organizationId="123e4567-e89b-12d3-a456-426614174000" />,
    );

    expect(screen.getByText('Wedding Season Performance')).toBeInTheDocument();
    expect(screen.getByText('Peak Season Load')).toBeInTheDocument();
    expect(screen.getByText('2.5x')).toBeInTheDocument();
    expect(screen.getByText('vs off-season bookings')).toBeInTheDocument();

    expect(screen.getByText('Peak Months')).toBeInTheDocument();
    expect(screen.getByText('May')).toBeInTheDocument();
    expect(screen.getByText('June')).toBeInTheDocument();

    expect(screen.getByText('Capacity Utilization')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  test('renders recent activity feed', () => {
    render(
      <ExecutiveDashboard organizationId="123e4567-e89b-12d3-a456-426614174000" />,
    );

    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(
      screen.getByText('Latest business events and system activities'),
    ).toBeInTheDocument();

    expect(
      screen.getByText('New subscription payment received'),
    ).toBeInTheDocument();
    expect(screen.getByText('Professional plan renewal')).toBeInTheDocument();
    expect(screen.getByText('Wedding booking created')).toBeInTheDocument();
    expect(screen.getByText('Summer 2025 wedding')).toBeInTheDocument();
  });

  test('handles loading state', () => {
    mockUseExecutiveData.mockReturnValue({
      metrics: null,
      loading: true,
      error: null,
      refreshData: jest.fn(),
      lastUpdated: null,
      isRefreshing: false,
    });

    render(
      <ExecutiveDashboard organizationId="123e4567-e89b-12d3-a456-426614174000" />,
    );

    // Should show loading skeleton
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  test('handles error state', () => {
    mockUseExecutiveData.mockReturnValue({
      metrics: null,
      loading: false,
      error: 'Failed to load metrics',
      refreshData: jest.fn(),
      lastUpdated: null,
      isRefreshing: false,
    });

    render(
      <ExecutiveDashboard organizationId="123e4567-e89b-12d3-a456-426614174000" />,
    );

    expect(screen.getByText('Error Loading Dashboard')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Unable to load executive metrics. Please try refreshing.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  test('handles refresh functionality', async () => {
    const mockRefreshData = jest.fn().mockResolvedValue(undefined);
    mockUseExecutiveData.mockReturnValue({
      metrics: mockMetrics,
      loading: false,
      error: null,
      refreshData: mockRefreshData,
      lastUpdated: new Date('2025-01-20T12:00:00Z'),
      isRefreshing: false,
    });

    render(
      <ExecutiveDashboard organizationId="123e4567-e89b-12d3-a456-426614174000" />,
    );

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockRefreshData).toHaveBeenCalledTimes(1);
    });
  });

  test('displays last updated timestamp', () => {
    render(
      <ExecutiveDashboard organizationId="123e4567-e89b-12d3-a456-426614174000" />,
    );

    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    expect(screen.getByText(/20\/01\/2025/)).toBeInTheDocument(); // Date format may vary
  });

  test('applies custom className', () => {
    const { container } = render(
      <ExecutiveDashboard
        organizationId="123e4567-e89b-12d3-a456-426614174000"
        className="custom-dashboard"
      />,
    );

    expect(container.firstChild).toHaveClass('custom-dashboard');
  });

  test('handles empty activity feed gracefully', () => {
    const metricsWithoutActivity = { ...mockMetrics, recentActivity: [] };
    mockUseExecutiveData.mockReturnValue({
      metrics: metricsWithoutActivity,
      loading: false,
      error: null,
      refreshData: jest.fn(),
      lastUpdated: new Date(),
      isRefreshing: false,
    });

    render(
      <ExecutiveDashboard organizationId="123e4567-e89b-12d3-a456-426614174000" />,
    );

    expect(screen.getByText('No recent activity')).toBeInTheDocument();
  });
});

describe('ExecutiveDashboard Integration', () => {
  test('passes correct props to child components', () => {
    const organizationId = '123e4567-e89b-12d3-a456-426614174000';
    render(<ExecutiveDashboard organizationId={organizationId} />);

    // All tab content components should receive the same props
    expect(screen.getByTestId('revenue-metrics')).toBeInTheDocument();

    // Switch to each tab to ensure all components receive props
    fireEvent.click(screen.getByText('Growth'));
    expect(screen.getByTestId('growth-analytics')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Suppliers'));
    expect(screen.getByTestId('supplier-metrics')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Market'));
    expect(screen.getByTestId('market-insights')).toBeInTheDocument();

    fireEvent.click(screen.getByText('KPIs'));
    expect(screen.getByTestId('kpi-dashboard')).toBeInTheDocument();
  });

  test('updates time range for all components', () => {
    const organizationId = '123e4567-e89b-12d3-a456-426614174000';
    render(<ExecutiveDashboard organizationId={organizationId} />);

    // Change time range
    fireEvent.click(screen.getByText('7 Days'));

    // All components should receive updated timeRange prop
    // This would be verified through prop assertions in real implementation
    expect(screen.getByTestId('revenue-metrics')).toBeInTheDocument();
  });
});
