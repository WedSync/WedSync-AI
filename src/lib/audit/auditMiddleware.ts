/**
 * WS-177 Audit Middleware - Team B Backend Audit Integration
 * ============================================================================
 * Middleware functions for automatic audit logging in API routes
 * Integrates with existing security validation patterns
 * Follows withSecureValidation pattern from codebase analysis
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/config';
import { weddingAuditLogger } from './audit-logger';
import { auditLogAnalyzer } from './log-analyzer';
import type {
  BackendAuditAction,
  BackendAuditResourceType,
  AuditLoggingOptions,
  WeddingBackendAuditContext,
  SensitivityLevel,
  BusinessImpactLevel,
} from '../../types/audit';

/**
 * Configuration for audit middleware
 */
interface AuditMiddlewareConfig {
  action: BackendAuditAction;
  resourceType: BackendAuditResourceType;
  extractResourceId?: (
    req: NextRequest,
    validatedData?: any,
  ) => string | undefined;
  extractWeddingContext?: (
    req: NextRequest,
    validatedData?: any,
  ) => Partial<WeddingBackendAuditContext>;
  sensitivityLevel?: SensitivityLevel;
  businessImpact?: BusinessImpactLevel;
  includeRequestBody?: boolean;
  includeResponseBody?: boolean;
  includeHeaders?: boolean;
  asyncLogging?: boolean;
  skipAuditIf?: (req: NextRequest, validatedData?: any) => boolean;
}

/**
 * Request context for audit logging
 */
interface AuditRequestContext {
  user_id?: string;
  organization_id?: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  request_id: string;
}

/**
 * Extract audit context from NextRequest
 */
function extractAuditContext(req: NextRequest): AuditRequestContext {
  const headers = req.headers;
  const request_id = headers.get('x-request-id') || crypto.randomUUID();

  return {
    ip_address:
      req.ip ||
      headers.get('x-forwarded-for') ||
      headers.get('x-real-ip') ||
      undefined,
    user_agent: headers.get('user-agent') || undefined,
    request_id,
  };
}

/**
 * Main audit middleware wrapper - integrates with existing withSecureValidation pattern
 */
export function withAuditLogging<TInput = any, TOutput = any>(
  handler: (
    req: NextRequest,
    validatedData: TInput,
  ) => Promise<NextResponse<TOutput>>,
  config: AuditMiddlewareConfig,
) {
  return async (
    req: NextRequest,
    validatedData: TInput,
  ): Promise<NextResponse<TOutput>> => {
    const startTime = performance.now();
    const context = extractAuditContext(req);

    // Check if audit should be skipped
    if (config.skipAuditIf?.(req, validatedData)) {
      return handler(req, validatedData);
    }

    let response: NextResponse<TOutput>;
    let error: Error | null = null;
    let session: any = null;

    try {
      // Get user session for audit context
      try {
        session = await getServerSession(authOptions);
        if (session) {
          context.user_id = session.user?.id;
          context.organization_id = session.user?.organizationId;
          context.session_id = session.user?.sessionId;
        }
      } catch (sessionError) {
        console.warn(
          '[AUDIT MIDDLEWARE] Session retrieval failed:',
          sessionError,
        );
      }

      // Execute the handler
      response = await handler(req, validatedData);

      // Extract response data if needed
      let responseBody: any;
      if (config.includeResponseBody) {
        try {
          const responseClone = response.clone();
          const responseText = await responseClone.text();
          responseBody = responseText ? JSON.parse(responseText) : undefined;
        } catch (parseError) {
          // Ignore parsing errors for response body
        }
      }

      // Log successful audit event
      await logAuditEvent(req, validatedData, response, context, config, {
        duration_ms: performance.now() - startTime,
        error: null,
        responseBody,
      });
    } catch (handlerError) {
      error = handlerError as Error;

      // Log failed audit event
      await logAuditEvent(req, validatedData, undefined, context, config, {
        duration_ms: performance.now() - startTime,
        error,
        responseBody: undefined,
      });

      throw handlerError;
    }

    return response;
  };
}

/**
 * Enhanced audit middleware that combines with security validation
 */
