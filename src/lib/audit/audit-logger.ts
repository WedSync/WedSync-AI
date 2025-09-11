/**
 * WS-177 Audit Logging System - Team B Backend Audit Engine
 * ============================================================================
 * Wedding-specific audit logger that extends the existing WS-150 audit service
 * Provides comprehensive audit logging for wedding business operations
 * Integrates with existing security patterns and middleware
 * ============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import {
  auditService,
  AuditEventType,
  AuditSeverity,
  AuditContext,
} from './audit-service';
import type {
  BackendAuditEvent,
  BackendAuditAction,
  BackendAuditResourceType,
  AuditLoggingOptions,
  WeddingBackendAuditContext,
  BackendAuditMetadata,
  SensitivityLevel,
  BusinessImpactLevel,
} from '../../types/audit';

// Supabase client with service role for audit logging
const auditSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

/**
 * Wedding-specific audit events mapping to existing audit service events
 */
const WEDDING_TO_AUDIT_EVENT_MAP: Record<string, AuditEventType> = {
  // Guest data access events (high compliance value)
  'guest.dietary_requirements_access': AuditEventType.DATA_READ,
  'guest.personal_data_export': AuditEventType.DATA_BULK_EXPORT,
  'guest.seating_arrangement_modify': AuditEventType.DATA_UPDATE,
  'guest.contact_info_access': AuditEventType.DATA_READ,
  'guest.rsvp_status_change': AuditEventType.DATA_UPDATE,
  'guest.plus_one_approval': AuditEventType.DATA_UPDATE,
  'guest.special_needs_access': AuditEventType.DATA_READ,
  'guest.bulk_communication_send': AuditEventType.DATA_BULK_EXPORT,

  // Vendor coordination events
  'vendor.client_data_access': AuditEventType.DATA_READ,
  'vendor.task_assignment_change': AuditEventType.DATA_UPDATE,
  'vendor.contract_access': AuditEventType.DATA_READ,
  'vendor.payment_information_access': AuditEventType.FINANCIAL_ACCESS_ATTEMPT,
  'vendor.communication_log_access': AuditEventType.DATA_READ,
  'vendor.performance_rating_modify': AuditEventType.DATA_UPDATE,

  // Task management events (accountability)
  'task.critical_deadline_modify': AuditEventType.DATA_UPDATE,
  'task.evidence_photo_upload': AuditEventType.DATA_CREATE,
  'task.completion_status_change': AuditEventType.DATA_UPDATE,
  'task.helper_assignment': AuditEventType.DATA_UPDATE,
  'task.priority_escalation': AuditEventType.DATA_UPDATE,
  'task.approval_workflow_trigger': AuditEventType.DATA_UPDATE,

  // Budget management events (financial audit)
  'budget.major_expense_approval': AuditEventType.FINANCIAL_BILLING_UPDATED,
  'budget.payment_authorization': AuditEventType.FINANCIAL_PAYMENT_PROCESSED,
  'budget.financial_report_generate': AuditEventType.DATA_BULK_EXPORT,
  'budget.cost_allocation_change': AuditEventType.FINANCIAL_BILLING_UPDATED,
  'budget.vendor_payment_process': AuditEventType.FINANCIAL_PAYMENT_PROCESSED,

  // System security events
  'auth.privileged_access_grant': AuditEventType.SECURITY_ADMIN_PRIVILEGE_USED,
  'auth.role_permission_change': AuditEventType.SECURITY_ADMIN_PRIVILEGE_USED,
  'auth.api_key_generation': AuditEventType.API_KEY_GENERATED,
  'system.configuration_change': AuditEventType.SYSTEM_MAINTENANCE_START,
  'system.backup_access': AuditEventType.SYSTEM_BACKUP_CREATED,
  'system.audit_log_access': AuditEventType.DATA_READ,

  // Data protection events
  'data.pii_access': AuditEventType.DATA_READ,
  'data.bulk_export': AuditEventType.DATA_BULK_EXPORT,
  'data.anonymization_request': AuditEventType.COMPLIANCE_DATA_DELETION,
  'data.retention_policy_apply': AuditEventType.COMPLIANCE_RETENTION_APPLIED,
  'data.gdpr_request_process': AuditEventType.COMPLIANCE_DATA_REQUEST,
};

