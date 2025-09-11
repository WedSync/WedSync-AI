/**
 * WS-170 Viral Optimization System - Reward Engine
 * Core viral reward calculation engine with tier-based logic and double-sided incentives
 * PERFORMANCE: <100ms for calculations, <500ms for distribution
 */

import { createClient } from '@/lib/supabase/server';
import {
  ViralReward,
  ViralRewardCalculation,
  ViralRewardTier,
  DoubleIncentive,
  ViralCalculationFactors,
  RewardDistributionResult,
  PerformanceMetrics,
  RewardSystemError,
} from './reward-types';

export class ViralRewardEngine {
  private static readonly PERFORMANCE_THRESHOLD_CALC = 100; // 100ms for calculations
  private static readonly PERFORMANCE_THRESHOLD_DISTRIBUTE = 500; // 500ms for distribution
  private static readonly MAX_VIRAL_COEFFICIENT = 10.0; // Maximum viral multiplier
  private static readonly MIN_CONVERSION_QUALITY_SCORE = 0.7; // Minimum quality for rewards

  // Enhanced viral tier definitions
  private static readonly VIRAL_REWARD_TIERS: Record<string, ViralRewardTier> =
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
   * Calculate viral reward with double-sided incentives
   * Performance requirement: Under 100ms
   */
  static async calculateViralReward(
    referrerId: string,
    refereeId: string,
    referralType:
      | 'signup'
      | 'subscription'
      | 'revenue_share'
      | 'milestone'
      | 'viral_bonus',
    conversionValue?: number,
    campaignConfig?: any,
  ): Promise<DoubleIncentive> {
    const startTime = Date.now();
    const supabase = createClient();

    try {
      // Get viral metrics for both users
      const [referrerMetrics, refereeMetrics] = await Promise.all([
        this.getViralMetrics(referrerId),
        this.getViralMetrics(refereeId),
      ]);

      // Determine tiers
      const referrerTier = await this.getViralTier(referrerId, referrerMetrics);
      const refereeTier = 'bronze'; // New users start at bronze

      const referrerTierConfig = this.VIRAL_REWARD_TIERS[referrerTier];
      const refereeTierConfig = this.VIRAL_REWARD_TIERS[refereeTier];

      // Calculate viral factors
      const viralFactors = await this.calculateViralFactors(
        referrerId,
        refereeId,
        referrerMetrics,
      );

      // Calculate referrer reward (enhanced with viral bonuses)
      const referrerReward = await this.calculateReferrerViralReward(
        referralType,
        referrerTierConfig,
        viralFactors,
        conversionValue,
        campaignConfig,
      );

      // Calculate referee reward (double-sided incentive)
      const refereeReward = await this.calculateRefereeViralReward(
        referralType,
        refereeTierConfig,
        viralFactors,
        conversionValue,
        campaignConfig,
      );

      // Calculate viral multiplier based on network effects
      const viralMultiplier = this.calculateViralMultiplier(
        viralFactors,
        referrerMetrics.viral_coefficient,
        referrerMetrics.network_depth,
      );

      // Calculate network effect bonus
      const networkEffectBonus = this.calculateNetworkEffectBonus(
        referrerReward.final_amount,
        refereeReward.final_amount,
        viralFactors,
      );

      // Determine distribution method
      const distributionMethod = this.determineDistributionMethod(
        referrerReward.final_amount + refereeReward.final_amount,
        viralFactors.referral_velocity,
      );

      // Combined eligibility score
      const combinedEligibilityScore =
        (referrerMetrics.quality_score + refereeMetrics.quality_score) / 2;

      const processingTime = Date.now() - startTime;
      this.recordPerformanceMetric(
        'calculateViralReward',
        processingTime,
        this.PERFORMANCE_THRESHOLD_CALC,
      );

      if (processingTime > this.PERFORMANCE_THRESHOLD_CALC * 0.9) {
        console.warn(
          `Viral reward calculation took ${processingTime}ms - approaching ${this.PERFORMANCE_THRESHOLD_CALC}ms limit`,
        );
      }

      return {
        referrer_reward: referrerReward,
        referee_reward: refereeReward,
        total_system_cost:
          referrerReward.final_amount +
          refereeReward.final_amount +
          networkEffectBonus,
        viral_multiplier: viralMultiplier,
        network_effect_bonus: networkEffectBonus,
        combined_eligibility_score: combinedEligibilityScore,
        distribution_method: distributionMethod,
      };
    } catch (error) {
      console.error('Viral reward calculation error:', error);
      throw new Error('Failed to calculate viral reward');
    }
  }

