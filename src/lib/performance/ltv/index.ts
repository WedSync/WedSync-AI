/**
 * WS-183 LTV Performance Module Exports
 * Team D - Performance/Platform Focus
 * High-performance LTV calculation infrastructure
 */

// Core calculation engine
export {
  LTVCalculationEngine,
  type CalculationOptions,
  type LTVResult,
  type BatchCalculationResult,
  type WorkerPool,
  type CacheManager,
  type MetricsCollector,
} from './ltv-calculation-engine';

// Multi-level caching system
export {
  LTVCacheManager,
  type UserSegment,
  type CacheMetrics,
  type CacheWarmingResult,
} from './ltv-cache-manager';

// Performance monitoring and SLO tracking
export {
  LTVPerformanceMonitor,
  type PerformanceMetrics,
  type SLO,
  type Anomaly,
  type DateRange,
  type PerformanceReport,
} from './ltv-performance-monitor';

// Re-export for convenience
export default {
  LTVCalculationEngine,
  LTVCacheManager,
  LTVPerformanceMonitor,
};
