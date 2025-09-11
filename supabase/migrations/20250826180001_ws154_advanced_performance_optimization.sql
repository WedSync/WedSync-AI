-- WS-154 Seating Arrangements - Round 2 Advanced Performance Optimization
-- Team E - Database Excellence for 500+ Guest Weddings
-- Target: Sub-100ms queries, 70% cache hit rate, enterprise-grade performance

-- ==================================================
-- ADVANCED DATABASE INDEXES FOR 500+ GUESTS
-- ==================================================

-- Composite indexes for complex queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_seating_assignments_performance
  ON seating_assignments(arrangement_id, table_id) 
  INCLUDE (guest_id, seat_number, assigned_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_guest_relationships_optimization
  ON guest_relationships(guest1_id, seating_preference, relationship_strength) 
  INCLUDE (guest2_id, relationship_type, notes);

-- Partial indexes for hot paths
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_relationships_must_together
  ON guest_relationships(guest1_id, guest2_id, relationship_strength)
  WHERE seating_preference = 'must_sit_together' AND is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_relationships_conflicts
  ON guest_relationships(guest1_id, guest2_id, relationship_type)
  WHERE seating_preference IN ('must_separate', 'incompatible') AND is_active = true;

-- Advanced expression indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_guest_fullname_search
  ON guests(LOWER(first_name || ' ' || last_name)) 
  WHERE rsvp_status = 'attending';

-- Covering index for table utilization queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_table_capacity_optimization
  ON reception_tables(couple_id, capacity, table_number)
  INCLUDE (name, table_shape, special_requirements)
  WHERE is_active = true;

-- ==================================================
-- ENHANCED MATERIALIZED VIEWS FOR ANALYTICS
-- ==================================================

-- Pre-computed guest relationship matrix for fast lookups
CREATE MATERIALIZED VIEW IF NOT EXISTS guest_relationship_matrix AS
SELECT 
  g1.couple_id,
  g1.id as guest1_id,
  g2.id as guest2_id,
  g1.first_name || ' ' || g1.last_name as guest1_name,
  g2.first_name || ' ' || g2.last_name as guest2_name,
  COALESCE(gr.relationship_type, 'none') as relationship_type,
  COALESCE(gr.seating_preference, 'neutral') as seating_preference,
  COALESCE(gr.relationship_strength, 0) as relationship_strength,
  -- Pre-compute compatibility score
  CASE 
    WHEN gr.seating_preference = 'must_sit_together' THEN 100
    WHEN gr.seating_preference = 'prefer_together' THEN 50
    WHEN gr.seating_preference = 'neutral' THEN 0
    WHEN gr.seating_preference = 'prefer_apart' THEN -25
    WHEN gr.seating_preference = 'must_separate' THEN -100
    WHEN gr.seating_preference = 'incompatible' THEN -200
    ELSE 0
  END as compatibility_score,
  -- Flags for quick filtering
  (gr.seating_preference IN ('must_sit_together', 'prefer_together')) as prefer_together,
  (gr.seating_preference IN ('must_separate', 'incompatible')) as must_avoid,
  (g1.category = g2.category) as same_category,
  (g1.side = g2.side) as same_side,
  (g1.age_group = g2.age_group) as same_age_group,
  (g1.household_id = g2.household_id AND g1.household_id IS NOT NULL) as same_household
FROM guests g1
CROSS JOIN guests g2
LEFT JOIN guest_relationships gr ON (
  (gr.guest1_id = LEAST(g1.id, g2.id) AND gr.guest2_id = GREATEST(g1.id, g2.id))
  AND gr.is_active = true
)
WHERE g1.id != g2.id
  AND g1.rsvp_status = 'attending'
  AND g2.rsvp_status = 'attending'
  AND g1.couple_id = g2.couple_id;

-- Index the relationship matrix
CREATE UNIQUE INDEX IF NOT EXISTS idx_guest_relationship_matrix_guests
  ON guest_relationship_matrix(couple_id, guest1_id, guest2_id);

CREATE INDEX IF NOT EXISTS idx_guest_relationship_matrix_compatibility
  ON guest_relationship_matrix(couple_id, compatibility_score DESC)
  WHERE compatibility_score != 0;

-- Table assignment optimization view
CREATE MATERIALIZED VIEW IF NOT EXISTS table_assignment_optimization AS
SELECT 
  rt.couple_id,
  rt.id as table_id,
  rt.table_number,
  rt.name as table_name,
  rt.capacity,
  rt.table_shape,
  -- Current assignment metrics for active arrangements
  COALESCE(COUNT(sa.guest_id), 0) as current_guests,
  ROUND(COALESCE(COUNT(sa.guest_id), 0)::decimal / rt.capacity * 100, 1) as utilization_percent,
  (rt.capacity - COALESCE(COUNT(sa.guest_id), 0)) as available_seats,
  -- Guest category distribution
  COUNT(CASE WHEN g.category = 'family' THEN 1 END) as family_count,
  COUNT(CASE WHEN g.category = 'friends' THEN 1 END) as friends_count,
  COUNT(CASE WHEN g.category = 'work' THEN 1 END) as work_count,
  COUNT(CASE WHEN g.side = 'partner1' THEN 1 END) as partner1_count,
  COUNT(CASE WHEN g.side = 'partner2' THEN 1 END) as partner2_count,
  COUNT(CASE WHEN g.age_group = 'child' THEN 1 END) as children_count,
  -- Table diversity score
  CASE 
    WHEN COUNT(DISTINCT g.category) > 1 THEN COUNT(DISTINCT g.category) * 10
    ELSE 5
  END as diversity_score
FROM reception_tables rt
LEFT JOIN seating_assignments sa ON rt.id = sa.table_id
LEFT JOIN seating_arrangements arr ON sa.arrangement_id = arr.id AND arr.is_active = true
LEFT JOIN guests g ON sa.guest_id = g.id
WHERE rt.is_active = true
GROUP BY rt.couple_id, rt.id, rt.table_number, rt.name, rt.capacity, rt.table_shape;

-- Index the table optimization view
CREATE UNIQUE INDEX IF NOT EXISTS idx_table_assignment_optimization_table
  ON table_assignment_optimization(couple_id, table_id);

-- ==================================================
-- ULTRA-FAST OPTIMIZATION FUNCTIONS (SUB-100MS)
-- ==================================================

-- Lightning-fast conflict detection using materialized views
CREATE OR REPLACE FUNCTION fast_detect_seating_conflicts(
  p_couple_id UUID,
  p_arrangement_id UUID DEFAULT NULL
) RETURNS TABLE (
  conflict_type VARCHAR,
  severity VARCHAR,
  guest1_id UUID,
  guest2_id UUID,
  guest1_name TEXT,
  guest2_name TEXT,
  table_name TEXT,
  description TEXT
) 
LANGUAGE plpgsql STABLE
SECURITY DEFINER
SET work_mem = '256MB'
SET effective_cache_size = '4GB'
AS $$
DECLARE
  target_arrangement UUID;
BEGIN
  -- Use active arrangement if none specified
  target_arrangement := COALESCE(
    p_arrangement_id, 
    (SELECT id FROM seating_arrangements WHERE couple_id = p_couple_id AND is_active = true LIMIT 1)
  );
  
  IF target_arrangement IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  -- Relationship conflicts (same table, should be separated)
  SELECT 
    'relationship_conflict'::VARCHAR as conflict_type,
    CASE 
      WHEN grm.seating_preference = 'incompatible' THEN 'critical'
      WHEN grm.seating_preference = 'must_separate' THEN 'high'
      ELSE 'medium'
    END::VARCHAR as severity,
    grm.guest1_id,
    grm.guest2_id,
    grm.guest1_name,
    grm.guest2_name,
    rt.name as table_name,
    format('%s and %s should not sit together (%s relationship)', 
           grm.guest1_name, grm.guest2_name, grm.relationship_type) as description
  FROM guest_relationship_matrix grm
  JOIN seating_assignments sa1 ON grm.guest1_id = sa1.guest_id
  JOIN seating_assignments sa2 ON grm.guest2_id = sa2.guest_id
  JOIN reception_tables rt ON sa1.table_id = rt.id
  WHERE grm.couple_id = p_couple_id
    AND sa1.arrangement_id = target_arrangement
    AND sa2.arrangement_id = target_arrangement
    AND sa1.table_id = sa2.table_id
    AND grm.must_avoid = true
  
  UNION ALL
  
  -- Capacity violations
  SELECT 
    'capacity_violation'::VARCHAR as conflict_type,
    'high'::VARCHAR as severity,
    NULL::UUID as guest1_id,
    NULL::UUID as guest2_id,
    NULL::TEXT as guest1_name,
    NULL::TEXT as guest2_name,
    tao.table_name,
    format('Table %s exceeds capacity: %s guests assigned, capacity is %s', 
           tao.table_name, tao.current_guests, tao.capacity) as description
  FROM table_assignment_optimization tao
  WHERE tao.couple_id = p_couple_id
    AND tao.current_guests > tao.capacity;
END;
$$;

-- Optimized guest compatibility scoring
CREATE OR REPLACE FUNCTION calculate_compatibility_score(
  p_guest1_id UUID,
  p_guest2_id UUID,
  p_couple_id UUID
) RETURNS INTEGER
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
  SELECT compatibility_score
  FROM guest_relationship_matrix
  WHERE couple_id = p_couple_id
    AND guest1_id = LEAST(p_guest1_id, p_guest2_id)
    AND guest2_id = GREATEST(p_guest1_id, p_guest2_id)
  LIMIT 1;
$$;

-- High-performance table utilization analysis
CREATE OR REPLACE FUNCTION analyze_table_utilization(p_couple_id UUID)
RETURNS TABLE (
  table_id UUID,
  table_name TEXT,
  capacity INTEGER,
  current_guests INTEGER,
  utilization_percent DECIMAL,
  available_seats INTEGER,
  diversity_score INTEGER,
  optimization_score INTEGER
)
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
  SELECT 
    tao.table_id,
    tao.table_name,
    tao.capacity,
    tao.current_guests,
    tao.utilization_percent,
    tao.available_seats,
    tao.diversity_score,
    -- Calculate optimization score
    (
      CASE 
        WHEN tao.utilization_percent BETWEEN 70 AND 90 THEN 50
        WHEN tao.utilization_percent BETWEEN 60 AND 70 THEN 40
        WHEN tao.utilization_percent BETWEEN 50 AND 60 THEN 30
        ELSE 10
      END +
      tao.diversity_score +
      CASE WHEN tao.children_count > 0 AND (tao.family_count + tao.friends_count) > tao.children_count THEN 20 ELSE 0 END
    )::INTEGER as optimization_score
  FROM table_assignment_optimization tao
  WHERE tao.couple_id = p_couple_id
  ORDER BY optimization_score DESC;
$$;

-- ==================================================
-- QUERY RESULT CACHING SYSTEM
-- ==================================================

-- Cache table for expensive query results
CREATE TABLE IF NOT EXISTS seating_query_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  cache_key VARCHAR(255) NOT NULL,
  query_type VARCHAR(100) NOT NULL,
  query_params JSONB NOT NULL DEFAULT '{}',
  result_data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  hit_count INTEGER DEFAULT 0,
  
  UNIQUE(couple_id, cache_key)
);

