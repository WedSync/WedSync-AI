import { supabase } from '@/lib/supabase/server';
import type { ViralMetrics } from './viral-metrics';

export interface AttributionModel {
  source: string;
  conversions: number;
  cost: number;
  conversionRate: number;
  costPerAcquisition: number;
  viralCoefficient: number;
  attributionScore: number;
}

export interface GrowthMetrics {
  daily: Array<{
    date: string;
    newUsers: number;
    viralCoefficient: number;
    organicGrowth: number;
    paidGrowth: number;
    viralGrowth: number;
  }>;
  weekly: Array<{
    week: string;
    newUsers: number;
    viralCoefficient: number;
    growthRate: number;
    cumulativeUsers: number;
  }>;
  monthly: Array<{
    month: string;
    newUsers: number;
    viralCoefficient: number;
    monthOverMonthGrowth: number;
    retentionRate: number;
  }>;
}

export interface ViralGrowthProjection {
  timeFrame: 'monthly' | 'quarterly' | 'yearly';
  projectedUsers: Array<{
    period: string;
    users: number;
    confidence: number;
  }>;
  assumptions: {
    baseViralCoefficient: number;
    retentionRate: number;
    seasonalityFactor: number;
  };
}

export class GrowthModelingEngine {
  private static instance: GrowthModelingEngine;

  public static getInstance(): GrowthModelingEngine {
    if (!GrowthModelingEngine.instance) {
      GrowthModelingEngine.instance = new GrowthModelingEngine();
    }
    return GrowthModelingEngine.instance;
  }

  public async calculateAttributionModel(
    userId: string,
    dateRange: { start: Date; end: Date },
    sources?: string[],
  ): Promise<AttributionModel[]> {
    // Verify user permissions
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('id', userId)
      .single();

    if (
      !userProfile ||
      !['admin', 'analytics', 'marketing'].includes(userProfile.role)
    ) {
      throw new Error('Unauthorized access to attribution modeling');
    }

    // Get attribution data from viral_attributions table
    const { data: attributionData, error } = await supabase.rpc(
      'get_attribution_model_data',
      {
        start_date: dateRange.start.toISOString(),
        end_date: dateRange.end.toISOString(),
        source_filters: sources || [],
        requesting_user_id: userId,
      },
    );

    if (error) {
      console.error('Error fetching attribution data:', error);
      throw new Error('Failed to fetch attribution model data');
    }

    return this.processAttributionData(attributionData);
  }

  public async aggregateGrowthMetrics(
    userId: string,
    dateRange: { start: Date; end: Date },
  ): Promise<GrowthMetrics> {
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('id', userId)
      .single();

    if (!userProfile || !['admin', 'analytics'].includes(userProfile.role)) {
      throw new Error('Unauthorized access to growth metrics');
    }

    // Get aggregated growth data
    const { data: growthData, error } = await supabase.rpc(
      'get_aggregated_growth_metrics',
      {
        start_date: dateRange.start.toISOString(),
        end_date: dateRange.end.toISOString(),
      },
    );

    if (error) {
      console.error('Error fetching growth metrics:', error);
      throw new Error('Failed to fetch growth metrics');
    }

    return this.processGrowthMetrics(growthData, dateRange);
  }

  public async generateViralGrowthProjection(
    userId: string,
    currentMetrics: ViralMetrics,
    timeFrame: 'monthly' | 'quarterly' | 'yearly',
    periods: number = 12,
  ): Promise<ViralGrowthProjection> {
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('id', userId)
      .single();

    if (
      !userProfile ||
      !['admin', 'analytics', 'executive'].includes(userProfile.role)
    ) {
      throw new Error('Unauthorized access to growth projections');
    }

    // Get historical data for trend analysis
    const historicalRange = {
      start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
      end: new Date(),
    };

    const { data: historicalData, error } = await supabase.rpc(
      'get_historical_viral_data',
      {
        start_date: historicalRange.start.toISOString(),
        end_date: historicalRange.end.toISOString(),
      },
    );

    if (error) {
      console.warn('Error fetching historical data for projections:', error);
    }

    return this.calculateViralProjections(
      currentMetrics,
      historicalData || [],
      timeFrame,
      periods,
    );
  }

