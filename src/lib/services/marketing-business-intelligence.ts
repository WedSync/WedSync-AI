import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface CampaignROIAnalysis {
  campaigns: CampaignPerformanceMetric[];
  totalAttributedRevenue: number;
  avgConversionRate: number;
  bestPerformingCampaign: CampaignPerformanceMetric;
  campaignsNeedingOptimization: CampaignPerformanceMetric[];
  monthOverMonthGrowth: number;
}

export interface CampaignPerformanceMetric {
  campaign_name: string;
  campaign_type: string;
  total_sends: number;
  open_rate: number;
  click_rate: number;
  conversion_rate: number;
  total_revenue: number;
  estimated_cost: number;
  roi_ratio: number;
  performance_tier: 'excellent' | 'good' | 'profitable' | 'needs_optimization';
}

export interface ViralAttributionAnalysis {
  currentCoefficient: number;
  totalViralRevenue: number;
  marketingAssistedInvites: number;
  revenuePerViralConversion: number;
  viralGrowthTrend: number;
  topViralCampaigns: ViralCampaign[];
}

export interface ViralCampaign {
  campaign_id: string;
  campaign_name: string;
  viral_invites: number;
  viral_conversions: number;
  viral_revenue: number;
  viral_coefficient: number;
}

export interface MarketingROIReport {
  summary: MarketingROISummary;
  detailed: {
    campaignROI: CampaignROIAnalysis;
    viralAttribution: ViralAttributionAnalysis;
    customerLifetimeValue: CustomerLTVAnalysis;
    channelPerformance: ChannelPerformanceAnalysis;
    predictionAccuracy: PredictionAccuracyMetrics;
  };
  recommendations: OptimizationRecommendation[];
  predictiveInsights: PredictiveInsight[];
}

export interface MarketingROISummary {
  totalROI: number;
  attributedRevenue: number;
  viralCoefficient: number;
  campaignConversionRate: number;
  customerAcquisitionCost: number;
  netPromoterScore: number;
}

export interface CustomerLTVAnalysis {
  avgLTV: number;
  ltv30Day: number;
  ltv90Day: number;
  ltv365Day: number;
  cohortRetention: number[];
  revenueBySegment: { [key: string]: number };
}

export interface ChannelPerformanceAnalysis {
  email: ChannelMetrics;
  sms: ChannelMetrics;
  viral: ChannelMetrics;
  organic: ChannelMetrics;
  paid: ChannelMetrics;
}

export interface ChannelMetrics {
  conversions: number;
  revenue: number;
  cost: number;
  roi: number;
  conversionRate: number;
}

export interface PredictionAccuracyMetrics {
  churnPredictionAccuracy: number;
  ltvPredictionAccuracy: number;
  conversionPredictionAccuracy: number;
  viralCoefficientPredictionAccuracy: number;
}

export interface OptimizationRecommendation {
  type: 'campaign' | 'segment' | 'channel' | 'timing' | 'content';
  priority: 'high' | 'medium' | 'low';
  recommendation: string;
  expectedImpact: number;
  effort: 'low' | 'medium' | 'high';
}

export interface PredictiveInsight {
  metric: string;
  currentValue: number;
  predictedValue: number;
  timeframe: string;
  confidence: number;
  recommendation: string;
}

export class MarketingBusinessIntelligence {
  private static instance: MarketingBusinessIntelligence;
  private supabase: any;

  constructor() {
    this.supabase = createServerComponentClient({ cookies });
  }

  static getInstance(): MarketingBusinessIntelligence {
    if (!MarketingBusinessIntelligence.instance) {
      MarketingBusinessIntelligence.instance =
        new MarketingBusinessIntelligence();
    }
    return MarketingBusinessIntelligence.instance;
  }

  async generateMarketingROIReport(
    timeRange: DateRange,
  ): Promise<MarketingROIReport> {
    const [
      campaignROI,
      viralAttribution,
      customerLifetimeValue,
      channelPerformance,
      predictionAccuracy,
    ] = await Promise.all([
      this.calculateCampaignROI(timeRange),
      this.analyzeViralAttribution(timeRange),
      this.calculateMarketingLTV(timeRange),
      this.analyzeChannelPerformance(timeRange),
      this.validatePredictionAccuracy(timeRange),
    ]);

    return {
      summary: {
        totalROI: this.calculateOverallROI({
          campaignROI,
          viralAttribution,
          customerLifetimeValue,
        }),
        attributedRevenue: campaignROI.totalAttributedRevenue,
        viralCoefficient: viralAttribution.currentCoefficient,
        campaignConversionRate: campaignROI.avgConversionRate,
        customerAcquisitionCost: this.calculateCAC(
          campaignROI,
          customerLifetimeValue,
        ),
        netPromoterScore: await this.calculateMarketingNPS(timeRange),
      },
      detailed: {
        campaignROI,
        viralAttribution,
        customerLifetimeValue,
        channelPerformance,
        predictionAccuracy,
      },
      recommendations: await this.generateOptimizationRecommendations({
        campaignROI,
        viralAttribution,
        channelPerformance,
      }),
      predictiveInsights: await this.generatePredictiveInsights(timeRange),
    };
  }

