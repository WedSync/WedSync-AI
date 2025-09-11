// Verification Processing System - High-Performance Document Processing for WS-185
// Team D - Performance/Platform Focus
// Built for enterprise-scale wedding supplier verification with sub-30-second processing

// Core Processing Engine
export {
  VerificationProcessingEngine,
  verificationProcessingEngine,
  type VerificationDocument,
  type ProcessingOptions,
  type ProcessingResult,
  type ProcessingMetadata,
  type LoadBalanceResult,
} from './verification-processing-engine';

// High-Performance OCR Engine
export {
  HighPerformanceOCR,
  highPerformanceOCR,
  type OCRResult,
  type BatchOCRResult,
  type BatchMetadata,
  type ExtractionRules,
  type FieldMapping,
  type EnhancedImage,
  type TesseractConfig,
} from './high-performance-ocr';

// Performance Monitoring System
export {
  DocumentPerformanceMonitor,
  documentPerformanceMonitor,
  type ProcessingMetrics,
  type ProcessingBottleneck,
  type ProcessingReport,
  type DateRange,
  type ProcessingPercentiles,
  type ResourceUtilization,
  type PerformanceTrend,
  type OptimizationRecommendation,
  type Anomaly,
  type AlertManager,
  type ProcessingAlert,
} from './document-performance-monitor';

// Intelligent Caching System
export {
  VerificationCacheManager,
  verificationCacheManager,
  type CachedResult,
  type CacheMetrics,
  type CacheOptimization,
  type CacheSavings,
  type CacheEntry,
  type CacheConfig,
  type CacheStatistics,
} from './verification-cache-manager';

// Worker Pool Management
export {
  ProcessingWorkerPool,
  processingWorkerPool,
  type WorkerPoolConfig,
  type WorkerTask,
  type WorkerResult,
  type WorkerStats,
  type PoolStatistics,
} from './processing-worker-pool';

// Document Optimization
export {
  DocumentOptimizer,
  documentOptimizer,
  type OptimizationOptions,
  type OptimizationResult,
  type DocumentQualityMetrics,
  type PreprocessingStep,
  type AIEnhancementConfig,
  type OptimizationMetrics,
  type DocumentCharacteristics,
} from './document-optimizer';

// Unified Verification Processing API
export class VerificationProcessingAPI {
  private static instance: VerificationProcessingAPI;

  private constructor() {}

  static getInstance(): VerificationProcessingAPI {
    if (!VerificationProcessingAPI.instance) {
      VerificationProcessingAPI.instance = new VerificationProcessingAPI();
    }
    return VerificationProcessingAPI.instance;
  }

  /**
   * Initialize the entire verification processing system
   */
  async initialize(): Promise<void> {
    console.log('Initializing WS-185 Verification Processing System...');

    await Promise.all([
      verificationProcessingEngine.initialize(),
      highPerformanceOCR.initialize(),
      documentPerformanceMonitor.initialize(),
      verificationCacheManager.initialize(),
      processingWorkerPool.initialize(),
      documentOptimizer.initialize(),
    ]);

    console.log('✅ Verification Processing System initialized successfully');
  }

  /**
   * Process verification documents with full performance monitoring
   */
  async processVerificationDocuments(
    documents: VerificationDocument[],
    options?: ProcessingOptions,
  ): Promise<ProcessingResult[]> {
    console.log(`🚀 Processing ${documents.length} verification documents`);

    const startTime = Date.now();

    try {
      const results =
        await verificationProcessingEngine.processVerificationDocuments(
          documents,
          options,
        );

      const processingTime = Date.now() - startTime;
      console.log(
        `✅ Processed ${documents.length} documents in ${processingTime}ms`,
      );

      // Log performance metrics
      const successRate =
        (results.filter((r) => r.success).length / results.length) * 100;
      const avgConfidence =
        results
          .filter((r) => r.success)
          .reduce((sum, r) => sum + r.confidence, 0) /
        results.filter((r) => r.success).length;

      console.log(
        `📊 Success Rate: ${successRate.toFixed(1)}%, Avg Confidence: ${(avgConfidence * 100).toFixed(1)}%`,
      );

      return results;
    } catch (error) {
      console.error('❌ Verification processing failed:', error);
      throw error;
    }
  }

  /**
   * Get system health and performance metrics
   */
  async getSystemHealth(): Promise<SystemHealthReport> {
    const [cacheMetrics, poolStats, optimizationMetrics] = await Promise.all([
      verificationCacheManager.getCacheMetrics(),
      processingWorkerPool.getPoolStatistics(),
      documentOptimizer.getOptimizationMetrics(),
    ]);

    return {
      timestamp: new Date(),
      overall_status: this.calculateOverallHealth(cacheMetrics, poolStats),
      cache: {
        hit_rate: cacheMetrics.hitRate,
        memory_usage_mb: cacheMetrics.memoryUsageMB,
        total_entries: cacheMetrics.totalEntries,
      },
      worker_pool: {
        active_workers: poolStats.activeWorkers,
        idle_workers: poolStats.idleWorkers,
        pool_utilization: poolStats.poolUtilization,
        throughput_per_second: poolStats.throughputPerSecond,
      },
      optimization: {
        documents_optimized: optimizationMetrics.totalDocumentsOptimized,
        average_quality_improvement:
          optimizationMetrics.averageQualityImprovement,
        success_rate: optimizationMetrics.successRate,
      },
      performance_targets: {
        target_processing_time: '< 30 seconds',
        target_accuracy: '> 95%',
        target_uptime: '> 99.9%',
        current_performance: this.assessCurrentPerformance(poolStats),
      },
    };
  }

