// =====================================================
// WEDDING TIMELINE BUILDER TYPES
// =====================================================
// Interactive timeline with drag-drop, vendor coordination, and real-time collaboration
// Feature ID: WS-076
// Created: 2025-01-22
// =====================================================

// =====================================================
// CORE TIMELINE TYPES
// =====================================================

export interface WeddingTimeline {
  id: string;
  organization_id: string;
  client_id: string;

  // Basic Information
  name: string;
  wedding_date: string; // ISO date
  timezone: string;

  // Timeline Settings
  start_time: string; // HH:mm format
  end_time: string; // HH:mm format
  buffer_time_minutes: number;

  // Collaboration Settings
  allow_vendor_edits: boolean;
  require_approval: boolean;

  // Version Control
  version: number;
  published_version?: number;
  is_published: boolean;
  published_at?: string;

  // Status
  status: 'draft' | 'review' | 'approved' | 'final';

  // Metadata
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;

  // Relations (populated via joins)
  events?: TimelineEvent[];
  collaborators?: TimelineCollaborator[];
  conflicts?: TimelineConflict[];
}

export interface TimelineEvent {
  id: string;
  timeline_id: string;

  // Event Information
  title: string;
  description?: string;
  event_type?: EventType;
  category?: EventCategory;

  // Timing
  start_time: string; // ISO datetime
  end_time: string; // ISO datetime
  duration_minutes?: number; // Calculated field

  // Location
  location?: string;
  location_details?: string;
  coordinates?: { lat: number; lng: number };

  // Priority & Status
  priority: EventPriority;
  status: EventStatus;

  // Dependencies
  depends_on?: string[]; // Array of event IDs
  buffer_before_minutes?: number;
  buffer_after_minutes?: number;

  // Flexibility
  is_locked: boolean;
  is_flexible: boolean;
  min_duration_minutes?: number;
  max_duration_minutes?: number;

  // Weather & Conditions
  weather_dependent: boolean;
  backup_plan?: string;

  // Visual
  color?: string; // Hex color
  icon?: string;

  // Ordering
  display_order?: number;
  layer?: number; // For overlapping events

  // Notes
  internal_notes?: string;
  vendor_notes?: string;

  // Metadata
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;

  // Relations
  vendors?: TimelineEventVendor[];
  comments?: TimelineComment[];
}

export interface TimelineEventVendor {
  id: string;
  event_id: string;
  vendor_id: string;

  // Assignment Details
  role?: 'primary' | 'support' | 'backup';
  responsibilities?: string;

  // Timing
  arrival_time?: string;
  departure_time?: string;
  setup_time_minutes?: number;
  breakdown_time_minutes?: number;

  // Status
  confirmation_status: VendorConfirmationStatus;
  confirmed_at?: string;
  confirmed_by?: string;

  // Notes
  vendor_notes?: string;

  // Metadata
  assigned_at: string;
  assigned_by?: string;

  // Relations
  vendor?: VendorInfo;
}

export interface TimelineConflict {
  id: string;
  timeline_id: string;

  // Conflict Details
  conflict_type: ConflictType;
  severity: ConflictSeverity;

  // Events Involved
  event_id_1: string;
  event_id_2?: string;

  // Description
  description: string;
  suggestion?: string;

  // Resolution
  is_resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;

  // Auto-resolve Options
  can_auto_resolve: boolean;
  auto_resolution_action?: any;

  // Metadata
  detected_at: string;
  last_checked_at: string;

  // Relations
  event_1?: TimelineEvent;
  event_2?: TimelineEvent;
}

export interface TimelineTemplate {
  id: string;
  organization_id: string;

  // Template Information
  name: string;
  description?: string;
  category?: string;

  // Template Data
  template_events: TemplateEvent[];
  default_duration_hours: number;

  // Usage
  is_public: boolean;
  usage_count: number;

  // Metadata
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// =====================================================
// COLLABORATION TYPES
// =====================================================

export interface TimelineCollaborator {
  id: string;
  timeline_id: string;
  user_id: string;

  // Permissions
  role: CollaboratorRole;
  can_edit: boolean;
  can_comment: boolean;
  can_share: boolean;

  // Status
  status: CollaboratorStatus;
  invited_at: string;
  accepted_at?: string;

  // Activity
  last_viewed_at?: string;
  is_currently_viewing: boolean;

  // Relations
  user?: UserInfo;
}

export interface TimelineActivityLog {
  id: string;
  timeline_id: string;

  // Activity Details
  action: ActivityAction;
  entity_type?: string;
  entity_id?: string;

  // Changes
  old_values?: any;
  new_values?: any;

  // User
  user_id?: string;
  user_name?: string;
  user_role?: string;

  // Metadata
  created_at: string;
}

export interface TimelineComment {
  id: string;
  timeline_id: string;
  event_id: string;

  // Comment
  comment: string;

  // Threading
  parent_comment_id?: string;

  // Status
  is_resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;

  // User
  user_id?: string;
  user_name?: string;
  user_role?: string;

  // Metadata
  created_at: string;
  updated_at: string;

