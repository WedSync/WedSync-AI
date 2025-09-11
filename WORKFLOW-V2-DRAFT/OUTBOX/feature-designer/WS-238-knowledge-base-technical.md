# WS-238: Knowledge Base System - Technical Specification

## Executive Summary

A comprehensive self-service knowledge base system that empowers wedding suppliers and couples to find answers quickly, reducing support ticket volume by 40% while improving user satisfaction. Features AI-powered search, contextual help, interactive tutorials, and automated content generation from support patterns.

**Estimated Effort**: 134 hours
- **Frontend**: 48 hours (36%)
- **Backend**: 42 hours (31%)
- **Integration**: 24 hours (18%)
- **Platform**: 12 hours (9%)
- **General**: 8 hours (6%)

**Business Impact**:
- Reduce support ticket volume by 40% through effective self-service
- Improve user satisfaction scores by 25% through instant help availability
- Decrease average time-to-resolution for common issues from 4 hours to 2 minutes
- Enable 24/7 support coverage with consistent, high-quality information

## User Story

**As a** wedding photographer using WedSync for the first time  
**I want to** quickly find step-by-step guidance on setting up automated client questionnaires  
**So that** I can start collecting client information efficiently without waiting for support

**Acceptance Criteria**:
- ✅ Intelligent search returns relevant articles within 0.5 seconds
- ✅ Step-by-step tutorials with screenshots guide me through setup
- ✅ Context-aware help widget appears when I seem stuck
- ✅ Related articles suggest next steps in my workflow
- ✅ Can rate article helpfulness and provide specific feedback
- ✅ Video tutorials available for complex workflows
- ✅ Mobile-optimized help system for on-the-go access

## Database Schema

```sql
-- Knowledge base articles with wedding industry context
CREATE TABLE kb_articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  content TEXT NOT NULL,
  content_html TEXT, -- Processed HTML version
  summary TEXT,
  excerpt TEXT, -- Short description for search results
  
  -- Wedding industry categorization
  category kb_category_enum NOT NULL,
  subcategory VARCHAR(100),
  vendor_focus vendor_type_enum[], -- Which vendor types benefit most
  couple_relevant BOOLEAN DEFAULT TRUE, -- Relevant to couples
  
  -- Content metadata
  article_type article_type_enum NOT NULL,
  difficulty difficulty_enum DEFAULT 'beginner',
  read_time INTEGER, -- Estimated reading time in minutes
  version VARCHAR(20) DEFAULT '1.0.0',
  author_id UUID REFERENCES users(id),
  
  -- SEO optimization
  meta_title VARCHAR(255),
  meta_description TEXT,
  keywords TEXT[],
  canonical_url VARCHAR(255),
  structured_data JSONB, -- Schema.org markup
  
  -- Publishing workflow
  status article_status_enum DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  featured BOOLEAN DEFAULT FALSE,
  featured_order INTEGER,
  
  -- Search optimization
  search_terms TEXT[], -- Manually curated search terms
  auto_generated_terms TEXT[], -- AI-generated search terms
  embedding_vector vector(1536), -- OpenAI embeddings for semantic search
  
  -- Wedding season context
  seasonal_relevance seasonal_relevance_enum DEFAULT 'year_round',
  peak_season_priority BOOLEAN DEFAULT FALSE, -- Higher visibility in peak season
  
  -- Engagement tracking
  view_count INTEGER DEFAULT 0,
  helpful_votes INTEGER DEFAULT 0,
  unhelpful_votes INTEGER DEFAULT 0,
  avg_time_on_page DECIMAL(8,2) DEFAULT 0,
  bounce_rate DECIMAL(5,2) DEFAULT 0,
  completion_rate DECIMAL(5,2) DEFAULT 0, -- How many users complete tutorials
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_reviewed_at TIMESTAMPTZ,
  
  -- Full-text search
  search_document tsvector GENERATED ALWAYS AS (
    to_tsvector('english', 
      coalesce(title, '') || ' ' ||
      coalesce(content, '') || ' ' ||
      coalesce(array_to_string(keywords, ' '), '') || ' ' ||
      coalesce(array_to_string(search_terms, ' '), '')
    )
  ) STORED
);

CREATE TYPE kb_category_enum AS ENUM (
  'getting_started', 'forms_questionnaires', 'client_management',
  'journey_builder', 'communication', 'billing_payments', 'integrations',
  'troubleshooting', 'best_practices', 'advanced_features', 'api_docs',
  'wedding_planning', 'vendor_coordination', 'guest_management'
);

CREATE TYPE article_type_enum AS ENUM (
  'how_to', 'concept', 'reference', 'troubleshooting', 
  'video', 'interactive', 'checklist', 'template', 'faq'
);

CREATE TYPE difficulty_enum AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE article_status_enum AS ENUM ('draft', 'review', 'published', 'archived');
CREATE TYPE seasonal_relevance_enum AS ENUM ('year_round', 'peak_season', 'off_season', 'holiday_specific');

-- User engagement with articles
CREATE TABLE kb_article_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID REFERENCES kb_articles(id),
  user_id UUID REFERENCES users(id),
  session_id VARCHAR(100), -- Browser session
  
  -- Engagement metrics
  time_spent INTEGER, -- Seconds spent on article
  scroll_depth DECIMAL(5,2), -- Percentage scrolled
  clicks_on_links INTEGER DEFAULT 0,
  bounced BOOLEAN DEFAULT FALSE, -- Left within 30 seconds
  completed BOOLEAN DEFAULT FALSE, -- For tutorials/checklists
  
  -- Context
  referrer_type referrer_type_enum,
  referrer_url VARCHAR(500),
  search_query TEXT, -- If came from search
  device_type device_type_enum,
  
  -- Wedding context
  user_vendor_type vendor_type_enum,
  user_experience_level experience_level_enum,
  
  -- Conversion tracking
  converted_to_action BOOLEAN DEFAULT FALSE, -- Completed intended action
  action_type VARCHAR(100), -- What action was taken
  
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  
  INDEX idx_sessions_article (article_id),
  INDEX idx_sessions_user (user_id),
  INDEX idx_sessions_completed (completed),
  INDEX idx_sessions_converted (converted_to_action)
);

CREATE TYPE referrer_type_enum AS ENUM (
  'search', 'direct', 'help_widget', 'related_article', 
  'support_ticket', 'notification', 'onboarding'
);
CREATE TYPE device_type_enum AS ENUM ('desktop', 'tablet', 'mobile');
CREATE TYPE experience_level_enum AS ENUM ('new', 'beginner', 'intermediate', 'expert');

-- Search queries and analytics
CREATE TABLE kb_searches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  query TEXT NOT NULL,
  normalized_query TEXT, -- Cleaned and normalized version
  user_id UUID REFERENCES users(id),
  session_id VARCHAR(100),
  
  -- User context
  user_type user_type_enum,
  user_vendor_type vendor_type_enum,
  user_tier tier_enum,
  
  -- Search results
  results_count INTEGER DEFAULT 0,
  has_results BOOLEAN GENERATED ALWAYS AS (results_count > 0) STORED,
  clicked_result_id UUID REFERENCES kb_articles(id),
  clicked_position INTEGER, -- Position of clicked result
  has_quick_answer BOOLEAN DEFAULT FALSE,
  
  -- Search context
  source search_source_enum,
  intent search_intent_enum, -- Detected search intent
  corrected_query TEXT, -- If auto-corrected
  suggested_query TEXT, -- If suggestions were shown
  
  -- Performance metrics
  search_time_ms INTEGER, -- How long search took
  satisfaction_rating INTEGER, -- 1-5 rating if provided
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_searches_query (query),
  INDEX idx_searches_normalized (normalized_query),
  INDEX idx_searches_user (user_id),
  INDEX idx_searches_no_results (has_results) WHERE has_results = FALSE,
  INDEX idx_searches_clicked (clicked_result_id) WHERE clicked_result_id IS NOT NULL
);

CREATE TYPE search_source_enum AS ENUM (
  'help_widget', 'knowledge_base_page', 'support_portal', 
  'in_app_search', 'mobile_app', 'api'
);
CREATE TYPE search_intent_enum AS ENUM (
  'how_to', 'troubleshooting', 'concept', 'navigation', 
  'pricing', 'feature_info', 'integration'
);

-- Article relationships and recommendations
CREATE TABLE kb_article_relationships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_article_id UUID REFERENCES kb_articles(id),
  target_article_id UUID REFERENCES kb_articles(id),
  
  relationship_type relationship_type_enum NOT NULL,
  weight DECIMAL(5,2) DEFAULT 1.0, -- Relationship strength
  auto_generated BOOLEAN DEFAULT FALSE, -- AI-generated relationship
  
  -- Wedding workflow context
  workflow_step INTEGER, -- Order in typical workflow
  prerequisite BOOLEAN DEFAULT FALSE, -- Must read before source
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(source_article_id, target_article_id, relationship_type),
  INDEX idx_relationships_source (source_article_id),
  INDEX idx_relationships_target (target_article_id)
);

CREATE TYPE relationship_type_enum AS ENUM (
  'related', 'prerequisite', 'next_step', 'advanced_version',
  'troubleshooting', 'alternative', 'example', 'workflow_continuation'
);

-- User feedback on articles
CREATE TABLE kb_article_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID REFERENCES kb_articles(id),
  user_id UUID REFERENCES users(id),
  session_id VARCHAR(100),
  
  -- Feedback type
  feedback_type feedback_type_enum NOT NULL,
  helpful BOOLEAN, -- For helpful/unhelpful votes
  rating INTEGER, -- 1-5 stars for detailed feedback
  
  -- Detailed feedback
  feedback_text TEXT,
  suggested_improvement TEXT,
  missing_information TEXT,
  incorrect_information TEXT,
  
  -- Context
  user_context JSONB, -- User's current workflow context
  completion_status completion_status_enum,
  
  -- Wedding industry context
  vendor_perspective TEXT, -- How it relates to their vendor type
  client_impact TEXT, -- How it affects their couples
  
  -- Moderation
  status feedback_status_enum DEFAULT 'pending',
  moderator_id UUID REFERENCES users(id),
  moderator_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  moderated_at TIMESTAMPTZ,
  
  INDEX idx_feedback_article (article_id),
  INDEX idx_feedback_user (user_id),
  INDEX idx_feedback_helpful (helpful) WHERE helpful IS NOT NULL,
  INDEX idx_feedback_pending (status) WHERE status = 'pending'
);

CREATE TYPE feedback_type_enum AS ENUM (
  'helpful_vote', 'rating', 'detailed_feedback', 'error_report', 'suggestion'
);
CREATE TYPE completion_status_enum AS ENUM (
  'not_started', 'in_progress', 'completed', 'abandoned'
);
CREATE TYPE feedback_status_enum AS ENUM ('pending', 'approved', 'rejected', 'spam');

-- Video tutorials integration
CREATE TABLE kb_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  
  -- Video content
  video_url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  duration_seconds INTEGER,
  transcript TEXT,
  captions_url VARCHAR(500), -- SRT/VTT file URL
  
  -- Categorization
  category kb_category_enum NOT NULL,
  vendor_focus vendor_type_enum[],
  difficulty difficulty_enum DEFAULT 'beginner',
  
  -- Related content
  related_articles UUID[],
  prerequisite_articles UUID[],
  follow_up_articles UUID[],
  
  -- Engagement
  view_count INTEGER DEFAULT 0,
  completion_rate DECIMAL(5,2) DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  dislike_count INTEGER DEFAULT 0,
  
  -- Wedding context
  seasonal_relevance seasonal_relevance_enum DEFAULT 'year_round',
  workflow_position INTEGER, -- Order in typical user workflow
  
  -- Publishing
  status article_status_enum DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_videos_category (category),
  INDEX idx_videos_status (status),
  INDEX idx_videos_published (published_at) WHERE status = 'published'
);

-- Content analytics and insights
CREATE TABLE kb_analytics_daily (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  
  -- Overall metrics
  total_searches INTEGER DEFAULT 0,
  successful_searches INTEGER DEFAULT 0, -- Found results
  failed_searches INTEGER DEFAULT 0, -- No results
  unique_searchers INTEGER DEFAULT 0,
  
  -- Article metrics
  article_views INTEGER DEFAULT 0,
  unique_article_viewers INTEGER DEFAULT 0,
  avg_time_on_articles DECIMAL(8,2) DEFAULT 0,
  article_completion_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Feedback metrics
  helpful_votes INTEGER DEFAULT 0,
  unhelpful_votes INTEGER DEFAULT 0,
  detailed_feedback_count INTEGER DEFAULT 0,
  avg_satisfaction_rating DECIMAL(3,2),
  
  -- Support deflection
  estimated_tickets_deflected INTEGER DEFAULT 0,
  estimated_cost_savings DECIMAL(10,2) DEFAULT 0,
  
  -- User segments
  supplier_searches INTEGER DEFAULT 0,
  couple_searches INTEGER DEFAULT 0,
  new_user_searches INTEGER DEFAULT 0,
  
  -- Popular content
  top_articles JSONB, -- Array of {article_id, views}
  top_searches JSONB, -- Array of {query, count}
  failed_search_queries JSONB, -- Array of queries with no results
  
  -- Wedding seasonality
  peak_season_multiplier DECIMAL(3,2) DEFAULT 1.0,
  
  UNIQUE(date),
  INDEX idx_analytics_date (date DESC)
);

-- Search suggestions and autocomplete
CREATE TABLE kb_search_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  suggestion_text VARCHAR(255) NOT NULL,
  normalized_text VARCHAR(255),
  
  -- Popularity metrics
  search_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0, -- How often it returns good results
  click_through_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Context
  category kb_category_enum,
  user_types user_type_enum[],
  vendor_types vendor_type_enum[],
  
  -- Management
  status suggestion_status_enum DEFAULT 'auto',
  manually_added BOOLEAN DEFAULT FALSE,
  priority INTEGER DEFAULT 0, -- Higher number = higher priority
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_searched_at TIMESTAMPTZ,
  
  UNIQUE(normalized_text),
  INDEX idx_suggestions_text (suggestion_text),
  INDEX idx_suggestions_popularity (search_count DESC),
  INDEX idx_suggestions_status (status)
);

CREATE TYPE suggestion_status_enum AS ENUM ('auto', 'approved', 'rejected', 'featured');

-- Performance indexes for fast search
CREATE INDEX idx_articles_search_document ON kb_articles USING gin(search_document);
CREATE INDEX idx_articles_embedding_vector ON kb_articles USING ivfflat(embedding_vector vector_cosine_ops);
CREATE INDEX idx_articles_category_published ON kb_articles(category, published_at) WHERE status = 'published';
CREATE INDEX idx_articles_vendor_focus ON kb_articles USING gin(vendor_focus);
CREATE INDEX idx_articles_featured ON kb_articles(featured_order) WHERE featured = TRUE;
CREATE INDEX idx_articles_seasonal ON kb_articles(seasonal_relevance, peak_season_priority);

-- Materialized view for popular content
CREATE MATERIALIZED VIEW kb_popular_articles AS
SELECT 
  a.id,
  a.title,
  a.category,
  a.vendor_focus,
  a.difficulty,
  a.view_count,
  a.helpful_votes,
  a.unhelpful_votes,
  COALESCE(a.helpful_votes::float / NULLIF(a.helpful_votes + a.unhelpful_votes, 0), 0) as helpfulness_ratio,
  a.avg_time_on_page,
  a.completion_rate,
  
  -- Popularity score calculation
  (
    (a.view_count * 0.3) +
    (a.helpful_votes * 2.0) +
    (a.avg_time_on_page * 0.01) +
    (a.completion_rate * 0.5) -
    (a.unhelpful_votes * 0.5)
  ) as popularity_score,
  
  -- Recent engagement (last 30 days)
  (
    SELECT COUNT(*)
    FROM kb_article_sessions kas
    WHERE kas.article_id = a.id
    AND kas.started_at >= NOW() - INTERVAL '30 days'
  ) as recent_views
  
FROM kb_articles a
WHERE a.status = 'published'
ORDER BY popularity_score DESC;

CREATE UNIQUE INDEX idx_popular_articles_id ON kb_popular_articles(id);
CREATE INDEX idx_popular_articles_category ON kb_popular_articles(category);
CREATE INDEX idx_popular_articles_score ON kb_popular_articles(popularity_score DESC);

-- Refresh popular articles daily
CREATE OR REPLACE FUNCTION refresh_popular_articles()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY kb_popular_articles;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Auto-refresh trigger (runs daily via cron job)
```

