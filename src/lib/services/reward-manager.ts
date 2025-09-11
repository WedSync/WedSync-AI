/**
 * WS-142: RewardManager - Manage Milestone Rewards and Benefits
 * Comprehensive reward system for milestone achievements and user engagement
 */

import { createClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { redis } from '@/lib/redis';
import { Milestone } from './milestone-service';

export interface Reward {
  rewardId: string;
  userId: string;
  milestoneId?: string;
  rewardType: RewardType;
  category: RewardCategory;
  name: string;
  description: string;

  // Value and cost
  pointValue: number;
  cashValue?: number; // In cents

  // Availability
  isActive: boolean;
  isRedeemable: boolean;
  expiresAt?: Date;

  // Requirements
  minimumPoints: number;
  tierRequirement?: UserTier;
  prerequisites: string[];

  // Status
  status: 'available' | 'redeemed' | 'expired' | 'pending';
  redeemedAt?: Date;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

export type RewardType =
  | 'points'
  | 'badge'
  | 'feature_unlock'
  | 'discount'
  | 'credit'
  | 'premium_access'
  | 'consultation'
  | 'template'
  | 'integration'
  | 'custom';

export type RewardCategory =
  | 'achievement'
  | 'milestone'
  | 'engagement'
  | 'loyalty'
  | 'referral'
  | 'seasonal'
  | 'special_event';

export type UserTier =
  | 'starter'
  | 'professional'
  | 'business'
  | 'enterprise'
  | 'vip';

export interface UserRewardAccount {
  userId: string;
  totalPointsEarned: number;
  currentPointsBalance: number;
  pointsRedeemed: number;
  tier: UserTier;
  nextTierPoints: number;
  rewardsUnlocked: number;
  rewardsRedeemed: number;
  streakDays: number;
  lastActivity: Date;
  achievements: string[];
}

export interface RewardTransaction {
  transactionId: string;
  userId: string;
  transactionType: 'earned' | 'redeemed' | 'expired' | 'adjustment';
  pointsChange: number;
  balanceAfter: number;
  reason: string;
  milestoneId?: string;
  rewardId?: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface RewardCatalog {
  catalogId: string;
  name: string;
  description: string;
  isActive: boolean;
  rewards: Reward[];
  tierVisibility: UserTier[];
  seasonalAvailability?: {
    startDate: Date;
    endDate: Date;
  };
}

export interface RewardRedemption {
  redemptionId: string;
  userId: string;
  rewardId: string;
  reward: Reward;
  pointsCost: number;
  status: 'pending' | 'approved' | 'fulfilled' | 'cancelled' | 'failed';
  requestedAt: Date;
  fulfilledAt?: Date;
  fulfillmentData?: Record<string, any>;
  notes?: string;
}

export interface RewardStats {
  userId: string;
  totalRewards: number;
  pointsBalance: number;
  recentEarnings: RewardTransaction[];
  availableRewards: Reward[];
  recommendedRewards: Reward[];
  tier: UserTier;
  nextMilestone: {
    pointsNeeded: number;
    reward: string;
  };
}

export class RewardManager {
  private supabase: SupabaseClient;
  private cachePrefix = 'reward:';
  private cacheTTL = 3600; // 1 hour

  // Tier thresholds
  private tierThresholds = {
    starter: 0,
    professional: 100,
    business: 500,
    enterprise: 1500,
    vip: 5000,
  };

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createClient();
  }

  /**
   * Award points for milestone achievement
   */
  async awardMilestoneReward(
    userId: string,
    milestone: Milestone,
  ): Promise<RewardTransaction> {
    try {
      // Create reward transaction
      const transaction = await this.createRewardTransaction(
        userId,
        'earned',
        milestone.rewardPoints,
        'Milestone achievement',
        milestone.id,
      );

      // Update user account
      await this.updateUserRewardAccount(userId, milestone.rewardPoints, 0);

      // Check for tier promotions
      await this.checkTierPromotion(userId);

      // Award additional rewards based on milestone type
      await this.processAdditionalRewards(userId, milestone);

      return transaction;
    } catch (error) {
      console.error('Error awarding milestone reward:', error);
      throw error;
    }
  }

  /**
   * Redeem reward using points
   */
  async redeemReward(
    userId: string,
    rewardId: string,
  ): Promise<RewardRedemption> {
    try {
      // Get reward details
      const reward = await this.getReward(rewardId);
      if (!reward) {
        throw new Error(`Reward ${rewardId} not found`);
      }

      // Check user eligibility
      const account = await this.getUserRewardAccount(userId);
      if (account.currentPointsBalance < reward.minimumPoints) {
        throw new Error('Insufficient points for reward redemption');
      }

      // Check tier requirements
      if (
        reward.tierRequirement &&
        !this.meetsUserTier(account.tier, reward.tierRequirement)
      ) {
        throw new Error(
          `Reward requires ${reward.tierRequirement} tier or higher`,
        );
      }

      // Create redemption request
      const redemptionId = crypto.randomUUID();
      const redemption: RewardRedemption = {
        redemptionId,
        userId,
        rewardId,
        reward,
        pointsCost: reward.pointValue,
        status: 'pending',
        requestedAt: new Date(),
      };

      // Deduct points immediately for most rewards
      if (reward.rewardType !== 'consultation') {
        await this.createRewardTransaction(
          userId,
          'redeemed',
          -reward.pointValue,
          `Redeemed: ${reward.name}`,
          undefined,
          rewardId,
        );

        await this.updateUserRewardAccount(userId, 0, reward.pointValue);
        redemption.status = 'approved';
      }

      // Store redemption
      await this.storeRedemption(redemption);

      // Process reward fulfillment
      await this.processRewardFulfillment(redemption);

      return redemption;
    } catch (error) {
      console.error('Error redeeming reward:', error);
      throw error;
    }
  }

  /**
   * Get user's reward account and stats
   */
  async getUserRewardAccount(userId: string): Promise<UserRewardAccount> {
    const cacheKey = `${this.cachePrefix}account:${userId}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Cache read error for reward account:', error);
    }

    try {
      const { data: accountData, error } = await this.supabase
        .from('user_reward_accounts')
        .select('*')
        .eq('user_id', userId)
        .single();

      let account: UserRewardAccount;

      if (error && error.code === 'PGRST116') {
        // Account doesn't exist, create it
        account = await this.createUserRewardAccount(userId);
      } else if (error) {
        throw error;
      } else {
        account = {
          userId: accountData.user_id,
          totalPointsEarned: accountData.total_points_earned,
          currentPointsBalance: accountData.current_points_balance,
          pointsRedeemed: accountData.points_redeemed,
          tier: accountData.tier,
          nextTierPoints: this.calculateNextTierPoints(
            accountData.tier,
            accountData.total_points_earned,
          ),
          rewardsUnlocked: accountData.rewards_unlocked,
          rewardsRedeemed: accountData.rewards_redeemed,
          streakDays: accountData.streak_days,
          lastActivity: new Date(accountData.last_activity),
          achievements: accountData.achievements || [],
        };
      }

      // Cache the account
      try {
        await redis.setex(cacheKey, this.cacheTTL, JSON.stringify(account));
      } catch (error) {
        console.warn('Cache write error for reward account:', error);
      }

      return account;
    } catch (error) {
      console.error('Error getting user reward account:', error);
      return this.getDefaultRewardAccount(userId);
    }
  }

  /**
   * Get available rewards for user
   */
  async getAvailableRewards(
    userId: string,
    category?: RewardCategory,
    rewardType?: RewardType,
  ): Promise<Reward[]> {
    try {
      const account = await this.getUserRewardAccount(userId);

      let query = this.supabase
        .from('rewards')
        .select('*')
        .eq('is_active', true)
        .eq('is_redeemable', true)
        .lte('minimum_points', account.currentPointsBalance);

      if (category) {
        query = query.eq('category', category);
      }

      if (rewardType) {
        query = query.eq('reward_type', rewardType);
      }

      const { data: rewards, error } = await query.order('point_value', {
        ascending: true,
      });

      if (error) throw error;

      // Filter by tier and other requirements
      const availableRewards = (rewards || [])
        .map(this.dbRecordToReward)
        .filter(
          (reward) =>
            !reward.tierRequirement ||
            this.meetsUserTier(account.tier, reward.tierRequirement),
        )
        .filter((reward) => !reward.expiresAt || reward.expiresAt > new Date());

      return availableRewards;
    } catch (error) {
      console.error('Error getting available rewards:', error);
      return [];
    }
  }

  /**
   * Get reward redemption history
   */
  async getRedemptionHistory(
    userId: string,
    limit: number = 10,
  ): Promise<RewardRedemption[]> {
    try {
      const { data: redemptions, error } = await this.supabase
        .from('reward_redemptions')
        .select(
          `
          *,
          rewards (
            reward_id,
            name,
            description,
            reward_type,
            point_value
          )
        `,
        )
        .eq('user_id', userId)
        .order('requested_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (redemptions || []).map((r) => ({
        redemptionId: r.redemption_id,
        userId: r.user_id,
        rewardId: r.reward_id,
        reward: {
          rewardId: r.rewards.reward_id,
          name: r.rewards.name,
          description: r.rewards.description,
          rewardType: r.rewards.reward_type,
          pointValue: r.rewards.point_value,
        } as Reward,
        pointsCost: r.points_cost,
        status: r.status,
        requestedAt: new Date(r.requested_at),
        fulfilledAt: r.fulfilled_at ? new Date(r.fulfilled_at) : undefined,
        fulfillmentData: r.fulfillment_data,
        notes: r.notes,
      }));
    } catch (error) {
      console.error('Error getting redemption history:', error);
      return [];
    }
  }

  /**
   * Create custom reward for special occasions
   */
  async createCustomReward(
    rewardData: Omit<Reward, 'rewardId' | 'createdAt' | 'updatedAt'>,
  ): Promise<Reward> {
    try {
      const rewardId = crypto.randomUUID();
      const now = new Date();

      const reward: Reward = {
        rewardId,
        ...rewardData,
        createdAt: now,
        updatedAt: now,
      };

      const { error } = await this.supabase.from('rewards').insert({
        reward_id: reward.rewardId,
        user_id: reward.userId,
        milestone_id: reward.milestoneId,
        reward_type: reward.rewardType,
        category: reward.category,
        name: reward.name,
        description: reward.description,
        point_value: reward.pointValue,
        cash_value: reward.cashValue,
        is_active: reward.isActive,
        is_redeemable: reward.isRedeemable,
        expires_at: reward.expiresAt?.toISOString(),
        minimum_points: reward.minimumPoints,
        tier_requirement: reward.tierRequirement,
        prerequisites: reward.prerequisites,
        status: reward.status,
        redeemed_at: reward.redeemedAt?.toISOString(),
        tags: reward.tags,
        created_at: reward.createdAt.toISOString(),
        updated_at: reward.updatedAt.toISOString(),
      });

      if (error) throw error;

      return reward;
    } catch (error) {
      console.error('Error creating custom reward:', error);
      throw error;
    }
  }

  // Private helper methods

  private async createUserRewardAccount(
    userId: string,
  ): Promise<UserRewardAccount> {
    const account: UserRewardAccount = {
      userId,
      totalPointsEarned: 0,
      currentPointsBalance: 0,
      pointsRedeemed: 0,
      tier: 'starter',
      nextTierPoints: this.tierThresholds.professional,
      rewardsUnlocked: 0,
      rewardsRedeemed: 0,
      streakDays: 0,
      lastActivity: new Date(),
      achievements: [],
    };

    const { error } = await this.supabase.from('user_reward_accounts').insert({
      user_id: account.userId,
      total_points_earned: account.totalPointsEarned,
      current_points_balance: account.currentPointsBalance,
      points_redeemed: account.pointsRedeemed,
      tier: account.tier,
      rewards_unlocked: account.rewardsUnlocked,
      rewards_redeemed: account.rewardsRedeemed,
      streak_days: account.streakDays,
      last_activity: account.lastActivity.toISOString(),
      achievements: account.achievements,
    });

    if (error) throw error;

    return account;
  }

  private async createRewardTransaction(
    userId: string,
    type: 'earned' | 'redeemed' | 'expired' | 'adjustment',
    pointsChange: number,
    reason: string,
    milestoneId?: string,
    rewardId?: string,
  ): Promise<RewardTransaction> {
    // Get current balance
    const account = await this.getUserRewardAccount(userId);
    const balanceAfter = account.currentPointsBalance + pointsChange;

    const transaction: RewardTransaction = {
      transactionId: crypto.randomUUID(),
      userId,
      transactionType: type,
      pointsChange,
      balanceAfter,
      reason,
      milestoneId,
      rewardId,
      metadata: { source: 'milestone_system' },
      createdAt: new Date(),
    };

    // Store transaction
    const { error } = await this.supabase.from('reward_transactions').insert({
      transaction_id: transaction.transactionId,
      user_id: transaction.userId,
      transaction_type: transaction.transactionType,
      points_change: transaction.pointsChange,
      balance_after: transaction.balanceAfter,
      reason: transaction.reason,
      milestone_id: transaction.milestoneId,
      reward_id: transaction.rewardId,
      metadata: transaction.metadata,
      created_at: transaction.createdAt.toISOString(),
    });

    if (error) throw error;

    return transaction;
  }

  private async updateUserRewardAccount(
    userId: string,
    pointsEarned: number,
    pointsRedeemed: number,
  ): Promise<void> {
    const account = await this.getUserRewardAccount(userId);

    const updates = {
      total_points_earned: account.totalPointsEarned + pointsEarned,
      current_points_balance:
        account.currentPointsBalance + pointsEarned - pointsRedeemed,
      points_redeemed: account.pointsRedeemed + pointsRedeemed,
      last_activity: new Date().toISOString(),
    };

    if (pointsRedeemed > 0) {
      updates['rewards_redeemed'] = account.rewardsRedeemed + 1;
    }

    const { error } = await this.supabase
      .from('user_reward_accounts')
      .update(updates)
      .eq('user_id', userId);

    if (error) throw error;

    // Clear cache
    await redis.del(`${this.cachePrefix}account:${userId}`);
  }

  private async checkTierPromotion(userId: string): Promise<void> {
    const account = await this.getUserRewardAccount(userId);
    const currentTier = account.tier;
    const newTier = this.calculateUserTier(account.totalPointsEarned);

    if (newTier !== currentTier) {
      // Promote user
      const { error } = await this.supabase
        .from('user_reward_accounts')
        .update({ tier: newTier })
        .eq('user_id', userId);

      if (!error) {
        // Award tier promotion bonus
        await this.awardTierPromotionBonus(userId, newTier);

        // Clear cache
        await redis.del(`${this.cachePrefix}account:${userId}`);
      }
    }
  }

  private async processAdditionalRewards(
    userId: string,
    milestone: Milestone,
  ): Promise<void> {
    // Award bonus points for special milestones
    if (milestone.isRequired && milestone.milestoneType === 'onboarding') {
      await this.createRewardTransaction(
        userId,
        'earned',
        5,
        'Onboarding milestone bonus',
        milestone.id,
      );

      await this.updateUserRewardAccount(userId, 5, 0);
    }

    // Award feature unlock rewards
    if (milestone.category === 'mastery') {
      // Could unlock premium features, templates, etc.
      await this.unlockFeatureReward(userId, milestone);
    }
  }

  private async processRewardFulfillment(
    redemption: RewardRedemption,
  ): Promise<void> {
    try {
      switch (redemption.reward.rewardType) {
        case 'feature_unlock':
          await this.fulfillFeatureUnlock(redemption);
          break;
        case 'discount':
          await this.fulfillDiscountReward(redemption);
          break;
        case 'template':
          await this.fulfillTemplateReward(redemption);
          break;
        case 'consultation':
          await this.fulfillConsultationReward(redemption);
          break;
        default:
          // Mark as fulfilled for simple rewards
          redemption.status = 'fulfilled';
          redemption.fulfilledAt = new Date();
          await this.updateRedemptionStatus(redemption);
      }
    } catch (error) {
      console.error('Error processing reward fulfillment:', error);
      redemption.status = 'failed';
      await this.updateRedemptionStatus(redemption);
    }
  }

  private async awardTierPromotionBonus(
    userId: string,
    newTier: UserTier,
  ): Promise<void> {
    const bonusPoints = {
      starter: 0,
      professional: 25,
      business: 100,
      enterprise: 250,
      vip: 500,
    };

    const bonus = bonusPoints[newTier];
    if (bonus > 0) {
      await this.createRewardTransaction(
        userId,
        'earned',
        bonus,
        `Tier promotion bonus: ${newTier}`,
      );

      await this.updateUserRewardAccount(userId, bonus, 0);
    }
  }

  private calculateUserTier(totalPoints: number): UserTier {
    if (totalPoints >= this.tierThresholds.vip) return 'vip';
    if (totalPoints >= this.tierThresholds.enterprise) return 'enterprise';
    if (totalPoints >= this.tierThresholds.business) return 'business';
    if (totalPoints >= this.tierThresholds.professional) return 'professional';
    return 'starter';
  }

  private calculateNextTierPoints(
    currentTier: UserTier,
    totalPoints: number,
  ): number {
    const tierOrder: UserTier[] = [
      'starter',
      'professional',
      'business',
      'enterprise',
      'vip',
    ];
    const currentIndex = tierOrder.indexOf(currentTier);

    if (currentIndex < tierOrder.length - 1) {
      const nextTier = tierOrder[currentIndex + 1];
      return this.tierThresholds[nextTier] - totalPoints;
    }

    return 0; // Already at max tier
  }

  private meetsUserTier(userTier: UserTier, requiredTier: UserTier): boolean {
    const tierOrder: UserTier[] = [
      'starter',
      'professional',
      'business',
      'enterprise',
      'vip',
    ];
    return tierOrder.indexOf(userTier) >= tierOrder.indexOf(requiredTier);
  }

  private async getReward(rewardId: string): Promise<Reward | null> {
    try {
      const { data, error } = await this.supabase
        .from('rewards')
        .select('*')
        .eq('reward_id', rewardId)
        .single();

      if (error || !data) return null;

      return this.dbRecordToReward(data);
    } catch (error) {
      console.error('Error getting reward:', error);
      return null;
    }
  }

  private async storeRedemption(redemption: RewardRedemption): Promise<void> {
    const { error } = await this.supabase.from('reward_redemptions').insert({
      redemption_id: redemption.redemptionId,
      user_id: redemption.userId,
      reward_id: redemption.rewardId,
      points_cost: redemption.pointsCost,
      status: redemption.status,
      requested_at: redemption.requestedAt.toISOString(),
      fulfilled_at: redemption.fulfilledAt?.toISOString(),
      fulfillment_data: redemption.fulfillmentData,
      notes: redemption.notes,
    });

    if (error) throw error;
  }

  private async updateRedemptionStatus(
    redemption: RewardRedemption,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('reward_redemptions')
      .update({
        status: redemption.status,
        fulfilled_at: redemption.fulfilledAt?.toISOString(),
        fulfillment_data: redemption.fulfillmentData,
        notes: redemption.notes,
      })
      .eq('redemption_id', redemption.redemptionId);

    if (error) throw error;
  }

  // Fulfillment methods (simplified implementations)

  private async fulfillFeatureUnlock(
    redemption: RewardRedemption,
  ): Promise<void> {
    // Would unlock specific features for the user
    redemption.status = 'fulfilled';
    redemption.fulfilledAt = new Date();
    redemption.fulfillmentData = { featureUnlocked: true };
    await this.updateRedemptionStatus(redemption);
  }

  private async fulfillDiscountReward(
    redemption: RewardRedemption,
  ): Promise<void> {
    // Would create discount code or apply credit
    redemption.status = 'fulfilled';
    redemption.fulfilledAt = new Date();
    redemption.fulfillmentData = { discountCode: `REWARD${Date.now()}` };
    await this.updateRedemptionStatus(redemption);
  }

  private async fulfillTemplateReward(
    redemption: RewardRedemption,
  ): Promise<void> {
    // Would unlock premium templates
    redemption.status = 'fulfilled';
    redemption.fulfilledAt = new Date();
    redemption.fulfillmentData = { templatesUnlocked: 5 };
    await this.updateRedemptionStatus(redemption);
  }

  private async fulfillConsultationReward(
    redemption: RewardRedemption,
  ): Promise<void> {
    // Would require manual processing
    redemption.status = 'pending';
    redemption.notes = 'Consultation booking requires manual fulfillment';
    await this.updateRedemptionStatus(redemption);
  }

  private async unlockFeatureReward(
    userId: string,
    milestone: Milestone,
  ): Promise<void> {
    // Would unlock premium features based on milestone mastery
    console.log(
      `Feature reward unlocked for user ${userId} via milestone ${milestone.id}`,
    );
  }

  private dbRecordToReward(record: any): Reward {
    return {
      rewardId: record.reward_id,
      userId: record.user_id,
      milestoneId: record.milestone_id,
      rewardType: record.reward_type,
      category: record.category,
      name: record.name,
      description: record.description,
      pointValue: record.point_value,
      cashValue: record.cash_value,
      isActive: record.is_active,
      isRedeemable: record.is_redeemable,
      expiresAt: record.expires_at ? new Date(record.expires_at) : undefined,
      minimumPoints: record.minimum_points,
      tierRequirement: record.tier_requirement,
      prerequisites: record.prerequisites || [],
      status: record.status,
      redeemedAt: record.redeemed_at ? new Date(record.redeemed_at) : undefined,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      tags: record.tags || [],
    };
  }

  private getDefaultRewardAccount(userId: string): UserRewardAccount {
    return {
      userId,
      totalPointsEarned: 0,
      currentPointsBalance: 0,
      pointsRedeemed: 0,
      tier: 'starter',
      nextTierPoints: this.tierThresholds.professional,
      rewardsUnlocked: 0,
      rewardsRedeemed: 0,
      streakDays: 0,
      lastActivity: new Date(),
      achievements: [],
    };
  }
}

// Export singleton instance
export const rewardManager = new RewardManager();
