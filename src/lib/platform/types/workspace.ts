// Workspace Types for WS-342 Real-Time Wedding Collaboration
// Team D Platform Development - Shared workspace type definitions

export interface SharedWorkspace {
  id: string;
  weddingId: string;
  name: string;
  description?: string;
  type: WorkspaceType;

  // Participants
  owner: WorkspaceParticipant;
  participants: WorkspaceParticipant[];
  invitedUsers: WorkspaceInvite[];

  // Features
  features: WorkspaceFeature[];
  settings: WorkspaceSettings;
  permissions: WorkspacePermissions;

  // Content
  sections: WorkspaceSection[];
  sharedResources: SharedResource[];
  activities: WorkspaceActivity[];

  // Status
  status: WorkspaceStatus;
  visibility: WorkspaceVisibility;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
  version: number;
}

export type WorkspaceType =
  | 'wedding_planning'
  | 'vendor_coordination'
  | 'timeline_collaboration'
  | 'budget_management'
  | 'guest_coordination'
  | 'venue_planning'
  | 'vendor_showcase'
  | 'emergency_response';

export interface WorkspaceParticipant {
  userId: string;
  displayName: string;
  email: string;
  platform: 'wedsync' | 'wedme';
  role: WorkspaceRole;
  permissions: ParticipantPermissions;

  // Presence
  isOnline: boolean;
  lastSeen: Date;
  currentSection?: string;
  status: ParticipantStatus;

  // Collaboration
  contributions: number;
  joinedAt: Date;
  invitedBy?: string;
  customTitle?: string;
}

export type WorkspaceRole =
  | 'owner'
  | 'admin'
  | 'editor'
  | 'collaborator'
  | 'viewer'
  | 'guest';

export interface ParticipantPermissions {
  // Content permissions
  canViewAll: boolean;
  canEditContent: boolean;
  canDeleteContent: boolean;
  canCreateSections: boolean;
  canManageResources: boolean;

  // Collaboration permissions
  canInviteUsers: boolean;
  canManageParticipants: boolean;
  canModerateChat: boolean;
  canScheduleMeetings: boolean;
  canManageSettings: boolean;

  // Platform permissions
  canAccessBudget: boolean;
  canAccessVendorInfo: boolean;
  canAccessGuestList: boolean;
  canExportData: boolean;

  // Custom permissions
  customPermissions: Record<string, boolean>;
  restrictedSections: string[];
  allowedActions: string[];
}

export type ParticipantStatus =
  | 'active'
  | 'idle'
  | 'busy'
  | 'away'
  | 'offline'
  | 'do_not_disturb';

export interface WorkspaceInvite {
  id: string;
  email: string;
  role: WorkspaceRole;
  invitedBy: string;
  invitedAt: Date;
  expiresAt: Date;

  // Status
  status: InviteStatus;
  acceptedAt?: Date;
  declinedAt?: Date;

  // Customization
  personalMessage?: string;
  customRole?: string;
  initialSections?: string[];
}

export type InviteStatus =
  | 'pending'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'cancelled';

export type WorkspaceFeature =
  | 'real_time_collaboration'
  | 'video_conferencing'
  | 'file_sharing'
  | 'chat_messaging'
  | 'task_management'
  | 'calendar_integration'
  | 'budget_tracking'
  | 'vendor_management'
  | 'guest_management'
  | 'timeline_planning'
  | 'document_templates'
  | 'mobile_access'
  | 'offline_sync'
  | 'version_control'
  | 'audit_log';

export interface WorkspaceSettings {
  // General settings
  autoSave: boolean;
  versionControl: boolean;
  realTimeSync: boolean;
  offlineAccess: boolean;

  // Collaboration settings
  allowGuests: boolean;
  requireApproval: boolean;
  moderateChat: boolean;
  enableVideoCall: boolean;

  // Notification settings
  emailNotifications: NotificationSettings;
  pushNotifications: NotificationSettings;
  slackIntegration?: SlackSettings;

  // Privacy settings
  shareAnalytics: boolean;
  allowDataExport: boolean;
  dataRetentionDays: number;
  encryptionEnabled: boolean;

