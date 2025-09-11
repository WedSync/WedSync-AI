import { createClient } from '@supabase/supabase-js';

export interface PerformanceMetric {
  id: string;
  metric_name: string;
  metric_value: number;
  metric_unit: string;
  timestamp: Date;
  venue_id?: string;
  user_id?: string;
  endpoint?: string;
  device_type?: 'mobile' | 'desktop' | 'tablet';
  connection_type?: 'slow-2g' | '2g' | '3g' | '4g' | 'wifi' | 'unknown';
  location?: {
    country: string;
    city: string;
    coordinates?: { lat: number; lng: number };
  };
  metadata?: Record<string, any>;
}

export interface AlertThreshold {
  id: string;
  metric_name: string;
  threshold_value: number;
  comparison: 'greater_than' | 'less_than' | 'equals';
  severity: 'low' | 'medium' | 'high' | 'critical';
  notification_channels: ('email' | 'sms' | 'push' | 'slack')[];
  is_active: boolean;
  cooldown_period: number; // seconds
}

export interface PerformanceAlert {
  id: string;
  threshold_id: string;
  metric_name: string;
  current_value: number;
  threshold_value: number;
  severity: AlertThreshold['severity'];
  message: string;
  timestamp: Date;
  venue_id?: string;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: Date;
}

