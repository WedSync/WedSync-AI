import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { executiveMetricsService } from '@/lib/analytics/executiveMetrics';

// Rate limiting configuration for admin metrics
const MAX_REQUESTS_PER_MINUTE = 10;
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);

  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + 60000 });
    return true;
  }

  if (record.count >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Validates admin access for executive metrics
 */
async function validateAdminAccess(supabase: any): Promise<boolean> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return false;
    }

    // Check if user has admin role
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, organization_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return false;
    }

    // Only super_admin role can access executive metrics
    return profile.role === 'super_admin';
  } catch (error) {
    console.error('Admin access validation error:', error);
    return false;
  }
}

/**
 * GET /api/admin/metrics
 * Retrieves comprehensive executive metrics
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Rate limiting check
    const ip = request.ip || 'unknown';
    if (!rateLimit(ip)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Rate limit exceeded. Please wait before making another request.',
          timestamp: new Date().toISOString(),
        },
        { status: 429 },
      );
    }

    // Initialize Supabase client
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Validate admin access
    const hasAdminAccess = await validateAdminAccess(supabase);
    if (!hasAdminAccess) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Super admin access required.',
          timestamp: new Date().toISOString(),
        },
        { status: 403 },
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const timeframe =
      (url.searchParams.get('timeframe') as
        | 'week'
        | 'month'
        | 'quarter'
        | 'year') || 'month';

    // Fetch comprehensive metrics
    const metrics =
      await executiveMetricsService.getExecutiveMetrics(timeframe);

    const queryTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: metrics,
        performance: {
          queryTime,
          timestamp: new Date().toISOString(),
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, max-age=300', // Cache for 5 minutes
          'X-Response-Time': `${queryTime}ms`,
          'Access-Control-Allow-Origin':
            process.env.NODE_ENV === 'development'
              ? '*'
              : 'https://wedsync.com',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      },
    );
  } catch (error) {
    const queryTime = Date.now() - startTime;

    console.error('Executive metrics API error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      queryTime,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch executive metrics. Please try again.',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

/**
 * OPTIONS /api/admin/metrics
 * Handles CORS preflight requests
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin':
        process.env.NODE_ENV === 'development' ? '*' : 'https://wedsync.com',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '3600',
    },
  });
}
