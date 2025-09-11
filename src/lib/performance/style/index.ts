// WS-184: High-Performance Style Processing System - Comprehensive Export Module
'use client';

// Import classes for internal use
import { StyleProcessingEngine } from './style-processing-engine';
import { ImageOptimizer } from './image-optimizer';
import { VectorPerformanceManager } from './vector-performance-manager';
import { StylePerformanceMonitor } from './style-performance-monitor';
import { ProcessingWorkerPool } from './processing-worker-pool';
import { StyleCacheManager } from './style-cache-manager';
import type { ProcessingOptions, StyleVector } from './style-processing-engine';
import type { ProcessedImage, ImageOptimization } from './image-optimizer';
import type { CacheStats } from './style-cache-manager';
import type { PoolMetrics } from './processing-worker-pool';

// Type alias for the return type of processWeddingPortfolio
type WeddingStyleProfile = {
  vectors: StyleVector[];
  processingTime: number;
  cacheHitRatio: number;
  qualityMetrics: {
    accuracy: number;
    confidence: number;
    colorAccuracy: number;
  };
};

// Core Style Processing Components
export {
  StyleProcessingEngine,
  type ProcessingOptions,
  type StyleVector,
  type ProcessingJob,
  type StyleProcessingResult,
  type LoadBalanceResult,
  type OptimizedVectorResult,
} from './style-processing-engine';

export {
  ImageOptimizer,
  type ImageOptimization,
  type BatchProcessingResult,
  type ProcessedImage,
  type ColorPaletteResult,
  type OptimizedImage,
  type ColorAccuracy,
  type ImageFormat,
} from './image-optimizer';

export {
  VectorPerformanceManager,
  type SimilaritySearchResult,
  type QueryPattern,
  type CacheOptimization,
  type StorageOptimization,
  type VectorIndex,
  type SimilarityCache,
} from './vector-performance-manager';

export {
  StylePerformanceMonitor,
  type ProcessingMetrics,
  type PerformanceReport,
  type Anomaly,
  type AlertRule,
  type DateRange,
} from './style-performance-monitor';

export {
  ProcessingWorkerPool,
  type WorkerTask,
  type WorkerContext,
  type WorkerCapability,
  type PoolConfiguration,
  type ProcessingResult,
  type PoolMetrics,
} from './processing-worker-pool';

export {
  StyleCacheManager,
  type CacheEntry,
  type CacheConfiguration,
  type CacheStats,
  type CacheAnalytics,
} from './style-cache-manager';

// Performance Optimization Constants
export const STYLE_PROCESSING_CONSTANTS = {
  // Performance Targets
  TARGET_PROCESSING_TIME: 2000, // 2 seconds max
  TARGET_SIMILARITY_SEARCH_TIME: 1000, // 1 second max
  TARGET_CACHE_HIT_RATIO: 0.8, // 80% cache hit ratio
  TARGET_MEMORY_EFFICIENCY: 0.9, // 90% memory efficiency

  // Vector Configuration
  VECTOR_DIMENSIONS: 128,
  MAX_SIMILARITY_CANDIDATES: 10000,
  SIMILARITY_THRESHOLD: 0.7,

  // Image Processing
  MAX_IMAGE_SIZE: 25 * 1024 * 1024, // 25MB
  COMPRESSION_QUALITY: 85,
  SUPPORTED_FORMATS: ['image/jpeg', 'image/png', 'image/webp'],

  // Worker Pool Defaults
  DEFAULT_MIN_WORKERS: 2,
  DEFAULT_MAX_WORKERS: 8,
  WORKER_TIMEOUT: 30000, // 30 seconds
  TASK_RETRY_ATTEMPTS: 3,

  // Cache Configuration
  DEFAULT_CACHE_SIZE: 500 * 1024 * 1024, // 500MB
  DEFAULT_CACHE_TTL: 30 * 60 * 1000, // 30 minutes
  MAX_CACHE_ENTRIES: 10000,

  // Wedding Industry Specific
  WEDDING_SEASONS: ['spring', 'summer', 'fall', 'winter'],
  WEDDING_STYLES: [
    'romantic',
    'rustic',
    'modern',
    'vintage',
    'bohemian',
    'classic',
    'minimalist',
    'elegant',
  ],
  WEDDING_VENUES: [
    'garden',
    'beach',
    'church',
    'ballroom',
    'barn',
    'outdoor',
    'hotel',
    'vineyard',
    'mansion',
    'rooftop',
  ],
  FORMALITY_LEVELS: ['casual', 'formal', 'semi-formal'],
  WEDDING_TYPES: [
    'traditional',
    'destination',
    'intimate',
    'grand',
    'elopement',
  ],
} as const;

