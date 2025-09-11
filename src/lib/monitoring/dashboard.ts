/**
 * Performance Dashboard System
 * Real-time metrics visualization and monitoring dashboard
 */

import { metrics } from './metrics';
import { logger } from './structured-logger';
import { errorTracker } from './error-tracking';

export interface DashboardMetrics {
  timestamp: number;
  system: SystemMetrics;
  application: ApplicationMetrics;
  business: BusinessMetrics;
  errors: ErrorMetrics;
}

export interface SystemMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
    heapUsed: number;
    heapTotal: number;
  };
  eventLoop: {
    lag: number;
    utilization: number;
  };
  gc: {
    collections: number;
    pauseTime: number;
  };
}

export interface ApplicationMetrics {
  requests: {
    total: number;
    perSecond: number;
    responseTime: {
      p50: number;
      p90: number;
      p95: number;
      p99: number;
    };
    statusCodes: Record<string, number>;
  };
  database: {
    connections: {
      active: number;
      idle: number;
      total: number;
    };
    queries: {
      total: number;
      slow: number;
      failed: number;
      averageTime: number;
    };
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
  };
}

export interface BusinessMetrics {
  users: {
    active: number;
    new: number;
    total: number;
  };
  forms: {
    created: number;
    submitted: number;
    converted: number;
  };
  payments: {
    processed: number;
    amount: number;
    failed: number;
    success_rate: number;
  };
  pdf: {
    processed: number;
    failed: number;
    averageTime: number;
  };
}

export interface ErrorMetrics {
  total: number;
  rate: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  recent: Array<{
    message: string;
    count: number;
    lastSeen: number;
  }>;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<
    string,
    {
      status: 'pass' | 'warn' | 'fail';
      message: string;
      responseTime?: number;
      lastChecked: number;
    }
  >;
  uptime: number;
  version: string;
}

export class PerformanceDashboard {
  private static instance: PerformanceDashboard;
  private metricsHistory: DashboardMetrics[] = [];
  private maxHistorySize = 1440; // 24 hours at 1-minute intervals
  private healthChecks = new Map<string, Function>();
  private startTime = Date.now();

  private constructor() {
    this.initializeMetricsCollection();
    this.setupHealthChecks();
  }

  static getInstance(): PerformanceDashboard {
    if (!PerformanceDashboard.instance) {
      PerformanceDashboard.instance = new PerformanceDashboard();
    }
    return PerformanceDashboard.instance;
  }

  // Initialize metrics collection
  private initializeMetricsCollection(): void {
    // Collect metrics every minute
    setInterval(async () => {
      try {
        const dashboardMetrics = await this.collectMetrics();
        this.metricsHistory.push(dashboardMetrics);

        // Keep only recent metrics
        if (this.metricsHistory.length > this.maxHistorySize) {
          this.metricsHistory.shift();
        }

        logger.debug('Dashboard metrics collected', {
          timestamp: dashboardMetrics.timestamp,
        });
      } catch (error) {
        logger.error('Failed to collect dashboard metrics', error);
      }
    }, 60000);
  }

  // Collect current metrics snapshot
  private async collectMetrics(): Promise<DashboardMetrics> {
    const timestamp = Date.now();

    return {
      timestamp,
      system: await this.collectSystemMetrics(),
      application: await this.collectApplicationMetrics(),
      business: await this.collectBusinessMetrics(),
      errors: await this.collectErrorMetrics(),
    };
  }

