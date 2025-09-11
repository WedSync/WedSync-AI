/**
 * TypeScript type definitions for Apple Calendar Integration (WS-218)
 * CalDAV protocol types and interfaces for wedding professional workflows
 */

// Core CalDAV Types
export interface CalDAVCredentials {
  appleId: string;
  appPassword: string;
  serverUrl: string;
  isCustomServer: boolean;
}

export interface CalDAVConnection {
  url: string;
  credentials: CalDAVCredentials;
  headers: Record<string, string>;
  lastActivity: Date;
  connectionId?: string;
}

export interface CalDAVDiscoveryResult {
  calendars: CalendarInfo[];
  principalUrl?: string;
  calendarHomeUrl?: string;
  serverCapabilities: string[];
  supportedReports: string[];
}

// Calendar Information
export interface CalendarInfo {
  id: string;
  name: string;
  color: string;
  description?: string;
  isReadOnly: boolean;
  supportedComponents: CalDAVComponent[];
  ctag: string;
  syncToken?: string;
  displayOrder?: number;
  timezone?: string;
  calendarUrl?: string;
}

export type CalDAVComponent =
  | 'VEVENT'
  | 'VTODO'
  | 'VJOURNAL'
  | 'VFREEBUSY'
  | 'VTIMEZONE';

// Wedding-specific Event Types
export type WeddingEventType =
  | 'client_meeting'
  | 'venue_visit'
  | 'vendor_meeting'
  | 'wedding_ceremony'
  | 'wedding_reception'
  | 'engagement_shoot'
  | 'deadline'
  | 'task_due'
  | 'rehearsal'
  | 'bridal_party_meeting'
  | 'dress_fitting'
  | 'menu_tasting'
  | 'final_walkthrough'
  | 'setup_time'
  | 'breakdown_time';

// Calendar Event Structure
export interface CalendarEvent {
  id: string;
  uid?: string; // iCalendar UID
  title: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  description?: string;
  attendees?: CalendarAttendee[];
  eventType: WeddingEventType;
  priority: EventPriority;
  weddingDate?: Date;
  clientId?: string;
  vendorId?: string;
  lastModified: Date;
  etag?: string;

  // Wedding-specific fields
  weddingRole?: WeddingRole;
  isAllDay?: boolean;
  reminderMinutes?: number[];
  isRecurring?: boolean;
  recurrenceRule?: string;
  parentEventId?: string;

  // Apple device sync preferences
  appleDeviceSync?: AppleDeviceSync;
  siriIntegration?: boolean;

  // CalDAV specific
  calendarId?: string;
  href?: string;
  sequence?: number;
}

export interface CalendarAttendee {
  email: string;
  name?: string;
  role: 'REQ-PARTICIPANT' | 'OPT-PARTICIPANT' | 'CHAIR' | 'NON-PARTICIPANT';
  status: 'NEEDS-ACTION' | 'ACCEPTED' | 'DECLINED' | 'TENTATIVE' | 'DELEGATED';
  rsvp?: boolean;
}

export type EventPriority = 'low' | 'medium' | 'high' | 'critical';

export type WeddingRole =
  | 'photographer'
  | 'videographer'
  | 'planner'
  | 'venue_coordinator'
  | 'florist'
  | 'caterer'
  | 'musician'
  | 'officiant'
  | 'vendor'
  | 'couple';

export interface AppleDeviceSync {
  iPhone: boolean;
  iPad: boolean;
  Mac: boolean;
  AppleWatch: boolean;
  carPlay?: boolean;
}

// Sync Status and Monitoring
export interface SyncStatus {
  isConnected: boolean;
  lastSync?: Date;
  syncProgress?: number;
  currentOperation?: string;
  calendarsDiscovered: number;
  eventsProcessed: number;
  conflictsFound: number;
  errorCount: number;

  // CalDAV specific status
  serverReachable?: boolean;
  authenticationValid?: boolean;
  quotaUsed?: number;
  quotaAvailable?: number;

