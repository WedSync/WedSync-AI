export interface RealtimeEvent {
  id: string;
  type:
    | 'timeline_update'
    | 'vendor_status'
    | 'document_update'
    | 'budget_update'
    | 'presence_update';
  payload: any;
  timestamp: number;
  userId: string;
  metadata?: Record<string, any>;
}

export interface TimelineUpdate {
  itemId: string;
  field: string;
  value: any;
  previousValue?: any;
  userId: string;
  timestamp: number;
}

export interface VendorPresence {
  vendorId: string;
  vendorName: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  lastSeen?: number;
  location?: {
    lat: number;
    lng: number;
    accuracy?: number;
  };
  currentTask?: string;
  eta?: string;
}

export interface DocumentStatus {
  documentId: string;
  documentName: string;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'signed';
  lastModified: number;
  modifiedBy: string;
  reviewers?: Array<{
    userId: string;
    status: 'pending' | 'approved' | 'rejected';
    timestamp?: number;
    comments?: string;
  }>;
  signatures?: Array<{
    userId: string;
    timestamp: number;
    ipAddress?: string;
  }>;
}

export interface BudgetUpdate {
  categoryId: string;
  categoryName: string;
  previousAmount: number;
  newAmount: number;
  changeType:
    | 'expense_added'
    | 'expense_removed'
    | 'budget_adjusted'
    | 'payment_made';
  description?: string;
  timestamp: number;
  userId: string;
}

export interface ActivityFeedItem {
  id: string;
  type: string;
  title: string;
  description?: string;
  icon?: string;
  color?: string;
  timestamp: number;
  userId: string;
  userName?: string;
  userAvatar?: string;
  metadata?: Record<string, any>;
  isRead?: boolean;
  isPinned?: boolean;
}

export interface RealtimeMetrics {
  connectionUptime: number;
  messagesReceived: number;
  messagesSent: number;
  averageLatency: number;
  reconnectCount: number;
  lastError?: {
    message: string;
    timestamp: number;
    code?: string;
  };
  activeUsers: number;
  peakUsers: number;
}

export interface ConflictResolution {
  conflictId: string;
  itemId: string;
  field: string;
  conflicts: Array<{
    userId: string;
    value: any;
    timestamp: number;
  }>;
  resolution?: {
    strategy: 'last_write_wins' | 'merge' | 'manual';
    resolvedValue: any;
    resolvedBy?: string;
    timestamp: number;
  };
}

export interface OptimisticUpdate {
  id: string;
  operation: 'create' | 'update' | 'delete';
  resource: string;
  resourceId: string;
  changes: Record<string, any>;
  isPending: boolean;
  retryCount: number;
  maxRetries: number;
  timestamp: number;
}

export interface PresenceState {
  userId: string;
  userName?: string;
  userRole?: string;
  status: 'active' | 'idle' | 'away';
  isTyping?: boolean;
  cursor?: {
    x: number;
    y: number;
    elementId?: string;
  };
  selection?: {
    start: number;
    end: number;
    elementId: string;
  };
  metadata?: Record<string, any>;
  lastActivity: number;
}

export interface RealtimeChannel {
  id: string;
  name: string;
  type: 'public' | 'private' | 'presence' | 'broadcast';
  participants: string[];
  createdAt: number;
  metadata?: Record<string, any>;
}

export interface RealtimeMessage {
  id: string;
  channelId: string;
  userId: string;
  content: any;
  type: 'text' | 'event' | 'system' | 'broadcast';
  timestamp: number;
  metadata?: Record<string, any>;
  reactions?: Array<{
    userId: string;
    emoji: string;
    timestamp: number;
  }>;
}

