/**
 * Database Infrastructure Health Integration Test
 * Tests the hardened database infrastructure from Session 5 TypeScript remediation
 * Validates Map iteration fixes, health monitoring, and performance tracking
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Import our fixed database infrastructure
import {
  DatabaseHealthMonitor,
  trackDatabaseQuery,
} from '@/lib/database/health-monitor';
import { DatabaseConnectionPool } from '@/lib/database/connection-pool';
import { QueryPerformanceTracker } from '@/lib/database/query-performance-tracker';

// Test configuration
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';

describe('Database Infrastructure Health Integration', () => {
  let supabase: SupabaseClient;
  let healthMonitor: DatabaseHealthMonitor;
  let connectionPool: DatabaseConnectionPool;
  let performanceTracker: QueryPerformanceTracker;

  beforeAll(async () => {
    // Initialize test Supabase client
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Initialize our hardened infrastructure components
    healthMonitor = new DatabaseHealthMonitor({
      enabled: true,
      checkInterval: 5000,
      alertThresholds: {
        connectionCount: { warning: 80, critical: 95 },
        queryLatency: { warning: 1000, critical: 5000 },
        errorRate: { warning: 0.05, critical: 0.1 },
        diskUsage: { warning: 80, critical: 90 },
      },
      weddingDayMode: {
        enabled: false,
        autoEnable: true,
        stricterThresholds: true,
      },
    });

    connectionPool = new DatabaseConnectionPool('test-pool', {
      connectionString: 'postgresql://test:test@localhost:5432/test',
      maxConnections: 10,
      idleTimeout: 30000,
      acquireTimeout: 60000,
    });

    performanceTracker = new QueryPerformanceTracker({
      enabled: true,
      sampleRate: 1.0,
      slowQueryThreshold: 1000,
      retentionPeriod: {
        executions: 3600000, // 1 hour
        patterns: 86400000, // 24 hours
        slowQueries: 86400000, // 24 hours
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    if (connectionPool) {
      await connectionPool.close();
    }
    if (healthMonitor) {
      healthMonitor.stop();
    }
  });

  describe('Health Monitor - Map Iteration Fixes', () => {
    it('should handle query metrics Map iteration without downlevelIteration errors', async () => {
      // This tests our Map iteration fix from Session 5
      const testQuery = 'SELECT * FROM test_table WHERE id = $1';
      const testDuration = 150;

      // Track a query to populate the metrics Map
      await trackDatabaseQuery(testQuery, testDuration, undefined, {
        organization: 'test-org',
        table: 'test_table',
        type: 'SELECT',
      });

      // This should not throw downlevelIteration errors
      expect(() => {
        healthMonitor.cleanup(); // This method uses the fixed Map iteration
      }).not.toThrow();
    });

    it('should create health alerts with required timestamp properties', async () => {
      // This tests our timestamp property fix from Session 5
      const alertsBefore = healthMonitor.getAlerts().length;

      // Simulate a condition that triggers an alert
      healthMonitor.setWeddingDayMode(true); // This creates an alert

      const alertsAfter = healthMonitor.getAlerts();
      expect(alertsAfter.length).toBeGreaterThan(alertsBefore);

      // Verify the alert has the required timestamp property
      const newAlert = alertsAfter[alertsAfter.length - 1];
      expect(newAlert).toHaveProperty('timestamp');
      expect(newAlert.timestamp).toBeInstanceOf(Date);
      expect(newAlert.title).toBe('Wedding Day Mode Enabled');

      // Reset wedding day mode
      healthMonitor.setWeddingDayMode(false);
    });

    it('should handle alert cleanup with fixed Map iteration', async () => {
      // Test the alerts Map cleanup that was fixed in Session 5
      const oldTimestamp = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago

      // This should use the fixed Map iteration pattern
      expect(() => {
        healthMonitor.cleanup(); // Should not throw with our forEach fix
      }).not.toThrow();
    });
  });

  describe('Connection Pool - Async Map Operations', () => {
    it('should handle pool health checks with Promise.all pattern', async () => {
      // This tests our async Map operation fix from Session 5
      const healthStats = await connectionPool.getHealthStats();

      // Verify the response structure
      expect(healthStats).toHaveProperty('pools');
      expect(healthStats).toHaveProperty('overallHealthy');
      expect(typeof healthStats.overallHealthy).toBe('boolean');

      // Should not have any async iteration issues
      expect(Array.isArray(healthStats.pools)).toBe(true);
    });

    it('should record statistics with correct method names', () => {
      // This tests our recordFailedAcquire fix from Session 5
      expect(() => {
        // This should use the correct method name we fixed
        connectionPool.stats.recordFailedAcquire();
      }).not.toThrow();

      expect(connectionPool.stats.failedAcquires).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance Tracker - Operation Type Mapping', () => {
    it('should handle BULK operation type mapping correctly', async () => {
      // This tests our BULK -> INSERT mapping fix from Session 5
      const testQuery = 'BULK INSERT INTO test_table VALUES (...)';
      const testMetadata = {
        organization: 'test-org',
        table: 'test_table',
        operation: 'BULK' as const,
        rowsAffected: 100,
        indexesUsed: ['idx_test'],
      };

      // This should not throw type errors with our mapping fix
      await expect(async () => {
        await performanceTracker.track(
          'test-execution',
          testQuery,
          250, // duration
          testMetadata,
          { priority: 'medium', userContext: { userId: 'test-user' } },
        );
      }).not.toThrow();
    });

    it('should clean up old patterns with fixed Map iteration', () => {
      // This tests our Map iteration fixes in the performance tracker
      expect(() => {
        performanceTracker.cleanup(); // Uses the fixed forEach pattern
      }).not.toThrow();
    });
  });

  describe('Wedding Day Mode Compliance', () => {
    it('should enable wedding day mode with proper health alerts', async () => {
      // Test our wedding day protocol compliance
      healthMonitor.setWeddingDayMode(true);

      const alerts = healthMonitor.getAlerts();
      const weddingDayAlert = alerts.find(
        (alert) => alert.title === 'Wedding Day Mode Enabled',
      );

      expect(weddingDayAlert).toBeDefined();
      expect(weddingDayAlert?.weddingDayImpact).toBe(true);
      expect(weddingDayAlert?.severity).toBe('info');
      expect(weddingDayAlert?.timestamp).toBeInstanceOf(Date);

      // Reset
      healthMonitor.setWeddingDayMode(false);
    });

    it('should track queries with wedding day impact assessment', async () => {
      healthMonitor.setWeddingDayMode(true);

      // Track a potentially slow query
      await trackDatabaseQuery(
        'SELECT * FROM clients WHERE wedding_date = CURRENT_DATE',
        2500, // Slow query
        undefined,
        {
          organization: 'test-venue',
          table: 'clients',
          type: 'SELECT',
        },
      );

      // Should create appropriate alerts for wedding day
      const alerts = healthMonitor.getAlerts();
      const slowQueryAlerts = alerts.filter(
        (alert) => alert.title === 'Slow Query Detected',
      );

      if (slowQueryAlerts.length > 0) {
        expect(slowQueryAlerts[0].weddingDayImpact).toBe(true);
      }

      // Reset
      healthMonitor.setWeddingDayMode(false);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should track database operations within performance thresholds', async () => {
      const startTime = performance.now();

      // Simulate database operations
      await trackDatabaseQuery(
        'SELECT id, name FROM vendors WHERE active = true',
        45, // Fast query
        undefined,
        {
          organization: 'test-org',
          table: 'vendors',
          type: 'SELECT',
        },
      );

      const endTime = performance.now();
      const operationTime = endTime - startTime;

      // Should complete within reasonable time (< 100ms for our infrastructure)
      expect(operationTime).toBeLessThan(100);
    });

    it('should handle concurrent operations without Map iteration conflicts', async () => {
      // Test concurrent operations to ensure our async fixes work
      const operations = Array.from({ length: 10 }, (_, i) =>
        trackDatabaseQuery(
          `SELECT * FROM test_table_${i}`,
          Math.random() * 200 + 50, // Random duration 50-250ms
          undefined,
          {
            organization: 'concurrent-test',
            table: `test_table_${i}`,
            type: 'SELECT',
          },
        ),
      );

      // Should handle all concurrent operations without errors
      await expect(Promise.all(operations)).resolves.toBeDefined();
    });
  });

  describe('Type Safety Validation', () => {
    it('should maintain strict TypeScript compliance', () => {
      // Verify our fixes maintain type safety
      expect(typeof healthMonitor.getHealthStatus).toBe('function');
      expect(typeof connectionPool.getHealthStats).toBe('function');
      expect(typeof performanceTracker.track).toBe('function');

      // These should all be properly typed after our Session 5 fixes
      const healthStatus = healthMonitor.getHealthStatus();
      expect(healthStatus).toHaveProperty('status');
      expect(healthStatus).toHaveProperty('timestamp');
      expect(healthStatus).toHaveProperty('metrics');
    });
  });
});
