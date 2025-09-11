/**
 * WS-177 Audit Logging System - Storage Optimization Module
 * Team D - Round 1: Efficient audit log storage and indexing
 *
 * Optimizes audit log storage for wedding supplier operations:
 * - Efficient indexing for fast queries
 * - Data compression for storage savings
 * - Partitioning strategies for large datasets
 * - Query optimization for common patterns
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  LogStorageConfig,
  IndexingStrategy,
  AuditEvent,
  AuditEventFilters,
  PerformanceMetrics,
} from '../../../types/audit-performance';

/**
 * Database optimization configuration
 */
export interface StorageOptimizationConfig extends LogStorageConfig {
  // Partitioning settings
  enablePartitioning: boolean;
  partitionByMonth: boolean;
  partitionByOrganization: boolean;
  maxPartitionSize: number; // MB

  // Index optimization
  customIndexes: CustomIndex[];
  autoIndexOptimization: boolean;
  indexMaintenanceInterval: number; // hours

  // Compression settings
  jsonCompressionLevel: number; // 1-9
  metadataCompressionEnabled: boolean;
  binaryDataOptimization: boolean;

  // Query optimization
  queryPlanCacheSize: number;
  connectionPoolMaxSize: number;
  connectionPoolMinSize: number;
  preparedStatementCacheSize: number;
}

export interface CustomIndex {
  name: string;
  table: string;
  columns: string[];
  type: 'btree' | 'gin' | 'gist' | 'hash' | 'brin';
  condition?: string; // Partial index condition
  unique: boolean;
  description: string;
}

/**
 * Query performance statistics
 */
export interface QueryPerformanceStats {
  queryHash: string;
  queryType: string;
  executionCount: number;
  averageExecutionTime: number;
  lastExecutionTime: string;
  indexesUsed: string[];
  optimizationSuggestions: string[];
}

/**
 * Storage efficiency metrics
 */
export interface StorageEfficiencyMetrics {
  totalSizeGB: number;
  compressedSizeGB: number;
  compressionRatio: number;
  indexSizeGB: number;
  partitionCount: number;
  averageQueryTime: number;
  slowestQueries: QueryPerformanceStats[];
  recommendedOptimizations: string[];
}

/**
 * Log Storage Optimizer
 * Handles database schema optimization, indexing, and query performance
 */
export class LogStorageOptimizer {
  private supabase: SupabaseClient;
  private config: StorageOptimizationConfig;
  private queryStats: Map<string, QueryPerformanceStats> = new Map();
  private maintenanceTimer: NodeJS.Timeout | null = null;

  constructor(config: StorageOptimizationConfig) {
    this.config = config;
    this.initializeConnection();
    this.startMaintenanceCycle();
  }

