'use client';

// useChannelSubscription Hook for WS-203
// Supabase realtime integration for wedding channel management

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type {
  ChannelInfo,
  ChannelMessage,
  ChannelStatus,
  ChannelName,
} from '@/types/websocket';

interface UseChannelSubscriptionProps {
  userId: string;
  userType: 'supplier' | 'couple';
}

interface ChannelSubscriptionResult {
  subscriptions: Map<string, RealtimeChannel>;
  subscribeToChannel: (channelName: string) => Promise<void>;
  unsubscribeFromChannel: (channelName: string) => Promise<void>;
  getChannelList: () => Promise<ChannelInfo[]>;
  channelList: ChannelInfo[];
  isConnected: boolean;
  sendMessage: (
    channelName: string,
    message: string,
    messageType?: 'text' | 'status' | 'emergency',
  ) => Promise<void>;
  updateChannelActivity: (channelName: string) => Promise<void>;
}

export function useChannelSubscription({
  userId,
  userType,
}: UseChannelSubscriptionProps): ChannelSubscriptionResult {
  const [subscriptions, setSubscriptions] = useState<
    Map<string, RealtimeChannel>
  >(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [channelList, setChannelList] = useState<ChannelInfo[]>([]);

  const supabase = useMemo(() => createClient(), []);

  // Subscribe to a specific channel
  const subscribeToChannel = useCallback(
    async (channelName: string): Promise<void> => {
      try {
        // Check if already subscribed
        if (subscriptions.has(channelName)) {
          console.log(`Already subscribed to ${channelName}`);
          return;
        }

        // Validate channel access permissions
        const hasAccess = await validateChannelAccess(channelName, userId);
        if (!hasAccess) {
          throw new Error(`Access denied to channel: ${channelName}`);
        }

        // Create Supabase channel
        const channel = supabase.channel(channelName, {
          config: {
            presence: { key: userId },
            broadcast: { self: true },
          },
        });

        // Set up event handlers
        channel
          .on('broadcast', { event: '*' }, (payload) => {
            // Handle incoming messages
            handleChannelMessage(channelName, payload);
          })
          .on('presence', { event: 'sync' }, () => {
            // Handle presence updates
            handlePresenceSync(channelName, channel.presenceState());
          })
          .on('presence', { event: 'join' }, ({ key, newPresences }) => {
            // Handle user join
            handleUserJoin(channelName, key, newPresences);
          })
          .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
            // Handle user leave
            handleUserLeave(channelName, key, leftPresences);
          });

        // Subscribe to channel
        const status = await channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            setSubscriptions((prev) => new Map(prev.set(channelName, channel)));
            setIsConnected(true);
            console.log(`Subscribed to ${channelName}`);

            // Track presence
            await channel.track({
              userId,
              userType,
              joinedAt: new Date().toISOString(),
            });
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`Failed to subscribe to ${channelName}`);
            throw new Error(`Channel subscription failed: ${channelName}`);
          }
        });
      } catch (error) {
        console.error(`Failed to subscribe to channel ${channelName}:`, error);
        throw error;
      }
    },
    [subscriptions, userId, userType, supabase],
  );

  // Unsubscribe from a channel
  const unsubscribeFromChannel = useCallback(
    async (channelName: string): Promise<void> => {
      const channel = subscriptions.get(channelName);
      if (channel) {
        await supabase.removeChannel(channel);
        setSubscriptions((prev) => {
          const newMap = new Map(prev);
          newMap.delete(channelName);
          return newMap;
        });
        console.log(`Unsubscribed from ${channelName}`);
      }
    },
    [subscriptions, supabase],
  );

  // Get available channels for user
  const getChannelList = useCallback(async (): Promise<ChannelInfo[]> => {
    try {
      const { data, error } = await supabase
        .from('websocket_channels')
        .select('*')
        .or(`created_by.eq.${userId},scope.eq.${userType}`)
        .order('last_activity', { ascending: false });

      if (error) throw error;

      const channels: ChannelInfo[] =
        data?.map((ch) => ({
          id: ch.id,
          name: ch.channel_name,
          type: ch.channel_type,
          scope: ch.scope,
          entity: ch.entity,
          entityId: ch.entity_id,
          lastActivity: ch.last_activity
            ? new Date(ch.last_activity)
            : undefined,
          isPrivate: ch.is_private || false,
          memberCount: ch.member_count || 0,
          unreadCount: 0, // Will be updated by message handlers
        })) || [];

      setChannelList(channels);
      return channels;
    } catch (error) {
      console.error('Failed to get channel list:', error);
      return [];
    }
  }, [userId, userType, supabase]);

  // Send message to channel
  const sendMessage = useCallback(
    async (
      channelName: string,
      message: string,
      messageType: 'text' | 'status' | 'emergency' = 'text',
    ) => {
      const channel = subscriptions.get(channelName);
      if (!channel) {
        throw new Error(`Not subscribed to channel: ${channelName}`);
      }

      const messageData = {
        id: crypto.randomUUID(),
        channelName,
        senderId: userId,
        senderType: userType,
        message,
        messageType,
        timestamp: new Date().toISOString(),
        priority: messageType === 'emergency' ? 'urgent' : 'normal',
      };

      // Broadcast message
      await channel.send({
        type: 'broadcast',
        event: 'message',
        payload: messageData,
      });

      // Also store in database for persistence
      await supabase.from('channel_messages').insert({
        channel_name: channelName,
        sender_id: userId,
        sender_type: userType,
        message,
        message_type: messageType,
        priority: messageType === 'emergency' ? 'urgent' : 'normal',
      });
    },
    [subscriptions, userId, userType, supabase],
  );

  // Update channel activity timestamp
  const updateChannelActivity = useCallback(
    async (channelName: string) => {
      await supabase
        .from('websocket_channels')
        .update({
          last_activity: new Date().toISOString(),
          updated_by: userId,
        })
        .eq('channel_name', channelName);
    },
    [supabase, userId],
  );

  // Handle incoming channel messages
  const handleChannelMessage = useCallback(
    (channelName: string, payload: any) => {
      // Emit custom event for components to handle
      window.dispatchEvent(
        new CustomEvent('channelMessage', {
          detail: { channelName, payload },
        }),
      );
    },
    [],
  );

  // Handle presence sync
  const handlePresenceSync = useCallback(
    (channelName: string, presenceState: any) => {
      const memberCount = Object.keys(presenceState).length;

      // Update channel list with new member count
      setChannelList((prev) =>
        prev.map((channel) =>
          channel.name === channelName ? { ...channel, memberCount } : channel,
        ),
      );

      // Emit presence update event
      window.dispatchEvent(
        new CustomEvent('channelPresenceUpdate', {
          detail: { channelName, memberCount, presenceState },
        }),
      );
    },
    [],
  );

  // Handle user join
  const handleUserJoin = useCallback(
    (channelName: string, key: string, newPresences: any[]) => {
      console.log(`User ${key} joined channel ${channelName}`);
    },
    [],
  );

  // Handle user leave
  const handleUserLeave = useCallback(
    (channelName: string, key: string, leftPresences: any[]) => {
      console.log(`User ${key} left channel ${channelName}`);
    },
    [],
  );

  // Validate channel access permissions
  const validateChannelAccess = useCallback(
    async (channelName: string, userId: string): Promise<boolean> => {
      try {
        const { data, error } = await supabase
          .from('channel_permissions')
          .select('can_join')
          .eq('channel_name', channelName)
          .eq('user_id', userId)
          .single();

        if (error && error.code !== 'PGRST116') {
          // PGRST116 = no rows returned
          throw error;
        }

        // If no specific permission found, check if user has general access
        if (!data) {
          const [scope, entity, id] = channelName.split(':');

          // Suppliers can access their own channels and wedding channels they're involved in
          if (userType === 'supplier') {
            if (scope === 'supplier' && id === userId) return true;

            // Check if supplier is involved in this wedding
            if (scope === 'wedding') {
              const { data: involvement } = await supabase
                .from('wedding_suppliers')
                .select('id')
                .eq('wedding_id', id)
                .eq('supplier_id', userId)
                .single();
              return !!involvement;
            }
          }

          // Couples can access their own wedding channels
          if (userType === 'couple') {
            if (scope === 'couple' && id === userId) return true;
            if (scope === 'wedding') {
              const { data: wedding } = await supabase
                .from('weddings')
                .select('id')
                .eq('id', id)
                .or(`bride_id.eq.${userId},groom_id.eq.${userId}`)
                .single();
              return !!wedding;
            }
          }

          return false;
        }

        return data.can_join;
      } catch (error) {
        console.error('Failed to validate channel access:', error);
        return false;
      }
    },
    [supabase, userType],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      subscriptions.forEach(async (channel) => {
        await supabase.removeChannel(channel);
      });
    };
  }, [subscriptions, supabase]);

  // Initialize channel list
  useEffect(() => {
    getChannelList();
  }, [getChannelList]);

  return {
    subscriptions,
    subscribeToChannel,
    unsubscribeFromChannel,
    getChannelList,
    channelList,
    isConnected,
    sendMessage,
    updateChannelActivity,
  };
}
