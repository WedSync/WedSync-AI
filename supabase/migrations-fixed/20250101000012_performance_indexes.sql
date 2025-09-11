-- Performance optimization indexes for common queries
-- Run EXPLAIN ANALYZE on slow queries to identify missing indexes

-- Organizations table indexes
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer 
ON organizations(stripe_customer_id) 
WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_pricing_tier 
ON organizations(pricing_tier);

CREATE INDEX IF NOT EXISTS idx_organizations_created_at 
ON organizations(created_at DESC);

-- Forms table indexes
CREATE INDEX IF NOT EXISTS idx_forms_organization_status 
ON forms(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_forms_created_by 
ON forms(created_by);

CREATE INDEX IF NOT EXISTS idx_forms_created_from_pdf 
ON forms(created_from_pdf) 
WHERE created_from_pdf IS NOT NULL;

-- PDF imports table indexes
CREATE INDEX IF NOT EXISTS idx_pdf_imports_user_created 
ON pdf_imports(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pdf_imports_status_created 
ON pdf_imports(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pdf_imports_processing 
ON pdf_imports(upload_status) 
WHERE upload_status IN ('processing', 'pending');

-- Payment history indexes
CREATE INDEX IF NOT EXISTS idx_payment_history_organization 
ON payment_history(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_history_status 
ON payment_history(status);

-- Webhook events indexes
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_id 
ON webhook_events(stripe_event_id);

CREATE INDEX IF NOT EXISTS idx_webhook_events_created 
ON webhook_events(created_at DESC);

-- Form responses indexes (if exists)
CREATE INDEX IF NOT EXISTS idx_form_responses_form_id 
ON form_responses(form_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_form_responses_user 
ON form_responses(user_id) 
WHERE user_id IS NOT NULL;

-- Subscription history indexes
CREATE INDEX IF NOT EXISTS idx_subscription_history_org 
ON subscription_history(organization_id, created_at DESC);

-- Composite indexes for common JOIN queries
CREATE INDEX IF NOT EXISTS idx_forms_org_status_created 
ON forms(organization_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pdf_imports_user_status_created 
ON pdf_imports(user_id, upload_status, created_at DESC);

-- Partial indexes for specific query patterns
CREATE INDEX IF NOT EXISTS idx_organizations_active_subs 
ON organizations(id, pricing_tier) 
WHERE subscription_status = 'active';

CREATE INDEX IF NOT EXISTS idx_forms_active 
ON forms(organization_id, created_at DESC) 
WHERE status = 'active';

-- Function-based indexes for computed values
CREATE INDEX IF NOT EXISTS idx_pdf_imports_large_files 
ON pdf_imports((file_size / 1024 / 1024)) 
WHERE file_size > 5242880; -- Files > 5MB

-- Query performance monitoring
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
  ANALYZE pdf_imports;
  ANALYZE payment_history;
  ANALYZE webhook_events;
  ANALYZE subscription_history;
  
  RAISE NOTICE 'Table statistics updated at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Connection pooling configuration
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET pg_stat_statements.track = 'all';
ALTER SYSTEM SET pg_stat_statements.max = 10000;

-- Performance tuning settings
ALTER SYSTEM SET effective_cache_size = '4GB';
ALTER SYSTEM SET shared_buffers = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '256MB';
ALTER SYSTEM SET work_mem = '16MB';
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;

-- Autovacuum tuning for high-traffic tables
ALTER TABLE organizations SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE forms SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE pdf_imports SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE payment_history SET (autovacuum_vacuum_scale_factor = 0.05);

-- Create extension for query monitoring (if not exists)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View for monitoring index usage
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
  schemaname,
  tablename,
  indexname,
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

-- Function to identify missing indexes
CREATE OR REPLACE FUNCTION suggest_missing_indexes() RETURNS TABLE(
  table_name text,
  column_name text,
  index_type text,
  reason text
) AS $$
BEGIN
  -- Suggest indexes for foreign keys without indexes
  RETURN QUERY
  SELECT 
    tc.table_name::text,
    kcu.column_name::text,
    'btree'::text AS index_type,
    'Foreign key without index'::text AS reason
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
  AND NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = tc.table_name
    AND indexdef LIKE '%' || kcu.column_name || '%'
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_slow_queries() IS 'Logs queries with mean execution time > 100ms';
COMMENT ON FUNCTION update_table_statistics() IS 'Updates table statistics for query planner';
COMMENT ON VIEW index_usage_stats IS 'Monitors index usage to identify unused indexes';
COMMENT ON VIEW table_size_stats IS 'Monitors table and index sizes';
COMMENT ON FUNCTION suggest_missing_indexes() IS 'Suggests missing indexes based on foreign keys';