/**
 * Referral Reward Service - WS-141 Round 2
 * Comprehensive referral rewards with tier-based calculations and fulfillment
 * PERFORMANCE: Reward calculations under 100ms, fulfillment under 500ms
 */

import { supabase } from '@/lib/supabase/client';

// Types for referral reward system
export interface ReferralReward {
  id: string;
  referrer_id: string;
  referee_id: string;
  referral_type: 'signup' | 'subscription' | 'revenue_share' | 'milestone';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  base_reward_amount: number;
  multiplier: number;
  final_reward_amount: number;
  reward_currency: 'USD' | 'credits' | 'features';
  status: 'pending' | 'approved' | 'fulfilled' | 'expired' | 'revoked';
  expires_at: Date;
  earned_at: Date;
  fulfilled_at?: Date;
  metadata: Record<string, any>;
}

export interface RewardTier {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  min_successful_referrals: number;
  signup_reward: number;
  subscription_reward: number;
  revenue_share_percentage: number;
  milestone_bonus: number;
  multiplier: number;
  expires_after_days: number;
  special_perks: string[];
}

export interface RewardCalculation {
  base_amount: number;
  tier_multiplier: number;
  special_bonuses: number;
  final_amount: number;
  currency: 'USD' | 'credits' | 'features';
  expires_at: Date;
  calculation_factors: string[];
}

export interface RewardFulfillment {
  reward_id: string;
  fulfillment_method:
    | 'account_credit'
    | 'cash_payout'
    | 'feature_unlock'
    | 'discount_code';
  amount: number;
  currency: string;
  transaction_id?: string;
  fulfilled_at: Date;
  receipt_url?: string;
  notes?: string;
}

export class ReferralRewardService {
  private static readonly PERFORMANCE_THRESHOLD_CALC = 100; // 100ms for calculations
  private static readonly PERFORMANCE_THRESHOLD_FULFILL = 500; // 500ms for fulfillment

  // Tier definitions with escalating rewards
  private static readonly REWARD_TIERS: Record<string, RewardTier> = {
    bronze: {
      tier: 'bronze',
      min_successful_referrals: 0,
      signup_reward: 10.0,
      subscription_reward: 25.0,
      revenue_share_percentage: 5.0,
      milestone_bonus: 50.0,
      multiplier: 1.0,
      expires_after_days: 90,
      special_perks: ['Basic dashboard access'],
    },
    silver: {
      tier: 'silver',
      min_successful_referrals: 5,
      signup_reward: 15.0,
      subscription_reward: 40.0,
      revenue_share_percentage: 7.5,
      milestone_bonus: 100.0,
      multiplier: 1.25,
      expires_after_days: 120,
      special_perks: ['Priority support', 'Extended trial periods'],
    },
    gold: {
      tier: 'gold',
      min_successful_referrals: 15,
      signup_reward: 25.0,
      subscription_reward: 75.0,
      revenue_share_percentage: 10.0,
      milestone_bonus: 200.0,
      multiplier: 1.5,
      expires_after_days: 150,
      special_perks: [
        'VIP support',
        'Custom features',
        'Quarterly bonus reviews',
      ],
    },
    platinum: {
      tier: 'platinum',
      min_successful_referrals: 50,
      signup_reward: 50.0,
      subscription_reward: 150.0,
      revenue_share_percentage: 15.0,
      milestone_bonus: 500.0,
      multiplier: 2.0,
      expires_after_days: 180,
      special_perks: [
        'Personal account manager',
        'Custom integrations',
        'Revenue sharing program',
      ],
    },
  };

