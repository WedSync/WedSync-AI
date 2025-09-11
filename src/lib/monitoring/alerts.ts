/**
 * Alert Configuration and Management System
 * Real-time alerting with multiple notification channels
 */

import { logger } from './structured-logger';
import { metrics } from './metrics';
import { dashboard } from './dashboard';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: 'info' | 'warning' | 'critical';
  condition: AlertCondition;
  channels: AlertChannel[];
  cooldown: number; // Minutes between alerts
  escalation?: EscalationRule;
  lastTriggered?: number;
  triggerCount: number;
}

export interface AlertCondition {
  type: 'threshold' | 'anomaly' | 'composite';
  metric: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'neq';
  value: number;
  timeWindow: number; // Minutes
  evaluationInterval: number; // Seconds
  minDataPoints?: number;
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count';
}

export interface CompositeCondition extends AlertCondition {
  type: 'composite';
  conditions: AlertCondition[];
  logic: 'and' | 'or';
}

export interface EscalationRule {
  levels: Array<{
    afterMinutes: number;
    severity: 'warning' | 'critical';
    additionalChannels: AlertChannel[];
  }>;
}

export interface AlertChannel {
  type: 'slack' | 'email' | 'pagerduty' | 'webhook' | 'sms';
  config: Record<string, any>;
  enabled: boolean;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: 'info' | 'warning' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
  acknowledgedBy?: string;
  acknowledgedAt?: number;
  resolvedAt?: number;
  escalationLevel: number;
  metadata: Record<string, any>;
}

export class AlertManager {
  private static instance: AlertManager;
  private rules = new Map<string, AlertRule>();
  private activeAlerts = new Map<string, Alert>();
  private evaluationInterval: NodeJS.Timeout;
  private lastEvaluations = new Map<string, number>();

  private constructor() {
    this.initializeDefaultRules();
    this.startEvaluationLoop();
  }

  static getInstance(): AlertManager {
    if (!AlertManager.instance) {
      AlertManager.instance = new AlertManager();
    }
    return AlertManager.instance;
  }

  // Initialize default alert rules
  private initializeDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      // System Health Alerts
      {
        id: 'high-memory-usage',
        name: 'High Memory Usage',
        description: 'Memory usage exceeds 85%',
        enabled: true,
        severity: 'warning',
        condition: {
          type: 'threshold',
          metric: 'apm.system.memory.percentage',
          operator: 'gt',
          value: 85,
          timeWindow: 5,
          evaluationInterval: 60,
          aggregation: 'avg',
        },
        channels: [
          {
            type: 'slack',
            config: { webhook: process.env.SLACK_WEBHOOK_URL },
            enabled: !!process.env.SLACK_WEBHOOK_URL,
          },
          {
            type: 'email',
            config: {
              recipients: process.env.ALERT_EMAIL_RECIPIENTS?.split(','),
            },
            enabled: !!process.env.ALERT_EMAIL_RECIPIENTS,
          },
        ],
        cooldown: 15,
        triggerCount: 0,
      },
      {
        id: 'critical-memory-usage',
        name: 'Critical Memory Usage',
        description: 'Memory usage exceeds 95%',
        enabled: true,
        severity: 'critical',
        condition: {
          type: 'threshold',
          metric: 'apm.system.memory.percentage',
          operator: 'gt',
          value: 95,
          timeWindow: 2,
          evaluationInterval: 30,
          aggregation: 'avg',
        },
        channels: [
          {
            type: 'slack',
            config: { webhook: process.env.SLACK_WEBHOOK_URL },
            enabled: !!process.env.SLACK_WEBHOOK_URL,
          },
          {
            type: 'pagerduty',
            config: { routingKey: process.env.PAGERDUTY_ROUTING_KEY },
            enabled: !!process.env.PAGERDUTY_ROUTING_KEY,
          },
        ],
        cooldown: 5,
        triggerCount: 0,
      },

