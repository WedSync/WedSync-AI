'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  RealtimeChannel,
  RealtimeChannelSendResponse,
} from '@supabase/supabase-js';

export type ConnectionState =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'failed';

interface RealtimeConnectionOptions {
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  exponentialBackoff?: boolean;
  maxBackoffDelay?: number;
  bufferMessages?: boolean;
  maxBufferSize?: number;
  measureLatency?: boolean;
  latencyInterval?: number;
  trackMetrics?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onReconnect?: () => void;
  onError?: (error: Error) => void;
  onMessage?: (message: any) => void;
  onMaxReconnectReached?: () => void;
}

interface ConnectionMetrics {
  messagesSent: number;
  messagesReceived: number;
  reconnectCount: number;
  uptimeMs: number;
  averageLatency: number;
  lastError?: Error;
  connectionStartTime?: number;
}

export function useRealtimeConnection(
  channelName: string,
  options: RealtimeConnectionOptions = {},
) {
  const {
    autoReconnect = true,
    reconnectInterval = 1000,
    maxReconnectAttempts = 10,
    exponentialBackoff = true,
    maxBackoffDelay = 30000,
    bufferMessages = true,
    maxBufferSize = 100,
    measureLatency = false,
    latencyInterval = 10000,
    trackMetrics = false,
    onConnect,
    onDisconnect,
    onReconnect,
    onError,
    onMessage,
    onMaxReconnectReached,
  } = options;

  const supabase = await createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>('connecting');
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [latency, setLatency] = useState<number | null>(null);
  const [lastError, setLastError] = useState<Error | null>(null);
  const [messageBuffer, setMessageBuffer] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<ConnectionMetrics>({
    messagesSent: 0,
    messagesReceived: 0,
    reconnectCount: 0,
    uptimeMs: 0,
    averageLatency: 0,
  });

  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const latencyIntervalRef = useRef<NodeJS.Timeout>();
  const metricsIntervalRef = useRef<NodeJS.Timeout>();
  const connectionStartTimeRef = useRef<number>();

  // Calculate reconnect delay with exponential backoff
  const getReconnectDelay = useCallback(() => {
    if (!exponentialBackoff) return reconnectInterval;
    const delay = Math.min(
      reconnectInterval * Math.pow(2, reconnectAttempt),
      maxBackoffDelay,
    );
    return delay;
  }, [
    reconnectAttempt,
    reconnectInterval,
    exponentialBackoff,
    maxBackoffDelay,
  ]);

  // Send message with buffering support
  const send = useCallback(
    async (message: any): Promise<RealtimeChannelSendResponse | void> => {
      if (!isConnected && bufferMessages) {
        setMessageBuffer((prev) => {
          const newBuffer = [...prev, message];
          return newBuffer.slice(-maxBufferSize); // Keep only last N messages
        });
        return;
      }

      if (!channelRef.current || !isConnected) {
        throw new Error('Channel not connected');
      }

      if (trackMetrics) {
        setMetrics((prev) => ({
          ...prev,
          messagesSent: prev.messagesSent + 1,
        }));
      }

      return channelRef.current.send({
        type: 'broadcast',
        event: 'message',
        payload: message,
      });
    },
    [isConnected, bufferMessages, maxBufferSize, trackMetrics],
  );

  // Flush message buffer after reconnection
  const flushMessageBuffer = useCallback(async () => {
    if (messageBuffer.length === 0) return;

    const bufferedMessages = [...messageBuffer];
    setMessageBuffer([]);

    for (const message of bufferedMessages) {
      try {
        await send(message);
      } catch (error) {
        console.error('Failed to send buffered message:', error);
      }
    }
  }, [messageBuffer, send]);

  // Measure connection latency
  const measureConnectionLatency = useCallback(async () => {
    if (!channelRef.current || !isConnected) return;

    const startTime = Date.now();

    try {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'ping',
        payload: { timestamp: startTime },
      });

      // In a real implementation, we'd wait for the pong response
      // For now, simulate with a simple round-trip estimate
      const endTime = Date.now();
      const roundTripTime = endTime - startTime;
      setLatency(roundTripTime);

      if (trackMetrics) {
        setMetrics((prev) => {
          const samples = prev.averageLatency ? 1 : 0;
          const newAverage =
            (prev.averageLatency * samples + roundTripTime) / (samples + 1);
          return {
            ...prev,
            averageLatency: newAverage,
          };
        });
      }
    } catch (error) {
      console.error('Latency measurement failed:', error);
    }
  }, [isConnected, trackMetrics]);

  // Connect to channel
  const connect = useCallback(async () => {
    try {
      setConnectionState('connecting');

      const channel = supabase.channel(channelName);
      channelRef.current = channel;

      // Set up message handler
      channel.on('broadcast', { event: '*' }, (payload) => {
        if (trackMetrics) {
          setMetrics((prev) => ({
            ...prev,
            messagesReceived: prev.messagesReceived + 1,
          }));
        }
        onMessage?.(payload);
      });

      // Subscribe to channel
      const { error } = await channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setConnectionState('connected');
          setReconnectAttempt(0);
          connectionStartTimeRef.current = Date.now();

          if (trackMetrics) {
            setMetrics((prev) => ({
              ...prev,
              connectionStartTime: Date.now(),
            }));
          }

          // Flush any buffered messages
          flushMessageBuffer();

          // Notify connection
          if (reconnectAttempt > 0) {
            onReconnect?.();
          } else {
            onConnect?.();
          }

          // Start latency measurement if enabled
          if (measureLatency) {
            latencyIntervalRef.current = setInterval(
              measureConnectionLatency,
              latencyInterval,
            );
          }

          // Start metrics tracking
          if (trackMetrics) {
            metricsIntervalRef.current = setInterval(() => {
              setMetrics((prev) => ({
                ...prev,
                uptimeMs: connectionStartTimeRef.current
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
      console.error('Connection error:', error);
      setLastError(error as Error);
      onError?.(error as Error);
      handleDisconnect();
    }
  }, [
    channelName,
    supabase,
    reconnectAttempt,
    measureLatency,
    latencyInterval,
    trackMetrics,
    onConnect,
    onReconnect,
    onMessage,
    onError,
    flushMessageBuffer,
    measureConnectionLatency,
  ]);

  // Handle disconnection
  const handleDisconnect = useCallback(() => {
    setIsConnected(false);
    setConnectionState('disconnected');
    onDisconnect?.();

    // Clear intervals
    if (latencyIntervalRef.current) {
      clearInterval(latencyIntervalRef.current);
    }
    if (metricsIntervalRef.current) {
      clearInterval(metricsIntervalRef.current);
    }

    // Attempt reconnection if enabled
    if (autoReconnect && reconnectAttempt < maxReconnectAttempts) {
      setConnectionState('reconnecting');
      const delay = getReconnectDelay();

      reconnectTimeoutRef.current = setTimeout(() => {
        setReconnectAttempt((prev) => prev + 1);

        if (trackMetrics) {
          setMetrics((prev) => ({
            ...prev,
            reconnectCount: prev.reconnectCount + 1,
          }));
        }

        connect();
      }, delay);
    } else if (reconnectAttempt >= maxReconnectAttempts) {
      setConnectionState('failed');
      onMaxReconnectReached?.();
    }
  }, [
    autoReconnect,
    reconnectAttempt,
    maxReconnectAttempts,
    getReconnectDelay,
    trackMetrics,
    connect,
    onDisconnect,
    onMaxReconnectReached,
  ]);

  // Disconnect from channel
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (latencyIntervalRef.current) {
      clearInterval(latencyIntervalRef.current);
    }
    if (metricsIntervalRef.current) {
      clearInterval(metricsIntervalRef.current);
    }

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setIsConnected(false);
    setConnectionState('disconnected');
  }, [supabase]);

  // Test helpers for unit tests
  const simulateDisconnect = useCallback(() => {
    handleDisconnect();
  }, [handleDisconnect]);

  const simulateMessage = useCallback(
    (message: any) => {
      onMessage?.(message);
      if (trackMetrics) {
        setMetrics((prev) => ({
          ...prev,
          messagesReceived: prev.messagesReceived + 1,
        }));
      }
    },
    [onMessage, trackMetrics],
  );

  const simulateError = useCallback(
    (error: Error) => {
      setLastError(error);
      onError?.(error);
    },
    [onError],
  );

  const simulatePingResponse = useCallback((responseTime: number) => {
    setLatency(responseTime);
  }, []);

  // Initialize connection
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, []); // Only run on mount/unmount

  return {
    // Connection state
    isConnected,
    connectionState,
    reconnectAttempt,
    latency,
    lastError,

    // Message handling
    send,
    messageBuffer,

    // Metrics
    metrics,

    // Control methods
    connect,
    disconnect,

    // Test helpers
    simulateDisconnect,
    simulateMessage,
    simulateError,
    simulatePingResponse,
  };
}

// Presence tracking hook
interface PresenceOptions {
  userId: string;
  userData?: any;
  trackTyping?: boolean;
  trackActivity?: boolean;
  trackCursor?: boolean;
  idleTimeout?: number;
  awayTimeout?: number;
  presenceTimeout?: number;
  cursorThrottle?: number;
  onUserJoin?: (user: any) => void;
  onUserLeave?: (userId: string) => void;
  onCursorBroadcast?: (cursor: any) => void;
}

export function usePresence(roomName: string, options: PresenceOptions) {
  const {
    userId,
    userData = {},
    trackTyping = false,
    trackActivity = false,
    trackCursor = false,
    idleTimeout = 60000,
    awayTimeout = 300000,
    presenceTimeout = 30000,
    cursorThrottle = 50,
    onUserJoin,
    onUserLeave,
    onCursorBroadcast,
  } = options;

  const supabase = await createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [activeUserCount, setActiveUserCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [activityStatus, setActivityStatus] = useState<
    'active' | 'idle' | 'away'
  >('active');
  const [myCursor, setMyCursor] = useState<{
    x: number;
    y: number;
    elementId?: string;
  } | null>(null);
  const [otherCursors, setOtherCursors] = useState<any[]>([]);
  const [myPresence, setMyPresence] = useState<any>(userData);

  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const activityTimeoutRef = useRef<NodeJS.Timeout>();
  const cursorThrottleRef = useRef<NodeJS.Timeout>();
  const lastCursorUpdateRef = useRef<number>(0);

  // Initialize presence tracking
  useEffect(() => {
    if (!roomName || !userId) return;

    const channel = supabase.channel(roomName, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    // Handle presence sync
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.entries(state).map(
          ([key, presences]: [string, any]) => ({
            userId: key,
            ...presences[0],
          }),
        );

        setOnlineUsers(users);
        setActiveUserCount(users.filter((u) => u.status === 'active').length);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        const newUser = { userId: key, ...newPresences[0] };
        setOnlineUsers((prev) => [...prev, newUser]);
        onUserJoin?.(newUser);
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUsers((prev) => prev.filter((u) => u.userId !== key));
        onUserLeave?.(key);
      });

    // Handle typing indicators
    if (trackTyping) {
      channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
        const { userId: typingUserId, isTyping: userIsTyping } = payload;

        setTypingUsers((prev) => {
          if (userIsTyping && !prev.includes(typingUserId)) {
            return [...prev, typingUserId];
          } else if (!userIsTyping) {
            return prev.filter((id) => id !== typingUserId);
          }
          return prev;
        });
      });
    }

    // Handle cursor tracking
    if (trackCursor) {
      channel.on('broadcast', { event: 'cursor' }, ({ payload }) => {
        const { userId: cursorUserId, ...cursorData } = payload;

        setOtherCursors((prev) => {
          const existing = prev.findIndex((c) => c.userId === cursorUserId);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = { userId: cursorUserId, ...cursorData };
            return updated;
          } else {
            return [...prev, { userId: cursorUserId, ...cursorData }];
          }
        });
      });
    }

    // Subscribe and track initial presence
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setIsTracking(true);
        await channel.track({
          ...userData,
          status: activityStatus,
          onlineAt: Date.now(),
        });
      }
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [
    roomName,
    userId,
    userData,
    trackTyping,
    trackCursor,
    supabase,
    onUserJoin,
    onUserLeave,
    activityStatus,
  ]);

  // Update typing status
  const updateTypingStatus = useCallback(
    (typing: boolean) => {
      if (!channelRef.current || !trackTyping) return;

      setIsTyping(typing);

      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId, isTyping: typing },
      });

      // Auto-clear typing after timeout
      if (typing) {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
          channelRef.current?.send({
            type: 'broadcast',
            event: 'typing',
            payload: { userId, isTyping: false },
          });
        }, 3000);
      }
    },
    [userId, trackTyping],
  );

  // Update cursor position
  const updateCursor = useCallback(
    (cursor: { x: number; y: number; elementId?: string }) => {
      if (!channelRef.current || !trackCursor) return;

      setMyCursor(cursor);

      // Throttle cursor updates
      const now = Date.now();
      if (now - lastCursorUpdateRef.current < cursorThrottle) {
        if (cursorThrottleRef.current) {
          clearTimeout(cursorThrottleRef.current);
        }
        cursorThrottleRef.current = setTimeout(() => {
          channelRef.current?.send({
            type: 'broadcast',
            event: 'cursor',
            payload: { userId, ...cursor, timestamp: Date.now() },
          });
          onCursorBroadcast?.({ userId, ...cursor });
        }, cursorThrottle);
        return;
      }

      lastCursorUpdateRef.current = now;
      channelRef.current.send({
        type: 'broadcast',
        event: 'cursor',
        payload: { userId, ...cursor, timestamp: Date.now() },
      });
      onCursorBroadcast?.({ userId, ...cursor });
    },
    [userId, trackCursor, cursorThrottle, onCursorBroadcast],
  );

  // Report activity
  const reportActivity = useCallback(() => {
    if (!trackActivity) return;

    setActivityStatus('active');

    // Clear existing timeouts
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }

    // Set idle timeout
    activityTimeoutRef.current = setTimeout(() => {
      setActivityStatus('idle');

      // Set away timeout
      activityTimeoutRef.current = setTimeout(() => {
        setActivityStatus('away');
      }, awayTimeout - idleTimeout);
    }, idleTimeout);
  }, [trackActivity, idleTimeout, awayTimeout]);

  // Update presence data
  const updatePresence = useCallback(async (data: any) => {
    if (!channelRef.current) return;

    setMyPresence(data);
    await channelRef.current.track(data);
  }, []);

  // Clean stale presence
  const cleanStalePresence = useCallback(() => {
    const now = Date.now();
    setOnlineUsers((prev) =>
      prev.filter((user) => {
        const userTimestamp = user.timestamp || user.onlineAt;
        return userTimestamp && now - userTimestamp < presenceTimeout;
      }),
    );
  }, [presenceTimeout]);

  // Test helpers
  const simulateUserJoin = useCallback(
    (user: any) => {
      setOnlineUsers((prev) => [...prev, user]);
      onUserJoin?.(user);
    },
    [onUserJoin],
  );

  const simulateUserLeave = useCallback(
    (userId: string) => {
      setOnlineUsers((prev) => prev.filter((u) => u.userId !== userId));
      onUserLeave?.(userId);
    },
    [onUserLeave],
  );

  const simulatePresenceSync = useCallback((state: any) => {
    const users = Object.entries(state).map(([key, value]: [string, any]) => ({
      userId: key,
      ...value,
    }));
    setOnlineUsers(users);
    setActiveUserCount(users.filter((u) => u.status === 'active').length);
  }, []);

  const simulateUserTyping = useCallback(
    (userId: string, isTyping: boolean) => {
      setTypingUsers((prev) => {
        if (isTyping && !prev.includes(userId)) {
          return [...prev, userId];
        } else if (!isTyping) {
          return prev.filter((id) => id !== userId);
        }
        return prev;
      });
    },
    [],
  );

  const simulateCursorUpdate = useCallback((cursor: any) => {
    setOtherCursors((prev) => {
      const existing = prev.findIndex((c) => c.userId === cursor.userId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = cursor;
        return updated;
      } else {
        return [...prev, cursor];
      }
    });
  }, []);

  const disconnect = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.untrack();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setIsTracking(false);
  }, [supabase]);

  const connect = useCallback(async () => {
    // Re-initialize connection (implementation would go here)
    setIsTracking(true);
  }, []);

  return {
    // State
    isTracking,
    onlineUsers,
    activeUserCount,
    isTyping,
    typingUsers,
    activityStatus,
    myCursor,
    otherCursors,
    myPresence,

    // Methods
    setTyping: updateTypingStatus,
    updateCursor,
    reportActivity,
    updatePresence,
    cleanStalePresence,
    disconnect,
    connect,

    // Test helpers
    simulateUserJoin,
    simulateUserLeave,
    simulatePresenceSync,
    simulateUserTyping,
    simulateCursorUpdate,
  };
}
