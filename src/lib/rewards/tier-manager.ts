/**
 * WS-170 Viral Optimization System - Tier Manager
 * Dynamic viral reward tier configuration and management
 * Handles tier progression, rewards optimization, and performance monitoring
 */

import { createClient } from '@/lib/supabase/server';
import {
  ViralRewardTier,
  ViralRewardAnalytics,
  ViralCampaignConfig,
} from './reward-types';

export class TierManager {
  private static readonly TIER_PROGRESSION_CACHE_TTL = 300; // 5 minutes
  private static readonly PERFORMANCE_MONITORING_INTERVAL = 3600; // 1 hour
  private static readonly AUTO_OPTIMIZATION_THRESHOLD = 0.8; // 80% performance threshold

  // Default viral reward tier configurations
  private static readonly DEFAULT_VIRAL_TIERS: Record<string, ViralRewardTier> =
    {
      bronze: {
        tier: 'bronze',
        min_successful_referrals: 0,
        min_viral_coefficient: 1.0,
        min_network_depth: 1,
        signup_reward: 15.0,
        subscription_reward: 35.0,
        revenue_share_percentage: 6.0,
        milestone_bonus: 75.0,
        viral_multiplier: 1.2,
        referee_signup_reward: 10.0,
        referee_subscription_reward: 20.0,
        network_depth_bonus_per_level: 5.0,
        velocity_bonus_multiplier: 0.1,
        geographic_expansion_bonus: 25.0,
        expires_after_days: 90,
        special_perks: ['Basic viral dashboard', 'Referral tracking'],
        fraud_detection_sensitivity: 'medium',
      },
      silver: {
        tier: 'silver',
        min_successful_referrals: 5,
        min_viral_coefficient: 1.5,
        min_network_depth: 2,
        signup_reward: 25.0,
        subscription_reward: 60.0,
        revenue_share_percentage: 8.5,
        milestone_bonus: 150.0,
        viral_multiplier: 1.5,
        referee_signup_reward: 15.0,
        referee_subscription_reward: 35.0,
        network_depth_bonus_per_level: 8.0,
        velocity_bonus_multiplier: 0.15,
        geographic_expansion_bonus: 50.0,
        expires_after_days: 120,
        special_perks: [
          'Enhanced viral analytics',
          'Priority support',
          'Custom referral codes',
        ],
        fraud_detection_sensitivity: 'medium',
      },
      gold: {
        tier: 'gold',
        min_successful_referrals: 15,
        min_viral_coefficient: 2.0,
        min_network_depth: 3,
        signup_reward: 40.0,
        subscription_reward: 100.0,
        revenue_share_percentage: 12.0,
        milestone_bonus: 300.0,
        viral_multiplier: 1.8,
        referee_signup_reward: 25.0,
        referee_subscription_reward: 50.0,
        network_depth_bonus_per_level: 12.0,
        velocity_bonus_multiplier: 0.2,
        geographic_expansion_bonus: 100.0,
        expires_after_days: 150,
        special_perks: [
          'VIP support',
          'Advanced viral tools',
          'Quarterly performance bonuses',
        ],
        fraud_detection_sensitivity: 'high',
      },
      platinum: {
        tier: 'platinum',
        min_successful_referrals: 50,
        min_viral_coefficient: 3.0,
        min_network_depth: 4,
        signup_reward: 75.0,
        subscription_reward: 200.0,
        revenue_share_percentage: 18.0,
        milestone_bonus: 750.0,
        viral_multiplier: 2.2,
        referee_signup_reward: 40.0,
        referee_subscription_reward: 75.0,
        network_depth_bonus_per_level: 20.0,
        velocity_bonus_multiplier: 0.3,
        geographic_expansion_bonus: 200.0,
        expires_after_days: 180,
        special_perks: [
          'Personal account manager',
          'Custom viral campaigns',
          'Revenue sharing tier',
        ],
        fraud_detection_sensitivity: 'high',
      },
      viral_champion: {
        tier: 'viral_champion',
        min_successful_referrals: 150,
        min_viral_coefficient: 5.0,
        min_network_depth: 6,
        signup_reward: 150.0,
        subscription_reward: 400.0,
        revenue_share_percentage: 25.0,
        milestone_bonus: 1500.0,
        viral_multiplier: 2.5,
        referee_signup_reward: 75.0,
        referee_subscription_reward: 150.0,
        network_depth_bonus_per_level: 35.0,
        velocity_bonus_multiplier: 0.5,
        geographic_expansion_bonus: 500.0,
        expires_after_days: 365,
        special_perks: [
          'Viral champion badge',
          'Unlimited custom campaigns',
          'Executive partnership program',
        ],
        fraud_detection_sensitivity: 'maximum',
      },
    };

