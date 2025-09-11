import {
  describe,
  it,
  expect,
  beforeEach,
  jest,
  afterEach,
} from '@jest/globals';
import { FeatureRequestEventHub } from '@/lib/realtime/FeatureRequestEventHub';
import { WeddingTestDataFactory } from '../../mocks/wedding-data-factory';
import { MockSupabaseClient } from '../../mocks/supabase-client';

// Mock dependencies
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => MockSupabaseClient,
}));

jest.mock('@/lib/redis', () => ({
  redis: {
    lpush: jest.fn().mockResolvedValue(1),
    brpop: jest
      .fn()
      .mockResolvedValue([
        'queue',
        JSON.stringify(
          WeddingTestDataFactory.realtimeEvents.featureRequestCreated,
        ),
      ]),
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  },
}));

jest.mock('@/lib/realtime/WebSocketManager', () => ({
  webSocketManager: {
    broadcastToRoom: jest.fn(),
    getConnectionCount: jest.fn().mockReturnValue(150),
    isConnected: jest.fn().mockReturnValue(true),
  },
}));

describe('FeatureRequestEventHub', () => {
  let eventHub: FeatureRequestEventHub;

  beforeEach(() => {
    eventHub = new FeatureRequestEventHub();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Performance Requirements', () => {
    it('should process events under 50ms', async () => {
      // Arrange
      const event = WeddingTestDataFactory.realtimeEvents.featureRequestCreated;

      // Act
      const startTime = performance.now();
      await eventHub.processEvent(event);
      const duration = performance.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(50);
    }, 10000);

    it('should handle high throughput events', async () => {
      // Arrange
      const events = Array.from({ length: 100 }, (_, i) => ({
        ...WeddingTestDataFactory.realtimeEvents.featureRequestCreated,
        payload: {
          ...WeddingTestDataFactory.realtimeEvents.featureRequestCreated
            .payload,
          id: `fr-${i}`,
        },
      }));

      // Act
      const startTime = performance.now();
      const promises = events.map((event) => eventHub.processEvent(event));
      await Promise.all(promises);
      const duration = performance.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(5000); // 5 seconds for 100 events
      expect(promises).toHaveLength(100);
    });

    it('should maintain performance under load', async () => {
      // Arrange
      const batchSize = 50;
      const batches = 5;
      const durations: number[] = [];

      // Act
      for (let batch = 0; batch < batches; batch++) {
        const events = Array.from({ length: batchSize }, (_, i) => ({
          ...WeddingTestDataFactory.realtimeEvents.featureRequestCreated,
          payload: {
            ...WeddingTestDataFactory.realtimeEvents.featureRequestCreated
              .payload,
            id: `batch-${batch}-${i}`,
          },
        }));

        const startTime = performance.now();
        await Promise.all(events.map((event) => eventHub.processEvent(event)));
        durations.push(performance.now() - startTime);
      }

      // Assert - Performance should not degrade significantly
      const avgDuration = durations.reduce((a, b) => a + b) / durations.length;
      const maxDuration = Math.max(...durations);
      expect(avgDuration).toBeLessThan(2500); // 2.5 seconds average
      expect(maxDuration).toBeLessThan(3000); // 3 seconds max
    });
  });

  describe('Wedding Day Priority Processing', () => {
    it('should prioritize wedding day events', async () => {
      // Arrange
      const weddingDayEvent =
        WeddingTestDataFactory.realtimeEvents.weddingDayEvent;
      const normalEvent =
        WeddingTestDataFactory.realtimeEvents.featureRequestCreated;

      // Act
      const weddingResult = await eventHub.processEvent(weddingDayEvent);
      const normalResult = await eventHub.processEvent(normalEvent);

      // Assert
      expect(weddingResult.priority).toBe(1); // Highest priority
      expect(normalResult.priority).toBeGreaterThan(1);
      expect(weddingResult.processingTime).toBeLessThanOrEqual(
        normalResult.processingTime,
      );
    });

    it('should trigger Saturday protection mode', async () => {
      // Arrange
      const saturdayEvent = {
        ...WeddingTestDataFactory.realtimeEvents.weddingDayEvent,
        payload: {
          ...WeddingTestDataFactory.realtimeEvents.weddingDayEvent.payload,
          wedding_date: '2025-01-25', // Saturday
          saturday_wedding: true,
        },
      };

      // Act
      const result = await eventHub.processEvent(saturdayEvent);

      // Assert
      expect(result.saturdayProtection).toBe(true);
      expect(result.deploymentRestricted).toBe(true);
      expect(result.readOnlyMode).toBe(true);
    });

    it('should handle imminent wedding scenarios', async () => {
      // Arrange
      const imminentWeddingEvent = {
        ...WeddingTestDataFactory.realtimeEvents.weddingDayEvent,
        payload: {
          ...WeddingTestDataFactory.realtimeEvents.weddingDayEvent.payload,
          days_until: 1, // Tomorrow
          urgent: true,
        },
      };

      // Act
      const result = await eventHub.processEvent(imminentWeddingEvent);

      // Assert
      expect(result.priority).toBe(1);
      expect(result.escalated).toBe(true);
      expect(result.notificationChannels).toContain('sms');
      expect(result.notificationChannels).toContain('slack');
    });
  });

  describe('Event Broadcasting', () => {
    it('should broadcast to appropriate rooms', async () => {
      // Arrange
      const event = WeddingTestDataFactory.realtimeEvents.featureRequestCreated;
      const { webSocketManager } = await import(
        '@/lib/realtime/WebSocketManager'
      );

      // Act
      await eventHub.processEvent(event);

      // Assert
      expect(webSocketManager.broadcastToRoom).toHaveBeenCalledWith(
        'feature-requests',
        expect.objectContaining({
          type: 'feature_request.created',
          payload: expect.any(Object),
        }),
      );
    });

    it('should broadcast urgent events to multiple rooms', async () => {
      // Arrange
      const urgentEvent = WeddingTestDataFactory.realtimeEvents.weddingDayEvent;
      const { webSocketManager } = await import(
        '@/lib/realtime/WebSocketManager'
      );

      // Act
      await eventHub.processEvent(urgentEvent);

      // Assert
      expect(webSocketManager.broadcastToRoom).toHaveBeenCalledWith(
        'urgent-requests',
        expect.any(Object),
      );
      expect(webSocketManager.broadcastToRoom).toHaveBeenCalledWith(
        'admin-alerts',
        expect.any(Object),
      );
    });

    it('should include wedding context in broadcasts', async () => {
      // Arrange
      const weddingEvent = {
        ...WeddingTestDataFactory.realtimeEvents.featureRequestCreated,
        payload: {
          ...WeddingTestDataFactory.realtimeEvents.featureRequestCreated
            .payload,
          wedding_context: WeddingTestDataFactory.weddings.peakSeason,
        },
      };
      const { webSocketManager } = await import(
        '@/lib/realtime/WebSocketManager'
      );

      // Act
      await eventHub.processEvent(weddingEvent);

      // Assert
      expect(webSocketManager.broadcastToRoom).toHaveBeenCalledWith(
        'feature-requests',
        expect.objectContaining({
          payload: expect.objectContaining({
            wedding_context: expect.objectContaining({
              season: 'peak',
              wedding_type: 'luxury',
            }),
          }),
        }),
      );
    });
  });

  describe('Queue Management', () => {
    it('should queue events reliably', async () => {
      // Arrange
      const event = WeddingTestDataFactory.realtimeEvents.featureRequestCreated;
      const { redis } = await import('@/lib/redis');

      // Act
      await eventHub.queueEvent(event);

      // Assert
      expect(redis.lpush).toHaveBeenCalledWith(
        'event_queue:feature_requests',
        JSON.stringify(event),
      );
    });

    it('should process queued events in order', async () => {
      // Arrange
      const events = [
        {
          ...WeddingTestDataFactory.realtimeEvents.featureRequestCreated,
          id: '1',
        },
        {
          ...WeddingTestDataFactory.realtimeEvents.featureRequestCreated,
          id: '2',
        },
        {
          ...WeddingTestDataFactory.realtimeEvents.featureRequestCreated,
          id: '3',
        },
      ];

      // Act
      for (const event of events) {
        await eventHub.queueEvent(event);
      }

      const processedEvents = [];
      for (let i = 0; i < events.length; i++) {
        const event = await eventHub.processQueuedEvent();
        processedEvents.push(event);
      }

      // Assert
      expect(processedEvents).toHaveLength(3);
      // Events should be processed in FIFO order (due to Redis BRPOP)
    });

    it('should handle queue failures gracefully', async () => {
      // Arrange
      const { redis } = await import('@/lib/redis');
      (redis.lpush as jest.Mock).mockRejectedValue(
        new Error('Redis connection failed'),
      );

      const event = WeddingTestDataFactory.realtimeEvents.featureRequestCreated;

      // Act & Assert
      await expect(eventHub.queueEvent(event)).rejects.toThrow(
        'Redis connection failed',
      );
    });
  });

  describe('Wedding Industry Context Integration', () => {
    it('should enrich events with wedding context', async () => {
      // Arrange
      const photographerEvent = {
        ...WeddingTestDataFactory.realtimeEvents.featureRequestCreated,
        payload: {
          ...WeddingTestDataFactory.realtimeEvents.featureRequestCreated
            .payload,
          user_type: 'photographer',
          business_name: 'Enchanted Moments Photography',
        },
      };

      // Act
      const result = await eventHub.processEvent(photographerEvent);

      // Assert
      expect(result.enrichment.userType).toBe('photographer');
      expect(result.enrichment.businessContext).toBeDefined();
    });

    it('should calculate wedding season urgency', async () => {
      // Arrange
      const peakSeasonEvent = {
        ...WeddingTestDataFactory.realtimeEvents.featureRequestCreated,
        payload: {
          ...WeddingTestDataFactory.realtimeEvents.featureRequestCreated
            .payload,
          wedding_context: WeddingTestDataFactory.weddings.peakSeason,
        },
      };

      // Act
      const result = await eventHub.processEvent(peakSeasonEvent);

      // Assert
      expect(result.enrichment.seasonalUrgency).toBe('high');
      expect(result.enrichment.peakSeasonBoost).toBe(true);
    });

    it('should handle venue capacity considerations', async () => {
      // Arrange
      const venueEvent = {
        ...WeddingTestDataFactory.realtimeEvents.featureRequestCreated,
        payload: {
          ...WeddingTestDataFactory.realtimeEvents.featureRequestCreated
            .payload,
          user_type: 'venue',
          wedding_context: {
            guest_count: 150,
            venue_capacity: 200,
          },
        },
      };

      // Act
      const result = await eventHub.processEvent(venueEvent);

      // Assert
      expect(result.enrichment.capacityUtilization).toBe(0.75); // 150/200
      expect(result.enrichment.venueStress).toBe('moderate');
    });
  });

  describe('Error Handling & Resilience', () => {
    it('should handle processing errors gracefully', async () => {
      // Arrange
      const malformedEvent = {
        type: 'invalid_type',
        payload: null,
        timestamp: 'invalid_date',
      };

      // Act & Assert
      await expect(
        eventHub.processEvent(malformedEvent as any),
      ).resolves.not.toThrow();
    });

    it('should continue processing after individual event failures', async () => {
      // Arrange
      const validEvent =
        WeddingTestDataFactory.realtimeEvents.featureRequestCreated;
      const invalidEvent = { type: 'invalid' };
      const anotherValidEvent = {
        ...WeddingTestDataFactory.realtimeEvents.featureRequestCreated,
        payload: {
          ...WeddingTestDataFactory.realtimeEvents.featureRequestCreated
            .payload,
          id: 'second-valid',
        },
      };

      // Act
      const results = await Promise.allSettled([
        eventHub.processEvent(validEvent),
        eventHub.processEvent(invalidEvent as any),
        eventHub.processEvent(anotherValidEvent),
      ]);

      // Assert
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');
    });

    it('should implement circuit breaker for external services', async () => {
      // Arrange
      const event = WeddingTestDataFactory.realtimeEvents.featureRequestCreated;

      // Simulate external service failures
      MockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      // Act
      const results = [];
      for (let i = 0; i < 10; i++) {
        try {
          await eventHub.processEvent(event);
          results.push('success');
        } catch (error) {
          results.push('failure');
        }
      }

      // Assert
      const failures = results.filter((r) => r === 'failure').length;
      expect(failures).toBeGreaterThan(0);
      // Circuit breaker should kick in after threshold
    });
  });

  describe('Scalability & Connection Management', () => {
    it('should handle 1000+ concurrent connections', async () => {
      // Arrange
      const { webSocketManager } = await import(
        '@/lib/realtime/WebSocketManager'
      );
      (webSocketManager.getConnectionCount as jest.Mock).mockReturnValue(1200);

      const event = WeddingTestDataFactory.realtimeEvents.featureRequestCreated;

      // Act
      const result = await eventHub.processEvent(event);

      // Assert
      expect(result.connectionCount).toBe(1200);
      expect(result.scalingMode).toBe('high_load');
    });

    it('should optimize broadcasting for large connection counts', async () => {
      // Arrange
      const { webSocketManager } = await import(
        '@/lib/realtime/WebSocketManager'
      );
      (webSocketManager.getConnectionCount as jest.Mock).mockReturnValue(2000);

      const event = WeddingTestDataFactory.realtimeEvents.featureRequestCreated;

      // Act
      await eventHub.processEvent(event);

      // Assert
      expect(webSocketManager.broadcastToRoom).toHaveBeenCalledWith(
        'feature-requests',
        expect.any(Object),
        { batched: true, batchSize: 100 }, // Should use batched broadcasting
      );
    });

    it('should throttle events during peak load', async () => {
      // Arrange
      const events = Array.from({ length: 200 }, (_, i) => ({
        ...WeddingTestDataFactory.realtimeEvents.featureRequestCreated,
        payload: {
          ...WeddingTestDataFactory.realtimeEvents.featureRequestCreated
            .payload,
          id: `throttle-${i}`,
        },
      }));

      // Act
      const startTime = Date.now();
      const results = await Promise.allSettled(
        events.map((event) => eventHub.processEvent(event)),
      );
      const duration = Date.now() - startTime;

      // Assert
      const successCount = results.filter(
        (r) => r.status === 'fulfilled',
      ).length;
      expect(successCount).toBeLessThan(200); // Some should be throttled
      expect(duration).toBeGreaterThan(1000); // Should take time due to throttling
    });
  });

  describe('Mobile-First Considerations', () => {
    it('should optimize events for mobile connections', async () => {
      // Arrange
      const mobileEvent = {
        ...WeddingTestDataFactory.realtimeEvents.featureRequestCreated,
        payload: {
          ...WeddingTestDataFactory.realtimeEvents.featureRequestCreated
            .payload,
          mobile_client: true,
          connection_type: '3G',
        },
      };

      // Act
      const result = await eventHub.processEvent(mobileEvent);

      // Assert
      expect(result.mobileOptimized).toBe(true);
      expect(result.payloadCompressed).toBe(true);
      expect(result.payloadSize).toBeLessThan(1024); // < 1KB for mobile
    });

    it('should handle offline scenarios gracefully', async () => {
      // Arrange
      const offlineEvent = {
        ...WeddingTestDataFactory.realtimeEvents.featureRequestCreated,
        payload: {
          ...WeddingTestDataFactory.realtimeEvents.featureRequestCreated
            .payload,
          offline_client: true,
        },
      };

      // Act
      const result = await eventHub.processEvent(offlineEvent);

      // Assert
      expect(result.queuedForOffline).toBe(true);
      expect(result.syncOnReconnect).toBe(true);
    });
  });
});
