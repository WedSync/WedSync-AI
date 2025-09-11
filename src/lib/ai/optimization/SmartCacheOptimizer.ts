/**
 * WS-240: Smart Cache Optimizer for AI Cost Optimization
 *
 * Advanced caching system that uses semantic similarity and exact matching
 * to dramatically reduce AI costs for wedding suppliers.
 *
 * Target: 70%+ cache hit rate for 80% cost savings on cached requests
 *
 * Features:
 * - Semantic similarity caching using vector embeddings
 * - Exact match caching for repeated queries
 * - TTL optimization based on content freshness
 * - Wedding-specific caching strategies
 * - Cache performance analytics and auto-optimization
 */

import {
  CacheService,
  CACHE_PREFIXES,
  CACHE_TTL,
} from '@/lib/cache/redis-client';
import { createHash } from 'crypto';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// Types and interfaces
export interface CacheConfig {
  exact: boolean;
  semantic: boolean;
  ttlHours: number;
  similarityThreshold: number;
  maxCacheSize: number; // MB
  compressionEnabled: boolean;
  weddingContextAware: boolean;
}

export interface CacheSavings {
  supplierId: string;
  featureType: string;
  timeframe: 'daily' | 'weekly' | 'monthly';
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  costSavings: number;
  avgSavingsPerHit: number;
  topCachedPatterns: string[];
}

export interface OptimizedCacheConfig {
  recommendedTtl: number;
  recommendedSimilarityThreshold: number;
  enabledStrategies: string[];
  estimatedHitRateImprovement: number;
  estimatedCostSavings: number;
  reasoning: string[];
}

export interface SemanticCacheEntry {
  id: string;
  supplierId: string;
  featureType: string;
  cacheKey: string;
  embedding: number[];
  prompt: string;
  response: string;
  metadata: {
    model: string;
    cost: number;
    tokens: { input: number; output: number };
    qualityScore: number;
    weddingContext?: {
      season?: string;
      venue?: string;
      theme?: string;
      guestCount?: number;
    };
  };
  createdAt: Date;
  expiresAt: Date;
  hitCount: number;
  lastHit: Date;
  similarity?: number; // For search results
}

export interface CacheMetrics {
  totalSize: number; // MB
  entryCount: number;
  hitRate: number;
  averageRetrievalTime: number; // ms
  costSavings: number;
  topPerformingPatterns: Array<{
    pattern: string;
    hitCount: number;
    savings: number;
  }>;
  seasonalTrends: Record<string, number>;
}