-- Indexes for cache performance
CREATE INDEX IF NOT EXISTS idx_seating_query_cache_lookup
  ON seating_query_cache(couple_id, cache_key, expires_at);

CREATE INDEX IF NOT EXISTS idx_seating_query_cache_expiry
  ON seating_query_cache(expires_at) 
  WHERE expires_at > NOW();

-- Cache management functions
CREATE OR REPLACE FUNCTION get_cached_result(
  p_couple_id UUID,
  p_cache_key VARCHAR,
  p_extend_expiry BOOLEAN DEFAULT false
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cached_result JSONB;
BEGIN
  SELECT result_data INTO cached_result
  FROM seating_query_cache
  WHERE couple_id = p_couple_id
    AND cache_key = p_cache_key
    AND expires_at > NOW();
  
  IF FOUND AND p_extend_expiry THEN
    UPDATE seating_query_cache
    SET hit_count = hit_count + 1,
        expires_at = NOW() + INTERVAL '30 minutes'
    WHERE couple_id = p_couple_id AND cache_key = p_cache_key;
  END IF;
  
  RETURN cached_result;
END;
$$;

CREATE OR REPLACE FUNCTION set_cached_result(
  p_couple_id UUID,
  p_cache_key VARCHAR,
  p_query_type VARCHAR,
  p_query_params JSONB,
  p_result_data JSONB,
  p_ttl_minutes INTEGER DEFAULT 30
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO seating_query_cache (
    couple_id, cache_key, query_type, query_params, result_data, expires_at
  ) VALUES (
    p_couple_id, p_cache_key, p_query_type, p_query_params, p_result_data,
    NOW() + (p_ttl_minutes || ' minutes')::INTERVAL
  )
  ON CONFLICT (couple_id, cache_key)
  DO UPDATE SET
    query_params = EXCLUDED.query_params,
    result_data = EXCLUDED.result_data,
    expires_at = EXCLUDED.expires_at,
    hit_count = seating_query_cache.hit_count + 1;
END;
$$;

-- Cache cleanup job
CREATE OR REPLACE FUNCTION cleanup_expired_cache() RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM seating_query_cache WHERE expires_at <= NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ==================================================
-- CONNECTION POOL OPTIMIZATION SETTINGS
-- ==================================================

-- Optimize connection settings for seating queries
CREATE OR REPLACE FUNCTION optimize_seating_session() RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Increase work memory for complex sorting and joins
  PERFORM set_config('work_mem', '256MB', false);
  
  -- Increase effective cache size assumption
  PERFORM set_config('effective_cache_size', '4GB', false);
  
  -- Optimize for analytical workloads
  PERFORM set_config('random_page_cost', '1.1', false);
  
  -- Increase statistics target for better plans
  PERFORM set_config('default_statistics_target', '1000', false);
  
  -- Enable parallel query execution
  PERFORM set_config('max_parallel_workers_per_gather', '4', false);
  
  -- Optimize hash operations
  PERFORM set_config('hash_mem_multiplier', '2', false);
END;
$$;

-- ==================================================
-- BACKGROUND MAINTENANCE JOBS
-- ==================================================

-- Refresh materialized views efficiently
CREATE OR REPLACE FUNCTION refresh_seating_materialized_views(p_couple_id UUID DEFAULT NULL)
RETURNS TABLE (
  view_name TEXT,
  refresh_time_ms INTEGER,
  row_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
  row_count BIGINT;
BEGIN
  -- Refresh guest relationship matrix
  start_time := clock_timestamp();
  
  IF p_couple_id IS NOT NULL THEN
    -- Partial refresh for specific couple (not supported by PostgreSQL, so full refresh)
    REFRESH MATERIALIZED VIEW CONCURRENTLY guest_relationship_matrix;
  ELSE
    REFRESH MATERIALIZED VIEW CONCURRENTLY guest_relationship_matrix;
  END IF;
  
  end_time := clock_timestamp();
  SELECT COUNT(*) INTO row_count FROM guest_relationship_matrix;
  
  RETURN QUERY SELECT 
    'guest_relationship_matrix'::TEXT,
    EXTRACT(milliseconds FROM (end_time - start_time))::INTEGER,
    row_count;
  
  -- Refresh table assignment optimization
  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW CONCURRENTLY table_assignment_optimization;
  end_time := clock_timestamp();
  SELECT COUNT(*) INTO row_count FROM table_assignment_optimization;
  
  RETURN QUERY SELECT 
    'table_assignment_optimization'::TEXT,
    EXTRACT(milliseconds FROM (end_time - start_time))::INTEGER,
    row_count;
    
  -- Refresh original seating optimization view
  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW CONCURRENTLY seating_optimization_view;
  end_time := clock_timestamp();
  SELECT COUNT(*) INTO row_count FROM seating_optimization_view;
  
  RETURN QUERY SELECT 
    'seating_optimization_view'::TEXT,
    EXTRACT(milliseconds FROM (end_time - start_time))::INTEGER,
    row_count;
END;
$$;

-- ==================================================
-- PERFORMANCE MONITORING VIEWS
-- ==================================================

-- Monitor query performance for seating operations
CREATE OR REPLACE VIEW seating_performance_monitor AS
SELECT 
  query_type,
  COUNT(*) as total_queries,
  AVG(EXTRACT(milliseconds FROM (expires_at - created_at))) as avg_ttl_ms,
  AVG(hit_count) as avg_hit_count,
  MAX(hit_count) as max_hit_count,
  COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active_entries,
  COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired_entries
FROM seating_query_cache
GROUP BY query_type
ORDER BY total_queries DESC;

-- Database health monitoring for seating system
CREATE OR REPLACE VIEW seating_database_health AS
SELECT 
  'reception_tables' as table_name,
  (SELECT COUNT(*) FROM reception_tables WHERE is_active = true) as active_rows,
  (SELECT COUNT(*) FROM reception_tables) as total_rows,
  pg_size_pretty(pg_total_relation_size('reception_tables')) as table_size
UNION ALL
SELECT 
  'guest_relationships',
  (SELECT COUNT(*) FROM guest_relationships WHERE is_active = true),
  (SELECT COUNT(*) FROM guest_relationships),
  pg_size_pretty(pg_total_relation_size('guest_relationships'))
UNION ALL
SELECT 
  'seating_assignments',
  (SELECT COUNT(*) FROM seating_assignments),
  (SELECT COUNT(*) FROM seating_assignments),
  pg_size_pretty(pg_total_relation_size('seating_assignments'))
UNION ALL
SELECT 
  'guest_relationship_matrix',
  (SELECT COUNT(*) FROM guest_relationship_matrix),
  (SELECT COUNT(*) FROM guest_relationship_matrix),
  pg_size_pretty(pg_total_relation_size('guest_relationship_matrix'));

-- ==================================================
-- AUTOMATED TRIGGERS FOR CACHE INVALIDATION
-- ==================================================

-- Function to invalidate cache when data changes
CREATE OR REPLACE FUNCTION invalidate_seating_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- Clear related cache entries
  DELETE FROM seating_query_cache 
  WHERE couple_id = COALESCE(NEW.couple_id, OLD.couple_id)
    AND (
      cache_key LIKE '%seating%' OR
      cache_key LIKE '%relationship%' OR
      cache_key LIKE '%table%'
    );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply cache invalidation triggers
CREATE TRIGGER trigger_invalidate_cache_on_table_change
  AFTER INSERT OR UPDATE OR DELETE ON reception_tables
  FOR EACH ROW EXECUTE FUNCTION invalidate_seating_cache();

CREATE TRIGGER trigger_invalidate_cache_on_relationship_change
  AFTER INSERT OR UPDATE OR DELETE ON guest_relationships
  FOR EACH ROW EXECUTE FUNCTION invalidate_seating_cache();

CREATE TRIGGER trigger_invalidate_cache_on_assignment_change
  AFTER INSERT OR UPDATE OR DELETE ON seating_assignments
  FOR EACH ROW EXECUTE FUNCTION invalidate_seating_cache();

-- ==================================================
-- BATCH OPERATIONS FOR LARGE DATASETS
-- ==================================================

-- Batch process large wedding optimizations
CREATE OR REPLACE FUNCTION batch_process_seating_optimization(
  p_couple_id UUID,
  p_batch_size INTEGER DEFAULT 100
) RETURNS TABLE (
  batch_number INTEGER,
  guests_processed INTEGER,
  processing_time_ms INTEGER,
  conflicts_found INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_guests INTEGER;
  current_batch INTEGER := 1;
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
  batch_conflicts INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_guests
  FROM guests
  WHERE couple_id = p_couple_id AND rsvp_status = 'attending';
  
  -- Process in batches to avoid memory issues
  FOR guest_batch IN 
    SELECT array_agg(id) as guest_ids
    FROM (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
      FROM guests
      WHERE couple_id = p_couple_id AND rsvp_status = 'attending'
    ) t
    GROUP BY ((rn - 1) / p_batch_size)
  LOOP
    start_time := clock_timestamp();
    
    -- Process batch conflicts
    SELECT COUNT(*) INTO batch_conflicts
    FROM fast_detect_seating_conflicts(p_couple_id);
    
    end_time := clock_timestamp();
    
    RETURN QUERY SELECT 
      current_batch,
      array_length(guest_batch.guest_ids, 1),
      EXTRACT(milliseconds FROM (end_time - start_time))::INTEGER,
      batch_conflicts;
    
    current_batch := current_batch + 1;
  END LOOP;
END;
$$;

-- ==================================================
-- STATISTICS AND MAINTENANCE
-- ==================================================

-- Update table statistics for better query planning
ANALYZE reception_tables;
ANALYZE guest_relationships;
ANALYZE seating_arrangements;
ANALYZE seating_assignments;
ANALYZE seating_query_cache;

-- Grant permissions
GRANT EXECUTE ON FUNCTION fast_detect_seating_conflicts(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_compatibility_score(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_table_utilization(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_cached_result(UUID, VARCHAR, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION optimize_seating_session() TO authenticated;

-- Service role permissions
GRANT ALL ON seating_query_cache TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Comments for documentation
COMMENT ON FUNCTION fast_detect_seating_conflicts IS 'Ultra-fast conflict detection optimized for 500+ guest weddings';
COMMENT ON FUNCTION calculate_compatibility_score IS 'Lightning-fast compatibility scoring using materialized views';
COMMENT ON FUNCTION analyze_table_utilization IS 'High-performance table utilization analysis';
COMMENT ON TABLE seating_query_cache IS 'Query result cache for expensive seating operations';

-- Performance validation
DO $$
DECLARE
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
  execution_time INTEGER;
BEGIN
  start_time := clock_timestamp();
  
  -- Test fast conflict detection
  PERFORM fast_detect_seating_conflicts('00000000-0000-0000-0000-000000000000');
  
  end_time := clock_timestamp();
  execution_time := EXTRACT(milliseconds FROM (end_time - start_time));
  
  RAISE NOTICE 'Performance test completed in % ms', execution_time;
  
  IF execution_time > 100 THEN
    RAISE WARNING 'Performance target not met: % ms > 100 ms', execution_time;
  ELSE
    RAISE NOTICE 'Performance target achieved: % ms < 100 ms', execution_time;
  END IF;
END $$;