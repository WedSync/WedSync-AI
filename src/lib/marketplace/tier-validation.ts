/**
 * WS-107: Marketplace Tier Validation Service
 *
 * Lightweight validation service for quick tier checks and caching.
 * Optimized for high-frequency permission validations.
 *
 * Created: 2025-01-23 (Team E, Batch 8, Round 1)
 */

import { tierAccessService } from './tier-access';
import { createClient } from '@supabase/supabase-js';

// Simple in-memory cache for tier benefits (5 minute TTL)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SimpleCache<T> {
  private cache = new Map<string, CacheEntry<T>>();

  set(key: string, data: T, ttlMs: number = 300000): void {
    // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }
}

// =====================================================================================
// TIER VALIDATION SERVICE
// =====================================================================================

export class TierValidationService {
  private tierBenefitsCache = new SimpleCache<any>();
  private userTierCache = new SimpleCache<string>();
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  /**
   * Quick validation for basic tier permissions without full access control
   * Used for UI rendering and client-side feature gates
   */
  async quickValidate(
    userId: string,
    requiredTier: string,
    action: string,
  ): Promise<{
    allowed: boolean;
    userTier: string;
    requiresUpgrade: boolean;
  }> {
    try {
      // Get user's current tier (cached)
      const userTier = await this.getUserTierCached(userId);

      // Get tier hierarchy levels
      const tierLevels = {
        free: 0,
        starter: 1,
        professional: 2,
        scale: 3,
        enterprise: 4,
      };

      const userLevel = tierLevels[userTier as keyof typeof tierLevels] || 0;
      const requiredLevel =
        tierLevels[requiredTier as keyof typeof tierLevels] || 0;

      const allowed = userLevel >= requiredLevel;

      return {
        allowed,
        userTier,
        requiresUpgrade: !allowed && userLevel < requiredLevel,
      };
    } catch (error) {
      console.error('Quick validation error:', error);
      return {
        allowed: false,
        userTier: 'free',
        requiresUpgrade: true,
      };
    }
  }

  /**
   * Validates specific feature access based on tier configuration
   */
  async validateFeatureAccess(
    userId: string,
    featureKey: string,
  ): Promise<{
    allowed: boolean;
    reason?: string;
    requiredTier?: string;
  }> {
    try {
      const userTier = await this.getUserTierCached(userId);
      const tierBenefits = await this.getTierBenefitsCached(userTier);

      if (!tierBenefits) {
        return {
          allowed: false,
          reason: 'Tier configuration not found',
          requiredTier: 'starter',
        };
      }

      // Check specific feature access based on tier benefits
      switch (featureKey) {
        case 'marketplace:browse':
          return {
            allowed: tierBenefits.can_browse,
            reason: tierBenefits.can_browse
              ? undefined
              : 'Browsing requires subscription',
            requiredTier: 'free',
          };

        case 'marketplace:purchase':
          return {
            allowed: tierBenefits.can_purchase,
            reason: tierBenefits.can_purchase
              ? undefined
              : 'Purchasing requires subscription',
            requiredTier: 'starter',
          };

        case 'marketplace:sell':
          return {
            allowed: tierBenefits.can_sell,
            reason: tierBenefits.can_sell
              ? undefined
              : 'Selling requires professional subscription',
            requiredTier: 'professional',
          };

        case 'marketplace:preview':
          return {
            allowed: tierBenefits.can_preview,
            reason: tierBenefits.can_preview
              ? undefined
              : 'Previews require subscription',
            requiredTier: 'starter',
          };

        case 'marketplace:analytics_advanced':
          return {
            allowed: ['advanced', 'premium'].includes(
              tierBenefits.analytics_level,
            ),
            reason:
              tierBenefits.analytics_level === 'advanced' ||
              tierBenefits.analytics_level === 'premium'
                ? undefined
                : 'Advanced analytics requires professional subscription',
            requiredTier: 'professional',
          };

        case 'marketplace:custom_storefront':
          return {
            allowed: tierBenefits.custom_storefront,
            reason: tierBenefits.custom_storefront
              ? undefined
              : 'Custom storefront requires enterprise subscription',
            requiredTier: 'enterprise',
          };

        default:
          return {
            allowed: false,
            reason: 'Unknown feature key',
            requiredTier: 'starter',
          };
      }
    } catch (error) {
      console.error('Feature access validation error:', error);
      return {
        allowed: false,
        reason: 'Validation error occurred',
        requiredTier: 'starter',
      };
    }
  }

