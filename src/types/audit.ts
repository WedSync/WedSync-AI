/**
 * Audit Logging System Type Definitions
 * WS-177: Frontend Audit Dashboard Types
 *
 * Following patterns from /wedsync/src/types/database.ts
 * and /wedsync/src/lib/middleware/audit.ts
 */

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  session_id: string | null;
  action_type: AuditActionType;
  resource_type: AuditResourceType;
  resource_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  timestamp: string;
  success: boolean;
  error_message: string | null;
  metadata: Record<string, any> | null;
  risk_score: number;
  created_at: string;
}

export type AuditActionType =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'export'
  | 'import'
  | 'share'
  | 'download'
  | 'upload'
  | 'access_denied'
  | 'bulk_operation';

export type AuditResourceType =
  | 'user_profile'
  | 'client'
  | 'wedding'
  | 'guest_list'
  | 'vendor'
  | 'task'
  | 'timeline'
  | 'budget'
  | 'document'
  | 'photo'
  | 'payment'
  | 'communication'
  | 'system_settings'
  | 'api_key';

export type AuditRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface SecurityAlert {
  id: string;
  alert_type: SecurityAlertType;
  severity: AuditRiskLevel;
  title: string;
  description: string;
  user_id: string | null;
  ip_address: string | null;
  detected_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  status: SecurityAlertStatus;
  metadata: SecurityAlertMetadata;
}

export type SecurityAlertType =
  | 'suspicious_login'
  | 'multiple_failed_logins'
  | 'unusual_access_pattern'
  | 'bulk_data_export'
  | 'off_hours_access'
  | 'privilege_escalation'
  | 'data_breach_attempt'
  | 'malicious_file_upload'
  | 'api_abuse';

export type SecurityAlertStatus =
  | 'active'
  | 'investigating'
  | 'resolved'
  | 'false_positive';

export interface SecurityAlertMetadata {
  failed_login_count?: number;
  access_attempts?: number;
  data_volume?: number;
  time_range?: {
    start: string;
    end: string;
  };
  affected_resources?: Array<{
    type: AuditResourceType;
    id: string;
    name?: string;
  }>;
  location?: {
    country?: string;
    city?: string;
  };
}

export interface AuditLogFilter {
  user_id?: string[];
  action_type?: AuditActionType[];
  resource_type?: AuditResourceType[];
  date_range?: {
    start: string;
    end: string;
  };
  ip_address?: string;
  success?: boolean;
  risk_level?: AuditRiskLevel[];
  search_query?: string;
  limit?: number;
  offset?: number;
}

export interface SecurityMetrics {
  total_events: number;
  failed_logins: number;
  successful_logins: number;
  high_risk_activities: number;
  active_alerts: number;
  unique_users: number;
  top_actions: Array<{
    action: AuditActionType;
    count: number;
  }>;
  top_resources: Array<{
    resource: AuditResourceType;
    count: number;
  }>;
  timeline_data: Array<{
    timestamp: string;
    event_count: number;
    risk_score: number;
  }>;
  geographic_data: Array<{
    country: string;
    count: number;
    risk_score: number;
  }>;
}

export interface AuditLogResponse {
  data: AuditLogEntry[];
  total_count: number;
  has_more: boolean;
  next_offset?: number;
}

export interface SecurityDashboardData {
  metrics: SecurityMetrics;
  recent_alerts: SecurityAlert[];
  recent_activities: AuditLogEntry[];
  system_health: {
    status: 'healthy' | 'warning' | 'critical';
    last_updated: string;
    issues: string[];
  };
}

/**
 * Wedding-specific audit contexts for business logic
 */
export interface WeddingAuditContext {
  wedding_id: string;
  wedding_date: string;
  couple_names: string;
  vendor_count: number;
  guest_count: number;
  helpers: Array<{
    user_id: string;
    role: string;
    permissions: string[];
  }>;
}

/**
 * User display information for audit logs
 */
export interface AuditUserInfo {
  id: string;
  name: string | null;
  email: string;
  role: string;
  avatar_url: string | null;
  is_active: boolean;
}

/**
 * Component props interfaces
 */
export interface AuditLogViewerProps {
  initialFilters?: Partial<AuditLogFilter>;
  showActions?: boolean;
  compact?: boolean;
  realTimeUpdates?: boolean;
}

export interface SecurityDashboardProps {
  refreshInterval?: number;
  showDetailedMetrics?: boolean;
  alertThreshold?: AuditRiskLevel;
}

