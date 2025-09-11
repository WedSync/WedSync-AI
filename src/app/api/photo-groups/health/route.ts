import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as Sentry from '@sentry/nextjs';
import { errorHandler, ApiError, ErrorCode } from '../error-handler';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: CheckStatus;
    storage: CheckStatus;
    realtime: CheckStatus;
    memory: CheckStatus;
    photoProcessing: CheckStatus;
  };
  metrics: {
    requestsPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
    activeConnections: number;
    queuedJobs: number;
  };
  version: string;
}

interface CheckStatus {
  status: 'pass' | 'warn' | 'fail';
  responseTime: number;
  message?: string;
  details?: any;
}

// Global metrics tracking
const metrics = {
  startTime: Date.now(),
  requests: new Map<number, number>(), // timestamp -> count
  responseTimes: [] as number[],
  errors: 0,
  totalRequests: 0,
};

export async function GET(request: NextRequest) {
  const requestId = errorHandler.generateRequestId();
  const startTime = Date.now();

  try {
    // Check authorization (only allow internal monitoring)
    const authHeader = request.headers.get('authorization');
    const monitoringToken = process.env.MONITORING_TOKEN;

    if (
      authHeader !== `Bearer ${monitoringToken}` &&
      request.headers.get('x-internal') !== 'true'
    ) {
      // Still return basic health for load balancers
      return NextResponse.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
      });
    }

    const healthCheck: HealthCheckResult = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - metrics.startTime,
      checks: {
        database: await checkDatabase(),
        storage: await checkStorage(),
        realtime: await checkRealtime(),
        memory: checkMemory(),
        photoProcessing: await checkPhotoProcessing(),
      },
      metrics: calculateMetrics(),
      version: process.env.APP_VERSION || '1.0.0',
    };

    // Determine overall health status
    const checks = Object.values(healthCheck.checks);
    const failedChecks = checks.filter((c) => c.status === 'fail');
    const warnChecks = checks.filter((c) => c.status === 'warn');

    if (failedChecks.length > 0) {
      healthCheck.status = 'unhealthy';
    } else if (warnChecks.length > 0) {
      healthCheck.status = 'degraded';
    }

    // Track this health check
    trackRequest(Date.now() - startTime);

    // Send alerts if unhealthy
    if (healthCheck.status === 'unhealthy') {
      Sentry.captureMessage('Photo Groups API Health Check Failed', {
        level: 'error',
        extra: healthCheck,
      });
    }

    return NextResponse.json(healthCheck, {
      status: healthCheck.status === 'unhealthy' ? 503 : 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Request-Id': requestId,
      },
    });
  } catch (error) {
    console.error('Health check error:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        requestId,
      },
      { status: 503 },
    );
  }
}

async function checkDatabase(): Promise<CheckStatus> {
  const start = Date.now();

  try {
    const supabase = await createClient();

    // Test database connectivity with a simple query
    const { data, error } = await supabase
      .from('photo_groups')
      .select('count')
      .limit(1);

    if (error) {
      throw error;
    }

    const responseTime = Date.now() - start;

    // Check response time
    if (responseTime > 1000) {
      return {
        status: 'warn',
        responseTime,
        message: 'Database response time is high',
      };
    }

    return {
      status: 'pass',
      responseTime,
    };
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Date.now() - start,
      message: 'Database connection failed',
      details: error,
    };
  }
}

async function checkStorage(): Promise<CheckStatus> {
  const start = Date.now();

  try {
    const supabase = await createClient();

    // Check storage availability
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      throw error;
    }

    // Check if photo bucket exists
    const photoBucket = buckets?.find((b) => b.name === 'wedding-photos');
    if (!photoBucket) {
      return {
        status: 'warn',
        responseTime: Date.now() - start,
        message: 'Photo storage bucket not found',
      };
    }

    return {
      status: 'pass',
      responseTime: Date.now() - start,
      details: {
        bucketCount: buckets.length,
        photoBucketCreated: photoBucket.created_at,
      },
    };
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Date.now() - start,
      message: 'Storage check failed',
      details: error,
    };
  }
}

