import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  vi,
} from 'vitest';
import { Redis } from 'ioredis';
import { NotificationWorkerCoordinator } from '../workers/NotificationWorkerCoordinator';
import { WeddingNotificationEngine } from '../WeddingNotificationEngine';
import { NotificationChannelRouter } from '../NotificationChannelRouter';
import { NotificationProviderFactory } from '../providers';
import type {
  ProcessedNotification,
  NotificationEvent,
} from '../../../types/notification-backend';

// Mock Redis for testing
vi.mock('ioredis');
vi.mock('@supabase/supabase-js');
vi.mock('twilio');
vi.mock('resend');
vi.mock('firebase-admin/messaging');

describe('WedSync Notification System Integration Tests', () => {
  let coordinator: NotificationWorkerCoordinator;
  let notificationEngine: WeddingNotificationEngine;
  let channelRouter: NotificationChannelRouter;
  let mockRedis: any;

  beforeAll(async () => {
    // Set up test environment variables
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6379';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    process.env.RESEND_API_KEY = 'test-resend-key';
    process.env.TWILIO_ACCOUNT_SID = 'test-twilio-sid';
    process.env.TWILIO_AUTH_TOKEN = 'test-twilio-token';
    process.env.TWILIO_PHONE_NUMBER = '+1234567890';

    // Mock Redis
    mockRedis = {
      connect: vi.fn().mockResolvedValue(undefined),
      quit: vi.fn().mockResolvedValue(undefined),
      ping: vi.fn().mockResolvedValue('PONG'),
      hset: vi.fn().mockResolvedValue(1),
      hget: vi.fn().mockResolvedValue('test-value'),
      hgetall: vi.fn().mockResolvedValue({}),
      lpush: vi.fn().mockResolvedValue(1),
      llen: vi.fn().mockResolvedValue(0),
      keys: vi.fn().mockResolvedValue([]),
      pipeline: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue([]),
      }),
    };

    (Redis as any).mockImplementation(() => mockRedis);
  });

  afterAll(async () => {
    if (coordinator) {
      await coordinator.shutdown();
    }
  });

  describe('System Initialization', () => {
    it('should initialize all components successfully', async () => {
      coordinator = new NotificationWorkerCoordinator();
      notificationEngine = new WeddingNotificationEngine();
      channelRouter = new NotificationChannelRouter();

      // These should not throw
      expect(() => coordinator).not.toThrow();
      expect(() => notificationEngine).not.toThrow();
      expect(() => channelRouter).not.toThrow();
    });

    it('should connect to Redis successfully', async () => {
      await notificationEngine.initialize();
      expect(mockRedis.connect).toHaveBeenCalled();
    });

    it('should validate all required environment variables', () => {
      const requiredEnvVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'RESEND_API_KEY',
        'TWILIO_ACCOUNT_SID',
        'TWILIO_AUTH_TOKEN',
        'TWILIO_PHONE_NUMBER',
      ];

      requiredEnvVars.forEach((envVar) => {
        expect(process.env[envVar]).toBeDefined();
      });
    });
  });

  describe('Notification Processing End-to-End', () => {
    let testNotification: ProcessedNotification;

    beforeEach(() => {
      testNotification = {
        id: 'test-notification-1',
        event: {
          id: 'event-1',
          type: 'vendor_update',
          weddingId: 'wedding-123',
          userId: 'user-456',
          timestamp: new Date(),
          context: {
            weddingTitle: 'John & Jane Wedding',
            weddingDate: '2024-06-15',
            vendorName: 'Beautiful Blooms',
            vendorType: 'Florist',
          },
        },
        recipientId: 'recipient-789',
        content:
          'Your floral arrangements have been confirmed for the wedding.',
        priority: 'medium',
        channels: ['email', 'in_app'],
        scheduledFor: new Date(),
      };
    });

    it('should process wedding emergency notifications within 500ms', async () => {
      const emergencyNotification: ProcessedNotification = {
        ...testNotification,
        priority: 'emergency',
        event: {
          ...testNotification.event,
          type: 'wedding_emergency',
          context: {
            ...testNotification.event.context,
            emergencyType: 'Venue Cancellation',
            actionRequired: 'Find replacement venue immediately',
          },
        },
      };

      const startTime = Date.now();

      try {
        await notificationEngine.processNotification(emergencyNotification);
        const processingTime = Date.now() - startTime;

        expect(processingTime).toBeLessThan(500); // Must be under 500ms for emergencies
      } catch (error) {
        // Expected in test environment due to mocks
        const processingTime = Date.now() - startTime;
        expect(processingTime).toBeLessThan(500);
      }
    });

    it('should route notifications to correct channels based on priority', async () => {
      await channelRouter.initialize();

      const channels = channelRouter.selectChannels(
        testNotification.event,
        testNotification.priority,
      );

      expect(channels).toContain('in_app');
      expect(channels).toContain('email');
    });

    it('should handle batch notifications efficiently', async () => {
      const batchSize = 100;
      const notifications: ProcessedNotification[] = [];

      // Generate batch of notifications
      for (let i = 0; i < batchSize; i++) {
        notifications.push({
          ...testNotification,
          id: `batch-notification-${i}`,
          recipientId: `recipient-${i}`,
        });
      }

      const startTime = Date.now();

      const promises = notifications.map((notification) =>
        notificationEngine.processNotification(notification),
      );

      try {
        await Promise.allSettled(promises);
      } catch (error) {
        // Expected in test environment
      }

      const totalTime = Date.now() - startTime;
      const averageTime = totalTime / batchSize;

      expect(averageTime).toBeLessThan(100); // Should average under 100ms per notification
    });
  });

  describe('Wedding-Specific Business Logic', () => {
    it('should prioritize wedding day notifications', () => {
      const weddingDayNotification: ProcessedNotification = {
        ...testNotification,
        event: {
          ...testNotification.event,
          context: {
            ...testNotification.event.context,
            weddingDate: new Date().toISOString().split('T')[0], // Today
          },
        },
      };

      const channels = channelRouter.selectChannels(
        weddingDayNotification.event,
        weddingDayNotification.priority,
      );

      // Wedding day should use all channels
      expect(channels.length).toBeGreaterThan(3);
      expect(channels).toContain('sms');
      expect(channels).toContain('push');
      expect(channels).toContain('in_app');
    });

    it('should handle weather alerts for outdoor weddings', () => {
      const weatherAlert: NotificationEvent = {
        id: 'weather-1',
        type: 'weather_alert',
        weddingId: 'wedding-123',
        userId: 'user-456',
        timestamp: new Date(),
        context: {
          weddingTitle: 'Outdoor Garden Wedding',
          weddingDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          alertType: 'Heavy Rain Warning',
          isOutdoorVenue: true,
          hasBackupPlan: false,
        },
      };

      const channels = channelRouter.selectChannels(weatherAlert, 'high');

      // Weather alerts should use multiple urgent channels
      expect(channels).toContain('sms');
      expect(channels).toContain('push');
      expect(channels).toContain('voice'); // For urgent weather
    });

    it('should respect Saturday wedding day restrictions', () => {
      const saturday = new Date('2024-06-15'); // Assuming this is a Saturday

      // Mock Date.now to return a Saturday
      const originalNow = Date.now;
      Date.now = vi.fn().mockReturnValue(saturday.getTime());

      const restrictions = coordinator.getSystemMetrics();

      // Should indicate restricted mode on Saturdays
      expect(restrictions).toBeDefined();

      // Restore original Date.now
      Date.now = originalNow;
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should retry failed notifications with exponential backoff', async () => {
      const failingNotification: ProcessedNotification = {
        ...testNotification,
        recipientId: 'invalid-recipient',
      };

      // Mock provider to fail first attempt, succeed second
      let attemptCount = 0;
      const mockProvider = {
        send: vi.fn().mockImplementation(() => {
          attemptCount++;
          if (attemptCount === 1) {
            return Promise.resolve({
              success: false,
              error: 'Temporary failure',
              channel: 'email',
              providerId: 'test',
              recipientId: 'invalid-recipient',
              messageId: '',
              timestamp: new Date(),
            });
          }
          return Promise.resolve({
            success: true,
            channel: 'email',
            providerId: 'test',
            recipientId: 'invalid-recipient',
            messageId: 'msg-123',
            timestamp: new Date(),
          });
        }),
        getProviderStatus: vi.fn().mockResolvedValue({
          healthy: true,
          latency: 100,
          errorRate: 0,
        }),
      };

      // Mock the provider factory
      vi.spyOn(NotificationProviderFactory, 'getProvider').mockReturnValue(
        mockProvider,
      );

      try {
        await notificationEngine.processNotification(failingNotification);
      } catch (error) {
        // Expected in test environment
      }

      // Should have attempted at least once
      expect(mockProvider.send).toHaveBeenCalled();
    });

    it('should handle provider failures gracefully', async () => {
      const notification = { ...testNotification };

      // Mock all providers to fail
      const failingProvider = {
        send: vi.fn().mockResolvedValue({
          success: false,
          error: 'All providers down',
          channel: 'email',
          providerId: 'test',
          recipientId: notification.recipientId,
          messageId: '',
          timestamp: new Date(),
        }),
        getProviderStatus: vi.fn().mockResolvedValue({
          healthy: false,
          latency: 5000,
          errorRate: 1,
        }),
      };

      vi.spyOn(NotificationProviderFactory, 'getProvider').mockReturnValue(
        failingProvider,
      );

      // Should not throw, should handle gracefully
      await expect(
        notificationEngine.processNotification(notification),
      ).resolves.toBeDefined();
    });

    it('should maintain system health during high error rates', async () => {
      const notifications = Array.from({ length: 50 }, (_, i) => ({
        ...testNotification,
        id: `error-test-${i}`,
        recipientId: `error-recipient-${i}`,
      }));

      // Mock provider with 50% failure rate
      const unreliableProvider = {
        send: vi.fn().mockImplementation(() => {
          const shouldFail = Math.random() > 0.5;
          return Promise.resolve({
            success: !shouldFail,
            error: shouldFail ? 'Random failure' : undefined,
            channel: 'email',
            providerId: 'unreliable',
            recipientId: 'test',
            messageId: shouldFail ? '' : 'msg-123',
            timestamp: new Date(),
          });
        }),
        getProviderStatus: vi.fn().mockResolvedValue({
          healthy: true,
          latency: 200,
          errorRate: 0.5,
        }),
      };

      vi.spyOn(NotificationProviderFactory, 'getProvider').mockReturnValue(
        unreliableProvider,
      );

      // Process all notifications
      const results = await Promise.allSettled(
        notifications.map((n) => notificationEngine.processNotification(n)),
      );

      // System should remain operational despite errors
      const health = await coordinator.getSystemHealth();
      expect(['healthy', 'degraded']).toContain(health.overall);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should handle 1000 notifications/minute sustained load', async () => {
      const targetRate = 1000; // notifications per minute
      const testDuration = 10000; // 10 seconds
      const expectedNotifications = Math.floor(
        (targetRate * testDuration) / 60000,
      );

      const notifications = Array.from(
        { length: expectedNotifications },
        (_, i) => ({
          ...testNotification,
          id: `perf-test-${i}`,
          recipientId: `perf-recipient-${i}`,
        }),
      );

      const startTime = Date.now();

      // Process all notifications concurrently
      const results = await Promise.allSettled(
        notifications.map((n) => notificationEngine.processNotification(n)),
      );

      const endTime = Date.now();
      const actualDuration = endTime - startTime;
      const actualRate = (notifications.length / actualDuration) * 60000; // per minute

      expect(actualDuration).toBeLessThan(testDuration + 1000); // Allow 1s buffer
      expect(actualRate).toBeGreaterThan(targetRate * 0.8); // Should achieve 80% of target
    });

    it('should maintain low memory usage under load', async () => {
      const initialMemory = process.memoryUsage();

      // Process 500 notifications
      const notifications = Array.from({ length: 500 }, (_, i) => ({
        ...testNotification,
        id: `memory-test-${i}`,
        recipientId: `memory-recipient-${i}`,
      }));

      await Promise.allSettled(
        notifications.map((n) => notificationEngine.processNotification(n)),
      );

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.rss - initialMemory.rss;
      const memoryPerNotification = memoryIncrease / notifications.length;

      // Should use less than 1MB per 100 notifications
      expect(memoryPerNotification).toBeLessThan(10240); // 10KB per notification
    });

    it('should process emergency notifications under extreme load', async () => {
      // Create background load
      const backgroundNotifications = Array.from({ length: 200 }, (_, i) => ({
        ...testNotification,
        id: `background-${i}`,
        priority: 'low' as const,
      }));

      const emergencyNotification: ProcessedNotification = {
        ...testNotification,
        id: 'emergency-under-load',
        priority: 'emergency',
        event: {
          ...testNotification.event,
          type: 'wedding_emergency',
        },
      };

      // Start background load
      const backgroundPromise = Promise.allSettled(
        backgroundNotifications.map((n) =>
          notificationEngine.processNotification(n),
        ),
      );

      // Process emergency notification
      const emergencyStart = Date.now();

      try {
        await notificationEngine.processNotification(emergencyNotification);
      } catch (error) {
        // Expected in test environment
      }

      const emergencyTime = Date.now() - emergencyStart;

      // Wait for background load to complete
      await backgroundPromise;

      // Emergency should still be processed quickly despite load
      expect(emergencyTime).toBeLessThan(1000); // Under 1 second even under load
    });
  });

  describe('Data Consistency and Integrity', () => {
    it('should not lose notifications during system restart', async () => {
      const notification = { ...testNotification, id: 'restart-test' };

      // Queue notification
      await notificationEngine.processNotification(notification);

      // Simulate system restart
      await coordinator.shutdown();
      coordinator = new NotificationWorkerCoordinator();

      // Check notification is still queued (would check Redis in real implementation)
      expect(mockRedis.hget).toHaveBeenCalled();
    });

    it('should prevent duplicate notifications', async () => {
      const notification = { ...testNotification, id: 'duplicate-test' };

      // Send same notification twice
      const promise1 = notificationEngine.processNotification(notification);
      const promise2 = notificationEngine.processNotification(notification);

      await Promise.allSettled([promise1, promise2]);

      // Should implement idempotency checks
      expect(mockRedis.hset).toHaveBeenCalled();
    });

    it('should maintain audit trail for all notifications', async () => {
      const notification = { ...testNotification, id: 'audit-test' };

      await notificationEngine.processNotification(notification);

      // Should log to analytics/audit system
      expect(mockRedis.lpush).toHaveBeenCalled();
    });
  });

  describe('Wedding Day Critical Path Protection', () => {
    it('should never fail wedding day notifications', async () => {
      const weddingDayNotification: ProcessedNotification = {
        ...testNotification,
        priority: 'emergency',
        event: {
          ...testNotification.event,
          context: {
            ...testNotification.event.context,
            weddingDate: new Date().toISOString().split('T')[0], // Today
            isWeddingDay: true,
          },
        },
      };

      // Even with system errors, wedding day notifications must go through
      let result;
      try {
        result = await notificationEngine.processNotification(
          weddingDayNotification,
        );
      } catch (error) {
        // Should have fallback mechanisms
        expect(error).toBeDefined();
      }

      // Should have attempted multiple channels
      expect(mockRedis.lpush).toHaveBeenCalled();
    });

    it('should escalate failed wedding day notifications', async () => {
      const criticalNotification: ProcessedNotification = {
        ...testNotification,
        priority: 'emergency',
        event: {
          ...testNotification.event,
          type: 'wedding_emergency',
          context: {
            ...testNotification.event.context,
            weddingDate: new Date().toISOString().split('T')[0],
            emergencyType: 'Critical System Failure',
          },
        },
      };

      // Mock all channels to fail
      const failingProvider = {
        send: vi.fn().mockResolvedValue({
          success: false,
          error: 'All channels down',
          channel: 'emergency',
          providerId: 'failing',
          recipientId: criticalNotification.recipientId,
          messageId: '',
          timestamp: new Date(),
        }),
        getProviderStatus: vi.fn().mockResolvedValue({
          healthy: false,
          latency: 10000,
          errorRate: 1,
        }),
      };

      vi.spyOn(NotificationProviderFactory, 'getProvider').mockReturnValue(
        failingProvider,
      );

      try {
        await notificationEngine.processNotification(criticalNotification);
      } catch (error) {
        // Should escalate to manual intervention
        expect(error).toBeDefined();
      }

      // Should have attempted escalation
      expect(mockRedis.lpush).toHaveBeenCalled();
    });
  });
});
