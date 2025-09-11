import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { withSecureValidation } from '@/lib/validation/middleware';

// Analytics schema for progress tracking with comprehensive validation
const analyticsSchema = z.object({
  dateRange: z
    .object({
      start: z
        .string()
        .datetime()
        .refine((date) => {
          const startDate = new Date(date);
          const now = new Date();
          const oneYearAgo = new Date(
            now.getTime() - 365 * 24 * 60 * 60 * 1000,
          );
          return startDate >= oneYearAgo && startDate <= now;
        }, 'Start date must be within the last year and not in the future'),
      end: z.string().datetime(),
    })
    .refine((range) => {
      const start = new Date(range.start);
      const end = new Date(range.end);
      const diffDays =
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      return start <= end && diffDays <= 365;
    }, 'Date range must be valid and not exceed 365 days'),

  metrics: z
    .array(
      z.enum([
        'tasks',
        'budget',
        'milestones',
        'vendors',
        'progress',
        'completion',
        'deadlines',
      ]),
    )
    .min(1, 'At least one metric must be selected')
    .max(5, 'Maximum 5 metrics allowed per request'),

  filters: z
    .object({
      weddingId: z.string().uuid().optional(),
      supplierId: z.string().uuid().optional(),
      status: z
        .enum(['pending', 'in_progress', 'completed', 'overdue'])
        .optional(),
      priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      category: z
        .string()
        .max(50)
        .regex(/^[a-zA-Z0-9_\s-]+$/)
        .optional(),
    })
    .optional(),

  aggregation: z.enum(['day', 'week', 'month']).default('day'),
  limit: z.number().int().min(1).max(1000).default(100),
});

interface ProgressMetrics {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  completionRate: number;
  averageCompletionTime: number;
  trendData: Array<{
    date: string;
    value: number;
    metric: string;
  }>;
}

interface ChartDataPoint {
  x: string;
  y: number;
  category?: string;
  color?: string;
}

