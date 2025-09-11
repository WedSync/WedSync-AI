/**
 * WS-190: Slack Emergency Notification System for WedSync Incident Response
 *
 * Integrates with Slack for real-time emergency notifications during wedding
 * security incidents. Critical for wedding day response coordination.
 */

import { z } from 'zod';
import type { Incident, IncidentSeverity } from '../incident-orchestrator';

// Slack webhook configuration
const SlackConfigSchema = z.object({
  webhookUrl: z.string().url(),
  channel: z.string().default('#security-alerts'),
  username: z.string().default('WedSync Security'),
  iconEmoji: z.string().default(':warning:'),
  timeoutMs: z.number().default(10000),
  maxRetries: z.number().default(2),
});

type SlackConfig = z.infer<typeof SlackConfigSchema>;

// Slack message attachment for rich formatting
interface SlackAttachment {
  color: string;
  title: string;
  title_link?: string;
  text: string;
  fields: Array<{
    title: string;
    value: string;
    short: boolean;
  }>;
  footer: string;
  ts: number;
  actions?: Array<{
    type: string;
    text: string;
    url: string;
    style?: string;
  }>;
}

// Slack message payload
interface SlackMessage {
  username: string;
  icon_emoji: string;
  channel: string;
  text: string;
  attachments: SlackAttachment[];
}

// Response from Slack webhook
interface SlackResponse {
  ok: boolean;
  error?: string;
  warning?: string;
}

/**
 * Slack emergency notification system for wedding platform security incidents
 * Provides real-time alerts to security team with wedding context
 */
export class SlackEmergencyNotifier {
  private config: SlackConfig;

  // Color mapping for different severity levels
  private readonly severityColors = {
    critical: '#FF0000', // Red
    high: '#FF6600', // Orange
    medium: '#FFFF00', // Yellow
    low: '#00FF00', // Green
    info: '#0099FF', // Blue
  };

  // Wedding-specific emoji mapping
  private readonly incidentEmojis = {
    payment_fraud: '💳',
    data_breach: '🚨',
    venue_security: '🏛️',
    supplier_compromise: '🤝',
    platform_outage: '🔧',
    compliance_violation: '⚖️',
  };

  constructor() {
    // Load configuration from environment variables
    this.config = SlackConfigSchema.parse({
      webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
      channel: process.env.SLACK_SECURITY_CHANNEL || '#security-alerts',
      username: process.env.SLACK_BOT_USERNAME || 'WedSync Security',
      iconEmoji: process.env.SLACK_BOT_EMOJI || ':warning:',
      timeoutMs: parseInt(process.env.SLACK_TIMEOUT_MS || '10000'),
      maxRetries: parseInt(process.env.SLACK_MAX_RETRIES || '2'),
    });
  }

  /**
   * Send critical alert - highest priority for wedding day emergencies
   * Used for incidents that could impact active weddings
   */
  async sendCriticalAlert(incident: Incident): Promise<SlackResponse> {
    if (!this.config.webhookUrl) {
      throw new Error('Slack webhook URL not configured');
    }

    const message = this.createCriticalMessage(incident);
    return this.sendMessage(message);
  }

  /**
   * Send high priority alert - important but not wedding blocking
   */
  async sendHighPriorityAlert(incident: Incident): Promise<SlackResponse> {
    if (!this.config.webhookUrl) {
      throw new Error('Slack webhook URL not configured');
    }

    const message = this.createHighPriorityMessage(incident);
    return this.sendMessage(message);
  }

  /**
   * Send standard alert for medium/low severity incidents
   */
  async sendStandardAlert(incident: Incident): Promise<SlackResponse> {
    if (!this.config.webhookUrl) {
      throw new Error('Slack webhook URL not configured');
    }

    const message = this.createStandardMessage(incident);
    return this.sendMessage(message);
  }

