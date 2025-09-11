# 04-knowledge-base.md

# Knowledge Base System for WedSync/WedMe

## Overview

A comprehensive self-service knowledge base that empowers wedding suppliers and couples to find answers quickly, reducing support tickets and improving user satisfaction. The system includes documentation, tutorials, FAQs, and intelligent search capabilities.

## Knowledge Base Architecture

### Content Structure

```tsx
interface KnowledgeBaseStructure {
  categories: {
    gettingStarted: GettingStartedArticles;
    features: FeatureDocumentation;
    billing: BillingArticles;
    troubleshooting: TroubleshootingGuides;
    bestPractices: BestPracticeGuides;
    integrations: IntegrationGuides;
    api: APIDocumentation;
  };

  articleTypes: {
    howTo: 'step-by-step guide';
    concept: 'explanation of concepts';
    reference: 'technical reference';
    troubleshooting: 'problem-solution';
    video: 'video tutorial';
    interactive: 'interactive demo';
  };

  userSegments: {
    newUsers: 'onboarding content';
    suppliers: 'supplier-specific guides';
    couples: 'couple-specific guides';
    developers: 'API and technical docs';
    admins: 'admin and team features';
  };
}

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string;
  subcategory: string;

  metadata: {
    type: ArticleType;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    readTime: number; // minutes
    lastUpdated: Date;
    version: string;
    author: string;
  };

  seo: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
    canonicalUrl: string;
  };

  engagement: {
    views: number;
    helpful: number;
    notHelpful: number;
    avgTimeOnPage: number;
    bounceRate: number;
  };

  related: {
    articles: string[];
    videos: string[];
    features: string[];
  };
}

```

## Implementation

### 1. Content Management System

