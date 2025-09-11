import { createClient } from '@/lib/supabase/server';
import { Redis } from '@upstash/redis';

interface MetricData {
  name: string;
  value: number;
  timestamp: Date;
  tags: Record<string, string>;
  organizationId: string;
  campaignId?: string;
}

interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  timeWindow: number; // seconds
  enabled: boolean;
  organizationId: string;
  webhookUrl?: string;
  emailRecipients?: string[];
}

interface PerformanceAlert {
  id: string;
  ruleId: string;
  ruleName: string;
  metric: string;
  value: number;
  threshold: number;
  organizationId: string;
  campaignId?: string;
  triggeredAt: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

/**
 * Comprehensive Monitoring and Performance Metrics System
 * Tracks messaging system performance, generates alerts, and provides analytics
 */
export class MessagingMonitoringSystem {
  private static redis = new Redis({
    url: process.env.UPSTASH_REDIS_URL!,
    token: process.env.UPSTASH_REDIS_TOKEN!,
  });

  private static alertRules: Map<string, AlertRule> = new Map();

  /**
   * Record performance metric
   */
  static async recordMetric(data: MetricData): Promise<void> {
    const supabase = await createClient();

    try {
      // Store in database for long-term retention
      await supabase.from('messaging_metrics').insert({
        name: data.name,
        value: data.value,
        timestamp: data.timestamp.toISOString(),
        tags: data.tags,
        organization_id: data.organizationId,
        campaign_id: data.campaignId,
      });

      // Store in Redis for real-time access (30 minute TTL)
      const redisKey = `metric:${data.organizationId}:${data.name}:${Date.now()}`;
      await this.redis.setex(redisKey, 1800, JSON.stringify(data));

      // Update real-time aggregates
      await this.updateRealtimeAggregates(data);

      // Check alert rules
      await this.checkAlertRules(data);
    } catch (error) {
      console.error('Failed to record metric:', error);
    }
  }

  /**
   * Record campaign performance metrics
   */
  static async recordCampaignMetrics(
    campaignId: string,
    organizationId: string,
    metrics: {
      totalRecipients: number;
      emailsSent: number;
      smsSent: number;
      emailDelivered: number;
      smsDelivered: number;
      emailBounced: number;
      smsFailed: number;
      unsubscribes: number;
      complaints: number;
      processingTimeMs: number;
      messagesPerSecond: number;
    },
  ): Promise<void> {
    const timestamp = new Date();
    const commonTags = {
      campaignId,
      organizationId,
      component: 'campaign',
    };

    const metricPromises = [
      this.recordMetric({
        name: 'campaign.recipients.total',
        value: metrics.totalRecipients,
        timestamp,
        tags: commonTags,
        organizationId,
        campaignId,
      }),
      this.recordMetric({
        name: 'campaign.emails.sent',
        value: metrics.emailsSent,
        timestamp,
        tags: commonTags,
        organizationId,
        campaignId,
      }),
      this.recordMetric({
        name: 'campaign.sms.sent',
        value: metrics.smsSent,
        timestamp,
        tags: commonTags,
        organizationId,
        campaignId,
      }),
      this.recordMetric({
        name: 'campaign.emails.delivered',
        value: metrics.emailDelivered,
        timestamp,
        tags: commonTags,
        organizationId,
        campaignId,
      }),
      this.recordMetric({
        name: 'campaign.sms.delivered',
        value: metrics.smsDelivered,
        timestamp,
        tags: commonTags,
        organizationId,
        campaignId,
      }),
      this.recordMetric({
        name: 'campaign.emails.bounced',
        value: metrics.emailBounced,
        timestamp,
        tags: commonTags,
        organizationId,
        campaignId,
      }),
      this.recordMetric({
        name: 'campaign.sms.failed',
        value: metrics.smsFailed,
        timestamp,
        tags: commonTags,
        organizationId,
        campaignId,
      }),
      this.recordMetric({
        name: 'campaign.unsubscribes',
        value: metrics.unsubscribes,
        timestamp,
        tags: commonTags,
        organizationId,
        campaignId,
      }),
      this.recordMetric({
        name: 'campaign.complaints',
        value: metrics.complaints,
        timestamp,
        tags: commonTags,
        organizationId,
        campaignId,
      }),
      this.recordMetric({
        name: 'campaign.processing_time_ms',
        value: metrics.processingTimeMs,
        timestamp,
        tags: commonTags,
        organizationId,
        campaignId,
      }),
      this.recordMetric({
        name: 'campaign.messages_per_second',
        value: metrics.messagesPerSecond,
        timestamp,
        tags: commonTags,
        organizationId,
        campaignId,
      }),
    ];

    await Promise.allSettled(metricPromises);
  }

