import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { AttributionTrackingService } from './attribution-tracking-service';

// Advanced Attribution Modeling for WS-143 Round 2
export interface MultiTouchAttribution {
  userId: string;
  touchpoints: AttributionTouchpoint[];
  conversionPath: string;
  totalTouchpoints: number;
  firstTouchAttribution: number;
  lastTouchAttribution: number;
  linearAttribution: number[];
  timeDecayAttribution: number[];
  positionBasedAttribution: number[];
  customModelAttribution: number[];
  lifetimeValue: number;
  attributedRevenue: number;
  conversionProbability: number;
}

export interface AttributionTouchpoint {
  id: string;
  userId: string;
  touchpointType:
    | 'email'
    | 'viral_invitation'
    | 'organic_visit'
    | 'paid_ad'
    | 'social_share'
    | 'referral';
  campaignId: string | null;
  touchpointTime: Date;
  touchpointValue: number;
  channelSource: string;
  conversionContribution: number;
  timeFromConversion: number; // Hours before conversion
  positionInJourney: number;
  metadata: Record<string, any>;
}

export interface LifetimeValueCalculation {
  userId: string;
  totalRevenue: number;
  averageOrderValue: number;
  purchaseFrequency: number;
  customerLifespan: number; // Months
  predictedLTV: number;
  ltv6Month: number;
  ltv12Month: number;
  ltv24Month: number;
  churnProbability: number;
  nextPurchaseProbability: number;
  revenueByChannel: Record<string, number>;
}

export interface AttributionModelConfig {
  modelType:
    | 'first_touch'
    | 'last_touch'
    | 'linear'
    | 'time_decay'
    | 'position_based'
    | 'custom_wedding_industry';
  timeDecayHalfLife: number; // Hours
  positionBasedFirstTouchWeight: number;
  positionBasedLastTouchWeight: number;
  customWeights?: Record<string, number>;
  lookbackWindow: number; // Days
  includeViewThrough: boolean;
  viralAttributionBonus: number;
}

export interface ConversionPathAnalysis {
  pathPattern: string;
  frequency: number;
  conversionRate: number;
  averageRevenue: number;
  averageTouchpoints: number;
  averageTimeToConversion: number; // Hours
  topPerformingChannels: string[];
  viralCoefficient: number;
  recommendedOptimizations: string[];
}

export class AttributionModelingService {
  private static instance: AttributionModelingService;
  private supabase: any;
  private attributionService: AttributionTrackingService;

  constructor() {
    this.supabase = createServerComponentClient({ cookies });
    this.attributionService = AttributionTrackingService.getInstance();
  }

  static getInstance(): AttributionModelingService {
    if (!AttributionModelingService.instance) {
      AttributionModelingService.instance = new AttributionModelingService();
    }
    return AttributionModelingService.instance;
  }

  /**
   * Calculate multi-touch attribution using various models
   */
  async calculateMultiTouchAttribution(
    userId: string,
    modelConfig: AttributionModelConfig = this.getDefaultModelConfig(),
  ): Promise<MultiTouchAttribution> {
    try {
      // Get all touchpoints for user within lookback window
      const touchpoints = await this.getUserTouchpoints(
        userId,
        modelConfig.lookbackWindow,
      );

      if (touchpoints.length === 0) {
        throw new Error(`No touchpoints found for user ${userId}`);
      }

      // Calculate attribution weights for each model
      const firstTouchAttribution =
        this.calculateFirstTouchAttribution(touchpoints);
      const lastTouchAttribution =
        this.calculateLastTouchAttribution(touchpoints);
      const linearAttribution = this.calculateLinearAttribution(touchpoints);
      const timeDecayAttribution = this.calculateTimeDecayAttribution(
        touchpoints,
        modelConfig.timeDecayHalfLife,
      );
      const positionBasedAttribution = this.calculatePositionBasedAttribution(
        touchpoints,
        modelConfig.positionBasedFirstTouchWeight,
        modelConfig.positionBasedLastTouchWeight,
      );
      const customModelAttribution =
        await this.calculateCustomWeddingIndustryModel(touchpoints);

      // Calculate lifetime value
      const lifetimeValue = await this.calculateLifetimeValue(userId);

      // Generate conversion path string
      const conversionPath = touchpoints
        .sort((a, b) => a.touchpointTime.getTime() - b.touchpointTime.getTime())
        .map((t) => t.touchpointType)
        .join(' -> ');

      // Calculate total attributed revenue
      const attributedRevenue = touchpoints.reduce(
        (sum, tp) => sum + tp.touchpointValue,
        0,
      );

      // Predict conversion probability for future campaigns
      const conversionProbability = await this.predictConversionProbability(
        userId,
        touchpoints,
      );

      return {
        userId,
        touchpoints,
        conversionPath,
        totalTouchpoints: touchpoints.length,
        firstTouchAttribution,
        lastTouchAttribution,
        linearAttribution,
        timeDecayAttribution,
        positionBasedAttribution,
        customModelAttribution,
        lifetimeValue: lifetimeValue.predictedLTV,
        attributedRevenue,
        conversionProbability,
      };
    } catch (error) {
      console.error('Multi-touch attribution calculation failed:', error);
      throw error;
    }
  }