```tsx
// lib/knowledge/contentManager.ts
export class KnowledgeBaseManager {
  private static instance: KnowledgeBaseManager;
  private searchEngine: SearchEngine;
  private aiAssistant: AIAssistant;
  private analytics: AnalyticsTracker;

  static getInstance(): KnowledgeBaseManager {
    if (!KnowledgeBaseManager.instance) {
      KnowledgeBaseManager.instance = new KnowledgeBaseManager();
    }
    return KnowledgeBaseManager.instance;
  }

  async createArticle(article: ArticleInput): Promise<Article> {
    // Generate slug from title
    const slug = this.generateSlug(article.title);

    // Check for duplicate content
    const similar = await this.findSimilarArticles(article.content);
    if (similar.length > 0) {
      throw new Error(`Similar article exists: ${similar[0].title}`);
    }

    // Process content
    const processedContent = await this.processContent(article.content);

    // Extract keywords for search
    const keywords = await this.extractKeywords(processedContent);

    // Calculate reading time
    const readTime = this.calculateReadTime(processedContent);

    // Generate AI summary
    const summary = await this.aiAssistant.generateSummary(processedContent);

    const newArticle: Article = {
      id: generateId(),
      title: article.title,
      slug,
      content: processedContent,
      summary,
      category: article.category,
      subcategory: article.subcategory,

      metadata: {
        type: article.type,
        difficulty: this.assessDifficulty(processedContent),
        readTime,
        lastUpdated: new Date(),
        version: '1.0.0',
        author: article.author
      },

      seo: {
        metaTitle: article.metaTitle || article.title,
        metaDescription: article.metaDescription || summary,
        keywords,
        canonicalUrl: `/help/${article.category}/${slug}`
      },

      engagement: {
        views: 0,
        helpful: 0,
        notHelpful: 0,
        avgTimeOnPage: 0,
        bounceRate: 0
      },

      related: {
        articles: await this.findRelatedArticles(article),
        videos: article.videos || [],
        features: article.relatedFeatures || []
      },

      searchTerms: await this.generateSearchTerms(article),
      internalLinks: this.extractInternalLinks(processedContent)
    };

    // Save to database
    await this.saveArticle(newArticle);

    // Index for search
    await this.searchEngine.indexArticle(newArticle);

    // Update category structure
    await this.updateCategoryStructure(newArticle);

    return newArticle;
  }

  private async processContent(content: string): Promise<string> {
    // Convert markdown to HTML
    let processed = marked(content);

    // Add syntax highlighting for code blocks
    processed = this.addSyntaxHighlighting(processed);

    // Add interactive elements
    processed = this.addInteractiveElements(processed);

    // Optimize images
    processed = await this.optimizeImages(processed);

    // Add table of contents for long articles
    if (this.calculateReadTime(processed) > 5) {
      processed = this.addTableOfContents(processed);
    }

    // Add contextual tooltips
    processed = this.addTooltips(processed);

    return processed;
  }

  async searchArticles(query: string, filters?: SearchFilters): Promise<SearchResults> {
    // Track search query
    await this.analytics.trackSearch(query, filters);

    // Get user context
    const userContext = await this.getUserContext();

    // Perform search
    const results = await this.searchEngine.search(query, {
      ...filters,
      boost: {
        category: userContext.userType === 'supplier' ? 'suppliers' : 'couples',
        difficulty: userContext.experienceLevel,
        recency: 0.3
      }
    });

    // If no results, try fuzzy search
    if (results.articles.length === 0) {
      const fuzzyResults = await this.searchEngine.fuzzySearch(query);
      if (fuzzyResults.length > 0) {
        results.articles = fuzzyResults;
        results.didYouMean = this.searchEngine.getSuggestion(query);
      }
    }

    // Get AI-suggested articles if still no results
    if (results.articles.length === 0) {
      const aiSuggestions = await this.aiAssistant.suggestArticles(query);
      results.articles = aiSuggestions;
      results.aiGenerated = true;
    }

    // Add related searches
    results.relatedSearches = await this.getRelatedSearches(query);

    // Add quick answers for common questions
    const quickAnswer = await this.getQuickAnswer(query);
    if (quickAnswer) {
      results.quickAnswer = quickAnswer;
    }

    return results;
  }

  async getQuickAnswer(query: string): Promise<QuickAnswer | null> {
    // Check for common question patterns
    const patterns = [
      {
        pattern: /how (?:do i|to|can i)/i,
        type: 'howto'
      },
      {
        pattern: /what (?:is|are|does)/i,
        type: 'definition'
      },
      {
        pattern: /why (?:is|does|can't)/i,
        type: 'explanation'
      },
      {
        pattern: /where (?:is|can i find|do i)/i,
        type: 'location'
      }
    ];

    for (const pattern of patterns) {
      if (pattern.pattern.test(query)) {
        return await this.generateQuickAnswer(query, pattern.type);
      }
    }

    // Check for specific feature questions
    if (query.toLowerCase().includes('price') || query.toLowerCase().includes('cost')) {
      return this.getPricingQuickAnswer();
    }

    if (query.toLowerCase().includes('cancel') || query.toLowerCase().includes('refund')) {
      return this.getCancellationQuickAnswer();
    }

    return null;
  }
}

```

### 2. Intelligent Search System

