/**
 * WS-238 Knowledge Base System - AI Search Integration Service
 * Team C - Round 1 Implementation
 *
 * OpenAI-powered semantic search service for wedding industry knowledge base
 * Handles embeddings generation, semantic search, and query enhancement
 */

import OpenAI from 'openai';
import { Logger } from '@/lib/logging/Logger';

export interface SearchQuery {
  query: string;
  vendorType?:
    | 'photographer'
    | 'venue'
    | 'florist'
    | 'caterer'
    | 'dj'
    | 'planner'
    | 'other';
  category?: string;
  limit?: number;
  threshold?: number;
  weddingContext?: {
    weddingDate?: string;
    region?: string;
    budgetRange?: string;
  };
}

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  score: number;
  category: string;
  tags: string[];
  vendorTypes: string[];
  metadata: {
    lastUpdated: string;
    author?: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedReadTime: number;
  };
}

export interface EmbeddingResult {
  embedding: number[];
  tokens: number;
  model: string;
}

export interface QueryEnhancement {
  originalQuery: string;
  enhancedQuery: string;
  addedTerms: string[];
  reasoning: string;
}

export class AISearchService {
  private openai: OpenAI;
  private logger: Logger;
  private readonly MODEL_EMBEDDING = 'text-embedding-3-small';
  private readonly MODEL_CHAT = 'gpt-4-turbo-preview';
  private readonly MAX_TOKENS = 8000;
  private readonly EMBEDDING_DIMENSIONS = 1536;

