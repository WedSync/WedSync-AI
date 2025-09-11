-- WS-155: Advanced Messaging Database Features
-- Team E - Round 2
-- Full-text search, analytics warehouse, archival system, and performance optimization

BEGIN;

-- ============================================================================
-- 1. MESSAGE SEARCH ENGINE - Full-text Search Infrastructure
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- For fuzzy text search
CREATE EXTENSION IF NOT EXISTS btree_gin; -- For compound GIN indexes
CREATE EXTENSION IF NOT EXISTS btree_gist; -- For exclusion constraints

-- Create search configuration for messages
CREATE TEXT SEARCH CONFIGURATION IF NOT EXISTS message_search (COPY = english);

-- Add full-text search columns to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS search_vector tsvector,
ADD COLUMN IF NOT EXISTS content_language TEXT DEFAULT 'english',
ADD COLUMN IF NOT EXISTS search_rank FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS message_metadata JSONB DEFAULT '{}';

-- Create trigger to update search vector
CREATE OR REPLACE FUNCTION update_message_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('message_search', COALESCE(NEW.subject, '')), 'A') ||
        setweight(to_tsvector('message_search', COALESCE(NEW.content, '')), 'B') ||
        setweight(to_tsvector('message_search', COALESCE(NEW.metadata->>'tags', '')), 'C') ||
        setweight(to_tsvector('message_search', COALESCE(NEW.recipient_name, '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS messages_search_vector_trigger ON public.messages;
CREATE TRIGGER messages_search_vector_trigger
BEFORE INSERT OR UPDATE OF subject, content, metadata, recipient_name
ON public.messages
FOR EACH ROW
EXECUTE FUNCTION update_message_search_vector();

-- Advanced search indexes
CREATE INDEX IF NOT EXISTS idx_messages_search_vector 
ON public.messages USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS idx_messages_trigram_content 
ON public.messages USING GIN (content gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_messages_trigram_subject 
ON public.messages USING GIN (subject gin_trgm_ops);

-- ============================================================================
-- 2. ANALYTICS DATA WAREHOUSE
-- ============================================================================

-- Message analytics fact table
CREATE TABLE IF NOT EXISTS public.message_analytics_fact (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    sent_date DATE NOT NULL,
    sent_hour INTEGER NOT NULL CHECK (sent_hour >= 0 AND sent_hour <= 23),
    sent_day_of_week INTEGER NOT NULL CHECK (sent_day_of_week >= 0 AND sent_day_of_week <= 6),
    sent_month INTEGER NOT NULL CHECK (sent_month >= 1 AND sent_month <= 12),
    sent_quarter INTEGER NOT NULL CHECK (sent_quarter >= 1 AND sent_quarter <= 4),
    sent_year INTEGER NOT NULL,
    message_type TEXT NOT NULL,
    channel TEXT NOT NULL,
    status TEXT NOT NULL,
    delivery_time_ms INTEGER,
    open_time_ms INTEGER,
    click_count INTEGER DEFAULT 0,
    bounce_count INTEGER DEFAULT 0,
    unsubscribe_count INTEGER DEFAULT 0,
    response_count INTEGER DEFAULT 0,
    sentiment_score FLOAT,
    engagement_score FLOAT,
    word_count INTEGER,
    character_count INTEGER,
    has_attachments BOOLEAN DEFAULT FALSE,
    attachment_count INTEGER DEFAULT 0,
    total_attachment_size_bytes BIGINT DEFAULT 0,
    recipient_count INTEGER DEFAULT 1,
    successful_delivery_count INTEGER DEFAULT 0,
    failed_delivery_count INTEGER DEFAULT 0,
    cost_cents INTEGER DEFAULT 0,
    revenue_impact_cents INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Dimension tables for analytics
CREATE TABLE IF NOT EXISTS public.message_dimensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dimension_type TEXT NOT NULL,
    dimension_key TEXT NOT NULL,
    dimension_value JSONB NOT NULL DEFAULT '{}',
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(dimension_type, dimension_key)
);

-- Aggregated metrics table for fast dashboard queries
CREATE TABLE IF NOT EXISTS public.message_metrics_hourly (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    metric_hour TIMESTAMPTZ NOT NULL,
    message_count INTEGER DEFAULT 0,
    total_recipients INTEGER DEFAULT 0,
    successful_deliveries INTEGER DEFAULT 0,
    failed_deliveries INTEGER DEFAULT 0,
    total_opens INTEGER DEFAULT 0,
    unique_opens INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    unique_clicks INTEGER DEFAULT 0,
    avg_delivery_time_ms FLOAT,
    avg_engagement_score FLOAT,
    total_cost_cents INTEGER DEFAULT 0,
    metrics JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, metric_hour)
);

-- Create partitioning for analytics fact table by month
CREATE TABLE IF NOT EXISTS public.message_analytics_fact_y2025m01 
PARTITION OF public.message_analytics_fact
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- ============================================================================
-- 3. MESSAGE ARCHIVAL SYSTEM
-- ============================================================================

-- Archive table for old messages
CREATE TABLE IF NOT EXISTS public.messages_archive (
    LIKE public.messages INCLUDING ALL,
    archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    archived_by UUID,
    archive_reason TEXT,
    retention_until TIMESTAMPTZ,
    is_compressed BOOLEAN DEFAULT FALSE,
    compressed_size_bytes BIGINT,
    original_size_bytes BIGINT,
    checksum TEXT
) PARTITION BY RANGE (created_at);

-- Create partitions for archive (by year)
CREATE TABLE IF NOT EXISTS public.messages_archive_y2024
PARTITION OF public.messages_archive
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE IF NOT EXISTS public.messages_archive_y2025
PARTITION OF public.messages_archive
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- Archive policy configuration
CREATE TABLE IF NOT EXISTS public.archive_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    policy_name TEXT NOT NULL,
    policy_type TEXT NOT NULL, -- 'age_based', 'size_based', 'activity_based'
    retention_days INTEGER NOT NULL DEFAULT 365,
    compress_after_days INTEGER DEFAULT 90,
    delete_after_days INTEGER, -- NULL means never delete
    conditions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Archive jobs tracking
CREATE TABLE IF NOT EXISTS public.archive_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    messages_processed INTEGER DEFAULT 0,
    messages_archived INTEGER DEFAULT 0,
    messages_deleted INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    job_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 4. ADVANCED INDEXING STRATEGIES
-- ============================================================================

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_messages_org_status_created 
ON public.messages(organization_id, status, created_at DESC)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_client_type_created 
ON public.messages(client_id, message_type, created_at DESC)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_recipient_status 
ON public.messages(recipient_email, status, created_at DESC)
WHERE deleted_at IS NULL;

-- Partial indexes for specific message types
CREATE INDEX IF NOT EXISTS idx_messages_pending_emails 
ON public.messages(organization_id, scheduled_at)
WHERE status = 'pending' AND message_type = 'email' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_failed_retry 
ON public.messages(organization_id, retry_count, next_retry_at)
WHERE status = 'failed' AND retry_count < 3 AND deleted_at IS NULL;

-- BRIN indexes for time-series data
CREATE INDEX IF NOT EXISTS idx_messages_created_brin 
ON public.messages USING BRIN (created_at);

CREATE INDEX IF NOT EXISTS idx_analytics_fact_sent_date_brin 
ON public.message_analytics_fact USING BRIN (sent_date);

-- Covering indexes for read-heavy queries
CREATE INDEX IF NOT EXISTS idx_messages_covering_dashboard 
ON public.messages(organization_id, created_at DESC)
INCLUDE (id, subject, recipient_email, status, message_type);

-- ============================================================================
-- 5. DATA EXPORT SYSTEMS (GDPR Compliant)
-- ============================================================================

-- Export requests table
CREATE TABLE IF NOT EXISTS public.data_export_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES public.user_profiles(id),
    export_type TEXT NOT NULL, -- 'gdpr', 'backup', 'analytics', 'compliance'
    export_format TEXT NOT NULL DEFAULT 'json', -- 'json', 'csv', 'sql'
    export_scope JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending',
    file_url TEXT,
    file_size_bytes BIGINT,
    expires_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Data retention and deletion tracking
CREATE TABLE IF NOT EXISTS public.data_retention_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL, -- 'anonymized', 'deleted', 'archived'
    reason TEXT NOT NULL,
    performed_by UUID REFERENCES public.user_profiles(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 6. PERFORMANCE OPTIMIZATION FUNCTIONS
-- ============================================================================

-- Function for fast message search
CREATE OR REPLACE FUNCTION search_messages(
    p_organization_id UUID,
    p_query TEXT,
    p_filters JSONB DEFAULT '{}',
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    message_id UUID,
    subject TEXT,
    content TEXT,
    sender TEXT,
    recipient TEXT,
    sent_at TIMESTAMPTZ,
    status TEXT,
    relevance_score FLOAT,
    highlights JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH search_results AS (
        SELECT 
            m.id,
            m.subject,
            m.content,
            m.sender_name,
            m.recipient_name,
            m.created_at,
            m.status,
            ts_rank(m.search_vector, plainto_tsquery('message_search', p_query)) AS rank,
            ts_headline('message_search', m.content, plainto_tsquery('message_search', p_query),
                'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20') AS content_highlight,
            ts_headline('message_search', m.subject, plainto_tsquery('message_search', p_query),
                'StartSel=<mark>, StopSel=</mark>') AS subject_highlight
        FROM public.messages m
        WHERE m.organization_id = p_organization_id
            AND m.deleted_at IS NULL
            AND m.search_vector @@ plainto_tsquery('message_search', p_query)
            AND (
                p_filters->>'status' IS NULL 
                OR m.status = p_filters->>'status'
            )
            AND (
                p_filters->>'message_type' IS NULL 
                OR m.message_type = p_filters->>'message_type'
            )
            AND (
                p_filters->>'date_from' IS NULL 
                OR m.created_at >= (p_filters->>'date_from')::TIMESTAMPTZ
            )
            AND (
                p_filters->>'date_to' IS NULL 
                OR m.created_at <= (p_filters->>'date_to')::TIMESTAMPTZ
            )
    )
    SELECT 
        id AS message_id,
        subject,
        content,
        sender_name AS sender,
        recipient_name AS recipient,
        created_at AS sent_at,
        status,
        rank AS relevance_score,
        jsonb_build_object(
            'subject', subject_highlight,
            'content', content_highlight
        ) AS highlights
    FROM search_results
    ORDER BY rank DESC, created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. REAL-TIME ANALYTICS MATERIALIZED VIEWS
-- ============================================================================

-- Real-time message statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_message_stats_realtime AS
SELECT 
    organization_id,
    DATE_TRUNC('hour', created_at) AS hour,
    COUNT(*) AS message_count,
    COUNT(DISTINCT recipient_email) AS unique_recipients,
    COUNT(CASE WHEN status = 'sent' THEN 1 END) AS sent_count,
    COUNT(CASE WHEN status = 'delivered' THEN 1 END) AS delivered_count,
    COUNT(CASE WHEN status = 'opened' THEN 1 END) AS opened_count,
    COUNT(CASE WHEN status = 'clicked' THEN 1 END) AS clicked_count,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) AS failed_count,
    AVG(CASE WHEN delivery_time_ms IS NOT NULL THEN delivery_time_ms END) AS avg_delivery_time,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY delivery_time_ms) AS median_delivery_time,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY delivery_time_ms) AS p95_delivery_time
FROM public.messages
WHERE created_at >= NOW() - INTERVAL '7 days'
    AND deleted_at IS NULL
GROUP BY organization_id, DATE_TRUNC('hour', created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_message_stats_org_hour 
ON public.mv_message_stats_realtime(organization_id, hour);

-- ============================================================================
-- 8. MESSAGE PATTERN ANALYSIS
-- ============================================================================

-- Communication patterns table
CREATE TABLE IF NOT EXISTS public.message_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    pattern_name TEXT NOT NULL,
    pattern_type TEXT NOT NULL, -- 'frequency', 'content', 'response', 'engagement'
    pattern_data JSONB NOT NULL DEFAULT '{}',
    confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
    sample_size INTEGER,
    detected_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Pattern detection function
CREATE OR REPLACE FUNCTION analyze_message_patterns(
    p_organization_id UUID,
    p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    pattern_type TEXT,
    pattern_description TEXT,
    confidence FLOAT,
    insights JSONB
) AS $$
DECLARE
    v_start_date TIMESTAMPTZ;
BEGIN
    v_start_date := NOW() - (p_days_back || ' days')::INTERVAL;
    
    -- Analyze sending patterns
    RETURN QUERY
    WITH hourly_patterns AS (
        SELECT 
            EXTRACT(HOUR FROM created_at) AS hour,
            COUNT(*) AS message_count,
            AVG(CASE WHEN status IN ('opened', 'clicked') THEN 1 ELSE 0 END) AS engagement_rate
        FROM public.messages
        WHERE organization_id = p_organization_id
            AND created_at >= v_start_date
            AND deleted_at IS NULL
        GROUP BY EXTRACT(HOUR FROM created_at)
    ),
    peak_hours AS (
        SELECT 
            hour,
            message_count,
            engagement_rate,
            ROW_NUMBER() OVER (ORDER BY engagement_rate DESC) AS engagement_rank
        FROM hourly_patterns
        WHERE message_count >= 10 -- Minimum sample size
    )
    SELECT 
        'optimal_send_time'::TEXT AS pattern_type,
        'Best time to send messages for engagement'::TEXT AS pattern_description,
        0.85::FLOAT AS confidence,
        jsonb_build_object(
            'best_hours', (
                SELECT jsonb_agg(jsonb_build_object(
                    'hour', hour,
                    'engagement_rate', ROUND(engagement_rate::NUMERIC, 3),
                    'message_count', message_count
                ))
                FROM peak_hours
                WHERE engagement_rank <= 3
            ),
            'analysis_period_days', p_days_back,
            'total_messages_analyzed', (
                SELECT COUNT(*) 
                FROM public.messages 
                WHERE organization_id = p_organization_id 
                    AND created_at >= v_start_date
            )
        ) AS insights;
    
    -- Add more pattern analysis as needed
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. AUTOMATED DATA MAINTENANCE
-- ============================================================================

-- Maintenance configuration table
CREATE TABLE IF NOT EXISTS public.maintenance_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    maintenance_type TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    schedule_cron TEXT NOT NULL,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-vacuum and analyze function
CREATE OR REPLACE FUNCTION perform_message_maintenance()
RETURNS void AS $$
DECLARE
    v_table_name TEXT;
    v_dead_tuples BIGINT;
    v_live_tuples BIGINT;
    v_last_vacuum TIMESTAMPTZ;
BEGIN
    -- Check message table statistics
    SELECT 
        n_dead_tup,
        n_live_tup,
        last_vacuum
    INTO v_dead_tuples, v_live_tuples, v_last_vacuum
    FROM pg_stat_user_tables
    WHERE schemaname = 'public' AND tablename = 'messages';
    
    -- Vacuum if needed (more than 20% dead tuples or not vacuumed in 24 hours)
    IF v_dead_tuples > v_live_tuples * 0.2 OR v_last_vacuum < NOW() - INTERVAL '24 hours' THEN
        EXECUTE 'VACUUM ANALYZE public.messages';
    END IF;
    
    -- Update materialized views
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_message_stats_realtime;
    
    -- Archive old messages based on policies
    INSERT INTO public.messages_archive
    SELECT m.*, NOW(), NULL, 'age_based', NOW() + INTERVAL '5 years', FALSE, NULL, NULL, NULL
    FROM public.messages m
    INNER JOIN public.archive_policies ap ON ap.organization_id = m.organization_id
    WHERE m.created_at < NOW() - (ap.retention_days || ' days')::INTERVAL
        AND ap.is_active = TRUE
        AND ap.policy_type = 'age_based'
        AND m.id NOT IN (SELECT message_id FROM public.messages_archive WHERE message_id IS NOT NULL);
    
    -- Clean up old analytics data
    DELETE FROM public.message_analytics_fact
    WHERE sent_date < NOW() - INTERVAL '2 years';
    
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. PERFORMANCE MONITORING
-- ============================================================================

-- Query performance tracking
CREATE TABLE IF NOT EXISTS public.query_performance_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_hash TEXT NOT NULL,
    query_text TEXT,
    execution_time_ms FLOAT NOT NULL,
    rows_returned INTEGER,
    organization_id UUID,
    user_id UUID,
    endpoint TEXT,
    is_slow_query BOOLEAN DEFAULT FALSE,
    query_plan JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index on slow queries
CREATE INDEX IF NOT EXISTS idx_query_performance_slow 
ON public.query_performance_log(created_at DESC)
WHERE is_slow_query = TRUE;

-- Function to log slow queries
CREATE OR REPLACE FUNCTION log_slow_query(
    p_query_text TEXT,
    p_execution_time_ms FLOAT,
    p_rows_returned INTEGER DEFAULT NULL,
    p_organization_id UUID DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    IF p_execution_time_ms > 50 THEN -- Log queries slower than 50ms
        INSERT INTO public.query_performance_log (
            query_hash,
            query_text,
            execution_time_ms,
            rows_returned,
            organization_id,
            user_id,
            is_slow_query
        ) VALUES (
            MD5(p_query_text),
            p_query_text,
            p_execution_time_ms,
            p_rows_returned,
            p_organization_id,
            p_user_id,
            TRUE
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 11. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE public.message_analytics_fact ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_metrics_hourly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archive_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archive_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_patterns ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their organization's analytics"
ON public.message_analytics_fact
FOR SELECT
USING (organization_id IN (
    SELECT organization_id FROM public.user_profiles 
    WHERE id = auth.uid()
));

CREATE POLICY "Users can view their organization's archives"
ON public.messages_archive
FOR SELECT
USING (organization_id IN (
    SELECT organization_id FROM public.user_profiles 
    WHERE id = auth.uid()
));

CREATE POLICY "Users can manage their organization's archive policies"
ON public.archive_policies
FOR ALL
USING (organization_id IN (
    SELECT organization_id FROM public.user_profiles 
    WHERE id = auth.uid()
));

CREATE POLICY "Users can request data exports for their organization"
ON public.data_export_requests
FOR ALL
USING (organization_id IN (
    SELECT organization_id FROM public.user_profiles 
    WHERE id = auth.uid()
));

-- ============================================================================
-- 12. GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated users
GRANT SELECT ON public.message_analytics_fact TO authenticated;
GRANT SELECT ON public.message_metrics_hourly TO authenticated;
GRANT SELECT ON public.messages_archive TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.archive_policies TO authenticated;
GRANT SELECT, INSERT ON public.data_export_requests TO authenticated;
GRANT SELECT ON public.message_patterns TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION search_messages TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_message_patterns TO authenticated;

COMMIT;

-- ============================================================================
-- POST-DEPLOYMENT NOTES:
-- 1. Schedule maintenance jobs via pg_cron or external scheduler
-- 2. Configure backup policies for archive tables
-- 3. Set up monitoring alerts for slow queries
-- 4. Initialize first materialized view refresh
-- 5. Configure data export storage (S3/Cloud Storage)
-- ============================================================================