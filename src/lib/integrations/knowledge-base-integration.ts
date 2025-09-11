// WS-243: Knowledge Base Integration Service - Team C Implementation
// Focus: Semantic search integration, caching, fault-tolerance

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BaseIntegrationService } from './BaseIntegrationService';
import {
  KnowledgeBaseQuery,
  KnowledgeBaseResult,
  KnowledgeBaseEnrichment,
  ChatContext,
  IntegrationError,
  ErrorCategory,
  KnowledgeBaseConfig,
  IntegrationCredentials,
} from '@/types/integrations';

// Vector search cache for performance optimization
class VectorCache {
  private cache = new Map<
    string,
    {
      data: KnowledgeBaseResult[];
      timestamp: number;
      ttl: number;
      tags: string[];
    }
  >();

  private readonly DEFAULT_TTL = 3600000; // 1 hour
  private readonly MAX_ENTRIES = 1000;

  set(
    key: string,
    data: KnowledgeBaseResult[],
    options: { ttl?: number; tags?: string[] } = {},
  ): void {
    // Clean expired entries if cache is full
    if (this.cache.size >= this.MAX_ENTRIES) {
      this.cleanExpired();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: options.ttl || this.DEFAULT_TTL,
      tags: options.tags || [],
    });
  }

  get(key: string): KnowledgeBaseResult[] | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  invalidateByTags(tags: string[]): void {
    for (const [key, entry] of this.cache.entries()) {
      if (tags.some((tag) => entry.tags.includes(tag))) {
        this.cache.delete(key);
      }
    }
  }

  private cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  getStats(): {
    size: number;
    maxSize: number;
    hitRate?: number;
    memoryUsage: string;
  } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_ENTRIES,
      memoryUsage: `${Math.round(JSON.stringify([...this.cache]).length / 1024)}KB`,
    };
  }
}

// Search query optimizer for better results
class SearchOptimizer {
  private readonly STOP_WORDS = new Set([
    'a',
    'an',
    'and',
    'are',
    'as',
    'at',
    'be',
    'by',
    'for',
    'from',
    'has',
    'he',
    'in',
    'is',
    'it',
    'its',
    'of',
    'on',
    'that',
    'the',
    'to',
    'was',
    'will',
    'with',
    'the',
    'this',
    'but',
    'they',
    'have',
    'had',
    'what',
    'said',
    'each',
    'which',
    'she',
    'do',
    'how',
    'their',
  ]);

  private readonly WEDDING_SYNONYMS = new Map([
    ['wedding', ['marriage', 'ceremony', 'nuptials', 'matrimony']],
    ['venue', ['location', 'place', 'site', 'hall']],
    ['photographer', ['photography', 'photos', 'pictures', 'images']],
    ['florist', ['flowers', 'floral', 'bouquet', 'arrangements']],
    ['catering', ['food', 'menu', 'catering', 'dining']],
    ['planning', ['coordination', 'organizing', 'management']],
    ['budget', ['cost', 'price', 'expense', 'pricing']],
    ['timeline', ['schedule', 'timing', 'itinerary', 'agenda']],
  ]);

  optimize(query: KnowledgeBaseQuery): KnowledgeBaseQuery {
    let optimizedQuery = query.query.toLowerCase();

    // Remove stop words for better search
    const words = optimizedQuery.split(/\s+/);
    const meaningfulWords = words.filter((word) => !this.STOP_WORDS.has(word));

    // Add wedding industry synonyms
    const expandedWords = [...meaningfulWords];
    for (const word of meaningfulWords) {
      const synonyms = this.WEDDING_SYNONYMS.get(word);
      if (synonyms) {
        expandedWords.push(...synonyms);
      }
    }

    // Build enhanced query
    const enhancedQuery = expandedWords.join(' ');

    return {
      ...query,
      query: enhancedQuery,
      // Adjust threshold based on query complexity
      threshold: this.calculateOptimalThreshold(meaningfulWords.length),
      // Add context-based filters
      filters: {
        ...query.filters,
        ...this.buildContextFilters(query.context),
      },
    };
  }

