/**
 * WS-190: Microsoft Teams Alert System for WedSync Incident Response
 *
 * Integrates with Microsoft Teams for security incident notifications
 * in enterprise wedding planning environments using Teams for collaboration.
 */

import { z } from 'zod';
import type { Incident } from '../incident-orchestrator';

// Teams webhook configuration
const TeamsConfigSchema = z.object({
  webhookUrl: z.string().url(),
  timeoutMs: z.number().default(10000),
  maxRetries: z.number().default(2),
  cardTheme: z
    .enum(['default', 'emphasis', 'good', 'attention', 'warning'])
    .default('attention'),
});

type TeamsConfig = z.infer<typeof TeamsConfigSchema>;

// Teams Adaptive Card structure
interface TeamsCard {
  '@type': 'MessageCard';
  '@context': 'https://schema.org/extensions';
  summary: string;
  themeColor: string;
  sections: TeamsSection[];
  potentialAction?: TeamsAction[];
}

interface TeamsSection {
  activityTitle: string;
  activitySubtitle?: string;
  activityImage?: string;
  facts: TeamsFact[];
  text?: string;
  markdown?: boolean;
}

interface TeamsFact {
  name: string;
  value: string;
}

interface TeamsAction {
  '@type': string;
  name: string;
  target: string[];
}

// Response from Teams webhook
interface TeamsResponse {
  status: number;
  body: string;
}

/**
 * Microsoft Teams notification system for wedding platform security incidents
 * Provides rich formatted alerts for enterprise environments
 */
export class TeamsAlertsNotifier {
  private config: TeamsConfig;

  // Theme color mapping for different severity levels
  private readonly severityColors = {
    critical: '#FF0000', // Red
    high: '#FF6600', // Orange
    medium: '#FFD700', // Gold
    low: '#32CD32', // Lime Green
    info: '#1E90FF', // Dodger Blue
  };

  // Wedding-specific activity images
  private readonly incidentImages = {
    payment_fraud: 'https://wedsync.com/assets/icons/payment-alert.png',
    data_breach: 'https://wedsync.com/assets/icons/data-breach.png',
    venue_security: 'https://wedsync.com/assets/icons/venue-security.png',
    supplier_compromise: 'https://wedsync.com/assets/icons/supplier-alert.png',
    platform_outage: 'https://wedsync.com/assets/icons/platform-status.png',
    compliance_violation:
      'https://wedsync.com/assets/icons/compliance-alert.png',
  };

  constructor() {
    // Load configuration from environment variables
    this.config = TeamsConfigSchema.parse({
      webhookUrl: process.env.TEAMS_WEBHOOK_URL || '',
      timeoutMs: parseInt(process.env.TEAMS_TIMEOUT_MS || '10000'),
      maxRetries: parseInt(process.env.TEAMS_MAX_RETRIES || '2'),
      cardTheme:
        (process.env.TEAMS_CARD_THEME as
          | 'default'
          | 'emphasis'
          | 'good'
          | 'attention'
          | 'warning') || 'attention',
    });
  }

  /**
   * Send critical alert to Teams - highest priority for wedding emergencies
   */
  async sendCriticalAlert(incident: Incident): Promise<TeamsResponse> {
    if (!this.config.webhookUrl) {
      throw new Error('Teams webhook URL not configured');
    }

    const card = this.createCriticalCard(incident);
    return this.sendCard(card);
  }

  /**
   * Send high priority alert to Teams
   */
  async sendHighPriorityAlert(incident: Incident): Promise<TeamsResponse> {
    if (!this.config.webhookUrl) {
      throw new Error('Teams webhook URL not configured');
    }

    const card = this.createHighPriorityCard(incident);
    return this.sendCard(card);
  }

  /**
   * Send standard alert for medium/low severity incidents
   */
  async sendStandardAlert(incident: Incident): Promise<TeamsResponse> {
    if (!this.config.webhookUrl) {
      throw new Error('Teams webhook URL not configured');
    }

    const card = this.createStandardCard(incident);
    return this.sendCard(card);
  }

  /**
   * Send wedding day specific alert with enhanced formatting
   */
  async sendWeddingDayAlert(
    incident: Incident,
    weddingDate: string,
    venueName?: string,
  ): Promise<TeamsResponse> {
    if (!this.config.webhookUrl) {
      throw new Error('Teams webhook URL not configured');
    }

    const card = this.createWeddingDayCard(incident, weddingDate, venueName);
    return this.sendCard(card);
  }

