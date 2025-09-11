/**
 * AI Usage Tracking Service - Cross-provider analytics and reporting
 * Tracks usage, costs, and performance across Platform and Client AI providers
 * Provides detailed analytics for wedding industry optimization
 *
 * WS-239 Team C - Integration Focus
 */

import { Logger } from '../../utils/logger';
import { createClient } from '@supabase/supabase-js';
import {
  AIProvider,
  AIUsageTrackingInterface,
} from '../types/ai-provider-types';

// Analytics interfaces
export interface AIRequestTracking {
  id: string;
  supplierId: string;
  provider: AIProvider;
  requestType: string;
  tokensUsed: number;
  cost: number;
  responseTime: number;
  success: boolean;
  errorType?: string;
  timestamp: Date;
  weddingDate?: Date;
  isWeddingDay: boolean;
  metadata?: Record<string, any>;
}

export interface SupplierUsageAnalytics {
  supplierId: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  averageResponseTime: number;
  successRate: number;
  providerBreakdown: {
    [provider: string]: {
      requests: number;
      tokens: number;
      cost: number;
      avgResponseTime: number;
      successRate: number;
    };
  };
  requestTypeBreakdown: {
    [type: string]: {
      requests: number;
      tokens: number;
      cost: number;
      avgResponseTime: number;
    };
  };
  weddingSeasonMetrics: {
    peakSeasonRequests: number;
    offSeasonRequests: number;
    weddingDayRequests: number;
    costSavings: number;
  };
}

export interface UsageTrends {
  timeRange: {
    start: Date;
    end: Date;
  };
  granularity: 'hour' | 'day' | 'week' | 'month';
  dataPoints: UsageDataPoint[];
  trends: {
    requestVolume: TrendAnalysis;
    tokenUsage: TrendAnalysis;
    costs: TrendAnalysis;
    performance: TrendAnalysis;
  };
}

export interface UsageDataPoint {
  timestamp: Date;
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  averageResponseTime: number;
  successRate: number;
  providerDistribution: { [provider: string]: number };
}

export interface TrendAnalysis {
  direction: 'increasing' | 'decreasing' | 'stable';
  changePercent: number;
  significance: 'low' | 'medium' | 'high';
  prediction: number;
}

export interface CostOptimizationInsights {
  supplierId: string;
  currentCosts: {
    platform: number;
    client: number;
    total: number;
  };
  projectedSavings: {
    switchToPlatform: number;
    switchToClient: number;
    hybridOptimization: number;
  };
  recommendations: CostRecommendation[];
  weddingSeasonImpact: {
    peakSeasonCostIncrease: number;
    recommendedStrategy: string;
  };
}

export interface CostRecommendation {
  type:
    | 'provider_switch'
    | 'tier_upgrade'
    | 'usage_optimization'
    | 'seasonal_planning';
  priority: 'low' | 'medium' | 'high';
  description: string;
  potentialSavings: number;
  implementationComplexity: 'low' | 'medium' | 'high';
  timeframe: string;
}

export interface WeddingIndustryMetrics {
  timeRange: {
    start: Date;
    end: Date;
  };
  seasonalAnalysis: {
    peakSeasonMonths: number[];
    offSeasonMonths: number[];
    peakSeasonMultiplier: number;
    volumeDistribution: { [month: string]: number };
  };
  vendorTypeAnalysis: {
    [vendorType: string]: {
      requestVolume: number;
      preferredProviders: string[];
      averageCost: number;
      commonRequestTypes: string[];
    };
  };
  weddingDayMetrics: {
    totalWeddingDayRequests: number;
    averageResponseTime: number;
    successRate: number;
    criticalFailures: number;
  };
  regionalAnalysis?: {
    [region: string]: {
      volume: number;
      preferredProviders: string[];
      averageCost: number;
    };
  };
}

/**
 * AI Usage Tracking Service
 * Comprehensive analytics and tracking for AI provider usage
 */
export class AIUsageTrackingService implements AIUsageTrackingInterface {
  private logger: Logger;
  private supabase: any;

  // In-memory tracking for real-time analytics
  private recentRequests: AIRequestTracking[] = [];
  private supplierCache: Map<string, SupplierUsageAnalytics> = new Map();

  // Wedding season configuration
  private weddingSeasonMonths = [2, 3, 4, 5, 6, 7, 8, 9]; // March-October (0-indexed)

