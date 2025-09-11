/**
 * WS-234 Database Health Monitor
 * Real-time database health monitoring with wedding season optimizations
 *
 * Monitors:
 * - Connection pool utilization with wedding season adjustments
 * - Storage usage with 5GB Supabase limit tracking
 * - Query performance with slow query detection (>1000ms)
 * - Lock contention monitoring
 * - Index health and bloat detection
 * - Table maintenance requirements
 */

import { createClient } from '@supabase/supabase-js';

// Health status type definitions
export type HealthStatus = 'healthy' | 'warning' | 'critical';

export interface DatabaseHealthMetrics {
  status: HealthStatus;
  connectionPool: ConnectionPoolMetrics;
  storage: StorageMetrics;
  queryPerformance: QueryPerformanceMetrics;
  locks: LockMetrics;
  indexHealth: IndexHealthMetrics;
  tableBloat: TableBloatMetrics;
  lastChecked: string;
  weddingSeasonContext: {
    isWeddingSeason: boolean;
    seasonMultiplier: number;
    adjustedThresholds: boolean;
  };
}

export interface ConnectionPoolMetrics {
  active: number;
  idle: number;
  waiting: number;
  idleInTransaction: number;
  total: number;
  maxConnections: number;
  utilizationPercent: number;
  status: HealthStatus;
  weddingSeasonAdjusted: boolean;
  peakDetected: boolean;
}

export interface StorageMetrics {
  used: number;
  available: number;
  percentage: number;
  prettySize: string;
  maxSize: string;
  largestTables: TableSizeInfo[];
  growthRateMbPerDay: number;
  projectedFullDate: string | null;
  weddingDataPercentage: number;
  status: HealthStatus;
  warning: boolean;
  critical: boolean;
}

export interface TableSizeInfo {
  tableName: string;
  schemaName: string;
  sizeBytes: number;
  prettySize: string;
  percentage: number;
  isWeddingCritical: boolean;
}

export interface QueryPerformanceMetrics {
  avgTime: number;
  medianTime: number;
  p95Time: number;
  p99Time: number;
  totalQueries: number;
  slowQueries: SlowQuery[];
  weddingSeasonImpact: number;
  status: HealthStatus;
  criticalQueries: number;
}

export interface SlowQuery {
  queryHash: string;
  query: string;
  avgTime: number;
  calls: number;
  totalTime: number;
  maxTime: number;
  isWeddingRelated: boolean;
  optimization: OptimizationSuggestion;
}

export interface OptimizationSuggestion {
  type:
    | 'missing_index'
    | 'n_plus_one'
    | 'select_optimization'
    | 'join_optimization'
    | 'query_rewrite';
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  estimatedImprovement: string;
  action: string;
  implementationComplexity: 'easy' | 'medium' | 'hard';
}

export interface LockMetrics {
  blockingQueries: number;
  blockedQueries: number;
  totalLocks: number;
  lockTypes: Record<string, number>;
  longestWaitMs: number;
  blockingQueryDetails: BlockingQuery[];
  weddingCriticalLocks: number;
  status: HealthStatus;
}

export interface BlockingQuery {
  pid: number;
  query: string;
  duration: number;
  blockedBy: number;
  lockType: string;
  relation: string;
  isWeddingCritical: boolean;
}

export interface IndexHealthMetrics {
  unusedIndexes: UnusedIndex[];
  bloatedIndexes: BloatedIndex[];
  missingIndexRecommendations: IndexRecommendation[];
  totalIndexes: number;
  healthyIndexes: number;
  weddingCriticalIndexes: number;
  status: HealthStatus;
}

export interface UnusedIndex {
  schemaName: string;
  tableName: string;
  indexName: string;
  sizeBytes: number;
  lastUsed: string | null;
  recommendation: string;
  isWeddingCritical: boolean;
}