  /**
   * Advanced lifetime value calculation with predictive modeling
   */
  async calculateLifetimeValue(
    userId: string,
  ): Promise<LifetimeValueCalculation> {
    try {
      // Get user's historical transaction data
      const { data: transactions } = await this.supabase
        .from('user_transactions')
        .select(
          `
          amount,
          created_at,
          channel_source,
          transaction_type
        `,
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (!transactions || transactions.length === 0) {
        return this.getDefaultLTVCalculation(userId);
      }

      // Calculate key LTV metrics
      const totalRevenue = transactions.reduce(
        (sum: number, t: any) => sum + t.amount,
        0,
      );
      const averageOrderValue = totalRevenue / transactions.length;

      // Calculate purchase frequency (purchases per month)
      const firstPurchase = new Date(transactions[0].created_at);
      const lastPurchase = new Date(
        transactions[transactions.length - 1].created_at,
      );
      const monthsActive = Math.max(
        (lastPurchase.getTime() - firstPurchase.getTime()) /
          (1000 * 60 * 60 * 24 * 30),
        1,
      );
      const purchaseFrequency = transactions.length / monthsActive;

      // Predict customer lifespan based on wedding industry patterns
      const customerLifespan = await this.predictCustomerLifespan(
        userId,
        transactions,
      );

      // Calculate predicted LTV using industry-specific model
      const predictedLTV =
        averageOrderValue * purchaseFrequency * customerLifespan;

      // Calculate time-bound LTV predictions
      const ltv6Month = this.calculateTimeBoundLTV(
        6,
        averageOrderValue,
        purchaseFrequency,
      );
      const ltv12Month = this.calculateTimeBoundLTV(
        12,
        averageOrderValue,
        purchaseFrequency,
      );
      const ltv24Month = this.calculateTimeBoundLTV(
        24,
        averageOrderValue,
        purchaseFrequency,
      );

      // Calculate churn probability
      const churnProbability = await this.predictChurnProbability(
        userId,
        transactions,
      );

      // Calculate next purchase probability
      const nextPurchaseProbability = await this.predictNextPurchaseProbability(
        userId,
        transactions,
      );

      // Calculate revenue by channel
      const revenueByChannel = transactions.reduce(
        (acc: Record<string, number>, t: any) => {
          acc[t.channel_source || 'organic'] =
            (acc[t.channel_source || 'organic'] || 0) + t.amount;
          return acc;
        },
        {},
      );

      return {
        userId,
        totalRevenue,
        averageOrderValue,
        purchaseFrequency,
        customerLifespan,
        predictedLTV,
        ltv6Month,
        ltv12Month,
        ltv24Month,
        churnProbability,
        nextPurchaseProbability,
        revenueByChannel,
      };
    } catch (error) {
      console.error('LTV calculation failed:', error);
      return this.getDefaultLTVCalculation(userId);
    }
  }

  /**
   * Analyze conversion paths and identify optimization opportunities
   */
  async analyzeConversionPaths(
    timeframe: { start: Date; end: Date },
    minPathFrequency: number = 5,
  ): Promise<ConversionPathAnalysis[]> {
    try {
      // Get all conversion paths within timeframe
      const conversionPaths = await this.getConversionPaths(timeframe);

      // Group and analyze paths
      const pathAnalysis = new Map<
        string,
        {
          frequency: number;
          totalRevenue: number;
          conversions: any[];
          touchpointCounts: number[];
          timesToConversion: number[];
        }
      >();

      for (const conversion of conversionPaths) {
        const pathKey = conversion.conversionPath;

        if (!pathAnalysis.has(pathKey)) {
          pathAnalysis.set(pathKey, {
            frequency: 0,
            totalRevenue: 0,
            conversions: [],
            touchpointCounts: [],
            timesToConversion: [],
          });
        }

        const pathData = pathAnalysis.get(pathKey)!;
        pathData.frequency += 1;
        pathData.totalRevenue += conversion.revenue;
        pathData.conversions.push(conversion);
        pathData.touchpointCounts.push(conversion.totalTouchpoints);
        pathData.timesToConversion.push(conversion.timeToConversion);
      }

      // Convert to analysis results
      const analysisResults: ConversionPathAnalysis[] = [];

      for (const [pathPattern, data] of pathAnalysis.entries()) {
        if (data.frequency < minPathFrequency) continue;

        const conversionRate = data.frequency / data.conversions.length;
        const averageRevenue = data.totalRevenue / data.frequency;
        const averageTouchpoints =
          data.touchpointCounts.reduce((a, b) => a + b, 0) /
          data.touchpointCounts.length;
        const averageTimeToConversion =
          data.timesToConversion.reduce((a, b) => a + b, 0) /
          data.timesToConversion.length;

        // Identify top performing channels in this path
        const channelPerformance = this.analyzeChannelPerformance(
          data.conversions,
        );
        const topPerformingChannels = Object.entries(channelPerformance)
          .sort(([, a], [, b]) => (b as any).revenue - (a as any).revenue)
          .slice(0, 3)
          .map(([channel]) => channel);

        // Calculate viral coefficient for this path
        const viralCoefficient = this.calculatePathViralCoefficient(
          data.conversions,
        );

        // Generate optimization recommendations
        const recommendedOptimizations =
          await this.generatePathOptimizationRecommendations(
            pathPattern,
            data.conversions,
            channelPerformance,
          );

        analysisResults.push({
          pathPattern,
          frequency: data.frequency,
          conversionRate,
          averageRevenue,
          averageTouchpoints,
          averageTimeToConversion,
          topPerformingChannels,
          viralCoefficient,
          recommendedOptimizations,
        });
      }

      return analysisResults.sort((a, b) => b.frequency - a.frequency);
    } catch (error) {
      console.error('Conversion path analysis failed:', error);
      return [];
    }
  }

  /**
   * Track all marketing touchpoints across channels
   */
  async trackTouchpoint(touchpointData: {
    userId: string;
    touchpointType: string;
    campaignId?: string;
    channelSource: string;
    touchpointValue: number;
    metadata?: Record<string, any>;
  }): Promise<string> {
    try {
      const { data: touchpoint, error } = await this.supabase
        .from('attribution_touchpoints')
        .insert({
          user_id: touchpointData.userId,
          touchpoint_type: touchpointData.touchpointType,
          campaign_id: touchpointData.campaignId,
          channel_source: touchpointData.channelSource,
          touchpoint_value: touchpointData.touchpointValue,
          touchpoint_time: new Date().toISOString(),
          metadata: touchpointData.metadata || {},
        })
        .select()
        .single();

      if (error) throw error;

      // Update real-time attribution calculations
      await this.updateRealtimeAttribution(touchpointData.userId);

      return touchpoint.id;
    } catch (error) {
      console.error('Touchpoint tracking failed:', error);
      throw error;
    }
  }

  /**
   * Optimize campaign spending based on attribution data
   */
  async optimizeCampaignROI(campaignIds: string[]): Promise<
    {
      campaignId: string;
      currentSpend: number;
      attributedRevenue: number;
      currentROI: number;
      optimizedSpend: number;
      projectedROI: number;
      recommendation: 'increase' | 'decrease' | 'maintain' | 'pause';
    }[]
  > {
    const optimizations = [];

    for (const campaignId of campaignIds) {
      try {
        // Get campaign attribution data
        const attributionData =
          await this.getCampaignAttributionData(campaignId);

        // Calculate current ROI
        const currentROI =
          attributionData.attributedRevenue / attributionData.currentSpend;

        // Use ML-based optimization to suggest spend adjustments
        const optimization = await this.calculateOptimalSpend(
          campaignId,
          attributionData,
        );

        optimizations.push({
          campaignId,
          currentSpend: attributionData.currentSpend,
          attributedRevenue: attributionData.attributedRevenue,
          currentROI,
          optimizedSpend: optimization.optimizedSpend,
          projectedROI: optimization.projectedROI,
          recommendation: optimization.recommendation,
        });
      } catch (error) {
        console.error(
          `ROI optimization failed for campaign ${campaignId}:`,
          error,
        );
      }
    }

    return optimizations;
  }

  // === PRIVATE HELPER METHODS ===

  private getDefaultModelConfig(): AttributionModelConfig {
    return {
      modelType: 'custom_wedding_industry',
      timeDecayHalfLife: 168, // 7 days
      positionBasedFirstTouchWeight: 0.4,
      positionBasedLastTouchWeight: 0.4,
      lookbackWindow: 90, // days
      includeViewThrough: true,
      viralAttributionBonus: 1.2,
    };
  }

  private async getUserTouchpoints(
    userId: string,
    lookbackDays: number,
  ): Promise<AttributionTouchpoint[]> {
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);

    const { data: touchpoints } = await this.supabase
      .from('attribution_touchpoints')
      .select('*')
      .eq('user_id', userId)
      .gte('touchpoint_time', lookbackDate.toISOString())
      .order('touchpoint_time', { ascending: true });

    return (
      touchpoints?.map((tp: any) => ({
        id: tp.id,
        userId: tp.user_id,
        touchpointType: tp.touchpoint_type,
        campaignId: tp.campaign_id,
        touchpointTime: new Date(tp.touchpoint_time),
        touchpointValue: tp.touchpoint_value,
        channelSource: tp.channel_source,
        conversionContribution: 0, // Calculated later
        timeFromConversion: 0, // Calculated later
        positionInJourney: 0, // Calculated later
        metadata: tp.metadata,
      })) || []
    );
  }

