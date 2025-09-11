# 04-database-health.md

# Database Health Monitoring & Optimization for WedSync/WedMe

## Overview

Database health is critical for WedSync's performance and reliability. This comprehensive guide covers monitoring, optimization, and maintenance strategies for the Supabase PostgreSQL database powering the platform.

## Database Architecture

### Core Tables Structure

```sql
-- Key tables and their relationships
suppliers (847 records)
├── clients (3,421 records)
├── forms (4,892 records)
│   └── form_responses (28,341 records)
├── journeys (1,234 records)
│   └── journey_events (15,672 records)
├── email_templates (2,341 records)
└── invoices (892 records)

-- High-traffic tables requiring optimization
api_usage_logs (~500k records/month)
error_logs (~50k records/month)
activity_logs (~1M records/month)
email_logs (~100k records/month)

```

## Health Monitoring Implementation

### 1. Real-Time Database Monitor

```tsx
// lib/databaseMonitor.ts
import { createClient } from '@supabase/supabase-js';

export class DatabaseMonitor {
  private static instance: DatabaseMonitor;
  private healthMetrics: DatabaseHealth = {
    status: 'healthy',
    connectionPool: { active: 0, idle: 0, waiting: 0 },
    queryPerformance: { avgTime: 0, slowQueries: [] },
    storage: { used: 0, available: 0, percentage: 0 },
    replication: { lag: 0, status: 'in-sync' },
    locks: { count: 0, blocking: [] }
  };

  static getInstance(): DatabaseMonitor {
    if (!DatabaseMonitor.instance) {
      DatabaseMonitor.instance = new DatabaseMonitor();
    }
    return DatabaseMonitor.instance;
  }

  async checkHealth(): Promise<DatabaseHealth> {
    const checks = await Promise.all([
      this.checkConnectionPool(),
      this.checkQueryPerformance(),
      this.checkStorageUsage(),
      this.checkReplicationLag(),
      this.checkLocks(),
      this.checkIndexHealth(),
      this.checkTableBloat()
    ]);

    this.healthMetrics = this.aggregateHealthMetrics(checks);

    // Determine overall health status
    this.healthMetrics.status = this.calculateOverallHealth();

    // Trigger alerts if needed
    await this.checkAlertConditions();

    return this.healthMetrics;
  }

  private async checkConnectionPool(): Promise<ConnectionPoolMetrics> {
    const query = `
      SELECT
        count(*) FILTER (WHERE state = 'active') as active,
        count(*) FILTER (WHERE state = 'idle') as idle,
        count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
        count(*) FILTER (WHERE wait_event_type = 'Client') as waiting
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND pid != pg_backend_pid();
    `;

    const result = await this.executeQuery(query);

    const metrics = {
      active: result.active,
      idle: result.idle,
      waiting: result.waiting,
      total: result.active + result.idle,
      maxConnections: 100, // Supabase default
      utilizationPercent: ((result.active + result.idle) / 100) * 100
    };

    // Alert if connection pool is nearly exhausted
    if (metrics.utilizationPercent > 80) {
      await this.createAlert('connection_pool_high', 'warning', metrics);
    }

    return metrics;
  }

  private async checkQueryPerformance(): Promise<QueryPerformanceMetrics> {
    // Get slow queries from pg_stat_statements
    const slowQueryThreshold = 1000; // 1 second

    const query = `
      SELECT
        query,
        calls,
        mean_exec_time,
        total_exec_time,
        stddev_exec_time,
        max_exec_time,
        rows
      FROM pg_stat_statements
      WHERE mean_exec_time > ${slowQueryThreshold}
        AND query NOT LIKE '%pg_stat_statements%'
      ORDER BY mean_exec_time DESC
      LIMIT 20;
    `;

    const slowQueries = await this.executeQuery(query);

    // Calculate average query time
    const avgQuery = `
      SELECT
        ROUND(AVG(mean_exec_time)::numeric, 2) as avg_time,
        ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY mean_exec_time)::numeric, 2) as median_time,
        ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY mean_exec_time)::numeric, 2) as p95_time,
        ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY mean_exec_time)::numeric, 2) as p99_time
      FROM pg_stat_statements
      WHERE query NOT LIKE '%pg_stat_statements%';
    `;

    const performanceStats = await this.executeQuery(avgQuery);

    return {
      avgTime: performanceStats.avg_time,
      medianTime: performanceStats.median_time,
      p95Time: performanceStats.p95_time,
      p99Time: performanceStats.p99_time,
      slowQueries: slowQueries.map(q => ({
        query: this.sanitizeQuery(q.query),
        avgTime: q.mean_exec_time,
        calls: q.calls,
        totalTime: q.total_exec_time,
        optimization: this.suggestOptimization(q)
      }))
    };
  }

  private async checkStorageUsage(): Promise<StorageMetrics> {
    const query = `
      SELECT
        pg_database_size(current_database()) as database_size,
        pg_size_pretty(pg_database_size(current_database())) as database_size_pretty
    `;

    const tableQuery = `
      SELECT
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_tables
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      LIMIT 10;
    `;

    const dbSize = await this.executeQuery(query);
    const tableSizes = await this.executeQuery(tableQuery);

    const maxSize = 5 * 1024 * 1024 * 1024; // 5GB Supabase limit
    const usedBytes = dbSize.database_size;
    const percentageUsed = (usedBytes / maxSize) * 100;

    return {
      used: usedBytes,
      available: maxSize - usedBytes,
      percentage: percentageUsed,
      prettySize: dbSize.database_size_pretty,
      maxSize: '5 GB',
      largestTables: tableSizes,
      warning: percentageUsed > 80,
      critical: percentageUsed > 90
    };
  }

  private async checkIndexHealth(): Promise<IndexHealthMetrics> {
    // Find unused indexes
    const unusedIndexQuery = `
      SELECT
        schemaname,
        tablename,
        indexname,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
        idx_scan as index_scans
      FROM pg_stat_user_indexes
      WHERE idx_scan = 0
        AND indexrelname NOT LIKE 'pg_toast%'
        AND schemaname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY pg_relation_size(indexrelid) DESC;
    `;

    // Find missing indexes (tables with sequential scans)
    const missingIndexQuery = `
      SELECT
        schemaname,
        tablename,
        seq_scan,
        seq_tup_read,
        idx_scan,
        seq_tup_read / GREATEST(seq_scan, 1) as avg_rows_per_seq_scan
      FROM pg_stat_user_tables
      WHERE seq_scan > idx_scan
        AND seq_tup_read > 100000
        AND schemaname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY seq_tup_read DESC
      LIMIT 10;
    `;

    // Check index bloat
    const bloatQuery = `
      WITH index_bloat AS (
        SELECT
          schemaname,
          tablename,
          indexname,
          pg_size_pretty(raw_bytes) as index_size,
          ROUND(((raw_bytes - expected_bytes) * 100.0 / raw_bytes)::numeric, 1) as bloat_percent
        FROM (
          SELECT
            schemaname,
            tablename,
            indexname,
            pg_relation_size(indexrelid) as raw_bytes,
            pg_relation_size(indexrelid) * 0.9 as expected_bytes
          FROM pg_stat_user_indexes
        ) t
        WHERE raw_bytes > 1024 * 1024 -- Only indexes > 1MB
      )
      SELECT * FROM index_bloat
      WHERE bloat_percent > 20
      ORDER BY bloat_percent DESC;
    `;

    const unusedIndexes = await this.executeQuery(unusedIndexQuery);
    const missingIndexes = await this.executeQuery(missingIndexQuery);
    const bloatedIndexes = await this.executeQuery(bloatQuery);

    return {
      totalIndexes: unusedIndexes.length + missingIndexes.length,
      unusedIndexes,
      missingIndexes,
      bloatedIndexes,
      recommendations: this.generateIndexRecommendations(unusedIndexes, missingIndexes, bloatedIndexes)
    };
  }

  private async checkTableBloat(): Promise<TableBloatMetrics> {
    const query = `
      WITH bloat_data AS (
        SELECT
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
          n_live_tup,
          n_dead_tup,
          ROUND((n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0))::numeric, 2) as dead_tuple_percent
        FROM pg_stat_user_tables
        WHERE n_dead_tup > 1000
      )
      SELECT * FROM bloat_data
      WHERE dead_tuple_percent > 10
      ORDER BY dead_tuple_percent DESC;
    `;

    const bloatedTables = await this.executeQuery(query);

    return {
      bloatedTables,
      vacuumNeeded: bloatedTables.filter(t => t.dead_tuple_percent > 20),
      recommendations: bloatedTables.map(t => ({
        table: `${t.schemaname}.${t.tablename}`,
        action: t.dead_tuple_percent > 30 ? 'VACUUM FULL' : 'VACUUM ANALYZE',
        reason: `${t.dead_tuple_percent}% dead tuples`,
        estimatedReclaim: this.estimateSpaceReclaim(t)
      }))
    };
  }

  private async checkLocks(): Promise<LockMetrics> {
    const query = `
      SELECT
        pid,
        usename,
        application_name,
        client_addr,
        query_start,
        state,
        wait_event_type,
        wait_event,
        query
      FROM pg_stat_activity
      WHERE wait_event_type IS NOT NULL
        AND state != 'idle'
        AND pid != pg_backend_pid()
      ORDER BY query_start;
    `;

    const blockingQuery = `
      SELECT
        blocking.pid as blocking_pid,
        blocking.usename as blocking_user,
        blocking.query as blocking_query,
        blocked.pid as blocked_pid,
        blocked.usename as blocked_user,
        blocked.query as blocked_query,
        EXTRACT(EPOCH FROM (NOW() - blocking.query_start)) as blocking_duration
      FROM pg_stat_activity as blocked
      JOIN pg_stat_activity as blocking
        ON blocking.pid = ANY(pg_blocking_pids(blocked.pid))
      WHERE blocked.pid != pg_backend_pid();
    `;

    const locks = await this.executeQuery(query);
    const blockingLocks = await this.executeQuery(blockingQuery);

    return {
      totalLocks: locks.length,
      blockingLocks: blockingLocks,
      recommendations: blockingLocks.length > 0 ?
        ['Blocking queries detected - consider killing long-running transactions'] : [],
      critical: blockingLocks.some(l => l.blocking_duration > 60)
    };
  }

  private calculateOverallHealth(): HealthStatus {
    const metrics = this.healthMetrics;
    let score = 100;

    // Connection pool scoring
    if (metrics.connectionPool.utilizationPercent > 80) score -= 15;
    if (metrics.connectionPool.utilizationPercent > 90) score -= 25;

    // Query performance scoring
    if (metrics.queryPerformance.avgTime > 500) score -= 10;
    if (metrics.queryPerformance.avgTime > 1000) score -= 20;
    if (metrics.queryPerformance.slowQueries.length > 10) score -= 15;

    // Storage scoring
    if (metrics.storage.percentage > 80) score -= 20;
    if (metrics.storage.percentage > 90) score -= 30;

    // Lock scoring
    if (metrics.locks.blocking.length > 0) score -= 15;
    if (metrics.locks.blocking.length > 5) score -= 25;

    if (score >= 80) return 'healthy';
    if (score >= 50) return 'degraded';
    return 'unhealthy';
  }
}

```

