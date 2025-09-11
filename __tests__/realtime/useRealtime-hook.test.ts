/**
 * WedSync useRealtime Hook Unit Tests
 * WS-202: Comprehensive unit testing for React realtime hook
 * 
 * Wedding Industry Context: React hook testing for photographer, venue, and vendor
 * realtime coordination components. Ensures reliable state management and UI updates
 * during critical wedding day operations.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { useRealtime } from '@/hooks/useRealtime';
import { RealtimeSubscriptionManager } from '@/lib/supabase/realtime-subscription-manager';
import type { RealtimeEvent, ConnectionState, PresenceState } from '@/types/realtime';

// Mock RealtimeSubscriptionManager
jest.mock('@/lib/supabase/realtime-subscription-manager');
const MockRealtimeSubscriptionManager = RealtimeSubscriptionManager as jest.MockedClass<typeof RealtimeSubscriptionManager>;

describe('useRealtime Hook', () => {
  let mockSubscriptionManager: jest.Mocked<RealtimeSubscriptionManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscriptionManager = {
      subscribeToWeddingUpdates: jest.fn().mockResolvedValue(undefined),
      unsubscribeFromWedding: jest.fn().mockResolvedValue(undefined),
      setConnectionState: jest.fn(),
      getConnectionState: jest.fn().mockReturnValue('connected'),
      sendMessage: jest.fn().mockResolvedValue({ error: null }),
      trackPresence: jest.fn().mockResolvedValue({ error: null }),
      untrackPresence: jest.fn().mockResolvedValue({ error: null }),
      getPresenceState: jest.fn().mockReturnValue({}),
      onError: jest.fn(),
      cleanup: jest.fn(),
      isConnected: jest.fn().mockReturnValue(true),
      getLatestMessages: jest.fn().mockReturnValue([]),
      getConnectionQuality: jest.fn().mockReturnValue({ latency: 50, stability: 'excellent' })
    } as any;

    MockRealtimeSubscriptionManager.mockImplementation(() => mockSubscriptionManager);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Wedding Coordination Hook Behavior', () => {
    it('should initialize with correct wedding and vendor context', () => {
      const weddingId = 'wedding-123';
      const vendorId = 'photographer-456';

      const { result } = renderHook(() => useRealtime({
        weddingId,
        vendorId,
        vendorType: 'photographer'
      }));

      expect(result.current.connectionState).toBe('connecting');
      expect(result.current.isConnected).toBe(false);
      expect(result.current.messages).toEqual([]);
      expect(result.current.presenceState).toEqual({});
    });

    it('should handle photographer RSVP change notifications with state updates', async () => {
      const weddingId = 'wedding-123';
      const vendorId = 'photographer-456';
      let capturedCallback: ((event: RealtimeEvent) => void) | null = null;

      mockSubscriptionManager.subscribeToWeddingUpdates.mockImplementation((wId, vId, callback) => {
        capturedCallback = callback;
        return Promise.resolve();
      });

      const { result } = renderHook(() => useRealtime({
        weddingId,
        vendorId,
        vendorType: 'photographer'
      }));

      await waitFor(() => {
        expect(mockSubscriptionManager.subscribeToWeddingUpdates).toHaveBeenCalled();
      });

      // Simulate RSVP change event
      const rsvpEvent: RealtimeEvent = {
        eventType: 'RSVP_CHANGED',
        payload: {
          guestId: 'guest-789',
          previousStatus: 'pending',
          newStatus: 'declined',
          weddingId,
          timestamp: new Date().toISOString()
        },
        metadata: {
          source: 'couple_portal',
          priority: 'high'
        }
      };

      act(() => {
        if (capturedCallback) {
          capturedCallback(rsvpEvent);
        }
      });

      await waitFor(() => {
        expect(result.current.messages).toContainEqual(rsvpEvent);
        expect(result.current.latestMessage).toEqual(rsvpEvent);
      });
    });

    it('should track venue coordinator presence during setup', async () => {
      const weddingId = 'wedding-123';
      const vendorId = 'venue-coordinator-789';

      const { result } = renderHook(() => useRealtime({
        weddingId,
        vendorId,
        vendorType: 'venue_coordinator',
        enablePresenceTracking: true
      }));

      await waitFor(() => {
        expect(mockSubscriptionManager.trackPresence).toHaveBeenCalledWith(
          weddingId,
          vendorId,
          expect.objectContaining({
            vendor_type: 'venue_coordinator',
            status: 'online',
            activity: 'venue_setup'
          })
        );
      });

      // Test presence update
      act(() => {
        result.current.updatePresence({ activity: 'ceremony_ready' });
      });

      expect(mockSubscriptionManager.trackPresence).toHaveBeenCalledWith(
        weddingId,
        vendorId,
        expect.objectContaining({
          activity: 'ceremony_ready'
        })
      );
    });

    it('should handle florist delivery updates with typing indicators', async () => {
      const weddingId = 'wedding-123';
      const vendorId = 'florist-321';
      let presenceCallback: ((presence: PresenceState) => void) | null = null;

      mockSubscriptionManager.subscribeToWeddingUpdates.mockImplementation((wId, vId, eventCallback, presCallback) => {
        presenceCallback = presCallback!;
        return Promise.resolve();
      });

      const { result } = renderHook(() => useRealtime({
        weddingId,
        vendorId,
        vendorType: 'florist',
        enablePresenceTracking: true,
        enableTypingIndicators: true
      }));

      await waitFor(() => {
        expect(result.current.connectionState).toBe('connected');
      });

      // Simulate typing indicator from couple
      const presenceUpdate: PresenceState = {
        'couple-123': [{
          user_id: 'couple-123',
          user_type: 'couple',
          wedding_id: weddingId,
          online_at: new Date().toISOString(),
          status: 'typing',
          activity: 'messaging_florist'
        }]
      };

      act(() => {
        if (presenceCallback) {
          presenceCallback(presenceUpdate);
        }
      });

      await waitFor(() => {
        expect(result.current.presenceState).toEqual(presenceUpdate);
        expect(result.current.typingUsers).toContain('couple-123');
      });
    });

    it('should buffer messages during network interruptions for caterers', async () => {
      const weddingId = 'wedding-123';
      const vendorId = 'caterer-456';

      const { result } = renderHook(() => useRealtime({
        weddingId,
        vendorId,
        vendorType: 'caterer'
      }));

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate network disconnection
      mockSubscriptionManager.isConnected.mockReturnValue(false);
      mockSubscriptionManager.getConnectionState.mockReturnValue('disconnected');

      act(() => {
        result.current.sendMessage({
          type: 'catering_update',
          content: 'Appetizers ready for service'
        });
      });

      expect(result.current.pendingMessages).toHaveLength(1);
      expect(result.current.connectionState).toBe('disconnected');

      // Simulate reconnection
      mockSubscriptionManager.isConnected.mockReturnValue(true);
      mockSubscriptionManager.getConnectionState.mockReturnValue('connected');

      act(() => {
        // Trigger reconnection logic
        result.current.handleReconnection();
      });

      await waitFor(() => {
        expect(result.current.pendingMessages).toHaveLength(0);
        expect(result.current.connectionState).toBe('connected');
      });
    });
  });

  describe('Connection State Management', () => {
    it('should handle connection state transitions correctly', async () => {
      const weddingId = 'wedding-123';
      const vendorId = 'photographer-456';
      const connectionStates: ConnectionState[] = [];

      const { result } = renderHook(() => useRealtime({
        weddingId,
        vendorId,
        vendorType: 'photographer',
        onConnectionChange: (state) => connectionStates.push(state)
      }));

      // Initial state
      expect(result.current.connectionState).toBe('connecting');

      // Simulate successful connection
      act(() => {
        mockSubscriptionManager.getConnectionState.mockReturnValue('connected');
        mockSubscriptionManager.isConnected.mockReturnValue(true);
        result.current.handleConnectionChange('connected');
      });

      await waitFor(() => {
        expect(result.current.connectionState).toBe('connected');
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate disconnection
      act(() => {
        mockSubscriptionManager.getConnectionState.mockReturnValue('disconnected');
        mockSubscriptionManager.isConnected.mockReturnValue(false);
        result.current.handleConnectionChange('disconnected');
      });

      await waitFor(() => {
        expect(result.current.connectionState).toBe('disconnected');
        expect(result.current.isConnected).toBe(false);
      });

      expect(connectionStates).toEqual(['connected', 'disconnected']);
    });

    it('should implement automatic reconnection with exponential backoff', async () => {
      const weddingId = 'wedding-123';
      const vendorId = 'photographer-456';

      const { result } = renderHook(() => useRealtime({
        weddingId,
        vendorId,
        vendorType: 'photographer',
        autoReconnect: true,
        maxReconnectAttempts: 3
      }));

      // Simulate connection failure
      mockSubscriptionManager.isConnected.mockReturnValue(false);
      
      act(() => {
        result.current.handleConnectionChange('disconnected');
      });

      expect(result.current.connectionState).toBe('reconnecting');
      expect(result.current.reconnectAttempt).toBe(1);

      // Simulate failed reconnection attempts
      for (let i = 2; i <= 3; i++) {
        act(() => {
          result.current.attemptReconnection();
        });
        
        await waitFor(() => {
          expect(result.current.reconnectAttempt).toBe(i);
        });
      }

      // Verify exponential backoff delays
      expect(result.current.getReconnectDelay(1)).toBe(1000);
      expect(result.current.getReconnectDelay(2)).toBe(2000);
      expect(result.current.getReconnectDelay(3)).toBe(4000);
    });

    it('should measure and report connection quality metrics', async () => {
      const weddingId = 'wedding-123';
      const vendorId = 'photographer-456';

      mockSubscriptionManager.getConnectionQuality.mockReturnValue({
        latency: 150,
        stability: 'good',
        packetLoss: 0.01
      });

      const { result } = renderHook(() => useRealtime({
        weddingId,
        vendorId,
        vendorType: 'photographer',
        enableConnectionMetrics: true
      }));

      await waitFor(() => {
        expect(result.current.connectionQuality).toEqual({
          latency: 150,
          stability: 'good',
          packetLoss: 0.01
        });
      });

      expect(result.current.isHighLatency()).toBe(false); // <200ms is good
    });
  });

  describe('Error Handling & Recovery', () => {
    it('should handle subscription errors gracefully', async () => {
      const weddingId = 'wedding-123';
      const vendorId = 'photographer-456';
      const errors: string[] = [];

      mockSubscriptionManager.subscribeToWeddingUpdates.mockRejectedValue(
        new Error('Failed to subscribe to wedding updates')
      );

      const { result } = renderHook(() => useRealtime({
        weddingId,
        vendorId,
        vendorType: 'photographer',
        onError: (error) => errors.push(error.message)
      }));

      await waitFor(() => {
        expect(errors).toContain('Failed to subscribe to wedding updates');
        expect(result.current.connectionState).toBe('error');
      });

      // Test error recovery
      mockSubscriptionManager.subscribeToWeddingUpdates.mockResolvedValue(undefined);
      
      act(() => {
        result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.connectionState).toBe('connected');
      });
    });

    it('should handle malformed event data', async () => {
      const weddingId = 'wedding-123';
      const vendorId = 'photographer-456';
      let capturedCallback: ((event: RealtimeEvent) => void) | null = null;

      mockSubscriptionManager.subscribeToWeddingUpdates.mockImplementation((wId, vId, callback) => {
        capturedCallback = callback;
        return Promise.resolve();
      });

      const { result } = renderHook(() => useRealtime({
        weddingId,
        vendorId,
        vendorType: 'photographer'
      }));

      await waitFor(() => {
        expect(mockSubscriptionManager.subscribeToWeddingUpdates).toHaveBeenCalled();
      });

      // Simulate malformed event
      const malformedEvent = {
        eventType: 'INVALID_EVENT',
        payload: null,
        metadata: undefined
      };

      act(() => {
        if (capturedCallback) {
          try {
            capturedCallback(malformedEvent as any);
          } catch (error) {
            // Error should be caught and handled
          }
        }
      });

      await waitFor(() => {
        // Should not crash the hook
        expect(result.current.connectionState).toBe('connected');
        // Malformed event should not be added to messages
        expect(result.current.messages).not.toContainEqual(malformedEvent);
      });
    });

    it('should implement circuit breaker for repeated failures', async () => {
      const weddingId = 'wedding-123';
      const vendorId = 'photographer-456';

      const { result } = renderHook(() => useRealtime({
        weddingId,
        vendorId,
        vendorType: 'photographer',
        enableCircuitBreaker: true,
        circuitBreakerThreshold: 3
      }));

      // Simulate repeated failures
      for (let i = 0; i < 4; i++) {
        act(() => {
          result.current.reportError(new Error(`Connection failure ${i + 1}`));
        });
      }

      await waitFor(() => {
        expect(result.current.isCircuitBreakerOpen()).toBe(true);
        expect(result.current.connectionState).toBe('circuit_breaker_open');
      });

      // Circuit breaker should prevent new connection attempts
      act(() => {
        result.current.attemptReconnection();
      });

      expect(mockSubscriptionManager.subscribeToWeddingUpdates).not.toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance Optimization', () => {
    it('should debounce rapid message sending', async () => {
      const weddingId = 'wedding-123';
      const vendorId = 'photographer-456';

      const { result } = renderHook(() => useRealtime({
        weddingId,
        vendorId,
        vendorType: 'photographer',
        enableMessageDebouncing: true,
        debounceMs: 100
      }));

      // Send multiple messages rapidly
      const messages = [
        { type: 'status_update', content: 'Setting up equipment' },
        { type: 'status_update', content: 'Testing lights' },
        { type: 'status_update', content: 'Ready for ceremony' }
      ];

      messages.forEach(message => {
        act(() => {
          result.current.sendMessage(message);
        });
      });

      // Only the last message should be sent after debounce
      await waitFor(() => {
        expect(mockSubscriptionManager.sendMessage).toHaveBeenCalledTimes(1);
        expect(mockSubscriptionManager.sendMessage).toHaveBeenLastCalledWith(
          weddingId,
          vendorId,
          messages[messages.length - 1]
        );
      });
    });

    it('should cleanup resources on unmount', () => {
      const weddingId = 'wedding-123';
      const vendorId = 'photographer-456';

      const { unmount } = renderHook(() => useRealtime({
        weddingId,
        vendorId,
        vendorType: 'photographer'
      }));

      unmount();

      expect(mockSubscriptionManager.cleanup).toHaveBeenCalled();
    });

    it('should limit message history to prevent memory bloat', async () => {
      const weddingId = 'wedding-123';
      const vendorId = 'photographer-456';
      let capturedCallback: ((event: RealtimeEvent) => void) | null = null;

      mockSubscriptionManager.subscribeToWeddingUpdates.mockImplementation((wId, vId, callback) => {
        capturedCallback = callback;
        return Promise.resolve();
      });

      const { result } = renderHook(() => useRealtime({
        weddingId,
        vendorId,
        vendorType: 'photographer',
        maxMessageHistory: 50
      }));

      await waitFor(() => {
        expect(mockSubscriptionManager.subscribeToWeddingUpdates).toHaveBeenCalled();
      });

      // Simulate receiving 60 messages
      for (let i = 0; i < 60; i++) {
        const event: RealtimeEvent = {
          eventType: 'GUEST_MESSAGE',
          payload: {
            message: `Message ${i}`,
            guestId: `guest-${i}`,
            weddingId,
            timestamp: new Date().toISOString()
          },
          metadata: {
            source: 'guest_app',
            priority: 'low'
          }
        };

        act(() => {
          if (capturedCallback) {
            capturedCallback(event);
          }
        });
      }

      await waitFor(() => {
        // Should only keep the latest 50 messages
        expect(result.current.messages).toHaveLength(50);
        expect(result.current.messages[0].payload.message).toBe('Message 10'); // Oldest kept
        expect(result.current.messages[49].payload.message).toBe('Message 59'); // Newest
      });
    });
  });

  describe('Wedding Day Critical Operations', () => {
    it('should enable high-priority mode for Saturday weddings', () => {
      const weddingId = 'saturday-wedding-123';
      const vendorId = 'photographer-456';
      const mockSaturday = new Date('2025-02-01T10:00:00Z'); // Saturday
      
      jest.spyOn(Date, 'now').mockReturnValue(mockSaturday.getTime());

      const { result } = renderHook(() => useRealtime({
        weddingId,
        vendorId,
        vendorType: 'photographer',
        weddingDate: '2025-02-01'
      }));

      expect(result.current.isWeddingDay()).toBe(true);
      expect(result.current.isHighPriorityMode()).toBe(true);
      expect(result.current.getHeartbeatInterval()).toBe(5000); // 5-second heartbeat
    });

    it('should prioritize critical vendor messages during ceremony', async () => {
      const weddingId = 'wedding-123';
      const vendorId = 'photographer-456';
      let capturedCallback: ((event: RealtimeEvent) => void) | null = null;

      mockSubscriptionManager.subscribeToWeddingUpdates.mockImplementation((wId, vId, callback) => {
        capturedCallback = callback;
        return Promise.resolve();
      });

      const { result } = renderHook(() => useRealtime({
        weddingId,
        vendorId,
        vendorType: 'photographer',
        enablePriorityProcessing: true
      }));

      await waitFor(() => {
        expect(mockSubscriptionManager.subscribeToWeddingUpdates).toHaveBeenCalled();
      });

      // Send mixed priority events
      const lowPriorityEvent: RealtimeEvent = {
        eventType: 'GUEST_MESSAGE',
        payload: { message: 'Great ceremony!', guestId: 'guest-1', weddingId },
        metadata: { source: 'guest_app', priority: 'low' }
      };

      const criticalEvent: RealtimeEvent = {
        eventType: 'VENDOR_EMERGENCY',
        payload: { message: 'Sound system malfunction!', vendorId: 'dj-123', weddingId },
        metadata: { source: 'vendor_portal', priority: 'critical' }
      };

      act(() => {
        if (capturedCallback) {
          capturedCallback(lowPriorityEvent);
          capturedCallback(criticalEvent);
        }
      });

      await waitFor(() => {
        // Critical message should be processed first
        expect(result.current.priorityQueue[0]).toEqual(criticalEvent);
        expect(result.current.messages[0]).toEqual(criticalEvent);
      });
    });
  });

  describe('Type Safety & Validation', () => {
    it('should enforce strict TypeScript typing', () => {
      const weddingId = 'wedding-123';
      const vendorId = 'photographer-456';

      const { result } = renderHook(() => useRealtime({
        weddingId,
        vendorId,
        vendorType: 'photographer'
      }));

      // TypeScript should enforce proper typing
      expect(typeof result.current.weddingId).toBe('string');
      expect(typeof result.current.vendorId).toBe('string');
      expect(typeof result.current.isConnected).toBe('boolean');
      expect(Array.isArray(result.current.messages)).toBe(true);
      
      // No 'any' types should be present
      // @ts-expect-error - Should fail compilation if any types exist
      const invalidAccess: any = result.current.someInvalidProperty;
    });

    it('should validate hook parameters at runtime', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Invalid vendor type should trigger validation error
      const { result } = renderHook(() => useRealtime({
        weddingId: 'wedding-123',
        vendorId: 'vendor-456',
        vendorType: 'invalid_type' as any
      }));

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid vendor type: invalid_type')
      );

      consoleSpy.mockRestore();
    });
  });
});