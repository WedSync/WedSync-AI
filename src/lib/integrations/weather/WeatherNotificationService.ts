/**
 * WeatherNotificationService - Weather Alert Notification System
 * Handles notification delivery for weather alerts
 * WS-220: Weather API Integration - Team C Round 1
 */

import { createSupabaseClient } from '@/lib/supabase/client';
import { WeatherData, WeatherSubscription } from './WeatherSync';

export interface NotificationTemplate {
  id: string;
  type: 'email' | 'sms' | 'push';
  alert_type: WeatherData['alerts'][0]['type'];
  template: {
    subject?: string;
    body: string;
    variables: string[];
  };
  active: boolean;
}

export interface NotificationLog {
  id: string;
  subscription_id: string;
  wedding_id: string;
  alert_id: string;
  channel: 'email' | 'sms' | 'push' | 'webhook' | 'in_app';
  status: 'pending' | 'sent' | 'failed' | 'delivered' | 'read';
  sent_at?: string;
  delivered_at?: string;
  error_message?: string;
  retry_count: number;
  max_retries: number;
}

export class WeatherNotificationService {
  private supabase;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 60000; // 1 minute

  constructor() {
    this.supabase = createSupabaseClient();
  }

  /**
   * Send weather alert notification through all configured channels
   */
  async sendWeatherAlert(
    subscription: WeatherSubscription,
    alert: WeatherData['alerts'][0],
  ): Promise<void> {
    try {
      const { notification_channels } = subscription;
      const notifications: Promise<void>[] = [];

      // Queue notifications for each enabled channel
      if (notification_channels.email) {
        notifications.push(this.sendEmailAlert(subscription, alert));
      }

      if (notification_channels.sms) {
        notifications.push(this.sendSMSAlert(subscription, alert));
      }

      if (notification_channels.in_app) {
        notifications.push(this.sendInAppAlert(subscription, alert));
      }

      if (notification_channels.webhook_url) {
        notifications.push(
          this.sendWebhookAlert(
            subscription,
            alert,
            notification_channels.webhook_url,
          ),
        );
      }

      // Execute all notifications concurrently
      await Promise.allSettled(notifications);
    } catch (error) {
      console.error('Failed to send weather alert:', error);
      throw error;
    }
  }

  /**
   * Send email notification for weather alert
   */
  private async sendEmailAlert(
    subscription: WeatherSubscription,
    alert: WeatherData['alerts'][0],
  ): Promise<void> {
    try {
      // Get wedding and contact information
      const { data: wedding } = await this.supabase
        .from('weddings')
        .select(
          `
          *,
          couples:couples(*)
        `,
        )
        .eq('id', subscription.wedding_id)
        .single();

      if (!wedding) throw new Error('Wedding not found');

      const template = await this.getNotificationTemplate('email', alert.type);
      const emailContent = this.renderEmailTemplate(template, alert, wedding);

      // Log notification attempt
      const logId = await this.logNotificationAttempt(
        subscription.id,
        subscription.wedding_id,
        alert.id,
        'email',
      );

      // Send email using Resend (or your email service)
      try {
        // This would integrate with your actual email service
        await this.sendEmail({
          to: wedding.couples.map((c: any) => c.email),
          subject: emailContent.subject,
          html: emailContent.body,
        });

        // Update log as sent
        await this.updateNotificationStatus(logId, 'sent');
      } catch (error) {
        await this.updateNotificationStatus(logId, 'failed', error.message);
        throw error;
      }
    } catch (error) {
      console.error('Failed to send email alert:', error);
      throw error;
    }
  }

  /**
   * Send SMS notification for weather alert
   */
  private async sendSMSAlert(
    subscription: WeatherSubscription,
    alert: WeatherData['alerts'][0],
  ): Promise<void> {
    try {
      // Get wedding and contact information
      const { data: wedding } = await this.supabase
        .from('weddings')
        .select(
          `
          *,
          couples:couples(phone)
        `,
        )
        .eq('id', subscription.wedding_id)
        .single();

      if (!wedding) throw new Error('Wedding not found');

      const template = await this.getNotificationTemplate('sms', alert.type);
      const smsContent = this.renderSMSTemplate(template, alert, wedding);

      // Log notification attempt
      const logId = await this.logNotificationAttempt(
        subscription.id,
        subscription.wedding_id,
        alert.id,
        'sms',
      );

      // Send SMS using Twilio (or your SMS service)
      try {
        for (const couple of wedding.couples) {
          if (couple.phone) {
            await this.sendSMS(couple.phone, smsContent.body);
          }
        }

        // Update log as sent
        await this.updateNotificationStatus(logId, 'sent');
      } catch (error) {
        await this.updateNotificationStatus(logId, 'failed', error.message);
        throw error;
      }
    } catch (error) {
      console.error('Failed to send SMS alert:', error);
      throw error;
    }
  }

