// WS-131: Revenue Analytics Service
// Comprehensive MRR, churn, cohort analysis, and business intelligence

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';

export interface RevenueMetrics {
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  churn_rate: number;
  ltv: number; // Customer Lifetime Value
  arpu: number; // Average Revenue Per User
  total_customers: number;
  active_subscriptions: number;
  trial_conversions: number;
  growth_rate: number;
}

export interface CohortData {
  cohort: string; // YYYY-MM
  customers_acquired: number;
  revenue_month_0: number;
  revenue_month_1: number;
  revenue_month_2: number;
  revenue_month_3: number;
  revenue_month_6: number;
  revenue_month_12: number;
  retention_rate: number;
}

export interface PlanRevenue {
  plan_name: string;
  active_subscriptions: number;
  mrr: number;
  percentage_of_total: number;
  average_ltv: number;
  churn_rate: number;
}

export interface RevenueAnalytics {
  current_period: RevenueMetrics;
  previous_period: RevenueMetrics;
  plan_breakdown: PlanRevenue[];
  cohort_analysis: CohortData[];
  monthly_trends: MonthlyTrend[];
  forecasting: RevenueForecast;
}

export interface MonthlyTrend {
  month: string;
  mrr: number;
  new_customers: number;
  churned_customers: number;
  net_growth: number;
}

export interface RevenueForecast {
  next_month_mrr: number;
  next_quarter_mrr: number;
  confidence_interval: { lower: number; upper: number };
  growth_trajectory: 'increasing' | 'stable' | 'declining';
}

export class RevenueAnalyticsService {
  private supabase;

  constructor() {
    this.supabase = createServerComponentClient<Database>({ cookies });
  }

  async getRevenueAnalytics(
    startDate: string,
    endDate: string,
  ): Promise<RevenueAnalytics> {
    try {
      const [
        currentMetrics,
        previousMetrics,
        planBreakdown,
        cohortData,
        monthlyTrends,
        forecasting,
      ] = await Promise.all([
        this.getRevenueMetrics(startDate, endDate),
        this.getRevenueMetrics(
          this.subtractMonths(startDate, 1),
          this.subtractMonths(endDate, 1),
        ),
        this.getPlanRevenueBreakdown(),
        this.getCohortAnalysis(),
        this.getMonthlyTrends(12), // Last 12 months
        this.getRevenueForecast(),
      ]);

      return {
        current_period: currentMetrics,
        previous_period: previousMetrics,
        plan_breakdown: planBreakdown,
        cohort_analysis: cohortData,
        monthly_trends: monthlyTrends,
        forecasting,
      };
    } catch (error) {
      console.error('Error getting revenue analytics:', error);
      throw error;
    }
  }

