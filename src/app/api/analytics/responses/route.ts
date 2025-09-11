import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { redis } from '@/lib/redis';
import { z } from 'zod';

const querySchema = z.object({
  client_id: z.string().uuid(),
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  granularity: z.enum(['hour', 'day', 'week', 'month']).default('day'),
  metrics: z.array(z.string()).optional(),
  use_cache: z.boolean().default(true),
});

// Cache TTL based on data recency
const getCacheTTL = (startDate: Date, endDate: Date): number => {
  const now = new Date();
  const daysDiff = Math.ceil(
    (now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysDiff > 30) return 3600; // 1 hour for old data
  if (daysDiff > 7) return 1800; // 30 minutes for week-old data
  if (daysDiff > 1) return 900; // 15 minutes for day-old data
  return 300; // 5 minutes for recent data
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = querySchema.parse({
      client_id: searchParams.get('client_id'),
      start_date: searchParams.get('start_date'),
      end_date: searchParams.get('end_date'),
      granularity: searchParams.get('granularity'),
      metrics: searchParams.get('metrics')?.split(','),
      use_cache: searchParams.get('use_cache') !== 'false',
    });

    const cacheKey = `analytics:responses:${params.client_id}:${params.start_date}:${params.end_date}:${params.granularity}`;
    const cacheTTL = getCacheTTL(
      new Date(params.start_date),
      new Date(params.end_date),
    );

    // Try cache first if enabled
    if (params.use_cache) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return NextResponse.json({
            data: JSON.parse(cached),
            cached: true,
            cache_ttl: cacheTTL,
          });
        }
      } catch (cacheError) {
        console.warn('Cache read error:', cacheError);
      }
    }

    const supabase = await createClient();

    // Authentication check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For now, we'll simulate the analytics data based on form submissions
    // In a real implementation, this would query the actual response analytics tables
    const { data: submissions, error } = await supabase
      .from('form_submissions')
      .select(
        `
        id,
        created_at,
        updated_at,
        status,
        metadata
      `,
      )
      .eq('form_id', params.client_id)
      .gte('created_at', params.start_date)
      .lte('created_at', params.end_date)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Process data into analytics format
    const processedData = processSubmissionData(
      submissions || [],
      params.granularity,
    );

    // Cache the result
    if (params.use_cache) {
      try {
        await redis.setex(cacheKey, cacheTTL, JSON.stringify(processedData));
      } catch (cacheError) {
        console.warn('Cache write error:', cacheError);
      }
    }

    return NextResponse.json({
      data: processedData,
      cached: false,
      cache_ttl: cacheTTL,
      query_time: Date.now(),
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 },
    );
  }
}

function processSubmissionData(submissions: any[], granularity: string) {
  // Group submissions by time period
  const groupedData = new Map();

  submissions.forEach((submission) => {
    const date = new Date(submission.created_at);
    let periodKey: string;

    switch (granularity) {
      case 'hour':
        periodKey = date.toISOString().substring(0, 13) + ':00:00.000Z';
        break;
      case 'week':
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        periodKey =
          startOfWeek.toISOString().substring(0, 10) + 'T00:00:00.000Z';
        break;
      case 'month':
        periodKey = date.toISOString().substring(0, 7) + '-01T00:00:00.000Z';
        break;
      default: // day
        periodKey = date.toISOString().substring(0, 10) + 'T00:00:00.000Z';
    }

    if (!groupedData.has(periodKey)) {
      groupedData.set(periodKey, {
        period: periodKey,
        submissions: [],
        total_responses: 0,
        completed: 0,
        pending: 0,
        failed: 0,
        response_times: [],
      });
    }

    const group = groupedData.get(periodKey);
    group.submissions.push(submission);
    group.total_responses++;

    // Calculate response time if both created_at and updated_at exist
    if (submission.updated_at) {
      const responseTime =
        (new Date(submission.updated_at).getTime() -
          new Date(submission.created_at).getTime()) /
        1000;
      group.response_times.push(responseTime);
    }

    // Count by status
    switch (submission.status) {
      case 'completed':
        group.completed++;
        break;
      case 'pending':
        group.pending++;
        break;
      case 'failed':
        group.failed++;
        break;
    }
  });

  // Convert to analytics format
  const periods = Array.from(groupedData.keys()).sort();
  const metrics = {
    total_responses: [] as number[],
    avg_response_time: [] as number[],
    p95_response_time: [] as number[],
    success_rate: [] as number[],
    error_rate: [] as number[],
    completion_rate: [] as number[],
  };

  periods.forEach((period) => {
    const data = groupedData.get(period);

    metrics.total_responses.push(data.total_responses);

    // Calculate average response time
    const avgTime =
      data.response_times.length > 0
        ? data.response_times.reduce(
            (sum: number, time: number) => sum + time,
            0,
          ) / data.response_times.length
        : 0;
    metrics.avg_response_time.push(avgTime);

    // Calculate 95th percentile
    const sortedTimes = data.response_times.sort(
      (a: number, b: number) => a - b,
    );
    const p95Index = Math.ceil(sortedTimes.length * 0.95) - 1;
    metrics.p95_response_time.push(sortedTimes[p95Index] || 0);

    // Calculate rates
    const successRate =
      data.total_responses > 0
        ? (data.completed / data.total_responses) * 100
        : 0;
    const errorRate =
      data.total_responses > 0 ? (data.failed / data.total_responses) * 100 : 0;

    metrics.success_rate.push(successRate);
    metrics.error_rate.push(errorRate);
    metrics.completion_rate.push(successRate); // Using success rate as completion rate for now
  });

  // Calculate summary statistics
  const totalResponses = submissions.length;
  const completedCount = submissions.filter(
    (s) => s.status === 'completed',
  ).length;
  const allResponseTimes = submissions
    .filter((s) => s.updated_at)
    .map(
      (s) =>
        (new Date(s.updated_at).getTime() - new Date(s.created_at).getTime()) /
        1000,
    );

  const avgResponseTime =
    allResponseTimes.length > 0
      ? allResponseTimes.reduce((sum, time) => sum + time, 0) /
        allResponseTimes.length
      : 0;

  const overallSuccessRate =
    totalResponses > 0 ? (completedCount / totalResponses) * 100 : 0;

  // Mock additional data for demo
  const summary = {
    total_responses: totalResponses,
    avg_response_time: avgResponseTime,
    overall_success_rate: overallSuccessRate,
    completion_rate: overallSuccessRate,
    peak_hour: findPeakHour(submissions),
    most_common_device: 'Desktop (67%)',
  };

  return {
    periods,
    metrics,
    summary,
  };
}

function findPeakHour(submissions: any[]): string {
  const hourCounts = new Map();

  submissions.forEach((submission) => {
    const hour = new Date(submission.created_at).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
  });

  let peakHour = 0;
  let maxCount = 0;

  hourCounts.forEach((count, hour) => {
    if (count > maxCount) {
      maxCount = count;
      peakHour = hour;
    }
  });

  const timeStr =
    peakHour === 0
      ? '12:00 AM'
      : peakHour < 12
        ? `${peakHour}:00 AM`
        : peakHour === 12
          ? '12:00 PM'
          : `${peakHour - 12}:00 PM`;

  return `${timeStr} (${maxCount} responses)`;
}
