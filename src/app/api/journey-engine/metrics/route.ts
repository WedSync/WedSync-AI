import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '24h'; // 24h, 7d, 30d

    // Calculate time boundaries
    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default: // 24h
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Get basic instance counts
    const [
      { data: totalInstances },
      { data: activeInstances },
      { data: completedToday },
      { data: failedToday },
      { data: pendingSchedules },
    ] = await Promise.all([
      supabase
        .from('journey_instances')
        .select('id', { count: 'exact', head: true }),

      supabase
        .from('journey_instances')
        .select('id', { count: 'exact', head: true })
        .eq('state', 'active'),

      supabase
        .from('journey_instances')
        .select('id', { count: 'exact', head: true })
        .eq('state', 'completed')
        .gte('completed_at', todayStart.toISOString()),

      supabase
        .from('journey_instances')
        .select('id', { count: 'exact', head: true })
        .eq('state', 'failed')
        .gte('failed_at', todayStart.toISOString()),

      supabase
        .from('journey_schedules')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
    ]);

    // Calculate average completion time
    const { data: completedInstances } = await supabase
      .from('journey_instances')
      .select('started_at, completed_at')
      .eq('state', 'completed')
      .gte('completed_at', startDate.toISOString())
      .not('completed_at', 'is', null)
      .not('started_at', 'is', null);

    let avgCompletionTime = 0;
    if (completedInstances && completedInstances.length > 0) {
      const totalDuration = completedInstances.reduce((sum, instance) => {
        const start = new Date(instance.started_at!).getTime();
        const end = new Date(instance.completed_at!).getTime();
        return sum + (end - start);
      }, 0);
      avgCompletionTime = Math.round(
        totalDuration / completedInstances.length / 1000 / 60,
      ); // minutes
    }

    // Calculate success rate
    const totalCompletedCount = completedToday?.length || 0;
    const totalFailedCount = failedToday?.length || 0;
    const totalFinishedToday = totalCompletedCount + totalFailedCount;
    const successRate =
      totalFinishedToday > 0 ? totalCompletedCount / totalFinishedToday : 0;

    // Get execution rate (executions per hour)
    const { data: recentExecutions } = await supabase
      .from('journey_node_executions')
      .select('completed_at')
      .eq('status', 'completed')
      .gte('completed_at', startDate.toISOString())
      .not('completed_at', 'is', null);

    const executionsPerHour = recentExecutions
      ? Math.round(
          (recentExecutions.length / (now.getTime() - startDate.getTime())) *
            60 *
            60 *
            1000,
        )
      : 0;

    // Get queue depth and processing metrics
    const queueDepth = pendingSchedules?.length || 0;

    // Get error breakdown
    const { data: errorBreakdown } = await supabase
      .from('journey_instances')
      .select('last_error, error_count')
      .eq('state', 'failed')
      .gte('failed_at', todayStart.toISOString())
      .not('last_error', 'is', null);

    const errorTypes =
      errorBreakdown?.reduce((acc: Record<string, number>, instance) => {
        if (instance.last_error) {
          // Categorize errors by type (simplified)
          let errorType = 'Unknown';
          const error = instance.last_error.toLowerCase();

          if (error.includes('timeout')) errorType = 'Timeout';
          else if (error.includes('network') || error.includes('connection'))
            errorType = 'Network';
          else if (error.includes('validation') || error.includes('invalid'))
            errorType = 'Validation';
          else if (
            error.includes('permission') ||
            error.includes('unauthorized')
          )
            errorType = 'Permission';
          else if (error.includes('not found') || error.includes('missing'))
            errorType = 'Not Found';

          acc[errorType] = (acc[errorType] || 0) + 1;
        }
        return acc;
      }, {}) || {};

    // Performance metrics
    const { data: performanceStats } = await supabase
      .from('journey_node_executions')
      .select('duration_ms, status')
      .gte('started_at', startDate.toISOString())
      .not('duration_ms', 'is', null);

    const avgExecutionTime =
      performanceStats && performanceStats.length > 0
        ? Math.round(
            performanceStats.reduce(
              (sum, exec) => sum + (exec.duration_ms || 0),
              0,
            ) / performanceStats.length,
          )
        : 0;

    const p95ExecutionTime =
      performanceStats && performanceStats.length > 0
        ? Math.round(
            performanceStats
              .map((exec) => exec.duration_ms || 0)
              .sort((a, b) => a - b)[
              Math.floor(performanceStats.length * 0.95)
            ] || 0,
          )
        : 0;

    // Journey type breakdown
    const { data: journeyBreakdown } = await supabase
      .from('journey_instances')
      .select(
        `
        journey_id,
        journey:journeys(name, type)
      `,
      )
      .gte('started_at', todayStart.toISOString());

    const journeyTypeStats =
      journeyBreakdown?.reduce((acc: Record<string, number>, instance) => {
        const journeyType = instance.journey?.type || 'Unknown';
        acc[journeyType] = (acc[journeyType] || 0) + 1;
        return acc;
      }, {}) || {};

    // Resource utilization (mock data - would come from actual monitoring)
    const resourceUtilization = {
      cpu_usage: Math.random() * 30 + 10, // 10-40%
      memory_usage: Math.random() * 40 + 20, // 20-60%
      queue_utilization:
        queueDepth > 0 ? Math.min((queueDepth / 100) * 100, 100) : 0,
      database_connections: Math.floor(Math.random() * 20) + 5, // 5-25
    };

    const metrics = {
      // Basic counts
      total_instances: totalInstances?.length || 0,
      active_instances: activeInstances?.length || 0,
      completed_today: totalCompletedCount,
      failed_today: totalFailedCount,

      // Performance metrics
      avg_completion_time: avgCompletionTime,
      avg_execution_time: avgExecutionTime,
      p95_execution_time: p95ExecutionTime,
      success_rate: successRate,
      queue_depth: queueDepth,
      processing_rate: executionsPerHour,

      // Breakdown stats
      error_types: errorTypes,
      journey_types: journeyTypeStats,

      // Resource utilization
      resource_utilization: resourceUtilization,

      // Health indicators
      health_score: Math.max(
        0,
        Math.min(
          100,
          successRate * 60 +
            Math.max(0, 100 - queueDepth) * 0.2 +
            Math.max(0, 100 - resourceUtilization.cpu_usage) * 0.1 +
            Math.max(0, 100 - resourceUtilization.memory_usage) * 0.1,
        ),
      ),

      // Timestamps
      calculated_at: new Date().toISOString(),
      timeframe,
    };

    return NextResponse.json({ metrics });
  } catch (error) {
    console.error('Error calculating metrics:', error);
    return NextResponse.json(
      { error: 'Failed to calculate metrics' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { metric_type, value, labels = {}, timestamp } = body;

    // Store custom metric
    const { error } = await supabase.from('journey_metrics').insert({
      metric_type,
      value,
      labels,
      timestamp: timestamp || new Date().toISOString(),
    });

    if (error) {
      console.error('Error storing metric:', error);
      return NextResponse.json(
        { error: 'Failed to store metric' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Metric stored successfully',
    });
  } catch (error) {
    console.error('Error storing metric:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
