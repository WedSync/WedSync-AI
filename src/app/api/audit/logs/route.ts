import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { 
  BackendAuditAction, 
  BackendAuditResourceType,
  SensitivityLevel,
  BusinessImpactLevel
} from '@/types/audit'
import { withSecureValidation, withQueryValidation } from '@/lib/validation/middleware'
import { auditService, AuditEventType, AuditSeverity } from '@/lib/audit/audit-service'
import { weddingAuditLogger } from '@/lib/audit/audit-logger'
import { auditLogAnalyzer } from '@/lib/audit/log-analyzer'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

/**
 * WS-177 Enhanced Audit Logs API - Team B Backend Audit Integration
 * ============================================================================
 * Enhanced audit logging API with wedding-specific context and security analysis
 * Maintains backward compatibility with WS-150 while adding WS-177 features
 * Integrates withSecureValidation pattern and WeddingAuditLogger
 * ============================================================================
 */

// Constants
const WEDDING_VENDOR_TYPES = ["photographer", "venue", "florist", "catering", "band"] as const
const WEDDING_STATUSES = ["planning", "confirmed", "completed", "cancelled"] as const
const WEDDING_SEASONS = ["spring", "summer", "fall", "winter"] as const
const RSVP_STATUSES = ["pending", "attending", "declined", "maybe"] as const

const DAYS_PER_WEEK = 7
const HOURS_PER_DAY = 24
const SECONDS_PER_MINUTE = 60
const SECONDS_TO_MS = 1000

// String constants
const PUBLIC = 'public'
const INTERNAL = 'internal'
const CONFIDENTIAL = 'confidential'
const RESTRICTED = 'restricted'
const MEDIUM = 'medium'
const HIGH = 'high'
const CRITICAL = 'critical'
const TIMESTAMP = 'timestamp'
const DESC = 'desc'
const TRUE = 'true'
const PATTERNS = 'patterns'
const ANOMALIES = 'anomalies'
const ALERTS = 'alerts'
const RISK_ASSESSMENT = 'risk_assessment'
const AUTHENTICATION_REQUIRED = 'Authentication required'
const USER_PROFILES = 'user_profiles'
const USER_ID = 'user_id'
const NO_ORGANIZATION_FOUND = 'No organization found'
const USER = 'user'
const ADMIN = 'admin'
const SUPER_ADMIN = 'super_admin'
const SYSTEM_ADMIN = 'system_admin'
const MANAGER = 'manager'
const X_FORWARDED_FOR = 'x-forwarded-for'
const X_REAL_IP = 'x-real-ip'
const USER_AGENT = 'user-agent'
const INSUFFICIENT_PERMISSIONS = 'Insufficient permissions'
const AUDIT_SYSTEM = 'audit_system'
const AUTOFIXED = 'autofixed'
const UNKNOWN_ERROR = 'Unknown error'
const INTERNAL_SERVER_ERROR = 'Internal server error'
const AUDIT_LOGS = 'audit_logs'
const POST_METHOD = 'POST'

/**
 * Enhanced query parameters validation schema for WS-177 audit logs
 * Maintains backward compatibility with WS-150 parameters
 */
const enhancedAuditLogsQuerySchema = z.object({
  // WS-150 Legacy parameters (maintained for backward compatibility)
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  user_id: z.string().uuid().optional(),
  event_types: z.string().optional(),
  severities: z.string().optional(),
  resource_type: z.string().optional(),
  resource_id: z.string().optional(),
  correlation_id: z.string().optional(),
  search: z.string().max(200).optional(),
  limit: z.string().transform(val => Math.min(parseInt(val, 10) || 50, 1000)).optional(),
  offset: z.string().transform(val => parseInt(val, 10) || 0).optional(),
  // WS-177 Enhanced parameters
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  page: z.string().transform(val => parseInt(val, 10) || 1).optional(),
  action: z.string().optional(),
  action_pattern: z.string().optional(),
  // Wedding-specific context filtering
  organization_id: z.string().uuid().optional(),
  wedding_id: z.string().uuid().optional(),
  guest_id: z.string().uuid().optional(),
  supplier_id: z.string().uuid().optional(),
  // Security filtering
  sensitivity_level: z.enum([PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED]).optional(),
  business_impact: z.enum(['low', MEDIUM, HIGH, CRITICAL]).optional(),
  // Enhanced sorting and filtering
  sort_by: z.enum([TIMESTAMP, 'action', 'resource_type', 'business_impact']).default(TIMESTAMP),
  sort_order: z.enum(['asc', DESC]).default(DESC),
  include_metadata: z.string().transform(val => val === TRUE).optional(),
  high_risk_only: z.string().transform(val => val === TRUE).optional(),
  security_events_only: z.string().transform(val => val === TRUE).optional(),
  // API version control
  api_version: z.enum(['v1', 'v2']).default('v1') // v1: WS-150 compat, v2 = WS-177 enhanced
})

