/**
 * WS-133: Health Scoring Calculation Engine
 * Advanced health scoring system for customer success metrics
 */

import { createClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  differenceInDays,
  differenceInHours,
  subDays,
  startOfDay,
} from 'date-fns';
import { redis } from '@/lib/redis';
import { engagementScoringService } from '@/lib/analytics/engagement-scoring';

export interface HealthScoreComponents {
  user_id: string;
  organization_id?: string;

  // Core components (0-100 each)
  onboarding_completion: number;
  feature_adoption_breadth: number;
  feature_adoption_depth: number;
  engagement_frequency: number;
  engagement_quality: number;
  success_milestone_progress: number;
  support_interaction_quality: number;
  platform_value_realization: number;
  retention_indicators: number;
  growth_trajectory: number;

  // Weighted overall score
  overall_health_score: number;

  // Trend analysis
  score_trend_7d: number;
  score_trend_30d: number;
  trend_direction: 'improving' | 'stable' | 'declining' | 'volatile';

  // Risk assessment
  churn_risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_factors: HealthRiskFactor[];

  // Recommendations
  improvement_opportunities: HealthRecommendation[];
  next_best_actions: string[];

  calculated_at: Date;
  expires_at: Date;
}

export interface HealthRiskFactor {
  category:
    | 'onboarding'
    | 'engagement'
    | 'adoption'
    | 'support'
    | 'value'
    | 'retention';
  risk_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact_score: number;
  description: string;
  recommended_intervention: string;
  urgency_level: number; // 1-10
  business_impact: string;
}

export interface HealthRecommendation {
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  recommendation_type:
    | 'feature_guidance'
    | 'engagement_boost'
    | 'support_outreach'
    | 'milestone_focus'
    | 'retention_intervention';
  title: string;
  description: string;
  expected_impact: string;
  implementation_effort: 'low' | 'medium' | 'high';
  success_metrics: string[];
  timeline_days: number;
}

export interface HealthTrend {
  user_id: string;
  date: Date;
  health_score: number;
  component_scores: Record<string, number>;
  major_events: HealthEvent[];
}

export interface HealthEvent {
  event_type:
    | 'milestone_achieved'
    | 'feature_adopted'
    | 'support_ticket'
    | 'engagement_spike'
    | 'engagement_drop'
    | 'onboarding_completed';
  event_date: Date;
  impact_on_score: number;
  description: string;
  metadata: Record<string, any>;
}

export interface HealthBenchmarks {
  user_type: string;
  organization_size: 'small' | 'medium' | 'large' | 'enterprise';
  industry?: string;
  benchmarks: {
    excellent: number; // 90+
    good: number; // 75-89
    average: number; // 60-74
    below_average: number; // 45-59
    poor: number; // <45
  };
  percentiles: Record<string, number>;
}

