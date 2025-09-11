/**
 * WS-334 Team B: Backend Notification Engine Infrastructure
 * Core TypeScript Interfaces for Wedding Notification System
 */

// Base Event Types
export type NotificationEventType =
  | 'payment_received'
  | 'timeline_change'
  | 'weather_alert'
  | 'vendor_update'
  | 'emergency'
  | 'milestone'
  | 'booking_confirmation'
  | 'contract_signed'
  | 'invoice_sent'
  | 'deadline_approaching';

export type NotificationChannel =
  | 'email'
  | 'sms'
  | 'push'
  | 'in_app'
  | 'webhook'
  | 'phone_call';

export type EventPriority = 'critical' | 'high' | 'medium' | 'low';
export type NotificationPriority = 'critical' | 'high' | 'medium' | 'low';
export type DeliveryStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'expired'
  | 'cancelled';

// Core Notification Engine Interface
export interface NotificationEngineBackend {
  processNotificationEvent(event: NotificationEvent): Promise<ProcessingResult>;
  routeNotification(
    notification: ProcessedNotification,
  ): Promise<RoutingResult>;
  deliverNotification(delivery: NotificationDelivery): Promise<DeliveryResult>;
  handleEscalation(escalation: EscalationRule): Promise<EscalationResult>;
  trackDeliveryStatus(trackingId: string): Promise<DeliveryStatus>;
}

// Event Structures
export interface NotificationEvent {
  eventId: string;
  eventType: NotificationEventType;
  sourceSystem: string;
  timestamp: Date;
  priority: EventPriority;
  payload: EventPayload;
  targetAudience: TargetAudience;
  weddingContext?: WeddingContext;
  escalationRules: EscalationRule[];
  metadata?: EventMetadata;
}

export interface EventPayload {
  title: string;
  description: string;
  data: Record<string, any>;
  actionRequired?: boolean;
  deadline?: Date;
  escalationInfo?: EscalationInfo;
}

export interface TargetAudience {
  suppliers?: string[];
  clients?: string[];
  admins?: string[];
  planners?: string[];
  venues?: string[];
}

export interface WeddingContext {
  weddingId: string;
  weddingDate: string;
  clientId: string;
  vendorIds: string[];
  venue?: VenueInfo;
  isOutdoor?: boolean;
  daysToWedding?: number;
  isWeddingWeek?: boolean;
  isWeddingDay?: boolean;
  seasonalContext?: SeasonalContext;
  weddingDetails?: WeddingDetails;
  vendorDetails?: VendorDetails[];
  clientDetails?: ClientDetails;
}

export interface VenueInfo {
  venueId: string;
  name: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  capacity: number;
  isOutdoor: boolean;
}

export interface SeasonalContext {
  season: 'spring' | 'summer' | 'fall' | 'winter';
  isPeakSeason: boolean;
  weatherRisk: 'low' | 'medium' | 'high';
}

// Processed Notification Structure
export interface ProcessedNotification {
  notificationId: string;
  originalEventId: string;
  type: NotificationType;
  priority: NotificationPriority;
  channel: NotificationChannel[];
  recipients: NotificationRecipient[];
  content: NotificationContent;
  deliverySchedule: DeliverySchedule;
  trackingEnabled: boolean;
  retryPolicy: RetryPolicy;
  weddingContext?: WeddingContext;
  businessRules?: BusinessRule[];
}

export type NotificationType =
  | 'alert'
  | 'reminder'
  | 'confirmation'
  | 'emergency'
  | 'update'
  | 'invitation';

export interface NotificationRecipient {
  id: string;
  type: 'supplier' | 'client' | 'admin' | 'planner' | 'venue';
  contactInfo: ContactInfo;
  preferences: NotificationPreferences;
  timezone?: string;
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  pushTokens?: string[];
  webhookUrl?: string;
  name: string;
  role: string;
}

export interface NotificationPreferences {
  channels: {
    email: boolean;
    sms: boolean;
    push: boolean;
    inApp: boolean;
    webhook: boolean;
    phoneCall: boolean;
  };
  quietHours?: {
    start: string; // HH:mm format
    end: string;
  };
  urgencyThreshold: EventPriority;
  autoEscalation: boolean;
}

export interface NotificationContent {
  title: string;
  message: string;
  htmlMessage?: string;
  actionRequired: boolean;
  actions?: NotificationAction[];
  metadata?: ContentMetadata;
  resolutionOptions?: ResolutionOption[];
}

export interface NotificationAction {
  id: string;
  label: string;
  url?: string;
  type: 'link' | 'button' | 'callback';
  primary?: boolean;
}

