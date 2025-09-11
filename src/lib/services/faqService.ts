// FAQ Service - Search, Analytics, and Management
// Feature ID: WS-070 - FAQ Management - Client Support Automation

import Fuse from 'fuse.js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type {
  FaqCategory,
  FaqItem,
  FaqSearchRequest,
  FaqSearchResponse,
  FaqSearchResult,
  TrackFaqAnalyticsRequest,
  SubmitFaqFeedbackRequest,
  CreateFaqCategoryRequest,
  CreateFaqItemRequest,
  UpdateFaqCategoryRequest,
  UpdateFaqItemRequest,
  FaqDashboardOverview,
  FaqAnalyticsDashboard,
} from '@/types/faq';

interface FuseSearchItem extends FaqItem {
  category_name?: string;
  category_slug?: string;
}

export class FaqService {
  private supabase = createClientComponentClient();
  private fuseInstance?: Fuse<FuseSearchItem>;
  private searchCache = new Map<
    string,
    { results: FaqSearchResult[]; timestamp: number }
  >();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // ============================================
  // SEARCH FUNCTIONALITY
  // ============================================

  /**
   * Initialize Fuse.js instance with FAQ data for fuzzy search
   */
  private async initializeFuse(supplier_id: string): Promise<void> {
    const { data: faqs } = await this.supabase
      .from('faq_items')
      .select(
        `
        *,
        faq_categories!inner (
          name,
          slug
        )
      `,
      )
      .eq('supplier_id', supplier_id)
      .eq('is_published', true);

    if (faqs) {
      const searchableItems: FuseSearchItem[] = faqs.map((faq) => ({
        ...faq,
        category_name: (faq as any).faq_categories?.name,
        category_slug: (faq as any).faq_categories?.slug,
      }));

      const options: Fuse.IFuseOptions<FuseSearchItem> = {
        keys: [
          { name: 'question', weight: 0.4 },
          { name: 'answer', weight: 0.3 },
          { name: 'summary', weight: 0.2 },
          { name: 'tags', weight: 0.1 },
        ],
        includeScore: true,
        includeMatches: true,
        threshold: 0.4, // More permissive fuzzy matching
        location: 0,
        distance: 100,
        minMatchCharLength: 2,
        ignoreLocation: true,
        useExtendedSearch: true,
      };

      this.fuseInstance = new Fuse(searchableItems, options);
    }
  }

  /**
   * Search FAQs with hybrid PostgreSQL + Fuse.js approach for optimal performance and relevance
   */
  async searchFaqs(request: FaqSearchRequest): Promise<FaqSearchResponse> {
    const startTime = performance.now();
    const {
      query,
      category_id,
      limit = 10,
      offset = 0,
      include_categories = false,
    } = request;

    // Check cache first
    const cacheKey = JSON.stringify(request);
    const cached = this.searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return {
        results: cached.results.slice(offset, offset + limit),
        total_count: cached.results.length,
        search_duration_ms: performance.now() - startTime,
        suggestions: await this.getSearchSuggestions(query),
      };
    }

