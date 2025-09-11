'use client';

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import {
  usePerformanceMonitor,
  useMemoryOptimization,
} from '../../hooks/usePerformanceOptimization';
import { useIntelligentCache } from './IntelligentCacheProvider';
import { useOptimisticUpdates } from './OptimisticUpdateProvider';

// Types for real-time events
interface RealtimeEvent {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  userId: string;
  sessionId: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface UserPresence {
  userId: string;
  userName: string;
  avatar?: string;
  status: 'active' | 'idle' | 'away' | 'offline';
  lastSeen: number;
  location?: {
    path: string;
    component: string;
    action?: string;
  };
  cursor?: {
    x: number;
    y: number;
    visible: boolean;
  };
}

interface RealtimeConfig {
  reconnectAttempts: number;
  reconnectDelay: number;
  heartbeatInterval: number;
  bufferSize: number;
  compressionEnabled: boolean;
  batchingEnabled: boolean;
  batchInterval: number;
  presenceUpdateInterval: number;
  enableCursorTracking: boolean;
}

interface RealtimeState {
  isConnected: boolean;
  isConnecting: boolean;
  lastConnected: number | null;
  reconnectAttempts: number;
  latency: number;
  presenceMap: Map<string, UserPresence>;
  eventQueue: RealtimeEvent[];
  subscribedChannels: Set<string>;
  messagesSent: number;
  messagesReceived: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
}

interface RealtimeContextValue {
  // Connection state
  state: RealtimeState;

  // Connection management
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;

  // Channel management
  subscribe: (
    channel: string,
    callback: (event: RealtimeEvent) => void,
  ) => () => void;
  unsubscribe: (channel: string) => void;

  // Event broadcasting
  broadcast: (
    channel: string,
    type: string,
    data: any,
    priority?: RealtimeEvent['priority'],
  ) => Promise<boolean>;

  // Presence management
  updatePresence: (data: Partial<UserPresence>) => void;
  getPresence: (userId?: string) => UserPresence | UserPresence[] | null;

  // Utility methods
  flush: () => Promise<void>;
  getLatency: () => number;
  getConnectionQuality: () => RealtimeState['connectionQuality'];
  getStatistics: () => {
    uptime: number;
    messagesSent: number;
    messagesReceived: number;
    avgLatency: number;
    reconnections: number;
  };
}

const defaultConfig: RealtimeConfig = {
  reconnectAttempts: 5,
  reconnectDelay: 1000,
  heartbeatInterval: 30000,
  bufferSize: 1000,
  compressionEnabled: true,
  batchingEnabled: true,
  batchInterval: 100,
  presenceUpdateInterval: 5000,
  enableCursorTracking: true,
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within RealtimeProvider');
  }
  return context;
};

interface RealtimeProviderProps {
  children: React.ReactNode;
  config?: Partial<RealtimeConfig>;
  userId: string;
  sessionId: string;
  wsUrl?: string;
}

