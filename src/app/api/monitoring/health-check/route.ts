import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { featureRequestMonitor } from '@/lib/monitoring/FeatureRequestSystemMonitor';

/**
 * GET /api/monitoring/health-check
 * Comprehensive health check endpoint for WS-237 Feature Request Management System
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Check if user has monitoring access
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    // Allow public health check for basic status, require auth for detailed metrics
    const detailed = request.nextUrl.searchParams.get('detailed') === 'true';

    if (detailed && (!session || authError)) {
      // Check if user is admin for detailed metrics
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', session?.user.id)
        .single();

      if (profile?.role !== 'admin') {
        return NextResponse.json(
          { error: 'Admin access required for detailed metrics' },
          { status: 403 },
        );
      }
    }

    // Perform health check
    const healthCheck = await featureRequestMonitor.performHealthCheck();

    // Return appropriate level of detail
    if (detailed) {
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        ...healthCheck,
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
      });
    } else {
      // Basic health check response
      return NextResponse.json({
        success: true,
        status: healthCheck.overall,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        components: Object.keys(healthCheck.components).reduce(
          (acc, key) => {
            acc[key] = {
              status: healthCheck.components[key].status,
              responseTime: healthCheck.components[key].responseTime,
            };
            return acc;
          },
          {} as Record<string, any>,
        ),
        weddingIndustry: {
          activeWeddings: healthCheck.weddingIndustry.activeWeddings,
          saturdayProtection:
            healthCheck.weddingIndustry.saturdayProtectionActive,
          urgentRequests: healthCheck.weddingIndustry.urgentRequests,
        },
      });
    }
  } catch (error) {
    console.error('Health check failed:', error);

    return NextResponse.json(
      {
        success: false,
        status: 'critical',
        error: 'Health check system failure',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/monitoring/health-check
 * Trigger manual health check (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Authenticate and check admin role
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 },
      );
    }

    // Get request body for specific checks
    const body = await request.json().catch(() => ({}));
    const { components, forceFullCheck } = body;

    // Perform targeted or full health check
    const healthCheck = await featureRequestMonitor.performHealthCheck();

    // Log manual health check
    console.log('Manual health check triggered', {
      userId: session.user.id,
      components: components || 'all',
      result: healthCheck.overall,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Manual health check completed',
      ...healthCheck,
    });
  } catch (error) {
    console.error('Manual health check failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Manual health check failed',
        details: error.message,
      },
      { status: 500 },
    );
  }
}
