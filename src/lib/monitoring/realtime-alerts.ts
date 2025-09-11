/**
 * Real-time System Alerts and Notifications
 * Wedding Day Priority Alert System for WedSync Production
 * Saturday Operations: Maximum urgency with immediate escalation protocols
 */

import { logger } from './structured-logger';
import { metrics } from './metrics';
import { databaseMonitor } from './database-performance';

interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: AlertCondition;
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
  weddingDayEnabled: boolean;
  cooldownMinutes: number;
  escalationMinutes?: number;
  channels: AlertChannel[];
  weddingDayChannels?: AlertChannel[];
  metadata?: Record<string, any>;
}

interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'ne' | 'gte' | 'lte' | 'contains' | 'regex';
  threshold: number | string;
  duration?: number; // Minutes that condition must persist
  weddingDayThreshold?: number | string; // Stricter threshold for wedding days
}

interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'push';
  target: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  weddingDayOnly?: boolean;
  escalationChannel?: boolean;
}

interface Alert {
  id: string;
  ruleId: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved';
  createdAt: string;
  updatedAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  isWeddingDay: boolean;
  weddingDayPriority: boolean;
  escalated: boolean;
  escalatedAt?: string;
  notificationsSent: NotificationAttempt[];
  metadata?: Record<string, any>;
}

interface NotificationAttempt {
  channel: AlertChannel;
  attemptedAt: string;
  status: 'pending' | 'sent' | 'failed' | 'delivered' | 'read';
  error?: string;
  responseTime?: number;
  messageId?: string;
}

interface AlertingMetrics {
  activeAlerts: number;
  criticalAlerts: number;
  weddingDayAlerts: number;
  alertsResolvedToday: number;
  averageResolutionTime: number;
  notificationSuccessRate: number;
  escalatedAlerts: number;
  channelPerformance: {
    [channelType: string]: {
      sent: number;
      delivered: number;
      failed: number;
      averageDeliveryTime: number;
    };
  };
}

class RealtimeAlertSystem {
  private alerts: Map<string, Alert> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private cooldowns: Map<string, Date> = new Map();
  private isWeddingDay: boolean = false;
  private monitoring: boolean = false;

  // Wedding day emergency contacts
  private emergencyContacts = {
    email: ['emergency@wedsync.com', 'admin@wedsync.com'],
    slack: ['#wedding-emergency', '#critical-alerts'],
    sms: ['+1234567890'], // Emergency phone numbers
  };

  // Default alert rules for WedSync
  private defaultRules: Partial<AlertRule>[] = [
    {
      name: 'Database Response Time',
      description: 'Alert when database queries are too slow',
      condition: {
        metric: 'database.query.average_response_time',
        operator: 'gt',
        threshold: 1000,
        weddingDayThreshold: 500,
        duration: 2,
      },
      severity: 'warning',
      cooldownMinutes: 5,
      escalationMinutes: 15,
    },
    {
      name: 'Payment System Down',
      description: 'Critical alert for payment system failures',
      condition: {
        metric: 'stripe.error_rate',
        operator: 'gt',
        threshold: 5,
        weddingDayThreshold: 1,
        duration: 1,
      },
      severity: 'critical',
      cooldownMinutes: 1,
      escalationMinutes: 5,
    },
    {
      name: 'High Server Memory Usage',
      description: 'Server memory usage is critically high',
      condition: {
        metric: 'system.memory.usage_percent',
        operator: 'gt',
        threshold: 85,
        weddingDayThreshold: 75,
        duration: 3,
      },
      severity: 'warning',
      cooldownMinutes: 10,
      escalationMinutes: 20,
    },
    {
      name: 'Wedding Day System Health',
      description: 'Overall system health degraded on wedding day',
      condition: {
        metric: 'system.health_score',
        operator: 'lt',
        threshold: 90,
        weddingDayThreshold: 95,
        duration: 1,
      },
      severity: 'critical',
      cooldownMinutes: 2,
      escalationMinutes: 5,
      weddingDayEnabled: true,
    },
    {
      name: 'Database Connection Pool Full',
      description: 'Database connection pool nearing capacity',
      condition: {
        metric: 'database.connection_pool.utilization',
        operator: 'gt',
        threshold: 80,
        weddingDayThreshold: 70,
        duration: 2,
      },
      severity: 'warning',
      cooldownMinutes: 5,
      escalationMinutes: 10,
    },
  ];

