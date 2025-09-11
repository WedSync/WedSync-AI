import { NextRequest, NextResponse } from 'next/server';
import { TaskTemplateService } from '@/lib/services/task-template-service';
import { TaskSecurityMiddleware } from '@/middleware/task-security';
import { z } from 'zod';
import { TaskCategory, TaskPriority } from '@/types/workflow';

// Edge Runtime for optimal performance - revolutionary upgrade
export const runtime = 'edge';

// Initialize services with dependency injection
const taskTemplateService = new TaskTemplateService();
const securityMiddleware = new TaskSecurityMiddleware();

// Validation schemas for template operations
const createTemplateSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  category: z.enum([
    'VENUE_MANAGEMENT',
    'VENDOR_COORDINATION',
    'CLIENT_MANAGEMENT',
    'LOGISTICS',
    'DESIGN',
    'PHOTOGRAPHY',
    'CATERING',
    'FLORALS',
    'MUSIC',
    'TRANSPORTATION',
  ]),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  estimated_duration: z.number().min(1).max(1440).optional(), // minutes
  timeline_offset_days: z.number().min(0).max(730), // max 2 years before wedding
  dependencies: z.array(z.string().uuid()).optional(),
  vendor_types: z.array(z.string()).optional(),
  organization_id: z.string().uuid(),
  is_public: z.boolean().optional(),
});

const updateTemplateSchema = createTemplateSchema
  .partial()
  .omit({ organization_id: true });

const templateFiltersSchema = z.object({
  category: z
    .enum([
      'VENUE_MANAGEMENT',
      'VENDOR_COORDINATION',
      'CLIENT_MANAGEMENT',
      'LOGISTICS',
      'DESIGN',
      'PHOTOGRAPHY',
      'CATERING',
      'FLORALS',
      'MUSIC',
      'TRANSPORTATION',
    ])
    .optional(),
  is_public: z.boolean().optional(),
  search: z.string().max(200).optional(),
  wedding_type: z.string().max(100).optional(),
  guest_count_range: z.string().max(50).optional(),
});

/**
 * POST /api/tasks/templates - Template Management API
 * Revolutionary security implementation with comprehensive validation
 * Compatible with existing action-based API pattern
 */
export async function POST(request: NextRequest) {
  let security_result: any = null;
  let request_data: any = null;

  try {
    // Parse and validate request structure
    const raw_data = await request.json();
    const { action, data } = raw_data;

    if (!action || !data) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: action and data',
          code: 'INVALID_REQUEST_FORMAT',
        },
        { status: 400 },
      );
    }

    request_data = data;
    const organization_id = data.organization_id;

    if (!organization_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Organization ID is required',
          code: 'MISSING_ORGANIZATION_ID',
        },
        { status: 400 },
      );
    }

    // Revolutionary security validation for template operations
    security_result = await securityMiddleware.validateTemplateAccess(
      request,
      organization_id,
      action,
      data.template_id,
    );

    if (!security_result.valid) {
      return NextResponse.json(
        {
          success: false,
          error: security_result.message,
          code: 'SECURITY_VALIDATION_FAILED',
        },
        { status: security_result.status },
      );
    }

    // Route to specific action handler
    const result = await routeTemplateAction(
      action,
      data,
      security_result.user,
    );

    // Comprehensive audit logging
    await securityMiddleware.auditTemplateOperation({
      user_id: security_result.user.id,
      organization_id,
      action,
      resource_type: 'task_template',
      data_snapshot: data,
      result_snapshot: result,
      ip_address: security_result.audit_context!.ip_address,
      user_agent: security_result.audit_context!.user_agent,
      request_id: security_result.audit_context!.request_id,
      severity: result.success ? 'low' : 'medium',
    });

    // Return with performance headers
    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json',
        'X-Request-ID': security_result.audit_context!.request_id,
      },
    });
  } catch (error) {
    console.error('Template API error:', error);

    // Security audit for errors
    if (security_result?.valid) {
      await securityMiddleware.auditTemplateOperation({
        user_id: security_result.user.id,
        organization_id: request_data?.organization_id || 'unknown',
        action: 'unknown',
        resource_type: 'task_template',
        data_snapshot: request_data,
        result_snapshot: { error: error.message },
        ip_address: security_result.audit_context!.ip_address,
        user_agent: security_result.audit_context!.user_agent,
        request_id: security_result.audit_context!.request_id,
        severity: 'high',
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        request_id:
          security_result?.audit_context?.request_id || crypto.randomUUID(),
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/tasks/templates - Template Library with Advanced Filtering
 * Compatible with existing analytics and listing patterns
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const organization_id = searchParams.get('organizationId');

  if (!action || !organization_id) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing required parameters: action and organizationId',
        code: 'MISSING_PARAMETERS',
      },
      { status: 400 },
    );
  }

  try {
    // Security validation for GET requests
    const security_result = await securityMiddleware.validateTemplateAccess(
      request,
      organization_id,
      action,
    );

    if (!security_result.valid) {
      return NextResponse.json(
        {
          success: false,
          error: security_result.message,
          code: 'SECURITY_VALIDATION_FAILED',
        },
        { status: security_result.status },
      );
    }

    // Route to GET action handler
    const result = await routeTemplateGetAction(
      action,
      searchParams,
      security_result.user,
    );

    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Cache-Control': 'private, max-age=300', // 5 minute cache for templates
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Template GET API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch template data',
        code: 'FETCH_FAILED',
      },
      { status: 500 },
    );
  }
}