### 2. Query Optimization Engine

```tsx
// lib/queryOptimizer.ts
export class QueryOptimizer {
  private queryPatterns = new Map<string, OptimizationSuggestion>();

  constructor() {
    this.loadOptimizationPatterns();
  }

  private loadOptimizationPatterns() {
    // Common optimization patterns
    this.queryPatterns.set('missing_index', {
      pattern: /seq_scan.*WHERE/i,
      suggestion: 'Consider adding an index on the WHERE clause columns',
      example: 'CREATE INDEX idx_table_column ON table(column);'
    });

    this.queryPatterns.set('select_star', {
      pattern: /SELECT \*/i,
      suggestion: 'Avoid SELECT *, specify only needed columns',
      impact: 'Reduces network transfer and memory usage'
    });

    this.queryPatterns.set('missing_limit', {
      pattern: /SELECT.*FROM.*WHERE.*(?!LIMIT)/i,
      suggestion: 'Consider adding LIMIT clause for large result sets',
      impact: 'Prevents fetching unnecessary rows'
    });

    this.queryPatterns.set('n_plus_one', {
      pattern: /multiple similar queries/i,
      suggestion: 'Use JOIN or batch query instead of multiple queries',
      impact: 'Reduces round trips to database'
    });
  }

  async analyzeQuery(query: string, stats: QueryStats): Promise<OptimizationReport> {
    const suggestions: Suggestion[] = [];

    // Analyze query structure
    const explainPlan = await this.getExplainPlan(query);

    // Check for sequential scans
    if (explainPlan.includes('Seq Scan')) {
      suggestions.push({
        type: 'index',
        severity: 'high',
        suggestion: 'Query uses sequential scan, consider adding index',
        estimatedImprovement: '50-90% faster'
      });
    }

    // Check for missing JOIN conditions
    if (query.includes('JOIN') && !query.includes('ON')) {
      suggestions.push({
        type: 'syntax',
        severity: 'critical',
        suggestion: 'JOIN missing ON condition, causing cartesian product'
      });
    }

    // Check for expensive operations
    if (explainPlan.cost > 10000) {
      suggestions.push({
        type: 'performance',
        severity: 'high',
        suggestion: 'Query cost very high, consider breaking into smaller queries',
        currentCost: explainPlan.cost
      });
    }

    return {
      query,
      currentPerformance: {
        avgTime: stats.mean_exec_time,
        calls: stats.calls,
        totalTime: stats.total_exec_time
      },
      suggestions,
      optimizedQuery: this.generateOptimizedQuery(query, suggestions),
      estimatedImprovement: this.calculateImprovement(suggestions)
    };
  }

  private async getExplainPlan(query: string): Promise<any> {
    const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
    return await this.executeQuery(explainQuery);
  }

  generateOptimizedQuery(original: string, suggestions: Suggestion[]): string {
    let optimized = original;

    suggestions.forEach(suggestion => {
      switch (suggestion.type) {
        case 'index':
          // Add index hint comment
          optimized = `-- Consider index: ${suggestion.indexName}\n${optimized}`;
          break;
        case 'select_star':
          // Replace SELECT * with specific columns
          optimized = this.replaceSelectStar(optimized);
          break;
        case 'missing_limit':
          // Add LIMIT clause
          if (!optimized.includes('LIMIT')) {
            optimized += ' LIMIT 1000';
          }
          break;
      }
    });

    return optimized;
  }
}

```

