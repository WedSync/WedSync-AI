import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Analytics query schemas
const AnalyticsQuerySchema = z.object({
  metrics: z
    .array(
      z.enum([
        'group_count_by_type',
        'time_distribution',
        'priority_distribution',
        'guest_assignment_stats',
        'conflict_frequency',
        'optimization_performance',
        'timeline_utilization',
        'location_usage',
        'completion_rates',
        'trend_analysis',
      ]),
    )
    .optional(),
  time_range: z
    .object({
      start_date: z.string().datetime().optional(),
      end_date: z.string().datetime().optional(),
      period: z
        .enum(['day', 'week', 'month', 'quarter', 'year'])
        .default('month'),
    })
    .optional(),
  group_by: z
    .enum(['photo_type', 'timeline_slot', 'priority', 'location', 'date'])
    .optional(),
  filters: z
    .object({
      photo_types: z.array(z.string()).optional(),
      timeline_slots: z.array(z.string()).optional(),
      priority_range: z.tuple([z.number(), z.number()]).optional(),
      has_conflicts: z.boolean().optional(),
      min_guest_count: z.number().optional(),
    })
    .optional(),
});

// Analytics response interfaces
interface MetricResult {
  metric_name: string;
  data: any[];
  summary: {
    total: number;
    average?: number;
    trend?: 'increasing' | 'decreasing' | 'stable';
    comparison?: {
      previous_period: number;
      change_percent: number;
    };
  };
  visualization_config: {
    chart_type: 'bar' | 'line' | 'pie' | 'scatter' | 'heatmap';
    x_axis?: string;
    y_axis?: string;
    color_scheme?: string[];
  };
}

class PhotoGroupAnalytics {
  private supabase: any;
  private coupleId: string;
  private userId: string;

  constructor(supabase: any, coupleId: string, userId: string) {
    this.supabase = supabase;
    this.coupleId = coupleId;
    this.userId = userId;
  }

  async generateAnalytics(query: any): Promise<MetricResult[]> {
    const results: MetricResult[] = [];
    const metrics = query.metrics || [
      'group_count_by_type',
      'time_distribution',
      'priority_distribution',
      'guest_assignment_stats',
    ];

    for (const metric of metrics) {
      try {
        const result = await this.calculateMetric(metric, query);
        if (result) {
          results.push(result);
        }
      } catch (error) {
        console.error(`Error calculating metric ${metric}:`, error);
        // Continue with other metrics even if one fails
      }
    }

    return results;
  }

  private async calculateMetric(
    metric: string,
    query: any,
  ): Promise<MetricResult | null> {
    switch (metric) {
      case 'group_count_by_type':
        return await this.getGroupCountByType(query);
      case 'time_distribution':
        return await this.getTimeDistribution(query);
      case 'priority_distribution':
        return await this.getPriorityDistribution(query);
      case 'guest_assignment_stats':
        return await this.getGuestAssignmentStats(query);
      case 'conflict_frequency':
        return await this.getConflictFrequency(query);
      case 'optimization_performance':
        return await this.getOptimizationPerformance(query);
      case 'timeline_utilization':
        return await this.getTimelineUtilization(query);
      case 'location_usage':
        return await this.getLocationUsage(query);
      case 'completion_rates':
        return await this.getCompletionRates(query);
      case 'trend_analysis':
        return await this.getTrendAnalysis(query);
      default:
        return null;
    }
  }

