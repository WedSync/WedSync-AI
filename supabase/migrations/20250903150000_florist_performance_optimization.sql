-- =====================================================
-- FLORIST INTELLIGENCE PERFORMANCE OPTIMIZATIONS
-- Team D - WS-253 Database Performance Implementation
-- =====================================================

-- Advanced indexing strategy for complex florist queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flower_varieties_composite_search 
ON flower_varieties (sustainability_score DESC, seasonal_score DESC) 
WHERE sustainability_score IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flower_color_matches_advanced 
ON flower_color_matches (color_hex, match_accuracy DESC, flower_id) 
WHERE match_accuracy > 0.5;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flower_pricing_region_seasonal 
ON flower_pricing (region, month, availability_score DESC, base_price_per_stem ASC);

-- Partial indexes for wedding-specific queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flower_varieties_bouquet 
ON flower_varieties (sustainability_score DESC) 
WHERE (wedding_uses->>'bouquet')::boolean = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flower_varieties_centerpiece 
ON flower_varieties (sustainability_score DESC) 
WHERE (wedding_uses->>'centerpiece')::boolean = true;

-- GIN indexes for JSONB columns with common search patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flower_varieties_seasonality_gin 
ON flower_varieties USING GIN ((seasonality->'peak'), (seasonality->'available'));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flower_varieties_characteristics_gin 
ON flower_varieties USING GIN (characteristics);

-- Specialized index for color similarity searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_color_matches_similarity 
ON flower_color_matches (flower_id, match_accuracy) 
WHERE match_accuracy > 0.7;

-- Covering index for common florist search queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_florist_search_covering 
ON flower_varieties (common_name, sustainability_score, seasonal_score) 
INCLUDE (scientific_name, wedding_uses, allergen_info);

