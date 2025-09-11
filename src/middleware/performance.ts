/**
 * Performance Monitoring Middleware
 * Tracks API response times, request/response sizes, and performance metrics
 * FEATURE: WS-104 - Performance Monitoring Backend Infrastructure
 */

import { NextRequest, NextResponse } from 'next/server';
// SENIOR CODE REVIEWER FIX: Use relative imports to avoid path resolution issues
import { metrics } from '../lib/monitoring/metrics';
import { logger } from '../lib/monitoring/structured-logger';

interface PerformanceContext {
  requestId: string;
  startTime: number;
  endpoint: string;
  method: string;
  userAgent?: string;
  userId?: string;
  weddingContext?: {
    clientId?: string;
    vendorId?: string;
    weddingDate?: string;
  };
}

interface PerformanceMetrics {
  responseTime: number;
  requestSize: number;
  responseSize: number;
  statusCode: number;
  errorMessage?: string;
  dbQueries?: number;
  cacheHits?: number;
  cacheMisses?: number;
}

class PerformanceTracker {
  private activeRequests = new Map<string, PerformanceContext>();
  private requestIdCounter = 0;

  generateRequestId(): string {
    return `perf_${Date.now()}_${++this.requestIdCounter}`;
  }

  startTracking(request: NextRequest): string {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    // Extract endpoint from URL
    const url = new URL(request.url);
    const endpoint = url.pathname;

    // Extract user context from headers or cookies
    const userId = this.extractUserId(request);
    const weddingContext = this.extractWeddingContext(request);

    const context: PerformanceContext = {
      requestId,
      startTime,
      endpoint,
      method: request.method,
      userAgent: request.headers.get('user-agent') || undefined,
      userId,
      weddingContext,
    };

    this.activeRequests.set(requestId, context);

    // Track request start
    metrics.incrementCounter('performance.requests.started', 1, {
      endpoint,
      method: request.method,
      hasUser: userId ? 'true' : 'false',
    });

    logger.debug('Performance tracking started', {
      requestId,
      endpoint,
      method: request.method,
      userId,
    });

    return requestId;
  }

  endTracking(requestId: string, response: NextResponse): void {
    const context = this.activeRequests.get(requestId);
    if (!context) {
      logger.warn('Performance tracking context not found', { requestId });
      return;
    }

    const endTime = Date.now();
    const responseTime = endTime - context.startTime;

    // Calculate sizes
    const requestSize = this.calculateRequestSize(context);
    const responseSize = this.calculateResponseSize(response);

    const performanceMetrics: PerformanceMetrics = {
      responseTime,
      requestSize,
      responseSize,
      statusCode: response.status,
      errorMessage:
        response.status >= 400 ? this.extractErrorMessage(response) : undefined,
    };

    // Record metrics
    this.recordMetrics(context, performanceMetrics);

    // Log performance data
    this.logPerformance(context, performanceMetrics);

    // Check for performance violations
    this.checkPerformanceBudgets(context, performanceMetrics);

    // Store in database for analysis
    this.storePerformanceData(context, performanceMetrics);

    // Clean up
    this.activeRequests.delete(requestId);
  }

  private extractUserId(request: NextRequest): string | undefined {
    // Try to extract user ID from various sources
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      // Extract from JWT or session token
      try {
        // This would be implemented based on your auth system
        // For now, return undefined
        return undefined;
      } catch (error) {
        // Invalid auth header
      }
    }

    // Try cookies
    const sessionCookie = request.cookies.get('session')?.value;
    if (sessionCookie) {
      // Extract from session cookie
      // Implementation depends on your session system
    }

