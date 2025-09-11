/**
 * WS-342 Real-Time Wedding Collaboration - Events Types
 * Team B Backend Development - Event streaming and processing
 */

import {
  CollaborationEvent,
  VectorClock,
  EventCausality,
} from './collaboration';

// Event Processing and Streaming
export interface EventProcessor {
  processEvent(event: CollaborationEvent): Promise<ProcessingResult>;
  validateEvent(event: CollaborationEvent): Promise<ValidationResult>;
  enrichEvent(event: CollaborationEvent): Promise<CollaborationEvent>;
  routeEvent(event: CollaborationEvent): Promise<RoutingResult>;
}

export interface ProcessingResult {
  eventId: string;
  status: ProcessingStatus;
  processingTime: number;
  warnings: string[];
  errors: string[];
  nextActions: EventAction[];
}

export type ProcessingStatus =
  | 'success'
  | 'warning'
  | 'error'
  | 'retry'
  | 'dropped';

export interface ValidationResult {
  isValid: boolean;
  violations: ValidationViolation[];
  correctedEvent?: CollaborationEvent;
}

export interface ValidationViolation {
  field: string;
  violation: ViolationType;
  message: string;
  severity: ViolationSeverity;
}

export type ViolationType =
  | 'missing_required'
  | 'invalid_format'
  | 'permission_denied'
  | 'business_rule_violation'
  | 'temporal_inconsistency'
  | 'data_integrity_violation';

export type ViolationSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface RoutingResult {
  eventId: string;
  destinations: EventDestination[];
  deliveryMethod: DeliveryMethod;
  estimatedDeliveryTime: number;
}

export interface EventDestination {
  type: DestinationType;
  target: string;
  priority: DeliveryPriority;
  retryPolicy: RetryPolicy;
}

export type DestinationType =
  | 'websocket_room'
  | 'user_direct'
  | 'webhook'
  | 'email'
  | 'sms'
  | 'push_notification'
  | 'external_system';

export type DeliveryMethod =
  | 'immediate'
  | 'batched'
  | 'scheduled'
  | 'conditional';

export type DeliveryPriority =
  | 'low'
  | 'normal'
  | 'high'
  | 'critical'
  | 'emergency';

export interface RetryPolicy {
  maxRetries: number;
  backoffStrategy: BackoffStrategy;
  retryIntervals: number[];
  failureHandling: FailureHandling;
}

export type BackoffStrategy = 'linear' | 'exponential' | 'fibonacci' | 'custom';
export type FailureHandling =
  | 'drop'
  | 'dead_letter'
  | 'manual_review'
  | 'escalate';

// Wedding-specific event types
export interface WeddingTimelineEvent extends CollaborationEvent {
  timelineData: {
    milestoneId: string;
    originalTime: Date;
    newTime: Date;
    reason: string;
    impactedItems: string[];
    cascadingChanges: TimelineChange[];
  };
}

export interface TimelineChange {
  itemId: string;
  itemType: TimelineItemType;
  oldTime: Date;
  newTime: Date;
  autoAdjusted: boolean;
  requiresApproval: boolean;
}

export type TimelineItemType =
  | 'ceremony'
  | 'reception'
  | 'photography'
  | 'catering'
  | 'music'
  | 'transport'
  | 'vendor_setup'
  | 'vendor_breakdown'
  | 'milestone';

export interface BudgetChangeEvent extends CollaborationEvent {
  budgetData: {
    categoryId: string;
    categoryName: string;
    oldAmount: number;
    newAmount: number;
    reason: string;
    approvalRequired: boolean;
    impactedVendors: string[];
    remainingBudget: number;
  };
}

export interface VendorAssignmentEvent extends CollaborationEvent {
  vendorData: {
    vendorId: string;
    vendorType: VendorType;
    action: VendorAction;
    contractStatus: ContractStatus;
    assignmentDetails: VendorAssignment;
  };
}

export type VendorType =
  | 'photographer'
  | 'venue'
  | 'catering'
  | 'florist'
  | 'music_dj'
  | 'music_band'
  | 'transport'
  | 'officiant'
  | 'makeup'
  | 'hair'
  | 'videographer'
  | 'wedding_planner'
  | 'decorator';

export type VendorAction =
  | 'assigned'
  | 'unassigned'
  | 'contract_signed'
  | 'payment_made'
  | 'service_updated'
  | 'availability_changed'
  | 'emergency_replacement';

export type ContractStatus =
  | 'inquiry'
  | 'quote_requested'
  | 'quote_received'
  | 'contract_draft'
  | 'contract_signed'
  | 'deposit_paid'
  | 'final_payment'
  | 'service_complete'
  | 'cancelled';

export interface VendorAssignment {
  services: string[];
  startTime: Date;
  endTime: Date;
  location: string;
  specialRequirements: string[];
  contactPerson: ContactPerson;
}

