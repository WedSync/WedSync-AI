import { WebClient, KnownBlock, Block } from '@slack/web-api';
import { CircuitBreaker } from '../../utils/CircuitBreaker';
import { RateLimiter } from '../../utils/RateLimiter';
import { IntegrationLogger } from '../../utils/IntegrationLogger';
import type {
  CommunicationPlatformConfig,
  MessageDeliveryResult,
  WeddingMessage,
  WeddingTeamMember,
  WeddingCommunicationChannel,
} from '../../../types/communication-integration-types';

export interface SlackConfig {
  accessToken: string;
  teamId: string;
  userId?: string;
  scopes: string[];
  webhookUrl?: string;
}

export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  is_archived: boolean;
  num_members: number;
  purpose: {
    value: string;
    creator: string;
    last_set: number;
  };
}

export interface SlackUser {
  id: string;
  name: string;
  real_name: string;
  profile: {
    email?: string;
    phone?: string;
    title?: string;
    display_name: string;
    real_name: string;
    image_72: string;
  };
}

export interface SlackMessage {
  ts: string;
  channel: string;
  user: string;
  text: string;
  thread_ts?: string;
  blocks?: (KnownBlock | Block)[];
  attachments?: any[];
}

export class SlackAPIClient {
  private client: WebClient;
  private circuitBreaker: CircuitBreaker;
  private rateLimiter: RateLimiter;
  private logger: IntegrationLogger;
  private config: SlackConfig;

