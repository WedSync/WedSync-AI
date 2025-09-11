/**
 * Enhanced Error Tracking and Alerting System
 * Real-time error monitoring with context and automatic alerting
 */

import { logger } from './structured-logger';
import { metrics } from './metrics';
import { apm } from './apm';

export interface ErrorContext {
  userId?: string;
  organizationId?: string;
  requestId?: string;
  sessionId?: string;
  userAgent?: string;
  ip?: string;
  endpoint?: string;
  method?: string;
  timestamp: number;
  environment: string;
  version?: string;
  buildId?: string;
}

export interface ErrorFingerprint {
  hash: string;
  type: string;
  message: string;
  stackHash: string;
}

export interface ErrorEvent {
  id: string;
  fingerprint: ErrorFingerprint;
  error: Error;
  context: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  tags: Record<string, string>;
  breadcrumbs: Breadcrumb[];
  firstSeen: number;
  lastSeen: number;
  count: number;
}

export interface Breadcrumb {
  timestamp: number;
  category: string;
  message: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  data?: Record<string, any>;
}

export interface ErrorAlert {
  id: string;
  errorId: string;
  severity: string;
  title: string;
  description: string;
  timestamp: number;
  channels: string[];
  acknowledged?: boolean;
  resolved?: boolean;
}

export class ErrorTracker {
  private static instance: ErrorTracker;
  private errorEvents = new Map<string, ErrorEvent>();
  private breadcrumbs: Breadcrumb[] = [];
  private maxBreadcrumbs = 50;
  private errorThresholds = {
    low: { count: 10, timeWindow: 300000 }, // 10 errors in 5 minutes
    medium: { count: 25, timeWindow: 300000 }, // 25 errors in 5 minutes
    high: { count: 50, timeWindow: 300000 }, // 50 errors in 5 minutes
    critical: { count: 100, timeWindow: 300000 }, // 100 errors in 5 minutes
  };

