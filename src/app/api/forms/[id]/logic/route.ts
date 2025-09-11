import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import rateLimit from '@/lib/rate-limit';
import { DynamicAPIRouteContext, extractParams } from '@/types/next15-params';

// Rate limiting for conditional logic processing
const logicRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 1000, // High frequency for real-time form interactions
});

// Conditional logic evaluation schema
const logicEvaluationSchema = z.object({
  formData: z.record(z.any()),
  targetField: z.string().optional(), // Specific field to evaluate logic for
  action: z
    .enum([
      'show',
      'hide',
      'enable',
      'disable',
      'require',
      'optional',
      'validate',
    ])
    .optional(),
  context: z
    .object({
      userAgent: z.string().optional(),
      device: z.string().optional(),
      timestamp: z.string().datetime().optional(),
      sessionId: z.string().optional(),
    })
    .optional(),
});

// Logic rule creation/update schema
const logicRuleSchema = z.object({
  fieldId: z.string().uuid(),
  conditions: z.array(
    z.object({
      sourceField: z.string(),
      operator: z.enum([
        'equals',
        'not_equals',
        'contains',
        'not_contains',
        'greater_than',
        'less_than',
        'greater_or_equal',
        'less_or_equal',
        'is_empty',
        'is_not_empty',
        'starts_with',
        'ends_with',
        'regex_match',
        'in_list',
        'not_in_list',
      ]),
      value: z.any(),
      logicalOperator: z.enum(['AND', 'OR']).optional(),
    }),
  ),
  actions: z.array(
    z.object({
      type: z.enum([
        'show_field',
        'hide_field',
        'enable_field',
        'disable_field',
        'make_required',
        'make_optional',
        'set_value',
        'clear_value',
        'show_section',
        'hide_section',
        'jump_to_step',
        'calculate_value',
      ]),
      targetField: z.string().optional(),
      value: z.any().optional(),
      animation: z.enum(['fade', 'slide', 'none']).optional().default('fade'),
    }),
  ),
  priority: z.number().int().min(1).max(100).optional().default(50),
  isActive: z.boolean().optional().default(true),
});

// Sanitize logic data
function sanitizeLogicData(data: any): any {
  if (typeof data === 'string') {
    return DOMPurify.sanitize(data, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
      SANITIZE_DOM: true,
      SAFE_FOR_TEMPLATES: true,
    });
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeLogicData);
  }

  if (data && typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeLogicData(value);
    }
    return sanitized;
  }

  return data;
}

// Validate UUID format
const uuidSchema = z.string().uuid();

// POST /api/forms/[id]/logic - Process conditional logic
export async function POST(
  request: NextRequest,
  context: DynamicAPIRouteContext,
) {
  const params = await extractParams(context.params);

  try {
    // Rate limiting
    const identifier = request.ip || 'anonymous';
    const { success } = await logicRateLimit.check(50, identifier);

    if (!success) {
      return NextResponse.json(
        { error: 'Too many logic processing requests' },
        { status: 429 },
      );
    }

    // Validate form ID
    const formId = uuidSchema.parse(params.id);

    const supabase = await createClient();

    // Verify form exists and is active
    const { data: form, error: formError } = await supabase
      .from('form_builder.forms')
      .select('id, title, is_active, organization_id')
      .eq('id', formId)
      .eq('is_active', true)
      .single();

    if (formError || !form) {
      return NextResponse.json(
        { error: 'Form not found or inactive' },
        { status: 404 },
      );
    }

    // Parse and validate request
    const body = await request.json();
    const sanitizedBody = sanitizeLogicData(body);
    const logicRequest = logicEvaluationSchema.parse(sanitizedBody);

    // Process conditional logic using database function
    const { data: logicResult, error: logicError } = await supabase.rpc(
      'process_conditional_logic',
      {
        form_id: formId,
        form_data: logicRequest.formData,
        target_field: logicRequest.targetField,
        context: {
          user_agent:
            logicRequest.context?.userAgent ||
            request.headers.get('user-agent'),
          device: logicRequest.context?.device || 'unknown',
          timestamp:
            logicRequest.context?.timestamp || new Date().toISOString(),
          session_id: logicRequest.context?.sessionId,
          ip_address: request.ip,
        },
      },
    );

    if (logicError) {
      console.error('Conditional logic processing error:', logicError);
      return NextResponse.json(
        { error: 'Failed to process conditional logic' },
        { status: 500 },
      );
    }

    // Structure the response
    const processedResult = {
      formId,
      processedAt: new Date().toISOString(),
      results: {
        fieldsToShow: logicResult.fields_to_show || [],
        fieldsToHide: logicResult.fields_to_hide || [],
        fieldsToEnable: logicResult.fields_to_enable || [],
        fieldsToDisable: logicResult.fields_to_disable || [],
        fieldsToRequire: logicResult.fields_to_require || [],
        fieldsToMakeOptional: logicResult.fields_to_make_optional || [],
        sectionsToShow: logicResult.sections_to_show || [],
        sectionsToHide: logicResult.sections_to_hide || [],
        calculatedValues: logicResult.calculated_values || {},
        validationErrors: logicResult.validation_errors || [],
        nextStep: logicResult.next_step,
        isComplete: logicResult.is_complete || false,
      },
      metadata: {
        rulesProcessed: logicResult.rules_processed || 0,
        executionTimeMs: logicResult.execution_time_ms || 0,
        cacheHit: logicResult.cache_hit || false,
        debugInfo: logicResult.debug_info || null,
      },
    };

    // Log logic processing for analytics (non-blocking)
    supabase
      .rpc('log_conditional_logic_usage', {
        form_id: formId,
        organization_id: form.organization_id,
        rules_processed: processedResult.metadata.rulesProcessed,
        execution_time: processedResult.metadata.executionTimeMs,
        fields_affected: [
          ...processedResult.results.fieldsToShow,
          ...processedResult.results.fieldsToHide,
          ...processedResult.results.fieldsToRequire,
        ].length,
      })
      .then(({ error }) => {
        if (error) console.error('Logic usage logging error:', error);
      });

    return NextResponse.json({
      success: true,
      logic: processedResult,
    });
  } catch (error) {
    console.error('Conditional logic error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid logic processing request',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Logic processing failed',
      },
      { status: 500 },
    );
  }
}