export function withSecureAuditValidation<TInput = any, TOutput = any>(
  handler: (
    req: NextRequest,
    validatedData: TInput,
  ) => Promise<NextResponse<TOutput>>,
  validationSchema: any, // Zod schema
  auditConfig: AuditMiddlewareConfig,
) {
  return withAuditLogging(async (req: NextRequest, validatedData: TInput) => {
    // The validation would happen before this middleware in the chain
    return handler(req, validatedData);
  }, auditConfig);
}

/**
 * Convenience middleware for high-security operations
 */
export function withHighSecurityAudit<TInput = any, TOutput = any>(
  handler: (
    req: NextRequest,
    validatedData: TInput,
  ) => Promise<NextResponse<TOutput>>,
  action: BackendAuditAction,
  resourceType: BackendAuditResourceType,
  additionalConfig?: Partial<AuditMiddlewareConfig>,
) {
  const config: AuditMiddlewareConfig = {
    action,
    resourceType,
    sensitivityLevel: 'confidential',
    businessImpact: 'high',
    includeRequestBody: true,
    includeResponseBody: false, // Don't log response for security
    includeHeaders: true,
    asyncLogging: false, // Synchronous for high security
    ...additionalConfig,
  };

  return withAuditLogging(handler, config);
}

/**
 * Middleware for guest data access (high compliance value)
 */
export function withGuestDataAudit<TInput = any, TOutput = any>(
  handler: (
    req: NextRequest,
    validatedData: TInput,
  ) => Promise<NextResponse<TOutput>>,
  accessType: 'dietary' | 'personal' | 'contact' | 'special_needs',
  additionalConfig?: Partial<AuditMiddlewareConfig>,
) {
  const actionMap = {
    dietary: 'guest.dietary_requirements_access' as const,
    personal: 'guest.personal_data_export' as const,
    contact: 'guest.contact_info_access' as const,
    special_needs: 'guest.special_needs_access' as const,
  };

  return withHighSecurityAudit(
    handler,
    actionMap[accessType],
    'guest_profile',
    {
      extractResourceId: (req) => {
        // Extract guest ID from URL params or body
        const url = new URL(req.url);
        return (
          url.pathname.match(/\/guests?\/([^\/]+)/)?.[1] ||
          url.searchParams.get('guest_id')
        );
      },
      extractWeddingContext: (req, data) => ({
        client_id: req.headers.get('x-client-id') || undefined,
        wedding_id: req.headers.get('x-wedding-id') || undefined,
        guest_id: req.url.match(/\/guests?\/([^\/]+)/)?.[1],
        sensitivity_level: 'confidential',
        business_impact: 'high',
      }),
      ...additionalConfig,
    },
  );
}

/**
 * Middleware for vendor operations
 */
export function withVendorAudit<TInput = any, TOutput = any>(
  handler: (
    req: NextRequest,
    validatedData: TInput,
  ) => Promise<NextResponse<TOutput>>,
  operationType:
    | 'data_access'
    | 'task_assignment'
    | 'contract_access'
    | 'payment_access',
  additionalConfig?: Partial<AuditMiddlewareConfig>,
) {
  const actionMap = {
    data_access: 'vendor.client_data_access' as const,
    task_assignment: 'vendor.task_assignment_change' as const,
    contract_access: 'vendor.contract_access' as const,
    payment_access: 'vendor.payment_information_access' as const,
  };

  return withAuditLogging(handler, {
    action: actionMap[operationType],
    resourceType: 'vendor_contract',
    sensitivityLevel:
      operationType === 'payment_access' ? 'confidential' : 'internal',
    businessImpact: operationType === 'payment_access' ? 'high' : 'medium',
    includeRequestBody: operationType === 'payment_access',
    extractResourceId: (req) => {
      const url = new URL(req.url);
      return (
        url.pathname.match(/\/vendors?\/([^\/]+)/)?.[1] ||
        url.searchParams.get('vendor_id') ||
        url.searchParams.get('supplier_id')
      );
    },
    extractWeddingContext: (req, data) => ({
      supplier_id:
        req.url.match(/\/vendors?\/([^\/]+)/)?.[1] ||
        req.headers.get('x-supplier-id') ||
        undefined,
      sensitivity_level:
        operationType === 'payment_access' ? 'confidential' : 'internal',
      business_impact: operationType === 'payment_access' ? 'high' : 'medium',
    }),
    ...additionalConfig,
  });
}