  private async getGroupCountByType(query: any): Promise<MetricResult> {
    const { data: photoGroups } = await this.supabase
      .from('photo_groups')
      .select('photo_type, id, created_at')
      .eq('couple_id', this.coupleId);

    if (!photoGroups) {
      throw new Error('Failed to fetch photo groups');
    }

    // Group by photo type
    const groupCounts = photoGroups.reduce((acc: any, group: any) => {
      acc[group.photo_type] = (acc[group.photo_type] || 0) + 1;
      return acc;
    }, {});

    const data = Object.entries(groupCounts).map(([type, count]) => ({
      photo_type: type,
      count,
      percentage: Math.round(((count as number) / photoGroups.length) * 100),
    }));

    return {
      metric_name: 'group_count_by_type',
      data,
      summary: {
        total: photoGroups.length,
        average: Math.round(
          photoGroups.length / Object.keys(groupCounts).length,
        ),
        trend: 'stable',
      },
      visualization_config: {
        chart_type: 'pie',
        color_scheme: [
          '#8B5CF6',
          '#06B6D4',
          '#10B981',
          '#F59E0B',
          '#EF4444',
          '#EC4899',
          '#6366F1',
        ],
      },
    };
  }

  private async getTimeDistribution(query: any): Promise<MetricResult> {
    const { data: photoGroups } = await this.supabase
      .from('photo_groups')
      .select('timeline_slot, estimated_time_minutes, id')
      .eq('couple_id', this.coupleId)
      .not('timeline_slot', 'is', null);

    if (!photoGroups) {
      throw new Error('Failed to fetch photo groups');
    }

    // Group by timeline slot
    const timeDistribution = photoGroups.reduce((acc: any, group: any) => {
      const slot = group.timeline_slot || 'unscheduled';
      if (!acc[slot]) {
        acc[slot] = {
          slot_name: slot,
          group_count: 0,
          total_time: 0,
          average_time: 0,
        };
      }
      acc[slot].group_count++;
      acc[slot].total_time += group.estimated_time_minutes || 0;
      return acc;
    }, {});

    // Calculate averages
    Object.values(timeDistribution).forEach((slot: any) => {
      slot.average_time = Math.round(slot.total_time / slot.group_count);
    });

    const data = Object.values(timeDistribution);
    const totalTime = data.reduce(
      (sum: number, slot: any) => sum + slot.total_time,
      0,
    );

    return {
      metric_name: 'time_distribution',
      data,
      summary: {
        total: totalTime,
        average: Math.round(totalTime / data.length),
        trend: 'stable',
      },
      visualization_config: {
        chart_type: 'bar',
        x_axis: 'slot_name',
        y_axis: 'total_time',
        color_scheme: ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B'],
      },
    };
  }

  private async getPriorityDistribution(query: any): Promise<MetricResult> {
    const { data: photoGroups } = await this.supabase
      .from('photo_groups')
      .select('priority, id')
      .eq('couple_id', this.coupleId);

    if (!photoGroups) {
      throw new Error('Failed to fetch photo groups');
    }

    // Define priority ranges
    const priorityRanges = [
      { range: '1-3 (High)', min: 1, max: 3 },
      { range: '4-6 (Medium)', min: 4, max: 6 },
      { range: '7-10 (Low)', min: 7, max: 10 },
    ];

    const data = priorityRanges.map((range) => {
      const count = photoGroups.filter(
        (group) => group.priority >= range.min && group.priority <= range.max,
      ).length;

      return {
        priority_range: range.range,
        count,
        percentage: Math.round((count / photoGroups.length) * 100),
      };
    });

    return {
      metric_name: 'priority_distribution',
      data,
      summary: {
        total: photoGroups.length,
        average:
          photoGroups.reduce((sum, g) => sum + g.priority, 0) /
          photoGroups.length,
        trend: 'stable',
      },
      visualization_config: {
        chart_type: 'bar',
        x_axis: 'priority_range',
        y_axis: 'count',
        color_scheme: ['#EF4444', '#F59E0B', '#10B981'],
      },
    };
  }