  // Customization
  theme: WorkspaceTheme;
  logo?: string;
  brandColors?: BrandColors;
  customFields: CustomField[];
}

export interface NotificationSettings {
  enabled: boolean;
  frequency: NotificationFrequency;
  types: NotificationType[];
  quietHours: QuietHours;
  digest: DigestSettings;
}

export type NotificationFrequency =
  | 'immediate'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'never';

export type NotificationType =
  | 'mentions'
  | 'comments'
  | 'updates'
  | 'deadlines'
  | 'meetings'
  | 'invitations'
  | 'system';

export interface QuietHours {
  enabled: boolean;
  startTime: string; // HH:mm format
  endTime: string;
  timezone: string;
  days: number[]; // 0-6 (Sunday-Saturday)
}

export interface DigestSettings {
  enabled: boolean;
  frequency: 'daily' | 'weekly';
  time: string; // HH:mm format
  includePreview: boolean;
  maxItems: number;
}

export interface SlackSettings {
  enabled: boolean;
  webhookUrl: string;
  channel: string;
  events: SlackEventType[];
}

export type SlackEventType =
  | 'new_comment'
  | 'deadline_reminder'
  | 'user_joined'
  | 'meeting_scheduled'
  | 'budget_alert'
  | 'milestone_completed';

export interface WorkspaceTheme {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  mode: 'light' | 'dark' | 'auto';
}

export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  neutral: string;
}

export interface CustomField {
  id: string;
  name: string;
  type: CustomFieldType;
  required: boolean;
  options?: string[];
  defaultValue?: any;
  validation?: FieldValidation;
}

export type CustomFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'boolean'
  | 'select'
  | 'multi_select'
  | 'url'
  | 'email'
  | 'phone';

export interface FieldValidation {
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  required?: boolean;
}

export interface WorkspacePermissions {
  // Global permissions
  isPublic: boolean;
  allowSearch: boolean;
  allowInvites: boolean;
  allowComments: boolean;
  allowDownloads: boolean;

  // Role-based permissions
  rolePermissions: RolePermission[];

  // Section-specific permissions
  sectionPermissions: SectionPermission[];

  // Time-based permissions
  accessSchedule?: AccessSchedule;

  // IP restrictions
  ipWhitelist?: string[];
  geoRestrictions?: GeoRestriction[];
}

export interface RolePermission {
  role: WorkspaceRole;
  permissions: string[];
  restrictions: string[];
  conditions?: PermissionCondition[];
}

export interface PermissionCondition {
  type: ConditionType;
  value: any;
  description: string;
}

export type ConditionType =
  | 'time_based'
  | 'location_based'
  | 'device_based'
  | 'behavior_based';

export interface SectionPermission {
  sectionId: string;
  permissions: SectionAccessControl;
  overrides: RoleOverride[];
}

export interface SectionAccessControl {
  defaultAccess: AccessLevel;
  requiresApproval: boolean;
  viewRestrictions?: ViewRestriction[];
  editRestrictions?: EditRestriction[];
}

export type AccessLevel = 'full' | 'read_only' | 'restricted' | 'no_access';

export interface ViewRestriction {
  type: RestrictionType;
  condition: any;
  message?: string;
}

export interface EditRestriction {
  type: RestrictionType;
  condition: any;
  override?: string[];
  message?: string;
}

export type RestrictionType =
  | 'role_based'
  | 'time_based'
  | 'approval_required'
  | 'owner_only'
  | 'invite_only';

export interface RoleOverride {
  role: WorkspaceRole;
  permissions: string[];
  restrictions: string[];
  temporary?: TemporaryAccess;
}

export interface TemporaryAccess {
  startTime: Date;
  endTime: Date;
  reason: string;
  grantedBy: string;
}

export interface AccessSchedule {
  timezone: string;
  schedule: TimeSlot[];
  exceptions: ScheduleException[];
}

export interface TimeSlot {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:mm format
  endTime: string;
  accessLevel: AccessLevel;
}

export interface ScheduleException {
  date: Date;
  accessLevel: AccessLevel;
  reason: string;
}

export interface GeoRestriction {
  type: 'allow' | 'block';
  countries: string[];
  regions?: string[];
  cities?: string[];
}

