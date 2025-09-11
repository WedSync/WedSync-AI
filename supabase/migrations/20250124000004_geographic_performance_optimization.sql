-- WS-116: Geographic Performance Optimization
-- Additional indexes and optimizations for high-performance geographic queries

-- Enable necessary extensions for advanced indexing
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Advanced PostGIS indexes for geometric operations
CREATE INDEX IF NOT EXISTS idx_suppliers_location_gist_advanced 
ON suppliers USING gist(ST_MakePoint(longitude, latitude)) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND is_published = true;

-- Composite indexes for common search patterns
CREATE INDEX IF NOT EXISTS idx_suppliers_category_published_location 
ON suppliers(primary_category, is_published, latitude, longitude) 
WHERE is_published = true AND latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_suppliers_rating_category_location 
ON suppliers(average_rating DESC, primary_category, latitude, longitude) 
WHERE is_published = true AND average_rating IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_suppliers_verified_category_location 
ON suppliers(is_verified, primary_category, latitude, longitude) 
WHERE is_published = true AND is_verified = true;

-- Geographic hierarchy traversal indexes
CREATE INDEX IF NOT EXISTS idx_cities_population_location 
ON cities(population DESC, location) 
WHERE population IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cities_state_population 
ON cities(state_id, population DESC);

CREATE INDEX IF NOT EXISTS idx_postcodes_city_location 
ON postcodes(city_id, location);

-- Service area query optimization indexes
CREATE INDEX IF NOT EXISTS idx_supplier_service_areas_coverage 
ON supplier_service_areas(service_type, nationwide_coverage, service_radius_km);

CREATE INDEX IF NOT EXISTS idx_supplier_service_areas_priority 
ON supplier_service_areas(supplier_id, priority_level, is_primary_area);

-- Search cache optimization indexes
CREATE INDEX IF NOT EXISTS idx_location_search_cache_performance 
ON location_search_cache(search_location, radius_km, expires_at) 
USING gist(search_location);

-- Analytics indexes for performance monitoring
CREATE INDEX IF NOT EXISTS idx_geographic_search_analytics_performance 
ON geographic_search_analytics(created_at DESC, search_time_ms, results_found);

CREATE INDEX IF NOT EXISTS idx_geographic_search_analytics_popular_locations 
ON geographic_search_analytics USING gist(search_location) 
WHERE results_found > 0;

-- Partial indexes for common filters
CREATE INDEX IF NOT EXISTS idx_suppliers_premium_location 
ON suppliers(latitude, longitude, average_rating DESC, total_reviews DESC) 
WHERE is_published = true AND is_verified = true AND average_rating >= 4.0;

CREATE INDEX IF NOT EXISTS idx_suppliers_budget_friendly 
ON suppliers(latitude, longitude, price_range) 
WHERE is_published = true AND price_range IN ('£', '££');

CREATE INDEX IF NOT EXISTS idx_suppliers_high_end 
ON suppliers(latitude, longitude, price_range) 
WHERE is_published = true AND price_range IN ('£££', '££££');

