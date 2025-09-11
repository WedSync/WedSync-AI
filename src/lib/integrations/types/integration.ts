/**
 * WS-342 Real-Time Wedding Collaboration - Integration Types
 * Team C: Integration & System Architecture
 */

export type VendorSystemType =
  | 'photography_crm' // Tave, Studio Ninja, Sprout Studio
  | 'venue_management' // Event Temple, Planning Pod
  | 'catering_system' // CaterTrax, Gather
  | 'florist_software' // Flowermate, Team Flower
  | 'wedding_planning' // Aisle Planner, WeddingWire, HoneyBook
  | 'booking_system' // Acuity, Calendly
  | 'payment_processor' // Stripe, Square, PayPal
  | 'communication' // Slack, Microsoft Teams
  | 'calendar_system'; // Google Calendar, Outlook

export type CRMType =
  | 'tave'
  | 'studio_ninja'
  | 'sprout_studio'
  | 'honeybook'
  | 'dubsado'
  | 'seventeen_hats'
  | 'pixieset'
  | 'shootq'
  | 'iris_works';

export type CalendarType =
  | 'google_calendar'
  | 'outlook_calendar'
  | 'apple_calendar'
  | 'ical'
  | 'vendor_calendar'
  | 'crm_calendar';

export type CommunicationChannel =
  | 'wedsync_chat'
  | 'email'
  | 'sms'
  | 'slack'
  | 'teams'
  | 'whatsapp'
  | 'vendor_crm';

export type IntegrationEventType =
  | 'wedding_timeline_update'
  | 'vendor_status_change'
  | 'budget_modification'
  | 'guest_list_update'
  | 'payment_status_change'
  | 'communication_sent'
  | 'document_shared'
  | 'calendar_event_created'
  | 'emergency_notification';

export type EventPriority =
  | 'low'
  | 'normal'
  | 'high'
  | 'critical'
  | 'emergency';

export type WeddingRole =
  | 'couple'
  | 'photographer'
  | 'venue'
  | 'planner'
  | 'caterer'
  | 'florist'
  | 'coordinator';

export type WeddingMessageType =
  | 'timeline_update'
  | 'status_update'
  | 'emergency_alert'
  | 'payment_reminder'
  | 'vendor_coordination'
  | 'guest_update';

export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';

export type WeddingEventCategory =
  | 'ceremony'
  | 'reception'
  | 'rehearsal'
  | 'vendor_setup'
  | 'vendor_breakdown'
  | 'photography'
  | 'catering'
  | 'music_entertainment';

export type ConflictResolutionStrategy =
  | 'wedsync_priority'
  | 'vendor_priority'
  | 'manual_resolution'
  | 'latest_wins'
  | 'merge_changes';

export interface VendorSystemConfig {
  systemType: VendorSystemType;
  credentials: Record<string, string>;
  configuration: Record<string, any>;
  webhookEndpoints?: WebhookConfig[];
  dataMapping?: DataMappingRules;
}

export interface VendorAPIConfig {
  baseUrl: string;
  apiVersion: string;
  authMethod: 'oauth2' | 'api_key' | 'token' | 'basic';
  rateLimits: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  timeout: number;
}

export interface WebhookConfig {
  endpoint: string;
  events: string[];
  secret: string;
  retryAttempts: number;
}

export interface DataMappingRules {
  fieldMappings: Record<string, string>;
  transformations: DataTransformation[];
  validationRules: ValidationRule[];
}

export interface DataTransformation {
  field: string;
  transformer: string;
  parameters?: Record<string, any>;
}

export interface ValidationRule {
  field: string;
  rules: string[];
  required: boolean;
}

export interface IntegrationResult {
  success: boolean;
  integrationId?: string;
  error?: string;
  capabilities?: string[];
}

export interface SyncResult {
  success: boolean;
  syncedRecords: number;
  conflicts?: IntegrationConflict[];
  errors?: SyncError[];
  duration: number;
}

export interface BroadcastResult {
  success: boolean;
  targetSystem: string;
  deliveryStatus: 'delivered' | 'failed' | 'pending';
  error?: string;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  expiresAt?: Date;
  error?: string;
}

export interface VendorData {
  systemId: string;
  dataType: string;
  records: Record<string, any>[];
  lastModified: Date;
  version: string;
}

export interface PushResult {
  success: boolean;
  recordsUpdated: number;
  recordsCreated: number;
  errors?: PushError[];
}