  /**
   * Checks if user is approaching usage limits
   */
  async checkUsageLimits(
    userId: string,
    action: 'purchase' | 'preview',
  ): Promise<{
    nearLimit: boolean;
    limitReached: boolean;
    currentUsage: number;
    limit?: number;
    resetDate?: Date;
  }> {
    try {
      const userTier = await this.getUserTierCached(userId);
      const tierBenefits = await this.getTierBenefitsCached(userTier);

      if (!tierBenefits) {
        return {
          nearLimit: false,
          limitReached: false,
          currentUsage: 0,
        };
      }

      let currentUsage = 0;
      let limit: number | undefined;
      let resetDate: Date | undefined;

      if (action === 'purchase' && tierBenefits.monthly_purchase_limit) {
        // Check monthly purchase usage
        const currentMonth = new Date();
        currentMonth.setDate(1);
        currentMonth.setHours(0, 0, 0, 0);

        const { data: monthlyUsage } = await this.supabase
          .from('marketplace_monthly_usage')
          .select('purchase_count')
          .eq('supplier_id', userId)
          .eq('month_year', currentMonth.toISOString().split('T')[0])
          .single();

        currentUsage = monthlyUsage?.purchase_count || 0;
        limit = tierBenefits.monthly_purchase_limit;

        resetDate = new Date(currentMonth);
        resetDate.setMonth(resetDate.getMonth() + 1);
      } else if (action === 'preview' && tierBenefits.daily_preview_limit) {
        // Check daily preview usage
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { count } = await this.supabase
          .from('marketplace_usage_tracking')
          .select('id', { count: 'exact' })
          .eq('supplier_id', userId)
          .eq('action_type', 'preview')
          .gte('created_at', today.toISOString());

        currentUsage = count || 0;
        limit = tierBenefits.daily_preview_limit;

        resetDate = new Date(today);
        resetDate.setDate(resetDate.getDate() + 1);
      }

      const limitReached = limit ? currentUsage >= limit : false;
      const nearLimit = limit ? currentUsage >= limit * 0.8 : false; // 80% threshold

      return {
        nearLimit,
        limitReached,
        currentUsage,
        limit,
        resetDate,
      };
    } catch (error) {
      console.error('Usage limit check error:', error);
      return {
        nearLimit: false,
        limitReached: false,
        currentUsage: 0,
      };
    }
  }

  /**
   * Get recommended tier for user based on their usage patterns
   */
  async getRecommendedTier(userId: string): Promise<{
    recommendedTier: string;
    reason: string;
    potentialSavings?: number;
    currentCost: number;
    recommendedCost: number;
  }> {
    try {
      const userTier = await this.getUserTierCached(userId);
      const usageSummary = await tierAccessService.getUsageSummary(userId);

      if (!usageSummary) {
        return {
          recommendedTier: userTier,
          reason: 'Unable to analyze usage patterns',
          currentCost: this.getTierCost(userTier),
          recommendedCost: this.getTierCost(userTier),
        };
      }

      // Analyze usage patterns to recommend optimal tier
      const { currentMonth } = usageSummary;
      const blockedAttempts = currentMonth.blockedAttempts;

      // If user has many blocked attempts, recommend upgrade
      if (blockedAttempts > 5) {
        const recommendedTier =
          userTier === 'free' ? 'starter' : 'professional';
        return {
          recommendedTier,
          reason: `${blockedAttempts} blocked actions this month. Upgrade to unlock features.`,
          currentCost: this.getTierCost(userTier),
          recommendedCost: this.getTierCost(recommendedTier),
        };
      }

      // If user is near purchase limits, suggest higher tier
      if (
        usageSummary.limits.purchaseLimit &&
        usageSummary.limits.purchasesRemaining !== undefined
      ) {
        if (usageSummary.limits.purchasesRemaining <= 1) {
          return {
            recommendedTier: 'professional',
            reason:
              "You're near your monthly purchase limit. Professional tier offers unlimited purchases.",
            currentCost: this.getTierCost(userTier),
            recommendedCost: this.getTierCost('professional'),
          };
        }
      }

      // If user is very active, suggest professional tier
      const totalActivity =
        currentMonth.browseCount +
        currentMonth.previewCount +
        currentMonth.purchaseCount;
      if (totalActivity > 50 && userTier !== 'professional') {
        return {
          recommendedTier: 'professional',
          reason:
            'High marketplace activity detected. Professional tier offers better value and unlimited access.',
          currentCost: this.getTierCost(userTier),
          recommendedCost: this.getTierCost('professional'),
        };
      }

      return {
        recommendedTier: userTier,
        reason: 'Your current tier fits your usage patterns well.',
        currentCost: this.getTierCost(userTier),
        recommendedCost: this.getTierCost(userTier),
      };
    } catch (error) {
      console.error('Tier recommendation error:', error);
      return {
        recommendedTier: 'starter',
        reason: 'Unable to analyze usage patterns',
        currentCost: 0,
        recommendedCost: 29,
      };
    }
  }

  /**
   * Clear all caches (useful for testing or when subscription changes)
   */
  clearCache(): void {
    this.tierBenefitsCache.clear();
    this.userTierCache.clear();
  }

  // =====================================================================================
  // PRIVATE HELPER METHODS
  // =====================================================================================

  private async getUserTierCached(userId: string): Promise<string> {
    const cacheKey = `user_tier_${userId}`;
    const cached = this.userTierCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const { data } = await this.supabase
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

      const tier =
        data?.user_subscriptions[0]?.subscription_plans?.name || 'free';

      // Cache for 5 minutes
      this.userTierCache.set(cacheKey, tier, 300000);

      return tier;
    } catch (error) {
      console.error('Error getting user tier:', error);
      return 'free';
    }
  }

  private async getTierBenefitsCached(tier: string): Promise<any> {
    const cacheKey = `tier_benefits_${tier}`;
    const cached = this.tierBenefitsCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const benefits = await tierAccessService.getTierBenefits(tier);

    if (benefits) {
      // Cache for 10 minutes (tier benefits change rarely)
      this.tierBenefitsCache.set(cacheKey, benefits, 600000);
    }

    return benefits;
  }

  private getTierCost(tier: string): number {
    const pricing: Record<string, number> = {
      free: 0,
      starter: 29,
      professional: 99,
      scale: 299,
      enterprise: 999,
    };

    return pricing[tier] || 0;
  }
}

// =====================================================================================
// SINGLETON INSTANCE EXPORT
// =====================================================================================

export const tierValidationService = new TierValidationService();
