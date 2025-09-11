import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import {
  withMediumSecurity,
  SecurityContext,
} from '@/lib/comprehensive-security-middleware';

// Database query optimization for core fields
const CORE_FIELDS_QUERY = `
  id,
  name,
  label,
  type,
  required,
  placeholder,
  description,
  validation,
  category,
  "order",
  is_active,
  created_at,
  updated_at
`;

// Core field validation schema
const coreFieldSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  type: z.enum([
    'text',
    'email',
    'phone',
    'date',
    'select',
    'checkbox',
    'textarea',
    'number',
  ]),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  description: z.string().max(500).optional(),
  validation: z
    .object({
      minLength: z.number().min(0).optional(),
      maxLength: z.number().min(0).optional(),
      pattern: z.string().optional(),
      options: z.array(z.string()).optional(),
    })
    .optional(),
  category: z.string().max(50).default('general'),
  order: z.number().default(0),
  isActive: z.boolean().default(true),
});

// Core field update schema
const updateCoreFieldSchema = coreFieldSchema.partial();

// Core field types for better type safety and performance
export type CoreFieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'date'
  | 'select'
  | 'checkbox'
  | 'textarea'
  | 'number';

export interface CoreFieldData {
  id?: string;
  name: string;
  label: string;
  type: CoreFieldType;
  required: boolean;
  placeholder?: string;
  description?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    options?: string[];
  };
  category: string;
  order: number;
  isActive: boolean;
}

// GET /api/core-fields - List core fields with optimized performance
async function handleGetCoreFields(
  request: NextRequest,
  context: SecurityContext,
): Promise<NextResponse> {
  const supabase = await createClient();

  // Query parameters
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const type = searchParams.get('type');
  const activeOnly = searchParams.get('active') === 'true';

  try {
    // Optimized query with indexed fields
    let query = supabase
      .from('core_fields')
      .select(CORE_FIELDS_QUERY)
      .or(`created_by.eq.${context.user.id},is_system.eq.true`)
      .order('category', { ascending: true })
      .order('order', { ascending: true })
      .order('name', { ascending: true });

    // Apply filters with indexes
    if (category) {
      query = query.eq('category', category);
    }

    if (type) {
      query = query.eq('type', type);
    }

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    // Execute optimized query
    const { data: coreFields, error } = await query;

    if (error) {
      console.error('Core fields fetch error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch core fields',
        },
        { status: 500 },
      );
    }

    // Optimized grouping with reduced iterations
    const groupedFields = (coreFields || []).reduce(
      (acc: Record<string, any[]>, field: any) => {
        const categoryKey = field.category || 'general';
        if (!acc[categoryKey]) {
          acc[categoryKey] = [];
        }
        acc[categoryKey].push(field);
        return acc;
      },
      {},
    );

    return NextResponse.json({
      success: true,
      data: {
        fields: coreFields || [],
        groupedFields,
        total: coreFields?.length || 0,
      },
    });
  } catch (error) {
    console.error('Core fields API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 },
    );
  }
}

export const GET = withMediumSecurity(handleGetCoreFields);

