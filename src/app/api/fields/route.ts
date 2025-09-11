import { NextRequest, NextResponse } from 'next/server';
import { fieldEngine } from '@/lib/field-engine/FieldEngine';
import { FormField, FormFieldType } from '@/types/forms';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schemas
const createFieldSchema = z.object({
  type: z.enum([
    'text',
    'email',
    'tel',
    'textarea',
    'select',
    'radio',
    'checkbox',
    'date',
    'time',
    'file',
    'number',
    'heading',
    'paragraph',
    'divider',
    'image',
    'signature',
  ]),
  label: z.string().min(1, 'Label is required'),
  placeholder: z.string().optional(),
  helperText: z.string().optional(),
  defaultValue: z.any().optional(),
  required: z.boolean().optional(),
  options: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        value: z.string(),
      }),
    )
    .optional(),
  validation: z
    .object({
      required: z.boolean().optional(),
      minLength: z.number().optional(),
      maxLength: z.number().optional(),
      pattern: z.string().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
      customMessage: z.string().optional(),
    })
    .optional(),
  conditionalLogic: z
    .object({
      show: z.boolean(),
      when: z.string(),
      equals: z.any(),
    })
    .optional(),
  width: z.enum(['full', 'half', 'third']).optional(),
  order: z.number().optional(),
});

const queryFieldsSchema = z.object({
  type: z.string().optional(),
  category: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

/**
 * GET /api/fields - Get fields with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = {
      type: searchParams.get('type'),
      category: searchParams.get('category'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    };

    const validatedQuery = queryFieldsSchema.parse(query);

    // Get user context
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get organization context
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 400 },
      );
    }

    // Get fields from database
    let query_builder = supabase
      .from('form_fields')
      .select(
        `
        *,
        forms!inner(organization_id)
      `,
      )
      .eq('forms.organization_id', profile.organization_id)
      .range(
        validatedQuery.offset,
        validatedQuery.offset + validatedQuery.limit - 1,
      );

    if (validatedQuery.type) {
      query_builder = query_builder.eq('type', validatedQuery.type);
    }

    const { data: fields, error: fieldsError } = await query_builder;

    if (fieldsError) {
      console.error('Error fetching fields:', fieldsError);
      return NextResponse.json(
        { error: 'Failed to fetch fields' },
        { status: 500 },
      );
    }

    // Transform and enhance fields with FieldEngine
    const enhancedFields = fields.map((field) => {
      // Get analytics if available
      const analytics = fieldEngine.getFieldAnalytics(field.id);
      return {
        ...field,
        analytics,
      };
    });

    return NextResponse.json({
      success: true,
      data: enhancedFields,
      pagination: {
        offset: validatedQuery.offset,
        limit: validatedQuery.limit,
        total: fields.length,
      },
    });
  } catch (error) {
    console.error('GET /api/fields error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/fields - Create a new field
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createFieldSchema.parse(body);

    // Get user context
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create field using FieldEngine
    const field = fieldEngine.createField(
      validatedData.type as FormFieldType,
      validatedData,
    );

    // Validate the created field
    const validationResult = fieldEngine.validateField(
      field,
      validatedData.defaultValue,
    );

    if (
      !validationResult.isValid &&
      validationResult.errors.some(
        (e) => e.type === 'required' || e.type === 'format',
      )
    ) {
      return NextResponse.json(
        {
          error: 'Field validation failed',
          validation: validationResult,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: field,
        validation: validationResult,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST /api/fields error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 },
    );
  }
}
