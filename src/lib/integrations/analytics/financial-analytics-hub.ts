// Financial Analytics Hub for WedSync
// Comprehensive financial metrics and analytics for wedding vendors

export interface FinancialMetrics {
  revenue: {
    monthly_recurring_revenue: number;
    annual_recurring_revenue: number;
    average_revenue_per_user: number;
    revenue_growth_rate: number;
  };
  profitability: {
    gross_margin: number;
    net_profit_margin: number;
    customer_acquisition_cost: number;
    customer_lifetime_value: number;
  };
  cash_flow: {
    operating_cash_flow: number;
    free_cash_flow: number;
    days_sales_outstanding: number;
    accounts_receivable: number;
  };
  subscription_metrics: {
    monthly_churn_rate: number;
    annual_churn_rate: number;
    net_revenue_retention: number;
    expansion_revenue: number;
  };
}

export interface RevenueBreakdown {
  subscription_tier: string;
  subscriber_count: number;
  monthly_revenue: number;
  annual_revenue: number;
  churn_rate: number;
  upgrade_rate: number;
}

export interface PaymentAnalytics {
  payment_method: string;
  transaction_count: number;
  total_value: number;
  success_rate: number;
  average_transaction_size: number;
  processing_fees: number;
}

export class FinancialAnalyticsHub {
  /**
   * Get comprehensive financial metrics
   */
  async getFinancialMetrics(): Promise<FinancialMetrics> {
    // Simulate realistic wedding SaaS financial metrics
    const baseRevenue = 50000; // Monthly

    return {
      revenue: {
        monthly_recurring_revenue: baseRevenue,
        annual_recurring_revenue: baseRevenue * 12,
        average_revenue_per_user: 49,
        revenue_growth_rate: 0.15, // 15% month-over-month
      },
      profitability: {
        gross_margin: 0.85,
        net_profit_margin: 0.12,
        customer_acquisition_cost: 89,
        customer_lifetime_value: 1200,
      },
      cash_flow: {
        operating_cash_flow: baseRevenue * 0.3,
        free_cash_flow: baseRevenue * 0.25,
        days_sales_outstanding: 15,
        accounts_receivable: baseRevenue * 0.5,
      },
      subscription_metrics: {
        monthly_churn_rate: 0.05,
        annual_churn_rate: 0.45,
        net_revenue_retention: 1.12,
        expansion_revenue: baseRevenue * 0.08,
      },
    };
  }

  /**
   * Get revenue breakdown by subscription tier
   */
  async getRevenueBreakdown(): Promise<RevenueBreakdown[]> {
    return [
      {
        subscription_tier: 'Free',
        subscriber_count: 2500,
        monthly_revenue: 0,
        annual_revenue: 0,
        churn_rate: 0.15,
        upgrade_rate: 0.08,
      },
      {
        subscription_tier: 'Starter',
        subscriber_count: 850,
        monthly_revenue: 19 * 850,
        annual_revenue: 19 * 850 * 12,
        churn_rate: 0.06,
        upgrade_rate: 0.12,
      },
      {
        subscription_tier: 'Professional',
        subscriber_count: 420,
        monthly_revenue: 49 * 420,
        annual_revenue: 49 * 420 * 12,
        churn_rate: 0.04,
        upgrade_rate: 0.08,
      },
      {
        subscription_tier: 'Scale',
        subscriber_count: 180,
        monthly_revenue: 79 * 180,
        annual_revenue: 79 * 180 * 12,
        churn_rate: 0.03,
        upgrade_rate: 0.05,
      },
      {
        subscription_tier: 'Enterprise',
        subscriber_count: 35,
        monthly_revenue: 149 * 35,
        annual_revenue: 149 * 35 * 12,
        churn_rate: 0.02,
        upgrade_rate: 0,
      },
    ];
  }

  /**
   * Analyze payment methods and performance
   */
  async getPaymentAnalytics(): Promise<PaymentAnalytics[]> {
    return [
      {
        payment_method: 'Stripe Card',
        transaction_count: 1200,
        total_value: 58000,
        success_rate: 0.96,
        average_transaction_size: 48.33,
        processing_fees: 58000 * 0.029,
      },
      {
        payment_method: 'PayPal',
        transaction_count: 180,
        total_value: 8700,
        success_rate: 0.94,
        average_transaction_size: 48.33,
        processing_fees: 8700 * 0.035,
      },
      {
        payment_method: 'Direct Debit',
        transaction_count: 320,
        total_value: 15500,
        success_rate: 0.98,
        average_transaction_size: 48.44,
        processing_fees: 15500 * 0.008,
      },
    ];
  }

  /**
   * Calculate wedding season financial impact
   */
  async getSeasonalFinancialImpact(): Promise<
    {
      month: string;
      revenue_multiplier: number;
      new_subscriptions: number;
      churn_impact: number;
      net_revenue_change: number;
    }[]
  > {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    return months.map((month) => {
      const isPeakSeason = ['May', 'June', 'September', 'October'].includes(
        month,
      );
      const multiplier = isPeakSeason ? 1.4 : 0.8;

      return {
        month,
        revenue_multiplier: multiplier,
        new_subscriptions: Math.floor(
          (isPeakSeason ? 120 : 60) * Math.random(),
        ),
        churn_impact: isPeakSeason ? -0.02 : 0.01,
        net_revenue_change: (multiplier - 1) * 50000,
      };
    });
  }

  /**
   * Generate financial forecast
   */
  async generateFinancialForecast(months: number): Promise<
    {
      month: number;
      projected_mrr: number;
      projected_subscribers: number;
      projected_churn: number;
      projected_cac: number;
      confidence_interval: number;
    }[]
  > {
    const currentMRR = 50000;
    const currentSubscribers = 1000;
    const monthlyGrowthRate = 0.12;

    return Array.from({ length: months }, (_, i) => {
      const month = i + 1;
      const growthFactor = Math.pow(1 + monthlyGrowthRate, month);

      return {
        month,
        projected_mrr: Math.floor(currentMRR * growthFactor),
        projected_subscribers: Math.floor(currentSubscribers * growthFactor),
        projected_churn: 0.05 + (Math.random() - 0.5) * 0.01,
        projected_cac: 89 + month * 2, // CAC increases over time
        confidence_interval: Math.max(0.6, 0.95 - month * 0.05), // Confidence decreases over time
      };
    });
  }

  /**
   * Calculate unit economics
   */
  async calculateUnitEconomics(): Promise<{
    customer_acquisition_cost: number;
    customer_lifetime_value: number;
    ltv_to_cac_ratio: number;
    months_to_recover_cac: number;
    gross_margin_per_customer: number;
    net_margin_per_customer: number;
  }> {
    const cac = 89;
    const avgMonthlyRevenue = 49;
    const grossMargin = 0.85;
    const monthlyChurnRate = 0.05;
    const avgCustomerLifeMonths = 1 / monthlyChurnRate;
    const clv = avgMonthlyRevenue * avgCustomerLifeMonths * grossMargin;

    return {
      customer_acquisition_cost: cac,
      customer_lifetime_value: clv,
      ltv_to_cac_ratio: clv / cac,
      months_to_recover_cac: cac / (avgMonthlyRevenue * grossMargin),
      gross_margin_per_customer: avgMonthlyRevenue * grossMargin,
      net_margin_per_customer: avgMonthlyRevenue * 0.12, // 12% net margin
    };
  }
}

export default FinancialAnalyticsHub;
