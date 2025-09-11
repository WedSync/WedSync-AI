import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

import { ReportingEngine } from '../ReportingEngine';
import { ReportTemplate, ReportData, WeddingVendorType } from '../types';

// Mock dependencies
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  QueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
  })),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

// Mock chart components
vi.mock('../charts/WeddingRevenueChart', () => ({
  WeddingRevenueChart: ({ data, onDataClick }: any) => (
    <div
      data-testid="wedding-revenue-chart"
      onClick={() => onDataClick?.(data[0])}
    >
      Revenue Chart
    </div>
  ),
}));

vi.mock('../charts/BookingHeatmap', () => ({
  BookingHeatmap: ({ data }: any) => (
    <div data-testid="booking-heatmap">Booking Heatmap</div>
  ),
}));

// Mock TanStack Query hook
const mockUseQuery = vi.fn();

describe('ReportingEngine', () => {
  const mockTemplate: ReportTemplate = {
    id: 'test-template',
    name: 'Test Wedding Report',
    description: 'A test wedding report template',
    category: 'financial',
    sections: [
      {
        id: 'revenue-section',
        type: 'chart',
        title: 'Revenue Analysis',
        chartType: 'bar',
        position: 0,
        config: {
          showLegend: true,
          showTooltip: true,
        },
      },
      {
        id: 'bookings-section',
        type: 'chart',
        title: 'Booking Trends',
        chartType: 'line',
        position: 1,
        config: {
          showTrend: true,
        },
      },
    ],
    layout: {
      columns: 2,
      spacing: 'medium',
      responsive: true,
    },
    style: {
      theme: 'wedding',
      colors: {
        primary: '#c59d6c',
        secondary: '#8b6f47',
        accent: '#d4af37',
      },
    },
    isPublic: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
    tags: ['revenue', 'bookings', 'analytics'],
  };

  const mockReportData: ReportData = {
    id: 'test-report-data',
    template: mockTemplate,
    data: {
      'revenue-section': [
        { month: 'January', revenue: 15000, bookings: 5 },
        { month: 'February', revenue: 22000, bookings: 8 },
        { month: 'March', revenue: 18500, bookings: 6 },
      ],
      'bookings-section': [
        { date: '2024-01-01', bookings: 2 },
        { date: '2024-01-15', bookings: 3 },
        { date: '2024-02-01', bookings: 4 },
      ],
    },
    metadata: {
      generatedAt: new Date('2024-01-20'),
      totalRecords: 100,
      dateRange: {
        start: new Date('2024-01-01'),
        end: new Date('2024-03-31'),
      },
    },
    filters: [],
    vendorType: 'photographer' as WeddingVendorType,
    subscriptionTier: 'PROFESSIONAL',
  };

  const defaultProps = {
    template: mockTemplate,
    data: mockReportData,
    onExport: vi.fn(),
    onShare: vi.fn(),
    onTemplateChange: vi.fn(),
    className: 'test-class',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({
      data: mockReportData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Rendering', () => {
    it('renders the reporting engine with template data', () => {
      render(<ReportingEngine {...defaultProps} />);

      expect(screen.getByText('Test Wedding Report')).toBeInTheDocument();
      expect(
        screen.getByText('A test wedding report template'),
      ).toBeInTheDocument();
    });

    it('renders all template sections', () => {
      render(<ReportingEngine {...defaultProps} />);

      expect(screen.getByText('Revenue Analysis')).toBeInTheDocument();
      expect(screen.getByText('Booking Trends')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<ReportingEngine {...defaultProps} />);

      expect(container.firstChild).toHaveClass('test-class');
    });

    it('shows loading state when data is loading', () => {
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      });

      render(<ReportingEngine {...defaultProps} />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('shows error state when there is an error', () => {
      const mockError = new Error('Failed to load report data');
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: mockError,
        refetch: vi.fn(),
      });

      render(<ReportingEngine {...defaultProps} />);

      expect(
        screen.getByText('Failed to load report data'),
      ).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onExport when export button is clicked', async () => {
      render(<ReportingEngine {...defaultProps} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(defaultProps.onExport).toHaveBeenCalledWith(
          mockTemplate,
          mockReportData,
        );
      });
    });

    it('calls onShare when share button is clicked', async () => {
      render(<ReportingEngine {...defaultProps} />);

      const shareButton = screen.getByRole('button', { name: /share/i });
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(defaultProps.onShare).toHaveBeenCalledWith(
          mockTemplate,
          mockReportData,
        );
      });
    });

    it('handles chart interactions', async () => {
      render(<ReportingEngine {...defaultProps} />);

      const chart = screen.getByTestId('wedding-revenue-chart');
      fireEvent.click(chart);

      // Should handle chart click without errors
      expect(chart).toBeInTheDocument();
    });

    it('refreshes data when refresh button is clicked', async () => {
      const mockRefetch = vi.fn();
      mockUseQuery.mockReturnValue({
        data: mockReportData,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ReportingEngine {...defaultProps} />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
      });
    });
  });

  describe('Subscription Tier Enforcement', () => {
    it('shows upgrade notice for FREE tier accessing premium features', () => {
      const freeData = {
        ...mockReportData,
        subscriptionTier: 'FREE' as const,
      };

      render(<ReportingEngine {...defaultProps} data={freeData} />);

      expect(
        screen.getByText(/upgrade to access advanced reporting/i),
      ).toBeInTheDocument();
    });

    it('allows full access for PROFESSIONAL tier', () => {
      render(<ReportingEngine {...defaultProps} />);

      expect(screen.queryByText(/upgrade to access/i)).not.toBeInTheDocument();
      expect(screen.getByTestId('wedding-revenue-chart')).toBeInTheDocument();
    });

    it('shows enterprise features for ENTERPRISE tier', () => {
      const enterpriseData = {
        ...mockReportData,
        subscriptionTier: 'ENTERPRISE' as const,
      };

      render(<ReportingEngine {...defaultProps} data={enterpriseData} />);

      expect(
        screen.getByRole('button', { name: /advanced analytics/i }),
      ).toBeInTheDocument();
    });
  });

  describe('Mobile Responsiveness', () => {
    it('adjusts layout for mobile screens', () => {
      // Mock window.innerWidth
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375, // iPhone SE width
      });

      render(<ReportingEngine {...defaultProps} />);

      // Should render mobile-optimized layout
      expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
    });

    it('shows desktop layout on larger screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      render(<ReportingEngine {...defaultProps} />);

      expect(screen.getByTestId('desktop-layout')).toBeInTheDocument();
    });
  });

  describe('Performance Optimizations', () => {
    it('implements virtualization for large datasets', () => {
      const largeDataset = {
        ...mockReportData,
        data: {
          'revenue-section': Array.from({ length: 10000 }, (_, i) => ({
            month: `Month ${i}`,
            revenue: Math.random() * 50000,
            bookings: Math.floor(Math.random() * 20),
          })),
        },
      };

      render(<ReportingEngine {...defaultProps} data={largeDataset} />);

      // Should use virtual scrolling for performance
      expect(
        screen.getByTestId('virtual-scroll-container'),
      ).toBeInTheDocument();
    });

    it('caches report data for performance', async () => {
      render(<ReportingEngine {...defaultProps} />);

      // Simulate data fetch
      await waitFor(() => {
        expect(mockUseQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            queryKey: ['report-data', mockTemplate.id],
            staleTime: expect.any(Number),
            cacheTime: expect.any(Number),
          }),
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels', () => {
      render(<ReportingEngine {...defaultProps} />);

      expect(screen.getByRole('main')).toHaveAttribute(
        'aria-label',
        'Wedding report dashboard',
      );
      expect(
        screen.getByRole('region', { name: /revenue analysis/i }),
      ).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(<ReportingEngine {...defaultProps} />);

      const exportButton = screen.getByRole('button', { name: /export/i });

      // Should be focusable
      exportButton.focus();
      expect(exportButton).toHaveFocus();

      // Should handle Enter key
      fireEvent.keyDown(exportButton, { key: 'Enter' });
      expect(defaultProps.onExport).toHaveBeenCalled();
    });

    it('provides screen reader announcements for updates', () => {
      render(<ReportingEngine {...defaultProps} />);

      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Wedding Industry Specific Features', () => {
    it('handles Saturday wedding day restrictions', () => {
      // Mock current date to Saturday
      const mockSaturday = new Date('2024-06-15'); // A Saturday
      vi.setSystemTime(mockSaturday);

      render(<ReportingEngine {...defaultProps} />);

      expect(
        screen.getByText(/saturday wedding day mode/i),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export/i })).toBeDisabled();
    });

    it('displays vendor-specific metrics', () => {
      render(<ReportingEngine {...defaultProps} />);

      expect(screen.getByText(/photographer insights/i)).toBeInTheDocument();
    });

    it('shows seasonal wedding trends', () => {
      render(<ReportingEngine {...defaultProps} />);

      expect(screen.getByText(/wedding season analysis/i)).toBeInTheDocument();
    });

    it('formats currency in GBP for UK market', () => {
      render(<ReportingEngine {...defaultProps} />);

      expect(screen.getByText(/£15,000/)).toBeInTheDocument();
      expect(screen.getByText(/£22,000/)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles template validation errors gracefully', () => {
      const invalidTemplate = {
        ...mockTemplate,
        sections: [], // Invalid: no sections
      };

      render(<ReportingEngine {...defaultProps} template={invalidTemplate} />);

      expect(
        screen.getByText(/template must have at least one section/i),
      ).toBeInTheDocument();
    });

    it('recovers from chart rendering errors', () => {
      // Mock chart component to throw error
      vi.mocked(
        require('../charts/WeddingRevenueChart').WeddingRevenueChart,
      ).mockImplementation(() => {
        throw new Error('Chart rendering failed');
      });

      render(<ReportingEngine {...defaultProps} />);

      expect(screen.getByText(/failed to render chart/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /retry/i }),
      ).toBeInTheDocument();
    });

    it('shows fallback UI when data is unavailable', () => {
      const emptyData = {
        ...mockReportData,
        data: {},
      };

      render(<ReportingEngine {...defaultProps} data={emptyData} />);

      expect(screen.getByText(/no data available/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /reload/i }),
      ).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('handles WebSocket updates for live data', async () => {
      render(<ReportingEngine {...defaultProps} enableRealtime />);

      // Mock WebSocket message
      const mockWebSocketEvent = new MessageEvent('message', {
        data: JSON.stringify({
          type: 'data_update',
          data: { revenue: 25000, bookings: 10 },
        }),
      });

      // Simulate WebSocket update
      act(() => {
        global.dispatchEvent(mockWebSocketEvent);
      });

      await waitFor(() => {
        expect(screen.getByText('£25,000')).toBeInTheDocument();
      });
    });

    it('reconnects WebSocket on connection loss', () => {
      const mockWebSocket = vi.fn();
      global.WebSocket = mockWebSocket;

      render(<ReportingEngine {...defaultProps} enableRealtime />);

      // Simulate connection loss and reconnection
      expect(mockWebSocket).toHaveBeenCalledWith(
        expect.stringContaining('ws://'),
      );
    });
  });
});