export class HealthScoringEngine {
  private supabase: SupabaseClient;
  private cachePrefix = 'health_score:';
  private cacheTTL = 3600; // 1 hour

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createClient();
  }

  /**
   * Calculate comprehensive health score for a user
   */
  async calculateHealthScore(
    userId: string,
    forceRefresh = false,
    organizationId?: string,
  ): Promise<HealthScoreComponents> {
    const cacheKey = `${this.cachePrefix}${userId}`;

    // Check cache first unless force refresh
    if (!forceRefresh) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          const cachedScore = JSON.parse(cached);
          if (new Date(cachedScore.expires_at) > new Date()) {
            return cachedScore;
          }
        }
      } catch (error) {
        console.warn('Cache read error for health score:', error);
      }
    }

    try {
      // Gather all data needed for scoring
      const userData = await this.gatherUserData(userId, organizationId);

      // Calculate individual component scores
      const componentScores = await this.calculateComponentScores(userData);

      // Calculate weighted overall score
      const overallScore = this.calculateWeightedScore(componentScores);

      // Analyze trends
      const trendAnalysis = await this.analyzeTrends(userId, overallScore);

      // Assess risks
      const riskAssessment = await this.assessRisks(componentScores, userData);

      // Generate recommendations
      const recommendations = await this.generateRecommendations(
        componentScores,
        riskAssessment,
        userData,
      );

      const healthScore: HealthScoreComponents = {
        user_id: userId,
        organization_id: organizationId,
        ...componentScores,
        overall_health_score: overallScore,
        ...trendAnalysis,
        ...riskAssessment,
        improvement_opportunities: recommendations.opportunities,
        next_best_actions: recommendations.nextActions,
        calculated_at: new Date(),
        expires_at: new Date(Date.now() + this.cacheTTL * 1000),
      };

      // Cache the result
      try {
        await redis.setex(cacheKey, this.cacheTTL, JSON.stringify(healthScore));
      } catch (error) {
        console.warn('Cache write error for health score:', error);
      }

      // Store historical record
      await this.storeHealthScoreHistory(healthScore);

      return healthScore;
    } catch (error) {
      console.error('Error calculating health score for user:', userId, error);
      throw error;
    }
  }

  /**
   * Calculate health scores for multiple users (batch processing)
   */
  async calculateBatchHealthScores(
    userIds: string[],
    organizationId?: string,
  ): Promise<Map<string, HealthScoreComponents>> {
    const results = new Map<string, HealthScoreComponents>();
    const batchSize = 10;

    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      const promises = batch.map((userId) =>
        this.calculateHealthScore(userId, false, organizationId)
          .then((score) => ({ userId, score }))
          .catch((error) => ({ userId, error })),
      );

      const batchResults = await Promise.allSettled(promises);

      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          const { userId, score, error } = result.value as any;
          if (score && !error) {
            results.set(userId, score);
          }
        }
      });
    }

    return results;
  }

  /**
   * Get health score benchmarks for comparison
   */
  async getHealthBenchmarks(
    userType: string,
    organizationSize: 'small' | 'medium' | 'large' | 'enterprise',
    industry?: string,
  ): Promise<HealthBenchmarks> {
    const cacheKey = `health_benchmarks:${userType}:${organizationSize}:${industry || 'all'}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Cache read error for benchmarks:', error);
    }

    // Calculate benchmarks from historical data
    let query = this.supabase
      .from('health_score_history')
      .select('overall_health_score')
      .gte('calculated_at', subDays(new Date(), 90).toISOString()); // Last 90 days

    if (userType) {
      query = query.eq('user_type', userType);
    }

    const { data: historicalScores, error } = await query;

    if (error || !historicalScores || historicalScores.length === 0) {
      // Return default benchmarks
      return this.getDefaultBenchmarks(userType, organizationSize);
    }

    const scores = historicalScores
      .map((h) => h.overall_health_score)
      .sort((a, b) => a - b);

    const benchmarks: HealthBenchmarks = {
      user_type: userType,
      organization_size: organizationSize,
      industry,
      benchmarks: {
        excellent: this.percentile(scores, 90),
        good: this.percentile(scores, 75),
        average: this.percentile(scores, 50),
        below_average: this.percentile(scores, 25),
        poor: this.percentile(scores, 10),
      },
      percentiles: {
        p10: this.percentile(scores, 10),
        p25: this.percentile(scores, 25),
        p50: this.percentile(scores, 50),
        p75: this.percentile(scores, 75),
        p90: this.percentile(scores, 90),
        p95: this.percentile(scores, 95),
        p99: this.percentile(scores, 99),
      },
    };

    // Cache benchmarks for 24 hours
    try {
      await redis.setex(cacheKey, 86400, JSON.stringify(benchmarks));
    } catch (error) {
      console.warn('Cache write error for benchmarks:', error);
    }

    return benchmarks;
  }

  /**
   * Get health score trends over time
   */
  async getHealthTrends(
    userId: string,
    days: number = 30,
  ): Promise<HealthTrend[]> {
    const startDate = subDays(new Date(), days);

    const { data: trends, error } = await this.supabase
      .from('health_score_history')
      .select(
        `
        calculated_at,
        overall_health_score,
        onboarding_completion,
        feature_adoption_breadth,
        feature_adoption_depth,
        engagement_frequency,
        engagement_quality,
        success_milestone_progress,
        support_interaction_quality,
        platform_value_realization,
        retention_indicators,
        growth_trajectory
      `,
      )
      .eq('user_id', userId)
      .gte('calculated_at', startDate.toISOString())
      .order('calculated_at', { ascending: true });

    if (error || !trends) {
      console.error('Error fetching health trends:', error);
      return [];
    }

    return trends.map((trend) => ({
      user_id: userId,
      date: new Date(trend.calculated_at),
      health_score: trend.overall_health_score,
      component_scores: {
        onboarding_completion: trend.onboarding_completion,
        feature_adoption_breadth: trend.feature_adoption_breadth,
        feature_adoption_depth: trend.feature_adoption_depth,
        engagement_frequency: trend.engagement_frequency,
        engagement_quality: trend.engagement_quality,
        success_milestone_progress: trend.success_milestone_progress,
        support_interaction_quality: trend.support_interaction_quality,
        platform_value_realization: trend.platform_value_realization,
        retention_indicators: trend.retention_indicators,
        growth_trajectory: trend.growth_trajectory,
      },
      major_events: [], // Would be populated from events data
    }));
  }

  // Private helper methods

  private async gatherUserData(userId: string, organizationId?: string) {
    const [
      userProfile,
      customerConfig,
      milestones,
      featureUsage,
      supportTickets,
      engagementEvents,
      onboardingProgress,
    ] = await Promise.all([
      this.getUserProfile(userId),
      this.getCustomerConfig(userId),
      this.getUserMilestones(userId),
      this.getFeatureUsage(userId),
      this.getSupportHistory(userId),
      this.getEngagementEvents(userId),
      this.getOnboardingProgress(userId),
    ]);

    return {
      userProfile,
      customerConfig,
      milestones,
      featureUsage,
      supportTickets,
      engagementEvents,
      onboardingProgress,
      organizationId,
    };
  }

  private async calculateComponentScores(userData: any) {
    return {
      onboarding_completion: await this.calculateOnboardingScore(userData),
      feature_adoption_breadth:
        await this.calculateFeatureBreadthScore(userData),
      feature_adoption_depth: await this.calculateFeatureDepthScore(userData),
      engagement_frequency:
        await this.calculateEngagementFrequencyScore(userData),
      engagement_quality: await this.calculateEngagementQualityScore(userData),
      success_milestone_progress: await this.calculateMilestoneScore(userData),
      support_interaction_quality: await this.calculateSupportScore(userData),
      platform_value_realization:
        await this.calculateValueRealizationScore(userData),
      retention_indicators: await this.calculateRetentionScore(userData),
      growth_trajectory: await this.calculateGrowthScore(userData),
    };
  }

  private calculateWeightedScore(componentScores: any): number {
    const weights = {
      onboarding_completion: 0.15,
      feature_adoption_breadth: 0.12,
      feature_adoption_depth: 0.13,
      engagement_frequency: 0.12,
      engagement_quality: 0.15,
      success_milestone_progress: 0.1,
      support_interaction_quality: 0.08,
      platform_value_realization: 0.1,
      retention_indicators: 0.05,
      growth_trajectory: 0.0,
    };

    return Math.round(
      Object.entries(componentScores).reduce((total, [component, score]) => {
        const weight = weights[component as keyof typeof weights] || 0;
        return total + (score as number) * weight;
      }, 0),
    );
  }

  private async analyzeTrends(userId: string, currentScore: number) {
    // Get historical scores for trend analysis
    const sevenDaysAgo = subDays(new Date(), 7);
    const thirtyDaysAgo = subDays(new Date(), 30);

    const [score7d, score30d] = await Promise.all([
      this.getHistoricalScore(userId, sevenDaysAgo),
      this.getHistoricalScore(userId, thirtyDaysAgo),
    ]);

    const score_trend_7d = score7d ? currentScore - score7d : 0;
    const score_trend_30d = score30d ? currentScore - score30d : 0;

    let trend_direction: 'improving' | 'stable' | 'declining' | 'volatile' =
      'stable';

    if (Math.abs(score_trend_7d) > 10 && Math.abs(score_trend_30d) > 15) {
      trend_direction = 'volatile';
    } else if (score_trend_7d > 5 || score_trend_30d > 10) {
      trend_direction = 'improving';
    } else if (score_trend_7d < -5 || score_trend_30d < -10) {
      trend_direction = 'declining';
    }

    return {
      score_trend_7d,
      score_trend_30d,
      trend_direction,
    };
  }

  private async assessRisks(componentScores: any, userData: any) {
    const riskFactors: HealthRiskFactor[] = [];
    let churnRiskScore = 0;

    // Analyze each component for risk factors
    if (componentScores.onboarding_completion < 50) {
      riskFactors.push({
        category: 'onboarding',
        risk_type: 'incomplete_onboarding',
        severity: 'high',
        impact_score: 25,
        description: 'User has not completed critical onboarding steps',
        recommended_intervention:
          'Personalized onboarding assistance and tutorial',
        urgency_level: 8,
        business_impact: 'High likelihood of early churn',
      });
      churnRiskScore += 25;
    }

    if (componentScores.engagement_frequency < 30) {
      riskFactors.push({
        category: 'engagement',
        risk_type: 'low_activity',
        severity: 'critical',
        impact_score: 35,
        description: 'User engagement is significantly below healthy levels',
        recommended_intervention: 'Immediate success manager outreach',
        urgency_level: 9,
        business_impact: 'Very high churn risk',
      });
      churnRiskScore += 35;
    }

    if (componentScores.feature_adoption_breadth < 25) {
      riskFactors.push({
        category: 'adoption',
        risk_type: 'limited_feature_usage',
        severity: 'medium',
        impact_score: 15,
        description: 'User is not exploring platform capabilities',
        recommended_intervention: 'Feature discovery campaign and guided tours',
        urgency_level: 6,
        business_impact: 'Reduced platform stickiness',
      });
      churnRiskScore += 15;
    }

    const risk_level: 'low' | 'medium' | 'high' | 'critical' =
      churnRiskScore >= 70
        ? 'critical'
        : churnRiskScore >= 50
          ? 'high'
          : churnRiskScore >= 30
            ? 'medium'
            : 'low';

    return {
      churn_risk_score: Math.min(churnRiskScore, 100),
      risk_level,
      risk_factors: riskFactors,
    };
  }

  private async generateRecommendations(
    componentScores: any,
    riskAssessment: any,
    userData: any,
  ) {
    const opportunities: HealthRecommendation[] = [];
    const nextActions: string[] = [];

    // Generate recommendations based on lowest scoring components
    const sortedComponents = Object.entries(componentScores)
      .sort(([, a], [, b]) => (a as number) - (b as number))
      .slice(0, 3); // Top 3 improvement areas

    for (const [component, score] of sortedComponents) {
      if ((score as number) < 70) {
        const recommendation = this.getComponentRecommendation(
          component,
          score as number,
        );
        if (recommendation) {
          opportunities.push(recommendation);
        }
      }
    }

    // Generate next best actions
    if (componentScores.onboarding_completion < 100) {
      nextActions.push('Complete remaining onboarding steps');
    }

    if (
      riskAssessment.risk_level === 'high' ||
      riskAssessment.risk_level === 'critical'
    ) {
      nextActions.push('Schedule success manager consultation');
    }

    if (componentScores.feature_adoption_breadth < 50) {
      nextActions.push('Explore new platform features');
    }

    return {
      opportunities,
      nextActions,
    };
  }

  private getComponentRecommendation(
    component: string,
    score: number,
  ): HealthRecommendation | null {
    const recommendationMap: Record<string, HealthRecommendation> = {
      onboarding_completion: {
        category: 'Onboarding',
        priority: 'high',
        recommendation_type: 'feature_guidance',
        title: 'Complete Your Onboarding Journey',
        description:
          'Finish setting up your profile and initial configuration to unlock full platform potential',
        expected_impact: '15-25 point health score improvement',
        implementation_effort: 'low',
        success_metrics: [
          'Profile completion',
          'Initial setup complete',
          'First project created',
        ],
        timeline_days: 3,
      },
      feature_adoption_breadth: {
        category: 'Feature Adoption',
        priority: 'medium',
        recommendation_type: 'feature_guidance',
        title: 'Explore Additional Platform Features',
        description:
          'Discover and try new features to maximize your productivity and platform value',
        expected_impact: '10-20 point health score improvement',
        implementation_effort: 'medium',
        success_metrics: [
          'New features tried',
          'Feature usage diversity',
          'Time saved metrics',
        ],
        timeline_days: 14,
      },
      engagement_frequency: {
        category: 'Engagement',
        priority: 'critical',
        recommendation_type: 'engagement_boost',
        title: 'Increase Platform Activity',
        description:
          'Regular platform usage is key to success - establish a consistent usage pattern',
        expected_impact: '20-30 point health score improvement',
        implementation_effort: 'low',
        success_metrics: [
          'Daily active usage',
          'Session frequency',
          'Task completion rate',
        ],
        timeline_days: 7,
      },
    };

    return recommendationMap[component] || null;
  }

  // Component calculation methods
  private async calculateOnboardingScore(userData: any): Promise<number> {
    if (!userData.onboardingProgress) return 0;

    const progress = userData.onboardingProgress;
    const completedSteps = progress.completed_steps || 0;
    const totalSteps = progress.total_steps || 1;

    return Math.round((completedSteps / totalSteps) * 100);
  }

  private async calculateFeatureBreadthScore(userData: any): Promise<number> {
    if (!userData.featureUsage) return 0;

    const uniqueFeatures = new Set(
      userData.featureUsage.map((usage: any) => usage.feature_key),
    ).size;
    const totalAvailableFeatures = 20; // Assume 20 major features

    return Math.min(
      100,
      Math.round((uniqueFeatures / totalAvailableFeatures) * 100),
    );
  }

  private async calculateFeatureDepthScore(userData: any): Promise<number> {
    if (!userData.featureUsage) return 0;

    const avgUsagePerFeature =
      userData.featureUsage.reduce(
        (sum: number, usage: any) => sum + (usage.usage_count || 0),
        0,
      ) / userData.featureUsage.length;

    // Score based on depth of usage (more usage = higher score)
    return Math.min(100, Math.round(avgUsagePerFeature * 10));
  }

  private async calculateEngagementFrequencyScore(
    userData: any,
  ): Promise<number> {
    if (!userData.engagementEvents) return 50;

    const last30Days = subDays(new Date(), 30);
    const recentEvents = userData.engagementEvents.filter(
      (event: any) => new Date(event.created_at) >= last30Days,
    );

    // Score based on frequency (target: 1+ events per day)
    const eventsPerDay = recentEvents.length / 30;
    return Math.min(100, Math.round(eventsPerDay * 50));
  }

  private async calculateEngagementQualityScore(
    userData: any,
  ): Promise<number> {
    // Use existing engagement scoring service
    try {
      const engagement = await engagementScoringService.getEngagementScore(
        userData.userProfile.id,
        userData.userProfile.supplier_id || userData.userProfile.id,
      );
      return engagement?.score || 50;
    } catch (error) {
      return 50;
    }
  }

  private async calculateMilestoneScore(userData: any): Promise<number> {
    if (!userData.milestones) return 0;

    const achievedMilestones = userData.milestones.filter(
      (m: any) => m.achieved,
    ).length;
    const totalMilestones = userData.milestones.length || 1;

    return Math.round((achievedMilestones / totalMilestones) * 100);
  }

  private async calculateSupportScore(userData: any): Promise<number> {
    if (!userData.supportTickets || userData.supportTickets.length === 0)
      return 85; // Good if no issues

    const resolvedTickets = userData.supportTickets.filter(
      (ticket: any) => ticket.status === 'resolved',
    );
    const avgResolutionTime =
      resolvedTickets.reduce(
        (sum: number, ticket: any) => sum + (ticket.resolution_hours || 0),
        0,
      ) / resolvedTickets.length;

    // Score based on resolution efficiency (faster = better)
    if (avgResolutionTime <= 24) return 95;
    if (avgResolutionTime <= 48) return 85;
    if (avgResolutionTime <= 72) return 75;
    return 60;
  }

  private async calculateValueRealizationScore(userData: any): Promise<number> {
    // Calculate based on time savings, milestone achievements, and feature adoption
    const milestoneScore = await this.calculateMilestoneScore(userData);
    const adoptionScore = await this.calculateFeatureBreadthScore(userData);

    // Weighted average
    return Math.round(milestoneScore * 0.6 + adoptionScore * 0.4);
  }

  private async calculateRetentionScore(userData: any): Promise<number> {
    if (!userData.userProfile) return 50;

    const accountAge = differenceInDays(
      new Date(),
      new Date(userData.userProfile.created_at),
    );
    const expectedRetentionByAge =
      accountAge > 90 ? 90 : accountAge > 30 ? 80 : 70;

    return Math.min(100, expectedRetentionByAge);
  }

  private async calculateGrowthScore(userData: any): Promise<number> {
    // Placeholder - would calculate based on expanding usage, team invites, etc.
    return 75;
  }

  // Database helper methods
  private async getUserProfile(userId: string) {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    return error ? null : data;
  }

  private async getCustomerConfig(userId: string) {
    const { data, error } = await this.supabase
      .from('customer_success_configs')
      .select('*')
      .eq('user_id', userId)
      .single();

    return error ? null : data;
  }

  private async getUserMilestones(userId: string) {
    const { data, error } = await this.supabase
      .from('success_milestones')
      .select('*')
      .eq('user_id', userId);

    return error ? [] : data;
  }

  private async getFeatureUsage(userId: string) {
    // This would query a feature usage table
    // For now, return mock data
    return [];
  }

  private async getSupportHistory(userId: string) {
    // This would query support tickets
    // For now, return empty array
    return [];
  }

  private async getEngagementEvents(userId: string) {
    const { data, error } = await this.supabase
      .from('client_engagement_events')
      .select('*')
      .eq('client_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    return error ? [] : data;
  }

  private async getOnboardingProgress(userId: string) {
    // This would query onboarding progress
    // For now, return mock data
    return {
      completed_steps: 3,
      total_steps: 5,
      current_step: 'profile_setup',
    };
  }

  private async getHistoricalScore(
    userId: string,
    date: Date,
  ): Promise<number | null> {
    const { data, error } = await this.supabase
      .from('health_score_history')
      .select('overall_health_score')
      .eq('user_id', userId)
      .gte('calculated_at', startOfDay(date).toISOString())
      .lte(
        'calculated_at',
        new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      )
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single();

    return error ? null : data?.overall_health_score || null;
  }

  private async storeHealthScoreHistory(
    healthScore: HealthScoreComponents,
  ): Promise<void> {
    try {
      await this.supabase.from('health_score_history').insert({
        user_id: healthScore.user_id,
        organization_id: healthScore.organization_id,
        overall_health_score: healthScore.overall_health_score,
        onboarding_completion: healthScore.onboarding_completion,
        feature_adoption_breadth: healthScore.feature_adoption_breadth,
        feature_adoption_depth: healthScore.feature_adoption_depth,
        engagement_frequency: healthScore.engagement_frequency,
        engagement_quality: healthScore.engagement_quality,
        success_milestone_progress: healthScore.success_milestone_progress,
        support_interaction_quality: healthScore.support_interaction_quality,
        platform_value_realization: healthScore.platform_value_realization,
        retention_indicators: healthScore.retention_indicators,
        growth_trajectory: healthScore.growth_trajectory,
        churn_risk_score: healthScore.churn_risk_score,
        risk_level: healthScore.risk_level,
        calculated_at: healthScore.calculated_at,
      });
    } catch (error) {
      console.error('Failed to store health score history:', error);
    }
  }

  private percentile(sortedArray: number[], percentile: number): number {
    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1];
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  private getDefaultBenchmarks(
    userType: string,
    organizationSize: string,
  ): HealthBenchmarks {
    return {
      user_type: userType,
      organization_size: organizationSize,
      benchmarks: {
        excellent: 90,
        good: 75,
        average: 60,
        below_average: 45,
        poor: 30,
      },
      percentiles: {
        p10: 25,
        p25: 40,
        p50: 60,
        p75: 75,
        p90: 88,
        p95: 92,
        p99: 97,
      },
    };
  }
}

// Export singleton instance
export const healthScoringEngine = new HealthScoringEngine();