// Performance Optimization Utilities
export class StyleProcessingOptimizer {
  private static instance: StyleProcessingOptimizer;
  private processingEngine: StyleProcessingEngine;
  private imageOptimizer: ImageOptimizer;
  private vectorManager: VectorPerformanceManager;
  private performanceMonitor: StylePerformanceMonitor;
  private workerPool: ProcessingWorkerPool;
  private cacheManager: StyleCacheManager;

  private constructor() {
    // Initialize with optimal configurations for wedding industry processing
    this.processingEngine = new StyleProcessingEngine(
      STYLE_PROCESSING_CONSTANTS.DEFAULT_MAX_WORKERS,
    );
    this.imageOptimizer = new ImageOptimizer(
      STYLE_PROCESSING_CONSTANTS.DEFAULT_MAX_WORKERS,
    );
    this.vectorManager = new VectorPerformanceManager();
    this.performanceMonitor = new StylePerformanceMonitor();

    this.workerPool = new ProcessingWorkerPool({
      minWorkers: STYLE_PROCESSING_CONSTANTS.DEFAULT_MIN_WORKERS,
      maxWorkers: STYLE_PROCESSING_CONSTANTS.DEFAULT_MAX_WORKERS,
      autoScale: true,
      scaleUpThreshold: 2.0,
      scaleDownThreshold: 5 * 60 * 1000, // 5 minutes
      workerTimeout: STYLE_PROCESSING_CONSTANTS.WORKER_TIMEOUT,
      taskTimeout: STYLE_PROCESSING_CONSTANTS.TARGET_PROCESSING_TIME,
      retryAttempts: STYLE_PROCESSING_CONSTANTS.TASK_RETRY_ATTEMPTS,
      loadBalancingStrategy: 'performance_based',
    });

    this.cacheManager = new StyleCacheManager({
      maxSize: STYLE_PROCESSING_CONSTANTS.DEFAULT_CACHE_SIZE,
      maxEntries: STYLE_PROCESSING_CONSTANTS.MAX_CACHE_ENTRIES,
      defaultTTL: STYLE_PROCESSING_CONSTANTS.DEFAULT_CACHE_TTL,
      evictionPolicy: 'adaptive',
      compressionEnabled: true,
      compressionThreshold: 10 * 1024, // 10KB
      memoryPressureThreshold: 80,
      tieredCaching: true,
      persistentCache: true,
      analytics: true,
    });

    this.setupIntegrations();
  }

  private setupIntegrations(): void {
    // Set up cross-component event handling for optimal performance
    this.performanceMonitor.on('anomalies', (data) => {
      console.warn('Performance anomalies detected:', data);
    });

    this.workerPool.on('scaledUp', (data) => {
      console.log('Worker pool scaled up:', data);
    });

    this.cacheManager.on('evictionPerformed', (data) => {
      console.log('Cache eviction performed:', data);
    });
  }

  public static getInstance(): StyleProcessingOptimizer {
    if (!StyleProcessingOptimizer.instance) {
      StyleProcessingOptimizer.instance = new StyleProcessingOptimizer();
    }
    return StyleProcessingOptimizer.instance;
  }