  /**
   * Send in-app notification for weather alert
   */
  private async sendInAppAlert(
    subscription: WeatherSubscription,
    alert: WeatherData['alerts'][0],
  ): Promise<void> {
    try {
      // Create in-app notification record
      const notification = {
        wedding_id: subscription.wedding_id,
        type: 'weather_alert',
        title: this.getAlertTitle(alert),
        message: alert.message,
        severity: alert.severity,
        data: {
          alert_id: alert.id,
          alert_type: alert.type,
          venue_id: subscription.venue_id,
        },
        read: false,
        created_at: new Date().toISOString(),
      };

      const { error } = await this.supabase
        .from('notifications')
        .insert(notification);

      if (error) throw error;

      // Log notification attempt
      const logId = await this.logNotificationAttempt(
        subscription.id,
        subscription.wedding_id,
        alert.id,
        'in_app',
      );

      await this.updateNotificationStatus(logId, 'sent');

      // Broadcast to real-time subscribers
      await this.supabase.channel('notifications').send({
        type: 'broadcast',
        event: 'weather_alert',
        payload: notification,
      });
    } catch (error) {
      console.error('Failed to send in-app alert:', error);
      throw error;
    }
  }

  /**
   * Send webhook notification for weather alert
   */
  private async sendWebhookAlert(
    subscription: WeatherSubscription,
    alert: WeatherData['alerts'][0],
    webhookUrl: string,
  ): Promise<void> {
    try {
      const payload = {
        type: 'weather_alert',
        wedding_id: subscription.wedding_id,
        venue_id: subscription.venue_id,
        alert: {
          ...alert,
          subscription_id: subscription.id,
        },
        timestamp: new Date().toISOString(),
      };

      // Log notification attempt
      const logId = await this.logNotificationAttempt(
        subscription.id,
        subscription.wedding_id,
        alert.id,
        'webhook',
      );

      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-WedSync-Signature': this.generateWebhookSignature(payload),
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        if (!response.ok) {
          throw new Error(`Webhook failed with status: ${response.status}`);
        }

        await this.updateNotificationStatus(logId, 'sent');
      } catch (error) {
        await this.updateNotificationStatus(logId, 'failed', error.message);

        // Implement retry logic for failed webhooks
        await this.scheduleWebhookRetry(subscription, alert, webhookUrl, 1);
        throw error;
      }
    } catch (error) {
      console.error('Failed to send webhook alert:', error);
      throw error;
    }
  }

  /**
   * Get notification template for alert type
   */
  private async getNotificationTemplate(
    type: 'email' | 'sms',
    alertType: WeatherData['alerts'][0]['type'],
  ): Promise<NotificationTemplate> {
    try {
      const { data: template } = await this.supabase
        .from('notification_templates')
        .select('*')
        .eq('type', type)
        .eq('alert_type', alertType)
        .eq('active', true)
        .single();

      if (template) return template;

      // Return default template if none found
      return this.getDefaultTemplate(type, alertType);
    } catch (error) {
      console.error('Failed to get notification template:', error);
      return this.getDefaultTemplate(type, alertType);
    }
  }

  /**
   * Get default notification templates
   */
  private getDefaultTemplate(
    type: 'email' | 'sms',
    alertType: WeatherData['alerts'][0]['type'],
  ): NotificationTemplate {
    const templates: Record<string, Record<string, NotificationTemplate>> = {
      email: {
        rain: {
          id: 'default_email_rain',
          type: 'email',
          alert_type: 'rain',
          template: {
            subject: '🌧️ Rain Alert for Your Wedding',
            body: `
              <h2>Weather Alert for Your Wedding</h2>
              <p>We've detected rain at your venue location.</p>
              <p><strong>Current conditions:</strong> {{alert_message}}</p>
              <p><strong>Venue:</strong> {{venue_name}}</p>
              <p><strong>Time:</strong> {{alert_time}}</p>
              <p>Please consider backup plans if you have outdoor activities planned.</p>
              <p>Best regards,<br>Your WedSync Team</p>
            `,
            variables: ['alert_message', 'venue_name', 'alert_time'],
          },
          active: true,
        },
        high_wind: {
          id: 'default_email_wind',
          type: 'email',
          alert_type: 'high_wind',
          template: {
            subject: '💨 High Wind Alert for Your Wedding',
            body: `
              <h2>High Wind Alert for Your Wedding</h2>
              <p>High wind conditions detected at your venue.</p>
              <p><strong>Current conditions:</strong> {{alert_message}}</p>
              <p><strong>Venue:</strong> {{venue_name}}</p>
              <p><strong>Time:</strong> {{alert_time}}</p>
              <p>Please secure any outdoor decorations and inform your vendors.</p>
              <p>Best regards,<br>Your WedSync Team</p>
            `,
            variables: ['alert_message', 'venue_name', 'alert_time'],
          },
          active: true,
        },
      },
      sms: {
        rain: {
          id: 'default_sms_rain',
          type: 'sms',
          alert_type: 'rain',
          template: {
            body: 'WedSync Alert: Rain detected at your wedding venue. {{alert_message}} Consider backup plans for outdoor activities.',
            variables: ['alert_message'],
          },
          active: true,
        },
        high_wind: {
          id: 'default_sms_wind',
          type: 'sms',
          alert_type: 'high_wind',
          template: {
            body: 'WedSync Alert: High wind conditions at your venue. {{alert_message}} Secure outdoor items.',
            variables: ['alert_message'],
          },
          active: true,
        },
      },
    };

    return templates[type][alertType] || templates[type]['rain'];
  }

  /**
   * Render email template with variables
   */
  private renderEmailTemplate(
    template: NotificationTemplate,
    alert: WeatherData['alerts'][0],
    wedding: any,
  ): { subject: string; body: string } {
    const variables = {
      alert_message: alert.message,
      venue_name: wedding.venue?.name || 'Your venue',
      alert_time: new Date(alert.start_time).toLocaleString(),
      wedding_date: new Date(wedding.date).toLocaleDateString(),
      couple_names:
        wedding.couples?.map((c: any) => c.name).join(' & ') || 'Happy couple',
    };

    let subject = template.template.subject || 'Weather Alert';
    let body = template.template.body;

    // Replace variables in template
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, value);
      body = body.replace(regex, value);
    }

    return { subject, body };
  }

  /**
   * Render SMS template with variables
   */
  private renderSMSTemplate(
    template: NotificationTemplate,
    alert: WeatherData['alerts'][0],
    wedding: any,
  ): { body: string } {
    const variables = {
      alert_message: alert.message,
      venue_name: wedding.venue?.name || 'venue',
    };

    let body = template.template.body;

    // Replace variables in template
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      body = body.replace(regex, value);
    }

    return { body };
  }

  /**
   * Get alert title for in-app notifications
   */
  private getAlertTitle(alert: WeatherData['alerts'][0]): string {
    const titles = {
      rain: '🌧️ Rain Alert',
      high_wind: '💨 Wind Alert',
      severe_weather: '⛈️ Severe Weather Alert',
      extreme_temp: '🌡️ Temperature Alert',
    };

    return titles[alert.type] || '⚠️ Weather Alert';
  }

  /**
   * Log notification attempt
   */
  private async logNotificationAttempt(
    subscriptionId: string,
    weddingId: string,
    alertId: string,
    channel: NotificationLog['channel'],
  ): Promise<string> {
    try {
      const log: Partial<NotificationLog> = {
        subscription_id: subscriptionId,
        wedding_id: weddingId,
        alert_id: alertId,
        channel,
        status: 'pending',
        retry_count: 0,
        max_retries: this.MAX_RETRIES,
      };

      const { data, error } = await this.supabase
        .from('notification_logs')
        .insert(log)
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Failed to log notification attempt:', error);
      throw error;
    }
  }

  /**
   * Update notification status
   */
  private async updateNotificationStatus(
    logId: string,
    status: NotificationLog['status'],
    errorMessage?: string,
  ): Promise<void> {
    try {
      const update: any = {
        status,
        ...(status === 'sent' && { sent_at: new Date().toISOString() }),
        ...(status === 'delivered' && {
          delivered_at: new Date().toISOString(),
        }),
        ...(errorMessage && { error_message: errorMessage }),
      };

      const { error } = await this.supabase
        .from('notification_logs')
        .update(update)
        .eq('id', logId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to update notification status:', error);
    }
  }

  /**
   * Generate webhook signature for security
   */
  private generateWebhookSignature(payload: any): string {
    // Implementation would use HMAC-SHA256 with secret key
    // This is a simplified version
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  /**
   * Schedule webhook retry for failed attempts
   */
  private async scheduleWebhookRetry(
    subscription: WeatherSubscription,
    alert: WeatherData['alerts'][0],
    webhookUrl: string,
    retryCount: number,
  ): Promise<void> {
    if (retryCount > this.MAX_RETRIES) return;

    setTimeout(async () => {
      try {
        await this.sendWebhookAlert(subscription, alert, webhookUrl);
      } catch (error) {
        await this.scheduleWebhookRetry(
          subscription,
          alert,
          webhookUrl,
          retryCount + 1,
        );
      }
    }, this.RETRY_DELAY * retryCount); // Exponential backoff
  }

  // Placeholder methods for actual service integrations
  private async sendEmail(email: {
    to: string[];
    subject: string;
    html: string;
  }): Promise<void> {
    // Implementation would use Resend or your email service
    console.log('Email sent:', email);
  }

  private async sendSMS(to: string, body: string): Promise<void> {
    // Implementation would use Twilio or your SMS service
    console.log('SMS sent:', { to, body });
  }
}

// Export singleton instance
export const weatherNotificationService = new WeatherNotificationService();
