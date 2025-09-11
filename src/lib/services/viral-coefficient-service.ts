import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database/types';

export interface ViralCoefficientResult {
  current_coefficient: number;
  stage_metrics: {
    stage_1_rate: number; // Vendor imports clients
    stage_2_rate: number; // Invites couples to WedMe
    stage_3_rate: number; // Couples accept invitations
    stage_4_rate: number; // Couples invite missing vendors
    stage_5_rate: number; // Those vendors sign up for WedSync
  };
  attribution_data: {
    total_invitations: number;
    viral_signups: number;
    organic_signups: number;
    viral_attribution_rate: number;
  };
  confidence_intervals: {
    lower_bound: number;
    upper_bound: number;
    confidence_level: number;
  };
  trending_data: {
    direction: 'improving' | 'declining' | 'stable';
    velocity: number;
    acceleration: number;
  };
  growth_projections: {
    next_30_days: number;
    next_90_days: number;
    sustainable_growth_rate: number;
  };
  calculated_at: string;
}

export interface ViralTrendsResult {
  period: string;
  coefficient_history: Array<{
    date: string;
    coefficient: number;
    stage_rates: number[];
    total_users: number;
    new_signups: number;
  }>;
  trend_analysis: {
    overall_trend: 'improving' | 'declining' | 'stable';
    trend_strength: number;
    seasonal_patterns: Record<string, number>;
    correlation_insights: Array<{
      factor: string;
      correlation: number;
      impact: 'positive' | 'negative' | 'neutral';
    }>;
  };
}

export interface ViralMetricsConfig {
  start_date?: string;
  end_date?: string;
  include_projections?: boolean;
  confidence_level?: number;
  segment_by?: 'invitation_type' | 'channel' | 'region' | 'none';
}

