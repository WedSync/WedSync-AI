/**
 * WS-107: Marketplace Usage Tracking Service
 *
 * Comprehensive usage tracking and analytics service for marketplace
 * tier access control. Handles real-time usage monitoring, limit
 * enforcement, and usage analytics.
 *
 * Created: 2025-01-23 (Team E, Batch 8, Round 1)
 */

import { createClient } from '@supabase/supabase-js';
import { tierAccessService } from './tier-access';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

// =====================================================================================
// TYPE DEFINITIONS
// =====================================================================================

export interface UsageEvent {
  userId: string;
  action: 'browse' | 'preview' | 'purchase' | 'install' | 'sell_attempt';
  templateId?: string;
  templateCategory?: string;
  templatePriceCents?: number;
  blocked?: boolean;
  reason?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface UsageAnalytics {
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  totalEvents: number;
  eventsByType: Record<string, number>;
  blockedEvents: number;
  conversionRate: number;
  topCategories: Array<{
    category: string;
    count: number;
    revenue?: number;
  }>;
  tierDistribution: Record<string, number>;
  upgradeConversions: number;
}

export interface UsageLimitStatus {
  userId: string;
  tier: string;
  limits: {
    monthlyPurchases?: {
      current: number;
      limit: number;
      remaining: number;
      resetDate: Date;
    };
    dailyPreviews?: {
      current: number;
      limit: number;
      remaining: number;
      resetDate: Date;
    };
  };
  nearingLimits: boolean;
  limitExceeded: boolean;
}

// =====================================================================================
// USAGE TRACKING SERVICE
// =====================================================================================

export class UsageTrackingService {
  /**
   * Records a marketplace usage event with comprehensive tracking
   */
  async trackEvent(event: UsageEvent): Promise<void> {
    try {
      // Track the event using the database function for consistency
      await tierAccessService.trackUsage(
        event.userId,
        event.action,
        event.templateId,
        event.blocked || false,
        {
          templateCategory: event.templateCategory,
          templatePriceCents: event.templatePriceCents,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          sessionId: event.sessionId,
          ...event.metadata,
        },
      );

      // If this was a blocked event, check if we should create an upgrade prompt
      if (event.blocked && event.reason) {
        await this.handleBlockedEvent(event);
      }

      // Check for usage pattern anomalies
      await this.analyzeUsagePatterns(event.userId);
    } catch (error) {
      console.error('Failed to track usage event:', error);
      // Don't throw - usage tracking failures shouldn't break user flows
    }
  }

  /**
   * Gets comprehensive usage status for a user including limits
   */
  async getUserUsageStatus(userId: string): Promise<UsageLimitStatus | null> {
    try {
      // Get user's current tier
      const { data: tierData } = await supabase
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
        tierData?.user_subscriptions[0]?.subscription_plans?.name || 'free';

      // Get tier benefits for limits
      const tierBenefits = await tierAccessService.getTierBenefits(tier);
      if (!tierBenefits) {
        return null;
      }

      const limits: UsageLimitStatus['limits'] = {};
      let nearingLimits = false;
      let limitExceeded = false;

      // Check monthly purchase limits
      if (tierBenefits.monthlyPurchaseLimit) {
        const currentMonth = new Date();
        currentMonth.setDate(1);
        currentMonth.setHours(0, 0, 0, 0);

        const { data: monthlyUsage } = await supabase
          .from('marketplace_monthly_usage')
          .select('purchase_count')
          .eq('supplier_id', userId)
          .eq('month_year', currentMonth.toISOString().split('T')[0])
          .single();

        const currentPurchases = monthlyUsage?.purchase_count || 0;
        const remaining = Math.max(
          0,
          tierBenefits.monthlyPurchaseLimit - currentPurchases,
        );

        limits.monthlyPurchases = {
          current: currentPurchases,
          limit: tierBenefits.monthlyPurchaseLimit,
          remaining,
          resetDate: new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth() + 1,
            1,
          ),
        };

        if (currentPurchases >= tierBenefits.monthlyPurchaseLimit) {
          limitExceeded = true;
        } else if (
          currentPurchases >=
          tierBenefits.monthlyPurchaseLimit * 0.8
        ) {
          nearingLimits = true;
        }
      }

      // Check daily preview limits
      if (tierBenefits.dailyPreviewLimit) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { count: currentPreviews } = await supabase
          .from('marketplace_usage_tracking')
          .select('id', { count: 'exact' })
          .eq('supplier_id', userId)
          .eq('action_type', 'preview')
          .gte('created_at', today.toISOString());

        const remaining = Math.max(
          0,
          tierBenefits.dailyPreviewLimit - (currentPreviews || 0),
        );

        limits.dailyPreviews = {
          current: currentPreviews || 0,
          limit: tierBenefits.dailyPreviewLimit,
          remaining,
          resetDate: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        };

        if ((currentPreviews || 0) >= tierBenefits.dailyPreviewLimit) {
          limitExceeded = true;
        } else if (
          (currentPreviews || 0) >=
          tierBenefits.dailyPreviewLimit * 0.8
        ) {
          nearingLimits = true;
        }
      }

