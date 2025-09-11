/**
 * WS-241 AI Caching Strategy System - Vendor-Specific Cache Optimization
 * Optimizes caching strategies for different wedding vendor types
 * Team B - Backend Infrastructure & API Development
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  WeddingContext,
  CacheType,
  WeddingSeason,
} from './WeddingAICacheService';

export type VendorType =
  | 'venue'
  | 'photographer'
  | 'caterer'
  | 'florist'
  | 'dj_band'
  | 'videographer'
  | 'planner'
  | 'baker'
  | 'decorator'
  | 'transportation'
  | 'officiant'
  | 'hair_makeup';

export interface VendorCacheStrategy {
  vendorType: VendorType;
  cacheType: CacheType;
  baseTTL: number;
  maxCacheSize: number;
  preloadTriggers: string[];
  targetHitRate: number;
  maxResponseTimeMs: number;
  costPerMissCents: number;
  seasonalMultipliers: Record<WeddingSeason, number>;
  priorityScore: number; // 0-100, higher = more important to cache
}

export interface VendorCachePerformance {
  vendorType: VendorType;
  cacheType: CacheType;
  hitRate: number;
  avgResponseTimeMs: number;
  totalQueries: number;
  costSavedCents: number;
  recommendedAdjustments: {
    ttlAdjustment: number;
    cacheSizeAdjustment: number;
    preloadFrequency: string;
  };
}

export interface VendorMarketInsights {
  vendorType: VendorType;
  popularityByRegion: Record<string, number>;
  seasonalDemand: Record<WeddingSeason, number>;
  averageBookingLeadTime: number; // days
  priceVolatility: number; // 0-1, higher = more volatile
  availabilityFluctuation: number; // 0-1, higher = changes more frequently
}

/**
 * Vendor Cache Optimizer
 * Manages vendor-specific caching strategies and optimizations
 */
export class VendorCacheOptimizer {
  private supabase: SupabaseClient;

