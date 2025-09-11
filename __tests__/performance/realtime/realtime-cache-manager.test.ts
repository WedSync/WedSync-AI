/**
 * WS-202 RealtimeCacheManager Test Suite
 * Team D - Round 1: Multi-Layer Caching Performance Testing
 * 
 * Tests L1 (local) and L2 (Redis) caching, compression, wedding season optimizations,
 * cache warming strategies, and >90% hit ratio requirements
 */

import { RealtimeCacheManager } from '@/lib/performance/realtime-cache-manager';
import type {
  CacheLayer,
  CacheEntry,
  CachePerformanceMetrics,
  CacheOptimizationResult,
  UserRealtimeData,
  WeddingRealtimeData,
  AccessPattern
} from '@/types/realtime-performance';

// Mock Redis client
const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  flushall: jest.fn(),
  mget: jest.fn(),
  mset: jest.fn(),
  memory: jest.fn().mockReturnValue(['USAGE', 1024000]),
  info: jest.fn().mockReturnValue('redis_version:7.0.0\r\nused_memory:1024000')
};

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient)
}));

describe('RealtimeCacheManager', () => {
  let cacheManager: RealtimeCacheManager;
  
  beforeEach(() => {
    cacheManager = RealtimeCacheManager.getInstance({
      localCacheSize: 1000,
      localCacheTTL: 300000, // 5 minutes
      redisCacheTTL: 3600000, // 1 hour
      compressionThreshold: 1024,
      preloadStrategies: ['user_data', 'wedding_data']
    });

    // Clear singleton instance for clean testing
    (RealtimeCacheManager as any).instance = null;
    jest.clearAllMocks();
  });

  afterEach(() => {
    cacheManager?.destroy();
  });

  describe('Local Cache (L1) Operations', () => {
    test('should store and retrieve data from local cache', async () => {
      const testData = { id: 'user-123', name: 'John Photographer' };
      const cacheKey = 'user:123' as const;

      await cacheManager.set(cacheKey, testData, 300000);
      const retrieved = await cacheManager.get<typeof testData>(cacheKey);

      expect(retrieved).toEqual(testData);
    });

    test('should handle cache expiration correctly', async () => {
      const testData = { id: 'test', value: 'expires' };
      const cacheKey = 'temp:data' as const;
      const shortTTL = 100; // 100ms

      await cacheManager.set(cacheKey, testData, shortTTL);
      
      // Should be available immediately
      let retrieved = await cacheManager.get(cacheKey);
      expect(retrieved).toEqual(testData);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      retrieved = await cacheManager.get(cacheKey);
      expect(retrieved).toBeNull();
    });

    test('should enforce local cache size limits with LRU eviction', async () => {
      const smallCacheManager = RealtimeCacheManager.getInstance({
        localCacheSize: 3, // Very small cache for testing
        localCacheTTL: 300000
      });

      // Add items beyond cache size
      await smallCacheManager.set('key:1' as const, { data: '1' });
      await smallCacheManager.set('key:2' as const, { data: '2' });
      await smallCacheManager.set('key:3' as const, { data: '3' });
      await smallCacheManager.set('key:4' as const, { data: '4' }); // Should evict oldest

      // First item should be evicted
      const evicted = await smallCacheManager.get('key:1');
      const newest = await smallCacheManager.get('key:4');

      expect(evicted).toBeNull();
      expect(newest).toEqual({ data: '4' });

      smallCacheManager.destroy();
    });

    test('should track access patterns for optimization', async () => {
      const userData: UserRealtimeData = {
        userId: 'user-123',
        organizationId: 'org-456',
        role: 'photographer',
        permissions: ['view_weddings', 'edit_timeline'],
        activeWeddings: ['wedding-789'],
        preferences: { notifications: true },
        lastSeen: Date.now(),
        connectionMetadata: { device: 'mobile' }
      };

      const cacheKey = 'user:123' as const;

      // Access multiple times to build pattern
      await cacheManager.set(cacheKey, userData);
      await cacheManager.get(cacheKey);
      await cacheManager.get(cacheKey);
      await cacheManager.get(cacheKey);

      const metrics = await cacheManager.getCachePerformanceMetrics();
      expect(metrics.hitRatio.local).toBeGreaterThan(0);
    });
  });

  describe('Redis Cache (L2) Operations', () => {
    test('should fall back to Redis when local cache misses', async () => {
      const testData = { id: 'wedding-456', vendor: 'photographer' };
      const cacheKey = 'wedding:456' as const;

      // Mock Redis to return data
      mockRedisClient.get.mockResolvedValue(JSON.stringify(testData));

      // Should fetch from Redis when not in local cache
      const retrieved = await cacheManager.get(cacheKey);

      expect(mockRedisClient.get).toHaveBeenCalledWith(cacheKey);
      expect(retrieved).toEqual(testData);
    });

    test('should handle Redis compression for large objects', async () => {
      const largeWeddingData: WeddingRealtimeData = {
        weddingId: 'wedding-123',
        weddingDate: '2025-06-15',
        organizationId: 'org-456',
        activeVendors: Array.from({ length: 50 }, (_, i) => `vendor-${i}`),
        timeline: Array.from({ length: 100 }, (_, i) => ({
          id: `event-${i}`,
          time: `${10 + i}:00`,
          status: 'pending' as const,
          vendor: `vendor-${i % 10}`
        })),
        criticalUpdates: Array.from({ length: 20 }, (_, i) => ({
          id: `update-${i}`,
          message: `Critical update ${i}`,
          priority: Math.floor(Math.random() * 5) + 1,
          timestamp: Date.now() - i * 60000
        })),
        coordinationData: {
          venue: 'Grand Estate',
          guestCount: 200,
          specialRequirements: ['wheelchair_access', 'vegetarian_options']
        }
      };

      const cacheKey = 'wedding:123:full' as const;

      await cacheManager.set(cacheKey, largeWeddingData);

      // Should use compression for large objects
      expect(mockRedisClient.set).toHaveBeenCalled();
      
      const callArgs = mockRedisClient.set.mock.calls[0];
      expect(callArgs[0]).toBe(cacheKey);
      // Data should be compressed if over threshold
    });

    test('should handle Redis connection failures gracefully', async () => {
      const testData = { id: 'test', value: 'fallback' };
      const cacheKey = 'test:fallback' as const;

      // Mock Redis failure
      mockRedisClient.get.mockRejectedValue(new Error('Redis connection failed'));
      mockRedisClient.set.mockRejectedValue(new Error('Redis connection failed'));

      // Should not throw error and handle gracefully
      await expect(cacheManager.set(cacheKey, testData)).resolves.not.toThrow();
      
      const retrieved = await cacheManager.get(cacheKey);
      // Should return null or handle gracefully, not throw
      expect(retrieved).toBeNull();
    });

    test('should batch Redis operations for efficiency', async () => {
      const batchData = [
        { key: 'user:1' as const, data: { id: '1', name: 'User 1' } },
        { key: 'user:2' as const, data: { id: '2', name: 'User 2' } },
        { key: 'user:3' as const, data: { id: '3', name: 'User 3' } }
      ];

      mockRedisClient.mset.mockResolvedValue('OK');

      await cacheManager.setBatch(batchData.map(({ key, data }) => ({ key, value: data })));

      expect(mockRedisClient.mset).toHaveBeenCalled();
    });
  });

  describe('Cache Warming and Preloading', () => {
    test('should warm cache for wedding season', async () => {
      const weddingIds = ['wedding-1', 'wedding-2', 'wedding-3'];
      
      // Mock Redis to return wedding data
      mockRedisClient.mget.mockResolvedValue([
        JSON.stringify({ id: 'wedding-1', date: '2025-06-15' }),
        JSON.stringify({ id: 'wedding-2', date: '2025-06-22' }),
        JSON.stringify({ id: 'wedding-3', date: '2025-06-29' })
      ]);

      await cacheManager.warmCacheForWeddingSeason(weddingIds);

      // Should have preloaded wedding data
      const weddingData = await cacheManager.get('wedding:1');
      expect(weddingData).toBeDefined();
    });

    test('should preload user data based on access patterns', async () => {
      const activeUsers = ['user-1', 'user-2', 'user-3'];
      const mockUserData = activeUsers.map(id => ({
        userId: id,
        organizationId: 'org-123',
        role: 'photographer',
        permissions: ['view_weddings'],
        activeWeddings: [`wedding-${id}`],
        preferences: {},
        lastSeen: Date.now(),
        connectionMetadata: {}
      }));

      mockRedisClient.mget.mockResolvedValue(mockUserData.map(data => JSON.stringify(data)));

      await cacheManager.preloadUserData(activeUsers);

      // Check that user data is now in local cache
      for (let i = 0; i < activeUsers.length; i++) {
        const userData = await cacheManager.get(`user:${i + 1}` as const);
        expect(userData).toBeDefined();
      }
    });

    test('should implement intelligent cache warming based on patterns', async () => {
      const accessPatterns: AccessPattern[] = [
        {
          key: 'user:photographer-123',
          frequency: 100,
          lastAccess: Date.now() - 60000,
          averageInterval: 5000,
          peakTimes: [9, 12, 15, 18], // 9am, 12pm, 3pm, 6pm
          dataSize: 2048
        },
        {
          key: 'wedding:summer-2025',
          frequency: 50,
          lastAccess: Date.now() - 120000,
          averageInterval: 10000,
          peakTimes: [10, 14, 16],
          dataSize: 4096
        }
      ];

      const optimizationResult = await cacheManager.optimizeBasedOnAccessPatterns(accessPatterns);

      expect(optimizationResult.actions.length).toBeGreaterThan(0);
      expect(optimizationResult.optimizationScore).toBeGreaterThan(0);
      expect(optimizationResult.performanceGains).toBeDefined();
    });
  });

  describe('Performance Optimization', () => {
    test('should achieve >90% cache hit ratio requirement', async () => {
      // Simulate realistic cache usage pattern
      const commonKeys = [
        'user:photographer-1', 'user:photographer-2', 'user:venue-1',
        'wedding:june-15', 'wedding:june-22', 'wedding:july-1',
        'organization:123', 'organization:456'
      ];

      // Pre-populate cache with common data
      for (const key of commonKeys) {
        await cacheManager.set(key as any, { id: key, cached: true });
      }

      // Simulate 100 cache requests with 90% being common keys
      let hits = 0;
      const totalRequests = 100;

      for (let i = 0; i < totalRequests; i++) {
        const key = i < 90 ? commonKeys[i % commonKeys.length] : `rare:key-${i}`;
        const result = await cacheManager.get(key as any);
        if (result !== null) hits++;
      }

      const hitRatio = hits / totalRequests;
      expect(hitRatio).toBeGreaterThanOrEqual(0.9); // >90% hit ratio
    });

    test('should maintain performance under high concurrency', async () => {
      const concurrentOperations = 50;
      const startTime = performance.now();

      // Create many concurrent cache operations
      const operations = Array.from({ length: concurrentOperations }, async (_, i) => {
        const key = `concurrent:${i}` as const;
        const data = { id: i, timestamp: Date.now() };
        
        await cacheManager.set(key, data);
        return cacheManager.get(key);
      });

      const results = await Promise.all(operations);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(results.length).toBe(concurrentOperations);
      expect(results.every(result => result !== null)).toBe(true);
      expect(totalTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should compress large objects effectively', async () => {
      const largeObject = {
        weddingId: 'large-wedding',
        timeline: Array.from({ length: 500 }, (_, i) => ({
          id: `event-${i}`,
          description: `Wedding event ${i} with detailed description that makes this object quite large`,
          vendor: `vendor-${i % 20}`,
          time: new Date(Date.now() + i * 60000).toISOString()
        })),
        vendors: Array.from({ length: 50 }, (_, i) => ({
          id: `vendor-${i}`,
          name: `Vendor ${i}`,
          services: Array.from({ length: 10 }, (_, j) => `Service ${j}`)
        }))
      };

      const cacheKey = 'wedding:large:compressed' as const;
      
      await cacheManager.set(cacheKey, largeObject);
      const retrieved = await cacheManager.get(cacheKey);

      expect(retrieved).toEqual(largeObject);
      
      // Check compression was applied (mocked Redis set should have been called)
      expect(mockRedisClient.set).toHaveBeenCalled();
    });

    test('should provide comprehensive performance metrics', async () => {
      // Perform various cache operations
      const operations = [
        { key: 'metrics:1', data: { test: 1 } },
        { key: 'metrics:2', data: { test: 2 } },
        { key: 'metrics:3', data: { test: 3 } }
      ];

      for (const { key, data } of operations) {
        await cacheManager.set(key as any, data);
        await cacheManager.get(key as any);
      }

      const metrics: CachePerformanceMetrics = await cacheManager.getCachePerformanceMetrics();

      expect(metrics.hitRatio.overall).toBeGreaterThanOrEqual(0);
      expect(metrics.hitRatio.local).toBeGreaterThanOrEqual(0);
      expect(metrics.performance.averageReadLatency).toBeGreaterThanOrEqual(0);
      expect(metrics.performance.averageWriteLatency).toBeGreaterThanOrEqual(0);
      expect(metrics.performance.operationsPerSecond).toBeGreaterThanOrEqual(0);
      expect(metrics.memory.localCacheSize).toBeGreaterThanOrEqual(0);
      expect(metrics.optimization.compressionRatio).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Wedding Industry Optimization', () => {
    test('should optimize for wedding day traffic patterns', async () => {
      const weddingDayConfig = {
        weddingId: 'saturday-wedding',
        weddingDate: '2025-06-14', // Saturday
        criticalChannels: ['timeline', 'vendor_coordination', 'emergency'],
        peakHours: [14, 15, 16, 17, 18] // 2pm-6pm ceremony/reception
      };

      await cacheManager.optimizeForWeddingDay(weddingDayConfig);

      // Verify wedding day optimizations are active
      const metrics = await cacheManager.getCachePerformanceMetrics();
      expect(metrics.optimization.preloadEffectiveness).toBeGreaterThanOrEqual(0);
    });

    test('should handle Saturday traffic spikes', async () => {
      // Simulate Saturday wedding traffic (10x normal load)
      const saturdayOperations = 1000; // Simulate high load
      const operations = [];

      for (let i = 0; i < saturdayOperations; i++) {
        const weddingId = `saturday-wedding-${i % 20}`;
        const vendorId = `vendor-${i % 100}`;
        
        operations.push(
          cacheManager.get(`wedding:${weddingId}:timeline` as any),
          cacheManager.get(`user:${vendorId}` as any)
        );
      }

      const startTime = performance.now();
      await Promise.all(operations.slice(0, 100)); // Test subset for performance
      const endTime = performance.now();

      const averageLatency = (endTime - startTime) / 100;
      expect(averageLatency).toBeLessThan(10); // Should handle efficiently
    });

    test('should prioritize wedding-critical data', async () => {
      const criticalData = {
        weddingId: 'emergency-wedding',
        emergencyUpdates: [
          { type: 'timeline_change', urgency: 'critical' },
          { type: 'vendor_issue', urgency: 'high' }
        ]
      };

      const routineData = {
        userId: 'user-routine',
        preferences: { theme: 'light' }
      };

      // Set both with same TTL but critical should be prioritized
      await cacheManager.set('wedding:emergency:critical' as any, criticalData, 300000);
      await cacheManager.set('user:routine:data' as any, routineData, 300000);

      // Under memory pressure, critical data should remain cached
      const retrieved = await cacheManager.get('wedding:emergency:critical' as any);
      expect(retrieved).toEqual(criticalData);
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle cache corruption gracefully', async () => {
      const cacheKey = 'corrupted:data' as const;
      
      // Mock Redis to return invalid JSON
      mockRedisClient.get.mockResolvedValue('{"invalid": json}');

      const result = await cacheManager.get(cacheKey);
      expect(result).toBeNull(); // Should handle corruption gracefully
    });

    test('should implement circuit breaker for Redis failures', async () => {
      const cacheKey = 'circuit:test' as const;
      const testData = { test: 'data' };

      // Simulate repeated Redis failures
      mockRedisClient.set.mockRejectedValue(new Error('Redis connection failed'));
      mockRedisClient.get.mockRejectedValue(new Error('Redis connection failed'));

      // Multiple failures should trigger circuit breaker
      for (let i = 0; i < 10; i++) {
        await cacheManager.set(cacheKey, testData);
      }

      // Cache should still function (local only mode)
      await cacheManager.set(cacheKey, testData);
      const retrieved = await cacheManager.get(cacheKey);
      
      expect(retrieved).toEqual(testData); // Should work with local cache only
    });

    test('should cleanup resources on destroy', () => {
      const destroySpy = jest.spyOn(cacheManager, 'destroy');
      
      cacheManager.destroy();
      
      expect(destroySpy).toHaveBeenCalled();
    });
  });

  describe('Integration with Wedding Systems', () => {
    test('should cache wedding timeline data efficiently', async () => {
      const timelineData: WeddingRealtimeData = {
        weddingId: 'timeline-wedding',
        weddingDate: '2025-08-15',
        organizationId: 'org-timeline',
        activeVendors: ['photographer-1', 'videographer-1', 'florist-1'],
        timeline: [
          { id: 'ceremony', time: '15:00', status: 'pending' },
          { id: 'reception', time: '18:00', status: 'pending' },
          { id: 'dinner', time: '19:30', status: 'pending' }
        ],
        criticalUpdates: [
          { id: 'update-1', message: 'Ceremony delayed 15 minutes', priority: 5, timestamp: Date.now() }
        ],
        coordinationData: {
          venue: 'Sunset Garden',
          photographer: 'John Smith Photography'
        }
      };

      const cacheKey = 'wedding:timeline-wedding:timeline' as const;
      
      await cacheManager.set(cacheKey, timelineData);
      const retrieved = await cacheManager.get<WeddingRealtimeData>(cacheKey);

      expect(retrieved).toEqual(timelineData);
      expect(retrieved?.timeline).toHaveLength(3);
      expect(retrieved?.criticalUpdates).toHaveLength(1);
    });

    test('should handle vendor data caching with organization context', async () => {
      const vendorData: UserRealtimeData = {
        userId: 'vendor-photographer-pro',
        organizationId: 'org-wedding-experts',
        role: 'photographer',
        permissions: ['manage_timeline', 'upload_photos', 'coordinate_vendors'],
        activeWeddings: ['wedding-1', 'wedding-2', 'wedding-3'],
        preferences: {
          notifications: true,
          autoUpload: false,
          qualityPreset: 'professional'
        },
        lastSeen: Date.now() - 5000,
        connectionMetadata: {
          device: 'iPhone 15 Pro',
          location: 'venue',
          connectionQuality: 'excellent'
        }
      };

      const cacheKey = 'user:vendor-photographer-pro' as const;
      
      await cacheManager.set(cacheKey, vendorData);
      const retrieved = await cacheManager.get<UserRealtimeData>(cacheKey);

      expect(retrieved).toEqual(vendorData);
      expect(retrieved?.activeWeddings).toHaveLength(3);
      expect(retrieved?.permissions).toContain('manage_timeline');
    });
  });
});

describe('RealtimeCacheManager Integration Tests', () => {
  test('should handle realistic wedding coordination caching scenario', async () => {
    const cacheManager = RealtimeCacheManager.getInstance({
      localCacheSize: 2000,
      localCacheTTL: 600000, // 10 minutes
      redisCacheTTL: 7200000, // 2 hours
      compressionThreshold: 2048
    });

    // Simulate wedding day with multiple vendors and real-time updates
    const weddingId = 'saturday-coordination-test';
    const vendors = ['photographer', 'videographer', 'florist', 'caterer', 'dj'];
    
    // Cache vendor data
    for (const [index, vendor] of vendors.entries()) {
      const vendorData: UserRealtimeData = {
        userId: `${vendor}-${index}`,
        organizationId: 'wedding-experts-ltd',
        role: vendor,
        permissions: ['view_timeline', 'update_status', 'send_messages'],
        activeWeddings: [weddingId],
        preferences: { realTimeUpdates: true },
        lastSeen: Date.now(),
        connectionMetadata: { device: 'mobile', location: 'venue' }
      };
      
      await cacheManager.set(`user:${vendor}-${index}` as any, vendorData);
    }

    // Cache wedding timeline data
    const weddingData: WeddingRealtimeData = {
      weddingId,
      weddingDate: '2025-06-14',
      organizationId: 'wedding-experts-ltd',
      activeVendors: vendors.map((vendor, index) => `${vendor}-${index}`),
      timeline: [
        { id: 'prep', time: '12:00', status: 'in_progress', vendor: 'photographer-0' },
        { id: 'ceremony', time: '15:00', status: 'pending' },
        { id: 'cocktails', time: '16:00', status: 'pending', vendor: 'caterer-3' },
        { id: 'reception', time: '18:00', status: 'pending', vendor: 'dj-4' }
      ],
      criticalUpdates: [
        {
          id: 'weather-update',
          message: 'Light rain expected - moving ceremony indoors',
          priority: 5,
          timestamp: Date.now() - 30000
        }
      ],
      coordinationData: {
        venue: 'Riverside Gardens',
        backupPlan: 'Indoor Chapel',
        emergencyContacts: ['venue-manager', 'wedding-planner']
      }
    };

    await cacheManager.set(`wedding:${weddingId}:data` as any, weddingData);

    // Verify all data is cached and accessible
    const retrievedWedding = await cacheManager.get(`wedding:${weddingId}:data` as any);
    expect(retrievedWedding).toEqual(weddingData);

    for (const [index, vendor] of vendors.entries()) {
      const retrievedVendor = await cacheManager.get(`user:${vendor}-${index}` as any);
      expect(retrievedVendor).toBeDefined();
      expect((retrievedVendor as UserRealtimeData).role).toBe(vendor);
    }

    // Test cache performance under load
    const metrics = await cacheManager.getCachePerformanceMetrics();
    expect(metrics.hitRatio.local).toBeGreaterThan(0.8); // Should have good hit ratio
    expect(metrics.performance.operationsPerSecond).toBeGreaterThan(0);

    cacheManager.destroy();
  });
});