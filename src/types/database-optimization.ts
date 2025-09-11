/**
 * WS-333 Team B: Database Optimization Type Definitions
 * Comprehensive TypeScript interfaces for PostgreSQL performance optimization
 */

// Database optimization configuration
export interface DatabaseOptimizationConfig {
  dbHost: string;
  dbPort: number;
  dbName: string;
  dbUser: string;
  dbPassword: string;
  maxConnections: number;
  redisHost: string;
  redisPort: number;
  enableMonitoring: boolean;
  optimizationLevel: 'conservative' | 'aggressive' | 'wedding_optimized';
  weddingSpecificOptimizations: boolean;
}

// Query performance metrics
export interface QueryPerformanceMetrics {
  queryId: string;
  queryText: string;
  executionCount: number;
  totalExecutionTime: number;
  avgExecutionTime: number;
  p95ExecutionTime: number;
  p99ExecutionTime: number;
  rowsScanned: number;
  rowsReturned: number;
  indexesUsed: string[];
  cacheHitRatio: number;
  lastExecuted: Date;
}

// Index recommendation
export interface IndexRecommendation {
  tableName: string;
  indexName: string;
  indexType: 'btree' | 'hash' | 'gin' | 'gist' | 'sp_gist' | 'brin';
  columns: string[];
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedBenefit: 'low' | 'medium' | 'high' | 'significant';
  weddingSpecific: boolean;
  createStatement: string;
  estimatedSize?: string;
  maintenanceCost?: 'low' | 'medium' | 'high';
  partialCondition?: string; // For partial indexes
}

// Query execution plan
export interface QueryPlan {
  planId: string;
  query: string;
  executionPlan: any; // PostgreSQL EXPLAIN output
  totalCost: number;
  startupCost: number;
  planRows: number;
  planWidth: number;
  actualTime: number;
  actualRows: number;
  actualLoops: number;
  indexScans: number;
  seqScans: number;
  joinOperations: any[];
  sortOperations: any[];
  aggregateOperations: any[];
}

// Database health metrics
export interface DatabaseHealthMetrics {
  connectionPool: {
    total_connections: number;
    idle_connections: number;
    waiting_connections: number;
  };
  databaseSize: {
    database_size: string;
    database_size_bytes: number;
  };
  tableBloat: Array<{
    tablename: string;
    n_dead_tup: number;
    n_live_tup: number;
    bloat_ratio: number;
  }>;
  cacheHitRatio: number;
  activeConnections: number;
  longestTransaction: number;
  locksCount: number;
  replicationLag: number;
  diskSpaceUsed: number;
  lastUpdated: Date;
}

// Performance baseline for query patterns
export interface PerformanceBaseline {
  queryPattern: string;
  avgExecutionTime: number;
  p95ExecutionTime: number;
  avgRowsScanned: number;
  cacheHitRate: number;
  lastUpdated: Date;
  sampleCount: number;
}

// Optimization result
export interface OptimizationResult {
  optimizationId: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: string;
  beforeMetrics?: QueryPerformanceMetrics;
  afterMetrics?: QueryPerformanceMetrics;
  performanceImprovement?: number; // Percentage improvement
}

// Cron schedule analysis
export interface CronScheduleAnalysis {
  isDailyReport: boolean;
  isWeeklyReport: boolean;
  isMonthlyReport: boolean;
  isBusinessCritical: boolean;
  executionFrequency: number;
  peakSeasonImpact: boolean;
  estimatedProcessingLoad: 'low' | 'medium' | 'high';
}

// Schedule metrics
export interface ScheduleMetrics {
  totalSchedules: number;
  activeSchedules: number;
  queuedJobs: number;
  processingJobs: number;
  completedToday: number;
  failedToday: number;
  avgProcessingTime: number;
  lastExecutionTime: Date;
}

// Database table statistics
export interface TableStatistics {
  schemaname: string;
  tablename: string;
  inserts: number;
  updates: number;
  deletes: number;
  live_tuples: number;
  dead_tuples: number;
  last_vacuum: Date | null;
  last_autovacuum: Date | null;
  last_analyze: Date | null;
  last_autoanalyze: Date | null;
  sequential_scans: number;
  sequential_tuples_read: number;
  index_scans: number;
  index_tuples_fetched: number;
}