  /**
   * Calculate referral reward for a successful conversion
   * Performance requirement: Under 100ms
   */
  static async calculateReferralReward(
    referrerId: string,
    refereeId: string,
    referralType: 'signup' | 'subscription' | 'revenue_share' | 'milestone',
    conversionValue?: number,
  ): Promise<RewardCalculation> {
    const startTime = Date.now();

    try {
      // Get referrer's current tier
      const referrerTier = await this.getReferrerTier(referrerId);
      const tierConfig = this.REWARD_TIERS[referrerTier];

      // Calculate base reward amount
      let baseAmount = 0;
      const calculationFactors: string[] = [];

      switch (referralType) {
        case 'signup':
          baseAmount = tierConfig.signup_reward;
          calculationFactors.push(`Base signup reward: $${baseAmount}`);
          break;

        case 'subscription':
          baseAmount = tierConfig.subscription_reward;
          calculationFactors.push(`Base subscription reward: $${baseAmount}`);
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

      // Apply tier multiplier
      const tierMultiplier = tierConfig.multiplier;
      calculationFactors.push(
        `${referrerTier.toUpperCase()} tier multiplier: ${tierMultiplier}x`,
      );

      // Check for special bonuses
      let specialBonuses = 0;
      const bonuses = await this.calculateSpecialBonuses(
        referrerId,
        referralType,
      );
      specialBonuses = bonuses.reduce((sum, bonus) => sum + bonus.amount, 0);

      if (specialBonuses > 0) {
        calculationFactors.push(`Special bonuses: $${specialBonuses}`);
        calculationFactors.push(
          ...bonuses.map((b) => `  - ${b.description}: $${b.amount}`),
        );
      }

      // Calculate final amount
      const finalAmount = baseAmount * tierMultiplier + specialBonuses;

      // Set expiration date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + tierConfig.expires_after_days);

      // Determine currency based on amount and tier
      const currency = this.determineCurrency(finalAmount, referrerTier);

      const processingTime = Date.now() - startTime;
      if (processingTime > this.PERFORMANCE_THRESHOLD_CALC * 0.9) {
        console.warn(
          `Reward calculation took ${processingTime}ms - approaching ${this.PERFORMANCE_THRESHOLD_CALC}ms limit`,
        );
      }

      return {
        base_amount: baseAmount,
        tier_multiplier: tierMultiplier,
        special_bonuses: specialBonuses,
        final_amount: finalAmount,
        currency: currency,
        expires_at: expiresAt,
        calculation_factors: calculationFactors,
      };
    } catch (error) {
      console.error('Reward calculation error:', error);
      throw new Error('Failed to calculate referral reward');
    }
  }

  /**
   * Get referrer's current tier based on performance
   * Performance requirement: Under 50ms (cached)
   */
  static async getReferrerTier(
    referrerId: string,
  ): Promise<'bronze' | 'silver' | 'gold' | 'platinum'> {
    try {
      // Query referrer's performance metrics
      const query = `
        SELECT 
          COUNT(CASE WHEN rr.status IN ('fulfilled', 'approved') THEN 1 END) as successful_referrals,
          SUM(CASE WHEN rr.status IN ('fulfilled', 'approved') THEN rr.final_reward_amount ELSE 0 END) as total_rewards_earned,
          MAX(rr.earned_at) as last_referral_date
        FROM referral_rewards rr
        WHERE rr.referrer_id = $1
          AND rr.earned_at > NOW() - INTERVAL '1 year'
      `;

      const result = await supabase.rpc('execute_analytics_query', {
        query_sql: query,
        query_params: [referrerId],
      });

      if (result.error) {
        console.error('Tier calculation query error:', result.error);
        return 'bronze'; // Default to bronze on error
      }

      const metrics = result.data?.[0];
      if (!metrics) return 'bronze';

      const successfulReferrals = metrics.successful_referrals || 0;

      // Determine tier based on successful referrals
      if (successfulReferrals >= 50) return 'platinum';
      if (successfulReferrals >= 15) return 'gold';
      if (successfulReferrals >= 5) return 'silver';
      return 'bronze';
    } catch (error) {
      console.error('Tier calculation error:', error);
      return 'bronze';
    }
  }

  /**
   * Calculate special bonuses for referral
   */
  private static async calculateSpecialBonuses(
    referrerId: string,
    referralType: string,
  ): Promise<Array<{ description: string; amount: number }>> {
    const bonuses: Array<{ description: string; amount: number }> = [];

    try {
      // First referral bonus
      const isFirstReferral = await this.checkFirstReferral(referrerId);
      if (isFirstReferral) {
        bonuses.push({ description: 'First referral bonus', amount: 20.0 });
      }

      // Streak bonus (3+ referrals in 30 days)
      const hasStreak = await this.checkReferralStreak(referrerId);
      if (hasStreak) {
        bonuses.push({
          description: 'Hot streak bonus (3+ in 30 days)',
          amount: 15.0,
        });
      }

      // High-value referral bonus (subscription > $100/month)
      if (referralType === 'subscription') {
        const isHighValue = await this.checkHighValueReferral(referrerId);
        if (isHighValue) {
          bonuses.push({
            description: 'High-value referral bonus',
            amount: 25.0,
          });
        }
      }

      // Geographic expansion bonus (new region)
      const isNewRegion = await this.checkGeographicExpansion(referrerId);
      if (isNewRegion) {
        bonuses.push({
          description: 'Geographic expansion bonus',
          amount: 30.0,
        });
      }

      return bonuses;
    } catch (error) {
      console.error('Special bonus calculation error:', error);
      return bonuses;
    }
  }

  /**
   * Create and store referral reward record
   * Performance requirement: Under 200ms
   */
  static async createReferralReward(
    referrerId: string,
    refereeId: string,
    referralType: 'signup' | 'subscription' | 'revenue_share' | 'milestone',
    calculation: RewardCalculation,
    metadata: Record<string, any> = {},
  ): Promise<ReferralReward> {
    const startTime = Date.now();

    try {
      const referrerTier = await this.getReferrerTier(referrerId);

      // Insert reward record
      const insertQuery = `
        INSERT INTO referral_rewards (
          id, referrer_id, referee_id, referral_type, tier,
          base_reward_amount, multiplier, final_reward_amount, reward_currency,
          status, expires_at, earned_at, metadata
        )
        VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, NOW(), $10
        )
        RETURNING *
      `;

      const result = await supabase.rpc('execute_query', {
        query_sql: insertQuery,
        query_params: [
          referrerId,
          refereeId,
          referralType,
          referrerTier,
          calculation.base_amount,
          calculation.tier_multiplier,
          calculation.final_amount,
          calculation.currency,
          calculation.expires_at.toISOString(),
          JSON.stringify({
            ...metadata,
            calculation_factors: calculation.calculation_factors,
            calculated_at: new Date().toISOString(),
          }),
        ],
      });

      if (result.error || !result.data?.[0]) {
        throw new Error(
          `Failed to create referral reward: ${result.error?.message}`,
        );
      }

      const reward = result.data[0];

      // Trigger async reward processing workflow
      this.processRewardApproval(reward.id).catch((error) =>
        console.error('Reward approval processing failed:', error),
      );

      const processingTime = Date.now() - startTime;
      if (processingTime > 200) {
        console.warn(
          `Reward creation took ${processingTime}ms - may need optimization`,
        );
      }

      return this.mapDatabaseToReward(reward);
    } catch (error) {
      console.error('Create referral reward error:', error);
      throw new Error('Failed to create referral reward');
    }
  }

  /**
   * Process reward fulfillment
   * Performance requirement: Under 500ms
   */
  static async fulfillReward(
    rewardId: string,
    fulfillmentMethod:
      | 'account_credit'
      | 'cash_payout'
      | 'feature_unlock'
      | 'discount_code',
    notes?: string,
  ): Promise<RewardFulfillment> {
    const startTime = Date.now();

    try {
      // Get reward details
      const rewardQuery = `
        SELECT * FROM referral_rewards 
        WHERE id = $1 AND status = 'approved'
      `;

      const rewardResult = await supabase.rpc('execute_query', {
        query_sql: rewardQuery,
        query_params: [rewardId],
      });

      if (rewardResult.error || !rewardResult.data?.[0]) {
        throw new Error('Reward not found or not approved for fulfillment');
      }

      const reward = rewardResult.data[0];

      // Check expiration
      if (new Date(reward.expires_at) < new Date()) {
        await this.expireReward(rewardId);
        throw new Error('Reward has expired and cannot be fulfilled');
      }

      // Process fulfillment based on method
      let transactionId: string | undefined;
      let receiptUrl: string | undefined;

      switch (fulfillmentMethod) {
        case 'account_credit':
          transactionId = await this.processAccountCredit(
            reward.referrer_id,
            reward.final_reward_amount,
            reward.reward_currency,
          );
          break;

        case 'cash_payout':
          const payoutResult = await this.processCashPayout(
            reward.referrer_id,
            reward.final_reward_amount,
          );
          transactionId = payoutResult.transactionId;
          receiptUrl = payoutResult.receiptUrl;
          break;

        case 'feature_unlock':
          transactionId = await this.processFeatureUnlock(
            reward.referrer_id,
            reward.final_reward_amount,
            reward.metadata,
          );
          break;

        case 'discount_code':
          const codeResult = await this.generateDiscountCode(
            reward.referrer_id,
            reward.final_reward_amount,
          );
          transactionId = codeResult.code;
          receiptUrl = codeResult.redemptionUrl;
          break;
      }

      // Create fulfillment record
      const fulfillmentId = crypto.randomUUID();
      const fulfillmentQuery = `
        INSERT INTO referral_reward_fulfillments (
          id, reward_id, fulfillment_method, amount, currency,
          transaction_id, receipt_url, notes, fulfilled_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING *
      `;

      const fulfillmentResult = await supabase.rpc('execute_query', {
        query_sql: fulfillmentQuery,
        query_params: [
          fulfillmentId,
          rewardId,
          fulfillmentMethod,
          reward.final_reward_amount,
          reward.reward_currency,
          transactionId,
          receiptUrl,
          notes,
        ],
      });

      if (fulfillmentResult.error) {
        throw new Error(
          `Failed to record fulfillment: ${fulfillmentResult.error.message}`,
        );
      }

      // Update reward status
      await supabase.rpc('execute_query', {
        query_sql: `
          UPDATE referral_rewards 
          SET status = 'fulfilled', fulfilled_at = NOW(), updated_at = NOW()
          WHERE id = $1
        `,
        query_params: [rewardId],
      });

      const processingTime = Date.now() - startTime;
      if (processingTime > this.PERFORMANCE_THRESHOLD_FULFILL * 0.9) {
        console.warn(
          `Reward fulfillment took ${processingTime}ms - approaching ${this.PERFORMANCE_THRESHOLD_FULFILL}ms limit`,
        );
      }

      const fulfillment = fulfillmentResult.data[0];

      return {
        reward_id: rewardId,
        fulfillment_method: fulfillmentMethod,
        amount: fulfillment.amount,
        currency: fulfillment.currency,
        transaction_id: transactionId,
        fulfilled_at: new Date(fulfillment.fulfilled_at),
        receipt_url: receiptUrl,
        notes: notes,
      };
    } catch (error) {
      console.error('Reward fulfillment error:', error);
      throw new Error('Failed to fulfill referral reward');
    }
  }

  /**
   * Handle reward expiration management
   * Called by scheduled job to expire old rewards
   */
  static async processExpiredRewards(): Promise<{
    expired_count: number;
    total_value: number;
  }> {
    try {
      const expiredQuery = `
        UPDATE referral_rewards 
        SET status = 'expired', updated_at = NOW()
        WHERE status = 'pending' 
          AND expires_at < NOW()
        RETURNING id, final_reward_amount
      `;

      const result = await supabase.rpc('execute_query', {
        query_sql: expiredQuery,
      });

      if (result.error) {
        throw new Error(
          `Failed to process expired rewards: ${result.error.message}`,
        );
      }

      const expiredRewards = result.data || [];
      const totalValue = expiredRewards.reduce(
        (sum: number, r: any) => sum + (r.final_reward_amount || 0),
        0,
      );

      // Log expiration for analytics
      if (expiredRewards.length > 0) {
        console.log(
          `Expired ${expiredRewards.length} referral rewards totaling $${totalValue}`,
        );
      }

      return {
        expired_count: expiredRewards.length,
        total_value: totalValue,
      };
    } catch (error) {
      console.error('Process expired rewards error:', error);
      throw new Error('Failed to process expired rewards');
    }
  }

  /**
   * Get referral reward analytics for a user
   */
  static async getReferralAnalytics(
    userId: string,
    timeframe: string = '90 days',
  ): Promise<{
    total_rewards_earned: number;
    total_rewards_pending: number;
    total_referrals: number;
    current_tier: string;
    next_tier_requirements: string | null;
    recent_rewards: ReferralReward[];
  }> {
    try {
      // Get analytics query
      const analyticsQuery = `
        SELECT 
          COUNT(*) as total_referrals,
          COUNT(CASE WHEN status = 'fulfilled' THEN 1 END) as fulfilled_referrals,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_referrals,
          SUM(CASE WHEN status = 'fulfilled' THEN final_reward_amount ELSE 0 END) as total_earned,
          SUM(CASE WHEN status = 'pending' THEN final_reward_amount ELSE 0 END) as total_pending,
          AVG(final_reward_amount) as avg_reward_amount
        FROM referral_rewards
        WHERE referrer_id = $1 
          AND earned_at > NOW() - INTERVAL '${timeframe}'
      `;

      const analyticsResult = await supabase.rpc('execute_analytics_query', {
        query_sql: analyticsQuery,
        query_params: [userId],
      });

      if (analyticsResult.error) {
        throw new Error(
          `Analytics query failed: ${analyticsResult.error.message}`,
        );
      }

      const analytics = analyticsResult.data?.[0] || {};
      const currentTier = await this.getReferrerTier(userId);

      // Determine next tier requirements
      let nextTierRequirements: string | null = null;
      const currentTierConfig = this.REWARD_TIERS[currentTier];
      const currentReferrals = analytics.fulfilled_referrals || 0;

      if (currentTier === 'bronze' && currentReferrals < 5) {
        nextTierRequirements = `${5 - currentReferrals} more successful referrals for Silver tier`;
      } else if (currentTier === 'silver' && currentReferrals < 15) {
        nextTierRequirements = `${15 - currentReferrals} more successful referrals for Gold tier`;
      } else if (currentTier === 'gold' && currentReferrals < 50) {
        nextTierRequirements = `${50 - currentReferrals} more successful referrals for Platinum tier`;
      }

      // Get recent rewards
      const recentRewardsQuery = `
        SELECT * FROM referral_rewards
        WHERE referrer_id = $1
        ORDER BY earned_at DESC
        LIMIT 10
      `;

      const recentResult = await supabase.rpc('execute_query', {
        query_sql: recentRewardsQuery,
        query_params: [userId],
      });

      const recentRewards = (recentResult.data || []).map(
        this.mapDatabaseToReward,
      );

      return {
        total_rewards_earned: analytics.total_earned || 0,
        total_rewards_pending: analytics.total_pending || 0,
        total_referrals: analytics.total_referrals || 0,
        current_tier: currentTier,
        next_tier_requirements: nextTierRequirements,
        recent_rewards: recentRewards,
      };
    } catch (error) {
      console.error('Referral analytics error:', error);
      throw new Error('Failed to get referral analytics');
    }
  }

  // Private helper methods

  private static async expireReward(rewardId: string): Promise<void> {
    await supabase.rpc('execute_query', {
      query_sql: `UPDATE referral_rewards SET status = 'expired', updated_at = NOW() WHERE id = $1`,
      query_params: [rewardId],
    });
  }

  private static determineCurrency(
    amount: number,
    tier: string,
  ): 'USD' | 'credits' | 'features' {
    if (amount >= 100) return 'USD';
    if (tier === 'bronze') return 'credits';
    return 'USD';
  }

  private static async processRewardApproval(rewardId: string): Promise<void> {
    // Auto-approve rewards under $50, queue others for manual review
    const reward = await supabase
      .from('referral_rewards')
      .select('*')
      .eq('id', rewardId)
      .single();

    if (reward.data?.final_reward_amount < 50) {
      await supabase.rpc('execute_query', {
        query_sql: `UPDATE referral_rewards SET status = 'approved', updated_at = NOW() WHERE id = $1`,
        query_params: [rewardId],
      });
    }
  }

  private static async checkFirstReferral(
    referrerId: string,
  ): Promise<boolean> {
    const result = await supabase
      .from('referral_rewards')
      .select('id')
      .eq('referrer_id', referrerId)
      .limit(1);

    return (result.data || []).length === 0;
  }

  private static async checkReferralStreak(
    referrerId: string,
  ): Promise<boolean> {
    const result = await supabase
      .from('referral_rewards')
      .select('id')
      .eq('referrer_id', referrerId)
      .gte(
        'earned_at',
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      );

    return (result.data || []).length >= 3;
  }

  private static async checkHighValueReferral(
    referrerId: string,
  ): Promise<boolean> {
    // Implementation would check the referee's subscription value
    return false; // Placeholder
  }

  private static async checkGeographicExpansion(
    referrerId: string,
  ): Promise<boolean> {
    // Implementation would check if referrer brought someone from a new region
    return false; // Placeholder
  }

  private static async processAccountCredit(
    userId: string,
    amount: number,
    currency: string,
  ): Promise<string> {
    // Implementation would credit user's account
    return crypto.randomUUID();
  }

  private static async processCashPayout(
    userId: string,
    amount: number,
  ): Promise<{ transactionId: string; receiptUrl: string }> {
    // Implementation would process payment via Stripe/PayPal
    return {
      transactionId: crypto.randomUUID(),
      receiptUrl: `https://example.com/receipt/${crypto.randomUUID()}`,
    };
  }

  private static async processFeatureUnlock(
    userId: string,
    amount: number,
    metadata: any,
  ): Promise<string> {
    // Implementation would unlock features based on reward amount
    return crypto.randomUUID();
  }

  private static async generateDiscountCode(
    userId: string,
    amount: number,
  ): Promise<{ code: string; redemptionUrl: string }> {
    // Implementation would generate discount code
    const code = `REFERRAL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    return {
      code,
      redemptionUrl: `https://example.com/redeem/${code}`,
    };
  }

  private static mapDatabaseToReward(dbReward: any): ReferralReward {
    return {
      id: dbReward.id,
      referrer_id: dbReward.referrer_id,
      referee_id: dbReward.referee_id,
      referral_type: dbReward.referral_type,
      tier: dbReward.tier,
      base_reward_amount: dbReward.base_reward_amount,
      multiplier: dbReward.multiplier,
      final_reward_amount: dbReward.final_reward_amount,
      reward_currency: dbReward.reward_currency,
      status: dbReward.status,
      expires_at: new Date(dbReward.expires_at),
      earned_at: new Date(dbReward.earned_at),
      fulfilled_at: dbReward.fulfilled_at
        ? new Date(dbReward.fulfilled_at)
        : undefined,
      metadata: JSON.parse(dbReward.metadata || '{}'),
    };
  }
}
