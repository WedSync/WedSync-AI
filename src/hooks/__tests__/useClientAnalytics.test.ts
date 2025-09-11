import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useClientAnalytics } from '../useClientAnalytics';

// Mock the cache utility
const mockCache = {
  get: vi.fn(),
  set: vi.fn(),
  clear: vi.fn(),
};

vi.mock('../../lib/utils/cache', () => ({
  cache: mockCache,
}));

// Mock the CSV/JSON export utilities
vi.mock('../../lib/utils/export', () => ({
  exportToCsv: vi.fn(() => Promise.resolve()),
  exportToJson: vi.fn(() => Promise.resolve()),
}));

describe('useClientAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Reset cache mocks
    mockCache.get.mockReturnValue(null);
    mockCache.set.mockReturnValue(undefined);
    mockCache.clear.mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial state correctly', () => {
    const { result } = renderHook(() =>
      useClientAnalytics({ timeRange: '30d', type: 'overview' }),
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(null);
    expect(result.current.data).toBe(null);
    expect(typeof result.current.refreshData).toBe('function');
    expect(typeof result.current.exportData).toBe('function');
  });

  it('generates overview data correctly', async () => {
    const { result } = renderHook(() =>
      useClientAnalytics({ timeRange: '30d', type: 'overview' }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.overview).toBeDefined();
    expect(result.current.data?.overview?.totalClients).toBeTypeOf('number');
    expect(result.current.data?.overview?.activeClients).toBeTypeOf('number');
    expect(result.current.data?.overview?.engagementRate).toBeTypeOf('number');
    expect(result.current.data?.overview?.avgSessionDuration).toBeTypeOf(
      'number',
    );
  });

  it('generates engagement data correctly', async () => {
    const { result } = renderHook(() =>
      useClientAnalytics({ timeRange: '30d', type: 'engagement' }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.engagement).toBeDefined();
    expect(result.current.data?.engagement?.dailyStats).toBeInstanceOf(Array);
    expect(result.current.data?.engagement?.summary).toBeDefined();
    expect(result.current.data?.engagement?.topPages).toBeInstanceOf(Array);
  });

  it('generates feature usage data correctly', async () => {
    const { result } = renderHook(() =>
      useClientAnalytics({ timeRange: '30d', type: 'features' }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.features).toBeDefined();
    expect(result.current.data?.features?.adoptionRates).toBeInstanceOf(Array);
    expect(result.current.data?.features?.correlations).toBeInstanceOf(Array);
    expect(result.current.data?.features?.usagePatterns).toBeInstanceOf(Array);
  });

  it('generates communication data correctly', async () => {
    const { result } = renderHook(() =>
      useClientAnalytics({ timeRange: '30d', type: 'communication' }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.communication).toBeDefined();
    expect(result.current.data?.communication?.channels).toBeDefined();
    expect(
      result.current.data?.communication?.responseDistribution,
    ).toBeInstanceOf(Array);
    expect(result.current.data?.communication?.topPerformers).toBeInstanceOf(
      Array,
    );
  });

  it('generates journey data correctly', async () => {
    const { result } = renderHook(() =>
      useClientAnalytics({ timeRange: '30d', type: 'journey' }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.journey).toBeDefined();
    expect(result.current.data?.journey?.funnelStages).toBeInstanceOf(Array);
    expect(result.current.data?.journey?.cohortAnalysis).toBeInstanceOf(Array);
    expect(result.current.data?.journey?.milestoneEngagement).toBeDefined();
  });

  it('uses cache when available', async () => {
    const cachedData = {
      overview: { totalClients: 150, activeClients: 120 },
    };

    mockCache.get.mockReturnValue(cachedData);

    const { result } = renderHook(() =>
      useClientAnalytics({ timeRange: '30d', type: 'overview' }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockCache.get).toHaveBeenCalledWith('analytics_overview_30d_all');
    expect(result.current.data?.overview?.totalClients).toBe(150);
  });

  it('caches generated data', async () => {
    const { result } = renderHook(() =>
      useClientAnalytics({ timeRange: '30d', type: 'overview' }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockCache.set).toHaveBeenCalledWith(
      'analytics_overview_30d_all',
      expect.any(Object),
      expect.any(Number),
    );
  });

  it('handles supplier-specific data', async () => {
    const supplierId = 'supplier-123';

    const { result } = renderHook(() =>
      useClientAnalytics({
        timeRange: '30d',
        type: 'overview',
        supplierId,
      }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockCache.get).toHaveBeenCalledWith(
      `analytics_overview_30d_${supplierId}`,
    );
    expect(result.current.data).toBeDefined();
  });

  it('refreshes data correctly', async () => {
    const { result } = renderHook(() =>
      useClientAnalytics({ timeRange: '30d', type: 'overview' }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const originalData = result.current.data;

    await act(async () => {
      await result.current.refreshData();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Data should be refreshed (new random values)
    expect(result.current.data).not.toEqual(originalData);
  });

  it('handles different time ranges correctly', async () => {
    const { result: result7d } = renderHook(() =>
      useClientAnalytics({ timeRange: '7d', type: 'engagement' }),
    );

    const { result: result90d } = renderHook(() =>
      useClientAnalytics({ timeRange: '90d', type: 'engagement' }),
    );

    await waitFor(() => {
      expect(result7d.current.loading).toBe(false);
      expect(result90d.current.loading).toBe(false);
    });

    // 7-day data should have 7 daily stats, 90-day should have more
    expect(result7d.current.data?.engagement?.dailyStats).toHaveLength(7);
    expect(result90d.current.data?.engagement?.dailyStats).toHaveLength(90);
  });

  it('generates realistic wedding industry metrics', async () => {
    const { result } = renderHook(() =>
      useClientAnalytics({ timeRange: '30d', type: 'overview' }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const overview = result.current.data?.overview;

    // Check realistic ranges
    expect(overview?.engagementRate).toBeGreaterThan(0);
    expect(overview?.engagementRate).toBeLessThan(100);
    expect(overview?.avgSessionDuration).toBeGreaterThan(60); // At least 1 minute
    expect(overview?.avgSessionDuration).toBeLessThan(3600); // Less than 1 hour
  });

  it('exports data correctly', async () => {
    const { exportToCsv } = await import('../../lib/utils/export');
    const { result } = renderHook(() =>
      useClientAnalytics({ timeRange: '30d', type: 'overview' }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.exportData('csv');
    });

    expect(exportToCsv).toHaveBeenCalledWith(
      expect.any(Object),
      'client-analytics-overview-30d.csv',
    );
  });

  it('handles export errors gracefully', async () => {
    const { exportToCsv } = await import('../../lib/utils/export');
    vi.mocked(exportToCsv).mockRejectedValueOnce(new Error('Export failed'));

    const { result } = renderHook(() =>
      useClientAnalytics({ timeRange: '30d', type: 'overview' }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.exportData('csv');
    });

    // Should handle error gracefully - check error state or console
    expect(result.current.error).toBeNull(); // Hook shouldn't crash
  });

  it('generates consistent data for same parameters', async () => {
    const params = { timeRange: '30d' as const, type: 'overview' as const };

    const { result: result1 } = renderHook(() => useClientAnalytics(params));
    const { result: result2 } = renderHook(() => useClientAnalytics(params));

    await waitFor(() => {
      expect(result1.current.loading).toBe(false);
      expect(result2.current.loading).toBe(false);
    });

    // With caching, should return same data for same parameters
    expect(result1.current.data).toEqual(result2.current.data);
  });

  it('handles wedding-specific metrics in peak season', async () => {
    // Mock date to be in wedding season (May-October)
    const mockDate = new Date('2024-07-15'); // July - peak wedding season
    vi.setSystemTime(mockDate);

    const { result } = renderHook(() =>
      useClientAnalytics({ timeRange: '30d', type: 'overview' }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should include wedding-specific insights during peak season
    const overview = result.current.data?.overview;
    expect(overview?.weddingMetrics).toBeDefined();
    expect(overview?.weddingMetrics?.upcomingWeddings).toBeGreaterThan(0);
  });

  it('handles off-season wedding metrics', async () => {
    // Mock date to be off-season (November-April)
    const mockDate = new Date('2024-01-15'); // January - off season
    vi.setSystemTime(mockDate);

    const { result } = renderHook(() =>
      useClientAnalytics({ timeRange: '30d', type: 'overview' }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should adjust metrics for off-season
    const overview = result.current.data?.overview;
    expect(overview?.weddingMetrics?.upcomingWeddings).toBeLessThan(20); // Lower during off-season
  });

  it('handles cache expiration correctly', async () => {
    // First call
    const { result } = renderHook(() =>
      useClientAnalytics({ timeRange: '30d', type: 'overview' }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Fast-forward time past cache expiration (5 minutes)
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);

    // Refresh should generate new data instead of using cache
    await act(async () => {
      await result.current.refreshData();
    });

    // Should call cache.set again with new data
    expect(mockCache.set).toHaveBeenCalledTimes(2);
  });

  it('generates feature correlations with realistic relationships', async () => {
    const { result } = renderHook(() =>
      useClientAnalytics({ timeRange: '30d', type: 'features' }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const correlations = result.current.data?.features?.correlations;
    expect(correlations).toBeDefined();
    expect(correlations?.length).toBeGreaterThan(0);

    // Check that correlations make business sense
    const pdfFormCorrelation = correlations?.find(
      (c) => c.feature1 === 'PDF Import' && c.feature2 === 'Form Builder',
    );
    expect(pdfFormCorrelation).toBeDefined();
    expect(pdfFormCorrelation?.correlation).toBeGreaterThan(0.5); // Should be strongly correlated
  });

  it('handles concurrent requests correctly', async () => {
    const params = { timeRange: '30d' as const, type: 'overview' as const };

    // Start multiple hooks simultaneously
    const hooks = [
      renderHook(() => useClientAnalytics(params)),
      renderHook(() => useClientAnalytics(params)),
      renderHook(() => useClientAnalytics(params)),
    ];

    // Wait for all to complete
    await Promise.all(
      hooks.map(({ result }) =>
        waitFor(() => expect(result.current.loading).toBe(false)),
      ),
    );

    // All should have the same cached data
    const firstData = hooks[0].result.current.data;
    hooks.forEach(({ result }) => {
      expect(result.current.data).toEqual(firstData);
    });
  });

  it('properly formats cache keys', async () => {
    const { result } = renderHook(() =>
      useClientAnalytics({
        timeRange: '7d',
        type: 'engagement',
        supplierId: 'test-supplier-456',
      }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockCache.get).toHaveBeenCalledWith(
      'analytics_engagement_7d_test-supplier-456',
    );
  });
});