/**
 * Security analysis request schema for POST endpoint
 */
const securityAnalysisSchema = z.object({
  analysis_type: z.enum([PATTERNS, ANOMALIES, ALERTS, RISK_ASSESSMENT]),
  time_window_hours: z.number().min(1).max(168).default(24),
  organization_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  include_details: z.boolean().default(false)
})

/**
 * Enhanced GET endpoint with withQueryValidation for WS-177 features
 */
export const GET = withQueryValidation(
  enhancedAuditLogsQuerySchema,
  async (request: NextRequest, validatedQuery: any) => {
    try {
      // Get user session for authorization - updated to use new createClient
      const supabase = await createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return NextResponse.json({ error: AUTHENTICATION_REQUIRED }, { status: 401 })
      }

      // Get user profile and organization
      const { data: profile } = await supabase
        .from(USER_PROFILES)
        .select('organization_id, role')
        .eq(USER_ID, user.id)
        .single()

      if (!profile?.organization_id) {
        return NextResponse.json({ error: NO_ORGANIZATION_FOUND }, { status: 400 })
      }

      // Role-based access control (enhanced for WS-177)
      const userRole = profile.role || USER
      const isAdmin = [ADMIN, SUPER_ADMIN, SYSTEM_ADMIN].includes(userRole)
      const isManager = [MANAGER, ADMIN, SUPER_ADMIN, SYSTEM_ADMIN].includes(userRole)

      // Check access permissions
      if (!isManager) {
        // Log unauthorized access attempt with enhanced logging
        await Promise.all([
          // Legacy logging for compatibility
          auditService.logSecurityEvent(
            AuditEventType.SECURITY_UNAUTHORIZED_ACCESS,
            'Attempted access to audit logs without proper permissions',
            {
              user_id: user.id,
              user_email: user.email,
              role: profile.role,
              endpoint: '/api/audit/logs',
            },
            {
              user_id: user.id,
              user_email: user.email,
              organization_id: profile.organization_id,
              ip_address: request.headers.get(X_FORWARDED_FOR) || request.headers.get(X_REAL_IP),
              user_agent: request.headers.get(USER_AGENT),
            },
            HIGH
          ),
          // Enhanced WS-177 logging
          weddingAuditLogger.logAuditEvent(
            'auth.privileged_access_denied',
            AUDIT_SYSTEM,
            {
              wedding_context: {
                sensitivity_level: CONFIDENTIAL,
                business_impact: HIGH,
                unauthorized_access_attempt: true
              },
              async_logging: false
            }
          )
        ])
        return NextResponse.json({ error: INSUFFICIENT_PERMISSIONS }, { status: 403 })
      }

      // Determine API version and handle accordingly
      const apiVersion = validatedQuery.api_version || 'v1'

      // Branch handling based on API version
      if (apiVersion === 'v2') {
        // WS-177 Enhanced API with wedding-specific features
        return await handleEnhancedAuditQuery(validatedQuery, profile, user, isAdmin)
      } else {
        // WS-150 Legacy API for backward compatibility
        return await handleLegacyAuditQuery(validatedQuery, profile, user, request)
      }
    } catch (error) {
      logger.error('[AUDIT LOGS API] Enhanced Error:', { component: AUTOFIXED, context: error })
      // Enhanced error logging for WS-177
      try {
        await Promise.all([
          auditService.log({
            event_type: AuditEventType.SYSTEM_ERROR_OCCURRED,
            severity: AuditSeverity.ERROR,
            action: 'Audit logs API error',
            details: {
              error: error instanceof Error ? error.message : UNKNOWN_ERROR,
              endpoint: '/api/audit/logs',
            },
          }),
          weddingAuditLogger.logAuditEvent(
            'system.audit_api_error',
            AUDIT_SYSTEM,
            {
              wedding_context: {
                sensitivity_level: INTERNAL,
                business_impact: MEDIUM,
                error_details: error instanceof Error ? error.message : UNKNOWN_ERROR
              },
              async_logging: true
            }
          )
        ])
      } catch (logError) {
        logger.error('[AUDIT LOGS API] Failed to log error:', { component: AUTOFIXED, context: logError })
      }
      return NextResponse.json(
        { error: INTERNAL_SERVER_ERROR, timestamp: new Date().toISOString() },
        { status: 500 }
      )
    }
  }
)

