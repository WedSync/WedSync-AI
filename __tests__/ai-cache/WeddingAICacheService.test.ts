/**
 * WS-241 AI Caching Strategy System - Core Cache Service Tests
 * Comprehensive test suite for WeddingAICacheService
 * Team B - Backend Infrastructure & API Development
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { WeddingAICacheService, AIQuery, WeddingContext, CachedResponse } from '@/lib/ai-cache/WeddingAICacheService';

// Mock Redis and Supabase
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
    ttl: vi.fn(),
    incr: vi.fn(),
    ping: vi.fn().mockResolvedValue('PONG'),
    info: vi.fn().mockResolvedValue('used_memory:1048576\nmaxmemory:10485760')
  }))
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn().mockResolvedValue({ data: [], error: null })
    })),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null })
  }))
}));

describe('WeddingAICacheService', () => {
  let cacheService: WeddingAICacheService;
  let mockRedis: any;
  let mockSupabase: any;

  const testQuery: AIQuery = {
    type: 'venue_recommendations',
    content: 'Find outdoor wedding venues in California',
    model: 'gpt-4',
    parameters: {
      location: 'California',
      style: 'outdoor',
      budget_range: 'high'
    }
  };

  const testContext: WeddingContext = {
    location: 'Los Angeles, CA',
    weddingDate: new Date('2024-06-15'),
    guestCount: 150,
    budgetTier: 'premium',
    season: 'summer'
  };

  beforeAll(() => {
    // Set required environment variables for tests
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    process.env.REDIS_URL = 'redis://localhost:6379';
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    cacheService = new WeddingAICacheService(
      'https://test.supabase.co',
      'test-service-key',
      'redis://localhost:6379'
    );

    // Get mocked instances
    mockRedis = (cacheService as any).redis;
    mockSupabase = (cacheService as any).supabase;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Cache Key Generation', () => {
    it('should generate consistent cache keys for identical queries', async () => {
      const key1 = await (cacheService as any).generateCacheKey(testQuery, testContext);
      const key2 = await (cacheService as any).generateCacheKey(testQuery, testContext);
      
      expect(key1).toBe(key2);
      expect(key1).toContain('venue_recommendations');
      expect(key1).toContain('Los_Angeles_CA');
      expect(key1).toContain('summer');
    });

    it('should generate different keys for different locations', async () => {
      const context1 = { ...testContext, location: 'Los Angeles, CA' };
      const context2 = { ...testContext, location: 'New York, NY' };
      
      const key1 = await (cacheService as any).generateCacheKey(testQuery, context1);
      const key2 = await (cacheService as any).generateCacheKey(testQuery, context2);
      
      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different cache types', async () => {
      const query1 = { ...testQuery, type: 'venue_recommendations' as const };
      const query2 = { ...testQuery, type: 'vendor_matching' as const };
      
      const key1 = await (cacheService as any).generateCacheKey(query1, testContext);
      const key2 = await (cacheService as any).generateCacheKey(query2, testContext);
      
      expect(key1).not.toBe(key2);
    });
  });

  describe('TTL Calculation', () => {
    it('should calculate shorter TTL for peak wedding season', async () => {
      const peakContext = { ...testContext, season: 'summer' as const };
      const offSeasonContext = { ...testContext, season: 'winter' as const };
      
      const peakTTL = await (cacheService as any).calculateTTL(testQuery, peakContext);
      const offSeasonTTL = await (cacheService as any).calculateTTL(testQuery, offSeasonContext);
      
      expect(peakTTL).toBeLessThan(offSeasonTTL);
    });

    it('should calculate shorter TTL for closer wedding dates', async () => {
      const nearContext = { 
        ...testContext, 
        weddingDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) // 15 days from now
      };
      const farContext = { 
        ...testContext, 
        weddingDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
      };
      
      const nearTTL = await (cacheService as any).calculateTTL(testQuery, nearContext);
      const farTTL = await (cacheService as any).calculateTTL(testQuery, farContext);
      
      expect(nearTTL).toBeLessThan(farTTL);
    });

    it('should have different TTLs for different cache types', async () => {
      const venueQuery = { ...testQuery, type: 'venue_recommendations' as const };
      const availabilityQuery = { ...testQuery, type: 'vendor_availability' as const };
      
      const venueTTL = await (cacheService as any).calculateTTL(venueQuery, testContext);
      const availabilityTTL = await (cacheService as any).calculateTTL(availabilityQuery, testContext);
      
      // Venue recommendations should have longer TTL than availability checks
      expect(venueTTL).toBeGreaterThan(availabilityTTL);
    });
  });

  describe('Cache Operations', () => {
    describe('getCachedResponse', () => {
      it('should return null when no cache entry exists', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockSupabase.from().select().eq().single.mockResolvedValue({ data: null, error: null });
        
        const result = await cacheService.getCachedResponse(testQuery, testContext);
        
        expect(result).toBeNull();
      });

      it('should return cached response from Redis (fastest layer)', async () => {
        const cachedData = {
          data: { venues: ['Test Venue'] },
          source: 'redis',
          timestamp: new Date().toISOString(),
          hitCount: 5,
          ttl: 3600
        };
        
        mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));
        
        const result = await cacheService.getCachedResponse(testQuery, testContext);
        
        expect(result).toEqual(cachedData);
        expect(mockRedis.incr).toHaveBeenCalled(); // Hit count should be incremented
      });

      it('should fallback to database when Redis fails', async () => {
        const dbData = {
          response_data: { venues: ['Test Venue'] },
          created_at: new Date().toISOString(),
          access_count: 3,
          expires_at: new Date(Date.now() + 3600000).toISOString()
        };
        
        mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));
        mockSupabase.from().select().eq().single.mockResolvedValue({ data: dbData, error: null });
        
        const result = await cacheService.getCachedResponse(testQuery, testContext);
        
        expect(result?.data).toEqual(dbData.response_data);
        expect(result?.source).toBe('database');
      });

      it('should respect cache expiration', async () => {
        const expiredData = {
          data: { venues: ['Test Venue'] },
          source: 'redis',
          timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
          hitCount: 5,
          ttl: 3600, // 1 hour TTL - should be expired
          expiresAt: new Date(Date.now() - 3600000).toISOString() // Expired 1 hour ago
        };
        
        mockRedis.get.mockResolvedValue(JSON.stringify(expiredData));
        
        const result = await cacheService.getCachedResponse(testQuery, testContext);
        
        expect(result).toBeNull(); // Should not return expired data
      });
    });

    describe('setCachedResponse', () => {
      const testResponse = {
        venues: ['Test Venue 1', 'Test Venue 2'],
        total: 2,
        processingTime: 450
      };

      it('should store response in all cache layers', async () => {
        mockRedis.set.mockResolvedValue('OK');
        mockSupabase.from().insert.mockResolvedValue({ data: [{}], error: null });
        
        await cacheService.setCachedResponse(
          testQuery, 
          testResponse, 
          testContext,
          { cost: 25, modelUsed: 'gpt-4', processingTime: 450 }
        );
        
        // Should store in Redis
        expect(mockRedis.set).toHaveBeenCalled();
        
        // Should store in database
        expect(mockSupabase.from).toHaveBeenCalledWith('ai_cache_entries');
        expect(mockSupabase.from().insert).toHaveBeenCalled();
      });

      it('should handle storage failures gracefully', async () => {
        mockRedis.set.mockRejectedValue(new Error('Redis storage failed'));
        mockSupabase.from().insert.mockResolvedValue({ data: [{}], error: null });
        
        // Should not throw error even if Redis fails
        await expect(
          cacheService.setCachedResponse(testQuery, testResponse, testContext)
        ).resolves.not.toThrow();
        
        // Should still try to store in database
        expect(mockSupabase.from().insert).toHaveBeenCalled();
      });

      it('should calculate correct cache size', async () => {
        mockRedis.set.mockResolvedValue('OK');
        mockSupabase.from().insert.mockResolvedValue({ data: [{}], error: null });
        
        await cacheService.setCachedResponse(testQuery, testResponse, testContext);
        
        const insertCall = mockSupabase.from().insert.mock.calls[0][0];
        expect(insertCall.cache_size_bytes).toBeGreaterThan(0);
      });
    });

    describe('invalidateCache', () => {
      it('should invalidate specific cache types', async () => {
        mockRedis.del.mockResolvedValue(1);
        mockSupabase.from().update.mockResolvedValue({ data: [{}], error: null });
        
        await cacheService.invalidateCache('wedding-123', ['venue_recommendations']);
        
        expect(mockSupabase.from().update).toHaveBeenCalled();
        const updateCall = mockSupabase.from().update.mock.calls[0][0];
        expect(updateCall.validation_status).toBe('invalid');
      });

      it('should handle global invalidation', async () => {
        mockRedis.del.mockResolvedValue(10);
        mockSupabase.from().update.mockResolvedValue({ data: [{}], error: null });
        
        await cacheService.invalidateCache(undefined, undefined, 'global');
        
        expect(mockSupabase.from().update).toHaveBeenCalled();
      });
    });
  });

  describe('Performance Monitoring', () => {
    describe('recordPerformanceMetric', () => {
      it('should record cache hit metrics', async () => {
        mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
        
        await (cacheService as any).recordPerformanceMetric(
          'venue_recommendations',
          'hit',
          45,
          testContext
        );
        
        expect(mockSupabase.rpc).toHaveBeenCalledWith('record_cache_performance', {
          p_cache_type: 'venue_recommendations',
          p_operation_type: 'hit',
          p_response_time_ms: 45,
          p_wedding_context: expect.any(Object)
        });
      });

      it('should record cache miss metrics', async () => {
        mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
        
        await (cacheService as any).recordPerformanceMetric(
          'vendor_matching',
          'miss',
          120,
          testContext,
          { cost: 15 }
        );
        
        expect(mockSupabase.rpc).toHaveBeenCalledWith('record_cache_performance', {
          p_cache_type: 'vendor_matching',
          p_operation_type: 'miss',
          p_response_time_ms: 120,
          p_wedding_context: expect.any(Object)
        });
      });
    });

    describe('getPerformanceStats', () => {
      it('should return performance statistics', async () => {
        const mockStats = [{
          cache_type: 'venue_recommendations',
          total_queries: 1000,
          cache_hits: 850,
          cache_misses: 150,
          hit_rate: 0.85,
          avg_response_time_ms: 42,
          total_size_mb: 15.6
        }];
        
        mockSupabase.rpc.mockResolvedValue({ data: mockStats, error: null });
        
        const stats = await (cacheService as any).getPerformanceStats(24);
        
        expect(stats).toEqual(mockStats);
        expect(mockSupabase.rpc).toHaveBeenCalledWith('get_cache_statistics', {
          p_time_range_hours: 24
        });
      });
    });
  });

  describe('Wedding Industry Optimizations', () => {
    describe('Seasonal Optimizations', () => {
      it('should apply peak season multipliers correctly', async () => {
        const peakQuery = { ...testQuery, type: 'venue_recommendations' as const };
        const peakContext = { 
          ...testContext, 
          season: 'summer' as const,
          weddingDate: new Date('2024-07-15') // Peak summer
        };
        
        const ttl = await (cacheService as any).calculateTTL(peakQuery, peakContext);
        
        // Peak season should have shorter TTL due to higher volatility
        expect(ttl).toBeLessThan(24 * 60 * 60); // Less than 24 hours
      });

      it('should apply off-season multipliers correctly', async () => {
        const offSeasonQuery = { ...testQuery, type: 'venue_recommendations' as const };
        const offSeasonContext = { 
          ...testContext, 
          season: 'winter' as const,
          weddingDate: new Date('2024-01-15') // Off-season
        };
        
        const ttl = await (cacheService as any).calculateTTL(offSeasonQuery, offSeasonContext);
        
        // Off-season should have longer TTL due to lower volatility
        expect(ttl).toBeGreaterThan(24 * 60 * 60); // More than 24 hours
      });
    });

    describe('Location-based Caching', () => {
      it('should handle major metropolitan areas (Tier 1)', async () => {
        const tier1Context = { ...testContext, location: 'New York, NY' };
        const key = await (cacheService as any).generateCacheKey(testQuery, tier1Context);
        
        expect(key).toContain('New_York_NY');
        
        // Tier 1 markets should have shorter TTL due to higher activity
        const ttl = await (cacheService as any).calculateTTL(testQuery, tier1Context);
        expect(ttl).toBeLessThan(48 * 60 * 60); // Less than 48 hours
      });

      it('should handle smaller markets (Tier 2/3)', async () => {
        const tier3Context = { ...testContext, location: 'Boise, ID' };
        const key = await (cacheService as any).generateCacheKey(testQuery, tier3Context);
        
        expect(key).toContain('Boise_ID');
        
        // Smaller markets should have longer TTL due to lower activity
        const ttl = await (cacheService as any).calculateTTL(testQuery, tier3Context);
        expect(ttl).toBeGreaterThan(24 * 60 * 60); // More than 24 hours
      });
    });

    describe('Budget Tier Optimizations', () => {
      it('should handle luxury tier caching', async () => {
        const luxuryContext = { ...testContext, budgetTier: 'luxury' };
        const key = await (cacheService as any).generateCacheKey(testQuery, luxuryContext);
        
        expect(key).toContain('luxury');
      });

      it('should handle budget tier caching', async () => {
        const budgetContext = { ...testContext, budgetTier: 'budget' };
        const key = await (cacheService as any).generateCacheKey(testQuery, budgetContext);
        
        expect(key).toContain('budget');
      });
    });

    describe('Guest Count Scaling', () => {
      it('should categorize small weddings correctly', async () => {
        const smallWeddingContext = { ...testContext, guestCount: 30 };
        const key = await (cacheService as any).generateCacheKey(testQuery, smallWeddingContext);
        
        expect(key).toContain('small'); // Should categorize as small wedding
      });

      it('should categorize large weddings correctly', async () => {
        const largeWeddingContext = { ...testContext, guestCount: 250 };
        const key = await (cacheService as any).generateCacheKey(testQuery, largeWeddingContext);
        
        expect(key).toContain('large'); // Should categorize as large wedding
      });
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle Redis connection failures gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Connection refused'));
      mockSupabase.from().select().eq().single.mockResolvedValue({ data: null, error: null });
      
      const result = await cacheService.getCachedResponse(testQuery, testContext);
      
      // Should not throw, should fallback to database
      expect(result).toBeNull();
    });

    it('should handle database connection failures gracefully', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockSupabase.from().select().eq().single.mockResolvedValue({ 
        data: null, 
        error: { message: 'Connection failed' }
      });
      
      const result = await cacheService.getCachedResponse(testQuery, testContext);
      
      // Should not throw, should return null
      expect(result).toBeNull();
    });

    it('should handle malformed cache data', async () => {
      mockRedis.get.mockResolvedValue('invalid-json');
      
      const result = await cacheService.getCachedResponse(testQuery, testContext);
      
      // Should handle JSON parse error gracefully
      expect(result).toBeNull();
    });
  });

  describe('Health Check', () => {
    it('should return healthy status when all systems operational', async () => {
      mockRedis.ping.mockResolvedValue('PONG');
      mockRedis.info.mockResolvedValue('used_memory:1048576\nmaxmemory:10485760');
      mockSupabase.from().select().limit.mockResolvedValue({ data: [], error: null });
      
      const health = await cacheService.healthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.layers.redis.status).toBe('healthy');
      expect(health.layers.database.status).toBe('healthy');
    });

    it('should return degraded status when Redis is down', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Connection failed'));
      mockSupabase.from().select().limit.mockResolvedValue({ data: [], error: null });
      
      const health = await cacheService.healthCheck();
      
      expect(health.status).toBe('degraded');
      expect(health.layers.redis.status).toBe('unhealthy');
      expect(health.layers.database.status).toBe('healthy');
    });

    it('should return unhealthy status when database is down', async () => {
      mockRedis.ping.mockResolvedValue('PONG');
      mockSupabase.from().select().limit.mockResolvedValue({ 
        data: null, 
        error: { message: 'Database connection failed' }
      });
      
      const health = await cacheService.healthCheck();
      
      expect(health.status).toBe('degraded');
      expect(health.layers.database.status).toBe('unhealthy');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty query content', async () => {
      const emptyQuery = { ...testQuery, content: '' };
      
      const result = await cacheService.getCachedResponse(emptyQuery, testContext);
      
      expect(result).toBeNull();
    });

    it('should handle invalid wedding date', async () => {
      const invalidContext = { ...testContext, weddingDate: new Date('invalid') };
      
      const key = await (cacheService as any).generateCacheKey(testQuery, invalidContext);
      
      expect(key).toBeDefined();
      expect(key.length).toBeGreaterThan(0);
    });

    it('should handle missing location', async () => {
      const noLocationContext = { ...testContext, location: '' };
      
      const key = await (cacheService as any).generateCacheKey(testQuery, noLocationContext);
      
      expect(key).toBeDefined();
      expect(key).toContain('unknown_location');
    });

    it('should handle very large responses', async () => {
      const largeResponse = {
        venues: new Array(1000).fill(0).map((_, i) => ({ 
          id: i, 
          name: `Venue ${i}`,
          description: 'A'.repeat(1000) // 1KB per venue = ~1MB total
        }))
      };
      
      mockRedis.set.mockResolvedValue('OK');
      mockSupabase.from().insert.mockResolvedValue({ data: [{}], error: null });
      
      await expect(
        cacheService.setCachedResponse(testQuery, largeResponse, testContext)
      ).resolves.not.toThrow();
    });
  });

  describe('Performance Benchmarks', () => {
    it('should complete cache operations within performance targets', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({
        data: { venues: ['Test Venue'] },
        source: 'redis',
        timestamp: new Date().toISOString(),
        hitCount: 1,
        ttl: 3600
      }));
      
      const startTime = Date.now();
      await cacheService.getCachedResponse(testQuery, testContext);
      const endTime = Date.now();
      
      // Should complete within 50ms target
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('should handle concurrent requests efficiently', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({
        data: { venues: ['Test Venue'] },
        source: 'redis',
        timestamp: new Date().toISOString(),
        hitCount: 1,
        ttl: 3600
      }));
      
      const promises = Array.from({ length: 100 }, () => 
        cacheService.getCachedResponse(testQuery, testContext)
      );
      
      const startTime = Date.now();
      await Promise.all(promises);
      const endTime = Date.now();
      
      // 100 concurrent requests should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(500);
    });
  });
});