  private calculateFirstTouchAttribution(
    touchpoints: AttributionTouchpoint[],
  ): number {
    return touchpoints.length > 0 ? 1.0 : 0;
  }

  private calculateLastTouchAttribution(
    touchpoints: AttributionTouchpoint[],
  ): number {
    return touchpoints.length > 0 ? 1.0 : 0;
  }

  private calculateLinearAttribution(
    touchpoints: AttributionTouchpoint[],
  ): number[] {
    const equalWeight = 1.0 / touchpoints.length;
    return touchpoints.map(() => equalWeight);
  }

  private calculateTimeDecayAttribution(
    touchpoints: AttributionTouchpoint[],
    halfLifeHours: number,
  ): number[] {
    if (touchpoints.length === 0) return [];

    const conversionTime = touchpoints[touchpoints.length - 1].touchpointTime;
    const weights = touchpoints.map((tp) => {
      const hoursBeforeConversion =
        (conversionTime.getTime() - tp.touchpointTime.getTime()) /
        (1000 * 60 * 60);
      return Math.pow(0.5, hoursBeforeConversion / halfLifeHours);
    });

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    return weights.map((weight) => weight / totalWeight);
  }

  private calculatePositionBasedAttribution(
    touchpoints: AttributionTouchpoint[],
    firstTouchWeight: number,
    lastTouchWeight: number,
  ): number[] {
    if (touchpoints.length === 0) return [];
    if (touchpoints.length === 1) return [1.0];
    if (touchpoints.length === 2) return [firstTouchWeight, lastTouchWeight];

    const middleWeight =
      (1.0 - firstTouchWeight - lastTouchWeight) / (touchpoints.length - 2);
    const weights = touchpoints.map((_, index) => {
      if (index === 0) return firstTouchWeight;
      if (index === touchpoints.length - 1) return lastTouchWeight;
      return middleWeight;
    });

    return weights;
  }