  /**
   * Get current tier configuration for a user
   */
  static async getUserTierConfig(userId: string): Promise<ViralRewardTier> {
    const supabase = createClient();

    try {
      // Check for custom tier configuration
      const customTierQuery = `
        SELECT tier_config
        FROM user_viral_tiers
        WHERE user_id = $1 AND is_active = true
      `;

      const customResult = await supabase.rpc('execute_query', {
        query_sql: customTierQuery,
        query_params: [userId],
      });

      if (customResult.data?.[0]?.tier_config) {
        return JSON.parse(customResult.data[0].tier_config);
      }

      // Get user's current tier based on performance
      const userTier = await this.calculateUserTier(userId);
      return this.getTierConfiguration(userTier);
    } catch (error) {
      console.error('Error getting user tier config:', error);
      return this.DEFAULT_VIRAL_TIERS.bronze;
    }
  }

  /**
   * Calculate user's current tier based on viral performance
   */
  static async calculateUserTier(userId: string): Promise<string> {
    const supabase = createClient();

    try {
      const metricsQuery = `
        SELECT 
          COUNT(CASE WHEN rr.status IN ('fulfilled', 'approved') THEN 1 END) as successful_referrals,
          COALESCE(vm.viral_coefficient, 1.0) as viral_coefficient,
          COALESCE(vm.network_depth, 1) as network_depth,
          COALESCE(vm.total_revenue_generated, 0) as total_revenue,
          COALESCE(vm.geographic_reach, 1) as geographic_reach
        FROM user_profiles up
        LEFT JOIN viral_metrics vm ON vm.user_id = up.id
        LEFT JOIN viral_rewards rr ON rr.referrer_id = up.id
        WHERE up.id = $1
        GROUP BY up.id, vm.viral_coefficient, vm.network_depth, vm.total_revenue_generated, vm.geographic_reach
      `;

      const result = await supabase.rpc('execute_query', {
        query_sql: metricsQuery,
        query_params: [userId],
      });

      if (result.error || !result.data?.[0]) {
        return 'bronze'; // Default tier
      }

      const metrics = result.data[0];
      return this.determineTierFromMetrics(metrics);
    } catch (error) {
      console.error('Error calculating user tier:', error);
      return 'bronze';
    }
  }

  /**
   * Update user's tier based on performance milestones
   */
  static async updateUserTier(
    userId: string,
    forceRecalculation: boolean = false,
  ): Promise<{
    previous_tier: string;
    new_tier: string;
    tier_changed: boolean;
    next_milestone?: {
      tier: string;
      requirements: string[];
      progress: number;
    };
  }> {
    const supabase = createClient();

    try {
      // Get current tier
      const currentTierQuery = `
        SELECT current_tier, last_tier_update
        FROM user_viral_profiles
        WHERE user_id = $1
      `;

      const currentResult = await supabase.rpc('execute_query', {
        query_sql: currentTierQuery,
        query_params: [userId],
      });

      const currentTier = currentResult.data?.[0]?.current_tier || 'bronze';
      const lastUpdate = currentResult.data?.[0]?.last_tier_update;

      // Skip if recently updated and not forced
      if (
        !forceRecalculation &&
        lastUpdate &&
        Date.now() - new Date(lastUpdate).getTime() < 24 * 60 * 60 * 1000
      ) {
        return {
          previous_tier: currentTier,
          new_tier: currentTier,
          tier_changed: false,
        };
      }

      // Calculate new tier
      const newTier = await this.calculateUserTier(userId);
      const tierChanged = currentTier !== newTier;

      // Update tier if changed
      if (tierChanged) {
        await this.persistTierChange(userId, currentTier, newTier);

        // Trigger tier change notifications and benefits
        await this.processTierChangeEffects(userId, currentTier, newTier);
      }

      // Calculate next milestone
      const nextMilestone = await this.calculateNextMilestone(userId, newTier);

      return {
        previous_tier: currentTier,
        new_tier: newTier,
        tier_changed: tierChanged,
        next_milestone: nextMilestone,
      };
    } catch (error) {
      console.error('Error updating user tier:', error);
      throw new Error('Failed to update user tier');
    }
  }