  // Performance metrics
  avgSyncTime?: number;
  lastSyncDuration?: number;
  requestsPerMinute?: number;
}

// Conflict Resolution
export interface ConflictInfo {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  localEvent: CalendarEvent;
  remoteEvent: CalendarEvent;
  suggestedResolution?: ConflictResolution;
  weddingImpact?: WeddingImpact;

  // Conflict details
  conflictFields?: string[];
  timeDifference?: number; // in minutes
  locationConflict?: boolean;
  attendeeConflict?: string[];

  // Resolution tracking
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNotes?: string;
}

export type ConflictType =
  | 'time_overlap'
  | 'venue_conflict'
  | 'vendor_availability'
  | 'data_mismatch'
  | 'duplicate_event'
  | 'missing_event'
  | 'calendar_access'
  | 'timezone_mismatch';

export type ConflictSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ConflictResolution =
  | 'keep_local'
  | 'keep_remote'
  | 'merge'
  | 'manual'
  | 'skip'
  | 'create_new';

export type WeddingImpact = 'none' | 'minor' | 'major' | 'critical';

// Sync Settings and Configuration
export interface SyncSettings {
  syncDirection: SyncDirection;
  eventTypes: WeddingEventType[];
  syncFrequency: SyncFrequency;
  notifications: NotificationSettings;
  autoResolveConflicts: boolean;
  businessHoursOnly: boolean;
  timezone: string;

  // Apple-specific settings
  appleDevicePreferences: AppleDeviceSync;
  siriIntegrationEnabled: boolean;
  appleWatchComplications: boolean;

  // Advanced settings
  maxEventsPerSync?: number;
  syncWindowDays?: number; // how many days ahead to sync
  retryAttempts?: number;
  timeoutSeconds?: number;

  // Wedding professional presets
  professionalTemplate?: WeddingProfessionalTemplate;
  customEventMapping?: Record<string, WeddingEventType>;
}

export type SyncDirection = 'bidirectional' | 'to_apple' | 'from_apple';

export type SyncFrequency =
  | 'realtime'
  | 'every_5min'
  | 'hourly'
  | 'daily'
  | 'manual';

export interface NotificationSettings {
  syncComplete: boolean;
  conflictsFound: boolean;
  errors: boolean;
  deviceTypes: AppleDeviceType[];
  emailNotifications: boolean;
  pushNotifications: boolean;

  // Wedding day specific
  weddingDayAlerts: boolean;
  emergencyNotifications: boolean;
}

export type AppleDeviceType =
  | 'iPhone'
  | 'iPad'
  | 'Mac'
  | 'AppleWatch'
  | 'CarPlay';

export interface WeddingProfessionalTemplate {
  role: WeddingRole;
  name: string;
  description: string;
  defaultEventTypes: WeddingEventType[];
  defaultSyncSettings: Partial<SyncSettings>;
  calendarNamingConvention?: string;
  colorScheme?: Record<WeddingEventType, string>;
}

// CalDAV Protocol Types
export interface CalDAVRequest {
  method: 'PROPFIND' | 'REPORT' | 'GET' | 'PUT' | 'DELETE' | 'OPTIONS';
  url: string;
  headers: Record<string, string>;
  body?: string;
  depth?: '0' | '1' | 'infinity';
}

export interface CalDAVResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
  xmlDocument?: Document;
}

export interface CalDAVProperty {
  namespace: string;
  name: string;
  value?: string;
  children?: CalDAVProperty[];
}

// Error Handling
export interface CalDAVError extends Error {
  code: CalDAVErrorCode;
  status?: number;
  details?: string;
  serverResponse?: string;
  retryable?: boolean;
  userFriendlyMessage?: string;
}

export type CalDAVErrorCode =
  | 'CONNECTION_FAILED'
  | 'AUTHENTICATION_FAILED'
  | 'INVALID_CREDENTIALS'
  | 'SERVER_UNAVAILABLE'
  | 'QUOTA_EXCEEDED'
  | 'CALENDAR_NOT_FOUND'
  | 'EVENT_NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'INVALID_REQUEST'
  | 'SYNC_CONFLICT'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'MALFORMED_ICAL'
  | 'TIMEZONE_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

