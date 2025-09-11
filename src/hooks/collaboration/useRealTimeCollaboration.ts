'use client';

/**
 * WS-342 Real-Time Wedding Collaboration - useRealTimeCollaboration Hook
 * Team A - Frontend/UI Development - Real-time Collaboration State Management
 *
 * Provides comprehensive real-time collaboration capabilities for wedding planning
 * including WebSocket management, presence tracking, and conflict resolution
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  CollaborationUpdate,
  TimelineUpdate,
  VendorUpdate,
  TaskUpdate,
  ChatMessage,
  PresenceData,
  ActiveUser,
  ConnectionStatus,
  SyncStatus,
  CollaborationError,
  CollaborationErrorCode,
  ActivityItem,
  CollaborationConflict,
  RealTimeCollaborationState,
} from '@/types/collaboration';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';

interface UseRealTimeCollaborationOptions {
  autoConnect?: boolean;
  enablePresence?: boolean;
  enableConflictResolution?: boolean;
  reconnectAttempts?: number;
  heartbeatInterval?: number;
  presenceUpdateInterval?: number;
}

interface UseRealTimeCollaborationReturn {
  // Connection state
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  syncStatus: SyncStatus;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  lastSyncTime?: Date;

  // Real-time state
  activeUsers: ActiveUser[];
  recentActivity: ActivityItem[];
  conflicts: CollaborationConflict[];
  presenceData: { [userId: string]: PresenceData };

  // Core collaboration methods
  sendUpdate: (type: string, data: any) => void;
  subscribeToUpdates: (
    callback: (update: CollaborationUpdate) => void,
  ) => () => void;

  // Timeline collaboration
  sendTimelineUpdate: (update: TimelineUpdate) => void;
  subscribeToTimelineUpdates: (
    callback: (update: TimelineUpdate) => void,
  ) => () => void;

  // Vendor collaboration
  sendVendorUpdate: (update: VendorUpdate) => void;
  subscribeToVendorUpdates: (
    callback: (update: VendorUpdate) => void,
  ) => () => void;

  // Task collaboration
  sendTaskUpdate: (update: TaskUpdate) => void;
  subscribeToTaskUpdates: (
    callback: (update: TaskUpdate) => void,
  ) => () => void;

  // Chat functionality
  sendChatMessage: (message: ChatMessage) => void;
  subscribeToChat: (callback: (message: ChatMessage) => void) => () => void;

  // Presence management
  updatePresence: (presence: Partial<PresenceData>) => void;
  subscribeToPresence: (
    callback: (presence: { [userId: string]: PresenceData }) => void,
  ) => () => void;

  // Connection management
  connect: () => void;
  disconnect: () => void;
  retry: () => void;

  // Conflict resolution
  resolveConflict: (conflictId: string, resolution: string) => void;

  // Error state
  error: CollaborationError | null;
  clearError: () => void;
}

const DEFAULT_OPTIONS: Required<UseRealTimeCollaborationOptions> = {
  autoConnect: true,
  enablePresence: true,
  enableConflictResolution: true,
  reconnectAttempts: 5,
  heartbeatInterval: 30000, // 30 seconds
  presenceUpdateInterval: 5000, // 5 seconds
};

/**
 * useRealTimeCollaboration - React hook for wedding collaboration real-time features
 *
 * Features:
 * - WebSocket connection management with auto-reconnect
 * - Real-time timeline, vendor, and task updates
 * - User presence awareness and activity tracking
 * - Automatic conflict detection and resolution
 * - Chat messaging with typing indicators
 * - Connection quality monitoring
 *
 * @param weddingId - Unique identifier for the wedding
 * @param options - Configuration options
 * @returns Real-time collaboration state and methods
 */