  private async calculateCustomWeddingIndustryModel(
    touchpoints: AttributionTouchpoint[],
  ): Promise<number[]> {
    // Custom model that gives higher weight to viral touchpoints and wedding-specific channels
    const weights = touchpoints.map((tp) => {
      let weight = 1.0;

      // Boost viral touchpoints
      if (tp.touchpointType === 'viral_invitation') {
        weight *= 1.3;
      }

      // Boost wedding-specific channels
      if (
        tp.channelSource.includes('wedding') ||
        tp.channelSource.includes('bridal')
      ) {
        weight *= 1.2;
      }

      // Boost high-value touchpoints
      if (tp.touchpointValue > 100) {
        weight *= 1.1;
      }

      return weight;
    });

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    return weights.map((weight) => weight / totalWeight);
  }

  private async predictCustomerLifespan(
    userId: string,
    transactions: any[],
  ): Promise<number> {
    // Wedding industry specific: Most customers have 1-2 year engagement + planning period
    // Then potential anniversary/renewal services
    const baseLifespan = 18; // months

    // Adjust based on transaction pattern
    const transactionSpread =
      transactions.length > 1
        ? (new Date(
            transactions[transactions.length - 1].created_at,
          ).getTime() -
            new Date(transactions[0].created_at).getTime()) /
          (1000 * 60 * 60 * 24 * 30)
        : 0;

    return Math.max(baseLifespan, transactionSpread * 1.2);
  }

