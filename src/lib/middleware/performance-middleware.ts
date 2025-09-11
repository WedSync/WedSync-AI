import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from '@/lib/monitoring/feature-request-performance';

export interface PerformanceContext {
  startTime: number;
  endpoint: string;
  method: string;
  userType?: string;
}

// Middleware to wrap API handlers with performance monitoring
export function withPerformanceMonitoring(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const startTime = Date.now();
    const endpoint = `${request.method} ${new URL(request.url).pathname}`;

    let response: NextResponse;
    let error: Error | null = null;

    try {
      // Execute the original handler
      response = await handler(request, context);

      // Record successful response time
      const duration = Date.now() - startTime;
      performanceMonitor.recordResponseTime(endpoint, duration);

      // Add performance headers
      response.headers.set('X-Response-Time', `${duration}ms`);
      response.headers.set('X-Timestamp', new Date().toISOString());

      // Record specific metrics based on endpoint
      await recordEndpointSpecificMetrics(
        endpoint,
        request,
        response,
        duration,
      );
    } catch (err) {
      error = err as Error;
      const duration = Date.now() - startTime;

      // Record error response time
      performanceMonitor.recordResponseTime(`${endpoint}_error`, duration);

      // Create error response
      response = NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 },
      );

      console.error(`API Error in ${endpoint}:`, error);
    }

    return response;
  };
}

// Record endpoint-specific performance metrics
async function recordEndpointSpecificMetrics(
  endpoint: string,
  request: NextRequest,
  response: NextResponse,
  duration: number,
): Promise<void> {
  try {
    // Feature request creation metrics
    if (endpoint === 'POST /api/feature-requests') {
      const responseData = await response
        .clone()
        .json()
        .catch(() => ({}));

      if (responseData.feature_request) {
        const riceScore =
          responseData.feature_request.rice_calculated_score || 0;
        const userType = responseData.feature_request.user_type || 'unknown';

        performanceMonitor.recordRiceScoring(duration, riceScore, userType);
        performanceMonitor.recordUserEngagement(userType, 'create');

        // Check for high priority requests
        if (responseData.feature_request.final_priority_score > 50) {
          performanceMonitor.recordUserEngagement('system', 'create'); // Track high priority
        }

        // Record duplicate detection performance if duplicates were found
        if (responseData.potential_duplicates) {
          performanceMonitor.recordDuplicateDetection(
            duration,
            true,
            responseData.potential_duplicates.length,
          );
        }
      }
    }

    // Voting metrics
    if (endpoint.includes('/vote')) {
      const responseData = await response
        .clone()
        .json()
        .catch(() => ({}));

      if (responseData.success) {
        const userType = await getUserTypeFromRequest(request);
        performanceMonitor.recordUserEngagement(userType || 'unknown', 'vote');
      }
    }

    // Duplicate detection metrics
    if (endpoint === 'POST /api/feature-requests/check-duplicates') {
      const responseData = await response
        .clone()
        .json()
        .catch(() => ({}));

      const success = !responseData.error;
      const duplicateCount = responseData.potential_duplicates?.length || 0;

      performanceMonitor.recordDuplicateDetection(
        duration,
        success,
        duplicateCount,
      );
    }

    // General request metrics
    if (endpoint === 'GET /api/feature-requests') {
      const url = new URL(request.url);
      const userType = url.searchParams.get('user_type') || 'unknown';
      performanceMonitor.recordUserEngagement(userType, 'view');
    }
  } catch (error) {
    console.error('Error recording endpoint metrics:', error);
  }
}

// Extract user type from request (simplified)
async function getUserTypeFromRequest(
  request: NextRequest,
): Promise<string | null> {
  try {
    // In a real implementation, this would extract user info from auth token
    // For now, return a default value
    return 'wedding_supplier'; // Placeholder
  } catch {
    return null;
  }
}

// Middleware for rate limiting with performance awareness
export function withRateLimitingAndPerformance(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  options: {
    maxRequests: number;
    windowMs: number;
    skipSuccessfulGET?: boolean;
  },
) {
  const requestCounts = new Map<string, { count: number; resetTime: number }>();

  return withPerformanceMonitoring(
    async (request: NextRequest, context?: any): Promise<NextResponse> => {
      const clientId = getClientId(request);
      const now = Date.now();

      // Clean up expired entries - use forEach for downlevelIteration compatibility
      const expiredKeys: string[] = [];
      requestCounts.forEach((value, key) => {
        if (now > value.resetTime) {
          expiredKeys.push(key);
        }
      });
      expiredKeys.forEach((key) => requestCounts.delete(key));

      // Check rate limit
      const currentWindow = requestCounts.get(clientId);

      if (currentWindow) {
        if (currentWindow.count >= options.maxRequests) {
          performanceMonitor.recordResponseTime(
            `${request.method}_rate_limited`,
            0,
          );
          return NextResponse.json(
            { error: 'Rate limit exceeded' },
            { status: 429 },
          );
        }
        currentWindow.count++;
      } else {
        requestCounts.set(clientId, {
          count: 1,
          resetTime: now + options.windowMs,
        });
      }

      return handler(request, context);
    },
  );
}

// Get client identifier for rate limiting
function getClientId(request: NextRequest): string {
  // Use IP address as client identifier
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : '127.0.0.1';
  return ip;
}