/**
 * Action router for POST operations
 * Implements comprehensive input validation and business logic
 */
async function routeTemplateAction(action: string, data: any, user: any) {
  switch (action) {
    case 'create_template':
      return await handleCreateTemplate(data, user);

    case 'update_template':
      return await handleUpdateTemplate(data, user);

    case 'delete_template':
      return await handleDeleteTemplate(data, user);

    case 'generate_from_template':
      return await handleGenerateFromTemplate(data, user);

    case 'bulk_generate_from_templates':
      return await handleBulkGenerateFromTemplates(data, user);

    default:
      return {
        success: false,
        error: `Unknown action: ${action}`,
        code: 'UNKNOWN_ACTION',
      };
  }
}

/**
 * Action router for GET operations
 */
async function routeTemplateGetAction(
  action: string,
  searchParams: URLSearchParams,
  user: any,
) {
  const organization_id = searchParams.get('organizationId')!;

  switch (action) {
    case 'list_templates':
      return await handleListTemplates(organization_id, searchParams, user);

    case 'get_template_details':
      const template_id = searchParams.get('templateId');
      if (!template_id)
        throw new Error('Template ID required for get_template_details');
      return await handleGetTemplateDetails(template_id, user);

    case 'get_template_analytics':
      return await handleGetTemplateAnalytics(organization_id, user);

    case 'get_popular_templates':
      return await handleGetPopularTemplates(
        organization_id,
        searchParams,
        user,
      );

    default:
      return {
        success: false,
        error: `Unknown GET action: ${action}`,
        code: 'UNKNOWN_GET_ACTION',
      };
  }
}

// POST Action handlers with validation

async function handleCreateTemplate(data: any, user: any) {
  try {
    // Validate input against schema
    const validated_data = createTemplateSchema.parse(data.template_data);

    const result = await taskTemplateService.createTemplate(
      validated_data,
      user.id,
    );

    return {
      success: true,
      data: {
        template: result,
        template_id: result.id,
      },
      message: 'Task template created successfully',
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Template validation failed',
        code: 'VALIDATION_ERROR',
        details: error.errors,
      };
    }

    console.error('Create template error:', error);
    return {
      success: false,
      error: error.message,
      code: 'CREATION_FAILED',
    };
  }
}

async function handleUpdateTemplate(data: any, user: any) {
  try {
    // Validate input against schema
    const validated_data = updateTemplateSchema.parse(data.template_data);

    const result = await taskTemplateService.updateTemplate(
      data.template_id,
      validated_data,
      user.id,
    );

    return {
      success: true,
      data: {
        template: result,
      },
      message: 'Template updated successfully',
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Template update validation failed',
        code: 'VALIDATION_ERROR',
        details: error.errors,
      };
    }

    console.error('Update template error:', error);
    return {
      success: false,
      error: error.message,
      code: 'UPDATE_FAILED',
    };
  }
}

async function handleDeleteTemplate(data: any, user: any) {
  try {
    await taskTemplateService.deleteTemplate(data.template_id, user.id);

    return {
      success: true,
      message: 'Template deleted successfully',
    };
  } catch (error) {
    console.error('Delete template error:', error);
    return {
      success: false,
      error: error.message,
      code: 'DELETION_FAILED',
    };
  }
}

async function handleGenerateFromTemplate(data: any, user: any) {
  try {
    // Validate template generation request
    const generation_request = {
      wedding_id: data.wedding_id,
      template_id: data.template_id,
      customizations: data.customizations || {},
      wedding_date: data.wedding_date,
    };

    if (
      !generation_request.wedding_id ||
      !generation_request.template_id ||
      !generation_request.wedding_date
    ) {
      throw new Error(
        'Missing required fields: wedding_id, template_id, wedding_date',
      );
    }

    const result = await taskTemplateService.generateTasksFromTemplate(
      generation_request,
      user.id,
    );

    return {
      success: true,
      data: {
        generated_tasks: result,
        task_count: result.length,
      },
      message: `Successfully generated ${result.length} task(s) from template`,
    };
  } catch (error) {
    console.error('Generate from template error:', error);
    return {
      success: false,
      error: error.message,
      code: 'GENERATION_FAILED',
    };
  }
}