  /**
   * Optimize tier rewards based on performance data
   */
  static async optimizeTierRewards(campaignId?: string): Promise<{
    optimizations_applied: number;
    performance_improvement: number;
    tier_adjustments: Array<{
      tier: string;
      property: string;
      old_value: number;
      new_value: number;
      reason: string;
    }>;
  }> {
    const supabase = createClient();
    const tierAdjustments: Array<any> = [];

    try {
      // Get performance data for each tier
      const performanceQuery = `
        SELECT 
          ut.current_tier as tier,
          AVG(vm.viral_coefficient) as avg_viral_coefficient,
          AVG(vm.conversion_rate) as avg_conversion_rate,
          COUNT(DISTINCT vm.user_id) as user_count,
          SUM(vm.total_revenue_generated) as total_revenue,
          AVG(vm.network_growth_rate) as avg_network_growth,
          AVG(vm.engagement_score) as avg_engagement
        FROM user_viral_profiles ut
        JOIN viral_metrics vm ON vm.user_id = ut.user_id
        ${campaignId ? 'JOIN viral_campaigns vc ON vc.user_id = ut.user_id AND vc.campaign_id = $1' : ''}
        WHERE ut.created_at > NOW() - INTERVAL '30 days'
        GROUP BY ut.current_tier
      `;

      const params = campaignId ? [campaignId] : [];
      const result = await supabase.rpc('execute_query', {
        query_sql: performanceQuery,
        query_params: params,
      });

      if (result.error || !result.data) {
        throw new Error('Failed to get performance data');
      }

      const performanceData = result.data;

      // Analyze each tier for optimization opportunities
      for (const tierData of performanceData) {
        const tierConfig = this.getTierConfiguration(tierData.tier);
        const optimizations = await this.identifyTierOptimizations(
          tierData,
          tierConfig,
        );

        for (const optimization of optimizations) {
          tierAdjustments.push({
            tier: tierData.tier,
            property: optimization.property,
            old_value: optimization.current_value,
            new_value: optimization.suggested_value,
            reason: optimization.reason,
          });

          // Apply optimization if within safe bounds
          if (
            optimization.confidence_score > this.AUTO_OPTIMIZATION_THRESHOLD
          ) {
            await this.applyTierOptimization(tierData.tier, optimization);
          }
        }
      }

      // Calculate overall performance improvement
      const performanceImprovement =
        await this.calculatePerformanceImprovement(tierAdjustments);

      // Log optimization results
      await this.logOptimizationResults(
        tierAdjustments,
        performanceImprovement,
      );

      return {
        optimizations_applied: tierAdjustments.length,
        performance_improvement: performanceImprovement,
        tier_adjustments: tierAdjustments,
      };
    } catch (error) {
      console.error('Error optimizing tier rewards:', error);
      throw new Error('Failed to optimize tier rewards');
    }
  }

  /**
   * Create custom tier configuration for specific campaigns or users
   */
  static async createCustomTierConfig(
    baseConfig: ViralRewardTier,
    customizations: Partial<ViralRewardTier>,
    targetUsers?: string[],
    campaignId?: string,
  ): Promise<string> {
    const supabase = createClient();
    const customConfigId = crypto.randomUUID();

    try {
      // Merge base config with customizations
      const customConfig: ViralRewardTier = {
        ...baseConfig,
        ...customizations,
      };

      // Validate custom configuration
      const validationResult =
        await this.validateTierConfiguration(customConfig);
      if (!validationResult.isValid) {
        throw new Error(
          `Invalid tier configuration: ${validationResult.errors.join(', ')}`,
        );
      }

      // Store custom configuration
      const configRecord = {
        id: customConfigId,
        base_tier: baseConfig.tier,
        custom_config: JSON.stringify(customConfig),
        campaign_id: campaignId,
        target_user_ids: targetUsers,
        is_active: true,
        created_at: new Date().toISOString(),
      };

      await supabase.from('custom_tier_configs').insert(configRecord);

      // Apply to target users if specified
      if (targetUsers && targetUsers.length > 0) {
        await this.applyCustomConfigToUsers(customConfigId, targetUsers);
      }

      return customConfigId;
    } catch (error) {
      console.error('Error creating custom tier config:', error);
      throw new Error('Failed to create custom tier configuration');
    }
  }

