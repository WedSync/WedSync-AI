/**
 * Progress System Integration Monitor
 * WS-224 Progress Charts System - Monitoring & Health Checks
 */

import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export interface SystemHealthMetrics {
  database: {
    status: 'healthy' | 'degraded' | 'critical';
    responseTime: number;
    errorRate: number;
    connectionCount: number;
  };
  realtime: {
    status: 'healthy' | 'degraded' | 'critical';
    activeSubscriptions: number;
    messageLatency: number;
    connectionErrors: number;
  };
  api: {
    status: 'healthy' | 'degraded' | 'critical';
    averageResponseTime: number;
    errorRate: number;
    throughput: number;
  };
  charts: {
    status: 'healthy' | 'degraded' | 'critical';
    activeCharts: number;
    refreshRate: number;
    renderErrors: number;
  };
}

export interface AlertThreshold {
  metric: string;
  warning: number;
  critical: number;
  unit: string;
}

export interface MonitoringEvent {
  timestamp: Date;
  component: 'database' | 'realtime' | 'api' | 'charts' | 'system';
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  metadata?: Record<string, any>;
}

export class ProgressSystemMonitor {
  private static instance: ProgressSystemMonitor;
  private supabase = createClient();
  private healthMetrics: SystemHealthMetrics | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private eventLog: MonitoringEvent[] = [];
  private maxLogSize = 1000;

  // Alert thresholds
  private readonly alertThresholds: AlertThreshold[] = [
    {
      metric: 'database.responseTime',
      warning: 1000,
      critical: 3000,
      unit: 'ms',
    },
    { metric: 'database.errorRate', warning: 0.05, critical: 0.1, unit: '%' },
    {
      metric: 'realtime.messageLatency',
      warning: 500,
      critical: 1500,
      unit: 'ms',
    },
    {
      metric: 'realtime.connectionErrors',
      warning: 5,
      critical: 20,
      unit: 'count',
    },
    {
      metric: 'api.averageResponseTime',
      warning: 2000,
      critical: 5000,
      unit: 'ms',
    },
    { metric: 'api.errorRate', warning: 0.02, critical: 0.05, unit: '%' },
    { metric: 'charts.renderErrors', warning: 3, critical: 10, unit: 'count' },
  ];

  public static getInstance(): ProgressSystemMonitor {
    if (!ProgressSystemMonitor.instance) {
      ProgressSystemMonitor.instance = new ProgressSystemMonitor();
    }
    return ProgressSystemMonitor.instance;
  }

  /**
   * Start system monitoring
   */
  public startMonitoring(intervalMs: number = 30000): void {
    console.log('🔍 Starting Progress System Monitor...');

    // Initial health check
    this.performHealthCheck();

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, intervalMs);

    // Set up real-time error tracking
    this.setupErrorTracking();