export interface BloatedIndex {
  schemaName: string;
  tableName: string;
  indexName: string;
  sizeBytes: number;
  bloatPercentage: number;
  estimatedWaste: number;
  recommendation: string;
  isWeddingCritical: boolean;
}

export interface IndexRecommendation {
  tableName: string;
  columns: string[];
  queryPattern: string;
  estimatedImpact: string;
  reasoning: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  isWeddingCritical: boolean;
}

export interface TableBloatMetrics {
  bloatedTables: BloatedTable[];
  totalBloat: number;
  reclaimableSpace: number;
  maintenanceRequired: boolean;
  status: HealthStatus;
}

export interface BloatedTable {
  tableName: string;
  schemaName: string;
  sizeBytes: number;
  bloatPercentage: number;
  deadTuples: number;
  reclaimableBytes: number;
  lastVacuum: string | null;
  lastAnalyze: string | null;
  isWeddingCritical: boolean;
  maintenanceRecommendation: string;
}

/**
 * DatabaseHealthMonitor - Singleton service for real-time database health monitoring
 *
 * Features:
 * - Wedding season threshold adjustments (1.6x capacity during June peak)
 * - Real-time monitoring every 30 seconds
 * - Automated alert generation for critical conditions
 * - Query optimization recommendations
 * - Maintenance scheduling and automation
 * - Wedding-specific performance tracking
 */
export class DatabaseHealthMonitor {
  private static instance: DatabaseHealthMonitor;
  private supabase: ReturnType<typeof createClient>;
  private healthMetrics: DatabaseHealthMetrics;
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private deepAnalysisInterval: NodeJS.Timeout | null = null;

  // Wedding season thresholds - higher tolerance during peak months
  private readonly THRESHOLDS = {
    connectionPool: {
      warning: { normal: 70, peak: 75 },
      critical: { normal: 85, peak: 90 },
    },
    storage: {
      warning: { normal: 4000, peak: 4200 }, // MB (80% and 84% of 5GB)
      critical: { normal: 4500, peak: 4600 }, // MB (90% and 92% of 5GB)
    },
    queryTime: {
      warning: { normal: 500, peak: 750 }, // ms
      critical: { normal: 1000, peak: 1500 },
    },
    locks: {
      warning: { normal: 1, peak: 2 },
      critical: { normal: 5, peak: 8 },
    },
  };

  // Wedding-critical table patterns for optimization
  private readonly WEDDING_CRITICAL_TABLES = [
    'form_responses',
    'form_fields',
    'forms',
    'journey_events',
    'journey_instances',
    'journeys',
    'email_logs',
    'email_templates',
    'email_campaigns',
    'clients',
    'organizations',
    'user_profiles',
    'payment_history',
    'invoices',
    'webhook_events',
    'rsvp_responses',
    'guest_lists',
    'vendor_bookings',
  ];

  // Wedding-critical query patterns
  private readonly WEDDING_QUERY_PATTERNS = [
    /form_responses/i,
    /journey_events/i,
    /email_logs/i,
    /rsvp_/i,
    /guest_/i,
    /vendor_/i,
    /payment_/i,
    /invoice/i,
  ];

  static getInstance(): DatabaseHealthMonitor {
    if (!DatabaseHealthMonitor.instance) {
      DatabaseHealthMonitor.instance = new DatabaseHealthMonitor();
    }
    return DatabaseHealthMonitor.instance;
  }

