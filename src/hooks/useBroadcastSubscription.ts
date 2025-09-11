'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  BroadcastMessage,
  BroadcastPriorityQueue,
  createWeddingBroadcastQueue,
} from '@/lib/broadcast/priority-queue';

export type BroadcastConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'failed';

interface BroadcastSubscriptionOptions {
  /**
   * Wedding context for filtering messages
   */
  weddingId?: string;

  /**
   * User role for role-based filtering
   */
  userRole?: 'couple' | 'coordinator' | 'supplier' | 'photographer';

  /**
   * Auto-reconnect settings
   */
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;

  /**
   * Message filtering
   */
  priorityFilter?: ('critical' | 'high' | 'normal' | 'low')[];
  typeFilter?: string[];

  /**
   * Callback functions
   */
  onConnect?: () => void;
  onDisconnect?: () => void;
  onMessage?: (message: BroadcastMessage) => void;
  onError?: (error: Error) => void;

  /**
   * Performance options
   */
  bufferMessages?: boolean;
  maxBufferSize?: number;
  enableMetrics?: boolean;
}

interface BroadcastMetrics {
  messagesReceived: number;
  messagesRead: number;
  connectionUptime: number;
  reconnectCount: number;
  lastMessageTimestamp?: number;
  averageMessageFrequency?: number;
}

/**
 * React hook for managing broadcast message subscriptions
 * Optimized for wedding industry real-time notifications
 */
