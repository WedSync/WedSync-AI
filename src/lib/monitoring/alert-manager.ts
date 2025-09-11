/**
 * Team E: Comprehensive Alert Management System
 * Handles critical alerts with wedding-specific escalation logic
 * Priority: Wedding day disasters prevention
 */

interface Alert {
  id?: string;
  type: 'system' | 'wedding' | 'security' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  metadata?: Record<string, any>;

  // Wedding-specific fields
  weddingId?: string;
  weddingImpact?: boolean;
  daysUntilWedding?: number;
  affectedUsers?: number;
  actionRequired?: string;

  // System fields
  source: string;
  timestamp: Date;
  resolved?: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

interface AlertChannel {
  name: string;
  enabled: boolean;
  config: Record<string, any>;
}

interface NotificationResult {
  success: boolean;
  channel: string;
  error?: string;
  messageId?: string;
}

export class AlertManager {
  private channels: Map<string, AlertChannel> = new Map();

  constructor() {
    this.initializeChannels();
  }

  private initializeChannels() {
    // Slack channel
    this.channels.set('slack', {
      name: 'Slack',
      enabled: !!process.env.SLACK_WEBHOOK_URL,
      config: {
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        channel: process.env.SLACK_ALERT_CHANNEL || '#alerts',
        username: 'WedSync Monitor',
      },
    });

    // Email channel (using Resend or similar)
    this.channels.set('email', {
      name: 'Email',
      enabled: !!process.env.RESEND_API_KEY,
      config: {
        apiKey: process.env.RESEND_API_KEY,
        from: process.env.ALERT_EMAIL_FROM || 'alerts@wedsync.com',
        to: process.env.ALERT_EMAIL_TO?.split(',') || ['admin@wedsync.com'],
      },
    });

    // SMS channel (using Twilio or similar)
    this.channels.set('sms', {
      name: 'SMS',
      enabled: !!(
        process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
      ),
      config: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        fromNumber: process.env.TWILIO_PHONE_NUMBER,
        toNumbers: process.env.ALERT_SMS_TO?.split(',') || [],
      },
    });

    // Webhook channel for external integrations
    this.channels.set('webhook', {
      name: 'Webhook',
      enabled: !!process.env.ALERT_WEBHOOK_URL,
      config: {
        url: process.env.ALERT_WEBHOOK_URL,
        secret: process.env.ALERT_WEBHOOK_SECRET,
      },
    });
  }

  /**
   * Main entry point for sending alerts with intelligent routing
   */
  async sendAlert(alert: Alert): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    // Validate alert
    if (!this.validateAlert(alert)) {
      throw new Error('Invalid alert configuration');
    }

    // Determine alert routing based on severity and wedding impact
    const channels = this.determineChannels(alert);

    console.log(
      `Sending ${alert.severity} alert to channels:`,
      channels.map((c) => c.name),
    );