```tsx
// lib/knowledge/searchEngine.ts
export class KnowledgeSearchEngine {
  private index: SearchIndex;
  private embeddings: EmbeddingService;

  async initializeIndex(): Promise<void> {
    // Create search index with multiple fields
    this.index = await this.createIndex({
      fields: [
        { name: 'title', weight: 3, type: 'text' },
        { name: 'content', weight: 1, type: 'text' },
        { name: 'summary', weight: 2, type: 'text' },
        { name: 'keywords', weight: 2, type: 'array' },
        { name: 'category', weight: 1, type: 'keyword' },
        { name: 'difficulty', weight: 0.5, type: 'keyword' }
      ],

      analyzers: {
        default: {
          tokenizer: 'standard',
          filters: ['lowercase', 'stemmer', 'synonyms']
        }
      },

      synonyms: await this.loadSynonyms()
    });
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    // Parse query for special operators
    const parsed = this.parseQuery(query);

    // Build search query
    const searchQuery = {
      multi_match: {
        query: parsed.text,
        fields: this.getFieldsWithBoost(options),
        type: 'best_fields',
        fuzziness: 'AUTO'
      }
    };

    // Add filters
    if (parsed.filters || options?.filters) {
      searchQuery.filter = this.buildFilters(parsed.filters, options?.filters);
    }

    // Execute search
    const results = await this.index.search(searchQuery);

    // Re-rank using ML model
    const reranked = await this.rerankResults(results, query);

    // Add snippets and highlights
    const enhanced = this.enhanceResults(reranked, query);

    return enhanced;
  }

  async semanticSearch(query: string): Promise<SearchResult[]> {
    // Generate embedding for query
    const queryEmbedding = await this.embeddings.generateEmbedding(query);

    // Find similar articles using vector similarity
    const similar = await this.index.vectorSearch({
      vector: queryEmbedding,
      k: 10,
      minScore: 0.7
    });

    // Combine with keyword search
    const keywordResults = await this.search(query, { limit: 5 });

    // Merge and deduplicate results
    return this.mergeResults(similar, keywordResults);
  }

  private async rerankResults(
    results: SearchResult[],
    query: string
  ): Promise<SearchResult[]> {
    // Calculate relevance scores
    const scored = results.map(result => ({
      ...result,
      relevanceScore: this.calculateRelevance(result, query)
    }));

    // Factor in user engagement metrics
    const withEngagement = scored.map(result => ({
      ...result,
      engagementScore: this.calculateEngagementScore(result)
    }));

    // Combine scores
    const final = withEngagement.map(result => ({
      ...result,
      finalScore: (result.relevanceScore * 0.7) + (result.engagementScore * 0.3)
    }));

    // Sort by final score
    return final.sort((a, b) => b.finalScore - a.finalScore);
  }

  private calculateEngagementScore(result: SearchResult): number {
    const { engagement } = result.article;

    // Helpful ratio
    const helpfulRatio = engagement.helpful /
      Math.max(engagement.helpful + engagement.notHelpful, 1);

    // View score (logarithmic)
    const viewScore = Math.log10(engagement.views + 1) / 5;

    // Time on page score
    const timeScore = Math.min(engagement.avgTimeOnPage / 300, 1); // 5 min max

    // Inverse bounce rate
    const bounceScore = 1 - engagement.bounceRate;

    return (helpfulRatio * 0.4) + (viewScore * 0.2) +
           (timeScore * 0.2) + (bounceScore * 0.2);
  }

  async generateAutocompleteSuggestions(prefix: string): Promise<string[]> {
    // Get popular searches starting with prefix
    const popularSearches = await this.getPopularSearches(prefix);

    // Get article titles matching prefix
    const titles = await this.index.suggest({
      field: 'title',
      prefix,
      size: 5
    });

    // Get AI-generated suggestions
    const aiSuggestions = await this.aiAssistant.generateSuggestions(prefix);

    // Combine and deduplicate
    const combined = [...new Set([
      ...popularSearches,
      ...titles,
      ...aiSuggestions
    ])];

    return combined.slice(0, 10);
  }
}

```

### 3. Interactive Help Widget

