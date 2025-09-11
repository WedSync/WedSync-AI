// Collaboration Types for WS-342 Real-Time Wedding Collaboration
// Team D Platform Development - Collaboration type definitions

export interface CollaborativeWorkspace {
  id: string;
  weddingId: string;
  name: string;
  participants: PlatformParticipant[];
  sharedResources: SharedResource[];

  // Cross-platform features
  unifiedChat: CrossPlatformChat;
  sharedTimeline: CollaborativeTimeline;
  jointBudget: CollaborativeBudget;
  documentLibrary: SharedDocumentLibrary;

  // Collaboration tools
  realTimeEditing: RealTimeEditingSession[];
  videoConferencing: VideoConferenceIntegration;
  taskManagement: CollaborativeTaskManager;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface PlatformParticipant {
  userId: string;
  platform: 'wedsync' | 'wedme';
  role: ParticipantRole;
  permissions: CollaborationPermissions;
  presence: ParticipantPresence;

  // Wedding context
  weddingRole: WeddingRole;
  vendorType?: VendorType;
  relationshipToCuple?: RelationshipType;

  // Session info
  joinedAt: Date;
  lastSeen: Date;
  isOnline: boolean;
}

export type ParticipantRole =
  | 'couple_primary'
  | 'couple_secondary'
  | 'vendor_lead'
  | 'vendor_team'
  | 'wedding_planner'
  | 'family_member'
  | 'friend_helper';

export type WeddingRole =
  | 'bride'
  | 'groom'
  | 'partner'
  | 'photographer'
  | 'videographer'
  | 'venue_coordinator'
  | 'caterer'
  | 'florist'
  | 'dj'
  | 'band'
  | 'wedding_planner'
  | 'officiant'
  | 'parent'
  | 'bridesmaid'
  | 'groomsman'
  | 'guest';

export type VendorType =
  | 'photographer'
  | 'videographer'
  | 'venue'
  | 'catering'
  | 'flowers'
  | 'music'
  | 'planning'
  | 'officiant'
  | 'transportation'
  | 'beauty'
  | 'attire'
  | 'decorations'
  | 'other';

export type RelationshipType =
  | 'direct_family'
  | 'extended_family'
  | 'close_friend'
  | 'wedding_party'
  | 'service_provider'
  | 'venue_staff';

export interface CollaborationPermissions {
  canEdit: boolean;
  canComment: boolean;
  canInvite: boolean;
  canManageFiles: boolean;
  canScheduleMeetings: boolean;
  canViewBudget: boolean;
  canEditBudget: boolean;
  canAccessVendorInfo: boolean;
  customPermissions?: Record<string, boolean>;
}

export interface ParticipantPresence {
  status: PresenceStatus;
  currentActivity?: ActivityType;
  location?: PresenceLocation;
  lastActivity: Date;
  deviceType: DeviceType;
  platform: 'wedsync' | 'wedme';
}

export type PresenceStatus = 'online' | 'idle' | 'busy' | 'away' | 'offline';

export type ActivityType =
  | 'viewing_timeline'
  | 'editing_budget'
  | 'messaging'
  | 'reviewing_photos'
  | 'in_meeting'
  | 'planning_event'
  | 'vendor_communication'
  | 'file_upload';

export interface PresenceLocation {
  workspaceId: string;
  sectionType: WorkspaceSectionType;
  itemId?: string;
}

export type WorkspaceSectionType =
  | 'dashboard'
  | 'timeline'
  | 'budget'
  | 'vendors'
  | 'guests'
  | 'documents'
  | 'chat'
  | 'gallery';

export type DeviceType = 'desktop' | 'mobile' | 'tablet';

export interface SharedResource {
  id: string;
  type: ResourceType;
  name: string;
  url?: string;
  data?: any;
  permissions: ResourcePermissions;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export type ResourceType =
  | 'document'
  | 'image'
  | 'video'
  | 'timeline'
  | 'budget'
  | 'vendor_contract'
  | 'guest_list'
  | 'floor_plan'
  | 'mood_board';

export interface ResourcePermissions {
  visibility: 'public' | 'private' | 'restricted';
  allowedUsers?: string[];
  editableBy: string[];
  downloadable: boolean;
}

export interface CrossPlatformChat {
  id: string;
  workspaceId: string;
  channels: ChatChannel[];
  participants: ChatParticipant[];
  settings: ChatSettings;
}

export interface ChatChannel {
  id: string;
  name: string;
  type: ChannelType;
  participants: string[];
  messages: ChatMessage[];
  isActive: boolean;
  createdAt: Date;
}

export type ChannelType =
  | 'general'
  | 'vendors'
  | 'timeline_updates'
  | 'budget_discussions'
  | 'emergency'
  | 'private';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderPlatform: 'wedsync' | 'wedme';
  content: string;
  messageType: MessageType;
  timestamp: Date;
  editedAt?: Date;
  reactions?: MessageReaction[];
  attachments?: MessageAttachment[];
  mentions?: string[];
  replyTo?: string;
}

export type MessageType =
  | 'text'
  | 'image'
  | 'file'
  | 'system'
  | 'announcement'
  | 'poll'
  | 'reminder';

export interface MessageReaction {
  emoji: string;
  userId: string;
  timestamp: Date;
}

export interface MessageAttachment {
  id: string;
  type: 'file' | 'image' | 'video' | 'document';
  name: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface ChatParticipant {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  platform: 'wedsync' | 'wedme';
  role: ParticipantRole;
  joinedAt: Date;
  lastReadAt: Date;
  notificationSettings: ChatNotificationSettings;
}

export interface ChatSettings {
  allowFileSharing: boolean;
  allowVoiceMessages: boolean;
  allowVideoMessages: boolean;
  maxFileSize: number;
  retentionDays: number;
  moderationEnabled: boolean;
}

export interface ChatNotificationSettings {
  enabled: boolean;
  mentions: boolean;
  directMessages: boolean;
  channelMessages: boolean;
  systemMessages: boolean;
  quietHours?: QuietHours;
}

export interface QuietHours {
  enabled: boolean;
  startTime: string; // HH:mm format
  endTime: string;
  timezone: string;
}

export interface CollaborativeTimeline {
  id: string;
  weddingId: string;
  title: string;
  collaborators: TimelineCollaborator[];
  events: CollaborativeEvent[];