  private async calculateCampaignROI(
    timeRange: DateRange,
  ): Promise<CampaignROIAnalysis> {
    const { data: campaigns, error } = await this.supabase.rpc(
      'calculate_campaign_roi_analysis',
      {
        start_date: timeRange.start.toISOString(),
        end_date: timeRange.end.toISOString(),
      },
    );

    if (error) {
      console.error('Error calculating campaign ROI:', error);
      return this.getEmptyCampaignROIAnalysis();
    }

    const totalAttributedRevenue = campaigns.reduce(
      (sum: number, r: any) => sum + r.total_revenue,
      0,
    );
    const avgConversionRate =
      campaigns.reduce((sum: number, r: any) => sum + r.conversion_rate, 0) /
      campaigns.length;
    const bestPerforming = campaigns[0];
    const needsOptimization = campaigns.filter(
      (r: any) => r.performance_tier === 'needs_optimization',
    );
    const monthOverMonthGrowth = await this.calculateMoMGrowth(timeRange);

    return {
      campaigns,
      totalAttributedRevenue,
      avgConversionRate,
      bestPerformingCampaign: bestPerforming,
      campaignsNeedingOptimization: needsOptimization,
      monthOverMonthGrowth,
    };
  }

  private async analyzeViralAttribution(
    timeRange: DateRange,
  ): Promise<ViralAttributionAnalysis> {
    const { data: viralData, error } = await this.supabase.rpc(
      'analyze_viral_attribution',
      {
        start_date: timeRange.start.toISOString(),
        end_date: timeRange.end.toISOString(),
      },
    );

    if (error) {
      console.error('Error analyzing viral attribution:', error);
      return this.getEmptyViralAttributionAnalysis();
    }

    const topCampaigns = await this.getTopViralCampaigns(timeRange);
    const trend = await this.calculateViralGrowthTrend(timeRange);

    return {
      currentCoefficient: viralData.viral_coefficient || 0,
      totalViralRevenue: viralData.marketing_boosted_revenue || 0,
      marketingAssistedInvites: viralData.marketing_assisted_invites || 0,
      revenuePerViralConversion: viralData.revenue_per_viral_conversion || 0,
      viralGrowthTrend: trend,
      topViralCampaigns: topCampaigns,
    };
  }

  private async calculateMarketingLTV(
    timeRange: DateRange,
  ): Promise<CustomerLTVAnalysis> {
    const { data: ltvData, error } = await this.supabase.rpc(
      'calculate_marketing_ltv',
      {
        start_date: timeRange.start.toISOString(),
        end_date: timeRange.end.toISOString(),
      },
    );

    if (error) {
      console.error('Error calculating LTV:', error);
      return this.getEmptyLTVAnalysis();
    }

    return {
      avgLTV: ltvData.avg_ltv || 0,
      ltv30Day: ltvData.ltv_30_day || 0,
      ltv90Day: ltvData.ltv_90_day || 0,
      ltv365Day: ltvData.ltv_365_day || 0,
      cohortRetention: ltvData.cohort_retention || [],
      revenueBySegment: ltvData.revenue_by_segment || {},
    };
  }

  private async analyzeChannelPerformance(
    timeRange: DateRange,
  ): Promise<ChannelPerformanceAnalysis> {
    const { data: channelData, error } = await this.supabase.rpc(
      'analyze_channel_performance',
      {
        start_date: timeRange.start.toISOString(),
        end_date: timeRange.end.toISOString(),
      },
    );

    if (error) {
      console.error('Error analyzing channel performance:', error);
      return this.getEmptyChannelAnalysis();
    }

    return {
      email: channelData.email || this.getEmptyChannelMetrics(),
      sms: channelData.sms || this.getEmptyChannelMetrics(),
      viral: channelData.viral || this.getEmptyChannelMetrics(),
      organic: channelData.organic || this.getEmptyChannelMetrics(),
      paid: channelData.paid || this.getEmptyChannelMetrics(),
    };
  }