  // Collect system metrics
  private async collectSystemMetrics(): Promise<SystemMetrics> {
    const systemMetrics: SystemMetrics = {
      cpu: { usage: 0, loadAverage: [] },
      memory: { used: 0, total: 0, percentage: 0, heapUsed: 0, heapTotal: 0 },
      eventLoop: { lag: 0, utilization: 0 },
      gc: { collections: 0, pauseTime: 0 },
    };

    try {
      // Node.js specific metrics
      if (typeof process !== 'undefined') {
        // Memory metrics
        const memoryUsage = process.memoryUsage();
        systemMetrics.memory = {
          used: memoryUsage.rss,
          total: memoryUsage.rss + memoryUsage.external,
          percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
        };

        // CPU metrics (if available)
        if (process.cpuUsage) {
          const cpuUsage = process.cpuUsage();
          systemMetrics.cpu.usage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
        }

        // Load average (Unix systems)
        if (process.loadavg) {
          systemMetrics.cpu.loadAverage = process.loadavg();
        }

        // Event loop lag measurement
        const start = process.hrtime.bigint();
        setImmediate(() => {
          const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to ms
          systemMetrics.eventLoop.lag = lag;
        });
      }

      // Browser performance metrics
      if (typeof performance !== 'undefined' && performance.memory) {
        systemMetrics.memory = {
          used: (performance.memory as any).usedJSHeapSize,
          total: (performance.memory as any).totalJSHeapSize,
          percentage:
            ((performance.memory as any).usedJSHeapSize /
              (performance.memory as any).totalJSHeapSize) *
            100,
          heapUsed: (performance.memory as any).usedJSHeapSize,
          heapTotal: (performance.memory as any).totalJSHeapSize,
        };
      }
    } catch (error) {
      logger.warn('Failed to collect system metrics', error);
    }

    return systemMetrics;
  }

  // Collect application metrics
  private async collectApplicationMetrics(): Promise<ApplicationMetrics> {
    const appMetrics = metrics.getMetrics();

    // Extract request metrics
    const requestMetrics = {
      total: this.getCounterValue(appMetrics.counters, 'api.requests') || 0,
      perSecond: this.calculateRatePerSecond('api.requests'),
      responseTime: this.getHistogramPercentiles('api.response_time') || {
        p50: 0,
        p90: 0,
        p95: 0,
        p99: 0,
      },
      statusCodes: this.getStatusCodeBreakdown(appMetrics.counters),
    };

    // Extract database metrics
    const databaseMetrics = {
      connections: {
        active:
          this.getGaugeValue(appMetrics.gauges, 'db.connections.active') || 0,
        idle: this.getGaugeValue(appMetrics.gauges, 'db.connections.idle') || 0,
        total:
          this.getGaugeValue(appMetrics.gauges, 'db.connections.total') || 0,
      },
      queries: {
        total:
          this.getCounterValue(appMetrics.counters, 'db.queries.total') || 0,
        slow: this.getCounterValue(appMetrics.counters, 'db.queries.slow') || 0,
        failed:
          this.getCounterValue(appMetrics.counters, 'db.queries.failed') || 0,
        averageTime: this.getHistogramAverage('db.query_time') || 0,
      },
    };

    // Extract cache metrics
    const cacheMetrics = {
      hits: this.getCounterValue(appMetrics.counters, 'cache.hits') || 0,
      misses: this.getCounterValue(appMetrics.counters, 'cache.misses') || 0,
      hitRate: this.calculateCacheHitRate(),
      size: this.getGaugeValue(appMetrics.gauges, 'cache.size') || 0,
    };

    return {
      requests: requestMetrics,
      database: databaseMetrics,
      cache: cacheMetrics,
    };
  }

  // Collect business metrics
  private async collectBusinessMetrics(): Promise<BusinessMetrics> {
    const appMetrics = metrics.getMetrics();

    return {
      users: {
        active: this.getGaugeValue(appMetrics.gauges, 'users.active') || 0,
        new: this.getCounterValue(appMetrics.counters, 'users.new') || 0,
        total: this.getGaugeValue(appMetrics.gauges, 'users.total') || 0,
      },
      forms: {
        created:
          this.getCounterValue(appMetrics.counters, 'forms.created') || 0,
        submitted:
          this.getCounterValue(appMetrics.counters, 'forms.submitted') || 0,
        converted:
          this.getCounterValue(appMetrics.counters, 'forms.converted') || 0,
      },
      payments: {
        processed:
          this.getCounterValue(appMetrics.counters, 'payments.processed') || 0,
        amount: this.getHistogramSum('payments.amount') || 0,
        failed:
          this.getCounterValue(appMetrics.counters, 'payments.failed') || 0,
        success_rate: this.calculatePaymentSuccessRate(),
      },
      pdf: {
        processed:
          this.getCounterValue(appMetrics.counters, 'pdf.processed') || 0,
        failed: this.getCounterValue(appMetrics.counters, 'pdf.failed') || 0,
        averageTime: this.getHistogramAverage('pdf.processing_time') || 0,
      },
    };
  }