export interface WorkspaceSection {
  id: string;
  name: string;
  type: SectionType;
  description?: string;
  icon?: string;
  order: number;

  // Content
  content: SectionContent;
  attachments: SectionAttachment[];
  comments: SectionComment[];

  // Collaboration
  collaborators: SectionCollaborator[];
  activities: SectionActivity[];

  // Settings
  settings: SectionSettings;
  permissions: SectionPermissions;

  // Status
  status: SectionStatus;
  progress?: SectionProgress;

  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export type SectionType =
  | 'timeline'
  | 'budget'
  | 'vendors'
  | 'guests'
  | 'documents'
  | 'photos'
  | 'tasks'
  | 'notes'
  | 'decisions'
  | 'inspiration'
  | 'contracts'
  | 'payments'
  | 'communications'
  | 'emergency_contacts';

export interface SectionContent {
  type: ContentType;
  data: any;
  template?: string;
  customFields: CustomFieldValue[];

  // Rich content
  html?: string;
  markdown?: string;

  // Structured data
  schema?: ContentSchema;
  validation?: ContentValidation;
}

export type ContentType =
  | 'rich_text'
  | 'structured_data'
  | 'table'
  | 'kanban'
  | 'calendar'
  | 'gallery'
  | 'form'
  | 'chart'
  | 'embedded';

export interface CustomFieldValue {
  fieldId: string;
  value: any;
  updatedBy: string;
  updatedAt: Date;
}

export interface ContentSchema {
  fields: SchemaField[];
  required: string[];
  relationships?: SchemaRelationship[];
}

export interface SchemaField {
  name: string;
  type: SchemaFieldType;
  description?: string;
  constraints?: FieldConstraint[];
}

export type SchemaFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'array'
  | 'object'
  | 'reference';

export interface FieldConstraint {
  type: ConstraintType;
  value: any;
  message?: string;
}

export type ConstraintType =
  | 'required'
  | 'unique'
  | 'min'
  | 'max'
  | 'pattern'
  | 'enum';

export interface SchemaRelationship {
  field: string;
  relatedSection: string;
  relatedField: string;
  type: RelationshipType;
}

export type RelationshipType = 'one_to_one' | 'one_to_many' | 'many_to_many';

export interface ContentValidation {
  rules: ValidationRule[];
  required: boolean;
  custom?: CustomValidation[];
}

export interface ValidationRule {
  field: string;
  rule: ValidationRuleType;
  value?: any;
  message: string;
}

export type ValidationRuleType =
  | 'required'
  | 'min_length'
  | 'max_length'
  | 'pattern'
  | 'email'
  | 'url'
  | 'date_range'
  | 'numeric_range';

export interface CustomValidation {
  name: string;
  function: string; // JavaScript function as string
  message: string;
  priority: number;
}

export interface SectionAttachment {
  id: string;
  name: string;
  type: AttachmentType;
  size: number;
  url: string;
  thumbnailUrl?: string;

  // Metadata
  mimeType: string;
  dimensions?: ImageDimensions;
  duration?: number; // for videos/audio

  // Access
  uploadedBy: string;
  uploadedAt: Date;
  accessCount: number;
  lastAccessedAt: Date;

  // Collaboration
  comments: AttachmentComment[];
  annotations?: Annotation[];

  // Organization
  tags: string[];
  categories: string[];

  // Status
  status: AttachmentStatus;
  virusScanned: boolean;
  approved: boolean;
  approvedBy?: string;
}

export type AttachmentType =
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'spreadsheet'
  | 'presentation'
  | 'pdf'
  | 'archive'
  | 'code'
  | 'other';

export interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

export interface AttachmentComment {
  id: string;
  authorId: string;
  content: string;
  timestamp: Date;
  position?: CommentPosition;
  replies: AttachmentComment[];
}

export interface CommentPosition {
  x: number;
  y: number;
  page?: number; // for PDFs
  time?: number; // for videos/audio
}

export interface Annotation {
  id: string;
  type: AnnotationType;
  position: AnnotationPosition;
  content: AnnotationContent;

  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;

