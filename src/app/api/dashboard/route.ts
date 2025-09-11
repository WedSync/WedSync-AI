/**
 * Dashboard API Route - WS-037 Main Dashboard Backend
 * Team B - Round 2 Implementation
 * Handles dashboard data aggregation with caching and real-time updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DashboardService } from '@/lib/services/dashboardService';
import {
  isValidUUID,
  validateAndSanitizeObject,
} from '@/lib/security/input-validation';
import rateLimit from '@/lib/rate-limit';
import { z } from 'zod';

// Rate limiting for dashboard operations
const dashboardRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 1000,
});

// Request validation schemas
const dashboardFiltersSchema = z.object({
  dateRange: z.enum(['7d', '30d', '90d', '1y']).optional(),
  status: z.array(z.string()).optional(),
  weddingType: z.string().optional(),
  includeWidgets: z.boolean().optional(),
  refreshCache: z.boolean().optional(),
});

// CSRF token validation
function validateCSRFToken(request: NextRequest): boolean {
  const csrfToken = request.headers.get('x-csrf-token');
  const sessionToken = request.cookies.get('csrf-token')?.value;

  if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
    return false;
  }

  return true;
}

// Authentication helper
async function getAuthenticatedUser(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Authentication required');
  }

  // Validate supplier access
  const { data: supplier, error: supplierError } = await supabase
    .from('suppliers')
    .select('id, status')
    .eq('id', user.id)
    .single();

  if (supplierError || !supplier) {
    throw new Error('Supplier account not found');
  }

  if (supplier.status !== 'active') {
    throw new Error('Supplier account is not active');
  }

  return { user, supplier };
}

/**
 * GET /api/dashboard
 * Retrieve comprehensive dashboard data with caching
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Rate limiting
    const identifier = request.ip || 'anonymous';
    const { success, limit, remaining, reset, retryAfter } =
      await dashboardRateLimit.check(200, identifier);

    if (!success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          limit,
          remaining,
          reset,
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
            'Retry-After': retryAfter?.toString() || '60',
          },
        },
      );
    }

    // Authentication and authorization
    const { user, supplier } = await getAuthenticatedUser(request);

    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());

    // Handle array parameters
    if (queryParams.status) {
      queryParams.status = queryParams.status.split(',').map((s) => s.trim());
    }

    // Convert boolean strings
    if (queryParams.includeWidgets) {
      queryParams.includeWidgets = queryParams.includeWidgets === 'true';
    }
    if (queryParams.refreshCache) {
      queryParams.refreshCache = queryParams.refreshCache === 'true';
    }

    const filters = dashboardFiltersSchema.parse(queryParams);

    // Initialize dashboard service
    const supabase = await createClient();
    const dashboardService = new DashboardService(supabase, user.id);

    // Refresh cache if requested
    if (filters.refreshCache) {
      await dashboardService.invalidateCache();
    }

    // Get dashboard data
    const dashboardData = await dashboardService.getDashboardData({
      dateRange: filters.dateRange,
      status: filters.status,
      weddingType: filters.weddingType,
    });

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: dashboardData,
        meta: {
          supplier_id: user.id,
          response_time_ms: responseTime,
          cache_enabled: true,
          last_updated: new Date().toISOString(),
        },
        rate_limit: {
          limit,
          remaining,
          reset,
        },
      },
      {
        status: 200,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
          'Cache-Control': 'private, max-age=300', // 5 minutes browser cache
          'X-Response-Time': responseTime.toString(),
        },
      },
    );
  } catch (error) {
    console.error('Dashboard API Error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    const responseTime = Date.now() - startTime;

    // Determine appropriate status code
    let statusCode = 500;
    if (errorMessage.includes('Authentication required')) {
      statusCode = 401;
    } else if (
      errorMessage.includes('not found') ||
      errorMessage.includes('not active')
    ) {
      statusCode = 403;
    } else if (errorMessage.includes('Invalid')) {
      statusCode = 400;
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        meta: {
          response_time_ms: responseTime,
          timestamp: new Date().toISOString(),
        },
      },
      {
        status: statusCode,
        headers: {
          'X-Response-Time': responseTime.toString(),
        },
      },
    );
  }
}

/**
 * POST /api/dashboard
 * Log dashboard activity or refresh specific data
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Rate limiting
    const identifier = request.ip || 'anonymous';
    const { success, limit, remaining, reset, retryAfter } =
      await dashboardRateLimit.check(50, identifier);

    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 },
      );
    }

    // CSRF validation
    if (!validateCSRFToken(request)) {
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 },
      );
    }

    // Authentication
    const { user } = await getAuthenticatedUser(request);

    // Parse request body
    const body = await request.json();

    const actionSchema = z.object({
      action: z.enum(['log_activity', 'refresh_metrics', 'invalidate_cache']),
      data: z
        .object({
          activity_type: z.string().optional(),
          entity_type: z.string().optional(),
          title: z.string().optional(),
          description: z.string().optional(),
          entity_id: z.string().optional(),
          metadata: z.record(z.unknown()).optional(),
          cache_pattern: z.string().optional(),
        })
        .optional(),
    });

    const { action, data } = actionSchema.parse(body);

    const supabase = await createClient();
    const dashboardService = new DashboardService(supabase, user.id);

    let result: unknown;

    switch (action) {
      case 'log_activity':
        if (!data?.activity_type || !data?.entity_type || !data?.title) {
          return NextResponse.json(
            { error: 'Missing required fields for activity logging' },
            { status: 400 },
          );
        }

        await dashboardService.logActivity(
          data.activity_type,
          data.entity_type,
          data.title,
          data.description,
          data.entity_id,
          data.metadata,
        );

        result = { message: 'Activity logged successfully' };
        break;

      case 'refresh_metrics':
        // Trigger refresh of materialized view
        const { error: refreshError } = await supabase.rpc(
          'refresh_dashboard_metrics',
        );

        if (refreshError) {
          throw new Error(`Failed to refresh metrics: ${refreshError.message}`);
        }

        // Invalidate related cache
        await dashboardService.invalidateCache('metrics:*');

        result = { message: 'Metrics refreshed successfully' };
        break;

      case 'invalidate_cache':
        const pattern = data?.cache_pattern || '*';
        const invalidated = await dashboardService.invalidateCache(pattern);

        result = {
          message: 'Cache invalidated successfully',
          invalidated_keys: invalidated,
        };
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        result,
        meta: {
          action,
          supplier_id: user.id,
          response_time_ms: responseTime,
          timestamp: new Date().toISOString(),
        },
      },
      {
        status: 200,
        headers: {
          'X-Response-Time': responseTime.toString(),
        },
      },
    );
  } catch (error) {
    console.error('Dashboard POST API Error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    const responseTime = Date.now() - startTime;

    let statusCode = 500;
    if (errorMessage.includes('Authentication required')) {
      statusCode = 401;
    } else if (errorMessage.includes('Invalid')) {
      statusCode = 400;
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        meta: {
          response_time_ms: responseTime,
          timestamp: new Date().toISOString(),
        },
      },
      {
        status: statusCode,
        headers: {
          'X-Response-Time': responseTime.toString(),
        },
      },
    );
  }
}

/**
 * PATCH /api/dashboard
 * Update dashboard configuration or settings
 */
