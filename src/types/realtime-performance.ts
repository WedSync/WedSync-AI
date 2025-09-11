/**
 * TypeScript Types for WS-202 Supabase Realtime Performance Integration
 * Team D - Round 1: Performance/Infrastructure Focus
 */

// ============= CONNECTION OPTIMIZATION TYPES =============

export interface ConnectionMetrics {
  channelCount: number;
  lastHeartbeat: number;
  reconnectCount: number;
  avgLatency: number;
  errorRate: number;
  throughput: number;
  lastActivity: number;
  isHealthy: boolean;
  userId: string;
}

export interface RealtimeConnection {
  id: string;
  userId: string;
  channelType: string;
  client: any; // Supabase client instance
  channels: Map<string, any>;
  metrics: ConnectionMetrics;
  isHealthy: boolean;
  lastActivity: number;
  createdAt: number;
}

export interface SubscriptionConfig {
  channelName: string;
  event?: string;
  filter?: Record<string, any>;
  callback: (payload: any) => void;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface SubscriptionBatch {
  id: string;
  channelType: string;
  config: SubscriptionConfig;
  priority: number;
}

export interface BatchResult {
  successful: Array<{ subscription: SubscriptionBatch; connectionId: string }>;
  failed: Array<{ subscription: SubscriptionBatch; error: string }>;
}

export interface OptimizedConnection extends RealtimeConnection {
  poolId: string;
  maxChannels: number;
  connectionWeight: number;
}

export interface ConnectionHealthReport {
  totalConnections: number;
  healthyConnections: number;
  unhealthyConnections: number;
  connectionsByUser: Map<string, number>;
  performanceMetrics: {
    averageLatency: number;
    messagesThroughput: number;
    errorRate: number;
  };
}

export interface ScalingAction {
  type:
    | 'increase_pool_size'
    | 'prewarm_connections'
    | 'enable_aggressive_cleanup'
    | 'add_connection_pool';
  from?: number;
  to?: number;
  target?: number;
  cleanupInterval?: number;
  estimatedDuration: number;
  metadata?: Record<string, any>;
}

export interface ScalingResult {
  action: 'no_scaling_needed' | 'scaled_up' | 'scaled_down' | 'failed';
  currentCapacity: number;
  requiredCapacity: number;
  scalingActions: ScalingAction[];
  timestamp: number;
}

// ============= CACHING TYPES =============

export interface CacheEntry<T = any> {
  data: T;
  cachedAt: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  compressed?: boolean;
  size?: number;
}

export interface CacheLayer {
  name: string;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  size(): Promise<number>;
  hitRatio(): Promise<number>;
}

export interface SubscriptionState {
  userId: string;
  organizationId: string;
  activeChannels: string[];
  subscriptionPreferences: Record<string, any>;
  lastUpdate: number;
  connectionCount: number;
  metadata: Record<string, any>;
}

export interface UserRealtimeData {
  userId: string;
  organizationId: string;
  role: string;
  permissions: string[];
  activeWeddings: string[];
  preferences: Record<string, any>;
  lastSeen: number;
  connectionMetadata: Record<string, any>;
}

export interface WeddingRealtimeData {
  weddingId: string;
  weddingDate: string;
  organizationId: string;
  activeVendors: string[];
  timeline: Array<{
    id: string;
    time: string;
    status: 'pending' | 'in_progress' | 'completed';
    vendor?: string;
  }>;
  criticalUpdates: Array<{
    id: string;
    message: string;
    priority: number;
    timestamp: number;
  }>;
  coordinationData: Record<string, any>;
}

export interface ConnectionMetadata {
  connectionId: string;
  userId: string;
  organizationId: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  browser?: string;
  location?: string;
  connectionQuality: 'excellent' | 'good' | 'poor';
  connectedAt: number;
  lastPing: number;
}

export interface CacheOptimizationResult {
  actions: string[];
  performanceGains: Record<string, number>;
  errors: string[];
  optimizationScore: number;
  timestamp: number;
}

export interface CachePerformanceMetrics {
  hitRatio: {
    overall: number;
    local: number;
    redis: number;
  };
  performance: {
    averageReadLatency: number;
    averageWriteLatency: number;
    operationsPerSecond: number;
  };
  memory: {
    localCacheSize: number;
    localCacheMemory: number;
    redisMemoryUsage: number;
  };
  optimization: {
    compressionRatio: number;
    evictionRate: number;
    preloadEffectiveness: number;
  };
}

export interface AccessPattern {
  key: string;
  frequency: number;
  lastAccess: number;
  averageInterval: number;
  peakTimes: number[];
  dataSize: number;
}

// ============= SCALING & MONITORING TYPES =============

export interface RealtimePerformanceMetrics {
  connectionMetrics: {
    totalConnections: number;
    connectionsPerSecond: number;
    averageConnectionLatency: number;
    connectionReusageRate: number;
  };
  subscriptionMetrics: {
    totalSubscriptions: number;
    subscriptionsPerConnection: number;
    subscriptionUpdateRate: number;
  };
  performanceMetrics: {
    averageMessageLatency: number;
    messagesThroughput: number;
    errorRate: number;
  };
  resourceMetrics: {
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: number;
    networkUtilization: number;
  };
}

export interface WeddingSeasonMetrics {
  seasonType: 'peak' | 'shoulder' | 'off';
  expectedLoad: number;
  currentLoad: number;
  scalingRecommendation: 'scale_up' | 'scale_down' | 'maintain';
  capacityUtilization: number;
  costOptimizationScore: number;
}

export interface AlertThreshold {
  metric: string;
  warning: number;
  critical: number;
  unit: string;
  window: number; // time window in seconds
}

export interface PerformanceAlert {
  id: string;
  type:
    | 'latency'
    | 'connection_count'
    | 'error_rate'
    | 'memory'
    | 'wedding_day';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
  organizationId?: string;
  weddingId?: string;
  metadata: Record<string, any>;
}

export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime: number | null;
  failureThreshold: number;
  timeout: number;
  isWeddingDay: boolean;
}

