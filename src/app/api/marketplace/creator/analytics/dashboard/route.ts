import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const timeframe = searchParams.get('timeframe') || 'month';
    const compareToPeriodsAgo = searchParams.get('compareToPeriodsAgo');
    const templateIds = searchParams.get('templateIds')?.split(',');
    const weddingSeasons = searchParams.get('weddingSeasons')?.split(',');

    // Calculate date range based on timeframe
    const now = new Date();
    let startDate = new Date();
    let compareStartDate = new Date();
    let compareEndDate = new Date();

    switch (timeframe) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        if (compareToPeriodsAgo) {
          compareStartDate.setDate(now.getDate() - Number(compareToPeriodsAgo));
          compareEndDate.setDate(
            now.getDate() - Number(compareToPeriodsAgo) + 1,
          );
        }
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        if (compareToPeriodsAgo) {
          compareStartDate.setDate(
            now.getDate() - 7 * (Number(compareToPeriodsAgo) + 1),
          );
          compareEndDate.setDate(
            now.getDate() - 7 * Number(compareToPeriodsAgo),
          );
        }
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        if (compareToPeriodsAgo) {
          compareStartDate.setMonth(
            now.getMonth() - (Number(compareToPeriodsAgo) + 1),
          );
          compareEndDate.setMonth(now.getMonth() - Number(compareToPeriodsAgo));
        }
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        if (compareToPeriodsAgo) {
          compareStartDate.setMonth(
            now.getMonth() - 3 * (Number(compareToPeriodsAgo) + 1),
          );
          compareEndDate.setMonth(
            now.getMonth() - 3 * Number(compareToPeriodsAgo),
          );
        }
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        if (compareToPeriodsAgo) {
          compareStartDate.setFullYear(
            now.getFullYear() - (Number(compareToPeriodsAgo) + 1),
          );
          compareEndDate.setFullYear(
            now.getFullYear() - Number(compareToPeriodsAgo),
          );
        }
        break;
    }

    // Fetch overview metrics
    const { data: currentMetrics, error: metricsError } = await supabase
      .from('creator_daily_metrics')
      .select(
        `
        template_views,
        template_clicks,
        purchases,
        gross_revenue,
        net_revenue,
        unique_visitors,
        conversion_rate,
        average_order_value
      `,
      )
      .eq('creator_id', user.id)
      .gte('metric_date', startDate.toISOString().split('T')[0])
      .lte('metric_date', now.toISOString().split('T')[0]);

    if (metricsError) {
      console.error('Error fetching metrics:', metricsError);
      return NextResponse.json(
        { error: 'Failed to fetch metrics' },
        { status: 500 },
      );
    }

    // Calculate overview stats
    const overview = {
      totalSales:
        currentMetrics?.reduce((sum, m) => sum + (m.purchases || 0), 0) || 0,
      totalGrossRevenue:
        currentMetrics?.reduce((sum, m) => sum + (m.gross_revenue || 0), 0) ||
        0,
      totalNetRevenue:
        currentMetrics?.reduce((sum, m) => sum + (m.net_revenue || 0), 0) || 0,
      conversionRate: currentMetrics?.length
        ? currentMetrics.reduce(
            (sum, m) => sum + (Number(m.conversion_rate) || 0),
            0,
          ) / currentMetrics.length
        : 0,
      averageOrderValue: currentMetrics?.length
        ? currentMetrics.reduce(
            (sum, m) => sum + (m.average_order_value || 0),
            0,
          ) / currentMetrics.length
        : 0,
      uniqueCustomers:
        currentMetrics?.reduce((sum, m) => sum + (m.unique_visitors || 0), 0) ||
        0,
      repeatCustomers: 0, // Would need to calculate from events
      rankInCategory: 1, // Would need to call ranking function
      rankImprovement: 0, // Would need historical data
    };

    // Fetch time series data
    const { data: dailyMetrics } = await supabase
      .from('creator_daily_metrics')
      .select('*')
      .eq('creator_id', user.id)
      .gte('metric_date', startDate.toISOString().split('T')[0])
      .order('metric_date', { ascending: true });

    const timeSeries = {
      daily:
        dailyMetrics?.map((m) => ({
          date: m.metric_date,
          views: m.template_views || 0,
          purchases: m.purchases || 0,
          revenue: m.gross_revenue || 0,
          conversionRate: Number(m.conversion_rate) || 0,
        })) || [],
      seasonalTrends: {
        spring: { views: 0, conversions: 0, avgRevenue: 0 },
        summer: { views: 0, conversions: 0, avgRevenue: 0 },
        fall: { views: 0, conversions: 0, avgRevenue: 0 },
        winter: { views: 0, conversions: 0, avgRevenue: 0 },
      },
    };

    // Calculate seasonal trends from wedding_season_breakdown
    dailyMetrics?.forEach((metric) => {
      if (metric.wedding_season_breakdown) {
        Object.entries(metric.wedding_season_breakdown as any).forEach(
          ([season, data]: [string, any]) => {
            if (
              timeSeries.seasonalTrends[
                season as keyof typeof timeSeries.seasonalTrends
              ]
            ) {
              timeSeries.seasonalTrends[
                season as keyof typeof timeSeries.seasonalTrends
              ].views += data.views || 0;
              timeSeries.seasonalTrends[
                season as keyof typeof timeSeries.seasonalTrends
              ].conversions += data.conversions || 0;
              timeSeries.seasonalTrends[
                season as keyof typeof timeSeries.seasonalTrends
              ].avgRevenue += data.revenue || 0;
            }
          },
        );
      }
    });

    // Fetch top templates
    const { data: topTemplatesData } = await supabase.rpc(
      'get_top_templates_by_creator',
      {
        p_creator_id: user.id,
        p_start_date: startDate.toISOString().split('T')[0],
        p_end_date: now.toISOString().split('T')[0],
      },
    );

    const topTemplates =
      topTemplatesData?.map((t: any) => ({
        id: t.template_id,
        title: t.title || 'Untitled Template',
        views: t.views || 0,
        purchases: t.purchases || 0,
        revenue: t.revenue || 0,
        conversionRate: t.conversion_rate || 0,
        category: t.category || 'Uncategorized',
        weddingTypePerformance: t.wedding_type_performance || {},
      })) || [];

    // Fetch customer insights
    const { data: customerData } = await supabase
      .from('creator_analytics_events')
      .select('user_id, event_type, event_data, wedding_type')
      .eq('creator_id', user.id)
      .eq('event_type', 'purchase')
      .gte('created_at', startDate.toISOString());

    const coordinatorTypes: Record<
      string,
      { count: number; avgSpend: number }
    > = {};
    const purchasesByUser: Record<string, number> = {};

    customerData?.forEach((event) => {
      const weddingType = event.wedding_type || 'unknown';
      if (!coordinatorTypes[weddingType]) {
        coordinatorTypes[weddingType] = { count: 0, avgSpend: 0 };
      }
      coordinatorTypes[weddingType].count++;
      coordinatorTypes[weddingType].avgSpend +=
        (event.event_data as any)?.revenue || 0;

      if (event.user_id) {
        purchasesByUser[event.user_id] =
          (purchasesByUser[event.user_id] || 0) + 1;
      }
    });

    // Calculate averages
    Object.keys(coordinatorTypes).forEach((type) => {
      if (coordinatorTypes[type].count > 0) {
        coordinatorTypes[type].avgSpend =
          coordinatorTypes[type].avgSpend / coordinatorTypes[type].count;
      }
    });

    const customerInsights = {
      coordinatorTypes,
      geographicDistribution: [], // Would need location data
      purchasePatterns: {
        averageTemplatesPerOrder:
          Object.values(purchasesByUser).reduce(
            (sum, count) => sum + count,
            0,
          ) / Math.max(Object.keys(purchasesByUser).length, 1),
        mostCommonBundles: [], // Would need bundle analysis
      },
    };

    // Fetch competitor benchmarks
    const { data: categoryStats } = await supabase.rpc(
      'get_category_benchmarks',
      {
        p_creator_id: user.id,
      },
    );

    const competitorBenchmarks = {
      categoryAvgConversionRate:
        categoryStats?.[0]?.avg_conversion_rate || 0.025,
      categoryAvgPrice: categoryStats?.[0]?.avg_price || 2500,
      yourPerformanceVsAvg: {
        conversionRate:
          overview.conversionRate >
          (categoryStats?.[0]?.avg_conversion_rate || 0.025)
            ? ((overview.conversionRate -
                (categoryStats?.[0]?.avg_conversion_rate || 0.025)) /
                (categoryStats?.[0]?.avg_conversion_rate || 0.025)) *
              100
            : -(
                (categoryStats?.[0]?.avg_conversion_rate ||
                  0.025 - overview.conversionRate) /
                (categoryStats?.[0]?.avg_conversion_rate || 0.025)
              ) * 100,
        pricing: 0, // Would need to calculate based on template prices
      },
    };

    // Calculate creator ranking
    const { data: rankingData } = await supabase
      .rpc('calculate_creator_rankings')
      .eq('creator_id', user.id)
      .single();

    if (rankingData) {
      overview.rankInCategory = rankingData.rank || 1;
    }

    const response = {
      overview,
      timeSeries,
      topTemplates,
      customerInsights,
      competitorBenchmarks,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Analytics dashboard error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Helper RPC functions that would be created in the database
const rpcFunctions = `
-- Get top templates by creator
CREATE OR REPLACE FUNCTION get_top_templates_by_creator(
  p_creator_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE (
  template_id UUID,
  title VARCHAR,
  views BIGINT,
  purchases BIGINT,
  revenue BIGINT,
  conversion_rate DECIMAL,
  category VARCHAR,
  wedding_type_performance JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mt.id as template_id,
    mt.title,
    COUNT(CASE WHEN cae.event_type = 'view' THEN 1 END) as views,
    COUNT(CASE WHEN cae.event_type = 'purchase' THEN 1 END) as purchases,
    SUM(CASE WHEN cae.event_type = 'purchase' THEN (cae.event_data->>'revenue')::INTEGER ELSE 0 END) as revenue,
    CASE 
      WHEN COUNT(CASE WHEN cae.event_type = 'click' THEN 1 END) > 0
      THEN COUNT(CASE WHEN cae.event_type = 'purchase' THEN 1 END)::DECIMAL / 
           COUNT(CASE WHEN cae.event_type = 'click' THEN 1 END)
      ELSE 0
    END as conversion_rate,
    mt.category,
    jsonb_object_agg(
      COALESCE(cae.wedding_type, 'unknown'),
      COUNT(CASE WHEN cae.event_type = 'purchase' THEN 1 END)
    ) FILTER (WHERE cae.wedding_type IS NOT NULL) as wedding_type_performance
  FROM marketplace_templates mt
  LEFT JOIN creator_analytics_events cae ON cae.template_id = mt.id
  WHERE cae.creator_id = p_creator_id
    AND cae.created_at::DATE >= p_start_date
    AND cae.created_at::DATE <= p_end_date
  GROUP BY mt.id, mt.title, mt.category
  ORDER BY revenue DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Get category benchmarks
CREATE OR REPLACE FUNCTION get_category_benchmarks(
  p_creator_id UUID
) RETURNS TABLE (
  avg_conversion_rate DECIMAL,
  avg_price INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    AVG(cdm.conversion_rate) as avg_conversion_rate,
    AVG(mt.price_cents) as avg_price
  FROM creator_daily_metrics cdm
  JOIN marketplace_templates mt ON mt.supplier_id = cdm.creator_id
  WHERE cdm.metric_date >= CURRENT_DATE - INTERVAL '30 days'
    AND cdm.creator_id != p_creator_id
    AND mt.category IN (
      SELECT DISTINCT category 
      FROM marketplace_templates 
      WHERE supplier_id = p_creator_id
    );
END;
$$ LANGUAGE plpgsql;
`;