### 3. Database Maintenance Automation

```tsx
// lib/databaseMaintenance.ts
export class DatabaseMaintenance {
  private maintenanceSchedule = {
    vacuum: { frequency: 'daily', lastRun: null },
    analyze: { frequency: 'hourly', lastRun: null },
    reindex: { frequency: 'weekly', lastRun: null },
    backup: { frequency: 'hourly', lastRun: null }
  };

  async performMaintenance(): Promise<MaintenanceReport> {
    const report: MaintenanceReport = {
      timestamp: new Date().toISOString(),
      actions: [],
      errors: [],
      recommendations: []
    };

    // Check if maintenance is needed
    const health = await DatabaseMonitor.getInstance().checkHealth();

    // Auto-vacuum bloated tables
    if (health.tableBloat.vacuumNeeded.length > 0) {
      for (const table of health.tableBloat.vacuumNeeded) {
        try {
          await this.vacuumTable(table);
          report.actions.push({
            type: 'vacuum',
            target: table.tablename,
            status: 'success',
            reclaimedSpace: table.estimatedReclaim
          });
        } catch (error) {
          report.errors.push({
            type: 'vacuum',
            target: table.tablename,
            error: error.message
          });
        }
      }
    }

    // Update statistics for tables with stale stats
    const staleStats = await this.findStaleStatistics();
    for (const table of staleStats) {
      await this.analyzeTable(table);
      report.actions.push({
        type: 'analyze',
        target: table,
        status: 'success'
      });
    }

    // Rebuild bloated indexes
    const bloatedIndexes = health.indexHealth.bloatedIndexes;
    for (const index of bloatedIndexes) {
      if (index.bloat_percent > 50) {
        await this.reindexConcurrently(index);
        report.actions.push({
          type: 'reindex',
          target: index.indexname,
          status: 'success',
          improvement: `${index.bloat_percent}% bloat removed`
        });
      }
    }

    return report;
  }

  private async vacuumTable(table: any): Promise<void> {
    const vacuumType = table.dead_tuple_percent > 30 ? 'FULL' : 'ANALYZE';
    const query = `VACUUM ${vacuumType} ${table.schemaname}.${table.tablename};`;

    // For VACUUM FULL, ensure we have a maintenance window
    if (vacuumType === 'FULL') {
      await this.waitForMaintenanceWindow();
    }

    await this.executeQuery(query);
  }

  private async reindexConcurrently(index: any): Promise<void> {
    // Use REINDEX CONCURRENTLY to avoid blocking
    const query = `REINDEX INDEX CONCURRENTLY ${index.schemaname}.${index.indexname};`;
    await this.executeQuery(query);
  }

  async createAutomatedBackup(): Promise<BackupResult> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `wedsync-backup-${timestamp}`;

    // Supabase handles backups automatically, but we track metadata
    const backup = {
      name: backupName,
      timestamp,
      size: await this.getDatabaseSize(),
      tables: await this.getTableList(),
      status: 'completed'
    };

    // Store backup metadata
    await this.storeBackupMetadata(backup);

    return backup;
  }
}

```