  // Cross-platform features
  vendorMilestones: VendorMilestone[];
  coupleDecisions: CoupleDecision[];
  collaborationPoints: CollaborationPoint[];

  // Real-time capabilities
  liveEditing: boolean;
  conflictResolution: ConflictResolutionSettings;
  notificationSettings: TimelineNotificationSettings;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface TimelineCollaborator {
  userId: string;
  platform: 'wedsync' | 'wedme';
  permissions: TimelinePermissions;
  color: string;
  isOnline: boolean;
  lastEdit: Date;
}

export interface TimelinePermissions {
  canCreateEvents: boolean;
  canEditEvents: boolean;
  canDeleteEvents: boolean;
  canInviteCollaborators: boolean;
  canManageSettings: boolean;
  editableEventTypes?: string[];
}

export interface CollaborativeEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  type: EventType;

  // Collaboration info
  createdBy: string;
  assignedVendors?: string[];
  involvedParticipants: string[];

  // Status
  status: EventStatus;
  confirmationRequired: boolean;
  confirmedBy?: string[];

  // Cross-platform sync
  syncStatus: SyncStatus;
  lastModified: Date;
  modifiedBy: string;
  version: number;
}

export type EventType =
  | 'ceremony'
  | 'reception'
  | 'rehearsal'
  | 'vendor_meeting'
  | 'venue_visit'
  | 'photo_session'
  | 'dress_fitting'
  | 'hair_trial'
  | 'cake_tasting'
  | 'deadline'
  | 'milestone'
  | 'reminder';

export type EventStatus =
  | 'planned'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'needs_confirmation';

export type SyncStatus =
  | 'synced'
  | 'pending_sync'
  | 'sync_error'
  | 'conflict'
  | 'sync_disabled';

export interface VendorMilestone {
  id: string;
  vendorId: string;
  vendorType: VendorType;
  milestone: string;
  dueDate: Date;
  status: MilestoneStatus;
  dependencies?: string[];
  linkedEvents: string[];
}

export type MilestoneStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'overdue'
  | 'blocked';

export interface CoupleDecision {
  id: string;
  decision: string;
  category: DecisionCategory;
  status: DecisionStatus;
  deadline?: Date;
  impact: DecisionImpact;
  affectedVendors: string[];
  discussionThreadId?: string;
}

export type DecisionCategory =
  | 'venue'
  | 'catering'
  | 'music'
  | 'photography'
  | 'flowers'
  | 'attire'
  | 'guest_list'
  | 'budget'
  | 'timeline'
  | 'decor';

export type DecisionStatus = 'pending' | 'discussing' | 'decided' | 'changed';

export type DecisionImpact = 'low' | 'medium' | 'high' | 'critical';

export interface CollaborationPoint {
  id: string;
  timelineEventId: string;
  participantIds: string[];
  collaborationType: CollaborationType;
  status: CollaborationStatus;
  scheduledTime?: Date;
}

export type CollaborationType =
  | 'decision_point'
  | 'vendor_meeting'
  | 'review_session'
  | 'planning_session'
  | 'check_in';

export type CollaborationStatus =
  | 'scheduled'
  | 'active'
  | 'completed'
  | 'cancelled';

export interface ConflictResolutionSettings {
  strategy: AutoResolutionStrategy;
  requiresApproval: boolean;
  approvers: string[];
  timeoutMinutes: number;
}

export type AutoResolutionStrategy =
  | 'last_writer_wins'
  | 'first_writer_wins'
  | 'merge_changes'
  | 'manual_resolution';

export interface TimelineNotificationSettings {
  eventReminders: boolean;
  conflictAlerts: boolean;
  milestoneUpdates: boolean;
  collaboratorChanges: boolean;
  syncIssues: boolean;
}

export interface CollaborativeBudget {
  id: string;
  weddingId: string;
  totalBudget: number;
  currency: string;
  categories: BudgetCategory[];

