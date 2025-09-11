/**
 * WS-241 AI Caching Strategy System Types
 * Comprehensive TypeScript interfaces for AI cache performance and configuration
 */

export type SupplierType =
  | 'photographer'
  | 'wedding_planner'
  | 'venue'
  | 'catering'
  | 'florist'
  | 'band'
  | 'dj'
  | 'decorator';
export type CacheType =
  | 'chatbot'
  | 'email_templates'
  | 'content_generation'
  | 'form_generation'
  | 'query_responses';
export type WeddingSeason = 'peak' | 'shoulder' | 'off' | 'holiday';
export type TimeRange = 'day' | 'week' | 'month' | 'quarter' | 'year';

// Core cache performance metrics
export interface CacheStats {
  overall: {
    hitRate: number;
    monthlySavings: number;
    totalQueries: number;
    storageUsed: string; // e.g., "245MB"
    cacheEntries: number;
    averageResponseTime: number;
    lastUpdated: string;
  };
  byType: CacheTypeStats[];
  trends: {
    hitRateChange: number;
    savingsChange: number;
    queryVolumeChange: number;
  };
}

export interface CacheTypeStats {
  type: CacheType;
  enabled: boolean;
  hitRate: number;
  savingsThisMonth: number;
  entries: number;
  avgQuality: number;
  responseTimes: {
    cached: number;
    generated: number;
  };
  lastWarmed: string;
  topQueries: string[];
}

// Performance tracking over time
export interface CachePerformance {
  averageResponseTime: number;
  peakResponseTime: number;
  metrics: CacheMetric[];
  topQueries: PopularQuery[];
  qualityScore: number;
}

export interface CacheMetric {
  timestamp: string;
  hitRate: number;
  responseTime: number;
  savings: number;
  qualityScore: number;
  queryVolume: number;
}

export interface PopularQuery {
  text: string;
  hitCount: number;
  avgConfidence: number;
  savings: number;
  cacheType: CacheType;
  supplierRelevance: number;
  lastAccessed: string;
}

// Seasonal wedding industry data
export interface SeasonalData {
  currentSeason: WeddingSeason;
  seasonalMultiplier: number;
  peakMonths: string[];
  offSeasonMonths: string[];
  seasonalTrends: SeasonalTrend[];
  recommendations: SeasonalRecommendation[];
}

export interface SeasonalTrend {
  month: string;
  season: WeddingSeason;
  queryVolume: number;
  popularQueries: string[];
  supplierActivity: Record<SupplierType, number>;
}

export interface SeasonalRecommendation {
  season: WeddingSeason;
  title: string;
  description: string;
  action: 'increase_ttl' | 'warm_cache' | 'adjust_threshold' | 'add_capacity';
  priority: 'high' | 'medium' | 'low';
  supplierTypes: SupplierType[];
}

// Cache configuration interfaces
export interface CacheConfig {
  cacheTypes: CacheTypeConfig[];
  warming: CacheWarmingConfig;
  invalidation: CacheInvalidationConfig;
  performance: CachePerformanceConfig;
  weddingOptimization: WeddingOptimizationConfig;
}

export interface CacheTypeConfig {
  type: CacheType;
  enabled: boolean;
  ttlHours: number;
  maxEntries: number;
  semanticThreshold: number; // 0.0 to 1.0
  warmingEnabled: boolean;
  qualityThreshold: number; // 0.0 to 5.0
  supplierSpecific: Record<SupplierType, CacheTypeSupplierConfig>;
}

export interface CacheTypeSupplierConfig {
  enabled: boolean;
  ttlMultiplier: number; // Multiply base TTL
  priorityBoost: number; // Cache priority adjustment
  customQueries: string[]; // Supplier-specific queries to warm
}

export interface CacheWarmingConfig {
  enabled: boolean;
  strategies: WarmingStrategy[];
  schedule: WarmingSchedule;
  seasonal: SeasonalWarmingConfig;
  maxConcurrentWarming: number;
}

export interface WarmingStrategy {
  name: string;
  enabled: boolean;
  priority: number;
  queryPattern: string;
  supplierTypes: SupplierType[];
  triggerConditions: WarmingTrigger[];
}

export interface WarmingTrigger {
  condition: 'low_hit_rate' | 'high_volume' | 'seasonal_peak' | 'time_based';
  threshold: number;
  action: 'warm_popular' | 'warm_seasonal' | 'warm_supplier_specific';
}

export interface WarmingSchedule {
  dailySchedule: {
    times: string[]; // HH:MM format
    enabled: boolean;
  };
  weeklySchedule: {
    days: number[]; // 0-6, Sunday to Saturday
    enabled: boolean;
  };
  seasonalAdjustments: {
    peakSeason: { frequency: string; intensity: number };
    offSeason: { frequency: string; intensity: number };
  };
}

export interface SeasonalWarmingConfig {
  enabled: boolean;
  peakSeasonMultiplier: number;
  offSeasonMultiplier: number;
  weddingSpecificQueries: Record<WeddingSeason, string[]>;
}

