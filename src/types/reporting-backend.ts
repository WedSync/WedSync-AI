/**
 * WS-333 Team B: Backend Reporting Engine Infrastructure
 * Comprehensive TypeScript interfaces for the wedding industry reporting system
 * Optimized for processing massive wedding datasets and enterprise-scale operations
 */

import { z } from 'zod';

// ===== CORE REPORTING ENGINE INTERFACES =====

export interface ReportingEngineBackend {
  generateReport(
    request: ReportGenerationRequest,
  ): Promise<ReportGenerationResult>;
  scheduleReport(schedule: ReportSchedule): Promise<ScheduledReportId>;
  processDataAggregation(
    aggregation: DataAggregationRequest,
  ): Promise<AggregatedData>;
  optimizeReportQuery(query: ReportQuery): Promise<OptimizedQuery>;
  validateReportData(data: ReportData): Promise<ValidationResult>;
}

// ===== REQUEST AND RESPONSE INTERFACES =====

export interface ReportGenerationRequest {
  reportId: string;
  userId: string;
  organizationId: string;
  reportType: ReportType;
  configuration: ReportConfiguration;
  dataFilters: DataFilters;
  outputFormat: OutputFormat[];
  priority: ProcessingPriority;
  deliveryOptions: DeliveryOptions;
  cacheStrategy: CacheStrategy;
  weddingContext?: WeddingContextFilters;
}

export interface ReportGenerationResult {
  reportId: string;
  status: GenerationStatus;
  generatedAt: Date;
  processingTime: number;
  dataSize: number;
  outputUrls: ReportOutput[];
  metadata: ReportMetadata;
  cacheInfo: CacheInfo;
  performanceMetrics: PerformanceMetrics;
  weddingMetrics?: WeddingSpecificMetrics;
}

export interface DataAggregationRequest {
  aggregationId: string;
  dataSource: DataSource[];
  groupBy: string[];
  metrics: MetricDefinition[];
  timeRange: TimeRange;
  filters: FilterCriteria[];
  samplingStrategy?: SamplingStrategy;
  weddingSeasonOptimization?: boolean;
}

export interface AggregatedData {
  aggregationId: string;
  processedAt: Date;
  totalRecords: number;
  results: AggregationResult[];
  metadata: AggregationMetadata;
  weddingInsights?: WeddingSeasonalInsights;
}

// ===== QUERY OPTIMIZATION INTERFACES =====

export interface ReportQuery {
  queryId: string;
  baseQuery: string;
  joins: QueryJoin[];
  aggregations: QueryAggregation[];
  filters: QueryFilter[];
  orderBy: QueryOrder[];
  limit?: number;
  offset?: number;
  weddingOptimizations?: WeddingQueryOptimizations;
}

export interface OptimizedQuery {
  queryId: string;
  originalQuery: string;
  optimizedQuery: string;
  estimatedImprovement: number;
  indexesUsed: string[];
  optimizationStrategies: QueryOptimization[];
  cacheHit: boolean;
  weddingSpecificOptimizations: WeddingOptimization[];
}

export interface QueryOptimization {
  type: OptimizationType;
  suggestion: string;
  estimatedImprovement: string;
  reason: string;
  weddingContext?: string;
}

// ===== WEDDING-SPECIFIC INTERFACES =====

export interface WeddingContextFilters {
  weddingSeasons?: WeddingSeason[];
  supplierTypes?: WeddingSupplierType[];
  weddingSize?: WeddingSizeCategory;
  venue_types?: VenueType[];
  budget_ranges?: BudgetRange[];
  geographical_regions?: GeographicalRegion[];
  weekend_priority?: boolean;
  peak_season_only?: boolean;
}

export interface WeddingSpecificMetrics {
  seasonal_distribution: SeasonalDistribution;
  weekend_concentration: number; // Percentage of Saturday weddings
  average_booking_lead_time: number; // Days
  supplier_performance_scores: SupplierPerformanceScore[];
  revenue_per_wedding_type: RevenueByWeddingType[];
  satisfaction_by_season: SatisfactionBySeason[];
  peak_demand_periods: PeakDemandPeriod[];
}

export interface WeddingQueryOptimizations {
  use_wedding_season_index: boolean;
  use_saturday_materialized_view: boolean;
  enable_supplier_partitioning: boolean;
  optimize_date_range_queries: boolean;
  cache_seasonal_aggregations: boolean;
}

export interface WeddingOptimization {
  optimization_type: 'seasonal' | 'supplier' | 'weekend' | 'venue' | 'budget';
  description: string;
  performance_gain: number;
  wedding_context: string;
}

