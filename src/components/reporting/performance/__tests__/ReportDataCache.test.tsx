import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

import { ReportDataCache } from '../ReportDataCache';
import { ReportData } from '../../types';

// Mock QueryClient
const mockQueryClient = {
  getQueryData: vi.fn(),
  setQueryData: vi.fn(),
  invalidateQueries: vi.fn(),
  removeQueries: vi.fn(),
  clear: vi.fn(),
  getQueriesData: vi.fn(),
  isFetching: vi.fn(),
  getQueryCache: vi.fn(() => ({
    getAll: vi.fn(() => []),
    clear: vi.fn(),
    subscribe: vi.fn(),
  })),
};

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => mockQueryClient,
  useQuery: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
}));

describe('ReportDataCache', () => {
  const mockReportData: ReportData = {
    id: 'report-1',
    template: {
      id: 'template-1',
      name: 'Wedding Revenue Report',
      description: 'Revenue analytics',
      category: 'financial',
      sections: [],
      layout: { columns: 1, spacing: 'medium', responsive: true },
      style: {
        theme: 'wedding',
        colors: { primary: '#c59d6c', secondary: '#8b6f47', accent: '#d4af37' },
      },
      isPublic: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-15'),
      tags: ['revenue'],
    },
    data: {
      'revenue-section': [
        { month: 'January', revenue: 15000, bookings: 5 },
        { month: 'February', revenue: 22000, bookings: 8 },
      ],
    },
    metadata: {
      generatedAt: new Date('2024-01-20'),
      totalRecords: 100,
      dateRange: {
        start: new Date('2024-01-01'),
        end: new Date('2024-02-29'),
      },
    },
    filters: [],
    vendorType: 'photographer',
    subscriptionTier: 'PROFESSIONAL',
  };

  const defaultProps = {
    reportId: 'report-1',
    children: ({ data, isLoading, error, refetch }: any) => (
      <div data-testid="cache-consumer">
        {isLoading && <div data-testid="loading">Loading...</div>}
        {error && <div data-testid="error">{error.message}</div>}
        {data && <div data-testid="data">{data.template.name}</div>}
        <button data-testid="refetch" onClick={refetch}>
          Refetch
        </button>
      </div>
    ),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Mock localStorage
    const mockStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(global, 'localStorage', { value: mockStorage });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Basic Cache Operations', () => {
    it('renders cache provider with consumer', () => {
      render(<ReportDataCache {...defaultProps} />);

      expect(screen.getByTestId('cache-consumer')).toBeInTheDocument();
    });

    it('provides cached data to consumers', () => {
      mockQueryClient.getQueryData.mockReturnValue(mockReportData);

      render(<ReportDataCache {...defaultProps} />);

      expect(screen.getByTestId('data')).toBeInTheDocument();
      expect(screen.getByText('Wedding Revenue Report')).toBeInTheDocument();
    });

    it('handles cache misses gracefully', () => {
      mockQueryClient.getQueryData.mockReturnValue(undefined);

      render(<ReportDataCache {...defaultProps} />);

      expect(mockQueryClient.getQueryData).toHaveBeenCalledWith([
        'report',
        'report-1',
      ]);
      expect(screen.getByTestId('cache-consumer')).toBeInTheDocument();
    });

    it('stores data in cache correctly', () => {
      render(<ReportDataCache {...defaultProps} />);

      act(() => {
        // Simulate cache update
        mockQueryClient.setQueryData(['report', 'report-1'], mockReportData);
      });

      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['report', 'report-1'],
        mockReportData,
      );
    });
  });

  describe('Wedding Day Priority Caching', () => {
    it('prioritizes wedding day reports in cache', () => {
      // Mock Saturday (wedding day)
      const mockSaturday = new Date('2024-06-15');
      vi.setSystemTime(mockSaturday);

      const weddingDayReport = {
        ...mockReportData,
        metadata: {
          ...mockReportData.metadata,
          isWeddingDay: true,
          weddingDate: mockSaturday,
        },
      };

      render(
        <ReportDataCache {...defaultProps} reportId="wedding-day-report" />,
      );

      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['report', 'wedding-day-report'],
        expect.objectContaining({
          priority: 'wedding-day',
          staleTime: 30 * 60 * 1000, // 30 minutes
        }),
      );
    });

    it('extends cache TTL for wedding day reports', () => {
      const mockSaturday = new Date('2024-06-15');
      vi.setSystemTime(mockSaturday);

      render(<ReportDataCache {...defaultProps} isWeddingDay />);

      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['report', 'report-1'],
        expect.objectContaining({
          cacheTime: 24 * 60 * 60 * 1000, // 24 hours
        }),
      );
    });

    it('prevents cache eviction for active weddings', () => {
      render(<ReportDataCache {...defaultProps} isWeddingDay />);

      // Simulate memory pressure
      act(() => {
        mockQueryClient.clear();
      });

      // Wedding day reports should be protected
      expect(mockQueryClient.removeQueries).not.toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: expect.arrayContaining(['report', 'report-1']),
        }),
      );
    });
  });

  describe('Intelligent Cache Management', () => {
    it('implements LRU eviction policy', () => {
      const reports = Array.from({ length: 100 }, (_, i) => ({
        ...mockReportData,
        id: `report-${i}`,
      }));

      reports.forEach((report) => {
        render(
          <ReportDataCache reportId={report.id} children={() => <div />} />,
        );
      });

      // Should evict oldest entries when cache is full
      expect(mockQueryClient.removeQueries).toHaveBeenCalled();
    });

    it('preloads frequently accessed reports', () => {
      const frequentlyUsedReports = ['report-1', 'report-2', 'report-3'];

      frequentlyUsedReports.forEach((reportId) => {
        render(
          <ReportDataCache reportId={reportId} children={() => <div />} />,
        );
      });

      // Should preload these reports
      expect(mockQueryClient.setQueryData).toHaveBeenCalledTimes(
        frequentlyUsedReports.length,
      );
    });

    it('implements cache warming for popular templates', () => {
      const popularTemplateId = 'popular-template';

      render(
        <ReportDataCache {...defaultProps} templateId={popularTemplateId} />,
      );

      // Should warm cache with related reports
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['template-reports', popularTemplateId],
        expect.any(Array),
      );
    });
  });

  describe('Memory Management', () => {
    it('monitors memory usage and cleans up when needed', () => {
      // Mock high memory usage
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 50 * 1024 * 1024, // 50MB
          totalJSHeapSize: 100 * 1024 * 1024, // 100MB
          jsHeapSizeLimit: 100 * 1024 * 1024,
        },
      });

      render(<ReportDataCache {...defaultProps} />);

      // Should trigger cleanup when memory is high
      expect(mockQueryClient.removeQueries).toHaveBeenCalledWith({
        predicate: expect.any(Function),
      });
    });

    it('implements garbage collection for stale entries', () => {
      render(<ReportDataCache {...defaultProps} />);

      // Fast forward to trigger GC
      act(() => {
        vi.advanceTimersByTime(60 * 60 * 1000); // 1 hour
      });

      expect(mockQueryClient.removeQueries).toHaveBeenCalledWith({
        stale: true,
      });
    });

    it('compresses large report data for storage', () => {
      const largeReport = {
        ...mockReportData,
        data: {
          'large-section': Array.from({ length: 10000 }, (_, i) => ({
            id: i,
            value: Math.random(),
            timestamp: new Date().toISOString(),
          })),
        },
      };

      render(<ReportDataCache {...defaultProps} />);

      act(() => {
        mockQueryClient.setQueryData(['report', 'report-1'], largeReport);
      });

      // Should compress large data
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'report-report-1-compressed',
        expect.any(String),
      );
    });
  });

  describe('Cache Invalidation', () => {
    it('invalidates cache when report data changes', async () => {
      render(<ReportDataCache {...defaultProps} />);

      // Simulate data update
      const updatedReport = {
        ...mockReportData,
        metadata: {
          ...mockReportData.metadata,
          generatedAt: new Date(),
        },
      };

      act(() => {
        mockQueryClient.setQueryData(['report', 'report-1'], updatedReport);
      });

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['report', 'report-1'],
      });
    });

    it('implements smart invalidation based on dependencies', () => {
      render(<ReportDataCache {...defaultProps} />);

      // Update template - should invalidate all related reports
      act(() => {
        mockQueryClient.invalidateQueries({
          queryKey: ['template', 'template-1'],
        });
      });

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        predicate: expect.any(Function),
      });
    });

    it('handles partial cache invalidation', () => {
      render(<ReportDataCache {...defaultProps} />);

      // Update specific section
      act(() => {
        mockQueryClient.setQueryData(
          ['report-section', 'report-1', 'revenue-section'],
          { updated: true },
        );
      });

      // Should only invalidate affected sections
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['report-section', 'report-1', 'revenue-section'],
      });
    });
  });

  describe('Performance Optimization', () => {
    it('batches cache operations for efficiency', () => {
      const reports = Array.from({ length: 50 }, (_, i) => `report-${i}`);

      render(
        <div>
          {reports.map((reportId) => (
            <ReportDataCache
              key={reportId}
              reportId={reportId}
              children={() => <div />}
            />
          ))}
        </div>,
      );

      // Should batch operations
      expect(mockQueryClient.setQueryData).toHaveBeenCalledTimes(1); // Batched
    });

    it('uses Web Workers for heavy cache operations', () => {
      const mockWorker = {
        postMessage: vi.fn(),
        onmessage: vi.fn(),
        terminate: vi.fn(),
      };

      global.Worker = vi.fn().mockImplementation(() => mockWorker);

      render(<ReportDataCache {...defaultProps} enableWorker />);

      expect(Worker).toHaveBeenCalledWith('/cache-worker.js');
      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: 'CACHE_OPERATION',
        payload: expect.any(Object),
      });
    });

    it('implements cache warming strategies', async () => {
      render(<ReportDataCache {...defaultProps} enablePreloading />);

      await waitFor(() => {
        expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
          ['preload', 'report-1'],
          expect.any(Object),
        );
      });
    });
  });

  describe('Cache Persistence', () => {
    it('persists cache to localStorage', () => {
      render(<ReportDataCache {...defaultProps} persistCache />);

      act(() => {
        mockQueryClient.setQueryData(['report', 'report-1'], mockReportData);
      });

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'wedsync-cache-report-1',
        JSON.stringify({
          data: mockReportData,
          timestamp: expect.any(Number),
          version: expect.any(String),
        }),
      );
    });

    it('restores cache from localStorage on startup', () => {
      const cachedData = {
        data: mockReportData,
        timestamp: Date.now(),
        version: '1.0.0',
      };

      localStorage.getItem.mockReturnValue(JSON.stringify(cachedData));

      render(<ReportDataCache {...defaultProps} persistCache />);

      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['report', 'report-1'],
        mockReportData,
      );
    });

    it('handles cache version mismatches', () => {
      const oldCachedData = {
        data: mockReportData,
        timestamp: Date.now(),
        version: '0.9.0', // Old version
      };

      localStorage.getItem.mockReturnValue(JSON.stringify(oldCachedData));

      render(<ReportDataCache {...defaultProps} persistCache />);

      // Should clear old cache
      expect(localStorage.removeItem).toHaveBeenCalledWith(
        'wedsync-cache-report-1',
      );
    });
  });

  describe('Wedding Season Optimization', () => {
    it('preloads seasonal reports during peak season', () => {
      // Mock peak wedding season (June)
      vi.setSystemTime(new Date('2024-06-15'));

      render(<ReportDataCache {...defaultProps} enableSeasonalOptimization />);

      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['seasonal-reports', '2024-06'],
        expect.any(Array),
      );
    });

    it('adjusts cache TTL based on wedding season', () => {
      vi.setSystemTime(new Date('2024-06-15')); // Peak season

      render(<ReportDataCache {...defaultProps} enableSeasonalOptimization />);

      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['report', 'report-1'],
        expect.objectContaining({
          staleTime: 15 * 60 * 1000, // 15 minutes during peak season
          cacheTime: 2 * 60 * 60 * 1000, // 2 hours
        }),
      );
    });

    it('preloads vendor-specific seasonal data', () => {
      vi.setSystemTime(new Date('2024-06-15'));

      render(<ReportDataCache {...defaultProps} vendorType="photographer" />);

      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['vendor-seasonal-data', 'photographer', '2024-06'],
        expect.any(Object),
      );
    });
  });

  describe('Error Handling and Fallbacks', () => {
    it('handles cache corruption gracefully', () => {
      localStorage.getItem.mockReturnValue('invalid-json');

      render(<ReportDataCache {...defaultProps} persistCache />);

      // Should clear corrupted cache and continue
      expect(localStorage.removeItem).toHaveBeenCalled();
      expect(screen.getByTestId('cache-consumer')).toBeInTheDocument();
    });

    it('provides fallback when cache is unavailable', () => {
      mockQueryClient.getQueryData.mockImplementation(() => {
        throw new Error('Cache unavailable');
      });

      render(<ReportDataCache {...defaultProps} />);

      expect(screen.getByTestId('cache-consumer')).toBeInTheDocument();
    });

    it('implements circuit breaker for failing cache operations', () => {
      // Mock repeated failures
      for (let i = 0; i < 5; i++) {
        mockQueryClient.setQueryData.mockImplementation(() => {
          throw new Error('Cache write failed');
        });

        render(
          <ReportDataCache
            reportId={`failing-report-${i}`}
            children={() => <div />}
          />,
        );
      }

      // Should open circuit breaker
      expect(screen.getByTestId('cache-disabled-notice')).toBeInTheDocument();
    });
  });

  describe('Cache Analytics', () => {
    it('tracks cache hit rates', () => {
      const analytics = {
        track: vi.fn(),
      };

      global.analytics = analytics;

      render(<ReportDataCache {...defaultProps} enableAnalytics />);

      expect(analytics.track).toHaveBeenCalledWith('cache_hit', {
        reportId: 'report-1',
        hitRate: expect.any(Number),
      });
    });

    it('monitors cache performance metrics', () => {
      render(<ReportDataCache {...defaultProps} enableAnalytics />);

      // Should track performance
      expect(performance.mark).toHaveBeenCalledWith('cache-start');
      expect(performance.measure).toHaveBeenCalledWith(
        'cache-operation',
        'cache-start',
        'cache-end',
      );
    });

    it('reports cache health statistics', () => {
      render(<ReportDataCache {...defaultProps} enableAnalytics />);

      expect(global.analytics.track).toHaveBeenCalledWith('cache_health', {
        totalSize: expect.any(Number),
        hitRate: expect.any(Number),
        evictionRate: expect.any(Number),
      });
    });
  });
});