```tsx
// components/HelpWidget.tsx
export function HelpWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'search' | 'browse' | 'contact'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const { user } = useUser();

  const handleSearch = async (query: string) => {
    const results = await knowledgeApi.search(query, {
      userType: user.type,
      limit: 5
    });

    setResults(results);

    // Track search for analytics
    trackEvent('help_search', {
      query,
      resultsCount: results.articles.length,
      hasQuickAnswer: !!results.quickAnswer
    });
  };

  return (
    <>
      {/* Floating help button */}
      <button
        className="help-trigger"
        onClick={() => setIsOpen(true)}
        aria-label="Help & Support"
      >
        <HelpCircle />
        {hasUnreadArticles() && <span className="notification-dot" />}
      </button>

      {/* Help panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="help-panel"
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
          >
            <div className="panel-header">
              <h2>How can we help?</h2>
              <button onClick={() => setIsOpen(false)}>
                <X />
              </button>
            </div>

            <div className="help-tabs">
              <button
                className={mode === 'search' ? 'active' : ''}
                onClick={() => setMode('search')}
              >
                <Search /> Search
              </button>
              <button
                className={mode === 'browse' ? 'active' : ''}
                onClick={() => setMode('browse')}
              >
                <Book /> Browse
              </button>
              <button
                className={mode === 'contact' ? 'active' : ''}
                onClick={() => setMode('contact')}
              >
                <MessageSquare /> Contact
              </button>
            </div>

            <div className="panel-content">
              {mode === 'search' && (
                <SearchMode
                  onSearch={handleSearch}
                  results={results}
                  onArticleSelect={setSelectedArticle}
                />
              )}

              {mode === 'browse' && (
                <BrowseMode
                  onArticleSelect={setSelectedArticle}
                />
              )}

              {mode === 'contact' && (
                <ContactMode
                  searchQuery={searchQuery}
                />
              )}
            </div>

            {selectedArticle && (
              <ArticleViewer
                article={selectedArticle}
                onClose={() => setSelectedArticle(null)}
                onHelpful={(helpful) => rateArticle(selectedArticle.id, helpful)}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function SearchMode({ onSearch, results, onArticleSelect }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const handleInputChange = async (value: string) => {
    setQuery(value);

    if (value.length > 2) {
      const suggestions = await knowledgeApi.getSuggestions(value);
      setSuggestions(suggestions);
    } else {
      setSuggestions([]);
    }
  };

  return (
    <div className="search-mode">
      <div className="search-input-container">
        <input
          type="text"
          placeholder="Search for help..."
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && onSearch(query)}
        />
        <button onClick={() => onSearch(query)}>
          <Search />
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="suggestions">
          {suggestions.map(suggestion => (
            <button
              key={suggestion}
              onClick={() => {
                setQuery(suggestion);
                onSearch(suggestion);
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {results && (
        <div className="search-results">
          {results.quickAnswer && (
            <div className="quick-answer">
              <h4>Quick Answer</h4>
              <p>{results.quickAnswer.text}</p>
              {results.quickAnswer.link && (
                <a href={results.quickAnswer.link}>Learn more →</a>
              )}
            </div>
          )}

          {results.articles.map(article => (
            <SearchResultCard
              key={article.id}
              article={article}
              onClick={() => onArticleSelect(article)}
            />
          ))}

          {results.articles.length === 0 && (
            <div className="no-results">
              <p>No articles found for "{query}"</p>
              <button onClick={() => createSupportTicket(query)}>
                Contact Support
              </button>
            </div>
          )}

          {results.relatedSearches && (
            <div className="related-searches">
              <h4>Related searches</h4>
              {results.relatedSearches.map(search => (
                <button key={search} onClick={() => onSearch(search)}>
                  {search}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

```

### 4. Content Analytics System