  // Collaboration
  replies: AnnotationReply[];
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
}

export type AnnotationType =
  | 'highlight'
  | 'note'
  | 'arrow'
  | 'rectangle'
  | 'circle'
  | 'freehand'
  | 'text'
  | 'stamp';

export interface AnnotationPosition {
  x: number;
  y: number;
  width?: number;
  height?: number;
  page?: number;
  time?: number;
  coordinates?: Coordinate[];
}

export interface Coordinate {
  x: number;
  y: number;
}

export interface AnnotationContent {
  text?: string;
  color: string;
  strokeWidth?: number;
  style?: AnnotationStyle;
  data?: any;
}

export interface AnnotationStyle {
  opacity: number;
  dashPattern?: number[];
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
}

export interface AnnotationReply {
  id: string;
  authorId: string;
  content: string;
  timestamp: Date;
}

export type AttachmentStatus =
  | 'uploading'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'quarantined'
  | 'archived';

export interface SectionComment {
  id: string;
  authorId: string;
  content: string;
  timestamp: Date;

  // Threading
  parentId?: string;
  replies: SectionComment[];

  // Status
  edited: boolean;
  editedAt?: Date;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;

  // Engagement
  reactions: CommentReaction[];
  mentions: string[];

  // Rich content
  attachments: CommentAttachment[];
  type: CommentType;
}

export interface CommentReaction {
  emoji: string;
  userId: string;
  timestamp: Date;
}

export interface CommentAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export type CommentType =
  | 'text'
  | 'suggestion'
  | 'question'
  | 'approval'
  | 'system';

export interface SectionCollaborator {
  userId: string;
  role: CollaboratorRole;
  permissions: CollaboratorPermissions;

  // Activity
  joinedAt: Date;
  lastActiveAt: Date;
  contributions: CollaboratorContribution[];

  // Status
  isOnline: boolean;
  currentActivity?: CollaboratorActivity;

  // Preferences
  notifications: CollaboratorNotifications;
  displaySettings: CollaboratorDisplaySettings;
}

export type CollaboratorRole = 'lead' | 'contributor' | 'reviewer' | 'observer';

export interface CollaboratorPermissions {
  canEdit: boolean;
  canComment: boolean;
  canApprove: boolean;
  canInvite: boolean;
  canDelete: boolean;

  // Specific permissions
  specificPermissions: string[];
  temporaryPermissions: TemporaryPermission[];
}

export interface TemporaryPermission {
  permission: string;
  grantedBy: string;
  grantedAt: Date;
  expiresAt: Date;
  reason: string;
}

export interface CollaboratorContribution {
  type: ContributionType;
  timestamp: Date;
  description: string;
  impact: ContributionImpact;
}

export type ContributionType =
  | 'content_added'
  | 'content_edited'
  | 'comment_added'
  | 'file_uploaded'
  | 'approval_given'
  | 'issue_resolved'
  | 'meeting_organized';

export type ContributionImpact = 'minor' | 'moderate' | 'significant' | 'major';

export interface CollaboratorActivity {
  type: ActivityType;
  description: string;
  startTime: Date;
  data?: any;
}

export type ActivityType =
  | 'viewing'
  | 'editing'
  | 'commenting'
  | 'reviewing'
  | 'uploading'
  | 'organizing';

export interface CollaboratorNotifications {
  mentions: boolean;
  comments: boolean;
  updates: boolean;
  approvals: boolean;
  deadlines: boolean;

  // Frequency
  frequency: NotificationFrequency;
  methods: NotificationMethod[];
}

export type NotificationMethod = 'email' | 'push' | 'sms' | 'slack';

export interface CollaboratorDisplaySettings {
  showPresence: boolean;
  showContributions: boolean;
  compactView: boolean;
  theme: 'light' | 'dark' | 'auto';

  // Customization
  avatar?: string;
  displayName?: string;
  statusMessage?: string;
}

export interface SectionActivity {
  id: string;
  type: SectionActivityType;
  userId: string;
  timestamp: Date;
  description: string;

  // Context
  changes?: ActivityChange[];
  metadata?: ActivityMetadata;