export const GET = withSecureValidation(
  analyticsSchema,
  async (request: NextRequest, validatedData) => {
    const startTime = performance.now();

    try {
      const supabase = await createClient();

      // Verify authentication
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required', code: 'AUTH_REQUIRED' },
          { status: 401 },
        );
      }

      // Get user's organization
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id, role, subscription_tier')
        .eq('user_id', user.id)
        .single();

      if (!profile?.organization_id) {
        return NextResponse.json(
          { error: 'Organization not found', code: 'ORG_NOT_FOUND' },
          { status: 403 },
        );
      }

      // Business logic validation for subscription tiers
      if (
        validatedData.metrics.length > 3 &&
        profile.subscription_tier === 'starter'
      ) {
        return NextResponse.json(
          {
            error:
              'Advanced analytics require Professional subscription or higher',
            code: 'TIER_LIMIT_EXCEEDED',
            currentTier: profile.subscription_tier,
            requiredTier: 'professional',
          },
          { status: 403 },
        );
      }

      // Validate wedding access if specified
      if (validatedData.filters?.weddingId) {
        const { data: wedding, error: weddingError } = await supabase
          .from('weddings')
          .select('id, organization_id')
          .eq('id', validatedData.filters.weddingId)
          .eq('organization_id', profile.organization_id)
          .single();

        if (weddingError || !wedding) {
          return NextResponse.json(
            {
              error: 'Wedding not found or access denied',
              code: 'WEDDING_ACCESS_DENIED',
            },
            { status: 403 },
          );
        }
      }

      // Build base query with RLS (Row Level Security) automatically enforced
      let baseQuery = supabase
        .from('tasks')
        .select(
          `
          id,
          title,
          description,
          status,
          priority,
          due_date,
          completed_at,
          created_at,
          wedding_id,
          assigned_to,
          category,
          estimated_hours,
          actual_hours,
          wedding:wedding_id (
            id,
            couple_name,
            wedding_date,
            organization_id
          )
        `,
        )
        .eq('organization_id', profile.organization_id)
        .gte('created_at', validatedData.dateRange.start)
        .lte('created_at', validatedData.dateRange.end);

      // Apply filters
      if (validatedData.filters) {
        const { weddingId, supplierId, status, priority, category } =
          validatedData.filters;

        if (weddingId) baseQuery = baseQuery.eq('wedding_id', weddingId);
        if (status) baseQuery = baseQuery.eq('status', status);
        if (priority) baseQuery = baseQuery.eq('priority', priority);
        if (category) baseQuery = baseQuery.ilike('category', `%${category}%`);
      }

      // Execute query with limit
      const { data: tasks, error: tasksError } = await baseQuery
        .order('created_at', { ascending: false })
        .limit(validatedData.limit);

      if (tasksError) {
        console.error('Analytics query error:', tasksError);
        return NextResponse.json(
          { error: 'Failed to fetch analytics data', code: 'QUERY_ERROR' },
          { status: 500 },
        );
      }

      // Process metrics calculation
      const metrics = await calculateProgressMetrics(
        tasks || [],
        validatedData,
      );

      // Generate chart data
      const chartData = generateChartData(tasks || [], validatedData);

      // Calculate performance metrics
      const endTime = performance.now();
      const queryTime = Math.round(endTime - startTime);

      // Log analytics access for audit
      await logAnalyticsAccess(supabase, {
        userId: user.id,
        organizationId: profile.organization_id,
        query: validatedData,
        resultCount: tasks?.length || 0,
        queryTime,
        ip:
          request.headers.get('x-forwarded-for') ||
          request.headers.get('x-real-ip') ||
          '0.0.0.0',
      });

      return NextResponse.json({
        success: true,
        data: {
          metrics,
          chartData,
          summary: {
            totalRecords: tasks?.length || 0,
            dateRange: validatedData.dateRange,
            aggregation: validatedData.aggregation,
            appliedFilters: validatedData.filters || {},
            queryTime: `${queryTime}ms`,
          },
        },
        meta: {
          requestId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          version: '1.0',
          cached: false,
        },
      });
    } catch (error) {
      console.error('Progress analytics API error:', error);

      return NextResponse.json(
        {
          error: 'Internal server error during analytics processing',
          code: 'ANALYTICS_ERROR',
          requestId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      );
    }
  },
);

async function calculateProgressMetrics(
  tasks: any[],
  validatedData: any,
): Promise<ProgressMetrics> {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(
    (task) => task.status === 'completed',
  ).length;
  const overdueTasks = tasks.filter((task) => {
    if (!task.due_date || task.status === 'completed') return false;
    return new Date(task.due_date) < new Date();
  }).length;

  const completionRate =
    totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Calculate average completion time for completed tasks
  const completedTasksWithTime = tasks.filter(
    (task) =>
      task.status === 'completed' && task.completed_at && task.created_at,
  );

  const averageCompletionTime =
    completedTasksWithTime.length > 0
      ? completedTasksWithTime.reduce((sum, task) => {
          const completionTime =
            new Date(task.completed_at).getTime() -
            new Date(task.created_at).getTime();
          return sum + completionTime / (1000 * 60 * 60 * 24); // Convert to days
        }, 0) / completedTasksWithTime.length
      : 0;

  // Generate trend data based on aggregation
  const trendData = generateTrendData(
    tasks,
    validatedData.aggregation,
    validatedData.metrics,
  );

  return {
    totalTasks,
    completedTasks,
    overdueTasks,
    completionRate: Math.round(completionRate * 100) / 100,
    averageCompletionTime: Math.round(averageCompletionTime * 100) / 100,
    trendData,
  };
}