```tsx
// lib/knowledge/analytics.ts
export class KnowledgeAnalytics {
  async trackArticleView(articleId: string, userId: string): Promise<void> {
    const session = {
      articleId,
      userId,
      startTime: Date.now(),
      referrer: document.referrer,
      searchQuery: this.getSearchQuery(),
      device: this.getDeviceInfo()
    };

    // Start tracking time on page
    this.startTimeTracking(session);

    // Increment view count
    await this.incrementViewCount(articleId);

    // Track user journey
    await this.trackUserJourney(userId, articleId);
  }

  async analyzeContentPerformance(): Promise<ContentInsights> {
    const articles = await this.getAllArticles();

    const insights = {
      topPerforming: await this.getTopPerformingArticles(),
      underperforming: await this.getUnderperformingArticles(),
      searchGaps: await this.identifySearchGaps(),
      updateNeeded: await this.getArticlesNeedingUpdate(),
      userJourneys: await this.analyzeUserJourneys(),
      recommendations: []
    };

    // Generate recommendations
    insights.recommendations = this.generateRecommendations(insights);

    return insights;
  }

  private async identifySearchGaps(): Promise<SearchGap[]> {
    // Get failed searches
    const failedSearches = await this.getFailedSearches(30); // Last 30 days

    // Group by similarity
    const grouped = this.groupSimilarSearches(failedSearches);

    // Calculate frequency and impact
    const gaps = grouped.map(group => ({
      topic: group.representative,
      searches: group.queries,
      frequency: group.count,
      estimatedImpact: group.count * this.getAverageTicketCost(),
      suggestedArticles: this.suggestArticlesForGap(group)
    }));

    return gaps.sort((a, b) => b.estimatedImpact - a.estimatedImpact);
  }

  async getArticleEffectiveness(articleId: string): Promise<Effectiveness> {
    const metrics = await this.getArticleMetrics(articleId);

    return {
      ticketDeflection: await this.calculateTicketDeflection(articleId),
      problemResolution: metrics.helpful / (metrics.helpful + metrics.notHelpful),
      engagement: {
        avgTimeOnPage: metrics.avgTimeOnPage,
        bounceRate: metrics.bounceRate,
        scrollDepth: metrics.avgScrollDepth
      },
      relatedTickets: await this.getRelatedTickets(articleId),
      improvementSuggestions: await this.generateImprovements(articleId)
    };
  }

  private async calculateTicketDeflection(articleId: string): Promise<number> {
    // Get users who viewed article
    const viewers = await this.getArticleViewers(articleId, 30);

    // Check how many created tickets after viewing
    const ticketsCreated = await this.getTicketsCreatedBy(viewers, 7); // Within 7 days

    // Calculate deflection rate
    const deflectionRate = 1 - (ticketsCreated.length / viewers.length);

    // Estimate tickets saved
    const estimatedTicketsSaved = deflectionRate * viewers.length;

    return {
      rate: deflectionRate,
      ticketsSaved: estimatedTicketsSaved,
      costSaved: estimatedTicketsSaved * this.getAverageTicketCost()
    };
  }
}

```

### 5. Database Schema

```sql
-- Knowledge base articles
CREATE TABLE kb_articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  content TEXT NOT NULL,
  summary TEXT,
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),

  -- Metadata
  type VARCHAR(50) NOT NULL,
  difficulty VARCHAR(20),
  read_time INTEGER, -- minutes
  version VARCHAR(20),
  author VARCHAR(100),

  -- SEO
  meta_title VARCHAR(255),
  meta_description TEXT,
  keywords TEXT[],
  canonical_url VARCHAR(255),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,

  -- Status
  status VARCHAR(20) DEFAULT 'draft', -- draft, published, archived

  INDEX idx_articles_slug (slug),
  INDEX idx_articles_category (category),
  INDEX idx_articles_status (status)
);

-- Article engagement metrics
CREATE TABLE kb_article_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID REFERENCES kb_articles(id),

  -- Engagement
  views INTEGER DEFAULT 0,
  unique_viewers INTEGER DEFAULT 0,
  helpful_votes INTEGER DEFAULT 0,
  not_helpful_votes INTEGER DEFAULT 0,

  -- Performance
  avg_time_on_page DECIMAL(10,2),
  bounce_rate DECIMAL(5,2),
  avg_scroll_depth DECIMAL(5,2),

  -- Search
  search_impressions INTEGER DEFAULT 0,
  search_clicks INTEGER DEFAULT 0,
  search_ctr DECIMAL(5,2),

  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(article_id)
);

-- Search queries
CREATE TABLE kb_searches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  query TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  user_type VARCHAR(20),

  -- Results
  results_count INTEGER,
  clicked_result UUID REFERENCES kb_articles(id),
  has_quick_answer BOOLEAN DEFAULT FALSE,

  -- Context
  source VARCHAR(50), -- 'widget', 'page', 'ticket'
  session_id VARCHAR(100),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_searches_query (query),
  INDEX idx_searches_user (user_id)
);

-- Article relationships
CREATE TABLE kb_related_articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID REFERENCES kb_articles(id),
  related_article_id UUID REFERENCES kb_articles(id),
  relationship_type VARCHAR(50), -- 'related', 'prerequisite', 'next_step'
  weight DECIMAL(3,2) DEFAULT 1.0,

  UNIQUE(article_id, related_article_id)
);

-- Article feedback
CREATE TABLE kb_article_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID REFERENCES kb_articles(id),
  user_id UUID REFERENCES users(id),

  helpful BOOLEAN,
  feedback_text TEXT,
  suggested_improvement TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_feedback_article (article_id)
);

-- Article versions (for tracking changes)
CREATE TABLE kb_article_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID REFERENCES kb_articles(id),
  version VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  change_summary TEXT,
  author VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_versions_article (article_id)
);

-- Video tutorials
CREATE TABLE kb_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  video_url VARCHAR(500),
  thumbnail_url VARCHAR(500),
  duration INTEGER, -- seconds
  transcript TEXT,

  category VARCHAR(100),
  related_articles UUID[],

  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_videos_category (category)
);

```

