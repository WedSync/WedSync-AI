/**
 * WS-241 AI Caching Strategy System - Seasonal Scaling Automator Tests
 * Comprehensive test suite for SeasonalScalingAutomator
 * Team B - Backend Infrastructure & API Development
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { SeasonalScalingAutomator, SeasonConfig, ScalingAction, ScalingMetrics } from '@/lib/ai-cache/SeasonalScalingAutomator';

// Mock dependencies
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(() => ({
    set: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(null),
    ping: vi.fn().mockResolvedValue('PONG'),
    info: vi.fn().mockResolvedValue('used_memory:5242880\nmaxmemory:10485760'),
    config: vi.fn().mockResolvedValue('OK')
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
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn().mockResolvedValue({ data: [], error: null })
    }))
  }))
}));

describe('SeasonalScalingAutomator', () => {
  let scalingAutomator: SeasonalScalingAutomator;
  let mockRedis: any;
  let mockSupabase: any;

  beforeAll(() => {
    // Set required environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    process.env.REDIS_URL = 'redis://localhost:6379';
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    scalingAutomator = new SeasonalScalingAutomator(
      'https://test.supabase.co',
      'test-service-key',
      'redis://localhost:6379'
    );

    mockRedis = (scalingAutomator as any).redis;
    mockSupabase = (scalingAutomator as any).supabase;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Season Detection', () => {
    it('should correctly identify peak wedding season (summer)', () => {
      const summerDate = new Date('2024-07-15');
      const season = scalingAutomator.getCurrentSeason(summerDate);
      
      expect(season.name).toBe('peak');
      expect(season.months).toContain(7);
      expect(season.trafficMultiplier).toBe(3.0);
      expect(season.preloadStrategy).toBe('aggressive');
    });

    it('should correctly identify high season (spring/fall)', () => {
      const springDate = new Date('2024-04-15');
      const season = scalingAutomator.getCurrentSeason(springDate);
      
      expect(season.name).toBe('high');
      expect(season.months).toContain(4);
      expect(season.trafficMultiplier).toBe(2.2);
      expect(season.preloadStrategy).toBe('moderate');
    });

    it('should correctly identify moderate season', () => {
      const marchDate = new Date('2024-03-15');
      const season = scalingAutomator.getCurrentSeason(marchDate);
      
      expect(season.name).toBe('moderate');
      expect(season.months).toContain(3);
      expect(season.trafficMultiplier).toBe(1.4);
      expect(season.preloadStrategy).toBe('moderate');
    });

    it('should correctly identify low season (winter)', () => {
      const winterDate = new Date('2024-01-15');
      const season = scalingAutomator.getCurrentSeason(winterDate);
      
      expect(season.name).toBe('low');
      expect(season.months).toContain(1);
      expect(season.trafficMultiplier).toBe(0.7);
      expect(season.preloadStrategy).toBe('conservative');
    });
  });

  describe('Seasonal Transition Prediction', () => {
    it('should predict upcoming seasonal transitions', async () => {
      // Mock current date as late March (moderate season)
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-03-28'));
      
      const predictions = await scalingAutomator.predictSeasonalTransition(10);
      
      expect(predictions.upcomingTransitions).toHaveLength(1);
      expect(predictions.upcomingTransitions[0].toSeason.name).toBe('high'); // April
      expect(predictions.recommendedActions).toContain(
        expect.objectContaining({ type: 'scale_up' })
      );
      
      vi.useRealTimers();
    });

    it('should recommend preloading for major transitions', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-05-25')); // Late May, transitioning to peak summer
      
      const predictions = await scalingAutomator.predictSeasonalTransition(15);
      
      const preloadAction = predictions.recommendedActions.find(
        action => action.type === 'preload'
      );
      
      expect(preloadAction).toBeDefined();
      expect(preloadAction?.target).toBe('redis');
      
      vi.useRealTimers();
    });

    it('should not predict transitions when none are imminent', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-07-15')); // Mid-peak season
      
      const predictions = await scalingAutomator.predictSeasonalTransition(10);
      
      expect(predictions.upcomingTransitions).toHaveLength(0);
      expect(predictions.recommendedActions).toHaveLength(0);
      
      vi.useRealTimers();
    });
  });

  describe('Scaling Execution', () => {
    beforeEach(() => {
      // Mock successful Redis and database operations
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.config.mockResolvedValue('OK');
      mockRedis.get.mockResolvedValue(null);
      mockSupabase.from().insert.mockResolvedValue({ data: [{}], error: null });
    });

    it('should execute scaling when needed', async () => {
      // Mock conditions that indicate scaling is needed
      (scalingAutomator as any).isScalingNeeded = vi.fn().mockResolvedValue(true);
      (scalingAutomator as any).gatherScalingMetrics = vi.fn().mockResolvedValue({
        currentSeason: { name: 'peak', trafficMultiplier: 3.0 },
        predictedLoad: 3.2,
        currentCacheUtilization: 82,
        recommendedActions: [{ type: 'scale_up', target: 'all' }],
        nextScalingCheck: new Date(),
        cost_implications: {
          current_monthly_cost: 100,
          projected_monthly_cost: 250,
          savings_from_scaling: 150
        }
      });

      const result = await scalingAutomator.executeSeasonalScaling();

      expect(result.scalingExecuted).toBe(true);
      expect(result.actions).toContain(
        expect.objectContaining({ type: 'scale_up' })
      );
      expect(result.errors).toHaveLength(0);
    });

    it('should skip scaling when not needed', async () => {
      (scalingAutomator as any).isScalingNeeded = vi.fn().mockResolvedValue(false);
      (scalingAutomator as any).gatherScalingMetrics = vi.fn().mockResolvedValue({
        currentSeason: { name: 'low', trafficMultiplier: 0.7 },
        predictedLoad: 0.6,
        currentCacheUtilization: 35,
        recommendedActions: [],
        nextScalingCheck: new Date(),
        cost_implications: {
          current_monthly_cost: 100,
          projected_monthly_cost: 80,
          savings_from_scaling: 20
        }
      });

      const result = await scalingAutomator.executeSeasonalScaling();

      expect(result.scalingExecuted).toBe(false);
      expect(result.actions).toHaveLength(0);
    });

    it('should handle scaling errors gracefully', async () => {
      (scalingAutomator as any).isScalingNeeded = vi.fn().mockResolvedValue(true);
      (scalingAutomator as any).gatherScalingMetrics = vi.fn().mockResolvedValue({
        currentSeason: { name: 'peak', trafficMultiplier: 3.0 },
        predictedLoad: 3.5,
        currentCacheUtilization: 90,
        recommendedActions: [{ type: 'scale_up', target: 'all' }],
        nextScalingCheck: new Date(),
        cost_implications: {
          current_monthly_cost: 100,
          projected_monthly_cost: 300,
          savings_from_scaling: 200
        }
      });

      // Mock Redis failure
      mockRedis.config.mockRejectedValue(new Error('Redis configuration failed'));

      const result = await scalingAutomator.executeSeasonalScaling();

      expect(result.scalingExecuted).toBe(false);
      expect(result.errors).toContain('Redis configuration failed');
    });
  });

  describe('Load Prediction', () => {
    it('should calculate predicted load based on historical data', async () => {
      const mockHistoricalData = [
        { 
          avg_requests_per_minute: 100, 
          created_at: new Date('2023-07-15').toISOString() // Same season last year
        },
        { 
          avg_requests_per_minute: 120, 
          created_at: new Date('2023-07-20').toISOString()
        },
        { 
          avg_requests_per_minute: 110, 
          created_at: new Date('2023-07-25').toISOString()
        }
      ];

      mockSupabase.from().select().gte().order.mockResolvedValue({
        data: mockHistoricalData,
        error: null
      });

      const currentSeason = scalingAutomator.getCurrentSeason(new Date('2024-07-15'));
      const predictedLoad = await (scalingAutomator as any).calculatePredictedLoad(currentSeason);

      expect(predictedLoad).toBeGreaterThan(currentSeason.trafficMultiplier);
      expect(predictedLoad).toBeCloseTo(110, 0); // Average of historical data
    });

    it('should fallback to season multiplier when no historical data', async () => {
      mockSupabase.from().select().gte().order.mockResolvedValue({
        data: [],
        error: null
      });

      const currentSeason = scalingAutomator.getCurrentSeason();
      const predictedLoad = await (scalingAutomator as any).calculatePredictedLoad(currentSeason);

      expect(predictedLoad).toBe(currentSeason.trafficMultiplier);
    });

    it('should apply trend analysis to predictions', async () => {
      const growingTrendData = [
        { 
          avg_requests_per_minute: 80, 
          created_at: new Date('2023-01-15').toISOString()
        },
        { 
          avg_requests_per_minute: 100, 
          created_at: new Date('2023-07-15').toISOString()
        },
        { 
          avg_requests_per_minute: 120, 
          created_at: new Date('2024-01-15').toISOString()
        }
      ];

      mockSupabase.from().select().gte().order.mockResolvedValue({
        data: growingTrendData,
        error: null
      });

      const currentSeason = scalingAutomator.getCurrentSeason();
      const predictedLoad = await (scalingAutomator as any).calculatePredictedLoad(currentSeason);

      expect(predictedLoad).toBeGreaterThan(100); // Should account for growth trend
    });
  });

  describe('Cache Capacity Management', () => {
    it('should adjust Redis memory limits for peak season', async () => {
      const peakSeason = scalingAutomator.getCurrentSeason(new Date('2024-07-15'));
      
      await (scalingAutomator as any).adjustCacheCapacity(peakSeason);
      
      expect(mockRedis.config).toHaveBeenCalledWith('SET', 'maxmemory', expect.any(String));
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('capacity_config'),
        expect.stringContaining('"multiplier":2.5'),
        expect.any(Object)
      );
    });

    it('should reduce memory limits for off-season', async () => {
      const lowSeason = scalingAutomator.getCurrentSeason(new Date('2024-01-15'));
      
      await (scalingAutomator as any).adjustCacheCapacity(lowSeason);
      
      expect(mockRedis.config).toHaveBeenCalledWith('SET', 'maxmemory', expect.any(String));
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('capacity_config'),
        expect.stringContaining('"multiplier":0.8'),
        expect.any(Object)
      );
    });
  });

  describe('Preload Strategy Execution', () => {
    it('should execute aggressive preloading for peak season', async () => {
      const peakSeason = scalingAutomator.getCurrentSeason(new Date('2024-07-15'));
      
      await (scalingAutomator as any).executePreloadStrategy(peakSeason);
      
      // Should preload all 4 cache types for peak season
      expect(mockRedis.set).toHaveBeenCalledTimes(4);
      
      // Verify aggressive strategy cache types are preloaded
      const preloadCalls = mockRedis.set.mock.calls.filter(call => 
        call[0].includes(':preload:')
      );
      
      expect(preloadCalls).toHaveLength(4);
    });

    it('should execute conservative preloading for low season', async () => {
      const lowSeason = scalingAutomator.getCurrentSeason(new Date('2024-01-15'));
      
      await (scalingAutomator as any).executePreloadStrategy(lowSeason);
      
      // Should preload only 1 cache type for low season
      expect(mockRedis.set).toHaveBeenCalledTimes(1);
    });
  });

  describe('Eviction Policy Management', () => {
    it('should set LFU policy for peak season', async () => {
      const peakSeason = scalingAutomator.getCurrentSeason(new Date('2024-07-15'));
      
      await (scalingAutomator as any).updateEvictionPolicies(peakSeason);
      
      expect(mockRedis.config).toHaveBeenCalledWith(
        'SET', 
        'maxmemory-policy', 
        'allkeys-lfu'
      );
    });

    it('should set LRU policy for moderate seasons', async () => {
      const moderateSeason = scalingAutomator.getCurrentSeason(new Date('2024-03-15'));
      
      await (scalingAutomator as any).updateEvictionPolicies(moderateSeason);
      
      expect(mockRedis.config).toHaveBeenCalledWith(
        'SET', 
        'maxmemory-policy', 
        'allkeys-lru'
      );
    });

    it('should set TTL-based policy for low season', async () => {
      const lowSeason = scalingAutomator.getCurrentSeason(new Date('2024-01-15'));
      
      await (scalingAutomator as any).updateEvictionPolicies(lowSeason);
      
      expect(mockRedis.config).toHaveBeenCalledWith(
        'SET', 
        'maxmemory-policy', 
        'volatile-ttl'
      );
    });
  });

  describe('Cost Estimation', () => {
    it('should calculate cost savings from scaling', async () => {
      const currentSeason = scalingAutomator.getCurrentSeason(new Date('2024-07-15')); // Peak
      const costs = await (scalingAutomator as any).estimateScalingCosts(currentSeason, 3.5);

      expect(costs.current_monthly_cost).toBeGreaterThan(0);
      expect(costs.projected_monthly_cost).toBeGreaterThan(0);
      expect(costs.savings_from_scaling).toBeGreaterThan(0);

      // During peak season with high load, scaling should provide significant savings
      expect(costs.savings_from_scaling).toBeGreaterThan(1000); // Substantial savings expected
    });

    it('should account for cache hit rate in cost calculations', async () => {
      const currentSeason = scalingAutomator.getCurrentSeason();
      const costs = await (scalingAutomator as any).estimateScalingCosts(currentSeason, 2.0);

      // With 85% hit rate, should save significant AI API costs
      const expectedApiCalls = 100000 * 2.0 * (1 - 0.85); // 30,000 API calls
      const expectedApiCost = expectedApiCalls * 0.002; // $60 in API costs

      expect(costs.savings_from_scaling).toBeGreaterThan(expectedApiCost);
    });
  });

  describe('Recommended Actions Generation', () => {
    it('should recommend immediate scaling for high utilization', async () => {
      const currentSeason = scalingAutomator.getCurrentSeason();
      const actions = await (scalingAutomator as any).generateRecommendedActions(
        currentSeason,
        2.0, // predicted load
        87   // high utilization
      );

      const immediateAction = actions.find(action => 
        action.priority === 'immediate' && action.type === 'scale_up'
      );
      
      expect(immediateAction).toBeDefined();
      expect(immediateAction?.business_impact).toBe('moderate');
    });

    it('should recommend scheduled scaling for predicted load increases', async () => {
      const currentSeason = scalingAutomator.getCurrentSeason();
      const actions = await (scalingAutomator as any).generateRecommendedActions(
        currentSeason,
        2.8, // high predicted load (> 1.5x season multiplier)
        60   // normal utilization
      );

      const scheduledAction = actions.find(action => 
        action.priority === 'scheduled' && action.type === 'preload'
      );
      
      expect(scheduledAction).toBeDefined();
    });

    it('should recommend scaling down during low season', async () => {
      const lowSeason = scalingAutomator.getCurrentSeason(new Date('2024-01-15'));
      const actions = await (scalingAutomator as any).generateRecommendedActions(
        lowSeason,
        0.6, // low predicted load
        35   // low utilization
      );

      const scaleDownAction = actions.find(action => action.type === 'scale_down');
      
      expect(scaleDownAction).toBeDefined();
      expect(scaleDownAction?.priority).toBe('maintenance_window');
    });
  });

  describe('Audit and Logging', () => {
    it('should log scaling activity to database', async () => {
      const activity = {
        season: 'peak',
        actions: [{ type: 'scale_up', target: 'all' }] as ScalingAction[],
        timestamp: new Date(),
        metrics: {} as ScalingMetrics
      };

      await (scalingAutomator as any).logScalingActivity(activity);

      expect(mockSupabase.from).toHaveBeenCalledWith('ai_cache_scaling_logs');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          season: 'peak',
          actions: activity.actions,
          metrics: activity.metrics
        })
      );
    });

    it('should store scaling timestamp in Redis', async () => {
      const activity = {
        season: 'high',
        actions: [],
        timestamp: new Date(),
        metrics: {} as ScalingMetrics
      };

      await (scalingAutomator as any).logScalingActivity(activity);

      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('last_scaling'),
        activity.timestamp.toISOString(),
        expect.any(Object)
      );
    });
  });

  describe('Health Check', () => {
    it('should return healthy status when all systems operational', async () => {
      mockRedis.ping.mockResolvedValue('PONG');
      mockSupabase.from().select().limit.mockResolvedValue({ data: [], error: null });
      mockRedis.get.mockResolvedValue(new Date(Date.now() - 60 * 60 * 1000).toISOString()); // 1 hour ago

      const health = await scalingAutomator.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.checks).toContain(
        expect.objectContaining({
          name: 'Redis connectivity',
          status: 'pass'
        })
      );
      expect(health.checks).toContain(
        expect.objectContaining({
          name: 'Supabase connectivity',
          status: 'pass'
        })
      );
    });

    it('should return degraded status when Redis is down', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Connection refused'));
      mockSupabase.from().select().limit.mockResolvedValue({ data: [], error: null });

      const health = await scalingAutomator.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.checks).toContain(
        expect.objectContaining({
          name: 'Redis connectivity',
          status: 'fail'
        })
      );
    });

    it('should return degraded status when scaling activity is stale', async () => {
      mockRedis.ping.mockResolvedValue('PONG');
      mockSupabase.from().select().limit.mockResolvedValue({ data: [], error: null });
      mockRedis.get.mockResolvedValue(new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString()); // 50 hours ago

      const health = await scalingAutomator.healthCheck();

      expect(health.status).toBe('degraded');
      expect(health.checks).toContain(
        expect.objectContaining({
          name: 'Recent scaling activity',
          status: 'fail',
          details: expect.stringContaining('50 hours ago')
        })
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle Redis connection failures gracefully', async () => {
      mockRedis.set.mockRejectedValue(new Error('Connection lost'));
      
      const result = await scalingAutomator.executeSeasonalScaling();
      
      expect(result.scalingExecuted).toBe(false);
      expect(result.errors).toContain('Connection lost');
    });

    it('should handle database connection failures gracefully', async () => {
      mockSupabase.from().insert.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      });

      const result = await scalingAutomator.executeSeasonalScaling();

      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle invalid season data gracefully', async () => {
      const invalidDate = new Date('invalid-date');
      const season = scalingAutomator.getCurrentSeason(invalidDate);

      // Should fallback to current date
      expect(season).toBeDefined();
      expect(season.name).toMatch(/^(peak|high|moderate|low)$/);
    });

    it('should handle missing Redis memory info gracefully', async () => {
      mockRedis.info.mockResolvedValue(''); // Empty info

      const metrics = await (scalingAutomator as any).gatherScalingMetrics(
        scalingAutomator.getCurrentSeason()
      );

      expect(metrics.currentCacheUtilization).toBe(0);
    });
  });

  describe('Performance and Concurrency', () => {
    it('should complete scaling operations within performance targets', async () => {
      (scalingAutomator as any).isScalingNeeded = vi.fn().mockResolvedValue(true);
      (scalingAutomator as any).gatherScalingMetrics = vi.fn().mockResolvedValue({
        currentSeason: { name: 'peak', trafficMultiplier: 3.0 },
        predictedLoad: 3.0,
        currentCacheUtilization: 75,
        recommendedActions: [],
        nextScalingCheck: new Date(),
        cost_implications: { current_monthly_cost: 100, projected_monthly_cost: 200, savings_from_scaling: 100 }
      });

      const startTime = Date.now();
      await scalingAutomator.executeSeasonalScaling();
      const endTime = Date.now();

      // Scaling should complete within 2 minutes
      expect(endTime - startTime).toBeLessThan(2 * 60 * 1000);
    });

    it('should handle concurrent scaling requests safely', async () => {
      (scalingAutomator as any).isScalingNeeded = vi.fn().mockResolvedValue(true);
      (scalingAutomator as any).gatherScalingMetrics = vi.fn().mockResolvedValue({
        currentSeason: { name: 'high', trafficMultiplier: 2.2 },
        predictedLoad: 2.2,
        currentCacheUtilization: 70,
        recommendedActions: [],
        nextScalingCheck: new Date(),
        cost_implications: { current_monthly_cost: 100, projected_monthly_cost: 150, savings_from_scaling: 50 }
      });

      // Run multiple scaling operations concurrently
      const promises = Array.from({ length: 5 }, () => 
        scalingAutomator.executeSeasonalScaling()
      );

      const results = await Promise.all(promises);

      // All should complete successfully without conflicts
      results.forEach(result => {
        expect(result.errors.length).toBeLessThanOrEqual(1); // Allow for some expected race conditions
      });
    });
  });
});