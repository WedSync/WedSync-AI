import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export interface AttributionEvent {
  id: string;
  user_id: string;
  referrer_id: string | null;
  event_type: 'signup' | 'conversion' | 'payment' | 'referral';
  attribution_source: 'viral_invitation' | 'campaign' | 'organic' | 'paid';
  conversion_value_cents: number;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ViralChainMetrics {
  root_user_id: string;
  total_referrals: number;
  total_conversions: number;
  max_depth: number;
  viral_coefficient: number;
  attributed_revenue: number;
  chain_strength: number;
  generations: ViralGeneration[];
}

export interface ViralGeneration {
  generation: number;
  user_count: number;
  conversion_count: number;
  conversion_rate: number;
  revenue_generated: number;
  top_performers: AttributionPerformer[];
}

export interface AttributionPerformer {
  user_id: string;
  name: string;
  business_name: string;
  supplier_type: string;
  referrals_generated: number;
  conversion_rate: number;
  attributed_revenue: number;
  viral_coefficient: number;
}

export interface ConversionFunnel {
  stage: string;
  users_entered: number;
  users_converted: number;
  conversion_rate: number;
  average_time_in_stage_hours: number;
  dropoff_reasons: string[];
}

/**
 * Attribution Tracking Service
 * Handles complex viral attribution chains, conversion tracking, and revenue attribution
 */
export class AttributionTrackingService {
  private static instance: AttributionTrackingService;
  private supabase: any;

  constructor() {
    this.supabase = createServerComponentClient({ cookies });
  }

  static getInstance(): AttributionTrackingService {
    if (!AttributionTrackingService.instance) {
      AttributionTrackingService.instance = new AttributionTrackingService();
    }
    return AttributionTrackingService.instance;
  }

  /**
   * Track a new attribution event in the viral chain
   */
  async trackAttributionEvent(
    event: Omit<AttributionEvent, 'id' | 'created_at'>,
  ): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from('user_attributions')
        .insert({
          ...event,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Update viral metrics in real-time
      if (event.referrer_id) {
        await this.updateViralMetrics(event.referrer_id);
      }

      return data.id;
    } catch (error) {
      console.error('Failed to track attribution event:', error);
      throw error;
    }
  }

  /**
   * Calculate comprehensive viral chain metrics using recursive SQL
   */
  async calculateViralChainMetrics(
    rootUserId: string,
  ): Promise<ViralChainMetrics> {
    try {
      // Execute the viral attribution chain analysis from WS-143 specification
      const { data: chainData, error: chainError } = await this.supabase.rpc(
        'get_viral_attribution_chain',
        {
          root_user_id: rootUserId,
        },
      );

      if (chainError) throw chainError;

      // Get detailed generation metrics
      const generationMetrics =
        await this.calculateGenerationMetrics(rootUserId);

      // Calculate viral coefficient
      const viralCoefficient = this.calculateViralCoefficient(chainData);

      // Get top performers in the chain
      const topPerformers = await this.getTopPerformersInChain(rootUserId);

      return {
        root_user_id: rootUserId,
        total_referrals: chainData.reduce(
          (sum: number, item: any) => sum + item.direct_referrals,
          0,
        ),
        total_conversions: chainData.reduce(
          (sum: number, item: any) => sum + item.conversions,
          0,
        ),
        max_depth: Math.max(...chainData.map((item: any) => item.generation)),
        viral_coefficient: viralCoefficient,
        attributed_revenue:
          chainData.reduce(
            (sum: number, item: any) => sum + item.attributed_revenue_cents,
            0,
          ) / 100,
        chain_strength: this.calculateChainStrength(chainData),
        generations: generationMetrics,
      };
    } catch (error) {
      console.error('Failed to calculate viral chain metrics:', error);
      throw error;
    }
  }

  /**
   * Get attribution performance for a specific user
   */
  async getUserAttributionPerformance(
    userId: string,
  ): Promise<AttributionPerformer> {
    try {
      // Get user info
      const { data: user, error: userError } = await this.supabase
        .from('user_profiles')
        .select('first_name, last_name, business_name, supplier_type')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      // Get attribution stats
      const { data: stats, error: statsError } = await this.supabase.rpc(
        'get_user_attribution_stats',
        {
          target_user_id: userId,
        },
      );

      if (statsError) throw statsError;

      const viralCoeff =
        stats.total_invitations > 0
          ? stats.successful_conversions / stats.total_invitations
          : 0;

      return {
        user_id: userId,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        business_name: user.business_name || '',
        supplier_type: user.supplier_type || 'unknown',
        referrals_generated: stats.total_invitations || 0,
        conversion_rate: stats.conversion_rate || 0,
        attributed_revenue: (stats.attributed_revenue_cents || 0) / 100,
        viral_coefficient: viralCoeff,
      };
    } catch (error) {
      console.error('Failed to get user attribution performance:', error);
      throw error;
    }
  }

  /**
   * Track conversion through attribution funnel
   */
  async trackConversionFunnel(
    userId: string,
    stage: string,
    converted: boolean = true,
  ): Promise<void> {
    try {
      await this.supabase.from('attribution_funnel_events').insert({
        user_id: userId,
        stage: stage,
        converted: converted,
        timestamp: new Date().toISOString(),
      });

      // Update funnel metrics
      await this.supabase.rpc('update_funnel_metrics', {
        funnel_stage: stage,
        user_converted: converted,
      });
    } catch (error) {
      console.error('Failed to track conversion funnel:', error);
    }
  }

  /**
   * Get conversion funnel analysis
   */
  async getConversionFunnelAnalysis(): Promise<ConversionFunnel[]> {
    try {
      const { data, error } = await this.supabase.rpc(
        'analyze_conversion_funnel',
      );

      if (error) throw error;

      return data.map((stage: any) => ({
        stage: stage.stage_name,
        users_entered: stage.users_entered,
        users_converted: stage.users_converted,
        conversion_rate: stage.conversion_rate,
        average_time_in_stage_hours: stage.avg_time_hours,
        dropoff_reasons: stage.common_dropoff_reasons || [],
      }));
    } catch (error) {
      console.error('Failed to get conversion funnel analysis:', error);
      return [];
    }
  }

  /**
   * Update real-time viral metrics for a user
   */
  async updateViralMetrics(userId: string): Promise<void> {
    try {
      await this.supabase.rpc('update_realtime_viral_metrics', {
        target_user_id: userId,
      });
    } catch (error) {
      console.error('Failed to update viral metrics:', error);
    }
  }

  /**
   * Get revenue attribution breakdown
   */
  async getRevenueAttribution(
    userId: string,
    timeRange: '7d' | '30d' | '90d' | 'all' = '30d',
  ): Promise<any> {
    try {
      const { data, error } = await this.supabase.rpc(
        'get_revenue_attribution_breakdown',
        {
          target_user_id: userId,
          time_range: timeRange,
        },
      );

      if (error) throw error;

      return {
        total_attributed_revenue: data.total_revenue_cents / 100,
        direct_revenue: data.direct_revenue_cents / 100,
        indirect_revenue: data.indirect_revenue_cents / 100,
        attribution_by_source: data.attribution_sources,
        revenue_by_generation: data.generation_revenue,
        growth_rate: data.growth_rate_percent,
      };
    } catch (error) {
      console.error('Failed to get revenue attribution:', error);
      return {
        total_attributed_revenue: 0,
        direct_revenue: 0,
        indirect_revenue: 0,
      };
    }
  }

  /**
   * Find potential high-value attribution targets
   */
  async identifyHighValueTargets(
    userId: string,
    limit: number = 10,
  ): Promise<any[]> {
    try {
      const { data, error } = await this.supabase.rpc(
        'identify_high_value_attribution_targets',
        {
          source_user_id: userId,
          target_limit: limit,
        },
      );

      if (error) throw error;

      return data.map((target: any) => ({
        user_id: target.user_id,
        name: target.name,
        business_name: target.business_name,
        supplier_type: target.supplier_type,
        estimated_value: target.estimated_value_cents / 100,
        conversion_likelihood: target.conversion_probability,
        relationship_strength: target.relationship_score,
        best_approach: target.recommended_approach,
      }));
    } catch (error) {
      console.error('Failed to identify high-value targets:', error);
      return [];
    }
  }

  // Private helper methods

  /**
   * Calculate generation-specific metrics
   */
  private async calculateGenerationMetrics(
    rootUserId: string,
  ): Promise<ViralGeneration[]> {
    try {
      const { data, error } = await this.supabase.rpc(
        'get_generation_metrics',
        {
          root_user_id: rootUserId,
        },
      );

      if (error) throw error;

      return data.map((gen: any) => ({
        generation: gen.generation_level,
        user_count: gen.user_count,
        conversion_count: gen.conversions,
        conversion_rate: gen.conversion_rate,
        revenue_generated: gen.revenue_cents / 100,
        top_performers: [], // Could be populated with additional query
      }));
    } catch (error) {
      console.error('Failed to calculate generation metrics:', error);
      return [];
    }
  }

  /**
   * Calculate viral coefficient based on chain data
   */
  private calculateViralCoefficient(chainData: any[]): number {
    if (chainData.length === 0) return 0;

    const totalInvitations = chainData.reduce(
      (sum, item) => sum + item.invitations_sent,
      0,
    );
    const totalConversions = chainData.reduce(
      (sum, item) => sum + item.conversions,
      0,
    );

    return totalInvitations > 0 ? totalConversions / totalInvitations : 0;
  }

  /**
   * Get top performers in attribution chain
   */
  private async getTopPerformersInChain(
    rootUserId: string,
  ): Promise<AttributionPerformer[]> {
    try {
      const { data, error } = await this.supabase.rpc(
        'get_chain_top_performers',
        {
          root_user_id: rootUserId,
          limit_count: 5,
        },
      );

      if (error) throw error;

      return data.map((performer: any) => ({
        user_id: performer.user_id,
        name: performer.full_name,
        business_name: performer.business_name,
        supplier_type: performer.supplier_type,
        referrals_generated: performer.referrals,
        conversion_rate: performer.conversion_rate,
        attributed_revenue: performer.revenue_cents / 100,
        viral_coefficient: performer.viral_coefficient,
      }));
    } catch (error) {
      console.error('Failed to get top performers:', error);
      return [];
    }
  }

  /**
   * Calculate overall chain strength metric
   */
  private calculateChainStrength(chainData: any[]): number {
    if (chainData.length === 0) return 0;

    // Factor in depth, conversion rates, and revenue per generation
    let strengthScore = 0;
    let totalWeight = 0;

    chainData.forEach((gen, index) => {
      const generationWeight = 1 / (index + 1); // Later generations have less weight
      const conversionStrength = gen.conversion_rate * generationWeight;
      const revenueStrength =
        (gen.attributed_revenue_cents / 10000) * generationWeight;

      strengthScore +=
        (conversionStrength + revenueStrength) * generationWeight;
      totalWeight += generationWeight;
    });

    return totalWeight > 0 ? strengthScore / totalWeight : 0;
  }

  /**
   * Get cohort attribution analysis
   */
  async getCohortAttributionAnalysis(
    cohortStartDate: string,
    cohortEndDate: string,
  ): Promise<any> {
    try {
      const { data, error } = await this.supabase.rpc(
        'analyze_attribution_cohorts',
        {
          start_date: cohortStartDate,
          end_date: cohortEndDate,
        },
      );

      if (error) throw error;

      return {
        cohort_size: data.total_users,
        attribution_rate: data.users_with_attributions / data.total_users,
        average_chain_depth: data.avg_chain_depth,
        total_attributed_revenue: data.total_revenue_cents / 100,
        top_attribution_sources: data.top_sources,
        retention_by_attribution: data.retention_rates,
      };
    } catch (error) {
      console.error('Failed to analyze attribution cohorts:', error);
      return null;
    }
  }
}

// Export singleton instance
export const attributionTrackingService =
  AttributionTrackingService.getInstance();
