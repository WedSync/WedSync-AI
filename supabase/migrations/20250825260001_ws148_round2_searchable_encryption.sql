-- WS-148 Round 2: Advanced Searchable Encryption System
-- Team D - Batch 12 - Performance Optimization & Middleware Integration
-- SECURITY LEVEL: P0 - CRITICAL

-- Add searchable encryption support to existing encrypted_fields table
ALTER TABLE encryption.encrypted_fields 
ADD COLUMN IF NOT EXISTS searchable_hash TEXT,
ADD COLUMN IF NOT EXISTS searchable_ngrams TEXT[],
ADD COLUMN IF NOT EXISTS searchable_phonetics TEXT[],
ADD COLUMN IF NOT EXISTS search_type TEXT DEFAULT 'none' 
    CHECK (search_type IN ('none', 'exact', 'partial', 'fuzzy'));

-- Indexes for searchable encryption performance
CREATE INDEX IF NOT EXISTS idx_encrypted_fields_searchable_hash 
    ON encryption.encrypted_fields USING BTREE (searchable_hash);
    
CREATE INDEX IF NOT EXISTS idx_encrypted_fields_searchable_ngrams 
    ON encryption.encrypted_fields USING GIN (searchable_ngrams);
    
CREATE INDEX IF NOT EXISTS idx_encrypted_fields_searchable_phonetics 
    ON encryption.encrypted_fields USING GIN (searchable_phonetics);

-- Performance monitoring for encryption operations (Round 2 requirements)
CREATE TABLE IF NOT EXISTS encryption.performance_metrics_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_type TEXT NOT NULL,
    user_id UUID REFERENCES user_profiles(id),
    field_count INTEGER,
    processing_time_ms INTEGER,
    success_rate DECIMAL(5,4),
    memory_usage_mb INTEGER,
    cpu_usage_percent DECIMAL(5,2),
    error_details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Batch operation tracking for bulk operations
CREATE TABLE IF NOT EXISTS encryption.batch_operations (
    batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id),
    operation_type TEXT NOT NULL,
    total_items INTEGER,
    completed_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    status TEXT DEFAULT 'processing' 
        CHECK (status IN ('processing', 'completed', 'failed', 'cancelled')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_summary JSONB
);

-- Cache performance tracking for mobile optimization
CREATE TABLE IF NOT EXISTS encryption.cache_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id),
    cache_key TEXT NOT NULL,
    hit BOOLEAN NOT NULL,
    response_time_ms INTEGER,
    cache_size_kb INTEGER,
    ttl_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mobile progressive decryption priorities
CREATE TABLE IF NOT EXISTS encryption.field_priority_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    field_name TEXT NOT NULL,
    priority INTEGER NOT NULL CHECK (priority > 0),
    device_type TEXT DEFAULT 'all' 
        CHECK (device_type IN ('mobile', 'desktop', 'tablet', 'all')),
    user_id UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(table_name, field_name, device_type, user_id)
);

-- WS-148 Performance requirement validation table
CREATE TABLE IF NOT EXISTS encryption.performance_benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_name TEXT NOT NULL,
    target_time_ms INTEGER NOT NULL,
    actual_time_ms INTEGER,
    passed BOOLEAN,
    test_data JSONB,
    tested_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert performance benchmarks from WS-148 requirements
INSERT INTO encryption.performance_benchmarks (test_name, target_time_ms, test_data) VALUES
('bulk_photo_encryption_500_items', 30000, '{"items": 500, "type": "photo_metadata"}'),
('dashboard_50_clients_load', 2000, '{"clients": 50, "encrypted_fields": "all"}'),
('mobile_progressive_high_priority', 3000, '{"priority": "high", "connection": "3g"}'),
('search_response_time', 1000, '{"search_type": "exact", "results_limit": 50}'),
('cache_hit_rate_target', 80, '{"measurement": "percentage", "min_requests": 100}');

-- Enhanced performance metrics view for monitoring
CREATE OR REPLACE VIEW encryption.performance_dashboard AS
SELECT 
    pm.operation_type,
    COUNT(*) as total_operations,
    AVG(pm.processing_time_ms) as avg_time_ms,
    MAX(pm.processing_time_ms) as max_time_ms,
    MIN(pm.processing_time_ms) as min_time_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY pm.processing_time_ms) as p95_time_ms,
    AVG(pm.success_rate) as avg_success_rate,
    AVG(pm.memory_usage_mb) as avg_memory_mb,
    AVG(pm.cpu_usage_percent) as avg_cpu_percent,
    DATE_TRUNC('hour', pm.created_at) as hour_bucket
