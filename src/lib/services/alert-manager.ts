/**
 * WS-227: Alert Manager Service - Health Threshold Monitoring and Alerting
 * Comprehensive alerting system for system health monitoring
 */

import { createClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { SystemHealth, ServiceStatus } from './health-monitor';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  service: string;
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'ne' | 'gte' | 'lte';
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isEnabled: boolean;
  conditions?: AlertCondition[];
  actions?: AlertAction[];
  cooldownPeriod?: number; // Minutes
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertCondition {
  field: string;
  operator: string;
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface AlertAction {
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'push';
  target: string;
  template?: string;
  enabled: boolean;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  service: string;
  metric: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  currentValue: number;
  thresholdValue: number;
  isResolved: boolean;
  resolvedAt?: Date;
  createdAt: Date;
  metadata?: Record<string, any>;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface AlertSummary {
  total: number;
  active: number;
  resolved: number;
  bySeverity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  byService: Record<string, number>;
}

export interface NotificationResult {
  success: boolean;
  channel: string;
  error?: string;
  messageId?: string;
}

export class AlertManager {
  private supabase: SupabaseClient;
  private cooldownTracker: Map<string, Date>;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createClient();
    this.cooldownTracker = new Map();
  }

  /**
   * Check system health against all alert rules and trigger alerts
   */
  async checkAllThresholds(health: SystemHealth): Promise<Alert[]> {
    try {
      const rules = await this.getActiveAlertRules();
      const triggeredAlerts: Alert[] = [];

      for (const rule of rules) {
        const alerts = await this.checkRuleAgainstHealth(rule, health);
        triggeredAlerts.push(...alerts);
      }

      return triggeredAlerts;
    } catch (error) {
      console.error('Failed to check alert thresholds:', error);
      throw new Error('Alert threshold checking failed');
    }
  }

  /**
   * Check a single rule against system health
   */
  private async checkRuleAgainstHealth(
    rule: AlertRule,
    health: SystemHealth,
  ): Promise<Alert[]> {
    const alerts: Alert[] = [];

    try {
      // Check cooldown period
      const cooldownKey = `${rule.id}:${rule.service}:${rule.metric}`;
      const lastAlert = this.cooldownTracker.get(cooldownKey);
      const now = new Date();

      if (lastAlert && rule.cooldownPeriod) {
        const cooldownEndTime = new Date(
          lastAlert.getTime() + rule.cooldownPeriod * 60 * 1000,
        );
        if (now < cooldownEndTime) {
          return alerts; // Still in cooldown period
        }
      }

      // Get metric value from health data
      const metricValue = this.extractMetricValue(
        health,
        rule.service,
        rule.metric,
      );

      if (metricValue === null || metricValue === undefined) {
        console.warn(
          `Metric ${rule.metric} not found for service ${rule.service}`,
        );
        return alerts;
      }

      // Check if threshold is breached
      const thresholdBreached = this.evaluateThreshold(
        metricValue,
        rule.operator,
        rule.threshold,
      );

      if (thresholdBreached) {
        // Check additional conditions if any
        if (
          rule.conditions &&
          !this.evaluateConditions(rule.conditions, health)
        ) {
          return alerts;
        }

        // Create alert
        const alert = await this.createAlert(rule, metricValue, health);
        alerts.push(alert);

        // Update cooldown tracker
        this.cooldownTracker.set(cooldownKey, now);

        // Trigger notifications
        if (rule.actions) {
          await this.sendNotifications(alert, rule.actions);
        }
      }
    } catch (error) {
      console.error(`Error checking rule ${rule.name}:`, error);
    }

    return alerts;
  }

  /**
   * Extract metric value from health data
   */
  private extractMetricValue(
    health: SystemHealth,
    service: string,
    metric: string,
  ): number | null {
    switch (service) {
      case 'infrastructure':
        switch (metric) {
          case 'cpu_usage':
            return health.infrastructure.cpuUsage;
          case 'memory_usage':
            return health.infrastructure.memoryUsage;
          case 'disk_space':
            return health.infrastructure.diskSpace;
          case 'response_time':
            return health.infrastructure.responseTime;
          case 'network_latency':
            return health.infrastructure.networkLatency;
          default:
            return null;
        }

      case 'api':
        switch (metric) {
          case 'error_rate':
            return health.apiHealth.errorRate;
          case 'requests_per_minute':
            return health.apiHealth.requestsPerMinute;
          case 'p95_response_time':
            return health.apiHealth.p95ResponseTime;
          case 'p99_response_time':
            return health.apiHealth.p99ResponseTime;
          case 'throughput':
            return health.apiHealth.throughput;
          default:
            return null;
        }

      case 'job_queue':
        switch (metric) {
          case 'pending_jobs':
            return health.jobQueue.pending;
          case 'failed_jobs':
            return health.jobQueue.failed;
          case 'processing_time':
            return health.jobQueue.averageProcessingTime;
          case 'oldest_pending':
            return health.jobQueue.oldestPendingJob;
          default:
            return null;
        }

      default:
        // Service-specific metrics
        const serviceStatus =
          health.services[service as keyof typeof health.services];
        if (serviceStatus) {
          switch (metric) {
            case 'latency':
              return serviceStatus.latency;
            case 'error_count':
              return serviceStatus.errorCount24h;
            case 'uptime':
              return serviceStatus.uptime;
            case 'status':
              return serviceStatus.status === 'healthy'
                ? 1
                : serviceStatus.status === 'degraded'
                  ? 0.5
                  : 0;
            default:
              return null;
          }
        }
        return null;
    }
  }

  /**
   * Evaluate threshold condition
   */
  private evaluateThreshold(
    value: number,
    operator: string,
    threshold: number,
  ): boolean {
    switch (operator) {
      case 'gt':
        return value > threshold;
      case 'gte':
        return value >= threshold;
      case 'lt':
        return value < threshold;
      case 'lte':
        return value <= threshold;
      case 'eq':
        return value === threshold;
      case 'ne':
        return value !== threshold;
      default:
        return false;
    }
  }

  /**
   * Evaluate additional conditions
   */
  private evaluateConditions(
    conditions: AlertCondition[],
    health: SystemHealth,
  ): boolean {
    // For simplicity, assume all conditions use AND logic
    return conditions.every((condition) => {
      const value = this.extractMetricValue(
        health,
        condition.field.split('.')[0],
        condition.field.split('.')[1],
      );
      if (value === null) return true; // Skip missing values

      return this.evaluateThreshold(value, condition.operator, condition.value);
    });
  }

  /**
   * Create alert in database
   */
  private async createAlert(
    rule: AlertRule,
    currentValue: number,
    health: SystemHealth,
  ): Promise<Alert> {
    const alert: Omit<Alert, 'id'> = {
      ruleId: rule.id,
      ruleName: rule.name,
      service: rule.service,
      metric: rule.metric,
      severity: rule.severity,
      message: this.generateAlertMessage(rule, currentValue),
      currentValue,
      thresholdValue: rule.threshold,
      isResolved: false,
      createdAt: new Date(),
      metadata: {
        healthSnapshot: {
          timestamp: health.lastUpdated,
          systemStatus: this.getOverallHealthStatus(health),
        },
      },
    };

    try {
      const { data, error } = await this.supabase
        .from('health_alerts')
        .insert(alert)
        .select()
        .single();

      if (error) throw error;

      return data as Alert;
    } catch (error) {
      console.error('Failed to create alert:', error);
      throw error;
    }
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(rule: AlertRule, currentValue: number): string {
    const operatorText = {
      gt: 'exceeds',
      gte: 'exceeds or equals',
      lt: 'is below',
      lte: 'is below or equals',
      eq: 'equals',
      ne: 'does not equal',
    };

    const op = operatorText[rule.operator] || 'violates';
    const serviceName = rule.service
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase());

    return `${serviceName} ${rule.metric.replace(/_/g, ' ')} ${op} threshold: ${currentValue} (threshold: ${rule.threshold})`;
  }

  /**
   * Send notifications for alert
   */
  private async sendNotifications(
    alert: Alert,
    actions: AlertAction[],
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    for (const action of actions.filter((a) => a.enabled)) {
      try {
        let result: NotificationResult;

        switch (action.type) {
          case 'email':
            result = await this.sendEmailNotification(alert, action);
            break;
          case 'slack':
            result = await this.sendSlackNotification(alert, action);
            break;
          case 'webhook':
            result = await this.sendWebhookNotification(alert, action);
            break;
          case 'sms':
            result = await this.sendSMSNotification(alert, action);
            break;
          case 'push':
            result = await this.sendPushNotification(alert, action);
            break;
          default:
            result = {
              success: false,
              channel: action.type,
              error: 'Unsupported notification type',
            };
        }

        results.push(result);
      } catch (error) {
        console.error(`Notification ${action.type} failed:`, error);
        results.push({
          success: false,
          channel: action.type,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    alert: Alert,
    action: AlertAction,
  ): Promise<NotificationResult> {
    // Implementation would integrate with email service (Resend)
    console.log(`EMAIL ALERT: ${alert.message} to ${action.target}`);

    return {
      success: true,
      channel: 'email',
      messageId: `email_${Date.now()}`,
    };
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(
    alert: Alert,
    action: AlertAction,
  ): Promise<NotificationResult> {
    // Implementation would integrate with Slack API
    console.log(`SLACK ALERT: ${alert.message} to ${action.target}`);

    return {
      success: true,
      channel: 'slack',
      messageId: `slack_${Date.now()}`,
    };
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(
    alert: Alert,
    action: AlertAction,
  ): Promise<NotificationResult> {
    try {
      const response = await fetch(action.target, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WedSync-AlertManager/1.0',
        },
        body: JSON.stringify({
          alert,
          timestamp: new Date().toISOString(),
          source: 'wedsync-health-monitor',
        }),
      });

      return {
        success: response.ok,
        channel: 'webhook',
        messageId: response.headers.get('X-Message-ID') || undefined,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (error) {
      return {
        success: false,
        channel: 'webhook',
        error:
          error instanceof Error ? error.message : 'Webhook request failed',
      };
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(
    alert: Alert,
    action: AlertAction,
  ): Promise<NotificationResult> {
    // Implementation would integrate with SMS service (Twilio)
    console.log(`SMS ALERT: ${alert.message} to ${action.target}`);

    return {
      success: true,
      channel: 'sms',
      messageId: `sms_${Date.now()}`,
    };
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(
    alert: Alert,
    action: AlertAction,
  ): Promise<NotificationResult> {
    // Implementation would integrate with push notification service
    console.log(`PUSH ALERT: ${alert.message} to ${action.target}`);

    return {
      success: true,
      channel: 'push',
      messageId: `push_${Date.now()}`,
    };
  }

  /**
   * Get active alert rules
   */
  async getActiveAlertRules(): Promise<AlertRule[]> {
    try {
      const { data, error } = await this.supabase
        .from('health_alert_thresholds')
        .select('*')
        .eq('is_enabled', true);

      if (error) throw error;

      return (data || []).map((row) => ({
        id: row.id,
        name: `${row.service} ${row.metric_type}`,
        description: `${row.service} ${row.metric_type} threshold`,
        service: row.service,
        metric: row.metric_type,
        operator: 'gte' as const,
        threshold: row.threshold_value,
        severity: row.severity,
        isEnabled: row.is_enabled,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at || row.created_at),
      }));
    } catch (error) {
      console.error('Failed to fetch alert rules:', error);
      return [];
    }
  }

  /**
   * Get alert summary statistics
   */
  async getAlertSummary(timeRange = '24h'): Promise<AlertSummary> {
    try {
      const hoursBack =
        timeRange === '1h'
          ? 1
          : timeRange === '24h'
            ? 24
            : timeRange === '7d'
              ? 168
              : 720;
      const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

      const { data, error } = await this.supabase
        .from('health_alerts')
        .select('*')
        .gte('created_at', since.toISOString());

      if (error) throw error;

      const alerts = data || [];

      return {
        total: alerts.length,
        active: alerts.filter((a) => !a.is_resolved).length,
        resolved: alerts.filter((a) => a.is_resolved).length,
        bySeverity: {
          low: alerts.filter((a) => a.severity === 'low').length,
          medium: alerts.filter((a) => a.severity === 'medium').length,
          high: alerts.filter((a) => a.severity === 'high').length,
          critical: alerts.filter((a) => a.severity === 'critical').length,
        },
        byService: alerts.reduce(
          (acc, alert) => {
            acc[alert.service] = (acc[alert.service] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
      };
    } catch (error) {
      console.error('Failed to fetch alert summary:', error);
      return {
        total: 0,
        active: 0,
        resolved: 0,
        bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
        byService: {},
      };
    }
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId: string, resolvedBy?: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('health_alerts')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          acknowledged_by: resolvedBy,
        })
        .eq('id', alertId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      throw error;
    }
  }

  /**
   * Get overall health status from system health data
   */
  private getOverallHealthStatus(health: SystemHealth): string {
    const services = Object.values(health.services);
    const downServices = services.filter((s) => s.status === 'down').length;
    const degradedServices = services.filter(
      (s) => s.status === 'degraded',
    ).length;

    if (downServices > 0) return 'down';
    if (degradedServices > 0) return 'degraded';
    return 'healthy';
  }

  /**
   * Clear cooldown for testing purposes
   */
  clearCooldown(ruleId: string, service: string, metric: string): void {
    const cooldownKey = `${ruleId}:${service}:${metric}`;
    this.cooldownTracker.delete(cooldownKey);
  }
}

// Export singleton instance
export const alertManager = new AlertManager();