  // Collaboration features
  collaborators: BudgetCollaborator[];
  approvalWorkflow: ApprovalWorkflow;
  trackingSettings: BudgetTrackingSettings;

  // Real-time features
  liveUpdates: boolean;
  changeLog: BudgetChange[];

  // Status
  status: BudgetStatus;
  lastUpdated: Date;
  version: number;
}

export interface BudgetCategory {
  id: string;
  name: string;
  allocatedAmount: number;
  spentAmount: number;
  vendors: BudgetVendor[];
  status: CategoryStatus;
  priority: CategoryPriority;
}

export type CategoryStatus =
  | 'planned'
  | 'allocated'
  | 'contracted'
  | 'paid'
  | 'completed';

export type CategoryPriority = 'high' | 'medium' | 'low';

export interface BudgetVendor {
  vendorId: string;
  estimatedCost: number;
  actualCost?: number;
  paymentSchedule?: PaymentSchedule;
  status: VendorBudgetStatus;
}

export type VendorBudgetStatus =
  | 'estimated'
  | 'quoted'
  | 'contracted'
  | 'deposit_paid'
  | 'final_paid';

export interface PaymentSchedule {
  milestones: PaymentMilestone[];
  totalAmount: number;
  currency: string;
}

export interface PaymentMilestone {
  id: string;
  description: string;
  amount: number;
  dueDate: Date;
  status: PaymentStatus;
  paidDate?: Date;
}

export type PaymentStatus =
  | 'pending'
  | 'due'
  | 'paid'
  | 'overdue'
  | 'cancelled';

export interface BudgetCollaborator {
  userId: string;
  permissions: BudgetPermissions;
  notificationSettings: BudgetNotificationSettings;
}

export interface BudgetPermissions {
  canView: boolean;
  canEdit: boolean;
  canApprove: boolean;
  canAddVendors: boolean;
  editableCategories?: string[];
  spendingLimit?: number;
}

export interface BudgetNotificationSettings {
  budgetChanges: boolean;
  overspendingAlerts: boolean;
  paymentReminders: boolean;
  approvalRequests: boolean;
}

export interface ApprovalWorkflow {
  enabled: boolean;
  thresholds: ApprovalThreshold[];
  approvers: ApprovalRole[];
  requireAllApprovals: boolean;
}

export interface ApprovalThreshold {
  amount: number;
  requiresApproval: boolean;
  approverRoles: string[];
}

export interface ApprovalRole {
  userId: string;
  role: BudgetApprovalRole;
  spendingLimit?: number;
}

export type BudgetApprovalRole =
  | 'primary_approver'
  | 'secondary_approver'
  | 'category_approver'
  | 'financial_advisor';

export interface BudgetTrackingSettings {
  autoSync: boolean;
  vendorIntegration: boolean;
  receiptCapture: boolean;
  bankAccountSync: boolean;
  categoryRules: AutoCategorizationRule[];
}

export interface AutoCategorizationRule {
  vendorPattern: string;
  category: string;
  confidence: number;
}

export interface BudgetChange {
  id: string;
  timestamp: Date;
  userId: string;
  changeType: BudgetChangeType;
  field: string;
  oldValue: any;
  newValue: any;
  description?: string;
  approved: boolean;
  approvedBy?: string;
}

export type BudgetChangeType =
  | 'amount_change'
  | 'vendor_added'
  | 'vendor_removed'
  | 'category_added'
  | 'category_removed'
  | 'payment_recorded'
  | 'approval_status_changed';

export type BudgetStatus = 'draft' | 'active' | 'final' | 'completed';

export interface SharedDocumentLibrary {
  id: string;
  workspaceId: string;
  folders: DocumentFolder[];
  files: SharedDocument[];
  settings: DocumentLibrarySettings;
}

export interface DocumentFolder {
  id: string;
  name: string;
  parentId?: string;
  permissions: FolderPermissions;
  createdAt: Date;
  createdBy: string;
}

export interface FolderPermissions {
  visibility: 'public' | 'restricted' | 'private';
  allowedUsers: string[];
  allowedRoles: ParticipantRole[];
  editableBy: string[];
}

export interface SharedDocument {
  id: string;
  name: string;
  type: DocumentType;
  folderId?: string;
  url: string;
  size: number;
  mimeType: string;