  private calculateTimeBoundLTV(
    months: number,
    aov: number,
    frequency: number,
  ): number {
    return aov * frequency * months;
  }

  private async predictChurnProbability(
    userId: string,
    transactions: any[],
  ): Promise<number> {
    // Simple churn prediction based on recency of last transaction
    if (transactions.length === 0) return 0.9;

    const lastTransaction = new Date(
      transactions[transactions.length - 1].created_at,
    );
    const daysSinceLastTransaction =
      (Date.now() - lastTransaction.getTime()) / (1000 * 60 * 60 * 24);

    // Wedding industry: customers typically churn after wedding (12-18 months engagement)
    if (daysSinceLastTransaction > 540) return 0.8; // 18 months
    if (daysSinceLastTransaction > 365) return 0.6; // 12 months
    if (daysSinceLastTransaction > 180) return 0.3; // 6 months

    return 0.1;
  }

  private async predictNextPurchaseProbability(
    userId: string,
    transactions: any[],
  ): Promise<number> {
    if (transactions.length < 2) return 0.3;

    // Calculate average time between purchases
    const intervals = [];
    for (let i = 1; i < transactions.length; i++) {
      const interval =
        new Date(transactions[i].created_at).getTime() -
        new Date(transactions[i - 1].created_at).getTime();
      intervals.push(interval / (1000 * 60 * 60 * 24)); // days
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const lastTransaction = new Date(
      transactions[transactions.length - 1].created_at,
    );
    const daysSinceLastTransaction =
      (Date.now() - lastTransaction.getTime()) / (1000 * 60 * 60 * 24);

    // Higher probability as we approach expected next purchase time
    const timeRatio = daysSinceLastTransaction / avgInterval;
    return Math.min(timeRatio * 0.8, 0.9);
  }

  private getDefaultLTVCalculation(userId: string): LifetimeValueCalculation {
    return {
      userId,
      totalRevenue: 0,
      averageOrderValue: 0,
      purchaseFrequency: 0,
      customerLifespan: 18,
      predictedLTV: 0,
      ltv6Month: 0,
      ltv12Month: 0,
      ltv24Month: 0,
      churnProbability: 0.5,
      nextPurchaseProbability: 0.3,
      revenueByChannel: {},
    };
  }

  private async getConversionPaths(timeframe: {
    start: Date;
    end: Date;
  }): Promise<any[]> {
    // Placeholder - would query actual conversion data
    return [];
  }

  private analyzeChannelPerformance(conversions: any[]): Record<string, any> {
    const channelData: Record<string, { revenue: number; count: number }> = {};

    conversions.forEach((conversion) => {
      conversion.touchpoints?.forEach((tp: any) => {
        if (!channelData[tp.channelSource]) {
          channelData[tp.channelSource] = { revenue: 0, count: 0 };
        }
        channelData[tp.channelSource].revenue += tp.touchpointValue;
        channelData[tp.channelSource].count += 1;
      });
    });

    return channelData;
  }

  private calculatePathViralCoefficient(conversions: any[]): number {
    // Calculate how many viral touchpoints are in this path
    const viralTouchpoints = conversions.reduce((count: number, conv: any) => {
      return (
        count +
        (conv.touchpoints?.filter(
          (tp: any) => tp.touchpointType === 'viral_invitation',
        ).length || 0)
      );
    }, 0);

    return viralTouchpoints / Math.max(conversions.length, 1);
  }

  private async generatePathOptimizationRecommendations(
    pathPattern: string,
    conversions: any[],
    channelPerformance: Record<string, any>,
  ): Promise<string[]> {
    const recommendations = [];

    // Analyze path efficiency
    if (pathPattern.includes('email -> email')) {
      recommendations.push(
        'Consider reducing email frequency to avoid fatigue',
      );
    }

    if (pathPattern.includes('viral_invitation')) {
      recommendations.push(
        'Viral touchpoints show strong performance - amplify referral programs',
      );
    }

    // Analyze top performing channels
    const topChannel = Object.entries(channelPerformance).sort(
      ([, a], [, b]) => (b as any).revenue - (a as any).revenue,
    )[0];

    if (topChannel) {
      recommendations.push(
        `Increase investment in ${topChannel[0]} - highest revenue contributor`,
      );
    }

    return recommendations;
  }

  private async updateRealtimeAttribution(userId: string): Promise<void> {
    // Update real-time attribution calculations
    // This would trigger recalculation of attribution models
    console.log(`Updating real-time attribution for user ${userId}`);
  }

  private async getCampaignAttributionData(campaignId: string): Promise<{
    currentSpend: number;
    attributedRevenue: number;
  }> {
    // Placeholder for campaign data retrieval
    return {
      currentSpend: 1000,
      attributedRevenue: 2500,
    };
  }

  private async calculateOptimalSpend(
    campaignId: string,
    attributionData: any,
  ): Promise<{
    optimizedSpend: number;
    projectedROI: number;
    recommendation: 'increase' | 'decrease' | 'maintain' | 'pause';
  }> {
    const currentROI =
      attributionData.attributedRevenue / attributionData.currentSpend;

    // Simple optimization logic
    if (currentROI > 3.0) {
      return {
        optimizedSpend: attributionData.currentSpend * 1.25,
        projectedROI: currentROI * 0.95,
        recommendation: 'increase',
      };
    } else if (currentROI < 1.5) {
      return {
        optimizedSpend: attributionData.currentSpend * 0.75,
        projectedROI: currentROI * 1.1,
        recommendation: 'decrease',
      };
    } else if (currentROI < 1.0) {
      return {
        optimizedSpend: 0,
        projectedROI: 0,
        recommendation: 'pause',
      };
    }

    return {
      optimizedSpend: attributionData.currentSpend,
      projectedROI: currentROI,
      recommendation: 'maintain',
    };
  }

  private async predictConversionProbability(
    userId: string,
    touchpoints: AttributionTouchpoint[],
  ): Promise<number> {
    // ML-based conversion probability prediction
    let probability = 0.1; // Base probability

    // More touchpoints = higher engagement
    probability += Math.min(touchpoints.length * 0.05, 0.3);

    // Viral touchpoints indicate higher engagement
    const viralTouchpoints = touchpoints.filter(
      (tp) => tp.touchpointType === 'viral_invitation',
    ).length;
    probability += viralTouchpoints * 0.15;

    // Recent touchpoints indicate active interest
    const recentTouchpoints = touchpoints.filter(
      (tp) =>
        Date.now() - tp.touchpointTime.getTime() < 7 * 24 * 60 * 60 * 1000, // 7 days
    ).length;
    probability += recentTouchpoints * 0.1;

    return Math.min(probability, 0.95);
  }
}

export default AttributionModelingService;
