'use client';

/**
 * WS-202: Supabase Realtime Integration - Provider Component
 * Wedding industry realtime communication provider
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import {
  UIRealtimeContextValue,
  UIRealtimeConnectionState,
  UIRealtimeProviderConfig,
  UIConnectionStatus,
  UISubscriptionConfig,
  UIQueuedOperation,
  WeddingUIRealtimeError,
  WeddingDayUIEmergencyConfig,
} from '@/types/realtime';
import { useSession } from 'next-auth/react';

// Context creation
const RealtimeContext = createContext<UIRealtimeContextValue | null>(null);

// Default wedding day emergency configuration
const DEFAULT_WEDDING_DAY_CONFIG: WeddingDayUIEmergencyConfig = {
  maxReconnectAttempts: 10,
  reconnectDelay: 1000,
  heartbeatInterval: 10000,
  criticalPathOnly: true,
  emergencyContactEnabled: true,
  offlineMode: 'full',
  emergencyNotificationDelay: 5000,
  criticalOperationsOnly: false,
};

// Default provider configuration
const DEFAULT_CONFIG: Required<UIRealtimeProviderConfig> = {
  reconnectAttempts: 5,
  heartbeatInterval: 30000,
  weddingDayMode: false,
  enableOfflineQueue: true,
  debug: false,
  maxConnections: 50,
};

interface RealtimeProviderProps {
  children: React.ReactNode;
  config?: UIRealtimeProviderConfig;
  userId?: string;
  userType?: 'supplier' | 'couple' | 'coordinator';
}

export function RealtimeProvider({
  children,
  config = {},
  userId,
  userType = 'supplier',
}: RealtimeProviderProps) {
  const { data: session } = useSession();
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // Connection state
  const [connectionState, setConnectionState] =
    useState<UIRealtimeConnectionState>({
      isConnected: false,
      connectionStatus: 'connecting',
      lastHeartbeat: null,
      reconnectAttempts: 0,
      maxReconnectAttempts: mergedConfig.reconnectAttempts,
      activeChannels: [],
      messageCount: 0,
      lastUpdate: null,
      connectionQuality: 'good',
    });

  // Refs for stable references
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map());
  const subscriptionsRef = useRef<Map<string, UISubscriptionConfig>>(new Map());
  const queuedOperationsRef = useRef<UIQueuedOperation[]>([]);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Wedding day mode detection
  const isWeddingDay = useCallback(() => {
    if (mergedConfig.weddingDayMode) return true;

    // Check if today is Saturday (common wedding day)
    const today = new Date();
    return today.getDay() === 6;
  }, [mergedConfig.weddingDayMode]);

  // Initialize Supabase client
  useEffect(() => {
    if (!session?.user?.id && !userId) return;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      },
    );

    supabaseRef.current = supabase;

    // Initialize connection
    initializeConnection();

    return () => {
      cleanup();
    };
  }, [session?.user?.id, userId]);

  // Initialize realtime connection
  const initializeConnection = useCallback(async () => {
    if (!supabaseRef.current) return;

    try {
      setConnectionState((prev) => ({
        ...prev,
        connectionStatus: 'connecting',
        reconnectAttempts: prev.reconnectAttempts + 1,
      }));

      // Create system channel for heartbeat
      const systemChannel = supabaseRef.current.channel('system');

      systemChannel
        .on('system', {}, (payload) => {
          if (payload.status === 'SUBSCRIBED') {
            handleConnectionSuccess();
          } else if (payload.status === 'CHANNEL_ERROR') {
            handleConnectionError(new Error('Channel subscription failed'));
          }
        })
        .subscribe();

      channelsRef.current.set('system', systemChannel);

      // Start heartbeat
      startHeartbeat();
    } catch (error) {
      handleConnectionError(error as Error);
    }
  }, []);

  // Handle successful connection
  const handleConnectionSuccess = useCallback(() => {
    setConnectionState((prev) => ({
      ...prev,
      isConnected: true,
      connectionStatus: 'connected',
      lastHeartbeat: new Date(),
      reconnectAttempts: 0,
      connectionQuality: 'excellent',
    }));

    // Process queued operations
    processQueuedOperations();

    if (mergedConfig.debug) {
      console.log('✅ WedSync Realtime: Connected successfully');
    }
  }, [mergedConfig.debug]);

  // Handle connection errors
  const handleConnectionError = useCallback(
    (error: Error) => {
      const weddingError: WeddingUIRealtimeError = {
        code: 'CONNECTION_FAILED',
        message: error.message,
        timestamp: new Date().toISOString(),
        userRole: userType,
        recoveryAction: 'RETRY',
        severity: isWeddingDay() ? 'critical' : 'medium',
        context: {
          reconnectAttempts: connectionState.reconnectAttempts,
          isWeddingDay: isWeddingDay(),
        },
      };

      setConnectionState((prev) => ({
        ...prev,
        isConnected: false,
        connectionStatus: 'error',
        connectionQuality: 'offline',
      }));

      // Schedule reconnection with exponential backoff
      scheduleReconnection(weddingError);

      if (mergedConfig.debug) {
        console.error('❌ WedSync Realtime Error:', weddingError);
      }
    },
    [
      userType,
      isWeddingDay,
      connectionState.reconnectAttempts,
      mergedConfig.debug,
    ],
  );

  // Schedule reconnection with exponential backoff
  const scheduleReconnection = useCallback(
    (error: WeddingUIRealtimeError) => {
      const maxAttempts = isWeddingDay()
        ? DEFAULT_WEDDING_DAY_CONFIG.maxReconnectAttempts
        : mergedConfig.reconnectAttempts;

      if (connectionState.reconnectAttempts >= maxAttempts) {
        setConnectionState((prev) => ({
          ...prev,
          connectionStatus: 'disconnected',
        }));

        if (isWeddingDay()) {
          // Wedding day emergency protocol
          triggerWeddingDayEmergency(error);
        }
        return;
      }

      const delay = isWeddingDay()
        ? DEFAULT_WEDDING_DAY_CONFIG.reconnectDelay
        : Math.min(
            1000 * Math.pow(2, connectionState.reconnectAttempts),
            30000,
          );

      setConnectionState((prev) => ({
        ...prev,
        connectionStatus: 'reconnecting',
      }));

      reconnectTimeoutRef.current = setTimeout(() => {
        initializeConnection();
      }, delay);
    },
    [
      connectionState.reconnectAttempts,
      isWeddingDay,
      mergedConfig.reconnectAttempts,
    ],
  );

  // Wedding day emergency protocol
  const triggerWeddingDayEmergency = useCallback(
    (error: WeddingUIRealtimeError) => {
      if (mergedConfig.debug) {
        console.error('🚨 Wedding Day Emergency Protocol Activated:', error);
      }

      // Switch to offline mode
      setConnectionState((prev) => ({
        ...prev,
        connectionStatus: 'offline',
        connectionQuality: 'offline',
      }));

      // Notify emergency handlers
      window.dispatchEvent(
        new CustomEvent('wedding-day-emergency', {
          detail: { error, timestamp: new Date() },
        }),
      );
    },
    [mergedConfig.debug],
  );

  // Start heartbeat monitoring
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    const interval = isWeddingDay()
      ? DEFAULT_WEDDING_DAY_CONFIG.heartbeatInterval
      : mergedConfig.heartbeatInterval;

    heartbeatIntervalRef.current = setInterval(() => {
      if (supabaseRef.current && connectionState.isConnected) {
        const systemChannel = channelsRef.current.get('system');
        if (systemChannel) {
          systemChannel.send({
            type: 'heartbeat',
            payload: { timestamp: new Date().toISOString() },
          });

          setConnectionState((prev) => ({
            ...prev,
            lastHeartbeat: new Date(),
          }));
        }
      }
    }, interval);
  }, [
    connectionState.isConnected,
    isWeddingDay,
    mergedConfig.heartbeatInterval,
  ]);

  // Subscribe to channel
  const subscribeToChannel = useCallback(
    (channelName: string, config: UISubscriptionConfig) => {
      if (!supabaseRef.current || !connectionState.isConnected) {
        // Queue subscription if offline
        if (mergedConfig.enableOfflineQueue) {
          addToQueue({
            type: 'broadcast',
            channel: channelName,
            data: config,
            priority: config.priority || 'medium',
            retryCount: 0,
            maxRetries: 3,
          });
        }
        return () => {};
      }

      try {
        const channel = supabaseRef.current.channel(channelName);

        channel.on(
          'postgres_changes',
          {
            event: config.event,
            schema: config.schema,
            table: config.table,
            filter: config.filter,
          },
          (payload) => {
            setConnectionState((prev) => ({
              ...prev,
              messageCount: prev.messageCount + 1,
              lastUpdate: new Date(),
            }));

            config.callback(payload);
          },
        );

        channel.subscribe();
        channelsRef.current.set(channelName, channel);
        subscriptionsRef.current.set(channelName, config);

        setConnectionState((prev) => ({
          ...prev,
          activeChannels: [...prev.activeChannels, channelName],
        }));

        // Return cleanup function
        return () => {
          unsubscribeFromChannel(channelName);
        };
      } catch (error) {
        config.onError?.(error as WeddingUIRealtimeError);
        return () => {};
      }
    },
    [connectionState.isConnected, mergedConfig.enableOfflineQueue],
  );

  // Unsubscribe from channel
  const unsubscribeFromChannel = useCallback((channelName: string) => {
    const channel = channelsRef.current.get(channelName);
    if (channel) {
      channel.unsubscribe();
      channelsRef.current.delete(channelName);
      subscriptionsRef.current.delete(channelName);

      setConnectionState((prev) => ({
        ...prev,
        activeChannels: prev.activeChannels.filter((ch) => ch !== channelName),
      }));
    }
  }, []);

  // Broadcast message
  const broadcast = useCallback(
    async (channelName: string, event: string, payload: any) => {
      const channel = channelsRef.current.get(channelName);
      if (!channel || !connectionState.isConnected) {
        // Queue broadcast if offline
        if (mergedConfig.enableOfflineQueue) {
          addToQueue({
            type: 'broadcast',
            channel: channelName,
            data: { event, payload },
            priority: 'medium',
            retryCount: 0,
            maxRetries: 3,
          });
        }
        return;
      }

      try {
        await channel.send({
          type: 'broadcast',
          event,
          payload,
        });
      } catch (error) {
        if (mergedConfig.debug) {
          console.error('Broadcast failed:', error);
        }
      }
    },
    [
      connectionState.isConnected,
      mergedConfig.enableOfflineQueue,
      mergedConfig.debug,
    ],
  );

  // Add operation to queue
  const addToQueue = useCallback(
    (operation: Omit<UIQueuedOperation, 'id' | 'timestamp'>) => {
      const queuedOp: UIQueuedOperation = {
        ...operation,
        id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        weddingDayOperation: isWeddingDay(),
      };

      queuedOperationsRef.current.push(queuedOp);

      // Limit queue size
      if (queuedOperationsRef.current.length > 100) {
        queuedOperationsRef.current = queuedOperationsRef.current.slice(-100);
      }
    },
    [isWeddingDay],
  );

  // Process queued operations
  const processQueuedOperations = useCallback(async () => {
    if (!connectionState.isConnected) return;

    const operations = [...queuedOperationsRef.current];
    queuedOperationsRef.current = [];

    for (const operation of operations) {
      try {
        if (operation.type === 'broadcast' && operation.channel) {
          const channelData = operation.data as { event: string; payload: any };
          await broadcast(
            operation.channel,
            channelData.event,
            channelData.payload,
          );
        }
        // Handle other operation types as needed
      } catch (error) {
        // Re-queue failed operations
        if (operation.retryCount < operation.maxRetries) {
          addToQueue({
            ...operation,
            retryCount: operation.retryCount + 1,
          });
        }
      }
    }
  }, [connectionState.isConnected, broadcast, addToQueue]);

  // Manual retry function
  const retry = useCallback(() => {
    setConnectionState((prev) => ({
      ...prev,
      reconnectAttempts: 0,
    }));
    initializeConnection();
  }, [initializeConnection]);

  // Cleanup function
  const cleanup = useCallback(() => {
    // Clear intervals and timeouts
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    // Unsubscribe from all channels
    channelsRef.current.forEach((channel) => {
      channel.unsubscribe();
    });

    // Clear references
    channelsRef.current.clear();
    subscriptionsRef.current.clear();
    queuedOperationsRef.current = [];

    if (supabaseRef.current) {
      supabaseRef.current.removeAllChannels();
    }
  }, []);

  // Context value
  const contextValue = useMemo<UIRealtimeContextValue>(
    () => ({
      ...connectionState,
      subscribeToChannel,
      unsubscribeFromChannel,
      broadcast,
      cleanup,
      queuedOperations: queuedOperationsRef.current,
      addToQueue,
      retry,
    }),
    [
      connectionState,
      subscribeToChannel,
      unsubscribeFromChannel,
      broadcast,
      cleanup,
      addToQueue,
      retry,
    ],
  );

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  );
}

// Hook to use realtime context
export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}

// Hook for wedding-specific realtime subscriptions
export function useWeddingRealtime(weddingId: string) {
  const realtime = useRealtime();

  const subscribeToWeddingUpdates = useCallback(
    (callback: (payload: any) => void) => {
      return realtime.subscribeToChannel(`wedding_${weddingId}`, {
        event: '*',
        schema: 'public',
        table: 'wedding_timeline_events',
        filter: `wedding_id=eq.${weddingId}`,
        callback,
        priority: 'high',
      });
    },
    [realtime, weddingId],
  );

  const subscribeToVendorUpdates = useCallback(
    (vendorId: string, callback: (payload: any) => void) => {
      return realtime.subscribeToChannel(`vendor_${vendorId}`, {
        event: '*',
        schema: 'public',
        table: 'vendor_updates',
        filter: `vendor_id=eq.${vendorId}`,
        callback,
        priority: 'medium',
      });
    },
    [realtime],
  );

  return {
    ...realtime,
    subscribeToWeddingUpdates,
    subscribeToVendorUpdates,
  };
}