  private async getGuestAssignmentStats(query: any): Promise<MetricResult> {
    const { data: assignments } = await this.supabase
      .from('photo_group_assignments')
      .select(
        `
        id,
        is_primary,
        photo_groups!inner(
          id,
          name,
          couple_id
        )
      `,
      )
      .eq('photo_groups.couple_id', this.coupleId);

    if (!assignments) {
      throw new Error('Failed to fetch guest assignments');
    }

    // Get photo groups with assignment counts
    const { data: photoGroups } = await this.supabase
      .from('photo_groups')
      .select(
        `
        id,
        name,
        photo_type,
        assignments:photo_group_assignments(id)
      `,
      )
      .eq('couple_id', this.coupleId);

    if (!photoGroups) {
      throw new Error('Failed to fetch photo groups with assignments');
    }

    const groupStats = photoGroups.map((group) => ({
      group_name: group.name,
      photo_type: group.photo_type,
      guest_count: group.assignments?.length || 0,
      primary_guests: assignments.filter(
        (a) => a.photo_groups.id === group.id && a.is_primary,
      ).length,
    }));

    const totalAssignments = assignments.length;
    const totalPrimaryAssignments = assignments.filter(
      (a) => a.is_primary,
    ).length;
    const averageGuestsPerGroup = Math.round(
      totalAssignments / photoGroups.length,
    );

    return {
      metric_name: 'guest_assignment_stats',
      data: groupStats,
      summary: {
        total: totalAssignments,
        average: averageGuestsPerGroup,
        trend: 'stable',
      },
      visualization_config: {
        chart_type: 'scatter',
        x_axis: 'group_name',
        y_axis: 'guest_count',
        color_scheme: ['#8B5CF6', '#06B6D4'],
      },
    };
  }

  private async getConflictFrequency(query: any): Promise<MetricResult> {
    const { data: conflicts } = await this.supabase
      .from('photo_group_conflicts')
      .select(
        `
        id,
        conflict_type,
        severity,
        resolved_at,
        created_at,
        photo_groups!inner(
          couple_id
        )
      `,
      )
      .eq('photo_groups.couple_id', this.coupleId);

    if (!conflicts) {
      return {
        metric_name: 'conflict_frequency',
        data: [],
        summary: { total: 0, average: 0, trend: 'stable' },
        visualization_config: { chart_type: 'bar' },
      };
    }

    // Group by conflict type
    const conflictStats = conflicts.reduce((acc: any, conflict: any) => {
      const type = conflict.conflict_type;
      if (!acc[type]) {
        acc[type] = {
          conflict_type: type,
          total_count: 0,
          resolved_count: 0,
          pending_count: 0,
          severity_breakdown: { info: 0, warning: 0, error: 0, critical: 0 },
        };
      }

      acc[type].total_count++;
      acc[type].severity_breakdown[conflict.severity]++;

      if (conflict.resolved_at) {
        acc[type].resolved_count++;
      } else {
        acc[type].pending_count++;
      }

      return acc;
    }, {});

    const data = Object.values(conflictStats);
    const totalConflicts = conflicts.length;
    const resolvedConflicts = conflicts.filter((c) => c.resolved_at).length;
    const resolutionRate =
      totalConflicts > 0
        ? Math.round((resolvedConflicts / totalConflicts) * 100)
        : 0;

    return {
      metric_name: 'conflict_frequency',
      data,
      summary: {
        total: totalConflicts,
        average: Math.round(totalConflicts / Math.max(data.length, 1)),
        trend: totalConflicts > resolvedConflicts ? 'increasing' : 'decreasing',
      },
      visualization_config: {
        chart_type: 'bar',
        x_axis: 'conflict_type',
        y_axis: 'total_count',
        color_scheme: ['#EF4444', '#F59E0B', '#10B981'],
      },
    };
  }

