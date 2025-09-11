/**
 * Email Template Library API Endpoint - WS-206
 *
 * Secure endpoint for retrieving email template library with search and filtering
 * Implements comprehensive security, authentication, and performance optimization
 *
 * GET /api/ai/email-templates/library
 *
 * Team B - Backend Implementation - 2025-01-20
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// ====================================================================
// REQUEST VALIDATION SCHEMA
// ====================================================================

const LibraryQuerySchema = z.object({
  vendorType: z
    .enum([
      'photographer',
      'dj',
      'caterer',
      'venue',
      'florist',
      'planner',
      'videographer',
      'coordinator',
      'baker',
      'decorator',
    ])
    .optional(),
  stage: z
    .enum([
      'inquiry',
      'booking',
      'planning',
      'final',
      'post',
      'follow_up',
      'reminder',
      'confirmation',
    ])
    .optional(),
  tone: z
    .enum([
      'formal',
      'friendly',
      'casual',
      'professional',
      'warm',
      'enthusiastic',
    ])
    .optional(),
  searchQuery: z.string().max(200).optional(),
  category: z.string().max(100).optional(),
  tags: z.string().max(500).optional(), // Comma-separated tags
  sortBy: z
    .enum(['created_at', 'updated_at', 'use_count', 'name', 'performance'])
    .default('updated_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  includeFavorites: z.coerce.boolean().default(false),
  includeVariants: z.coerce.boolean().default(true),
  includeMetrics: z.coerce.boolean().default(false),
});

type LibraryQuery = z.infer<typeof LibraryQuerySchema>;

// ====================================================================
// TEMPLATE LIBRARY SERVICE
// ====================================================================

class TemplateLibraryService {
  /**
   * Get template library with advanced filtering and search
   */
  static async getTemplateLibrary(supplierId: string, query: LibraryQuery) {
    const supabase = await createClient();

    // Build base query
    let dbQuery = supabase
      .from('email_templates')
      .select(
        `
        id,
        template_name,
        vendor_type,
        stage,
        tone,
        subject,
        body,
        merge_tags,
        category,
        tags,
        is_favorite,
        use_count,
        last_used_at,
        created_at,
        updated_at,
        ai_generated,
        ai_model,
        ai_generation_time_ms,
        ai_tokens_used,
        performance_metrics,
        ${
          query.includeVariants
            ? `
        email_template_variants (
          id,
          variant_label,
          subject,
          body,
          performance_score,
          open_rate,
          response_rate,
          conversion_rate,
          send_count,
          is_active,
          is_winner
        )
        `
            : ''
        }
      `,
      )
      .eq('supplier_id', supplierId)
      .eq('is_active', true);

    // Apply filters
    if (query.vendorType) {
      dbQuery = dbQuery.eq('vendor_type', query.vendorType);
    }

    if (query.stage) {
      dbQuery = dbQuery.eq('stage', query.stage);
    }

    if (query.tone) {
      dbQuery = dbQuery.eq('tone', query.tone);
    }

    if (query.category) {
      dbQuery = dbQuery.eq('category', query.category);
    }

    if (query.includeFavorites) {
      dbQuery = dbQuery.eq('is_favorite', true);
    }

    // Apply tag filtering
    if (query.tags) {
      const tagArray = query.tags.split(',').map((tag) => tag.trim());
      dbQuery = dbQuery.overlaps('tags', tagArray);
    }

    // Apply text search
    if (query.searchQuery) {
      // Use full-text search function from migration
      const { data: searchResults, error: searchError } = await supabase.rpc(
        'search_email_templates',
        {
          search_query: query.searchQuery,
          supplier_id_param: supplierId,
          vendor_type_param: query.vendorType || null,
          stage_param: query.stage || null,
        },
      );

      if (searchError) {
        console.error('Search error:', searchError);
      } else if (searchResults && searchResults.length > 0) {
        const templateIds = searchResults.map((r: any) => r.template_id);
        dbQuery = dbQuery.in('id', templateIds);
      }
    }

    // Apply sorting
    let orderColumn = 'updated_at';
    let ascending = false;

    switch (query.sortBy) {
      case 'created_at':
        orderColumn = 'created_at';
        break;
      case 'updated_at':
        orderColumn = 'updated_at';
        break;
      case 'use_count':
        orderColumn = 'use_count';
        break;
      case 'name':
        orderColumn = 'template_name';
        break;
      case 'performance':
        orderColumn = 'use_count'; // Could be enhanced with performance metrics
        break;
    }

    ascending = query.sortOrder === 'asc';
    dbQuery = dbQuery.order(orderColumn, { ascending });

    // Apply pagination
    const offset = (query.page - 1) * query.limit;
    dbQuery = dbQuery.range(offset, offset + query.limit - 1);

    // Execute query
    const { data: templates, error, count } = await dbQuery;

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    return {
      templates: templates || [],
      pagination: {
        page: query.page,
        limit: query.limit,
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / query.limit),
        hasNext:
          (query.page - 1) * query.limit + (templates?.length || 0) <
          (count || 0),
        hasPrev: query.page > 1,
      },
    };
  }

  /**
   * Get template statistics and analytics
   */
  static async getTemplateStatistics(supplierId: string) {
    const supabase = await createClient();

    // Get basic statistics
    const { data: stats, error: statsError } = await supabase
      .from('email_templates')
      .select(
        `
        vendor_type,
        stage,
        tone,
        ai_generated,
        use_count,
        created_at
      `,
      )
      .eq('supplier_id', supplierId)
      .eq('is_active', true);

    if (statsError || !stats) {
      return null;
    }

    // Calculate statistics
    const totalTemplates = stats.length;
    const aiGenerated = stats.filter((t) => t.ai_generated).length;
    const totalUsage = stats.reduce((sum, t) => sum + (t.use_count || 0), 0);
    const averageUsage = totalTemplates > 0 ? totalUsage / totalTemplates : 0;

    // Group by vendor type
    const vendorTypeStats = stats.reduce(
      (acc, template) => {
        const vendorType = template.vendor_type;
        if (!acc[vendorType]) {
          acc[vendorType] = { count: 0, usage: 0 };
        }
        acc[vendorType].count++;
        acc[vendorType].usage += template.use_count || 0;
        return acc;
      },
      {} as Record<string, { count: number; usage: number }>,
    );

    // Group by stage
    const stageStats = stats.reduce(
      (acc, template) => {
        const stage = template.stage;
        if (!acc[stage]) {
          acc[stage] = { count: 0, usage: 0 };
        }
        acc[stage].count++;
        acc[stage].usage += template.use_count || 0;
        return acc;
      },
      {} as Record<string, { count: number; usage: number }>,
    );

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentTemplates = stats.filter(
      (t) => new Date(t.created_at) >= thirtyDaysAgo,
    ).length;

    return {
      overview: {
        totalTemplates,
        aiGenerated,
        manualTemplates: totalTemplates - aiGenerated,
        totalUsage,
        averageUsage: Math.round(averageUsage * 100) / 100,
        recentTemplates,
      },
      breakdown: {
        vendorTypes: vendorTypeStats,
        stages: stageStats,
      },
    };
  }
}

