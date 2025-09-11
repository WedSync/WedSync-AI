import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const key = `${ip}:${Math.floor(now / windowMs)}`;

  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  const current = rateLimitStore.get(key)!;
  if (current.count >= limit) {
    return false;
  }

  current.count++;
  return true;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } },
) {
  try {
    // Rate limiting: 100 requests per minute per IP
    const ip = request.ip || 'unknown';
    if (!checkRateLimit(ip, 100, 60000)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
        },
        { status: 429 },
      );
    }

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
        { status: 401 },
      );
    }

    const { userId } = params;

    // Check if user can access this data (either their own or admin)
    const canAccess = user.id === userId;

    if (!canAccess) {
      // Check if user is admin in their organization
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role, organization_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        return NextResponse.json(
          {
            success: false,
            error: 'Access denied',
            code: 'ACCESS_DENIED',
          },
          { status: 403 },
        );
      }

      // If admin, check if target user is in same organization
      if (profile.role === 'admin' || profile.role === 'owner') {
        const { data: targetProfile } = await supabase
          .from('user_profiles')
          .select('organization_id')
          .eq('id', userId)
          .single();

        if (
          !targetProfile ||
          targetProfile.organization_id !== profile.organization_id
        ) {
          return NextResponse.json(
            {
              success: false,
              error: 'Access denied',
              code: 'ACCESS_DENIED',
            },
            { status: 403 },
          );
        }
      } else {
        return NextResponse.json(
          {
            success: false,
            error: 'Access denied',
            code: 'ACCESS_DENIED',
          },
          { status: 403 },
        );
      }
    }

    // Get activation status with funnel details
    const { data: status, error: statusError } = await supabase
      .from('user_activation_status')
      .select(
        `
        *,
        activation_funnels:funnel_id (
          id,
          name,
          description,
          steps,
          target_completion_hours
        )
      `,
      )
      .eq('user_id', userId)
      .single();

    if (statusError && statusError.code !== 'PGRST116') {
      console.error('Error fetching activation status:', statusError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch activation status',
          code: 'FETCH_ERROR',
        },
        { status: 500 },
      );
    }

    // If no status found, get default funnel and create initial status
    if (!status) {
      const { data: defaultFunnel, error: funnelError } = await supabase
        .from('activation_funnels')
        .select('*')
        .eq('is_active', true)
        .single();

      if (funnelError) {
        console.error('Error fetching default funnel:', funnelError);
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to fetch funnel configuration',
            code: 'FUNNEL_ERROR',
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          user_id: userId,
          current_step: 0,
          completed_steps: [],
          activation_score: 0,
          last_activity_at: new Date().toISOString(),
          completed_at: null,
          activation_funnels: defaultFunnel,
          status: 'not_started',
        },
      });
    }

    // Calculate additional metrics
    const completedStepsCount = Array.isArray(status.completed_steps)
      ? status.completed_steps.length
      : 0;

    const totalSteps = Array.isArray(status.activation_funnels?.steps)
      ? status.activation_funnels.steps.length
      : 6;

    const progressPercentage = Math.round(
      (completedStepsCount / totalSteps) * 100,
    );

    // Determine status
    let activationStatus = 'in_progress';
    if (status.activation_score === 0) {
      activationStatus = 'not_started';
    } else if (status.activation_score >= 100 || status.completed_at) {
      activationStatus = 'completed';
    } else if (status.activation_score < 30) {
      activationStatus = 'at_risk';
    } else if (status.activation_score >= 80) {
      activationStatus = 'nearly_complete';
    }

    // Get recent events
    const { data: recentEvents } = await supabase
      .from('activation_events')
      .select('event_type, created_at, event_data')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      data: {
        ...status,
        status: activationStatus,
        progress_percentage: progressPercentage,
        completed_steps_count: completedStepsCount,
        total_steps: totalSteps,
        recent_events: recentEvents || [],
      },
    });
  } catch (error) {
    console.error('Error in activation status API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 },
    );
  }
}
