import { createClient } from '@/lib/supabase/server';

export interface PaymentMetrics {
  totalRevenue: number;
  totalPayments: number;
  successfulPayments: number;
  failedPayments: number;
  refundedAmount: number;
  averagePaymentAmount: number;
  paymentSuccessRate: number;
  newCustomers: number;
  period: {
    start: string;
    end: string;
  };
}

export interface PaymentAnalytics {
  daily: PaymentMetrics[];
  weekly: PaymentMetrics[];
  monthly: PaymentMetrics[];
  summary: PaymentMetrics;
}

export interface PaymentTrend {
  date: string;
  revenue: number;
  payments: number;
  successRate: number;
}

/**
 * Get payment metrics for a specific date range
 */
export async function getPaymentMetrics(
  startDate: Date,
  endDate: Date,
  userId?: string,
): Promise<PaymentMetrics> {
  const supabase = await createClient();

  try {
    let paymentsQuery = supabase
      .from('payments')
      .select('amount, status, created_at')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (userId) {
      paymentsQuery = paymentsQuery.eq('user_id', userId);
    }

    const { data: payments, error: paymentsError } = await paymentsQuery;

    if (paymentsError) {
      throw paymentsError;
    }

    // Calculate basic metrics
    const totalPayments = payments.length;
    const successfulPayments = payments.filter(
      (p) => p.status === 'completed',
    ).length;
    const failedPayments = payments.filter((p) => p.status === 'failed').length;
    const totalRevenue = payments
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);
    const averagePaymentAmount =
      successfulPayments > 0 ? totalRevenue / successfulPayments : 0;
    const paymentSuccessRate =
      totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0;

    // Get refunded amount
    let refundsQuery = supabase
      .from('refunds')
      .select('amount, status')
      .eq('status', 'succeeded')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (userId) {
      refundsQuery = refundsQuery.eq('user_id', userId);
    }

    const { data: refunds } = await refundsQuery;
    const refundedAmount = refunds?.reduce((sum, r) => sum + r.amount, 0) || 0;

    // Get new customers count
    let customersQuery = supabase
      .from('customer_payment_methods')
      .select('stripe_customer_id')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (userId) {
      customersQuery = customersQuery.eq('user_id', userId);
    }

    const { data: newCustomerMethods } = await customersQuery;
    const uniqueCustomers = new Set(
      newCustomerMethods?.map((c) => c.stripe_customer_id) || [],
    );
    const newCustomers = uniqueCustomers.size;

    return {
      totalRevenue,
      totalPayments,
      successfulPayments,
      failedPayments,
      refundedAmount,
      averagePaymentAmount,
      paymentSuccessRate,
      newCustomers,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    };
  } catch (error) {
    console.error('Error getting payment metrics:', error);
    throw new Error('Failed to fetch payment metrics');
  }
}

/**
 * Get payment trends over time
 */
export async function getPaymentTrends(
  startDate: Date,
  endDate: Date,
  granularity: 'daily' | 'weekly' | 'monthly' = 'daily',
  userId?: string,
): Promise<PaymentTrend[]> {
  const supabase = await createClient();

  try {
    // Determine date truncation based on granularity
    const dateTrunc =
      granularity === 'daily'
        ? 'day'
        : granularity === 'weekly'
          ? 'week'
          : 'month';

    const query = supabase.rpc('get_payment_trends', {
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      date_trunc: dateTrunc,
      user_id_filter: userId || null,
    });

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error getting payment trends:', error);
    return [];
  }
}

/**
 * Get comprehensive payment analytics
 */
export async function getPaymentAnalytics(
  startDate: Date,
  endDate: Date,
  userId?: string,
): Promise<PaymentAnalytics> {
  try {
    const [summary, dailyTrends, weeklyTrends, monthlyTrends] =
      await Promise.all([
        getPaymentMetrics(startDate, endDate, userId),
        getPaymentTrends(startDate, endDate, 'daily', userId),
        getPaymentTrends(startDate, endDate, 'weekly', userId),
        getPaymentTrends(startDate, endDate, 'monthly', userId),
      ]);

    // Convert trends to metrics format
    const dailyMetrics = dailyTrends.map((trend) => ({
      ...summary,
      totalRevenue: trend.revenue,
      totalPayments: trend.payments,
      paymentSuccessRate: trend.successRate,
      period: {
        start: trend.date,
        end: trend.date,
      },
    }));

    const weeklyMetrics = weeklyTrends.map((trend) => ({
      ...summary,
      totalRevenue: trend.revenue,
      totalPayments: trend.payments,
      paymentSuccessRate: trend.successRate,
      period: {
        start: trend.date,
        end: trend.date,
      },
    }));

    const monthlyMetrics = monthlyTrends.map((trend) => ({
      ...summary,
      totalRevenue: trend.revenue,
      totalPayments: trend.payments,
      paymentSuccessRate: trend.successRate,
      period: {
        start: trend.date,
        end: trend.date,
      },
    }));

    return {
      daily: dailyMetrics,
      weekly: weeklyMetrics,
      monthly: monthlyMetrics,
      summary,
    };
  } catch (error) {
    console.error('Error getting payment analytics:', error);
    throw new Error('Failed to fetch payment analytics');
  }
}

/**
 * Get payment status breakdown
 */
