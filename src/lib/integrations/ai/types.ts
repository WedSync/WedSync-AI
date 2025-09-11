// Common AI Integration Types for WedSync
// This file contains shared interfaces and types used across all AI integration modules

// Base AI Types
export interface AIRecommendation {
  id: string;
  type:
    | 'vendor_selection'
    | 'budget_optimization'
    | 'timeline_adjustment'
    | 'cost_reduction'
    | 'quality_improvement';
  category: string;
  title: string;
  description: string;
  confidence: number; // 0-1
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'implemented' | 'rejected';

  // Context
  weddingId: string;
  targetDate: Date;
  serviceType: string;
  budgetRange: { min: number; max: number };
  guestCount: number;
  location: string;
  requirements: any[];
  affectedVendors?: string[];

  // Business Impact
  potentialSavings: number;
  estimatedCost: number;
  timeToImplement: number; // hours
  riskLevel: 'low' | 'medium' | 'high';

  // Implementation
  requiresAction: boolean;
  assignedTo?: string;
  urgency: 'low' | 'medium' | 'high';
  dependencies: string[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: 'ai_engine' | 'user' | 'vendor' | 'system';
  tags: string[];
  metadata: Record<string, any>;
}

export interface OptimizationResult {
  id: string;
  weddingId: string;
  type: 'budget' | 'timeline' | 'vendor' | 'comprehensive';
  status: 'in_progress' | 'completed' | 'failed';

  // Results
  recommendations: AIRecommendation[];
  potentialSavings: number;
  confidence: number; // 0-1
  implementationSteps: ImplementationStep[];
  riskAssessment: RiskAssessment;

  // Impact Analysis
  leadScoringImpact?: number;
  vendorImpact: VendorImpact[];
  timelineChanges: TimelineChange[];
  budgetChanges: BudgetChange[];

  // Metadata
  createdAt: Date;
  completedAt?: Date;
  processingTime: number; // milliseconds
  dataSourcesUsed: string[];
  aiModelVersion: string;
}

export interface ImplementationStep {
  id: string;
  description: string;
  priority: number;
  estimatedTime: number; // minutes
  assignedTo: string;
  dueDate: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  dependencies: string[];
  completedAt?: Date;
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // 0-1
  riskFactors: RiskFactor[];
  mitigationStrategies: MitigationStrategy[];
  contingencyPlan?: string;
}

export interface RiskFactor {
  id: string;
  type: 'financial' | 'timeline' | 'quality' | 'vendor' | 'external';
  description: string;
  probability: number; // 0-1
  impact: number; // 0-1
  severity: 'low' | 'medium' | 'high' | 'critical';
  mitigationCost: number;
}

export interface MitigationStrategy {
  id: string;
  riskFactorId: string;
  strategy: string;
  cost: number;
  effectiveness: number; // 0-1
  timeToImplement: number; // hours
  responsible: string;
}

export interface VendorImpact {
  vendorId: string;
  impactType:
    | 'cost_change'
    | 'timeline_change'
    | 'scope_change'
    | 'replacement';
  description: string;
  costImpact: number;
  timelineImpact: number; // days
  qualityImpact: number; // -1 to 1
  clientSatisfactionImpact: number; // -1 to 1
}

export interface TimelineChange {
  eventId: string;
  changeType:
    | 'reschedule'
    | 'duration_change'
    | 'dependency_change'
    | 'removal';
  originalDate: Date;
  newDate?: Date;
  originalDuration: number;
  newDuration?: number;
  reason: string;
  impact: 'low' | 'medium' | 'high';
}

export interface BudgetChange {
  category: string;
  changeType: 'increase' | 'decrease' | 'reallocation';
  originalAmount: number;
  newAmount: number;
  reason: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
}

// AI Service Integration Types
export interface AIInsight {
  id: string;
  type: 'opportunity' | 'risk' | 'optimization' | 'prediction';
  category: string;
  title: string;
  description: string;
  confidence: number;
  urgency: 'low' | 'medium' | 'high';

