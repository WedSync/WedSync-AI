/**
 * WS-342 Real-Time Wedding Collaboration System - Enhanced TypeScript Interfaces
 * Team A - Frontend/UI Development - Complete Collaboration Types
 *
 * Comprehensive type definitions for real-time wedding collaboration,
 * including timeline management, vendor coordination, and wedding party communication.
 */

import * as Y from 'yjs';

// Re-export core Y.js types for backward compatibility
export interface YjsDocument extends Y.Doc {
  readonly guid: string;
  readonly clientID: number;
  readonly share: Y.Map<any>;
}

export interface YjsProviderOptions {
  authToken: string;
  organizationId: string;
  userId: string;
  retry: {
    maxAttempts: number;
    backoffMs: number;
    maxBackoffMs: number;
  };
  permissions: DocumentPermissions;
  offlineSync: boolean;
}

export interface DocumentPermissions {
  read: boolean;
  write: boolean;
  admin: boolean;
  share: boolean;
  comment: boolean;
}

/**
 * WS-342 Enhanced Collaboration Types for Wedding Context
 */

// Wedding Collaboration Core Types
export interface WeddingCollaboration {
  weddingId: string;
  title: string;
  description?: string;
  weddingDate: Date;
  status: WeddingStatus;
  collaborators: Collaborator[];
  timeline: WeddingTimelineItem[];
  vendors: WeddingVendor[];
  tasks: WeddingTask[];
  chatChannels: ChatChannel[];
  planningBoard: PlanningBoard;
  permissions: WeddingPermissions;
  metadata: WeddingMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export enum WeddingStatus {
  PLANNING = 'planning',
  IN_PROGRESS = 'in_progress',
  DAY_OF = 'day_of',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface WeddingPermissions extends DocumentPermissions {
  manageVendors: boolean;
  manageTimeline: boolean;
  manageBudget: boolean;
  manageGuests: boolean;
  viewPrivateInfo: boolean;
}

export interface WeddingMetadata {
  coupleNames: string[];
  venue?: string;
  totalGuests?: number;
  budget?: number;
  weddingStyle?: string;
  theme?: string;
  tags: string[];
  organizationId: string;
  isPublic: boolean;
}

// Collaborator Types
export interface Collaborator {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  role: CollaboratorRole;
  permissions: WeddingPermissions;
  status: CollaboratorStatus;
  lastSeen: Date;
  presence?: PresenceData;
  contactInfo?: ContactInfo;
  specialties?: string[];
  timeZone?: string;
  joinedAt: Date;
}

export enum CollaboratorRole {
  COUPLE = 'couple',
  PLANNER = 'planner',
  VENDOR = 'vendor',
  FAMILY = 'family',
  WEDDING_PARTY = 'wedding_party',
  GUEST = 'guest',
  ADMIN = 'admin',
}

export enum CollaboratorStatus {
  INVITED = 'invited',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OFFLINE = 'offline',
  BUSY = 'busy',
  AWAY = 'away',
}

export interface PresenceData {
  status: 'online' | 'idle' | 'offline';
  lastActivity: Date;
  currentSection?: CollaborationSection;
  activeItem?: string;
  cursor?: CursorData;
  isTyping?: boolean;
  location?: PresenceLocation;
}

export interface CursorData {
  position: number;
  selection: { start: number; end: number };
  color: string;
  timestamp: Date;
}

export interface PresenceLocation {
  section: CollaborationSection;
  itemId?: string;
  coordinates?: { x: number; y: number };
}

export type CollaborationSection =
  | 'timeline'
  | 'vendors'
  | 'tasks'
  | 'chat'
  | 'board'
  | 'budget'
  | 'guests';

export interface ContactInfo {
  phone?: string;
  address?: string;
  company?: string;
  website?: string;
  socialMedia?: { [platform: string]: string };
}

// Wedding Timeline Collaboration Types
export interface WeddingTimelineItem {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  duration?: number; // minutes
  type: TimelineItemType;
  status: TimelineItemStatus;
  priority: Priority;
  assignedTo: string[]; // Collaborator IDs
  relatedVendors: string[]; // Vendor IDs
  dependencies: string[]; // Other timeline item IDs
  location?: string;
  notes?: string;
  attachments?: Attachment[];
  budget?: number;
  comments: Comment[];
  lastEditedBy?: string;
  lastEditedAt?: Date;
  conflictsWith?: string[]; // Conflicting timeline items
  parentTimeline?: string; // For nested timelines
  order: number;
}

export enum TimelineItemType {
  CEREMONY = 'ceremony',
  RECEPTION = 'reception',
  PHOTO_SESSION = 'photo_session',
  VENDOR_ARRIVAL = 'vendor_arrival',
  VENDOR_SETUP = 'vendor_setup',
  GUEST_ARRIVAL = 'guest_arrival',
  MEAL = 'meal',
  ENTERTAINMENT = 'entertainment',
  SPEECH = 'speech',
  TRADITION = 'tradition',
  TRANSITION = 'transition',
  CLEANUP = 'cleanup',
  OTHER = 'other',
}

export enum TimelineItemStatus {
  DRAFT = 'draft',
  PLANNED = 'planned',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DELAYED = 'delayed',
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface TimelineConflict {
  id: string;
  type: ConflictType;
  itemId: string;
  conflictingItems: string[];
  description: string;
  severity: Priority;
  suggestions: string[];
  detectedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
}

export enum ConflictType {
  TIME_OVERLAP = 'time_overlap',
  VENDOR_DOUBLE_BOOKING = 'vendor_double_booking',
  LOCATION_CONFLICT = 'location_conflict',
  DEPENDENCY_VIOLATION = 'dependency_violation',
  BUDGET_EXCEEDED = 'budget_exceeded',
  IMPOSSIBLE_TIMING = 'impossible_timing',
}

// Vendor Coordination Types
export interface WeddingVendor {
  id: string;
  name: string;
  category: VendorCategory;
  contactInfo: ContactInfo;
  status: VendorStatus;
  services: VendorService[];
  timeline: string[]; // Timeline item IDs
  budget: {
    quoted: number;
    actual?: number;
    paid?: number;
  };
  contracts: Contract[];
  communications: Communication[];
  availability: AvailabilitySlot[];
  requirements: VendorRequirement[];
  setup: SetupInfo;
  breakdown: BreakdownInfo;
  rating?: number;
  notes?: string;
  emergencyContact?: ContactInfo;
  collaboratorId?: string; // If vendor is also a collaborator
}

export enum VendorCategory {
  PHOTOGRAPHER = 'photographer',
  VIDEOGRAPHER = 'videographer',
  VENUE = 'venue',
  CATERING = 'catering',
  FLORIST = 'florist',
  MUSIC = 'music',
  TRANSPORTATION = 'transportation',
  OFFICIANT = 'officiant',
  PLANNING = 'planning',
  DECOR = 'decor',
  BEAUTY = 'beauty',
  ATTIRE = 'attire',
  CAKE = 'cake',
  LIGHTING = 'lighting',
  SECURITY = 'security',
  OTHER = 'other',
}

export enum VendorStatus {
  INQUIRED = 'inquired',
  QUOTED = 'quoted',
  CONTRACTED = 'contracted',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
}

export interface VendorService {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration?: number;
  included: boolean;
  optional: boolean;
  requirements?: string[];
}

export interface Contract {
  id: string;
  title: string;
  signedDate?: Date;
  amount: number;
  paymentSchedule: PaymentSchedule[];
  terms: string;
  attachments: Attachment[];
  status: ContractStatus;
}

export enum ContractStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  SIGNED = 'signed',
  EXECUTED = 'executed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface PaymentSchedule {
  amount: number;
  dueDate: Date;
  description?: string;
  paid: boolean;
  paidDate?: Date;
}

export interface AvailabilitySlot {
  start: Date;
  end: Date;
  available: boolean;
  notes?: string;
}

export interface VendorRequirement {
  id: string;
  title: string;
  description: string;
  type: RequirementType;
  priority: Priority;
  fulfilled: boolean;
  fulfilledDate?: Date;
  notes?: string;
}

export enum RequirementType {
  EQUIPMENT = 'equipment',
  SPACE = 'space',
  POWER = 'power',
  ACCESS = 'access',
  PERMISSION = 'permission',
  COORDINATION = 'coordination',
  OTHER = 'other',
}

export interface SetupInfo {
  arrivalTime?: Date;
  setupDuration?: number; // minutes
  requirements: VendorRequirement[];
  notes?: string;
}

export interface BreakdownInfo {
  startTime?: Date;
  duration?: number; // minutes
  requirements: VendorRequirement[];
  notes?: string;
}

// Task Management Types
export interface WeddingTask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  category: TaskCategory;
  assignedTo: string[]; // Collaborator IDs
  createdBy: string; // Collaborator ID
  dueDate?: Date;
  completedDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  budget?: number;
  dependencies: string[]; // Other task IDs
  subtasks: SubTask[];
  attachments: Attachment[];
  comments: Comment[];
  tags: string[];
  relatedVendors?: string[];
  relatedTimelineItems?: string[];
  recurrence?: TaskRecurrence;
  reminders: Reminder[];
  progress: number; // 0-100
  createdAt: Date;
  updatedAt: Date;
}

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  BLOCKED = 'blocked',
}

