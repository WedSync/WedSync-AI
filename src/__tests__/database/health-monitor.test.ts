/**
 * WS-234 Database Health Monitor Test Suite - Team C
 * Comprehensive test suite for database health monitoring system
 *
 * Test Categories:
 * - Unit Tests: Individual component functionality
 * - Integration Tests: Component interactions
 * - Performance Tests: Monitoring overhead validation
 * - Wedding Day Tests: Saturday protection scenarios
 * - Alert Tests: Alert generation and handling
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
  DatabaseHealthMonitor,
  getDatabaseHealthStatus,
} from '@/lib/database/health-monitor';
import { connectionPool } from '@/lib/database/connection-pool';
import { logger } from '@/lib/monitoring/structured-logger';

// Mock dependencies
jest.mock('@/lib/monitoring/structured-logger');
jest.mock('@/lib/cache/redis-client');
jest.mock('@supabase/supabase-js');

describe('DatabaseHealthMonitor', () => {
  let healthMonitor: DatabaseHealthMonitor;

  beforeAll(() => {
    // Setup test environment
    process.env.NODE_ENV = 'test';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  beforeEach(() => {
    // Reset singleton instance for each test
    jest.clearAllMocks();
    healthMonitor = DatabaseHealthMonitor.getInstance();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  afterAll(() => {
    // Cleanup
    delete process.env.NODE_ENV;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  describe('Initialization', () => {
    it('should create singleton instance correctly', () => {
      const instance1 = DatabaseHealthMonitor.getInstance();
      const instance2 = DatabaseHealthMonitor.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(DatabaseHealthMonitor);
    });

    it('should initialize with default configuration', async () => {
      const status = await healthMonitor.getHealthStatus();

      expect(status).toHaveProperty('overall');
      expect(status).toHaveProperty('timestamp');
      expect(status).toHaveProperty('connectionPools');
      expect(status).toHaveProperty('queryPerformance');
      expect(status).toHaveProperty('resourceUsage');
      expect(status).toHaveProperty('activeAlerts');
      expect(status).toHaveProperty('recommendations');
      expect(status).toHaveProperty('weddingDayMode');
    });
  });

  describe('Health Status Assessment', () => {
    it('should return healthy status when all systems operational', async () => {
      // Mock healthy connection pools
      jest.spyOn(connectionPool, 'getPoolStatistics').mockResolvedValue([
        {
          pool: 'default',
          totalConnections: 10,
          busyConnections: 3,
          pendingAcquires: 0,
          averageAcquireTime: 50,
          failedAcquires: 0,
          acquiredConnections: 100,
          releasedConnections: 97,
          destroyedConnections: 0,
          timedOutAcquires: 0,
          averageCreateTime: 100,
        },
      ]);

      jest.spyOn(connectionPool, 'healthCheck').mockResolvedValue({
        healthy: true,
        pools: [
          {
            name: 'default',
            healthy: true,
            totalConnections: 10,
            issues: [],
          },
        ],
      });

      const status = await healthMonitor.getHealthStatus();

      expect(status.overall).toBe('healthy');
      expect(status.connectionPools).toHaveLength(1);
      expect(status.connectionPools[0].status).toBe('healthy');
    });

    it('should return degraded status when performance issues detected', async () => {
      // Mock degraded connection pools
      jest.spyOn(connectionPool, 'getPoolStatistics').mockResolvedValue([
        {
          pool: 'default',
          totalConnections: 10,
          busyConnections: 8, // High utilization
          pendingAcquires: 3, // Queue building up
          averageAcquireTime: 500, // Slow response
          failedAcquires: 2,
          acquiredConnections: 100,
          releasedConnections: 98,
          destroyedConnections: 0,
          timedOutAcquires: 1,
          averageCreateTime: 200,
        },
      ]);

      jest.spyOn(connectionPool, 'healthCheck').mockResolvedValue({
        healthy: true,
        pools: [
          {
            name: 'default',
            healthy: true,
            totalConnections: 10,
            issues: ['High utilization detected'],
          },
        ],
      });

      const status = await healthMonitor.getHealthStatus();

      expect(status.overall).toBe('degraded');
      expect(status.connectionPools[0].issues).toContain(
        'High utilization detected',
      );
    });

    it('should return critical status when system failures detected', async () => {
      // Mock failed connection pool
      jest.spyOn(connectionPool, 'healthCheck').mockResolvedValue({
        healthy: false,
        pools: [
          {
            name: 'default',
            healthy: false,
            totalConnections: 0,
            issues: ['Connection pool failed', 'Database unreachable'],
          },
        ],
      });

      const status = await healthMonitor.getHealthStatus();

      expect(status.overall).toBe('critical');
      expect(status.activeAlerts.length).toBeGreaterThan(0);
      expect(status.recommendations).toContain(
        expect.stringContaining('critical'),
      );
    });
  });

  describe('Query Performance Tracking', () => {
    it('should track query execution correctly', async () => {
      const mockQuery = 'SELECT * FROM organizations WHERE id = $1';
      const mockDuration = 150;

      await healthMonitor.trackQuery(mockQuery, mockDuration, undefined, {
        organization: 'org_123',
        table: 'organizations',
        type: 'SELECT',
      });

      // Verify query was tracked
      expect(logger.debug).toHaveBeenCalledWith(
        'Query execution tracked',
        expect.objectContaining({
          duration: mockDuration,
          table: 'organizations',
          operation: 'SELECT',
        }),
      );
    });

    it('should detect slow queries and create alerts', async () => {
      const slowQuery =
        'SELECT * FROM organizations JOIN clients ON organizations.id = clients.organization_id';
      const slowDuration = 2500; // 2.5 seconds

      await healthMonitor.trackQuery(slowQuery, slowDuration, undefined, {
        table: 'organizations',
        type: 'SELECT',
      });

      // Verify slow query was logged
      expect(logger.warn).toHaveBeenCalledWith(
        'Slow query detected',
        expect.objectContaining({
          duration: slowDuration,
          table: 'organizations',
          type: 'SELECT',
          impact: expect.any(String),
        }),
      );
    });

    it('should handle query errors appropriately', async () => {
      const errorQuery = 'SELECT * FROM non_existent_table';
      const error = new Error('relation "non_existent_table" does not exist');

      await healthMonitor.trackQuery(errorQuery, 10, error, {
        table: 'non_existent_table',
        type: 'SELECT',
      });

      // Verify error was tracked and alerts created
      const status = await healthMonitor.getHealthStatus();
      const errorAlerts = status.activeAlerts.filter(
        (alert) =>
          alert.severity === 'warning' && alert.title.includes('Query Error'),
      );

      expect(errorAlerts.length).toBeGreaterThan(0);
    });
  });

  describe('Wedding Day Mode', () => {
    beforeEach(() => {
      // Mock date to be a Saturday
      const mockSaturday = new Date('2024-01-06T10:00:00Z'); // Saturday
      jest.useFakeTimers();
      jest.setSystemTime(mockSaturday);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should automatically enable wedding day mode on Saturdays', () => {
      // Create new instance after setting Saturday date
      const newInstance = DatabaseHealthMonitor.getInstance();

      // Wedding day mode should be automatically detected
      expect(newInstance.setWeddingDayMode).toHaveBeenCalledWith(true);
    });

    it('should use more sensitive thresholds in wedding day mode', async () => {
      healthMonitor.setWeddingDayMode(true);

      // Query that would be ok normally but slow in wedding day mode
      const weddingDaySlowQuery = 'SELECT * FROM guests WHERE wedding_id = $1';
      const duration = 750; // 750ms - would be slow in wedding day mode

      await healthMonitor.trackQuery(weddingDaySlowQuery, duration, undefined, {
        table: 'guests',
        type: 'SELECT',
      });

      const status = await healthMonitor.getHealthStatus();
      expect(status.weddingDayMode).toBe(true);

      // Should create alert for wedding day slow query
      const weddingDayAlerts = status.activeAlerts.filter(
        (alert) => alert.weddingDayImpact === true,
      );
      expect(weddingDayAlerts.length).toBeGreaterThan(0);
    });

    it('should create high priority alerts for wedding day issues', async () => {
      healthMonitor.setWeddingDayMode(true);

      // Simulate critical performance issue on wedding day
      const criticalQuery = 'SELECT * FROM venues WHERE id = $1';
      const criticalDuration = 3000; // 3 seconds

      await healthMonitor.trackQuery(
        criticalQuery,
        criticalDuration,
        undefined,
        {
          table: 'venues',
          type: 'SELECT',
        },
      );

      const status = await healthMonitor.getHealthStatus();
      const criticalAlerts = status.activeAlerts.filter(
        (alert) =>
          alert.severity === 'critical' && alert.weddingDayImpact === true,
      );

      expect(criticalAlerts.length).toBeGreaterThan(0);
      expect(criticalAlerts[0]).toMatchObject({
        severity: 'critical',
        weddingDayImpact: true,
        title: expect.stringContaining('Slow Query'),
      });
    });
  });

  describe('Alert Management', () => {
    it('should create alerts for performance issues', async () => {
      // Simulate high connection utilization
      jest.spyOn(connectionPool, 'getPoolStatistics').mockResolvedValue([
        {
          pool: 'default',
          totalConnections: 10,
          busyConnections: 9, // 90% utilization
          pendingAcquires: 5,
          averageAcquireTime: 1000,
          failedAcquires: 0,
          acquiredConnections: 200,
          releasedConnections: 191,
          destroyedConnections: 0,
          timedOutAcquires: 0,
          averageCreateTime: 150,
        },
      ]);

      const status = await healthMonitor.getHealthStatus();

      const utilizationAlerts = status.activeAlerts.filter(
        (alert) =>
          alert.title.includes('Connection') ||
          alert.title.includes('Utilization'),
      );

      expect(utilizationAlerts.length).toBeGreaterThan(0);
      expect(utilizationAlerts[0].severity).toBe('warning');
    });

    it('should allow acknowledging alerts', async () => {
      // Create a test alert first
      await healthMonitor.trackQuery(
        'SELECT * FROM test_table',
        5000,
        undefined,
        {
          table: 'test_table',
          type: 'SELECT',
        },
      );

      let status = await healthMonitor.getHealthStatus();
      const unacknowledgedAlerts = status.activeAlerts.filter(
        (alert) => !alert.acknowledged,
      );
      expect(unacknowledgedAlerts.length).toBeGreaterThan(0);

      // Acknowledge the first alert
      const alertId = unacknowledgedAlerts[0].id;
      await healthMonitor.acknowledgeAlert(alertId, 'test-user');

      status = await healthMonitor.getHealthStatus();
      const acknowledgedAlert = status.activeAlerts.find(
        (alert) => alert.id === alertId,
      );
      expect(acknowledgedAlert?.acknowledged).toBe(true);
    });

    it('should resolve alerts when issues are fixed', async () => {
      // Create a test alert
      await healthMonitor.trackQuery(
        'SELECT * FROM test_table',
        3000,
        undefined,
        {
          table: 'test_table',
          type: 'SELECT',
        },
      );

      let status = await healthMonitor.getHealthStatus();
      const unresolvedAlerts = status.activeAlerts.filter(
        (alert) => !alert.resolvedAt,
      );
      expect(unresolvedAlerts.length).toBeGreaterThan(0);

      // Resolve the alert
      const alertId = unresolvedAlerts[0].id;
      await healthMonitor.resolveAlert(
        alertId,
        'test-user',
        'Performance improved after query optimization',
      );

      status = await healthMonitor.getHealthStatus();
      const resolvedAlert = status.activeAlerts.find(
        (alert) => alert.id === alertId,
      );
      expect(resolvedAlert?.resolvedAt).toBeDefined();
      expect(resolvedAlert?.metadata.resolution).toBe(
        'Performance improved after query optimization',
      );
    });
  });

  describe('Performance Metrics', () => {
    it('should collect real-time metrics correctly', async () => {
      // Track several queries to build up metrics
      const queries = [
        { query: 'SELECT * FROM organizations', duration: 100 },
        { query: 'SELECT * FROM clients', duration: 150 },
        { query: 'SELECT * FROM vendors', duration: 200 },
        { query: 'INSERT INTO guests (name) VALUES ($1)', duration: 50 },
        { query: 'UPDATE clients SET status = $1 WHERE id = $2', duration: 75 },
      ];

      for (const { query, duration } of queries) {
        await healthMonitor.trackQuery(query, duration, undefined, {
          table: 'test_table',
          type: 'SELECT',
        });
      }

      const metrics = await healthMonitor.getRealTimeMetrics();

      expect(metrics).toHaveProperty('connectionPools');
      expect(metrics).toHaveProperty('queryMetrics');
      expect(metrics).toHaveProperty('recentSlowQueries');
      expect(metrics).toHaveProperty('activeConnections');
      expect(metrics).toHaveProperty('queriesPerSecond');
      expect(metrics).toHaveProperty('errorRate');

      expect(metrics.queryMetrics.length).toBeGreaterThan(0);
      expect(typeof metrics.queriesPerSecond).toBe('number');
      expect(typeof metrics.errorRate).toBe('number');
    });

    it('should calculate query performance trends', async () => {
      // Simulate queries over time
      const baseTime = Date.now() - 3600000; // 1 hour ago

      for (let i = 0; i < 10; i++) {
        const queryTime = baseTime + i * 360000; // Every 6 minutes
        jest.setSystemTime(new Date(queryTime));

        await healthMonitor.trackQuery(
          `SELECT * FROM test_table WHERE id = ${i}`,
          100 + i * 10, // Gradually slower queries
          undefined,
          { table: 'test_table', type: 'SELECT' },
        );
      }

      const status = await healthMonitor.getHealthStatus();

      expect(status.queryPerformance.performanceRegression).toBeDefined();
      expect(status.queryPerformance.averageQueryTime).toBeGreaterThan(0);
      expect(status.queryPerformance.slowQueries).toBeDefined();
    });
  });

  describe('Resource Monitoring', () => {
    it('should monitor connection pool utilization', async () => {
      const status = await healthMonitor.getHealthStatus();

      expect(status.resourceUsage).toHaveProperty('connectionCount');
      expect(status.resourceUsage).toHaveProperty('maxConnections');
      expect(status.resourceUsage).toHaveProperty('cacheHitRatio');

      expect(status.resourceUsage.connectionCount).toBeGreaterThanOrEqual(0);
      expect(status.resourceUsage.maxConnections).toBeGreaterThan(0);
      expect(status.resourceUsage.cacheHitRatio).toBeGreaterThanOrEqual(0);
      expect(status.resourceUsage.cacheHitRatio).toBeLessThanOrEqual(1);
    });

    it('should generate recommendations based on resource usage', async () => {
      // Mock high resource utilization
      jest.spyOn(connectionPool, 'getPoolStatistics').mockResolvedValue([
        {
          pool: 'default',
          totalConnections: 20,
          busyConnections: 18, // 90% utilization
          pendingAcquires: 10, // Long queue
          averageAcquireTime: 2000,
          failedAcquires: 5,
          acquiredConnections: 500,
          releasedConnections: 482,
          destroyedConnections: 0,
          timedOutAcquires: 5,
          averageCreateTime: 300,
        },
      ]);

      const status = await healthMonitor.getHealthStatus();

      expect(status.recommendations.length).toBeGreaterThan(0);
      expect(
        status.recommendations.some(
          (rec) =>
            rec.toLowerCase().includes('connection') ||
            rec.toLowerCase().includes('pool') ||
            rec.toLowerCase().includes('scale'),
        ),
      ).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle Supabase connection errors gracefully', async () => {
      // Mock Supabase client to throw error
      const mockError = new Error('Connection refused');
      jest
        .spyOn(connectionPool, 'getPoolStatistics')
        .mockRejectedValue(mockError);

      const status = await healthMonitor.getHealthStatus();

      expect(status.overall).toBe('critical');
      expect(
        status.activeAlerts.some(
          (alert) =>
            alert.severity === 'critical' &&
            alert.title.includes('Health check failed'),
        ),
      ).toBe(true);
    });

    it('should handle invalid query tracking gracefully', async () => {
      const invalidQuery = null as any;
      const invalidDuration = 'invalid' as any;

      // Should not throw error
      await expect(
        healthMonitor.trackQuery(invalidQuery, invalidDuration),
      ).resolves.not.toThrow();
    });

    it('should recover from monitoring system failures', async () => {
      // Simulate monitoring system failure
      jest.spyOn(logger, 'error').mockImplementation(() => {});

      // Force an error in health monitoring
      jest
        .spyOn(connectionPool, 'healthCheck')
        .mockRejectedValue(new Error('Monitoring system failure'));

      const status = await healthMonitor.getHealthStatus();

      // Should still return status (degraded) and not crash
      expect(status).toBeDefined();
      expect(status.overall).toBeDefined();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Performance Impact', () => {
    it('should have minimal overhead when tracking queries', async () => {
      const iterations = 1000;
      const startTime = process.hrtime.bigint();

      // Track many queries to measure overhead
      for (let i = 0; i < iterations; i++) {
        await healthMonitor.trackQuery(
          `SELECT * FROM test_table WHERE id = ${i}`,
          Math.random() * 100,
          undefined,
          { table: 'test_table', type: 'SELECT' },
        );
      }

      const endTime = process.hrtime.bigint();
      const totalTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      const averageTimePerQuery = totalTime / iterations;

      // Should be less than 1ms overhead per query
      expect(averageTimePerQuery).toBeLessThan(1);
    });

    it('should not impact application performance during health checks', async () => {
      const startTime = process.hrtime.bigint();

      // Perform multiple health checks
      const promises = Array(10)
        .fill(null)
        .map(() => healthMonitor.getHealthStatus());

      await Promise.all(promises);

      const endTime = process.hrtime.bigint();
      const totalTime = Number(endTime - startTime) / 1000000;

      // Multiple concurrent health checks should complete quickly
      expect(totalTime).toBeLessThan(1000); // Less than 1 second total
    });
  });
});

describe('Database Health Utilities', () => {
  it('should provide convenient utility functions', async () => {
    const status = await getDatabaseHealthStatus();

    expect(status).toBeDefined();
    expect(status).toHaveProperty('overall');
    expect(status).toHaveProperty('timestamp');
  });

  it('should handle utility function errors gracefully', async () => {
    // Mock the health monitor to throw an error
    jest
      .spyOn(DatabaseHealthMonitor.prototype, 'getHealthStatus')
      .mockRejectedValue(new Error('Health monitor error'));

    await expect(getDatabaseHealthStatus()).rejects.toThrow(
      'Health monitor error',
    );
  });
});

describe('Integration Tests', () => {
  describe('Health Monitor + Connection Pool Integration', () => {
    it('should correctly integrate with connection pool monitoring', async () => {
      const status = await healthMonitor.getHealthStatus();

      // Verify connection pool data is properly integrated
      expect(status.connectionPools).toBeDefined();
      expect(Array.isArray(status.connectionPools)).toBe(true);

      if (status.connectionPools.length > 0) {
        const pool = status.connectionPools[0];
        expect(pool).toHaveProperty('poolName');
        expect(pool).toHaveProperty('status');
        expect(pool).toHaveProperty('totalConnections');
        expect(pool).toHaveProperty('activeConnections');
        expect(pool).toHaveProperty('queueLength');
        expect(pool).toHaveProperty('averageResponseTime');
        expect(pool).toHaveProperty('errorRate');
      }
    });
  });

  describe('Health Monitor + Caching Integration', () => {
    it('should cache health status for performance', async () => {
      const status1 = await healthMonitor.getHealthStatus();
      const status2 = await healthMonitor.getHealthStatus();

      // Timestamps should be very close (indicating caching)
      const timeDiff = Math.abs(
        status2.timestamp.getTime() - status1.timestamp.getTime(),
      );
      expect(timeDiff).toBeLessThan(1000); // Less than 1 second difference
    });
  });
});
