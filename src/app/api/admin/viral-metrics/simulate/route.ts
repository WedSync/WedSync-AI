import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/database/supabase-admin';
import {
  ViralOptimizationEngine,
  ViralIntervention,
  ViralSimulationResult,
} from '@/lib/analytics/viral-optimization-engine';

// Request/Response interfaces matching the specification
interface ViralSimulationRequest {
  intervention: ViralIntervention;
  duration: number; // days
  targetSegment?: 'all' | 'photographers' | 'venues' | 'couples';
}

interface ViralSimulationResponse {
  currentCoefficient: number;
  projectedCoefficient: number;
  userGrowthImpact: number;
  revenueImpact: number;
  confidence: number;
  breakEvenDays: number;
  fullResults: ViralSimulationResult;
}

// Initialize optimization engine
const optimizationEngine = new ViralOptimizationEngine();

// Authentication middleware
async function verifyAdminAccess(
  request: NextRequest,
): Promise<{ isAdmin: boolean; userId?: string }> {
  try {
    const supabase = supabaseAdmin;

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return { isAdmin: false };
    }

    const token = authHeader.substring(7);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return { isAdmin: false };
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, permissions')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { isAdmin: false };
    }

    const isAdmin =
      profile.role === 'admin' ||
      profile.role === 'super_admin' ||
      profile.permissions?.includes('admin_analytics');

    return { isAdmin, userId: user.id };
  } catch (error) {
    console.error('Admin verification error:', error);
    return { isAdmin: false };
  }
}

// Validation functions
function validateInterventionRequest(data: any): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.intervention) {
    errors.push('Intervention object is required');
    return { isValid: false, errors };
  }

  const intervention = data.intervention;

  // Validate intervention type
  const validTypes = [
    'invitation_incentive',
    'onboarding_optimization',
    'seasonal_campaign',
    'referral_bonus',
    'network_effect_boost',
  ];
  if (!validTypes.includes(intervention.type)) {
    errors.push(
      `Invalid intervention type. Must be one of: ${validTypes.join(', ')}`,
    );
  }

  // Validate duration
  if (!data.duration || data.duration < 1 || data.duration > 365) {
    errors.push('Duration must be between 1 and 365 days');
  }

  // Validate target segment
  if (data.targetSegment) {
    const validSegments = ['all', 'photographers', 'venues', 'couples'];
    if (!validSegments.includes(data.targetSegment)) {
      errors.push(
        `Invalid target segment. Must be one of: ${validSegments.join(', ')}`,
      );
    }
  }

  // Validate cost
  if (
    intervention.cost &&
    (intervention.cost < 0 || intervention.cost > 100000)
  ) {
    errors.push('Intervention cost must be between 0 and 100,000');
  }

  // Validate parameters based on intervention type
  if (intervention.parameters) {
    const params = intervention.parameters;

    switch (intervention.type) {
      case 'invitation_incentive':
        if (
          params.incentiveAmount &&
          (params.incentiveAmount < 0 || params.incentiveAmount > 500)
        ) {
          errors.push('Incentive amount must be between 0 and 500');
        }
        if (
          params.incentiveType &&
          !['monetary', 'feature_access', 'service_credit'].includes(
            params.incentiveType,
          )
        ) {
          errors.push('Invalid incentive type');
        }
        break;

      case 'onboarding_optimization':
        if (
          params.flowOptimization &&
          !['streamline', 'gamification', 'personal_touch'].includes(
            params.flowOptimization,
          )
        ) {
          errors.push('Invalid flow optimization type');
        }
        if (
          params.reductionInSteps &&
          (params.reductionInSteps < 0 || params.reductionInSteps > 10)
        ) {
          errors.push('Reduction in steps must be between 0 and 10');
        }
        break;

      case 'seasonal_campaign':
        if (
          params.campaignType &&
          ![
            'social_media',
            'email',
            'partnerships',
            'content_marketing',
          ].includes(params.campaignType)
        ) {
          errors.push('Invalid campaign type');
        }
        if (
          params.targetSeason &&
          !['peak', 'shoulder', 'off'].includes(params.targetSeason)
        ) {
          errors.push('Invalid target season');
        }
        break;

      case 'referral_bonus':
        if (
          params.bonusStructure &&
          !['flat', 'tiered', 'performance_based'].includes(
            params.bonusStructure,
          )
        ) {
          errors.push('Invalid bonus structure');
        }
        if (
          params.bonusAmount &&
          (params.bonusAmount < 0 || params.bonusAmount > 1000)
        ) {
          errors.push('Bonus amount must be between 0 and 1000');
        }
        break;

      case 'network_effect_boost':
        if (
          params.networkTargeting &&
          !['hubs', 'bridges', 'clusters'].includes(params.networkTargeting)
        ) {
          errors.push('Invalid network targeting');
        }
        if (
          params.amplificationTarget &&
          (params.amplificationTarget < 1 || params.amplificationTarget > 5)
        ) {
          errors.push('Amplification target must be between 1 and 5');
        }
        break;
    }
  }

  return { isValid: errors.length === 0, errors };
}

