import { Resend } from 'resend';
import type {
  NotificationChannelProvider,
  ProcessedNotification,
  NotificationDeliveryResult,
  NotificationEvent,
} from '../../../types/notification-backend';

interface EmailTemplate {
  html: string;
  text: string;
  subject: string;
}

export class EmailNotificationProvider implements NotificationChannelProvider {
  private resend: Resend;
  private templates = new Map<string, EmailTemplate>();

  constructor() {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is required');
    }
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.initializeTemplates();
  }

  private initializeTemplates(): void {
    // Wedding Emergency Template
    this.templates.set('wedding_emergency', {
      subject: '🚨 URGENT: Wedding Emergency - Immediate Action Required',
      html: `
        <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px;">
          <h1>🚨 Wedding Emergency</h1>
          <p><strong>Wedding:</strong> {{weddingTitle}} on {{weddingDate}}</p>
          <p><strong>Emergency:</strong> {{emergencyType}}</p>
          <p><strong>Details:</strong> {{message}}</p>
          <p><strong>Action Required:</strong> {{actionRequired}}</p>
          <p style="font-size: 18px; font-weight: bold;">Please respond immediately or call {{emergencyContact}}</p>
        </div>
      `,
      text: `🚨 WEDDING EMERGENCY\n\nWedding: {{weddingTitle}} on {{weddingDate}}\nEmergency: {{emergencyType}}\nDetails: {{message}}\nAction Required: {{actionRequired}}\n\nPlease respond immediately or call {{emergencyContact}}`,
    });

    // Weather Alert Template
    this.templates.set('weather_alert', {
      subject: '🌦️ Weather Alert: {{weddingTitle}} - {{alertType}}',
      html: `
        <div style="background: #f59e0b; color: white; padding: 20px; border-radius: 8px;">
          <h1>🌦️ Weather Alert</h1>
          <p><strong>Wedding:</strong> {{weddingTitle}} on {{weddingDate}}</p>
          <p><strong>Alert Type:</strong> {{alertType}}</p>
          <p><strong>Current Conditions:</strong> {{currentConditions}}</p>
          <p><strong>Forecast:</strong> {{forecast}}</p>
          <p><strong>Recommendations:</strong> {{recommendations}}</p>
          {{#hasBackupPlan}}
          <p><strong>Backup Plan:</strong> {{backupPlan}}</p>
          {{/hasBackupPlan}}
        </div>
      `,
      text: `🌦️ WEATHER ALERT\n\nWedding: {{weddingTitle}} on {{weddingDate}}\nAlert Type: {{alertType}}\nCurrent Conditions: {{currentConditions}}\nForecast: {{forecast}}\nRecommendations: {{recommendations}}\n\nBackup Plan: {{backupPlan}}`,
    });

    // Vendor Update Template
    this.templates.set('vendor_update', {
      subject: '📋 {{weddingTitle}} - {{updateType}} Update',
      html: `
        <div style="background: #3b82f6; color: white; padding: 20px; border-radius: 8px;">
          <h1>📋 Vendor Update</h1>
          <p><strong>Wedding:</strong> {{weddingTitle}} on {{weddingDate}}</p>
          <p><strong>From:</strong> {{vendorName}} ({{vendorType}})</p>
          <p><strong>Update Type:</strong> {{updateType}}</p>
          <p><strong>Message:</strong> {{message}}</p>
          {{#hasAttachments}}
          <p><strong>Attachments:</strong> {{attachmentCount}} file(s)</p>
          {{/hasAttachments}}
          <p><a href="{{actionUrl}}" style="background: white; color: #3b82f6; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Details</a></p>
        </div>
      `,
      text: `📋 VENDOR UPDATE\n\nWedding: {{weddingTitle}} on {{weddingDate}}\nFrom: {{vendorName}} ({{vendorType}})\nUpdate Type: {{updateType}}\nMessage: {{message}}\n\nView Details: {{actionUrl}}`,
    });

    // Timeline Change Template
    this.templates.set('timeline_change', {
      subject: '⏰ Timeline Update: {{weddingTitle}}',
      html: `
        <div style="background: #10b981; color: white; padding: 20px; border-radius: 8px;">
          <h1>⏰ Timeline Update</h1>
          <p><strong>Wedding:</strong> {{weddingTitle}} on {{weddingDate}}</p>
          <p><strong>Change Type:</strong> {{changeType}}</p>
          <p><strong>Previous Time:</strong> {{previousTime}}</p>
          <p><strong>New Time:</strong> {{newTime}}</p>
          <p><strong>Reason:</strong> {{reason}}</p>
          <p><strong>Affected Services:</strong> {{affectedServices}}</p>
          <p><a href="{{timelineUrl}}" style="background: white; color: #10b981; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Full Timeline</a></p>
        </div>
      `,
      text: `⏰ TIMELINE UPDATE\n\nWedding: {{weddingTitle}} on {{weddingDate}}\nChange Type: {{changeType}}\nPrevious Time: {{previousTime}}\nNew Time: {{newTime}}\nReason: {{reason}}\nAffected Services: {{affectedServices}}\n\nView Full Timeline: {{timelineUrl}`,
    });
  }

  async send(
    notification: ProcessedNotification,
  ): Promise<NotificationDeliveryResult> {
    const startTime = Date.now();

    try {
      // Validate email address
      if (!this.isValidEmail(notification.recipientId)) {
        return {
          success: false,
          channel: 'email',
          providerId: 'resend',
          recipientId: notification.recipientId,
          messageId: '',
          timestamp: new Date(),
          error: 'Invalid email address',
          latency: Date.now() - startTime,
        };
      }

      // Get template and render content
      const template = this.getTemplate(notification.event);
      const renderedContent = this.renderTemplate(template, notification);

      // Determine sender based on context
      const from = this.getSenderEmail(notification);

      // Send email via Resend
      const result = await this.resend.emails.send({
        from,
        to: [notification.recipientId],
        subject: renderedContent.subject,
        html: renderedContent.html,
        text: renderedContent.text,
        headers: {
          'X-Wedding-ID': notification.event.weddingId || '',
          'X-Notification-Type': notification.event.type,
          'X-Priority': notification.priority,
          'X-Wedding-Date': notification.event.context?.weddingDate || '',
        },
      });

      if (result.error) {
        return {
          success: false,
          channel: 'email',
          providerId: 'resend',
          recipientId: notification.recipientId,
          messageId: '',
          timestamp: new Date(),
          error: result.error.message,
          latency: Date.now() - startTime,
        };
      }

      return {
        success: true,
        channel: 'email',
        providerId: 'resend',
        recipientId: notification.recipientId,
        messageId: result.data?.id || '',
        timestamp: new Date(),
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        channel: 'email',
        providerId: 'resend',
        recipientId: notification.recipientId,
        messageId: '',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
        latency: Date.now() - startTime,
      };
    }
  }

  async getProviderStatus(): Promise<{
    healthy: boolean;
    latency: number;
    errorRate: number;
  }> {
    const startTime = Date.now();

    try {
      // Send a test email to verify service
      const testResult = await this.resend.emails.send({
        from: 'noreply@wedsync.com',
        to: ['test@resend.dev'], // Resend test address
        subject: 'Health Check',
        text: 'Health check test',
      });

      return {
        healthy: !testResult.error,
        latency: Date.now() - startTime,
        errorRate: 0, // Would be calculated from historical data
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        errorRate: 1,
      };
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private getTemplate(event: NotificationEvent): EmailTemplate {
    const templateKey = this.getTemplateKey(event.type);
    return this.templates.get(templateKey) || this.getDefaultTemplate();
  }

  private getTemplateKey(eventType: string): string {
    const typeMapping: Record<string, string> = {
      wedding_emergency: 'wedding_emergency',
      emergency: 'wedding_emergency',
      weather_alert: 'weather_alert',
      vendor_update: 'vendor_update',
      vendor_message: 'vendor_update',
      timeline_change: 'timeline_change',
      schedule_update: 'timeline_change',
    };

    return typeMapping[eventType] || 'vendor_update';
  }

  private getDefaultTemplate(): EmailTemplate {
    return {
      subject: '{{weddingTitle}} - Notification',
      html: `
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
          <h1>Wedding Notification</h1>
          <p><strong>Wedding:</strong> {{weddingTitle}}</p>
          <p><strong>Message:</strong> {{message}}</p>
          <p><strong>Date:</strong> {{weddingDate}}</p>
        </div>
      `,
      text: `Wedding Notification\n\nWedding: {{weddingTitle}}\nMessage: {{message}}\nDate: {{weddingDate}}`,
    };
  }

  private renderTemplate(
    template: EmailTemplate,
    notification: ProcessedNotification,
  ): EmailTemplate {
    const context = {
      weddingTitle: notification.event.context?.weddingTitle || 'Wedding',
      weddingDate: notification.event.context?.weddingDate || 'TBD',
      message: notification.content,
      vendorName: notification.event.context?.vendorName || '',
      vendorType: notification.event.context?.vendorType || '',
      updateType: notification.event.type,
      emergencyType: notification.event.context?.emergencyType || '',
      actionRequired:
        notification.event.context?.actionRequired ||
        'Please check your dashboard',
      emergencyContact:
        notification.event.context?.emergencyContact || '+1-555-0123',
      alertType: notification.event.context?.alertType || '',
      currentConditions: notification.event.context?.currentConditions || '',
      forecast: notification.event.context?.forecast || '',
      recommendations: notification.event.context?.recommendations || '',
      hasBackupPlan: !!notification.event.context?.backupPlan,
      backupPlan: notification.event.context?.backupPlan || '',
      changeType: notification.event.context?.changeType || '',
      previousTime: notification.event.context?.previousTime || '',
      newTime: notification.event.context?.newTime || '',
      reason: notification.event.context?.reason || '',
      affectedServices: notification.event.context?.affectedServices || '',
      hasAttachments: (notification.event.context?.attachmentCount || 0) > 0,
      attachmentCount: notification.event.context?.attachmentCount || 0,
      actionUrl:
        notification.event.context?.actionUrl || 'https://app.wedsync.com',
      timelineUrl:
        notification.event.context?.timelineUrl ||
        'https://app.wedsync.com/timeline',
    };

    return {
      subject: this.interpolateTemplate(template.subject, context),
      html: this.interpolateTemplate(template.html, context),
      text: this.interpolateTemplate(template.text, context),
    };
  }

  private interpolateTemplate(
    template: string,
    context: Record<string, any>,
  ): string {
    return template
      .replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return context[key] !== undefined ? String(context[key]) : match;
      })
      .replace(/\{\{#(\w+)\}\}(.*?)\{\{\/\w+\}\}/gs, (match, key, content) => {
        return context[key] ? content : '';
      });
  }

  private getSenderEmail(notification: ProcessedNotification): string {
    // Use different sender addresses based on priority and type
    if (notification.priority === 'emergency') {
      return 'emergency@wedsync.com';
    }

    if (notification.event.type.includes('weather')) {
      return 'weather@wedsync.com';
    }

    if (notification.event.type.includes('vendor')) {
      return 'vendors@wedsync.com';
    }

    return 'noreply@wedsync.com';
  }
}