  // Visibility
  isPublic: boolean;
  mentions: string[];

  // Relations
  relatedItems: string[];
  parentActivity?: string;
}

export type SectionActivityType =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'commented'
  | 'approved'
  | 'shared'
  | 'exported'
  | 'imported'
  | 'archived'
  | 'restored';

export interface ActivityChange {
  field: string;
  oldValue: any;
  newValue: any;
  changeType: ChangeType;
}

export type ChangeType = 'added' | 'modified' | 'removed' | 'moved' | 'renamed';

export interface ActivityMetadata {
  source: string;
  userAgent?: string;
  ipAddress?: string;
  location?: string;

  // Context
  sessionId?: string;
  requestId?: string;

  // Performance
  duration?: number;
  size?: number;
}

export interface SectionSettings {
  // Display settings
  layout: SectionLayout;
  viewMode: ViewMode;
  sortBy: SortOption;
  filterOptions: FilterOption[];

  // Collaboration settings
  allowComments: boolean;
  requireApproval: boolean;
  enableVersioning: boolean;
  autoSave: boolean;

  // Access settings
  visibility: SectionVisibility;
  accessControl: SectionAccessControl;

  // Integration settings
  integrations: SectionIntegration[];
  webhooks: WebhookConfig[];

  // Customization
  customFields: CustomField[];
  templates: TemplateConfig[];
}

export type SectionLayout =
  | 'list'
  | 'grid'
  | 'kanban'
  | 'timeline'
  | 'calendar'
  | 'table'
  | 'gallery';

export type ViewMode =
  | 'compact'
  | 'comfortable'
  | 'detailed'
  | 'card'
  | 'thumbnail';

export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
  priority: number;
}

export interface FilterOption {
  field: string;
  operator: FilterOperator;
  value: any;
  enabled: boolean;
}

export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'between'
  | 'in'
  | 'not_in';

export type SectionVisibility =
  | 'public'
  | 'private'
  | 'restricted'
  | 'invite_only';

export interface SectionIntegration {
  name: string;
  type: IntegrationType;
  enabled: boolean;
  configuration: IntegrationConfig;
  lastSync?: Date;
  syncStatus: SyncStatus;
}

export type IntegrationType =
  | 'calendar'
  | 'email'
  | 'storage'
  | 'crm'
  | 'payment'
  | 'social_media'
  | 'analytics';

export interface IntegrationConfig {
  apiKey?: string;
  endpoint?: string;
  settings: Record<string, any>;
  mappings: FieldMapping[];
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transformation?: DataTransformation;
}

export interface DataTransformation {
  type: TransformationType;
  parameters: any;
}

export type TransformationType =
  | 'format_date'
  | 'convert_currency'
  | 'normalize_text'
  | 'split_name'
  | 'combine_fields'
  | 'lookup_value';

export interface WebhookConfig {
  id: string;
  url: string;
  events: WebhookEvent[];
  secret?: string;
  enabled: boolean;

  // Retry configuration
  retryAttempts: number;
  retryDelay: number; // milliseconds
  timeout: number; // milliseconds

  // Status
  lastTriggered?: Date;
  successRate: number;
  failureCount: number;
}

export type WebhookEvent =
  | 'section_created'
  | 'section_updated'
  | 'section_deleted'
  | 'comment_added'
  | 'file_uploaded'
  | 'approval_given'
  | 'deadline_approaching';

export interface TemplateConfig {
  id: string;
  name: string;
  description?: string;
  template: SectionTemplate;
  category: TemplateCategory;

  // Usage
  usageCount: number;
  rating: number;
  reviews: TemplateReview[];

  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  version: string;
}

export type TemplateCategory =
  | 'planning'
  | 'coordination'
  | 'tracking'
  | 'communication'
  | 'documentation'
  | 'reporting';

export interface SectionTemplate {
  structure: TemplateStructure;
  defaultData: any;
  configuration: TemplateConfiguration;
}

export interface TemplateStructure {
  sections: TemplateSection[];
  relationships: TemplateRelationship[];
  rules: TemplateRule[];
}

export interface TemplateSection {
  id: string;
  name: string;
  type: SectionType;
  required: boolean;
  order: number;
  fields: TemplateField[];
}

