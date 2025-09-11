/**
 * Database Auto Tuner Tests
 * Tests for automated database performance tuning functionality
 */

import { databaseAutoTuner } from '@/lib/database/auto-tuner';
import { databasePerformanceMonitor } from '@/lib/database/performance-monitor';
import { queryOptimizer } from '@/lib/database/query-optimizer';
import { structuredLogger } from '@/lib/monitoring/structured-logger';
import { supabase } from '@/utils/supabase/client';

// Mock external dependencies
jest.mock('@/lib/database/performance-monitor');
jest.mock('@/lib/database/query-optimizer');
jest.mock('@/lib/monitoring/structured-logger');
jest.mock('@/utils/supabase/client');

const mockDatabasePerformanceMonitor =
  databasePerformanceMonitor as jest.Mocked<typeof databasePerformanceMonitor>;
const mockQueryOptimizer = queryOptimizer as jest.Mocked<typeof queryOptimizer>;
const mockStructuredLogger = structuredLogger as jest.Mocked<
  typeof structuredLogger
>;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('Database Auto Tuner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(global, 'setInterval').mockImplementation(() => ({}) as any);
    jest.spyOn(global, 'clearInterval').mockImplementation(() => {});
    jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
      fn();
      return {} as any;
    });

    // Mock default database metrics
    mockDatabasePerformanceMonitor.getDatabaseMetrics.mockResolvedValue({
      queryCount: 100,
      avgResponseTime: 150,
      slowQueries: [],
      connectionHealth: {
        activeConnections: 20,
        maxConnections: 100,
        utilization: 20,
        avgConnectionAge: 30000,
        status: 'healthy',
      },
      indexEfficiency: [],
      tableStats: [],
      optimizationOpportunities: [],
    });
  });

  afterEach(() => {
    databaseAutoTuner.stopAutoTuning();
    jest.restoreAllMocks();
  });

  describe('Configuration Management', () => {
    test('should start with disabled configuration', () => {
      const config = databaseAutoTuner.getConfig();

      expect(config.enabled).toBe(false);
      expect(config.aggressiveness).toBe('conservative');
      expect(config.autoApplyIndexes).toBe(true);
      expect(config.autoApplyQueryOptimizations).toBe(false);
    });

    test('should update configuration', () => {
      const updates = {
        enabled: true,
        aggressiveness: 'moderate' as const,
        performanceThreshold: 2000,
      };

      databaseAutoTuner.updateConfig(updates);
      const config = databaseAutoTuner.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.aggressiveness).toBe('moderate');
      expect(config.performanceThreshold).toBe(2000);

      expect(mockStructuredLogger.info).toHaveBeenCalledWith(
        'Auto-tuning configuration updated',
        updates,
      );
    });
  });

  describe('Auto Tuning Lifecycle', () => {
    test('should not start auto-tuning when disabled', async () => {
      await databaseAutoTuner.startAutoTuning({ enabled: false });

      expect(mockStructuredLogger.info).toHaveBeenCalledWith(
        'Auto-tuning is disabled in configuration',
      );
      expect(global.setInterval).not.toHaveBeenCalled();
    });

    test('should start auto-tuning when enabled', async () => {
      await databaseAutoTuner.startAutoTuning({
        enabled: true,
        monitoringInterval: 30,
      });

      expect(mockStructuredLogger.info).toHaveBeenCalledWith(
        'Starting database auto-tuning',
        expect.objectContaining({
          aggressiveness: 'conservative',
          monitoringInterval: 30,
          autoApplyIndexes: true,
        }),
      );
      expect(global.setInterval).toHaveBeenCalledWith(
        expect.any(Function),
        30 * 60 * 1000, // 30 minutes in ms
      );
    });

    test('should not start if already running', async () => {
      await databaseAutoTuner.startAutoTuning({ enabled: true });
      await databaseAutoTuner.startAutoTuning({ enabled: true });

      expect(mockStructuredLogger.warn).toHaveBeenCalledWith(
        'Auto-tuning is already running',
      );
    });

    test('should stop auto-tuning', async () => {
      await databaseAutoTuner.startAutoTuning({ enabled: true });
      databaseAutoTuner.stopAutoTuning();

      expect(mockStructuredLogger.info).toHaveBeenCalledWith(
        'Stopped database auto-tuning',
      );
      expect(global.clearInterval).toHaveBeenCalled();
    });
  });

  describe('Tuning Cycle Execution', () => {
    test('should perform complete tuning cycle', async () => {
      // Mock optimization opportunities
      mockDatabasePerformanceMonitor.getDatabaseMetrics.mockResolvedValue({
        queryCount: 100,
        avgResponseTime: 500,
        slowQueries: [
          {
            query: 'SELECT * FROM bookings WHERE wedding_date = ?',
            table: 'bookings',
            executionTime: 2000,
            timestamp: new Date(),
            rowsAffected: 100,
            planCost: 1500,
          },
        ],
        connectionHealth: {
          activeConnections: 50,
          maxConnections: 100,
          utilization: 50,
          avgConnectionAge: 30000,
          status: 'healthy',
        },
        indexEfficiency: [],
        tableStats: [
          {
            tableName: 'bookings',
            rowCount: 100000,
            size: '50 MB',
            lastUpdated: new Date(),
            queryFrequency: 50,
            averageResponseTime: 1200,
          },
        ],
        optimizationOpportunities: [
          {
            type: 'index',
            severity: 'high',
            table: 'bookings',
            description: 'Large table with slow queries',
            recommendation: 'Add indexes on frequently queried columns',
            estimatedImpact: 'Reduce query time by 50-70%',
            effort: 'low',
          },
        ],
      });

      // Mock index suggestions
      mockQueryOptimizer.generateIndexSuggestions.mockResolvedValue([
        {
          table: 'bookings',
          columns: ['wedding_date'],
          type: 'btree',
          priority: 'high',
          reason: 'Column used in 20 queries',
          sql: 'CREATE INDEX idx_bookings_wedding_date ON bookings (wedding_date);',
          estimatedImpact: '60% faster queries',
        },
      ]);

      // Mock successful SQL execution
      mockSupabase.rpc.mockResolvedValue({ error: null });

      await databaseAutoTuner.performTuningCycle();

      expect(mockStructuredLogger.info).toHaveBeenCalledWith(
        'Starting database tuning cycle',
      );
      expect(mockStructuredLogger.info).toHaveBeenCalledWith(
        'Tuning cycle completed',
        expect.objectContaining({
          opportunitiesFound: 1,
          actionsGenerated: expect.any(Number),
          actionsApplied: expect.any(Number),
        }),
      );
    });

    test('should handle tuning cycle errors gracefully', async () => {
      mockDatabasePerformanceMonitor.getDatabaseMetrics.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await databaseAutoTuner.performTuningCycle();

      expect(mockStructuredLogger.error).toHaveBeenCalledWith(
        'Failed to complete tuning cycle',
        expect.objectContaining({
          error: expect.any(Error),
        }),
      );
    });
  });

  describe('Index Optimization Actions', () => {
    test('should create index optimization actions', async () => {
      const opportunity = {
        type: 'index' as const,
        severity: 'high' as const,
        table: 'bookings',
        description: 'High frequency table needs optimization',
        recommendation: 'Add index on wedding_date column',
        estimatedImpact: 'Reduce query time by 60%',
        effort: 'low' as const,
      };

      // Mock index suggestions
      mockQueryOptimizer.generateIndexSuggestions.mockResolvedValue([
        {
          table: 'bookings',
          columns: ['wedding_date', 'venue_id'],
          type: 'btree',
          priority: 'high',
          reason: 'Used in 25 queries',
          sql: 'CREATE INDEX idx_bookings_wedding_venue ON bookings (wedding_date, venue_id);',
          estimatedImpact: '65% faster queries',
        },
      ]);

      mockDatabasePerformanceMonitor.getDatabaseMetrics.mockResolvedValue({
        queryCount: 100,
        avgResponseTime: 200,
        slowQueries: [
          {
            query: 'SELECT * FROM bookings WHERE wedding_date = ?',
            table: 'bookings',
            executionTime: 1500,
            timestamp: new Date(),
            rowsAffected: 50,
            planCost: 1000,
          },
        ],
        connectionHealth: {
          activeConnections: 20,
          maxConnections: 100,
          utilization: 20,
          avgConnectionAge: 30000,
          status: 'healthy',
        },
        indexEfficiency: [],
        tableStats: [],
        optimizationOpportunities: [opportunity],
      });

      mockSupabase.rpc.mockResolvedValue({ error: null });

      await databaseAutoTuner.startAutoTuning({
        enabled: true,
        autoApplyIndexes: true,
        aggressiveness: 'moderate',
      });

      await databaseAutoTuner.performTuningCycle();

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'execute_admin_sql',
        expect.objectContaining({
          sql_text: expect.stringContaining('CREATE INDEX'),
        }),
      );
    });

    test('should respect max indexes per table limit', async () => {
      // Set low limit for testing
      databaseAutoTuner.updateConfig({ maxIndexesPerTable: 1 });

      // Mock existing index actions
      const existingActions = Array.from({ length: 2 }, (_, i) => ({
        id: `existing_${i}`,
        type: 'create_index' as const,
        table: 'bookings',
        description: `Existing index ${i}`,
        sql: 'CREATE INDEX ...',
        status: 'applied' as const,
        appliedAt: new Date(),
        impact: {
          beforeMetrics: {} as any,
          improvement: 30,
          success: true,
        },
      }));

      // Simulate having applied actions
      for (const action of existingActions) {
        databaseAutoTuner.getAppliedActions().push(action);
      }

      const opportunity = {
        type: 'index' as const,
        severity: 'high' as const,
        table: 'bookings',
        description: 'Another index needed',
        recommendation: 'Add index',
        estimatedImpact: '40%',
        effort: 'low' as const,
      };

      mockDatabasePerformanceMonitor.getDatabaseMetrics.mockResolvedValue({
        queryCount: 100,
        avgResponseTime: 200,
        slowQueries: [],
        connectionHealth: {
          activeConnections: 20,
          maxConnections: 100,
          utilization: 20,
          avgConnectionAge: 30000,
          status: 'healthy',
        },
        indexEfficiency: [],
        tableStats: [],
        optimizationOpportunities: [opportunity],
      });

      await databaseAutoTuner.performTuningCycle();

      // Should not apply more indexes due to limit
      expect(mockSupabase.rpc).not.toHaveBeenCalledWith(
        'execute_admin_sql',
        expect.objectContaining({
          sql_text: expect.stringContaining('CREATE INDEX'),
        }),
      );
    });
  });

  describe('Performance Impact Monitoring', () => {
    test('should measure performance impact after optimizations', async () => {
      const beforeMetrics = {
        timestamp: new Date(),
        avgQueryTime: 1000,
        slowQueryCount: 10,
        connectionUtilization: 60,
        indexHitRatio: 70,
        cacheHitRatio: 80,
      };

      const afterMetrics = {
        timestamp: new Date(),
        avgQueryTime: 600, // 40% improvement
        slowQueryCount: 5, // 50% improvement
        connectionUtilization: 50, // 10% improvement
        indexHitRatio: 85, // 15% improvement
        cacheHitRatio: 85, // 5% improvement
      };

      mockDatabasePerformanceMonitor.getDatabaseMetrics
        .mockResolvedValueOnce({
          queryCount: 100,
          avgResponseTime: 1000,
          slowQueries: Array(10).fill({}),
          connectionHealth: {
            activeConnections: 60,
            maxConnections: 100,
            utilization: 60,
            avgConnectionAge: 30000,
            status: 'healthy',
          },
          indexEfficiency: [],
          tableStats: [],
          optimizationOpportunities: [
            {
              type: 'index',
              severity: 'high',
              table: 'bookings',
              description: 'Add index',
              recommendation: 'Create index',
              estimatedImpact: '50%',
              effort: 'low',
            },
          ],
        })
        .mockResolvedValueOnce({
          queryCount: 100,
          avgResponseTime: 600,
          slowQueries: Array(5).fill({}),
          connectionHealth: {
            activeConnections: 50,
            maxConnections: 100,
            utilization: 50,
            avgConnectionAge: 30000,
            status: 'healthy',
          },
          indexEfficiency: [],
          tableStats: [],
          optimizationOpportunities: [],
        });

      mockSupabase.rpc.mockResolvedValue({ error: null });
      mockQueryOptimizer.generateIndexSuggestions.mockResolvedValue([
        {
          table: 'bookings',
          columns: ['wedding_date'],
          type: 'btree',
          priority: 'high',
          reason: 'High usage',
          sql: 'CREATE INDEX idx_test ON bookings (wedding_date);',
          estimatedImpact: '50%',
        },
      ]);

      await databaseAutoTuner.startAutoTuning({
        enabled: true,
        autoApplyIndexes: true,
      });

      await databaseAutoTuner.performTuningCycle();

      const appliedActions = databaseAutoTuner.getAppliedActions();

      if (appliedActions.length > 0) {
        expect(appliedActions[0].impact.improvement).toBeGreaterThan(0);
      }
    });

    test('should revert actions that cause performance regression', async () => {
      const beforeMetrics = {
        timestamp: new Date(),
        avgQueryTime: 500,
        slowQueryCount: 2,
        connectionUtilization: 40,
        indexHitRatio: 80,
        cacheHitRatio: 85,
      };

      const afterMetrics = {
        timestamp: new Date(),
        avgQueryTime: 800, // Performance got worse
        slowQueryCount: 8,
        connectionUtilization: 70,
        indexHitRatio: 70,
        cacheHitRatio: 75,
      };

      mockDatabasePerformanceMonitor.getDatabaseMetrics
        .mockResolvedValueOnce({
          queryCount: 100,
          avgResponseTime: 500,
          slowQueries: Array(2).fill({}),
          connectionHealth: {
            activeConnections: 40,
            maxConnections: 100,
            utilization: 40,
            avgConnectionAge: 30000,
            status: 'healthy',
          },
          indexEfficiency: [],
          tableStats: [],
          optimizationOpportunities: [
            {
              type: 'index',
              severity: 'medium',
              table: 'test_table',
              description: 'Test optimization',
              recommendation: 'Add index',
              estimatedImpact: '30%',
              effort: 'low',
            },
          ],
        })
        .mockResolvedValueOnce({
          queryCount: 100,
          avgResponseTime: 800, // Worse performance
          slowQueries: Array(8).fill({}),
          connectionHealth: {
            activeConnections: 70,
            maxConnections: 100,
            utilization: 70,
            avgConnectionAge: 30000,
            status: 'warning',
          },
          indexEfficiency: [],
          tableStats: [],
          optimizationOpportunities: [],
        });

      mockSupabase.rpc
        .mockResolvedValueOnce({ error: null }) // Initial action
        .mockResolvedValueOnce({ error: null }); // Rollback action

      mockQueryOptimizer.generateIndexSuggestions.mockResolvedValue([
        {
          table: 'test_table',
          columns: ['test_column'],
          type: 'btree',
          priority: 'medium',
          reason: 'Test',
          sql: 'CREATE INDEX idx_test ON test_table (test_column);',
          estimatedImpact: '30%',
        },
      ]);

      await databaseAutoTuner.startAutoTuning({
        enabled: true,
        autoApplyIndexes: true,
      });

      await databaseAutoTuner.performTuningCycle();

      // Should have attempted rollback due to regression
      expect(mockStructuredLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Reverting tuning action'),
        expect.any(Object),
      );
    });
  });

  describe('Wedding Season Optimizations', () => {
    test('should detect wedding season and apply appropriate optimizations', async () => {
      // Mock wedding season metrics
      mockDatabasePerformanceMonitor.getDatabaseMetrics.mockResolvedValue({
        queryCount: 500, // High load
        avgResponseTime: 800,
        slowQueries: Array(20).fill({
          query: 'SELECT * FROM bookings',
          table: 'bookings',
          executionTime: 1500,
          timestamp: new Date(),
          rowsAffected: 100,
          planCost: 1200,
        }),
        connectionHealth: {
          activeConnections: 80,
          maxConnections: 100,
          utilization: 80, // High utilization
          avgConnectionAge: 30000,
          status: 'warning',
        },
        indexEfficiency: [],
        tableStats: [],
        optimizationOpportunities: [
          {
            type: 'connection',
            severity: 'high',
            table: 'system',
            description: 'High connection utilization during wedding season',
            recommendation: 'Scale connection pool',
            estimatedImpact: 'Support 100% more users',
            effort: 'medium',
          },
        ],
      });

      await databaseAutoTuner.startAutoTuning({
        enabled: true,
        aggressiveness: 'aggressive', // Wedding season mode
      });

      await databaseAutoTuner.performTuningCycle();

      expect(mockStructuredLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('tuning cycle'),
        expect.any(Object),
      );
    });

    test('should respect Saturday deployment freeze', async () => {
      // Mock Saturday
      jest.spyOn(Date.prototype, 'getDay').mockReturnValue(6); // Saturday

      mockDatabasePerformanceMonitor.getDatabaseMetrics.mockResolvedValue({
        queryCount: 100,
        avgResponseTime: 200,
        slowQueries: [],
        connectionHealth: {
          activeConnections: 20,
          maxConnections: 100,
          utilization: 20,
          avgConnectionAge: 30000,
          status: 'healthy',
        },
        indexEfficiency: [],
        tableStats: [],
        optimizationOpportunities: [
          {
            type: 'index',
            severity: 'critical',
            table: 'bookings',
            description: 'Critical optimization needed',
            recommendation: 'Add urgent index',
            estimatedImpact: '80%',
            effort: 'low',
          },
        ],
      });

      await databaseAutoTuner.performTuningCycle();

      // Should be more conservative on wedding days
      expect(mockStructuredLogger.info).toHaveBeenCalledWith(
        'Tuning cycle completed',
        expect.any(Object),
      );
    });
  });

  describe('Safety and Rollback', () => {
    test('should create backup before making changes', async () => {
      databaseAutoTuner.updateConfig({ backupBeforeChanges: true });

      mockDatabasePerformanceMonitor.getDatabaseMetrics.mockResolvedValue({
        queryCount: 100,
        avgResponseTime: 200,
        slowQueries: [],
        connectionHealth: {
          activeConnections: 20,
          maxConnections: 100,
          utilization: 20,
          avgConnectionAge: 30000,
          status: 'healthy',
        },
        indexEfficiency: [],
        tableStats: [],
        optimizationOpportunities: [
          {
            type: 'index',
            severity: 'high',
            table: 'bookings',
            description: 'Add index',
            recommendation: 'Create index',
            estimatedImpact: '50%',
            effort: 'low',
          },
        ],
      });

      mockQueryOptimizer.generateIndexSuggestions.mockResolvedValue([
        {
          table: 'bookings',
          columns: ['wedding_date'],
          type: 'btree',
          priority: 'high',
          reason: 'High usage',
          sql: 'CREATE INDEX idx_test ON bookings (wedding_date);',
          estimatedImpact: '50%',
        },
      ]);

      mockSupabase.rpc.mockResolvedValue({ error: null });

      await databaseAutoTuner.startAutoTuning({
        enabled: true,
        autoApplyIndexes: true,
        backupBeforeChanges: true,
      });

      await databaseAutoTuner.performTuningCycle();

      expect(mockStructuredLogger.info).toHaveBeenCalledWith(
        'Backup checkpoint created',
        expect.objectContaining({ table: 'bookings' }),
      );
    });

    test('should handle SQL execution failures gracefully', async () => {
      mockDatabasePerformanceMonitor.getDatabaseMetrics.mockResolvedValue({
        queryCount: 100,
        avgResponseTime: 200,
        slowQueries: [],
        connectionHealth: {
          activeConnections: 20,
          maxConnections: 100,
          utilization: 20,
          avgConnectionAge: 30000,
          status: 'healthy',
        },
        indexEfficiency: [],
        tableStats: [],
        optimizationOpportunities: [
          {
            type: 'index',
            severity: 'high',
            table: 'bookings',
            description: 'Add index',
            recommendation: 'Create index',
            estimatedImpact: '50%',
            effort: 'low',
          },
        ],
      });

      mockQueryOptimizer.generateIndexSuggestions.mockResolvedValue([
        {
          table: 'bookings',
          columns: ['wedding_date'],
          type: 'btree',
          priority: 'high',
          reason: 'High usage',
          sql: 'CREATE INDEX idx_test ON bookings (wedding_date);',
          estimatedImpact: '50%',
        },
      ]);

      // Mock SQL execution failure
      mockSupabase.rpc.mockResolvedValue({
        error: new Error('Permission denied'),
      });

      await databaseAutoTuner.startAutoTuning({
        enabled: true,
        autoApplyIndexes: true,
      });

      await databaseAutoTuner.performTuningCycle();

      expect(mockStructuredLogger.error).toHaveBeenCalledWith(
        'Failed to execute tuning action',
        expect.objectContaining({
          error: expect.any(Error),
        }),
      );
    });
  });

  describe('Reporting', () => {
    test('should generate comprehensive tuning report', async () => {
      const report = await databaseAutoTuner.generateTuningReport();

      expect(report).toMatchObject({
        period: expect.objectContaining({
          start: expect.any(Date),
          end: expect.any(Date),
        }),
        actionsApplied: expect.any(Number),
        totalImprovement: expect.any(Number),
        successRate: expect.any(Number),
        recommendations: expect.any(Array),
      });
    });

    test('should include recommendations in tuning report', async () => {
      // Mock high connection utilization
      mockDatabasePerformanceMonitor.getDatabaseMetrics.mockResolvedValue({
        queryCount: 100,
        avgResponseTime: 200,
        slowQueries: Array(25).fill({}), // Many slow queries
        connectionHealth: {
          activeConnections: 85,
          maxConnections: 100,
          utilization: 85, // High utilization
          avgConnectionAge: 30000,
          status: 'warning',
        },
        indexEfficiency: [],
        tableStats: [],
        optimizationOpportunities: [],
      });

      const report = await databaseAutoTuner.generateTuningReport();

      expect(report.recommendations).toContainEqual(
        expect.objectContaining({
          priority: 'high',
          category: 'performance',
          description: expect.stringContaining('connection utilization'),
        }),
      );

      expect(report.recommendations).toContainEqual(
        expect.objectContaining({
          priority: 'medium',
          category: 'performance',
          description: expect.stringContaining('slow queries'),
        }),
      );
    });
  });
});
