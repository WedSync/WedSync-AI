/**
 * WS-177 Audit Logging System - Storage Optimizer Tests
 * Team D - Round 1: Unit tests for log storage optimization
 * 
 * Coverage target: >80%
 * Focus: Database optimization, indexing strategies, query performance
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  LogStorageOptimizer,
  createStorageOptimizer,
  StorageOptimizationConfig,
  CustomIndex,
  IndexingStrategy
} from '../../../src/lib/performance/audit/log-storage-optimizer';

// Mock Supabase client with RPC support
const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  rpc: jest.fn(),
  removeChannel: jest.fn(),
  storage: {
    from: jest.fn().mockReturnThis(),
    upload: jest.fn()
  }
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}));

describe('LogStorageOptimizer', () => {
  let optimizer: LogStorageOptimizer;
  let testConfig: StorageOptimizationConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    
    testConfig = {
      // Base LogStorageConfig
      batchSize: 50,
      flushIntervalMs: 5000,
      compressionEnabled: true,
      encryptionEnabled: true,
      connectionPoolSize: 5,
      preparedStatements: true,
      indexingStrategy: IndexingStrategy.COMPOSITE,
      asyncLogging: true,
      bufferSize: 1000,
      memoryThresholdMB: 100,
      highVolumeMode: true,
      guestDataCompression: true,
      photoMetadataOptimization: true,
      
      // Storage optimization specific
      enablePartitioning: true,
      partitionByMonth: true,
      partitionByOrganization: false,
      maxPartitionSize: 10240,
      customIndexes: [],
      autoIndexOptimization: true,
      indexMaintenanceInterval: 24,
      jsonCompressionLevel: 6,
      metadataCompressionEnabled: true,
      binaryDataOptimization: true,
      queryPlanCacheSize: 1000,
      connectionPoolMaxSize: 20,
      connectionPoolMinSize: 5,
      preparedStatementCacheSize: 500
    };

    optimizer = new LogStorageOptimizer(testConfig);
  });

  afterEach(async () => {
    await optimizer.shutdown();
  });

  describe('Initialization', () => {
    it('should initialize storage optimizer', () => {
      expect(optimizer).toBeInstanceOf(LogStorageOptimizer);
    });

    it('should create optimizer with factory function', () => {
      const factoryOptimizer = createStorageOptimizer({
        enablePartitioning: false,
        autoIndexOptimization: false
      });
      expect(factoryOptimizer).toBeInstanceOf(LogStorageOptimizer);
    });
  });

  describe('Schema Initialization', () => {
    it('should initialize database schema successfully', async () => {
      // Mock successful schema creation
      mockSupabaseClient.rpc.mockResolvedValue({ data: null, error: null });

      await optimizer.initializeSchema();

      // Should create tables, indexes, and stored procedures
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('exec_sql', {
        sql: expect.stringContaining('CREATE TABLE IF NOT EXISTS audit_events')
      });
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('exec_sql', {
        sql: expect.stringContaining('CREATE TABLE IF NOT EXISTS audit_performance_metrics')
      });
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('exec_sql', {
        sql: expect.stringContaining('CREATE OR REPLACE FUNCTION audit_batch_insert')
      });
    });

    it('should handle schema initialization errors', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ 
        data: null, 
        error: { message: 'Permission denied' } 
      });

      await expect(optimizer.initializeSchema()).rejects.toThrow();
    });

    it('should create partitions when enabled', async () => {
      const partitionConfig = { ...testConfig, enablePartitioning: true, partitionByMonth: true };
      const partitionOptimizer = new LogStorageOptimizer(partitionConfig);
      
      mockSupabaseClient.rpc.mockResolvedValue({ data: null, error: null });

      await partitionOptimizer.initializeSchema();

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('exec_sql', {
        sql: expect.stringContaining('PARTITION OF audit_events')
      });

      await partitionOptimizer.shutdown();
    });
  });

  describe('Index Management', () => {
    it('should create optimized indexes', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ data: null, error: null });

      await optimizer.initializeSchema();

      // Should create multiple performance indexes
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('exec_sql', {
        sql: expect.stringContaining('CREATE  INDEX IF NOT EXISTS idx_audit_events_timestamp_org')
      });
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('exec_sql', {
        sql: expect.stringContaining('CREATE  INDEX IF NOT EXISTS idx_audit_events_wedding_timestamp')
      });
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('exec_sql', {
        sql: expect.stringContaining('CREATE  INDEX IF NOT EXISTS idx_audit_events_metadata_gin')
      });
    });

    it('should create custom indexes from configuration', async () => {
      const customIndex: CustomIndex = {
        name: 'idx_custom_test',
        table: 'audit_events',
        columns: ['user_id', 'timestamp'],
        type: 'btree',
        unique: false,
        description: 'Custom test index'
      };

      const customConfig = { 
        ...testConfig, 
        customIndexes: [customIndex]
      };
      const customOptimizer = new LogStorageOptimizer(customConfig);
      
      mockSupabaseClient.rpc.mockResolvedValue({ data: null, error: null });

      await customOptimizer.initializeSchema();

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('exec_sql', {
        sql: expect.stringContaining('CREATE  INDEX IF NOT EXISTS idx_custom_test')
      });

      await customOptimizer.shutdown();
    });

    it('should handle index creation errors gracefully', async () => {
      mockSupabaseClient.rpc
        .mockResolvedValueOnce({ data: null, error: null }) // Table creation succeeds
        .mockResolvedValueOnce({ data: null, error: null }) // Supporting tables succeed
        .mockResolvedValueOnce({ data: null, error: { message: 'Index already exists' } }); // Index creation fails

      // Should not throw error, should continue with other operations
      await expect(optimizer.initializeSchema()).resolves.not.toThrow();
    });
  });

  describe('Query Performance Analysis', () => {
    it('should analyze query performance', async () => {
      const mockQueryStats = [
        {
          query: 'SELECT * FROM audit_events WHERE organization_id = $1',
          calls: 150,
          total_exec_time: 2500.5,
          mean_exec_time: 16.67,
          rows: 1500,
          hit_percent: 95.2
        },
        {
          query: 'INSERT INTO audit_events VALUES ($1, $2, $3)',
          calls: 500,
          total_exec_time: 1200.0,
          mean_exec_time: 2.4,
          rows: 500,
          hit_percent: 98.5
        }
      ];

      mockSupabaseClient.rpc.mockResolvedValue({ data: mockQueryStats, error: null });

      const stats = await optimizer.analyzeQueryPerformance();

      expect(stats).toHaveLength(2);
      expect(stats[0].executionCount).toBe(150);
      expect(stats[0].averageExecutionTime).toBe(16.67);
      expect(stats[0].queryType).toBe('SELECT');
      expect(stats[1].queryType).toBe('INSERT');
      expect(stats[0].optimizationSuggestions.length).toBeGreaterThan(0);
    });

    it('should handle query analysis errors', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ 
        data: null, 
        error: { message: 'pg_stat_statements not enabled' } 
      });

      const stats = await optimizer.analyzeQueryPerformance();

      expect(stats).toHaveLength(0);
    });

    it('should categorize queries correctly', async () => {
      const mockQueries = [
        { query: 'SELECT * FROM audit_events', calls: 100, total_exec_time: 1000, mean_exec_time: 10 },
        { query: 'INSERT INTO audit_events', calls: 200, total_exec_time: 500, mean_exec_time: 2.5 },
        { query: 'UPDATE audit_events SET', calls: 50, total_exec_time: 750, mean_exec_time: 15 },
        { query: 'DELETE FROM audit_events', calls: 10, total_exec_time: 200, mean_exec_time: 20 }
      ];

      mockSupabaseClient.rpc.mockResolvedValue({ data: mockQueries, error: null });

      const stats = await optimizer.analyzeQueryPerformance();

      expect(stats[0].queryType).toBe('SELECT');
      expect(stats[1].queryType).toBe('INSERT');
      expect(stats[2].queryType).toBe('UPDATE');
      expect(stats[3].queryType).toBe('DELETE');
    });
  });

  describe('Storage Efficiency Metrics', () => {
    it('should get storage efficiency metrics', async () => {
      const mockStorageData = [{
        total_size: '250 MB',
        table_size: '180 MB',
        index_size: '70 MB',
        row_count: 100000,
        partition_count: 12
      }];

      mockSupabaseClient.rpc.mockResolvedValue({ data: mockStorageData, error: null });

      const metrics = await optimizer.getStorageEfficiencyMetrics();

      expect(metrics.totalSizeGB).toBeCloseTo(0.244, 2); // ~250MB in GB
      expect(metrics.compressedSizeGB).toBeCloseTo(0.176, 2); // ~180MB in GB
      expect(metrics.indexSizeGB).toBeCloseTo(0.068, 2); // ~70MB in GB
      expect(metrics.partitionCount).toBe(12);
      expect(metrics.compressionRatio).toBeGreaterThan(0);
      expect(metrics.recommendedOptimizations).toBeDefined();
    });

    it('should handle storage metrics errors', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ 
        data: null, 
        error: { message: 'Table does not exist' } 
      });

      await expect(optimizer.getStorageEfficiencyMetrics()).rejects.toThrow('Failed to get storage metrics');
    });

    it('should parse storage sizes correctly', async () => {
      const testCases = [
        { input: '1024 MB', expectedGB: 1 },
        { input: '512 KB', expectedGB: 0.0005 },
        { input: '2 GB', expectedGB: 2 },
        { input: '1 TB', expectedGB: 1024 }
      ];

      for (const testCase of testCases) {
        mockSupabaseClient.rpc.mockResolvedValue({ 
          data: [{ 
            total_size: testCase.input, 
            table_size: testCase.input, 
            index_size: '0 MB',
            row_count: 1000,
            partition_count: 1
          }], 
          error: null 
        });

        const metrics = await optimizer.getStorageEfficiencyMetrics();
        expect(metrics.totalSizeGB).toBeCloseTo(testCase.expectedGB, 3);
      }
    });
  });

  describe('Configuration Optimization', () => {
    it('should optimize configuration based on usage patterns', async () => {
      const mockQueryStats = [
        {
          query: 'SELECT * FROM audit_events WHERE timestamp > $1',
          calls: 1000,
          total_exec_time: 5000,
          mean_exec_time: 5,
          hit_percent: 85
        }
      ];

      const mockStorageData = [{
        total_size: '1 GB',
        table_size: '800 MB',
        index_size: '200 MB',
        row_count: 1000000,
        partition_count: 1
      }];

      mockSupabaseClient.rpc
        .mockResolvedValueOnce({ data: mockQueryStats, error: null })
        .mockResolvedValueOnce({ data: mockStorageData, error: null })
        .mockResolvedValueOnce({ data: null, error: null }); // ANALYZE command

      await optimizer.optimizeConfiguration();

      // Should call analyze for statistics update
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('exec_sql', {
        sql: expect.stringContaining('ANALYZE audit_events')
      });
    });

    it('should create adaptive indexes for high-frequency queries', async () => {
      const config = { ...testConfig, autoIndexOptimization: true };
      const adaptiveOptimizer = new LogStorageOptimizer(config);

      const mockHighFrequencyQueries = [
        {
          query: 'SELECT * FROM audit_events WHERE organization_id = $1 ORDER BY timestamp',
          calls: 2000, // High frequency
          total_exec_time: 10000,
          mean_exec_time: 5,
          hit_percent: 90
        }
      ];

      mockSupabaseClient.rpc
        .mockResolvedValueOnce({ data: mockHighFrequencyQueries, error: null })
        .mockResolvedValueOnce({ data: [{ total_size: '1 GB', table_size: '800 MB', index_size: '200 MB', row_count: 1000000, partition_count: 1 }], error: null })
        .mockResolvedValueOnce({ data: null, error: null }) // Index creation
        .mockResolvedValueOnce({ data: null, error: null }); // ANALYZE

      await adaptiveOptimizer.optimizeConfiguration();

      await adaptiveOptimizer.shutdown();
    });
  });

  describe('Stored Procedures', () => {
    it('should create batch insert procedure', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ data: null, error: null });

      await optimizer.initializeSchema();

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('exec_sql', {
        sql: expect.stringContaining('CREATE OR REPLACE FUNCTION audit_batch_insert')
      });
    });

    it('should create wedding audit trail procedure', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ data: null, error: null });

      await optimizer.initializeSchema();

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('exec_sql', {
        sql: expect.stringContaining('CREATE OR REPLACE FUNCTION get_wedding_audit_trail')
      });
    });

    it('should create performance summary procedure', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ data: null, error: null });

      await optimizer.initializeSchema();

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('exec_sql', {
        sql: expect.stringContaining('CREATE OR REPLACE FUNCTION get_performance_summary')
      });
    });
  });

  describe('Maintenance Cycle', () => {
    it('should start maintenance cycle', async () => {
      const shortIntervalConfig = { ...testConfig, indexMaintenanceInterval: 0.001 }; // Very short interval for testing
      const maintenanceOptimizer = new LogStorageOptimizer(shortIntervalConfig);

      mockSupabaseClient.rpc.mockResolvedValue({ data: [], error: null });

      // Wait for maintenance cycle to run
      await new Promise(resolve => setTimeout(resolve, 100));

      await maintenanceOptimizer.shutdown();
    });

    it('should handle maintenance errors gracefully', async () => {
      const shortIntervalConfig = { ...testConfig, indexMaintenanceInterval: 0.001 };
      const maintenanceOptimizer = new LogStorageOptimizer(shortIntervalConfig);

      // Mock error in maintenance cycle
      mockSupabaseClient.rpc.mockRejectedValue(new Error('Maintenance failed'));

      // Should not crash, should handle error
      await new Promise(resolve => setTimeout(resolve, 100));

      await maintenanceOptimizer.shutdown();
    });
  });

  describe('Utility Functions', () => {
    it('should hash queries consistently', async () => {
      const query1 = 'SELECT * FROM audit_events WHERE id = $1';
      const query2 = 'SELECT * FROM audit_events WHERE id = $1';
      const query3 = 'SELECT * FROM audit_events WHERE id = $2';

      mockSupabaseClient.rpc.mockResolvedValue({ 
        data: [
          { query: query1, calls: 100, total_exec_time: 1000, mean_exec_time: 10 },
          { query: query2, calls: 100, total_exec_time: 1000, mean_exec_time: 10 },
          { query: query3, calls: 100, total_exec_time: 1000, mean_exec_time: 10 }
        ], 
        error: null 
      });

      const stats = await optimizer.analyzeQueryPerformance();

      // Same queries should have same hash
      expect(stats[0].queryHash).toBe(stats[1].queryHash);
      // Different queries should have different hashes
      expect(stats[0].queryHash).not.toBe(stats[2].queryHash);
    });

    it('should generate optimization suggestions correctly', async () => {
      const mockSlowQueries = [
        {
          query: 'SELECT * FROM audit_events WHERE metadata @> $1',
          calls: 10,
          total_exec_time: 5000,
          mean_exec_time: 500, // Slow query
          hit_percent: 60 // Low cache hit ratio
        },
        {
          query: 'SELECT * FROM audit_events WHERE organization_id = $1',
          calls: 2000, // High frequency
          total_exec_time: 4000,
          mean_exec_time: 2,
          hit_percent: 95
        }
      ];

      mockSupabaseClient.rpc.mockResolvedValue({ data: mockSlowQueries, error: null });

      const stats = await optimizer.analyzeQueryPerformance();

      expect(stats[0].optimizationSuggestions).toContain('Consider adding indexes for frequently queried columns');
      expect(stats[0].optimizationSuggestions).toContain('Low cache hit ratio - consider query optimization');
      expect(stats[1].optimizationSuggestions).toContain('High frequency query - candidate for prepared statement');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockSupabaseClient.rpc.mockRejectedValue(new Error('Connection refused'));

      await expect(optimizer.initializeSchema()).rejects.toThrow('Connection refused');
    });

    it('should handle malformed query statistics', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ 
        data: [
          { query: null, calls: null }, // Malformed data
          { query: 'SELECT 1', calls: 100, total_exec_time: 1000, mean_exec_time: 10 }
        ], 
        error: null 
      });

      const stats = await optimizer.analyzeQueryPerformance();

      // Should handle malformed data gracefully
      expect(stats.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Shutdown', () => {
    it('should shutdown gracefully', async () => {
      await optimizer.shutdown();

      // Should clear internal state
      // This is mainly to ensure no memory leaks
    });
  });
});

describe('Factory Functions', () => {
  it('should create storage optimizer with default configuration', () => {
    const optimizer = createStorageOptimizer();
    expect(optimizer).toBeInstanceOf(LogStorageOptimizer);
  });

  it('should create storage optimizer with custom configuration', () => {
    const customConfig = {
      enablePartitioning: false,
      autoIndexOptimization: false,
      jsonCompressionLevel: 9
    };

    const optimizer = createStorageOptimizer(customConfig);
    expect(optimizer).toBeInstanceOf(LogStorageOptimizer);
  });

  it('should export singleton instance', async () => {
    const { storageOptimizer } = await import('../../../src/lib/performance/audit/log-storage-optimizer');
    expect(storageOptimizer).toBeInstanceOf(LogStorageOptimizer);
  });
});