-- SEO Analytics System for Wedding Suppliers
-- Purpose: Track search rankings, organic traffic, and SEO performance
-- Feature ID: WS-049
-- Created: 2025-08-21

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search optimization

-- ============================================
-- CORE SEO TABLES
-- ============================================

-- SEO Keywords Tracking Table
CREATE TABLE IF NOT EXISTS seo_keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  keyword_type TEXT CHECK (keyword_type IN ('primary', 'secondary', 'long_tail', 'branded', 'local')),
  search_volume INTEGER,
  difficulty_score INTEGER CHECK (difficulty_score >= 0 AND difficulty_score <= 100),
  cpc_value DECIMAL(10,2),
  intent TEXT CHECK (intent IN ('informational', 'navigational', 'transactional', 'commercial')),
  location TEXT, -- For local SEO keywords
  is_tracked BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(supplier_id, keyword, location)
);

-- Search Rankings History Table
CREATE TABLE IF NOT EXISTS seo_rankings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword_id UUID REFERENCES seo_keywords(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 0),
  url TEXT NOT NULL,
  page_title TEXT,
  meta_description TEXT,
  featured_snippet BOOLEAN DEFAULT false,
  search_engine TEXT DEFAULT 'google' CHECK (search_engine IN ('google', 'bing', 'yahoo')),
  device_type TEXT DEFAULT 'desktop' CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
  location TEXT,
  tracked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  INDEX(keyword_id, tracked_at DESC),
  INDEX(supplier_id, tracked_at DESC),
  INDEX(position, tracked_at DESC)
);

-- Organic Traffic Data Table
CREATE TABLE IF NOT EXISTS seo_organic_traffic (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  page_url TEXT NOT NULL,
  sessions INTEGER DEFAULT 0,
  users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  pageviews INTEGER DEFAULT 0,
  bounce_rate DECIMAL(5,2) CHECK (bounce_rate >= 0 AND bounce_rate <= 100),
  avg_session_duration INTEGER, -- in seconds
  conversions INTEGER DEFAULT 0,
  conversion_value DECIMAL(10,2),
  landing_page TEXT,
  source TEXT DEFAULT 'organic',
  medium TEXT,
  device_category TEXT CHECK (device_category IN ('desktop', 'mobile', 'tablet')),
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(supplier_id, page_url, date, device_category),
  INDEX(supplier_id, date DESC),
  INDEX(page_url, date DESC)
);

-- Competitor Analysis Table
CREATE TABLE IF NOT EXISTS seo_competitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  competitor_domain TEXT NOT NULL,
  competitor_name TEXT,
  overlap_score DECIMAL(5,2) CHECK (overlap_score >= 0 AND overlap_score <= 100),
  domain_authority INTEGER CHECK (domain_authority >= 0 AND domain_authority <= 100),
  organic_traffic_estimate INTEGER,
  top_keywords_count INTEGER,
  backlinks_count INTEGER,
  is_tracked BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(supplier_id, competitor_domain)
);

-- Competitor Rankings Comparison Table
CREATE TABLE IF NOT EXISTS seo_competitor_rankings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword_id UUID REFERENCES seo_keywords(id) ON DELETE CASCADE,
  competitor_id UUID REFERENCES seo_competitors(id) ON DELETE CASCADE,
  position INTEGER CHECK (position >= 0),
  url TEXT,
  tracked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  INDEX(keyword_id, tracked_at DESC),
  INDEX(competitor_id, tracked_at DESC)
);

-- Technical SEO Audits Table
CREATE TABLE IF NOT EXISTS seo_technical_audits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  audit_type TEXT CHECK (audit_type IN ('full', 'performance', 'mobile', 'security', 'accessibility')),
  score INTEGER CHECK (score >= 0 AND score <= 100),
  issues JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  performance_metrics JSONB DEFAULT '{}', -- LCP, FID, CLS, etc.
  crawl_stats JSONB DEFAULT '{}',
  audit_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  INDEX(supplier_id, audit_date DESC)
);

-- Local SEO Performance Table
CREATE TABLE IF NOT EXISTS seo_local_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  google_my_business_id TEXT,
  visibility_score INTEGER CHECK (visibility_score >= 0 AND visibility_score <= 100),
  reviews_count INTEGER DEFAULT 0,
  average_rating DECIMAL(2,1) CHECK (average_rating >= 0 AND average_rating <= 5),
  local_pack_position INTEGER,
  map_views INTEGER DEFAULT 0,
  direction_requests INTEGER DEFAULT 0,
  phone_calls INTEGER DEFAULT 0,
  website_clicks INTEGER DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(supplier_id, location, date),
  INDEX(supplier_id, date DESC)
);