### 4. Performance Dashboard Components

```tsx
// components/DatabaseHealthDashboard.tsx
export function DatabaseHealthDashboard() {
  const { data: health } = useDatabaseHealth();
  const { data: metrics } = usePerformanceMetrics();

  return (
    <div className="database-dashboard">
      <HealthStatusCard health={health} />

      <div className="metrics-grid">
        <ConnectionPoolWidget data={health?.connectionPool} />
        <QueryPerformanceWidget data={metrics?.queries} />
        <StorageUsageWidget data={health?.storage} />
        <LockMonitorWidget data={health?.locks} />
      </div>

      <div className="optimization-section">
        <h3>Optimization Opportunities</h3>
        <OptimizationList recommendations={health?.recommendations} />
      </div>

      <div className="maintenance-section">
        <h3>Maintenance Status</h3>
        <MaintenanceSchedule />
      </div>
    </div>
  );
}

function QueryPerformanceWidget({ data }) {
  return (
    <div className="widget">
      <h4>Query Performance</h4>

      <div className="metrics">
        <div className="metric">
          <span>Avg Response</span>
          <span className="value">{data?.avgTime || 0}ms</span>
        </div>
        <div className="metric">
          <span>P95 Response</span>
          <span className="value">{data?.p95Time || 0}ms</span>
        </div>
        <div className="metric">
          <span>Slow Queries</span>
          <span className="value">{data?.slowQueries?.length || 0}</span>
        </div>
      </div>

      {data?.slowQueries?.length > 0 && (
        <div className="slow-queries">
          <h5>Top Slow Queries</h5>
          {data.slowQueries.slice(0, 3).map((q, i) => (
            <div key={i} className="query-item">
              <code>{q.query.substring(0, 50)}...</code>
              <span>{q.avgTime}ms avg</span>
              <button onClick={() => optimizeQuery(q)}>Optimize</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

```