  /**
   * Process double-sided reward distribution
   * Performance requirement: Under 500ms
   */
  static async processDoubleIncentive(
    referrerId: string,
    refereeId: string,
    doubleIncentive: DoubleIncentive,
    campaignId?: string,
  ): Promise<RewardDistributionResult> {
    const startTime = Date.now();
    const supabase = createClient();
    const distributionId = crypto.randomUUID();

    try {
      // Create reward records for both parties
      const [referrerRewardRecord, refereeRewardRecord] = await Promise.all([
        this.createViralRewardRecord(
          referrerId,
          refereeId,
          'referrer',
          doubleIncentive.referrer_reward,
          doubleIncentive,
          campaignId,
        ),
        this.createViralRewardRecord(
          refereeId,
          referrerId,
          'referee',
          doubleIncentive.referee_reward,
          doubleIncentive,
          campaignId,
        ),
      ]);

      // Process distributions based on method
      let referrerDistribution, refereeDistribution;

      if (doubleIncentive.distribution_method === 'immediate') {
        [referrerDistribution, refereeDistribution] = await Promise.all([
          this.processImmediateDistribution(
            referrerRewardRecord,
            doubleIncentive.referrer_reward,
          ),
          this.processImmediateDistribution(
            refereeRewardRecord,
            doubleIncentive.referee_reward,
          ),
        ]);
      } else {
        // Handle milestone-based or staggered distribution
        referrerDistribution = await this.processMilestoneDistribution(
          referrerRewardRecord,
          doubleIncentive.referrer_reward,
        );
        refereeDistribution = await this.processMilestoneDistribution(
          refereeRewardRecord,
          doubleIncentive.referee_reward,
        );
      }

      // Update viral metrics for the referrer
      await this.updateViralMetrics(referrerId, {
        referral_count: 1,
        network_expansion: 1,
        total_reward_facilitated: doubleIncentive.referrer_reward.final_amount,
      });

      const processingTime = Date.now() - startTime;
      this.recordPerformanceMetric(
        'processDoubleIncentive',
        processingTime,
        this.PERFORMANCE_THRESHOLD_DISTRIBUTE,
      );

      if (processingTime > this.PERFORMANCE_THRESHOLD_DISTRIBUTE * 0.9) {
        console.warn(
          `Double incentive processing took ${processingTime}ms - approaching ${this.PERFORMANCE_THRESHOLD_DISTRIBUTE}ms limit`,
        );
      }

      return {
        distribution_id: distributionId,
        referrer_distribution: referrerDistribution,
        referee_distribution: refereeDistribution,
        total_distributed: doubleIncentive.total_system_cost,
        distribution_timestamp: new Date(),
        processing_time_ms: processingTime,
      };
    } catch (error) {
      console.error('Double incentive processing error:', error);
      throw new Error('Failed to process double incentive distribution');
    }
  }

  /**
   * Calculate viral coefficient for user's referral network
   * Viral coefficient = (Number of referrals made by referees) / (Total referees)
   */
  static async calculateViralCoefficient(userId: string): Promise<number> {
    const supabase = createClient();

    try {
      const query = `
        WITH user_referrals AS (
          SELECT referee_id 
          FROM referral_conversions 
          WHERE referrer_id = $1 
            AND status = 'completed'
            AND created_at > NOW() - INTERVAL '1 year'
        ),
        referee_referrals AS (
          SELECT COUNT(*) as referral_count
          FROM referral_conversions rc
          WHERE rc.referrer_id IN (SELECT referee_id FROM user_referrals)
            AND rc.status = 'completed'
            AND rc.created_at > NOW() - INTERVAL '1 year'
        )
        SELECT 
          (SELECT COUNT(*) FROM user_referrals) as direct_referrals,
          COALESCE((SELECT SUM(referral_count) FROM referee_referrals), 0) as indirect_referrals,
          CASE 
            WHEN (SELECT COUNT(*) FROM user_referrals) = 0 THEN 0
            ELSE COALESCE((SELECT SUM(referral_count) FROM referee_referrals), 0)::FLOAT / 
                 (SELECT COUNT(*) FROM user_referrals)::FLOAT
          END as viral_coefficient
      `;

      const result = await supabase.rpc('execute_analytics_query', {
        query_sql: query,
        query_params: [userId],
      });

      if (result.error) {
        console.error('Viral coefficient calculation error:', result.error);
        return 1.0; // Default coefficient
      }

      const metrics = result.data?.[0];
      const coefficient = metrics?.viral_coefficient || 1.0;

      // Cap at maximum to prevent abuse
      return Math.min(coefficient, this.MAX_VIRAL_COEFFICIENT);
    } catch (error) {
      console.error('Viral coefficient calculation error:', error);
      return 1.0;
    }
  }

