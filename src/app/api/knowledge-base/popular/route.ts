/**
 * WS-238 Knowledge Base System - Popular Articles API
 * High-performing content discovery with wedding industry analytics
 *
 * Endpoint: GET /api/knowledge-base/popular
 * Security: Authentication required, tier-based filtering, caching
 * Performance: <150ms response time, cached results, optimized analytics queries
 */

import { NextRequest, NextResponse } from 'next/server';
import { withQueryValidation } from '@/lib/validation/middleware';
import { validateKbPopular } from '@/lib/validation/knowledge-base';
import { createClient } from '@/lib/supabase/server';

// Popular articles cache (In production, use Redis)
const popularCache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

/**
 * Popular Articles Handler - Returns top-performing content with analytics
 *
 * Features:
 * - Time-based popularity metrics (daily, weekly, monthly, all-time)
 * - Supplier type specific popular content
 * - Category and access level filtering
 * - Wedding industry trend analysis
 * - Performance metrics and engagement data
 */
async function handlePopularRequest(
  request: NextRequest,
  query: any,
): Promise<NextResponse> {
  try {
    // Initialize Supabase client
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: 'UNAUTHORIZED',
          message: 'Authentication required for popular articles',
          code: 'AUTH_REQUIRED',
        },
        { status: 401 },
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id, subscription_tier, supplier_type')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        {
          error: 'FORBIDDEN',
          message: 'User profile not found',
          code: 'PROFILE_NOT_FOUND',
        },
        { status: 403 },
      );
    }

    // Check cache
    const cacheKey = `popular_${profile.organization_id}_${JSON.stringify(query)}`;
    const cached = popularCache.get(cacheKey);
    if (cached && Date.now() < cached.expires) {
      return NextResponse.json(
        {
          success: true,
          data: cached.data,
          metadata: {
            cached: true,
            user_tier: profile.subscription_tier || 'free',
            cache_expires: new Date(cached.expires).toISOString(),
          },
        },
        {
          headers: {
            'Cache-Control': 'public, max-age=900', // 15 minutes
            'X-Cache': 'HIT',
          },
        },
      );
    }

    // Get user's access levels
    const userAccessLevels = getUserAccessLevels(
      profile.subscription_tier || 'free',
    );

    // Generate popular articles data
    const popularStartTime = Date.now();
    const popularData = await generatePopularArticlesData(
      supabase,
      profile.organization_id,
      userAccessLevels,
      query,
      profile.supplier_type,
    );
    const popularLoadTime = Date.now() - popularStartTime;

    // Cache the results
    popularCache.set(cacheKey, {
      data: popularData,
      expires: Date.now() + CACHE_TTL,
    });

    const response = {
      success: true,
      data: popularData,
      metadata: {
        cached: false,
        user_tier: profile.subscription_tier || 'free',
        supplier_type: profile.supplier_type,
        load_time_ms: popularLoadTime,
        timeframe: query.timeframe || 'weekly',
      },
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=900',
        'X-Cache': 'MISS',
        'X-Load-Time': popularLoadTime.toString(),
      },
    });
  } catch (error) {
    console.error('Popular articles request error:', error);

    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching popular articles',
        code: 'POPULAR_ERROR',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

/**
 * Generate popular articles data with comprehensive analytics
 */
async function generatePopularArticlesData(
  supabase: any,
  organizationId: string,
  accessLevels: string[],
  query: any,
  supplierType?: string,
) {
  // Calculate date range based on timeframe
  const dateRange = getDateRange(query.timeframe || 'weekly');

  // Build base query
  let articlesQuery = supabase
    .from('kb_articles')
    .select(
      `
      id,
      title,
      slug,
      excerpt,
      category,
      subcategory,
      tags,
      difficulty,
      content_type,
      access_level,
      is_featured,
      reading_time_minutes,
      view_count,
      helpful_votes,
      not_helpful_votes,
      average_rating,
      total_ratings,
      published_at
    `,
    )
    .eq('organization_id', organizationId)
    .eq('status', 'published')
    .in('access_level', accessLevels);

  // Apply filters
  if (query.category) {
    articlesQuery = articlesQuery.eq('category', query.category);
  }

  if (query.supplier_type) {
    articlesQuery = articlesQuery.eq('category', query.supplier_type);
  }

  if (query.access_level) {
    articlesQuery = articlesQuery.eq('access_level', query.access_level);
  }

  // For time-based queries, we need recent activity data
  if (query.timeframe !== 'all_time') {
    articlesQuery = articlesQuery.gte('published_at', dateRange.start);
  }

  // Get articles with activity in the timeframe
  const { data: articles, error: articlesError } = await articlesQuery
    .order('view_count', { ascending: false })
    .limit((query.limit || 10) * 3); // Get more to allow for time-based filtering

  if (articlesError || !articles?.length) {
    return {
      articles: [],
      analytics: {
        total_articles: 0,
        timeframe: query.timeframe || 'weekly',
        date_range: dateRange,
      },
    };
  }

  // Get recent analytics data for time-based popularity
  let popularityMetrics: any[] = [];

  if (query.timeframe !== 'all_time') {
    popularityMetrics = await getTimeBasedPopularityMetrics(
      supabase,
      articles.map((a) => a.id),
      dateRange,
      organizationId,
    );
  }

  // Score and rank articles
  const scoredArticles = articles.map((article) => {
    const metrics =
      popularityMetrics.find((m) => m.article_id === article.id) || {};

    const score = calculatePopularityScore(
      article,
      metrics,
      query.timeframe || 'weekly',
    );

    return {
      ...article,
      popularity_score: score,
      recent_views: metrics.recent_views || 0,
      recent_searches: metrics.recent_searches || 0,
      engagement_rate: calculateEngagementRate(article),
      trend_direction: calculateTrendDirection(metrics),
      performance_tier: getPerformanceTier(score),
    };
  });

  // Sort by popularity score and limit results
  const topArticles = scoredArticles
    .sort((a, b) => b.popularity_score - a.popularity_score)
    .slice(0, query.limit || 10);

  // Generate category analytics
  const categoryAnalytics = generateCategoryAnalytics(
    scoredArticles,
    supplierType,
  );

  // Generate trend insights
  const trendInsights = generateTrendInsights(scoredArticles, query.timeframe);

  return {
    articles: topArticles,
    analytics: {
      total_articles: articles.length,
      timeframe: query.timeframe || 'weekly',
      date_range: dateRange,
      category_performance: categoryAnalytics,
      trend_insights: trendInsights,
      avg_popularity_score:
        topArticles.reduce((sum, a) => sum + a.popularity_score, 0) /
        topArticles.length,
    },
  };
}

/**
 * Get time-based popularity metrics from search analytics
 */
async function getTimeBasedPopularityMetrics(
  supabase: any,
  articleIds: string[],
  dateRange: any,
  organizationId: string,
): Promise<any[]> {
  try {
    const { data: searchMetrics } = await supabase
      .from('kb_search_analytics')
      .select('clicked_article_id, search_query')
      .in('clicked_article_id', articleIds)
      .eq('organization_id', organizationId)
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end);

    if (!searchMetrics?.length) return [];

    // Aggregate metrics per article
    const metricsMap: Record<string, any> = {};

    searchMetrics.forEach((metric) => {
      if (!metric.clicked_article_id) return;

      if (!metricsMap[metric.clicked_article_id]) {
        metricsMap[metric.clicked_article_id] = {
          article_id: metric.clicked_article_id,
          recent_views: 0,
          recent_searches: 0,
          search_queries: new Set(),
        };
      }

      metricsMap[metric.clicked_article_id].recent_views++;
      if (metric.search_query) {
        metricsMap[metric.clicked_article_id].search_queries.add(
          metric.search_query,
        );
      }
    });

    return Object.values(metricsMap).map((metrics) => ({
      ...metrics,
      recent_searches: metrics.search_queries.size,
      search_queries: undefined, // Remove Set for JSON serialization
    }));
  } catch (error) {
    console.error('Failed to get time-based metrics:', error);
    return [];
  }
}