### 5. Critical Database Queries

```sql
-- Real-time health check query
CREATE OR REPLACE FUNCTION check_database_health()
RETURNS TABLE (
  metric VARCHAR,
  value NUMERIC,
  status VARCHAR,
  details JSONB
) AS $
BEGIN
  -- Connection pool status
  RETURN QUERY
  SELECT
    'connection_pool'::VARCHAR,
    (COUNT(*) FILTER (WHERE state = 'active'))::NUMERIC,
    CASE
      WHEN COUNT(*) > 80 THEN 'critical'
      WHEN COUNT(*) > 60 THEN 'warning'
      ELSE 'healthy'
    END,
    jsonb_build_object(
      'active', COUNT(*) FILTER (WHERE state = 'active'),
      'idle', COUNT(*) FILTER (WHERE state = 'idle'),
      'total', COUNT(*)
    )
  FROM pg_stat_activity;

  -- Database size
  RETURN QUERY
  SELECT
    'storage_usage'::VARCHAR,
    ROUND((pg_database_size(current_database())::NUMERIC / (1024*1024*1024)), 2),
    CASE
      WHEN pg_database_size(current_database()) > 4.5*1024*1024*1024 THEN 'critical'
      WHEN pg_database_size(current_database()) > 4*1024*1024*1024 THEN 'warning'
      ELSE 'healthy'
    END,
    jsonb_build_object(
      'size_gb', ROUND((pg_database_size(current_database())::NUMERIC / (1024*1024*1024)), 2),
      'limit_gb', 5
    );

  -- Cache hit ratio
  RETURN QUERY
  SELECT
    'cache_hit_ratio'::VARCHAR,
    ROUND(
      (sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) * 100)::NUMERIC,
      2
    ),
    CASE
      WHEN sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) < 0.9 THEN 'warning'
      WHEN sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) < 0.8 THEN 'critical'
      ELSE 'healthy'
    END,
    jsonb_build_object(
      'hit_ratio', ROUND((sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) * 100)::NUMERIC, 2)
    )
  FROM pg_statio_user_tables;
END;
$ LANGUAGE plpgsql;

-- Index usage analysis
CREATE OR REPLACE VIEW index_usage_analysis AS
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  pg_size_pretty(pg_relation_size(indexrelid)) as size,
  CASE
    WHEN idx_scan = 0 THEN 'UNUSED - Consider dropping'
    WHEN idx_scan < 100 THEN 'RARELY USED - Review necessity'
    ELSE 'ACTIVE'
  END as recommendation
FROM pg_stat_user_indexes
ORDER BY idx_scan, pg_relation_size(indexrelid) DESC;

-- Table bloat analysis
CREATE OR REPLACE VIEW table_bloat_analysis AS
SELECT
  schemaname,
  tablename,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows,
  ROUND((n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0))::numeric, 2) as bloat_percent,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
  CASE
    WHEN n_dead_tup > 10000 AND (n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0)) > 20 THEN 'VACUUM NEEDED'
    WHEN n_dead_tup > 50000 AND (n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0)) > 30 THEN 'VACUUM FULL NEEDED'
    ELSE 'OK'
  END as action_needed
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;

```