      // API Performance Alerts
      {
        id: 'high-response-time',
        name: 'High API Response Time',
        description: 'API response time P95 exceeds 1000ms',
        enabled: true,
        severity: 'warning',
        condition: {
          type: 'threshold',
          metric: 'api.response_time.p95',
          operator: 'gt',
          value: 1000,
          timeWindow: 10,
          evaluationInterval: 60,
          aggregation: 'avg',
        },
        channels: [
          {
            type: 'slack',
            config: { webhook: process.env.SLACK_WEBHOOK_URL },
            enabled: !!process.env.SLACK_WEBHOOK_URL,
          },
        ],
        cooldown: 20,
        triggerCount: 0,
      },
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        description: 'Error rate exceeds 5%',
        enabled: true,
        severity: 'critical',
        condition: {
          type: 'threshold',
          metric: 'api.error_rate',
          operator: 'gt',
          value: 0.05,
          timeWindow: 5,
          evaluationInterval: 60,
          aggregation: 'avg',
        },
        channels: [
          {
            type: 'slack',
            config: { webhook: process.env.SLACK_WEBHOOK_URL },
            enabled: !!process.env.SLACK_WEBHOOK_URL,
          },
          {
            type: 'pagerduty',
            config: { routingKey: process.env.PAGERDUTY_ROUTING_KEY },
            enabled: !!process.env.PAGERDUTY_ROUTING_KEY,
          },
        ],
        cooldown: 10,
        escalation: {
          levels: [
            {
              afterMinutes: 10,
              severity: 'critical',
              additionalChannels: [
                {
                  type: 'sms',
                  config: {
                    numbers: process.env.ALERT_SMS_NUMBERS?.split(','),
                  },
                  enabled: !!process.env.ALERT_SMS_NUMBERS,
                },
              ],
            },
          ],
        },
        triggerCount: 0,
      },

      // Database Alerts
      {
        id: 'high-db-connections',
        name: 'High Database Connections',
        description: 'Database connections exceed 80% of limit',
        enabled: true,
        severity: 'warning',
        condition: {
          type: 'threshold',
          metric: 'db.connections.active',
          operator: 'gt',
          value: 80,
          timeWindow: 5,
          evaluationInterval: 60,
          aggregation: 'avg',
        },
        channels: [
          {
            type: 'slack',
            config: { webhook: process.env.SLACK_WEBHOOK_URL },
            enabled: !!process.env.SLACK_WEBHOOK_URL,
          },
        ],
        cooldown: 15,
        triggerCount: 0,
      },
      {
        id: 'slow-database-queries',
        name: 'Slow Database Queries',
        description: 'Database query time exceeds 2000ms',
        enabled: true,
        severity: 'warning',
        condition: {
          type: 'threshold',
          metric: 'db.query_time.p95',
          operator: 'gt',
          value: 2000,
          timeWindow: 10,
          evaluationInterval: 120,
          aggregation: 'avg',
        },
        channels: [
          {
            type: 'slack',
            config: { webhook: process.env.SLACK_WEBHOOK_URL },
            enabled: !!process.env.SLACK_WEBHOOK_URL,
          },
        ],
        cooldown: 30,
        triggerCount: 0,
      },

      // Business Logic Alerts
      {
        id: 'payment-failures',
        name: 'High Payment Failure Rate',
        description: 'Payment failure rate exceeds 10%',
        enabled: true,
        severity: 'critical',
        condition: {
          type: 'threshold',
          metric: 'payments.failure_rate',
          operator: 'gt',
          value: 0.1,
          timeWindow: 15,
          evaluationInterval: 300,
          aggregation: 'avg',
        },
        channels: [
          {
            type: 'slack',
            config: { webhook: process.env.SLACK_WEBHOOK_URL },
            enabled: !!process.env.SLACK_WEBHOOK_URL,
          },
          {
            type: 'email',
            config: {
              recipients: process.env.BUSINESS_ALERT_EMAILS?.split(','),
            },
            enabled: !!process.env.BUSINESS_ALERT_EMAILS,
          },
        ],
        cooldown: 20,
        triggerCount: 0,
      },

      // Cache Performance
      {
        id: 'low-cache-hit-rate',
        name: 'Low Cache Hit Rate',
        description: 'Cache hit rate below 80%',
        enabled: true,
        severity: 'warning',
        condition: {
          type: 'threshold',
          metric: 'cache.hit_rate',
          operator: 'lt',
          value: 0.8,
          timeWindow: 20,
          evaluationInterval: 300,
          aggregation: 'avg',
        },
        channels: [
          {
            type: 'slack',
            config: { webhook: process.env.SLACK_WEBHOOK_URL },
            enabled: !!process.env.SLACK_WEBHOOK_URL,
          },
        ],
        cooldown: 60,
        triggerCount: 0,
      },

      // Service Health
      {
        id: 'service-down',
        name: 'Service Down',
        description: 'Health check failed',
        enabled: true,
        severity: 'critical',
        condition: {
          type: 'threshold',
          metric: 'health.status',
          operator: 'eq',
          value: 0, // 0 = unhealthy
          timeWindow: 2,
          evaluationInterval: 60,
          minDataPoints: 2,
        },
        channels: [
          {
            type: 'slack',
            config: { webhook: process.env.SLACK_WEBHOOK_URL },
            enabled: !!process.env.SLACK_WEBHOOK_URL,
          },
          {
            type: 'pagerduty',
            config: { routingKey: process.env.PAGERDUTY_ROUTING_KEY },
            enabled: !!process.env.PAGERDUTY_ROUTING_KEY,
          },
          {
            type: 'sms',
            config: { numbers: process.env.ALERT_SMS_NUMBERS?.split(',') },
            enabled: !!process.env.ALERT_SMS_NUMBERS,
          },
        ],
        cooldown: 5,
        triggerCount: 0,
      },
    ];

    defaultRules.forEach((rule) => {
      this.rules.set(rule.id, rule);
    });

    logger.info('Alert rules initialized', {
      count: defaultRules.length,
      enabled: defaultRules.filter((r) => r.enabled).length,
    });
  }

  // Start evaluation loop
  private startEvaluationLoop(): void {
    this.evaluationInterval = setInterval(async () => {
      await this.evaluateRules();
    }, 30000); // Evaluate every 30 seconds

    logger.info('Alert evaluation loop started');
  }

  // Evaluate all rules
  private async evaluateRules(): Promise<void> {
    const enabledRules = Array.from(this.rules.values()).filter(
      (rule) => rule.enabled,
    );

    for (const rule of enabledRules) {
      try {
        await this.evaluateRule(rule);
      } catch (error) {
        logger.error('Failed to evaluate alert rule', error, {
          ruleId: rule.id,
          ruleName: rule.name,
        });
      }
    }
  }

  // Evaluate single rule
  private async evaluateRule(rule: AlertRule): Promise<void> {
    const now = Date.now();
    const lastEvaluation = this.lastEvaluations.get(rule.id) || 0;

    // Check if enough time has passed since last evaluation
    if (now - lastEvaluation < rule.condition.evaluationInterval * 1000) {
      return;
    }

    this.lastEvaluations.set(rule.id, now);

    // Check cooldown period
    if (
      rule.lastTriggered &&
      now - rule.lastTriggered < rule.cooldown * 60 * 1000
    ) {
      return;
    }

    const isTriggered = await this.evaluateCondition(rule.condition);

    if (isTriggered) {
      await this.triggerAlert(rule);
    } else {
      // Check if we need to resolve existing alerts
      const existingAlert = this.getActiveAlert(rule.id);
      if (existingAlert) {
        await this.resolveAlert(existingAlert.id);
      }
    }
  }

  // Evaluate condition
  private async evaluateCondition(condition: AlertCondition): Promise<boolean> {
    try {
      if (condition.type === 'composite') {
        return await this.evaluateCompositeCondition(
          condition as CompositeCondition,
        );
      }

      const metricValue = await this.getMetricValue(condition);

      if (metricValue === null) {
        logger.warn('No metric value found for condition', {
          metric: condition.metric,
        });
        return false;
      }

      return this.compareValues(
        metricValue,
        condition.operator,
        condition.value,
      );
    } catch (error) {
      logger.error('Failed to evaluate condition', error, { condition });
      return false;
    }
  }

  // Evaluate composite condition
  private async evaluateCompositeCondition(
    condition: CompositeCondition,
  ): Promise<boolean> {
    const results = await Promise.all(
      condition.conditions.map((c) => this.evaluateCondition(c)),
    );

    if (condition.logic === 'and') {
      return results.every((result) => result);
    } else {
      return results.some((result) => result);
    }
  }

  // Get metric value
  private async getMetricValue(
    condition: AlertCondition,
  ): Promise<number | null> {
    const timeWindow = condition.timeWindow * 60 * 1000; // Convert to milliseconds
    const currentMetrics = dashboard.getCurrentMetrics();

    if (!currentMetrics) {
      return null;
    }

    // Map metric names to actual values
    switch (condition.metric) {
      case 'apm.system.memory.percentage':
        return currentMetrics.system.memory.percentage;

      case 'api.response_time.p95':
        return currentMetrics.application.requests.responseTime.p95;

      case 'api.error_rate':
        const totalRequests = currentMetrics.application.requests.total;
        const totalErrors = currentMetrics.errors.total;
        return totalRequests > 0 ? totalErrors / totalRequests : 0;

      case 'db.connections.active':
        return currentMetrics.application.database.connections.active;

      case 'db.query_time.p95':
        return currentMetrics.application.database.queries.averageTime; // Simplified

      case 'payments.failure_rate':
        return 1 - currentMetrics.business.payments.success_rate;

      case 'cache.hit_rate':
        return currentMetrics.application.cache.hitRate;

      case 'health.status':
        const healthStatus = await dashboard.getHealthStatus();
        return healthStatus.status === 'healthy'
          ? 1
          : healthStatus.status === 'degraded'
            ? 0.5
            : 0;

      default:
        logger.warn('Unknown metric in alert condition', {
          metric: condition.metric,
        });
        return null;
    }
  }

  // Compare values based on operator
  private compareValues(
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
        return Math.abs(value - threshold) < 0.001; // Float comparison
      case 'neq':
        return Math.abs(value - threshold) >= 0.001;
      default:
        return false;
    }
  }

  // Trigger alert
  private async triggerAlert(rule: AlertRule): Promise<void> {
    const alertId = this.generateAlertId();
    const currentValue = (await this.getMetricValue(rule.condition)) || 0;

    const alert: Alert = {
      id: alertId,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      status: 'active',
      message: `${rule.description} (Value: ${currentValue.toFixed(2)})`,
      value: currentValue,
      threshold: rule.condition.value,
      timestamp: Date.now(),
      escalationLevel: 0,
      metadata: {
        metric: rule.condition.metric,
        operator: rule.condition.operator,
        timeWindow: rule.condition.timeWindow,
      },
    };

    this.activeAlerts.set(alertId, alert);
    rule.lastTriggered = Date.now();
    rule.triggerCount++;

    logger.error('Alert triggered', undefined, {
      alertId,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      value: currentValue,
      threshold: rule.condition.value,
    });

    // Send notifications
    await this.sendAlertNotifications(alert, rule.channels);

    // Update metrics
    metrics.incrementCounter('alerts.triggered', 1, {
      ruleId: rule.id,
      severity: rule.severity,
    });

    // Set up escalation if configured
    if (rule.escalation) {
      this.scheduleEscalation(alert, rule);
    }
  }

  // Send alert notifications
  private async sendAlertNotifications(
    alert: Alert,
    channels: AlertChannel[],
  ): Promise<void> {
    const enabledChannels = channels.filter((channel) => channel.enabled);

    await Promise.allSettled(
      enabledChannels.map((channel) => this.sendToChannel(alert, channel)),
    );
  }

  // Send to specific channel
  private async sendToChannel(
    alert: Alert,
    channel: AlertChannel,
  ): Promise<void> {
    try {
      switch (channel.type) {
        case 'slack':
          await this.sendSlackAlert(alert, channel.config);
          break;

        case 'email':
          await this.sendEmailAlert(alert, channel.config);
          break;

        case 'pagerduty':
          await this.sendPagerDutyAlert(alert, channel.config);
          break;

        case 'webhook':
          await this.sendWebhookAlert(alert, channel.config);
          break;

        case 'sms':
          await this.sendSMSAlert(alert, channel.config);
          break;

        default:
          logger.warn('Unknown alert channel type', { type: channel.type });
      }

      logger.info('Alert notification sent', {
        alertId: alert.id,
        channel: channel.type,
        severity: alert.severity,
      });
    } catch (error) {
      logger.error('Failed to send alert notification', error, {
        alertId: alert.id,
        channel: channel.type,
      });
    }
  }

  // Send Slack alert
  private async sendSlackAlert(alert: Alert, config: any): Promise<void> {
    if (!config.webhook) return;

    const color =
      alert.severity === 'critical'
        ? 'danger'
        : alert.severity === 'warning'
          ? 'warning'
          : 'good';

    const emoji = alert.severity === 'critical' ? '🚨' : '⚠️';

    const payload = {
      text: `${emoji} Alert: ${alert.ruleName}`,
      attachments: [
        {
          color,
          title: alert.message,
          fields: [
            {
              title: 'Severity',
              value: alert.severity.toUpperCase(),
              short: true,
            },
            {
              title: 'Value',
              value: alert.value.toFixed(2),
              short: true,
            },
            {
              title: 'Threshold',
              value: alert.threshold.toString(),
              short: true,
            },
            {
              title: 'Time',
              value: new Date(alert.timestamp).toISOString(),
              short: true,
            },
          ],
          footer: 'WedSync Monitoring',
          ts: Math.floor(alert.timestamp / 1000),
        },
      ],
    };

    await fetch(config.webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  // Send email alert
  private async sendEmailAlert(alert: Alert, config: any): Promise<void> {
    if (!config.recipients || !process.env.ALERT_EMAIL_URL) return;

    const payload = {
      to: config.recipients,
      subject: `[WedSync Alert] ${alert.severity.toUpperCase()}: ${alert.ruleName}`,
      html: `
        <h2>Alert: ${alert.ruleName}</h2>
        <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
        <p><strong>Message:</strong> ${alert.message}</p>
        <p><strong>Current Value:</strong> ${alert.value.toFixed(2)}</p>
        <p><strong>Threshold:</strong> ${alert.threshold}</p>
        <p><strong>Time:</strong> ${new Date(alert.timestamp).toISOString()}</p>
        
        <h3>Alert Details</h3>
        <ul>
          <li><strong>Rule ID:</strong> ${alert.ruleId}</li>
          <li><strong>Alert ID:</strong> ${alert.id}</li>
          <li><strong>Metric:</strong> ${alert.metadata.metric}</li>
        </ul>
        
        <p><em>This alert was generated by WedSync Monitoring System</em></p>
      `,
    };

    await fetch(process.env.ALERT_EMAIL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  // Send PagerDuty alert
  private async sendPagerDutyAlert(alert: Alert, config: any): Promise<void> {
    if (!config.routingKey) return;

    const payload = {
      routing_key: config.routingKey,
      event_action: 'trigger',
      dedup_key: `wedsync-alert-${alert.ruleId}`,
      payload: {
        summary: `${alert.severity.toUpperCase()}: ${alert.ruleName}`,
        severity: alert.severity === 'critical' ? 'critical' : 'warning',
        source: 'wedsync-monitoring',
        component: alert.metadata.metric,
        group: 'alerts',
        class: 'performance',
        custom_details: {
          alert_id: alert.id,
          rule_id: alert.ruleId,
          current_value: alert.value,
          threshold: alert.threshold,
          message: alert.message,
          timestamp: new Date(alert.timestamp).toISOString(),
        },
      },
    };

    await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  // Send webhook alert
  private async sendWebhookAlert(alert: Alert, config: any): Promise<void> {
    if (!config.url) return;

    const payload = {
      type: 'alert',
      alert,
      service: 'wedsync',
      environment: process.env.NODE_ENV || 'development',
    };

    await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.headers || {}),
      },
      body: JSON.stringify(payload),
    });
  }

  // Send SMS alert (placeholder - would integrate with SMS service)
  private async sendSMSAlert(alert: Alert, config: any): Promise<void> {
    if (!config.numbers || !process.env.SMS_API_URL) return;

    const message = `[WedSync Alert] ${alert.severity.toUpperCase()}: ${alert.ruleName} - ${alert.message}`;

    for (const number of config.numbers) {
      await fetch(process.env.SMS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: number,
          message,
          service: 'wedsync-alerts',
        }),
      });
    }
  }

  // Schedule escalation
  private scheduleEscalation(alert: Alert, rule: AlertRule): void {
    if (!rule.escalation) return;

    rule.escalation.levels.forEach((level) => {
      setTimeout(
        async () => {
          const currentAlert = this.activeAlerts.get(alert.id);
          if (currentAlert && currentAlert.status === 'active') {
            currentAlert.escalationLevel++;
            currentAlert.severity = level.severity;

            logger.warn('Alert escalated', {
              alertId: alert.id,
              level: currentAlert.escalationLevel,
              newSeverity: level.severity,
            });

            await this.sendAlertNotifications(
              currentAlert,
              level.additionalChannels,
            );

            metrics.incrementCounter('alerts.escalated', 1, {
              ruleId: rule.id,
              level: String(currentAlert.escalationLevel),
            });
          }
        },
        level.afterMinutes * 60 * 1000,
      );
    });
  }

  // Acknowledge alert
  acknowledgeAlert(alertId: string, userId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert || alert.status !== 'active') {
      return false;
    }

    alert.status = 'acknowledged';
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = Date.now();

    logger.info('Alert acknowledged', {
      alertId,
      acknowledgedBy: userId,
      ruleName: alert.ruleName,
    });

    metrics.incrementCounter('alerts.acknowledged', 1, {
      ruleId: alert.ruleId,
      severity: alert.severity,
    });

    return true;
  }

  // Resolve alert
  private async resolveAlert(alertId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return;

    alert.status = 'resolved';
    alert.resolvedAt = Date.now();

    logger.info('Alert resolved', {
      alertId,
      ruleName: alert.ruleName,
      duration: alert.resolvedAt - alert.timestamp,
    });

    metrics.incrementCounter('alerts.resolved', 1, {
      ruleId: alert.ruleId,
      severity: alert.severity,
    });

    // Send resolution notification if PagerDuty
    const rule = this.rules.get(alert.ruleId);
    if (rule) {
      const pagerDutyChannel = rule.channels.find(
        (c) => c.type === 'pagerduty' && c.enabled,
      );
      if (pagerDutyChannel) {
        await this.sendPagerDutyResolution(alert, pagerDutyChannel.config);
      }
    }

    // Remove from active alerts after a delay
    setTimeout(() => {
      this.activeAlerts.delete(alertId);
    }, 300000); // Keep for 5 minutes for reference
  }

  // Send PagerDuty resolution
  private async sendPagerDutyResolution(
    alert: Alert,
    config: any,
  ): Promise<void> {
    if (!config.routingKey) return;

    const payload = {
      routing_key: config.routingKey,
      event_action: 'resolve',
      dedup_key: `wedsync-alert-${alert.ruleId}`,
    };

    await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  // Utility methods
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private getActiveAlert(ruleId: string): Alert | undefined {
    for (const alert of this.activeAlerts.values()) {
      if (alert.ruleId === ruleId && alert.status === 'active') {
        return alert;
      }
    }
    return undefined;
  }

  // Public API methods
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    logger.info('Alert rule added', { ruleId: rule.id, ruleName: rule.name });
  }

  updateRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    Object.assign(rule, updates);
    logger.info('Alert rule updated', { ruleId, updates });
    return true;
  }

  deleteRule(ruleId: string): boolean {
    const deleted = this.rules.delete(ruleId);
    if (deleted) {
      logger.info('Alert rule deleted', { ruleId });
    }
    return deleted;
  }

  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values()).filter(
      (alert) => alert.status === 'active',
    );
  }

  getAllAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  getAlertHistory(hours: number = 24): Alert[] {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return Array.from(this.activeAlerts.values()).filter(
      (alert) => alert.timestamp >= cutoff,
    );
  }

  // Health check
  getStatus(): {
    rulesCount: number;
    enabledRules: number;
    activeAlerts: number;
    lastEvaluation: number;
  } {
    return {
      rulesCount: this.rules.size,
      enabledRules: Array.from(this.rules.values()).filter((r) => r.enabled)
        .length,
      activeAlerts: this.getActiveAlerts().length,
      lastEvaluation: Math.max(...this.lastEvaluations.values(), 0),
    };
  }

  // Cleanup
  destroy(): void {
    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval);
    }
    logger.info('Alert manager destroyed');
  }
}

// Global alert manager instance
export const alertManager = AlertManager.getInstance();

// Express middleware to expose alerts API
export function alertsApiRoute(req: any, res: any): void {
  const { method } = req;

  switch (method) {
    case 'GET':
      if (req.path.endsWith('/status')) {
        res.json(alertManager.getStatus());
      } else if (req.path.endsWith('/rules')) {
        res.json(alertManager.getRules());
      } else if (req.path.endsWith('/alerts')) {
        const hours = parseInt(req.query.hours) || 24;
        res.json(alertManager.getAlertHistory(hours));
      } else {
        res.json(alertManager.getActiveAlerts());
      }
      break;

    case 'POST':
      if (req.path.endsWith('/acknowledge')) {
        const { alertId, userId } = req.body;
        const success = alertManager.acknowledgeAlert(alertId, userId);
        res.json({ success });
      } else {
        res.status(404).json({ error: 'Not found' });
      }
      break;

    default:
      res.status(405).json({ error: 'Method not allowed' });
  }
}
