/**
 * Wedding Day Coordination Module Types
 * Real-time vendor coordination and timeline management
 */

export interface VendorCheckIn {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorType:
    | 'photographer'
    | 'florist'
    | 'caterer'
    | 'dj'
    | 'band'
    | 'officiant'
    | 'venue'
    | 'other';
  checkInTime: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  status: 'pending' | 'checked-in' | 'on-site' | 'completed' | 'delayed';
  eta?: string;
  delayReason?: string;
  delayMinutes?: number;
  notes?: string;
  contact: {
    phone: string;
    email: string;
  };
  assignedTasks: string[];
}

export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  duration: number; // minutes
  status: 'pending' | 'in-progress' | 'completed' | 'delayed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  location?: string;
  assignedVendors: string[];
  dependencies?: string[]; // other event IDs
  requirements?: string[];
  notes?: string;
  delayMinutes?: number;
  delayReason?: string;
  weather_dependent: boolean;
  buffer_time: number; // minutes
  created_by: string;
  updated_at: string;
}

export interface WeddingDayIssue {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in-progress' | 'resolved' | 'escalated';
  category:
    | 'vendor'
    | 'timeline'
    | 'weather'
    | 'technical'
    | 'logistics'
    | 'other';
  affectedVendors?: string[];
  affectedEvents?: string[];
  reportedBy: string;
  assignedTo?: string;
  estimatedResolutionTime?: number; // minutes
  actualResolutionTime?: number; // minutes
  resolution?: string;
  escalation_level: number;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface WeatherCondition {
  condition: 'clear' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog';
  temperature: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  visibility: number;
  timestamp: string;
  forecast?: WeatherForecast[];
}

export interface WeatherForecast {
  time: string;
  condition: string;
  temperature: number;
  precipitation: number;
}

export interface WeddingDayCoordination {
  id: string;
  weddingId: string;
  coordinatorId: string;
  weddingDate: string;
  venue: {
    name: string;
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    contact: {
      phone: string;
      email: string;
    };
  };
  timeline: TimelineEvent[];
  vendors: VendorCheckIn[];
  issues: WeddingDayIssue[];
  weather: WeatherCondition;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  emergency_contacts: Array<{
    name: string;
    role: string;
    phone: string;
    email: string;
  }>;
  backup_plans: Array<{
    id: string;
    scenario: string;
    plan: string;
    triggers: string[];
  }>;
  communication_preferences: {
    sms_enabled: boolean;
    email_enabled: boolean;
    push_enabled: boolean;
    escalation_chain: string[];
  };
  settings: {
    auto_delay_buffer: number; // minutes
    weather_alert_threshold: number; // precipitation %
    issue_escalation_time: number; // minutes
    vendor_checkin_reminder_time: number; // minutes before event
  };
  created_at: string;
  updated_at: string;
}

export interface RealtimeUpdate {
  type:
    | 'vendor_checkin'
    | 'timeline_update'
    | 'issue_created'
    | 'issue_resolved'
    | 'weather_alert'
    | 'coordinator_message';
  data: any;
  timestamp: string;
  userId: string;
  weddingId: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface CoordinatorPresence {
  userId: string;
  coordinatorName: string;
  role: 'lead' | 'assistant' | 'vendor_liaison' | 'emergency';
  status: 'active' | 'busy' | 'unavailable' | 'offline';
  currentLocation?: {
    lat: number;
    lng: number;
    label?: string;
  };
  lastSeen: string;
  permissions: string[];
}

export interface VendorCommunication {
  id: string;
  weddingId: string;
  vendorId: string;
  message: string;
  type:
    | 'check_in'
    | 'delay_notification'
    | 'issue_report'
    | 'status_update'
    | 'emergency';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  sender: {
    id: string;
    name: string;
    role: string;
  };
  attachments?: Array<{
    type: 'image' | 'document';
    url: string;
    name: string;
  }>;
  created_at: string;
  read_at?: string;
}

export interface OfflineQueueItem {
  id: string;
  type: 'vendor_checkin' | 'timeline_update' | 'issue_create' | 'communication';
  data: any;
  timestamp: string;
  retries: number;
  maxRetries: number;
  lastAttempt?: string;
}

// Store types for Zustand offline support
export interface WeddingDayStore {
  coordination: WeddingDayCoordination | null;
  isOffline: boolean;
  offlineQueue: OfflineQueueItem[];
  lastSync: string | null;

  // Actions
  setCoordination: (coordination: WeddingDayCoordination) => void;
  updateVendorStatus: (
    vendorId: string,
    update: Partial<VendorCheckIn>,
  ) => void;
  updateTimelineEvent: (
    eventId: string,
    update: Partial<TimelineEvent>,
  ) => void;
  createIssue: (
    issue: Omit<WeddingDayIssue, 'id' | 'created_at' | 'updated_at'>,
  ) => void;
  resolveIssue: (issueId: string, resolution: string) => void;
  addOfflineAction: (
    action: Omit<OfflineQueueItem, 'id' | 'timestamp'>,
  ) => void;
  processOfflineQueue: () => Promise<void>;
  setOfflineStatus: (offline: boolean) => void;
  updateLastSync: () => void;
}

// Real-time event types
export interface WeddingDayRealtimeEvents {
  'vendor:checkin': VendorCheckIn;
  'vendor:status_update': {
    vendorId: string;
    status: VendorCheckIn['status'];
    eta?: string;
  };
  'timeline:event_update': { eventId: string; update: Partial<TimelineEvent> };
  'timeline:reorder': { newOrder: string[] };
  'issue:created': WeddingDayIssue;
  'issue:updated': { issueId: string; update: Partial<WeddingDayIssue> };
  'weather:alert': { alert: WeatherCondition; affectedEvents: string[] };
  'coordinator:presence': CoordinatorPresence;
  'communication:message': VendorCommunication;
  'emergency:alert': {
    message: string;
    severity: 'medium' | 'high' | 'critical';
  };
}

// API response types
export interface WeddingDayApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface VendorCheckInRequest {
  vendorId: string;
  location: {
    lat: number;
    lng: number;
  };
  notes?: string;
}

export interface TimelineAdjustmentRequest {
  eventId: string;
  newStartTime?: string;
  newEndTime?: string;
  reason?: string;
  cascadeChanges: boolean;
}

export interface IssueCreateRequest {
  title: string;
  description: string;
  severity: WeddingDayIssue['severity'];
  category: WeddingDayIssue['category'];
  affectedVendors?: string[];
  affectedEvents?: string[];
}