export interface AuditLogFiltersProps {
  filters: AuditLogFilter;
  onFiltersChange: (filters: AuditLogFilter) => void;
  userOptions: AuditUserInfo[];
  isLoading?: boolean;
}

export interface SuspiciousActivityAlertProps {
  alerts: SecurityAlert[];
  onAlertAction: (
    alertId: string,
    action: 'resolve' | 'investigate' | 'dismiss',
  ) => void;
  showAll?: boolean;
}

/**
 * Utility types for form validation
 */
export interface AuditLogFormData {
  action_type?: AuditActionType;
  resource_type?: AuditResourceType;
  date_from?: string;
  date_to?: string;
  user_search?: string;
  ip_address?: string;
}

/**
 * Export functionality types
 */
export interface AuditExportOptions {
  format: 'csv' | 'json' | 'pdf';
  filters: AuditLogFilter;
  include_metadata: boolean;
  date_range: {
    start: string;
    end: string;
  };
}

/**
 * =============================================================================
 * TEAM B BACKEND AUDIT LOGGING TYPES - WS-177 Round 1
 * =============================================================================
 * Backend audit engine types for comprehensive audit logging system
 * Designed to integrate with existing frontend types above
 */

/**
 * Core backend audit event structure
 */
export interface BackendAuditEvent {
  id: string;
  user_id: string;
  organization_id: string;
  action: BackendAuditAction;
  resource_type: BackendAuditResourceType;
  resource_id?: string;
  metadata: BackendAuditMetadata;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  duration_ms?: number;
  response_status?: number;
  wedding_context?: WeddingBackendAuditContext;
}

/**
 * Extended wedding context for backend operations
 */
export interface WeddingBackendAuditContext {
  client_id?: string;
  wedding_id?: string;
  supplier_id?: string;
  guest_id?: string;
  task_id?: string;
  evidence_type?: EvidenceType;
  approval_required?: boolean;
  sensitivity_level: SensitivityLevel;
  business_impact: BusinessImpactLevel;
}

/**
 * Comprehensive metadata for backend audit events
 */
export interface BackendAuditMetadata {
  request_body?: Record<string, any>;
  response_body?: Record<string, any>;
  query_params?: Record<string, string>;
  headers?: Record<string, string>;
  file_info?: FileAuditInfo;
  business_context?: BusinessAuditContext;
  security_flags?: SecurityAuditFlags;
  performance_metrics?: PerformanceAuditMetrics;
}

export interface FileAuditInfo {
  filename: string;
  size_bytes: number;
  mime_type: string;
  checksum?: string;
  upload_source: string;
  virus_scan_result?: string;
}

export interface BusinessAuditContext {
  operation_type: 'create' | 'read' | 'update' | 'delete';
  affected_records: number;
  data_categories: string[];
  compliance_relevant: boolean;
  requires_approval: boolean;
  business_justification?: string;
}

export interface SecurityAuditFlags {
  suspicious_activity: boolean;
  rate_limited: boolean;
  authentication_failed: boolean;
  authorization_bypassed: boolean;
  data_export: boolean;
  bulk_operation: boolean;
  cross_organization_access: boolean;
  elevated_privileges_used: boolean;
}

export interface PerformanceAuditMetrics {
  database_query_time_ms: number;
  external_api_time_ms: number;
  cache_hit_rate: number;
  memory_usage_mb: number;
  cpu_usage_percent: number;
}

/**
 * Comprehensive backend audit actions for wedding business logic
 */
export type BackendAuditAction =
  // Guest Management Actions (High Compliance Value)
  | 'guest.dietary_requirements_access'
  | 'guest.personal_data_export'
  | 'guest.seating_arrangement_modify'
  | 'guest.contact_info_access'
  | 'guest.rsvp_status_change'
  | 'guest.plus_one_approval'
  | 'guest.special_needs_access'
  | 'guest.bulk_communication_send'
  // Vendor Coordination Actions
  | 'vendor.client_data_access'
  | 'vendor.task_assignment_change'
  | 'vendor.contract_access'
  | 'vendor.payment_information_access'
  | 'vendor.communication_log_access'
  | 'vendor.performance_rating_modify'
  // Task Management Actions (Accountability)
  | 'task.critical_deadline_modify'
  | 'task.evidence_photo_upload'
  | 'task.completion_status_change'
  | 'task.helper_assignment'
  | 'task.priority_escalation'
  | 'task.approval_workflow_trigger'
  // Budget Management Actions (Financial Audit)
  | 'budget.major_expense_approval'
  | 'budget.payment_authorization'
  | 'budget.financial_report_generate'
  | 'budget.cost_allocation_change'
  | 'budget.vendor_payment_process'
  // System Security Actions
  | 'auth.privileged_access_grant'
  | 'auth.role_permission_change'
  | 'auth.api_key_generation'
  | 'system.configuration_change'
  | 'system.backup_access'
  | 'system.audit_log_access'
  // Data Protection Actions
  | 'data.pii_access'
  | 'data.bulk_export'
  | 'data.anonymization_request'
  | 'data.retention_policy_apply'
  | 'data.gdpr_request_process';