    // Send to each channel
    for (const channel of channels) {
      try {
        let result: NotificationResult;

        switch (channel.name.toLowerCase()) {
          case 'slack':
            result = await this.sendToSlack(alert, channel.config);
            break;
          case 'email':
            result = await this.sendToEmail(alert, channel.config);
            break;
          case 'sms':
            result = await this.sendToSMS(alert, channel.config);
            break;
          case 'webhook':
            result = await this.sendToWebhook(alert, channel.config);
            break;
          default:
            result = {
              success: false,
              channel: channel.name,
              error: 'Unknown channel',
            };
        }

        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          channel: channel.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Log the alert
    await this.logAlert(alert, results);

    // Create GitHub issue for critical alerts
    if (alert.severity === 'critical' && process.env.GITHUB_TOKEN) {
      try {
        await this.createGitHubIssue(alert);
      } catch (error) {
        console.error('Failed to create GitHub issue:', error);
      }
    }

    return results;
  }

  /**
   * Determine which channels to use based on alert properties
   */
  private determineChannels(alert: Alert): AlertChannel[] {
    const channels: AlertChannel[] = [];

    // Wedding day critical alerts get ALL channels
    if (
      alert.weddingImpact &&
      alert.daysUntilWedding !== undefined &&
      alert.daysUntilWedding <= 1
    ) {
      // Wedding day - use everything available
      this.channels.forEach((channel) => {
        if (channel.enabled) channels.push(channel);
      });
      return channels;
    }

    // Critical alerts within 7 days of wedding
    if (
      alert.severity === 'critical' &&
      alert.daysUntilWedding !== undefined &&
      alert.daysUntilWedding <= 7
    ) {
      if (this.channels.get('sms')?.enabled)
        channels.push(this.channels.get('sms')!);
      if (this.channels.get('slack')?.enabled)
        channels.push(this.channels.get('slack')!);
      if (this.channels.get('email')?.enabled)
        channels.push(this.channels.get('email')!);
      return channels;
    }

    // Regular critical alerts
    if (alert.severity === 'critical') {
      if (this.channels.get('slack')?.enabled)
        channels.push(this.channels.get('slack')!);
      if (this.channels.get('email')?.enabled)
        channels.push(this.channels.get('email')!);
      if (this.channels.get('webhook')?.enabled)
        channels.push(this.channels.get('webhook')!);
      return channels;
    }

    // High severity alerts
    if (alert.severity === 'high') {
      if (this.channels.get('slack')?.enabled)
        channels.push(this.channels.get('slack')!);
      if (this.channels.get('email')?.enabled)
        channels.push(this.channels.get('email')!);
      return channels;
    }

    // Medium and low severity - just Slack
    if (this.channels.get('slack')?.enabled) {
      channels.push(this.channels.get('slack')!);
    }

    return channels;
  }

  /**
   * Send alert to Slack
   */
  private async sendToSlack(
    alert: Alert,
    config: Record<string, any>,
  ): Promise<NotificationResult> {
    if (!config.webhookUrl) {
      return {
        success: false,
        channel: 'Slack',
        error: 'Webhook URL not configured',
      };
    }

    const emoji = this.getSeverityEmoji(alert.severity);
    const color = this.getSeverityColor(alert.severity);

    const payload = {
      username: config.username || 'WedSync Monitor',
      channel: config.channel,
      text: `${emoji} ${alert.severity.toUpperCase()}: ${alert.title}`,
      attachments: [
        {
          color,
          fields: [
            { title: 'Message', value: alert.message, short: false },
            { title: 'Source', value: alert.source, short: true },
            { title: 'Type', value: alert.type, short: true },
            ...(alert.weddingImpact
              ? [
                  { title: 'Wedding Impact', value: 'YES', short: true },
                  {
                    title: 'Days Until Wedding',
                    value: alert.daysUntilWedding?.toString() || 'Unknown',
                    short: true,
                  },
                ]
              : []),
            ...(alert.affectedUsers
              ? [
                  {
                    title: 'Affected Users',
                    value: alert.affectedUsers.toString(),
                    short: true,
                  },
                ]
              : []),
            ...(alert.actionRequired
              ? [
                  {
                    title: 'Action Required',
                    value: alert.actionRequired,
                    short: false,
                  },
                ]
              : []),
          ],
          timestamp: Math.floor(alert.timestamp.getTime() / 1000),
        },
      ],
    };

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(
        `Slack API error: ${response.status} ${response.statusText}`,
      );
    }

    return { success: true, channel: 'Slack', messageId: 'slack-sent' };
  }

