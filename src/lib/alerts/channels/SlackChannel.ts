/**
 * WS-101 Slack Channel Handler
 * Handles alert delivery through Slack with wedding-critical reliability
 */

import { Alert, AlertSeverity } from '../Alert';
import { WebClient } from '@slack/web-api';
import { Block, KnownBlock } from '@slack/types';

export interface SlackChannelConfig {
  token: string;
  defaultChannel: string;
  emergencyChannel?: string;
  weddingDayChannel?: string;
  mentionUsers?: string[];
  mentionGroups?: string[];
  enableThreading?: boolean;
  enableAttachments?: boolean;
}

export class SlackChannel {
  private client: WebClient;
  private config: SlackChannelConfig;
  private threadMap: Map<string, string> = new Map(); // Alert ID to thread TS
  private isHealthy: boolean = true;
  private lastHealthCheck: Date = new Date();

  constructor(config: SlackChannelConfig) {
    this.config = config;
    this.client = new WebClient(config.token);
    this.validateConfig();
  }

  /**
   * Send alert to Slack
   */
  public async send(alert: Alert, context?: any): Promise<void> {
    try {
      const channel = this.selectChannel(alert, context);
      const blocks = this.formatAlertBlocks(alert, context);
      const text = this.formatPlainText(alert);

      // Determine if we should mention users
      const mentions = this.shouldMention(alert) ? this.getMentions(alert) : '';
      const fullText = mentions ? `${mentions} ${text}` : text;

      // Send main message
      const result = await this.client.chat.postMessage({
        channel,
        text: fullText,
        blocks,
        unfurl_links: false,
        unfurl_media: false,
      });

      if (!result.ok) {
        throw new Error(`Slack API returned not ok: ${result.error}`);
      }

      // Store thread timestamp for follow-ups
      if (result.ts && alert.id) {
        this.threadMap.set(alert.id, result.ts);
      }

      // Send to thread if this is a follow-up
      if (alert.metadata?.parentAlertId && this.config.enableThreading) {
        await this.sendToThread(alert, channel);
      }

      // Send attachments if needed
      if (this.config.enableAttachments && alert.metadata?.attachments) {
        await this.sendAttachments(alert, channel, result.ts as string);
      }

      this.isHealthy = true;
      this.lastHealthCheck = new Date();
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
      this.isHealthy = false;
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

      // Test API connection
      const result = await this.client.auth.test();

      if (!result.ok) {
        this.isHealthy = false;
        return false;
      }

      // Test channel access
      const channelResult = await this.client.conversations.info({
        channel: this.config.defaultChannel,
      });

      this.isHealthy = channelResult.ok === true;
      this.lastHealthCheck = now;

      return this.isHealthy;
    } catch (error) {
      console.error('Slack health check failed:', error);
      this.isHealthy = false;
      return false;
    }
  }

  /**
   * Send update to existing thread
   */
  public async sendUpdate(alertId: string, update: string): Promise<void> {
    const threadTs = this.threadMap.get(alertId);
    if (!threadTs) {
      console.warn(`No thread found for alert ${alertId}`);
      return;
    }

    try {
      await this.client.chat.postMessage({
        channel: this.config.defaultChannel,
        text: update,
        thread_ts: threadTs,
      });
    } catch (error) {
      console.error('Failed to send thread update:', error);
      throw error;
    }
  }