export interface CacheInvalidationConfig {
  strategies: InvalidationStrategy[];
  autoInvalidation: {
    enabled: boolean;
    maxAge: number; // hours
    qualityThreshold: number;
  };
  manualControls: {
    enabled: boolean;
    requireConfirmation: boolean;
    auditLog: boolean;
  };
}

export interface InvalidationStrategy {
  name: string;
  enabled: boolean;
  conditions: InvalidationCondition[];
  scope: 'global' | 'type' | 'supplier' | 'query';
}

export interface InvalidationCondition {
  type: 'age' | 'quality' | 'usage' | 'seasonal' | 'manual';
  threshold: number;
  action: 'remove' | 'refresh' | 'mark_stale';
}

export interface CachePerformanceConfig {
  monitoring: {
    realTimeMetrics: boolean;
    alertThresholds: AlertThreshold[];
    performanceTargets: PerformanceTarget[];
  };
  optimization: {
    autoOptimization: boolean;
    learningRate: number;
    adaptiveThresholds: boolean;
  };
}

export interface AlertThreshold {
  metric: 'hit_rate' | 'response_time' | 'error_rate' | 'storage_usage';
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  notificationChannels: string[];
}

export interface PerformanceTarget {
  metric: string;
  target: number;
  tolerance: number;
  seasonalAdjustment: Record<WeddingSeason, number>;
}

export interface WeddingOptimizationConfig {
  seasonal: {
    enabled: boolean;
    autoAdjustTTL: boolean;
    peakSeasonSettings: SeasonalSettings;
    offSeasonSettings: SeasonalSettings;
  };
  supplierSpecific: {
    enabled: boolean;
    customizations: Record<SupplierType, SupplierOptimization>;
  };
  weddingDay: {
    emergencyMode: boolean;
    priorityQueries: string[];
    responseTimeTarget: number;
  };
}

export interface SeasonalSettings {
  ttlMultiplier: number;
  warmingFrequency: string;
  capacityMultiplier: number;
  priorityAdjustment: number;
}

export interface SupplierOptimization {
  enabled: boolean;
  commonQueries: string[];
  preferredCacheTypes: CacheType[];
  responseTimeTarget: number;
  qualityThreshold: number;
}

// API response types
export interface CacheApiResponse<T = any> {
  success: boolean;
  data: T;
  error?: string;
  timestamp: string;
  cacheInfo?: {
    hit: boolean;
    age: number;
    quality: number;
  };
}

export interface CacheStatsResponse extends CacheApiResponse<CacheStats> {
  metadata: {
    supplierId: string;
    supplierType: SupplierType;
    timeRange: TimeRange;
    generatedAt: string;
  };
}

export interface CacheWarmingResponse extends CacheApiResponse {
  data: {
    queriesQueued: number;
    estimatedCompletion: string;
    priority: number;
    strategy: string;
  };
}

// UI component prop types
export interface CachePerformanceDashboardProps {
  supplierId: string;
  supplierType: SupplierType;
  timeRange?: TimeRange;
  realTimeUpdates?: boolean;
}

export interface CacheConfigurationProps {
  supplierId: string;
  supplierType: SupplierType;
  onConfigChange?: (config: CacheConfig) => void;
}

export interface MobileCacheInterfaceProps {
  supplierId: string;
  supplierType: SupplierType;
  compactMode?: boolean;
}

// Wedding industry specific types
export interface WeddingIndustryInsight {
  supplierType: SupplierType;
  commonQueryPatterns: string[];
  peakTimes: string[];
  seasonalVariations: Record<WeddingSeason, number>;
  clientBehaviorPatterns: {
    inquiryTypes: string[];
    responseExpectations: number; // milliseconds
    preferredChannels: string[];
  };
}

// Performance monitoring types
export interface CachePerformanceMetrics {
  timestamp: string;
  hitRate: number;
  missRate: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  throughput: number;
  storageEfficiency: number;
  costSavings: number;
}

export interface CacheAlert {
  id: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metric: string;
  threshold: number;
  actualValue: number;
  message: string;
  supplierImpact: SupplierType[];
  recommendedActions: string[];
  resolved: boolean;
}

// Real-time update types
export interface CacheUpdateEvent {
  type: 'hit' | 'miss' | 'warm' | 'invalidate' | 'config_change';
  timestamp: string;
  supplierId: string;
  cacheType: CacheType;
  queryHash?: string;
  performance?: {
    responseTime: number;
    quality: number;
  };
}

// Testing and development types
export interface CacheTestScenario {
  name: string;
  supplierType: SupplierType;
  season: WeddingSeason;
  expectedHitRate: number;
  queryVolume: number;
  testDuration: number;
}

export interface CacheMockData {
  stats: CacheStats;
  performance: CachePerformance;
  seasonal: SeasonalData;
  config: CacheConfig;
}