  private async getOptimizationPerformance(query: any): Promise<MetricResult> {
    const { data: optimizations } = await this.supabase
      .from('photo_group_schedule_optimizations')
      .select(
        `
        id,
        strategy,
        performance_score,
        time_saved_minutes,
        conflicts_resolved,
        created_at
      `,
      )
      .eq('couple_id', this.coupleId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!optimizations || optimizations.length === 0) {
      return {
        metric_name: 'optimization_performance',
        data: [],
        summary: { total: 0, average: 0, trend: 'stable' },
        visualization_config: { chart_type: 'line' },
      };
    }

    const data = optimizations.map((opt, index) => ({
      optimization_id: opt.id,
      strategy: opt.strategy,
      performance_score: opt.performance_score,
      time_saved_minutes: opt.time_saved_minutes,
      conflicts_resolved: opt.conflicts_resolved,
      run_number: optimizations.length - index,
      created_at: opt.created_at,
    }));

    const avgPerformanceScore =
      optimizations.reduce(
        (sum, opt) => sum + (opt.performance_score || 0),
        0,
      ) / optimizations.length;
    const totalTimeSaved = optimizations.reduce(
      (sum, opt) => sum + (opt.time_saved_minutes || 0),
      0,
    );

    return {
      metric_name: 'optimization_performance',
      data,
      summary: {
        total: optimizations.length,
        average: Math.round(avgPerformanceScore * 100) / 100,
        trend: this.calculateTrend(
          optimizations.map((o) => o.performance_score),
        ),
      },
      visualization_config: {
        chart_type: 'line',
        x_axis: 'run_number',
        y_axis: 'performance_score',
        color_scheme: ['#8B5CF6'],
      },
    };
  }

  private async getTimelineUtilization(query: any): Promise<MetricResult> {
    const { data: photoGroups } = await this.supabase
      .from('photo_groups')
      .select('timeline_slot, estimated_time_minutes')
      .eq('couple_id', this.coupleId)
      .not('timeline_slot', 'is', null);

    if (!photoGroups) {
      throw new Error('Failed to fetch photo groups');
    }

    // Define standard timeline slots with their typical durations
    const standardSlots = {
      preparation: 120,
      ceremony: 90,
      golden_hour: 90,
      reception: 180,
    };

    const utilizationData = Object.entries(standardSlots).map(
      ([slot, duration]) => {
        const slotGroups = photoGroups.filter((g) => g.timeline_slot === slot);
        const totalUsedTime = slotGroups.reduce(
          (sum, g) => sum + (g.estimated_time_minutes || 0),
          0,
        );
        const utilization = Math.round((totalUsedTime / duration) * 100);

        return {
          timeline_slot: slot,
          available_minutes: duration,
          used_minutes: totalUsedTime,
          utilization_percentage: Math.min(utilization, 100),
          group_count: slotGroups.length,
          status:
            utilization > 90
              ? 'over_booked'
              : utilization > 70
                ? 'well_utilized'
                : 'under_utilized',
        };
      },
    );

    const avgUtilization =
      utilizationData.reduce(
        (sum, slot) => sum + slot.utilization_percentage,
        0,
      ) / utilizationData.length;

    return {
      metric_name: 'timeline_utilization',
      data: utilizationData,
      summary: {
        total: utilizationData.reduce(
          (sum, slot) => sum + slot.used_minutes,
          0,
        ),
        average: Math.round(avgUtilization),
        trend: avgUtilization > 80 ? 'increasing' : 'stable',
      },
      visualization_config: {
        chart_type: 'bar',
        x_axis: 'timeline_slot',
        y_axis: 'utilization_percentage',
        color_scheme: ['#10B981', '#F59E0B', '#EF4444'],
      },
    };
  }