export interface ContactPerson {
  name: string;
  phone: string;
  email: string;
  role: string;
  emergencyContact: boolean;
}

export interface GuestUpdateEvent extends CollaborationEvent {
  guestData: {
    guestId: string;
    action: GuestAction;
    guestInfo: GuestInfo;
    rsvpData?: RsvpData;
    seatingAssignment?: SeatingAssignment;
  };
}

export type GuestAction =
  | 'added'
  | 'removed'
  | 'updated'
  | 'rsvp_received'
  | 'rsvp_changed'
  | 'seating_assigned'
  | 'dietary_requirements_updated'
  | 'plus_one_added';

export interface GuestInfo {
  name: string;
  email?: string;
  phone?: string;
  relationship: GuestRelationship;
  invitationGroup: string;
  specialNeeds: string[];
}

export type GuestRelationship =
  | 'bride_family'
  | 'groom_family'
  | 'bride_friend'
  | 'groom_friend'
  | 'colleague'
  | 'vendor'
  | 'plus_one';

export interface RsvpData {
  status: RsvpStatus;
  responseDate: Date;
  attendeeCount: number;
  dietaryRequirements: string[];
  specialRequests: string[];
  accomodationNeeded: boolean;
}

export type RsvpStatus =
  | 'pending'
  | 'attending'
  | 'not_attending'
  | 'tentative';

export interface SeatingAssignment {
  tableId: string;
  tableName: string;
  seatNumber?: number;
  specialAccommodations: string[];
}

// Event Actions and Workflows
export interface EventAction {
  id: string;
  type: ActionType;
  description: string;
  targetEntity: string;
  parameters: Record<string, any>;
  scheduledFor?: Date;
  dependencies: string[];
  priority: ActionPriority;
}

export type ActionType =
  | 'notify_user'
  | 'send_email'
  | 'update_timeline'
  | 'create_task'
  | 'trigger_workflow'
  | 'sync_calendar'
  | 'generate_report'
  | 'escalate_issue'
  | 'auto_resolve'
  | 'request_approval';

export type ActionPriority = 'low' | 'normal' | 'high' | 'urgent' | 'immediate';

export interface EventWorkflow {
  id: string;
  name: string;
  triggers: WorkflowTrigger[];
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  errorHandling: ErrorHandlingStrategy;
}

export interface WorkflowTrigger {
  eventType: string;
  conditions: TriggerCondition[];
  cooldownPeriod?: number;
}

export interface TriggerCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
  caseSensitive?: boolean;
}

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'in_range'
  | 'regex_match';

export interface WorkflowCondition {
  logic: LogicOperator;
  conditions: TriggerCondition[];
}

export type LogicOperator = 'and' | 'or' | 'not';

export interface WorkflowAction {
  type: ActionType;
  parameters: Record<string, any>;
  retryPolicy: RetryPolicy;
  onSuccess?: WorkflowAction[];
  onFailure?: WorkflowAction[];
}

export interface ErrorHandlingStrategy {
  onValidationError: ErrorAction;
  onProcessingError: ErrorAction;
  onDeliveryError: ErrorAction;
  onTimeout: ErrorAction;
}

export type ErrorAction =
  | 'retry'
  | 'skip'
  | 'escalate'
  | 'fallback'
  | 'dead_letter'
  | 'manual_intervention';

// Event Analytics and Monitoring
export interface EventAnalytics {
  totalEvents: number;
  eventsByType: Map<string, number>;
  averageProcessingTime: number;
  errorRate: number;
  peakEventTimes: Date[];
  userEngagementMetrics: EngagementMetric[];
}

export interface EngagementMetric {
  userId: string;
  eventsGenerated: number;
  eventsConsumed: number;
  averageResponseTime: number;
  collaborationScore: number;
}

export interface EventStream {
  id: string;
  name: string;
  events: CollaborationEvent[];
  subscribers: StreamSubscriber[];
  filters: EventFilter[];
  retention: RetentionPolicy;
}

export interface StreamSubscriber {
  id: string;
  type: SubscriberType;
  endpoint: string;
  filters: EventFilter[];
  lastProcessed: Date;
  status: SubscriberStatus;
}

export type SubscriberType =
  | 'websocket'
  | 'webhook'
  | 'email'
  | 'sms'
  | 'internal_service'
  | 'external_api';

export type SubscriberStatus = 'active' | 'paused' | 'error' | 'disabled';

export interface EventFilter {
  field: string;
  operator: ConditionOperator;
  value: any;
  include: boolean;
}

export interface RetentionPolicy {
  maxAge: number; // days
  maxEvents: number;
  archiveAfter: number; // days
  deleteAfter: number; // days
  compressionEnabled: boolean;
}