async function checkRealtime(): Promise<CheckStatus> {
  const start = Date.now();

  try {
    const supabase = await createClient();

    // Test realtime connection by subscribing and immediately unsubscribing
    const channel = supabase
      .channel('health-check')
      .on('presence', { event: 'sync' }, () => {});

    const subscription = await channel.subscribe();

    if (subscription === 'SUBSCRIBED' || subscription === 'SUBSCRIBING') {
      await channel.unsubscribe();

      return {
        status: 'pass',
        responseTime: Date.now() - start,
      };
    }

    return {
      status: 'warn',
      responseTime: Date.now() - start,
      message: 'Realtime connection degraded',
    };
  } catch (error) {
    return {
      status: 'warn', // Don't fail health check for realtime issues
      responseTime: Date.now() - start,
      message: 'Realtime check failed',
      details: error,
    };
  }
}

function checkMemory(): CheckStatus {
  const start = Date.now();
  const usage = process.memoryUsage();
  const totalMemory = usage.rss;
  const heapUsed = usage.heapUsed;
  const heapTotal = usage.heapTotal;

  // Convert to MB
  const totalMB = Math.round(totalMemory / 1024 / 1024);
  const heapUsedMB = Math.round(heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(heapTotal / 1024 / 1024);

  // Check memory thresholds
  const heapUsagePercent = (heapUsed / heapTotal) * 100;

  let status: 'pass' | 'warn' | 'fail' = 'pass';
  let message: string | undefined;

  if (heapUsagePercent > 90) {
    status = 'fail';
    message = 'Memory usage critical';
  } else if (heapUsagePercent > 75) {
    status = 'warn';
    message = 'Memory usage high';
  }

  return {
    status,
    responseTime: Date.now() - start,
    message,
    details: {
      totalMB,
      heapUsedMB,
      heapTotalMB,
      heapUsagePercent: Math.round(heapUsagePercent),
    },
  };
}

async function checkPhotoProcessing(): Promise<CheckStatus> {
  const start = Date.now();

  try {
    // Check if photo processing queue is healthy
    // This would connect to your actual photo processing service
    const mockQueueSize = Math.floor(Math.random() * 100);
    const mockProcessingRate = Math.floor(Math.random() * 50) + 10;

    let status: 'pass' | 'warn' | 'fail' = 'pass';
    let message: string | undefined;

    if (mockQueueSize > 500) {
      status = 'fail';
      message = 'Photo processing queue backed up';
    } else if (mockQueueSize > 100) {
      status = 'warn';
      message = 'Photo processing queue elevated';
    }

    return {
      status,
      responseTime: Date.now() - start,
      message,
      details: {
        queueSize: mockQueueSize,
        processingRate: `${mockProcessingRate}/min`,
      },
    };
  } catch (error) {
    return {
      status: 'warn',
      responseTime: Date.now() - start,
      message: 'Photo processing check failed',
      details: error,
    };
  }
}

function calculateMetrics() {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  // Clean up old metrics
  for (const [timestamp] of metrics.requests) {
    if (timestamp < oneMinuteAgo) {
      metrics.requests.delete(timestamp);
    }
  }

  // Calculate requests per minute
  let requestsInLastMinute = 0;
  for (const [timestamp, count] of metrics.requests) {
    if (timestamp >= oneMinuteAgo) {
      requestsInLastMinute += count;
    }
  }

  // Calculate average response time
  const recentResponseTimes = metrics.responseTimes.slice(-100);
  const avgResponseTime =
    recentResponseTimes.length > 0
      ? Math.round(
          recentResponseTimes.reduce((a, b) => a + b, 0) /
            recentResponseTimes.length,
        )
      : 0;

  // Calculate error rate
  const errorRate =
    metrics.totalRequests > 0
      ? Math.round((metrics.errors / metrics.totalRequests) * 10000) / 100
      : 0;

  return {
    requestsPerMinute: requestsInLastMinute,
    averageResponseTime: avgResponseTime,
    errorRate,
    activeConnections: Math.floor(Math.random() * 50) + 10, // Mock value
    queuedJobs: Math.floor(Math.random() * 20), // Mock value
  };
}

function trackRequest(responseTime: number, isError: boolean = false) {
  const now = Date.now();
  const minuteBucket = Math.floor(now / 1000) * 1000;

  // Track request count
  metrics.requests.set(
    minuteBucket,
    (metrics.requests.get(minuteBucket) || 0) + 1,
  );
  metrics.totalRequests++;

  // Track response time
  metrics.responseTimes.push(responseTime);
  if (metrics.responseTimes.length > 1000) {
    metrics.responseTimes.shift();
  }

  // Track errors
  if (isError) {
    metrics.errors++;
  }
}

// Export metrics tracking for use in other endpoints
export { trackRequest };
