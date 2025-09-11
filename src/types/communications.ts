import { Database } from './database';

// Base types from database
export type Message = Database['public']['Tables']['messages']['Row'];
export type MessageInsert = Database['public']['Tables']['messages']['Insert'];
export type MessageUpdate = Database['public']['Tables']['messages']['Update'];

export type Conversation = Database['public']['Tables']['conversations']['Row'];
export type ConversationInsert =
  Database['public']['Tables']['conversations']['Insert'];
export type ConversationUpdate =
  Database['public']['Tables']['conversations']['Update'];

export type EmailNotification =
  Database['public']['Tables']['email_notifications']['Row'];
export type EmailNotificationInsert =
  Database['public']['Tables']['email_notifications']['Insert'];
export type EmailNotificationUpdate =
  Database['public']['Tables']['email_notifications']['Update'];

export type ActivityFeed =
  Database['public']['Tables']['activity_feeds']['Row'];
export type ActivityFeedInsert =
  Database['public']['Tables']['activity_feeds']['Insert'];
export type ActivityFeedUpdate =
  Database['public']['Tables']['activity_feeds']['Update'];

export type NotificationPreferences =
  Database['public']['Tables']['notification_preferences']['Row'];
export type NotificationPreferencesInsert =
  Database['public']['Tables']['notification_preferences']['Insert'];
export type NotificationPreferencesUpdate =
  Database['public']['Tables']['notification_preferences']['Update'];

// Enhanced types with relations
export interface MessageWithSender extends Message {
  sender?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export interface ConversationWithParticipants extends Conversation {
  client?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    wedding_date: string | null;
  };
  vendor?: {
    id: string;
    business_name: string;
    email: string;
    primary_category: string;
  };
  last_message?: MessageWithSender;
  unread_messages?: MessageWithSender[];
}

export interface ActivityFeedWithActor extends ActivityFeed {
  actor?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
}

// Event data types
export interface MessageEventData {
  messageId?: string;
  messageContent?: string;
  timestamp?: string;
  readAt?: string;
}

export interface ConversationEventData {
  conversationId?: string;
  participantIds?: string[];
  lastMessage?: string;
  updatedFields?: string[];
}

export interface ActivityEventData {
  activityId?: string;
  activityType?: string;
  entityId?: string;
  entityType?: string;
  metadata?: Record<string, string | number | boolean>;
}

// Real-time event types
export interface MessageEvent {
  type: 'message_sent' | 'message_read' | 'typing_start' | 'typing_stop';
  conversationId: string;
  userId: string;
  userType: 'client' | 'vendor';
  data?: MessageEventData;
}

export interface ConversationEvent {
  type:
    | 'conversation_created'
    | 'conversation_updated'
    | 'conversation_archived';
  conversationId: string;
  organizationId: string;
  data?: ConversationEventData;
}

export interface ActivityEvent {
  type: 'activity_created' | 'activity_read';
  activityId: string;
  organizationId: string;
  data?: ActivityEventData;
}

// API response types
export interface MessagesResponse {
  messages: MessageWithSender[];
  page: number;
  limit: number;
  has_more: boolean;
  next_cursor?: string;
}

export interface ConversationsResponse {
  conversations: ConversationWithParticipants[];
  page: number;
  limit: number;
  total: number;
}

export interface ActivityFeedResponse {
  activities: ActivityFeedWithActor[];
  page: number;
  limit: number;
  has_more: boolean;
  next_cursor?: string;
}

export interface EmailNotificationsResponse {
  notifications: EmailNotification[];
  page: number;
  limit: number;
  total: number;
}