## API Endpoints

### Knowledge Base Content API

```typescript
// Knowledge base article management
GET /api/knowledge-base/articles
interface GetArticlesRequest {
  category?: KBCategory;
  difficulty?: DifficultyLevel;
  userType?: UserType;
  vendorType?: VendorType;
  featured?: boolean;
  limit?: number;
  offset?: number;
  sort?: 'popularity' | 'recent' | 'helpful' | 'title';
}

interface GetArticlesResponse {
  articles: KBArticle[];
  totalCount: number;
  categories: CategoryStats[];
  popularSearches: string[];
  featuredArticles: KBArticle[];
}

// Intelligent search with context
POST /api/knowledge-base/search
interface SearchRequest {
  query: string;
  filters?: {
    category?: KBCategory;
    difficulty?: DifficultyLevel;
    articleType?: ArticleType;
    vendorFocus?: VendorType;
  };
  userContext?: {
    userType: UserType;
    vendorType?: VendorType;
    experienceLevel: ExperienceLevel;
    currentWorkflow?: string;
  };
  includeVideos?: boolean;
  semanticSearch?: boolean; // Use vector similarity
}

interface SearchResponse {
  articles: SearchResult[];
  videos: VideoResult[];
  quickAnswer?: QuickAnswer;
  relatedSearches: string[];
  suggestions: string[];
  searchTime: number;
  totalResults: number;
  didYouMean?: string;
  aiGeneratedResults?: boolean;
}

// Article details with engagement tracking
GET /api/knowledge-base/articles/:slug
interface ArticleDetailsResponse {
  article: KBArticleDetail;
  relatedArticles: KBArticle[];
  relatedVideos: KBVideo[];
  userProgress?: {
    hasViewed: boolean;
    timeSpent: number;
    completed: boolean;
    lastVisit: Date;
  };
  navigation: {
    previous?: KBArticle;
    next?: KBArticle;
    parent?: KBArticle;
  };
}

// Real-time search suggestions
GET /api/knowledge-base/suggestions
interface SuggestionsRequest {
  prefix: string;
  userType?: UserType;
  vendorType?: VendorType;
  limit?: number;
}

interface SuggestionsResponse {
  suggestions: SearchSuggestion[];
  popularQueries: string[];
  contextualSuggestions: string[];
}
```

### User Engagement & Analytics API

