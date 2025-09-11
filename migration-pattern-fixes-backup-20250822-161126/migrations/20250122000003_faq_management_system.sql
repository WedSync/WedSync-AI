-- FAQ Management System for Wedding Client Support Automation
-- Purpose: Build comprehensive FAQ system to reduce client support workload by 80%
-- Feature ID: WS-070 - FAQ Management - Client Support Automation
-- Created: 2025-08-22
-- Team: Team D - Round 1

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search optimization

-- ============================================
-- FAQ CORE TABLES
-- ============================================

-- FAQ Categories Table - Hierarchical organization
CREATE TABLE IF NOT EXISTS faq_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL,
  parent_id UUID REFERENCES faq_categories(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  icon TEXT, -- For UI display (lucide icon name)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT faq_categories_slug_check CHECK (slug ~ '^[a-z0-9-]+$'),
  UNIQUE(supplier_id, slug),
  INDEX(supplier_id, sort_order),
  INDEX(parent_id, sort_order)
);

-- FAQ Items Table - Core FAQ content with full-text search
CREATE TABLE IF NOT EXISTS faq_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  category_id UUID REFERENCES faq_categories(id) ON DELETE CASCADE,
  
  -- Content
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  answer_html TEXT, -- Rich text formatted answer
  summary TEXT, -- Brief summary for search results
  
  -- Organization
  sort_order INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}', -- Searchable tags
  
  -- Search optimization
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', 
      question || ' ' || 
      COALESCE(answer, '') || ' ' || 
      COALESCE(summary, '') || ' ' ||
      COALESCE(array_to_string(tags, ' '), '')
    )
  ) STORED,
  
  -- Status and metadata
  is_published BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false, -- For highlighting important FAQs
  help_score INTEGER DEFAULT 0, -- Calculated helpfulness score
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX(supplier_id, category_id, sort_order),
  INDEX(supplier_id, is_published, is_featured),
  INDEX(supplier_id, view_count DESC),
  INDEX(help_score DESC)
);

-- FAQ Analytics Table - Usage tracking and optimization
CREATE TABLE IF NOT EXISTS faq_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  faq_item_id UUID REFERENCES faq_items(id) ON DELETE CASCADE,
  
  -- Event tracking
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'helpful', 'not_helpful', 'search_result')),
  
  -- Context
  search_query TEXT, -- Original search query that led to this FAQ
  user_session_id TEXT, -- For tracking user journey
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL, -- If logged in client
  user_agent TEXT,
  ip_address INET,
  referrer_url TEXT,
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for analytics queries
  INDEX(supplier_id, event_type, created_at DESC),
  INDEX(faq_item_id, event_type, created_at DESC),
  INDEX(search_query, created_at DESC) WHERE search_query IS NOT NULL
);

-- FAQ Search Queries Table - Track search terms for gap analysis
CREATE TABLE IF NOT EXISTS faq_search_queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Search details
  query_text TEXT NOT NULL,
  normalized_query TEXT NOT NULL, -- Cleaned and normalized for analysis
  result_count INTEGER DEFAULT 0,
  has_results BOOLEAN DEFAULT false,
  
  -- User context
  user_session_id TEXT,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  
  -- Performance tracking
  search_duration_ms INTEGER, -- Search performance tracking
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX(supplier_id, created_at DESC),
  INDEX(supplier_id, has_results, created_at DESC),
  INDEX(normalized_query, supplier_id)
);

-- FAQ Feedback Table - Client feedback on FAQ helpfulness
CREATE TABLE IF NOT EXISTS faq_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  faq_item_id UUID REFERENCES faq_items(id) ON DELETE CASCADE,
  
  -- Feedback details
  is_helpful BOOLEAN NOT NULL,
  feedback_text TEXT, -- Optional detailed feedback
  suggested_improvement TEXT,
  
  -- User context
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  user_session_id TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(faq_item_id, client_id, user_session_id), -- Prevent duplicate feedback
  
  -- Indexes
  INDEX(supplier_id, faq_item_id, is_helpful),
  INDEX(faq_item_id, created_at DESC)
);

-- ============================================
-- ADVANCED SEARCH INDEXES
-- ============================================

-- GIN index for full-text search performance
CREATE INDEX idx_faq_items_search_vector ON faq_items USING gin(search_vector);

