/**
 * WS-342 Real-Time Wedding Collaboration - Core Types
 * Team B Backend Development - Core collaboration type definitions
 */

export interface CollaborationServer {
  websocketManager: WebSocketManager;
  eventStreaming: EventStreamingService;
  presenceManager: PresenceManager;
  conflictResolver: ConflictResolutionEngine;
  dataSync: DataSynchronizationService;
}

export interface WebSocketManager {
  connections: Map<string, WebSocketConnection>;
  rooms: Map<string, CollaborationRoom>;

  // Connection lifecycle
  handleConnection(
    userId: string,
    weddingId: string,
  ): Promise<WebSocketConnection>;
  handleDisconnection(userId: string): Promise<void>;
  broadcastToRoom(roomId: string, event: CollaborationEvent): Promise<void>;

  // Scaling and performance
  loadBalance(): Promise<void>;
  healthCheck(): Promise<ServerHealth>;
}

export interface WebSocketConnection {
  id: string;
  userId: string;
  weddingId: string;
  socket: any; // WebSocket type
  lastSeen: Date;
  permissions: CollaborationPermissions;
  presence: PresenceState;
}

export interface CollaborationRoom {
  id: string;
  weddingId: string;
  activeUsers: Set<string>;
  eventHistory: CollaborationEvent[];
  permissions: Map<string, CollaborationPermissions>;
  created_at: Date;
}

export interface CollaborationPermissions {
  canEdit: boolean;
  canView: boolean;
  canInvite: boolean;
  canManageTimeline: boolean;
  canManageBudget: boolean;
  canManageVendors: boolean;
  canManageGuests: boolean;
  role: CollaborationRole;
}

export type CollaborationRole =
  | 'owner'
  | 'partner'
  | 'planner'
  | 'vendor'
  | 'family'
  | 'friend'
  | 'admin';

export interface ServerHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  connectionCount: number;
  memoryUsage: number;
  cpuUsage: number;
  latency: number;
  errors: string[];
}

export interface CollaborationSession {
  id: string;
  weddingId: string;
  userId: string;
  sessionToken: string;
  permissions: CollaborationPermissions;
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
}

// Event Streaming Types
export interface EventStreamingService {
  publishEvent(event: CollaborationEvent): Promise<void>;
  subscribeToEvents(roomId: string, callback: EventCallback): Promise<void>;
  getEventHistory(roomId: string, since?: Date): Promise<CollaborationEvent[]>;

  // Event processing
  processEventBatch(events: CollaborationEvent[]): Promise<void>;
  handleEventConflict(conflict: EventConflict): Promise<ResolutionResult>;
}

export interface CollaborationEvent {
  id: string;
  type: CollaborationEventType;
  weddingId: string;
  userId: string;
  timestamp: Date;
  data: any;
  metadata: EventMetadata;

  // Conflict resolution
  vectorClock: VectorClock;
  causality: EventCausality;
}

export type CollaborationEventType =
  | 'timeline_update'
  | 'budget_change'
  | 'vendor_assignment'
  | 'guest_update'
  | 'document_edit'
  | 'photo_upload'
  | 'task_completion'
  | 'message_sent'
  | 'presence_change'
  | 'permission_update'
  | 'wedding_day_milestone'
  | 'emergency_alert';

export interface EventMetadata {
  source: 'websocket' | 'api' | 'system';
  clientVersion?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  priority: 'low' | 'medium' | 'high' | 'critical';
  retryCount: number;
}

export interface VectorClock {
  [userId: string]: number;
}

export interface EventCausality {
  causedBy?: string[];
  causes?: string[];
}

export type EventCallback = (event: CollaborationEvent) => Promise<void>;

export interface EventConflict {
  id: string;
  events: CollaborationEvent[];
  conflictType: ConflictType;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export type ConflictType =
  | 'concurrent_edit'
  | 'data_inconsistency'
  | 'permission_conflict'
  | 'timeline_overlap'
  | 'budget_overallocation'
  | 'vendor_double_booking';

export interface ResolutionResult {
  conflictId: string;
  strategy: ResolutionStrategy;
  resolvedEvent: CollaborationEvent;
  rejectedEvents: CollaborationEvent[];
  requiresManualReview: boolean;
}

export type ResolutionStrategy =
  | 'last_writer_wins'
  | 'merge_changes'
  | 'priority_based'
  | 'manual_review'
  | 'wedding_hierarchy'
  | 'vendor_precedence'
  | 'timeline_priority';

// Wedding-specific collaboration types
export interface WeddingCollaborationContext {
  weddingId: string;
  weddingDate: Date;
  weddingPhase: WeddingPhase;
  criticalPeriod: boolean; // Within 7 days of wedding
  emergencyMode: boolean; // Wedding day or emergencies
}

export type WeddingPhase =
  | 'planning'
  | 'final_prep'
  | 'wedding_week'
  | 'wedding_day'
  | 'post_wedding';

export interface WeddingEmergency {
  id: string;
  type: EmergencyType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedVendors: string[];
  timelineImpact: TimelineImpact;
  requiredActions: EmergencyAction[];
}

export type EmergencyType =
  | 'weather_delay'
  | 'vendor_unavailable'
  | 'venue_issue'
  | 'transportation_problem'
  | 'health_emergency'
  | 'technical_failure';

export interface TimelineImpact {
  delayMinutes: number;
  affectedMilestones: string[];
  cascadingEffects: string[];
}

export interface EmergencyAction {
  id: string;
  description: string;
  assignedTo: string;
  priority: number;
  estimatedDuration: number;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface EmergencyResponse {
  emergencyId: string;
  responseTime: number;
  actions: EmergencyAction[];
  alternativePlans: string[];
  notificationsSent: number;
}

// Performance and metrics types
export interface CollaborationMetrics {
  activeConnections: number;
  eventsPerSecond: number;
  averageLatency: number;
  conflictResolutionTime: number;
  errorRate: number;
  weddingDayLoad: number;
}

export interface LoadPrediction {
  expectedConnections: number;
  expectedEventVolume: number;
  peakTimes: Date[];
  resourceRequirements: ResourceRequirement[];
}

export interface ResourceRequirement {
  cpu: number;
  memory: number;
  bandwidth: number;
  storage: number;
}

export interface ScalingResult {
  previousCapacity: number;
  newCapacity: number;
  scalingFactor: number;
  estimatedCost: number;
  ready: boolean;
}
