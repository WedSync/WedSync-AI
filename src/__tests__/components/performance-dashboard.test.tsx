import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import PerformanceDashboard from '@/components/dashboard/performance-dashboard';
import { MetricsChart } from '@/components/dashboard/metrics-chart';
import { ServiceHealthGrid } from '@/components/dashboard/service-health-grid';
import { AlertsList } from '@/components/dashboard/alerts-list';

// Mock the hooks and utilities
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user',
      organization_id: 'test-org',
    },
    loading: false,
  }),
}));

vi.mock('@/hooks/useMetrics', () => ({
  useMetrics: vi.fn(() => ({
    metrics: mockMetricsData,
    loading: false,
    error: null,
    refetch: vi.fn(),
  })),
}));

vi.mock('@/hooks/useServiceHealth', () => ({
  useServiceHealth: vi.fn(() => ({
    services: mockServicesData,
    loading: false,
    error: null,
    refetch: vi.fn(),
  })),
}));

vi.mock('@/hooks/useAlerts', () => ({
  useAlerts: vi.fn(() => ({
    alerts: mockAlertsData,
    incidents: mockIncidentsData,
    loading: false,
    error: null,
    refetch: vi.fn(),
  })),
}));

// Mock data
const mockMetricsData = [
  {
    id: '1',
    service_name: 'web-app',
    metric_name: 'response_time',
    metric_value: 150.5,
    metric_type: 'timer',
    unit: 'ms',
    timestamp: '2025-01-22T10:00:00Z',
    tags: { endpoint: '/api/clients' },
  },
  {
    id: '2',
    service_name: 'database',
    metric_name: 'query_time',
    metric_value: 45.2,
    metric_type: 'timer',
    unit: 'ms',
    timestamp: '2025-01-22T10:01:00Z',
    tags: { table: 'clients' },
  },
];

const mockServicesData = [
  {
    id: '1',
    service_name: 'payment-gateway',
    service_type: 'payment',
    status: 'healthy',
    response_time_ms: 120.5,
    error_rate: 0.001,
    availability_percentage: 99.95,
    wedding_critical: true,
    last_check_at: '2025-01-22T10:00:00Z',
  },
  {
    id: '2',
    service_name: 'email-service',
    service_type: 'email',
    status: 'warning',
    response_time_ms: 450.0,
    error_rate: 0.02,
    availability_percentage: 98.5,
    wedding_critical: true,
    last_check_at: '2025-01-22T10:00:00Z',
  },
  {
    id: '3',
    service_name: 'analytics',
    service_type: 'analytics',
    status: 'critical',
    response_time_ms: 2000.0,
    error_rate: 0.15,
    availability_percentage: 85.2,
    wedding_critical: false,
    last_check_at: '2025-01-22T10:00:00Z',
  },
];

const mockAlertsData = [
  {
    id: '1',
    alert_name: 'High Response Time',
    metric_pattern: 'api.response_time.*',
    threshold_value: 500,
    severity: 'warning',
    is_active: true,
    wedding_day_override: true,
  },
  {
    id: '2',
    alert_name: 'Database Connection Pool',
    metric_pattern: 'database.connections.*',
    threshold_value: 80,
    severity: 'critical',
    is_active: true,
    wedding_day_override: false,
  },
];

const mockIncidentsData = [
  {
    id: '1',
    alert_id: '1',
    triggered_at: '2025-01-22T09:30:00Z',
    status: 'firing',
    metric_value: 650,
    threshold_value: 500,
    severity: 'warning',
    was_wedding_day: false,
  },
  {
    id: '2',
    alert_id: '2',
    triggered_at: '2025-01-22T08:15:00Z',
    resolved_at: '2025-01-22T08:45:00Z',
    status: 'resolved',
    metric_value: 85,
    threshold_value: 80,
    severity: 'critical',
    was_wedding_day: true,
    wedding_date: '2025-01-22',
  },
];

