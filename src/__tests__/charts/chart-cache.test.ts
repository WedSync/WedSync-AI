import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  ChartDataCache,
  WeddingChartCache,
  useChartCache,
  useWeddingChartCache,
} from '../../lib/charts/chart-cache';
import { renderHook, act } from '@testing-library/react';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock Blob for size calculation
global.Blob = vi.fn().mockImplementation((content) => ({
  size: JSON.stringify(content[0]).length,
}));

describe('ChartDataCache', () => {
  let cache: ChartDataCache;

  beforeEach(() => {
    cache = new ChartDataCache({
      maxSize: 1024 * 1024, // 1MB
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxEntries: 100,
      enableCompression: true,
      persistToDisk: false,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    cache.clear();
    vi.clearAllTimers();
  });

  describe('Basic Cache Operations', () => {
    it('should store and retrieve data', () => {
      const testData = { value: 123, name: 'test' };

      cache.set('test-key', testData);
      const retrieved = cache.get('test-key');

      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent keys', () => {
      const result = cache.get('non-existent');
      expect(result).toBeNull();
    });

    it('should check if key exists', () => {
      cache.set('exists', { data: true });

      expect(cache.has('exists')).toBe(true);
      expect(cache.has('does-not-exist')).toBe(false);
    });

    it('should invalidate specific keys', () => {
      cache.set('to-invalidate', { data: true });
      expect(cache.has('to-invalidate')).toBe(true);

      cache.invalidate('to-invalidate');
      expect(cache.has('to-invalidate')).toBe(false);
    });

    it('should clear all cache entries', () => {
      cache.set('key1', { data: 1 });
      cache.set('key2', { data: 2 });

      cache.clear();

      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
    });
  });

  describe('TTL (Time To Live)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should expire entries after TTL', () => {
      cache.set('expire-test', { data: true }, { ttl: 1000 }); // 1 second TTL

      expect(cache.has('expire-test')).toBe(true);

      vi.advanceTimersByTime(1001); // Advance past TTL

      expect(cache.has('expire-test')).toBe(false);
    });

    it('should use default TTL when not specified', () => {
      cache.set('default-ttl', { data: true });

      vi.advanceTimersByTime(4 * 60 * 1000); // 4 minutes - should still exist
      expect(cache.has('default-ttl')).toBe(true);

      vi.advanceTimersByTime(2 * 60 * 1000); // 6 minutes total - should expire
      expect(cache.has('default-ttl')).toBe(false);
    });
  });

  describe('Cache with Parameters', () => {
    it('should generate different keys for different parameters', () => {
      const data1 = { result: 'data1' };
      const data2 = { result: 'data2' };

      cache.set('chart-data', data1, {
        params: { start: '2024-01-01', end: '2024-01-31' },
      });
      cache.set('chart-data', data2, {
        params: { start: '2024-02-01', end: '2024-02-28' },
      });

      const result1 = cache.get('chart-data', {
        start: '2024-01-01',
        end: '2024-01-31',
      });
      const result2 = cache.get('chart-data', {
        start: '2024-02-01',
        end: '2024-02-28',
      });

      expect(result1).toEqual(data1);
      expect(result2).toEqual(data2);
    });

    it('should return null for mismatched parameters', () => {
      cache.set('param-test', { data: true }, { params: { type: 'bar' } });

      const result = cache.get('param-test', { type: 'line' });
      expect(result).toBeNull();
    });
  });

  describe('Pattern Invalidation', () => {
    it('should invalidate keys matching pattern', () => {
      cache.set('user-123-analytics', { data: 1 });
      cache.set('user-456-analytics', { data: 2 });
      cache.set('system-metrics', { data: 3 });

      const invalidated = cache.invalidatePattern('user-.*-analytics');

      expect(invalidated).toBe(2);
      expect(cache.has('user-123-analytics')).toBe(false);
      expect(cache.has('user-456-analytics')).toBe(false);
      expect(cache.has('system-metrics')).toBe(true);
    });
  });

  describe('Cache Statistics', () => {
    it('should track hit and miss rates', () => {
      cache.set('hit-test', { data: true });

      // Generate hits
      cache.get('hit-test');
      cache.get('hit-test');

      // Generate misses
      cache.get('miss-test');
      cache.get('another-miss');

      const stats = cache.getStats();

      expect(stats.hitCount).toBe(2);
      expect(stats.missCount).toBe(2);
      expect(stats.hitRate).toBe(50); // 50% hit rate
    });

    it('should track cache size and entry count', () => {
      cache.set('entry1', { data: Array(100).fill('test') });
      cache.set('entry2', { data: Array(200).fill('test') });

      const stats = cache.getStats();

      expect(stats.entries).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
    });
  });

  describe('Performance Optimizations', () => {
    it('should evict LRU entries when over limits', () => {
      // Create cache with small limits
      const smallCache = new ChartDataCache({
        maxSize: 1000, // 1KB
        maxEntries: 3,
        defaultTTL: 60000,
      });

      // Fill cache to capacity
      smallCache.set('entry1', { data: Array(100).fill('x') });
      smallCache.set('entry2', { data: Array(100).fill('y') });
      smallCache.set('entry3', { data: Array(100).fill('z') });

      // Access entry1 to make it recently used
      smallCache.get('entry1');

      // Add another entry, should evict LRU (entry2)
      smallCache.set('entry4', { data: Array(100).fill('w') });

      expect(smallCache.has('entry1')).toBe(true); // Recently used
      expect(smallCache.has('entry2')).toBe(false); // Should be evicted
      expect(smallCache.has('entry3')).toBe(true);
      expect(smallCache.has('entry4')).toBe(true); // Just added
    });

    it('should optimize cache periodically', () => {
      vi.useFakeTimers();

      cache.set('old-unused', { data: 1 });
      cache.set('frequently-used', { data: 2 });

      // Make one entry frequently used
      for (let i = 0; i < 5; i++) {
        cache.get('frequently-used');
      }

      // Advance time to make entries old
      vi.advanceTimersByTime(2 * 60 * 60 * 1000); // 2 hours

      cache.optimize();

      // Old, unused entry should be removed
      expect(cache.has('old-unused')).toBe(false);
      expect(cache.has('frequently-used')).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('Device-Specific Caching', () => {
    it('should track device type statistics', () => {
      cache.set('mobile-data', { data: 1 }, { deviceType: 'mobile' });
      cache.set('desktop-data', { data: 2 }, { deviceType: 'desktop' });
      cache.set('tablet-data', { data: 3 }, { deviceType: 'tablet' });

      const deviceStats = cache.getDeviceStats();

      expect(deviceStats.mobile).toBeDefined();
      expect(deviceStats.desktop).toBeDefined();
      expect(deviceStats.tablet).toBeDefined();

      expect(deviceStats.mobile.count).toBe(1);
      expect(deviceStats.desktop.count).toBe(1);
      expect(deviceStats.tablet.count).toBe(1);
    });
  });

  describe('Cache Warmup', () => {
    it('should warm up cache with data loader', async () => {
      const dataLoader = vi.fn().mockImplementation(async (key: string) => {
        return { key, data: `loaded-${key}` };
      });

      const keys = ['key1', 'key2', 'key3'];

      await cache.warmup(keys, dataLoader);

      expect(dataLoader).toHaveBeenCalledTimes(3);
      expect(cache.get('key1')).toEqual({ key: 'key1', data: 'loaded-key1' });
      expect(cache.get('key2')).toEqual({ key: 'key2', data: 'loaded-key2' });
      expect(cache.get('key3')).toEqual({ key: 'key3', data: 'loaded-key3' });
    });

    it('should skip existing keys during warmup', async () => {
      cache.set('existing-key', { data: 'already-cached' });

      const dataLoader = vi.fn();

      await cache.warmup(['existing-key', 'new-key'], dataLoader);

      expect(dataLoader).toHaveBeenCalledTimes(1);
      expect(dataLoader).toHaveBeenCalledWith('new-key');
    });
  });
});

describe('WeddingChartCache', () => {
  let weddingCache: WeddingChartCache;

  beforeEach(() => {
    weddingCache = new WeddingChartCache();
  });

  afterEach(() => {
    weddingCache.clear();
  });

  it('should cache wedding metrics with proper TTL', () => {
    const metrics = { bookings: 10, revenue: 50000 };
    const dateRange = { start: '2024-01-01', end: '2024-01-31' };

    weddingCache.cacheWeddingMetrics(
      'wedding-123',
      metrics,
      dateRange,
      'mobile',
    );

    const cached = weddingCache.get('wedding-metrics:wedding-123', dateRange);
    expect(cached).toEqual(metrics);
  });

  it('should cache vendor analytics with period-based TTL', () => {
    const analytics = { views: 1000, clicks: 100 };

    weddingCache.cacheVendorAnalytics(
      'vendor-456',
      analytics,
      'day',
      'desktop',
    );

    const cached = weddingCache.get('vendor-analytics:vendor-456', {
      period: 'day',
    });
    expect(cached).toEqual(analytics);
  });

  it('should cache seasonal trends with yearly parameters', () => {
    const trends = [
      { month: 'January', bookings: 10 },
      { month: 'February', bookings: 15 },
    ];

    weddingCache.cacheSeasonalTrends(trends, 2024, 'tablet');

    const cached = weddingCache.get('seasonal-trends', { year: 2024 });
    expect(cached).toEqual(trends);
  });
});

describe('useChartCache Hook', () => {
  it('should provide cache operations', () => {
    const { result } = renderHook(() => useChartCache());

    expect(result.current.get).toBeInstanceOf(Function);
    expect(result.current.set).toBeInstanceOf(Function);
    expect(result.current.invalidate).toBeInstanceOf(Function);
    expect(result.current.stats).toBeDefined();
  });

  it('should set and get data through hook', () => {
    const { result } = renderHook(() => useChartCache());

    act(() => {
      result.current.set('hook-test', { data: 'test-value' });
    });

    const retrieved = result.current.get('hook-test');
    expect(retrieved).toEqual({ data: 'test-value' });
  });
});

describe('useWeddingChartCache Hook', () => {
  it('should provide wedding-specific cache operations', () => {
    const { result } = renderHook(() => useWeddingChartCache());

    expect(result.current.cacheWeddingMetrics).toBeInstanceOf(Function);
    expect(result.current.cacheVendorAnalytics).toBeInstanceOf(Function);
    expect(result.current.cacheSeasonalTrends).toBeInstanceOf(Function);
    expect(result.current.getWeddingMetrics).toBeInstanceOf(Function);
    expect(result.current.getVendorAnalytics).toBeInstanceOf(Function);
    expect(result.current.getSeasonalTrends).toBeInstanceOf(Function);
  });

  it('should cache and retrieve wedding metrics through hook', () => {
    const { result } = renderHook(() => useWeddingChartCache());

    const metrics = { bookings: 5, revenue: 25000 };
    const dateRange = { start: '2024-01-01', end: '2024-01-31' };

    act(() => {
      result.current.cacheWeddingMetrics(
        'wedding-789',
        metrics,
        dateRange,
        'mobile',
      );
    });

    const retrieved = result.current.getWeddingMetrics(
      'wedding-789',
      dateRange,
    );
    expect(retrieved).toEqual(metrics);
  });

  it('should cache and retrieve vendor analytics through hook', () => {
    const { result } = renderHook(() => useWeddingChartCache());

    const analytics = { impressions: 5000, conversions: 50 };

    act(() => {
      result.current.cacheVendorAnalytics(
        'vendor-321',
        analytics,
        'week',
        'desktop',
      );
    });

    const retrieved = result.current.getVendorAnalytics('vendor-321', 'week');
    expect(retrieved).toEqual(analytics);
  });
});
