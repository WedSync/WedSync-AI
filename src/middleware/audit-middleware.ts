/**
 * High-Performance Audit Middleware
 * Team C - WS-150 Implementation
 *
 * Features:
 * - Automatic request/response logging with <10ms overhead
 * - Context enrichment for comprehensive audit trails
 * - Performance metrics collection and monitoring
 * - Error boundary audit logging
 * - Intelligent filtering to reduce noise
 * - Asynchronous processing for minimal request impact
 * - Memory-efficient event buffering
 */

import { NextRequest, NextResponse } from 'next/server';
// SENIOR CODE REVIEWER FIX: Corrected import paths to match actual file structure
import { logger } from '@/lib/monitoring/logger';
import {
  auditStreamServer,
  AuditStreamEvent,
} from '@/lib/websocket/audit-stream';
import { auditExternalServices } from '@/lib/integrations/audit-external-services';

// Performance tracking
interface RequestMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage?: NodeJS.MemoryUsage;
  cpuTime?: number;
}

interface AuditContext {
  requestId: string;
  userId?: string;
  sessionId?: string;
  orgId?: string;
  ipAddress?: string;
  userAgent?: string;
  path: string;
  method: string;
  metrics: RequestMetrics;
}

// Configuration for audit filtering
interface AuditMiddlewareConfig {
  enablePerformanceMetrics: boolean;
  logAllRequests: boolean;
  sensitiveEndpoints: string[];
  excludeEndpoints: string[];
  performanceThresholds: {
    slowRequest: number;
    memoryUsage: number;
    responseSize: number;
  };
  sampling: {
    rate: number; // 0.0 to 1.0, percentage of requests to audit
    highValueEndpoints: string[]; // Always audit these endpoints
  };
}

// Default configuration
const DEFAULT_CONFIG: AuditMiddlewareConfig = {
  enablePerformanceMetrics: true,
  logAllRequests: false,
  sensitiveEndpoints: [
    '/api/auth',
    '/api/payments',
    '/api/billing',
    '/api/admin',
    '/api/clients',
    '/api/suppliers',
    '/api/api-keys',
  ],
  excludeEndpoints: [
    '/api/health',
    '/favicon.ico',
    '/_next/static',
    '/_next/image',
  ],
  performanceThresholds: {
    slowRequest: 2000, // 2 seconds
    memoryUsage: 100 * 1024 * 1024, // 100MB
    responseSize: 10 * 1024 * 1024, // 10MB
  },
  sampling: {
    rate: 0.1, // 10% of requests
    highValueEndpoints: [
      '/api/auth',
      '/api/payments',
      '/api/admin',
      '/api/api-keys',
    ],
  },
};

/**
 * High-performance audit middleware class
 */
export class AuditMiddleware {
  private config: AuditMiddlewareConfig;
  private metricsBuffer: Map<string, RequestMetrics> = new Map();
  private processingQueue: AuditStreamEvent[] = [];
  private isProcessing = false;