export function useRealTimeCollaboration(
  weddingId: string,
  options: UseRealTimeCollaborationOptions = {},
): UseRealTimeCollaborationReturn {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const { user } = useAuth();
  const { toast } = useToast();

  // Core connection state
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    ConnectionStatus.DISCONNECTED,
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(SyncStatus.OFFLINE);
  const [connectionQuality, setConnectionQuality] = useState<
    'excellent' | 'good' | 'fair' | 'poor'
  >('good');
  const [lastSyncTime, setLastSyncTime] = useState<Date>();
  const [error, setError] = useState<CollaborationError | null>(null);

  // Collaboration state
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [conflicts, setConflicts] = useState<CollaborationConflict[]>([]);
  const [presenceData, setPresenceData] = useState<{
    [userId: string]: PresenceData;
  }>({});

  // Refs for managing subscriptions and timers
  const subscriptionsRef = useRef<Map<string, (data: any) => void>>(new Map());
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const presenceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const updateQueueRef = useRef<CollaborationUpdate[]>([]);

  // Derived state
  const isConnected =
    connectionStatus === ConnectionStatus.CONNECTED ||
    connectionStatus === ConnectionStatus.AUTHENTICATED;

  // Generate unique update ID
  const generateUpdateId = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Get current user ID safely
  const getCurrentUserId = useCallback(() => {
    return user?.id || 'anonymous';
  }, [user?.id]);

  // Initialize WebSocket connection
  const initializeConnection = useCallback(async () => {
    if (!user || !weddingId || socket?.connected) {
      return;
    }

    try {
      setError(null);
      setConnectionStatus(ConnectionStatus.CONNECTING);

      // Create socket connection
      const socketUrl =
        process.env.NEXT_PUBLIC_COLLABORATION_WS_URL ||
        (process.env.NODE_ENV === 'development'
          ? 'ws://localhost:3001'
          : '/api/collaboration');

      const newSocket = io(socketUrl, {
        auth: {
          token: user.access_token,
          userId: user.id,
          weddingId,
          organizationId: user.organization_id,
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
      });

      setSocket(newSocket);

      // Connection event handlers
      newSocket.on('connect', () => {
        console.log('🔗 Wedding collaboration connected');
        setConnectionStatus(ConnectionStatus.CONNECTED);
        setSyncStatus(SyncStatus.SYNCING);
        reconnectAttemptsRef.current = 0;

        // Join wedding collaboration room
        newSocket.emit('join_wedding_collaboration', { weddingId });

        // Start heartbeat
        startHeartbeat(newSocket);

        // Start presence updates if enabled
        if (mergedOptions.enablePresence) {
          startPresenceUpdates(newSocket);
        }

        // Flush any queued updates
        flushUpdateQueue(newSocket);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('❌ Wedding collaboration disconnected:', reason);
        setConnectionStatus(ConnectionStatus.DISCONNECTED);
        setSyncStatus(SyncStatus.OFFLINE);
        stopTimers();

        if (reason === 'io server disconnect') {
          // Server initiated disconnect, don't reconnect
          return;
        }

        scheduleReconnect();
      });

      newSocket.on('connect_error', (error) => {
        console.error('🚨 Wedding collaboration connection error:', error);
        setError({
          name: 'CollaborationError',
          message: `Connection failed: ${error.message}`,
          code: CollaborationErrorCode.CONNECTION_FAILED,
          weddingId,
          userId: user.id,
          context: {
            error: error.message,
            timestamp: new Date().toISOString(),
          },
        });
        setConnectionStatus(ConnectionStatus.FAILED);
        scheduleReconnect();
      });

      // Authentication success
      newSocket.on('authenticated', () => {
        console.log('✅ Wedding collaboration authenticated');
        setConnectionStatus(ConnectionStatus.AUTHENTICATED);
        setSyncStatus(SyncStatus.SYNCED);
        setLastSyncTime(new Date());
      });

      // Authentication failed
      newSocket.on('auth_error', (error) => {
        console.error('🔐 Wedding collaboration auth error:', error);
        setError({
          name: 'CollaborationError',
          message: 'Authentication failed',
          code: CollaborationErrorCode.AUTHENTICATION_FAILED,
          weddingId,
          userId: user.id,
          context: { error, timestamp: new Date().toISOString() },
        });
        setConnectionStatus(ConnectionStatus.UNAUTHORIZED);
      });

      // Connection quality updates
      newSocket.on('connection_quality', (quality: string) => {
        setConnectionQuality(quality as any);
      });

      // Collaboration updates
      newSocket.on('collaboration_update', (update: CollaborationUpdate) => {
        handleIncomingUpdate(update);
      });

      // Timeline-specific updates
      newSocket.on('timeline_update', (update: TimelineUpdate) => {
        handleTimelineUpdate(update);
      });

      // Vendor-specific updates
      newSocket.on('vendor_update', (update: VendorUpdate) => {
        handleVendorUpdate(update);
      });

      // Task-specific updates
      newSocket.on('task_update', (update: TaskUpdate) => {
        handleTaskUpdate(update);
      });

      // Chat messages
      newSocket.on('chat_message', (message: ChatMessage) => {
        handleChatMessage(message);
      });

      // Presence updates
      newSocket.on(
        'presence_update',
        (presence: { [userId: string]: PresenceData }) => {
          setPresenceData(presence);
          updateActiveUsers(presence);
        },
      );

      // Activity feed updates
      newSocket.on('activity_update', (activity: ActivityItem) => {
        setRecentActivity((prev) => [activity, ...prev.slice(0, 49)]); // Keep last 50 items
      });

      // Conflict detection
      newSocket.on('conflict_detected', (conflict: CollaborationConflict) => {
        setConflicts((prev) => [...prev, conflict]);
        if (mergedOptions.enableConflictResolution) {
          handleConflictDetected(conflict);
        }
      });

      // Sync status updates
      newSocket.on('sync_status', (status: SyncStatus) => {
        setSyncStatus(status);
        if (status === SyncStatus.SYNCED) {
          setLastSyncTime(new Date());
        }
      });

      // Error handling
      newSocket.on('error', (error: any) => {
        console.error('🚨 Wedding collaboration error:', error);
        setError({
          name: 'CollaborationError',
          message: error.message || 'Unknown collaboration error',
          code: error.code || CollaborationErrorCode.SERVICE_UNAVAILABLE,
          weddingId,
          userId: user.id,
          context: { error, timestamp: new Date().toISOString() },
        });
      });
    } catch (err) {
      console.error('Failed to initialize wedding collaboration:', err);
      setError({
        name: 'CollaborationError',
        message:
          err instanceof Error
            ? err.message
            : 'Failed to initialize connection',
        code: CollaborationErrorCode.CONNECTION_FAILED,
        weddingId,
        userId: user?.id,
        context: { error: err, timestamp: new Date().toISOString() },
      });
      setConnectionStatus(ConnectionStatus.FAILED);
    }
  }, [
    user,
    weddingId,
    mergedOptions.enablePresence,
    mergedOptions.enableConflictResolution,
  ]);

  // Handle incoming collaboration updates
  const handleIncomingUpdate = useCallback(
    (update: CollaborationUpdate) => {
      // Don't process our own updates
      if (update.userId === getCurrentUserId()) return;

      // Call registered callbacks
      subscriptionsRef.current.forEach((callback, key) => {
        if (key === 'general' || key === update.type) {
          callback(update);
        }
      });
    },
    [getCurrentUserId],
  );

  // Handle timeline updates
  const handleTimelineUpdate = useCallback((update: TimelineUpdate) => {
    subscriptionsRef.current.forEach((callback, key) => {
      if (key === 'timeline') {
        callback(update);
      }
    });
  }, []);

  // Handle vendor updates
  const handleVendorUpdate = useCallback((update: VendorUpdate) => {
    subscriptionsRef.current.forEach((callback, key) => {
      if (key === 'vendor') {
        callback(update);
      }
    });
  }, []);

  // Handle task updates
  const handleTaskUpdate = useCallback((update: TaskUpdate) => {
    subscriptionsRef.current.forEach((callback, key) => {
      if (key === 'task') {
        callback(update);
      }
    });
  }, []);

  // Handle chat messages
  const handleChatMessage = useCallback((message: ChatMessage) => {
    subscriptionsRef.current.forEach((callback, key) => {
      if (key === 'chat') {
        callback(message);
      }
    });
  }, []);

  // Handle conflict detection
  const handleConflictDetected = useCallback(
    (conflict: CollaborationConflict) => {
      toast({
        title: 'Collaboration Conflict Detected',
        description: conflict.description,
        variant: conflict.severity === 'critical' ? 'destructive' : 'default',
        duration: conflict.severity === 'critical' ? 0 : 5000, // Critical conflicts don't auto-dismiss
      });
    },
    [toast],
  );

  // Update active users from presence data
  const updateActiveUsers = useCallback(
    (presence: { [userId: string]: PresenceData }) => {
      const users: ActiveUser[] = Object.entries(presence)
        .filter(([userId]) => userId !== getCurrentUserId())
        .map(([userId, data]) => ({
          userId,
          name: data.displayName || `User ${userId}`,
          avatar: data.avatar,
          status: data.status,
          currentSection: data.currentSection,
          lastActivity: data.lastActivity,
          cursor: data.cursor,
        }));

      setActiveUsers(users);
    },
    [getCurrentUserId],
  );

  // Start heartbeat to maintain connection
  const startHeartbeat = useCallback(
    (socket: Socket) => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }

      heartbeatIntervalRef.current = setInterval(() => {
        if (socket.connected) {
          socket.emit('heartbeat', { timestamp: Date.now() });
        }
      }, mergedOptions.heartbeatInterval);
    },
    [mergedOptions.heartbeatInterval],
  );

  // Start presence updates
  const startPresenceUpdates = useCallback(
    (socket: Socket) => {
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
      }

      // Send initial presence
      socket.emit('presence_update', {
        status: 'online',
        lastActivity: new Date(),
        userId: getCurrentUserId(),
        weddingId,
      });

      // Update presence periodically
      presenceIntervalRef.current = setInterval(() => {
        if (socket.connected) {
          socket.emit('presence_update', {
            status: 'online',
            lastActivity: new Date(),
            userId: getCurrentUserId(),
            weddingId,
          });
        }
      }, mergedOptions.presenceUpdateInterval);
    },
    [mergedOptions.presenceUpdateInterval, getCurrentUserId, weddingId],
  );

  // Stop all timers
  const stopTimers = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (presenceIntervalRef.current) {
      clearInterval(presenceIntervalRef.current);
      presenceIntervalRef.current = null;
    }
  }, []);

  // Schedule reconnection
  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= mergedOptions.reconnectAttempts) {
      setError({
        name: 'CollaborationError',
        message: 'Maximum reconnection attempts reached',
        code: CollaborationErrorCode.CONNECTION_FAILED,
        weddingId,
        userId: user?.id,
        context: {
          attempts: reconnectAttemptsRef.current,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const delay = Math.min(
      1000 * Math.pow(2, reconnectAttemptsRef.current),
      30000,
    ); // Exponential backoff, max 30s

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    setConnectionStatus(ConnectionStatus.RECONNECTING);

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current++;
      console.log(
        `🔄 Attempting reconnection (${reconnectAttemptsRef.current}/${mergedOptions.reconnectAttempts})`,
      );
      initializeConnection();
    }, delay);
  }, [
    mergedOptions.reconnectAttempts,
    weddingId,
    user?.id,
    initializeConnection,
  ]);

  // Flush queued updates when connection is restored
  const flushUpdateQueue = useCallback((socket: Socket) => {
    while (updateQueueRef.current.length > 0) {
      const update = updateQueueRef.current.shift();
      if (update) {
        socket.emit('collaboration_update', update);
      }
    }
  }, []);

  // Send collaboration update
  const sendUpdate = useCallback(
    (type: string, data: any) => {
      const update: CollaborationUpdate = {
        id: generateUpdateId(),
        type: type as any,
        entityType: data.entityType || 'TIMELINE_ITEM',
        entityId: data.entityId || data.id || generateUpdateId(),
        userId: getCurrentUserId(),
        timestamp: new Date(),
        data,
        weddingId,
        requiresSync: true,
      };

      if (socket?.connected) {
        socket.emit('collaboration_update', update);
      } else {
        // Queue update for when connection is restored
        updateQueueRef.current.push(update);
      }
    },
    [socket, generateUpdateId, getCurrentUserId, weddingId],
  );

  // Subscribe to updates
  const subscribeToUpdates = useCallback(
    (callback: (update: CollaborationUpdate) => void) => {
      const key = 'general';
      subscriptionsRef.current.set(key, callback);

      return () => {
        subscriptionsRef.current.delete(key);
      };
    },
    [],
  );

  // Timeline-specific methods
  const sendTimelineUpdate = useCallback(
    (update: TimelineUpdate) => {
      if (socket?.connected) {
        socket.emit('timeline_update', update);
      }
    },
    [socket],
  );

  const subscribeToTimelineUpdates = useCallback(
    (callback: (update: TimelineUpdate) => void) => {
      const key = 'timeline';
      subscriptionsRef.current.set(key, callback);

      return () => {
        subscriptionsRef.current.delete(key);
      };
    },
    [],
  );

  // Vendor-specific methods
  const sendVendorUpdate = useCallback(
    (update: VendorUpdate) => {
      if (socket?.connected) {
        socket.emit('vendor_update', update);
      }
    },
    [socket],
  );

  const subscribeToVendorUpdates = useCallback(
    (callback: (update: VendorUpdate) => void) => {
      const key = 'vendor';
      subscriptionsRef.current.set(key, callback);

      return () => {
        subscriptionsRef.current.delete(key);
      };
    },
    [],
  );

  // Task-specific methods
  const sendTaskUpdate = useCallback(
    (update: TaskUpdate) => {
      if (socket?.connected) {
        socket.emit('task_update', update);
      }
    },
    [socket],
  );

  const subscribeToTaskUpdates = useCallback(
    (callback: (update: TaskUpdate) => void) => {
      const key = 'task';
      subscriptionsRef.current.set(key, callback);

      return () => {
        subscriptionsRef.current.delete(key);
      };
    },
    [],
  );

  // Chat methods
  const sendChatMessage = useCallback(
    (message: ChatMessage) => {
      if (socket?.connected) {
        socket.emit('chat_message', message);
      }
    },
    [socket],
  );

  const subscribeToChat = useCallback(
    (callback: (message: ChatMessage) => void) => {
      const key = 'chat';
      subscriptionsRef.current.set(key, callback);

      return () => {
        subscriptionsRef.current.delete(key);
      };
    },
    [],
  );

  // Presence methods
  const updatePresence = useCallback(
    (presence: Partial<PresenceData>) => {
      if (socket?.connected) {
        socket.emit('presence_update', {
          ...presence,
          userId: getCurrentUserId(),
          weddingId,
          timestamp: new Date(),
        });
      }
    },
    [socket, getCurrentUserId, weddingId],
  );

  const subscribeToPresence = useCallback(
    (callback: (presence: { [userId: string]: PresenceData }) => void) => {
      const key = 'presence';
      subscriptionsRef.current.set(key, callback);

      return () => {
        subscriptionsRef.current.delete(key);
      };
    },
    [],
  );

  // Connection management
  const connect = useCallback(() => {
    if (!socket || !socket.connected) {
      initializeConnection();
    }
  }, [socket, initializeConnection]);

  const disconnect = useCallback(() => {
    if (socket?.connected) {
      socket.disconnect();
    }
    stopTimers();
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, [socket, stopTimers]);

  const retry = useCallback(() => {
    disconnect();
    setTimeout(() => {
      reconnectAttemptsRef.current = 0;
      setError(null);
      initializeConnection();
    }, 1000);
  }, [disconnect, initializeConnection]);

  // Conflict resolution
  const resolveConflict = useCallback(
    (conflictId: string, resolution: string) => {
      if (socket?.connected) {
        socket.emit('resolve_conflict', { conflictId, resolution });

        // Remove from local conflicts
        setConflicts((prev) => prev.filter((c) => c.id !== conflictId));
      }
    },
    [socket],
  );

  // Error management
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initialize connection when dependencies change
  useEffect(() => {
    if (user && weddingId && mergedOptions.autoConnect) {
      initializeConnection();
    }

    return () => {
      disconnect();
    };
  }, [
    user,
    weddingId,
    mergedOptions.autoConnect,
    initializeConnection,
    disconnect,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimers();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      socket?.disconnect();
    };
  }, [socket, stopTimers]);

  return {
    // Connection state
    isConnected,
    connectionStatus,
    syncStatus,
    connectionQuality,
    lastSyncTime,

    // Real-time state
    activeUsers,
    recentActivity,
    conflicts,
    presenceData,

    // Core collaboration methods
    sendUpdate,
    subscribeToUpdates,

    // Timeline collaboration
    sendTimelineUpdate,
    subscribeToTimelineUpdates,

    // Vendor collaboration
    sendVendorUpdate,
    subscribeToVendorUpdates,

    // Task collaboration
    sendTaskUpdate,
    subscribeToTaskUpdates,

    // Chat functionality
    sendChatMessage,
    subscribeToChat,

    // Presence management
    updatePresence,
    subscribeToPresence,

    // Connection management
    connect,
    disconnect,
    retry,

    // Conflict resolution
    resolveConflict,

    // Error state
    error,
    clearError,
  };
}

export default useRealTimeCollaboration;
