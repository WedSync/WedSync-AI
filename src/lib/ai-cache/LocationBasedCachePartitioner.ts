/**
 * WS-241 AI Caching Strategy System - Location-Based Cache Partitioning
 * Optimizes cache distribution based on wedding market geography
 * Team B - Backend Infrastructure & API Development
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  WeddingContext,
  CacheType,
  WeddingSeason,
  AIQuery,
} from './WeddingAICacheService';

export interface LocationCacheMetrics {
  marketKey: string;
  totalQueries: number;
  hitRate: number;
  avgResponseTimeMs: number;
  totalCostSavedCents: number;
  optimizationScore: number;
  recommendedCacheSize: number;
}

export interface MarketSegment {
  tier: 'tier1' | 'tier2' | 'tier3';
  markets: string[];
  cacheAllocation: number; // MB
  ttlMultiplier: number;
  preloadPriority: number;
}

export interface GeographicCacheStrategy {
  region: string;
  markets: string[];
  seasonalDemand: Record<WeddingSeason, number>;
  competitiveIndex: number; // 0-1, higher = more competitive market
  averageBudget: number;
  popularVendorTypes: string[];
  cacheOptimizations: {
    preferredCacheTypes: CacheType[];
    ttlAdjustments: Record<CacheType, number>;
    preloadSchedule: string; // cron expression
  };
}

/**
 * Location-Based Cache Partitioner
 * Manages geographic distribution and optimization of wedding AI cache
 */
export class LocationBasedCachePartitioner {
  private supabase: SupabaseClient;

  // Wedding market hierarchy - Tier 1 (major metros) get more cache resources
  private readonly MARKET_SEGMENTS: MarketSegment[] = [
    {
      tier: 'tier1',
      markets: ['NYC', 'LA', 'Chicago', 'Miami', 'San Francisco', 'Boston'],
      cacheAllocation: 500, // MB per market
      ttlMultiplier: 0.8, // Shorter TTL due to higher demand
      preloadPriority: 100,
    },
    {
      tier: 'tier2',
      markets: [
        'Atlanta',
        'Dallas',
        'Seattle',
        'Denver',
        'Austin',
        'Nashville',
        'Phoenix',
        'Philadelphia',
      ],
      cacheAllocation: 250, // MB per market
      ttlMultiplier: 1.0, // Standard TTL
      preloadPriority: 75,
    },
    {
      tier: 'tier3',
      markets: [], // All other markets grouped by state
      cacheAllocation: 100, // MB per state grouping
      ttlMultiplier: 1.5, // Longer TTL due to lower demand
      preloadPriority: 50,
    },
  ];