async function handleBulkGenerateFromTemplates(data: any, user: any) {
  try {
    // Validate bulk generation request
    const { wedding_id, template_ids, wedding_date, customizations } = data;

    if (
      !wedding_id ||
      !template_ids ||
      !Array.isArray(template_ids) ||
      !wedding_date
    ) {
      throw new Error(
        'Missing required fields: wedding_id, template_ids (array), wedding_date',
      );
    }

    const result = await taskTemplateService.generateBulkTasksFromTemplates(
      wedding_id,
      template_ids,
      wedding_date,
      customizations || {},
      user.id,
    );

    return {
      success: true,
      data: {
        generated_tasks: result,
        task_count: result.length,
        templates_processed: template_ids.length,
      },
      message: `Successfully generated ${result.length} tasks from ${template_ids.length} templates`,
    };
  } catch (error) {
    console.error('Bulk generate from templates error:', error);
    return {
      success: false,
      error: error.message,
      code: 'BULK_GENERATION_FAILED',
    };
  }
}

// GET Action handlers

async function handleListTemplates(
  organization_id: string,
  searchParams: URLSearchParams,
  user: any,
) {
  try {
    // Parse and validate filters
    const filters = {
      category: searchParams.get('category') as TaskCategory | undefined,
      is_public: searchParams.get('isPublic')
        ? searchParams.get('isPublic') === 'true'
        : undefined,
      search: searchParams.get('search') || undefined,
      wedding_type: searchParams.get('weddingType') || undefined,
      guest_count_range: searchParams.get('guestCountRange') || undefined,
    };

    // Validate filters against schema
    const validated_filters = templateFiltersSchema.parse(filters);

    const result = await taskTemplateService.getTemplatesByCategory(
      organization_id,
      validated_filters,
    );

    return {
      success: true,
      data: {
        templates: result,
        total_count: result.length,
        filters_applied: validated_filters,
      },
      message: `Found ${result.length} templates`,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Filter validation failed',
        code: 'FILTER_VALIDATION_ERROR',
        details: error.errors,
      };
    }

    console.error('List templates error:', error);
    return {
      success: false,
      error: error.message,
      code: 'LIST_FAILED',
    };
  }
}

async function handleGetTemplateDetails(template_id: string, user: any) {
  try {
    // Get template details with validation
    const template = await taskTemplateService.getTemplate(template_id);

    if (!template) {
      return {
        success: false,
        error: 'Template not found',
        code: 'TEMPLATE_NOT_FOUND',
      };
    }

    return {
      success: true,
      data: {
        template,
      },
      message: 'Template details retrieved successfully',
    };
  } catch (error) {
    console.error('Get template details error:', error);
    return {
      success: false,
      error: error.message,
      code: 'FETCH_DETAILS_FAILED',
    };
  }
}

async function handleGetTemplateAnalytics(organization_id: string, user: any) {
  try {
    const analytics =
      await taskTemplateService.getTemplateAnalytics(organization_id);

    return {
      success: true,
      data: {
        analytics,
        summary: {
          total_templates: analytics.length,
          avg_success_rate:
            analytics.length > 0
              ? analytics.reduce((sum, a) => sum + a.success_rate, 0) /
                analytics.length
              : 0,
          total_usage: analytics.reduce((sum, a) => sum + a.total_usage, 0),
        },
      },
      message: 'Template analytics retrieved successfully',
    };
  } catch (error) {
    console.error('Get template analytics error:', error);
    return {
      success: false,
      error: error.message,
      code: 'ANALYTICS_FAILED',
    };
  }
}

async function handleGetPopularTemplates(
  organization_id: string,
  searchParams: URLSearchParams,
  user: any,
) {
  try {
    const limit = parseInt(searchParams.get('limit') || '10');
    const category = searchParams.get('category') as TaskCategory | undefined;

    const filters = {
      category,
      is_public: true, // Popular templates are typically public
    };

    const templates = await taskTemplateService.getTemplatesByCategory(
      organization_id,
      filters,
    );

    // Sort by usage_count and take top N
    const popular_templates = templates
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, limit);

    return {
      success: true,
      data: {
        popular_templates,
        total_count: popular_templates.length,
        criteria: `Top ${limit} most used templates${category ? ` in ${category}` : ''}`,
      },
      message: `Found ${popular_templates.length} popular templates`,
    };
  } catch (error) {
    console.error('Get popular templates error:', error);
    return {
      success: false,
      error: error.message,
      code: 'POPULAR_TEMPLATES_FAILED',
    };
  }
}