  private async getLocationUsage(query: any): Promise<MetricResult> {
    const { data: photoGroups } = await this.supabase
      .from('photo_groups')
      .select('location, id, estimated_time_minutes')
      .eq('couple_id', this.coupleId)
      .not('location', 'is', null);

    if (!photoGroups) {
      return {
        metric_name: 'location_usage',
        data: [],
        summary: { total: 0, average: 0, trend: 'stable' },
        visualization_config: { chart_type: 'pie' },
      };
    }

    const locationStats = photoGroups.reduce((acc: any, group: any) => {
      const location = group.location || 'Unspecified';
      if (!acc[location]) {
        acc[location] = {
          location,
          group_count: 0,
          total_time: 0,
          average_time: 0,
        };
      }
      acc[location].group_count++;
      acc[location].total_time += group.estimated_time_minutes || 0;
      return acc;
    }, {});

    // Calculate averages
    Object.values(locationStats).forEach((location: any) => {
      location.average_time = Math.round(
        location.total_time / location.group_count,
      );
    });

    const data = Object.values(locationStats);
    const totalGroups = photoGroups.length;

    return {
      metric_name: 'location_usage',
      data,
      summary: {
        total: totalGroups,
        average: Math.round(totalGroups / data.length),
        trend: 'stable',
      },
      visualization_config: {
        chart_type: 'pie',
        color_scheme: ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'],
      },
    };
  }

  private async getCompletionRates(query: any): Promise<MetricResult> {
    const { data: photoGroups } = await this.supabase
      .from('photo_groups')
      .select('status, photo_type, created_at')
      .eq('couple_id', this.coupleId);

    if (!photoGroups) {
      throw new Error('Failed to fetch photo groups');
    }

    const statusCounts = photoGroups.reduce((acc: any, group: any) => {
      const status = group.status || 'draft';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const data = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      percentage: Math.round(((count as number) / photoGroups.length) * 100),
    }));

    const completedCount = statusCounts.completed || 0;
    const completionRate = Math.round(
      (completedCount / photoGroups.length) * 100,
    );

