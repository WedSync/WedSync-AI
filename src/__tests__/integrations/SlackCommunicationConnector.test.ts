import {
  describe,
  expect,
  it,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { SlackCommunicationConnector } from '../../services/integrations/communication/SlackCommunicationConnector';
import type {
  SlackConnectorConfig,
  WeddingMessage,
  WeddingTeamMember,
  MessageDeliveryResult,
} from '../../types/communication-integration-types';

// Mock Slack Web API
jest.mock('@slack/web-api');

const mockSlackClient = {
  auth: {
    test: jest.fn(),
  },
  conversations: {
    create: jest.fn(),
    list: jest.fn(),
    members: jest.fn(),
    setTopic: jest.fn(),
    archive: jest.fn(),
    invite: jest.fn(),
    history: jest.fn(),
  },
  chat: {
    postMessage: jest.fn(),
  },
  users: {
    info: jest.fn(),
    lookupByEmail: jest.fn(),
  },
  pins: {
    add: jest.fn(),
  },
};

describe('SlackCommunicationConnector', () => {
  let connector: SlackCommunicationConnector;
  let config: SlackConnectorConfig;

  beforeEach(() => {
    config = {
      platform: 'slack',
      enabled: true,
      accessToken: 'xoxb-test-token',
      teamId: 'T1234567890',
      userId: 'U1234567890',
      scopes: ['chat:write', 'channels:manage', 'users:read'],
      webhookUrl: 'https://hooks.slack.com/test',
      defaultChannelPrefix: 'wedding-',
      emergencyChannelId: 'C-EMERGENCY',
      adminChannelId: 'C-ADMIN',
      rateLimits: {
        requestsPerSecond: 1,
        burstCapacity: 5,
        dailyLimit: 10000,
      },
      retryPolicy: {
        maxRetries: 3,
        backoffMultiplier: 2,
        baseDelay: 1000,
      },
    };

    connector = new SlackCommunicationConnector(config);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Connection and Authentication', () => {
    it('should test connection successfully', async () => {
      mockSlackClient.auth.test.mockResolvedValue({
        ok: true,
        team: 'WedSync Team',
        user: 'wedsync-bot',
        url: 'https://wedsync.slack.com/',
      });

      const isConnected = await connector.testConnection();

      expect(isConnected).toBe(true);
      expect(mockSlackClient.auth.test).toHaveBeenCalled();
    });

    it('should handle connection failure', async () => {
      mockSlackClient.auth.test.mockResolvedValue({
        ok: false,
        error: 'invalid_auth',
      });

      const isConnected = await connector.testConnection();

      expect(isConnected).toBe(false);
    });

    it('should handle authentication errors', async () => {
      mockSlackClient.auth.test.mockRejectedValue(
        new Error('Authentication failed'),
      );

      const isConnected = await connector.testConnection();

      expect(isConnected).toBe(false);
    });
  });

  describe('Wedding Channel Management', () => {
    it('should initialize wedding integration with channel creation', async () => {
      const weddingData = {
        coupleName: 'John & Jane Doe',
        weddingDate: '2024-06-15',
        venue: 'Grand Hotel Ballroom',
        teamMembers: [
          {
            name: 'Sarah Johnson',
            email: 'sarah@amazingphoto.com',
            role: 'Lead Photographer',
            phone: '+1234567890',
          },
          {
            name: 'Mike Wilson',
            email: 'mike@weddingplanning.com',
            role: 'Wedding Planner',
            phone: '+1234567891',
          },
        ] as WeddingTeamMember[],
      };

      mockSlackClient.conversations.create.mockResolvedValue({
        ok: true,
        channel: {
          id: 'C-WEDDING123',
          name: 'wedding-john-jane-doe-abcd1234',
          is_private: false,
        },
      });

      mockSlackClient.conversations.setTopic.mockResolvedValue({
        ok: true,
      });

      mockSlackClient.users.lookupByEmail
        .mockResolvedValueOnce({
          ok: true,
          user: { id: 'U-SARAH123', name: 'sarah' },
        })
        .mockResolvedValueOnce({
          ok: true,
          user: { id: 'U-MIKE456', name: 'mike' },
        });

      mockSlackClient.conversations.invite.mockResolvedValue({
        ok: true,
      });

      mockSlackClient.chat.postMessage.mockResolvedValue({
        ok: true,
        ts: '1234567890.123456',
        channel: 'C-WEDDING123',
      });

      await connector.initialize('wedding-123', weddingData);

      expect(mockSlackClient.conversations.create).toHaveBeenCalledWith({
        name: expect.stringContaining('wedding-john-jane-doe'),
        is_private: false,
      });

      expect(mockSlackClient.conversations.setTopic).toHaveBeenCalledWith({
        channel: 'C-WEDDING123',
        topic: expect.stringContaining(
          'John & Jane Doe - 2024-06-15 at Grand Hotel Ballroom',
        ),
      });

      expect(mockSlackClient.conversations.invite).toHaveBeenCalledTimes(2);
      expect(mockSlackClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'C-WEDDING123',
          text: expect.stringContaining('Welcome to the coordination channel'),
          username: 'WedSync Bot',
          icon_emoji: ':wedding:',
        }),
      );
    });

    it('should get wedding channels for a specific wedding', async () => {
      mockSlackClient.conversations.list.mockResolvedValue({
        ok: true,
        channels: [
          {
            id: 'C-WEDDING123',
            name: 'wedding-couple-abcd1234',
            is_private: false,
            is_archived: false,
            num_members: 5,
            purpose: {
              value: 'Wedding coordination for Couple Name - 2024-06-15',
              creator: 'U123',
              last_set: 1640995200,
            },
          },
          {
            id: 'C-OTHER456',
            name: 'general',
            is_private: false,
            is_archived: false,
            num_members: 50,
            purpose: {
              value: 'General discussion',
              creator: 'U456',
              last_set: 1640995200,
            },
          },
        ],
      });

      mockSlackClient.conversations.members.mockResolvedValue({
        ok: true,
        members: ['U123', 'U456', 'U789'],
      });

      mockSlackClient.users.info
        .mockResolvedValueOnce({
          ok: true,
          user: {
            id: 'U123',
            name: 'john',
            real_name: 'John Doe',
            profile: { email: 'john@example.com', title: 'Groom' },
          },
        })
        .mockResolvedValueOnce({
          ok: true,
          user: {
            id: 'U456',
            name: 'jane',
            real_name: 'Jane Doe',
            profile: { email: 'jane@example.com', title: 'Bride' },
          },
        })
        .mockResolvedValueOnce({
          ok: true,
          user: {
            id: 'U789',
            name: 'photographer',
            real_name: 'Amazing Photographer',
            profile: { email: 'photo@example.com', title: 'Photographer' },
          },
        });

      const weddingChannels =
        await connector.getWeddingChannels('wedding-abcd1234');

      expect(weddingChannels).toHaveLength(1);
      expect(weddingChannels[0]).toEqual(
        expect.objectContaining({
          channelId: 'C-WEDDING123',
          name: 'wedding-couple-abcd1234',
          type: 'public',
          platform: 'slack',
          memberCount: 5,
          isActive: true,
        }),
      );
    });
  });

  describe('Wedding Message Delivery', () => {
    beforeEach(async () => {
      // Setup initialized connector with wedding channel
      await connector.initialize('wedding-123', {
        coupleName: 'Test Couple',
        weddingDate: '2024-06-15',
        venue: 'Test Venue',
        teamMembers: [],
      });
    });

    it('should send regular wedding message', async () => {
      const weddingMessage: WeddingMessage = {
        weddingId: 'wedding-123',
        type: 'update',
        priority: 'medium',
        content: 'Timeline updated: Photography session moved to 2:00 PM',
        timestamp: new Date(),
        metadata: {
          source: 'wedsync_platform',
          updateType: 'timeline_change',
        },
      };

      mockSlackClient.chat.postMessage.mockResolvedValue({
        ok: true,
        ts: '1234567890.123456',
        channel: 'C-WEDDING123',
      });

      const result = await connector.sendMessage('wedding-123', weddingMessage);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('1234567890.123456');
      expect(result.platform).toBe('slack');
      expect(mockSlackClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: expect.any(String),
          text: 'Timeline updated: Photography session moved to 2:00 PM',
          blocks: expect.any(Array),
          username: 'WedSync Bot',
          icon_emoji: ':wedding:',
        }),
      );
    });

    it('should send urgent wedding message with emergency formatting', async () => {
      const urgentMessage: WeddingMessage = {
        weddingId: 'wedding-123',
        type: 'urgent',
        priority: 'critical',
        content: 'URGENT: Photographer running 30 minutes late due to traffic',
        timestamp: new Date(),
        metadata: {
          source: 'wedsync_platform',
          requiresAcknowledgment: true,
          actionRequired: 'Contact backup photographer if needed',
        },
      };

      mockSlackClient.chat.postMessage.mockResolvedValue({
        ok: true,
        ts: '1234567890.123456',
        channel: 'C-WEDDING123',
      });

      mockSlackClient.pins.add.mockResolvedValue({
        ok: true,
      });

      const result = await connector.sendMessage('wedding-123', urgentMessage);

      expect(result.success).toBe(true);
      expect(mockSlackClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('🚨 WEDDING EMERGENCY ALERT 🚨'),
          blocks: expect.arrayContaining([
            expect.objectContaining({
              type: 'section',
              text: expect.objectContaining({
                text: expect.stringContaining('WEDDING EMERGENCY ALERT'),
              }),
            }),
          ]),
          username: 'WedSync Emergency Bot',
          icon_emoji: '🚨',
        }),
      );
    });

    it('should handle message delivery failure', async () => {
      const weddingMessage: WeddingMessage = {
        weddingId: 'wedding-123',
        type: 'update',
        priority: 'low',
        content: 'Test message',
        timestamp: new Date(),
      };

      mockSlackClient.chat.postMessage.mockResolvedValue({
        ok: false,
        error: 'channel_not_found',
      });

      const result = await connector.sendMessage('wedding-123', weddingMessage);

      expect(result.success).toBe(false);
      expect(result.error).toContain('channel_not_found');
    });
  });

  describe('Emergency Alert System', () => {
    beforeEach(async () => {
      await connector.initialize('wedding-emergency', {
        coupleName: 'Emergency Test',
        weddingDate: '2024-06-15',
        venue: 'Test Venue',
        teamMembers: [],
      });
    });

    it('should send emergency alert to multiple channels for critical alerts', async () => {
      const emergencyAlert: WeddingMessage = {
        weddingId: 'wedding-emergency',
        type: 'urgent',
        priority: 'critical',
        content:
          'CRITICAL: Venue flooded due to pipe burst - emergency relocation needed',
        timestamp: new Date(),
        metadata: {
          source: 'venue_management',
          emergencyType: 'venue_unavailable',
          requiresAcknowledgment: true,
        },
      };

      mockSlackClient.chat.postMessage
        .mockResolvedValueOnce({
          ok: true,
          ts: '1234567890.123456',
          channel: 'C-WEDDING123',
        })
        .mockResolvedValueOnce({
          ok: true,
          ts: '1234567890.123457',
          channel: 'C-EMERGENCY',
        })
        .mockResolvedValueOnce({
          ok: true,
          ts: '1234567890.123458',
          channel: 'C-ADMIN',
        });

      mockSlackClient.pins.add.mockResolvedValue({
        ok: true,
      });

      const results = await connector.sendEmergencyAlert(
        'wedding-emergency',
        emergencyAlert,
        'critical',
      );

      expect(results).toHaveLength(3); // Wedding channel + Emergency channel + Admin channel
      expect(results.every((r) => r.success)).toBe(true);
      expect(mockSlackClient.chat.postMessage).toHaveBeenCalledTimes(3);
      expect(mockSlackClient.pins.add).toHaveBeenCalledTimes(3); // Critical alerts get pinned
    });

    it('should send high-priority alert to wedding and admin channels only', async () => {
      const highPriorityAlert: WeddingMessage = {
        weddingId: 'wedding-emergency',
        type: 'urgent',
        priority: 'high',
        content:
          'Weather alert: Heavy rain expected during ceremony - backup plan activated',
        timestamp: new Date(),
        metadata: {
          source: 'weather_service',
          alertType: 'weather_warning',
        },
      };

      mockSlackClient.chat.postMessage
        .mockResolvedValueOnce({
          ok: true,
          ts: '1234567890.123456',
          channel: 'C-WEDDING123',
        })
        .mockResolvedValueOnce({
          ok: true,
          ts: '1234567890.123457',
          channel: 'C-ADMIN',
        });

      const results = await connector.sendEmergencyAlert(
        'wedding-emergency',
        highPriorityAlert,
        'high',
      );

      expect(results).toHaveLength(2); // Wedding channel + Admin channel (no emergency channel for high priority)
      expect(results.every((r) => r.success)).toBe(true);
      expect(mockSlackClient.pins.add).not.toHaveBeenCalled(); // High priority doesn't get pinned
    });
  });

  describe('Wedding Status Updates', () => {
    beforeEach(async () => {
      await connector.initialize('wedding-status', {
        coupleName: 'Status Test Couple',
        weddingDate: '2024-06-15',
        venue: 'Test Venue',
        teamMembers: [],
      });
    });

    it('should update wedding status and channel topic', async () => {
      mockSlackClient.conversations.setTopic.mockResolvedValue({
        ok: true,
      });

      mockSlackClient.chat.postMessage.mockResolvedValue({
        ok: true,
        ts: '1234567890.123456',
        channel: 'C-WEDDING123',
      });

      await connector.updateWeddingStatus('wedding-status', 'confirmed', {
        coupleName: 'Status Test Couple',
        weddingDate: '2024-06-15',
        venue: 'Test Venue',
        daysUntilWedding: 30,
      });

      expect(mockSlackClient.conversations.setTopic).toHaveBeenCalledWith({
        channel: expect.any(String),
        topic: expect.stringContaining(
          'Status Test Couple - 2024-06-15 at Test Venue | Status: confirmed | 30 days to go',
        ),
      });

      expect(mockSlackClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Wedding Status Update'),
          blocks: expect.arrayContaining([
            expect.objectContaining({
              type: 'section',
              text: expect.objectContaining({
                text: expect.stringContaining(
                  'Status changed to: **CONFIRMED**',
                ),
              }),
            }),
          ]),
        }),
      );
    });

    it('should archive channel when wedding is completed', async () => {
      mockSlackClient.conversations.setTopic.mockResolvedValue({
        ok: true,
      });

      mockSlackClient.chat.postMessage.mockResolvedValue({
        ok: true,
        ts: '1234567890.123456',
        channel: 'C-WEDDING123',
      });

      mockSlackClient.conversations.archive.mockResolvedValue({
        ok: true,
      });

      await connector.updateWeddingStatus('wedding-status', 'completed', {
        coupleName: 'Status Test Couple',
        weddingDate: '2024-06-15',
        venue: 'Test Venue',
      });

      // Archive happens after a delay, so we need to wait
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockSlackClient.conversations.archive).toHaveBeenCalledWith({
        channel: expect.any(String),
      });
    });
  });

  describe('Message Analytics', () => {
    beforeEach(async () => {
      await connector.initialize('wedding-analytics', {
        coupleName: 'Analytics Test Couple',
        weddingDate: '2024-06-15',
        venue: 'Test Venue',
        teamMembers: [],
      });
    });

    it('should generate comprehensive message analytics', async () => {
      const mockMessages = [
        {
          ts: '1234567890.123456',
          channel: 'C-WEDDING123',
          user: 'U123',
          text: '🚨 URGENT: Timeline change needed',
          thread_ts: undefined,
        },
        {
          ts: '1234567890.123457',
          channel: 'C-WEDDING123',
          user: 'UBOT',
          text: 'Reminder: Final payment due tomorrow',
          username: 'WedSync Bot',
        },
        {
          ts: '1234567890.123458',
          channel: 'C-WEDDING123',
          user: 'U456',
          text: 'Thanks for the update! Looking forward to the big day.',
          thread_ts: undefined,
        },
        {
          ts: '1234567890.123459',
          channel: 'C-WEDDING123',
          user: 'U789',
          text: 'Weather update: Sunny skies expected!',
          thread_ts: undefined,
        },
      ];

      mockSlackClient.conversations.history.mockResolvedValue({
        ok: true,
        messages: mockMessages,
      });

      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      const analytics = await connector.getMessageAnalytics(
        'wedding-analytics',
        timeRange,
      );

      expect(analytics.totalMessages).toBe(4);
      expect(analytics.messagesByType.urgent).toBe(1);
      expect(analytics.messagesByType.reminder).toBe(1);
      expect(analytics.messagesByType.social).toBe(2);
      expect(analytics.messagesByPriority.critical).toBe(1);
      expect(analytics.messagesByPriority.medium).toBe(1);
      expect(analytics.messagesByPriority.low).toBe(2);
      expect(analytics.deliveryRate).toBe(100); // Slack doesn't report delivery failures
      expect(analytics.engagementMetrics.activeUsers).toBe(2); // Excluding bot messages
    });

    it('should generate comprehensive communication analytics', async () => {
      mockSlackClient.conversations.list.mockResolvedValue({
        ok: true,
        channels: [
          {
            id: 'C-WEDDING123',
            name: 'wedding-analytics-test',
            is_private: false,
            is_archived: false,
            num_members: 5,
            purpose: { value: 'Wedding coordination' },
          },
        ],
      });

      mockSlackClient.conversations.members.mockResolvedValue({
        ok: true,
        members: ['U123', 'U456', 'U789'],
      });

      mockSlackClient.users.info.mockResolvedValue({
        ok: true,
        user: { id: 'U123', real_name: 'Test User' },
      });

      mockSlackClient.conversations.history.mockResolvedValue({
        ok: true,
        messages: Array(10).fill({
          ts: '1234567890.123456',
          channel: 'C-WEDDING123',
          user: 'U123',
          text: 'Test message',
        }),
      });

      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      const analytics = await connector.getAnalytics(
        'wedding-analytics',
        timeRange,
      );

      expect(analytics.weddingId).toBe('wedding-analytics');
      expect(analytics.platform).toBe('slack');
      expect(analytics.messageAnalytics).toBeDefined();
      expect(analytics.channelAnalytics).toBeDefined();
      expect(analytics.performanceMetrics).toBeDefined();
      expect(analytics.weddingSpecificMetrics).toBeDefined();

      expect(analytics.channelAnalytics.totalChannels).toBe(1);
      expect(analytics.channelAnalytics.activeChannels).toBe(1);
      expect(analytics.performanceMetrics.averageDeliveryTime).toBe(1); // Slack near-instantaneous
      expect(analytics.performanceMetrics.uptime).toBe(99.9); // Slack SLA
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle Slack API errors gracefully', async () => {
      const weddingMessage: WeddingMessage = {
        weddingId: 'wedding-error',
        type: 'update',
        priority: 'medium',
        content: 'Test message for error handling',
        timestamp: new Date(),
      };

      mockSlackClient.chat.postMessage.mockRejectedValue(
        new Error('Network error'),
      );

      const result = await connector.sendMessage(
        'wedding-error',
        weddingMessage,
        'C-ERROR-CHANNEL',
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(result.platform).toBe('slack');
      expect(result.channelId).toBe('C-ERROR-CHANNEL');
    });

    it('should handle rate limiting with circuit breaker', async () => {
      const weddingMessage: WeddingMessage = {
        weddingId: 'wedding-rate-limit',
        type: 'update',
        priority: 'medium',
        content: 'Rate limit test message',
        timestamp: new Date(),
      };

      // Mock rate limit error followed by success
      mockSlackClient.chat.postMessage
        .mockRejectedValueOnce({ error: 'rate_limited' })
        .mockResolvedValueOnce({
          ok: true,
          ts: '1234567890.123456',
          channel: 'C-WEDDING123',
        });

      const result = await connector.sendMessage(
        'wedding-rate-limit',
        weddingMessage,
        'C-WEDDING123',
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('1234567890.123456');
    });

    it('should handle missing wedding channel gracefully', async () => {
      const weddingMessage: WeddingMessage = {
        weddingId: 'wedding-no-channel',
        type: 'update',
        priority: 'medium',
        content: 'Message for non-existent wedding',
        timestamp: new Date(),
      };

      mockSlackClient.conversations.list.mockResolvedValue({
        ok: true,
        channels: [], // No channels found
      });

      const result = await connector.sendMessage(
        'wedding-no-channel',
        weddingMessage,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('No Slack channel found for wedding');
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should cleanup wedding integration by archiving channel', async () => {
      // First initialize to create channel cache entry
      await connector.initialize('wedding-cleanup', {
        coupleName: 'Cleanup Test',
        weddingDate: '2024-06-15',
        venue: 'Test Venue',
        teamMembers: [],
      });

      mockSlackClient.conversations.archive.mockResolvedValue({
        ok: true,
      });

      await connector.cleanup('wedding-cleanup');

      expect(mockSlackClient.conversations.archive).toHaveBeenCalled();
    });

    it('should handle cleanup for non-existent wedding gracefully', async () => {
      // No error should be thrown for non-existent wedding
      await expect(
        connector.cleanup('non-existent-wedding'),
      ).resolves.not.toThrow();
    });
  });

  describe('Configuration Management', () => {
    it('should return sanitized configuration', () => {
      const sanitizedConfig = connector.getConfig();

      expect(sanitizedConfig.platform).toBe('slack');
      expect(sanitizedConfig.enabled).toBe(true);
      expect(sanitizedConfig.rateLimits).toBeDefined();
      expect(sanitizedConfig.retryPolicy).toBeDefined();

      // Sensitive data should not be exposed
      expect(sanitizedConfig.authConfig.accessToken).toBe('***');
      expect(sanitizedConfig.authConfig.clientSecret).toBe('***');
    });

    it('should validate webhook URL format if provided', () => {
      const invalidConfig = {
        ...config,
        webhookUrl: 'invalid-url',
      };

      expect(() => new SlackCommunicationConnector(invalidConfig)).toThrow();
    });
  });
});
