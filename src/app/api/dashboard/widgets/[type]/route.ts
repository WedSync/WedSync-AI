/**
 * Dashboard Widget API Route - WS-037 Widget Data Endpoints
 * Team B - Round 2 Implementation
 * Handles individual widget data retrieval with caching
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WidgetService, WidgetType } from '@/lib/services/widgetService';
import { DynamicAPIRouteContext, extractParams } from '@/types/next15-params';
import { isValidUUID } from '@/lib/security/input-validation';
import rateLimit from '@/lib/rate-limit';
import { z } from 'zod';

// Rate limiting for widget operations
const widgetRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

// Widget type validation
const validWidgetTypes: WidgetType[] = [
  'summary',
  'upcoming_weddings',
  'recent_activity',
  'tasks',
  'messages',
  'revenue',
];

// Request validation schemas
const widgetConfigSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  limit: z.number().min(1).max(100).optional(),
  daysAhead: z.number().min(1).max(365).optional(),
  period: z.enum(['day', 'week', 'month', 'year']).optional(),
  showComparison: z.boolean().optional(),
  unreadOnly: z.boolean().optional(),
  showTypes: z.array(z.string()).optional(),
  showMetrics: z.array(z.string()).optional(),
  refreshInterval: z.number().min(60).max(3600).optional(),
});

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

  return { user, supabase };
}

// Validate widget type
function validateWidgetType(type: string): WidgetType {
  if (!validWidgetTypes.includes(type as WidgetType)) {
    throw new Error(
      `Invalid widget type: ${type}. Valid types: ${validWidgetTypes.join(', ')}`,
    );
  }
  return type as WidgetType;
}

/**
 * GET /api/dashboard/widgets/[type]
 * Retrieve specific widget data with caching
 */