  private constructor() {
    this.setupGlobalErrorHandlers();
    this.startErrorAggregation();
  }

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  // Capture and process errors
  captureError(
    error: Error,
    context?: Partial<ErrorContext>,
    tags?: Record<string, string>,
  ): string {
    const errorId = this.generateErrorId();
    const fullContext: ErrorContext = {
      timestamp: Date.now(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION,
      buildId: process.env.BUILD_ID,
      ...context,
    };

    const fingerprint = this.generateFingerprint(error);
    const severity = this.calculateSeverity(error, fullContext);

    const errorEvent: ErrorEvent = {
      id: errorId,
      fingerprint,
      error,
      context: fullContext,
      severity,
      tags: tags || {},
      breadcrumbs: [...this.breadcrumbs],
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      count: 1,
    };

    // Check if this error type has been seen before
    const existingError = this.findExistingError(fingerprint);
    if (existingError) {
      existingError.lastSeen = Date.now();
      existingError.count++;
      existingError.context = fullContext; // Update with latest context

      // Update severity based on frequency
      existingError.severity =
        this.updateSeverityBasedOnFrequency(existingError);
    } else {
      this.errorEvents.set(errorId, errorEvent);
    }

    // Log the error
    logger.error(`Error captured: ${error.message}`, error, {
      errorId,
      fingerprint: fingerprint.hash,
      severity,
      ...fullContext,
    });

    // Update metrics
    metrics.incrementCounter('errors.total', 1, {
      type: error.name,
      severity,
      environment: fullContext.environment,
    });

    // Send to APM if available
    if (apm) {
      apm.captureError(error, { errorId, severity, ...fullContext });
    }

    // Send to external error tracking services
    this.sendToErrorServices(errorEvent);

    // Check for alert conditions
    this.checkAlertConditions(errorEvent);

    return errorId;
  }

  // Add breadcrumb for context
  addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void {
    const fullBreadcrumb: Breadcrumb = {
      timestamp: Date.now(),
      ...breadcrumb,
    };

    this.breadcrumbs.push(fullBreadcrumb);

    // Keep only recent breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
  }

  // Generate error fingerprint for grouping
  private generateFingerprint(error: Error): ErrorFingerprint {
    const stackLines = error.stack?.split('\n').slice(0, 5) || [];
    const stackHash = this.hash(stackLines.join('\n'));
    const messageHash = this.hash(error.message.substring(0, 100));

    return {
      hash: this.hash(`${error.name}:${messageHash}:${stackHash}`),
      type: error.name,
      message: error.message.substring(0, 200),
      stackHash,
    };
  }

  // Simple hash function
  private hash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  // Calculate error severity
  private calculateSeverity(
    error: Error,
    context: ErrorContext,
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Critical errors
    if (
      error.name === 'SecurityError' ||
      error.message.includes('payment') ||
      error.message.includes('database') ||
      context.endpoint?.includes('/api/stripe') ||
      context.endpoint?.includes('/api/auth')
    ) {
      return 'critical';
    }

    // High severity errors
    if (
      error.name === 'ValidationError' ||
      error.name === 'AuthenticationError' ||
      error.message.includes('unauthorized') ||
      context.endpoint?.includes('/api/')
    ) {
      return 'high';
    }

    // Medium severity errors
    if (
      error.name === 'NetworkError' ||
      error.name === 'TimeoutError' ||
      error.message.includes('fetch')
    ) {
      return 'medium';
    }

    // Default to low severity
    return 'low';
  }

  // Update severity based on error frequency
  private updateSeverityBasedOnFrequency(
    errorEvent: ErrorEvent,
  ): 'low' | 'medium' | 'high' | 'critical' {
    const timeWindow = 300000; // 5 minutes
    const recentTime = Date.now() - timeWindow;

    if (errorEvent.lastSeen < recentTime) {
      return errorEvent.severity; // No recent occurrences
    }

    // Escalate severity based on frequency
    if (errorEvent.count >= 100) return 'critical';
    if (errorEvent.count >= 50) return 'high';
    if (errorEvent.count >= 25) return 'medium';

    return errorEvent.severity;
  }

  // Find existing error by fingerprint
  private findExistingError(
    fingerprint: ErrorFingerprint,
  ): ErrorEvent | undefined {
    for (const errorEvent of this.errorEvents.values()) {
      if (errorEvent.fingerprint.hash === fingerprint.hash) {
        return errorEvent;
      }
    }
    return undefined;
  }

  // Setup global error handlers
  private setupGlobalErrorHandlers(): void {
    // Node.js error handlers
    if (typeof process !== 'undefined') {
      process.on('uncaughtException', (error) => {
        this.captureError(
          error,
          {
            endpoint: 'global',
            method: 'uncaughtException',
          },
          { type: 'uncaughtException' },
        );
      });

      process.on('unhandledRejection', (reason, promise) => {
        const error =
          reason instanceof Error ? reason : new Error(String(reason));
        this.captureError(
          error,
          {
            endpoint: 'global',
            method: 'unhandledRejection',
          },
          { type: 'unhandledRejection' },
        );
      });
    }

    // Browser error handlers
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        const error = event.error || new Error(event.message);
        this.captureError(
          error,
          {
            endpoint: window.location.pathname,
            method: 'javascript',
          },
          {
            type: 'javascriptError',
            filename: event.filename || '',
            line: String(event.lineno || 0),
            column: String(event.colno || 0),
          },
        );
      });

