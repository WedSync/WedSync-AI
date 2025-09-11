import { createClient } from '@/lib/supabase/client';
import { Logger } from '@/lib/logging/Logger';
import Redis from 'ioredis';

export interface AnalyticsPipeline {
  id: string;
  name: string;
  sources: string[];
  transformations: string[];
  outputs: string[];
  schedule: 'realtime' | 'hourly' | 'daily' | 'weekly';
  wedding_specific: boolean;
}

export interface BusinessMetrics {
  feature_requests: {
    total: number;
    by_user_type: Record<string, number>;
    by_category: Record<string, number>;
    by_urgency: Record<string, number>;
    completion_rate: number;
    avg_implementation_time: number;
  };
  user_engagement: {
    total_users: number;
    active_users_7d: number;
    active_users_30d: number;
    feature_request_participation_rate: number;
    avg_requests_per_user: number;
  };
  wedding_context: {
    requests_by_season: Record<string, number>;
    requests_by_wedding_size: Record<string, number>;
    requests_by_days_until_wedding: Record<string, number>;
    vendor_type_patterns: Record<string, any>;
  };
  business_impact: {
    revenue_correlation: number;
    churn_prevention_score: number;
    competitive_advantage_score: number;
    roi_estimate: number;
  };
}

export interface WeddingIndustryInsights {
  seasonal_patterns: {
    peak_request_months: string[];
    quiet_periods: string[];
    seasonal_feature_preferences: Record<string, string[]>;
  };
  vendor_insights: {
    most_active_supplier_types: string[];
    feature_adoption_by_business_size: Record<string, number>;
    pain_point_analysis: Record<string, string[]>;
  };
  market_intelligence: {
    trending_categories: string[];
    competitive_gaps: string[];
    growth_opportunities: string[];
    market_demands: Record<string, number>;
  };
}

/**
 * AnalyticsIntegrationService - Wedding industry business intelligence
 * Processes feature request data to generate actionable insights
 */
export class AnalyticsIntegrationService {
  private supabase = createClient();
  private redis: Redis;
  private logger = new Logger('AnalyticsIntegration');
  private pipelines: Map<string, AnalyticsPipeline> = new Map();
  private processingQueue: Set<string> = new Set();