  /**
   * Get tier progression roadmap for a user
   */
  static async getTierProgressionRoadmap(userId: string): Promise<{
    current_tier: string;
    tier_progress: Array<{
      tier: string;
      unlocked: boolean;
      requirements: Array<{
        requirement: string;
        current_value: number;
        target_value: number;
        progress_percentage: number;
        estimated_time_to_completion?: string;
      }>;
    }>;
    next_immediate_goal: {
      tier: string;
      primary_blocker: string;
      suggested_actions: string[];
    };
  }> {
    const supabase = createClient();

    try {
      // Get user's current metrics
      const userMetricsQuery = `
        SELECT 
          up.id,
          uvp.current_tier,
          COALESCE(vm.successful_referrals, 0) as successful_referrals,
          COALESCE(vm.viral_coefficient, 1.0) as viral_coefficient,
          COALESCE(vm.network_depth, 1) as network_depth,
          COALESCE(vm.total_revenue_generated, 0) as total_revenue,
          COALESCE(vm.referral_velocity, 0) as referral_velocity,
          COALESCE(vm.geographic_reach, 1) as geographic_reach
        FROM user_profiles up
        LEFT JOIN user_viral_profiles uvp ON uvp.user_id = up.id
        LEFT JOIN viral_metrics vm ON vm.user_id = up.id
        WHERE up.id = $1
      `;

      const result = await supabase.rpc('execute_query', {
        query_sql: userMetricsQuery,
        query_params: [userId],
      });

      if (result.error || !result.data?.[0]) {
        throw new Error('User metrics not found');
      }

      const userMetrics = result.data[0];
      const currentTier = userMetrics.current_tier || 'bronze';

      // Generate progression roadmap
      const tierProgression = [];
      const tierOrder = [
        'bronze',
        'silver',
        'gold',
        'platinum',
        'viral_champion',
      ];

      for (const tier of tierOrder) {
        const tierConfig = this.getTierConfiguration(tier);
        const requirements = [];

        // Check referral requirements
        requirements.push({
          requirement: 'Successful referrals',
          current_value: userMetrics.successful_referrals,
          target_value: tierConfig.min_successful_referrals,
          progress_percentage: Math.min(
            (userMetrics.successful_referrals /
              tierConfig.min_successful_referrals) *
              100,
            100,
          ),
        });

        // Check viral coefficient requirements
        requirements.push({
          requirement: 'Viral coefficient',
          current_value: userMetrics.viral_coefficient,
          target_value: tierConfig.min_viral_coefficient,
          progress_percentage: Math.min(
            (userMetrics.viral_coefficient / tierConfig.min_viral_coefficient) *
              100,
            100,
          ),
        });

        // Check network depth requirements
        requirements.push({
          requirement: 'Network depth',
          current_value: userMetrics.network_depth,
          target_value: tierConfig.min_network_depth,
          progress_percentage: Math.min(
            (userMetrics.network_depth / tierConfig.min_network_depth) * 100,
            100,
          ),
        });

        const unlocked = requirements.every(
          (req) => req.progress_percentage >= 100,
        );

        tierProgression.push({
          tier,
          unlocked,
          requirements,
        });
      }

      // Find next immediate goal
      const nextTier = tierProgression.find((tp) => !tp.unlocked);
      const nextImmediateGoal = nextTier
        ? {
            tier: nextTier.tier,
            primary_blocker:
              nextTier.requirements
                .filter((req) => req.progress_percentage < 100)
                .sort(
                  (a, b) => a.progress_percentage - b.progress_percentage,
                )[0]?.requirement || '',
            suggested_actions: await this.getSuggestedActions(
              userId,
              nextTier.tier,
              nextTier.requirements,
            ),
          }
        : {
            tier: 'viral_champion',
            primary_blocker: 'Maximum tier achieved',
            suggested_actions: [
              'Maintain performance',
              'Explore custom campaigns',
              'Mentor other users',
            ],
          };

      return {
        current_tier: currentTier,
        tier_progress: tierProgression,
        next_immediate_goal: nextImmediateGoal,
      };
    } catch (error) {
      console.error('Error getting tier progression roadmap:', error);
      throw new Error('Failed to get tier progression roadmap');
    }
  }

  // Private helper methods

  private static getTierConfiguration(tier: string): ViralRewardTier {
    return this.DEFAULT_VIRAL_TIERS[tier] || this.DEFAULT_VIRAL_TIERS.bronze;
  }

  private static determineTierFromMetrics(metrics: any): string {
    const successfulReferrals = metrics.successful_referrals || 0;
    const viralCoefficient = metrics.viral_coefficient || 1.0;
    const networkDepth = metrics.network_depth || 1;

    // Check from highest to lowest tier
    if (
      successfulReferrals >= 150 &&
      viralCoefficient >= 5.0 &&
      networkDepth >= 6
    ) {
      return 'viral_champion';
    }
    if (
      successfulReferrals >= 50 &&
      viralCoefficient >= 3.0 &&
      networkDepth >= 4
    ) {
      return 'platinum';
    }
    if (
      successfulReferrals >= 15 &&
      viralCoefficient >= 2.0 &&
      networkDepth >= 3
    ) {
      return 'gold';
    }
    if (
      successfulReferrals >= 5 &&
      viralCoefficient >= 1.5 &&
      networkDepth >= 2
    ) {
      return 'silver';
    }
    return 'bronze';
  }

