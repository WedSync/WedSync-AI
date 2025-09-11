// WS-336 Calendar Integration Types
// Universal type definitions for multi-provider calendar integration

export type CalendarProvider = 'google' | 'outlook' | 'apple';

export type WeddingEventType =
  | 'ceremony'
  | 'reception'
  | 'preparation'
  | 'vendor_setup'
  | 'vendor_breakdown'
  | 'travel'
  | 'buffer'
  | 'emergency_slot';

export type VendorRole =
  | 'photographer'
  | 'videographer'
  | 'florist'
  | 'caterer'
  | 'dj'
  | 'venue'
  | 'coordinator'
  | 'transport';

export type SyncStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'conflict';

export interface UnifiedWeddingEvent {
  // Core wedding context
  id: string;
  weddingId: string;
  timelineEventId: string;

  // Universal event properties
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  timezone: string; // IANA timezone identifier

  // Wedding-specific metadata
  eventType: WeddingEventType;
  vendorRole: VendorRole;
  isWeddingCritical: boolean;
  bufferTime?: {
    before: number; // minutes
    after: number; // minutes
  };

  // Multi-provider normalization
  location?: UnifiedLocation;
  attendees: UnifiedAttendee[];
  recurrence?: UnifiedRecurrence;

  // Provider tracking
  providerEvents: Map<CalendarProvider, ProviderEventData>;
  syncStatus: SyncStatus;
  conflicts: ConflictInfo[];

  // Wedding day protocol
  emergencyContacts: EmergencyContact[];
  backupPlans: BackupPlan[];
}

export interface ProviderEventData {
  providerId: string;
  externalEventId: string;
  lastSyncAt: Date;
  etag?: string; // For Google Calendar
  changeKey?: string; // For Outlook
  sequence?: number; // For CalDAV
  rawData: Record<string, unknown>;
}

export interface UnifiedLocation {
  name: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
  venueType: 'ceremony' | 'reception' | 'prep' | 'vendor_space' | 'other';
  parkingInfo?: string;
  accessInstructions?: string;
}

export interface UnifiedAttendee {
  email: string;
  name?: string;
  role: 'bride' | 'groom' | 'vendor' | 'coordinator' | 'family' | 'guest';
  responseStatus: 'accepted' | 'declined' | 'tentative' | 'unknown';
  isRequired: boolean;
  phoneNumber?: string;
}

export interface UnifiedRecurrence {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval?: number;
  count?: number;
  until?: Date;
  byWeekDay?: string[];
}

export interface ConflictInfo {
  type:
    | 'time_overlap'
    | 'double_booking'
    | 'venue_conflict'
    | 'vendor_unavailable';
  conflictingEventId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestedResolution?: string;
  autoResolvable: boolean;
}

export interface EmergencyContact {
  name: string;
  email: string;
  phone: string;
  role: string;
  isEmergencyOnly: boolean;
}

export interface BackupPlan {
  scenario: string;
  action: string;
  contacts: string[];
  priority: number;
}

// Calendar Connection and Authentication
export interface CalendarConnection {
  id: string;
  organizationId: string;
  provider: CalendarProvider;
  calendarId: string;
  providerUserId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  isActive: boolean;
  lastSyncAt?: Date;
  syncSettings: CalendarSyncSettings;
}

export interface CalendarSyncSettings {
  bidirectionalSync: boolean;
  conflictResolution: 'wedding_priority' | 'manual' | 'last_updated';
  syncFrequency: number; // minutes
  timezoneSettings: {
    defaultTimezone: string;
    autoDetect: boolean;
  };
  webhookEnabled: boolean;
  emergencyNotifications: boolean;
}

// API Response Types
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees: EventAttendee[];
  reminders: EventReminder[];
  calendarId: string;
  eventType?: string;
  weddingData?: WeddingEventData;
  businessData?: BusinessEventData;
}

export interface EventAttendee {
  email: string;
  name?: string;
  status: 'accepted' | 'declined' | 'tentative' | 'unknown';
}

export interface EventReminder {
  method: 'email' | 'popup' | 'sms';
  minutes: number;
}

export interface WeddingEventData {
  eventType: WeddingEventType;
  coupleName: string;
  guestCount?: number;
  serviceType: string;
  paymentStatus: 'paid' | 'partial' | 'pending';
}

export interface BusinessEventData {
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  cost?: number;
}

// Sync and Performance Types
export interface SyncResult {
  success: boolean;
  duration_ms: number;
  providers_synced: number;
  details: ProviderSyncResult[];
}

export interface ProviderSyncResult {
  provider: CalendarProvider;
  success: boolean;
  duration_ms: number;
  api_calls: number;
  cache_hits: number;
  error?: string;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface BatchResult {
  successful: string[];
  failed: Array<{ id: string; error: string }>;
  totalProcessed: number;
}

// Webhook Types
export interface WebhookSubscription {
  webhookId: string;
  channelId: string;
  resourceId?: string;
  expirationTime?: Date;
  provider: CalendarProvider;
}

export interface WebhookEvent {
  provider: CalendarProvider;
  resourceId: string;
  changeType: 'created' | 'updated' | 'deleted';
  timestamp: Date;
  payload: Record<string, unknown>;
  signature?: string;
  priority?: 'wedding_day_critical' | 'high' | 'normal' | 'low';
}

// Rate Limiting Types
export interface RateLimitResult {
  allowed: boolean;
  remainingRequests: number;
  burstRemaining?: number;
  resetTime: number;
  usingBurst?: boolean;
}

// Error Types
export interface CalendarError {
  code: string;
  message: string;
  platform: CalendarProvider;
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  timestamp: Date;
}

// Health Monitoring Types
export interface HealthStatus {
  provider: CalendarProvider;
  status: 'healthy' | 'degraded' | 'critical';
  responseTime: number;
  errorRate: number;
  rateLimitUsage: number;
  lastChecked: Date;
}

export interface SyncMetrics {
  wedding_id?: string;
  event_id?: string;
  total_duration_ms: number;
  providers_synced: number;
  success_count: number;
  is_wedding_day: boolean;
}

// Wedding Day Types
export interface WeddingDayEvent {
  wedding_id: string;
  wedding_date: string;
  couple_names: string;
  venue_name: string;
  event_id: string;
  event_name: string;
  event_start_time: Date;
  event_end_time: Date;
  event_type: string;
  priority: string;
  calendar_connection_id: string;
  provider_type: CalendarProvider;
  calendar_id: string;
  vendor_id: string;
  vendor_name: string;
  subscription_tier: string;
}

export interface PerformanceReport {
  total_syncs: number;
  avg_sync_duration: number;
  p95_sync_duration: number;
  wedding_day_syncs: number;
  cache_hit_rate: number;
  api_efficiency: number;
  provider_performance: Record<CalendarProvider, number>;
}