  /**
   * Record system performance metrics
   */
  static async recordSystemMetrics(
    organizationId: string,
    metrics: {
      queueSize: number;
      processingLatency: number;
      errorRate: number;
      throughput: number;
      memoryUsage: number;
      cpuUsage: number;
      databaseConnections: number;
      apiResponseTime: number;
    },
  ): Promise<void> {
    const timestamp = new Date();
    const commonTags = {
      organizationId,
      component: 'system',
    };

    const metricPromises = [
      this.recordMetric({
        name: 'system.queue.size',
        value: metrics.queueSize,
        timestamp,
        tags: commonTags,
        organizationId,
      }),
      this.recordMetric({
        name: 'system.processing.latency_ms',
        value: metrics.processingLatency,
        timestamp,
        tags: commonTags,
        organizationId,
      }),
      this.recordMetric({
        name: 'system.error.rate_percent',
        value: metrics.errorRate,
        timestamp,
        tags: commonTags,
        organizationId,
      }),
      this.recordMetric({
        name: 'system.throughput.messages_per_second',
        value: metrics.throughput,
        timestamp,
        tags: commonTags,
        organizationId,
      }),
      this.recordMetric({
        name: 'system.memory.usage_mb',
        value: metrics.memoryUsage,
        timestamp,
        tags: commonTags,
        organizationId,
      }),
      this.recordMetric({
        name: 'system.cpu.usage_percent',
        value: metrics.cpuUsage,
        timestamp,
        tags: commonTags,
        organizationId,
      }),
      this.recordMetric({
        name: 'system.database.connections',
        value: metrics.databaseConnections,
        timestamp,
        tags: commonTags,
        organizationId,
      }),
      this.recordMetric({
        name: 'system.api.response_time_ms',
        value: metrics.apiResponseTime,
        timestamp,
        tags: commonTags,
        organizationId,
      }),
    ];

    await Promise.allSettled(metricPromises);
  }

  /**
   * Get real-time dashboard data
   */
  static async getDashboardMetrics(
    organizationId: string,
    timeRangeHours: number = 24,
  ): Promise<{
    campaignMetrics: {
      totalCampaigns: number;
      activeCampaigns: number;
      messagesSentToday: number;
      deliveryRate: number;
      unsubscribeRate: number;
      complaintRate: number;
    };
    systemMetrics: {
      currentQueueSize: number;
      averageLatency: number;
      errorRate: number;
      throughput: number;
      systemHealth: 'healthy' | 'warning' | 'critical';
    };
    recentAlerts: PerformanceAlert[];
  }> {
    const supabase = await createClient();
    const since = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);

    // Get campaign metrics
    const campaignData = await this.getAggregatedMetrics(
      organizationId,
      [
        'campaign.emails.sent',
        'campaign.sms.sent',
        'campaign.emails.delivered',
        'campaign.sms.delivered',
        'campaign.unsubscribes',
        'campaign.complaints',
      ],
      since,
    );

    const totalSent =
      (campaignData['campaign.emails.sent'] || 0) +
      (campaignData['campaign.sms.sent'] || 0);
    const totalDelivered =
      (campaignData['campaign.emails.delivered'] || 0) +
      (campaignData['campaign.sms.delivered'] || 0);
    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;

    // Get system metrics
    const systemData = await this.getLatestMetrics(organizationId, [
      'system.queue.size',
      'system.processing.latency_ms',
      'system.error.rate_percent',
      'system.throughput.messages_per_second',
    ]);

    // Get recent alerts
    const { data: alerts } = await supabase
      .from('messaging_alerts')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('triggered_at', since.toISOString())
      .order('triggered_at', { ascending: false })
      .limit(10);

    // Determine system health
    const errorRate = systemData['system.error.rate_percent'] || 0;
    const latency = systemData['system.processing.latency_ms'] || 0;
    const queueSize = systemData['system.queue.size'] || 0;

    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (errorRate > 10 || latency > 10000 || queueSize > 10000) {
      systemHealth = 'critical';
    } else if (errorRate > 5 || latency > 5000 || queueSize > 1000) {
      systemHealth = 'warning';
    }