// Hook Return Types
export interface UseAppleCalendarSyncReturn {
  // State
  isAuthenticated: boolean;
  credentials: CalDAVCredentials | null;
  discoveredCalendars: CalendarInfo[];
  selectedCalendars: CalendarInfo[];
  syncStatus: SyncStatus;
  conflicts: ConflictInfo[];
  syncSettings: SyncSettings;
  isLoading: boolean;
  error: string | null;

  // Actions
  authenticate: (credentials: CalDAVCredentials) => Promise<boolean>;
  discoverCalendars: () => Promise<CalendarInfo[]>;
  syncEvents: () => Promise<void>;
  disconnect: () => void;
  setSelectedCalendars: (calendars: CalendarInfo[]) => void;
  setSyncSettings: (settings: SyncSettings) => void;
  setError: (error: string | null) => void;

  // Advanced actions
  resolveConflict: (conflictId: string, resolution: ConflictResolution) => void;
  retrySync: () => Promise<void>;
  forceSyncCalendar: (calendarId: string) => Promise<void>;
  exportEvents: (format: 'ical' | 'csv') => Promise<string>;
}

// Component Prop Types
export interface AppleCalendarSyncProps {
  className?: string;
  onSyncStatusChange?: (status: SyncStatus) => void;
  onConflictResolved?: (conflictId: string, resolution: string) => void;
  initialView?: AppleCalendarView;
  showAdvancedOptions?: boolean;
  weddingProfessionalMode?: boolean;
}

export type AppleCalendarView =
  | 'setup'
  | 'calendars'
  | 'status'
  | 'conflicts'
  | 'settings'
  | 'advanced';

export interface AppleCalDAVAuthProps {
  onAuthSuccess: (credentials: CalDAVCredentials) => void;
  onAuthError: (error: string) => void;
  isLoading?: boolean;
  showAdvancedOptions?: boolean;
}

export interface AppleCalendarSelectorProps {
  credentials: CalDAVCredentials;
  selectedCalendars: CalendarInfo[];
  onSelectionChange: (calendars: CalendarInfo[]) => void;
  eventTypes: WeddingEventType[];
  isLoading?: boolean;
}

export interface AppleSyncStatusProps {
  syncStatus: SyncStatus;
  onStartSync: () => Promise<void>;
  isLoading?: boolean;
  showDetailedMetrics?: boolean;
}

export interface AppleEventMappingProps {
  conflicts: ConflictInfo[];
  onConflictResolution: (
    conflictId: string,
    resolution: ConflictResolution,
  ) => void;
  syncSettings: SyncSettings;
  showAdvancedResolution?: boolean;
}

export interface AppleSyncSettingsProps {
  settings: SyncSettings;
  onSettingsSave: (settings: SyncSettings) => void;
  selectedCalendars: CalendarInfo[];
  availableTemplates?: WeddingProfessionalTemplate[];
}

// Utility Types
export type CalDAVSyncOperation =
  | 'discover'
  | 'sync'
  | 'create'
  | 'update'
  | 'delete';

export interface CalDAVSyncResult {
  operation: CalDAVSyncOperation;
  success: boolean;
  eventsProcessed: number;
  conflictsDetected: number;
  errors: CalDAVError[];
  duration: number;
  timestamp: Date;
}

// Apple Calendar Integration Metadata
export interface AppleCalendarIntegrationInfo {
  version: string;
  supportedCalDAVVersion: string[];
  supportedAppleDevices: AppleDeviceType[];
  maxConcurrentConnections: number;
  rateLimits: {
    requestsPerMinute: number;
    requestsPerHour: number;
    dailyQuota: number;
  };
  features: {
    bidirectionalSync: boolean;
    conflictResolution: boolean;
    realtimeUpdates: boolean;
    bulkOperations: boolean;
    webhookSupport: boolean;
  };
}