    return undefined;
  }

  private extractWeddingContext(
    request: NextRequest,
  ): PerformanceContext['weddingContext'] {
    const url = new URL(request.url);

    // Extract wedding-related IDs from URL patterns
    const clientIdMatch = url.pathname.match(/\/clients\/([^/]+)/);
    const vendorIdMatch = url.pathname.match(/\/vendors\/([^/]+)/);

    // Extract from headers
    const weddingDate = request.headers.get('x-wedding-date') || undefined;

    if (clientIdMatch || vendorIdMatch || weddingDate) {
      return {
        clientId: clientIdMatch?.[1],
        vendorId: vendorIdMatch?.[1],
        weddingDate,
      };
    }

    return undefined;
  }

  private calculateRequestSize(context: PerformanceContext): number {
    // Approximate request size based on headers and URL
    // This is a rough estimate since we don't have access to body in middleware
    let size = 0;

    // URL size
    size += context.endpoint.length;

    // Method size
    size += context.method.length;

    // Estimate for headers (rough approximation)
    size += 500; // Average header size

    return size;
  }

  private calculateResponseSize(response: NextResponse): number {
    // Try to get content length from headers
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      return parseInt(contentLength, 10);
    }

    // If no content-length, estimate based on status
    if (response.status >= 400) {
      return 100; // Error responses are typically small
    }

    return 1000; // Default estimate for successful responses
  }

  private extractErrorMessage(response: NextResponse): string | undefined {
    // This would need to be implemented based on your error response format
    // For middleware, we don't have easy access to response body
    return `HTTP ${response.status}`;
  }

  private recordMetrics(
    context: PerformanceContext,
    metrics_data: PerformanceMetrics,
  ): void {
    const labels = {
      endpoint: context.endpoint,
      method: context.method,
      status_code: metrics_data.statusCode.toString(),
      has_wedding_context: context.weddingContext ? 'true' : 'false',
    };

    // Response time histogram
    metrics.recordHistogram(
      'performance.response_time',
      metrics_data.responseTime,
      labels,
    );

    // Request/response size metrics
    metrics.recordHistogram(
      'performance.request_size',
      metrics_data.requestSize,
      labels,
    );
    metrics.recordHistogram(
      'performance.response_size',
      metrics_data.responseSize,
      labels,
    );

    // Error rate tracking
    if (metrics_data.statusCode >= 400) {
      metrics.incrementCounter('performance.errors', 1, {
        ...labels,
        error_type: this.categorizeError(metrics_data.statusCode),
      });
    }

    // Success rate tracking
    metrics.incrementCounter('performance.requests.completed', 1, labels);

    // Wedding business context metrics
    if (context.weddingContext) {
      metrics.recordHistogram(
        'performance.wedding_requests.response_time',
        metrics_data.responseTime,
        {
          endpoint: context.endpoint,
          has_client: context.weddingContext.clientId ? 'true' : 'false',
          has_vendor: context.weddingContext.vendorId ? 'true' : 'false',
        },
      );
    }

    // Track slow requests (over 1 second)
    if (metrics_data.responseTime > 1000) {
      metrics.incrementCounter('performance.slow_requests', 1, labels);
    }

    // Track very slow requests (over 5 seconds)
    if (metrics_data.responseTime > 5000) {
      metrics.incrementCounter('performance.very_slow_requests', 1, labels);
    }
  }

  private logPerformance(
    context: PerformanceContext,
    metrics_data: PerformanceMetrics,
  ): void {
    const logLevel = this.determineLogLevel(metrics_data);

    const logData = {
      requestId: context.requestId,
      endpoint: context.endpoint,
      method: context.method,
      responseTime: metrics_data.responseTime,
      statusCode: metrics_data.statusCode,
      requestSize: metrics_data.requestSize,
      responseSize: metrics_data.responseSize,
      userAgent: context.userAgent,
      userId: context.userId,
      weddingContext: context.weddingContext,
      errorMessage: metrics_data.errorMessage,
    };

    switch (logLevel) {
      case 'error':
        logger.error(
          'API Performance - Error Response',
          new Error(metrics_data.errorMessage || 'Unknown error'),
          logData,
        );
        break;
      case 'warn':
        logger.warn('API Performance - Slow Response', logData);
        break;
      case 'info':
        logger.info('API Performance - Request Completed', logData);
        break;
      default:
        logger.debug('API Performance - Request Completed', logData);
    }
  }

  private determineLogLevel(
    metrics_data: PerformanceMetrics,
  ): 'error' | 'warn' | 'info' | 'debug' {
    if (metrics_data.statusCode >= 500) {
      return 'error';
    }
    if (metrics_data.statusCode >= 400) {
      return 'warn';
    }
    if (metrics_data.responseTime > 2000) {
      return 'warn';
    }
    if (metrics_data.responseTime > 1000) {
      return 'info';
    }
    return 'debug';
  }

  private categorizeError(statusCode: number): string {
    if (statusCode >= 500) return 'server_error';
    if (statusCode >= 400) return 'client_error';
    return 'unknown';
  }

  private checkPerformanceBudgets(
    context: PerformanceContext,
    metrics_data: PerformanceMetrics,
  ): void {
    const budgets = this.getPerformanceBudgets(context.endpoint);

    for (const [metric, budget] of Object.entries(budgets)) {
      const value = metrics_data[metric as keyof PerformanceMetrics] as number;

      if (value > budget) {
        logger.warn('Performance budget exceeded', {
          requestId: context.requestId,
          endpoint: context.endpoint,
          metric,
          value,
          budget,
          exceedBy: value - budget,
        });

        metrics.incrementCounter('performance.budget_violations', 1, {
          endpoint: context.endpoint,
          metric,
        });

        // Trigger alert for critical endpoints
        if (this.isCriticalEndpoint(context.endpoint)) {
          this.triggerPerformanceAlert(context, metric, value, budget);
        }
      }
    }
  }

  private getPerformanceBudgets(endpoint: string): Record<string, number> {
    // Define performance budgets by endpoint pattern
    const budgets: Record<string, Record<string, number>> = {
      '/api/clients': { responseTime: 800, responseSize: 50000 },
      '/api/vendors': { responseTime: 800, responseSize: 50000 },
      '/api/rsvp': { responseTime: 500, responseSize: 10000 },
      '/api/photos': { responseTime: 2000, responseSize: 100000 },
      '/api/documents': { responseTime: 3000, responseSize: 500000 },
      '/api/analytics': { responseTime: 2000, responseSize: 50000 },
      default: { responseTime: 1000, responseSize: 25000 },
    };

    // Find matching budget
    for (const [pattern, budget] of Object.entries(budgets)) {
      if (pattern === 'default') continue;
      if (endpoint.startsWith(pattern)) {
        return budget;
      }
    }

    return budgets.default;
  }

  private isCriticalEndpoint(endpoint: string): boolean {
    const criticalPatterns = [
      '/api/rsvp',
      '/api/clients',
      '/api/vendors',
      '/api/wedding-website',
      '/api/auth',
      '/api/health',
    ];

    return criticalPatterns.some((pattern) => endpoint.startsWith(pattern));
  }

  private triggerPerformanceAlert(
    context: PerformanceContext,
    metric: string,
    value: number,
    budget: number,
  ): void {
    // This would integrate with your alerting system
    logger.error(
      'Critical performance violation',
      new Error('Performance budget exceeded'),
      {
        requestId: context.requestId,
        endpoint: context.endpoint,
        metric,
        value,
        budget,
        severity: 'high',
        weddingImpact: this.assessWeddingImpact(context),
      },
    );
  }

  private assessWeddingImpact(context: PerformanceContext): string {
    if (!context.weddingContext) {
      return 'none';
    }

    // Assess impact based on wedding timing
    if (context.weddingContext.weddingDate) {
      const weddingDate = new Date(context.weddingContext.weddingDate);
      const now = new Date();
      const daysUntilWedding = Math.ceil(
        (weddingDate.getTime() - now.getTime()) / (1000 * 3600 * 24),
      );

      if (daysUntilWedding <= 7) {
        return 'critical';
      }
      if (daysUntilWedding <= 30) {
        return 'high';
      }
      return 'medium';
    }

    return 'medium';
  }

  private async storePerformanceData(
    context: PerformanceContext,
    metrics_data: PerformanceMetrics,
  ): Promise<void> {
    try {
      // Store performance data in database for analysis
      // This would use your database connection
      const performanceRecord = {
        request_id: context.requestId,
        endpoint: context.endpoint,
        method: context.method,
        response_time: metrics_data.responseTime,
        status_code: metrics_data.statusCode,
        request_size: metrics_data.requestSize,
        response_size: metrics_data.responseSize,
        user_id: context.userId,
        client_id: context.weddingContext?.clientId,
        vendor_id: context.weddingContext?.vendorId,
        wedding_date: context.weddingContext?.weddingDate,
        user_agent: context.userAgent,
        error_message: metrics_data.errorMessage,
        timestamp: new Date(),
      };

      // In a real implementation, you would save this to your database
      logger.debug('Performance data recorded', performanceRecord);
    } catch (error) {
      logger.error('Failed to store performance data', error as Error, {
        requestId: context.requestId,
        endpoint: context.endpoint,
      });
    }
  }
}

