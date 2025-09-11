/**
 * Helper Availability Sync Types for WedSync 2.0
 * Handles multi-platform availability synchronization and conflict resolution
 */

export interface AvailabilityWindow {
  id: string;
  helperId: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  isRecurring: boolean;
  recurrencePattern?: RecurrencePattern;
  status: AvailabilityStatus;
  source: AvailabilitySource;
  externalId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  interval: number; // Every N days/weeks/months
  daysOfWeek?: number[]; // 0-6, Sunday = 0
  endDate?: Date;
  exceptions?: Date[]; // Skip these dates
}

export type AvailabilityStatus =
  | 'available'
  | 'busy'
  | 'tentative'
  | 'out_of_office'
  | 'break'
  | 'blocked';

export type AvailabilitySource =
  | 'manual'
  | 'google_calendar'
  | 'outlook_calendar'
  | 'apple_calendar'
  | 'calendly'
  | 'acuity'
  | 'when2meet'
  | 'doodle';

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  conflictsResolved: number;
  errors: SyncError[];
  lastSyncTime: Date;
}

export interface SyncError {
  source: AvailabilitySource;
  error: string;
  itemId?: string;
  retryable: boolean;
}

export interface AvailabilityConflict {
  id: string;
  type: ConflictType;
  helperId: string;
  conflictingWindows: AvailabilityWindow[];
  suggestedResolution?: ConflictResolution;
  priority: 'high' | 'medium' | 'low';
  createdAt: Date;
}

export type ConflictType =
  | 'overlapping_availability'
  | 'double_booking'
  | 'timezone_mismatch'
  | 'outdated_sync';

export interface ConflictResolution {
  action: 'merge' | 'prioritize' | 'split' | 'manual';
  windowToKeep?: string;
  newWindows?: Partial<AvailabilityWindow>[];
  reason: string;
}

export interface CalendarProvider {
  id: string;
  name: string;
  type: AvailabilitySource;
  credentials: CalendarCredentials;
  syncEnabled: boolean;
  lastSync?: Date;
  syncDirection: 'bidirectional' | 'import_only' | 'export_only';
  settings: CalendarProviderSettings;
}

export interface CalendarCredentials {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  clientId?: string;
  apiKey?: string;
  webhookUrl?: string;
}

export interface CalendarProviderSettings {
  calendarIds?: string[];
  eventTypes?: string[];
  syncFrequency: number; // minutes
  timezone: string;
  includeAllDayEvents: boolean;
  conflictResolution: 'auto' | 'manual';
}

export interface AvailabilitySyncOptions {
  sources: AvailabilitySource[];
  direction: 'bidirectional' | 'import_only' | 'export_only';
  conflictResolution: 'auto' | 'manual';
  batchSize: number;
  retryAttempts: number;
  webhookEnabled: boolean;
}

export interface HelperWorkingHours {
  helperId: string;
  timezone: string;
  monday?: DayAvailability;
  tuesday?: DayAvailability;
  wednesday?: DayAvailability;
  thursday?: DayAvailability;
  friday?: DayAvailability;
  saturday?: DayAvailability;
  sunday?: DayAvailability;
  breaks: BreakWindow[];
  timeOff: TimeOffWindow[];
}

export interface DayAvailability {
  enabled: boolean;
  startTime: string; // HH:mm format
  endTime: string;
  breaks?: BreakWindow[];
}

export interface BreakWindow {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  recurring: boolean;
  daysOfWeek?: number[];
}

export interface TimeOffWindow {
  id: string;
  startDate: Date;
  endDate: Date;
  type: 'vacation' | 'sick' | 'personal' | 'other';
  reason?: string;
  approved: boolean;
}