  /**
   * Process wedding portfolio images with full optimization pipeline
   */
  async processWeddingPortfolio(
    images: string[],
    weddingContext: {
      style?: string;
      venue?: string;
      season?: string;
      formality?: string;
      weddingType?: string;
    },
    options?: {
      priority?: 'low' | 'normal' | 'high';
      quality?: 'fast' | 'balanced' | 'high';
      cacheEnabled?: boolean;
    },
  ): Promise<{
    vectors: StyleVector[];
    processingTime: number;
    cacheHitRatio: number;
    qualityMetrics: {
      accuracy: number;
      confidence: number;
      colorAccuracy: number;
    };
  }> {
    const startTime = performance.now();

    // Check cache first for the entire portfolio
    const cacheKey = this.generatePortfolioCacheKey(images, weddingContext);
    if (options?.cacheEnabled !== false) {
      const cachedResult = await this.cacheManager.get(cacheKey, [
        'portfolio',
        weddingContext.style || 'default',
      ]);
      if (cachedResult && typeof cachedResult === 'object') {
        return {
          ...(cachedResult as WeddingStyleProfile),
          processingTime: performance.now() - startTime,
        };
      }
    }

    // Process images through optimization pipeline
    const processingOptions: ProcessingOptions = {
      priority:
        options?.priority === 'high'
          ? 'high'
          : options?.priority === 'low'
            ? 'low'
            : 'medium',
      timeout: STYLE_PROCESSING_CONSTANTS.TARGET_PROCESSING_TIME,
      batchSize: Math.min(images.length, 10),
      qualityLevel: options?.quality || 'balanced',
      cacheEnabled: options?.cacheEnabled !== false,
      parallelWorkers: Math.min(
        images.length,
        STYLE_PROCESSING_CONSTANTS.DEFAULT_MAX_WORKERS,
      ),
    };

    const result = await this.processingEngine.processPortfolioImages(
      images,
      processingOptions,
    );

    const processedResult = {
      vectors: result.processedVectors,
      processingTime: performance.now() - startTime,
      cacheHitRatio: result.performance.cacheHitRatio,
      qualityMetrics: {
        accuracy: result.quality.accuracy,
        confidence: result.quality.confidence,
        colorAccuracy: result.metadata.colorAccuracy,
      },
    };

    // Cache the result for future use
    if (options?.cacheEnabled !== false) {
      await this.cacheManager.set(cacheKey, processedResult, {
        ttl: STYLE_PROCESSING_CONSTANTS.DEFAULT_CACHE_TTL * 2, // Longer TTL for portfolios
        tags: [
          'portfolio',
          weddingContext.style || 'default',
          weddingContext.venue || 'default',
        ],
        priority: 'normal',
        computationTime: processedResult.processingTime,
      });
    }

    // Record performance metrics
    await this.performanceMonitor.trackProcessingPerformance(
      `portfolio-${Date.now()}`,
      startTime,
      performance.now(),
      result,
    );

    return processedResult;
  }

  /**
   * Find similar wedding styles with optimized vector search
   */
  async findSimilarWeddingStyles(
    queryVector: StyleVector,
    candidateVectors: StyleVector[],
    matchingCriteria?: {
      styleWeight?: number;
      venueWeight?: number;
      seasonWeight?: number;
      formalityWeight?: number;
    },
    limit: number = 20,
  ): Promise<{
    matches: Array<{
      vector: StyleVector;
      similarity: number;
      weddingCompatibility: number;
    }>;
    searchTime: number;
    confidence: number;
  }> {
    const searchResult = await this.vectorManager.optimizeSimilaritySearch(
      queryVector,
      candidateVectors,
    );

    // Apply wedding-specific scoring
    const weddingMatches = searchResult.matches
      .slice(0, limit)
      .map((match) => ({
        vector: match.vector,
        similarity: match.similarity,
        weddingCompatibility: this.calculateWeddingCompatibility(
          queryVector,
          match.vector,
          matchingCriteria,
        ),
      }));

    // Re-sort by wedding compatibility
    weddingMatches.sort(
      (a, b) => b.weddingCompatibility - a.weddingCompatibility,
    );

    return {
      matches: weddingMatches,
      searchTime: searchResult.searchTime,
      confidence: searchResult.confidence,
    };
  }

  /**
   * Alias for findSimilarWeddingStyles for backward compatibility
   */
  async findSimilarStyles(
    queryVector: StyleVector,
    candidateVectors: StyleVector[],
    options?: { limit?: number },
  ) {
    return this.findSimilarWeddingStyles(
      queryVector,
      candidateVectors,
      {},
      options?.limit || 10,
    );
  }

  /**
   * Optimize image batch for wedding processing
   */
  async optimizeWeddingImages(
    images: string[],
    weddingStyle: string,
    deliveryFormat: 'web' | 'print' | 'social',
  ): Promise<{
    optimizedImages: ProcessedImage[];
    totalCompressionRatio: number;
    qualityScore: number;
    processingTime: number;
  }> {
    // Define optimization parameters based on wedding context and delivery format
    const optimizations: ImageOptimization[] = images.map(() => ({
      format:
        deliveryFormat === 'web'
          ? 'webp'
          : deliveryFormat === 'print'
            ? 'jpeg'
            : 'jpeg',
      quality:
        deliveryFormat === 'print' ? 95 : deliveryFormat === 'web' ? 85 : 80,
      progressive: true,
      lossless: deliveryFormat === 'print',
    }));

    const result = await this.imageOptimizer.processImageBatch(
      images,
      optimizations,
    );

    return {
      optimizedImages: result.processedImages,
      totalCompressionRatio: result.compressionRatio,
      qualityScore: result.qualityScore,
      processingTime: result.totalProcessingTime,
    };
  }

