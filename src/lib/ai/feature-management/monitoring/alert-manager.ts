import { createClient } from '@/lib/supabase/client';
import { Logger } from '@/lib/logging/Logger';
import { z } from 'zod';

// Alert configuration schema
const AlertConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  component: z.string(),
  metric: z.enum([
    'response_time',
    'error_rate',
    'success_rate',
    'cost',
    'token_usage',
  ]),
  threshold_value: z.number(),
  comparison: z.enum(['greater_than', 'less_than', 'equals']),
  severity: z.enum(['info', 'warning', 'critical']),
  enabled: z.boolean(),
  notification_channels: z.array(
    z.enum(['email', 'slack', 'webhook', 'database']),
  ),
  cooldown_minutes: z.number(),
  conditions: z.object({
    time_window_minutes: z.number(),
    min_samples: z.number(),
    consecutive_breaches: z.number(),
  }),
  metadata: z.record(z.any()).optional(),
});

export type AlertConfig = z.infer<typeof AlertConfigSchema>;

interface AlertNotification {
  id: string;
  config_id: string;
  triggered_at: Date;
  resolved_at?: Date;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  details: Record<string, any>;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: Date;
}

interface NotificationChannel {
  type: 'email' | 'slack' | 'webhook' | 'database';
  config: Record<string, any>;
  enabled: boolean;
}

export class AIAlertManager {
  private logger: Logger;
  private supabase = createClient();
  private activeAlerts = new Map<string, AlertNotification>();
  private lastAlertTime = new Map<string, Date>();

  // Default alert configurations for wedding industry
  private defaultAlertConfigs: AlertConfig[] = [
    {
      id: 'semantic-analyzer-slow-response',
      name: 'Semantic Analyzer Slow Response',
      component: 'semantic-analyzer',
      metric: 'response_time',
      threshold_value: 8000, // 8 seconds
      comparison: 'greater_than',
      severity: 'warning',
      enabled: true,
      notification_channels: ['database', 'email'],
      cooldown_minutes: 15,
      conditions: {
        time_window_minutes: 5,
        min_samples: 3,
        consecutive_breaches: 2,
      },
    },
    {
      id: 'rice-scorer-high-error-rate',
      name: 'RICE Scorer High Error Rate',
      component: 'rice-scorer',
      metric: 'error_rate',
      threshold_value: 5, // 5%
      comparison: 'greater_than',
      severity: 'critical',
      enabled: true,
      notification_channels: ['database', 'email', 'slack'],
      cooldown_minutes: 5,
      conditions: {
        time_window_minutes: 10,
        min_samples: 5,
        consecutive_breaches: 1,
      },
    },
    {
      id: 'content-pipeline-cost-spike',
      name: 'Content Pipeline Cost Spike',
      component: 'content-pipeline',
      metric: 'cost',
      threshold_value: 1000, // $10.00 in cents
      comparison: 'greater_than',
      severity: 'warning',
      enabled: true,
      notification_channels: ['database', 'email'],
      cooldown_minutes: 30,
      conditions: {
        time_window_minutes: 60,
        min_samples: 1,
        consecutive_breaches: 1,
      },
    },
    {
      id: 'predictive-engine-low-success',
      name: 'Predictive Engine Low Success Rate',
      component: 'predictive-engine',
      metric: 'success_rate',
      threshold_value: 90, // 90%
      comparison: 'less_than',
      severity: 'critical',
      enabled: true,
      notification_channels: ['database', 'email', 'slack'],
      cooldown_minutes: 10,
      conditions: {
        time_window_minutes: 30,
        min_samples: 10,
        consecutive_breaches: 1,
      },
    },
    {
      id: 'wedding-day-performance-critical',
      name: 'Wedding Day Performance Critical',
      component: 'all',
      metric: 'response_time',
      threshold_value: 2000, // 2 seconds - stricter on Saturdays
      comparison: 'greater_than',
      severity: 'critical',
      enabled: true,
      notification_channels: ['database', 'email', 'slack', 'webhook'],
      cooldown_minutes: 1, // Very short cooldown for wedding days
      conditions: {
        time_window_minutes: 2,
        min_samples: 1,
        consecutive_breaches: 1,
      },
    },
  ];