// Index usage statistics
export interface IndexUsageStatistics {
  schemaname: string;
  tablename: string;
  indexname: string;
  indexdef: string;
  index_size: string;
  times_used: number;
  tuples_read: number;
  tuples_fetched: number;
  usage_level: 'unused' | 'low_usage' | 'normal_usage' | 'high_usage';
}

// Lock analysis
export interface LockAnalysis {
  locktype: string;
  database: string;
  relation: string;
  mode: string;
  granted: boolean;
  state: string;
  query: string;
  query_start: Date;
  duration: number;
}

// Slow query analysis
export interface SlowQueryAnalysis {
  query: string;
  calls: number;
  total_time: number;
  mean_time: number;
  rows: number;
  hit_percent: number;
  classification: 'critical' | 'high' | 'medium' | 'low';
  wedding_related: boolean;
  optimization_suggestions: string[];
}

// Database configuration item
export interface DatabaseConfigItem {
  name: string;
  setting: string;
  unit: string | null;
  category: string;
  short_desc: string;
  context:
    | 'internal'
    | 'postmaster'
    | 'sighup'
    | 'backend'
    | 'superuser'
    | 'user';
  vartype: 'bool' | 'enum' | 'integer' | 'real' | 'string';
  source: string;
  min_val: string | null;
  max_val: string | null;
  enumvals: string[] | null;
  boot_val: string;
  reset_val: string;
  sourcefile: string | null;
  sourceline: number | null;
}

// Performance alert
export interface PerformanceAlert {
  alertId: string;
  type:
    | 'low_cache_hit_ratio'
    | 'high_connection_pool_usage'
    | 'long_running_transaction'
    | 'high_table_bloat'
    | 'slow_query'
    | 'lock_contention';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  data: Record<string, any>;
  threshold: number;
  current_value: number;
  impact: 'performance' | 'availability' | 'data_integrity';
  affected_tables?: string[];
  affected_queries?: string[];
  recommendations: string[];
  created_at: Date;
  resolved_at?: Date;
  acknowledged: boolean;
}

// Optimization strategy
export interface OptimizationStrategy {
  strategyId: string;
  name: string;
  description: string;
  targetTables: string[];
  optimizationType:
    | 'index'
    | 'query_rewrite'
    | 'partitioning'
    | 'archiving'
    | 'configuration';
  priority: number;
  estimatedImpact: 'low' | 'medium' | 'high' | 'critical';
  implementationComplexity: 'simple' | 'moderate' | 'complex';
  riskLevel: 'low' | 'medium' | 'high';
  rollbackPlan: string;
  prerequisites: string[];
  steps: OptimizationStep[];
  weddingIndustrySpecific: boolean;
}

// Individual optimization step
export interface OptimizationStep {
  stepId: string;
  description: string;
  sqlStatements: string[];
  validationQueries: string[];
  rollbackStatements: string[];
  estimatedDuration: number; // in minutes
  canRunConcurrently: boolean;
  requiresMaintenanceWindow: boolean;
}

// Wedding-specific query pattern
export interface WeddingQueryPattern {
  patternId: string;
  name: string;
  description: string;
  queryRegex: RegExp;
  commonTables: string[];
  seasonalVariation: boolean;
  weekendBias: boolean;
  typicalExecutionTime: number;
  optimizationPriority: 'low' | 'medium' | 'high' | 'critical';
  recommendedIndexes: IndexRecommendation[];
  queryRewriteSuggestions?: string[];
}

// Performance benchmark
export interface PerformanceBenchmark {
  benchmarkId: string;
  name: string;
  description: string;
  category:
    | 'query_performance'
    | 'throughput'
    | 'concurrency'
    | 'resource_usage';
  metrics: BenchmarkMetric[];
  baseline: BenchmarkResult;
  target: BenchmarkResult;
  weddingIndustryStandard: BenchmarkResult;
  lastRunDate: Date;
  runHistory: BenchmarkResult[];
}

// Individual benchmark metric
export interface BenchmarkMetric {
  metricName: string;
  unit: string;
  description: string;
  higherIsBetter: boolean;
  criticalThreshold: number;
  warningThreshold: number;
}

