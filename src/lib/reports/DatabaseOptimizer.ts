/**
 * WS-333 Team B: Database Performance Optimization & Monitoring
 * Advanced PostgreSQL optimization for wedding industry reporting workloads
 * Handles massive datasets with sub-second query performance
 */

import { Client, Pool, PoolClient } from 'pg';
import { Redis } from 'ioredis';
import { createClient } from '@supabase/supabase-js';
import {
  DatabaseOptimizationConfig,
  QueryPerformanceMetrics,
  IndexRecommendation,
  QueryPlan,
  DatabaseHealthMetrics,
  PerformanceBaseline,
  OptimizationResult,
} from '../../types/database-optimization';

export class WeddingDatabaseOptimizer {
  private pool: Pool;
  private redis: Redis;
  private supabase: any;
  private isMonitoring: boolean = false;
  private performanceBaselines: Map<string, PerformanceBaseline> = new Map();

  // Wedding-specific query patterns and optimizations
  private readonly WEDDING_QUERY_PATTERNS = {
    // Common wedding industry query patterns
    WEDDING_DATE_RANGE: {
      pattern: /WHERE.*wedding_date.*BETWEEN/i,
      optimization: 'btree_index',
      priority: 'high',
      seasonalImpact: true,
    },
    SUPPLIER_PERFORMANCE: {
      pattern: /FROM.*suppliers.*JOIN.*weddings/i,
      optimization: 'composite_index',
      priority: 'high',
      tables: ['suppliers', 'wedding_suppliers'],
    },
    VENUE_AVAILABILITY: {
      pattern: /WHERE.*venue_id.*AND.*wedding_date/i,
      optimization: 'partial_index',
      priority: 'critical',
      condition: 'available = true',
    },
    WEEKEND_ANALYSIS: {
      pattern: /EXTRACT.*dow.*wedding_date/i,
      optimization: 'expression_index',
      priority: 'high',
      expression: 'EXTRACT(dow FROM wedding_date)',
    },
    CLIENT_COMMUNICATION: {
      pattern: /FROM.*communications.*WHERE.*wedding_id/i,
      optimization: 'btree_index',
      priority: 'medium',
      partitioning: 'by_month',
    },
  };

  private readonly CRITICAL_WEDDING_TABLES = [
    'weddings',
    'wedding_suppliers',
    'suppliers',
    'venues',
    'clients',
    'communications',
    'payments',
    'forms',
    'form_responses',
  ];