  /**
   * Send resolution notification when incident is resolved
   */
  async sendResolutionAlert(
    incident: Incident,
    resolutionTime: number,
    resolvedBy: string,
    resolutionNotes?: string,
  ): Promise<TeamsResponse> {
    if (!this.config.webhookUrl) {
      throw new Error('Teams webhook URL not configured');
    }

    const card = this.createResolutionCard(
      incident,
      resolutionTime,
      resolvedBy,
      resolutionNotes,
    );
    return this.sendCard(card);
  }

  /**
   * Create critical incident card with maximum urgency formatting
   */
  private createCriticalCard(incident: Incident): TeamsCard {
    return {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      summary: `🚨 CRITICAL: ${incident.title}`,
      themeColor: this.severityColors.critical,
      sections: [
        {
          activityTitle: '🚨 CRITICAL WEDDING SECURITY INCIDENT',
          activitySubtitle: `${incident.type.toUpperCase()} - IMMEDIATE ACTION REQUIRED`,
          activityImage:
            this.incidentImages[
              incident.type as keyof typeof this.incidentImages
            ] || 'https://wedsync.com/assets/icons/alert-critical.png',
          facts: [
            { name: 'Incident ID', value: incident.id },
            {
              name: 'Severity',
              value: `🔴 ${incident.severity.toUpperCase()}`,
            },
            {
              name: 'Type',
              value: incident.type.replace('_', ' ').toUpperCase(),
            },
            {
              name: 'Wedding ID',
              value: incident.weddingId || 'Not specified',
            },
            {
              name: 'Affected Users',
              value: incident.affectedUsers.length.toString(),
            },
            { name: 'Response SLA', value: '⚡ < 5 minutes' },
            {
              name: 'Escalation Status',
              value: '🔥 Auto-escalated to on-call team',
            },
            {
              name: 'Time Detected',
              value: incident.timestamp.toLocaleString(),
            },
          ],
          text: `**Description:** ${incident.description}\n\n**⚠️ This is a wedding day critical incident requiring immediate response. All affected weddings must be monitored for service disruption.**`,
          markdown: true,
        },
      ],
      potentialAction: [
        {
          '@type': 'OpenUri',
          name: '🏃 Respond Now',
          target: [
            `https://wedsync.com/security/incidents/${incident.id}/respond`,
          ],
        },
        {
          '@type': 'OpenUri',
          name: '📊 Security Dashboard',
          target: ['https://wedsync.com/security/dashboard'],
        },
        {
          '@type': 'OpenUri',
          name: '📞 Emergency Contacts',
          target: ['https://wedsync.com/security/contacts'],
        },
      ],
    };
  }

  /**
   * Create high priority card for urgent incidents
   */
  private createHighPriorityCard(incident: Incident): TeamsCard {
    return {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      summary: `⚠️ HIGH PRIORITY: ${incident.title}`,
      themeColor: this.severityColors.high,
      sections: [
        {
          activityTitle: '⚠️ HIGH PRIORITY SECURITY INCIDENT',
          activitySubtitle: `${incident.type.toUpperCase()} - Response Required`,
          activityImage:
            this.incidentImages[
              incident.type as keyof typeof this.incidentImages
            ] || 'https://wedsync.com/assets/icons/alert-high.png',
          facts: [
            { name: 'Incident ID', value: incident.id },
            {
              name: 'Severity',
              value: `🟠 ${incident.severity.toUpperCase()}`,
            },
            {
              name: 'Type',
              value: incident.type.replace('_', ' ').toUpperCase(),
            },
            {
              name: 'Wedding Context',
              value: incident.weddingId
                ? `Wedding ${incident.weddingId}`
                : 'Platform-wide',
            },
            {
              name: 'Impact Scope',
              value: `${incident.affectedUsers.length} users affected`,
            },
            { name: 'Response SLA', value: '⏱️ < 15 minutes' },
            { name: 'Assignment', value: '👥 Security Team' },
            {
              name: 'Detection Time',
              value: incident.timestamp.toLocaleString(),
            },
          ],
          text: `**Description:** ${incident.description}\n\n**Next Steps:** Security team should investigate and contain the incident within the response SLA.`,
          markdown: true,
        },
      ],
      potentialAction: [
        {
          '@type': 'OpenUri',
          name: '🔍 Investigate',
          target: [
            `https://wedsync.com/security/incidents/${incident.id}/investigate`,
          ],
        },
        {
          '@type': 'OpenUri',
          name: '📈 Analytics',
          target: [
            `https://wedsync.com/security/analytics?incident=${incident.id}`,
          ],
        },
      ],
    };
  }