  /**
   * Alias for optimizeWeddingImages for backward compatibility
   */
  async optimizeForWeddingContext(
    images: string[],
    weddingContext: {
      style?: string;
      venue?: string;
      lighting?: string;
    },
  ) {
    return this.optimizeWeddingImages(
      images,
      weddingContext.style || 'modern',
      'web',
    );
  }

  /**
   * Get comprehensive system metrics (alias for getPerformanceMetrics)
   */
  async getSystemMetrics() {
    const performanceMetrics = this.getPerformanceMetrics();
    return {
      cache: performanceMetrics.cache,
      workers: performanceMetrics.workerPool,
    };
  }

  /**
   * Get comprehensive performance metrics
   */
  getPerformanceMetrics(): {
    processing: any;
    vector: any;
    cache: CacheStats;
    workerPool: PoolMetrics;
    overall: {
      systemHealth: 'healthy' | 'degraded' | 'critical';
      recommendedActions: string[];
    };
  } {
    const processingStatus = this.processingEngine.getProcessingStatus();
    const vectorStats = this.vectorManager.getPerformanceStats();
    const cacheStats = this.cacheManager.getStats();
    const poolMetrics = this.workerPool.getPoolMetrics();

    // Determine overall system health
    let systemHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
    const recommendations: string[] = [];

    if (
      processingStatus.performanceMetrics.averageProcessingTime >
      STYLE_PROCESSING_CONSTANTS.TARGET_PROCESSING_TIME
    ) {
      systemHealth = 'degraded';
      recommendations.push(
        'Processing time exceeds target - consider scaling up workers',
      );
    }

    if (
      cacheStats.hitRatio < STYLE_PROCESSING_CONSTANTS.TARGET_CACHE_HIT_RATIO
    ) {
      systemHealth = 'degraded';
      recommendations.push(
        'Low cache hit ratio - consider increasing cache size or TTL',
      );
    }

    if (poolMetrics.errorRate > 0.1) {
      systemHealth = 'critical';
      recommendations.push(
        'High error rate detected - investigate worker stability',
      );
    }

    return {
      processing: processingStatus,
      vector: vectorStats,
      cache: cacheStats,
      workerPool: poolMetrics,
      overall: {
        systemHealth,
        recommendedActions: recommendations,
      },
    };
  }

  // Private utility methods

  private generatePortfolioCacheKey(images: string[], context: any): string {
    const imageHash = images.sort().join('|').substring(0, 50);
    const contextHash = JSON.stringify(context).substring(0, 20);
    return `portfolio:${imageHash}:${contextHash}`;
  }

  private calculateWeddingCompatibility(
    queryVector: StyleVector,
    candidateVector: StyleVector,
    criteria?: {
      styleWeight?: number;
      venueWeight?: number;
      seasonWeight?: number;
      formalityWeight?: number;
    },
  ): number {
    const weights = {
      styleWeight: criteria?.styleWeight || 0.4,
      venueWeight: criteria?.venueWeight || 0.3,
      seasonWeight: criteria?.seasonWeight || 0.2,
      formalityWeight: criteria?.formalityWeight || 0.1,
    };

    let compatibility = 0;

    // Style compatibility
    if (queryVector.metadata.style === candidateVector.metadata.style) {
      compatibility += weights.styleWeight;
    }

    // Venue compatibility
    if (queryVector.metadata.venue === candidateVector.metadata.venue) {
      compatibility += weights.venueWeight;
    }

    // Season compatibility
    if (queryVector.metadata.season === candidateVector.metadata.season) {
      compatibility += weights.seasonWeight;
    }

    // Formality compatibility
    if (queryVector.metadata.formality === candidateVector.metadata.formality) {
      compatibility += weights.formalityWeight;
    }

    return Math.min(1, compatibility);
  }

  /**
   * Shutdown all components gracefully
   */
  async shutdown(): Promise<void> {
    await this.processingEngine.shutdown();
    await this.workerPool.shutdown();
    this.performanceMonitor.cleanup();
    this.cacheManager.destroy();
  }
}

// Convenience function to get the optimized processor instance
export const getStyleProcessor = (): StyleProcessingOptimizer => {
  return StyleProcessingOptimizer.getInstance();
};