FROM encryption.performance_metrics_v2 pm
WHERE pm.created_at > NOW() - INTERVAL '24 hours'
GROUP BY pm.operation_type, DATE_TRUNC('hour', pm.created_at)
ORDER BY hour_bucket DESC;

-- Cache performance view for mobile optimization tracking
CREATE OR REPLACE VIEW encryption.cache_performance_dashboard AS
SELECT 
    cm.user_id,
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE cm.hit = true) as cache_hits,
    COUNT(*) FILTER (WHERE cm.hit = false) as cache_misses,
    ROUND((COUNT(*) FILTER (WHERE cm.hit = true)::decimal / COUNT(*)) * 100, 2) as hit_rate_percent,
    AVG(cm.response_time_ms) as avg_response_time_ms,
    AVG(cm.cache_size_kb) as avg_cache_size_kb,
    DATE_TRUNC('hour', cm.created_at) as hour_bucket
FROM encryption.cache_metrics cm
WHERE cm.created_at > NOW() - INTERVAL '24 hours'
GROUP BY cm.user_id, DATE_TRUNC('hour', cm.created_at)
ORDER BY hour_bucket DESC;

-- Batch operations monitoring view
CREATE OR REPLACE VIEW encryption.batch_operations_dashboard AS
SELECT 
    bo.operation_type,
    COUNT(*) as total_batches,
    AVG(bo.total_items) as avg_items_per_batch,
    AVG((bo.completed_items::decimal / NULLIF(bo.total_items, 0)) * 100) as avg_completion_rate,
    AVG(EXTRACT(EPOCH FROM (bo.completed_at - bo.started_at)) * 1000) as avg_processing_time_ms,
    COUNT(*) FILTER (WHERE bo.status = 'completed') as successful_batches,
    COUNT(*) FILTER (WHERE bo.status = 'failed') as failed_batches,
    DATE_TRUNC('day', bo.started_at) as day_bucket
FROM encryption.batch_operations bo
WHERE bo.started_at > NOW() - INTERVAL '7 days'
GROUP BY bo.operation_type, DATE_TRUNC('day', bo.started_at)
ORDER BY day_bucket DESC;

-- Function to search encrypted fields using searchable hashes
CREATE OR REPLACE FUNCTION encryption.search_encrypted_field(
    search_query TEXT,
    search_type TEXT DEFAULT 'exact',
    table_name TEXT DEFAULT NULL,
    limit_results INTEGER DEFAULT 50
)
RETURNS TABLE (
    record_id UUID,
    table_name TEXT,
    column_name TEXT,
    relevance_score DECIMAL
) AS $$
BEGIN
    CASE search_type
        WHEN 'exact' THEN
            RETURN QUERY
            SELECT 
                ef.record_id,
                ef.table_name,
                ef.column_name,
                1.0::DECIMAL as relevance_score
            FROM encryption.encrypted_fields ef
            WHERE ef.searchable_hash = encode(digest(search_query, 'sha256'), 'hex')
                AND (table_name IS NULL OR ef.table_name = search_encrypted_field.table_name)
                AND ef.search_type = 'exact'
            LIMIT limit_results;
            
        WHEN 'partial' THEN
            RETURN QUERY
            SELECT 
                ef.record_id,
                ef.table_name,
                ef.column_name,
                (array_length(
                    ARRAY(
                        SELECT unnest(ef.searchable_ngrams)
                        INTERSECT
                        SELECT unnest(string_to_array(
                            encode(digest(regexp_split_to_array(lower(search_query), '\s+')::text, 'sha256'), 'hex'),
                            ','
                        ))
                    ), 1
                )::decimal / GREATEST(array_length(ef.searchable_ngrams, 1), 1)) as relevance_score
            FROM encryption.encrypted_fields ef
            WHERE ef.searchable_ngrams && string_to_array(
                encode(digest(regexp_split_to_array(lower(search_query), '\s+')::text, 'sha256'), 'hex'),
                ','
            )
                AND (table_name IS NULL OR ef.table_name = search_encrypted_field.table_name)
                AND ef.search_type = 'partial'
            ORDER BY relevance_score DESC
            LIMIT limit_results;
            
        WHEN 'fuzzy' THEN
            RETURN QUERY
            SELECT 
                ef.record_id,
                ef.table_name,
                ef.column_name,
                0.8::DECIMAL as relevance_score -- Phonetic matches get high relevance
            FROM encryption.encrypted_fields ef
            WHERE ef.searchable_phonetics && ARRAY[
                encode(digest(soundex(search_query), 'sha256'), 'hex'),
                encode(digest(metaphone(search_query, 4), 'sha256'), 'hex')
            ]
                AND (table_name IS NULL OR ef.table_name = search_encrypted_field.table_name)
                AND ef.search_type = 'fuzzy'
            LIMIT limit_results;
            
        ELSE
            RAISE EXCEPTION 'Invalid search_type. Use: exact, partial, or fuzzy';
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate WS-148 performance benchmarks
CREATE OR REPLACE FUNCTION encryption.validate_performance_benchmarks()
RETURNS JSON AS $$
DECLARE
    bulk_encryption_result BOOLEAN;
    dashboard_load_result BOOLEAN;
    mobile_progressive_result BOOLEAN;
    search_response_result BOOLEAN;
    cache_hit_result BOOLEAN;
    overall_result JSON;