export const RealtimeProvider: React.FC<RealtimeProviderProps> = ({
  children,
  config: userConfig = {},
  userId,
  sessionId,
  wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
}) => {
  const config = useMemo(
    () => ({ ...defaultConfig, ...userConfig }),
    [userConfig],
  );
  const { logMetric } = usePerformanceMonitor('RealtimeProvider');
  const { addObserver } = useMemoryOptimization();
  const cache = useIntelligentCache();
  const optimistic = useOptimisticUpdates();

  // WebSocket and state management
  const wsRef = useRef<WebSocket | null>(null);
  const channelCallbacksRef = useRef<
    Map<string, Set<(event: RealtimeEvent) => void>>
  >(new Map());
  const eventQueueRef = useRef<RealtimeEvent[]>([]);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const presenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latencyHistoryRef = useRef<number[]>([]);
  const connectionStartTimeRef = useRef<number>(0);

  const [state, setState] = useState<RealtimeState>({
    isConnected: false,
    isConnecting: false,
    lastConnected: null,
    reconnectAttempts: 0,
    latency: 0,
    presenceMap: new Map(),
    eventQueue: [],
    subscribedChannels: new Set(),
    messagesSent: 0,
    messagesReceived: 0,
    connectionQuality: 'disconnected',
  });

  // Calculate connection quality based on latency and connection stability
  const calculateConnectionQuality = useCallback(
    (avgLatency: number): RealtimeState['connectionQuality'] => {
      if (!state.isConnected) return 'disconnected';
      if (avgLatency < 50) return 'excellent';
      if (avgLatency < 150) return 'good';
      return 'poor';
    },
    [state.isConnected],
  );

  // Update presence with throttling
  const updatePresence = useCallback(
    (data: Partial<UserPresence>) => {
      const presence: UserPresence = {
        userId,
        userName: data.userName || 'Anonymous',
        avatar: data.avatar,
        status: data.status || 'active',
        lastSeen: Date.now(),
        location: data.location,
        cursor: data.cursor,
      };

      setState((prev) => ({
        ...prev,
        presenceMap: new Map(prev.presenceMap).set(userId, presence),
      }));

      // Broadcast presence update
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'presence_update',
            data: presence,
            timestamp: Date.now(),
          }),
        );
      }
    },
    [userId],
  );

  // Get presence data
  const getPresence = useCallback(
    (targetUserId?: string) => {
      if (targetUserId) {
        return state.presenceMap.get(targetUserId) || null;
      }
      return Array.from(state.presenceMap.values());
    },
    [state.presenceMap],
  );

  // Broadcast event to channel
  const broadcast = useCallback(
    async (
      channel: string,
      type: string,
      data: any,
      priority: RealtimeEvent['priority'] = 'medium',
    ): Promise<boolean> => {
      const event: RealtimeEvent = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
        timestamp: Date.now(),
        userId,
        sessionId,
        priority,
      };

      // Add to optimistic updates if applicable
      if (
        type.startsWith('update_') ||
        type.startsWith('create_') ||
        type.startsWith('delete_')
      ) {
        optimistic.addOptimisticUpdate({
          type: 'realtime_event',
          data: event,
          originalData: null,
        });
      }

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try {
          const message = JSON.stringify({
            channel,
            event,
            compressed: config.compressionEnabled,
          });

          wsRef.current.send(message);

          setState((prev) => ({
            ...prev,
            messagesSent: prev.messagesSent + 1,
          }));

          logMetric('realtimeEventSent', 1);
          return true;
        } catch (error) {
          logMetric('realtimeEventSendError', 1);
          return false;
        }
      }

      // Queue for later if disconnected
      eventQueueRef.current.push(event);
      if (eventQueueRef.current.length > config.bufferSize) {
        eventQueueRef.current.shift(); // Remove oldest
      }

      return false;
    },
    [
      userId,
      sessionId,
      config.compressionEnabled,
      config.bufferSize,
      logMetric,
      optimistic,
    ],
  );

  // Subscribe to channel
  const subscribe = useCallback(
    (channel: string, callback: (event: RealtimeEvent) => void) => {
      if (!channelCallbacksRef.current.has(channel)) {
        channelCallbacksRef.current.set(channel, new Set());
      }

      channelCallbacksRef.current.get(channel)!.add(callback);

      setState((prev) => ({
        ...prev,
        subscribedChannels: new Set(prev.subscribedChannels).add(channel),
      }));

      // Send subscription request if connected
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'subscribe',
            channel,
            timestamp: Date.now(),
          }),
        );
      }

      // Return unsubscribe function
      return () => {
        channelCallbacksRef.current.get(channel)?.delete(callback);
        if (channelCallbacksRef.current.get(channel)?.size === 0) {
          channelCallbacksRef.current.delete(channel);
          setState((prev) => {
            const newChannels = new Set(prev.subscribedChannels);
            newChannels.delete(channel);
            return { ...prev, subscribedChannels: newChannels };
          });
        }
      };
    },
    [],
  );

  // Unsubscribe from channel
  const unsubscribe = useCallback((channel: string) => {
    channelCallbacksRef.current.delete(channel);
    setState((prev) => {
      const newChannels = new Set(prev.subscribedChannels);
      newChannels.delete(channel);
      return { ...prev, subscribedChannels: newChannels };
    });

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'unsubscribe',
          channel,
          timestamp: Date.now(),
        }),
      );
    }
  }, []);

  // Handle incoming messages
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        const receiveTime = Date.now();

        setState((prev) => ({
          ...prev,
          messagesReceived: prev.messagesReceived + 1,
        }));

        // Handle different message types
        switch (message.type) {
          case 'event':
            const { channel, event: realtimeEvent } = message;
            const callbacks = channelCallbacksRef.current.get(channel);
            if (callbacks) {
              callbacks.forEach((callback) => {
                try {
                  callback(realtimeEvent);
                } catch (error) {
                  logMetric('realtimeCallbackError', 1);
                }
              });
            }
            break;

          case 'presence_update':
            setState((prev) => ({
              ...prev,
              presenceMap: new Map(prev.presenceMap).set(
                message.data.userId,
                message.data,
              ),
            }));
            break;

          case 'presence_leave':
            setState((prev) => {
              const newMap = new Map(prev.presenceMap);
              newMap.delete(message.userId);
              return { ...prev, presenceMap: newMap };
            });
            break;

          case 'pong':
            const latency = receiveTime - message.timestamp;
            latencyHistoryRef.current.push(latency);
            if (latencyHistoryRef.current.length > 10) {
              latencyHistoryRef.current.shift();
            }

            const avgLatency =
              latencyHistoryRef.current.reduce((a, b) => a + b, 0) /
              latencyHistoryRef.current.length;
            setState((prev) => ({
              ...prev,
              latency: avgLatency,
              connectionQuality: calculateConnectionQuality(avgLatency),
            }));
            break;

          case 'error':
            logMetric('realtimeServerError', 1);
            break;
        }
      } catch (error) {
        logMetric('realtimeMessageParseError', 1);
      }
    },
    [logMetric, calculateConnectionQuality],
  );

  // Start heartbeat
  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }

    heartbeatRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'ping',
            timestamp: Date.now(),
          }),
        );
      }
    }, config.heartbeatInterval);
  }, [config.heartbeatInterval]);

  // Connect to WebSocket
  const connect = useCallback(async (): Promise<void> => {
    if (state.isConnecting || state.isConnected) return;

    setState((prev) => ({ ...prev, isConnecting: true }));
    connectionStartTimeRef.current = Date.now();

    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(
          `${wsUrl}?userId=${userId}&sessionId=${sessionId}`,
        );
        wsRef.current = ws;

        ws.onopen = () => {
          setState((prev) => ({
            ...prev,
            isConnected: true,
            isConnecting: false,
            lastConnected: Date.now(),
            reconnectAttempts: 0,
            connectionQuality: 'good',
          }));

          startHeartbeat();
          logMetric('realtimeConnected', 1);

          // Flush queued events
          eventQueueRef.current.forEach((event) => {
            ws.send(
              JSON.stringify({
                channel: 'default',
                event,
                compressed: config.compressionEnabled,
              }),
            );
          });
          eventQueueRef.current = [];

          // Re-subscribe to channels
          state.subscribedChannels.forEach((channel) => {
            ws.send(
              JSON.stringify({
                type: 'subscribe',
                channel,
                timestamp: Date.now(),
              }),
            );
          });

          resolve();
        };

        ws.onmessage = handleMessage;

        ws.onclose = () => {
          setState((prev) => ({
            ...prev,
            isConnected: false,
            isConnecting: false,
            connectionQuality: 'disconnected',
          }));

          if (heartbeatRef.current) {
            clearInterval(heartbeatRef.current);
          }

          logMetric('realtimeDisconnected', 1);
        };

        ws.onerror = (error) => {
          setState((prev) => ({
            ...prev,
            isConnecting: false,
            connectionQuality: 'disconnected',
          }));

          logMetric('realtimeConnectionError', 1);
          reject(error);
        };
      } catch (error) {
        setState((prev) => ({ ...prev, isConnecting: false }));
        logMetric('realtimeConnectionError', 1);
        reject(error);
      }
    });
  }, [
    state.isConnecting,
    state.isConnected,
    state.subscribedChannels,
    wsUrl,
    userId,
    sessionId,
    handleMessage,
    startHeartbeat,
    config.compressionEnabled,
    logMetric,
  ]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    setState((prev) => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      connectionQuality: 'disconnected',
    }));

    logMetric('realtimeManualDisconnect', 1);
  }, [logMetric]);

  // Reconnect with exponential backoff
  const reconnect = useCallback(async (): Promise<void> => {
    if (state.reconnectAttempts >= config.reconnectAttempts) {
      logMetric('realtimeMaxReconnectAttemptsReached', 1);
      return;
    }

    const delay = Math.min(
      config.reconnectDelay * Math.pow(2, state.reconnectAttempts),
      30000,
    );

    setState((prev) => ({
      ...prev,
      reconnectAttempts: prev.reconnectAttempts + 1,
    }));

    return new Promise((resolve, reject) => {
      reconnectTimeoutRef.current = setTimeout(async () => {
        try {
          await connect();
          resolve();
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  }, [
    state.reconnectAttempts,
    config.reconnectAttempts,
    config.reconnectDelay,
    connect,
    logMetric,
  ]);

  // Flush pending events
  const flush = useCallback(async (): Promise<void> => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    // Process any batched events immediately
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }
  }, []);

  // Get latency
  const getLatency = useCallback(() => {
    return state.latency;
  }, [state.latency]);

  // Get connection quality
  const getConnectionQuality = useCallback(() => {
    return state.connectionQuality;
  }, [state.connectionQuality]);

  // Get statistics
  const getStatistics = useCallback(() => {
    const uptime = state.lastConnected ? Date.now() - state.lastConnected : 0;
    const avgLatency =
      latencyHistoryRef.current.reduce((a, b) => a + b, 0) /
      Math.max(latencyHistoryRef.current.length, 1);

    return {
      uptime,
      messagesSent: state.messagesSent,
      messagesReceived: state.messagesReceived,
      avgLatency,
      reconnections: state.reconnectAttempts,
    };
  }, [state]);

  // Auto-reconnection effect
  useEffect(() => {
    if (
      !state.isConnected &&
      !state.isConnecting &&
      state.reconnectAttempts < config.reconnectAttempts
    ) {
      reconnect().catch(() => {
        // Reconnection failed, will retry automatically
      });
    }
  }, [
    state.isConnected,
    state.isConnecting,
    state.reconnectAttempts,
    config.reconnectAttempts,
    reconnect,
  ]);

  // Memory management
  useEffect(() => {
    const observer = addObserver('RealtimeProvider', state.eventQueue.length);
    return () => observer?.disconnect();
  }, [addObserver, state.eventQueue.length]);

  // Presence update interval
  useEffect(() => {
    if (config.presenceUpdateInterval > 0) {
      presenceTimeoutRef.current = setInterval(() => {
        updatePresence({ status: 'active' });
      }, config.presenceUpdateInterval);
    }

    return () => {
      if (presenceTimeoutRef.current) {
        clearInterval(presenceTimeoutRef.current);
      }
    };
  }, [config.presenceUpdateInterval, updatePresence]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
      if (batchTimeoutRef.current) clearTimeout(batchTimeoutRef.current);
      if (presenceTimeoutRef.current) clearInterval(presenceTimeoutRef.current);
    };
  }, [disconnect]);

  // Performance monitoring
  useEffect(() => {
    logMetric('realtimeActiveChannels', state.subscribedChannels.size);
    logMetric('realtimePresenceCount', state.presenceMap.size);
    logMetric('realtimeLatency', state.latency);
  }, [
    logMetric,
    state.subscribedChannels.size,
    state.presenceMap.size,
    state.latency,
  ]);

  const contextValue: RealtimeContextValue = useMemo(
    () => ({
      state,
      connect,
      disconnect,
      reconnect,
      subscribe,
      unsubscribe,
      broadcast,
      updatePresence,
      getPresence,
      flush,
      getLatency,
      getConnectionQuality,
      getStatistics,
    }),
    [
      state,
      connect,
      disconnect,
      reconnect,
      subscribe,
      unsubscribe,
      broadcast,
      updatePresence,
      getPresence,
      flush,
      getLatency,
      getConnectionQuality,
      getStatistics,
    ],
  );

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  );
};

export default RealtimeProvider;
