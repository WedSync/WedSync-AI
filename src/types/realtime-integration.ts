// WS-202: Supabase Realtime Integration Types and Interfaces
// Wedding industry specific types for realtime integration system

export interface RealtimeEventMetadata {
  source: 'supabase' | 'webhook' | 'manual' | 'system';
  triggeredBy: string;
  timestamp: string;
  priority: EventPriority;
  weddingId?: string;
  organizationId: string;
  correlationId: string;
}

export type EventPriority = 'critical' | 'high' | 'normal' | 'low';

export interface RealtimeEventType {
  // Form Events
  FORM_RESPONSE_RECEIVED: 'form_response_received';
  FORM_SUBMITTED: 'form_submitted';

  // Journey Events
  JOURNEY_MILESTONE_COMPLETED: 'journey_milestone_completed';
  JOURNEY_STEP_STARTED: 'journey_step_started';

  // Wedding Events
  WEDDING_DATE_CHANGE: 'wedding_date_change';
  WEDDING_VENUE_UPDATED: 'wedding_venue_updated';
  WEDDING_TIMELINE_UPDATED: 'wedding_timeline_updated';

  // Client Events
  CLIENT_PROFILE_UPDATED: 'client_profile_updated';
  CLIENT_CONTACT_CHANGE: 'client_contact_change';

  // Vendor Events
  VENDOR_ASSIGNED: 'vendor_assigned';
  VENDOR_STATUS_CHANGE: 'vendor_status_change';

  // Payment Events
  PAYMENT_RECEIVED: 'payment_received';
  PAYMENT_FAILED: 'payment_failed';

  // Emergency Events
  EMERGENCY_ALERT: 'emergency_alert';
  VENDOR_NO_SHOW: 'vendor_no_show';
}

export interface WebhookEndpoint {
  id: string;
  organizationId: string;
  endpointUrl: string;
  secretKey: string;
  subscribedEvents: string[];
  isActive: boolean;
  rateLimitPerMinute: number;
  lastDeliveryAt?: string;
  failureCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RealtimeWebhookPayload {
  eventId: string;
  realtimeEventType: keyof RealtimeEventType;
  table: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  oldRecord?: Record<string, any>;
  newRecord?: Record<string, any>;
  timestamp: string;
  metadata: RealtimeEventMetadata;
  organizationId: string;
}

export interface NotificationRecipient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  slackUserId?: string;
  slackChannelId?: string;
  teamsUserId?: string;
  channels: NotificationChannel[];
  preferences: NotificationPreferences;
}

export type NotificationChannel =
  | 'email'
  | 'sms'
  | 'slack'
  | 'teams'
  | 'in_app'
  | 'push';

export interface NotificationPreferences {
  enabled: boolean;
  channels: NotificationChannel[];
  quietHours?: {
    start: string; // HH:mm format
    end: string; // HH:mm format
    timezone: string;
  };
  weddingDayOverride: boolean; // Override preferences on wedding day
  emergencyBypass: boolean; // Allow emergency notifications even if disabled
}

export interface WeddingEventData {
  weddingId: string;
  coupleId: string;
  brideName: string;
  groomName: string;
  weddingDate: string;
  ceremonyTime: string;
  receptionTime?: string;
  setupTime?: string;
  venueName: string;
  venueId?: string;
  guestCount: number;
  specialRequests?: string;
  dietaryRequirements?: string[];
  venueNotes?: string;
  updatedAt: string;
}

export interface EmailTriggerEventData {
  eventType: keyof RealtimeEventType;
  recipientEmail: string;
  templateId: string;
  variables: Record<string, any>;
  priority: EventPriority;
  sendAt?: string; // ISO date string for scheduled sending
  weddingId?: string;
  organizationId: string;
}

export interface SlackMessage {
  text: string;
  blocks?: Array<{
    type: string;
    text?: {
      type: string;
      text: string;
    };
    elements?: any[];
  }>;
  attachments?: Array<{
    color?: string;
    title?: string;
    text?: string;
    fields?: Array<{
      title: string;
      value: string;
      short?: boolean;
    }>;
  }>;
}

export interface EventRoutingConfig {
  webhooks: {
    enabled: boolean;
    endpoints?: string[];
  };
  notifications: {
    enabled: boolean;
    channels: NotificationChannel[];
    recipients?: string[];
  };
  externalIntegrations: {
    enabled: boolean;
    photographyCrm?: { enabled: boolean };
    venueBooking?: { enabled: boolean };
    emailPlatform?: { enabled: boolean };
  };
  metadata: RealtimeEventMetadata;
}

export interface NotificationConfig {
  channels: NotificationChannel[];
  priority: EventPriority;
  retryAttempts: number;
  delayBetweenRetries: number; // seconds
}

export interface ExternalIntegrationConfig {
  enabled: boolean;
  photographyCrm: {
    enabled: boolean;
    supportedSystems: string[];
  };
  venueBooking: {
    enabled: boolean;
    supportedSystems: string[];
  };
  emailPlatform: {
    enabled: boolean;
    supportedSystems: string[];
  };
}

export interface IntegrationHealthMetrics {
  integrationId: string;
  organizationId: string;
  serviceName: string;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy';
  lastSuccessAt?: string;
  lastFailureAt?: string;
  successRate: number; // percentage
  averageResponseTime: number; // milliseconds
  errorCount: number;
  uptime: number; // percentage
  updatedAt: string;
}

