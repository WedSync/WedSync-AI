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

    // Get user's organization
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
    const searchParams = request.nextUrl.searchParams;
    const metricCategory = searchParams.get('category') || 'all';
    const timeRange = searchParams.get('time_range') || '30d';
    const limit = parseInt(searchParams.get('limit') || '100');

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case 'all':
      default:
        startDate.setFullYear(endDate.getFullYear() - 2); // Default to 2 years
        break;
    }

    // Query progress metrics
    let metricsQuery = supabase
      .from('progress_metrics')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('last_updated', startDate.toISOString())
      .lte('last_updated', endDate.toISOString())
      .order('last_updated', { ascending: true })
      .limit(limit);

    if (metricCategory !== 'all') {
      metricsQuery = metricsQuery.eq('metric_category', metricCategory);
    }

    const { data: metrics, error: metricsError } = await metricsQuery;

    if (metricsError) {
      console.error('Error fetching progress metrics:', metricsError);
      return NextResponse.json(
        { error: 'Failed to fetch progress metrics' },
        { status: 500 },
      );
    }

    // Query progress snapshots for historical data
    const { data: snapshots, error: snapshotsError } = await supabase
      .from('progress_snapshots')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('snapshot_date', startDate.toISOString().split('T')[0])
      .lte('snapshot_date', endDate.toISOString().split('T')[0])
      .order('snapshot_date', { ascending: true })
      .limit(limit);

    if (snapshotsError) {
      console.error('Error fetching progress snapshots:', snapshotsError);
      return NextResponse.json(
        { error: 'Failed to fetch progress snapshots' },
        { status: 500 },
      );
    }

    // Calculate aggregated metrics
    const aggregatedMetrics = calculateAggregatedMetrics(
      metrics || [],
      snapshots || [],
    );

    // Get business context data
    const contextData = await getBusinessContextData(
      supabase,
      organizationId,
      startDate,
      endDate,
    );

    return NextResponse.json({
      metrics: metrics || [],
      snapshots: snapshots || [],
      aggregated: aggregatedMetrics,
      context: contextData,
      timeRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        range: timeRange,
      },
      organization: {
        id: organizationId,
      },
    });
  } catch (error) {
    console.error('Error in progress API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Calculate aggregated metrics from raw data
function calculateAggregatedMetrics(metrics: any[], snapshots: any[]) {
  const aggregated = {
    totalMetrics: metrics.length,
    uniqueMetrics: new Set(metrics.map((m) => m.metric_name)).size,
    averageProgress: 0,
    trendingSummary: {
      improving: 0,
      declining: 0,
      stable: 0,
    },
    categoryBreakdown: {} as Record<string, number>,
  };

  if (metrics.length === 0) return aggregated;

  // Calculate average progress
  const progressValues = metrics
    .filter(
      (m) =>
        m.progress_percentage !== null && m.progress_percentage !== undefined,
    )
    .map((m) => m.progress_percentage);

  if (progressValues.length > 0) {
    aggregated.averageProgress =
      progressValues.reduce((sum, val) => sum + val, 0) / progressValues.length;
  }

  // Count trends
  metrics.forEach((metric) => {
    if (metric.trend_direction === 'up') aggregated.trendingSummary.improving++;
    else if (metric.trend_direction === 'down')
      aggregated.trendingSummary.declining++;
    else aggregated.trendingSummary.stable++;

    // Category breakdown
    const category = metric.metric_category || 'other';
    aggregated.categoryBreakdown[category] =
      (aggregated.categoryBreakdown[category] || 0) + 1;
  });

  return aggregated;
}

// Get business context data for metrics
async function getBusinessContextData(
  supabase: any,
  organizationId: string,
  startDate: Date,
  endDate: Date,
) {
  const context: any = {
    totalClients: 0,
    activeClients: 0,
    upcomingWeddings: 0,
    completedTasks: 0,
    pendingTasks: 0,
    recentFormSubmissions: 0,
  };

  try {
    // Get client statistics
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, status, wedding_date')
      .eq('organization_id', organizationId);

    if (!clientsError && clients) {
      context.totalClients = clients.length;
      context.activeClients = clients.filter(
        (c) => c.status === 'active',
      ).length;

      // Count upcoming weddings (within next 6 months)
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

      context.upcomingWeddings = clients.filter((c) => {
        if (!c.wedding_date) return false;
        const weddingDate = new Date(c.wedding_date);
        return weddingDate >= new Date() && weddingDate <= sixMonthsFromNow;
      }).length;
    }

    // Get task statistics (if tasks table exists)
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(
        `
        id, 
        status, 
        client:clients!inner(organization_id)
      `,
      )
      .eq('clients.organization_id', organizationId);

    if (!tasksError && tasks) {
      context.completedTasks = tasks.filter(
        (t) => t.status === 'completed',
      ).length;
      context.pendingTasks = tasks.filter(
        (t) => t.status !== 'completed',
      ).length;
    }

    // Get form submission statistics
    const { data: formSubmissions, error: formsError } = await supabase
      .from('form_submissions')
      .select(
        `
        id,
        submitted_at,
        form:forms!inner(organization_id)
      `,
      )
      .eq('forms.organization_id', organizationId)
      .gte('submitted_at', startDate.toISOString())
      .lte('submitted_at', endDate.toISOString());

    if (!formsError && formSubmissions) {
      context.recentFormSubmissions = formSubmissions.length;
    }
  } catch (error) {
    console.error('Error fetching business context data:', error);
  }

  return context;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
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

    const body = await request.json();
    const {
      metric_name,
      metric_category,
      current_value,
      target_value,
      unit = 'count',
      calculation_config = {},
      alert_thresholds = {},
    } = body;

    // Validate required fields
    if (!metric_name || !metric_category || current_value === undefined) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: metric_name, metric_category, current_value',
        },
        { status: 400 },
      );
    }

    // Insert or update progress metric
    const { data: metric, error: metricError } = await supabase
      .from('progress_metrics')
      .upsert(
        {
          organization_id: orgMember.organization_id,
          metric_name,
          metric_category,
          current_value,
          target_value,
          unit,
          calculation_config,
          alert_thresholds,
          last_updated: new Date().toISOString(),
        },
        {
          onConflict: 'organization_id,metric_name,metric_category',
          ignoreDuplicates: false,
        },
      )
      .select()
      .single();

    if (metricError) {
      console.error('Error creating/updating progress metric:', metricError);
      return NextResponse.json(
        { error: 'Failed to create/update progress metric' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      metric,
    });
  } catch (error) {
    console.error('Error in progress POST API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
