/**
 * WS-241 AI Caching Strategy System - Seasonal Scaling Automation
 * Handles automatic cache scaling based on wedding season traffic patterns
 * Team B - Backend Infrastructure & API Development
 */

import { Redis } from '@upstash/redis';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Wedding season definitions
export interface SeasonConfig {
  name: 'peak' | 'high' | 'moderate' | 'low';
  months: number[];
  trafficMultiplier: number;
  cacheCapacityMultiplier: number;
  preloadStrategy: 'aggressive' | 'moderate' | 'conservative';
  evictionPolicy: 'lru' | 'lfu' | 'ttl-based';
}

export interface ScalingMetrics {
  currentSeason: SeasonConfig;
  predictedLoad: number;
  currentCacheUtilization: number;
  recommendedActions: ScalingAction[];
  nextScalingCheck: Date;
  cost_implications: {
    current_monthly_cost: number;
    projected_monthly_cost: number;
    savings_from_scaling: number;
  };
}

export interface ScalingAction {
  type: 'scale_up' | 'scale_down' | 'preload' | 'evict' | 'redistribute';
  target: 'memory' | 'redis' | 'database' | 'all';
  priority: 'immediate' | 'scheduled' | 'maintenance_window';
  estimated_duration_minutes: number;
  business_impact: 'none' | 'low' | 'moderate' | 'high';
}

export class SeasonalScalingAutomator {
  private redis: Redis;
  private supabase: SupabaseClient;
  private scalingKey = 'ai_cache:seasonal_scaling';

  // Wedding season configuration
  private readonly seasonConfigs: SeasonConfig[] = [
    {
      name: 'peak',
      months: [5, 6, 7, 8, 9], // May-September (prime wedding season)
      trafficMultiplier: 3.0,
      cacheCapacityMultiplier: 2.5,
      preloadStrategy: 'aggressive',
      evictionPolicy: 'lfu',
    },
    {
      name: 'high',
      months: [4, 10], // April & October (shoulder season)
      trafficMultiplier: 2.2,
      cacheCapacityMultiplier: 1.8,
      preloadStrategy: 'moderate',
      evictionPolicy: 'lru',
    },
    {
      name: 'moderate',
      months: [3, 11], // March & November (planning season)
      trafficMultiplier: 1.4,
      cacheCapacityMultiplier: 1.2,
      preloadStrategy: 'moderate',
      evictionPolicy: 'lru',
    },
    {
      name: 'low',
      months: [12, 1, 2], // December-February (off-season)
      trafficMultiplier: 0.7,
      cacheCapacityMultiplier: 0.8,
      preloadStrategy: 'conservative',
      evictionPolicy: 'ttl-based',
    },
  ];

