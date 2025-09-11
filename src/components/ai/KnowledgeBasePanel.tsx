'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Filter,
  Grid,
  List,
  BarChart3,
  Star,
  Eye,
  Heart,
  Share2,
  TrendingUp,
  Calendar,
  User,
  Tag,
  Sparkles,
  RefreshCw,
  ChevronRight,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import SmartSearch from './SmartSearch';
import {
  KnowledgeBasePanelProps,
  KnowledgeArticle,
  SearchConfig,
  SearchResult,
  AutocompleteSuggestion,
  KnowledgeBaseAnalytics,
  AIRecommendation,
} from '@/types/knowledge-base';

/**
 * KnowledgeBasePanel Component - AI-powered knowledge search and management
 * Part of WS-210: AI Knowledge Base System
 *
 * Real Wedding Scenario:
 * A photographer searches "timeline for outdoor ceremony" and gets:
 * - AI-curated results from their knowledge base
 * - Industry best practices
 * - Suggestions to add venue-specific timing considerations
 * - Related articles and templates
 * - Performance analytics and trends
 */
export default function KnowledgeBasePanel({
  organization_id,
  user_id,
  initial_category,
  show_create_button = true,
  show_analytics = true,
  enable_ai_features = true,
  max_results_per_page = 12,
  className,
  onArticleSelect,
  onCreateNew,
}: KnowledgeBasePanelProps) {
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState(
    initial_category || 'all',
  );
  const [analytics, setAnalytics] = useState<KnowledgeBaseAnalytics | null>(
    null,
  );
  const [featuredArticles, setFeaturedArticles] = useState<KnowledgeArticle[]>(
    [],
  );
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Mock data for development - replace with actual API calls
  const mockSuggestions: AutocompleteSuggestion[] = [
    {
      text: 'outdoor ceremony timeline',
      type: 'phrase',
      frequency: 45,
      category: 'timeline',
    },
    {
      text: 'reception planning',
      type: 'phrase',
      frequency: 38,
      category: 'timeline',
    },
    {
      text: 'vendor coordination',
      type: 'phrase',
      frequency: 32,
      category: 'general',
    },
    {
      text: 'photography schedule',
      type: 'phrase',
      frequency: 28,
      category: 'photography',
    },
    {
      text: 'catering requirements',
      type: 'phrase',
      frequency: 25,
      category: 'catering',
    },
  ];

  const mockAnalytics: KnowledgeBaseAnalytics = {
    total_articles: 156,
    published_articles: 142,
    draft_articles: 14,
    ai_generated_percentage: 35.2,
    most_viewed_categories: [
      { category: 'timeline', views: 2341 },
      { category: 'photography', views: 1876 },
      { category: 'venue', views: 1654 },
    ],
    most_searched_terms: [
      { term: 'outdoor ceremony', frequency: 89 },
      { term: 'reception setup', frequency: 76 },
      { term: 'vendor management', frequency: 64 },
    ],
    trending_topics: [
      { topic: 'Sustainable weddings', growth_rate: 45.2 },
      { topic: 'Micro ceremonies', growth_rate: 38.7 },
      { topic: 'Digital planning', growth_rate: 31.9 },
    ],
    user_engagement: {
      average_time_on_article: 4.2,
      bounce_rate: 0.23,
      most_liked_articles: [],
    },
  };

  // Initialize component
  useEffect(() => {
    loadFeaturedArticles();
    loadAnalytics();
    setSuggestions(mockSuggestions);
  }, [organization_id]);

  // Load featured articles
  const loadFeaturedArticles = useCallback(async () => {
    try {
      // Mock featured articles - replace with actual API call
      const mockFeatured: KnowledgeArticle[] = [
        {
          id: '1',
          title: 'Perfect Outdoor Ceremony Timeline',
          content: 'Complete guide to planning outdoor wedding ceremonies...',
          excerpt:
            'Essential timeline for outdoor weddings including weather contingencies and vendor coordination.',
          category: 'timeline',
          tags: ['outdoor', 'ceremony', 'planning', 'weather'],
          author_id: user_id,
          organization_id,
          status: 'published',
          ai_generated: false,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-20T15:30:00Z',
          view_count: 245,
          like_count: 32,
          share_count: 8,
          search_keywords: ['outdoor', 'ceremony', 'timeline', 'planning'],
          is_featured: true,
        },
        {
          id: '2',
          title: 'Vendor Coordination Best Practices',
          content:
            'AI-generated guide for managing multiple wedding vendors...',
          excerpt:
            'Streamline vendor communication and coordination with proven strategies.',
          category: 'general',
          tags: ['vendors', 'coordination', 'communication'],
          author_id: user_id,
          organization_id,
          status: 'published',
          ai_generated: true,
          ai_confidence_score: 0.87,
          ai_model_used: 'gpt-4',
          created_at: '2024-01-18T14:00:00Z',
          updated_at: '2024-01-18T14:00:00Z',
          view_count: 189,
          like_count: 28,
          share_count: 12,
          search_keywords: [
            'vendor',
            'coordination',
            'communication',
            'management',
          ],
          is_featured: true,
        },
      ];
      setFeaturedArticles(mockFeatured);
    } catch (error) {
      console.error('Error loading featured articles:', error);
    }
  }, [organization_id, user_id]);

  // Load analytics
  const loadAnalytics = useCallback(async () => {
    if (show_analytics) {
      try {
        setAnalytics(mockAnalytics);
      } catch (error) {
        console.error('Error loading analytics:', error);
      }
    }
  }, [show_analytics]);

  // Handle search
  const handleSearch = useCallback(
    async (query: string, config?: Partial<SearchConfig>) => {
      setLoading(true);
      try {
        // Mock search results - replace with actual API call
        const mockResults: SearchResult = {
          articles: [
            {
              id: '3',
              title: 'Outdoor Ceremony Setup Guide',
              content: 'Detailed setup instructions for outdoor ceremonies...',
              excerpt:
                'Step-by-step guide for setting up beautiful outdoor wedding ceremonies.',
              category: 'venue',
              tags: ['outdoor', 'setup', 'ceremony', 'venue'],
              author_id: user_id,
              organization_id,
              status: 'published',
              ai_generated: false,
              created_at: '2024-01-10T09:00:00Z',
              updated_at: '2024-01-15T11:00:00Z',
              view_count: 156,
              like_count: 19,
              share_count: 5,
              search_keywords: ['outdoor', 'ceremony', 'setup', 'venue'],
              is_featured: false,
            },
          ],
          total_count: 1,
          suggestions: [
            'outdoor venue setup',
            'ceremony decoration',
            'weather backup plans',
          ],
          related_tags: ['outdoor', 'ceremony', 'venue', 'setup', 'decoration'],
          ai_recommendations: [
            {
              type: 'article',
              title: 'Weather Contingency Planning',
              description:
                'Consider adding information about backup plans for outdoor ceremonies.',
              confidence_score: 0.92,
              article_id: '4',
            },
          ],
        };

        setSearchResults(mockResults);

        // Add to recent searches
        if (!recentSearches.includes(query)) {
          setRecentSearches((prev) => [query, ...prev.slice(0, 4)]);
        }
      } catch (error) {
        console.error('Error searching knowledge base:', error);
      } finally {
        setLoading(false);
      }
    },
    [organization_id, user_id, recentSearches],
  );

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback(
    (suggestion: AutocompleteSuggestion) => {
      handleSearch(suggestion.text);
    },
    [handleSearch],
  );

  // Handle article selection
  const handleArticleClick = useCallback(
    (article: KnowledgeArticle) => {
      onArticleSelect?.(article);
    },
    [onArticleSelect],
  );

  // Render article card
  const renderArticleCard = useCallback(
    (article: KnowledgeArticle, index: number) => (
      <Card
        key={article.id}
        className={cn(
          'group hover:shadow-md transition-all duration-200 cursor-pointer',
          viewMode === 'grid' ? 'h-full' : 'mb-3',
        )}
        onClick={() => handleArticleClick(article)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base line-clamp-2 group-hover:text-blue-600 transition-colors">
                {article.title}
              </CardTitle>
              {article.excerpt && (
                <CardDescription className="mt-1 line-clamp-2">
                  {article.excerpt}
                </CardDescription>
              )}
            </div>
            {article.ai_generated && (
              <Badge
                variant="outline"
                className="ml-2 flex items-center gap-1 shrink-0"
              >
                <Sparkles className="h-3 w-3" />
                AI
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-1 mb-3">
            <Badge variant="secondary" className="capitalize">
              {article.category}
            </Badge>
            {article.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {article.view_count}
              </div>
              <div className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                {article.like_count}
              </div>
              <div className="flex items-center gap-1">
                <Share2 className="h-3 w-3" />
                {article.share_count}
              </div>
            </div>
            <div className="text-xs">
              {new Date(article.updated_at).toLocaleDateString()}
            </div>
          </div>
        </CardContent>
      </Card>
    ),
    [viewMode, handleArticleClick],
  );

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <BookOpen className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Knowledge Base</h2>
            <p className="text-sm text-muted-foreground">
              AI-powered wedding planning knowledge and best practices
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {show_create_button && (
            <Button onClick={onCreateNew} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Article
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <SmartSearch
        onSearch={handleSearch}
        onSuggestionSelect={handleSuggestionSelect}
        loading={loading}
        suggestions={suggestions}
        recent_searches={recentSearches}
        show_filters={true}
        enable_voice_search={true}
      />

      {/* Content Tabs */}
      <Tabs defaultValue="articles" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="articles">Articles</TabsTrigger>
          <TabsTrigger value="featured">Featured</TabsTrigger>
          {show_analytics && (
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          )}
        </TabsList>

        {/* Articles Tab */}
        <TabsContent value="articles" className="space-y-4">
          {/* View Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {searchResults
                  ? `${searchResults.total_count} results`
                  : 'Browse articles'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search Results or Default Content */}
          {searchResults ? (
            <div className="space-y-4">
              {/* AI Recommendations */}
              {enable_ai_features &&
                searchResults.ai_recommendations.length > 0 && (
                  <Card className="border-blue-200 bg-blue-50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-blue-600" />
                        AI Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {searchResults.ai_recommendations.map((rec, index) => (
                          <div
                            key={index}
                            className="p-3 bg-white rounded-lg border"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">
                                  {rec.title}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {rec.description}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {Math.round(rec.confidence_score * 100)}% match
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* Articles Grid/List */}
              <div
                className={cn(
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                    : 'space-y-3',
                )}
              >
                {searchResults.articles.map(renderArticleCard)}
              </div>

              {/* Related Tags */}
              {searchResults.related_tags.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Related Tags</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-2">
                      {searchResults.related_tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="cursor-pointer hover:bg-blue-50"
                          onClick={() => handleSearch(tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Search Knowledge Base
              </h3>
              <p className="text-muted-foreground">
                Search for wedding planning guides, best practices, and vendor
                coordination tips
              </p>
            </div>
          )}
        </TabsContent>

        {/* Featured Tab */}
        <TabsContent value="featured" className="space-y-4">
          <div
            className={cn(
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'space-y-3',
            )}
          >
            {featuredArticles.map(renderArticleCard)}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        {show_analytics && (
          <TabsContent value="analytics" className="space-y-4">
            {analytics && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Overview Stats */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      Content Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total Articles</span>
                      <span className="font-medium">
                        {analytics.total_articles}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Published</span>
                      <span className="font-medium text-green-600">
                        {analytics.published_articles}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">AI Generated</span>
                      <span className="font-medium text-blue-600">
                        {analytics.ai_generated_percentage}%
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Top Categories */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Top Categories</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    {analytics.most_viewed_categories.map((cat, index) => (
                      <div
                        key={cat.category}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm capitalize">
                          {cat.category}
                        </span>
                        <span className="font-medium">
                          {cat.views.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Trending Topics */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Trending Topics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    {analytics.trending_topics.map((topic, index) => (
                      <div
                        key={topic.topic}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm">{topic.topic}</span>
                        <Badge variant="outline" className="text-xs">
                          +{topic.growth_rate}%
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
