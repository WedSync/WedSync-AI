/**
 * WS-241 AI Cache Performance Dashboard Tests
 * Comprehensive test suite for cache dashboard functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import CachePerformanceDashboard from '@/components/ai/cache/CachePerformanceDashboard';
import type {
  CacheStats,
  CachePerformance,
  SeasonalData,
} from '@/types/ai-cache';

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock chart library
jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => <div data-testid="chart-line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

const mockCacheStats: CacheStats = {
  overall: {
    hitRate: 85.3,
    monthlySavings: 78.5,
    totalQueries: 1245,
    storageUsed: '245MB',
    cacheEntries: 8932,
    averageResponseTime: 94,
    lastUpdated: new Date().toISOString(),
  },
  byType: [
    {
      type: 'chatbot',
      enabled: true,
      hitRate: 87.2,
      savingsThisMonth: 45.2,
      entries: 3421,
      avgQuality: 4.3,
      responseTimes: {
        cached: 89,
        generated: 2340,
      },
      lastWarmed: new Date().toISOString(),
      topQueries: ['Test query 1', 'Test query 2'],
    },
  ],
  trends: {
    hitRateChange: 2.1,
    savingsChange: 12.3,
    queryVolumeChange: 15.7,
  },
};

const mockPerformance: CachePerformance = {
  averageResponseTime: 94,
  peakResponseTime: 156,
  qualityScore: 4.3,
  metrics: [
    {
      timestamp: new Date().toISOString(),
      hitRate: 85.3,
      responseTime: 94,
      savings: 0.45,
      qualityScore: 4.3,
      queryVolume: 120,
    },
  ],
  topQueries: [
    {
      text: 'What are your wedding photography packages?',
      hitCount: 234,
      avgConfidence: 0.92,
      savings: 105.3,
      cacheType: 'chatbot',
      supplierRelevance: 0.95,
      lastAccessed: new Date().toISOString(),
    },
  ],
};

const mockSeasonalData: SeasonalData = {
  currentSeason: 'peak',
  seasonalMultiplier: 1.6,
  peakMonths: ['May', 'June', 'July', 'August', 'September', 'October'],
  offSeasonMonths: ['January', 'February', 'March', 'December'],
  seasonalTrends: [],
  recommendations: [
    {
      season: 'peak',
      title: 'Increase Cache TTL',
      description: 'Extend cache lifetime during peak season',
      action: 'increase_ttl',
      priority: 'high',
      supplierTypes: ['photographer'],
    },
  ],
};

describe('CachePerformanceDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock successful API responses
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCacheStats),
        });
      }
      if (url.includes('/performance')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPerformance),
        });
      }
      if (url.includes('/seasonal')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSeasonalData),
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({}),
      });
    });
  });

  describe('Basic Rendering', () => {
    test('renders dashboard with loading state initially', () => {
      render(
        <CachePerformanceDashboard
          supplierId="test-supplier-123"
          supplierType="photographer"
        />,
      );

      expect(
        screen.getByText('Loading AI cache performance...'),
      ).toBeInTheDocument();
    });

    test('renders dashboard title and description for photographer', async () => {
      render(
        <CachePerformanceDashboard
          supplierId="test-supplier-123"
          supplierType="photographer"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('AI Cache Performance')).toBeInTheDocument();
        expect(screen.getByText(/photographer business/)).toBeInTheDocument();
      });
    });

    test('renders dashboard title and description for wedding planner', async () => {
      render(
        <CachePerformanceDashboard
          supplierId="test-supplier-123"
          supplierType="wedding_planner"
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByText(/wedding planner business/),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Performance Metrics Display', () => {
    test('displays cache hit rate correctly', async () => {
      render(
        <CachePerformanceDashboard
          supplierId="test-supplier-123"
          supplierType="photographer"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('85.3%')).toBeInTheDocument();
        expect(screen.getByText('Cache Hit Rate')).toBeInTheDocument();
        expect(screen.getByText('Excellent')).toBeInTheDocument();
      });
    });

    test('displays monthly savings with context', async () => {
      render(
        <CachePerformanceDashboard
          supplierId="test-supplier-123"
          supplierType="photographer"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('£78.50')).toBeInTheDocument();
        expect(screen.getByText('Monthly Savings')).toBeInTheDocument();
        expect(screen.getByText(/vs £.*without caching/)).toBeInTheDocument();
      });
    });

    test('displays average response time with performance indicator', async () => {
      render(
        <CachePerformanceDashboard
          supplierId="test-supplier-123"
          supplierType="photographer"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('94ms')).toBeInTheDocument();
        expect(screen.getByText('⚡ Lightning fast')).toBeInTheDocument();
      });
    });

    test('displays storage usage information', async () => {
      render(
        <CachePerformanceDashboard
          supplierId="test-supplier-123"
          supplierType="photographer"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('245MB')).toBeInTheDocument();
        expect(screen.getByText('8,932 entries')).toBeInTheDocument();
      });
    });
  });

  describe('Time Range Selection', () => {
    test('renders time range selector with default week selection', async () => {
      render(
        <CachePerformanceDashboard
          supplierId="test-supplier-123"
          supplierType="photographer"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Today')).toBeInTheDocument();
        expect(screen.getByText('This Week')).toBeInTheDocument();
        expect(screen.getByText('This Month')).toBeInTheDocument();
      });
    });

    test('changes time range when button clicked', async () => {
      render(
        <CachePerformanceDashboard
          supplierId="test-supplier-123"
          supplierType="photographer"
        />,
      );

      await waitFor(() => {
        const todayButton = screen.getByText('Today');
        fireEvent.click(todayButton);
      });

      // Should trigger new API call with different range
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('range=day'),
          expect.any(Object),
        );
      });
    });
  });

  describe('Performance Chart', () => {
    test('renders performance trends chart', async () => {
      render(
        <CachePerformanceDashboard
          supplierId="test-supplier-123"
          supplierType="photographer"
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByText('Cache Performance Trends'),
        ).toBeInTheDocument();
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      });
    });
  });

  describe('Cache Type Performance', () => {
    test('displays cache type performance breakdown', async () => {
      render(
        <CachePerformanceDashboard
          supplierId="test-supplier-123"
          supplierType="photographer"
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByText('Performance by Cache Type'),
        ).toBeInTheDocument();
        expect(screen.getByText('CHATBOT')).toBeInTheDocument();
        expect(screen.getByText('87.2% hit rate')).toBeInTheDocument();
        expect(screen.getByText('£45.20')).toBeInTheDocument();
      });
    });

    test('shows supplier-specific cache insights for photographer', async () => {
      render(
        <CachePerformanceDashboard
          supplierId="test-supplier-123"
          supplierType="photographer"
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByText('Client photo session inquiries'),
        ).toBeInTheDocument();
      });
    });

    test('shows supplier-specific cache insights for wedding planner', async () => {
      render(
        <CachePerformanceDashboard
          supplierId="test-supplier-123"
          supplierType="wedding_planner"
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByText('Vendor coordination questions'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Popular Queries', () => {
    test('displays most cached queries section', async () => {
      render(
        <CachePerformanceDashboard
          supplierId="test-supplier-123"
          supplierType="photographer"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Most Cached Queries')).toBeInTheDocument();
        expect(
          screen.getByText(/Your most frequently cached AI responses/),
        ).toBeInTheDocument();
      });
    });

    test('shows query details with wedding context icons', async () => {
      render(
        <CachePerformanceDashboard
          supplierId="test-supplier-123"
          supplierType="photographer"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('234 hits')).toBeInTheDocument();
        expect(screen.getByText('92% confidence')).toBeInTheDocument();
        expect(screen.getByText('£105.30 saved')).toBeInTheDocument();
      });
    });
  });

  describe('Seasonal Optimization', () => {
    test('displays seasonal optimization section', async () => {
      render(
        <CachePerformanceDashboard
          supplierId="test-supplier-123"
          supplierType="photographer"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Seasonal Optimization')).toBeInTheDocument();
        expect(screen.getByText('Peak Season')).toBeInTheDocument();
        expect(screen.getByText(/1.6x query volume/)).toBeInTheDocument();
      });
    });

    test('shows seasonal recommendations', async () => {
      render(
        <CachePerformanceDashboard
          supplierId="test-supplier-123"
          supplierType="photographer"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Increase Cache TTL')).toBeInTheDocument();
        expect(
          screen.getByText('Extend cache lifetime during peak season'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Optimization Recommendations', () => {
    test('shows optimization recommendations section', async () => {
      render(
        <CachePerformanceDashboard
          supplierId="test-supplier-123"
          supplierType="photographer"
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByText('Optimization Recommendations'),
        ).toBeInTheDocument();
      });
    });

    test('shows excellent performance message when metrics are good', async () => {
      render(
        <CachePerformanceDashboard
          supplierId="test-supplier-123"
          supplierType="photographer"
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByText(/Your cache is performing optimally/),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Configuration Button', () => {
    test('renders configure cache button', async () => {
      render(
        <CachePerformanceDashboard
          supplierId="test-supplier-123"
          supplierType="photographer"
        />,
      );

      await waitFor(() => {
        const configButton = screen.getByText('Configure Cache');
        expect(configButton).toBeInTheDocument();
      });
    });

    test('configure button opens new window when clicked', async () => {
      // Mock window.open
      const mockOpen = jest.fn();
      Object.defineProperty(window, 'open', {
        writable: true,
        value: mockOpen,
      });

      render(
        <CachePerformanceDashboard
          supplierId="test-supplier-123"
          supplierType="photographer"
        />,
      );

      await waitFor(() => {
        const configButton = screen.getByText('Configure Cache');
        fireEvent.click(configButton);
        expect(mockOpen).toHaveBeenCalledWith(
          '/dashboard/ai/cache/config',
          '_blank',
        );
      });
    });
  });

  describe('Error Handling', () => {
    test('handles API error gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'));

      render(
        <CachePerformanceDashboard
          supplierId="test-supplier-123"
          supplierType="photographer"
        />,
      );

      await waitFor(() => {
        // Should still render the component structure
        expect(screen.getByText('AI Cache Performance')).toBeInTheDocument();
      });
    });

    test('handles empty data gracefully', async () => {
      // Helper functions to reduce nesting - REFACTORED TO MEET 4-LEVEL LIMIT
      const createEmptyResponse = () => Promise.resolve(null);
      
      const createMockResponse = () => ({
        ok: true,
        json: createEmptyResponse,
      });

      (global.fetch as jest.Mock).mockImplementation(() =>
        Promise.resolve(createMockResponse())
      );

      render(
        <CachePerformanceDashboard
          supplierId="test-supplier-123"
          supplierType="photographer"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('AI Cache Performance')).toBeInTheDocument();
        // Should show default values
        expect(screen.getByText('0.0%')).toBeInTheDocument();
      });
    });
  });

  describe('Wedding Day Context', () => {
    test('displays wedding industry specific messaging', async () => {
      render(
        <CachePerformanceDashboard
          supplierId="test-supplier-123"
          supplierType="photographer"
        />,
      );

      await waitFor(() => {
        // Should contain wedding-specific terminology
        const dashboardContent = screen
          .getByText(/photographer business/)
          .closest('div');
        expect(dashboardContent).toBeInTheDocument();
      });
    });

    test('shows appropriate query context for different supplier types', async () => {
      const { rerender } = render(
        <CachePerformanceDashboard
          supplierId="test-supplier-123"
          supplierType="venue"
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByText('Availability and pricing queries'),
        ).toBeInTheDocument();
      });

      rerender(
        <CachePerformanceDashboard
          supplierId="test-supplier-123"
          supplierType="catering"
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByText('Menu and dietary inquiries'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels and roles', async () => {
      render(
        <CachePerformanceDashboard
          supplierId="test-supplier-123"
          supplierType="photographer"
        />,
      );

      await waitFor(() => {
        // Check for heading hierarchy
        expect(
          screen.getByRole('heading', { name: /AI Cache Performance/ }),
        ).toBeInTheDocument();
      });
    });

    test('supports keyboard navigation', async () => {
      render(
        <CachePerformanceDashboard
          supplierId="test-supplier-123"
          supplierType="photographer"
        />,
      );

      await waitFor(() => {
        const configButton = screen.getByText('Configure Cache');
        configButton.focus();
        expect(document.activeElement).toBe(configButton);
      });
    });
  });
});