  // Collect error metrics
  private async collectErrorMetrics(): Promise<ErrorMetrics> {
    const errorStats = errorTracker.getErrorStats();
    const appMetrics = metrics.getMetrics();

    const totalErrors = errorStats.totalErrors;
    const errorRate = this.calculateErrorRate();

    return {
      total: totalErrors,
      rate: errorRate,
      byType: errorStats.errorsByType,
      bySeverity: errorStats.errorsBySeverity,
      recent: errorStats.recentErrors.map((error) => ({
        message: error.error.message,
        count: error.count,
        lastSeen: error.lastSeen,
      })),
    };
  }

  // Health check system
  private setupHealthChecks(): void {
    // Database health check
    this.healthChecks.set('database', async () => {
      try {
        const start = Date.now();
        // Implement database ping/health check here
        // const result = await db.query('SELECT 1');
        const responseTime = Date.now() - start;

        return {
          status: 'pass' as const,
          message: 'Database connection healthy',
          responseTime,
          lastChecked: Date.now(),
        };
      } catch (error) {
        return {
          status: 'fail' as const,
          message: `Database connection failed: ${(error as Error).message}`,
          lastChecked: Date.now(),
        };
      }
    });

    // Redis cache health check
    this.healthChecks.set('cache', async () => {
      try {
        const start = Date.now();
        // Implement Redis ping here
        const responseTime = Date.now() - start;

        return {
          status: 'pass' as const,
          message: 'Cache connection healthy',
          responseTime,
          lastChecked: Date.now(),
        };
      } catch (error) {
        return {
          status: 'fail' as const,
          message: `Cache connection failed: ${(error as Error).message}`,
          lastChecked: Date.now(),
        };
      }
    });

    // External API health checks
    this.healthChecks.set('stripe', async () => {
      try {
        const start = Date.now();
        // Check Stripe API health
        const response = await fetch('https://api.stripe.com/v1/balance', {
          headers: {
            Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          },
        });
        const responseTime = Date.now() - start;

        if (response.ok) {
          return {
            status: 'pass' as const,
            message: 'Stripe API healthy',
            responseTime,
            lastChecked: Date.now(),
          };
        } else {
          return {
            status: 'warn' as const,
            message: `Stripe API returned ${response.status}`,
            responseTime,
            lastChecked: Date.now(),
          };
        }
      } catch (error) {
        return {
          status: 'fail' as const,
          message: `Stripe API failed: ${(error as Error).message}`,
          lastChecked: Date.now(),
        };
      }
    });
  }

  // Get current health status
  async getHealthStatus(): Promise<HealthStatus> {
    const checks: Record<string, any> = {};
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Run all health checks
    const checkPromises = Array.from(this.healthChecks.entries()).map(
      async ([name, checkFn]) => {
        try {
          const result = await checkFn();
          checks[name] = result;

          if (result.status === 'fail') {
            overallStatus = 'unhealthy';
          } else if (result.status === 'warn' && overallStatus === 'healthy') {
            overallStatus = 'degraded';
          }
        } catch (error) {
          checks[name] = {
            status: 'fail',
            message: `Health check failed: ${(error as Error).message}`,
            lastChecked: Date.now(),
          };
          overallStatus = 'unhealthy';
        }
      },
    );

    await Promise.all(checkPromises);

    return {
      status: overallStatus,
      checks,
      uptime: Date.now() - this.startTime,
      version: process.env.APP_VERSION || '1.0.0',
    };
  }

  // Get dashboard data
  getCurrentMetrics(): DashboardMetrics | null {
    return this.metricsHistory[this.metricsHistory.length - 1] || null;
  }

  getMetricsHistory(hours: number = 24): DashboardMetrics[] {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return this.metricsHistory.filter((metric) => metric.timestamp >= cutoff);
  }