export interface TemplateField {
  name: string;
  type: CustomFieldType;
  required: boolean;
  defaultValue?: any;
  validation?: FieldValidation;
  helpText?: string;
}

export interface TemplateRelationship {
  sourceSection: string;
  targetSection: string;
  type: RelationshipType;
  required: boolean;
}

export interface TemplateRule {
  condition: RuleCondition;
  action: RuleAction;
  priority: number;
}

export interface RuleCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
}

export interface RuleAction {
  type: ActionType;
  parameters: any;
}

export type ActionType =
  | 'show_field'
  | 'hide_field'
  | 'set_value'
  | 'validate_field'
  | 'send_notification'
  | 'create_task';

export interface TemplateConfiguration {
  customization: CustomizationOption[];
  branding: BrandingOption[];
  integrations: IntegrationOption[];
}

export interface CustomizationOption {
  name: string;
  type: 'color' | 'text' | 'image' | 'boolean' | 'select';
  value: any;
  options?: any[];
}

export interface BrandingOption {
  element: 'logo' | 'colors' | 'fonts' | 'layout';
  settings: any;
}

export interface IntegrationOption {
  service: string;
  enabled: boolean;
  configuration: any;
}

export interface TemplateReview {
  userId: string;
  rating: number;
  comment?: string;
  timestamp: Date;
  verified: boolean;
}

export interface SectionPermissions {
  // Basic permissions
  canView: boolean;
  canEdit: boolean;
  canComment: boolean;
  canShare: boolean;
  canDelete: boolean;

  // Advanced permissions
  canManageCollaborators: boolean;
  canChangePermissions: boolean;
  canExport: boolean;
  canIntegrate: boolean;

  // Role-based overrides
  roleOverrides: Record<WorkspaceRole, Partial<SectionPermissions>>;

  // User-specific overrides
  userOverrides: Record<string, Partial<SectionPermissions>>;

  // Conditional permissions
  conditions: PermissionCondition[];
}

export type SectionStatus =
  | 'draft'
  | 'active'
  | 'review'
  | 'approved'
  | 'archived'
  | 'deleted';

export interface SectionProgress {
  percentage: number;
  milestones: ProgressMilestone[];
  estimatedCompletion?: Date;

  // Tracking
  startDate?: Date;
  targetDate?: Date;
  completedTasks: number;
  totalTasks: number;

  // Quality metrics
  approvalRate: number;
  revisionCount: number;
  collaboratorSatisfaction: number;
}

export interface ProgressMilestone {
  id: string;
  name: string;
  description?: string;
  targetDate: Date;
  completedDate?: Date;
  status: MilestoneStatus;

  // Dependencies
  dependencies: string[];
  blockers: string[];

  // Metrics
  progress: number; // 0-1 scale
  quality: number; // 0-1 scale
  risk: RiskLevel;
}

export type MilestoneStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'overdue'
  | 'blocked'
  | 'cancelled';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type WorkspaceStatus = 'active' | 'paused' | 'archived' | 'deleted';

export type WorkspaceVisibility =
  | 'public'
  | 'unlisted'
  | 'private'
  | 'restricted';

export interface WorkspaceActivity {
  id: string;
  type: WorkspaceActivityType;
  userId: string;
  timestamp: Date;
  description: string;

  // Context
  sectionId?: string;
  resourceId?: string;
  metadata?: ActivityMetadata;

  // Impact
  impact: ActivityImpact;
  visibility: ActivityVisibility;

  // Relationships
  relatedActivities: string[];
  tags: string[];
}

export type WorkspaceActivityType =
  | 'workspace_created'
  | 'workspace_updated'
  | 'user_joined'
  | 'user_left'
  | 'section_created'
  | 'section_updated'
  | 'section_deleted'
  | 'resource_shared'
  | 'milestone_reached'
  | 'deadline_missed'
  | 'integration_connected'
  | 'backup_created';

export type ActivityImpact = 'minor' | 'moderate' | 'significant' | 'critical';

export type ActivityVisibility =
  | 'public'
  | 'participants'
  | 'admins'
  | 'system';