export function useBroadcastSubscription(
  userId: string,
  weddingId?: string,
  options: BroadcastSubscriptionOptions = {},
) {
  const {
    userRole,
    autoReconnect = true,
    reconnectInterval = 2000,
    maxReconnectAttempts = 5,
    priorityFilter,
    typeFilter,
    onConnect,
    onDisconnect,
    onMessage,
    onError,
    bufferMessages = true,
    maxBufferSize = 50,
    enableMetrics = true,
  } = options;

  // State management
  const [connectionStatus, setConnectionStatus] =
    useState<BroadcastConnectionStatus>('connecting');
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastError, setLastError] = useState<Error | null>(null);
  const [metrics, setMetrics] = useState<BroadcastMetrics>({
    messagesReceived: 0,
    messagesRead: 0,
    connectionUptime: 0,
    reconnectCount: 0,
  });

  // Refs for managing subscriptions and intervals
  const supabaseRef = useRef(createClient());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const messageQueueRef = useRef<BroadcastPriorityQueue>(
    createWeddingBroadcastQueue(),
  );
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const metricsIntervalRef = useRef<NodeJS.Timeout>();
  const connectionStartTimeRef = useRef<number>();
  const reconnectAttemptsRef = useRef(0);

  /**
   * Filter messages based on user role and preferences
   */
  const shouldShowMessage = useCallback(
    (message: BroadcastMessage): boolean => {
      // Priority filter
      if (priorityFilter && !priorityFilter.includes(message.priority)) {
        return false;
      }

      // Type filter
      if (
        typeFilter &&
        !typeFilter.some((type) => message.type.includes(type))
      ) {
        return false;
      }

      // Wedding context filter
      if (weddingId && message.weddingContext) {
        if (message.weddingContext.weddingId !== weddingId) {
          return false;
        }
      }

      // Role-based filtering for wedding industry
      if (userRole) {
        // Couples don't need internal supplier notifications
        if (
          userRole === 'couple' &&
          message.type.startsWith('supplier.internal')
        ) {
          return false;
        }

        // Suppliers don't need admin notifications
        if (userRole === 'supplier' && message.type.startsWith('admin.')) {
          return false;
        }

        // Photographers need timeline and payment specific messages
        if (userRole === 'photographer') {
          const photographerTypes = [
            'timeline.',
            'payment.',
            'wedding.cancelled',
            'venue.changed',
            'weather.',
            'maintenance.',
          ];
          const isRelevant =
            photographerTypes.some((type) => message.type.startsWith(type)) ||
            message.priority === 'critical';

          if (!isRelevant) {
            return false;
          }
        }

        // Check target roles if specified
        if (message.targetRoles && !message.targetRoles.includes(userRole)) {
          return false;
        }
      }

      // Check expiration
      if (message.expiresAt && new Date() > message.expiresAt) {
        return false;
      }

      return true;
    },
    [priorityFilter, typeFilter, weddingId, userRole],
  );

  /**
   * Handle incoming broadcast message
   */
  const handleBroadcastMessage = useCallback(
    (payload: any) => {
      try {
        const message: BroadcastMessage = {
          id: payload.id || `broadcast-${Date.now()}`,
          type: payload.type || 'unknown',
          priority: payload.priority || 'normal',
          title: payload.title || 'New notification',
          message: payload.message || '',
          action: payload.action,
          weddingContext: payload.wedding_context,
          expiresAt: payload.expires_at
            ? new Date(payload.expires_at)
            : undefined,
          deliveredAt: payload.delivered_at
            ? new Date(payload.delivered_at)
            : new Date(),
          targetRoles: payload.target_roles,
          metadata: payload.metadata,
        };

        // Filter message
        if (!shouldShowMessage(message)) {
          return;
        }

        // Add to priority queue
        messageQueueRef.current.enqueue(message);

        // Update state
        setBroadcasts((prev) => {
          const updated = [...prev, message];
          // Keep only last 100 messages to prevent memory issues
          return updated.slice(-100);
        });

        // Update unread count if message is not already read
        if (!message.readAt) {
          setUnreadCount((prev) => prev + 1);
        }

        // Update metrics
        if (enableMetrics) {
          setMetrics((prev) => {
            const now = Date.now();
            const timeSinceLastMessage = prev.lastMessageTimestamp
              ? now - prev.lastMessageTimestamp
              : 0;

            // Calculate moving average of message frequency
            const newFrequency = prev.averageMessageFrequency
              ? (prev.averageMessageFrequency + timeSinceLastMessage) / 2
              : timeSinceLastMessage;

            return {
              ...prev,
              messagesReceived: prev.messagesReceived + 1,
              lastMessageTimestamp: now,
              averageMessageFrequency: newFrequency,
            };
          });
        }

        // Call callback
        onMessage?.(message);

        // Log wedding-specific analytics
        if (message.weddingContext) {
          logWeddingBroadcastReceived(message);
        }
      } catch (error) {
        console.error('Error processing broadcast message:', error);
        onError?.(error as Error);
      }
    },
    [shouldShowMessage, enableMetrics, onMessage, onError],
  );

  /**
   * Connect to broadcast channel
   */
  const connect = useCallback(async () => {
    try {
      setConnectionStatus('connecting');
      setLastError(null);

      // Disconnect any existing channel
      if (channelRef.current) {
        await supabaseRef.current.removeChannel(channelRef.current);
      }

      // Create channel name based on user and optional wedding context
      const channelName = weddingId
        ? `broadcasts:user:${userId}:wedding:${weddingId}`
        : `broadcasts:user:${userId}`;

      // Create realtime channel
      const channel = supabaseRef.current.channel(channelName, {
        config: {
          broadcast: { self: true },
          presence: { key: userId },
        },
      });

      channelRef.current = channel;

      // Listen for broadcast messages
      channel
        .on('broadcast', { event: 'message' }, ({ payload }) => {
          handleBroadcastMessage(payload);
        })
        .on('broadcast', { event: 'urgent' }, ({ payload }) => {
          // Handle urgent messages with immediate display
          handleBroadcastMessage({ ...payload, priority: 'critical' });
        });

      // Subscribe to channel
      const { error } = await channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          reconnectAttemptsRef.current = 0;
          connectionStartTimeRef.current = Date.now();

          onConnect?.();

          // Start metrics tracking if enabled
          if (enableMetrics) {
            metricsIntervalRef.current = setInterval(() => {
              setMetrics((prev) => ({
                ...prev,
                connectionUptime: connectionStartTimeRef.current
                  ? Date.now() - connectionStartTimeRef.current
                  : 0,
              }));
            }, 1000);
          }
        } else if (status === 'CHANNEL_ERROR') {
          throw new Error('Channel subscription failed');
        } else if (status === 'CLOSED') {
          handleDisconnect();
        }
      });

      if (error) throw error;
    } catch (error) {
      console.error('Broadcast connection error:', error);
      setLastError(error as Error);
      setConnectionStatus('failed');
      onError?.(error as Error);

      // Attempt reconnection if enabled
      if (
        autoReconnect &&
        reconnectAttemptsRef.current < maxReconnectAttempts
      ) {
        attemptReconnect();
      }
    }
  }, [
    userId,
    weddingId,
    handleBroadcastMessage,
    onConnect,
    onError,
    autoReconnect,
    maxReconnectAttempts,
    enableMetrics,
  ]);

  /**
   * Handle disconnection and cleanup
   */
  const handleDisconnect = useCallback(() => {
    setConnectionStatus('disconnected');
    onDisconnect?.();

    // Clear metrics interval
    if (metricsIntervalRef.current) {
      clearInterval(metricsIntervalRef.current);
    }

    // Attempt reconnection if enabled
    if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
      attemptReconnect();
    }
  }, [onDisconnect, autoReconnect, maxReconnectAttempts]);

  /**
   * Attempt to reconnect with exponential backoff
   */
  const attemptReconnect = useCallback(() => {
    setConnectionStatus('reconnecting');

    const delay = reconnectInterval * Math.pow(2, reconnectAttemptsRef.current);
    const maxDelay = 30000; // Max 30 seconds
    const actualDelay = Math.min(delay, maxDelay);

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current += 1;

      if (enableMetrics) {
        setMetrics((prev) => ({
          ...prev,
          reconnectCount: prev.reconnectCount + 1,
        }));
      }

      connect();
    }, actualDelay);
  }, [reconnectInterval, connect, enableMetrics]);

  /**
   * Disconnect from broadcast channel
   */
  const disconnect = useCallback(() => {
    // Clear reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    // Clear metrics interval
    if (metricsIntervalRef.current) {
      clearInterval(metricsIntervalRef.current);
    }

    // Remove channel
    if (channelRef.current) {
      supabaseRef.current.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setConnectionStatus('disconnected');
  }, []);

  /**
   * Mark message as read
   */
  const markAsRead = useCallback(
    async (messageId: string) => {
      try {
        // Update local state
        setBroadcasts((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, readAt: new Date() } : msg,
          ),
        );

        // Update unread count
        setUnreadCount((prev) => Math.max(0, prev - 1));

        // Update metrics
        if (enableMetrics) {
          setMetrics((prev) => ({
            ...prev,
            messagesRead: prev.messagesRead + 1,
          }));
        }

        // Send read receipt to API
        await fetch('/api/broadcast/read-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageId,
            readAt: new Date().toISOString(),
          }),
        });
      } catch (error) {
        console.error('Failed to mark message as read:', error);
      }
    },
    [enableMetrics],
  );

  /**
   * Get next priority message from queue
   */
  const getNextMessage = useCallback((): BroadcastMessage | null => {
    return messageQueueRef.current.dequeue();
  }, []);

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    setBroadcasts([]);
    setUnreadCount(0);
    messageQueueRef.current.clear();
  }, []);

  /**
   * Initialize connection on mount
   */
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  /**
   * Clean up on unmount
   */
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    // Connection state
    connectionStatus,
    lastError,

    // Messages
    broadcasts,
    unreadCount,

    // Priority queue
    getNextMessage,

    // Actions
    markAsRead,
    clearMessages,
    connect,
    disconnect,

    // Metrics
    metrics,

    // Queue stats (for debugging)
    queueStats: messageQueueRef.current.getStats(),
  };
}