  /**
   * Send wedding day status update
   * Special alerts for wedding day operations
   */
  async sendWeddingDayAlert(
    incident: Incident,
    weddingDate: string,
    affectedWeddings: number,
  ): Promise<SlackResponse> {
    if (!this.config.webhookUrl) {
      throw new Error('Slack webhook URL not configured');
    }

    const message = this.createWeddingDayMessage(
      incident,
      weddingDate,
      affectedWeddings,
    );
    return this.sendMessage(message);
  }

  /**
   * Send resolution notification when incident is closed
   */
  async sendResolutionAlert(
    incident: Incident,
    resolutionTime: number,
    resolvedBy: string,
  ): Promise<SlackResponse> {
    if (!this.config.webhookUrl) {
      throw new Error('Slack webhook URL not configured');
    }

    const message = this.createResolutionMessage(
      incident,
      resolutionTime,
      resolvedBy,
    );
    return this.sendMessage(message);
  }

  /**
   * Create critical incident message with maximum urgency formatting
   */
  private createCriticalMessage(incident: Incident): SlackMessage {
    const emoji =
      this.incidentEmojis[incident.type as keyof typeof this.incidentEmojis] ||
      '🚨';

    return {
      username: this.config.username,
      icon_emoji: ':rotating_light:',
      channel: this.config.channel,
      text: `🚨 *CRITICAL WEDDING SECURITY INCIDENT* 🚨\n${emoji} ${incident.title}`,
      attachments: [
        {
          color: this.severityColors.critical,
          title: `${incident.type.toUpperCase()} - IMMEDIATE ACTION REQUIRED`,
          title_link: `https://wedsync.com/security/incidents/${incident.id}`,
          text: incident.description,
          fields: [
            {
              title: 'Incident ID',
              value: incident.id,
              short: true,
            },
            {
              title: 'Severity',
              value: `🔴 ${incident.severity.toUpperCase()}`,
              short: true,
            },
            {
              title: 'Wedding ID',
              value: incident.weddingId || 'Not specified',
              short: true,
            },
            {
              title: 'Affected Users',
              value: incident.affectedUsers.length.toString(),
              short: true,
            },
            {
              title: 'Supplier',
              value: incident.supplierId || 'N/A',
              short: true,
            },
            {
              title: 'Venue',
              value: incident.venueId || 'N/A',
              short: true,
            },
            {
              title: 'Time to Response',
              value: '< 5 minutes required',
              short: true,
            },
            {
              title: 'Escalation',
              value: 'Auto-escalating to on-call',
              short: true,
            },
          ],
          footer: 'WedSync Security - Wedding Day Priority',
          ts: Math.floor(incident.timestamp.getTime() / 1000),
          actions: [
            {
              type: 'button',
              text: '🏃 Respond Now',
              url: `https://wedsync.com/security/incidents/${incident.id}/respond`,
              style: 'danger',
            },
            {
              type: 'button',
              text: '📊 View Dashboard',
              url: 'https://wedsync.com/security/dashboard',
            },
            {
              type: 'button',
              text: '📞 Emergency Contacts',
              url: 'https://wedsync.com/security/contacts',
            },
          ],
        },
      ],
    };
  }

  /**
   * Create high priority message for urgent but non-critical incidents
   */
  private createHighPriorityMessage(incident: Incident): SlackMessage {
    const emoji =
      this.incidentEmojis[incident.type as keyof typeof this.incidentEmojis] ||
      '⚠️';

    return {
      username: this.config.username,
      icon_emoji: this.config.iconEmoji,
      channel: this.config.channel,
      text: `⚠️ *HIGH PRIORITY SECURITY INCIDENT*\n${emoji} ${incident.title}`,
      attachments: [
        {
          color: this.severityColors.high,
          title: `${incident.type.toUpperCase()} - Response Required`,
          title_link: `https://wedsync.com/security/incidents/${incident.id}`,
          text: incident.description,
          fields: [
            {
              title: 'Incident ID',
              value: incident.id,
              short: true,
            },
            {
              title: 'Severity',
              value: `🟠 ${incident.severity.toUpperCase()}`,
              short: true,
            },
            {
              title: 'Wedding Context',
              value: incident.weddingId
                ? `Wedding ${incident.weddingId}`
                : 'Platform-wide',
              short: true,
            },
            {
              title: 'Impact',
              value: `${incident.affectedUsers.length} users affected`,
              short: true,
            },
            {
              title: 'Response SLA',
              value: '< 15 minutes',
              short: true,
            },
            {
              title: 'Assignment',
              value: 'Security Team',
              short: true,
            },
          ],
          footer: 'WedSync Security',
          ts: Math.floor(incident.timestamp.getTime() / 1000),
          actions: [
            {
              type: 'button',
              text: '🔍 Investigate',
              url: `https://wedsync.com/security/incidents/${incident.id}/investigate`,
            },
            {
              type: 'button',
              text: '📊 Analytics',
              url: `https://wedsync.com/security/analytics?incident=${incident.id}`,
            },
          ],
        },
      ],
    };
  }

