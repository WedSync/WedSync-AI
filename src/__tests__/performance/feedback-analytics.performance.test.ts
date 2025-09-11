/**
 * PERFORMANCE TESTS: WS-236 Feedback Analytics & Aggregation
 * Team E - Batch 2, Round 1
 *
 * Testing performance and scalability of:
 * - Feedback data aggregation at scale
 * - Real-time analytics calculations
 * - Dashboard rendering with large datasets
 * - Wedding season load testing
 * - Multi-tenant data isolation performance
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  jest,
} from '@jest/globals';
import { PerformanceObserver } from 'perf_hooks';
import { FeedbackAnalyticsEngine } from '@/lib/feedback/analytics-engine';
import { NPSManager } from '@/lib/feedback/nps-manager';
import { FeedbackDataGenerator } from '@/lib/testing/feedback-data-generator';
import { DatabasePerformanceMonitor } from '@/lib/performance/db-monitor';
import { supabase } from '@/lib/supabase';

// Mock dependencies for performance testing
jest.mock('@/lib/supabase');

interface PerformanceMetrics {
  executionTime: number;
  memoryUsage: number;
  databaseQueries: number;
  cacheHits: number;
  throughput: number;
}

interface ScaleTestParams {
  userCount: number;
  feedbackSessionsPerUser: number;
  responsesPerSession: number;
  timeRangeMonths: number;
  concurrentUsers: number;
}

interface WeddingSeasonLoadTest {
  peakSeasonMultiplier: number;
  supplierCount: number;
  averageFeedbackPerSupplier: number;
  realTimeUpdatesPerMinute: number;
  dashboardConcurrentUsers: number;
}

describe('Feedback Analytics Performance Tests', () => {
  let analyticsEngine: FeedbackAnalyticsEngine;
  let npsManager: NPSManager;
  let dataGenerator: FeedbackDataGenerator;
  let perfMonitor: DatabasePerformanceMonitor;
  let performanceObserver: PerformanceObserver;

  beforeAll(async () => {
    // Initialize performance monitoring
    performanceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        console.log(`Performance: ${entry.name} took ${entry.duration}ms`);
      });
    });
    performanceObserver.observe({ entryTypes: ['measure'] });

    // Initialize services
    analyticsEngine = new FeedbackAnalyticsEngine();
    npsManager = new NPSManager();
    dataGenerator = new FeedbackDataGenerator();
    perfMonitor = new DatabasePerformanceMonitor();

    // Setup test database with indexed schema for performance
    await setupPerformanceOptimizedSchema();
  });

  afterAll(async () => {
    performanceObserver.disconnect();
    await cleanupPerformanceTestData();
  });

  beforeEach(async () => {
    // Clear performance metrics
    performance.clearMarks();
    performance.clearMeasures();

    // Reset monitoring
    perfMonitor.reset();
  });

  describe('Large Scale Data Aggregation Performance', () => {
    it('should aggregate feedback data for 10,000 users within 2 seconds', async () => {
      const scaleParams: ScaleTestParams = {
        userCount: 10000,
        feedbackSessionsPerUser: 3,
        responsesPerSession: 4,
        timeRangeMonths: 12,
        concurrentUsers: 50,
      };

      // Generate test data
      performance.mark('data-generation-start');
      const testData = await dataGenerator.generateFeedbackDataset(scaleParams);
      performance.mark('data-generation-end');
      performance.measure(
        'data-generation',
        'data-generation-start',
        'data-generation-end',
      );

      // Mock database responses for large dataset
      mockLargeScaleDatabase(testData);

      performance.mark('aggregation-start');

      const metrics = await analyticsEngine.generateDashboardMetrics({
        timeRange: 'last-12-months',
        segmentation: ['user_type', 'vendor_type', 'tier'],
        includeDetailedTrends: true,
      });

      performance.mark('aggregation-end');
      performance.measure(
        'large-scale-aggregation',
        'aggregation-start',
        'aggregation-end',
      );

      const executionTime = getPerformanceMeasure('large-scale-aggregation');
      const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB

      // Performance assertions
      expect(executionTime).toBeLessThan(2000); // 2 seconds max
      expect(memoryUsage).toBeLessThan(500); // 500 MB max
      expect(metrics.totalResponses).toBe(
        scaleParams.userCount * scaleParams.feedbackSessionsPerUser,
      );
      expect(metrics.processingTime).toBeLessThan(2000);

      // Verify data accuracy wasn't compromised for performance
      expect(metrics.npsScore).toBeGreaterThanOrEqual(-100);
      expect(metrics.npsScore).toBeLessThanOrEqual(100);
      expect(metrics.segmentation).toBeDefined();
      expect(Object.keys(metrics.segmentation)).toContain('user_type');
    });

    it('should handle real-time updates with 1000+ concurrent feedback submissions', async () => {
      const concurrentSessions = 1000;
      const submissionsPerSecond = 50;

      performance.mark('concurrent-submissions-start');

      // Simulate concurrent feedback submissions
      const submissionPromises = Array.from(
        { length: concurrentSessions },
        async (_, index) => {
          const delay = Math.floor(index / submissionsPerSecond) * 1000; // Stagger submissions

          await new Promise((resolve) => setTimeout(resolve, delay));

          return analyticsEngine.processRealTimeFeedback({
            sessionId: `session-${index}`,
            userId: `user-${index % 100}`, // 100 unique users
            feedbackType: 'nps',
            responses: [
              {
                questionKey: 'nps_score',
                npsScore: Math.floor(Math.random() * 11),
              },
            ],
            timestamp: new Date(),
          });
        },
      );

      const results = await Promise.allSettled(submissionPromises);
      performance.mark('concurrent-submissions-end');
      performance.measure(
        'concurrent-submissions',
        'concurrent-submissions-start',
        'concurrent-submissions-end',
      );

      const executionTime = getPerformanceMeasure('concurrent-submissions');
      const successfulSubmissions = results.filter(
        (r) => r.status === 'fulfilled',
      ).length;
      const throughput = successfulSubmissions / (executionTime / 1000); // submissions per second

      expect(executionTime).toBeLessThan(30000); // 30 seconds max for all submissions
      expect(successfulSubmissions / concurrentSessions).toBeGreaterThan(0.95); // 95% success rate
      expect(throughput).toBeGreaterThan(30); // At least 30 submissions per second

      // Check system remained stable
      const memoryAfter = process.memoryUsage().heapUsed / 1024 / 1024;
      expect(memoryAfter).toBeLessThan(1000); // Memory didn't explode
    });

    it('should calculate NPS trends for 50,000+ feedback responses efficiently', async () => {
      const responseCount = 50000;
      const timeRangeMonths = 24;

      // Generate large NPS dataset
      const npsDataset = await dataGenerator.generateNPSDataset({
        responseCount,
        timeRangeMonths,
        vendorTypes: [
          'photographer',
          'venue',
          'florist',
          'planner',
          'caterer',
          'dj',
        ],
        userTypes: ['supplier', 'couple'],
        seasonalVariation: true,
      });

      mockNPSDatabase(npsDataset);

      performance.mark('nps-calculation-start');

      const npsMetrics = await npsManager.calculateWeddingIndustryNPS('yearly');

      performance.mark('nps-calculation-end');
      performance.measure(
        'nps-calculation',
        'nps-calculation-start',
        'nps-calculation-end',
      );

      const executionTime = getPerformanceMeasure('nps-calculation');
      const dbQueries = perfMonitor.getQueryCount();

      // Performance requirements
      expect(executionTime).toBeLessThan(1500); // 1.5 seconds max
      expect(dbQueries).toBeLessThan(20); // Efficient querying with proper joins

      // Accuracy verification
      expect(npsMetrics.overall.totalResponses).toBe(responseCount);
      expect(npsMetrics.overall.score).toBeGreaterThanOrEqual(-100);
      expect(npsMetrics.overall.score).toBeLessThanOrEqual(100);
      expect(npsMetrics.segments.vendorTypes).toBeDefined();
      expect(Object.keys(npsMetrics.segments.vendorTypes)).toHaveLength(6);
    });
  });

  describe('Wedding Season Peak Load Performance', () => {
    it('should handle 5x normal load during peak wedding season', async () => {
      const weddingSeasonLoad: WeddingSeasonLoadTest = {
        peakSeasonMultiplier: 5,
        supplierCount: 2000,
        averageFeedbackPerSupplier: 8,
        realTimeUpdatesPerMinute: 100,
        dashboardConcurrentUsers: 200,
      };

      const normalLoad = {
        feedbackSubmissions: weddingSeasonLoad.supplierCount * 2, // Normal load
        dashboardUsers: 40,
      };

      const peakLoad = {
        feedbackSubmissions:
          weddingSeasonLoad.supplierCount *
          weddingSeasonLoad.averageFeedbackPerSupplier,
        dashboardUsers: weddingSeasonLoad.dashboardConcurrentUsers,
      };

      performance.mark('peak-load-test-start');

      // Simulate peak season load
      const peakLoadPromises = [
        // High feedback submission volume
        simulateFeedbackLoad(peakLoad.feedbackSubmissions, 120), // 2 minutes duration

        // Concurrent dashboard users
        simulateDashboardLoad(peakLoad.dashboardUsers, 120),

        // Real-time updates
        simulateRealTimeUpdates(
          weddingSeasonLoad.realTimeUpdatesPerMinute,
          120,
        ),
      ];

      const loadTestResults = await Promise.allSettled(peakLoadPromises);

      performance.mark('peak-load-test-end');
      performance.measure(
        'peak-load-test',
        'peak-load-test-start',
        'peak-load-test-end',
      );

      const totalExecutionTime = getPerformanceMeasure('peak-load-test');
      const successfulOperations = loadTestResults.filter(
        (r) => r.status === 'fulfilled',
      ).length;

      // Peak load requirements
      expect(totalExecutionTime).toBeLessThan(150000); // 2.5 minutes max
      expect(successfulOperations).toBe(3); // All load tests passed
      expect(perfMonitor.getAverageResponseTime()).toBeLessThan(500); // Average response < 500ms
      expect(perfMonitor.getErrorRate()).toBeLessThan(0.01); // < 1% error rate

      // System stability during peak
      const finalMemoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
      expect(finalMemoryUsage).toBeLessThan(2000); // Under 2GB memory usage
    });

    it('should maintain sub-200ms response times for dashboard queries during peak load', async () => {
      const concurrentDashboardUsers = 150;
      const queriesPerUser = 10;
      const totalQueries = concurrentDashboardUsers * queriesPerUser;

      const dashboardQueries = [
        'nps_overview',
        'feedback_trends',
        'segmentation_analysis',
        'sentiment_breakdown',
        'response_rates',
        'seasonal_comparison',
        'vendor_performance',
        'action_items',
        'recent_feedback',
        'user_satisfaction',
      ];

      performance.mark('dashboard-load-test-start');

      const queryPromises = Array.from(
        { length: totalQueries },
        async (_, index) => {
          const userId = `dashboard-user-${index % concurrentDashboardUsers}`;
          const queryType = dashboardQueries[index % dashboardQueries.length];

          const startTime = Date.now();

          try {
            const result = await analyticsEngine.executeDashboardQuery(
              queryType,
              {
                userId,
                timeRange: 'last-3-months',
                refresh: index % 5 === 0, // 20% cache refresh rate
              },
            );

            const responseTime = Date.now() - startTime;
            return {
              success: true,
              responseTime,
              queryType,
              cached: result.fromCache,
            };
          } catch (error) {
            return {
              success: false,
              responseTime: Date.now() - startTime,
              error: error.message,
            };
          }
        },
      );

      const queryResults = await Promise.allSettled(queryPromises);

      performance.mark('dashboard-load-test-end');
      performance.measure(
        'dashboard-load-test',
        'dashboard-load-test-start',
        'dashboard-load-test-end',
      );

      const successfulQueries = queryResults
        .filter((r) => r.status === 'fulfilled' && r.value.success)
        .map((r) => r.value);

      const averageResponseTime =
        successfulQueries.reduce(
          (sum, result) => sum + result.responseTime,
          0,
        ) / successfulQueries.length;
      const p95ResponseTime = calculateP95(
        successfulQueries.map((r) => r.responseTime),
      );
      const cacheHitRate =
        successfulQueries.filter((r) => r.cached).length /
        successfulQueries.length;

      // Performance assertions
      expect(averageResponseTime).toBeLessThan(200); // Average < 200ms
      expect(p95ResponseTime).toBeLessThan(500); // P95 < 500ms
      expect(successfulQueries.length / totalQueries).toBeGreaterThan(0.98); // 98% success rate
      expect(cacheHitRate).toBeGreaterThan(0.7); // 70% cache hit rate for performance
    });
  });

  describe('Memory Usage and Resource Optimization', () => {
    it('should process large datasets without memory leaks', async () => {
      const iterations = 10;
      const datasetSize = 5000; // Feedback sessions per iteration
      const memorySnapshots: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024;
        memorySnapshots.push(initialMemory);

        // Process large dataset
        const dataset = await dataGenerator.generateFeedbackDataset({
          userCount: datasetSize,
          feedbackSessionsPerUser: 2,
          responsesPerSession: 3,
          timeRangeMonths: 1,
          concurrentUsers: 1,
        });

        await analyticsEngine.processDatasetBatch(dataset);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        // Small delay between iterations
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      const memoryGrowth = finalMemory - memorySnapshots[0];
      const maxMemoryUsage = Math.max(...memorySnapshots, finalMemory);

      // Memory leak detection
      expect(memoryGrowth).toBeLessThan(100); // Less than 100MB growth over iterations
      expect(maxMemoryUsage).toBeLessThan(1000); // Never exceed 1GB

      // Check for consistent memory cleanup
      const memoryTrend = calculateLinearTrend(memorySnapshots);
      expect(memoryTrend.slope).toBeLessThan(5); // Memory growth < 5MB per iteration
    });

    it('should efficiently handle cache invalidation and refresh', async () => {
      const cacheOperations = 1000;
      const cacheKeys = [
        'nps_monthly',
        'sentiment_weekly',
        'trends_daily',
        'segmentation_quarterly',
      ];

      performance.mark('cache-operations-start');

      // Mix of cache operations
      const cachePromises = Array.from(
        { length: cacheOperations },
        async (_, index) => {
          const operation = index % 4;
          const key = cacheKeys[index % cacheKeys.length];
          const namespace = `user-${index % 100}`;

          switch (operation) {
            case 0: // Cache read
              return await analyticsEngine.getCachedAnalytics(key, namespace);
            case 1: // Cache write
              return await analyticsEngine.setCachedAnalytics(
                key,
                { data: `data-${index}` },
                namespace,
              );
            case 2: // Cache invalidation
              return await analyticsEngine.invalidateCache(key, namespace);
            case 3: // Cache refresh
              return await analyticsEngine.refreshCachedAnalytics(
                key,
                namespace,
              );
          }
        },
      );

      const cacheResults = await Promise.allSettled(cachePromises);

      performance.mark('cache-operations-end');
      performance.measure(
        'cache-operations',
        'cache-operations-start',
        'cache-operations-end',
      );

      const executionTime = getPerformanceMeasure('cache-operations');
      const successfulOperations = cacheResults.filter(
        (r) => r.status === 'fulfilled',
      ).length;
      const throughput = successfulOperations / (executionTime / 1000); // operations per second

      // Cache performance requirements
      expect(executionTime).toBeLessThan(5000); // 5 seconds max for 1000 operations
      expect(successfulOperations / cacheOperations).toBeGreaterThan(0.95); // 95% success rate
      expect(throughput).toBeGreaterThan(150); // At least 150 operations per second
    });
  });

  describe('Database Query Optimization', () => {
    it('should use efficient queries with proper indexing', async () => {
      const complexAnalyticsRequest = {
        timeRange: 'last-24-months',
        segmentation: ['user_type', 'vendor_type', 'tier', 'seasonal'],
        includeDetailedBreakdown: true,
        includeTrendAnalysis: true,
        includeComparisons: true,
      };

      perfMonitor.startQueryTracking();

      performance.mark('complex-analytics-start');

      const result = await analyticsEngine.generateComprehensiveAnalytics(
        complexAnalyticsRequest,
      );

      performance.mark('complex-analytics-end');
      performance.measure(
        'complex-analytics',
        'complex-analytics-start',
        'complex-analytics-end',
      );

      const queryMetrics = perfMonitor.getQueryMetrics();
      const executionTime = getPerformanceMeasure('complex-analytics');

      // Query optimization assertions
      expect(queryMetrics.totalQueries).toBeLessThan(15); // Efficient query consolidation
      expect(queryMetrics.averageQueryTime).toBeLessThan(50); // Average query < 50ms
      expect(queryMetrics.indexUsageRate).toBeGreaterThan(0.9); // 90% index usage
      expect(executionTime).toBeLessThan(1000); // Total execution < 1 second

      // Verify no N+1 query problems
      expect(queryMetrics.sequentialQueries).toBeLessThan(3); // Minimal sequential queries

      // Data completeness not sacrificed for performance
      expect(result.totalDataPoints).toBeGreaterThan(0);
      expect(result.segmentation).toBeDefined();
      expect(Object.keys(result.segmentation)).toHaveLength(4);
    });

    it('should handle time-range queries efficiently with partitioning', async () => {
      const timeRangeQueries = [
        { range: 'last-7-days', expectedQueryTime: 20 },
        { range: 'last-30-days', expectedQueryTime: 50 },
        { range: 'last-90-days', expectedQueryTime: 100 },
        { range: 'last-6-months', expectedQueryTime: 200 },
        { range: 'last-12-months', expectedQueryTime: 300 },
        { range: 'last-24-months', expectedQueryTime: 500 },
      ];

      const queryResults = [];

      for (const timeQuery of timeRangeQueries) {
        perfMonitor.reset();

        performance.mark(`query-${timeQuery.range}-start`);

        const result = await analyticsEngine.getTimeRangeAnalytics({
          timeRange: timeQuery.range,
          includeDetailedMetrics: true,
        });

        performance.mark(`query-${timeQuery.range}-end`);
        performance.measure(
          `query-${timeQuery.range}`,
          `query-${timeQuery.range}-start`,
          `query-${timeQuery.range}-end`,
        );

        const executionTime = getPerformanceMeasure(`query-${timeQuery.range}`);
        const queryMetrics = perfMonitor.getQueryMetrics();

        queryResults.push({
          range: timeQuery.range,
          executionTime,
          expectedTime: timeQuery.expectedQueryTime,
          queryCount: queryMetrics.totalQueries,
          dataPoints: result.totalDataPoints,
        });

        // Individual query performance
        expect(executionTime).toBeLessThan(timeQuery.expectedQueryTime);
        expect(queryMetrics.totalQueries).toBeLessThan(5); // Efficient querying
      }

      // Performance should scale reasonably with data size
      const executionTimes = queryResults.map((r) => r.executionTime);
      const scalingFactor =
        executionTimes[executionTimes.length - 1] / executionTimes[0];
      expect(scalingFactor).toBeLessThan(30); // Max 30x increase for 100x more data
    });
  });

  describe('Concurrent User Load Testing', () => {
    it('should support 500 concurrent users accessing analytics dashboard', async () => {
      const concurrentUsers = 500;
      const actionsPerUser = 5;
      const testDuration = 60; // seconds

      performance.mark('concurrent-load-start');

      const userPromises = Array.from(
        { length: concurrentUsers },
        async (_, userId) => {
          const actions = [];
          const userStartTime = Date.now();

          for (let action = 0; action < actionsPerUser; action++) {
            const actionDelay = (testDuration * 1000) / actionsPerUser; // Spread actions over test duration
            await new Promise((resolve) => setTimeout(resolve, actionDelay));

            const actionPromise = performRandomDashboardAction(userId, action);
            actions.push(actionPromise);
          }

          const results = await Promise.allSettled(actions);
          const userExecutionTime = Date.now() - userStartTime;

          return {
            userId,
            executionTime: userExecutionTime,
            successfulActions: results.filter((r) => r.status === 'fulfilled')
              .length,
            totalActions: actionsPerUser,
          };
        },
      );

      const userResults = await Promise.allSettled(userPromises);

      performance.mark('concurrent-load-end');
      performance.measure(
        'concurrent-load',
        'concurrent-load-start',
        'concurrent-load-end',
      );

      const totalExecutionTime = getPerformanceMeasure('concurrent-load');
      const successfulUsers = userResults.filter(
        (r) => r.status === 'fulfilled',
      ).length;
      const totalSuccessfulActions = userResults
        .filter((r) => r.status === 'fulfilled')
        .reduce((sum, r) => sum + r.value.successfulActions, 0);

      // Concurrent load requirements
      expect(successfulUsers / concurrentUsers).toBeGreaterThan(0.95); // 95% user success rate
      expect(
        totalSuccessfulActions / (concurrentUsers * actionsPerUser),
      ).toBeGreaterThan(0.9); // 90% action success rate
      expect(totalExecutionTime).toBeLessThan(90000); // Complete within 90 seconds

      // System performance under load
      expect(perfMonitor.getAverageResponseTime()).toBeLessThan(1000); // Average response < 1s
      expect(perfMonitor.getErrorRate()).toBeLessThan(0.05); // < 5% error rate
    });
  });

  // Helper functions
  async function setupPerformanceOptimizedSchema() {
    // Mock database schema setup with proper indexes
    const indexes = [
      'CREATE INDEX idx_feedback_sessions_user_type ON feedback_sessions(user_id, session_type, started_at DESC)',
      'CREATE INDEX idx_feedback_sessions_completion ON feedback_sessions(completed_at, completion_rate) WHERE completed_at IS NOT NULL',
      'CREATE INDEX idx_feedback_responses_session ON feedback_responses(session_id, responded_at)',
      'CREATE INDEX idx_nps_surveys_score_date ON nps_surveys(score, completed_at DESC) WHERE completed_at IS NOT NULL',
      'CREATE INDEX idx_feedback_analytics_date ON feedback_analytics_daily(date DESC)',
      // Partial indexes for performance
      "CREATE INDEX idx_feedback_sessions_active ON feedback_sessions(user_id, started_at) WHERE status = 'active'",
      'CREATE INDEX idx_nps_promoters ON nps_surveys(user_id, score) WHERE score >= 9',
      'CREATE INDEX idx_nps_detractors ON nps_surveys(user_id, score) WHERE score <= 6',
    ];

    // Mock index creation
    indexes.forEach((indexSQL) => {
      console.log(`Performance test setup: ${indexSQL}`);
    });
  }

  function mockLargeScaleDatabase(testData: any) {
    (supabase.from as jest.Mock).mockImplementation((table: string) => ({
      select: jest.fn().mockReturnValue({
        gte: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: testData[table] || [],
              error: null,
            }),
          }),
        }),
      }),
    }));
  }

  function mockNPSDatabase(npsDataset: any[]) {
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'nps_surveys') {
        return {
          select: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockResolvedValue({
                data: npsDataset,
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
    });
  }

  function getPerformanceMeasure(measureName: string): number {
    const measures = performance.getEntriesByName(measureName, 'measure');
    return measures.length > 0 ? measures[measures.length - 1].duration : 0;
  }

  function calculateP95(values: number[]): number {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.95);
    return sorted[index] || 0;
  }

  function calculateLinearTrend(values: number[]): {
    slope: number;
    intercept: number;
  } {
    const n = values.length;
    const sumX = (n * (n - 1)) / 2; // Sum of indices
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + val * index, 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6; // Sum of indices squared

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  async function simulateFeedbackLoad(
    submissions: number,
    durationSeconds: number,
  ): Promise<void> {
    const submissionsPerSecond = submissions / durationSeconds;
    const interval = 1000 / submissionsPerSecond;

    for (let i = 0; i < submissions; i++) {
      setTimeout(async () => {
        await analyticsEngine.processRealTimeFeedback({
          sessionId: `load-test-${i}`,
          userId: `load-user-${i % 100}`,
          feedbackType: 'nps',
          responses: [
            {
              questionKey: 'nps_score',
              npsScore: Math.floor(Math.random() * 11),
            },
          ],
          timestamp: new Date(),
        });
      }, i * interval);
    }

    // Wait for all submissions to complete
    await new Promise((resolve) =>
      setTimeout(resolve, durationSeconds * 1000 + 1000),
    );
  }

  async function simulateDashboardLoad(
    users: number,
    durationSeconds: number,
  ): Promise<void> {
    const dashboardActions = [
      'nps_overview',
      'trends',
      'segmentation',
      'insights',
    ];
    const actionsPerUser = Math.ceil(durationSeconds / 10); // Action every 10 seconds

    const userPromises = Array.from({ length: users }, async (_, userId) => {
      for (let action = 0; action < actionsPerUser; action++) {
        const actionType = dashboardActions[action % dashboardActions.length];
        await new Promise((resolve) => setTimeout(resolve, 10000)); // 10 second intervals

        await analyticsEngine.executeDashboardQuery(actionType, {
          userId: `dashboard-load-${userId}`,
          timeRange: 'last-30-days',
        });
      }
    });

    await Promise.allSettled(userPromises);
  }

  async function simulateRealTimeUpdates(
    updatesPerMinute: number,
    durationSeconds: number,
  ): Promise<void> {
    const totalUpdates = (updatesPerMinute * durationSeconds) / 60;
    const interval = (durationSeconds * 1000) / totalUpdates;

    for (let i = 0; i < totalUpdates; i++) {
      setTimeout(async () => {
        await analyticsEngine.broadcastRealTimeUpdate({
          type: 'feedback_submitted',
          data: { sessionId: `realtime-${i}`, timestamp: new Date() },
        });
      }, i * interval);
    }

    await new Promise((resolve) =>
      setTimeout(resolve, durationSeconds * 1000 + 1000),
    );
  }

  async function performRandomDashboardAction(
    userId: number,
    actionIndex: number,
  ): Promise<any> {
    const actions = [
      () => analyticsEngine.getNPSOverview({ userId: `user-${userId}` }),
      () =>
        analyticsEngine.getFeedbackTrends({
          userId: `user-${userId}`,
          timeRange: 'last-90-days',
        }),
      () =>
        analyticsEngine.getSegmentationAnalysis({ userId: `user-${userId}` }),
      () => analyticsEngine.getSentimentBreakdown({ userId: `user-${userId}` }),
      () => analyticsEngine.getActionableInsights({ userId: `user-${userId}` }),
    ];

    const randomAction = actions[actionIndex % actions.length];
    return await randomAction();
  }

  async function cleanupPerformanceTestData(): Promise<void> {
    // Cleanup mock data and reset state
    console.log('Cleaning up performance test data...');
    // In a real implementation, this would clean up test database records
  }
});
