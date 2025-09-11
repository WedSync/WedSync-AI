/**
 * MetricsDashboard Component Tests
 * WS-235: Support Operations Ticket Management System
 * 
 * Comprehensive test suite for support metrics dashboard functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MetricsDashboard } from '@/components/support/MetricsDashboard';

// Mock data for metrics
const mockAgentMetrics = [
  {
    agent_id: 'agent-1',
    agent_name: 'Sarah Williams',
    tickets_handled: 45,
    avg_response_time: 8.5,
    avg_resolution_time: 120,
    customer_satisfaction: 4.8,
    sla_compliance_rate: 0.95,
    escalation_rate: 0.03,
    tier_specialization: ['professional', 'scale'],
    active_tickets: 3,
    resolved_today: 8
  },
  {
    agent_id: 'agent-2',
    agent_name: 'Mike Johnson',
    tickets_handled: 38,
    avg_response_time: 12.2,
    avg_resolution_time: 165,
    customer_satisfaction: 4.6,
    sla_compliance_rate: 0.89,
    escalation_rate: 0.08,
    tier_specialization: ['starter', 'professional'],
    active_tickets: 5,
    resolved_today: 6
  },
  {
    agent_id: 'agent-3',
    agent_name: 'Emily Chen',
    tickets_handled: 52,
    avg_response_time: 6.1,
    avg_resolution_time: 95,
    customer_satisfaction: 4.9,
    sla_compliance_rate: 0.98,
    escalation_rate: 0.02,
    tier_specialization: ['enterprise'],
    active_tickets: 2,
    resolved_today: 9
  }
];

const mockSystemMetrics = {
  total_tickets: 156,
  open_tickets: 23,
  resolved_tickets: 133,
  avg_response_time: 9.2,
  avg_resolution_time: 127,
  sla_compliance_rate: 0.94,
  customer_satisfaction: 4.7,
  escalation_rate: 0.04,
  wedding_emergency_count: 3,
  critical_tickets: 5,
  trends: {
    ticket_volume: [
      { date: '2025-01-01', count: 12 },
      { date: '2025-01-02', count: 18 },
      { date: '2025-01-03', count: 15 },
      { date: '2025-01-04', count: 22 },
      { date: '2025-01-05', count: 19 }
    ],
    response_times: [
      { date: '2025-01-01', time: 8.5 },
      { date: '2025-01-02', time: 9.2 },
      { date: '2025-01-03', time: 7.8 },
      { date: '2025-01-04', time: 10.1 },
      { date: '2025-01-05', time: 9.2 }
    ],
    satisfaction_scores: [
      { date: '2025-01-01', score: 4.8 },
      { date: '2025-01-02', score: 4.6 },
      { date: '2025-01-03', score: 4.9 },
      { date: '2025-01-04', score: 4.7 },
      { date: '2025-01-05', score: 4.7 }
    ]
  }
};

const mockTicketBreakdown = {
  by_category: [
    { category: 'technical', count: 45, percentage: 28.8 },
    { category: 'billing', count: 38, percentage: 24.4 },
    { category: 'onboarding', count: 32, percentage: 20.5 },
    { category: 'bug', count: 25, percentage: 16.0 },
    { category: 'feature_request', count: 16, percentage: 10.3 }
  ],
  by_priority: [
    { priority: 'critical', count: 5, percentage: 3.2 },
    { priority: 'high', count: 28, percentage: 17.9 },
    { priority: 'medium', count: 89, percentage: 57.1 },
    { priority: 'low', count: 34, percentage: 21.8 }
  ],
  by_tier: [
    { tier: 'enterprise', count: 42, percentage: 26.9 },
    { tier: 'professional', count: 38, percentage: 24.4 },
    { tier: 'scale', count: 35, percentage: 22.4 },
    { tier: 'starter', count: 28, percentage: 17.9 },
    { tier: 'free', count: 13, percentage: 8.3 }
  ]
};

// Mock API calls
const mockFetchAgentMetrics = jest.fn();
const mockFetchSystemMetrics = jest.fn();
const mockFetchTicketBreakdown = jest.fn();

jest.mock('@/lib/api/support', () => ({
  fetchAgentMetrics: () => mockFetchAgentMetrics(),
  fetchSystemMetrics: () => mockFetchSystemMetrics(),
  fetchTicketBreakdown: () => mockFetchTicketBreakdown(),
}));

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('MetricsDashboard', () => {
  const defaultProps = {
    timeRange: '7d' as const,
    refreshInterval: 300000, // 5 minutes
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchAgentMetrics.mockResolvedValue(mockAgentMetrics);
    mockFetchSystemMetrics.mockResolvedValue(mockSystemMetrics);
    mockFetchTicketBreakdown.mockResolvedValue(mockTicketBreakdown);
  });

  describe('Dashboard Overview', () => {
    it('should display key system metrics', async () => {
      render(<MetricsDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('156')).toBeInTheDocument(); // Total tickets
        expect(screen.getByText('23')).toBeInTheDocument(); // Open tickets
        expect(screen.getByText('133')).toBeInTheDocument(); // Resolved tickets
        expect(screen.getByText('9.2 min')).toBeInTheDocument(); // Avg response time
        expect(screen.getByText('94%')).toBeInTheDocument(); // SLA compliance
      });
    });

    it('should highlight critical metrics with warning colors', async () => {
      const criticalMetrics = {
        ...mockSystemMetrics,
        sla_compliance_rate: 0.75, // Below threshold
        escalation_rate: 0.15, // Above threshold
        avg_response_time: 25.0 // Above threshold
      };
      mockFetchSystemMetrics.mockResolvedValue(criticalMetrics);

      render(<MetricsDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        const slaElement = screen.getByText('75%');
        expect(slaElement.closest('[data-testid="metric-card"]')).toHaveClass('border-red-200');
      });
    });

    it('should show wedding emergency alerts prominently', async () => {
      render(<MetricsDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('3 Wedding Emergencies')).toBeInTheDocument();
        expect(screen.getByTestId('emergency-alert')).toHaveClass('bg-red-50');
      });
    });

    it('should display current active agent count', async () => {
      render(<MetricsDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('3 Active Agents')).toBeInTheDocument();
      });
    });
  });

  describe('Agent Performance Table', () => {
    it('should display all agent metrics correctly', async () => {
      render(<MetricsDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Sarah Williams')).toBeInTheDocument();
        expect(screen.getByText('Mike Johnson')).toBeInTheDocument();
        expect(screen.getByText('Emily Chen')).toBeInTheDocument();
      });

      // Check specific metrics for first agent
      const sarahRow = screen.getByText('Sarah Williams').closest('tr');
      expect(within(sarahRow!).getByText('45')).toBeInTheDocument(); // Tickets handled
      expect(within(sarahRow!).getByText('8.5 min')).toBeInTheDocument(); // Response time
      expect(within(sarahRow!).getByText('4.8')).toBeInTheDocument(); // Satisfaction
    });

    it('should sort agents by performance metrics', async () => {
      const user = userEvent.setup();
      render(<MetricsDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Sarah Williams')).toBeInTheDocument();
      });

      const responseTimeHeader = screen.getByRole('button', { name: /response time/i });
      await user.click(responseTimeHeader);

      // Should sort by response time ascending
      const rows = screen.getAllByTestId('agent-row');
      expect(within(rows[0]).getByText('Emily Chen')).toBeInTheDocument(); // 6.1 min
      expect(within(rows[1]).getByText('Sarah Williams')).toBeInTheDocument(); // 8.5 min
    });

    it('should highlight top performing agents', async () => {
      render(<MetricsDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        const emilyRow = screen.getByText('Emily Chen').closest('tr');
        expect(emilyRow).toHaveClass('bg-green-50'); // Top performer styling
      });
    });

    it('should show agent specializations', async () => {
      render(<MetricsDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Professional, Scale')).toBeInTheDocument();
        expect(screen.getByText('Enterprise')).toBeInTheDocument();
      });
    });
  });

  describe('Ticket Breakdown Charts', () => {
    it('should display category breakdown chart', async () => {
      render(<MetricsDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Tickets by Category')).toBeInTheDocument();
        expect(screen.getByText('technical (28.8%)')).toBeInTheDocument();
        expect(screen.getByText('billing (24.4%)')).toBeInTheDocument();
      });
    });

    it('should display priority breakdown chart', async () => {
      render(<MetricsDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Tickets by Priority')).toBeInTheDocument();
        expect(screen.getByText('critical (3.2%)')).toBeInTheDocument();
        expect(screen.getByText('medium (57.1%)')).toBeInTheDocument();
      });
    });

    it('should display tier distribution chart', async () => {
      render(<MetricsDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Tickets by Tier')).toBeInTheDocument();
        expect(screen.getByText('enterprise (26.9%)')).toBeInTheDocument();
        expect(screen.getByText('free (8.3%)')).toBeInTheDocument();
      });
    });
  });

  describe('Trend Charts', () => {
    it('should display ticket volume trend', async () => {
      render(<MetricsDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Ticket Volume Trend')).toBeInTheDocument();
        expect(screen.getByTestId('volume-trend-chart')).toBeInTheDocument();
      });
    });

    it('should display response time trend', async () => {
      render(<MetricsDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Response Time Trend')).toBeInTheDocument();
        expect(screen.getByTestId('response-trend-chart')).toBeInTheDocument();
      });
    });

    it('should display satisfaction trend', async () => {
      render(<MetricsDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Customer Satisfaction Trend')).toBeInTheDocument();
        expect(screen.getByTestId('satisfaction-trend-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Time Range Selection', () => {
    it('should update metrics when time range changes', async () => {
      const user = userEvent.setup();
      render(<MetricsDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
      });

      const timeRangeSelect = screen.getByRole('combobox', { name: /time range/i });
      await user.selectOptions(timeRangeSelect, '30d');

      expect(screen.getByText('Last 30 Days')).toBeInTheDocument();
      expect(mockFetchSystemMetrics).toHaveBeenCalledTimes(2);
    });

    it('should support custom date range selection', async () => {
      const user = userEvent.setup();
      render(<MetricsDashboard {...defaultProps} />, { wrapper: createWrapper() });

      const customRangeButton = screen.getByRole('button', { name: /custom range/i });
      await user.click(customRangeButton);

      expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
      expect(screen.getByLabelText('End Date')).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('should auto-refresh metrics based on refresh interval', async () => {
      jest.useFakeTimers();
      const shortRefreshProps = { ...defaultProps, refreshInterval: 1000 };
      
      render(<MetricsDashboard {...shortRefreshProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockFetchSystemMetrics).toHaveBeenCalledTimes(1);
      });

      // Fast-forward 1 second
      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(mockFetchSystemMetrics).toHaveBeenCalledTimes(2);
      });

      jest.useRealTimers();
    });

    it('should show live update indicator', async () => {
      render(<MetricsDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Live')).toBeInTheDocument();
        expect(screen.getByTestId('live-indicator')).toHaveClass('animate-pulse');
      });
    });

    it('should pause updates when user is interacting', async () => {
      const user = userEvent.setup();
      render(<MetricsDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Sarah Williams')).toBeInTheDocument();
      });

      // Hover over a chart to pause updates
      const chart = screen.getByTestId('volume-trend-chart');
      await user.hover(chart);

      expect(screen.getByText('Updates paused')).toBeInTheDocument();
    });
  });

  describe('Export Functionality', () => {
    it('should export metrics to CSV', async () => {
      const user = userEvent.setup();
      const mockCreateElement = jest.spyOn(document, 'createElement');
      const mockClick = jest.fn();
      mockCreateElement.mockReturnValue({ click: mockClick } as any);

      render(<MetricsDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Sarah Williams')).toBeInTheDocument();
      });

      const exportButton = screen.getByRole('button', { name: /export csv/i });
      await user.click(exportButton);

      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockClick).toHaveBeenCalled();
    });

    it('should generate PDF report', async () => {
      const user = userEvent.setup();
      render(<MetricsDashboard {...defaultProps} />, { wrapper: createWrapper() });

      const reportButton = screen.getByRole('button', { name: /generate report/i });
      await user.click(reportButton);

      expect(screen.getByText('Generating PDF report...')).toBeInTheDocument();
    });
  });

  describe('Filtering and Search', () => {
    it('should filter agents by specialization', async () => {
      const user = userEvent.setup();
      render(<MetricsDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Sarah Williams')).toBeInTheDocument();
      });

      const tierFilter = screen.getByRole('combobox', { name: /filter by tier/i });
      await user.selectOptions(tierFilter, 'enterprise');

      expect(screen.getByText('Emily Chen')).toBeInTheDocument();
      expect(screen.queryByText('Sarah Williams')).not.toBeInTheDocument();
    });

    it('should search agents by name', async () => {
      const user = userEvent.setup();
      render(<MetricsDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Sarah Williams')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search agents...');
      await user.type(searchInput, 'Emily');

      expect(screen.getByText('Emily Chen')).toBeInTheDocument();
      expect(screen.queryByText('Sarah Williams')).not.toBeInTheDocument();
      expect(screen.queryByText('Mike Johnson')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle metrics loading errors gracefully', async () => {
      mockFetchSystemMetrics.mockRejectedValue(new Error('API Error'));

      render(<MetricsDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Error loading metrics. Please try again.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should retry failed metrics loading', async () => {
      const user = userEvent.setup();
      mockFetchSystemMetrics
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce(mockSystemMetrics);

      render(<MetricsDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Error loading metrics. Please try again.')).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('156')).toBeInTheDocument();
      });
    });

    it('should handle partial data loading', async () => {
      mockFetchAgentMetrics.mockResolvedValue([]);
      mockFetchSystemMetrics.mockResolvedValue(mockSystemMetrics);

      render(<MetricsDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('156')).toBeInTheDocument(); // System metrics loaded
        expect(screen.getByText('No agent data available')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      render(<MetricsDashboard {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByRole('main', { name: /metrics dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /system overview/i })).toBeInTheDocument();
      expect(screen.getByRole('table', { name: /agent performance/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation for interactive elements', async () => {
      const user = userEvent.setup();
      render(<MetricsDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /response time/i })).toBeInTheDocument();
      });

      const sortButton = screen.getByRole('button', { name: /response time/i });
      sortButton.focus();
      
      await user.keyboard('{Enter}');
      expect(sortButton).toHaveAttribute('aria-sort', 'ascending');
    });

    it('should announce metric updates to screen readers', async () => {
      render(<MetricsDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('Metrics updated');
      });
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const manyAgents = Array.from({ length: 100 }, (_, i) => ({
        ...mockAgentMetrics[0],
        agent_id: `agent-${i}`,
        agent_name: `Agent ${i}`,
      }));

      mockFetchAgentMetrics.mockResolvedValue(manyAgents);

      const startTime = performance.now();
      render(<MetricsDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Agent 0')).toBeInTheDocument();
      });

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(1000); // Should render in less than 1 second
    });

    it('should virtualize large agent tables', async () => {
      const manyAgents = Array.from({ length: 500 }, (_, i) => ({
        ...mockAgentMetrics[0],
        agent_id: `agent-${i}`,
        agent_name: `Agent ${i}`,
      }));

      mockFetchAgentMetrics.mockResolvedValue(manyAgents);

      render(<MetricsDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Should only render visible rows, not all 500
        const visibleRows = screen.getAllByTestId('agent-row');
        expect(visibleRows.length).toBeLessThan(50);
      });
    });

    it('should debounce search and filter operations', async () => {
      const user = userEvent.setup();
      render(<MetricsDashboard {...defaultProps} />, { wrapper: createWrapper() });

      const searchInput = screen.getByPlaceholderText('Search agents...');
      await user.type(searchInput, 'Emily', { delay: 50 });

      // Should debounce and not filter on each keystroke
      await waitFor(() => {
        expect(searchInput).toHaveValue('Emily');
      }, { timeout: 1000 });
    });
  });

  describe('Mobile Responsiveness', () => {
    beforeEach(() => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });
    });

    it('should adapt layout for mobile screens', async () => {
      render(<MetricsDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
      });
    });

    it('should show collapsed agent table on mobile', async () => {
      render(<MetricsDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /show agent details/i })).toBeInTheDocument();
      });
    });
  });
});