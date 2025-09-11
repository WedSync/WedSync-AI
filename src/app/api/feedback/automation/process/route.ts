/**
 * WS-236: User Feedback System - Automation Processor API
 *
 * Background job processor for scheduled follow-up actions
 * Designed to be called by cron jobs for automated execution
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { followUpAutomation } from '@/lib/feedback/follow-up-automation';

export const dynamic = 'force-dynamic';

/**
 * POST /api/feedback/automation/process
 * Process scheduled follow-up actions (for cron jobs)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify this is an internal/cron request
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'dev-cron-secret';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized - invalid cron secret' },
        { status: 401 },
      );
    }

    console.log('Starting scheduled follow-up actions processing...');

    const startTime = Date.now();
    let processedCount = 0;
    let errorCount = 0;

    try {
      // Process scheduled actions
      await followUpAutomation.processScheduledActions();

      // Get processing statistics
      const supabase = createClient();

      // Count actions processed in the last minute
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();

      const { count: completedCount } = await supabase
        .from('feedback_follow_up_actions')
        .select('*', { count: 'exact', head: true })
        .eq('action_status', 'completed')
        .gte('completed_at', oneMinuteAgo);

      const { count: failedCount } = await supabase
        .from('feedback_follow_up_actions')
        .select('*', { count: 'exact', head: true })
        .eq('action_status', 'failed')
        .gte('completed_at', oneMinuteAgo);

      processedCount = (completedCount || 0) + (failedCount || 0);
      errorCount = failedCount || 0;

      const processingTime = Date.now() - startTime;

      console.log(
        `Automation processing completed: ${processedCount} actions processed, ${errorCount} errors, ${processingTime}ms`,
      );

      return NextResponse.json({
        success: true,
        data: {
          processedCount,
          errorCount,
          processingTimeMs: processingTime,
          timestamp: new Date().toISOString(),
        },
        message: 'Scheduled follow-up actions processed successfully',
      });
    } catch (processingError) {
      console.error(
        'Error during scheduled action processing:',
        processingError,
      );
      return NextResponse.json(
        {
          error: 'Processing failed',
          details: processingError.message,
          processedCount,
          errorCount,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('POST /api/feedback/automation/process error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/feedback/automation/process
 * Get automation processor status and metrics
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get current pending actions count
    const { count: pendingCount } = await supabase
      .from('feedback_follow_up_actions')
      .select('*', { count: 'exact', head: true })
      .eq('action_status', 'pending')
      .lte('scheduled_at', new Date().toISOString());

    // Get overdue actions (scheduled more than 1 hour ago but still pending)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: overdueCount } = await supabase
      .from('feedback_follow_up_actions')
      .select('*', { count: 'exact', head: true })
      .eq('action_status', 'pending')
      .lt('scheduled_at', oneHourAgo);

    // Get processing statistics for the last 24 hours
    const twentyFourHoursAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: last24HoursStats } = await supabase
      .from('feedback_follow_up_actions')
      .select('action_status, completed_at')
      .gte('completed_at', twentyFourHoursAgo);

    const processingStats = {
      completed: 0,
      failed: 0,
      total: last24HoursStats?.length || 0,
    };

    if (last24HoursStats) {
      processingStats.completed = last24HoursStats.filter(
        (a) => a.action_status === 'completed',
      ).length;
      processingStats.failed = last24HoursStats.filter(
        (a) => a.action_status === 'failed',
      ).length;
    }

    // Get critical wedding priority actions pending
    const { count: weddingPriorityCount } = await supabase
      .from('feedback_follow_up_actions')
      .select('*', { count: 'exact', head: true })
      .eq('action_status', 'pending')
      .eq('wedding_priority', true);

    return NextResponse.json({
      success: true,
      data: {
        currentStatus: {
          pendingActions: pendingCount || 0,
          overdueActions: overdueCount || 0,
          weddingPriorityPending: weddingPriorityCount || 0,
          lastProcessed: new Date().toISOString(),
        },
        last24Hours: processingStats,
        health: {
          status: (overdueCount || 0) > 10 ? 'warning' : 'healthy',
          overdueThreshold: 10,
          processingEfficiency:
            processingStats.total > 0
              ? Math.round(
                  (processingStats.completed / processingStats.total) * 100,
                )
              : 100,
        },
      },
    });
  } catch (error) {
    console.error('GET /api/feedback/automation/process error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