// Rate limiting check
async function checkRateLimit(userId: string): Promise<boolean> {
  try {
    const supabase = supabaseAdmin;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const { count } = await supabase
      .from('admin_audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('action', 'viral_simulation')
      .gte('timestamp', oneHourAgo.toISOString());

    // Allow max 20 simulations per hour per admin
    return (count || 0) < 20;
  } catch (error) {
    console.error('Rate limit check error:', error);
    return true; // Allow request if check fails
  }
}

// POST /api/admin/viral-metrics/simulate
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const { isAdmin, userId } = await verifyAdminAccess(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 },
      );
    }

    // Check rate limiting
    const isWithinRateLimit = await checkRateLimit(userId!);
    if (!isWithinRateLimit) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Maximum 20 simulations per hour.' },
        { status: 429 },
      );
    }

    // Parse request body
    let requestData: ViralSimulationRequest;
    try {
      requestData = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 },
      );
    }

    // Validate request data
    const { isValid, errors } = validateInterventionRequest(requestData);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 },
      );
    }

    // Apply defaults
    const intervention: ViralIntervention = {
      ...requestData.intervention,
      duration: requestData.duration,
      targetSegment: requestData.targetSegment || 'all',
    };

    // Ensure parameters object exists
    if (!intervention.parameters) {
      intervention.parameters = {};
    }

    // Set default cost if not provided
    if (!intervention.cost) {
      intervention.cost = estimateDefaultCost(intervention);
    }

    // Run the simulation
    console.log('Running viral simulation:', {
      type: intervention.type,
      duration: intervention.duration,
      targetSegment: intervention.targetSegment,
      cost: intervention.cost,
    });

    const simulationResult =
      await optimizationEngine.simulateViralIntervention(intervention);

    // Prepare response
    const response: ViralSimulationResponse = {
      currentCoefficient: simulationResult.currentMetrics.coefficient,
      projectedCoefficient: simulationResult.projectedMetrics.coefficient,
      userGrowthImpact: simulationResult.impact.userGrowthImpact,
      revenueImpact: simulationResult.impact.revenueImpact,
      confidence: simulationResult.confidence,
      breakEvenDays: simulationResult.roi.breakEvenDays,
      fullResults: simulationResult,
    };

    // Log the simulation for audit trail
    await logSimulationRequest(userId!, intervention, simulationResult);

    // Return successful response
    return NextResponse.json(response);
  } catch (error) {
    console.error('Viral simulation API error:', error);

    // Return appropriate error response
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return NextResponse.json(
          { error: 'Simulation timeout. Please try with simpler parameters.' },
          { status: 408 },
        );
      }

      if (error.message.includes('insufficient data')) {
        return NextResponse.json(
          {
            error:
              'Insufficient data for accurate simulation. Please ensure adequate historical data exists.',
          },
          { status: 422 },
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error during simulation' },
      { status: 500 },
    );
  }
}