  private calculateOptimalThreshold(wordCount: number): number {
    // Shorter queries need lower thresholds for broader matches
    if (wordCount <= 2) return 0.6;
    if (wordCount <= 4) return 0.7;
    return 0.8;
  }

  private buildContextFilters(context: ChatContext): Record<string, any> {
    const filters: Record<string, any> = {};

    if (context.vendorType) {
      filters.vendor_type = context.vendorType;
    }

    if (context.weddingId) {
      filters.wedding_specific = true;
    }

    // Add organization-specific filtering
    filters.organization_id = context.organizationId;
    filters.active = true;

    return filters;
  }
}

// Context relevance calculator
class RelevanceCalculator {
  calculateContextRelevance(
    result: KnowledgeBaseResult,
    context: ChatContext,
    weddingKeywords: string[] = [],
  ): number {
    let relevance = result.score;

    // Boost for vendor type matches
    if (
      context.vendorType &&
      result.metadata?.vendor_type === context.vendorType
    ) {
      relevance *= 1.2;
    }

    // Boost for wedding-specific content
    if (context.weddingId && result.metadata?.wedding_related) {
      relevance *= 1.15;
    }

    // Boost for content containing wedding keywords
    const contentLower = result.content.toLowerCase();
    const keywordMatches = weddingKeywords.filter((keyword) =>
      contentLower.includes(keyword.toLowerCase()),
    );

    if (keywordMatches.length > 0) {
      relevance *= 1 + keywordMatches.length * 0.05;
    }

    // Boost more recent content
    if (result.metadata?.created_at) {
      const contentAge =
        Date.now() - new Date(result.metadata.created_at).getTime();
      const daysSinceCreated = contentAge / (1000 * 60 * 60 * 24);

      if (daysSinceCreated < 30) {
        relevance *= 1.1; // Recent content boost
      } else if (daysSinceCreated > 365) {
        relevance *= 0.95; // Slight penalty for old content
      }
    }

    // Boost high-quality content (based on metadata signals)
    if (result.metadata?.quality_score && result.metadata.quality_score > 0.8) {
      relevance *= 1.1;
    }

    if (result.metadata?.verified) {
      relevance *= 1.05;
    }

    return Math.min(relevance, 1.0);
  }

  calculateWeddingRelevance(content: string): number {
    const weddingTerms = [
      'wedding',
      'marriage',
      'ceremony',
      'bride',
      'groom',
      'venue',
      'photographer',
      'florist',
      'catering',
      'timeline',
      'budget',
      'guest',
      'invitation',
      'reception',
      'honeymoon',
      'anniversary',
    ];

    const contentLower = content.toLowerCase();
    const termMatches = weddingTerms.filter((term) =>
      contentLower.includes(term),
    );

    return Math.min(termMatches.length / weddingTerms.length, 1.0);
  }
}

export class KnowledgeBaseIntegrationService extends BaseIntegrationService {
  protected serviceName = 'KnowledgeBase';
  private supabaseClient: SupabaseClient;
  private config: KnowledgeBaseConfig;
  private vectorCache: VectorCache;
  private searchOptimizer: SearchOptimizer;
  private relevanceCalculator: RelevanceCalculator;
  private totalSearches = 0;
  private cacheHits = 0;
  private totalErrors = 0;

