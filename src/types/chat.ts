// Vendor Chat System Types
// WS-078: Real-time Wedding Communication Hub

export interface ChatRoom {
  id: string;
  organization_id: string;
  room_name: string;
  room_type: 'vendor_coordination' | 'private' | 'group' | 'announcement';
  description?: string;
  room_avatar_url?: string;
  wedding_id?: string;
  client_id?: string;
  is_active: boolean;
  is_archived: boolean;
  allow_attachments: boolean;
  allow_voice_notes: boolean;
  max_file_size_mb: number;
  is_encrypted: boolean;
  requires_approval: boolean;
  visibility: 'participants' | 'organization' | 'public';
  created_by: string;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
  tags?: string[];
  category?: string;

  // Joined data
  participants?: ChatParticipant[];
  last_message?: ChatMessage;
  unread_count?: number;
}

export interface ChatParticipant {
  id: string;
  room_id: string;
  user_id: string;
  participant_type: 'planner' | 'vendor' | 'client' | 'assistant' | 'guest';
  display_name?: string;
  avatar_url?: string;
  supplier_id?: string;
  vendor_role?: string;
  can_send_messages: boolean;
  can_share_files: boolean;
  can_add_participants: boolean;
  is_admin: boolean;
  is_moderator: boolean;
  status: 'active' | 'inactive' | 'blocked' | 'left';
  joined_at: string;
  left_at?: string;
  last_seen_at?: string;
  last_read_message_id?: string;
  notification_preference: 'all' | 'mentions' | 'important' | 'none';
  push_enabled: boolean;
  email_enabled: boolean;
  unread_count: number;
  mention_count: number;

  // Joined data
  user?: User;
  supplier?: Supplier;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  message_type: 'text' | 'file' | 'image' | 'voice' | 'system' | 'announcement';
  content?: string;
  formatted_content?: FormattedContent;
  parent_message_id?: string;
  thread_count?: number;
  attachments?: ChatAttachment[];
  mentions?: string[];
  referenced_vendors?: string[];
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  delivered_to?: string[];
  read_by?: string[];
  is_edited: boolean;
  edited_at?: string;
  edit_history?: EditHistory[];
  is_deleted: boolean;
  deleted_at?: string;
  deleted_by?: string;
  created_at: string;
  metadata?: Record<string, any>;

  // Joined data
  sender?: User;
  parent_message?: ChatMessage;
  thread_messages?: ChatMessage[];
}

export interface FormattedContent {
  blocks?: ContentBlock[];
  entityMap?: Record<string, Entity>;
}

export interface ContentBlock {
  key: string;
  text: string;
  type:
    | 'unstyled'
    | 'header-one'
    | 'header-two'
    | 'blockquote'
    | 'code-block'
    | 'unordered-list-item'
    | 'ordered-list-item';
  depth?: number;
  inlineStyleRanges?: InlineStyleRange[];
  entityRanges?: EntityRange[];
}

export interface InlineStyleRange {
  offset: number;
  length: number;
  style: 'BOLD' | 'ITALIC' | 'UNDERLINE' | 'CODE' | 'STRIKETHROUGH';
}

export interface EntityRange {
  offset: number;
  length: number;
  key: string;
}

export interface Entity {
  type: 'LINK' | 'MENTION' | 'EMOJI';
  mutability: 'MUTABLE' | 'IMMUTABLE' | 'SEGMENTED';
  data: {
    url?: string;
    userId?: string;
    emoji?: string;
  };
}

export interface EditHistory {
  content: string;
  edited_at: string;
  edited_by: string;
}

export interface ChatAttachment {
  id: string;
  message_id: string;
  room_id: string;
  uploader_id: string;
  file_name: string;
  file_type: string;
  mime_type?: string;
  file_size_bytes: number;
  storage_path: string;
  storage_bucket: string;
  public_url?: string;
  thumbnail_url?: string;
  category?:
    | 'document'
    | 'image'
    | 'video'
    | 'audio'
    | 'contract'
    | 'invoice'
    | 'other';
  is_encrypted: boolean;
  scan_status: 'pending' | 'clean' | 'infected' | 'error';
  scan_results?: Record<string, any>;
  uploaded_at: string;
  metadata?: Record<string, any>;
  expires_at?: string;
  download_count: number;
  last_accessed_at?: string;
}