  /**
   * Create standard message for medium/low severity incidents
   */
  private createStandardMessage(incident: Incident): SlackMessage {
    const emoji =
      this.incidentEmojis[incident.type as keyof typeof this.incidentEmojis] ||
      'ℹ️';
    const color =
      this.severityColors[
        incident.severity as keyof typeof this.severityColors
      ] || this.severityColors.info;

    return {
      username: this.config.username,
      icon_emoji: this.config.iconEmoji,
      channel: this.config.channel,
      text: `${emoji} Security Incident: ${incident.title}`,
      attachments: [
        {
          color,
          title: incident.type.replace('_', ' ').toUpperCase(),
          title_link: `https://wedsync.com/security/incidents/${incident.id}`,
          text: incident.description,
          fields: [
            {
              title: 'Incident ID',
              value: incident.id,
              short: true,
            },
            {
              title: 'Severity',
              value: incident.severity.toUpperCase(),
              short: true,
            },
            {
              title: 'Context',
              value: incident.weddingId
                ? `Wedding: ${incident.weddingId}`
                : 'General',
              short: true,
            },
            {
              title: 'Users Affected',
              value: incident.affectedUsers.length.toString(),
              short: true,
            },
          ],
          footer: 'WedSync Security',
          ts: Math.floor(incident.timestamp.getTime() / 1000),
        },
      ],
    };
  }

  /**
   * Create wedding day specific alert with enhanced context
   */
  private createWeddingDayMessage(
    incident: Incident,
    weddingDate: string,
    affectedWeddings: number,
  ): SlackMessage {
    return {
      username: this.config.username,
      icon_emoji: ':church:',
      channel: this.config.channel,
      text: `💒 *WEDDING DAY SECURITY INCIDENT* 💒\n🚨 ${incident.title}`,
      attachments: [
        {
          color: '#FF1493', // Deep pink for wedding day
          title: `ACTIVE WEDDING DAY INCIDENT - ${weddingDate}`,
          title_link: `https://wedsync.com/security/incidents/${incident.id}`,
          text: `${incident.description}\n\n*⚠️ This incident may affect active wedding celebrations*`,
          fields: [
            {
              title: 'Wedding Date',
              value: weddingDate,
              short: true,
            },
            {
              title: 'Affected Weddings',
              value: affectedWeddings.toString(),
              short: true,
            },
            {
              title: 'Incident Type',
              value: incident.type.replace('_', ' ').toUpperCase(),
              short: true,
            },
            {
              title: 'Severity',
              value: `🔴 ${incident.severity.toUpperCase()}`,
              short: true,
            },
            {
              title: 'Response Protocol',
              value: 'WEDDING DAY EMERGENCY',
              short: true,
            },
            {
              title: 'Escalation Status',
              value: 'AUTO-ESCALATED TO SENIOR TEAM',
              short: true,
            },
          ],
          footer: 'WedSync Security - Wedding Day Operations',
          ts: Math.floor(incident.timestamp.getTime() / 1000),
          actions: [
            {
              type: 'button',
              text: '🚨 Emergency Response',
              url: `https://wedsync.com/security/wedding-day/${incident.id}`,
              style: 'danger',
            },
            {
              type: 'button',
              text: '💒 Wedding Dashboard',
              url: `https://wedsync.com/weddings/live/${weddingDate}`,
            },
          ],
        },
      ],
    };
  }

