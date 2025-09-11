// /src/lib/integrations/DeploymentNotificationService.ts
import { Resend } from 'resend';
import { supabase } from '@/lib/supabase/client';

export interface DeploymentEvent {
  type:
    | 'deployment.started'
    | 'deployment.succeeded'
    | 'deployment.failed'
    | 'deployment.rollback';
  deploymentId: string;
  version?: string;
  url?: string;
  error?: string;
  metadata?: any;
}

export interface NotificationChannel {
  type: 'email' | 'slack' | 'sms' | 'webhook';
  destination: string;
  enabled: boolean;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export class DeploymentNotificationService {
  private resend: Resend;
  private slackWebhookUrl?: string;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.slackWebhookUrl = process.env.SLACK_DEPLOYMENT_WEBHOOK_URL;
  }

  async sendDeploymentNotification(event: DeploymentEvent): Promise<void> {
    try {
      // Get notification preferences for admins
      const { data: adminUsers } = await supabase
        .from('user_profiles')
        .select('id, email, notification_preferences')
        .eq('role', 'admin');

      if (!adminUsers || adminUsers.length === 0) {
        console.warn('No admin users found for deployment notifications');
        return;
      }

      // Determine urgency based on event type
      const urgency = this.getEventUrgency(event.type);

      // Send notifications through all enabled channels
      const notifications = await Promise.allSettled([
        this.sendEmailNotifications(event, adminUsers, urgency),
        this.sendSlackNotification(event, urgency),
        this.sendWebhookNotifications(event, urgency),
      ]);

      // Log notification results
      await this.logNotificationResults(event, notifications);
    } catch (error) {
      console.error('Failed to send deployment notifications:', error);
      // Don't throw - notification failures shouldn't break deployments
    }
  }

  private async sendEmailNotifications(
    event: DeploymentEvent,
    adminUsers: any[],
    urgency: string,
  ): Promise<void> {
    const emailPromises = adminUsers
      .filter(
        (user) => user.notification_preferences?.deployment_emails !== false,
      )
      .map(async (user) => {
        const emailTemplate = this.getEmailTemplate(event, urgency);

        return this.resend.emails.send({
          from: 'deployments@wedsync.com',
          to: user.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
        });
      });

    await Promise.allSettled(emailPromises);
  }