BEGIN
    -- Check bulk encryption performance (500 items < 30 seconds)
    SELECT COALESCE(
        (SELECT AVG(processing_time_ms) < 30000 
         FROM encryption.performance_metrics_v2 
         WHERE operation_type = 'bulk_encryption' 
           AND field_count >= 500
           AND created_at > NOW() - INTERVAL '1 day'),
        false
    ) INTO bulk_encryption_result;
    
    -- Check dashboard load performance (50 clients < 2 seconds)
    SELECT COALESCE(
        (SELECT AVG(processing_time_ms) < 2000
         FROM encryption.performance_metrics_v2 
         WHERE operation_type = 'dashboard_decrypt' 
           AND field_count >= 50
           AND created_at > NOW() - INTERVAL '1 day'),
        false
    ) INTO dashboard_load_result;
    
    -- Check mobile progressive decryption (high priority < 3 seconds)
    SELECT COALESCE(
        (SELECT AVG(processing_time_ms) < 3000
         FROM encryption.performance_metrics_v2 
         WHERE operation_type = 'progressive_decrypt_high_priority'
           AND created_at > NOW() - INTERVAL '1 day'),
        false
    ) INTO mobile_progressive_result;
    
    -- Check search response time (< 1 second)
    SELECT COALESCE(
        (SELECT AVG(processing_time_ms) < 1000
         FROM encryption.performance_metrics_v2 
         WHERE operation_type LIKE '%search%'
           AND created_at > NOW() - INTERVAL '1 day'),
        false
    ) INTO search_response_result;
    
    -- Check cache hit rate (> 80%)
    SELECT COALESCE(
        (SELECT (COUNT(*) FILTER (WHERE hit = true)::decimal / COUNT(*)) > 0.80
         FROM encryption.cache_metrics 
         WHERE created_at > NOW() - INTERVAL '1 day'
           AND user_id IS NOT NULL),
        false
    ) INTO cache_hit_result;
    
    -- Build comprehensive result
    SELECT json_build_object(
        'timestamp', NOW(),
        'overall_passed', (
            bulk_encryption_result AND 
            dashboard_load_result AND 
            mobile_progressive_result AND 
            search_response_result AND 
            cache_hit_result
        ),
        'benchmarks', json_build_object(
            'bulk_encryption_500_items', json_build_object(
                'target_ms', 30000,
                'passed', bulk_encryption_result,
                'description', 'Bulk photo encryption performance'
            ),
            'dashboard_50_clients', json_build_object(
                'target_ms', 2000,
                'passed', dashboard_load_result,
                'description', 'Dashboard loading with encrypted data'
            ),
            'mobile_progressive_decryption', json_build_object(
                'target_ms', 3000,
                'passed', mobile_progressive_result,
                'description', 'Mobile high-priority field decryption'
            ),
            'search_response_time', json_build_object(
                'target_ms', 1000,
                'passed', search_response_result,
                'description', 'Searchable encryption query response'
            ),
            'cache_hit_rate', json_build_object(
                'target_percent', 80,
                'passed', cache_hit_result,
                'description', 'Encryption cache efficiency'
            )
        )
    ) INTO overall_result;
    
    -- Insert benchmark test results
    INSERT INTO encryption.performance_benchmarks (test_name, target_time_ms, actual_time_ms, passed, test_data)
    VALUES 
        ('ws148_validation_bulk_encryption', 30000, 
         COALESCE((SELECT AVG(processing_time_ms) FROM encryption.performance_metrics_v2 
                   WHERE operation_type = 'bulk_encryption' AND field_count >= 500), 0),
         bulk_encryption_result, '{"validation_run": true}'),
        ('ws148_validation_dashboard_load', 2000,
         COALESCE((SELECT AVG(processing_time_ms) FROM encryption.performance_metrics_v2 
                   WHERE operation_type = 'dashboard_decrypt' AND field_count >= 50), 0),
         dashboard_load_result, '{"validation_run": true}'),
        ('ws148_validation_mobile_progressive', 3000,
         COALESCE((SELECT AVG(processing_time_ms) FROM encryption.performance_metrics_v2 
                   WHERE operation_type = 'progressive_decrypt_high_priority'), 0),
         mobile_progressive_result, '{"validation_run": true}'),
        ('ws148_validation_search_response', 1000,
         COALESCE((SELECT AVG(processing_time_ms) FROM encryption.performance_metrics_v2 
                   WHERE operation_type LIKE '%search%'), 0),
         search_response_result, '{"validation_run": true}'),
        ('ws148_validation_cache_efficiency', 80,
         COALESCE((SELECT (COUNT(*) FILTER (WHERE hit = true)::decimal / COUNT(*)) * 100
                   FROM encryption.cache_metrics WHERE user_id IS NOT NULL), 0),
         cache_hit_result, '{"validation_run": true}');
    
    RETURN overall_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_performance_metrics_v2_operation_time 
    ON encryption.performance_metrics_v2(operation_type, processing_time_ms, created_at DESC);
    
