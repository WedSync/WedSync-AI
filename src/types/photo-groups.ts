// Photo Groups Management Types - WS-153
export interface PhotoGroup {
  id: string;
  couple_id: string;
  name: string;
  description?: string;
  photo_type:
    | 'family'
    | 'friends'
    | 'bridal_party'
    | 'groomsmen'
    | 'bridesmaids'
    | 'children'
    | 'special'
    | 'formal'
    | 'candid';
  priority: number;
  estimated_time_minutes: number;
  location?: string;
  timeline_slot?: string;
  photographer_notes?: string;
  created_at: string;
  updated_at: string;

  // Relations
  assignments?: PhotoGroupAssignment[];
}

export interface PhotoGroupAssignment {
  id: string;
  photo_group_id: string;
  guest_id: string;
  is_primary: boolean;
  position_notes?: string;
  created_at: string;

  // Relations
  guest?: {
    id: string;
    first_name: string;
    last_name: string;
    side: 'partner1' | 'partner2' | 'mutual';
    category: 'family' | 'friends' | 'work' | 'other';
  };
}

// Form Data Types
export interface PhotoGroupFormData {
  name: string;
  description?: string;
  photo_type: PhotoGroup['photo_type'];
  estimated_time_minutes: number;
  location?: string;
  timeline_slot?: string;
  photographer_notes?: string;
  guest_ids: string[];
}

export interface PhotoGroupFormErrors {
  [key: string]: string | undefined;
}

// Drag and Drop Types
export interface DragDropContextData {
  sourceGroupId?: string;
  destinationGroupId?: string;
  guestId?: string;
  dragType: 'guest' | 'group';
}

export interface DroppableData {
  type: 'group' | 'unassigned' | 'group-members';
  groupId?: string;
}

export interface DraggableData {
  type: 'guest' | 'group';
  id: string;
  groupId?: string;
}

// State Management Types
export interface PhotoGroupsState {
  groups: PhotoGroup[];
  loading: boolean;
  error: Error | null;
  creating: boolean;
  updating: boolean;
  deleting: Set<string>;
}

export interface PhotoGroupConflict {
  groupId: string;
  conflictingGroupId: string;
  reason: 'time_overlap' | 'guest_overlap' | 'location_conflict';
  severity: 'warning' | 'error';
  message: string;
}

export interface PhotoGroupFilters {
  search: string;
  photo_type: PhotoGroup['photo_type'] | 'all';
  has_conflicts: boolean;
  priority_range?: [number, number];
  timeline_slot?: string;
}

export interface PhotoGroupSort {
  field: 'priority' | 'name' | 'created_at' | 'estimated_time_minutes';
  direction: 'asc' | 'desc';
}

// Guest Integration Types
export interface AvailableGuest {
  id: string;
  first_name: string;
  last_name: string;
  side: 'partner1' | 'partner2' | 'mutual';
  category: 'family' | 'friends' | 'work' | 'other';
  assigned_groups: string[];
  conflicts: PhotoGroupConflict[];
}

export interface GuestAssignmentAction {
  type: 'assign' | 'unassign' | 'reassign';
  guestId: string;
  sourceGroupId?: string;
  targetGroupId: string;
  position?: number;
}

// Performance Types
export interface VirtualScrollConfig {
  itemHeight: number;
  containerHeight: number;
  overscan: number;
  threshold: number;
}

export interface PhotoGroupMetrics {
  total_groups: number;
  total_assignments: number;
  estimated_total_time: number;
  groups_with_conflicts: number;
  unassigned_guests: number;
  priority_conflicts: PhotoGroupConflict[];
}

// API Response Types
export interface PhotoGroupsResponse {
  success: boolean;
  data: PhotoGroup[];
  metrics: PhotoGroupMetrics;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface PhotoGroupResponse {
  success: boolean;
  data: PhotoGroup;
  conflicts?: PhotoGroupConflict[];
}

export interface BulkAssignmentResponse {
  success: boolean;
  updated_count: number;
  conflicts: PhotoGroupConflict[];
  errors?: { guest_id: string; error: string }[];
}

// Timeline Management Types
export interface TimelineSlot {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  available_minutes: number;
  assigned_groups: PhotoGroup[];
}

export interface TimelineConflict {
  slot_id: string;
  total_estimated_time: number;
  available_time: number;
  conflicting_groups: PhotoGroup[];
}

// Photo Type Configurations
export interface PhotoTypeConfig {
  type: PhotoGroup['photo_type'];
  label: string;
  icon: string;
  color: string;
  typical_duration: number;
  max_guests?: number;
  required_roles?: string[];
}

// Keyboard Shortcuts
export interface PhotoGroupShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: string;
  description: string;
  context: 'global' | 'group' | 'guest';
}

// Mobile Touch Interactions
export interface TouchGesture {
  type: 'tap' | 'long_press' | 'swipe' | 'pinch';
  target: 'group' | 'guest' | 'background';
  action: string;
  threshold?: number;
}

// Real-time Updates
export interface PhotoGroupRealtimeUpdate {
  type:
    | 'group_created'
    | 'group_updated'
    | 'group_deleted'
    | 'assignment_changed';
  group_id: string;
  couple_id: string;
  data?: Partial<PhotoGroup>;
  timestamp: string;
  user_id: string;
}

// Export and Sharing Types
export interface PhotoGroupExportConfig {
  format: 'pdf' | 'csv' | 'json';
  include_guest_details: boolean;
  include_photographer_notes: boolean;
  include_timeline: boolean;
  group_by: 'priority' | 'timeline' | 'type';
}

export interface PhotoGroupExportResult {
  success: boolean;
  download_url?: string;
  file_name: string;
  file_size: number;
  group_count: number;
  guest_count: number;
  error?: string;
}