export interface ChatPresence {
  id: string;
  user_id: string;
  room_id: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  custom_status?: string;
  is_typing: boolean;
  typing_in_thread?: string;
  last_activity_at: string;
  device_type?: string;
  app_version?: string;
  latitude?: number;
  longitude?: number;
}

export interface ChatNotification {
  id: string;
  user_id: string;
  room_id: string;
  message_id: string;
  notification_type: 'message' | 'mention' | 'file' | 'announcement' | 'urgent';
  title?: string;
  body?: string;
  action_url?: string;
  push_sent: boolean;
  push_sent_at?: string;
  email_sent: boolean;
  email_sent_at?: string;
  is_read: boolean;
  read_at?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  expires_at?: string;
}

export interface VendorCommunicationPreference {
  id: string;
  supplier_id: string;
  user_id: string;
  chat_enabled: boolean;
  preferred_chat_hours?: PreferredHours;
  auto_response_enabled: boolean;
  auto_response_message?: string;
  urgent_notifications_only: boolean;
  weekend_notifications: boolean;
  notification_sound?: string;
  sync_with_calendar: boolean;
  sync_with_email: boolean;
  forward_to_email?: string;
  created_at: string;
  updated_at: string;
}

export interface PreferredHours {
  [day: string]: {
    start: string;
    end: string;
  };
}

// Realtime Event Types
export interface ChatRealtimeEvent {
  type: 'message' | 'presence' | 'typing' | 'read' | 'notification';
  room_id: string;
  payload: any;
  timestamp: string;
}

export interface MessageEvent {
  type: 'new_message' | 'message_edited' | 'message_deleted';
  message: ChatMessage;
  room_id: string;
}

export interface PresenceEvent {
  type: 'user_joined' | 'user_left' | 'status_changed';
  user_id: string;
  room_id: string;
  presence: ChatPresence;
}

export interface TypingEvent {
  type: 'typing_start' | 'typing_stop';
  user_id: string;
  room_id: string;
  thread_id?: string;
}

export interface ReadEvent {
  type: 'message_read' | 'all_read';
  user_id: string;
  room_id: string;
  message_ids: string[];
}

// API Request/Response Types
export interface SendMessageRequest {
  room_id: string;
  content: string;
  message_type?: 'text' | 'file' | 'image' | 'voice' | 'announcement';
  parent_message_id?: string;
  attachments?: string[];
  mentions?: string[];
  metadata?: Record<string, any>;
}

export interface CreateRoomRequest {
  room_name: string;
  room_type: 'vendor_coordination' | 'private' | 'group' | 'announcement';
  description?: string;
  wedding_id?: string;
  client_id?: string;
  vendor_ids?: string[];
  tags?: string[];
  category?: string;
}

export interface AddParticipantRequest {
  room_id: string;
  user_id: string;
  participant_type: 'planner' | 'vendor' | 'client' | 'assistant' | 'guest';
  supplier_id?: string;
  vendor_role?: string;
  permissions?: {
    can_send_messages?: boolean;
    can_share_files?: boolean;
    can_add_participants?: boolean;
    is_moderator?: boolean;
  };
}

export interface UploadAttachmentRequest {
  room_id: string;
  message_id?: string;
  file: File;
  category?:
    | 'document'
    | 'image'
    | 'video'
    | 'audio'
    | 'contract'
    | 'invoice'
    | 'other';
  metadata?: Record<string, any>;
}

// Helper Types
export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  role?: string;
}

export interface Supplier {
  id: string;
  business_name: string;
  business_type?: string;
  primary_category: string;
  email: string;
  phone?: string;
  avatar_url?: string;
}

// Chat UI State Types
export interface ChatUIState {
  activeRoom?: string;
  rooms: ChatRoom[];
  messages: Record<string, ChatMessage[]>;
  participants: Record<string, ChatParticipant[]>;
  presence: Record<string, ChatPresence[]>;
  typingUsers: Record<string, string[]>;
  unreadCounts: Record<string, number>;
  isLoading: boolean;
  error?: string;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}

// Search & Filter Types
export interface ChatSearchParams {
  query?: string;
  room_ids?: string[];
  sender_ids?: string[];
  message_types?: string[];
  has_attachments?: boolean;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface ChatFilter {
  room_types?: ('vendor_coordination' | 'private' | 'group' | 'announcement')[];
  is_archived?: boolean;
  has_unread?: boolean;
  vendor_categories?: string[];
  tags?: string[];
}