  // Private helper methods

  private static async getViralMetrics(userId: string): Promise<any> {
    const supabase = createClient();

    const query = `
      SELECT 
        u.id,
        COALESCE(vm.viral_coefficient, 1.0) as viral_coefficient,
        COALESCE(vm.network_depth, 1) as network_depth,
        COALESCE(vm.total_referrals, 0) as total_referrals,
        COALESCE(vm.successful_conversions, 0) as successful_conversions,
        COALESCE(vm.quality_score, 0.8) as quality_score,
        COALESCE(vm.last_activity, NOW() - INTERVAL '30 days') as last_activity
      FROM user_profiles u
      LEFT JOIN viral_metrics vm ON vm.user_id = u.id
      WHERE u.id = $1
    `;

    const result = await supabase.rpc('execute_query', {
      query_sql: query,
      query_params: [userId],
    });

    return (
      result.data?.[0] || {
        viral_coefficient: 1.0,
        network_depth: 1,
        total_referrals: 0,
        successful_conversions: 0,
        quality_score: 0.8,
      }
    );
  }

  private static async getViralTier(
    userId: string,
    metrics: any,
  ): Promise<string> {
    const viralCoeff = metrics.viral_coefficient || 1.0;
    const networkDepth = metrics.network_depth || 1;
    const successfulReferrals = metrics.successful_conversions || 0;

    // Determine tier based on viral metrics
    if (successfulReferrals >= 150 && viralCoeff >= 5.0 && networkDepth >= 6)
      return 'viral_champion';
    if (successfulReferrals >= 50 && viralCoeff >= 3.0 && networkDepth >= 4)
      return 'platinum';
    if (successfulReferrals >= 15 && viralCoeff >= 2.0 && networkDepth >= 3)
      return 'gold';
    if (successfulReferrals >= 5 && viralCoeff >= 1.5 && networkDepth >= 2)
      return 'silver';
    return 'bronze';
  }

  private static async calculateViralFactors(
    referrerId: string,
    refereeId: string,
    referrerMetrics: any,
  ): Promise<ViralCalculationFactors> {
    // Calculate referral velocity (referrals per day in last 30 days)
    const referralVelocity = Math.min(
      referrerMetrics.total_referrals / 30,
      5.0,
    );

    // Network penetration based on geographic/demographic spread
    const networkPenetration = Math.min(
      referrerMetrics.network_depth / 10,
      1.0,
    );

    // Geographic spread coefficient (simplified - could be enhanced with actual geo data)
    const geographicSpreadCoefficient =
      Math.min(referrerMetrics.geographic_regions || 1, 5) / 5;

    return {
      referral_velocity: referralVelocity,
      network_penetration: networkPenetration,
      geographic_spread_coefficient: geographicSpreadCoefficient,
      demographic_diversity_score: 0.8, // Placeholder - could be calculated from user data
      retention_impact_score: 0.9, // Placeholder - could track referee retention
      revenue_attribution_percentage: 0.15, // Percentage of referee revenue attributed to referrer
    };
  }