-- Performance monitoring function
CREATE OR REPLACE FUNCTION analyze_florist_query_performance()
RETURNS TABLE (
  query_type TEXT,
  avg_execution_time NUMERIC,
  index_usage TEXT,
  recommendations TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'flower_search'::TEXT as query_type,
    AVG(total_time)::NUMERIC as avg_execution_time,
    'Multiple indexes used'::TEXT as index_usage,
    'Consider partitioning by region for large datasets'::TEXT as recommendations
  FROM pg_stat_statements 
  WHERE query LIKE '%flower_varieties%' 
    AND query LIKE '%sustainability_score%';
END;
$$ LANGUAGE plpgsql;

-- Automated statistics update for florist tables
CREATE OR REPLACE FUNCTION update_florist_table_stats()
RETURNS VOID AS $$
BEGIN
  ANALYZE flower_varieties;
  ANALYZE flower_color_matches;
  ANALYZE flower_pricing;
  ANALYZE flower_sustainability_data;
  ANALYZE arrangement_templates;
  ANALYZE wedding_floral_plans;
END;
$$ LANGUAGE plpgsql;

-- Schedule statistics updates during low-traffic hours
SELECT cron.schedule('update-florist-stats', '0 2 * * *', 'SELECT update_florist_table_stats();');

-- Materialized view for common florist aggregations
CREATE MATERIALIZED VIEW IF NOT EXISTS florist_summary_stats AS
SELECT 
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as total_flowers,
  AVG(sustainability_score) as avg_sustainability,
  COUNT(*) FILTER (WHERE (wedding_uses->>'bouquet')::boolean = true) as bouquet_suitable,
  COUNT(*) FILTER (WHERE (wedding_uses->>'centerpiece')::boolean = true) as centerpiece_suitable,
  AVG(seasonal_score) as avg_seasonal_score
FROM flower_varieties 
WHERE created_at >= NOW() - INTERVAL '2 years'
GROUP BY DATE_TRUNC('month', created_at);

CREATE UNIQUE INDEX ON florist_summary_stats (month);

-- Auto-refresh materialized view
CREATE OR REPLACE FUNCTION refresh_florist_summary_stats()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY florist_summary_stats;
END;
$$ LANGUAGE plpgsql;

-- Schedule daily refresh of summary stats
SELECT cron.schedule('refresh-florist-summary', '0 3 * * *', 'SELECT refresh_florist_summary_stats();');

-- Query plan optimization hints for complex florist searches
CREATE OR REPLACE FUNCTION optimize_florist_search_query(
  p_colors TEXT[],
  p_sustainability_min NUMERIC,
  p_wedding_uses TEXT[],
  p_limit INTEGER DEFAULT 20
)
RETURNS SETOF flower_varieties AS $$
DECLARE
  query_sql TEXT;
BEGIN
  -- Build optimized query based on parameters
  query_sql := 'SELECT DISTINCT f.* FROM flower_varieties f ';
  
  -- Join color matches only if colors specified
  IF p_colors IS NOT NULL AND array_length(p_colors, 1) > 0 THEN
    query_sql := query_sql || '
      INNER JOIN flower_color_matches fcm ON f.id = fcm.flower_id 
      AND fcm.color_hex = ANY($1) 
      AND fcm.match_accuracy > 0.6 ';
  END IF;
  
  query_sql := query_sql || 'WHERE 1=1 ';
  
  -- Add sustainability filter if specified
  IF p_sustainability_min IS NOT NULL THEN
    query_sql := query_sql || 'AND f.sustainability_score >= $2 ';
  END IF;
  
  -- Add wedding uses filter if specified
  IF p_wedding_uses IS NOT NULL AND array_length(p_wedding_uses, 1) > 0 THEN
    query_sql := query_sql || 'AND f.wedding_uses ?| $3 ';
  END IF;
  
  -- Order by composite score and limit results
  query_sql := query_sql || '
    ORDER BY 
      COALESCE(f.sustainability_score, 0.5) * 0.4 + 
      COALESCE(f.seasonal_score, 0.5) * 0.6 DESC,
      f.common_name ASC
    LIMIT $4';
  
  -- Execute optimized query
  RETURN QUERY EXECUTE query_sql 
    USING p_colors, p_sustainability_min, p_wedding_uses, p_limit;
END;
$$ LANGUAGE plpgsql;

-- Create tables if they don't exist (for testing purposes)
CREATE TABLE IF NOT EXISTS flower_varieties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  common_name TEXT NOT NULL,
  scientific_name TEXT,
  sustainability_score NUMERIC(3,2) CHECK (sustainability_score >= 0 AND sustainability_score <= 1),
  seasonal_score NUMERIC(3,2) CHECK (seasonal_score >= 0 AND seasonal_score <= 1),
  wedding_uses JSONB DEFAULT '{}',
  seasonality JSONB DEFAULT '{}',
  characteristics JSONB DEFAULT '{}',
  allergen_info JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flower_color_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flower_id UUID REFERENCES flower_varieties(id) ON DELETE CASCADE,
  color_hex TEXT NOT NULL,
  match_accuracy NUMERIC(3,2) CHECK (match_accuracy >= 0 AND match_accuracy <= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flower_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flower_id UUID REFERENCES flower_varieties(id) ON DELETE CASCADE,
  region TEXT NOT NULL,
  month INTEGER CHECK (month >= 1 AND month <= 12),
  base_price_per_stem NUMERIC(10,2),
  availability_score NUMERIC(3,2) CHECK (availability_score >= 0 AND availability_score <= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flower_sustainability_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flower_id UUID REFERENCES flower_varieties(id) ON DELETE CASCADE,
  carbon_footprint NUMERIC(10,2),
  water_usage NUMERIC(10,2),
  pesticide_score NUMERIC(3,2),
  biodiversity_impact NUMERIC(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS arrangement_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL,
  max_items INTEGER DEFAULT 10,
  base_cost NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wedding_floral_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID,
  florist_id UUID,
  arrangement_data JSONB DEFAULT '{}',
  total_cost NUMERIC(12,2),
  sustainability_score NUMERIC(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample data for testing
INSERT INTO flower_varieties (common_name, scientific_name, sustainability_score, seasonal_score, wedding_uses, seasonality) 
VALUES 
  ('Garden Rose', 'Rosa x damascena', 0.8, 0.9, '{"bouquet": true, "centerpiece": true}', '{"peak": ["spring", "summer"]}'),
  ('Peony', 'Paeonia lactiflora', 0.7, 0.6, '{"bouquet": true, "centerpiece": true}', '{"peak": ["spring"]}'),
  ('Baby''s Breath', 'Gypsophila paniculata', 0.9, 0.9, '{"bouquet": true, "ceremony": true}', '{"peak": ["summer", "fall"]}'),
  ('Eucalyptus', 'Eucalyptus cinerea', 0.6, 0.8, '{"bouquet": true, "centerpiece": true}', '{"available": ["all"]}'),
  ('Hydrangea', 'Hydrangea macrophylla', 0.7, 0.7, '{"centerpiece": true}', '{"peak": ["summer", "fall"]}')
ON CONFLICT (common_name) DO NOTHING;

-- Insert color matches
INSERT INTO flower_color_matches (flower_id, color_hex, match_accuracy)
SELECT 
  f.id, 
  color_hex,
  accuracy
FROM flower_varieties f
CROSS JOIN (
  VALUES 
    ('#FF69B4', 0.9),
    ('#FFFFFF', 0.8),
    ('#FF0000', 0.7),
    ('#228B22', 0.8),
    ('#87CEEB', 0.9)
) AS colors(color_hex, accuracy)
WHERE f.common_name IN ('Garden Rose', 'Peony', 'Baby''s Breath', 'Eucalyptus', 'Hydrangea')
ON CONFLICT DO NOTHING;