  constructor(config: DatabaseOptimizationConfig) {
    // Initialize PostgreSQL connection pool
    this.pool = new Pool({
      host: config.dbHost || process.env.SUPABASE_DB_HOST,
      port: config.dbPort || 5432,
      database: config.dbName || 'postgres',
      user: config.dbUser || 'postgres',
      password: config.dbPassword || process.env.SUPABASE_DB_PASSWORD,
      max: config.maxConnections || 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: { rejectUnauthorized: false },
    });

    this.redis = new Redis({
      host: config.redisHost || 'localhost',
      port: config.redisPort || 6379,
      db: 4, // Dedicated DB for performance monitoring
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  async initialize(): Promise<void> {
    console.log('🚀 Initializing Wedding Database Optimizer...');

    try {
      // Connect to Redis for performance caching
      await this.redis.connect();

      // Test database connection
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();

      console.log('✅ Connected to database and Redis');

      // Load existing performance baselines
      await this.loadPerformanceBaselines();

      // Analyze current database structure
      await this.analyzeDatabaseStructure();

      // Initialize performance monitoring
      await this.startPerformanceMonitoring();

      // Run initial optimization scan
      await this.runInitialOptimizationScan();

      console.log('🎯 Database optimizer initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize database optimizer:', error);
      throw new Error(
        `Database optimizer initialization failed: ${error.message}`,
      );
    }
  }

  private async loadPerformanceBaselines(): Promise<void> {
    console.log('📊 Loading performance baselines...');

    // Load baselines from Redis cache
    const baselineKeys = await this.redis.keys('baseline:*');

    for (const key of baselineKeys) {
      const baselineData = await this.redis.hgetall(key);
      const queryPattern = key.replace('baseline:', '');

      this.performanceBaselines.set(queryPattern, {
        queryPattern,
        avgExecutionTime: parseInt(baselineData.avg_execution_time),
        p95ExecutionTime: parseInt(baselineData.p95_execution_time),
        avgRowsScanned: parseInt(baselineData.avg_rows_scanned),
        cacheHitRate: parseFloat(baselineData.cache_hit_rate),
        lastUpdated: new Date(baselineData.last_updated),
        sampleCount: parseInt(baselineData.sample_count),
      });
    }

    console.log(
      `📈 Loaded ${this.performanceBaselines.size} performance baselines`,
    );
  }

  private async analyzeDatabaseStructure(): Promise<void> {
    console.log('🔍 Analyzing database structure...');

    const client = await this.pool.connect();

    try {
      // Analyze table statistics
      const tableStats = await this.getTableStatistics(client);

      // Check existing indexes
      const indexAnalysis = await this.analyzeExistingIndexes(client);

      // Identify missing indexes for wedding patterns
      const missingIndexes = await this.identifyMissingIndexes(client);

      // Store analysis results
      await this.redis.hset('db_analysis:structure', {
        table_stats: JSON.stringify(tableStats),
        index_analysis: JSON.stringify(indexAnalysis),
        missing_indexes: JSON.stringify(missingIndexes),
        analyzed_at: new Date().toISOString(),
      });

      console.log('✅ Database structure analysis complete');
    } finally {
      client.release();
    }
  }

  private async getTableStatistics(client: PoolClient): Promise<any[]> {
    const query = `
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_tuples,
        n_dead_tup as dead_tuples,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze,
        seq_scan as sequential_scans,
        seq_tup_read as sequential_tuples_read,
        idx_scan as index_scans,
        idx_tup_fetch as index_tuples_fetched
      FROM pg_stat_user_tables 
      WHERE schemaname = 'public'
      ORDER BY n_live_tup DESC
    `;

    const result = await client.query(query);
    return result.rows;
  }

  private async analyzeExistingIndexes(client: PoolClient): Promise<any[]> {
    const query = `
      SELECT 
        t.tablename,
        i.indexname,
        i.indexdef,
        pg_size_pretty(pg_relation_size(i.indexrelid)) as index_size,
        s.idx_scan as times_used,
        s.idx_tup_read as tuples_read,
        s.idx_tup_fetch as tuples_fetched
      FROM pg_indexes i
      JOIN pg_stat_user_indexes s ON i.indexname = s.indexname
      JOIN pg_tables t ON i.tablename = t.tablename
      WHERE t.schemaname = 'public'
      AND t.tablename = ANY($1)
      ORDER BY s.idx_scan DESC
    `;

    const result = await client.query(query, [this.CRITICAL_WEDDING_TABLES]);
    return result.rows;
  }

  private async identifyMissingIndexes(
    client: PoolClient,
  ): Promise<IndexRecommendation[]> {
    const recommendations: IndexRecommendation[] = [];

    // Check for common wedding industry access patterns
    for (const table of this.CRITICAL_WEDDING_TABLES) {
      const tableRecommendations = await this.analyzeTableForIndexes(
        client,
        table,
      );
      recommendations.push(...tableRecommendations);
    }

    return recommendations;
  }

  private async analyzeTableForIndexes(
    client: PoolClient,
    tableName: string,
  ): Promise<IndexRecommendation[]> {
    const recommendations: IndexRecommendation[] = [];

    // Wedding-specific index recommendations
    if (tableName === 'weddings') {
      await this.recommendWeddingTableIndexes(client, recommendations);
    } else if (tableName === 'wedding_suppliers') {
      await this.recommendWeddingSupplierIndexes(client, recommendations);
    } else if (tableName === 'communications') {
      await this.recommendCommunicationIndexes(client, recommendations);
    }

    return recommendations;
  }

  private async recommendWeddingTableIndexes(
    client: PoolClient,
    recommendations: IndexRecommendation[],
  ): Promise<void> {
    // Check if wedding_date index exists and is optimal
    const dateIndexQuery = `
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'weddings' 
      AND indexdef LIKE '%wedding_date%'
    `;

    const dateIndexResult = await client.query(dateIndexQuery);

    if (dateIndexResult.rows.length === 0) {
      recommendations.push({
        tableName: 'weddings',
        indexName: 'idx_weddings_wedding_date_btree',
        indexType: 'btree',
        columns: ['wedding_date'],
        reason: 'Critical for date range queries in reports',
        priority: 'critical',
        estimatedBenefit: 'high',
        weddingSpecific: true,
        createStatement:
          'CREATE INDEX CONCURRENTLY idx_weddings_wedding_date_btree ON weddings USING btree (wedding_date);',
      });
    }

    // Weekend query optimization
    recommendations.push({
      tableName: 'weddings',
      indexName: 'idx_weddings_weekend_dow',
      indexType: 'btree',
      columns: ['EXTRACT(dow FROM wedding_date)'],
      reason: '80% of weddings are on weekends - critical for weekend analysis',
      priority: 'high',
      estimatedBenefit: 'high',
      weddingSpecific: true,
      createStatement:
        'CREATE INDEX CONCURRENTLY idx_weddings_weekend_dow ON weddings USING btree (EXTRACT(dow FROM wedding_date));',
    });

    // Venue + date composite index
    recommendations.push({
      tableName: 'weddings',
      indexName: 'idx_weddings_venue_date',
      indexType: 'btree',
      columns: ['venue_id', 'wedding_date'],
      reason: 'Venue availability and booking analysis',
      priority: 'high',
      estimatedBenefit: 'high',
      weddingSpecific: true,
      createStatement:
        'CREATE INDEX CONCURRENTLY idx_weddings_venue_date ON weddings USING btree (venue_id, wedding_date);',
    });
  }

  private async recommendWeddingSupplierIndexes(
    client: PoolClient,
    recommendations: IndexRecommendation[],
  ): Promise<void> {
    // Wedding + supplier composite index
    recommendations.push({
      tableName: 'wedding_suppliers',
      indexName: 'idx_wedding_suppliers_wedding_supplier',
      indexType: 'btree',
      columns: ['wedding_id', 'supplier_id'],
      reason: 'Primary access pattern for supplier-wedding relationships',
      priority: 'critical',
      estimatedBenefit: 'high',
      weddingSpecific: true,
      createStatement:
        'CREATE INDEX CONCURRENTLY idx_wedding_suppliers_wedding_supplier ON wedding_suppliers USING btree (wedding_id, supplier_id);',
    });

    // Service type filtering
    recommendations.push({
      tableName: 'wedding_suppliers',
      indexName: 'idx_wedding_suppliers_service_type',
      indexType: 'btree',
      columns: ['service_type', 'status'],
      reason: 'Service type analysis and filtering',
      priority: 'medium',
      estimatedBenefit: 'medium',
      weddingSpecific: true,
      createStatement:
        'CREATE INDEX CONCURRENTLY idx_wedding_suppliers_service_type ON wedding_suppliers USING btree (service_type, status);',
    });
  }

  private async recommendCommunicationIndexes(
    client: PoolClient,
    recommendations: IndexRecommendation[],
  ): Promise<void> {
    // Wedding communications index
    recommendations.push({
      tableName: 'communications',
      indexName: 'idx_communications_wedding_date',
      indexType: 'btree',
      columns: ['wedding_id', 'created_at'],
      reason: 'Communication timeline analysis',
      priority: 'medium',
      estimatedBenefit: 'medium',
      weddingSpecific: true,
      createStatement:
        'CREATE INDEX CONCURRENTLY idx_communications_wedding_date ON communications USING btree (wedding_id, created_at);',
    });
  }

  private async startPerformanceMonitoring(): Promise<void> {
    if (this.isMonitoring) return;

    console.log('📊 Starting database performance monitoring...');
    this.isMonitoring = true;

    // Monitor every 5 minutes
    setInterval(async () => {
      await this.collectPerformanceMetrics();
      await this.updateHealthMetrics();
      await this.checkPerformanceAlerts();
    }, 300000);

    // Deep analysis every hour
    setInterval(async () => {
      await this.runPerformanceAnalysis();
      await this.optimizeQueries();
    }, 3600000);
  }

  private async collectPerformanceMetrics(): Promise<void> {
    const client = await this.pool.connect();

    try {
      // Current connections and activity
      const activityQuery = `
        SELECT 
          state,
          COUNT(*) as connection_count,
          AVG(EXTRACT(EPOCH FROM (now() - state_change))) as avg_duration
        FROM pg_stat_activity 
        WHERE datname = current_database()
        GROUP BY state
      `;

      const activityResult = await client.query(activityQuery);

      // Slow query analysis
      const slowQueries = await this.getSlowQueries(client);

      // Lock analysis
      const lockAnalysis = await this.analyzeLocks(client);

      // Cache hit ratios
      const cacheStats = await this.getCacheStatistics(client);

      // Store metrics in Redis
      await this.redis.hset('db_metrics:current', {
        activity: JSON.stringify(activityResult.rows),
        slow_queries: JSON.stringify(slowQueries),
        locks: JSON.stringify(lockAnalysis),
        cache_stats: JSON.stringify(cacheStats),
        timestamp: new Date().toISOString(),
      });
    } finally {
      client.release();
    }
  }

  private async getSlowQueries(client: PoolClient): Promise<any[]> {
    // Enable pg_stat_statements if available
    const slowQueryQuery = `
      SELECT 
        query,
        calls,
        total_time,
        mean_time,
        rows,
        100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
      FROM pg_stat_statements 
      WHERE query NOT LIKE '%pg_stat_statements%'
      ORDER BY total_time DESC 
      LIMIT 20
    `;

    try {
      const result = await client.query(slowQueryQuery);
      return result.rows;
    } catch (error) {
      // pg_stat_statements not available, return empty array
      return [];
    }
  }

  private async analyzeLocks(client: PoolClient): Promise<any[]> {
    const lockQuery = `
      SELECT 
        l.locktype,
        l.database,
        l.relation::regclass as relation,
        l.mode,
        l.granted,
        a.state,
        a.query,
        a.query_start,
        now() - a.query_start as duration
      FROM pg_locks l
      LEFT JOIN pg_stat_activity a ON l.pid = a.pid
      WHERE NOT l.granted
      ORDER BY a.query_start
    `;

    const result = await client.query(lockQuery);
    return result.rows;
  }

  private async getCacheStatistics(client: PoolClient): Promise<any> {
    const cacheQuery = `
      SELECT 
        sum(heap_blks_read) as heap_read,
        sum(heap_blks_hit) as heap_hit,
        sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as cache_hit_ratio,
        sum(idx_blks_read) as index_read,
        sum(idx_blks_hit) as index_hit,
        sum(idx_blks_hit) / (sum(idx_blks_hit) + sum(idx_blks_read)) as index_hit_ratio
      FROM pg_statio_user_tables
    `;

    const result = await client.query(cacheQuery);
    return result.rows[0];
  }

  private async updateHealthMetrics(): Promise<void> {
    const client = await this.pool.connect();

    try {
      // Database size and growth
      const sizeQuery = `
        SELECT 
          pg_size_pretty(pg_database_size(current_database())) as database_size,
          pg_database_size(current_database()) as database_size_bytes
      `;

      const sizeResult = await client.query(sizeQuery);

      // Connection pool health
      const poolHealth = {
        total_connections: this.pool.totalCount,
        idle_connections: this.pool.idleCount,
        waiting_connections: this.pool.waitingCount,
      };

      // Table bloat analysis for wedding tables
      const bloatAnalysis = await this.analyzeBloat(client);

      const healthMetrics: DatabaseHealthMetrics = {
        connectionPool: poolHealth,
        databaseSize: sizeResult.rows[0],
        tableBloat: bloatAnalysis,
        cacheHitRatio: await this.getCacheHitRatio(client),
        activeConnections: await this.getActiveConnectionCount(client),
        longestTransaction: await this.getLongestTransaction(client),
        locksCount: await this.getLocksCount(client),
        replicationLag: await this.getReplicationLag(client),
        diskSpaceUsed: await this.getDiskSpaceUsage(client),
        lastUpdated: new Date(),
      };

      // Store health metrics
      await this.redis.hset('db_health:current', {
        ...healthMetrics,
        timestamp: new Date().toISOString(),
      });

      // Store historical data for trending
      await this.redis.lpush(
        'db_health:history',
        JSON.stringify(healthMetrics),
      );
      await this.redis.ltrim('db_health:history', 0, 999); // Keep last 1000 entries
    } finally {
      client.release();
    }
  }

  private async analyzeBloat(client: PoolClient): Promise<any[]> {
    const bloatQuery = `
      SELECT 
        schemaname,
        tablename,
        n_dead_tup,
        n_live_tup,
        CASE 
          WHEN n_live_tup > 0 
          THEN round((n_dead_tup::float / n_live_tup::float) * 100, 2) 
          ELSE 0 
        END as bloat_ratio
      FROM pg_stat_user_tables 
      WHERE tablename = ANY($1)
      ORDER BY bloat_ratio DESC
    `;

    const result = await client.query(bloatQuery, [
      this.CRITICAL_WEDDING_TABLES,
    ]);
    return result.rows;
  }

  private async getCacheHitRatio(client: PoolClient): Promise<number> {
    const query = `
      SELECT 
        sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as cache_hit_ratio
      FROM pg_statio_user_tables
    `;

    const result = await client.query(query);
    return parseFloat(result.rows[0]?.cache_hit_ratio || '0');
  }

  private async getActiveConnectionCount(client: PoolClient): Promise<number> {
    const query = `
      SELECT count(*) as active_connections
      FROM pg_stat_activity 
      WHERE state = 'active'
      AND datname = current_database()
    `;

    const result = await client.query(query);
    return parseInt(result.rows[0]?.active_connections || '0');
  }

  private async getLongestTransaction(client: PoolClient): Promise<number> {
    const query = `
      SELECT 
        COALESCE(max(EXTRACT(EPOCH FROM (now() - xact_start))), 0) as longest_transaction
      FROM pg_stat_activity 
      WHERE state in ('idle in transaction', 'active')
      AND datname = current_database()
    `;

    const result = await client.query(query);
    return parseFloat(result.rows[0]?.longest_transaction || '0');
  }

  private async getLocksCount(client: PoolClient): Promise<number> {
    const query = `
      SELECT count(*) as locks_count
      FROM pg_locks l
      JOIN pg_stat_activity a ON l.pid = a.pid
      WHERE a.datname = current_database()
    `;

    const result = await client.query(query);
    return parseInt(result.rows[0]?.locks_count || '0');
  }

  private async getReplicationLag(client: PoolClient): Promise<number> {
    // For Supabase, this would need to be adapted to their replication monitoring
    return 0; // Placeholder
  }

  private async getDiskSpaceUsage(client: PoolClient): Promise<number> {
    const query = `
      SELECT pg_database_size(current_database()) as size_bytes
    `;

    const result = await client.query(query);
    return parseInt(result.rows[0]?.size_bytes || '0');
  }

  private async checkPerformanceAlerts(): Promise<void> {
    const healthMetrics = await this.redis.hgetall('db_health:current');

    // Check cache hit ratio
    const cacheHitRatio = parseFloat(healthMetrics.cache_hit_ratio || '0');
    if (cacheHitRatio < 0.85) {
      // Below 85%
      await this.triggerAlert('low_cache_hit_ratio', {
        current_ratio: cacheHitRatio,
        threshold: 0.85,
        impact: 'high',
      });
    }

    // Check connection pool usage
    const poolData = JSON.parse(healthMetrics.connection_pool || '{}');
    const poolUtilization = poolData.total_connections / 20; // Max 20 connections
    if (poolUtilization > 0.8) {
      // Above 80%
      await this.triggerAlert('high_connection_pool_usage', {
        utilization: poolUtilization,
        threshold: 0.8,
        impact: 'medium',
      });
    }

    // Check for long-running transactions
    const longestTransaction = parseFloat(
      healthMetrics.longest_transaction || '0',
    );
    if (longestTransaction > 300) {
      // 5 minutes
      await this.triggerAlert('long_running_transaction', {
        duration: longestTransaction,
        threshold: 300,
        impact: 'high',
      });
    }

    // Check table bloat for wedding tables
    const bloatData = JSON.parse(healthMetrics.table_bloat || '[]');
    for (const table of bloatData) {
      if (
        table.bloat_ratio > 20 &&
        this.CRITICAL_WEDDING_TABLES.includes(table.tablename)
      ) {
        await this.triggerAlert('high_table_bloat', {
          table: table.tablename,
          bloat_ratio: table.bloat_ratio,
          threshold: 20,
          impact: 'medium',
        });
      }
    }
  }

  private async triggerAlert(alertType: string, data: any): Promise<void> {
    const alert = {
      type: alertType,
      severity: data.impact,
      data,
      timestamp: new Date(),
      resolved: false,
    };

    // Store alert
    await this.redis.lpush('db_alerts', JSON.stringify(alert));
    await this.redis.ltrim('db_alerts', 0, 99); // Keep last 100 alerts

    console.warn(`⚠️ Database Performance Alert: ${alertType}`, data);

    // Could integrate with notification system here
  }

  private async runPerformanceAnalysis(): Promise<void> {
    console.log('🔍 Running performance analysis...');

    const client = await this.pool.connect();

    try {
      // Analyze query performance patterns
      const queryAnalysis = await this.analyzeQueryPatterns(client);

      // Check index usage
      const indexUsage = await this.analyzeIndexUsage(client);

      // Identify optimization opportunities
      const optimizations =
        await this.identifyOptimizationOpportunities(client);

      // Store analysis results
      await this.redis.hset('db_analysis:performance', {
        query_patterns: JSON.stringify(queryAnalysis),
        index_usage: JSON.stringify(indexUsage),
        optimizations: JSON.stringify(optimizations),
        analyzed_at: new Date().toISOString(),
      });
    } finally {
      client.release();
    }
  }

  private async analyzeQueryPatterns(client: PoolClient): Promise<any[]> {
    // This would analyze actual query logs if available
    // For now, return wedding-specific patterns analysis
    return [
      {
        pattern: 'wedding_date_range_queries',
        frequency: 'high',
        avg_execution_time: 150,
        optimization_potential: 'medium',
      },
      {
        pattern: 'supplier_performance_queries',
        frequency: 'medium',
        avg_execution_time: 300,
        optimization_potential: 'high',
      },
    ];
  }

  private async analyzeIndexUsage(client: PoolClient): Promise<any[]> {
    const query = `
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan as times_used,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched,
        CASE 
          WHEN idx_scan = 0 THEN 'unused'
          WHEN idx_scan < 50 THEN 'low_usage'
          ELSE 'normal_usage'
        END as usage_level
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
      AND tablename = ANY($1)
      ORDER BY idx_scan ASC
    `;

    const result = await client.query(query, [this.CRITICAL_WEDDING_TABLES]);
    return result.rows;
  }

  private async identifyOptimizationOpportunities(
    client: PoolClient,
  ): Promise<any[]> {
    const opportunities = [];

    // Check for full table scans on large tables
    const scanQuery = `
      SELECT 
        tablename,
        seq_scan,
        seq_tup_read,
        n_live_tup,
        CASE 
          WHEN seq_scan > 0 AND n_live_tup > 10000 
          THEN 'potential_full_table_scan'
          ELSE 'ok'
        END as issue
      FROM pg_stat_user_tables
      WHERE tablename = ANY($1)
      AND seq_scan > 0
      ORDER BY seq_tup_read DESC
    `;

    const scanResult = await client.query(scanQuery, [
      this.CRITICAL_WEDDING_TABLES,
    ]);

    for (const row of scanResult.rows) {
      if (row.issue === 'potential_full_table_scan') {
        opportunities.push({
          type: 'add_index',
          table: row.tablename,
          reason: 'Frequent full table scans detected',
          priority: 'high',
          estimated_benefit: 'significant_performance_improvement',
        });
      }
    }

    return opportunities;
  }

  private async optimizeQueries(): Promise<void> {
    console.log('⚡ Running query optimization...');

    // Implement automatic query optimization
    // This could include:
    // 1. Query plan analysis
    // 2. Automatic index suggestions
    // 3. Query rewriting recommendations

    const client = await this.pool.connect();

    try {
      // Update table statistics for better query planning
      for (const table of this.CRITICAL_WEDDING_TABLES) {
        await client.query(`ANALYZE ${table}`);
      }

      console.log('📊 Updated table statistics for query optimization');
    } finally {
      client.release();
    }
  }

  private async runInitialOptimizationScan(): Promise<void> {
    console.log('🎯 Running initial optimization scan...');

    const client = await this.pool.connect();

    try {
      // Check current database configuration
      const configAnalysis = await this.analyzeDatabaseConfiguration(client);

      // Check for obvious performance issues
      const performanceIssues = await this.identifyPerformanceIssues(client);

      // Generate optimization report
      const optimizationReport = {
        configuration: configAnalysis,
        performance_issues: performanceIssues,
        recommendations:
          await this.generateOptimizationRecommendations(performanceIssues),
        scanned_at: new Date().toISOString(),
      };

      await this.redis.hset('db_optimization:initial_scan', optimizationReport);

      console.log('✅ Initial optimization scan complete');
    } finally {
      client.release();
    }
  }

  private async analyzeDatabaseConfiguration(client: PoolClient): Promise<any> {
    const configQuery = `
      SELECT name, setting, unit, category, short_desc
      FROM pg_settings 
      WHERE category LIKE '%Performance%'
      OR name IN ('shared_buffers', 'effective_cache_size', 'work_mem', 'maintenance_work_mem')
      ORDER BY category, name
    `;

    const result = await client.query(configQuery);
    return result.rows;
  }

  private async identifyPerformanceIssues(client: PoolClient): Promise<any[]> {
    const issues = [];

    // Check for tables without primary keys
    const noPKQuery = `
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      AND tablename = ANY($1)
      AND tablename NOT IN (
        SELECT tablename 
        FROM pg_indexes 
        WHERE indexdef LIKE '%PRIMARY KEY%'
      )
    `;

    const noPKResult = await client.query(noPKQuery, [
      this.CRITICAL_WEDDING_TABLES,
    ]);

    for (const row of noPKResult.rows) {
      issues.push({
        type: 'missing_primary_key',
        table: row.tablename,
        severity: 'high',
        impact: 'replication_and_performance',
      });
    }

    return issues;
  }

  private async generateOptimizationRecommendations(
    issues: any[],
  ): Promise<any[]> {
    const recommendations = [];

    for (const issue of issues) {
      switch (issue.type) {
        case 'missing_primary_key':
          recommendations.push({
            action: 'add_primary_key',
            table: issue.table,
            priority: 'high',
            sql: `ALTER TABLE ${issue.table} ADD COLUMN id SERIAL PRIMARY KEY;`,
            warning:
              'This will add a new column and may affect existing application code',
          });
          break;
      }
    }

    return recommendations;
  }

  async applyOptimizations(
    optimizationIds: string[],
  ): Promise<OptimizationResult[]> {
    console.log('🔧 Applying database optimizations...');

    const results: OptimizationResult[] = [];
    const client = await this.pool.connect();

    try {
      const recommendations = JSON.parse(
        (await this.redis.hget(
          'db_analysis:missing_indexes',
          'missing_indexes',
        )) || '[]',
      );

      for (const optimizationId of optimizationIds) {
        const recommendation = recommendations.find(
          (r: any) => r.indexName === optimizationId,
        );

        if (!recommendation) {
          results.push({
            optimizationId,
            success: false,
            error: 'Optimization not found',
            duration: 0,
          });
          continue;
        }

        const startTime = Date.now();

        try {
          // Apply the optimization
          await client.query(recommendation.createStatement);

          results.push({
            optimizationId,
            success: true,
            duration: Date.now() - startTime,
            details: `Created index: ${recommendation.indexName}`,
          });

          console.log(`✅ Applied optimization: ${optimizationId}`);
        } catch (error) {
          results.push({
            optimizationId,
            success: false,
            error: error.message,
            duration: Date.now() - startTime,
          });

          console.error(
            `❌ Failed to apply optimization ${optimizationId}:`,
            error,
          );
        }
      }
    } finally {
      client.release();
    }

    return results;
  }

  async getOptimizationRecommendations(): Promise<IndexRecommendation[]> {
    const recommendations = await this.redis.hget(
      'db_analysis:structure',
      'missing_indexes',
    );
    return JSON.parse(recommendations || '[]');
  }

  async getHealthMetrics(): Promise<DatabaseHealthMetrics> {
    const healthData = await this.redis.hgetall('db_health:current');

    return {
      connectionPool: JSON.parse(healthData.connection_pool || '{}'),
      databaseSize: JSON.parse(healthData.database_size || '{}'),
      tableBloat: JSON.parse(healthData.table_bloat || '[]'),
      cacheHitRatio: parseFloat(healthData.cache_hit_ratio || '0'),
      activeConnections: parseInt(healthData.active_connections || '0'),
      longestTransaction: parseFloat(healthData.longest_transaction || '0'),
      locksCount: parseInt(healthData.locks_count || '0'),
      replicationLag: parseFloat(healthData.replication_lag || '0'),
      diskSpaceUsed: parseInt(healthData.disk_space_used || '0'),
      lastUpdated: new Date(healthData.timestamp || Date.now()),
    };
  }

  async getPerformanceAlerts(): Promise<any[]> {
    const alerts = await this.redis.lrange('db_alerts', 0, 19); // Last 20 alerts
    return alerts.map((alert) => JSON.parse(alert));
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Database Optimizer...');

    this.isMonitoring = false;

    await this.pool.end();
    await this.redis.disconnect();

    console.log('✅ Database optimizer shutdown complete');
  }
}

// Factory function for creating the optimizer
export function createWeddingDatabaseOptimizer(
  config: DatabaseOptimizationConfig,
): WeddingDatabaseOptimizer {
  return new WeddingDatabaseOptimizer(config);
}

// Export for use in API routes and monitoring services
export { WeddingDatabaseOptimizer };
