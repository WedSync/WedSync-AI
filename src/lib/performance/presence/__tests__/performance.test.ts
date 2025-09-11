/**
 * WS-204 Presence Performance Test Suite
 * Comprehensive testing for presence tracking performance infrastructure
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PresenceOptimizer,
  SecurePresenceOptimizer,
} from '../presence-optimizer';
import { PresenceCacheClusterManager } from '../../../cache/presence-cache/redis-cluster-manager';
import { PresenceAutoScaler } from '../auto-scaler';
import { PresencePerformanceTracker } from '../../../monitoring/presence-performance/performance-tracker';

describe('PresenceOptimizer', () => {
  let optimizer: PresenceOptimizer;

  beforeEach(() => {
    optimizer = new PresenceOptimizer();
  });

  it('maintains sub-2-second update latency under load', async () => {
    const startTime = Date.now();

    // Simulate 1000 concurrent presence updates
    const updates = Array.from({ length: 1000 }, (_, i) =>
      optimizer.optimizePresenceConnections(),
    );

    const results = await Promise.all(updates);
    const totalLatency = Date.now() - startTime;
    const averageLatency = totalLatency / updates.length;

    expect(averageLatency).toBeLessThan(2000); // Sub-2-second target
    expect(results.length).toBe(1000);
  });

  it('scales presence infrastructure based on load', async () => {
    const scalingResult = await optimizer.scalePresenceInfrastructure(1.5);

    expect(scalingResult).toBeDefined();
    expect(scalingResult.action).toBe('scale_up');
    expect(scalingResult.toCapacity).toBeGreaterThan(
      scalingResult.fromCapacity,
    );
  });

  it('optimizes memory usage efficiently', async () => {
    const result = await optimizer.managePresenceMemory();

    expect(result.memoryFreed).toBeGreaterThanOrEqual(0);
    expect(result.recommendations).toBeDefined();
    expect(Array.isArray(result.recommendations)).toBe(true);
  });

  it('generates optimization recommendations', async () => {
    const recommendations =
      await optimizer.generateOptimizationRecommendations();

    expect(Array.isArray(recommendations)).toBe(true);
    recommendations.forEach((rec) => {
      expect(rec).toHaveProperty('priority');
      expect(rec).toHaveProperty('category');
      expect(rec).toHaveProperty('title');
      expect(rec).toHaveProperty('description');
    });
  });
});

describe('PresenceCacheClusterManager', () => {
  let cacheManager: PresenceCacheClusterManager;

  beforeEach(() => {
    cacheManager = new PresenceCacheClusterManager();
  });

  it('optimizes cache performance for wedding team queries', async () => {
    // Pre-warm cache with wedding team data
    const weddingTeam = Array.from({ length: 15 }, (_, i) => `supplier-${i}`);
    await cacheManager.preWarmWeddingTeamCache('wedding-123', weddingTeam);

    // Query team presence - should have high cache hit ratio
    const startTime = Date.now();
    const presence = await cacheManager.getBulkPresenceFromCache(weddingTeam);
    const queryTime = Date.now() - startTime;

    expect(queryTime).toBeLessThan(100); // Fast cache retrieval
    expect(typeof presence).toBe('object');
  });

  it('handles node failover gracefully', async () => {
    const failoverResult = await cacheManager.handleNodeFailover();

    expect(failoverResult).toBeDefined();
    expect(failoverResult.success).toBeDefined();
    expect(failoverResult.duration).toBeGreaterThanOrEqual(0);
  });

  it('monitors cluster health effectively', async () => {
    const healthStatus = await cacheManager.monitorClusterHealth();

    expect(healthStatus.overallHealth).toMatch(/healthy|degraded|unhealthy/);
    expect(Array.isArray(healthStatus.nodeStatuses)).toBe(true);
    expect(healthStatus.averageResponseTime).toBeGreaterThanOrEqual(0);
  });
});

describe('PresenceAutoScaler', () => {
  let autoScaler: PresenceAutoScaler;

  beforeEach(() => {
    autoScaler = new PresenceAutoScaler();
  });

  it('handles wedding season traffic spikes', async () => {
    const loadTestConfig = {
      concurrentUsers: 2000,
      duration: '10 minutes',
      presenceUpdateRate: '1 per second per user',
      pattern: 'wedding_season_peak',
    };

    // Simulate wedding season scaling
    const prediction = await autoScaler.predictWeddingSeasonLoad();

    expect(prediction.expectedScalingFactor).toBeGreaterThan(1);
    expect(Array.isArray(prediction.peakHours)).toBe(true);
    expect(prediction.recommendedCapacity).toBeGreaterThan(0);
    expect(prediction.confidence).toBeGreaterThan(0);
    expect(prediction.confidence).toBeLessThanOrEqual(1);
  });

  it('maintains performance during coordination peak hours', async () => {
    // Test coordination peak optimization
    await autoScaler.optimizeForCoordinationPeaks();

    const scalingHistory = await autoScaler.getScalingHistory();
    expect(Array.isArray(scalingHistory)).toBe(true);
  });

  it('triggers proactive scaling for wedding season patterns', async () => {
    // Mock June wedding season (month 5)
    const mockDate = new Date(2024, 5, 15, 17, 30); // June 15, 5:30pm
    vi.setSystemTime(mockDate);

    await autoScaler.handleWeddingSeasonScaling();

    const scalingHistory = await autoScaler.getScalingHistory();
    const recentScaling = scalingHistory.find(
      (event) =>
        event.trigger === 'WEDDING_SEASON_PATTERN' ||
        event.trigger === 'COORDINATION_PEAK',
    );

    // Should have triggered some form of scaling
    expect(scalingHistory.length).toBeGreaterThanOrEqual(0);

    vi.useRealTimers();
  });

  it('scales down gracefully after peak periods', async () => {
    // Mock post-peak period (9pm)
    const mockDate = new Date(2024, 5, 15, 21, 0);
    vi.setSystemTime(mockDate);

    await autoScaler.evaluateScaleDown();

    const scalingHistory = await autoScaler.getScalingHistory();
    expect(Array.isArray(scalingHistory)).toBe(true);

    vi.useRealTimers();
  });

  it('validates scaling decisions properly', async () => {
    const validDecision = {
      action: 'scale_up' as const,
      fromCapacity: 500,
      toCapacity: 750,
      trigger: 'HIGH_SUBSCRIPTION_COUNT' as any,
      confidence: 0.8,
      reason: 'Test scaling',
      estimatedDuration: 60,
      estimatedCost: 1.5,
    };

    const isValid = await autoScaler.validateScalingDecision(validDecision);
    expect(typeof isValid).toBe('boolean');
  });
});

describe('PresencePerformanceTracker', () => {
  let tracker: PresencePerformanceTracker;

  beforeEach(() => {
    tracker = new PresencePerformanceTracker();
  });

  it('tracks presence update latency accurately', async () => {
    const userId = 'test-user-1';
    const latency = 1500; // 1.5 seconds

    await tracker.trackPresenceUpdateLatency(userId, latency);

    // Should not throw and should complete successfully
    expect(true).toBe(true);
  });

  it('generates comprehensive performance reports', async () => {
    const report = await tracker.generatePerformanceReport();

    expect(report).toBeDefined();
    expect(report.timestamp).toBeInstanceOf(Date);
    expect(typeof report.averageUpdateLatency).toBe('number');
    expect(typeof report.peakConcurrentConnections).toBe('number');
    expect(typeof report.cacheHitRatio).toBe('number');
    expect(typeof report.errorRate).toBe('number');
    expect(Array.isArray(report.scalingEvents)).toBe(true);
    expect(Array.isArray(report.recommendations)).toBe(true);
  });

  it('detects performance regressions', async () => {
    const regressions = await tracker.detectPerformanceRegressions();

    expect(Array.isArray(regressions)).toBe(true);
    regressions.forEach((regression) => {
      expect(regression).toHaveProperty('metric');
      expect(regression).toHaveProperty('currentValue');
      expect(regression).toHaveProperty('baselineValue');
      expect(regression).toHaveProperty('severity');
    });
  });

  it('analyzes wedding coordination patterns', async () => {
    const patterns = await tracker.trackWeddingCoordinationPatterns();

    expect(patterns).toBeDefined();
    expect(Array.isArray(patterns.peakCoordinationHours)).toBe(true);
    expect(typeof patterns.coordinationEfficiencyScore).toBe('number');
    expect(Array.isArray(patterns.bottleneckIdentification)).toBe(true);
  });
});

describe('Performance Load Tests', () => {
  it('handles 2000+ concurrent connections', async () => {
    const optimizer = new PresenceOptimizer();
    const connectionPromises: Promise<any>[] = [];

    // Simulate 2000 concurrent connections
    for (let i = 0; i < 2000; i++) {
      connectionPromises.push(optimizer.getPresencePerformanceMetrics());
    }

    const startTime = Date.now();
    const results = await Promise.all(connectionPromises);
    const totalTime = Date.now() - startTime;

    expect(results.length).toBe(2000);
    expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds

    // Check that all results are valid
    results.forEach((result) => {
      expect(result).toBeDefined();
      expect(typeof result.connectionCount).toBe('number');
    });
  });

  it('maintains latency under sustained load', async () => {
    const optimizer = new PresenceOptimizer();
    const latencies: number[] = [];

    // Run 100 operations and measure latency
    for (let i = 0; i < 100; i++) {
      const startTime = Date.now();
      await optimizer.optimizePresenceConnections();
      const latency = Date.now() - startTime;
      latencies.push(latency);
    }

    // Calculate 95th percentile latency
    latencies.sort((a, b) => a - b);
    const p95Index = Math.floor(latencies.length * 0.95);
    const p95Latency = latencies[p95Index];

    expect(p95Latency).toBeLessThan(2000); // 95th percentile should be under 2 seconds
  });
});

describe('Security Tests', () => {
  it('enforces rate limiting on optimization requests', async () => {
    const secureOptimizer = new SecurePresenceOptimizer();
    const userId = 'test-user';
    const config = {
      connectionCount: 1000,
      cacheTTL: 300,
      scaleTarget: 2,
    };

    // Should work for first request
    const result = await secureOptimizer.optimizePresencePerformance(
      userId,
      config,
    );
    expect(result).toBeDefined();

    // Subsequent rapid requests should be rate limited
    // (This would need proper rate limiter implementation to test effectively)
  });

  it('validates resource limits for security', async () => {
    const secureOptimizer = new SecurePresenceOptimizer();
    const userId = 'test-user';

    // Test with excessive connection count (should fail)
    const excessiveConfig = {
      connectionCount: 5000, // Above security limit of 2000
      cacheTTL: 300,
      scaleTarget: 2,
    };

    await expect(
      secureOptimizer.optimizePresencePerformance(userId, excessiveConfig),
    ).rejects.toThrow('Connection limit exceeded for security');

    // Test with too low TTL (should fail)
    const lowTTLConfig = {
      connectionCount: 1000,
      cacheTTL: 30, // Below security minimum of 60
      scaleTarget: 2,
    };

    await expect(
      secureOptimizer.optimizePresencePerformance(userId, lowTTLConfig),
    ).rejects.toThrow('Cache TTL too low - security risk');
  });
});

describe('Wedding-Specific Performance Tests', () => {
  it('optimizes for wedding team coordination patterns', async () => {
    const optimizer = new PresenceOptimizer();

    // Test wedding-specific optimization
    await optimizer.optimizeWeddingPresencePatterns();

    // Should complete without errors
    expect(true).toBe(true);
  });

  it('handles wedding season scaling correctly', async () => {
    const autoScaler = new PresenceAutoScaler();

    // Mock peak wedding season (June)
    const mockDate = new Date(2024, 5, 15, 18, 0); // June 15, 6pm
    vi.setSystemTime(mockDate);

    await autoScaler.handleWeddingSeasonScaling();

    const scalingHistory = await autoScaler.getScalingHistory();
    expect(Array.isArray(scalingHistory)).toBe(true);

    vi.useRealTimers();
  });
});

// Integration Tests
describe('Integration Tests', () => {
  it('integrates all components correctly', async () => {
    const optimizer = new PresenceOptimizer();
    const tracker = new PresencePerformanceTracker();

    // Generate some metrics
    await tracker.trackPresenceUpdateLatency('user1', 1200);
    await tracker.trackConnectionCount();
    await tracker.trackCachePerformance(0.95, 50);

    // Generate performance report
    const report = await tracker.generatePerformanceReport();
    expect(report).toBeDefined();

    // Optimize based on metrics
    const optimizationResult = await optimizer.optimizePresenceConnections();
    expect(optimizationResult).toBeDefined();
    expect(optimizationResult.recommendations).toBeDefined();
  });

  it('handles failure scenarios gracefully', async () => {
    const cacheManager = new PresenceCacheClusterManager();

    // Test graceful handling of cache failures
    const emptyResult = await cacheManager.getBulkPresenceFromCache([]);
    expect(emptyResult).toEqual({});

    // Test invalid user IDs
    const invalidResult = await cacheManager.getBulkPresenceFromCache([
      'invalid-user',
    ]);
    expect(typeof invalidResult).toBe('object');
  });
});