/**
 * Helper function for WS-177 Enhanced API (v2)
 */
async function handleEnhancedAuditQuery(
  validatedQuery: any, 
  profile: any, 
  user: any, 
  isAdmin: boolean
): Promise<NextResponse> {
  // Determine organization scope
  const organizationScope = validatedQuery.organization_id || profile.organization_id
  if (organizationScope !== profile.organization_id && ![SUPER_ADMIN].includes(profile.role)) {
    return NextResponse.json({ 
      error: 'Access denied to other organization data' 
    }, { status: 403 })
  }

  // Sensitivity level restrictions based on role
  const allowedSensitivityLevels: SensitivityLevel[] = isAdmin 
    ? [PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED]
    : profile.role === MANAGER 
    ? [PUBLIC, INTERNAL, CONFIDENTIAL]
    : [PUBLIC, INTERNAL]

  // Build enhanced query options
  const queryOptions = {
    organization_id: organizationScope,
    date_from: validatedQuery.date_from || validatedQuery.start_date,
    date_to: validatedQuery.date_to || validatedQuery.end_date,
    action: validatedQuery.action as BackendAuditAction | undefined,
    action_pattern: validatedQuery.action_pattern,
    resource_type: validatedQuery.resource_type as BackendAuditResourceType | undefined,
    user_id: validatedQuery.user_id,
    wedding_id: validatedQuery.wedding_id,
    guest_id: validatedQuery.guest_id,
    supplier_id: validatedQuery.supplier_id,
    sensitivity_levels: allowedSensitivityLevels,
    business_impact: validatedQuery.business_impact as BusinessImpactLevel | undefined,
    search_query: validatedQuery.search,
    page: validatedQuery.page || 1,
    limit: validatedQuery.limit || 25,
    sort_by: validatedQuery.sort_by,
    sort_order: validatedQuery.sort_order,
    include_metadata: validatedQuery.include_metadata,
    high_risk_only: validatedQuery.high_risk_only,
    security_events_only: validatedQuery.security_events_only
  }

  // Query enhanced audit logs
  const auditResults = await weddingAuditLogger.queryWeddingAuditLogs(queryOptions)

  // Log this access for audit trail
  await weddingAuditLogger.logAuditEvent(
    'system.audit_log_access',
    AUDIT_SYSTEM,
    {
      wedding_context: {
        sensitivity_level: INTERNAL,
        business_impact: MEDIUM,
        query_parameters: {
          page: queryOptions.page,
          limit: queryOptions.limit,
          api_version: 'v2'
        }
      },
      async_logging: true
    }
  )

  return NextResponse.json({
    audit_logs: auditResults,
    metadata: {
      total_returned: auditResults.length,
      page: queryOptions.page,
      limit: queryOptions.limit,
      has_more: auditResults.length === queryOptions.limit,
      query_timestamp: new Date().toISOString(),
      api_version: 'v2',
      access_level: profile.role,
      organization_id: organizationScope,
      allowed_sensitivity_levels: allowedSensitivityLevels
    }
  })
}

/**
 * Helper function for WS-150 Legacy API (v1) - Maintains backward compatibility
 */
