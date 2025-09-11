import { AnalyticsCacheManager } from '@/lib/services/mobile/AnalyticsCacheManager';
import { VendorMetrics, CacheEntry } from '@/types/mobile-analytics';

// Mock compression library
jest.mock('lz-string', () => ({
  compress: jest.fn((data) => `compressed_${data}`),
  decompress: jest.fn((data) => data.replace('compressed_', '')),
}));

describe('AnalyticsCacheManager', () => {
  let cacheManager: AnalyticsCacheManager;
  
  const mockVendorData: VendorMetrics[] = [
    {
      id: '1',
      name: 'Elite Photography',
      type: 'photographer',
      performanceScore: 95,
      responseTime: 2.5,
      completionRate: 98,
      customerSatisfaction: 4.8,
      revenueGenerated: 45000,
      bookingsCount: 28,
      averageBookingValue: 1607,
      monthlyGrowth: 12.5,
      repeatClientRate: 85,
      onTimeDeliveryRate: 96,
      communicationScore: 92,
      qualityScore: 94,
      reliabilityScore: 88,
      lastUpdated: new Date('2024-01-15'),
      trends: {
        revenue: [35000, 40000, 45000],
        bookings: [22, 25, 28],
        satisfaction: [4.6, 4.7, 4.8],
      },
    },
  ];

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    
    // Mock performance.now()
    jest.spyOn(performance, 'now').mockReturnValue(1000);
    
    // Mock memory API
    Object.defineProperty(performance, 'memory', {
      value: {
        usedJSHeapSize: 10 * 1024 * 1024, // 10MB
        totalJSHeapSize: 50 * 1024 * 1024, // 50MB
        jsHeapSizeLimit: 100 * 1024 * 1024, // 100MB
      },
      writable: true,
    });
    
    cacheManager = AnalyticsCacheManager.getInstance();
    cacheManager.initialize({
      maxSize: 10 * 1024 * 1024, // 10MB
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      compressionThreshold: 1024, // 1KB
      memoryPressureThreshold: 0.8, // 80%
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('creates singleton instance', () => {
      const instance1 = AnalyticsCacheManager.getInstance();
      const instance2 = AnalyticsCacheManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('initializes with default configuration', () => {
      const newManager = new (AnalyticsCacheManager as any)();
      newManager.initialize();
      
      expect(newManager.config.maxSize).toBe(50 * 1024 * 1024); // 50MB default
      expect(newManager.config.maxAge).toBe(24 * 60 * 60 * 1000); // 24 hours default
    });

    it('loads existing cache from localStorage on initialization', () => {
      const existingCache = {
        'test-key': {
          key: 'test-key',
          data: mockVendorData,
          timestamp: Date.now(),
          size: 1000,
          compressed: false,
          lastAccessed: Date.now(),
          hitCount: 1,
        },
      };
      
      localStorage.setItem('WedSync_AnalyticsCache', JSON.stringify(existingCache));
      
      const newManager = AnalyticsCacheManager.getInstance();
      newManager.initialize();
      
      expect(newManager.get('test-key')).toEqual(mockVendorData);
    });

    it('handles corrupted cache data during initialization', () => {
      localStorage.setItem('WedSync_AnalyticsCache', 'invalid-json');
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      const newManager = AnalyticsCacheManager.getInstance();
      newManager.initialize();
      
      expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('Failed to load cache'));
      
      consoleWarn.mockRestore();
    });
  });

  describe('Data Storage', () => {
    it('stores data with automatic key generation', () => {
      const key = cacheManager.set(mockVendorData);
      
      expect(key).toBeDefined();
      expect(cacheManager.get(key)).toEqual(mockVendorData);
    });

    it('stores data with custom key', () => {
      cacheManager.set(mockVendorData, 'custom-key');
      
      expect(cacheManager.get('custom-key')).toEqual(mockVendorData);
    });

    it('calculates data size correctly', () => {
      const key = cacheManager.set(mockVendorData);
      const entry = cacheManager.getCacheEntry(key);
      
      expect(entry?.size).toBeGreaterThan(0);
      expect(entry?.size).toBe(JSON.stringify(mockVendorData).length);
    });

    it('compresses large data automatically', () => {
      const largeData = Array.from({ length: 100 }, () => mockVendorData[0]);
      const key = cacheManager.set(largeData);
      const entry = cacheManager.getCacheEntry(key);
      
      expect(entry?.compressed).toBe(true);
    });

    it('tracks access patterns', () => {
      const key = cacheManager.set(mockVendorData);
      
      // Access the data multiple times
      cacheManager.get(key);
      cacheManager.get(key);
      cacheManager.get(key);
      
      const entry = cacheManager.getCacheEntry(key);
      expect(entry?.hitCount).toBe(3);
    });

    it('updates last accessed time on retrieval', () => {
      const key = cacheManager.set(mockVendorData);
      const initialEntry = cacheManager.getCacheEntry(key);
      
      // Advance time
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 5000);
      
      cacheManager.get(key);
      const updatedEntry = cacheManager.getCacheEntry(key);
      
      expect(updatedEntry?.lastAccessed).toBeGreaterThan(initialEntry?.lastAccessed || 0);
    });
  });

  describe('Data Retrieval', () => {
    it('retrieves stored data', () => {
      const key = cacheManager.set(mockVendorData);
      const retrieved = cacheManager.get(key);
      
      expect(retrieved).toEqual(mockVendorData);
    });

    it('returns null for non-existent keys', () => {
      const result = cacheManager.get('non-existent-key');
      
      expect(result).toBeNull();
    });

    it('returns null for expired data', () => {
      const key = cacheManager.set(mockVendorData);
      
      // Mock expired timestamp
      const entry = cacheManager.getCacheEntry(key);
      if (entry) {
        entry.timestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
      }
      
      const result = cacheManager.get(key);
      
      expect(result).toBeNull();
    });

    it('decompresses compressed data automatically', () => {
      const largeData = Array.from({ length: 100 }, () => mockVendorData[0]);
      const key = cacheManager.set(largeData);
      
      const retrieved = cacheManager.get(key);
      
      expect(retrieved).toEqual(largeData);
    });

    it('handles decompression errors gracefully', () => {
      const { decompress } = require('lz-string');
      decompress.mockImplementation(() => null);
      
      const key = cacheManager.set(mockVendorData, 'test-key');
      // Force compression
      const entry = cacheManager.getCacheEntry(key);
      if (entry) {
        entry.compressed = true;
      }
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = cacheManager.get(key);
      
      expect(result).toBeNull();
      expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('Failed to decompress'));
      
      consoleWarn.mockRestore();
    });
  });

  describe('Cache Management', () => {
    it('implements LRU eviction when cache is full', () => {
      // Set small cache size for testing
      cacheManager.initialize({ maxSize: 1000 });
      
      // Fill cache with data
      const keys = [];
      for (let i = 0; i < 5; i++) {
        const key = cacheManager.set({ ...mockVendorData[0], id: `vendor-${i}` });
        keys.push(key);
      }
      
      // Access first key to make it recently used
      cacheManager.get(keys[0]);
      
      // Add new data that exceeds cache size
      const newKey = cacheManager.set(Array.from({ length: 50 }, () => mockVendorData[0]));
      
      // First key should still exist (recently accessed)
      expect(cacheManager.get(keys[0])).not.toBeNull();
      
      // Some older keys should be evicted
      expect(cacheManager.get(keys[1])).toBeNull();
    });

    it('removes expired entries during cleanup', async () => {
      const key1 = cacheManager.set(mockVendorData, 'current-data');
      const key2 = cacheManager.set(mockVendorData, 'expired-data');
      
      // Mock expired entry
      const entry2 = cacheManager.getCacheEntry(key2);
      if (entry2) {
        entry2.timestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
      }
      
      await cacheManager.cleanup();
      
      expect(cacheManager.get(key1)).toEqual(mockVendorData);
      expect(cacheManager.get(key2)).toBeNull();
    });

    it('monitors memory usage and triggers cleanup', () => {
      // Mock high memory usage
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 85 * 1024 * 1024, // 85MB
          totalJSHeapSize: 90 * 1024 * 1024, // 90MB
          jsHeapSizeLimit: 100 * 1024 * 1024, // 100MB
        },
        writable: true,
      });
      
      const cleanupSpy = jest.spyOn(cacheManager, 'cleanup');
      
      // Fill cache
      for (let i = 0; i < 10; i++) {
        cacheManager.set({ ...mockVendorData[0], id: `vendor-${i}` });
      }
      
      expect(cleanupSpy).toHaveBeenCalled();
    });

    it('persists cache to localStorage periodically', () => {
      const key = cacheManager.set(mockVendorData);
      
      // Trigger persistence
      cacheManager.persist();
      
      const storedCache = localStorage.getItem('WedSync_AnalyticsCache');
      expect(storedCache).toBeDefined();
      
      const parsedCache = JSON.parse(storedCache!);
      expect(parsedCache[key]).toBeDefined();
    });

    it('implements cache partitioning by data type', () => {
      cacheManager.set(mockVendorData, 'vendors:all');
      cacheManager.set({ query: 'revenue-trend' }, 'queries:revenue-trend');
      
      const vendorKeys = cacheManager.getKeysByPrefix('vendors:');
      const queryKeys = cacheManager.getKeysByPrefix('queries:');
      
      expect(vendorKeys).toContain('vendors:all');
      expect(queryKeys).toContain('queries:revenue-trend');
    });
  });

  describe('Performance Optimization', () => {
    it('implements background refresh for frequently accessed data', async () => {
      const key = cacheManager.set(mockVendorData, 'frequently-accessed');
      
      // Simulate frequent access
      for (let i = 0; i < 10; i++) {
        cacheManager.get(key);
      }
      
      const refreshCallback = jest.fn().mockResolvedValue(mockVendorData);
      
      await cacheManager.scheduleRefresh(key, refreshCallback);
      
      expect(refreshCallback).toHaveBeenCalled();
    });

    it('batches multiple set operations for efficiency', () => {
      const batchData = [
        { key: 'vendor-1', data: { ...mockVendorData[0], id: '1' } },
        { key: 'vendor-2', data: { ...mockVendorData[0], id: '2' } },
        { key: 'vendor-3', data: { ...mockVendorData[0], id: '3' } },
      ];
      
      cacheManager.setBatch(batchData);
      
      expect(cacheManager.get('vendor-1')).toEqual(batchData[0].data);
      expect(cacheManager.get('vendor-2')).toEqual(batchData[1].data);
      expect(cacheManager.get('vendor-3')).toEqual(batchData[2].data);
    });

    it('implements prefetching for predictable data access', async () => {
      const prefetchCallback = jest.fn().mockResolvedValue(mockVendorData);
      
      await cacheManager.prefetch('predicted-key', prefetchCallback);
      
      expect(prefetchCallback).toHaveBeenCalled();
      expect(cacheManager.get('predicted-key')).toEqual(mockVendorData);
    });

    it('uses weak references for large objects to prevent memory leaks', () => {
      const largeObject = Array.from({ length: 1000 }, () => mockVendorData[0]);
      const key = cacheManager.set(largeObject);
      
      // Force garbage collection (if available)
      if (global.gc) {
        global.gc();
      }
      
      // Object should still be accessible through cache
      expect(cacheManager.get(key)).toBeDefined();
    });
  });

  describe('Statistics and Monitoring', () => {
    it('tracks cache hit/miss ratios', () => {
      const key = cacheManager.set(mockVendorData);
      
      // Generate some hits and misses
      cacheManager.get(key); // hit
      cacheManager.get(key); // hit
      cacheManager.get('non-existent'); // miss
      
      const stats = cacheManager.getStatistics();
      
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRatio).toBe(2/3);
    });

    it('monitors cache size and memory usage', () => {
      const key1 = cacheManager.set(mockVendorData);
      const key2 = cacheManager.set(mockVendorData);
      
      const stats = cacheManager.getStatistics();
      
      expect(stats.size).toBe(2);
      expect(stats.memoryUsage).toBeGreaterThan(0);
    });

    it('tracks operation performance metrics', () => {
      // Mock performance timing
      let currentTime = 1000;
      jest.spyOn(performance, 'now').mockImplementation(() => currentTime);
      
      const key = cacheManager.set(mockVendorData);
      
      currentTime = 1005; // 5ms later
      cacheManager.get(key);
      
      const stats = cacheManager.getStatistics();
      
      expect(stats.averageGetTime).toBeDefined();
      expect(stats.averageSetTime).toBeDefined();
    });

    it('provides detailed cache analysis', () => {
      // Create different types of cache entries
      cacheManager.set(mockVendorData, 'small-data');
      cacheManager.set(Array.from({ length: 100 }, () => mockVendorData[0]), 'large-data');
      
      const analysis = cacheManager.analyzeCache();
      
      expect(analysis.totalEntries).toBe(2);
      expect(analysis.compressionRatio).toBeDefined();
      expect(analysis.memoryDistribution).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('handles localStorage quota exceeded errors', () => {
      // Mock localStorage quota exceeded
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = jest.fn(() => {
        throw new Error('QuotaExceededError');
      });
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      cacheManager.persist();
      
      expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('Failed to persist cache'));
      
      // Restore
      Storage.prototype.setItem = originalSetItem;
      consoleWarn.mockRestore();
    });

    it('handles JSON parsing errors during data retrieval', () => {
      // Manually corrupt cache data
      const key = cacheManager.set(mockVendorData);
      const cache = (cacheManager as any).cache;
      cache[key].data = 'invalid-json-data';
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = cacheManager.get(key);
      
      expect(result).toBeNull();
      expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('Failed to parse cached data'));
      
      consoleWarn.mockRestore();
    });

    it('recovers from memory pressure gracefully', () => {
      // Mock memory pressure
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 95 * 1024 * 1024, // 95MB (very high)
          totalJSHeapSize: 98 * 1024 * 1024, // 98MB
          jsHeapSizeLimit: 100 * 1024 * 1024, // 100MB
        },
        writable: true,
      });
      
      const clearSpy = jest.spyOn(cacheManager, 'clear');
      
      // Try to add data during memory pressure
      cacheManager.set(Array.from({ length: 1000 }, () => mockVendorData[0]));
      
      expect(clearSpy).toHaveBeenCalled(); // Should clear cache to free memory
    });

    it('handles cache corruption by rebuilding', () => {
      // Simulate corrupted cache
      (cacheManager as any).cache = null;
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      // Should recover and reinitialize
      const key = cacheManager.set(mockVendorData);
      
      expect(key).toBeDefined();
      expect(cacheManager.get(key)).toEqual(mockVendorData);
      expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('Cache corrupted'));
      
      consoleWarn.mockRestore();
    });
  });
});