  /**
   * Create resolution message when incident is closed
   */
  private createResolutionMessage(
    incident: Incident,
    resolutionTime: number,
    resolvedBy: string,
  ): SlackMessage {
    const durationMinutes = Math.round(resolutionTime / (1000 * 60));

    return {
      username: this.config.username,
      icon_emoji: ':white_check_mark:',
      channel: this.config.channel,
      text: `✅ *INCIDENT RESOLVED*\n${incident.title}`,
      attachments: [
        {
          color: '#28a745', // Green for resolution
          title: `${incident.type.toUpperCase()} - RESOLVED`,
          title_link: `https://wedsync.com/security/incidents/${incident.id}`,
          text: `Incident has been successfully resolved.\n\n**Resolution Details:** ${incident.description}`,
          fields: [
            {
              title: 'Incident ID',
              value: incident.id,
              short: true,
            },
            {
              title: 'Resolution Time',
              value: `${durationMinutes} minutes`,
              short: true,
            },
            {
              title: 'Resolved By',
              value: resolvedBy,
              short: true,
            },
            {
              title: 'Original Severity',
              value: incident.severity.toUpperCase(),
              short: true,
            },
            {
              title: 'Users Affected',
              value: incident.affectedUsers.length.toString(),
              short: true,
            },
            {
              title: 'Status',
              value: '✅ CLOSED',
              short: true,
            },
          ],
          footer: 'WedSync Security - Incident Closed',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };
  }

  /**
   * Send message to Slack with retry logic
   */
  private async sendMessage(
    message: SlackMessage,
    retryCount = 0,
  ): Promise<SlackResponse> {
    try {
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WedSync-Security-Integration/1.0',
        },
        body: JSON.stringify(message),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Slack webhook error: ${response.status} - ${errorText}`,
        );
      }

      const result = await response.text();

      // Slack returns "ok" for successful webhook calls
      if (result === 'ok') {
        this.logNotification('success', message.text);
        return { ok: true };
      } else {
        throw new Error(`Slack webhook returned: ${result}`);
      }
    } catch (error) {
      if (retryCount < this.config.maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.sendMessage(message, retryCount + 1);
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logNotification('failure', message.text, errorMessage);

      return {
        ok: false,
        error: `Failed to send Slack notification after ${this.config.maxRetries} retries: ${errorMessage}`,
      };
    }
  }

  /**
   * Test Slack webhook connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      const testMessage: SlackMessage = {
        username: this.config.username,
        icon_emoji: ':white_check_mark:',
        channel: this.config.channel,
        text: '🧪 WedSync Security Integration Test',
        attachments: [
          {
            color: '#00FF00',
            title: 'Connection Test',
            text: 'This is a test message from the WedSync security integration system.',
            fields: [
              {
                title: 'Status',
                value: 'Testing',
                short: true,
              },
              {
                title: 'Timestamp',
                value: new Date().toISOString(),
                short: true,
              },
            ],
            footer: 'WedSync Security - Connection Test',
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      };

      const result = await this.sendMessage(testMessage);
      return result.ok;
    } catch (error) {
      console.error('Slack connection test failed:', error);
      return false;
    }
  }

  /**
   * Log notification attempt for monitoring
   */
  private logNotification(
    status: string,
    message: string,
    error?: string,
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      integration: 'slack',
      status,
      message: message.substring(0, 100), // Truncate for logging
      error,
    };

    console.log('Slack notification log:', JSON.stringify(logEntry));
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(newConfig: Partial<SlackConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration (sanitized - no webhook URL)
   */
  getConfig(): Omit<SlackConfig, 'webhookUrl'> {
    const { webhookUrl, ...sanitizedConfig } = this.config;
    return sanitizedConfig;
  }
}
