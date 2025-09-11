/**
 * WS-130 Round 3: Photography AI Performance Statistics API
 * Provides current system performance statistics for monitoring dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { photographyPerformanceMonitor } from '@/lib/monitoring/photography-performance-monitor';

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
        },
        { status: 401 },
      );
    }

    // Check if user is admin
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'owner'])
      .single();

    if (!membership) {
      return NextResponse.json(
        {
          success: false,
          error: 'Admin access required',
        },
        { status: 403 },
      );
    }

    // Get current performance statistics
    const stats = await photographyPerformanceMonitor.getCurrentStats();

    return NextResponse.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch performance stats:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch performance statistics',
      },
      { status: 500 },
    );
  }
}
