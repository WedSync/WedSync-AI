/**
 * Outlook Calendar Integration Types
 * Comprehensive TypeScript interfaces for Microsoft Graph API integration
 *
 * For wedding professionals managing:
 * - Client consultations
 * - Venue visits
 * - Wedding day events
 * - Vendor coordination
 */

import { AccountInfo } from '@azure/msal-browser';

// Core Authentication Types
export interface OutlookAuthState {
  isAuthenticated: boolean;
  isInitializing: boolean;
  isTokenRefreshing: boolean;
  userAccount: AccountInfo | null;
  accessToken: string | null;
  error: string | null;
}

// OAuth Configuration
export interface OutlookOAuthConfig {
  clientId: string;
  authority: string;
  redirectUri: string;
  scopes: string[];
}

// Wedding-Specific Event Types
export interface WeddingCalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string; // ISO 8601 format
  end: string; // ISO 8601 format
  location?: string;
  type: WeddingEventType;
  priority: EventPriority;
  status: EventStatus;
  clientId?: string;
  weddingDate?: string;
  vendorIds?: string[];
  travelTimeBuffer?: number; // minutes
  reminderMinutes: number[];
  metadata?: WeddingEventMetadata;
  createdAt: string;
  updatedAt: string;
}

export type WeddingEventType =
  | 'consultation'
  | 'client_meeting'
  | 'venue_visit'
  | 'vendor_meeting'
  | 'engagement_shoot'
  | 'wedding_ceremony'
  | 'wedding_reception'
  | 'preparation'
  | 'rehearsal'
  | 'vendor_coordination'
  | 'equipment_prep'
  | 'editing_session'
  | 'delivery_meeting'
  | 'follow_up';

export type EventPriority = 'low' | 'medium' | 'high' | 'urgent';
export type EventStatus = 'tentative' | 'confirmed' | 'cancelled' | 'completed';

// Wedding Event Metadata
export interface WeddingEventMetadata {
  packageType?: 'basic' | 'standard' | 'premium' | 'luxury';
  estimatedRevenue?: number;
  guestCount?: number;
  specialRequirements?: string[];
  weatherContingency?: string;
  backupVenue?: string;
  emergencyContacts?: EmergencyContact[];
  equipmentNeeded?: string[];
  vendorNotes?: string;
}

export interface EmergencyContact {
  name: string;
  role: string;
  phone: string;
  email?: string;
}

// Sync Status and Progress
export interface OutlookSyncStatus {
  syncId: string;
  status: SyncStatusType;
  isRunning: boolean;
  progress: SyncProgress;
  startTime: string;
  endTime?: string;
  error?: string;
  conflicts: EventConflict[];
  lastSyncTime?: string;
}

export type SyncStatusType =
  | 'idle'
  | 'initializing'
  | 'syncing'
  | 'completed'
  | 'failed'
  | 'paused';

export interface SyncProgress {
  total: number;
  processed: number;
  created: number;
  updated: number;
  deleted: number;
  errors: number;
  currentAction: string;
  estimatedTimeRemaining?: number;
}

// Event Conflict Resolution
export interface EventConflict {
  conflictId: string;
  type: ConflictType;
  severity: ConflictSeverity;
  sourceEvent: WeddingCalendarEvent;
  conflictingEvent: WeddingCalendarEvent;
  suggestedResolution?: ConflictResolution;
  userResolution?: ConflictResolution;
  resolvedAt?: string;
  resolvedBy?: string;
}

export type ConflictType =
  | 'time_overlap'
  | 'double_booking'
  | 'travel_time_insufficient'
  | 'resource_conflict'
  | 'venue_unavailable'
  | 'weather_concern';

export type ConflictSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ConflictResolution {
  type: ResolutionType;
  action: string;
  newDateTime?: string;
  alternativeVenue?: string;
  additionalNotes?: string;
  impact: string[];
}

export type ResolutionType =
  | 'reschedule'
  | 'cancel'
  | 'modify_duration'
  | 'change_venue'
  | 'add_buffer_time'
  | 'assign_backup_photographer';