export enum TaskCategory {
  PLANNING = 'planning',
  COORDINATION = 'coordination',
  BOOKING = 'booking',
  PREPARATION = 'preparation',
  DOCUMENTATION = 'documentation',
  COMMUNICATION = 'communication',
  LOGISTICS = 'logistics',
  SETUP = 'setup',
  FOLLOW_UP = 'follow_up',
  OTHER = 'other',
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  assignedTo?: string;
  dueDate?: Date;
  notes?: string;
}

export interface TaskRecurrence {
  pattern: 'daily' | 'weekly' | 'monthly';
  interval: number;
  endDate?: Date;
  occurrences?: number;
}

export interface Reminder {
  id: string;
  time: Date;
  message: string;
  method: ReminderMethod[];
  sent: boolean;
  sentAt?: Date;
}

export enum ReminderMethod {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
}

// Communication Types
export interface ChatChannel {
  id: string;
  name: string;
  type: ChannelType;
  description?: string;
  participants: string[]; // Collaborator IDs
  messages: ChatMessage[];
  isPrivate: boolean;
  isArchived: boolean;
  lastActivity: Date;
  createdAt: Date;
  createdBy: string;
  settings: ChannelSettings;
}

export enum ChannelType {
  GENERAL = 'general',
  VENDOR_COORDINATION = 'vendor_coordination',
  WEDDING_PARTY = 'wedding_party',
  FAMILY = 'family',
  DAY_OF_COORDINATION = 'day_of_coordination',
  VENDOR_SPECIFIC = 'vendor_specific',
  PRIVATE = 'private',
}