describe('Performance Dashboard Components', () => {
  describe('PerformanceDashboard', () => {
    it('renders dashboard with all main sections', async () => {
      render(<PerformanceDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Performance Overview')).toBeInTheDocument();
        expect(screen.getByText('Service Health')).toBeInTheDocument();
        expect(screen.getByText('Active Alerts')).toBeInTheDocument();
        expect(screen.getByText('Recent Incidents')).toBeInTheDocument();
      });
    });

    it('displays loading state correctly', async () => {
      const mockUseMetrics = await import('@/hooks/useMetrics');
      vi.mocked(mockUseMetrics.useMetrics).mockReturnValue({
        metrics: [],
        loading: true,
        error: null,
      });

      render(<PerformanceDashboard />);

      expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
    });

    it('handles error states gracefully', async () => {
      const mockUseMetrics = await import('@/hooks/useMetrics');
      vi.mocked(mockUseMetrics.useMetrics).mockReturnValue({
        metrics: [],
        loading: false,
        error: 'Failed to load metrics',
      });

      render(<PerformanceDashboard />);

      expect(
        screen.getByText('Error loading performance data'),
      ).toBeInTheDocument();
      expect(screen.getByText('Failed to load metrics')).toBeInTheDocument();
    });

    it('refreshes data when refresh button is clicked', async () => {
      const mockRefetch = vi.fn();
      const mockUseMetrics = await import('@/hooks/useMetrics');
      vi.mocked(mockUseMetrics.useMetrics).mockReturnValue({
        metrics: mockMetricsData,
        loading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<PerformanceDashboard />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);

      expect(mockRefetch).toHaveBeenCalled();
    });

    it('filters data by time range', async () => {
      render(<PerformanceDashboard />);

      const timeRangeSelect = screen.getByRole('combobox', {
        name: /time range/i,
      });
      fireEvent.change(timeRangeSelect, { target: { value: '24h' } });

      await waitFor(() => {
        expect(timeRangeSelect).toHaveValue('24h');
      });
    });

    it('displays wedding day indicators correctly', () => {
      render(<PerformanceDashboard />);

      // Should show wedding day alerts are enabled
      expect(
        screen.getByText('Wedding Day Enhanced Monitoring'),
      ).toBeInTheDocument();
      expect(screen.getByTestId('wedding-day-indicator')).toBeInTheDocument();
    });
  });

  describe('MetricsChart', () => {
    it('renders metrics chart with data', () => {
      render(
        <MetricsChart
          metrics={mockMetricsData}
          title="Response Time"
          yAxisLabel="Time (ms)"
        />,
      );

      expect(screen.getByText('Response Time')).toBeInTheDocument();
      expect(screen.getByText('Time (ms)')).toBeInTheDocument();
    });

    it('handles empty data gracefully', () => {
      render(
        <MetricsChart metrics={[]} title="Empty Chart" yAxisLabel="Value" />,
      );

      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('displays aggregated metrics correctly', () => {
      const metricsWithAggregation = [
        ...mockMetricsData,
        {
          id: '3',
          service_name: 'web-app',
          metric_name: 'response_time',
          metric_value: 200.0,
          metric_type: 'timer',
          unit: 'ms',
          timestamp: '2025-01-22T10:02:00Z',
          tags: { endpoint: '/api/clients' },
        },
      ];

      render(
        <MetricsChart
          metrics={metricsWithAggregation}
          title="Response Time Trend"
          yAxisLabel="Time (ms)"
          showAggregation={true}
        />,
      );

      expect(screen.getByText('Avg: 175.25ms')).toBeInTheDocument();
      expect(screen.getByText('Min: 150.50ms')).toBeInTheDocument();
      expect(screen.getByText('Max: 200.00ms')).toBeInTheDocument();
    });

    it('allows zooming and panning on chart', async () => {
      render(
        <MetricsChart
          metrics={mockMetricsData}
          title="Interactive Chart"
          yAxisLabel="Value"
          interactive={true}
        />,
      );

      const chartContainer = screen.getByTestId('metrics-chart');

      // Simulate zoom gesture
      fireEvent.wheel(chartContainer, { deltaY: -100 });

      await waitFor(() => {
        expect(screen.getByTestId('chart-zoom-controls')).toBeInTheDocument();
      });
    });
  });

  describe('ServiceHealthGrid', () => {
    it('renders service health grid with status indicators', () => {
      render(<ServiceHealthGrid services={mockServicesData} />);

      expect(screen.getByText('payment-gateway')).toBeInTheDocument();
      expect(screen.getByText('email-service')).toBeInTheDocument();
      expect(screen.getByText('analytics')).toBeInTheDocument();

      // Check status indicators
      expect(screen.getByTestId('status-healthy')).toBeInTheDocument();
      expect(screen.getByTestId('status-warning')).toBeInTheDocument();
      expect(screen.getByTestId('status-critical')).toBeInTheDocument();
    });

    it('prioritizes wedding-critical services', () => {
      render(<ServiceHealthGrid services={mockServicesData} />);

      const criticalServices = screen.getAllByTestId('wedding-critical-badge');
      expect(criticalServices).toHaveLength(2); // payment-gateway and email-service
    });

    it('displays service metrics correctly', () => {
      render(<ServiceHealthGrid services={mockServicesData} />);

      expect(screen.getByText('120.5ms')).toBeInTheDocument(); // payment-gateway response time
      expect(screen.getByText('99.95%')).toBeInTheDocument(); // payment-gateway availability
      expect(screen.getByText('0.10%')).toBeInTheDocument(); // payment-gateway error rate
    });

    it('shows service health trends', () => {
      const servicesWithHistory = mockServicesData.map((service) => ({
        ...service,
        status_history: [
          {
            timestamp: '2025-01-22T09:00:00Z',
            status: 'healthy',
            response_time_ms: 100,
          },
          {
            timestamp: '2025-01-22T09:30:00Z',
            status: 'warning',
            response_time_ms: 300,
          },
          {
            timestamp: '2025-01-22T10:00:00Z',
            status: service.status,
            response_time_ms: service.response_time_ms,
          },
        ],
      }));

      render(<ServiceHealthGrid services={servicesWithHistory} />);

      expect(screen.getAllByTestId('health-trend-chart')).toHaveLength(3);
    });

    it('allows expanding service details', async () => {
      render(<ServiceHealthGrid services={mockServicesData} />);

      const expandButton = screen.getAllByRole('button', {
        name: /expand details/i,
      })[0];
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText('Service Configuration')).toBeInTheDocument();
        expect(screen.getByText('Health Check Details')).toBeInTheDocument();
      });
    });

    it('filters services by status', () => {
      render(<ServiceHealthGrid services={mockServicesData} />);

      const statusFilter = screen.getByRole('combobox', {
        name: /filter by status/i,
      });
      fireEvent.change(statusFilter, { target: { value: 'critical' } });

      expect(screen.getByText('analytics')).toBeInTheDocument();
      expect(screen.queryByText('payment-gateway')).not.toBeInTheDocument();
    });
  });

  describe('AlertsList', () => {
    it('renders alerts and incidents', () => {
      render(
        <AlertsList alerts={mockAlertsData} incidents={mockIncidentsData} />,
      );

      expect(screen.getByText('High Response Time')).toBeInTheDocument();
      expect(screen.getByText('Database Connection Pool')).toBeInTheDocument();

      // Check incident statuses
      expect(screen.getByText('FIRING')).toBeInTheDocument();
      expect(screen.getByText('RESOLVED')).toBeInTheDocument();
    });

    it('highlights wedding day incidents', () => {
      render(
        <AlertsList alerts={mockAlertsData} incidents={mockIncidentsData} />,
      );

      const weddingDayIncident = screen.getByTestId('incident-2');
      expect(weddingDayIncident).toHaveClass('wedding-day-incident');
      expect(screen.getByText('Wedding Day Event')).toBeInTheDocument();
    });

    it('allows acknowledging alerts', async () => {
      const mockAcknowledge = vi.fn();

      render(
        <AlertsList
          alerts={mockAlertsData}
          incidents={mockIncidentsData}
          onAcknowledge={mockAcknowledge}
        />,
      );

      const acknowledgeButton = screen.getAllByRole('button', {
        name: /acknowledge/i,
      })[0];
      fireEvent.click(acknowledgeButton);

      expect(mockAcknowledge).toHaveBeenCalledWith('1'); // incident id
    });

    it('shows alert configuration details', async () => {
      render(
        <AlertsList alerts={mockAlertsData} incidents={mockIncidentsData} />,
      );

      const configButton = screen.getAllByRole('button', {
        name: /view config/i,
      })[0];
      fireEvent.click(configButton);

      await waitFor(() => {
        expect(screen.getByText('Threshold: 500')).toBeInTheDocument();
        expect(screen.getByText('Severity: warning')).toBeInTheDocument();
        expect(
          screen.getByText('Wedding Day Override: Enabled'),
        ).toBeInTheDocument();
      });
    });

    it('filters alerts by severity', () => {
      render(
        <AlertsList alerts={mockAlertsData} incidents={mockIncidentsData} />,
      );

      const severityFilter = screen.getByRole('combobox', {
        name: /filter by severity/i,
      });
      fireEvent.change(severityFilter, { target: { value: 'critical' } });

      expect(screen.getByText('Database Connection Pool')).toBeInTheDocument();
      expect(screen.queryByText('High Response Time')).not.toBeInTheDocument();
    });

    it('shows incident timeline', () => {
      render(
        <AlertsList alerts={mockAlertsData} incidents={mockIncidentsData} />,
      );

      expect(screen.getByText('Triggered: 09:30 UTC')).toBeInTheDocument();
      expect(screen.getByText('Resolved: 08:45 UTC')).toBeInTheDocument();
      expect(screen.getByText('Duration: 30 minutes')).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('updates dashboard data in real-time', async () => {
      const mockUseMetrics = require('@/hooks/useMetrics');
      const { rerender } = render(<PerformanceDashboard />);

      // Simulate real-time update
      const updatedMetrics = [
        ...mockMetricsData,
        {
          id: '3',
          service_name: 'web-app',
          metric_name: 'response_time',
          metric_value: 180.0,
          metric_type: 'timer',
          unit: 'ms',
          timestamp: new Date().toISOString(),
          tags: { endpoint: '/api/clients' },
        },
      ];

      mockUseMetrics.useMetrics.mockReturnValue({
        metrics: updatedMetrics,
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      rerender(<PerformanceDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('metrics-chart')).toBeInTheDocument();
      });
    });

    it('shows live status indicators', () => {
      render(<PerformanceDashboard />);

      expect(screen.getByTestId('live-indicator')).toBeInTheDocument();
      expect(screen.getByText('Live')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for mobile screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<PerformanceDashboard />);

      expect(screen.getByTestId('mobile-dashboard-layout')).toBeInTheDocument();
    });

    it('stacks cards vertically on small screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<ServiceHealthGrid services={mockServicesData} />);

      const grid = screen.getByTestId('service-health-grid');
      expect(grid).toHaveClass('grid-cols-1');
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels', () => {
      render(<PerformanceDashboard />);

      expect(
        screen.getByRole('main', { name: /performance dashboard/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('region', { name: /service health overview/i }),
      ).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(<PerformanceDashboard />);

      const refreshButton = screen.getByRole('button', {
        name: /refresh dashboard/i,
      });
      refreshButton.focus();

      expect(refreshButton).toHaveFocus();

      fireEvent.keyDown(refreshButton, { key: 'Enter' });
      // Should trigger refresh action
    });

    it('provides screen reader announcements for status changes', () => {
      const { rerender } = render(
        <ServiceHealthGrid services={mockServicesData} />,
      );

      const updatedServices = mockServicesData.map((service) =>
        service.service_name === 'email-service'
          ? { ...service, status: 'critical' as const }
          : service,
      );

      rerender(<ServiceHealthGrid services={updatedServices} />);

      expect(screen.getByRole('status')).toHaveTextContent(
        'Service status changed: email-service is now critical',
      );
    });
  });
});
