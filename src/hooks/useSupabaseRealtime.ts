'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  RealtimeChannel,
  RealtimeChannelSendResponse,
} from '@supabase/supabase-js';

interface UseSupabaseRealtimeOptions {
  channel: string;
  onUpdate?: (payload: any) => void;
  onPresence?: (users: any[]) => void;
  onInsert?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  enabled?: boolean;
  table?: string;
  schema?: string;
  filter?: string;
}

interface RealtimeConnection {
  channel: RealtimeChannel | null;
  isConnected: boolean;
  send: (event: string, payload: any) => Promise<RealtimeChannelSendResponse>;
  updatePresence: (data: any) => void;
  disconnect: () => void;
}

export function useSupabaseRealtime({
  channel: channelName,
  onUpdate,
  onPresence,
  onInsert,
  onDelete,
  enabled = true,
  table,
  schema = 'public',
  filter,
}: UseSupabaseRealtimeOptions): RealtimeConnection {
  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isConnectedRef = useRef(false);

  const send = useCallback(
    async (
      event: string,
      payload: any,
    ): Promise<RealtimeChannelSendResponse> => {
      if (!channelRef.current) {
        throw new Error('Channel not connected');
      }
      return channelRef.current.send({
        type: 'broadcast',
        event,
        payload,
      });
    },
    [],
  );

  const updatePresence = useCallback((data: any) => {
    if (!channelRef.current) return;
    channelRef.current.track(data);
  }, []);

  const disconnect = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      isConnectedRef.current = false;
    }
  }, [supabase]);

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    // Set up presence tracking
    if (onPresence) {
      channel.on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const users = Object.keys(presenceState).map(
          (key) => presenceState[key][0],
        );
        onPresence(users);
      });

      channel.on('presence', { event: 'join' }, ({ newPresences }) => {
        const presenceState = channel.presenceState();
        const users = Object.keys(presenceState).map(
          (key) => presenceState[key][0],
        );
        onPresence(users);
      });

      channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const presenceState = channel.presenceState();
        const users = Object.keys(presenceState).map(
          (key) => presenceState[key][0],
        );
        onPresence(users);
      });
    }

    // Set up database change listeners
    if (table) {
      if (onUpdate) {
        channel.on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema,
            table,
            ...(filter && { filter }),
          },
          onUpdate,
        );
      }

      if (onInsert) {
        channel.on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema,
            table,
            ...(filter && { filter }),
          },
          onInsert,
        );
      }

      if (onDelete) {
        channel.on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema,
            table,
            ...(filter && { filter }),
          },
          onDelete,
        );
      }
    }

    // Set up broadcast listeners
    channel.on('broadcast', { event: '*' }, (payload) => {
      if (onUpdate) {
        onUpdate(payload);
      }
    });

    // Subscribe to the channel
    channel.subscribe((status) => {
      console.log(`Realtime channel ${channelName} status:`, status);
      isConnectedRef.current = status === 'SUBSCRIBED';
    });

    // Cleanup function
    return () => {
      disconnect();
    };
  }, [
    channelName,
    enabled,
    onUpdate,
    onPresence,
    onInsert,
    onDelete,
    table,
    schema,
    filter,
    supabase,
    disconnect,
  ]);

  return {
    channel: channelRef.current,
    isConnected: isConnectedRef.current,
    send,
    updatePresence,
    disconnect,
  };
}

// Specialized hook for form collaboration
export function useFormRealtime(formId: string, enabled = true) {
  return useSupabaseRealtime({
    channel: `form:${formId}`,
    table: 'forms',
    filter: `id=eq.${formId}`,
    enabled,
  });
}

// Specialized hook for client collaboration
export function useClientRealtime(clientId: string, enabled = true) {
  return useSupabaseRealtime({
    channel: `client:${clientId}`,
    table: 'clients',
    filter: `id=eq.${clientId}`,
    enabled,
  });
}

// Specialized hook for journey collaboration
export function useJourneyRealtime(journeyId: string, enabled = true) {
  return useSupabaseRealtime({
    channel: `journey:${journeyId}`,
    table: 'journey_instances',
    filter: `journey_id=eq.${journeyId}`,
    enabled,
  });
}

// Specialized hook for photo groups collaboration - WS-153
export function usePhotoGroupsRealtime(coupleId: string, enabled = true) {
  return useSupabaseRealtime({
    channel: `photo-groups:${coupleId}`,
    table: 'photo_groups',
    filter: `couple_id=eq.${coupleId}`,
    enabled,
  });
}

// Specialized hook for photo group assignments - WS-153
export function usePhotoGroupAssignmentsRealtime(
  coupleId: string,
  enabled = true,
) {
  return useSupabaseRealtime({
    channel: `photo-group-assignments:${coupleId}`,
    table: 'photo_group_assignments',
    filter: `photo_group_id.in.(select id from photo_groups where couple_id = '${coupleId}')`,
    enabled,
  });
}

// Specialized hook for photo group scheduling - WS-153
export function usePhotoGroupSchedulingRealtime(
  coupleId: string,
  enabled = true,
) {
  return useSupabaseRealtime({
    channel: `photo-group-scheduling:${coupleId}`,
    enabled,
  });
}

// Specialized hook for photo group conflicts - WS-153
export function usePhotoGroupConflictsRealtime(
  coupleId: string,
  enabled = true,
) {
  return useSupabaseRealtime({
    channel: `photo-group-conflicts:${coupleId}`,
    enabled,
  });
}