  public async analyzeChannelEffectiveness(
    userId: string,
    dateRange: { start: Date; end: Date },
  ): Promise<
    Array<{
      channel: string;
      totalReach: number;
      conversions: number;
      conversionRate: number;
      viralAmplification: number;
      cost: number;
      roi: number;
    }>
  > {
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('id', userId)
      .single();

    if (
      !userProfile ||
      !['admin', 'analytics', 'marketing'].includes(userProfile.role)
    ) {
      throw new Error('Unauthorized access to channel analysis');
    }

    const { data: channelData, error } = await supabase.rpc(
      'get_channel_effectiveness_data',
      {
        start_date: dateRange.start.toISOString(),
        end_date: dateRange.end.toISOString(),
      },
    );

    if (error) {
      console.error('Error fetching channel effectiveness data:', error);
      throw new Error('Failed to fetch channel effectiveness data');
    }

    return this.processChannelEffectiveness(channelData);
  }

  private processAttributionData(data: any[]): AttributionModel[] {
    if (!data || data.length === 0) return [];

    const attributionMap = new Map<
      string,
      {
        conversions: number;
        cost: number;
        totalReach: number;
        viralConversions: number;
      }
    >();

    // Aggregate data by source
    data.forEach((item) => {
      const source = item.attribution_source || 'unknown';
      const existing = attributionMap.get(source) || {
        conversions: 0,
        cost: 0,
        totalReach: 0,
        viralConversions: 0,
      };

      existing.conversions += item.conversions || 0;
      existing.cost += item.cost || 0;
      existing.totalReach += item.total_reach || 0;
      existing.viralConversions += item.viral_conversions || 0;

      attributionMap.set(source, existing);
    });

    // Calculate attribution models
    const totalConversions = Array.from(attributionMap.values()).reduce(
      (sum, item) => sum + item.conversions,
      0,
    );

    return Array.from(attributionMap.entries())
      .map(([source, metrics]) => {
        const conversionRate =
          metrics.totalReach > 0 ? metrics.conversions / metrics.totalReach : 0;
        const costPerAcquisition =
          metrics.conversions > 0 ? metrics.cost / metrics.conversions : 0;
        const viralCoefficient =
          metrics.conversions > 0
            ? metrics.viralConversions / metrics.conversions
            : 0;
        const attributionScore =
          totalConversions > 0 ? metrics.conversions / totalConversions : 0;

        return {
          source,
          conversions: metrics.conversions,
          cost: metrics.cost,
          conversionRate: Math.round(conversionRate * 1000) / 1000,
          costPerAcquisition: Math.round(costPerAcquisition * 100) / 100,
          viralCoefficient: Math.round(viralCoefficient * 1000) / 1000,
          attributionScore: Math.round(attributionScore * 1000) / 1000,
        };
      })
      .sort((a, b) => b.attributionScore - a.attributionScore);
  }

  private processGrowthMetrics(
    data: any[],
    dateRange: { start: Date; end: Date },
  ): GrowthMetrics {
    if (!data || data.length === 0) {
      return { daily: [], weekly: [], monthly: [] };
    }

    // Group by time periods
    const dailyMetrics = this.aggregateByPeriod(data, 'daily');
    const weeklyMetrics = this.aggregateByPeriod(data, 'weekly');
    const monthlyMetrics = this.aggregateByPeriod(data, 'monthly');

    return {
      daily: dailyMetrics.map((item) => ({
        date: item.period,
        newUsers: item.new_users || 0,
        viralCoefficient: item.viral_coefficient || 0,
        organicGrowth: item.organic_growth || 0,
        paidGrowth: item.paid_growth || 0,
        viralGrowth: item.viral_growth || 0,
      })),
      weekly: weeklyMetrics.map((item, index, array) => {
        const previousWeek = array[index - 1];
        const growthRate =
          previousWeek && previousWeek.new_users > 0
            ? ((item.new_users - previousWeek.new_users) /
                previousWeek.new_users) *
              100
            : 0;

        return {
          week: item.period,
          newUsers: item.new_users || 0,
          viralCoefficient: item.viral_coefficient || 0,
          growthRate: Math.round(growthRate * 100) / 100,
          cumulativeUsers: item.cumulative_users || 0,
        };
      }),
      monthly: monthlyMetrics.map((item, index, array) => {
        const previousMonth = array[index - 1];
        const monthOverMonthGrowth =
          previousMonth && previousMonth.new_users > 0
            ? ((item.new_users - previousMonth.new_users) /
                previousMonth.new_users) *
              100
            : 0;

        return {
          month: item.period,
          newUsers: item.new_users || 0,
          viralCoefficient: item.viral_coefficient || 0,
          monthOverMonthGrowth: Math.round(monthOverMonthGrowth * 100) / 100,
          retentionRate: item.retention_rate || 0,
        };
      }),
    };
  }

