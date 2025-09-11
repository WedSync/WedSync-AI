'use client';

import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel, RealtimePresenceState } from '@supabase/supabase-js';
import {
  ChatRoom,
  ChatMessage,
  ChatParticipant,
  ChatPresence,
  ChatAttachment,
  SendMessageRequest,
  CreateRoomRequest,
  MessageEvent,
  PresenceEvent,
  TypingEvent,
  ReadEvent,
  ChatNotification,
  UploadAttachmentRequest,
} from '@/types/chat';

export interface ChatServiceCallbacks {
  onMessage?: (event: MessageEvent) => void;
  onPresence?: (event: PresenceEvent) => void;
  onTyping?: (event: TypingEvent) => void;
  onRead?: (event: ReadEvent) => void;
  onNotification?: (notification: ChatNotification) => void;
  onConnectionChange?: (
    status: 'connecting' | 'connected' | 'disconnected' | 'error',
  ) => void;
}

class VendorChatService {
  private supabase = createClient();
  private channels: Map<string, RealtimeChannel> = new Map();
  private presenceStates: Map<string, RealtimePresenceState<ChatPresence>> =
    new Map();
  private callbacks: ChatServiceCallbacks = {};
  private userId?: string;
  private connectionStatus:
    | 'connecting'
    | 'connected'
    | 'disconnected'
    | 'error' = 'disconnected';

  constructor() {
    this.initializeUser();
  }

  private async initializeUser() {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    this.userId = user?.id;
  }

  // =====================================================
  // ROOM MANAGEMENT
  // =====================================================