### 6. Monitoring Alert Rules

```tsx
// config/databaseAlerts.ts
export const databaseAlertRules = {
  connectionPool: {
    warning: {
      condition: 'utilization > 70%',
      message: 'Database connection pool approaching limit',
      action: 'Scale connection pool or optimize connection usage'
    },
    critical: {
      condition: 'utilization > 90%',
      message: 'Database connection pool critical',
      action: 'Immediate action required - connections may be refused'
    }
  },

  queryPerformance: {
    warning: {
      condition: 'avg_response > 1000ms',
      message: 'Database queries running slow',
      action: 'Review slow query log and optimize'
    },
    critical: {
      condition: 'avg_response > 3000ms',
      message: 'Database performance severely degraded',
      action: 'Emergency optimization required'
    }
  },

  storage: {
    warning: {
      condition: 'usage > 4GB',
      message: 'Database storage approaching limit',
      action: 'Archive old data or upgrade plan'
    },
    critical: {
      condition: 'usage > 4.5GB',
      message: 'Database storage critical - 500MB remaining',
      action: 'Immediate cleanup required to prevent outage'
    }
  },

  replication: {
    warning: {
      condition: 'lag > 1000ms',
      message: 'Database replication lag detected',
      action: 'Monitor for consistency issues'
    },
    critical: {
      condition: 'lag > 5000ms',
      message: 'Severe replication lag',
      action: 'Risk of data inconsistency - investigate immediately'
    }
  },

  locks: {
    warning: {
      condition: 'blocking_queries > 0',
      message: 'Database lock contention detected',
      action: 'Review blocking queries'
    },
    critical: {
      condition: 'blocking_duration > 60s',
      message: 'Long-running database locks',
      action: 'Kill blocking queries to restore performance'
    }
  }
};

```