export interface WeddingSeasonalInsights {
  peak_seasons: WeddingSeason[];
  booking_patterns: BookingPattern[];
  supplier_demand: SupplierDemandAnalysis[];
  revenue_trends: SeasonalRevenueTrend[];
  capacity_utilization: CapacityUtilization[];
}

// ===== PERFORMANCE AND CACHING INTERFACES =====

export interface PerformanceMetrics {
  queryExecutionTime: number;
  dataProcessingTime: number;
  reportRenderingTime: number;
  totalGenerationTime: number;
  memoryUsage: number;
  cpuUsage: number;
  cacheHitRatio: number;
  concurrent_requests: number;
}

export interface CacheStrategy {
  level: CacheLevel;
  ttl: number;
  invalidation_strategy: InvalidationStrategy;
  wedding_context_aware: boolean;
}

export interface CacheInfo {
  cacheKey: string;
  cacheLevel: CacheLevel;
  hitRatio: number;
  lastUpdated: Date;
  ttlRemaining: number;
  weddingSeasonOptimized: boolean;
}

export interface ReportCacheManager {
  getCachedReport(
    request: ReportGenerationRequest,
  ): Promise<ReportGenerationResult | null>;
  cacheReport(
    request: ReportGenerationRequest,
    result: ReportGenerationResult,
  ): Promise<void>;
  invalidateCache(pattern: string): Promise<void>;
  getCacheStats(): Promise<CacheStatistics>;
  optimizeWeddingCache(): Promise<CacheOptimizationResult>;
}

// ===== SCHEDULING AND AUTOMATION INTERFACES =====

export interface ReportSchedule {
  scheduleId: string;
  reportConfiguration: ReportConfiguration;
  cronExpression: string;
  timezone: string;
  deliveryMethod: DeliveryMethod;
  retryPolicy: RetryPolicy;
  expirationDate?: Date;
  weddingSeasonAware?: boolean;
  peakSeasonAdjustments?: PeakSeasonAdjustment[];
}

export interface AutomatedReportingSystem {
  scheduleReport(schedule: ReportSchedule): Promise<ScheduledReportId>;
  cancelSchedule(scheduleId: string): Promise<void>;
  updateSchedule(
    scheduleId: string,
    updates: Partial<ReportSchedule>,
  ): Promise<void>;
  getScheduleStatus(scheduleId: string): Promise<ScheduleStatus>;
  optimizeWeddingSeasonSchedules(): Promise<ScheduleOptimizationResult>;
}

export interface ScheduleStatus {
  scheduleId: string;
  isActive: boolean;
  lastExecution?: Date;
  nextExecution?: Date;
  executionCount: number;
  successRate: number;
  lastError?: string;
  weddingSeasonAdjusted: boolean;
}

// ===== REAL-TIME PROCESSING INTERFACES =====

export interface WeddingDataStreamProcessor {
  startStreamProcessing(): Promise<void>;
  stopStreamProcessing(): Promise<void>;
  processRealtimeEvent(topic: string, data: any): Promise<void>;
  getStreamStatus(): StreamStatus;
  optimizeWeddingStreams(): Promise<StreamOptimizationResult>;
}

export interface StreamStatus {
  isActive: boolean;
  processedEvents: number;
  errorRate: number;
  latency: number;
  throughput: number;
  weddingEventTypes: WeddingEventTypeStats[];
}

export interface MetricAccumulator {
  addBooking(booking: BookingMetric): void;
  addPayment(payment: PaymentMetric): void;
  addSatisfactionScore(score: SatisfactionMetric): void;
  getCurrentMetrics(): RealtimeMetrics;
  resetMetrics(): void;
  getWeddingSeasonMetrics(): WeddingSeasonMetrics;
}

// ===== DATABASE OPTIMIZATION INTERFACES =====

export interface ReportingDatabaseManager {
  executeOptimizedQuery(query: ReportQuery): Promise<QueryResult>;
  createReportingIndexes(): Promise<void>;
  analyzeQueryPerformance(queryId: string): Promise<QueryPerformanceAnalysis>;
  optimizeWeddingDataStructures(): Promise<OptimizationResult>;
  maintainWeddingIndexes(): Promise<MaintenanceResult>;
}

export interface QueryPerformanceMonitor {
  recordQueryPerformance(performance: QueryPerformanceRecord): Promise<void>;
  getPerformanceStats(timeRange: TimeRange): Promise<PerformanceStatistics>;
  identifySlowQueries(): Promise<SlowQueryAnalysis[]>;
  suggestWeddingOptimizations(): Promise<WeddingOptimizationSuggestion[]>;
}