// ============= WEDDING OPTIMIZATION TYPES =============

export interface WeddingOptimizationConfig {
  weddingId: string;
  weddingDate: string;
  organizationId: string;
  vendorCount: number;
  guestCount: number;
  priorityLevel: 1 | 2 | 3 | 4 | 5; // 5 = highest priority
  specialRequirements: {
    livestream: boolean;
    photoSharing: boolean;
    realTimeCoordination: boolean;
    emergencyProtocols: boolean;
  };
}

export interface WeddingDayMode {
  enabled: boolean;
  weddingIds: string[];
  enhancedMonitoring: boolean;
  priorityChannels: string[];
  emergencyContacts: Array<{
    name: string;
    phone: string;
    role: string;
    escalationLevel: number;
  }>;
  fallbackProcedures: string[];
}

export interface PriorityMessage {
  id: string;
  weddingId: string;
  organizationId: string;
  priority: 1 | 2 | 3 | 4 | 5;
  channel: string;
  message: any;
  timestamp: number;
  deliveryStatus: 'pending' | 'sent' | 'delivered' | 'failed';
  retryCount: number;
  maxRetries: number;
}

// ============= INFRASTRUCTURE TYPES =============

export interface ResourcePool {
  id: string;
  type: 'connection' | 'memory' | 'cpu' | 'network';
  capacity: number;
  available: number;
  allocated: number;
  utilizationPercent: number;
  healthScore: number;
}

export interface InfrastructureHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  components: {
    database: 'healthy' | 'degraded' | 'critical';
    cache: 'healthy' | 'degraded' | 'critical';
    websockets: 'healthy' | 'degraded' | 'critical';
    loadBalancer: 'healthy' | 'degraded' | 'critical';
  };
  resourcePools: ResourcePool[];
  alerts: PerformanceAlert[];
  lastChecked: number;
}