### 7. Database Recovery Procedures

```tsx
// lib/databaseRecovery.ts
export class DatabaseRecovery {
  async handleConnectionPoolExhaustion() {
    // 1. Identify and kill idle connections
    const idleQuery = `
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE state = 'idle'
        AND state_change < NOW() - INTERVAL '10 minutes';
    `;
    await this.executeQuery(idleQuery);

    // 2. Identify connection leaks
    const leakQuery = `
      SELECT application_name, COUNT(*) as connections
      FROM pg_stat_activity
      GROUP BY application_name
      HAVING COUNT(*) > 10;
    `;
    const leaks = await this.executeQuery(leakQuery);

    // 3. Alert on potential leaks
    if (leaks.length > 0) {
      await this.sendAlert('Connection leak detected', leaks);
    }
  }

  async handleSlowQueries() {
    // 1. Kill queries running longer than 5 minutes
    const killQuery = `
      SELECT pg_cancel_backend(pid)
      FROM pg_stat_activity
      WHERE state != 'idle'
        AND query_start < NOW() - INTERVAL '5 minutes'
        AND query NOT LIKE '%pg_stat_activity%';
    `;
    await this.executeQuery(killQuery);

    // 2. Update table statistics
    await this.executeQuery('ANALYZE;');

    // 3. Clear query cache if applicable
    await this.clearQueryCache();
  }

  async emergencyVacuum() {
    // Run vacuum on critical tables during maintenance window
    const criticalTables = [
      'form_responses',
      'api_usage_logs',
      'activity_logs',
      'email_logs'
    ];

    for (const table of criticalTables) {
      await this.executeQuery(`VACUUM ANALYZE ${table};`);
    }
  }
}

```

## Best Practices

### 1. Query Optimization

- Always use indexes for WHERE, JOIN, and ORDER BY columns
- Avoid SELECT * - specify only needed columns
- Use EXPLAIN ANALYZE to understand query plans
- Batch INSERT/UPDATE operations when possible
- Use prepared statements to reduce parsing overhead

### 2. Connection Management

- Use connection pooling (PgBouncer in Supabase)
- Close connections promptly
- Set appropriate connection timeouts
- Monitor for connection leaks
- Use read replicas for analytics queries

### 3. Maintenance Schedule

- Run VACUUM daily during low-traffic periods
- Update statistics (ANALYZE) after bulk operations
- Rebuild indexes monthly or when bloat > 30%
- Regular backups with point-in-time recovery
- Archive old data to keep working set small

### 4. Monitoring Thresholds

- Alert when query time > 1 second
- Alert when connection pool > 80% utilized
- Alert when storage > 80% of limit
- Alert when replication lag > 1 second
- Alert when error rate > 1%

### 5. Capacity Planning

- Track growth rate of data
- Project storage needs 3-6 months ahead
- Plan index strategy based on query patterns
- Consider partitioning for large tables
- Implement data retention policies

## Success Metrics

- **Query Performance**: P95 latency <500ms
- **Availability**: >99.9% uptime
- **Connection Pool**: <70% utilization average
- **Cache Hit Ratio**: >95%
- **Storage Efficiency**: <20% bloat
- **Backup Success**: 100% successful daily backups
- **Recovery Time**: <1 hour for critical issues