  // Lead and business intelligence
  leadPotential: number; // 0-1
  crmSystem: string;
  details: Record<string, any>;
  recommendedActions: string[];
  potentialValue: number;
  tags: string[];

  // Metadata
  generatedAt: Date;
  validUntil?: Date;
  source: 'pattern_analysis' | 'predictive_model' | 'anomaly_detection';
}

// Vendor Integration Types
export interface VendorAPIClient {
  checkAvailability(
    request: AvailabilityCheckRequest,
  ): Promise<VendorAvailability>;
  createInquiry(request: any): Promise<VendorInquiryResponse>;
  createEmergencyInquiry(request: any): Promise<VendorInquiryResponse>;
  subscribeToUpdates(config: VendorSubscriptionConfig): Promise<void>;
}

export interface AvailabilityCheckRequest {
  dates: Date[];
  serviceType: string;
  requirements: any[];
  location?: string;
  guestCount?: number;
  budget?: { min: number; max: number };
}

export interface VendorAvailability {
  isAvailable: boolean;
  availableSlots?: TimeSlot[];
  unavailableSlots?: TimeSlot[];
  alternativeDates?: Date[];
  restrictions?: string[];
  pricing?: PricingInfo;
}

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  isAvailable: boolean;
  capacity?: number;
  restrictions?: string[];
  pricing?: number;
}

export interface PricingInfo {
  basePrice: number;
  currency: string;
  priceBreakdown: PriceBreakdownItem[];
  discounts: Discount[];
  totalPrice: number;
  validUntil: Date;
}

export interface PriceBreakdownItem {
  item: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category: string;
}

export interface Discount {
  type: 'percentage' | 'fixed' | 'tiered';
  value: number;
  description: string;
  conditions: string[];
  validUntil?: Date;
}

export interface VendorInquiryResponse {
  inquiryId: string;
  status: 'submitted' | 'acknowledged' | 'quoted' | 'accepted' | 'rejected';
  estimatedResponseTime: string;
  message?: string;
  quote?: VendorQuote;
  availability?: VendorAvailability;
}

export interface VendorQuote {
  quoteId: string;
  totalAmount: number;
  currency: string;
  lineItems: QuoteLineItem[];
  validUntil: Date;
  terms: string[];
  paymentTerms: PaymentTerms;
}

export interface QuoteLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category: string;
  optional: boolean;
}

export interface PaymentTerms {
  deposit: { amount: number; dueDate: Date };
  installments: PaymentInstallment[];
  finalPayment: { amount: number; dueDate: Date };
  lateFeesPolicy: string;
  refundPolicy: string;
}

export interface PaymentInstallment {
  amount: number;
  dueDate: Date;
  description: string;
  mandatory: boolean;
}

export interface VendorSubscriptionConfig {
  inquiryId?: string;
  vendorId?: string;
  webhookUrl: string;
  events: string[];
  secret?: string;
  retryPolicy?: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
}

// CRM Integration Types
export interface CRMAPIClient {
  updateWeddingRecord(weddingId: string, data: any): Promise<void>;
  createLead(leadData: LeadData): Promise<CRMLeadCreationResult>;
  createTask(taskData: TaskData): Promise<CRMTaskResult>;
  updateLeadScore(leadId: string, score: number): Promise<void>;
  subscribeToWebhooks(config: CRMWebhookConfig): Promise<void>;
  getRecord(recordId: string, recordType: string): Promise<any>;
  updateRecord(recordId: string, recordType: string, data: any): Promise<void>;
}

export interface LeadData {
  source: string;
  leadScore: number;
  aiConfidence: number;
  contactInfo: ContactInfo;
  weddingDetails: WeddingDetails;
  insights: string[];
  recommendedActions: string[];
  potentialValue: number;
  urgency: string;
  followUpDate: Date;
  tags: string[];
}

