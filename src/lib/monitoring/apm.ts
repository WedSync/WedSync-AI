/**
 * Application Performance Monitoring (APM) Integration
 * Real-time performance tracking and alerting system
 */

import { logger } from './structured-logger';
import { metrics } from './metrics';

export interface APMConfig {
  serviceName: string;
  environment: string;
  version?: string;
  samplingRate?: number;
  enableRealUserMonitoring?: boolean;
  enableErrorTracking?: boolean;
}

export interface Span {
  id: string;
  traceId: string;
  parentId?: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags: Record<string, any>;
  logs: Array<{
    timestamp: number;
    fields: Record<string, any>;
  }>;
  status: 'ok' | 'error' | 'timeout';
}

export interface Transaction {
  id: string;
  name: string;
  type: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  result: string;
  spans: Span[];
  context: {
    user?: { id: string; email?: string };
    request?: {
      method: string;
      url: string;
      headers?: Record<string, string>;
    };
    response?: {
      statusCode: number;
      headers?: Record<string, string>;
    };
  };
}

export class APMAgent {
  private static instance: APMAgent;
  private config: APMConfig;
  private activeTransactions = new Map<string, Transaction>();
  private activeSpans = new Map<string, Span>();

  private constructor(config: APMConfig) {
    this.config = config;
    this.initializeAgent();
  }

  static getInstance(config?: APMConfig): APMAgent {
    if (!APMAgent.instance) {
      if (!config) {
        throw new Error('APM config required for first initialization');
      }
      APMAgent.instance = new APMAgent(config);
    }
    return APMAgent.instance;
  }

  private initializeAgent(): void {
    // Set up error handlers
    if (this.config.enableErrorTracking) {
      this.setupErrorTracking();
    }

    // Set up periodic metrics collection
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000); // Every 30 seconds

