/**
 * WS-342 Real-Time Wedding Collaboration - Vendor System Types
 * Team C: Integration & System Architecture
 */

import type {
  VendorSystemType,
  VendorAPIConfig,
  DataMappingRules,
  WebhookConfig,
  AuthResult,
  VendorData,
  PushResult,
  SubscriptionResult,
  UpdateCallback,
  DataQuery,
} from './integration';

export interface VendorSystemAdapter {
  systemId: string;
  systemType: VendorSystemType;
  apiConfig: VendorAPIConfig;
  dataMapping: DataMappingRules;

  // Integration methods
  authenticate(): Promise<AuthResult>;
  fetchData(query: DataQuery): Promise<VendorData>;
  pushData(data: VendorData): Promise<PushResult>;
  subscribeToUpdates(callback: UpdateCallback): Promise<SubscriptionResult>;

  // Real-time capabilities
  supportsRealTime: boolean;
  webSocketEndpoint?: string;
  webhookEndpoints: WebhookConfig[];

  // Wedding-specific methods
  syncWeddingData(weddingId: string): Promise<VendorSyncResult>;
  updateWeddingTimeline(
    externalId: string,
    timeline: any,
  ): Promise<TimelineUpdateResult>;
  handleWebhook(webhookData: any): Promise<WebhookProcessResult>;

  // Vendor system capabilities
  getCapabilities(): VendorCapabilities;
  testConnection(): Promise<ConnectionTestResult>;
}

export interface VendorSyncResult {
  success: boolean;
  syncedData: WeddingVendorData;
  conflicts?: VendorConflict[];
  errors?: VendorSyncError[];
}

export interface WeddingVendorData {
  clients?: ClientData[];
  timeline?: VendorTimelineData;
  packages?: VendorPackage[];
  payments?: PaymentData[];
  communications?: CommunicationData[];
  contracts?: ContractData[];
  proposals?: ProposalData[];
}

export interface ClientData {
  id: string;
  name: string;
  email: string;
  phone: string;
  weddingDate: Date;
  venue?: string;
  partnerName?: string;
}

export interface VendorTimelineData {
  events: VendorTimelineEvent[];
  shootingSchedule?: ShootingScheduleEvent[];
  deliveryMilestones?: DeliveryMilestone[];
}

export interface VendorTimelineEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  eventType: string;
  location?: string;
  notes?: string;
}

export interface ShootingScheduleEvent {
  id: string;
  sessionType: 'engagement' | 'bridal' | 'ceremony' | 'reception' | 'family';
  startTime: Date;
  duration: number;
  location: string;
  shotList?: string[];
}

export interface DeliveryMilestone {
  id: string;
  deliveryType: 'preview' | 'gallery' | 'album' | 'prints';
  dueDate: Date;
  status: 'pending' | 'in_progress' | 'delivered' | 'late';
  deliveredDate?: Date;
}

export interface VendorPackage {
  id: string;
  name: string;
  description: string;
  price: number;
  includes: string[];
  addOns?: AddOnService[];
}

export interface AddOnService {
  id: string;
  name: string;
  price: number;
  description: string;
}

export interface PaymentData {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  dueDate: Date;
  paidDate?: Date;
  paymentMethod?: string;
}

export interface CommunicationData {
  id: string;
  type: 'email' | 'message' | 'call' | 'meeting';
  subject?: string;
  content: string;
  timestamp: Date;
  participants: string[];
  status: 'sent' | 'delivered' | 'read' | 'replied';
}

export interface ContractData {
  id: string;
  title: string;
  status: 'draft' | 'sent' | 'signed' | 'completed';
  createdDate: Date;
  signedDate?: Date;
  amount: number;
  terms: string;
}

export interface ProposalData {
  id: string;
  title: string;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined';
  createdDate: Date;
  amount: number;
  validUntil: Date;
  packages: VendorPackage[];
}

export interface VendorConflict {
  type: VendorConflictType;
  field: string;
  vendorValue: any;
  wedsyncValue: any;
  resolution?: ConflictResolutionAction;
}

export type VendorConflictType =
  | 'timeline_mismatch'
  | 'payment_discrepancy'
  | 'client_data_difference'
  | 'package_variation'
  | 'date_conflict';

export interface ConflictResolutionAction {
  action: 'use_vendor' | 'use_wedsync' | 'merge' | 'manual_review';
  resolvedValue?: any;
  notes?: string;
}

export interface VendorSyncError {
  type:
    | 'authentication'
    | 'rate_limit'
    | 'data_format'
    | 'network'
    | 'permission';
  message: string;
  field?: string;
  retryable: boolean;
  retryAfter?: number;
}

export interface TimelineUpdateResult {
  success: boolean;
  updatedEvents: string[];
  conflicts?: TimelineConflict[];
  error?: string;
}

export interface TimelineConflict {
  eventId: string;
  conflictType: 'time_overlap' | 'venue_conflict' | 'vendor_unavailable';
  details: string;
}

export interface WebhookProcessResult {
  success: boolean;
  processedEvents: ProcessedWebhookEvent[];
  errors?: WebhookError[];
}

export interface ProcessedWebhookEvent {
  eventType: string;
  weddingId?: string;
  data: any;
  processed: boolean;
}

