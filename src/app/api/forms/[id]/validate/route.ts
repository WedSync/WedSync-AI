import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import rateLimit from '@/lib/rate-limit';
import { DynamicAPIRouteContext, extractParams } from '@/types/next15-params';

// Stricter rate limiting for real-time validation (high-frequency requests)
const validateRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 2000, // Allow many requests for real-time validation
});

// Real-time field validation schema
const fieldValidationSchema = z.object({
  fieldId: z.string().min(1, 'Field ID is required'),
  value: z.any(),
  context: z.record(z.any()).optional(), // Other form field values for conditional validation
  validateAll: z.boolean().optional().default(false), // Whether to validate entire form or just this field
});

// Batch validation schema for multiple fields
const batchValidationSchema = z.object({
  fields: z.array(
    z.object({
      fieldId: z.string(),
      value: z.any(),
    }),
  ),
  context: z.record(z.any()).optional(),
});

// Sanitize field value for validation
function sanitizeFieldValue(value: any): any {
  if (typeof value === 'string') {
    return DOMPurify.sanitize(value, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
      SANITIZE_DOM: true,
      SAFE_FOR_TEMPLATES: true,
    });
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeFieldValue);
  }

  if (value && typeof value === 'object') {
    const sanitized: any = {};
    for (const [key, val] of Object.entries(value)) {
      sanitized[key] = sanitizeFieldValue(val);
    }
    return sanitized;
  }

  return value;
}

// Validate UUID format
const uuidSchema = z.string().uuid();

// POST /api/forms/[id]/validate - Real-time field validation
export async function POST(
  request: NextRequest,
  context: DynamicAPIRouteContext,
) {
  const params = await extractParams(context.params);

  try {
    // Rate limiting for real-time validation
    const identifier = request.ip || 'anonymous';
    const { success } = await validateRateLimit.check(100, identifier); // Higher limit for real-time

    if (!success) {
      return NextResponse.json(
        { error: 'Too many validation requests' },
        { status: 429 },
      );
    }

    // Validate form ID
    const formId = uuidSchema.parse(params.id);

    const supabase = await createClient();

    // Get form configuration from new form_builder schema
    const { data: form, error: formError } = await supabase
      .from('form_builder.forms')
      .select(
        `
        id,
        title,
        is_active,
        is_published,
        organization_id,
        settings
      `,
      )
      .eq('id', formId)
      .eq('is_active', true)
      .single();

    if (formError || !form) {
      return NextResponse.json(
        { error: 'Form not found or inactive' },
        { status: 404 },
      );
    }

    // Parse request body
    const body = await request.json();

    // Determine if this is single field or batch validation
    const isBatch = body.fields && Array.isArray(body.fields);
    let validationResult;

    if (isBatch) {
      // Batch validation
      const batchData = batchValidationSchema.parse(body);

      // Sanitize all field values
      const sanitizedFields = batchData.fields.map((field) => ({
        fieldId: field.fieldId,
        value: sanitizeFieldValue(field.value),
      }));

      // Call database function for batch validation
      const { data, error } = await supabase.rpc('validate_form_fields_batch', {
        form_id: formId,
        field_values: sanitizedFields.reduce(
          (acc, field) => {
            acc[field.fieldId] = field.value;
            return acc;
          },
          {} as Record<string, any>,
        ),
        context: sanitizeFieldValue(batchData.context || {}),
      });

      if (error) {
        console.error('Batch validation error:', error);
        return NextResponse.json(
          { error: 'Validation service unavailable' },
          { status: 500 },
        );
      }

      validationResult = {
        isValid: data.is_valid,
        fields: data.field_results || {},
        errors: data.errors || [],
        warnings: data.warnings || [],
        conditionallyVisible: data.conditionally_visible || [],
        conditionallyRequired: data.conditionally_required || [],
      };
    } else {
      // Single field validation
      const fieldData = fieldValidationSchema.parse(body);

      // Sanitize field value
      const sanitizedValue = sanitizeFieldValue(fieldData.value);
      const sanitizedContext = sanitizeFieldValue(fieldData.context || {});

      // Call database function for single field validation
      const { data, error } = await supabase.rpc('validate_single_field', {
        form_id: formId,
        field_id: fieldData.fieldId,
        field_value: sanitizedValue,
        context: sanitizedContext,
        validate_all: fieldData.validateAll || false,
      });

      if (error) {
        console.error('Field validation error:', error);
        return NextResponse.json(
          { error: 'Validation service unavailable' },
          { status: 500 },
        );
      }

      validationResult = {
        isValid: data.is_valid,
        fieldId: fieldData.fieldId,
        errors: data.errors || [],
        warnings: data.warnings || [],
        suggestions: data.suggestions || [],
        conditionalUpdates: data.conditional_updates || {},
        formState: fieldData.validateAll ? data.form_state : undefined,
      };
    }

    // Add performance metrics
    const responseTime = Date.now();
    validationResult.metadata = {
      validatedAt: new Date().toISOString(),
      responseTimeMs: Date.now() - responseTime,
      formVersion: form.settings?.version || '1.0',
      validationType: isBatch ? 'batch' : 'single',
    };

    return NextResponse.json({
      success: true,
      validation: validationResult,
    });
  } catch (error) {
    console.error('Form validation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid validation request',
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
        error: error instanceof Error ? error.message : 'Validation failed',
      },
      { status: 500 },
    );
  }
}

// GET /api/forms/[id]/validate - Get form validation schema
export async function GET(
  request: NextRequest,
  context: DynamicAPIRouteContext,
) {
  const params = await extractParams(context.params);

  try {
    // Rate limiting
    const identifier = request.ip || 'anonymous';
    const { success } = await validateRateLimit.check(50, identifier);

    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Validate form ID
    const formId = uuidSchema.parse(params.id);

    const supabase = await createClient();

    // Get form fields with validation rules
    const { data: formFields, error } = await supabase
      .from('form_builder.form_fields')
      .select(
        `
        id,
        field_type,
        label,
        validation_rules,
        conditional_logic,
        options,
        required,
        order_index
      `,
      )
      .eq('form_id', formId)
      .eq('is_active', true)
      .order('order_index');

    if (error) {
      console.error('Form fields fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to get form validation schema' },
        { status: 500 },
      );
    }

    // Build validation schema response
    const validationSchema = {
      formId,
      fields:
        formFields?.map((field) => ({
          id: field.id,
          type: field.field_type,
          label: DOMPurify.sanitize(field.label, {
            ALLOWED_TAGS: [],
            ALLOWED_ATTR: [],
            KEEP_CONTENT: true,
          }),
          required: field.required,
          validation: field.validation_rules,
          conditionalLogic: field.conditional_logic,
          options: field.options,
          order: field.order_index,
        })) || [],
      capabilities: {
        realTimeValidation: true,
        batchValidation: true,
        conditionalLogic: true,
        customValidation: true,
        performanceTarget: '<50ms',
      },
    };

    return NextResponse.json({
      success: true,
      schema: validationSchema,
    });
  } catch (error) {
    console.error('Validation schema error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid form ID format' },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to get validation schema' },
      { status: 500 },
    );
  }
}
