'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ActivityStream, ActivityStreamOptions } from './activityStream';
import { ActivityFeed as ActivityFeedType } from '@/types/communications';

export interface UseActivitySubscriptionOptions
  extends Omit<
    ActivityStreamOptions,
    'onActivity' | 'onActivityUpdate' | 'onActivityDelete'
  > {
  maxActivities?: number;
  sortOrder?: 'asc' | 'desc';
  autoMarkAsRead?: boolean;
  debounceMs?: number;
  enablePersistence?: boolean;
  persistenceKey?: string;
}

export interface ActivitySubscriptionState {
  activities: ActivityFeedType[];
  isConnected: boolean;
  isLoading: boolean;
  error: Error | null;
  unreadCount: number;
  connectionMetrics: {
    activitiesReceived: number;
    reconnectCount: number;
    uptime: number;
  };
}

export function useActivitySubscription(
  options: UseActivitySubscriptionOptions,
) {
  const {
    organizationId,
    userId,
    entityType,
    entityId,
    maxActivities = 1000,
    sortOrder = 'desc',
    autoMarkAsRead = false,
    debounceMs = 100,
    enablePersistence = true,
    persistenceKey,
    ...streamOptions
  } = options;

  const [state, setState] = useState<ActivitySubscriptionState>({
    activities: [],
    isConnected: false,
    isLoading: true,
    error: null,
    unreadCount: 0,
    connectionMetrics: {
      activitiesReceived: 0,
      reconnectCount: 0,
      uptime: 0,
    },
  });

  const streamRef = useRef<ActivityStream | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<{
    newActivities: ActivityFeedType[];
    updatedActivities: ActivityFeedType[];
    deletedActivityIds: string[];
  }>({
    newActivities: [],
    updatedActivities: [],
    deletedActivityIds: [],
  });

  // Generate persistence key
  const storageKey =
    persistenceKey ||
    `activity_feed_${organizationId}_${entityType || 'all'}_${entityId || 'all'}`;

  // Load persisted activities
  const loadPersistedActivities = useCallback(() => {
    if (!enablePersistence || typeof window === 'undefined') {
      return [];
    }

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.warn('Failed to load persisted activities:', error);
    }

    return [];
  }, [enablePersistence, storageKey]);

  // Persist activities
  const persistActivities = useCallback(
    (activities: ActivityFeedType[]) => {
      if (!enablePersistence || typeof window === 'undefined') {
        return;
      }

      try {
        // Only persist the most recent activities to avoid large storage
        const toStore = activities.slice(0, Math.min(100, maxActivities));
        localStorage.setItem(storageKey, JSON.stringify(toStore));
      } catch (error) {
        console.warn('Failed to persist activities:', error);
      }
    },
    [enablePersistence, storageKey, maxActivities],
  );

  // Calculate unread count
  const calculateUnreadCount = useCallback(
    (activities: ActivityFeedType[]) => {
      if (!userId) return 0;
      return activities.filter(
        (activity) => !activity.read_by?.includes(userId),
      ).length;
    },
    [userId],
  );

  // Debounced state update
  const scheduleUpdate = useCallback(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      setState((prevState) => {
        const { newActivities, updatedActivities, deletedActivityIds } =
          pendingUpdatesRef.current;

        let activities = [...prevState.activities];

        // Remove deleted activities
        if (deletedActivityIds.length > 0) {
          activities = activities.filter(
            (activity) => !deletedActivityIds.includes(activity.id),
          );
        }

        // Update existing activities
        if (updatedActivities.length > 0) {
          updatedActivities.forEach((updatedActivity) => {
            const index = activities.findIndex(
              (a) => a.id === updatedActivity.id,
            );
            if (index >= 0) {
              activities[index] = updatedActivity;
            }
          });
        }

        // Add new activities
        if (newActivities.length > 0) {
          // Avoid duplicates
          const existingIds = new Set(activities.map((a) => a.id));
          const uniqueNewActivities = newActivities.filter(
            (a) => !existingIds.has(a.id),
          );

          activities = [...uniqueNewActivities, ...activities];
        }

        // Sort activities
        activities.sort((a, b) => {
          const aTime = new Date(a.created_at).getTime();
          const bTime = new Date(b.created_at).getTime();
          return sortOrder === 'desc' ? bTime - aTime : aTime - bTime;
        });

        // Limit activities
        if (activities.length > maxActivities) {
          activities = activities.slice(0, maxActivities);
        }

        // Auto-mark as read if enabled
        if (autoMarkAsRead && userId && newActivities.length > 0) {
          newActivities.forEach((activity) => {
            if (!activity.read_by?.includes(userId)) {
              // Mark as read logic would go here
              // For now, we'll update the local state
              const readBy = activity.read_by || [];
              activity.read_by = [...readBy, userId];
            }
          });
        }

        // Persist activities
        persistActivities(activities);

        // Calculate metrics
        const metrics = streamRef.current?.getMetrics();

        const newState = {
          ...prevState,
          activities,
          unreadCount: calculateUnreadCount(activities),
          connectionMetrics: {
            activitiesReceived: metrics?.activitiesReceived || 0,
            reconnectCount: metrics?.reconnectCount || 0,
            uptime: metrics?.connectionUptime || 0,
          },
        };

        // Clear pending updates
        pendingUpdatesRef.current = {
          newActivities: [],
          updatedActivities: [],
          deletedActivityIds: [],
        };

        return newState;
      });
    }, debounceMs);
  }, [
    debounceMs,
    sortOrder,
    maxActivities,
    autoMarkAsRead,
    userId,
    persistActivities,
    calculateUnreadCount,
  ]);

  // Handle new activity
  const handleNewActivity = useCallback(
    (activity: ActivityFeedType) => {
      pendingUpdatesRef.current.newActivities.push(activity);
      scheduleUpdate();
    },
    [scheduleUpdate],
  );

  // Handle activity update
  const handleActivityUpdate = useCallback(
    (activity: ActivityFeedType) => {
      pendingUpdatesRef.current.updatedActivities.push(activity);
      scheduleUpdate();
    },
    [scheduleUpdate],
  );

  // Handle activity delete
  const handleActivityDelete = useCallback(
    (activityId: string) => {
      pendingUpdatesRef.current.deletedActivityIds.push(activityId);
      scheduleUpdate();
    },
    [scheduleUpdate],
  );

  // Handle connection events
  const handleConnect = useCallback(() => {
    setState((prevState) => ({
      ...prevState,
      isConnected: true,
      isLoading: false,
      error: null,
    }));
  }, []);

  const handleDisconnect = useCallback(() => {
    setState((prevState) => ({
      ...prevState,
      isConnected: false,
    }));
  }, []);

  const handleError = useCallback((error: Error) => {
    setState((prevState) => ({
      ...prevState,
      error,
      isLoading: false,
    }));
  }, []);

  const handleReconnect = useCallback(() => {
    setState((prevState) => ({
      ...prevState,
      isConnected: true,
      error: null,
    }));
  }, []);

  // Initialize subscription
  useEffect(() => {
    // Load persisted activities first
    const persistedActivities = loadPersistedActivities();
    if (persistedActivities.length > 0) {
      setState((prevState) => ({
        ...prevState,
        activities: persistedActivities,
        unreadCount: calculateUnreadCount(persistedActivities),
        isLoading: false,
      }));
    }

    // Create and connect stream
    const stream = new ActivityStream({
      organizationId,
      userId,
      entityType,
      entityId,
      onActivity: handleNewActivity,
      onActivityUpdate: handleActivityUpdate,
      onActivityDelete: handleActivityDelete,
      onConnect: handleConnect,
      onDisconnect: handleDisconnect,
      onError: handleError,
      onReconnect: handleReconnect,
      ...streamOptions,
    });

    streamRef.current = stream;

    stream.connect().catch((error) => {
      console.error('Failed to connect to activity stream:', error);
      handleError(error);
    });

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      stream.disconnect();
      streamRef.current = null;
    };
  }, [
    organizationId,
    userId,
    entityType,
    entityId,
    loadPersistedActivities,
    calculateUnreadCount,
    handleNewActivity,
    handleActivityUpdate,
    handleActivityDelete,
    handleConnect,
    handleDisconnect,
    handleError,
    handleReconnect,
    streamOptions,
  ]);

  // Public methods
  const markAsRead = useCallback(
    async (activityId: string) => {
      if (!userId) return;

      setState((prevState) => ({
        ...prevState,
        activities: prevState.activities.map((activity) => {
          if (activity.id === activityId) {
            const readBy = activity.read_by || [];
            if (!readBy.includes(userId)) {
              return {
                ...activity,
                read_by: [...readBy, userId],
              };
            }
          }
          return activity;
        }),
        unreadCount: Math.max(0, prevState.unreadCount - 1),
      }));

      // Persist the change
      persistActivities(state.activities);
    },
    [userId, persistActivities, state.activities],
  );

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    setState((prevState) => ({
      ...prevState,
      activities: prevState.activities.map((activity) => {
        const readBy = activity.read_by || [];
        if (!readBy.includes(userId)) {
          return {
            ...activity,
            read_by: [...readBy, userId],
          };
        }
        return activity;
      }),
      unreadCount: 0,
    }));

    // Persist the change
    persistActivities(state.activities);
  }, [userId, persistActivities, state.activities]);

  const clearActivities = useCallback(() => {
    setState((prevState) => ({
      ...prevState,
      activities: [],
      unreadCount: 0,
    }));

    // Clear persistence
    if (enablePersistence && typeof window !== 'undefined') {
      localStorage.removeItem(storageKey);
    }
  }, [enablePersistence, storageKey]);

  const reconnect = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.connect().catch(handleError);
    }
  }, [handleError]);

  const broadcastActivity = useCallback(
    async (
      activity: ActivityFeedType,
      event: 'new' | 'update' | 'delete' = 'new',
    ) => {
      if (streamRef.current) {
        await streamRef.current.broadcastActivity(activity, event);
      }
    },
    [],
  );

  return {
    // State
    ...state,

    // Methods
    markAsRead,
    markAllAsRead,
    clearActivities,
    reconnect,
    broadcastActivity,

    // Stream reference for advanced use cases
    stream: streamRef.current,
  };
}
