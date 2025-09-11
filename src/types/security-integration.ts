/**
 * WS-177 Audit Logging System - Security Integration Types
 * Team C - Security workflow integration types and interfaces
 */

import { z } from 'zod';

// Core audit event types for wedding workflows
export enum AuditEventType {
  // Wedding data access events
  GUEST_LIST_ACCESS = 'guest_list_access',
  VENDOR_DATA_ACCESS = 'vendor_data_access',
  TASK_DATA_ACCESS = 'task_data_access',
  BUDGET_DATA_ACCESS = 'budget_data_access',

  // Wedding data modification events
  GUEST_LIST_MODIFIED = 'guest_list_modified',
  VENDOR_CONTRACT_MODIFIED = 'vendor_contract_modified',
  TASK_STATUS_CHANGED = 'task_status_changed',
  BUDGET_UPDATED = 'budget_updated',

  // Security-critical events
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  PERMISSION_GRANTED = 'permission_granted',
  PERMISSION_REVOKED = 'permission_revoked',
  DATA_EXPORT = 'data_export',
  BULK_OPERATION = 'bulk_operation',

  // Suspicious activity indicators
  RAPID_DATA_ACCESS = 'rapid_data_access',
  UNUSUAL_ACCESS_PATTERN = 'unusual_access_pattern',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  FAILED_AUTHENTICATION = 'failed_authentication',
}

// Severity levels for audit events
export enum AuditSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Wedding-specific workflow contexts
export enum WorkflowContext {
  GUEST_MANAGEMENT = 'guest_management',
  VENDOR_COORDINATION = 'vendor_coordination',
  TASK_ASSIGNMENT = 'task_assignment',
  TIMELINE_PLANNING = 'timeline_planning',
  BUDGET_TRACKING = 'budget_tracking',
  PHOTO_SHARING = 'photo_sharing',
}

// User roles in wedding context
export enum WeddingRole {
  COUPLE = 'couple',
  WEDDING_PLANNER = 'wedding_planner',
  VENDOR = 'vendor',
  HELPER = 'helper', // bridesmaids, family, friends
  GUEST = 'guest',
  ADMIN = 'admin',
}

// Core audit event interface
export interface AuditEvent {
  id: string;
  timestamp: Date;
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId: string;
  userRole: WeddingRole;
  weddingId?: string;
  workflowContext: WorkflowContext;
  resourceId?: string;
  resourceType?: string;
  ipAddress: string;
  userAgent: string;
  sessionId: string;
  details: Record<string, any>;
  metadata: AuditEventMetadata;
}

// Metadata for audit events
export interface AuditEventMetadata {
  requestId: string;
  source: 'api' | 'ui' | 'background' | 'webhook';
  duration?: number; // milliseconds
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  affectedRecords?: number;
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
}

// Security event detection configuration
export interface SecurityEventConfig {
  eventType: AuditEventType;
  enabled: boolean;
  threshold?: SecurityThreshold;
  responseAction: SecurityResponseAction[];
  workflowSpecific: boolean;
  weddingContext: WorkflowContext[];
}

// Thresholds for security event detection
export interface SecurityThreshold {
  timeWindow: number; // minutes
  maxOccurrences: number;
  severity: AuditSeverity;
  userRole?: WeddingRole[];
  resourceType?: string[];
}

// Automated response actions
export enum SecurityResponseAction {
  LOG_ONLY = 'log_only',
  SEND_ALERT = 'send_alert',
  RATE_LIMIT = 'rate_limit',
  TEMPORARY_LOCK = 'temporary_lock',
  REQUIRE_2FA = 'require_2fa',
  ESCALATE_TO_ADMIN = 'escalate_to_admin',
}

// Suspicious activity detection patterns
export interface SuspiciousActivityPattern {
  id: string;
  name: string;
  description: string;
  pattern: {
    eventTypes: AuditEventType[];
    conditions: SecurityCondition[];
    timeWindow: number; // minutes
  };
  severity: AuditSeverity;
  responseActions: SecurityResponseAction[];
  weddingContexts: WorkflowContext[];
}

// Security condition for pattern matching
export interface SecurityCondition {
  field: string;
  operator: 'equals' | 'gt' | 'lt' | 'contains' | 'pattern' | 'in';
  value: any;
  negate?: boolean;
}

// Workflow integration hook configuration
export interface WorkflowHookConfig {
  workflowContext: WorkflowContext;
  eventTypes: AuditEventType[];
  async: boolean;
  retryPolicy?: RetryPolicy;
  errorHandling: ErrorHandlingStrategy;
}