export interface ChannelSettings {
  allowFileSharing: boolean;
  allowVoiceMessages: boolean;
  allowVideoMessages: boolean;
  muteNotifications: boolean;
  readReceipts: boolean;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  content: string;
  type: MessageType;
  timestamp: Date;
  editedAt?: Date;
  attachments?: Attachment[];
  mentions?: string[]; // User IDs
  reactions?: MessageReaction[];
  replyTo?: string; // Message ID
  isSystemMessage: boolean;
  readBy: MessageRead[];
  metadata?: MessageMetadata;
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  FILE = 'file',
  LINK = 'link',
  SYSTEM = 'system',
  POLL = 'poll',
  LOCATION = 'location',
}

export interface MessageReaction {
  emoji: string;
  users: string[]; // User IDs
  count: number;
}

export interface MessageRead {
  userId: string;
  readAt: Date;
}

export interface MessageMetadata {
  editHistory?: EditHistory[];
  linkPreview?: LinkPreview;
  pollData?: PollData;
  locationData?: LocationData;
}

export interface EditHistory {
  content: string;
  editedAt: Date;
  reason?: string;
}

export interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

export interface PollData {
  question: string;
  options: PollOption[];
  allowMultiple: boolean;
  anonymous: boolean;
  expiresAt?: Date;
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // User IDs
}

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  name?: string;
}

// Planning Board Types
export interface PlanningBoard {
  id: string;
  name: string;
  type: BoardType;
  description?: string;
  sections: BoardSection[];
  items: BoardItem[];
  collaborators: string[]; // User IDs with access
  settings: BoardSettings;
  createdAt: Date;
  updatedAt: Date;
}

export enum BoardType {
  KANBAN = 'kanban',
  TIMELINE = 'timeline',
  CALENDAR = 'calendar',
  MOOD_BOARD = 'mood_board',
  SEATING_CHART = 'seating_chart',
}

export interface BoardSection {
  id: string;
  name: string;
  color: string;
  position: number;
  itemIds: string[];
  settings: SectionSettings;
}

export interface SectionSettings {
  maxItems?: number;
  autoMove?: boolean;
  rules?: string[];
}

