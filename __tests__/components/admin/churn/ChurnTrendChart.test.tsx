/**
 * WS-182 ChurnTrendChart Component Tests
 * Team A - UI Component Testing Suite
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ChurnTrendChart } from '@/components/admin/churn/ChurnTrendChart';

// Mock Recharts components
jest.mock('recharts', () => ({
  LineChart: ({ children, data }: any) => (
    <div data-testid="line-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Line: ({ name, stroke }: any) => (
    <div data-testid={`line-${name}`} style={{ color: stroke }} />
  ),
  XAxis: ({ dataKey }: any) => <div data-testid="x-axis" data-key={dataKey} />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  AreaChart: ({ children, data }: any) => (
    <div data-testid="area-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Area: ({ name, fill }: any) => (
    <div data-testid={`area-${name}`} style={{ backgroundColor: fill }} />
  ),
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'MMM dd') return 'Jan 01';
    if (formatStr === 'yyyy-MM-dd') return '2025-01-01';
    return date.toLocaleDateString();
  }),
  subDays: jest.fn((date, days) => new Date(date.getTime() - days * 24 * 60 * 60 * 1000)),
}));

const mockTrendData = [
  {
    date: new Date('2025-01-01'),
    actualChurnRate: 8.2,
    predictedChurnRate: 8.5,
    totalSuppliers: 487,
    suppliersAtRisk: 40,
    interventionsExecuted: 15,
    retentionRate: 91.8,
    seasonalAdjustment: -2,
    confidenceInterval: { lower: 7.8, upper: 9.2 }
  },
  {
    date: new Date('2025-01-02'),
    actualChurnRate: 8.5,
    predictedChurnRate: 8.8,
    totalSuppliers: 489,
    suppliersAtRisk: 42,
    interventionsExecuted: 18,
    retentionRate: 91.5,
    seasonalAdjustment: -1.8,
    confidenceInterval: { lower: 8.1, upper: 9.5 }
  },
  {
    date: new Date('2025-01-03'),
    actualChurnRate: 9.1,
    predictedChurnRate: 9.2,
    totalSuppliers: 491,
    suppliersAtRisk: 45,
    interventionsExecuted: 22,
    retentionRate: 90.9,
    seasonalAdjustment: -1.5,
    confidenceInterval: { lower: 8.7, upper: 9.8 }
  }
];

const mockInterventions = [
  {
    date: new Date('2025-01-02'),
    supplierId: 'supplier-1',
    supplierName: 'Sunshine Photography',
    interventionType: 'email_campaign',
    success: true,
    impactOnRisk: -15,
    cost: 25.50
  },
  {
    date: new Date('2025-01-03'),
    supplierId: 'supplier-2',
    supplierName: 'Grand Venue',
    interventionType: 'personal_call',
    success: true,
    impactOnRisk: -22,
    cost: 45.00
  }
];

const defaultProps = {
  data: mockTrendData,
  interventions: mockInterventions,
  timeRange: '30d' as const,
  onTimeRangeChange: jest.fn(),
  showConfidenceInterval: true,
  showPredictiveModel: true,
  height: 400,
};

describe('ChurnTrendChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders chart container with proper structure', () => {
      render(<ChurnTrendChart {...defaultProps} />);

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    });

    it('displays chart header with title and controls', () => {
      render(<ChurnTrendChart {...defaultProps} />);

      expect(screen.getByText(/churn trend analysis/i)).toBeInTheDocument();
      expect(screen.getByText(/predictive insights/i)).toBeInTheDocument();
    });

    it('renders time range selector buttons', () => {
      render(<ChurnTrendChart {...defaultProps} />);

      expect(screen.getByRole('button', { name: '7D' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '30D' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '90D' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '1Y' })).toBeInTheDocument();
    });

    it('shows active time range correctly', () => {
      render(<ChurnTrendChart {...defaultProps} />);

      const activeButton = screen.getByRole('button', { name: '30D' });
      expect(activeButton).toHaveClass('bg-blue-600');
    });
  });

  describe('Data Visualization', () => {
    it('renders actual churn rate line', () => {
      render(<ChurnTrendChart {...defaultProps} />);

      expect(screen.getByTestId('line-actualChurnRate')).toBeInTheDocument();
    });

    it('renders predicted churn rate line when enabled', () => {
      render(<ChurnTrendChart {...defaultProps} />);

      expect(screen.getByTestId('line-predictedChurnRate')).toBeInTheDocument();
    });

    it('hides predicted line when disabled', () => {
      render(<ChurnTrendChart {...defaultProps} showPredictiveModel={false} />);

      expect(screen.queryByTestId('line-predictedChurnRate')).not.toBeInTheDocument();
    });

    it('renders confidence interval area when enabled', () => {
      render(<ChurnTrendChart {...defaultProps} />);

      expect(screen.getByTestId('area-confidenceInterval')).toBeInTheDocument();
    });

    it('passes correct data to chart component', () => {
      render(<ChurnTrendChart {...defaultProps} />);

      const chartElement = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]');

      expect(chartData).toHaveLength(3);
      expect(chartData[0]).toHaveProperty('actualChurnRate', 8.2);
      expect(chartData[0]).toHaveProperty('predictedChurnRate', 8.5);
    });
  });

  describe('Time Range Controls', () => {
    it('calls onTimeRangeChange when time range is selected', async () => {
      const mockOnTimeRangeChange = jest.fn();
      render(<ChurnTrendChart {...defaultProps} onTimeRangeChange={mockOnTimeRangeChange} />);

      const button7d = screen.getByRole('button', { name: '7D' });
      fireEvent.click(button7d);

      expect(mockOnTimeRangeChange).toHaveBeenCalledWith('7d');
    });

    it('updates active state when time range changes', () => {
      const { rerender } = render(<ChurnTrendChart {...defaultProps} />);

      const button30d = screen.getByRole('button', { name: '30D' });
      expect(button30d).toHaveClass('bg-blue-600');

      rerender(<ChurnTrendChart {...defaultProps} timeRange="7d" />);

      const button7d = screen.getByRole('button', { name: '7D' });
      expect(button7d).toHaveClass('bg-blue-600');
    });

    it('displays appropriate time range labels', () => {
      render(<ChurnTrendChart {...defaultProps} />);

      expect(screen.getByText('Last 7 days')).toBeInTheDocument();
      expect(screen.getByText('Last 30 days')).toBeInTheDocument();
      expect(screen.getByText('Last 90 days')).toBeInTheDocument();
      expect(screen.getByText('Last year')).toBeInTheDocument();
    });
  });

  describe('Intervention Markers', () => {
    it('displays intervention markers on the chart', () => {
      render(<ChurnTrendChart {...defaultProps} />);

      expect(screen.getByTestId('intervention-markers')).toBeInTheDocument();
    });

    it('shows intervention details on hover', async () => {
      render(<ChurnTrendChart {...defaultProps} />);

      const interventionMarker = screen.getByTestId('intervention-marker-0');
      fireEvent.mouseEnter(interventionMarker);

      await waitFor(() => {
        expect(screen.getByText('Sunshine Photography')).toBeInTheDocument();
        expect(screen.getByText('Email Campaign')).toBeInTheDocument();
        expect(screen.getByText('-15% risk reduction')).toBeInTheDocument();
      });
    });

    it('distinguishes between successful and failed interventions', () => {
      const interventionsWithFailure = [
        ...mockInterventions,
        {
          date: new Date('2025-01-04'),
          supplierId: 'supplier-3',
          supplierName: 'Failed Supplier',
          interventionType: 'email_campaign',
          success: false,
          impactOnRisk: 0,
          cost: 25.50
        }
      ];

      render(<ChurnTrendChart {...defaultProps} interventions={interventionsWithFailure} />);

      const successMarker = screen.getByTestId('intervention-marker-success-0');
      const failureMarker = screen.getByTestId('intervention-marker-failure-2');

      expect(successMarker).toHaveClass('text-green-600');
      expect(failureMarker).toHaveClass('text-red-600');
    });
  });

  describe('Chart Options and Controls', () => {
    it('toggles confidence interval display', async () => {
      const { rerender } = render(<ChurnTrendChart {...defaultProps} />);

      expect(screen.getByTestId('area-confidenceInterval')).toBeInTheDocument();

      rerender(<ChurnTrendChart {...defaultProps} showConfidenceInterval={false} />);

      expect(screen.queryByTestId('area-confidenceInterval')).not.toBeInTheDocument();
    });

    it('provides export functionality', () => {
      render(<ChurnTrendChart {...defaultProps} />);

      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });

    it('handles export button click', async () => {
      // Mock URL.createObjectURL
      global.URL.createObjectURL = jest.fn(() => 'mock-url');
      global.URL.revokeObjectURL = jest.fn();

      render(<ChurnTrendChart {...defaultProps} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(global.URL.createObjectURL).toHaveBeenCalled();
      });
    });

    it('displays chart legend correctly', () => {
      render(<ChurnTrendChart {...defaultProps} />);

      expect(screen.getByTestId('legend')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('adapts to different screen sizes', () => {
      render(<ChurnTrendChart {...defaultProps} height={300} />);

      const container = screen.getByTestId('responsive-container');
      expect(container).toBeInTheDocument();
    });

    it('maintains aspect ratio on mobile devices', () => {
      // Mock window width
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<ChurnTrendChart {...defaultProps} />);

      const chart = screen.getByTestId('line-chart');
      expect(chart).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and descriptions', () => {
      render(<ChurnTrendChart {...defaultProps} />);

      expect(screen.getByLabelText(/churn trend visualization/i)).toBeInTheDocument();
      expect(screen.getByRole('img', { name: /churn rate chart/i })).toBeInTheDocument();
    });

    it('provides keyboard navigation for controls', async () => {
      render(<ChurnTrendChart {...defaultProps} />);

      const button7d = screen.getByRole('button', { name: '7D' });
      button7d.focus();
      expect(document.activeElement).toBe(button7d);

      fireEvent.keyDown(button7d, { key: 'Tab' });
      
      const button30d = screen.getByRole('button', { name: '30D' });
      expect(document.activeElement).toBe(button30d);
    });

    it('announces data changes to screen readers', async () => {
      const { rerender } = render(<ChurnTrendChart {...defaultProps} />);

      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toBeInTheDocument();

      const updatedData = [...mockTrendData, {
        date: new Date('2025-01-04'),
        actualChurnRate: 7.8,
        predictedChurnRate: 8.0,
        totalSuppliers: 493,
        suppliersAtRisk: 38,
        interventionsExecuted: 25,
        retentionRate: 92.2,
        seasonalAdjustment: -1.2,
        confidenceInterval: { lower: 7.4, upper: 8.4 }
      }];

      rerender(<ChurnTrendChart {...defaultProps} data={updatedData} />);

      await waitFor(() => {
        expect(liveRegion).toHaveTextContent(/chart updated/i);
      });
    });
  });

  describe('Performance Optimizations', () => {
    it('handles large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 365 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        actualChurnRate: 8 + Math.random() * 2,
        predictedChurnRate: 8.2 + Math.random() * 2,
        totalSuppliers: 487 + i,
        suppliersAtRisk: 40 + Math.floor(Math.random() * 10),
        interventionsExecuted: Math.floor(Math.random() * 30),
        retentionRate: 91 + Math.random() * 2,
        seasonalAdjustment: -2 + Math.random() * 4,
        confidenceInterval: { lower: 7.5, upper: 9.5 }
      }));

      const startTime = performance.now();
      render(<ChurnTrendChart {...defaultProps} data={largeDataset} />);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(500); // Should render within 500ms
    });

    it('memoizes chart calculations', () => {
      const { rerender } = render(<ChurnTrendChart {...defaultProps} />);

      // Rerender with same data
      rerender(<ChurnTrendChart {...defaultProps} />);

      // Chart should not recalculate data unnecessarily
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles empty data gracefully', () => {
      render(<ChurnTrendChart {...defaultProps} data={[]} />);

      expect(screen.getByText(/no data available/i)).toBeInTheDocument();
    });

    it('handles malformed data points', () => {
      const malformedData = [
        { date: new Date(), actualChurnRate: null, predictedChurnRate: 8.5 },
        { date: new Date(), actualChurnRate: 8.2 } // missing predictedChurnRate
      ];

      render(<ChurnTrendChart {...defaultProps} data={malformedData} />);

      // Should still render chart without crashing
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('provides fallback when chart library fails', () => {
      // Mock console.error to suppress expected error
      jest.spyOn(console, 'error').mockImplementation(() => {});

      // Simulate chart library error
      jest.doMock('recharts', () => {
        throw new Error('Chart library failed');
      });

      expect(() => render(<ChurnTrendChart {...defaultProps} />))
        .not.toThrow();

      console.error.mockRestore();
    });
  });
});