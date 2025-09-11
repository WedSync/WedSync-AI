/**
 * useBroadcastSubscription Hook Unit Tests - WS-205 Broadcast Events System
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useBroadcastSubscription } from '@/hooks/useBroadcastSubscription';
import type { BroadcastMessage } from '@/lib/broadcast/priority-queue';

// Mock Supabase
const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  send: vi.fn(),
};

const mockSupabase = {
  channel: vi.fn().mockReturnValue(mockChannel),
  removeChannel: vi.fn(),
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}));

// Mock fetch globally
global.fetch = vi.fn();

const mockBroadcastMessage: BroadcastMessage = {
  id: 'test-broadcast-1',
  type: 'test.message',
  priority: 'normal',
  title: 'Test Notification',
  message: 'This is a test notification',
  deliveredAt: new Date(),
};

const mockWeddingBroadcast: BroadcastMessage = {
  id: 'wedding-broadcast-1',
  type: 'wedding.update',
  priority: 'high',
  title: 'Wedding Update',
  message: 'Important wedding update',
  deliveredAt: new Date(),
  weddingContext: {
    weddingId: 'wedding-123',
    coupleName: 'John & Jane',
    weddingDate: new Date('2024-06-15'),
  },
};

describe('useBroadcastSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    // Mock successful subscription
    mockChannel.subscribe.mockImplementation((callback) => {
      setTimeout(() => callback('SUBSCRIBED'), 0);
      return { error: null };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should initialize with connecting state', () => {
      const { result } = renderHook(() => useBroadcastSubscription('user-123'));

      expect(result.current.connectionStatus).toBe('connecting');
      expect(result.current.broadcasts).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
    });

    it('should connect successfully and update status', async () => {
      const { result } = renderHook(() => useBroadcastSubscription('user-123'));

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      expect(mockSupabase.channel).toHaveBeenCalledWith(
        'broadcasts:user:user-123',
        {
          config: {
            broadcast: { self: true },
            presence: { key: 'user-123' },
          },
        },
      );
    });

    it('should create wedding-specific channel when weddingId provided', async () => {
      const { result } = renderHook(() =>
        useBroadcastSubscription('user-123', 'wedding-456'),
      );

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      expect(mockSupabase.channel).toHaveBeenCalledWith(
        'broadcasts:user:user-123:wedding:wedding-456',
        expect.any(Object),
      );
    });
  });

  describe('Message Handling', () => {
    it('should process broadcast messages', async () => {
      const onMessage = vi.fn();
      const { result } = renderHook(() =>
        useBroadcastSubscription('user-123', undefined, { onMessage }),
      );

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      // Simulate receiving a message
      const messageHandler = mockChannel.on.mock.calls.find(
        (call) => call[0] === 'broadcast' && call[1].event === '*',
      )?.[2];

      act(() => {
        messageHandler?.({
          payload: {
            id: 'test-msg-1',
            type: 'test.message',
            priority: 'normal',
            title: 'Test',
            message: 'Test message',
            delivered_at: new Date().toISOString(),
          },
        });
      });

      await waitFor(() => {
        expect(result.current.broadcasts).toHaveLength(1);
        expect(result.current.unreadCount).toBe(1);
        expect(onMessage).toHaveBeenCalled();
      });
    });

    it('should handle urgent messages with critical priority', async () => {
      const { result } = renderHook(() => useBroadcastSubscription('user-123'));

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      // Simulate receiving urgent message
      const urgentHandler = mockChannel.on.mock.calls.find(
        (call) => call[0] === 'broadcast' && call[1].event === 'urgent',
      )?.[2];

      act(() => {
        urgentHandler?.({
          payload: {
            id: 'urgent-msg-1',
            type: 'wedding.cancelled',
            title: 'Wedding Cancelled',
            message: 'Urgent: Wedding has been cancelled',
            delivered_at: new Date().toISOString(),
          },
        });
      });

      await waitFor(() => {
        expect(result.current.broadcasts).toHaveLength(1);
        expect(result.current.broadcasts[0].priority).toBe('critical');
      });
    });
  });

  describe('Role-Based Filtering', () => {
    it('should filter messages for couple role', async () => {
      const { result } = renderHook(() =>
        useBroadcastSubscription('user-123', undefined, { userRole: 'couple' }),
      );

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      const messageHandler = mockChannel.on.mock.calls.find(
        (call) => call[0] === 'broadcast' && call[1].event === '*',
      )?.[2];

      // Should filter out supplier internal messages for couples
      act(() => {
        messageHandler?.({
          payload: {
            id: 'supplier-msg-1',
            type: 'supplier.internal.update',
            priority: 'normal',
            title: 'Internal Supplier Update',
            message: 'Internal supplier message',
            delivered_at: new Date().toISOString(),
          },
        });
      });

      await waitFor(() => {
        expect(result.current.broadcasts).toHaveLength(0);
      });

      // Should accept wedding updates for couples
      act(() => {
        messageHandler?.({
          payload: {
            id: 'wedding-msg-1',
            type: 'wedding.update',
            priority: 'normal',
            title: 'Wedding Update',
            message: 'Wedding update for couple',
            delivered_at: new Date().toISOString(),
          },
        });
      });

      await waitFor(() => {
        expect(result.current.broadcasts).toHaveLength(1);
      });
    });

    it('should filter messages for photographer role', async () => {
      const { result } = renderHook(() =>
        useBroadcastSubscription('user-123', undefined, {
          userRole: 'photographer',
        }),
      );

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      const messageHandler = mockChannel.on.mock.calls.find(
        (call) => call[0] === 'broadcast' && call[1].event === '*',
      )?.[2];

      // Should filter out irrelevant messages for photographers
      act(() => {
        messageHandler?.({
          payload: {
            id: 'admin-msg-1',
            type: 'admin.system.update',
            priority: 'normal',
            title: 'System Update',
            message: 'Admin system update',
            delivered_at: new Date().toISOString(),
          },
        });
      });

      await waitFor(() => {
        expect(result.current.broadcasts).toHaveLength(0);
      });

      // Should accept timeline messages for photographers
      act(() => {
        messageHandler?.({
          payload: {
            id: 'timeline-msg-1',
            type: 'timeline.changed',
            priority: 'normal',
            title: 'Timeline Changed',
            message: 'Wedding timeline has been updated',
            delivered_at: new Date().toISOString(),
          },
        });
      });

      await waitFor(() => {
        expect(result.current.broadcasts).toHaveLength(1);
      });
    });
  });

  describe('Wedding Context Filtering', () => {
    it('should filter messages by wedding context', async () => {
      const { result } = renderHook(() =>
        useBroadcastSubscription('user-123', 'wedding-456'),
      );

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      const messageHandler = mockChannel.on.mock.calls.find(
        (call) => call[0] === 'broadcast' && call[1].event === '*',
      )?.[2];

      // Should filter out messages for different weddings
      act(() => {
        messageHandler?.({
          payload: {
            id: 'other-wedding-msg-1',
            type: 'wedding.update',
            priority: 'normal',
            title: 'Other Wedding Update',
            message: 'Update for different wedding',
            delivered_at: new Date().toISOString(),
            wedding_context: {
              weddingId: 'wedding-789',
              coupleName: 'Other Couple',
              weddingDate: new Date().toISOString(),
            },
          },
        });
      });

      await waitFor(() => {
        expect(result.current.broadcasts).toHaveLength(0);
      });

      // Should accept messages for the correct wedding
      act(() => {
        messageHandler?.({
          payload: {
            id: 'correct-wedding-msg-1',
            type: 'wedding.update',
            priority: 'normal',
            title: 'Wedding Update',
            message: 'Update for correct wedding',
            delivered_at: new Date().toISOString(),
            wedding_context: {
              weddingId: 'wedding-456',
              coupleName: 'Test Couple',
              weddingDate: new Date().toISOString(),
            },
          },
        });
      });

      await waitFor(() => {
        expect(result.current.broadcasts).toHaveLength(1);
      });
    });
  });

  describe('Message Management', () => {
    it('should mark messages as read', async () => {
      const { result } = renderHook(() => useBroadcastSubscription('user-123'));

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      // Add a message first
      const messageHandler = mockChannel.on.mock.calls.find(
        (call) => call[0] === 'broadcast' && call[1].event === '*',
      )?.[2];

      act(() => {
        messageHandler?.({
          payload: {
            id: 'test-msg-1',
            type: 'test.message',
            priority: 'normal',
            title: 'Test',
            message: 'Test message',
            delivered_at: new Date().toISOString(),
          },
        });
      });

      await waitFor(() => {
        expect(result.current.unreadCount).toBe(1);
      });

      // Mark as read
      await act(async () => {
        await result.current.markAsRead('test-msg-1');
      });

      await waitFor(() => {
        expect(result.current.unreadCount).toBe(0);
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/broadcast/read-receipt',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messageId: 'test-msg-1',
              readAt: expect.any(String),
            }),
          },
        );
      });
    });

    it('should clear all messages', async () => {
      const { result } = renderHook(() => useBroadcastSubscription('user-123'));

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      // Add messages
      const messageHandler = mockChannel.on.mock.calls.find(
        (call) => call[0] === 'broadcast' && call[1].event === '*',
      )?.[2];

      act(() => {
        messageHandler?.({
          payload: {
            id: 'test-msg-1',
            type: 'test.message',
            priority: 'normal',
            title: 'Test 1',
            message: 'Test message 1',
            delivered_at: new Date().toISOString(),
          },
        });
        messageHandler?.({
          payload: {
            id: 'test-msg-2',
            type: 'test.message',
            priority: 'normal',
            title: 'Test 2',
            message: 'Test message 2',
            delivered_at: new Date().toISOString(),
          },
        });
      });

      await waitFor(() => {
        expect(result.current.broadcasts).toHaveLength(2);
        expect(result.current.unreadCount).toBe(2);
      });

      // Clear messages
      act(() => {
        result.current.clearMessages();
      });

      expect(result.current.broadcasts).toHaveLength(0);
      expect(result.current.unreadCount).toBe(0);
    });
  });

  describe('Connection Management', () => {
    it('should handle connection errors', async () => {
      const onError = vi.fn();
      mockChannel.subscribe.mockImplementation(() => ({
        error: new Error('Connection failed'),
      }));

      const { result } = renderHook(() =>
        useBroadcastSubscription('user-123', undefined, { onError }),
      );

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('failed');
        expect(result.current.lastError).toBeInstanceOf(Error);
        expect(onError).toHaveBeenCalled();
      });
    });

    it('should attempt reconnection on failure', async () => {
      const { result } = renderHook(() =>
        useBroadcastSubscription('user-123', undefined, {
          autoReconnect: true,
          maxReconnectAttempts: 2,
          reconnectInterval: 100,
        }),
      );

      // Simulate initial connection failure
      mockChannel.subscribe.mockImplementationOnce(() => ({
        error: new Error('Connection failed'),
      }));

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('failed');
      });

      // Mock successful reconnection
      mockChannel.subscribe.mockImplementationOnce((callback) => {
        setTimeout(() => callback('SUBSCRIBED'), 0);
        return { error: null };
      });

      // Wait for reconnection attempt
      await waitFor(
        () => {
          expect(result.current.connectionStatus).toBe('connecting');
        },
        { timeout: 200 },
      );

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });
    });

    it('should disconnect on unmount', () => {
      const { unmount } = renderHook(() =>
        useBroadcastSubscription('user-123'),
      );

      unmount();

      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
    });
  });

  describe('Metrics and Analytics', () => {
    it('should track metrics when enabled', async () => {
      const { result } = renderHook(() =>
        useBroadcastSubscription('user-123', undefined, {
          enableMetrics: true,
        }),
      );

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      const messageHandler = mockChannel.on.mock.calls.find(
        (call) => call[0] === 'broadcast' && call[1].event === '*',
      )?.[2];

      act(() => {
        messageHandler?.({
          payload: {
            id: 'test-msg-1',
            type: 'test.message',
            priority: 'normal',
            title: 'Test',
            message: 'Test message',
            delivered_at: new Date().toISOString(),
          },
        });
      });

      await waitFor(() => {
        expect(result.current.metrics.messagesReceived).toBe(1);
        expect(typeof result.current.metrics.lastMessageTimestamp).toBe(
          'number',
        );
      });

      // Mark as read to track read metrics
      await act(async () => {
        await result.current.markAsRead('test-msg-1');
      });

      await waitFor(() => {
        expect(result.current.metrics.messagesRead).toBe(1);
      });
    });

    it('should provide queue statistics', async () => {
      const { result } = renderHook(() => useBroadcastSubscription('user-123'));

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      expect(result.current.queueStats).toBeDefined();
      expect(typeof result.current.queueStats.total).toBe('number');
      expect(typeof result.current.queueStats.byCritical).toBe('number');
    });
  });

  describe('Priority Filtering', () => {
    it('should filter messages by priority', async () => {
      const { result } = renderHook(() =>
        useBroadcastSubscription('user-123', undefined, {
          priorityFilter: ['critical', 'high'],
        }),
      );

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      const messageHandler = mockChannel.on.mock.calls.find(
        (call) => call[0] === 'broadcast' && call[1].event === '*',
      )?.[2];

      // Should filter out low priority messages
      act(() => {
        messageHandler?.({
          payload: {
            id: 'low-msg-1',
            type: 'test.message',
            priority: 'low',
            title: 'Low Priority',
            message: 'Low priority message',
            delivered_at: new Date().toISOString(),
          },
        });
      });

      await waitFor(() => {
        expect(result.current.broadcasts).toHaveLength(0);
      });

      // Should accept high priority messages
      act(() => {
        messageHandler?.({
          payload: {
            id: 'high-msg-1',
            type: 'test.message',
            priority: 'high',
            title: 'High Priority',
            message: 'High priority message',
            delivered_at: new Date().toISOString(),
          },
        });
      });

      await waitFor(() => {
        expect(result.current.broadcasts).toHaveLength(1);
      });
    });
  });
});
