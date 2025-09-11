import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface MRRSnapshot {
  snapshot_date: string;
  total_mrr: number;
  new_mrr: number;
  expansion_mrr: number;
  contraction_mrr: number;
  churned_mrr: number;
  reactivation_mrr: number;
  net_new_mrr: number;
  active_subscriptions: number;
  new_subscriptions: number;
  churned_subscriptions: number;
  average_revenue_per_user: number;
  customer_lifetime_value: number;
  churn_rate: number;
  growth_rate: number;
  quick_ratio: number;
}

interface CohortData {
  cohort_month: string;
  analysis_month: string;
  months_since_signup: number;
  initial_customers: number;
  retained_customers: number;
  retention_rate: number;
  initial_mrr: number;
  retained_mrr: number;
  revenue_retention_rate: number;
}

interface RevenueSegment {
  segment_name: string;
  segment_type: string;
  total_mrr: number;
  customer_count: number;
  average_mrr: number;
  growth_rate: number;
  churn_rate: number;
}

interface ChurnPrediction {
  user_id: string;
  churn_probability: number;
  risk_level: string;
  risk_factors: any[];
  engagement_score: number;
  usage_trend: string;
  recommended_actions: any[];
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const period = searchParams.get('period') || '30d';
  const type = searchParams.get('type') || 'snapshot';

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '365d':
        startDate.setDate(startDate.getDate() - 365);
        break;
      case 'all':
        startDate.setFullYear(startDate.getFullYear() - 10);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    switch (type) {
      case 'snapshot':
        return await getMRRSnapshots(supabase, startDate, endDate);
      case 'cohort':
        return await getCohortAnalysis(supabase, startDate, endDate);
      case 'segments':
        return await getRevenueSegments(supabase, startDate, endDate);
      case 'churn':
        return await getChurnPredictions(supabase);
      case 'movements':
        return await getMRRMovements(supabase, startDate, endDate);
      default:
        return await getMRRSnapshots(supabase, startDate, endDate);
    }
  } catch (error) {
    console.error('MRR API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getMRRSnapshots(supabase: any, startDate: Date, endDate: Date) {
  const { data: snapshots, error } = await supabase
    .from('mrr_snapshots')
    .select('*')
    .gte('snapshot_date', startDate.toISOString().split('T')[0])
    .lte('snapshot_date', endDate.toISOString().split('T')[0])
    .order('snapshot_date', { ascending: true });

  if (error) {
    console.error('Error fetching MRR snapshots:', error);
    return Response.json(
      { error: 'Failed to fetch MRR data' },
      { status: 500 },
    );
  }

  // Calculate summary metrics
  const latestSnapshot = snapshots?.[snapshots.length - 1];
  const previousSnapshot = snapshots?.[snapshots.length - 2];

  const summary = {
    current_mrr: latestSnapshot?.total_mrr || 0,
    previous_mrr: previousSnapshot?.total_mrr || 0,
    mrr_growth:
      latestSnapshot && previousSnapshot
        ? ((latestSnapshot.total_mrr - previousSnapshot.total_mrr) /
            previousSnapshot.total_mrr) *
          100
        : 0,
    total_customers: latestSnapshot?.active_subscriptions || 0,
    new_customers: latestSnapshot?.new_subscriptions || 0,
    churned_customers: latestSnapshot?.churned_subscriptions || 0,
    arpu: latestSnapshot?.average_revenue_per_user || 0,
    ltv: latestSnapshot?.customer_lifetime_value || 0,
    churn_rate: latestSnapshot?.churn_rate || 0,
    quick_ratio: latestSnapshot?.quick_ratio || 0,
  };

  return Response.json({
    summary,
    snapshots,
    chart_data: formatChartData(snapshots),
  });
}

async function getCohortAnalysis(
  supabase: any,
  startDate: Date,
  endDate: Date,
) {
  const { data: cohorts, error } = await supabase
    .from('cohort_analysis')
    .select('*')
    .gte('cohort_month', startDate.toISOString().split('T')[0])
    .lte('cohort_month', endDate.toISOString().split('T')[0])
    .order('cohort_month', { ascending: true })
    .order('months_since_signup', { ascending: true });

  if (error) {
    console.error('Error fetching cohort data:', error);
    return Response.json(
      { error: 'Failed to fetch cohort data' },
      { status: 500 },
    );
  }

  // Format cohort data for visualization
  const cohortMatrix = formatCohortMatrix(cohorts);

  return Response.json({
    cohorts,
    matrix: cohortMatrix,
    summary: calculateCohortSummary(cohorts),
  });
}

async function getRevenueSegments(
  supabase: any,
  startDate: Date,
  endDate: Date,
) {
  const { data: segments, error } = await supabase
    .from('revenue_segments')
    .select('*')
    .gte('month', startDate.toISOString().split('T')[0])
    .lte('month', endDate.toISOString().split('T')[0])
    .order('total_mrr', { ascending: false });

  if (error) {
    console.error('Error fetching revenue segments:', error);
    return Response.json(
      { error: 'Failed to fetch segment data' },
      { status: 500 },
    );
  }

  // Group segments by type
  const segmentsByType = segments?.reduce(
    (acc: any, segment: RevenueSegment) => {
      if (!acc[segment.segment_type]) {
        acc[segment.segment_type] = [];
      }
      acc[segment.segment_type].push(segment);
      return acc;
    },
    {},
  );

  return Response.json({
    segments,
    by_type: segmentsByType,
    top_segments: segments?.slice(0, 10),
  });
}

async function getChurnPredictions(supabase: any) {
  const { data: predictions, error } = await supabase
    .from('churn_predictions')
    .select(
      `
      *,
      user:auth.users!churn_predictions_user_id_fkey(
        email,
        created_at
      )
    `,
    )
    .eq('prediction_date', new Date().toISOString().split('T')[0])
    .order('churn_probability', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching churn predictions:', error);
    return Response.json(
      { error: 'Failed to fetch churn predictions' },
      { status: 500 },
    );
  }

  // Group by risk level
  const byRiskLevel = predictions?.reduce((acc: any, pred: ChurnPrediction) => {
    if (!acc[pred.risk_level]) {
      acc[pred.risk_level] = [];
    }
    acc[pred.risk_level].push(pred);
    return acc;
  }, {});

  return Response.json({
    predictions,
    by_risk_level: byRiskLevel,
    high_risk_count: byRiskLevel?.critical?.length || 0,
    total_at_risk:
      predictions?.filter((p: ChurnPrediction) => p.churn_probability > 50)
        .length || 0,
  });
}

async function getMRRMovements(supabase: any, startDate: Date, endDate: Date) {
  const { data: movements, error } = await supabase
    .from('mrr_movement_log')
    .select(
      `
      *,
      user:auth.users!mrr_movement_log_user_id_fkey(
        email
      )
    `,
    )
    .gte('movement_date', startDate.toISOString().split('T')[0])
    .lte('movement_date', endDate.toISOString().split('T')[0])
    .order('movement_date', { ascending: false });

  if (error) {
    console.error('Error fetching MRR movements:', error);
    return Response.json(
      { error: 'Failed to fetch movement data' },
      { status: 500 },
    );
  }

  // Group movements by type
  const byType = movements?.reduce((acc: any, movement: any) => {
    if (!acc[movement.movement_type]) {
      acc[movement.movement_type] = {
        count: 0,
        total_change: 0,
        movements: [],
      };
    }
    acc[movement.movement_type].count++;
    acc[movement.movement_type].total_change += movement.mrr_change;
    acc[movement.movement_type].movements.push(movement);
    return acc;
  }, {});

  return Response.json({
    movements,
    by_type: byType,
    net_change:
      movements?.reduce((sum: number, m: any) => sum + m.mrr_change, 0) || 0,
  });
}

// Helper functions
function formatChartData(snapshots: MRRSnapshot[]) {
  return snapshots?.map((snapshot) => ({
    date: snapshot.snapshot_date,
    mrr: snapshot.total_mrr,
    new: snapshot.new_mrr,
    expansion: snapshot.expansion_mrr,
    contraction: snapshot.contraction_mrr,
    churn: snapshot.churned_mrr,
    reactivation: snapshot.reactivation_mrr,
    net: snapshot.net_new_mrr,
    customers: snapshot.active_subscriptions,
  }));
}

function formatCohortMatrix(cohorts: CohortData[]) {
  const matrix: any = {};

  cohorts?.forEach((cohort) => {
    if (!matrix[cohort.cohort_month]) {
      matrix[cohort.cohort_month] = {};
    }
    matrix[cohort.cohort_month][cohort.months_since_signup] = {
      retention_rate: cohort.retention_rate,
      revenue_retention: cohort.revenue_retention_rate,
      customers: cohort.retained_customers,
      mrr: cohort.retained_mrr,
    };
  });

  return matrix;
}

function calculateCohortSummary(cohorts: CohortData[]) {
  const averageRetention =
    cohorts?.reduce((sum, c) => sum + c.retention_rate, 0) /
    (cohorts?.length || 1);
  const averageRevenueRetention =
    cohorts?.reduce((sum, c) => sum + c.revenue_retention_rate, 0) /
    (cohorts?.length || 1);

  return {
    average_retention: averageRetention || 0,
    average_revenue_retention: averageRevenueRetention || 0,
    cohort_count: new Set(cohorts?.map((c) => c.cohort_month)).size || 0,
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'calculate_snapshot':
        // Trigger MRR snapshot calculation
        const today = new Date().toISOString().split('T')[0];
        const { error: calcError } = await supabase.rpc(
          'calculate_mrr_snapshot',
          { snapshot_date: today },
        );

        if (calcError) {
          return Response.json(
            { error: 'Failed to calculate snapshot' },
            { status: 500 },
          );
        }

        return Response.json({
          success: true,
          message: 'MRR snapshot calculated',
        });

      case 'generate_cohorts':
        // Generate cohort analysis
        const analysisDate = new Date().toISOString().split('T')[0];
        const { error: cohortError } = await supabase.rpc(
          'generate_cohort_analysis',
          { analysis_date: analysisDate },
        );

        if (cohortError) {
          return Response.json(
            { error: 'Failed to generate cohorts' },
            { status: 500 },
          );
        }

        return Response.json({
          success: true,
          message: 'Cohort analysis generated',
        });

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('MRR POST error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
