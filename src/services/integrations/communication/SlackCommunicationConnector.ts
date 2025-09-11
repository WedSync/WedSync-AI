import type {
  CommunicationPlatformConnector,
  CommunicationPlatformConfig,
  MessageDeliveryResult,
  WeddingMessage,
  WeddingCommunicationChannel,
  WeddingTeamMember,
  MessageAnalytics,
  CommunicationAnalyticsData,
} from '../../../types/communication-integration-types';
import { SlackAPIClient, SlackConfig } from './SlackAPIClient';
import { IntegrationLogger } from '../../utils/IntegrationLogger';
import { validateWeddingMessage } from '../../utils/ValidationUtils';

export interface SlackConnectorConfig extends CommunicationPlatformConfig {
  accessToken: string;
  teamId: string;
  userId?: string;
  scopes: string[];
  webhookUrl?: string;
  defaultChannelPrefix: string;
  emergencyChannelId?: string;
  adminChannelId?: string;
}

export class SlackCommunicationConnector
  implements CommunicationPlatformConnector
{
  public readonly platform = 'slack' as const;
  public readonly name = 'Slack Communication Connector';
  public readonly version = '1.0.0';

  private client: SlackAPIClient;
  private config: SlackConnectorConfig;
  private logger: IntegrationLogger;
  private weddingChannelCache: Map<string, string> = new Map(); // weddingId -> channelId

  constructor(config: SlackConnectorConfig) {
    this.config = config;
    this.client = new SlackAPIClient({
      accessToken: config.accessToken,
      teamId: config.teamId,
      userId: config.userId,
      scopes: config.scopes,
      webhookUrl: config.webhookUrl,
    });
    this.logger = new IntegrationLogger('SlackCommunicationConnector');
  }

  /**
   * Test connection to Slack workspace
   */
  async testConnection(): Promise<boolean> {
    try {
      const isConnected = await this.client.testConnection();

      if (isConnected) {
        this.logger.info('Slack connection test successful');
        return true;
      } else {
        this.logger.error('Slack connection test failed');
        return false;
      }
    } catch (error) {
      this.logger.error('Slack connection test error', { error });
      return false;
    }
  }

  /**
   * Initialize Slack integration for wedding
   */
  async initialize(
    weddingId: string,
    weddingData: {
      coupleName: string;
      weddingDate: string;
      venue?: string;
      teamMembers: WeddingTeamMember[];
    },
  ): Promise<void> {
    try {
      this.logger.info('Initializing Slack integration for wedding', {
        weddingId,
      });

      // Create wedding-specific channel
      const channel = await this.client.createWeddingChannel(weddingId, {
        coupleName: weddingData.coupleName,
        weddingDate: weddingData.weddingDate,
        venue: weddingData.venue,
      });

      // Cache the channel ID for future use
      this.weddingChannelCache.set(weddingId, channel.id);

      // Add team members to the channel
      if (weddingData.teamMembers.length > 0) {
        await this.client.addTeamMembersToChannel(
          channel.id,
          weddingData.teamMembers,
        );
      }

      // Send welcome message
      const welcomeMessage: WeddingMessage = {
        weddingId,
        type: 'system',
        priority: 'low',
        content: `🎉 Welcome to the coordination channel for ${weddingData.coupleName}'s wedding on ${weddingData.weddingDate}!\n\nThis channel will be used for all wedding-related communications and updates. Team members have been added automatically.`,
        timestamp: new Date(),
        metadata: {
          source: 'slack_connector',
          actions: [
            {
              label: 'View Wedding Details',
              value: `view_wedding_${weddingId}`,
              actionId: 'view_wedding_details',
            },
          ],
        },
      };

      await this.client.sendWeddingMessage(channel.id, welcomeMessage);

      this.logger.info('Slack integration initialized successfully', {
        weddingId,
        channelId: channel.id,
        teamMemberCount: weddingData.teamMembers.length,
      });
    } catch (error) {
      this.logger.error('Failed to initialize Slack integration', {
        weddingId,
        error,
      });
      throw error;
    }
  }

  /**
   * Send wedding message to Slack channel
   */
  async sendMessage(
    weddingId: string,
    message: WeddingMessage,
    targetChannel?: string,
  ): Promise<MessageDeliveryResult> {
    try {
      // Validate message
      const validationResult = validateWeddingMessage(message);
      if (!validationResult.isValid) {
        throw new Error(
          `Invalid message: ${validationResult.errors.join(', ')}`,
        );
      }

      // Determine target channel
      let channelId = targetChannel;
      if (!channelId) {
        channelId = this.weddingChannelCache.get(weddingId);
        if (!channelId) {
          // Try to find the wedding channel
          const channels = await this.client.getChannels();
          const weddingChannel = channels.find(
            (ch) => ch.name.includes(weddingId.slice(-8)) && !ch.is_archived,
          );
          if (weddingChannel) {
            channelId = weddingChannel.id;
            this.weddingChannelCache.set(weddingId, channelId);
          } else {
            throw new Error(`No Slack channel found for wedding ${weddingId}`);
          }
        }
      }

      // Send message based on priority
      let result: MessageDeliveryResult;
      if (message.priority === 'critical' || message.type === 'urgent') {
        result = await this.client.sendEmergencyAlert(
          channelId,
          message,
          'critical',
        );
      } else if (message.priority === 'high') {
        result = await this.client.sendEmergencyAlert(
          channelId,
          message,
          'high',
        );
      } else {
        result = await this.client.sendWeddingMessage(channelId, message);
      }

      this.logger.info('Message sent successfully to Slack', {
        weddingId,
        messageType: message.type,
        priority: message.priority,
        channelId,
        success: result.success,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to send message to Slack', {
        weddingId,
        messageType: message.type,
        error,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        platform: 'slack',
        channelId: targetChannel || 'unknown',
        attemptedAt: new Date(),
      };
    }
  }

  /**
   * Send broadcast message to multiple channels
   */
  async sendBroadcast(
    message: WeddingMessage,
    channels: WeddingCommunicationChannel[],
  ): Promise<MessageDeliveryResult[]> {
    const results: MessageDeliveryResult[] = [];

    for (const channel of channels) {
      try {
        const result = await this.sendMessage(
          message.weddingId,
          message,
          channel.channelId,
        );
        results.push(result);
      } catch (error) {
        this.logger.error('Failed to send broadcast message to channel', {
          channelId: channel.channelId,
          error,
        });

        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          platform: 'slack',
          channelId: channel.channelId,
          attemptedAt: new Date(),
        });
      }
    }

    return results;
  }

  /**
   * Send emergency alert to all relevant channels
   */
  async sendEmergencyAlert(
    weddingId: string,
    alert: WeddingMessage,
    alertLevel: 'critical' | 'high' | 'medium' = 'high',
  ): Promise<MessageDeliveryResult[]> {
    const results: MessageDeliveryResult[] = [];

    try {
      // Send to wedding-specific channel
      const weddingChannelId = this.weddingChannelCache.get(weddingId);
      if (weddingChannelId) {
        const weddingResult = await this.client.sendEmergencyAlert(
          weddingChannelId,
          alert,
          alertLevel,
        );
        results.push(weddingResult);
      }

      // Send to emergency channel if configured and alert is critical
      if (alertLevel === 'critical' && this.config.emergencyChannelId) {
        const emergencyResult = await this.client.sendEmergencyAlert(
          this.config.emergencyChannelId,
          alert,
          alertLevel,
        );
        results.push(emergencyResult);
      }

      // Send to admin channel for high and critical alerts
      if (
        (alertLevel === 'critical' || alertLevel === 'high') &&
        this.config.adminChannelId
      ) {
        const adminAlert = {
          ...alert,
          content: `🚨 **Admin Alert**: ${alert.content}\n\n**Wedding ID**: ${weddingId}\n**Alert Level**: ${alertLevel.toUpperCase()}`,
        };

        const adminResult = await this.client.sendEmergencyAlert(
          this.config.adminChannelId,
          adminAlert,
          alertLevel,
        );
        results.push(adminResult);
      }

      this.logger.warn('Emergency alert sent to Slack channels', {
        weddingId,
        alertLevel,
        channelCount: results.length,
        successCount: results.filter((r) => r.success).length,
      });

      return results;
    } catch (error) {
      this.logger.error('Failed to send emergency alert to Slack', {
        weddingId,
        alertLevel,
        error,
      });

      return [
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          platform: 'slack',
          channelId: 'multiple',
          attemptedAt: new Date(),
        },
      ];
    }
  }

  /**
   * Get wedding communication channels
   */
  async getWeddingChannels(
    weddingId: string,
  ): Promise<WeddingCommunicationChannel[]> {
    try {
      const channels = await this.client.getChannels();
      const weddingChannels: WeddingCommunicationChannel[] = [];

      for (const channel of channels) {
        if (
          channel.name.includes(weddingId.slice(-8)) ||
          channel.purpose.value.includes(weddingId)
        ) {
          const members = await this.client.getChannelMembers(channel.id);

          weddingChannels.push({
            channelId: channel.id,
            name: channel.name,
            type: channel.is_private ? 'private' : 'public',
            platform: 'slack',
            memberCount: channel.num_members,
            isActive: !channel.is_archived,
            createdAt: new Date(), // Slack doesn't provide creation date in list
            metadata: {
              topic: channel.purpose.value,
              members: members.map((m) => ({
                id: m.id,
                name: m.real_name || m.name,
                email: m.profile.email,
                role: m.profile.title,
              })),
            },
          });
        }
      }

      this.logger.info('Retrieved wedding channels from Slack', {
        weddingId,
        channelCount: weddingChannels.length,
      });

      return weddingChannels;
    } catch (error) {
      this.logger.error('Failed to get wedding channels from Slack', {
        weddingId,
        error,
      });
      return [];
    }
  }

  /**
   * Get message analytics for wedding communications
   */
  async getMessageAnalytics(
    weddingId: string,
    timeRange: { start: Date; end: Date },
  ): Promise<MessageAnalytics> {
    try {
      const channelId = this.weddingChannelCache.get(weddingId);
      if (!channelId) {
        throw new Error(`No Slack channel found for wedding ${weddingId}`);
      }

      // Get message history for the time range
      const messages = await this.client.getChannelHistory(channelId, {
        oldest: (timeRange.start.getTime() / 1000).toString(),
        latest: (timeRange.end.getTime() / 1000).toString(),
        limit: 1000,
      });

      // Analyze messages
      const messagesByType: Record<string, number> = {
        system: 0,
        update: 0,
        urgent: 0,
        reminder: 0,
        social: 0,
      };

      const messagesByPriority: Record<string, number> = {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      };

      const responseTimeAnalysis: number[] = [];
      let totalMessages = messages.length;
      let userMessages = 0;
      let botMessages = 0;

      for (const message of messages) {
        // Categorize messages (simple heuristic based on content)
        if (message.text.includes('🚨') || message.text.includes('URGENT')) {
          messagesByType.urgent++;
          messagesByPriority.critical++;
        } else if (
          message.text.includes('reminder') ||
          message.text.includes("don't forget")
        ) {
          messagesByType.reminder++;
          messagesByPriority.medium++;
        } else if (
          message.text.includes('update') ||
          message.text.includes('changed')
        ) {
          messagesByType.update++;
          messagesByPriority.medium++;
        } else if (
          message.user.includes('bot') ||
          message.username?.includes('Bot')
        ) {
          messagesByType.system++;
          messagesByPriority.low++;
          botMessages++;
        } else {
          messagesByType.social++;
          messagesByPriority.low++;
          userMessages++;
        }
      }

      const analytics: MessageAnalytics = {
        totalMessages,
        messagesByType,
        messagesByPriority,
        deliveryRate: 100, // Slack doesn't provide delivery failure data
        averageResponseTime:
          responseTimeAnalysis.length > 0
            ? responseTimeAnalysis.reduce((a, b) => a + b) /
              responseTimeAnalysis.length
            : 0,
        engagementMetrics: {
          activeUsers: Math.max(userMessages, 1),
          messagesPerUser: userMessages > 0 ? totalMessages / userMessages : 0,
          peakActivityHour: 12, // Would need more complex analysis
          responseRate: userMessages / Math.max(botMessages, 1),
        },
        platformSpecific: {
          slack: {
            channelId,
            totalThreads: 0, // Would need thread analysis
            reactionsCount: 0, // Would need reactions API
            filesShared: 0, // Would need files API
            pinsCount: 0, // Would need pins API
          },
        },
      };

      this.logger.info('Generated message analytics for Slack', {
        weddingId,
        timeRange,
        totalMessages,
        analytics,
      });

      return analytics;
    } catch (error) {
      this.logger.error('Failed to get message analytics from Slack', {
        weddingId,
        error,
      });

      // Return empty analytics on error
      return {
        totalMessages: 0,
        messagesByType: {
          system: 0,
          update: 0,
          urgent: 0,
          reminder: 0,
          social: 0,
        },
        messagesByPriority: {
          low: 0,
          medium: 0,
          high: 0,
          critical: 0,
        },
        deliveryRate: 0,
        averageResponseTime: 0,
        engagementMetrics: {
          activeUsers: 0,
          messagesPerUser: 0,
          peakActivityHour: 0,
          responseRate: 0,
        },
      };
    }
  }

  /**
   * Get comprehensive analytics data
   */
  async getAnalytics(
    weddingId: string,
    timeRange: { start: Date; end: Date },
  ): Promise<CommunicationAnalyticsData> {
    try {
      const messageAnalytics = await this.getMessageAnalytics(
        weddingId,
        timeRange,
      );
      const channels = await this.getWeddingChannels(weddingId);

      const analytics: CommunicationAnalyticsData = {
        weddingId,
        platform: 'slack',
        timeRange,
        messageAnalytics,
        channelAnalytics: {
          totalChannels: channels.length,
          activeChannels: channels.filter((c) => c.isActive).length,
          averageMembersPerChannel:
            channels.length > 0
              ? channels.reduce((sum, c) => sum + c.memberCount, 0) /
                channels.length
              : 0,
          channelTypes: channels.reduce(
            (acc, c) => {
              acc[c.type] = (acc[c.type] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>,
          ),
        },
        performanceMetrics: {
          averageDeliveryTime: 1, // Slack is typically near-instantaneous
          failureRate: 0, // Would need failure tracking
          uptime: 99.9, // Slack's typical SLA
          rateLimitHits: 0, // Would need rate limiter metrics
        },
        weddingSpecificMetrics: {
          daysUntilWedding: Math.max(
            0,
            Math.ceil(
              (new Date(weddingId).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24),
            ),
          ),
          urgencyLevel: 'normal', // Would calculate based on days until wedding
          teamEngagement:
            messageAnalytics.engagementMetrics.responseRate > 1
              ? 'high'
              : 'medium',
          criticalAlertsCount:
            messageAnalytics.messagesByPriority.critical || 0,
        },
      };

      this.logger.info('Generated comprehensive analytics for Slack', {
        weddingId,
        analytics,
      });

      return analytics;
    } catch (error) {
      this.logger.error('Failed to get comprehensive analytics from Slack', {
        weddingId,
        error,
      });
      throw error;
    }
  }

  /**
   * Update wedding status and channel information
   */
  async updateWeddingStatus(
    weddingId: string,
    status:
      | 'planning'
      | 'confirmed'
      | 'in_progress'
      | 'completed'
      | 'cancelled',
    weddingData: {
      coupleName: string;
      weddingDate: string;
      venue?: string;
      daysUntilWedding?: number;
    },
  ): Promise<void> {
    try {
      const channelId = this.weddingChannelCache.get(weddingId);
      if (!channelId) {
        this.logger.warn('No Slack channel found for wedding status update', {
          weddingId,
        });
        return;
      }

      // Update channel topic
      await this.client.updateWeddingChannelTopic(channelId, {
        ...weddingData,
        status,
      });

      // Send status update message
      const statusEmoji =
        status === 'completed'
          ? '✅'
          : status === 'cancelled'
            ? '❌'
            : status === 'in_progress'
              ? '🎉'
              : '📋';

      const statusMessage: WeddingMessage = {
        weddingId,
        type: 'update',
        priority: status === 'cancelled' ? 'high' : 'medium',
        content: `${statusEmoji} **Wedding Status Update**\n\nStatus changed to: **${status.toUpperCase()}**\n\nWedding: ${weddingData.coupleName}\nDate: ${weddingData.weddingDate}${weddingData.venue ? `\nVenue: ${weddingData.venue}` : ''}${weddingData.daysUntilWedding ? `\nDays until wedding: ${weddingData.daysUntilWedding}` : ''}`,
        timestamp: new Date(),
        metadata: {
          source: 'slack_connector',
          statusChange: {
            newStatus: status,
            updatedAt: new Date().toISOString(),
          },
        },
      };

      await this.client.sendWeddingMessage(channelId, statusMessage);

      // Archive channel if wedding is completed or cancelled
      if (status === 'completed' || status === 'cancelled') {
        // Wait a bit before archiving to allow team to see the final message
        setTimeout(async () => {
          try {
            await this.client.archiveWeddingChannel(channelId);
            this.weddingChannelCache.delete(weddingId);
          } catch (error) {
            this.logger.error('Failed to archive wedding channel', {
              weddingId,
              channelId,
              error,
            });
          }
        }, 30000); // 30 seconds delay
      }

      this.logger.info('Wedding status updated in Slack', {
        weddingId,
        status,
        channelId,
      });
    } catch (error) {
      this.logger.error('Failed to update wedding status in Slack', {
        weddingId,
        status,
        error,
      });
      throw error;
    }
  }

  /**
   * Cleanup integration when no longer needed
   */
  async cleanup(weddingId: string): Promise<void> {
    try {
      const channelId = this.weddingChannelCache.get(weddingId);
      if (channelId) {
        await this.client.archiveWeddingChannel(channelId);
        this.weddingChannelCache.delete(weddingId);
      }

      this.logger.info('Slack integration cleaned up', { weddingId });
    } catch (error) {
      this.logger.error('Failed to cleanup Slack integration', {
        weddingId,
        error,
      });
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): CommunicationPlatformConfig {
    return {
      platform: this.platform,
      enabled: this.config.enabled,
      rateLimits: this.config.rateLimits,
      retryPolicy: this.config.retryPolicy,
      authConfig: {
        type: 'oauth2',
        clientId: this.config.teamId,
        // Don't expose sensitive data
        clientSecret: '***',
        accessToken: '***',
      },
    };
  }
}