    return {
      campaignMetrics: {
        totalCampaigns: await this.getCampaignCount(organizationId, since),
        activeCampaigns: await this.getActiveCampaignCount(organizationId),
        messagesSentToday: totalSent,
        deliveryRate: parseFloat(deliveryRate.toFixed(2)),
        unsubscribeRate:
          totalSent > 0
            ? ((campaignData['campaign.unsubscribes'] || 0) / totalSent) * 100
            : 0,
        complaintRate:
          totalSent > 0
            ? ((campaignData['campaign.complaints'] || 0) / totalSent) * 100
            : 0,
      },
      systemMetrics: {
        currentQueueSize: queueSize,
        averageLatency: latency,
        errorRate,
        throughput: systemData['system.throughput.messages_per_second'] || 0,
        systemHealth,
      },
      recentAlerts: (alerts || []).map((alert) => ({
        id: alert.id,
        ruleId: alert.rule_id,
        ruleName: alert.rule_name,
        metric: alert.metric,
        value: alert.value,
        threshold: alert.threshold,
        organizationId: alert.organization_id,
        campaignId: alert.campaign_id,
        triggeredAt: new Date(alert.triggered_at),
        resolved: alert.resolved,
        resolvedAt: alert.resolved_at ? new Date(alert.resolved_at) : undefined,
      })),
    };
  }

  /**
   * Create alert rule
   */
  static async createAlertRule(rule: Omit<AlertRule, 'id'>): Promise<string> {
    const supabase = await createClient();
    const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const alertRule: AlertRule = {
      id: ruleId,
      ...rule,
    };

    await supabase.from('messaging_alert_rules').insert({
      id: ruleId,
      name: rule.name,
      metric: rule.metric,
      condition: rule.condition,
      threshold: rule.threshold,
      time_window: rule.timeWindow,
      enabled: rule.enabled,
      organization_id: rule.organizationId,
      webhook_url: rule.webhookUrl,
      email_recipients: rule.emailRecipients,
    });

    this.alertRules.set(ruleId, alertRule);
    return ruleId;
  }

  /**
   * Check alert rules against incoming metric
   */
  private static async checkAlertRules(metric: MetricData): Promise<void> {
    const supabase = await createClient();

    // Get relevant alert rules
    const { data: rules } = await supabase
      .from('messaging_alert_rules')
      .select('*')
      .eq('organization_id', metric.organizationId)
      .eq('metric', metric.name)
      .eq('enabled', true);

    if (!rules || rules.length === 0) return;

    for (const rule of rules) {
      const shouldTrigger = this.evaluateAlertCondition(
        metric.value,
        rule.condition,
        rule.threshold,
      );

      if (shouldTrigger) {
        await this.triggerAlert(rule, metric);
      }
    }
  }

  /**
   * Evaluate alert condition
   */
  private static evaluateAlertCondition(
    value: number,
    condition: string,
    threshold: number,
  ): boolean {
    switch (condition) {
      case 'gt':
        return value > threshold;
      case 'lt':
        return value < threshold;
      case 'eq':
        return value === threshold;
      case 'gte':
        return value >= threshold;
      case 'lte':
        return value <= threshold;
      default:
        return false;
    }
  }

  /**
   * Trigger alert
   */
  private static async triggerAlert(
    rule: any,
    metric: MetricData,
  ): Promise<void> {
    const supabase = await createClient();

    // Check for duplicate alerts (within time window)
    const { data: recentAlert } = await supabase
      .from('messaging_alerts')
      .select('id')
      .eq('rule_id', rule.id)
      .eq('resolved', false)
      .gte(
        'triggered_at',
        new Date(Date.now() - rule.time_window * 1000).toISOString(),
      )
      .single();

    if (recentAlert) return; // Alert already triggered recently

    // Create new alert
    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      ruleName: rule.name,
      metric: rule.metric,
      value: metric.value,
      threshold: rule.threshold,
      organizationId: metric.organizationId,
      campaignId: metric.campaignId,
      triggeredAt: new Date(),
      resolved: false,
    };

    await supabase.from('messaging_alerts').insert({
      id: alert.id,
      rule_id: alert.ruleId,
      rule_name: alert.ruleName,
      metric: alert.metric,
      value: alert.value,
      threshold: alert.threshold,
      organization_id: alert.organizationId,
      campaign_id: alert.campaignId,
      triggered_at: alert.triggeredAt.toISOString(),
      resolved: false,
    });

