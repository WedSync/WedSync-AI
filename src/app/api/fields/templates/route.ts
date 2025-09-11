import { NextRequest, NextResponse } from 'next/server';
import { fieldEngine } from '@/lib/field-engine/FieldEngine';
import { z } from 'zod';

// Validation schemas
const queryTemplatesSchema = z.object({
  category: z.enum(['wedding', 'contact', 'business', 'custom']).optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
  search: z.string().optional(),
});

const createFieldsFromTemplateSchema = z.object({
  templateId: z.string().min(1, 'Template ID is required'),
});

/**
 * GET /api/fields/templates - Get field templates
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = {
      category: searchParams.get('category'),
      limit: searchParams.get('limit'),
      search: searchParams.get('search'),
    };

    const validatedQuery = queryTemplatesSchema.parse(query);

    // Get templates from FieldEngine
    let templates = fieldEngine.getFieldTemplatesByCategory(
      validatedQuery.category,
    );

    // Apply search filter if provided
    if (validatedQuery.search) {
      const searchTerm = validatedQuery.search.toLowerCase();
      templates = templates.filter(
        (template) =>
          template.name.toLowerCase().includes(searchTerm) ||
          template.description.toLowerCase().includes(searchTerm) ||
          template.tags.some((tag) => tag.toLowerCase().includes(searchTerm)),
      );
    }

    // Limit results
    templates = templates.slice(0, validatedQuery.limit);

    return NextResponse.json({
      success: true,
      data: templates,
      pagination: {
        total: templates.length,
        limit: validatedQuery.limit,
      },
    });
  } catch (error) {
    console.error('GET /api/fields/templates error:', error);

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
 * POST /api/fields/templates - Create fields from template
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId } = createFieldsFromTemplateSchema.parse(body);

    // Create fields from template using FieldEngine
    const fields = fieldEngine.createFieldsFromTemplate(templateId);

    // Get template info for response
    const template = fieldEngine.getFieldTemplate(templateId);

    if (!template) {
      return NextResponse.json(
        {
          error: 'Template not found',
          templateId,
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          template: {
            id: template.id,
            name: template.name,
            description: template.description,
            category: template.category,
          },
          fields,
          metadata: {
            fieldsCreated: fields.length,
            createdAt: new Date().toISOString(),
          },
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST /api/fields/templates error:', error);

    if (
      error instanceof Error &&
      error.message.includes('Template not found')
    ) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 404 },
      );
    }

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