  constructor(
    config: KnowledgeBaseConfig,
    credentials: IntegrationCredentials,
  ) {
    super(config, credentials);
    this.config = config;

    // Initialize Supabase client
    this.supabaseClient = createClient(config.supabaseUrl, config.serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          'User-Agent': 'WedSync-KnowledgeBase/1.0',
          'X-Client-Info': 'wedsync-ai-chatbot',
        },
      },
    });

    // Initialize optimization components
    this.vectorCache = new VectorCache();
    this.searchOptimizer = new SearchOptimizer();
    this.relevanceCalculator = new RelevanceCalculator();

    console.log(
      '[Knowledge Base Integration] Service initialized with semantic search optimization',
    );
  }

  // Main semantic search method
  async semanticSearch(
    query: KnowledgeBaseQuery,
  ): Promise<KnowledgeBaseResult[]> {
    const operationId = `kb-search-${Date.now()}`;
    const startTime = Date.now();

    try {
      this.totalSearches++;

      // Validate query
      this.validateQuery(query);

      // Generate cache key
      const cacheKey = this.generateCacheKey(query);

      // Check cache first
      const cachedResults = this.vectorCache.get(cacheKey);
      if (cachedResults) {
        this.cacheHits++;
        console.log(
          `[Knowledge Base] Cache hit for query: ${query.query.substring(0, 50)}...`,
        );
        return cachedResults;
      }

      // Optimize query for better search results
      const optimizedQuery = this.searchOptimizer.optimize(query);

      // Execute semantic search with retry logic
      const results = await this.executeWithRetry(async () => {
        return await this.performSemanticSearch(optimizedQuery, operationId);
      }, `Semantic Search - ${operationId}`);

      // Enrich and score results
      const enrichedResults = await this.enrichResults(
        results,
        query.context,
        startTime,
      );

      // Cache results
      await this.cacheResults(
        cacheKey,
        enrichedResults,
        query.context.organizationId,
      );

      console.log(
        `[Knowledge Base] Search completed: ${enrichedResults.length} results in ${Date.now() - startTime}ms`,
      );
      return enrichedResults;
    } catch (error) {
      this.totalErrors++;
      const enhancedError = this.handleKnowledgeBaseError(
        error,
        operationId,
        query,
      );
      console.error(
        `[Knowledge Base] Search failed for operation ${operationId}:`,
        {
          error: enhancedError.message,
          query: query.query.substring(0, 100),
          context: query.context.organizationId,
        },
      );
      throw enhancedError;
    }
  }

  // Get contextual knowledge based on conversation context
  async getContextualKnowledge(
    context: ChatContext,
    queryHint?: string,
    maxResults: number = 5,
  ): Promise<KnowledgeBaseResult[]> {
    const operationId = `contextual-kb-${Date.now()}`;

    try {
      // Build contextual query from conversation context
      const contextualQuery = this.buildContextualQuery(
        context,
        queryHint,
        maxResults,
      );

      return await this.semanticSearch(contextualQuery);
    } catch (error) {
      throw this.handleKnowledgeBaseError(error, operationId, { context });
    }
  }

  // Enhanced search with wedding industry enrichment
  async searchWithWeddingEnrichment(
    query: string,
    context: ChatContext,
    options: {
      includeVendorSpecific?: boolean;
      includeTimelineRelevant?: boolean;
      includeBudgetGuidance?: boolean;
      maxResults?: number;
    } = {},
  ): Promise<KnowledgeBaseEnrichment> {
    const startTime = Date.now();

    const enrichedQuery: KnowledgeBaseQuery = {
      query: this.enhanceQueryWithWeddingContext(query, context, options),
      context,
      maxResults: options.maxResults || 10,
      threshold: 0.7,
      semanticSearch: true,
      filters: {
        ...this.buildWeddingFilters(context, options),
        active: true,
      },
    };

    const results = await this.semanticSearch(enrichedQuery);

    return {
      originalQuery: query,
      enrichedResults: results,
      totalResults: results.length,
      searchTime: Date.now() - startTime,
      cacheHit: this.cacheHits > 0,
    };
  }

  // Add new knowledge to the base
  async addKnowledgeEntry(
    content: string,
    metadata: Record<string, any>,
    organizationId: string,
  ): Promise<string> {
    const operationId = `kb-add-${Date.now()}`;

    try {
      return await this.executeWithRetry(async () => {
        // Generate embeddings for the content
        const embeddings = await this.generateEmbeddings(content);

        const { data, error } = await this.supabaseClient
          .from('knowledge_base_entries')
          .insert({
            content,
            metadata: {
              ...metadata,
              wedding_relevance:
                this.relevanceCalculator.calculateWeddingRelevance(content),
              quality_score: this.calculateQualityScore(content, metadata),
              created_at: new Date().toISOString(),
              source: 'ai_chatbot_system',
            },
            organization_id: organizationId,
            embeddings,
            active: true,
          })
          .select('id')
          .single();

        if (error) {
          throw new IntegrationError(
            `Failed to add knowledge base entry: ${error.message}`,
            'KB_ADD_ERROR',
            ErrorCategory.EXTERNAL_API,
            error,
          );
        }

        // Invalidate related cache entries
        await this.vectorCache.invalidateByTags([
          organizationId,
          'semantic-search',
        ]);

        console.log(`[Knowledge Base] Added new entry: ${data.id}`);
        return data.id;
      }, `Add Knowledge Entry - ${operationId}`);
    } catch (error) {
      throw this.handleKnowledgeBaseError(error, operationId, {
        organizationId,
      });
    }
  }

  // Update existing knowledge entry
  async updateKnowledgeEntry(
    entryId: string,
    content: string,
    metadata: Record<string, any>,
    organizationId: string,
  ): Promise<void> {
    const operationId = `kb-update-${Date.now()}`;

    try {
      await this.executeWithRetry(async () => {
        const embeddings = await this.generateEmbeddings(content);

        const { error } = await this.supabaseClient
          .from('knowledge_base_entries')
          .update({
            content,
            metadata: {
              ...metadata,
              wedding_relevance:
                this.relevanceCalculator.calculateWeddingRelevance(content),
              quality_score: this.calculateQualityScore(content, metadata),
              updated_at: new Date().toISOString(),
            },
            embeddings,
          })
          .eq('id', entryId)
          .eq('organization_id', organizationId);

        if (error) {
          throw new IntegrationError(
            `Failed to update knowledge base entry: ${error.message}`,
            'KB_UPDATE_ERROR',
            ErrorCategory.EXTERNAL_API,
            error,
          );
        }

        // Invalidate cache
        await this.vectorCache.invalidateByTags([organizationId]);
      }, `Update Knowledge Entry - ${operationId}`);
    } catch (error) {
      throw this.handleKnowledgeBaseError(error, operationId, {
        entryId,
        organizationId,
      });
    }
  }

  // Private helper methods

  private validateQuery(query: KnowledgeBaseQuery): void {
    if (!query.query || query.query.trim().length === 0) {
      throw new IntegrationError(
        'Search query cannot be empty',
        'EMPTY_QUERY',
        ErrorCategory.VALIDATION,
      );
    }

    if (query.query.length > 1000) {
      throw new IntegrationError(
        'Search query too long (max 1000 characters)',
        'QUERY_TOO_LONG',
        ErrorCategory.VALIDATION,
      );
    }

    if (!query.context?.organizationId) {
      throw new IntegrationError(
        'Organization context required for knowledge base search',
        'MISSING_ORGANIZATION',
        ErrorCategory.VALIDATION,
      );
    }
  }

  private async performSemanticSearch(
    query: KnowledgeBaseQuery,
    operationId: string,
  ): Promise<any[]> {
    const { data, error } = await this.supabaseClient.rpc(
      'semantic_search_knowledge_base',
      {
        query_text: query.query,
        match_threshold: query.threshold || 0.7,
        match_count: query.maxResults || 10,
        organization_id: query.context.organizationId,
        filters: query.filters || {},
      },
    );

    if (error) {
      throw new IntegrationError(
        `Semantic search failed: ${error.message}`,
        'SEMANTIC_SEARCH_ERROR',
        ErrorCategory.EXTERNAL_API,
        error,
        { operationId, query: query.query.substring(0, 100) },
      );
    }

    return data || [];
  }

  private async enrichResults(
    rawResults: any[],
    context: ChatContext,
    startTime: number,
  ): Promise<KnowledgeBaseResult[]> {
    const weddingKeywords = this.extractWeddingKeywords(context);

    return rawResults
      .map((result) => {
        const enrichedResult: KnowledgeBaseResult = {
          id: result.id,
          content: result.content,
          score: result.similarity || 0,
          source: result.source || 'knowledge_base',
          title: result.metadata?.title || this.generateTitle(result.content),
          url: result.metadata?.url,
          metadata: {
            ...result.metadata,
            retrievedAt: new Date(),
            searchTime: Date.now() - startTime,
            contextRelevant: this.relevanceCalculator.calculateContextRelevance(
              result,
              context,
              weddingKeywords,
            ),
          },
        };

        // Calculate wedding-specific relevance
        enrichedResult.relevanceToWedding =
          this.relevanceCalculator.calculateWeddingRelevance(result.content);

        return enrichedResult;
      })
      .sort((a, b) => {
        // Sort by context relevance, then by original similarity score
        const aRelevance =
          (a.metadata.contextRelevant || 0) * 0.6 + a.score * 0.4;
        const bRelevance =
          (b.metadata.contextRelevant || 0) * 0.6 + b.score * 0.4;
        return bRelevance - aRelevance;
      });
  }

  private buildContextualQuery(
    context: ChatContext,
    queryHint?: string,
    maxResults: number = 5,
  ): KnowledgeBaseQuery {
    let query = queryHint || 'general wedding guidance';

    // Enhance query based on context
    if (context.vendorType) {
      query += ` ${context.vendorType} services`;
    }

    if (context.weddingId) {
      query += ' wedding planning timeline';
    }

    return {
      query,
      context,
      maxResults,
      threshold: 0.65, // Slightly lower threshold for contextual searches
      semanticSearch: true,
      filters: {
        vendor_type: context.vendorType,
        active: true,
        wedding_related: true,
      },
    };
  }

  private enhanceQueryWithWeddingContext(
    query: string,
    context: ChatContext,
    options: any,
  ): string {
    let enhanced = query;

    if (options.includeVendorSpecific && context.vendorType) {
      enhanced += ` ${context.vendorType} specific advice`;
    }

    if (options.includeTimelineRelevant) {
      enhanced += ' wedding timeline planning';
    }

    if (options.includeBudgetGuidance) {
      enhanced += ' budget cost guidance';
    }

    return enhanced;
  }

  private buildWeddingFilters(
    context: ChatContext,
    options: any,
  ): Record<string, any> {
    const filters: Record<string, any> = {};

    if (options.includeVendorSpecific && context.vendorType) {
      filters.vendor_type = context.vendorType;
    }

    if (options.includeTimelineRelevant) {
      filters.category = 'timeline';
    }

    if (options.includeBudgetGuidance) {
      filters.includes_pricing = true;
    }

    return filters;
  }

  private extractWeddingKeywords(context: ChatContext): string[] {
    const keywords = ['wedding', 'planning'];

    if (context.vendorType) {
      keywords.push(context.vendorType);
    }

    return keywords;
  }

  private generateTitle(content: string): string {
    // Extract first sentence or first 50 characters as title
    const firstSentence = content.split('.')[0];
    return firstSentence.length > 50
      ? firstSentence.substring(0, 47) + '...'
      : firstSentence;
  }

  private async generateEmbeddings(content: string): Promise<number[]> {
    // This would integrate with the embedding service (OpenAI embeddings)
    // For now, return a placeholder
    // TODO: Implement actual embedding generation
    console.log(
      `[Knowledge Base] Generating embeddings for content: ${content.substring(0, 50)}...`,
    );
    return new Array(1536).fill(0); // Placeholder for text-embedding-ada-002 dimensions
  }

  private calculateQualityScore(
    content: string,
    metadata: Record<string, any>,
  ): number {
    let score = 0.5; // Base score

    // Length indicates thoroughness
    if (content.length > 200) score += 0.1;
    if (content.length > 500) score += 0.1;

    // Metadata richness
    if (metadata.title) score += 0.1;
    if (metadata.url) score += 0.1;
    if (metadata.verified) score += 0.2;

    return Math.min(score, 1.0);
  }

  private generateCacheKey(query: KnowledgeBaseQuery): string {
    const keyData = {
      query: query.query,
      organizationId: query.context.organizationId,
      vendorType: query.context.vendorType,
      maxResults: query.maxResults,
      threshold: query.threshold,
      filters: query.filters,
    };

    return `kb-search:${this.hashObject(keyData)}`;
  }

  private async cacheResults(
    cacheKey: string,
    results: KnowledgeBaseResult[],
    organizationId: string,
  ): Promise<void> {
    this.vectorCache.set(cacheKey, results, {
      ttl: this.config.cacheConfig.ttl,
      tags: [organizationId, 'semantic-search'],
    });
  }

  private hashObject(obj: any): string {
    return require('crypto')
      .createHash('md5')
      .update(JSON.stringify(obj))
      .digest('hex');
  }

  private handleKnowledgeBaseError(
    error: any,
    operationId: string,
    context?: any,
  ): IntegrationError {
    if (error instanceof IntegrationError) {
      return error;
    }

    return new IntegrationError(
      `Knowledge base operation failed: ${error.message}`,
      'KNOWLEDGE_BASE_ERROR',
      ErrorCategory.EXTERNAL_API,
      error,
      {
        operationId,
        context,
        timestamp: new Date().toISOString(),
      },
    );
  }

  // BaseIntegrationService implementations
  async validateConnection(): Promise<boolean> {
    try {
      const { data, error } = await this.supabaseClient
        .from('knowledge_base_entries')
        .select('count')
        .limit(1);

      return !error;
    } catch {
      return false;
    }
  }

  async refreshToken(): Promise<string> {
    // Supabase service keys don't expire
    return this.config.serviceKey;
  }

  protected async makeRequest(endpoint: string, options?: any): Promise<any> {
    // Supabase client handles requests
    throw new Error(
      'Use Supabase client methods instead of generic makeRequest',
    );
  }

  // Health monitoring
  async getHealthStatus(): Promise<any> {
    try {
      const health = await this.healthCheck();
      const cacheStats = this.vectorCache.getStats();
      const hitRate =
        this.totalSearches > 0
          ? (this.cacheHits / this.totalSearches) * 100
          : 0;
      const errorRate =
        this.totalSearches > 0
          ? (this.totalErrors / this.totalSearches) * 100
          : 0;

      return {
        ...health,
        service: 'Knowledge Base Integration',
        metrics: {
          totalSearches: this.totalSearches,
          cacheHitRate: hitRate,
          errorRate,
          cacheStats,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'Knowledge Base Integration',
      };
    }
  }

  // Performance metrics
  getPerformanceMetrics(): {
    searches: number;
    cacheHitRate: number;
    errorRate: number;
    averageResponseTime: number;
  } {
    const hitRate =
      this.totalSearches > 0 ? (this.cacheHits / this.totalSearches) * 100 : 0;
    const errorRate =
      this.totalSearches > 0
        ? (this.totalErrors / this.totalSearches) * 100
        : 0;

    return {
      searches: this.totalSearches,
      cacheHitRate: hitRate,
      errorRate,
      averageResponseTime: 0, // TODO: Implement response time tracking
    };
  }
}

// Factory function for easy instantiation
export function createKnowledgeBaseIntegrationService(
  config: Partial<KnowledgeBaseConfig>,
): KnowledgeBaseIntegrationService {
  const defaultConfig: KnowledgeBaseConfig = {
    apiUrl: '', // Not used for Supabase
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    embeddingModel: 'text-embedding-ada-002',
    vectorDimensions: 1536,
    searchTimeout: 10000,
    timeout: 30000,
    retryAttempts: 3,
    rateLimitPerMinute: 120,
    cacheConfig: {
      enabled: true,
      ttl: 3600000, // 1 hour
      maxEntries: 1000,
    },
  };

  const finalConfig = { ...defaultConfig, ...config };

  // Validate required fields
  if (!finalConfig.supabaseUrl || !finalConfig.serviceKey) {
    throw new Error('Supabase URL and service key are required');
  }

  return new KnowledgeBaseIntegrationService(finalConfig, {
    apiKey: finalConfig.serviceKey,
    userId: 'system',
    organizationId: 'system',
  });
}

export { VectorCache, SearchOptimizer, RelevanceCalculator };
