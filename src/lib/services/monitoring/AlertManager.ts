import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Alert schemas for validation
const AlertChannelSchema = z.object({
  channel_id: z.string(),
  type: z.enum(['email', 'sms', 'slack', 'webhook', 'dashboard']),
  configuration: z.record(z.any()),
  enabled: z.boolean().default(true),
  severity_filter: z
    .array(z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']))
    .optional(),
});

const AlertEventSchema = z.object({
  event_id: z.string().optional(),
  alert_type: z.enum([
    'threshold_breach',
    'security_violation',
    'system_failure',
    'wedding_day_alert',
  ]),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  title: z.string(),
  message: z.string(),
  details: z.record(z.any()).optional(),
  environment_id: z.string().uuid().optional(),
  variable_id: z.string().uuid().optional(),
  threshold_value: z.number().optional(),
  current_value: z.number().optional(),
  escalation_level: z.number().min(0).max(3).default(0),
});

interface AlertChannel {
  channel_id: string;
  type: 'email' | 'sms' | 'slack' | 'webhook' | 'dashboard';
  configuration: Record<string, any>;
  enabled: boolean;
  severity_filter?: Array<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>;
}

interface AlertEvent {
  event_id?: string;
  alert_type:
    | 'threshold_breach'
    | 'security_violation'
    | 'system_failure'
    | 'wedding_day_alert';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  details?: Record<string, any>;
  environment_id?: string;
  variable_id?: string;
  threshold_value?: number;
  current_value?: number;
  escalation_level: number;
}

interface EscalationRule {
  rule_id: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  initial_channels: string[];
  escalation_delays: number[]; // Minutes before escalating
  escalation_channels: string[][]; // Channels for each escalation level
  wedding_day_override: boolean;
  auto_resolve: boolean;
}

interface NotificationTemplate {
  template_id: string;
  channel_type: string;
  alert_type: string;
  subject_template: string;
  body_template: string;
  variables: string[];
}

interface WeddingDayAlert {
  alert_id: string;
  wedding_date: Date;
  supplier_id: string;
  alert_type:
    | 'system_critical'
    | 'payment_failure'
    | 'integration_down'
    | 'security_breach';
  priority: 'P0' | 'P1' | 'P2';
  emergency_contacts: Array<{
    name: string;
    phone: string;
    email: string;
    role: string;
  }>;
}

export class AlertManager {
  private supabase = createClient();

  /**
   * Send alert through configured channels
   */
  async sendAlert(
    organizationId: string,
    alert: AlertEvent,
  ): Promise<{
    success: boolean;
    sent_channels: string[];
    failed_channels: Array<{ channel: string; error: string }>;
  }> {
    try {
      const validatedAlert = AlertEventSchema.parse(alert);

      // Generate unique event ID if not provided
      const eventId =
        validatedAlert.event_id ||
        `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Get configured alert channels for this organization
      const { data: channels } = await this.supabase
        .from('alert_channels')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('enabled', true);

      if (!channels || channels.length === 0) {
        console.warn(
          'No alert channels configured for organization:',
          organizationId,
        );
        return { success: false, sent_channels: [], failed_channels: [] };
      }

      // Filter channels by severity if configured
      const filteredChannels = channels.filter((channel) => {
        if (!channel.severity_filter || channel.severity_filter.length === 0) {
          return true;
        }
        return channel.severity_filter.includes(validatedAlert.severity);
      });

      const sentChannels: string[] = [];
      const failedChannels: Array<{ channel: string; error: string }> = [];

      // Check if this is a wedding day and apply special handling
      const isWeddingDay = await this.isWeddingDay(organizationId);
      if (isWeddingDay && validatedAlert.severity === 'CRITICAL') {
        await this.handleWeddingDayAlert(organizationId, validatedAlert);
      }

      // Send through each channel
      for (const channel of filteredChannels) {
        try {
          const validatedChannel = AlertChannelSchema.parse(channel);
          await this.sendToChannel(
            organizationId,
            validatedChannel,
            validatedAlert,
          );
          sentChannels.push(channel.channel_id);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          failedChannels.push({
            channel: channel.channel_id,
            error: errorMessage,
          });
          console.error(
            `Failed to send alert to channel ${channel.channel_id}:`,
            error,
          );
        }
      }

      // Record alert event in database
      await this.recordAlertEvent(
        organizationId,
        eventId,
        validatedAlert,
        sentChannels,
        failedChannels,
      );

      // Set up escalation if configured
      if (
        validatedAlert.severity === 'CRITICAL' ||
        validatedAlert.severity === 'HIGH'
      ) {
        await this.scheduleEscalation(organizationId, eventId, validatedAlert);
      }

      return {
        success: sentChannels.length > 0,
        sent_channels: sentChannels,
        failed_channels: failedChannels,
      };
    } catch (error) {
      console.error('Error sending alert:', error);
      throw new Error('Failed to send alert');
    }
  }

  /**
   * Send alert to specific channel
   */
  private async sendToChannel(
    organizationId: string,
    channel: AlertChannel,
    alert: AlertEvent,
  ): Promise<void> {
    const template = await this.getNotificationTemplate(
      channel.type,
      alert.alert_type,
    );
    const message = this.renderTemplate(template, alert, channel.configuration);

    switch (channel.type) {
      case 'email':
        await this.sendEmail(channel.configuration, message, alert);
        break;
      case 'sms':
        await this.sendSMS(channel.configuration, message, alert);
        break;
      case 'slack':
        await this.sendSlack(channel.configuration, message, alert);
        break;
      case 'webhook':
        await this.sendWebhook(channel.configuration, alert);
        break;
      case 'dashboard':
        await this.sendDashboardNotification(organizationId, message, alert);
        break;
      default:
        throw new Error(`Unsupported channel type: ${channel.type}`);
    }
  }

  /**
   * Send email alert
   */
  private async sendEmail(
    config: Record<string, any>,
    message: any,
    alert: AlertEvent,
  ): Promise<void> {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: config.from_email || 'alerts@wedsync.com',
        to: config.recipients || [],
        subject: `${alert.severity} Alert: ${alert.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <h2 style="color: ${this.getSeverityColor(alert.severity)};">
              ${alert.severity} Alert: ${alert.title}
            </h2>
            <p><strong>Message:</strong> ${alert.message}</p>
            ${alert.environment_id ? `<p><strong>Environment:</strong> ${alert.environment_id}</p>` : ''}
            ${alert.variable_id ? `<p><strong>Variable:</strong> ${alert.variable_id}</p>` : ''}
            ${alert.threshold_value ? `<p><strong>Threshold:</strong> ${alert.threshold_value}</p>` : ''}
            ${alert.current_value ? `<p><strong>Current Value:</strong> ${alert.current_value}</p>` : ''}
            <p><strong>Time:</strong> ${new Date().toISOString()}</p>
            ${alert.details ? `<pre style="background: #f4f4f4; padding: 10px; border-radius: 4px;">${JSON.stringify(alert.details, null, 2)}</pre>` : ''}
            <p style="color: #666; font-size: 12px;">
              This is an automated alert from WedSync Environment Variables Management System.
            </p>
          </div>
        `,
      });
    } catch (error) {
      console.error('Failed to send email alert:', error);
      throw error;
    }
  }

  /**
   * Send SMS alert
   */
  private async sendSMS(
    config: Record<string, any>,
    message: any,
    alert: AlertEvent,
  ): Promise<void> {
    try {
      const twilio = await import('twilio');
      const client = twilio.default(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN,
      );

      const smsBody = `${alert.severity} Alert: ${alert.title}\n${alert.message}\nTime: ${new Date().toLocaleString()}`;

      for (const phoneNumber of config.phone_numbers || []) {
        await client.messages.create({
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phoneNumber,
          body: smsBody,
        });
      }
    } catch (error) {
      console.error('Failed to send SMS alert:', error);
      throw error;
    }
  }

  /**
   * Send Slack alert
   */
  private async sendSlack(
    config: Record<string, any>,
    message: any,
    alert: AlertEvent,
  ): Promise<void> {
    try {
      const payload = {
        channel: config.channel || '#alerts',
        username: 'WedSync Alerts',
        icon_emoji: this.getSeverityEmoji(alert.severity),
        attachments: [
          {
            color: this.getSeverityColor(alert.severity),
            title: `${alert.severity} Alert: ${alert.title}`,
            text: alert.message,
            fields: [
              ...(alert.environment_id
                ? [
                    {
                      title: 'Environment',
                      value: alert.environment_id,
                      short: true,
                    },
                  ]
                : []),
              ...(alert.variable_id
                ? [{ title: 'Variable', value: alert.variable_id, short: true }]
                : []),
              ...(alert.threshold_value
                ? [
                    {
                      title: 'Threshold',
                      value: alert.threshold_value.toString(),
                      short: true,
                    },
                  ]
                : []),
              ...(alert.current_value
                ? [
                    {
                      title: 'Current Value',
                      value: alert.current_value.toString(),
                      short: true,
                    },
                  ]
                : []),
            ],
            footer: 'WedSync Environment Variables Management',
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      };

      await fetch(config.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
      throw error;
    }
  }

  /**
   * Send webhook alert
   */
  private async sendWebhook(
    config: Record<string, any>,
    alert: AlertEvent,
  ): Promise<void> {
    try {
      const payload = {
        alert,
        timestamp: new Date().toISOString(),
        source: 'wedsync-environment-variables',
      };

      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.headers || {}),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Webhook failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send webhook alert:', error);
      throw error;
    }
  }

  /**
   * Send dashboard notification (real-time)
   */
  private async sendDashboardNotification(
    organizationId: string,
    message: any,
    alert: AlertEvent,
  ): Promise<void> {
    try {
      // Insert notification into dashboard_notifications table for real-time display
      await this.supabase.from('dashboard_notifications').insert({
        organization_id: organizationId,
        type: 'alert',
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        data: alert.details || {},
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      });
    } catch (error) {
      console.error('Failed to send dashboard notification:', error);
      throw error;
    }
  }

  /**
   * Handle special wedding day alerts with enhanced protocols
   */
  private async handleWeddingDayAlert(
    organizationId: string,
    alert: AlertEvent,
  ): Promise<void> {
    try {
      // Get wedding day emergency contacts
      const { data: emergencyContacts } = await this.supabase
        .from('emergency_contacts')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      // Send immediate notifications to all emergency contacts
      if (emergencyContacts && emergencyContacts.length > 0) {
        const weddingDayAlert: WeddingDayAlert = {
          alert_id: `wedding_${Date.now()}`,
          wedding_date: new Date(),
          supplier_id: organizationId,
          alert_type: this.mapAlertTypeToWeddingDay(alert.alert_type),
          priority: alert.severity === 'CRITICAL' ? 'P0' : 'P1',
          emergency_contacts: emergencyContacts.map((contact) => ({
            name: contact.name,
            phone: contact.phone,
            email: contact.email,
            role: contact.role,
          })),
        };

        // Send emergency SMS to all contacts
        for (const contact of weddingDayAlert.emergency_contacts) {
          try {
            await this.sendEmergencySMS(contact.phone, alert);
          } catch (error) {
            console.error(
              `Failed to send emergency SMS to ${contact.phone}:`,
              error,
            );
          }
        }

        // Record wedding day alert event
        await this.supabase.from('wedding_day_alerts').insert({
          organization_id: organizationId,
          alert_id: weddingDayAlert.alert_id,
          alert_type: weddingDayAlert.alert_type,
          priority: weddingDayAlert.priority,
          alert_data: alert,
          emergency_contacts: weddingDayAlert.emergency_contacts,
          resolved: false,
        });
      }

      // Enable enhanced monitoring for wedding day
      await this.enableWeddingDayMonitoring(organizationId);
    } catch (error) {
      console.error('Error handling wedding day alert:', error);
      // Don't throw error - wedding day alerts must not fail
    }
  }

  /**
   * Send emergency SMS for wedding day alerts
   */
  private async sendEmergencySMS(
    phoneNumber: string,
    alert: AlertEvent,
  ): Promise<void> {
    try {
      const twilio = await import('twilio');
      const client = twilio.default(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN,
      );

      const emergencyMessage = `🚨 WEDDING DAY EMERGENCY 🚨
${alert.title}
${alert.message}
Time: ${new Date().toLocaleString()}
Action required immediately!`;

      await client.messages.create({
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber,
        body: emergencyMessage,
      });
    } catch (error) {
      console.error('Failed to send emergency SMS:', error);
      throw error;
    }
  }

  /**
   * Record alert event in database
   */
  private async recordAlertEvent(
    organizationId: string,
    eventId: string,
    alert: AlertEvent,
    sentChannels: string[],
    failedChannels: Array<{ channel: string; error: string }>,
  ): Promise<void> {
    try {
      await this.supabase.from('alert_events').insert({
        event_id: eventId,
        organization_id: organizationId,
        alert_type: alert.alert_type,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        details: alert.details || {},
        environment_id: alert.environment_id,
        variable_id: alert.variable_id,
        threshold_value: alert.threshold_value,
        current_value: alert.current_value,
        sent_channels: sentChannels,
        failed_channels: failedChannels,
        escalation_level: alert.escalation_level,
        resolved: false,
      });
    } catch (error) {
      console.error('Error recording alert event:', error);
      // Don't throw - alert should still be sent even if recording fails
    }
  }

  /**
   * Schedule alert escalation
   */
  private async scheduleEscalation(
    organizationId: string,
    eventId: string,
    alert: AlertEvent,
  ): Promise<void> {
    try {
      // Get escalation rules for this severity
      const { data: escalationRules } = await this.supabase
        .from('escalation_rules')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('severity', alert.severity)
        .eq('enabled', true);

      if (escalationRules && escalationRules.length > 0) {
        const rule = escalationRules[0]; // Use first matching rule

        // Schedule escalation job (in production would use a job queue)
        await this.supabase.from('escalation_schedules').insert({
          event_id: eventId,
          organization_id: organizationId,
          rule_id: rule.rule_id,
          escalation_level: 0,
          scheduled_at: new Date(
            Date.now() + rule.escalation_delays[0] * 60 * 1000,
          ).toISOString(),
          status: 'pending',
        });
      }
    } catch (error) {
      console.error('Error scheduling escalation:', error);
      // Don't throw - escalation failure should not prevent initial alert
    }
  }

  // Helper methods
  private async getNotificationTemplate(
    channelType: string,
    alertType: string,
  ): Promise<NotificationTemplate> {
    // In production, this would fetch from database
    return {
      template_id: `${channelType}_${alertType}`,
      channel_type: channelType,
      alert_type: alertType,
      subject_template: '{{severity}} Alert: {{title}}',
      body_template: '{{message}}',
      variables: [
        'severity',
        'title',
        'message',
        'environment_id',
        'variable_id',
      ],
    };
  }

  private renderTemplate(
    template: NotificationTemplate,
    alert: AlertEvent,
    config: Record<string, any>,
  ): any {
    // Simple template rendering - in production would use a proper template engine
    return {
      subject: template.subject_template
        .replace('{{severity}}', alert.severity)
        .replace('{{title}}', alert.title),
      body: template.body_template
        .replace('{{message}}', alert.message)
        .replace('{{environment_id}}', alert.environment_id || 'N/A')
        .replace('{{variable_id}}', alert.variable_id || 'N/A'),
    };
  }

  private getSeverityColor(severity: string): string {
    const colors = {
      LOW: '#28a745',
      MEDIUM: '#ffc107',
      HIGH: '#fd7e14',
      CRITICAL: '#dc3545',
    };
    return colors[severity as keyof typeof colors] || '#6c757d';
  }

  private getSeverityEmoji(severity: string): string {
    const emojis = {
      LOW: ':information_source:',
      MEDIUM: ':warning:',
      HIGH: ':exclamation:',
      CRITICAL: ':rotating_light:',
    };
    return emojis[severity as keyof typeof emojis] || ':bell:';
  }

  private async isWeddingDay(organizationId: string): Promise<boolean> {
    const today = new Date();
    const dayOfWeek = today.getDay();

    // Saturday is typically wedding day (day 6)
    if (dayOfWeek === 6) {
      return true;
    }

    // Check if there are any weddings scheduled for today
    const { data: weddings } = await this.supabase
      .from('weddings')
      .select('id')
      .eq('organization_id', organizationId)
      .gte('wedding_date', today.toISOString().split('T')[0])
      .lt(
        'wedding_date',
        new Date(today.getTime() + 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
      );

    return (weddings?.length || 0) > 0;
  }

  private mapAlertTypeToWeddingDay(
    alertType: string,
  ):
    | 'system_critical'
    | 'payment_failure'
    | 'integration_down'
    | 'security_breach' {
    const mapping = {
      system_failure: 'system_critical' as const,
      threshold_breach: 'system_critical' as const,
      security_violation: 'security_breach' as const,
      wedding_day_alert: 'system_critical' as const,
    };
    return mapping[alertType as keyof typeof mapping] || 'system_critical';
  }

  private async enableWeddingDayMonitoring(
    organizationId: string,
  ): Promise<void> {
    // Enable enhanced monitoring during wedding day
    await this.supabase.from('monitoring_settings').upsert({
      organization_id: organizationId,
      wedding_day_mode: true,
      enhanced_monitoring: true,
      check_interval_seconds: 30, // More frequent checks
      alert_threshold_multiplier: 0.5, // Lower thresholds
    });
  }
}