  // Analytics configuration
  private config = {
    realtimeBufferSize: 1000,
    cacheUpdateInterval: 5 * 60 * 1000, // 5 minutes
    trendAnalysisWindow: 30, // days
    costOptimizationThreshold: 0.15, // 15% savings threshold
  };

  constructor() {
    this.logger = new Logger('AIUsageTrackingService');

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Initialize background processes
    this.initializeAnalyticsProcessing();
  }

  /**
   * Track AI request with full analytics capture
   */
  async trackRequest(
    request: any,
    response: any,
    provider: AIProvider,
  ): Promise<void> {
    try {
      const tracking: AIRequestTracking = {
        id: request.id,
        supplierId: request.supplierId,
        provider,
        requestType: request.requestType,
        tokensUsed: response.usage?.tokensUsed || 0,
        cost: response.usage?.cost || 0,
        responseTime: response.usage?.processingTime || 0,
        success: response.success,
        errorType: response.error
          ? this.classifyError(response.error)
          : undefined,
        timestamp: new Date(),
        weddingDate: request.weddingDate,
        isWeddingDay: request.isWeddingDay || false,
        metadata: {
          model: response.metadata?.model,
          tier: response.metadata?.tier,
          failover: response.metadata?.failover,
          seasonal_multiplier: response.metadata?.seasonal_multiplier,
        },
      };

      // Add to real-time buffer
      this.recentRequests.push(tracking);
      if (this.recentRequests.length > this.config.realtimeBufferSize) {
        this.recentRequests = this.recentRequests.slice(
          -this.config.realtimeBufferSize,
        );
      }

      // Persist to database
      await this.persistRequestTracking(tracking);

      // Update supplier cache
      await this.updateSupplierCache(tracking);

      this.logger.debug(`Request tracked successfully`, {
        requestId: tracking.id,
        provider: tracking.provider,
        tokensUsed: tracking.tokensUsed,
        cost: tracking.cost,
      });
    } catch (error) {
      this.logger.error(`Failed to track AI request`, {
        requestId: request.id,
        error: error.message,
      });
      // Don't throw - tracking should not break the main flow
    }
  }