CREATE INDEX IF NOT EXISTS idx_batch_operations_status_type 
    ON encryption.batch_operations(status, operation_type, started_at DESC);
    
CREATE INDEX IF NOT EXISTS idx_cache_metrics_user_time 
    ON encryption.cache_metrics(user_id, created_at DESC, hit);
    
CREATE INDEX IF NOT EXISTS idx_field_priority_config_table_priority 
    ON encryption.field_priority_config(table_name, priority ASC, device_type);

-- Enable Row Level Security for new tables
ALTER TABLE encryption.performance_metrics_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption.batch_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption.cache_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption.field_priority_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption.performance_benchmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for performance_metrics_v2 (admin access only)
CREATE POLICY "Admins can access performance metrics v2" ON encryption.performance_metrics_v2
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for batch_operations (users can access their own)
CREATE POLICY "Users can access own batch operations" ON encryption.batch_operations
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can access all batch operations" ON encryption.batch_operations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for cache_metrics
CREATE POLICY "Users can access own cache metrics" ON encryption.cache_metrics
    FOR ALL USING (user_id = auth.uid());

-- RLS Policies for field_priority_config
CREATE POLICY "Users can manage own field priorities" ON encryption.field_priority_config
    FOR ALL USING (user_id = auth.uid());

-- RLS Policies for performance_benchmarks (admin read-only)
CREATE POLICY "Admins can view performance benchmarks" ON encryption.performance_benchmarks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Grant permissions for new tables and functions
GRANT SELECT ON encryption.performance_dashboard TO authenticated;
GRANT SELECT ON encryption.cache_performance_dashboard TO authenticated;
GRANT SELECT ON encryption.batch_operations_dashboard TO authenticated;

GRANT USAGE ON SCHEMA encryption TO authenticated;
GRANT SELECT, INSERT ON encryption.performance_metrics_v2 TO authenticated;
GRANT SELECT, INSERT, UPDATE ON encryption.batch_operations TO authenticated;
GRANT SELECT, INSERT ON encryption.cache_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON encryption.field_priority_config TO authenticated;
GRANT SELECT ON encryption.performance_benchmarks TO authenticated;

GRANT EXECUTE ON FUNCTION encryption.search_encrypted_field TO authenticated;
GRANT EXECUTE ON FUNCTION encryption.validate_performance_benchmarks TO admin;

-- Add a comment documenting WS-148 Round 2 completion
COMMENT ON SCHEMA encryption IS 'WS-148 Round 2: Advanced searchable encryption with performance optimization. Implements batch operations, progressive decryption, and mobile-optimized caching for wedding industry P0 security requirements.';

-- Success confirmation
SELECT 'WS-148 Round 2 searchable encryption system deployed successfully' as deployment_status;