  private async getRevenueMetrics(
    startDate: string,
    endDate: string,
  ): Promise<RevenueMetrics> {
    try {
      // Get active subscriptions for MRR calculation
      const { data: subscriptions } = await this.supabase
        .from('user_subscriptions')
        .select(
          `
          *,
          plan:subscription_plans(price_cents, interval)
        `,
        )
        .eq('status', 'active')
        .lte('created_at', endDate);

      if (!subscriptions) {
        return this.getEmptyMetrics();
      }

      // Calculate MRR - convert all subscriptions to monthly recurring revenue
      const mrr = subscriptions.reduce((total, sub) => {
        const planPrice = sub.plan?.price_cents || 0;
        const monthlyPrice =
          sub.plan?.interval === 'year' ? planPrice / 12 : planPrice;
        return total + monthlyPrice / 100; // Convert cents to dollars
      }, 0);

      // Calculate ARR
      const arr = mrr * 12;

      // Get customer counts
      const totalCustomers = subscriptions.length;

      // Calculate ARPU
      const arpu = totalCustomers > 0 ? mrr / totalCustomers : 0;

      // Get churn data
      const churnRate = await this.calculateChurnRate(startDate, endDate);

      // Calculate LTV (simplified: ARPU / churn rate)
      const ltv = churnRate > 0 ? (arpu * 12) / (churnRate / 100) : 0;

      // Get trial conversions
      const trialConversions = await this.getTrialConversions(
        startDate,
        endDate,
      );

      // Calculate growth rate compared to previous period
      const previousStartDate = this.subtractMonths(startDate, 1);
      const previousEndDate = this.subtractMonths(endDate, 1);
      const previousMrr = await this.calculateMrrForPeriod(
        previousStartDate,
        previousEndDate,
      );
      const growthRate =
        previousMrr > 0 ? ((mrr - previousMrr) / previousMrr) * 100 : 0;

      return {
        mrr: Math.round(mrr * 100) / 100,
        arr: Math.round(arr * 100) / 100,
        churn_rate: Math.round(churnRate * 100) / 100,
        ltv: Math.round(ltv * 100) / 100,
        arpu: Math.round(arpu * 100) / 100,
        total_customers: totalCustomers,
        active_subscriptions: totalCustomers,
        trial_conversions: trialConversions,
        growth_rate: Math.round(growthRate * 100) / 100,
      };
    } catch (error) {
      console.error('Error calculating revenue metrics:', error);
      return this.getEmptyMetrics();
    }
  }

  private async calculateMrrForPeriod(
    startDate: string,
    endDate: string,
  ): Promise<number> {
    const { data: subscriptions } = await this.supabase
      .from('user_subscriptions')
      .select(
        `
        plan:subscription_plans(price_cents, interval)
      `,
      )
      .eq('status', 'active')
      .lte('created_at', endDate);

    if (!subscriptions) return 0;

    return subscriptions.reduce((total, sub) => {
      const planPrice = sub.plan?.price_cents || 0;
      const monthlyPrice =
        sub.plan?.interval === 'year' ? planPrice / 12 : planPrice;
      return total + monthlyPrice / 100;
    }, 0);
  }

  private async calculateChurnRate(
    startDate: string,
    endDate: string,
  ): Promise<number> {
    // Get churned subscriptions in this period
    const { data: churned, count: churnedCount } = await this.supabase
      .from('user_subscriptions')
      .select('id', { count: 'exact' })
      .eq('status', 'canceled')
      .gte('canceled_at', startDate)
      .lte('canceled_at', endDate);

    // Get total active subscriptions at start of period
    const { count: totalAtStart } = await this.supabase
      .from('user_subscriptions')
      .select('id', { count: 'exact' })
      .in('status', ['active', 'canceled'])
      .lte('created_at', startDate);

    return totalAtStart && totalAtStart > 0
      ? ((churnedCount || 0) / totalAtStart) * 100
      : 0;
  }

  private async getTrialConversions(
    startDate: string,
    endDate: string,
  ): Promise<number> {
    const { count } = await this.supabase
      .from('user_subscriptions')
      .select('id', { count: 'exact' })
      .not('trial_end', 'is', null)
      .eq('status', 'active')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    return count || 0;
  }