export interface BoardItem {
  id: string;
  title: string;
  description?: string;
  type: BoardItemType;
  sectionId: string;
  position: number;
  assignedTo?: string[];
  dueDate?: Date;
  priority?: Priority;
  labels: string[];
  attachments?: Attachment[];
  customFields: { [key: string]: any };
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export enum BoardItemType {
  TASK = 'task',
  IDEA = 'idea',
  INSPIRATION = 'inspiration',
  VENDOR = 'vendor',
  GUEST = 'guest',
  NOTE = 'note',
  REMINDER = 'reminder',
}

export interface BoardSettings {
  allowComments: boolean;
  allowVoting: boolean;
  allowDueDates: boolean;
  customFields: CustomField[];
  permissions: BoardPermissions;
}

export interface CustomField {
  id: string;
  name: string;
  type:
    | 'text'
    | 'number'
    | 'date'
    | 'select'
    | 'multiselect'
    | 'checkbox'
    | 'url';
  required: boolean;
  options?: string[];
  defaultValue?: any;
}

export interface BoardPermissions {
  view: string[]; // Role names
  edit: string[];
  admin: string[];
}

// Real-time Collaboration Updates
export interface CollaborationUpdate {
  id: string;
  type: UpdateType;
  entityType: EntityType;
  entityId: string;
  userId: string;
  timestamp: Date;
  data: any;
  weddingId: string;
  previousVersion?: any;
  conflictsWith?: string[];
  requiresSync?: boolean;
}

export enum UpdateType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  MOVE = 'move',
  PRESENCE_UPDATE = 'presence_update',
  PERMISSION_CHANGE = 'permission_change',
  STATUS_CHANGE = 'status_change',
  COMMENT_ADD = 'comment_add',
  ATTACHMENT_ADD = 'attachment_add',
}

export enum EntityType {
  TIMELINE_ITEM = 'timeline_item',
  VENDOR = 'vendor',
  TASK = 'task',
  CHAT_MESSAGE = 'chat_message',
  BOARD_ITEM = 'board_item',
  COLLABORATOR = 'collaborator',
  COMMENT = 'comment',
  ATTACHMENT = 'attachment',
}

export interface TimelineUpdate extends CollaborationUpdate {
  action: TimelineAction;
  itemId: string;
  changes: Partial<WeddingTimelineItem>;
  newIndex?: number;
  conflict?: TimelineConflict;
}

export enum TimelineAction {
  ITEM_ADDED = 'item_added',
  ITEM_UPDATED = 'item_updated',
  ITEM_DELETED = 'item_deleted',
  ITEM_MOVED = 'item_moved',
  CONFLICT_DETECTED = 'conflict_detected',
  CONFLICT_RESOLVED = 'conflict_resolved',
}

export interface VendorUpdate extends CollaborationUpdate {
  action: VendorAction;
  vendorId: string;
  changes: Partial<WeddingVendor>;
}

export enum VendorAction {
  VENDOR_ADDED = 'vendor_added',
  VENDOR_UPDATED = 'vendor_updated',
  VENDOR_REMOVED = 'vendor_removed',
  STATUS_CHANGED = 'status_changed',
  CONTRACT_UPDATED = 'contract_updated',
  COMMUNICATION_ADDED = 'communication_added',
}

export interface TaskUpdate extends CollaborationUpdate {
  action: TaskAction;
  taskId: string;
  changes: Partial<WeddingTask>;
}

export enum TaskAction {
  TASK_CREATED = 'task_created',
  TASK_UPDATED = 'task_updated',
  TASK_COMPLETED = 'task_completed',
  TASK_DELETED = 'task_deleted',
  ASSIGNMENT_CHANGED = 'assignment_changed',
  STATUS_CHANGED = 'status_changed',
}

// Connection and Sync Types
export enum ConnectionStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed',
  AUTHENTICATED = 'authenticated',
  UNAUTHORIZED = 'unauthorized',
}

export enum SyncStatus {
  SYNCING = 'syncing',
  SYNCED = 'synced',
  OUT_OF_SYNC = 'out_of_sync',
  ERROR = 'error',
  OFFLINE = 'offline',
}

export interface RealTimeCollaborationState {
  isConnected: boolean;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  activeUsers: ActiveUser[];
  recentActivity: ActivityItem[];
  conflicts: CollaborationConflict[];
  queuedUpdates: CollaborationUpdate[];
  lastSyncTime?: Date;
  error?: CollaborationError;
}

export interface ActiveUser {
  userId: string;
  name: string;
  avatar?: string;
  status: 'online' | 'idle' | 'busy';
  currentSection?: CollaborationSection;
  lastActivity: Date;
  cursor?: CursorData;
}

export interface ActivityItem {
  id: string;
  type: ActivityType;
  userId: string;
  userName: string;
  entityType: EntityType;
  entityId: string;
  description: string;
  timestamp: Date;
  metadata?: any;
}