  // Vendor-specific caching strategies based on wedding industry patterns
  private readonly VENDOR_STRATEGIES: VendorCacheStrategy[] = [
    {
      vendorType: 'venue',
      cacheType: 'venue_recommendations',
      baseTTL: 86400, // 24 hours - venues change availability slowly
      maxCacheSize: 50000, // Large cache for venue data
      preloadTriggers: [
        'availability_check',
        'pricing_inquiry',
        'tour_request',
      ],
      targetHitRate: 0.85,
      maxResponseTimeMs: 150,
      costPerMissCents: 25, // Higher cost for venue searches
      seasonalMultipliers: { spring: 1.0, summer: 0.8, fall: 0.9, winter: 1.2 },
      priorityScore: 95, // Very high priority
    },
    {
      vendorType: 'photographer',
      cacheType: 'vendor_matching',
      baseTTL: 43200, // 12 hours - photographers book quickly
      maxCacheSize: 30000,
      preloadTriggers: [
        'portfolio_view',
        'availability_check',
        'style_matching',
      ],
      targetHitRate: 0.8,
      maxResponseTimeMs: 200,
      costPerMissCents: 20,
      seasonalMultipliers: { spring: 0.9, summer: 0.7, fall: 0.8, winter: 1.1 },
      priorityScore: 90,
    },
    {
      vendorType: 'caterer',
      cacheType: 'menu_suggestions',
      baseTTL: 21600, // 6 hours - menu prices and availability fluctuate
      maxCacheSize: 25000,
      preloadTriggers: ['menu_request', 'dietary_filter', 'guest_count_change'],
      targetHitRate: 0.75,
      maxResponseTimeMs: 250,
      costPerMissCents: 15,
      seasonalMultipliers: { spring: 1.0, summer: 0.8, fall: 0.9, winter: 1.1 },
      priorityScore: 85,
    },
    {
      vendorType: 'florist',
      cacheType: 'decor_inspiration',
      baseTTL: 14400, // 4 hours - seasonal flower availability changes rapidly
      maxCacheSize: 20000,
      preloadTriggers: ['seasonal_flowers', 'color_scheme', 'budget_range'],
      targetHitRate: 0.7,
      maxResponseTimeMs: 300,
      costPerMissCents: 12,
      seasonalMultipliers: { spring: 0.7, summer: 0.8, fall: 0.6, winter: 1.2 },
      priorityScore: 75,
    },
    {
      vendorType: 'dj_band',
      cacheType: 'vendor_matching',
      baseTTL: 28800, // 8 hours - availability changes moderately
      maxCacheSize: 15000,
      preloadTriggers: ['music_style', 'availability_check', 'equipment_needs'],
      targetHitRate: 0.75,
      maxResponseTimeMs: 200,
      costPerMissCents: 10,
      seasonalMultipliers: { spring: 1.0, summer: 0.8, fall: 0.9, winter: 1.1 },
      priorityScore: 70,
    },
    {
      vendorType: 'videographer',
      cacheType: 'photography_styles',
      baseTTL: 36000, // 10 hours
      maxCacheSize: 18000,
      preloadTriggers: ['portfolio_view', 'style_matching', 'package_inquiry'],
      targetHitRate: 0.78,
      maxResponseTimeMs: 250,
      costPerMissCents: 18,
      seasonalMultipliers: { spring: 0.9, summer: 0.7, fall: 0.8, winter: 1.1 },
      priorityScore: 80,
    },
    {
      vendorType: 'planner',
      cacheType: 'timeline_generation',
      baseTTL: 72000, // 20 hours - planning advice is more stable
      maxCacheSize: 35000,
      preloadTriggers: [
        'timeline_request',
        'vendor_coordination',
        'budget_planning',
      ],
      targetHitRate: 0.85,
      maxResponseTimeMs: 300,
      costPerMissCents: 22,
      seasonalMultipliers: { spring: 1.0, summer: 0.9, fall: 1.0, winter: 1.1 },
      priorityScore: 88,
    },
    {
      vendorType: 'baker',
      cacheType: 'menu_suggestions',
      baseTTL: 32400, // 9 hours
      maxCacheSize: 12000,
      preloadTriggers: ['cake_style', 'flavor_options', 'dietary_requirements'],
      targetHitRate: 0.72,
      maxResponseTimeMs: 200,
      costPerMissCents: 8,
      seasonalMultipliers: { spring: 1.0, summer: 0.9, fall: 1.0, winter: 1.0 },
      priorityScore: 65,
    },
    {
      vendorType: 'decorator',
      cacheType: 'decor_inspiration',
      baseTTL: 18000, // 5 hours - decor trends change frequently
      maxCacheSize: 22000,
      preloadTriggers: ['theme_selection', 'color_palette', 'venue_type'],
      targetHitRate: 0.7,
      maxResponseTimeMs: 250,
      costPerMissCents: 12,
      seasonalMultipliers: { spring: 0.8, summer: 0.9, fall: 0.8, winter: 1.1 },
      priorityScore: 70,
    },
    {
      vendorType: 'transportation',
      cacheType: 'vendor_matching',
      baseTTL: 25200, // 7 hours
      maxCacheSize: 8000,
      preloadTriggers: ['guest_count', 'location_distance', 'vehicle_type'],
      targetHitRate: 0.68,
      maxResponseTimeMs: 150,
      costPerMissCents: 6,
      seasonalMultipliers: { spring: 1.0, summer: 0.9, fall: 1.0, winter: 1.2 },
      priorityScore: 60,
    },
    {
      vendorType: 'officiant',
      cacheType: 'vendor_matching',
      baseTTL: 64800, // 18 hours - officiant matching is more stable
      maxCacheSize: 10000,
      preloadTriggers: ['ceremony_type', 'religious_preference', 'location'],
      targetHitRate: 0.8,
      maxResponseTimeMs: 200,
      costPerMissCents: 15,
      seasonalMultipliers: { spring: 1.0, summer: 0.9, fall: 1.0, winter: 1.1 },
      priorityScore: 75,
    },
    {
      vendorType: 'hair_makeup',
      cacheType: 'vendor_matching',
      baseTTL: 21600, // 6 hours - availability changes quickly
      maxCacheSize: 12000,
      preloadTriggers: [
        'style_preference',
        'trial_availability',
        'location_proximity',
      ],
      targetHitRate: 0.73,
      maxResponseTimeMs: 180,
      costPerMissCents: 10,
      seasonalMultipliers: { spring: 0.8, summer: 0.7, fall: 0.8, winter: 1.0 },
      priorityScore: 70,
    },
  ];

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Get optimized cache strategy for vendor type and context
   */
  getVendorCacheStrategy(
    vendorType: VendorType,
    cacheType: CacheType,
    context: WeddingContext,
  ): VendorCacheStrategy | null {
    const strategy = this.VENDOR_STRATEGIES.find(
      (s) => s.vendorType === vendorType && s.cacheType === cacheType,
    );

    if (!strategy) return null;

    // Apply contextual adjustments
    const season = this.getSeasonFromDate(context.weddingDate);
    const adjustedStrategy = {
      ...strategy,
      baseTTL: Math.round(
        strategy.baseTTL * strategy.seasonalMultipliers[season],
      ),
    };

    return adjustedStrategy;
  }