export interface DeliverySchedule {
  scheduledAt: Date;
  maxDeliveryTime?: Date;
  optimalDeliveryWindow?: {
    start: Date;
    end: Date;
  };
  timezone?: string;
}

export interface RetryPolicy {
  maxRetries: number;
  retryInterval: number;
  backoffMultiplier?: number;
  escalateOnFailure: boolean;
}

// Delivery Structure
export interface NotificationDelivery {
  deliveryId: string;
  notificationId: string;
  channel: NotificationChannel;
  recipient: NotificationRecipient;
  content: ChannelSpecificContent;
  scheduledFor: Date;
  maxRetries: number;
  currentAttempt: number;
  deliveryStatus: DeliveryStatus;
  providerMessageId?: string;
  deliveryMetadata?: DeliveryMetadata;
}

export interface ChannelSpecificContent {
  subject?: string; // For email
  body: string;
  htmlBody?: string;
  attachments?: Attachment[];
  templateId?: string;
  variables?: Record<string, any>;
}

export interface Attachment {
  filename: string;
  content: Buffer | string;
  contentType: string;
  size: number;
}

// Escalation System
export interface EscalationRule {
  ruleId: string;
  triggerConditions: TriggerCondition[];
  escalationActions: EscalationAction[];
  timeoutDuration: number;
  maxEscalationLevel: number;
  notificationOverrides: NotificationOverride[];
}

export interface TriggerCondition {
  type: 'no_acknowledgment' | 'delivery_failure' | 'time_threshold' | 'custom';
  timeoutMs?: number;
  failureCount?: number;
  customCondition?: string;
}

export interface EscalationAction {
  type:
    | 'phone_call'
    | 'sms_blast'
    | 'email_escalation'
    | 'admin_alert'
    | 'emergency_protocol';
  target: 'all_contacts' | 'emergency_contacts' | 'specific_users';
  userIds?: string[];
  message?: string;
  priority: EventPriority;
}

export interface NotificationOverride {
  channel: NotificationChannel;
  content: NotificationContent;
  recipients?: NotificationRecipient[];
}

// Wedding-Specific Processing
export interface WeddingNotificationProcessor {
  processWeddingEvent(event: WeddingEvent): Promise<WeddingNotificationResult>;
  calculateWeddingUrgency(
    event: WeddingEvent,
    context: WeddingContext,
  ): Promise<UrgencyScore>;
  applyWeddingBusinessRules(
    notification: ProcessedNotification,
  ): Promise<ProcessedNotification>;
  handleWeddingDayEmergency(
    emergency: WeddingEmergency,
  ): Promise<EmergencyResponse>;
  coordinateVendorNotifications(
    coordination: VendorCoordination,
  ): Promise<CoordinationResult>;
}

export interface WeddingEvent extends NotificationEvent {
  weddingContext: WeddingContext; // Required for wedding events
  impactLevel: 'minor' | 'moderate' | 'major' | 'critical';
  affectedServices?: string[];
}

export interface UrgencyScore {
  score: number; // 1-10 scale
  factors: UrgencyFactor[];
  calculatedAt: Date;
  explanation?: string;
}

export interface UrgencyFactor {
  factor: string;
  weight: number;
  score: number;
  description?: string;
}

export interface WeddingEmergency {
  emergencyId: string;
  eventId: string;
  weddingId: string;
  title: string;
  description: string;
  escalationInfo: EscalationInfo;
  severity: 1 | 2 | 3 | 4 | 5; // 5 being most severe
  location?: string;
  expectedResolutionTime?: number; // minutes
}

export interface EscalationInfo {
  level: number;
  escalatedAt: Date;
  escalatedBy: string;
  reason: string;
  nextEscalationLevel?: number;
  emergencyContacts: string[];
}

// Analytics and Tracking
export interface NotificationAnalytics {
  trackDeliveryMetrics(metrics: DeliveryMetrics): Promise<void>;
  generateDeliveryReport(timeframe: TimeRange): Promise<DeliveryReport>;
  analyzeNotificationEffectiveness(
    analysis: EffectivenessAnalysis,
  ): Promise<EffectivenessReport>;
  identifyDeliveryBottlenecks(): Promise<BottleneckReport>;
  predictNotificationLoad(prediction: LoadPrediction): Promise<LoadForecast>;
}

export interface DeliveryMetrics {
  notificationId: string;
  channel: NotificationChannel;
  deliveryStatus: DeliveryStatus;
  deliveryTime: number; // milliseconds
  attempts: number;
  cost?: number;
  engagement?: EngagementMetrics;
}

