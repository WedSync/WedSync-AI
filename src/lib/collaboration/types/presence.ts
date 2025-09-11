/**
 * WS-342 Real-Time Wedding Collaboration - Presence Types
 * Team B Backend Development - User presence and activity tracking
 */

// Presence Management
export interface PresenceManager {
  trackPresence(
    userId: string,
    weddingId: string,
    presence: PresenceState,
  ): Promise<void>;
  updatePresence(
    userId: string,
    updates: Partial<PresenceState>,
  ): Promise<void>;
  getActiveUsers(weddingId: string): Promise<UserPresence[]>;

  // Advanced presence features
  trackUserActivity(userId: string, activity: ActivityType): Promise<void>;
  detectIdleUsers(threshold: number): Promise<string[]>;
  broadcastPresenceUpdate(
    weddingId: string,
    presence: UserPresence,
  ): Promise<void>;

  // Wedding-specific presence
  setWeddingRole(
    userId: string,
    weddingId: string,
    role: WeddingRole,
  ): Promise<void>;
  trackCurrentTask(userId: string, task: WeddingTask): Promise<void>;
  updateAvailability(
    userId: string,
    availability: AvailabilityWindow[],
  ): Promise<void>;
}

export interface PresenceState {
  status: PresenceStatus;
  currentSection: string;
  activeDocument?: string;
  cursorPosition?: CursorPosition;
  typing?: boolean;
  lastActivity: Date;

  // Wedding-specific presence
  weddingRole: WeddingRole;
  currentTask?: string;
  availability: AvailabilityWindow[];

  // Device and location info
  deviceType: DeviceType;
  location?: GeographicLocation;
  timezone: string;
}

export type PresenceStatus =
  | 'online'
  | 'away'
  | 'busy'
  | 'offline'
  | 'do_not_disturb';

export type WeddingRole =
  | 'couple_primary'
  | 'couple_secondary'
  | 'wedding_planner'
  | 'vendor_photographer'
  | 'vendor_venue'
  | 'vendor_catering'
  | 'vendor_florist'
  | 'vendor_music'
  | 'vendor_transport'
  | 'vendor_other'
  | 'family_immediate'
  | 'family_extended'
  | 'bridal_party'
  | 'groomsmen'
  | 'friend'
  | 'coordinator'
  | 'admin';

export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'smart_watch';

export interface CursorPosition {
  x: number;
  y: number;
  elementId?: string;
  fieldName?: string;
}

export interface GeographicLocation {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  timezone: string;
}

export interface AvailabilityWindow {
  start: Date;
  end: Date;
  type: AvailabilityType;
  description?: string;
}

export type AvailabilityType =
  | 'available'
  | 'busy'
  | 'meeting'
  | 'wedding_event'
  | 'travel'
  | 'unavailable';

export interface UserPresence {
  userId: string;
  userInfo: PresenceUserInfo;
  presence: PresenceState;
  permissions: PresencePermissions;
  lastSeen: Date;
  sessionDuration: number;
}

export interface PresenceUserInfo {
  name: string;
  email: string;
  avatar?: string;
  role: WeddingRole;
  company?: string; // For vendors
  title?: string;
}

export interface PresencePermissions {
  canSeeOthersPresence: boolean;
  canSeeOthersActivity: boolean;
  canSendDirectMessages: boolean;
  canInitiateCalls: boolean;
  visibilityLevel: VisibilityLevel;
}

export type VisibilityLevel = 'hidden' | 'basic' | 'detailed' | 'full';

// Activity Tracking
export type ActivityType =
  | 'viewing_timeline'
  | 'editing_budget'
  | 'managing_vendors'
  | 'updating_guests'
  | 'uploading_photos'
  | 'messaging'
  | 'phone_call'
  | 'meeting'
  | 'site_visit'
  | 'admin_task';

export interface UserActivity {
  userId: string;
  type: ActivityType;
  details: ActivityDetails;
  timestamp: Date;
  duration?: number;
  location?: GeographicLocation;
}

export interface ActivityDetails {
  action: string;
  target?: string;
  metadata?: Record<string, any>;
  weddingContext?: WeddingActivityContext;
}