  /**
   * Send alert via email
   */
  private async sendToEmail(
    alert: Alert,
    config: Record<string, any>,
  ): Promise<NotificationResult> {
    if (!config.apiKey) {
      return {
        success: false,
        channel: 'Email',
        error: 'API key not configured',
      };
    }

    const subject = `[${alert.severity.toUpperCase()}] ${alert.title}`;
    const htmlBody = this.generateEmailHTML(alert);

    // Using Resend as example - adapt for your email provider
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        from: config.from,
        to: config.to,
        subject,
        html: htmlBody,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Email API error: ${response.status} ${response.statusText}`,
      );
    }

    const result = await response.json();
    return { success: true, channel: 'Email', messageId: result.id };
  }

  /**
   * Send alert via SMS
   */
  private async sendToSMS(
    alert: Alert,
    config: Record<string, any>,
  ): Promise<NotificationResult> {
    if (!config.accountSid || !config.authToken) {
      return {
        success: false,
        channel: 'SMS',
        error: 'Twilio credentials not configured',
      };
    }

    const message = `🚨 ${alert.severity.toUpperCase()}: ${alert.title}\n\n${alert.message}\n\nSource: ${alert.source}`;

    const results = [];

    for (const toNumber of config.toNumbers) {
      try {
        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization:
                'Basic ' +
                Buffer.from(
                  `${config.accountSid}:${config.authToken}`,
                ).toString('base64'),
            },
            body: new URLSearchParams({
              From: config.fromNumber,
              To: toNumber,
              Body: message.substring(0, 1600), // SMS length limit
            }),
          },
        );

        if (response.ok) {
          const result = await response.json();
          results.push(result.sid);
        }
      } catch (error) {
        console.error(`Failed to send SMS to ${toNumber}:`, error);
      }
    }

    return {
      success: results.length > 0,
      channel: 'SMS',
      messageId: results.join(','),
    };
  }

  /**
   * Send alert to custom webhook
   */
  private async sendToWebhook(
    alert: Alert,
    config: Record<string, any>,
  ): Promise<NotificationResult> {
    if (!config.url) {
      return {
        success: false,
        channel: 'Webhook',
        error: 'Webhook URL not configured',
      };
    }

    const payload = {
      alert,
      timestamp: alert.timestamp.toISOString(),
      source: 'wedsync-monitoring',
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'WedSync-AlertManager/1.0',
    };

    // Add webhook signature if secret is configured
    if (config.secret) {
      const signature = await this.generateWebhookSignature(
        JSON.stringify(payload),
        config.secret,
      );
      headers['X-WedSync-Signature'] = signature;
    }

    const response = await fetch(config.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(
        `Webhook error: ${response.status} ${response.statusText}`,
      );
    }

    return { success: true, channel: 'Webhook', messageId: 'webhook-sent' };
  }

  /**
   * Create GitHub issue for critical alerts
   */
  private async createGitHubIssue(alert: Alert): Promise<void> {
    const title = `[ALERT] ${alert.title}`;
    const body = `
## Alert Details

- **Severity**: ${alert.severity}
- **Type**: ${alert.type}
- **Source**: ${alert.source}
- **Timestamp**: ${alert.timestamp.toISOString()}

## Message

${alert.message}

${
  alert.weddingImpact
    ? `
## Wedding Impact

- **Days until wedding**: ${alert.daysUntilWedding}
- **Affected users**: ${alert.affectedUsers || 'Unknown'}
`
    : ''
}

${
  alert.actionRequired
    ? `
## Action Required

${alert.actionRequired}
`
    : ''
}

## Metadata

\`\`\`json
${JSON.stringify(alert.metadata, null, 2)}
\`\`\`

---
*This issue was automatically created by the WedSync monitoring system.*
    `.trim();

    const response = await fetch(
      `https://api.github.com/repos/${process.env.GITHUB_REPO}/issues`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({
          title,
          body,
          labels: ['alert', alert.severity, alert.type],
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `GitHub API error: ${response.status} ${response.statusText}`,
      );
    }
  }

  /**
   * Log alert to database
   */
  private async logAlert(
    alert: Alert,
    results: NotificationResult[],
  ): Promise<void> {
    try {
      // Import Supabase client
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();

      await supabase.from('monitoring_events').insert({
        event_type: 'alert_sent',
        severity:
          alert.severity === 'critical'
            ? 'error'
            : alert.severity === 'high'
              ? 'warning'
              : 'info',
        message: `Alert sent: ${alert.title}`,
        metadata: {
          alert,
          results,
          channels: results.map((r) => r.channel),
          successful: results.filter((r) => r.success).length,
          failed: results.filter((r) => !r.success).length,
        },
      });
    } catch (error) {
      console.error('Failed to log alert:', error);
    }
  }

  /**
   * Utility functions
   */
  private validateAlert(alert: Alert): boolean {
    return !!(
      alert.title &&
      alert.message &&
      alert.severity &&
      alert.source &&
      alert.timestamp
    );
  }

  private getSeverityEmoji(severity: string): string {
    const emojis = {
      critical: '🚨',
      high: '⚠️',
      medium: '⚡',
      low: 'ℹ️',
    };
    return emojis[severity as keyof typeof emojis] || 'ℹ️';
  }

  private getSeverityColor(severity: string): string {
    const colors = {
      critical: 'danger',
      high: 'warning',
      medium: '#ff9500',
      low: 'good',
    };
    return colors[severity as keyof typeof colors] || 'good';
  }

  private generateEmailHTML(alert: Alert): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${alert.title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: ${alert.severity === 'critical' ? '#dc3545' : alert.severity === 'high' ? '#fd7e14' : '#6c757d'}; color: white; padding: 20px; }
        .content { padding: 30px; }
        .footer { background: #f8f9fa; padding: 20px; font-size: 14px; color: #6c757d; }
        .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; background: #e9ecef; color: #495057; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { text-align: left; padding: 12px; border-bottom: 1px solid #dee2e6; }
        th { background-color: #f8f9fa; font-weight: 600; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0; font-size: 24px;">${this.getSeverityEmoji(alert.severity)} ${alert.title}</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Alert from ${alert.source}</p>
        </div>
        <div class="content">
            <p><strong>Message:</strong></p>
            <p>${alert.message}</p>
            
            <table>
                <tr><th>Property</th><th>Value</th></tr>
                <tr><td>Severity</td><td><span class="badge">${alert.severity.toUpperCase()}</span></td></tr>
                <tr><td>Type</td><td>${alert.type}</td></tr>
                <tr><td>Timestamp</td><td>${alert.timestamp.toLocaleString()}</td></tr>
                ${alert.weddingImpact ? `<tr><td>Wedding Impact</td><td>YES</td></tr>` : ''}
                ${alert.daysUntilWedding !== undefined ? `<tr><td>Days Until Wedding</td><td>${alert.daysUntilWedding}</td></tr>` : ''}
                ${alert.affectedUsers ? `<tr><td>Affected Users</td><td>${alert.affectedUsers}</td></tr>` : ''}
            </table>
            
            ${
              alert.actionRequired
                ? `
            <p><strong>Action Required:</strong></p>
            <p style="background: #fff3cd; padding: 15px; border-radius: 4px; border-left: 4px solid #ffc107;">${alert.actionRequired}</p>
            `
                : ''
            }
        </div>
        <div class="footer">
            <p>This alert was automatically generated by the WedSync monitoring system.</p>
            <p>Alert ID: ${alert.id || 'N/A'} | Time: ${alert.timestamp.toISOString()}</p>
        </div>
    </div>
</body>
</html>
    `.trim();
  }

  private async generateWebhookSignature(
    payload: string,
    secret: string,
  ): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );

    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(payload),
    );
    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
}

// Export singleton instance
export const alertManager = new AlertManager();

// Convenience functions for common alert types
export async function sendSystemAlert(
  title: string,
  message: string,
  severity: Alert['severity'] = 'medium',
) {
  return alertManager.sendAlert({
    type: 'system',
    severity,
    title,
    message,
    source: 'system',
    timestamp: new Date(),
  });
}

export async function sendWeddingAlert(
  weddingId: string,
  title: string,
  message: string,
  daysUntilWedding: number,
  severity: Alert['severity'] = 'high',
) {
  return alertManager.sendAlert({
    type: 'wedding',
    severity,
    title,
    message,
    source: 'wedding-monitor',
    timestamp: new Date(),
    weddingId,
    weddingImpact: true,
    daysUntilWedding,
  });
}

export async function sendSecurityAlert(
  title: string,
  message: string,
  severity: Alert['severity'] = 'high',
) {
  return alertManager.sendAlert({
    type: 'security',
    severity,
    title,
    message,
    source: 'security-monitor',
    timestamp: new Date(),
  });
}

export async function sendPerformanceAlert(
  title: string,
  message: string,
  severity: Alert['severity'] = 'medium',
) {
  return alertManager.sendAlert({
    type: 'performance',
    severity,
    title,
    message,
    source: 'performance-monitor',
    timestamp: new Date(),
  });
}