-- Trigram indexes for fuzzy search
CREATE INDEX idx_faq_items_question_trgm ON faq_items USING gin(question gin_trgm_ops);
CREATE INDEX idx_faq_items_answer_trgm ON faq_items USING gin(answer gin_trgm_ops);
CREATE INDEX idx_faq_items_tags_trgm ON faq_items USING gin(array_to_string(tags, ' ') gin_trgm_ops);

-- Composite indexes for common query patterns
CREATE INDEX idx_faq_items_published_category ON faq_items(supplier_id, category_id, is_published, sort_order) WHERE is_published = true;
CREATE INDEX idx_faq_categories_active_hierarchy ON faq_categories(supplier_id, parent_id, sort_order) WHERE is_active = true;

-- ============================================
-- MATERIALIZED VIEWS FOR DASHBOARDS
-- ============================================

-- FAQ Dashboard Overview
CREATE MATERIALIZED VIEW faq_dashboard_overview AS
WITH faq_stats AS (
  SELECT 
    supplier_id,
    COUNT(*) as total_faqs,
    COUNT(CASE WHEN is_published = true THEN 1 END) as published_faqs,
    COUNT(CASE WHEN is_featured = true THEN 1 END) as featured_faqs,
    AVG(help_score) as avg_help_score,
    SUM(view_count) as total_views
  FROM faq_items
  GROUP BY supplier_id
),
category_stats AS (
  SELECT
    supplier_id,
    COUNT(*) as total_categories,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_categories
  FROM faq_categories
  GROUP BY supplier_id
),
recent_analytics AS (
  SELECT
    supplier_id,
    COUNT(CASE WHEN event_type = 'view' THEN 1 END) as views_30d,
    COUNT(CASE WHEN event_type = 'helpful' THEN 1 END) as helpful_votes_30d,
    COUNT(CASE WHEN event_type = 'not_helpful' THEN 1 END) as not_helpful_votes_30d,
    COUNT(DISTINCT search_query) as unique_searches_30d
  FROM faq_analytics
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY supplier_id
),
search_performance AS (
  SELECT
    supplier_id,
    COUNT(*) as total_searches_30d,
    COUNT(CASE WHEN has_results = false THEN 1 END) as no_result_searches_30d,
    AVG(search_duration_ms) as avg_search_duration_ms
  FROM faq_search_queries
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY supplier_id
)
SELECT
  s.id as supplier_id,
  s.business_name,
  
  -- Content stats
  COALESCE(fs.total_faqs, 0) as total_faqs,
  COALESCE(fs.published_faqs, 0) as published_faqs,
  COALESCE(fs.featured_faqs, 0) as featured_faqs,
  COALESCE(cs.total_categories, 0) as total_categories,
  COALESCE(cs.active_categories, 0) as active_categories,
  
  -- Performance stats
  COALESCE(fs.avg_help_score, 0) as avg_help_score,
  COALESCE(fs.total_views, 0) as total_views,
  COALESCE(ra.views_30d, 0) as views_30d,
  COALESCE(ra.helpful_votes_30d, 0) as helpful_votes_30d,
  COALESCE(ra.not_helpful_votes_30d, 0) as not_helpful_votes_30d,
  
  -- Search stats
  COALESCE(sp.total_searches_30d, 0) as searches_30d,
  COALESCE(sp.no_result_searches_30d, 0) as no_result_searches_30d,
  COALESCE(sp.avg_search_duration_ms, 0) as avg_search_duration_ms,
  COALESCE(ra.unique_searches_30d, 0) as unique_search_terms_30d,
  
  -- Calculated metrics
  CASE 
    WHEN COALESCE(ra.helpful_votes_30d, 0) + COALESCE(ra.not_helpful_votes_30d, 0) = 0 THEN 0
    ELSE (COALESCE(ra.helpful_votes_30d, 0) * 100.0 / (COALESCE(ra.helpful_votes_30d, 0) + COALESCE(ra.not_helpful_votes_30d, 0)))
  END as helpfulness_percentage,
  
  CASE
    WHEN COALESCE(sp.total_searches_30d, 0) = 0 THEN 100
    ELSE ((COALESCE(sp.total_searches_30d, 0) - COALESCE(sp.no_result_searches_30d, 0)) * 100.0 / COALESCE(sp.total_searches_30d, 1))
  END as search_success_rate,
  
  NOW() as last_refreshed
