/**
 * WS-132 Trial Management Service
 * Core service for managing 30-day trials with milestone tracking and ROI calculation
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  addDays,
  differenceInDays,
  differenceInHours,
  isAfter,
} from 'date-fns';
import {
  TrialConfig,
  TrialStatus,
  TrialOnboardingData,
  TrialProgress,
  TrialFeatureUsage,
  TrialMilestone,
  TrialROIMetrics,
  MilestoneType,
  BusinessType,
  StartTrialResponse,
  TrialStatusResponse,
  TrialConversionResponse,
  MILESTONE_DEFINITIONS,
  FEATURE_TIME_SAVINGS,
} from '../../types/trial';
import { SubscriptionService } from '../services/subscriptionService';

export class TrialService {
  constructor(
    private supabase: SupabaseClient,
    private subscriptionService: SubscriptionService,
  ) {}

  /**
   * Start a new 30-day trial for a user
   */
  async startTrial(
    userId: string,
    planTier: 'professional' | 'premium',
    onboardingData: TrialOnboardingData,
  ): Promise<StartTrialResponse> {
    try {
      // Check if user already has an active trial
      const existingTrial = await this.getActiveTrial(userId);
      if (existingTrial) {
        throw new Error('User already has an active trial');
      }

      // Check if user already has a subscription
      const existingSubscription =
        await this.subscriptionService.getUserSubscription(userId);
      if (existingSubscription && existingSubscription.status === 'active') {
        throw new Error('User already has an active subscription');
      }

      const trialStart = new Date();
      const trialEnd = addDays(trialStart, 30);

      // Create trial configuration
      const trialConfig: Omit<TrialConfig, 'id' | 'created_at' | 'updated_at'> =
        {
          user_id: userId,
          business_type: onboardingData.business_type,
          business_goals: onboardingData.primary_goals,
          current_workflow_pain_points: onboardingData.current_challenges,
          expected_time_savings_hours:
            onboardingData.weekly_time_spent_hours * 0.3, // Expect 30% time savings
          hourly_rate: onboardingData.estimated_hourly_value,
          trial_start: trialStart,
          trial_end: trialEnd,
          status: 'active',
          onboarding_completed: true,
        };

      // Insert trial record
      const { data: trial, error: trialError } = await this.supabase
        .from('trial_configs')
        .insert(trialConfig)
        .select()
        .single();

      if (trialError) {
        throw new Error(`Failed to create trial: ${trialError.message}`);
      }

      // Initialize milestones for this trial
      await this.initializeMilestones(trial.id);

      // Create trial subscription in Stripe with 30-day trial
      const planName = planTier === 'professional' ? 'professional' : 'premium';
      const plan = await this.subscriptionService.getPlanByName(planName);

      if (!plan) {
        throw new Error(`Plan ${planName} not found`);
      }

      await this.subscriptionService.createSubscription({
        userId,
        priceId: plan.stripe_price_id,
        trialPeriodDays: 30,
      });

      // Log trial start event
      await this.logTrialEvent(userId, trial.id, 'trial_started', {
        plan_tier: planTier,
        business_type: onboardingData.business_type,
        expected_savings: onboardingData.weekly_time_spent_hours * 0.3,
      });

      return {
        success: true,
        trial_id: trial.id,
        trial_end_date: trialEnd.toISOString(),
        onboarding_required: false,
        next_steps: [
          'Complete your profile setup',
          'Add your first client',
          'Create your first journey',
          'Explore the milestone achievements',
        ],
      };
    } catch (error) {
      // Enhanced error handling with context
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('Error starting trial:', {
        error: errorMessage,
        userId,
        planTier,
        timestamp: new Date().toISOString(),
      });

      // Re-throw with more specific error message
      if (error instanceof Error) {
        throw new Error(`Failed to start trial: ${error.message}`);
      }
      throw new Error('Failed to start trial due to unexpected error');
    }
  }

  /**
   * Get active trial for a user
   */
  async getActiveTrial(userId: string): Promise<TrialConfig | null> {
    const { data, error } = await this.supabase
      .from('trial_configs')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch trial: ${error.message}`);
    }

    return data;
  }

  /**
   * Get comprehensive trial status and progress
   */
  async getTrialStatus(userId: string): Promise<TrialStatusResponse> {
    try {
      const trial = await this.getActiveTrial(userId);

      if (!trial) {
        throw new Error('No active trial found');
      }

      // Check if trial has expired
      if (isAfter(new Date(), new Date(trial.trial_end))) {
        await this.expireTrial(trial.id);
        throw new Error('Trial has expired');
      }

      const progress = await this.calculateTrialProgress(trial.id);
      const recommendations = await this.generateRecommendations(
        trial,
        progress,
      );

      return {
        success: true,
        trial,
        progress,
        recommendations,
      };
    } catch (error) {
      console.error('Error getting trial status:', error);
      throw error;
    }
  }

  /**
   * Track feature usage during trial
   */
  async trackFeatureUsage(
    userId: string,
    featureKey: string,
    featureName: string,
    timeSavedMinutes: number,
    contextData?: Record<string, any>,
  ): Promise<void> {
    try {
      const trial = await this.getActiveTrial(userId);

      if (!trial) {
        // If no trial, still track for potential future ROI calculation
        return;
      }

      const usage: Omit<TrialFeatureUsage, 'id' | 'created_at'> = {
        trial_id: trial.id,
        feature_key: featureKey,
        feature_name: featureName,
        usage_count: 1,
        time_saved_minutes: timeSavedMinutes,
        last_used_at: new Date(),
      };

      // Upsert usage record (increment if exists)
      const { error } = await this.supabase
        .from('trial_feature_usage')
        .upsert(usage, {
          onConflict: 'trial_id,feature_key',
          ignoreDuplicates: false,
        });

      if (error) {
        throw error;
      }

      // Update usage count if record already exists
      await this.supabase.rpc('increment_feature_usage', {
        p_trial_id: trial.id,
        p_feature_key: featureKey,
        p_time_saved: timeSavedMinutes,
      });

      // Log usage event
      await this.logTrialEvent(userId, trial.id, 'feature_used', {
        feature_key: featureKey,
        feature_name: featureName,
        time_saved_minutes: timeSavedMinutes,
        context: contextData,
      });
    } catch (error) {
      console.error('Error tracking feature usage:', error);
      // Don't throw - usage tracking shouldn't break the main flow
    }
  }

  /**
   * Achieve a milestone during trial
   */
  async achieveMilestone(
    userId: string,
    milestoneType: MilestoneType,
    contextData?: Record<string, any>,
  ): Promise<TrialMilestone> {
    try {
      const trial = await this.getActiveTrial(userId);

      if (!trial) {
        throw new Error('No active trial found');
      }

      // Get milestone record
      const { data: milestone, error: milestoneError } = await this.supabase
        .from('trial_milestones')
        .select('*')
        .eq('trial_id', trial.id)
        .eq('milestone_type', milestoneType)
        .single();

      if (milestoneError) {
        throw new Error(`Milestone not found: ${milestoneError.message}`);
      }

      if (milestone.achieved) {
        return milestone; // Already achieved
      }

      // Mark milestone as achieved
      const achievedAt = new Date();
      const timeToAchieve = differenceInHours(
        achievedAt,
        new Date(trial.trial_start),
      );

      const { data: updatedMilestone, error: updateError } = await this.supabase
        .from('trial_milestones')
        .update({
          achieved: true,
          achieved_at: achievedAt,
          time_to_achieve_hours: timeToAchieve,
        })
        .eq('id', milestone.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Log milestone achievement
      await this.logTrialEvent(userId, trial.id, 'milestone_achieved', {
        milestone_type: milestoneType,
        time_to_achieve_hours: timeToAchieve,
        context: contextData,
      });

      return updatedMilestone;
    } catch (error) {
      console.error('Error achieving milestone:', error);
      throw error;
    }
  }

  /**
   * Convert trial to paid subscription
   */
  async convertTrial(
    userId: string,
    paymentMethodId: string,
  ): Promise<TrialConversionResponse> {
    try {
      const trial = await this.getActiveTrial(userId);

      if (!trial) {
        throw new Error('No active trial found');
      }

      // Get current subscription (should be in trialing status)
      const subscription =
        await this.subscriptionService.getUserSubscription(userId);

      if (!subscription || subscription.status !== 'trialing') {
        throw new Error('No trialing subscription found');
      }

      // Update subscription with payment method (this will end the trial)
      const updatedSubscription =
        await this.subscriptionService.updateSubscription(
          subscription.stripe_subscription_id,
          {
            paymentMethodId,
            cancelAtPeriodEnd: false,
          },
        );

      // Mark trial as converted
      await this.supabase
        .from('trial_configs')
        .update({
          status: 'converted',
          updated_at: new Date(),
        })
        .eq('id', trial.id);

      // Calculate final ROI metrics
      const roiMetrics = await this.calculateROI(trial.id);

      // Log conversion event
      await this.logTrialEvent(userId, trial.id, 'trial_converted', {
        subscription_id: subscription.id,
        roi_metrics: roiMetrics,
      });

      // Get plan details for response
      const plan = await this.subscriptionService.getPlan(subscription.plan_id);

      return {
        success: true,
        subscription_id: subscription.id,
        plan_name: plan?.display_name || 'Professional',
        billing_amount: plan?.price || 0,
        next_billing_date: subscription.current_period_end,
        conversion_bonus: {
          extended_features: [
            'Priority support access',
            'Advanced analytics unlocked',
            '30-day money-back guarantee',
          ],
          discount_applied: 0, // Could add discount logic here
        },
      };
    } catch (error) {
      console.error('Error converting trial:', error);
      throw error;
    }
  }

  /**
   * Cancel trial
   */
  async cancelTrial(userId: string, reason?: string): Promise<void> {
    try {
      const trial = await this.getActiveTrial(userId);

      if (!trial) {
        throw new Error('No active trial found');
      }

      // Cancel the Stripe subscription
      const subscription =
        await this.subscriptionService.getUserSubscription(userId);
      if (subscription && subscription.status === 'trialing') {
        await this.subscriptionService.cancelSubscription(
          subscription.stripe_subscription_id,
          false,
        );
      }

      // Mark trial as cancelled
      await this.supabase
        .from('trial_configs')
        .update({
          status: 'cancelled',
          updated_at: new Date(),
        })
        .eq('id', trial.id);

      // Log cancellation
      await this.logTrialEvent(userId, trial.id, 'trial_cancelled', { reason });
    } catch (error) {
      console.error('Error cancelling trial:', error);
      throw error;
    }
  }

  /**
   * Initialize milestones for a new trial
   */
  private async initializeMilestones(trialId: string): Promise<void> {
    const milestones = Object.entries(MILESTONE_DEFINITIONS).map(
      ([type, definition]) => ({
        trial_id: trialId,
        milestone_type: type as MilestoneType,
        milestone_name: (definition as any).name,
        description: (definition as any).description,
        achieved: false,
        value_impact_score: (definition as any).value_impact_score,
      }),
    );

    const { error } = await this.supabase
      .from('trial_milestones')
      .insert(milestones);

    if (error) {
      throw new Error(`Failed to initialize milestones: ${error.message}`);
    }
  }

  /**
   * Calculate comprehensive trial progress
   */
  private async calculateTrialProgress(
    trialId: string,
  ): Promise<TrialProgress> {
    const { data: trial } = await this.supabase
      .from('trial_configs')
      .select('*')
      .eq('id', trialId)
      .single();

    const trialStart = new Date(trial.trial_start);
    const trialEnd = new Date(trial.trial_end);
    const now = new Date();

    const daysElapsed = differenceInDays(now, trialStart);
    const daysRemaining = Math.max(0, differenceInDays(trialEnd, now));
    const progressPercentage = Math.min(100, (daysElapsed / 30) * 100);

    // Get milestones
    const { data: milestones } = await this.supabase
      .from('trial_milestones')
      .select('*')
      .eq('trial_id', trialId)
      .order('value_impact_score', { ascending: false });

    const milestonesAchieved = milestones?.filter((m) => m.achieved) || [];
    const milestonesRemaining = milestones?.filter((m) => !m.achieved) || [];

    // Get feature usage
    const { data: featureUsage } = await this.supabase
      .from('trial_feature_usage')
      .select('*')
      .eq('trial_id', trialId)
      .order('usage_count', { ascending: false });

    // Calculate ROI
    const roiMetrics = await this.calculateROI(trialId);

    // Calculate urgency score (higher as trial nears end)
    const urgencyScore =
      daysRemaining <= 3
        ? 5
        : daysRemaining <= 7
          ? 4
          : daysRemaining <= 14
            ? 3
            : 2;

    return {
      trial_id: trialId,
      days_remaining: daysRemaining,
      days_elapsed: daysElapsed,
      progress_percentage: progressPercentage,
      milestones_achieved: milestonesAchieved,
      milestones_remaining: milestonesRemaining,
      feature_usage_summary: featureUsage || [],
      roi_metrics: roiMetrics,
      conversion_recommendation: this.generateConversionRecommendation(
        roiMetrics,
        milestonesAchieved.length,
        daysRemaining,
      ),
      urgency_score: urgencyScore,
    };
  }

  /**
   * Calculate ROI metrics for trial
   */
  private async calculateROI(trialId: string): Promise<TrialROIMetrics> {
    const { data: trial } = await this.supabase
      .from('trial_configs')
      .select('*')
      .eq('id', trialId)
      .single();

    const { data: featureUsage } = await this.supabase
      .from('trial_feature_usage')
      .select('*')
      .eq('trial_id', trialId);

    const { data: milestones } = await this.supabase
      .from('trial_milestones')
      .select('*')
      .eq('trial_id', trialId)
      .eq('achieved', true);

    const totalTimeSavedHours = (featureUsage || []).reduce(
      (total, usage) => total + usage.time_saved_minutes / 60,
      0,
    );

    const hourlyRate = trial.hourly_rate || 50; // Default $50/hour
    const estimatedCostSavings = totalTimeSavedHours * hourlyRate;

    const featuresAdoptedCount = (featureUsage || []).length;
    const milestonesAchievedCount = (milestones || []).length;

    // Calculate productivity improvement based on milestones and usage
    const productivityImprovement = Math.min(
      100,
      milestonesAchievedCount * 15 + featuresAdoptedCount * 5,
    );

    // Workflow efficiency gain based on time saved vs expected
    const expectedTimeSavings = trial.expected_time_savings_hours;
    const workflowEfficiencyGain =
      expectedTimeSavings > 0
        ? Math.min(100, (totalTimeSavedHours / expectedTimeSavings) * 100)
        : 0;

    // Project monthly savings based on current usage
    const weeksInTrial =
      differenceInDays(new Date(), new Date(trial.trial_start)) / 7;
    const weeklyTimeSaved =
      weeksInTrial > 0 ? totalTimeSavedHours / weeksInTrial : 0;
    const projectedMonthlySavings = weeklyTimeSaved * 4 * hourlyRate;

    // Calculate ROI percentage
    const trialCost = 0; // Free trial
    const monthlySubscriptionCost = 49; // Professional plan cost
    const roiPercentage =
      monthlySubscriptionCost > 0
        ? ((projectedMonthlySavings - monthlySubscriptionCost) /
            monthlySubscriptionCost) *
          100
        : 0;

    return {
      trial_id: trialId,
      total_time_saved_hours: totalTimeSavedHours,
      estimated_cost_savings: estimatedCostSavings,
      productivity_improvement_percent: productivityImprovement,
      features_adopted_count: featuresAdoptedCount,
      milestones_achieved_count: milestonesAchievedCount,
      workflow_efficiency_gain: workflowEfficiencyGain,
      projected_monthly_savings: projectedMonthlySavings,
      roi_percentage: roiPercentage,
      calculated_at: new Date(),
    };
  }

  /**
   * Generate conversion recommendation message
   */
  private generateConversionRecommendation(
    roi: TrialROIMetrics,
    milestonesAchieved: number,
    daysRemaining: number,
  ): string {
    if (roi.roi_percentage > 200) {
      return `Exceptional ROI! You're saving $${roi.projected_monthly_savings.toFixed(0)}/month. Upgrade now to lock in these savings.`;
    } else if (roi.roi_percentage > 100) {
      return `Great progress! Your ${milestonesAchieved} milestones show strong ROI. Consider upgrading to maximize benefits.`;
    } else if (daysRemaining <= 7) {
      return `Trial ending soon! You've achieved ${milestonesAchieved} milestones. Upgrade to continue your progress.`;
    } else {
      return `Keep exploring! Try reaching more milestones to see the full value of WedSync Professional.`;
    }
  }

  /**
   * Generate actionable recommendations
   */
  private async generateRecommendations(
    trial: TrialConfig,
    progress: TrialProgress,
  ) {
    const nextActions: string[] = [];
    const upgradeBenefits: string[] = [
      'Unlimited clients and vendors',
      'Advanced journey automation',
      'Priority support access',
      'Advanced analytics and reporting',
    ];

    // Next actions based on milestones
    if (progress.milestones_achieved.length === 0) {
      nextActions.push("Add your first client to see the platform's value");
    } else if (progress.milestones_achieved.length < 3) {
      nextActions.push(
        'Complete more milestones to maximize your trial benefits',
      );
    }

    if (progress.feature_usage_summary.length < 3) {
      nextActions.push('Try more features to see comprehensive time savings');
    }

    if (
      progress.roi_metrics.roi_percentage > 100 &&
      progress.days_remaining <= 7
    ) {
      nextActions.push('Upgrade now to secure your productivity gains');
    }

    let urgencyMessage: string | undefined;
    if (progress.days_remaining <= 3) {
      urgencyMessage = `Only ${progress.days_remaining} days left! Don't lose your progress.`;
    }

    return {
      next_actions: nextActions,
      upgrade_benefits: upgradeBenefits,
      urgency_message: urgencyMessage,
    };
  }

  /**
   * Expire trial automatically
   */
  private async expireTrial(trialId: string): Promise<void> {
    await this.supabase
      .from('trial_configs')
      .update({
        status: 'expired',
        updated_at: new Date(),
      })
      .eq('id', trialId);
  }

  /**
   * Log trial events for analytics
   */
  private async logTrialEvent(
    userId: string,
    trialId: string,
    eventType: string,
    eventData: any,
  ): Promise<void> {
    try {
      await this.supabase.from('trial_events').insert({
        user_id: userId,
        trial_id: trialId,
        event_type: eventType,
        event_data: eventData,
        created_at: new Date(),
      });
    } catch (error) {
      console.error('Failed to log trial event:', error);
      // Don't throw - logging shouldn't break main functionality
    }
  }
}
