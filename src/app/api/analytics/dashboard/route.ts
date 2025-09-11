import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

function getTimeframeFilter(timeframe: string): string {
  const now = new Date();
  switch (timeframe) {
    case '7d':
      return new Date(now.setDate(now.getDate() - 7)).toISOString();
    case '30d':
      return new Date(now.setDate(now.getDate() - 30)).toISOString();
    case '90d':
      return new Date(now.setDate(now.getDate() - 90)).toISOString();
    default:
      return new Date(now.setDate(now.getDate() - 30)).toISOString();
  }
}

async function getJourneyOverview(
  supabase: any,
  supplierId: string | null,
  timeframe: string,
) {
  // Use the high-performance materialized view
  let query = supabase.from('journey_performance_summary').select('*');

  if (supplierId) {
    query = query.eq('supplier_id', supplierId);
  }

  const { data, error } = await query;

  if (error) throw error;

  if (!data || data.length === 0) {
    return {
      total_journeys: 0,
      total_instances: 0,
      avg_conversion_rate: 0,
      total_revenue: 0,
      active_clients: 0,
      avg_engagement_score: 0,
    };
  }

  // Calculate aggregated metrics from materialized view
  const metrics = {
    total_journeys: data.length,
    total_instances: data.reduce((sum, j) => sum + (j.total_instances || 0), 0),
    avg_conversion_rate:
      data.reduce((sum, j) => sum + (j.completion_rate || 0), 0) / data.length,
    total_revenue: data.reduce(
      (sum, j) => sum + parseFloat(j.revenue_30d || 0),
      0,
    ),
    active_clients: data.reduce((sum, j) => sum + (j.active_instances || 0), 0),
    avg_engagement_score: calculateEngagementScore(data),
  };

  return metrics;
}