export interface WebhookError {
  error: string;
  eventData: any;
  retryable: boolean;
}

export interface VendorCapabilities {
  supportsRealTimeSync: boolean;
  supportsWebhooks: boolean;
  supportedDataTypes: string[];
  supportedOperations: VendorOperation[];
  rateLimits: RateLimit;
}

export interface VendorOperation {
  operation: 'read' | 'write' | 'delete' | 'subscribe';
  dataType: string;
  supported: boolean;
}

export interface RateLimit {
  requestsPerMinute: number;
  requestsPerHour: number;
  burstLimit?: number;
}

export interface ConnectionTestResult {
  success: boolean;
  responseTime: number;
  capabilities: VendorCapabilities;
  error?: string;
}

// Specific vendor system interfaces
export interface TaveSystemConfig {
  apiKey: string;
  studioId: string;
  baseUrl: string;
}

export interface TaveJob {
  id: string;
  clients: TaveClient[];
  timeline: TaveTimelineEvent[];
  packages: TavePackage[];
  payments: TavePayment[];
  status: string;
}

export interface TaveClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  partnerFirstName?: string;
  partnerLastName?: string;
  weddingDate: string;
}

export interface TaveTimelineEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  eventType: string;
  location?: string;
}

export interface TavePackage {
  id: string;
  name: string;
  price: number;
  description: string;
}

export interface TavePayment {
  id: string;
  amount: number;
  dueDate: string;
  status: string;
  paidDate?: string;
}

export interface StudioNinjaSystemConfig {
  apiKey: string;
  userId: string;
  baseUrl: string;
}

export interface StudioNinjaProject {
  id: string;
  client: StudioNinjaClient;
  timeline: StudioNinjaTimelineEvent[];
  packages: StudioNinjaPackage[];
  workflow: StudioNinjaWorkflowStep[];
}

export interface StudioNinjaClient {
  id: string;
  name: string;
  email: string;
  phone: string;
  weddingDate: string;
  venue?: string;
}

export interface StudioNinjaTimelineEvent {
  id: string;
  title: string;
  date: string;
  type: string;
}

export interface StudioNinjaPackage {
  id: string;
  name: string;
  price: number;
  items: string[];
}

export interface StudioNinjaWorkflowStep {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  dueDate: string;
}

export interface HoneyBookSystemConfig {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
  baseUrl: string;
}

export interface HoneyBookProject {
  id: string;
  client: HoneyBookClient;
  proposals: HoneyBookProposal[];
  contracts: HoneyBookContract[];
  timeline: HoneyBookTimelineEvent[];
  invoices: HoneyBookInvoice[];
  messages: HoneyBookMessage[];
}

export interface HoneyBookClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  partnerFirstName?: string;
  partnerLastName?: string;
}

export interface HoneyBookProposal {
  id: string;
  title: string;
  status: string;
  amount: number;
  createdAt: string;
  packages: HoneyBookPackage[];
}

export interface HoneyBookContract {
  id: string;
  title: string;
  status: string;
  signedAt?: string;
}

export interface HoneyBookTimelineEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
}

export interface HoneyBookInvoice {
  id: string;
  amount: number;
  dueDate: string;
  status: string;
  paidAt?: string;
}

export interface HoneyBookMessage {
  id: string;
  subject: string;
  body: string;
  sentAt: string;
  fromName: string;
  toName: string;
}

export interface HoneyBookPackage {
  id: string;
  name: string;
  price: number;
  description: string;
}

// Calendar system interfaces
export interface CalendarSystemAdapter {
  calendarType: string;
  authenticate(): Promise<AuthResult>;
  createCalendar(
    name: string,
    description?: string,
  ): Promise<CalendarCreateResult>;
  syncEvents(
    calendarId: string,
    events: CalendarEvent[],
  ): Promise<CalendarSyncResult>;
  subscribeToChanges(
    calendarId: string,
    callback: CalendarChangeCallback,
  ): Promise<SubscriptionResult>;
}

export interface CalendarEvent {
  id?: string;
  title: string;
  startTime: Date;
  endTime: Date;
  description?: string;
  location?: string;
  attendees?: CalendarAttendee[];
  recurrence?: RecurrenceRule;
}

export interface CalendarAttendee {
  email: string;
  name?: string;
  responseStatus?: 'accepted' | 'declined' | 'tentative' | 'needs_action';
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval?: number;
  until?: Date;
  count?: number;
}

export interface CalendarCreateResult {
  success: boolean;
  calendarId?: string;
  error?: string;
}

export interface CalendarSyncResult {
  success: boolean;
  syncedEvents: number;
  createdEvents: string[];
  updatedEvents: string[];
  conflicts?: CalendarConflict[];
}

export interface CalendarConflict {
  eventId: string;
  conflictType: 'time_overlap' | 'location_conflict' | 'attendee_conflict';
  conflictingEvents: string[];
}

export interface CalendarChangeCallback {
  (change: CalendarChange): Promise<void>;
}

export interface CalendarChange {
  calendarId: string;
  eventId: string;
  changeType: 'created' | 'updated' | 'deleted';
  eventData: CalendarEvent;
}