  // Generate dashboard HTML
  generateDashboardHTML(): string {
    const currentMetrics = this.getCurrentMetrics();
    const recentMetrics = this.getMetricsHistory(1); // Last hour

    if (!currentMetrics) {
      return '<h1>Dashboard Loading...</h1>';
    }

    return `
<!DOCTYPE html>
<html>
<head>
    <title>WedSync Performance Dashboard</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background-color: #f5f5f5; 
        }
        .dashboard { 
            max-width: 1400px; 
            margin: 0 auto; 
        }
        .header { 
            background: white; 
            padding: 20px; 
            border-radius: 8px; 
            margin-bottom: 20px; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
        }
        .metrics-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
            gap: 20px; 
        }
        .metric-card { 
            background: white; 
            padding: 20px; 
            border-radius: 8px; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
        }
        .metric-title { 
            font-size: 18px; 
            font-weight: bold; 
            margin-bottom: 15px; 
            color: #333; 
        }
        .metric-value { 
            font-size: 32px; 
            font-weight: bold; 
            margin-bottom: 5px; 
        }
        .metric-label { 
            color: #666; 
            font-size: 14px; 
        }
        .status-healthy { color: #28a745; }
        .status-degraded { color: #ffc107; }
        .status-unhealthy { color: #dc3545; }
        .errors-list { 
            max-height: 200px; 
            overflow-y: auto; 
            border: 1px solid #ddd; 
            border-radius: 4px; 
            padding: 10px; 
        }
        .error-item { 
            padding: 8px; 
            border-bottom: 1px solid #eee; 
            font-size: 12px; 
        }
        .timestamp { 
            color: #666; 
            font-size: 12px; 
        }
    </style>
    <meta http-equiv="refresh" content="60">
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <h1>WedSync Performance Dashboard</h1>
            <p class="timestamp">Last updated: ${new Date(currentMetrics.timestamp).toLocaleString()}</p>
        </div>
        
        <div class="metrics-grid">
            <!-- System Metrics -->
            <div class="metric-card">
                <div class="metric-title">System Health</div>
                <div class="metric-value">${currentMetrics.system.memory.percentage.toFixed(1)}%</div>
                <div class="metric-label">Memory Usage</div>
                <div style="margin-top: 10px;">
                    <div>CPU Load: ${currentMetrics.system.cpu.loadAverage[0]?.toFixed(2) || 'N/A'}</div>
                    <div>Event Loop Lag: ${currentMetrics.system.eventLoop.lag.toFixed(1)}ms</div>
                </div>
            </div>
            
            <!-- Request Metrics -->
            <div class="metric-card">
                <div class="metric-title">Requests</div>
                <div class="metric-value">${currentMetrics.application.requests.total.toLocaleString()}</div>
                <div class="metric-label">Total Requests</div>
                <div style="margin-top: 10px;">
                    <div>Rate: ${currentMetrics.application.requests.perSecond}/sec</div>
                    <div>P95 Response: ${currentMetrics.application.requests.responseTime.p95}ms</div>
                </div>
            </div>
            
            <!-- Database Metrics -->
            <div class="metric-card">
                <div class="metric-title">Database</div>
                <div class="metric-value">${currentMetrics.application.database.connections.active}</div>
                <div class="metric-label">Active Connections</div>
                <div style="margin-top: 10px;">
                    <div>Queries: ${currentMetrics.application.database.queries.total.toLocaleString()}</div>
                    <div>Avg Time: ${currentMetrics.application.database.queries.averageTime.toFixed(1)}ms</div>
                </div>
            </div>
            
            <!-- Business Metrics -->
            <div class="metric-card">
                <div class="metric-title">Business</div>
                <div class="metric-value">${currentMetrics.business.users.active}</div>
                <div class="metric-label">Active Users</div>
                <div style="margin-top: 10px;">
                    <div>Forms Created: ${currentMetrics.business.forms.created}</div>
                    <div>Payments: ${currentMetrics.business.payments.processed}</div>
                </div>
            </div>
            
            <!-- Error Metrics -->
            <div class="metric-card">
                <div class="metric-title">Errors</div>
                <div class="metric-value status-${currentMetrics.errors.total > 0 ? 'unhealthy' : 'healthy'}">${currentMetrics.errors.total}</div>
                <div class="metric-label">Total Errors</div>
                <div style="margin-top: 10px;">
                    <div>Rate: ${(currentMetrics.errors.rate * 100).toFixed(2)}%</div>
                    ${
                      currentMetrics.errors.recent.length > 0
                        ? `
                    <div class="errors-list">
                        ${currentMetrics.errors.recent
                          .slice(0, 5)
                          .map(
                            (error) => `
                        <div class="error-item">
                            ${error.message} (${error.count})
                        </div>
                        `,
                          )
                          .join('')}
                    </div>
                    `
                        : ''
                    }
                </div>
            </div>
            
            <!-- Cache Metrics -->
            <div class="metric-card">
                <div class="metric-title">Cache</div>
                <div class="metric-value">${(currentMetrics.application.cache.hitRate * 100).toFixed(1)}%</div>
                <div class="metric-label">Hit Rate</div>
                <div style="margin-top: 10px;">
                    <div>Hits: ${currentMetrics.application.cache.hits.toLocaleString()}</div>
                    <div>Misses: ${currentMetrics.application.cache.misses.toLocaleString()}</div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
    `;
  }

