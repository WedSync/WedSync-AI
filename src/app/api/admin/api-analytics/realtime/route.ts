import { NextRequest, NextResponse } from 'next/server';
import {
  withAPIMiddleware,
  APIMiddlewarePresets,
} from '@/lib/middleware/rate-limiting';
import { apiUsageTracker } from '@/lib/middleware/rate-limiting';

/**
 * WS-233: API Analytics - Real-time Metrics Endpoint
 * Returns current API usage statistics for the dashboard
 */
export async function GET(request: NextRequest) {
  return withAPIMiddleware(
    request,
    async (context) => {
      try {
        // Get real-time metrics from the usage tracker
        const realtimeMetrics = await apiUsageTracker.getRealtimeMetrics();

        // Return the metrics
        return NextResponse.json({
          success: true,
          data: realtimeMetrics,
          timestamp: new Date().toISOString(),
          requestId: context.requestId,
        });
      } catch (error) {
        console.error('Failed to fetch realtime metrics:', error);

        return NextResponse.json(
          {
            success: false,
            error: 'Failed to fetch metrics',
            requestId: context.requestId,
          },
          { status: 500 },
        );
      }
    },
    {
      ...APIMiddlewarePresets.admin,
      customRateLimit: {
        maxRequests: 120, // Allow frequent polling for dashboard
        windowSeconds: 3600,
      },
    },
  );
}

/**
 * Example of the data structure returned:
 * {
 *   success: true,
 *   data: {
 *     currentHourRequests: 1250,
 *     currentDayRequests: 15600,
 *     averageResponseTime: 145,
 *     errorRate: 2.3,
 *     topEndpoints: [
 *       { endpoint: "/api/forms/submit", requests: 450 },
 *       { endpoint: "/api/guests", requests: 320 },
 *       { endpoint: "/api/suppliers/search", requests: 180 }
 *     ]
 *   },
 *   timestamp: "2025-01-20T10:30:00Z",
 *   requestId: "req_1642674600_abc123"
 * }
 */