  private static async calculateReferrerViralReward(
    referralType: string,
    tierConfig: ViralRewardTier,
    viralFactors: ViralCalculationFactors,
    conversionValue?: number,
    campaignConfig?: any,
  ): Promise<ViralRewardCalculation> {
    let baseAmount = 0;
    const calculationFactors: string[] = [];

    // Base reward calculation
    switch (referralType) {
      case 'signup':
        baseAmount = tierConfig.signup_reward;
        calculationFactors.push(
          `${tierConfig.tier.toUpperCase()} signup reward: $${baseAmount}`,
        );
        break;
      case 'subscription':
        baseAmount = tierConfig.subscription_reward;
        calculationFactors.push(
          `${tierConfig.tier.toUpperCase()} subscription reward: $${baseAmount}`,
        );
        break;
      case 'revenue_share':
        if (conversionValue) {
          baseAmount =
            (conversionValue * tierConfig.revenue_share_percentage) / 100;
          calculationFactors.push(
            `Revenue share: ${tierConfig.revenue_share_percentage}% of $${conversionValue}`,
          );
        }
        break;
      case 'milestone':
        baseAmount = tierConfig.milestone_bonus;
        calculationFactors.push(`Milestone bonus: $${baseAmount}`);
        break;
    }

    // Viral bonuses
    const viralCoefficientBonus =
      baseAmount * (viralFactors.referral_velocity * 0.1);
    const velocityBonus =
      baseAmount *
      (viralFactors.referral_velocity * tierConfig.velocity_bonus_multiplier);
    const networkDepthBonus =
      tierConfig.network_depth_bonus_per_level *
      viralFactors.network_penetration *
      10;
    const geographicBonus =
      viralFactors.geographic_spread_coefficient > 0.5
        ? tierConfig.geographic_expansion_bonus
        : 0;

    calculationFactors.push(
      `Viral coefficient bonus: $${viralCoefficientBonus.toFixed(2)}`,
    );
    calculationFactors.push(`Velocity bonus: $${velocityBonus.toFixed(2)}`);
    calculationFactors.push(
      `Network depth bonus: $${networkDepthBonus.toFixed(2)}`,
    );
    if (geographicBonus > 0) {
      calculationFactors.push(
        `Geographic expansion bonus: $${geographicBonus}`,
      );
    }

    const specialBonuses =
      viralCoefficientBonus +
      velocityBonus +
      networkDepthBonus +
      geographicBonus;
    const finalAmount =
      baseAmount * tierConfig.viral_multiplier + specialBonuses;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + tierConfig.expires_after_days);

