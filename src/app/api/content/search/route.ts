/**
 * WS-223 Content Search and Organization API
 * Team B - Advanced search capabilities and content organization
 *
 * Features:
 * - Full-text search with PostgreSQL tsvector
 * - Advanced filtering and faceted search
 * - Content analytics and insights
 * - Tag-based organization
 * - Category management
 * - Search performance optimization
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { z } from 'zod';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
    (() => {
      throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
    })(),
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    (() => {
      throw new Error(
        'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY',
      );
    })(),
);

// Validation schemas
const SearchQuerySchema = z.object({
  query: z.string().min(1),
  organization_id: z.string().uuid(),
  content_types: z.array(z.string()).optional(),
  categories: z.array(z.string().uuid()).optional(),
  tags: z.array(z.string()).optional(),
  status: z
    .array(z.enum(['draft', 'review', 'scheduled', 'published', 'archived']))
    .optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  sort_by: z
    .enum(['relevance', 'date', 'title', 'views', 'engagement'])
    .default('relevance'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  include_content: z.boolean().default(false),
  highlight: z.boolean().default(true),
});

const CategoryCreateSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  description: z.string().optional(),
  parent_id: z.string().uuid().optional(),
  color_hex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default('#6366f1'),
  icon_name: z.string().optional(),
  organization_id: z.string().uuid(),
});

const AnalyticsQuerySchema = z.object({
  organization_id: z.string().uuid(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  group_by: z
    .enum(['day', 'week', 'month', 'category', 'content_type', 'status'])
    .default('day'),
  metrics: z
    .array(z.enum(['views', 'searches', 'content_created', 'engagement']))
    .default(['views', 'content_created']),
});

// Helper functions
function buildSearchQuery(searchTerm: string): string {
  // Clean and prepare search term for tsquery
  const cleanedTerm = searchTerm
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanedTerm) return '';

  // Create tsquery with prefix matching
  const terms = cleanedTerm.split(' ').map((term) => `${term}:*`);
  return terms.join(' & ');
}

function highlightSearchResults(
  content: string,
  searchTerms: string[],
): string {
  let highlightedContent = content;

  for (const term of searchTerms) {
    if (term.length < 3) continue; // Skip very short terms

    const regex = new RegExp(`(${term})`, 'gi');
    highlightedContent = highlightedContent.replace(regex, '<mark>$1</mark>');
  }

  return highlightedContent;
}

function extractSearchSnippet(
  content: string,
  searchTerms: string[],
  maxLength: number = 200,
): string {
  if (!content || searchTerms.length === 0) {
    return (
      content.substring(0, maxLength) +
      (content.length > maxLength ? '...' : '')
    );
  }

  const plainContent = content.replace(/<[^>]*>/g, '');

  // Find the first occurrence of any search term
  let firstMatchIndex = -1;
  let matchedTerm = '';

  for (const term of searchTerms) {
    const index = plainContent.toLowerCase().indexOf(term.toLowerCase());
    if (index !== -1 && (firstMatchIndex === -1 || index < firstMatchIndex)) {
      firstMatchIndex = index;
      matchedTerm = term;
    }
  }

  if (firstMatchIndex === -1) {
    // No match found, return beginning
    return (
      plainContent.substring(0, maxLength) +
      (plainContent.length > maxLength ? '...' : '')
    );
  }

  // Create snippet around the match
  const snippetStart = Math.max(0, firstMatchIndex - 50);
  const snippetEnd = Math.min(plainContent.length, snippetStart + maxLength);

  let snippet = plainContent.substring(snippetStart, snippetEnd);

  if (snippetStart > 0) snippet = '...' + snippet;
  if (snippetEnd < plainContent.length) snippet = snippet + '...';

  return snippet;
}

/**
 * GET /api/content/search - Advanced content search
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const queryParams: any = {};
    for (const [key, value] of searchParams.entries()) {
      if (
        key === 'content_types' ||
        key === 'categories' ||
        key === 'tags' ||
        key === 'status'
      ) {
        queryParams[key] = value.split(',').filter(Boolean);
      } else if (key === 'page' || key === 'limit') {
        queryParams[key] = parseInt(value);
      } else if (key === 'include_content' || key === 'highlight') {
        queryParams[key] = value === 'true';
      } else {
        queryParams[key] = value;
      }
    }

    // Validate input
    const validationResult = SearchQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    const {
      query: searchQuery,
      organization_id,
      content_types,
      categories,
      tags,
      status,
      date_from,
      date_to,
      sort_by,
      sort_order,
      page,
      limit,
      include_content,
      highlight,
    } = validationResult.data;

    const offset = (page - 1) * limit;
    const searchTerms = searchQuery
      .split(' ')
      .filter((term) => term.length >= 3);

    // Build PostgreSQL full-text search query
    const tsQuery = buildSearchQuery(searchQuery);

    if (!tsQuery) {
      return NextResponse.json(
        { error: 'Search query too short or invalid' },
        { status: 400 },
      );
    }

    // Log search for analytics
    await supabase
      .from('content_search_index')
      .update({
        search_count: supabase.raw('search_count + 1'),
        last_search_at: new Date().toISOString(),
      })
      .eq('organization_id', organization_id)
      .textSearch('search_vector', tsQuery);

    // Build search query
    let selectFields = `
      ci.id,
      ci.title,
      ci.slug,
      ci.content_type,
      ci.status,
      ci.tags,
      ci.view_count,
      ci.engagement_score,
      ci.created_at,
      ci.updated_at,
      ci.publish_at,
      cc.name as category_name,
      cc.slug as category_slug,
      cc.color_hex as category_color
    `;

    if (include_content) {
      selectFields += `,
        ci.rich_content,
        ci.plain_content,
        ci.excerpt,
        ci.featured_image_url
      `;
    }

    // Use search_content stored procedure for optimized full-text search
    const { data: searchResults, error: searchError } = await supabase.rpc(
      'search_content',
      {
        org_uuid: organization_id,
        search_query: searchQuery,
        content_types: content_types || null,
        limit_count: limit,
        offset_count: offset,
      },
    );

    if (searchError) {
      console.error('Search error:', searchError);
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    // Apply additional filters that stored procedure doesn't handle
    let filteredResults = searchResults || [];

    if (categories && categories.length > 0) {
      const { data: categoryContent } = await supabase
        .from('content_items')
        .select('id')
        .in('category_id', categories)
        .eq('organization_id', organization_id);

      const categoryIds = new Set(categoryContent?.map((c) => c.id) || []);
      filteredResults = filteredResults.filter((r) => categoryIds.has(r.id));
    }

    if (tags && tags.length > 0) {
      filteredResults = filteredResults.filter((result) =>
        tags.some((tag) => result.tags?.includes(tag)),
      );
    }

    if (status && status.length > 0) {
      filteredResults = filteredResults.filter((result) =>
        status.includes(result.status),
      );
    }

    if (date_from || date_to) {
      filteredResults = filteredResults.filter((result) => {
        const resultDate = new Date(result.created_at);
        const fromDate = date_from ? new Date(date_from) : null;
        const toDate = date_to ? new Date(date_to) : null;

        return (
          (!fromDate || resultDate >= fromDate) &&
          (!toDate || resultDate <= toDate)
        );
      });
    }

    // Apply sorting (if not by relevance, which is already sorted by PostgreSQL)
    if (sort_by !== 'relevance') {
      filteredResults.sort((a, b) => {
        let aVal, bVal;

        switch (sort_by) {
          case 'date':
            aVal = new Date(a.updated_at).getTime();
            bVal = new Date(b.updated_at).getTime();
            break;
          case 'title':
            aVal = a.title.toLowerCase();
            bVal = b.title.toLowerCase();
            break;
          case 'views':
            aVal = a.view_count || 0;
            bVal = b.view_count || 0;
            break;
          case 'engagement':
            aVal = a.engagement_score || 0;
            bVal = b.engagement_score || 0;
            break;
          default:
            aVal = a.rank || 0;
            bVal = b.rank || 0;
        }

        if (sort_order === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
    }

    // Process results for highlighting and snippets
    const processedResults = filteredResults.map((result) => {
      const processedResult: any = { ...result };

      if (highlight && searchTerms.length > 0) {
        // Highlight search terms in title
        processedResult.highlighted_title = highlightSearchResults(
          result.title,
          searchTerms,
        );

        // Create search snippet
        const content = result.plain_content || result.rich_content || '';
        processedResult.search_snippet = extractSearchSnippet(
          content,
          searchTerms,
          200,
        );

        if (include_content && result.rich_content) {
          processedResult.highlighted_content = highlightSearchResults(
            result.rich_content,
            searchTerms,
          );
        }
      } else {
        // Create plain snippet without highlighting
        const content = result.plain_content || result.rich_content || '';
        processedResult.search_snippet =
          content.substring(0, 200) + (content.length > 200 ? '...' : '');
      }

      return processedResult;
    });

    // Get facet counts for filtering
    const facetCounts: any = {};

    // Content type facets
    const { data: contentTypeCounts } = await supabase
      .from('content_items')
      .select('content_type')
      .eq('organization_id', organization_id)
      .eq('status', 'published');

    facetCounts.content_types =
      contentTypeCounts?.reduce(
        (acc, item) => {
          acc[item.content_type] = (acc[item.content_type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ) || {};

    // Category facets
    const { data: categoryCounts } = await supabase
      .from('content_items')
      .select(
        `
        content_categories!inner(id, name, slug)
      `,
      )
      .eq('organization_id', organization_id)
      .eq('status', 'published');

    // Status facets
    const { data: statusCounts } = await supabase
      .from('content_items')
      .select('status')
      .eq('organization_id', organization_id);

    facetCounts.statuses =
      statusCounts?.reduce(
        (acc, item) => {
          acc[item.status] = (acc[item.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ) || {};

    return NextResponse.json({
      success: true,
      data: {
        results: processedResults,
        facets: facetCounts,
        search_meta: {
          query: searchQuery,
          total_results: filteredResults.length,
          search_time_ms: Date.now(), // Placeholder - implement actual timing
          highlighted_terms: searchTerms,
        },
        pagination: {
          page,
          limit,
          total: filteredResults.length,
          total_pages: Math.ceil(filteredResults.length / limit),
        },
      },
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/content/search/categories - Create content category
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if this is for categories
    if (body.action === 'create_category') {
      const validationResult = CategoryCreateSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: validationResult.error.errors,
          },
          { status: 400 },
        );
      }

      const categoryData = validationResult.data;

      // Check for duplicate slug in organization
      const { data: existingCategory } = await supabase
        .from('content_categories')
        .select('id')
        .eq('organization_id', categoryData.organization_id)
        .eq('slug', categoryData.slug)
        .single();

      if (existingCategory) {
        return NextResponse.json(
          { error: 'Category with this slug already exists' },
          { status: 409 },
        );
      }

      // Validate parent category if specified
      if (categoryData.parent_id) {
        const { data: parentCategory } = await supabase
          .from('content_categories')
          .select('organization_id')
          .eq('id', categoryData.parent_id)
          .single();

        if (
          !parentCategory ||
          parentCategory.organization_id !== categoryData.organization_id
        ) {
          return NextResponse.json(
            { error: 'Invalid parent category' },
            { status: 400 },
          );
        }
      }

      // Create category
      const { data: category, error: createError } = await supabase
        .from('content_categories')
        .insert({
          ...categoryData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error('Category creation error:', createError);
        return NextResponse.json(
          { error: 'Failed to create category' },
          { status: 500 },
        );
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            category,
            message: 'Category created successfully',
          },
        },
        { status: 201 },
      );
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Search API POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/content/search/analytics - Content analytics and insights
 */
