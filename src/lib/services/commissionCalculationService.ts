/**
 * WS-109: Commission Calculation Service
 *
 * Core commission calculation engine that handles tier-based rates,
 * Stripe fee calculations, VAT handling, and earnings computation.
 * Integrates with existing WS-107 tier system and Stripe infrastructure.
 *
 * Team B - Batch 8 - Round 2
 * Backend Commission Engine Implementation
 */

import { createClient } from '@supabase/supabase-js';
import Decimal from 'decimal.js';

// Configure Decimal.js for financial precision
Decimal.set({
  precision: 10,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -7,
  toExpPos: 21,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

// =====================================================================================
// TYPE DEFINITIONS
// =====================================================================================

export interface CommissionTierInfo {
  creator_id: string;
  current_tier: 'base' | 'verified' | 'performer' | 'elite';
  commission_rate: number;
  tier_achieved_date: string;
  tier_benefits: string[];

  next_tier?: {
    tier_name: string;
    commission_rate: number;
    requirements: {
      sales_needed: number;
      revenue_needed: number;
      current_sales: number;
      current_revenue: number;
      progress_percentage: number;
    };
  };

  stats: {
    total_sales: number;
    total_revenue: number;
    total_earnings: number;
    average_rating: number;
    refund_rate: number;
    months_active: number;
  };
}

export interface CommissionCalculation {
  gross_amount: number;
  commission_rate: number;
  commission_amount: number;
  creator_earnings: number;
  creator_tier: string;

  breakdown: {
    stripe_fee: number;
    vat_amount: number;
    net_amount: number;
    platform_commission: number;
    creator_payout: number;
  };

  tier_comparison?: {
    current_tier_earnings: number;
    next_tier_earnings: number;
    potential_increase: number;
  };
}

export interface TierProgressUpdate {
  creator_id: string;
  previous_tier: string;
  new_tier: string;
  tier_achieved_date: string;
  benefits_unlocked: string[];
  commission_rate_improvement: number;
}

export interface CommissionRecordParams {
  template_purchase_id: string;
  creator_id: string;
  template_id: string;
  gross_amount: number;
  calculation: CommissionCalculation;
}

export interface PromotionalCommission {
  promotion_id: string;
  commission_rate_override?: number;
  commission_discount_percent?: number;
  promotion_name: string;
}

// =====================================================================================
// COMMISSION CALCULATION SERVICE
// =====================================================================================

export class CommissionCalculationService {
  // Commission rates by tier (platform commission, creator keeps the rest)
  private static readonly TIER_RATES = {
    base: 0.3, // 30% to platform, 70% to creator
    verified: 0.25, // 25% to platform, 75% to creator
    performer: 0.2, // 20% to platform, 80% to creator
    elite: 0.15, // 15% to platform, 85% to creator
  };

  // Stripe fee calculation constants
  private static readonly STRIPE_FEE_RATE = 0.014; // 1.4%
  private static readonly STRIPE_FEE_FIXED = 20; // 20p fixed fee
  private static readonly VAT_RATE = 0.2; // 20% VAT

  /**
   * Calculate commission for a template sale
   */
  async calculateCommission(params: {
    creatorId: string;
    saleAmount: number;
    templateId: string;
    promotionalCode?: string;
    currency?: string;
  }): Promise<CommissionCalculation> {
    try {
      const {
        creatorId,
        saleAmount,
        templateId,
        promotionalCode,
        currency = 'GBP',
      } = params;

      // Validate inputs
      if (saleAmount <= 0) {
        throw new Error('Sale amount must be positive');
      }

      // Get creator tier information
      const creatorTier = await this.getCreatorTier(creatorId);

      // Calculate base commission rate
      let commissionRate =
        CommissionCalculationService.TIER_RATES[creatorTier.current_tier];

      // Apply promotional adjustments if applicable
      if (promotionalCode) {
        const promotion = await this.getActivePromotion(
          promotionalCode,
          creatorId,
        );
        if (promotion) {
          commissionRate = this.applyPromotionalRate(commissionRate, promotion);
        }
      }

      // Calculate revenue breakdown with precise decimal arithmetic
      const grossAmount = new Decimal(saleAmount);
      const stripeFee = this.calculateStripeFee(grossAmount);
      const vatAmount = this.calculateVAT(grossAmount);
      const netAmount = grossAmount.minus(stripeFee).minus(vatAmount);

      // Calculate commission amounts
      const platformCommission = netAmount.times(commissionRate);
      const creatorEarnings = netAmount.minus(platformCommission);

      // Get tier comparison for motivation
      const tierComparison = await this.calculateTierComparison(
        creatorTier,
        saleAmount,
      );

      return {
        gross_amount: grossAmount.toNumber(),
        commission_rate: commissionRate,
        commission_amount: platformCommission.toNumber(),
        creator_earnings: creatorEarnings.toNumber(),
        creator_tier: creatorTier.current_tier,
        breakdown: {
          stripe_fee: stripeFee.toNumber(),
          vat_amount: vatAmount.toNumber(),
          net_amount: netAmount.toNumber(),
          platform_commission: platformCommission.toNumber(),
          creator_payout: creatorEarnings.toNumber(),
        },
        tier_comparison: tierComparison,
      };
    } catch (error) {
      console.error('Commission calculation error:', error);
      throw new Error(
        `Failed to calculate commission: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Record commission sale in the database with tier progression check
   */
  async recordCommissionSale(params: CommissionRecordParams): Promise<{
    commissionRecordId: string;
    tierUpdate?: TierProgressUpdate;
    nextMilestone?: {
      tier: string;
      sales_needed: number;
      revenue_needed: number;
    };
  }> {
    try {
      const {
        template_purchase_id,
        creator_id,
        template_id,
        gross_amount,
        calculation,
      } = params;

      // Record commission in ledger with precise amounts in cents
      const { data: commissionRecord, error } = await supabase
        .from('marketplace_commission_records')
        .insert({
          template_purchase_id,
          creator_id,
          template_id,
          gross_sale_amount_cents: Math.round(gross_amount * 100),
          creator_tier_at_sale: calculation.creator_tier,
          commission_rate: calculation.commission_rate,
          commission_amount_cents: Math.round(
            calculation.commission_amount * 100,
          ),
          creator_earnings_cents: Math.round(
            calculation.creator_earnings * 100,
          ),
          stripe_fee_cents: Math.round(calculation.breakdown.stripe_fee * 100),
          vat_amount_cents: Math.round(calculation.breakdown.vat_amount * 100),
          net_sale_amount_cents: Math.round(
            calculation.breakdown.net_amount * 100,
          ),
          sale_timestamp: new Date().toISOString(),
          currency: 'GBP',
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to record commission: ${error.message}`);
      }

      // Check for tier upgrades (this will be handled by database trigger and checked here)
      const tierUpdate = await this.checkForTierUpgrade(creator_id);

      // Get next milestone information
      const nextMilestone = await this.getNextMilestone(creator_id);

      return {
        commissionRecordId: commissionRecord.id,
        tierUpdate,
        nextMilestone,
      };
    } catch (error) {
      console.error('Error recording commission sale:', error);
      throw error;
    }
  }

  /**
   * Get creator tier information with progression data
   */
  async getCreatorTier(creatorId: string): Promise<CommissionTierInfo> {
    try {
      // Get current tier info - create if doesn't exist
      let { data: tierData, error } = await supabase
        .from('marketplace_creator_commission_tiers')
        .select('*')
        .eq('creator_id', creatorId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Create base tier record for new creator
        const { data: newTierData, error: createError } = await supabase
          .from('marketplace_creator_commission_tiers')
          .insert({
            creator_id: creatorId,
            current_tier: 'base',
            tier_achieved_date: new Date().toISOString(),
            total_marketplace_sales: 0,
            total_marketplace_revenue_cents: 0,
            total_creator_earnings_cents: 0,
          })
          .select()
          .single();

        if (createError) {
          throw new Error(
            `Failed to create creator tier record: ${createError.message}`,
          );
        }

        tierData = newTierData;
      } else if (error) {
        throw new Error(`Failed to fetch creator tier: ${error.message}`);
      }

      // Build comprehensive tier info
      const nextTierInfo = await this.getNextTierRequirements(
        tierData.current_tier,
        tierData,
      );

      return {
        creator_id: creatorId,
        current_tier: tierData.current_tier,
        commission_rate:
          CommissionCalculationService.TIER_RATES[tierData.current_tier],
        tier_achieved_date: tierData.tier_achieved_date,
        tier_benefits: await this.getTierBenefits(tierData.current_tier),
        next_tier: nextTierInfo,
        stats: {
          total_sales: tierData.total_marketplace_sales || 0,
          total_revenue: (tierData.total_marketplace_revenue_cents || 0) / 100,
          total_earnings: (tierData.total_creator_earnings_cents || 0) / 100,
          average_rating: tierData.average_template_rating || 0,
          refund_rate: tierData.refund_rate || 0,
          months_active: tierData.months_active || 0,
        },
      };
    } catch (error) {
      console.error('Error getting creator tier:', error);
      throw error;
    }
  }

  // =====================================================================================
  // PRIVATE CALCULATION METHODS
  // =====================================================================================

  private calculateStripeFee(grossAmount: Decimal): Decimal {
    // Stripe fee: 1.4% + 20p
    const percentageFee = grossAmount.times(
      CommissionCalculationService.STRIPE_FEE_RATE,
    );
    const fixedFee = new Decimal(
      CommissionCalculationService.STRIPE_FEE_FIXED / 100,
    ); // Convert pence to pounds
    return percentageFee.plus(fixedFee);
  }

  private calculateVAT(grossAmount: Decimal): Decimal {
    // VAT: 20% of gross amount
    return grossAmount.times(CommissionCalculationService.VAT_RATE);
  }

  private applyPromotionalRate(
    baseRate: number,
    promotion: PromotionalCommission,
  ): number {
    if (promotion.commission_rate_override) {
      return promotion.commission_rate_override;
    }

    if (promotion.commission_discount_percent) {
      return baseRate * (1 - promotion.commission_discount_percent / 100);
    }

    return baseRate;
  }

  private async getActivePromotion(
    promotionalCode: string,
    creatorId: string,
  ): Promise<PromotionalCommission | null> {
    try {
      const { data: promotion, error } = await supabase
        .from('marketplace_commission_promotions')
        .select('*')
        .eq('promotion_code', promotionalCode)
        .eq('active', true)
        .lte('start_date', new Date().toISOString())
        .gte('end_date', new Date().toISOString())
        .single();

      if (error || !promotion) {
        return null;
      }

      // Check eligibility
      if (
        promotion.eligible_creator_ids &&
        !promotion.eligible_creator_ids.includes(creatorId)
      ) {
        return null;
      }

      return {
        promotion_id: promotion.id,
        commission_rate_override: promotion.commission_rate_override,
        commission_discount_percent: promotion.commission_discount_percent,
        promotion_name: promotion.promotion_name,
      };
    } catch (error) {
      console.error('Error checking promotion:', error);
      return null;
    }
  }

  private async calculateTierComparison(
    creatorTier: CommissionTierInfo,
    saleAmount: number,
  ): Promise<any> {
    if (creatorTier.current_tier === 'elite' || !creatorTier.next_tier) {
      return null;
    }

    const currentTierRate =
      CommissionCalculationService.TIER_RATES[creatorTier.current_tier];
    const nextTierRate = creatorTier.next_tier.commission_rate;

    // Calculate earnings for both tiers (simplified calculation)
    const netAfterFees = saleAmount * 0.85; // Approximate after Stripe fees and VAT
    const currentTierEarnings = netAfterFees * (1 - currentTierRate);
    const nextTierEarnings = netAfterFees * (1 - nextTierRate);

    return {
      current_tier_earnings: Math.round(currentTierEarnings * 100) / 100,
      next_tier_earnings: Math.round(nextTierEarnings * 100) / 100,
      potential_increase:
        Math.round((nextTierEarnings - currentTierEarnings) * 100) / 100,
    };
  }

  private async getNextTierRequirements(
    currentTier: string,
    tierData: any,
  ): Promise<any> {
    const tierProgressions = {
      base: { next: 'verified', sales: 10, revenue: 100000 }, // £1,000
      verified: { next: 'performer', sales: 50, revenue: 500000 }, // £5,000
      performer: { next: 'elite', sales: 100, revenue: 1500000 }, // £15,000
      elite: null,
    };

    const progression =
      tierProgressions[currentTier as keyof typeof tierProgressions];
    if (!progression) return null;

    const currentSales = tierData.total_marketplace_sales || 0;
    const currentRevenue = tierData.total_marketplace_revenue_cents || 0;

    const salesNeeded = Math.max(0, progression.sales - currentSales);
    const revenueNeeded = Math.max(0, progression.revenue - currentRevenue);

    const salesProgress = (currentSales / progression.sales) * 100;
    const revenueProgress = (currentRevenue / progression.revenue) * 100;

    return {
      tier_name: progression.next,
      commission_rate:
        CommissionCalculationService.TIER_RATES[
          progression.next as keyof typeof CommissionCalculationService.TIER_RATES
        ],
      requirements: {
        sales_needed: salesNeeded,
        revenue_needed: revenueNeeded,
        current_sales: currentSales,
        current_revenue: currentRevenue / 100,
        progress_percentage: Math.max(salesProgress, revenueProgress),
      },
    };
  }

  private async getTierBenefits(tier: string): Promise<string[]> {
    const benefits = {
      base: [
        'Access to marketplace',
        'Standard 70% earnings rate',
        'Basic support',
      ],
      verified: [
        'Verified creator badge',
        'Priority support',
        '75% earnings rate',
        'Monthly analytics report',
      ],
      performer: [
        'Featured creator spotlight',
        'Early access to features',
        '80% earnings rate',
        'Custom storefront URL',
      ],
      elite: [
        'Dedicated account manager',
        'Co-marketing opportunities',
        '85% earnings rate',
        'API access for automation',
        'Exclusive creator events',
      ],
    };

    return benefits[tier as keyof typeof benefits] || benefits.base;
  }

  private async checkForTierUpgrade(
    creatorId: string,
  ): Promise<TierProgressUpdate | null> {
    try {
      // Use database function to calculate new tier
      const { data: newTierData, error } = await supabase.rpc(
        'calculate_creator_tier',
        { p_creator_id: creatorId },
      );

      if (error) {
        console.error('Error calculating tier:', error);
        return null;
      }

      const newTier = newTierData;
      const currentTierInfo = await this.getCreatorTier(creatorId);

      if (newTier && newTier !== currentTierInfo.current_tier) {
        // Tier upgrade detected
        const upgradeInfo: TierProgressUpdate = {
          creator_id: creatorId,
          previous_tier: currentTierInfo.current_tier,
          new_tier: newTier,
          tier_achieved_date: new Date().toISOString(),
          benefits_unlocked: await this.getTierBenefits(newTier),
          commission_rate_improvement:
            CommissionCalculationService.TIER_RATES[
              currentTierInfo.current_tier
            ] -
            CommissionCalculationService.TIER_RATES[
              newTier as keyof typeof CommissionCalculationService.TIER_RATES
            ],
        };

        // Note: Tier upgrade notification would be handled by database trigger
        return upgradeInfo;
      }

      return null;
    } catch (error) {
      console.error('Error checking tier upgrade:', error);
      return null;
    }
  }

  private async getNextMilestone(creatorId: string): Promise<any> {
    const tierInfo = await this.getCreatorTier(creatorId);

    if (!tierInfo.next_tier) {
      return null;
    }

    return {
      tier: tierInfo.next_tier.tier_name,
      sales_needed: tierInfo.next_tier.requirements.sales_needed,
      revenue_needed: tierInfo.next_tier.requirements.revenue_needed,
    };
  }
}

// =====================================================================================
// SINGLETON INSTANCE EXPORT
// =====================================================================================

export const commissionCalculationService = new CommissionCalculationService();