// ====================================================================
// MAIN API HANDLER
// ====================================================================

export async function GET(request: NextRequest) {
  try {
    // 1. Authentication Check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: 'UNAUTHORIZED',
          message: 'Authentication required to access template library',
          timestamp: new Date().toISOString(),
        },
        { status: 401 },
      );
    }

    // 2. Parse and Validate Query Parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());

    let validatedQuery: LibraryQuery;
    try {
      validatedQuery = LibraryQuerySchema.parse(queryParams);
    } catch (validationError) {
      return NextResponse.json(
        {
          error: 'INVALID_QUERY_PARAMETERS',
          message: 'Invalid query parameters provided',
          details:
            validationError instanceof z.ZodError
              ? validationError.errors
              : undefined,
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      );
    }

    // 3. Get User's Organization and Supplier ID
    const supabase = await createClient();

    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id, supplier_id')
      .eq('user_id', session.user.id)
      .single();

    if (profileError || !userProfile?.supplier_id) {
      return NextResponse.json(
        {
          error: 'FORBIDDEN',
          message: 'User must be associated with a wedding vendor account',
          timestamp: new Date().toISOString(),
        },
        { status: 403 },
      );
    }

    // 4. Get Template Library
    const libraryResult = await TemplateLibraryService.getTemplateLibrary(
      userProfile.supplier_id,
      validatedQuery,
    );

    // 5. Get Statistics (if requested)
    let statistics = null;
    if (validatedQuery.includeMetrics) {
      statistics = await TemplateLibraryService.getTemplateStatistics(
        userProfile.supplier_id,
      );
    }

    // 6. Format Response
    const formattedTemplates = libraryResult.templates.map((template) => ({
      id: template.id,
      templateName: template.template_name,
      vendorType: template.vendor_type,
      stage: template.stage,
      tone: template.tone,
      subject: template.subject,
      body: template.body,
      mergeTagsUsed: template.merge_tags || [],
      category: template.category,
      tags: template.tags || [],
      isFavorite: template.is_favorite,
      usage: {
        count: template.use_count || 0,
        lastUsed: template.last_used_at,
      },
      aiMetadata: template.ai_generated
        ? {
            model: template.ai_model,
            generationTime: template.ai_generation_time_ms,
            tokensUsed: template.ai_tokens_used,
          }
        : null,
      performance: template.performance_metrics || {},
      variants: validatedQuery.includeVariants
        ? (template.email_template_variants || []).map((variant) => ({
            id: variant.id,
            label: variant.variant_label,
            subject: variant.subject,
            body: variant.body,
            performance: {
              score: variant.performance_score,
              openRate: variant.open_rate,
              responseRate: variant.response_rate,
              conversionRate: variant.conversion_rate,
              sendCount: variant.send_count,
            },
            isActive: variant.is_active,
            isWinner: variant.is_winner,
          }))
        : undefined,
      dates: {
        created: template.created_at,
        updated: template.updated_at,
      },
    }));

    // 7. Success Response
    return NextResponse.json({
      success: true,
      data: {
        templates: formattedTemplates,
        pagination: libraryResult.pagination,
        statistics,
        filters: {
          appliedFilters: {
            vendorType: validatedQuery.vendorType,
            stage: validatedQuery.stage,
            tone: validatedQuery.tone,
            category: validatedQuery.category,
            tags: validatedQuery.tags?.split(',').map((t) => t.trim()),
            searchQuery: validatedQuery.searchQuery,
            favoritesOnly: validatedQuery.includeFavorites,
          },
          availableOptions: {
            vendorTypes: [
              'photographer',
              'dj',
              'caterer',
              'venue',
              'florist',
              'planner',
              'videographer',
              'coordinator',
              'baker',
              'decorator',
            ],
            stages: [
              'inquiry',
              'booking',
              'planning',
              'final',
              'post',
              'follow_up',
              'reminder',
              'confirmation',
            ],
            tones: [
              'formal',
              'friendly',
              'casual',
              'professional',
              'warm',
              'enthusiastic',
            ],
            sortOptions: [
              'created_at',
              'updated_at',
              'use_count',
              'name',
              'performance',
            ],
          },
        },
      },
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
    });
  } catch (error) {
    console.error('Template library endpoint error:', error);

    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message:
          'An unexpected error occurred while retrieving template library',
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
      { status: 500 },
    );
  }
}

// Method not allowed for other HTTP methods
export async function POST() {
  return NextResponse.json(
    { error: 'METHOD_NOT_ALLOWED', message: 'POST method not supported' },
    { status: 405 },
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'METHOD_NOT_ALLOWED', message: 'PUT method not supported' },
    { status: 405 },
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'METHOD_NOT_ALLOWED', message: 'DELETE method not supported' },
    { status: 405 },
  );
}