## Content Organization

### Category Structure

```tsx
const knowledgeBaseStructure = {
  'Getting Started': {
    icon: 'rocket',
    description: 'Everything you need to begin',
    subcategories: [
      'Account Setup',
      'First Form',
      'Inviting Clients',
      'Basic Settings'
    ]
  },

  'Forms & Questionnaires': {
    icon: 'file-text',
    description: 'Create and manage forms',
    subcategories: [
      'Form Builder',
      'Question Types',
      'Conditional Logic',
      'Templates',
      'Sharing & Embedding'
    ]
  },

  'Client Management': {
    icon: 'users',
    description: 'Manage your couples and clients',
    subcategories: [
      'Client Dashboard',
      'Communication',
      'Timeline & Tasks',
      'Documents',
      'Collaboration'
    ]
  },

  'Journey Builder': {
    icon: 'map',
    description: 'Automate client journeys',
    subcategories: [
      'Creating Journeys',
      'Triggers & Actions',
      'Email Automation',
      'SMS & WhatsApp',
      'Journey Analytics'
    ]
  },

  'Billing & Payments': {
    icon: 'credit-card',
    description: 'Subscription and billing help',
    subcategories: [
      'Plans & Pricing',
      'Payment Methods',
      'Invoices',
      'Upgrades & Downgrades',
      'Cancellation'
    ]
  },

  'Troubleshooting': {
    icon: 'alert-circle',
    description: 'Solve common issues',
    subcategories: [
      'Login Issues',
      'Form Problems',
      'Email Delivery',
      'Performance',
      'Data & Backups'
    ]
  }
};

```

## AI-Powered Features

### Auto-Generated Content

```tsx
// lib/knowledge/aiContentGenerator.ts
export class AIContentGenerator {
  async generateArticleFromTickets(tickets: Ticket[]): Promise<Article> {
    // Analyze ticket patterns
    const commonIssue = this.identifyCommonIssue(tickets);

    // Generate article content
    const content = await this.generateContent({
      problem: commonIssue.problem,
      solution: commonIssue.solution,
      steps: commonIssue.steps,
      examples: this.extractExamples(tickets)
    });

    // Generate metadata
    const metadata = {
      title: this.generateTitle(commonIssue),
      summary: this.generateSummary(content),
      keywords: this.extractKeywords(tickets),
      category: this.determineCategory(commonIssue)
    };

    return this.createArticle({
      ...metadata,
      content,
      autoGenerated: true,
      sourceTickets: tickets.map(t => t.id)
    });
  }

  async generateVideoScript(article: Article): Promise<VideoScript> {
    const script = await this.ai.generateScript({
      topic: article.title,
      duration: '2-3 minutes',
      style: 'friendly and professional',
      keyPoints: this.extractKeyPoints(article),
      targetAudience: article.metadata.difficulty
    });

    return {
      title: article.title,
      introduction: script.introduction,
      sections: script.sections,
      conclusion: script.conclusion,
      visualCues: script.visualCues,
      estimatedDuration: script.duration
    };
  }

  async improveArticle(article: Article, feedback: Feedback[]): Promise<Improvements> {
    // Analyze negative feedback
    const issues = this.analyzeFeedback(feedback);

    // Generate improvements
    const improvements = await this.ai.suggestImprovements({
      currentContent: article.content,
      issues: issues,
      userQuestions: this.extractQuestions(feedback)
    });

    return {
      revisedContent: improvements.content,
      addedSections: improvements.newSections,
      clarifications: improvements.clarifications,
      examples: improvements.additionalExamples
    };
  }
}

```