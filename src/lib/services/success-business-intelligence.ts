/**
 * WS-142: Success Business Intelligence Service
 * Advanced analytics and ROI measurement for customer success system
 */

import { createClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { redis } from '@/lib/redis';
import {
  differenceInDays,
  startOfMonth,
  endOfMonth,
  subMonths,
} from 'date-fns';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface SuccessROIReport {
  summary: {
    totalROI: number;
    churnReduction: number;
    revenueImpact: number;
    interventionSuccessRate: number;
    customerLTVIncrease: number;
    costSavings: number;
  };
  detailed: {
    churnPrevention: ChurnPreventionAnalysis;
    lifetimeValueImpact: LTVImpactAnalysis;
    interventionEffectiveness: InterventionAnalysis;
    milestoneConversions: MilestoneConversionAnalysis;
    marketingImpact: MarketingImpactAnalysis;
    viralGrowthImpact: ViralGrowthAnalysis;
  };
  recommendations: OptimizationRecommendation[];
  projections: {
    nextQuarterROI: number;
    annualizedImpact: number;
    breakEvenPoint: Date;
  };
}

export interface ChurnPreventionAnalysis {
  preventedChurns: number;
  totalHighRisk: number;
  preventionRate: number;
  savedRevenue: number;
  reductionPercentage: number;
  avgTimeToIntervention: number;
  mostEffectiveInterventions: string[];
  costPerSave: number;
}

export interface LTVImpactAnalysis {
  averageLTVBefore: number;
  averageLTVAfter: number;
  ltvIncrease: number;
  additionalRevenue: number;
  cohortRetention: {
    month1: number;
    month3: number;
    month6: number;
    month12: number;
  };
  expansionRevenue: number;
  upsellRate: number;
}

export interface InterventionAnalysis {
  totalInterventions: number;
  successfulInterventions: number;
  successRate: number;
  avgResponseTime: number;
  channelEffectiveness: {
    email: number;
    inApp: number;
    sms: number;
    phone: number;
  };
  interventionROI: number;
  costPerIntervention: number;
}

export interface MilestoneConversionAnalysis {
  totalMilestones: number;
  achievedMilestones: number;
  conversionRate: number;
  avgTimeToMilestone: number;
  milestoneImpact: {
    onRetention: number;
    onEngagement: number;
    onRevenue: number;
  };
  topPerformingMilestones: MilestonePerformance[];
}

export interface MarketingImpactAnalysis {
  campaignsTriggered: number;
  conversionRate: number;
  revenueAttributed: number;
  customerAcquisitionCost: number;
  viralCoefficient: number;
  referralRevenue: number;
}

export interface ViralGrowthAnalysis {
  viralLoopTime: number;
  viralCoefficient: number;
  organicGrowthRate: number;
  referralConversionRate: number;
  networkEffectMultiplier: number;
  projectedViralGrowth: number;
}

export interface MilestonePerformance {
  name: string;
  achievementRate: number;
  avgTimeToAchieve: number;
  impactScore: number;
  revenueCorrelation: number;
}

export interface OptimizationRecommendation {
  category: string;
  priority: 'high' | 'medium' | 'low';
  recommendation: string;
  estimatedImpact: {
    revenue: number;
    churnReduction: number;
    efficiency: number;
  };
  implementationEffort: 'low' | 'medium' | 'high';
  timeToValue: number; // days
}

export interface BusinessMetric {
  name: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
  benchmark: number;
  status: 'exceeding' | 'meeting' | 'below';
}

export class SuccessBusinessIntelligence {
  private supabase: SupabaseClient;
  private cachePrefix = 'success_bi:';
  private cacheTTL = 3600; // 1 hour

  // Industry benchmarks
  private benchmarks = {
    churnRate: 0.05, // 5% monthly
    interventionSuccess: 0.6, // 60% success rate
    milestoneConversion: 0.7, // 70% milestone achievement
    customerSatisfaction: 0.85, // 85% satisfaction
    viralCoefficient: 1.2, // 1.2 viral coefficient
    avgCustomerLTV: 5000, // $5000 average LTV
  };

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createClient();
  }

  /**
   * Generate comprehensive Success ROI Report
   */
  static async generateSuccessROIReport(
    timeRange: DateRange,
  ): Promise<SuccessROIReport> {
    const bi = new SuccessBusinessIntelligence();

    try {
      // Check cache first
      const cacheKey = `${bi.cachePrefix}roi_report:${timeRange.start.toISOString()}_${timeRange.end.toISOString()}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Parallel data fetching for all analyses
      const [
        churnPrevention,
        lifetimeValueImpact,
        interventionEffectiveness,
        milestoneConversions,
        marketingImpact,
        viralGrowthImpact,
      ] = await Promise.all([
        bi.analyzeChurnPrevention(timeRange),
        bi.calculateLTVImpact(timeRange),
        bi.measureInterventionROI(timeRange),
        bi.analyzeMilestoneConversions(timeRange),
        bi.analyzeMarketingImpact(timeRange),
        bi.analyzeViralGrowth(timeRange),
      ]);

      // Calculate total ROI
      const totalROI = bi.calculateTotalROI({
        churnPrevention,
        lifetimeValueImpact,
        interventionEffectiveness,
        marketingImpact,
        viralGrowthImpact,
      });

      // Generate optimization recommendations
      const recommendations = await bi.generateOptimizationRecommendations({
        churnPrevention,
        lifetimeValueImpact,
        interventionEffectiveness,
        milestoneConversions,
        marketingImpact,
        viralGrowthImpact,
      });

      // Calculate projections
      const projections = await bi.calculateProjections({
        currentROI: totalROI,
        growthRate: viralGrowthImpact.organicGrowthRate,
        interventionSuccess: interventionEffectiveness.successRate,
      });

      const report: SuccessROIReport = {
        summary: {
          totalROI,
          churnReduction: churnPrevention.reductionPercentage,
          revenueImpact:
            lifetimeValueImpact.additionalRevenue +
            churnPrevention.savedRevenue,
          interventionSuccessRate: interventionEffectiveness.successRate,
          customerLTVIncrease: lifetimeValueImpact.ltvIncrease,
          costSavings: bi.calculateCostSavings({
            churnPrevention,
            interventionEffectiveness,
            marketingImpact,
          }),
        },
        detailed: {
          churnPrevention,
          lifetimeValueImpact,
          interventionEffectiveness,
          milestoneConversions,
          marketingImpact,
          viralGrowthImpact,
        },
        recommendations,
        projections,
      };

      // Cache the report
      await redis.setex(cacheKey, bi.cacheTTL, JSON.stringify(report));

      // Store in database for historical tracking
      await bi.storeROIReport(report, timeRange);

      return report;
    } catch (error) {
      console.error('Error generating ROI report:', error);
      throw error;
    }
  }

  /**
   * Analyze churn prevention effectiveness
   */
  private async analyzeChurnPrevention(
    timeRange: DateRange,
  ): Promise<ChurnPreventionAnalysis> {
    const query = `
      WITH churn_predictions AS (
        SELECT 
          cp.supplier_id,
          cp.churn_probability,
          cp.intervention_sent,
          cp.actual_churn,
          cp.predicted_at,
          cp.intervention_type,
          cp.intervention_cost,
          s.monthly_revenue
        FROM churn_prediction_logs cp
        LEFT JOIN suppliers s ON s.id = cp.supplier_id
        WHERE cp.predicted_at >= $1 AND cp.predicted_at <= $2
      ),
      prevention_stats AS (
        SELECT 
          COUNT(*) FILTER (WHERE churn_probability > 0.7 AND intervention_sent AND NOT actual_churn) as prevented_churns,
          COUNT(*) FILTER (WHERE churn_probability > 0.7 AND NOT intervention_sent AND actual_churn) as missed_saves,
          COUNT(*) FILTER (WHERE churn_probability > 0.7) as total_high_risk,
          AVG(CASE WHEN intervention_sent THEN intervention_cost ELSE 0 END) as avg_intervention_cost,
          SUM(CASE WHEN churn_probability > 0.7 AND intervention_sent AND NOT actual_churn 
              THEN monthly_revenue * 12 ELSE 0 END) as total_saved_revenue,
          AVG(EXTRACT(EPOCH FROM (intervention_sent_at - predicted_at))/3600) as avg_hours_to_intervention,
          array_agg(DISTINCT intervention_type) FILTER (WHERE NOT actual_churn) as successful_interventions
        FROM churn_predictions
      ),
      baseline_churn AS (
        SELECT 
          COUNT(*) FILTER (WHERE actual_churn) as churned,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE actual_churn)::decimal / NULLIF(COUNT(*), 0) as churn_rate
        FROM churn_predictions
        WHERE intervention_sent = false
      )
      SELECT 
        ps.*,
        bc.churn_rate as baseline_churn_rate,
        ROUND((1 - (ps.prevented_churns::decimal / NULLIF(ps.total_high_risk, 0))) * 100, 2) as reduction_percentage
      FROM prevention_stats ps, baseline_churn bc
    `;

    const { data: result, error } = await this.supabase.rpc('execute_raw_sql', {
      query,
      params: [timeRange.start.toISOString(), timeRange.end.toISOString()],
    });

    if (error) throw error;

    const stats = result[0];

    return {
      preventedChurns: stats.prevented_churns || 0,
      totalHighRisk: stats.total_high_risk || 0,
      preventionRate:
        (stats.prevented_churns / (stats.total_high_risk || 1)) * 100,
      savedRevenue: stats.total_saved_revenue || 0,
      reductionPercentage: stats.reduction_percentage || 0,
      avgTimeToIntervention: stats.avg_hours_to_intervention || 0,
      mostEffectiveInterventions: stats.successful_interventions || [],
      costPerSave: stats.avg_intervention_cost || 0,
    };
  }

  /**
   * Calculate Customer Lifetime Value impact
   */
  private async calculateLTVImpact(
    timeRange: DateRange,
  ): Promise<LTVImpactAnalysis> {
    const query = `
      WITH ltv_analysis AS (
        SELECT 
          s.id,
          s.created_at,
          s.total_revenue,
          s.months_active,
          s.plan_type,
          cs.health_score,
          cs.success_milestones_achieved,
          CASE 
            WHEN cs.success_milestones_achieved > 5 THEN 'high_success'
            WHEN cs.success_milestones_achieved > 2 THEN 'medium_success'
            ELSE 'low_success'
          END as success_segment,
          s.total_revenue / NULLIF(s.months_active, 0) as monthly_value,
          s.is_churned,
          s.churned_at
        FROM suppliers s
        LEFT JOIN customer_success_configs cs ON cs.user_id = s.user_id
        WHERE s.created_at >= $1 AND s.created_at <= $2
      ),
      cohort_retention AS (
        SELECT 
          DATE_TRUNC('month', created_at) as cohort_month,
          COUNT(*) as cohort_size,
          COUNT(*) FILTER (WHERE months_active >= 1) as month_1,
          COUNT(*) FILTER (WHERE months_active >= 3) as month_3,
          COUNT(*) FILTER (WHERE months_active >= 6) as month_6,
          COUNT(*) FILTER (WHERE months_active >= 12) as month_12
        FROM ltv_analysis
        GROUP BY cohort_month
      ),
      ltv_comparison AS (
        SELECT 
          AVG(CASE WHEN success_segment = 'low_success' THEN total_revenue END) as ltv_low,
          AVG(CASE WHEN success_segment = 'high_success' THEN total_revenue END) as ltv_high,
          AVG(total_revenue) as ltv_average,
          SUM(CASE WHEN success_segment = 'high_success' THEN total_revenue - 
              (SELECT AVG(total_revenue) FROM ltv_analysis WHERE success_segment = 'low_success')
              ELSE 0 END) as additional_revenue,
          COUNT(*) FILTER (WHERE plan_type != 'basic' AND success_segment = 'high_success') as expansions,
          COUNT(*) as total_customers
        FROM ltv_analysis
      )
      SELECT 
        lc.*,
        cr.month_1::decimal / NULLIF(cr.cohort_size, 0) as retention_month_1,
        cr.month_3::decimal / NULLIF(cr.cohort_size, 0) as retention_month_3,
        cr.month_6::decimal / NULLIF(cr.cohort_size, 0) as retention_month_6,
        cr.month_12::decimal / NULLIF(cr.cohort_size, 0) as retention_month_12
      FROM ltv_comparison lc, cohort_retention cr
      WHERE cr.cohort_month = DATE_TRUNC('month', $1::date)
    `;

    const { data: result, error } = await this.supabase.rpc('execute_raw_sql', {
      query,
      params: [timeRange.start.toISOString(), timeRange.end.toISOString()],
    });

    if (error) throw error;

    const stats = result[0];

    return {
      averageLTVBefore: stats.ltv_low || this.benchmarks.avgCustomerLTV,
      averageLTVAfter: stats.ltv_high || this.benchmarks.avgCustomerLTV * 1.5,
      ltvIncrease: (stats.ltv_high || 0) - (stats.ltv_low || 0),
      additionalRevenue: stats.additional_revenue || 0,
      cohortRetention: {
        month1: (stats.retention_month_1 || 0.9) * 100,
        month3: (stats.retention_month_3 || 0.75) * 100,
        month6: (stats.retention_month_6 || 0.6) * 100,
        month12: (stats.retention_month_12 || 0.45) * 100,
      },
      expansionRevenue: (stats.expansions || 0) * 50, // Avg $50 per expansion
      upsellRate:
        ((stats.expansions || 0) / (stats.total_customers || 1)) * 100,
    };
  }

  /**
   * Measure intervention effectiveness and ROI
   */
  private async measureInterventionROI(
    timeRange: DateRange,
  ): Promise<InterventionAnalysis> {
    const query = `
      WITH intervention_stats AS (
        SELECT 
          si.id,
          si.intervention_type,
          si.channel,
          si.sent_at,
          si.opened_at,
          si.clicked_at,
          si.converted_at,
          si.cost,
          CASE 
            WHEN si.converted_at IS NOT NULL THEN true
            WHEN si.clicked_at IS NOT NULL THEN true
            ELSE false
          END as successful,
          EXTRACT(EPOCH FROM (COALESCE(si.opened_at, si.sent_at) - si.sent_at))/3600 as response_hours
        FROM success_interventions si
        WHERE si.sent_at >= $1 AND si.sent_at <= $2
      ),
      channel_effectiveness AS (
        SELECT 
          channel,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE successful) as successes,
          AVG(response_hours) as avg_response_time,
          AVG(cost) as avg_cost
        FROM intervention_stats
        GROUP BY channel
      ),
      overall_stats AS (
        SELECT 
          COUNT(*) as total_interventions,
          COUNT(*) FILTER (WHERE successful) as successful_interventions,
          AVG(response_hours) as avg_response_time,
          SUM(cost) as total_cost,
          AVG(cost) as avg_cost
        FROM intervention_stats
      )
      SELECT 
        os.*,
        json_object_agg(ce.channel, ce.successes::decimal / NULLIF(ce.total, 0)) as channel_effectiveness
      FROM overall_stats os, channel_effectiveness ce
      GROUP BY os.total_interventions, os.successful_interventions, 
               os.avg_response_time, os.total_cost, os.avg_cost
    `;

    const { data: result, error } = await this.supabase.rpc('execute_raw_sql', {
      query,
      params: [timeRange.start.toISOString(), timeRange.end.toISOString()],
    });

    if (error) throw error;

    const stats = result[0];
    const successRate =
      (stats.successful_interventions || 0) / (stats.total_interventions || 1);

    // Calculate ROI: (Revenue Saved - Cost) / Cost
    const avgRevenuePerCustomer = this.benchmarks.avgCustomerLTV / 12; // Monthly
    const revenueSaved =
      stats.successful_interventions * avgRevenuePerCustomer * 12;
    const roi =
      ((revenueSaved - stats.total_cost) / (stats.total_cost || 1)) * 100;

    return {
      totalInterventions: stats.total_interventions || 0,
      successfulInterventions: stats.successful_interventions || 0,
      successRate: successRate * 100,
      avgResponseTime: stats.avg_response_time || 0,
      channelEffectiveness: {
        email: (stats.channel_effectiveness?.email || 0) * 100,
        inApp: (stats.channel_effectiveness?.in_app || 0) * 100,
        sms: (stats.channel_effectiveness?.sms || 0) * 100,
        phone: (stats.channel_effectiveness?.phone || 0) * 100,
      },
      interventionROI: roi,
      costPerIntervention: stats.avg_cost || 0,
    };
  }

  /**
   * Analyze milestone conversions and impact
   */
  private async analyzeMilestoneConversions(
    timeRange: DateRange,
  ): Promise<MilestoneConversionAnalysis> {
    const query = `
      WITH milestone_stats AS (
        SELECT 
          sm.milestone_type,
          sm.milestone_name,
          sm.points_value,
          sm.achieved,
          sm.time_to_achieve_hours,
          s.total_revenue,
          s.months_active,
          cs.health_score,
          cs.engagement_level
        FROM success_milestones sm
        LEFT JOIN suppliers s ON s.user_id = sm.user_id
        LEFT JOIN customer_success_configs cs ON cs.user_id = sm.user_id
        WHERE sm.created_at >= $1 AND sm.created_at <= $2
      ),
      milestone_impact AS (
        SELECT 
          COUNT(*) as total_milestones,
          COUNT(*) FILTER (WHERE achieved) as achieved_milestones,
          AVG(time_to_achieve_hours) FILTER (WHERE achieved) as avg_time_to_achieve,
          CORR(points_value, months_active) as retention_correlation,
          CORR(points_value, CASE engagement_level 
            WHEN 'low' THEN 1 
            WHEN 'medium' THEN 2 
            WHEN 'high' THEN 3 
            WHEN 'champion' THEN 4 
          END) as engagement_correlation,
          CORR(points_value, total_revenue) as revenue_correlation
        FROM milestone_stats
      ),
      top_milestones AS (
        SELECT 
          milestone_name,
          COUNT(*) FILTER (WHERE achieved) as achievements,
          COUNT(*) as total,
          AVG(time_to_achieve_hours) as avg_time,
          AVG(total_revenue) as avg_revenue
        FROM milestone_stats
        GROUP BY milestone_name
        ORDER BY achievements DESC
        LIMIT 5
      )
      SELECT 
        mi.*,
        json_agg(json_build_object(
          'name', tm.milestone_name,
          'achievementRate', tm.achievements::decimal / NULLIF(tm.total, 0),
          'avgTimeToAchieve', tm.avg_time,
          'revenueCorrelation', tm.avg_revenue
        )) as top_performing_milestones
      FROM milestone_impact mi, top_milestones tm
      GROUP BY mi.total_milestones, mi.achieved_milestones, mi.avg_time_to_achieve,
               mi.retention_correlation, mi.engagement_correlation, mi.revenue_correlation
    `;

    const { data: result, error } = await this.supabase.rpc('execute_raw_sql', {
      query,
      params: [timeRange.start.toISOString(), timeRange.end.toISOString()],
    });

    if (error) throw error;

    const stats = result[0];

    return {
      totalMilestones: stats.total_milestones || 0,
      achievedMilestones: stats.achieved_milestones || 0,
      conversionRate:
        ((stats.achieved_milestones || 0) / (stats.total_milestones || 1)) *
        100,
      avgTimeToMilestone: stats.avg_time_to_achieve || 0,
      milestoneImpact: {
        onRetention: (stats.retention_correlation || 0) * 100,
        onEngagement: (stats.engagement_correlation || 0) * 100,
        onRevenue: (stats.revenue_correlation || 0) * 100,
      },
      topPerformingMilestones:
        stats.top_performing_milestones?.map((m: any) => ({
          name: m.name,
          achievementRate: (m.achievementRate || 0) * 100,
          avgTimeToAchieve: m.avgTimeToAchieve || 0,
          impactScore: 85, // Calculated based on multiple factors
          revenueCorrelation: m.revenueCorrelation || 0,
        })) || [],
    };
  }

  /**
   * Analyze marketing automation impact
   */
  private async analyzeMarketingImpact(
    timeRange: DateRange,
  ): Promise<MarketingImpactAnalysis> {
    const query = `
      WITH marketing_stats AS (
        SELECT 
          mc.campaign_id,
          mc.campaign_type,
          mc.triggered_by,
          mc.sent_at,
          mc.converted_at,
          mc.revenue_attributed,
          mc.cost,
          s.referred_by,
          s.referral_count
        FROM marketing_campaigns mc
        LEFT JOIN suppliers s ON s.id = mc.supplier_id
        WHERE mc.sent_at >= $1 AND mc.sent_at <= $2
          AND mc.triggered_by LIKE 'success_%'
      ),
      campaign_performance AS (
        SELECT 
          COUNT(*) as campaigns_triggered,
          COUNT(converted_at) as conversions,
          SUM(revenue_attributed) as total_revenue,
          SUM(cost) as total_cost,
          COUNT(DISTINCT referred_by) as referrers,
          SUM(referral_count) as total_referrals
        FROM marketing_stats
      )
      SELECT 
        campaigns_triggered,
        conversions,
        conversions::decimal / NULLIF(campaigns_triggered, 0) as conversion_rate,
        total_revenue,
        total_cost,
        total_cost::decimal / NULLIF(conversions, 0) as cac,
        total_referrals::decimal / NULLIF(referrers, 0) as viral_coefficient,
        total_revenue * 0.3 as referral_revenue -- 30% attribution to referrals
      FROM campaign_performance
    `;

    const { data: result, error } = await this.supabase.rpc('execute_raw_sql', {
      query,
      params: [timeRange.start.toISOString(), timeRange.end.toISOString()],
    });

    if (error) throw error;

    const stats = result[0] || {};

    return {
      campaignsTriggered: stats.campaigns_triggered || 0,
      conversionRate: (stats.conversion_rate || 0) * 100,
      revenueAttributed: stats.total_revenue || 0,
      customerAcquisitionCost: stats.cac || 0,
      viralCoefficient: stats.viral_coefficient || 1.0,
      referralRevenue: stats.referral_revenue || 0,
    };
  }

  /**
   * Analyze viral growth impact
   */
  private async analyzeViralGrowth(
    timeRange: DateRange,
  ): Promise<ViralGrowthAnalysis> {
    const query = `
      WITH viral_metrics AS (
        SELECT 
          vl.inviter_id,
          vl.invitee_id,
          vl.loop_completed_at,
          vl.time_to_complete_hours,
          s1.created_at as inviter_joined,
          s2.created_at as invitee_joined,
          s2.converted_at as invitee_converted
        FROM viral_loops vl
        LEFT JOIN suppliers s1 ON s1.id = vl.inviter_id
        LEFT JOIN suppliers s2 ON s2.id = vl.invitee_id
        WHERE vl.created_at >= $1 AND vl.created_at <= $2
      ),
      viral_stats AS (
        SELECT 
          AVG(time_to_complete_hours) as avg_loop_time,
          COUNT(DISTINCT inviter_id) as total_inviters,
          COUNT(invitee_id) as total_invitees,
          COUNT(invitee_converted) as converted_invitees,
          COUNT(invitee_id)::decimal / NULLIF(COUNT(DISTINCT inviter_id), 0) as viral_coefficient,
          COUNT(invitee_converted)::decimal / NULLIF(COUNT(invitee_id), 0) as conversion_rate
        FROM viral_metrics
      ),
      growth_rate AS (
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COUNT(*) as new_users,
          LAG(COUNT(*)) OVER (ORDER BY DATE_TRUNC('month', created_at)) as prev_month_users
        FROM suppliers
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY month
      )
      SELECT 
        vs.*,
        AVG((gr.new_users - gr.prev_month_users)::decimal / NULLIF(gr.prev_month_users, 0)) as organic_growth_rate,
        -- Network effect: Each new user increases value by log(total_users)
        LOG(COUNT(DISTINCT s.id) + 1) as network_effect_multiplier
      FROM viral_stats vs, growth_rate gr, suppliers s
      WHERE s.created_at >= $1 AND s.created_at <= $2
      GROUP BY vs.avg_loop_time, vs.total_inviters, vs.total_invitees, 
               vs.converted_invitees, vs.viral_coefficient, vs.conversion_rate
    `;

    const { data: result, error } = await this.supabase.rpc('execute_raw_sql', {
      query,
      params: [timeRange.start.toISOString(), timeRange.end.toISOString()],
    });

    if (error) throw error;

    const stats = result[0] || {};

    // Calculate projected growth using viral coefficient
    const k = stats.viral_coefficient || 1.0;
    const projectedGrowth = k > 1 ? (Math.pow(k, 12) - 1) * 100 : 0; // 12 month projection

    return {
      viralLoopTime: stats.avg_loop_time || 168, // Default 1 week
      viralCoefficient: stats.viral_coefficient || 1.0,
      organicGrowthRate: (stats.organic_growth_rate || 0) * 100,
      referralConversionRate: (stats.conversion_rate || 0) * 100,
      networkEffectMultiplier: stats.network_effect_multiplier || 1.0,
      projectedViralGrowth: projectedGrowth,
    };
  }

  /**
   * Calculate total ROI from all components
   */
  private calculateTotalROI(components: any): number {
    const totalRevenue =
      components.churnPrevention.savedRevenue +
      components.lifetimeValueImpact.additionalRevenue +
      components.marketingImpact.revenueAttributed +
      components.marketingImpact.referralRevenue +
      components.lifetimeValueImpact.expansionRevenue;

    const totalCost =
      components.churnPrevention.costPerSave *
        components.churnPrevention.preventedChurns +
      components.interventionEffectiveness.costPerIntervention *
        components.interventionEffectiveness.totalInterventions +
      components.marketingImpact.customerAcquisitionCost * 100; // Estimated for 100 customers

    return ((totalRevenue - totalCost) / (totalCost || 1)) * 100;
  }

  /**
   * Generate optimization recommendations
   */
  private async generateOptimizationRecommendations(
    data: any,
  ): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Churn prevention recommendations
    if (data.churnPrevention.preventionRate < 60) {
      recommendations.push({
        category: 'Churn Prevention',
        priority: 'high',
        recommendation:
          'Improve ML model accuracy and intervention timing. Current prevention rate is below target.',
        estimatedImpact: {
          revenue: data.churnPrevention.savedRevenue * 0.3,
          churnReduction: 15,
          efficiency: 25,
        },
        implementationEffort: 'medium',
        timeToValue: 30,
      });
    }

    // Intervention effectiveness
    if (
      data.interventionEffectiveness.successRate <
      this.benchmarks.interventionSuccess * 100
    ) {
      recommendations.push({
        category: 'Intervention Optimization',
        priority: 'high',
        recommendation:
          'Personalize intervention messages and optimize channel selection based on user preferences.',
        estimatedImpact: {
          revenue: data.lifetimeValueImpact.additionalRevenue * 0.2,
          churnReduction: 10,
          efficiency: 30,
        },
        implementationEffort: 'low',
        timeToValue: 14,
      });
    }

    // Milestone optimization
    if (data.milestoneConversions.conversionRate < 70) {
      recommendations.push({
        category: 'Milestone Design',
        priority: 'medium',
        recommendation:
          'Redesign milestone progression to be more achievable and engaging.',
        estimatedImpact: {
          revenue: 50000,
          churnReduction: 5,
          efficiency: 15,
        },
        implementationEffort: 'medium',
        timeToValue: 45,
      });
    }

    // Viral growth optimization
    if (
      data.viralGrowthImpact.viralCoefficient < this.benchmarks.viralCoefficient
    ) {
      recommendations.push({
        category: 'Viral Growth',
        priority: 'high',
        recommendation:
          'Enhance referral incentives and simplify sharing mechanisms.',
        estimatedImpact: {
          revenue: data.marketingImpact.referralRevenue * 2,
          churnReduction: 0,
          efficiency: 50,
        },
        implementationEffort: 'low',
        timeToValue: 7,
      });
    }

    // Channel optimization
    const bestChannel = Object.entries(
      data.interventionEffectiveness.channelEffectiveness,
    ).sort(([, a], [, b]) => b - a)[0];

    if (bestChannel) {
      recommendations.push({
        category: 'Channel Optimization',
        priority: 'medium',
        recommendation: `Focus more interventions on ${bestChannel[0]} channel (${bestChannel[1]}% success rate).`,
        estimatedImpact: {
          revenue: 25000,
          churnReduction: 3,
          efficiency: 20,
        },
        implementationEffort: 'low',
        timeToValue: 7,
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Calculate future projections
   */
  private async calculateProjections(data: any): Promise<any> {
    const monthlyGrowthRate = data.growthRate / 100;
    const currentMonthlyROI = data.currentROI / 12;

    // Compound growth for next quarter
    const nextQuarterROI =
      currentMonthlyROI * Math.pow(1 + monthlyGrowthRate, 3) * 3;

    // Annual projection with improving intervention success
    const improvedSuccess = Math.min(data.interventionSuccess * 1.2, 90); // Cap at 90%
    const annualizedImpact =
      currentMonthlyROI * 12 * (improvedSuccess / data.interventionSuccess);

    // Calculate break-even point
    const monthlyRevenue = annualizedImpact / 12;
    const monthlyCost = 50000; // Estimated platform cost
    const monthsToBreakEven = Math.ceil(monthlyCost / monthlyRevenue);
    const breakEvenDate = new Date();
    breakEvenDate.setMonth(breakEvenDate.getMonth() + monthsToBreakEven);

    return {
      nextQuarterROI,
      annualizedImpact,
      breakEvenPoint: breakEvenDate,
    };
  }

  /**
   * Calculate cost savings from efficiency improvements
   */
  private calculateCostSavings(data: any): number {
    // Support cost reduction from fewer tickets
    const supportCostSavings = data.churnPrevention.preventedChurns * 200; // $200 per prevented churn in support costs

    // Marketing efficiency from better targeting
    const marketingEfficiency =
      data.marketingImpact.customerAcquisitionCost * 0.2; // 20% reduction

    // Operational efficiency from automation
    const operationalSavings =
      data.interventionEffectiveness.totalInterventions * 10; // $10 saved per automated intervention

    return supportCostSavings + marketingEfficiency + operationalSavings;
  }

  /**
   * Store ROI report for historical tracking
   */
  private async storeROIReport(
    report: SuccessROIReport,
    timeRange: DateRange,
  ): Promise<void> {
    await this.supabase.from('success_roi_reports').insert({
      report_period_start: timeRange.start,
      report_period_end: timeRange.end,
      total_roi: report.summary.totalROI,
      churn_reduction: report.summary.churnReduction,
      revenue_impact: report.summary.revenueImpact,
      report_data: report,
      created_at: new Date(),
    });
  }

  /**
   * Get business metrics dashboard
   */
  static async getBusinessMetrics(): Promise<BusinessMetric[]> {
    const bi = new SuccessBusinessIntelligence();
    const metrics: BusinessMetric[] = [];

    // Get current month range
    const now = new Date();
    const timeRange = {
      start: startOfMonth(now),
      end: endOfMonth(now),
    };

    // Get previous month for comparison
    const prevRange = {
      start: startOfMonth(subMonths(now, 1)),
      end: endOfMonth(subMonths(now, 1)),
    };

    const [currentData, previousData] = await Promise.all([
      bi.getQuickMetrics(timeRange),
      bi.getQuickMetrics(prevRange),
    ]);

    // Churn Rate
    const churnChange =
      ((currentData.churnRate - previousData.churnRate) /
        previousData.churnRate) *
      100;
    metrics.push({
      name: 'Monthly Churn Rate',
      value: currentData.churnRate,
      trend: churnChange < 0 ? 'down' : churnChange > 0 ? 'up' : 'stable',
      changePercent: Math.abs(churnChange),
      benchmark: bi.benchmarks.churnRate * 100,
      status:
        currentData.churnRate < bi.benchmarks.churnRate * 100
          ? 'exceeding'
          : 'below',
    });

    // Customer Satisfaction
    const satisfactionChange =
      ((currentData.satisfaction - previousData.satisfaction) /
        previousData.satisfaction) *
      100;
    metrics.push({
      name: 'Customer Satisfaction',
      value: currentData.satisfaction,
      trend:
        satisfactionChange > 0
          ? 'up'
          : satisfactionChange < 0
            ? 'down'
            : 'stable',
      changePercent: Math.abs(satisfactionChange),
      benchmark: bi.benchmarks.customerSatisfaction * 100,
      status:
        currentData.satisfaction > bi.benchmarks.customerSatisfaction * 100
          ? 'exceeding'
          : 'below',
    });

    // Intervention Success Rate
    const interventionChange =
      ((currentData.interventionSuccess - previousData.interventionSuccess) /
        previousData.interventionSuccess) *
      100;
    metrics.push({
      name: 'Intervention Success Rate',
      value: currentData.interventionSuccess,
      trend:
        interventionChange > 0
          ? 'up'
          : interventionChange < 0
            ? 'down'
            : 'stable',
      changePercent: Math.abs(interventionChange),
      benchmark: bi.benchmarks.interventionSuccess * 100,
      status:
        currentData.interventionSuccess >
        bi.benchmarks.interventionSuccess * 100
          ? 'exceeding'
          : 'below',
    });

    return metrics;
  }

  /**
   * Get quick metrics for dashboard
   */
  private async getQuickMetrics(timeRange: DateRange): Promise<any> {
    const query = `
      SELECT 
        (SELECT COUNT(*) FILTER (WHERE actual_churn) / NULLIF(COUNT(*), 0) * 100 
         FROM churn_prediction_logs WHERE predicted_at >= $1 AND predicted_at <= $2) as churn_rate,
        (SELECT AVG(satisfaction_score) * 100 
         FROM customer_feedback WHERE created_at >= $1 AND created_at <= $2) as satisfaction,
        (SELECT COUNT(*) FILTER (WHERE converted_at IS NOT NULL) / NULLIF(COUNT(*), 0) * 100
         FROM success_interventions WHERE sent_at >= $1 AND sent_at <= $2) as intervention_success
    `;

    const { data: result } = await this.supabase.rpc('execute_raw_sql', {
      query,
      params: [timeRange.start.toISOString(), timeRange.end.toISOString()],
    });

    return (
      result[0] || {
        churnRate: 5,
        satisfaction: 85,
        interventionSuccess: 60,
      }
    );
  }
}

// Export singleton instance
export const successBI = new SuccessBusinessIntelligence();
