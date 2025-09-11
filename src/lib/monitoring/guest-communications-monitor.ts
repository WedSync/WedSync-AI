/**
 * WS-155: Guest Communications Production Monitoring
 * Complete observability and alerting system
 */

import * as Sentry from '@sentry/nextjs';
import { createClient } from '@supabase/supabase-js';
import { Redis } from 'ioredis';
import * as prom from 'prom-client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

// Prometheus metrics
const messagesSentCounter = new prom.Counter({
  name: 'guest_communications_messages_sent_total',
  help: 'Total number of messages sent',
  labelNames: ['type', 'status', 'channel'],
});

const messageProcessingDuration = new prom.Histogram({
  name: 'guest_communications_processing_duration_seconds',
  help: 'Duration of message processing',
  labelNames: ['operation', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

const activeConnections = new prom.Gauge({
  name: 'guest_communications_active_connections',
  help: 'Number of active WebSocket connections',
  labelNames: ['type'],
});

const queueSize = new prom.Gauge({
  name: 'guest_communications_queue_size',
  help: 'Current size of message queue',
  labelNames: ['priority'],
});

const errorRate = new prom.Gauge({
  name: 'guest_communications_error_rate',
  help: 'Current error rate percentage',
  labelNames: ['type'],
});

const deliveryRate = new prom.Gauge({
  name: 'guest_communications_delivery_rate',
  help: 'Message delivery success rate',
  labelNames: ['channel'],
});

export interface MonitoringConfig {
  enableSentry: boolean;
  enablePrometheus: boolean;
  enableCustomAlerts: boolean;
  alertThresholds: {
    errorRatePercent: number;
    responseTimeMs: number;
    queueSizeMax: number;
    deliveryRateMin: number;
  };
}

export interface MessageMetrics {
  messageId: string;
  type: 'email' | 'sms' | 'push' | 'in_app';
  status: 'sent' | 'delivered' | 'failed' | 'bounced';
  channel: string;
  recipientId: string;
  timestamp: Date;
  processingTime: number;
  metadata?: Record<string, any>;
}

export interface AlertConfig {
  id: string;
  name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  condition: string;
  threshold: number;
  action: 'log' | 'email' | 'slack' | 'pagerduty';
  cooldown: number; // minutes
}

export class GuestCommunicationsMonitor {
  private config: MonitoringConfig;
  private alerts: Map<string, AlertConfig> = new Map();
  private lastAlertTime: Map<string, Date> = new Map();
  private metricsBuffer: MessageMetrics[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(config: MonitoringConfig) {
    this.config = config;
    this.initializeAlerts();
    this.startMetricsCollection();
  }

  private initializeAlerts() {
    // Critical alerts
    this.registerAlert({
      id: 'high_error_rate',
      name: 'High Error Rate',
      severity: 'critical',
      condition: 'error_rate',
      threshold: 5, // 5%
      action: 'pagerduty',
      cooldown: 15,
    });

    this.registerAlert({
      id: 'low_delivery_rate',
      name: 'Low Delivery Rate',
      severity: 'high',
      condition: 'delivery_rate',
      threshold: 90, // 90%
      action: 'slack',
      cooldown: 30,
    });

    this.registerAlert({
      id: 'queue_overflow',
      name: 'Queue Overflow',
      severity: 'high',
      condition: 'queue_size',
      threshold: 10000,
      action: 'email',
      cooldown: 20,
    });

    this.registerAlert({
      id: 'slow_processing',
      name: 'Slow Message Processing',
      severity: 'medium',
      condition: 'processing_time',
      threshold: 5000, // 5 seconds
      action: 'log',
      cooldown: 60,
    });

    this.registerAlert({
      id: 'compliance_violation',
      name: 'Compliance Violation Detected',
      severity: 'critical',
      condition: 'compliance',
      threshold: 1,
      action: 'pagerduty',
      cooldown: 0, // Always alert
    });
  }

  private registerAlert(alert: AlertConfig) {
    this.alerts.set(alert.id, alert);
  }

  private startMetricsCollection() {
    // Flush metrics every 10 seconds
    this.flushInterval = setInterval(() => {
      this.flushMetrics();
    }, 10000);

    // Collect system metrics every minute
    setInterval(() => {
      this.collectSystemMetrics();
    }, 60000);
  }

  async recordMessageSent(metrics: MessageMetrics) {
    // Update Prometheus metrics
    messagesSentCounter.inc({
      type: metrics.type,
      status: metrics.status,
      channel: metrics.channel,
    });

    messageProcessingDuration.observe(
      {
        operation: 'send',
        status: metrics.status,
      },
      metrics.processingTime / 1000, // Convert to seconds
    );

    // Buffer metrics for batch processing
    this.metricsBuffer.push(metrics);

    // Check for immediate alerts
    await this.checkAlerts(metrics);

    // Send to Sentry if enabled
    if (this.config.enableSentry && metrics.status === 'failed') {
      Sentry.captureException(new Error('Message send failed'), {
        extra: {
          messageId: metrics.messageId,
          type: metrics.type,
          status: metrics.status,
          channel: metrics.channel,
          recipientId: metrics.recipientId,
          timestamp: metrics.timestamp.toISOString(),
          processingTime: metrics.processingTime,
          metadata: JSON.stringify(metrics.metadata),
        },
      });
    }
  }

  private async flushMetrics() {
    if (this.metricsBuffer.length === 0) return;

    const batch = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      // Store in database for long-term analytics
      const { error } = await supabase
        .from('guest_communication_metrics')
        .insert(
          batch.map((m) => ({
            message_id: m.messageId,
            type: m.type,
            status: m.status,
            channel: m.channel,
            recipient_id: m.recipientId,
            timestamp: m.timestamp,
            processing_time: m.processingTime,
            metadata: m.metadata,
          })),
        );

      if (error) {
        console.error('Failed to flush metrics:', error);
        // Re-add to buffer for retry
        this.metricsBuffer.unshift(...batch);
      }

      // Update aggregated metrics in Redis
      await this.updateAggregatedMetrics(batch);
    } catch (error) {
      console.error('Error flushing metrics:', error);
      Sentry.captureException(error);
    }
  }

  private async updateAggregatedMetrics(batch: MessageMetrics[]) {
    const pipeline = redis.pipeline();

    // Update hourly counters
    const hour = new Date().toISOString().slice(0, 13);

    for (const metric of batch) {
      pipeline.hincrby(
        `metrics:${hour}:count`,
        `${metric.type}:${metric.status}`,
        1,
      );

      pipeline.lpush(`metrics:${hour}:processing_times`, metric.processingTime);
      pipeline.ltrim(`metrics:${hour}:processing_times`, 0, 999);
    }

    await pipeline.exec();
  }

  private async collectSystemMetrics() {
    try {
      // Get queue sizes
      const emailQueue = await redis.llen('queue:email');
      const smsQueue = await redis.llen('queue:sms');
      const pushQueue = await redis.llen('queue:push');

      queueSize.set({ priority: 'email' }, emailQueue);
      queueSize.set({ priority: 'sms' }, smsQueue);
      queueSize.set({ priority: 'push' }, pushQueue);

      // Calculate delivery rates
      const stats = await this.getRecentStats();

      if (stats.total > 0) {
        const emailDeliveryRate =
          (stats.emailDelivered / stats.emailTotal) * 100;
        const smsDeliveryRate = (stats.smsDelivered / stats.smsTotal) * 100;

        deliveryRate.set({ channel: 'email' }, emailDeliveryRate);
        deliveryRate.set({ channel: 'sms' }, smsDeliveryRate);

        const overallErrorRate = (stats.failed / stats.total) * 100;
        errorRate.set({ type: 'overall' }, overallErrorRate);
      }
    } catch (error) {
      console.error('Error collecting system metrics:', error);
      Sentry.captureException(error);
    }
  }

  private async getRecentStats() {
    const hour = new Date().toISOString().slice(0, 13);
    const stats = await redis.hgetall(`metrics:${hour}:count`);

    let total = 0;
    let failed = 0;
    let emailTotal = 0;
    let emailDelivered = 0;
    let smsTotal = 0;
    let smsDelivered = 0;

    for (const [key, value] of Object.entries(stats)) {
      const count = parseInt(value as string);
      const [type, status] = key.split(':');

      total += count;

      if (status === 'failed') failed += count;

      if (type === 'email') {
        emailTotal += count;
        if (status === 'delivered') emailDelivered += count;
      }

      if (type === 'sms') {
        smsTotal += count;
        if (status === 'delivered') smsDelivered += count;
      }
    }

    return {
      total,
      failed,
      emailTotal,
      emailDelivered,
      smsTotal,
      smsDelivered,
    };
  }

  private async checkAlerts(metrics: MessageMetrics) {
    if (!this.config.enableCustomAlerts) return;

    const stats = await this.getRecentStats();

    // SENIOR CODE REVIEWER FIX: Use Array.from for Map iteration to avoid downlevelIteration requirement
    for (const [alertId, alert] of Array.from(this.alerts.entries())) {
      // Check cooldown
      const lastAlert = this.lastAlertTime.get(alertId);
      if (lastAlert) {
        const cooldownMs = alert.cooldown * 60 * 1000;
        if (Date.now() - lastAlert.getTime() < cooldownMs) {
          continue;
        }
      }

      let shouldAlert = false;

      switch (alert.condition) {
        case 'error_rate':
          const errorRatePercent = (stats.failed / stats.total) * 100;
          shouldAlert = errorRatePercent > alert.threshold;
          break;

        case 'delivery_rate':
          const deliveryRatePercent = 100 - (stats.failed / stats.total) * 100;
          shouldAlert = deliveryRatePercent < alert.threshold;
          break;

        case 'processing_time':
          shouldAlert = metrics.processingTime > alert.threshold;
          break;

        case 'queue_size':
          const totalQueueSize = await this.getTotalQueueSize();
          shouldAlert = totalQueueSize > alert.threshold;
          break;

        case 'compliance':
          shouldAlert = metrics.metadata?.complianceViolation === true;
          break;
      }

      if (shouldAlert) {
        await this.triggerAlert(alert, metrics);
        this.lastAlertTime.set(alertId, new Date());
      }
    }
  }

  private async getTotalQueueSize(): Promise<number> {
    const sizes = await Promise.all([
      redis.llen('queue:email'),
      redis.llen('queue:sms'),
      redis.llen('queue:push'),
    ]);

    return sizes.reduce((sum, size) => sum + size, 0);
  }

  private async triggerAlert(alert: AlertConfig, metrics: MessageMetrics) {
    const alertData = {
      alert,
      metrics,
      timestamp: new Date(),
      stats: await this.getRecentStats(),
    };

    switch (alert.action) {
      case 'log':
        console.error(`[ALERT] ${alert.name}:`, alertData);
        break;

      case 'email':
        await this.sendEmailAlert(alertData);
        break;

      case 'slack':
        await this.sendSlackAlert(alertData);
        break;

      case 'pagerduty':
        await this.sendPagerDutyAlert(alertData);
        break;
    }

    // Always log to Sentry for high/critical alerts
    if (alert.severity === 'high' || alert.severity === 'critical') {
      Sentry.captureMessage(`Alert: ${alert.name}`, {
        level: alert.severity === 'critical' ? 'error' : 'warning',
        extra: alertData,
      });
    }
  }

  private async sendEmailAlert(alertData: any) {
    // Implementation would send email via your email service
    console.log('Sending email alert:', alertData);
  }

  private async sendSlackAlert(alertData: any) {
    if (!process.env.SLACK_WEBHOOK_URL) return;

    try {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 *${alertData.alert.name}*`,
          attachments: [
            {
              color:
                alertData.alert.severity === 'critical' ? 'danger' : 'warning',
              fields: [
                {
                  title: 'Severity',
                  value: alertData.alert.severity.toUpperCase(),
                  short: true,
                },
                {
                  title: 'Threshold',
                  value: alertData.alert.threshold,
                  short: true,
                },
                {
                  title: 'Error Rate',
                  value: `${((alertData.stats.failed / alertData.stats.total) * 100).toFixed(2)}%`,
                  short: true,
                },
                {
                  title: 'Total Messages',
                  value: alertData.stats.total,
                  short: true,
                },
              ],
              footer: 'WedSync Guest Communications',
              ts: Math.floor(Date.now() / 1000),
            },
          ],
        }),
      });
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }

  private async sendPagerDutyAlert(alertData: any) {
    if (!process.env.PAGERDUTY_INTEGRATION_KEY) return;

    try {
      await fetch('https://events.pagerduty.com/v2/enqueue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token token=${process.env.PAGERDUTY_INTEGRATION_KEY}`,
        },
        body: JSON.stringify({
          routing_key: process.env.PAGERDUTY_ROUTING_KEY,
          event_action: 'trigger',
          payload: {
            summary: alertData.alert.name,
            severity: alertData.alert.severity,
            source: 'WedSync Guest Communications',
            custom_details: alertData,
          },
        }),
      });
    } catch (error) {
      console.error('Failed to send PagerDuty alert:', error);
    }
  }

  async getHealthStatus() {
    const stats = await this.getRecentStats();
    const totalQueueSize = await this.getTotalQueueSize();

    const errorRatePercent =
      stats.total > 0 ? (stats.failed / stats.total) * 100 : 0;
    const deliveryRatePercent = stats.total > 0 ? 100 - errorRatePercent : 100;

    const health = {
      status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      metrics: {
        errorRate: errorRatePercent,
        deliveryRate: deliveryRatePercent,
        queueSize: totalQueueSize,
        messagesProcessed: stats.total,
        lastCheck: new Date(),
      },
      alerts: Array.from(this.alerts.values()).map((alert) => ({
        ...alert,
        lastTriggered: this.lastAlertTime.get(alert.id) || null,
      })),
    };

    // Determine health status
    if (errorRatePercent > 10 || deliveryRatePercent < 80) {
      health.status = 'unhealthy';
    } else if (errorRatePercent > 5 || deliveryRatePercent < 90) {
      health.status = 'degraded';
    }

    return health;
  }

  async generateReport(startDate: Date, endDate: Date) {
    const { data: metrics } = await supabase
      .from('guest_communication_metrics')
      .select('*')
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString());

    if (!metrics) return null;

    const report = {
      period: {
        start: startDate,
        end: endDate,
      },
      summary: {
        total: metrics.length,
        successful: metrics.filter((m) => m.status === 'delivered').length,
        failed: metrics.filter((m) => m.status === 'failed').length,
        bounced: metrics.filter((m) => m.status === 'bounced').length,
      },
      byType: {} as Record<string, any>,
      byChannel: {} as Record<string, any>,
      performance: {
        avgProcessingTime: 0,
        p95ProcessingTime: 0,
        p99ProcessingTime: 0,
      },
    };

    // Calculate by type and channel
    const processingTimes: number[] = [];

    metrics.forEach((metric) => {
      // By type
      if (!report.byType[metric.type]) {
        report.byType[metric.type] = { total: 0, delivered: 0, failed: 0 };
      }
      report.byType[metric.type].total++;
      if (metric.status === 'delivered') report.byType[metric.type].delivered++;
      if (metric.status === 'failed') report.byType[metric.type].failed++;

      // By channel
      if (!report.byChannel[metric.channel]) {
        report.byChannel[metric.channel] = {
          total: 0,
          delivered: 0,
          failed: 0,
        };
      }
      report.byChannel[metric.channel].total++;
      if (metric.status === 'delivered')
        report.byChannel[metric.channel].delivered++;
      if (metric.status === 'failed') report.byChannel[metric.channel].failed++;

      processingTimes.push(metric.processing_time);
    });

    // Calculate performance metrics
    if (processingTimes.length > 0) {
      processingTimes.sort((a, b) => a - b);
      report.performance.avgProcessingTime =
        processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
      report.performance.p95ProcessingTime =
        processingTimes[Math.floor(processingTimes.length * 0.95)];
      report.performance.p99ProcessingTime =
        processingTimes[Math.floor(processingTimes.length * 0.99)];
    }

    return report;
  }

  cleanup() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flushMetrics();
  }
}

// Export singleton instance
export const guestCommunicationsMonitor = new GuestCommunicationsMonitor({
  enableSentry: true,
  enablePrometheus: true,
  enableCustomAlerts: true,
  alertThresholds: {
    errorRatePercent: 5,
    responseTimeMs: 1000,
    queueSizeMax: 10000,
    deliveryRateMin: 90,
  },
});
