/**
 * WS-233 API Usage Monitoring - Server-Side Tracking Hooks
 * Team C Integration: Server-side utilities for API tracking in API routes and server components
 * Provides middleware and utilities for Next.js API routes and server actions
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import {
  apiUsageTracker,
  type APIService,
} from '@/lib/monitoring/api-usage-tracker';
import { RequestScopedMonitoring } from '@/lib/monitoring/middleware/api-monitoring-middleware';
import { logger } from '@/lib/monitoring/edge-logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * API Route Middleware for automatic usage tracking
 */
export interface APIRouteTrackingOptions {
  organizationId?: string;
  userId?: string;
  apiService: APIService;
  endpoint?: string;
  trackRequest?: boolean;
  trackResponse?: boolean;
  estimatedCost?: number;
}

/**
 * Higher-order function to wrap API routes with usage tracking
 */
export function withAPITracking(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: APIRouteTrackingOptions,
) {
  return async function trackedHandler(
    req: NextRequest,
  ): Promise<NextResponse> {
    const requestId = uuidv4();
    const startTime = Date.now();

    // Extract organization and user from request
    const organizationId = options.organizationId || extractOrganizationId(req);
    const userId = options.userId || extractUserId(req);
    const endpoint = options.endpoint || extractEndpoint(req);

    if (!organizationId) {
      logger.warn('No organization ID found for API tracking', {
        requestId,
        endpoint,
        path: req.nextUrl.pathname,
      });
      return handler(req);
    }

    try {
      // Pre-flight checks if estimated cost is provided
      if (options.estimatedCost) {
        const limitCheck = await apiUsageTracker.checkUsageLimits(
          organizationId,
          options.apiService,
          endpoint,
          options.estimatedCost,
        );

        if (!limitCheck.allowed) {
          logger.warn('API usage blocked by limits', {
            organizationId,
            userId,
            requestId,
            apiService: options.apiService,
            endpoint,
            warnings: limitCheck.warnings,
          });

          return NextResponse.json(
            {
              error: 'API usage limit exceeded',
              message: limitCheck.warnings.join(', '),
              retryAfter: 3600, // 1 hour
            },
            { status: 429 },
          );
        }
      }

      // Execute the handler with monitoring context
      const monitoring = new RequestScopedMonitoring(organizationId, userId);
      const response = await monitoring.withMonitoring(async () => {
        return handler(req);
      });

      const duration = Date.now() - startTime;

      // Track the API route usage
      await trackServerSideUsage({
        organizationId,
        userId,
        requestId,
        apiService: options.apiService,
        endpoint,
        method: req.method,
        duration,
        statusCode: response.status,
        requestSize: await calculateRequestSize(req),
        responseSize: calculateResponseSize(response),
      });

      logger.info('API route tracked successfully', {
        organizationId,
        userId,
        requestId,
        apiService: options.apiService,
        endpoint,
        method: req.method,
        statusCode: response.status,
        duration,
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Track failed request
      await trackServerSideUsage({
        organizationId,
        userId,
        requestId,
        apiService: options.apiService,
        endpoint,
        method: req.method,
        duration,
        statusCode: 500,
        error: error.message,
      });

      logger.error('API route failed', {
        organizationId,
        userId,
        requestId,
        apiService: options.apiService,
        endpoint,
        method: req.method,
        duration,
        error: error.message,
      });

      throw error;
    }
  };
}

/**
 * Server Action wrapper for usage tracking
 */
export function withServerActionTracking<T extends any[], R>(
  action: (...args: T) => Promise<R>,
  options: APIRouteTrackingOptions,
) {
  return async function trackedServerAction(...args: T): Promise<R> {
    const requestId = uuidv4();
    const startTime = Date.now();

    // Get organization/user context from headers or args
    const organizationId =
      options.organizationId || (await extractOrganizationIdFromHeaders());
    const userId = options.userId || (await extractUserIdFromHeaders());
    const endpoint = options.endpoint || 'server-action';

    if (!organizationId) {
      logger.warn('No organization ID found for server action tracking', {
        requestId,
        endpoint,
        actionName: action.name,
      });
      return action(...args);
    }

    try {
      // Pre-flight checks
      if (options.estimatedCost) {
        const limitCheck = await apiUsageTracker.checkUsageLimits(
          organizationId,
          options.apiService,
          endpoint,
          options.estimatedCost,
        );

        if (!limitCheck.allowed) {
          throw new Error(
            `API usage limit exceeded: ${limitCheck.warnings.join(', ')}`,
          );
        }
      }

      // Execute action with monitoring
      const monitoring = new RequestScopedMonitoring(organizationId, userId);
      const result = await monitoring.withMonitoring(async () => {
        return action(...args);
      });

      const duration = Date.now() - startTime;

      // Track the server action usage
      await trackServerSideUsage({
        organizationId,
        userId,
        requestId,
        apiService: options.apiService,
        endpoint,
        method: 'SERVER_ACTION',
        duration,
        statusCode: 200,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      await trackServerSideUsage({
        organizationId,
        userId,
        requestId,
        apiService: options.apiService,
        endpoint,
        method: 'SERVER_ACTION',
        duration,
        statusCode: 500,
        error: error.message,
      });

      throw error;
    }
  };
}

/**
 * Manual tracking for server-side operations
 */
export async function trackServerSideAPIUsage(
  organizationId: string,
  apiService: APIService,
  endpoint: string,
  cost: number,
  metadata?: Record<string, any>,
  userId?: string,
): Promise<void> {
  const requestId = uuidv4();

  try {
    await apiUsageTracker.trackAPIUsage({
      apiService,
      endpoint,
      method: 'SERVER',
      requestId,
      organizationId,
      userId,
      duration: 0,
      statusCode: 200,
      metadata: { ...metadata, serverSideTracking: true },
    });

    logger.info('Server-side API usage tracked', {
      organizationId,
      userId,
      requestId,
      apiService,
      endpoint,
      cost,
    });
  } catch (error) {
    logger.error('Failed to track server-side API usage', {
      organizationId,
      userId,
      requestId,
      apiService,
      endpoint,
      error: error.message,
    });
  }
}

/**
 * Budget check for server-side operations
 */
export async function checkServerSideBudgetLimits(
  organizationId: string,
  apiService: APIService,
  endpoint: string,
  estimatedCost: number = 0,
): Promise<{ allowed: boolean; warnings: string[] }> {
  try {
    const limitCheck = await apiUsageTracker.checkUsageLimits(
      organizationId,
      apiService,
      endpoint,
      estimatedCost,
    );

    return {
      allowed: limitCheck.allowed,
      warnings: limitCheck.warnings,
    };
  } catch (error) {
    logger.error('Failed to check server-side budget limits', {
      organizationId,
      apiService,
      endpoint,
      error: error.message,
    });

    // Return conservative response on error
    return {
      allowed: true,
      warnings: ['Unable to verify limits - proceeding with caution'],
    };
  }
}

/**
 * Get usage analytics for server-side dashboard
 */
export async function getServerSideUsageAnalytics(
  organizationId: string,
  dateRange: { start: Date; end: Date },
  apiService?: APIService,
) {
  try {
    return await apiUsageTracker.getUsageAnalytics(
      organizationId,
      dateRange,
      apiService,
    );
  } catch (error) {
    logger.error('Failed to get server-side usage analytics', {
      organizationId,
      apiService,
      dateRange,
      error: error.message,
    });
    return null;
  }
}

/**
 * Set budget limits from server-side
 */
export async function setServerSideBudgetLimits(
  organizationId: string,
  apiService: APIService,
  monthlyLimit: number,
  warningThreshold: number = 80,
  criticalThreshold: number = 95,
): Promise<void> {
  try {
    await apiUsageTracker.setBudget({
      organizationId,
      apiService,
      monthlyLimit,
      currentUsage: 0, // Will be calculated automatically
      warningThreshold,
      criticalThreshold,
      isActive: true,
      notificationsSent: 0,
      lastResetAt: new Date(),
    });

    logger.info('Budget limits set from server-side', {
      organizationId,
      apiService,
      monthlyLimit,
      warningThreshold,
      criticalThreshold,
    });
  } catch (error) {
    logger.error('Failed to set server-side budget limits', {
      organizationId,
      apiService,
      monthlyLimit,
      error: error.message,
    });
    throw error;
  }
}

// Private helper functions

async function trackServerSideUsage(params: {
  organizationId: string;
  userId?: string;
  requestId: string;
  apiService: APIService;
  endpoint: string;
  method: string;
  duration: number;
  statusCode: number;
  requestSize?: number;
  responseSize?: number;
  error?: string;
}): Promise<void> {
  try {
    // Calculate cost based on service type and usage
    let cost = 0;
    const metadata: Record<string, any> = {
      serverSideTracking: true,
    };

    if (params.error) {
      metadata.error = params.error;
    }

    // Simple cost estimation for server-side tracking
    switch (params.apiService) {
      case 'openai':
        cost = 0.001; // Small default for server operations
        break;
      case 'supabase':
        cost = 0.00000125; // Database operation cost
        break;
      case 'resend':
        cost = 0.0004; // Single email cost
        break;
      case 'twilio':
        cost = 0.0075; // Single SMS cost
        break;
      case 'vercel':
        cost = 0.0000002; // Function invocation cost
        break;
    }

    await apiUsageTracker.trackAPIUsage({
      apiService: params.apiService,
      endpoint: params.endpoint,
      method: params.method,
      requestId: params.requestId,
      organizationId: params.organizationId,
      userId: params.userId,
      requestSize: params.requestSize,
      responseSize: params.responseSize,
      duration: params.duration,
      statusCode: params.statusCode,
      metadata,
    });
  } catch (error) {
    logger.error('Failed to track server-side usage', {
      requestId: params.requestId,
      error: error.message,
    });
  }
}

function extractOrganizationId(req: NextRequest): string | undefined {
  // Try to get from headers, query params, or auth token
  const orgHeader = req.headers.get('x-organization-id');
  if (orgHeader) return orgHeader;

  const url = new URL(req.url);
  const orgParam = url.searchParams.get('organizationId');
  if (orgParam) return orgParam;

  // Could also extract from JWT token or session
  return undefined;
}

function extractUserId(req: NextRequest): string | undefined {
  // Try to get from headers or auth token
  const userHeader = req.headers.get('x-user-id');
  if (userHeader) return userHeader;

  // Could also extract from JWT token or session
  return undefined;
}

function extractEndpoint(req: NextRequest): string {
  const url = new URL(req.url);
  return url.pathname;
}

async function extractOrganizationIdFromHeaders(): Promise<string | undefined> {
  try {
    const headersList = await headers();
    return headersList.get('x-organization-id') || undefined;
  } catch {
    return undefined;
  }
}

async function extractUserIdFromHeaders(): Promise<string | undefined> {
  try {
    const headersList = await headers();
    return headersList.get('x-user-id') || undefined;
  } catch {
    return undefined;
  }
}

async function calculateRequestSize(req: NextRequest): Promise<number> {
  try {
    if (!req.body) return 0;

    const clone = req.clone();
    const text = await clone.text();
    return text.length;
  } catch {
    return 0;
  }
}

function calculateResponseSize(response: NextResponse): number {
  try {
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      return parseInt(contentLength, 10);
    }
    return 0;
  } catch {
    return 0;
  }
}

/**
 * Utility functions for common server-side API tracking scenarios
 */

// OpenAI tracking for server-side
export async function trackServerOpenAI(
  organizationId: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  userId?: string,
): Promise<void> {
  let cost = 0;

  switch (model) {
    case 'gpt-4':
    case 'gpt-4-vision-preview':
      cost = inputTokens * 0.00003 + outputTokens * 0.00006;
      break;
    case 'gpt-3.5-turbo':
      cost = inputTokens * 0.0000015 + outputTokens * 0.000002;
      break;
    default:
      cost = inputTokens * 0.00003 + outputTokens * 0.00006;
  }

  await trackServerSideAPIUsage(
    organizationId,
    'openai',
    '/chat/completions',
    cost,
    {
      model,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    },
    userId,
  );
}

// Resend tracking for server-side
export async function trackServerEmail(
  organizationId: string,
  emailCount: number = 1,
  userId?: string,
): Promise<void> {
  const cost = emailCount * 0.0004;

  await trackServerSideAPIUsage(
    organizationId,
    'resend',
    '/emails',
    cost,
    { emailCount },
    userId,
  );
}

// Twilio tracking for server-side
export async function trackServerSMS(
  organizationId: string,
  segments: number = 1,
  isInternational: boolean = false,
  userId?: string,
): Promise<void> {
  const costPerSegment = isInternational ? 0.05 : 0.0075;
  const cost = segments * costPerSegment;

  await trackServerSideAPIUsage(
    organizationId,
    'twilio',
    '/Messages',
    cost,
    { messageType: 'sms', segments, isInternational },
    userId,
  );
}

// Supabase tracking for server-side
export async function trackServerDatabase(
  organizationId: string,
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
  rowCount: number = 1,
  table?: string,
  userId?: string,
): Promise<void> {
  const cost = Math.ceil(rowCount / 1000) * 0.00000125;

  await trackServerSideAPIUsage(
    organizationId,
    'supabase',
    `/db/${table || 'unknown'}`,
    cost,
    { operationType: 'database', operation, rowCount },
    userId,
  );
}