-- Content Performance Table
CREATE TABLE IF NOT EXISTS seo_content_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  page_url TEXT NOT NULL,
  content_type TEXT CHECK (content_type IN ('blog', 'landing', 'service', 'gallery', 'testimonial', 'faq')),
  word_count INTEGER,
  readability_score INTEGER CHECK (readability_score >= 0 AND readability_score <= 100),
  keyword_density DECIMAL(5,2),
  internal_links INTEGER DEFAULT 0,
  external_links INTEGER DEFAULT 0,
  images_count INTEGER DEFAULT 0,
  avg_time_on_page INTEGER, -- in seconds
  social_shares INTEGER DEFAULT 0,
  backlinks_gained INTEGER DEFAULT 0,
  published_date DATE,
  last_updated DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  INDEX(supplier_id, published_date DESC)
);

-- Backlinks Tracking Table
CREATE TABLE IF NOT EXISTS seo_backlinks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  source_domain TEXT NOT NULL,
  target_url TEXT NOT NULL,
  anchor_text TEXT,
  link_type TEXT CHECK (link_type IN ('dofollow', 'nofollow', 'sponsored', 'ugc')),
  domain_authority INTEGER CHECK (domain_authority >= 0 AND domain_authority <= 100),
  first_seen DATE,
  last_checked DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  INDEX(supplier_id, domain_authority DESC),
  INDEX(target_url, created_at DESC)
);

-- ============================================
-- MATERIALIZED VIEWS FOR DASHBOARD
-- ============================================

-- SEO Overview Dashboard View
CREATE MATERIALIZED VIEW seo_dashboard_overview AS
WITH ranking_summary AS (
  SELECT 
    supplier_id,
    COUNT(DISTINCT keyword_id) as tracked_keywords,
    COUNT(CASE WHEN position <= 3 THEN 1 END) as top3_rankings,
    COUNT(CASE WHEN position <= 10 THEN 1 END) as top10_rankings,
    AVG(position) as avg_position,
    COUNT(CASE WHEN featured_snippet = true THEN 1 END) as featured_snippets
  FROM seo_rankings
  WHERE tracked_at >= NOW() - INTERVAL '1 day'
  GROUP BY supplier_id
),
traffic_summary AS (
  SELECT
    supplier_id,
    SUM(sessions) as total_sessions,
    SUM(users) as total_users,
    SUM(conversions) as total_conversions,
    AVG(bounce_rate) as avg_bounce_rate,
    SUM(conversion_value) as total_revenue
  FROM seo_organic_traffic
  WHERE date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY supplier_id
),
technical_summary AS (
  SELECT
    supplier_id,
    AVG(score) as avg_technical_score,
    COUNT(*) as audits_performed
  FROM seo_technical_audits
  WHERE audit_date >= NOW() - INTERVAL '30 days'
  GROUP BY supplier_id
)
SELECT
  s.id as supplier_id,
  s.business_name,
  COALESCE(rs.tracked_keywords, 0) as tracked_keywords,
  COALESCE(rs.top3_rankings, 0) as top3_rankings,
  COALESCE(rs.top10_rankings, 0) as top10_rankings,
  COALESCE(rs.avg_position, 0) as avg_position,
  COALESCE(rs.featured_snippets, 0) as featured_snippets,
  COALESCE(ts.total_sessions, 0) as organic_sessions_30d,
  COALESCE(ts.total_users, 0) as organic_users_30d,
  COALESCE(ts.total_conversions, 0) as conversions_30d,
  COALESCE(ts.avg_bounce_rate, 0) as avg_bounce_rate,
  COALESCE(ts.total_revenue, 0) as revenue_attributed,
  COALESCE(tech.avg_technical_score, 0) as technical_health_score,
  NOW() as last_refreshed
FROM suppliers s
LEFT JOIN ranking_summary rs ON s.id = rs.supplier_id
LEFT JOIN traffic_summary ts ON s.id = ts.supplier_id
LEFT JOIN technical_summary tech ON s.id = tech.supplier_id;

-- Create indexes for materialized view
CREATE UNIQUE INDEX idx_seo_dashboard_supplier ON seo_dashboard_overview(supplier_id);
CREATE INDEX idx_seo_dashboard_rankings ON seo_dashboard_overview(top10_rankings DESC);