export interface WeddingActivityContext {
  weddingId: string;
  weddingPhase: WeddingPhase;
  daysUntilWedding: number;
  criticalActivity: boolean;
  relatedVendors?: string[];
}

export type WeddingPhase =
  | 'initial_planning'
  | 'vendor_selection'
  | 'detail_planning'
  | 'final_preparations'
  | 'wedding_week'
  | 'wedding_day'
  | 'post_wedding';

export interface WeddingTask {
  id: string;
  title: string;
  description: string;
  assignedTo: string[];
  dueDate: Date;
  priority: TaskPriority;
  status: TaskStatus;
  category: TaskCategory;
  estimatedDuration: number;
  dependencies?: string[];
}

export type TaskPriority =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'
  | 'wedding_day';
export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'review'
  | 'completed'
  | 'blocked';

export type TaskCategory =
  | 'venue'
  | 'catering'
  | 'photography'
  | 'music'
  | 'flowers'
  | 'transport'
  | 'attire'
  | 'invitations'
  | 'guests'
  | 'ceremony'
  | 'reception'
  | 'logistics'
  | 'legal'
  | 'admin';

// Collaboration-specific presence features
export interface CollaborativePresence {
  activeCollaborators: UserPresence[];
  currentlyEditing: Map<string, EditingInfo>;
  recentActivity: UserActivity[];
  conflictZones: ConflictZone[];
  teamCoordination: TeamCoordination;
}

export interface EditingInfo {
  userId: string;
  documentId: string;
  sectionId: string;
  startTime: Date;
  lockType: LockType;
}

export type LockType = 'soft' | 'hard' | 'advisory' | 'none';

export interface ConflictZone {
  id: string;
  type: ConflictType;
  involvedUsers: string[];
  location: string;
  severity: ConflictSeverity;
  suggestedResolution?: string;
}

export type ConflictType =
  | 'simultaneous_edit'
  | 'overlapping_tasks'
  | 'resource_conflict'
  | 'timeline_clash'
  | 'budget_dispute';

export type ConflictSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface TeamCoordination {
  activeTeams: CollaborationTeam[];
  crossTeamDependencies: TeamDependency[];
  communicationChannels: CommunicationChannel[];
}

export interface CollaborationTeam {
  id: string;
  name: string;
  members: string[];
  lead: string;
  focus: TeamFocus;
  currentActivity: string;
  availability: TeamAvailability;
}

export type TeamFocus =
  | 'planning'
  | 'coordination'
  | 'execution'
  | 'crisis_management'
  | 'client_service';

export interface TeamAvailability {
  onlineMembers: number;
  totalMembers: number;
  averageResponseTime: number;
  nextAvailableSlot?: Date;
}

export interface TeamDependency {
  fromTeam: string;
  toTeam: string;
  type: DependencyType;
  status: DependencyStatus;
  blockers?: string[];
}

export type DependencyType =
  | 'sequential'
  | 'parallel'
  | 'conditional'
  | 'resource_shared';

export type DependencyStatus =
  | 'waiting'
  | 'ready'
  | 'in_progress'
  | 'completed'
  | 'blocked';

export interface CommunicationChannel {
  id: string;
  type: ChannelType;
  participants: string[];
  topic: string;
  urgency: UrgencyLevel;
  lastActivity: Date;
}

export type ChannelType =
  | 'chat'
  | 'voice'
  | 'video'
  | 'screen_share'
  | 'collaborative_edit';
export type UrgencyLevel = 'low' | 'normal' | 'high' | 'urgent' | 'emergency';

// Analytics and insights
export interface PresenceAnalytics {
  totalActiveTime: number;
  peakCollaborationTimes: Date[];
  mostActiveUsers: UserActivitySummary[];
  collaborationPatterns: CollaborationPattern[];
  efficiencyMetrics: EfficiencyMetric[];
}

export interface UserActivitySummary {
  userId: string;
  totalTime: number;
  activitiesCount: number;
  collaborationsInitiated: number;
  averageResponseTime: number;
  productivityScore: number;
}

export interface CollaborationPattern {
  pattern: string;
  frequency: number;
  effectiveness: number;
  recommendedActions: string[];
}

export interface EfficiencyMetric {
  metric: string;
  value: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  benchmark: number;
  improvement_suggestions: string[];
}