  /**
   * Format alert as Slack blocks
   */
  private formatAlertBlocks(
    alert: Alert,
    context?: any,
  ): (Block | KnownBlock)[] {
    const blocks: (Block | KnownBlock)[] = [];

    // Header block with severity emoji
    const severityEmoji = this.getSeverityEmoji(alert.severity);
    blocks.push({
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${severityEmoji} ${alert.title}`,
        emoji: true,
      },
    });

    // Alert details section
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: alert.message,
      },
      fields: [
        {
          type: 'mrkdwn',
          text: `*Type:*\n${alert.type}`,
        },
        {
          type: 'mrkdwn',
          text: `*Severity:*\n${alert.severity}`,
        },
        {
          type: 'mrkdwn',
          text: `*Time:*\n<!date^${Math.floor(alert.timestamp.getTime() / 1000)}^{date_short_pretty} at {time}|${alert.timestamp.toISOString()}>`,
        },
        {
          type: 'mrkdwn',
          text: `*Status:*\n${alert.status || 'New'}`,
        },
      ],
    });

    // Wedding context if available
    if (context?.isWeddingDay) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `🎊 *WEDDING DAY ALERT* | Couple: ${context.coupleName} | Venue: ${context.venue}`,
          },
        ],
      });
    }

    // Metadata section if present
    if (alert.metadata && Object.keys(alert.metadata).length > 0) {
      const metadataText = Object.entries(alert.metadata)
        .filter(
          ([key]) =>
            !['attachments', 'parentAlertId', 'healthCheck'].includes(key),
        )
        .map(([key, value]) => `• *${key}:* ${JSON.stringify(value)}`)
        .join('\n');

      if (metadataText) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Additional Details:*\n${metadataText}`,
          },
        });
      }
    }

    // Action buttons for critical alerts
    if (this.isCriticalAlert(alert)) {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '👀 Acknowledge',
              emoji: true,
            },
            value: alert.id,
            action_id: 'acknowledge_alert',
            style: 'primary',
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '📈 View Dashboard',
              emoji: true,
            },
            value: alert.id,
            action_id: 'view_dashboard',
            url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/alerts/${alert.id}`,
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '🚀 Escalate',
              emoji: true,
            },
            value: alert.id,
            action_id: 'escalate_alert',
            style: 'danger',
          },
        ],
      });
    }

    // Divider
    blocks.push({ type: 'divider' });

    // Footer with alert ID
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Alert ID: \`${alert.id}\` | Source: ${alert.source || 'System'}`,
        },
      ],
    });

    return blocks;
  }

  /**
   * Select appropriate Slack channel
   */
  private selectChannel(alert: Alert, context?: any): string {
    // Wedding day channel takes priority
    if (context?.isWeddingDay && this.config.weddingDayChannel) {
      return this.config.weddingDayChannel;
    }

    // Emergency channel for critical alerts
    if (this.isCriticalAlert(alert) && this.config.emergencyChannel) {
      return this.config.emergencyChannel;
    }

    // Channel from alert metadata
    if (alert.metadata?.slackChannel) {
      return alert.metadata.slackChannel;
    }

    // Default channel
    return this.config.defaultChannel;
  }

  /**
   * Get mentions for alert
   */
  private getMentions(alert: Alert): string {
    const mentions: string[] = [];

    // Critical alerts mention everyone
    if (alert.severity === AlertSeverity.WEDDING_EMERGENCY) {
      mentions.push('<!channel>');
    } else if (
      alert.severity === AlertSeverity.VENDOR_CRITICAL ||
      alert.severity === AlertSeverity.SYSTEM_DOWN
    ) {
      mentions.push('<!here>');
    }

    // Add specific user mentions
    if (this.config.mentionUsers && this.isCriticalAlert(alert)) {
      const userMentions = this.config.mentionUsers
        .map((userId) => `<@${userId}>`)
        .join(' ');
      mentions.push(userMentions);
    }

    // Add group mentions
    if (this.config.mentionGroups) {
      const groupMentions = this.config.mentionGroups
        .filter((group) => this.shouldMentionGroup(group, alert))
        .map((group) => `<!subteam^${group}>`)
        .join(' ');
      if (groupMentions) mentions.push(groupMentions);
    }

    return mentions.join(' ');
  }

  /**
   * Send to existing thread
   */
  private async sendToThread(alert: Alert, channel: string): Promise<void> {
    const parentThreadTs = this.threadMap.get(alert.metadata?.parentAlertId);
    if (!parentThreadTs) return;

    try {
      await this.client.chat.postMessage({
        channel,
        text: `Update: ${alert.message}`,
        thread_ts: parentThreadTs,
        blocks: this.formatAlertBlocks(alert),
      });
    } catch (error) {
      console.error('Failed to send to thread:', error);
    }
  }

  /**
   * Send attachments
   */
  private async sendAttachments(
    alert: Alert,
    channel: string,
    threadTs: string,
  ): Promise<void> {
    const attachments = alert.metadata?.attachments as any[];
    if (!attachments || attachments.length === 0) return;

    for (const attachment of attachments) {
      try {
        if (attachment.type === 'file') {
          await this.client.files.upload({
            channels: channel,
            thread_ts: threadTs,
            file: attachment.content,
            filename: attachment.name,
            title: attachment.title,
          });
        } else if (attachment.type === 'snippet') {
          await this.client.files.upload({
            channels: channel,
            thread_ts: threadTs,
            content: attachment.content,
            filename: attachment.name,
            filetype: attachment.filetype || 'auto',
            title: attachment.title,
          });
        }
      } catch (error) {
        console.error('Failed to upload attachment:', error);
      }
    }
  }

  /**
   * Utility methods
   */
  private getSeverityEmoji(severity: AlertSeverity): string {
    const emojiMap = {
      [AlertSeverity.LOW]: '🔵',
      [AlertSeverity.MEDIUM]: '🟡',
      [AlertSeverity.HIGH]: '🟠',
      [AlertSeverity.CRITICAL]: '🔴',
      [AlertSeverity.SYSTEM_DOWN]: '💀',
      [AlertSeverity.WEDDING_EMERGENCY]: '🚨',
      [AlertSeverity.VENDOR_CRITICAL]: '⚠️',
      [AlertSeverity.TIMELINE_CRITICAL]: '⏰',
    };

    return emojiMap[severity] || '⚪';
  }

  private formatPlainText(alert: Alert): string {
    const severity = alert.severity.toUpperCase();
    return `[${severity}] ${alert.title}: ${alert.message}`;
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

  private shouldMention(alert: Alert): boolean {
    // Don't mention for health checks
    if (alert.metadata?.healthCheck) return false;

    // Don't mention for low severity
    if (alert.severity === AlertSeverity.LOW) return false;

    // Always mention for critical
    if (this.isCriticalAlert(alert)) return true;

    // Mention for medium/high during business hours
    const hour = new Date().getHours();
    return hour >= 9 && hour <= 17;
  }

  private shouldMentionGroup(group: string, alert: Alert): boolean {
    // Implement group mention logic based on alert type
    const groupAlertMap: Record<string, string[]> = {
      engineering: ['system', 'performance', 'database', 'api_error'],
      product: ['vendor_alert', 'wedding_critical', 'user_action'],
      finance: ['payment_urgent'],
      security: ['security'],
    };

    const alertTypes = groupAlertMap[group];
    return alertTypes ? alertTypes.includes(alert.type) : false;
  }

  private validateConfig(): void {
    if (!this.config.token) {
      throw new Error('Slack token is required');
    }

    if (!this.config.defaultChannel) {
      throw new Error('Default Slack channel is required');
    }

    // Validate channel format
    if (
      !this.config.defaultChannel.startsWith('#') &&
      !this.config.defaultChannel.startsWith('C')
    ) {
      this.config.defaultChannel = `#${this.config.defaultChannel}`;
    }
  }
}

export default SlackChannel;
