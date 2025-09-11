/**
 * Smart Mapping Templates API Endpoint
 * GET /api/document-processing/mapping/templates - Get mapping templates
 * POST /api/document-processing/mapping/templates - Create new mapping template
 */

import { NextRequest, NextResponse } from 'next/server';
import { SmartMappingService } from '@/lib/services/smart-mapping-service';
import { auth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Request validation schemas
const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  sourceSchema: z.string().min(1),
  targetSchema: z.string().min(1),
  mappings: z.array(
    z.object({
      sourceFieldId: z.string(),
      targetFieldId: z.string(),
      confidence: z.number().min(0).max(1),
      mappingType: z.enum([
        'exact',
        'semantic',
        'pattern',
        'contextual',
        'learned',
      ]),
      reasoning: z.string(),
    }),
  ),
  isPublic: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

const GetTemplatesQuerySchema = z.object({
  sourceSchema: z.string().optional(),
  targetSchema: z.string().optional(),
  isPublic: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  category: z.string().optional(),
  sortBy: z.enum(['usage', 'accuracy', 'created', 'name']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .optional(),
  offset: z
    .string()
    .transform((val) => parseInt(val, 10))
    .optional(),
  search: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams);
    const validatedQuery = GetTemplatesQuerySchema.parse(queryParams);

    // Initialize services
    const smartMappingService = new SmartMappingService();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    // Build query filters
    const filters: any = {};
    if (validatedQuery.sourceSchema)
      filters.sourceSchema = validatedQuery.sourceSchema;
    if (validatedQuery.targetSchema)
      filters.targetSchema = validatedQuery.targetSchema;
    if (validatedQuery.isPublic !== undefined)
      filters.isPublic = validatedQuery.isPublic;

    // Get templates using service
    const templates = await smartMappingService.getMappingTemplates(filters);

    // Apply additional filtering and sorting
    let filteredTemplates = templates;

    // Search filter
    if (validatedQuery.search) {
      const searchTerm = validatedQuery.search.toLowerCase();
      filteredTemplates = filteredTemplates.filter(
        (template) =>
          template.name.toLowerCase().includes(searchTerm) ||
          template.description?.toLowerCase().includes(searchTerm),
      );
    }

    // Get user's private templates
    const { data: userTemplates } = await supabase
      .from('mapping_templates')
      .select(
        `
        id, name, description, source_schema, target_schema, 
        mappings, accuracy, usage_count, is_public, created_by,
        created_at, updated_at, tags
      `,
      )
      .eq('created_by', session.user.id)
      .eq('is_public', false);

    // Merge public and user templates
    if (userTemplates) {
      const userTemplatesMapped = userTemplates.map(transformTemplate);
      filteredTemplates = [...filteredTemplates, ...userTemplatesMapped];
    }

    // Remove duplicates
    const uniqueTemplates = filteredTemplates.filter(
      (template, index, self) =>
        index === self.findIndex((t) => t.id === template.id),
    );

    // Sort templates
    const sortBy = validatedQuery.sortBy || 'usage';
    const sortOrder = validatedQuery.sortOrder || 'desc';

    uniqueTemplates.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'usage':
          comparison = a.usageCount - b.usageCount;
          break;
        case 'accuracy':
          comparison = a.accuracy - b.accuracy;
          break;
        case 'created':
          comparison =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        default:
          comparison = a.usageCount - b.usageCount;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Apply pagination
    const limit = validatedQuery.limit || 20;
    const offset = validatedQuery.offset || 0;
    const paginatedTemplates = uniqueTemplates.slice(offset, offset + limit);

    // Enrich templates with additional metadata
    const enrichedTemplates = await Promise.all(
      paginatedTemplates.map(async (template) => {
        // Get usage statistics
        const { data: usageStats } = await supabase
          .from('template_usage_stats')
          .select('last_used, success_rate, total_applications')
          .eq('template_id', template.id)
          .single();

        // Get user rating if exists
        const { data: userRating } = await supabase
          .from('template_ratings')
          .select('rating, comment')
          .eq('template_id', template.id)
          .eq('user_id', session.user.id)
          .single();

        return {
          ...template,
          statistics: {
            usageCount: template.usageCount,
            accuracy: template.accuracy,
            lastUsed: usageStats?.last_used,
            successRate: usageStats?.success_rate || template.accuracy,
            totalApplications:
              usageStats?.total_applications || template.usageCount,
          },
          userInteraction: {
            hasUsed: !!usageStats,
            rating: userRating?.rating,
            comment: userRating?.comment,
            isOwner: template.createdBy === session.user.id,
          },
        };
      }),
    );

    // Get template categories for filtering
    const { data: categories } = await supabase
      .from('mapping_templates')
      .select('source_schema, target_schema')
      .eq('is_public', true);

    const uniqueCategories = categories
      ? [
          ...new Set(
            categories.map((c) => `${c.source_schema} → ${c.target_schema}`),
          ),
        ]
      : [];

    console.log(
      `Retrieved ${enrichedTemplates.length} mapping templates for user ${session.user.id}`,
    );

    return NextResponse.json({
      success: true,
      data: {
        templates: enrichedTemplates,
        pagination: {
          total: uniqueTemplates.length,
          limit,
          offset,
          hasMore: offset + limit < uniqueTemplates.length,
        },
        metadata: {
          availableCategories: uniqueCategories,
          totalPublicTemplates: templates.length,
          totalUserTemplates: userTemplates?.length || 0,
        },
      },
    });
  } catch (error) {
    console.error('Get mapping templates error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: error.errors,
          code: 'VALIDATION_ERROR',
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to retrieve mapping templates',
        code: 'RETRIEVAL_ERROR',
      },
      { status: 500 },
    );
  } finally {
    const processingTime = Date.now() - startTime;
    console.log(`Get templates API call completed in ${processingTime}ms`);
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request
    const body = await request.json();
    const validatedData = CreateTemplateSchema.parse(body);

    // Initialize services
    const smartMappingService = new SmartMappingService();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    // Check for duplicate template names for this user
    const { data: existingTemplate } = await supabase
      .from('mapping_templates')
      .select('id')
      .eq('name', validatedData.name)
      .eq('created_by', session.user.id)
      .single();

    if (existingTemplate) {
      return NextResponse.json(
        {
          error: 'Template with this name already exists',
          code: 'DUPLICATE_NAME',
        },
        { status: 409 },
      );
    }

    // Calculate template accuracy
    const accuracy = calculateTemplateAccuracy(validatedData.mappings);

    // Create template using service
    const templateData = {
      name: validatedData.name,
      description: validatedData.description,
      sourceSchema: validatedData.sourceSchema,
      targetSchema: validatedData.targetSchema,
      mappings: validatedData.mappings,
      accuracy,
      isPublic: validatedData.isPublic || false,
      createdBy: session.user.id,
    };

    const createdTemplate =
      await smartMappingService.saveMappingTemplate(templateData);

    // Save tags if provided
    if (validatedData.tags && validatedData.tags.length > 0) {
      const tagInserts = validatedData.tags.map((tag) => ({
        template_id: createdTemplate.id,
        tag: tag.toLowerCase().trim(),
      }));

      await supabase.from('template_tags').insert(tagInserts);
    }

    // Initialize usage statistics
    await supabase.from('template_usage_stats').insert({
      template_id: createdTemplate.id,
      success_rate: accuracy,
      total_applications: 0,
      created_at: new Date().toISOString(),
    });

    // Log template creation
    console.log(`Mapping template created by user ${session.user.id}:`, {
      templateId: createdTemplate.id,
      name: validatedData.name,
      accuracy,
      isPublic: validatedData.isPublic,
      mappingCount: validatedData.mappings.length,
    });

    // Return created template with metadata
    return NextResponse.json(
      {
        success: true,
        data: {
          template: {
            ...createdTemplate,
            tags: validatedData.tags || [],
            statistics: {
              usageCount: 0,
              accuracy,
              successRate: accuracy,
              totalApplications: 0,
            },
            userInteraction: {
              isOwner: true,
              hasUsed: false,
            },
          },
          message: `Template "${validatedData.name}" created successfully`,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Create mapping template error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid template data',
          details: error.errors,
          code: 'VALIDATION_ERROR',
        },
        { status: 400 },
      );
    }

    // Handle service errors
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: 'Failed to create template',
          message: error.message,
          code: 'CREATION_ERROR',
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 },
    );
  } finally {
    const processingTime = Date.now() - startTime;
    console.log(`Create template API call completed in ${processingTime}ms`);
  }
}

/**
 * Transform database template to service format
 */
function transformTemplate(dbTemplate: any): any {
  return {
    id: dbTemplate.id,
    name: dbTemplate.name,
    description: dbTemplate.description,
    sourceSchema: dbTemplate.source_schema,
    targetSchema: dbTemplate.target_schema,
    mappings: dbTemplate.mappings,
    accuracy: dbTemplate.accuracy,
    usageCount: dbTemplate.usage_count,
    isPublic: dbTemplate.is_public,
    createdBy: dbTemplate.created_by,
    createdAt: dbTemplate.created_at,
    updatedAt: dbTemplate.updated_at,
    tags: dbTemplate.tags || [],
  };
}

/**
 * Calculate template accuracy based on mapping confidences
 */
function calculateTemplateAccuracy(mappings: any[]): number {
  if (mappings.length === 0) return 0;

  const totalConfidence = mappings.reduce(
    (sum, mapping) => sum + mapping.confidence,
    0,
  );
  return totalConfidence / mappings.length;
}