export interface EngagementMetrics {
  opened?: boolean;
  clicked?: boolean;
  replied?: boolean;
  acknowledged?: boolean;
  actionTaken?: boolean;
  timeToEngagement?: number; // milliseconds
}

export interface TimeRange {
  start: Date;
  end: Date;
  timezone?: string;
}

export interface DeliveryReport {
  timeframe: TimeRange;
  totalNotifications: number;
  deliveryRates: {
    [key in NotificationChannel]: {
      sent: number;
      delivered: number;
      failed: number;
      rate: number; // percentage
    };
  };
  averageDeliveryTime: number;
  emergencyMetrics: EmergencyMetrics;
  topFailureReasons: FailureReason[];
}

export interface EmergencyMetrics {
  totalEmergencies: number;
  averageResponseTime: number;
  escalationRate: number;
  resolutionRate: number;
}

export interface FailureReason {
  reason: string;
  count: number;
  percentage: number;
  channel?: NotificationChannel;
}

// Result Types
export interface ProcessingResult {
  eventId: string;
  notificationId: string | null;
  status: 'processed' | 'failed' | 'ignored' | 'emergency_processed';
  processingTime: number;
  queuedFor?: Date;
  errorMessage?: string;
  affectedWeddingsCount?: number;
}

export interface RoutingResult {
  notificationId: string;
  routingResults: ChannelRoutingResult[];
  overallStatus: 'success' | 'partial_failure' | 'complete_failure';
}

export interface ChannelRoutingResult {
  channel: NotificationChannel;
  status: 'scheduled' | 'failed';
  deliveryId?: string;
  errorMessage?: string;
  scheduledFor?: Date;
}

export interface DeliveryResult {
  deliveryId: string;
  status: DeliveryStatus;
  deliveryTime: number;
  providerMessageId?: string;
  metadata?: DeliveryMetadata;
  retryScheduled?: boolean;
  nextRetryAt?: Date;
}

export interface EscalationResult {
  escalationId: string;
  level: number;
  actionsTriggered: string[];
  nextEscalationAt?: Date;
  status: 'initiated' | 'completed' | 'failed';
}

export interface EmergencyResponse {
  emergencyId: string;
  notificationId: string;
  status: 'initiated' | 'escalated' | 'resolved';
  expectedDelivery: Date;
  maxDeliveryTime?: Date;
  escalationScheduled: boolean;
  contactsNotified: number;
}

// Enhanced Types for Wedding Intelligence
export interface WeddingNotificationResult {
  eventId: string;
  weddingId: string;
  impactAnalysis: EventImpactAnalysis;
  generatedNotifications: ProcessedNotification[];
  coordinationActions: CoordinationAction[];
}

