/**
 * WS-150: Investigation Trace API - Request Tracing Across Services
 * Traces requests and operations across multiple services using correlation IDs
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  auditService,
  AuditEventType,
  AuditSeverity,
} from '@/lib/audit/audit-service';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Authentication and authorization
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (
      !profile ||
      !['admin', 'super_admin', 'system_admin'].includes(profile.role)
    ) {
      await auditService.logSecurityEvent(
        AuditEventType.SECURITY_UNAUTHORIZED_ACCESS,
        'Unauthorized access to request tracing',
        {
          endpoint: '/api/audit/investigation/trace',
          user_role: profile?.role,
        },
        {
          user_id: user.id,
          user_email: user.email,
          organization_id: profile?.organization_id,
          ip_address:
            request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip'),
          user_agent: request.headers.get('user-agent'),
        },
        'high',
      );

      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 },
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const correlationId = searchParams.get('correlation_id');
    const requestId = searchParams.get('request_id');
    const sessionId = searchParams.get('session_id');
    const userId = searchParams.get('user_id');
    const timeWindow = parseInt(
      searchParams.get('time_window_minutes') || '60',
    );

    // Validate that at least one trace identifier is provided
    if (!correlationId && !requestId && !sessionId && !userId) {
      return NextResponse.json(
        {
          error:
            'At least one trace identifier is required (correlation_id, request_id, session_id, or user_id)',
        },
        { status: 400 },
      );
    }

    // Build trace query
    const startDate = new Date(Date.now() - timeWindow * 60 * 1000);

    let traceData = [];

    if (correlationId) {
      const correlationTrace = await auditService.query({
        correlation_id: correlationId,
        organization_id: profile.organization_id,
        start_date: startDate,
        limit: 1000,
      });
      traceData.push(...correlationTrace);
    }

    if (requestId) {
      const requestTrace = await supabase
        .from('audit_logs')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('request_id', requestId)
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: true });

      if (requestTrace.data) {
        traceData.push(...requestTrace.data);
      }
    }

    if (sessionId) {
      const sessionTrace = await auditService.query({
        organization_id: profile.organization_id,
        start_date: startDate,
        limit: 1000,
      });

      const filteredSessionTrace = sessionTrace.filter(
        (log) => log.session_id === sessionId,
      );
      traceData.push(...filteredSessionTrace);
    }

    if (userId && !correlationId && !requestId && !sessionId) {
      const userTrace = await auditService.query({
        user_id: userId,
        organization_id: profile.organization_id,
        start_date: startDate,
        limit: 1000,
      });
      traceData.push(...userTrace);
    }

    // Remove duplicates and sort chronologically
    const uniqueTraceData = Array.from(
      new Map(traceData.map((item) => [item.id, item])).values(),
    ).sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    // Analyze the trace
    const traceAnalysis = analyzeTrace(uniqueTraceData);

    // Build trace timeline
    const timeline = buildTraceTimeline(uniqueTraceData);

    // Detect issues in the trace
    const issues = detectTraceIssues(uniqueTraceData);

    // Log the trace analysis
    await auditService.log(
      {
        event_type: AuditEventType.DATA_READ,
        severity: AuditSeverity.INFO,
        action: 'Request trace analyzed',
        resource_type: 'audit_trace',
        details: {
          trace_identifiers: {
            correlation_id: correlationId,
            request_id: requestId,
            session_id: sessionId,
            user_id: userId,
          },
          time_window_minutes: timeWindow,
          events_found: uniqueTraceData.length,
          issues_detected: issues.length,
          investigation_by_admin: true,
        },
      },
      {
        user_id: user.id,
        user_email: user.email,
        organization_id: profile.organization_id,
        ip_address:
          request.headers.get('x-forwarded-for') ||
          request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent'),
      },
    );

    return NextResponse.json({
      success: true,
      data: {
        trace_events: uniqueTraceData,
        analysis: traceAnalysis,
        timeline,
        issues,
        metadata: {
          total_events: uniqueTraceData.length,
          time_span_ms:
            uniqueTraceData.length > 1
              ? new Date(
                  uniqueTraceData[uniqueTraceData.length - 1].timestamp,
                ).getTime() - new Date(uniqueTraceData[0].timestamp).getTime()
              : 0,
          search_window_minutes: timeWindow,
          search_criteria: {
            correlation_id: correlationId,
            request_id: requestId,
            session_id: sessionId,
            user_id: userId,
          },
        },
      },
    });
  } catch (error) {
    console.error('[INVESTIGATION TRACE API] Error:', error);

    try {
      await auditService.log({
        event_type: AuditEventType.SYSTEM_ERROR_OCCURRED,
        severity: AuditSeverity.ERROR,
        action: 'Investigation trace API error',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          endpoint: '/api/audit/investigation/trace',
        },
      });
    } catch (logError) {
      console.error('[INVESTIGATION TRACE API] Failed to log error:', logError);
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Helper function to analyze trace data
function analyzeTrace(traceData: any[]) {
  if (traceData.length === 0) {
    return {
      summary: 'No trace data found',
      duration_ms: 0,
      event_count: 0,
      services_involved: [],
      status: 'empty',
    };
  }

  const startTime = new Date(traceData[0].timestamp);
  const endTime = new Date(traceData[traceData.length - 1].timestamp);
  const durationMs = endTime.getTime() - startTime.getTime();

  // Extract services involved
  const servicesInvolved = Array.from(
    new Set(
      traceData
        .map((event) => event.resource_type || 'unknown')
        .filter((service) => service !== 'unknown'),
    ),
  );

  // Count event types
  const eventTypeCounts: Record<string, number> = {};
  traceData.forEach((event) => {
    eventTypeCounts[event.event_type] =
      (eventTypeCounts[event.event_type] || 0) + 1;
  });

  // Count severities
  const severityCounts: Record<string, number> = {};
  traceData.forEach((event) => {
    severityCounts[event.severity] = (severityCounts[event.severity] || 0) + 1;
  });

  // Determine overall status
  let status = 'success';
  if (
    traceData.some(
      (event) => event.severity === 'critical' || event.severity === 'error',
    )
  ) {
    status = 'error';
  } else if (traceData.some((event) => event.severity === 'warning')) {
    status = 'warning';
  }

  return {
    summary: `Trace spans ${Math.round(durationMs)}ms with ${traceData.length} events across ${servicesInvolved.length} services`,
    duration_ms: durationMs,
    event_count: traceData.length,
    services_involved: servicesInvolved,
    status,
    event_type_breakdown: eventTypeCounts,
    severity_breakdown: severityCounts,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
  };
}

// Helper function to build trace timeline
function buildTraceTimeline(traceData: any[]) {
  if (traceData.length === 0) return [];

  const baseTime = new Date(traceData[0].timestamp).getTime();

  return traceData.map((event, index) => {
    const eventTime = new Date(event.timestamp).getTime();
    const offsetMs = eventTime - baseTime;
    const nextEventTime =
      index < traceData.length - 1
        ? new Date(traceData[index + 1].timestamp).getTime()
        : eventTime;
    const durationMs = nextEventTime - eventTime;

    return {
      sequence: index + 1,
      timestamp: event.timestamp,
      offset_ms: offsetMs,
      duration_ms: durationMs,
      event_type: event.event_type,
      severity: event.severity,
      action: event.action,
      service: event.resource_type || 'unknown',
      user_id: event.user_id,
      details: event.details,
      has_error: event.severity === 'error' || event.severity === 'critical',
    };
  });
}

// Helper function to detect issues in trace
function detectTraceIssues(traceData: any[]) {
  const issues = [];

  // Check for errors
  const errorEvents = traceData.filter(
    (event) => event.severity === 'error' || event.severity === 'critical',
  );

  if (errorEvents.length > 0) {
    issues.push({
      type: 'errors_detected',
      severity: 'high',
      count: errorEvents.length,
      description: `${errorEvents.length} error(s) detected in trace`,
      events: errorEvents.map((event) => ({
        timestamp: event.timestamp,
        event_type: event.event_type,
        action: event.action,
        details: event.details,
      })),
    });
  }

  // Check for security events
  const securityEvents = traceData.filter(
    (event) =>
      event.event_type.includes('security') ||
      event.event_type.includes('unauthorized') ||
      event.event_type.includes('suspicious'),
  );

  if (securityEvents.length > 0) {
    issues.push({
      type: 'security_events',
      severity: 'critical',
      count: securityEvents.length,
      description: `${securityEvents.length} security-related event(s) in trace`,
      events: securityEvents.map((event) => ({
        timestamp: event.timestamp,
        event_type: event.event_type,
        action: event.action,
        severity: event.severity,
      })),
    });
  }

  // Check for performance issues (long gaps between events)
  if (traceData.length > 1) {
    const gaps = [];
    for (let i = 1; i < traceData.length; i++) {
      const currentTime = new Date(traceData[i].timestamp).getTime();
      const previousTime = new Date(traceData[i - 1].timestamp).getTime();
      const gap = currentTime - previousTime;

      if (gap > 5000) {
        // 5 second gap
        gaps.push({
          between_events: `${i} and ${i + 1}`,
          gap_ms: gap,
          previous_event: traceData[i - 1].action,
          current_event: traceData[i].action,
        });
      }
    }

    if (gaps.length > 0) {
      issues.push({
        type: 'performance_gaps',
        severity: 'medium',
        count: gaps.length,
        description: `${gaps.length} significant time gap(s) detected (>5s)`,
        gaps,
      });
    }
  }

  // Check for incomplete traces (missing expected events)
  const hasAuthEvent = traceData.some((event) =>
    event.event_type.includes('auth'),
  );
  const hasDataEvent = traceData.some((event) =>
    event.event_type.includes('data'),
  );

  if (hasDataEvent && !hasAuthEvent) {
    issues.push({
      type: 'missing_auth_event',
      severity: 'medium',
      description:
        'Data access events found without corresponding authentication event',
    });
  }

  return issues;
}