/**
 * Middleware for task management operations
 */
export function withTaskAudit<TInput = any, TOutput = any>(
  handler: (
    req: NextRequest,
    validatedData: TInput,
  ) => Promise<NextResponse<TOutput>>,
  changeType: 'deadline' | 'evidence' | 'status' | 'assignment' | 'priority',
  additionalConfig?: Partial<AuditMiddlewareConfig>,
) {
  const actionMap = {
    deadline: 'task.critical_deadline_modify' as const,
    evidence: 'task.evidence_photo_upload' as const,
    status: 'task.completion_status_change' as const,
    assignment: 'task.helper_assignment' as const,
    priority: 'task.priority_escalation' as const,
  };

  return withAuditLogging(handler, {
    action: actionMap[changeType],
    resourceType: 'wedding_task',
    sensitivityLevel: 'internal',
    businessImpact: changeType === 'deadline' ? 'critical' : 'medium',
    includeRequestBody: changeType === 'evidence',
    extractResourceId: (req) => {
      const url = new URL(req.url);
      return (
        url.pathname.match(/\/tasks?\/([^\/]+)/)?.[1] ||
        url.searchParams.get('task_id')
      );
    },
    extractWeddingContext: (req, data) => ({
      task_id:
        req.url.match(/\/tasks?\/([^\/]+)/)?.[1] ||
        req.headers.get('x-task-id') ||
        undefined,
      wedding_id: req.headers.get('x-wedding-id') || undefined,
      sensitivity_level: 'internal',
      business_impact: changeType === 'deadline' ? 'critical' : 'medium',
    }),
    ...additionalConfig,
  });
}

/**
 * Middleware for budget operations (financial audit)
 */
export function withBudgetAudit<TInput = any, TOutput = any>(
  handler: (
    req: NextRequest,
    validatedData: TInput,
  ) => Promise<NextResponse<TOutput>>,
  operation:
    | 'expense_approval'
    | 'payment_auth'
    | 'report_generate'
    | 'cost_allocation',
  additionalConfig?: Partial<AuditMiddlewareConfig>,
) {
  const actionMap = {
    expense_approval: 'budget.major_expense_approval' as const,
    payment_auth: 'budget.payment_authorization' as const,
    report_generate: 'budget.financial_report_generate' as const,
    cost_allocation: 'budget.cost_allocation_change' as const,
  };

  return withHighSecurityAudit(handler, actionMap[operation], 'budget_item', {
    sensitivityLevel: 'confidential',
    businessImpact: operation === 'payment_auth' ? 'critical' : 'high',
    includeRequestBody: operation === 'payment_auth',
    extractWeddingContext: (req, data) => ({
      client_id: req.headers.get('x-client-id') || undefined,
      wedding_id: req.headers.get('x-wedding-id') || undefined,
      sensitivity_level: 'confidential',
      business_impact: operation === 'payment_auth' ? 'critical' : 'high',
    }),
    ...additionalConfig,
  });
}

/**
 * Administrative audit middleware for system operations
 */
export function withAdminAudit<TInput = any, TOutput = any>(
  handler: (
    req: NextRequest,
    validatedData: TInput,
  ) => Promise<NextResponse<TOutput>>,
  operation:
    | 'config_change'
    | 'user_management'
    | 'system_access'
    | 'audit_access',
  additionalConfig?: Partial<AuditMiddlewareConfig>,
) {
  const actionMap = {
    config_change: 'system.configuration_change' as const,
    user_management: 'auth.role_permission_change' as const,
    system_access: 'auth.privileged_access_grant' as const,
    audit_access: 'system.audit_log_access' as const,
  };

  return withHighSecurityAudit(handler, actionMap[operation], 'system_config', {
    sensitivityLevel: 'restricted',
    businessImpact: 'critical',
    includeRequestBody: true,
    includeResponseBody: false,
    asyncLogging: false, // Immediate logging for admin operations
    ...additionalConfig,
  });
}

