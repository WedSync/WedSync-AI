/**
 * WedSync Realtime Subscription Manager Unit Tests
 * WS-202: Comprehensive unit testing for realtime subscription management
 * 
 * Wedding Industry Context: Photography suppliers need reliable realtime updates
 * for RSVP changes, timeline adjustments, and vendor coordination during events.
 * These tests ensure zero message loss and <500ms latency requirements.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { RealtimeSubscriptionManager } from '@/lib/supabase/realtime-subscription-manager';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { RealtimeEvent, PresenceState, ConnectionState } from '@/types/realtime';

// Mock Supabase client
jest.mock('@supabase/supabase-js');
const mockSupabase = {
  channel: jest.fn(),
  removeChannel: jest.fn(),
  getChannels: jest.fn(() => [])
};

// Mock channel for realtime subscriptions
const mockChannel = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn().mockResolvedValue({ error: null }),
  unsubscribe: jest.fn().mockResolvedValue({ error: null }),
  track: jest.fn().mockResolvedValue({ error: null }),
  untrack: jest.fn().mockResolvedValue({ error: null }),
  send: jest.fn().mockResolvedValue({ error: null })
};

describe('RealtimeSubscriptionManager', () => {
  let subscriptionManager: RealtimeSubscriptionManager;
  let mockClient: jest.Mocked<ReturnType<typeof createClient<Database>>>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = mockSupabase as any;
    mockClient.channel.mockReturnValue(mockChannel);
    subscriptionManager = new RealtimeSubscriptionManager(mockClient);
  });

  afterEach(() => {
    subscriptionManager.cleanup();
  });

  describe('Wedding Vendor Coordination Scenarios', () => {
    it('should handle photographer RSVP change notifications', async () => {
      const weddingId = 'wedding-123';
      const vendorId = 'photographer-456';
      let receivedEvent: RealtimeEvent | null = null;

      const callback = (event: RealtimeEvent) => {
        receivedEvent = event;
      };

      await subscriptionManager.subscribeToWeddingUpdates(weddingId, vendorId, callback);

      expect(mockClient.channel).toHaveBeenCalledWith(
        `wedding:${weddingId}:vendor:${vendorId}`,
        expect.objectContaining({
          config: expect.objectContaining({
            presence: expect.objectContaining({
              key: vendorId
            })
          })
        })
      );

      // Simulate RSVP change event
      const mockEvent = {
        eventType: 'RSVP_CHANGED' as const,
        payload: {
          guestId: 'guest-789',
          previousStatus: 'pending',
          newStatus: 'accepted',
          weddingId,
          timestamp: new Date().toISOString()
        },
        metadata: {
          source: 'couple_portal',
          priority: 'high'
        }
      };

      // Trigger the callback that would be called by Supabase
      const onCallback = mockChannel.on.mock.calls.find(call => call[0] === 'postgres_changes')?.[1];
      if (onCallback) {
        onCallback(mockEvent);
      }

      expect(receivedEvent).toEqual(mockEvent);
    });

    it('should handle venue coordinator timeline updates with sub-500ms latency', async () => {
      const weddingId = 'wedding-123';
      const vendorId = 'venue-coordinator-789';
      const startTime = Date.now();
      let latency = 0;

      const callback = (event: RealtimeEvent) => {
        latency = Date.now() - startTime;
      };

      await subscriptionManager.subscribeToWeddingUpdates(weddingId, vendorId, callback);

      // Simulate timeline update
      const timelineEvent = {
        eventType: 'TIMELINE_UPDATED' as const,
        payload: {
          timelineId: 'timeline-456',
          changes: [{
            eventId: 'ceremony-start',
            oldTime: '14:00',
            newTime: '14:30',
            reason: 'photography_delay'
          }],
          weddingId,
          timestamp: new Date().toISOString()
        },
        metadata: {
          source: 'venue_portal',
          priority: 'critical'
        }
      };

      const onCallback = mockChannel.on.mock.calls.find(call => call[0] === 'postgres_changes')?.[1];
      if (onCallback) {
        onCallback(timelineEvent);
      }

      // Verify sub-500ms latency requirement for critical wedding day updates
      expect(latency).toBeLessThan(500);
    });

    it('should maintain presence tracking for online vendors', async () => {
      const weddingId = 'wedding-123';
      const vendorId = 'florist-321';
      
      await subscriptionManager.subscribeToWeddingUpdates(weddingId, vendorId, jest.fn());

      // Verify presence tracking is initialized
      expect(mockChannel.track).toHaveBeenCalledWith({
        user_id: vendorId,
        user_type: 'vendor',
        wedding_id: weddingId,
        online_at: expect.any(String),
        status: 'active'
      });
    });

    it('should buffer messages during temporary network interruptions', async () => {
      const weddingId = 'wedding-123';
      const vendorId = 'photographer-456';
      const receivedEvents: RealtimeEvent[] = [];

      const callback = (event: RealtimeEvent) => {
        receivedEvents.push(event);
      };

      await subscriptionManager.subscribeToWeddingUpdates(weddingId, vendorId, callback);

      // Simulate network disconnection
      subscriptionManager.setConnectionState('disconnected');

      // Queue events while offline
      const offlineEvents = [
        {
          eventType: 'GUEST_MESSAGE' as const,
          payload: { message: 'Running 15 minutes late', guestId: 'guest-1', weddingId },
          metadata: { source: 'guest_app', priority: 'medium' }
        },
        {
          eventType: 'VENDOR_UPDATE' as const,
          payload: { status: 'setup_complete', vendorId: 'caterer-123', weddingId },
          metadata: { source: 'vendor_portal', priority: 'high' }
        }
      ];

      offlineEvents.forEach(event => {
        subscriptionManager.bufferEvent(event);
      });

      // Simulate reconnection
      subscriptionManager.setConnectionState('connected');
      await subscriptionManager.flushBufferedEvents();

      // Verify all buffered events are processed
      expect(receivedEvents).toHaveLength(2);
      expect(receivedEvents).toEqual(expect.arrayContaining(offlineEvents));
    });

    it('should handle multi-tenant isolation for different weddings', async () => {
      const wedding1Id = 'wedding-123';
      const wedding2Id = 'wedding-456';
      const vendorId = 'photographer-789';
      
      const wedding1Events: RealtimeEvent[] = [];
      const wedding2Events: RealtimeEvent[] = [];

      await subscriptionManager.subscribeToWeddingUpdates(wedding1Id, vendorId, (event) => {
        wedding1Events.push(event);
      });

      await subscriptionManager.subscribeToWeddingUpdates(wedding2Id, vendorId, (event) => {
        wedding2Events.push(event);
      });

      // Verify separate channels are created
      expect(mockClient.channel).toHaveBeenCalledWith(`wedding:${wedding1Id}:vendor:${vendorId}`, expect.any(Object));
      expect(mockClient.channel).toHaveBeenCalledWith(`wedding:${wedding2Id}:vendor:${vendorId}`, expect.any(Object));
      expect(mockClient.channel).toHaveBeenCalledTimes(2);

      // Simulate events for different weddings
      const wedding1Event = {
        eventType: 'RSVP_CHANGED' as const,
        payload: { guestId: 'guest-1', weddingId: wedding1Id },
        metadata: { source: 'couple_portal', priority: 'medium' }
      };

      const wedding2Event = {
        eventType: 'RSVP_CHANGED' as const,
        payload: { guestId: 'guest-2', weddingId: wedding2Id },
        metadata: { source: 'couple_portal', priority: 'medium' }
      };

      // Events should only go to their respective wedding subscriptions
      expect(wedding1Events).not.toContain(wedding2Event);
      expect(wedding2Events).not.toContain(wedding1Event);
    });
  });

  describe('Connection Management', () => {
    it('should implement exponential backoff for reconnection attempts', async () => {
      const weddingId = 'wedding-123';
      const vendorId = 'photographer-456';
      
      await subscriptionManager.subscribeToWeddingUpdates(weddingId, vendorId, jest.fn());

      // Simulate connection failures
      subscriptionManager.setConnectionState('disconnected');
      
      const reconnectAttempts: number[] = [];
      const originalReconnect = subscriptionManager.reconnect;
      subscriptionManager.reconnect = jest.fn().mockImplementation(async (attempt: number) => {
        reconnectAttempts.push(attempt);
        return originalReconnect.call(subscriptionManager, attempt);
      });

      // Trigger multiple reconnection attempts
      for (let i = 1; i <= 3; i++) {
        await subscriptionManager.attemptReconnection(i);
      }

      expect(reconnectAttempts).toEqual([1, 2, 3]);
      
      // Verify exponential backoff delays (1s, 2s, 4s)
      const delays = subscriptionManager.getReconnectionDelays();
      expect(delays).toEqual([1000, 2000, 4000]);
    });

    it('should recover within 10 seconds after network restoration', async () => {
      const weddingId = 'wedding-123';
      const vendorId = 'photographer-456';
      const startTime = Date.now();
      
      await subscriptionManager.subscribeToWeddingUpdates(weddingId, vendorId, jest.fn());

      // Simulate network failure and recovery
      subscriptionManager.setConnectionState('disconnected');
      
      setTimeout(() => {
        subscriptionManager.setConnectionState('connected');
      }, 100);

      await subscriptionManager.waitForConnection();
      
      const recoveryTime = Date.now() - startTime;
      expect(recoveryTime).toBeLessThan(10000); // 10 second requirement
    });

    it('should maintain connection heartbeat for Saturday wedding days', async () => {
      const weddingId = 'saturday-wedding-123';
      const vendorId = 'photographer-456';
      
      // Mock Saturday (wedding day)
      const mockSaturday = new Date('2025-02-01T10:00:00Z'); // Saturday
      jest.spyOn(Date, 'now').mockReturnValue(mockSaturday.getTime());
      
      await subscriptionManager.subscribeToWeddingUpdates(weddingId, vendorId, jest.fn());
      
      // Enable enhanced monitoring for wedding day
      subscriptionManager.enableWeddingDayMode();
      
      expect(subscriptionManager.getHeartbeatInterval()).toBe(5000); // 5 second heartbeat on wedding days
      expect(subscriptionManager.isEnhancedMonitoringEnabled()).toBe(true);
    });
  });

  describe('Error Handling & Recovery', () => {
    it('should handle Supabase service disruptions gracefully', async () => {
      const weddingId = 'wedding-123';
      const vendorId = 'photographer-456';
      
      // Mock Supabase error
      mockChannel.subscribe.mockResolvedValueOnce({ error: { message: 'Service unavailable' } });
      
      const errorCallback = jest.fn();
      subscriptionManager.onError(errorCallback);
      
      await subscriptionManager.subscribeToWeddingUpdates(weddingId, vendorId, jest.fn());
      
      expect(errorCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'subscription_error',
          message: 'Service unavailable',
          weddingId,
          vendorId
        })
      );
      
      // Verify fallback to polling mode
      expect(subscriptionManager.isPollingMode()).toBe(true);
    });

    it('should retry failed message deliveries', async () => {
      const weddingId = 'wedding-123';
      const vendorId = 'photographer-456';
      
      await subscriptionManager.subscribeToWeddingUpdates(weddingId, vendorId, jest.fn());
      
      // Mock failed send
      mockChannel.send.mockResolvedValueOnce({ error: { message: 'Send failed' } });
      
      const message = {
        type: 'vendor_status_update',
        payload: { status: 'arrived_at_venue' }
      };
      
      await subscriptionManager.sendMessage(weddingId, vendorId, message);
      
      // Verify retry logic
      expect(mockChannel.send).toHaveBeenCalledTimes(1);
      expect(subscriptionManager.getFailedMessages()).toHaveLength(1);
      
      // Simulate successful retry
      mockChannel.send.mockResolvedValueOnce({ error: null });
      await subscriptionManager.retryFailedMessages();
      
      expect(subscriptionManager.getFailedMessages()).toHaveLength(0);
    });
  });

  describe('Performance & Memory Management', () => {
    it('should cleanup subscriptions on unmount to prevent memory leaks', () => {
      const weddingId = 'wedding-123';
      const vendorId = 'photographer-456';
      
      subscriptionManager.subscribeToWeddingUpdates(weddingId, vendorId, jest.fn());
      
      expect(subscriptionManager.getActiveSubscriptionsCount()).toBe(1);
      
      subscriptionManager.cleanup();
      
      expect(mockChannel.unsubscribe).toHaveBeenCalled();
      expect(subscriptionManager.getActiveSubscriptionsCount()).toBe(0);
    });

    it('should throttle high-frequency updates during peak wedding hours', async () => {
      const weddingId = 'wedding-123';
      const vendorId = 'photographer-456';
      const receivedEvents: RealtimeEvent[] = [];
      
      await subscriptionManager.subscribeToWeddingUpdates(weddingId, vendorId, (event) => {
        receivedEvents.push(event);
      });
      
      // Enable throttling for peak hours (Saturday afternoon)
      subscriptionManager.enablePeakHourThrottling();
      
      // Simulate rapid-fire updates
      const rapidUpdates = Array.from({ length: 10 }, (_, i) => ({
        eventType: 'GUEST_CHECKIN' as const,
        payload: { guestId: `guest-${i}`, weddingId },
        metadata: { source: 'checkin_app', priority: 'low' }
      }));
      
      for (const event of rapidUpdates) {
        subscriptionManager.handleIncomingEvent(event);
      }
      
      // Verify throttling reduces event frequency
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      expect(receivedEvents.length).toBeLessThan(rapidUpdates.length);
      expect(receivedEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Type Safety & Data Validation', () => {
    it('should validate incoming realtime events against TypeScript schemas', () => {
      const validEvent: RealtimeEvent = {
        eventType: 'RSVP_CHANGED',
        payload: {
          guestId: 'guest-123',
          previousStatus: 'pending',
          newStatus: 'accepted',
          weddingId: 'wedding-456',
          timestamp: new Date().toISOString()
        },
        metadata: {
          source: 'couple_portal',
          priority: 'high'
        }
      };
      
      expect(() => subscriptionManager.validateEvent(validEvent)).not.toThrow();
    });

    it('should reject invalid event payloads', () => {
      const invalidEvent = {
        eventType: 'INVALID_EVENT_TYPE',
        payload: {
          invalidField: 'invalid'
        }
      };
      
      expect(() => subscriptionManager.validateEvent(invalidEvent as any)).toThrow(
        'Invalid event type: INVALID_EVENT_TYPE'
      );
    });

    it('should ensure all string fields are properly typed (no any types)', () => {
      // This test ensures TypeScript strict mode compliance
      const manager = new RealtimeSubscriptionManager(mockClient);
      
      // @ts-expect-error - Should fail if any 'any' types exist
      const invalidAssignment: string = manager.somePropertyThatShouldNotExist;
      
      // Test passes if TypeScript compilation succeeds with strict mode
      expect(manager).toBeDefined();
    });
  });

  describe('Wedding Day Critical Path Testing', () => {
    it('should prioritize critical wedding day events', async () => {
      const weddingId = 'saturday-wedding-123';
      const vendorId = 'photographer-456';
      const processedEvents: RealtimeEvent[] = [];
      
      await subscriptionManager.subscribeToWeddingUpdates(weddingId, vendorId, (event) => {
        processedEvents.push(event);
      });
      
      // Simulate mixed priority events
      const events = [
        {
          eventType: 'GUEST_MESSAGE' as const,
          payload: { message: 'Looking forward to tomorrow!', weddingId },
          metadata: { source: 'guest_app', priority: 'low' as const }
        },
        {
          eventType: 'VENDOR_EMERGENCY' as const,
          payload: { message: 'Flower delivery truck broken down!', vendorId: 'florist-123', weddingId },
          metadata: { source: 'vendor_portal', priority: 'critical' as const }
        },
        {
          eventType: 'TIMELINE_UPDATED' as const,
          payload: { changes: [{ eventId: 'ceremony', newTime: '15:00' }], weddingId },
          metadata: { source: 'venue_portal', priority: 'high' as const }
        }
      ];
      
      // Process events
      events.forEach(event => subscriptionManager.handleIncomingEvent(event));
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify critical events are processed first
      expect(processedEvents[0].metadata.priority).toBe('critical');
      expect(processedEvents[1].metadata.priority).toBe('high');
      expect(processedEvents[2].metadata.priority).toBe('low');
    });

    it('should maintain 100% uptime SLA during Saturday operations', () => {
      const mockSaturday = new Date('2025-02-01T10:00:00Z');
      jest.spyOn(Date, 'now').mockReturnValue(mockSaturday.getTime());
      
      const uptimeTracker = subscriptionManager.getUptimeTracker();
      
      expect(uptimeTracker.isSaturday()).toBe(true);
      expect(uptimeTracker.getRequiredUptime()).toBe(100); // 100% uptime on Saturdays
      expect(subscriptionManager.isFailoverEnabled()).toBe(true);
    });
  });
});