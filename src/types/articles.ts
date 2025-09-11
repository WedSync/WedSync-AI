/**
 * Article Creation System Types
 * Team C Round 3 - WS-069: Educational Content Management
 * Integration with Round 1 Branding + Round 2 Documents
 */

// Core Article Types
export interface Article {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  content: object; // Tiptap JSON content
  content_html: string; // Rendered HTML
  excerpt: string;
  featured_image_url?: string;
  status: ArticleStatus;
  category_ids: string[];
  tags: string[];

  // SEO Optimization
  seo_title?: string;
  seo_description?: string;
  seo_keywords: string[];
  seo_score: number;
  meta_image_url?: string;

  // Publishing
  published_at?: string;
  scheduled_publish_at?: string;
  is_featured: boolean;
  reading_time_minutes: number;

  // Distribution
  distribution_rules: ContentDistributionRule[];
  target_wedding_types: WeddingType[];
  target_client_segments: ClientSegment[];

  // Analytics
  view_count: number;
  engagement_score: number;
  shares_count: number;
  average_read_time: number;
  bounce_rate: number;

  // Integration with Rounds 1 & 2
  branding_config_id?: string; // Round 1 integration
  attached_documents: string[]; // Round 2 integration

  // Timestamps
  created_at: string;
  updated_at: string;
  last_published_at?: string;
}

export type ArticleStatus =
  | 'draft'
  | 'review'
  | 'scheduled'
  | 'published'
  | 'archived';

export interface ArticleCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  icon: string;
  sort_order: number;
  article_count: number;
  created_at: string;
}

// Content Distribution
export interface ContentDistributionRule {
  id: string;
  condition_type: DistributionConditionType;
  condition_value: string | string[];
  priority: number;
  is_active: boolean;
}

export type DistributionConditionType =
  | 'wedding_month'
  | 'wedding_season'
  | 'budget_range'
  | 'guest_count'
  | 'venue_type'
  | 'planning_stage'
  | 'client_tags'
  | 'vendor_category';

export type WeddingType =
  | 'traditional'
  | 'modern'
  | 'rustic'
  | 'beach'
  | 'garden'
  | 'destination'
  | 'intimate'
  | 'luxury';

export type ClientSegment =
  | 'early_planners'
  | 'last_minute'
  | 'budget_conscious'
  | 'luxury_focused'
  | 'eco_friendly'
  | 'tech_savvy'
  | 'traditional_values';

// Editor and Content
export interface EditorConfig {
  extensions: string[];
  toolbar_items: ToolbarItem[];
  autosave_interval: number;
  max_file_size: number;
  allowed_file_types: string[];
  image_optimization: ImageOptimizationConfig;
}

export interface ToolbarItem {
  type: string;
  label: string;
  icon: string;
  shortcut?: string;
  group: string;
}

export interface ImageOptimizationConfig {
  max_width: number;
  max_height: number;
  quality: number;
  format: 'webp' | 'jpeg' | 'png';
  sizes: number[];
}

// SEO Optimization
export interface SEOAnalysis {
  score: number;
  issues: SEOIssue[];
  suggestions: SEOSuggestion[];
  readability_score: number;
  keyword_density: { [keyword: string]: number };
  meta_analysis: MetaAnalysis;
}

export interface SEOIssue {
  type: SEOIssueType;
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestion: string;
}

export type SEOIssueType =
  | 'title_length'
  | 'description_length'
  | 'keyword_density'
  | 'heading_structure'
  | 'image_alt_text'
  | 'meta_image'
  | 'readability';

export interface SEOSuggestion {
  type: string;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'easy' | 'moderate' | 'difficult';
}

export interface MetaAnalysis {
  title_length: number;
  description_length: number;
  has_meta_image: boolean;
  structured_data_present: boolean;
  canonical_url?: string;
}