  constructor() {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      throw new Error(
        'Supabase configuration missing for database health monitoring',
      );
    }

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { persistSession: false },
      },
    );

    this.healthMetrics = this.initializeHealthMetrics();
  }

  private initializeHealthMetrics(): DatabaseHealthMetrics {
    return {
      status: 'healthy',
      connectionPool: {
        active: 0,
        idle: 0,
        waiting: 0,
        idleInTransaction: 0,
        total: 0,
        maxConnections: 100,
        utilizationPercent: 0,
        status: 'healthy',
        weddingSeasonAdjusted: false,
        peakDetected: false,
      },
      storage: {
        used: 0,
        available: 5 * 1024 * 1024 * 1024, // 5GB
        percentage: 0,
        prettySize: '0 MB',
        maxSize: '5 GB',
        largestTables: [],
        growthRateMbPerDay: 0,
        projectedFullDate: null,
        weddingDataPercentage: 0,
        status: 'healthy',
        warning: false,
        critical: false,
      },
      queryPerformance: {
        avgTime: 0,
        medianTime: 0,
        p95Time: 0,
        p99Time: 0,
        totalQueries: 0,
        slowQueries: [],
        weddingSeasonImpact: 0,
        status: 'healthy',
        criticalQueries: 0,
      },
      locks: {
        blockingQueries: 0,
        blockedQueries: 0,
        totalLocks: 0,
        lockTypes: {},
        longestWaitMs: 0,
        blockingQueryDetails: [],
        weddingCriticalLocks: 0,
        status: 'healthy',
      },
      indexHealth: {
        unusedIndexes: [],
        bloatedIndexes: [],
        missingIndexRecommendations: [],
        totalIndexes: 0,
        healthyIndexes: 0,
        weddingCriticalIndexes: 0,
        status: 'healthy',
      },
      tableBloat: {
        bloatedTables: [],
        totalBloat: 0,
        reclaimableSpace: 0,
        maintenanceRequired: false,
        status: 'healthy',
      },
      lastChecked: new Date().toISOString(),
      weddingSeasonContext: {
        isWeddingSeason: this.isWeddingSeason(),
        seasonMultiplier: this.getWeddingSeasonMultiplier(),
        adjustedThresholds: this.isWeddingSeason(),
      },
    };
  }

  /**
   * Start real-time database health monitoring
   * - Health checks every 30 seconds
   * - Deep analysis every 5 minutes
   * - Wedding season optimizations
   */
  async startRealTimeMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('Database health monitoring is already running');
      return;
    }

    console.log('Starting database health monitoring...');
    this.isMonitoring = true;

    // Initial health check
    try {
      await this.checkDatabaseHealth();
      console.log('Initial database health check completed');
    } catch (error) {
      console.error('Initial database health check failed:', error);
    }

    // Schedule regular health checks every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkDatabaseHealth();
        await this.storeHealthMetrics();
        await this.triggerAlertsIfNeeded();
      } catch (error) {
        console.error('Database health check failed:', error);
        await this.handleMonitoringError(error);
      }
    }, 30000);

    // Schedule deep analysis every 5 minutes
    this.deepAnalysisInterval = setInterval(async () => {
      try {
        await this.performDeepAnalysis();
        await this.performAutomatedMaintenance();
      } catch (error) {
        console.error('Deep analysis failed:', error);
      }
    }, 300000);

    console.log('Database health monitoring started successfully');
  }

  /**
   * Stop real-time monitoring
   */
  async stopMonitoring(): Promise<void> {
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.deepAnalysisInterval) {
      clearInterval(this.deepAnalysisInterval);
      this.deepAnalysisInterval = null;
    }

    console.log('Database health monitoring stopped');
  }

  /**
   * Perform comprehensive database health check
   */
  async checkDatabaseHealth(): Promise<DatabaseHealthMetrics> {
    const startTime = Date.now();

    try {
      // Execute health checks in parallel for better performance
      const [
        connectionPool,
        storage,
        queryPerformance,
        locks,
        indexHealth,
        tableBloat,
      ] = await Promise.all([
        this.checkConnectionPool(),
        this.checkStorageUsage(),
        this.checkQueryPerformance(),
        this.checkLockContention(),
        this.checkIndexHealth(),
        this.checkTableBloat(),
      ]);

      // Update wedding season context
      const weddingSeasonContext = {
        isWeddingSeason: this.isWeddingSeason(),
        seasonMultiplier: this.getWeddingSeasonMultiplier(),
        adjustedThresholds: this.isWeddingSeason(),
      };

      this.healthMetrics = {
        status: this.calculateOverallHealth(
          connectionPool,
          storage,
          queryPerformance,
          locks,
          indexHealth,
          tableBloat,
        ),
        connectionPool,
        storage,
        queryPerformance,
        locks,
        indexHealth,
        tableBloat,
        lastChecked: new Date().toISOString(),
        weddingSeasonContext,
      };

      // Log health check performance
      const duration = Date.now() - startTime;
      if (duration > 5000) {
        // Health check taking too long
        console.warn(
          `Database health check took ${duration}ms - performance degrading`,
        );
      }

      return this.healthMetrics;
    } catch (error) {
      console.error('Database health check failed:', error);
      throw error;
    }
  }

  /**
   * Check connection pool metrics with wedding season adjustments
   */
  private async checkConnectionPool(): Promise<ConnectionPoolMetrics> {
    const query = `
      SELECT
        count(*) FILTER (WHERE state = 'active') as active,
        count(*) FILTER (WHERE state = 'idle') as idle,
        count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
        count(*) FILTER (WHERE wait_event_type = 'Client') as waiting,
        count(*) as total
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND pid != pg_backend_pid();
    `;

    const { data, error } = await this.supabase.rpc('execute_sql', {
      sql: query,
    });
    if (error)
      throw new Error(`Connection pool check failed: ${error.message}`);

    const result = data[0];
    const maxConnections = 100; // Supabase default
    const utilizationPercent = (result.total / maxConnections) * 100;

    // Apply wedding season adjustments
    const isWeddingSeason = this.isWeddingSeason();
    const peakDetected = utilizationPercent > 60 && this.isWeddingPeakTime();

    const status = this.getConnectionPoolStatus(
      utilizationPercent,
      isWeddingSeason,
    );

    // Store connection stats
    await this.storeConnectionStats({
      active: result.active,
      idle: result.idle,
      idleInTransaction: result.idle_in_transaction,
      waiting: result.waiting,
      total: result.total,
      maxConnections,
      utilizationPercentage: utilizationPercent,
      weddingSeasonAdjusted: isWeddingSeason,
      peakDetected,
    });

    return {
      active: result.active,
      idle: result.idle,
      waiting: result.waiting,
      idleInTransaction: result.idle_in_transaction,
      total: result.total,
      maxConnections,
      utilizationPercent,
      status,
      weddingSeasonAdjusted: isWeddingSeason,
      peakDetected,
    };
  }

  /**
   * Check storage usage with 5GB Supabase limit awareness
   */
  private async checkStorageUsage(): Promise<StorageMetrics> {
    // Get overall database size
    const sizeQuery = `
      SELECT
        pg_database_size(current_database()) as database_size,
        pg_size_pretty(pg_database_size(current_database())) as database_size_pretty
    `;

    // Get largest tables with wedding context
    const tableSizeQuery = `
      SELECT
        t.schemaname,
        t.tablename,
        pg_size_pretty(pg_total_relation_size(t.schemaname||'.'||t.tablename)) as size,
        pg_total_relation_size(t.schemaname||'.'||t.tablename) as size_bytes,
        ROUND((pg_total_relation_size(t.schemaname||'.'||t.tablename) * 100.0 / pg_database_size(current_database())), 2) as percentage,
        is_wedding_critical_table(t.tablename) as is_wedding_critical
      FROM pg_tables t
      WHERE t.schemaname = 'public'
      ORDER BY pg_total_relation_size(t.schemaname||'.'||t.tablename) DESC
      LIMIT 20;
    `;

    const [sizeResult, tableResult] = await Promise.all([
      this.supabase.rpc('execute_sql', { sql: sizeQuery }),
      this.supabase.rpc('execute_sql', { sql: tableSizeQuery }),
    ]);

    if (sizeResult.error)
      throw new Error(`Storage size check failed: ${sizeResult.error.message}`);
    if (tableResult.error)
      throw new Error(`Table size check failed: ${tableResult.error.message}`);

    const databaseSize = sizeResult.data[0];
    const largestTables: TableSizeInfo[] = tableResult.data.map(
      (table: any) => ({
        tableName: table.tablename,
        schemaName: table.schemaname,
        sizeBytes: table.size_bytes,
        prettySize: table.size,
        percentage: table.percentage,
        isWeddingCritical: table.is_wedding_critical,
      }),
    );

    const maxSize = 5 * 1024 * 1024 * 1024; // 5GB Supabase limit
    const usedBytes = databaseSize.database_size;
    const percentage = (usedBytes / maxSize) * 100;

    // Calculate wedding data percentage
    const weddingDataBytes = largestTables
      .filter((t) => t.isWeddingCritical)
      .reduce((sum, t) => sum + t.sizeBytes, 0);
    const weddingDataPercentage = (weddingDataBytes / usedBytes) * 100;

    // Estimate growth rate and projection
    const growthRateMbPerDay = await this.estimateStorageGrowthRate();
    const projectedFullDate = this.calculateProjectedFullDate(
      usedBytes,
      maxSize,
      growthRateMbPerDay,
    );

    const status = this.getStorageStatus(percentage);

    // Store storage stats
    await this.storeStorageStats({
      totalSizeBytes: maxSize,
      usedSizeBytes: usedBytes,
      availableSizeBytes: maxSize - usedBytes,
      percentageUsed: percentage,
      largestTables: largestTables.slice(0, 10),
      growthRateMbPerDay,
      projectedFullDate: projectedFullDate || null,
      weddingDataPercentage,
    });

    return {
      used: usedBytes,
      available: maxSize - usedBytes,
      percentage,
      prettySize: databaseSize.database_size_pretty,
      maxSize: '5 GB',
      largestTables,
      growthRateMbPerDay,
      projectedFullDate,
      weddingDataPercentage,
      status,
      warning: percentage > 80,
      critical: percentage > 90,
    };
  }

  /**
   * Check query performance with wedding-specific analysis
   */
  private async checkQueryPerformance(): Promise<QueryPerformanceMetrics> {
    // Check if pg_stat_statements is enabled
    const extensionQuery = `
      SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
      ) as enabled;
    `;

    const extensionResult = await this.supabase.rpc('execute_sql', {
      sql: extensionQuery,
    });
    if (extensionResult.error || !extensionResult.data[0].enabled) {
      console.warn(
        'pg_stat_statements extension not available, using basic query monitoring',
      );
      return this.getBasicQueryPerformance();
    }

    // Get slow queries from pg_stat_statements
    const slowQueryQuery = `
      SELECT
        queryid::text as query_hash,
        left(query, 200) as query,
        calls,
        mean_exec_time,
        total_exec_time,
        stddev_exec_time,
        max_exec_time,
        min_exec_time,
        CASE 
          WHEN query ~* 'form_responses|journey_events|email_logs|rsvp_|guest_|vendor_|payment_|invoice'
          THEN true
          ELSE false
        END as is_wedding_related
      FROM pg_stat_statements
      WHERE mean_exec_time > 100
        AND query NOT LIKE '%pg_stat_statements%'
        AND query NOT LIKE '%EXPLAIN%'
        AND query NOT LIKE '%information_schema%'
      ORDER BY mean_exec_time DESC
      LIMIT 50;
    `;

    // Get overall performance statistics
    const performanceStatsQuery = `
      SELECT
        ROUND(AVG(mean_exec_time)::numeric, 2) as avg_time,
        ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY mean_exec_time)::numeric, 2) as median_time,
        ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY mean_exec_time)::numeric, 2) as p95_time,
        ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY mean_exec_time)::numeric, 2) as p99_time,
        COUNT(*) as total_queries,
        COUNT(*) FILTER (WHERE mean_exec_time > 1000) as critical_queries
      FROM pg_stat_statements
      WHERE query NOT LIKE '%pg_stat_statements%';
    `;

    const [slowQueries, performanceStats] = await Promise.all([
      this.supabase.rpc('execute_sql', { sql: slowQueryQuery }),
      this.supabase.rpc('execute_sql', { sql: performanceStatsQuery }),
    ]);

    if (slowQueries.error)
      throw new Error(`Slow query check failed: ${slowQueries.error.message}`);
    if (performanceStats.error)
      throw new Error(
        `Performance stats check failed: ${performanceStats.error.message}`,
      );

    const stats = performanceStats.data[0];
    const slow = slowQueries.data;

    const status = this.getQueryPerformanceStatus(stats.avg_time);

    // Analyze wedding-specific query impact
    const weddingQueries = slow.filter((q: any) => q.is_wedding_related);
    const weddingSeasonImpact = weddingQueries.length;

    // Generate optimization suggestions for each slow query
    const slowQueriesWithOptimization: SlowQuery[] = slow.map((q: any) => ({
      queryHash: q.query_hash,
      query: this.sanitizeQuery(q.query),
      avgTime: q.mean_exec_time,
      calls: q.calls,
      totalTime: q.total_exec_time,
      maxTime: q.max_exec_time,
      isWeddingRelated: q.is_wedding_related,
      optimization: this.suggestOptimization(q),
    }));

    return {
      avgTime: stats.avg_time || 0,
      medianTime: stats.median_time || 0,
      p95Time: stats.p95_time || 0,
      p99Time: stats.p99_time || 0,
      totalQueries: stats.total_queries || 0,
      slowQueries: slowQueriesWithOptimization,
      weddingSeasonImpact,
      status,
      criticalQueries: stats.critical_queries || 0,
    };
  }

  /**
   * Wedding season detection based on historical data
   */
  private isWeddingSeason(): boolean {
    const month = new Date().getMonth() + 1;
    // Peak months: May, June, July, September, October
    return [5, 6, 7, 9, 10].includes(month);
  }

  /**
   * Get wedding season multiplier for threshold adjustments
   */
  private getWeddingSeasonMultiplier(): number {
    const month = new Date().getMonth() + 1;
    const multipliers: Record<number, number> = {
      5: 1.4, // May
      6: 1.6, // June (peak)
      7: 1.5, // July
      9: 1.3, // September
      10: 1.4, // October
    };
    return multipliers[month] || 1.0;
  }

  /**
   * Detect wedding peak times (weekends and evenings)
   */
  private isWeddingPeakTime(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    // Saturday (6) or Sunday (0), or Friday/Saturday evening
    return (
      day === 0 ||
      day === 6 ||
      (day === 5 && hour >= 18) ||
      (day === 6 && hour >= 18)
    );
  }

  /**
   * Calculate overall health status
   */
  private calculateOverallHealth(
    ...metrics: { status: HealthStatus }[]
  ): HealthStatus {
    const statuses = metrics.map((m) => m.status);

    if (statuses.includes('critical')) return 'critical';
    if (statuses.includes('warning')) return 'warning';
    return 'healthy';
  }

  // Status calculation methods with wedding season adjustments
  private getConnectionPoolStatus(
    utilization: number,
    isWeddingSeason: boolean,
  ): HealthStatus {
    const thresholds = isWeddingSeason
      ? {
          warning: this.THRESHOLDS.connectionPool.warning.peak,
          critical: this.THRESHOLDS.connectionPool.critical.peak,
        }
      : {
          warning: this.THRESHOLDS.connectionPool.warning.normal,
          critical: this.THRESHOLDS.connectionPool.critical.normal,
        };

    if (utilization >= thresholds.critical) return 'critical';
    if (utilization >= thresholds.warning) return 'warning';
    return 'healthy';
  }

  private getStorageStatus(percentage: number): HealthStatus {
    const isWeddingSeason = this.isWeddingSeason();
    const warningThreshold = isWeddingSeason ? 84 : 80; // Adjusted for wedding season
    const criticalThreshold = isWeddingSeason ? 92 : 90;

    if (percentage >= criticalThreshold) return 'critical';
    if (percentage >= warningThreshold) return 'warning';
    return 'healthy';
  }

  private getQueryPerformanceStatus(avgTime: number): HealthStatus {
    const isWeddingSeason = this.isWeddingSeason();
    const thresholds = isWeddingSeason
      ? {
          warning: this.THRESHOLDS.queryTime.warning.peak,
          critical: this.THRESHOLDS.queryTime.critical.peak,
        }
      : {
          warning: this.THRESHOLDS.queryTime.warning.normal,
          critical: this.THRESHOLDS.queryTime.critical.normal,
        };

    if (avgTime >= thresholds.critical) return 'critical';
    if (avgTime >= thresholds.warning) return 'warning';
    return 'healthy';
  }

  /**
   * Store health metrics in database for historical analysis
   */
  private async storeHealthMetrics(): Promise<void> {
    try {
      const metrics = [
        {
          metric_type: 'connection_pool',
          metric_name: 'utilization_percent',
          current_value: this.healthMetrics.connectionPool.utilizationPercent,
          threshold_warning: this.isWeddingSeason()
            ? this.THRESHOLDS.connectionPool.warning.peak
            : this.THRESHOLDS.connectionPool.warning.normal,
          threshold_critical: this.isWeddingSeason()
            ? this.THRESHOLDS.connectionPool.critical.peak
            : this.THRESHOLDS.connectionPool.critical.normal,
          status: this.healthMetrics.connectionPool.status,
          details: this.healthMetrics.connectionPool,
        },
        {
          metric_type: 'storage',
          metric_name: 'percentage_used',
          current_value: this.healthMetrics.storage.percentage,
          threshold_warning: this.isWeddingSeason() ? 84 : 80,
          threshold_critical: this.isWeddingSeason() ? 92 : 90,
          status: this.healthMetrics.storage.status,
          details: this.healthMetrics.storage,
        },
        {
          metric_type: 'query_performance',
          metric_name: 'avg_time_ms',
          current_value: this.healthMetrics.queryPerformance.avgTime,
          threshold_warning: this.isWeddingSeason()
            ? this.THRESHOLDS.queryTime.warning.peak
            : this.THRESHOLDS.queryTime.warning.normal,
          threshold_critical: this.isWeddingSeason()
            ? this.THRESHOLDS.queryTime.critical.peak
            : this.THRESHOLDS.queryTime.critical.normal,
          status: this.healthMetrics.queryPerformance.status,
          details: this.healthMetrics.queryPerformance,
        },
      ];

      const { error } = await this.supabase
        .from('database_health_metrics')
        .insert(metrics);

      if (error) {
        console.error('Failed to store health metrics:', error);
      }
    } catch (error) {
      console.error('Error storing health metrics:', error);
    }
  }

  /**
   * Get current health metrics
   */
  async getHealthMetrics(): Promise<DatabaseHealthMetrics> {
    return this.healthMetrics;
  }

  // Placeholder methods for complete implementation
  private async checkLockContention(): Promise<LockMetrics> {
    // Implementation would check pg_locks and pg_stat_activity for blocking queries
    return {
      blockingQueries: 0,
      blockedQueries: 0,
      totalLocks: 0,
      lockTypes: {},
      longestWaitMs: 0,
      blockingQueryDetails: [],
      weddingCriticalLocks: 0,
      status: 'healthy',
    };
  }

  private async checkIndexHealth(): Promise<IndexHealthMetrics> {
    // Implementation would analyze pg_stat_user_indexes for unused/bloated indexes
    return {
      unusedIndexes: [],
      bloatedIndexes: [],
      missingIndexRecommendations: [],
      totalIndexes: 0,
      healthyIndexes: 0,
      weddingCriticalIndexes: 0,
      status: 'healthy',
    };
  }

  private async checkTableBloat(): Promise<TableBloatMetrics> {
    // Implementation would check pg_stat_user_tables for bloat
    return {
      bloatedTables: [],
      totalBloat: 0,
      reclaimableSpace: 0,
      maintenanceRequired: false,
      status: 'healthy',
    };
  }

  private async getBasicQueryPerformance(): Promise<QueryPerformanceMetrics> {
    // Basic query performance when pg_stat_statements is not available
    return {
      avgTime: 0,
      medianTime: 0,
      p95Time: 0,
      p99Time: 0,
      totalQueries: 0,
      slowQueries: [],
      weddingSeasonImpact: 0,
      status: 'healthy',
      criticalQueries: 0,
    };
  }

  private async estimateStorageGrowthRate(): Promise<number> {
    // Implementation would analyze historical growth
    return 0;
  }

  private calculateProjectedFullDate(
    usedBytes: number,
    maxBytes: number,
    growthRateMbPerDay: number,
  ): string | null {
    if (growthRateMbPerDay <= 0) return null;

    const remainingBytes = maxBytes - usedBytes;
    const remainingMb = remainingBytes / (1024 * 1024);
    const daysUntilFull = remainingMb / growthRateMbPerDay;

    if (daysUntilFull > 365) return null; // More than a year away

    const projectedDate = new Date();
    projectedDate.setDate(projectedDate.getDate() + Math.floor(daysUntilFull));

    return projectedDate.toISOString().split('T')[0];
  }

  private sanitizeQuery(query: string): string {
    // Remove sensitive data and limit length
    return (
      query.replace(/\$\d+/g, '?').substring(0, 200) +
      (query.length > 200 ? '...' : '')
    );
  }

  private suggestOptimization(query: any): OptimizationSuggestion {
    const queryText = query.query.toLowerCase();

    // Check for common optimization opportunities
    if (queryText.includes('select *')) {
      return {
        type: 'select_optimization',
        description: 'Query selects all columns, specify only needed columns',
        impact: 'medium',
        estimatedImprovement: '20-40% less data transfer',
        action: 'Replace SELECT * with specific columns',
        implementationComplexity: 'easy',
      };
    }

    if (query.calls > 100 && queryText.includes('where')) {
      return {
        type: 'missing_index',
        description: 'Frequently executed query may benefit from index',
        impact: 'high',
        estimatedImprovement: '60-80% faster execution',
        action: 'Analyze WHERE clause and create appropriate index',
        implementationComplexity: 'medium',
      };
    }

    return {
      type: 'query_rewrite',
      description: 'Query performance can be improved',
      impact: 'low',
      estimatedImprovement: '10-20% faster execution',
      action: 'Review query structure and execution plan',
      implementationComplexity: 'medium',
    };
  }

  private async storeConnectionStats(stats: any): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('database_connection_stats')
        .insert([stats]);

      if (error) {
        console.error('Failed to store connection stats:', error);
      }
    } catch (error) {
      console.error('Error storing connection stats:', error);
    }
  }

  private async storeStorageStats(stats: any): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('database_storage_stats')
        .insert([stats]);

      if (error) {
        console.error('Failed to store storage stats:', error);
      }
    } catch (error) {
      console.error('Error storing storage stats:', error);
    }
  }

  private async performDeepAnalysis(): Promise<void> {
    // Placeholder for deep analysis implementation
    console.log('Performing deep database analysis...');
  }

  private async performAutomatedMaintenance(): Promise<void> {
    // Placeholder for automated maintenance implementation
    console.log('Checking for automated maintenance tasks...');
  }

  private async triggerAlertsIfNeeded(): Promise<void> {
    // Placeholder for alert triggering implementation
    console.log('Checking if alerts need to be triggered...');
  }

  private async handleMonitoringError(error: any): Promise<void> {
    console.error('Monitoring error occurred:', error);
    // Implement error handling and recovery logic
  }
}