FROM suppliers s
LEFT JOIN faq_stats fs ON s.id = fs.supplier_id
LEFT JOIN category_stats cs ON s.id = cs.supplier_id  
LEFT JOIN recent_analytics ra ON s.id = ra.supplier_id
LEFT JOIN search_performance sp ON s.id = sp.supplier_id;

-- Create indexes for materialized view
CREATE UNIQUE INDEX idx_faq_dashboard_supplier ON faq_dashboard_overview(supplier_id);
CREATE INDEX idx_faq_dashboard_performance ON faq_dashboard_overview(helpfulness_percentage DESC, search_success_rate DESC);

-- ============================================
-- FAQ SEARCH FUNCTIONS
-- ============================================

-- Function to search FAQs with fuzzy matching and relevance scoring
CREATE OR REPLACE FUNCTION search_faqs(
  p_supplier_id UUID,
  p_query TEXT,
  p_category_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  question TEXT,
  answer TEXT,
  summary TEXT,
  category_name TEXT,
  tags TEXT[],
  view_count INTEGER,
  help_score INTEGER,
  is_featured BOOLEAN,
  relevance_score REAL
) AS $$
DECLARE
  v_search_query TSQUERY;
  v_start_time TIMESTAMP;
  v_end_time TIMESTAMP;
  v_duration_ms INTEGER;
BEGIN
  -- Record search start time
  v_start_time := clock_timestamp();
  
  -- Parse search query
  v_search_query := websearch_to_tsquery('english', p_query);
  
  -- Log the search query
  INSERT INTO faq_search_queries (supplier_id, query_text, normalized_query, search_duration_ms)
  VALUES (
    p_supplier_id, 
    p_query, 
    lower(trim(p_query)),
    0  -- Will be updated after search completes
  );
  
  -- Return search results with relevance scoring
  RETURN QUERY
  SELECT 
    fi.id,
    fi.question,
    fi.answer,
    fi.summary,
    fc.name as category_name,
    fi.tags,
    fi.view_count,
    fi.help_score,
    fi.is_featured,
    -- Relevance score calculation
    (
      ts_rank_cd(fi.search_vector, v_search_query) +
      CASE WHEN fi.is_featured THEN 0.5 ELSE 0 END +
      CASE WHEN fi.help_score > 0 THEN (fi.help_score * 0.1) ELSE 0 END +
      CASE WHEN similarity(fi.question, p_query) > 0.3 THEN similarity(fi.question, p_query) ELSE 0 END
    )::REAL as relevance_score
  FROM faq_items fi
  LEFT JOIN faq_categories fc ON fi.category_id = fc.id
  WHERE fi.supplier_id = p_supplier_id
    AND fi.is_published = true
    AND (p_category_id IS NULL OR fi.category_id = p_category_id)
    AND (
      fi.search_vector @@ v_search_query OR
      similarity(fi.question, p_query) > 0.3 OR
      similarity(fi.answer, p_query) > 0.2
    )
  ORDER BY relevance_score DESC, fi.is_featured DESC, fi.view_count DESC
  LIMIT p_limit
  OFFSET p_offset;
  
  -- Record search completion time and update duration
  v_end_time := clock_timestamp();
  v_duration_ms := EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000;
  
  UPDATE faq_search_queries 
  SET 
    search_duration_ms = v_duration_ms,
    result_count = (SELECT count(*) FROM faq_items fi WHERE fi.supplier_id = p_supplier_id AND fi.is_published = true AND fi.search_vector @@ v_search_query),
    has_results = (SELECT count(*) FROM faq_items fi WHERE fi.supplier_id = p_supplier_id AND fi.is_published = true AND fi.search_vector @@ v_search_query) > 0
  WHERE supplier_id = p_supplier_id 
    AND query_text = p_query 
    AND created_at = (SELECT MAX(created_at) FROM faq_search_queries WHERE supplier_id = p_supplier_id AND query_text = p_query);
    
END;
$$ LANGUAGE plpgsql;

