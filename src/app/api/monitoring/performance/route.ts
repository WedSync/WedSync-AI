/**
 * WS-154: Database Performance Monitoring API
 * Team D - Round 1 - Comprehensive database monitoring API endpoints
 * Provides secure access to database performance views and metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { supabase } from '@/lib/database/supabase-admin';
import { logger } from '@/lib/monitoring/structured-logger';
import { z } from 'zod';

// SECURITY: Input validation schemas
const performanceQuerySchema = z.object({
  time_range: z.enum(['1h', '6h', '24h']).default('1h'),
  query_type: z
    .enum(['slow', 'connections', 'tables', 'rls', 'summary'])
    .optional(),
  include_details: z.boolean().default(false),
});

// Rate limiting map for admin endpoints
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// SECURITY: Rate limiting function
function checkRateLimit(clientId: string, maxRequests = 30): boolean {
  const now = Date.now();
  const windowMs = 60000; // 1 minute window

  const existing = rateLimitMap.get(clientId);
  if (!existing || now > existing.resetTime) {
    rateLimitMap.set(clientId, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (existing.count >= maxRequests) {
    return false;
  }

  existing.count++;
  return true;
}

// SECURITY: Admin role verification
async function verifyAdminAccess(
  request: NextRequest,
): Promise<{ authorized: boolean; user?: any; error?: string }> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return { authorized: false, error: 'Authentication required' };
    }

    // SECURITY: Check if user has admin or developer role
    const { data: userProfile, error } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    if (error || !userProfile) {
      logger.warn(
        'Database monitoring access attempt without organization membership',
        {
          userId: session.user.id,
          error: error?.message,
        },
      );
      return { authorized: false, error: 'Organization membership required' };
    }

    if (!['admin', 'owner', 'developer'].includes(userProfile.role)) {
      logger.warn('Database monitoring access denied - insufficient role', {
        userId: session.user.id,
        role: userProfile.role,
      });
      return {
        authorized: false,
        error: 'Admin or developer access required for database monitoring',
      };
    }

    return { authorized: true, user: session.user };
  } catch (error) {
    logger.error('Admin access verification failed', error as Error);
    return { authorized: false, error: 'Access verification failed' };
  }
}

// SECURITY: Data sanitization for database metrics
function sanitizeDatabaseMetrics(data: any): any {
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeDatabaseMetrics(item));
  }

  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Remove sensitive fields that might contain user data
      if (['query', 'username', 'client_addr', 'user_agent'].includes(key)) {
        if (key === 'query') {
          sanitized['query_preview'] =
            typeof value === 'string'
              ? value.substring(0, 50) + '...'
              : '[QUERY]';
        }
        // Skip other sensitive fields
        continue;
      }
      sanitized[key] = sanitizeDatabaseMetrics(value);
    }
    return sanitized;
  }

  return data;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // SECURITY: Extract client identifier for rate limiting
    const clientId =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // SECURITY: Rate limiting
    if (!checkRateLimit(clientId)) {
      logger.warn('Rate limit exceeded for database monitoring API', {
        clientId,
      });
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Maximum 30 requests per minute.',
          retryAfter: 60,
        },
        { status: 429 },
      );
    }

    // SECURITY: Verify admin access
    const {
      authorized,
      user,
      error: authError,
    } = await verifyAdminAccess(request);
    if (!authorized) {
      return NextResponse.json({ error: authError }, { status: 403 });
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      time_range: searchParams.get('time_range') || '1h',
      query_type: searchParams.get('query_type'),
      include_details: searchParams.get('include_details') === 'true',
    };

    const validatedData = performanceQuerySchema.parse(queryParams);

    logger.info('Database performance metrics requested', {
      userId: user.id,
      timeRange: validatedData.time_range,
      queryType: validatedData.query_type,
      clientId,
    });

    // Fetch data based on query type
    let responseData: any = {};

    if (!validatedData.query_type || validatedData.query_type === 'summary') {
      // Get comprehensive summary
      const { data: summaryData, error: summaryError } = await supabase.rpc(
        'get_database_monitoring_summary',
      );

      if (summaryError) {
        logger.error(
          'Failed to fetch database monitoring summary',
          summaryError,
        );
        throw new Error('Failed to fetch monitoring summary');
      }

      responseData.summary = summaryData;
    }

    if (!validatedData.query_type || validatedData.query_type === 'slow') {
      // Get slow queries
      const { data: slowQueries, error: slowError } = await supabase
        .from('monitoring_slow_queries')
        .select('*')
        .order('duration_ms', { ascending: false })
        .limit(validatedData.include_details ? 50 : 10);

      if (slowError) {
        logger.error('Failed to fetch slow queries', slowError);
      } else {
        responseData.slowQueries = sanitizeDatabaseMetrics(slowQueries);
      }
    }

    if (
      !validatedData.query_type ||
      validatedData.query_type === 'connections'
    ) {
      // Get connection pool status
      const { data: connections, error: connError } = await supabase
        .from('monitoring_connections')
        .select('*');

      if (connError) {
        logger.error('Failed to fetch connection metrics', connError);
      } else {
        responseData.connections = sanitizeDatabaseMetrics(connections);
      }
    }

    if (!validatedData.query_type || validatedData.query_type === 'tables') {
      // Get table health metrics
      const limit = validatedData.include_details ? 100 : 20;
      const { data: tableHealth, error: tableError } = await supabase
        .from('monitoring_table_health')
        .select('*')
        .order('total_size_bytes', { ascending: false })
        .limit(limit);

      if (tableError) {
        logger.error('Failed to fetch table health metrics', tableError);
      } else {
        responseData.tableHealth = sanitizeDatabaseMetrics(tableHealth);
      }
    }

    if (!validatedData.query_type || validatedData.query_type === 'rls') {
      // Get RLS policy status
      const { data: rlsStatus, error: rlsError } = await supabase
        .from('monitoring_rls_status')
        .select('*')
        .order('security_risk_level', { ascending: false });

      if (rlsError) {
        logger.error('Failed to fetch RLS status', rlsError);
      } else {
        responseData.rlsStatus = sanitizeDatabaseMetrics(rlsStatus);
      }
    }

    // Add recent monitoring events
    const { data: recentEvents, error: eventsError } = await supabase
      .from('monitoring_events')
      .select('id, event_type, severity, created_at, resolved_at')
      .gte(
        'created_at',
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      )
      .order('created_at', { ascending: false })
      .limit(10);

    if (!eventsError) {
      responseData.recentEvents = recentEvents;
    }

    const responseTime = Date.now() - startTime;

    // SECURITY: Log successful access
    logger.info('Database performance metrics served', {
      userId: user.id,
      responseTime,
      dataTypes: Object.keys(responseData),
      clientId,
    });

    const response = {
      data: responseData,
      metadata: {
        timestamp: new Date().toISOString(),
        responseTime,
        timeRange: validatedData.time_range,
        queryType: validatedData.query_type || 'all',
        includeDetails: validatedData.include_details,
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;

    logger.error('Database performance monitoring API error', error as Error, {
      path: request.nextUrl.pathname,
      method: 'GET',
      responseTime,
    });

    // SECURITY: Generic error message to prevent information leakage
    return NextResponse.json(
      {
        error: 'Database monitoring service temporarily unavailable',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // SECURITY: Extract client identifier
    const clientId =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // SECURITY: Rate limiting for POST operations (stricter)
    if (!checkRateLimit(clientId, 10)) {
      logger.warn('Rate limit exceeded for database monitoring POST', {
        clientId,
      });
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Maximum 10 POST requests per minute.',
          retryAfter: 60,
        },
        { status: 429 },
      );
    }

    // SECURITY: Verify admin access
    const {
      authorized,
      user,
      error: authError,
    } = await verifyAdminAccess(request);
    if (!authorized) {
      return NextResponse.json({ error: authError }, { status: 403 });
    }

    const body = await request.json();

    // Handle different POST operations
    if (body.action === 'resolve_event') {
      const { event_id, resolution_notes } = body;

      if (!event_id) {
        return NextResponse.json(
          { error: 'event_id required' },
          { status: 400 },
        );
      }

      const { error: updateError } = await supabase
        .from('monitoring_events')
        .update({
          resolved_at: new Date().toISOString(),
          resolution_notes: resolution_notes || 'Resolved via API',
        })
        .eq('id', event_id);

      if (updateError) {
        logger.error('Failed to resolve monitoring event', updateError);
        return NextResponse.json(
          { error: 'Failed to resolve event' },
          { status: 500 },
        );
      }

      logger.info('Monitoring event resolved', {
        eventId: event_id,
        resolvedBy: user.id,
        notes: resolution_notes,
      });

      return NextResponse.json({
        success: true,
        message: 'Event resolved successfully',
      });
    }

    if (body.action === 'record_event') {
      const { event_type, event_data, severity } = body;

      if (!event_type || !event_data) {
        return NextResponse.json(
          { error: 'event_type and event_data required' },
          { status: 400 },
        );
      }

      const { data: eventId, error: insertError } = await supabase.rpc(
        'record_monitoring_event',
        {
          p_event_type: event_type,
          p_event_data: event_data,
          p_severity: severity || 'medium',
          p_source_ip: clientId,
          p_user_agent: request.headers.get('user-agent'),
        },
      );

      if (insertError) {
        logger.error('Failed to record monitoring event', insertError);
        return NextResponse.json(
          { error: 'Failed to record event' },
          { status: 500 },
        );
      }

      logger.info('Monitoring event recorded', {
        eventId,
        eventType: event_type,
        severity,
        recordedBy: user.id,
      });

      return NextResponse.json({
        success: true,
        eventId,
        message: 'Event recorded successfully',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    const responseTime = Date.now() - startTime;

    logger.error('Database performance monitoring POST error', error as Error, {
      path: request.nextUrl.pathname,
      method: 'POST',
      responseTime,
    });

    return NextResponse.json(
      {
        error: 'Database monitoring service temporarily unavailable',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
