/**
 * WS-140: Trial Analytics Tracking Service
 * Comprehensive analytics for trial funnel optimization
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';

interface FunnelStage {
  name: string;
  enteredAt?: string;
  exitedAt?: string;
  duration?: number;
  completed: boolean;
  dropoffReason?: string;
}

interface TrialFunnelMetrics {
  signupToActivation: number;
  activationToEngagement: number;
  engagementToConversion: number;
  overallConversionRate: number;
  averageTimeToConvert: number;
  dropoffPoints: {
    stage: string;
    rate: number;
    reasons: string[];
  }[];
}

interface UserBehaviorMetrics {
  dailyActiveMinutes: number[];
  featureAdoption: Record<string, number>;
  clickPaths: string[][];
  errorEncounters: number;
  supportTickets: number;
  referralsSent: number;
}

interface ConversionPrediction {
  likelihood: number;
  factors: {
    positive: string[];
    negative: string[];
  };
  recommendedActions: string[];
  optimalContactTime: string;
}

export class TrialAnalyticsService {
  private supabase: SupabaseClient<Database>;
  private funnelStages: string[] = [
    'signup',
    'onboarding_started',
    'profile_completed',
    'first_wedding_created',
    'first_supplier_added',
    'first_journey_created',
    'first_automation_triggered',
    'value_realized',
    'conversion_initiated',
    'payment_completed',
  ];

  constructor() {
    this.supabase = createServerComponentClient<Database>({ cookies });
  }

  /**
   * Track user progression through trial funnel
   */
  async trackFunnelEvent(
    userId: string,
    stage: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Record the funnel event
      const { error: eventError } = await this.supabase
        .from('trial_funnel_events')
        .insert({
          user_id: userId,
          stage,
          timestamp: new Date().toISOString(),
          metadata: {
            ...metadata,
            session_id: this.getSessionId(),
            referrer: this.getReferrer(),
            device_type: this.getDeviceType(),
          },
        });

      if (eventError) {
        console.error('[Analytics] Failed to track funnel event:', eventError);
        return;
      }

      // Update user's current funnel stage
      await this.supabase
        .from('trial_users')
        .update({
          current_funnel_stage: stage,
          last_active: new Date().toISOString(),
        })
        .eq('user_id', userId);

      // Calculate time spent in previous stage
      const previousStage = await this.getPreviousStage(userId, stage);
      if (previousStage) {
        const duration = await this.calculateStageDuration(
          userId,
          previousStage,
          stage,
        );
        await this.recordStageDuration(userId, previousStage, duration);
      }

      // Check for conversion triggers
      if (this.isConversionTrigger(stage)) {
        await this.triggerConversionFlow(userId, stage);
      }

      // Update predictions
      await this.updateConversionPrediction(userId);

      // Performance tracking
      const trackingTime = Date.now() - startTime;
      if (trackingTime > 100) {
        console.warn(
          `[Analytics] Slow tracking: ${trackingTime}ms for ${stage}`,
        );
      }
    } catch (error) {
      console.error('[Analytics] Tracking failed:', error);
    }
  }

  /**
   * Track feature usage and engagement
   */
  async trackFeatureUsage(
    userId: string,
    feature: string,
    action: string,
    value?: number,
  ): Promise<void> {
    try {
      await this.supabase.from('trial_feature_analytics').insert({
        user_id: userId,
        feature,
        action,
        value,
        timestamp: new Date().toISOString(),
        trial_day: await this.getTrialDay(userId),
      });

      // Update feature adoption metrics
      await this.updateFeatureAdoption(userId, feature);

      // Check for milestone achievements
      await this.checkFeatureMilestones(userId, feature, action);
    } catch (error) {
      console.error('[Analytics] Feature tracking failed:', error);
    }
  }

  /**
   * Get comprehensive funnel metrics
   */
  async getFunnelMetrics(cohort?: string): Promise<TrialFunnelMetrics> {
    try {
      // Build cohort filter
      const cohortFilter = cohort ? { cohort } : {};

      // Get stage progression data
      const { data: funnelData } = await this.supabase
        .from('trial_funnel_summary')
        .select('*')
        .match(cohortFilter);

      if (!funnelData) {
        throw new Error('No funnel data available');
      }

      // Calculate conversion rates between stages
      const conversionRates = this.calculateConversionRates(funnelData);

      // Identify drop-off points
      const dropoffPoints = this.identifyDropoffPoints(funnelData);

      // Calculate average times
      const avgTimes = await this.calculateAverageTimings();

      return {
        signupToActivation: conversionRates.activation,
        activationToEngagement: conversionRates.engagement,
        engagementToConversion: conversionRates.conversion,
        overallConversionRate: conversionRates.overall,
        averageTimeToConvert: avgTimes.conversion,
        dropoffPoints,
      };
    } catch (error) {
      console.error('[Analytics] Failed to get funnel metrics:', error);
      throw error;
    }
  }

  /**
   * Get user behavior analytics
   */
  async getUserBehavior(userId: string): Promise<UserBehaviorMetrics> {
    try {
      // Get daily activity
      const { data: activityData } = await this.supabase
        .from('trial_daily_activity')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: true });

      // Get feature usage
      const { data: featureData } = await this.supabase
        .from('trial_feature_analytics')
        .select('feature, action, count')
        .eq('user_id', userId);

      // Get click paths
      const { data: clickData } = await this.supabase
        .from('trial_click_paths')
        .select('path')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(10);

      // Get error and support data
      const { data: errorData } = await this.supabase
        .from('trial_errors')
        .select('count')
        .eq('user_id', userId)
        .single();

      return {
        dailyActiveMinutes: activityData?.map((d) => d.active_minutes) || [],
        featureAdoption: this.aggregateFeatureUsage(featureData || []),
        clickPaths: clickData?.map((d) => d.path) || [],
        errorEncounters: errorData?.count || 0,
        supportTickets: 0, // Would fetch from support system
        referralsSent: 0, // Would fetch from referral system
      };
    } catch (error) {
      console.error('[Analytics] Failed to get user behavior:', error);
      throw error;
    }
  }

  /**
   * Predict conversion likelihood using ML model
   */
  async predictConversion(userId: string): Promise<ConversionPrediction> {
    try {
      // Get user's trial data
      const behavior = await this.getUserBehavior(userId);
      const trialDay = await this.getTrialDay(userId);
      const engagementScore = await this.calculateEngagementScore(userId);

      // Simple prediction model (would use actual ML in production)
      const factors = {
        positive: [] as string[],
        negative: [] as string[],
      };

      // Analyze positive factors
      if (engagementScore > 70) {
        factors.positive.push('High engagement score');
      }
      if (behavior.dailyActiveMinutes.length > 5) {
        factors.positive.push('Consistent daily usage');
      }
      if (Object.keys(behavior.featureAdoption).length > 5) {
        factors.positive.push('Exploring multiple features');
      }
      if (behavior.referralsSent > 0) {
        factors.positive.push('Referring others');
      }

      // Analyze negative factors
      if (engagementScore < 30) {
        factors.negative.push('Low engagement');
      }
      if (behavior.errorEncounters > 5) {
        factors.negative.push('Multiple errors encountered');
      }
      if (behavior.supportTickets > 2) {
        factors.negative.push('Multiple support issues');
      }
      if (trialDay > 20 && engagementScore < 50) {
        factors.negative.push('Late trial with low engagement');
      }

      // Calculate likelihood
      const likelihood = this.calculateLikelihood(
        factors,
        engagementScore,
        trialDay,
      );

      // Generate recommendations
      const recommendedActions = this.generateRecommendations(
        likelihood,
        factors,
        trialDay,
      );

      // Determine optimal contact time
      const optimalContactTime = await this.determineOptimalContactTime(userId);

      return {
        likelihood,
        factors,
        recommendedActions,
        optimalContactTime,
      };
    } catch (error) {
      console.error('[Analytics] Prediction failed:', error);
      return {
        likelihood: 50,
        factors: { positive: [], negative: [] },
        recommendedActions: ['Continue monitoring'],
        optimalContactTime: '10:00 AM',
      };
    }
  }

  /**
   * Generate cohort analysis report
   */
  async generateCohortAnalysis(startDate: Date, endDate: Date): Promise<any> {
    try {
      const { data: cohortData } = await this.supabase
        .from('trial_cohorts')
        .select('*')
        .gte('signup_date', startDate.toISOString())
        .lte('signup_date', endDate.toISOString());

      if (!cohortData) return null;

      // Group by week
      const weeklyCohor = this.groupByWeek(cohortData);

      // Calculate retention curves
      const retentionCurves = await Promise.all(
        Object.keys(weeklyCohorts).map(async (week) => {
          const cohort = weeklyCohorts[week];
          const retention = await this.calculateRetention(cohort);
          return { week, retention };
        }),
      );

      // Calculate conversion rates
      const conversionRates = await Promise.all(
        Object.keys(weeklyCohorts).map(async (week) => {
          const cohort = weeklyCohorts[week];
          const conversion = await this.calculateCohortConversion(cohort);
          return { week, conversion };
        }),
      );

      return {
        cohorts: weeklyCohorts,
        retentionCurves,
        conversionRates,
        insights: this.generateCohortInsights(retentionCurves, conversionRates),
      };
    } catch (error) {
      console.error('[Analytics] Cohort analysis failed:', error);
      throw error;
    }
  }

  /**
   * Track conversion event
   */
  async trackConversion(
    userId: string,
    planId: string,
    revenue: number,
    source: string,
  ): Promise<void> {
    try {
      // Record conversion
      await this.supabase.from('trial_conversions').insert({
        user_id: userId,
        plan_id: planId,
        revenue,
        source,
        converted_at: new Date().toISOString(),
        trial_day: await this.getTrialDay(userId),
        engagement_score: await this.calculateEngagementScore(userId),
      });

      // Update user status
      await this.supabase
        .from('trial_users')
        .update({
          converted: true,
          conversion_date: new Date().toISOString(),
          conversion_plan: planId,
        })
        .eq('user_id', userId);

      // Track conversion funnel completion
      await this.trackFunnelEvent(userId, 'payment_completed', {
        plan_id: planId,
        revenue,
        source,
      });

      // Update cohort metrics
      await this.updateCohortMetrics(userId, 'converted');
    } catch (error) {
      console.error('[Analytics] Conversion tracking failed:', error);
    }
  }

  // Helper methods

  private calculateConversionRates(funnelData: any[]): any {
    const stages = this.funnelStages;
    const rates: any = {};

    for (let i = 1; i < stages.length; i++) {
      const prevStage = stages[i - 1];
      const currStage = stages[i];

      const prevCount = funnelData.filter((d) => d.stage === prevStage).length;
      const currCount = funnelData.filter((d) => d.stage === currStage).length;

      rates[`${prevStage}_to_${currStage}`] =
        prevCount > 0 ? (currCount / prevCount) * 100 : 0;
    }

    rates.activation = rates.signup_to_profile_completed || 0;
    rates.engagement = rates.profile_completed_to_value_realized || 0;
    rates.conversion = rates.value_realized_to_payment_completed || 0;
    rates.overall = rates.signup_to_payment_completed || 0;

    return rates;
  }

  private identifyDropoffPoints(funnelData: any[]): any[] {
    const dropoffs = [];
    const stages = this.funnelStages;

    for (let i = 1; i < stages.length; i++) {
      const prevStage = stages[i - 1];
      const currStage = stages[i];

      const prevCount = funnelData.filter((d) => d.stage === prevStage).length;
      const currCount = funnelData.filter((d) => d.stage === currStage).length;
      const dropoffRate =
        prevCount > 0 ? ((prevCount - currCount) / prevCount) * 100 : 0;

      if (dropoffRate > 30) {
        dropoffs.push({
          stage: prevStage,
          rate: dropoffRate,
          reasons: await this.getDropoffReasons(prevStage),
        });
      }
    }

    return dropoffs.sort((a, b) => b.rate - a.rate);
  }

  private async getDropoffReasons(stage: string): Promise<string[]> {
    // This would analyze user feedback and behavior
    const reasonsMap: Record<string, string[]> = {
      signup: ['Complex form', 'Email verification issues'],
      onboarding_started: ['Unclear value proposition', 'Too many steps'],
      profile_completed: ['Required information unclear', 'Technical issues'],
      first_wedding_created: ['Interface confusion', 'Feature discovery'],
      first_supplier_added: ['Integration complexity', 'Contact import issues'],
    };

    return reasonsMap[stage] || ['Unknown'];
  }

  private async calculateAverageTimings(): Promise<any> {
    const { data } = await this.supabase
      .from('trial_conversion_times')
      .select('time_to_convert');

    if (!data || data.length === 0) {
      return { conversion: 0 };
    }

    const times = data.map((d) => d.time_to_convert);
    const average = times.reduce((a, b) => a + b, 0) / times.length;

    return { conversion: average };
  }

  private async getTrialDay(userId: string): Promise<number> {
    const { data } = await this.supabase
      .from('trial_configs')
      .select('trial_start')
      .eq('user_id', userId)
      .single();

    if (!data) return 0;

    const start = new Date(data.trial_start);
    const now = new Date();
    return Math.floor(
      (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  private async calculateEngagementScore(userId: string): Promise<number> {
    const behavior = await this.getUserBehavior(userId);
    const weights = {
      dailyActivity: 0.3,
      featureUsage: 0.3,
      contentCreation: 0.2,
      socialEngagement: 0.2,
    };

    let score = 0;

    // Daily activity score
    const activeDays = behavior.dailyActiveMinutes.filter((m) => m > 0).length;
    score += (activeDays / 30) * 100 * weights.dailyActivity;

    // Feature usage score
    const featuresUsed = Object.keys(behavior.featureAdoption).length;
    score += Math.min(100, (featuresUsed / 10) * 100) * weights.featureUsage;

    // Content creation (simplified)
    score += 50 * weights.contentCreation;

    // Social engagement (simplified)
    score += (behavior.referralsSent > 0 ? 100 : 0) * weights.socialEngagement;

    return Math.round(score);
  }

  private calculateLikelihood(
    factors: any,
    engagementScore: number,
    trialDay: number,
  ): number {
    let likelihood = 50; // Base likelihood

    // Adjust based on factors
    likelihood += factors.positive.length * 10;
    likelihood -= factors.negative.length * 15;

    // Adjust based on engagement
    likelihood += (engagementScore - 50) * 0.5;

    // Adjust based on trial timing
    if (trialDay < 7) {
      likelihood *= 0.8; // Too early to predict accurately
    } else if (trialDay > 25) {
      likelihood *= 0.9; // Late converters are less likely
    }

    return Math.max(0, Math.min(100, Math.round(likelihood)));
  }

  private generateRecommendations(
    likelihood: number,
    factors: any,
    trialDay: number,
  ): string[] {
    const recommendations = [];

    if (likelihood > 70) {
      recommendations.push('Send conversion offer email');
      recommendations.push('Schedule sales call');
    } else if (likelihood > 40) {
      recommendations.push('Provide additional onboarding support');
      recommendations.push('Offer extension or discount');
    } else {
      recommendations.push('Send re-engagement campaign');
      recommendations.push('Gather feedback on blockers');
    }

    if (factors.negative.includes('Multiple errors encountered')) {
      recommendations.push('Proactive technical support outreach');
    }

    if (trialDay > 20 && likelihood < 50) {
      recommendations.push('Last-chance offer with urgency');
    }

    return recommendations;
  }

  private async determineOptimalContactTime(userId: string): Promise<string> {
    // This would analyze user activity patterns
    return '10:00 AM'; // Simplified
  }

  private aggregateFeatureUsage(data: any[]): Record<string, number> {
    const usage: Record<string, number> = {};

    data.forEach((item) => {
      usage[item.feature] = (usage[item.feature] || 0) + item.count;
    });

    return usage;
  }

  private groupByWeek(data: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};

    data.forEach((item) => {
      const week = this.getWeekString(new Date(item.signup_date));
      if (!grouped[week]) {
        grouped[week] = [];
      }
      grouped[week].push(item);
    });

    return grouped;
  }

  private getWeekString(date: Date): string {
    const year = date.getFullYear();
    const week = Math.ceil((date.getDate() + date.getDay()) / 7);
    return `${year}-W${week}`;
  }

  private async calculateRetention(cohort: any[]): Promise<number[]> {
    // Simplified retention calculation
    return [100, 80, 65, 50, 40, 35, 30];
  }

  private async calculateCohortConversion(cohort: any[]): Promise<number> {
    const converted = cohort.filter((u) => u.converted).length;
    return cohort.length > 0 ? (converted / cohort.length) * 100 : 0;
  }

  private generateCohortInsights(
    retention: any[],
    conversion: any[],
  ): string[] {
    const insights = [];

    // Analyze retention trends
    const avgRetention =
      retention.reduce((a, b) => a + b.retention[7] || 0, 0) / retention.length;
    if (avgRetention < 30) {
      insights.push('Low week-2 retention indicates onboarding issues');
    }

    // Analyze conversion trends
    const avgConversion =
      conversion.reduce((a, b) => a + b.conversion, 0) / conversion.length;
    if (avgConversion < 10) {
      insights.push(
        'Below target conversion rate - review pricing or value prop',
      );
    }

    return insights;
  }

  private getSessionId(): string {
    // Implementation would get actual session ID
    return `session_${Date.now()}`;
  }

  private getReferrer(): string {
    // Implementation would get actual referrer
    return 'direct';
  }

  private getDeviceType(): string {
    // Implementation would detect actual device type
    return 'desktop';
  }

  private async getPreviousStage(
    userId: string,
    currentStage: string,
  ): Promise<string | null> {
    const currentIndex = this.funnelStages.indexOf(currentStage);
    if (currentIndex <= 0) return null;
    return this.funnelStages[currentIndex - 1];
  }

  private async calculateStageDuration(
    userId: string,
    fromStage: string,
    toStage: string,
  ): Promise<number> {
    // Calculate time between stages
    return 3600; // Simplified - returns 1 hour
  }

  private async recordStageDuration(
    userId: string,
    stage: string,
    duration: number,
  ): Promise<void> {
    await this.supabase.from('trial_stage_durations').insert({
      user_id: userId,
      stage,
      duration,
      recorded_at: new Date().toISOString(),
    });
  }

  private isConversionTrigger(stage: string): boolean {
    const triggers = ['value_realized', 'first_automation_triggered'];
    return triggers.includes(stage);
  }

  private async triggerConversionFlow(
    userId: string,
    stage: string,
  ): Promise<void> {
    // Trigger conversion-focused communications
    await fetch('/api/trial/trigger-conversion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, trigger: stage }),
    });
  }

  private async updateFeatureAdoption(
    userId: string,
    feature: string,
  ): Promise<void> {
    await this.supabase.from('trial_feature_adoption').upsert({
      user_id: userId,
      feature,
      adopted: true,
      first_used: new Date().toISOString(),
      usage_count: 1,
    });
  }

  private async checkFeatureMilestones(
    userId: string,
    feature: string,
    action: string,
  ): Promise<void> {
    // Check if user reached a milestone
    const milestones: Record<string, number> = {
      journey_created: 1,
      suppliers_added: 5,
      automations_triggered: 10,
    };

    const key = `${feature}_${action}`;
    if (milestones[key]) {
      await this.trackFunnelEvent(userId, `milestone_${key}`, {
        threshold: milestones[key],
      });
    }
  }

  private async updateConversionPrediction(userId: string): Promise<void> {
    const prediction = await this.predictConversion(userId);

    await this.supabase.from('trial_predictions').upsert({
      user_id: userId,
      likelihood: prediction.likelihood,
      factors: prediction.factors,
      recommendations: prediction.recommendedActions,
      updated_at: new Date().toISOString(),
    });
  }

  private async updateCohortMetrics(
    userId: string,
    event: string,
  ): Promise<void> {
    await this.supabase.from('trial_cohort_events').insert({
      user_id: userId,
      event,
      timestamp: new Date().toISOString(),
    });
  }
}
