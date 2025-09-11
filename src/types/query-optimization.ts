/**
 * WS-333 Team B: Query Optimization Type Definitions
 * Wedding-specific query optimization interfaces and types
 * Focused on high-performance data processing for wedding industry patterns
 */

import { z } from 'zod';

// ===== QUERY OPTIMIZATION CORE TYPES =====

export interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  connection: DatabaseConnection;
  schema: string;
  tables: TableReference[];
  weddingOptimizations: WeddingDataOptimization[];
  indexStrategy: IndexStrategy;
}

export interface TableReference {
  tableName: string;
  alias?: string;
  primaryKey: string;
  foreignKeys: ForeignKeyReference[];
  partitioning: PartitioningStrategy;
  weddingSpecific: boolean;
  estimatedRows: number;
  indexHints: IndexHint[];
}

export interface WeddingDataOptimization {
  optimization_type:
    | 'seasonal_partitioning'
    | 'weekend_materialized_view'
    | 'supplier_clustering'
    | 'date_indexing';
  description: string;
  performance_impact: number;
  implementation_cost: number;
  maintenance_required: boolean;
}

// ===== METRIC DEFINITIONS =====

export interface MetricDefinition {
  name: string;
  expression: string;
  aggregationType: AggregationType;
  dataType: MetricDataType;
  weddingContext: WeddingMetricContext;
  seasonalWeighting: SeasonalWeighting;
  performanceHint: PerformanceHint;
}

export interface WeddingMetricContext {
  applies_to_suppliers: WeddingSupplierType[];
  seasonal_relevance: WeddingSeason[];
  wedding_size_relevance: WeddingSizeCategory[];
  venue_type_relevance: VenueType[];
  calculation_complexity: MetricComplexity;
}

export interface SeasonalWeighting {
  spring_weight: number;
  summer_weight: number;
  fall_weight: number;
  winter_weight: number;
  weekend_boost: number;
  peak_season_multiplier: number;
}

export interface PerformanceHint {
  cache_recommended: boolean;
  cache_ttl: number;
  pre_aggregation_candidate: boolean;
  real_time_suitable: boolean;
  batch_processing_required: boolean;
  memory_intensive: boolean;
}

// ===== FILTER CRITERIA =====

export interface FilterCriteria {
  field: string;
  operator: FilterOperator;
  value: any;
  valueType: FilterValueType;
  weddingContext?: WeddingFilterContext;
  performanceImpact: PerformanceImpact;
  indexSupport: IndexSupport;
}

export interface WeddingFilterContext {
  seasonal_optimization: boolean;
  weekend_priority: boolean;
  supplier_specific: boolean;
  venue_dependent: boolean;
  budget_sensitive: boolean;
  geographical_relevant: boolean;
}

export interface IndexSupport {
  has_index: boolean;
  index_name?: string;
  index_type: IndexType;
  selectivity: number;
  cardinality: number;
  maintenance_cost: IndexMaintenanceCost;
}

// ===== QUERY JOINS =====

export interface QueryJoin {
  type: JoinType;
  leftTable: TableReference;
  rightTable: TableReference;
  conditions: JoinCondition[];
  weddingOptimization: WeddingJoinOptimization;
  estimatedCost: QueryCost;
}

export interface WeddingJoinOptimization {
  supplier_join_optimization: boolean;
  seasonal_data_optimization: boolean;
  client_wedding_optimization: boolean;
  venue_booking_optimization: boolean;
  use_materialized_view: boolean;
  materialized_view_name?: string;
}

export interface JoinCondition {
  leftField: string;
  operator: JoinOperator;
  rightField: string;
  indexAvailable: boolean;
  selectivity: number;
}

export interface QueryCost {
  estimated_rows: number;
  estimated_time_ms: number;
  memory_required_mb: number;
  cpu_intensity: CpuIntensity;
  io_operations: number;
}

// ===== QUERY AGGREGATIONS =====

export interface QueryAggregation {
  function: AggregationFunction;
  field: string;
  alias: string;
  groupBy: string[];
  having?: HavingCondition[];
  weddingSpecific: WeddingAggregationContext;
  optimizationStrategy: AggregationOptimization;
}

export interface WeddingAggregationContext {
  seasonal_aggregation: boolean;
  supplier_grouping: boolean;
  revenue_calculation: boolean;
  satisfaction_scoring: boolean;
  booking_analysis: boolean;
  performance_metrics: boolean;
}

export interface AggregationOptimization {
  use_pre_calculated: boolean;
  pre_calc_table?: string;
  incremental_update: boolean;
  cache_result: boolean;
  parallel_processing: boolean;
  approximation_acceptable: boolean;
}

// ===== SAMPLING STRATEGIES =====

export interface SamplingStrategy {
  type: SamplingType;
  sampleSize: number;
  sampleUnit: SampleUnit;
  stratification: StratificationCriteria;
  weddingRepresentativeness: WeddingSampleRepresentativeness;
  biasCorrection: BiasCorrection;
}