  /**
   * Get comprehensive usage analytics for supplier
   */
  async getSupplierAnalytics(
    supplierId: string,
    timeRange: { start: Date; end: Date },
  ): Promise<SupplierUsageAnalytics> {
    try {
      this.logger.debug(`Getting supplier analytics`, {
        supplierId,
        timeRange,
      });

      // Query database for comprehensive data
      const { data, error } = await this.supabase
        .from('ai_usage_tracking')
        .select('*')
        .eq('supplier_id', supplierId)
        .gte('timestamp', timeRange.start.toISOString())
        .lte('timestamp', timeRange.end.toISOString())
        .order('timestamp', { ascending: false });

      if (error) {
        throw error;
      }

      // Process data into analytics
      return this.processSupplierData(supplierId, data || [], timeRange);
    } catch (error) {
      this.logger.error(`Failed to get supplier analytics`, {
        supplierId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get usage trends with predictive analysis
   */
  async getUsageTrends(
    supplierId?: string,
    granularity: 'hour' | 'day' | 'week' | 'month' = 'day',
    daysBack: number = 30,
  ): Promise<UsageTrends> {
    const timeRange = {
      start: new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000),
      end: new Date(),
    };

    try {
      // Query aggregated data
      const query = this.supabase
        .from('ai_usage_tracking')
        .select('*')
        .gte('timestamp', timeRange.start.toISOString())
        .lte('timestamp', timeRange.end.toISOString());

      if (supplierId) {
        query.eq('supplier_id', supplierId);
      }

      const { data, error } = await query.order('timestamp', {
        ascending: true,
      });

      if (error) {
        throw error;
      }

      return this.processTrendData(data || [], timeRange, granularity);
    } catch (error) {
      this.logger.error(`Failed to get usage trends`, {
        supplierId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate cost optimization insights
   */
  async getCostOptimizationInsights(
    supplierId: string,
  ): Promise<CostOptimizationInsights> {
    try {
      const analytics = await this.getSupplierAnalytics(supplierId, {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      });

      // Calculate current costs
      const platformCost =
        analytics.providerBreakdown[AIProvider.PLATFORM_OPENAI]?.cost || 0;
      const clientCost = Object.entries(analytics.providerBreakdown)
        .filter(([provider]) => provider !== AIProvider.PLATFORM_OPENAI)
        .reduce((sum, [, data]) => sum + (data.cost || 0), 0);

      // Project savings scenarios
      const totalTokens = analytics.totalTokens;
      const projectedPlatformCost = this.calculateProjectedCost(
        'platform',
        totalTokens,
      );
      const projectedClientCost = this.calculateProjectedCost(
        'client',
        totalTokens,
      );

      const insights: CostOptimizationInsights = {
        supplierId,
        currentCosts: {
          platform: platformCost,
          client: clientCost,
          total: platformCost + clientCost,
        },
        projectedSavings: {
          switchToPlatform: Math.max(0, clientCost - projectedPlatformCost),
          switchToClient: Math.max(0, platformCost - projectedClientCost),
          hybridOptimization: this.calculateHybridSavings(analytics),
        },
        recommendations: await this.generateCostRecommendations(analytics),
        weddingSeasonImpact: {
          peakSeasonCostIncrease: this.calculateSeasonalCostIncrease(analytics),
          recommendedStrategy: this.recommendSeasonalStrategy(analytics),
        },
      };

      return insights;
    } catch (error) {
      this.logger.error(`Failed to generate cost optimization insights`, {
        supplierId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get wedding industry specific metrics
   */
  async getWeddingIndustryMetrics(
    daysBack: number = 90,
  ): Promise<WeddingIndustryMetrics> {
    const timeRange = {
      start: new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000),
      end: new Date(),
    };

    try {
      // Query all usage data for industry analysis
      const { data, error } = await this.supabase
        .from('ai_usage_tracking')
        .select(
          `
          *,
          organizations!inner(vendor_type, region)
        `,
        )
        .gte('timestamp', timeRange.start.toISOString())
        .lte('timestamp', timeRange.end.toISOString());

      if (error) {
        throw error;
      }

      return this.processWeddingIndustryData(data || [], timeRange);
    } catch (error) {
      this.logger.error(`Failed to get wedding industry metrics`, {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get real-time usage statistics
   */
  getRealTimeStats(): any {
    const recentWindow = this.recentRequests.filter(
      (req) => req.timestamp.getTime() > Date.now() - 60 * 1000, // Last minute
    );

    return {
      lastMinute: {
        totalRequests: recentWindow.length,
        successRate:
          recentWindow.length > 0
            ? (recentWindow.filter((r) => r.success).length /
                recentWindow.length) *
              100
            : 100,
        averageResponseTime:
          recentWindow.length > 0
            ? recentWindow.reduce((sum, r) => sum + r.responseTime, 0) /
              recentWindow.length
            : 0,
        totalCost: recentWindow.reduce((sum, r) => sum + r.cost, 0),
        providerDistribution: this.calculateProviderDistribution(recentWindow),
        weddingDayRequests: recentWindow.filter((r) => r.isWeddingDay).length,
      },
      bufferSize: this.recentRequests.length,
      oldestEntry:
        this.recentRequests.length > 0
          ? this.recentRequests[0].timestamp
          : null,
    };
  }

  // Private helper methods

  private async persistRequestTracking(
    tracking: AIRequestTracking,
  ): Promise<void> {
    try {
      const { error } = await this.supabase.from('ai_usage_tracking').insert({
        id: tracking.id,
        supplier_id: tracking.supplierId,
        provider: tracking.provider,
        request_type: tracking.requestType,
        tokens_used: tracking.tokensUsed,
        cost: tracking.cost,
        response_time: tracking.responseTime,
        success: tracking.success,
        error_type: tracking.errorType,
        timestamp: tracking.timestamp.toISOString(),
        wedding_date: tracking.weddingDate?.toISOString(),
        is_wedding_day: tracking.isWeddingDay,
        metadata: tracking.metadata,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      this.logger.error(`Failed to persist request tracking`, {
        requestId: tracking.id,
        error: error.message,
      });
    }
  }

  private async updateSupplierCache(
    tracking: AIRequestTracking,
  ): Promise<void> {
    // Update in-memory cache for real-time analytics
    // Implementation would aggregate data by supplier
  }

  private processSupplierData(
    supplierId: string,
    data: any[],
    timeRange: { start: Date; end: Date },
  ): SupplierUsageAnalytics {
    const analytics: SupplierUsageAnalytics = {
      supplierId,
      timeRange,
      totalRequests: data.length,
      totalTokens: data.reduce((sum, d) => sum + (d.tokens_used || 0), 0),
      totalCost: data.reduce((sum, d) => sum + (d.cost || 0), 0),
      averageResponseTime:
        data.length > 0
          ? data.reduce((sum, d) => sum + (d.response_time || 0), 0) /
            data.length
          : 0,
      successRate:
        data.length > 0
          ? (data.filter((d) => d.success).length / data.length) * 100
          : 100,
      providerBreakdown: {},
      requestTypeBreakdown: {},
      weddingSeasonMetrics: {
        peakSeasonRequests: 0,
        offSeasonRequests: 0,
        weddingDayRequests: 0,
        costSavings: 0,
      },
    };

    // Process provider breakdown
    const providers = [...new Set(data.map((d) => d.provider))];
    providers.forEach((provider) => {
      const providerData = data.filter((d) => d.provider === provider);
      analytics.providerBreakdown[provider] = {
        requests: providerData.length,
        tokens: providerData.reduce((sum, d) => sum + (d.tokens_used || 0), 0),
        cost: providerData.reduce((sum, d) => sum + (d.cost || 0), 0),
        avgResponseTime:
          providerData.length > 0
            ? providerData.reduce((sum, d) => sum + (d.response_time || 0), 0) /
              providerData.length
            : 0,
        successRate:
          providerData.length > 0
            ? (providerData.filter((d) => d.success).length /
                providerData.length) *
              100
            : 100,
      };
    });

    // Process request type breakdown
    const requestTypes = [...new Set(data.map((d) => d.request_type))];
    requestTypes.forEach((type) => {
      const typeData = data.filter((d) => d.request_type === type);
      analytics.requestTypeBreakdown[type] = {
        requests: typeData.length,
        tokens: typeData.reduce((sum, d) => sum + (d.tokens_used || 0), 0),
        cost: typeData.reduce((sum, d) => sum + (d.cost || 0), 0),
        avgResponseTime:
          typeData.length > 0
            ? typeData.reduce((sum, d) => sum + (d.response_time || 0), 0) /
              typeData.length
            : 0,
      };
    });

    // Process wedding season metrics
    data.forEach((d) => {
      const month = new Date(d.timestamp).getMonth();
      if (this.weddingSeasonMonths.includes(month)) {
        analytics.weddingSeasonMetrics.peakSeasonRequests++;
      } else {
        analytics.weddingSeasonMetrics.offSeasonRequests++;
      }

      if (d.is_wedding_day) {
        analytics.weddingSeasonMetrics.weddingDayRequests++;
      }
    });

    return analytics;
  }

  private processTrendData(
    data: any[],
    timeRange: { start: Date; end: Date },
    granularity: string,
  ): UsageTrends {
    // Group data by time intervals
    const dataPoints: UsageDataPoint[] = [];

    // Create time buckets
    const bucketSize = this.getBucketSize(granularity);
    const startTime = timeRange.start.getTime();
    const endTime = timeRange.end.getTime();

    for (let time = startTime; time <= endTime; time += bucketSize) {
      const bucketStart = new Date(time);
      const bucketEnd = new Date(time + bucketSize);

      const bucketData = data.filter((d) => {
        const timestamp = new Date(d.timestamp).getTime();
        return (
          timestamp >= bucketStart.getTime() && timestamp < bucketEnd.getTime()
        );
      });

      dataPoints.push({
        timestamp: bucketStart,
        totalRequests: bucketData.length,
        totalTokens: bucketData.reduce(
          (sum, d) => sum + (d.tokens_used || 0),
          0,
        ),
        totalCost: bucketData.reduce((sum, d) => sum + (d.cost || 0), 0),
        averageResponseTime:
          bucketData.length > 0
            ? bucketData.reduce((sum, d) => sum + (d.response_time || 0), 0) /
              bucketData.length
            : 0,
        successRate:
          bucketData.length > 0
            ? (bucketData.filter((d) => d.success).length / bucketData.length) *
              100
            : 100,
        providerDistribution: this.calculateProviderDistribution(
          bucketData.map((d) => ({
            provider: d.provider,
          })),
        ),
      });
    }

    // Calculate trends
    const trends = {
      requestVolume: this.calculateTrend(
        dataPoints.map((dp) => dp.totalRequests),
      ),
      tokenUsage: this.calculateTrend(dataPoints.map((dp) => dp.totalTokens)),
      costs: this.calculateTrend(dataPoints.map((dp) => dp.totalCost)),
      performance: this.calculateTrend(
        dataPoints.map((dp) => dp.averageResponseTime),
      ),
    };

    return {
      timeRange,
      granularity,
      dataPoints,
      trends,
    };
  }

  private processWeddingIndustryData(
    data: any[],
    timeRange: { start: Date; end: Date },
  ): WeddingIndustryMetrics {
    // Calculate seasonal analysis
    const monthlyDistribution: { [month: string]: number } = {};
    const vendorTypeAnalysis: { [vendorType: string]: any } = {};

    data.forEach((d) => {
      const month = new Date(d.timestamp).getMonth();
      const monthName = new Date(2024, month, 1).toLocaleString('default', {
        month: 'long',
      });
      monthlyDistribution[monthName] =
        (monthlyDistribution[monthName] || 0) + 1;

      const vendorType = d.organizations?.vendor_type || 'unknown';
      if (!vendorTypeAnalysis[vendorType]) {
        vendorTypeAnalysis[vendorType] = {
          requestVolume: 0,
          preferredProviders: new Map(),
          totalCost: 0,
          requestTypes: new Map(),
        };
      }

      vendorTypeAnalysis[vendorType].requestVolume++;
      vendorTypeAnalysis[vendorType].totalCost += d.cost || 0;

      const providerCount =
        vendorTypeAnalysis[vendorType].preferredProviders.get(d.provider) || 0;
      vendorTypeAnalysis[vendorType].preferredProviders.set(
        d.provider,
        providerCount + 1,
      );

      const typeCount =
        vendorTypeAnalysis[vendorType].requestTypes.get(d.request_type) || 0;
      vendorTypeAnalysis[vendorType].requestTypes.set(
        d.request_type,
        typeCount + 1,
      );
    });

    // Process vendor type analysis
    const processedVendorTypes: { [vendorType: string]: any } = {};
    Object.entries(vendorTypeAnalysis).forEach(
      ([vendorType, analysis]: [string, any]) => {
        processedVendorTypes[vendorType] = {
          requestVolume: analysis.requestVolume,
          preferredProviders: Array.from(analysis.preferredProviders.entries())
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([provider]) => provider),
          averageCost:
            analysis.requestVolume > 0
              ? analysis.totalCost / analysis.requestVolume
              : 0,
          commonRequestTypes: Array.from(analysis.requestTypes.entries())
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([type]) => type),
        };
      },
    );

    return {
      timeRange,
      seasonalAnalysis: {
        peakSeasonMonths: this.weddingSeasonMonths,
        offSeasonMonths: [0, 1, 10, 11],
        peakSeasonMultiplier: this.calculateSeasonalMultiplier(data),
        volumeDistribution: monthlyDistribution,
      },
      vendorTypeAnalysis: processedVendorTypes,
      weddingDayMetrics: {
        totalWeddingDayRequests: data.filter((d) => d.is_wedding_day).length,
        averageResponseTime: this.calculateWeddingDayAverage(
          data,
          'response_time',
        ),
        successRate: this.calculateWeddingDaySuccessRate(data),
        criticalFailures: data.filter((d) => d.is_wedding_day && !d.success)
          .length,
      },
    };
  }

  private classifyError(error: string): string {
    if (error.includes('rate limit')) return 'rate_limit';
    if (error.includes('quota')) return 'quota_exceeded';
    if (error.includes('auth')) return 'authentication';
    if (error.includes('network')) return 'network';
    if (error.includes('timeout')) return 'timeout';
    return 'unknown';
  }

  private calculateProviderDistribution(data: any[]): {
    [provider: string]: number;
  } {
    const distribution: { [provider: string]: number } = {};
    data.forEach((d) => {
      const provider = d.provider;
      distribution[provider] = (distribution[provider] || 0) + 1;
    });
    return distribution;
  }

  private getBucketSize(granularity: string): number {
    switch (granularity) {
      case 'hour':
        return 60 * 60 * 1000;
      case 'day':
        return 24 * 60 * 60 * 1000;
      case 'week':
        return 7 * 24 * 60 * 60 * 1000;
      case 'month':
        return 30 * 24 * 60 * 60 * 1000;
      default:
        return 24 * 60 * 60 * 1000;
    }
  }

  private calculateTrend(values: number[]): TrendAnalysis {
    if (values.length < 2) {
      return {
        direction: 'stable',
        changePercent: 0,
        significance: 'low',
        prediction: values[0] || 0,
      };
    }

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const changePercent =
      firstAvg === 0 ? 0 : ((secondAvg - firstAvg) / firstAvg) * 100;
    const direction =
      changePercent > 5
        ? 'increasing'
        : changePercent < -5
          ? 'decreasing'
          : 'stable';
    const significance =
      Math.abs(changePercent) > 20
        ? 'high'
        : Math.abs(changePercent) > 10
          ? 'medium'
          : 'low';

    // Simple linear prediction
    const prediction = secondAvg + (secondAvg - firstAvg);

    return {
      direction,
      changePercent,
      significance,
      prediction: Math.max(0, prediction),
    };
  }

  private calculateProjectedCost(
    providerType: 'platform' | 'client',
    tokens: number,
  ): number {
    // Simplified cost calculation - would use actual pricing models
    const platformRate = 0.002; // per 1K tokens
    const clientRate = 0.003; // per 1K tokens (higher due to individual pricing)

    const rate = providerType === 'platform' ? platformRate : clientRate;
    return (tokens / 1000) * rate;
  }

  private calculateHybridSavings(analytics: SupplierUsageAnalytics): number {
    // Calculate optimal hybrid approach savings
    return 0; // Placeholder
  }

  private async generateCostRecommendations(
    analytics: SupplierUsageAnalytics,
  ): Promise<CostRecommendation[]> {
    const recommendations: CostRecommendation[] = [];

    // Add recommendations based on usage patterns
    if (analytics.totalCost > 100) {
      recommendations.push({
        type: 'provider_switch',
        priority: 'high',
        description:
          'Consider switching to platform AI for cost savings on high-volume usage',
        potentialSavings: analytics.totalCost * 0.3,
        implementationComplexity: 'medium',
        timeframe: '1-2 weeks',
      });
    }

    return recommendations;
  }

  private calculateSeasonalCostIncrease(
    analytics: SupplierUsageAnalytics,
  ): number {
    return analytics.weddingSeasonMetrics.peakSeasonRequests * 0.5; // 50% increase estimate
  }

  private recommendSeasonalStrategy(analytics: SupplierUsageAnalytics): string {
    if (
      analytics.weddingSeasonMetrics.peakSeasonRequests >
      analytics.weddingSeasonMetrics.offSeasonRequests * 2
    ) {
      return 'Consider platform AI during peak season for cost management';
    }
    return 'Current strategy appears optimal for seasonal patterns';
  }

  private calculateSeasonalMultiplier(data: any[]): number {
    const peakSeasonData = data.filter((d) => {
      const month = new Date(d.timestamp).getMonth();
      return this.weddingSeasonMonths.includes(month);
    });

    const offSeasonData = data.filter((d) => {
      const month = new Date(d.timestamp).getMonth();
      return !this.weddingSeasonMonths.includes(month);
    });

    if (offSeasonData.length === 0) return 1.0;

    return peakSeasonData.length / offSeasonData.length;
  }

  private calculateWeddingDayAverage(data: any[], field: string): number {
    const weddingDayData = data.filter((d) => d.is_wedding_day);
    if (weddingDayData.length === 0) return 0;

    return (
      weddingDayData.reduce((sum, d) => sum + (d[field] || 0), 0) /
      weddingDayData.length
    );
  }

  private calculateWeddingDaySuccessRate(data: any[]): number {
    const weddingDayData = data.filter((d) => d.is_wedding_day);
    if (weddingDayData.length === 0) return 100;

    const successCount = weddingDayData.filter((d) => d.success).length;
    return (successCount / weddingDayData.length) * 100;
  }

  private initializeAnalyticsProcessing(): void {
    // Periodic cache updates
    setInterval(() => {
      this.processCacheUpdates();
    }, this.config.cacheUpdateInterval);

    // Daily analytics aggregation
    setInterval(
      () => {
        this.performDailyAggregation();
      },
      24 * 60 * 60 * 1000,
    );

    this.logger.info('Analytics processing initialized');
  }

  private async processCacheUpdates(): Promise<void> {
    // Update supplier caches from recent requests
    try {
      this.logger.debug('Processing cache updates');
      // Implementation would update cached analytics
    } catch (error) {
      this.logger.error('Cache update failed', { error: error.message });
    }
  }

  private async performDailyAggregation(): Promise<void> {
    // Daily aggregation for performance optimization
    try {
      this.logger.info('Performing daily analytics aggregation');
      // Implementation would create daily/weekly/monthly aggregates
    } catch (error) {
      this.logger.error('Daily aggregation failed', { error: error.message });
    }
  }
}

// Export types and service
export type {
  AIRequestTracking,
  SupplierUsageAnalytics,
  UsageTrends,
  CostOptimizationInsights,
  WeddingIndustryMetrics,
};