export interface QueryPerformanceRecord {
  queryId: string;
  executionTime: number;
  resultSize: number;
  cacheHit: boolean;
  indexesUsed: string[];
  weddingDataSize: number;
  seasonalFactor: number;
}

// ===== VALIDATION AND SECURITY INTERFACES =====

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  weddingContextValidations: WeddingValidation[];
}

export interface SecurityContext {
  userId: string;
  organizationId: string;
  permissions: ReportPermission[];
  accessLevel: AccessLevel;
  gdprCompliant: boolean;
  auditRequired: boolean;
}

export interface AuditLog {
  logId: string;
  userId: string;
  action: AuditAction;
  resourceId: string;
  timestamp: Date;
  details: AuditDetails;
  weddingContext?: WeddingAuditContext;
}

// ===== TYPE UNIONS AND ENUMS =====

export type GenerationStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';
export type ProcessingPriority =
  | 'low'
  | 'normal'
  | 'high'
  | 'critical'
  | 'wedding_day_emergency';
export type OutputFormat =
  | 'pdf'
  | 'excel'
  | 'csv'
  | 'json'
  | 'powerpoint'
  | 'wedding_portfolio';
export type ReportType =
  | 'financial'
  | 'operational'
  | 'seasonal_analysis'
  | 'wedding_portfolio'
  | 'supplier_performance'
  | 'client_satisfaction'
  | 'booking_trends'
  | 'revenue_optimization'
  | 'venue_utilization'
  | 'photographer_metrics'
  | 'catering_analysis'
  | 'wedding_planner_dashboard'
  | 'enterprise_compliance';

export type WeddingSeason =
  | 'spring'
  | 'summer'
  | 'fall'
  | 'winter'
  | 'peak'
  | 'off_season';
export type WeddingSupplierType =
  | 'photographer'
  | 'venue'
  | 'catering'
  | 'florist'
  | 'wedding_planner'
  | 'dj_music'
  | 'videographer'
  | 'bridal_salon'
  | 'transportation'
  | 'cake_designer';

export type VenueType =
  | 'banquet_hall'
  | 'outdoor_garden'
  | 'church'
  | 'beach'
  | 'historic_venue'
  | 'hotel_resort'
  | 'winery_vineyard'
  | 'barn_rustic'
  | 'rooftop_urban'
  | 'destination';

export type WeddingSizeCategory =
  | 'intimate'
  | 'small'
  | 'medium'
  | 'large'
  | 'grand';
export type CacheLevel = 'memory' | 'redis' | 'disk' | 'distributed';
export type OptimizationType =
  | 'index_hint'
  | 'partition_pruning'
  | 'materialized_view'
  | 'query_rewrite';
export type InvalidationStrategy =
  | 'ttl'
  | 'manual'
  | 'event_based'
  | 'wedding_date_aware';
export type AccessLevel =
  | 'read'
  | 'write'
  | 'admin'
  | 'enterprise'
  | 'wedding_day_emergency';
export type AuditAction =
  | 'generate_report'
  | 'schedule_report'
  | 'access_data'
  | 'export_data'
  | 'wedding_day_access';

export type ScheduledReportId = string;

// ===== COMPLEX DATA STRUCTURES =====

export interface ReportConfiguration {
  userId: string;
  organizationId: string;
  reportType: ReportType;
  title: string;
  description?: string;
  dataFilters: DataFilters;
  outputFormat: OutputFormat[];
  recipients: string[];
  customizations: ReportCustomization[];
  weddingBranding?: WeddingBrandingOptions;
}

export interface DataFilters {
  dateRange: TimeRange;
  supplierIds?: string[];
  clientIds?: string[];
  weddingIds?: string[];
  venueTypes?: VenueType[];
  weddingSeasons?: WeddingSeason[];
  budgetRanges?: BudgetRange[];
  geographicalRegions?: GeographicalRegion[];
  customFilters: CustomFilter[];
}

export interface DeliveryOptions {
  method: DeliveryMethod;
  recipients: string[];
  autoArchive: boolean;
  encryption: boolean;
  weddingPortalIntegration?: boolean;
}

export interface DeliveryMethod {
  type: 'email' | 'webhook' | 'sftp' | 'api' | 'wedding_portal';
  configuration: DeliveryConfiguration;
  retryPolicy: RetryPolicy;
}

export interface ReportOutput {
  format: OutputFormat;
  url: string;
  size: number;
  checksum: string;
  generatedAt: Date;
  expiresAt: Date;
  weddingBranded: boolean;
}

