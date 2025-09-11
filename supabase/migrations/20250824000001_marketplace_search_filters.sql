-- WS-114: Advanced Search and Filtering for Marketplace
-- Team B - Batch 9 - Round 1
-- Enhanced search indexes, facet aggregation, and performance optimizations

-- Enhanced search indexes for better performance
CREATE INDEX IF NOT EXISTS idx_marketplace_templates_composite_search 
ON marketplace_templates (status, category, minimum_tier, price_cents, average_rating DESC, install_count DESC);

CREATE INDEX IF NOT EXISTS idx_marketplace_templates_price_range 
ON marketplace_templates (price_cents, currency, status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_marketplace_templates_rating_performance 
ON marketplace_templates (average_rating DESC, rating_count DESC, install_count DESC, status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_marketplace_templates_tags_gin 
ON marketplace_templates USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_marketplace_templates_wedding_types_gin 
ON marketplace_templates USING GIN (target_wedding_types);

-- Enhanced search suggestions table
CREATE TABLE IF NOT EXISTS marketplace_search_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_text VARCHAR(255) NOT NULL,
  suggestion_text VARCHAR(255) NOT NULL,
  category VARCHAR(50),
  search_count INTEGER DEFAULT 1,
  result_count INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,4) DEFAULT 0.0000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(query_text, suggestion_text)
);

CREATE INDEX idx_marketplace_search_suggestions_query ON marketplace_search_suggestions(query_text);
CREATE INDEX idx_marketplace_search_suggestions_popularity ON marketplace_search_suggestions(search_count DESC, conversion_rate DESC);

-- Search analytics for tracking user behavior
CREATE TABLE IF NOT EXISTS marketplace_search_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  session_id VARCHAR(255),
  search_query TEXT NOT NULL,
  filters_applied JSONB DEFAULT '{}',
  result_count INTEGER DEFAULT 0,
  clicked_template_id UUID REFERENCES marketplace_templates(id) ON DELETE SET NULL,
  click_position INTEGER,
  time_spent_seconds INTEGER,
  converted BOOLEAN DEFAULT false,
  search_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_marketplace_search_analytics_query ON marketplace_search_analytics(search_query, search_timestamp DESC);
CREATE INDEX idx_marketplace_search_analytics_user ON marketplace_search_analytics(user_id, search_timestamp DESC);
CREATE INDEX idx_marketplace_search_analytics_conversion ON marketplace_search_analytics(converted, click_position);