// Benchmark run result
export interface BenchmarkResult {
  runId: string;
  runDate: Date;
  environment: 'development' | 'staging' | 'production';
  metrics: Record<string, number>;
  overallScore: number;
  passed: boolean;
  notes?: string;
  systemInfo: {
    cpu_cores: number;
    memory_gb: number;
    disk_type: string;
    postgres_version: string;
  };
}

// Connection pool monitoring
export interface ConnectionPoolMetrics {
  poolName: string;
  totalConnections: number;
  idleConnections: number;
  activeConnections: number;
  waitingClients: number;
  maxConnections: number;
  connectionUtilization: number; // percentage
  avgConnectionAge: number; // in milliseconds
  avgWaitTime: number; // in milliseconds
  connectionErrors: number;
  connectionTimeouts: number;
  lastUpdated: Date;
}

// Vacuum and analyze statistics
export interface MaintenanceStatistics {
  tablename: string;
  last_vacuum: Date | null;
  last_autovacuum: Date | null;
  vacuum_count: number;
  autovacuum_count: number;
  last_analyze: Date | null;
  last_autoanalyze: Date | null;
  analyze_count: number;
  autoanalyze_count: number;
  dead_tuple_ratio: number;
  bloat_estimate: number; // percentage
  recommended_maintenance:
    | 'none'
    | 'analyze'
    | 'vacuum'
    | 'vacuum_full'
    | 'reindex';
  maintenance_urgency: 'low' | 'medium' | 'high' | 'critical';
}

// Replication monitoring (for read replicas)
export interface ReplicationMetrics {
  replicaName: string;
  replicaHost: string;
  replicationState: 'streaming' | 'catchup' | 'stopped' | 'error';
  lagBytes: number;
  lagTime: number; // in seconds
  lastReceived: Date;
  lastReplayed: Date;
  syncState: 'sync' | 'async' | 'potential';
  healthStatus: 'healthy' | 'warning' | 'critical';
}

// Wedding season optimization settings
export interface WeddingSeasonOptimization {
  enabled: boolean;
  peakSeasonMonths: number[]; // 1-12 (January = 1)
  peakSeasonConnectionMultiplier: number;
  peakSeasonCacheSize: number; // in MB
  peakSeasonWorkMem: number; // in MB
  weekendOptimizations: {
    enabled: boolean;
    saturdayBoost: number; // multiplier for Saturday performance
    sundayBoost: number; // multiplier for Sunday performance
  };
  automaticScaling: {
    enabled: boolean;
    scaleUpThreshold: number; // system load percentage
    scaleDownThreshold: number; // system load percentage
    maxScalingFactor: number;
  };
}

// Resource usage monitoring
export interface ResourceUsageMetrics {
  cpu: {
    usage_percent: number;
    load_average: number[];
    cores: number;
  };
  memory: {
    total_gb: number;
    used_gb: number;
    free_gb: number;
    cached_gb: number;
    usage_percent: number;
    swap_used_gb: number;
  };
  disk: {
    total_gb: number;
    used_gb: number;
    free_gb: number;
    usage_percent: number;
    read_iops: number;
    write_iops: number;
    read_throughput_mb: number;
    write_throughput_mb: number;
  };
  network: {
    bytes_sent: number;
    bytes_received: number;
    packets_sent: number;
    packets_received: number;
    errors: number;
    drops: number;
  };
  timestamp: Date;
}

// Export all types for use throughout the application
export type {
  DatabaseOptimizationConfig,
  QueryPerformanceMetrics,
  IndexRecommendation,
  QueryPlan,
  DatabaseHealthMetrics,
  PerformanceBaseline,
  OptimizationResult,
  CronScheduleAnalysis,
  ScheduleMetrics,
  TableStatistics,
  IndexUsageStatistics,
  LockAnalysis,
  SlowQueryAnalysis,
  DatabaseConfigItem,
  PerformanceAlert,
  OptimizationStrategy,
  OptimizationStep,
  WeddingQueryPattern,
  PerformanceBenchmark,
  BenchmarkMetric,
  BenchmarkResult,
  ConnectionPoolMetrics,
  MaintenanceStatistics,
  ReplicationMetrics,
  WeddingSeasonOptimization,
  ResourceUsageMetrics,
};