// Calendar Mapping and Configuration
export interface OutlookEventMapping {
  id: string;
  name: string;
  outlookCategory: string;
  weddingEventType: WeddingEventType;
  syncDirection: SyncDirection;
  fieldMappings: FieldMapping[];
  isActive: boolean;
  rules: MappingRule[];
}

export type SyncDirection =
  | 'bidirectional'
  | 'outlook_to_wedsync'
  | 'wedsync_to_outlook';

export interface FieldMapping {
  weddingSyncField: string;
  outlookField: string;
  transformation?: string;
  isRequired: boolean;
  defaultValue?: string;
}

export interface MappingRule {
  condition: string;
  action: string;
  parameters: Record<string, any>;
}

// Sync Settings and Preferences
export interface OutlookSyncSettings {
  userId: string;
  organizationId: string;
  syncFrequency: SyncFrequency;
  syncDirection: SyncDirection;
  enabledEventTypes: WeddingEventType[];
  conflictResolutionStrategy: ConflictResolutionStrategy;
  notificationPreferences: NotificationPreferences;
  calendarSettings: CalendarSettings;
  privacySettings: PrivacySettings;
  backupSettings: BackupSettings;
  createdAt: string;
  updatedAt: string;
}

export type SyncFrequency =
  | 'realtime'
  | 'every_5_minutes'
  | 'every_15_minutes'
  | 'hourly'
  | 'daily';

export type ConflictResolutionStrategy =
  | 'manual_review'
  | 'auto_reschedule'
  | 'prioritize_wedsync'
  | 'prioritize_outlook'
  | 'create_duplicate';

export interface NotificationPreferences {
  syncStarted: boolean;
  syncCompleted: boolean;
  syncErrors: boolean;
  conflictsDetected: boolean;
  reminderChanges: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  inAppNotifications: boolean;
}

export interface CalendarSettings {
  selectedCalendars: string[];
  timeZone: string;
  workingHours: WorkingHours;
  holidayCalendar?: string;
  bufferTimeMinutes: number;
  defaultEventDuration: number;
}

export interface WorkingHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface DaySchedule {
  isWorkingDay: boolean;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  breakTimes?: TimeSlot[];
}

export interface TimeSlot {
  start: string;
  end: string;
}

export interface PrivacySettings {
  shareClientNames: boolean;
  shareVenueDetails: boolean;
  shareFinancialInfo: boolean;
  anonymizeClientData: boolean;
  encryptSensitiveData: boolean;
}

export interface BackupSettings {
  enableAutoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  retentionDays: number;
  includeAttachments: boolean;
}

// Microsoft Graph API Types
export interface GraphCalendarEvent {
  id: string;
  subject: string;
  body?: {
    contentType: string;
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
    address?: {
      street: string;
      city: string;
      state: string;
      countryOrRegion: string;
      postalCode: string;
    };
  };
  attendees?: GraphAttendee[];
  categories: string[];
  importance: 'low' | 'normal' | 'high';
  sensitivity: 'normal' | 'personal' | 'private' | 'confidential';
  showAs:
    | 'free'
    | 'tentative'
    | 'busy'
    | 'oof'
    | 'workingElsewhere'
    | 'unknown';
  recurrence?: any;
  reminderMinutesBeforeStart?: number;
}

export interface GraphAttendee {
  emailAddress: {
    address: string;
    name?: string;
  };
  status: {
    response:
      | 'none'
      | 'organizer'
      | 'tentativelyAccepted'
      | 'accepted'
      | 'declined'
      | 'notResponded';
    time?: string;
  };
}

// Hook State and Actions
export interface UseOutlookSyncReturn {
  // Authentication state
  authState: OutlookAuthState;
  authenticate: () => Promise<boolean>;
  disconnect: () => Promise<void>;

  // Sync operations
  syncStatus: OutlookSyncStatus;
  syncEvents: (events: WeddingCalendarEvent[]) => Promise<boolean>;
  syncCalendars: () => Promise<boolean>;
  pauseSync: () => void;
  resumeSync: () => void;