  /**
   * Calculate optimal TTL for vendor cache
   */
  calculateVendorTTL(
    vendorType: VendorType,
    cacheType: CacheType,
    context: WeddingContext,
    currentPerformance?: { hitRate: number; avgResponseTime: number },
  ): number {
    const strategy = this.getVendorCacheStrategy(
      vendorType,
      cacheType,
      context,
    );
    if (!strategy) return 21600; // Default 6 hours

    let ttl = strategy.baseTTL;

    // Adjust based on wedding urgency (closer to date = shorter TTL)
    const daysToWedding = Math.ceil(
      (context.weddingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    if (daysToWedding <= 30) {
      ttl = Math.round(ttl * 0.5); // Very urgent - shorter cache
    } else if (daysToWedding <= 90) {
      ttl = Math.round(ttl * 0.75); // Somewhat urgent
    }

    // Adjust based on current performance
    if (currentPerformance) {
      if (currentPerformance.hitRate < strategy.targetHitRate) {
        ttl = Math.round(ttl * 1.2); // Increase TTL to improve hit rate
      } else if (
        currentPerformance.avgResponseTime > strategy.maxResponseTimeMs
      ) {
        ttl = Math.round(ttl * 0.8); // Decrease TTL to improve freshness
      }
    }

    // Budget-based adjustments
    if (
      context.budgetRange === 'luxury' ||
      context.budgetRange === 'ultra_luxury'
    ) {
      ttl = Math.round(ttl * 0.8); // High-budget clients need fresher data
    }

    return Math.max(300, ttl); // Minimum 5 minutes
  }

  /**
   * Determine cache priority for vendor type
   */
  getVendorCachePriority(
    vendorType: VendorType,
    context: WeddingContext,
  ): number {
    const strategy = this.VENDOR_STRATEGIES.find(
      (s) => s.vendorType === vendorType,
    );
    let basePriority = strategy?.priorityScore || 50;

    // Adjust based on vendor preferences in context
    if (context.vendorPreferences.includes(vendorType)) {
      basePriority += 10;
    }

    // Adjust based on budget (high budget = higher priority for premium vendors)
    if (
      context.budgetRange === 'luxury' ||
      context.budgetRange === 'ultra_luxury'
    ) {
      if (['venue', 'photographer', 'planner'].includes(vendorType)) {
        basePriority += 5;
      }
    }

    return Math.min(100, basePriority);
  }

  /**
   * Optimize vendor cache configuration
   */
  async optimizeVendorCache(
    vendorType: VendorType,
    context: WeddingContext,
    performanceData?: VendorCachePerformance,
  ): Promise<void> {
    try {
      const strategies = this.VENDOR_STRATEGIES.filter(
        (s) => s.vendorType === vendorType,
      );

      for (const strategy of strategies) {
        // Calculate optimized parameters
        const optimizedTTL = this.calculateVendorTTL(
          vendorType,
          strategy.cacheType,
          context,
          performanceData
            ? {
                hitRate: performanceData.hitRate,
                avgResponseTime: performanceData.avgResponseTimeMs,
              }
            : undefined,
        );

        const season = this.getSeasonFromDate(context.weddingDate);
        const seasonalMultiplier = strategy.seasonalMultipliers[season];

        // Update or create vendor cache strategy in database
        await this.supabase.from('vendor_cache_strategies').upsert({
          vendor_type: vendorType,
          cache_type: strategy.cacheType,
          ttl_seconds: optimizedTTL,
          max_cache_size: strategy.maxCacheSize,
          preload_triggers: strategy.preloadTriggers,
          target_hit_rate: strategy.targetHitRate,
          max_response_time_ms: strategy.maxResponseTimeMs,
          cost_per_miss_cents: strategy.costPerMissCents,
          spring_ttl_multiplier: strategy.seasonalMultipliers.spring,
          summer_ttl_multiplier: strategy.seasonalMultipliers.summer,
          fall_ttl_multiplier: strategy.seasonalMultipliers.fall,
          winter_ttl_multiplier: strategy.seasonalMultipliers.winter,
          updated_at: new Date().toISOString(),
          is_active: true,
        });

        console.log(
          `Optimized cache for ${vendorType}:${strategy.cacheType} - TTL: ${optimizedTTL}s`,
        );
      }
    } catch (error) {
      console.error(`Error optimizing vendor cache for ${vendorType}:`, error);
      throw error;
    }
  }

  /**
   * Get vendor cache performance metrics
   */
  async getVendorCachePerformance(
    vendorType?: VendorType,
    timeRangeHours: number = 24,
  ): Promise<VendorCachePerformance[]> {
    try {
      let query = this.supabase
        .from('cache_performance_metrics')
        .select(
          `
          wedding_context,
          cache_type,
          operation_type,
          response_time_ms,
          cost_saved_cents
        `,
        )
        .gte(
          'recorded_at',
          new Date(Date.now() - timeRangeHours * 60 * 60 * 1000).toISOString(),
        );

      const { data: metrics, error } = await query;

      if (error) throw error;

      // Group metrics by vendor type (extract from wedding_context)
      const vendorMetrics = new Map<
        string,
        {
          hits: number;
          misses: number;
          totalResponseTime: number;
          totalCostSaved: number;
          cacheType: CacheType;
          vendorType: VendorType;
        }
      >();

      (metrics || []).forEach((metric) => {
        // Extract vendor type from wedding context (this would need to be included in the context)
        const context = metric.wedding_context as any;
        if (!context?.vendorType) return;

        const key = `${context.vendorType}:${metric.cache_type}`;

        if (!vendorMetrics.has(key)) {
          vendorMetrics.set(key, {
            hits: 0,
            misses: 0,
            totalResponseTime: 0,
            totalCostSaved: 0,
            cacheType: metric.cache_type,
            vendorType: context.vendorType,
          });
        }

        const stats = vendorMetrics.get(key)!;

        if (metric.operation_type === 'hit') {
          stats.hits++;
        } else if (metric.operation_type === 'miss') {
          stats.misses++;
        }

        stats.totalResponseTime += metric.response_time_ms || 0;
        stats.totalCostSaved += metric.cost_saved_cents || 0;
      });

      // Convert to performance objects with recommendations
      const performance: VendorCachePerformance[] = [];

      for (const [key, stats] of vendorMetrics) {
        const totalQueries = stats.hits + stats.misses;
        if (totalQueries === 0) continue;

        const hitRate = stats.hits / totalQueries;
        const avgResponseTime = stats.totalResponseTime / totalQueries;

        // Get current strategy for comparison
        const strategy = this.VENDOR_STRATEGIES.find(
          (s) =>
            s.vendorType === stats.vendorType &&
            s.cacheType === stats.cacheType,
        );

        const recommendations = this.generateOptimizationRecommendations(
          stats.vendorType,
          hitRate,
          avgResponseTime,
          strategy,
        );

        performance.push({
          vendorType: stats.vendorType,
          cacheType: stats.cacheType,
          hitRate,
          avgResponseTimeMs: avgResponseTime,
          totalQueries,
          costSavedCents: stats.totalCostSaved,
          recommendedAdjustments: recommendations,
        });
      }

      return vendorType
        ? performance.filter((p) => p.vendorType === vendorType)
        : performance;
    } catch (error) {
      console.error('Error getting vendor cache performance:', error);
      throw error;
    }
  }

  /**
   * Preload vendor-specific cache based on triggers
   */
  async preloadVendorCache(
    vendorType: VendorType,
    context: WeddingContext,
    triggers: string[] = [],
  ): Promise<void> {
    try {
      const strategies = this.VENDOR_STRATEGIES.filter(
        (s) => s.vendorType === vendorType,
      );

      for (const strategy of strategies) {
        // Check if any of the provided triggers match this strategy
        const shouldPreload =
          triggers.length === 0 ||
          triggers.some((trigger) =>
            strategy.preloadTriggers.includes(trigger),
          );

        if (!shouldPreload) continue;

        console.log(
          `Preloading ${vendorType} cache for ${strategy.cacheType} triggered by: ${triggers.join(', ')}`,
        );

        // This would typically involve:
        // 1. Getting common queries for this vendor type
        // 2. Generating AI responses
        // 3. Storing in cache

        // For now, we'll record the preload operation
        await this.supabase.from('cache_performance_metrics').insert({
          cache_type: strategy.cacheType,
          operation_type: 'preload',
          response_time_ms: 0,
          wedding_context: { ...context, vendorType, triggers },
          recorded_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error(`Error preloading vendor cache for ${vendorType}:`, error);
      throw error;
    }
  }

  /**
   * Get vendor market insights for cache optimization
   */
  async getVendorMarketInsights(
    vendorType: VendorType,
  ): Promise<VendorMarketInsights> {
    try {
      // This would typically analyze historical data to understand vendor patterns
      // For now, we'll return based on industry knowledge built into the strategies

      const strategy = this.VENDOR_STRATEGIES.find(
        (s) => s.vendorType === vendorType,
      );

      const defaultInsights: VendorMarketInsights = {
        vendorType,
        popularityByRegion: {
          northeast: 0.8,
          west_coast: 0.9,
          southeast: 0.7,
          midwest: 0.6,
          southwest: 0.7,
        },
        seasonalDemand: strategy?.seasonalMultipliers || {
          spring: 1.0,
          summer: 0.8,
          fall: 0.9,
          winter: 1.1,
        },
        averageBookingLeadTime: this.getAverageBookingLeadTime(vendorType),
        priceVolatility: this.getPriceVolatility(vendorType),
        availabilityFluctuation: this.getAvailabilityFluctuation(vendorType),
      };

      return defaultInsights;
    } catch (error) {
      console.error(`Error getting market insights for ${vendorType}:`, error);
      throw error;
    }
  }

  /**
   * Auto-tune vendor cache strategies based on performance
   */
  async autoTuneVendorStrategies(): Promise<{
    totalAdjustments: number;
    improvements: Array<{
      vendorType: VendorType;
      cacheType: CacheType;
      previousHitRate: number;
      expectedHitRate: number;
      ttlAdjustment: number;
    }>;
  }> {
    try {
      const performance = await this.getVendorCachePerformance();
      const improvements: Array<{
        vendorType: VendorType;
        cacheType: CacheType;
        previousHitRate: number;
        expectedHitRate: number;
        ttlAdjustment: number;
      }> = [];

      let totalAdjustments = 0;

      for (const perf of performance) {
        const strategy = this.VENDOR_STRATEGIES.find(
          (s) =>
            s.vendorType === perf.vendorType && s.cacheType === perf.cacheType,
        );

        if (!strategy) continue;

        // Only auto-tune if performance is significantly different from targets
        const hitRateDelta = Math.abs(perf.hitRate - strategy.targetHitRate);
        const responseTimeDelta =
          perf.avgResponseTimeMs - strategy.maxResponseTimeMs;

        if (hitRateDelta > 0.1 || responseTimeDelta > 50) {
          // Calculate TTL adjustment
          let ttlAdjustment = 1.0;

          if (perf.hitRate < strategy.targetHitRate - 0.05) {
            ttlAdjustment = 1.2; // Increase TTL to improve hit rate
          } else if (perf.avgResponseTimeMs > strategy.maxResponseTimeMs) {
            ttlAdjustment = 0.8; // Decrease TTL to improve freshness
          }

          // Apply the adjustment
          await this.supabase
            .from('vendor_cache_strategies')
            .update({
              ttl_seconds: Math.round(strategy.baseTTL * ttlAdjustment),
              updated_at: new Date().toISOString(),
            })
            .eq('vendor_type', perf.vendorType)
            .eq('cache_type', perf.cacheType);

          improvements.push({
            vendorType: perf.vendorType,
            cacheType: perf.cacheType,
            previousHitRate: perf.hitRate,
            expectedHitRate: Math.min(
              0.95,
              perf.hitRate + (ttlAdjustment > 1 ? 0.05 : -0.02),
            ),
            ttlAdjustment,
          });

          totalAdjustments++;
        }
      }

      console.log(`Auto-tuned ${totalAdjustments} vendor cache strategies`);

      return {
        totalAdjustments,
        improvements,
      };
    } catch (error) {
      console.error('Error auto-tuning vendor strategies:', error);
      throw error;
    }
  }

  // Private helper methods

  private getSeasonFromDate(date: Date): WeddingSeason {
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  private generateOptimizationRecommendations(
    vendorType: VendorType,
    hitRate: number,
    avgResponseTime: number,
    strategy?: VendorCacheStrategy,
  ): {
    ttlAdjustment: number;
    cacheSizeAdjustment: number;
    preloadFrequency: string;
  } {
    const recommendations = {
      ttlAdjustment: 1.0,
      cacheSizeAdjustment: 1.0,
      preloadFrequency: 'daily',
    };

    if (!strategy) return recommendations;

    // TTL adjustments based on hit rate
    if (hitRate < strategy.targetHitRate - 0.1) {
      recommendations.ttlAdjustment = 1.3; // Increase TTL significantly
      recommendations.preloadFrequency = 'twice_daily';
    } else if (hitRate < strategy.targetHitRate - 0.05) {
      recommendations.ttlAdjustment = 1.15; // Increase TTL moderately
    } else if (avgResponseTime > strategy.maxResponseTimeMs + 100) {
      recommendations.ttlAdjustment = 0.8; // Decrease TTL for freshness
    }

    // Cache size adjustments based on performance
    if (hitRate > 0.9 && avgResponseTime < strategy.maxResponseTimeMs) {
      recommendations.cacheSizeAdjustment = 1.2; // Increase cache size
    } else if (hitRate < 0.6) {
      recommendations.cacheSizeAdjustment = 0.8; // Decrease cache size
      recommendations.preloadFrequency = 'hourly';
    }

    return recommendations;
  }

  private getAverageBookingLeadTime(vendorType: VendorType): number {
    // Industry averages in days
    const leadTimes: Record<VendorType, number> = {
      venue: 365, // 1 year
      photographer: 180, // 6 months
      caterer: 120, // 4 months
      florist: 90, // 3 months
      dj_band: 90, // 3 months
      videographer: 120, // 4 months
      planner: 180, // 6 months
      baker: 60, // 2 months
      decorator: 60, // 2 months
      transportation: 30, // 1 month
      officiant: 90, // 3 months
      hair_makeup: 45, // 1.5 months
    };

    return leadTimes[vendorType] || 90;
  }

  private getPriceVolatility(vendorType: VendorType): number {
    // 0-1 scale, higher = more volatile pricing
    const volatility: Record<VendorType, number> = {
      venue: 0.2, // Very stable
      photographer: 0.3, // Fairly stable
      caterer: 0.7, // High volatility (food costs)
      florist: 0.8, // Very high volatility (seasonal)
      dj_band: 0.4, // Moderate
      videographer: 0.3, // Fairly stable
      planner: 0.2, // Very stable
      baker: 0.5, // Moderate (ingredient costs)
      decorator: 0.6, // Moderately high
      transportation: 0.6, // Moderately high (fuel costs)
      officiant: 0.1, // Very stable
      hair_makeup: 0.3, // Fairly stable
    };

    return volatility[vendorType] || 0.5;
  }

  private getAvailabilityFluctuation(vendorType: VendorType): number {
    // 0-1 scale, higher = availability changes more frequently
    const fluctuation: Record<VendorType, number> = {
      venue: 0.3, // Low fluctuation
      photographer: 0.8, // High fluctuation
      caterer: 0.6, // Moderate
      florist: 0.9, // Very high (seasonal inventory)
      dj_band: 0.7, // Moderately high
      videographer: 0.8, // High
      planner: 0.4, // Low-moderate
      baker: 0.5, // Moderate
      decorator: 0.7, // Moderately high
      transportation: 0.6, // Moderate
      officiant: 0.4, // Low-moderate
      hair_makeup: 0.8, // High
    };

    return fluctuation[vendorType] || 0.6;
  }
}

export default VendorCacheOptimizer;
