/**
 * WS-115: Marketplace Purchase Analytics Service
 *
 * Comprehensive analytics tracking for marketplace purchases
 * Tracks conversion funnels, revenue metrics, and customer behavior
 *
 * Team C - Batch 9 - Round 1
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

// =====================================================================================
// TYPE DEFINITIONS
// =====================================================================================

interface PurchaseEvent {
  event_type:
    | 'view'
    | 'add_to_cart'
    | 'checkout_started'
    | 'payment_attempted'
    | 'purchase_completed'
    | 'refund_requested'
    | 'refund_completed';
  template_id: string;
  customer_id?: string;
  session_id?: string;
  purchase_id?: string;
  user_agent?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  metadata?: Record<string, any>;
}

interface ConversionFunnelData {
  template_id: string;
  views: number;
  checkout_starts: number;
  purchases: number;
  revenue_cents: number;
  conversion_rate: number;
  average_order_value: number;
}

interface RevenueMetrics {
  total_revenue_cents: number;
  total_purchases: number;
  average_order_value: number;
  refund_rate: number;
  period: string;
  currency: string;
}

interface CustomerAnalytics {
  customer_id: string;
  total_purchases: number;
  total_spent_cents: number;
  average_order_value: number;
  favorite_categories: string[];
  purchase_frequency: number;
  last_purchase_date?: string;
}

// =====================================================================================
// PURCHASE ANALYTICS SERVICE CLASS
// =====================================================================================

export class PurchaseAnalyticsService {
  // =====================================================================================
  // EVENT TRACKING
  // =====================================================================================

  /**
   * Track a purchase-related event
   */
  static async trackEvent(event: PurchaseEvent): Promise<void> {
    try {
      const { error } = await supabase
        .from('marketplace_analytics_events')
        .insert({
          event_type: event.event_type,
          template_id: event.template_id,
          customer_id: event.customer_id,
          session_id: event.session_id,
          purchase_id: event.purchase_id,
          user_agent: event.user_agent,
          referrer: event.referrer,
          utm_source: event.utm_source,
          utm_medium: event.utm_medium,
          utm_campaign: event.utm_campaign,
          metadata: event.metadata,
          occurred_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Failed to track purchase event:', error);
      }
    } catch (error) {
      console.error('Purchase event tracking error:', error);
    }
  }

  /**
   * Track template view
   */
  static async trackTemplateView(
    templateId: string,
    customerId?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.trackEvent({
      event_type: 'view',
      template_id: templateId,
      customer_id: customerId,
      metadata,
    });
  }

  /**
   * Track checkout initiation
   */
  static async trackCheckoutStarted(
    templateId: string,
    customerId?: string,
    sessionId?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.trackEvent({
      event_type: 'checkout_started',
      template_id: templateId,
      customer_id: customerId,
      session_id: sessionId,
      metadata,
    });
  }

  /**
   * Track payment attempt
   */
  static async trackPaymentAttempted(
    purchaseId: string,
    templateId: string,
    customerId?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.trackEvent({
      event_type: 'payment_attempted',
      template_id: templateId,
      customer_id: customerId,
      purchase_id: purchaseId,
      metadata,
    });
  }

  /**
   * Track completed purchase
   */
  static async trackPurchaseCompleted(
    purchaseId: string,
    templateId: string,
    customerId?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.trackEvent({
      event_type: 'purchase_completed',
      template_id: templateId,
      customer_id: customerId,
      purchase_id: purchaseId,
      metadata,
    });
  }

  // =====================================================================================
  // CONVERSION FUNNEL ANALYSIS
  // =====================================================================================

  /**
   * Get conversion funnel data for a specific template
   */
  static async getTemplateFunnel(
    templateId: string,
    days: number = 30,
  ): Promise<ConversionFunnelData | null> {
    try {
      const since = new Date(
        Date.now() - days * 24 * 60 * 60 * 1000,
      ).toISOString();

      // Get event counts
      const { data: eventData, error: eventError } = await supabase
        .from('marketplace_analytics_events')
        .select('event_type, template_id')
        .eq('template_id', templateId)
        .gte('occurred_at', since);

      if (eventError) {
        console.error('Failed to fetch funnel data:', eventError);
        return null;
      }

      const views =
        eventData?.filter((e) => e.event_type === 'view').length || 0;
      const checkoutStarts =
        eventData?.filter((e) => e.event_type === 'checkout_started').length ||
        0;
      const purchases =
        eventData?.filter((e) => e.event_type === 'purchase_completed')
          .length || 0;

      // Get revenue data
      const { data: revenueData, error: revenueError } = await supabase
        .from('marketplace_purchases')
        .select('final_price_cents')
        .eq('template_id', templateId)
        .eq('status', 'completed')
        .gte('created_at', since);

      if (revenueError) {
        console.error('Failed to fetch revenue data:', revenueError);
        return null;
      }

      const revenueCents =
        revenueData?.reduce(
          (sum, purchase) => sum + (purchase.final_price_cents || 0),
          0,
        ) || 0;
      const conversionRate = views > 0 ? (purchases / views) * 100 : 0;
      const averageOrderValue = purchases > 0 ? revenueCents / purchases : 0;

      return {
        template_id: templateId,
        views,
        checkout_starts: checkoutStarts,
        purchases,
        revenue_cents: revenueCents,
        conversion_rate: conversionRate,
        average_order_value: averageOrderValue,
      };
    } catch (error) {
      console.error('Template funnel analysis error:', error);
      return null;
    }
  }

  /**
   * Get conversion funnel data for all templates
   */
  static async getAllTemplatesFunnel(
    days: number = 30,
  ): Promise<ConversionFunnelData[]> {
    try {
      const since = new Date(
        Date.now() - days * 24 * 60 * 60 * 1000,
      ).toISOString();

      // Get all active templates
      const { data: templates, error: templatesError } = await supabase
        .from('marketplace_templates')
        .select('id')
        .eq('status', 'active');

      if (templatesError || !templates) {
        console.error('Failed to fetch templates:', templatesError);
        return [];
      }

      // Get funnel data for each template
      const funnelPromises = templates.map((template) =>
        this.getTemplateFunnel(template.id, days),
      );

      const funnelResults = await Promise.all(funnelPromises);
      return funnelResults.filter(
        (result): result is ConversionFunnelData => result !== null,
      );
    } catch (error) {
      console.error('All templates funnel analysis error:', error);
      return [];
    }
  }

  // =====================================================================================
  // REVENUE ANALYTICS
  // =====================================================================================

  /**
   * Get revenue metrics for a specific period
   */
  static async getRevenueMetrics(
    days: number = 30,
    creatorId?: string,
  ): Promise<RevenueMetrics | null> {
    try {
      const since = new Date(
        Date.now() - days * 24 * 60 * 60 * 1000,
      ).toISOString();

      let query = supabase
        .from('marketplace_purchases')
        .select('final_price_cents, currency, status, created_at')
        .in('status', ['completed', 'installed'])
        .gte('created_at', since);

      if (creatorId) {
        query = query.eq('creator_id', creatorId);
      }

      const { data: purchases, error: purchasesError } = await query;

      if (purchasesError) {
        console.error('Failed to fetch revenue data:', purchasesError);
        return null;
      }

      if (!purchases || purchases.length === 0) {
        return {
          total_revenue_cents: 0,
          total_purchases: 0,
          average_order_value: 0,
          refund_rate: 0,
          period: `${days} days`,
          currency: 'GBP',
        };
      }

      const totalRevenueCents = purchases.reduce(
        (sum, purchase) => sum + (purchase.final_price_cents || 0),
        0,
      );
      const totalPurchases = purchases.length;
      const averageOrderValue =
        totalPurchases > 0 ? totalRevenueCents / totalPurchases : 0;

      // Get refund data
      const { data: refunds, error: refundsError } = await supabase
        .from('marketplace_refunds')
        .select('purchase_id')
        .eq('status', 'completed')
        .gte('requested_at', since);

      if (refundsError) {
        console.error('Failed to fetch refund data:', refundsError);
      }

      const refundCount = refunds?.length || 0;
      const refundRate =
        totalPurchases > 0 ? (refundCount / totalPurchases) * 100 : 0;

      return {
        total_revenue_cents: totalRevenueCents,
        total_purchases: totalPurchases,
        average_order_value: averageOrderValue,
        refund_rate: refundRate,
        period: `${days} days`,
        currency: purchases[0].currency || 'GBP',
      };
    } catch (error) {
      console.error('Revenue metrics calculation error:', error);
      return null;
    }
  }

  /**
   * Get top-performing templates by revenue
   */
  static async getTopTemplatesByRevenue(
    limit: number = 10,
    days: number = 30,
  ): Promise<
    Array<{
      template_id: string;
      template_title: string;
      revenue_cents: number;
      purchase_count: number;
      conversion_rate: number;
    }>
  > {
    try {
      const since = new Date(
        Date.now() - days * 24 * 60 * 60 * 1000,
      ).toISOString();

      const { data, error } = await supabase
        .from('marketplace_purchases')
        .select(
          `
          template_id,
          final_price_cents,
          marketplace_templates!inner (
            title
          )
        `,
        )
        .in('status', ['completed', 'installed'])
        .gte('created_at', since);

      if (error || !data) {
        console.error('Failed to fetch top templates by revenue:', error);
        return [];
      }

      // Aggregate by template
      const templateStats = data.reduce(
        (acc, purchase) => {
          const templateId = purchase.template_id;
          if (!acc[templateId]) {
            acc[templateId] = {
              template_id: templateId,
              template_title:
                purchase.marketplace_templates?.title || 'Unknown',
              revenue_cents: 0,
              purchase_count: 0,
            };
          }
          acc[templateId].revenue_cents += purchase.final_price_cents || 0;
          acc[templateId].purchase_count += 1;
          return acc;
        },
        {} as Record<string, any>,
      );

      // Get conversion rates
      const templatesWithStats = await Promise.all(
        Object.values(templateStats).map(async (template: any) => {
          const funnelData = await this.getTemplateFunnel(
            template.template_id,
            days,
          );
          return {
            ...template,
            conversion_rate: funnelData?.conversion_rate || 0,
          };
        }),
      );

      // Sort by revenue and return top templates
      return templatesWithStats
        .sort((a, b) => b.revenue_cents - a.revenue_cents)
        .slice(0, limit);
    } catch (error) {
      console.error('Top templates by revenue error:', error);
      return [];
    }
  }

  // =====================================================================================
  // CUSTOMER ANALYTICS
  // =====================================================================================

  /**
   * Get customer purchase analytics
   */
  static async getCustomerAnalytics(
    customerId: string,
  ): Promise<CustomerAnalytics | null> {
    try {
      // Get customer purchases
      const { data: purchases, error: purchasesError } = await supabase
        .from('marketplace_purchases')
        .select(
          `
          final_price_cents,
          created_at,
          marketplace_templates!inner (
            category,
            subcategory
          )
        `,
        )
        .eq('customer_id', customerId)
        .in('status', ['completed', 'installed']);

      if (purchasesError) {
        console.error('Failed to fetch customer purchases:', purchasesError);
        return null;
      }

      if (!purchases || purchases.length === 0) {
        return {
          customer_id: customerId,
          total_purchases: 0,
          total_spent_cents: 0,
          average_order_value: 0,
          favorite_categories: [],
          purchase_frequency: 0,
        };
      }

      const totalPurchases = purchases.length;
      const totalSpentCents = purchases.reduce(
        (sum, purchase) => sum + (purchase.final_price_cents || 0),
        0,
      );
      const averageOrderValue = totalSpentCents / totalPurchases;

      // Calculate favorite categories
      const categoryCount = purchases.reduce(
        (acc, purchase) => {
          const category = purchase.marketplace_templates?.category;
          if (category) {
            acc[category] = (acc[category] || 0) + 1;
          }
          return acc;
        },
        {} as Record<string, number>,
      );

      const favoriteCategories = Object.entries(categoryCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([category]) => category);

      // Calculate purchase frequency (purchases per month)
      const firstPurchaseDate = new Date(
        Math.min(...purchases.map((p) => new Date(p.created_at).getTime())),
      );
      const monthsSinceFirst = Math.max(
        1,
        (Date.now() - firstPurchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30),
      );
      const purchaseFrequency = totalPurchases / monthsSinceFirst;

      const lastPurchaseDate = Math.max(
        ...purchases.map((p) => new Date(p.created_at).getTime()),
      );

      return {
        customer_id: customerId,
        total_purchases: totalPurchases,
        total_spent_cents: totalSpentCents,
        average_order_value: averageOrderValue,
        favorite_categories: favoriteCategories,
        purchase_frequency: purchaseFrequency,
        last_purchase_date: new Date(lastPurchaseDate).toISOString(),
      };
    } catch (error) {
      console.error('Customer analytics error:', error);
      return null;
    }
  }

  // =====================================================================================
  // COHORT ANALYSIS
  // =====================================================================================

  /**
   * Get customer cohort data
   */
  static async getCohortAnalysis(months: number = 12): Promise<
    Array<{
      cohort_month: string;
      customers_count: number;
      total_revenue_cents: number;
      repeat_purchase_rate: number;
    }>
  > {
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const { data: purchases, error } = await supabase
        .from('marketplace_purchases')
        .select('customer_id, created_at, final_price_cents')
        .in('status', ['completed', 'installed'])
        .gte('created_at', startDate.toISOString())
        .order('created_at');

      if (error || !purchases) {
        console.error('Failed to fetch cohort data:', error);
        return [];
      }

      // Group by month
      const cohortData: Record<
        string,
        {
          customers: Set<string>;
          revenue_cents: number;
          repeat_customers: Set<string>;
        }
      > = {};

      const customerFirstPurchase: Record<string, string> = {};

      purchases.forEach((purchase) => {
        const month = new Date(purchase.created_at).toISOString().slice(0, 7); // YYYY-MM

        if (!cohortData[month]) {
          cohortData[month] = {
            customers: new Set(),
            revenue_cents: 0,
            repeat_customers: new Set(),
          };
        }

        cohortData[month].customers.add(purchase.customer_id);
        cohortData[month].revenue_cents += purchase.final_price_cents || 0;

        // Track repeat customers
        if (customerFirstPurchase[purchase.customer_id]) {
          if (customerFirstPurchase[purchase.customer_id] !== month) {
            cohortData[month].repeat_customers.add(purchase.customer_id);
          }
        } else {
          customerFirstPurchase[purchase.customer_id] = month;
        }
      });

      // Convert to array format
      return Object.entries(cohortData)
        .map(([month, data]) => ({
          cohort_month: month,
          customers_count: data.customers.size,
          total_revenue_cents: data.revenue_cents,
          repeat_purchase_rate:
            data.customers.size > 0
              ? (data.repeat_customers.size / data.customers.size) * 100
              : 0,
        }))
        .sort((a, b) => a.cohort_month.localeCompare(b.cohort_month));
    } catch (error) {
      console.error('Cohort analysis error:', error);
      return [];
    }
  }

  // =====================================================================================
  // A/B TESTING SUPPORT
  // =====================================================================================

  /**
   * Track A/B test event for purchase flows
   */
  static async trackABTestEvent(
    testName: string,
    variant: string,
    templateId: string,
    customerId?: string,
    event: 'impression' | 'click' | 'conversion' = 'impression',
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      const { error } = await supabase.from('ab_test_events').insert({
        test_name: testName,
        variant,
        event_type: event,
        template_id: templateId,
        customer_id: customerId,
        metadata,
        occurred_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Failed to track A/B test event:', error);
      }
    } catch (error) {
      console.error('A/B test tracking error:', error);
    }
  }

  // =====================================================================================
  // UTILITY METHODS
  // =====================================================================================

  /**
   * Format currency amount for display
   */
  static formatCurrency(cents: number, currency: string = 'GBP'): string {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
    }).format(cents / 100);
  }

  /**
   * Calculate percentage change between two values
   */
  static calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  /**
   * Get date range for analytics queries
   */
  static getDateRange(days: number): { start: string; end: string } {
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }
}

export default PurchaseAnalyticsService;