  // Geographic regions with specific wedding characteristics
  private readonly GEOGRAPHIC_STRATEGIES: GeographicCacheStrategy[] = [
    {
      region: 'northeast',
      markets: ['NYC', 'Boston', 'Philadelphia', 'CT', 'NJ'],
      seasonalDemand: { spring: 1.2, summer: 1.5, fall: 1.8, winter: 0.6 },
      competitiveIndex: 0.9,
      averageBudget: 65000,
      popularVendorTypes: ['venue', 'photographer', 'caterer', 'florist'],
      cacheOptimizations: {
        preferredCacheTypes: [
          'venue_recommendations',
          'vendor_matching',
          'budget_optimization',
        ],
        ttlAdjustments: {
          venue_recommendations: 0.7,
          vendor_matching: 0.8,
          budget_optimization: 0.6,
        },
        preloadSchedule: '0 2 * * *', // Daily at 2 AM
      },
    },
    {
      region: 'west_coast',
      markets: ['LA', 'San Francisco', 'Seattle', 'CA', 'WA', 'OR'],
      seasonalDemand: { spring: 1.3, summer: 1.4, fall: 1.6, winter: 0.8 },
      competitiveIndex: 0.85,
      averageBudget: 70000,
      popularVendorTypes: ['venue', 'photographer', 'videographer', 'planner'],
      cacheOptimizations: {
        preferredCacheTypes: [
          'venue_recommendations',
          'photography_styles',
          'vendor_matching',
        ],
        ttlAdjustments: {
          photography_styles: 0.5,
          vendor_matching: 0.7,
          venue_recommendations: 0.8,
        },
        preloadSchedule: '0 1 * * *', // Daily at 1 AM PT
      },
    },
    {
      region: 'southeast',
      markets: ['Atlanta', 'Miami', 'Nashville', 'FL', 'GA', 'NC', 'SC', 'TN'],
      seasonalDemand: { spring: 1.4, summer: 1.2, fall: 1.7, winter: 1.0 },
      competitiveIndex: 0.7,
      averageBudget: 45000,
      popularVendorTypes: ['venue', 'caterer', 'dj_band', 'photographer'],
      cacheOptimizations: {
        preferredCacheTypes: [
          'venue_recommendations',
          'menu_suggestions',
          'vendor_matching',
        ],
        ttlAdjustments: {
          menu_suggestions: 0.8,
          venue_recommendations: 0.9,
          vendor_matching: 0.8,
        },
        preloadSchedule: '0 3 * * *', // Daily at 3 AM ET
      },
    },
    {
      region: 'midwest',
      markets: ['Chicago', 'Denver', 'IL', 'CO', 'OH', 'MI', 'MN'],
      seasonalDemand: { spring: 1.3, summer: 1.6, fall: 1.4, winter: 0.5 },
      competitiveIndex: 0.6,
      averageBudget: 40000,
      popularVendorTypes: ['venue', 'photographer', 'caterer', 'baker'],
      cacheOptimizations: {
        preferredCacheTypes: [
          'venue_recommendations',
          'seasonal_planning',
          'budget_optimization',
        ],
        ttlAdjustments: {
          seasonal_planning: 0.6,
          budget_optimization: 0.8,
          venue_recommendations: 1.0,
        },
        preloadSchedule: '0 4 * * *', // Daily at 4 AM CT
      },
    },
    {
      region: 'southwest',
      markets: ['Dallas', 'Austin', 'Phoenix', 'TX', 'AZ', 'NV', 'NM'],
      seasonalDemand: { spring: 1.5, summer: 0.9, fall: 1.6, winter: 1.2 },
      competitiveIndex: 0.65,
      averageBudget: 50000,
      popularVendorTypes: ['venue', 'photographer', 'caterer', 'decorator'],
      cacheOptimizations: {
        preferredCacheTypes: [
          'venue_recommendations',
          'decor_inspiration',
          'vendor_matching',
        ],
        ttlAdjustments: {
          decor_inspiration: 0.7,
          venue_recommendations: 0.8,
          vendor_matching: 0.9,
        },
        preloadSchedule: '0 5 * * *', // Daily at 5 AM MT
      },
    },
  ];

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Generate location-optimized cache key
   */
  generateLocationCacheKey(query: AIQuery, context: WeddingContext): string {
    const locationKey = this.getOptimizedLocationKey(context.location);
    const marketTier = this.getMarketTier(locationKey);
    const regionStrategy = this.getRegionalStrategy(context.location);

    // Include regional optimization in cache key for better partitioning
    const optimizedKey = [
      query.type,
      locationKey,
      marketTier,
      regionStrategy?.region || 'default',
      this.getSeasonKey(context.weddingDate),
      context.budgetRange,
    ].join(':');

    return optimizedKey;
  }

  /**
   * Get optimized location key based on market tier
   */
  getOptimizedLocationKey(location: {
    city: string;
    state: string;
    country: string;
  }): string {
    const cityUpper = location.city.toUpperCase();

    // Check if it's a Tier 1 or Tier 2 market
    for (const segment of this.MARKET_SEGMENTS) {
      if (segment.tier !== 'tier3' && segment.markets.includes(cityUpper)) {
        return `${cityUpper}_${location.state.toUpperCase()}`;
      }
    }

    // Group smaller markets by state
    return location.state.toUpperCase();
  }

  /**
   * Get market tier for cache allocation decisions
   */
  getMarketTier(locationKey: string): 'tier1' | 'tier2' | 'tier3' {
    for (const segment of this.MARKET_SEGMENTS) {
      if (segment.markets.some((market) => locationKey.includes(market))) {
        return segment.tier;
      }
    }
    return 'tier3';
  }

  /**
   * Get regional strategy for location
   */
  getRegionalStrategy(location: {
    city: string;
    state: string;
    country: string;
  }): GeographicCacheStrategy | null {
    const locationKey = this.getOptimizedLocationKey(location);

    return (
      this.GEOGRAPHIC_STRATEGIES.find((strategy) =>
        strategy.markets.some((market) => locationKey.includes(market)),
      ) || null
    );
  }

