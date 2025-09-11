import {
  describe,
  expect,
  it,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { NotificationIntegrationOrchestrator } from '../../lib/integrations/NotificationIntegrationOrchestrator';
import type {
  NotificationIntegrationConfig,
  IntegrationConnector,
  WeddingNotificationRequest,
  NotificationDeliveryResult,
} from '../../types/integration-types';

// Mock integrations
const mockHubSpotConnector: jest.Mocked<IntegrationConnector> = {
  platform: 'hubspot',
  name: 'Mock HubSpot Connector',
  version: '1.0.0',
  testConnection: jest.fn(),
  initialize: jest.fn(),
  sendNotification: jest.fn(),
  getNotificationStatus: jest.fn(),
  batchSendNotifications: jest.fn(),
  cleanup: jest.fn(),
  getConfig: jest.fn(),
};

const mockSlackConnector: jest.Mocked<IntegrationConnector> = {
  platform: 'slack',
  name: 'Mock Slack Connector',
  version: '1.0.0',
  testConnection: jest.fn(),
  initialize: jest.fn(),
  sendNotification: jest.fn(),
  getNotificationStatus: jest.fn(),
  batchSendNotifications: jest.fn(),
  cleanup: jest.fn(),
  getConfig: jest.fn(),
};

describe('NotificationIntegrationOrchestrator', () => {
  let orchestrator: NotificationIntegrationOrchestrator;
  let config: NotificationIntegrationConfig;

  beforeEach(() => {
    config = {
      enabledPlatforms: ['hubspot', 'slack'],
      defaultPlatform: 'hubspot',
      enableBatching: true,
      batchSize: 10,
      batchTimeout: 5000,
      retryPolicy: {
        maxRetries: 3,
        backoffMultiplier: 2,
        baseDelay: 1000,
      },
      rateLimiting: {
        enabled: true,
        requestsPerSecond: 10,
        burstSize: 20,
      },
      healthChecks: {
        enabled: true,
        interval: 60000,
        timeout: 30000,
      },
    };

    orchestrator = NotificationIntegrationOrchestrator.getInstance();

    // Reset mocks
    jest.clearAllMocks();

    // Setup mock return values
    mockHubSpotConnector.testConnection.mockResolvedValue(true);
    mockSlackConnector.testConnection.mockResolvedValue(true);
  });

  afterEach(() => {
    // Clean up singleton instance for next test
    (NotificationIntegrationOrchestrator as any).instance = null;
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid config', async () => {
      await expect(orchestrator.initialize(config)).resolves.not.toThrow();
      expect(orchestrator.isHealthy()).toBe(true);
    });

    it('should register integration connectors', async () => {
      await orchestrator.initialize(config);

      orchestrator.registerIntegration('hubspot', mockHubSpotConnector);
      orchestrator.registerIntegration('slack', mockSlackConnector);

      expect(orchestrator.getRegisteredPlatforms()).toContain('hubspot');
      expect(orchestrator.getRegisteredPlatforms()).toContain('slack');
    });

    it('should fail initialization with invalid config', async () => {
      const invalidConfig = {
        ...config,
        batchSize: -1, // Invalid batch size
      };

      await expect(orchestrator.initialize(invalidConfig)).rejects.toThrow();
    });

    it('should enforce singleton pattern', () => {
      const instance1 = NotificationIntegrationOrchestrator.getInstance();
      const instance2 = NotificationIntegrationOrchestrator.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('Wedding Notification Processing', () => {
    beforeEach(async () => {
      await orchestrator.initialize(config);
      orchestrator.registerIntegration('hubspot', mockHubSpotConnector);
      orchestrator.registerIntegration('slack', mockSlackConnector);
    });

    it('should send wedding notification to single platform', async () => {
      const weddingNotification: WeddingNotificationRequest = {
        weddingId: 'wedding-123',
        supplierId: 'supplier-456',
        type: 'booking_confirmed',
        priority: 'high',
        platforms: ['hubspot'],
        data: {
          coupleName: 'John & Jane Doe',
          weddingDate: '2024-06-15',
          venue: 'Grand Hotel',
          bookingValue: 5000,
          photographer: {
            name: 'Amazing Photography',
            email: 'contact@amazingphoto.com',
            phone: '+1234567890',
          },
        },
        scheduledFor: new Date(),
        metadata: {
          urgencyLevel: 'high',
          requiresAcknowledgment: true,
          source: 'wedsync_platform',
        },
      };

      const expectedResult: NotificationDeliveryResult = {
        success: true,
        notificationId: 'notif-789',
        platform: 'hubspot',
        deliveredAt: new Date(),
        metadata: {},
      };

      mockHubSpotConnector.sendNotification.mockResolvedValue(expectedResult);

      const result =
        await orchestrator.sendWeddingNotification(weddingNotification);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].platform).toBe('hubspot');
      expect(mockHubSpotConnector.sendNotification).toHaveBeenCalledWith(
        weddingNotification.weddingId,
        expect.objectContaining({
          type: 'booking_confirmed',
          priority: 'high',
        }),
      );
    });

    it('should send wedding notification to multiple platforms', async () => {
      const weddingNotification: WeddingNotificationRequest = {
        weddingId: 'wedding-123',
        supplierId: 'supplier-456',
        type: 'payment_received',
        priority: 'medium',
        platforms: ['hubspot', 'slack'],
        data: {
          coupleName: 'Sarah & Mike Smith',
          weddingDate: '2024-08-20',
          paymentAmount: 2500,
          paymentMethod: 'credit_card',
          balanceRemaining: 2500,
        },
        scheduledFor: new Date(),
        metadata: {
          urgencyLevel: 'medium',
          requiresAcknowledgment: false,
        },
      };

      const hubspotResult: NotificationDeliveryResult = {
        success: true,
        notificationId: 'hubspot-notif-123',
        platform: 'hubspot',
        deliveredAt: new Date(),
      };

      const slackResult: NotificationDeliveryResult = {
        success: true,
        notificationId: 'slack-notif-456',
        platform: 'slack',
        deliveredAt: new Date(),
      };

      mockHubSpotConnector.sendNotification.mockResolvedValue(hubspotResult);
      mockSlackConnector.sendNotification.mockResolvedValue(slackResult);

      const result =
        await orchestrator.sendWeddingNotification(weddingNotification);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(mockHubSpotConnector.sendNotification).toHaveBeenCalled();
      expect(mockSlackConnector.sendNotification).toHaveBeenCalled();
    });

    it('should handle platform failures gracefully', async () => {
      const weddingNotification: WeddingNotificationRequest = {
        weddingId: 'wedding-123',
        supplierId: 'supplier-456',
        type: 'venue_changed',
        priority: 'critical',
        platforms: ['hubspot', 'slack'],
        data: {
          coupleName: 'Emily & David Wilson',
          weddingDate: '2024-05-10',
          oldVenue: 'Beach Resort',
          newVenue: 'Mountain Lodge',
          reason: 'Weather concerns',
        },
        scheduledFor: new Date(),
        metadata: {
          urgencyLevel: 'critical',
          requiresAcknowledgment: true,
        },
      };

      const hubspotResult: NotificationDeliveryResult = {
        success: true,
        notificationId: 'hubspot-notif-123',
        platform: 'hubspot',
        deliveredAt: new Date(),
      };

      const slackError: NotificationDeliveryResult = {
        success: false,
        platform: 'slack',
        error: 'Rate limit exceeded',
        attemptedAt: new Date(),
      };

      mockHubSpotConnector.sendNotification.mockResolvedValue(hubspotResult);
      mockSlackConnector.sendNotification.mockResolvedValue(slackError);

      const result =
        await orchestrator.sendWeddingNotification(weddingNotification);

      expect(result.success).toBe(false); // Overall failed because one platform failed
      expect(result.results).toHaveLength(2);
      expect(
        result.results.find((r) => r.platform === 'hubspot')?.success,
      ).toBe(true);
      expect(result.results.find((r) => r.platform === 'slack')?.success).toBe(
        false,
      );
    });

    it('should apply wedding-specific urgency calculation', async () => {
      const weddingNotification: WeddingNotificationRequest = {
        weddingId: 'wedding-123',
        supplierId: 'supplier-456',
        type: 'timeline_update',
        priority: 'medium',
        platforms: ['hubspot'],
        data: {
          coupleName: 'Anna & Chris Brown',
          weddingDate: new Date(
            Date.now() + 2 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 2 days from now
          timelineChanges: [
            { event: 'Hair & Makeup', oldTime: '09:00', newTime: '08:30' },
            { event: 'Photography', oldTime: '10:00', newTime: '09:30' },
          ],
        },
        scheduledFor: new Date(),
        metadata: {
          urgencyLevel: 'medium',
        },
      };

      mockHubSpotConnector.sendNotification.mockImplementation(
        async (weddingId, notification) => {
          // Verify that urgency was escalated for wedding close to date
          expect(notification.priority).toBe('high'); // Should be escalated from medium to high
          return {
            success: true,
            notificationId: 'notif-789',
            platform: 'hubspot',
            deliveredAt: new Date(),
          };
        },
      );

      await orchestrator.sendWeddingNotification(weddingNotification);
      expect(mockHubSpotConnector.sendNotification).toHaveBeenCalled();
    });
  });

  describe('Batch Processing', () => {
    beforeEach(async () => {
      const batchConfig = {
        ...config,
        enableBatching: true,
        batchSize: 3,
        batchTimeout: 1000,
      };

      await orchestrator.initialize(batchConfig);
      orchestrator.registerIntegration('hubspot', mockHubSpotConnector);
    });

    it('should batch multiple notifications', async () => {
      const notifications: WeddingNotificationRequest[] = [
        {
          weddingId: 'wedding-1',
          supplierId: 'supplier-1',
          type: 'booking_confirmed',
          priority: 'medium',
          platforms: ['hubspot'],
          data: { coupleName: 'Couple 1', weddingDate: '2024-06-01' },
          scheduledFor: new Date(),
        },
        {
          weddingId: 'wedding-2',
          supplierId: 'supplier-2',
          type: 'booking_confirmed',
          priority: 'medium',
          platforms: ['hubspot'],
          data: { coupleName: 'Couple 2', weddingDate: '2024-06-02' },
          scheduledFor: new Date(),
        },
      ];

      mockHubSpotConnector.batchSendNotifications.mockResolvedValue([
        {
          success: true,
          notificationId: 'batch-1',
          platform: 'hubspot',
          deliveredAt: new Date(),
        },
        {
          success: true,
          notificationId: 'batch-2',
          platform: 'hubspot',
          deliveredAt: new Date(),
        },
      ]);

      const results = await Promise.all(
        notifications.map((n) => orchestrator.sendWeddingNotification(n)),
      );

      // Wait for batch processing
      await new Promise((resolve) => setTimeout(resolve, 1100));

      expect(results.every((r) => r.success)).toBe(true);
    });
  });

  describe('Wedding Emergency Protocols', () => {
    beforeEach(async () => {
      await orchestrator.initialize(config);
      orchestrator.registerIntegration('hubspot', mockHubSpotConnector);
      orchestrator.registerIntegration('slack', mockSlackConnector);
    });

    it('should handle wedding day emergencies with maximum priority', async () => {
      const emergencyNotification: WeddingNotificationRequest = {
        weddingId: 'wedding-emergency',
        supplierId: 'supplier-456',
        type: 'emergency_alert',
        priority: 'critical',
        platforms: ['hubspot', 'slack'],
        data: {
          coupleName: 'Jessica & Robert Taylor',
          weddingDate: new Date().toISOString(), // Today (wedding day)
          emergency: {
            type: 'photographer_no_show',
            description:
              'Primary photographer has not arrived 30 minutes before scheduled start',
            contactAttempts: 3,
            backupRequired: true,
          },
        },
        scheduledFor: new Date(),
        metadata: {
          urgencyLevel: 'critical',
          requiresAcknowledgment: true,
          emergencyProtocol: true,
        },
      };

      const hubspotResult: NotificationDeliveryResult = {
        success: true,
        notificationId: 'emergency-hubspot-123',
        platform: 'hubspot',
        deliveredAt: new Date(),
        metadata: { emergencyProcessed: true },
      };

      const slackResult: NotificationDeliveryResult = {
        success: true,
        notificationId: 'emergency-slack-456',
        platform: 'slack',
        deliveredAt: new Date(),
        metadata: { alertLevel: 'critical' },
      };

      mockHubSpotConnector.sendNotification.mockResolvedValue(hubspotResult);
      mockSlackConnector.sendNotification.mockResolvedValue(slackResult);

      const result = await orchestrator.sendWeddingNotification(
        emergencyNotification,
      );

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(mockHubSpotConnector.sendNotification).toHaveBeenCalledWith(
        'wedding-emergency',
        expect.objectContaining({
          type: 'emergency_alert',
          priority: 'critical',
        }),
      );
      expect(mockSlackConnector.sendNotification).toHaveBeenCalledWith(
        'wedding-emergency',
        expect.objectContaining({
          type: 'emergency_alert',
          priority: 'critical',
        }),
      );
    });

    it('should escalate notifications for weddings within 7 days', async () => {
      const urgentNotification: WeddingNotificationRequest = {
        weddingId: 'wedding-urgent',
        supplierId: 'supplier-789',
        type: 'vendor_cancellation',
        priority: 'medium',
        platforms: ['hubspot'],
        data: {
          coupleName: 'Lisa & Mark Johnson',
          weddingDate: new Date(
            Date.now() + 5 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 5 days from now
          cancelledVendor: {
            type: 'florist',
            name: 'Beautiful Blooms',
            reason: 'Supply chain issues',
          },
        },
        scheduledFor: new Date(),
        metadata: {
          urgencyLevel: 'medium',
        },
      };

      mockHubSpotConnector.sendNotification.mockImplementation(
        async (weddingId, notification) => {
          // Should be escalated to high priority due to proximity to wedding date
          expect(notification.priority).toBe('high');
          return {
            success: true,
            notificationId: 'urgent-notif',
            platform: 'hubspot',
            deliveredAt: new Date(),
          };
        },
      );

      await orchestrator.sendWeddingNotification(urgentNotification);
      expect(mockHubSpotConnector.sendNotification).toHaveBeenCalled();
    });
  });

  describe('Health Monitoring', () => {
    beforeEach(async () => {
      await orchestrator.initialize(config);
      orchestrator.registerIntegration('hubspot', mockHubSpotConnector);
    });

    it('should perform health checks on registered integrations', async () => {
      mockHubSpotConnector.testConnection.mockResolvedValue(true);

      const healthStatus = await orchestrator.getHealthStatus();

      expect(healthStatus.isHealthy).toBe(true);
      expect(healthStatus.integrations).toHaveProperty('hubspot');
      expect(healthStatus.integrations.hubspot.isHealthy).toBe(true);
    });

    it('should detect unhealthy integrations', async () => {
      mockHubSpotConnector.testConnection.mockResolvedValue(false);

      const healthStatus = await orchestrator.getHealthStatus();

      expect(healthStatus.isHealthy).toBe(false);
      expect(healthStatus.integrations.hubspot.isHealthy).toBe(false);
    });

    it('should provide detailed metrics', () => {
      const metrics = orchestrator.getMetrics();

      expect(metrics).toHaveProperty('totalNotificationsSent');
      expect(metrics).toHaveProperty('successRate');
      expect(metrics).toHaveProperty('averageDeliveryTime');
      expect(metrics).toHaveProperty('platformMetrics');
      expect(metrics).toHaveProperty('weddingMetrics');
    });
  });

  describe('Error Handling and Resilience', () => {
    beforeEach(async () => {
      await orchestrator.initialize(config);
      orchestrator.registerIntegration('hubspot', mockHubSpotConnector);
    });

    it('should retry failed notifications according to retry policy', async () => {
      const weddingNotification: WeddingNotificationRequest = {
        weddingId: 'wedding-retry',
        supplierId: 'supplier-456',
        type: 'booking_confirmed',
        priority: 'medium',
        platforms: ['hubspot'],
        data: {
          coupleName: 'Test Couple',
          weddingDate: '2024-07-15',
        },
        scheduledFor: new Date(),
      };

      // First two calls fail, third succeeds
      mockHubSpotConnector.sendNotification
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          success: true,
          notificationId: 'retry-success',
          platform: 'hubspot',
          deliveredAt: new Date(),
        });

      const result =
        await orchestrator.sendWeddingNotification(weddingNotification);

      expect(result.success).toBe(true);
      expect(mockHubSpotConnector.sendNotification).toHaveBeenCalledTimes(3);
    });

    it('should handle complete platform failure', async () => {
      const weddingNotification: WeddingNotificationRequest = {
        weddingId: 'wedding-fail',
        supplierId: 'supplier-456',
        type: 'booking_confirmed',
        priority: 'medium',
        platforms: ['hubspot'],
        data: {
          coupleName: 'Test Couple',
          weddingDate: '2024-07-15',
        },
        scheduledFor: new Date(),
      };

      mockHubSpotConnector.sendNotification.mockRejectedValue(
        new Error('Platform down'),
      );

      const result =
        await orchestrator.sendWeddingNotification(weddingNotification);

      expect(result.success).toBe(false);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toBe('Platform down');
    });
  });

  describe('Configuration Management', () => {
    it('should validate configuration on initialization', async () => {
      const invalidConfigs = [
        { ...config, batchSize: 0 },
        { ...config, retryPolicy: { ...config.retryPolicy, maxRetries: -1 } },
        {
          ...config,
          rateLimiting: { ...config.rateLimiting, requestsPerSecond: 0 },
        },
      ];

      for (const invalidConfig of invalidConfigs) {
        await expect(orchestrator.initialize(invalidConfig)).rejects.toThrow();
      }
    });

    it('should update configuration at runtime', async () => {
      await orchestrator.initialize(config);

      const newConfig = {
        ...config,
        batchSize: 20,
      };

      await orchestrator.updateConfig(newConfig);

      const currentConfig = orchestrator.getConfig();
      expect(currentConfig.batchSize).toBe(20);
    });
  });
});