  constructor(config: SlackConfig) {
    this.config = config;
    this.client = new WebClient(config.accessToken);

    // Initialize circuit breaker for Slack API reliability
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 60000,
      monitoringPeriod: 30000,
      expectedErrors: ['rate_limited', 'not_authed', 'channel_not_found'],
    });

    // Slack rate limits: 1+ requests per minute per workspace
    this.rateLimiter = new RateLimiter({
      requests: 100,
      windowMs: 60000, // 1 minute
      skipSuccessfulRequests: false,
    });

    this.logger = new IntegrationLogger('SlackAPIClient');
  }

  /**
   * Test API connection and validate credentials
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.circuitBreaker.execute(async () => {
        await this.rateLimiter.checkLimit(`test_connection`);
        return await this.client.auth.test();
      });

      this.logger.info('Slack connection test successful', {
        team: result.team,
        user: result.user,
        url: result.url,
      });

      return result.ok === true;
    } catch (error) {
      this.logger.error('Slack connection test failed', { error });
      return false;
    }
  }

  /**
   * Get all channels in the workspace
   */
  async getChannels(): Promise<SlackChannel[]> {
    try {
      const result = await this.circuitBreaker.execute(async () => {
        await this.rateLimiter.checkLimit(`get_channels`);
        return await this.client.conversations.list({
          types: 'public_channel,private_channel',
          limit: 1000,
        });
      });

      if (!result.ok || !result.channels) {
        throw new Error(`Failed to get channels: ${result.error}`);
      }

      return result.channels as SlackChannel[];
    } catch (error) {
      this.logger.error('Failed to get Slack channels', { error });
      throw error;
    }
  }

  /**
   * Create a new Slack channel for wedding coordination
   */
  async createWeddingChannel(
    weddingId: string,
    weddingData: {
      coupleName: string;
      weddingDate: string;
      venue?: string;
    },
  ): Promise<SlackChannel> {
    const channelName = `wedding-${weddingData.coupleName.toLowerCase().replace(/\s+/g, '-')}-${weddingId.slice(-8)}`;
    const topic = `Wedding coordination for ${weddingData.coupleName} - ${weddingData.weddingDate}${weddingData.venue ? ` at ${weddingData.venue}` : ''}`;

    try {
      const result = await this.circuitBreaker.execute(async () => {
        await this.rateLimiter.checkLimit(`create_channel_${weddingId}`);
        return await this.client.conversations.create({
          name: channelName,
          is_private: false,
        });
      });

      if (!result.ok || !result.channel) {
        throw new Error(`Failed to create channel: ${result.error}`);
      }

      // Set channel topic
      await this.circuitBreaker.execute(async () => {
        await this.rateLimiter.checkLimit(`set_topic_${result.channel!.id}`);
        return await this.client.conversations.setTopic({
          channel: result.channel!.id!,
          topic,
        });
      });

      this.logger.info('Wedding Slack channel created', {
        channelId: result.channel.id,
        channelName,
        weddingId,
      });

      return result.channel as SlackChannel;
    } catch (error) {
      this.logger.error('Failed to create wedding channel', {
        error,
        weddingId,
        channelName,
      });
      throw error;
    }
  }

  /**
   * Send a wedding notification message to a channel
   */
  async sendWeddingMessage(
    channelId: string,
    message: WeddingMessage,
    threadTs?: string,
  ): Promise<MessageDeliveryResult> {
    try {
      const blocks = this.buildWeddingMessageBlocks(message);

      const result = await this.circuitBreaker.execute(async () => {
        await this.rateLimiter.checkLimit(`send_message_${channelId}`);
        return await this.client.chat.postMessage({
          channel: channelId,
          text: message.content,
          blocks,
          thread_ts: threadTs,
          username: 'WedSync Bot',
          icon_emoji: ':wedding:',
        });
      });

      if (!result.ok) {
        throw new Error(`Failed to send message: ${result.error}`);
      }

      this.logger.info('Wedding message sent to Slack', {
        channelId,
        messageType: message.type,
        messageId: result.ts,
        weddingId: message.weddingId,
      });

      return {
        success: true,
        messageId: result.ts || '',
        deliveredAt: new Date(),
        platform: 'slack',
        channelId,
        metadata: {
          threadTs: result.ts,
          permalink: `https://${this.config.teamId}.slack.com/archives/${channelId}/p${result.ts?.replace('.', '')}`,
        },
      };
    } catch (error) {
      this.logger.error('Failed to send wedding message to Slack', {
        error,
        channelId,
        messageType: message.type,
        weddingId: message.weddingId,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        platform: 'slack',
        channelId,
        attemptedAt: new Date(),
      };
    }
  }

  /**
   * Send emergency wedding alert with high visibility
   */
  async sendEmergencyAlert(
    channelId: string,
    message: WeddingMessage,
    alertLevel: 'critical' | 'high' | 'medium' = 'high',
  ): Promise<MessageDeliveryResult> {
    try {
      const urgencyEmoji =
        alertLevel === 'critical' ? '🚨' : alertLevel === 'high' ? '⚠️' : '🔔';
      const alertText = `${urgencyEmoji} WEDDING EMERGENCY ALERT ${urgencyEmoji}`;

      const blocks = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${alertText}*\n\n*Wedding:* ${message.weddingId}\n*Alert Level:* ${alertLevel.toUpperCase()}\n*Time:* <!date^${Math.floor(Date.now() / 1000)}^{date_pretty} at {time}|${new Date().toISOString()}>`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Message:*\n${message.content}`,
          },
        },
      ];

      if (message.metadata?.actionRequired) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Action Required:* ${message.metadata.actionRequired}`,
          },
        });
      }

      const result = await this.circuitBreaker.execute(async () => {
        await this.rateLimiter.checkLimit(`emergency_alert_${channelId}`);
        return await this.client.chat.postMessage({
          channel: channelId,
          text: `${alertText}: ${message.content}`,
          blocks,
          username: 'WedSync Emergency Bot',
          icon_emoji: '🚨',
        });
      });

      if (!result.ok) {
        throw new Error(`Failed to send emergency alert: ${result.error}`);
      }

      // For critical alerts, also pin the message
      if (alertLevel === 'critical') {
        await this.circuitBreaker.execute(async () => {
          return await this.client.pins.add({
            channel: channelId,
            timestamp: result.ts!,
          });
        });
      }

      this.logger.warn('Emergency alert sent to Slack', {
        channelId,
        alertLevel,
        messageId: result.ts,
        weddingId: message.weddingId,
      });

      return {
        success: true,
        messageId: result.ts || '',
        deliveredAt: new Date(),
        platform: 'slack',
        channelId,
        metadata: {
          alertLevel,
          pinned: alertLevel === 'critical',
          threadTs: result.ts,
        },
      };
    } catch (error) {
      this.logger.error('Failed to send emergency alert to Slack', {
        error,
        channelId,
        alertLevel,
        weddingId: message.weddingId,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        platform: 'slack',
        channelId,
        attemptedAt: new Date(),
      };
    }
  }

  /**
   * Get channel members
   */
  async getChannelMembers(channelId: string): Promise<SlackUser[]> {
    try {
      const result = await this.circuitBreaker.execute(async () => {
        await this.rateLimiter.checkLimit(`get_members_${channelId}`);
        return await this.client.conversations.members({
          channel: channelId,
        });
      });

      if (!result.ok || !result.members) {
        throw new Error(`Failed to get channel members: ${result.error}`);
      }

      // Get user info for each member
      const users: SlackUser[] = [];
      for (const memberId of result.members) {
        try {
          const userResult = await this.circuitBreaker.execute(async () => {
            await this.rateLimiter.checkLimit(`get_user_${memberId}`);
            return await this.client.users.info({ user: memberId });
          });

          if (userResult.ok && userResult.user) {
            users.push(userResult.user as SlackUser);
          }
        } catch (error) {
          this.logger.warn('Failed to get user info', { memberId, error });
        }
      }

      return users;
    } catch (error) {
      this.logger.error('Failed to get channel members', { channelId, error });
      throw error;
    }
  }

  /**
   * Add wedding team members to channel
   */
  async addTeamMembersToChannel(
    channelId: string,
    teamMembers: WeddingTeamMember[],
  ): Promise<void> {
    try {
      for (const member of teamMembers) {
        // Find user by email
        const userResult = await this.circuitBreaker.execute(async () => {
          await this.rateLimiter.checkLimit(`find_user_${member.email}`);
          return await this.client.users.lookupByEmail({
            email: member.email,
          });
        });

        if (userResult.ok && userResult.user) {
          // Add user to channel
          await this.circuitBreaker.execute(async () => {
            await this.rateLimiter.checkLimit(
              `invite_user_${channelId}_${userResult.user!.id}`,
            );
            return await this.client.conversations.invite({
              channel: channelId,
              users: userResult.user!.id!,
            });
          });

          this.logger.info('Team member added to wedding channel', {
            channelId,
            userId: userResult.user.id,
            memberRole: member.role,
          });
        } else {
          this.logger.warn('Could not find Slack user for team member', {
            email: member.email,
            role: member.role,
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed to add team members to channel', {
        channelId,
        error,
      });
      throw error;
    }
  }

  /**
   * Build rich message blocks for wedding notifications
   */
  private buildWeddingMessageBlocks(
    message: WeddingMessage,
  ): (KnownBlock | Block)[] {
    const blocks: (KnownBlock | Block)[] = [];

    // Header block
    if (message.type === 'urgent') {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🚨 *URGENT: Wedding Update*`,
        },
      });
    } else {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `💍 *Wedding Notification*`,
        },
      });
    }

    // Main content
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: message.content,
      },
    });

    // Wedding details
    if (message.weddingId) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Wedding ID: ${message.weddingId} | Type: ${message.type} | Priority: ${message.priority}`,
          },
        ],
      });
    }

    // Action buttons if metadata includes actions
    if (message.metadata?.actions && Array.isArray(message.metadata.actions)) {
      const actions = message.metadata.actions.slice(0, 5); // Slack limit
      blocks.push({
        type: 'actions',
        elements: actions.map((action: any) => ({
          type: 'button',
          text: {
            type: 'plain_text',
            text: action.label,
          },
          value: action.value,
          action_id: action.actionId,
        })),
      });
    }

    return blocks;
  }

  /**
   * Archive wedding channel after wedding completion
   */
  async archiveWeddingChannel(channelId: string): Promise<void> {
    try {
      await this.circuitBreaker.execute(async () => {
        await this.rateLimiter.checkLimit(`archive_${channelId}`);
        return await this.client.conversations.archive({
          channel: channelId,
        });
      });

      this.logger.info('Wedding channel archived', { channelId });
    } catch (error) {
      this.logger.error('Failed to archive wedding channel', {
        channelId,
        error,
      });
      throw error;
    }
  }

  /**
   * Get message history for a channel
   */
  async getChannelHistory(
    channelId: string,
    options?: {
      latest?: string;
      oldest?: string;
      limit?: number;
    },
  ): Promise<SlackMessage[]> {
    try {
      const result = await this.circuitBreaker.execute(async () => {
        await this.rateLimiter.checkLimit(`history_${channelId}`);
        return await this.client.conversations.history({
          channel: channelId,
          latest: options?.latest,
          oldest: options?.oldest,
          limit: options?.limit || 100,
        });
      });

      if (!result.ok || !result.messages) {
        throw new Error(`Failed to get channel history: ${result.error}`);
      }

      return result.messages as SlackMessage[];
    } catch (error) {
      this.logger.error('Failed to get channel history', { channelId, error });
      throw error;
    }
  }

  /**
   * Update channel topic for wedding status changes
   */
  async updateWeddingChannelTopic(
    channelId: string,
    weddingData: {
      coupleName: string;
      weddingDate: string;
      venue?: string;
      status: string;
      daysUntilWedding?: number;
    },
  ): Promise<void> {
    try {
      const statusEmoji =
        weddingData.status === 'completed'
          ? '✅'
          : weddingData.daysUntilWedding && weddingData.daysUntilWedding <= 7
            ? '⏰'
            : '📅';

      const topic = `${statusEmoji} ${weddingData.coupleName} - ${weddingData.weddingDate}${weddingData.venue ? ` at ${weddingData.venue}` : ''} | Status: ${weddingData.status}${weddingData.daysUntilWedding ? ` | ${weddingData.daysUntilWedding} days to go` : ''}`;

      await this.circuitBreaker.execute(async () => {
        await this.rateLimiter.checkLimit(`update_topic_${channelId}`);
        return await this.client.conversations.setTopic({
          channel: channelId,
          topic,
        });
      });

      this.logger.info('Wedding channel topic updated', {
        channelId,
        status: weddingData.status,
        daysUntilWedding: weddingData.daysUntilWedding,
      });
    } catch (error) {
      this.logger.error('Failed to update channel topic', {
        channelId,
        error,
      });
      throw error;
    }
  }
}