export async function PATCH(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Rate limiting
    const identifier = request.ip || 'anonymous';
    const { success } = await dashboardRateLimit.check(20, identifier);

    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 },
      );
    }

    // CSRF validation
    if (!validateCSRFToken(request)) {
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 },
      );
    }

    // Authentication
    const { user } = await getAuthenticatedUser(request);

    // Parse request body
    const body = await request.json();

    const updateSchema = z.object({
      settings: z
        .object({
          auto_refresh: z.boolean().optional(),
          refresh_interval: z.number().min(30).max(3600).optional(),
          default_date_range: z.enum(['7d', '30d', '90d', '1y']).optional(),
          enabled_widgets: z.array(z.string()).optional(),
        })
        .optional(),
      layout: z
        .object({
          grid_columns: z.number().min(6).max(24).optional(),
          compact_mode: z.boolean().optional(),
        })
        .optional(),
    });

    const updates = updateSchema.parse(body);

    // Update dashboard settings in database
    const supabase = await createClient();

    const { error } = await supabase.from('dashboard_settings').upsert({
      supplier_id: user.id,
      settings: updates.settings || {},
      layout: updates.layout || {},
      updated_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Failed to update dashboard settings: ${error.message}`);
    }

    // Invalidate dashboard cache
    const dashboardService = new DashboardService(supabase, user.id);
    await dashboardService.invalidateCache();

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        message: 'Dashboard settings updated successfully',
        meta: {
          supplier_id: user.id,
          response_time_ms: responseTime,
          timestamp: new Date().toISOString(),
        },
      },
      {
        status: 200,
        headers: {
          'X-Response-Time': responseTime.toString(),
        },
      },
    );
  } catch (error) {
    console.error('Dashboard PATCH API Error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    const responseTime = Date.now() - startTime;

    let statusCode = 500;
    if (errorMessage.includes('Authentication required')) {
      statusCode = 401;
    } else if (errorMessage.includes('Invalid')) {
      statusCode = 400;
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        meta: {
          response_time_ms: responseTime,
          timestamp: new Date().toISOString(),
        },
      },
      {
        status: statusCode,
        headers: {
          'X-Response-Time': responseTime.toString(),
        },
      },
    );
  }
}