// Retry policy for audit logging
export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
  exponentialBackoff: boolean;
}

// Error handling strategies
export enum ErrorHandlingStrategy {
  IGNORE = 'ignore', // Continue workflow, skip audit
  LOG_AND_CONTINUE = 'log_and_continue', // Log error, continue workflow
  FAIL_WORKFLOW = 'fail_workflow', // Fail the entire workflow
}

// API route audit integration
export interface ApiAuditContext {
  route: string;
  method: string;
  authenticated: boolean;
  rateLimited: boolean;
  validationPassed: boolean;
  responseTime: number;
  statusCode: number;
}

// Wedding-specific audit context
export interface WeddingAuditContext {
  weddingId: string;
  weddingDate?: Date;
  plannerIds: string[];
  vendorIds: string[];
  helperIds: string[];
  privacyLevel: 'public' | 'private' | 'restricted';
}

// Audit logger service interface (from Team B)
export interface AuditLoggerService {
  logEvent(event: AuditEvent): Promise<void>;
  logBulkEvents(events: AuditEvent[]): Promise<void>;
  queryEvents(query: AuditEventQuery): Promise<AuditEvent[]>;
  getEventStats(weddingId?: string): Promise<AuditStats>;
}

// Query interface for audit events
export interface AuditEventQuery {
  weddingId?: string;
  userId?: string;
  eventTypes?: AuditEventType[];
  severity?: AuditSeverity[];
  dateFrom?: Date;
  dateTo?: Date;
  workflowContext?: WorkflowContext[];
  limit?: number;
  offset?: number;
}

// Audit statistics
export interface AuditStats {
  totalEvents: number;
  eventsByType: Record<AuditEventType, number>;
  eventsBySeverity: Record<AuditSeverity, number>;
  suspiciousActivityCount: number;
  recentAlerts: number;
}

// Zod schemas for validation
export const auditEventSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.date(),
  eventType: z.nativeEnum(AuditEventType),
  severity: z.nativeEnum(AuditSeverity),
  userId: z.string().uuid(),
  userRole: z.nativeEnum(WeddingRole),
  weddingId: z.string().uuid().optional(),
  workflowContext: z.nativeEnum(WorkflowContext),
  resourceId: z.string().optional(),
  resourceType: z.string().optional(),
  ipAddress: z.string(),
  userAgent: z.string(),
  sessionId: z.string(),
  details: z.record(z.string(), z.any()),
  metadata: z.object({
    requestId: z.string().uuid(),
    source: z.enum(['api', 'ui', 'background', 'webhook']),
    duration: z.number().optional(),
    success: z.boolean(),
    errorCode: z.string().optional(),
    errorMessage: z.string().optional(),
    affectedRecords: z.number().optional(),
    previousValues: z.record(z.string(), z.any()).optional(),
    newValues: z.record(z.string(), z.any()).optional(),
  }),
});

export const securityEventConfigSchema = z.object({
  eventType: z.nativeEnum(AuditEventType),
  enabled: z.boolean(),
  threshold: z
    .object({
      timeWindow: z.number().positive(),
      maxOccurrences: z.number().positive(),
      severity: z.nativeEnum(AuditSeverity),
      userRole: z.array(z.nativeEnum(WeddingRole)).optional(),
      resourceType: z.array(z.string()).optional(),
    })
    .optional(),
  responseAction: z.array(z.nativeEnum(SecurityResponseAction)),
  workflowSpecific: z.boolean(),
  weddingContext: z.array(z.nativeEnum(WorkflowContext)),
});

// Type guards
export function isAuditEvent(obj: any): obj is AuditEvent {
  return auditEventSchema.safeParse(obj).success;
}

export function isSecurityEventConfig(obj: any): obj is SecurityEventConfig {
  return securityEventConfigSchema.safeParse(obj).success;
}

// Utility types
export type AuditEventHandler = (event: AuditEvent) => Promise<void>;
export type SecurityPatternMatcher = (
  events: AuditEvent[],
) => SuspiciousActivityPattern[];
export type WorkflowHook = (
  context: any,
  eventType: AuditEventType,
) => Promise<AuditEvent | null>;

// Configuration for audit system
export interface AuditSystemConfig {
  enabled: boolean;
  async: boolean;
  bufferSize: number;
  flushIntervalMs: number;
  retentionDays: number;
  encryptionEnabled: boolean;
  securityPatterns: SuspiciousActivityPattern[];
  workflowHooks: WorkflowHookConfig[];
}