  private aggregateByPeriod(
    data: any[],
    period: 'daily' | 'weekly' | 'monthly',
  ): any[] {
    const formatMap = {
      daily: (date: Date) => date.toISOString().split('T')[0],
      weekly: (date: Date) => {
        const year = date.getFullYear();
        const weekNum = this.getWeekNumber(date);
        return `${year}-W${weekNum.toString().padStart(2, '0')}`;
      },
      monthly: (date: Date) =>
        `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`,
    };

    const formatter = formatMap[period];
    const aggregatedData = new Map<string, any>();

    data.forEach((item) => {
      const date = new Date(item.created_at || item.date);
      const periodKey = formatter(date);

      const existing = aggregatedData.get(periodKey) || {
        period: periodKey,
        new_users: 0,
        viral_coefficient: 0,
        organic_growth: 0,
        paid_growth: 0,
        viral_growth: 0,
        cumulative_users: 0,
        retention_rate: 0,
        count: 0,
      };

      existing.new_users += item.new_users || 0;
      existing.organic_growth += item.organic_growth || 0;
      existing.paid_growth += item.paid_growth || 0;
      existing.viral_growth += item.viral_growth || 0;
      existing.cumulative_users += item.cumulative_users || 0;
      existing.retention_rate += item.retention_rate || 0;
      existing.viral_coefficient += item.viral_coefficient || 0;
      existing.count += 1;

      aggregatedData.set(periodKey, existing);
    });

    // Calculate averages for rates
    return Array.from(aggregatedData.values())
      .map((item) => ({
        ...item,
        viral_coefficient:
          item.count > 0 ? item.viral_coefficient / item.count : 0,
        retention_rate: item.count > 0 ? item.retention_rate / item.count : 0,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  private calculateViralProjections(
    currentMetrics: ViralMetrics,
    historicalData: any[],
    timeFrame: 'monthly' | 'quarterly' | 'yearly',
    periods: number,
  ): ViralGrowthProjection {
    // Calculate historical trends
    const avgViralCoefficient =
      historicalData.length > 0
        ? historicalData.reduce(
            (sum, item) => sum + (item.viral_coefficient || 0),
            0,
          ) / historicalData.length
        : currentMetrics.viralCoefficient;

    const avgRetentionRate =
      historicalData.length > 0
        ? historicalData.reduce(
            (sum, item) => sum + (item.retention_rate || 0.85),
            0,
          ) / historicalData.length
        : 0.85; // Default wedding industry retention

    // Wedding industry seasonality factors (higher in spring/summer)
    const seasonalityFactors = [
      0.8, 0.9, 1.2, 1.4, 1.6, 1.5, 1.3, 1.2, 1.1, 0.9, 0.8, 0.7,
    ];
    const baseSeasonality =
      seasonalityFactors.reduce((sum, factor) => sum + factor, 0) / 12;

    const projections = [];
    let currentUsers = currentMetrics.totalUsers;
    const baseGrowthRate = Math.max(avgViralCoefficient, 0.1); // Minimum 10% growth

    for (let i = 1; i <= periods; i++) {
      const currentMonth = (new Date().getMonth() + i - 1) % 12;
      const seasonalFactor = seasonalityFactors[currentMonth] / baseSeasonality;

      const periodGrowthRate =
        baseGrowthRate * seasonalFactor * avgRetentionRate;
      const newUsers = Math.round(currentUsers * periodGrowthRate);
      currentUsers += newUsers;

      // Calculate confidence based on data availability and variance
      const confidence = Math.max(
        0.3,
        Math.min(0.95, 0.7 - i * 0.05 + (historicalData.length > 6 ? 0.2 : 0)),
      );

      const periodLabel = this.formatProjectionPeriod(i, timeFrame);

      projections.push({
        period: periodLabel,
        users: currentUsers,
        confidence: Math.round(confidence * 100) / 100,
      });
    }

    return {
      timeFrame,
      projectedUsers: projections,
      assumptions: {
        baseViralCoefficient: Math.round(avgViralCoefficient * 1000) / 1000,
        retentionRate: Math.round(avgRetentionRate * 1000) / 1000,
        seasonalityFactor: Math.round(baseSeasonality * 1000) / 1000,
      },
    };
  }

  private processChannelEffectiveness(data: any[]): Array<{
    channel: string;
    totalReach: number;
    conversions: number;
    conversionRate: number;
    viralAmplification: number;
    cost: number;
    roi: number;
  }> {
    if (!data || data.length === 0) return [];

    return data
      .map((item) => {
        const conversionRate =
          item.total_reach > 0 ? item.conversions / item.total_reach : 0;
        const viralAmplification =
          item.conversions > 0
            ? (item.viral_conversions || 0) / item.conversions
            : 0;
        const revenue =
          (item.conversions || 0) * (item.average_revenue_per_user || 100); // Default ARPU
        const roi =
          item.cost > 0 ? ((revenue - item.cost) / item.cost) * 100 : 0;

        return {
          channel: item.channel || 'unknown',
          totalReach: item.total_reach || 0,
          conversions: item.conversions || 0,
          conversionRate: Math.round(conversionRate * 10000) / 100, // Percentage
          viralAmplification: Math.round(viralAmplification * 1000) / 1000,
          cost: item.cost || 0,
          roi: Math.round(roi * 100) / 100,
        };
      })
      .sort((a, b) => b.roi - a.roi);
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear =
      (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  private formatProjectionPeriod(
    periodIndex: number,
    timeFrame: 'monthly' | 'quarterly' | 'yearly',
  ): string {
    const currentDate = new Date();

    switch (timeFrame) {
      case 'monthly':
        const targetMonth = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + periodIndex,
          1,
        );
        return `${targetMonth.getFullYear()}-${(targetMonth.getMonth() + 1).toString().padStart(2, '0')}`;

      case 'quarterly':
        const targetQuarter = Math.ceil(
          (currentDate.getMonth() + 1 + periodIndex * 3) / 3,
        );
        const quarterYear =
          currentDate.getFullYear() +
          Math.floor((currentDate.getMonth() + periodIndex * 3) / 12);
        return `${quarterYear}-Q${targetQuarter}`;

      case 'yearly':
        return `${currentDate.getFullYear() + periodIndex}`;

      default:
        return `Period ${periodIndex}`;
    }
  }

  public validateGrowthProjections(
    projections: ViralGrowthProjection,
    maxReasonableGrowthRate: number = 5.0,
  ): { isValid: boolean; warnings: string[]; errors: string[] } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Validate growth rates
    for (let i = 1; i < projections.projectedUsers.length; i++) {
      const current = projections.projectedUsers[i];
      const previous = projections.projectedUsers[i - 1];
      const growthRate = (current.users - previous.users) / previous.users;

      if (growthRate > maxReasonableGrowthRate) {
        warnings.push(
          `Unrealistic growth rate of ${(growthRate * 100).toFixed(1)}% in ${current.period}`,
        );
      }

      if (current.users < previous.users) {
        warnings.push(`Negative growth projected in ${current.period}`);
      }
    }

    // Validate assumptions
    if (projections.assumptions.baseViralCoefficient < 0.1) {
      warnings.push(
        'Very low viral coefficient may indicate limited viral growth potential',
      );
    }

    if (projections.assumptions.retentionRate < 0.5) {
      errors.push(
        'Retention rate below 50% indicates serious user experience issues',
      );
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors,
    };
  }
}
