/**
 * WS-101 Email Channel Handler
 * Handles alert delivery through email with SendGrid
 */

import { Alert, AlertSeverity } from '../Alert';
import sgMail from '@sendgrid/mail';

export interface EmailChannelConfig {
  sendGridApiKey: string;
  fromEmail: string;
  fromName?: string;
  defaultRecipients: string[];
  emergencyRecipients?: string[];
  weddingDayRecipients?: string[];
  replyTo?: string;
  enableTemplates?: boolean;
  templateIds?: {
    critical?: string;
    warning?: string;
    info?: string;
    weddingDay?: string;
  };
  enableAttachments?: boolean;
  maxRecipientsPerEmail?: number;
}

export class EmailChannel {
  private config: EmailChannelConfig;
  private isHealthy: boolean = true;
  private lastHealthCheck: Date = new Date();
  private emailQueue: Array<{ alert: Alert; recipients: string[] }> = [];
  private processing: boolean = false;

  constructor(config: EmailChannelConfig) {
    this.config = {
      ...config,
      maxRecipientsPerEmail: config.maxRecipientsPerEmail || 50,
    };
    this.validateConfig();
    sgMail.setApiKey(config.sendGridApiKey);
  }

  /**
   * Send alert via email
   */
  public async send(alert: Alert, context?: any): Promise<void> {
    try {
      const recipients = this.selectRecipients(alert, context);

      if (recipients.length === 0) {
        console.warn('No email recipients configured for alert');
        return;
      }

      // Handle large recipient lists
      const recipientBatches = this.batchRecipients(recipients);

      for (const batch of recipientBatches) {
        const email =
          this.config.enableTemplates && this.getTemplateId(alert)
            ? this.buildTemplateEmail(alert, batch, context)
            : this.buildPlainEmail(alert, batch, context);

        await this.sendEmail(email);
      }

      this.isHealthy = true;
      this.lastHealthCheck = new Date();
    } catch (error) {
      console.error('Failed to send email alert:', error);
      this.isHealthy = false;

      // Queue for retry if critical
      if (this.isCriticalAlert(alert)) {
        this.queueForRetry(alert, this.selectRecipients(alert, context));
      }

      throw error;
    }
  }

  /**
   * Check if channel is healthy
   */
  public async isHealthy(): Promise<boolean> {
    try {
      // Skip if checked recently
      const now = new Date();
      if (now.getTime() - this.lastHealthCheck.getTime() < 30000) {
        return this.isHealthy;
      }

      // Send test email to verify service
      const testEmail = {
        to: this.config.fromEmail, // Send to self
        from: {
          email: this.config.fromEmail,
          name: this.config.fromName || 'WedSync Alerts',
        },
        subject: 'Email Alert System Health Check',
        text: `Health check at ${new Date().toISOString()}`,
        html: `<p>Health check at ${new Date().toISOString()}</p>`,
        mailSettings: {
          sandboxMode: {
            enable: true, // Don't actually send
          },
        },
      };

      await sgMail.send(testEmail as any);

      this.isHealthy = true;
      this.lastHealthCheck = now;

      // Process any queued emails
      if (this.emailQueue.length > 0) {
        this.processQueue();
      }

      return true;
    } catch (error) {
      console.error('Email health check failed:', error);
      this.isHealthy = false;
      return false;
    }
  }

