import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PerformanceTestDashboard } from '@/components/admin/performance/PerformanceTestDashboard';
import { PerformanceTestRun, RunningTest } from '@/types/performance-testing';

// Mock Recharts to avoid canvas issues in tests
vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  ReferenceLine: () => <div data-testid="reference-line" />,
  Legend: () => <div data-testid="legend" />,
  Line: () => <div data-testid="line" />,
  Area: () => <div data-testid="area" />,
}));

// Mock test data
const mockTestRuns: PerformanceTestRun[] = [
  {
    id: 'test-1',
    configId: 'config-1',
    name: 'Wedding Season Load Test',
    type: 'load',
    status: 'completed',
    startTime: '2024-01-20T10:00:00Z',
    endTime: '2024-01-20T10:10:00Z',
    duration: 600,
    environment: 'production',
    tags: ['wedding', 'peak-season'],
    results: {
      responseTime: {
        p50: 150,
        p95: 800,
        p99: 1200,
        average: 200,
        min: 50,
        max: 2000,
      },
      throughput: {
        average: 85.5,
        peak: 120,
        requests: 51300,
      },
      errorRate: 1.2,
      totalRequests: 51300,
      errorCount: 616,
      concurrentUsers: {
        peak: 100,
        average: 85,
      },
    },
    thresholdBreaches: [],
    passed: true,
    cicdInfo: {
      buildId: 'build-123',
      branch: 'main',
      commit: 'abc123',
      triggeredBy: 'ci-system',
    },
  },
  {
    id: 'test-2',
    configId: 'config-2',
    name: 'Vendor Portal Stress Test',
    type: 'stress',
    status: 'completed',
    startTime: '2024-01-20T09:00:00Z',
    endTime: '2024-01-20T09:15:00Z',
    duration: 900,
    environment: 'staging',
    tags: ['vendor', 'portal'],
    results: {
      responseTime: {
        p50: 250,
        p95: 2500,
        p99: 4000,
        average: 350,
        min: 80,
        max: 5000,
      },
      throughput: {
        average: 45.2,
        peak: 65,
        requests: 40680,
      },
      errorRate: 8.5,
      totalRequests: 40680,
      errorCount: 3458,
      concurrentUsers: {
        peak: 300,
        average: 250,
      },
    },
    thresholdBreaches: [
      {
        id: 'breach-1',
        metric: 'error_rate',
        threshold: 5,
        actualValue: 8.5,
        timestamp: '2024-01-20T09:05:00Z',
        severity: 'critical',
      },
    ],
    passed: false,
  },
];

const mockActiveTests: RunningTest[] = [
  {
    id: 'running-1',
    configId: 'config-3',
    name: 'Guest RSVP Spike Test',
    type: 'spike',
    status: 'running',
    startTime: '2024-01-20T11:00:00Z',
    estimatedEndTime: '2024-01-20T11:05:00Z',
    progress: 60,
    currentUsers: 300,
    targetUsers: 500,
    currentMetrics: {
      responseTime: {
        p50: 120,
        p95: 950,
        p99: 1500,
        average: 180,
        min: 45,
        max: 2200,
      },
      throughput: 120.5,
      errorRate: 2.1,
      totalRequests: 14500,
      errorCount: 304,
    },
    thresholdBreaches: [],
  },
];

const mockProps = {
  testRuns: mockTestRuns,
  activeTests: mockActiveTests,
  realTimeUpdates: true,
  onRefresh: vi.fn(),
};

