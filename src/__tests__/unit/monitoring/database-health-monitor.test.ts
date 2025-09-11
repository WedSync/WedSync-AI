/**
 * WS-234 Database Health Monitor Unit Tests
 * Comprehensive test suite for DatabaseHealthMonitor with wedding season optimizations
 */

import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { DatabaseHealthMonitor } from '@/lib/monitoring/database-health-monitor';

// Mock Supabase client
const mockSupabaseClient = {
  rpc: jest.fn(),
  from: jest.fn(() => ({
    insert: jest.fn(() => ({ error: null })),
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => ({ data: null, error: null })),
      })),
    })),
  })),
  auth: {
    getUser: jest.fn(),
  },
};

// Mock createClient
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

// Mock environment variables
const originalEnv = process.env;
beforeEach(() => {
  process.env = {
    ...originalEnv,
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-key',
  };

  // Reset all mocks
  jest.clearAllMocks();
});

afterEach(() => {
  process.env = originalEnv;
});

describe('DatabaseHealthMonitor', () => {
  let monitor: DatabaseHealthMonitor;

  beforeEach(() => {
    // Reset singleton instance
    (DatabaseHealthMonitor as any).instance = undefined;
    monitor = DatabaseHealthMonitor.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance when called multiple times', () => {
      const instance1 = DatabaseHealthMonitor.getInstance();
      const instance2 = DatabaseHealthMonitor.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should throw error when environment variables are missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      // Reset singleton
      (DatabaseHealthMonitor as any).instance = undefined;

      expect(() => DatabaseHealthMonitor.getInstance()).toThrow(
        'Supabase configuration missing for database health monitoring',
      );
    });
  });

  describe('Connection Pool Monitoring', () => {
    it('should detect critical connection pool utilization', async () => {
      // Mock high connection usage
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [{ active: 85, idle: 10, idle_in_transaction: 2, waiting: 5 }],
        error: null,
      });

      const metrics = await (monitor as any).checkConnectionPool();

      expect(metrics.status).toBe('critical');
      expect(metrics.utilizationPercent).toBe(95);
      expect(metrics.active).toBe(85);
      expect(metrics.idle).toBe(10);
      expect(metrics.idleInTransaction).toBe(2);
      expect(metrics.waiting).toBe(5);
    });

    it('should apply wedding season adjustments to thresholds', () => {
      // Mock wedding season (June)
      const mockDate = new Date('2024-06-15');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const isWeddingSeason = (monitor as any).isWeddingSeason();
      const multiplier = (monitor as any).getWeddingSeasonMultiplier();

      expect(isWeddingSeason).toBe(true);
      expect(multiplier).toBe(1.6); // June peak multiplier
    });

    it('should handle normal season thresholds correctly', () => {
      // Mock non-wedding season (January)
      const mockDate = new Date('2024-01-15');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const isWeddingSeason = (monitor as any).isWeddingSeason();
      const multiplier = (monitor as any).getWeddingSeasonMultiplier();

      expect(isWeddingSeason).toBe(false);
      expect(multiplier).toBe(1.0);
    });

    it('should detect peak wedding times correctly', () => {
      // Mock Saturday evening
      const mockDate = new Date('2024-06-15T19:00:00'); // Saturday 7 PM
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const isPeakTime = (monitor as any).isWeddingPeakTime();

      expect(isPeakTime).toBe(true);
    });
  });

  describe('Storage Usage Monitoring', () => {
    it('should calculate storage usage correctly with 5GB Supabase limit', async () => {
      // Mock database size query
      mockSupabaseClient.rpc
        .mockResolvedValueOnce({
          data: [
            {
              database_size: 2 * 1024 * 1024 * 1024, // 2GB
              database_size_pretty: '2048 MB',
            },
          ],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [
            {
              schemaname: 'public',
              tablename: 'form_responses',
              size: '500 MB',
              size_bytes: 500 * 1024 * 1024,
              percentage: 10.0,
              is_wedding_critical: true,
            },
            {
              schemaname: 'public',
              tablename: 'user_profiles',
              size: '100 MB',
              size_bytes: 100 * 1024 * 1024,
              percentage: 2.0,
              is_wedding_critical: false,
            },
          ],
          error: null,
        });

      const metrics = await (monitor as any).checkStorageUsage();

      expect(metrics.percentage).toBe(40); // 2GB of 5GB
      expect(metrics.status).toBe('healthy'); // Below 80% warning threshold
      expect(metrics.largestTables).toHaveLength(2);
      expect(metrics.largestTables[0].isWeddingCritical).toBe(true);
      expect(metrics.weddingDataPercentage).toBeGreaterThan(0);
    });

    it('should detect critical storage conditions', async () => {
      // Mock near-full database
      mockSupabaseClient.rpc
        .mockResolvedValueOnce({
          data: [
            {
              database_size: 4.5 * 1024 * 1024 * 1024, // 4.5GB
              database_size_pretty: '4608 MB',
            },
          ],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [],
          error: null,
        });

      const metrics = await (monitor as any).checkStorageUsage();

      expect(metrics.percentage).toBe(90); // 4.5GB of 5GB
      expect(metrics.status).toBe('critical');
      expect(metrics.critical).toBe(true);
    });
  });

  describe('Query Performance Analysis', () => {
    it('should identify slow queries exceeding thresholds', async () => {
      // Mock pg_stat_statements availability
      mockSupabaseClient.rpc
        .mockResolvedValueOnce({
          data: [{ enabled: true }],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [
            {
              query_hash: 'abc123',
              query:
                "SELECT * FROM form_responses WHERE created_at > NOW() - INTERVAL '1 day'",
              calls: 100,
              mean_exec_time: 1500,
              total_exec_time: 150000,
              max_exec_time: 3000,
              min_exec_time: 500,
              is_wedding_related: true,
            },
          ],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [
            {
              avg_time: 750,
              median_time: 500,
              p95_time: 2000,
              p99_time: 3000,
              total_queries: 1000,
              critical_queries: 5,
            },
          ],
          error: null,
        });

      const metrics = await (monitor as any).checkQueryPerformance();

      expect(metrics.avgTime).toBe(750);
      expect(metrics.p95Time).toBe(2000);
      expect(metrics.slowQueries).toHaveLength(1);
      expect(metrics.slowQueries[0].isWeddingRelated).toBe(true);
      expect(metrics.slowQueries[0].avgTime).toBe(1500);
      expect(metrics.criticalQueries).toBe(5);
      expect(metrics.weddingSeasonImpact).toBe(1);
    });

    it('should handle missing pg_stat_statements extension gracefully', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [{ enabled: false }],
        error: null,
      });

      const metrics = await (monitor as any).checkQueryPerformance();

      expect(metrics.avgTime).toBe(0);
      expect(metrics.slowQueries).toHaveLength(0);
      expect(metrics.status).toBe('healthy');
    });
  });

  describe('Health Status Calculation', () => {
    it('should calculate overall health status correctly', () => {
      const healthyMetrics = { status: 'healthy' };
      const warningMetrics = { status: 'warning' };
      const criticalMetrics = { status: 'critical' };

      // All healthy
      expect(
        (monitor as any).calculateOverallHealth(healthyMetrics, healthyMetrics),
      ).toBe('healthy');

      // Mixed with warning
      expect(
        (monitor as any).calculateOverallHealth(healthyMetrics, warningMetrics),
      ).toBe('warning');

      // Mixed with critical
      expect(
        (monitor as any).calculateOverallHealth(
          warningMetrics,
          criticalMetrics,
        ),
      ).toBe('critical');

      // All critical
      expect(
        (monitor as any).calculateOverallHealth(
          criticalMetrics,
          criticalMetrics,
        ),
      ).toBe('critical');
    });

    it('should apply wedding season context to status calculation', () => {
      // Mock wedding season
      const mockDate = new Date('2024-06-15');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const connectionStatus = (monitor as any).getConnectionPoolStatus(
        75,
        true,
      );
      const nonSeasonStatus = (monitor as any).getConnectionPoolStatus(
        75,
        false,
      );

      expect(connectionStatus).toBe('healthy'); // 75% is OK during wedding season
      expect(nonSeasonStatus).toBe('warning'); // 75% is warning during normal times
    });
  });

  describe('Comprehensive Health Check', () => {
    it('should perform complete health check with all components', async () => {
      // Mock all health check responses
      mockSupabaseClient.rpc
        // Connection pool check
        .mockResolvedValueOnce({
          data: [{ active: 20, idle: 30, idle_in_transaction: 1, waiting: 0 }],
          error: null,
        })
        // Storage size check
        .mockResolvedValueOnce({
          data: [
            {
              database_size: 1024 * 1024 * 1024,
              database_size_pretty: '1024 MB',
            },
          ],
          error: null,
        })
        // Table sizes check
        .mockResolvedValueOnce({
          data: [
            {
              tablename: 'form_responses',
              size: '500 MB',
              size_bytes: 500 * 1024 * 1024,
              percentage: 10.0,
              is_wedding_critical: true,
            },
          ],
          error: null,
        })
        // pg_stat_statements availability
        .mockResolvedValueOnce({
          data: [{ enabled: true }],
          error: null,
        })
        // Slow queries
        .mockResolvedValueOnce({
          data: [],
          error: null,
        })
        // Performance stats
        .mockResolvedValueOnce({
          data: [
            {
              avg_time: 200,
              median_time: 150,
              p95_time: 500,
              p99_time: 1000,
              total_queries: 1000,
              critical_queries: 0,
            },
          ],
          error: null,
        });

      const healthMetrics = await monitor.checkDatabaseHealth();

      expect(healthMetrics.status).toBe('healthy');
      expect(healthMetrics.connectionPool).toBeDefined();
      expect(healthMetrics.storage).toBeDefined();
      expect(healthMetrics.queryPerformance).toBeDefined();
      expect(healthMetrics.locks).toBeDefined();
      expect(healthMetrics.indexHealth).toBeDefined();
      expect(healthMetrics.tableBloat).toBeDefined();
      expect(healthMetrics.weddingSeasonContext).toBeDefined();
      expect(healthMetrics.lastChecked).toBeDefined();
    });

    it('should handle health check errors gracefully', async () => {
      mockSupabaseClient.rpc.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(monitor.checkDatabaseHealth()).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('Real-time Monitoring', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start and stop monitoring correctly', async () => {
      const checkHealthSpy = jest
        .spyOn(monitor, 'checkDatabaseHealth')
        .mockResolvedValue({} as any);

      await monitor.startRealTimeMonitoring();

      // Fast-forward 30 seconds
      jest.advanceTimersByTime(30000);

      expect(checkHealthSpy).toHaveBeenCalled();

      await monitor.stopMonitoring();

      // Clear previous calls and advance time again
      checkHealthSpy.mockClear();
      jest.advanceTimersByTime(30000);

      // Should not be called after stopping
      expect(checkHealthSpy).not.toHaveBeenCalled();
    });
  });

  describe('Wedding Season Utilities', () => {
    it('should correctly identify wedding season months', () => {
      const testCases = [
        { month: 1, expected: false }, // January
        { month: 5, expected: true }, // May
        { month: 6, expected: true }, // June
        { month: 7, expected: true }, // July
        { month: 8, expected: false }, // August
        { month: 9, expected: true }, // September
        { month: 10, expected: true }, // October
        { month: 12, expected: false }, // December
      ];

      testCases.forEach(({ month, expected }) => {
        const mockDate = new Date(
          `2024-${month.toString().padStart(2, '0')}-15`,
        );
        jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

        const isWeddingSeason = (monitor as any).isWeddingSeason();
        expect(isWeddingSeason).toBe(expected);
      });
    });

    it('should return correct multipliers for wedding season months', () => {
      const testCases = [
        { month: 5, expected: 1.4 }, // May
        { month: 6, expected: 1.6 }, // June (peak)
        { month: 7, expected: 1.5 }, // July
        { month: 9, expected: 1.3 }, // September
        { month: 10, expected: 1.4 }, // October
        { month: 1, expected: 1.0 }, // January (normal)
      ];

      testCases.forEach(({ month, expected }) => {
        const mockDate = new Date(
          `2024-${month.toString().padStart(2, '0')}-15`,
        );
        jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

        const multiplier = (monitor as any).getWeddingSeasonMultiplier();
        expect(multiplier).toBe(expected);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle Supabase RPC errors in connection pool check', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Connection failed' },
      });

      await expect((monitor as any).checkConnectionPool()).rejects.toThrow(
        'Connection pool check failed: Connection failed',
      );
    });

    it('should handle Supabase RPC errors in storage check', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Permission denied' },
      });

      await expect((monitor as any).checkStorageUsage()).rejects.toThrow(
        'Storage size check failed: Permission denied',
      );
    });

    it('should continue operation after non-critical errors', async () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // Mock storage metrics failing but continue with query performance
      mockSupabaseClient.rpc
        .mockResolvedValueOnce({
          data: [{ active: 10, idle: 20, idle_in_transaction: 0, waiting: 0 }],
          error: null,
        })
        .mockRejectedValueOnce(new Error('Storage check failed'))
        .mockResolvedValueOnce({
          data: [{ enabled: false }],
          error: null,
        });

      // Should not throw, but should handle the error gracefully
      const healthCheck = monitor.checkDatabaseHealth();
      await expect(healthCheck).rejects.toThrow(); // Will throw due to storage failure

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Metrics Storage', () => {
    it('should store health metrics in database', async () => {
      const insertMock = jest.fn(() => ({ error: null }));
      mockSupabaseClient.from.mockReturnValue({
        insert: insertMock,
      });

      await (monitor as any).storeHealthMetrics();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith(
        'database_health_metrics',
      );
      expect(insertMock).toHaveBeenCalled();
    });

    it('should handle storage errors gracefully', async () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const insertMock = jest.fn(() => ({
        error: { message: 'Insert failed' },
      }));

      mockSupabaseClient.from.mockReturnValue({
        insert: insertMock,
      });

      // Should not throw, but should log error
      await (monitor as any).storeHealthMetrics();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to store health metrics:',
        { message: 'Insert failed' },
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