-- Function for advanced facet aggregation
CREATE OR REPLACE FUNCTION get_marketplace_facets(
  search_query TEXT DEFAULT '',
  category_filter VARCHAR(50) DEFAULT NULL,
  price_min_cents INTEGER DEFAULT NULL,
  price_max_cents INTEGER DEFAULT NULL,
  rating_min DECIMAL DEFAULT NULL,
  tier_filter VARCHAR(20) DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  facets JSONB := '{}';
  category_facets JSONB;
  price_facets JSONB;
  rating_facets JSONB;
  tier_facets JSONB;
  tag_facets JSONB;
  wedding_type_facets JSONB;
BEGIN
  -- Build base WHERE clause
  WITH filtered_templates AS (
    SELECT * FROM marketplace_templates
    WHERE status = 'active'
    AND (search_query = '' OR search_vector @@ plainto_tsquery('english', search_query))
    AND (category_filter IS NULL OR category = category_filter)
    AND (price_min_cents IS NULL OR price_cents >= price_min_cents)
    AND (price_max_cents IS NULL OR price_cents <= price_max_cents)
    AND (rating_min IS NULL OR average_rating >= rating_min)
    AND (tier_filter IS NULL OR minimum_tier = tier_filter)
  )
  
  -- Category facets
  SELECT jsonb_object_agg(category, template_count)
  INTO category_facets
  FROM (
    SELECT category, COUNT(*) as template_count
    FROM filtered_templates
    GROUP BY category
    ORDER BY template_count DESC
  ) cat;
  
  -- Price range facets
  SELECT jsonb_build_object(
    '0-1000', COUNT(*) FILTER (WHERE price_cents < 1000),
    '1000-2500', COUNT(*) FILTER (WHERE price_cents >= 1000 AND price_cents < 2500),
    '2500-5000', COUNT(*) FILTER (WHERE price_cents >= 2500 AND price_cents < 5000),
    '5000-10000', COUNT(*) FILTER (WHERE price_cents >= 5000 AND price_cents < 10000),
    '10000+', COUNT(*) FILTER (WHERE price_cents >= 10000)
  )
  INTO price_facets
  FROM filtered_templates;
  
  -- Rating facets  
  SELECT jsonb_build_object(
    '4.5+', COUNT(*) FILTER (WHERE average_rating >= 4.5),
    '4.0+', COUNT(*) FILTER (WHERE average_rating >= 4.0),
    '3.5+', COUNT(*) FILTER (WHERE average_rating >= 3.5),
    '3.0+', COUNT(*) FILTER (WHERE average_rating >= 3.0)
  )
  INTO rating_facets
  FROM filtered_templates;
  
  -- Tier facets
  SELECT jsonb_object_agg(minimum_tier, template_count)
  INTO tier_facets
  FROM (
    SELECT minimum_tier, COUNT(*) as template_count
    FROM filtered_templates
    GROUP BY minimum_tier
    ORDER BY template_count DESC
  ) tiers;
  
  -- Tag facets (top 20 most popular)
  SELECT jsonb_object_agg(tag, tag_count)
  INTO tag_facets
  FROM (
    SELECT unnest(tags) as tag, COUNT(*) as tag_count
    FROM filtered_templates
    WHERE tags IS NOT NULL
    GROUP BY tag
    ORDER BY tag_count DESC
    LIMIT 20
  ) tags;
  
  -- Wedding type facets
  SELECT jsonb_object_agg(wedding_type, type_count)
  INTO wedding_type_facets
  FROM (
    SELECT unnest(target_wedding_types) as wedding_type, COUNT(*) as type_count
    FROM filtered_templates
    WHERE target_wedding_types IS NOT NULL
    GROUP BY wedding_type
    ORDER BY type_count DESC
  ) types;
  
  -- Combine all facets
  facets := jsonb_build_object(
    'categories', COALESCE(category_facets, '{}'::jsonb),
    'price_ranges', COALESCE(price_facets, '{}'::jsonb),
    'ratings', COALESCE(rating_facets, '{}'::jsonb),
    'tiers', COALESCE(tier_facets, '{}'::jsonb),
    'tags', COALESCE(tag_facets, '{}'::jsonb),
    'wedding_types', COALESCE(wedding_type_facets, '{}'::jsonb)
  );
  
  RETURN facets;
END;
$$ LANGUAGE plpgsql;

-- Function for advanced marketplace search with relevance scoring
CREATE OR REPLACE FUNCTION search_marketplace_templates(
  search_query TEXT DEFAULT '',
  category_filter VARCHAR(50) DEFAULT NULL,
  subcategory_filter VARCHAR(50) DEFAULT NULL,
  price_min_cents INTEGER DEFAULT NULL,
  price_max_cents INTEGER DEFAULT NULL,
  rating_min DECIMAL DEFAULT NULL,
  tier_filter VARCHAR(20) DEFAULT NULL,
  tag_filters TEXT[] DEFAULT NULL,
  wedding_type_filters TEXT[] DEFAULT NULL,
  sort_by VARCHAR(50) DEFAULT 'relevance',
  sort_direction VARCHAR(4) DEFAULT 'DESC',
  page_offset INTEGER DEFAULT 0,
  page_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
  id UUID,
  supplier_id UUID,
  title VARCHAR(255),
  description TEXT,
  template_type VARCHAR(50),
  category VARCHAR(50),
  subcategory VARCHAR(50),
  price_cents INTEGER,
  currency VARCHAR(3),
  minimum_tier VARCHAR(20),
  preview_data JSONB,
  preview_images TEXT[],
  demo_url TEXT,
  install_count INTEGER,
  view_count INTEGER,
  conversion_rate DECIMAL(5,4),
  average_rating DECIMAL(3,2),
  rating_count INTEGER,
  status VARCHAR(20),
  target_wedding_types TEXT[],
  target_price_range VARCHAR(50),
  seasonal_relevance TEXT[],
  tags TEXT[],
  featured BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  search_rank REAL,
  highlighted_title TEXT,
  highlighted_description TEXT
) AS $$
DECLARE
  base_query TEXT;
  order_clause TEXT;
BEGIN
  -- Build ORDER BY clause based on sort_by parameter
  CASE sort_by
    WHEN 'price' THEN order_clause := 'price_cents ' || sort_direction;
    WHEN 'rating' THEN order_clause := 'average_rating ' || sort_direction || ', rating_count DESC';
    WHEN 'popularity' THEN order_clause := 'install_count ' || sort_direction || ', average_rating DESC';
    WHEN 'newest' THEN order_clause := 'created_at ' || sort_direction;
    WHEN 'featured' THEN order_clause := 'featured DESC, search_rank DESC, average_rating DESC';
    ELSE order_clause := 'search_rank DESC, featured DESC, average_rating DESC';
  END CASE;

  RETURN QUERY EXECUTE format('
    WITH search_results AS (
      SELECT 
        mt.*,
        CASE 
          WHEN $1 = '''' THEN 1.0
          ELSE ts_rank_cd(search_vector, plainto_tsquery(''english'', $1)) * 
               CASE WHEN featured THEN 1.5 ELSE 1.0 END *
               CASE WHEN average_rating >= 4.5 THEN 1.3
                    WHEN average_rating >= 4.0 THEN 1.2
                    WHEN average_rating >= 3.5 THEN 1.1
                    ELSE 1.0 END *
               CASE WHEN install_count > 100 THEN 1.2
                    WHEN install_count > 50 THEN 1.1
                    ELSE 1.0 END
        END as search_rank,
        
        CASE 
          WHEN $1 = '''' THEN title
          ELSE ts_headline(''english'', title, plainto_tsquery(''english'', $1), 
                          ''StartSel=<mark>, StopSel=</mark>, MaxWords=20'')
        END as highlighted_title,
        
        CASE 
          WHEN $1 = '''' THEN LEFT(description, 200) || CASE WHEN LENGTH(description) > 200 THEN ''...'' ELSE '''' END
          ELSE ts_headline(''english'', description, plainto_tsquery(''english'', $1), 
                          ''StartSel=<mark>, StopSel=</mark>, MaxWords=50'')
        END as highlighted_description
      
      FROM marketplace_templates mt
      WHERE status = ''active''
      AND ($1 = '''' OR search_vector @@ plainto_tsquery(''english'', $1))
      AND ($2 IS NULL OR category = $2)
      AND ($3 IS NULL OR subcategory = $3)
      AND ($4 IS NULL OR price_cents >= $4)
      AND ($5 IS NULL OR price_cents <= $5)
      AND ($6 IS NULL OR average_rating >= $6)
      AND ($7 IS NULL OR minimum_tier = $7)
      AND ($8 IS NULL OR tags && $8)
      AND ($9 IS NULL OR target_wedding_types && $9)
    )
    SELECT * FROM search_results
    ORDER BY %s
    LIMIT $11 OFFSET $10
  ', order_clause)
  USING 
    search_query, 
    category_filter, 
    subcategory_filter, 
    price_min_cents, 
    price_max_cents, 
    rating_min, 
    tier_filter, 
    tag_filters, 
    wedding_type_filters,
    page_offset, 
    page_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to generate search suggestions based on user input
CREATE OR REPLACE FUNCTION get_search_suggestions(
  partial_query TEXT,
  max_suggestions INTEGER DEFAULT 10
)
RETURNS TABLE(
  suggestion_text VARCHAR(255),
  category VARCHAR(50),
  result_count INTEGER,
  popularity_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH suggestion_candidates AS (
    -- Template titles
    SELECT DISTINCT 
      title as suggestion_text,
      category,
      1 as result_count,
      install_count as popularity_score
    FROM marketplace_templates
    WHERE status = 'active' 
    AND title ILIKE '%' || partial_query || '%'
    
    UNION ALL
    
    -- Category names
    SELECT DISTINCT
      name as suggestion_text,
      slug as category,
      template_count as result_count,
      template_count as popularity_score
    FROM marketplace_categories
    WHERE is_active = true
    AND name ILIKE '%' || partial_query || '%'
    
    UNION ALL
    
    -- Tags
    SELECT DISTINCT
      unnest(tags) as suggestion_text,
      category,
      COUNT(*) OVER (PARTITION BY unnest(tags)) as result_count,
      SUM(install_count) OVER (PARTITION BY unnest(tags)) as popularity_score
    FROM marketplace_templates
    WHERE status = 'active'
    AND EXISTS (
      SELECT 1 FROM unnest(tags) tag WHERE tag ILIKE '%' || partial_query || '%'
    )
    
    UNION ALL
    
    -- Previous search suggestions
    SELECT 
      suggestion_text,
      category,
      result_count,
      search_count as popularity_score
    FROM marketplace_search_suggestions
    WHERE suggestion_text ILIKE '%' || partial_query || '%'
  )
  SELECT 
    sc.suggestion_text,
    sc.category,
    sc.result_count,
    sc.popularity_score
  FROM suggestion_candidates sc
  ORDER BY sc.popularity_score DESC, LENGTH(sc.suggestion_text) ASC
  LIMIT max_suggestions;
END;
$$ LANGUAGE plpgsql;

-- Function to track search queries and update suggestions
CREATE OR REPLACE FUNCTION record_search_query(
  user_id UUID,
  session_id VARCHAR(255),
  search_query TEXT,
  result_count INTEGER,
  clicked_template_id UUID DEFAULT NULL,
  click_position INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Record the search analytics
  INSERT INTO marketplace_search_analytics (
    user_id, session_id, search_query, result_count, 
    clicked_template_id, click_position, converted
  ) VALUES (
    user_id, session_id, search_query, result_count,
    clicked_template_id, click_position, (clicked_template_id IS NOT NULL)
  );
  
  -- Update or create search suggestions based on the query
  WITH query_words AS (
    SELECT unnest(string_to_array(lower(search_query), ' ')) as word
  )
  INSERT INTO marketplace_search_suggestions (query_text, suggestion_text, result_count)
  SELECT DISTINCT search_query, word, result_count
  FROM query_words
  WHERE LENGTH(word) > 2
  ON CONFLICT (query_text, suggestion_text) 
  DO UPDATE SET 
    search_count = marketplace_search_suggestions.search_count + 1,
    result_count = EXCLUDED.result_count,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Performance optimization: Create materialized view for popular searches
CREATE MATERIALIZED VIEW IF NOT EXISTS marketplace_popular_searches AS
SELECT 
  search_query,
  COUNT(*) as search_count,
  AVG(result_count) as avg_result_count,
  COUNT(*) FILTER (WHERE converted = true) as conversion_count,
  ROUND(
    COUNT(*) FILTER (WHERE converted = true)::decimal / 
    NULLIF(COUNT(*), 0) * 100, 2
  ) as conversion_rate
FROM marketplace_search_analytics
WHERE search_timestamp >= NOW() - INTERVAL '30 days'
GROUP BY search_query
HAVING COUNT(*) >= 5
ORDER BY search_count DESC, conversion_rate DESC
LIMIT 1000;

CREATE INDEX idx_marketplace_popular_searches_count ON marketplace_popular_searches(search_count DESC);
CREATE UNIQUE INDEX idx_marketplace_popular_searches_query ON marketplace_popular_searches(search_query);

-- Function to refresh popular searches materialized view
CREATE OR REPLACE FUNCTION refresh_popular_searches()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY marketplace_popular_searches;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on new tables
ALTER TABLE marketplace_search_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_search_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for search suggestions (public read)
CREATE POLICY "Search suggestions are viewable by everyone" ON marketplace_search_suggestions
  FOR SELECT USING (true);

-- RLS Policies for search analytics (own data only) 
CREATE POLICY "Users can view their own search analytics" ON marketplace_search_analytics
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create search analytics" ON marketplace_search_analytics
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text OR user_id IS NULL);

-- Grant permissions
GRANT SELECT ON marketplace_search_suggestions TO authenticated;
GRANT SELECT, INSERT ON marketplace_search_analytics TO authenticated;
GRANT SELECT ON marketplace_popular_searches TO authenticated;

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create a function to clean old search analytics (for performance)
CREATE OR REPLACE FUNCTION cleanup_old_search_analytics()
RETURNS VOID AS $$
BEGIN
  DELETE FROM marketplace_search_analytics 
  WHERE search_timestamp < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;