async function handleLegacyAuditQuery(
  validatedQuery: any, 
  profile: any, 
  user: any, 
  request: NextRequest
): Promise<NextResponse> {
  // Legacy parameter parsing
  const startDate = validatedQuery.start_date 
    ? new Date(validatedQuery.start_date) 
    : new Date(Date.now() - DAYS_PER_WEEK * HOURS_PER_DAY * SECONDS_PER_MINUTE * SECONDS_PER_MINUTE * 1000)
  const endDate = validatedQuery.end_date 
    ? new Date(validatedQuery.end_date) 
    : new Date()
    
  const eventTypes = validatedQuery.event_types?.split(',') as AuditEventType[] | undefined
  const severities = validatedQuery.severities?.split(',') as AuditSeverity[] | undefined

  // Validate date range
  if (endDate.getTime() - startDate.getTime() > 90 * HOURS_PER_DAY * SECONDS_PER_MINUTE * SECONDS_PER_MINUTE * 1000) {
    return NextResponse.json(
      { error: 'Date range cannot exceed 90 days' },
      { status: 400 }
    )
  }

  // Build legacy filters
  const filters: any = {
    start_date: startDate,
    end_date: endDate,
    organization_id: profile.organization_id,
    limit: Math.min(validatedQuery.limit || 50, 1000),
    offset: validatedQuery.offset || 0,
  }

  if (validatedQuery.user_id) filters.user_id = validatedQuery.user_id
  if (eventTypes?.length) filters.event_types = eventTypes
  if (severities?.length) filters.severities = severities
  if (validatedQuery.resource_type) filters.resource_type = validatedQuery.resource_type
  if (validatedQuery.resource_id) filters.resource_id = validatedQuery.resource_id
  if (validatedQuery.correlation_id) filters.correlation_id = validatedQuery.correlation_id

  // Query legacy audit logs
  const logs = await auditService.query(filters)

  // Apply text search if provided
  let filteredLogs = logs
  if (validatedQuery.search) {
    const searchLower = validatedQuery.search.toLowerCase()
    filteredLogs = logs.filter((log: any) => 
      log.action.toLowerCase().includes(searchLower) ||
      log.event_type.toLowerCase().includes(searchLower) ||
      log.user_email?.toLowerCase().includes(searchLower) ||
      JSON.stringify(log.details).toLowerCase().includes(searchLower)
    )
  }

  // Log the legacy audit query access
  await auditService.log({
    event_type: AuditEventType.DATA_READ,
    severity: AuditSeverity.INFO,
    action: 'Audit logs queried (legacy)',
    resource_type: AUDIT_LOGS,
    details: {
      api_version: 'v1',
      query_filters: filters,
      results_count: filteredLogs.length,
    },
  }, {
    user_id: user.id,
    user_email: user.email,
    organization_id: profile.organization_id,
    ip_address: request.headers.get(X_FORWARDED_FOR) || request.headers.get(X_REAL_IP),
    user_agent: request.headers.get(USER_AGENT),
  })

  // Return legacy format response
  return NextResponse.json({
    success: true,
    data: filteredLogs,
    metadata: {
      total: filteredLogs.length,
      limit: filters.limit,
      offset: filters.offset,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      query_time: new Date().toISOString(),
      api_version: 'v1'
    },
  })
}

/**
 * Enhanced POST endpoint for security analysis (WS-177) and manual audit entry creation (WS-150)
 */