  constructor() {
    this.isWeddingDay = new Date().getDay() === 6; // Saturday
    this.initializeDefaultRules();
    this.startMonitoring();
  }

  private initializeDefaultRules(): void {
    this.defaultRules.forEach((rule, index) => {
      const alertRule: AlertRule = {
        id: `default-rule-${index}`,
        name: rule.name!,
        description: rule.description!,
        condition: rule.condition!,
        severity: rule.severity!,
        enabled: true,
        weddingDayEnabled: rule.weddingDayEnabled ?? true,
        cooldownMinutes: rule.cooldownMinutes!,
        escalationMinutes: rule.escalationMinutes,
        channels: this.getDefaultChannels(rule.severity!),
        weddingDayChannels: this.getWeddingDayChannels(rule.severity!),
        metadata: {
          isDefault: true,
          createdAt: new Date().toISOString(),
        },
      };

      this.alertRules.set(alertRule.id, alertRule);
    });

    logger.info('Initialized default alert rules', {
      context: 'RealtimeAlertSystem',
      rulesCount: this.alertRules.size,
      weddingDay: this.isWeddingDay,
    });
  }

  private getDefaultChannels(severity: string): AlertChannel[] {
    const channels: AlertChannel[] = [
      {
        type: 'email',
        target: 'admin@wedsync.com',
        priority: severity === 'critical' ? 'critical' : 'medium',
      },
      {
        type: 'slack',
        target: severity === 'critical' ? '#critical-alerts' : '#alerts',
        priority: severity === 'critical' ? 'critical' : 'medium',
      },
    ];

    if (severity === 'critical') {
      channels.push({
        type: 'webhook',
        target: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
        priority: 'critical',
      });
    }

    return channels;
  }

  private getWeddingDayChannels(severity: string): AlertChannel[] {
    return [
      ...this.getDefaultChannels(severity),
      {
        type: 'slack',
        target: '#wedding-day-ops',
        priority: 'critical',
        weddingDayOnly: true,
      },
      ...(severity === 'critical'
        ? [
            {
              type: 'email',
              target: 'emergency@wedsync.com',
              priority: 'critical' as const,
              weddingDayOnly: true,
              escalationChannel: true,
            },
            {
              type: 'sms',
              target: '+1234567890',
              priority: 'critical' as const,
              weddingDayOnly: true,
              escalationChannel: true,
            },
          ]
        : []),
    ];
  }

  private startMonitoring(): void {
    if (this.monitoring) return;

    this.monitoring = true;

    // Check alert conditions every 30 seconds
    setInterval(() => {
      this.checkAlertConditions();
    }, 30000);

    // Check for escalations every minute
    setInterval(() => {
      this.checkEscalations();
    }, 60000);

    // Wedding day enhanced monitoring
    if (this.isWeddingDay) {
      logger.info('🎂 Wedding day alert system activated', {
        context: 'RealtimeAlertSystem',
        emergencyContacts: Object.keys(this.emergencyContacts),
      });

      // More frequent monitoring on wedding day
      setInterval(() => {
        this.checkWeddingDayConditions();
      }, 15000); // Every 15 seconds
    }

    // Cleanup resolved alerts older than 7 days
    setInterval(
      () => {
        this.cleanupResolvedAlerts();
      },
      24 * 60 * 60 * 1000,
    ); // Daily
  }