function calculateEngagementScore(data: any[]) {
  if (!data || data.length === 0) return 0;

  // Calculate engagement based on completion rate and revenue per client
  const scores = data.map((j) => {
    const completionScore = (j.completion_rate || 0) / 100;
    const revenueScore = Math.min((j.revenue_per_client || 0) / 1000, 1); // Normalize to 0-1
    return completionScore * 0.6 + revenueScore * 0.4; // Weighted average
  });

  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

async function getConversionFunnel(
  supabase: any,
  supplierId: string | null,
  timeframe: string,
) {
  // Use the optimized funnel analysis view
  let query = supabase
    .from('journey_funnel_analysis')
    .select(
      `
      journey_id,
      node_name,
      sequence_order,
      instances_reached,
      instances_completed,
      conversion_from_previous,
      journey_canvases!inner(supplier_id, name)
    `,
    )
    .order('sequence_order')
    .limit(6); // Top 6 stages for funnel

  if (supplierId) {
    query = query.eq('journey_canvases.supplier_id', supplierId);
  }

  const { data: funnelData, error } = await query;

  if (error) throw error;

  // If we have real funnel data, use it
  if (funnelData && funnelData.length > 0) {
    const totalStarted = funnelData[0]?.instances_reached || 0;

    return funnelData.map((stage, index) => ({
      name: stage.node_name || `Stage ${index + 1}`,
      value: stage.instances_reached || 0,
      percentage:
        totalStarted > 0
          ? ((stage.instances_reached || 0) / totalStarted) * 100
          : 0,
      completion_rate:
        stage.instances_completed && stage.instances_reached
          ? (stage.instances_completed / stage.instances_reached) * 100
          : 0,
    }));
  }

  // Fallback to progress-based funnel if no node data
  const { data: progressData, error: progressError } = await supabase
    .from('client_journey_progress')
    .select('completion_percentage')
    .gte('created_at', getTimeframeFilter(timeframe));

  if (progressError) throw progressError;

  const total = progressData?.length || 0;
  return [
    {
      name: 'Journey Started',
      value: total,
      percentage: 100,
      completion_rate: 100,
    },
    {
      name: 'First Interaction',
      value:
        progressData?.filter((d) => d.completion_percentage > 0).length || 0,
      percentage:
        total > 0
          ? ((progressData?.filter((d) => d.completion_percentage > 0).length ||
              0) /
              total) *
            100
          : 0,
      completion_rate: 85,
    },
    {
      name: '25% Complete',
      value:
        progressData?.filter((d) => d.completion_percentage >= 25).length || 0,
      percentage:
        total > 0
          ? ((progressData?.filter((d) => d.completion_percentage >= 25)
              .length || 0) /
              total) *
            100
          : 0,
      completion_rate: 70,
    },
    {
      name: '50% Complete',
      value:
        progressData?.filter((d) => d.completion_percentage >= 50).length || 0,
      percentage:
        total > 0
          ? ((progressData?.filter((d) => d.completion_percentage >= 50)
              .length || 0) /
              total) *
            100
          : 0,
      completion_rate: 55,
    },
    {
      name: '75% Complete',
      value:
        progressData?.filter((d) => d.completion_percentage >= 75).length || 0,
      percentage:
        total > 0
          ? ((progressData?.filter((d) => d.completion_percentage >= 75)
              .length || 0) /
              total) *
            100
          : 0,
      completion_rate: 40,
    },
    {
      name: 'Journey Completed',
      value:
        progressData?.filter((d) => d.completion_percentage >= 100).length || 0,
      percentage:
        total > 0
          ? ((progressData?.filter((d) => d.completion_percentage >= 100)
              .length || 0) /
              total) *
            100
          : 0,
      completion_rate: 30,
    },
  ];
}

async function getRevenueAttribution(
  supabase: any,
  supplierId: string | null,
  timeframe: string,
) {
  const timeframeFilter = getTimeframeFilter(timeframe);

  let query = supabase
    .from('journey_revenue_attribution')
    .select(
      `
      revenue_amount,
      revenue_type,
      journey_id,
      recorded_at,
      journey_canvases!inner(supplier_id, name)
    `,
    )
    .gte('recorded_at', timeframeFilter);

  if (supplierId) {
    query = query.eq('journey_canvases.supplier_id', supplierId);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Group by revenue type
  const revenueByType =
    data?.reduce((acc: any, item) => {
      if (!acc[item.revenue_type]) {
        acc[item.revenue_type] = 0;
      }
      acc[item.revenue_type] += parseFloat(item.revenue_amount);
      return acc;
    }, {}) || {};

  // Group by journey
  const revenueByJourney =
    data?.reduce((acc: any, item) => {
      const journeyName = item.journey_canvases?.name || 'Unknown';
      if (!acc[journeyName]) {
        acc[journeyName] = 0;
      }
      acc[journeyName] += parseFloat(item.revenue_amount);
      return acc;
    }, {}) || {};

  return {
    by_type: revenueByType,
    by_journey: revenueByJourney,
    total:
      data?.reduce((sum, item) => sum + parseFloat(item.revenue_amount), 0) ||
      0,
  };
}

async function getActiveJourneys(supabase: any, supplierId: string | null) {
  let query = supabase
    .from('journey_instances')
    .select(
      `
      id,
      status,
      created_at,
      current_node_id,
      journey_id,
      client_id,
      journey_canvases!inner(id, name, supplier_id),
      clients!inner(name, email),
      client_journey_progress(completion_percentage, engagement_level)
    `,
    )
    .in('status', ['active', 'running'])
    .order('created_at', { ascending: false })
    .limit(10);

  if (supplierId) {
    query = query.eq('journey_canvases.supplier_id', supplierId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (
    data?.map((instance) => ({
      id: instance.id,
      journey_name: instance.journey_canvases?.name || 'Unknown',
      client_name: instance.clients?.name || 'Unknown',
      client_email: instance.clients?.email || '',
      status: instance.status,
      completion:
        instance.client_journey_progress?.[0]?.completion_percentage || 0,
      engagement:
        instance.client_journey_progress?.[0]?.engagement_level || 'low',
      started_at: instance.created_at,
    })) || []
  );
}

async function getPerformanceHistory(
  supabase: any,
  supplierId: string | null,
  timeframe: string,
) {
  const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Use the optimized journey_metrics table for historical data
  let query = supabase
    .from('journey_metrics')
    .select(
      `
      date,
      instances_started,
      instances_completed,
      instances_failed,
      instances_active,
      conversion_rate,
      revenue_attributed,
      unique_clients,
      journey_canvases!inner(supplier_id)
    `,
    )
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (supplierId) {
    query = query.eq('journey_canvases.supplier_id', supplierId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Performance history error:', error);
    // Fallback to journey_analytics if journey_metrics doesn't exist yet
    return getFallbackPerformanceHistory(supabase, supplierId, timeframe);
  }

  // Aggregate by date
  const dateMap = new Map();

  data?.forEach((metric) => {
    const date = metric.date;
    if (!dateMap.has(date)) {
      dateMap.set(date, {
        date,
        total_instances: 0,
        completed_instances: 0,
        failed_instances: 0,
        active_instances: 0,
        conversion_rate: [],
        revenue: 0,
        unique_clients: 0,
      });
    }

    const dayData = dateMap.get(date);
    dayData.total_instances += metric.instances_started || 0;
    dayData.completed_instances += metric.instances_completed || 0;
    dayData.failed_instances += metric.instances_failed || 0;
    dayData.active_instances += metric.instances_active || 0;
    dayData.conversion_rate.push(metric.conversion_rate || 0);
    dayData.revenue += parseFloat(metric.revenue_attributed || 0);
    dayData.unique_clients += metric.unique_clients || 0;
  });

  // Convert to array and calculate average conversion rates
  const result = Array.from(dateMap.values()).map((day) => ({
    date: day.date,
    total_instances: day.total_instances,
    completed_instances: day.completed_instances,
    failed_instances: day.failed_instances,
    active_instances: day.active_instances,
    conversion_rate:
      day.conversion_rate.length > 0
        ? day.conversion_rate.reduce((a, b) => a + b, 0) /
          day.conversion_rate.length
        : 0,
    revenue: day.revenue,
    unique_clients: day.unique_clients,
  }));

  // Fill in missing dates with zeros
  const dates = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }

  return dates.map((date) => {
    const existing = result.find((r) => r.date === date);
    return (
      existing || {
        date,
        total_instances: 0,
        completed_instances: 0,
        failed_instances: 0,
        active_instances: 0,
        conversion_rate: 0,
        revenue: 0,
        unique_clients: 0,
      }
    );
  });
}

async function getFallbackPerformanceHistory(
  supabase: any,
  supplierId: string | null,
  timeframe: string,
) {
  const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
  const dates = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }

  let query = supabase
    .from('journey_analytics')
    .select('*')
    .in('date', dates)
    .order('date', { ascending: true });

  if (supplierId) {
    query = query.eq('supplier_id', supplierId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Fallback performance history error:', error);
    return dates.map((date) => ({
      date,
      total_instances: 0,
      completed_instances: 0,
      conversion_rate: 0,
      revenue: 0,
    }));
  }

  const byDate = dates.map((date) => {
    const dayData = data?.filter((d) => d.date === date) || [];
    return {
      date,
      total_instances: dayData.reduce(
        (sum, d) => sum + (d.total_instances || 0),
        0,
      ),
      completed_instances: dayData.reduce(
        (sum, d) => sum + (d.completed_instances || 0),
        0,
      ),
      conversion_rate:
        dayData.length > 0
          ? dayData.reduce((sum, d) => sum + (d.conversion_rate || 0), 0) /
            dayData.length
          : 0,
      revenue: dayData.reduce(
        (sum, d) => sum + parseFloat(d.revenue_attributed || 0),
        0,
      ),
    };
  });

  return byDate;
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '30d';
    const supplierId = searchParams.get('supplier_id');

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all dashboard data in parallel
    const [overview, funnel, revenue, activeJourneys, performanceHistory] =
      await Promise.all([
        getJourneyOverview(supabase, supplierId, timeframe),
        getConversionFunnel(supabase, supplierId, timeframe),
        getRevenueAttribution(supabase, supplierId, timeframe),
        getActiveJourneys(supabase, supplierId),
        getPerformanceHistory(supabase, supplierId, timeframe),
      ]);

    return NextResponse.json({
      overview,
      funnel,
      revenue,
      active_journeys: activeJourneys,
      performance_history: performanceHistory,
      last_updated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to load analytics data' },
      { status: 500 },
    );
  }
}