export enum ActivityType {
  JOINED = 'joined',
  LEFT = 'left',
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  COMMENTED = 'commented',
  ASSIGNED = 'assigned',
  COMPLETED = 'completed',
  SHARED = 'shared',
}

export interface CollaborationConflict {
  id: string;
  type: ConflictType;
  entities: string[];
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoResolvable: boolean;
  suggestions: ConflictSuggestion[];
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
}

export interface ConflictSuggestion {
  id: string;
  description: string;
  action: () => void;
  confidence: number; // 0-1
}

// Notification Types
export interface CollaborationNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  userId: string;
  weddingId: string;
  entityType?: EntityType;
  entityId?: string;
  priority: Priority;
  methods: ReminderMethod[];
  scheduledFor?: Date;
  sentAt?: Date;
  readAt?: Date;
  actionUrl?: string;
  metadata?: any;
}

export enum NotificationType {
  TIMELINE_CONFLICT = 'timeline_conflict',
  VENDOR_UPDATE = 'vendor_update',
  TASK_ASSIGNED = 'task_assigned',
  TASK_OVERDUE = 'task_overdue',
  CHAT_MENTION = 'chat_mention',
  DEADLINE_APPROACHING = 'deadline_approaching',
  BUDGET_ALERT = 'budget_alert',
  COLLABORATION_INVITE = 'collaboration_invite',
  SYSTEM_ALERT = 'system_alert',
  WEDDING_DAY_UPDATE = 'wedding_day_update',
}

// Common Shared Types
export interface Attachment {
  id: string;
  name: string;
  type: AttachmentType;
  url: string;
  size: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: Date;
  metadata?: AttachmentMetadata;
}

export enum AttachmentType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  LINK = 'link',
  OTHER = 'other',
}

export interface AttachmentMetadata {
  width?: number;
  height?: number;
  duration?: number;
  thumbnail?: string;
  description?: string;
}

export interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  timestamp: Date;
  editedAt?: Date;
  mentions?: string[];
  reactions?: MessageReaction[];
  attachments?: Attachment[];
  isPrivate: boolean;
}

export interface Communication {
  id: string;
  type: CommunicationType;
  subject?: string;
  content: string;
  senderId: string;
  recipientIds: string[];
  timestamp: Date;
  status: CommunicationStatus;
  attachments?: Attachment[];
  metadata?: any;
}

export enum CommunicationType {
  EMAIL = 'email',
  SMS = 'sms',
  PHONE_CALL = 'phone_call',
  VIDEO_CALL = 'video_call',
  IN_PERSON = 'in_person',
  MESSAGE = 'message',
}

export enum CommunicationStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  RESPONDED = 'responded',
  FAILED = 'failed',
}

// Invitation and Access Types
export interface CollaboratorInvitation {
  id: string;
  weddingId: string;
  invitedBy: string;
  invitedEmail: string;
  invitedName?: string;
  role: CollaboratorRole;
  permissions: WeddingPermissions;
  message?: string;
  expiresAt: Date;
  status: InvitationStatus;
  sentAt: Date;
  acceptedAt?: Date;
  token: string;
}

export enum InvitationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

// Error Handling
export interface CollaborationError extends Error {
  code: CollaborationErrorCode;
  weddingId?: string;
  userId?: string;
  entityType?: EntityType;
  entityId?: string;
  context?: any;
}

export enum CollaborationErrorCode {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  INVALID_OPERATION = 'INVALID_OPERATION',
  CONFLICT_DETECTED = 'CONFLICT_DETECTED',
  SYNC_FAILED = 'SYNC_FAILED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATA_CORRUPTION = 'DATA_CORRUPTION',
}

// Export legacy types for compatibility (using local definitions)
export const LegacyConnectionStatus = ConnectionStatus;
export const LegacySyncStatus = SyncStatus;

export interface OperationType {
  INSERT: 'insert';
  DELETE: 'delete';
  RETAIN: 'retain';
}

export interface Operation {
  id: string;
  type: keyof OperationType;
  position: number;
  content?: any;
  length?: number;
  userId: string;
  timestamp: Date;
}

export interface StateVector {
  [clientId: number]: number;
}

export interface SyncResult {
  success: boolean;
  documentId: string;
  operationsApplied: number;
  conflicts: any[];
  timestamp: Date;
  clientVector: StateVector;
  serverVector: StateVector;
}

export interface ConflictResolution {
  conflictId: string;
  operations: Operation[];
  resolution: 'merged' | 'rejected' | 'deferred';
  reason: string;
  timestamp: Date;
  resolvedBy: 'server' | 'client' | 'algorithm';
}
