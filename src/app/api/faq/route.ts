// FAQ Management API - Feature ID: WS-070
// Handles FAQ CRUD operations, search, and analytics tracking

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/lib/database.types';
import type {
  CreateFaqItemRequest,
  CreateFaqCategoryRequest,
  FaqSearchRequest,
  TrackFaqAnalyticsRequest,
  SubmitFaqFeedbackRequest,
} from '@/types/faq';

export const dynamic = 'force-dynamic';

// GET /api/faq - Search FAQs and get categories
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
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

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const category_id = searchParams.get('category_id');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const include_categories =
      searchParams.get('include_categories') === 'true';
    const action = searchParams.get('action');

    // Get supplier ID from authenticated user
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 },
      );
    }

    // Handle different GET actions
    switch (action) {
      case 'categories':
        return handleGetCategories(supabase, supplier.id);

      case 'dashboard':
        return handleGetDashboard(supabase, supplier.id);

      case 'popular':
        return handleGetPopularFaqs(supabase, supplier.id, limit);

      case 'search':
      default:
        return handleSearchFaqs(supabase, supplier.id, {
          query,
          category_id: category_id || undefined,
          limit,
          offset,
          include_categories,
        });
    }
  } catch (error) {
    console.error('FAQ API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// POST /api/faq - Create FAQ item, category, or track analytics
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
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

    const body = await request.json();
    const { action } = body;

    // Get supplier ID from authenticated user
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 },
      );
    }

    switch (action) {
      case 'create_category':
        return handleCreateCategory(
          supabase,
          supplier.id,
          body as CreateFaqCategoryRequest,
        );

      case 'create_faq':
        return handleCreateFaq(
          supabase,
          supplier.id,
          body as CreateFaqItemRequest,
        );

      case 'track_analytics':
        return handleTrackAnalytics(
          supabase,
          supplier.id,
          body as TrackFaqAnalyticsRequest,
        );

      case 'submit_feedback':
        return handleSubmitFeedback(
          supabase,
          supplier.id,
          body as SubmitFaqFeedbackRequest,
        );

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('FAQ POST API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Helper Functions

async function handleSearchFaqs(
  supabase: any,
  supplier_id: string,
  searchRequest: FaqSearchRequest,
) {
  const startTime = performance.now();

  try {
    if (searchRequest.query.trim()) {
      // Use the PostgreSQL search function
      const { data: searchResults, error } = await supabase.rpc('search_faqs', {
        p_supplier_id: supplier_id,
        p_query: searchRequest.query,
        p_category_id: searchRequest.category_id || null,
        p_limit: searchRequest.limit || 10,
        p_offset: searchRequest.offset || 0,
      });

      if (error) {
        console.error('Search error:', error);
        throw error;
      }

      const searchDuration = performance.now() - startTime;

      const response = {
        results: searchResults || [],
        total_count: searchResults?.length || 0,
        search_duration_ms: Math.round(searchDuration),
        suggestions: await getSearchSuggestions(
          supabase,
          supplier_id,
          searchRequest.query,
        ),
      };

      if (searchRequest.include_categories) {
        response.categories = await getCategories(supabase, supplier_id);
      }

      return NextResponse.json(response);
    } else {
      // Return recent FAQs when no query
      const { data: recentFaqs } = await supabase
        .from('faq_items')
        .select(
          `
          *,
          faq_categories (
            name,
            slug
          )
        `,
        )
        .eq('supplier_id', supplier_id)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(searchRequest.limit || 10);

      return NextResponse.json({
        results:
          recentFaqs?.map((faq) => ({
            ...faq,
            category_name: faq.faq_categories?.name,
            category_slug: faq.faq_categories?.slug,
            relevance_score: 100, // Default for recent FAQs
          })) || [],
        total_count: recentFaqs?.length || 0,
        search_duration_ms: Math.round(performance.now() - startTime),
        suggestions: [],
      });
    }
  } catch (error) {
    console.error('Search FAQs error:', error);
    throw error;
  }
}

async function handleGetCategories(supabase: any, supplier_id: string) {
  const categories = await getCategories(supabase, supplier_id);
  return NextResponse.json({ categories });
}

async function handleGetDashboard(supabase: any, supplier_id: string) {
  try {
    const { data: dashboard, error } = await supabase
      .from('faq_dashboard_overview')
      .select('*')
      .eq('supplier_id', supplier_id)
      .single();

    if (error && error.code !== 'PGRST116') {
      // Not found error
      throw error;
    }

    return NextResponse.json({ dashboard: dashboard || null });
  } catch (error) {
    console.error('Dashboard error:', error);
    throw error;
  }
}

async function handleGetPopularFaqs(
  supabase: any,
  supplier_id: string,
  limit: number,
) {
  try {
    const { data: popularFaqs } = await supabase
      .from('faq_items')
      .select(
        `
        *,
        faq_categories (
          name,
          slug
        )
      `,
      )
      .eq('supplier_id', supplier_id)
      .eq('is_published', true)
      .order('view_count', { ascending: false })
      .order('help_score', { ascending: false })
      .limit(limit);

    return NextResponse.json({
      faqs:
        popularFaqs?.map((faq) => ({
          ...faq,
          category_name: faq.faq_categories?.name,
          category_slug: faq.faq_categories?.slug,
        })) || [],
    });
  } catch (error) {
    console.error('Popular FAQs error:', error);
    throw error;
  }
}

async function handleCreateCategory(
  supabase: any,
  supplier_id: string,
  categoryData: CreateFaqCategoryRequest,
) {
  try {
    const { data: category, error } = await supabase
      .from('faq_categories')
      .insert({
        supplier_id,
        ...categoryData,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error('Create category error:', error);
    throw error;
  }
}

async function handleCreateFaq(
  supabase: any,
  supplier_id: string,
  faqData: CreateFaqItemRequest,
) {
  try {
    const { data: faq, error } = await supabase
      .from('faq_items')
      .insert({
        supplier_id,
        ...faqData,
        tags: faqData.tags || [],
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ faq }, { status: 201 });
  } catch (error) {
    console.error('Create FAQ error:', error);
    throw error;
  }
}

async function handleTrackAnalytics(
  supabase: any,
  supplier_id: string,
  analyticsData: TrackFaqAnalyticsRequest,
) {
  try {
    const { data: result, error } = await supabase.rpc('track_faq_analytics', {
      p_supplier_id: supplier_id,
      p_faq_item_id: analyticsData.faq_item_id,
      p_event_type: analyticsData.event_type,
      p_search_query: analyticsData.search_query || null,
      p_user_session_id: analyticsData.user_session_id || null,
      p_client_id: null, // Could be derived from JWT
      p_metadata: analyticsData.metadata || {},
    });

    if (error) throw error;

    return NextResponse.json({ success: result });
  } catch (error) {
    console.error('Track analytics error:', error);
    throw error;
  }
}

async function handleSubmitFeedback(
  supabase: any,
  supplier_id: string,
  feedbackData: SubmitFaqFeedbackRequest,
) {
  try {
    const { data: feedback, error } = await supabase
      .from('faq_feedback')
      .insert({
        supplier_id,
        faq_item_id: feedbackData.faq_item_id,
        is_helpful: feedbackData.is_helpful,
        feedback_text: feedbackData.feedback_text,
        suggested_improvement: feedbackData.suggested_improvement,
        user_session_id: feedbackData.user_session_id,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ feedback }, { status: 201 });
  } catch (error) {
    console.error('Submit feedback error:', error);
    throw error;
  }
}

// Utility Functions

async function getCategories(supabase: any, supplier_id: string) {
  try {
    const { data: categories } = await supabase
      .from('faq_categories')
      .select(
        `
        id,
        name,
        slug,
        faq_items!inner (count)
      `,
      )
      .eq('supplier_id', supplier_id)
      .eq('is_active', true)
      .eq('faq_items.is_published', true);

    return (
      categories?.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        count: cat.faq_items?.length || 0,
      })) || []
    );
  } catch (error) {
    console.error('Get categories error:', error);
    return [];
  }
}

async function getSearchSuggestions(
  supabase: any,
  supplier_id: string,
  query: string,
) {
  if (!query || query.length < 2) return [];

  try {
    const { data } = await supabase
      .from('faq_search_queries')
      .select('query_text')
      .eq('supplier_id', supplier_id)
      .ilike('normalized_query', `%${query.toLowerCase()}%`)
      .neq('normalized_query', query.toLowerCase())
      .order('created_at', { ascending: false })
      .limit(5);

    return data?.map((d: any) => d.query_text) || [];
  } catch (error) {
    console.error('Get suggestions error:', error);
    return [];
  }
}