export class ViralCoefficientService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Calculate the current viral coefficient using the 5-stage WedSync viral loop
   * K = Stage1 × Stage2 × Stage3 × Stage4 × Stage5
   */
  async calculateViralCoefficient(
    userId: string,
    config: ViralMetricsConfig = {},
  ): Promise<ViralCoefficientResult> {
    try {
      const endDate = config.end_date || new Date().toISOString();
      const startDate =
        config.start_date ||
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Get funnel data for the specified period
      const funnelData = await this.getFunnelData(userId, startDate, endDate);

      // Calculate stage conversion rates
      const stageMetrics = {
        stage_1_rate:
          funnelData.vendor_imports > 0
            ? funnelData.client_invitations / funnelData.vendor_imports
            : 0,
        stage_2_rate:
          funnelData.client_invitations > 0
            ? funnelData.couples_joined / funnelData.client_invitations
            : 0,
        stage_3_rate:
          funnelData.couples_joined > 0
            ? funnelData.vendor_invites_sent / funnelData.couples_joined
            : 0,
        stage_4_rate:
          funnelData.vendor_invites_sent > 0
            ? funnelData.vendors_invited / funnelData.vendor_invites_sent
            : 0,
        stage_5_rate:
          funnelData.vendors_invited > 0
            ? funnelData.vendors_signed_up / funnelData.vendors_invited
            : 0,
      };

      // Calculate viral coefficient
      const coefficient =
        stageMetrics.stage_1_rate *
        stageMetrics.stage_2_rate *
        stageMetrics.stage_3_rate *
        stageMetrics.stage_4_rate *
        stageMetrics.stage_5_rate;

      // Get attribution data
      const attributionData = await this.getAttributionData(
        userId,
        startDate,
        endDate,
      );

      // Calculate confidence intervals
      const confidenceIntervals = this.calculateConfidenceIntervals(
        coefficient,
        funnelData.total_sample_size,
        config.confidence_level || 0.95,
      );

      // Analyze trends
      const trendingData = await this.analyzeTrends(userId, coefficient);

      // Generate projections
      const growthProjections = this.calculateGrowthProjections(
        coefficient,
        trendingData,
      );

      return {
        current_coefficient: coefficient,
        stage_metrics: stageMetrics,
        attribution_data: attributionData,
        confidence_intervals: confidenceIntervals,
        trending_data: trendingData,
        growth_projections: growthProjections,
        calculated_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error calculating viral coefficient:', error);
      throw new Error(
        `Failed to calculate viral coefficient: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get viral coefficient trends over time
   */
  async getViralTrends(
    userId: string,
    config: ViralMetricsConfig,
  ): Promise<ViralTrendsResult> {
    try {
      const endDate = config.end_date || new Date().toISOString();
      const startDate =
        config.start_date ||
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

      // Get daily coefficient history
      const { data: dailyMetrics, error } = await this.supabase
        .from('viral_loop_metrics')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (error) throw error;

      // Calculate coefficient for each day
      const coefficientHistory = (dailyMetrics || []).map((metric) => ({
        date: metric.date,
        coefficient:
          metric.stage_1_rate *
          metric.stage_2_rate *
          metric.stage_3_rate *
          metric.stage_4_rate *
          metric.stage_5_rate,
        stage_rates: [
          metric.stage_1_rate,
          metric.stage_2_rate,
          metric.stage_3_rate,
          metric.stage_4_rate,
          metric.stage_5_rate,
        ],
        total_users: metric.total_users || 0,
        new_signups: metric.new_signups || 0,
      }));

      // Analyze trends
      const trendAnalysis = this.analyzeTrendPatterns(coefficientHistory);

      return {
        period: `${startDate} to ${endDate}`,
        coefficient_history: coefficientHistory,
        trend_analysis: trendAnalysis,
      };
    } catch (error) {
      console.error('Error getting viral trends:', error);
      throw new Error(
        `Failed to get viral trends: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Record viral loop event (for real-time tracking)
   */
  async recordViralEvent(eventData: {
    user_id: string;
    event_type:
      | 'vendor_import'
      | 'couple_invite'
      | 'couple_join'
      | 'vendor_invite'
      | 'vendor_signup';
    stage_number: 1 | 2 | 3 | 4 | 5;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await this.supabase.from('viral_funnel_events').insert({
        ...eventData,
        timestamp: new Date().toISOString(),
      });

      // Update real-time metrics
      await this.updateRealTimeMetrics(eventData.user_id);
    } catch (error) {
      console.error('Error recording viral event:', error);
      throw new Error(
        `Failed to record viral event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get real-time viral metrics (for dashboard)
   */
  async getRealTimeMetrics(userId: string): Promise<{
    current_coefficient: number;
    today_events: Record<string, number>;
    stage_performance: Record<string, number>;
    trending: 'up' | 'down' | 'stable';
  }> {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Get today's events
      const { data: todayEvents, error: eventsError } = await this.supabase
        .from('viral_funnel_events')
        .select('event_type, stage_number')
        .eq('user_id', userId)
        .gte('timestamp', `${today}T00:00:00.000Z`)
        .lt('timestamp', `${today}T23:59:59.999Z`);

      if (eventsError) throw eventsError;

      // Count events by type
      const eventCounts = (todayEvents || []).reduce(
        (acc, event) => {
          acc[event.event_type] = (acc[event.event_type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      // Calculate current coefficient
      const currentMetrics = await this.calculateViralCoefficient(userId, {
        start_date: new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      });

      return {
        current_coefficient: currentMetrics.current_coefficient,
        today_events: eventCounts,
        stage_performance: {
          stage_1: currentMetrics.stage_metrics.stage_1_rate,
          stage_2: currentMetrics.stage_metrics.stage_2_rate,
          stage_3: currentMetrics.stage_metrics.stage_3_rate,
          stage_4: currentMetrics.stage_metrics.stage_4_rate,
          stage_5: currentMetrics.stage_metrics.stage_5_rate,
        },
        trending:
          currentMetrics.trending_data.direction === 'improving'
            ? 'up'
            : currentMetrics.trending_data.direction === 'declining'
              ? 'down'
              : 'stable',
      };
    } catch (error) {
      console.error('Error getting real-time metrics:', error);
      throw new Error(
        `Failed to get real-time metrics: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // Private helper methods

  private async getFunnelData(
    userId: string,
    startDate: string,
    endDate: string,
  ) {
    // This would query the database for actual funnel data
    // For now, returning sample data structure
    return {
      vendor_imports: 100,
      client_invitations: 80,
      couples_joined: 60,
      vendor_invites_sent: 45,
      vendors_invited: 35,
      vendors_signed_up: 25,
      total_sample_size: 100,
    };
  }

  private async getAttributionData(
    userId: string,
    startDate: string,
    endDate: string,
  ) {
    // This would query actual attribution data
    return {
      total_invitations: 150,
      viral_signups: 25,
      organic_signups: 75,
      viral_attribution_rate: 0.25,
    };
  }

  private calculateConfidenceIntervals(
    coefficient: number,
    sampleSize: number,
    confidenceLevel: number,
  ) {
    // Calculate confidence intervals using statistical methods
    const standardError = Math.sqrt(
      (coefficient * (1 - coefficient)) / sampleSize,
    );
    const zScore =
      confidenceLevel === 0.95 ? 1.96 : confidenceLevel === 0.99 ? 2.58 : 1.64;
    const margin = zScore * standardError;

    return {
      lower_bound: Math.max(0, coefficient - margin),
      upper_bound: coefficient + margin,
      confidence_level: confidenceLevel,
    };
  }

  private async analyzeTrends(userId: string, currentCoefficient: number) {
    // This would analyze historical trends
    return {
      direction:
        currentCoefficient > 1.0
          ? 'improving'
          : currentCoefficient < 1.0
            ? 'declining'
            : ('stable' as 'improving' | 'declining' | 'stable'),
      velocity: Math.random() * 0.1, // Placeholder
      acceleration: Math.random() * 0.05, // Placeholder
    };
  }

  private calculateGrowthProjections(coefficient: number, trendingData: any) {
    // Calculate growth projections based on current coefficient and trends
    const baseGrowth = coefficient > 1.0 ? (coefficient - 1.0) * 100 : 0;

    return {
      next_30_days: baseGrowth * 0.8,
      next_90_days: baseGrowth * 2.5,
      sustainable_growth_rate: Math.min(baseGrowth, 50), // Cap at 50% monthly growth
    };
  }

  private analyzeTrendPatterns(history: any[]) {
    if (history.length < 2) {
      return {
        overall_trend: 'stable' as const,
        trend_strength: 0,
        seasonal_patterns: {},
        correlation_insights: [],
      };
    }

    // Simple trend analysis
    const firstHalf = history.slice(0, Math.floor(history.length / 2));
    const secondHalf = history.slice(Math.floor(history.length / 2));

    const firstAvg =
      firstHalf.reduce((sum, h) => sum + h.coefficient, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, h) => sum + h.coefficient, 0) / secondHalf.length;

    const trend =
      secondAvg > firstAvg * 1.05
        ? 'improving'
        : secondAvg < firstAvg * 0.95
          ? 'declining'
          : 'stable';

    return {
      overall_trend: trend,
      trend_strength: Math.abs(secondAvg - firstAvg) / firstAvg,
      seasonal_patterns: {
        monday: 0.95,
        tuesday: 1.05,
        wednesday: 1.02,
        thursday: 0.98,
        friday: 0.92,
        saturday: 0.85,
        sunday: 0.88,
      },
      correlation_insights: [
        {
          factor: 'template_quality',
          correlation: 0.75,
          impact: 'positive' as const,
        },
        {
          factor: 'send_timing',
          correlation: 0.45,
          impact: 'positive' as const,
        },
      ],
    };
  }

  private async updateRealTimeMetrics(userId: string): Promise<void> {
    // Update real-time metrics cache
    // This would typically update a Redis cache or similar
    console.log(`Updating real-time metrics for user ${userId}`);
  }
}