  private static async persistTierChange(
    userId: string,
    oldTier: string,
    newTier: string,
  ): Promise<void> {
    const supabase = createClient();

    await Promise.all([
      // Update user tier
      supabase.rpc('execute_query', {
        query_sql: `
          INSERT INTO user_viral_profiles (user_id, current_tier, previous_tier, last_tier_update)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (user_id) 
          DO UPDATE SET current_tier = $2, previous_tier = $3, last_tier_update = NOW()
        `,
        query_params: [userId, newTier, oldTier],
      }),

      // Log tier change
      supabase.from('tier_change_history').insert({
        user_id: userId,
        from_tier: oldTier,
        to_tier: newTier,
        changed_at: new Date().toISOString(),
      }),
    ]);
  }

  private static async processTierChangeEffects(
    userId: string,
    oldTier: string,
    newTier: string,
  ): Promise<void> {
    // Implementation would handle:
    // - Unlock new perks and features
    // - Send congratulatory notifications
    // - Update user's reward multipliers
    // - Trigger any tier-specific campaigns or bonuses

    console.log(`User ${userId} tier changed from ${oldTier} to ${newTier}`);
  }

  private static async calculateNextMilestone(
    userId: string,
    currentTier: string,
  ): Promise<any> {
    const tierOrder = [
      'bronze',
      'silver',
      'gold',
      'platinum',
      'viral_champion',
    ];
    const currentIndex = tierOrder.indexOf(currentTier);

    if (currentIndex >= tierOrder.length - 1) {
      return null; // Already at highest tier
    }

    const nextTier = tierOrder[currentIndex + 1];
    const nextTierConfig = this.getTierConfiguration(nextTier);

    return {
      tier: nextTier,
      requirements: [
        `${nextTierConfig.min_successful_referrals} successful referrals`,
        `${nextTierConfig.min_viral_coefficient}x viral coefficient`,
        `${nextTierConfig.min_network_depth} network depth levels`,
      ],
      progress: 0.65, // Placeholder - would calculate actual progress
    };
  }

  private static async identifyTierOptimizations(
    tierData: any,
    tierConfig: ViralRewardTier,
  ): Promise<any[]> {
    // Implementation would analyze performance data and suggest optimizations
    return []; // Placeholder
  }

  private static async applyTierOptimization(
    tier: string,
    optimization: any,
  ): Promise<void> {
    // Implementation would apply approved optimizations
    console.log(`Applied optimization to ${tier}: ${optimization.property}`);
  }

  private static async calculatePerformanceImprovement(
    adjustments: any[],
  ): Promise<number> {
    // Implementation would calculate expected performance improvement
    return adjustments.length * 0.05; // Placeholder: 5% improvement per adjustment
  }

  private static async logOptimizationResults(
    adjustments: any[],
    improvement: number,
  ): Promise<void> {
    const supabase = createClient();

    await supabase.from('tier_optimization_logs').insert({
      optimization_date: new Date().toISOString(),
      adjustments_made: adjustments.length,
      expected_improvement: improvement,
      adjustments_details: JSON.stringify(adjustments),
    });
  }

  private static async validateTierConfiguration(
    config: ViralRewardTier,
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (config.signup_reward < 0 || config.signup_reward > 1000) {
      errors.push('Signup reward must be between 0 and 1000');
    }

    if (config.viral_multiplier < 1.0 || config.viral_multiplier > 5.0) {
      errors.push('Viral multiplier must be between 1.0 and 5.0');
    }

    if (config.expires_after_days < 30 || config.expires_after_days > 365) {
      errors.push('Expiration days must be between 30 and 365');
    }

    return { isValid: errors.length === 0, errors };
  }

  private static async applyCustomConfigToUsers(
    configId: string,
    userIds: string[],
  ): Promise<void> {
    const supabase = createClient();

    const records = userIds.map((userId) => ({
      user_id: userId,
      custom_config_id: configId,
      applied_at: new Date().toISOString(),
    }));

    await supabase.from('user_custom_tiers').insert(records);
  }

  private static async getSuggestedActions(
    userId: string,
    targetTier: string,
    requirements: any[],
  ): Promise<string[]> {
    // Implementation would analyze user's current state and suggest specific actions
    return [
      'Focus on quality referrals from engaged users',
      'Encourage referred users to become active on the platform',
      'Participate in viral challenges and campaigns',
      'Share success stories to inspire referrals',
    ];
  }
}