-- Keyword Performance Trends View
CREATE MATERIALIZED VIEW seo_keyword_trends AS
SELECT
  k.id as keyword_id,
  k.supplier_id,
  k.keyword,
  k.search_volume,
  k.difficulty_score,
  r.position as current_position,
  r.url as ranking_url,
  r.featured_snippet,
  LAG(r.position, 1) OVER (PARTITION BY k.id ORDER BY r.tracked_at) as previous_position,
  r.position - LAG(r.position, 1) OVER (PARTITION BY k.id ORDER BY r.tracked_at) as position_change,
  r.tracked_at
FROM seo_keywords k
JOIN seo_rankings r ON k.id = r.keyword_id
WHERE r.tracked_at >= NOW() - INTERVAL '30 days'
ORDER BY k.supplier_id, k.search_volume DESC, r.tracked_at DESC;

-- Create indexes for keyword trends
CREATE INDEX idx_keyword_trends_supplier ON seo_keyword_trends(supplier_id);
CREATE INDEX idx_keyword_trends_change ON seo_keyword_trends(position_change);

-- ============================================
-- FUNCTIONS FOR SEO ANALYTICS
-- ============================================

-- Function to calculate SEO visibility score
CREATE OR REPLACE FUNCTION calculate_seo_visibility_score(p_supplier_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_ranking_score INTEGER;
  v_traffic_score INTEGER;
  v_technical_score INTEGER;
  v_content_score INTEGER;
BEGIN
  -- Calculate ranking component (40% weight)
  SELECT 
    CASE 
      WHEN COUNT(*) = 0 THEN 0
      ELSE LEAST(100, (
        COUNT(CASE WHEN position <= 3 THEN 1 END) * 10 +
        COUNT(CASE WHEN position BETWEEN 4 AND 10 THEN 1 END) * 5 +
        COUNT(CASE WHEN position BETWEEN 11 AND 20 THEN 1 END) * 2
      ))
    END INTO v_ranking_score
  FROM seo_rankings
  WHERE supplier_id = p_supplier_id
    AND tracked_at >= NOW() - INTERVAL '7 days';
  
  -- Calculate traffic component (30% weight)
  SELECT
    CASE
      WHEN SUM(sessions) = 0 THEN 0
      ELSE LEAST(100, (SUM(sessions) / 100) + (SUM(conversions) * 10))
    END INTO v_traffic_score
  FROM seo_organic_traffic
  WHERE supplier_id = p_supplier_id
    AND date >= CURRENT_DATE - INTERVAL '30 days';
  
  -- Get technical score (20% weight)
  SELECT COALESCE(AVG(score), 50) INTO v_technical_score
  FROM seo_technical_audits
  WHERE supplier_id = p_supplier_id
    AND audit_date >= NOW() - INTERVAL '30 days';
  
  -- Calculate content score (10% weight)
  SELECT 
    CASE
      WHEN COUNT(*) = 0 THEN 0
      ELSE LEAST(100, AVG(readability_score))
    END INTO v_content_score
  FROM seo_content_performance
  WHERE supplier_id = p_supplier_id;
  
  -- Calculate weighted total
  v_score := (
    (COALESCE(v_ranking_score, 0) * 0.4) +
    (COALESCE(v_traffic_score, 0) * 0.3) +
    (COALESCE(v_technical_score, 0) * 0.2) +
    (COALESCE(v_content_score, 0) * 0.1)
  )::INTEGER;
  
  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Function to detect SEO opportunities
CREATE OR REPLACE FUNCTION detect_seo_opportunities(p_supplier_id UUID)
RETURNS TABLE(
  opportunity_type TEXT,
  priority TEXT,
  description TEXT,
  potential_impact INTEGER,
  recommended_action TEXT
) AS $$
BEGIN
  RETURN QUERY
  -- High-value keywords with poor rankings
  SELECT 
    'keyword_opportunity'::TEXT,
    'high'::TEXT,
    CONCAT('Keyword "', k.keyword, '" has high volume but ranks #', r.position)::TEXT,
    k.search_volume::INTEGER,
    'Optimize content and build links for this keyword'::TEXT
  FROM seo_keywords k
  JOIN seo_rankings r ON k.id = r.keyword_id
  WHERE k.supplier_id = p_supplier_id
    AND k.search_volume > 500
    AND r.position > 10
    AND r.tracked_at >= NOW() - INTERVAL '1 day'
  
  UNION ALL
  
  -- Pages with high bounce rate
  SELECT
    'bounce_rate_issue'::TEXT,
    'medium'::TEXT,
    CONCAT('Page ', page_url, ' has ', bounce_rate, '% bounce rate')::TEXT,
    sessions::INTEGER,
    'Improve page content and user experience'::TEXT
  FROM seo_organic_traffic
  WHERE supplier_id = p_supplier_id
    AND bounce_rate > 70
    AND sessions > 100
    AND date >= CURRENT_DATE - INTERVAL '30 days'
  
  UNION ALL
  
  -- Technical SEO issues
  SELECT
    'technical_issue'::TEXT,
    'high'::TEXT,
    CONCAT('Technical audit score is ', score, '/100')::TEXT,
    (100 - score)::INTEGER,
    'Address critical technical SEO issues'::TEXT
  FROM seo_technical_audits
  WHERE supplier_id = p_supplier_id
    AND score < 70
    AND audit_date >= NOW() - INTERVAL '7 days'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS FOR REAL-TIME UPDATES
-- ============================================

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_seo_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_seo_keywords_timestamp
  BEFORE UPDATE ON seo_keywords
  FOR EACH ROW
  EXECUTE FUNCTION update_seo_updated_at();

CREATE TRIGGER update_seo_competitors_timestamp
  BEFORE UPDATE ON seo_competitors
  FOR EACH ROW
  EXECUTE FUNCTION update_seo_updated_at();

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all SEO tables
ALTER TABLE seo_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_organic_traffic ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_competitor_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_technical_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_local_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_content_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_backlinks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for suppliers to access their own data
CREATE POLICY seo_keywords_supplier_policy ON seo_keywords
  FOR ALL USING (supplier_id IN (
    SELECT id FROM suppliers WHERE user_id = ( SELECT auth.uid() )
  ));

CREATE POLICY seo_rankings_supplier_policy ON seo_rankings
  FOR ALL USING (supplier_id IN (
    SELECT id FROM suppliers WHERE user_id = ( SELECT auth.uid() )
  ));

CREATE POLICY seo_organic_traffic_supplier_policy ON seo_organic_traffic
  FOR ALL USING (supplier_id IN (
    SELECT id FROM suppliers WHERE user_id = ( SELECT auth.uid() )
  ));

CREATE POLICY seo_competitors_supplier_policy ON seo_competitors
  FOR ALL USING (supplier_id IN (
    SELECT id FROM suppliers WHERE user_id = ( SELECT auth.uid() )
  ));

CREATE POLICY seo_technical_audits_supplier_policy ON seo_technical_audits
  FOR ALL USING (supplier_id IN (
    SELECT id FROM suppliers WHERE user_id = ( SELECT auth.uid() )
  ));

CREATE POLICY seo_local_performance_supplier_policy ON seo_local_performance
  FOR ALL USING (supplier_id IN (
    SELECT id FROM suppliers WHERE user_id = ( SELECT auth.uid() )
  ));

CREATE POLICY seo_content_performance_supplier_policy ON seo_content_performance
  FOR ALL USING (supplier_id IN (
    SELECT id FROM suppliers WHERE user_id = ( SELECT auth.uid() )
  ));

CREATE POLICY seo_backlinks_supplier_policy ON seo_backlinks
  FOR ALL USING (supplier_id IN (
    SELECT id FROM suppliers WHERE user_id = ( SELECT auth.uid() )
  ));

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Composite indexes for common queries
CREATE INDEX idx_seo_rankings_recent ON seo_rankings(supplier_id, tracked_at DESC) WHERE tracked_at >= NOW() - INTERVAL '30 days';
CREATE INDEX idx_seo_traffic_recent ON seo_organic_traffic(supplier_id, date DESC) WHERE date >= CURRENT_DATE - INTERVAL '30 days';
CREATE INDEX idx_seo_keywords_tracked ON seo_keywords(supplier_id, is_tracked) WHERE is_tracked = true;
CREATE INDEX idx_seo_competitors_active ON seo_competitors(supplier_id, is_tracked) WHERE is_tracked = true;

-- Text search indexes
CREATE INDEX idx_seo_keywords_search ON seo_keywords USING gin(keyword gin_trgm_ops);
CREATE INDEX idx_seo_content_url ON seo_content_performance USING gin(page_url gin_trgm_ops);

-- ============================================
-- SCHEDULED REFRESH FOR MATERIALIZED VIEWS
-- ============================================

-- Function to refresh SEO materialized views
CREATE OR REPLACE FUNCTION refresh_seo_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY seo_dashboard_overview;
  REFRESH MATERIALIZED VIEW CONCURRENTLY seo_keyword_trends;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh (to be called by cron job or Supabase Edge Function)
-- Run every hour for dashboard overview, every 6 hours for trends