  /**
   * Calculate location-specific TTL adjustments
   */
  calculateLocationTTL(
    baseTTL: number,
    cacheType: CacheType,
    location: { city: string; state: string; country: string },
    season: WeddingSeason,
  ): number {
    const locationKey = this.getOptimizedLocationKey(location);
    const marketTier = this.getMarketTier(locationKey);
    const regionStrategy = this.getRegionalStrategy(location);

    // Base adjustment by market tier
    const segment = this.MARKET_SEGMENTS.find((s) => s.tier === marketTier);
    let adjustedTTL = baseTTL * (segment?.ttlMultiplier || 1.0);

    // Regional adjustments
    if (regionStrategy) {
      const seasonalDemand = regionStrategy.seasonalDemand[season];
      const competitiveAdjustment = 1 - regionStrategy.competitiveIndex * 0.3; // More competitive = shorter TTL
      const seasonalAdjustment = 2 - seasonalDemand; // Higher demand = shorter TTL

      adjustedTTL = adjustedTTL * competitiveAdjustment * seasonalAdjustment;

      // Cache type specific adjustments
      const cacheTypeAdjustment =
        regionStrategy.cacheOptimizations.ttlAdjustments[cacheType] || 1.0;
      adjustedTTL = adjustedTTL * cacheTypeAdjustment;
    }

    return Math.max(300, Math.round(adjustedTTL)); // Minimum 5 minutes
  }

  /**
   * Determine if location should get priority caching
   */
  shouldPreloadForLocation(
    location: { city: string; state: string; country: string },
    cacheType: CacheType,
    season: WeddingSeason,
  ): boolean {
    const locationKey = this.getOptimizedLocationKey(location);
    const marketTier = this.getMarketTier(locationKey);
    const regionStrategy = this.getRegionalStrategy(location);

    // Always preload Tier 1 markets
    if (marketTier === 'tier1') return true;

    // Preload Tier 2 markets for high-demand seasons
    if (marketTier === 'tier2') {
      const seasonalDemand = regionStrategy?.seasonalDemand[season] || 1.0;
      return seasonalDemand > 1.2;
    }

    // Selectively preload Tier 3 based on cache type and regional preferences
    if (
      regionStrategy?.cacheOptimizations.preferredCacheTypes.includes(cacheType)
    ) {
      const seasonalDemand = regionStrategy.seasonalDemand[season];
      return seasonalDemand > 1.3;
    }

    return false;
  }

  /**
   * Get cache allocation for location
   */
  getCacheAllocation(location: {
    city: string;
    state: string;
    country: string;
  }): number {
    const locationKey = this.getOptimizedLocationKey(location);
    const marketTier = this.getMarketTier(locationKey);

    const segment = this.MARKET_SEGMENTS.find((s) => s.tier === marketTier);
    return segment?.cacheAllocation || 100; // MB
  }