export interface SyncQueueItem {
  id: string;
  helperId: string;
  operation: 'create' | 'update' | 'delete';
  source: AvailabilitySource;
  data: Partial<AvailabilityWindow>;
  priority: number;
  retryCount: number;
  scheduledAt: Date;
  processingAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface AvailabilitySyncStatus {
  helperId: string;
  lastSync?: Date;
  nextSync?: Date;
  activeProviders: CalendarProvider[];
  queuedOperations: number;
  pendingConflicts: number;
  syncHealth: 'healthy' | 'warning' | 'error';
  lastErrors: SyncError[];
}

export interface BulkSyncResult {
  totalHelpers: number;
  successCount: number;
  failureCount: number;
  results: Map<string, SyncResult>;
  startTime: Date;
  endTime: Date;
  duration: number; // milliseconds
}

// Webhook payload interfaces
export interface AvailabilityWebhookPayload {
  eventType:
    | 'availability_created'
    | 'availability_updated'
    | 'availability_deleted';
  helperId: string;
  organizationId: string;
  availability: AvailabilityWindow;
  source: AvailabilitySource;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ConflictWebhookPayload {
  eventType: 'conflict_detected' | 'conflict_resolved';
  helperId: string;
  organizationId: string;
  conflict: AvailabilityConflict;
  resolution?: ConflictResolution;
  timestamp: Date;
}

// Analytics and reporting interfaces
export interface AvailabilityMetrics {
  helperId: string;
  totalHoursAvailable: number;
  totalHoursBooked: number;
  utilizationRate: number; // percentage
  averageSessionLength: number; // minutes
  mostActiveSource: AvailabilitySource;
  conflictRate: number; // conflicts per sync
  syncFrequency: number; // syncs per day
  lastSyncSuccess: boolean;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface SyncPerformanceMetrics {
  source: AvailabilitySource;
  averageSyncTime: number; // milliseconds
  successRate: number; // percentage
  errorRate: number; // percentage
  apiCallsPerSync: number;
  rateLimitHits: number;
  lastSuccessfulSync: Date;
  lastError?: string;
}

// Integration-specific interfaces
export interface CalendlyIntegration {
  userUri: string;
  eventTypes: string[];
  availabilityRules: any[];
  webhookSubscriptions: string[];
}

export interface AcuityIntegration {
  userId: number;
  appointmentTypes: any[];
  availability: any[];
  webhookTargets: string[];
}

export interface GoogleCalendarIntegration {
  calendarList: Array<{
    id: string;
    summary: string;
    primary: boolean;
    accessRole: string;
  }>;
  watchChannels: string[];
}

export interface OutlookCalendarIntegration {
  calendars: Array<{
    id: string;
    name: string;
    owner: string;
    canEdit: boolean;
  }>;
  subscriptions: string[];
}

// Error handling and retry interfaces
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  exponentialBackoff: boolean;
  retryableErrors: string[];
}

export interface SyncFailureReason {
  code:
    | 'AUTH_EXPIRED'
    | 'RATE_LIMITED'
    | 'NETWORK_ERROR'
    | 'VALIDATION_ERROR'
    | 'UNKNOWN';
  message: string;
  retryable: boolean;
  retryAfter?: Date;
  context?: Record<string, any>;
}

// Mobile-specific interfaces
export interface MobileAvailabilitySync {
  isBackground: boolean;
  batteryOptimized: boolean;
  syncStrategy: 'aggressive' | 'balanced' | 'conservative';
  wifiOnly: boolean;
  lastBackgroundSync?: Date;
  pendingOfflineChanges: number;
}

// Admin and monitoring interfaces
export interface SystemAvailabilityHealth {
  totalActiveHelpers: number;
  totalActiveSyncs: number;
  avgSyncLatency: number; // milliseconds
  errorRate: number; // percentage
  queueBacklog: number;
  resourceUsage: {
    memory: number; // MB
    cpu: number; // percentage
    apiQuotaUsed: Record<AvailabilitySource, number>;
  };
  alerts: HealthAlert[];
}

export interface HealthAlert {
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  source: AvailabilitySource | 'system';
  timestamp: Date;
  resolved: boolean;
}

// Testing and development interfaces
export interface MockAvailabilityData {
  helperIds: string[];
  dateRange: {
    start: Date;
    end: Date;
  };
  conflictProbability: number; // 0-1
  sourcesEnabled: AvailabilitySource[];
}
