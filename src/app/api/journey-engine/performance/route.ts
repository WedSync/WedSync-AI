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
    const hours = parseInt(searchParams.get('hours') || '24');

    // Calculate time boundaries
    const now = new Date();
    const startDate = new Date(now.getTime() - hours * 60 * 60 * 1000);

    // Generate hourly time slots for the chart
    const timeSlots = [];
    for (let i = hours; i >= 0; i--) {
      const slotTime = new Date(now.getTime() - i * 60 * 60 * 1000);
      timeSlots.push({
        timestamp: slotTime.toISOString(),
        hour: slotTime.getHours(),
        completed: 0,
        failed: 0,
        active: 0,
      });
    }

    // Get execution data for the timeframe
    const { data: executions } = await supabase
      .from('journey_node_executions')
      .select('completed_at, status')
      .gte('started_at', startDate.toISOString())
      .not('completed_at', 'is', null);

    // Group executions by hour
    const executionsByHour =
      executions?.reduce(
        (acc, execution) => {
          if (!execution.completed_at) return acc;

          const completedAt = new Date(execution.completed_at);
          const hourKey = new Date(completedAt);
          hourKey.setMinutes(0, 0, 0); // Round to hour

          const hourString = hourKey.toISOString();

          if (!acc[hourString]) {
            acc[hourString] = { completed: 0, failed: 0 };
          }

          if (execution.status === 'completed') {
            acc[hourString].completed++;
          } else if (execution.status === 'failed') {
            acc[hourString].failed++;
          }

          return acc;
        },
        {} as Record<string, { completed: number; failed: number }>,
      ) || {};

    // Get instance data for active counts
    const { data: instances } = await supabase
      .from('journey_instances')
      .select('started_at, state')
      .gte('started_at', startDate.toISOString());

    const instancesByHour =
      instances?.reduce(
        (acc, instance) => {
          const startedAt = new Date(instance.started_at);
          const hourKey = new Date(startedAt);
          hourKey.setMinutes(0, 0, 0);

          const hourString = hourKey.toISOString();

          if (!acc[hourString]) {
            acc[hourString] = { active: 0 };
          }

          if (instance.state === 'active') {
            acc[hourString].active++;
          }

          return acc;
        },
        {} as Record<string, { active: number }>,
      ) || {};

    // Merge data with time slots
    const performanceData = timeSlots.map((slot) => {
      const hourKey = new Date(slot.timestamp);
      hourKey.setMinutes(0, 0, 0);
      const hourString = hourKey.toISOString();

      const execData = executionsByHour[hourString] || {
        completed: 0,
        failed: 0,
      };
      const instanceData = instancesByHour[hourString] || { active: 0 };

      return {
        ...slot,
        completed: execData.completed,
        failed: execData.failed,
        active: instanceData.active,
      };
    });

    // Calculate throughput metrics
    const totalExecutions = executions?.length || 0;
    const executionsPerHour = Math.round(totalExecutions / hours);

    const completedExecutions =
      executions?.filter((e) => e.status === 'completed').length || 0;
    const failedExecutions =
      executions?.filter((e) => e.status === 'failed').length || 0;

    const throughputMetrics = {
      total_executions: totalExecutions,
      executions_per_hour: executionsPerHour,
      completed_executions: completedExecutions,
      failed_executions: failedExecutions,
      success_rate:
        totalExecutions > 0 ? completedExecutions / totalExecutions : 0,
      timeframe_hours: hours,
    };

    return NextResponse.json({
      data: performanceData,
      metrics: throughputMetrics,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching performance data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance data' },
      { status: 500 },
    );
  }
}