    logger.info('APM Agent initialized', {
      service: this.config.serviceName,
      environment: this.config.environment,
    });
  }

  // Transaction Management
  startTransaction(name: string, type: string = 'request'): Transaction {
    const transaction: Transaction = {
      id: this.generateId(),
      name,
      type,
      startTime: Date.now(),
      result: 'unknown',
      spans: [],
      context: {},
    };

    this.activeTransactions.set(transaction.id, transaction);

    logger.debug('Transaction started', {
      transactionId: transaction.id,
      name,
      type,
    });

    return transaction;
  }

  endTransaction(transactionId: string, result: string = 'success'): void {
    const transaction = this.activeTransactions.get(transactionId);
    if (!transaction) {
      logger.warn('Attempted to end unknown transaction', { transactionId });
      return;
    }

    transaction.endTime = Date.now();
    transaction.duration = transaction.endTime - transaction.startTime;
    transaction.result = result;

    // Record metrics
    metrics.recordHistogram('apm.transaction.duration', transaction.duration, {
      name: transaction.name,
      type: transaction.type,
      result,
    });

    metrics.incrementCounter('apm.transactions.total', 1, {
      name: transaction.name,
      type: transaction.type,
      result,
    });

    logger.info('Transaction completed', {
      transactionId,
      name: transaction.name,
      duration: transaction.duration,
      result,
    });

    // Send to APM service
    this.sendTransaction(transaction);

    // Clean up
    this.activeTransactions.delete(transactionId);
  }

  // Span Management
  startSpan(
    operationName: string,
    parentId?: string,
    transactionId?: string,
  ): Span {
    const span: Span = {
      id: this.generateId(),
      traceId: transactionId || this.generateId(),
      parentId,
      operationName,
      startTime: Date.now(),
      tags: {},
      logs: [],
      status: 'ok',
    };

    this.activeSpans.set(span.id, span);

    // Add span to transaction if provided
    if (transactionId) {
      const transaction = this.activeTransactions.get(transactionId);
      if (transaction) {
        transaction.spans.push(span);
      }
    }

    return span;
  }

  endSpan(spanId: string, status: 'ok' | 'error' | 'timeout' = 'ok'): void {
    const span = this.activeSpans.get(spanId);
    if (!span) {
      logger.warn('Attempted to end unknown span', { spanId });
      return;
    }

    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = status;

    // Record metrics
    metrics.recordHistogram('apm.span.duration', span.duration, {
      operation: span.operationName,
      status,
    });

    logger.debug('Span completed', {
      spanId,
      operation: span.operationName,
      duration: span.duration,
      status,
    });

    // Clean up
    this.activeSpans.delete(spanId);
  }

  // Add tags and logs to spans
  setSpanTag(spanId: string, key: string, value: any): void {
    const span = this.activeSpans.get(spanId);
    if (span) {
      span.tags[key] = value;
    }
  }

  logSpanEvent(
    spanId: string,
    event: string,
    fields?: Record<string, any>,
  ): void {
    const span = this.activeSpans.get(spanId);
    if (span) {
      span.logs.push({
        timestamp: Date.now(),
        fields: { event, ...fields },
      });
    }
  }

  // Error tracking
  captureError(error: Error, context?: Record<string, any>): void {
    const errorId = this.generateId();

    logger.error('APM Error captured', error, {
      errorId,
      ...context,
    });

    metrics.incrementCounter('apm.errors.total', 1, {
      name: error.name,
      message: error.message.substring(0, 100),
    });

    // Send to APM service
    this.sendError({
      id: errorId,
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
      context,
    });
  }

  // System metrics collection
  private async collectSystemMetrics(): Promise<void> {
    try {
      // Memory metrics
      if (typeof process !== 'undefined' && process.memoryUsage) {
        const memory = process.memoryUsage();
        metrics.setGauge(
          'apm.system.memory.heap_used',
          memory.heapUsed / 1024 / 1024,
        ); // MB
        metrics.setGauge(
          'apm.system.memory.heap_total',
          memory.heapTotal / 1024 / 1024,
        );
        metrics.setGauge(
          'apm.system.memory.external',
          memory.external / 1024 / 1024,
        );
        metrics.setGauge('apm.system.memory.rss', memory.rss / 1024 / 1024);
      }

      // CPU metrics
      if (typeof process !== 'undefined' && process.cpuUsage) {
        const cpuUsage = process.cpuUsage();
        metrics.setGauge('apm.system.cpu.user', cpuUsage.user / 1000); // ms
        metrics.setGauge('apm.system.cpu.system', cpuUsage.system / 1000);
      }

      // Event loop lag (Node.js specific)
      if (typeof process !== 'undefined') {
        const start = process.hrtime.bigint();
        setImmediate(() => {
          const lag = Number(process.hrtime.bigint() - start) / 1000000; // ms
          metrics.setGauge('apm.system.event_loop_lag', lag);
        });
      }

      // Active handles and requests
      if (
        typeof process !== 'undefined' &&
        (process as any)._getActiveHandles
      ) {
        const handles = (process as any)._getActiveHandles();
        const requests = (process as any)._getActiveRequests();
        metrics.setGauge(
          'apm.system.active_handles',
          handles ? handles.length : 0,
        );
        metrics.setGauge(
          'apm.system.active_requests',
          requests ? requests.length : 0,
        );
      }
    } catch (error) {
      logger.warn('Failed to collect system metrics', { error: String(error) });
    }
  }

  // Setup error tracking
  private setupErrorTracking(): void {
    if (typeof process !== 'undefined') {
      process.on('uncaughtException', (error) => {
        this.captureError(error, { type: 'uncaughtException' });
        logger.fatal('Uncaught exception', error);
      });

      process.on('unhandledRejection', (reason, promise) => {
        const error =
          reason instanceof Error ? reason : new Error(String(reason));
        this.captureError(error, {
          type: 'unhandledRejection',
          promise: String(promise),
        });
        logger.error('Unhandled promise rejection', error);
      });
    }

    // Browser error tracking
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.captureError(event.error || new Error(event.message), {
          type: 'javascriptError',
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        const error =
          event.reason instanceof Error
            ? event.reason
            : new Error(String(event.reason));
        this.captureError(error, { type: 'unhandledPromiseRejection' });
      });
    }
  }

  // Send data to APM service
  private async sendTransaction(transaction: Transaction): Promise<void> {
    try {
      if (process.env.APM_SERVER_URL) {
        await fetch(`${process.env.APM_SERVER_URL}/intake/v2/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-ndjson',
            Authorization: `Bearer ${process.env.APM_SECRET_TOKEN}`,
          },
          body: this.formatTransactionForElastic(transaction),
        });
      }

      // Also send to custom webhook if configured
      if (process.env.APM_WEBHOOK_URL) {
        await fetch(process.env.APM_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'transaction',
            data: transaction,
            service: this.config.serviceName,
            environment: this.config.environment,
          }),
        });
      }
    } catch (error) {
      logger.warn(
        'Failed to send transaction to APM service',
        error as Record<string, unknown>,
      );
    }
  }

  private async sendError(errorData: any): Promise<void> {
    try {
      if (process.env.APM_SERVER_URL) {
        await fetch(`${process.env.APM_SERVER_URL}/intake/v2/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-ndjson',
            Authorization: `Bearer ${process.env.APM_SECRET_TOKEN}`,
          },
          body: this.formatErrorForElastic(errorData),
        });
      }

      if (process.env.APM_WEBHOOK_URL) {
        await fetch(process.env.APM_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'error',
            data: errorData,
            service: this.config.serviceName,
            environment: this.config.environment,
          }),
        });
      }
    } catch (error) {
      logger.warn(
        'Failed to send error to APM service',
        error as Record<string, unknown>,
      );
    }
  }

  // Format for Elastic APM
  private formatTransactionForElastic(transaction: Transaction): string {
    const metadata = {
      metadata: {
        service: {
          name: this.config.serviceName,
          environment: this.config.environment,
          version: this.config.version,
        },
      },
    };

    const transactionData = {
      transaction: {
        id: transaction.id,
        trace_id: transaction.id,
        name: transaction.name,
        type: transaction.type,
        duration: transaction.duration,
        result: transaction.result,
        timestamp: transaction.startTime * 1000, // microseconds
        context: transaction.context,
      },
    };

    return (
      JSON.stringify(metadata) + '\n' + JSON.stringify(transactionData) + '\n'
    );
  }

  private formatErrorForElastic(error: any): string {
    const metadata = {
      metadata: {
        service: {
          name: this.config.serviceName,
          environment: this.config.environment,
          version: this.config.version,
        },
      },
    };

    const errorData = {
      error: {
        id: error.id,
        timestamp: error.timestamp * 1000,
        exception: {
          message: error.message,
          type: error.name,
          stacktrace: error.stack
            ?.split('\n')
            .map((frame: string) => ({ filename: frame })),
        },
        context: error.context,
      },
    };

    return JSON.stringify(metadata) + '\n' + JSON.stringify(errorData) + '\n';
  }

  private generateId(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  // Utility methods for easy integration
  withTransaction<T>(
    name: string,
    type: string,
    fn: (transaction: Transaction) => Promise<T>,
  ): Promise<T> {
    const transaction = this.startTransaction(name, type);

    return fn(transaction)
      .then((result) => {
        this.endTransaction(transaction.id, 'success');
        return result;
      })
      .catch((error) => {
        this.endTransaction(transaction.id, 'error');
        this.captureError(error, { transactionId: transaction.id });
        throw error;
      });
  }

  withSpan<T>(
    operationName: string,
    fn: (span: Span) => Promise<T>,
    parentId?: string,
  ): Promise<T> {
    const span = this.startSpan(operationName, parentId);

    return fn(span)
      .then((result) => {
        this.endSpan(span.id, 'ok');
        return result;
      })
      .catch((error) => {
        this.endSpan(span.id, 'error');
        this.captureError(error, { spanId: span.id });
        throw error;
      });
  }

  // Real User Monitoring (RUM) for browser
  trackPageView(path: string, loadTime?: number): void {
    if (typeof window !== 'undefined') {
      const transaction = this.startTransaction(`Page ${path}`, 'page-load');

      if (loadTime) {
        transaction.duration = loadTime;
        this.endTransaction(transaction.id, 'success');
      } else {
        // Measure using Navigation Timing API
        window.addEventListener('load', () => {
          if (performance && performance.timing) {
            const timing = performance.timing;
            const loadTime = timing.loadEventEnd - timing.navigationStart;
            transaction.duration = loadTime;
            this.endTransaction(transaction.id, 'success');
          }
        });
      }

      metrics.incrementCounter('apm.page_views', 1, { path });
    }
  }

  trackUserInteraction(action: string, element?: string): void {
    const span = this.startSpan(`User ${action}`, undefined);
    if (element) {
      this.setSpanTag(span.id, 'element', element);
    }
    this.endSpan(span.id, 'ok');

    metrics.incrementCounter('apm.user_interactions', 1, {
      action,
      element: element || 'unknown',
    });
  }
}

