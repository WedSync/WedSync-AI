/**
 * WS-150: Investigation Patterns API - User Activity Pattern Analysis
 * Detects suspicious patterns and anomalies in user behavior
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
        'Unauthorized access to investigation patterns',
        {
          endpoint: '/api/audit/investigation/patterns',
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
    const timeWindowHours = parseInt(
      searchParams.get('time_window_hours') || '24',
    );
    const targetUserId = searchParams.get('user_id');
    const includeAnomalies = searchParams.get('include_anomalies') === 'true';

    // Validate parameters
    if (timeWindowHours > 168) {
      // Max 7 days
      return NextResponse.json(
        { error: 'Time window cannot exceed 168 hours (7 days)' },
        { status: 400 },
      );
    }

    // Analyze patterns
    const patterns = await auditService.analyzePatterns(
      profile.organization_id,
      timeWindowHours,
    );

    // Get detailed user activity patterns if requested
    let userPatterns = null;
    if (targetUserId) {
      userPatterns = await analyzeUserPatterns(
        targetUserId,
        profile.organization_id,
        timeWindowHours,
      );
    }

    // Detect anomalies if requested
    let anomalies = null;
    if (includeAnomalies) {
      anomalies = await detectAnomalies(
        profile.organization_id,
        timeWindowHours,
      );
    }

    // Log the investigation access
    await auditService.log(
      {
        event_type: AuditEventType.DATA_READ,
        severity: AuditSeverity.INFO,
        action: 'Investigation patterns analyzed',
        resource_type: 'audit_investigation',
        details: {
          time_window_hours: timeWindowHours,
          target_user_id: targetUserId,
          include_anomalies: includeAnomalies,
          patterns_found: patterns.patterns.length,
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
        organization_patterns: patterns,
        user_patterns: userPatterns,
        anomalies,
        analysis_window: {
          hours: timeWindowHours,
          start_time: new Date(
            Date.now() - timeWindowHours * 60 * 60 * 1000,
          ).toISOString(),
          end_time: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('[INVESTIGATION PATTERNS API] Error:', error);

    try {
      await auditService.log({
        event_type: AuditEventType.SYSTEM_ERROR_OCCURRED,
        severity: AuditSeverity.ERROR,
        action: 'Investigation patterns API error',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          endpoint: '/api/audit/investigation/patterns',
        },
      });
    } catch (logError) {
      console.error(
        '[INVESTIGATION PATTERNS API] Failed to log error:',
        logError,
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Helper function to analyze individual user patterns
async function analyzeUserPatterns(
  userId: string,
  organizationId: string,
  timeWindowHours: number,
) {
  const startDate = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);

  const userLogs = await auditService.query({
    user_id: userId,
    organization_id: organizationId,
    start_date: startDate,
    limit: 1000,
  });

  // Analyze time patterns
  const hourlyActivity: Record<number, number> = {};
  const dailyActivity: Record<string, number> = {};
  const eventTypeFrequency: Record<string, number> = {};
  const ipAddresses: Set<string> = new Set();
  const userAgents: Set<string> = new Set();

  userLogs.forEach((log) => {
    const logDate = new Date(log.timestamp);
    const hour = logDate.getHours();
    const day = logDate.toDateString();

    hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
    dailyActivity[day] = (dailyActivity[day] || 0) + 1;
    eventTypeFrequency[log.event_type] =
      (eventTypeFrequency[log.event_type] || 0) + 1;

    if (log.ip_address) ipAddresses.add(log.ip_address);
    if (log.user_agent) userAgents.add(log.user_agent);
  });

  // Detect unusual patterns
  const warnings = [];

  // Multiple IP addresses
  if (ipAddresses.size > 3) {
    warnings.push({
      type: 'multiple_ip_addresses',
      severity: 'medium',
      description: `User accessed from ${ipAddresses.size} different IP addresses`,
      details: { ip_count: ipAddresses.size },
    });
  }

  // Off-hours activity (assuming business hours are 8 AM - 6 PM)
  const offHoursActivity = Object.entries(hourlyActivity)
    .filter(([hour]) => parseInt(hour) < 8 || parseInt(hour) > 18)
    .reduce((sum, [, count]) => sum + count, 0);

  if (offHoursActivity > userLogs.length * 0.3) {
    // More than 30% off-hours
    warnings.push({
      type: 'excessive_off_hours_activity',
      severity: 'medium',
      description: 'High percentage of activity outside business hours',
      details: {
        off_hours_percentage: Math.round(
          (offHoursActivity / userLogs.length) * 100,
        ),
      },
    });
  }

  // High frequency of security events
  const securityEvents = userLogs.filter(
    (log) =>
      log.event_type.includes('security') ||
      log.severity === 'error' ||
      log.severity === 'critical',
  );

  if (securityEvents.length > 5) {
    warnings.push({
      type: 'high_security_events',
      severity: 'high',
      description: 'High number of security-related events',
      details: { security_event_count: securityEvents.length },
    });
  }

  return {
    total_events: userLogs.length,
    time_range: `${timeWindowHours} hours`,
    activity_patterns: {
      hourly: hourlyActivity,
      daily: dailyActivity,
      event_types: eventTypeFrequency,
    },
    security_indicators: {
      unique_ip_addresses: ipAddresses.size,
      unique_user_agents: userAgents.size,
      security_events: securityEvents.length,
      off_hours_activity: offHoursActivity,
    },
    warnings,
    risk_score: calculateRiskScore(warnings, userLogs.length),
  };
}

// Helper function to detect system-wide anomalies
async function detectAnomalies(
  organizationId: string,
  timeWindowHours: number,
) {
  const startDate = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);

  const allLogs = await auditService.query({
    organization_id: organizationId,
    start_date: startDate,
    limit: 5000,
  });

  const anomalies = [];

  // Volume anomaly detection
  const eventsPerHour = allLogs.length / timeWindowHours;
  const baselineEventsPerHour = 50; // Configurable baseline

  if (eventsPerHour > baselineEventsPerHour * 2) {
    anomalies.push({
      type: 'volume_spike',
      severity: 'high',
      description: 'Significant increase in audit event volume',
      details: {
        current_rate: Math.round(eventsPerHour),
        baseline_rate: baselineEventsPerHour,
        increase_factor:
          Math.round((eventsPerHour / baselineEventsPerHour) * 100) / 100,
      },
    });
  }

  // Failed authentication spike
  const failedAuthEvents = allLogs.filter(
    (log) =>
      log.event_type.includes('auth') &&
      (log.severity === 'error' || log.event_type.includes('failed')),
  );

  if (failedAuthEvents.length > 20) {
    anomalies.push({
      type: 'auth_failure_spike',
      severity: 'critical',
      description: 'High number of authentication failures detected',
      details: {
        failure_count: failedAuthEvents.length,
        failure_rate: Math.round(
          (failedAuthEvents.length / allLogs.length) * 100,
        ),
      },
    });
  }

  // Geographic anomalies (simplified)
  const ipAddresses = new Set(
    allLogs.filter((log) => log.ip_address).map((log) => log.ip_address),
  );

  if (ipAddresses.size > 50) {
    anomalies.push({
      type: 'geographic_spread',
      severity: 'medium',
      description: 'High number of unique IP addresses accessing the system',
      details: {
        unique_ips: ipAddresses.size,
      },
    });
  }

  // Time-based anomalies
  const hourlyDistribution: Record<number, number> = {};
  allLogs.forEach((log) => {
    const hour = new Date(log.timestamp).getHours();
    hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
  });

  const offHoursEvents = Object.entries(hourlyDistribution)
    .filter(([hour]) => parseInt(hour) < 6 || parseInt(hour) > 22)
    .reduce((sum, [, count]) => sum + count, 0);

  if (offHoursEvents > allLogs.length * 0.2) {
    anomalies.push({
      type: 'off_hours_activity',
      severity: 'medium',
      description: 'Unusual activity detected outside normal hours',
      details: {
        off_hours_percentage: Math.round(
          (offHoursEvents / allLogs.length) * 100,
        ),
        off_hours_count: offHoursEvents,
      },
    });
  }

  return {
    total_anomalies: anomalies.length,
    anomalies,
    analysis_summary: {
      total_events_analyzed: allLogs.length,
      time_window_hours: timeWindowHours,
      events_per_hour: Math.round(eventsPerHour),
      unique_users: new Set(allLogs.map((log) => log.user_id).filter(Boolean))
        .size,
      unique_ips: ipAddresses.size,
    },
  };
}

// Helper function to calculate risk score
function calculateRiskScore(warnings: any[], totalEvents: number): number {
  let score = 0;

  warnings.forEach((warning) => {
    switch (warning.severity) {
      case 'low':
        score += 1;
        break;
      case 'medium':
        score += 3;
        break;
      case 'high':
        score += 5;
        break;
      case 'critical':
        score += 10;
        break;
    }
  });

  // Normalize based on activity level
  const normalizedScore = Math.min(score * (totalEvents / 100), 100);

  return Math.round(normalizedScore);
}
