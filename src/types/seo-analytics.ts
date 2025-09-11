export interface SEOKeyword {
  id: string;
  supplier_id: string;
  keyword: string;
  keyword_type: 'primary' | 'secondary' | 'long_tail' | 'branded' | 'local';
  search_volume: number;
  difficulty_score: number;
  cpc_value: number;
  intent: 'informational' | 'navigational' | 'transactional' | 'commercial';
  location?: string;
  is_tracked: boolean;
  created_at: string;
  updated_at: string;
}

export interface SEORanking {
  id: string;
  keyword_id: string;
  supplier_id: string;
  position: number;
  url: string;
  page_title?: string;
  meta_description?: string;
  featured_snippet: boolean;
  search_engine: 'google' | 'bing' | 'yahoo';
  device_type: 'desktop' | 'mobile' | 'tablet';
  location?: string;
  tracked_at: string;
}

export interface SEOOrganicTraffic {
  id: string;
  supplier_id: string;
  page_url: string;
  sessions: number;
  users: number;
  new_users: number;
  pageviews: number;
  bounce_rate: number;
  avg_session_duration: number;
  conversions: number;
  conversion_value: number;
  landing_page?: string;
  source: string;
  medium?: string;
  device_category: 'desktop' | 'mobile' | 'tablet';
  date: string;
  created_at: string;
}

export interface SEOCompetitor {
  id: string;
  supplier_id: string;
  competitor_domain: string;
  competitor_name?: string;
  overlap_score: number;
  domain_authority: number;
  organic_traffic_estimate: number;
  top_keywords_count: number;
  backlinks_count: number;
  is_tracked: boolean;
  created_at: string;
  updated_at: string;
}

export interface SEOTechnicalAudit {
  id: string;
  supplier_id: string;
  audit_type: 'full' | 'performance' | 'mobile' | 'security' | 'accessibility';
  score: number;
  issues: Array<{
    type: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    affected_pages: number;
    recommendation: string;
  }>;
  recommendations: Array<{
    category: string;
    priority: 'high' | 'medium' | 'low';
    action: string;
    impact: string;
  }>;
  performance_metrics: {
    lcp?: number; // Largest Contentful Paint
    fid?: number; // First Input Delay
    cls?: number; // Cumulative Layout Shift
    ttfb?: number; // Time to First Byte
    fcp?: number; // First Contentful Paint
    tti?: number; // Time to Interactive
  };
  crawl_stats: {
    pages_crawled: number;
    errors_found: number;
    warnings_found: number;
    indexable_pages: number;
    blocked_pages: number;
  };
  audit_date: string;
}

export interface SEOLocalPerformance {
  id: string;
  supplier_id: string;
  location: string;
  google_my_business_id?: string;
  visibility_score: number;
  reviews_count: number;
  average_rating: number;
  local_pack_position?: number;
  map_views: number;
  direction_requests: number;
  phone_calls: number;
  website_clicks: number;
  date: string;
  created_at: string;
}

export interface SEOContentPerformance {
  id: string;
  supplier_id: string;
  page_url: string;
  content_type:
    | 'blog'
    | 'landing'
    | 'service'
    | 'gallery'
    | 'testimonial'
    | 'faq';
  word_count: number;
  readability_score: number;
  keyword_density: number;
  internal_links: number;
  external_links: number;
  images_count: number;
  avg_time_on_page: number;
  social_shares: number;
  backlinks_gained: number;
  published_date?: string;
  last_updated?: string;
  created_at: string;
}

export interface SEOBacklink {
  id: string;
  supplier_id: string;
  source_url: string;
  source_domain: string;
  target_url: string;
  anchor_text?: string;
  link_type: 'dofollow' | 'nofollow' | 'sponsored' | 'ugc';
  domain_authority: number;
  first_seen?: string;
  last_checked?: string;
  is_active: boolean;
  created_at: string;
}

export interface SEODashboardOverview {
  supplier_id: string;
  business_name: string;
  tracked_keywords: number;
  top3_rankings: number;
  top10_rankings: number;
  avg_position: number;
  featured_snippets: number;
  organic_sessions_30d: number;
  organic_users_30d: number;
  conversions_30d: number;
  avg_bounce_rate: number;
  revenue_attributed: number;
  technical_health_score: number;
  last_refreshed: string;
}

export interface SEOKeywordTrend {
  keyword_id: string;
  supplier_id: string;
  keyword: string;
  search_volume: number;
  difficulty_score: number;
  current_position: number;
  ranking_url: string;
  featured_snippet: boolean;
  previous_position?: number;
  position_change?: number;
  tracked_at: string;
}

export interface SEOOpportunity {
  opportunity_type: string;
  priority: 'high' | 'medium' | 'low';
  description: string;
  potential_impact: number;
  recommended_action: string;
}

export interface GoogleSearchConsoleData {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SEOAnalyticsState {
  dashboard: SEODashboardOverview | null;
  keywords: SEOKeyword[];
  rankings: SEORanking[];
  traffic: SEOOrganicTraffic[];
  competitors: SEOCompetitor[];
  technicalAudits: SEOTechnicalAudit[];
  opportunities: SEOOpportunity[];
  loading: boolean;
  error: string | null;
}

export interface SEOAnalyticsFilters {
  dateRange: {
    start: Date;
    end: Date;
  };
  keyword?: string;
  device?: 'all' | 'desktop' | 'mobile' | 'tablet';
  location?: string;
  competitor?: string;
}
