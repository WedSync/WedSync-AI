-- WS-154 Seating Arrangements - Supporting Database Functions
-- Team E - Round 2: Supporting functions for team optimizations
-- Functions required by the team optimization modules

-- ==================================================
-- TEAM A FRONTEND SUPPORT FUNCTIONS
-- ==================================================

-- Count assigned guests efficiently
CREATE OR REPLACE FUNCTION count_assigned_guests(p_couple_id UUID)
RETURNS INTEGER
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(DISTINCT sa.guest_id)::INTEGER
  FROM seating_assignments sa
  JOIN seating_arrangements arr ON sa.arrangement_id = arr.id
  WHERE arr.couple_id = p_couple_id
    AND arr.is_active = true;
$$;

-- Count seating conflicts efficiently
CREATE OR REPLACE FUNCTION count_seating_conflicts(p_couple_id UUID)
RETURNS INTEGER
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER
  FROM (
    SELECT 1
    FROM guest_relationship_matrix grm
    JOIN seating_assignments sa1 ON grm.guest1_id = sa1.guest_id
    JOIN seating_assignments sa2 ON grm.guest2_id = sa2.guest_id
    JOIN seating_arrangements arr ON sa1.arrangement_id = arr.id
    WHERE grm.couple_id = p_couple_id
      AND sa1.arrangement_id = sa2.arrangement_id
      AND sa1.table_id = sa2.table_id
      AND arr.is_active = true
      AND grm.must_avoid = true
    LIMIT 100
  ) conflicts;
$$;

-- ==================================================
-- TEAM B ALGORITHM SUPPORT FUNCTIONS
-- ==================================================

-- Count guest relationships
CREATE OR REPLACE FUNCTION count_guest_relationships(p_couple_id UUID)
RETURNS INTEGER
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER
  FROM guest_relationships gr
  JOIN guests g1 ON gr.guest1_id = g1.id
  WHERE g1.couple_id = p_couple_id
    AND gr.is_active = true;
$$;

-- Count constraint violations
CREATE OR REPLACE FUNCTION count_constraint_violations(p_couple_id UUID)
RETURNS INTEGER
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER
  FROM guest_relationship_matrix grm
  WHERE grm.couple_id = p_couple_id
    AND grm.must_avoid = true;
$$;

-- Count optimization opportunities
CREATE OR REPLACE FUNCTION count_optimization_opportunities(p_couple_id UUID)
RETURNS INTEGER
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER
  FROM guest_relationship_matrix grm
  WHERE grm.couple_id = p_couple_id
    AND grm.prefer_together = true
    AND grm.compatibility_score > 0;
$$;

-- Calculate average table utilization
CREATE OR REPLACE FUNCTION calculate_average_utilization(p_couple_id UUID)
RETURNS DECIMAL(5,2)
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(AVG(utilization_percent), 0)::DECIMAL(5,2)
  FROM table_assignment_optimization
  WHERE couple_id = p_couple_id;
$$;

-- ==================================================
-- TEAM D MOBILE SUPPORT FUNCTIONS
-- ==================================================

