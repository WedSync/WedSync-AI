'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import type {
  RealtimePresence,
  RealtimeUpdate,
  TimelineEvent,
  TimelineConflict,
  TimelineComment,
} from '@/types/timeline';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

interface UseTimelineRealtimeReturn {
  presenceData: RealtimePresence[];
  sendUpdate: (update: Partial<RealtimeUpdate>) => void;
  subscribeToUpdates: (callback: (update: RealtimeUpdate) => void) => void;
  isConnected: boolean;
  connectionError: string | null;
}

export function useTimelineRealtime(
  timelineId: string,
): UseTimelineRealtimeReturn {
  const [presenceData, setPresenceData] = useState<RealtimePresence[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);
  const updateCallbacksRef = useRef<((update: RealtimeUpdate) => void)[]>([]);

  // Initialize realtime connection
  useEffect(() => {
    if (!timelineId) return;

    const channelName = `timeline-${timelineId}`;

    // Create channel
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: 'timeline_presence',
        },
      },
    });

    channelRef.current = channel;

    // Handle presence sync
    channel.on('presence', { event: 'sync' }, () => {
      const newState = channel.presenceState();
      const presence: RealtimePresence[] = [];

      for (const [key, presences] of Object.entries(newState)) {
        const latestPresence = (presences as any[])[0];
        if (latestPresence) {
          presence.push({
            user_id: key,
            user_name: latestPresence.user_name || 'Anonymous',
            user_avatar: latestPresence.user_avatar,
            cursor_position: latestPresence.cursor_position,
            selected_event_id: latestPresence.selected_event_id,
            is_editing: latestPresence.is_editing || false,
            last_activity:
              latestPresence.last_activity || new Date().toISOString(),
          });
        }
      }

      setPresenceData(presence);
    });

    // Handle presence joins
    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log('User joined:', key, newPresences);
    });

    // Handle presence leaves
    channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('User left:', key, leftPresences);
    });

    // Handle broadcast events (updates)
    channel.on('broadcast', { event: 'timeline_update' }, ({ payload }) => {
      const update = payload as RealtimeUpdate;
      updateCallbacksRef.current.forEach((callback) => callback(update));
    });

    // Handle database changes
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'timeline_events',
        filter: `timeline_id=eq.${timelineId}`,
      },
      (payload) => {
        const update: RealtimeUpdate = {
          type:
            payload.eventType === 'INSERT'
              ? 'event_create'
              : payload.eventType === 'UPDATE'
                ? 'event_update'
                : 'event_delete',
          payload: payload.new || payload.old,
          user_id: 'system',
          timestamp: new Date().toISOString(),
        };
        updateCallbacksRef.current.forEach((callback) => callback(update));
      },
    );

    // Handle conflicts table changes
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'timeline_conflicts',
        filter: `timeline_id=eq.${timelineId}`,
      },
      (payload) => {
        const update: RealtimeUpdate = {
          type: 'conflict_detected',
          payload: payload.new || payload.old,
          user_id: 'system',
          timestamp: new Date().toISOString(),
        };
        updateCallbacksRef.current.forEach((callback) => callback(update));
      },
    );

    // Handle comments table changes
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'timeline_comments',
        filter: `timeline_id=eq.${timelineId}`,
      },
      (payload) => {
        const update: RealtimeUpdate = {
          type: 'comment_added',
          payload: payload.new || payload.old,
          user_id: payload.new?.user_id || 'system',
          timestamp: new Date().toISOString(),
        };
        updateCallbacksRef.current.forEach((callback) => callback(update));
      },
    );

    // Subscribe to channel
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        setConnectionError(null);

        // Track initial presence
        await channel.track({
          user_name: 'Current User', // Replace with actual user data
          user_avatar: null,
          cursor_position: null,
          selected_event_id: null,
          is_editing: false,
          last_activity: new Date().toISOString(),
        });
      } else if (status === 'CHANNEL_ERROR') {
        setIsConnected(false);
        setConnectionError('Failed to connect to realtime channel');
      } else if (status === 'TIMED_OUT') {
        setIsConnected(false);
        setConnectionError('Connection timed out');
      }
    });

    // Cleanup on unmount
    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [timelineId]);

  // Send cursor position updates
  const updateCursorPosition = useCallback(
    async (position: { x: number; y: number }) => {
      if (!channelRef.current) return;

      await channelRef.current.track({
        cursor_position: position,
        last_activity: new Date().toISOString(),
      });
    },
    [],
  );

  // Send editing status updates
  const updateEditingStatus = useCallback(
    async (isEditing: boolean, eventId?: string) => {
      if (!channelRef.current) return;

      await channelRef.current.track({
        is_editing: isEditing,
        selected_event_id: eventId || null,
        last_activity: new Date().toISOString(),
      });
    },
    [],
  );

  // Send broadcast updates
  const sendUpdate = useCallback(async (update: Partial<RealtimeUpdate>) => {
    if (!channelRef.current) return;

    const fullUpdate: RealtimeUpdate = {
      type: 'event_update',
      payload: {},
      user_id: 'current_user', // Replace with actual user ID
      timestamp: new Date().toISOString(),
      ...update,
    };

    await channelRef.current.send({
      type: 'broadcast',
      event: 'timeline_update',
      payload: fullUpdate,
    });
  }, []);

  // Subscribe to updates
  const subscribeToUpdates = useCallback(
    (callback: (update: RealtimeUpdate) => void) => {
      updateCallbacksRef.current.push(callback);

      // Return unsubscribe function
      return () => {
        updateCallbacksRef.current = updateCallbacksRef.current.filter(
          (cb) => cb !== callback,
        );
      };
    },
    [],
  );

  // Heartbeat to keep presence alive
  useEffect(() => {
    const interval = setInterval(async () => {
      if (channelRef.current && isConnected) {
        await channelRef.current.track({
          last_activity: new Date().toISOString(),
        });
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [isConnected]);

  return {
    presenceData,
    sendUpdate,
    subscribeToUpdates,
    isConnected,
    connectionError,
  };
}