-- Text search indexes for location names
CREATE INDEX IF NOT EXISTS idx_cities_name_trgm 
ON cities USING gin(name gin_trgm_ops, ascii_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_states_name_trgm 
ON states USING gin(name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_postcodes_code_trgm 
ON postcodes USING gin(code gin_trgm_ops, formatted_code gin_trgm_ops);

-- Advanced geospatial functions for optimization
CREATE OR REPLACE FUNCTION optimized_distance_query(
  center_lat DECIMAL,
  center_lng DECIMAL,
  radius_km INTEGER,
  category_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE(
  supplier_id UUID,
  business_name VARCHAR,
  latitude DECIMAL,
  longitude DECIMAL,
  distance_km DECIMAL,
  category VARCHAR
) AS $$
BEGIN
  -- Use spatial index for initial filtering, then calculate precise distances
  RETURN QUERY
  SELECT 
    s.id,
    s.business_name,
    s.latitude,
    s.longitude,
    ROUND(CAST(ST_Distance(
      ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(s.longitude, s.latitude), 4326)::geography
    ) / 1000 AS numeric), 2) as distance_km,
    s.primary_category
  FROM suppliers s
  WHERE 
    s.is_published = true
    AND s.latitude IS NOT NULL 
    AND s.longitude IS NOT NULL
    AND ST_DWithin(
      ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(s.longitude, s.latitude), 4326)::geography,
      radius_km * 1000
    )
    AND (category_filter IS NULL OR s.primary_category = category_filter)
  ORDER BY 
    ST_SetSRID(ST_MakePoint(s.longitude, s.latitude), 4326) <-> 
    ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function for efficient city-based supplier lookup
CREATE OR REPLACE FUNCTION get_suppliers_in_city(
  city_name TEXT,
  category_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE(
  supplier_id UUID,
  business_name VARCHAR,
  category VARCHAR,
  city VARCHAR,
  rating DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.business_name,
    s.primary_category,
    c.name as city,
    s.average_rating
  FROM suppliers s
  JOIN cities c ON s.city_id = c.id
  WHERE 
    s.is_published = true
    AND LOWER(c.name) = LOWER(city_name)
    AND (category_filter IS NULL OR s.primary_category = category_filter)
  ORDER BY s.average_rating DESC NULLS LAST, s.total_reviews DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to find popular locations for a category
CREATE OR REPLACE FUNCTION find_popular_locations_for_category(
  search_category TEXT,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE(
  location_name TEXT,
  supplier_count INTEGER,
  avg_rating DECIMAL,
  center_lat DECIMAL,
  center_lng DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.name as location_name,
    COUNT(s.id)::INTEGER as supplier_count,
    ROUND(AVG(s.average_rating), 2) as avg_rating,
    ST_Y(c.location)::DECIMAL as center_lat,
    ST_X(c.location)::DECIMAL as center_lng
  FROM cities c
  JOIN suppliers s ON s.city_id = c.id
  WHERE 
    s.is_published = true
    AND s.primary_category = search_category
  GROUP BY c.id, c.name, c.location
  HAVING COUNT(s.id) >= 3  -- At least 3 suppliers
  ORDER BY supplier_count DESC, avg_rating DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Materialized view for popular search locations
CREATE MATERIALIZED VIEW IF NOT EXISTS popular_search_locations AS
SELECT 
  c.id as city_id,
  c.name as city_name,
  c.location,
  s.name as state_name,
  COUNT(DISTINCT sp.id) as total_suppliers,
  COUNT(DISTINCT CASE WHEN sp.is_verified THEN sp.id END) as verified_suppliers,
  ROUND(AVG(sp.average_rating), 2) as avg_rating,
  ARRAY_AGG(DISTINCT sp.primary_category) FILTER (WHERE sp.primary_category IS NOT NULL) as categories
FROM cities c
LEFT JOIN states s ON c.state_id = s.id
LEFT JOIN suppliers sp ON sp.city_id = c.id AND sp.is_published = true
WHERE c.population > 10000 OR COUNT(DISTINCT sp.id) >= 5
GROUP BY c.id, c.name, c.location, s.name
HAVING COUNT(DISTINCT sp.id) >= 1
ORDER BY total_suppliers DESC, avg_rating DESC;

-- Index on materialized view
CREATE INDEX IF NOT EXISTS idx_popular_search_locations_suppliers 
ON popular_search_locations(total_suppliers DESC, verified_suppliers DESC);

CREATE INDEX IF NOT EXISTS idx_popular_search_locations_location 
ON popular_search_locations USING gist(location);

-- Function to refresh popular locations (call periodically)
CREATE OR REPLACE FUNCTION refresh_popular_search_locations()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW popular_search_locations;
END;
$$ LANGUAGE plpgsql;

-- Search performance monitoring table
CREATE TABLE IF NOT EXISTS search_performance_metrics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  query_type VARCHAR(100) NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  result_count INTEGER NOT NULL,
  parameters JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_performance_metrics_query_type 
ON search_performance_metrics(query_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_performance_metrics_execution_time 
ON search_performance_metrics(execution_time_ms DESC, created_at DESC);

-- Function to log search performance
CREATE OR REPLACE FUNCTION log_search_performance(
  p_query_type TEXT,
  p_execution_time INTEGER,
  p_result_count INTEGER,
  p_parameters JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Only log if execution time is significant or result count is low
  IF p_execution_time > 100 OR p_result_count = 0 THEN
    INSERT INTO search_performance_metrics (
      query_type,
      execution_time_ms,
      result_count,
      parameters
    ) VALUES (
      p_query_type,
      p_execution_time,
      p_result_count,
      p_parameters
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Cleanup old performance metrics (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_performance_metrics()
RETURNS VOID AS $$
BEGIN
  DELETE FROM search_performance_metrics 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  DELETE FROM geographic_search_analytics 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  DELETE FROM location_search_cache 
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run cleanup (if pg_cron is available)
-- SELECT cron.schedule('cleanup-geographic-data', '0 2 * * *', 'SELECT cleanup_old_performance_metrics();');

-- Performance analysis views
CREATE OR REPLACE VIEW search_performance_summary AS
SELECT 
  query_type,
  COUNT(*) as total_queries,
  ROUND(AVG(execution_time_ms), 2) as avg_execution_time_ms,
  ROUND(AVG(result_count), 2) as avg_result_count,
  MAX(execution_time_ms) as max_execution_time_ms,
  MIN(execution_time_ms) as min_execution_time_ms,
  ROUND(STDDEV(execution_time_ms), 2) as stddev_execution_time_ms
FROM search_performance_metrics
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY query_type
ORDER BY avg_execution_time_ms DESC;

-- Index usage monitoring
CREATE OR REPLACE VIEW geographic_index_usage AS
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_tup_read,
  idx_tup_fetch,
  idx_scan,
  CASE 
    WHEN idx_scan = 0 THEN 0 
    ELSE ROUND((idx_tup_read::NUMERIC / idx_scan), 2) 
  END as avg_tuples_per_scan
FROM pg_stat_user_indexes
WHERE tablename IN ('suppliers', 'cities', 'states', 'postcodes', 'supplier_service_areas')
ORDER BY idx_scan DESC;

-- Query to identify slow geographic queries
CREATE OR REPLACE VIEW slow_geographic_queries AS
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  stddev_time,
  rows,
  100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
WHERE query LIKE '%suppliers%' 
   OR query LIKE '%cities%'
   OR query LIKE '%ST_%'
   OR query LIKE '%geographic%'
ORDER BY mean_time DESC;

-- Vacuum and analyze optimization for geographic tables
CREATE OR REPLACE FUNCTION optimize_geographic_tables()
RETURNS VOID AS $$
BEGIN
  -- Analyze tables to update statistics
  ANALYZE suppliers;
  ANALYZE cities;
  ANALYZE states;
  ANALYZE postcodes;
  ANALYZE supplier_service_areas;
  ANALYZE location_search_cache;
  ANALYZE geographic_search_analytics;
  
  -- Refresh materialized view
  REFRESH MATERIALIZED VIEW popular_search_locations;
  
  -- Update table statistics
  UPDATE pg_stat_user_tables SET n_tup_ins = n_tup_ins WHERE schemaname = 'public';
END;
$$ LANGUAGE plpgsql;

-- Create indexes on foreign key relationships if not already existing
CREATE INDEX IF NOT EXISTS idx_suppliers_city_fk ON suppliers(city_id) WHERE city_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_state_fk ON suppliers(state_id) WHERE state_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_country_fk ON suppliers(country_id) WHERE country_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_postcode_fk ON suppliers(postcode_id) WHERE postcode_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cities_state_fk ON cities(state_id) WHERE state_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cities_country_fk ON cities(country_id) WHERE country_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_states_country_fk ON states(country_id) WHERE country_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_postcodes_city_fk ON postcodes(city_id) WHERE city_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_postcodes_state_fk ON postcodes(state_id) WHERE state_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_postcodes_country_fk ON postcodes(country_id) WHERE country_id IS NOT NULL;

-- Explain analyze helper function for debugging
CREATE OR REPLACE FUNCTION explain_geographic_query(query_text TEXT)
RETURNS TABLE(explain_output TEXT) AS $$
BEGIN
  RETURN QUERY EXECUTE 'EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ' || query_text;
END;
$$ LANGUAGE plpgsql;

-- Performance hints and comments
COMMENT ON INDEX idx_suppliers_location_gist_advanced IS 
'Primary spatial index for geographic supplier searches - optimized for distance queries';

COMMENT ON INDEX idx_suppliers_category_published_location IS 
'Composite index optimized for category + location searches with published filter';

COMMENT ON FUNCTION optimized_distance_query IS 
'High-performance distance-based supplier search using spatial indexing';

COMMENT ON MATERIALIZED VIEW popular_search_locations IS 
'Cached popular locations with supplier statistics - refresh nightly';

-- Final optimization: Update table statistics
SELECT optimize_geographic_tables();