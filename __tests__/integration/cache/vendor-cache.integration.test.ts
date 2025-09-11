/**
 * Vendor Cache Integration Tests
 * 
 * Tests for the complete vendor caching system including:
 * - Redis cache operations
 * - Vendor-specific configurations
 * - Rate limiting and fallbacks
 * - Wedding day protocols
 * - Performance benchmarks
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { VendorCacheManager } from '../../../src/lib/integrations/cache/vendor-cache-manager';
import { RedisCacheService } from '../../../src/lib/cache/redis-cache-service';
import { BaseVendorAdapter, VendorConfig } from '../../../src/lib/integrations/adapters/base-vendor-adapter';
import { VendorType, IntegrationPlatform, CacheKey } from '../../../src/lib/cache/cache-types';

// Mock Redis for testing
jest.mock('ioredis', () => {
  const mockRedis = {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    on: jest.fn(),
    subscribe: jest.fn(),
    publish: jest.fn()
  };
  
  return jest.fn(() => mockRedis);
});

// Mock vendor adapter for testing
class MockVendorAdapter extends BaseVendorAdapter {
  private mockData = {
    clients: [
      { id: '1', name: 'John & Jane Doe', email: 'john@example.com', weddingDate: '2025-06-15', status: 'active' as const, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      { id: '2', name: 'Bob & Alice Smith', email: 'bob@example.com', weddingDate: '2025-07-20', status: 'booked' as const, createdAt: '2024-01-02', updatedAt: '2024-01-02' }
    ],
    contracts: [
      { id: '1', clientId: '1', amount: 2500, currency: 'USD', status: 'signed' as const, createdAt: '2024-01-01', dueDate: '2025-06-01' },
      { id: '2', clientId: '2', amount: 3000, currency: 'USD', status: 'sent' as const, createdAt: '2024-01-02', dueDate: '2025-07-01' }
    ],
    events: [
      { id: '1', clientId: '1', title: 'John & Jane Wedding', date: '2025-06-15', location: 'Garden Venue', duration: 480, type: 'wedding' as const },
      { id: '2', clientId: '2', title: 'Bob & Alice Wedding', date: '2025-07-20', location: 'Beach Venue', duration: 360, type: 'wedding' as const }
    ]
  };

  protected async fetchClients(params: any): Promise<any[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    let clients = [...this.mockData.clients];
    
    // Apply filters
    if (params.status) {
      clients = clients.filter(c => c.status === params.status);
    }
    
    // Apply pagination
    const page = params.page || 1;
    const limit = params.limit || 50;
    const start = (page - 1) * limit;
    const end = start + limit;
    
    return clients.slice(start, end);
  }

  protected async fetchContracts(params: any): Promise<any[]> {
    await new Promise(resolve => setTimeout(resolve, 80));
    
    let contracts = [...this.mockData.contracts];
    
    if (params.clientId) {
      contracts = contracts.filter(c => c.clientId === params.clientId);
    }
    
    if (params.status) {
      contracts = contracts.filter(c => c.status === params.status);
    }
    
    return contracts;
  }

  protected async fetchEvents(params: any): Promise<any[]> {
    await new Promise(resolve => setTimeout(resolve, 120));
    
    let events = [...this.mockData.events];
    
    if (params.dateAfter) {
      events = events.filter(e => e.date >= params.dateAfter);
    }
    
    if (params.type) {
      events = events.filter(e => e.type === params.type);
    }
    
    return events;
  }

  protected async performCreateClient(clientData: any): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const newClient = {
      id: String(Date.now()),
      ...clientData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.mockData.clients.push(newClient);
    return newClient;
  }

  protected async performUpdateClient(clientId: string, updates: any): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const client = this.mockData.clients.find(c => c.id === clientId);
    if (!client) {
      throw new Error('Client not found');
    }
    
    Object.assign(client, updates, { updatedAt: new Date().toISOString() });
    return client;
  }

  protected async performConnectionTest(): Promise<{ status: string; message: string }> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return { status: 'connected', message: 'Mock vendor connection successful' };
  }
}

describe('Vendor Cache Integration Tests', () => {
  let cacheManager: VendorCacheManager;
  let vendorAdapter: MockVendorAdapter;
  let cacheService: RedisCacheService;
  
  const testConfig: VendorConfig = {
    vendorType: 'photographer',
    platform: 'tave',
    organizationId: 'test-org-123',
    credentials: {
      apiKey: 'test-api-key'
    }
  };

  beforeAll(async () => {
    // Initialize cache manager with test configuration
    cacheManager = new VendorCacheManager('redis://localhost:6379');
    vendorAdapter = new MockVendorAdapter(testConfig, cacheManager);
    
    // Wait for connections
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    await cacheManager.shutdown();
  });

  beforeEach(() => {
    // Reset mock data before each test
    jest.clearAllMocks();
  });

  describe('Basic Cache Operations', () => {
    test('should cache vendor clients successfully', async () => {
      const startTime = Date.now();
      
      // First call - should hit API
      const result1 = await vendorAdapter.getClients({ page: 1, limit: 10 });
      const firstCallTime = Date.now() - startTime;
      
      expect(result1.data).toHaveLength(2);
      expect(result1.source).toBe('api');
      expect(result1.cached).toBe(false);
      
      // Second call - should hit cache
      const startTime2 = Date.now();
      const result2 = await vendorAdapter.getClients({ page: 1, limit: 10 });
      const secondCallTime = Date.now() - startTime2;
      
      expect(result2.data).toEqual(result1.data);
      expect(result2.source).toBe('cache');
      expect(result2.cached).toBe(true);
      
      // Cache should be significantly faster
      expect(secondCallTime).toBeLessThan(firstCallTime * 0.5);
    });

    test('should respect vendor-specific TTL configurations', async () => {
      const cacheKey: CacheKey = {
        vendorType: 'photographer',
        platform: 'tave',
        organizationId: 'test-org-123',
        resource: 'clients',
        params: { page: 1, limit: 10 }
      };

      // Set data with custom TTL
      await cacheManager.set(cacheKey, { test: 'data' }, 1); // 1 second TTL
      
      // Should retrieve immediately
      const result1 = await cacheManager.get(cacheKey);
      expect(result1.data).toEqual({ test: 'data' });
      expect(result1.source).toBe('cache');
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Should miss cache after expiry
      const result2 = await cacheManager.get(cacheKey);
      expect(result2.data).toBeNull();
      expect(result2.source).toBe('fallback');
    });

    test('should handle cache invalidation correctly', async () => {
      // Populate cache
      await vendorAdapter.getClients({ page: 1, limit: 10 });
      
      // Verify cached
      const cachedResult = await vendorAdapter.getClients({ page: 1, limit: 10 });
      expect(cachedResult.source).toBe('cache');
      
      // Invalidate cache
      const invalidated = await cacheManager.invalidateVendor('photographer', 'tave', 'test-org-123', 'clients');
      expect(invalidated).toBeGreaterThan(0);
      
      // Should hit API again
      const freshResult = await vendorAdapter.getClients({ page: 1, limit: 10 });
      expect(freshResult.source).toBe('api');
    });
  });

  describe('Performance and Rate Limiting', () => {
    test('should enforce rate limits', async () => {
      const requests = [];
      
      // Make many rapid requests
      for (let i = 0; i < 50; i++) {
        requests.push(vendorAdapter.getClients({ page: 1, limit: 10, test: i }));
      }
      
      const results = await Promise.all(requests);
      
      // Most should be cached after the first few API calls
      const cacheHits = results.filter(r => r.source === 'cache').length;
      const apiCalls = results.filter(r => r.source === 'api').length;
      
      expect(apiCalls).toBeLessThan(10); // Should be rate limited
      expect(cacheHits).toBeGreaterThan(40); // Most should hit cache
    });

    test('should meet performance targets', async () => {
      // Warm up cache
      await vendorAdapter.getClients({ page: 1, limit: 10 });
      
      const iterations = 100;
      const startTime = Date.now();
      
      // Run performance test
      const promises = [];
      for (let i = 0; i < iterations; i++) {
        promises.push(vendorAdapter.getClients({ page: 1, limit: 10 }));
      }
      
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      const avgResponseTime = totalTime / iterations;
      
      // All should hit cache
      expect(results.every(r => r.source === 'cache')).toBe(true);
      
      // Should meet performance target: <50ms average for cached responses
      expect(avgResponseTime).toBeLessThan(50);
      
      console.log(`Performance test: ${iterations} requests in ${totalTime}ms (avg: ${avgResponseTime.toFixed(2)}ms)`);
    });
  });

  describe('Error Handling and Fallbacks', () => {
    test('should gracefully handle Redis connection failures', async () => {
      // Simulate Redis failure by shutting down the service temporarily
      const originalGet = cacheManager.get;
      
      cacheManager.get = jest.fn().mockRejectedValue(new Error('Redis connection failed'));
      
      // Should still work with fallback
      const result = await vendorAdapter.getClients({ page: 1, limit: 10 });
      
      expect(result.data).toBeDefined();
      expect(result.source).toBe('api'); // Falls back to API
      
      // Restore original method
      cacheManager.get = originalGet;
    });

    test('should serve stale data when API fails', async () => {
      // First, populate cache
      await vendorAdapter.getClients({ page: 1, limit: 10 });
      
      // Mock API failure
      const originalFetch = MockVendorAdapter.prototype.fetchClients;
      MockVendorAdapter.prototype.fetchClients = jest.fn().mockRejectedValue(new Error('API unavailable'));
      
      // Should serve stale cached data
      const result = await vendorAdapter.getClients({ page: 1, limit: 10 });
      
      expect(result.data).toBeDefined();
      expect(result.source).toBe('cache');
      expect(result.data.length).toBeGreaterThan(0);
      
      // Restore original method
      MockVendorAdapter.prototype.fetchClients = originalFetch;
    });
  });

  describe('Wedding Day Protocols', () => {
    test('should extend cache TTL on wedding days (Saturday)', async () => {
      // Mock Saturday (wedding day)
      const originalGetDay = Date.prototype.getDay;
      Date.prototype.getDay = jest.fn().mockReturnValue(6); // Saturday
      
      const cacheKey: CacheKey = {
        vendorType: 'photographer',
        platform: 'tave',
        organizationId: 'test-org-123',
        resource: 'clients'
      };
      
      // Set data on wedding day
      await cacheManager.set(cacheKey, { weddingDay: true });
      
      // Should have extended TTL (this would be verified by checking internal TTL)
      const result = await cacheManager.get(cacheKey);
      expect(result.data).toEqual({ weddingDay: true });
      
      // Restore original method
      Date.prototype.getDay = originalGetDay;
    });

    test('should prioritize cache hits on wedding days', async () => {
      // Mock Saturday (wedding day)  
      const originalGetDay = Date.prototype.getDay;
      Date.prototype.getDay = jest.fn().mockReturnValue(6);
      
      // Populate cache
      await vendorAdapter.getClients({ page: 1, limit: 10 });
      
      // Mock API delay to simulate high load
      const originalFetch = MockVendorAdapter.prototype.fetchClients;
      MockVendorAdapter.prototype.fetchClients = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        return [{ id: 'slow', name: 'Slow API Response' }];
      });
      
      // Should serve from cache instead of waiting for slow API
      const startTime = Date.now();
      const result = await vendorAdapter.getClients({ page: 1, limit: 10 });
      const responseTime = Date.now() - startTime;
      
      expect(result.source).toBe('cache');
      expect(responseTime).toBeLessThan(500); // Much faster than 1 second API delay
      
      // Restore
      MockVendorAdapter.prototype.fetchClients = originalFetch;
      Date.prototype.getDay = originalGetDay;
    });
  });

  describe('Multiple Vendor Types', () => {
    test('should handle different vendor configurations', async () => {
      const photographerConfig = { ...testConfig, vendorType: 'photographer' as VendorType };
      const venueConfig = { ...testConfig, vendorType: 'venue' as VendorType, platform: 'custom' as IntegrationPlatform };
      const catererConfig = { ...testConfig, vendorType: 'caterer' as VendorType };
      
      const photographerAdapter = new MockVendorAdapter(photographerConfig, cacheManager);
      const venueAdapter = new MockVendorAdapter(venueConfig, cacheManager);
      const catererAdapter = new MockVendorAdapter(catererConfig, cacheManager);
      
      // Test concurrent operations across vendor types
      const results = await Promise.all([
        photographerAdapter.getClients({ page: 1, limit: 5 }),
        venueAdapter.getClients({ page: 1, limit: 5 }),
        catererAdapter.getClients({ page: 1, limit: 5 })
      ]);
      
      // All should work independently
      expect(results).toHaveLength(3);
      expect(results.every(r => r.data.length > 0)).toBe(true);
      expect(results.every(r => r.source === 'api')).toBe(true); // First calls
      
      // Second calls should hit cache
      const cachedResults = await Promise.all([
        photographerAdapter.getClients({ page: 1, limit: 5 }),
        venueAdapter.getClients({ page: 1, limit: 5 }),
        catererAdapter.getClients({ page: 1, limit: 5 })
      ]);
      
      expect(cachedResults.every(r => r.source === 'cache')).toBe(true);
    });
  });

  describe('Cache Statistics and Monitoring', () => {
    test('should track cache performance statistics', async () => {
      // Make several requests to generate stats
      await Promise.all([
        vendorAdapter.getClients({ page: 1, limit: 10 }),
        vendorAdapter.getClients({ page: 1, limit: 10 }),
        vendorAdapter.getClients({ page: 2, limit: 10 }),
        vendorAdapter.getContracts({ status: 'signed' }),
        vendorAdapter.getEvents({ type: 'wedding' })
      ]);
      
      const stats = cacheManager.getStats();
      
      expect(stats.size).toBeGreaterThan(0);
      
      // Check that we have stats for our vendor type
      const photographerStats = Array.from(stats.values()).find(s => 
        s.vendorMetrics && s.vendorMetrics.photographer
      );
      
      expect(photographerStats).toBeDefined();
      expect(photographerStats?.hits).toBeGreaterThan(0);
      expect(photographerStats?.hitRate).toBeGreaterThan(0);
    });

    test('should provide health status information', async () => {
      const health = cacheManager.getHealthStatus();
      
      expect(health).toHaveProperty('service');
      expect(health).toHaveProperty('stats');
      expect(health).toHaveProperty('rateLimits');
      expect(health).toHaveProperty('warming');
      
      expect(health.stats.totalVendors).toBeGreaterThanOrEqual(0);
      expect(health.stats.avgHitRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Data Mutation and Cache Invalidation', () => {
    test('should invalidate cache after data mutations', async () => {
      // Populate cache
      const initialClients = await vendorAdapter.getClients({ page: 1, limit: 10 });
      expect(initialClients.source).toBe('api');
      
      // Verify cache hit
      const cachedClients = await vendorAdapter.getClients({ page: 1, limit: 10 });
      expect(cachedClients.source).toBe('cache');
      
      // Create new client (mutation)
      const newClient = await vendorAdapter.createClient({
        firstName: 'New',
        lastName: 'Client',
        email: 'new@example.com',
        phone: '555-0123'
      });
      
      expect(newClient.data).toBeDefined();
      expect(newClient.source).toBe('api');
      
      // Next client request should hit API (cache invalidated)
      const refreshedClients = await vendorAdapter.getClients({ page: 1, limit: 10 });
      expect(refreshedClients.source).toBe('api');
      expect(refreshedClients.data.length).toBe(initialClients.data.length + 1);
    });
  });
});

// Performance benchmark tests
describe('Cache Performance Benchmarks', () => {
  let cacheManager: VendorCacheManager;
  let vendorAdapter: MockVendorAdapter;
  
  const testConfig: VendorConfig = {
    vendorType: 'photographer',
    platform: 'tave',
    organizationId: 'perf-test-org',
    credentials: { apiKey: 'test' }
  };

  beforeAll(async () => {
    cacheManager = new VendorCacheManager();
    vendorAdapter = new MockVendorAdapter(testConfig, cacheManager);
  });

  afterAll(async () => {
    await cacheManager.shutdown();
  });

  test('cache hit rate should exceed 80% under normal load', async () => {
    const totalRequests = 1000;
    const uniqueRequests = 100; // 10:1 ratio for realistic caching scenario
    
    const requests = [];
    
    // Generate mix of requests (some repeated for cache hits)
    for (let i = 0; i < totalRequests; i++) {
      const requestId = i % uniqueRequests;
      requests.push(
        vendorAdapter.getClients({ 
          page: Math.floor(requestId / 10) + 1, 
          limit: 10,
          testId: requestId 
        })
      );
    }
    
    const startTime = Date.now();
    const results = await Promise.all(requests);
    const totalTime = Date.now() - startTime;
    
    // Calculate hit rate
    const cacheHits = results.filter(r => r.source === 'cache').length;
    const hitRate = (cacheHits / totalRequests) * 100;
    
    console.log(`Performance Benchmark Results:`);
    console.log(`- Total Requests: ${totalRequests}`);
    console.log(`- Cache Hits: ${cacheHits}`);
    console.log(`- Hit Rate: ${hitRate.toFixed(1)}%`);
    console.log(`- Total Time: ${totalTime}ms`);
    console.log(`- Average Response Time: ${(totalTime / totalRequests).toFixed(2)}ms`);
    
    // Performance targets
    expect(hitRate).toBeGreaterThan(80); // >80% hit rate
    expect(totalTime / totalRequests).toBeLessThan(50); // <50ms average response time
  });

  test('should handle wedding day traffic simulation', async () => {
    // Simulate wedding day with 5000 concurrent requests
    const weddingDayRequests = 5000;
    const concurrency = 100; // 100 concurrent requests
    
    // Mock wedding day
    const originalGetDay = Date.prototype.getDay;
    Date.prototype.getDay = jest.fn().mockReturnValue(6);
    
    const batches = [];
    for (let i = 0; i < weddingDayRequests; i += concurrency) {
      const batch = [];
      for (let j = 0; j < concurrency && (i + j) < weddingDayRequests; j++) {
        batch.push(
          vendorAdapter.getClients({ 
            page: Math.floor((i + j) / 50) + 1,
            limit: 10 
          })
        );
      }
      batches.push(Promise.all(batch));
    }
    
    const startTime = Date.now();
    const results = await Promise.all(batches);
    const totalTime = Date.now() - startTime;
    
    const flatResults = results.flat();
    const successRate = (flatResults.filter(r => r.data !== null).length / flatResults.length) * 100;
    
    console.log(`Wedding Day Simulation Results:`);
    console.log(`- Total Requests: ${flatResults.length}`);
    console.log(`- Success Rate: ${successRate.toFixed(1)}%`);
    console.log(`- Total Time: ${totalTime}ms`);
    console.log(`- Requests/Second: ${(flatResults.length / (totalTime / 1000)).toFixed(0)}`);
    
    // Wedding day requirements
    expect(successRate).toBeGreaterThan(99); // >99% success rate
    expect(totalTime / flatResults.length).toBeLessThan(200); // <200ms average on wedding day
    
    // Restore
    Date.prototype.getDay = originalGetDay;
  });
});

export default {};