export interface WeddingSampleRepresentativeness {
  seasonal_balance: boolean;
  supplier_type_balance: boolean;
  geographical_coverage: boolean;
  wedding_size_distribution: boolean;
  venue_type_coverage: boolean;
  budget_range_coverage: boolean;
}

export interface StratificationCriteria {
  stratify_by_season: boolean;
  stratify_by_supplier: boolean;
  stratify_by_venue_type: boolean;
  stratify_by_wedding_size: boolean;
  stratify_by_geography: boolean;
  minimum_per_stratum: number;
}

export interface BiasCorrection {
  seasonal_bias_correction: boolean;
  weekend_bias_correction: boolean;
  supplier_size_bias_correction: boolean;
  geographical_bias_correction: boolean;
  correction_weights: CorrectionWeight[];
}

export interface CorrectionWeight {
  factor: string;
  weight: number;
  confidence_interval: number;
  statistical_significance: number;
}

// ===== DATABASE CONNECTION =====

export interface DatabaseConnection {
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  schema: string;
  connectionPool: ConnectionPoolConfig;
  optimization: DatabaseOptimizationConfig;
  weddingIndexes: WeddingIndexConfiguration;
}

export interface ConnectionPoolConfig {
  minConnections: number;
  maxConnections: number;
  idleTimeout: number;
  connectionTimeout: number;
  weddingSeasonScaling: boolean;
  peakSeasonMultiplier: number;
}

export interface DatabaseOptimizationConfig {
  queryTimeout: number;
  maxRowsPerQuery: number;
  enableQueryCache: boolean;
  enableWeddingOptimizations: boolean;
  parallelWorkers: number;
  memoryLimit: string;
}

export interface WeddingIndexConfiguration {
  wedding_date_composite_index: boolean;
  supplier_performance_index: boolean;
  seasonal_partitioning_index: boolean;
  weekend_wedding_index: boolean;
  venue_type_clustering_index: boolean;
  budget_range_index: boolean;
  geographical_spatial_index: boolean;
}

// ===== PARTITIONING STRATEGIES =====

export interface PartitioningStrategy {
  type: PartitionType;
  partitionKey: string;
  partitionCount: number;
  weddingSeasonPartitioning: WeddingSeasonPartitioning;
  maintenancePolicy: PartitionMaintenance;
}

export interface WeddingSeasonPartitioning {
  partition_by_season: boolean;
  partition_by_year: boolean;
  partition_by_month: boolean;
  separate_weekend_partitions: boolean;
  peak_season_isolation: boolean;
  archive_old_seasons: boolean;
  archive_threshold_months: number;
}

export interface PartitionMaintenance {
  auto_create_partitions: boolean;
  auto_drop_old_partitions: boolean;
  partition_pruning_enabled: boolean;
  statistics_maintenance: boolean;
  index_maintenance: boolean;
  maintenance_schedule: string; // Cron expression
}

// ===== INDEX STRATEGIES =====

export interface IndexStrategy {
  primary_indexes: PrimaryIndex[];
  composite_indexes: CompositeIndex[];
  wedding_specific_indexes: WeddingSpecificIndex[];
  materialized_views: MaterializedView[];
  maintenance_strategy: IndexMaintenanceStrategy;
}

export interface WeddingSpecificIndex {
  index_name: string;
  index_type: WeddingIndexType;
  columns: string[];
  wedding_context: string;
  performance_benefit: number;
  maintenance_cost: number;
  usage_frequency: IndexUsageFrequency;
}

export interface MaterializedView {
  view_name: string;
  base_query: string;
  refresh_strategy: RefreshStrategy;
  wedding_optimization: MaterializedViewWeddingOptimization;
  performance_metrics: MaterializedViewMetrics;
}

export interface MaterializedViewWeddingOptimization {
  optimized_for_season: WeddingSeason[];
  optimized_for_suppliers: WeddingSupplierType[];
  optimized_for_weekends: boolean;
  optimized_for_reports: ReportType[];
  refresh_frequency: string; // Cron expression
}

// ===== TYPE UNIONS AND ENUMS =====

export type DataSourceType =
  | 'postgresql'
  | 'mysql'
  | 'mongodb'
  | 'elasticsearch'
  | 'supabase';
export type DatabaseType =
  | 'postgresql'
  | 'mysql'
  | 'sqlite'
  | 'mongodb'
  | 'supabase';
export type AggregationType =
  | 'sum'
  | 'avg'
  | 'count'
  | 'min'
  | 'max'
  | 'stddev'
  | 'percentile'
  | 'wedding_score';
export type MetricDataType =
  | 'number'
  | 'currency'
  | 'percentage'
  | 'rating'
  | 'date'
  | 'duration'
  | 'count';
export type MetricComplexity =
  | 'simple'
  | 'moderate'
  | 'complex'
  | 'very_complex';

export type FilterOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'not_in'
  | 'like'
  | 'not_like'
  | 'between'
  | 'is_null'
  | 'is_not_null'
  | 'wedding_season_match'
  | 'supplier_type_match'
  | 'venue_type_match';