  /**
   * Update market performance statistics
   */
  async updateMarketStats(
    location: { city: string; state: string; country: string },
    cacheType: CacheType,
    season: WeddingSeason,
    metrics: {
      totalQueries: number;
      hits: number;
      misses: number;
      avgResponseTimeMs: number;
      totalCostSavedCents: number;
    },
  ): Promise<void> {
    try {
      const marketKey = this.getOptimizedLocationKey(location);
      const hitRate =
        metrics.totalQueries > 0 ? metrics.hits / metrics.totalQueries : 0;

      // Calculate optimization score based on hit rate, response time, and cost savings
      const optimizationScore = Math.min(
        100,
        Math.round(
          hitRate * 50 +
            Math.max(0, 500 - metrics.avgResponseTimeMs) / 10 +
            Math.min(metrics.totalCostSavedCents / 100, 25),
        ),
      );

      const recommendedCacheSize = this.calculateRecommendedCacheSize(
        metrics.totalQueries,
        hitRate,
        this.getCacheAllocation(location),
      );

      await this.supabase.from('wedding_market_cache_stats').upsert({
        market_key: marketKey,
        cache_type: cacheType,
        season: season,
        total_queries: metrics.totalQueries,
        cache_hits: metrics.hits,
        cache_misses: metrics.misses,
        avg_response_time_ms: metrics.avgResponseTimeMs,
        total_cost_saved_cents: metrics.totalCostSavedCents,
        optimization_score: optimizationScore,
        recommended_cache_size: recommendedCacheSize,
        last_updated: new Date().toISOString(),
        stats_period_start: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating market stats:', error);
      throw error;
    }
  }

  /**
   * Get performance metrics for all markets
   */
  async getMarketPerformanceMetrics(
    season?: WeddingSeason,
    cacheType?: CacheType,
  ): Promise<LocationCacheMetrics[]> {
    try {
      let query = this.supabase
        .from('wedding_market_cache_stats')
        .select('*')
        .order('optimization_score', { ascending: false });

      if (season) {
        query = query.eq('season', season);
      }

      if (cacheType) {
        query = query.eq('cache_type', cacheType);
      }

      const { data: stats, error } = await query;

      if (error) throw error;

      return (stats || []).map((stat) => ({
        marketKey: stat.market_key,
        totalQueries: stat.total_queries,
        hitRate: parseFloat(stat.hit_rate),
        avgResponseTimeMs: stat.avg_response_time_ms,
        totalCostSavedCents: stat.total_cost_saved_cents,
        optimizationScore: stat.optimization_score,
        recommendedCacheSize: stat.recommended_cache_size,
      }));
    } catch (error) {
      console.error('Error getting market performance metrics:', error);
      throw error;
    }
  }

  /**
   * Get optimal cache distribution strategy for current season
   */
  async getOptimalCacheDistribution(season: WeddingSeason): Promise<{
    totalAllocationMB: number;
    distribution: Array<{
      marketKey: string;
      tier: string;
      allocationMB: number;
      expectedHitRate: number;
      preloadPriority: number;
    }>;
  }> {
    try {
      // Get recent performance data for all markets
      const performanceData = await this.getMarketPerformanceMetrics(season);

      let totalAllocationMB = 0;
      const distribution: Array<{
        marketKey: string;
        tier: string;
        allocationMB: number;
        expectedHitRate: number;
        preloadPriority: number;
      }> = [];

      // Distribute cache based on market tiers and performance
      for (const segment of this.MARKET_SEGMENTS) {
        for (const market of segment.markets) {
          const marketStats = performanceData.find((stat) =>
            stat.marketKey.includes(market),
          );

          const baseAllocation = segment.cacheAllocation;

          // Adjust allocation based on performance
          let adjustedAllocation = baseAllocation;
          if (marketStats) {
            const performanceMultiplier = Math.max(
              0.5,
              Math.min(2.0, marketStats.optimizationScore / 50),
            );
            adjustedAllocation = Math.round(
              baseAllocation * performanceMultiplier,
            );
          }

          // Adjust for seasonal demand
          const regionStrategy = this.GEOGRAPHIC_STRATEGIES.find((rs) =>
            rs.markets.includes(market),
          );

          if (regionStrategy) {
            const seasonalDemand = regionStrategy.seasonalDemand[season];
            adjustedAllocation = Math.round(
              adjustedAllocation * seasonalDemand,
            );
          }

          distribution.push({
            marketKey: market,
            tier: segment.tier,
            allocationMB: adjustedAllocation,
            expectedHitRate: marketStats?.hitRate || 0.75,
            preloadPriority: segment.preloadPriority,
          });

          totalAllocationMB += adjustedAllocation;
        }
      }

      return {
        totalAllocationMB,
        distribution: distribution.sort(
          (a, b) => b.preloadPriority - a.preloadPriority,
        ),
      };
    } catch (error) {
      console.error('Error calculating optimal cache distribution:', error);
      throw error;
    }
  }

  /**
   * Preload caches for high-priority markets
   */
  async preloadHighPriorityMarkets(
    season: WeddingSeason,
    cacheTypes: CacheType[] = [
      'venue_recommendations',
      'vendor_matching',
      'location_insights',
    ],
  ): Promise<void> {
    try {
      const distribution = await this.getOptimalCacheDistribution(season);

      // Get top 20% of markets by priority
      const highPriorityMarkets = distribution.distribution.slice(
        0,
        Math.ceil(distribution.distribution.length * 0.2),
      );

      console.log(
        `Preloading ${highPriorityMarkets.length} high-priority markets for ${season}`,
      );

      const preloadPromises = highPriorityMarkets.flatMap((market) =>
        cacheTypes.map((cacheType) =>
          this.preloadMarketCache(
            market.marketKey,
            season,
            cacheType,
            market.allocationMB,
          ),
        ),
      );

      await Promise.allSettled(preloadPromises);

      // Record preload job in database
      await this.supabase.from('cache_warming_jobs').insert({
        job_type: 'market_refresh',
        status: 'completed',
        job_config: {
          season,
          markets: highPriorityMarkets.map((m) => m.marketKey),
          cache_types: cacheTypes,
        },
        target_cache_types: cacheTypes,
        target_locations: highPriorityMarkets.map((m) => m.marketKey),
        target_seasons: [season],
        total_items: preloadPromises.length,
        processed_items: preloadPromises.length,
        completed_at: new Date().toISOString(),
        results: { high_priority_markets: highPriorityMarkets.length },
      });
    } catch (error) {
      console.error('Error preloading high-priority markets:', error);
      throw error;
    }
  }

  /**
   * Analyze cache efficiency by geographic region
   */
  async analyzeRegionalCacheEfficiency(): Promise<
    Array<{
      region: string;
      totalQueries: number;
      avgHitRate: number;
      avgResponseTime: number;
      totalCostSaved: number;
      efficiency: 'high' | 'medium' | 'low';
      recommendations: string[];
    }>
  > {
    try {
      const analysis: Array<{
        region: string;
        totalQueries: number;
        avgHitRate: number;
        avgResponseTime: number;
        totalCostSaved: number;
        efficiency: 'high' | 'medium' | 'low';
        recommendations: string[];
      }> = [];

      for (const strategy of this.GEOGRAPHIC_STRATEGIES) {
        // Get stats for all markets in this region
        const regionStats = await Promise.all(
          strategy.markets.map(
            (market) =>
              this.supabase
                .from('wedding_market_cache_stats')
                .select('*')
                .ilike('market_key', `%${market}%`)
                .gte(
                  'stats_period_start',
                  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                ), // Last 30 days
          ),
        );

        const allStats = regionStats
          .flat()
          .filter((result) => result.data?.length)
          .map((result) => result.data)
          .flat();

        if (allStats.length === 0) continue;

        const totalQueries = allStats.reduce(
          (sum, stat) => sum + stat.total_queries,
          0,
        );
        const avgHitRate =
          allStats.reduce((sum, stat) => sum + parseFloat(stat.hit_rate), 0) /
          allStats.length;
        const avgResponseTime =
          allStats.reduce((sum, stat) => sum + stat.avg_response_time_ms, 0) /
          allStats.length;
        const totalCostSaved = allStats.reduce(
          (sum, stat) => sum + stat.total_cost_saved_cents,
          0,
        );

        // Determine efficiency based on hit rate and response time
        let efficiency: 'high' | 'medium' | 'low';
        const recommendations: string[] = [];

        if (avgHitRate > 0.8 && avgResponseTime < 200) {
          efficiency = 'high';
          recommendations.push('Maintain current optimization levels');
        } else if (avgHitRate > 0.6 && avgResponseTime < 400) {
          efficiency = 'medium';
          if (avgHitRate < 0.75) {
            recommendations.push(
              'Increase cache preloading for popular queries',
            );
          }
          if (avgResponseTime > 250) {
            recommendations.push('Optimize cache retrieval performance');
          }
        } else {
          efficiency = 'low';
          recommendations.push('Implement aggressive preloading strategy');
          recommendations.push('Review TTL configurations for region');
          if (avgResponseTime > 400) {
            recommendations.push('Consider additional cache infrastructure');
          }
        }

        analysis.push({
          region: strategy.region,
          totalQueries,
          avgHitRate,
          avgResponseTime,
          totalCostSaved,
          efficiency,
          recommendations,
        });
      }

      return analysis.sort((a, b) => b.totalQueries - a.totalQueries);
    } catch (error) {
      console.error('Error analyzing regional cache efficiency:', error);
      throw error;
    }
  }

  // Private helper methods

  private getSeasonKey(weddingDate: Date): WeddingSeason {
    const month = weddingDate.getMonth();
    if (month >= 2 && month <= 4) return 'spring'; // Mar-May
    if (month >= 5 && month <= 7) return 'summer'; // Jun-Aug
    if (month >= 8 && month <= 10) return 'fall'; // Sep-Nov
    return 'winter'; // Dec-Feb
  }

  private calculateRecommendedCacheSize(
    totalQueries: number,
    hitRate: number,
    currentAllocation: number,
  ): number {
    // Base recommendation on query volume and hit rate
    const queryVolumeMultiplier = Math.min(2.0, totalQueries / 1000);
    const hitRateMultiplier = hitRate > 0.8 ? 1.2 : hitRate < 0.6 ? 0.8 : 1.0;

    const recommended = Math.round(
      currentAllocation * queryVolumeMultiplier * hitRateMultiplier,
    );

    // Ensure reasonable bounds
    return Math.max(50, Math.min(1000, recommended)); // Between 50MB and 1GB
  }

  private async preloadMarketCache(
    marketKey: string,
    season: WeddingSeason,
    cacheType: CacheType,
    allocationMB: number,
  ): Promise<void> {
    try {
      // This would typically involve:
      // 1. Fetching popular queries for this market/season/cache type
      // 2. Generating AI responses for those queries
      // 3. Storing them in cache layers

      console.log(
        `Preloading ${cacheType} cache for ${marketKey} (${season}) - ${allocationMB}MB allocation`,
      );

      // Simulate preload operation
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error preloading cache for ${marketKey}:`, error);
    }
  }
}

export default LocationBasedCachePartitioner;