  async createRoom(request: CreateRoomRequest): Promise<ChatRoom | null> {
    try {
      // Use the database function to create vendor coordination room
      if (request.room_type === 'vendor_coordination' && request.vendor_ids) {
        // GUARDIAN FIX: Validate critical wedding coordination parameters
        if (
          !request.wedding_id ||
          !request.vendor_ids ||
          request.vendor_ids.length === 0
        ) {
          throw new Error(
            'CRITICAL: Missing wedding ID or vendor IDs for coordination room',
          );
        }

        try {
          const { data, error } = await this.supabase.rpc(
            'create_vendor_coordination_room',
            {
              p_organization_id: await this.getOrganizationId(),
              p_wedding_id: request.wedding_id,
              p_client_id: request.client_id,
              p_room_name: request.room_name,
              p_vendor_ids: request.vendor_ids,
            },
          );

          if (error) {
            // GUARDIAN FIX: Log critical vendor coordination failure
            console.error(
              'CRITICAL: Vendor coordination room creation failed',
              {
                weddingId: request.wedding_id,
                vendorIds: request.vendor_ids,
                error: error.message,
                weddingDayRisk: 'critical',
                context: 'vendor_coordination_failure',
              },
            );

            // GUARDIAN FIX: Attempt fallback room creation to prevent total failure
            return await this.createFallbackCoordinationRoom(request);
          }

          return await this.getRoom(data);
        } catch (dbError) {
          // GUARDIAN FIX: Database function failure - create emergency fallback
          console.error(
            'CRITICAL: Database function failed, creating emergency coordination room',
            {
              weddingId: request.wedding_id,
              vendorIds: request.vendor_ids,
              error:
                dbError instanceof Error ? dbError.message : 'Unknown error',
              weddingDayRisk: 'critical',
            },
          );

          return await this.createFallbackCoordinationRoom(request);
        }
      }

      // Create standard room
      const { data, error } = await this.supabase
        .from('chat_rooms')
        .insert({
          room_name: request.room_name,
          room_type: request.room_type,
          description: request.description,
          wedding_id: request.wedding_id,
          client_id: request.client_id,
          tags: request.tags,
          category: request.category,
          created_by: this.userId,
          organization_id: await this.getOrganizationId(),
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as admin participant
      await this.addParticipant({
        room_id: data.id,
        user_id: this.userId!,
        participant_type: 'planner',
        permissions: {
          is_moderator: true,
          can_add_participants: true,
        },
      });

      return data;
    } catch (error) {
      console.error('Error creating room:', error);
      return null;
    }
  }

  async getRoom(roomId: string): Promise<ChatRoom | null> {
    try {
      const { data, error } = await this.supabase
        .from('chat_rooms')
        .select(
          `
          *,
          participants:chat_room_participants(
            *,
            user:user_id(*),
            supplier:supplier_id(*)
          ),
          last_message:chat_messages(*)
        `,
        )
        .eq('id', roomId)
        .order('created_at', {
          foreignTable: 'chat_messages',
          ascending: false,
        })
        .limit(1, { foreignTable: 'chat_messages' })
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching room:', error);
      return null;
    }
  }

  async getRooms(filters?: {
    room_type?: string;
    is_archived?: boolean;
    wedding_id?: string;
  }): Promise<ChatRoom[]> {
    try {
      let query = this.supabase
        .from('chat_rooms')
        .select(
          `
          *,
          participants:chat_room_participants!inner(
            *,
            user:user_id(*),
            supplier:supplier_id(*)
          ),
          last_message:chat_messages(*)
        `,
        )
        .eq('participants.user_id', this.userId!)
        .eq('participants.status', 'active')
        .order('last_message_at', { ascending: false });

      if (filters?.room_type) {
        query = query.eq('room_type', filters.room_type);
      }
      if (filters?.is_archived !== undefined) {
        query = query.eq('is_archived', filters.is_archived);
      }
      if (filters?.wedding_id) {
        query = query.eq('wedding_id', filters.wedding_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching rooms:', error);
      return [];
    }
  }

  // =====================================================
  // MESSAGE MANAGEMENT
  // =====================================================

  async sendMessage(request: SendMessageRequest): Promise<ChatMessage | null> {
    try {
      const { data, error } = await this.supabase
        .from('chat_messages')
        .insert({
          room_id: request.room_id,
          sender_id: this.userId,
          message_type: request.message_type || 'text',
          content: request.content,
          parent_message_id: request.parent_message_id,
          mentions: request.mentions,
          metadata: request.metadata,
        })
        .select(
          `
          *,
          sender:sender_id(*),
          attachments:chat_attachments(*)
        `,
        )
        .single();

      if (error) throw error;

      // Handle attachments if provided
      if (request.attachments && request.attachments.length > 0) {
        await this.attachMessageFiles(
          data.id,
          request.room_id,
          request.attachments,
        );
      }

      // Broadcast to channel
      const channel = this.channels.get(request.room_id);
      if (channel) {
        await channel.send({
          type: 'broadcast',
          event: 'new_message',
          payload: { message: data },
        });
      }

      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  }

  async getMessages(
    roomId: string,
    options?: {
      limit?: number;
      before?: string;
      after?: string;
    },
  ): Promise<ChatMessage[]> {
    try {
      let query = this.supabase
        .from('chat_messages')
        .select(
          `
          *,
          sender:sender_id(*),
          attachments:chat_attachments(*),
          parent_message:parent_message_id(
            *,
            sender:sender_id(*)
          )
        `,
        )
        .eq('room_id', roomId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(options?.limit || 50);

      if (options?.before) {
        query = query.lt('created_at', options.before);
      }
      if (options?.after) {
        query = query.gt('created_at', options.after);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data?.reverse() || [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  async editMessage(messageId: string, content: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('chat_messages')
        .update({
          content,
          is_edited: true,
          edited_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .eq('sender_id', this.userId!);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error editing message:', error);
      return false;
    }
  }

  async deleteMessage(messageId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('chat_messages')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: this.userId,
        })
        .eq('id', messageId)
        .eq('sender_id', this.userId!);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      return false;
    }
  }

  // =====================================================
  // FILE SHARING
  // =====================================================

  async uploadAttachment(
    request: UploadAttachmentRequest,
  ): Promise<ChatAttachment | null> {
    try {
      const fileExt = request.file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `chat-attachments/${request.room_id}/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } =
        await this.supabase.storage
          .from('chat-attachments')
          .upload(filePath, request.file, {
            cacheControl: '3600',
            upsert: false,
          });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = this.supabase.storage.from('chat-attachments').getPublicUrl(filePath);

      // Save attachment record
      const { data, error } = await this.supabase
        .from('chat_attachments')
        .insert({
          message_id: request.message_id,
          room_id: request.room_id,
          uploader_id: this.userId,
          file_name: request.file.name,
          file_type: fileExt || 'unknown',
          mime_type: request.file.type,
          file_size_bytes: request.file.size,
          storage_path: filePath,
          public_url: publicUrl,
          category: request.category,
          metadata: request.metadata,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error uploading attachment:', error);
      return null;
    }
  }

  private async attachMessageFiles(
    messageId: string,
    roomId: string,
    attachmentIds: string[],
  ): Promise<void> {
    try {
      await this.supabase
        .from('chat_attachments')
        .update({ message_id: messageId })
        .in('id', attachmentIds)
        .eq('room_id', roomId);
    } catch (error) {
      console.error('Error attaching files to message:', error);
    }
  }

  // =====================================================
  // REALTIME SUBSCRIPTIONS
  // =====================================================

  subscribeToRoom(roomId: string, callbacks?: ChatServiceCallbacks): void {
    if (this.channels.has(roomId)) {
      console.log('Already subscribed to room:', roomId);
      return;
    }

    if (callbacks) {
      this.callbacks = { ...this.callbacks, ...callbacks };
    }

    const channel = this.supabase.channel(`chat:${roomId}`, {
      config: {
        presence: {
          key: this.userId!,
        },
      },
    });

    // Subscribe to new messages
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`,
      },
      async (payload) => {
        const message = await this.enrichMessage(payload.new as ChatMessage);
        this.callbacks.onMessage?.({
          type: 'new_message',
          message,
          room_id: roomId,
        });
      },
    );

    // Subscribe to message updates
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`,
      },
      async (payload) => {
        const message = await this.enrichMessage(payload.new as ChatMessage);
        if (payload.new.is_deleted) {
          this.callbacks.onMessage?.({
            type: 'message_deleted',
            message,
            room_id: roomId,
          });
        } else {
          this.callbacks.onMessage?.({
            type: 'message_edited',
            message,
            room_id: roomId,
          });
        }
      },
    );

    // Subscribe to broadcast events
    channel.on('broadcast', { event: 'typing' }, (payload) => {
      this.callbacks.onTyping?.(payload.payload as TypingEvent);
    });

    channel.on('broadcast', { event: 'read' }, (payload) => {
      this.callbacks.onRead?.(payload.payload as ReadEvent);
    });

    // Subscribe to presence
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<ChatPresence>();
      this.presenceStates.set(roomId, state);
      this.handlePresenceSync(roomId, state);
    });

    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      this.callbacks.onPresence?.({
        type: 'user_joined',
        user_id: key,
        room_id: roomId,
        presence: newPresences[0] as ChatPresence,
      });
    });

    channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      this.callbacks.onPresence?.({
        type: 'user_left',
        user_id: key,
        room_id: roomId,
        presence: leftPresences[0] as ChatPresence,
      });
    });

    // Subscribe to the channel
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        this.connectionStatus = 'connected';
        this.callbacks.onConnectionChange?.('connected');

        // Track presence
        await channel.track({
          user_id: this.userId!,
          room_id: roomId,
          status: 'online',
          last_activity_at: new Date().toISOString(),
        } as ChatPresence);
      } else if (status === 'CHANNEL_ERROR') {
        this.connectionStatus = 'error';
        this.callbacks.onConnectionChange?.('error');
      } else if (status === 'TIMED_OUT') {
        this.connectionStatus = 'disconnected';
        this.callbacks.onConnectionChange?.('disconnected');
      }
    });

    this.channels.set(roomId, channel);
  }

  unsubscribeFromRoom(roomId: string): void {
    const channel = this.channels.get(roomId);
    if (channel) {
      this.supabase.removeChannel(channel);
      this.channels.delete(roomId);
      this.presenceStates.delete(roomId);
    }
  }

  unsubscribeAll(): void {
    this.channels.forEach((channel) => {
      this.supabase.removeChannel(channel);
    });
    this.channels.clear();
    this.presenceStates.clear();
  }

  // =====================================================
  // PRESENCE & TYPING
  // =====================================================

  async updatePresence(
    roomId: string,
    status: ChatPresence['status'],
    customStatus?: string,
  ): Promise<void> {
    const channel = this.channels.get(roomId);
    if (channel) {
      await channel.track({
        user_id: this.userId!,
        room_id: roomId,
        status,
        custom_status: customStatus,
        last_activity_at: new Date().toISOString(),
      } as ChatPresence);
    }
  }

  async startTyping(roomId: string, threadId?: string): Promise<void> {
    const channel = this.channels.get(roomId);
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          type: 'typing_start',
          user_id: this.userId!,
          room_id: roomId,
          thread_id: threadId,
        } as TypingEvent,
      });
    }
  }

  async stopTyping(roomId: string, threadId?: string): Promise<void> {
    const channel = this.channels.get(roomId);
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          type: 'typing_stop',
          user_id: this.userId!,
          room_id: roomId,
          thread_id: threadId,
        } as TypingEvent,
      });
    }
  }

  getPresenceState(
    roomId: string,
  ): RealtimePresenceState<ChatPresence> | undefined {
    return this.presenceStates.get(roomId);
  }

  // =====================================================
  // READ RECEIPTS
  // =====================================================

  async markAsRead(roomId: string, messageIds: string[]): Promise<void> {
    try {
      // Update participant's last read message
      const lastMessageId = messageIds[messageIds.length - 1];
      await this.supabase.rpc('reset_unread_count', {
        p_room_id: roomId,
        p_user_id: this.userId!,
        p_message_id: lastMessageId,
      });

      // Broadcast read event
      const channel = this.channels.get(roomId);
      if (channel) {
        await channel.send({
          type: 'broadcast',
          event: 'read',
          payload: {
            type: 'message_read',
            user_id: this.userId!,
            room_id: roomId,
            message_ids: messageIds,
          } as ReadEvent,
        });
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }

  // =====================================================
  // PARTICIPANT MANAGEMENT
  // =====================================================

  async addParticipant(request: {
    room_id: string;
    user_id: string;
    participant_type: ChatParticipant['participant_type'];
    supplier_id?: string;
    vendor_role?: string;
    permissions?: Partial<
      Pick<
        ChatParticipant,
        | 'can_send_messages'
        | 'can_share_files'
        | 'can_add_participants'
        | 'is_moderator'
      >
    >;
  }): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('chat_room_participants')
        .insert({
          room_id: request.room_id,
          user_id: request.user_id,
          participant_type: request.participant_type,
          supplier_id: request.supplier_id,
          vendor_role: request.vendor_role,
          ...request.permissions,
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error adding participant:', error);
      return false;
    }
  }

  async removeParticipant(roomId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('chat_room_participants')
        .update({
          status: 'left',
          left_at: new Date().toISOString(),
        })
        .eq('room_id', roomId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error removing participant:', error);
      return false;
    }
  }

  async getParticipants(roomId: string): Promise<ChatParticipant[]> {
    try {
      const { data, error } = await this.supabase
        .from('chat_room_participants')
        .select(
          `
          *,
          user:user_id(*),
          supplier:supplier_id(*)
        `,
        )
        .eq('room_id', roomId)
        .eq('status', 'active');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching participants:', error);
      return [];
    }
  }

  // =====================================================
  // SEARCH
  // =====================================================

  async searchMessages(params: {
    query: string;
    room_ids?: string[];
    limit?: number;
  }): Promise<ChatMessage[]> {
    try {
      let query = this.supabase
        .from('chat_messages')
        .select(
          `
          *,
          sender:sender_id(*),
          attachments:chat_attachments(*)
        `,
        )
        .textSearch('search_vector', params.query)
        .eq('is_deleted', false)
        .limit(params.limit || 50);

      if (params.room_ids && params.room_ids.length > 0) {
        query = query.in('room_id', params.room_ids);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching messages:', error);
      return [];
    }
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  private async getOrganizationId(): Promise<string> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    return user?.user_metadata?.organization_id || '';
  }

  private async enrichMessage(message: ChatMessage): Promise<ChatMessage> {
    // Fetch sender info if not included
    if (!message.sender && message.sender_id) {
      const { data: sender } = await this.supabase
        .from('auth.users')
        .select('id, email, raw_user_meta_data')
        .eq('id', message.sender_id)
        .single();

      if (sender) {
        message.sender = {
          id: sender.id,
          email: sender.email,
          first_name: sender.raw_user_meta_data?.first_name,
          last_name: sender.raw_user_meta_data?.last_name,
          avatar_url: sender.raw_user_meta_data?.avatar_url,
        };
      }
    }

    // Fetch attachments if not included
    if (!message.attachments && message.id) {
      const { data: attachments } = await this.supabase
        .from('chat_attachments')
        .select('*')
        .eq('message_id', message.id);

      message.attachments = attachments || [];
    }

    return message;
  }

  private handlePresenceSync(
    roomId: string,
    state: RealtimePresenceState<ChatPresence>,
  ): void {
    Object.entries(state).forEach(([userId, presences]) => {
      if (presences && presences.length > 0) {
        this.callbacks.onPresence?.({
          type: 'status_changed',
          user_id: userId,
          room_id: roomId,
          presence: presences[0] as ChatPresence,
        });
      }
    });
  }

  /**
   * GUARDIAN EMERGENCY PROTOCOL: Create fallback coordination room when database function fails
   * This prevents total vendor coordination failure during wedding operations
   */
  private async createFallbackCoordinationRoom(
    request: CreateRoomRequest,
  ): Promise<ChatRoom | null> {
    try {
      // Create basic room structure as emergency fallback
      const { data: roomData, error: roomError } = await this.supabase
        .from('chat_rooms')
        .insert({
          name:
            request.room_name ||
            `Emergency Coordination - Wedding ${request.wedding_id}`,
          type: 'vendor_coordination',
          wedding_id: request.wedding_id,
          client_id: request.client_id,
          organization_id: await this.getOrganizationId(),
          is_emergency_fallback: true, // Mark as emergency room
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (roomError) {
        console.error(
          'CRITICAL: Emergency fallback room creation also failed',
          {
            weddingId: request.wedding_id,
            error: roomError.message,
            weddingDayRisk: 'critical',
          },
        );
        return null;
      }

      // Add vendor participants manually
      if (request.vendor_ids && request.vendor_ids.length > 0) {
        const participants = request.vendor_ids.map((vendorId) => ({
          room_id: roomData.id,
          user_id: vendorId,
          role: 'vendor',
          joined_at: new Date().toISOString(),
        }));

        await this.supabase.from('chat_participants').insert(participants);
      }

      console.log('SUCCESS: Emergency coordination room created', {
        roomId: roomData.id,
        weddingId: request.wedding_id,
        vendorCount: request.vendor_ids?.length || 0,
      });

      return this.mapChatRoom(roomData);
    } catch (error) {
      console.error('CRITICAL: Complete vendor coordination failure', {
        weddingId: request.wedding_id,
        error: error instanceof Error ? error.message : 'Unknown error',
        weddingDayRisk: 'critical',
      });
      return null;
    }
  }
}

// Singleton instance
const vendorChatService = new VendorChatService();

export default vendorChatService;