  /**
   * Shutdown the entire verification processing system gracefully
   */
  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down Verification Processing System...');

    await Promise.all([
      verificationProcessingEngine.shutdown(),
      highPerformanceOCR.shutdown(),
      documentPerformanceMonitor.shutdown(),
      verificationCacheManager.shutdown(),
      processingWorkerPool.shutdown(),
      documentOptimizer.shutdown(),
    ]);

    console.log('✅ Verification Processing System shutdown complete');
  }

  private calculateOverallHealth(
    cacheMetrics: CacheMetrics,
    poolStats: PoolStatistics,
  ): 'healthy' | 'warning' | 'critical' {
    const cacheHealthy =
      cacheMetrics.hitRate > 50 && cacheMetrics.memoryUsageMB < 200;
    const poolHealthy =
      poolStats.poolUtilization < 90 && poolStats.activeWorkers > 0;

    if (cacheHealthy && poolHealthy) return 'healthy';
    if (!cacheHealthy || !poolHealthy) return 'warning';
    return 'critical';
  }

  private assessCurrentPerformance(poolStats: PoolStatistics): string {
    if (poolStats.averageTaskTime < 15000) return 'Excellent (< 15s avg)';
    if (poolStats.averageTaskTime < 30000) return 'Good (< 30s avg)';
    return 'Needs Improvement (> 30s avg)';
  }
}

// System Health Report Interface
export interface SystemHealthReport {
  timestamp: Date;
  overall_status: 'healthy' | 'warning' | 'critical';
  cache: {
    hit_rate: number;
    memory_usage_mb: number;
    total_entries: number;
  };
  worker_pool: {
    active_workers: number;
    idle_workers: number;
    pool_utilization: number;
    throughput_per_second: number;
  };
  optimization: {
    documents_optimized: number;
    average_quality_improvement: number;
    success_rate: number;
  };
  performance_targets: {
    target_processing_time: string;
    target_accuracy: string;
    target_uptime: string;
    current_performance: string;
  };
}

// Export main API instance
export const verificationProcessingAPI =
  VerificationProcessingAPI.getInstance();

// Performance Constants
export const PERFORMANCE_TARGETS = {
  MAX_PROCESSING_TIME_MS: 30000, // 30 seconds
  MIN_OCR_ACCURACY: 0.95, // 95%
  MIN_SUCCESS_RATE: 0.95, // 95%
  MAX_MEMORY_USAGE_MB: 1024, // 1GB
  TARGET_THROUGHPUT_PER_SECOND: 2, // 2 documents/second
  CACHE_HIT_RATE_TARGET: 0.7, // 70%
} as const;

// Wedding Industry Context
export const WEDDING_CONTEXT = {
  PEAK_SEASON_MONTHS: [4, 5, 6, 9, 10], // April-June, Sep-Oct
  TYPICAL_SUPPLIER_DOCUMENTS: 3, // License, Insurance, Certification
  PEAK_ONBOARDING_MULTIPLIER: 10, // 10x normal load during peak
  VERIFICATION_URGENCY_HOURS: 24, // Suppliers need verification within 24h
  AVERAGE_DOCUMENT_SIZE_MB: 2.5, // Scanned business documents
  EXPECTED_CONCURRENT_SUPPLIERS: 200, // Peak simultaneous uploads
} as const;

/**
 * Wedding Supplier Verification Processing System
 *
 * This system processes verification documents for wedding suppliers at enterprise scale:
 *
 * 🎯 **Performance Targets:**
 * - Sub-30-second processing for 95% of documents
 * - 95%+ OCR accuracy for business documents
 * - Auto-scaling for 10x traffic spikes during peak wedding seasons
 * - Memory-efficient processing of large document collections
 *
 * 🏗️ **Architecture:**
 * - High-performance document processing pipeline with parallel OCR operations
 * - Intelligent caching for frequently processed document types
 * - Real-time performance monitoring with bottleneck identification
 * - AI-powered document preprocessing for improved OCR accuracy
 * - Security measures maintaining performance while protecting documents
 *
 * 👰💒 **Wedding Context:**
 * During peak wedding seasons (April-June, September-October), 200+ suppliers
 * simultaneously upload verification documents (business licenses, insurance
 * certificates, certifications). Each document must be processed accurately
 * within 30 seconds to enable instant verification badge activation, helping
 * couples quickly identify trustworthy suppliers for their wedding planning needs.
 *
 * @example
 * ```typescript
 * import { verificationProcessingAPI, VerificationDocument } from '@/lib/performance/verification';
 *
 * // Initialize the system
 * await verificationProcessingAPI.initialize();
 *
 * // Process verification documents
 * const documents: VerificationDocument[] = [
 *   {
 *     id: 'doc_001',
 *     supplierId: 'supplier_123',
 *     type: 'business_license',
 *     buffer: documentBuffer,
 *     filename: 'business_license.pdf',
 *     mimeType: 'application/pdf',
 *     uploadedAt: new Date()
 *   }
 * ];
 *
 * const results = await verificationProcessingAPI.processVerificationDocuments(documents);
 *
 * // Check system health
 * const health = await verificationProcessingAPI.getSystemHealth();
 * console.log('System Status:', health.overall_status);
 * ```
 */