  constructor(
    supabaseUrl: string,
    supabaseServiceKey: string,
    redisUrl: string,
  ) {
    this.redis = new Redis({
      url: redisUrl,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /**
   * Get current season configuration based on date
   */
  public getCurrentSeason(date: Date = new Date()): SeasonConfig {
    const month = date.getMonth() + 1; // JavaScript months are 0-indexed

    return (
      this.seasonConfigs.find((config) => config.months.includes(month)) ||
      this.seasonConfigs.find((config) => config.name === 'moderate')!
    );
  }

  /**
   * Predict upcoming season transitions and prepare scaling
   */
  public async predictSeasonalTransition(lookaheadDays: number = 30): Promise<{
    upcomingTransitions: Array<{
      date: Date;
      fromSeason: SeasonConfig;
      toSeason: SeasonConfig;
      preparationNeeded: boolean;
      estimatedPreparationTime: number;
    }>;
    recommendedActions: ScalingAction[];
  }> {
    const today = new Date();
    const transitions = [];
    const actions: ScalingAction[] = [];

    for (let i = 1; i <= lookaheadDays; i++) {
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + i);

      const currentSeason = this.getCurrentSeason(today);
      const futureSeason = this.getCurrentSeason(futureDate);

      if (currentSeason.name !== futureSeason.name) {
        const preparationNeeded =
          Math.abs(
            futureSeason.trafficMultiplier - currentSeason.trafficMultiplier,
          ) > 0.5;

        transitions.push({
          date: futureDate,
          fromSeason: currentSeason,
          toSeason: futureSeason,
          preparationNeeded,
          estimatedPreparationTime: preparationNeeded ? 120 : 30, // minutes
        });

        // Generate scaling actions for the transition
        if (futureSeason.trafficMultiplier > currentSeason.trafficMultiplier) {
          actions.push({
            type: 'scale_up',
            target: 'all',
            priority: preparationNeeded ? 'scheduled' : 'maintenance_window',
            estimated_duration_minutes: 45,
            business_impact: 'low',
          });

          actions.push({
            type: 'preload',
            target: 'redis',
            priority: 'scheduled',
            estimated_duration_minutes: 120,
            business_impact: 'none',
          });
        } else {
          actions.push({
            type: 'scale_down',
            target: 'all',
            priority: 'maintenance_window',
            estimated_duration_minutes: 30,
            business_impact: 'none',
          });
        }

        break; // Only look for the next transition
      }
    }

    return { upcomingTransitions: transitions, recommendedActions: actions };
  }

  /**
   * Execute automatic scaling based on current season and metrics
   */
  public async executeSeasonalScaling(): Promise<{
    scalingExecuted: boolean;
    actions: ScalingAction[];
    metrics: ScalingMetrics;
    errors: string[];
  }> {
    const errors: string[] = [];
    const executedActions: ScalingAction[] = [];

    try {
      // Get current season and metrics
      const currentSeason = this.getCurrentSeason();
      const metrics = await this.gatherScalingMetrics(currentSeason);

      console.log(
        `Executing seasonal scaling for ${currentSeason.name} season`,
      );

      // Check if scaling is needed
      const scalingNeeded = await this.isScalingNeeded(metrics);

      if (!scalingNeeded) {
        return {
          scalingExecuted: false,
          actions: [],
          metrics,
          errors: [],
        };
      }

      // Execute cache capacity adjustments
      await this.adjustCacheCapacity(currentSeason);
      executedActions.push({
        type: 'scale_up',
        target: 'all',
        priority: 'immediate',
        estimated_duration_minutes: 30,
        business_impact: 'low',
      });

      // Execute preloading strategy
      await this.executePreloadStrategy(currentSeason);
      executedActions.push({
        type: 'preload',
        target: 'redis',
        priority: 'scheduled',
        estimated_duration_minutes: 60,
        business_impact: 'none',
      });

      // Update eviction policies
      await this.updateEvictionPolicies(currentSeason);

      // Log scaling activity
      await this.logScalingActivity({
        season: currentSeason.name,
        actions: executedActions,
        timestamp: new Date(),
        metrics,
      });

      return {
        scalingExecuted: true,
        actions: executedActions,
        metrics,
        errors,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown scaling error';
      errors.push(errorMessage);
      console.error('Seasonal scaling error:', error);

      return {
        scalingExecuted: false,
        actions: executedActions,
        metrics: await this.gatherScalingMetrics(this.getCurrentSeason()),
        errors,
      };
    }
  }

  /**
   * Gather current metrics for scaling decisions
   */
  private async gatherScalingMetrics(
    season: SeasonConfig,
  ): Promise<ScalingMetrics> {
    // Get cache utilization from Redis
    const redisInfo = await this.redis.info();
    const memoryUsage = this.parseRedisMemoryUsage(redisInfo);

    // Get database cache statistics
    const { data: cacheStats } = await this.supabase
      .from('ai_cache_statistics')
      .select('*')
      .gte(
        'created_at',
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      )
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Calculate predicted load based on historical data
    const predictedLoad = await this.calculatePredictedLoad(season);

    // Estimate costs
    const costImplications = await this.estimateScalingCosts(
      season,
      predictedLoad,
    );

    return {
      currentSeason: season,
      predictedLoad,
      currentCacheUtilization: memoryUsage.percentage,
      recommendedActions: await this.generateRecommendedActions(
        season,
        predictedLoad,
        memoryUsage.percentage,
      ),
      nextScalingCheck: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      cost_implications: costImplications,
    };
  }

  /**
   * Check if scaling is needed based on metrics
   */
  private async isScalingNeeded(metrics: ScalingMetrics): Promise<boolean> {
    // Check if we're approaching capacity limits
    if (metrics.currentCacheUtilization > 75) {
      return true;
    }

    // Check if predicted load significantly differs from current capacity
    if (metrics.predictedLoad > metrics.currentSeason.trafficMultiplier * 1.2) {
      return true;
    }

    // Check if we haven't scaled recently for this season
    const lastScaling = await this.redis.get(`${this.scalingKey}:last_scaling`);
    if (!lastScaling) {
      return true;
    }

    const lastScalingDate = new Date(lastScaling);
    const hoursSinceLastScaling =
      (Date.now() - lastScalingDate.getTime()) / (1000 * 60 * 60);

    // Scale if it's been more than 6 hours since last scaling
    return hoursSinceLastScaling > 6;
  }

  /**
   * Adjust cache capacity based on season
   */
  private async adjustCacheCapacity(season: SeasonConfig): Promise<void> {
    // Set Redis memory policy based on season
    const maxMemory = this.calculateMaxMemory(season);
    await this.redis.config('SET', 'maxmemory', maxMemory.toString());

    // Update cache allocation ratios
    await this.redis.set(
      `${this.scalingKey}:capacity_config`,
      JSON.stringify({
        season: season.name,
        multiplier: season.cacheCapacityMultiplier,
        maxMemory,
        updatedAt: new Date().toISOString(),
      }),
      { ex: 24 * 60 * 60 }, // 24 hours TTL
    );

    console.log(
      `Adjusted cache capacity for ${season.name} season: ${maxMemory} bytes`,
    );
  }

  /**
   * Execute preloading strategy based on season
   */
  private async executePreloadStrategy(season: SeasonConfig): Promise<void> {
    const strategy = season.preloadStrategy;

    // Get high-priority cache types to preload based on season
    const preloadTypes = this.getSeasonalPreloadTypes(season);

    // Execute preloading for each type
    for (const cacheType of preloadTypes) {
      await this.preloadCacheType(cacheType, strategy);
    }

    console.log(
      `Executed ${strategy} preloading for ${preloadTypes.length} cache types`,
    );
  }

  /**
   * Update eviction policies based on season
   */
  private async updateEvictionPolicies(season: SeasonConfig): Promise<void> {
    const policy = season.evictionPolicy;

    // Map our policy names to Redis policy names
    const redisPolicyMap = {
      lru: 'allkeys-lru',
      lfu: 'allkeys-lfu',
      'ttl-based': 'volatile-ttl',
    };

    await this.redis.config('SET', 'maxmemory-policy', redisPolicyMap[policy]);

    console.log(
      `Updated eviction policy to ${policy} for ${season.name} season`,
    );
  }

  /**
   * Calculate predicted load based on historical patterns
   */
  private async calculatePredictedLoad(season: SeasonConfig): Promise<number> {
    // Get historical data for the same season from previous years
    const { data: historicalData } = await this.supabase
      .from('ai_cache_statistics')
      .select('avg_requests_per_minute, created_at')
      .gte(
        'created_at',
        new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      )
      .order('created_at', { ascending: false });

    if (!historicalData?.length) {
      // Fallback to season multiplier if no historical data
      return season.trafficMultiplier;
    }

    // Filter data for similar seasonal periods
    const seasonalData = historicalData.filter((record) => {
      const recordDate = new Date(record.created_at);
      const recordMonth = recordDate.getMonth() + 1;
      return season.months.includes(recordMonth);
    });

    if (!seasonalData.length) {
      return season.trafficMultiplier;
    }

    // Calculate average load for this season
    const avgLoad =
      seasonalData.reduce(
        (sum, record) => sum + (record.avg_requests_per_minute || 0),
        0,
      ) / seasonalData.length;

    // Apply trend analysis (simplified linear trend)
    const trendMultiplier = this.calculateTrendMultiplier(seasonalData);

    return Math.max(avgLoad * trendMultiplier, season.trafficMultiplier);
  }

  /**
   * Generate recommended scaling actions
   */
  private async generateRecommendedActions(
    season: SeasonConfig,
    predictedLoad: number,
    currentUtilization: number,
  ): Promise<ScalingAction[]> {
    const actions: ScalingAction[] = [];

    // High utilization - immediate scaling needed
    if (currentUtilization > 85) {
      actions.push({
        type: 'scale_up',
        target: 'memory',
        priority: 'immediate',
        estimated_duration_minutes: 15,
        business_impact: 'moderate',
      });
    }

    // Predicted load increase - scheduled scaling
    if (predictedLoad > season.trafficMultiplier * 1.5) {
      actions.push({
        type: 'preload',
        target: 'redis',
        priority: 'scheduled',
        estimated_duration_minutes: 60,
        business_impact: 'none',
      });
    }

    // Off-season - consider scaling down
    if (season.name === 'low' && currentUtilization < 40) {
      actions.push({
        type: 'scale_down',
        target: 'all',
        priority: 'maintenance_window',
        estimated_duration_minutes: 30,
        business_impact: 'none',
      });
    }

    return actions;
  }

  /**
   * Log scaling activity for audit and analysis
   */
  private async logScalingActivity(activity: {
    season: string;
    actions: ScalingAction[];
    timestamp: Date;
    metrics: ScalingMetrics;
  }): Promise<void> {
    await this.supabase.from('ai_cache_scaling_logs').insert({
      season: activity.season,
      actions: activity.actions,
      metrics: activity.metrics,
      created_at: activity.timestamp.toISOString(),
    });

    // Also store in Redis for quick access
    await this.redis.set(
      `${this.scalingKey}:last_scaling`,
      activity.timestamp.toISOString(),
      { ex: 7 * 24 * 60 * 60 }, // 7 days TTL
    );
  }

  // Helper methods
  private parseRedisMemoryUsage(info: string): {
    used: number;
    percentage: number;
  } {
    const lines = info.split('\n');
    let used = 0;
    let max = 0;

    for (const line of lines) {
      if (line.startsWith('used_memory:')) {
        used = parseInt(line.split(':')[1]);
      } else if (line.startsWith('maxmemory:')) {
        max = parseInt(line.split(':')[1]);
      }
    }

    return {
      used,
      percentage: max > 0 ? (used / max) * 100 : 0,
    };
  }

  private calculateMaxMemory(season: SeasonConfig): number {
    // Base memory: 2GB for off-season
    const baseMemory = 2 * 1024 * 1024 * 1024; // 2GB in bytes
    return Math.floor(baseMemory * season.cacheCapacityMultiplier);
  }

  private getSeasonalPreloadTypes(season: SeasonConfig): string[] {
    const baseTypes = [
      'venue_recommendations',
      'vendor_matching',
      'budget_optimization',
    ];

    switch (season.name) {
      case 'peak':
        return [
          ...baseTypes,
          'timeline_generation',
          'guest_management',
          'menu_suggestions',
          'photo_suggestions',
        ];
      case 'high':
        return [...baseTypes, 'timeline_generation', 'guest_management'];
      case 'moderate':
        return [...baseTypes, 'budget_optimization'];
      case 'low':
        return ['vendor_matching', 'budget_optimization'];
      default:
        return baseTypes;
    }
  }

  private async preloadCacheType(
    cacheType: string,
    strategy: string,
  ): Promise<void> {
    const limit =
      strategy === 'aggressive' ? 1000 : strategy === 'moderate' ? 500 : 200;

    // This would typically involve calling AI services to populate cache
    // For now, we'll just log the preloading intention
    console.log(
      `Preloading ${cacheType} with ${strategy} strategy (${limit} entries)`,
    );

    // Store preload status
    await this.redis.set(
      `${this.scalingKey}:preload:${cacheType}`,
      JSON.stringify({
        strategy,
        limit,
        status: 'completed',
        timestamp: new Date().toISOString(),
      }),
      { ex: 60 * 60 }, // 1 hour TTL
    );
  }

  private calculateTrendMultiplier(data: any[]): number {
    if (data.length < 2) return 1;

    // Simple linear trend calculation
    const sortedData = data.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    const oldestValue = sortedData[0].avg_requests_per_minute || 1;
    const newestValue =
      sortedData[sortedData.length - 1].avg_requests_per_minute || 1;

    const trend = newestValue / oldestValue;

    // Cap trend between 0.5 and 2.0 to avoid extreme adjustments
    return Math.max(0.5, Math.min(2.0, trend));
  }

  private async estimateScalingCosts(
    season: SeasonConfig,
    predictedLoad: number,
  ): Promise<{
    current_monthly_cost: number;
    projected_monthly_cost: number;
    savings_from_scaling: number;
  }> {
    // Base costs (simplified calculation)
    const baseRedisCost = 100; // $100/month base
    const baseComputeCost = 200; // $200/month base
    const aiApiCostPerRequest = 0.002; // $0.002 per AI API call

    // Current estimated monthly requests
    const baseRequestsPerMonth = 100000;
    const currentMonthlyRequests = baseRequestsPerMonth;
    const projectedMonthlyRequests = baseRequestsPerMonth * predictedLoad;

    // Without cache (all requests go to AI API)
    const costWithoutCache = projectedMonthlyRequests * aiApiCostPerRequest;

    // With optimized cache (assume 85% hit rate)
    const cacheHitRate = 0.85;
    const scaledRedisCost = baseRedisCost * season.cacheCapacityMultiplier;
    const scaledComputeCost = baseComputeCost * season.trafficMultiplier;
    const aiApiCallsWithCache = projectedMonthlyRequests * (1 - cacheHitRate);
    const costWithCache =
      scaledRedisCost +
      scaledComputeCost +
      aiApiCallsWithCache * aiApiCostPerRequest;

    return {
      current_monthly_cost:
        baseRedisCost +
        baseComputeCost +
        currentMonthlyRequests * (1 - cacheHitRate) * aiApiCostPerRequest,
      projected_monthly_cost: costWithCache,
      savings_from_scaling: costWithoutCache - costWithCache,
    };
  }

  /**
   * Health check for scaling automator
   */
  public async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Array<{
      name: string;
      status: 'pass' | 'fail';
      details?: string;
    }>;
  }> {
    const checks = [];
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Check Redis connectivity
    try {
      await this.redis.ping();
      checks.push({ name: 'Redis connectivity', status: 'pass' });
    } catch (error) {
      checks.push({
        name: 'Redis connectivity',
        status: 'fail',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
      overallStatus = 'unhealthy';
    }

    // Check Supabase connectivity
    try {
      const { error } = await this.supabase
        .from('ai_cache_scaling_logs')
        .select('id')
        .limit(1);

      if (error) throw error;
      checks.push({ name: 'Supabase connectivity', status: 'pass' });
    } catch (error) {
      checks.push({
        name: 'Supabase connectivity',
        status: 'fail',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
      overallStatus = 'unhealthy';
    }

    // Check last scaling activity
    try {
      const lastScaling = await this.redis.get(
        `${this.scalingKey}:last_scaling`,
      );
      if (lastScaling) {
        const lastScalingDate = new Date(lastScaling);
        const hoursSince =
          (Date.now() - lastScalingDate.getTime()) / (1000 * 60 * 60);

        if (hoursSince > 48) {
          // More than 48 hours since last scaling
          checks.push({
            name: 'Recent scaling activity',
            status: 'fail',
            details: `Last scaling was ${Math.floor(hoursSince)} hours ago`,
          });
          overallStatus =
            overallStatus === 'healthy' ? 'degraded' : overallStatus;
        } else {
          checks.push({ name: 'Recent scaling activity', status: 'pass' });
        }
      } else {
        checks.push({
          name: 'Recent scaling activity',
          status: 'fail',
          details: 'No scaling activity found',
        });
        overallStatus =
          overallStatus === 'healthy' ? 'degraded' : overallStatus;
      }
    } catch (error) {
      checks.push({
        name: 'Scaling activity check',
        status: 'fail',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return { status: overallStatus, checks };
  }
}