  // Wedding industry specific terms for context enhancement
  private readonly WEDDING_CONTEXT_TERMS = {
    photographer: [
      'portfolio',
      'albums',
      'editing',
      'timeline',
      'shots',
      'lighting',
      'poses',
    ],
    venue: [
      'capacity',
      'catering',
      'decorations',
      'layout',
      'availability',
      'packages',
    ],
    florist: [
      'bouquets',
      'centerpieces',
      'arrangements',
      'seasonal',
      'colors',
      'preservation',
    ],
    caterer: [
      'menu',
      'dietary',
      'service',
      'presentation',
      'tastings',
      'portions',
    ],
    dj: [
      'playlist',
      'equipment',
      'announcements',
      'ceremony',
      'reception',
      'requests',
    ],
    planner: [
      'timeline',
      'coordination',
      'vendors',
      'budget',
      'logistics',
      'communication',
    ],
    other: [
      'contracts',
      'payments',
      'insurance',
      'permits',
      'coordination',
      'backup',
    ],
  };

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required for AISearchService');
    }

    this.openai = new OpenAI({
      apiKey,
      timeout: 30000, // 30 second timeout
      maxRetries: 3,
    });

    this.logger = Logger.create('ai-search-service');

    this.logger.info('AISearchService initialized', {
      model: this.MODEL_EMBEDDING,
      dimensions: this.EMBEDDING_DIMENSIONS,
    });
  }

  /**
   * Generate embeddings for knowledge base content
   * Used during content ingestion to create searchable vectors
   */
  async generateEmbedding(
    text: string,
    context?: {
      vendorType?: string;
      category?: string;
    },
  ): Promise<EmbeddingResult> {
    try {
      this.logger.info('Generating embedding', {
        textLength: text.length,
        context,
      });

      // Enhance text with wedding industry context if available
      const enhancedText = this.enhanceTextForEmbedding(text, context);

      const response = await this.openai.embeddings.create({
        model: this.MODEL_EMBEDDING,
        input: enhancedText.slice(0, this.MAX_TOKENS * 4), // Approximate token limit
        encoding_format: 'float',
      });

      const result: EmbeddingResult = {
        embedding: response.data[0].embedding,
        tokens: response.usage.total_tokens,
        model: response.model,
      };

      this.logger.info('Embedding generated successfully', {
        tokens: result.tokens,
        model: result.model,
        dimensions: result.embedding.length,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to generate embedding', {
        error: error instanceof Error ? error.message : 'Unknown error',
        textLength: text.length,
        context,
      });
      throw new Error(
        `Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Perform semantic search using query embeddings
   * Main search functionality for knowledge base queries
   */
  async semanticSearch(searchQuery: SearchQuery): Promise<SearchResult[]> {
    try {
      this.logger.info('Performing semantic search', {
        query: searchQuery.query.substring(0, 100),
        vendorType: searchQuery.vendorType,
        category: searchQuery.category,
      });

      // Step 1: Enhance the search query with wedding context
      const enhancedQuery = await this.enhanceSearchQuery(searchQuery);

      // Step 2: Generate embedding for the enhanced query
      const queryEmbedding = await this.generateEmbedding(
        enhancedQuery.enhancedQuery,
        {
          vendorType: searchQuery.vendorType,
          category: searchQuery.category,
        },
      );

      // Step 3: Get candidate articles from database (this would be implemented with Supabase)
      // For now, we'll return a structured response format
      const candidateArticles = await this.getCandidateArticles(searchQuery);

      // Step 4: Calculate similarity scores and rank results
      const rankedResults = this.calculateSimilarityScores(
        queryEmbedding.embedding,
        candidateArticles,
        searchQuery.threshold || 0.75,
      );

      // Step 5: Apply wedding industry specific ranking adjustments
      const finalResults = this.applyWeddingIndustryRanking(
        rankedResults,
        searchQuery,
      );

      this.logger.info('Semantic search completed', {
        originalQuery: searchQuery.query,
        enhancedQuery: enhancedQuery.enhancedQuery,
        resultsFound: finalResults.length,
        tokensUsed: queryEmbedding.tokens,
      });

      return finalResults.slice(0, searchQuery.limit || 10);
    } catch (error) {
      this.logger.error('Semantic search failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: searchQuery.query,
        vendorType: searchQuery.vendorType,
      });
      throw new Error(
        `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Enhance user search queries with wedding industry context
   * Improves search accuracy by adding relevant terminology
   */
  async enhanceSearchQuery(
    searchQuery: SearchQuery,
  ): Promise<QueryEnhancement> {
    try {
      const weddingContext = this.buildWeddingContext(searchQuery);

      const prompt = `You are a wedding industry expert helping improve search queries for wedding suppliers.

Original query: "${searchQuery.query}"
Vendor type: ${searchQuery.vendorType || 'unknown'}
Wedding context: ${JSON.stringify(searchQuery.weddingContext || {})}

Enhance this query by:
1. Adding relevant wedding industry terminology
2. Including specific vendor-related terms
3. Considering seasonal/regional context if provided
4. Making it more specific and searchable

Respond in JSON format:
{
  "enhancedQuery": "improved search query",
  "addedTerms": ["term1", "term2"],
  "reasoning": "brief explanation of enhancements"
}`;

      const response = await this.openai.chat.completions.create({
        model: this.MODEL_CHAT,
        messages: [
          {
            role: 'system',
            content: weddingContext,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      const enhancement = JSON.parse(
        response.choices[0].message.content || '{}',
      );

      return {
        originalQuery: searchQuery.query,
        enhancedQuery: enhancement.enhancedQuery || searchQuery.query,
        addedTerms: enhancement.addedTerms || [],
        reasoning: enhancement.reasoning || 'No enhancement applied',
      };
    } catch (error) {
      this.logger.warn('Query enhancement failed, using original query', {
        error: error instanceof Error ? error.message : 'Unknown error',
        originalQuery: searchQuery.query,
      });

      return {
        originalQuery: searchQuery.query,
        enhancedQuery: searchQuery.query,
        addedTerms: [],
        reasoning: 'Enhancement failed, using original query',
      };
    }
  }

  /**
   * Find similar content based on an existing article
   * Used for "Related Articles" functionality
   */
  async findSimilarContent(
    articleId: string,
    articleEmbedding: number[],
    options?: {
      excludeIds?: string[];
      limit?: number;
      minScore?: number;
    },
  ): Promise<SearchResult[]> {
    try {
      this.logger.info('Finding similar content', {
        articleId,
        embeddingLength: articleEmbedding.length,
        options,
      });

      // Get all articles except the current one and excluded ones
      const candidateArticles = await this.getCandidateArticlesForSimilarity(
        articleId,
        options?.excludeIds || [],
      );

      // Calculate similarity scores
      const similarResults = this.calculateSimilarityScores(
        articleEmbedding,
        candidateArticles,
        options?.minScore || 0.7,
      );

      const results = similarResults.slice(0, options?.limit || 5);

      this.logger.info('Similar content found', {
        articleId,
        similarCount: results.length,
        topScore: results[0]?.score || 0,
      });

      return results;
    } catch (error) {
      this.logger.error('Failed to find similar content', {
        error: error instanceof Error ? error.message : 'Unknown error',
        articleId,
      });
      throw new Error(
        `Similar content search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get search suggestions based on partial query
   * Used for autocomplete and query suggestion features
   */
  async getSearchSuggestions(
    partialQuery: string,
    vendorType?: string,
    limit: number = 5,
  ): Promise<string[]> {
    try {
      if (partialQuery.length < 2) {
        return [];
      }

      const contextTerms = vendorType
        ? this.WEDDING_CONTEXT_TERMS[
            vendorType as keyof typeof this.WEDDING_CONTEXT_TERMS
          ] || []
        : [];

      const prompt = `Suggest ${limit} search completions for wedding industry knowledge base.

Partial query: "${partialQuery}"
Vendor type: ${vendorType || 'any'}
Context terms: ${contextTerms.join(', ')}

Provide ${limit} relevant, specific search suggestions that wedding suppliers would commonly search for.
Focus on practical, actionable queries that would have helpful knowledge base articles.

Return only a JSON array of strings: ["suggestion1", "suggestion2", ...]`;

      const response = await this.openai.chat.completions.create({
        model: this.MODEL_CHAT,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 200,
      });

      const suggestions = JSON.parse(
        response.choices[0].message.content || '[]',
      );

      this.logger.info('Search suggestions generated', {
        partialQuery,
        vendorType,
        suggestionsCount: suggestions.length,
      });

      return Array.isArray(suggestions) ? suggestions.slice(0, limit) : [];
    } catch (error) {
      this.logger.warn('Failed to generate search suggestions', {
        error: error instanceof Error ? error.message : 'Unknown error',
        partialQuery,
      });
      return [];
    }
  }

  /**
   * Health check for OpenAI API connectivity
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // Simple embedding test
      await this.openai.embeddings.create({
        model: this.MODEL_EMBEDDING,
        input: 'health check test',
      });

      const responseTime = Date.now() - startTime;

      this.logger.info('OpenAI health check passed', { responseTime });

      return {
        status: 'healthy',
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error('OpenAI health check failed', {
        error: errorMessage,
        responseTime,
      });

      return {
        status: 'unhealthy',
        responseTime,
        error: errorMessage,
      };
    }
  }

  // Private helper methods

  private enhanceTextForEmbedding(
    text: string,
    context?: { vendorType?: string; category?: string },
  ): string {
    if (!context?.vendorType) {
      return text;
    }

    const contextTerms =
      this.WEDDING_CONTEXT_TERMS[
        context.vendorType as keyof typeof this.WEDDING_CONTEXT_TERMS
      ] || [];
    const contextPrefix = `Wedding ${context.vendorType} context: ${contextTerms.join(', ')}. `;

    return contextPrefix + text;
  }

  private buildWeddingContext(searchQuery: SearchQuery): string {
    return `You are WedSync AI, a specialized assistant for wedding industry professionals. 
You help wedding vendors (photographers, venues, florists, caterers, DJs, planners) with their business operations.

Key Guidelines:
- Always prioritize wedding day success and client satisfaction
- Understand seasonal wedding patterns and regional preferences  
- Be aware of common wedding vendor challenges (timeline management, client communication, budget constraints)
- Provide practical, actionable advice for wedding businesses
- Consider the stress and time-sensitive nature of wedding planning

${searchQuery.vendorType ? `Current vendor type: ${searchQuery.vendorType}` : ''}
${searchQuery.weddingContext?.weddingDate ? `Wedding timeframe: ${searchQuery.weddingContext.weddingDate}` : ''}
${searchQuery.weddingContext?.region ? `Region: ${searchQuery.weddingContext.region}` : ''}`;
  }

  private calculateSimilarityScores(
    queryEmbedding: number[],
    candidateArticles: any[],
    threshold: number,
  ): SearchResult[] {
    const results: SearchResult[] = [];

    for (const article of candidateArticles) {
      if (
        !article.embedding ||
        article.embedding.length !== queryEmbedding.length
      ) {
        continue;
      }

      const score = this.cosineSimilarity(queryEmbedding, article.embedding);

      if (score >= threshold) {
        results.push({
          ...article,
          score,
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private applyWeddingIndustryRanking(
    results: SearchResult[],
    searchQuery: SearchQuery,
  ): SearchResult[] {
    return results
      .map((result) => {
        let adjustedScore = result.score;

        // Boost scores for vendor-specific content
        if (
          searchQuery.vendorType &&
          result.vendorTypes.includes(searchQuery.vendorType)
        ) {
          adjustedScore *= 1.2;
        }

        // Boost recent content
        const daysSinceUpdate =
          (Date.now() - new Date(result.metadata.lastUpdated).getTime()) /
          (1000 * 60 * 60 * 24);
        if (daysSinceUpdate < 30) {
          adjustedScore *= 1.1;
        }

        // Boost beginner-friendly content for new users
        if (result.metadata.difficulty === 'beginner') {
          adjustedScore *= 1.05;
        }

        return {
          ...result,
          score: Math.min(adjustedScore, 1.0), // Cap at 1.0
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  // Mock database methods - these would be replaced with actual Supabase queries
  private async getCandidateArticles(searchQuery: SearchQuery): Promise<any[]> {
    // This would query the knowledge_base_articles table in Supabase
    // For now, return mock data structure
    return [];
  }

  private async getCandidateArticlesForSimilarity(
    excludeId: string,
    excludeIds: string[],
  ): Promise<any[]> {
    // This would query articles excluding specified IDs
    return [];
  }
}

export default AISearchService;