export const POST = withSecureValidation(
  z.union([securityAnalysisSchema, z.object({
    event_type: z.string(),
    severity: z.string(),
    action: z.string(),
    details: z.record(z.any()).optional(),
    target_user_id: z.string().uuid().optional(),
    resource_type: z.string().optional(),
    resource_id: z.string().optional()
  })]),
  async (request: NextRequest, validatedData: any) => {
    try {
      // Get user session for authorization
      const supabase = await createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return NextResponse.json({ error: AUTHENTICATION_REQUIRED }, { status: 401 })
      }

      // Get user's organization and role
      const { data: profile } = await supabase
        .from(USER_PROFILES)
        .select('organization_id, role')
        .eq(USER_ID, user.id)
        .single()

      if (!profile?.organization_id) {
        return NextResponse.json({ error: NO_ORGANIZATION_FOUND }, { status: 400 })
      }

      const userRole = profile.role || USER
      const isAdmin = [ADMIN, SUPER_ADMIN, SYSTEM_ADMIN].includes(userRole)

      // Determine request type based on validated data structure
      const isSecurityAnalysis = 'analysis_type' in validatedData

      if (isSecurityAnalysis) {
        // WS-177 Security Analysis Request
        if (!isAdmin) {
          return NextResponse.json({ 
            error: 'Security analysis requires administrator privileges' 
          }, { status: 403 })
        }
        return await handleSecurityAnalysis(validatedData, profile, user)
      } else {
        // WS-150 Legacy Manual Audit Entry Creation
        if (profile.role !== SYSTEM_ADMIN) {
          // Log unauthorized access attempt
          await Promise.all([
            auditService.logSecurityEvent(
              AuditEventType.SECURITY_UNAUTHORIZED_ACCESS,
              'Attempted manual audit log creation without proper permissions',
              {
                user_id: user.id,
                user_email: user.email,
                role: profile.role,
                endpoint: '/api/audit/logs',
                method: POST,
              },
              {
                user_id: user.id,
                user_email: user.email,
                organization_id: profile.organization_id,
                ip_address: request.headers.get(X_FORWARDED_FOR) || request.headers.get(X_REAL_IP),
                user_agent: request.headers.get(USER_AGENT),
              },
              CRITICAL
            ),
            weddingAuditLogger.logAuditEvent(
              'auth.manual_audit_creation_denied',
              AUDIT_SYSTEM,
              {
                wedding_context: {
                  sensitivity_level: CONFIDENTIAL,
                  business_impact: CRITICAL
                },
                async_logging: false
              }
            )
          ])
          return NextResponse.json({ error: INSUFFICIENT_PERMISSIONS }, { status: 403 })
        }
        return await handleManualAuditEntry(validatedData, profile, user, request)
      }
    } catch (error) {
      logger.error('[AUDIT LOGS API] Enhanced POST Error:', { component: AUTOFIXED, context: error })
      // Enhanced error logging for WS-177
      try {
        await Promise.all([
          auditService.log({
            event_type: AuditEventType.SYSTEM_ERROR_OCCURRED,
            severity: AuditSeverity.ERROR,
            action: 'Enhanced audit API POST error',
            details: {
              error: error instanceof Error ? error.message : UNKNOWN_ERROR,
              endpoint: '/api/audit/logs',
              method: POST,
            },
          }),
          weddingAuditLogger.logAuditEvent(
            'system.audit_api_post_error',
            AUDIT_SYSTEM,
            {
              wedding_context: {
                sensitivity_level: INTERNAL,
                business_impact: MEDIUM,
                error_details: error instanceof Error ? error.message : UNKNOWN_ERROR
              },
              async_logging: true
            }
          )
        ])
      } catch (logError) {
        logger.error('[AUDIT LOGS API] Failed to log POST error:', { component: AUTOFIXED, context: logError })
      }
      return NextResponse.json(
        { error: INTERNAL_SERVER_ERROR, timestamp: new Date().toISOString() },
        { status: 500 }
      )
    }
  }
)

/**
 * Helper function for WS-177 Security Analysis
 */