export async function analytics(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const queryParams: any = {};
    for (const [key, value] of searchParams.entries()) {
      if (key === 'metrics') {
        queryParams[key] = value.split(',').filter(Boolean);
      } else {
        queryParams[key] = value;
      }
    }

    const validationResult = AnalyticsQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    const { organization_id, date_from, date_to, group_by, metrics } =
      validationResult.data;

    const analytics: any = {
      period: {
        from:
          date_from ||
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        to: date_to || new Date().toISOString(),
        group_by,
      },
      metrics: {},
    };

    // Content creation analytics
    if (metrics.includes('content_created')) {
      const { data: contentCreated } = await supabase
        .from('content_items')
        .select('created_at, content_type')
        .eq('organization_id', organization_id)
        .gte('created_at', analytics.period.from)
        .lte('created_at', analytics.period.to)
        .order('created_at');

      analytics.metrics.content_created = contentCreated || [];
    }

    // View analytics
    if (metrics.includes('views')) {
      const { data: viewData } = await supabase
        .from('content_items')
        .select('id, title, content_type, view_count, last_viewed_at')
        .eq('organization_id', organization_id)
        .gt('view_count', 0)
        .order('view_count', { ascending: false })
        .limit(20);

      analytics.metrics.views = {
        top_content: viewData || [],
        total_views:
          viewData?.reduce((sum, item) => sum + (item.view_count || 0), 0) || 0,
      };
    }

    // Search analytics
    if (metrics.includes('searches')) {
      const { data: searchData } = await supabase
        .from('content_search_index')
        .select('content_id, search_count, last_search_at')
        .eq('organization_id', organization_id)
        .gt('search_count', 0)
        .order('search_count', { ascending: false })
        .limit(20);

      analytics.metrics.searches = {
        most_searched: searchData || [],
        total_searches:
          searchData?.reduce(
            (sum, item) => sum + (item.search_count || 0),
            0,
          ) || 0,
      };
    }

    // Engagement analytics
    if (metrics.includes('engagement')) {
      const { data: engagementData } = await supabase
        .from('content_items')
        .select('id, title, content_type, engagement_score')
        .eq('organization_id', organization_id)
        .gt('engagement_score', 0)
        .order('engagement_score', { ascending: false })
        .limit(20);

      analytics.metrics.engagement = {
        top_engaging_content: engagementData || [],
        average_engagement:
          engagementData?.reduce(
            (sum, item) => sum + (item.engagement_score || 0),
            0,
          ) / (engagementData?.length || 1) || 0,
      };
    }

    // Summary statistics
    const { data: summaryStats } = await supabase
      .from('content_items')
      .select('status, content_type')
      .eq('organization_id', organization_id);

    analytics.summary = {
      total_content: summaryStats?.length || 0,
      by_status:
        summaryStats?.reduce(
          (acc, item) => {
            acc[item.status] = (acc[item.status] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ) || {},
      by_type:
        summaryStats?.reduce(
          (acc, item) => {
            acc[item.content_type] = (acc[item.content_type] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ) || {},
    };

    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
