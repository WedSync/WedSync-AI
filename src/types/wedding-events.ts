/**
 * WS-334 Team B: Wedding-Specific Event Types
 * Extended event definitions for wedding industry contexts
 */

import {
  NotificationEvent,
  EventPayload,
  WeddingContext,
  EventPriority,
  NotificationEventType,
} from './notification-backend';

// Wedding Event Extensions
export interface WeddingSpecificEvent extends NotificationEvent {
  weddingId: string;
  weddingContext: WeddingContext;
  seasonalImpact: SeasonalImpact;
  vendorCoordination: VendorCoordinationNeeds;
  timelineImpact: TimelineImpact;
}

export interface SeasonalImpact {
  season: 'spring' | 'summer' | 'fall' | 'winter';
  peakSeason: boolean;
  weatherRisk: number; // 1-10 scale
  capacityConstraints: CapacityConstraint[];
  pricingModifiers: PricingModifier[];
}

export interface CapacityConstraint {
  type: 'vendor' | 'venue' | 'transportation' | 'accommodation';
  severity: number; // 1-10 scale
  affectedServices: string[];
  mitigation?: string[];
}

export interface PricingModifier {
  service: string;
  modifier: number; // multiplier (e.g., 1.5 for 50% increase)
  reason: string;
  validFrom: Date;
  validTo: Date;
}

export interface VendorCoordinationNeeds {
  primaryVendors: string[]; // vendor IDs that must be notified first
  dependentVendors: string[]; // vendors that depend on primary vendors
  coordinationTimeline: CoordinationTimeline[];
  escalationPath: EscalationPath[];
}

export interface CoordinationTimeline {
  phase: string;
  duration: number; // minutes
  requiredVendors: string[];
  parallelProcessing: boolean;
}

export interface EscalationPath {
  level: number;
  contact: string; // user ID or role
  timeoutMinutes: number;
  nextLevel?: number;
}

