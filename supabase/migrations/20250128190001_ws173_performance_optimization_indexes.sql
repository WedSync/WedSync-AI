-- WS-173 Performance Optimization Indexes Migration
-- Team B - Round 1 Implementation
-- Critical indexes for wedding management performance optimization

-- ============================================================================
-- PHASE 1: Critical Performance Indexes (Immediate Impact)
-- ============================================================================

-- Email-based client lookups (very common in wedding planning)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_email ON clients(email);

-- Wedding date queries for timeline planning
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_wedding_date ON clients(wedding_date) WHERE wedding_date IS NOT NULL;

-- Client status filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_status ON clients(status);

-- Budget items by client (critical for budget dashboard)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_budget_items_client_id ON budget_items(client_id);

-- Budget status filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_budget_items_status ON budget_items(status);

-- Task status and priority filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_priority ON tasks(priority);

-- Due date ordering for task management
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;

-- Task category filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_category ON tasks(category) WHERE category IS NOT NULL;

-- ============================================================================
-- PHASE 2: Composite Indexes for Complex Queries
-- ============================================================================

-- Client management dashboard (organization + status + wedding date)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_org_status_wedding_date 
ON clients(organization_id, status, wedding_date);

-- Task management views (organization + status + due date)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_org_status_due_date 
ON tasks(organization_id, status, due_date);

-- Budget tracking queries (client + status)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_budget_items_client_status 
ON budget_items(client_id, status);

-- Task assignments by user and status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_assignments_user_status 
ON task_assignments(user_id, status) WHERE status IS NOT NULL;

-- ============================================================================
-- PHASE 3: Analytics and Reporting Indexes
-- ============================================================================

-- Analytics events time-series queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_created_at 
ON analytics_events(created_at);

-- Analytics events by type and time
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_type_time 
ON analytics_events(event_type, created_at);

-- Analytics reporting by organization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_org_type_time 
ON analytics_events(organization_id, event_type, created_at);

-- Notifications by read status and timestamp
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_unread 
ON notifications(user_id, created_at) WHERE read_at IS NULL;

-- ============================================================================
-- PHASE 4: JSONB and Full-Text Search Indexes
-- ============================================================================

-- Enable pg_trgm extension for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Common metadata queries (GIN indexes for JSONB)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_metadata_gin 
ON clients USING GIN(metadata);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_metadata_gin 
ON tasks USING GIN(metadata);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_budget_items_metadata_gin 
ON budget_items USING GIN(metadata);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_properties_gin 
ON analytics_events USING GIN(properties);

-- Full-text search on client names and venues
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_fulltext 
ON clients USING GIN((first_name || ' ' || last_name || ' ' || COALESCE(venue, '')) gin_trgm_ops);

-- Task title and description search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_fulltext 
ON tasks USING GIN((title || ' ' || COALESCE(description, '')) gin_trgm_ops);

-- ============================================================================
-- PHASE 5: Performance Metrics Tables and Indexes
-- ============================================================================