export interface ConnectionConfig {
  autoReconnect: boolean;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  exponentialBackoff: boolean;
  heartbeatInterval: number;
  messageQueueSize: number;
  enableCompression: boolean;
  enableEncryption: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface RealtimeSubscription {
  id: string;
  channel: string;
  event?: string;
  filter?: Record<string, any>;
  callback: (payload: any) => void;
  active: boolean;
  createdAt: number;
}

// Backend-specific realtime types for WS-202 Implementation
import {
  RealtimePostgresChangesPayload,
  SupabaseClient,
} from '@supabase/supabase-js';

// Core realtime backend types
export interface RealtimeChannelFilter {
  table: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
}

export interface SubscriptionResult {
  success: boolean;
  channelId: string;
  filter: string;
  error?: string;
}

export interface DatabaseRealtimeSubscription {
  id: string;
  user_id: string;
  channel_name: string;
  table_name: string;
  filter_params: RealtimeChannelFilter;
  active: boolean;
  created_at: string;
  last_ping_at: string;
}

export interface RealtimeActivityLog {
  id: string;
  user_id: string;
  channel_id: string;
  event_type: string;
  payload?: any;
  timestamp: string;
}

export interface ConnectionStats {
  activeConnections: number;
  todayMessages: number;
  avgMessagesPerConnection: number;
}

export interface RealtimeStatus {
  connected: boolean;
  activeChannels: string[];
  messageCount: number;
  lastMessageAt: string | null;
}

// Wedding-specific subscription types
export interface WeddingRealtimeChannels {
  'form-responses': FormResponseSubscription;
  'journey-progress': JourneyProgressSubscription;
  'core-fields': CoreFieldSubscription;
  'client-communications': CommunicationSubscription;
  notifications: NotificationSubscription;
}

export interface FormResponseSubscription {
  supplier_id: string;
  form_id?: string;
  wedding_id?: string;
}

export interface JourneyProgressSubscription {
  supplier_id: string;
  journey_id?: string;
  step_id?: string;
}

export interface CoreFieldSubscription {
  couple_id: string;
  wedding_id: string;
  field_group?: string;
}

export interface CommunicationSubscription {
  user_id: string;
  conversation_id?: string;
  communication_type?: 'sms' | 'email' | 'in-app';
}

export interface NotificationSubscription {
  user_id: string;
  notification_type?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

// Subscription request/response types for API
export interface SubscribeRequest {
  channels: (keyof WeddingRealtimeChannels)[];
  filters?: {
    supplier_id?: string;
    couple_id?: string;
    wedding_id?: string;
    user_id?: string;
  };
}

export interface SubscribeResponse {
  success: boolean;
  subscriptions: {
    channel: string;
    status: 'active' | 'failed';
    filter: string;
    error?: string;
  }[];
}

export interface UnsubscribeRequest {
  channel_ids: string[];
}

export interface UnsubscribeResponse {
  success: boolean;
  unsubscribed: string[];
  failed: string[];
}

// User context for permission validation
export interface RealtimeUserContext {
  id: string;
  user_type: 'supplier' | 'couple' | 'admin';
  supplier_id?: string;
  couple_id?: string;
  organization_id?: string;
}

// Permission validation types
export interface ChannelPermission {
  channel_name: keyof WeddingRealtimeChannels;
  required_context: ('supplier_id' | 'couple_id' | 'wedding_id' | 'user_id')[];
  user_types: ('supplier' | 'couple' | 'admin')[];
}

// Realtime manager configuration
export interface RealtimeManagerConfig {
  supabase: SupabaseClient;
  maxConnectionsPerUser?: number;
  cleanupIntervalMs?: number;
  connectionTimeoutMs?: number;
  enableActivityLogging?: boolean;
}

// Event callback types
export type RealtimeCallback<
  T extends Record<string, any> = Record<string, any>,
> = (payload: RealtimePostgresChangesPayload<T>) => void;

// Error types for realtime operations
export class RealtimeError extends Error {
  constructor(
    message: string,
    public code:
      | 'UNAUTHORIZED'
      | 'RATE_LIMITED'
      | 'CONNECTION_FAILED'
      | 'INVALID_CHANNEL'
      | 'CLEANUP_FAILED',
    public details?: any,
  ) {
    super(message);
    this.name = 'RealtimeError';
  }
}

// Rate limiting types
export interface RateLimitResult {
  allowed: boolean;
  resetTime?: number;
  remaining?: number;
}

// Database types for realtime tables
export interface RealtimeDatabase {
  realtime_subscriptions: {
    Row: DatabaseRealtimeSubscription;
    Insert: Omit<DatabaseRealtimeSubscription, 'id' | 'created_at'>;
    Update: Partial<Omit<DatabaseRealtimeSubscription, 'id'>>;
  };
  realtime_activity_logs: {
    Row: RealtimeActivityLog;
    Insert: Omit<RealtimeActivityLog, 'id' | 'timestamp'>;
    Update: Partial<Omit<RealtimeActivityLog, 'id'>>;
  };
}

// Export type helpers
export type RealtimeChannelName = keyof WeddingRealtimeChannels;
export type RealtimeFilterParams<T extends RealtimeChannelName> =
  WeddingRealtimeChannels[T];

// ============================================================================
// WS-202 ENHANCED REALTIME TYPES - Team B Backend Implementation
// ============================================================================

/**
 * Enhanced subscription parameters for WS-202 implementation
 * with performance optimization and wedding industry focus
 */
export interface EnhancedRealtimeSubscriptionParams {
  readonly organizationId: string;
  readonly userId: string;
  readonly channelName: string;
  readonly channelType: WeddingChannelType;
  readonly subscriptionConfig?: EnhancedRealtimeSubscriptionConfig;
  readonly filters?: RealtimeChannelFilter;
  readonly priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface EnhancedRealtimeSubscriptionConfig {
  readonly weddingId?: string;
  readonly clientId?: string;
  readonly formId?: string;
  readonly supplierId?: string;
  readonly eventTypes?: readonly RealtimeEventType[];
  readonly retryAttempts?: number;
  readonly heartbeatInterval?: number;
  readonly compressionEnabled?: boolean;
  readonly batchSize?: number;
  readonly bufferTimeout?: number;
}

export type WeddingChannelType =
  | 'wedding_updates'
  | 'client_messages'
  | 'form_submissions'
  | 'vendor_notifications'
  | 'system_alerts'
  | 'journey_progress'
  | 'supplier_collaboration';

export type RealtimeEventType = 'postgres_changes' | 'broadcast' | 'presence';

export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'closed';

export interface EnhancedSubscriptionResult {
  readonly success: boolean;
  readonly subscriptionId: string;
  readonly channelId: string;
  readonly status: ConnectionStatus;
  readonly filter?: string;
  readonly error?: string;
  readonly retryAfter?: number;
  readonly memoryUsage?: number;
  readonly createdAt: Date;
}

export interface ConnectionHealth {
  readonly subscriptionId: string;
  readonly channelId: string;
  readonly status: ConnectionStatus;
  readonly lastPing: Date;
  readonly errorCount: number;
  readonly memoryUsage: number;
  readonly messageCount: number;
  readonly latency: number;
  readonly organizationId: string;
  readonly userId: string;
}

export interface EnhancedRealtimeMetrics {
  readonly totalConnections: number;
  readonly activeSubscriptions: number;
  readonly errorRate: number;
  readonly averageLatency: number;
  readonly memoryUsage: number;
  readonly messagesPerSecond: number;
  readonly connectionPool: ConnectionPoolMetrics;
  readonly performanceAlerts: readonly PerformanceAlert[];
}

export interface ConnectionPoolMetrics {
  readonly totalSize: number;
  readonly activeConnections: number;
  readonly idleConnections: number;
  readonly queuedRequests: number;
  readonly poolUtilization: number;
  readonly reconnectCount: number;
}

export interface EnhancedRealtimeError extends Error {
  readonly code: RealtimeErrorCode;
  readonly subscriptionId?: string;
  readonly channelId?: string;
  readonly organizationId?: string;
  readonly retryable: boolean;
  readonly timestamp: Date;
  readonly context?: Record<string, unknown>;
}

export type RealtimeErrorCode =
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED'
  | 'CHANNEL_FULL'
  | 'CONNECTION_FAILED'
  | 'SUBSCRIPTION_FAILED'
  | 'CLEANUP_FAILED'
  | 'INVALID_FILTER'
  | 'ORGANIZATION_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'PERFORMANCE_DEGRADED';

export interface PerformanceAlert {
  readonly alertId: string;
  readonly type: 'LATENCY' | 'MEMORY' | 'ERROR_RATE' | 'CONNECTION_LIMIT';
  readonly threshold: number;
  readonly actualValue: number;
  readonly organizationId: string;
  readonly timestamp: Date;
  readonly severity: 'warning' | 'error' | 'critical';
}

export interface OrganizationConnectionLimits {
  readonly organizationId: string;
  readonly tier: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'SCALE' | 'ENTERPRISE';
  readonly maxConnections: number;
  readonly maxChannelsPerUser: number;
  readonly rateLimitPerMinute: number;
  readonly allowedChannelTypes: readonly WeddingChannelType[];
  readonly priorityChannels?: readonly WeddingChannelType[];
}

export interface EnhancedRealtimeSubscription {
  readonly id: string;
  readonly organizationId: string;
  readonly userId: string;
  readonly channelName: string;
  readonly channelType: WeddingChannelType;
  readonly channel: RealtimeChannel;
  readonly config: EnhancedRealtimeSubscriptionConfig;
  readonly createdAt: Date;
  readonly lastHeartbeat: Date;
  readonly errorCount: number;
  readonly isActive: boolean;
  readonly memoryUsage: number;
  readonly messageCount: number;
}

// Performance monitoring types
export interface PerformanceThresholds {
  readonly subscriptionLatency: number; // ms
  readonly memoryPerConnection: number; // bytes
  readonly errorRate: number; // percentage
  readonly connectionTimeout: number; // ms
  readonly cleanupDuration: number; // ms
  readonly maxReconnectAttempts: number;
}

export interface SubscriptionCleanupResult {
  readonly cleanedSubscriptions: number;
  readonly activeConnections: number;
  readonly memoryReclaimed: number;
  readonly errors: readonly EnhancedRealtimeError[];
  readonly duration: number;
  readonly organizationId: string;
}

// Wedding industry specific realtime data
export interface WeddingFormSubmissionData {
  readonly formId: string;
  readonly clientId: string;
  readonly supplierId: string;
  readonly fieldUpdates: Record<string, unknown>;
  readonly submissionType: 'partial' | 'complete' | 'draft';
  readonly weddingId?: string;
  readonly priority: 'low' | 'medium' | 'high' | 'urgent';
  readonly isWeddingDay?: boolean;
}

export interface WeddingJourneyProgressData {
  readonly journeyId: string;
  readonly stepId: string;
  readonly clientId: string;
  readonly supplierId: string;
  readonly status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  readonly completedAt?: Date;
  readonly notes?: string;
  readonly attachments?: readonly string[];
  readonly weddingId?: string;
}

// Channel configuration
export interface RealtimeChannelConfig {
  readonly maxConnections: number;
  readonly heartbeatInterval: number;
  readonly reconnectDelay: number;
  readonly maxReconnectAttempts: number;
  readonly messageQueueSize: number;
  readonly compressionEnabled: boolean;
  readonly bufferEnabled: boolean;
  readonly bufferTimeout: number;
}

// Default configurations
export const DEFAULT_ENHANCED_REALTIME_CONFIG: RealtimeChannelConfig = {
  maxConnections: 200,
  heartbeatInterval: 30000, // 30 seconds
  reconnectDelay: 5000, // 5 seconds
  maxReconnectAttempts: 5,
  messageQueueSize: 1000,
  compressionEnabled: true,
  bufferEnabled: true,
  bufferTimeout: 100, // 100ms buffer for batch processing
} as const;

export const ENHANCED_PERFORMANCE_THRESHOLDS: PerformanceThresholds = {
  subscriptionLatency: 200, // 200ms max
  memoryPerConnection: 512 * 1024, // 512KB per connection
  errorRate: 5, // 5% max error rate
  connectionTimeout: 30000, // 30 seconds
  cleanupDuration: 30000, // 30 seconds max cleanup time
  maxReconnectAttempts: 5,
} as const;

export const WEDDING_CHANNEL_PERMISSIONS: Record<
  WeddingChannelType,
  {
    supplierAccess: boolean;
    coupleAccess: boolean;
    systemAccess: boolean;
    requiresWeddingContext: boolean;
  }
> = {
  wedding_updates: {
    supplierAccess: true,
    coupleAccess: true,
    systemAccess: true,
    requiresWeddingContext: true,
  },
  client_messages: {
    supplierAccess: true,
    coupleAccess: true,
    systemAccess: false,
    requiresWeddingContext: false,
  },
  form_submissions: {
    supplierAccess: true,
    coupleAccess: true,
    systemAccess: false,
    requiresWeddingContext: false,
  },
  vendor_notifications: {
    supplierAccess: true,
    coupleAccess: false,
    systemAccess: true,
    requiresWeddingContext: false,
  },
  system_alerts: {
    supplierAccess: true,
    coupleAccess: true,
    systemAccess: true,
    requiresWeddingContext: false,
  },
  journey_progress: {
    supplierAccess: true,
    coupleAccess: true,
    systemAccess: false,
    requiresWeddingContext: false,
  },
  supplier_collaboration: {
    supplierAccess: true,
    coupleAccess: false,
    systemAccess: false,
    requiresWeddingContext: true,
  },
} as const;

// ============================================================================
// WS-202 UI REALTIME INTEGRATION TYPES
// ============================================================================

// Additional wedding-specific event types for UI components
export type WeddingUIEventType =
  | 'form_response'
  | 'journey_update'
  | 'wedding_change'
  | 'client_update'
  | 'vendor_checkin'
  | 'timeline_change'
  | 'emergency_alert'
  | 'payment_processed'
  | 'document_signed';

// UI Connection status for indicators
export type UIConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'reconnecting'
  | 'offline';

// Wedding realtime event payload for UI
export interface WeddingUIRealtimeEvent {
  id: string;
  type: WeddingUIEventType;
  wedding_id: string;
  timestamp: string;
  payload: Record<string, unknown>;
  client_info: {
    user_id: string;
    role: 'couple' | 'vendor' | 'coordinator';
    device: 'mobile' | 'desktop' | 'tablet';
  };
}

// Provider configuration for UI
export interface UIRealtimeProviderConfig {
  reconnectAttempts?: number;
  heartbeatInterval?: number;
  weddingDayMode?: boolean;
  enableOfflineQueue?: boolean;
  debug?: boolean;
  maxConnections?: number;
}

// Connection state for UI providers
export interface UIRealtimeConnectionState {
  isConnected: boolean;
  connectionStatus: UIConnectionStatus;
  lastHeartbeat: Date | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  activeChannels: string[];
  messageCount: number;
  lastUpdate: Date | null;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  networkType?: '4g' | '3g' | '2g' | 'wifi' | 'ethernet';
}

// Context value interface for UI
export interface UIRealtimeContextValue extends UIRealtimeConnectionState {
  subscribeToChannel: (
    channelName: string,
    config: UISubscriptionConfig,
  ) => () => void;
  unsubscribeFromChannel: (channelName: string) => void;
  broadcast: (
    channelName: string,
    event: string,
    payload: any,
  ) => Promise<void>;
  cleanup: () => void;
  queuedOperations: UIQueuedOperation[];
  addToQueue: (operation: Omit<UIQueuedOperation, 'id' | 'timestamp'>) => void;
  retry: () => void;
}

// Subscription configuration for UI
export interface UISubscriptionConfig {
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema: string;
  table: string;
  filter?: string;
  callback: (payload: any) => void;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  onError?: (error: WeddingUIRealtimeError) => void;
}

// Queued operations for offline mode in UI
export interface UIQueuedOperation {
  id: string;
  type: 'insert' | 'update' | 'delete' | 'broadcast';
  table?: string;
  channel?: string;
  data: Record<string, unknown>;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  retryCount: number;
  maxRetries: number;
  weddingDayOperation?: boolean;
}

// Toast notification props for UI
export interface UIRealtimeToastProps {
  id: string;
  type: WeddingUIEventType;
  data: Record<string, unknown>;
  timestamp: Date;
  onDismiss: () => void;
  onAction?: () => void;
  visible: boolean;
  dismissible?: boolean;
  autoHide?: boolean;
  hideDelay?: number;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

// Indicator component props for UI
export interface UIRealtimeIndicatorProps {
  connected: boolean;
  lastUpdate?: Date;
  messageCount?: number;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  weddingDayMode?: boolean;
  onRetry?: () => void;
  reconnectAttempt?: number;
  maxReconnectAttempts?: number;
  connectionQuality?: 'excellent' | 'good' | 'poor' | 'offline';
  compact?: boolean;
  showTooltip?: boolean;
}

// Optimistic update hook return type for UI
export interface UIOptimisticRealtimeReturn<T> {
  data: T[];
  isUpdating: boolean;
  isConnected: boolean;
  addOptimistic: (item: Partial<T>) => string;
  removeOptimistic: (tempId: string) => void;
  replaceOptimistic: (tempId: string, realItem: T) => void;
  conflictResolution: (conflicts: T[]) => T;
}

// Error types for wedding context in UI
export interface WeddingUIRealtimeError {
  code:
    | 'CONNECTION_FAILED'
    | 'VENUE_NETWORK_POOR'
    | 'SUBSCRIPTION_DENIED'
    | 'RATE_LIMIT_EXCEEDED'
    | 'WEDDING_DAY_CRITICAL'
    | 'MEMORY_LIMIT_EXCEEDED';
  message: string;
  weddingId?: string;
  timestamp: string;
  userRole?: string;
  recoveryAction:
    | 'RETRY'
    | 'FALLBACK_MODE'
    | 'ESCALATE_SUPPORT'
    | 'EMERGENCY_PROTOCOL';
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, unknown>;
}

// Performance metrics tracking for UI
export interface UIRealtimePerformanceMetrics {
  connectionLatency: number[];
  messageProcessingTime: number[];
  memoryUsage: number[];
  reconnectionCount: number;
  errorRate: number;
  userRole: string;
  deviceType: string;
  weddingDate?: string;
  uiUpdateLatency: number[];
  renderCount: number;
  optimisticUpdateCount: number;
}

// Wedding day emergency configuration for UI
export interface WeddingDayUIEmergencyConfig {
  maxReconnectAttempts: number;
  reconnectDelay: number;
  heartbeatInterval: number;
  criticalPathOnly: boolean;
  emergencyContactEnabled: boolean;
  offlineMode: 'full' | 'minimal' | 'emergency';
  emergencyNotificationDelay: number;
  criticalOperationsOnly: boolean;
}

// Status panel props for dashboard integration
export interface UIRealtimeStatusPanelProps {
  showMetrics?: boolean;
  showActiveChannels?: boolean;
  showConnectionHistory?: boolean;
  weddingDayMode?: boolean;
  onEmergencyContact?: () => void;
  compact?: boolean;
}

// Hook configuration for realtime subscriptions
export interface UIUseRealtimeConfig {
  table: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  enabled?: boolean;
  weddingId?: string;
  weddingDayMode?: boolean;
  offlineFallback?: any;
  optimisticUpdates?: boolean;
  onConnectionLost?: () => void;
  onConnectionRestored?: () => void;
}

// Network adaptation configuration
export interface VenueNetworkOptimization {
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  adaptivePolling: boolean;
  dataCompression: boolean;
  criticalUpdatesOnly: boolean;
  batteryOptimization: boolean;
  backgroundSync: boolean;
}

// Wedding day protocol settings
export interface WeddingDayProtocolSettings {
  emergencyMode: boolean;
  highPriorityOnly: boolean;
  enhancedReconnection: boolean;
  offlineSupport: boolean;
  emergencyContactInfo: {
    phone: string;
    email: string;
    supportUrl: string;
  };
  criticalOperations: string[];
  fallbackMethods: ('sms' | 'email' | 'phone')[];
}

// Additional types needed for complete implementation
export interface UIOptimisticUpdate {
  id: string;
  eventType: WeddingUIEventType;
  data: Record<string, unknown>;
  timestamp: string;
  originalData?: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
  entityType: string;
  entityId: string;
  weddingId?: string;
  status: 'pending' | 'confirmed' | 'conflict' | 'rollback';
}

export interface UIOptimisticState<T = any> {
  data: T;
  optimisticUpdates: UIOptimisticUpdate[];
  isOptimistic: boolean;
  conflictResolutions: UIConflictResolution[];
}

export interface UIConflictResolution {
  updateId: string;
  serverData: any;
  clientData: any;
  entityType: string;
  entityId: string;
  timestamp: string;
}

export interface UIRealtimeActivity {
  id: string;
  type: WeddingUIEventType;
  data: Record<string, unknown>;
  timestamp: string;
  weddingId?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  source: 'realtime' | 'optimistic' | 'manual';
}

// Status panel props with all required properties
export interface UIRealtimeStatusPanelProps {
  weddingId: string;
  position?:
    | 'top-right'
    | 'top-left'
    | 'bottom-right'
    | 'bottom-left'
    | 'top-center'
    | 'bottom-center';
  maxActivities?: number;
  maxToasts?: number;
  refreshInterval?: number;
  className?: string;
  onActivityClick?: (activity: UIRealtimeActivity) => void;
  weddingDayMode?: boolean;
  showMetrics?: boolean;
  showActiveChannels?: boolean;
  showConnectionHistory?: boolean;
  onEmergencyContact?: () => void;
  compact?: boolean;
}

// Missing Clock import type - using existing imports
export type ClockIcon = (typeof import('lucide-react'))['Clock'];