export interface WebhookDeliveryResult {
  endpointId: string;
  status: 'success' | 'failed' | 'timeout' | 'rate_limited';
  statusCode?: number;
  responseTime: number;
  errorMessage?: string;
  retryAttempt: number;
  deliveredAt: string;
}

export interface FormResponseData {
  responseId: string;
  formId: string;
  formName: string;
  clientId: string;
  clientName: string;
  supplierId: string;
  questionCount: number;
  submittedAt: string;
  responses: Array<{
    questionId: string;
    question: string;
    answer: any;
    questionType: string;
  }>;
}

export interface JourneyProgressData {
  journeyId: string;
  stepId: string;
  clientId: string;
  clientName: string;
  supplierId: string;
  milestoneName: string;
  completionPercentage: number;
  completedAt: string;
  nextSteps?: string[];
}

// Wedding Industry Specific Types

export interface WeddingVendorType {
  PHOTOGRAPHER: 'photographer';
  VIDEOGRAPHER: 'videographer';
  DJ: 'dj';
  BAND: 'band';
  FLORIST: 'florist';
  CATERER: 'caterer';
  VENUE: 'venue';
  OFFICIANT: 'officiant';
  BAKER: 'baker';
  BEAUTY: 'beauty';
  TRANSPORTATION: 'transportation';
  PLANNING: 'planning';
}

export interface WeddingTimelineEvent {
  id: string;
  weddingId: string;
  eventType: string;
  startTime: string;
  endTime?: string;
  description: string;
  vendorType?: keyof WeddingVendorType;
  vendorId?: string;
  location?: string;
  notes?: string;
  isConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WeddingEmergency {
  id: string;
  weddingId: string;
  emergencyType:
    | 'vendor_no_show'
    | 'weather'
    | 'venue_issue'
    | 'timeline_delay'
    | 'medical'
    | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedVendors: string[];
  suggestedActions: string[];
  status: 'reported' | 'investigating' | 'resolved' | 'escalated';
  reportedBy: string;
  reportedAt: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

// External System Integration Types

export interface ExternalSystemCredentials {
  type: 'api_key' | 'oauth2' | 'basic_auth' | 'custom';
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  username?: string;
  password?: string;
  customHeaders?: Record<string, string>;
  expiresAt?: string;
}

export interface ExternalIntegration {
  id: string;
  organizationId: string;
  systemName: string;
  systemType:
    | 'photography_crm'
    | 'venue_booking'
    | 'email_marketing'
    | 'communication';
  credentials: ExternalSystemCredentials;
  webhookUrl?: string;
  isActive: boolean;
  lastSyncAt?: string;
  nextSyncAt?: string;
  syncFrequency: number; // minutes
  healthStatus: 'healthy' | 'degraded' | 'unhealthy';
  createdAt: string;
  updatedAt: string;
}

// Error Types

export class RealtimeIntegrationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>,
  ) {
    super(message);
    this.name = 'RealtimeIntegrationError';
  }
}

export class WebhookDeliveryError extends RealtimeIntegrationError {
  constructor(
    message: string,
    public endpointUrl: string,
    public statusCode?: number,
    details?: Record<string, any>,
  ) {
    super(message, 'WEBHOOK_DELIVERY_ERROR', details);
    this.name = 'WebhookDeliveryError';
  }
}

export class NotificationDeliveryError extends RealtimeIntegrationError {
  constructor(
    message: string,
    public channel: NotificationChannel,
    public recipient: string,
    details?: Record<string, any>,
  ) {
    super(message, 'NOTIFICATION_DELIVERY_ERROR', details);
    this.name = 'NotificationDeliveryError';
  }
}

export class IntegrationSecurityError extends RealtimeIntegrationError {
  constructor(
    message: string,
    public securityIssue:
      | 'invalid_signature'
      | 'rate_limit_exceeded'
      | 'unauthorized'
      | 'pii_violation',
    details?: Record<string, any>,
  ) {
    super(message, 'INTEGRATION_SECURITY_ERROR', details);
    this.name = 'IntegrationSecurityError';
  }
}

// Utility Types

export type RealtimeEventHandler = (
  table: string,
  eventType: 'INSERT' | 'UPDATE' | 'DELETE',
  oldRecord: any,
  newRecord: any,
  metadata: RealtimeEventMetadata,
) => Promise<void>;

export type NotificationTemplate = {
  [K in keyof RealtimeEventType]: {
    email: {
      subject: string;
      templateId: string;
      variables: string[];
    };
    slack: {
      text: string;
      blocks: any[];
    };
    sms: {
      message: string;
      variables: string[];
    };
  };
};

// Configuration Types

export interface RealtimeIntegrationConfig {
  webhook: {
    timeoutMs: number;
    retryAttempts: number;
    retryDelayMs: number;
    maxPayloadSize: number;
  };
  notification: {
    batchSize: number;
    batchDelayMs: number;
    defaultChannels: NotificationChannel[];
  };
  security: {
    encryptionAlgorithm: string;
    signatureAlgorithm: string;
    rateLimitWindowMs: number;
    maxRequestsPerWindow: number;
  };
  monitoring: {
    healthCheckIntervalMs: number;
    alertThresholds: {
      errorRate: number;
      responseTime: number;
      uptime: number;
    };
  };
}
