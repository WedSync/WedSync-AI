// lib/middleware/api-usage-tracker.ts
// WS-233: API Usage Monitoring & Management Middleware
// Team B - Backend Implementation
// Comprehensive API usage tracking with rate limiting and analytics

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Edge Runtime compatible UUID generation
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export interface ApiUsageContext {
  organizationId: string;
  userId?: string;
  apiKeyId?: string;
  subscriptionTier: string;
  endpoint: string;
  httpMethod: string;
  requestId: string;
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
  countryCode?: string;
}

export interface UsageTrackingResult {
  allowed: boolean;
  reason?: string;
  rateLimitInfo?: {
    remainingRequests: number;
    resetTime: Date;
    dailyUsage: number;
    dailyLimit: number;
  };
  quotaInfo?: {
    dailyUsed: number;
    dailyLimit: number;
    monthlyUsed: number;
    monthlyLimit: number;
    utilization: number;
  };
  trackingId?: string;
}

export interface UsageMetrics {
  requestStartTime: number;
  requestEndTime?: number;
  responseTimeMs?: number;
  statusCode?: number;
  responseSizeBytes?: number;
  errorCode?: string;
  errorType?: string;
  isRateLimited?: boolean;
}

export class ApiUsageTracker {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
      (() => {
        throw new Error(
          'Missing environment variable: NEXT_PUBLIC_SUPABASE_URL',
        );
      })(),
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      (() => {
        throw new Error(
          'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY',
        );
      })(),
  );

  private redis = process.env.REDIS_URL
    ? require('redis').createClient({ url: process.env.REDIS_URL })
    : null;
  private metricsBuffer: Map<string, UsageMetrics> = new Map();

  // Batch write configuration
  private readonly BATCH_SIZE = 100;
  private readonly BATCH_TIMEOUT_MS = 30000; // 30 seconds
  private usageLogQueue: any[] = [];
  private lastBatchWrite = Date.now();

  constructor() {
    // Connect to Redis if available
    if (this.redis) {
      this.redis.connect().catch(console.error);
    }

    // Start batch processing
    this.startBatchProcessor();
  }

  /**
   * Pre-request validation: Check quotas and rate limits before processing request
   */
  async validateUsage(context: ApiUsageContext): Promise<UsageTrackingResult> {
    const requestId = context.requestId;

    try {
      // Start timing for this request
      this.metricsBuffer.set(requestId, {
        requestStartTime: Date.now(),
      });

      // Check API quotas and rate limits using database function
      const { data: limitCheck, error } = await this.supabase.rpc(
        'check_api_usage_limits',
        {
          p_organization_id: context.organizationId,
          p_endpoint: context.endpoint,
        },
      );

      if (error) {
        console.error('[API Usage] Quota check failed:', error);
        // Allow request on database error (fail open)
        return {
          allowed: true,
          reason: 'QUOTA_CHECK_ERROR',
          trackingId: requestId,
        };
      }

      if (!limitCheck.allowed) {
        // Log the rate limit/quota violation
        await this.logRateLimitViolation(context, limitCheck.reason);

        return {
          allowed: false,
          reason: limitCheck.reason,
          rateLimitInfo:
            limitCheck.reason === 'RATE_LIMIT_EXCEEDED'
              ? {
                  remainingRequests: 0,
                  resetTime: new Date(Date.now() + 60000), // 1 minute reset
                  dailyUsage: limitCheck.minute_usage || 0,
                  dailyLimit: limitCheck.minute_limit || 0,
                }
              : undefined,
          quotaInfo:
            limitCheck.reason === 'DAILY_QUOTA_EXCEEDED'
              ? {
                  dailyUsed: limitCheck.daily_usage || 0,
                  dailyLimit: limitCheck.daily_limit || 0,
                  monthlyUsed: 0, // TODO: Add monthly tracking
                  monthlyLimit: 0,
                  utilization:
                    ((limitCheck.daily_usage || 0) /
                      (limitCheck.daily_limit || 1)) *
                    100,
                }
              : undefined,
        };
      }

      // Update rate limit counter (Redis for performance)
      await this.updateRateLimitCounter(context);

      return {
        allowed: true,
        trackingId: requestId,
        quotaInfo: {
          dailyUsed: limitCheck.daily_usage || 0,
          dailyLimit: limitCheck.daily_limit || -1,
          monthlyUsed: 0,
          monthlyLimit: 0,
          utilization:
            limitCheck.daily_limit > 0
              ? ((limitCheck.daily_usage || 0) / limitCheck.daily_limit) * 100
              : 0,
        },
      };
    } catch (error) {
      console.error('[API Usage] Validation error:', error);
      // Fail open - allow the request but log the error
      return {
        allowed: true,
        reason: 'VALIDATION_ERROR',
        trackingId: requestId,
      };
    }
  }

  /**
   * Post-request logging: Record the completed request metrics
   */
  async recordUsage(
    context: ApiUsageContext,
    statusCode: number,
    responseTimeMs?: number,
    responseSizeBytes?: number,
    errorCode?: string,
    errorType?: string,
  ): Promise<void> {
    const requestId = context.requestId;

    try {
      // Update metrics in buffer
      const metrics = this.metricsBuffer.get(requestId) || {
        requestStartTime: Date.now(),
      };
      metrics.requestEndTime = Date.now();
      metrics.responseTimeMs =
        responseTimeMs || metrics.requestEndTime - metrics.requestStartTime;
      metrics.statusCode = statusCode;
      metrics.responseSizeBytes = responseSizeBytes || 0;
      metrics.errorCode = errorCode;
      metrics.errorType = errorType;

      // Create usage log entry
      const usageLog = {
        id: generateUUID(),
        organization_id: context.organizationId,
        user_id: context.userId || null,
        endpoint: context.endpoint,
        http_method: context.httpMethod,
        request_id: requestId,
        status_code: statusCode,
        response_time_ms: metrics.responseTimeMs,
        response_size_bytes: metrics.responseSizeBytes,
        api_key_id: context.apiKeyId || null,
        subscription_tier: context.subscriptionTier,
        user_agent: context.userAgent,
        ip_address: context.ipAddress,
        referrer: context.referrer,
        country_code: context.countryCode,
        request_received_at: new Date(metrics.requestStartTime).toISOString(),
        response_sent_at: new Date(metrics.requestEndTime).toISOString(),
        error_code: errorCode || null,
        error_type: errorType || null,
        is_rate_limited: metrics.isRateLimited || false,
        created_at: new Date().toISOString(),
      };

      // Add to batch queue for performance
      this.usageLogQueue.push(usageLog);

      // Process batch if it's full or enough time has passed
      if (
        this.usageLogQueue.length >= this.BATCH_SIZE ||
        Date.now() - this.lastBatchWrite > this.BATCH_TIMEOUT_MS
      ) {
        await this.processBatchLogs();
      }

      // Clean up metrics buffer
      this.metricsBuffer.delete(requestId);
    } catch (error) {
      console.error('[API Usage] Recording error:', error);
      // Don't throw - logging failures shouldn't break the API
    }
  }

  /**
   * Update Redis rate limit counters for real-time rate limiting
   */
  private async updateRateLimitCounter(
    context: ApiUsageContext,
  ): Promise<void> {
    if (!this.redis) {
      // Fallback to database-only rate limiting
      return this.updateDatabaseRateLimit(context);
    }

    try {
      const currentMinute = Math.floor(Date.now() / 60000);
      const key = `rate_limit:${context.organizationId}:${context.endpoint}:${currentMinute}`;

      // Increment counter with expiration
      const pipeline = this.redis.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, 120); // Keep for 2 minutes
      await pipeline.exec();
    } catch (error) {
      console.error('[API Usage] Redis rate limit update failed:', error);
      // Fallback to database
      await this.updateDatabaseRateLimit(context);
    }
  }

  /**
   * Fallback database rate limit counter update
   */
  private async updateDatabaseRateLimit(
    context: ApiUsageContext,
  ): Promise<void> {
    const currentMinute = new Date();
    currentMinute.setSeconds(0, 0);

    const rateKey = `org:${context.organizationId}:endpoint:${context.endpoint}:minute:${currentMinute.getTime()}`;

    await this.supabase.from('api_rate_limits').upsert(
      {
        organization_id: context.organizationId,
        rate_limit_key: rateKey,
        endpoint: context.endpoint,
        time_window: currentMinute.toISOString(),
        request_count: 1,
        successful_count: 1,
        expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour
      },
      {
        onConflict: 'organization_id,endpoint,time_window',
        count: 'exact',
      },
    );
  }

  /**
   * Log rate limit/quota violations for monitoring
   */
  private async logRateLimitViolation(
    context: ApiUsageContext,
    reason: string,
  ): Promise<void> {
    try {
      // Update metrics to mark as rate limited
      const metrics = this.metricsBuffer.get(context.requestId);
      if (metrics) {
        metrics.isRateLimited = true;
      }

      // Log the violation for analytics
      await this.supabase.from('api_usage_logs').insert({
        organization_id: context.organizationId,
        user_id: context.userId || null,
        endpoint: context.endpoint,
        http_method: context.httpMethod,
        request_id: context.requestId,
        status_code: 429, // Too Many Requests
        response_time_ms: 0,
        api_key_id: context.apiKeyId,
        subscription_tier: context.subscriptionTier,
        user_agent: context.userAgent,
        ip_address: context.ipAddress,
        request_received_at: new Date().toISOString(),
        response_sent_at: new Date().toISOString(),
        error_code: reason,
        error_type: 'RATE_LIMIT_EXCEEDED',
        is_rate_limited: true,
      });
    } catch (error) {
      console.error('[API Usage] Rate limit logging failed:', error);
    }
  }

  /**
   * Batch processor for usage logs to improve performance
   */
  private async processBatchLogs(): Promise<void> {
    if (this.usageLogQueue.length === 0) return;

    const batch = this.usageLogQueue.splice(0, this.BATCH_SIZE);

    try {
      const { error } = await this.supabase
        .from('api_usage_logs')
        .insert(batch);

      if (error) {
        console.error('[API Usage] Batch insert failed:', error);
        // Could implement retry logic here
      }

      this.lastBatchWrite = Date.now();
    } catch (error) {
      console.error('[API Usage] Batch processing error:', error);
    }
  }

  /**
   * Start the batch processor timer
   */
  private startBatchProcessor(): void {
    setInterval(async () => {
      if (Date.now() - this.lastBatchWrite > this.BATCH_TIMEOUT_MS) {
        await this.processBatchLogs();
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Extract geographic information from IP address
   */
  private async getCountryFromIP(ipAddress: string): Promise<string | null> {
    try {
      // Simple IP-based country detection (could use GeoIP service)
      // For now, return null - can be enhanced with external service
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Health check for the usage tracking system
   */
  async healthCheck(): Promise<{ status: string; details: any }> {
    const checks = {
      database: false,
      redis: false,
      queueSize: this.usageLogQueue.length,
      bufferSize: this.metricsBuffer.size,
    };

    try {
      // Test database connection
      const { error: dbError } = await this.supabase
        .from('api_quotas')
        .select('subscription_tier')
        .limit(1);
      checks.database = !dbError;

      // Test Redis connection
      if (this.redis) {
        try {
          await this.redis.ping();
          checks.redis = true;
        } catch {
          checks.redis = false;
        }
      }

      const allHealthy = checks.database && (!this.redis || checks.redis);

      return {
        status: allHealthy ? 'healthy' : 'degraded',
        details: checks,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { ...checks, error: error.message },
      };
    }
  }
}

// Singleton instance for reuse across requests
let trackerInstance: ApiUsageTracker | null = null;

export function getApiUsageTracker(): ApiUsageTracker {
  if (!trackerInstance) {
    trackerInstance = new ApiUsageTracker();
  }
  return trackerInstance;
}

/**
 * Higher-order function to wrap API routes with usage tracking
 */
export function withApiUsageTracking(
  handler: (req: NextRequest, context: any) => Promise<NextResponse>,
) {
  return async (req: NextRequest, context: any = {}): Promise<NextResponse> => {
    const requestId = generateUUID();
    const tracker = getApiUsageTracker();

    // Extract API context from request
    const apiContext: ApiUsageContext = {
      organizationId:
        context.organizationId ||
        req.headers.get('x-organization-id') ||
        'unknown',
      userId: context.userId || req.headers.get('x-user-id'),
      apiKeyId: context.apiKeyId || req.headers.get('x-api-key-id'),
      subscriptionTier: context.subscriptionTier || 'FREE',
      endpoint: new URL(req.url).pathname,
      httpMethod: req.method,
      requestId,
      userAgent: req.headers.get('user-agent'),
      ipAddress: req.ip || req.headers.get('x-forwarded-for') || 'unknown',
      referrer: req.headers.get('referer'),
      countryCode: req.headers.get('cf-ipcountry'), // Cloudflare country header
    };

    // Pre-request validation
    const validationResult = await tracker.validateUsage(apiContext);

    if (!validationResult.allowed) {
      // Return rate limit or quota exceeded response
      const errorResponse = {
        error: true,
        message:
          validationResult.reason === 'RATE_LIMIT_EXCEEDED'
            ? 'Rate limit exceeded. Please try again later.'
            : 'API quota exceeded. Please upgrade your plan or try again tomorrow.',
        code: validationResult.reason,
        rateLimitInfo: validationResult.rateLimitInfo,
        quotaInfo: validationResult.quotaInfo,
      };

      const response = NextResponse.json(errorResponse, { status: 429 });

      // Add rate limit headers
      if (validationResult.rateLimitInfo) {
        response.headers.set(
          'X-RateLimit-Remaining',
          validationResult.rateLimitInfo.remainingRequests.toString(),
        );
        response.headers.set(
          'X-RateLimit-Reset',
          validationResult.rateLimitInfo.resetTime.toISOString(),
        );
      }

      // Record the blocked request
      await tracker.recordUsage(
        apiContext,
        429,
        0,
        0,
        validationResult.reason,
        'QUOTA_EXCEEDED',
      );

      return response;
    }

    // Execute the actual API handler
    let response: NextResponse;
    let statusCode = 200;
    let errorCode: string | undefined;
    let errorType: string | undefined;

    const startTime = Date.now();

    try {
      response = await handler(req, {
        ...context,
        requestId,
        trackingId: validationResult.trackingId,
      });
      statusCode = response.status;
    } catch (error: any) {
      statusCode = error.status || 500;
      errorCode = error.code || 'INTERNAL_ERROR';
      errorType = error.name || 'UnknownError';

      // Create error response
      response = NextResponse.json(
        { error: true, message: 'Internal server error', requestId },
        { status: statusCode },
      );
    }

    const endTime = Date.now();
    const responseTimeMs = endTime - startTime;

    // Estimate response size (rough approximation)
    const responseText = await response.clone().text();
    const responseSizeBytes = new TextEncoder().encode(responseText).length;

    // Post-request logging
    await tracker.recordUsage(
      apiContext,
      statusCode,
      responseTimeMs,
      responseSizeBytes,
      errorCode,
      errorType,
    );

    // Add usage tracking headers to response
    response.headers.set('X-Request-ID', requestId);
    if (validationResult.quotaInfo) {
      response.headers.set(
        'X-Quota-Used',
        validationResult.quotaInfo.dailyUsed.toString(),
      );
      response.headers.set(
        'X-Quota-Limit',
        validationResult.quotaInfo.dailyLimit.toString(),
      );
      response.headers.set(
        'X-Quota-Utilization',
        `${validationResult.quotaInfo.utilization.toFixed(1)}%`,
      );
    }

    return response;
  };
}

// Zod schemas for validation
export const ApiUsageContextSchema = z.object({
  organizationId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  apiKeyId: z.string().uuid().optional(),
  subscriptionTier: z.enum([
    'FREE',
    'STARTER',
    'PROFESSIONAL',
    'SCALE',
    'ENTERPRISE',
  ]),
  endpoint: z.string().max(500),
  httpMethod: z.enum([
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS',
    'HEAD',
  ]),
  requestId: z.string().uuid(),
  userAgent: z.string().max(1000).optional(),
  ipAddress: z.string().max(45).optional(),
  referrer: z.string().max(2000).optional(),
  countryCode: z.string().length(2).optional(),
});

export const UsageMetricsSchema = z.object({
  requestStartTime: z.number(),
  requestEndTime: z.number().optional(),
  responseTimeMs: z.number().min(0).optional(),
  statusCode: z.number().int().min(100).max(599).optional(),
  responseSizeBytes: z.number().min(0).optional(),
  errorCode: z.string().max(100).optional(),
  errorType: z.string().max(50).optional(),
  isRateLimited: z.boolean().optional(),
});

export default ApiUsageTracker;