  // Create or update alert rule
  public createAlertRule(rule: Omit<AlertRule, 'id'>): string {
    const id = `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const alertRule: AlertRule = {
      id,
      ...rule,
      enabled: rule.enabled ?? true,
      weddingDayEnabled: rule.weddingDayEnabled ?? this.isWeddingDay,
      channels: rule.channels || this.getDefaultChannels(rule.severity),
      weddingDayChannels:
        rule.weddingDayChannels || this.getWeddingDayChannels(rule.severity),
    };

    this.alertRules.set(id, alertRule);

    logger.info('Created alert rule', {
      context: 'RealtimeAlertSystem',
      ruleId: id,
      ruleName: rule.name,
      severity: rule.severity,
    });

    return id;
  }

  // Trigger alert manually (for testing or external systems)
  public async triggerAlert(
    title: string,
    description: string,
    severity: Alert['severity'],
    metadata?: Record<string, any>,
  ): Promise<string> {
    const alertId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const alert: Alert = {
      id: alertId,
      ruleId: 'manual-trigger',
      title,
      description,
      severity,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      isWeddingDay: this.isWeddingDay,
      weddingDayPriority:
        this.isWeddingDay &&
        (severity === 'critical' || severity === 'warning'),
      escalated: false,
      notificationsSent: [],
      metadata,
    };

    this.alerts.set(alertId, alert);

    // Send notifications
    await this.sendNotifications(alert);

    // Update metrics
    metrics.increment('alerts.triggered');
    metrics.increment(`alerts.triggered.${severity}`);

    if (this.isWeddingDay) {
      metrics.increment('alerts.triggered.wedding_day');
    }

    logger.warn('Alert triggered', {
      context: 'RealtimeAlertSystem',
      alertId,
      title,
      severity,
      weddingDay: this.isWeddingDay,
    });

    return alertId;
  }

  // Acknowledge alert
  public async acknowledgeAlert(
    alertId: string,
    acknowledgedBy: string,
  ): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.status !== 'active') {
      return false;
    }

    const now = new Date().toISOString();
    alert.status = 'acknowledged';
    alert.acknowledgedAt = now;
    alert.acknowledgedBy = acknowledgedBy;
    alert.updatedAt = now;

    this.alerts.set(alertId, alert);

    // Send acknowledgment notification
    await this.sendAcknowledgmentNotification(alert, acknowledgedBy);

    logger.info('Alert acknowledged', {
      context: 'RealtimeAlertSystem',
      alertId,
      acknowledgedBy,
      weddingDay: alert.isWeddingDay,
    });

    return true;
  }

  // Resolve alert
  public async resolveAlert(
    alertId: string,
    resolvedBy: string,
    resolution?: string,
  ): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      return false;
    }

    const now = new Date().toISOString();
    alert.status = 'resolved';
    alert.resolvedAt = now;
    alert.resolvedBy = resolvedBy;
    alert.updatedAt = now;

    if (resolution) {
      alert.metadata = { ...alert.metadata, resolution };
    }

    this.alerts.set(alertId, alert);

    // Send resolution notification
    await this.sendResolutionNotification(alert, resolvedBy, resolution);

    // Calculate resolution time for metrics
    const resolutionTime =
      new Date(now).getTime() - new Date(alert.createdAt).getTime();
    metrics.histogram('alerts.resolution_time', resolutionTime / 1000 / 60); // minutes

    logger.info('Alert resolved', {
      context: 'RealtimeAlertSystem',
      alertId,
      resolvedBy,
      resolutionTimeMinutes: Math.round(resolutionTime / 1000 / 60),
      weddingDay: alert.isWeddingDay,
    });

    return true;
  }

  // Check all alert conditions
  private async checkAlertConditions(): Promise<void> {
    try {
      for (const [ruleId, rule] of this.alertRules) {
        if (!rule.enabled || (this.isWeddingDay && !rule.weddingDayEnabled)) {
          continue;
        }

        // Check cooldown
        const cooldownKey = `${ruleId}-cooldown`;
        const cooldownUntil = this.cooldowns.get(cooldownKey);
        if (cooldownUntil && cooldownUntil > new Date()) {
          continue;
        }

        // Evaluate condition
        const conditionMet = await this.evaluateCondition(rule.condition);

        if (conditionMet) {
          await this.handleConditionMet(rule);
        }
      }
    } catch (error) {
      logger.error('Error checking alert conditions', error as Error, {
        context: 'RealtimeAlertSystem',
      });
    }
  }

  // Check for wedding day specific conditions
  private async checkWeddingDayConditions(): Promise<void> {
    if (!this.isWeddingDay) return;

    try {
      // Get current database performance
      const dbHealth = await databaseMonitor.getHealthMetrics();

      // Check critical wedding day metrics
      if (dbHealth.performanceScore < 90) {
        await this.triggerAlert(
          '🎂 Wedding Day: Database Performance Degraded',
          `Database performance score: ${dbHealth.performanceScore}/100. Critical wedding operations at risk.`,
          'critical',
          {
            performanceScore: dbHealth.performanceScore,
            averageResponseTime: dbHealth.queryMetrics.averageResponseTime,
            weddingDayCritical: true,
          },
        );
      }

      // Check connection pool on wedding day
      if (dbHealth.connectionMetrics.connectionPoolUtilization > 70) {
        await this.triggerAlert(
          '🎂 Wedding Day: High Database Connection Usage',
          `Connection pool utilization: ${dbHealth.connectionMetrics.connectionPoolUtilization.toFixed(1)}%. May impact wedding operations.`,
          'warning',
          {
            utilization: dbHealth.connectionMetrics.connectionPoolUtilization,
            activeConnections: dbHealth.connectionMetrics.activeConnections,
            weddingDayCritical: true,
          },
        );
      }
    } catch (error) {
      logger.error('Error checking wedding day conditions', error as Error);
    }
  }

  // Check for alert escalations
  private async checkEscalations(): Promise<void> {
    try {
      const now = new Date();

      for (const [alertId, alert] of this.alerts) {
        if (alert.status !== 'active' || alert.escalated) {
          continue;
        }

        const rule = this.alertRules.get(alert.ruleId);
        if (!rule || !rule.escalationMinutes) {
          continue;
        }

        const alertAge =
          (now.getTime() - new Date(alert.createdAt).getTime()) / 1000 / 60;
        const escalationThreshold = this.isWeddingDay
          ? Math.min(rule.escalationMinutes, rule.escalationMinutes / 2) // Faster escalation on wedding day
          : rule.escalationMinutes;

        if (alertAge >= escalationThreshold) {
          await this.escalateAlert(alert, rule);
        }
      }
    } catch (error) {
      logger.error('Error checking escalations', error as Error, {
        context: 'RealtimeAlertSystem',
      });
    }
  }

  // Evaluate alert condition
  private async evaluateCondition(condition: AlertCondition): Promise<boolean> {
    try {
      // Get current metric value
      const currentValue = await this.getMetricValue(condition.metric);
      if (currentValue === null) {
        return false;
      }

      // Use wedding day threshold if applicable
      const threshold =
        this.isWeddingDay && condition.weddingDayThreshold !== undefined
          ? condition.weddingDayThreshold
          : condition.threshold;

      // Evaluate condition
      switch (condition.operator) {
        case 'gt':
          return currentValue > threshold;
        case 'gte':
          return currentValue >= threshold;
        case 'lt':
          return currentValue < threshold;
        case 'lte':
          return currentValue <= threshold;
        case 'eq':
          return currentValue === threshold;
        case 'ne':
          return currentValue !== threshold;
        case 'contains':
          return String(currentValue).includes(String(threshold));
        case 'regex':
          return new RegExp(String(threshold)).test(String(currentValue));
        default:
          return false;
      }
    } catch (error) {
      logger.error('Error evaluating condition', error as Error, {
        context: 'RealtimeAlertSystem',
        condition,
      });
      return false;
    }
  }

  // Get metric value (mock implementation - in production, integrate with actual metrics)
  private async getMetricValue(metric: string): Promise<number | null> {
    // Mock implementation - in production, integrate with your metrics system
    switch (metric) {
      case 'database.query.average_response_time':
        const dbHealth = await databaseMonitor.getHealthMetrics();
        return dbHealth.queryMetrics.averageResponseTime;

      case 'database.connection_pool.utilization':
        const dbHealth2 = await databaseMonitor.getHealthMetrics();
        return dbHealth2.connectionMetrics.connectionPoolUtilization;

      case 'system.memory.usage_percent':
        const memUsage = process.memoryUsage();
        return (memUsage.heapUsed / memUsage.heapTotal) * 100;

      case 'system.health_score':
        return Math.random() * 20 + 80; // 80-100 range

      case 'stripe.error_rate':
        return Math.random() * 10; // 0-10% error rate

      default:
        return null;
    }
  }

  // Handle when alert condition is met
  private async handleConditionMet(rule: AlertRule): Promise<void> {
    // Check if there's already an active alert for this rule
    const existingAlert = Array.from(this.alerts.values()).find(
      (alert) => alert.ruleId === rule.id && alert.status === 'active',
    );

    if (existingAlert) {
      // Update existing alert
      existingAlert.updatedAt = new Date().toISOString();
      this.alerts.set(existingAlert.id, existingAlert);
      return;
    }

    // Create new alert
    await this.triggerAlert(rule.name, rule.description, rule.severity, {
      ruleId: rule.id,
      condition: rule.condition,
      triggeredBy: 'automatic',
    });

    // Set cooldown
    const cooldownKey = `${rule.id}-cooldown`;
    const cooldownUntil = new Date(
      Date.now() + rule.cooldownMinutes * 60 * 1000,
    );
    this.cooldowns.set(cooldownKey, cooldownUntil);
  }

  // Send notifications for alert
  private async sendNotifications(alert: Alert): Promise<void> {
    const rule = this.alertRules.get(alert.ruleId);
    if (!rule) return;

    const channels =
      this.isWeddingDay && rule.weddingDayChannels
        ? rule.weddingDayChannels
        : rule.channels;

    for (const channel of channels) {
      if (channel.weddingDayOnly && !this.isWeddingDay) {
        continue;
      }

      const attempt: NotificationAttempt = {
        channel,
        attemptedAt: new Date().toISOString(),
        status: 'pending',
      };

      try {
        const startTime = Date.now();
        await this.sendNotification(alert, channel);

        attempt.status = 'sent';
        attempt.responseTime = Date.now() - startTime;

        metrics.increment('alerts.notifications.sent');
        metrics.increment(`alerts.notifications.sent.${channel.type}`);
      } catch (error) {
        attempt.status = 'failed';
        attempt.error =
          error instanceof Error ? error.message : 'Unknown error';

        metrics.increment('alerts.notifications.failed');
        metrics.increment(`alerts.notifications.failed.${channel.type}`);

        logger.error('Failed to send alert notification', error as Error, {
          alertId: alert.id,
          channel: channel.type,
          target: channel.target,
        });
      }

      alert.notificationsSent.push(attempt);
    }

    this.alerts.set(alert.id, alert);
  }

  // Send individual notification
  private async sendNotification(
    alert: Alert,
    channel: AlertChannel,
  ): Promise<void> {
    const message = this.formatAlertMessage(alert, channel.type);

    switch (channel.type) {
      case 'email':
        await this.sendEmailNotification(channel.target, alert.title, message);
        break;

      case 'slack':
        await this.sendSlackNotification(channel.target, message, alert);
        break;

      case 'webhook':
        await this.sendWebhookNotification(channel.target, alert);
        break;

      case 'sms':
        await this.sendSMSNotification(channel.target, message);
        break;

      case 'push':
        await this.sendPushNotification(channel.target, alert.title, message);
        break;
    }
  }

  // Format alert message for different channels
  private formatAlertMessage(alert: Alert, channelType: string): string {
    const weddingDayPrefix = alert.isWeddingDay ? '🎂 WEDDING DAY ' : '';
    const severityIcon = {
      info: 'ℹ️',
      warning: '⚠️',
      critical: '🚨',
    }[alert.severity];

    switch (channelType) {
      case 'slack':
        return (
          `${severityIcon} ${weddingDayPrefix}*${alert.title}*\n` +
          `${alert.description}\n` +
          `*Severity:* ${alert.severity.toUpperCase()}\n` +
          `*Time:* ${new Date(alert.createdAt).toLocaleString()}\n` +
          (alert.weddingDayPriority
            ? `*🎂 WEDDING DAY PRIORITY ALERT*\n`
            : '') +
          `*Alert ID:* ${alert.id}`
        );

      case 'email':
        return (
          `${weddingDayPrefix}${alert.title}\n\n` +
          `${alert.description}\n\n` +
          `Severity: ${alert.severity.toUpperCase()}\n` +
          `Time: ${new Date(alert.createdAt).toLocaleString()}\n` +
          `Alert ID: ${alert.id}\n\n` +
          (alert.weddingDayPriority
            ? 'This is a WEDDING DAY PRIORITY ALERT requiring immediate attention.\n\n'
            : '') +
          `Please acknowledge this alert in the WedSync admin dashboard.`
        );

      case 'sms':
        return (
          `${weddingDayPrefix}${severityIcon} ${alert.title} - ${alert.severity.toUpperCase()}. ` +
          `${alert.description.substring(0, 100)}... Alert ID: ${alert.id}`
        );

      default:
        return `${weddingDayPrefix}${alert.title}: ${alert.description}`;
    }
  }

  // Escalate alert
  private async escalateAlert(alert: Alert, rule: AlertRule): Promise<void> {
    alert.escalated = true;
    alert.escalatedAt = new Date().toISOString();
    alert.updatedAt = alert.escalatedAt;

    // Send escalation notifications
    const escalationChannels = (
      this.isWeddingDay && rule.weddingDayChannels
        ? rule.weddingDayChannels
        : rule.channels
    ).filter(
      (channel) => channel.escalationChannel || channel.priority === 'critical',
    );

    for (const channel of escalationChannels) {
      try {
        const escalationMessage =
          `🚨 ESCALATED ALERT 🚨\n\n` +
          `Alert "${alert.title}" has been active for ${rule.escalationMinutes} minutes without acknowledgment.\n\n` +
          this.formatAlertMessage(alert, channel.type);

        await this.sendNotification(
          { ...alert, description: escalationMessage },
          channel,
        );
      } catch (error) {
        logger.error('Failed to send escalation notification', error as Error);
      }
    }

    this.alerts.set(alert.id, alert);

    metrics.increment('alerts.escalated');
    if (this.isWeddingDay) {
      metrics.increment('alerts.escalated.wedding_day');
    }

    logger.warn('Alert escalated', {
      context: 'RealtimeAlertSystem',
      alertId: alert.id,
      title: alert.title,
      minutesActive: rule.escalationMinutes,
      weddingDay: this.isWeddingDay,
    });
  }

  // Notification method implementations (mock - implement with actual services)
  private async sendEmailNotification(
    to: string,
    subject: string,
    body: string,
  ): Promise<void> {
    // Mock implementation - integrate with Resend or your email service
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate delay
    logger.info('Email notification sent', { to, subject });
  }

  private async sendSlackNotification(
    channel: string,
    message: string,
    alert: Alert,
  ): Promise<void> {
    // Mock implementation - integrate with Slack API
    await new Promise((resolve) => setTimeout(resolve, 50)); // Simulate delay
    logger.info('Slack notification sent', { channel, alertId: alert.id });
  }

  private async sendWebhookNotification(
    url: string,
    alert: Alert,
  ): Promise<void> {
    // Mock implementation - HTTP POST to webhook URL
    await new Promise((resolve) => setTimeout(resolve, 200)); // Simulate delay
    logger.info('Webhook notification sent', { url, alertId: alert.id });
  }

  private async sendSMSNotification(
    to: string,
    message: string,
  ): Promise<void> {
    // Mock implementation - integrate with Twilio
    await new Promise((resolve) => setTimeout(resolve, 150)); // Simulate delay
    logger.info('SMS notification sent', { to });
  }

  private async sendPushNotification(
    deviceId: string,
    title: string,
    body: string,
  ): Promise<void> {
    // Mock implementation - integrate with push notification service
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate delay
    logger.info('Push notification sent', { deviceId, title });
  }

  // Send acknowledgment notification
  private async sendAcknowledgmentNotification(
    alert: Alert,
    acknowledgedBy: string,
  ): Promise<void> {
    const message = `✅ Alert acknowledged by ${acknowledgedBy}:\n\n${alert.title}\n\nAlert ID: ${alert.id}`;

    // Send to primary notification channels
    const rule = this.alertRules.get(alert.ruleId);
    if (rule) {
      const channels = (
        this.isWeddingDay && rule.weddingDayChannels
          ? rule.weddingDayChannels
          : rule.channels
      ).slice(0, 2); // Limit to primary channels

      for (const channel of channels) {
        try {
          await this.sendNotification(
            { ...alert, description: message },
            channel,
          );
        } catch (error) {
          logger.error(
            'Failed to send acknowledgment notification',
            error as Error,
          );
        }
      }
    }
  }

  // Send resolution notification
  private async sendResolutionNotification(
    alert: Alert,
    resolvedBy: string,
    resolution?: string,
  ): Promise<void> {
    const resolutionTime =
      alert.resolvedAt && alert.createdAt
        ? Math.round(
            (new Date(alert.resolvedAt).getTime() -
              new Date(alert.createdAt).getTime()) /
              1000 /
              60,
          )
        : 0;

    const message =
      `✅ Alert resolved by ${resolvedBy}:\n\n${alert.title}\n\n` +
      `Resolution time: ${resolutionTime} minutes\n` +
      (resolution ? `Resolution: ${resolution}\n` : '') +
      `Alert ID: ${alert.id}`;

    // Send to primary notification channels
    const rule = this.alertRules.get(alert.ruleId);
    if (rule) {
      const channels = (
        this.isWeddingDay && rule.weddingDayChannels
          ? rule.weddingDayChannels
          : rule.channels
      ).slice(0, 2); // Limit to primary channels

      for (const channel of channels) {
        try {
          await this.sendNotification(
            { ...alert, description: message },
            channel,
          );
        } catch (error) {
          logger.error(
            'Failed to send resolution notification',
            error as Error,
          );
        }
      }
    }
  }

  // Cleanup resolved alerts older than 7 days
  private cleanupResolvedAlerts(): void {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [alertId, alert] of this.alerts) {
      if (
        alert.status === 'resolved' &&
        alert.resolvedAt &&
        new Date(alert.resolvedAt) < sevenDaysAgo
      ) {
        this.alerts.delete(alertId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} resolved alerts`, {
        context: 'RealtimeAlertSystem',
      });
    }
  }

  // Public API methods
  public getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(
      (alert) => alert.status === 'active',
    );
  }

  public getAlertById(alertId: string): Alert | undefined {
    return this.alerts.get(alertId);
  }

  public getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  public getAlertingMetrics(): AlertingMetrics {
    const alerts = Array.from(this.alerts.values());
    const activeAlerts = alerts.filter((a) => a.status === 'active');
    const criticalAlerts = activeAlerts.filter(
      (a) => a.severity === 'critical',
    );
    const weddingDayAlerts = alerts.filter((a) => a.isWeddingDay);

    const today = new Date().toDateString();
    const resolvedToday = alerts.filter(
      (a) =>
        a.status === 'resolved' &&
        a.resolvedAt &&
        new Date(a.resolvedAt).toDateString() === today,
    );

    return {
      activeAlerts: activeAlerts.length,
      criticalAlerts: criticalAlerts.length,
      weddingDayAlerts: weddingDayAlerts.length,
      alertsResolvedToday: resolvedToday.length,
      averageResolutionTime: 15.5, // Mock value - calculate from resolved alerts
      notificationSuccessRate: 98.5, // Mock value - calculate from notification attempts
      escalatedAlerts: alerts.filter((a) => a.escalated).length,
      channelPerformance: {
        email: {
          sent: 100,
          delivered: 98,
          failed: 2,
          averageDeliveryTime: 0.5,
        },
        slack: {
          sent: 150,
          delivered: 148,
          failed: 2,
          averageDeliveryTime: 0.1,
        },
        sms: { sent: 25, delivered: 24, failed: 1, averageDeliveryTime: 2.0 },
      },
    };
  }

  public isWeddingDayMode(): boolean {
    return this.isWeddingDay;
  }
}

// Export singleton instance
export const realtimeAlerts = new RealtimeAlertSystem();

// Export types for external use
export type {
  AlertRule,
  AlertCondition,
  AlertChannel,
  Alert,
  NotificationAttempt,
  AlertingMetrics,
};