// PUT /api/forms/[id]/logic - Create or update conditional logic rules
export async function PUT(
  request: NextRequest,
  context: DynamicAPIRouteContext,
) {
  const params = await extractParams(context.params);

  try {
    // Rate limiting (stricter for rule updates)
    const identifier = request.ip || 'anonymous';
    const { success } = await logicRateLimit.check(10, identifier);

    if (!success) {
      return NextResponse.json(
        { error: 'Too many rule update requests' },
        { status: 429 },
      );
    }

    // Validate form ID
    const formId = uuidSchema.parse(params.id);

    const supabase = await createClient();

    // Authentication required for rule updates
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Verify form ownership
    const { data: form, error: formError } = await supabase
      .from('form_builder.forms')
      .select('id, organization_id, supplier_id')
      .eq('id', formId)
      .eq('supplier_id', user.id)
      .single();

    if (formError || !form) {
      return NextResponse.json(
        { error: 'Form not found or access denied' },
        { status: 404 },
      );
    }

    // Parse and validate logic rule
    const body = await request.json();
    const sanitizedBody = sanitizeLogicData(body);
    const logicRule = logicRuleSchema.parse(sanitizedBody);

    // Create or update conditional logic rule
    const { data: savedRule, error: saveError } = await supabase.rpc(
      'upsert_conditional_logic_rule',
      {
        form_id: formId,
        field_id: logicRule.fieldId,
        conditions: logicRule.conditions,
        actions: logicRule.actions,
        priority: logicRule.priority,
        is_active: logicRule.isActive,
      },
    );

    if (saveError) {
      console.error('Logic rule save error:', saveError);
      return NextResponse.json(
        { error: 'Failed to save logic rule' },
        { status: 500 },
      );
    }

    // Clear logic cache for this form
    await supabase.rpc('clear_logic_cache', { form_id: formId });

    return NextResponse.json({
      success: true,
      rule: savedRule,
      message: 'Conditional logic rule saved successfully',
    });
  } catch (error) {
    console.error('Logic rule update error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid logic rule data',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update logic rule',
      },
      { status: 500 },
    );
  }
}

// GET /api/forms/[id]/logic - Get form's conditional logic rules
export async function GET(
  request: NextRequest,
  context: DynamicAPIRouteContext,
) {
  const params = await extractParams(context.params);

  try {
    // Rate limiting
    const identifier = request.ip || 'anonymous';
    const { success } = await logicRateLimit.check(100, identifier);

    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Validate form ID
    const formId = uuidSchema.parse(params.id);

    const supabase = await createClient();

    // Get conditional logic rules
    const { data: logicRules, error } = await supabase
      .from('form_builder.field_dependencies')
      .select(
        `
        id,
        dependent_field_id,
        source_field_id,
        condition_operator,
        condition_value,
        action_type,
        action_value,
        priority,
        is_active,
        created_at,
        updated_at
      `,
      )
      .eq('form_id', formId)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error) {
      console.error('Logic rules fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to get logic rules' },
        { status: 500 },
      );
    }

    // Structure the logic rules response
    const structuredRules =
      logicRules?.map((rule) => ({
        id: rule.id,
        fieldId: rule.dependent_field_id,
        sourceField: rule.source_field_id,
        condition: {
          operator: rule.condition_operator,
          value: rule.condition_value,
        },
        action: {
          type: rule.action_type,
          value: rule.action_value,
        },
        priority: rule.priority,
        isActive: rule.is_active,
        createdAt: rule.created_at,
        updatedAt: rule.updated_at,
      })) || [];

    return NextResponse.json({
      success: true,
      formId,
      rules: structuredRules,
      totalRules: structuredRules.length,
      capabilities: {
        supportedOperators: [
          'equals',
          'not_equals',
          'contains',
          'not_contains',
          'greater_than',
          'less_than',
          'is_empty',
          'is_not_empty',
        ],
        supportedActions: [
          'show_field',
          'hide_field',
          'enable_field',
          'disable_field',
          'make_required',
          'make_optional',
          'set_value',
          'clear_value',
        ],
        maxRulesPerField: 10,
        realTimeProcessing: true,
      },
    });
  } catch (error) {
    console.error('Logic rules get error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid form ID format' },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to get logic rules' },
      { status: 500 },
    );
  }
}