      return {
        userId,
        tier,
        limits,
        nearingLimits,
        limitExceeded,
      };
    } catch (error) {
      console.error('Error getting usage status:', error);
      return null;
    }
  }

  /**
   * Generates usage analytics for a specific period
   */
  async getUsageAnalytics(
    period: 'daily' | 'weekly' | 'monthly',
    startDate?: Date,
    endDate?: Date,
    userId?: string,
  ): Promise<UsageAnalytics | null> {
    try {
      // Calculate date range if not provided
      if (!startDate || !endDate) {
        const now = new Date();
        switch (period) {
          case 'daily':
            startDate = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
            );
            endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
            break;
          case 'weekly':
            const dayOfWeek = now.getDay();
            startDate = new Date(
              now.getTime() - dayOfWeek * 24 * 60 * 60 * 1000,
            );
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
            break;
          case 'monthly':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            break;
        }
      }

      // Build query
      let query = supabase
        .from('marketplace_usage_tracking')
        .select(
          'action_type, blocked_by_tier, template_category, template_price_cents, current_tier',
        )
        .gte('created_at', startDate.toISOString())
        .lt('created_at', endDate.toISOString());

      if (userId) {
        query = query.eq('supplier_id', userId);
      }

      const { data: usageData, error } = await query;

      if (error) {
        console.error('Error fetching usage analytics:', error);
        return null;
      }

      // Process analytics
      const totalEvents = usageData.length;
      const blockedEvents = usageData.filter((e) => e.blocked_by_tier).length;

      const eventsByType: Record<string, number> = {};
      const categoryCount: Record<string, number> = {};
      const categoryRevenue: Record<string, number> = {};
      const tierDistribution: Record<string, number> = {};

      usageData.forEach((event) => {
        // Count by action type
        eventsByType[event.action_type] =
          (eventsByType[event.action_type] || 0) + 1;

        // Count by category
        if (event.template_category) {
          categoryCount[event.template_category] =
            (categoryCount[event.template_category] || 0) + 1;

          if (
            event.template_price_cents &&
            event.action_type === 'purchase' &&
            !event.blocked_by_tier
          ) {
            categoryRevenue[event.template_category] =
              (categoryRevenue[event.template_category] || 0) +
              event.template_price_cents;
          }
        }

        // Count by tier
        if (event.current_tier) {
          tierDistribution[event.current_tier] =
            (tierDistribution[event.current_tier] || 0) + 1;
        }
      });

      // Calculate conversion rate (successful purchases / total purchase attempts)
      const purchaseAttempts =
        (eventsByType.purchase || 0) +
        usageData.filter(
          (e) => e.action_type === 'purchase' && e.blocked_by_tier,
        ).length;
      const successfulPurchases = eventsByType.purchase || 0;
      const conversionRate =
        purchaseAttempts > 0
          ? (successfulPurchases / purchaseAttempts) * 100
          : 0;

      // Get top categories
      const topCategories = Object.entries(categoryCount)
        .map(([category, count]) => ({
          category,
          count,
          revenue: categoryRevenue[category]
            ? categoryRevenue[category] / 100
            : undefined,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Get upgrade conversion count
      const upgradeConversions = await this.getUpgradeConversions(
        startDate,
        endDate,
        userId,
      );

      return {
        period,
        startDate,
        endDate,
        totalEvents,
        eventsByType,
        blockedEvents,
        conversionRate,
        topCategories,
        tierDistribution,
        upgradeConversions,
      };
    } catch (error) {
      console.error('Error generating usage analytics:', error);
      return null;
    }
  }

  /**
   * Gets usage trends for a user to identify patterns
   */
  async getUserUsageTrends(
    userId: string,
    days: number = 30,
  ): Promise<Array<{
    date: string;
    browseCount: number;
    previewCount: number;
    purchaseCount: number;
    blockedCount: number;
  }> | null> {
    try {
      const endDate = new Date();
      const startDate = new Date(
        endDate.getTime() - days * 24 * 60 * 60 * 1000,
      );

      const { data, error } = await supabase
        .from('marketplace_usage_tracking')
        .select('created_at, action_type, blocked_by_tier')
        .eq('supplier_id', userId)
        .gte('created_at', startDate.toISOString())
        .lt('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching usage trends:', error);
        return null;
      }

      // Group by date
      const dailyUsage: Record<
        string,
        {
          browseCount: number;
          previewCount: number;
          purchaseCount: number;
          blockedCount: number;
        }
      > = {};

      data.forEach((event) => {
        const date = new Date(event.created_at).toISOString().split('T')[0];

        if (!dailyUsage[date]) {
          dailyUsage[date] = {
            browseCount: 0,
            previewCount: 0,
            purchaseCount: 0,
            blockedCount: 0,
          };
        }

        if (event.blocked_by_tier) {
          dailyUsage[date].blockedCount++;
        } else {
          switch (event.action_type) {
            case 'browse':
              dailyUsage[date].browseCount++;
              break;
            case 'preview':
              dailyUsage[date].previewCount++;
              break;
            case 'purchase':
              dailyUsage[date].purchaseCount++;
              break;
          }
        }
      });

      // Convert to array and fill gaps
      const trends = [];
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];

        trends.push({
          date: dateStr,
          browseCount: dailyUsage[dateStr]?.browseCount || 0,
          previewCount: dailyUsage[dateStr]?.previewCount || 0,
          purchaseCount: dailyUsage[dateStr]?.purchaseCount || 0,
          blockedCount: dailyUsage[dateStr]?.blockedCount || 0,
        });
      }

      return trends;
    } catch (error) {
      console.error('Error getting usage trends:', error);
      return null;
    }
  }

  // =====================================================================================
  // PRIVATE HELPER METHODS
  // =====================================================================================

  private async handleBlockedEvent(event: UsageEvent): Promise<void> {
    try {
      // Determine appropriate upgrade tier based on blocked action
      let recommendedTier = 'starter';
      if (event.action === 'sell_attempt') {
        recommendedTier = 'professional';
      } else if (event.action === 'purchase') {
        recommendedTier = 'starter';
      }

      // Check if we've already shown similar prompts recently
      const recentPrompts = await supabase
        .from('marketplace_upgrade_prompts')
        .select('id')
        .eq('supplier_id', event.userId)
        .eq('prompt_type', this.getPromptType(event.action, !!event.blocked))
        .gte(
          'created_at',
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        )
        .limit(1);

      // Don't spam users with upgrade prompts
      if (recentPrompts.data && recentPrompts.data.length > 0) {
        return;
      }

      // Create upgrade prompt
      await supabase.from('marketplace_upgrade_prompts').insert({
        supplier_id: event.userId,
        prompt_type: this.getPromptType(event.action, !!event.blocked),
        current_tier: 'free', // This would be determined from user data
        recommended_tier: recommendedTier,
        blocked_template_id: event.templateId,
        blocked_action: event.action,
        template_category: event.templateCategory,
        estimated_monthly_value_cents: this.estimateMonthlyValue(
          event.action,
          recommendedTier,
        ),
      });
    } catch (error) {
      console.error('Error handling blocked event:', error);
    }
  }

  private async analyzeUsagePatterns(userId: string): Promise<void> {
    try {
      // Get recent usage (last 7 days)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const { data: recentUsage } = await supabase
        .from('marketplace_usage_tracking')
        .select('action_type, blocked_by_tier')
        .eq('supplier_id', userId)
        .gte('created_at', weekAgo.toISOString());

      if (!recentUsage || recentUsage.length === 0) {
        return;
      }

      const blockedCount = recentUsage.filter((u) => u.blocked_by_tier).length;
      const totalEvents = recentUsage.length;

      // If user has high blocked event ratio, consider them for upgrade targeting
      if (blockedCount / totalEvents > 0.3 && totalEvents > 10) {
        // Flag for marketing/sales follow-up
        console.log(
          `User ${userId} has high blocked event ratio: ${blockedCount}/${totalEvents}`,
        );
        // Could trigger email campaign, in-app notification, etc.
      }
    } catch (error) {
      console.error('Error analyzing usage patterns:', error);
    }
  }

  private async getUpgradeConversions(
    startDate: Date,
    endDate: Date,
    userId?: string,
  ): Promise<number> {
    try {
      let query = supabase
        .from('marketplace_upgrade_prompts')
        .select('id', { count: 'exact' })
        .eq('upgraded', true)
        .gte('upgraded_at', startDate.toISOString())
        .lt('upgraded_at', endDate.toISOString());

      if (userId) {
        query = query.eq('supplier_id', userId);
      }

      const { count } = await query;
      return count || 0;
    } catch (error) {
      console.error('Error getting upgrade conversions:', error);
      return 0;
    }
  }

  private getPromptType(action?: string, blocked?: boolean): string {
    if (!blocked) return 'engagement';

    switch (action) {
      case 'sell_attempt':
        return 'sell_blocked';
      case 'purchase':
        return 'purchase_blocked';
      case 'preview':
        return 'limit_reached';
      default:
        return 'access_blocked';
    }
  }

  private estimateMonthlyValue(action?: string, tier?: string): number {
    // Rough estimates in cents
    switch (action) {
      case 'sell_attempt':
        return tier === 'professional' ? 50000 : 100000; // $500-$1000 potential monthly earnings
      case 'purchase':
        return 20000; // $200 value from template purchases
      case 'preview':
        return 10000; // $100 value from time savings
      default:
        return 25000; // $250 general value
    }
  }
}

// =====================================================================================
// SINGLETON INSTANCE EXPORT
// =====================================================================================

export const usageTrackingService = new UsageTrackingService();