  private async getPlanRevenueBreakdown(): Promise<PlanRevenue[]> {
    try {
      // Get subscription data with plan information
      const { data: planData } = await this.supabase
        .from('user_subscriptions')
        .select(
          `
          plan_id,
          created_at,
          canceled_at,
          plan:subscription_plans(name, price_cents, interval)
        `,
        )
        .in('status', ['active', 'canceled']);

      if (!planData) return [];

      // Group by plan and calculate metrics
      const planMap = new Map<
        string,
        {
          name: string;
          active_count: number;
          total_count: number;
          revenue: number;
          churned_count: number;
        }
      >();

      planData.forEach((sub) => {
        const planId = sub.plan_id;
        const planName = sub.plan?.name || 'Unknown';
        const price = sub.plan?.price_cents || 0;
        const monthlyRevenue =
          sub.plan?.interval === 'year' ? price / 12 : price;
        const isActive = !sub.canceled_at;

        const existing = planMap.get(planId) || {
          name: planName,
          active_count: 0,
          total_count: 0,
          revenue: 0,
          churned_count: 0,
        };

        planMap.set(planId, {
          name: planName,
          active_count: existing.active_count + (isActive ? 1 : 0),
          total_count: existing.total_count + 1,
          revenue: existing.revenue + (isActive ? monthlyRevenue / 100 : 0),
          churned_count: existing.churned_count + (isActive ? 0 : 1),
        });
      });

      const totalRevenue = Array.from(planMap.values()).reduce(
        (sum, plan) => sum + plan.revenue,
        0,
      );

      return Array.from(planMap.values()).map((plan) => ({
        plan_name: plan.name,
        active_subscriptions: plan.active_count,
        mrr: Math.round(plan.revenue * 100) / 100,
        percentage_of_total:
          totalRevenue > 0
            ? Math.round((plan.revenue / totalRevenue) * 10000) / 100
            : 0,
        average_ltv:
          plan.active_count > 0
            ? Math.round(((plan.revenue * 12) / plan.active_count) * 100) / 100
            : 0,
        churn_rate:
          plan.total_count > 0
            ? Math.round((plan.churned_count / plan.total_count) * 10000) / 100
            : 0,
      }));
    } catch (error) {
      console.error('Error getting plan revenue breakdown:', error);
      return [];
    }
  }

  private async getCohortAnalysis(): Promise<CohortData[]> {
    try {
      // Get subscriptions grouped by creation month
      const { data: subscriptions } = await this.supabase
        .from('user_subscriptions')
        .select(
          `
          created_at,
          canceled_at,
          plan:subscription_plans(price_cents, interval)
        `,
        )
        .order('created_at', { ascending: true });

      if (!subscriptions) return [];

      // Group by cohort (month of subscription creation)
      const cohortMap = new Map<
        string,
        {
          customers: any[];
          cohort_date: string;
        }
      >();

      subscriptions.forEach((sub) => {
        const cohortMonth = sub.created_at.substring(0, 7); // YYYY-MM
        if (!cohortMap.has(cohortMonth)) {
          cohortMap.set(cohortMonth, {
            customers: [],
            cohort_date: cohortMonth,
          });
        }
        cohortMap.get(cohortMonth)!.customers.push(sub);
      });

      // Calculate cohort metrics for each group
      const cohortData: CohortData[] = [];

      for (const [cohortMonth, cohortInfo] of cohortMap) {
        const customers = cohortInfo.customers;
        const customersAcquired = customers.length;

        // Calculate revenue for different periods
        const revenueMonth0 = this.calculateCohortRevenue(customers, 0);
        const revenueMonth1 = this.calculateCohortRevenue(customers, 1);
        const revenueMonth2 = this.calculateCohortRevenue(customers, 2);
        const revenueMonth3 = this.calculateCohortRevenue(customers, 3);
        const revenueMonth6 = this.calculateCohortRevenue(customers, 6);
        const revenueMonth12 = this.calculateCohortRevenue(customers, 12);

        // Calculate retention rate (customers still active after 12 months)
        const cohortStartDate = new Date(cohortMonth + '-01');
        const twelveMonthsLater = new Date(cohortStartDate);
        twelveMonthsLater.setMonth(twelveMonthsLater.getMonth() + 12);

        const activeAfter12Months = customers.filter(
          (customer) =>
            !customer.canceled_at ||
            new Date(customer.canceled_at) > twelveMonthsLater,
        ).length;

        const retentionRate =
          customersAcquired > 0
            ? (activeAfter12Months / customersAcquired) * 100
            : 0;

        cohortData.push({
          cohort: cohortMonth,
          customers_acquired: customersAcquired,
          revenue_month_0: Math.round(revenueMonth0 * 100) / 100,
          revenue_month_1: Math.round(revenueMonth1 * 100) / 100,
          revenue_month_2: Math.round(revenueMonth2 * 100) / 100,
          revenue_month_3: Math.round(revenueMonth3 * 100) / 100,
          revenue_month_6: Math.round(revenueMonth6 * 100) / 100,
          revenue_month_12: Math.round(revenueMonth12 * 100) / 100,
          retention_rate: Math.round(retentionRate * 100) / 100,
        });
      }

      return cohortData
        .sort((a, b) => b.cohort.localeCompare(a.cohort))
        .slice(0, 12);
    } catch (error) {
      console.error('Error calculating cohort analysis:', error);
      return [];
    }
  }

