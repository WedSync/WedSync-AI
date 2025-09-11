import { jest } from '@jest/globals';
import { AnalyticsCacheManager } from '../../../src/lib/services/mobile/AnalyticsCacheManager';
import { VendorMetrics, ChartDataPoint } from '../../../src/types/mobile-analytics';

// Mock performance API
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024,
    totalJSHeapSize: 100 * 1024 * 1024,
  },
};

global.performance = mockPerformance as any;

// Mock compression library
jest.mock('pako', () => ({
  gzip: jest.fn((data) => new Uint8Array([1, 2, 3])),
  ungzip: jest.fn((data) => new Uint8Array([4, 5, 6])),
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock data
const mockVendorData: VendorMetrics[] = [
  {
    id: 'vendor1',
    name: 'Photography Studio A',
    type: 'photographer',
    overallScore: 8.5,
    responseTime: 2.5,
    clientSatisfaction: 9.2,
    completionRate: 95,
    revenue: 125000,
    bookingsCount: 45,
    averageBookingValue: 2777.78,
    lastActive: new Date('2025-01-14T10:00:00Z'),
    performanceTrend: 'improving',
    communicationScore: 8.8,
    punctualityScore: 9.1,
    qualityScore: 8.9,
    valueScore: 8.3,
    reviewsCount: 127,
    averageRating: 4.6,
    monthlyGrowth: 12.5,
    repeatClientRate: 68,
    referralRate: 23,
  },
];

const mockChartData: ChartDataPoint[] = [
  { timestamp: new Date('2025-01-01'), value: 8.2, label: 'Jan 1' },
  { timestamp: new Date('2025-01-02'), value: 8.5, label: 'Jan 2' },
  { timestamp: new Date('2025-01-03'), value: 8.1, label: 'Jan 3' },
];

describe('AnalyticsCacheManager', () => {
  let cacheManager: AnalyticsCacheManager;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset localStorage mock
    mockLocalStorage.getItem.mockReturnValue(null);
    mockLocalStorage.setItem.mockImplementation(() => {});
    mockLocalStorage.removeItem.mockImplementation(() => {});
    
    // Reset performance mock
    mockPerformance.now.mockReturnValue(Date.now());
    mockPerformance.mark.mockImplementation(() => {});
    mockPerformance.measure.mockImplementation(() => {});
    
    cacheManager = AnalyticsCacheManager.getInstance();
  });

  afterEach(() => {
    cacheManager.cleanup();
    jest.resetAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AnalyticsCacheManager.getInstance();
      const instance2 = AnalyticsCacheManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should maintain state across getInstance calls', async () => {
      const instance1 = AnalyticsCacheManager.getInstance();
      await instance1.set('test-key', mockVendorData);
      
      const instance2 = AnalyticsCacheManager.getInstance();
      const cachedData = await instance2.get('test-key');
      
      expect(cachedData).toEqual(mockVendorData);
    });
  });

  describe('Basic Cache Operations', () => {
    it('should store and retrieve data', async () => {
      await cacheManager.set('vendors', mockVendorData);
      const result = await cacheManager.get('vendors');
      
      expect(result).toEqual(mockVendorData);
    });

    it('should return null for non-existent keys', async () => {
      const result = await cacheManager.get('non-existent-key');
      
      expect(result).toBeNull();
    });

    it('should check if key exists', async () => {
      await cacheManager.set('test-key', mockVendorData);
      
      const exists = await cacheManager.has('test-key');
      const notExists = await cacheManager.has('non-existent');
      
      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });

    it('should delete cached data', async () => {
      await cacheManager.set('test-key', mockVendorData);
      await cacheManager.delete('test-key');
      
      const result = await cacheManager.get('test-key');
      
      expect(result).toBeNull();
    });

    it('should clear all cached data', async () => {
      await cacheManager.set('key1', mockVendorData);
      await cacheManager.set('key2', mockChartData);
      
      await cacheManager.clear();
      
      const result1 = await cacheManager.get('key1');
      const result2 = await cacheManager.get('key2');
      
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  describe('TTL (Time To Live)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should respect TTL expiration', async () => {
      await cacheManager.set('test-key', mockVendorData, { ttl: 1000 }); // 1 second
      
      // Data should be available immediately
      let result = await cacheManager.get('test-key');
      expect(result).toEqual(mockVendorData);
      
      // Fast-forward time
      jest.advanceTimersByTime(1500);
      
      // Data should be expired
      result = await cacheManager.get('test-key');
      expect(result).toBeNull();
    });

    it('should not expire data without TTL', async () => {
      await cacheManager.set('test-key', mockVendorData);
      
      jest.advanceTimersByTime(60000); // 1 minute
      
      const result = await cacheManager.get('test-key');
      expect(result).toEqual(mockVendorData);
    });

    it('should refresh TTL on access when configured', async () => {
      await cacheManager.set('test-key', mockVendorData, { 
        ttl: 1000, 
        refreshTtlOnAccess: true 
      });
      
      // Access data before expiration
      jest.advanceTimersByTime(800);
      await cacheManager.get('test-key');
      
      // Should still be available after original TTL
      jest.advanceTimersByTime(500);
      const result = await cacheManager.get('test-key');
      expect(result).toEqual(mockVendorData);
    });

    it('should clean up expired entries automatically', async () => {
      await cacheManager.set('short-lived', mockVendorData, { ttl: 500 });
      await cacheManager.set('long-lived', mockChartData, { ttl: 2000 });
      
      jest.advanceTimersByTime(1000);
      
      // Trigger cleanup
      await cacheManager.cleanup();
      
      expect(await cacheManager.get('short-lived')).toBeNull();
      expect(await cacheManager.get('long-lived')).toEqual(mockChartData);
    });
  });

  describe('LRU Eviction', () => {
    it('should evict least recently used items when cache is full', async () => {
      cacheManager = AnalyticsCacheManager.getInstance({ maxSize: 3 });
      
      await cacheManager.set('key1', { data: 'data1' });
      await cacheManager.set('key2', { data: 'data2' });
      await cacheManager.set('key3', { data: 'data3' });
      
      // Access key1 to make it recently used
      await cacheManager.get('key1');
      
      // Add new item, should evict key2 (least recently used)
      await cacheManager.set('key4', { data: 'data4' });
      
      expect(await cacheManager.get('key1')).toEqual({ data: 'data1' });
      expect(await cacheManager.get('key2')).toBeNull();
      expect(await cacheManager.get('key3')).toEqual({ data: 'data3' });
      expect(await cacheManager.get('key4')).toEqual({ data: 'data4' });
    });

    it('should update access order on get operations', async () => {
      cacheManager = AnalyticsCacheManager.getInstance({ maxSize: 2 });
      
      await cacheManager.set('key1', { data: 'data1' });
      await cacheManager.set('key2', { data: 'data2' });
      
      // Access key1 to make it most recently used
      await cacheManager.get('key1');
      
      // Add new item, should evict key2
      await cacheManager.set('key3', { data: 'data3' });
      
      expect(await cacheManager.get('key1')).toEqual({ data: 'data1' });
      expect(await cacheManager.get('key2')).toBeNull();
      expect(await cacheManager.get('key3')).toEqual({ data: 'data3' });
    });

    it('should handle cache size limits correctly', async () => {
      cacheManager = AnalyticsCacheManager.getInstance({ maxSize: 1 });
      
      await cacheManager.set('key1', { data: 'data1' });
      await cacheManager.set('key2', { data: 'data2' });
      
      // Only the most recent item should remain
      expect(await cacheManager.get('key1')).toBeNull();
      expect(await cacheManager.get('key2')).toEqual({ data: 'data2' });
    });
  });

  describe('Compression', () => {
    it('should compress large data automatically', async () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: `vendor-${i}`,
        name: `Vendor ${i}`,
        data: 'x'.repeat(1000), // Large string
      }));
      
      await cacheManager.set('large-data', largeData);
      
      // Should use compression for large data
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining('analytics_cache_large-data'),
        expect.stringContaining('"compressed":true')
      );
    });

    it('should not compress small data', async () => {
      const smallData = { message: 'small' };
      
      await cacheManager.set('small-data', smallData);
      
      // Should not use compression
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining('analytics_cache_small-data'),
        expect.stringContaining('"compressed":false')
      );
    });

    it('should decompress data on retrieval', async () => {
      const pako = require('pako');
      
      // Mock compressed data in localStorage
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        data: [1, 2, 3], // Compressed data
        compressed: true,
        timestamp: Date.now(),
        ttl: null,
      }));
      
      pako.ungzip.mockReturnValue(new TextEncoder().encode(JSON.stringify(mockVendorData)));
      
      const result = await cacheManager.get('compressed-data');
      
      expect(pako.ungzip).toHaveBeenCalledWith([1, 2, 3]);
      expect(result).toEqual(mockVendorData);
    });

    it('should handle compression errors gracefully', async () => {
      const pako = require('pako');
      pako.gzip.mockImplementation(() => {
        throw new Error('Compression failed');
      });
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await cacheManager.set('test-data', mockVendorData);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to compress data for key: test-data',
        expect.any(Error)
      );
      
      // Should still store uncompressed
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Memory Management', () => {
    it('should monitor memory usage', () => {
      const memoryUsage = cacheManager.getMemoryUsage();
      
      expect(memoryUsage).toEqual({
        usedBytes: 50 * 1024 * 1024,
        totalBytes: 100 * 1024 * 1024,
        percentage: 50,
      });
    });

    it('should trigger cleanup when memory pressure is high', async () => {
      // Mock high memory usage
      mockPerformance.memory.usedJSHeapSize = 90 * 1024 * 1024;
      mockPerformance.memory.totalJSHeapSize = 100 * 1024 * 1024;
      
      const cleanupSpy = jest.spyOn(cacheManager, 'cleanup');
      
      await cacheManager.set('test-key', mockVendorData);
      
      expect(cleanupSpy).toHaveBeenCalled();
    });

    it('should respect memory limits', async () => {
      cacheManager = AnalyticsCacheManager.getInstance({
        maxMemoryMB: 10, // 10MB limit
      });
      
      // Mock memory estimation
      jest.spyOn(cacheManager, 'estimateSize').mockReturnValue(12 * 1024 * 1024); // 12MB
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await cacheManager.set('large-data', mockVendorData);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Data size exceeds memory limit, not caching:',
        'large-data'
      );
      
      consoleSpy.mockRestore();
    });

    it('should estimate data size accurately', () => {
      const size = cacheManager.estimateSize(mockVendorData);
      
      expect(size).toBeGreaterThan(0);
      expect(typeof size).toBe('number');
    });
  });

  describe('Background Refresh', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should refresh cached data in background', async () => {
      const refreshFn = jest.fn().mockResolvedValue({ updated: 'data' });
      
      await cacheManager.set('test-key', mockVendorData, {
        refreshFn,
        refreshInterval: 5000, // 5 seconds
      });
      
      jest.advanceTimersByTime(6000);
      
      // Allow async operations to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(refreshFn).toHaveBeenCalled();
    });

    it('should update cache with refreshed data', async () => {
      const refreshFn = jest.fn().mockResolvedValue({ updated: 'data' });
      
      await cacheManager.set('test-key', mockVendorData, {
        refreshFn,
        refreshInterval: 1000,
      });
      
      jest.advanceTimersByTime(1500);
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const result = await cacheManager.get('test-key');
      expect(result).toEqual({ updated: 'data' });
    });

    it('should handle refresh failures gracefully', async () => {
      const refreshFn = jest.fn().mockRejectedValue(new Error('Refresh failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await cacheManager.set('test-key', mockVendorData, {
        refreshFn,
        refreshInterval: 1000,
      });
      
      jest.advanceTimersByTime(1500);
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to refresh cache for key: test-key',
        expect.any(Error)
      );
      
      // Original data should still be available
      const result = await cacheManager.get('test-key');
      expect(result).toEqual(mockVendorData);
      
      consoleSpy.mockRestore();
    });

    it('should stop background refresh when data is evicted', async () => {
      const refreshFn = jest.fn().mockResolvedValue({ updated: 'data' });
      
      await cacheManager.set('test-key', mockVendorData, {
        refreshFn,
        refreshInterval: 1000,
      });
      
      // Delete the cache entry
      await cacheManager.delete('test-key');
      
      jest.advanceTimersByTime(1500);
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Refresh function should not be called
      expect(refreshFn).not.toHaveBeenCalled();
    });
  });

  describe('Cache Partitioning', () => {
    it('should support different cache partitions', async () => {
      await cacheManager.set('key1', mockVendorData, { partition: 'vendors' });
      await cacheManager.set('key2', mockChartData, { partition: 'charts' });
      await cacheManager.set('key3', { other: 'data' }, { partition: 'other' });
      
      const vendorData = await cacheManager.get('key1', { partition: 'vendors' });
      const chartData = await cacheManager.get('key2', { partition: 'charts' });
      
      expect(vendorData).toEqual(mockVendorData);
      expect(chartData).toEqual(mockChartData);
    });

    it('should isolate partitions from each other', async () => {
      await cacheManager.set('same-key', mockVendorData, { partition: 'vendors' });
      await cacheManager.set('same-key', mockChartData, { partition: 'charts' });
      
      const vendorData = await cacheManager.get('same-key', { partition: 'vendors' });
      const chartData = await cacheManager.get('same-key', { partition: 'charts' });
      
      expect(vendorData).toEqual(mockVendorData);
      expect(chartData).toEqual(mockChartData);
    });

    it('should clear partitions independently', async () => {
      await cacheManager.set('key1', mockVendorData, { partition: 'vendors' });
      await cacheManager.set('key2', mockChartData, { partition: 'charts' });
      
      await cacheManager.clearPartition('vendors');
      
      expect(await cacheManager.get('key1', { partition: 'vendors' })).toBeNull();
      expect(await cacheManager.get('key2', { partition: 'charts' })).toEqual(mockChartData);
    });

    it('should respect partition-specific size limits', async () => {
      cacheManager = AnalyticsCacheManager.getInstance({
        partitionLimits: {
          vendors: 2,
          charts: 1,
        },
      });
      
      // Fill vendor partition
      await cacheManager.set('v1', mockVendorData, { partition: 'vendors' });
      await cacheManager.set('v2', mockVendorData, { partition: 'vendors' });
      await cacheManager.set('v3', mockVendorData, { partition: 'vendors' }); // Should evict v1
      
      // Fill chart partition
      await cacheManager.set('c1', mockChartData, { partition: 'charts' });
      await cacheManager.set('c2', mockChartData, { partition: 'charts' }); // Should evict c1
      
      expect(await cacheManager.get('v1', { partition: 'vendors' })).toBeNull();
      expect(await cacheManager.get('v2', { partition: 'vendors' })).toEqual(mockVendorData);
      expect(await cacheManager.get('v3', { partition: 'vendors' })).toEqual(mockVendorData);
      
      expect(await cacheManager.get('c1', { partition: 'charts' })).toBeNull();
      expect(await cacheManager.get('c2', { partition: 'charts' })).toEqual(mockChartData);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track cache hit/miss statistics', async () => {
      // Cache miss
      await cacheManager.get('non-existent');
      
      // Cache hit
      await cacheManager.set('test-key', mockVendorData);
      await cacheManager.get('test-key');
      
      const stats = cacheManager.getStats();
      
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.5, 2);
    });

    it('should measure operation performance', async () => {
      await cacheManager.set('test-key', mockVendorData);
      
      expect(mockPerformance.mark).toHaveBeenCalledWith('cache-set-start');
      expect(mockPerformance.measure).toHaveBeenCalledWith(
        'cache-set-duration',
        'cache-set-start',
        expect.any(String)
      );
    });

    it('should track storage usage over time', async () => {
      await cacheManager.set('key1', mockVendorData);
      await cacheManager.set('key2', mockChartData);
      
      const stats = cacheManager.getStats();
      
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.memoryUsage).toBeDefined();
    });

    it('should provide detailed performance metrics', () => {
      const metrics = cacheManager.getPerformanceMetrics();
      
      expect(metrics).toHaveProperty('averageSetTime');
      expect(metrics).toHaveProperty('averageGetTime');
      expect(metrics).toHaveProperty('compressionRatio');
      expect(metrics).toHaveProperty('evictionCount');
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage quota exceeded', async () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await cacheManager.set('test-key', mockVendorData);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Storage quota exceeded, clearing cache and retrying'
      );
      expect(mockLocalStorage.clear).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should handle corrupted cache data', async () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json{');
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = await cacheManager.get('corrupted-key');
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to parse cached data for key: corrupted-key',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should recover from localStorage unavailability', async () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage not available');
      });
      
      // Should fall back to in-memory cache
      await cacheManager.set('test-key', mockVendorData);
      const result = await cacheManager.get('test-key');
      
      expect(result).toEqual(mockVendorData);
    });

    it('should handle cleanup errors gracefully', async () => {
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('Remove failed');
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await cacheManager.cleanup();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error during cache cleanup:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Integration Tests', () => {
    it('should work end-to-end with complex data flows', async () => {
      // Set up multiple data items with different configurations
      await cacheManager.set('vendors', mockVendorData, { 
        ttl: 5000, 
        partition: 'analytics',
        refreshInterval: 2000,
        refreshFn: async () => [...mockVendorData, { 
          ...mockVendorData[0], 
          id: 'vendor2', 
          name: 'Updated Vendor' 
        }]
      });
      
      await cacheManager.set('charts', mockChartData, {
        partition: 'visualization',
        ttl: 3000,
      });
      
      // Verify initial data
      let vendors = await cacheManager.get('vendors', { partition: 'analytics' });
      let charts = await cacheManager.get('charts', { partition: 'visualization' });
      
      expect(vendors).toHaveLength(1);
      expect(charts).toHaveLength(3);
      
      // Fast forward for background refresh
      jest.useFakeTimers();
      jest.advanceTimersByTime(2500);
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Verify background refresh worked
      vendors = await cacheManager.get('vendors', { partition: 'analytics' });
      expect(vendors).toHaveLength(2);
      
      // Verify chart data expired
      jest.advanceTimersByTime(1000);
      charts = await cacheManager.get('charts', { partition: 'visualization' });
      expect(charts).toBeNull();
      
      jest.useRealTimers();
    });
  });
});