// Initialize APM with default config
export const initializeAPM = (config: APMConfig): APMAgent => {
  return APMAgent.getInstance(config);
};

// Default APM instance
export let apm: APMAgent;

// Auto-initialize if config is available
if (process.env.APM_SERVICE_NAME) {
  apm = initializeAPM({
    serviceName: process.env.APM_SERVICE_NAME,
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION,
    samplingRate: parseFloat(process.env.APM_SAMPLING_RATE || '1.0'),
    enableRealUserMonitoring: process.env.APM_ENABLE_RUM === 'true',
    enableErrorTracking: process.env.APM_ENABLE_ERROR_TRACKING !== 'false',
  });
}

// Express middleware for automatic transaction tracking
export function apmMiddleware(req: any, res: any, next: any): void {
  if (!apm) {
    return next();
  }

  const transaction = apm.startTransaction(
    `${req.method} ${req.route?.path || req.path}`,
    'request',
  );

  // Add request context
  transaction.context = {
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
    },
    user: req.user ? { id: req.user.id, email: req.user.email } : undefined,
  };

  req.apmTransaction = transaction;

  const originalSend = res.send;
  res.send = function (data: any) {
    transaction.context.response = {
      statusCode: res.statusCode,
      headers: res.getHeaders(),
    };

    const result = res.statusCode >= 400 ? 'error' : 'success';
    apm.endTransaction(transaction.id, result);

    originalSend.call(this, data);
  };

  next();
}