// Global performance tracker instance
const performanceTracker = new PerformanceTracker();

// Middleware function for Next.js
export function performanceMiddleware(request: NextRequest): NextResponse {
  // Start performance tracking
  const requestId = performanceTracker.startTracking(request);

  // Continue with the request
  const response = NextResponse.next();

  // Add request ID to response headers for debugging
  response.headers.set('x-request-id', requestId);
  response.headers.set('x-performance-tracked', 'true');

  // Note: In Next.js middleware, we can't easily track the end of the request
  // This would need to be handled in API routes or with a custom server
  // For now, we'll set up the tracking infrastructure

  return response;
}

// Utility function for API routes to end tracking
export function endPerformanceTracking(
  requestId: string,
  response: NextResponse,
): void {
  performanceTracker.endTracking(requestId, response);
}

// Higher-order function for API route handlers
export function withPerformanceTracking<T extends unknown[], R>(
  handler: (...args: T) => Promise<R>,
  handlerName: string,
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    const requestId = performanceTracker.generateRequestId();

    try {
      logger.info('API handler started', {
        requestId,
        handler: handlerName,
      });

      const result = await handler(...args);

      const duration = Date.now() - startTime;

      metrics.recordHistogram('api.handler.duration', duration, {
        handler: handlerName,
        status: 'success',
      });

      logger.info('API handler completed', {
        requestId,
        handler: handlerName,
        duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      metrics.recordHistogram('api.handler.duration', duration, {
        handler: handlerName,
        status: 'error',
      });

      metrics.incrementCounter('api.handler.errors', 1, {
        handler: handlerName,
      });

      logger.error('API handler failed', error as Error, {
        requestId,
        handler: handlerName,
        duration,
      });

      throw error;
    }
  };
}

export { performanceTracker };
