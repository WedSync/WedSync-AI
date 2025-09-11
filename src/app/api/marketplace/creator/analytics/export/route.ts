import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// GET export analytics data
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'csv';
    const reportType = searchParams.get('type') || 'overview';
    const startDate =
      searchParams.get('startDate') ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
    const endDate =
      searchParams.get('endDate') || new Date().toISOString().split('T')[0];

    // Validate format
    if (!['csv', 'json', 'pdf'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Supported: csv, json, pdf' },
        { status: 400 },
      );
    }

    // Fetch data based on report type
    let data: any = {};

    switch (reportType) {
      case 'overview':
        // Fetch overview metrics
        const { data: metrics } = await supabase
          .from('creator_daily_metrics')
          .select('*')
          .eq('creator_id', user.id)
          .gte('metric_date', startDate)
          .lte('metric_date', endDate)
          .order('metric_date', { ascending: true });

        const { data: events } = await supabase
          .from('creator_analytics_events')
          .select('*')
          .eq('creator_id', user.id)
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        data = {
          summary: calculateSummary(metrics || []),
          dailyMetrics: metrics || [],
          eventBreakdown: aggregateEvents(events || []),
        };
        break;

      case 'revenue':
        // Fetch revenue data
        const { data: revenue } = await supabase
          .from('creator_revenue_tracking')
          .select('*')
          .eq('creator_id', user.id)
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .order('created_at', { ascending: true });

        data = {
          transactions: revenue || [],
          summary: calculateRevenueSummary(revenue || []),
        };
        break;

      case 'templates':
        // Fetch template performance
        const { data: templateEvents } = await supabase
          .from('creator_analytics_events')
          .select(
            `
            template_id,
            event_type,
            event_data,
            created_at,
            marketplace_templates!inner(id, title, category, price_cents)
          `,
          )
          .eq('creator_id', user.id)
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        data = aggregateTemplatePerformance(templateEvents || []);
        break;

      case 'ab-tests':
        // Fetch A/B test results
        const { data: tests } = await supabase
          .from('creator_ab_tests')
          .select(
            `
            *,
            marketplace_templates!inner(id, title)
          `,
          )
          .eq('creator_id', user.id)
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        data = {
          tests: tests || [],
          summary: calculateABTestSummary(tests || []),
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid report type' },
          { status: 400 },
        );
    }

    // Format response based on requested format
    if (format === 'json') {
      return NextResponse.json(data);
    } else if (format === 'csv') {
      const csv = convertToCSV(data, reportType);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="analytics-${reportType}-${startDate}-${endDate}.csv"`,
        },
      });
    } else if (format === 'pdf') {
      // For PDF, we'll return the data and let the frontend handle PDF generation
      return NextResponse.json({
        format: 'pdf',
        data,
        metadata: {
          reportType,
          startDate,
          endDate,
          generatedAt: new Date().toISOString(),
          creatorId: user.id,
        },
      });
    }
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Helper functions
function calculateSummary(metrics: any[]) {
  return {
    totalViews: metrics.reduce((sum, m) => sum + (m.template_views || 0), 0),
    totalClicks: metrics.reduce((sum, m) => sum + (m.template_clicks || 0), 0),
    totalPurchases: metrics.reduce((sum, m) => sum + (m.purchases || 0), 0),
    totalRevenue: metrics.reduce((sum, m) => sum + (m.gross_revenue || 0), 0),
    totalNetRevenue: metrics.reduce((sum, m) => sum + (m.net_revenue || 0), 0),
    averageConversionRate:
      metrics.length > 0
        ? metrics.reduce((sum, m) => sum + Number(m.conversion_rate || 0), 0) /
          metrics.length
        : 0,
    uniqueVisitors: metrics.reduce(
      (sum, m) => sum + (m.unique_visitors || 0),
      0,
    ),
  };
}

function aggregateEvents(events: any[]) {
  const breakdown: Record<string, number> = {};
  events.forEach((event) => {
    breakdown[event.event_type] = (breakdown[event.event_type] || 0) + 1;
  });
  return breakdown;
}

function calculateRevenueSummary(transactions: any[]) {
  return {
    totalGross: transactions
      .filter((t) => t.transaction_type === 'sale')
      .reduce((sum, t) => sum + t.gross_amount, 0),
    totalCommission: transactions
      .filter((t) => t.transaction_type === 'commission')
      .reduce((sum, t) => sum + t.commission_amount, 0),
    totalNet: transactions
      .filter((t) => t.transaction_type === 'sale')
      .reduce((sum, t) => sum + t.net_amount, 0),
    totalRefunds: transactions
      .filter((t) => t.transaction_type === 'refund')
      .reduce((sum, t) => sum + Math.abs(t.gross_amount), 0),
    transactionCount: transactions.length,
  };
}

function aggregateTemplatePerformance(events: any[]) {
  const templateMap = new Map<string, any>();

  events.forEach((event) => {
    const templateId = event.template_id;
    const template = event.marketplace_templates;

    if (!templateMap.has(templateId)) {
      templateMap.set(templateId, {
        id: templateId,
        title: template?.title || 'Unknown',
        category: template?.category || 'Unknown',
        price: template?.price_cents || 0,
        views: 0,
        clicks: 0,
        purchases: 0,
        revenue: 0,
        conversionRate: 0,
      });
    }

    const perf = templateMap.get(templateId);
    if (event.event_type === 'view') perf.views++;
    if (event.event_type === 'click') perf.clicks++;
    if (event.event_type === 'purchase') {
      perf.purchases++;
      perf.revenue += event.event_data?.revenue || 0;
    }
  });

  // Calculate conversion rates
  templateMap.forEach((perf) => {
    if (perf.clicks > 0) {
      perf.conversionRate = perf.purchases / perf.clicks;
    }
  });

  return Array.from(templateMap.values());
}

function calculateABTestSummary(tests: any[]) {
  return {
    totalTests: tests.length,
    runningTests: tests.filter((t) => t.status === 'running').length,
    completedTests: tests.filter((t) => t.status === 'completed').length,
    testsWithWinners: tests.filter((t) => t.winner && t.winner !== 'none')
      .length,
    averageConfidence:
      tests
        .filter((t) => t.confidence_level)
        .reduce((sum, t) => sum + t.confidence_level, 0) /
      Math.max(tests.filter((t) => t.confidence_level).length, 1),
  };
}

function convertToCSV(data: any, reportType: string): string {
  let csv = '';

  switch (reportType) {
    case 'overview':
      // Summary section
      csv += 'Summary\n';
      csv += 'Metric,Value\n';
      Object.entries(data.summary).forEach(([key, value]) => {
        csv += `"${formatKey(key)}","${value}"\n`;
      });

      // Daily metrics
      csv += '\nDaily Metrics\n';
      if (data.dailyMetrics.length > 0) {
        const headers = Object.keys(data.dailyMetrics[0]);
        csv += headers.map((h) => `"${formatKey(h)}"`).join(',') + '\n';
        data.dailyMetrics.forEach((row: any) => {
          csv += headers.map((h) => `"${row[h] || ''}"`).join(',') + '\n';
        });
      }
      break;

    case 'revenue':
      // Revenue summary
      csv += 'Revenue Summary\n';
      csv += 'Metric,Amount (cents)\n';
      Object.entries(data.summary).forEach(([key, value]) => {
        csv += `"${formatKey(key)}","${value}"\n`;
      });

      // Transactions
      csv += '\nTransactions\n';
      if (data.transactions.length > 0) {
        const headers = [
          'created_at',
          'transaction_type',
          'gross_amount',
          'commission_amount',
          'net_amount',
          'payment_status',
        ];
        csv += headers.map((h) => `"${formatKey(h)}"`).join(',') + '\n';
        data.transactions.forEach((row: any) => {
          csv += headers.map((h) => `"${row[h] || ''}"`).join(',') + '\n';
        });
      }
      break;

    case 'templates':
      csv += 'Template Performance\n';
      if (data.length > 0) {
        const headers = [
          'title',
          'category',
          'price',
          'views',
          'clicks',
          'purchases',
          'revenue',
          'conversionRate',
        ];
        csv += headers.map((h) => `"${formatKey(h)}"`).join(',') + '\n';
        data.forEach((row: any) => {
          csv += headers.map((h) => `"${row[h] || ''}"`).join(',') + '\n';
        });
      }
      break;

    case 'ab-tests':
      // A/B test summary
      csv += 'A/B Test Summary\n';
      csv += 'Metric,Value\n';
      Object.entries(data.summary).forEach(([key, value]) => {
        csv += `"${formatKey(key)}","${value}"\n`;
      });

      // Individual tests
      csv += '\nTests\n';
      if (data.tests.length > 0) {
        const headers = [
          'test_name',
          'test_type',
          'status',
          'control_visitors',
          'control_conversions',
          'test_visitors',
          'test_conversions',
          'winner',
          'confidence_level',
        ];
        csv += headers.map((h) => `"${formatKey(h)}"`).join(',') + '\n';
        data.tests.forEach((row: any) => {
          csv += headers.map((h) => `"${row[h] || ''}"`).join(',') + '\n';
        });
      }
      break;
  }

  return csv;
}

function formatKey(key: string): string {
  // Convert camelCase to Title Case
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}