function generateTrendData(
  tasks: any[],
  aggregation: string,
  metrics: string[],
): Array<{ date: string; value: number; metric: string }> {
  const trendData: Array<{ date: string; value: number; metric: string }> = [];

  // Group tasks by date based on aggregation
  const dateGroups: { [key: string]: any[] } = {};

  tasks.forEach((task) => {
    const date = new Date(task.created_at);
    let dateKey: string;

    switch (aggregation) {
      case 'day':
        dateKey = date.toISOString().split('T')[0];
        break;
      case 'week':
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        dateKey = startOfWeek.toISOString().split('T')[0];
        break;
      case 'month':
        dateKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-01`;
        break;
      default:
        dateKey = date.toISOString().split('T')[0];
    }

    if (!dateGroups[dateKey]) {
      dateGroups[dateKey] = [];
    }
    dateGroups[dateKey].push(task);
  });

  // Calculate metrics for each date group
  Object.entries(dateGroups).forEach(([date, groupTasks]) => {
    metrics.forEach((metric) => {
      let value = 0;

      switch (metric) {
        case 'tasks':
          value = groupTasks.length;
          break;
        case 'completion':
          value = groupTasks.filter((t) => t.status === 'completed').length;
          break;
        case 'progress':
          const total = groupTasks.length;
          const completed = groupTasks.filter(
            (t) => t.status === 'completed',
          ).length;
          value = total > 0 ? (completed / total) * 100 : 0;
          break;
        case 'deadlines':
          value = groupTasks.filter(
            (t) => t.due_date && new Date(t.due_date) < new Date(),
          ).length;
          break;
        default:
          value = groupTasks.length;
      }

      trendData.push({ date, value: Math.round(value * 100) / 100, metric });
    });
  });

  return trendData.sort((a, b) => a.date.localeCompare(b.date));
}

function generateChartData(tasks: any[], validatedData: any): ChartDataPoint[] {
  const chartData: ChartDataPoint[] = [];

  // Status distribution
  const statusCounts = tasks.reduce(
    (acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    },
    {} as { [key: string]: number },
  );

  Object.entries(statusCounts).forEach(([status, count]) => {
    chartData.push({
      x: status,
      y: count,
      category: 'status',
      color: getStatusColor(status),
    });
  });

  // Priority distribution
  const priorityCounts = tasks.reduce(
    (acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    },
    {} as { [key: string]: number },
  );

  Object.entries(priorityCounts).forEach(([priority, count]) => {
    chartData.push({
      x: priority,
      y: count,
      category: 'priority',
      color: getPriorityColor(priority),
    });
  });

  return chartData;
}

function getStatusColor(status: string): string {
  const colors = {
    pending: '#fbbf24',
    in_progress: '#3b82f6',
    completed: '#10b981',
    overdue: '#ef4444',
  };
  return colors[status as keyof typeof colors] || '#6b7280';
}

function getPriorityColor(priority: string): string {
  const colors = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#f97316',
    critical: '#ef4444',
  };
  return colors[priority as keyof typeof colors] || '#6b7280';
}

async function logAnalyticsAccess(
  supabase: any,
  data: {
    userId: string;
    organizationId: string;
    query: any;
    resultCount: number;
    queryTime: number;
    ip: string;
  },
) {
  try {
    await supabase.from('audit_logs').insert({
      user_id: data.userId,
      organization_id: data.organizationId,
      action: 'analytics_progress_query',
      resource: 'analytics',
      resource_id: null,
      ip_address: data.ip,
      additional_data: {
        metrics: data.query.metrics,
        date_range: data.query.dateRange,
        filters: data.query.filters || {},
        result_count: data.resultCount,
        query_time_ms: data.queryTime,
        aggregation: data.query.aggregation,
      },
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    // Log error but don't fail the main request
    console.error('Failed to log analytics access:', error);
  }
}

// POST method for more complex analytics queries with request body
export const POST = withSecureValidation(
  analyticsSchema,
  async (request: NextRequest, validatedData) => {
    // Reuse the same logic as GET but with body data
    // This allows for more complex filters and configuration
    return GET(request);
  },
);