-- Function to track FAQ analytics events
CREATE OR REPLACE FUNCTION track_faq_analytics(
  p_supplier_id UUID,
  p_faq_item_id UUID,
  p_event_type TEXT,
  p_search_query TEXT DEFAULT NULL,
  p_user_session_id TEXT DEFAULT NULL,
  p_client_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Insert analytics event
  INSERT INTO faq_analytics (
    supplier_id, faq_item_id, event_type, search_query, 
    user_session_id, client_id, metadata
  ) VALUES (
    p_supplier_id, p_faq_item_id, p_event_type, p_search_query,
    p_user_session_id, p_client_id, p_metadata
  );
  
  -- Update FAQ item stats based on event type
  IF p_event_type = 'view' THEN
    UPDATE faq_items 
    SET 
      view_count = view_count + 1,
      last_viewed_at = NOW()
    WHERE id = p_faq_item_id;
  ELSIF p_event_type = 'helpful' THEN
    UPDATE faq_items 
    SET help_score = help_score + 1
    WHERE id = p_faq_item_id;
  ELSIF p_event_type = 'not_helpful' THEN
    UPDATE faq_items 
    SET help_score = help_score - 1
    WHERE id = p_faq_item_id;
  END IF;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================

-- Trigger function to update timestamps
CREATE OR REPLACE FUNCTION update_faq_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp triggers
CREATE TRIGGER update_faq_categories_timestamp
  BEFORE UPDATE ON faq_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_faq_updated_at();

CREATE TRIGGER update_faq_items_timestamp
  BEFORE UPDATE ON faq_items
  FOR EACH ROW
  EXECUTE FUNCTION update_faq_updated_at();

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all FAQ tables
ALTER TABLE faq_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_search_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_feedback ENABLE ROW LEVEL SECURITY;

-- Policies for suppliers to manage their own FAQs
CREATE POLICY faq_categories_supplier_policy ON faq_categories
  FOR ALL USING (supplier_id IN (
    SELECT id FROM suppliers WHERE user_id = auth.uid()
  ));

CREATE POLICY faq_items_supplier_policy ON faq_items
  FOR ALL USING (supplier_id IN (
    SELECT id FROM suppliers WHERE user_id = auth.uid()
  ));

CREATE POLICY faq_analytics_supplier_policy ON faq_analytics
  FOR ALL USING (supplier_id IN (
    SELECT id FROM suppliers WHERE user_id = auth.uid()
  ));

CREATE POLICY faq_search_queries_supplier_policy ON faq_search_queries
  FOR ALL USING (supplier_id IN (
    SELECT id FROM suppliers WHERE user_id = auth.uid()
  ));

CREATE POLICY faq_feedback_supplier_policy ON faq_feedback
  FOR ALL USING (supplier_id IN (
    SELECT id FROM suppliers WHERE user_id = auth.uid()
  ));

-- Additional policies for clients to read published FAQs
CREATE POLICY faq_items_client_read_policy ON faq_items
  FOR SELECT USING (
    is_published = true AND
    supplier_id IN (
      SELECT supplier_id FROM clients WHERE id = auth.jwt() ->> 'client_id' OR
      SELECT supplier_id FROM client_bookings WHERE client_id = auth.jwt() ->> 'client_id'
    )
  );

CREATE POLICY faq_categories_client_read_policy ON faq_categories
  FOR SELECT USING (
    is_active = true AND
    supplier_id IN (
      SELECT supplier_id FROM clients WHERE id = auth.jwt() ->> 'client_id' OR
      SELECT supplier_id FROM client_bookings WHERE client_id = auth.jwt() ->> 'client_id'
    )
  );

-- ============================================
-- REFRESH FUNCTIONS FOR MATERIALIZED VIEWS
-- ============================================

-- Function to refresh FAQ dashboard materialized view
CREATE OR REPLACE FUNCTION refresh_faq_dashboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY faq_dashboard_overview;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SEED DATA FOR COMMON FAQ CATEGORIES
-- ============================================

-- Note: This will be populated by the application, but here are common wedding FAQ categories:
-- 1. Booking & Pricing
-- 2. Timeline & Delivery  
-- 3. Photography Process
-- 4. Wedding Day Logistics
-- 5. Packages & Add-ons
-- 6. Weather & Backup Plans
-- 7. Image Rights & Usage
-- 8. Payment & Contracts

COMMENT ON TABLE faq_categories IS 'Hierarchical FAQ categories for organizing client support content';
COMMENT ON TABLE faq_items IS 'Core FAQ items with full-text search optimization for client support';
COMMENT ON TABLE faq_analytics IS 'Usage tracking for FAQ optimization and business insights';
COMMENT ON TABLE faq_search_queries IS 'Search query tracking for gap analysis and content optimization';
COMMENT ON TABLE faq_feedback IS 'Client feedback on FAQ helpfulness for continuous improvement';

-- Migration complete: FAQ Management System ready for wedding client support automation