export type BackendAuditResourceType =
  | 'guest_profile'
  | 'vendor_contract'
  | 'wedding_task'
  | 'budget_item'
  | 'payment_record'
  | 'evidence_photo'
  | 'communication_log'
  | 'approval_workflow'
  | 'system_config'
  | 'audit_trail'
  | 'api_endpoint'
  | 'database_record';

export type EvidenceType =
  | 'completion_photo'
  | 'approval_signature'
  | 'receipt_document'
  | 'contract_amendment'
  | 'quality_verification'
  | 'damage_report';

export type SensitivityLevel =
  | 'public'
  | 'internal'
  | 'confidential'
  | 'restricted'
  | 'top_secret';

export type BusinessImpactLevel =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'
  | 'wedding_day_critical';

/**
 * Audit logging configuration and options
 */
export interface AuditLoggingOptions {
  action: BackendAuditAction;
  resource_type: BackendAuditResourceType;
  resource_id?: string;
  include_request_body?: boolean;
  include_response_body?: boolean;
  include_headers?: boolean;
  include_performance_metrics?: boolean;
  wedding_context?: Partial<WeddingBackendAuditContext>;
  sensitivity_level?: SensitivityLevel;
  business_impact?: BusinessImpactLevel;
  async_logging?: boolean;
  batch_with_others?: boolean;
  require_encryption?: boolean;
}

/**
 * Pattern analysis and security detection types
 */
export interface SecurityPatternAnalysis {
  pattern_type: SecurityPatternType;
  confidence_score: number;
  event_count: number;
  time_window_minutes: number;
  description: string;
  severity: SecuritySeverity;
  affected_users: string[];
  recommended_actions: string[];
}

export type SecurityPatternType =
  | 'rapid_guest_data_access'
  | 'bulk_vendor_operations'
  | 'unusual_timing_pattern'
  | 'cross_organization_access'
  | 'failed_authentication_cluster'
  | 'privilege_escalation_attempt'
  | 'data_export_anomaly'
  | 'wedding_day_irregular_access';

export type SecuritySeverity =
  | 'info'
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'
  | 'emergency';

/**
 * Audit query and response types for API
 */
export interface BackendAuditLogQuery {
  user_id?: string;
  organization_id?: string;
  action?: BackendAuditAction;
  resource_type?: BackendAuditResourceType;
  date_from?: string;
  date_to?: string;
  client_id?: string;
  wedding_id?: string;
  supplier_id?: string;
  sensitivity_level?: SensitivityLevel;
  business_impact?: BusinessImpactLevel;
  suspicious_only?: boolean;
  include_metadata?: boolean;
  limit?: number;
  offset?: number;
  sort_by?: 'created_at' | 'action' | 'user_id' | 'severity';
  sort_order?: 'asc' | 'desc';
}

export interface BackendAuditLogResponse {
  events: BackendAuditEvent[];
  total_count: number;
  has_more: boolean;
  query_duration_ms: number;
  security_summary: SecurityQuerySummary;
}

export interface SecurityQuerySummary {
  high_risk_events: number;
  suspicious_patterns: number;
  compliance_relevant_events: number;
  business_critical_events: number;
}

/**
 * Audit logger configuration
 */
export interface AuditLoggerConfiguration {
  supabase_url: string;
  supabase_service_key: string;
  batch_size: number;
  batch_timeout_ms: number;
  max_retries: number;
  enable_compression: boolean;
  data_retention_days: number;
  enable_encryption: boolean;
  performance_monitoring: boolean;
  security_analysis: boolean;
  wedding_context_required: boolean;
}
