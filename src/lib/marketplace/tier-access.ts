/**
 * WS-107: Marketplace Tier Access Control Service
 *
 * Comprehensive service for managing subscription tier access control
 * in the marketplace. Handles permission validation, usage tracking,
 * and upgrade prompt generation.
 *
 * Created: 2025-01-23 (Team E, Batch 8, Round 1)
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role for database operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

// =====================================================================================
// TYPE DEFINITIONS
// =====================================================================================

export interface TierBenefits {
  tier: string;
  canBrowse: boolean;
  canPurchase: boolean;
  canSell: boolean;
  canPreview: boolean;
  monthlyPurchaseLimit?: number;
  dailyPreviewLimit?: number;
  listingLimit?: number;
  commissionRate?: number;
  analyticsLevel: string;
  promotionLevel: string;
  accessCategories: string[];
  premiumTemplates: boolean;
  featuredCreator: boolean;
  customStorefront: boolean;
}

export interface AccessValidationResult {
  allowed: boolean;
  reason?: string;
  requiredTier?: string;
  currentTier: string;
  usageLimitExceeded?: boolean;
  currentUsage?: number;
  usageLimit?: number;
  upgradeOptions?: UpgradeOptions;
}

export interface UpgradeOptions {
  currentTier: string;
  recommendedTier: string;
  benefits: string[];
  priceIncrease: number;
  upgradeUrl: string;
  estimatedMonthlyValue?: number;
}

export interface UsageSummary {
  currentMonth: {
    browseCount: number;
    previewCount: number;
    purchaseCount: number;
    installCount: number;
    blockedAttempts: number;
  };
  limits: {
    purchaseLimit?: number;
    previewLimit?: number;
    purchasesRemaining?: number;
    previewsRemaining?: number;
  };
  upgradePrompts: UpgradePrompt[];
}

export interface UpgradePrompt {
  type: string;
  templateCategory?: string;
  estimatedValue?: number;
  recommendedTier: string;
  benefits: string[];
}

export interface SellerEligibilityResult {
  eligible: boolean;
  reason?: string;
  requirements: Array<{
    requirement: string;
    status: 'met' | 'pending' | 'not_met';
    details?: string;
  }>;
}

// =====================================================================================
// MAIN TIER ACCESS SERVICE CLASS
// =====================================================================================

export class TierAccessService {
  private tierHierarchy = {
    free: 0,
    starter: 1,
    professional: 2,
    scale: 3,
    enterprise: 4,
  };

  private tierPricing = {
    free: 0,
    starter: 29,
    professional: 99,
    scale: 299,
    enterprise: 999,
  };

  /**
   * Validates if a user has permission to perform a marketplace action
   * This is the main entry point for tier access control
   */
  async validateAccess(
    userId: string,
    action: 'browse' | 'purchase' | 'sell' | 'preview',
    templateId?: string,
    context?: Record<string, any>,
  ): Promise<AccessValidationResult> {
    try {
      // Call the optimized database function for permission checking
      const { data: accessResult, error } = await supabase.rpc(
        'check_marketplace_tier_access',
        {
          p_supplier_id: userId,
          p_action: action,
          p_template_id: templateId,
        },
      );

      if (error) {
        console.error('Database error in tier access validation:', error);
        return {
          allowed: false,
          reason: 'System error occurred',
          currentTier: 'free',
        };
      }

      const result = accessResult[0];

      // Track the access attempt (both successful and failed)
      await this.trackUsage(
        userId,
        action,
        templateId,
        !result.access_granted,
        context,
      );

      // Log audit trail for compliance
      await this.logAccessAudit(
        userId,
        action,
        templateId ? 'template' : 'marketplace_feature',
        templateId,
        result.access_granted,
        result.reason,
        result.current_tier,
        result.required_tier,
        context,
      );

      // If access denied, generate upgrade options
      let upgradeOptions: UpgradeOptions | undefined;
      if (!result.access_granted && result.required_tier) {
        upgradeOptions = await this.generateUpgradeOptions(
          result.current_tier,
          result.required_tier,
          action,
          templateId,
          context,
        );

        // Create upgrade prompt for tracking
        await this.createUpgradePrompt(
          userId,
          this.getPromptType(action, result.usage_limit_exceeded),
          result.current_tier,
          result.required_tier,
          templateId,
          action,
          context?.templateCategory,
          upgradeOptions.estimatedMonthlyValue,
        );
      }

      return {
        allowed: result.access_granted,
        reason: result.reason,
        requiredTier: result.required_tier,
        currentTier: result.current_tier,
        usageLimitExceeded: result.usage_limit_exceeded,
        currentUsage: result.current_usage,
        usageLimit: result.usage_limit,
        upgradeOptions,
      };
    } catch (error) {
      console.error('Tier access validation error:', error);

      // Log the error for monitoring
      await this.logAccessAudit(
        userId,
        action,
        templateId ? 'template' : 'marketplace_feature',
        templateId,
        false,
        'System error during validation',
        'unknown',
        undefined,
        context,
      );

      return {
        allowed: false,
        reason: 'Validation error occurred',
        currentTier: 'free',
      };
    }
  }

  /**
   * Tracks marketplace usage and updates monthly aggregations
   */
  async trackUsage(
    userId: string,
    action: string,
    templateId?: string,
    blocked: boolean = false,
    context?: Record<string, any>,
  ): Promise<void> {
    try {
      await supabase.rpc('track_marketplace_usage', {
        p_supplier_id: userId,
        p_action_type: action,
        p_template_id: templateId,
        p_blocked_by_tier: blocked,
        p_template_category: context?.templateCategory,
        p_template_price_cents: context?.templatePriceCents,
        p_ip_address: context?.ipAddress,
        p_user_agent: context?.userAgent,
        p_session_id: context?.sessionId,
      });
    } catch (error) {
      console.error('Failed to track usage:', error);
      // Don't throw - usage tracking failures shouldn't block the operation
    }
  }

  /**
   * Gets tier benefits for a specific tier
   */
  async getTierBenefits(tier: string): Promise<TierBenefits | null> {
    try {
      const { data, error } = await supabase
        .from('marketplace_tier_benefits')
        .select('*')
        .eq('tier', tier)
        .single();

      if (error || !data) {
        console.error('Failed to fetch tier benefits:', error);
        return null;
      }

      return {
        tier: data.tier,
        canBrowse: data.can_browse,
        canPurchase: data.can_purchase,
        canSell: data.can_sell,
        canPreview: data.can_preview,
        monthlyPurchaseLimit: data.monthly_purchase_limit,
        dailyPreviewLimit: data.daily_preview_limit,
        listingLimit: data.listing_limit,
        commissionRate: data.commission_rate,
        analyticsLevel: data.analytics_level,
        promotionLevel: data.promotion_level,
        accessCategories: data.access_categories || [],
        premiumTemplates: data.premium_templates,
        featuredCreator: data.featured_creator,
        customStorefront: data.custom_storefront,
      };
    } catch (error) {
      console.error('Error fetching tier benefits:', error);
      return null;
    }
  }

  /**
   * Gets comprehensive usage summary for a user
   */
  async getUsageSummary(userId: string): Promise<UsageSummary | null> {
    try {
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      // Get monthly usage data
      const { data: monthlyData, error: monthlyError } = await supabase
        .from('marketplace_monthly_usage')
        .select('*')
        .eq('supplier_id', userId)
        .eq('month_year', currentMonth.toISOString().split('T')[0])
        .single();

      if (monthlyError && monthlyError.code !== 'PGRST116') {
        console.error('Error fetching monthly usage:', monthlyError);
      }

      // Get current tier benefits for limits
      const userTier = await this.getUserCurrentTier(userId);
      const tierBenefits = await this.getTierBenefits(userTier);

      // Get recent upgrade prompts
      const { data: upgradePrompts } = await supabase
        .from('marketplace_upgrade_prompts')
        .select(
          'prompt_type, template_category, estimated_monthly_value_cents, recommended_tier',
        )
        .eq('supplier_id', userId)
        .eq('prompt_shown', false)
        .order('created_at', { ascending: false })
        .limit(3);

      const currentMonth_usage = monthlyData || {
        browse_count: 0,
        preview_count: 0,
        purchase_count: 0,
        install_count: 0,
        blocked_purchase_count: 0,
        blocked_sell_count: 0,
      };

      return {
        currentMonth: {
          browseCount: currentMonth_usage.browse_count,
          previewCount: currentMonth_usage.preview_count,
          purchaseCount: currentMonth_usage.purchase_count,
          installCount: currentMonth_usage.install_count,
          blockedAttempts:
            currentMonth_usage.blocked_purchase_count +
            currentMonth_usage.blocked_sell_count,
        },
        limits: {
          purchaseLimit: tierBenefits?.monthlyPurchaseLimit,
          previewLimit: tierBenefits?.dailyPreviewLimit,
          purchasesRemaining: tierBenefits?.monthlyPurchaseLimit
            ? Math.max(
                0,
                tierBenefits.monthlyPurchaseLimit -
                  currentMonth_usage.purchase_count,
              )
            : undefined,
          previewsRemaining: tierBenefits?.dailyPreviewLimit
            ? Math.max(
                0,
                tierBenefits.dailyPreviewLimit -
                  (await this.getDailyPreviewCount(userId)),
              )
            : undefined,
        },
        upgradePrompts: (upgradePrompts || []).map((prompt) => ({
          type: prompt.prompt_type,
          templateCategory: prompt.template_category,
          estimatedValue: prompt.estimated_monthly_value_cents
            ? prompt.estimated_monthly_value_cents / 100
            : undefined,
          recommendedTier: prompt.recommended_tier,
          benefits: this.getTierBenefitsList(prompt.recommended_tier),
        })),
      };
    } catch (error) {
      console.error('Error getting usage summary:', error);
      return null;
    }
  }

  /**
   * Checks seller eligibility for marketplace selling
   */
  async checkSellerEligibility(
    userId: string,
  ): Promise<SellerEligibilityResult> {
    try {
      // Get seller eligibility record
      const { data: eligibility } = await supabase
        .from('marketplace_seller_eligibility')
        .select('*')
        .eq('supplier_id', userId)
        .single();

      // Get user's current tier and account info
      const currentTier = await this.getUserCurrentTier(userId);
      const { data: supplierInfo } = await supabase
        .from('suppliers')
        .select('created_at')
        .eq('id', userId)
        .single();

      const requirements = [
        {
          requirement: 'Professional tier or higher subscription',
          status: this.getTierLevel(currentTier) >= 2 ? 'met' : 'not_met',
          details:
            currentTier >= 'professional'
              ? 'Current tier qualifies'
              : `Current tier: ${currentTier}`,
        },
        {
          requirement: 'Account age minimum (30 days)',
          status:
            this.getAccountAgeDays(supplierInfo?.created_at) >= 30
              ? 'met'
              : 'not_met',
          details: `Account created ${this.getAccountAgeDays(supplierInfo?.created_at)} days ago`,
        },
        {
          requirement: 'Seller verification approved',
          status:
            eligibility?.verification_status === 'approved'
              ? 'met'
              : eligibility?.verification_status === 'pending'
                ? 'pending'
                : 'not_met',
          details: eligibility?.verification_status || 'Not applied',
        },
      ];

      const allRequirementsMet = requirements.every(
        (req) => req.status === 'met',
      );

      return {
        eligible: allRequirementsMet,
        reason: allRequirementsMet
          ? undefined
          : 'Seller requirements not fully met',
        requirements,
      };
    } catch (error) {
      console.error('Error checking seller eligibility:', error);
      return {
        eligible: false,
        reason: 'System error checking eligibility',
        requirements: [],
      };
    }
  }

  // =====================================================================================
  // PRIVATE HELPER METHODS
  // =====================================================================================

  private async getUserCurrentTier(userId: string): Promise<string> {
    try {
      const { data } = await supabase
        .from('suppliers')
        .select(
          `
          id,
          user_subscriptions!inner(
            status,
            subscription_plans!inner(name)
          )
        `,
        )
        .eq('id', userId)
        .eq('user_subscriptions.status', 'active')
        .single();

      return data?.user_subscriptions[0]?.subscription_plans?.name || 'free';
    } catch (error) {
      console.error('Error getting user tier:', error);
      return 'free';
    }
  }

  private async generateUpgradeOptions(
    currentTier: string,
    requiredTier: string,
    action: string,
    templateId?: string,
    context?: Record<string, any>,
  ): Promise<UpgradeOptions> {
    const recommendedTier = this.getOptimalUpgradeTier(
      currentTier,
      requiredTier,
    );
    const benefits = this.getTierBenefitsList(recommendedTier);
    const priceIncrease = this.calculatePriceIncrease(
      currentTier,
      recommendedTier,
    );

    // Calculate estimated monthly value based on action and context
    const estimatedMonthlyValue = this.calculateEstimatedValue(
      action,
      recommendedTier,
      context,
    );

    return {
      currentTier,
      recommendedTier,
      benefits: benefits.slice(0, 4), // Top 4 benefits
      priceIncrease,
      upgradeUrl: `/billing/upgrade?from=${currentTier}&to=${recommendedTier}&action=${action}${templateId ? `&template=${templateId}` : ''}`,
      estimatedMonthlyValue,
    };
  }

  private async createUpgradePrompt(
    userId: string,
    promptType: string,
    currentTier: string,
    recommendedTier: string,
    templateId?: string,
    action?: string,
    templateCategory?: string,
    estimatedValue?: number,
  ): Promise<void> {
    try {
      await supabase.rpc('create_upgrade_prompt', {
        p_supplier_id: userId,
        p_prompt_type: promptType,
        p_current_tier: currentTier,
        p_recommended_tier: recommendedTier,
        p_blocked_template_id: templateId,
        p_blocked_action: action,
        p_template_category: templateCategory,
        p_estimated_monthly_value_cents: estimatedValue
          ? Math.round(estimatedValue * 100)
          : null,
      });
    } catch (error) {
      console.error('Failed to create upgrade prompt:', error);
    }
  }

  private async logAccessAudit(
    userId: string,
    action: string,
    resourceType?: string,
    resourceId?: string,
    accessGranted: boolean = false,
    reason: string = 'No reason provided',
    currentTier: string = 'unknown',
    requiredTier?: string,
    context?: Record<string, any>,
  ): Promise<void> {
    try {
      await supabase.rpc('log_tier_access_audit', {
        p_supplier_id: userId,
        p_action_attempted: action,
        p_resource_type: resourceType,
        p_resource_id: resourceId,
        p_access_granted: accessGranted,
        p_decision_reason: reason,
        p_current_tier: currentTier,
        p_required_tier: requiredTier,
        p_ip_address: context?.ipAddress,
        p_user_agent: context?.userAgent,
        p_session_id: context?.sessionId,
        p_request_metadata: context ? JSON.stringify(context) : '{}',
      });
    } catch (error) {
      console.error('Failed to log access audit:', error);
      // Don't throw - audit logging failures shouldn't block operations
    }
  }

  private async getDailyPreviewCount(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from('marketplace_usage_tracking')
      .select('id', { count: 'exact' })
      .eq('supplier_id', userId)
      .eq('action_type', 'preview')
      .gte('created_at', today.toISOString());

    return count || 0;
  }

  private getTierLevel(tier: string): number {
    return this.tierHierarchy[tier as keyof typeof this.tierHierarchy] || 0;
  }

  private getPromptType(action: string, usageLimitExceeded?: boolean): string {
    if (usageLimitExceeded) return 'limit_reached';
    if (action === 'sell') return 'sell_blocked';
    if (action === 'purchase') return 'purchase_blocked';
    return 'access_blocked';
  }

  private getOptimalUpgradeTier(
    currentTier: string,
    requiredTier: string,
  ): string {
    // Return the minimum required tier, or suggest professional as good middle ground
    const currentLevel = this.getTierLevel(currentTier);
    const requiredLevel = this.getTierLevel(requiredTier);

    if (requiredLevel <= 2) return 'professional'; // Professional is sweet spot
    return requiredTier;
  }

  private getTierBenefitsList(tier: string): string[] {
    const benefitMap: Record<string, string[]> = {
      starter: [
        'Purchase marketplace templates',
        'Preview templates before buying',
        '5 template purchases per month',
        'Access to basic template categories',
      ],
      professional: [
        'Unlimited template purchases',
        'Sell your own templates for 70% commission',
        'Access to all template categories',
        'Advanced marketplace analytics',
      ],
      scale: [
        'All professional features',
        'Earn 75% commission on template sales',
        'Featured creator status',
        'Up to 50 template listings',
      ],
      enterprise: [
        'All scale features',
        'Earn 80% commission on template sales',
        'Custom marketplace storefront',
        'Unlimited template listings',
      ],
    };

    return benefitMap[tier] || [];
  }

  private calculatePriceIncrease(fromTier: string, toTier: string): number {
    const fromPrice =
      this.tierPricing[fromTier as keyof typeof this.tierPricing] || 0;
    const toPrice =
      this.tierPricing[toTier as keyof typeof this.tierPricing] || 0;

    return Math.max(0, toPrice - fromPrice);
  }

  private calculateEstimatedValue(
    action: string,
    tier: string,
    context?: Record<string, any>,
  ): number {
    // Estimate monthly value based on action type and tier benefits
    switch (action) {
      case 'sell':
        // Estimate earnings potential from selling templates
        return tier === 'professional' ? 500 : tier === 'scale' ? 1200 : 2000;
      case 'purchase':
        // Estimate value from being able to purchase templates
        return tier === 'starter' ? 200 : 400;
      case 'preview':
        // Estimate time savings from unlimited previews
        return 100;
      default:
        return 250; // Default estimated value
    }
  }

  private getAccountAgeDays(createdAt?: string): number {
    if (!createdAt) return 0;
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

// =====================================================================================
// SINGLETON INSTANCE EXPORT
// =====================================================================================

export const tierAccessService = new TierAccessService();