    // Send alert notifications
    await this.sendAlertNotifications(rule, alert);
  }

  /**
   * Send alert notifications
   */
  private static async sendAlertNotifications(
    rule: any,
    alert: PerformanceAlert,
  ): Promise<void> {
    const message = `Alert: ${rule.name}\nMetric: ${alert.metric}\nValue: ${alert.value}\nThreshold: ${alert.threshold}`;

    // Send webhook notification
    if (rule.webhook_url) {
      try {
        await fetch(rule.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alert,
            message,
            timestamp: alert.triggeredAt.toISOString(),
          }),
        });
      } catch (error) {
        console.error('Failed to send webhook notification:', error);
      }
    }

    // Send email notifications (would integrate with email service)
    if (rule.email_recipients && rule.email_recipients.length > 0) {
      console.log('Email alert sent to:', rule.email_recipients);
      // Integration with email service would go here
    }
  }

  /**
   * Update real-time aggregates in Redis
   */
  private static async updateRealtimeAggregates(
    metric: MetricData,
  ): Promise<void> {
    const aggregateKey = `aggregate:${metric.organizationId}:${metric.name}`;

    // Update hourly aggregate
    const hourKey = `${aggregateKey}:${new Date().getHours()}`;
    await this.redis.incrbyfloat(hourKey, metric.value);
    await this.redis.expire(hourKey, 86400); // 24 hours TTL

    // Update daily aggregate
    const dayKey = `${aggregateKey}:${new Date().toDateString()}`;
    await this.redis.incrbyfloat(dayKey, metric.value);
    await this.redis.expire(dayKey, 604800); // 7 days TTL
  }

  /**
   * Get aggregated metrics for time period
   */
  private static async getAggregatedMetrics(
    organizationId: string,
    metricNames: string[],
    since: Date,
  ): Promise<Record<string, number>> {
    const supabase = await createClient();
    const results: Record<string, number> = {};

    for (const metricName of metricNames) {
      const { data } = await supabase
        .from('messaging_metrics')
        .select('value')
        .eq('organization_id', organizationId)
        .eq('name', metricName)
        .gte('timestamp', since.toISOString());

      const sum = (data || []).reduce((total, row) => total + row.value, 0);
      results[metricName] = sum;
    }

    return results;
  }

  /**
   * Get latest metric values
   */
  private static async getLatestMetrics(
    organizationId: string,
    metricNames: string[],
  ): Promise<Record<string, number>> {
    const results: Record<string, number> = {};

    for (const metricName of metricNames) {
      const keys = await this.redis.keys(
        `metric:${organizationId}:${metricName}:*`,
      );
      if (keys.length > 0) {
        // Get the most recent key (highest timestamp)
        const latestKey = keys.sort().pop()!;
        const data = await this.redis.get(latestKey);
        if (data) {
          const metric = JSON.parse(data as string);
          results[metricName] = metric.value;
        }
      }
    }

    return results;
  }

  /**
   * Get campaign count
   */
  private static async getCampaignCount(
    organizationId: string,
    since: Date,
  ): Promise<number> {
    const supabase = await createClient();

    const { count } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('created_at', since.toISOString());

    return count || 0;
  }

  /**
   * Get active campaign count
   */
  private static async getActiveCampaignCount(
    organizationId: string,
  ): Promise<number> {
    const supabase = await createClient();

    const { count } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .in('status', ['sending', 'queued', 'processing']);

    return count || 0;
  }

  /**
   * Export metrics data for analysis
   */
  static async exportMetrics(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    format: 'csv' | 'json' = 'csv',
  ): Promise<string> {
    const supabase = await createClient();

    const { data: metrics } = await supabase
      .from('messaging_metrics')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
      .order('timestamp');

    if (!metrics) return '';

    if (format === 'json') {
      return JSON.stringify(metrics, null, 2);
    }

    // CSV format
    const headers = ['timestamp', 'name', 'value', 'campaign_id', 'tags'];
    const rows = metrics.map((m) => [
      m.timestamp,
      m.name,
      m.value,
      m.campaign_id || '',
      JSON.stringify(m.tags),
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }
}

export const messagingMonitoring = new MessagingMonitoringSystem();