      window.addEventListener('unhandledrejection', (event) => {
        const error =
          event.reason instanceof Error
            ? event.reason
            : new Error(String(event.reason));

        this.captureError(
          error,
          {
            endpoint: window.location.pathname,
            method: 'promise',
          },
          { type: 'unhandledPromiseRejection' },
        );
      });
    }
  }

  // Send errors to external services
  private async sendToErrorServices(errorEvent: ErrorEvent): Promise<void> {
    const promises: Promise<void>[] = [];

    // Send to Sentry
    if (process.env.SENTRY_DSN) {
      promises.push(this.sendToSentry(errorEvent));
    }

    // Send to custom webhook
    if (process.env.ERROR_WEBHOOK_URL) {
      promises.push(this.sendToWebhook(errorEvent));
    }

    // Send to Slack for high/critical errors
    if (errorEvent.severity === 'high' || errorEvent.severity === 'critical') {
      promises.push(this.sendToSlack(errorEvent));
    }

    await Promise.allSettled(promises);
  }

  // Send to Sentry
  private async sendToSentry(errorEvent: ErrorEvent): Promise<void> {
    try {
      const sentryPayload = {
        event_id: errorEvent.id,
        timestamp: errorEvent.context.timestamp / 1000,
        level: this.mapSeverityToSentryLevel(errorEvent.severity),
        logger: 'wedsync-error-tracker',
        platform: 'javascript',
        server_name: process.env.HOSTNAME,
        environment: errorEvent.context.environment,
        release: errorEvent.context.version,
        exception: {
          values: [
            {
              type: errorEvent.error.name,
              value: errorEvent.error.message,
              stacktrace: {
                frames: this.parseStackTrace(errorEvent.error.stack || ''),
              },
            },
          ],
        },
        user: errorEvent.context.userId
          ? {
              id: errorEvent.context.userId,
            }
          : undefined,
        tags: errorEvent.tags,
        extra: {
          context: errorEvent.context,
          fingerprint: errorEvent.fingerprint,
          breadcrumbs: errorEvent.breadcrumbs,
        },
      };

      await fetch(
        `https://sentry.io/api/${process.env.SENTRY_PROJECT_ID}/store/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${process.env.SENTRY_KEY}`,
          },
          body: JSON.stringify(sentryPayload),
        },
      );
    } catch (error) {
      logger.warn('Failed to send error to Sentry', { error: String(error) });
    }
  }

  // Send to webhook
  private async sendToWebhook(errorEvent: ErrorEvent): Promise<void> {
    try {
      await fetch(process.env.ERROR_WEBHOOK_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'error',
          errorEvent,
          service: 'wedsync',
          environment: errorEvent.context.environment,
        }),
      });
    } catch (error) {
      logger.warn('Failed to send error to webhook', { error: String(error) });
    }
  }

  // Send to Slack for critical errors
  private async sendToSlack(errorEvent: ErrorEvent): Promise<void> {
    try {
      if (!process.env.SLACK_ERROR_WEBHOOK_URL) return;

      const color = errorEvent.severity === 'critical' ? 'danger' : 'warning';
      const emoji = errorEvent.severity === 'critical' ? '🚨' : '⚠️';

      const slackPayload = {
        text: `${emoji} Error Alert - ${errorEvent.severity.toUpperCase()}`,
        attachments: [
          {
            color,
            title: `${errorEvent.error.name}: ${errorEvent.error.message}`,
            fields: [
              {
                title: 'Environment',
                value: errorEvent.context.environment,
                short: true,
              },
              {
                title: 'Endpoint',
                value: errorEvent.context.endpoint || 'Unknown',
                short: true,
              },
              {
                title: 'User ID',
                value: errorEvent.context.userId || 'Anonymous',
                short: true,
              },
              {
                title: 'Count',
                value: String(errorEvent.count),
                short: true,
              },
              {
                title: 'First Seen',
                value: new Date(errorEvent.firstSeen).toISOString(),
                short: true,
              },
              {
                title: 'Last Seen',
                value: new Date(errorEvent.lastSeen).toISOString(),
                short: true,
              },
            ],
            footer: 'WedSync Error Tracker',
            ts: Math.floor(errorEvent.context.timestamp / 1000),
          },
        ],
      };

      await fetch(process.env.SLACK_ERROR_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackPayload),
      });
    } catch (error) {
      logger.warn('Failed to send error to Slack', { error: String(error) });
    }
  }

  // Check alert conditions
  private checkAlertConditions(errorEvent: ErrorEvent): void {
    const threshold = this.errorThresholds[errorEvent.severity];
    const recentErrors = this.getRecentErrorCount(
      errorEvent.fingerprint.hash,
      threshold.timeWindow,
    );

    if (recentErrors >= threshold.count) {
      this.createAlert(errorEvent, recentErrors);
    }
  }

  // Get recent error count for fingerprint
  private getRecentErrorCount(
    fingerprintHash: string,
    timeWindow: number,
  ): number {
    const cutoff = Date.now() - timeWindow;
    let count = 0;

    for (const errorEvent of this.errorEvents.values()) {
      if (
        errorEvent.fingerprint.hash === fingerprintHash &&
        errorEvent.lastSeen >= cutoff
      ) {
        count += errorEvent.count;
      }
    }

    return count;
  }

  // Create alert
  private createAlert(errorEvent: ErrorEvent, count: number): void {
    const alert: ErrorAlert = {
      id: this.generateErrorId(),
      errorId: errorEvent.id,
      severity: errorEvent.severity,
      title: `High error rate: ${errorEvent.error.name}`,
      description: `${count} occurrences of "${errorEvent.error.message}" in the last 5 minutes`,
      timestamp: Date.now(),
      channels: ['slack', 'email'],
      acknowledged: false,
      resolved: false,
    };

    logger.error('Error alert created', undefined, { alert });

    metrics.incrementCounter('alerts.created', 1, {
      severity: errorEvent.severity,
      type: 'error_rate',
    });

    // Send alert notifications
    this.sendAlertNotifications(alert, errorEvent);
  }

  // Send alert notifications
  private async sendAlertNotifications(
    alert: ErrorAlert,
    errorEvent: ErrorEvent,
  ): Promise<void> {
    // Send to PagerDuty for critical alerts
    if (alert.severity === 'critical' && process.env.PAGERDUTY_ROUTING_KEY) {
      await this.sendToPagerDuty(alert, errorEvent);
    }

    // Send email notifications
    if (process.env.ALERT_EMAIL_URL) {
      await this.sendEmailAlert(alert, errorEvent);
    }
  }

  // Send to PagerDuty
  private async sendToPagerDuty(
    alert: ErrorAlert,
    errorEvent: ErrorEvent,
  ): Promise<void> {
    try {
      await fetch('https://events.pagerduty.com/v2/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routing_key: process.env.PAGERDUTY_ROUTING_KEY,
          event_action: 'trigger',
          dedup_key: `wedsync-error-${errorEvent.fingerprint.hash}`,
          payload: {
            summary: alert.title,
            severity: alert.severity,
            source: 'wedsync-error-tracker',
            component: errorEvent.context.endpoint || 'unknown',
            group: 'backend',
            class: 'error',
            custom_details: {
              error_message: errorEvent.error.message,
              error_type: errorEvent.error.name,
              environment: errorEvent.context.environment,
              user_id: errorEvent.context.userId,
              count: errorEvent.count,
              first_seen: new Date(errorEvent.firstSeen).toISOString(),
              last_seen: new Date(errorEvent.lastSeen).toISOString(),
            },
          },
        }),
      });
    } catch (error) {
      logger.warn('Failed to send alert to PagerDuty', {
        error: String(error),
      });
    }
  }

  // Send email alert
  private async sendEmailAlert(
    alert: ErrorAlert,
    errorEvent: ErrorEvent,
  ): Promise<void> {
    try {
      await fetch(process.env.ALERT_EMAIL_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || [],
          subject: `[WedSync Alert] ${alert.title}`,
          html: this.generateEmailTemplate(alert, errorEvent),
        }),
      });
    } catch (error) {
      logger.warn('Failed to send email alert', { error: String(error) });
    }
  }

  // Generate email template
  private generateEmailTemplate(
    alert: ErrorAlert,
    errorEvent: ErrorEvent,
  ): string {
    return `
      <h2>Error Alert - ${alert.severity.toUpperCase()}</h2>
      <p><strong>Title:</strong> ${alert.title}</p>
      <p><strong>Description:</strong> ${alert.description}</p>
      
      <h3>Error Details</h3>
      <ul>
        <li><strong>Type:</strong> ${errorEvent.error.name}</li>
        <li><strong>Message:</strong> ${errorEvent.error.message}</li>
        <li><strong>Environment:</strong> ${errorEvent.context.environment}</li>
        <li><strong>Endpoint:</strong> ${errorEvent.context.endpoint || 'Unknown'}</li>
        <li><strong>User ID:</strong> ${errorEvent.context.userId || 'Anonymous'}</li>
        <li><strong>Count:</strong> ${errorEvent.count}</li>
        <li><strong>First Seen:</strong> ${new Date(errorEvent.firstSeen).toISOString()}</li>
        <li><strong>Last Seen:</strong> ${new Date(errorEvent.lastSeen).toISOString()}</li>
      </ul>

      <h3>Stack Trace</h3>
      <pre>${errorEvent.error.stack}</pre>
      
      <p><em>This alert was generated by WedSync Error Tracker</em></p>
    `;
  }

  // Utility methods
  private mapSeverityToSentryLevel(severity: string): string {
    switch (severity) {
      case 'critical':
        return 'fatal';
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'error';
    }
  }

  private parseStackTrace(
    stack: string,
  ): Array<{ filename?: string; function?: string; lineno?: number }> {
    return stack
      .split('\n')
      .slice(1)
      .map((line) => {
        const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
        if (match) {
          return {
            function: match[1],
            filename: match[2],
            lineno: parseInt(match[3], 10),
          };
        }
        return { filename: line.trim() };
      });
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  // Start error aggregation and cleanup
  private startErrorAggregation(): void {
    // Clean up old errors every hour
    setInterval(() => {
      this.cleanupOldErrors();
    }, 3600000); // 1 hour
  }

  // Clean up old errors to prevent memory leaks
  private cleanupOldErrors(): void {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    for (const [id, errorEvent] of this.errorEvents.entries()) {
      if (errorEvent.lastSeen < oneWeekAgo) {
        this.errorEvents.delete(id);
      }
    }
  }

  // Get error statistics
  getErrorStats(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    recentErrors: ErrorEvent[];
  } {
    const totalErrors = this.errorEvents.size;
    const errorsByType: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};
    const recentErrors: ErrorEvent[] = [];

    const oneHourAgo = Date.now() - 3600000;

    for (const errorEvent of this.errorEvents.values()) {
      errorsByType[errorEvent.error.name] =
        (errorsByType[errorEvent.error.name] || 0) + 1;
      errorsBySeverity[errorEvent.severity] =
        (errorsBySeverity[errorEvent.severity] || 0) + 1;

      if (errorEvent.lastSeen >= oneHourAgo) {
        recentErrors.push(errorEvent);
      }
    }

    return {
      totalErrors,
      errorsByType,
      errorsBySeverity,
      recentErrors: recentErrors
        .sort((a, b) => b.lastSeen - a.lastSeen)
        .slice(0, 10),
    };
  }
}

// Global error tracker instance
export const errorTracker = ErrorTracker.getInstance();

// Express middleware for error tracking
export function errorTrackingMiddleware(
  err: Error,
  req: any,
  res: any,
  next: any,
): void {
  errorTracker.captureError(
    err,
    {
      userId: req.user?.id,
      organizationId: req.user?.organizationId,
      requestId: req.correlationId,
      sessionId: req.sessionID,
      userAgent: req.get('user-agent'),
      ip: req.ip,
      endpoint: req.path,
      method: req.method,
    },
    {
      statusCode: String(res.statusCode || 500),
      query: JSON.stringify(req.query),
      params: JSON.stringify(req.params),
    },
  );

  next(err);
}

// React error boundary helper
export class ErrorBoundary extends Error {
  constructor(message: string, componentStack?: string) {
    super(message);
    this.name = 'ReactErrorBoundary';
    if (componentStack) {
      this.stack = componentStack;
    }
  }
}

// Utility function to wrap async functions with error tracking
export function withErrorTracking<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: Partial<ErrorContext>,
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof Error) {
        errorTracker.captureError(error, context);
      }
      throw error;
    }
  }) as T;
}
