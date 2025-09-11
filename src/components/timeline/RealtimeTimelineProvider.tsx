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
import { useRealtime } from '../performance/RealtimeProvider';
import { usePerformanceMonitor } from '../../hooks/usePerformanceOptimization';
import { TimelineEvent, TimelineConflict } from '../../types/timeline';

interface RealtimeTimelineEvent {
  type:
    | 'event_created'
    | 'event_updated'
    | 'event_deleted'
    | 'event_moved'
    | 'conflict_detected';
  eventId: string;
  event?: TimelineEvent;
  conflict?: TimelineConflict;
  userId: string;
  timestamp: number;
  changes?: Partial<TimelineEvent>;
}

interface CollaboratorCursor {
  userId: string;
  userName: string;
  color: string;
  position: {
    timeSlot: string;
    x: number;
    y: number;
  };
  action: 'selecting' | 'editing' | 'moving' | 'idle';
  selectedEventId?: string;
}

interface RealtimeTimelineState {
  collaborators: Map<string, CollaboratorCursor>;
  activeEditSessions: Map<
    string,
    {
      eventId: string;
      userId: string;
      startTime: number;
      lockExpiry: number;
    }
  >;
  pendingChanges: Map<string, RealtimeTimelineEvent>;
  conflictDetector: {
    lastCheck: number;
    conflicts: TimelineConflict[];
  };
  syncStatus: {
    lastSync: number;
    pendingOperations: number;
    connectionHealth: 'excellent' | 'good' | 'poor' | 'offline';
  };
}

interface RealtimeTimelineContextValue {
  // State
  state: RealtimeTimelineState;

  // Event operations
  createEvent: (event: Omit<TimelineEvent, 'id'>) => Promise<boolean>;
  updateEvent: (
    eventId: string,
    changes: Partial<TimelineEvent>,
  ) => Promise<boolean>;
  deleteEvent: (eventId: string) => Promise<boolean>;
  moveEvent: (
    eventId: string,
    newTimeSlot: string,
    newPosition: number,
  ) => Promise<boolean>;

  // Collaboration
  startEditSession: (eventId: string) => Promise<boolean>;
  endEditSession: (eventId: string) => void;
  isEventLocked: (eventId: string) => boolean;
  getEventLock: (
    eventId: string,
  ) => { userId: string; userName: string } | null;

  // Cursor tracking
  updateCursor: (
    position: CollaboratorCursor['position'],
    action?: CollaboratorCursor['action'],
  ) => void;
  getCollaborators: () => CollaboratorCursor[];

  // Conflict management
  detectConflicts: (events: TimelineEvent[]) => TimelineConflict[];
  resolveConflict: (
    conflictId: string,
    resolution: 'accept_theirs' | 'accept_mine' | 'merge',
  ) => Promise<boolean>;

  // Sync operations
  forceSyncTimeline: () => Promise<void>;
  getSyncStatus: () => RealtimeTimelineState['syncStatus'];
}

const RealtimeTimelineContext =
  createContext<RealtimeTimelineContextValue | null>(null);

export const useRealtimeTimeline = () => {
  const context = useContext(RealtimeTimelineContext);
  if (!context) {
    throw new Error(
      'useRealtimeTimeline must be used within RealtimeTimelineProvider',
    );
  }
  return context;
};

interface RealtimeTimelineProviderProps {
  children: React.ReactNode;
  timelineId: string;
  userId: string;
  userName: string;
  userColor?: string;
  onEventChange?: (
    event: TimelineEvent,
    type: 'created' | 'updated' | 'deleted',
  ) => void;
  onConflictDetected?: (conflict: TimelineConflict) => void;
}

export const RealtimeTimelineProvider: React.FC<
  RealtimeTimelineProviderProps