  // Collaboration
  owner: string;
  collaborators: DocumentCollaborator[];
  permissions: DocumentPermissions;

  // Versioning
  version: number;
  versions: DocumentVersion[];

  // Metadata
  tags: string[];
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt: Date;
}

export type DocumentType =
  | 'contract'
  | 'invoice'
  | 'floor_plan'
  | 'mood_board'
  | 'timeline'
  | 'guest_list'
  | 'vendor_info'
  | 'photo'
  | 'video'
  | 'other';

export interface DocumentCollaborator {
  userId: string;
  permissions: DocumentCollaboratorPermissions;
  lastAccessed: Date;
}

export interface DocumentCollaboratorPermissions {
  canView: boolean;
  canEdit: boolean;
  canComment: boolean;
  canShare: boolean;
  canDelete: boolean;
}

export interface DocumentPermissions {
  isPublic: boolean;
  allowDownload: boolean;
  requiresApproval: boolean;
  expiresAt?: Date;
  passwordProtected: boolean;
  watermark: boolean;
}

export interface DocumentVersion {
  version: number;
  url: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
  changes?: string;
  approved: boolean;
  approvedBy?: string;
}

export interface DocumentLibrarySettings {
  maxFileSize: number;
  allowedFileTypes: string[];
  versioningEnabled: boolean;
  approvalRequired: boolean;
  autoDelete: boolean;
  retentionDays?: number;
}

export interface RealTimeEditingSession {
  id: string;
  documentId: string;
  participants: EditingParticipant[];
  cursors: CursorPosition[];
  selections: TextSelection[];
  changes: EditingChange[];
  isActive: boolean;
  startedAt: Date;
}

export interface EditingParticipant {
  userId: string;
  name: string;
  color: string;
  cursor: CursorPosition;
  isActive: boolean;
}

export interface CursorPosition {
  line: number;
  column: number;
  timestamp: Date;
}

export interface TextSelection {
  userId: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  timestamp: Date;
}

export interface EditingChange {
  id: string;
  userId: string;
  operation: EditOperation;
  position: CursorPosition;
  content: string;
  timestamp: Date;
  applied: boolean;
}

export type EditOperation = 'insert' | 'delete' | 'replace' | 'format';

export interface VideoConferenceIntegration {
  id: string;
  workspaceId: string;
  provider: VideoProvider;
  meetingUrl: string;
  scheduledFor?: Date;
  participants: VideoParticipant[];
  features: VideoFeatures;
  status: MeetingStatus;
}

export type VideoProvider = 'zoom' | 'meet' | 'teams' | 'webrtc';

export interface VideoParticipant {
  userId: string;
  joinedAt?: Date;
  leftAt?: Date;
  role: MeetingRole;
  permissions: MeetingPermissions;
}

export type MeetingRole = 'host' | 'co_host' | 'participant' | 'observer';

export interface MeetingPermissions {
  canShareScreen: boolean;
  canRecord: boolean;
  canMute: boolean;
  canChat: boolean;
  canAnnotate: boolean;
}

export interface VideoFeatures {
  screenSharing: boolean;
  recording: boolean;
  chat: boolean;
  whiteboard: boolean;
  annotations: boolean;
  breakoutRooms: boolean;
}

export type MeetingStatus = 'scheduled' | 'active' | 'ended' | 'cancelled';

export interface CollaborativeTaskManager {
  id: string;
  workspaceId: string;
  tasks: CollaborativeTask[];
  assignees: TaskAssignee[];
  settings: TaskManagerSettings;
}

export interface CollaborativeTask {
  id: string;
  title: string;
  description?: string;
  assignedTo: string[];
  dueDate?: Date;
  priority: TaskPriority;
  status: TaskStatus;
  category: TaskCategory;