// Helper functions
function estimateDefaultCost(intervention: ViralIntervention): number {
  const baseCosts = {
    invitation_incentive: 1000,
    onboarding_optimization: 2000,
    seasonal_campaign: 3000,
    referral_bonus: 2500,
    network_effect_boost: 1500,
  };

  let cost = baseCosts[intervention.type] || 1000;

  // Adjust based on duration
  const durationMultiplier = Math.min(2.0, intervention.duration / 30);
  cost *= durationMultiplier;

  // Adjust based on parameters
  if (intervention.parameters) {
    const params = intervention.parameters;

    switch (intervention.type) {
      case 'invitation_incentive':
        if (params.incentiveAmount) {
          cost += params.incentiveAmount * 20; // Multiply by expected invitation count
        }
        break;

      case 'referral_bonus':
        if (params.bonusAmount) {
          cost += params.bonusAmount * 10; // Multiply by expected referral count
        }
        break;

      case 'seasonal_campaign':
        if (params.campaignType === 'partnerships') {
          cost *= 1.5; // Partnerships are more expensive
        } else if (params.campaignType === 'social_media') {
          cost *= 1.2; // Social media ads have costs
        }
        break;
    }
  }

  return Math.round(cost);
}

async function logSimulationRequest(
  userId: string,
  intervention: ViralIntervention,
  result: ViralSimulationResult,
): Promise<void> {
  try {
    const supabase = supabaseAdmin;

    await supabase.from('admin_audit_log').insert({
      user_id: userId,
      action: 'viral_simulation',
      resource: 'viral_metrics',
      parameters: {
        intervention_type: intervention.type,
        duration: intervention.duration,
        target_segment: intervention.targetSegment,
        cost: intervention.cost,
        projected_impact: result.impact.coefficientIncrease,
        confidence: result.confidence,
        roi: result.roi.netROI,
      },
      timestamp: new Date().toISOString(),
      ip_address: '0.0.0.0',
      user_agent: 'simulation_api',
    });

    // Also log to viral experiments table for tracking
    await supabase.from('viral_experiments').insert({
      experiment_type: 'simulation',
      intervention_type: intervention.type,
      parameters: intervention.parameters,
      duration: intervention.duration,
      estimated_cost: intervention.cost,
      projected_coefficient: result.projectedMetrics.coefficient,
      confidence_score: result.confidence,
      created_by: userId,
      status: 'simulated',
    });
  } catch (error) {
    console.warn('Failed to log simulation request:', error);
    // Don't throw - logging failures shouldn't break the main functionality
  }
}

// GET /api/admin/viral-metrics/simulate (for simulation history)
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const { isAdmin, userId } = await verifyAdminAccess(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 },
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const interventionType = searchParams.get('type');

    // Get simulation history
    const supabase = supabaseAdmin;
    let query = supabase
      .from('viral_experiments')
      .select(
        `
        id,
        experiment_type,
        intervention_type,
        parameters,
        duration,
        estimated_cost,
        projected_coefficient,
        confidence_score,
        created_at,
        status
      `,
      )
      .eq('experiment_type', 'simulation')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (interventionType) {
      query = query.eq('intervention_type', interventionType);
    }

    const { data: simulations, error } = await query;

    if (error) {
      throw error;
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('viral_experiments')
      .select('*', { count: 'exact', head: true })
      .eq('experiment_type', 'simulation');

    return NextResponse.json({
      simulations: simulations || [],
      pagination: {
        total: totalCount || 0,
        limit,
        offset,
        hasMore: (totalCount || 0) > offset + limit,
      },
    });
  } catch (error) {
    console.error('Simulation history API error:', error);
    return NextResponse.json(
      { error: 'Internal server error fetching simulation history' },
      { status: 500 },
    );
  }
}