  /**
   * Create standard card for medium/low severity incidents
   */
  private createStandardCard(incident: Incident): TeamsCard {
    const color =
      this.severityColors[
        incident.severity as keyof typeof this.severityColors
      ] || this.severityColors.info;
    const severityEmoji = {
      medium: '🟡',
      low: '🟢',
      info: '🔵',
    };

    return {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      summary: `Security Incident: ${incident.title}`,
      themeColor: color,
      sections: [
        {
          activityTitle: `${severityEmoji[incident.severity as keyof typeof severityEmoji] || 'ℹ️'} Security Incident Detected`,
          activitySubtitle: incident.type.replace('_', ' ').toUpperCase(),
          activityImage:
            this.incidentImages[
              incident.type as keyof typeof this.incidentImages
            ] || 'https://wedsync.com/assets/icons/alert-standard.png',
          facts: [
            { name: 'Incident ID', value: incident.id },
            { name: 'Severity', value: incident.severity.toUpperCase() },
            {
              name: 'Type',
              value: incident.type.replace('_', ' ').toUpperCase(),
            },
            {
              name: 'Context',
              value: incident.weddingId
                ? `Wedding: ${incident.weddingId}`
                : 'General Platform',
            },
            {
              name: 'Users Affected',
              value: incident.affectedUsers.length.toString(),
            },
            { name: 'Detected At', value: incident.timestamp.toLocaleString() },
          ],
          text: `**Description:** ${incident.description}`,
          markdown: true,
        },
      ],
      potentialAction: [
        {
          '@type': 'OpenUri',
          name: '🔎 View Details',
          target: [`https://wedsync.com/security/incidents/${incident.id}`],
        },
      ],
    };
  }

  /**
   * Create wedding day specific card with enhanced wedding context
   */
  private createWeddingDayCard(
    incident: Incident,
    weddingDate: string,
    venueName?: string,
  ): TeamsCard {
    return {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      summary: `💒 WEDDING DAY INCIDENT: ${incident.title}`,
      themeColor: '#FF1493', // Deep pink for wedding day
      sections: [
        {
          activityTitle: '💒 WEDDING DAY SECURITY INCIDENT',
          activitySubtitle: `${incident.type.toUpperCase()} - Active Wedding Day Alert`,
          activityImage:
            'https://wedsync.com/assets/icons/wedding-day-alert.png',
          facts: [
            { name: '💒 Wedding Date', value: weddingDate },
            { name: '🏛️ Venue', value: venueName || 'Not specified' },
            { name: '🆔 Incident ID', value: incident.id },
            {
              name: '⚠️ Severity',
              value: `🔴 ${incident.severity.toUpperCase()}`,
            },
            {
              name: '🎯 Type',
              value: incident.type.replace('_', ' ').toUpperCase(),
            },
            {
              name: '👥 Impact',
              value: `${incident.affectedUsers.length} users affected`,
            },
            { name: '📋 Protocol', value: '🚨 WEDDING DAY EMERGENCY' },
            {
              name: '⚡ Escalation',
              value: '🔝 AUTO-ESCALATED TO SENIOR TEAM',
            },
          ],
          text: `**⚠️ ACTIVE WEDDING DAY INCIDENT ⚠️**\n\n**Description:** ${incident.description}\n\n**🚨 CRITICAL:** This incident may affect active wedding celebrations. Immediate response and guest communication may be required.`,
          markdown: true,
        },
      ],
      potentialAction: [
        {
          '@type': 'OpenUri',
          name: '🚨 Emergency Response',
          target: [`https://wedsync.com/security/wedding-day/${incident.id}`],
        },
        {
          '@type': 'OpenUri',
          name: '💒 Wedding Dashboard',
          target: [`https://wedsync.com/weddings/live/${weddingDate}`],
        },
        {
          '@type': 'OpenUri',
          name: '📞 Wedding Coordinator',
          target: [
            `https://wedsync.com/weddings/${incident.weddingId}/contacts`,
          ],
        },
      ],
    };
  }