export async function getPaymentStatusBreakdown(
  startDate: Date,
  endDate: Date,
  userId?: string,
): Promise<Record<string, number>> {
  const supabase = await createClient();

  try {
    let query = supabase
      .from('payments')
      .select('status')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const breakdown: Record<string, number> = {};
    data.forEach((payment) => {
      breakdown[payment.status] = (breakdown[payment.status] || 0) + 1;
    });

    return breakdown;
  } catch (error) {
    console.error('Error getting payment status breakdown:', error);
    return {};
  }
}

/**
 * Get top payment amounts and frequencies
 */
export async function getPaymentAmountAnalysis(
  startDate: Date,
  endDate: Date,
  userId?: string,
): Promise<{
  topAmounts: Array<{ amount: number; count: number }>;
  averageByMonth: Array<{ month: string; average: number }>;
}> {
  const supabase = await createClient();

  try {
    let query = supabase
      .from('payments')
      .select('amount, created_at')
      .eq('status', 'completed')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Analyze payment amounts
    const amountCounts: Record<number, number> = {};
    const monthlyAmounts: Record<string, number[]> = {};

    data.forEach((payment) => {
      // Count occurrences of each amount
      amountCounts[payment.amount] = (amountCounts[payment.amount] || 0) + 1;

      // Group by month for average calculation
      const month = new Date(payment.created_at).toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyAmounts[month]) {
        monthlyAmounts[month] = [];
      }
      monthlyAmounts[month].push(payment.amount);
    });

    // Get top amounts
    const topAmounts = Object.entries(amountCounts)
      .map(([amount, count]) => ({ amount: parseFloat(amount), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate monthly averages
    const averageByMonth = Object.entries(monthlyAmounts)
      .map(([month, amounts]) => ({
        month,
        average:
          amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      topAmounts,
      averageByMonth,
    };
  } catch (error) {
    console.error('Error getting payment amount analysis:', error);
    return { topAmounts: [], averageByMonth: [] };
  }
}

/**
 * Get customer payment patterns
 */
export async function getCustomerPaymentPatterns(
  startDate: Date,
  endDate: Date,
  userId?: string,
): Promise<{
  newCustomers: number;
  returningCustomers: number;
  customerLifetimeValue: number;
  averagePaymentsPerCustomer: number;
}> {
  const supabase = await createClient();

  try {
    let query = supabase
      .from('payments')
      .select('stripe_customer_id, amount, created_at')
      .eq('status', 'completed')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const customerData: Record<
      string,
      { payments: number; totalAmount: number; firstPayment: string }
    > = {};

    data.forEach((payment) => {
      if (!payment.stripe_customer_id) return;

      if (!customerData[payment.stripe_customer_id]) {
        customerData[payment.stripe_customer_id] = {
          payments: 0,
          totalAmount: 0,
          firstPayment: payment.created_at,
        };
      }

      const customer = customerData[payment.stripe_customer_id];
      customer.payments++;
      customer.totalAmount += payment.amount;

      if (payment.created_at < customer.firstPayment) {
        customer.firstPayment = payment.created_at;
      }
    });

    const customers = Object.values(customerData);
    const newCustomers = customers.filter(
      (c) =>
        new Date(c.firstPayment) >= startDate &&
        new Date(c.firstPayment) <= endDate,
    ).length;

    const returningCustomers = customers.filter((c) => c.payments > 1).length;
    const totalCustomers = customers.length;
    const customerLifetimeValue =
      totalCustomers > 0
        ? customers.reduce((sum, c) => sum + c.totalAmount, 0) / totalCustomers
        : 0;
    const averagePaymentsPerCustomer =
      totalCustomers > 0
        ? customers.reduce((sum, c) => sum + c.payments, 0) / totalCustomers
        : 0;

    return {
      newCustomers,
      returningCustomers,
      customerLifetimeValue,
      averagePaymentsPerCustomer,
    };
  } catch (error) {
    console.error('Error getting customer payment patterns:', error);
    return {
      newCustomers: 0,
      returningCustomers: 0,
      customerLifetimeValue: 0,
      averagePaymentsPerCustomer: 0,
    };
  }
}

/**
 * Export payment analytics to CSV
 */
export async function exportPaymentAnalytics(
  startDate: Date,
  endDate: Date,
  userId?: string,
): Promise<string> {
  try {
    const analytics = await getPaymentAnalytics(startDate, endDate, userId);

    // Create CSV header
    const csvHeader = [
      'Date',
      'Total Revenue',
      'Total Payments',
      'Successful Payments',
      'Failed Payments',
      'Refunded Amount',
      'Average Payment',
      'Success Rate %',
      'New Customers',
    ].join(',');

    // Create CSV rows from daily data
    const csvRows = analytics.daily.map((metric) =>
      [
        metric.period.start.split('T')[0], // Date only
        metric.totalRevenue.toFixed(2),
        metric.totalPayments,
        metric.successfulPayments,
        metric.failedPayments,
        metric.refundedAmount.toFixed(2),
        metric.averagePaymentAmount.toFixed(2),
        metric.paymentSuccessRate.toFixed(2),
        metric.newCustomers,
      ].join(','),
    );

    return [csvHeader, ...csvRows].join('\n');
  } catch (error) {
    console.error('Error exporting payment analytics:', error);
    throw new Error('Failed to export payment analytics');
  }
}