  // Event management
  createEvent: (event: Partial<WeddingCalendarEvent>) => Promise<string>;
  updateEvent: (
    eventId: string,
    updates: Partial<WeddingCalendarEvent>,
  ) => Promise<boolean>;
  deleteEvent: (eventId: string) => Promise<boolean>;
  getEvents: (
    startDate: string,
    endDate: string,
  ) => Promise<WeddingCalendarEvent[]>;

  // Conflict resolution
  conflicts: EventConflict[];
  resolveConflict: (
    conflictId: string,
    resolution: ConflictResolution,
  ) => Promise<boolean>;
  detectConflicts: (events: WeddingCalendarEvent[]) => Promise<EventConflict[]>;

  // Settings management
  settings: OutlookSyncSettings | null;
  updateSettings: (updates: Partial<OutlookSyncSettings>) => Promise<boolean>;

  // Utility functions
  isHealthy: boolean;
  lastError: string | null;
  refreshTokens: () => Promise<boolean>;
  validateConnection: () => Promise<boolean>;
}

// Component Props Interfaces
export interface OutlookOAuthFlowProps {
  onSuccess?: (account: AccountInfo) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  className?: string;
}

export interface OutlookCalendarSyncProps {
  organizationId: string;
  userId: string;
  initialSettings?: Partial<OutlookSyncSettings>;
  onSyncComplete?: (status: OutlookSyncStatus) => void;
  onError?: (error: string) => void;
  className?: string;
}

export interface OutlookSyncStatusProps {
  syncStatus: OutlookSyncStatus;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  showDetails?: boolean;
  className?: string;
}

export interface OutlookEventMappingProps {
  mappings: OutlookEventMapping[];
  onMappingChange: (mappings: OutlookEventMapping[]) => void;
  onSave: () => Promise<boolean>;
  isLoading?: boolean;
  className?: string;
}

export interface OutlookSyncSettingsProps {
  settings: OutlookSyncSettings;
  onSettingsChange: (settings: OutlookSyncSettings) => void;
  onSave: () => Promise<boolean>;
  onTest: () => Promise<boolean>;
  isLoading?: boolean;
  className?: string;
}

// API Response Types
export interface OutlookApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  timestamp: string;
}

export interface OutlookSyncResult {
  success: boolean;
  syncId: string;
  eventsProcessed: number;
  eventsCreated: number;
  eventsUpdated: number;
  eventsDeleted: number;
  conflicts: EventConflict[];
  errors: string[];
  duration: number; // milliseconds
  nextSyncTime?: string;
}

// Error Types
export interface OutlookError {
  code: string;
  message: string;
  details?: string;
  timestamp: string;
  context?: Record<string, any>;
}

export type OutlookErrorCode =
  | 'AUTHENTICATION_FAILED'
  | 'TOKEN_EXPIRED'
  | 'INVALID_PERMISSIONS'
  | 'RATE_LIMIT_EXCEEDED'
  | 'NETWORK_ERROR'
  | 'API_ERROR'
  | 'SYNC_CONFLICT'
  | 'VALIDATION_ERROR'
  | 'CALENDAR_NOT_FOUND'
  | 'EVENT_NOT_FOUND';

// Wedding Professional Specific Types
export interface WeddingProfessionalProfile {
  id: string;
  name: string;
  businessName: string;
  specializationType:
    | 'photographer'
    | 'videographer'
    | 'planner'
    | 'venue'
    | 'florist'
    | 'catering'
    | 'dj'
    | 'other';
  serviceArea: {
    cities: string[];
    maxTravelDistance: number;
    travelFee?: number;
  };
  workingHours: WorkingHours;
  blackoutDates: string[];
  peakSeasonRates?: number;
  emergencyContact: EmergencyContact;
}

export interface WeddingBooking {
  id: string;
  clientId: string;
  weddingDate: string;
  venue: string;
  packageType: string;
  totalValue: number;
  status:
    | 'inquiry'
    | 'proposal'
    | 'contract'
    | 'confirmed'
    | 'completed'
    | 'cancelled';
  timeline: WeddingCalendarEvent[];
  specialRequirements: string[];
  vendorTeam: string[];
}