  private calculateCohortRevenue(
    customers: any[],
    monthOffset: number,
  ): number {
    return customers.reduce((total, customer) => {
      const planPrice = customer.plan?.price_cents || 0;
      const monthlyRevenue =
        customer.plan?.interval === 'year' ? planPrice / 12 : planPrice;

      // Check if customer was still active at this month offset
      const cohortStartDate = new Date(customer.created_at);
      const targetDate = new Date(cohortStartDate);
      targetDate.setMonth(targetDate.getMonth() + monthOffset);

      const isActiveAtTarget =
        !customer.canceled_at || new Date(customer.canceled_at) > targetDate;

      return total + (isActiveAtTarget ? monthlyRevenue / 100 : 0);
    }, 0);
  }

  private async getMonthlyTrends(months: number): Promise<MonthlyTrend[]> {
    try {
      const trends: MonthlyTrend[] = [];
      const currentDate = new Date();

      for (let i = months - 1; i >= 0; i--) {
        const targetDate = new Date(currentDate);
        targetDate.setMonth(targetDate.getMonth() - i);
        const monthStr = targetDate.toISOString().substring(0, 7); // YYYY-MM

        const startOfMonth = `${monthStr}-01`;
        const endOfMonth = new Date(
          targetDate.getFullYear(),
          targetDate.getMonth() + 1,
          0,
        )
          .toISOString()
          .substring(0, 10);

        const [mrr, newCustomers, churnedCustomers] = await Promise.all([
          this.calculateMrrForPeriod(startOfMonth, endOfMonth),
          this.getNewCustomers(startOfMonth, endOfMonth),
          this.getChurnedCustomers(startOfMonth, endOfMonth),
        ]);

        trends.push({
          month: monthStr,
          mrr: Math.round(mrr * 100) / 100,
          new_customers: newCustomers,
          churned_customers: churnedCustomers,
          net_growth:
            Math.round(
              (mrr -
                (i === months - 1 ? 0 : trends[trends.length - 1]?.mrr || 0)) *
                100,
            ) / 100,
        });
      }

      return trends;
    } catch (error) {
      console.error('Error getting monthly trends:', error);
      return [];
    }
  }

  private async getNewCustomers(
    startDate: string,
    endDate: string,
  ): Promise<number> {
    const { count } = await this.supabase
      .from('user_subscriptions')
      .select('id', { count: 'exact' })
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    return count || 0;
  }

  private async getChurnedCustomers(
    startDate: string,
    endDate: string,
  ): Promise<number> {
    const { count } = await this.supabase
      .from('user_subscriptions')
      .select('id', { count: 'exact' })
      .eq('status', 'canceled')
      .gte('canceled_at', startDate)
      .lte('canceled_at', endDate);

    return count || 0;
  }