    return {
      base_amount: baseAmount,
      tier_multiplier: tierConfig.viral_multiplier,
      viral_coefficient_bonus: viralCoefficientBonus,
      velocity_bonus: velocityBonus,
      network_depth_bonus: networkDepthBonus,
      geographic_bonus: geographicBonus,
      special_bonuses: specialBonuses,
      final_amount: finalAmount,
      currency:
        finalAmount >= 100
          ? 'USD'
          : tierConfig.tier === 'bronze'
            ? 'credits'
            : 'USD',
      expires_at: expiresAt,
      calculation_factors: calculationFactors,
      viral_factors: viralFactors,
    };
  }

  private static async calculateRefereeViralReward(
    referralType: string,
    tierConfig: ViralRewardTier,
    viralFactors: ViralCalculationFactors,
    conversionValue?: number,
    campaignConfig?: any,
  ): Promise<ViralRewardCalculation> {
    let baseAmount = 0;
    const calculationFactors: string[] = [];

    // Base referee rewards (typically smaller than referrer rewards)
    switch (referralType) {
      case 'signup':
        baseAmount = tierConfig.referee_signup_reward;
        calculationFactors.push(`Welcome signup bonus: $${baseAmount}`);
        break;
      case 'subscription':
        baseAmount = tierConfig.referee_subscription_reward;
        calculationFactors.push(`Subscription welcome bonus: $${baseAmount}`);
        break;
      case 'revenue_share':
        // Referees don't typically get revenue share, but could get a small bonus
        baseAmount = conversionValue ? Math.min(conversionValue * 0.02, 25) : 0;
        if (baseAmount > 0) {
          calculationFactors.push(`New user revenue bonus: $${baseAmount}`);
        }
        break;
      case 'milestone':
        baseAmount = tierConfig.milestone_bonus * 0.3; // 30% of referrer milestone bonus
        calculationFactors.push(
          `Milestone participation bonus: $${baseAmount}`,
        );
        break;
    }

    // Referee bonuses are typically simpler
    const networkBonus = viralFactors.network_penetration * 5; // Small network bonus
    const specialBonuses = networkBonus;

    if (networkBonus > 0) {
      calculationFactors.push(
        `Network participation bonus: $${networkBonus.toFixed(2)}`,
      );
    }

    const finalAmount = baseAmount + specialBonuses;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90); // Shorter expiration for referee rewards

    return {
      base_amount: baseAmount,
      tier_multiplier: 1.0,
      viral_coefficient_bonus: 0,
      velocity_bonus: 0,
      network_depth_bonus: networkBonus,
      geographic_bonus: 0,
      special_bonuses: specialBonuses,
      final_amount: finalAmount,
      currency: finalAmount >= 50 ? 'USD' : 'credits',
      expires_at: expiresAt,
      calculation_factors: calculationFactors,
      viral_factors: viralFactors,
    };
  }

  private static calculateViralMultiplier(
    viralFactors: ViralCalculationFactors,
    viralCoefficient: number,
    networkDepth: number,
  ): number {
    // Base multiplier starts at 1.0
    let multiplier = 1.0;

    // Add bonus for viral coefficient
    multiplier += Math.min(viralCoefficient - 1.0, 2.0) * 0.1;

    // Add bonus for network depth
    multiplier += Math.min(networkDepth - 1, 5) * 0.05;

    // Add bonus for velocity
    multiplier += viralFactors.referral_velocity * 0.02;

    // Cap the multiplier
    return Math.min(multiplier, 2.5);
  }

  private static calculateNetworkEffectBonus(
    referrerReward: number,
    refereeReward: number,
    viralFactors: ViralCalculationFactors,
  ): number {
    const totalReward = referrerReward + refereeReward;
    const networkEffectFactor =
      viralFactors.network_penetration * viralFactors.referral_velocity;
    return totalReward * networkEffectFactor * 0.05; // 5% bonus based on network effects
  }

  private static determineDistributionMethod(
    totalAmount: number,
    velocity: number,
  ): 'immediate' | 'milestone_based' | 'staggered' {
    if (totalAmount > 500) return 'milestone_based';
    if (velocity > 3) return 'staggered'; // High velocity requires staggered to prevent fraud
    return 'immediate';
  }

  private static async createViralRewardRecord(
    userId: string,
    relatedUserId: string,
    rewardType: 'referrer' | 'referee',
    calculation: ViralRewardCalculation,
    doubleIncentive: DoubleIncentive,
    campaignId?: string,
  ): Promise<any> {
    const supabase = createClient();

    const record = {
      id: crypto.randomUUID(),
      [rewardType === 'referrer' ? 'referrer_id' : 'user_id']: userId,
      [rewardType === 'referrer' ? 'referee_id' : 'referrer_id']: relatedUserId,
      reward_type: rewardType,
      amount: calculation.final_amount,
      currency: calculation.currency,
      viral_coefficient: doubleIncentive.viral_multiplier,
      network_effect_bonus: doubleIncentive.network_effect_bonus,
      campaign_id: campaignId,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    const result = await supabase
      .from('viral_rewards')
      .insert(record)
      .select()
      .single();
    return result.data;
  }

  private static async processImmediateDistribution(
    rewardRecord: any,
    calculation: ViralRewardCalculation,
  ): Promise<any> {
    // Implementation for immediate distribution
    return {
      reward_id: rewardRecord.id,
      amount: calculation.final_amount,
      currency: calculation.currency,
      method: 'account_credit',
      status: 'completed',
      transaction_id: crypto.randomUUID(),
    };
  }

  private static async processMilestoneDistribution(
    rewardRecord: any,
    calculation: ViralRewardCalculation,
  ): Promise<any> {
    // Implementation for milestone-based distribution
    return {
      reward_id: rewardRecord.id,
      amount: calculation.final_amount,
      currency: calculation.currency,
      method: 'milestone_based',
      status: 'pending',
      transaction_id: crypto.randomUUID(),
    };
  }

  private static async updateViralMetrics(
    userId: string,
    updates: any,
  ): Promise<void> {
    const supabase = createClient();

    await supabase.rpc('update_viral_metrics', {
      user_id: userId,
      metric_updates: updates,
    });
  }

  private static recordPerformanceMetric(
    operation: string,
    executionTime: number,
    threshold: number,
  ): void {
    const metric: PerformanceMetrics = {
      operation,
      execution_time_ms: executionTime,
      threshold_ms: threshold,
      performance_grade:
        executionTime < threshold * 0.5
          ? 'excellent'
          : executionTime < threshold * 0.8
            ? 'good'
            : executionTime < threshold
              ? 'warning'
              : 'critical',
      timestamp: new Date(),
    };

    // Log performance metric (could be sent to monitoring system)
    console.log('Performance metric:', metric);
  }
}