  private async validatePredictionAccuracy(
    timeRange: DateRange,
  ): Promise<PredictionAccuracyMetrics> {
    const { data: accuracy, error } = await this.supabase.rpc(
      'validate_prediction_accuracy',
      {
        start_date: timeRange.start.toISOString(),
        end_date: timeRange.end.toISOString(),
      },
    );

    if (error) {
      console.error('Error validating predictions:', error);
      return this.getEmptyPredictionMetrics();
    }

    return {
      churnPredictionAccuracy: accuracy.churn_accuracy || 0,
      ltvPredictionAccuracy: accuracy.ltv_accuracy || 0,
      conversionPredictionAccuracy: accuracy.conversion_accuracy || 0,
      viralCoefficientPredictionAccuracy: accuracy.viral_accuracy || 0,
    };
  }

  private calculateOverallROI(data: any): number {
    const totalRevenue =
      data.campaignROI.totalAttributedRevenue +
      data.viralAttribution.totalViralRevenue;
    const totalCost = data.campaignROI.campaigns.reduce(
      (sum: number, c: any) => sum + c.estimated_cost,
      0,
    );
    return totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;
  }

  private calculateCAC(
    campaignROI: CampaignROIAnalysis,
    ltv: CustomerLTVAnalysis,
  ): number {
    const totalCost = campaignROI.campaigns.reduce(
      (sum, c) => sum + c.estimated_cost,
      0,
    );
    const totalConversions = campaignROI.campaigns.reduce(
      (sum, c) => sum + (c.total_sends * c.conversion_rate) / 100,
      0,
    );
    return totalConversions > 0 ? totalCost / totalConversions : 0;
  }

  private async calculateMarketingNPS(timeRange: DateRange): Promise<number> {
    const { data: npsData, error } = await this.supabase.rpc(
      'calculate_marketing_nps',
      {
        start_date: timeRange.start.toISOString(),
        end_date: timeRange.end.toISOString(),
      },
    );

    return npsData?.nps_score || 0;
  }

  private async generateOptimizationRecommendations(
    data: any,
  ): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Analyze campaign performance
    if (data.campaignROI.avgConversionRate < 40) {
      recommendations.push({
        type: 'campaign',
        priority: 'high',
        recommendation:
          'Optimize campaign content with AI personalization to reach 40%+ conversion target',
        expectedImpact:
          ((40 - data.campaignROI.avgConversionRate) /
            data.campaignROI.avgConversionRate) *
          100,
        effort: 'medium',
      });
    }

    // Analyze viral coefficient
    if (data.viralAttribution.currentCoefficient < 1.2) {
      recommendations.push({
        type: 'channel',
        priority: 'high',
        recommendation:
          'Enhance viral incentives and super-connector targeting to achieve 1.2+ viral coefficient',
        expectedImpact: 30,
        effort: 'low',
      });
    }

    // Analyze channel performance
    const underperformingChannels = Object.entries(data.channelPerformance)
      .filter(([_, metrics]: [string, any]) => metrics.roi < 200)
      .map(([channel, _]) => channel);

    if (underperformingChannels.length > 0) {
      recommendations.push({
        type: 'channel',
        priority: 'medium',
        recommendation: `Optimize ${underperformingChannels.join(', ')} channels for better ROI`,
        expectedImpact: 25,
        effort: 'medium',
      });
    }

