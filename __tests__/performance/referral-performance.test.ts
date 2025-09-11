/**
 * WS-344 Supplier Referral Gamification System - Performance Tests
 * Load testing, stress testing, and performance benchmarking
 * Ensures system can handle viral growth scenarios
 */

import { ReferralTrackingService } from '@/services/ReferralTrackingService';
import { createMockSupplier, createLoadTestData, setupMockDatabase } from '@/test-utils/factories';
import { supabase } from '@/lib/supabase';
import { redis } from '@/lib/redis';

// Mock external dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/redis');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockRedis = redis as jest.Mocked<typeof redis>;

describe('Referral System Performance Tests', () => {
  let service: ReferralTrackingService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReferralTrackingService();
    
    // Setup default fast mocks
    const fastQuery = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };
    
    mockSupabase.from.mockReturnValue(fastQuery as any);
    mockRedis.get.mockResolvedValue(null);
    mockRedis.setex.mockResolvedValue('OK');
  });

  describe('Referral Code Generation Performance', () => {
    it('should generate referral codes within 100ms', async () => {
      // Mock successful database check (code doesn't exist)
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const start = performance.now();
      const code = await service.generateReferralCode('test-supplier');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
      expect(code).toMatch(/^[A-Z0-9]{8}$/);
    });

    it('should handle concurrent referral code generation efficiently', async () => {
      // Mock database to return unique results for each call
      let callCount = 0;
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockImplementation(() => {
          callCount++;
          // All codes are unique (no collisions)
          return Promise.resolve({ data: null, error: null });
        }),
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const supplierIds = Array.from({ length: 50 }, (_, i) => `supplier-${i}`);
      
      const start = performance.now();
      
      const promises = supplierIds.map(id => service.generateReferralCode(id));
      const codes = await Promise.all(promises);
      
      const duration = performance.now() - start;

      // Should complete 50 concurrent generations within 2 seconds
      expect(duration).toBeLessThan(2000);
      
      // All codes should be unique
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
      
      // All codes should be valid format
      codes.forEach(code => {
        expect(code).toMatch(/^[A-Z0-9]{8}$/);
      });

      console.log(`Generated ${codes.length} codes in ${duration.toFixed(2)}ms (${(duration/codes.length).toFixed(2)}ms avg per code)`);
    });

    it('should handle collision scenarios efficiently', async () => {
      let attempts = 0;
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockImplementation(() => {
          attempts++;
          // First 2 attempts have collisions, 3rd succeeds
          if (attempts <= 2) {
            return Promise.resolve({ data: { code: 'EXISTING' }, error: null });
          } else {
            return Promise.resolve({ data: null, error: null });
          }
        }),
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const start = performance.now();
      const code = await service.generateReferralCode('supplier-with-collisions');
      const duration = performance.now() - start;

      // Should still complete quickly even with collisions
      expect(duration).toBeLessThan(500);
      expect(code).toMatch(/^[A-Z0-9]{8}$/);
      expect(mockQuery.single).toHaveBeenCalledTimes(3); // 2 collisions + 1 success
    });

    it('should maintain performance under high collision rates', async () => {
      // Simulate 80% collision rate
      let attempts = 0;
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockImplementation(() => {
          attempts++;
          // 80% chance of collision
          if (Math.random() < 0.8) {
            return Promise.resolve({ data: { code: 'COLLISION' }, error: null });
          } else {
            return Promise.resolve({ data: null, error: null });
          }
        }),
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const start = performance.now();
      const codes = await Promise.all([
        service.generateReferralCode('supplier-1'),
        service.generateReferralCode('supplier-2'),
        service.generateReferralCode('supplier-3'),
        service.generateReferralCode('supplier-4'),
        service.generateReferralCode('supplier-5')
      ]);
      const duration = performance.now() - start;

      // Should still complete within reasonable time despite high collision rate
      expect(duration).toBeLessThan(3000);
      expect(codes).toHaveLength(5);
      codes.forEach(code => expect(code).toMatch(/^[A-Z0-9]{8}$/));
    });
  });

  describe('Conversion Tracking Performance', () => {
    it('should track conversions within 200ms', async () => {
      const mockReferral = {
        id: 'ref-123',
        code: 'TESTCODE',
        referrer_id: 'supplier-123',
        status: 'active',
        created_at: new Date().toISOString()
      };

      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockReferral,
          error: null
        }),
      };

      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockReferral, status: 'converted' },
          error: null
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockSelectQuery as any)
        .mockReturnValueOnce(mockUpdateQuery as any);

      const start = performance.now();
      const result = await service.trackConversion('TESTCODE', 'first_payment', 'supplier-456');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(200);
      expect(result.success).toBe(true);
    });

    it('should handle batch conversion tracking efficiently', async () => {
      const referrals = Array.from({ length: 20 }, (_, i) => ({
        id: `ref-${i}`,
        code: `CODE${i.toString().padStart(4, '0')}`,
        referrer_id: `supplier-${i}`,
        status: 'active',
        created_at: new Date().toISOString()
      }));

      // Mock database responses for batch operations
      let selectCallIndex = 0;
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockImplementation(() => {
          const referral = referrals[selectCallIndex % referrals.length];
          selectCallIndex++;
          return Promise.resolve({ data: referral, error: null });
        }),
      };

      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { status: 'converted' },
          error: null
        }),
      };

      mockSupabase.from
        .mockImplementation((table) => {
          if (selectCallIndex % 2 === 1) {
            return mockSelectQuery as any;
          } else {
            return mockUpdateQuery as any;
          }
        });

      const start = performance.now();
      
      const trackingPromises = referrals.map(referral =>
        service.trackConversion(referral.code, 'signup_started', `different-supplier-${referral.id}`)
      );
      
      const results = await Promise.all(trackingPromises);
      const duration = performance.now() - start;

      // Should handle 20 concurrent conversions within 2 seconds
      expect(duration).toBeLessThan(2000);
      expect(results).toHaveLength(20);
      results.forEach(result => expect(result.success).toBe(true));

      console.log(`Tracked ${results.length} conversions in ${duration.toFixed(2)}ms (${(duration/results.length).toFixed(2)}ms avg per conversion)`);
    });

    it('should efficiently reject invalid conversion attempts', async () => {
      const invalidCodes = [
        'INVALID1', 'INVALID2', 'INVALID3', 'INVALID4', 'INVALID5',
        'TOOLONG123', 'SHORT', '12345678', 'SPECIAL!', ''
      ];

      const start = performance.now();
      
      const results = await Promise.all(
        invalidCodes.map(code => service.trackConversion(code, 'signup_started', 'supplier-test'))
      );
      
      const duration = performance.now() - start;

      // Should quickly reject all invalid codes
      expect(duration).toBeLessThan(100); // Very fast since no DB calls needed
      results.forEach(result => expect(result.success).toBe(false));
    });
  });

  describe('Leaderboard Performance', () => {
    it('should calculate leaderboard for large dataset within 500ms', async () => {
      // Create mock data for 1000 suppliers
      const { suppliers, leaderboard } = createLoadTestData(1000);
      
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: leaderboard.slice(0, 50), // Top 50
          error: null
        })
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const start = performance.now();
      const result = await service.calculateLeaderboards({ limit: 50 });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(500);
      expect(result.success).toBe(true);
      expect(result.data.entries).toHaveLength(50);

      console.log(`Calculated leaderboard for 1000 suppliers in ${duration.toFixed(2)}ms`);
    });

    it('should handle filtered leaderboards efficiently', async () => {
      const { leaderboard } = createLoadTestData(500);
      
      // Mock filtered results for different categories
      const categories = ['photography', 'catering', 'venue', 'florals', 'music'];
      
      const results = [];
      
      for (const category of categories) {
        const filteredData = leaderboard
          .filter(entry => entry.category === category)
          .slice(0, 25);

        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({
            data: filteredData,
            error: null
          })
        };
        mockSupabase.from.mockReturnValue(mockQuery as any);

        const start = performance.now();
        const result = await service.calculateLeaderboards({ 
          limit: 25, 
          category 
        });
        const duration = performance.now() - start;

        expect(duration).toBeLessThan(300);
        expect(result.success).toBe(true);
        
        results.push({ category, duration, count: result.data.entries.length });
      }

      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      console.log(`Average filtered leaderboard time: ${avgDuration.toFixed(2)}ms`);
      
      results.forEach(r => {
        console.log(`${r.category}: ${r.duration.toFixed(2)}ms for ${r.count} entries`);
      });
    });

    it('should support efficient pagination', async () => {
      const { leaderboard } = createLoadTestData(1000);
      
      const pageSize = 20;
      const totalPages = Math.ceil(leaderboard.length / pageSize);
      const pagesToTest = Math.min(totalPages, 10); // Test first 10 pages
      
      const results = [];
      
      for (let page = 0; page < pagesToTest; page++) {
        const offset = page * pageSize;
        const pageData = leaderboard.slice(offset, offset + pageSize);
        
        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          offset: jest.fn().mockResolvedValue({
            data: pageData,
            error: null
          })
        };
        mockSupabase.from.mockReturnValue(mockQuery as any);

        const start = performance.now();
        const result = await service.calculateLeaderboards({ 
          limit: pageSize, 
          offset 
        });
        const duration = performance.now() - start;

        expect(duration).toBeLessThan(400);
        expect(result.success).toBe(true);
        expect(result.data.entries).toHaveLength(pageData.length);
        
        results.push(duration);
      }

      const avgPaginationTime = results.reduce((sum, d) => sum + d, 0) / results.length;
      console.log(`Average pagination time: ${avgPaginationTime.toFixed(2)}ms per page`);
      
      // Verify pagination performance is consistent
      const maxTime = Math.max(...results);
      const minTime = Math.min(...results);
      expect(maxTime - minTime).toBeLessThan(200); // Variation should be < 200ms
    });

    it('should calculate trends efficiently', async () => {
      const currentData = Array.from({ length: 100 }, (_, i) => ({
        supplier_id: `sup-${i}`,
        supplier_name: `Supplier ${i}`,
        paid_conversions: Math.floor(Math.random() * 20) + 5,
        rank: i + 1
      }));

      const historicalData = currentData.map(entry => ({
        ...entry,
        paid_conversions: entry.paid_conversions - Math.floor(Math.random() * 5)
      }));

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn()
          .mockResolvedValueOnce({ data: currentData, error: null })    // Current
          .mockResolvedValueOnce({ data: historicalData, error: null }) // Historical
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const start = performance.now();
      const result = await service.calculateLeaderboards({ 
        limit: 50, 
        includeTrends: true 
      });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(800); // Allows for 2 queries + calculations
      expect(result.success).toBe(true);
      expect(result.data.entries[0].trend).toBeDefined();
      expect(result.data.entries[0].trendPercentage).toBeDefined();

      console.log(`Calculated trends for 100 suppliers in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not cause memory leaks during intensive operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform 100 intensive operations
      for (let i = 0; i < 100; i++) {
        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
        mockSupabase.from.mockReturnValue(mockQuery as any);
        
        await service.generateReferralCode(`supplier-${i}`);
        
        // Force garbage collection occasionally if available
        if (i % 25 === 0 && global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseKB = memoryIncrease / 1024;

      // Memory increase should be reasonable (< 10MB for 100 operations)
      expect(memoryIncreaseKB).toBeLessThan(10 * 1024);

      console.log(`Memory increase: ${memoryIncreaseKB.toFixed(2)}KB for 100 operations`);
    });

    it('should efficiently handle large data structures', async () => {
      const largeDataset = createLoadTestData(5000);
      
      const start = performance.now();
      
      // Process large dataset
      const processedData = largeDataset.suppliers.map(supplier => ({
        id: supplier.id,
        name: supplier.name,
        category: supplier.category,
        referralCount: supplier.referralCount,
        conversionCount: supplier.conversionCount,
        score: supplier.conversionCount * 10 + supplier.referralCount
      }));

      // Sort by score (simulate leaderboard calculation)
      processedData.sort((a, b) => b.score - a.score);
      
      // Take top 100
      const topSuppliers = processedData.slice(0, 100);
      
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100); // Pure JS operations should be very fast
      expect(topSuppliers).toHaveLength(100);
      expect(topSuppliers[0].score).toBeGreaterThanOrEqual(topSuppliers[99].score);

      console.log(`Processed ${largeDataset.suppliers.length} suppliers in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Cache Performance', () => {
    it('should utilize Redis caching for improved performance', async () => {
      const cacheKey = 'leaderboard:photography:top50';
      const cachedData = JSON.stringify([
        { supplier_id: 'cached-1', name: 'Cached Supplier', conversions: 15 }
      ]);

      // First call - cache miss, should hit database
      mockRedis.get.mockResolvedValueOnce(null);
      mockRedis.setex.mockResolvedValueOnce('OK');
      
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [{ supplier_id: 'db-1', name: 'DB Supplier', conversions: 12 }],
          error: null
        })
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const start1 = performance.now();
      await service.calculateLeaderboards({ limit: 50, category: 'photography' });
      const duration1 = performance.now() - start1;

      // Second call - cache hit, should be much faster
      mockRedis.get.mockResolvedValueOnce(cachedData);
      
      const start2 = performance.now();
      await service.calculateLeaderboards({ limit: 50, category: 'photography' });
      const duration2 = performance.now() - start2;

      // Cached version should be at least 50% faster
      expect(duration2).toBeLessThan(duration1 * 0.5);
      
      // Verify cache was used
      expect(mockRedis.get).toHaveBeenCalledTimes(2);
      expect(mockRedis.setex).toHaveBeenCalledTimes(1); // Only set on first call

      console.log(`Cache miss: ${duration1.toFixed(2)}ms, Cache hit: ${duration2.toFixed(2)}ms`);
    });

    it('should handle cache warming efficiently', async () => {
      const categories = ['photography', 'catering', 'venue', 'florals', 'music'];
      
      // Mock cache misses for all categories
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');
      
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: Array.from({ length: 25 }, (_, i) => ({
            supplier_id: `sup-${i}`,
            conversions: Math.floor(Math.random() * 20)
          })),
          error: null
        })
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const start = performance.now();
      
      // Warm cache for all categories simultaneously
      await Promise.all(categories.map(category =>
        service.calculateLeaderboards({ limit: 25, category })
      ));
      
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      expect(mockRedis.setex).toHaveBeenCalledTimes(categories.length);

      console.log(`Cache warming for ${categories.length} categories: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Stress Testing', () => {
    it('should handle viral growth scenario (exponential referrals)', async () => {
      // Simulate viral scenario: 1 user refers 3, each of those refer 3, etc.
      const levels = 4; // Total users: 1 + 3 + 9 + 27 + 81 = 121 users
      let totalUsers = 0;
      let currentLevelUsers = 1;
      
      const start = performance.now();
      
      for (let level = 0; level < levels; level++) {
        totalUsers += currentLevelUsers;
        
        // Mock database operations for this level
        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
        mockSupabase.from.mockReturnValue(mockQuery as any);
        
        // Generate referral codes for all users at this level
        const promises = Array.from({ length: currentLevelUsers }, (_, i) =>
          service.generateReferralCode(`viral-user-level${level}-${i}`)
        );
        
        await Promise.all(promises);
        
        currentLevelUsers *= 3; // Each user refers 3 others
      }
      
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(5000); // Should handle viral growth within 5 seconds
      expect(totalUsers).toBe(40); // 1 + 3 + 9 + 27 = 40

      console.log(`Handled viral growth (${totalUsers} users) in ${duration.toFixed(2)}ms`);
    });

    it('should maintain performance under sustained load', async () => {
      const sustainedLoadDurationMs = 5000; // 5 seconds
      const operationsPerSecond = 50;
      const totalOperations = (sustainedLoadDurationMs / 1000) * operationsPerSecond;
      
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);
      
      const start = performance.now();
      let completedOperations = 0;
      
      // Create continuous load
      const loadTest = async () => {
        const promises = [];
        
        while (performance.now() - start < sustainedLoadDurationMs) {
          promises.push(
            service.generateReferralCode(`load-test-${completedOperations++}`)
          );
          
          // Add small delay to simulate realistic load
          await new Promise(resolve => setTimeout(resolve, 20));
          
          // Process in batches to avoid overwhelming
          if (promises.length >= 10) {
            await Promise.all(promises);
            promises.length = 0;
          }
        }
        
        // Complete any remaining operations
        if (promises.length > 0) {
          await Promise.all(promises);
        }
      };
      
      await loadTest();
      const duration = performance.now() - start;
      
      expect(completedOperations).toBeGreaterThan(totalOperations * 0.8); // At least 80% of target
      expect(duration).toBeGreaterThan(sustainedLoadDurationMs * 0.9); // Test ran for expected duration
      
      const actualOpsPerSecond = (completedOperations / duration) * 1000;
      expect(actualOpsPerSecond).toBeGreaterThan(operationsPerSecond * 0.7); // Maintain 70% throughput

      console.log(`Sustained load: ${completedOperations} ops in ${duration.toFixed(2)}ms (${actualOpsPerSecond.toFixed(2)} ops/sec)`);
    });

    it('should gracefully degrade under extreme load', async () => {
      // Simulate database slowdown
      let responseTime = 50; // Start with 50ms
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockImplementation(() => {
          responseTime += 10; // Simulate increasing DB latency
          return new Promise(resolve => 
            setTimeout(() => resolve({ data: null, error: null }), Math.min(responseTime, 1000))
          );
        }),
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);
      
      const start = performance.now();
      
      // Try to perform operations under degrading conditions
      const operations = Array.from({ length: 10 }, (_, i) =>
        service.generateReferralCode(`degraded-${i}`)
      );
      
      const results = await Promise.allSettled(operations);
      const duration = performance.now() - start;
      
      // Should still complete, even if slower
      const successfulOps = results.filter(r => r.status === 'fulfilled').length;
      expect(successfulOps).toBeGreaterThanOrEqual(5); // At least 50% should succeed
      
      // Should not take excessively long
      expect(duration).toBeLessThan(15000); // Max 15 seconds for 10 operations
      
      console.log(`Degraded performance: ${successfulOps}/${operations.length} succeeded in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should maintain consistent performance across runs', async () => {
      const runs = 5;
      const operationsPerRun = 20;
      const durations: number[] = [];
      
      for (let run = 0; run < runs; run++) {
        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
        mockSupabase.from.mockReturnValue(mockQuery as any);
        
        const start = performance.now();
        
        await Promise.all(Array.from({ length: operationsPerRun }, (_, i) =>
          service.generateReferralCode(`consistency-run${run}-op${i}`)
        ));
        
        const duration = performance.now() - start;
        durations.push(duration);
        
        // Clear mocks between runs
        jest.clearAllMocks();
      }
      
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);
      const variance = maxDuration - minDuration;
      
      // Variance should be reasonable (not more than 100% difference)
      expect(variance).toBeLessThan(avgDuration);
      
      // All runs should complete within reasonable time
      durations.forEach(duration => {
        expect(duration).toBeLessThan(2000);
      });

      console.log(`Performance consistency: avg=${avgDuration.toFixed(2)}ms, min=${minDuration.toFixed(2)}ms, max=${maxDuration.toFixed(2)}ms, variance=${variance.toFixed(2)}ms`);
    });
  });
});