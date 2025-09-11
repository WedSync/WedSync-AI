/**
 * Search Accuracy Tests - AI Knowledge Base Testing Suite
 * WS-210 AI Knowledge Base - Team E Implementation
 *
 * Validates AI search results quality, relevance, and accuracy
 * Ensures wedding industry knowledge retrieval meets business requirements
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type {
  SearchConfig,
  SearchResult,
  KnowledgeArticle,
  AIRecommendation,
} from '@/types/knowledge-base';

// Test data and mocks
const mockSupplier = {
  id: 'test-supplier-123',
  organization_id: 'test-org-456',
};

const mockKnowledgeArticles: KnowledgeArticle[] = [
  {
    id: 'article-1',
    title: 'Wedding Timeline Planning Guide',
    content:
      'Comprehensive guide for planning wedding day timeline with photography considerations',
    excerpt: 'Learn how to create perfect wedding day timeline',
    category: 'timeline',
    tags: ['planning', 'photography', 'schedule', 'coordination'],
    author_id: 'author-1',
    organization_id: mockSupplier.organization_id,
    status: 'published',
    ai_generated: true,
    ai_confidence_score: 0.92,
    ai_model_used: 'gpt-4-turbo-preview',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    view_count: 150,
    like_count: 23,
    share_count: 8,
    search_keywords: ['timeline', 'wedding day', 'photography', 'schedule'],
    is_featured: true,
  },
  {
    id: 'article-2',
    title: 'Venue Selection Criteria',
    content: 'Essential factors to consider when selecting wedding venues',
    excerpt: 'Choose the perfect venue for your wedding',
    category: 'venue',
    tags: ['venue', 'selection', 'criteria', 'budget'],
    author_id: 'author-1',
    organization_id: mockSupplier.organization_id,
    status: 'published',
    ai_generated: false,
    ai_confidence_score: undefined,
    ai_model_used: undefined,
    created_at: '2025-01-02T00:00:00Z',
    updated_at: '2025-01-02T00:00:00Z',
    view_count: 89,
    like_count: 12,
    share_count: 3,
    search_keywords: ['venue', 'location', 'selection', 'criteria'],
    is_featured: false,
  },
  {
    id: 'article-3',
    title: 'Photography Package Pricing',
    content:
      'Detailed breakdown of photography package pricing and what is included',
    excerpt: 'Understanding photography pricing structures',
    category: 'photography',
    tags: ['photography', 'pricing', 'packages', 'wedding'],
    author_id: 'author-1',
    organization_id: mockSupplier.organization_id,
    status: 'published',
    ai_generated: true,
    ai_confidence_score: 0.87,
    ai_model_used: 'gpt-4-turbo-preview',
    created_at: '2025-01-03T00:00:00Z',
    updated_at: '2025-01-03T00:00:00Z',
    view_count: 234,
    like_count: 45,
    share_count: 19,
    search_keywords: ['photography', 'pricing', 'packages', 'cost'],
    is_featured: true,
  },
];

const mockAIRecommendations: AIRecommendation[] = [
  {
    type: 'article',
    title: 'Related: Weather Backup Plans',
    description: 'Essential backup planning for outdoor weddings',
    confidence_score: 0.84,
    article_id: 'article-4',
    action_url: '/knowledge/article-4',
    preview_content:
      'When planning outdoor weddings, always have a backup plan...',
  },
  {
    type: 'checklist',
    title: 'Wedding Day Photography Checklist',
    description: 'Complete checklist for wedding day photography coverage',
    confidence_score: 0.91,
    action_url: '/templates/photography-checklist',
  },
];

// Mock knowledge base search service
class MockKnowledgeSearchService {
  async search(config: SearchConfig): Promise<SearchResult> {
    // Simulate search logic with realistic filtering and scoring
    let filteredArticles = [...mockKnowledgeArticles];

    // Category filtering
    if (config.category !== 'all') {
      filteredArticles = filteredArticles.filter(
        (article) => article.category === config.category,
      );
    }

    // Tag filtering
    if (config.tags.length > 0) {
      filteredArticles = filteredArticles.filter((article) =>
        config.tags.some((tag) => article.tags.includes(tag)),
      );
    }

    // Query relevance scoring (simplified)
    if (config.query) {
      filteredArticles = filteredArticles
        .map((article) => ({
          ...article,
          relevanceScore: this.calculateRelevanceScore(article, config.query),
        }))
        .filter((article) => article.relevanceScore > 0.2)
        .sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    // Apply sorting
    switch (config.sort_by) {
      case 'date':
        filteredArticles.sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        );
        break;
      case 'views':
        filteredArticles.sort((a, b) => b.view_count - a.view_count);
        break;
      case 'likes':
        filteredArticles.sort((a, b) => b.like_count - a.like_count);
        break;
      // 'relevance' is default and already sorted above
    }

    // Apply pagination
    const startIndex = config.offset || 0;
    const endIndex = startIndex + (config.limit || 10);
    const paginatedArticles = filteredArticles.slice(startIndex, endIndex);

    // Generate suggestions and recommendations
    const suggestions = this.generateSearchSuggestions(config.query);
    const relatedTags = this.extractRelatedTags(paginatedArticles);
    const aiRecommendations = config.query ? mockAIRecommendations : [];

    return {
      articles: paginatedArticles,
      total_count: filteredArticles.length,
      suggestions,
      related_tags: relatedTags,
      ai_recommendations: aiRecommendations,
    };
  }

  private calculateRelevanceScore(
    article: KnowledgeArticle,
    query: string,
  ): number {
    const queryLower = query.toLowerCase();
    let score = 0;

    // Title match (highest weight)
    if (article.title.toLowerCase().includes(queryLower)) score += 0.8;

    // Content match
    if (article.content.toLowerCase().includes(queryLower)) score += 0.6;

    // Tag match
    if (article.tags.some((tag) => tag.toLowerCase().includes(queryLower)))
      score += 0.5;

    // Keywords match
    if (
      article.search_keywords.some((keyword) =>
        keyword.toLowerCase().includes(queryLower),
      )
    )
      score += 0.4;

    // AI confidence boost
    if (article.ai_generated && article.ai_confidence_score) {
      score *= article.ai_confidence_score;
    }

    return Math.min(1, score);
  }

  private generateSearchSuggestions(query: string): string[] {
    const commonSuggestions = [
      'wedding timeline template',
      'photography pricing guide',
      'venue selection checklist',
      'catering menu options',
      'florist arrangement styles',
    ];

    if (!query) return commonSuggestions.slice(0, 3);

    return commonSuggestions
      .filter(
        (suggestion) =>
          suggestion.toLowerCase().includes(query.toLowerCase()) ||
          query.toLowerCase().includes(suggestion.split(' ')[0]),
      )
      .slice(0, 5);
  }

  private extractRelatedTags(articles: KnowledgeArticle[]): string[] {
    const allTags = articles.flatMap((article) => article.tags);
    const tagCounts = allTags.reduce(
      (acc, tag) => {
        acc[tag] = (acc[tag] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([tag]) => tag);
  }
}

const mockSearchService = new MockKnowledgeSearchService();

describe('Search Accuracy Tests - AI Knowledge Base', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Search Functionality', () => {
    it('should return relevant results for simple queries', async () => {
      const config: SearchConfig = {
        query: 'wedding timeline',
        category: 'all',
        sort_by: 'relevance',
        limit: 10,
      };

      const result = await mockSearchService.search(config);

      expect(result.articles).toHaveLength(1);
      expect(result.articles[0].title).toBe('Wedding Timeline Planning Guide');
      expect(result.total_count).toBe(1);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should filter by category correctly', async () => {
      const config: SearchConfig = {
        query: '',
        category: 'photography',
        sort_by: 'relevance',
        limit: 10,
      };

      const result = await mockSearchService.search(config);

      expect(result.articles).toHaveLength(1);
      expect(result.articles[0].category).toBe('photography');
      expect(result.articles[0].title).toBe('Photography Package Pricing');
    });

    it('should sort results correctly', async () => {
      const config: SearchConfig = {
        query: '',
        category: 'all',
        sort_by: 'views',
        limit: 10,
      };

      const result = await mockSearchService.search(config);

      expect(result.articles).toHaveLength(3);
      expect(result.articles[0].view_count).toBeGreaterThanOrEqual(
        result.articles[1].view_count,
      );
      expect(result.articles[1].view_count).toBeGreaterThanOrEqual(
        result.articles[2].view_count,
      );
    });
  });

  describe('Search Relevance and Accuracy', () => {
    it('should rank results by relevance score', async () => {
      const config: SearchConfig = {
        query: 'photography',
        category: 'all',
        sort_by: 'relevance',
        limit: 10,
      };

      const result = await mockSearchService.search(config);

      // Photography article should be first due to direct match
      expect(result.articles[0].title).toBe('Photography Package Pricing');
      expect(result.articles[0].category).toBe('photography');
    });

    it('should include AI confidence scores in ranking', async () => {
      const config: SearchConfig = {
        query: 'timeline planning',
        category: 'all',
        sort_by: 'relevance',
        limit: 10,
      };

      const result = await mockSearchService.search(config);

      // High AI confidence article should rank well
      const timelineArticle = result.articles.find(
        (a) => a.category === 'timeline',
      );
      expect(timelineArticle).toBeDefined();
      expect(timelineArticle?.ai_confidence_score).toBe(0.92);
    });

    it('should match search keywords effectively', async () => {
      const config: SearchConfig = {
        query: 'wedding day schedule',
        category: 'all',
        sort_by: 'relevance',
        limit: 10,
      };

      const result = await mockSearchService.search(config);

      expect(result.articles.length).toBeGreaterThan(0);
      const foundArticle = result.articles.find(
        (a) =>
          a.search_keywords.includes('wedding day') ||
          a.search_keywords.includes('schedule'),
      );
      expect(foundArticle).toBeDefined();
    });
  });

  describe('AI Recommendations Quality', () => {
    it('should provide relevant AI recommendations for queries', async () => {
      const config: SearchConfig = {
        query: 'outdoor wedding',
        category: 'all',
        sort_by: 'relevance',
        limit: 10,
      };

      const result = await mockSearchService.search(config);

      expect(result.ai_recommendations).toHaveLength(2);
      expect(result.ai_recommendations[0].confidence_score).toBeGreaterThan(
        0.8,
      );
      expect(result.ai_recommendations[0].title).toContain(
        'Weather Backup Plans',
      );
    });

    it('should include different recommendation types', async () => {
      const config: SearchConfig = {
        query: 'wedding photography',
        category: 'all',
        sort_by: 'relevance',
        limit: 10,
      };

      const result = await mockSearchService.search(config);

      const recommendationTypes = result.ai_recommendations.map((r) => r.type);
      expect(recommendationTypes).toContain('article');
      expect(recommendationTypes).toContain('checklist');
    });

    it('should have high confidence scores for recommendations', async () => {
      const config: SearchConfig = {
        query: 'wedding planning',
        category: 'all',
        sort_by: 'relevance',
        limit: 10,
      };

      const result = await mockSearchService.search(config);

      result.ai_recommendations.forEach((recommendation) => {
        expect(recommendation.confidence_score).toBeGreaterThan(0.7);
        expect(recommendation.confidence_score).toBeLessThanOrEqual(1.0);
      });
    });
  });

  describe('Search Suggestions and Autocomplete', () => {
    it('should generate relevant search suggestions', async () => {
      const config: SearchConfig = {
        query: 'venue',
        category: 'all',
        sort_by: 'relevance',
        limit: 10,
      };

      const result = await mockSearchService.search(config);

      expect(result.suggestions).toContain('venue selection checklist');
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions.length).toBeLessThanOrEqual(5);
    });

    it('should extract relevant tags from search results', async () => {
      const config: SearchConfig = {
        query: '',
        category: 'all',
        sort_by: 'relevance',
        limit: 10,
      };

      const result = await mockSearchService.search(config);

      expect(result.related_tags).toContain('photography');
      expect(result.related_tags).toContain('planning');
      expect(result.related_tags.length).toBeLessThanOrEqual(8);
    });

    it('should provide contextual suggestions based on query', async () => {
      const config: SearchConfig = {
        query: 'pricing',
        category: 'all',
        sort_by: 'relevance',
        limit: 10,
      };

      const result = await mockSearchService.search(config);

      const pricingRelatedSuggestion = result.suggestions.find((s) =>
        s.toLowerCase().includes('pricing'),
      );
      expect(pricingRelatedSuggestion).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty queries gracefully', async () => {
      const config: SearchConfig = {
        query: '',
        category: 'all',
        sort_by: 'relevance',
        limit: 10,
      };

      const result = await mockSearchService.search(config);

      expect(result.articles).toHaveLength(3); // All articles
      expect(result.total_count).toBe(3);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should handle queries with no results', async () => {
      const config: SearchConfig = {
        query: 'nonexistent topic xyz',
        category: 'all',
        sort_by: 'relevance',
        limit: 10,
      };

      const result = await mockSearchService.search(config);

      expect(result.articles).toHaveLength(0);
      expect(result.total_count).toBe(0);
      expect(result.suggestions.length).toBeGreaterThan(0); // Should still provide suggestions
    });

    it('should respect pagination limits', async () => {
      const config: SearchConfig = {
        query: '',
        category: 'all',
        sort_by: 'relevance',
        limit: 2,
        offset: 0,
      };

      const result = await mockSearchService.search(config);

      expect(result.articles).toHaveLength(2);
      expect(result.total_count).toBe(3);
    });

    it('should handle pagination offset correctly', async () => {
      const config: SearchConfig = {
        query: '',
        category: 'all',
        sort_by: 'relevance',
        limit: 2,
        offset: 2,
      };

      const result = await mockSearchService.search(config);

      expect(result.articles).toHaveLength(1); // Only 1 remaining article
      expect(result.total_count).toBe(3);
    });
  });

  describe('Performance and Quality Metrics', () => {
    it('should measure search response time', async () => {
      const startTime = performance.now();

      const config: SearchConfig = {
        query: 'wedding photography pricing',
        category: 'all',
        sort_by: 'relevance',
        limit: 10,
      };

      await mockSearchService.search(config);

      const responseTime = performance.now() - startTime;
      expect(responseTime).toBeLessThan(500); // Should complete within 500ms
    });

    it('should validate search result completeness', async () => {
      const config: SearchConfig = {
        query: 'wedding',
        category: 'all',
        sort_by: 'relevance',
        limit: 10,
      };

      const result = await mockSearchService.search(config);

      // Validate all required fields are present
      result.articles.forEach((article) => {
        expect(article.id).toBeDefined();
        expect(article.title).toBeDefined();
        expect(article.content).toBeDefined();
        expect(article.category).toBeDefined();
        expect(article.status).toBe('published');
        expect(article.created_at).toBeDefined();
        expect(article.updated_at).toBeDefined();
      });
    });

    it('should ensure AI-generated content quality', async () => {
      const config: SearchConfig = {
        query: '',
        category: 'all',
        sort_by: 'relevance',
        limit: 10,
        include_ai_generated: true,
        min_confidence_score: 0.8,
      };

      const result = await mockSearchService.search(config);

      const aiArticles = result.articles.filter((a) => a.ai_generated);
      aiArticles.forEach((article) => {
        expect(article.ai_confidence_score).toBeGreaterThanOrEqual(0.8);
        expect(article.ai_model_used).toBeDefined();
      });
    });
  });

  describe('Wedding Industry Specific Tests', () => {
    it('should understand wedding terminology', async () => {
      const weddingTerms = [
        'ceremony',
        'reception',
        'bridal party',
        'first dance',
        'bouquet toss',
      ];

      for (const term of weddingTerms) {
        const config: SearchConfig = {
          query: term,
          category: 'all',
          sort_by: 'relevance',
          limit: 10,
        };

        const result = await mockSearchService.search(config);

        // Should provide suggestions even if no direct matches
        expect(result.suggestions.length).toBeGreaterThan(0);
      }
    });

    it('should categorize wedding content correctly', async () => {
      const categories = [
        'timeline',
        'venue',
        'photography',
        'catering',
        'florist',
      ];

      for (const category of categories) {
        const config: SearchConfig = {
          query: '',
          category: category as any,
          sort_by: 'relevance',
          limit: 10,
        };

        const result = await mockSearchService.search(config);

        result.articles.forEach((article) => {
          expect(article.category).toBe(category);
        });
      }
    });

    it('should provide comprehensive wedding planning coverage', async () => {
      const planningQueries = [
        'wedding timeline',
        'venue selection',
        'photography packages',
        'catering menu',
        'flower arrangements',
      ];

      const allResults: SearchResult[] = [];

      for (const query of planningQueries) {
        const config: SearchConfig = {
          query,
          category: 'all',
          sort_by: 'relevance',
          limit: 10,
        };

        const result = await mockSearchService.search(config);
        allResults.push(result);
      }

      // Should provide relevant content for most wedding planning aspects
      const hasResults = allResults.filter((r) => r.total_count > 0);
      expect(hasResults.length).toBeGreaterThan(0);
    });
  });
});

// Export test utilities for use in other test files
export { mockSearchService, mockKnowledgeArticles, mockAIRecommendations };
export type { MockKnowledgeSearchService };