export async function GET(
  request: NextRequest,
  context: DynamicAPIRouteContext,
) {
  const startTime = Date.now();

  try {
    // Extract async params - Next.js 15 requirement
    const params = await extractParams(context.params);
    const widgetType = validateWidgetType(params.type);

    // Rate limiting
    const identifier = request.ip || 'anonymous';
    const { success, limit, remaining, reset, retryAfter } =
      await widgetRateLimit.check(300, identifier);

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

    // Authentication
    const { user, supabase } = await getAuthenticatedUser(request);

    // Parse query parameters for widget configuration
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());

    // Handle array parameters
    if (queryParams.showTypes) {
      queryParams.showTypes = queryParams.showTypes
        .split(',')
        .map((s) => s.trim());
    }
    if (queryParams.showMetrics) {
      queryParams.showMetrics = queryParams.showMetrics
        .split(',')
        .map((s) => s.trim());
    }

    // Convert numeric parameters
    if (queryParams.limit) {
      queryParams.limit = parseInt(queryParams.limit);
    }
    if (queryParams.daysAhead) {
      queryParams.daysAhead = parseInt(queryParams.daysAhead);
    }
    if (queryParams.refreshInterval) {
      queryParams.refreshInterval = parseInt(queryParams.refreshInterval);
    }

    // Convert boolean parameters
    if (queryParams.showComparison) {
      queryParams.showComparison = queryParams.showComparison === 'true';
    }
    if (queryParams.unreadOnly) {
      queryParams.unreadOnly = queryParams.unreadOnly === 'true';
    }

    const config = widgetConfigSchema.parse(queryParams);

    // Initialize widget service
    const widgetService = new WidgetService(supabase, user.id);

    // Get widget data
    const widgetData = await widgetService.getWidgetData(widgetType, config);

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: {
          widget_type: widgetType,
          widget_data: widgetData.data,
          config,
          last_updated: widgetData.last_updated,
          cache_expires: widgetData.cache_expires,
        },
        meta: {
          supplier_id: user.id,
          response_time_ms: responseTime,
          cache_enabled: true,
          timestamp: new Date().toISOString(),
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
          'X-Widget-Type': widgetType,
        },
      },
    );
  } catch (error) {
    console.error('Widget API Error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    const responseTime = Date.now() - startTime;

    // Determine appropriate status code
    let statusCode = 500;
    if (errorMessage.includes('Authentication required')) {
      statusCode = 401;
    } else if (errorMessage.includes('Invalid widget type')) {
      statusCode = 400;
    } else if (errorMessage.includes('not found')) {
      statusCode = 404;
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
 * PUT /api/dashboard/widgets/[type]
 * Update widget configuration
 */
export async function PUT(
  request: NextRequest,
  context: DynamicAPIRouteContext,
) {
  const startTime = Date.now();

  try {
    // Extract async params
    const params = await extractParams(context.params);
    const widgetType = validateWidgetType(params.type);

    // Rate limiting
    const identifier = request.ip || 'anonymous';
    const { success } = await widgetRateLimit.check(50, identifier);

    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 },
      );
    }

    // Authentication
    const { user, supabase } = await getAuthenticatedUser(request);

    // Parse request body
    const body = await request.json();

    const updateSchema = z.object({
      widget_id: z.string().uuid(),
      config: widgetConfigSchema.optional(),
      position: z
        .object({
          position_x: z.number().min(0).max(12),
          position_y: z.number().min(0).max(12),
          width: z.number().min(1).max(12),
          height: z.number().min(1).max(6),
        })
        .optional(),
      is_enabled: z.boolean().optional(),
    });

    const { widget_id, config, position, is_enabled } =
      updateSchema.parse(body);

    // Initialize widget service
    const widgetService = new WidgetService(supabase, user.id);

    // Prepare update data
    const updateData = {
      ...(config && { widget_config: config }),
      ...(position && position),
      ...(is_enabled !== undefined && { is_enabled }),
    };

    // Update widget
    const updatedWidget = await widgetService.updateWidget(
      widget_id,
      updateData,
    );

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: {
          widget: updatedWidget,
          message: 'Widget updated successfully',
        },
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
    console.error('Widget Update API Error:', error);

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
 * POST /api/dashboard/widgets/[type]
 * Add new widget to dashboard
 */
export async function POST(
  request: NextRequest,
  context: DynamicAPIRouteContext,
) {
  const startTime = Date.now();

  try {
    // Extract async params
    const params = await extractParams(context.params);
    const widgetType = validateWidgetType(params.type);

    // Rate limiting
    const identifier = request.ip || 'anonymous';
    const { success } = await widgetRateLimit.check(20, identifier);

    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 },
      );
    }

    // Authentication
    const { user, supabase } = await getAuthenticatedUser(request);

    // Parse request body
    const body = await request.json();

    const createSchema = z.object({
      config: widgetConfigSchema.optional(),
      position: z
        .object({
          position_x: z.number().min(0).max(12).optional(),
          position_y: z.number().min(0).max(12).optional(),
          width: z.number().min(1).max(12).optional(),
          height: z.number().min(1).max(6).optional(),
        })
        .optional(),
    });

    const { config, position } = createSchema.parse(body);

    // Initialize widget service
    const widgetService = new WidgetService(supabase, user.id);

    // Add widget
    const newWidget = await widgetService.addWidget(
      widgetType,
      config,
      position,
    );

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: {
          widget: newWidget,
          message: 'Widget added successfully',
        },
        meta: {
          supplier_id: user.id,
          response_time_ms: responseTime,
          timestamp: new Date().toISOString(),
        },
      },
      {
        status: 201,
        headers: {
          'X-Response-Time': responseTime.toString(),
        },
      },
    );
  } catch (error) {
    console.error('Widget Create API Error:', error);

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
 * DELETE /api/dashboard/widgets/[type]
 * Remove widget from dashboard
 */
export async function DELETE(
  request: NextRequest,
  context: DynamicAPIRouteContext,
) {
  const startTime = Date.now();

  try {
    // Extract async params
    const params = await extractParams(context.params);
    const widgetType = validateWidgetType(params.type);

    // Rate limiting
    const identifier = request.ip || 'anonymous';
    const { success: rateLimitSuccess } = await widgetRateLimit.check(
      10,
      identifier,
    );

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 },
      );
    }

    // Authentication
    const { user, supabase } = await getAuthenticatedUser(request);

    // Get widget_id from query params
    const url = new URL(request.url);
    const widgetId = url.searchParams.get('widget_id');

    if (!widgetId || !isValidUUID(widgetId)) {
      return NextResponse.json(
        { error: 'Valid widget_id is required' },
        { status: 400 },
      );
    }

    // Initialize widget service
    const widgetService = new WidgetService(supabase, user.id);

    // Remove widget
    const success = await widgetService.removeWidget(widgetId);

    if (!success) {
      return NextResponse.json(
        { error: 'Widget not found or could not be deleted' },
        { status: 404 },
      );
    }

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: {
          message: 'Widget removed successfully',
          widget_id: widgetId,
        },
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
    console.error('Widget Delete API Error:', error);

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