  private async getRevenueForecast(): Promise<RevenueForecast> {
    try {
      const trends = await this.getMonthlyTrends(6);

      if (trends.length < 3) {
        return {
          next_month_mrr: 0,
          next_quarter_mrr: 0,
          confidence_interval: { lower: 0, upper: 0 },
          growth_trajectory: 'stable',
        };
      }

      // Simple linear trend calculation
      const recentGrowth = trends.slice(-3).map((t) => t.net_growth);
      const averageGrowth =
        recentGrowth.reduce((sum, growth) => sum + growth, 0) /
        recentGrowth.length;
      const currentMrr = trends[trends.length - 1].mrr;

      const nextMonthMrr = currentMrr + averageGrowth;
      const nextQuarterMrr = currentMrr + averageGrowth * 3;

      // Simple confidence interval (±20% of forecast)
      const confidenceMargin = nextMonthMrr * 0.2;

      return {
        next_month_mrr: Math.round(Math.max(0, nextMonthMrr) * 100) / 100,
        next_quarter_mrr: Math.round(Math.max(0, nextQuarterMrr) * 100) / 100,
        confidence_interval: {
          lower:
            Math.round(Math.max(0, nextMonthMrr - confidenceMargin) * 100) /
            100,
          upper: Math.round((nextMonthMrr + confidenceMargin) * 100) / 100,
        },
        growth_trajectory:
          averageGrowth > 5
            ? 'increasing'
            : averageGrowth < -5
              ? 'declining'
              : 'stable',
      };
    } catch (error) {
      console.error('Error calculating revenue forecast:', error);
      return {
        next_month_mrr: 0,
        next_quarter_mrr: 0,
        confidence_interval: { lower: 0, upper: 0 },
        growth_trajectory: 'stable',
      };
    }
  }

  private getEmptyMetrics(): RevenueMetrics {
    return {
      mrr: 0,
      arr: 0,
      churn_rate: 0,
      ltv: 0,
      arpu: 0,
      total_customers: 0,
      active_subscriptions: 0,
      trial_conversions: 0,
      growth_rate: 0,
    };
  }

  private subtractMonths(date: string, months: number): string {
    const d = new Date(date);
    d.setMonth(d.getMonth() - months);
    return d.toISOString().split('T')[0];
  }

  // Export functionality
  async exportRevenueReport(
    format: 'csv' | 'json',
    startDate: string,
    endDate: string,
  ) {
    try {
      const analytics = await this.getRevenueAnalytics(startDate, endDate);

      if (format === 'csv') {
        return this.generateCsvReport(analytics);
      } else {
        return {
          data: analytics,
          exported_at: new Date().toISOString(),
          period: { start: startDate, end: endDate },
        };
      }
    } catch (error) {
      console.error('Error exporting revenue report:', error);
      throw error;
    }
  }

  private generateCsvReport(analytics: RevenueAnalytics): string {
    const headers = ['Metric', 'Current Period', 'Previous Period', 'Change %'];

    const rows = [
      [
        'MRR',
        analytics.current_period.mrr,
        analytics.previous_period.mrr,
        (
          ((analytics.current_period.mrr - analytics.previous_period.mrr) /
            analytics.previous_period.mrr) *
          100
        ).toFixed(2) + '%',
      ],
      [
        'ARR',
        analytics.current_period.arr,
        analytics.previous_period.arr,
        (
          ((analytics.current_period.arr - analytics.previous_period.arr) /
            analytics.previous_period.arr) *
          100
        ).toFixed(2) + '%',
      ],
      [
        'Active Customers',
        analytics.current_period.active_subscriptions,
        analytics.previous_period.active_subscriptions,
        (
          ((analytics.current_period.active_subscriptions -
            analytics.previous_period.active_subscriptions) /
            analytics.previous_period.active_subscriptions) *
          100
        ).toFixed(2) + '%',
      ],
      [
        'Churn Rate',
        analytics.current_period.churn_rate + '%',
        analytics.previous_period.churn_rate + '%',
        (
          analytics.current_period.churn_rate -
          analytics.previous_period.churn_rate
        ).toFixed(2) + 'pp',
      ],
      [
        'LTV',
        analytics.current_period.ltv,
        analytics.previous_period.ltv,
        (
          ((analytics.current_period.ltv - analytics.previous_period.ltv) /
            analytics.previous_period.ltv) *
          100
        ).toFixed(2) + '%',
      ],
    ];

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }
}