export interface ReportMetadata {
  generatedBy: string;
  dataSourceVersion: string;
  queryComplexity: number;
  recordsProcessed: number;
  weddingCount: number;
  supplierCount: number;
  seasonalFactors: SeasonalFactor[];
  complianceFlags: ComplianceFlag[];
}

// ===== SPECIALIZED WEDDING INTERFACES =====

export interface SeasonalDistribution {
  spring: number;
  summer: number;
  fall: number;
  winter: number;
  peak_months: PeakMonth[];
  seasonal_revenue: SeasonalRevenue[];
}

export interface SupplierPerformanceScore {
  supplierId: string;
  supplierType: WeddingSupplierType;
  performanceScore: number;
  satisfactionRating: number;
  bookingCount: number;
  revenueGenerated: number;
  seasonalPerformance: SeasonalPerformance[];
}

export interface BookingPattern {
  pattern_type: 'seasonal' | 'weekly' | 'monthly' | 'yearly';
  peak_periods: PeakPeriod[];
  booking_lead_times: LeadTimeAnalysis[];
  cancellation_patterns: CancellationPattern[];
}

export interface PeakSeasonAdjustment {
  season: WeddingSeason;
  frequency_multiplier: number;
  priority_boost: number;
  resource_allocation: number;
}

// ===== ZOD VALIDATION SCHEMAS =====

export const ReportGenerationRequestSchema = z.object({
  reportId: z.string().min(1),
  userId: z.string().min(1),
  organizationId: z.string().min(1),
  reportType: z.enum([
    'financial',
    'operational',
    'seasonal_analysis',
    'wedding_portfolio',
    'supplier_performance',
  ]),
  configuration: z.object({
    title: z.string().min(1),
    dataFilters: z.object({
      dateRange: z.object({
        start: z.date(),
        end: z.date(),
      }),
    }),
  }),
  priority: z.enum([
    'low',
    'normal',
    'high',
    'critical',
    'wedding_day_emergency',
  ]),
  outputFormat: z.array(
    z.enum(['pdf', 'excel', 'csv', 'json', 'powerpoint', 'wedding_portfolio']),
  ),
});

export const WeddingContextFiltersSchema = z.object({
  weddingSeasons: z
    .array(z.enum(['spring', 'summer', 'fall', 'winter', 'peak', 'off_season']))
    .optional(),
  supplierTypes: z
    .array(
      z.enum([
        'photographer',
        'venue',
        'catering',
        'florist',
        'wedding_planner',
      ]),
    )
    .optional(),
  weddingSize: z
    .enum(['intimate', 'small', 'medium', 'large', 'grand'])
    .optional(),
  weekend_priority: z.boolean().optional(),
  peak_season_only: z.boolean().optional(),
});

// ===== UTILITY TYPES =====

export interface TimeRange {
  start: Date;
  end: Date;
  timezone?: string;
  months?: number;
  weddingSeasonAware?: boolean;
}

export interface BudgetRange {
  min: number;
  max: number;
  currency: string;
}

export interface GeographicalRegion {
  country: string;
  state?: string;
  city?: string;
  radius?: number;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

// Export everything needed for the reporting engine
export type {
  DataSource,
  MetricDefinition,
  FilterCriteria,
  SamplingStrategy,
  QueryJoin,
  QueryAggregation,
  QueryFilter,
  QueryOrder,
  RetryPolicy,
  ValidationError,
  ValidationWarning,
  WeddingValidation,
  ReportPermission,
  CustomFilter,
  DeliveryConfiguration,
  SeasonalFactor,
  ComplianceFlag,
  PeakMonth,
  SeasonalRevenue,
  SeasonalPerformance,
  PeakPeriod,
  LeadTimeAnalysis,
  CancellationPattern,
  ReportCustomization,
  WeddingBrandingOptions,
  AggregationResult,
  AggregationMetadata,
  CacheStatistics,
  CacheOptimizationResult,
  ScheduleOptimizationResult,
  StreamOptimizationResult,
  WeddingEventTypeStats,
  BookingMetric,
  PaymentMetric,
  SatisfactionMetric,
  RealtimeMetrics,
  WeddingSeasonMetrics,
  QueryResult,
  QueryPerformanceAnalysis,
  OptimizationResult,
  MaintenanceResult,
  PerformanceStatistics,
  SlowQueryAnalysis,
  WeddingOptimizationSuggestion,
  AuditDetails,
  WeddingAuditContext,
  SupplierDemandAnalysis,
  SeasonalRevenueTrend,
  CapacityUtilization,
  RevenueByWeddingType,
  SatisfactionBySeason,
  PeakDemandPeriod,
};