describe('PerformanceTestDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard header and stats', () => {
    render(<PerformanceTestDashboard {...mockProps} />);

    expect(screen.getByText('Performance Testing Dashboard')).toBeInTheDocument();
    expect(screen.getByText(/Monitor and execute performance tests/)).toBeInTheDocument();
    
    // Check stats cards
    expect(screen.getByText('Running Tests')).toBeInTheDocument();
    expect(screen.getByText('Total Tests')).toBeInTheDocument();
    expect(screen.getByText('Pass Rate')).toBeInTheDocument();
    expect(screen.getByText('Breaches')).toBeInTheDocument();
    expect(screen.getByText('Avg P95')).toBeInTheDocument();
    expect(screen.getByText('Avg RPS')).toBeInTheDocument();
  });

  it('displays correct statistics', () => {
    render(<PerformanceTestDashboard {...mockProps} />);

    // Running tests: 1 (from mockActiveTests)
    expect(screen.getByText('1')).toBeInTheDocument();
    
    // Total tests: 2 (from mockTestRuns)
    expect(screen.getByText('2')).toBeInTheDocument();
    
    // Pass rate: 50% (1 passed out of 2)
    expect(screen.getByText('50.0%')).toBeInTheDocument();
    
    // Breaches: 1 (from test-2)
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('displays live updates indicator when enabled', () => {
    render(<PerformanceTestDashboard {...mockProps} />);
    
    expect(screen.getByText('Live Updates')).toBeInTheDocument();
  });

  it('does not display live updates when disabled', () => {
    render(<PerformanceTestDashboard {...mockProps} realTimeUpdates={false} />);
    
    expect(screen.queryByText('Live Updates')).not.toBeInTheDocument();
  });

  it('calls onRefresh when refresh button is clicked', async () => {
    render(<PerformanceTestDashboard {...mockProps} />);
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);
    
    expect(mockProps.onRefresh).toHaveBeenCalledTimes(1);
  });

  it('renders test execution panel', () => {
    render(<PerformanceTestDashboard {...mockProps} />);
    
    expect(screen.getByText('Quick Tests')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /custom test/i })).toBeInTheDocument();
  });

  it('renders running tests when available', () => {
    render(<PerformanceTestDashboard {...mockProps} />);
    
    expect(screen.getByText('Guest RSVP Spike Test')).toBeInTheDocument();
    expect(screen.getByText('Running Tests (1)')).toBeInTheDocument();
  });

  it('displays no running tests message when no active tests', () => {
    render(<PerformanceTestDashboard {...mockProps} activeTests={[]} />);
    
    expect(screen.getByText('No Running Tests')).toBeInTheDocument();
    expect(screen.getByText(/Start a performance test to monitor/)).toBeInTheDocument();
  });

  it('renders performance metrics chart with controls', () => {
    render(<PerformanceTestDashboard {...mockProps} />);
    
    expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
    
    // Check metric selector
    const metricSelect = screen.getByDisplayValue('Response Time');
    expect(metricSelect).toBeInTheDocument();
    
    // Check time range selector
    const timeRangeSelect = screen.getByDisplayValue('Last 7 days');
    expect(timeRangeSelect).toBeInTheDocument();
  });

  it('changes metric type when selector is changed', async () => {
    render(<PerformanceTestDashboard {...mockProps} />);
    
    const metricSelect = screen.getByDisplayValue('Response Time');
    fireEvent.change(metricSelect, { target: { value: 'throughput' } });
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('Throughput')).toBeInTheDocument();
    });
  });

  it('changes time range when selector is changed', async () => {
    render(<PerformanceTestDashboard {...mockProps} />);
    
    const timeRangeSelect = screen.getByDisplayValue('Last 7 days');
    fireEvent.change(timeRangeSelect, { target: { value: '30d' } });
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('Last 30 days')).toBeInTheDocument();
    });
  });

  it('renders test results table', () => {
    render(<PerformanceTestDashboard {...mockProps} />);
    
    expect(screen.getByText('Test Results')).toBeInTheDocument();
    expect(screen.getByText('Wedding Season Load Test')).toBeInTheDocument();
    expect(screen.getByText('Vendor Portal Stress Test')).toBeInTheDocument();
  });

  it('handles empty test runs gracefully', () => {
    render(<PerformanceTestDashboard {...mockProps} testRuns={[]} />);
    
    expect(screen.getByText('0')).toBeInTheDocument(); // Total tests
    expect(screen.getByText('0.0%')).toBeInTheDocument(); // Pass rate
  });

  it('shows loading state when refreshing', async () => {
    const mockOnRefresh = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );
    
    render(<PerformanceTestDashboard {...mockProps} onRefresh={mockOnRefresh} />);
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);
    
    expect(screen.getByText('Refreshing...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });
  });

  it('updates last refresh time after refresh', async () => {
    render(<PerformanceTestDashboard {...mockProps} />);
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    });
  });

  it('renders export buttons in table', () => {
    render(<PerformanceTestDashboard {...mockProps} />);
    
    expect(screen.getByRole('button', { name: /csv/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /json/i })).toBeInTheDocument();
  });

  it('handles pagination controls', () => {
    render(<PerformanceTestDashboard {...mockProps} />);
    
    // Check pagination info
    expect(screen.getByText(/Page 1 of/)).toBeInTheDocument();
    expect(screen.getByText(/Showing/)).toBeInTheDocument();
  });

  it('applies filters correctly', async () => {
    render(<PerformanceTestDashboard {...mockProps} />);
    
    // Open filters
    const filtersButton = screen.getByRole('button', { name: /filters/i });
    fireEvent.click(filtersButton);
    
    await waitFor(() => {
      expect(screen.getByText('All Types')).toBeInTheDocument();
    });
  });
});