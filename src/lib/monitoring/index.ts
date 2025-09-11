/**
 * WedSync Performance Monitoring System
 * Comprehensive observability stack with APM, metrics, logging, and alerting
 */

// Core monitoring components
export { metrics, MetricsCollector, trackBusinessMetrics } from './metrics';
export {
  logger,
  StructuredLogger,
  requestLoggingMiddleware,
} from './structured-logger';
export {
  errorTracker,
  ErrorTracker,
  errorTrackingMiddleware,
  withErrorTracking,
} from './error-tracking';
export {
  dashboard,
  PerformanceDashboard,
  dashboardRoute,
  metricsApiRoute,
} from './dashboard';
export { alertManager, AlertManager, alertsApiRoute } from './alerts';
export { apm, initializeAPM, apmMiddleware } from './apm';

// Types
export type { Metric, HistogramBucket } from './metrics';

export type { LogLevel, LogContext, LogEntry } from './structured-logger';

export type {
  ErrorContext,
  ErrorEvent,
  Breadcrumb,
  ErrorAlert,
} from './error-tracking';

export type {
  DashboardMetrics,
  SystemMetrics,
  ApplicationMetrics,
  BusinessMetrics,
  ErrorMetrics,
  HealthStatus,
} from './dashboard';

export type { AlertRule, AlertCondition, AlertChannel, Alert } from './alerts';

export type { APMConfig, Span, Transaction } from './apm';

// Quick setup functions
export const initializeMonitoring = (config: {
  serviceName: string;
  environment: string;
  version?: string;
  enableAPM?: boolean;
  enableErrorTracking?: boolean;
  enableAlerts?: boolean;
}) => {
  const monitoring = {
    metrics,
    logger,
    errorTracker,
    dashboard,
    alertManager,
    apm: null as any,
  };

  // Initialize APM if enabled
  if (config.enableAPM) {
    monitoring.apm = initializeAPM({
      serviceName: config.serviceName,
      environment: config.environment,
      version: config.version,
      enableErrorTracking: config.enableErrorTracking ?? true,
      enableRealUserMonitoring: true,
    });
  }

  // Set default logger context
  logger.setDefaultContext({
    service: config.serviceName,
    environment: config.environment,
    version: config.version,
  });

  return monitoring;
};

// Express middleware bundle
export const monitoringMiddleware = () => [
  requestLoggingMiddleware,
  apmMiddleware,
  errorTrackingMiddleware,
];

// Health check endpoint
export const healthCheckHandler = async (req: any, res: any) => {
  try {
    const health = await dashboard.getHealthStatus();
    const statusCode =
      health.status === 'healthy'
        ? 200
        : health.status === 'degraded'
          ? 200
          : 503;

    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: Date.now(),
    });
  }
};

// Monitoring routes for Express
export const createMonitoringRoutes = (app: any) => {
  // Health check
  app.get('/health', healthCheckHandler);

  // Detailed health with checks
  app.get('/health/detailed', async (req: any, res: any) => {
    const health = await dashboard.getHealthStatus();
    res.json(health);
  });

  // Performance dashboard
  app.get('/dashboard', dashboardRoute);

  // Metrics API
  app.get('/metrics', metricsApiRoute);

  // Alerts API
  app.get('/alerts', alertsApiRoute);
  app.get('/alerts/status', alertsApiRoute);
  app.get('/alerts/rules', alertsApiRoute);
  app.post('/alerts/acknowledge', alertsApiRoute);

  // Prometheus metrics endpoint (if needed)
  app.get('/prometheus/metrics', (req: any, res: any) => {
    const metricsData = metrics.getMetrics();

    let prometheusOutput = '';

    // Convert counters to Prometheus format
    metricsData.counters.forEach((counter) => {
      prometheusOutput += `# TYPE wedsync_${counter.name.replace(/\./g, '_')} counter\n`;
      prometheusOutput += `wedsync_${counter.name.replace(/\./g, '_')} ${counter.value}\n`;
    });

    // Convert gauges to Prometheus format
    metricsData.gauges.forEach((gauge) => {
      prometheusOutput += `# TYPE wedsync_${gauge.name.replace(/\./g, '_')} gauge\n`;
      prometheusOutput += `wedsync_${gauge.name.replace(/\./g, '_')} ${gauge.value}\n`;
    });

    res.setHeader('Content-Type', 'text/plain');
    res.send(prometheusOutput);
  });
};

// Graceful shutdown handler
export const gracefulShutdown = async () => {
  logger.info('Shutting down monitoring system...');

  try {
    // Flush any pending metrics
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Clean up resources
    alertManager.destroy?.();

    logger.info('Monitoring system shutdown complete');
  } catch (error) {
    logger.error('Error during monitoring shutdown', error as Error);
  }
};

// Process event handlers
if (typeof process !== 'undefined') {
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

// Default export with common utilities
export default {
  initializeMonitoring,
  monitoringMiddleware,
  createMonitoringRoutes,
  gracefulShutdown,

  // Quick access to main components
  metrics,
  logger,
  errorTracker,
  dashboard,
  alertManager,
  apm,

  // Utility functions
  createCorrelationId: () => logger.createCorrelationId(),

  // Performance helpers
  timer: (name: string) => metrics.startTimer(name),

  // Error helpers
  captureError: (error: Error, context?: any) =>
    errorTracker.captureError(error, context),

  // Logging helpers
  logInfo: (message: string, context?: any) => logger.info(message, context),
  logError: (message: string, error?: Error, context?: any) =>
    logger.error(message, error, context),
  logPerf: (message: string, duration: number, context?: any) =>
    logger.performance(message, duration, context),

  // Business metrics helpers
  trackPDF: trackBusinessMetrics.pdfProcessed,
  trackForm: trackBusinessMetrics.formCreated,
  trackPayment: trackBusinessMetrics.paymentProcessed,
  trackAPI: trackBusinessMetrics.apiRequest,
  trackUser: trackBusinessMetrics.userActivity,
};