export interface ContactInfo {
  email: string;
  phone?: string;
  name: string;
  company?: string;
  address?: Address;
  socialProfiles?: SocialProfile[];
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface SocialProfile {
  platform: string;
  url: string;
  handle: string;
}

export interface WeddingDetails {
  weddingDate: Date;
  venue?: string;
  guestCount: number;
  budget: number;
  style: string;
  services: string[];
  preferences: Record<string, any>;
}

export interface TaskData {
  title: string;
  description: string;
  assignedTo: string;
  dueDate: Date;
  priority: 'low' | 'medium' | 'high';
  category: string;
  relatedRecords: RelatedRecord[];
}

export interface RelatedRecord {
  recordId: string;
  recordType: string;
  relationship: string;
}

export interface CRMLeadCreationResult {
  leadId: string;
  status: 'created' | 'updated' | 'duplicate' | 'rejected';
  score: number;
  duplicateOf?: string;
  validationWarnings: string[];
}

export interface CRMTaskResult {
  taskId: string;
  status: 'created' | 'updated' | 'failed';
  assignedTo: string;
  dueDate: Date;
  estimatedDuration: number;
}

export interface CRMWebhookConfig {
  url: string;
  events: string[];
  secret: string;
  filters?: WebhookFilter[];
}

export interface WebhookFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
}

// Payment Integration Types
export interface PaymentProvider {
  id: string;
  name: string;
  type: 'stripe' | 'paypal' | 'square' | 'bank_transfer';
  apiClient: PaymentAPIClient;
  fees: FeeStructure;
  limits: PaymentLimits;
}

export interface PaymentAPIClient {
  processPayment(request: PaymentRequest): Promise<PaymentResult>;
  createInvoice(invoice: InvoiceRequest): Promise<InvoiceResult>;
  setupRecurringPayment(
    config: RecurringPaymentConfig,
  ): Promise<RecurringPaymentResult>;
  refundPayment(transactionId: string, amount?: number): Promise<RefundResult>;
  getPaymentStatus(paymentId: string): Promise<PaymentStatus>;
  subscribeToWebhooks(config: PaymentWebhookConfig): Promise<void>;
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  paymentMethodId: string;
  description: string;
  weddingId: string;
  vendorId?: string;
  invoiceId?: string;
  metadata: Record<string, string>;
}

export interface PaymentResult {
  transactionId: string;
  status: 'succeeded' | 'failed' | 'pending' | 'requires_action';
  amount: number;
  fees: number;
  netAmount: number;
  processedAt: Date;
  failureReason?: string;
  nextAction?: PaymentAction;
}

export interface PaymentAction {
  type: 'redirect' | 'authenticate' | 'verify' | 'confirm';
  url?: string;
  instructions: string;
  expiresAt: Date;
}

export interface InvoiceRequest {
  weddingId: string;
  vendorId: string;
  lineItems: InvoiceLineItem[];
  dueDate: Date;
  paymentTerms: string;
  notes?: string;
  discounts?: InvoiceDiscount[];
  taxes?: InvoiceTax[];
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  category: string;
  taxable: boolean;
}

export interface InvoiceDiscount {
  description: string;
  type: 'percentage' | 'fixed';
  value: number;
  applicableToItems?: string[];
}

export interface InvoiceTax {
  name: string;
  rate: number;
  applicableToItems?: string[];
}

export interface InvoiceResult {
  invoiceId: string;
  invoiceNumber: string;
  totalAmount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paymentUrl?: string;
  pdfUrl?: string;
}

export interface RecurringPaymentConfig {
  paymentMethodId: string;
  amount: number;
  currency: string;
  interval: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: Date;
  endDate?: Date;
  maxOccurrences?: number;
  description: string;
}

export interface RecurringPaymentResult {
  subscriptionId: string;
  status: 'active' | 'paused' | 'cancelled';
  nextPaymentDate: Date;
  totalPaid: number;
  remainingPayments?: number;
}

export interface RefundResult {
  refundId: string;
  amount: number;
  status: 'succeeded' | 'failed' | 'pending';
  processedAt?: Date;
  failureReason?: string;
  estimatedArrival?: Date;
}

export interface PaymentStatus {
  paymentId: string;
  status: string;
  amount: number;
  createdAt: Date;
  lastUpdated: Date;
  events: PaymentEvent[];
}