  /**
   * Build plain email
   */
  private buildPlainEmail(
    alert: Alert,
    recipients: string[],
    context?: any,
  ): any {
    const severityColor = this.getSeverityColor(alert.severity);
    const severityBadge = this.getSeverityBadge(alert.severity);

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${alert.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
    .severity-badge { display: inline-block; padding: 5px 15px; border-radius: 20px; font-weight: bold; margin-bottom: 10px; }
    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
    .metadata { background: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .metadata-item { margin: 10px 0; }
    .metadata-label { font-weight: 600; color: #4b5563; }
    .action-button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px 10px 10px 0; }
    .action-button.danger { background: #ef4444; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
    .wedding-banner { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px; text-align: center; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    ${context?.isWeddingDay ? '<div class="wedding-banner">🎊 WEDDING DAY ALERT 🎊</div>' : ''}
    
    <div class="header">
      <div class="severity-badge" style="background: ${severityColor};">
        ${severityBadge}
      </div>
      <h1 style="margin: 0; font-size: 24px;">${alert.title}</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">${new Date(alert.timestamp).toLocaleString()}</p>
    </div>
    
    <div class="content">
      <h2 style="color: #1f2937; font-size: 18px; margin-top: 0;">Alert Details</h2>
      <p style="color: #4b5563; line-height: 1.6;">
        ${alert.message.replace(/\n/g, '<br>')}
      </p>
      
      <div class="metadata">
        <div class="metadata-item">
          <span class="metadata-label">Type:</span> ${alert.type}
        </div>
        <div class="metadata-item">
          <span class="metadata-label">Severity:</span> ${alert.severity}
        </div>
        <div class="metadata-item">
          <span class="metadata-label">Status:</span> ${alert.status || 'New'}
        </div>
        ${
          alert.source
            ? `
        <div class="metadata-item">
          <span class="metadata-label">Source:</span> ${alert.source}
        </div>`
            : ''
        }
        ${
          context?.coupleName
            ? `
        <div class="metadata-item">
          <span class="metadata-label">Couple:</span> ${context.coupleName}
        </div>`
            : ''
        }
        ${
          context?.venue
            ? `
        <div class="metadata-item">
          <span class="metadata-label">Venue:</span> ${context.venue}
        </div>`
            : ''
        }
      </div>
      
      ${
        alert.actionRequired
          ? `
      <div style="margin: 30px 0;">
        <h3 style="color: #1f2937; font-size: 16px;">Action Required</h3>
        <a href="${alert.actionUrl || `${process.env.NEXT_PUBLIC_APP_URL}/admin/alerts/${alert.id}`}" class="action-button">
          View Alert Details
        </a>
        ${
          this.isCriticalAlert(alert)
            ? `
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/alerts/${alert.id}/acknowledge" class="action-button danger">
          Acknowledge Alert
        </a>`
            : ''
        }
      </div>`
          : ''
      }
      
      ${
        alert.metadata && Object.keys(alert.metadata).length > 0
          ? `
      <div style="margin-top: 30px;">
        <h3 style="color: #1f2937; font-size: 16px;">Additional Information</h3>
        <pre style="background: #f9fafb; padding: 15px; border-radius: 5px; overflow-x: auto; font-size: 12px;">
${JSON.stringify(alert.metadata, null, 2)}
        </pre>
      </div>`
          : ''
      }
      
      <div class="footer">
        <p style="margin: 5px 0;">Alert ID: <code>${alert.id}</code></p>
        <p style="margin: 5px 0;">
          This is an automated alert from WedSync. 
          ${this.config.replyTo ? `For questions, contact ${this.config.replyTo}` : ''}
        </p>
        <p style="margin: 10px 0 0 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/alerts" style="color: #667eea;">
            View All Alerts
          </a> | 
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/alerts/settings" style="color: #667eea;">
            Alert Settings
          </a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

    const textContent = `
${severityBadge}
${alert.title}

${alert.message}

Type: ${alert.type}
Severity: ${alert.severity}
Status: ${alert.status || 'New'}
Time: ${new Date(alert.timestamp).toLocaleString()}
${alert.source ? `Source: ${alert.source}` : ''}

${alert.actionRequired ? `Action Required: ${alert.actionUrl || `${process.env.NEXT_PUBLIC_APP_URL}/admin/alerts/${alert.id}`}` : ''}

Alert ID: ${alert.id}

---
This is an automated alert from WedSync.
View all alerts: ${process.env.NEXT_PUBLIC_APP_URL}/admin/alerts
`;

    return {
      to: recipients,
      from: {
        email: this.config.fromEmail,
        name: this.config.fromName || 'WedSync Alerts',
      },
      replyTo: this.config.replyTo,
      subject: this.buildSubject(alert, context),
      text: textContent,
      html: htmlContent,
      categories: [alert.type, alert.severity],
      customArgs: {
        alertId: alert.id,
        alertType: alert.type,
        alertSeverity: alert.severity,
      },
    };
  }

  /**
   * Build template email
   */
  private buildTemplateEmail(
    alert: Alert,
    recipients: string[],
    context?: any,
  ): any {
    const templateId = this.getTemplateId(alert);

    return {
      to: recipients,
      from: {
        email: this.config.fromEmail,
        name: this.config.fromName || 'WedSync Alerts',
      },
      replyTo: this.config.replyTo,
      templateId,
      dynamicTemplateData: {
        alert,
        context,
        severityColor: this.getSeverityColor(alert.severity),
        severityBadge: this.getSeverityBadge(alert.severity),
        timestamp: new Date(alert.timestamp).toLocaleString(),
        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/alerts`,
        alertUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/alerts/${alert.id}`,
      },
      categories: [alert.type, alert.severity],
      customArgs: {
        alertId: alert.id,
        alertType: alert.type,
        alertSeverity: alert.severity,
      },
    };
  }

  /**
   * Select recipients based on alert properties
   */
  private selectRecipients(alert: Alert, context?: any): string[] {
    const recipients = new Set<string>();

    // Add default recipients
    this.config.defaultRecipients.forEach((r) => recipients.add(r));

    // Add emergency recipients for critical alerts
    if (this.isCriticalAlert(alert) && this.config.emergencyRecipients) {
      this.config.emergencyRecipients.forEach((r) => recipients.add(r));
    }

    // Add wedding day recipients
    if (context?.isWeddingDay && this.config.weddingDayRecipients) {
      this.config.weddingDayRecipients.forEach((r) => recipients.add(r));
    }

    // Add recipients from alert metadata
    if (alert.metadata?.emailRecipients) {
      const additionalRecipients = Array.isArray(alert.metadata.emailRecipients)
        ? alert.metadata.emailRecipients
        : [alert.metadata.emailRecipients];
      additionalRecipients.forEach((r) => recipients.add(r));
    }

    return Array.from(recipients);
  }

  /**
   * Batch recipients for SendGrid limits
   */
  private batchRecipients(recipients: string[]): string[][] {
    const batches: string[][] = [];
    const maxPerBatch = this.config.maxRecipientsPerEmail!;

    for (let i = 0; i < recipients.length; i += maxPerBatch) {
      batches.push(recipients.slice(i, i + maxPerBatch));
    }

    return batches;
  }

  /**
   * Send email via SendGrid
   */
  private async sendEmail(email: any): Promise<void> {
    try {
      await sgMail.send(email);
    } catch (error: any) {
      // Handle specific SendGrid errors
      if (error.response) {
        const { statusCode, body } = error.response;
        console.error(`SendGrid error ${statusCode}:`, body);

        // Handle rate limiting
        if (statusCode === 429) {
          await this.handleRateLimit();
          // Retry once
          await sgMail.send(email);
        }
      }
      throw error;
    }
  }

  /**
   * Queue email for retry
   */
  private queueForRetry(alert: Alert, recipients: string[]): void {
    this.emailQueue.push({ alert, recipients });

    // Start processing queue if not already
    if (!this.processing) {
      setTimeout(() => this.processQueue(), 30000); // Wait 30 seconds
    }
  }

  /**
   * Process queued emails
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.emailQueue.length === 0) return;

    this.processing = true;

    while (this.emailQueue.length > 0) {
      const { alert, recipients } = this.emailQueue.shift()!;

      try {
        // Check health first
        if (await this.isHealthy()) {
          await this.send(alert);
        } else {
          // Re-queue if still unhealthy
          this.emailQueue.unshift({ alert, recipients });
          break;
        }
      } catch (error) {
        console.error('Failed to process queued email:', error);
      }

      // Rate limit between retries
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    this.processing = false;
  }

  /**
   * Handle rate limiting
   */
  private async handleRateLimit(): Promise<void> {
    console.warn('SendGrid rate limit hit, waiting before retry');
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
  }

  /**
   * Utility methods
   */
  private buildSubject(alert: Alert, context?: any): string {
    const prefix = context?.isWeddingDay ? '🎊 WEDDING DAY: ' : '';
    const severityPrefix = this.getSeverityPrefix(alert.severity);
    return `${prefix}${severityPrefix}${alert.title}`;
  }

  private getSeverityPrefix(severity: AlertSeverity): string {
    const prefixes = {
      [AlertSeverity.LOW]: '[INFO] ',
      [AlertSeverity.MEDIUM]: '[WARNING] ',
      [AlertSeverity.HIGH]: '[HIGH] ',
      [AlertSeverity.CRITICAL]: '[CRITICAL] ',
      [AlertSeverity.SYSTEM_DOWN]: '[SYSTEM DOWN] ',
      [AlertSeverity.WEDDING_EMERGENCY]: '[🚨 EMERGENCY] ',
      [AlertSeverity.VENDOR_CRITICAL]: '[VENDOR CRITICAL] ',
      [AlertSeverity.TIMELINE_CRITICAL]: '[TIMELINE CRITICAL] ',
    };

    return prefixes[severity] || '';
  }

  private getSeverityColor(severity: AlertSeverity): string {
    const colors = {
      [AlertSeverity.LOW]: '#3b82f6',
      [AlertSeverity.MEDIUM]: '#f59e0b',
      [AlertSeverity.HIGH]: '#f97316',
      [AlertSeverity.CRITICAL]: '#ef4444',
      [AlertSeverity.SYSTEM_DOWN]: '#991b1b',
      [AlertSeverity.WEDDING_EMERGENCY]: '#dc2626',
      [AlertSeverity.VENDOR_CRITICAL]: '#ea580c',
      [AlertSeverity.TIMELINE_CRITICAL]: '#d97706',
    };

    return colors[severity] || '#6b7280';
  }

  private getSeverityBadge(severity: AlertSeverity): string {
    return severity.toUpperCase().replace('_', ' ');
  }

  private getTemplateId(alert: Alert): string | undefined {
    if (!this.config.templateIds) return undefined;

    if (this.isCriticalAlert(alert)) {
      return this.config.templateIds.critical;
    }

    if (
      alert.severity === AlertSeverity.MEDIUM ||
      alert.severity === AlertSeverity.HIGH
    ) {
      return this.config.templateIds.warning;
    }

    return this.config.templateIds.info;
  }

  private isCriticalAlert(alert: Alert): boolean {
    const criticalSeverities = [
      AlertSeverity.CRITICAL,
      AlertSeverity.SYSTEM_DOWN,
      AlertSeverity.WEDDING_EMERGENCY,
      AlertSeverity.VENDOR_CRITICAL,
      AlertSeverity.TIMELINE_CRITICAL,
    ];

    return criticalSeverities.includes(alert.severity);
  }

  private validateConfig(): void {
    if (!this.config.sendGridApiKey) {
      throw new Error('SendGrid API key is required');
    }

    if (!this.config.fromEmail) {
      throw new Error('From email is required');
    }

    if (
      !this.config.defaultRecipients ||
      this.config.defaultRecipients.length === 0
    ) {
      throw new Error('At least one default recipient is required');
    }

    // Validate email formats
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(this.config.fromEmail)) {
      throw new Error('Invalid from email format');
    }

    for (const recipient of this.config.defaultRecipients) {
      if (!emailRegex.test(recipient)) {
        throw new Error(`Invalid recipient email format: ${recipient}`);
      }
    }
  }
}

export default EmailChannel;
