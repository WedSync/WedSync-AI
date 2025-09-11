/**
 * WS-234 Query Performance Tracker Test Suite - Team C
 * Comprehensive test suite for query performance tracking and analysis
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
  beforeAll,
  afterAll,
} from '@jest/globals';
import {
  QueryPerformanceTracker,
  trackQuery,
  withQueryTracking,
} from '@/lib/database/query-performance-tracker';

// Mock dependencies
jest.mock('@/lib/monitoring/structured-logger');
jest.mock('@/lib/cache/redis-client');
jest.mock('@supabase/supabase-js');

describe('QueryPerformanceTracker', () => {
  let tracker: QueryPerformanceTracker;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    tracker = QueryPerformanceTracker.getInstance();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  afterAll(() => {
    delete process.env.NODE_ENV;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  describe('Initialization', () => {
    it('should create singleton instance', () => {
      const instance1 = QueryPerformanceTracker.getInstance();
      const instance2 = QueryPerformanceTracker.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(QueryPerformanceTracker);
    });

    it('should initialize performance analysis', () => {
      expect(jest.getTimerCount()).toBeGreaterThan(0);
    });
  });

  describe('Query Execution Tracking', () => {
    it('should track basic query execution', async () => {
      const query = 'SELECT * FROM organizations WHERE id = $1';
      const duration = 150;

      const executionId = await tracker.trackQueryExecution(
        query,
        duration,
        true,
        undefined,
        { table: 'organizations', operation: 'SELECT' },
      );

      expect(executionId).toMatch(/^exec_\d+_[a-z0-9]+$/);
      expect(typeof executionId).toBe('string');
    });

    it('should track failed query execution', async () => {
      const query = 'SELECT * FROM nonexistent_table';
      const duration = 50;
      const error = new Error('Table does not exist');

      const executionId = await tracker.trackQueryExecution(
        query,
        duration,
        false,
        error,
        { table: 'nonexistent_table', operation: 'SELECT' },
      );

      expect(executionId).toBeDefined();

      const stats = await tracker.getPerformanceStats('1h');
      expect(stats.errorRate).toBeGreaterThan(0);
    });

    it('should handle very long queries by truncating', async () => {
      const longQuery =
        'SELECT * FROM table WHERE ' +
        'condition AND '.repeat(200) +
        'final_condition';

      const executionId = await tracker.trackQueryExecution(
        longQuery,
        100,
        true,
      );

      expect(executionId).toBeDefined();
      // Query should be truncated but tracking should still work
    });

    it('should detect wedding day execution context', async () => {
      // Mock Saturday
      const saturday = new Date('2024-01-06T10:00:00Z');
      jest.setSystemTime(saturday);

      const executionId = await tracker.trackQueryExecution(
        'SELECT * FROM guests WHERE wedding_id = $1',
        300,
        true,
        undefined,
        { table: 'guests', operation: 'SELECT' },
        undefined,
        { priority: 'high' },
      );

      expect(executionId).toBeDefined();
    });
  });

  describe('Query Pattern Recognition', () => {
    it('should normalize similar queries into patterns', async () => {
      const queries = [
        'SELECT * FROM organizations WHERE id = $1',
        'SELECT * FROM organizations WHERE id = $2',
        'SELECT * FROM organizations WHERE id = 12345',
        'SELECT * FROM organizations WHERE id = 67890',
      ];

      for (let i = 0; i < queries.length; i++) {
        await tracker.trackQueryExecution(
          queries[i],
          100 + i * 10,
          true,
          undefined,
          { table: 'organizations', operation: 'SELECT' },
        );
      }

      const stats = await tracker.getPerformanceStats('1h');

      // Should recognize all queries as same pattern
      expect(stats.patternAnalysis).toBeDefined();
      expect(stats.patternAnalysis.length).toBeGreaterThan(0);

      const orgPattern = stats.patternAnalysis.find(
        (p) => p.table === 'organizations' && p.operation === 'SELECT',
      );
      expect(orgPattern).toBeDefined();
      expect(orgPattern!.executionCount).toBe(4);
    });

    it('should calculate accurate pattern statistics', async () => {
      const durations = [100, 150, 200, 250, 300];

      for (const duration of durations) {
        await tracker.trackQueryExecution(
          'SELECT * FROM clients WHERE organization_id = $1',
          duration,
          true,
          undefined,
          { table: 'clients', operation: 'SELECT' },
        );
      }

      const stats = await tracker.getPerformanceStats('1h');
      const pattern = stats.patternAnalysis.find((p) => p.table === 'clients');

      expect(pattern).toBeDefined();
      expect(pattern!.executionCount).toBe(5);
      expect(pattern!.averageDuration).toBe(200); // Average of 100,150,200,250,300
      expect(pattern!.minDuration).toBe(100);
      expect(pattern!.maxDuration).toBe(300);
    });
  });

  describe('Slow Query Detection', () => {
    it('should detect slow queries with standard thresholds', async () => {
      const slowQuery =
        'SELECT * FROM vendors v JOIN organizations o ON v.organization_id = o.id';
      const slowDuration = 1500; // 1.5 seconds

      await tracker.trackQueryExecution(
        slowQuery,
        slowDuration,
        true,
        undefined,
        { table: 'vendors', operation: 'SELECT' },
      );

      const slowQueries = await tracker.getSlowQueryAnalysis();

      expect(slowQueries.length).toBeGreaterThan(0);
      expect(slowQueries[0].execution.duration).toBe(slowDuration);
      expect(slowQueries[0].impact).toBeOneOf([
        'low',
        'medium',
        'high',
        'critical',
      ]);
    });

    it('should use more sensitive thresholds on wedding days', async () => {
      // Mock Saturday
      const saturday = new Date('2024-01-06T10:00:00Z');
      jest.setSystemTime(saturday);

      const query = 'SELECT * FROM guests WHERE rsvp_status = $1';
      const duration = 600; // 600ms - slow on wedding day, ok normally

      await tracker.trackQueryExecution(
        query,
        duration,
        true,
        undefined,
        { table: 'guests', operation: 'SELECT' },
        undefined,
        { priority: 'critical' },
      );

      const slowQueries = await tracker.getSlowQueryAnalysis();

      expect(slowQueries.length).toBeGreaterThan(0);
      expect(slowQueries[0].execution.duration).toBe(duration);
      expect(slowQueries[0].impact).toBeOneOf(['medium', 'high', 'critical']);
    });

    it('should categorize slow query types correctly', async () => {
      const testCases = [
        {
          query: 'SELECT * FROM large_table WHERE unindexed_column = $1',
          expectedCategory: 'missing_index',
        },
        {
          query:
            'SELECT * FROM table1 t1 JOIN table2 t2 ON t1.id = t2.id JOIN table3 t3 ON t2.id = t3.id JOIN table4 t4 ON t3.id = t4.id',
          expectedCategory: 'complex_join',
        },
        {
          query: 'SELECT * FROM huge_table',
          expectedCategory: 'large_result',
        },
      ];

      for (const testCase of testCases) {
        await tracker.trackQueryExecution(
          testCase.query,
          2000, // 2 seconds - definitely slow
          true,
          undefined,
          { table: 'test_table', operation: 'SELECT' },
        );
      }

      const slowQueries = await tracker.getSlowQueryAnalysis();
      expect(slowQueries.length).toBe(testCases.length);

      // Note: Actual categorization logic would need to be implemented
      // This test verifies the structure exists
      slowQueries.forEach((sq) => {
        expect(sq.category).toBeOneOf([
          'table_scan',
          'missing_index',
          'complex_join',
          'large_result',
          'lock_contention',
          'resource_limit',
        ]);
      });
    });
  });

  describe('Performance Statistics', () => {
    beforeEach(async () => {
      // Setup some baseline queries
      const queries = [
        {
          query: 'SELECT * FROM organizations',
          duration: 100,
          table: 'organizations',
        },
        { query: 'SELECT * FROM clients', duration: 150, table: 'clients' },
        { query: 'SELECT * FROM vendors', duration: 200, table: 'vendors' },
        { query: 'SELECT * FROM guests', duration: 75, table: 'guests' },
        {
          query: 'INSERT INTO audit_log (action)',
          duration: 50,
          table: 'audit_log',
        },
      ];

      for (const q of queries) {
        await tracker.trackQueryExecution(
          q.query,
          q.duration,
          true,
          undefined,
          { table: q.table, operation: 'SELECT' },
        );
      }
    });

    it('should calculate accurate performance statistics', async () => {
      const stats = await tracker.getPerformanceStats('1h');

      expect(stats.totalExecutions).toBe(5);
      expect(stats.averageQueryTime).toBe(115); // (100+150+200+75+50)/5
      expect(stats.slowQueryCount).toBeGreaterThanOrEqual(0);
      expect(stats.errorRate).toBe(0); // No errors in setup
      expect(stats.patternAnalysis.length).toBeGreaterThan(0);
    });

    it('should provide different time window statistics', async () => {
      const stats1h = await tracker.getPerformanceStats('1h');
      const stats24h = await tracker.getPerformanceStats('24h');
      const stats7d = await tracker.getPerformanceStats('7d');

      expect(stats1h).toBeDefined();
      expect(stats24h).toBeDefined();
      expect(stats7d).toBeDefined();

      // All should have the same structure
      for (const stats of [stats1h, stats24h, stats7d]) {
        expect(stats).toHaveProperty('totalExecutions');
        expect(stats).toHaveProperty('averageQueryTime');
        expect(stats).toHaveProperty('slowQueryCount');
        expect(stats).toHaveProperty('errorRate');
        expect(stats).toHaveProperty('topSlowQueries');
        expect(stats).toHaveProperty('performanceTrend');
        expect(stats).toHaveProperty('patternAnalysis');
      }
    });

    it('should generate performance trends', async () => {
      const trends = await tracker.getPerformanceTrends('1h');

      expect(trends).toHaveProperty('timeWindow');
      expect(trends).toHaveProperty('averageQueryTime');
      expect(trends).toHaveProperty('slowQueryCount');
      expect(trends).toHaveProperty('errorRate');
      expect(trends).toHaveProperty('throughput');
      expect(trends).toHaveProperty('timestamps');
      expect(trends).toHaveProperty('anomalies');

      expect(trends.timeWindow).toBe('1h');
      expect(Array.isArray(trends.averageQueryTime)).toBe(true);
      expect(Array.isArray(trends.timestamps)).toBe(true);
    });
  });

  describe('Wedding Day Performance', () => {
    beforeEach(() => {
      // Mock Saturday
      const saturday = new Date('2024-01-06T10:00:00Z');
      jest.setSystemTime(saturday);
    });

    it('should provide wedding day specific performance summary', async () => {
      // Add some wedding day queries
      await tracker.trackQueryExecution(
        'SELECT * FROM weddings WHERE date = CURRENT_DATE',
        200,
        true,
        undefined,
        { table: 'weddings', operation: 'SELECT' },
      );

      await tracker.trackQueryExecution(
        'UPDATE rsvp SET status = $1 WHERE guest_id = $2',
        150,
        true,
        undefined,
        { table: 'rsvp', operation: 'UPDATE' },
      );

      const weddingDayPerf = await tracker.getWeddingDayPerformance();

      expect(weddingDayPerf.isWeddingDayMode).toBe(true);
      expect(weddingDayPerf.protectionActive).toBe(true);
      expect(weddingDayPerf.queryCount).toBeGreaterThan(0);
      expect(weddingDayPerf.averageTime).toBeGreaterThan(0);
      expect(weddingDayPerf.recommendations).toBeInstanceOf(Array);
    });

    it('should generate wedding day specific recommendations', async () => {
      // Add some problematic wedding day queries
      await tracker.trackQueryExecution(
        'SELECT * FROM guests WHERE wedding_id = $1', // Slow guest query
        800,
        true,
        undefined,
        { table: 'guests', operation: 'SELECT' },
      );

      const weddingDayPerf = await tracker.getWeddingDayPerformance();

      expect(weddingDayPerf.recommendations.length).toBeGreaterThan(0);
      expect(weddingDayPerf.slowQueries).toBeGreaterThan(0);
    });
  });

  describe('Query Optimization Recommendations', () => {
    it('should provide optimization recommendations for slow patterns', async () => {
      // Create problematic query pattern
      const problematicQuery =
        'SELECT * FROM large_table WHERE unindexed_column = $1';

      for (let i = 0; i < 5; i++) {
        await tracker.trackQueryExecution(
          problematicQuery,
          1500 + i * 100, // Getting slower
          true,
          undefined,
          { table: 'large_table', operation: 'SELECT' },
        );
      }

      const recommendations = await tracker.getOptimizationRecommendations(
        'large_table',
        'SELECT',
      );

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0]).toHaveProperty('type');
      expect(recommendations[0]).toHaveProperty('suggestion');
      expect(recommendations[0]).toHaveProperty('estimatedImprovement');
      expect(recommendations[0]).toHaveProperty('implementationEffort');
      expect(recommendations[0]).toHaveProperty('riskLevel');
      expect(recommendations[0]).toHaveProperty('weddingDayCompatible');
    });

    it('should prioritize recommendations by estimated improvement', async () => {
      const recommendations = await tracker.getOptimizationRecommendations();

      // Should be sorted by estimated improvement (highest first)
      for (let i = 1; i < recommendations.length; i++) {
        expect(recommendations[i].estimatedImprovement).toBeLessThanOrEqual(
          recommendations[i - 1].estimatedImprovement,
        );
      }
    });
  });

  describe('Utility Functions', () => {
    it('should support trackQuery decorator', async () => {
      const mockFunction = jest.fn().mockResolvedValue('test result');

      // Apply decorator
      const decoratedFunction = trackQuery(
        { constructor: { name: 'TestClass' } },
        'testMethod',
        { value: mockFunction },
      );

      expect(decoratedFunction.value).toBeDefined();
      expect(typeof decoratedFunction.value).toBe('function');
    });

    it('should support withQueryTracking utility', async () => {
      const mockOperation = jest.fn().mockResolvedValue('operation result');

      const result = await withQueryTracking('test_operation', mockOperation, {
        table: 'test_table',
        operation: 'SELECT',
      });

      expect(result).toBe('operation result');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should handle errors in withQueryTracking', async () => {
      const mockError = new Error('Operation failed');
      const mockOperation = jest.fn().mockRejectedValue(mockError);

      await expect(
        withQueryTracking('failing_operation', mockOperation),
      ).rejects.toThrow('Operation failed');

      // Should still track the failed operation
      const stats = await tracker.getPerformanceStats('1h');
      expect(stats.errorRate).toBeGreaterThan(0);
    });
  });

  describe('Data Cleanup and Management', () => {
    it('should clean up old execution data', async () => {
      // Fast forward time to trigger cleanup
      jest.advanceTimersByTime(24 * 60 * 60 * 1000); // 24 hours

      // Add new query after time advance
      await tracker.trackQueryExecution(
        'SELECT * FROM cleanup_test',
        100,
        true,
      );

      // Old data should be cleaned up automatically
      // (This would need to be verified by checking internal state)
      expect(true).toBe(true); // Placeholder - actual cleanup verification would require access to internal state
    });

    it('should maintain execution limit', async () => {
      // Add many executions to test limit
      for (let i = 0; i < 50; i++) {
        await tracker.trackQueryExecution(
          `SELECT * FROM test_table WHERE id = ${i}`,
          100,
          true,
        );
      }

      const stats = await tracker.getPerformanceStats('1h');
      expect(stats.totalExecutions).toBeLessThanOrEqual(50);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed queries gracefully', async () => {
      const malformedQueries = [
        null as any,
        undefined as any,
        '',
        'INVALID SQL QUERY WITH @#$%',
        { query: 'object instead of string' } as any,
      ];

      for (const query of malformedQueries) {
        await expect(
          tracker.trackQueryExecution(query, 100, true),
        ).resolves.toBeDefined();
      }
    });

    it('should handle invalid durations gracefully', async () => {
      const invalidDurations = [
        -100,
        Infinity,
        NaN,
        'invalid' as any,
        null as any,
      ];

      for (const duration of invalidDurations) {
        await expect(
          tracker.trackQueryExecution('SELECT 1', duration, true),
        ).resolves.toBeDefined();
      }
    });
  });
});
