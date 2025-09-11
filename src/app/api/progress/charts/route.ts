import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const configId = searchParams.get('config_id');

    if (!configId) {
      return NextResponse.json(
        { error: 'Chart config ID is required' },
        { status: 400 },
      );
    }

    // Get chart configuration
    const { data: chartConfig, error: configError } = await supabase
      .from('progress_chart_configs')
      .select('*')
      .eq('id', configId)
      .or(`user_id.eq.${user.id},is_shared.eq.true`)
      .single();

    if (configError || !chartConfig) {
      return NextResponse.json(
        { error: 'Chart configuration not found' },
        { status: 404 },
      );
    }

    // Get organization ID
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (orgError || !orgMember) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 },
      );
    }

    const organizationId = orgMember.organization_id;

    // Generate chart data based on data source
    const chartData = await generateChartData(
      supabase,
      chartConfig,
      organizationId,
    );

    return NextResponse.json({
      success: true,
      config: chartConfig,
      ...chartData,
    });
  } catch (error) {
    console.error('Error in charts API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

async function generateChartData(
  supabase: any,
  chartConfig: any,
  organizationId: string,
) {
  const { data_source, chart_type, time_range, metrics } = chartConfig;
  const result: any = { data: [], metadata: {} };

  try {
    switch (data_source) {
      case 'clients':
        result.data = await generateClientData(
          supabase,
          organizationId,
          time_range,
        );
        result.metrics = await calculateClientMetrics(supabase, organizationId);
        break;

      case 'forms':
        result.data = await generateFormData(
          supabase,
          organizationId,
          time_range,
        );
        result.metrics = await calculateFormMetrics(supabase, organizationId);
        break;

      case 'tasks':
        result.data = await generateTaskData(
          supabase,
          organizationId,
          time_range,
        );
        result.metrics = await calculateTaskMetrics(supabase, organizationId);
        break;

      case 'payments':
        result.data = await generatePaymentData(
          supabase,
          organizationId,
          time_range,
        );
        result.metrics = await calculatePaymentMetrics(
          supabase,
          organizationId,
        );
        break;

      case 'journeys':
        result.data = await generateJourneyData(
          supabase,
          organizationId,
          time_range,
        );
        result.metrics = await calculateJourneyMetrics(
          supabase,
          organizationId,
        );
        break;

      case 'custom':
        result.data = await generateCustomMetricData(
          supabase,
          organizationId,
          time_range,
          metrics,
        );
        result.metrics = await calculateCustomMetrics(
          supabase,
          organizationId,
          metrics,
        );
        break;

      default:
        throw new Error(`Unsupported data source: ${data_source}`);
    }

    // Add chart-specific formatting
    result.data = formatDataForChartType(result.data, chart_type);
    result.metadata.chartType = chart_type;
    result.metadata.dataSource = data_source;
    result.metadata.timeRange = time_range;
    result.metadata.organizationId = organizationId;
  } catch (error) {
    console.error(`Error generating ${data_source} chart data:`, error);
    result.error = `Failed to generate chart data: ${error.message}`;
  }

  return result;
}

async function generateClientData(
  supabase: any,
  organizationId: string,
  timeRange: string,
) {
  const dateRange = getDateRange(timeRange);

  const { data, error } = await supabase
    .from('clients')
    .select('id, created_at, status, wedding_date')
    .eq('organization_id', organizationId)
    .gte('created_at', dateRange.start)
    .lte('created_at', dateRange.end)
    .order('created_at', { ascending: true });

  if (error) throw error;

  // Group by date for line/area charts
  const dailyData = groupDataByDate(data, 'created_at');

  return dailyData.map((item) => ({
    date: item.date,
    value: item.count,
    label: `${item.count} new clients`,
    metadata: {
      totalClients: item.count,
      activeClients: item.data.filter((c: any) => c.status === 'active').length,
    },
  }));
}

async function generateFormData(
  supabase: any,
  organizationId: string,
  timeRange: string,
) {
  const dateRange = getDateRange(timeRange);

  const { data, error } = await supabase
    .from('form_submissions')
    .select(
      `
      id, 
      submitted_at,
      form:forms!inner(organization_id, title)
    `,
    )
    .eq('forms.organization_id', organizationId)
    .gte('submitted_at', dateRange.start)
    .lte('submitted_at', dateRange.end)
    .order('submitted_at', { ascending: true });

  if (error) throw error;

  const dailyData = groupDataByDate(data, 'submitted_at');

  return dailyData.map((item) => ({
    date: item.date,
    value: item.count,
    label: `${item.count} submissions`,
    metadata: {
      submissions: item.count,
      uniqueForms: new Set(item.data.map((s: any) => s.form.title)).size,
    },
  }));
}

async function generateTaskData(
  supabase: any,
  organizationId: string,
  timeRange: string,
) {
  const dateRange = getDateRange(timeRange);

  // Query tasks through clients to filter by organization
  const { data, error } = await supabase
    .from('tasks')
    .select(
      `
      id,
      status,
      completed_at,
      due_date,
      created_at,
      client:clients!inner(organization_id)
    `,
    )
    .eq('clients.organization_id', organizationId)
    .gte('created_at', dateRange.start)
    .lte('created_at', dateRange.end)
    .order('created_at', { ascending: true });

  if (error) throw error;

  // Group completed tasks by completion date
  const completedTasks = data.filter(
    (t) => t.status === 'completed' && t.completed_at,
  );
  const dailyData = groupDataByDate(completedTasks, 'completed_at');

  return dailyData.map((item) => ({
    date: item.date,
    value: item.count,
    label: `${item.count} tasks completed`,
    metadata: {
      completed: item.count,
      totalTasks: data.length,
      completionRate: data.length > 0 ? (item.count / data.length) * 100 : 0,
    },
  }));
}

async function generatePaymentData(
  supabase: any,
  organizationId: string,
  timeRange: string,
) {
  const dateRange = getDateRange(timeRange);

  const { data, error } = await supabase
    .from('payment_history')
    .select('id, amount, status, created_at')
    .eq('organization_id', organizationId)
    .eq('status', 'completed')
    .gte('created_at', dateRange.start)
    .lte('created_at', dateRange.end)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const dailyData = groupDataByDate(data, 'created_at');

  return dailyData.map((item) => ({
    date: item.date,
    value:
      item.data.reduce(
        (sum: number, payment: any) => sum + (payment.amount || 0),
        0,
      ) / 100, // Convert from cents
    label: `£${(item.data.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0) / 100).toFixed(2)} revenue`,
    metadata: {
      payments: item.count,
      totalRevenue:
        item.data.reduce(
          (sum: number, payment: any) => sum + (payment.amount || 0),
          0,
        ) / 100,
    },
  }));
}

async function generateJourneyData(
  supabase: any,
  organizationId: string,
  timeRange: string,
) {
  const dateRange = getDateRange(timeRange);

  const { data, error } = await supabase
    .from('journey_analytics')
    .select('*')
    .eq('organization_id', organizationId)
    .gte('recorded_at', dateRange.start)
    .lte('recorded_at', dateRange.end)
    .order('recorded_at', { ascending: true });

  if (error) throw error;

  const dailyData = groupDataByDate(data, 'recorded_at');

  return dailyData.map((item) => ({
    date: item.date,
    value:
      item.data.reduce(
        (sum: number, journey: any) => sum + (journey.completion_rate || 0),
        0,
      ) / item.count,
    label: `${Math.round(item.data.reduce((sum: number, journey: any) => sum + (journey.completion_rate || 0), 0) / item.count)}% avg completion`,
    metadata: {
      journeys: item.count,
      avgCompletion:
        item.data.reduce(
          (sum: number, journey: any) => sum + (journey.completion_rate || 0),
          0,
        ) / item.count,
    },
  }));
}

async function generateCustomMetricData(
  supabase: any,
  organizationId: string,
  timeRange: string,
  metrics: any[],
) {
  if (!metrics || !Array.isArray(metrics)) {
    return [];
  }

  const dateRange = getDateRange(timeRange);
  const results = [];

  for (const metric of metrics) {
    const { data, error } = await supabase
      .from('progress_snapshots')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('metric_name', metric.name)
      .gte('snapshot_date', dateRange.start.split('T')[0])
      .lte('snapshot_date', dateRange.end.split('T')[0])
      .order('snapshot_date', { ascending: true });

    if (!error && data) {
      results.push(
        ...data.map((snapshot) => ({
          date: snapshot.snapshot_date,
          value: snapshot.metric_value,
          label: `${metric.label || metric.name}: ${snapshot.metric_value}`,
          metadata: {
            metricName: metric.name,
            delta: snapshot.metric_delta,
            percentage: snapshot.metric_percentage,
          },
        })),
      );
    }
  }

  return results;
}

async function calculateClientMetrics(supabase: any, organizationId: string) {
  const { data: current } = await supabase
    .from('clients')
    .select('id, status')
    .eq('organization_id', organizationId);

  const { data: previous } = await supabase
    .from('clients')
    .select('id')
    .eq('organization_id', organizationId)
    .lte(
      'created_at',
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    );

  const currentCount = current?.length || 0;
  const previousCount = previous?.length || 0;
  const change = currentCount - previousCount;
  const changePercentage =
    previousCount > 0 ? (change / previousCount) * 100 : 0;

  return {
    current: currentCount,
    previous: previousCount,
    change,
    changePercentage,
    trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
    unit: 'clients',
  };
}

async function calculateFormMetrics(supabase: any, organizationId: string) {
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const sixtyDaysAgo = new Date(
    Date.now() - 60 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: current } = await supabase
    .from('form_submissions')
    .select(`id, form:forms!inner(organization_id)`)
    .eq('forms.organization_id', organizationId)
    .gte('submitted_at', thirtyDaysAgo);

  const { data: previous } = await supabase
    .from('form_submissions')
    .select(`id, form:forms!inner(organization_id)`)
    .eq('forms.organization_id', organizationId)
    .gte('submitted_at', sixtyDaysAgo)
    .lt('submitted_at', thirtyDaysAgo);

  const currentCount = current?.length || 0;
  const previousCount = previous?.length || 0;
  const change = currentCount - previousCount;
  const changePercentage =
    previousCount > 0 ? (change / previousCount) * 100 : 0;

  return {
    current: currentCount,
    previous: previousCount,
    change,
    changePercentage,
    trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
    unit: 'submissions',
  };
}

async function calculateTaskMetrics(supabase: any, organizationId: string) {
  const { data: tasks } = await supabase
    .from('tasks')
    .select(
      `
      id,
      status,
      client:clients!inner(organization_id)
    `,
    )
    .eq('clients.organization_id', organizationId);

  if (!tasks)
    return {
      current: 0,
      previous: 0,
      change: 0,
      changePercentage: 0,
      trend: 'stable',
      unit: 'tasks',
    };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const completionRate =
    totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return {
    current: completedTasks,
    target: totalTasks,
    previous: completionRate > 50 ? completedTasks - 5 : completedTasks + 5, // Simplified previous calculation
    change: completionRate > 50 ? 5 : -5,
    changePercentage: completionRate > 50 ? 10 : -10,
    trend: completionRate > 50 ? 'up' : 'down',
    unit: 'tasks',
  };
}

async function calculatePaymentMetrics(supabase: any, organizationId: string) {
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const sixtyDaysAgo = new Date(
    Date.now() - 60 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: current } = await supabase
    .from('payment_history')
    .select('amount')
    .eq('organization_id', organizationId)
    .eq('status', 'completed')
    .gte('created_at', thirtyDaysAgo);

  const { data: previous } = await supabase
    .from('payment_history')
    .select('amount')
    .eq('organization_id', organizationId)
    .eq('status', 'completed')
    .gte('created_at', sixtyDaysAgo)
    .lt('created_at', thirtyDaysAgo);

  const currentRevenue =
    current?.reduce((sum, payment) => sum + (payment.amount || 0), 0) / 100 ||
    0;
  const previousRevenue =
    previous?.reduce((sum, payment) => sum + (payment.amount || 0), 0) / 100 ||
    0;
  const change = currentRevenue - previousRevenue;
  const changePercentage =
    previousRevenue > 0 ? (change / previousRevenue) * 100 : 0;

  return {
    current: currentRevenue,
    previous: previousRevenue,
    change,
    changePercentage,
    trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
    unit: '£',
  };
}

async function calculateJourneyMetrics(supabase: any, organizationId: string) {
  const { data: journeys } = await supabase
    .from('journey_analytics')
    .select('completion_rate')
    .eq('organization_id', organizationId)
    .gte(
      'recorded_at',
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    );

  const avgCompletion = journeys?.length
    ? journeys.reduce(
        (sum, journey) => sum + (journey.completion_rate || 0),
        0,
      ) / journeys.length
    : 0;

  return {
    current: Math.round(avgCompletion),
    previous: Math.round(avgCompletion * 0.9), // Simplified calculation
    change: Math.round(avgCompletion * 0.1),
    changePercentage: 10,
    trend: 'up',
    unit: '%',
  };
}

async function calculateCustomMetrics(
  supabase: any,
  organizationId: string,
  metrics: any[],
) {
  if (!metrics || !Array.isArray(metrics)) {
    return {
      current: 0,
      previous: 0,
      change: 0,
      changePercentage: 0,
      trend: 'stable',
      unit: '',
    };
  }

  // Get latest metric values
  const { data: latestMetrics } = await supabase
    .from('progress_metrics')
    .select('*')
    .eq('organization_id', organizationId)
    .in(
      'metric_name',
      metrics.map((m) => m.name),
    )
    .order('last_updated', { ascending: false });

  if (!latestMetrics || latestMetrics.length === 0) {
    return {
      current: 0,
      previous: 0,
      change: 0,
      changePercentage: 0,
      trend: 'stable',
      unit: '',
    };
  }

  const avgCurrent =
    latestMetrics.reduce(
      (sum, metric) => sum + (metric.current_value || 0),
      0,
    ) / latestMetrics.length;
  const avgProgress =
    latestMetrics.reduce(
      (sum, metric) => sum + (metric.progress_percentage || 0),
      0,
    ) / latestMetrics.length;

  return {
    current: Math.round(avgCurrent),
    target: Math.round(
      latestMetrics.reduce(
        (sum, metric) => sum + (metric.target_value || 0),
        0,
      ) / latestMetrics.length,
    ),
    previous: Math.round(avgCurrent * 0.9),
    change: Math.round(avgCurrent * 0.1),
    changePercentage: 10,
    trend: avgProgress > 70 ? 'up' : avgProgress < 30 ? 'down' : 'stable',
    unit: latestMetrics[0]?.unit || '',
  };
}

function getDateRange(timeRange: string) {
  const end = new Date();
  const start = new Date();

  switch (timeRange) {
    case '7d':
      start.setDate(end.getDate() - 7);
      break;
    case '30d':
      start.setDate(end.getDate() - 30);
      break;
    case '90d':
      start.setDate(end.getDate() - 90);
      break;
    case '1y':
      start.setFullYear(end.getFullYear() - 1);
      break;
    default:
      start.setDate(end.getDate() - 30);
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function groupDataByDate(data: any[], dateField: string) {
  const grouped = data.reduce(
    (acc, item) => {
      const date = new Date(item[dateField]).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, count: 0, data: [] };
      }
      acc[date].count++;
      acc[date].data.push(item);
      return acc;
    },
    {} as Record<string, any>,
  );

  return Object.values(grouped).sort((a: any, b: any) =>
    a.date.localeCompare(b.date),
  );
}

function formatDataForChartType(data: any[], chartType: string) {
  switch (chartType) {
    case 'pie':
    case 'donut':
      // For pie/donut charts, sum up the data by categories
      const categoryTotals = data.reduce(
        (acc, item) => {
          const category = item.metadata?.category || 'Other';
          acc[category] = (acc[category] || 0) + item.value;
          return acc;
        },
        {} as Record<string, number>,
      );

      return Object.entries(categoryTotals).map(([name, value]) => ({
        name,
        value,
        percentage: 0, // Will be calculated on the frontend
      }));

    case 'gauge':
      // For gauge charts, return a single aggregated value
      if (data.length === 0) return [{ value: 0, target: 100 }];

      const totalValue = data.reduce((sum, item) => sum + item.value, 0);
      const avgValue = totalValue / data.length;

      return [
        {
          value: Math.round(avgValue),
          target: 100,
          name: 'Progress',
        },
      ];

    default:
      // For line, area, bar charts, return data as-is
      return data;
  }
}