  // Relations
  replies?: TimelineComment[];
}

// =====================================================
// DRAG & DROP TYPES
// =====================================================

export interface DragItem {
  id: string;
  type: 'event';
  event: TimelineEvent;
  originalIndex: number;
  originalTime: string;
}

export interface DropResult {
  event_id: string;
  new_start_time: string;
  new_end_time: string;
  new_layer?: number;
}

export interface TimelinePosition {
  x: number; // Pixel position on timeline
  y: number; // Layer position
  time: Date; // Calculated time from position
}

// =====================================================
// REALTIME TYPES
// =====================================================

export interface RealtimePresence {
  user_id: string;
  user_name: string;
  user_avatar?: string;
  cursor_position?: TimelinePosition;
  selected_event_id?: string;
  is_editing?: boolean;
  last_activity: string;
}

export interface RealtimeUpdate {
  type:
    | 'event_update'
    | 'event_create'
    | 'event_delete'
    | 'conflict_detected'
    | 'comment_added';
  payload: any;
  user_id: string;
  timestamp: string;
}

// =====================================================
// ENUMS
// =====================================================

export type EventType =
  | 'ceremony'
  | 'reception'
  | 'photos'
  | 'setup'
  | 'breakdown'
  | 'preparation'
  | 'cocktails'
  | 'dinner'
  | 'dancing'
  | 'entertainment'
  | 'transition'
  | 'vendor_arrival'
  | 'vendor_departure'
  | 'other';

export type EventCategory =
  | 'preparation'
  | 'ceremony'
  | 'cocktails'
  | 'reception'
  | 'party'
  | 'logistics';

export type EventPriority = 'low' | 'medium' | 'high' | 'critical';

export type EventStatus =
  | 'pending'
  | 'confirmed'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
  | 'delayed';

export type VendorConfirmationStatus = 'pending' | 'confirmed' | 'declined';

export type ConflictType =
  | 'time_overlap'
  | 'vendor_overlap'
  | 'location_conflict'
  | 'dependency_issue';

export type ConflictSeverity = 'info' | 'warning' | 'error';

export type CollaboratorRole = 'owner' | 'editor' | 'viewer';

export type CollaboratorStatus = 'active' | 'invited' | 'removed';

export type ActivityAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'moved'
  | 'assigned'
  | 'commented'
  | 'resolved';

// =====================================================
// HELPER TYPES
// =====================================================

export interface TemplateEvent {
  title: string;
  duration: number; // minutes
  event_type: EventType;
  offset: number; // minutes from start
  category?: EventCategory;
  description?: string;
  vendor_types?: string[];
}

export interface VendorInfo {
  id: string;
  business_name: string;
  business_type: string;
  email: string;
  phone?: string;
  avatar_url?: string;
}

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  role?: string;
}

export interface TimelineStatistics {
  total_events: number;
  confirmed_events: number;
  total_vendors: number;
  confirmed_vendors: number;
  total_duration_hours: number;
  unresolved_conflicts: number;
}

export interface TimelineExport {
  format: 'pdf' | 'csv' | 'excel' | 'ical' | 'google';
  include_vendor_details: boolean;
  include_internal_notes: boolean;
  timezone?: string;
  // Export filtering options
  date_range?: {
    start?: string;
    end?: string;
  };
  event_types?: EventType[];
  vendor_id?: string;
  // Export customization
  branding?: {
    logo_url?: string;
    company_name?: string;
    footer_text?: string;
  };
  file_security?: {
    password_protected?: boolean;
    expiry_hours?: number;
  };
}

// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

export interface CreateTimelineRequest {
  name: string;
  wedding_date: string;
  client_id: string;
  start_time?: string;
  end_time?: string;
  timezone?: string;
  template_id?: string;
}

export interface UpdateTimelineRequest {
  name?: string;
  status?: 'draft' | 'review' | 'approved' | 'final';
  allow_vendor_edits?: boolean;
  require_approval?: boolean;
}

export interface CreateEventRequest {
  timeline_id: string;
  title: string;
  start_time: string;
  end_time: string;
  event_type?: EventType;
  category?: EventCategory;
  location?: string;
  description?: string;
  priority?: EventPriority;
  vendor_ids?: string[];
}

export interface UpdateEventRequest {
  title?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  description?: string;
  priority?: EventPriority;
  status?: EventStatus;
  vendor_ids?: string[];
}

export interface MoveEventRequest {
  event_id: string;
  new_start_time: string;
  new_end_time: string;
  resolve_conflicts?: boolean;
}

export interface AssignVendorRequest {
  event_id: string;
  vendor_id: string;
  role?: 'primary' | 'support' | 'backup';
  responsibilities?: string;
  arrival_time?: string;
  departure_time?: string;
}

export interface TimelineFilterOptions {
  date_from?: string;
  date_to?: string;
  status?: 'draft' | 'review' | 'approved' | 'final';
  client_id?: string;
  search?: string;
}

export interface EventFilterOptions {
  timeline_id: string;
  event_type?: EventType;
  category?: EventCategory;
  status?: EventStatus;
  vendor_id?: string;
  date?: string;
}