export interface TimelineImpact {
  criticalPath: string[]; // activity IDs that cannot be delayed
  bufferTime: number; // minutes of buffer available
  dependentActivities: ActivityDependency[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface ActivityDependency {
  activityId: string;
  dependsOn: string[];
  bufferTime: number; // minutes
  criticality: EventPriority;
}

// Specific Wedding Event Types
export interface VendorCancellationEvent extends WeddingSpecificEvent {
  eventType: 'vendor_update';
  payload: VendorCancellationPayload;
}

export interface VendorCancellationPayload extends EventPayload {
  vendorId: string;
  vendorType: string;
  cancellationReason: string;
  noticePeriod: number; // days
  replacementSuggestions: ReplacementSuggestion[];
  contractualImplications: ContractualImplication[];
  impactAssessment: ImpactAssessment;
}

export interface ReplacementSuggestion {
  vendorId: string;
  name: string;
  availability: boolean;
  priceDifference: number; // percentage change
  qualityRating: number; // 1-5 stars
  distance: number; // km from venue
}

export interface ContractualImplication {
  type: 'penalty' | 'refund' | 'renegotiation' | 'force_majeure';
  amount?: number;
  description: string;
  actionRequired: string[];
  deadline?: Date;
}

export interface ImpactAssessment {
  budgetImpact: number; // currency amount
  timelineImpact: number; // hours of delay
  qualityImpact: 'none' | 'minor' | 'moderate' | 'significant';
  alternativeOptions: number; // count of viable alternatives
  stressLevel: number; // 1-10 scale for couple stress
}

export interface WeatherAlertEvent extends WeddingSpecificEvent {
  eventType: 'weather_alert';
  payload: WeatherAlertPayload;
}

export interface WeatherAlertPayload extends EventPayload {
  weatherType: 'rain' | 'snow' | 'wind' | 'storm' | 'extreme_temperature';
  severity: number; // 1-10 scale
  probability: number; // 0-100%
  forecast: DetailedForecast[];
  contingencyPlan: ContingencyPlan;
  affectedOutdoorEvents: OutdoorEvent[];
  vendorPreparationNeeds: VendorPreparation[];
}

export interface DetailedForecast {
  time: Date;
  temperature: number;
  precipitation: number; // mm
  windSpeed: number; // km/h
  humidity: number; // percentage
  visibility: number; // km
  conditions: string;
}

export interface ContingencyPlan {
  planId: string;
  triggers: ContingencyTrigger[];
  actions: ContingencyAction[];
  costImplications: number;
  timelineChanges: TimelineChange[];
  approvalRequired: boolean;
}

export interface ContingencyTrigger {
  condition: string;
  threshold: number;
  unit: string;
  timeframe: number; // hours before wedding
}

export interface ContingencyAction {
  actionId: string;
  description: string;
  vendor?: string;
  cost?: number;
  timeRequired: number; // minutes
  dependencies: string[]; // other action IDs
}

export interface OutdoorEvent {
  eventId: string;
  name: string;
  startTime: Date;
  duration: number; // minutes
  location: string;
  criticalToWedding: boolean;
  indoorAlternative?: IndoorAlternative;
}

export interface IndoorAlternative {
  location: string;
  capacity: number;
  additionalCost: number;
  setup_time: number; // minutes
  availability: boolean;
}

export interface VendorPreparation {
  vendorId: string;
  preparations: Preparation[];
  equipment: Equipment[];
  timeline: PreparationTimeline[];
}

export interface Preparation {
  task: string;
  timeRequired: number; // minutes
  dependencies: string[];
  cost?: number;
}

export interface Equipment {
  item: string;
  quantity: number;
  source: 'owned' | 'rental' | 'purchase';
  cost?: number;
  deliveryTime?: number; // hours
}

export interface PreparationTimeline {
  milestone: string;
  deadline: Date;
  responsible: string; // vendor or role
  verification: string; // how to confirm completion
}

export interface TimelineChange {
  activityId: string;
  originalTime: Date;
  newTime: Date;
  reason: string;
  cascadeEffects: CascadeEffect[];
}

export interface CascadeEffect {
  affectedActivityId: string;
  impactType: 'delay' | 'reschedule' | 'cancel' | 'modify';
  magnitude: number; // minutes for delays
  additionalCost?: number;
}

// Payment and Financial Events
export interface PaymentUrgentEvent extends WeddingSpecificEvent {
  eventType: 'payment_received' | 'milestone';
  payload: PaymentUrgentPayload;
}

export interface PaymentUrgentPayload extends EventPayload {
  paymentType: 'deposit' | 'milestone' | 'final' | 'penalty' | 'refund';
  amount: number;
  currency: string;
  dueDate: Date;
  vendorId: string;
  invoiceId: string;
  paymentStatus: 'overdue' | 'due_soon' | 'paid' | 'disputed';
  impactOnServices: ServiceImpact[];
  escalationRequired: boolean;
}

export interface ServiceImpact {
  serviceId: string;
  impactType:
    | 'suspension'
    | 'modification'
    | 'cancellation'
    | 'quality_reduction';
  timeline: Date; // when impact occurs
  reversible: boolean;
  alternativeOptions: string[];
}

// Emergency Event Specifications
export interface WeddingEmergencyEvent extends WeddingSpecificEvent {
  eventType: 'emergency';
  payload: WeddingEmergencyPayload;
  priority: 'critical';
}

export interface WeddingEmergencyPayload extends EventPayload {
  emergencyType:
    | 'venue_emergency'
    | 'vendor_no_show'
    | 'weather_emergency'
    | 'health_emergency'
    | 'transportation_failure';
  location: string;
  timeToWedding: number; // hours
  immediateResponse: ImmediateResponse;
  backupPlan: BackupPlan;
  stakeholderNotification: StakeholderNotification;
  mediaManagement: MediaManagement;
}

export interface ImmediateResponse {
  actions: EmergencyAction[];
  timeline: number; // minutes to complete all actions
  responsibleParty: string;
  resourcesNeeded: Resource[];
  communicationPlan: CommunicationPlan;
}

export interface EmergencyAction {
  actionId: string;
  description: string;
  priority: number; // 1 being highest
  timeframe: number; // minutes
  assignedTo: string;
  dependencies: string[]; // other action IDs
  verification: VerificationStep[];
}

export interface VerificationStep {
  step: string;
  method: 'photo' | 'confirmation' | 'inspection' | 'document';
  responsible: string;
  deadline: Date;
}

export interface Resource {
  type: 'person' | 'equipment' | 'venue' | 'transportation' | 'financial';
  description: string;
  quantity: number;
  availability: boolean;
  source: string;
  cost?: number;
}

export interface BackupPlan {
  planId: string;
  viability: number; // 1-10 scale
  cost: number;
  timeToImplement: number; // hours
  qualityImpact: 'none' | 'minor' | 'moderate' | 'significant';
  guestImpact: GuestImpact;
  vendorChanges: VendorChange[];
}

export interface GuestImpact {
  affected: number; // number of guests
  notification: 'none' | 'immediate' | 'scheduled';
  accommodationChanges: boolean;
  transportationChanges: boolean;
  costToGuests: number;
}

export interface VendorChange {
  vendorId: string;
  changeType: 'replacement' | 'modification' | 'additional';
  cost: number;
  timeframe: number; // hours to arrange
  confirmation: boolean;
}

export interface StakeholderNotification {
  immediate: string[]; // user IDs for immediate notification
  hourly: string[]; // user IDs for hourly updates
  daily: string[]; // user IDs for daily summaries
  mediaList: MediaContact[]; // if media involved
  authorities: Authority[]; // if authorities involved
}

export interface MediaContact {
  outlet: string;
  contact: string;
  relationship: 'friendly' | 'neutral' | 'hostile';
  responseStrategy: string;
}

export interface Authority {
  organization: string;
  contact: string;
  jurisdiction: string;
  notificationRequired: boolean;
  reportingDeadline?: Date;
}

export interface CommunicationPlan {
  internalChannels: InternalChannel[];
  externalChannels: ExternalChannel[];
  messageTemplates: MessageTemplate[];
  updateFrequency: number; // minutes
  spokesPerson: string;
}

export interface InternalChannel {
  channel: 'slack' | 'email' | 'phone' | 'whatsapp' | 'radio';
  recipients: string[];
  purpose: string;
  priority: EventPriority;
}

export interface ExternalChannel {
  channel: 'email' | 'sms' | 'website' | 'social_media' | 'press_release';
  audience: 'guests' | 'vendors' | 'media' | 'public';
  message: string;
  timing: Date;
}

export interface MessageTemplate {
  id: string;
  audience: string;
  channel: string;
  template: string;
  variables: string[]; // template variables
  approvalRequired: boolean;
  legalReview: boolean;
}

export interface MediaManagement {
  mediaStrategy: 'silence' | 'controlled_response' | 'proactive';
  designatedSpokesperson: string;
  approvedStatements: ApprovedStatement[];
  mediaMonitoring: boolean;
  socialMediaPlan: SocialMediaPlan;
}

export interface ApprovedStatement {
  id: string;
  scenario: string;
  statement: string;
  approvedBy: string;
  validUntil: Date;
  channels: string[];
}

export interface SocialMediaPlan {
  strategy: 'disable' | 'monitor' | 'respond';
  monitoredPlatforms: string[];
  responseTeam: string[];
  escalationThreshold: number; // mentions/hour
  approvalProcess: ApprovalProcess;
}

export interface ApprovalProcess {
  required: boolean;
  approvers: string[];
  timeframe: number; // minutes
  emergencyBypass: boolean;
}

// Timeline and Scheduling Events
export interface TimelineCriticalEvent extends WeddingSpecificEvent {
  eventType: 'timeline_change';
  payload: TimelineCriticalPayload;
}

export interface TimelineCriticalPayload extends EventPayload {
  changeType:
    | 'delay'
    | 'advance'
    | 'cancellation'
    | 'addition'
    | 'modification';
  affectedActivities: AffectedActivity[];
  rippleEffects: RippleEffect[];
  criticalPathImpact: boolean;
  bufferConsumed: number; // minutes of buffer time used
  alternativeOptions: AlternativeOption[];
  stakeholderApproval: StakeholderApproval[];
}

export interface AffectedActivity {
  activityId: string;
  originalStart: Date;
  originalEnd: Date;
  newStart?: Date;
  newEnd?: Date;
  vendor: string;
  guests: number; // number of guests affected
  criticality: 'critical' | 'important' | 'nice_to_have';
}

export interface RippleEffect {
  activityId: string;
  impactType: 'timing' | 'vendor' | 'location' | 'guests';
  magnitude: number; // minutes or count
  autoResolved: boolean;
  manualIntervention: ManualIntervention[];
}

export interface ManualIntervention {
  task: string;
  assignedTo: string;
  deadline: Date;
  cost?: number;
  alternatives: string[];
}

export interface AlternativeOption {
  optionId: string;
  description: string;
  feasibility: number; // 1-10 scale
  cost: number;
  timeline: number; // hours to implement
  pros: string[];
  cons: string[];
  vendorApproval: VendorApproval[];
}

export interface VendorApproval {
  vendorId: string;
  required: boolean;
  status: 'pending' | 'approved' | 'declined' | 'conditional';
  conditions?: string[];
  responseDeadline: Date;
}

export interface StakeholderApproval {
  stakeholder: string;
  role: string;
  approvalRequired: boolean;
  deadline: Date;
  escalation: string; // who to escalate to if no response
}

// Milestone and Achievement Events
export interface WeddingMilestoneEvent extends WeddingSpecificEvent {
  eventType: 'milestone';
  payload: WeddingMilestonePayload;
}

export interface WeddingMilestonePayload extends EventPayload {
  milestoneType:
    | 'booking_confirmed'
    | 'contract_signed'
    | 'deposit_paid'
    | 'final_payment'
    | 'rehearsal_complete'
    | 'setup_complete';
  achievementDate: Date;
  nextMilestones: NextMilestone[];
  celebration: CelebrationPlan;
  documentation: DocumentationNeeds[];
  qualityCheck: QualityCheck;
}

export interface NextMilestone {
  milestone: string;
  deadline: Date;
  assignedTo: string[];
  dependencies: string[];
  riskFactors: RiskFactor[];
}

export interface RiskFactor {
  risk: string;
  probability: number; // 0-100%
  impact: 'low' | 'medium' | 'high';
  mitigation: string[];
  monitoring: MonitoringPlan;
}

export interface MonitoringPlan {
  frequency: 'daily' | 'weekly' | 'milestone';
  metrics: string[];
  thresholds: Record<string, number>;
  responsibleParty: string;
}

export interface CelebrationPlan {
  celebrate: boolean;
  method: 'email' | 'gift' | 'discount' | 'social_media' | 'personal_note';
  message: string;
  timing: 'immediate' | 'scheduled' | 'on_completion';
  budget?: number;
}

export interface DocumentationNeeds {
  document: string;
  format: 'pdf' | 'photo' | 'video' | 'signature';
  deadline: Date;
  responsible: string;
  storage: string; // where to store the document
}

export interface QualityCheck {
  required: boolean;
  checklist: QualityCheckItem[];
  inspector: string;
  deadline: Date;
  passThreshold: number; // percentage
}

export interface QualityCheckItem {
  item: string;
  importance: 'critical' | 'high' | 'medium' | 'low';
  method: 'visual' | 'functional' | 'documentation' | 'interview';
  criteria: string;
  weight: number; // contribution to overall score
}

// Vendor Communication Events
export interface VendorCommunicationEvent extends WeddingSpecificEvent {
  eventType: 'vendor_update';
  payload: VendorCommunicationPayload;
}

export interface VendorCommunicationPayload extends EventPayload {
  communicationType:
    | 'status_update'
    | 'question'
    | 'concern'
    | 'change_request'
    | 'emergency';
  vendorId: string;
  urgency: 'immediate' | 'same_day' | 'next_business_day' | 'weekly';
  responseRequired: boolean;
  responseDeadline?: Date;
  escalationPath: VendorEscalationPath[];
  context: CommunicationContext;
}

export interface VendorEscalationPath {
  level: number;
  contact: VendorContact;
  timeoutHours: number;
  method: 'email' | 'phone' | 'in_person';
}

export interface VendorContact {
  name: string;
  role: string;
  contactInfo: {
    email?: string;
    phone?: string;
    mobile?: string;
  };
  availability: AvailabilityWindow[];
}

export interface AvailabilityWindow {
  dayOfWeek: number; // 0-6, Sunday = 0
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  timezone: string;
}

export interface CommunicationContext {
  previousCommunications: CommunicationHistory[];
  relatedDocuments: Document[];
  contractualReferences: ContractReference[];
  financialImplications?: FinancialImplication[];
}

export interface CommunicationHistory {
  date: Date;
  type: string;
  summary: string;
  outcome: string;
  followUpRequired: boolean;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  url: string;
  relevance: 'high' | 'medium' | 'low';
}

export interface ContractReference {
  section: string;
  clause: string;
  relevance: string;
  implication: string;
}

export interface FinancialImplication {
  type: 'cost_increase' | 'cost_decrease' | 'penalty' | 'bonus';
  amount: number;
  currency: string;
  justification: string;
}

// Event Factory and Utilities
export interface EventFactory {
  createVendorCancellation(
    vendorId: string,
    weddingId: string,
    details: Partial<VendorCancellationPayload>,
  ): VendorCancellationEvent;
  createWeatherAlert(
    weddingId: string,
    weatherData: Partial<WeatherAlertPayload>,
  ): WeatherAlertEvent;
  createPaymentUrgent(
    paymentDetails: Partial<PaymentUrgentPayload>,
  ): PaymentUrgentEvent;
  createWeddingEmergency(
    emergencyDetails: Partial<WeddingEmergencyPayload>,
  ): WeddingEmergencyEvent;
  createTimelineCritical(
    timelineDetails: Partial<TimelineCriticalPayload>,
  ): TimelineCriticalEvent;
  createWeddingMilestone(
    milestoneDetails: Partial<WeddingMilestonePayload>,
  ): WeddingMilestoneEvent;
  createVendorCommunication(
    communicationDetails: Partial<VendorCommunicationPayload>,
  ): VendorCommunicationEvent;
}

export interface EventValidation {
  validateEvent(event: WeddingSpecificEvent): ValidationResult;
  validatePayload(
    eventType: NotificationEventType,
    payload: EventPayload,
  ): ValidationResult;
  validateBusinessRules(event: WeddingSpecificEvent): BusinessRuleValidation[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion: string;
}

export interface BusinessRuleValidation {
  ruleId: string;
  passed: boolean;
  message: string;
  action?: string;
}

// Event Correlation and Tracking
export interface EventCorrelation {
  correlationId: string;
  primaryEventId: string;
  relatedEvents: RelatedEvent[];
  eventChain: EventChainLink[];
  impactRadius: number; // number of other events affected
}

export interface RelatedEvent {
  eventId: string;
  relationship: 'caused_by' | 'causes' | 'related_to' | 'depends_on';
  strength: number; // 1-10 correlation strength
  timeOffset: number; // minutes from primary event
}

export interface EventChainLink {
  eventId: string;
  sequence: number;
  trigger: string;
  outcome: string;
  duration: number; // minutes
}

export type WeddingEventType =
  | VendorCancellationEvent
  | WeatherAlertEvent
  | PaymentUrgentEvent
  | WeddingEmergencyEvent
  | TimelineCriticalEvent
  | WeddingMilestoneEvent
  | VendorCommunicationEvent;

// Export all event type guards
export function isVendorCancellationEvent(
  event: WeddingSpecificEvent,
): event is VendorCancellationEvent {
  return (
    event.eventType === 'vendor_update' &&
    'vendorId' in event.payload &&
    'cancellationReason' in event.payload
  );
}

export function isWeatherAlertEvent(
  event: WeddingSpecificEvent,
): event is WeatherAlertEvent {
  return event.eventType === 'weather_alert' && 'weatherType' in event.payload;
}

export function isPaymentUrgentEvent(
  event: WeddingSpecificEvent,
): event is PaymentUrgentEvent {
  return (
    (event.eventType === 'payment_received' ||
      event.eventType === 'milestone') &&
    'paymentType' in event.payload
  );
}

export function isWeddingEmergencyEvent(
  event: WeddingSpecificEvent,
): event is WeddingEmergencyEvent {
  return event.eventType === 'emergency' && 'emergencyType' in event.payload;
}

export function isTimelineCriticalEvent(
  event: WeddingSpecificEvent,
): event is TimelineCriticalEvent {
  return event.eventType === 'timeline_change' && 'changeType' in event.payload;
}

export function isWeddingMilestoneEvent(
  event: WeddingSpecificEvent,
): event is WeddingMilestoneEvent {
  return event.eventType === 'milestone' && 'milestoneType' in event.payload;
}

export function isVendorCommunicationEvent(
  event: WeddingSpecificEvent,
): event is VendorCommunicationEvent {
  return (
    event.eventType === 'vendor_update' && 'communicationType' in event.payload
  );
}