async function handleSecurityAnalysis(
  validatedData: any,
  profile: any,
  user: any
): Promise<NextResponse> {
  const organizationScope = validatedData.organization_id || profile.organization_id
  if (organizationScope !== profile.organization_id && ![SUPER_ADMIN].includes(profile.role)) {
    return NextResponse.json({ 
      error: 'Access denied to other organization security analysis' 
    }, { status: 403 })
  }

  let analysisResult: any
  try {
    switch (validatedData.analysis_type) {
      case PATTERNS:
        analysisResult = await auditLogAnalyzer.analyzeSuspiciousPatterns(
          organizationScope,
          validatedData.time_window_hours
        )
        break
      case ANOMALIES:
        analysisResult = await auditLogAnalyzer.detectAnomalies(
          organizationScope,
          validatedData.time_window_hours
        )
        break
      case ALERTS:
        analysisResult = await auditLogAnalyzer.getRealtimeSecurityAlerts(
          organizationScope
        )
        break
      case RISK_ASSESSMENT:
        analysisResult = await auditLogAnalyzer.generateRiskAssessmentReport(
          organizationScope,
          validatedData.time_window_hours
        )
        break
      default:
        return NextResponse.json({ error: 'Invalid analysis type' }, { status: 400 })
    }

    // Log security analysis request
    await weddingAuditLogger.logAuditEvent(
      'system.security_analysis_requested',
      AUDIT_SYSTEM,
      {
        wedding_context: {
          sensitivity_level: CONFIDENTIAL,
          business_impact: HIGH,
          analysis_type: validatedData.analysis_type,
          time_window_hours: validatedData.time_window_hours,
          target_organization: organizationScope
        },
        include_request_body: true,
        async_logging: false
      }
    )

    return NextResponse.json({
      analysis_type: validatedData.analysis_type,
      organization_id: organizationScope,
      time_window_hours: validatedData.time_window_hours,
      generated_at: new Date().toISOString(),
      results: analysisResult,
      metadata: {
        requested_by: user.id,
        requester_role: profile.role,
        include_details: validatedData.include_details
      }
    })
  } catch (analysisError) {
    logger.error('[SECURITY ANALYSIS] Analysis failed:', { component: AUTOFIXED, context: analysisError })
    await weddingAuditLogger.logAuditEvent(
      'system.security_analysis_error',
      AUDIT_SYSTEM,
      {
        wedding_context: {
          sensitivity_level: CONFIDENTIAL,
          business_impact: HIGH,
          error_details: analysisError instanceof Error ? analysisError.message : UNKNOWN_ERROR
        },
        async_logging: false
      }
    )
    return NextResponse.json(
      { error: 'Security analysis failed', timestamp: new Date().toISOString() },
      { status: 500 }
    )
  }
}

/**
 * Helper function for WS-150 Legacy Manual Audit Entry Creation
 */
async function handleManualAuditEntry(
  validatedData: any,
  profile: any,
  user: any,
  request: NextRequest
): Promise<NextResponse> {
  const { event_type, severity, action, details, target_user_id, resource_type, resource_id } = validatedData

  // Create manual audit entry (legacy)
  await auditService.log({
    event_type: event_type as AuditEventType,
    severity: severity as AuditSeverity,
    action,
    resource_type,
    resource_id,
    details: {
      ...details,
      manual_entry: true,
      created_by_admin: user.email,
      ws177_enhanced: true
    },
  }, {
    user_id: target_user_id || user.id,
    user_email: user.email,
    organization_id: profile.organization_id,
    ip_address: request.headers.get(X_FORWARDED_FOR) || request.headers.get(X_REAL_IP),
    user_agent: request.headers.get(USER_AGENT),
  })

  // Enhanced logging for WS-177
  await Promise.all([
    // Legacy logging
    auditService.log({
      event_type: AuditEventType.DATA_CREATE,
      severity: AuditSeverity.WARNING,
      action: 'Manual audit entry created (enhanced)',
      resource_type: AUDIT_LOGS,
      details: {
        created_entry: { event_type, severity, action, target_user_id },
        admin_action: true,
        ws177_enhanced: true
      },
    }, {
      user_id: user.id,
      user_email: user.email,
      organization_id: profile.organization_id,
      ip_address: request.headers.get(X_FORWARDED_FOR) || request.headers.get(X_REAL_IP),
      user_agent: request.headers.get(USER_AGENT),
    }),
    // Enhanced WS-177 logging
    weddingAuditLogger.logAuditEvent(
      'system.manual_audit_entry_created',
      AUDIT_SYSTEM,
      {
        wedding_context: {
          sensitivity_level: CONFIDENTIAL,
          business_impact: HIGH,
          manual_entry: true,
          created_by_system_admin: true
        },
        async_logging: false
      }
    )
  ])

  return NextResponse.json({
    success: true,
    message: 'Enhanced audit entry created successfully',
    timestamp: new Date().toISOString()
  })
}

/**
 * OPTIONS method for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  })
}