import { z } from 'zod';

// Knowledge Base Article Schema
export const KnowledgeArticleSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().optional(),
  category: z.enum([
    'timeline',
    'venue',
    'photography',
    'catering',
    'florist',
    'music',
    'transport',
    'general',
  ]),
  tags: z.array(z.string()).default([]),
  author_id: z.string(),
  organization_id: z.string(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  ai_generated: z.boolean().default(false),
  ai_confidence_score: z.number().min(0).max(1).optional(),
  ai_model_used: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  view_count: z.number().default(0),
  like_count: z.number().default(0),
  share_count: z.number().default(0),
  search_keywords: z.array(z.string()).default([]),
  is_featured: z.boolean().default(false),
});

export type KnowledgeArticle = z.infer<typeof KnowledgeArticleSchema>;

// Search Configuration
export const SearchConfigSchema = z.object({
  query: z.string(),
  category: z
    .enum([
      'all',
      'timeline',
      'venue',
      'photography',
      'catering',
      'florist',
      'music',
      'transport',
      'general',
    ])
    .default('all'),
  tags: z.array(z.string()).default([]),
  sort_by: z.enum(['relevance', 'date', 'views', 'likes']).default('relevance'),
  limit: z.number().min(1).max(50).default(10),
  offset: z.number().min(0).default(0),
  include_ai_generated: z.boolean().default(true),
  min_confidence_score: z.number().min(0).max(1).optional(),
});

export type SearchConfig = z.infer<typeof SearchConfigSchema>;

// Search Results
export interface SearchResult {
  articles: KnowledgeArticle[];
  total_count: number;
  suggestions: string[];
  related_tags: string[];
  ai_recommendations: AIRecommendation[];
}

// AI Recommendations
export interface AIRecommendation {
  type: 'article' | 'template' | 'checklist' | 'workflow';
  title: string;
  description: string;
  confidence_score: number;
  article_id?: string;
  action_url?: string;
  preview_content?: string;
}

// Content Suggestions
export interface ContentSuggestion {
  id: string;
  type: 'improvement' | 'addition' | 'related' | 'trending';
  title: string;
  description: string;
  suggested_content: string;
  category: KnowledgeArticle['category'];
  confidence_score: number;
  based_on: string[]; // IDs of articles this suggestion is based on
  created_at: string;
  status: 'pending' | 'accepted' | 'rejected' | 'implemented';
}

// Knowledge Editor Configuration
export interface EditorConfig {
  mode: 'create' | 'edit';
  article_id?: string;
  enable_ai_assistance: boolean;
  auto_save_interval: number; // seconds
  ai_suggestions_enabled: boolean;
  template_suggestions: boolean;
  grammar_check: boolean;
  plagiarism_check: boolean;
}

// Auto-complete suggestions
export interface AutocompleteSuggestion {
  text: string;
  type: 'keyword' | 'phrase' | 'title' | 'tag';
  frequency: number;
  category?: KnowledgeArticle['category'];
}

// Knowledge Base Analytics
export interface KnowledgeBaseAnalytics {
  total_articles: number;
  published_articles: number;
  draft_articles: number;
  ai_generated_percentage: number;
  most_viewed_categories: Array<{ category: string; views: number }>;
  most_searched_terms: Array<{ term: string; frequency: number }>;
  trending_topics: Array<{ topic: string; growth_rate: number }>;
  user_engagement: {
    average_time_on_article: number;
    bounce_rate: number;
    most_liked_articles: KnowledgeArticle[];
  };
}

// Smart Search Props
export interface SmartSearchProps {
  placeholder?: string;
  onSearch: (query: string, config?: Partial<SearchConfig>) => void;
  onSuggestionSelect: (suggestion: AutocompleteSuggestion) => void;
  loading?: boolean;
  suggestions?: AutocompleteSuggestion[];
  recent_searches?: string[];
  className?: string;
  show_filters?: boolean;
  enable_voice_search?: boolean;
}

// Knowledge Base Panel Props
export interface KnowledgeBasePanelProps {
  organization_id: string;
  user_id: string;
  initial_category?: KnowledgeArticle['category'];
  show_create_button?: boolean;
  show_analytics?: boolean;
  enable_ai_features?: boolean;
  max_results_per_page?: number;
  className?: string;
  onArticleSelect?: (article: KnowledgeArticle) => void;
  onCreateNew?: () => void;
}

// Content Suggestions Props
export interface ContentSuggestionsProps {
  organization_id: string;
  current_article_id?: string;
  suggestion_types?: ContentSuggestion['type'][];
  max_suggestions?: number;
  onSuggestionAccept: (suggestion: ContentSuggestion) => void;
  onSuggestionReject: (suggestion_id: string) => void;
  className?: string;
}

// Knowledge Editor Props
export interface KnowledgeEditorProps {
  config: EditorConfig;
  initial_article?: Partial<KnowledgeArticle>;
  on_save: (article: KnowledgeArticle) => Promise<void>;
  on_cancel: () => void;
  auto_save?: boolean;
  className?: string;
  organization_id: string;
  user_id: string;
}

// API Response Types
export interface KnowledgeBaseAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface SearchAPIResponse
  extends KnowledgeBaseAPIResponse<SearchResult> {}
export interface ArticleAPIResponse
  extends KnowledgeBaseAPIResponse<KnowledgeArticle> {}
export interface SuggestionsAPIResponse
  extends KnowledgeBaseAPIResponse<ContentSuggestion[]> {}
export interface AnalyticsAPIResponse
  extends KnowledgeBaseAPIResponse<KnowledgeBaseAnalytics> {}

// Validation Schemas for API
export const CreateArticleSchema = KnowledgeArticleSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  view_count: true,
  like_count: true,
  share_count: true,
});

export const UpdateArticleSchema = KnowledgeArticleSchema.partial().omit({
  id: true,
  created_at: true,
  author_id: true,
  organization_id: true,
});

export type CreateArticleRequest = z.infer<typeof CreateArticleSchema>;
export type UpdateArticleRequest = z.infer<typeof UpdateArticleSchema>;