```typescript
// Track article engagement
POST /api/knowledge-base/articles/:id/view
interface TrackViewRequest {
  sessionId: string;
  referrer?: string;
  searchQuery?: string;
  deviceType: DeviceType;
}

// Submit article feedback
POST /api/knowledge-base/articles/:id/feedback
interface FeedbackRequest {
  type: FeedbackType;
  helpful?: boolean;
  rating?: number;
  feedbackText?: string;
  suggestedImprovement?: string;
  completionStatus: CompletionStatus;
  userContext?: {
    currentWorkflow: string;
    vendorPerspective: string;
  };
}

// Complete tutorial or checklist
POST /api/knowledge-base/articles/:id/complete
interface CompleteArticleRequest {
  sessionId: string;
  timeSpent: number;
  scrollDepth: number;
  actionsCompleted: string[];
  convertedToAction?: {
    actionType: string;
    successful: boolean;
  };
}

// Analytics and insights
GET /api/knowledge-base/analytics
interface AnalyticsRequest {
  timeframe: '7d' | '30d' | '90d' | '1y';
  userType?: UserType;
  category?: KBCategory;
}

interface AnalyticsResponse {
  summary: {
    totalViews: number;
    uniqueViewers: number;
    searchQueries: number;
    avgTimeOnPage: number;
    helpfulnessRatio: number;
    estimatedTicketsDeflected: number;
  };
  trends: {
    viewsTrend: TimeSeriesData[];
    searchesTrend: TimeSeriesData[];
    satisfactionTrend: TimeSeriesData[];
  };
  topContent: {
    mostViewed: KBArticle[];
    mostHelpful: KBArticle[];
    needsImprovement: KBArticle[];
  };
  searchInsights: {
    topQueries: QueryStats[];
    failedSearches: string[];
    searchGaps: SearchGap[];
  };
  userBehavior: {
    popularPaths: UserPath[];
    dropOffPoints: DropOffAnalysis[];
    conversionRates: ConversionMetrics;
  };
}
```

### Content Management API

```typescript
// AI-powered content generation
POST /api/knowledge-base/generate-article
interface GenerateArticleRequest {
  source: 'tickets' | 'user_feedback' | 'feature_request';
  sourceData: {
    ticketIds?: string[];
    feedbackItems?: UserFeedback[];
    featureDescription?: string;
  };
  targetAudience: {
    userType: UserType;
    vendorTypes: VendorType[];
    difficulty: DifficultyLevel;
  };
  articleType: ArticleType;
}

interface GenerateArticleResponse {
  generatedArticle: {
    title: string;
    content: string;
    summary: string;
    keywords: string[];
    suggestedCategory: KBCategory;
    estimatedReadTime: number;
  };
  confidence: number;
  sourceAnalysis: {
    commonIssues: IssuePattern[];
    suggestedSolutions: Solution[];
    relatedArticles: KBArticle[];
  };
}

// Content optimization suggestions
GET /api/knowledge-base/articles/:id/optimization
interface OptimizationResponse {
  currentPerformance: {
    helpfulnessRatio: number;
    avgTimeOnPage: number;
    completionRate: number;
    searchRanking: number;
  };
  suggestions: OptimizationSuggestion[];
  contentGaps: string[];
  seoCenters: SEORecommendation[];
}

// Bulk content operations
POST /api/knowledge-base/bulk-update
interface BulkUpdateRequest {
  operation: 'update_categories' | 'refresh_embeddings' | 'regenerate_summaries';
  articleIds: string[];
  parameters?: Record<string, any>;
}
```

## Frontend Components

### Knowledge Base Portal

