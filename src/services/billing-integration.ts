import Stripe from 'stripe';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { auditPayment } from '@/lib/security-audit-logger';
import { generateSecureToken } from '@/lib/crypto-utils';

export interface BillingResult {
  success: boolean;
  creditAmount?: number;
  description?: string;
  error?: string;
  transactionId?: string;
  billingCycleAdjustment?: {
    nextBillingDate: string;
    discountApplied: number;
  };
}

export interface ReferralReward {
  supplierId: string;
  rewardType:
    | 'month_free'
    | 'tier_upgrade'
    | 'percentage_discount'
    | 'fixed_credit';
  value: number; // Amount in pence or percentage
  referralId: string;
  description: string;
  expiresAt?: string;
  metadata?: Record<string, any>;
}

export interface MilestoneReward {
  supplierId: string;
  milestone: string;
  conversionsCount: number;
  rewardType: 'months_free' | 'lifetime_discount' | 'tier_upgrade';
  value: number;
  description: string;
}

export class BillingError extends Error {
  constructor(
    message: string,
    public code?: string,
    public cause?: any,
  ) {
    super(message);
    this.name = 'BillingError';
  }
}

export class BillingIntegrationService {
  private readonly stripe: Stripe;
  private readonly supabase: SupabaseClient;

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }

    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      throw new Error('Missing required Supabase environment variables');
    }

    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    });

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );
  }

  async creditReferralReward(reward: ReferralReward): Promise<BillingResult> {
    const operationId = generateSecureToken(16);

    try {
      // Audit log the reward attempt
      await auditPayment({
        operation: 'referral_reward_credit',
        operationId,
        supplierId: reward.supplierId,
        amount: reward.value,
        rewardType: reward.rewardType,
        referralId: reward.referralId,
      });

      // Check for duplicate reward processing
      const { data: existingReward } = await this.supabase
        .from('billing_credits')
        .select('id')
        .eq('referral_id', reward.referralId)
        .eq('organization_id', reward.supplierId)
        .single();

      if (existingReward) {
        throw new BillingError('Reward already processed', 'DUPLICATE_REWARD');
      }

      // Get supplier's current subscription details
      const { data: org, error: orgError } = await this.supabase
        .from('organizations')
        .select(
          'stripe_customer_id, stripe_subscription_id, subscription_tier, subscription_status',
        )
        .eq('id', reward.supplierId)
        .single();

      if (orgError || !org) {
        throw new BillingError(
          'Organization not found',
          'ORG_NOT_FOUND',
          orgError,
        );
      }

      if (!org.stripe_customer_id) {
        throw new BillingError('No Stripe customer found', 'NO_CUSTOMER');
      }

      let billingResult: BillingResult;

      switch (reward.rewardType) {
        case 'month_free':
          billingResult = await this.applyMonthFreeCredit(
            org,
            reward,
            operationId,
          );
          break;
        case 'fixed_credit':
          billingResult = await this.applyFixedCredit(org, reward, operationId);
          break;
        case 'percentage_discount':
          billingResult = await this.applyPercentageDiscount(
            org,
            reward,
            operationId,
          );
          break;
        case 'tier_upgrade':
          billingResult = await this.applyTierUpgrade(org, reward, operationId);
          break;
        default:
          throw new BillingError(
            'Unsupported reward type',
            'INVALID_REWARD_TYPE',
          );
      }

      // Record successful reward in database
      await this.recordRewardCredit(reward, billingResult, operationId);

      // Log successful reward application
      await this.logBillingSuccess('referral_reward_applied', {
        operationId,
        supplierId: reward.supplierId,
        rewardType: reward.rewardType,
        creditAmount: billingResult.creditAmount,
        transactionId: billingResult.transactionId,
      });

      return billingResult;
    } catch (error) {
      await this.logBillingError('referral_reward_failed', {
        operationId,
        supplierId: reward.supplierId,
        rewardType: reward.rewardType,
        referralId: reward.referralId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof BillingError) {
        throw error;
      }

      throw new BillingError(
        'Failed to process referral reward',
        'PROCESSING_ERROR',
        error,
      );
    }
  }

  async processMilestoneReward(
    reward: MilestoneReward,
  ): Promise<BillingResult> {
    const operationId = generateSecureToken(16);

    try {
      // Check if milestone reward already processed
      const { data: existingMilestone } = await this.supabase
        .from('milestone_rewards')
        .select('id')
        .eq('organization_id', reward.supplierId)
        .eq('milestone', reward.milestone)
        .single();

      if (existingMilestone) {
        throw new BillingError(
          'Milestone reward already processed',
          'DUPLICATE_MILESTONE',
        );
      }

      // Define milestone reward values
      const milestoneConfig = {
        '5_conversions': {
          months: 1,
          description: '5 successful referrals milestone',
        },
        '10_conversions': {
          months: 2,
          description: '10 successful referrals milestone',
        },
        '25_conversions': {
          months: 3,
          description: '25 successful referrals milestone',
        },
        '50_conversions': {
          months: 6,
          description: '50 successful referrals milestone',
        },
        '100_conversions': {
          type: 'lifetime_discount',
          percentage: 20,
          description: '100 conversions lifetime achievement',
        },
      };

      const config =
        milestoneConfig[reward.milestone as keyof typeof milestoneConfig];
      if (!config) {
        throw new BillingError('Invalid milestone', 'INVALID_MILESTONE');
      }

      let result: BillingResult;

      if (config.type === 'lifetime_discount') {
        result = await this.applyLifetimeDiscount(
          reward.supplierId,
          config.percentage,
          operationId,
        );
      } else {
        result = await this.creditMultipleMonths(
          reward.supplierId,
          config.months,
          config.description,
          operationId,
        );
      }

      // Record milestone achievement
      await this.supabase.from('milestone_rewards').insert({
        organization_id: reward.supplierId,
        milestone: reward.milestone,
        conversions_count: reward.conversionsCount,
        reward_type: reward.rewardType,
        reward_value: reward.value,
        description: config.description,
        processed_at: new Date().toISOString(),
        operation_id: operationId,
      });

      return result;
    } catch (error) {
      await this.logBillingError('milestone_reward_failed', {
        operationId,
        supplierId: reward.supplierId,
        milestone: reward.milestone,
        conversionsCount: reward.conversionsCount,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error instanceof BillingError
        ? error
        : new BillingError(
            'Failed to process milestone reward',
            'PROCESSING_ERROR',
            error,
          );
    }
  }

  private async applyMonthFreeCredit(
    org: any,
    reward: ReferralReward,
    operationId: string,
  ): Promise<BillingResult> {
    if (!org.stripe_subscription_id) {
      throw new BillingError('No active subscription found', 'NO_SUBSCRIPTION');
    }

    // Get current subscription from Stripe
    const subscription = await this.stripe.subscriptions.retrieve(
      org.stripe_subscription_id,
    );

    // Calculate monthly amount
    const monthlyAmount = this.calculateMonthlyAmount(subscription);

    // Create credit balance in Stripe
    const balanceTransaction =
      await this.stripe.customers.createBalanceTransaction(
        org.stripe_customer_id,
        {
          amount: monthlyAmount,
          currency: 'gbp',
          description: `Referral reward - 1 month free (Referral: ${reward.referralId})`,
          metadata: {
            referral_id: reward.referralId,
            reward_type: 'month_free',
            operation_id: operationId,
          },
        },
      );

    return {
      success: true,
      creditAmount: monthlyAmount,
      description: '1 month free credit applied',
      transactionId: balanceTransaction.id,
    };
  }

  private async applyFixedCredit(
    org: any,
    reward: ReferralReward,
    operationId: string,
  ): Promise<BillingResult> {
    const balanceTransaction =
      await this.stripe.customers.createBalanceTransaction(
        org.stripe_customer_id,
        {
          amount: reward.value, // Already in pence
          currency: 'gbp',
          description: `Referral reward - £${(reward.value / 100).toFixed(2)} credit`,
          metadata: {
            referral_id: reward.referralId,
            reward_type: 'fixed_credit',
            operation_id: operationId,
          },
        },
      );

    return {
      success: true,
      creditAmount: reward.value,
      description: `£${(reward.value / 100).toFixed(2)} credit applied`,
      transactionId: balanceTransaction.id,
    };
  }

  private async applyPercentageDiscount(
    org: any,
    reward: ReferralReward,
    operationId: string,
  ): Promise<BillingResult> {
    if (!org.stripe_subscription_id) {
      throw new BillingError('No active subscription found', 'NO_SUBSCRIPTION');
    }

    // Create a discount coupon for the percentage
    const coupon = await this.stripe.coupons.create({
      percent_off: reward.value, // Percentage off
      duration: 'once', // Apply to next invoice only
      max_redemptions: 1,
      metadata: {
        referral_id: reward.referralId,
        reward_type: 'percentage_discount',
        operation_id: operationId,
      },
    });

    // Apply coupon to customer
    await this.stripe.customers.update(org.stripe_customer_id, {
      coupon: coupon.id,
    });

    return {
      success: true,
      description: `${reward.value}% discount applied to next invoice`,
      transactionId: coupon.id,
    };
  }

  private async applyTierUpgrade(
    org: any,
    reward: ReferralReward,
    operationId: string,
  ): Promise<BillingResult> {
    // For tier upgrades, we'd need to modify the subscription
    // This is a more complex operation requiring business logic
    // For now, we'll apply equivalent credit
    return this.applyMonthFreeCredit(org, reward, operationId);
  }

  private async applyLifetimeDiscount(
    supplierId: string,
    percentage: number,
    operationId: string,
  ): Promise<BillingResult> {
    // Create a forever discount coupon
    const coupon = await this.stripe.coupons.create({
      percent_off: percentage,
      duration: 'forever',
      max_redemptions: 1,
      metadata: {
        milestone_reward: 'lifetime_achievement',
        percentage: percentage.toString(),
        operation_id: operationId,
      },
    });

    // Get organization's Stripe customer ID
    const { data: org } = await this.supabase
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', supplierId)
      .single();

    if (!org?.stripe_customer_id) {
      throw new BillingError('No Stripe customer found', 'NO_CUSTOMER');
    }

    // Apply lifetime discount
    await this.stripe.customers.update(org.stripe_customer_id, {
      coupon: coupon.id,
    });

    return {
      success: true,
      description: `Lifetime ${percentage}% discount applied`,
      transactionId: coupon.id,
    };
  }

  private async creditMultipleMonths(
    supplierId: string,
    months: number,
    description: string,
    operationId: string,
  ): Promise<BillingResult> {
    // Get organization details
    const { data: org } = await this.supabase
      .from('organizations')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('id', supplierId)
      .single();

    if (!org?.stripe_customer_id || !org?.stripe_subscription_id) {
      throw new BillingError(
        'Invalid customer or subscription',
        'INVALID_CUSTOMER',
      );
    }

    // Get subscription details
    const subscription = await this.stripe.subscriptions.retrieve(
      org.stripe_subscription_id,
    );
    const monthlyAmount = this.calculateMonthlyAmount(subscription);
    const totalCredit = monthlyAmount * months;

    // Apply total credit
    const balanceTransaction =
      await this.stripe.customers.createBalanceTransaction(
        org.stripe_customer_id,
        {
          amount: totalCredit,
          currency: 'gbp',
          description: `${description} - ${months} months credit`,
          metadata: {
            milestone_reward: 'true',
            months: months.toString(),
            operation_id: operationId,
          },
        },
      );

    return {
      success: true,
      creditAmount: totalCredit,
      description: `${months} months free credit applied`,
      transactionId: balanceTransaction.id,
    };
  }

  private calculateMonthlyAmount(subscription: Stripe.Subscription): number {
    const price = subscription.items.data[0]?.price;
    if (!price)
      throw new BillingError('No price found in subscription', 'NO_PRICE');

    if (price.recurring?.interval === 'month') {
      return price.unit_amount || 0;
    } else if (price.recurring?.interval === 'year') {
      return Math.round((price.unit_amount || 0) / 12);
    }

    throw new BillingError('Unsupported billing interval', 'INVALID_INTERVAL');
  }

  private async recordRewardCredit(
    reward: ReferralReward,
    result: BillingResult,
    operationId: string,
  ): Promise<void> {
    await this.supabase.from('billing_credits').insert({
      organization_id: reward.supplierId,
      credit_type: 'referral_reward',
      amount_pence: result.creditAmount || 0,
      description: reward.description,
      referral_id: reward.referralId,
      stripe_transaction_id: result.transactionId,
      operation_id: operationId,
      reward_type: reward.rewardType,
      created_at: new Date().toISOString(),
      expires_at: reward.expiresAt,
      metadata: reward.metadata,
    });
  }

  // Health check method for integration monitoring
  async getHealthStatus(): Promise<{
    healthy: boolean;
    responseTime: number;
    error?: string;
    details?: any;
  }> {
    const startTime = Date.now();

    try {
      // Test Stripe connectivity
      const balance = await this.stripe.balance.retrieve();

      // Test Supabase connectivity
      const { error: dbError } = await this.supabase
        .from('organizations')
        .select('id')
        .limit(1);

      if (dbError) {
        throw new Error(`Database connectivity failed: ${dbError.message}`);
      }

      return {
        healthy: true,
        responseTime: Date.now() - startTime,
        details: {
          stripe_available_balance: balance.available?.[0]?.amount || 0,
          stripe_pending_balance: balance.pending?.[0]?.amount || 0,
          database_connected: true,
        },
      };
    } catch (error) {
      return {
        healthy: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async validateRewardEligibility(
    supplierId: string,
    rewardType: string,
  ): Promise<{ eligible: boolean; reason?: string }> {
    try {
      // Check if supplier has active subscription
      const { data: org } = await this.supabase
        .from('organizations')
        .select('subscription_status, subscription_tier')
        .eq('id', supplierId)
        .single();

      if (!org) {
        return { eligible: false, reason: 'Organization not found' };
      }

      if (org.subscription_status !== 'active') {
        return { eligible: false, reason: 'No active subscription' };
      }

      // Check recent reward limits (max 1 reward per month per supplier)
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const { data: recentRewards, error } = await this.supabase
        .from('billing_credits')
        .select('id')
        .eq('organization_id', supplierId)
        .eq('credit_type', 'referral_reward')
        .gte('created_at', oneMonthAgo.toISOString());

      if (error) {
        return { eligible: false, reason: 'Error checking eligibility' };
      }

      if (recentRewards && recentRewards.length >= 3) {
        return { eligible: false, reason: 'Monthly reward limit exceeded' };
      }

      return { eligible: true };
    } catch (error) {
      return { eligible: false, reason: 'Eligibility check failed' };
    }
  }

  private async logBillingSuccess(event: string, metadata: any): Promise<void> {
    try {
      console.log(`[BillingIntegration] ${event}:`, {
        timestamp: new Date().toISOString(),
        event,
        ...metadata,
        service: 'billing-integration',
      });
    } catch (error) {
      console.error('[BillingIntegration] Success logging failed:', error);
    }
  }

  private async logBillingError(event: string, metadata: any): Promise<void> {
    try {
      // Sanitize metadata to remove sensitive information
      const sanitizedMetadata = { ...metadata };

      // Remove sensitive Stripe data
      delete sanitizedMetadata.stripe_secret;
      delete sanitizedMetadata.customer_id;

      console.error(`[BillingIntegration] ${event}:`, {
        timestamp: new Date().toISOString(),
        event,
        ...sanitizedMetadata,
        service: 'billing-integration',
      });
    } catch (error) {
      console.error('[BillingIntegration] Critical logging failure:', error);
    }
  }
}

// Export singleton instance for use across the application
export const billingIntegrationService = new BillingIntegrationService();