  constructor() {
    this.logger = new Logger('AIAlertManager');
    this.initializeDefaultAlerts();
  }

  /**
   * Initialize default alert configurations
   */
  private async initializeDefaultAlerts(): Promise<void> {
    try {
      for (const config of this.defaultAlertConfigs) {
        await this.createOrUpdateAlertConfig(config);
      }
      this.logger.info('Default alert configurations initialized');
    } catch (error) {
      this.logger.error('Failed to initialize default alerts', { error });
    }
  }

  /**
   * Create or update alert configuration
   */
  async createOrUpdateAlertConfig(config: AlertConfig): Promise<void> {
    try {
      const validatedConfig = AlertConfigSchema.parse(config);

      const { error } = await this.supabase.from('ai_alert_configs').upsert(
        [
          {
            id: validatedConfig.id,
            name: validatedConfig.name,
            component: validatedConfig.component,
            metric: validatedConfig.metric,
            threshold_value: validatedConfig.threshold_value,
            comparison: validatedConfig.comparison,
            severity: validatedConfig.severity,
            enabled: validatedConfig.enabled,
            notification_channels: validatedConfig.notification_channels,
            cooldown_minutes: validatedConfig.cooldown_minutes,
            conditions: validatedConfig.conditions,
            metadata: validatedConfig.metadata,
            updated_at: new Date().toISOString(),
          },
        ],
        {
          onConflict: 'id',
        },
      );

      if (error) {
        this.logger.error('Failed to save alert config', {
          error,
          config: validatedConfig,
        });
      }
    } catch (error) {
      this.logger.error('Invalid alert configuration', { error, config });
    }
  }

  /**
   * Evaluate alerts for given metrics
   */
  async evaluateAlerts(
    component: string,
    metrics: Record<string, number>,
    context?: { isWeddingDay?: boolean; tier?: string; userId?: string },
  ): Promise<void> {
    try {
      // Get all enabled alert configurations
      const { data: alertConfigs, error } = await this.supabase
        .from('ai_alert_configs')
        .select('*')
        .eq('enabled', true)
        .or(`component.eq.${component},component.eq.all`);

      if (error) {
        this.logger.error('Failed to fetch alert configurations', { error });
        return;
      }

      for (const config of alertConfigs || []) {
        await this.evaluateAlert(config, metrics, context);
      }
    } catch (error) {
      this.logger.error('Error evaluating alerts', {
        error,
        component,
        metrics,
      });
    }
  }

  /**
   * Evaluate single alert configuration
   */
  private async evaluateAlert(
    config: any,
    metrics: Record<string, number>,
    context?: { isWeddingDay?: boolean; tier?: string; userId?: string },
  ): Promise<void> {
    const metricValue = metrics[config.metric];
    if (metricValue === undefined) return;

    // Check if threshold is breached
    const isBreached = this.isThresholdBreached(
      metricValue,
      config.threshold_value,
      config.comparison,
    );

    if (!isBreached) {
      // Check if we need to resolve an existing alert
      await this.resolveAlert(config.id);
      return;
    }

    // Check cooldown period
    const lastAlertTime = this.lastAlertTime.get(config.id);
    const cooldownPeriod = config.cooldown_minutes * 60 * 1000;

    if (
      lastAlertTime &&
      Date.now() - lastAlertTime.getTime() < cooldownPeriod
    ) {
      return; // Still in cooldown
    }

    // Special handling for wedding days
    if (context?.isWeddingDay && config.metric === 'response_time') {
      // Stricter thresholds on wedding days
      config.threshold_value = Math.min(config.threshold_value, 2000);
      config.severity = 'critical';
    }

    // Create alert notification
    const alert: AlertNotification = {
      id: `${config.id}-${Date.now()}`,
      config_id: config.id,
      triggered_at: new Date(),
      severity: config.severity,
      message: this.generateAlertMessage(config, metricValue, context),
      details: {
        metric: config.metric,
        current_value: metricValue,
        threshold_value: config.threshold_value,
        component: config.component,
        context: context || {},
      },
      acknowledged: false,
    };

    await this.triggerAlert(alert, config.notification_channels);
    this.lastAlertTime.set(config.id, new Date());
  }