    this.logEvent('system', 'info', 'Progress system monitoring started', {
      interval: intervalMs,
      thresholds: this.alertThresholds.length,
    });
  }

  /**
   * Stop system monitoring
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('🛑 Progress System Monitor stopped');
    this.logEvent('system', 'info', 'Progress system monitoring stopped');
  }

  /**
   * Perform comprehensive health check
   */
  public async performHealthCheck(): Promise<SystemHealthMetrics> {
    const startTime = Date.now();

    try {
      const [databaseHealth, realtimeHealth, apiHealth, chartsHealth] =
        await Promise.allSettled([
          this.checkDatabaseHealth(),
          this.checkRealtimeHealth(),
          this.checkApiHealth(),
          this.checkChartsHealth(),
        ]);

      this.healthMetrics = {
        database:
          databaseHealth.status === 'fulfilled'
            ? databaseHealth.value
            : this.getErrorState('database'),
        realtime:
          realtimeHealth.status === 'fulfilled'
            ? realtimeHealth.value
            : this.getErrorState('realtime'),
        api:
          apiHealth.status === 'fulfilled'
            ? apiHealth.value
            : this.getErrorState('api'),
        charts:
          chartsHealth.status === 'fulfilled'
            ? chartsHealth.value
            : this.getErrorState('charts'),
      };

      // Check alert thresholds
      this.checkAlertThresholds(this.healthMetrics);

      const totalTime = Date.now() - startTime;
      this.logEvent(
        'system',
        'info',
        `Health check completed in ${totalTime}ms`,
        {
          metrics: this.healthMetrics,
          duration: totalTime,
        },
      );

      return this.healthMetrics;
    } catch (error) {
      this.logEvent('system', 'error', 'Health check failed', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Check database health
   */
  private async checkDatabaseHealth(): Promise<
    SystemHealthMetrics['database']
  > {
    const startTime = Date.now();

    try {
      // Test basic connectivity
      const { data: pingResult, error: pingError } = await this.supabase
        .from('organizations')
        .select('count')
        .limit(1);

      const responseTime = Date.now() - startTime;

      if (pingError) {
        throw new Error(`Database ping failed: ${pingError.message}`);
      }

      // Check progress tables specifically
      const { data: progressTables, error: tablesError } = await this.supabase
        .from('progress_metrics')
        .select('count')
        .limit(1);

      if (tablesError) {
        this.logEvent('database', 'warning', 'Progress tables inaccessible', {
          error: tablesError.message,
        });
      }

      // Estimate error rate (simplified)
      const errorRate = tablesError ? 0.1 : 0.01;

      const status =
        responseTime > 3000
          ? 'critical'
          : responseTime > 1000
            ? 'degraded'
            : 'healthy';

      return {
        status,
        responseTime,
        errorRate,
        connectionCount: 1, // Simplified - actual connection pooling info not available
      };
    } catch (error) {
      this.logEvent('database', 'critical', 'Database health check failed', {
        error: error.message,
      });
      return {
        status: 'critical',
        responseTime: Date.now() - startTime,
        errorRate: 1.0,
        connectionCount: 0,
      };
    }
  }

  /**
   * Check real-time connection health
   */
  private async checkRealtimeHealth(): Promise<
    SystemHealthMetrics['realtime']
  > {
    const startTime = Date.now();

    try {
      // Test real-time subscription
      const testChannel = this.supabase.channel('health_check');

      let messageReceived = false;
      let latency = 0;

      const subscription = testChannel
        .on('broadcast', { event: 'health_ping' }, (payload) => {
          messageReceived = true;
          latency = Date.now() - payload.timestamp;
        })
        .subscribe();

      // Send test message
      const testTimestamp = Date.now();
      await testChannel.send({
        type: 'broadcast',
        event: 'health_ping',
        payload: { timestamp: testTimestamp },
      });

      // Wait for response or timeout
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Cleanup
      await this.supabase.removeChannel(testChannel);

      const status =
        latency > 1500 ? 'critical' : latency > 500 ? 'degraded' : 'healthy';

      return {
        status,
        activeSubscriptions: 1, // Simplified
        messageLatency: messageReceived ? latency : 2000,
        connectionErrors: messageReceived ? 0 : 1,
      };
    } catch (error) {
      this.logEvent('realtime', 'error', 'Real-time health check failed', {
        error: error.message,
      });
      return {
        status: 'critical',
        activeSubscriptions: 0,
        messageLatency: Date.now() - startTime,
        connectionErrors: 1,
      };
    }
  }

  /**
   * Check API endpoint health
   */
  private async checkApiHealth(): Promise<SystemHealthMetrics['api']> {
    const startTime = Date.now();
    const testEndpoints = ['/api/progress', '/api/progress/charts'];

    const results = await Promise.allSettled(
      testEndpoints.map((endpoint) =>
        fetch(endpoint + '?health_check=true', {
          method: 'HEAD',
          headers: { 'Cache-Control': 'no-cache' },
        }),
      ),
    );

    const successCount = results.filter(
      (result) => result.status === 'fulfilled' && result.value.ok,
    ).length;

    const errorRate = 1 - successCount / testEndpoints.length;
    const averageResponseTime = Date.now() - startTime;
    const throughput = testEndpoints.length / (averageResponseTime / 1000); // requests per second

    const status =
      errorRate > 0.05
        ? 'critical'
        : errorRate > 0.02
          ? 'degraded'
          : averageResponseTime > 5000
            ? 'critical'
            : averageResponseTime > 2000
              ? 'degraded'
              : 'healthy';

    return {
      status,
      averageResponseTime,
      errorRate,
      throughput,
    };
  }

  /**
   * Check chart rendering health
   */
  private async checkChartsHealth(): Promise<SystemHealthMetrics['charts']> {
    // This would typically involve checking DOM elements, canvas rendering, etc.
    // Simplified implementation for server-side monitoring

    try {
      // Check if chart libraries are available (client-side check)
      const hasChartLibraries =
        (typeof window !== 'undefined' &&
          (window as any).Chart !== undefined) ||
        (window as any).Recharts !== undefined;

      // Estimate active charts (would be tracked in real implementation)
      const activeCharts = 5; // Placeholder
      const refreshRate = 300; // seconds
      const renderErrors = 0; // Would track actual render errors

      const status =
        renderErrors > 10
          ? 'critical'
          : renderErrors > 3
            ? 'degraded'
            : 'healthy';

      return {
        status,
        activeCharts,
        refreshRate,
        renderErrors,
      };
    } catch (error) {
      this.logEvent('charts', 'error', 'Chart health check failed', {
        error: error.message,
      });
      return {
        status: 'critical',
        activeCharts: 0,
        refreshRate: 0,
        renderErrors: 1,
      };
    }
  }

  /**
   * Set up error tracking for real-time error detection
   */
  private setupErrorTracking(): void {
    // Track unhandled errors
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.logEvent('system', 'error', 'Unhandled JavaScript error', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.logEvent('system', 'error', 'Unhandled promise rejection', {
          reason: event.reason,
        });
      });
    }

    // Track Supabase errors
    this.supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' && session === null) {
        this.logEvent(
          'database',
          'warning',
          'User signed out - may affect monitoring',
        );
      }
    });
  }

  /**
   * Check if metrics exceed alert thresholds
   */
  private checkAlertThresholds(metrics: SystemHealthMetrics): void {
    this.alertThresholds.forEach((threshold) => {
      const value = this.getNestedValue(metrics, threshold.metric);

      if (value !== null && value !== undefined) {
        if (value >= threshold.critical) {
          this.triggerAlert('critical', threshold.metric, value, threshold);
        } else if (value >= threshold.warning) {
          this.triggerAlert('warning', threshold.metric, value, threshold);
        }
      }
    });
  }

  /**
   * Trigger alert when threshold is exceeded
   */
  private triggerAlert(
    level: 'warning' | 'critical',
    metric: string,
    value: number,
    threshold: AlertThreshold,
  ): void {
    const message = `${metric} is ${level}: ${value}${threshold.unit} (threshold: ${level === 'critical' ? threshold.critical : threshold.warning}${threshold.unit})`;

    this.logEvent(
      'system',
      level === 'critical' ? 'critical' : 'warning',
      message,
      {
        metric,
        value,
        threshold: threshold[level],
        unit: threshold.unit,
      },
    );

    // Show user notification
    if (level === 'critical') {
      toast.error(`System Alert: ${message}`);
    } else {
      toast.warning(`System Warning: ${message}`);
    }

    // Could send to external monitoring service here
    console.warn(`🚨 ALERT [${level.toUpperCase()}]: ${message}`);
  }

  /**
   * Log monitoring event
   */
  private logEvent(
    component: MonitoringEvent['component'],
    level: MonitoringEvent['level'],
    message: string,
    metadata?: Record<string, any>,
  ): void {
    const event: MonitoringEvent = {
      timestamp: new Date(),
      component,
      level,
      message,
      metadata,
    };

    this.eventLog.push(event);

    // Trim log if it gets too large
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog = this.eventLog.slice(-this.maxLogSize);
    }

    // Console logging with appropriate level
    const logMethod =
      level === 'error' || level === 'critical'
        ? console.error
        : level === 'warning'
          ? console.warn
          : console.info;

    logMethod(`[${component.toUpperCase()}] ${message}`, metadata || {});
  }

  /**
   * Get error state for failed component
   */
  private getErrorState(component: string): any {
    const baseState = {
      status: 'critical' as const,
    };

    switch (component) {
      case 'database':
        return {
          ...baseState,
          responseTime: 0,
          errorRate: 1.0,
          connectionCount: 0,
        };
      case 'realtime':
        return {
          ...baseState,
          activeSubscriptions: 0,
          messageLatency: 0,
          connectionErrors: 1,
        };
      case 'api':
        return {
          ...baseState,
          averageResponseTime: 0,
          errorRate: 1.0,
          throughput: 0,
        };
      case 'charts':
        return {
          ...baseState,
          activeCharts: 0,
          refreshRate: 0,
          renderErrors: 1,
        };
      default:
        return baseState;
    }
  }

  /**
   * Get nested object value by dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Get current health metrics
   */
  public getHealthMetrics(): SystemHealthMetrics | null {
    return this.healthMetrics;
  }

  /**
   * Get recent monitoring events
   */
  public getRecentEvents(limit: number = 50): MonitoringEvent[] {
    return this.eventLog.slice(-limit);
  }

  /**
   * Get system status summary
   */
  public getSystemStatus(): 'healthy' | 'degraded' | 'critical' {
    if (!this.healthMetrics) return 'critical';

    const statuses = [
      this.healthMetrics.database.status,
      this.healthMetrics.realtime.status,
      this.healthMetrics.api.status,
      this.healthMetrics.charts.status,
    ];

    if (statuses.includes('critical')) return 'critical';
    if (statuses.includes('degraded')) return 'degraded';
    return 'healthy';
  }

  /**
   * Export monitoring data for external systems
   */
  public exportMonitoringData(): {
    timestamp: string;
    systemStatus: string;
    healthMetrics: SystemHealthMetrics | null;
    recentEvents: MonitoringEvent[];
    alertThresholds: AlertThreshold[];
  } {
    return {
      timestamp: new Date().toISOString(),
      systemStatus: this.getSystemStatus(),
      healthMetrics: this.healthMetrics,
      recentEvents: this.getRecentEvents(),
      alertThresholds: this.alertThresholds,
    };
  }

  /**
   * Wedding day monitoring mode - enhanced monitoring during critical periods
   */
  public enableWeddingDayMode(): void {
    console.log('💒 Enabling Wedding Day Monitoring Mode');

    // Increase monitoring frequency
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, 10000); // Every 10 seconds during wedding day

    // Lower alert thresholds for wedding day
    this.alertThresholds.forEach((threshold) => {
      threshold.warning *= 0.5; // More sensitive warnings
      threshold.critical *= 0.7; // More sensitive critical alerts
    });

    this.logEvent('system', 'info', 'Wedding Day monitoring mode activated', {
      enhancedFrequency: '10s',
      sensitiveAlerts: true,
    });

    toast.info('🎉 Wedding Day mode activated - Enhanced monitoring enabled');
  }

  /**
   * Disable wedding day mode
   */
  public disableWeddingDayMode(): void {
    console.log('💒 Disabling Wedding Day Monitoring Mode');

    // Reset to normal monitoring frequency
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.startMonitoring(30000); // Back to 30 seconds

    // Reset alert thresholds
    this.alertThresholds.forEach((threshold) => {
      threshold.warning /= 0.5; // Reset warnings
      threshold.critical /= 0.7; // Reset critical alerts
    });

    this.logEvent('system', 'info', 'Wedding Day monitoring mode deactivated');
    toast.info('Wedding Day mode deactivated - Normal monitoring resumed');
  }
}

// Export singleton instance
export const progressSystemMonitor = ProgressSystemMonitor.getInstance();
export default ProgressSystemMonitor;