    return {
      metric_name: 'completion_rates',
      data,
      summary: {
        total: photoGroups.length,
        average: completionRate,
        trend: completionRate > 70 ? 'increasing' : 'stable',
      },
      visualization_config: {
        chart_type: 'pie',
        color_scheme: ['#10B981', '#F59E0B', '#8B5CF6', '#EF4444'],
      },
    };
  }

  private async getTrendAnalysis(query: any): Promise<MetricResult> {
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: recentGroups } = await this.supabase
      .from('photo_groups')
      .select('created_at, updated_at, status')
      .eq('couple_id', this.coupleId)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: true });

    if (!recentGroups || recentGroups.length === 0) {
      return {
        metric_name: 'trend_analysis',
        data: [],
        summary: { total: 0, average: 0, trend: 'stable' },
        visualization_config: { chart_type: 'line' },
      };
    }

    // Group by week
    const weeklyData = recentGroups.reduce((acc: any, group: any) => {
      const weekStart = new Date(group.created_at);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!acc[weekKey]) {
        acc[weekKey] = {
          week_start: weekKey,
          created_count: 0,
          updated_count: 0,
          completed_count: 0,
        };
      }

      acc[weekKey].created_count++;

      if (group.updated_at !== group.created_at) {
        acc[weekKey].updated_count++;
      }

      if (group.status === 'completed') {
        acc[weekKey].completed_count++;
      }

      return acc;
    }, {});

    const data = Object.values(weeklyData).sort(
      (a: any, b: any) =>
        new Date(a.week_start).getTime() - new Date(b.week_start).getTime(),
    );

    return {
      metric_name: 'trend_analysis',
      data,
      summary: {
        total: recentGroups.length,
        average: Math.round(recentGroups.length / Math.max(data.length, 1)),
        trend: this.calculateTrend(data.map((d: any) => d.created_count)),
      },
      visualization_config: {
        chart_type: 'line',
        x_axis: 'week_start',
        y_axis: 'created_count',
        color_scheme: ['#8B5CF6', '#06B6D4', '#10B981'],
      },
    };
  }

  private calculateTrend(
    values: number[],
  ): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) return 'stable';

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg =
      firstHalf.reduce((sum, val) => sum + (val || 0), 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, val) => sum + (val || 0), 0) / secondHalf.length;

    const threshold = 0.1; // 10% change threshold
    const changePercent = Math.abs(secondAvg - firstAvg) / firstAvg;

    if (changePercent < threshold) return 'stable';
    return secondAvg > firstAvg ? 'increasing' : 'decreasing';
  }

  async recordAnalyticsEvent(eventType: string, data: any): Promise<void> {
    try {
      await this.supabase.from('photo_group_analytics').insert({
        couple_id: this.coupleId,
        metric_type: eventType,
        metric_value: data.value || 1,
        dimensions: data.dimensions || {},
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to record analytics event:', error);
      // Don't throw - analytics recording shouldn't break the main flow
    }
  }
}

// GET /api/photo-groups/analytics/[coupleId] - Get photo group analytics
export async function GET(
  request: NextRequest,
  { params }: { params: { coupleId: string } },
) {
  const { coupleId } = params;

  if (!coupleId) {
    return NextResponse.json(
      { error: 'Couple ID is required' },
      { status: 400 },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const metricsParam = searchParams.get('metrics');
  const timeRangeParam = searchParams.get('time_range');
  const groupByParam = searchParams.get('group_by');
  const filtersParam = searchParams.get('filters');

  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this couple
    const { data: client } = await supabase
      .from('clients')
      .select(
        `
        id,
        user_profiles!inner(user_id)
      `,
      )
      .eq('id', coupleId)
      .eq('user_profiles.user_id', user.id)
      .single();

    if (!client) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Parse query parameters
    const queryParams = {
      metrics: metricsParam ? metricsParam.split(',') : undefined,
      time_range: timeRangeParam ? JSON.parse(timeRangeParam) : undefined,
      group_by: groupByParam || undefined,
      filters: filtersParam ? JSON.parse(filtersParam) : undefined,
    };

    // Validate with schema
    const validatedQuery = AnalyticsQuerySchema.parse(queryParams);

    // Generate analytics
    const analytics = new PhotoGroupAnalytics(supabase, coupleId, user.id);
    const results = await analytics.generateAnalytics(validatedQuery);

    // Record analytics request event
    await analytics.recordAnalyticsEvent('analytics_request', {
      value: 1,
      dimensions: {
        metrics_requested: validatedQuery.metrics?.join(','),
        user_id: user.id,
      },
    });

    return NextResponse.json({
      couple_id: coupleId,
      metrics: results,
      query_parameters: validatedQuery,
      generated_at: new Date().toISOString(),
      total_metrics: results.length,
    });
  } catch (error) {
    console.error('Analytics generation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// POST /api/photo-groups/analytics/[coupleId] - Record custom analytics event
export async function POST(
  request: NextRequest,
  { params }: { params: { coupleId: string } },
) {
  const { coupleId } = params;

  if (!coupleId) {
    return NextResponse.json(
      { error: 'Couple ID is required' },
      { status: 400 },
    );
  }

  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this couple
    const { data: client } = await supabase
      .from('clients')
      .select(
        `
        id,
        user_profiles!inner(user_id)
      `,
      )
      .eq('id', coupleId)
      .eq('user_profiles.user_id', user.id)
      .single();

    if (!client) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { event_type, value, dimensions, photo_group_id } = z
      .object({
        event_type: z.string(),
        value: z.number().optional(),
        dimensions: z.record(z.any()).optional(),
        photo_group_id: z.string().uuid().optional(),
      })
      .parse(body);

    // Record the analytics event
    const { data: analyticsRecord, error: recordError } = await supabase
      .from('photo_group_analytics')
      .insert({
        couple_id: coupleId,
        photo_group_id,
        metric_type: event_type,
        metric_value: value || 1,
        dimensions: dimensions || {},
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();

    if (recordError) {
      console.error('Error recording analytics event:', recordError);
      return NextResponse.json(
        { error: 'Failed to record analytics event' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: 'Analytics event recorded successfully',
      event_id: analyticsRecord.id,
      event_type,
      recorded_at: analyticsRecord.timestamp,
    });
  } catch (error) {
    console.error('Analytics event recording error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid event data', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