// Wedding Industry Utilities
export const WeddingStyleUtils = {
  /**
   * Get recommended processing settings for wedding style
   */
  getOptimalProcessingSettings(weddingStyle: string): ProcessingOptions {
    const styleSettings: Record<string, ProcessingOptions> = {
      romantic: {
        priority: 'high',
        timeout: 3000,
        batchSize: 8,
        qualityLevel: 'high',
        cacheEnabled: true,
        parallelWorkers: 4,
      },
      rustic: {
        priority: 'medium',
        timeout: 2500,
        batchSize: 10,
        qualityLevel: 'balanced',
        cacheEnabled: true,
        parallelWorkers: 6,
      },
      modern: {
        priority: 'medium',
        timeout: 2000,
        batchSize: 12,
        qualityLevel: 'balanced',
        cacheEnabled: true,
        parallelWorkers: 8,
      },
      vintage: {
        priority: 'high',
        timeout: 3500,
        batchSize: 6,
        qualityLevel: 'high',
        cacheEnabled: true,
        parallelWorkers: 4,
      },
    };

    return styleSettings[weddingStyle] || styleSettings.modern;
  },

  /**
   * Generate wedding-specific cache tags
   */
  generateCacheTags(weddingContext: {
    style?: string;
    venue?: string;
    season?: string;
    formality?: string;
    weddingType?: string;
  }): string[] {
    const tags: string[] = ['wedding'];

    if (weddingContext.style) tags.push(`style:${weddingContext.style}`);
    if (weddingContext.venue) tags.push(`venue:${weddingContext.venue}`);
    if (weddingContext.season) tags.push(`season:${weddingContext.season}`);
    if (weddingContext.formality)
      tags.push(`formality:${weddingContext.formality}`);
    if (weddingContext.weddingType)
      tags.push(`type:${weddingContext.weddingType}`);

    return tags;
  },

  /**
   * Validate wedding context parameters
   */
  validateWeddingContext(context: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (
      context.style &&
      !STYLE_PROCESSING_CONSTANTS.WEDDING_STYLES.includes(context.style)
    ) {
      errors.push(`Invalid wedding style: ${context.style}`);
    }

    if (
      context.venue &&
      !STYLE_PROCESSING_CONSTANTS.WEDDING_VENUES.includes(context.venue)
    ) {
      errors.push(`Invalid venue type: ${context.venue}`);
    }

    if (
      context.season &&
      !STYLE_PROCESSING_CONSTANTS.WEDDING_SEASONS.includes(context.season)
    ) {
      errors.push(`Invalid season: ${context.season}`);
    }

    if (
      context.formality &&
      !STYLE_PROCESSING_CONSTANTS.FORMALITY_LEVELS.includes(context.formality)
    ) {
      errors.push(`Invalid formality level: ${context.formality}`);
    }

    return { valid: errors.length === 0, errors };
  },
};

// Performance Testing Utilities
export const PerformanceTestUtils = {
  /**
   * Run performance benchmark for style processing
   */
  async runPerformanceBenchmark(
    testImages: string[],
    iterations: number = 10,
  ): Promise<{
    averageProcessingTime: number;
    p95ProcessingTime: number;
    throughput: number;
    errorRate: number;
    memoryUsage: { average: number; peak: number };
  }> {
    const processor = getStyleProcessor();
    const results: number[] = [];
    const memorySnapshots: number[] = [];
    let errors = 0;

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      const startMemory = process.memoryUsage().heapUsed;

      try {
        await processor.processWeddingPortfolio(
          testImages,
          { style: 'modern', venue: 'garden', season: 'spring' },
          { priority: 'normal', quality: 'balanced' },
        );

        const endTime = performance.now();
        const endMemory = process.memoryUsage().heapUsed;

        results.push(endTime - startTime);
        memorySnapshots.push(endMemory - startMemory);
      } catch (error) {
        errors++;
      }
    }

    const sortedResults = results.sort((a, b) => a - b);
    const averageProcessingTime =
      results.reduce((sum, time) => sum + time, 0) / results.length;
    const p95ProcessingTime = sortedResults[Math.floor(results.length * 0.95)];
    const throughput = testImages.length / (averageProcessingTime / 1000); // images per second

    return {
      averageProcessingTime,
      p95ProcessingTime,
      throughput,
      errorRate: errors / iterations,
      memoryUsage: {
        average:
          memorySnapshots.reduce((sum, mem) => sum + mem, 0) /
          memorySnapshots.length,
        peak: Math.max(...memorySnapshots),
      },
    };
  },
};

// Export the main processor instance
export default StyleProcessingOptimizer;
