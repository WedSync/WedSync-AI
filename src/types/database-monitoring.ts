/**
 * WS-154: Database Performance Monitoring Types
 * Team D - Round 1 - TypeScript type definitions for database monitoring system
 */

// Database monitoring event types
export type MonitoringEventType =
  | 'slow_query'
  | 'connection_issue'
  | 'table_health'
  | 'rls_violation'
  | 'performance_alert';

export type MonitoringEventSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface MonitoringEvent {
  id: string;
  event_type: MonitoringEventType;
  event_data: Record<string, any>;
  severity: MonitoringEventSeverity;
  created_at: string;
  user_id?: string;
  source_ip?: string;
  user_agent?: string;
  resolved_at?: string;
  resolution_notes?: string;
}

// Slow queries monitoring
export interface SlowQuery {
  query_start: string;
  state: string;
  query_preview: string;
  duration_ms: number;
  pid: number;
  username?: string;
  application_name?: string;
  client_addr?: string;
  wait_event_category?: string;
}

// Connection pool monitoring
export interface ConnectionMetrics {
  active_connections: number;
  idle_connections: number;
  idle_in_transaction: number;
  total_connections: number;
  utilization_percent: number;
  database_name: string;
  database_connections: number;
}

// Table health monitoring
export interface TableHealth {
  schemaname: string;
  tablename: string;
  total_size: string;
  total_size_bytes: number;
  inserts: number;
  updates: number;
  deletes: number;
  live_tuples: number;
  dead_tuples: number;
  dead_tuple_percent: number;
  last_vacuum?: string;
  last_autovacuum?: string;
  last_analyze?: string;
  last_autoanalyze?: string;
  sequential_scans: number;
  index_scans: number;
  index_usage_percent: number;
}

// RLS status monitoring
export type SecurityRiskLevel =
  | 'LOW_RISK'
  | 'MEDIUM_RISK'
  | 'HIGH_RISK'
  | 'UNKNOWN';

export interface RLSStatus {
  schemaname: string;
  tablename: string;
  rls_enabled: boolean;
  rls_status: 'ENABLED' | 'DISABLED';
  policy_count: number;
  security_risk_level: SecurityRiskLevel;
}

// Database monitoring summary
export interface DatabaseMonitoringSummary {
  timestamp: string;
  health_score: number;
  status: 'excellent' | 'good' | 'fair' | 'poor';
  metrics: {
    slow_queries: number;
    connection_utilization_percent: number;
    high_risk_tables: number;
    unresolved_events: number;
  };
  recommendations: string[];
}

// API request/response types
export interface PerformanceQueryParams {
  time_range: '1h' | '6h' | '24h';
  query_type?: 'slow' | 'connections' | 'tables' | 'rls' | 'summary';
  include_details: boolean;
}

export interface PerformanceApiResponse {
  data: {
    summary?: DatabaseMonitoringSummary;
    slowQueries?: SlowQuery[];
    connections?: ConnectionMetrics[];
    tableHealth?: TableHealth[];
    rlsStatus?: RLSStatus[];
    recentEvents?: Pick<
      MonitoringEvent,
      'id' | 'event_type' | 'severity' | 'created_at' | 'resolved_at'
    >[];
  };
  metadata: {
    timestamp: string;
    responseTime: number;
    timeRange: string;
    queryType: string;
    includeDetails: boolean;
  };
}

// POST API types
export interface ResolveEventRequest {
  action: 'resolve_event';
  event_id: string;
  resolution_notes?: string;
}

export interface RecordEventRequest {
  action: 'record_event';
  event_type: MonitoringEventType;
  event_data: Record<string, any>;
  severity?: MonitoringEventSeverity;
}

export type PerformanceApiPostRequest =
  | ResolveEventRequest
  | RecordEventRequest;

export interface PerformanceApiPostResponse {
  success: boolean;
  message: string;
  eventId?: string;
}

// Security and access control
export interface AdminAccessVerification {
  authorized: boolean;
  user?: {
    id: string;
    email: string;
    role: string;
  };
  error?: string;
}

// Rate limiting
export interface RateLimitInfo {
  count: number;
  resetTime: number;
}

// Database monitoring configuration
export interface MonitoringConfig {
  slowQueryThresholdMs: number;
  connectionUtilizationWarning: number;
  connectionUtilizationCritical: number;
  deadTuplePercentWarning: number;
  deadTuplePercentCritical: number;
  eventRetentionDays: number;
  maxSlowQueriesDisplayed: number;
  maxTableHealthEntries: number;
}

// Dashboard integration types
export interface MonitoringDashboardData {
  healthScore: number;
  status: string;
  activeAlerts: number;
  recentEvents: number;
  topSlowQueries: SlowQuery[];
  connectionUtilization: number;
  highRiskTables: RLSStatus[];
  systemRecommendations: string[];
}

// Performance thresholds
export interface PerformanceThresholds {
  responseTime: {
    good: number;
    warning: number;
    critical: number;
  };
  queryTime: {
    slow: number;
    verySlow: number;
  };
  connections: {
    warning: number;
    critical: number;
  };
  deadTuples: {
    warning: number;
    critical: number;
  };
}

// Error types
export interface MonitoringApiError {
  error: string;
  timestamp: string;
  retryAfter?: number;
}

// Function parameter types (for database functions)
export interface RecordEventParams {
  p_event_type: MonitoringEventType;
  p_event_data: Record<string, any>;
  p_severity?: MonitoringEventSeverity;
  p_source_ip?: string;
  p_user_agent?: string;
}

// Lighthouse CI integration types
export interface LighthousePerformanceMetrics {
  url: string;
  timestamp: string;
  scores: {
    performance: number;
    accessibility: number;
    bestPractices: number;
  };
  metrics: {
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    cumulativeLayoutShift: number;
    firstInputDelay: number;
    timeToInteractive: number;
  };
  databaseImpact?: {
    apiResponseTime: number;
    queryCount: number;
    slowQueryCount: number;
  };
}

// Export default configuration
export const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  slowQueryThresholdMs: 100,
  connectionUtilizationWarning: 60,
  connectionUtilizationCritical: 80,
  deadTuplePercentWarning: 20,
  deadTuplePercentCritical: 40,
  eventRetentionDays: 30,
  maxSlowQueriesDisplayed: 10,
  maxTableHealthEntries: 20,
};

export const PERFORMANCE_THRESHOLDS: PerformanceThresholds = {
  responseTime: {
    good: 100,
    warning: 200,
    critical: 500,
  },
  queryTime: {
    slow: 100,
    verySlow: 1000,
  },
  connections: {
    warning: 60,
    critical: 80,
  },
  deadTuples: {
    warning: 20,
    critical: 40,
  },
};