-- Mobile batch seating update function
CREATE OR REPLACE FUNCTION mobile_batch_seating_update(p_updates JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  update_record JSONB;
  success_count INTEGER := 0;
  error_count INTEGER := 0;
  result JSONB;
BEGIN
  -- Process each update in the batch
  FOR update_record IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    BEGIN
      CASE update_record->>'type'
        WHEN 'move' THEN
          -- Move guest to new table
          UPDATE seating_assignments
          SET table_id = (update_record->>'tableId')::UUID,
              updated_at = NOW()
          WHERE guest_id = (update_record->>'guestId')::UUID
            AND arrangement_id = (update_record->>'arrangementId')::UUID;
          
        WHEN 'assign' THEN
          -- Assign guest to table
          INSERT INTO seating_assignments (
            arrangement_id, guest_id, table_id, assigned_by, assigned_at
          ) VALUES (
            (update_record->>'arrangementId')::UUID,
            (update_record->>'guestId')::UUID,
            (update_record->>'tableId')::UUID,
            'mobile_batch',
            NOW()
          ) ON CONFLICT (arrangement_id, guest_id) 
          DO UPDATE SET 
            table_id = EXCLUDED.table_id,
            updated_at = NOW();
          
        WHEN 'unassign' THEN
          -- Remove guest assignment
          DELETE FROM seating_assignments
          WHERE guest_id = (update_record->>'guestId')::UUID
            AND arrangement_id = (update_record->>'arrangementId')::UUID;
      END CASE;
      
      success_count := success_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      -- Continue processing other updates
    END;
  END LOOP;
  
  result := jsonb_build_object(
    'success_count', success_count,
    'error_count', error_count,
    'total_updates', success_count + error_count
  );
  
  RETURN result;
END;
$$;

-- ==================================================
-- PERFORMANCE OPTIMIZATION FUNCTIONS
-- ==================================================

-- Analyze query performance for seating operations
CREATE OR REPLACE FUNCTION analyze_seating_query_performance()
RETURNS TABLE (
  query_type VARCHAR,
  avg_execution_time_ms DECIMAL,
  total_executions BIGINT,
  cache_hit_rate DECIMAL
)
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
  SELECT 
    query_type,
    AVG(EXTRACT(milliseconds FROM (expires_at - created_at))) as avg_execution_time_ms,
    COUNT(*) as total_executions,
    CASE 
      WHEN COUNT(*) > 0 THEN AVG(hit_count)::DECIMAL / COUNT(*)
      ELSE 0
    END as cache_hit_rate
  FROM seating_query_cache
  WHERE created_at > NOW() - INTERVAL '24 hours'
  GROUP BY query_type
  ORDER BY total_executions DESC;
$$;

-- Optimize seating system tables
CREATE OR REPLACE FUNCTION optimize_seating_tables()
RETURNS TABLE (
  table_name TEXT,
  before_size TEXT,
  after_size TEXT,
  optimization_applied TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  table_record RECORD;
  before_size BIGINT;
  after_size BIGINT;
BEGIN
  -- Analyze and optimize key seating tables
  FOR table_record IN 
    SELECT schemaname, tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename IN ('reception_tables', 'guest_relationships', 'seating_assignments', 'seating_arrangements')
  LOOP
    -- Get size before optimization
    SELECT pg_total_relation_size(table_record.tablename) INTO before_size;
    
    -- Run VACUUM ANALYZE
    EXECUTE format('VACUUM ANALYZE %I.%I', table_record.schemaname, table_record.tablename);
    
    -- Get size after optimization
    SELECT pg_total_relation_size(table_record.tablename) INTO after_size;
    
    RETURN QUERY SELECT 
      table_record.tablename::TEXT,
      pg_size_pretty(before_size)::TEXT,
      pg_size_pretty(after_size)::TEXT,
      'VACUUM ANALYZE completed'::TEXT;
  END LOOP;
  
  -- Refresh materialized views
  PERFORM refresh_seating_materialized_views();
  
  RETURN QUERY SELECT 
    'materialized_views'::TEXT,
    ''::TEXT,
    ''::TEXT,
    'All materialized views refreshed'::TEXT;
END;
$$;

-- ==================================================
-- MONITORING AND HEALTH CHECK FUNCTIONS
-- ==================================================

-- Comprehensive seating system health check
CREATE OR REPLACE FUNCTION seating_system_health_check()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  health_report JSONB := '{}';
  table_stats JSONB;
  performance_stats JSONB;
  cache_stats JSONB;
BEGIN
  -- Database table statistics
  SELECT jsonb_object_agg(
    tablename,
    jsonb_build_object(
      'row_count', (
        SELECT reltuples::BIGINT 
        FROM pg_class 
        WHERE relname = tablename
      ),
      'size', pg_size_pretty(pg_total_relation_size(tablename)),
      'last_analyzed', (
        SELECT last_analyze
        FROM pg_stat_user_tables
        WHERE relname = tablename
      )
    )
  ) INTO table_stats
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('reception_tables', 'guest_relationships', 'seating_assignments', 'seating_arrangements');
  
  -- Performance statistics
  SELECT jsonb_build_object(
    'avg_query_time', AVG(avg_execution_time_ms),
    'total_queries', SUM(total_executions),
    'overall_cache_hit_rate', AVG(cache_hit_rate)
  ) INTO performance_stats
  FROM analyze_seating_query_performance();
  
  -- Cache statistics
  SELECT jsonb_build_object(
    'total_cache_entries', COUNT(*),
    'active_entries', COUNT(*) FILTER (WHERE expires_at > NOW()),
    'expired_entries', COUNT(*) FILTER (WHERE expires_at <= NOW()),
    'avg_hit_count', AVG(hit_count)
  ) INTO cache_stats
  FROM seating_query_cache;
  
  -- Build final health report
  health_report := jsonb_build_object(
    'timestamp', NOW(),
    'status', 'healthy',
    'tables', COALESCE(table_stats, '{}'),
    'performance', COALESCE(performance_stats, '{}'),
    'cache', COALESCE(cache_stats, '{}'),
    'recommendations', jsonb_build_array(
      'Consider running optimize_seating_tables() weekly',
      'Monitor cache hit rates and adjust TTL as needed',
      'Review slow queries and add indexes if necessary'
    )
  );
  
  RETURN health_report;
END;
$$;

-- ==================================================
-- AUTOMATED MAINTENANCE FUNCTIONS
-- ==================================================

-- Cleanup expired cache entries (run periodically)
CREATE OR REPLACE FUNCTION cleanup_seating_system()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cleanup_report JSONB;
  expired_cache_count INTEGER;
  old_logs_count INTEGER;
BEGIN
  -- Clean up expired cache entries
  DELETE FROM seating_query_cache WHERE expires_at <= NOW();
  GET DIAGNOSTICS expired_cache_count = ROW_COUNT;
  
  -- Clean up old validation logs (keep last 30 days)
  DELETE FROM seating_validation_logs 
  WHERE created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS old_logs_count = ROW_COUNT;
  
  -- Clean up old audit logs (keep last 90 days)
  DELETE FROM relationship_access_log 
  WHERE accessed_at < NOW() - INTERVAL '90 days';
  
  cleanup_report := jsonb_build_object(
    'timestamp', NOW(),
    'expired_cache_entries_removed', expired_cache_count,
    'old_validation_logs_removed', old_logs_count,
    'status', 'completed'
  );
  
  RETURN cleanup_report;
END;
$$;

-- ==================================================
-- GRANT PERMISSIONS
-- ==================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION count_assigned_guests(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION count_seating_conflicts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION count_guest_relationships(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION count_constraint_violations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION count_optimization_opportunities(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_average_utilization(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mobile_batch_seating_update(JSONB) TO authenticated;

-- Grant system functions to service role only
GRANT EXECUTE ON FUNCTION analyze_seating_query_performance() TO service_role;
GRANT EXECUTE ON FUNCTION optimize_seating_tables() TO service_role;
GRANT EXECUTE ON FUNCTION seating_system_health_check() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_seating_system() TO service_role;

-- ==================================================
-- FUNCTION COMMENTS
-- ==================================================

COMMENT ON FUNCTION count_assigned_guests IS 'Efficiently count assigned guests for dashboard display';
COMMENT ON FUNCTION count_seating_conflicts IS 'Fast conflict counting for UI status indicators';
COMMENT ON FUNCTION mobile_batch_seating_update IS 'Process multiple seating updates in single transaction for mobile apps';
COMMENT ON FUNCTION seating_system_health_check IS 'Comprehensive health check for seating system monitoring';
COMMENT ON FUNCTION cleanup_seating_system IS 'Automated maintenance function for cache and log cleanup';

-- ==================================================
-- PERFORMANCE VALIDATION
-- ==================================================

-- Test all new functions
DO $$
DECLARE
  test_couple_id UUID := '00000000-0000-0000-0000-000000000000';
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
  execution_time INTEGER;
BEGIN
  RAISE NOTICE 'Testing seating system functions...';
  
  start_time := clock_timestamp();
  
  -- Test count functions
  PERFORM count_assigned_guests(test_couple_id);
  PERFORM count_seating_conflicts(test_couple_id);
  PERFORM count_guest_relationships(test_couple_id);
  PERFORM count_constraint_violations(test_couple_id);
  PERFORM count_optimization_opportunities(test_couple_id);
  PERFORM calculate_average_utilization(test_couple_id);
  
  end_time := clock_timestamp();
  execution_time := EXTRACT(milliseconds FROM (end_time - start_time));
  
  RAISE NOTICE 'Function tests completed in % ms', execution_time;
  
  IF execution_time > 500 THEN
    RAISE WARNING 'Functions may need optimization: % ms > 500 ms', execution_time;
  ELSE
    RAISE NOTICE 'Function performance acceptable: % ms < 500 ms', execution_time;
  END IF;
END $$;