-- Performance metrics table for tracking API and database performance
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metric type and source
    metric_type TEXT NOT NULL CHECK (metric_type IN ('api', 'database', 'system', 'cache')),
    
    -- API metrics
    endpoint TEXT,
    method TEXT,
    response_time INTEGER, -- milliseconds
    status_code INTEGER,
    cache_hit BOOLEAN DEFAULT FALSE,
    db_queries INTEGER DEFAULT 0,
    db_query_time INTEGER DEFAULT 0, -- milliseconds
    memory_usage BIGINT,
    
    -- Database metrics
    query_text TEXT,
    execution_time INTEGER, -- milliseconds
    rows_affected INTEGER DEFAULT 0,
    table_name TEXT,
    operation TEXT CHECK (operation IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')),
    is_slow BOOLEAN DEFAULT FALSE,
    
    -- System metrics
    cpu_usage DECIMAL(5,2),
    memory_percent DECIMAL(5,2),
    disk_usage DECIMAL(5,2),
    active_connections INTEGER,
    cache_hit_ratio DECIMAL(5,4),
    
    -- Context
    user_id UUID,
    organization_id UUID,
    error_message TEXT,
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance metrics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_metrics_created_at 
ON performance_metrics(created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_metrics_type_time 
ON performance_metrics(metric_type, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_metrics_endpoint 
ON performance_metrics(endpoint, created_at) WHERE endpoint IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_metrics_slow_queries 
ON performance_metrics(table_name, execution_time) WHERE metric_type = 'database' AND is_slow = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_metrics_org 
ON performance_metrics(organization_id, created_at) WHERE organization_id IS NOT NULL;

-- ============================================================================
-- PHASE 6: Partial Indexes for Common Queries
-- ============================================================================

-- Active weddings only (most common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_clients 
ON clients(organization_id, wedding_date) WHERE status = 'active';

-- Overdue tasks only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_overdue_tasks 
ON tasks(organization_id, due_date) WHERE due_date < NOW() AND status != 'completed';

-- Pending budget items
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pending_budget_items 
ON budget_items(client_id, planned_amount) WHERE status = 'planned';

-- Active vendors only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_vendors 
ON vendors(organization_id, status) WHERE status = 'active';

-- ============================================================================
-- PHASE 7: Missing Foreign Key Indexes
-- ============================================================================

-- Budget items category relationship
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_budget_items_category_id 
ON budget_items(category_id) WHERE category_id IS NOT NULL;

-- Budget items vendor relationship
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_budget_items_vendor_id 
ON budget_items(vendor_id) WHERE vendor_id IS NOT NULL;

-- Referrals referred user relationship
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_referrals_referred_user_id 
ON referrals(referred_user_id) WHERE referred_user_id IS NOT NULL;

-- ============================================================================
-- PHASE 8: Dashboard Materialized Views (Optional for Heavy Analytics)
-- ============================================================================

-- Dashboard metrics materialized view for fast dashboard loading
CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_metrics_mv AS
SELECT 
    c.organization_id,
    COUNT(*) as total_weddings,
    COUNT(*) FILTER (WHERE c.status = 'active') as active_weddings,
    COUNT(*) FILTER (WHERE c.status = 'completed') as completed_weddings,
    AVG(c.budget) FILTER (WHERE c.budget > 0) as avg_budget,
    SUM(c.budget) FILTER (WHERE c.status = 'completed') as completed_revenue,
    COUNT(*) FILTER (WHERE c.created_at > NOW() - INTERVAL '30 days') as new_weddings_30d,
    NOW() as last_updated
FROM clients c 
WHERE c.organization_id IS NOT NULL
GROUP BY c.organization_id;

-- Index on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_metrics_mv_org 
ON dashboard_metrics_mv(organization_id);

-- ============================================================================
-- PHASE 9: Query Optimization Functions
-- ============================================================================

-- Function to explain query performance
CREATE OR REPLACE FUNCTION explain_query(query_text TEXT, query_params TEXT[] DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    -- This would require elevated permissions in production
    -- For now, return a placeholder
    RETURN '{"note": "Query explanation would be implemented with appropriate permissions"}'::JSON;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('error', SQLERRM);
END;
$$;

-- Function to get table statistics
CREATE OR REPLACE FUNCTION get_table_stats()
RETURNS TABLE(
    table_name TEXT,
    row_count BIGINT,
    table_size TEXT,
    index_size TEXT,
    total_size TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.table_name::TEXT,
        COALESCE(s.n_live_tup, 0) as row_count,
        pg_size_pretty(pg_total_relation_size(c.oid)) as table_size,
        pg_size_pretty(pg_indexes_size(c.oid)) as index_size,
        pg_size_pretty(pg_total_relation_size(c.oid) + pg_indexes_size(c.oid)) as total_size
    FROM information_schema.tables t
    LEFT JOIN pg_class c ON c.relname = t.table_name
    LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name
    WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND t.table_name NOT LIKE '%_old'
        AND t.table_name NOT LIKE 'temp_%'
    ORDER BY pg_total_relation_size(c.oid) DESC NULLS LAST;
END;
$$;

-- Function to refresh dashboard metrics
CREATE OR REPLACE FUNCTION refresh_dashboard_metrics()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_metrics_mv;
END;
$$;

-- ============================================================================
-- PHASE 10: Index Usage Monitoring
-- ============================================================================

-- Function to monitor index usage (for maintenance)
CREATE OR REPLACE FUNCTION get_index_usage_stats()
RETURNS TABLE(
    schemaname NAME,
    tablename NAME,
    indexname NAME,
    idx_scan BIGINT,
    idx_tup_read BIGINT,
    idx_tup_fetch BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.schemaname,
        s.tablename,
        s.indexname,
        s.idx_scan,
        s.idx_tup_read,
        s.idx_tup_fetch
    FROM pg_stat_user_indexes s
    WHERE s.schemaname = 'public'
    ORDER BY s.idx_scan DESC, s.idx_tup_read DESC;
END;
$$;

-- ============================================================================
-- MIGRATION VALIDATION
-- ============================================================================

-- Validate that critical indexes were created
DO $$
DECLARE
    missing_indexes TEXT[] := '{}';
    idx_name TEXT;
BEGIN
    -- Check for critical indexes
    FOR idx_name IN 
        SELECT unnest(ARRAY[
            'idx_clients_email',
            'idx_budget_items_client_id', 
            'idx_tasks_status',
            'idx_analytics_events_created_at'
        ])
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE schemaname = 'public' AND indexname = idx_name
        ) THEN
            missing_indexes := array_append(missing_indexes, idx_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_indexes, 1) > 0 THEN
        RAISE WARNING 'Missing critical indexes: %', array_to_string(missing_indexes, ', ');
    ELSE
        RAISE NOTICE 'All critical performance indexes created successfully';
    END IF;
END;
$$;

-- ============================================================================
-- PERFORMANCE ANALYSIS QUERIES (For monitoring)
-- ============================================================================

-- Query to find missing indexes (run periodically)
/*
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE schemaname = 'public' 
    AND tablename IN ('clients', 'tasks', 'budget_items', 'analytics_events')
    AND n_distinct > 100  -- High cardinality columns that might need indexes
ORDER BY abs(correlation) DESC;
*/

-- Query to monitor slow queries (run periodically if pg_stat_statements enabled)
/*
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements 
WHERE mean_time > 1000  -- Queries taking more than 1 second on average
ORDER BY mean_time DESC 
LIMIT 10;
*/

-- ============================================================================
-- COMMIT AND FINAL NOTES
-- ============================================================================

-- Analyze tables to update statistics after index creation
ANALYZE clients;
ANALYZE tasks;
ANALYZE budget_items;
ANALYZE analytics_events;
ANALYZE notifications;
ANALYZE vendors;

-- Final success message
SELECT 'WS-173 Performance Optimization Migration Completed Successfully' as status;