/**
 * Risk scoring algorithm for wedding-specific audit events
 */
function calculateWeddingRiskScore(
  action: BackendAuditAction,
  resourceType: BackendAuditResourceType,
  context: WeddingBackendAuditContext,
  metadata: BackendAuditMetadata,
): number {
  let baseScore = 20; // Default low risk

  // High-risk actions
  const highRiskActions = [
    'guest.personal_data_export',
    'guest.bulk_communication_send',
    'data.bulk_export',
    'budget.payment_authorization',
    'auth.privileged_access_grant',
    'system.audit_log_access',
  ];

  if (highRiskActions.includes(action)) {
    baseScore = 80;
  }

  // Medium-risk actions
  const mediumRiskActions = [
    'guest.dietary_requirements_access',
    'vendor.payment_information_access',
    'budget.major_expense_approval',
    'task.critical_deadline_modify',
  ];

  if (mediumRiskActions.includes(action)) {
    baseScore = 50;
  }

  // Adjust for business impact
  switch (context.business_impact) {
    case 'wedding_day_critical':
      baseScore += 30;
      break;
    case 'critical':
      baseScore += 20;
      break;
    case 'high':
      baseScore += 10;
      break;
  }

  // Adjust for sensitivity level
  switch (context.sensitivity_level) {
    case 'top_secret':
    case 'restricted':
      baseScore += 25;
      break;
    case 'confidential':
      baseScore += 15;
      break;
  }

  // Adjust for security flags
  if (metadata.security_flags?.suspicious_activity) baseScore += 30;
  if (metadata.security_flags?.rate_limited) baseScore += 15;
  if (metadata.security_flags?.bulk_operation) baseScore += 20;
  if (metadata.security_flags?.cross_organization_access) baseScore += 40;
  if (metadata.security_flags?.elevated_privileges_used) baseScore += 25;

  // Cap at 100
  return Math.min(baseScore, 100);
}

/**
 * Main WS-177 Audit Logger Class
 * Extends existing audit service with wedding-specific functionality
 */
export class WeddingAuditLogger {
  private static instance: WeddingAuditLogger;
  private performanceMetrics: Map<string, number> = new Map();

  private constructor() {
    // Initialize performance tracking
    this.performanceMetrics.set('total_events', 0);
    this.performanceMetrics.set('avg_duration_ms', 0);
    this.performanceMetrics.set('failed_operations', 0);
  }

  static getInstance(): WeddingAuditLogger {
    if (!WeddingAuditLogger.instance) {
      WeddingAuditLogger.instance = new WeddingAuditLogger();
    }
    return WeddingAuditLogger.instance;
  }