  /**
   * Check if threshold is breached
   */
  private isThresholdBreached(
    currentValue: number,
    threshold: number,
    comparison: 'greater_than' | 'less_than' | 'equals',
  ): boolean {
    switch (comparison) {
      case 'greater_than':
        return currentValue > threshold;
      case 'less_than':
        return currentValue < threshold;
      case 'equals':
        return currentValue === threshold;
      default:
        return false;
    }
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(
    config: any,
    currentValue: number,
    context?: { isWeddingDay?: boolean; tier?: string; userId?: string },
  ): string {
    const component =
      config.component === 'all' ? 'AI System' : config.component;
    const weddingDayPrefix = context?.isWeddingDay ? '[WEDDING DAY] ' : '';

    switch (config.metric) {
      case 'response_time':
        return `${weddingDayPrefix}${component} response time is ${currentValue.toFixed(0)}ms (threshold: ${config.threshold_value}ms)`;
      case 'error_rate':
        return `${weddingDayPrefix}${component} error rate is ${currentValue.toFixed(1)}% (threshold: ${config.threshold_value}%)`;
      case 'success_rate':
        return `${weddingDayPrefix}${component} success rate is ${currentValue.toFixed(1)}% (threshold: ${config.threshold_value}%)`;
      case 'cost':
        return `${weddingDayPrefix}${component} cost is $${(currentValue / 100).toFixed(2)} (threshold: $${(config.threshold_value / 100).toFixed(2)})`;
      case 'token_usage':
        return `${weddingDayPrefix}${component} token usage is ${currentValue} (threshold: ${config.threshold_value})`;
      default:
        return `${weddingDayPrefix}${component} ${config.metric} alert triggered`;
    }
  }

  /**
   * Trigger alert notification
   */
  private async triggerAlert(
    alert: AlertNotification,
    channels: string[],
  ): Promise<void> {
    try {
      // Store alert in database
      const { error: dbError } = await this.supabase
        .from('ai_alert_notifications')
        .insert([
          {
            id: alert.id,
            config_id: alert.config_id,
            triggered_at: alert.triggered_at.toISOString(),
            severity: alert.severity,
            message: alert.message,
            details: alert.details,
            acknowledged: alert.acknowledged,
            created_at: new Date().toISOString(),
          },
        ]);

      if (dbError) {
        this.logger.error('Failed to store alert in database', {
          error: dbError,
          alert,
        });
      }

      // Store in memory
      this.activeAlerts.set(alert.id, alert);

      // Send notifications through configured channels
      for (const channel of channels) {
        await this.sendNotification(channel, alert);
      }

      this.logger.warn('AI Alert Triggered', {
        id: alert.id,
        severity: alert.severity,
        message: alert.message,
        channels,
      });
    } catch (error) {
      this.logger.error('Failed to trigger alert', { error, alert });
    }
  }

  /**
   * Send notification through specific channel
   */
  private async sendNotification(
    channel: string,
    alert: AlertNotification,
  ): Promise<void> {
    try {
      switch (channel) {
        case 'email':
          await this.sendEmailNotification(alert);
          break;
        case 'slack':
          await this.sendSlackNotification(alert);
          break;
        case 'webhook':
          await this.sendWebhookNotification(alert);
          break;
        case 'database':
          // Already handled in triggerAlert
          break;
        default:
          this.logger.warn('Unknown notification channel', { channel });
      }
    } catch (error) {
      this.logger.error('Failed to send notification', {
        error,
        channel,
        alert,
      });
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(alert: AlertNotification): Promise<void> {
    // Integration with Resend email service
    const emailService = await import('@/lib/email/resend-service');

    const subject = `[WedSync AI Alert] ${alert.severity.toUpperCase()}: ${alert.message}`;
    const body = this.generateEmailBody(alert);

    // Send to admin email addresses
    const adminEmails = ['admin@wedsync.com', 'tech@wedsync.com'];

    for (const email of adminEmails) {
      try {
        await emailService.sendEmail({
          to: email,
          subject,
          html: body,
        });
      } catch (error) {
        this.logger.error('Failed to send alert email', {
          error,
          email,
          alert,
        });
      }
    }
  }

  /**
   * Generate email body for alert
   */
  private generateEmailBody(alert: AlertNotification): string {
    const isWeddingDay = alert.details.context?.isWeddingDay;
    const urgencyClass = alert.severity === 'critical' ? 'critical' : 'warning';

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${alert.severity === 'critical' ? '#dc2626' : '#f59e0b'}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">
            ${isWeddingDay ? '🚨 WEDDING DAY ALERT' : '⚠️ AI Performance Alert'}
          </h2>
          <p style="margin: 10px 0 0 0; font-size: 18px;">${alert.message}</p>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <h3 style="margin: 0 0 15px 0;">Alert Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Component:</td>
              <td style="padding: 8px 0;">${alert.details.component}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Metric:</td>
              <td style="padding: 8px 0;">${alert.details.metric}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Current Value:</td>
              <td style="padding: 8px 0;">${alert.details.current_value}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Threshold:</td>
              <td style="padding: 8px 0;">${alert.details.threshold_value}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Triggered At:</td>
              <td style="padding: 8px 0;">${alert.triggered_at.toLocaleString()}</td>
            </tr>
            ${
              isWeddingDay
                ? `
            <tr style="background: #fef2f2;">
              <td style="padding: 8px 0; font-weight: bold; color: #dc2626;">Wedding Day:</td>
              <td style="padding: 8px 0; color: #dc2626;">YES - CRITICAL PRIORITY</td>
            </tr>
            `
                : ''
            }
          </table>
          
          ${
            isWeddingDay
              ? `
          <div style="margin-top: 20px; padding: 15px; background: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px;">
            <h4 style="margin: 0 0 10px 0; color: #dc2626;">Wedding Day Protocol Activated</h4>
            <p style="margin: 0; color: #7f1d1d;">
              This alert occurred on a Saturday (wedding day). All AI components must maintain < 2 second response times.
              Immediate investigation and resolution required to prevent impact on active weddings.
            </p>
          </div>
          `
              : ''
          }
          
          <div style="margin-top: 20px; text-align: center;">
            <a href="https://wedsync.com/admin/ai-monitoring" 
               style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View AI Monitoring Dashboard
            </a>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(alert: AlertNotification): Promise<void> {
    // In a real implementation, this would integrate with Slack API
    // For now, log the notification
    this.logger.info('Slack notification would be sent', {
      alert: {
        message: alert.message,
        severity: alert.severity,
        component: alert.details.component,
      },
    });
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(
    alert: AlertNotification,
  ): Promise<void> {
    // In a real implementation, this would send to configured webhooks
    this.logger.info('Webhook notification would be sent', {
      alert: {
        message: alert.message,
        severity: alert.severity,
        component: alert.details.component,
      },
    });
  }

  /**
   * Resolve alert
   */
  async resolveAlert(configId: string): Promise<void> {
    // Find active alerts for this config
    const activeAlert = Array.from(this.activeAlerts.values()).find(
      (alert) => alert.config_id === configId && !alert.resolved_at,
    );

    if (activeAlert) {
      activeAlert.resolved_at = new Date();

      // Update in database
      const { error } = await this.supabase
        .from('ai_alert_notifications')
        .update({
          resolved_at: activeAlert.resolved_at.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', activeAlert.id);

      if (error) {
        this.logger.error('Failed to resolve alert in database', {
          error,
          alertId: activeAlert.id,
        });
      } else {
        this.logger.info('Alert resolved', {
          alertId: activeAlert.id,
          configId,
        });
        this.activeAlerts.delete(activeAlert.id);
      }
    }
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(
    alertId: string,
    acknowledgedBy: string,
  ): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledged_by = acknowledgedBy;
      alert.acknowledged_at = new Date();

      // Update in database
      const { error } = await this.supabase
        .from('ai_alert_notifications')
        .update({
          acknowledged: true,
          acknowledged_by: acknowledgedBy,
          acknowledged_at: alert.acknowledged_at.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (error) {
        this.logger.error('Failed to acknowledge alert', { error, alertId });
      } else {
        this.logger.info('Alert acknowledged', { alertId, acknowledgedBy });
      }
    }
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(): Promise<AlertNotification[]> {
    const { data: alerts, error } = await this.supabase
      .from('ai_alert_notifications')
      .select('*')
      .is('resolved_at', null)
      .order('triggered_at', { ascending: false });

    if (error) {
      this.logger.error('Failed to fetch active alerts', { error });
      return Array.from(this.activeAlerts.values());
    }

    return (alerts || []).map((alert) => ({
      id: alert.id,
      config_id: alert.config_id,
      triggered_at: new Date(alert.triggered_at),
      resolved_at: alert.resolved_at ? new Date(alert.resolved_at) : undefined,
      severity: alert.severity,
      message: alert.message,
      details: alert.details,
      acknowledged: alert.acknowledged,
      acknowledged_by: alert.acknowledged_by,
      acknowledged_at: alert.acknowledged_at
        ? new Date(alert.acknowledged_at)
        : undefined,
    }));
  }

  /**
   * Get alert history
   */
  async getAlertHistory(
    timeRange: '1h' | '24h' | '7d' | '30d' = '24h',
    component?: string,
  ): Promise<AlertNotification[]> {
    const timeRangeHours = {
      '1h': 1,
      '24h': 24,
      '7d': 24 * 7,
      '30d': 24 * 30,
    }[timeRange];

    const startTime = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);

    let query = this.supabase
      .from('ai_alert_notifications')
      .select('*')
      .gte('triggered_at', startTime.toISOString())
      .order('triggered_at', { ascending: false });

    if (component) {
      query = query.contains('details', { component });
    }

    const { data: alerts, error } = await query;

    if (error) {
      this.logger.error('Failed to fetch alert history', { error });
      return [];
    }

    return (alerts || []).map((alert) => ({
      id: alert.id,
      config_id: alert.config_id,
      triggered_at: new Date(alert.triggered_at),
      resolved_at: alert.resolved_at ? new Date(alert.resolved_at) : undefined,
      severity: alert.severity,
      message: alert.message,
      details: alert.details,
      acknowledged: alert.acknowledged,
      acknowledged_by: alert.acknowledged_by,
      acknowledged_at: alert.acknowledged_at
        ? new Date(alert.acknowledged_at)
        : undefined,
    }));
  }

  /**
   * Test alert system
   */
  async testAlert(component: string = 'test-component'): Promise<void> {
    const testAlert: AlertNotification = {
      id: `test-alert-${Date.now()}`,
      config_id: 'test-config',
      triggered_at: new Date(),
      severity: 'warning',
      message: 'Test alert - AI monitoring system functional',
      details: {
        component,
        test: true,
        timestamp: new Date().toISOString(),
      },
      acknowledged: false,
    };

    await this.triggerAlert(testAlert, ['database', 'email']);
    this.logger.info('Test alert triggered', { alertId: testAlert.id });
  }
}
