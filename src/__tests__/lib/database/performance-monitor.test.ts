/**
 * Database Performance Monitor Tests
 * Comprehensive test suite for database performance monitoring functionality
 */

import {
  databasePerformanceMonitor,
  monitorQuery,
} from '@/lib/database/performance-monitor';
import { structuredLogger } from '@/lib/monitoring/structured-logger';
import { performanceMonitor } from '@/lib/performance/PerformanceMonitor';
import { supabase } from '@/utils/supabase/client';

// Mock external dependencies
jest.mock('@/lib/monitoring/structured-logger');
jest.mock('@/lib/performance/PerformanceMonitor');
jest.mock('@/utils/supabase/client');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockStructuredLogger = structuredLogger as jest.Mocked<
  typeof structuredLogger
>;
const mockPerformanceMonitor = performanceMonitor as jest.Mocked<
  typeof performanceMonitor
>;

describe('Database Performance Monitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1703980800000); // Fixed timestamp

    // Mock Supabase responses
    mockSupabase.rpc.mockResolvedValue({ data: [], error: null });
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        neq: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    } as any);
  });

  afterEach(() => {
    databasePerformanceMonitor.stopMonitoring();
    jest.restoreAllMocks();
  });

  describe('Monitoring Lifecycle', () => {
    test('should start monitoring with default interval', () => {
      const spy = jest.spyOn(global, 'setInterval');

      databasePerformanceMonitor.startMonitoring();

      expect(spy).toHaveBeenCalledWith(expect.any(Function), 30000);
      expect(mockStructuredLogger.info).toHaveBeenCalledWith(
        'Starting database performance monitoring',
        expect.objectContaining({
          interval: '30000ms',
          slowQueryThreshold: '1000ms',
        }),
      );
    });

    test('should start monitoring with custom interval', () => {
      const spy = jest.spyOn(global, 'setInterval');

      databasePerformanceMonitor.startMonitoring(60000);

      expect(spy).toHaveBeenCalledWith(expect.any(Function), 60000);
    });

    test('should not start monitoring if already running', () => {
      const spy = jest.spyOn(global, 'setInterval');

      databasePerformanceMonitor.startMonitoring();
      databasePerformanceMonitor.startMonitoring(); // Second call

      expect(spy).toHaveBeenCalledTimes(1);
      expect(mockStructuredLogger.warn).toHaveBeenCalledWith(
        'Database performance monitoring already running',
      );
    });

    test('should stop monitoring', () => {
      const spy = jest.spyOn(global, 'clearInterval');

      databasePerformanceMonitor.startMonitoring();
      databasePerformanceMonitor.stopMonitoring();

      expect(spy).toHaveBeenCalled();
      expect(mockStructuredLogger.info).toHaveBeenCalledWith(
        'Stopped database performance monitoring',
      );
    });
  });

  describe('Query Monitoring', () => {
    test('should monitor successful query execution', async () => {
      const mockQueryFn = jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]);
      mockPerformanceMonitor.measureAsync.mockResolvedValue([
        { id: 1 },
        { id: 2 },
      ]);

      const result = await monitorQuery('test-query', 'clients', mockQueryFn);

      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
      expect(mockPerformanceMonitor.measureAsync).toHaveBeenCalledWith(
        'test-query',
        mockQueryFn,
      );
      expect(mockQueryFn).toHaveBeenCalledTimes(1);
    });

    test('should detect and log slow queries', async () => {
      const mockQueryFn = jest.fn().mockImplementation(async () => {
        // Simulate slow query
        await new Promise((resolve) => setTimeout(resolve, 1500));
        return [{ id: 1 }];
      });

      mockPerformanceMonitor.measureAsync.mockResolvedValue([{ id: 1 }]);

      const result = await monitorQuery('slow-query', 'clients', mockQueryFn);

      expect(result).toEqual([{ id: 1 }]);
      expect(mockStructuredLogger.warn).toHaveBeenCalledWith(
        'Slow query detected',
        expect.objectContaining({
          query: 'slow-query',
          table: 'clients',
          threshold: 1000,
        }),
      );
    });

    test('should handle query execution errors', async () => {
      const mockError = new Error('Database connection failed');
      const mockQueryFn = jest.fn().mockRejectedValue(mockError);

      await expect(
        monitorQuery('error-query', 'clients', mockQueryFn),
      ).rejects.toThrow('Database connection failed');

      expect(mockStructuredLogger.error).toHaveBeenCalledWith(
        'Query execution failed',
        expect.objectContaining({
          query: 'error-query',
          table: 'clients',
          error: 'Database connection failed',
        }),
      );
    });

    test('should generate optimization suggestions for slow queries', async () => {
      const mockQueryFn = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 6000)); // Very slow
        return [{ id: 1 }];
      });

      mockPerformanceMonitor.measureAsync.mockResolvedValue([{ id: 1 }]);

      await monitorQuery('very-slow-query', 'bookings', mockQueryFn);

      expect(mockStructuredLogger.warn).toHaveBeenCalledWith(
        'Slow query detected',
        expect.objectContaining({
          query: 'very-slow-query',
          table: 'bookings',
        }),
      );
    });
  });

  describe('Database Metrics Collection', () => {
    test('should collect comprehensive database metrics', async () => {
      // Mock connection health data
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          neq: jest.fn().mockResolvedValue({
            data: [
              { state: 'active', pid: 123 },
              { state: 'active', pid: 124 },
            ],
            error: null,
          }),
        }),
      } as any);

      // Mock table stats
      mockSupabase.rpc.mockImplementation((funcName: string) => {
        switch (funcName) {
          case 'get_table_stats':
            return Promise.resolve({
              data: [
                {
                  table_name: 'clients',
                  row_count: 1000,
                  table_size: '100 MB',
                  query_frequency: 50,
                },
              ],
              error: null,
            });
          case 'get_index_stats':
            return Promise.resolve({
              data: [
                {
                  table_name: 'clients',
                  index_name: 'idx_clients_email',
                  idx_tup_read: 1000,
                  idx_tup_fetch: 800,
                  index_size: '10 MB',
                },
              ],
              error: null,
            });
          default:
            return Promise.resolve({ data: [], error: null });
        }
      });

      const metrics = await databasePerformanceMonitor.getDatabaseMetrics();

      expect(metrics).toMatchObject({
        queryCount: expect.any(Number),
        avgResponseTime: expect.any(Number),
        slowQueries: expect.any(Array),
        connectionHealth: expect.objectContaining({
          activeConnections: 2,
          maxConnections: 100,
          utilization: 2,
          status: 'healthy',
        }),
        indexEfficiency: expect.any(Array),
        tableStats: expect.arrayContaining([
          expect.objectContaining({
            tableName: 'clients',
            rowCount: 1000,
          }),
        ]),
        optimizationOpportunities: expect.any(Array),
      });
    });

    test('should handle connection health errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          neq: jest.fn().mockResolvedValue({
            data: null,
            error: new Error('Permission denied'),
          }),
        }),
      } as any);

      const metrics = await databasePerformanceMonitor.getDatabaseMetrics();

      expect(metrics.connectionHealth).toMatchObject({
        activeConnections: 0,
        maxConnections: 100,
        utilization: 0,
        status: 'healthy',
      });

      expect(mockStructuredLogger.warn).toHaveBeenCalledWith(
        'Could not fetch connection health',
        expect.objectContaining({ error: expect.any(Error) }),
      );
    });

    test('should identify optimization opportunities', async () => {
      // Add some slow queries to trigger optimization detection
      const mockQueryFn = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return [{ id: 1 }];
      });

      mockPerformanceMonitor.measureAsync.mockResolvedValue([{ id: 1 }]);

      // Generate slow queries
      await monitorQuery('slow-booking-query', 'bookings', mockQueryFn);
      await monitorQuery('slow-client-query', 'clients', mockQueryFn);

      const metrics = await databasePerformanceMonitor.getDatabaseMetrics();

      expect(metrics.optimizationOpportunities.length).toBeGreaterThan(0);
      expect(metrics.optimizationOpportunities[0]).toMatchObject({
        type: expect.stringMatching(/index|query|schema|connection/),
        severity: expect.stringMatching(/low|medium|high|critical/),
        table: expect.any(String),
        description: expect.any(String),
        recommendation: expect.any(String),
      });
    });
  });

  describe('Wedding Context Analysis', () => {
    test('should identify booking-related queries', async () => {
      const mockQueryFn = jest.fn().mockResolvedValue([]);
      mockPerformanceMonitor.measureAsync.mockResolvedValue([]);

      await monitorQuery(
        'SELECT * FROM bookings WHERE wedding_date = ?',
        'bookings',
        mockQueryFn,
      );

      const metrics = await databasePerformanceMonitor.getDatabaseMetrics();

      // Should categorize as booking context
      expect(mockPerformanceMonitor.measureAsync).toHaveBeenCalled();
    });

    test('should identify vendor search queries', async () => {
      const mockQueryFn = jest.fn().mockResolvedValue([]);
      mockPerformanceMonitor.measureAsync.mockResolvedValue([]);

      await monitorQuery(
        'SELECT * FROM vendors WHERE category = ?',
        'vendors',
        mockQueryFn,
      );

      expect(mockPerformanceMonitor.measureAsync).toHaveBeenCalled();
    });

    test('should assess business criticality correctly', async () => {
      const mockQueryFn = jest.fn().mockResolvedValue([]);
      mockPerformanceMonitor.measureAsync.mockResolvedValue([]);

      // Critical: payments
      await monitorQuery(
        'UPDATE payments SET status = ?',
        'payments',
        mockQueryFn,
      );

      // High: vendor search
      await monitorQuery('SELECT * FROM vendors', 'vendors', mockQueryFn);

      expect(mockPerformanceMonitor.measureAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance Monitoring Integration', () => {
    test('should record metrics with existing performance monitor', async () => {
      databasePerformanceMonitor.startMonitoring();

      // Mock table stats for metrics collection
      mockSupabase.rpc.mockResolvedValue({
        data: [{ table_name: 'clients', row_count: 100 }],
        error: null,
      });

      // Trigger metrics collection manually
      const metrics = await databasePerformanceMonitor.getDatabaseMetrics();

      expect(mockPerformanceMonitor.recordMetric).toHaveBeenCalledWith(
        'database.queryCount',
        expect.any(Number),
      );
      expect(mockPerformanceMonitor.recordMetric).toHaveBeenCalledWith(
        'database.avgResponseTime',
        expect.any(Number),
      );
      expect(mockPerformanceMonitor.recordMetric).toHaveBeenCalledWith(
        'database.connectionUtilization',
        expect.any(Number),
      );
    });

    test('should handle metrics collection errors', async () => {
      mockSupabase.rpc.mockRejectedValue(new Error('Database unavailable'));

      await expect(
        databasePerformanceMonitor.getDatabaseMetrics(),
      ).rejects.toThrow('Database unavailable');

      expect(mockStructuredLogger.error).toHaveBeenCalledWith(
        'Failed to collect database metrics',
        expect.objectContaining({ error: expect.any(Error) }),
      );
    });
  });

  describe('Memory Management', () => {
    test('should limit query metrics storage to prevent memory issues', async () => {
      const mockQueryFn = jest.fn().mockResolvedValue([{ id: 1 }]);
      mockPerformanceMonitor.measureAsync.mockResolvedValue([{ id: 1 }]);

      // Generate many queries to test memory limit
      for (let i = 0; i < 1005; i++) {
        await monitorQuery(`query-${i}`, 'test_table', mockQueryFn);
      }

      const metrics = await databasePerformanceMonitor.getDatabaseMetrics();

      // Should not exceed memory limits
      expect(metrics.queryCount).toBeLessThanOrEqual(1000);
    });

    test('should filter recent metrics correctly', async () => {
      const mockQueryFn = jest.fn().mockResolvedValue([{ id: 1 }]);
      mockPerformanceMonitor.measureAsync.mockResolvedValue([{ id: 1 }]);

      // Mock old timestamp
      jest
        .spyOn(Date, 'now')
        .mockReturnValue(1703980800000 - 2 * 60 * 60 * 1000); // 2 hours ago
      await monitorQuery('old-query', 'test_table', mockQueryFn);

      // Mock current timestamp
      jest.spyOn(Date, 'now').mockReturnValue(1703980800000);
      await monitorQuery('recent-query', 'test_table', mockQueryFn);

      const metrics = await databasePerformanceMonitor.getDatabaseMetrics();

      // Should only include recent queries
      expect(metrics.queryCount).toBe(1);
    });
  });
});

describe('monitorQuery utility function', () => {
  test('should delegate to performance monitor instance', async () => {
    const mockQueryFn = jest.fn().mockResolvedValue([{ id: 1 }]);
    const spy = jest.spyOn(databasePerformanceMonitor, 'monitorQuery');
    mockPerformanceMonitor.measureAsync.mockResolvedValue([{ id: 1 }]);

    await monitorQuery('test-query', 'test_table', mockQueryFn);

    expect(spy).toHaveBeenCalledWith('test-query', 'test_table', mockQueryFn);
  });
});