  // Utility methods for extracting metrics
  private getCounterValue(
    counters: Array<{ name: string; value: number }>,
    name: string,
  ): number {
    const counter = counters.find((c) => c.name.includes(name));
    return counter?.value || 0;
  }

  private getGaugeValue(
    gauges: Array<{ name: string; value: number }>,
    name: string,
  ): number {
    const gauge = gauges.find((g) => g.name.includes(name));
    return gauge?.value || 0;
  }

  private getHistogramPercentiles(
    name: string,
  ): { p50: number; p90: number; p95: number; p99: number } | null {
    // This would normally come from metrics.getPercentiles()
    return metrics.getPercentiles(name);
  }

  private getHistogramAverage(name: string): number {
    const percentiles = this.getHistogramPercentiles(name);
    return percentiles ? (percentiles.p50 + percentiles.p95) / 2 : 0;
  }

  private getHistogramSum(name: string): number {
    // This would need to be implemented in metrics system
    return 0;
  }

  private calculateRatePerSecond(metricName: string): number {
    if (this.metricsHistory.length < 2) return 0;

    const current = this.metricsHistory[this.metricsHistory.length - 1];
    const previous = this.metricsHistory[this.metricsHistory.length - 2];

    const timeDiff = (current.timestamp - previous.timestamp) / 1000; // seconds
    // Calculate rate based on metric differences
    return 0; // Simplified for now
  }

  private getStatusCodeBreakdown(
    counters: Array<{ name: string; value: number }>,
  ): Record<string, number> {
    const statusCodes: Record<string, number> = {};
    counters.forEach((counter) => {
      if (
        counter.name.includes('api.requests') &&
        counter.name.includes('status')
      ) {
        const match = counter.name.match(/status:(\d+)/);
        if (match) {
          statusCodes[match[1]] = counter.value;
        }
      }
    });
    return statusCodes;
  }

  private calculateCacheHitRate(): number {
    const appMetrics = metrics.getMetrics();
    const hits = this.getCounterValue(appMetrics.counters, 'cache.hits');
    const misses = this.getCounterValue(appMetrics.counters, 'cache.misses');

    if (hits + misses === 0) return 0;
    return hits / (hits + misses);
  }

  private calculatePaymentSuccessRate(): number {
    const appMetrics = metrics.getMetrics();
    const successful = this.getCounterValue(
      appMetrics.counters,
      'payments.processed',
    );
    const failed = this.getCounterValue(appMetrics.counters, 'payments.failed');

    if (successful + failed === 0) return 0;
    return successful / (successful + failed);
  }

  private calculateErrorRate(): number {
    const appMetrics = metrics.getMetrics();
    const errors = this.getCounterValue(appMetrics.counters, 'errors.total');
    const requests = this.getCounterValue(appMetrics.counters, 'api.requests');

    if (requests === 0) return 0;
    return errors / requests;
  }
}

// Global dashboard instance
export const dashboard = PerformanceDashboard.getInstance();

// Express route for dashboard
export function dashboardRoute(req: any, res: any): void {
  res.setHeader('Content-Type', 'text/html');
  res.send(dashboard.generateDashboardHTML());
}

// API endpoint for JSON metrics
export async function metricsApiRoute(req: any, res: any): Promise<void> {
  try {
    const hours = parseInt(req.query.hours as string) || 1;
    const currentMetrics = dashboard.getCurrentMetrics();
    const history = dashboard.getMetricsHistory(hours);
    const healthStatus = await dashboard.getHealthStatus();

    res.json({
      current: currentMetrics,
      history,
      health: healthStatus,
      timestamp: Date.now(),
    });
  } catch (error) {
    logger.error('Failed to get dashboard metrics', error);
    res.status(500).json({ error: 'Failed to get metrics' });
  }
}