// POST /api/core-fields - Create new core field with validation
async function handleCreateCoreField(
  request: NextRequest,
  context: SecurityContext,
): Promise<NextResponse> {
  const supabase = await createClient();

  try {
    // Get validated body from request (already sanitized by middleware)
    const validatedField = (await request.json()) as CoreFieldData;

    // Check for duplicate field names (optimized query)
    const { data: existingField } = await supabase
      .from('core_fields')
      .select('id')
      .eq('name', validatedField.name)
      .eq('created_by', context.user.id)
      .limit(1)
      .single();

    if (existingField) {
      return NextResponse.json(
        {
          success: false,
          error: 'Core field with this name already exists',
        },
        { status: 409 },
      );
    }

    // Optimized insert with minimal data
    const { data: coreField, error: dbError } = await supabase
      .from('core_fields')
      .insert({
        name: validatedField.name,
        label: validatedField.label,
        type: validatedField.type,
        required: validatedField.required || false,
        placeholder: validatedField.placeholder,
        description: validatedField.description,
        validation: validatedField.validation,
        category: validatedField.category || 'general',
        order: validatedField.order || 0,
        is_active: validatedField.isActive !== false, // Default to true
        created_by: context.user.id,
        is_system: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select(CORE_FIELDS_QUERY)
      .single();

    if (dbError) {
      console.error('Core field creation error:', dbError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create core field',
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: coreField,
        message: 'Core field created successfully',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Core field creation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create core field',
      },
      { status: 500 },
    );
  }
}

export const POST = withMediumSecurity(handleCreateCoreField, coreFieldSchema);

// PUT /api/core-fields - Update core field with optimized validation
async function handleUpdateCoreField(
  request: NextRequest,
  context: SecurityContext,
): Promise<NextResponse> {
  const supabase = await createClient();

  try {
    const updateData = (await request.json()) as Partial<CoreFieldData> & {
      id: string;
    };

    if (!updateData.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Core field ID is required',
        },
        { status: 400 },
      );
    }

    // Optimized ownership check with minimal data fetch
    const { data: existingField, error: fetchError } = await supabase
      .from('core_fields')
      .select('id, created_by, is_system')
      .eq('id', updateData.id)
      .eq('created_by', context.user.id) // Filter by user immediately
      .single();

    if (fetchError || !existingField) {
      return NextResponse.json(
        {
          success: false,
          error: 'Core field not found or unauthorized',
        },
        { status: 404 },
      );
    }

    if (existingField.is_system) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot modify system core fields',
        },
        { status: 403 },
      );
    }

    // Prepare optimized update data
    const optimizedUpdateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Only include changed fields
    const allowedFields = [
      'name',
      'label',
      'type',
      'required',
      'placeholder',
      'description',
      'validation',
      'category',
      'order',
      'isActive',
    ];

    allowedFields.forEach((key) => {
      const value = updateData[key as keyof typeof updateData];
      if (value !== undefined) {
        if (key === 'isActive') {
          optimizedUpdateData.is_active = value;
        } else {
          optimizedUpdateData[key] = value;
        }
      }
    });

    // Execute optimized update
    const { data: updatedField, error: updateError } = await supabase
      .from('core_fields')
      .update(optimizedUpdateData)
      .eq('id', updateData.id)
      .eq('created_by', context.user.id) // Double-check security
      .select(CORE_FIELDS_QUERY)
      .single();

    if (updateError) {
      console.error('Core field update error:', updateError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update core field',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedField,
      message: 'Core field updated successfully',
    });
  } catch (error) {
    console.error('Core field update error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update core field',
      },
      { status: 500 },
    );
  }
}

export const PUT = withMediumSecurity(
  handleUpdateCoreField,
  updateCoreFieldSchema,
);

// DELETE /api/core-fields - Soft delete core field with optimized checks
async function handleDeleteCoreField(
  request: NextRequest,
  context: SecurityContext,
): Promise<NextResponse> {
  const supabase = await createClient();

  try {
    const { searchParams } = new URL(request.url);
    const fieldId = searchParams.get('id');

    if (!fieldId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Core field ID is required',
        },
        { status: 400 },
      );
    }

    // Optimized ownership and system check in single query
    const { data: existingField, error: fetchError } = await supabase
      .from('core_fields')
      .select('id, created_by, is_system')
      .eq('id', fieldId)
      .eq('created_by', context.user.id) // Immediate user filter
      .single();

    if (fetchError || !existingField) {
      return NextResponse.json(
        {
          success: false,
          error: 'Core field not found or unauthorized',
        },
        { status: 404 },
      );
    }

    if (existingField.is_system) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete system core fields',
        },
        { status: 403 },
      );
    }

    // Optimized soft delete with minimal data
    const { error: deleteError } = await supabase
      .from('core_fields')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fieldId)
      .eq('created_by', context.user.id); // Double-check security

    if (deleteError) {
      console.error('Core field delete error:', deleteError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to delete core field',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Core field deleted successfully',
    });
  } catch (error) {
    console.error('Core field delete error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete core field',
      },
      { status: 500 },
    );
  }
}

export const DELETE = withMediumSecurity(handleDeleteCoreField);