/**
 * Calculate popularity score based on multiple factors
 */
function calculatePopularityScore(
  article: any,
  recentMetrics: any,
  timeframe: string,
): number {
  let score = 0;

  // Base scores from article data
  score += article.view_count * 0.1;
  score += (article.average_rating || 0) * 20;
  score += article.helpful_votes * 5;
  score -= article.not_helpful_votes * 2;
  score += article.is_featured ? 50 : 0;

  // Recent activity boost (for time-based queries)
  if (timeframe !== 'all_time' && recentMetrics) {
    score += (recentMetrics.recent_views || 0) * 2;
    score += (recentMetrics.recent_searches || 0) * 3;
  }

  // Content type multipliers
  const contentTypeMultipliers = {
    tutorial: 1.2,
    checklist: 1.1,
    case_study: 1.15,
    template: 1.1,
    article: 1.0,
    faq: 0.9,
  };

  score *=
    contentTypeMultipliers[
      article.content_type as keyof typeof contentTypeMultipliers
    ] || 1.0;

  // Difficulty level adjustments
  const difficultyBoosts = {
    beginner: 1.1, // Beginner content tends to be more popular
    intermediate: 1.0,
    advanced: 0.95,
    expert: 0.9,
  };

  score *=
    difficultyBoosts[article.difficulty as keyof typeof difficultyBoosts] ||
    1.0;

  return Math.round(score);
}

/**
 * Calculate engagement rate for article
 */