export interface EventImpactAnalysis {
  eventId: string;
  overallSeverity: number; // 1-10 scale
  impacts: ImpactArea[];
  affectedParties: AffectedParty[];
  recommendedActions: RecommendedAction[];
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface ImpactArea {
  area: 'timeline' | 'budget' | 'vendors' | 'weather' | 'logistics';
  severity: number; // 1-10
  description: string;
  affectedElements: string[];
}

export interface AffectedParty {
  type: 'couple' | 'vendor' | 'venue' | 'planner' | 'guest';
  id: string;
  name: string;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  requiredActions: string[];
}

export interface RecommendedAction {
  id: string;
  description: string;
  priority: EventPriority;
  deadline?: Date;
  assignedTo?: string;
  estimatedDuration?: number; // minutes
}

export interface VendorCoordination {
  weddingId: string;
  coordinationType: 'timeline_sync' | 'emergency_response' | 'update_cascade';
  vendorIds: string[];
  message: string;
  requiresResponse: boolean;
  deadline?: Date;
}

export interface CoordinationResult {
  coordinationId: string;
  notificationsCreated: number;
  vendorsContacted: number;
  expectedResponses: number;
  coordinationDeadline?: Date;
}

export interface CoordinationAction {
  id: string;
  type:
    | 'notify_vendor'
    | 'update_timeline'
    | 'escalate_issue'
    | 'coordinate_response';
  target: string;
  message: string;
  deadline?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

// Extended Types for Conflict Resolution
export interface TimelineConflict {
  conflictId: string;
  weddingId: string;
  conflictType:
    | 'double_booking'
    | 'vendor_unavailable'
    | 'venue_conflict'
    | 'weather_impact';
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  affectedParties: AffectedParty[];
  conflictDetails: ConflictDetails;
  proposedResolutions?: ResolutionOption[];
}

export interface ConflictDetails {
  originalSchedule: ScheduleItem[];
  conflictingSchedule: ScheduleItem[];
  conflictWindow: {
    start: Date;
    end: Date;
  };
  impactedServices: string[];
}

export interface ScheduleItem {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  vendor?: string;
  location?: string;
  priority: EventPriority;
}

export interface ResolutionOption {
  id: string;
  title: string;
  description: string;
  pros: string[];
  cons: string[];
  estimatedCost?: number;
  timeRequirement?: number; // minutes
  approvalRequired?: string[]; // user IDs who need to approve
}

export interface ConflictResolutionResult {
  conflictId: string;
  analysis: ConflictAnalysis;
  notificationsSent: number;
  resolutionOptions: ResolutionOption[];
  resolutionDeadline: Date;
  processingTime: number;
}

export interface ConflictAnalysis {
  severity: number; // 1-10
  impactRadius: number; // how many other events affected
  timeToResolve: number; // estimated minutes
  stakeholderCount: number;
  resolutionComplexity: 'simple' | 'moderate' | 'complex' | 'critical';
}

// Weather Event Types
export interface WeatherEvent extends NotificationEvent {
  payload: WeatherEventPayload;
}

export interface WeatherEventPayload extends EventPayload {
  severity: number; // 1-10 scale
  location: {
    lat: number;
    lng: number;
    radius: number; // km
  };
  effectiveDate: Date;
  weatherType:
    | 'rain'
    | 'snow'
    | 'wind'
    | 'storm'
    | 'extreme_heat'
    | 'extreme_cold';
  forecast: WeatherForecast[];
}

export interface WeatherForecast {
  datetime: Date;
  temperature: number;
  precipitation: number;
  windSpeed: number;
  conditions: string;
  severity: number;
}

// Enhanced Event Types
export interface PaymentEvent extends NotificationEvent {
  payload: PaymentEventPayload;
}

export interface PaymentEventPayload extends EventPayload {
  amount: number;
  currency: string;
  paymentMethod: string;
  invoiceId: string;
  supplierId: string;
  weddingId: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
}

export interface VendorEvent extends NotificationEvent {
  payload: VendorEventPayload;
}

export interface VendorEventPayload extends EventPayload {
  vendorId: string;
  vendorType: string;
  actionType:
    | 'status_update'
    | 'availability_change'
    | 'cancellation'
    | 'new_booking';
  weddingId: string;
  impactedServices: string[];
}

export interface TimelineEvent extends NotificationEvent {
  payload: TimelineEventPayload;
}

export interface TimelineEventPayload extends EventPayload {
  weddingId: string;
  changeType: 'addition' | 'modification' | 'deletion' | 'conflict';
  affectedTimeSlots: TimeSlot[];
  previousState?: TimeSlot[];
}

export interface TimeSlot {
  id: string;
  startTime: Date;
  endTime: Date;
  activity: string;
  vendor?: string;
  location?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
}

export interface EmergencyEvent extends NotificationEvent {
  payload: EmergencyEventPayload;
  priority: 'critical'; // Always critical
}

export interface EmergencyEventPayload extends EventPayload {
  emergencyType:
    | 'venue_emergency'
    | 'vendor_cancellation'
    | 'weather_emergency'
    | 'health_emergency'
    | 'security_issue';
  location?: string;
  immediateActions: string[];
  emergencyContacts: string[];
  estimatedImpact: 'minor' | 'moderate' | 'major' | 'severe';
}

// Enriched Event Types
export interface EnrichedNotificationEvent extends NotificationEvent {
  weddingContext: WeddingContext & {
    weddingDetails: WeddingDetails;
    vendorDetails: VendorDetails[];
    clientDetails: ClientDetails;
    daysToWedding: number;
    isWeddingWeek: boolean;
    isWeddingDay: boolean;
    seasonalContext: SeasonalContext;
  };
}

export interface WeddingDetails {
  weddingId: string;
  weddingDate: string;
  venue: VenueInfo;
  guestCount: number;
  budget: number;
  theme?: string;
  specialRequirements?: string[];
  timeline: TimeSlot[];
}

export interface VendorDetails {
  vendorId: string;
  name: string;
  type: string;
  services: string[];
  contact: ContactInfo;
  status: 'confirmed' | 'pending' | 'cancelled';
  timeline: TimeSlot[];
}

export interface ClientDetails {
  clientId: string;
  name: string;
  contact: ContactInfo;
  preferences: NotificationPreferences;
  weddingRole: 'bride' | 'groom' | 'partner' | 'parent' | 'planner';
}

// Metadata Types
export interface EventMetadata {
  source: string;
  version: string;
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface ContentMetadata {
  templateId?: string;
  templateVersion?: string;
  language?: string;
  personalization?: Record<string, any>;
  trackingPixel?: string;
  campaignId?: string;
}

export interface DeliveryMetadata {
  providerResponse?: any;
  deliveryAttempts: DeliveryAttempt[];
  totalCost?: number;
  executionTime: number;
  serverLocation?: string;
}

export interface DeliveryAttempt {
  attemptNumber: number;
  timestamp: Date;
  status: DeliveryStatus;
  errorCode?: string;
  errorMessage?: string;
  providerResponse?: any;
}

// Business Rule Types
export interface BusinessRule {
  ruleId: string;
  name: string;
  description: string;
  condition: RuleCondition;
  action: RuleAction;
  priority: number;
  active: boolean;
}

export interface RuleCondition {
  type:
    | 'wedding_proximity'
    | 'vendor_type'
    | 'event_type'
    | 'time_of_day'
    | 'custom';
  parameters: Record<string, any>;
  expression?: string; // for custom conditions
}

export interface RuleAction {
  type:
    | 'modify_priority'
    | 'add_channel'
    | 'remove_channel'
    | 'delay_delivery'
    | 'escalate'
    | 'suppress';
  parameters: Record<string, any>;
}

// Analytics Extended Types
export interface EffectivenessAnalysis {
  timeframe: TimeRange;
  segmentation: {
    by: 'channel' | 'event_type' | 'recipient_type' | 'priority';
    values?: string[];
  };
  metrics: string[]; // which metrics to analyze
}

export interface EffectivenessReport {
  analysis: EffectivenessAnalysis;
  results: EffectivenessMetric[];
  recommendations: EffectivenessRecommendation[];
  generatedAt: Date;
}

export interface EffectivenessMetric {
  segment: string;
  deliveryRate: number;
  engagementRate: number;
  responseRate: number;
  costPerDelivery: number;
  averageResponseTime: number;
  satisfactionScore?: number;
}

export interface EffectivenessRecommendation {
  id: string;
  type:
    | 'channel_optimization'
    | 'timing_adjustment'
    | 'content_improvement'
    | 'audience_segmentation';
  description: string;
  expectedImprovement: number; // percentage
  implementationEffort: 'low' | 'medium' | 'high';
  priority: EventPriority;
}

export interface BottleneckReport {
  identifiedBottlenecks: Bottleneck[];
  overallSystemHealth: number; // 1-10 scale
  recommendedActions: BottleneckRecommendation[];
  generatedAt: Date;
}

export interface Bottleneck {
  id: string;
  type:
    | 'processing_delay'
    | 'delivery_failure'
    | 'capacity_limit'
    | 'provider_issue';
  location: string; // system component
  severity: number; // 1-10
  impact: string;
  firstObserved: Date;
  frequency: number; // occurrences per hour
}

export interface BottleneckRecommendation {
  bottleneckId: string;
  recommendation: string;
  estimatedResolution: number; // hours
  resourcesRequired: string[];
  priority: EventPriority;
}

export interface LoadPrediction {
  predictionWindow: TimeRange;
  basedOnHistoricalData: boolean;
  seasonalAdjustments: boolean;
  expectedEvents: PredictedEvent[];
}

export interface PredictedEvent {
  eventType: NotificationEventType;
  expectedCount: number;
  peakTime: Date;
  confidence: number; // 0-1
}

export interface LoadForecast {
  prediction: LoadPrediction;
  forecastedLoad: LoadPoint[];
  capacityRecommendations: CapacityRecommendation[];
  alertThresholds: AlertThreshold[];
}

export interface LoadPoint {
  timestamp: Date;
  predictedVolume: number;
  confidence: number;
  requiredCapacity: number;
}

export interface CapacityRecommendation {
  timeframe: TimeRange;
  recommendedCapacity: number;
  currentCapacity: number;
  scalingRequired: boolean;
  estimatedCost?: number;
}

export interface AlertThreshold {
  metric: string;
  threshold: number;
  severity: EventPriority;
  action: string;
}

// Error Types
export class NotificationProcessingError extends Error {
  constructor(
    message: string,
    public cause?: Error,
  ) {
    super(message);
    this.name = 'NotificationProcessingError';
  }
}

export class DeliveryError extends Error {
  constructor(
    message: string,
    public cause?: Error,
  ) {
    super(message);
    this.name = 'DeliveryError';
  }
}

export class EmergencyHandlingError extends Error {
  constructor(
    message: string,
    public cause?: Error,
  ) {
    super(message);
    this.name = 'EmergencyHandlingError';
  }
}

export class ConflictResolutionError extends Error {
  constructor(
    message: string,
    public cause?: Error,
  ) {
    super(message);
    this.name = 'ConflictResolutionError';
  }
}