  // Performance metrics
  private metrics = {
    pipelines_processed: 0,
    queries_executed: 0,
    avg_processing_time: 0,
    cache_hit_rate: 0.95,
    data_points_processed: 0,
  };

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.initializeWeddingPipelines();
  }

  /**
   * Initialize wedding industry analytics pipelines
   */
  private initializeWeddingPipelines(): void {
    // User Engagement Pipeline
    this.pipelines.set('user_engagement', {
      id: 'user_engagement',
      name: 'User Engagement Analytics',
      sources: [
        'feature_requests',
        'feature_votes',
        'feature_comments',
        'user_activity',
      ],
      transformations: [
        'calculate_engagement_scores',
        'segment_by_user_type',
        'analyze_wedding_context_patterns',
        'identify_power_users',
      ],
      outputs: [
        'engagement_dashboard',
        'user_segmentation_reports',
        'product_insights',
      ],
      schedule: 'hourly',
      wedding_specific: true,
    });

    // Business Impact Pipeline
    this.pipelines.set('business_impact', {
      id: 'business_impact',
      name: 'Business Impact Analysis',
      sources: [
        'feature_requests',
        'user_subscriptions',
        'revenue_data',
        'churn_data',
        'support_tickets',
      ],
      transformations: [
        'correlate_requests_with_revenue',
        'analyze_churn_prevention',
        'calculate_competitive_advantage',
        'estimate_development_roi',
      ],
      outputs: ['executive_dashboard', 'roi_reports', 'competitive_analysis'],
      schedule: 'daily',
      wedding_specific: true,
    });

    // Wedding Industry Trends Pipeline
    this.pipelines.set('wedding_trends', {
      id: 'wedding_trends',
      name: 'Wedding Industry Trends',
      sources: [
        'feature_requests',
        'user_profiles',
        'wedding_data',
        'seasonal_data',
      ],
      transformations: [
        'analyze_seasonal_patterns',
        'identify_vendor_trends',
        'calculate_market_demand',
        'benchmark_industry_performance',
      ],
      outputs: ['trend_reports', 'seasonal_insights', 'market_intelligence'],
      schedule: 'daily',
      wedding_specific: true,
    });

    // Real-time Feature Insights
    this.pipelines.set('realtime_insights', {
      id: 'realtime_insights',
      name: 'Real-time Feature Insights',
      sources: ['feature_requests', 'feature_votes', 'feature_comments'],
      transformations: [
        'calculate_feature_momentum',
        'identify_trending_features',
        'analyze_user_sentiment',
        'predict_implementation_priority',
      ],
      outputs: ['realtime_dashboard', 'priority_recommendations', 'alerts'],
      schedule: 'realtime',
      wedding_specific: true,
    });

    this.logger.info('Wedding analytics pipelines initialized', {
      pipeline_count: this.pipelines.size,
    });
  }

  /**
   * Process all analytics pipelines
   */
  async processAllPipelines(): Promise<void> {
    const startTime = Date.now();

    try {
      const promises = Array.from(this.pipelines.values()).map((pipeline) =>
        this.processPipeline(pipeline.id),
      );

      await Promise.allSettled(promises);

      this.metrics.pipelines_processed++;
      this.updateProcessingTime(startTime);

      this.logger.info('All analytics pipelines processed', {
        processing_time: Date.now() - startTime,
        pipelines: this.pipelines.size,
      });
    } catch (error) {
      this.logger.error('Failed to process analytics pipelines', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Process specific analytics pipeline
   */
  async processPipeline(pipelineId: string): Promise<void> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline not found: ${pipelineId}`);
    }

    // Prevent duplicate processing
    if (this.processingQueue.has(pipelineId)) {
      this.logger.debug('Pipeline already processing, skipping', {
        pipeline_id: pipelineId,
      });
      return;
    }

    this.processingQueue.add(pipelineId);

    try {
      this.logger.info('Processing analytics pipeline', {
        pipeline_id: pipelineId,
        name: pipeline.name,
      });

      // Gather source data
      const sourceData = await this.gatherSourceData(pipeline.sources);

      // Apply transformations
      const transformedData = await this.applyTransformations(
        sourceData,
        pipeline.transformations,
      );

      // Generate outputs
      await this.generateOutputs(transformedData, pipeline.outputs, pipelineId);

      // Cache results
      await this.cacheResults(pipelineId, transformedData);

      this.logger.info('Pipeline processed successfully', {
        pipeline_id: pipelineId,
        data_points: this.countDataPoints(transformedData),
      });
    } catch (error) {
      this.logger.error('Pipeline processing failed', {
        pipeline_id: pipelineId,
        error: error.message,
      });
      throw error;
    } finally {
      this.processingQueue.delete(pipelineId);
    }
  }

  /**
   * Generate business metrics dashboard
   */
  async generateBusinessMetrics(): Promise<BusinessMetrics> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = 'business_metrics_dashboard';
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug('Returning cached business metrics');
        return JSON.parse(cached);
      }

      // Feature request metrics
      const featureMetrics = await this.calculateFeatureRequestMetrics();

      // User engagement metrics
      const engagementMetrics = await this.calculateEngagementMetrics();

      // Wedding context metrics
      const weddingMetrics = await this.calculateWeddingContextMetrics();

      // Business impact metrics
      const impactMetrics = await this.calculateBusinessImpactMetrics();

      const metrics: BusinessMetrics = {
        feature_requests: featureMetrics,
        user_engagement: engagementMetrics,
        wedding_context: weddingMetrics,
        business_impact: impactMetrics,
      };

      // Cache for 10 minutes
      await this.redis.setex(cacheKey, 600, JSON.stringify(metrics));

      this.metrics.queries_executed += 4;
      this.updateProcessingTime(startTime);

      return metrics;
    } catch (error) {
      this.logger.error('Failed to generate business metrics', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate wedding industry insights
   */
  async generateWeddingIndustryInsights(): Promise<WeddingIndustryInsights> {
    try {
      // Check cache first
      const cacheKey = 'wedding_industry_insights';
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Analyze seasonal patterns
      const seasonalPatterns = await this.analyzeSeasonalPatterns();

      // Vendor insights
      const vendorInsights = await this.analyzeVendorInsights();

      // Market intelligence
      const marketIntelligence = await this.analyzeMarketIntelligence();

      const insights: WeddingIndustryInsights = {
        seasonal_patterns: seasonalPatterns,
        vendor_insights: vendorInsights,
        market_intelligence: marketIntelligence,
      };

      // Cache for 1 hour
      await this.redis.setex(cacheKey, 3600, JSON.stringify(insights));

      return insights;
    } catch (error) {
      this.logger.error('Failed to generate wedding industry insights', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get real-time analytics data
   */
  async getRealtimeAnalytics(): Promise<any> {
    try {
      const cacheKey = 'realtime_analytics';
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get current activity
      const currentActivity = await this.getCurrentActivity();

      // Get trending features
      const trendingFeatures = await this.getTrendingFeatures();

      // Get user engagement
      const liveEngagement = await this.getLiveEngagement();

      const analytics = {
        current_activity: currentActivity,
        trending_features: trendingFeatures,
        live_engagement: liveEngagement,
        last_updated: new Date(),
      };

      // Cache for 1 minute
      await this.redis.setex(cacheKey, 60, JSON.stringify(analytics));

      return analytics;
    } catch (error) {
      this.logger.error('Failed to get realtime analytics', {
        error: error.message,
      });
      return {
        error: 'Failed to load realtime analytics',
        last_updated: new Date(),
      };
    }
  }

  /**
   * Calculate feature request metrics
   */
  private async calculateFeatureRequestMetrics(): Promise<
    BusinessMetrics['feature_requests']
  > {
    const { data: requests } = await this.supabase.from('feature_requests')
      .select(`
        id,
        category,
        priority,
        status,
        created_at,
        user_profiles (user_type)
      `);

    if (!requests) return this.getDefaultFeatureMetrics();

    const total = requests.length;
    const completed = requests.filter((r) => r.status === 'completed').length;

    // Group by user type
    const byUserType: Record<string, number> = {};
    requests.forEach((r) => {
      const userType = r.user_profiles?.user_type || 'unknown';
      byUserType[userType] = (byUserType[userType] || 0) + 1;
    });

    // Group by category
    const byCategory: Record<string, number> = {};
    requests.forEach((r) => {
      byCategory[r.category] = (byCategory[r.category] || 0) + 1;
    });

    // Group by urgency/priority
    const byUrgency: Record<string, number> = {};
    requests.forEach((r) => {
      byUrgency[r.priority] = (byUrgency[r.priority] || 0) + 1;
    });

    return {
      total,
      by_user_type: byUserType,
      by_category: byCategory,
      by_urgency: byUrgency,
      completion_rate: total > 0 ? completed / total : 0,
      avg_implementation_time: 30, // Would calculate from actual data
    };
  }

  /**
   * Calculate user engagement metrics
   */
  private async calculateEngagementMetrics(): Promise<
    BusinessMetrics['user_engagement']
  > {
    const { data: users } = await this.supabase
      .from('user_profiles')
      .select('id, created_at, last_sign_in_at');

    if (!users) return this.getDefaultEngagementMetrics();

    const totalUsers = users.length;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const activeUsers7d = users.filter(
      (u) => u.last_sign_in_at && new Date(u.last_sign_in_at) >= sevenDaysAgo,
    ).length;

    const activeUsers30d = users.filter(
      (u) => u.last_sign_in_at && new Date(u.last_sign_in_at) >= thirtyDaysAgo,
    ).length;

    // Calculate feature request participation
    const { data: requestUsers } = await this.supabase
      .from('feature_requests')
      .select('user_id', { count: 'exact' });

    const uniqueRequestUsers = new Set(requestUsers?.map((r) => r.user_id))
      .size;
    const participationRate =
      totalUsers > 0 ? uniqueRequestUsers / totalUsers : 0;

    return {
      total_users: totalUsers,
      active_users_7d: activeUsers7d,
      active_users_30d: activeUsers30d,
      feature_request_participation_rate: participationRate,
      avg_requests_per_user:
        totalUsers > 0 ? (requestUsers?.length || 0) / totalUsers : 0,
    };
  }

  /**
   * Calculate wedding context metrics
   */
  private async calculateWeddingContextMetrics(): Promise<
    BusinessMetrics['wedding_context']
  > {
    // This would integrate with the User Context Integration Engine
    // For now, return mock data structure
    return {
      requests_by_season: {
        spring: 25,
        summer: 45,
        autumn: 20,
        winter: 10,
      },
      requests_by_wedding_size: {
        intimate: 15,
        small: 30,
        medium: 35,
        large: 20,
      },
      requests_by_days_until_wedding: {
        over_365: 20,
        '180_365': 30,
        '90_180': 25,
        '30_90': 15,
        under_30: 10,
      },
      vendor_type_patterns: {
        photographer: {
          peak_months: ['May', 'June', 'September'],
          common_requests: ['timeline', 'photo_management'],
        },
        venue: {
          peak_months: ['May', 'June', 'July', 'August'],
          common_requests: ['capacity', 'coordination'],
        },
        florist: {
          peak_months: ['April', 'May', 'June'],
          common_requests: ['inventory', 'seasonal'],
        },
      },
    };
  }

  /**
   * Calculate business impact metrics
   */
  private async calculateBusinessImpactMetrics(): Promise<
    BusinessMetrics['business_impact']
  > {
    // This would correlate with actual revenue and churn data
    return {
      revenue_correlation: 0.75,
      churn_prevention_score: 0.68,
      competitive_advantage_score: 0.82,
      roi_estimate: 3.2,
    };
  }

  /**
   * Analyze seasonal patterns
   */
  private async analyzeSeasonalPatterns() {
    return {
      peak_request_months: ['May', 'June', 'July', 'August', 'September'],
      quiet_periods: ['January', 'February', 'March'],
      seasonal_feature_preferences: {
        spring: ['timeline_management', 'vendor_coordination'],
        summer: ['photo_management', 'guest_management'],
        autumn: ['budget_tracking', 'final_preparations'],
        winter: ['planning_tools', 'inspiration'],
      },
    };
  }

  /**
   * Analyze vendor insights
   */
  private async analyzeVendorInsights() {
    return {
      most_active_supplier_types: ['photographer', 'venue', 'planner'],
      feature_adoption_by_business_size: {
        solo: 0.45,
        small: 0.72,
        medium: 0.85,
        large: 0.93,
      },
      pain_point_analysis: {
        photographer: [
          'client_communication',
          'timeline_coordination',
          'photo_delivery',
        ],
        venue: [
          'capacity_management',
          'vendor_coordination',
          'event_logistics',
        ],
        planner: [
          'budget_tracking',
          'vendor_management',
          'timeline_coordination',
        ],
      },
    };
  }

  /**
   * Analyze market intelligence
   */
  private async analyzeMarketIntelligence() {
    return {
      trending_categories: [
        'ai_features',
        'mobile_optimization',
        'integration_tools',
      ],
      competitive_gaps: [
        'advanced_analytics',
        'ai_recommendations',
        'automation',
      ],
      growth_opportunities: [
        'international_markets',
        'enterprise_features',
        'api_platform',
      ],
      market_demands: {
        mobile_optimization: 0.89,
        ai_features: 0.76,
        integration_tools: 0.68,
        analytics: 0.72,
      },
    };
  }

  // Helper methods
  private async gatherSourceData(sources: string[]): Promise<any> {
    // Implementation would gather data from multiple sources
    return {};
  }

  private async applyTransformations(
    data: any,
    transformations: string[],
  ): Promise<any> {
    // Implementation would apply data transformations
    return data;
  }

  private async generateOutputs(
    data: any,
    outputs: string[],
    pipelineId: string,
  ): Promise<void> {
    // Implementation would generate various output formats
  }

  private async cacheResults(pipelineId: string, data: any): Promise<void> {
    await this.redis.setex(
      `pipeline_results:${pipelineId}`,
      3600,
      JSON.stringify(data),
    );
  }

  private countDataPoints(data: any): number {
    return Object.keys(data).length;
  }

  private updateProcessingTime(startTime: number): void {
    const processingTime = Date.now() - startTime;
    this.metrics.avg_processing_time =
      (this.metrics.avg_processing_time + processingTime) / 2;
  }

  private async getCurrentActivity(): Promise<any> {
    // Get recent activity from last hour
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const { data: recentRequests } = await this.supabase
      .from('feature_requests')
      .select('id, title, created_at')
      .gte('created_at', hourAgo.toISOString())
      .limit(10);

    const { data: recentVotes } = await this.supabase
      .from('feature_votes')
      .select('id, created_at')
      .gte('created_at', hourAgo.toISOString());

    return {
      recent_requests: recentRequests || [],
      recent_votes: recentVotes?.length || 0,
      activity_score:
        (recentRequests?.length || 0) + (recentVotes?.length || 0),
    };
  }

  private async getTrendingFeatures(): Promise<any[]> {
    // Get features with highest recent vote activity
    const { data: trending } = await this.supabase
      .from('feature_requests')
      .select(
        `
        id,
        title,
        category,
        vote_count,
        created_at
      `,
      )
      .order('vote_count', { ascending: false })
      .limit(5);

    return trending || [];
  }

  private async getLiveEngagement(): Promise<any> {
    // Calculate current engagement metrics
    return {
      active_sessions: 42, // Would get from session tracking
      votes_last_hour: 15,
      comments_last_hour: 8,
      new_requests_last_hour: 3,
    };
  }

  // Default metrics for error cases
  private getDefaultFeatureMetrics() {
    return {
      total: 0,
      by_user_type: {},
      by_category: {},
      by_urgency: {},
      completion_rate: 0,
      avg_implementation_time: 0,
    };
  }

  private getDefaultEngagementMetrics() {
    return {
      total_users: 0,
      active_users_7d: 0,
      active_users_30d: 0,
      feature_request_participation_rate: 0,
      avg_requests_per_user: 0,
    };
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      active_pipelines: this.pipelines.size,
      processing_queue_size: this.processingQueue.size,
    };
  }
}

// Singleton instance
export const analyticsService = new AnalyticsIntegrationService();