  /**
   * Create resolution card when incident is closed
   */
  private createResolutionCard(
    incident: Incident,
    resolutionTime: number,
    resolvedBy: string,
    resolutionNotes?: string,
  ): TeamsCard {
    const durationMinutes = Math.round(resolutionTime / (1000 * 60));

    return {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      summary: `✅ RESOLVED: ${incident.title}`,
      themeColor: '#28a745', // Green for resolution
      sections: [
        {
          activityTitle: '✅ INCIDENT RESOLVED',
          activitySubtitle: `${incident.type.toUpperCase()} - Successfully Closed`,
          activityImage:
            'https://wedsync.com/assets/icons/incident-resolved.png',
          facts: [
            { name: 'Incident ID', value: incident.id },
            { name: '⏱️ Resolution Time', value: `${durationMinutes} minutes` },
            { name: '👤 Resolved By', value: resolvedBy },
            {
              name: '📊 Original Severity',
              value: incident.severity.toUpperCase(),
            },
            {
              name: '👥 Users Affected',
              value: incident.affectedUsers.length.toString(),
            },
            { name: '✅ Current Status', value: 'CLOSED' },
            { name: '🕐 Closed At', value: new Date().toLocaleString() },
          ],
          text: `**✅ Resolution Complete**\n\n**Original Description:** ${incident.description}\n\n${resolutionNotes ? `**Resolution Notes:** ${resolutionNotes}` : '**Resolution:** Incident has been successfully resolved and all affected services are operational.'}`,
          markdown: true,
        },
      ],
      potentialAction: [
        {
          '@type': 'OpenUri',
          name: '📋 View Report',
          target: [
            `https://wedsync.com/security/incidents/${incident.id}/report`,
          ],
        },
        {
          '@type': 'OpenUri',
          name: '📊 Post-Incident Analysis',
          target: [
            `https://wedsync.com/security/incidents/${incident.id}/analysis`,
          ],
        },
      ],
    };
  }

  /**
   * Send card to Teams with retry logic
   */
  private async sendCard(
    card: TeamsCard,
    retryCount = 0,
  ): Promise<TeamsResponse> {
    try {
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WedSync-Security-Integration/1.0',
        },
        body: JSON.stringify(card),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });

      const responseBody = await response.text();

      if (!response.ok) {
        throw new Error(
          `Teams webhook error: ${response.status} - ${responseBody}`,
        );
      }

      // Log successful notification
      this.logNotification('success', card.summary);

      return {
        status: response.status,
        body: responseBody,
      };
    } catch (error) {
      if (retryCount < this.config.maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.sendCard(card, retryCount + 1);
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logNotification('failure', card.summary, errorMessage);

      throw new Error(
        `Failed to send Teams notification after ${this.config.maxRetries} retries: ${errorMessage}`,
      );
    }
  }

  /**
   * Test Teams webhook connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      const testCard: TeamsCard = {
        '@type': 'MessageCard',
        '@context': 'https://schema.org/extensions',
        summary: 'WedSync Security Integration Test',
        themeColor: '#00FF00',
        sections: [
          {
            activityTitle: '🧪 WedSync Security Integration Test',
            activitySubtitle: 'Connection Test',
            activityImage:
              'https://wedsync.com/assets/icons/test-connection.png',
            facts: [
              { name: 'Status', value: 'Testing Connection' },
              { name: 'Integration', value: 'Microsoft Teams' },
              { name: 'Timestamp', value: new Date().toLocaleString() },
              { name: 'Version', value: '1.0.0' },
            ],
            text: 'This is a test message from the WedSync security integration system to verify Teams webhook connectivity.',
            markdown: true,
          },
        ],
        potentialAction: [
          {
            '@type': 'OpenUri',
            name: '🔧 Integration Settings',
            target: ['https://wedsync.com/admin/integrations/teams'],
          },
        ],
      };

      await this.sendCard(testCard);
      return true;
    } catch (error) {
      console.error('Teams connection test failed:', error);
      return false;
    }
  }

  /**
   * Log notification attempt for monitoring
   */
  private logNotification(
    status: string,
    summary: string,
    error?: string,
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      integration: 'teams',
      status,
      summary: summary.substring(0, 100), // Truncate for logging
      error,
    };

    console.log('Teams notification log:', JSON.stringify(logEntry));
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(newConfig: Partial<TeamsConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration (sanitized - no webhook URL)
   */
  getConfig(): Omit<TeamsConfig, 'webhookUrl'> {
    const { webhookUrl, ...sanitizedConfig } = this.config;
    return sanitizedConfig;
  }

  /**
   * Get available theme colors for cards
   */
  getAvailableThemeColors(): Record<string, string> {
    return this.severityColors;
  }
}