  /**
   * Main audit logging method for wedding-specific events
   */
  async logAuditEvent(
    action: BackendAuditAction,
    resourceType: BackendAuditResourceType,
    options: Omit<AuditLoggingOptions, 'action' | 'resource_type'> = {},
  ): Promise<void> {
    const startTime = performance.now();
    const auditId = randomUUID();

    try {
      // Build wedding context with defaults
      const weddingContext: WeddingBackendAuditContext = {
        sensitivity_level: options.sensitivity_level || 'internal',
        business_impact: options.business_impact || 'low',
        ...options.wedding_context,
      };

      // Build comprehensive metadata
      const metadata: BackendAuditMetadata = {
        request_body: options.include_request_body ? {} : undefined,
        response_body: options.include_response_body ? {} : undefined,
        headers: options.include_headers ? {} : undefined,
        business_context: {
          operation_type: this.inferOperationType(action),
          affected_records: 1,
          data_categories: this.getDataCategories(resourceType),
          compliance_relevant: this.isComplianceRelevant(action),
          requires_approval: weddingContext.approval_required || false,
        },
        security_flags: {
          suspicious_activity: false,
          rate_limited: false,
          authentication_failed: false,
          authorization_bypassed: false,
          data_export: action.includes('export'),
          bulk_operation: action.includes('bulk'),
          cross_organization_access: false,
          elevated_privileges_used:
            action.includes('auth.privileged') || action.includes('system.'),
        },
      };

      // Calculate risk score
      const riskScore = calculateWeddingRiskScore(
        action,
        resourceType,
        weddingContext,
        metadata,
      );

      // Determine severity based on risk score and business impact
      const severity = this.determineSeverity(
        riskScore,
        weddingContext.business_impact,
      );

      // Create backend audit event
      const auditEvent: BackendAuditEvent = {
        id: auditId,
        user_id: '', // Will be populated by context
        organization_id: '', // Will be populated by context
        action,
        resource_type: resourceType,
        resource_id: options.resource_id,
        metadata,
        ip_address: undefined, // Will be populated by context
        user_agent: undefined, // Will be populated by context
        created_at: new Date().toISOString(),
        wedding_context: weddingContext,
      };

      // Store in our audit_logs table using direct Supabase insert
      await this.storeAuditEvent(auditEvent, riskScore);

      // Also log to existing audit service for compatibility
      const mappedEventType =
        WEDDING_TO_AUDIT_EVENT_MAP[action] || AuditEventType.DATA_READ;

      await auditService.log({
        event_type: mappedEventType,
        severity,
        action: `[WS-177] ${action}`,
        resource_type: resourceType,
        resource_id: options.resource_id,
        details: {
          wedding_audit: true,
          wedding_context: weddingContext,
          risk_score: riskScore,
          business_impact: weddingContext.business_impact,
          sensitivity_level: weddingContext.sensitivity_level,
          compliance_relevant: metadata.business_context?.compliance_relevant,
          original_action: action,
          ws177_audit_id: auditId,
        },
        metadata: {
          ws177_integration: true,
          backend_audit_system: true,
          wedding_business_logic: true,
        },
      });

      // Performance tracking
      const duration = performance.now() - startTime;
      this.updatePerformanceMetrics(duration, true);

      // Log security events if high risk
      if (riskScore >= 70) {
        await this.logSecurityEvent(
          action,
          resourceType,
          auditEvent,
          riskScore,
        );
      }
    } catch (error) {
      console.error('[WS-177 AUDIT LOGGER] Error logging audit event:', error);
      this.updatePerformanceMetrics(performance.now() - startTime, false);

      // Fallback logging
      console.warn('[WS-177 AUDIT FALLBACK]', {
        audit_id: auditId,
        action,
        resource_type: resourceType,
        resource_id: options.resource_id,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * High-level convenience methods for common wedding operations
   */

  // Guest data access logging (high compliance value)
  async logGuestDataAccess(
    guestId: string,
    accessType: 'dietary' | 'personal' | 'contact' | 'special_needs',
    context: Partial<WeddingBackendAuditContext> = {},
  ): Promise<void> {
    const actionMap = {
      dietary: 'guest.dietary_requirements_access' as const,
      personal: 'guest.personal_data_export' as const,
      contact: 'guest.contact_info_access' as const,
      special_needs: 'guest.special_needs_access' as const,
    };

    await this.logAuditEvent(actionMap[accessType], 'guest_profile', {
      resource_id: guestId,
      sensitivity_level: 'confidential',
      business_impact: 'high',
      wedding_context: {
        ...context,
        guest_id: guestId,
        sensitivity_level: 'confidential',
        business_impact: 'high',
      },
    });
  }

  // Vendor coordination logging
  async logVendorAction(
    vendorId: string,
    actionType:
      | 'data_access'
      | 'task_assignment'
      | 'contract_access'
      | 'payment_access',
    context: Partial<WeddingBackendAuditContext> = {},
  ): Promise<void> {
    const actionMap = {
      data_access: 'vendor.client_data_access' as const,
      task_assignment: 'vendor.task_assignment_change' as const,
      contract_access: 'vendor.contract_access' as const,
      payment_access: 'vendor.payment_information_access' as const,
    };

    await this.logAuditEvent(actionMap[actionType], 'vendor_contract', {
      resource_id: vendorId,
      sensitivity_level: 'internal',
      business_impact: actionType === 'payment_access' ? 'high' : 'medium',
      wedding_context: {
        ...context,
        supplier_id: vendorId,
        sensitivity_level:
          actionType === 'payment_access' ? 'confidential' : 'internal',
        business_impact: actionType === 'payment_access' ? 'high' : 'medium',
      },
    });
  }

  // Task management logging (accountability)
  async logTaskChange(
    taskId: string,
    changeType: 'deadline' | 'evidence' | 'status' | 'assignment' | 'priority',
    context: Partial<WeddingBackendAuditContext> = {},
  ): Promise<void> {
    const actionMap = {
      deadline: 'task.critical_deadline_modify' as const,
      evidence: 'task.evidence_photo_upload' as const,
      status: 'task.completion_status_change' as const,
      assignment: 'task.helper_assignment' as const,
      priority: 'task.priority_escalation' as const,
    };

    await this.logAuditEvent(actionMap[changeType], 'wedding_task', {
      resource_id: taskId,
      sensitivity_level: 'internal',
      business_impact: changeType === 'deadline' ? 'critical' : 'medium',
      wedding_context: {
        ...context,
        task_id: taskId,
        sensitivity_level: 'internal',
        business_impact: changeType === 'deadline' ? 'critical' : 'medium',
      },
    });
  }

  // Budget operations logging (financial audit)
  async logBudgetOperation(
    operation:
      | 'expense_approval'
      | 'payment_auth'
      | 'report_generate'
      | 'cost_allocation',
    amount?: number,
    context: Partial<WeddingBackendAuditContext> = {},
  ): Promise<void> {
    const actionMap = {
      expense_approval: 'budget.major_expense_approval' as const,
      payment_auth: 'budget.payment_authorization' as const,
      report_generate: 'budget.financial_report_generate' as const,
      cost_allocation: 'budget.cost_allocation_change' as const,
    };

    await this.logAuditEvent(actionMap[operation], 'budget_item', {
      sensitivity_level: 'confidential',
      business_impact: operation === 'payment_auth' ? 'critical' : 'high',
      include_request_body: operation === 'payment_auth', // For financial audit trail
      wedding_context: {
        ...context,
        sensitivity_level: 'confidential',
        business_impact: operation === 'payment_auth' ? 'critical' : 'high',
      },
    });
  }

  /**
   * Batch audit logging for high-volume operations
   */
  async logBatchAuditEvents(
    events: Array<{
      action: BackendAuditAction;
      resourceType: BackendAuditResourceType;
      options?: Omit<AuditLoggingOptions, 'action' | 'resource_type'>;
    }>,
  ): Promise<void> {
    const batchId = randomUUID();

    // Process events in parallel for performance
    const promises = events.map((event) =>
      this.logAuditEvent(event.action, event.resourceType, {
        ...event.options,
        batch_with_others: true,
      }),
    );

    try {
      await Promise.all(promises);
    } catch (error) {
      console.error('[WS-177 AUDIT LOGGER] Batch logging error:', error);
    }
  }

  /**
   * Query audit logs with wedding-specific filtering
   */
  async queryWeddingAuditLogs(filters: {
    wedding_id?: string;
    client_id?: string;
    supplier_id?: string;
    guest_id?: string;
    action_pattern?: string;
    date_from?: string;
    date_to?: string;
    sensitivity_levels?: SensitivityLevel[];
    business_impacts?: BusinessImpactLevel[];
    include_metadata?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<BackendAuditEvent[]> {
    try {
      let query = auditSupabase
        .from('audit_logs')
        .select(
          filters.include_metadata
            ? '*'
            : 'id,action,resource_type,resource_id,created_at,wedding_id,client_id,supplier_id,guest_id',
        )
        .order('created_at', { ascending: false });

      // Apply wedding-specific filters
      if (filters.wedding_id) {
        query = query.eq('wedding_id', filters.wedding_id);
      }
      if (filters.client_id) {
        query = query.eq('client_id', filters.client_id);
      }
      if (filters.supplier_id) {
        query = query.eq('supplier_id', filters.supplier_id);
      }
      if (filters.guest_id) {
        query = query.eq('guest_id', filters.guest_id);
      }
      if (filters.action_pattern) {
        query = query.ilike('action', `%${filters.action_pattern}%`);
      }
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }
      if (filters.sensitivity_levels?.length) {
        query = query.in('sensitivity_level', filters.sensitivity_levels);
      }
      if (filters.business_impacts?.length) {
        query = query.in('business_impact', filters.business_impacts);
      }

      // Apply pagination
      const limit = Math.min(filters.limit || 100, 1000);
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        console.error('[WS-177 AUDIT LOGGER] Query error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[WS-177 AUDIT LOGGER] Query exception:', error);
      return [];
    }
  }

  /**
   * Get audit performance metrics
   */
  getPerformanceMetrics() {
    return {
      total_events: this.performanceMetrics.get('total_events') || 0,
      average_duration_ms: this.performanceMetrics.get('avg_duration_ms') || 0,
      failed_operations: this.performanceMetrics.get('failed_operations') || 0,
      success_rate: this.calculateSuccessRate(),
      last_updated: new Date().toISOString(),
    };
  }

  /**
   * Private helper methods
   */

  private async storeAuditEvent(
    event: BackendAuditEvent,
    riskScore: number,
  ): Promise<void> {
    const { error } = await auditSupabase.from('audit_logs').insert({
      id: event.id,
      user_id: event.user_id,
      organization_id: event.organization_id,
      action: event.action,
      resource_type: event.resource_type,
      resource_id: event.resource_id,
      metadata: {
        ...event.metadata,
        risk_score: riskScore,
        ws177_audit: true,
      },
      ip_address: event.ip_address,
      user_agent: event.user_agent,
      created_at: event.created_at,
      duration_ms: event.duration_ms,
      response_status: event.response_status,
      client_id: event.wedding_context?.client_id,
      wedding_id: event.wedding_context?.wedding_id,
      supplier_id: event.wedding_context?.supplier_id,
      guest_id: event.wedding_context?.guest_id,
      sensitivity_level: event.wedding_context?.sensitivity_level || 'internal',
      business_impact: event.wedding_context?.business_impact || 'low',
      compliance_relevant:
        event.metadata?.business_context?.compliance_relevant || false,
    });

    if (error) {
      throw new Error(`Failed to store audit event: ${error.message}`);
    }
  }

  private async logSecurityEvent(
    action: BackendAuditAction,
    resourceType: BackendAuditResourceType,
    auditEvent: BackendAuditEvent,
    riskScore: number,
  ): Promise<void> {
    await auditService.logSecurityEvent(
      AuditEventType.SECURITY_SUSPICIOUS_ACTIVITY,
      `[WS-177 HIGH RISK] ${action}`,
      {
        wedding_audit_id: auditEvent.id,
        resource_type: resourceType,
        resource_id: auditEvent.resource_id,
        risk_score: riskScore,
        wedding_context: auditEvent.wedding_context,
        requires_investigation: true,
        automated_detection: true,
      },
      undefined,
      riskScore >= 90 ? 'critical' : 'high',
    );
  }

  private determineSeverity(
    riskScore: number,
    businessImpact: BusinessImpactLevel,
  ): AuditSeverity {
    if (riskScore >= 90 || businessImpact === 'wedding_day_critical') {
      return AuditSeverity.CRITICAL;
    }
    if (riskScore >= 70 || businessImpact === 'critical') {
      return AuditSeverity.ERROR;
    }
    if (riskScore >= 40 || businessImpact === 'high') {
      return AuditSeverity.WARNING;
    }
    return AuditSeverity.INFO;
  }

  private inferOperationType(
    action: BackendAuditAction,
  ): 'create' | 'read' | 'update' | 'delete' {
    if (action.includes('access') || action.includes('read')) return 'read';
    if (action.includes('create') || action.includes('upload')) return 'create';
    if (
      action.includes('modify') ||
      action.includes('change') ||
      action.includes('update')
    )
      return 'update';
    if (action.includes('delete') || action.includes('remove')) return 'delete';
    return 'read';
  }

  private getDataCategories(resourceType: BackendAuditResourceType): string[] {
    const categoryMap: Record<BackendAuditResourceType, string[]> = {
      guest_profile: ['personal_data', 'dietary_info', 'contact_info'],
      vendor_contract: ['business_data', 'financial_info', 'contract_terms'],
      wedding_task: ['operational_data', 'workflow_info'],
      budget_item: ['financial_data', 'expense_tracking'],
      payment_record: ['financial_data', 'payment_processing'],
      evidence_photo: ['media_data', 'verification_evidence'],
      communication_log: ['communication_data', 'interaction_history'],
      approval_workflow: ['workflow_data', 'approval_history'],
      system_config: ['system_data', 'configuration_settings'],
      audit_trail: ['audit_data', 'compliance_tracking'],
      api_endpoint: ['api_data', 'system_access'],
      database_record: ['database_data', 'data_access'],
    };

    return categoryMap[resourceType] || ['general_data'];
  }

  private isComplianceRelevant(action: BackendAuditAction): boolean {
    const complianceActions = [
      'guest.dietary_requirements_access',
      'guest.personal_data_export',
      'data.pii_access',
      'data.bulk_export',
      'data.gdpr_request_process',
      'data.retention_policy_apply',
      'budget.payment_authorization',
      'vendor.payment_information_access',
    ];

    return complianceActions.includes(action);
  }

  private updatePerformanceMetrics(duration: number, success: boolean): void {
    const totalEvents = (this.performanceMetrics.get('total_events') || 0) + 1;
    const currentAvg = this.performanceMetrics.get('avg_duration_ms') || 0;
    const newAvg = (currentAvg * (totalEvents - 1) + duration) / totalEvents;

    this.performanceMetrics.set('total_events', totalEvents);
    this.performanceMetrics.set('avg_duration_ms', newAvg);

    if (!success) {
      const failedOps =
        (this.performanceMetrics.get('failed_operations') || 0) + 1;
      this.performanceMetrics.set('failed_operations', failedOps);
    }
  }

  private calculateSuccessRate(): number {
    const total = this.performanceMetrics.get('total_events') || 0;
    const failed = this.performanceMetrics.get('failed_operations') || 0;

    if (total === 0) return 100;
    return Math.round(((total - failed) / total) * 100 * 100) / 100; // Round to 2 decimal places
  }
}

// Export singleton instance for use across the application
export const weddingAuditLogger = WeddingAuditLogger.getInstance();

// Export convenience functions for common operations
export const logGuestDataAccess =
  weddingAuditLogger.logGuestDataAccess.bind(weddingAuditLogger);
export const logVendorAction =
  weddingAuditLogger.logVendorAction.bind(weddingAuditLogger);
export const logTaskChange =
  weddingAuditLogger.logTaskChange.bind(weddingAuditLogger);
export const logBudgetOperation =
  weddingAuditLogger.logBudgetOperation.bind(weddingAuditLogger);