  // Collaboration
  comments: TaskComment[];
  attachments: TaskAttachment[];
  checkList: ChecklistItem[];

  // Tracking
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  timeSpent?: number;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskStatus =
  | 'todo'
  | 'in_progress'
  | 'review'
  | 'completed'
  | 'cancelled';

export type TaskCategory =
  | 'planning'
  | 'vendor_coordination'
  | 'venue_setup'
  | 'guest_management'
  | 'documentation'
  | 'budget'
  | 'timeline'
  | 'emergency';

export interface TaskComment {
  id: string;
  authorId: string;
  content: string;
  timestamp: Date;
  edited: boolean;
  editedAt?: Date;
}

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completedBy?: string;
  completedAt?: Date;
}

export interface TaskAssignee {
  userId: string;
  role: AssigneeRole;
  workloadCapacity: number;
  currentWorkload: number;
  availability: AvailabilitySchedule;
}

export type AssigneeRole = 'primary' | 'secondary' | 'reviewer' | 'observer';

export interface AvailabilitySchedule {
  timezone: string;
  workingHours: WorkingHours[];
  unavailableDates: Date[];
}

export interface WorkingHours {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:mm format
  endTime: string;
}

export interface TaskManagerSettings {
  autoAssignment: boolean;
  notificationSettings: TaskNotificationSettings;
  workflowRules: WorkflowRule[];
  integrations: TaskIntegration[];
}

export interface TaskNotificationSettings {
  taskAssigned: boolean;
  taskDue: boolean;
  taskCompleted: boolean;
  taskOverdue: boolean;
  comments: boolean;
  mentions: boolean;
  reminders: ReminderSettings[];
}

export interface ReminderSettings {
  type: ReminderType;
  timeBeforeDue: number; // minutes
  enabled: boolean;
  channels: NotificationChannel[];
}

export type ReminderType =
  | 'first_reminder'
  | 'second_reminder'
  | 'final_reminder'
  | 'overdue_reminder';

export type NotificationChannel = 'email' | 'sms' | 'push' | 'platform';

export interface WorkflowRule {
  id: string;
  name: string;
  trigger: WorkflowTrigger;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  enabled: boolean;
}

export interface WorkflowTrigger {
  type: TriggerType;
  conditions: any;
}

export type TriggerType =
  | 'task_created'
  | 'task_completed'
  | 'task_overdue'
  | 'task_assigned'
  | 'comment_added';

export interface WorkflowCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
}

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'contains'
  | 'starts_with'
  | 'ends_with';

export interface WorkflowAction {
  type: ActionType;
  parameters: any;
}

export type ActionType =
  | 'send_notification'
  | 'assign_user'
  | 'change_status'
  | 'add_comment'
  | 'set_due_date'
  | 'create_subtask';

export interface TaskIntegration {
  name: string;
  type: IntegrationType;
  enabled: boolean;
  configuration: any;
}

export type IntegrationType =
  | 'calendar'
  | 'email'
  | 'project_management'
  | 'time_tracking'
  | 'vendor_system';