export interface ScalingPolicy {
  name: string;
  trigger: {
    metric: string;
    operator: '>' | '<' | '>=' | '<=';
    value: number;
    window: number; // seconds
  };
  action: {
    type: 'scale_up' | 'scale_down';
    amount: number;
    maxInstances: number;
    minInstances: number;
  };
  cooldown: number; // seconds
  enabled: boolean;
}

// ============= CONFIGURATION TYPES =============

export interface RealtimePerformanceConfig {
  connectionPool: {
    maxConnections: number;
    maxConnectionsPerUser: number;
    connectionTimeout: number;
    heartbeatInterval: number;
    cleanupInterval: number;
    healthCheckInterval: number;
  };
  caching: {
    localCacheSize: number;
    localCacheTTL: number;
    redisCacheTTL: number;
    compressionThreshold: number;
    preloadStrategies: string[];
  };
  scaling: {
    autoScalingEnabled: boolean;
    scaleUpThreshold: number;
    scaleDownThreshold: number;
    maxInstances: number;
    minInstances: number;
    weddingDayMultiplier: number;
  };
  monitoring: {
    metricsInterval: number;
    alertThresholds: AlertThreshold[];
    weddingDayMonitoring: boolean;
    performanceLogging: boolean;
  };
  weddingOptimizations: {
    priorityChannels: string[];
    cacheWarmingTime: number; // hours before wedding
    emergencyModeThreshold: number;
    capacityBuffer: number; // percentage
  };
}

// ============= UTILITY TYPES =============

export type RealtimeEventType =
  | 'connection_established'
  | 'connection_lost'
  | 'subscription_added'
  | 'subscription_removed'
  | 'message_received'
  | 'error_occurred'
  | 'performance_degraded'
  | 'wedding_day_activated'
  | 'emergency_mode_triggered';

export type CacheKey = `${string}:${string}` | `${string}:${string}:${string}`;

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface RealtimeEvent<T = any> {
  type: RealtimeEventType;
  payload: T;
  timestamp: number;
  source: string;
  organizationId?: string;
  userId?: string;
  weddingId?: string;
  metadata?: Record<string, any>;
}

// ============= HOOKS & CALLBACKS =============

export interface RealtimeHooks {
  onConnectionEstablished?: (connection: RealtimeConnection) => void;
  onConnectionLost?: (connectionId: string, error?: Error) => void;
  onPerformanceDegraded?: (metrics: RealtimePerformanceMetrics) => void;
  onWeddingDayActivated?: (weddingConfig: WeddingOptimizationConfig) => void;
  onEmergencyMode?: (alert: PerformanceAlert) => void;
  onScalingEvent?: (result: ScalingResult) => void;
  onCacheOptimized?: (result: CacheOptimizationResult) => void;
}

export interface RealtimeCallbacks {
  onMessage?: (channel: string, event: string, payload: any) => void;
  onError?: (error: Error, context: Record<string, any>) => void;
  onReconnect?: (attempt: number, delay: number) => void;
  onStatusChange?: (
    status: 'connecting' | 'connected' | 'disconnected' | 'error',
  ) => void;
}

// ============= ERROR TYPES =============

export interface RealtimePerformanceErrorData {
  message: string;
  code: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
}

export class RealtimePerformanceError extends Error {
  public code: string;
  public severity: 'low' | 'medium' | 'high' | 'critical';
  public context?: Record<string, any>;

  constructor(
    message: string,
    code: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    context?: Record<string, any>,
  ) {
    super(message);
    this.name = 'RealtimePerformanceError';
    this.code = code;
    this.severity = severity;
    this.context = context;
  }
}

export class WeddingDayError extends RealtimePerformanceError {
  public weddingId: string;

  constructor(
    message: string,
    weddingId: string,
    context?: Record<string, any>,
  ) {
    super(message, 'WEDDING_DAY_ERROR', 'critical', context);
    this.name = 'WeddingDayError';
    this.weddingId = weddingId;
  }
}

// ============= TYPES EXPORTED INDIVIDUALLY =============
// All types are exported individually above - no need for re-export