  private initializeConnection(): void {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      db: {
        schema: 'public',
      },
    });
  }

  /**
   * Initialize audit logging schema with optimized structure
   * Creates tables, indexes, and partitions for high-performance operations
   */
  async initializeSchema(): Promise<void> {
    console.log('[StorageOptimizer] Initializing audit logging schema...');

    try {
      // Create main audit events table with optimized structure
      await this.createAuditEventsTable();

      // Create supporting tables for metadata
      await this.createSupportingTables();

      // Create optimized indexes based on wedding supplier query patterns
      await this.createOptimizedIndexes();

      // Set up table partitioning if enabled
      if (this.config.enablePartitioning) {
        await this.setupPartitioning();
      }

      // Create stored procedures for common operations
      await this.createStoredProcedures();

      console.log('[StorageOptimizer] Schema initialization completed');
    } catch (error) {
      console.error('[StorageOptimizer] Schema initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create optimized audit events table
   * Designed for high-volume wedding supplier operations
   */
  private async createAuditEventsTable(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS audit_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        event_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        
        -- User and organization context
        user_id UUID,
        session_id UUID,
        organization_id UUID NOT NULL,
        wedding_id UUID,
        supplier_id UUID,
        
        -- Event details
        resource TEXT NOT NULL,
        action TEXT NOT NULL,
        resource_id TEXT,
        
        -- Data payload (compressed JSON)
        before_data JSONB,
        after_data JSONB,
        metadata JSONB NOT NULL DEFAULT '{}',
        
        -- Performance tracking
        execution_time_ms INTEGER DEFAULT 0,
        request_id TEXT,
        
        -- Security context
        ip_address INET,
        user_agent TEXT,
        api_key_id UUID,
        
        -- Wedding-specific context
        wedding_date DATE,
        guest_count INTEGER,
        supplier_role TEXT,
        
        -- Storage optimization
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        data_size_bytes INTEGER,
        compressed BOOLEAN DEFAULT false
      );

      -- Add table comments for documentation
      COMMENT ON TABLE audit_events IS 'High-performance audit logging for wedding supplier operations';
      COMMENT ON COLUMN audit_events.metadata IS 'Compressed JSON metadata for wedding-specific context';
      COMMENT ON COLUMN audit_events.compressed IS 'Indicates if JSON data has been compressed';
    `;

    const { error } = await this.supabase.rpc('exec_sql', {
      sql: createTableSQL,
    });
    if (error) {
      throw new Error(`Failed to create audit_events table: ${error.message}`);
    }
  }

  /**
   * Create supporting tables for enhanced functionality
   */
  private async createSupportingTables(): Promise<void> {
    // Performance metrics table
    const performanceMetricsSQL = `
      CREATE TABLE IF NOT EXISTS audit_performance_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID REFERENCES audit_events(id) ON DELETE CASCADE,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        
        -- Timing metrics
        total_execution_time NUMERIC(10,3),
        database_time NUMERIC(10,3),
        network_time NUMERIC(10,3),
        processing_time NUMERIC(10,3),
        
        -- Resource metrics
        memory_used_mb NUMERIC(10,3),
        cpu_utilization NUMERIC(5,2),
        disk_io_mb NUMERIC(10,3),
        network_io_mb NUMERIC(10,3),
        
        -- Wedding-specific performance
        guests_processed INTEGER DEFAULT 0,
        tasks_processed INTEGER DEFAULT 0,
        photos_processed INTEGER DEFAULT 0,
        
        -- Optimization tracking
        was_optimized BOOLEAN DEFAULT false,
        optimization_strategy TEXT,
        cache_utilized BOOLEAN DEFAULT false,
        batch_processed BOOLEAN DEFAULT false
      );
    `;

    // Query performance tracking table
    const queryStatsSQL = `
      CREATE TABLE IF NOT EXISTS audit_query_stats (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        query_hash TEXT NOT NULL,
        query_type TEXT NOT NULL,
        execution_count INTEGER DEFAULT 1,
        average_execution_time NUMERIC(10,3),
        last_execution_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        indexes_used TEXT[],
        optimization_suggestions TEXT[],
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await this.supabase.rpc('exec_sql', { sql: performanceMetricsSQL });
    await this.supabase.rpc('exec_sql', { sql: queryStatsSQL });
  }

  /**
   * Create optimized indexes for wedding supplier query patterns
   */
  private async createOptimizedIndexes(): Promise<void> {
    const indexes: CustomIndex[] = [
      // Primary lookup indexes for common queries
      {
        name: 'idx_audit_events_timestamp_org',
        table: 'audit_events',
        columns: ['timestamp', 'organization_id'],
        type: 'btree',
        unique: false,
        description: 'Fast time-range queries per organization',
      },
      {
        name: 'idx_audit_events_wedding_timestamp',
        table: 'audit_events',
        columns: ['wedding_id', 'timestamp'],
        type: 'btree',
        condition: 'wedding_id IS NOT NULL',
        unique: false,
        description: 'Wedding audit trail queries',
      },
      {
        name: 'idx_audit_events_user_timestamp',
        table: 'audit_events',
        columns: ['user_id', 'timestamp'],
        type: 'btree',
        condition: 'user_id IS NOT NULL',
        unique: false,
        description: 'User activity tracking',
      },

      // Event type and severity indexes
      {
        name: 'idx_audit_events_type_severity_timestamp',
        table: 'audit_events',
        columns: ['event_type', 'severity', 'timestamp'],
        type: 'btree',
        unique: false,
        description: 'Security monitoring and alerting',
      },

      // Resource-based indexes for integration points
      {
        name: 'idx_audit_events_resource_action_timestamp',
        table: 'audit_events',
        columns: ['resource', 'action', 'timestamp'],
        type: 'btree',
        unique: false,
        description: 'Resource modification tracking',
      },

      // Wedding-specific indexes
      {
        name: 'idx_audit_events_wedding_date_supplier',
        table: 'audit_events',
        columns: ['wedding_date', 'supplier_role', 'timestamp'],
        type: 'btree',
        condition: 'wedding_date IS NOT NULL',
        unique: false,
        description: 'Wedding supplier coordination queries',
      },

      // JSONB metadata indexes for flexible queries
      {
        name: 'idx_audit_events_metadata_gin',
        table: 'audit_events',
        columns: ['metadata'],
        type: 'gin',
        unique: false,
        description: 'Full-text search on metadata',
      },

      // Performance optimization indexes
      {
        name: 'idx_audit_events_session_timestamp',
        table: 'audit_events',
        columns: ['session_id', 'timestamp'],
        type: 'btree',
        condition: 'session_id IS NOT NULL',
        unique: false,
        description: 'Session-based audit queries',
      },
    ];

    // Add custom indexes from configuration
    indexes.push(...this.config.customIndexes);

    for (const index of indexes) {
      await this.createIndex(index);
    }
  }

  /**
   * Create individual database index
   */
  private async createIndex(index: CustomIndex): Promise<void> {
    try {
      const uniqueClause = index.unique ? 'UNIQUE' : '';
      const typeClause = index.type ? `USING ${index.type.toUpperCase()}` : '';
      const conditionClause = index.condition ? `WHERE ${index.condition}` : '';
      const columnsClause = index.columns.join(', ');

      const createIndexSQL = `
        CREATE ${uniqueClause} INDEX IF NOT EXISTS ${index.name}
        ON ${index.table} ${typeClause} (${columnsClause})
        ${conditionClause};
        
        COMMENT ON INDEX ${index.name} IS '${index.description}';
      `;

      const { error } = await this.supabase.rpc('exec_sql', {
        sql: createIndexSQL,
      });
      if (error) {
        console.error(
          `[StorageOptimizer] Failed to create index ${index.name}:`,
          error,
        );
      } else {
        console.log(`[StorageOptimizer] Created index: ${index.name}`);
      }
    } catch (error) {
      console.error(
        `[StorageOptimizer] Error creating index ${index.name}:`,
        error,
      );
    }
  }

  /**
   * Setup table partitioning for large datasets
   */
  private async setupPartitioning(): Promise<void> {
    if (!this.config.enablePartitioning) return;

    try {
      if (this.config.partitionByMonth) {
        // Create monthly partitions for time-based queries
        const partitionSQL = `
          -- Enable partitioning by month
          ALTER TABLE audit_events 
          ADD CONSTRAINT audit_events_timestamp_check 
          CHECK (timestamp >= '2025-01-01' AND timestamp < '2026-01-01');
          
          -- Create partition for current month
          CREATE TABLE IF NOT EXISTS audit_events_y2025m01 
          PARTITION OF audit_events
          FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
        `;

        await this.supabase.rpc('exec_sql', { sql: partitionSQL });
      }

      if (this.config.partitionByOrganization) {
        // Create organization-based partitions for large suppliers
        const orgPartitionSQL = `
          -- Create partition template for organizations
          CREATE TABLE IF NOT EXISTS audit_events_org_template (
            LIKE audit_events INCLUDING ALL
          ) PARTITION BY HASH (organization_id);
        `;

        await this.supabase.rpc('exec_sql', { sql: orgPartitionSQL });
      }

      console.log('[StorageOptimizer] Partitioning setup completed');
    } catch (error) {
      console.error('[StorageOptimizer] Partitioning setup failed:', error);
    }
  }

  /**
   * Create stored procedures for common operations
   */
  private async createStoredProcedures(): Promise<void> {
    // Procedure for efficient batch insert with compression
    const batchInsertSQL = `
      CREATE OR REPLACE FUNCTION audit_batch_insert(events JSONB[])
      RETURNS TABLE(id UUID, created_at TIMESTAMPTZ)
      LANGUAGE plpgsql
      AS $$
      BEGIN
        RETURN QUERY
        INSERT INTO audit_events (
          event_type, severity, organization_id, wedding_id,
          resource, action, metadata, timestamp
        )
        SELECT 
          (event->>'event_type')::TEXT,
          (event->>'severity')::TEXT,
          (event->>'organization_id')::UUID,
          (event->>'wedding_id')::UUID,
          (event->>'resource')::TEXT,
          (event->>'action')::TEXT,
          (event->'metadata')::JSONB,
          (event->>'timestamp')::TIMESTAMPTZ
        FROM unnest(events) AS event
        RETURNING audit_events.id, audit_events.created_at;
      END;
      $$;
      
      COMMENT ON FUNCTION audit_batch_insert IS 'High-performance batch insert for audit events';
    `;

    // Procedure for wedding audit trail with optimized queries
    const weddingAuditTrailSQL = `
      CREATE OR REPLACE FUNCTION get_wedding_audit_trail(
        p_wedding_id UUID,
        p_start_date TIMESTAMPTZ DEFAULT NULL,
        p_end_date TIMESTAMPTZ DEFAULT NULL,
        p_limit INTEGER DEFAULT 1000
      )
      RETURNS TABLE(
        id UUID,
        timestamp TIMESTAMPTZ,
        event_type TEXT,
        severity TEXT,
        action TEXT,
        resource TEXT,
        user_id UUID,
        supplier_role TEXT,
        metadata JSONB
      )
      LANGUAGE plpgsql
      AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          ae.id, ae.timestamp, ae.event_type, ae.severity,
          ae.action, ae.resource, ae.user_id, ae.supplier_role,
          ae.metadata
        FROM audit_events ae
        WHERE ae.wedding_id = p_wedding_id
        AND (p_start_date IS NULL OR ae.timestamp >= p_start_date)
        AND (p_end_date IS NULL OR ae.timestamp <= p_end_date)
        ORDER BY ae.timestamp ASC
        LIMIT p_limit;
      END;
      $$;
      
      COMMENT ON FUNCTION get_wedding_audit_trail IS 'Optimized wedding audit trail retrieval';
    `;

    // Procedure for performance metrics aggregation
    const metricsAggregationSQL = `
      CREATE OR REPLACE FUNCTION get_performance_summary(
        p_start_date TIMESTAMPTZ,
        p_end_date TIMESTAMPTZ,
        p_organization_id UUID DEFAULT NULL
      )
      RETURNS TABLE(
        total_events BIGINT,
        avg_execution_time NUMERIC,
        max_execution_time NUMERIC,
        events_per_hour NUMERIC,
        top_resources TEXT[],
        optimization_ratio NUMERIC
      )
      LANGUAGE plpgsql
      AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          COUNT(*)::BIGINT as total_events,
          AVG(ae.execution_time_ms)::NUMERIC as avg_execution_time,
          MAX(ae.execution_time_ms)::NUMERIC as max_execution_time,
          (COUNT(*) / EXTRACT(EPOCH FROM (p_end_date - p_start_date)) * 3600)::NUMERIC as events_per_hour,
          ARRAY_AGG(DISTINCT ae.resource ORDER BY ae.resource) as top_resources,
          (COUNT(*) FILTER (WHERE apm.was_optimized = true) * 100.0 / COUNT(*))::NUMERIC as optimization_ratio
        FROM audit_events ae
        LEFT JOIN audit_performance_metrics apm ON ae.id = apm.event_id
        WHERE ae.timestamp BETWEEN p_start_date AND p_end_date
        AND (p_organization_id IS NULL OR ae.organization_id = p_organization_id);
      END;
      $$;
    `;

    await this.supabase.rpc('exec_sql', { sql: batchInsertSQL });
    await this.supabase.rpc('exec_sql', { sql: weddingAuditTrailSQL });
    await this.supabase.rpc('exec_sql', { sql: metricsAggregationSQL });

    console.log('[StorageOptimizer] Stored procedures created');
  }

  /**
   * Analyze query performance and provide optimization recommendations
   */
  async analyzeQueryPerformance(): Promise<QueryPerformanceStats[]> {
    try {
      // Get query statistics from PostgreSQL stats
      const queryStatsSQL = `
        SELECT 
          query,
          calls,
          total_exec_time,
          mean_exec_time,
          rows,
          100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
        FROM pg_stat_statements
        WHERE query LIKE '%audit_events%'
        ORDER BY total_exec_time DESC
        LIMIT 20;
      `;

      const { data: queryData, error } = await this.supabase.rpc('exec_sql', {
        sql: queryStatsSQL,
      });

      if (error) {
        console.error('[StorageOptimizer] Query analysis failed:', error);
        return [];
      }

      const stats: QueryPerformanceStats[] = [];

      for (const row of queryData || []) {
        const stat: QueryPerformanceStats = {
          queryHash: this.hashQuery(row.query),
          queryType: this.categorizeQuery(row.query),
          executionCount: row.calls || 0,
          averageExecutionTime: row.mean_exec_time || 0,
          lastExecutionTime: new Date().toISOString(),
          indexesUsed: [],
          optimizationSuggestions: this.generateOptimizationSuggestions(row),
        };

        stats.push(stat);
        this.queryStats.set(stat.queryHash, stat);
      }

      return stats;
    } catch (error) {
      console.error(
        '[StorageOptimizer] Error analyzing query performance:',
        error,
      );
      return [];
    }
  }

  /**
   * Get storage efficiency metrics
   */
  async getStorageEfficiencyMetrics(): Promise<StorageEfficiencyMetrics> {
    try {
      const metricsSQL = `
        SELECT 
          pg_size_pretty(pg_total_relation_size('audit_events')) as total_size,
          pg_size_pretty(pg_relation_size('audit_events')) as table_size,
          pg_size_pretty(pg_total_relation_size('audit_events') - pg_relation_size('audit_events')) as index_size,
          (SELECT COUNT(*) FROM audit_events) as row_count,
          (SELECT COUNT(DISTINCT organization_id) FROM audit_events) as partition_count;
      `;

      const { data, error } = await this.supabase.rpc('exec_sql', {
        sql: metricsSQL,
      });

      if (error) {
        throw new Error(`Failed to get storage metrics: ${error.message}`);
      }

      const row = data?.[0] || {};
      const queryStats = await this.analyzeQueryPerformance();

      return {
        totalSizeGB: this.parseSize(row.total_size) / 1024,
        compressedSizeGB: this.parseSize(row.table_size) / 1024,
        compressionRatio:
          this.parseSize(row.table_size) /
          (this.parseSize(row.total_size) || 1),
        indexSizeGB: this.parseSize(row.index_size) / 1024,
        partitionCount: row.partition_count || 1,
        averageQueryTime:
          queryStats.reduce((sum, stat) => sum + stat.averageExecutionTime, 0) /
          (queryStats.length || 1),
        slowestQueries: queryStats.slice(0, 5),
        recommendedOptimizations: this.generateStorageOptimizations(queryStats),
      };
    } catch (error) {
      console.error('[StorageOptimizer] Error getting storage metrics:', error);
      throw error;
    }
  }

  /**
   * Optimize database configuration based on usage patterns
   */
  async optimizeConfiguration(): Promise<void> {
    const stats = await this.analyzeQueryPerformance();
    const metrics = await this.getStorageEfficiencyMetrics();

    console.log(
      '[StorageOptimizer] Optimizing configuration based on usage patterns...',
    );
    console.log(
      `Current average query time: ${metrics.averageQueryTime.toFixed(2)}ms`,
    );
    console.log(
      `Storage efficiency: ${(metrics.compressionRatio * 100).toFixed(1)}%`,
    );
    console.log(`Slowest queries: ${metrics.slowestQueries.length}`);

    // Auto-create indexes for frequently accessed patterns
    if (this.config.autoIndexOptimization) {
      await this.createAdaptiveIndexes(stats);
    }

    // Update statistics for query planner
    await this.updateTableStatistics();
  }

  /**
   * Create adaptive indexes based on query patterns
   */
  private async createAdaptiveIndexes(
    stats: QueryPerformanceStats[],
  ): Promise<void> {
    const highFrequencyQueries = stats.filter(
      (stat) => stat.executionCount > 100,
    );

    for (const stat of highFrequencyQueries) {
      const indexSuggestions = this.analyzeQueryForIndexes(stat);
      for (const suggestion of indexSuggestions) {
        try {
          await this.createIndex(suggestion);
        } catch (error) {
          console.error(
            '[StorageOptimizer] Failed to create adaptive index:',
            error,
          );
        }
      }
    }
  }

  /**
   * Update table statistics for query planner
   */
  private async updateTableStatistics(): Promise<void> {
    const analyzeSQL = `
      ANALYZE audit_events;
      ANALYZE audit_performance_metrics;
      ANALYZE audit_query_stats;
    `;

    await this.supabase.rpc('exec_sql', { sql: analyzeSQL });
  }

  /**
   * Start maintenance cycle for ongoing optimization
   */
  private startMaintenanceCycle(): void {
    const intervalMs = this.config.indexMaintenanceInterval * 60 * 60 * 1000; // Convert hours to milliseconds

    this.maintenanceTimer = setInterval(async () => {
      try {
        await this.optimizeConfiguration();
        console.log('[StorageOptimizer] Maintenance cycle completed');
      } catch (error) {
        console.error('[StorageOptimizer] Maintenance cycle failed:', error);
      }
    }, intervalMs);
  }

  // Utility methods
  private hashQuery(query: string): string {
    // Simple hash function for query identification
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private categorizeQuery(query: string): string {
    if (query.includes('INSERT')) return 'INSERT';
    if (query.includes('UPDATE')) return 'UPDATE';
    if (query.includes('DELETE')) return 'DELETE';
    if (query.includes('SELECT')) return 'SELECT';
    return 'OTHER';
  }

  private generateOptimizationSuggestions(queryRow: any): string[] {
    const suggestions: string[] = [];

    if (queryRow.mean_exec_time > 100) {
      suggestions.push(
        'Consider adding indexes for frequently queried columns',
      );
    }

    if (queryRow.hit_percent < 90) {
      suggestions.push('Low cache hit ratio - consider query optimization');
    }

    if (queryRow.calls > 1000) {
      suggestions.push(
        'High frequency query - candidate for prepared statement',
      );
    }

    return suggestions;
  }

  private generateStorageOptimizations(
    stats: QueryPerformanceStats[],
  ): string[] {
    const optimizations: string[] = [];

    const slowQueries = stats.filter((stat) => stat.averageExecutionTime > 100);
    if (slowQueries.length > 0) {
      optimizations.push(
        `${slowQueries.length} slow queries detected - recommend index optimization`,
      );
    }

    const highFrequencyQueries = stats.filter(
      (stat) => stat.executionCount > 500,
    );
    if (highFrequencyQueries.length > 0) {
      optimizations.push(
        `${highFrequencyQueries.length} high-frequency queries - candidate for caching`,
      );
    }

    return optimizations;
  }

  private analyzeQueryForIndexes(stat: QueryPerformanceStats): CustomIndex[] {
    // Simple heuristic - in production this would be more sophisticated
    const indexes: CustomIndex[] = [];

    if (stat.queryType === 'SELECT' && stat.executionCount > 100) {
      indexes.push({
        name: `idx_adaptive_${stat.queryHash}`,
        table: 'audit_events',
        columns: ['timestamp', 'organization_id'], // Common pattern
        type: 'btree',
        unique: false,
        description: `Adaptive index for high-frequency query pattern ${stat.queryHash}`,
      });
    }

    return indexes;
  }

  private parseSize(sizeStr: string): number {
    // Parse PostgreSQL size strings like "1024 MB" to MB
    if (!sizeStr) return 0;

    const match = sizeStr.match(/(\d+(?:\.\d+)?)\s*(\w+)/);
    if (!match) return 0;

    const size = parseFloat(match[1]);
    const unit = match[2].toUpperCase();

    switch (unit) {
      case 'BYTES':
        return size / 1024 / 1024;
      case 'KB':
        return size / 1024;
      case 'MB':
        return size;
      case 'GB':
        return size * 1024;
      case 'TB':
        return size * 1024 * 1024;
      default:
        return size;
    }
  }

  /**
   * Cleanup resources
   */
  async shutdown(): Promise<void> {
    if (this.maintenanceTimer) {
      clearInterval(this.maintenanceTimer);
      this.maintenanceTimer = null;
    }

    this.queryStats.clear();
  }
}

/**
 * Factory function for creating storage optimizer
 */
export function createStorageOptimizer(
  overrides: Partial<StorageOptimizationConfig> = {},
): LogStorageOptimizer {
  const defaultConfig: StorageOptimizationConfig = {
    // Base config from LogStorageConfig
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

    // Storage optimization specific config
    enablePartitioning: true,
    partitionByMonth: true,
    partitionByOrganization: false,
    maxPartitionSize: 10240, // 10GB
    customIndexes: [],
    autoIndexOptimization: true,
    indexMaintenanceInterval: 24, // 24 hours
    jsonCompressionLevel: 6,
    metadataCompressionEnabled: true,
    binaryDataOptimization: true,
    queryPlanCacheSize: 1000,
    connectionPoolMaxSize: 20,
    connectionPoolMinSize: 5,
    preparedStatementCacheSize: 500,
  };

  const config = { ...defaultConfig, ...overrides };
  return new LogStorageOptimizer(config);
}

/**
 * Singleton instance for application use
 */
export const storageOptimizer = createStorageOptimizer();
