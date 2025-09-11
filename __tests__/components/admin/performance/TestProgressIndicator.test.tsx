import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TestProgressIndicator } from '@/components/admin/performance/TestProgressIndicator';
import { RunningTest } from '@/types/performance-testing';

const mockRunningTest: RunningTest = {
  id: 'test-1',
  configId: 'config-1',
  name: 'Wedding Season Load Test',
  type: 'load',
  status: 'running',
  startTime: '2024-01-20T10:00:00Z',
  estimatedEndTime: '2024-01-20T10:10:00Z',
  progress: 65,
  currentUsers: 85,
  targetUsers: 100,
  currentMetrics: {
    responseTime: {
      p50: 150,
      p95: 800,
      p99: 1200,
      average: 200,
      min: 50,
      max: 2000,
    },
    throughput: 85.5,
    errorRate: 1.2,
    totalRequests: 5130,
    errorCount: 61,
  },
  thresholdBreaches: [],
};

const mockCompletedTest: RunningTest = {
  ...mockRunningTest,
  id: 'test-2',
  status: 'completed',
  progress: 100,
};

const mockFailedTest: RunningTest = {
  ...mockRunningTest,
  id: 'test-3',
  status: 'failed',
  progress: 80,
  thresholdBreaches: [
    {
      id: 'breach-1',
      metric: 'error_rate',
      threshold: 5,
      actualValue: 8.5,
      timestamp: '2024-01-20T10:05:00Z',
      severity: 'critical',
    },
    {
      id: 'breach-2',
      metric: 'response_time',
      threshold: 2000,
      actualValue: 2500,
      timestamp: '2024-01-20T10:06:00Z',
      severity: 'warning',
    },
  ],
};

describe('TestProgressIndicator', () => {
  it('renders basic test information', () => {
    render(<TestProgressIndicator runningTest={mockRunningTest} />);

    expect(screen.getByText('Wedding Season Load Test')).toBeInTheDocument();
    expect(screen.getByText('LOAD Test')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('displays progress bar for running tests', () => {
    render(<TestProgressIndicator runningTest={mockRunningTest} />);

    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument();
  });

  it('displays concurrent users progress', () => {
    render(<TestProgressIndicator runningTest={mockRunningTest} />);

    expect(screen.getByText('Concurrent Users')).toBeInTheDocument();
    expect(screen.getByText('85 / 100')).toBeInTheDocument();
  });

  it('shows real-time metrics when enabled', () => {
    render(<TestProgressIndicator runningTest={mockRunningTest} showMetrics={true} />);

    expect(screen.getByText('Response Time (P95)')).toBeInTheDocument();
    expect(screen.getByText('800ms')).toBeInTheDocument();
    expect(screen.getByText('Throughput')).toBeInTheDocument();
    expect(screen.getByText('85.5 RPS')).toBeInTheDocument();
    expect(screen.getByText('Error Rate')).toBeInTheDocument();
    expect(screen.getByText('1.20%')).toBeInTheDocument();
    expect(screen.getByText('Total Requests')).toBeInTheDocument();
    expect(screen.getByText('5,130')).toBeInTheDocument();
  });

  it('hides metrics when showMetrics is false', () => {
    render(<TestProgressIndicator runningTest={mockRunningTest} showMetrics={false} />);

    expect(screen.queryByText('Response Time (P95)')).not.toBeInTheDocument();
    expect(screen.queryByText('Throughput')).not.toBeInTheDocument();
  });

  it('displays completed status correctly', () => {
    render(<TestProgressIndicator runningTest={mockCompletedTest} />);

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.queryByText('Progress')).not.toBeInTheDocument();
  });

  it('displays failed status correctly', () => {
    render(<TestProgressIndicator runningTest={mockFailedTest} />);

    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('shows threshold breaches when present', () => {
    render(<TestProgressIndicator runningTest={mockFailedTest} />);

    expect(screen.getByText('Threshold Breaches (2)')).toBeInTheDocument();
    expect(screen.getByText('Error rate')).toBeInTheDocument();
    expect(screen.getByText('8.5 / 5')).toBeInTheDocument();
    expect(screen.getByText('Response time')).toBeInTheDocument();
    expect(screen.getByText('2500 / 2000')).toBeInTheDocument();
  });

  it('renders in compact mode', () => {
    render(<TestProgressIndicator runningTest={mockRunningTest} compact={true} />);

    // Should still show basic info but in a more compact layout
    expect(screen.getByText('Wedding Season Load Test')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument();
  });

  it('shows threshold breach count in compact mode', () => {
    render(<TestProgressIndicator runningTest={mockFailedTest} compact={true} />);

    expect(screen.getByText('2')).toBeInTheDocument(); // Breach count
  });

  it('formats duration correctly', () => {
    // Mock current time to be 5 minutes after start
    const mockDate = new Date('2024-01-20T10:05:00Z');
    vi.setSystemTime(mockDate);

    render(<TestProgressIndicator runningTest={mockRunningTest} />);

    expect(screen.getByText('5:00')).toBeInTheDocument();
  });

  it('highlights high error rate in red', () => {
    const highErrorTest: RunningTest = {
      ...mockRunningTest,
      currentMetrics: {
        ...mockRunningTest.currentMetrics,
        errorRate: 8.5, // Above 5% threshold
      },
    };

    render(<TestProgressIndicator runningTest={highErrorTest} showMetrics={true} />);

    // Error rate should be highlighted in red for high values
    const errorRateElement = screen.getByText('8.50%');
    expect(errorRateElement).toHaveClass('text-error-600');
  });

  it('shows normal error rate color for low values', () => {
    render(<TestProgressIndicator runningTest={mockRunningTest} showMetrics={true} />);

    const errorRateElement = screen.getByText('1.20%');
    expect(errorRateElement).toHaveClass('text-gray-900');
  });

  it('truncates long breach lists', () => {
    const manyBreachesTest: RunningTest = {
      ...mockFailedTest,
      thresholdBreaches: [
        ...mockFailedTest.thresholdBreaches,
        {
          id: 'breach-3',
          metric: 'throughput',
          threshold: 50,
          actualValue: 30,
          timestamp: '2024-01-20T10:07:00Z',
          severity: 'warning',
        },
        {
          id: 'breach-4',
          metric: 'concurrent_users',
          threshold: 100,
          actualValue: 120,
          timestamp: '2024-01-20T10:08:00Z',
          severity: 'critical',
        },
      ],
    };

    render(<TestProgressIndicator runningTest={manyBreachesTest} />);

    expect(screen.getByText('Threshold Breaches (4)')).toBeInTheDocument();
    expect(screen.getByText('+1 more breaches')).toBeInTheDocument();
  });

  it('shows correct status colors for different test types', () => {
    const stressTest: RunningTest = {
      ...mockRunningTest,
      type: 'stress',
    };

    render(<TestProgressIndicator runningTest={stressTest} />);
    expect(screen.getByText('STRESS Test')).toBeInTheDocument();
  });

  it('handles cancelled status', () => {
    const cancelledTest: RunningTest = {
      ...mockRunningTest,
      status: 'cancelled',
    };

    render(<TestProgressIndicator runningTest={cancelledTest} />);
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });
});