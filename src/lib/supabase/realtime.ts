'use client';

import { createClient } from './client';
import { Database } from '@/types/database';
import { SecureQueryBuilder } from '@/lib/database/secure-query-builder';
import { useEffect, useRef, useState } from 'react';
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';

type Message = Database['public']['Tables']['messages']['Row'];
type Conversation = Database['public']['Tables']['conversations']['Row'];
type ActivityFeed = Database['public']['Tables']['activity_feeds']['Row'];

export interface RealtimeMessage extends Message {
  sender_avatar_url?: string | null;
}

export interface RealtimeConversation extends Conversation {
  client_name?: string;
  vendor_name?: string;
}

export function useRealtimeMessages(conversationId: string) {
  const [messages, setMessages] = useState<RealtimeMessage[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!conversationId) return;

    // Set up the channel for this conversation
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: SecureQueryBuilder.createSafeFilter(
            'conversation_id',
            'eq',
            conversationId,
          ),
        },
        (payload: RealtimePostgresChangesPayload<Message>) => {
          const newMessage = payload.new as RealtimeMessage;
          setMessages((current) => [...current, newMessage]);
        },
      )
      .on(
        'postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: SecureQueryBuilder.createSafeFilter(
            'conversation_id',
            'eq',
            conversationId,
          ),
        },
        (payload: RealtimePostgresChangesPayload<Message>) => {
          const updatedMessage = payload.new as RealtimeMessage;
          setMessages((current) =>
            current.map((msg) =>
              msg.id === updatedMessage.id ? updatedMessage : msg,
            ),
          );
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, supabase]);

  const sendMessage = async (
    content: string,
    messageType: Message['message_type'] = 'text',
    metadata?: any,
  ) => {
    if (!conversationId) return null;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content,
          message_type: messageType,
          metadata,
          is_read: false,
          is_system_message: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  };

  return { messages, sendMessage, markAsRead };
}

export function useRealtimeConversations(
  organizationId: string,
  userId: string,
  userType: 'client' | 'vendor',
) {
  const [conversations, setConversations] = useState<RealtimeConversation[]>(
    [],
  );
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!organizationId || !userId) return;

    // Set up the channel for conversations
    const channel = supabase
      .channel(`conversations:${organizationId}:${userId}`)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter:
            userType === 'client'
              ? `client_id=eq.${userId}`
              : `vendor_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<Conversation>) => {
          if (payload.eventType === 'INSERT') {
            const newConversation = payload.new as RealtimeConversation;
            setConversations((current) => [newConversation, ...current]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedConversation = payload.new as RealtimeConversation;
            setConversations((current) =>
              current.map((conv) =>
                conv.id === updatedConversation.id ? updatedConversation : conv,
              ),
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedConversation = payload.old as RealtimeConversation;
            setConversations((current) =>
              current.filter((conv) => conv.id !== deletedConversation.id),
            );
          }
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [organizationId, userId, userType, supabase]);

  const createConversation = async (
    clientId: string,
    vendorId: string,
    subject?: string,
  ) => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          client_id: clientId,
          vendor_id: vendorId,
          organization_id: organizationId,
          subject,
          status: 'active',
          last_message_at: new Date().toISOString(),
          unread_count_client: 0,
          unread_count_vendor: 0,
          client_typing: false,
          vendor_typing: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  };

  const updateTypingStatus = async (
    conversationId: string,
    isTyping: boolean,
  ) => {
    try {
      const updateField =
        userType === 'client' ? 'client_typing' : 'vendor_typing';
      const { error } = await supabase
        .from('conversations')
        .update({ [updateField]: isTyping })
        .eq('id', conversationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  };

  return { conversations, createConversation, updateTypingStatus };
}

export function useRealtimeActivityFeed(
  organizationId: string,
  userId?: string,
) {
  const [activities, setActivities] = useState<ActivityFeed[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!organizationId) return;

    // Set up the channel for activity feed
    const channel = supabase
      .channel(`activity_feeds:${organizationId}`)
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_feeds',
          filter: SecureQueryBuilder.createSafeFilter(
            'organization_id',
            'eq',
            organizationId,
          ),
        },
        (payload: RealtimePostgresChangesPayload<ActivityFeed>) => {
          const newActivity = payload.new as ActivityFeed;

          // Filter activities based on visibility and user permissions
          const shouldShow =
            newActivity.is_public ||
            !newActivity.target_user_ids ||
            (userId && newActivity.target_user_ids.includes(userId));

          if (shouldShow) {
            setActivities((current) => [newActivity, ...current.slice(0, 99)]); // Keep last 100 activities
          }
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [organizationId, userId, supabase]);

  const createActivity = async (
    activity: Omit<ActivityFeed, 'id' | 'created_at'>,
  ) => {
    try {
      const { data, error } = await supabase
        .from('activity_feeds')
        .insert(activity)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating activity:', error);
      throw error;
    }
  };

  const markAsRead = async (activityId: string) => {
    if (!userId) return;

    try {
      // Get current activity
      const { data: activity, error: fetchError } = await supabase
        .from('activity_feeds')
        .select('read_by')
        .eq('id', activityId)
        .single();

      if (fetchError) throw fetchError;

      const currentReadBy = activity.read_by || [];
      if (currentReadBy.includes(userId)) return; // Already read

      const { error } = await supabase
        .from('activity_feeds')
        .update({
          read_by: [...currentReadBy, userId],
        })
        .eq('id', activityId);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking activity as read:', error);
    }
  };

  return { activities, createActivity, markAsRead };
}

// Utility function to set up presence tracking for users
export function useRealtimePresence(
  channelName: string,
  userId: string,
  userMetadata: any = {},
) {
  const [onlineUsers, setOnlineUsers] = useState<Record<string, any>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!channelName || !userId) return;

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        setOnlineUsers(newState);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
            ...userMetadata,
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [channelName, userId, userMetadata, supabase]);

  return { onlineUsers };
}