export interface PaymentEvent {
  type: string;
  timestamp: Date;
  data: Record<string, any>;
}

export interface PaymentWebhookConfig {
  url: string;
  events: string[];
  secret: string;
  retryPolicy?: WebhookRetryPolicy;
}

export interface WebhookRetryPolicy {
  maxAttempts: number;
  backoffMultiplier: number;
  initialDelay: number;
  maxDelay: number;
}

export interface FeeStructure {
  processing: { percentage: number; fixed: number };
  international: { percentage: number; fixed: number };
  refund: number;
  chargeback: number;
}

export interface PaymentLimits {
  minAmount: number;
  maxAmount: number;
  dailyLimit: number;
  monthlyLimit: number;
  supportedCurrencies: string[];
}

// Calendar Integration Types
export interface CalendarProvider {
  id: string;
  name: string;
  type: 'google' | 'outlook' | 'apple' | 'custom';
  apiClient: CalendarAPIClient;
  capabilities: CalendarCapability[];
}

export interface CalendarAPIClient {
  createEvent(event: CalendarEventRequest): Promise<CalendarEventResult>;
  updateEvent(eventId: string, updates: CalendarEventUpdate): Promise<void>;
  deleteEvent(eventId: string): Promise<void>;
  getEvents(query: CalendarQuery): Promise<CalendarEvent[]>;
  checkBusyTime(
    timeSlots: TimeSlot[],
    attendees: string[],
  ): Promise<BusyTimeResult>;
  subscribeToChanges(
    config: CalendarWebhookConfig,
  ): Promise<CalendarWebhookResult>;
}

export interface CalendarEventRequest {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees: Attendee[];
  reminders?: Reminder[];
  recurrence?: RecurrenceRule;
  weddingId?: string;
  eventType?: 'ceremony' | 'reception' | 'preparation' | 'vendor_meeting';
}

export interface CalendarEventResult {
  eventId: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  conflictsWith?: string[];
  attendeeResponses: AttendeeResponse[];
  calendarUrl?: string;
  icsLink?: string;
}

export interface CalendarEventUpdate {
  title?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  location?: string;
  attendees?: Attendee[];
  status?: 'confirmed' | 'tentative' | 'cancelled';
}

export interface CalendarQuery {
  startDate: Date;
  endDate: Date;
  calendarIds?: string[];
  eventTypes?: string[];
  attendeeEmails?: string[];
  keywords?: string[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees: Attendee[];
  organizer: string;
  status: string;
  weddingId?: string;
  eventType?: string;
}

export interface Attendee {
  email: string;
  name?: string;
  status: 'accepted' | 'declined' | 'pending' | 'tentative';
  isRequired: boolean;
  isOrganizer?: boolean;
}

export interface AttendeeResponse {
  email: string;
  status: 'accepted' | 'declined' | 'pending' | 'tentative';
  responseTime?: Date;
  comment?: string;
}

export interface Reminder {
  method: 'email' | 'popup' | 'sms';
  minutes: number;
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: Date;
  count?: number;
  byWeekDay?: number[];
  byMonthDay?: number[];
}

export interface BusyTimeResult {
  attendee: string;
  busySlots: TimeSlot[];
  freeSlots: TimeSlot[];
  availability: 'available' | 'busy' | 'tentative' | 'out_of_office';
}

export interface CalendarWebhookConfig {
  url: string;
  events: string[];
  calendarIds: string[];
  secret?: string;
}

export interface CalendarWebhookResult {
  webhookId: string;
  isActive: boolean;
  expirationTime?: Date;
  eventsSubscribed: string[];
}

export interface CalendarCapability {
  feature: string;
  supported: boolean;
  limitations?: string[];
}

// Notification Integration Types
export interface NotificationChannel {
  id: string;
  type: 'email' | 'sms' | 'push' | 'webhook' | 'in_app';
  provider: string;
  config: NotificationChannelConfig;
  rateLimits: NotificationRateLimit;
  isActive: boolean;
}

export interface NotificationChannelConfig {
  apiKey?: string;
  endpoint?: string;
  fromAddress?: string;
  fromNumber?: string;
  templates?: NotificationTemplate[];
  deliverySettings: DeliverySettings;
}

export interface DeliverySettings {
  retryAttempts: number;
  retryDelay: number;
  timeout: number;
  batchingEnabled: boolean;
  batchSize: number;
  quietHours?: QuietHours;
}

export interface QuietHours {
  enabled: boolean;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  timezone: string;
  exceptions: string[]; // notification types that override quiet hours
}

export interface NotificationRateLimit {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit: number;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  channel: string;
  subject?: string;
  content: string;
  htmlContent?: string;
  variables: TemplateVariable[];
  defaultValues: Record<string, any>;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  required: boolean;
  defaultValue?: any;
  validation?: string;
}

// External AI Service Types
export interface ExternalAIProvider {
  id: string;
  name: string;
  type: 'openai' | 'anthropic' | 'google' | 'azure' | 'aws' | 'custom';
  capabilities: AICapability[];
  pricing: AIPricing;
  limits: AILimits;
}

export interface AICapability {
  capability: string;
  supported: boolean;
  models?: string[];
  inputTypes: string[];
  outputTypes: string[];
  maxInputSize?: number;
  maxOutputSize?: number;
}

export interface AIPricing {
  model: string;
  inputCostPer1000Tokens: number;
  outputCostPer1000Tokens: number;
  requestCost?: number;
  currency: string;
}

export interface AILimits {
  requestsPerMinute: number;
  tokensPerMinute: number;
  maxConcurrentRequests: number;
  maxContextLength: number;
}

// Common Utility Types
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ErrorResult {
  code: string;
  message: string;
  details?: Record<string, any>;
  retryable: boolean;
  retryAfter?: number;
}

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  lastChecked: Date;
  details?: Record<string, any>;
}