export interface PushError {
  recordId: string;
  error: string;
  retryable: boolean;
}

export interface SyncError {
  type: 'validation' | 'transformation' | 'conflict' | 'network';
  message: string;
  field?: string;
  value?: any;
  retryable: boolean;
}

export interface SubscriptionResult {
  success: boolean;
  subscriptionId?: string;
  error?: string;
}

export interface UpdateCallback {
  (update: VendorSystemUpdate): Promise<void>;
}

export interface VendorSystemUpdate {
  systemId: string;
  updateType: string;
  data: any;
  timestamp: Date;
}

export interface DataQuery {
  type: string;
  filters?: Record<string, any>;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IntegrationEvent {
  id: string;
  sourceSystem: string;
  targetSystems: string[];
  eventType: IntegrationEventType;
  weddingId: string;
  data: any;
  timestamp: Date;
  priority: EventPriority;

  // Wedding context
  weddingDate: Date;
  isWeddingDay: boolean;
  affectedVendors: string[];
}

export interface IntegrationConflict {
  id: string;
  weddingId: string;
  conflictType: ConflictType;
  sourceSystem: string;
  targetSystem: string;
  conflictingData: {
    source: any;
    target: any;
  };
  resolution?: ConflictResolution;
  status: 'pending' | 'resolved' | 'escalated';
  createdAt: Date;
}

export interface ConflictResolution {
  strategy: ConflictResolutionStrategy;
  resolvedData: any;
  resolvedBy: 'system' | 'user';
  resolvedAt: Date;
  notes?: string;
}

export type ConflictType =
  | 'data_mismatch'
  | 'timing_conflict'
  | 'permission_conflict'
  | 'validation_failure'
  | 'business_rule_violation';

export interface WeddingCollaborationEvent {
  id: string;
  weddingId: string;
  eventType: IntegrationEventType;
  data: any;
  priority: EventPriority;
  timestamp: Date;
  initiatedBy: string;
  affectedSystems: string[];
}

export interface SystemEndpoint {
  systemId: string;
  systemType: VendorSystemType;
  endpoint: string;
  credentials: Record<string, string>;
}

export interface DataMapping {
  sourceField: string;
  targetField: string;
  transformation?: string;
  required: boolean;
}

export interface DataFlow {
  id: string;
  source: SystemEndpoint;
  target: SystemEndpoint;
  mapping: DataMapping[];
  status: 'active' | 'paused' | 'error';
  lastSync: Date;
  syncFrequency: number; // minutes
}

export interface DataFlowStatus {
  flowId: string;
  status: 'healthy' | 'warning' | 'error';
  lastSync: Date;
  recordsProcessed: number;
  errors: DataFlowError[];
}

export interface DataFlowError {
  timestamp: Date;
  error: string;
  severity: 'low' | 'medium' | 'high';
  resolved: boolean;
}

export interface OptimizationResult {
  optimizedFlows: number;
  performanceGain: number;
  recommendedChanges: OptimizationRecommendation[];
}

export interface OptimizationRecommendation {
  type: 'route_change' | 'frequency_adjustment' | 'mapping_optimization';
  description: string;
  impact: 'low' | 'medium' | 'high';
}

// Wedding-specific interfaces
export interface WeddingDetails {
  id: string;
  coupleNames: string[];
  weddingDate: Date;
  venue: string;
  vendors: WeddingVendor[];
  timeline: WeddingTimeline;
  budget: WeddingBudget;
}

export interface WeddingVendor {
  id: string;
  type: VendorSystemType;
  name: string;
  contactInfo: ContactInfo;
  systemIntegrations: string[];
}

export interface ContactInfo {
  name: string;
  email: string;
  phone: string;
  role: WeddingRole;
}

export interface WeddingTimeline {
  events: WeddingTimelineEvent[];
  lastModified: Date;
  version: number;
}

export interface WeddingTimelineEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  description: string;
  category: WeddingEventCategory;
  attendees?: ContactInfo[];
  location?: string;
  externalId?: string; // For calendar integration
  vendorId?: string;
}

export interface WeddingBudget {
  totalBudget: number;
  allocatedBudget: number;
  spentAmount: number;
  categories: BudgetCategory[];
}

export interface BudgetCategory {
  category: string;
  budgeted: number;
  spent: number;
  vendor?: string;
}

export interface WeddingStatus {
  status: 'planning' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  lastUpdated: Date;
  updatedBy: string;
}