export type FilterValueType =
  | 'string'
  | 'number'
  | 'date'
  | 'boolean'
  | 'array'
  | 'wedding_context';
export type PerformanceImpact = 'low' | 'medium' | 'high' | 'critical';

export type IndexType =
  | 'btree'
  | 'hash'
  | 'gin'
  | 'gist'
  | 'partial'
  | 'expression'
  | 'wedding_composite';
export type IndexMaintenanceCost = 'low' | 'medium' | 'high' | 'very_high';

export type JoinType =
  | 'inner'
  | 'left'
  | 'right'
  | 'full'
  | 'cross'
  | 'wedding_optimized';
export type JoinOperator = '=' | '!=' | '>' | '>=' | '<' | '<=' | 'like' | 'in';
export type CpuIntensity = 'low' | 'medium' | 'high' | 'very_high';

export type AggregationFunction =
  | 'count'
  | 'sum'
  | 'avg'
  | 'min'
  | 'max'
  | 'stddev'
  | 'variance'
  | 'percentile_25'
  | 'percentile_50'
  | 'percentile_75'
  | 'percentile_90'
  | 'percentile_95'
  | 'wedding_satisfaction_score'
  | 'supplier_performance_rating'
  | 'seasonal_trend_analysis';

export type SamplingType =
  | 'random'
  | 'systematic'
  | 'stratified'
  | 'cluster'
  | 'wedding_representative';
export type SampleUnit =
  | 'rows'
  | 'percentage'
  | 'weddings'
  | 'suppliers'
  | 'venues';

export type PartitionType =
  | 'range'
  | 'hash'
  | 'list'
  | 'wedding_season'
  | 'supplier_type';
export type WeddingIndexType =
  | 'seasonal'
  | 'supplier_performance'
  | 'weekend_priority'
  | 'venue_optimization';
export type IndexUsageFrequency =
  | 'very_high'
  | 'high'
  | 'medium'
  | 'low'
  | 'seasonal';

export type RefreshStrategy =
  | 'real_time'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'wedding_season_based';

// ===== COMPLEX SUPPORTING TYPES =====

export interface ForeignKeyReference {
  column: string;
  referencedTable: string;
  referencedColumn: string;
  constraintName: string;
  cascadeDelete: boolean;
  indexSupported: boolean;
}

export interface HavingCondition {
  field: string;
  operator: FilterOperator;
  value: any;
  aggregationRequired: boolean;
}

export interface PrimaryIndex {
  indexName: string;
  columns: string[];
  unique: boolean;
  clustered: boolean;
  weddingOptimized: boolean;
}

export interface CompositeIndex {
  indexName: string;
  columns: string[];
  includeColumns?: string[];
  filterCondition?: string;
  weddingContext: string;
  performanceBenefit: number;
}

export interface IndexMaintenanceStrategy {
  auto_analyze: boolean;
  auto_vacuum: boolean;
  rebuild_threshold: number;
  statistics_update_frequency: string;
  wedding_season_maintenance: boolean;
}

export interface MaterializedViewMetrics {
  refresh_duration_ms: number;
  storage_size_mb: number;
  query_performance_improvement: number;
  memory_usage_mb: number;
  last_refresh: Date;
}

// ===== ZOD VALIDATION SCHEMAS =====

export const MetricDefinitionSchema = z.object({
  name: z.string().min(1),
  expression: z.string().min(1),
  aggregationType: z.enum([
    'sum',
    'avg',
    'count',
    'min',
    'max',
    'wedding_score',
  ]),
  dataType: z.enum(['number', 'currency', 'percentage', 'rating']),
  weddingContext: z.object({
    applies_to_suppliers: z.array(z.string()),
    seasonal_relevance: z.array(z.string()),
  }),
});

export const FilterCriteriaSchema = z.object({
  field: z.string().min(1),
  operator: z.enum([
    'eq',
    'ne',
    'gt',
    'gte',
    'lt',
    'lte',
    'in',
    'like',
    'between',
  ]),
  value: z.any(),
  valueType: z.enum(['string', 'number', 'date', 'boolean', 'array']),
  performanceImpact: z.enum(['low', 'medium', 'high', 'critical']),
});

export const SamplingStrategySchema = z.object({
  type: z.enum([
    'random',
    'systematic',
    'stratified',
    'wedding_representative',
  ]),
  sampleSize: z.number().positive(),
  sampleUnit: z.enum(['rows', 'percentage', 'weddings', 'suppliers']),
  weddingRepresentativeness: z.object({
    seasonal_balance: z.boolean(),
    supplier_type_balance: z.boolean(),
    geographical_coverage: z.boolean(),
  }),
});

// Import wedding-specific types from the main reporting backend types
export type {
  WeddingSeason,
  WeddingSupplierType,
  VenueType,
  WeddingSizeCategory,
  ReportType,
} from './reporting-backend';

export default {
  MetricDefinitionSchema,
  FilterCriteriaSchema,
  SamplingStrategySchema,
};