/**
 * Log wedding-specific broadcast analytics
 */
function logWeddingBroadcastReceived(message: BroadcastMessage) {
  if (process.env.NODE_ENV === 'development') {
    console.log('Wedding broadcast received:', {
      messageId: message.id,
      priority: message.priority,
      wedding: message.weddingContext?.coupleName,
      type: message.type,
    });
  }

  // Wedding industry specific analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'wedding_broadcast_received', {
      priority: message.priority,
      message_type: message.type,
      wedding_id: message.weddingContext?.weddingId,
      days_until_wedding: message.weddingContext
        ? Math.ceil(
            (new Date(message.weddingContext.weddingDate).getTime() -
              Date.now()) /
              (1000 * 60 * 60 * 24),
          )
        : null,
    });
  }
}

/**
 * Hook for managing broadcast preferences
 */
export function useBroadcastPreferences(userId: string) {
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadPreferences = useCallback(async () => {
    try {
      const response = await fetch('/api/placeholder');
      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error('Failed to load broadcast preferences:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const updatePreferences = useCallback(async (newPreferences: any) => {
    try {
      const response = await fetch('/api/broadcast/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPreferences),
      });

      if (response.ok) {
        setPreferences(newPreferences);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update preferences:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    if (userId) {
      loadPreferences();
    }
  }, [userId, loadPreferences]);

  return {
    preferences,
    loading,
    updatePreferences,
    reload: loadPreferences,
  };
}