    try {
      // Get supplier ID from current user
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: supplier } = await this.supabase
        .from('suppliers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!supplier) throw new Error('Supplier not found');

      // First try PostgreSQL full-text search for performance
      let postgresResults: FaqSearchResult[] = [];
      if (query.trim()) {
        const { data: searchResults } = await this.supabase.rpc('search_faqs', {
          p_supplier_id: supplier.id,
          p_query: query,
          p_category_id: category_id,
          p_limit: Math.max(limit * 2, 20), // Get more results for Fuse.js refinement
          p_offset: 0,
        });

        if (searchResults) {
          postgresResults = searchResults.map((result: any) => ({
            id: result.id,
            question: result.question,
            answer: result.answer,
            summary: result.summary,
            category_name: result.category_name,
            tags: result.tags,
            view_count: result.view_count,
            help_score: result.help_score,
            is_featured: result.is_featured,
            relevance_score: result.relevance_score,
          }));
        }
      }

      // If PostgreSQL returns few results or query is complex, use Fuse.js for fuzzy matching
      let finalResults: FaqSearchResult[] = [];

      if (postgresResults.length < 5 || this.isComplexQuery(query)) {
        // Initialize Fuse.js if needed
        if (!this.fuseInstance) {
          await this.initializeFuse(supplier.id);
        }

        if (this.fuseInstance && query.trim()) {
          // Use Fuse.js for fuzzy search
          const fuseResults = this.fuseInstance.search(query, {
            limit: limit * 3, // Get more for better filtering
          });

          const fuseSearchResults: FaqSearchResult[] = fuseResults
            .filter(
              (result) =>
                !category_id || result.item.category_id === category_id,
            )
            .map((result) => ({
              id: result.item.id,
              question: result.item.question,
              answer: result.item.answer,
              summary: result.item.summary,
              category_name: result.item.category_name || '',
              category_slug: result.item.category_slug,
              tags: result.item.tags,
              view_count: result.item.view_count,
              help_score: result.item.help_score,
              is_featured: result.item.is_featured,
              relevance_score: result.score ? (1 - result.score) * 100 : 0,
              highlighted_question: this.highlightMatches(
                result.item.question,
                result.matches?.filter((m) => m.key === 'question'),
              ),
              highlighted_answer: this.highlightMatches(
                result.item.answer,
                result.matches?.filter((m) => m.key === 'answer'),
              ),
            }));

          // Combine and deduplicate results, preferring Fuse.js scores
          const combinedResults = new Map<string, FaqSearchResult>();

          fuseSearchResults.forEach((result) =>
            combinedResults.set(result.id, result),
          );
          postgresResults.forEach((result) => {
            if (!combinedResults.has(result.id)) {
              combinedResults.set(result.id, result);
            }
          });

          finalResults = Array.from(combinedResults.values()).sort((a, b) => {
            // Prioritize featured, then relevance, then helpfulness
            if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
            if (Math.abs(a.relevance_score - b.relevance_score) > 5)
              return b.relevance_score - a.relevance_score;
            return b.help_score - a.help_score;
          });
        } else {
          finalResults = postgresResults;
        }
      } else {
        finalResults = postgresResults;
      }

      // Cache results
      this.searchCache.set(cacheKey, {
        results: finalResults,
        timestamp: Date.now(),
      });

      // Track analytics
      if (query.trim()) {
        await this.trackSearchQuery(supplier.id, query, finalResults.length);
      }

      const searchDuration = performance.now() - startTime;

      const response: FaqSearchResponse = {
        results: finalResults.slice(offset, offset + limit),
        total_count: finalResults.length,
        search_duration_ms: Math.round(searchDuration),
        suggestions: await this.getSearchSuggestions(query),
      };

      if (include_categories) {
        response.categories = await this.getFaqCategories(supplier.id);
      }

      return response;
    } catch (error) {
      console.error('FAQ search error:', error);
      throw error;
    }
  }

  /**
   * Get search suggestions based on query and popular searches
   */
  private async getSearchSuggestions(query: string): Promise<string[]> {
    if (!query || query.length < 2) return [];

    try {
      const { data } = await this.supabase
        .from('faq_search_queries')
        .select('normalized_query, query_text')
        .ilike('normalized_query', `%${query.toLowerCase()}%`)
        .neq('normalized_query', query.toLowerCase())
        .order('created_at', { ascending: false })
        .limit(5);

      return data?.map((d) => d.query_text) || [];
    } catch {
      return [];
    }
  }

  /**
   * Determine if query needs fuzzy search (typos, partial words, etc.)
   */
  private isComplexQuery(query: string): boolean {
    return (
      query.includes('*') ||
      query.includes('?') ||
      query.split(' ').some((word) => word.length < 4) ||
      /[^\w\s]/.test(query.replace(/[?*]/, ''))
    );
  }

  /**
   * Highlight search matches in text
   */
  private highlightMatches(
    text: string,
    matches?: readonly Fuse.FuseResultMatch[],
  ): string {
    if (!matches || matches.length === 0) return text;

    let result = text;
    const indices = matches
      .flatMap((match) => match.indices || [])
      .sort((a, b) => b[0] - a[0]); // Sort in reverse order to avoid index shifting

    indices.forEach(([start, end]) => {
      const before = result.slice(0, start);
      const match = result.slice(start, end + 1);
      const after = result.slice(end + 1);
      result = `${before}<mark>${match}</mark>${after}`;
    });

    return result;
  }

  // ============================================
  // ANALYTICS TRACKING
  // ============================================

  /**
   * Track FAQ analytics event
   */
  async trackAnalytics(request: TrackFaqAnalyticsRequest): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) return false;

      const { data: supplier } = await this.supabase
        .from('suppliers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!supplier) return false;

      const { data, error } = await this.supabase.rpc('track_faq_analytics', {
        p_supplier_id: supplier.id,
        p_faq_item_id: request.faq_item_id,
        p_event_type: request.event_type,
        p_search_query: request.search_query,
        p_user_session_id: request.user_session_id,
        p_client_id: null, // Will be set if client is authenticated
        p_metadata: request.metadata || {},
      });

      return !error && data;
    } catch (error) {
      console.error('Analytics tracking error:', error);
      return false;
    }
  }

  /**
   * Track search query for analytics
   */
  private async trackSearchQuery(
    supplier_id: string,
    query: string,
    result_count: number,
  ): Promise<void> {
    try {
      await this.supabase.from('faq_search_queries').insert({
        supplier_id,
        query_text: query,
        normalized_query: query.toLowerCase().trim(),
        result_count,
        has_results: result_count > 0,
      });
    } catch (error) {
      // Non-critical error, log but don't throw
      console.warn('Failed to track search query:', error);
    }
  }

  /**
   * Submit FAQ feedback
   */
  async submitFeedback(request: SubmitFaqFeedbackRequest): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) return false;

      const { data: supplier } = await this.supabase
        .from('suppliers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!supplier) return false;

      const { error } = await this.supabase.from('faq_feedback').insert({
        supplier_id: supplier.id,
        faq_item_id: request.faq_item_id,
        is_helpful: request.is_helpful,
        feedback_text: request.feedback_text,
        suggested_improvement: request.suggested_improvement,
        user_session_id: request.user_session_id,
      });

      if (!error) {
        // Also track as analytics event
        await this.trackAnalytics({
          faq_item_id: request.faq_item_id,
          event_type: request.is_helpful ? 'helpful' : 'not_helpful',
          user_session_id: request.user_session_id,
          metadata: {
            feedback_text: request.feedback_text,
            suggested_improvement: request.suggested_improvement,
          },
        });
      }

      return !error;
    } catch (error) {
      console.error('FAQ feedback error:', error);
      return false;
    }
  }

  // ============================================
  // CATEGORY MANAGEMENT
  // ============================================

  /**
   * Get FAQ categories for a supplier
   */
  async getFaqCategories(
    supplier_id?: string,
  ): Promise<Array<{ id: string; name: string; slug: string; count: number }>> {
    try {
      let supplierId = supplier_id;
      if (!supplierId) {
        const {
          data: { user },
        } = await this.supabase.auth.getUser();
        if (!user) return [];

        const { data: supplier } = await this.supabase
          .from('suppliers')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!supplier) return [];
        supplierId = supplier.id;
      }

      const { data } = await this.supabase
        .from('faq_categories')
        .select(
          `
          id,
          name,
          slug,
          faq_items!inner (count)
        `,
        )
        .eq('supplier_id', supplierId)
        .eq('is_active', true)
        .eq('faq_items.is_published', true);

      return (
        data?.map((cat) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          count: (cat as any).faq_items?.length || 0,
        })) || []
      );
    } catch (error) {
      console.error('Get categories error:', error);
      return [];
    }
  }

  /**
   * Create FAQ category
   */
  async createCategory(
    request: CreateFaqCategoryRequest,
  ): Promise<FaqCategory | null> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) return null;

      const { data: supplier } = await this.supabase
        .from('suppliers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!supplier) return null;

      const { data, error } = await this.supabase
        .from('faq_categories')
        .insert({
          supplier_id: supplier.id,
          ...request,
        })
        .select()
        .single();

      return error ? null : data;
    } catch (error) {
      console.error('Create category error:', error);
      return null;
    }
  }

  /**
   * Update FAQ category
   */
  async updateCategory(
    request: UpdateFaqCategoryRequest,
  ): Promise<FaqCategory | null> {
    try {
      const { id, ...updates } = request;
      const { data, error } = await this.supabase
        .from('faq_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      return error ? null : data;
    } catch (error) {
      console.error('Update category error:', error);
      return null;
    }
  }

  // ============================================
  // FAQ ITEM MANAGEMENT
  // ============================================

  /**
   * Create FAQ item
   */
  async createFaqItem(request: CreateFaqItemRequest): Promise<FaqItem | null> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) return null;

      const { data: supplier } = await this.supabase
        .from('suppliers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!supplier) return null;

      const { data, error } = await this.supabase
        .from('faq_items')
        .insert({
          supplier_id: supplier.id,
          ...request,
          tags: request.tags || [],
        })
        .select()
        .single();

      if (!error && data) {
        // Invalidate Fuse cache
        this.fuseInstance = undefined;
        this.searchCache.clear();
      }

      return error ? null : data;
    } catch (error) {
      console.error('Create FAQ item error:', error);
      return null;
    }
  }

  /**
   * Update FAQ item
   */
  async updateFaqItem(request: UpdateFaqItemRequest): Promise<FaqItem | null> {
    try {
      const { id, ...updates } = request;
      const { data, error } = await this.supabase
        .from('faq_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (!error) {
        // Invalidate cache when FAQ is updated
        this.fuseInstance = undefined;
        this.searchCache.clear();
      }

      return error ? null : data;
    } catch (error) {
      console.error('Update FAQ item error:', error);
      return null;
    }
  }

  /**
   * Get FAQ dashboard data
   */
  async getDashboard(): Promise<FaqDashboardOverview | null> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) return null;

      const { data: supplier } = await this.supabase
        .from('suppliers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!supplier) return null;

      const { data, error } = await this.supabase
        .from('faq_dashboard_overview')
        .select('*')
        .eq('supplier_id', supplier.id)
        .single();

      return error ? null : data;
    } catch (error) {
      console.error('Get dashboard error:', error);
      return null;
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Clear search cache (useful after data updates)
   */
  clearCache(): void {
    this.searchCache.clear();
    this.fuseInstance = undefined;
  }

  /**
   * Get FAQ item by ID
   */
  async getFaqItem(id: string): Promise<FaqItem | null> {
    try {
      const { data, error } = await this.supabase
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
        .eq('id', id)
        .single();

      return error ? null : data;
    } catch (error) {
      console.error('Get FAQ item error:', error);
      return null;
    }
  }

  /**
   * Get popular FAQs for a supplier
   */
  async getPopularFaqs(limit: number = 5): Promise<FaqItem[]> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) return [];

      const { data: supplier } = await this.supabase
        .from('suppliers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!supplier) return [];

      const { data } = await this.supabase
        .from('faq_items')
        .select('*')
        .eq('supplier_id', supplier.id)
        .eq('is_published', true)
        .order('view_count', { ascending: false })
        .order('help_score', { ascending: false })
        .limit(limit);

      return data || [];
    } catch (error) {
      console.error('Get popular FAQs error:', error);
      return [];
    }
  }
}

// Create singleton instance
export const faqService = new FaqService();