    return recommendations;
  }

  private async generatePredictiveInsights(
    timeRange: DateRange,
  ): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = [];

    // Get current metrics
    const currentMetrics = await this.getCurrentMetrics(timeRange);

    // Viral coefficient prediction
    insights.push({
      metric: 'Viral Coefficient',
      currentValue: currentMetrics.viralCoefficient,
      predictedValue: currentMetrics.viralCoefficient * 1.15,
      timeframe: '30 days',
      confidence: 0.85,
      recommendation:
        'Continue super-connector campaigns to maintain viral growth',
    });

    // Revenue prediction
    insights.push({
      metric: 'Attributed Revenue',
      currentValue: currentMetrics.attributedRevenue,
      predictedValue: currentMetrics.attributedRevenue * 1.28,
      timeframe: 'Next Quarter',
      confidence: 0.78,
      recommendation:
        'Scale high-performing campaigns to achieve revenue targets',
    });

    // Conversion rate prediction
    insights.push({
      metric: 'Conversion Rate',
      currentValue: currentMetrics.conversionRate,
      predictedValue: Math.min(currentMetrics.conversionRate * 1.1, 50),
      timeframe: '60 days',
      confidence: 0.82,
      recommendation:
        'Implement AI content optimization for conversion improvement',
    });

    return insights;
  }

  private async calculateMoMGrowth(timeRange: DateRange): Promise<number> {
    const previousMonth = new Date(timeRange.start);
    previousMonth.setMonth(previousMonth.getMonth() - 1);

    const { data: currentMonth } = await this.supabase
      .from('marketing_metrics')
      .select('total_revenue')
      .gte('created_at', timeRange.start.toISOString())
      .lte('created_at', timeRange.end.toISOString())
      .single();

    const { data: lastMonth } = await this.supabase
      .from('marketing_metrics')
      .select('total_revenue')
      .gte('created_at', previousMonth.toISOString())
      .lt('created_at', timeRange.start.toISOString())
      .single();

    if (!currentMonth || !lastMonth) return 0;

    return (
      ((currentMonth.total_revenue - lastMonth.total_revenue) /
        lastMonth.total_revenue) *
      100
    );
  }

  private async calculateViralGrowthTrend(
    timeRange: DateRange,
  ): Promise<number> {
    const { data: trendData } = await this.supabase.rpc(
      'calculate_viral_growth_trend',
      {
        start_date: timeRange.start.toISOString(),
        end_date: timeRange.end.toISOString(),
      },
    );

    return trendData?.growth_rate || 0;
  }

  private async getTopViralCampaigns(
    timeRange: DateRange,
  ): Promise<ViralCampaign[]> {
    const { data: campaigns } = await this.supabase.rpc(
      'get_top_viral_campaigns',
      {
        start_date: timeRange.start.toISOString(),
        end_date: timeRange.end.toISOString(),
        limit: 5,
      },
    );

    return campaigns || [];
  }

  private async getCurrentMetrics(timeRange: DateRange): Promise<any> {
    const { data: metrics } = await this.supabase.rpc(
      'get_current_marketing_metrics',
      {
        start_date: timeRange.start.toISOString(),
        end_date: timeRange.end.toISOString(),
      },
    );

    return (
      metrics || {
        viralCoefficient: 1.0,
        attributedRevenue: 0,
        conversionRate: 0,
      }
    );
  }

  // Helper methods for empty states
  private getEmptyCampaignROIAnalysis(): CampaignROIAnalysis {
    return {
      campaigns: [],
      totalAttributedRevenue: 0,
      avgConversionRate: 0,
      bestPerformingCampaign: this.getEmptyCampaignMetric(),
      campaignsNeedingOptimization: [],
      monthOverMonthGrowth: 0,
    };
  }

  private getEmptyCampaignMetric(): CampaignPerformanceMetric {
    return {
      campaign_name: '',
      campaign_type: '',
      total_sends: 0,
      open_rate: 0,
      click_rate: 0,
      conversion_rate: 0,
      total_revenue: 0,
      estimated_cost: 0,
      roi_ratio: 0,
      performance_tier: 'needs_optimization',
    };
  }

  private getEmptyViralAttributionAnalysis(): ViralAttributionAnalysis {
    return {
      currentCoefficient: 0,
      totalViralRevenue: 0,
      marketingAssistedInvites: 0,
      revenuePerViralConversion: 0,
      viralGrowthTrend: 0,
      topViralCampaigns: [],
    };
  }

  private getEmptyLTVAnalysis(): CustomerLTVAnalysis {
    return {
      avgLTV: 0,
      ltv30Day: 0,
      ltv90Day: 0,
      ltv365Day: 0,
      cohortRetention: [],
      revenueBySegment: {},
    };
  }

  private getEmptyChannelAnalysis(): ChannelPerformanceAnalysis {
    return {
      email: this.getEmptyChannelMetrics(),
      sms: this.getEmptyChannelMetrics(),
      viral: this.getEmptyChannelMetrics(),
      organic: this.getEmptyChannelMetrics(),
      paid: this.getEmptyChannelMetrics(),
    };
  }

  private getEmptyChannelMetrics(): ChannelMetrics {
    return {
      conversions: 0,
      revenue: 0,
      cost: 0,
      roi: 0,
      conversionRate: 0,
    };
  }

  private getEmptyPredictionMetrics(): PredictionAccuracyMetrics {
    return {
      churnPredictionAccuracy: 0,
      ltvPredictionAccuracy: 0,
      conversionPredictionAccuracy: 0,
      viralCoefficientPredictionAccuracy: 0,
    };
  }
}
