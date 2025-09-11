-- Performance optimization indexes for verified existing columns only
-- Run EXPLAIN ANALYZE on slow queries to identify missing indexes
-- This migration only creates indexes for columns that actually exist

-- Enable pg_stat_statements if not exists
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Organizations table indexes (verified columns)
CREATE INDEX IF NOT EXISTS idx_organizations_pricing_tier 
ON organizations(pricing_tier)
WHERE pricing_tier IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_created_at 
ON organizations(created_at DESC);

-- Forms table indexes (using verified columns)
CREATE INDEX IF NOT EXISTS idx_forms_organization_is_published 
ON forms(organization_id, is_published)
WHERE is_published IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_forms_created_by 
ON forms(created_by)
WHERE created_by IS NOT NULL;

-- Form submissions table indexes (using verified contact_id instead of submitted_by)
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id 
ON form_submissions(form_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_form_submissions_contact_id 
ON form_submissions(contact_id)
WHERE contact_id IS NOT NULL;

-- Clients table indexes (verified columns)
CREATE INDEX IF NOT EXISTS idx_clients_organization_id 
ON clients(organization_id, created_at DESC);

-- User profiles table indexes (verified columns)  
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id 
ON user_profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_user_profiles_organization_id 
ON user_profiles(organization_id)
WHERE organization_id IS NOT NULL;

-- Suppliers table indexes (verified columns)
CREATE INDEX IF NOT EXISTS idx_suppliers_organization_id 
ON suppliers(organization_id, created_at DESC);

-- Communications table indexes (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'communications') THEN
        CREATE INDEX IF NOT EXISTS idx_communications_client_id 
        ON communications(client_id, created_at DESC);
        
        CREATE INDEX IF NOT EXISTS idx_communications_supplier_id 
        ON communications(supplier_id)
        WHERE supplier_id IS NOT NULL;
    END IF;
END $$;

-- Journey executions table indexes (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'journey_executions') THEN
        CREATE INDEX IF NOT EXISTS idx_journey_executions_client_id 
        ON journey_executions(client_id, created_at DESC);
        
        CREATE INDEX IF NOT EXISTS idx_journey_executions_journey_id 
        ON journey_executions(journey_id);
    END IF;
END $$;

-- Composite indexes for common JOIN queries (only for verified table/column combinations)
CREATE INDEX IF NOT EXISTS idx_forms_org_published_created 
ON forms(organization_id, is_published, created_at DESC)
WHERE is_published IS NOT NULL;

-- Partial indexes for specific query patterns (only for verified columns)
CREATE INDEX IF NOT EXISTS idx_organizations_active_pricing 
ON organizations(id, pricing_tier) 
WHERE pricing_tier IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_forms_published 
ON forms(organization_id, created_at DESC) 
WHERE is_published = true;

-- Query performance monitoring function
CREATE OR REPLACE FUNCTION log_slow_queries() RETURNS void AS $$
DECLARE
  query_record RECORD;
BEGIN
  -- Log queries taking more than 100ms
  FOR query_record IN
    SELECT 
      query,
      calls,
      total_time,
      mean_time,
      max_time
    FROM pg_stat_statements
    WHERE mean_time > 100
    ORDER BY mean_time DESC
    LIMIT 20
  LOOP
    RAISE NOTICE 'Slow query: % (avg: %ms, max: %ms, calls: %)',
      LEFT(query_record.query, 100),
      ROUND(query_record.mean_time::numeric, 2),
      ROUND(query_record.max_time::numeric, 2),
      query_record.calls;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Table statistics update function
CREATE OR REPLACE FUNCTION update_table_statistics() RETURNS void AS $$
BEGIN
  ANALYZE organizations;
  ANALYZE forms;
  ANALYZE form_submissions;
  ANALYZE clients;
  ANALYZE user_profiles;
  ANALYZE suppliers;
  
  -- Conditionally analyze tables that may exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'communications') THEN
    ANALYZE communications;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'journey_executions') THEN
    ANALYZE journey_executions;
  END IF;
  
  RAISE NOTICE 'Table statistics updated at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- View for monitoring index usage (using correct column names)
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
  schemaname,
  relname as tablename,
  indexrelname as indexname,
  idx_scan AS index_scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  CASE 
    WHEN idx_scan = 0 THEN 'UNUSED'
    WHEN idx_scan < 100 THEN 'RARELY_USED'
    ELSE 'ACTIVE'
  END AS usage_status
FROM pg_stat_user_indexes
ORDER BY idx_scan;

-- View for monitoring table sizes
CREATE OR REPLACE VIEW table_size_stats AS
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

COMMENT ON FUNCTION log_slow_queries() IS 'Logs queries with mean execution time > 100ms';
COMMENT ON FUNCTION update_table_statistics() IS 'Updates table statistics for query planner';
COMMENT ON VIEW index_usage_stats IS 'Monitors index usage to identify unused indexes';
COMMENT ON VIEW table_size_stats IS 'Monitors table and index sizes';