  constructor(config: AuditMiddlewareConfig = DEFAULT_CONFIG) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startBackgroundProcessor();
  }

  /**
   * Main middleware function for Next.js
   */
  public async processRequest(request: NextRequest): Promise<{
    context: AuditContext;
    response?: NextResponse;
  }> {
    const startTime = performance.now();
    const requestId = this.generateRequestId();

    // Quick path exclusion check
    if (this.shouldExcludeRequest(request)) {
      return {
        context: this.createMinimalContext(requestId, request, startTime),
      };
    }

    // Create audit context
    const context = await this.createAuditContext(
      requestId,
      request,
      startTime,
    );

    // Store metrics for later processing
    this.metricsBuffer.set(requestId, context.metrics);

    // Log request start (async, non-blocking)
    this.queueAuditEvent(this.createRequestStartEvent(context));

    return { context };
  }

  /**
   * Process response and finalize audit logging
   */
  public async processResponse(
    context: AuditContext,
    response: NextResponse,
    error?: Error,
  ): Promise<void> {
    const endTime = performance.now();
    const duration = endTime - context.metrics.startTime;

    // Update metrics
    context.metrics.endTime = endTime;
    context.metrics.duration = duration;

    if (this.config.enablePerformanceMetrics) {
      context.metrics.memoryUsage = process.memoryUsage();
    }

    // Check for performance anomalies
    const performanceIssues = this.detectPerformanceIssues(context, response);

    // Create response audit event
    const responseEvent = this.createResponseEvent(
      context,
      response,
      error,
      performanceIssues,
    );

    // Queue for async processing
    this.queueAuditEvent(responseEvent);

    // Clean up metrics buffer
    this.metricsBuffer.delete(context.requestId);
  }

  /**
   * Create audit context with user and session information
   */
  private async createAuditContext(
    requestId: string,
    request: NextRequest,
    startTime: number,
  ): Promise<AuditContext> {
    // Extract user context from headers or cookies
    const userId = this.extractUserId(request);
    const sessionId = this.extractSessionId(request);
    const orgId = this.extractOrgId(request);

    return {
      requestId,
      userId,
      sessionId,
      orgId,
      ipAddress: this.getClientIP(request),
      userAgent: request.headers.get('user-agent') || undefined,
      path: request.nextUrl.pathname,
      method: request.method,
      metrics: {
        startTime,
        memoryUsage: this.config.enablePerformanceMetrics
          ? process.memoryUsage()
          : undefined,
      },
    };
  }

  /**
   * Create minimal context for excluded requests
   */
  private createMinimalContext(
    requestId: string,
    request: NextRequest,
    startTime: number,
  ): AuditContext {
    return {
      requestId,
      path: request.nextUrl.pathname,
      method: request.method,
      metrics: { startTime },
    };
  }

  /**
   * Create request start audit event
   */
  private createRequestStartEvent(context: AuditContext): AuditStreamEvent {
    return {
      id: `${context.requestId}-start`,
      type: 'system',
      severity: 'low',
      timestamp: new Date().toISOString(),
      source: 'audit-middleware',
      event: {
        event_type: 'request_start',
        request_id: context.requestId,
        user_id: context.userId,
        session_id: context.sessionId,
        org_id: context.orgId,
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        path: context.path,
        method: context.method,
        start_time: context.metrics.startTime,
        memory_usage: context.metrics.memoryUsage,
      },
      metadata: {
        is_sensitive_endpoint: this.isSensitiveEndpoint(context.path),
        middleware_version: '1.0.0',
      },
    };
  }

  /**
   * Create response audit event
   */
  private createResponseEvent(
    context: AuditContext,
    response: NextResponse,
    error?: Error,
    performanceIssues?: string[],
  ): AuditStreamEvent {
    const severity = this.determineSeverity(
      context,
      response,
      error,
      performanceIssues,
    );

    return {
      id: `${context.requestId}-end`,
      type: error ? 'system' : 'system',
      severity,
      timestamp: new Date().toISOString(),
      source: 'audit-middleware',
      event: {
        event_type: error ? 'request_error' : 'request_complete',
        request_id: context.requestId,
        user_id: context.userId,
        session_id: context.sessionId,
        org_id: context.orgId,
        ip_address: context.ipAddress,
        path: context.path,
        method: context.method,
        status_code: response.status,
        duration_ms: context.metrics.duration,
        memory_usage: context.metrics.memoryUsage,
        response_size: this.getResponseSize(response),
        error: error
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
          : undefined,
        performance_issues: performanceIssues,
      },
      metadata: {
        is_slow_request:
          (context.metrics.duration || 0) >
          this.config.performanceThresholds.slowRequest,
        is_sensitive_endpoint: this.isSensitiveEndpoint(context.path),
        has_performance_issues: (performanceIssues?.length || 0) > 0,
      },
    };
  }

  /**
   * Detect performance issues
   */
  private detectPerformanceIssues(
    context: AuditContext,
    response: NextResponse,
  ): string[] {
    const issues: string[] = [];
    const { performanceThresholds } = this.config;

    // Check request duration
    if ((context.metrics.duration || 0) > performanceThresholds.slowRequest) {
      issues.push(`slow_request:${context.metrics.duration}ms`);
    }

    // Check memory usage
    if (
      context.metrics.memoryUsage?.heapUsed &&
      context.metrics.memoryUsage.heapUsed > performanceThresholds.memoryUsage
    ) {
      issues.push(
        `high_memory_usage:${Math.round(context.metrics.memoryUsage.heapUsed / 1024 / 1024)}MB`,
      );
    }

    // Check response size
    const responseSize = this.getResponseSize(response);
    if (responseSize > performanceThresholds.responseSize) {
      issues.push(`large_response:${Math.round(responseSize / 1024 / 1024)}MB`);
    }

    return issues;
  }

  /**
   * Determine event severity based on context
   */
  private determineSeverity(
    context: AuditContext,
    response: NextResponse,
    error?: Error,
    performanceIssues?: string[],
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Critical: Authentication failures, authorization errors
    if (response.status === 401 || response.status === 403) {
      return 'critical';
    }

    // High: Server errors, significant performance issues
    if (
      response.status >= 500 ||
      error ||
      (performanceIssues?.length || 0) > 2
    ) {
      return 'high';
    }

    // Medium: Client errors, minor performance issues
    if (response.status >= 400 || (performanceIssues?.length || 0) > 0) {
      return 'medium';
    }

    // Low: Normal operations
    return 'low';
  }

  /**
   * Queue audit event for async processing
   */
  private queueAuditEvent(event: AuditStreamEvent): void {
    // Apply sampling if not a high-value endpoint
    if (
      !this.shouldAlwaysAudit(event) &&
      Math.random() > this.config.sampling.rate
    ) {
      return;
    }

    this.processingQueue.push(event);

    // Trigger processing if queue is getting full
    if (this.processingQueue.length >= 50) {
      this.processQueuedEvents();
    }
  }

  /**
   * Start background processor for queued events
   */
  private startBackgroundProcessor(): void {
    setInterval(() => {
      if (this.processingQueue.length > 0) {
        this.processQueuedEvents();
      }
    }, 1000); // Process every second
  }

  /**
   * Process queued audit events
   */
  private async processQueuedEvents(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const eventsToProcess = this.processingQueue.splice(0, 100); // Process in batches

    try {
      const processingPromises = eventsToProcess.map(async (event) => {
        try {
          // Send to WebSocket stream
          await auditStreamServer.broadcastAuditEvent(event);

          // Send to external services
          await auditExternalServices.processAuditEvent(event);
        } catch (error) {
          logger.error('Failed to process audit event', {
            eventId: event.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      await Promise.allSettled(processingPromises);
    } catch (error) {
      logger.error('Error in audit event processing', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Utility methods for request analysis
   */
  private shouldExcludeRequest(request: NextRequest): boolean {
    const path = request.nextUrl.pathname;
    return this.config.excludeEndpoints.some((endpoint) =>
      path.startsWith(endpoint),
    );
  }

  private isSensitiveEndpoint(path: string): boolean {
    return this.config.sensitiveEndpoints.some((endpoint) =>
      path.startsWith(endpoint),
    );
  }

  private shouldAlwaysAudit(event: AuditStreamEvent): boolean {
    const path = event.event.path;
    return this.config.sampling.highValueEndpoints.some((endpoint) =>
      path.startsWith(endpoint),
    );
  }

  private extractUserId(request: NextRequest): string | undefined {
    // Extract user ID from JWT token, session cookie, or headers
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const payload = JSON.parse(
          Buffer.from(token.split('.')[1], 'base64').toString(),
        );
        return payload.sub || payload.user_id;
      } catch {
        return undefined;
      }
    }

    // Try session cookie
    const sessionCookie = request.cookies.get('session');
    if (sessionCookie) {
      try {
        const session = JSON.parse(sessionCookie.value);
        return session.user_id;
      } catch {
        return undefined;
      }
    }

    return undefined;
  }

  private extractSessionId(request: NextRequest): string | undefined {
    const sessionCookie = request.cookies.get('session');
    if (sessionCookie) {
      try {
        const session = JSON.parse(sessionCookie.value);
        return session.session_id;
      } catch {
        return undefined;
      }
    }

    return request.headers.get('x-session-id') || undefined;
  }

  private extractOrgId(request: NextRequest): string | undefined {
    // Extract organization ID from headers or token
    return request.headers.get('x-org-id') || undefined;
  }

  private getClientIP(request: NextRequest): string | undefined {
    // SENIOR CODE REVIEWER FIX: NextRequest doesn't have ip property, use headers only
    return (
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      undefined
    );
  }

  private getResponseSize(response: NextResponse): number {
    const contentLength = response.headers.get('content-length');
    return contentLength ? parseInt(contentLength, 10) : 0;
  }

  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Get performance metrics summary
   */
  public getMetrics(): {
    activeRequests: number;
    queueSize: number;
    averageProcessingTime: number;
  } {
    return {
      activeRequests: this.metricsBuffer.size,
      queueSize: this.processingQueue.length,
      averageProcessingTime: 0, // Could be calculated from historical data
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<AuditMiddlewareConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Audit middleware configuration updated', {
      config: this.config,
    });
  }
}

/**
 * Next.js middleware wrapper function
 */
export function createAuditMiddleware(config?: Partial<AuditMiddlewareConfig>) {
  // SENIOR CODE REVIEWER FIX: Merge partial config with defaults before passing to constructor
  const fullConfig: AuditMiddlewareConfig = { ...DEFAULT_CONFIG, ...config };
  const auditMiddleware = new AuditMiddleware(fullConfig);

  return {
    /**
     * Process request - call this at the start of your middleware
     */
    async processRequest(request: NextRequest) {
      return auditMiddleware.processRequest(request);
    },

    /**
     * Process response - call this before returning from your middleware
     */
    async processResponse(
      context: AuditContext,
      response: NextResponse,
      error?: Error,
    ) {
      return auditMiddleware.processResponse(context, response, error);
    },

    /**
     * Get middleware metrics
     */
    getMetrics() {
      return auditMiddleware.getMetrics();
    },
  };
}

// Export singleton instance for easy use
export const auditMiddleware = createAuditMiddleware();

// Export types for integration
export type { AuditContext, AuditMiddlewareConfig };