> = ({
  children,
  timelineId,
  userId,
  userName,
  userColor = '#3B82F6',
  onEventChange,
  onConflictDetected,
}) => {
  const realtime = useRealtime();
  const { logMetric } = usePerformanceMonitor('RealtimeTimeline');

  const channelName = `timeline:${timelineId}`;
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const cursorUpdateThrottleRef = useRef<NodeJS.Timeout | null>(null);
  const conflictCheckRef = useRef<NodeJS.Timeout | null>(null);
  const editSessionTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const [state, setState] = useState<RealtimeTimelineState>({
    collaborators: new Map(),
    activeEditSessions: new Map(),
    pendingChanges: new Map(),
    conflictDetector: {
      lastCheck: Date.now(),
      conflicts: [],
    },
    syncStatus: {
      lastSync: Date.now(),
      pendingOperations: 0,
      connectionHealth: 'excellent',
    },
  });

  // Handle real-time timeline events
  const handleRealtimeEvent = useCallback(
    (event: RealtimeTimelineEvent) => {
      logMetric('realtimeTimelineEventReceived', 1);

      switch (event.type) {
        case 'event_created':
          if (event.event && onEventChange) {
            onEventChange(event.event, 'created');
          }
          break;

        case 'event_updated':
          if (event.event && onEventChange) {
            onEventChange(event.event, 'updated');
          }
          break;

        case 'event_deleted':
          if (event.event && onEventChange) {
            onEventChange(event.event, 'deleted');
          }
          break;

        case 'event_moved':
          if (event.event && onEventChange) {
            onEventChange(event.event, 'updated');
          }
          break;

        case 'conflict_detected':
          if (event.conflict && onConflictDetected) {
            onConflictDetected(event.conflict);
          }
          setState((prev) => ({
            ...prev,
            conflictDetector: {
              ...prev.conflictDetector,
              conflicts: [...prev.conflictDetector.conflicts, event.conflict!],
            },
          }));
          break;
      }

      // Update sync status
      setState((prev) => ({
        ...prev,
        syncStatus: {
          ...prev.syncStatus,
          lastSync: Date.now(),
        },
      }));
    },
    [onEventChange, onConflictDetected, logMetric],
  );

  // Create event with real-time sync
  const createEvent = useCallback(
    async (eventData: Omit<TimelineEvent, 'id'>): Promise<boolean> => {
      const newEvent: TimelineEvent = {
        ...eventData,
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };

      const success = await realtime.broadcast(
        channelName,
        'event_created',
        { event: newEvent },
        'high',
      );

      if (success) {
        logMetric('realtimeTimelineEventCreated', 1);
      } else {
        logMetric('realtimeTimelineEventCreateFailed', 1);
      }

      return success;
    },
    [channelName, realtime, logMetric],
  );

  // Update event with real-time sync
  const updateEvent = useCallback(
    async (
      eventId: string,
      changes: Partial<TimelineEvent>,
    ): Promise<boolean> => {
      // Check if event is locked by another user
      const lock = state.activeEditSessions.get(eventId);
      if (lock && lock.userId !== userId && Date.now() < lock.lockExpiry) {
        logMetric('realtimeTimelineEventUpdateBlocked', 1);
        return false;
      }

      const success = await realtime.broadcast(
        channelName,
        'event_updated',
        { eventId, changes },
        'high',
      );

      if (success) {
        logMetric('realtimeTimelineEventUpdated', 1);
      } else {
        logMetric('realtimeTimelineEventUpdateFailed', 1);
      }

      return success;
    },
    [channelName, realtime, state.activeEditSessions, userId, logMetric],
  );

  // Delete event with real-time sync
  const deleteEvent = useCallback(
    async (eventId: string): Promise<boolean> => {
      const success = await realtime.broadcast(
        channelName,
        'event_deleted',
        { eventId },
        'high',
      );

      if (success) {
        logMetric('realtimeTimelineEventDeleted', 1);

        // Clear any active edit session
        setState((prev) => {
          const newSessions = new Map(prev.activeEditSessions);
          newSessions.delete(eventId);
          return { ...prev, activeEditSessions: newSessions };
        });
      } else {
        logMetric('realtimeTimelineEventDeleteFailed', 1);
      }

      return success;
    },
    [channelName, realtime, logMetric],
  );

  // Move event with real-time sync
  const moveEvent = useCallback(
    async (
      eventId: string,
      newTimeSlot: string,
      newPosition: number,
    ): Promise<boolean> => {
      const success = await realtime.broadcast(
        channelName,
        'event_moved',
        { eventId, timeSlot: newTimeSlot, position: newPosition },
        'medium',
      );

      if (success) {
        logMetric('realtimeTimelineEventMoved', 1);
      } else {
        logMetric('realtimeTimelineEventMoveFailed', 1);
      }

      return success;
    },
    [channelName, realtime, logMetric],
  );

  // Start edit session with locking
  const startEditSession = useCallback(
    async (eventId: string): Promise<boolean> => {
      const lockExpiry = Date.now() + 300000; // 5 minutes lock

      const success = await realtime.broadcast(
        channelName,
        'edit_session_start',
        { eventId, lockExpiry },
        'critical',
      );

      if (success) {
        setState((prev) => ({
          ...prev,
          activeEditSessions: new Map(prev.activeEditSessions).set(eventId, {
            eventId,
            userId,
            startTime: Date.now(),
            lockExpiry,
          }),
        }));

        // Set timeout to auto-release lock
        const timeout = setTimeout(() => {
          endEditSession(eventId);
        }, 300000);

        editSessionTimeoutRef.current.set(eventId, timeout);
        logMetric('realtimeTimelineEditSessionStarted', 1);
      }

      return success;
    },
    [channelName, realtime, userId, logMetric],
  );

  // End edit session
  const endEditSession = useCallback(
    (eventId: string) => {
      setState((prev) => {
        const newSessions = new Map(prev.activeEditSessions);
        newSessions.delete(eventId);
        return { ...prev, activeEditSessions: newSessions };
      });

      const timeout = editSessionTimeoutRef.current.get(eventId);
      if (timeout) {
        clearTimeout(timeout);
        editSessionTimeoutRef.current.delete(eventId);
      }

      realtime.broadcast(
        channelName,
        'edit_session_end',
        { eventId },
        'medium',
      );

      logMetric('realtimeTimelineEditSessionEnded', 1);
    },
    [channelName, realtime, logMetric],
  );

  // Check if event is locked
  const isEventLocked = useCallback(
    (eventId: string): boolean => {
      const lock = state.activeEditSessions.get(eventId);
      return lock
        ? lock.userId !== userId && Date.now() < lock.lockExpiry
        : false;
    },
    [state.activeEditSessions, userId],
  );

  // Get event lock info
  const getEventLock = useCallback(
    (eventId: string) => {
      const lock = state.activeEditSessions.get(eventId);
      if (!lock || lock.userId === userId) return null;

      const collaborator = state.collaborators.get(lock.userId);
      return {
        userId: lock.userId,
        userName: collaborator?.userName || 'Unknown User',
      };
    },
    [state.activeEditSessions, state.collaborators, userId],
  );

  // Update cursor position with throttling
  const updateCursor = useCallback(
    (
      position: CollaboratorCursor['position'],
      action: CollaboratorCursor['action'] = 'idle',
    ) => {
      if (cursorUpdateThrottleRef.current) {
        clearTimeout(cursorUpdateThrottleRef.current);
      }

      cursorUpdateThrottleRef.current = setTimeout(() => {
        const cursor: CollaboratorCursor = {
          userId,
          userName,
          color: userColor,
          position,
          action,
        };

        realtime.broadcast(
          `${channelName}:cursors`,
          'cursor_update',
          cursor,
          'low',
        );

        // Update local state
        setState((prev) => ({
          ...prev,
          collaborators: new Map(prev.collaborators).set(userId, cursor),
        }));
      }, 100); // Throttle to 100ms
    },
    [channelName, realtime, userId, userName, userColor],
  );

  // Get all collaborators
  const getCollaborators = useCallback((): CollaboratorCursor[] => {
    return Array.from(state.collaborators.values()).filter(
      (c) => c.userId !== userId,
    );
  }, [state.collaborators, userId]);

  // Detect timeline conflicts
  const detectConflicts = useCallback(
    (events: TimelineEvent[]): TimelineConflict[] => {
      const conflicts: TimelineConflict[] = [];
      const eventsByTimeSlot = new Map<string, TimelineEvent[]>();

      // Group events by time slot
      events.forEach((event) => {
        const timeSlot = `${event.date}_${event.startTime}`;
        if (!eventsByTimeSlot.has(timeSlot)) {
          eventsByTimeSlot.set(timeSlot, []);
        }
        eventsByTimeSlot.get(timeSlot)!.push(event);
      });

      // Check for conflicts in each time slot
      eventsByTimeSlot.forEach((slotEvents, timeSlot) => {
        if (slotEvents.length > 1) {
          // Check for venue conflicts
          const venueGroups = new Map<string, TimelineEvent[]>();
          slotEvents.forEach((event) => {
            if (event.venue) {
              if (!venueGroups.has(event.venue)) {
                venueGroups.set(event.venue, []);
              }
              venueGroups.get(event.venue)!.push(event);
            }
          });

          venueGroups.forEach((venueEvents, venue) => {
            if (venueEvents.length > 1) {
              conflicts.push({
                id: `venue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'venue_double_booking',
                events: venueEvents.map((e) => e.id),
                timeSlot,
                venue,
                severity: 'high',
                description: `Multiple events scheduled at ${venue} during ${timeSlot}`,
                suggestions: [
                  'Move one event to a different time',
                  'Use a different venue for one event',
                  'Combine events if possible',
                ],
              });
            }
          });

          // Check for vendor conflicts
          const vendorGroups = new Map<string, TimelineEvent[]>();
          slotEvents.forEach((event) => {
            event.vendors?.forEach((vendor) => {
              if (!vendorGroups.has(vendor.id)) {
                vendorGroups.set(vendor.id, []);
              }
              vendorGroups.get(vendor.id)!.push(event);
            });
          });

          vendorGroups.forEach((vendorEvents, vendorId) => {
            if (vendorEvents.length > 1) {
              conflicts.push({
                id: `vendor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'vendor_double_booking',
                events: vendorEvents.map((e) => e.id),
                timeSlot,
                vendorId,
                severity: 'medium',
                description: `Vendor scheduled for multiple events during ${timeSlot}`,
                suggestions: [
                  'Assign different vendors',
                  'Adjust event timing',
                  'Check vendor availability',
                ],
              });
            }
          });
        }
      });

      return conflicts;
    },
    [],
  );

  // Resolve conflict
  const resolveConflict = useCallback(
    async (
      conflictId: string,
      resolution: 'accept_theirs' | 'accept_mine' | 'merge',
    ): Promise<boolean> => {
      const success = await realtime.broadcast(
        channelName,
        'conflict_resolved',
        { conflictId, resolution },
        'high',
      );

      if (success) {
        setState((prev) => ({
          ...prev,
          conflictDetector: {
            ...prev.conflictDetector,
            conflicts: prev.conflictDetector.conflicts.filter(
              (c) => c.id !== conflictId,
            ),
          },
        }));
        logMetric('realtimeTimelineConflictResolved', 1);
      }

      return success;
    },
    [channelName, realtime, logMetric],
  );

  // Force sync timeline
  const forceSyncTimeline = useCallback(async (): Promise<void> => {
    setState((prev) => ({
      ...prev,
      syncStatus: {
        ...prev.syncStatus,
        pendingOperations: prev.syncStatus.pendingOperations + 1,
      },
    }));

    const success = await realtime.broadcast(
      channelName,
      'force_sync',
      { timestamp: Date.now() },
      'critical',
    );

    setState((prev) => ({
      ...prev,
      syncStatus: {
        ...prev.syncStatus,
        pendingOperations: Math.max(0, prev.syncStatus.pendingOperations - 1),
        lastSync: Date.now(),
      },
    }));

    if (success) {
      logMetric('realtimeTimelineForceSyncSuccess', 1);
    } else {
      logMetric('realtimeTimelineForceSyncFailed', 1);
    }
  }, [channelName, realtime, logMetric]);

  // Get sync status
  const getSyncStatus = useCallback(() => {
    return state.syncStatus;
  }, [state.syncStatus]);

  // Subscribe to timeline channel on mount
  useEffect(() => {
    if (realtime.state.isConnected) {
      unsubscribeRef.current = realtime.subscribe(channelName, (event) => {
        handleRealtimeEvent(event.data as RealtimeTimelineEvent);
      });

      // Also subscribe to cursor updates
      realtime.subscribe(`${channelName}:cursors`, (event) => {
        const cursor = event.data as CollaboratorCursor;
        if (cursor.userId !== userId) {
          setState((prev) => ({
            ...prev,
            collaborators: new Map(prev.collaborators).set(
              cursor.userId,
              cursor,
            ),
          }));
        }
      });

      logMetric('realtimeTimelineChannelSubscribed', 1);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [channelName, realtime, handleRealtimeEvent, userId, logMetric]);

  // Update connection health based on realtime state
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      syncStatus: {
        ...prev.syncStatus,
        connectionHealth:
          realtime.getConnectionQuality() as RealtimeTimelineState['syncStatus']['connectionHealth'],
      },
    }));
  }, [realtime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all timeouts
      if (cursorUpdateThrottleRef.current) {
        clearTimeout(cursorUpdateThrottleRef.current);
      }
      if (conflictCheckRef.current) {
        clearTimeout(conflictCheckRef.current);
      }
      editSessionTimeoutRef.current.forEach((timeout) => clearTimeout(timeout));
    };
  }, []);

  const contextValue: RealtimeTimelineContextValue = useMemo(
    () => ({
      state,
      createEvent,
      updateEvent,
      deleteEvent,
      moveEvent,
      startEditSession,
      endEditSession,
      isEventLocked,
      getEventLock,
      updateCursor,
      getCollaborators,
      detectConflicts,
      resolveConflict,
      forceSyncTimeline,
      getSyncStatus,
    }),
    [
      state,
      createEvent,
      updateEvent,
      deleteEvent,
      moveEvent,
      startEditSession,
      endEditSession,
      isEventLocked,
      getEventLock,
      updateCursor,
      getCollaborators,
      detectConflicts,
      resolveConflict,
      forceSyncTimeline,
      getSyncStatus,
    ],
  );

  return (
    <RealtimeTimelineContext.Provider value={contextValue}>
      {children}
    </RealtimeTimelineContext.Provider>
  );
};

export default RealtimeTimelineProvider;