// Hook return types
export interface UseRealtimeMessagesReturn {
  messages: MessageWithSender[];
  sendMessage: (
    content: string,
    messageType?: Message['message_type'],
    metadata?: Record<string, string | number | boolean>,
  ) => Promise<MessageWithSender | null>;
  markAsRead: (messageId: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export interface UseRealtimeConversationsReturn {
  conversations: ConversationWithParticipants[];
  createConversation: (
    clientId: string,
    vendorId: string,
    subject?: string,
  ) => Promise<Conversation | null>;
  updateTypingStatus: (
    conversationId: string,
    isTyping: boolean,
  ) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export interface UseRealtimeActivityFeedReturn {
  activities: ActivityFeedWithActor[];
  createActivity: (
    activity: Omit<ActivityFeed, 'id' | 'created_at'>,
  ) => Promise<ActivityFeed | null>;
  markAsRead: (activityId: string) => Promise<void>;
  getUnreadCount: () => number;
  loading: boolean;
  error: string | null;
}

export interface PresenceMetadata {
  status?: 'online' | 'away' | 'busy' | 'offline';
  lastSeen?: string;
  activity?: string;
  userAgent?: string;
}

export interface UseRealtimePresenceReturn {
  onlineUsers: Record<string, PresenceMetadata>;
  updatePresence: (metadata: PresenceMetadata) => Promise<void>;
  isOnline: (userId: string) => boolean;
}

// Email template data types
export interface MessageNotificationData {
  recipientEmail: string;
  recipientName: string;
  recipientId: string;
  recipientType: 'client' | 'vendor';
  senderName: string;
  messageContent: string;
  conversationId: string;
  organizationId: string;
  organizationName?: string;
}

export interface FormSubmissionNotificationData {
  recipientEmail: string;
  recipientName: string;
  formName: string;
  submissionId: string;
  clientName: string;
  clientId: string;
  weddingDate?: string;
  organizationId: string;
  organizationName?: string;
}

export interface BookingUpdateNotificationData {
  recipientEmail: string;
  recipientName: string;
  updateType: 'created' | 'updated' | 'cancelled';
  bookingDetails: string;
  bookingId: string;
  clientName: string;
  clientId: string;
  organizationId: string;
  organizationName?: string;
}

export interface PaymentNotificationData {
  recipientEmail: string;
  recipientName: string;
  paymentType: 'received' | 'failed' | 'reminder';
  amount: string;
  currency: string;
  clientName: string;
  clientId: string;
  invoiceId?: string;
  dueDate?: string;
  organizationId: string;
  organizationName?: string;
}

// Activity types
export type ActivityType =
  | 'message_sent'
  | 'message_read'
  | 'email_sent'
  | 'form_submitted'
  | 'form_updated'
  | 'booking_created'
  | 'booking_updated'
  | 'booking_cancelled'
  | 'payment_received'
  | 'payment_failed'
  | 'payment_reminder'
  | 'client_created'
  | 'client_updated'
  | 'vendor_created'
  | 'vendor_updated'
  | 'system_notification';

export type EntityType =
  | 'client'
  | 'vendor'
  | 'form'
  | 'message'
  | 'booking'
  | 'payment';

export type ActorType = 'client' | 'vendor' | 'system';

export type MessageType =
  | 'text'
  | 'file'
  | 'system_notification'
  | 'form_update'
  | 'booking_update';

export type SenderType = 'client' | 'vendor' | 'system';

export type ConversationStatus = 'active' | 'archived' | 'closed';

export type EmailStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'bounced'
  | 'spam';

export type EmailProvider = 'sendgrid' | 'resend';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

// Utility types
export interface CreateMessageRequest {
  conversation_id: string;
  content: string;
  message_type?: MessageType;
  attachments?: Array<{
    id: string;
    filename: string;
    fileType: string;
    fileSize: number;
    url: string;
  }>;
  metadata?: Record<string, any>;
  reply_to_message_id?: string;
}

export interface CreateConversationRequest {
  client_id: string;
  vendor_id: string;
  organization_id: string;
  subject?: string;
  initial_message?: string;
}

export interface CreateActivityRequest {
  organization_id: string;
  entity_type: EntityType;
  entity_id: string;
  activity_type: ActivityType;
  title: string;
  description?: string;
  target_user_ids?: string[];
  is_public?: boolean;
  icon?: string;
  color?: string;
  data?: Record<string, any>;
}

export interface SendEmailRequest {
  recipient_email: string;
  recipient_name?: string;
  recipient_id?: string;
  recipient_type?: 'client' | 'vendor' | 'admin';
  template_type: string;
  subject: string;
  html_content: string;
  text_content?: string;
  variables?: Record<string, any>;
  priority?: NotificationPriority;
  scheduled_for?: string;
  organization_id: string;
}

// Filter and search types
export interface ConversationFilters {
  status?: ConversationStatus;
  search?: string;
  user_type?: 'client' | 'vendor';
  date_from?: string;
  date_to?: string;
}

export interface MessageFilters {
  message_type?: MessageType;
  is_read?: boolean;
  date_from?: string;
  date_to?: string;
}

export interface ActivityFilters {
  activity_type?: ActivityType;
  entity_type?: EntityType;
  is_public?: boolean;
  unread_only?: boolean;
  date_from?: string;
  date_to?: string;
}

export interface EmailNotificationFilters {
  status?: EmailStatus;
  template_type?: string;
  recipient_type?: 'client' | 'vendor' | 'admin';
  priority?: NotificationPriority;
  date_from?: string;
  date_to?: string;
}

// Pagination types
export interface PaginationOptions {
  page?: number;
  limit?: number;
  cursor?: string;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total?: number;
    has_more?: boolean;
    next_cursor?: string;
  };
}

// Error types
export interface CommunicationError {
  code: string;
  message: string;
  details?: Record<string, string | number | boolean>;
}

// Settings types
export interface MessagingSettings {
  auto_read_receipts: boolean;
  typing_indicators: boolean;
  message_preview_length: number;
  attachment_max_size: number;
  allowed_file_types: string[];
}

export interface NotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  in_app_notifications: boolean;
  marketing_emails: boolean;
  notification_types: Record<string, boolean>;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  timezone: string;
}

// Webhook types
export interface ResendWebhookEvent {
  type: 'email.sent' | 'email.delivered' | 'email.bounced' | 'email.complained';
  data: {
    email_id: string;
    to: string;
    subject: string;
    created_at: string;
    [key: string]: string | number | boolean | null;
  };
}

export interface WebhookPayload {
  event: ResendWebhookEvent;
  signature: string;
  timestamp: number;
}

// Component prop types
export interface MessagingLayoutProps {
  organizationId: string;
  currentUserId: string;
  currentUserType: 'client' | 'vendor';
  showActivityFeed?: boolean;
  className?: string;
}

export interface ConversationListProps {
  organizationId: string;
  userId: string;
  userType: 'client' | 'vendor';
  selectedConversationId?: string;
  onConversationSelect: (conversation: ConversationWithParticipants) => void;
  onNewConversation: () => void;
  filters?: ConversationFilters;
  className?: string;
}

export interface MessageThreadProps {
  conversation: ConversationWithParticipants;
  currentUserId: string;
  currentUserType: 'client' | 'vendor';
  className?: string;
}

export interface ActivityFeedProps {
  organizationId: string;
  userId?: string;
  entityType?: EntityType;
  entityId?: string;
  className?: string;
  maxItems?: number;
  showFilters?: boolean;
  filters?: ActivityFilters;
}

// Bulk Messaging Types - WS-155
export interface BulkMessageData {
  id?: string;
  couple_id: string;
  recipient_ids: string[];
  segmentation_criteria: GuestSegmentationCriteria;
  message_content: MessageContent;
  delivery_options: DeliveryOptions;
  personalization_tokens: PersonalizationToken[];
  template_id?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  scheduled_for?: string;
  created_at?: string;
  sent_at?: string;
  delivery_stats: BulkDeliveryStats;
}

export interface GuestSegmentationCriteria {
  rsvp_status?: ('pending' | 'attending' | 'declined' | 'maybe')[];
  dietary_restrictions?: string[];
  age_groups?: ('adult' | 'child' | 'infant')[];
  categories?: ('family' | 'friends' | 'work' | 'other')[];
  sides?: ('partner1' | 'partner2' | 'mutual')[];
  has_plus_one?: boolean;
  has_dietary_restrictions?: boolean;
  has_special_needs?: boolean;
  table_numbers?: number[];
  tags?: string[];
  custom_filters?: Record<string, any>;
}

export interface MessageContent {
  subject?: string;
  html_content: string;
  text_content: string;
  personalized_content?: Record<string, PersonalizedMessage>;
}

export interface PersonalizedMessage {
  guest_id: string;
  subject?: string;
  html_content: string;
  text_content: string;
  tokens_used: Record<string, string>;
}

export interface DeliveryOptions {
  channels: ('email' | 'sms' | 'whatsapp')[];
  send_immediately: boolean;
  scheduled_for?: string;
  test_mode: boolean;
  batch_size?: number;
  delay_between_batches?: number;
}

export interface PersonalizationToken {
  token: string;
  display_name: string;
  description: string;
  example_value: string;
  required: boolean;
  type: 'text' | 'date' | 'number' | 'boolean';
}

export interface BulkDeliveryStats {
  total_recipients: number;
  email: {
    sent: number;
    delivered: number;
    failed: number;
    opened: number;
    clicked: number;
    bounced: number;
    spam: number;
  };
  sms: {
    sent: number;
    delivered: number;
    failed: number;
    clicked: number;
  };
  whatsapp: {
    sent: number;
    delivered: number;
    failed: number;
    read: number;
  };
}

export interface MessageTemplate {
  id: string;
  couple_id: string;
  name: string;
  description?: string;
  category:
    | 'rsvp'
    | 'dietary'
    | 'logistics'
    | 'thank_you'
    | 'reminder'
    | 'custom';
  subject?: string;
  html_content: string;
  text_content: string;
  personalization_tokens: string[];
  is_system: boolean;
  usage_count: number;
  last_used?: string;
  created_at: string;
  updated_at: string;
}

export interface GuestSegment {
  id: string;
  name: string;
  description?: string;
  criteria: GuestSegmentationCriteria;
  guest_count: number;
  guests?: GuestWithSegmentInfo[];
  last_updated: string;
}

export interface GuestWithSegmentInfo {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  rsvp_status: 'pending' | 'attending' | 'declined' | 'maybe';
  dietary_restrictions?: string;
  plus_one: boolean;
  plus_one_name?: string;
  category: 'family' | 'friends' | 'work' | 'other';
  side: 'partner1' | 'partner2' | 'mutual';
  tags: string[];
  household_name?: string;
  table_number?: number;
}

// Component Props Types for Bulk Messaging
export interface GuestCommunicationsProps {
  couple_id: string;
  organization_id: string;
  className?: string;
}

export interface GuestSegmentationProps {
  criteria: GuestSegmentationCriteria;
  onCriteriaChange: (criteria: GuestSegmentationCriteria) => void;
  selectedGuestCount: number;
  totalGuestCount: number;
  onPreviewGuests: () => void;
  className?: string;
}

export interface MessageCompositionProps {
  content: MessageContent;
  onContentChange: (content: MessageContent) => void;
  availableTokens: PersonalizationToken[];
  selectedTemplate?: MessageTemplate;
  onTemplateChange: (template: MessageTemplate | undefined) => void;
  className?: string;
}

export interface BulkSendConfigProps {
  options: DeliveryOptions;
  onOptionsChange: (options: DeliveryOptions) => void;
  recipientCount: number;
  estimatedCost: number;
  className?: string;
}

export interface DeliveryStatusProps {
  bulkMessage: BulkMessageData;
  onRefresh: () => void;
  onViewDetails: (messageId: string) => void;
  className?: string;
}

export interface MessageHistoryProps {
  couple_id: string;
  messages: BulkMessageData[];
  onMessageSelect: (message: BulkMessageData) => void;
  onDeleteMessage: (messageId: string) => void;
  onDuplicateMessage: (message: BulkMessageData) => void;
  className?: string;
}

export interface PersonalizationTokensProps {
  availableTokens: PersonalizationToken[];
  onTokenSelect: (token: PersonalizationToken) => void;
  className?: string;
}

export interface MessagePreviewProps {
  messageData: BulkMessageData;
  selectedGuestIds: string[];
  previewGuest?: GuestWithSegmentInfo;
  onGuestChange: (guestId: string) => void;
  className?: string;
}

// API Request/Response Types
export interface CreateBulkMessageRequest {
  couple_id: string;
  recipient_ids: string[];
  segmentation_criteria: GuestSegmentationCriteria;
  message_content: MessageContent;
  delivery_options: DeliveryOptions;
  personalization_tokens: PersonalizationToken[];
  template_id?: string;
}

export interface BulkMessageResponse {
  success: boolean;
  message_id: string;
  recipient_count: number;
  estimated_delivery_time: number;
  cost_estimate: number;
  errors?: string[];
}

export interface MessageDeliveryStatusResponse {
  message_id: string;
  status: 'sending' | 'sent' | 'failed';
  delivery_stats: BulkDeliveryStats;
  individual_statuses: Array<{
    guest_id: string;
    guest_name: string;
    email_status?: 'sent' | 'delivered' | 'failed' | 'opened' | 'clicked';
    sms_status?: 'sent' | 'delivered' | 'failed' | 'clicked';
    whatsapp_status?: 'sent' | 'delivered' | 'failed' | 'read';
    error_message?: string;
  }>;
}

export interface TemplateListResponse {
  templates: MessageTemplate[];
  total: number;
  page: number;
  limit: number;
}

export interface GuestSegmentResponse {
  segment: GuestSegment;
  guests: GuestWithSegmentInfo[];
  total_guests: number;
}

// Validation Types
export interface BulkMessageValidation {
  is_valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  warnings: string[];
  estimated_cost: number;
  rate_limit_status: {
    remaining_sends: number;
    reset_time: string;
    daily_limit: number;
  };
}

// Default Personalization Tokens
export const DEFAULT_PERSONALIZATION_TOKENS: PersonalizationToken[] = [
  {
    token: '{guest_name}',
    display_name: 'Guest Name',
    description: 'Full name of the guest',
    example_value: 'Sarah Johnson',
    required: false,
    type: 'text',
  },
  {
    token: '{first_name}',
    display_name: 'First Name',
    description: 'First name of the guest',
    example_value: 'Sarah',
    required: false,
    type: 'text',
  },
  {
    token: '{plus_one_name}',
    display_name: 'Plus One Name',
    description: "Name of the guest's plus one",
    example_value: 'Michael Johnson',
    required: false,
    type: 'text',
  },
  {
    token: '{dietary_info}',
    display_name: 'Dietary Requirements',
    description: "Guest's dietary restrictions",
    example_value: 'Vegetarian',
    required: false,
    type: 'text',
  },
  {
    token: '{table_number}',
    display_name: 'Table Number',
    description: 'Assigned table number',
    example_value: '5',
    required: false,
    type: 'number',
  },
  {
    token: '{wedding_date}',
    display_name: 'Wedding Date',
    description: 'Wedding date formatted for display',
    example_value: 'June 15, 2024',
    required: false,
    type: 'date',
  },
];