```tsx
// Main knowledge base interface with intelligent features
// components/knowledge-base/KnowledgeBasePortal.tsx
import React, { useState, useEffect } from 'react';
import { useKnowledgeBase, useUser, useAnalytics } from '@/hooks';
import { SearchBar } from './SearchBar';
import { ArticleGrid } from './ArticleGrid';
import { CategoryNav } from './CategoryNav';
import { HelpWidget } from './HelpWidget';
import { VideoLibrary } from './VideoLibrary';

export function KnowledgeBasePortal() {
  const { user } = useUser();
  const [activeCategory, setActiveCategory] = useState<KBCategory>('getting_started');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const {
    articles,
    featuredArticles,
    popularArticles,
    categories,
    isLoading
  } = useKnowledgeBase({
    category: activeCategory,
    userType: user.userType,
    vendorType: user.vendorType
  });

  // Track page visit
  useEffect(() => {
    useAnalytics.trackPageView('knowledge_base', {
      category: activeCategory,
      userType: user.userType,
      vendorType: user.vendorType
    });
  }, [activeCategory]);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    const results = await knowledgeApi.search(query, {
      userContext: {
        userType: user.userType,
        vendorType: user.vendorType,
        experienceLevel: user.experienceLevel
      },
      includeVideos: true,
      semanticSearch: true
    });

    setSearchResults(results);
    setSearchQuery(query);

    // Track search
    useAnalytics.trackSearch(query, {
      resultsCount: results.totalResults,
      hasQuickAnswer: !!results.quickAnswer
    });
  };

  return (
    <div className="knowledge-base-portal">
      {/* Header with intelligent search */}
      <div className="kb-header bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">
              Help Center
            </h1>
            <p className="text-xl opacity-90">
              Get answers instantly with our AI-powered search
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <SearchBar
              onSearch={handleSearch}
              placeholder={`Search for help with ${user.vendorType || 'wedding planning'}...`}
              userType={user.userType}
              vendorType={user.vendorType}
            />
          </div>

          {/* Quick access buttons */}
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {[
              'Getting Started',
              'Setting up Forms',
              'Client Communication',
              'Billing Questions',
              'Troubleshooting'
            ].map(topic => (
              <button
                key={topic}
                onClick={() => handleSearch(topic)}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-full text-sm font-medium transition-colors"
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search results or main content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {searchResults ? (
          <SearchResultsSection
            results={searchResults}
            query={searchQuery}
            onClearSearch={() => {
              setSearchResults(null);
              setSearchQuery('');
            }}
          />
        ) : (
          <>
            {/* Featured articles */}
            {featuredArticles.length > 0 && (
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Featured Articles
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featuredArticles.map(article => (
                    <FeaturedArticleCard
                      key={article.id}
                      article={article}
                      userType={user.userType}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Category navigation */}
            <div className="flex flex-col lg:flex-row gap-8">
              <aside className="lg:w-64 flex-shrink-0">
                <CategoryNav
                  categories={categories}
                  activeCategory={activeCategory}
                  onCategoryChange={setActiveCategory}
                  userType={user.userType}
                />

                {/* Popular articles sidebar */}
                <div className="mt-8">
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Popular This Week
                  </h3>
                  <div className="space-y-3">
                    {popularArticles.slice(0, 5).map(article => (
                      <PopularArticleItem
                        key={article.id}
                        article={article}
                      />
                    ))}
                  </div>
                </div>
              </aside>

              {/* Main content area */}
              <main className="flex-1">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {categories.find(c => c.id === activeCategory)?.name}
                  </h2>
                  <div className="flex items-center gap-4">
                    <ViewModeToggle
                      mode={viewMode}
                      onChange={setViewMode}
                    />
                    <SortDropdown />
                  </div>
                </div>

                {isLoading ? (
                  <ArticleGridSkeleton />
                ) : (
                  <ArticleGrid
                    articles={articles}
                    viewMode={viewMode}
                    userType={user.userType}
                    onArticleView={(articleId) => {
                      useAnalytics.trackArticleClick(articleId, {
                        category: activeCategory,
                        source: 'category_browse'
                      });
                    }}
                  />
                )}
              </main>
            </div>
          </>
        )}
      </div>

      {/* Floating help widget */}
      <HelpWidget />
    </div>
  );
}

// Intelligent search bar with autocomplete and context
export function SearchBar({
  onSearch,
  placeholder,
  userType,
  vendorType
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Debounced search suggestions
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const debounced = debounce(async () => {
      const suggestions = await knowledgeApi.getSuggestions(query, {
        userType,
        vendorType,
        limit: 8
      });
      setSuggestions(suggestions);
    }, 300);

    debounced();
  }, [query, userType, vendorType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    onSearch(suggestion.text);
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center bg-white rounded-lg shadow-lg">
          <Search className="w-5 h-5 text-gray-400 ml-4" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            placeholder={placeholder}
            className="flex-1 px-4 py-4 text-lg border-none outline-none rounded-lg"
          />
          {isLoading && (
            <Loader className="w-5 h-5 text-gray-400 mr-4 animate-spin" />
          )}
          <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-4 rounded-r-lg font-medium transition-colors"
          >
            Search
          </button>
        </div>
      </form>

      {/* Search suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border z-50">
          <div className="py-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between group"
              >
                <span className="text-gray-900">{suggestion.text}</span>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {suggestion.category && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {suggestion.category}
                    </span>
                  )}
                  <ArrowUpRight className="w-4 h-4 text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### Search Results Interface

```tsx
// Advanced search results with AI-powered insights
// components/knowledge-base/SearchResultsSection.tsx
export function SearchResultsSection({
  results,
  query,
  onClearSearch
}: SearchResultsSectionProps) {
  const { trackSearchResult } = useAnalytics();

  const handleResultClick = (article: KBArticle, position: number) => {
    trackSearchResult(query, article.id, position);
  };

  return (
    <div className="search-results-section">
      {/* Search summary */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Search Results for "{query}"
          </h2>
          <p className="text-gray-600">
            Found {results.totalResults} results in {results.searchTime}ms
          </p>
        </div>
        <button
          onClick={onClearSearch}
          className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
        >
          <X className="w-4 h-4" />
          Clear Search
        </button>
      </div>

      {/* Quick answer if available */}
      {results.quickAnswer && (
        <div className="quick-answer-card bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-400 p-6 mb-8 rounded-r-lg">
          <div className="flex items-start gap-3">
            <div className="bg-green-100 p-2 rounded-full">
              <Zap className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 mb-2">
                Quick Answer
              </h3>
              <p className="text-green-800 mb-4">
                {results.quickAnswer.text}
              </p>
              {results.quickAnswer.steps && (
                <ol className="list-decimal list-inside space-y-1 text-sm text-green-700 mb-4">
                  {results.quickAnswer.steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              )}
              {results.quickAnswer.link && (
                <a
                  href={results.quickAnswer.link}
                  className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 font-medium text-sm"
                >
                  Read full article <ArrowRight className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Did you mean suggestion */}
      {results.didYouMean && (
        <div className="did-you-mean mb-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-blue-800">
            Did you mean: 
            <button
              onClick={() => onSearch(results.didYouMean!)}
              className="ml-2 font-medium text-blue-600 hover:text-blue-700 underline"
            >
              {results.didYouMean}
            </button>
            ?
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main results */}
        <div className="lg:col-span-2">
          <div className="space-y-6">
            {results.articles.map((article, index) => (
              <SearchResultCard
                key={article.id}
                article={article}
                query={query}
                position={index}
                onClick={() => handleResultClick(article, index)}
              />
            ))}

            {/* Video results */}
            {results.videos && results.videos.length > 0 && (
              <section className="video-results">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Video Tutorials
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {results.videos.map(video => (
                    <VideoResultCard
                      key={video.id}
                      video={video}
                      query={query}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* No results */}
            {results.articles.length === 0 && (
              <NoResultsSection
                query={query}
                suggestions={results.suggestions}
                onSuggestionClick={onSearch}
              />
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          {/* Related searches */}
          {results.relatedSearches.length > 0 && (
            <div className="mb-8">
              <h3 className="font-semibold text-gray-900 mb-4">
                Related Searches
              </h3>
              <div className="space-y-2">
                {results.relatedSearches.map(searchTerm => (
                  <button
                    key={searchTerm}
                    onClick={() => onSearch(searchTerm)}
                    className="block w-full text-left px-3 py-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg text-sm transition-colors"
                  >
                    {searchTerm}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search filters */}
          <SearchFilters
            currentFilters={results.appliedFilters}
            onFiltersChange={handleFiltersChange}
          />

          {/* Popular articles */}
          <PopularArticlesSidebar />
        </div>
      </div>
    </div>
  );
}

// Individual search result with highlighting
export function SearchResultCard({
  article,
  query,
  position,
  onClick
}: SearchResultCardProps) {
  const handleClick = () => {
    onClick();
    // Navigate to article
    window.open(`/help/${article.category}/${article.slug}`, '_blank');
  };

  return (
    <div className="search-result-card bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
         onClick={handleClick}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <ArticleTypeIcon type={article.type} />
          <div className="flex items-center gap-2">
            <CategoryBadge category={article.category} />
            <DifficultyBadge difficulty={article.difficulty} />
          </div>
        </div>
        <div className="text-sm text-gray-500">
          {article.readTime} min read
        </div>
      </div>

      <h3 className="text-xl font-semibold text-gray-900 mb-2 hover:text-purple-600">
        <HighlightedText text={article.title} highlight={query} />
      </h3>

      <p className="text-gray-700 mb-4">
        <HighlightedText 
          text={article.excerpt || article.summary} 
          highlight={query} 
          maxLength={200}
        />
      </p>

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            {article.viewCount} views
          </div>
          <div className="flex items-center gap-1">
            <ThumbsUp className="w-4 h-4" />
            {Math.round((article.helpfulVotes / (article.helpfulVotes + article.unhelpfulVotes)) * 100)}% helpful
          </div>
        </div>

        <div className="flex items-center gap-1 text-purple-600">
          Read article
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
```

### Context-Aware Help Widget

```tsx
// Intelligent floating help widget with proactive assistance
// components/knowledge-base/HelpWidget.tsx
export function HelpWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<HelpMode>('contextual');
  const [contextualSuggestions, setContextualSuggestions] = useState<Article[]>([]);
  const { user } = useUser();
  const { currentPage, userBehavior } = useContext();

  // Proactive help detection
  useEffect(() => {
    const detectHelpNeed = () => {
      // Time spent on page without action
      if (userBehavior.timeOnPage > 30000 && !userBehavior.hasInteracted) {
        showContextualHelp();
      }

      // Multiple failed form submissions
      if (userBehavior.failedSubmissions > 2) {
        showContextualHelp('form_help');
      }

      // Stuck in workflow
      if (userBehavior.backAndForthClicks > 3) {
        showContextualHelp('navigation_help');
      }
    };

    const timer = setInterval(detectHelpNeed, 10000);
    return () => clearInterval(timer);
  }, [userBehavior]);

  // Get contextual suggestions based on current page
  useEffect(() => {
    if (currentPage) {
      getContextualHelp(currentPage, user.vendorType).then(setSuggestions);
    }
  }, [currentPage, user.vendorType]);

  const showContextualHelp = (type?: string) => {
    setMode('contextual');
    setIsOpen(true);
    
    // Track proactive help trigger
    analytics.track('proactive_help_shown', {
      trigger: type || 'time_based',
      page: currentPage,
      userBehavior
    });
  };

  return (
    <>
      {/* Floating help button with notification */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="help-widget-trigger fixed bottom-6 right-6 bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-full shadow-lg z-50 transition-colors"
            onClick={() => setIsOpen(true)}
          >
            <HelpCircle className="w-6 h-6" />
            {contextualSuggestions.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {contextualSuggestions.length}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Help panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            className="help-widget-panel fixed bottom-6 right-6 w-96 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 max-h-[80vh] overflow-hidden"
          >
            {/* Header */}
            <div className="help-panel-header bg-purple-600 text-white p-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">
                  {mode === 'contextual' ? 'Helpful Resources' : 'Search Help'}
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:bg-white/20 p-1 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mode toggle */}
              <div className="flex gap-2 mt-3">
                <button
                  className={`px-3 py-1 rounded text-sm ${
                    mode === 'contextual' 
                      ? 'bg-white/20 text-white' 
                      : 'text-white/70 hover:bg-white/10'
                  }`}
                  onClick={() => setMode('contextual')}
                >
                  For This Page
                </button>
                <button
                  className={`px-3 py-1 rounded text-sm ${
                    mode === 'search' 
                      ? 'bg-white/20 text-white' 
                      : 'text-white/70 hover:bg-white/10'
                  }`}
                  onClick={() => setMode('search')}
                >
                  Search All
                </button>
                <button
                  className={`px-3 py-1 rounded text-sm ${
                    mode === 'contact' 
                      ? 'bg-white/20 text-white' 
                      : 'text-white/70 hover:bg-white/10'
                  }`}
                  onClick={() => setMode('contact')}
                >
                  Contact Us
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="help-panel-content p-4 max-h-96 overflow-y-auto">
              {mode === 'contextual' && (
                <ContextualHelpMode
                  suggestions={contextualSuggestions}
                  currentPage={currentPage}
                  userBehavior={userBehavior}
                />
              )}

              {mode === 'search' && (
                <SearchHelpMode />
              )}

              {mode === 'contact' && (
                <ContactHelpMode />
              )}
            </div>

            {/* Footer with satisfaction rating */}
            <div className="help-panel-footer border-t bg-gray-50 p-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Was this helpful?</span>
                <div className="flex gap-1">
                  <button className="p-1 hover:bg-gray-200 rounded">
                    <ThumbsUp className="w-4 h-4 text-gray-500" />
                  </button>
                  <button className="p-1 hover:bg-gray-200 rounded">
                    <ThumbsDown className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Contextual help based on current page and user behavior
function ContextualHelpMode({
  suggestions,
  currentPage,
  userBehavior
}: ContextualHelpModeProps) {
  return (
    <div className="contextual-help space-y-4">
      {/* Current page help */}
      <div className="current-page-help">
        <h4 className="font-medium text-gray-900 mb-3">
          Help for {getPageTitle(currentPage)}
        </h4>

        {suggestions.length > 0 ? (
          <div className="space-y-3">
            {suggestions.map(article => (
              <div
                key={article.id}
                className="help-suggestion p-3 bg-purple-50 rounded-lg hover:bg-purple-100 cursor-pointer transition-colors"
                onClick={() => openArticle(article)}
              >
                <div className="flex items-start gap-3">
                  <ArticleTypeIcon type={article.type} size="sm" />
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900 text-sm mb-1">
                      {article.title}
                    </h5>
                    <p className="text-gray-600 text-xs">
                      {article.excerpt}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <span>{article.readTime} min</span>
                      <span>•</span>
                      <span>{article.difficulty}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <BookOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">
              No specific help found for this page.
            </p>
            <button
              onClick={() => setMode('search')}
              className="text-purple-600 text-sm font-medium mt-1 hover:underline"
            >
              Search all articles
            </button>
          </div>
        )}
      </div>

      {/* Behavioral insights */}
      {userBehavior.needsHelp && (
        <div className="behavior-help border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-3">
            It looks like you might need help with:
          </h4>

          <div className="space-y-2">
            {userBehavior.suggestedActions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleSuggestedAction(action)}
                className="w-full text-left p-2 bg-yellow-50 hover:bg-yellow-100 rounded text-sm transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-600" />
                  <span className="text-gray-700">{action.title}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="quick-actions border-t pt-4">
        <h4 className="font-medium text-gray-900 mb-3">
          Quick Actions
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <button className="p-2 bg-gray-50 hover:bg-gray-100 rounded text-xs text-gray-700 transition-colors">
            <Video className="w-4 h-4 mb-1 mx-auto" />
            Watch Tutorial
          </button>
          <button className="p-2 bg-gray-50 hover:bg-gray-100 rounded text-xs text-gray-700 transition-colors">
            <MessageSquare className="w-4 h-4 mb-1 mx-auto" />
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}
```

## Business Logic Implementation

### AI-Powered Content Intelligence

```typescript
// Advanced AI content generation and optimization
// lib/knowledge-base/aiContentIntelligence.ts
export class AIContentIntelligence {
  private readonly openai: OpenAIApi;
  private readonly embeddings: EmbeddingService;
  private readonly analytics: KnowledgeAnalytics;

  constructor() {
    this.openai = new OpenAIApi();
    this.embeddings = new EmbeddingService();
    this.analytics = new KnowledgeAnalytics();
  }

  async generateArticleFromSupportPatterns(
    tickets: SupportTicket[]
  ): Promise<GeneratedArticle> {
    // Analyze common patterns in support tickets
    const patterns = await this.analyzeTicketPatterns(tickets);
    
    // Generate comprehensive article content
    const article = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a technical writer specializing in wedding industry software documentation. 
                   Create comprehensive, helpful articles based on support ticket analysis.
                   Focus on clear step-by-step instructions and wedding vendor specific context.`
        },
        {
          role: 'user',
          content: `Based on these support ticket patterns, create a help article:
                   
                   Common Issue: ${patterns.primaryIssue}
                   Frequency: ${patterns.frequency} tickets in 30 days
                   User Types Affected: ${patterns.affectedUserTypes.join(', ')}
                   Common Questions: ${patterns.commonQuestions.join(', ')}
                   Current Solutions: ${patterns.solutions.join(', ')}
                   
                   Create a comprehensive article with:
                   1. Clear title
                   2. Problem description from user perspective
                   3. Step-by-step solution
                   4. Screenshots placeholders
                   5. Wedding industry specific examples
                   6. Common pitfalls to avoid
                   7. Related topics`
        }
      ],
      temperature: 0.3
    });

    const generatedContent = article.choices[0].message.content;
    
    return {
      title: this.extractTitle(generatedContent),
      content: generatedContent,
      category: await this.determineCategory(patterns),
      difficulty: this.assessDifficulty(patterns),
      keywords: await this.extractKeywords(generatedContent),
      estimatedReadTime: this.calculateReadTime(generatedContent),
      confidence: this.calculateConfidence(patterns),
      sourceTickets: tickets.map(t => t.id),
      suggestedImprovements: await this.generateImprovementSuggestions(patterns)
    };
  }

  async optimizeExistingArticle(
    article: KBArticle,
    performanceData: ArticlePerformance
  ): Promise<ArticleOptimization> {
    // Analyze current performance issues
    const issues = this.identifyPerformanceIssues(performanceData);
    
    // Get user feedback analysis
    const feedbackInsights = await this.analyzeFeedback(article.id);
    
    // Generate optimization suggestions
    const optimization = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an expert content optimizer for wedding industry software documentation.
                   Analyze article performance and suggest specific improvements.`
        },
        {
          role: 'user',
          content: `Optimize this article based on performance data:
                   
                   Article: ${article.title}
                   Current Performance:
                   - Helpfulness: ${performanceData.helpfulnessRatio * 100}%
                   - Avg Time on Page: ${performanceData.avgTimeOnPage}s
                   - Bounce Rate: ${performanceData.bounceRate * 100}%
                   - Completion Rate: ${performanceData.completionRate * 100}%
                   
                   Issues Identified: ${issues.join(', ')}
                   User Feedback: ${feedbackInsights.summary}
                   
                   Provide specific suggestions for:
                   1. Content clarity improvements
                   2. Structure optimization
                   3. Missing information
                   4. Better examples
                   5. SEO enhancements`
        }
      ],
      temperature: 0.2
    });

    return {
      currentPerformance: performanceData,
      identifiedIssues: issues,
      suggestions: this.parseOptimizationSuggestions(optimization.choices[0].message.content),
      estimatedImprovement: this.calculateExpectedImprovement(issues),
      implementationPriority: this.prioritizeSuggestions(issues)
    };
  }

  async generateInteractiveWalkthrough(
    feature: string,
    userType: UserType,
    vendorType?: VendorType
  ): Promise<InteractiveWalkthrough> {
    // Generate step-by-step interactive tutorial
    const walkthrough = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `Create interactive step-by-step walkthroughs for wedding vendors using WedSync.
                   Include specific selectors, expected outcomes, and wedding industry context.`
        },
        {
          role: 'user',
          content: `Create an interactive walkthrough for "${feature}" for ${userType} ${vendorType ? `(${vendorType})` : ''}
                   
                   Include:
                   1. Prerequisites check
                   2. Step-by-step instructions with UI selectors
                   3. Expected results for each step
                   4. Wedding industry specific examples
                   5. Common mistakes and how to avoid them
                   6. Success criteria
                   7. Next steps after completion`
        }
      ],
      temperature: 0.3
    });

    const steps = this.parseWalkthroughSteps(walkthrough.choices[0].message.content);

    return {
      title: `How to ${feature}`,
      description: `Interactive guide for ${userType}s to ${feature}`,
      estimatedTime: this.calculateWalkthroughTime(steps),
      prerequisites: this.extractPrerequisites(steps),
      steps: steps.map((step, index) => ({
        id: `step-${index + 1}`,
        title: step.title,
        description: step.description,
        action: step.action,
        selector: step.selector,
        expectedResult: step.expectedResult,
        screenshot: step.screenshotPlaceholder,
        tips: step.tips,
        commonMistakes: step.commonMistakes
      })),
      successCriteria: this.extractSuccessCriteria(steps),
      nextSteps: this.suggestNextSteps(feature, userType, vendorType)
    };
  }

  private async analyzeTicketPatterns(tickets: SupportTicket[]): Promise<SupportPatterns> {
    // Use AI to identify patterns in support tickets
    const analysis = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Analyze support tickets to identify common patterns, issues, and solutions.'
        },
        {
          role: 'user',
          content: `Analyze these support tickets and identify patterns:
                   ${tickets.map(t => `Subject: ${t.subject}\nDescription: ${t.description}\nResolution: ${t.resolution}`).join('\n\n')}`
        }
      ],
      temperature: 0.1
    });

    return this.parsePatternAnalysis(analysis.choices[0].message.content);
  }

  private identifyPerformanceIssues(performance: ArticlePerformance): string[] {
    const issues: string[] = [];

    if (performance.helpfulnessRatio < 0.7) {
      issues.push('Low helpfulness rating');
    }

    if (performance.avgTimeOnPage < 60) {
      issues.push('Users leaving too quickly');
    }

    if (performance.bounceRate > 0.6) {
      issues.push('High bounce rate');
    }

    if (performance.completionRate < 0.5) {
      issues.push('Low completion rate for tutorials');
    }

    if (performance.searchRanking > 5) {
      issues.push('Poor search visibility');
    }

    return issues;
  }

  async generateQuickAnswer(query: string): Promise<QuickAnswer | null> {
    // Generate instant answers for common questions
    const answer = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant for WedSync, a wedding coordination platform.
                   Provide brief, accurate answers to user questions.
                   If you cannot answer confidently, return "CANNOT_ANSWER".`
        },
        {
          role: 'user',
          content: `Question: ${query}
                   
                   Provide a brief answer (2-3 sentences max) or return "CANNOT_ANSWER" if uncertain.`
        }
      ],
      temperature: 0.1
    });

    const response = answer.choices[0].message.content.trim();

    if (response === 'CANNOT_ANSWER') {
      return null;
    }

    // Find related article if available
    const relatedArticle = await this.findMostRelevantArticle(query);

    return {
      text: response,
      confidence: 0.8,
      source: 'ai_generated',
      relatedArticle: relatedArticle?.id,
      link: relatedArticle ? `/help/${relatedArticle.category}/${relatedArticle.slug}` : undefined
    };
  }

  private async findMostRelevantArticle(query: string): Promise<KBArticle | null> {
    // Use semantic search to find most relevant article
    const queryEmbedding = await this.embeddings.generateEmbedding(query);
    
    const results = await this.db.query(`
      SELECT a.*, (a.embedding_vector <=> $1) as distance
      FROM kb_articles a
      WHERE a.status = 'published'
      ORDER BY distance
      LIMIT 1
    `, [queryEmbedding]);

    return results.length > 0 && results[0].distance < 0.3 ? results[0] : null;
  }
}

// Advanced search with multiple ranking signals
export class IntelligentSearchEngine {
  private readonly elasticsearch: ElasticsearchClient;
  private readonly ml: MLService;

  async performSearch(
    query: string,
    userContext: UserContext,
    options: SearchOptions = {}
  ): Promise<SearchResults> {
    // Multi-stage search approach
    const [
      keywordResults,
      semanticResults,
      popularityResults
    ] = await Promise.all([
      this.keywordSearch(query, userContext, options),
      this.semanticSearch(query, userContext, options),
      this.popularityBasedSearch(query, userContext, options)
    ]);

    // Combine and re-rank results using ML model
    const combinedResults = this.combineSearchResults([
      { results: keywordResults, weight: 0.4 },
      { results: semanticResults, weight: 0.4 },
      { results: popularityResults, weight: 0.2 }
    ]);

    // Apply user-specific boosting
    const boostedResults = this.applyUserContextBoosting(
      combinedResults,
      userContext
    );

    // Generate quick answer if appropriate
    const quickAnswer = await this.generateQuickAnswer(query, boostedResults);

    // Get related searches and suggestions
    const [relatedSearches, suggestions] = await Promise.all([
      this.getRelatedSearches(query, userContext),
      this.getSearchSuggestions(query, userContext)
    ]);

    return {
      articles: boostedResults,
      quickAnswer,
      relatedSearches,
      suggestions,
      totalResults: boostedResults.length,
      searchTime: performance.now() - searchStartTime,
      appliedFilters: options.filters || {},
      didYouMean: await this.getSpellingSuggestion(query)
    };
  }

  private async keywordSearch(
    query: string,
    userContext: UserContext,
    options: SearchOptions
  ): Promise<SearchResult[]> {
    const searchQuery = {
      multi_match: {
        query: query,
        fields: [
          'title^3',
          'summary^2',
          'content^1',
          'keywords^2',
          'search_terms^2'
        ],
        type: 'best_fields',
        fuzziness: 'AUTO'
      }
    };

    // Add filters
    const filters = this.buildSearchFilters(userContext, options);

    const results = await this.elasticsearch.search({
      index: 'kb_articles',
      body: {
        query: {
          bool: {
            must: [searchQuery],
            filter: filters
          }
        },
        highlight: {
          fields: {
            title: {},
            content: { fragment_size: 150, number_of_fragments: 2 }
          }
        },
        size: options.limit || 10
      }
    });

    return results.hits.hits.map(hit => this.transformSearchHit(hit));
  }

  private async semanticSearch(
    query: string,
    userContext: UserContext,
    options: SearchOptions
  ): Promise<SearchResult[]> {
    // Generate embedding for query
    const queryEmbedding = await this.embeddings.generateEmbedding(query);

    // Vector similarity search
    const results = await this.db.query(`
      SELECT 
        a.*,
        (a.embedding_vector <=> $1) as similarity_distance,
        ts_rank(a.search_document, plainto_tsquery($2)) as text_rank
      FROM kb_articles a
      WHERE a.status = 'published'
        AND (a.embedding_vector <=> $1) < 0.5
        ${this.buildSQLFilters(userContext, options)}
      ORDER BY similarity_distance ASC, text_rank DESC
      LIMIT $3
    `, [queryEmbedding, query, options.limit || 10]);

    return results.map(row => this.transformDBResult(row));
  }

  private applyUserContextBoosting(
    results: SearchResult[],
    userContext: UserContext
  ): SearchResult[] {
    return results.map(result => {
      let boostScore = 1.0;

      // Boost based on user type relevance
      if (result.article.vendorFocus?.includes(userContext.vendorType)) {
        boostScore *= 1.3;
      }

      // Boost based on difficulty match
      if (this.matchesDifficultyLevel(result.article.difficulty, userContext.experienceLevel)) {
        boostScore *= 1.2;
      }

      // Boost recently updated content
      const daysSinceUpdate = (Date.now() - result.article.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate < 30) {
        boostScore *= 1.1;
      }

      // Boost high-performing content
      if (result.article.helpfulnessRatio > 0.8) {
        boostScore *= 1.15;
      }

      // Apply wedding season relevance
      if (this.isWeddingSeason() && result.article.peakSeasonPriority) {
        boostScore *= 1.25;
      }

      return {
        ...result,
        boostScore,
        finalScore: result.relevanceScore * boostScore
      };
    }).sort((a, b) => b.finalScore - a.finalScore);
  }
}
```

## Integration Points

### MCP Server Integration

```typescript
// Integration with Context7 for up-to-date documentation
export async function enhanceArticlesWithLatestDocs(): Promise<void> {
  const context7 = getMCPServer('context7');
  
  // Get all technical articles that might need updates
  const technicalArticles = await db.query(`
    SELECT id, title, content, keywords
    FROM kb_articles 
    WHERE category IN ('integrations', 'api_docs', 'advanced_features')
    AND status = 'published'
    AND last_reviewed_at < NOW() - INTERVAL '30 days'
  `);

  for (const article of technicalArticles) {
    try {
      // Identify relevant libraries from article content
      const libraries = extractLibraryReferences(article.content);
      
      for (const lib of libraries) {
        // Get latest documentation
        const libraryId = await context7.resolveLibraryId(lib);
        const latestDocs = await context7.getLibraryDocs(libraryId, {
          tokens: 5000
        });

        // Check if article needs updates
        const needsUpdate = await checkForDocumentationChanges(
          article.content,
          latestDocs
        );

        if (needsUpdate) {
          await flagArticleForReview(article.id, {
            reason: 'library_documentation_updated',
            library: lib,
            suggestedChanges: generateUpdateSuggestions(article, latestDocs)
          });
        }
      }
    } catch (error) {
      console.error(`Failed to update article ${article.id}:`, error);
    }
  }
}

// Integration with Supabase for real-time analytics
export function setupRealTimeAnalytics(): void {
  const supabase = getMCPServer('supabase');
  
  // Listen for article views
  supabase
    .channel('kb_article_sessions')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'kb_article_sessions'
    }, (payload) => {
      // Update real-time analytics dashboard
      updateAnalyticsDashboard(payload.new);
      
      // Check for proactive help opportunities
      checkForProactiveHelp(payload.new);
    })
    .subscribe();

  // Listen for search queries
  supabase
    .channel('kb_searches')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'kb_searches'
    }, (payload) => {
      // Update search analytics
      updateSearchAnalytics(payload.new);
      
      // Identify content gaps in real-time
      if (!payload.new.has_results) {
        identifyContentGap(payload.new.query);
      }
    })
    .subscribe();
}

// Integration with PostgreSQL MCP for advanced analytics
export async function generateKnowledgeBaseInsights(): Promise<KBInsights> {
  const postgres = getMCPServer('postgres');
  
  const insights = await postgres.query(`
    WITH article_performance AS (
      SELECT 
        a.id,
        a.title,
        a.category,
        a.view_count,
        a.helpful_votes,
        a.unhelpful_votes,
        COALESCE(a.helpful_votes::float / NULLIF(a.helpful_votes + a.unhelpful_votes, 0), 0) as helpfulness_ratio,
        
        -- Recent engagement (last 30 days)
        (
          SELECT COUNT(*)
          FROM kb_article_sessions kas
          WHERE kas.article_id = a.id
          AND kas.started_at >= NOW() - INTERVAL '30 days'
        ) as recent_views,
        
        -- Estimated ticket deflection
        (
          SELECT COUNT(*)
          FROM support_tickets st
          WHERE st.created_at >= a.published_at
          AND st.subject ILIKE '%' || ANY(a.keywords) || '%'
          AND st.resolution_time < INTERVAL '5 minutes'
        ) as estimated_deflections
        
      FROM kb_articles a
      WHERE a.status = 'published'
    ),
    search_gaps AS (
      SELECT 
        s.normalized_query,
        COUNT(*) as search_count,
        AVG(s.results_count) as avg_results,
        COUNT(*) FILTER (WHERE s.results_count = 0) as no_results_count
      FROM kb_searches s
      WHERE s.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY s.normalized_query
      HAVING COUNT(*) >= 5 AND AVG(s.results_count) < 2
      ORDER BY search_count DESC
    )
    SELECT 
      json_build_object(
        'top_performing', (
          SELECT json_agg(
            json_build_object(
              'id', id,
              'title', title,
              'category', category,
              'helpfulness_ratio', helpfulness_ratio,
              'estimated_deflections', estimated_deflections
            )
          )
          FROM article_performance
          ORDER BY helpfulness_ratio DESC, estimated_deflections DESC
          LIMIT 10
        ),
        'needs_improvement', (
          SELECT json_agg(
            json_build_object(
              'id', id,
              'title', title,
              'category', category,
              'helpfulness_ratio', helpfulness_ratio,
              'recent_views', recent_views
            )
          )
          FROM article_performance
          WHERE helpfulness_ratio < 0.6 AND recent_views > 0
          ORDER BY helpfulness_ratio ASC
          LIMIT 10
        ),
        'content_gaps', (
          SELECT json_agg(
            json_build_object(
              'query', normalized_query,
              'search_count', search_count,
              'avg_results', avg_results
            )
          )
          FROM search_gaps
          LIMIT 20
        )
      ) as insights;
  `);

  return insights[0].insights;
}
```

## Testing Strategy

### E2E Test Scenarios

```typescript
// tests/e2e/knowledge-base.spec.ts
describe('Knowledge Base System - Wedding Industry Scenarios', () => {
  test('New photographer finds step-by-step form setup guide', async ({ page }) => {
    // Setup: New photographer user
    await loginAsSupplier(page, { 
      vendorType: 'photographer', 
      experienceLevel: 'beginner',
      joinedRecently: true 
    });

    // Navigate to knowledge base
    await page.goto('/help');

    // Search for form setup help
    await page.fill('[data-testid="help-search-input"]', 'create client questionnaire');
    await page.press('[data-testid="help-search-input"]', 'Enter');

    // Verify contextual results for photographers
    const results = page.locator('[data-testid="search-result"]');
    await expect(results.first()).toContainText('photographer');
    await expect(results.first()).toContainText('beginner');

    // Click on the most relevant result
    await results.first().click();

    // Verify article opens with proper context
    await expect(page.locator('[data-testid="article-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="difficulty-badge"]')).toContainText('Beginner');
    await expect(page.locator('[data-testid="vendor-context"]')).toContainText('photographer');

    // Test step-by-step tutorial completion
    const tutorialSteps = page.locator('[data-testid="tutorial-step"]');
    const stepCount = await tutorialSteps.count();

    for (let i = 0; i < stepCount; i++) {
      await tutorialSteps.nth(i).locator('[data-testid="complete-step"]').click();
      
      // Verify step completion tracking
      await expect(tutorialSteps.nth(i)).toHaveClass(/completed/);
    }

    // Verify tutorial completion tracking
    await expect(page.locator('[data-testid="tutorial-completed"]')).toBeVisible();

    // Check that completion is tracked in analytics
    const completionEvent = await page.evaluate(() => 
      window.analytics.getEvents().find(e => e.event === 'tutorial_completed')
    );
    expect(completionEvent).toBeTruthy();
    expect(completionEvent.properties.articleId).toBeDefined();
    expect(completionEvent.properties.completionTime).toBeGreaterThan(0);
  });

  test('Contextual help widget provides proactive assistance', async ({ page }) => {
    // Setup: User struggling with form creation
    await loginAsSupplier(page, { vendorType: 'planner', experienceLevel: 'intermediate' });
    await page.goto('/forms/create');

    // Simulate user struggling behavior
    await page.click('[data-testid="form-title-input"]');
    await page.fill('[data-testid="form-title-input"]', 'Test');
    await page.click('[data-testid="form-title-input"]', { clickCount: 3 });
    await page.keyboard.press('Delete');
    await page.fill('[data-testid="form-title-input"]', 'Wedding');
    await page.click('[data-testid="form-title-input"]', { clickCount: 3 });
    await page.keyboard.press('Delete');
    
    // Wait for proactive help to appear
    await expect(page.locator('[data-testid="proactive-help-notification"]')).toBeVisible({ timeout: 35000 });

    // Click on the help notification
    await page.click('[data-testid="proactive-help-notification"]');

    // Verify contextual help appears
    await expect(page.locator('[data-testid="help-widget"]')).toBeVisible();
    await expect(page.locator('[data-testid="contextual-help-mode"]')).toBeVisible();

    // Verify relevant suggestions appear
    const suggestions = page.locator('[data-testid="help-suggestion"]');
    await expect(suggestions.first()).toContainText('form');
    await expect(suggestions.first()).toContainText('planner');

    // Click on a suggestion and verify it helps
    await suggestions.first().click();
    await expect(page.locator('[data-testid="article-modal"]')).toBeVisible();

    // Rate the help as useful
    await page.click('[data-testid="helpful-button"]');

    // Verify feedback tracking
    await expect(page.locator('[data-testid="feedback-thanks"]')).toBeVisible();
  });

  test('AI-generated quick answers for common questions', async ({ page }) => {
    await page.goto('/help');

    // Test pricing question
    await page.fill('[data-testid="help-search-input"]', 'How much does the professional plan cost?');
    await page.press('[data-testid="help-search-input"]', 'Enter');

    // Verify quick answer appears
    await expect(page.locator('[data-testid="quick-answer"]')).toBeVisible();
    await expect(page.locator('[data-testid="quick-answer-text"]')).toContainText(/\$\d+/);

    // Test technical question
    await page.fill('[data-testid="help-search-input"]', 'How do I integrate with Zapier?');
    await page.press('[data-testid="help-search-input"]', 'Enter');

    // Verify detailed answer with steps
    await expect(page.locator('[data-testid="quick-answer"]')).toBeVisible();
    await expect(page.locator('[data-testid="quick-answer-steps"]')).toBeVisible();

    // Test follow-up article link
    const learnMoreLink = page.locator('[data-testid="quick-answer-learn-more"]');
    if (await learnMoreLink.isVisible()) {
      await learnMoreLink.click();
      await expect(page.locator('[data-testid="article-title"]')).toBeVisible();
    }

    // Test wedding-specific question
    await page.fill('[data-testid="help-search-input"]', 'How do I set up guest RSVP forms?');
    await page.press('[data-testid="help-search-input"]', 'Enter');

    // Verify wedding context in answer
    await expect(page.locator('[data-testid="quick-answer"]')).toContainText(/wedding|guest|RSVP/i);
  });

  test('Search analytics and content gap identification', async ({ page }) => {
    // Simulate multiple failed searches
    await page.goto('/help');

    const failedQueries = [
      'how to export wedding timeline to PDF',
      'timeline PDF export',
      'save timeline as PDF',
      'print wedding timeline'
    ];

    for (const query of failedQueries) {
      await page.fill('[data-testid="help-search-input"]', query);
      await page.press('[data-testid="help-search-input"]', 'Enter');
      
      // Verify no results (simulating content gap)
      await expect(page.locator('[data-testid="no-results"]')).toBeVisible();
      await page.goBack();
      await page.waitForLoadState('networkidle');
    }

    // Login as admin to check analytics
    await loginAsAdmin(page);
    await page.goto('/admin/knowledge-base/analytics');

    // Verify failed searches are tracked
    await expect(page.locator('[data-testid="failed-searches-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="content-gap-timeline-pdf"]')).toBeVisible();

    // Check suggested article generation
    await expect(page.locator('[data-testid="suggested-article-generation"]')).toBeVisible();
    await page.click('[data-testid="generate-article-timeline-pdf"]');

    // Verify AI article generation interface
    await expect(page.locator('[data-testid="ai-article-generator"]')).toBeVisible();
    await expect(page.locator('[data-testid="generated-article-preview"]')).toContainText('PDF');
  });

  test('Video tutorial integration and completion tracking', async ({ page }) => {
    await loginAsSupplier(page, { vendorType: 'photographer' });
    await page.goto('/help');

    // Search for video tutorials
    await page.fill('[data-testid="help-search-input"]', 'photo gallery setup');
    await page.press('[data-testid="help-search-input"]', 'Enter');

    // Verify video results appear
    await expect(page.locator('[data-testid="video-results-section"]')).toBeVisible();
    const videoCard = page.locator('[data-testid="video-result-card"]').first();
    
    await expect(videoCard.locator('[data-testid="video-duration"]')).toBeVisible();
    await expect(videoCard.locator('[data-testid="video-transcript-available"]')).toBeVisible();

    // Click on video
    await videoCard.click();

    // Verify video player opens
    await expect(page.locator('[data-testid="video-player"]')).toBeVisible();
    await expect(page.locator('[data-testid="video-transcript"]')).toBeVisible();

    // Test video completion tracking
    await page.click('[data-testid="video-play-button"]');
    
    // Fast forward to end (simulating watching)
    await page.evaluate(() => {
      const video = document.querySelector('video');
      if (video) {
        video.currentTime = video.duration - 1;
      }
    });

    // Wait for completion event
    await page.waitForTimeout(2000);

    // Verify completion tracking
    const completionBadge = page.locator('[data-testid="video-completed-badge"]');
    await expect(completionBadge).toBeVisible();

    // Check related articles suggestion
    await expect(page.locator('[data-testid="related-articles-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="next-steps-section"]')).toBeVisible();
  });

  test('Seasonal content prioritization during peak wedding season', async ({ page }) => {
    // Mock current date as peak wedding season (May)
    await page.addInitScript(() => {
      const mockDate = new Date(2025, 4, 15); // May 15, 2025
      Date.now = () => mockDate.getTime();
      Date.prototype.getTime = () => mockDate.getTime();
    });

    await loginAsSupplier(page, { vendorType: 'photographer' });
    await page.goto('/help');

    // Verify peak season banner
    await expect(page.locator('[data-testid="peak-season-banner"]')).toBeVisible();
    await expect(page.locator('[data-testid="peak-season-banner"]'))
      .toContainText('Peak Wedding Season');

    // Verify seasonal articles are prioritized
    const featuredArticles = page.locator('[data-testid="featured-article"]');
    await expect(featuredArticles.first().locator('[data-testid="seasonal-priority-badge"]'))
      .toBeVisible();

    // Search for general help
    await page.fill('[data-testid="help-search-input"]', 'client communication');
    await page.press('[data-testid="help-search-input"]', 'Enter');

    // Verify seasonal content appears higher in results
    const firstResult = page.locator('[data-testid="search-result"]').first();
    await expect(firstResult.locator('[data-testid="seasonal-relevance-indicator"]'))
      .toBeVisible();

    // Check that wedding day critical content is boosted
    await page.fill('[data-testid="help-search-input"]', 'emergency timeline changes');
    await page.press('[data-testid="help-search-input"]', 'Enter');

    const emergencyResults = page.locator('[data-testid="search-result"]');
    await expect(emergencyResults.first().locator('[data-testid="wedding-day-critical-badge"]'))
      .toBeVisible();
  });
});
```

## Success Metrics & KPIs

### Knowledge Base Analytics Dashboard

```sql
-- Comprehensive knowledge base performance analytics
-- Wedding industry specific metrics

-- 1. Support Ticket Deflection Analysis
WITH ticket_deflection AS (
  SELECT 
    DATE_TRUNC('week', date) as week,
    
    -- Overall metrics
    SUM(total_searches) as total_searches,
    SUM(successful_searches) as successful_searches,
    SUM(article_views) as article_views,
    SUM(estimated_tickets_deflected) as deflected_tickets,
    SUM(estimated_cost_savings) as cost_savings,
    
    -- User engagement
    SUM(unique_searchers) as unique_users,
    AVG(avg_time_on_articles) as avg_engagement_time,
    AVG(avg_satisfaction_rating) as satisfaction_score,
    
    -- Seasonal patterns
    AVG(peak_season_multiplier) as seasonal_factor,
    
    -- Conversion metrics
    SUM(helpful_votes) as helpful_feedback,
    SUM(unhelpful_votes) as unhelpful_feedback,
    ROUND(
      SUM(helpful_votes)::FLOAT / NULLIF(SUM(helpful_votes + unhelpful_votes), 0) * 100, 2
    ) as helpfulness_percentage
    
  FROM kb_analytics_daily
  WHERE date >= NOW() - INTERVAL '12 weeks'
  GROUP BY week
)
SELECT 
  week,
  total_searches,
  successful_searches,
  ROUND(successful_searches::FLOAT / NULLIF(total_searches, 0) * 100, 2) as search_success_rate,
  article_views,
  deflected_tickets,
  cost_savings,
  unique_users,
  avg_engagement_time,
  satisfaction_score,
  seasonal_factor,
  helpfulness_percentage,
  
  -- Growth rates
  LAG(total_searches) OVER (ORDER BY week) as prev_week_searches,
  ROUND(
    (total_searches - LAG(total_searches) OVER (ORDER BY week))::FLOAT /
    NULLIF(LAG(total_searches) OVER (ORDER BY week), 0) * 100, 2
  ) as search_growth_rate
  
FROM ticket_deflection
ORDER BY week DESC;

-- 2. Content Performance by Wedding Industry Category
SELECT 
  a.category,
  a.vendor_focus,
  COUNT(*) as total_articles,
  COUNT(CASE WHEN a.status = 'published' THEN 1 END) as published_articles,
  
  -- Engagement metrics
  SUM(a.view_count) as total_views,
  AVG(a.avg_time_on_page) as avg_time_on_page,
  AVG(a.completion_rate) as avg_completion_rate,
  
  -- Quality metrics
  SUM(a.helpful_votes) as total_helpful_votes,
  SUM(a.unhelpful_votes) as total_unhelpful_votes,
  ROUND(
    SUM(a.helpful_votes)::FLOAT / NULLIF(SUM(a.helpful_votes + a.unhelpful_votes), 0) * 100, 2
  ) as helpfulness_ratio,
  
  -- Recent performance (last 30 days)
  (
    SELECT COUNT(*)
    FROM kb_article_sessions kas
    WHERE kas.article_id = ANY(ARRAY_AGG(a.id))
    AND kas.started_at >= NOW() - INTERVAL '30 days'
  ) as recent_views,
  
  -- Vendor specific metrics
  CASE 
    WHEN 'photographer' = ANY(a.vendor_focus) THEN 
      (SELECT AVG(completion_rate) FROM kb_articles WHERE 'photographer' = ANY(vendor_focus))
    ELSE NULL
  END as photographer_completion_rate
  
FROM kb_articles a
WHERE a.created_at >= NOW() - INTERVAL '6 months'
GROUP BY a.category, a.vendor_focus
ORDER BY total_views DESC, helpfulness_ratio DESC;

-- 3. Search Gap Analysis and Content Opportunities
WITH search_patterns AS (
  SELECT 
    s.normalized_query,
    COUNT(*) as search_frequency,
    AVG(s.results_count) as avg_results_returned,
    COUNT(*) FILTER (WHERE s.results_count = 0) as no_results_count,
    COUNT(*) FILTER (WHERE s.clicked_result_id IS NOT NULL) as clicked_results,
    
    -- User context analysis
    ARRAY_AGG(DISTINCT s.user_vendor_type) FILTER (WHERE s.user_vendor_type IS NOT NULL) as requesting_vendors,
    ARRAY_AGG(DISTINCT s.user_type) as user_types,
    
    -- Recent trend
    COUNT(*) FILTER (WHERE s.created_at >= NOW() - INTERVAL '7 days') as recent_searches,
    
    -- Calculate opportunity score
    (COUNT(*) * 2) + -- Search frequency weight
    (COUNT(*) FILTER (WHERE s.results_count = 0) * 5) + -- No results penalty
    (COUNT(*) FILTER (WHERE s.user_type = 'supplier') * 1.5) -- Supplier priority
    as opportunity_score
    
  FROM kb_searches s
  WHERE s.created_at >= NOW() - INTERVAL '60 days'
  AND LENGTH(s.normalized_query) > 5 -- Filter out very short queries
  GROUP BY s.normalized_query
  HAVING COUNT(*) >= 3 -- Minimum frequency threshold
),
content_gaps AS (
  SELECT 
    sp.*,
    -- Estimate potential impact
    CASE 
      WHEN sp.no_results_count::FLOAT / sp.search_frequency > 0.7 THEN 'high_impact'
      WHEN sp.no_results_count::FLOAT / sp.search_frequency > 0.4 THEN 'medium_impact'
      ELSE 'low_impact'
    END as gap_severity,
    
    -- Estimate article creation effort
    CASE 
      WHEN sp.normalized_query ILIKE '%integration%' OR sp.normalized_query ILIKE '%api%' THEN 'high_effort'
      WHEN sp.normalized_query ILIKE '%setup%' OR sp.normalized_query ILIKE '%how to%' THEN 'medium_effort'
      ELSE 'low_effort'
    END as creation_effort
    
  FROM search_patterns sp
  WHERE sp.avg_results_returned < 3 OR sp.no_results_count > 0
)
SELECT 
  normalized_query,
  search_frequency,
  no_results_count,
  ROUND(no_results_count::FLOAT / search_frequency * 100, 2) as no_results_percentage,
  requesting_vendors,
  user_types,
  recent_searches,
  gap_severity,
  creation_effort,
  opportunity_score,
  
  -- ROI calculation (estimated ticket deflection value)
  ROUND(
    (search_frequency * 0.6) * 25.0, -- Assume 60% deflection at $25/ticket
    2
  ) as estimated_monthly_savings
  
FROM content_gaps
ORDER BY opportunity_score DESC, no_results_percentage DESC
LIMIT 50;

-- 4. User Journey Analysis and Drop-off Points
WITH user_journeys AS (
  SELECT 
    kas.user_id,
    kas.session_id,
    kas.article_id,
    kas.time_spent,
    kas.scroll_depth,
    kas.completed,
    kas.bounced,
    kas.converted_to_action,
    kas.user_vendor_type,
    
    -- Journey context
    kas.referrer_type,
    kas.started_at,
    
    -- Article context
    a.category,
    a.difficulty,
    a.article_type,
    
    -- Journey position
    ROW_NUMBER() OVER (
      PARTITION BY kas.user_id, kas.session_id 
      ORDER BY kas.started_at
    ) as journey_step
    
  FROM kb_article_sessions kas
  JOIN kb_articles a ON kas.article_id = a.id
  WHERE kas.started_at >= NOW() - INTERVAL '30 days'
),
journey_metrics AS (
  SELECT 
    user_vendor_type,
    category,
    difficulty,
    journey_step,
    
    COUNT(*) as sessions_at_step,
    AVG(time_spent) as avg_time_spent,
    AVG(scroll_depth) as avg_scroll_depth,
    COUNT(*) FILTER (WHERE completed) as completions,
    COUNT(*) FILTER (WHERE bounced) as bounces,
    COUNT(*) FILTER (WHERE converted_to_action) as conversions,
    
    -- Calculate drop-off rate
    ROUND(
      COUNT(*) FILTER (WHERE bounced)::FLOAT / COUNT(*) * 100, 2
    ) as bounce_rate,
    
    -- Calculate conversion rate
    ROUND(
      COUNT(*) FILTER (WHERE converted_to_action)::FLOAT / COUNT(*) * 100, 2
    ) as conversion_rate
    
  FROM user_journeys
  GROUP BY user_vendor_type, category, difficulty, journey_step
)
SELECT 
  user_vendor_type,
  category,
  difficulty,
  journey_step,
  sessions_at_step,
  avg_time_spent,
  avg_scroll_depth,
  bounce_rate,
  conversion_rate,
  
  -- Identify problematic steps
  CASE 
    WHEN bounce_rate > 60 THEN 'high_drop_off'
    WHEN bounce_rate > 40 THEN 'medium_drop_off'
    ELSE 'healthy'
  END as drop_off_concern,
  
  -- Suggest improvements
  CASE 
    WHEN avg_scroll_depth < 0.3 AND bounce_rate > 50 THEN 'improve_intro_content'
    WHEN avg_time_spent < 30 AND bounce_rate > 40 THEN 'content_too_complex'
    WHEN conversion_rate < 5 AND avg_time_spent > 120 THEN 'unclear_next_steps'
    ELSE 'performing_well'
  END as improvement_suggestion
  
FROM journey_metrics
WHERE sessions_at_step >= 10 -- Minimum sample size
ORDER BY user_vendor_type, category, journey_step;
```

### Success Criteria

**Core Metrics**:
- ✅ 40% reduction in support ticket volume within 3 months
- ✅ <0.5 second average search response time
- ✅ >85% user satisfaction rating on knowledge base articles
- ✅ >75% of searches return relevant results (clicked)

**User Engagement**:
- ✅ >60% of users find answers without creating support tickets
- ✅ >80% helpfulness rating on published articles
- ✅ >3 minutes average time spent on tutorial articles
- ✅ >70% completion rate for interactive walkthroughs

**Wedding Industry Specific**:
- ✅ All vendor types have dedicated content categories
- ✅ Peak season (April-September) content gets 1.5x visibility boost
- ✅ Wedding day critical content achieves >90% helpfulness rating
- ✅ Cross-vendor educational content (photographer + planner workflows)

**Content Quality & Maintenance**:
- ✅ <5% of searches result in no useful results
- ✅ All articles reviewed and updated within 90 days
- ✅ AI-generated content gaps identified and filled within 14 days
- ✅ User feedback incorporated into article improvements within 7 days

**Business Impact**:
- ✅ $15,000+ monthly cost savings through ticket deflection
- ✅ 25% improvement in user onboarding completion rates
- ✅ 30% reduction in time-to-first-success for new users
- ✅ 20% increase in feature adoption through better documentation

## Completion Checklist

**Backend Implementation**:
- [ ] Comprehensive database schema with wedding industry context
- [ ] AI-powered content generation and optimization system
- [ ] Advanced search with semantic similarity and ML ranking
- [ ] Real-time analytics and engagement tracking
- [ ] Intelligent duplicate detection and content gap identification
- [ ] Video tutorial management and completion tracking

**Frontend Implementation**:
- [ ] Modern knowledge base portal with intelligent search
- [ ] Context-aware help widget with proactive assistance
- [ ] Interactive article interface with progress tracking
- [ ] Advanced search results with quick answers
- [ ] Content management interface for admin users
- [ ] Mobile-optimized responsive design

**AI & Intelligence Features**:
- [ ] Semantic search using OpenAI embeddings
- [ ] AI-generated quick answers for common questions
- [ ] Automated content generation from support patterns
- [ ] Proactive help detection based on user behavior
- [ ] Content optimization suggestions based on performance

**Integration & Testing**:
- [ ] MCP server integration (Context7, Supabase, PostgreSQL)
- [ ] Real-time analytics and notification system
- [ ] Comprehensive E2E testing including wedding scenarios
- [ ] Performance testing under peak wedding season load
- [ ] Cross-browser and mobile device testing

**Documentation & Training**:
- [ ] Content authoring guidelines for team members
- [ ] User training materials for knowledge base navigation
- [ ] Analytics dashboard setup and interpretation guide
- [ ] AI content generation workflow documentation

---

**Estimated Completion**: 17 business days  
**Success Measurement**: 60-day post-launch support ticket analysis  
**Rollout Strategy**: Beta launch with professional tier, gradual rollout with content seeding