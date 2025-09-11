/**
 * Slack Notification Integration for Production Monitoring
 * Sends alerts, metrics, and system events to Slack channels
 */

import { WebClient } from '@slack/web-api';

export interface SlackAlert {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  service?: string;
  metric?: string;
  value?: string | number;
  threshold?: string | number;
  timestamp?: Date;
  runbook?: string;
  dashboardUrl?: string;
}

export interface SlackMetric {
  name: string;
  value: number;
  unit?: string;
  change?: number;
  changeType?: 'increase' | 'decrease';
  timestamp?: Date;
}

export interface SystemEvent {
  type: 'deployment' | 'scaling' | 'error' | 'recovery' | 'maintenance';
  service: string;
  message: string;
  details?: Record<string, any>;
  timestamp?: Date;
}

export class SlackNotificationService {
  private client: WebClient;
  private channels: {
    alerts: string;
    metrics: string;
    deployments: string;
    general: string;
  };

  constructor() {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) {
      throw new Error('SLACK_BOT_TOKEN environment variable is required');
    }

    this.client = new WebClient(token);

    this.channels = {
      alerts: process.env.SLACK_ALERTS_CHANNEL || '#production-alerts',
      metrics: process.env.SLACK_METRICS_CHANNEL || '#metrics',
      deployments: process.env.SLACK_DEPLOYMENTS_CHANNEL || '#deployments',
      general: process.env.SLACK_GENERAL_CHANNEL || '#general',
    };
  }

  /**
   * Send alert notification to Slack
   */
  async sendAlert(alert: SlackAlert): Promise<void> {
    try {
      const color = this.getAlertColor(alert.severity);
      const emoji = this.getAlertEmoji(alert.severity);

      const blocks = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${emoji} *${alert.title}*\n${alert.message}`,
          },
        },
      ];

      // Add metric details if provided
      if (alert.metric && alert.value && alert.threshold) {
        blocks.push({
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Metric:* ${alert.metric}`,
            },
            {
              type: 'mrkdwn',
              text: `*Current Value:* ${alert.value}`,
            },
            {
              type: 'mrkdwn',
              text: `*Threshold:* ${alert.threshold}`,
            },
            {
              type: 'mrkdwn',
              text: `*Service:* ${alert.service || 'Unknown'}`,
            },
          ],
        });
      }

      // Add action buttons
      const actions: any[] = [];

      if (alert.dashboardUrl) {
        actions.push({
          type: 'button',
          text: {
            type: 'plain_text',
            text: '📊 View Dashboard',
          },
          url: alert.dashboardUrl,
          style: 'primary',
        });
      }

      if (alert.runbook) {
        actions.push({
          type: 'button',
          text: {
            type: 'plain_text',
            text: '📖 View Runbook',
          },
          url: alert.runbook,
        });
      }

      if (actions.length > 0) {
        blocks.push({
          type: 'actions',
          elements: actions,
        });
      }

      await this.client.chat.postMessage({
        channel: this.channels.alerts,
        text: `${emoji} ${alert.title}`,
        blocks,
        attachments: [
          {
            color,
            footer: 'WedSync Production Monitoring',
            ts: Math.floor(
              (alert.timestamp || new Date()).getTime() / 1000,
            ).toString(),
          },
        ],
      });

      console.log(`Slack alert sent: ${alert.title}`);
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
      // Don't throw - alerts should be non-blocking
    }
  }

  /**
   * Send business metrics summary to Slack
   */
  async sendMetricsSummary(
    metrics: SlackMetric[],
    period: string = 'hourly',
  ): Promise<void> {
    try {
      const blocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `📈 ${period.charAt(0).toUpperCase() + period.slice(1)} Metrics Summary`,
          },
        },
      ];

      // Group metrics by category
      const categories = this.groupMetricsByCategory(metrics);

      for (const [category, categoryMetrics] of Object.entries(categories)) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${category}*`,
          },
        });

        const fields: any[] = [];
        for (const metric of categoryMetrics) {
          const trend = this.getTrendIndicator(metric);
          fields.push({
            type: 'mrkdwn',
            text: `*${metric.name}:* ${metric.value}${metric.unit || ''} ${trend}`,
          });
        }

        blocks.push({
          type: 'section',
          fields,
        });
      }

      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Last updated: <!date^${Math.floor(Date.now() / 1000)}^{date_short} at {time}|${new Date().toISOString()}>`,
          },
        ],
      });

      await this.client.chat.postMessage({
        channel: this.channels.metrics,
        text: `📈 ${period} Metrics Summary`,
        blocks,
      });

      console.log(`Slack metrics summary sent for ${period} period`);
    } catch (error) {
      console.error('Failed to send Slack metrics summary:', error);
    }
  }

  /**
   * Send system event notification
   */
  async sendSystemEvent(event: SystemEvent): Promise<void> {
    try {
      const emoji = this.getEventEmoji(event.type);
      const channel =
        event.type === 'deployment'
          ? this.channels.deployments
          : this.channels.general;

      const blocks = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${emoji} *${event.type.charAt(0).toUpperCase() + event.type.slice(1)} Event*\n*Service:* ${event.service}\n*Message:* ${event.message}`,
          },
        },
      ];

      // Add details if provided
      if (event.details && Object.keys(event.details).length > 0) {
        const fields: any[] = [];
        for (const [key, value] of Object.entries(event.details)) {
          fields.push({
            type: 'mrkdwn',
            text: `*${key}:* ${value}`,
          });
        }

        blocks.push({
          type: 'section',
          fields,
        });
      }

      await this.client.chat.postMessage({
        channel,
        text: `${emoji} ${event.type} - ${event.service}`,
        blocks,
        attachments: [
          {
            color: this.getEventColor(event.type),
            footer: 'WedSync System Events',
            ts: Math.floor(
              (event.timestamp || new Date()).getTime() / 1000,
            ).toString(),
          },
        ],
      });

      console.log(
        `Slack system event sent: ${event.type} for ${event.service}`,
      );
    } catch (error) {
      console.error('Failed to send Slack system event:', error);
    }
  }

  /**
   * Send daily health report
   */
  async sendDailyHealthReport(healthData: {
    uptime: number;
    totalRequests: number;
    errorRate: number;
    avgResponseTime: number;
    activeUsers: number;
    pdfsProcessed: number;
    formsCreated: number;
    paymentsProcessed: number;
  }): Promise<void> {
    try {
      const blocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🏥 Daily Health Report',
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Uptime:* ${(healthData.uptime * 100).toFixed(2)}%`,
            },
            {
              type: 'mrkdwn',
              text: `*Total Requests:* ${healthData.totalRequests.toLocaleString()}`,
            },
            {
              type: 'mrkdwn',
              text: `*Error Rate:* ${(healthData.errorRate * 100).toFixed(2)}%`,
            },
            {
              type: 'mrkdwn',
              text: `*Avg Response Time:* ${healthData.avgResponseTime}ms`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Business Metrics*',
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Active Users:* ${healthData.activeUsers.toLocaleString()}`,
            },
            {
              type: 'mrkdwn',
              text: `*PDFs Processed:* ${healthData.pdfsProcessed.toLocaleString()}`,
            },
            {
              type: 'mrkdwn',
              text: `*Forms Created:* ${healthData.formsCreated.toLocaleString()}`,
            },
            {
              type: 'mrkdwn',
              text: `*Payments Processed:* ${healthData.paymentsProcessed.toLocaleString()}`,
            },
          ],
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '📊 View Full Dashboard',
              },
              url: 'https://cloudwatch.amazonaws.com/dashboard',
              style: 'primary',
            },
          ],
        },
      ];

      await this.client.chat.postMessage({
        channel: this.channels.general,
        text: '🏥 Daily Health Report',
        blocks,
      });

      console.log('Daily health report sent to Slack');
    } catch (error) {
      console.error('Failed to send daily health report:', error);
    }
  }

  private getAlertColor(severity: string): string {
    switch (severity) {
      case 'critical':
        return '#ff0000';
      case 'warning':
        return '#ffaa00';
      case 'info':
        return '#00aa00';
      default:
        return '#808080';
    }
  }

  private getAlertEmoji(severity: string): string {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📢';
    }
  }

  private getEventEmoji(type: string): string {
    switch (type) {
      case 'deployment':
        return '🚀';
      case 'scaling':
        return '📈';
      case 'error':
        return '❌';
      case 'recovery':
        return '✅';
      case 'maintenance':
        return '🔧';
      default:
        return '📢';
    }
  }

  private getEventColor(type: string): string {
    switch (type) {
      case 'deployment':
        return '#00aa00';
      case 'scaling':
        return '#0099ff';
      case 'error':
        return '#ff0000';
      case 'recovery':
        return '#00aa00';
      case 'maintenance':
        return '#ffaa00';
      default:
        return '#808080';
    }
  }

  private groupMetricsByCategory(
    metrics: SlackMetric[],
  ): Record<string, SlackMetric[]> {
    const categories: Record<string, SlackMetric[]> = {};

    for (const metric of metrics) {
      const category = this.getCategoryFromMetricName(metric.name);
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(metric);
    }

    return categories;
  }

  private getCategoryFromMetricName(name: string): string {
    if (
      name.includes('request') ||
      name.includes('response') ||
      name.includes('error')
    ) {
      return 'Performance';
    }
    if (
      name.includes('user') ||
      name.includes('payment') ||
      name.includes('form') ||
      name.includes('pdf')
    ) {
      return 'Business';
    }
    if (
      name.includes('cpu') ||
      name.includes('memory') ||
      name.includes('disk')
    ) {
      return 'Infrastructure';
    }
    return 'System';
  }

  private getTrendIndicator(metric: SlackMetric): string {
    if (!metric.change || !metric.changeType) return '';

    const arrow = metric.changeType === 'increase' ? '↗️' : '↘️';
    const color = metric.changeType === 'increase' ? '#00aa00' : '#ff0000';

    return `${arrow} ${Math.abs(metric.change)}%`;
  }
}

// Singleton instance
export const slackNotifications = new SlackNotificationService();

// Helper functions for common use cases
export async function sendCriticalAlert(
  title: string,
  message: string,
  service?: string,
): Promise<void> {
  await slackNotifications.sendAlert({
    severity: 'critical',
    title,
    message,
    service,
    timestamp: new Date(),
  });
}

export async function sendWarningAlert(
  title: string,
  message: string,
  service?: string,
): Promise<void> {
  await slackNotifications.sendAlert({
    severity: 'warning',
    title,
    message,
    service,
    timestamp: new Date(),
  });
}

export async function sendDeploymentNotification(
  service: string,
  version: string,
  environment: string,
): Promise<void> {
  await slackNotifications.sendSystemEvent({
    type: 'deployment',
    service,
    message: `Deployed version ${version} to ${environment}`,
    details: {
      version,
      environment,
      deployedBy: process.env.USER || 'System',
    },
    timestamp: new Date(),
  });
}
