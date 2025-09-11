import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';

const AnalyticsQuerySchema = z.object({
  range: z.enum(['7d', '30d', '90d', 'all']).optional().default('30d'),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { weddingId: string } },
) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const weddingId = params.weddingId;
    const { searchParams } = new URL(request.url);

    // Validate input
    const queryValidation = AnalyticsQuerySchema.safeParse({
      range: searchParams.get('range') || '30d',
    });

    if (!queryValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: queryValidation.error.errors,
        },
        { status: 400 },
      );
    }

    const { range } = queryValidation.data;

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user has access to this wedding
    const { data: teamMember, error: teamError } = await supabase
      .from('wedding_team_members')
      .select('role')
      .eq('wedding_id', weddingId)
      .eq('user_id', user.id)
      .single();

    if (teamError || !teamMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Calculate date range
    let startDate = new Date();
    switch (range) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case 'all':
        startDate = new Date('2020-01-01'); // Far back date
        break;
    }

    // Fetch budget categories with transactions
    const { data: categories, error: categoriesError } = await supabase
      .from('budget_categories')
      .select(
        `
        id, name, budgeted_amount, spent_amount, color,
        budget_transactions (
          id, amount, transaction_date, description, created_at
        )
      `,
      )
      .eq('wedding_id', weddingId)
      .eq('is_active', true)
      .gte('budget_transactions.created_at', startDate.toISOString());

    if (categoriesError) {
      console.error('Categories fetch error:', categoriesError);
      return NextResponse.json(
        { error: 'Failed to fetch budget data' },
        { status: 500 },
      );
    }

    // Process category breakdown for pie chart
    const categoryBreakdown =
      categories?.map((category, index) => ({
        name: category.name,
        amount: parseFloat(category.spent_amount) || 0,
        color: category.color || `hsl(${(index * 137.5) % 360}, 70%, 50%)`,
        percentage:
          categories.reduce(
            (sum, cat) => sum + parseFloat(cat.spent_amount),
            0,
          ) > 0
            ? (parseFloat(category.spent_amount) /
                categories.reduce(
                  (sum, cat) => sum + parseFloat(cat.spent_amount),
                  0,
                )) *
              100
            : 0,
      })) || [];

    // Process budget comparison data
    const budgetComparison =
      categories?.map((category) => {
        const budgeted = parseFloat(category.budgeted_amount) || 0;
        const actual = parseFloat(category.spent_amount) || 0;
        const variance = actual - budgeted;
        const percentage = budgeted > 0 ? (actual / budgeted) * 100 : 0;

        return {
          category: category.name,
          budgeted,
          actual,
          variance,
          percentage: Math.round(percentage),
        };
      }) || [];

    // Generate trend data (monthly aggregation)
    const trendData = [];
    const now = new Date();
    const months =
      range === 'all' ? 12 : Math.min(parseInt(range.replace('d', '')) / 30, 6);

    for (let i = months - 1; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = monthDate.toLocaleString('default', { month: 'short' });
      const monthStart = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth(),
        1,
      );
      const monthEnd = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth() + 1,
        0,
      );

      // Calculate spending for this month
      let monthlySpent = 0;
      categories?.forEach((category) => {
        category.budget_transactions?.forEach((transaction) => {
          const transactionDate = new Date(transaction.transaction_date);
          if (transactionDate >= monthStart && transactionDate <= monthEnd) {
            monthlySpent += Math.abs(parseFloat(transaction.amount));
          }
        });
      });

      // Estimate monthly budget (total budget / 12)
      const totalBudget =
        categories?.reduce(
          (sum, cat) => sum + parseFloat(cat.budgeted_amount),
          0,
        ) || 0;
      const monthlyBudget = totalBudget / 12;

      trendData.push({
        month: monthName,
        spent: monthlySpent,
        budget: monthlyBudget,
        variance: monthlySpent - monthlyBudget,
      });
    }

    // Compile analytics response
    const analyticsData = {
      categoryBreakdown: categoryBreakdown.filter((item) => item.amount > 0),
      budgetComparison,
      trendData,
      summary: {
        totalCategories: categories?.length || 0,
        totalBudget:
          categories?.reduce(
            (sum, cat) => sum + parseFloat(cat.budgeted_amount),
            0,
          ) || 0,
        totalSpent:
          categories?.reduce(
            (sum, cat) => sum + parseFloat(cat.spent_amount),
            0,
          ) || 0,
        categoriesOverBudget: budgetComparison.filter(
          (item) => item.variance > 0,
        ).length,
        avgSpendingPerCategory:
          budgetComparison.length > 0
            ? budgetComparison.reduce((sum, item) => sum + item.actual, 0) /
              budgetComparison.length
            : 0,
      },
    };

    // Log activity
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      wedding_id: weddingId,
      action: 'view_budget_analytics',
      resource_type: 'budget_analytics',
      resource_id: weddingId,
      metadata: {
        range,
        categories_analyzed: categories?.length || 0,
        time_range_days:
          range === 'all' ? 'all' : parseInt(range.replace('d', '')),
      },
    });

    return NextResponse.json({
      success: true,
      data: analyticsData,
      meta: {
        range,
        generated_at: new Date().toISOString(),
        categories_count: categories?.length || 0,
      },
    });
  } catch (error) {
    console.error('Budget analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