export class PerformanceMonitor {
  private supabase;
  private metrics: PerformanceMetric[] = [];
  private thresholds: AlertThreshold[] = [];
  private activeAlerts: Map<string, PerformanceAlert> = new Map();
  private alertCooldowns: Map<string, Date> = new Map();
  private metricsBuffer: PerformanceMetric[] = [];
  private flushInterval: NodeJS.Timeout;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.initializeDefaultThresholds();
    this.startMetricsBuffering();
  }

  private initializeDefaultThresholds() {
    this.thresholds = [
      // Critical performance thresholds
      {
        id: 'response-time-critical',
        metric_name: 'response_time',
        threshold_value: 2000, // 2 seconds
        comparison: 'greater_than',
        severity: 'critical',
        notification_channels: ['email', 'sms', 'push'],
        is_active: true,
        cooldown_period: 60,
      },
      {
        id: 'error-rate-high',
        metric_name: 'error_rate',
        threshold_value: 5, // 5%
        comparison: 'greater_than',
        severity: 'high',
        notification_channels: ['email', 'push'],
        is_active: true,
        cooldown_period: 120,
      },
      // Wedding-specific thresholds
      {
        id: 'mobile-response-wedding',
        metric_name: 'mobile_response_time',
        threshold_value: 1500, // 1.5 seconds for mobile during weddings
        comparison: 'greater_than',
        severity: 'high',
        notification_channels: ['email', 'push'],
        is_active: true,
        cooldown_period: 30,
      },
      {
        id: 'venue-upload-speed',
        metric_name: 'photo_upload_time',
        threshold_value: 10000, // 10 seconds
        comparison: 'greater_than',
        severity: 'medium',
        notification_channels: ['email'],
        is_active: true,
        cooldown_period: 300,
      },
      // Database performance
      {
        id: 'db-query-time',
        metric_name: 'database_query_time',
        threshold_value: 500, // 500ms
        comparison: 'greater_than',
        severity: 'medium',
        notification_channels: ['email'],
        is_active: true,
        cooldown_period: 180,
      },
      // Memory and CPU
      {
        id: 'memory-usage-critical',
        metric_name: 'memory_usage',
        threshold_value: 90, // 90%
        comparison: 'greater_than',
        severity: 'critical',
        notification_channels: ['email', 'sms'],
        is_active: true,
        cooldown_period: 60,
      },
    ];
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    this.metricsBuffer.push(fullMetric);
    this.evaluateThresholds(fullMetric);

    // If buffer is getting large, flush immediately
    if (this.metricsBuffer.length >= 100) {
      this.flushMetrics();
    }
  }

  /**
   * Record multiple metrics at once (bulk operation)
   */
  recordMetrics(metrics: Omit<PerformanceMetric, 'id' | 'timestamp'>[]): void {
    const timestamp = new Date();
    const fullMetrics = metrics.map((metric) => ({
      ...metric,
      id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp,
    }));

    this.metricsBuffer.push(...fullMetrics);

    // Evaluate thresholds for each metric
    fullMetrics.forEach((metric) => this.evaluateThresholds(metric));
  }

  /**
   * Web Vitals integration for frontend performance
   */
  recordWebVital(
    name: string,
    value: number,
    context: {
      page?: string;
      device_type?: PerformanceMetric['device_type'];
      connection_type?: PerformanceMetric['connection_type'];
      venue_id?: string;
      user_id?: string;
    },
  ): void {
    this.recordMetric({
      metric_name: `web_vital_${name}`,
      metric_value: value,
      metric_unit: name === 'CLS' ? 'score' : 'ms',
      venue_id: context.venue_id,
      user_id: context.user_id,
      device_type: context.device_type,
      connection_type: context.connection_type,
      metadata: {
        page: context.page,
        web_vital: name,
      },
    });
  }

  /**
   * Database performance tracking
   */
  recordDatabaseMetric(
    queryName: string,
    executionTime: number,
    rowCount?: number,
    venueId?: string,
  ): void {
    this.recordMetric({
      metric_name: 'database_query_time',
      metric_value: executionTime,
      metric_unit: 'ms',
      venue_id: venueId,
      endpoint: queryName,
      metadata: {
        query_name: queryName,
        row_count: rowCount,
        query_type: this.getQueryType(queryName),
      },
    });
  }

  private getQueryType(queryName: string): string {
    if (queryName.toLowerCase().includes('select')) return 'read';
    if (queryName.toLowerCase().includes('insert')) return 'write';
    if (queryName.toLowerCase().includes('update')) return 'update';
    if (queryName.toLowerCase().includes('delete')) return 'delete';
    return 'other';
  }

  /**
   * API endpoint performance tracking
   */
  recordAPIMetric(
    endpoint: string,
    responseTime: number,
    statusCode: number,
    context: {
      method: string;
      venue_id?: string;
      user_id?: string;
      request_size?: number;
      response_size?: number;
    },
  ): void {
    this.recordMetric({
      metric_name: 'api_response_time',
      metric_value: responseTime,
      metric_unit: 'ms',
      endpoint: endpoint,
      venue_id: context.venue_id,
      user_id: context.user_id,
      metadata: {
        method: context.method,
        status_code: statusCode,
        request_size: context.request_size,
        response_size: context.response_size,
        is_error: statusCode >= 400,
      },
    });

    // Record error rate
    this.recordMetric({
      metric_name: 'error_rate',
      metric_value: statusCode >= 400 ? 1 : 0,
      metric_unit: 'boolean',
      endpoint: endpoint,
      venue_id: context.venue_id,
      metadata: {
        status_code: statusCode,
      },
    });
  }

  /**
   * Mobile-specific performance tracking for wedding venues
   */
  recordMobileMetric(
    action: string,
    duration: number,
    context: {
      venue_id: string;
      device_info?: {
        model: string;
        os: string;
        browser: string;
      };
      network_info?: {
        type: PerformanceMetric['connection_type'];
        speed?: number;
      };
      location?: PerformanceMetric['location'];
    },
  ): void {
    this.recordMetric({
      metric_name: 'mobile_action_time',
      metric_value: duration,
      metric_unit: 'ms',
      venue_id: context.venue_id,
      device_type: 'mobile',
      connection_type: context.network_info?.type,
      location: context.location,
      metadata: {
        action: action,
        device_info: context.device_info,
        network_speed: context.network_info?.speed,
      },
    });
  }

  /**
   * Photo upload performance tracking (critical for wedding photography)
   */
  recordPhotoUploadMetric(
    uploadTime: number,
    fileSize: number,
    context: {
      venue_id: string;
      user_id: string;
      connection_type?: PerformanceMetric['connection_type'];
      compression_used?: boolean;
      upload_method?: 'single' | 'batch';
    },
  ): void {
    this.recordMetric({
      metric_name: 'photo_upload_time',
      metric_value: uploadTime,
      metric_unit: 'ms',
      venue_id: context.venue_id,
      user_id: context.user_id,
      connection_type: context.connection_type,
      metadata: {
        file_size: fileSize,
        compression_used: context.compression_used,
        upload_method: context.upload_method,
        upload_speed: fileSize / (uploadTime / 1000), // bytes per second
      },
    });
  }

  /**
   * Real-time threshold evaluation
   */
  private evaluateThresholds(metric: PerformanceMetric): void {
    const relevantThresholds = this.thresholds.filter(
      (threshold) =>
        threshold.is_active && threshold.metric_name === metric.metric_name,
    );

    for (const threshold of relevantThresholds) {
      // Check cooldown period
      const cooldownKey = `${threshold.id}_${metric.venue_id || 'global'}`;
      const lastAlert = this.alertCooldowns.get(cooldownKey);
      if (
        lastAlert &&
        Date.now() - lastAlert.getTime() < threshold.cooldown_period * 1000
      ) {
        continue;
      }

      // Evaluate threshold
      const thresholdBreached = this.evaluateThresholdCondition(
        metric.metric_value,
        threshold.threshold_value,
        threshold.comparison,
      );

      if (thresholdBreached) {
        this.createAlert(threshold, metric);
        this.alertCooldowns.set(cooldownKey, new Date());
      }
    }
  }

  private evaluateThresholdCondition(
    value: number,
    threshold: number,
    comparison: string,
  ): boolean {
    switch (comparison) {
      case 'greater_than':
        return value > threshold;
      case 'less_than':
        return value < threshold;
      case 'equals':
        return value === threshold;
      default:
        return false;
    }
  }

  private async createAlert(
    threshold: AlertThreshold,
    metric: PerformanceMetric,
  ): Promise<void> {
    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      threshold_id: threshold.id,
      metric_name: metric.metric_name,
      current_value: metric.metric_value,
      threshold_value: threshold.threshold_value,
      severity: threshold.severity,
      message: this.generateAlertMessage(threshold, metric),
      timestamp: new Date(),
      venue_id: metric.venue_id,
      acknowledged: false,
    };

    this.activeAlerts.set(alert.id, alert);

    // Send notifications
    await this.sendAlertNotifications(alert, threshold.notification_channels);

    console.log(`Performance alert created: ${alert.message}`);
  }

  private generateAlertMessage(
    threshold: AlertThreshold,
    metric: PerformanceMetric,
  ): string {
    const venue = metric.venue_id ? ` (Venue: ${metric.venue_id})` : '';
    const endpoint = metric.endpoint ? ` on ${metric.endpoint}` : '';

    return (
      `${threshold.severity.toUpperCase()}: ${metric.metric_name} is ${metric.metric_value}${metric.metric_unit}, ` +
      `exceeding threshold of ${threshold.threshold_value}${metric.metric_unit}${endpoint}${venue}`
    );
  }

  private async sendAlertNotifications(
    alert: PerformanceAlert,
    channels: AlertThreshold['notification_channels'],
  ): Promise<void> {
    for (const channel of channels) {
      try {
        switch (channel) {
          case 'email':
            await this.sendEmailAlert(alert);
            break;
          case 'sms':
            await this.sendSMSAlert(alert);
            break;
          case 'push':
            await this.sendPushAlert(alert);
            break;
          case 'slack':
            await this.sendSlackAlert(alert);
            break;
        }
      } catch (error) {
        console.error(`Failed to send ${channel} alert:`, error);
      }
    }
  }

  private async sendEmailAlert(alert: PerformanceAlert): Promise<void> {
    // In production, integrate with email service (Resend, SendGrid, etc.)
    console.log(`Email alert: ${alert.message}`);
  }

  private async sendSMSAlert(alert: PerformanceAlert): Promise<void> {
    // In production, integrate with SMS service (Twilio, etc.)
    console.log(`SMS alert: ${alert.message}`);
  }

  private async sendPushAlert(alert: PerformanceAlert): Promise<void> {
    // In production, integrate with push notification service
    console.log(`Push alert: ${alert.message}`);
  }

  private async sendSlackAlert(alert: PerformanceAlert): Promise<void> {
    // In production, integrate with Slack API
    console.log(`Slack alert: ${alert.message}`);
  }

  /**
   * Flush metrics to database periodically
   */
  private startMetricsBuffering(): void {
    this.flushInterval = setInterval(() => {
      if (this.metricsBuffer.length > 0) {
        this.flushMetrics();
      }
    }, 10000); // Flush every 10 seconds
  }

  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    const metricsToFlush = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      // In production, insert into Supabase
      console.log(`Flushing ${metricsToFlush.length} metrics to database`);

      // Batch insert for better performance
      const batchSize = 50;
      for (let i = 0; i < metricsToFlush.length; i += batchSize) {
        const batch = metricsToFlush.slice(i, i + batchSize);
        await this.insertMetricsBatch(batch);
      }
    } catch (error) {
      console.error('Failed to flush metrics:', error);
      // Re-add failed metrics back to buffer for retry
      this.metricsBuffer.unshift(...metricsToFlush);
    }
  }

  private async insertMetricsBatch(
    metrics: PerformanceMetric[],
  ): Promise<void> {
    // In production, insert into Supabase performance_metrics table
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate DB insert
  }

  /**
   * Get performance summary for dashboard
   */
  getPerformanceSummary(
    venueId?: string,
    timeRange?: number,
  ): {
    averageResponseTime: number;
    errorRate: number;
    throughput: number;
    activeAlerts: PerformanceAlert[];
    topSlowEndpoints: Array<{ endpoint: string; avgTime: number }>;
  } {
    const now = Date.now();
    const cutoff = timeRange ? now - timeRange : now - 60 * 60 * 1000; // Last hour by default

    const recentMetrics = this.metrics.filter(
      (metric) =>
        metric.timestamp.getTime() > cutoff &&
        (!venueId || metric.venue_id === venueId),
    );

    const responseTimeMetrics = recentMetrics.filter(
      (m) => m.metric_name === 'api_response_time',
    );
    const errorMetrics = recentMetrics.filter(
      (m) => m.metric_name === 'error_rate',
    );

    return {
      averageResponseTime:
        responseTimeMetrics.length > 0
          ? responseTimeMetrics.reduce((sum, m) => sum + m.metric_value, 0) /
            responseTimeMetrics.length
          : 0,
      errorRate:
        errorMetrics.length > 0
          ? (errorMetrics.filter((m) => m.metric_value > 0).length /
              errorMetrics.length) *
            100
          : 0,
      throughput: responseTimeMetrics.length,
      activeAlerts: Array.from(this.activeAlerts.values()).filter(
        (alert) => !alert.acknowledged,
      ),
      topSlowEndpoints: this.getTopSlowEndpoints(responseTimeMetrics, 5),
    };
  }

  private getTopSlowEndpoints(
    metrics: PerformanceMetric[],
    limit: number,
  ): Array<{ endpoint: string; avgTime: number }> {
    const endpointTimes = new Map<string, number[]>();

    metrics.forEach((metric) => {
      if (metric.endpoint) {
        if (!endpointTimes.has(metric.endpoint)) {
          endpointTimes.set(metric.endpoint, []);
        }
        endpointTimes.get(metric.endpoint)!.push(metric.metric_value);
      }
    });

    const averages = Array.from(endpointTimes.entries()).map(
      ([endpoint, times]) => ({
        endpoint,
        avgTime: times.reduce((sum, time) => sum + time, 0) / times.length,
      }),
    );

    return averages.sort((a, b) => b.avgTime - a.avgTime).slice(0, limit);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.acknowledged = true;
    alert.acknowledged_by = acknowledgedBy;
    alert.acknowledged_at = new Date();

    return true;
  }

  /**
   * Add or update threshold
   */
  updateThreshold(threshold: AlertThreshold): void {
    const index = this.thresholds.findIndex((t) => t.id === threshold.id);
    if (index >= 0) {
      this.thresholds[index] = threshold;
    } else {
      this.thresholds.push(threshold);
    }
  }

  /**
   * Cleanup on shutdown
   */
  shutdown(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flushMetrics(); // Final flush
  }
}

// Factory function for creating performance monitor
export function createPerformanceMonitor(): PerformanceMonitor {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return new PerformanceMonitor(supabaseUrl, supabaseKey);
}

// Global performance monitor instance
let globalMonitor: PerformanceMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = createPerformanceMonitor();
  }
  return globalMonitor;
}

// Middleware helper for Next.js API routes
export function withPerformanceTracking<T extends any[]>(
  fn: (...args: T) => Promise<Response>,
  endpointName: string,
) {
  return async (...args: T): Promise<Response> => {
    const startTime = Date.now();
    const monitor = getPerformanceMonitor();

    try {
      const response = await fn(...args);
      const duration = Date.now() - startTime;

      monitor.recordAPIMetric(endpointName, duration, response.status, {
        method: 'POST', // Could be extracted from request
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      monitor.recordAPIMetric(endpointName, duration, 500, {
        method: 'POST',
      });
      throw error;
    }
  };
}
