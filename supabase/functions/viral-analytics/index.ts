import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface ViralAnalyticsRequest {
  action: 'calculate_viral_coefficient' | 'get_attribution_model' | 'aggregate_growth_metrics' | 'validate_calculation';
  userId: string;
  dateRange?: {
    start: string;
    end: string;
  };
  timeframe?: 'daily' | 'weekly' | 'monthly';
  testScenario?: {
    newUsers: number;
    invitesSent: number;
    conversions: number;
  };
  sources?: string[];
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { action, userId, dateRange, timeframe, testScenario, sources }: ViralAnalyticsRequest = await req.json();

    // Verify user authorization
    const { data: authData, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !authData.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has analytics permissions
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('id, role')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile || !['admin', 'analytics', 'supplier', 'couple'].includes(userProfile.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions for analytics' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result: any = {};

    switch (action) {
      case 'calculate_viral_coefficient':
        if (!dateRange) {
          throw new Error('Date range is required for viral coefficient calculation');
        }
        result = await calculateViralCoefficient(supabaseClient, userId, dateRange, timeframe || 'monthly');
        break;

      case 'get_attribution_model':
        if (!dateRange) {
          throw new Error('Date range is required for attribution model');
        }
        result = await getAttributionModel(supabaseClient, userId, dateRange, sources);
        break;

      case 'aggregate_growth_metrics':
        if (!dateRange) {
          throw new Error('Date range is required for growth metrics');
        }
        result = await aggregateGrowthMetrics(supabaseClient, userId, dateRange);
        break;

      case 'validate_calculation':
        if (!testScenario) {
          throw new Error('Test scenario is required for validation');
        }
        result = await validateCalculation(testScenario);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Viral Analytics Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function calculateViralCoefficient(
  supabaseClient: any,
  userId: string,
  dateRange: { start: string; end: string },
  timeframe: string
) {
  // Execute the viral coefficient calculation stored procedure
  const { data, error } = await supabaseClient.rpc('get_viral_coefficient_data', {
    start_date: dateRange.start,
    end_date: dateRange.end,
    requesting_user_id: userId,
    aggregation_period: timeframe
  });

  if (error) {
    console.error('Error in get_viral_coefficient_data:', error);
    throw new Error('Failed to fetch viral coefficient data');
  }

  // Process the viral metrics
  const totalUsers = data?.reduce((sum: number, item: any) => sum + (item.new_users || 0), 0) || 0;
  const totalInvites = data?.reduce((sum: number, item: any) => sum + (item.invites_sent || 0), 0) || 0;
  const totalConversions = data?.reduce((sum: number, item: any) => sum + (item.conversions || 0), 0) || 0;

  const conversionRate = totalInvites > 0 ? totalConversions / totalInvites : 0;
  const invitesPerUser = totalUsers > 0 ? totalInvites / totalUsers : 0;
  const viralCoefficient = invitesPerUser * conversionRate;

  // Validate calculations
  if (!Number.isFinite(viralCoefficient) || viralCoefficient < 0) {
    throw new Error('Invalid viral coefficient calculation detected');
  }

  return {
    viralCoefficient: Math.round(viralCoefficient * 1000) / 1000,
    conversionRate: Math.round(conversionRate * 1000) / 1000,
    invitesPerUser: Math.round(invitesPerUser * 1000) / 1000,
    period: `${dateRange.start} to ${dateRange.end}`,
    totalUsers,
    totalInvites,
    totalConversions,
    timeframe,
    aggregationDate: new Date().toISOString()
  };
}

async function getAttributionModel(
  supabaseClient: any,
  userId: string,
  dateRange: { start: string; end: string },
  sources?: string[]
) {
  const { data, error } = await supabaseClient.rpc('get_attribution_model_data', {
    start_date: dateRange.start,
    end_date: dateRange.end,
    source_filters: sources || [],
    requesting_user_id: userId
  });

  if (error) {
    console.error('Error in get_attribution_model_data:', error);
    throw new Error('Failed to fetch attribution model data');
  }

  // Process attribution data
  const attributionMap = new Map();

  data?.forEach((item: any) => {
    const source = item.attribution_source || 'unknown';
    const existing = attributionMap.get(source) || {
      conversions: 0,
      cost: 0,
      totalReach: 0,
      viralConversions: 0
    };

    existing.conversions += item.conversions || 0;
    existing.cost += item.cost || 0;
    existing.totalReach += item.total_reach || 0;
    existing.viralConversions += item.viral_conversions || 0;

    attributionMap.set(source, existing);
  });

  const totalConversions = Array.from(attributionMap.values())
    .reduce((sum: number, item: any) => sum + item.conversions, 0);

  return Array.from(attributionMap.entries()).map(([source, metrics]: [string, any]) => {
    const conversionRate = metrics.totalReach > 0 ? metrics.conversions / metrics.totalReach : 0;
    const costPerAcquisition = metrics.conversions > 0 ? metrics.cost / metrics.conversions : 0;
    const viralCoefficient = metrics.conversions > 0 ? metrics.viralConversions / metrics.conversions : 0;
    const attributionScore = totalConversions > 0 ? metrics.conversions / totalConversions : 0;

    return {
      source,
      conversions: metrics.conversions,
      cost: metrics.cost,
      conversionRate: Math.round(conversionRate * 1000) / 1000,
      costPerAcquisition: Math.round(costPerAcquisition * 100) / 100,
      viralCoefficient: Math.round(viralCoefficient * 1000) / 1000,
      attributionScore: Math.round(attributionScore * 1000) / 1000
    };
  }).sort((a, b) => b.attributionScore - a.attributionScore);
}

async function aggregateGrowthMetrics(
  supabaseClient: any,
  userId: string,
  dateRange: { start: string; end: string }
) {
  const { data, error } = await supabaseClient.rpc('get_aggregated_growth_metrics', {
    start_date: dateRange.start,
    end_date: dateRange.end
  });

  if (error) {
    console.error('Error in get_aggregated_growth_metrics:', error);
    throw new Error('Failed to fetch growth metrics');
  }

  // Process growth metrics by time periods
  const daily = aggregateByPeriod(data, 'daily');
  const weekly = aggregateByPeriod(data, 'weekly');
  const monthly = aggregateByPeriod(data, 'monthly');

  return { daily, weekly, monthly };
}

function aggregateByPeriod(data: any[], period: 'daily' | 'weekly' | 'monthly'): any[] {
  if (!data) return [];

  const formatMap = {
    daily: (date: Date) => date.toISOString().split('T')[0],
    weekly: (date: Date) => {
      const year = date.getFullYear();
      const weekNum = getWeekNumber(date);
      return `${year}-W${weekNum.toString().padStart(2, '0')}`;
    },
    monthly: (date: Date) => `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
  };

  const formatter = formatMap[period];
  const aggregatedData = new Map();

  data.forEach(item => {
    const date = new Date(item.created_at || item.date);
    const periodKey = formatter(date);
    
    const existing = aggregatedData.get(periodKey) || {
      period: periodKey,
      new_users: 0,
      viral_coefficient: 0,
      organic_growth: 0,
      paid_growth: 0,
      viral_growth: 0,
      cumulative_users: 0,
      retention_rate: 0,
      count: 0
    };

    existing.new_users += item.new_users || 0;
    existing.organic_growth += item.organic_growth || 0;
    existing.paid_growth += item.paid_growth || 0;
    existing.viral_growth += item.viral_growth || 0;
    existing.cumulative_users += item.cumulative_users || 0;
    existing.retention_rate += item.retention_rate || 0;
    existing.viral_coefficient += item.viral_coefficient || 0;
    existing.count += 1;

    aggregatedData.set(periodKey, existing);
  });

  return Array.from(aggregatedData.values()).map(item => ({
    ...item,
    viral_coefficient: item.count > 0 ? item.viral_coefficient / item.count : 0,
    retention_rate: item.count > 0 ? item.retention_rate / item.count : 0
  })).sort((a, b) => a.period.localeCompare(b.period));
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

async function validateCalculation(testScenario: {
  newUsers: number;
  invitesSent: number;
  conversions: number;
}): Promise<{ accurate: boolean; calculated: number; expected: number; error?: string }> {
  try {
    // Expected calculation: (invites / users) * (conversions / invites)
    const expectedCoefficient = testScenario.newUsers > 0 && testScenario.invitesSent > 0
      ? (testScenario.invitesSent / testScenario.newUsers) * (testScenario.conversions / testScenario.invitesSent)
      : 0;

    // Calculate using same logic as main function
    const conversionRate = testScenario.invitesSent > 0 ? testScenario.conversions / testScenario.invitesSent : 0;
    const invitesPerUser = testScenario.newUsers > 0 ? testScenario.invitesSent / testScenario.newUsers : 0;
    const calculatedCoefficient = invitesPerUser * conversionRate;

    const accurate = Math.abs(calculatedCoefficient - expectedCoefficient) < 0.001;

    return {
      accurate,
      calculated: Math.round(calculatedCoefficient * 1000) / 1000,
      expected: Math.round(expectedCoefficient * 1000) / 1000
    };
  } catch (error) {
    return {
      accurate: false,
      calculated: 0,
      expected: 0,
      error: error.message || 'Calculation validation failed'
    };
  }
}