  private async sendSlackNotification(
    event: DeploymentEvent,
    urgency: string,
  ): Promise<void> {
    if (!this.slackWebhookUrl) return;

    const slackMessage = this.getSlackMessage(event, urgency);

    await fetch(this.slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackMessage),
    });
  }

  private async sendWebhookNotifications(
    event: DeploymentEvent,
    urgency: string,
  ): Promise<void> {
    // Get custom webhook endpoints from database
    const { data: webhooks } = await supabase
      .from('deployment_webhooks')
      .select('url, secret, enabled')
      .eq('enabled', true);

    if (!webhooks || webhooks.length === 0) return;

    const webhookPromises = webhooks.map(async (webhook) => {
      try {
        const payload = {
          event: event.type,
          deployment: {
            id: event.deploymentId,
            version: event.version,
            url: event.url,
            timestamp: new Date().toISOString(),
          },
          urgency,
        };

        const signature = this.generateWebhookSignature(
          JSON.stringify(payload),
          webhook.secret,
        );

        await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-WedSync-Signature': signature,
            'X-WedSync-Event': event.type,
          },
          body: JSON.stringify(payload),
        });
      } catch (error) {
        console.error(`Webhook notification failed for ${webhook.url}:`, error);
      }
    });

    await Promise.allSettled(webhookPromises);
  }

  private getEventUrgency(
    eventType: string,
  ): 'low' | 'medium' | 'high' | 'critical' {
    switch (eventType) {
      case 'deployment.started':
        return 'low';
      case 'deployment.succeeded':
        return 'medium';
      case 'deployment.failed':
        return 'critical';
      case 'deployment.rollback':
        return 'critical';
      default:
        return 'medium';
    }
  }

  private getEmailTemplate(event: DeploymentEvent, urgency: string) {
    const isSuccess = event.type === 'deployment.succeeded';
    const isFailure = event.type === 'deployment.failed';
    const isRollback = event.type === 'deployment.rollback';

    let subject = `WedSync Deployment: ${event.type.split('.')[1].toUpperCase()}`;
    let urgencyLabel = '';
    let color = '#2563eb'; // blue

    if (urgency === 'critical') {
      urgencyLabel = '🚨 CRITICAL: ';
      color = '#dc2626'; // red
    } else if (urgency === 'high') {
      urgencyLabel = '⚠️ HIGH: ';
      color = '#f59e0b'; // amber
    }

    if (isSuccess) {
      subject = `✅ ${subject}`;
      color = '#16a34a'; // green
    } else if (isFailure || isRollback) {
      subject = `❌ ${urgencyLabel}${subject}`;
    }

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>WedSync Deployment Notification</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, ${color}, ${color}dd); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">WedSync Deployment Update</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">${new Date().toLocaleString()}</p>
        </div>
        
        <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
          <h2 style="color: ${color}; margin-top: 0;">${event.type.split('.')[1].toUpperCase()}</h2>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>Deployment ID:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-family: monospace;">${event.deploymentId}</td>
            </tr>
            ${
              event.version
                ? `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>Version:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-family: monospace;">${event.version}</td>
            </tr>
            `
                : ''
            }
            ${
              event.url
                ? `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>URL:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                <a href="${event.url}" style="color: ${color};">${event.url}</a>
              </td>
            </tr>
            `
                : ''
            }
            <tr>
              <td style="padding: 8px 0;"><strong>Urgency:</strong></td>
              <td style="padding: 8px 0;">
                <span style="background: ${color}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                  ${urgency.toUpperCase()}
                </span>
              </td>
            </tr>
          </table>

          ${
            event.error
              ? `
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px; margin-top: 16px;">
            <h3 style="color: #dc2626; margin: 0 0 8px 0;">Error Details:</h3>
            <pre style="background: #fff; border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px; overflow-x: auto; font-size: 12px;">${event.error}</pre>
          </div>
          `
              : ''
          }

          ${
            isFailure || isRollback
              ? `
          <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; padding: 12px; margin-top: 16px;">
            <h3 style="color: #92400e; margin: 0 0 8px 0;">⚠️ Wedding Day Impact</h3>
            <p style="margin: 0; color: #92400e;">
              ${
                isRollback
                  ? 'A rollback was executed. Users may have experienced a brief interruption (10-30 seconds).'
                  : 'This deployment failure may affect couples and vendors currently using the system.'
              }
            </p>
          </div>
          `
              : ''
          }

          <div style="margin-top: 24px; padding: 16px; background: #f9fafb; border-radius: 6px;">
            <h3 style="margin: 0 0 8px 0; color: #374151;">Next Steps:</h3>
            <ul style="margin: 0; padding-left: 20px; color: #6b7280;">
              ${
                isSuccess
                  ? `
              <li>Monitor system health for the next 30 minutes</li>
              <li>Review deployment metrics in admin dashboard</li>
              <li>Verify all critical wedding day functions work correctly</li>
              `
                  : isFailure
                    ? `
              <li><strong>Check admin dashboard for health status</strong></li>
              <li><strong>Review error logs and fix underlying issues</strong></li>
              <li><strong>Consider manual rollback if automatic rollback failed</strong></li>
              `
                    : `
              <li><strong>Verify rollback completed successfully</strong></li>
              <li><strong>Investigate root cause of original failure</strong></li>
              <li><strong>Plan fix and re-deployment strategy</strong></li>
              `
              }
            </ul>
          </div>

          <div style="margin-top: 20px; text-align: center;">
            <a href="https://wedsync.com/admin/deployment" 
               style="background: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              View Admin Dashboard
            </a>
          </div>
        </div>

        <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
          <p>This is an automated message from WedSync deployment system.</p>
          <p>Do not reply to this email.</p>
        </div>
      </body>
    </html>
    `;

    return { subject, html };
  }

  private getSlackMessage(event: DeploymentEvent, urgency: string) {
    const isSuccess = event.type === 'deployment.succeeded';
    const isFailure = event.type === 'deployment.failed';
    const isRollback = event.type === 'deployment.rollback';

    let color = 'good';
    let emoji = '🚀';

    if (isFailure || isRollback) {
      color = 'danger';
      emoji = '🚨';
    } else if (urgency === 'critical') {
      color = 'warning';
      emoji = '⚠️';
    }

    return {
      text: `${emoji} WedSync Deployment ${event.type.split('.')[1].toUpperCase()}`,
      attachments: [
        {
          color,
          fields: [
            {
              title: 'Deployment ID',
              value: `\`${event.deploymentId}\``,
              short: true,
            },
            {
              title: 'Version',
              value: event.version || 'Unknown',
              short: true,
            },
            {
              title: 'Urgency',
              value: urgency.toUpperCase(),
              short: true,
            },
            {
              title: 'Timestamp',
              value: new Date().toISOString(),
              short: true,
            },
          ],
          actions: isSuccess
            ? [
                {
                  type: 'button',
                  text: 'View Dashboard',
                  url: 'https://wedsync.com/admin/deployment',
                },
              ]
            : [
                {
                  type: 'button',
                  text: 'Emergency Dashboard',
                  url: 'https://wedsync.com/admin/deployment',
                  style: 'danger',
                },
              ],
        },
      ],
    };
  }

  private generateWebhookSignature(payload: string, secret: string): string {
    const crypto = require('crypto');
    return (
      'sha256=' +
      crypto.createHmac('sha256', secret).update(payload).digest('hex')
    );
  }

  private async logNotificationResults(
    event: DeploymentEvent,
    results: any[],
  ): Promise<void> {
    try {
      await supabase.from('deployment_notifications').insert({
        deployment_id: event.deploymentId,
        event_type: event.type,
        urgency: this.getEventUrgency(event.type),
        channels_attempted: results.length,
        channels_successful: results.filter((r) => r.status === 'fulfilled')
          .length,
        sent_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log notification results:', error);
    }
  }
}