// Publishing and Scheduling
export interface PublishingSchedule {
  id: string;
  article_id: string;
  scheduled_date: string;
  timezone: string;
  status: ScheduleStatus;
  notification_settings: NotificationSettings;
  created_at: string;
}

export type ScheduleStatus =
  | 'pending'
  | 'processing'
  | 'published'
  | 'failed'
  | 'cancelled';

export interface NotificationSettings {
  email_notifications: boolean;
  slack_notifications: boolean;
  dashboard_notifications: boolean;
  notification_recipients: string[];
}

// Analytics and Performance
export interface ArticleAnalytics {
  article_id: string;
  date: string;
  views: number;
  unique_views: number;
  time_spent_seconds: number;
  scroll_depth_percentage: number;
  shares: number;
  engagement_events: EngagementEvent[];
  traffic_sources: TrafficSource[];
  device_breakdown: DeviceBreakdown;
  geographic_data: GeographicData[];
}

export interface EngagementEvent {
  type: 'scroll' | 'time_spent' | 'link_click' | 'share' | 'copy';
  timestamp: string;
  value?: number;
  metadata?: object;
}

export interface TrafficSource {
  source: string;
  medium: string;
  campaign?: string;
  sessions: number;
  bounce_rate: number;
}

export interface DeviceBreakdown {
  desktop: number;
  mobile: number;
  tablet: number;
}

export interface GeographicData {
  country: string;
  region?: string;
  city?: string;
  sessions: number;
}

// API Request/Response Types
export interface CreateArticleRequest {
  title: string;
  content: object;
  category_ids?: string[];
  tags?: string[];
  status?: ArticleStatus;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string[];
  distribution_rules?: Partial<ContentDistributionRule>[];
  scheduled_publish_at?: string;
  featured_image_url?: string;
}

export interface UpdateArticleRequest extends Partial<CreateArticleRequest> {
  id: string;
}

export interface ArticleListResponse {
  articles: Article[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
  categories: ArticleCategory[];
  filters: ArticleFilters;
}

export interface ArticleFilters {
  status?: ArticleStatus[];
  category_ids?: string[];
  tags?: string[];
  search?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: ArticleSortField;
  sort_order?: 'asc' | 'desc';
}

export type ArticleSortField =
  | 'created_at'
  | 'published_at'
  | 'title'
  | 'view_count'
  | 'engagement_score'
  | 'reading_time';

// Content Distribution Response
export interface ContentDistributionResponse {
  client_id: string;
  recommended_articles: RecommendedArticle[];
  distribution_reasons: DistributionReason[];
  engagement_predictions: EngagementPrediction[];
}

export interface RecommendedArticle {
  article: Article;
  relevance_score: number;
  match_reasons: string[];
  optimal_delivery_time?: string;
}

export interface DistributionReason {
  rule_id: string;
  condition_matched: string;
  weight: number;
  explanation: string;
}

export interface EngagementPrediction {
  article_id: string;
  predicted_engagement_score: number;
  confidence_level: number;
  factors: string[];
}

// Integration Types (Rounds 1 & 2)
export interface BrandedArticleConfig {
  branding_config_id: string;
  custom_css?: string;
  logo_placement: 'header' | 'footer' | 'watermark' | 'none';
  color_scheme: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
  };
  typography: {
    heading_font: string;
    body_font: string;
    font_size_scale: number;
  };
}

export interface DocumentAttachment {
  document_id: string;
  display_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  is_featured: boolean;
  sort_order: number;
}

// Error Types
export interface ArticleError {
  code: string;
  message: string;
  field?: string;
  suggestions?: string[];
}

// Bulk Operations
export interface BulkArticleOperation {
  operation:
    | 'publish'
    | 'unpublish'
    | 'delete'
    | 'update_category'
    | 'update_tags';
  article_ids: string[];
  parameters?: object;
}

export interface BulkOperationResult {
  success_count: number;
  failed_count: number;
  errors: { article_id: string; error: string }[];
  processed_ids: string[];
}