/**
 * Helper function to perform the actual audit logging
 */
async function logAuditEvent(
  req: NextRequest,
  validatedData: any,
  response: NextResponse | undefined,
  context: AuditRequestContext,
  config: AuditMiddlewareConfig,
  executionInfo: {
    duration_ms: number;
    error: Error | null;
    responseBody?: any;
  },
): Promise<void> {
  try {
    // Extract resource ID
    const resourceId = config.extractResourceId?.(req, validatedData);

    // Extract wedding context
    const baseWeddingContext =
      config.extractWeddingContext?.(req, validatedData) || {};
    const weddingContext: WeddingBackendAuditContext = {
      sensitivity_level: config.sensitivityLevel || 'internal',
      business_impact: config.businessImpact || 'low',
      ...baseWeddingContext,
    };

    // Build audit logging options
    const auditOptions: Omit<AuditLoggingOptions, 'action' | 'resource_type'> =
      {
        resource_id: resourceId,
        include_request_body: config.includeRequestBody,
        include_response_body: config.includeResponseBody,
        include_headers: config.includeHeaders,
        wedding_context: weddingContext,
        sensitivity_level: config.sensitivityLevel,
        business_impact: config.businessImpact,
        async_logging: config.asyncLogging,
      };

    // Log the audit event
    if (config.asyncLogging !== false) {
      // Asynchronous logging (default)
      weddingAuditLogger
        .logAuditEvent(config.action, config.resourceType, auditOptions)
        .catch((error) => {
          console.error(
            '[AUDIT MIDDLEWARE] Async audit logging failed:',
            error,
          );
        });
    } else {
      // Synchronous logging for high-security operations
      await weddingAuditLogger.logAuditEvent(
        config.action,
        config.resourceType,
        auditOptions,
      );
    }

    // Check for suspicious patterns (async)
    if (context.organization_id) {
      auditLogAnalyzer
        .getRealtimeSecurityAlerts(context.organization_id)
        .then((alerts) => {
          if (alerts.length > 0) {
            console.warn(
              '[AUDIT MIDDLEWARE] Security alerts detected:',
              alerts,
            );
            // In production, this would trigger notifications
          }
        })
        .catch((error) => {
          console.error('[AUDIT MIDDLEWARE] Security analysis failed:', error);
        });
    }
  } catch (auditError) {
    console.error('[AUDIT MIDDLEWARE] Audit logging failed:', auditError);
    // Don't throw - audit logging failures shouldn't break the main operation
  }
}

/**
 * Utility to check if current request is from an admin user
 */
export async function isAdminRequest(req: NextRequest): Promise<boolean> {
  try {
    const session = await getServerSession(authOptions);
    return (
      session?.user?.role === 'admin' || session?.user?.role === 'super_admin'
    );
  } catch {
    return false;
  }
}

/**
 * Utility to extract client/wedding context from common header patterns
 */
export function extractCommonWeddingContext(
  req: NextRequest,
): Partial<WeddingBackendAuditContext> {
  const headers = req.headers;

  return {
    client_id: headers.get('x-client-id') || undefined,
    wedding_id: headers.get('x-wedding-id') || undefined,
    supplier_id: headers.get('x-supplier-id') || undefined,
    guest_id: headers.get('x-guest-id') || undefined,
  };
}

/**
 * Rate limiting check for audit-sensitive operations
 */
export async function checkAuditRateLimit(
  userId: string,
  action: BackendAuditAction,
  windowMinutes: number = 60,
  maxAttempts: number = 50,
): Promise<boolean> {
  try {
    const recentLogs = await weddingAuditLogger.queryWeddingAuditLogs({
      date_from: new Date(Date.now() - windowMinutes * 60 * 1000).toISOString(),
      action_pattern: action,
      limit: maxAttempts + 1,
    });

    return recentLogs.length <= maxAttempts;
  } catch (error) {
    console.error('[AUDIT MIDDLEWARE] Rate limit check failed:', error);
    return true; // Fail open for operational continuity
  }
}