export interface IntegrationMetrics {
  serviceName: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  peakResponseTime: number;
  errorRate: number;
  uptime: number;
  lastReset: Date;
}

// Configuration Types
export interface IntegrationConfig {
  id: string;
  name: string;
  type: 'vendor' | 'crm' | 'payment' | 'calendar' | 'notification' | 'ai';
  enabled: boolean;
  settings: Record<string, any>;
  credentials: Record<string, string>;
  webhooks: WebhookEndpoint[];
  retryPolicy: RetryPolicy;
  rateLimit: RateLimit;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  secret?: string;
  isActive: boolean;
  lastDelivery?: Date;
  failureCount: number;
}

export interface RetryPolicy {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface RateLimit {
  requestsPerSecond: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  burstLimit: number;
}

// Event and Webhook Types
export interface IntegrationEvent {
  id: string;
  type: string;
  source: string;
  timestamp: Date;
  data: Record<string, any>;
  correlationId?: string;
  version: string;
}

export interface WebhookPayload {
  event: IntegrationEvent;
  signature?: string;
  delivery: {
    id: string;
    timestamp: Date;
    attempt: number;
  };
}

// Monitoring and Observability Types
export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  timestamp: Date;
  service: string;
  message: string;
  context: Record<string, any>;
  correlationId?: string;
  userId?: string;
  weddingId?: string;
}

export interface Alert {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  service: string;
  title: string;
  description: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata: Record<string, any>;
}

export interface PerformanceMetric {
  metric: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags: Record<string, string>;
  threshold?: {
    warning: number;
    critical: number;
  };
}

// Re-export common types that might be used across integrations
export type {
  // From existing type files
  AIInsight,
  OptimizationResult,
  AIRecommendation,

  // Vendor types
  VendorAPIClient,
  VendorAvailability,
  VendorInquiryResponse,

  // CRM types
  CRMAPIClient,
  LeadData,
  TaskData,

  // Payment types
  PaymentAPIClient,
  PaymentRequest,
  PaymentResult,

  // Calendar types
  CalendarAPIClient,
  CalendarEvent,
  CalendarEventRequest,

  // Utility types
  PaginationParams,
  PaginationResult,
  ErrorResult,
  HealthCheck,
  IntegrationMetrics,
};