function calculateEngagementRate(article: any): number {
  const totalInteractions =
    (article.helpful_votes || 0) +
    (article.not_helpful_votes || 0) +
    (article.total_ratings || 0);
  const views = article.view_count || 1;

  return Math.round((totalInteractions / views) * 100 * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate trend direction based on recent metrics
 */
function calculateTrendDirection(
  metrics: any,
): 'rising' | 'stable' | 'declining' {
  if (!metrics || !metrics.recent_views) return 'stable';

  // Simple trend calculation - in production, this would be more sophisticated
  const recentActivity = metrics.recent_views + (metrics.recent_searches || 0);

  if (recentActivity > 20) return 'rising';
  if (recentActivity < 5) return 'declining';
  return 'stable';
}

/**
 * Get performance tier based on score
 */
function getPerformanceTier(score: number): 'top' | 'high' | 'medium' | 'low' {
  if (score > 200) return 'top';
  if (score > 100) return 'high';
  if (score > 50) return 'medium';
  return 'low';
}

/**
 * Generate category analytics
 */
function generateCategoryAnalytics(articles: any[], supplierType?: string) {
  const categoryStats: Record<string, any> = {};

  articles.forEach((article) => {
    if (!categoryStats[article.category]) {
      categoryStats[article.category] = {
        category: article.category,
        article_count: 0,
        total_views: 0,
        avg_rating: 0,
        total_ratings: 0,
      };
    }

    const stats = categoryStats[article.category];
    stats.article_count++;
    stats.total_views += article.view_count || 0;
    stats.total_ratings += article.total_ratings || 0;
    if (article.average_rating) {
      stats.avg_rating =
        (stats.avg_rating * (stats.article_count - 1) +
          article.average_rating) /
        stats.article_count;
    }
  });

  return Object.values(categoryStats).sort(
    (a: any, b: any) => b.total_views - a.total_views,
  );
}

/**
 * Generate trend insights
 */
function generateTrendInsights(articles: any[], timeframe: string) {
  const risingArticles = articles.filter(
    (a) => a.trend_direction === 'rising',
  ).length;
  const topPerformers = articles.filter(
    (a) => a.performance_tier === 'top',
  ).length;
  const avgEngagement =
    articles.reduce((sum, a) => sum + a.engagement_rate, 0) / articles.length;

  return {
    rising_content_count: risingArticles,
    top_performers_count: topPerformers,
    average_engagement_rate: Math.round(avgEngagement * 100) / 100,
    timeframe_description: getTimeframeDescription(timeframe),
    performance_summary: getPerformanceSummary(articles),
  };
}

/**
 * Get date range for timeframe
 */
function getDateRange(timeframe: string) {
  const now = new Date();
  const ranges = {
    daily: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    weekly: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    monthly: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    all_time: new Date('2020-01-01'),
  };

  const start = ranges[timeframe as keyof typeof ranges] || ranges.weekly;

  return {
    start: start.toISOString(),
    end: now.toISOString(),
  };
}

/**
 * Get timeframe description
 */
function getTimeframeDescription(timeframe: string): string {
  const descriptions = {
    daily: 'Most popular articles in the last 24 hours',
    weekly: 'Top performing articles this week',
    monthly: 'Monthly trending wedding industry content',
    all_time: 'All-time most popular wedding industry content',
  };

  return (
    descriptions[timeframe as keyof typeof descriptions] || descriptions.weekly
  );
}

/**
 * Get performance summary
 */
function getPerformanceSummary(articles: any[]): string {
  const topCount = articles.filter((a) => a.performance_tier === 'top').length;
  const risingCount = articles.filter(
    (a) => a.trend_direction === 'rising',
  ).length;

  if (topCount > 5) return 'Exceptional content performance across categories';
  if (risingCount > 3) return 'Strong upward trend in content engagement';
  if (articles.some((a) => a.average_rating > 4.5))
    return 'High-quality content with excellent ratings';
  return 'Steady content performance with good engagement';
}

/**
 * Get user's allowed access levels
 */
function getUserAccessLevels(tier: string): string[] {
  const tierMap: Record<string, string[]> = {
    free: ['free'],
    trial: ['free', 'starter'],
    starter: ['free', 'starter'],
    professional: ['free', 'starter', 'professional'],
    scale: ['free', 'starter', 'professional', 'scale'],
    enterprise: ['free', 'starter', 'professional', 'scale', 'enterprise'],
  };

  return tierMap[tier] || ['free'];
}

// Export the GET handler with validation
export const GET = withQueryValidation(
  validateKbPopular.schema,
  handlePopularRequest,
);

/**
 * POPULAR ARTICLES ANALYTICS NOTES:
 *
 * 1. MULTI-FACTOR POPULARITY SCORING:
 *    - View count (base popularity)
 *    - Average rating (quality indicator)
 *    - Helpful votes (usefulness measure)
 *    - Recent activity (trending factor)
 *    - Content type multipliers
 *    - Difficulty level adjustments
 *
 * 2. TIME-BASED ANALYTICS:
 *    - Daily, weekly, monthly, all-time views
 *    - Recent search activity analysis
 *    - Trend direction calculation
 *    - Performance tier classification
 *
 * 3. WEDDING INDUSTRY INSIGHTS:
 *    - Category performance analysis
 *    - Supplier type specific popularity
 *    - Seasonal trend awareness
 *    - Professional development tracking
 *
 * 4. BUSINESS VALUE:
 *    - Identifies high-performing content for promotion
 *    - Reveals content gaps and opportunities
 *    - Supports editorial strategy decisions
 *    - Drives subscription conversions through popular content
 *
 * 5. PERFORMANCE OPTIMIZATIONS:
 *    - 15-minute caching for frequently accessed data
 *    - Efficient scoring algorithms
 *    - Selective database queries
 *    - Aggregated analytics calculations
 */