export class SmartCacheOptimizer {
  private supabase: any;
  private openai: OpenAI;
  private readonly CACHE_PREFIX = CACHE_PREFIXES.ML_PREDICTION;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
  }

  /**
   * Check cache for semantic or exact matches
   */
  async checkSemanticCache(
    supplierId: string,
    featureType: string,
    prompt: string,
    config: CacheConfig,
  ): Promise<SemanticCacheEntry | null> {
    try {
      const startTime = Date.now();

      // First check exact match cache
      if (config.exact) {
        const exactMatch = await this.checkExactCache(
          supplierId,
          featureType,
          prompt,
        );
        if (exactMatch) {
          await this.recordCacheHit(
            supplierId,
            featureType,
            'exact',
            Date.now() - startTime,
          );
          return exactMatch;
        }
      }

      // Then check semantic similarity cache
      if (config.semantic) {
        const semanticMatch = await this.findSemanticMatch(
          supplierId,
          featureType,
          prompt,
          config.similarityThreshold,
        );

        if (semanticMatch) {
          await this.recordCacheHit(
            supplierId,
            featureType,
            'semantic',
            Date.now() - startTime,
          );
          return semanticMatch;
        }
      }

      await this.recordCacheMiss(
        supplierId,
        featureType,
        Date.now() - startTime,
      );
      return null;
    } catch (error) {
      console.error('Cache check failed:', error);
      return null;
    }
  }

  /**
   * Store AI response with optimization strategies
   */
  async storeWithOptimization(
    supplierId: string,
    featureType: string,
    prompt: string,
    response: string,
    metadata: any,
    config: CacheConfig,
  ): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(supplierId, featureType, prompt);

      // Store exact match cache
      if (config.exact) {
        await this.storeExactCache(
          cacheKey,
          response,
          metadata,
          config.ttlHours,
        );
      }

      // Store semantic cache with embeddings
      if (config.semantic) {
        await this.storeSemanticCache(
          supplierId,
          featureType,
          prompt,
          response,
          metadata,
          config,
        );
      }

      // Update cache analytics
      await this.updateCacheAnalytics(
        supplierId,
        featureType,
        cacheKey,
        metadata.cost,
      );
    } catch (error) {
      console.error('Cache storage failed:', error);
    }
  }

  /**
   * Calculate cache hit savings for a supplier
   */
  async calculateCacheHitSavings(
    supplierId: string,
    featureType: string,
    timeframe: 'daily' | 'weekly' | 'monthly',
  ): Promise<CacheSavings> {
    try {
      const days = timeframe === 'daily' ? 1 : timeframe === 'weekly' ? 7 : 30;
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      // Get cache analytics from database
      const { data: analytics, error } = await this.supabase
        .from('ai_cache_analytics')
        .select('*')
        .eq('supplier_id', supplierId)
        .eq('feature_type', featureType)
        .gte('created_at', fromDate.toISOString());

      if (error) {
        throw error;
      }

      // Calculate metrics
      const totalHits =
        analytics?.reduce(
          (sum: number, entry: any) => sum + entry.hit_count,
          0,
        ) || 0;
      const totalSavings =
        analytics?.reduce(
          (sum: number, entry: any) => sum + parseFloat(entry.cost_savings),
          0,
        ) || 0;

      // Get total requests from cost tracking
      const { data: costTracking } = await this.supabase
        .from('ai_cost_tracking')
        .select('api_calls, cache_hits, cache_misses')
        .eq('supplier_id', supplierId)
        .eq('feature_type', featureType)
        .gte('date', fromDate.toISOString().split('T')[0]);

      const totalRequests =
        costTracking?.reduce(
          (sum: number, entry: any) => sum + entry.api_calls,
          0,
        ) || 0;
      const cacheHits =
        costTracking?.reduce(
          (sum: number, entry: any) => sum + entry.cache_hits,
          0,
        ) || 0;
      const cacheMisses =
        costTracking?.reduce(
          (sum: number, entry: any) => sum + entry.cache_misses,
          0,
        ) || 0;

      const hitRate = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;
      const avgSavingsPerHit = cacheHits > 0 ? totalSavings / cacheHits : 0;

      // Get top cached patterns (simplified - in production would use more sophisticated analysis)
      const topPatterns = this.extractTopCachedPatterns(analytics);

      return {
        supplierId,
        featureType,
        timeframe,
        totalRequests,
        cacheHits,
        cacheMisses,
        hitRate,
        costSavings: totalSavings,
        avgSavingsPerHit,
        topCachedPatterns: topPatterns,
      };
    } catch (error) {
      console.error('Cache savings calculation failed:', error);
      throw error;
    }
  }

  /**
   * Optimize cache strategy based on usage patterns
   */
  async optimizeCacheStrategy(
    supplierId: string,
    featureType: string,
    currentConfig: CacheConfig,
  ): Promise<OptimizedCacheConfig> {
    try {
      // Analyze current cache performance
      const savings = await this.calculateCacheHitSavings(
        supplierId,
        featureType,
        'monthly',
      );
      const metrics = await this.getCacheMetrics(supplierId, featureType);

      const reasoning: string[] = [];
      const recommendations: Partial<CacheConfig> = {};

      // Optimize TTL based on content freshness patterns
      const recommendedTtl = await this.optimizeTTL(supplierId, featureType);
      if (recommendedTtl !== currentConfig.ttlHours) {
        reasoning.push(
          `Recommended TTL change from ${currentConfig.ttlHours}h to ${recommendedTtl}h based on content usage patterns`,
        );
        recommendations.ttlHours = recommendedTtl;
      }

      // Optimize similarity threshold based on hit rate vs quality
      const recommendedThreshold = await this.optimizeSimilarityThreshold(
        supplierId,
        featureType,
        savings.hitRate,
      );
      if (
        Math.abs(recommendedThreshold - currentConfig.similarityThreshold) >
        0.05
      ) {
        reasoning.push(
          `Similarity threshold adjustment from ${currentConfig.similarityThreshold} to ${recommendedThreshold} for better hit rate`,
        );
        recommendations.similarityThreshold = recommendedThreshold;
      }

      // Enable/disable strategies based on performance
      const enabledStrategies: string[] = [];

      if (savings.hitRate < 30) {
        // Low hit rate - enable more aggressive caching
        if (!currentConfig.semantic) {
          enabledStrategies.push('semantic');
          reasoning.push('Enable semantic caching to improve low hit rate');
        }

        // Consider lowering similarity threshold
        if (currentConfig.similarityThreshold > 0.75) {
          recommendations.similarityThreshold = 0.75;
          reasoning.push('Lower similarity threshold to capture more matches');
        }
      } else if (savings.hitRate > 80) {
        // High hit rate - optimize for quality
        if (currentConfig.similarityThreshold < 0.9) {
          recommendations.similarityThreshold = 0.9;
          reasoning.push(
            'Increase similarity threshold for higher quality matches',
          );
        }
      }

      // Wedding-specific optimizations
      await this.addWeddingSpecificOptimizations(
        supplierId,
        featureType,
        recommendations,
        reasoning,
      );

      // Calculate estimated improvements
      const estimatedHitRateImprovement = this.estimateHitRateImprovement(
        currentConfig,
        recommendations,
        savings,
      );
      const estimatedCostSavings = this.estimateAdditionalSavings(
        estimatedHitRateImprovement,
        savings,
      );

      return {
        recommendedTtl: recommendations.ttlHours || currentConfig.ttlHours,
        recommendedSimilarityThreshold:
          recommendations.similarityThreshold ||
          currentConfig.similarityThreshold,
        enabledStrategies,
        estimatedHitRateImprovement,
        estimatedCostSavings,
        reasoning,
      };
    } catch (error) {
      console.error('Cache optimization failed:', error);
      throw error;
    }
  }

  /**
   * Check exact match cache
   */
  private async checkExactCache(
    supplierId: string,
    featureType: string,
    prompt: string,
  ): Promise<SemanticCacheEntry | null> {
    try {
      const cacheKey = this.generateCacheKey(supplierId, featureType, prompt);
      const cached = await CacheService.get(cacheKey);

      if (cached) {
        return {
          id: cacheKey,
          supplierId,
          featureType,
          cacheKey,
          embedding: [], // No embedding for exact match
          prompt,
          response: cached.response,
          metadata: cached.metadata,
          createdAt: new Date(cached.createdAt),
          expiresAt: new Date(cached.expiresAt),
          hitCount: cached.hitCount + 1,
          lastHit: new Date(),
          similarity: 1.0, // Exact match
        };
      }

      return null;
    } catch (error) {
      console.error('Exact cache check failed:', error);
      return null;
    }
  }

  /**
   * Find semantic match using vector similarity
   */
  private async findSemanticMatch(
    supplierId: string,
    featureType: string,
    prompt: string,
    similarityThreshold: number,
  ): Promise<SemanticCacheEntry | null> {
    try {
      // Generate embedding for the prompt
      const queryEmbedding = await this.generateEmbedding(prompt);
      if (!queryEmbedding.length) return null;

      // Get recent semantic cache entries
      const { data: entries, error } = await this.supabase
        .from('ai_cache_analytics')
        .select('*')
        .eq('supplier_id', supplierId)
        .eq('feature_type', featureType)
        .eq('cache_type', 'semantic')
        .gt('expires_at', new Date().toISOString())
        .order('last_hit', { ascending: false })
        .limit(20); // Check top 20 most recent entries

      if (error || !entries?.length) return null;

      // Find best semantic match
      let bestMatch: any = null;
      let bestSimilarity = 0;

      for (const entry of entries) {
        try {
          // Get cached content
          const cachedData = await CacheService.get(entry.cache_key_hash);
          if (!cachedData) continue;

          // Calculate similarity (simplified - in production use vector database)
          const similarity = await this.calculateVectorSimilarity(
            queryEmbedding,
            cachedData.embedding || [],
          );

          if (
            similarity >= similarityThreshold &&
            similarity > bestSimilarity
          ) {
            bestSimilarity = similarity;
            bestMatch = {
              entry,
              cachedData,
              similarity,
            };
          }
        } catch (entryError) {
          console.error('Error processing cache entry:', entryError);
          continue;
        }
      }

      if (bestMatch) {
        // Update hit count
        await this.updateCacheHitCount(bestMatch.entry.cache_key_hash);

        return {
          id: bestMatch.entry.cache_key_hash,
          supplierId,
          featureType,
          cacheKey: bestMatch.entry.cache_key_hash,
          embedding: bestMatch.cachedData.embedding || [],
          prompt: bestMatch.cachedData.prompt,
          response: bestMatch.cachedData.response,
          metadata: bestMatch.cachedData.metadata,
          createdAt: new Date(bestMatch.entry.created_at),
          expiresAt: new Date(bestMatch.entry.expires_at),
          hitCount: bestMatch.entry.hit_count + 1,
          lastHit: new Date(),
          similarity: bestMatch.similarity,
        };
      }

      return null;
    } catch (error) {
      console.error('Semantic match search failed:', error);
      return null;
    }
  }

  /**
   * Store exact cache entry
   */
  private async storeExactCache(
    cacheKey: string,
    response: string,
    metadata: any,
    ttlHours: number,
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + ttlHours);

    const cacheData = {
      response,
      metadata,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      hitCount: 0,
      cacheType: 'exact',
    };

    await CacheService.set(cacheKey, cacheData, ttlHours * 3600);
  }

  /**
   * Store semantic cache entry with embedding
   */
  private async storeSemanticCache(
    supplierId: string,
    featureType: string,
    prompt: string,
    response: string,
    metadata: any,
    config: CacheConfig,
  ): Promise<void> {
    try {
      // Generate embedding for semantic similarity
      const embedding = await this.generateEmbedding(prompt);
      if (!embedding.length) return;

      const cacheKey = this.generateSemanticCacheKey(
        supplierId,
        featureType,
        prompt,
      );
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + config.ttlHours);

      // Store in Redis cache
      const cacheData = {
        prompt,
        response,
        embedding,
        metadata,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        hitCount: 0,
        cacheType: 'semantic',
      };

      await CacheService.set(cacheKey, cacheData, config.ttlHours * 3600);

      // Store metadata in database for analytics
      await this.supabase.from('ai_cache_analytics').insert({
        supplier_id: supplierId,
        cache_key_hash: cacheKey,
        feature_type: featureType,
        cache_type: 'semantic',
        hit_count: 0,
        cost_savings: 0,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Semantic cache storage failed:', error);
    }
  }

  /**
   * Generate embedding using OpenAI
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.substring(0, 8000), // Limit input size
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Embedding generation failed:', error);
      return [];
    }
  }

  /**
   * Calculate vector similarity (cosine similarity)
   */
  private async calculateVectorSimilarity(
    vector1: number[],
    vector2: number[],
  ): Promise<number> {
    if (
      !vector1.length ||
      !vector2.length ||
      vector1.length !== vector2.length
    ) {
      return 0;
    }

    try {
      let dotProduct = 0;
      let norm1 = 0;
      let norm2 = 0;

      for (let i = 0; i < vector1.length; i++) {
        dotProduct += vector1[i] * vector2[i];
        norm1 += vector1[i] * vector1[i];
        norm2 += vector2[i] * vector2[i];
      }

      if (norm1 === 0 || norm2 === 0) return 0;

      return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    } catch (error) {
      console.error('Vector similarity calculation failed:', error);
      return 0;
    }
  }

  /**
   * Generate cache key for exact matching
   */
  private generateCacheKey(
    supplierId: string,
    featureType: string,
    prompt: string,
  ): string {
    const keyData = `${supplierId}:${featureType}:${prompt}`;
    return `${this.CACHE_PREFIX}exact:${createHash('sha256').update(keyData).digest('hex')}`;
  }

  /**
   * Generate cache key for semantic matching
   */
  private generateSemanticCacheKey(
    supplierId: string,
    featureType: string,
    prompt: string,
  ): string {
    const timestamp = Date.now();
    const keyData = `${supplierId}:${featureType}:${prompt}:${timestamp}`;
    return `${this.CACHE_PREFIX}semantic:${createHash('sha256').update(keyData).digest('hex')}`;
  }

  /**
   * Record cache hit analytics
   */
  private async recordCacheHit(
    supplierId: string,
    featureType: string,
    cacheType: 'exact' | 'semantic',
    responseTime: number,
  ): Promise<void> {
    // Implementation would update cache hit metrics
  }

  /**
   * Record cache miss analytics
   */
  private async recordCacheMiss(
    supplierId: string,
    featureType: string,
    responseTime: number,
  ): Promise<void> {
    // Implementation would update cache miss metrics
  }

  /**
   * Update cache analytics in database
   */
  private async updateCacheAnalytics(
    supplierId: string,
    featureType: string,
    cacheKey: string,
    cost: number,
  ): Promise<void> {
    // Implementation would update analytics
  }

  /**
   * Update cache hit count
   */
  private async updateCacheHitCount(cacheKey: string): Promise<void> {
    try {
      await this.supabase
        .from('ai_cache_analytics')
        .update({
          hit_count: this.supabase.raw('hit_count + 1'),
          last_hit: new Date().toISOString(),
        })
        .eq('cache_key_hash', cacheKey);
    } catch (error) {
      console.error('Cache hit count update failed:', error);
    }
  }

  /**
   * Extract top cached patterns from analytics
   */
  private extractTopCachedPatterns(analytics: any[]): string[] {
    // Simplified implementation - would analyze common patterns
    return [
      'wedding photography styles',
      'venue descriptions',
      'menu suggestions',
    ];
  }

  /**
   * Get cache metrics for a supplier
   */
  private async getCacheMetrics(
    supplierId: string,
    featureType: string,
  ): Promise<CacheMetrics> {
    // Implementation would calculate comprehensive cache metrics
    return {
      totalSize: 0,
      entryCount: 0,
      hitRate: 0,
      averageRetrievalTime: 0,
      costSavings: 0,
      topPerformingPatterns: [],
      seasonalTrends: {},
    };
  }

  /**
   * Additional helper methods for optimization
   */
  private async optimizeTTL(
    supplierId: string,
    featureType: string,
  ): Promise<number> {
    // Analyze content freshness patterns and recommend optimal TTL
    return 24; // Default 24 hours
  }

  private async optimizeSimilarityThreshold(
    supplierId: string,
    featureType: string,
    currentHitRate: number,
  ): Promise<number> {
    // Optimize threshold based on hit rate vs quality trade-off
    if (currentHitRate < 30) return 0.75; // Lower threshold for better hit rate
    if (currentHitRate > 80) return 0.9; // Higher threshold for better quality
    return 0.85; // Balanced default
  }

  private async addWeddingSpecificOptimizations(
    supplierId: string,
    featureType: string,
    recommendations: Partial<CacheConfig>,
    reasoning: string[],
  ): Promise<void> {
    // Add wedding industry specific cache optimizations
    const currentMonth = new Date().getMonth() + 1;
    const isPeakSeason = currentMonth >= 3 && currentMonth <= 10;

    if (isPeakSeason) {
      // During peak wedding season, increase cache TTL to handle higher load
      if (!recommendations.ttlHours || recommendations.ttlHours < 48) {
        recommendations.ttlHours = 48;
        reasoning.push(
          'Extended TTL during peak wedding season for better performance',
        );
      }
    }

    // Feature-specific optimizations
    if (featureType === 'venue_descriptions' || featureType === 'photo_ai') {
      // These tend to have more reusable content
      if (
        !recommendations.similarityThreshold ||
        recommendations.similarityThreshold > 0.8
      ) {
        recommendations.similarityThreshold = 0.8;
        reasoning.push(
          `Lower similarity threshold for ${featureType} due to high content reusability`,
        );
      }
    }
  }

  private estimateHitRateImprovement(
    currentConfig: CacheConfig,
    recommendations: Partial<CacheConfig>,
    currentSavings: CacheSavings,
  ): number {
    // Estimate hit rate improvement based on configuration changes
    let improvement = 0;

    if (
      recommendations.similarityThreshold &&
      recommendations.similarityThreshold < currentConfig.similarityThreshold
    ) {
      improvement += 15; // Lower threshold typically increases hit rate
    }

    if (
      recommendations.ttlHours &&
      recommendations.ttlHours > currentConfig.ttlHours
    ) {
      improvement += 10; // Longer TTL keeps more entries cached
    }

    return Math.min(improvement, 50); // Cap at 50% improvement
  }

  private estimateAdditionalSavings(
    hitRateImprovement: number,
    currentSavings: CacheSavings,
  ): number {
    // Estimate additional cost savings from improved hit rate
    const currentMonthlyCost =
      currentSavings.costSavings / (currentSavings.hitRate / 100);
    const additionalSavings =
      currentMonthlyCost * (hitRateImprovement / 100) * 0.8; // 80% savings on cache hits
    return additionalSavings;
  }
}
