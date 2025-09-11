import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import MobileOptimizedChart from '../../components/charts/MobileOptimizedChart';

// Mock recharts components
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children, data }: any) => (
    <div data-testid="line-chart" data-points={data?.length}>
      {children}
    </div>
  ),
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
}));

// Mock intersection observer
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
global.IntersectionObserver = mockIntersectionObserver;

// Mock window.innerWidth for device detection
const mockInnerWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  window.dispatchEvent(new Event('resize'));
};

const sampleData = [
  { date: '2024-01-01', value: 100, category: 'Test' },
  { date: '2024-01-02', value: 200, category: 'Test' },
  { date: '2024-01-03', value: 150, category: 'Test' },
];

describe('MobileOptimizedChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInnerWidth(1024); // Default to desktop
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders chart with basic props', () => {
    render(
      <MobileOptimizedChart title="Test Chart" data={sampleData} lazy={false}>
        <LineChart data={sampleData}>
          <Line dataKey="value" />
          <XAxis dataKey="date" />
          <YAxis />
        </LineChart>
      </MobileOptimizedChart>,
    );

    expect(screen.getByText('Test Chart')).toBeInTheDocument();
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('displays loading state correctly', () => {
    render(
      <MobileOptimizedChart
        title="Loading Chart"
        data={sampleData}
        loading={true}
        lazy={false}
      >
        <LineChart data={sampleData}>
          <Line dataKey="value" />
        </LineChart>
      </MobileOptimizedChart>,
    );

    expect(screen.getByText('Loading chart data...')).toBeInTheDocument();
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
  });

  it('displays error state correctly', () => {
    render(
      <MobileOptimizedChart
        title="Error Chart"
        data={sampleData}
        error="Failed to load data"
        lazy={false}
      >
        <LineChart data={sampleData}>
          <Line dataKey="value" />
        </LineChart>
      </MobileOptimizedChart>,
    );

    expect(screen.getByText('Error Chart - Error')).toBeInTheDocument();
    expect(screen.getByText('Failed to load data')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('displays empty state when no data', () => {
    render(
      <MobileOptimizedChart title="Empty Chart" data={[]} lazy={false}>
        <LineChart data={[]}>
          <Line dataKey="value" />
        </LineChart>
      </MobileOptimizedChart>,
    );

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('adapts to mobile device width', async () => {
    mockInnerWidth(375); // Mobile width

    render(
      <MobileOptimizedChart title="Mobile Chart" data={sampleData} lazy={false}>
        <LineChart data={sampleData}>
          <Line dataKey="value" />
        </LineChart>
      </MobileOptimizedChart>,
    );

    // Mobile should show fewer controls
    expect(screen.queryByLabelText('Zoom Out')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Zoom In')).not.toBeInTheDocument();
  });

  it('adapts to tablet device width', async () => {
    mockInnerWidth(768); // Tablet width

    render(
      <MobileOptimizedChart title="Tablet Chart" data={sampleData} lazy={false}>
        <LineChart data={sampleData}>
          <Line dataKey="value" />
        </LineChart>
      </MobileOptimizedChart>,
    );

    // Should render normally for tablet
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('optimizes data for performance mode', () => {
    const largeData = Array.from({ length: 200 }, (_, i) => ({
      date: `2024-01-${i + 1}`,
      value: Math.random() * 1000,
      category: 'Test',
    }));

    mockInnerWidth(375); // Mobile

    render(
      <MobileOptimizedChart
        title="Performance Chart"
        data={largeData}
        performanceMode="maximum"
        lazy={false}
      >
        <LineChart data={largeData}>
          <Line dataKey="value" />
        </LineChart>
      </MobileOptimizedChart>,
    );

    const chartElement = screen.getByTestId('line-chart');
    const dataPoints = chartElement.getAttribute('data-points');

    // Should reduce data points for mobile performance
    expect(parseInt(dataPoints || '0')).toBeLessThan(200);
  });

  it('handles zoom controls correctly', async () => {
    render(
      <MobileOptimizedChart title="Zoom Chart" data={sampleData} lazy={false}>
        <LineChart data={sampleData}>
          <Line dataKey="value" />
        </LineChart>
      </MobileOptimizedChart>,
    );

    const zoomInButton = screen.getByLabelText('Zoom In');
    const zoomOutButton = screen.getByLabelText('Zoom Out');

    expect(zoomInButton).toBeInTheDocument();
    expect(zoomOutButton).toBeInTheDocument();

    // Test zoom in
    fireEvent.click(zoomInButton);
    await waitFor(() => {
      // Should not be disabled after first click
      expect(zoomInButton).not.toBeDisabled();
    });

    // Test zoom out
    fireEvent.click(zoomOutButton);
    await waitFor(() => {
      expect(zoomOutButton).not.toBeDisabled();
    });
  });

  it('handles fullscreen toggle', async () => {
    render(
      <MobileOptimizedChart
        title="Fullscreen Chart"
        data={sampleData}
        lazy={false}
      >
        <LineChart data={sampleData}>
          <Line dataKey="value" />
        </LineChart>
      </MobileOptimizedChart>,
    );

    const fullscreenButton = screen.getByLabelText('Fullscreen');
    fireEvent.click(fullscreenButton);

    await waitFor(() => {
      const container = screen.getByRole('article'); // Card component
      expect(container).toHaveClass('fixed');
    });
  });

  it('calls onDataExport when export button is clicked', async () => {
    const mockExport = vi.fn();

    render(
      <MobileOptimizedChart
        title="Export Chart"
        data={sampleData}
        onDataExport={mockExport}
        lazy={false}
      >
        <LineChart data={sampleData}>
          <Line dataKey="value" />
        </LineChart>
      </MobileOptimizedChart>,
    );

    const exportButton = screen.getByLabelText('Export');
    fireEvent.click(exportButton);

    expect(mockExport).toHaveBeenCalledWith(sampleData);
  });

  it('calls onRefresh when refresh button is clicked', async () => {
    const mockRefresh = vi.fn();

    render(
      <MobileOptimizedChart
        title="Refresh Chart"
        data={sampleData}
        onRefresh={mockRefresh}
        lazy={false}
      >
        <LineChart data={sampleData}>
          <Line dataKey="value" />
        </LineChart>
      </MobileOptimizedChart>,
    );

    const refreshButton = screen.getByLabelText('Refresh');
    fireEvent.click(refreshButton);

    expect(mockRefresh).toHaveBeenCalled();
  });

  it('handles touch events on mobile', async () => {
    mockInnerWidth(375); // Mobile width

    render(
      <MobileOptimizedChart title="Touch Chart" data={sampleData} lazy={false}>
        <LineChart data={sampleData}>
          <Line dataKey="value" />
        </LineChart>
      </MobileOptimizedChart>,
    );

    const chartContainer = screen.getByTestId(
      'responsive-container',
    ).parentElement;

    // Simulate touch events
    fireEvent.touchStart(chartContainer!, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    await new Promise((resolve) => setTimeout(resolve, 100)); // Short touch

    fireEvent.touchEnd(chartContainer!, {});

    // Should handle touch events without errors
    expect(chartContainer).toBeInTheDocument();
  });

  it('implements lazy loading correctly', () => {
    const { rerender } = render(
      <MobileOptimizedChart title="Lazy Chart" data={sampleData} lazy={true}>
        <LineChart data={sampleData}>
          <Line dataKey="value" />
        </LineChart>
      </MobileOptimizedChart>,
    );

    // Should show lazy loading placeholder
    expect(
      screen.getByText('Chart will load when visible'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
  });

  it('shows performance indicators in development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <MobileOptimizedChart
        title="Dev Chart"
        data={sampleData}
        lazy={false}
        performanceMode="optimized"
        cacheKey="test-cache"
      >
        <LineChart data={sampleData}>
          <Line dataKey="value" />
        </LineChart>
      </MobileOptimizedChart>,
    );

    expect(screen.getByText(/Device:/)).toBeInTheDocument();
    expect(screen.getByText(/Data Points:/)).toBeInTheDocument();
    expect(screen.getByText(/Performance:/)).toBeInTheDocument();
    expect(screen.getByText(/Cache:/)).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('handles different chart types correctly', () => {
    const chartTypes = ['line', 'bar', 'area', 'pie'] as const;

    chartTypes.forEach((type) => {
      render(
        <MobileOptimizedChart
          title={`${type} Chart`}
          data={sampleData}
          chartType={type}
          lazy={false}
        >
          <LineChart data={sampleData}>
            <Line dataKey="value" />
          </LineChart>
        </MobileOptimizedChart>,
      );

      expect(screen.getByText(`${type} Chart`)).toBeInTheDocument();
    });
  });

  it('applies correct CSS classes', () => {
    render(
      <MobileOptimizedChart
        title="Styled Chart"
        data={sampleData}
        className="custom-chart-class"
        lazy={false}
      >
        <LineChart data={sampleData}>
          <Line dataKey="value" />
        </LineChart>
      </MobileOptimizedChart>,
    );

    const container = screen.getByRole('article');
    expect(container).toHaveClass('chart-container');
    expect(container).toHaveClass('custom-chart-class');
  });
});