// Wedding industry specific performance checks
export async function performWeddingIndustryHealthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: { [key: string]: boolean };
  metrics: any;
}> {
  const checks = {
    api_response_times: true,
    database_performance: true,
    ai_integration: true,
    seasonal_load_handling: true,
    user_engagement: true,
  };

  let healthyChecks = 0;

  try {
    // Check API response times
    const stats = performanceMonitor.getPerformanceStats();
    const apiResponseTime =
      stats.api_response_times['GET /api/feature-requests'].current_avg;
    checks.api_response_times = apiResponseTime < 500; // 500ms threshold
    if (checks.api_response_times) healthyChecks++;

    // Check database performance
    const dbStats = await performanceMonitor.monitorDatabasePerformance();
    checks.database_performance =
      !dbStats.error && (dbStats.slow_queries?.length || 0) < 5;
    if (checks.database_performance) healthyChecks++;

    // Check AI integration (duplicate detection)
    const aiResponseTime =
      stats.api_response_times['AI duplicate detection'].current_avg;
    checks.ai_integration =
      aiResponseTime < 2000 && stats.alerts.duplicate_detection_failures < 5;
    if (checks.ai_integration) healthyChecks++;

    // Check seasonal load handling
    checks.seasonal_load_handling =
      stats.wedding_industry_metrics.peak_season_load_handling;
    if (checks.seasonal_load_handling) healthyChecks++;

    // Check user engagement
    const engagementRate =
      stats.wedding_industry_metrics.couple_engagement_rate;
    checks.user_engagement = engagementRate > 0.5; // 50% minimum engagement
    if (checks.user_engagement) healthyChecks++;

    // Determine overall health
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyChecks >= 4) {
      status = 'healthy';
    } else if (healthyChecks >= 2) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      checks,
      metrics: {
        healthy_checks: healthyChecks,
        total_checks: Object.keys(checks).length,
        api_stats: stats,
        wedding_metrics:
          await performanceMonitor.monitorWeddingIndustryMetrics(),
      },
    };
  } catch (error) {
    console.error('Health check failed:', error);
    return {
      status: 'unhealthy',
      checks: Object.fromEntries(
        Object.keys(checks).map((key) => [key, false]),
      ),
      metrics: { error: 'Health check failed', details: error },
    };
  }
}

// Automated performance alerts
export class PerformanceAlerting {
  private alertCooldowns = new Map<string, number>();

  async checkAndAlert(): Promise<void> {
    const now = Date.now();
    const cooldownPeriod = 15 * 60 * 1000; // 15 minutes

    try {
      const healthCheck = await performWeddingIndustryHealthCheck();

      // Alert on unhealthy status
      if (healthCheck.status === 'unhealthy') {
        const alertKey = 'system_unhealthy';
        const lastAlert = this.alertCooldowns.get(alertKey) || 0;

        if (now - lastAlert > cooldownPeriod) {
          await this.sendAlert('System Unhealthy', {
            status: healthCheck.status,
            failed_checks: Object.entries(healthCheck.checks)
              .filter(([_, healthy]) => !healthy)
              .map(([check]) => check),
            timestamp: new Date().toISOString(),
          });

          this.alertCooldowns.set(alertKey, now);
        }
      }

      // Alert on high response times
      const stats = performanceMonitor.getPerformanceStats();
      const criticalEndpoints = Object.entries(stats.api_response_times).filter(
        ([_, metrics]) => metrics.current_avg > metrics.critical,
      );

      if (criticalEndpoints.length > 0) {
        const alertKey = 'critical_response_times';
        const lastAlert = this.alertCooldowns.get(alertKey) || 0;

        if (now - lastAlert > cooldownPeriod) {
          await this.sendAlert('Critical Response Times', {
            endpoints: criticalEndpoints.map(([endpoint, metrics]) => ({
              endpoint,
              current: metrics.current_avg,
              threshold: metrics.critical,
            })),
            timestamp: new Date().toISOString(),
          });

          this.alertCooldowns.set(alertKey, now);
        }
      }

      // Alert on duplicate detection failures
      if (stats.alerts.duplicate_detection_failures > 10) {
        const alertKey = 'duplicate_detection_failures';
        const lastAlert = this.alertCooldowns.get(alertKey) || 0;

        if (now - lastAlert > cooldownPeriod) {
          await this.sendAlert('Duplicate Detection Issues', {
            failure_count: stats.alerts.duplicate_detection_failures,
            threshold: 10,
            timestamp: new Date().toISOString(),
          });

          this.alertCooldowns.set(alertKey, now);
        }
      }
    } catch (error) {
      console.error('Performance alerting error:', error);
    }
  }

  private async sendAlert(title: string, details: any): Promise<void> {
    // In production, integrate with alerting services
    console.error(`🚨 PERFORMANCE ALERT: ${title}`, details);

    // Example integrations:
    // - Send to Slack webhook
    // - Send email via SendGrid/Resend
    // - Create PagerDuty incident
    // - Send to monitoring dashboard

    try {
      // Placeholder for actual alerting integration
      // await notificationService.sendAlert(title, details);
    } catch (error) {
      console.error('Failed to send alert:', error);
    }
  }
}

export const performanceAlerting = new PerformanceAlerting();
