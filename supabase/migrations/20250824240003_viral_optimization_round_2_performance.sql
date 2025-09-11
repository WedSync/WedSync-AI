/**
 * Viral Optimization Round 2 - Database Performance Enhancements
 * WS-141 Round 2: Advanced database optimizations and triggers
 * FOCUS: Performance, realtime updates, analytics optimization
 */

-- =====================================================
-- 1. PERFORMANCE INDEXES FOR VIRAL ANALYTICS
-- =====================================================

-- High-performance indexes for viral invitations queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_viral_invitations_analytics_composite 
ON viral_invitations (sender_id, status, generation, sent_at DESC) 
WHERE sent_at > NOW() - INTERVAL '1 year';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_viral_invitations_channel_performance 
ON viral_invitations (channel, status, opened_at, clicked_at, responded_at, sent_at DESC)
WHERE sent_at > NOW() - INTERVAL '6 months';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_viral_invitations_geographic_spread 
ON viral_invitations USING GIN ((recipient_data->'location_data'))
WHERE status = 'converted';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_viral_invitations_timing_analysis 
ON viral_invitations (
    EXTRACT(HOUR FROM sent_at AT TIME ZONE 'UTC'), 
    EXTRACT(DOW FROM sent_at AT TIME ZONE 'UTC'), 
    relationship_type, 
    status
) WHERE sent_at > NOW() - INTERVAL '90 days';

-- A/B testing template performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_template_variants_performance 
ON template_variants (relationship_type, is_active, variant_name)
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ab_test_results_performance 
ON viral_ab_test_results (template_variant_id, test_group, result_type, created_at DESC)
WHERE created_at > NOW() - INTERVAL '6 months';

-- Super-connector algorithm indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_super_connectors_score_ranking 
ON super_connectors (tier, super_connector_score DESC, last_analyzed_at DESC)
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_super_connectors_priority_calculation 
ON super_connectors (user_id, tier, priority_level DESC)
WHERE is_active = true;

-- Referral rewards system indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_referral_rewards_analytics 
ON referral_rewards (referrer_id, status, earned_at DESC, final_reward_amount)
WHERE earned_at > NOW() - INTERVAL '1 year';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_referral_rewards_expiration 
ON referral_rewards (status, expires_at)
WHERE status = 'pending' AND expires_at IS NOT NULL;

-- Security and audit indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_threats_monitoring 
ON security_threats (threat_type, severity, detected_at DESC, status)
WHERE detected_at > NOW() - INTERVAL '30 days';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_blocklist_active 
ON security_blocklist (ip_address, expires_at DESC)
WHERE expires_at > NOW();

-- =====================================================
-- 2. POSTGRESQL FUNCTIONS FOR ANALYTICS
-- =====================================================

-- High-performance viral coefficient calculation
CREATE OR REPLACE FUNCTION calculate_viral_coefficient(
    timeframe_days INTEGER DEFAULT 30,
    generation_limit INTEGER DEFAULT 10
) RETURNS TABLE (
    generation INTEGER,
    invite_count BIGINT,
    conversion_count BIGINT,
    viral_coefficient NUMERIC(10,4)
) 
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
AS $$
BEGIN
    RETURN QUERY
    WITH viral_chain AS (
        SELECT 
            vi.generation,
            COUNT(*) as invites,
            COUNT(CASE WHEN vi.status = 'converted' THEN 1 END) as conversions
        FROM viral_invitations vi
        WHERE vi.sent_at > NOW() - INTERVAL '1 day' * timeframe_days
          AND vi.generation <= generation_limit
        GROUP BY vi.generation
        ORDER BY vi.generation
    )
    SELECT 
        vc.generation,
        vc.invites,
        vc.conversions,
        CASE 
            WHEN LAG(vc.conversions) OVER (ORDER BY vc.generation) IS NULL THEN 0::NUMERIC
            ELSE vc.conversions::NUMERIC / NULLIF(LAG(vc.conversions) OVER (ORDER BY vc.generation), 0)
        END as viral_coefficient
    FROM viral_chain vc;
END;
$$;

-- Super-connector scoring function with performance optimization
CREATE OR REPLACE FUNCTION update_super_connector_scores(
    batch_size INTEGER DEFAULT 100,
    min_activity_days INTEGER DEFAULT 30
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    processed_count INTEGER := 0;
    batch_users UUID[];
BEGIN
    -- Process users in batches for better performance
    FOR batch_users IN 
        SELECT ARRAY_AGG(user_id) 
        FROM (
            SELECT DISTINCT sender_id as user_id
            FROM viral_invitations 
            WHERE sent_at > NOW() - INTERVAL '1 day' * min_activity_days
            LIMIT batch_size
        ) batch_data
    LOOP
        -- Update super-connector scores for this batch
        WITH user_metrics AS (
            SELECT 
                vi.sender_id,
                COUNT(DISTINCT vi.recipient_id) as unique_connections,
                COUNT(CASE WHEN vi.status = 'converted' THEN 1 END) as successful_conversions,
                AVG(CASE 
                    WHEN vi.connection_strength IS NOT NULL 
                    THEN vi.connection_strength::NUMERIC 
                    ELSE 0.5 
                END) as avg_connection_strength,
                COUNT(CASE 
                    WHEN vi.sent_at > NOW() - INTERVAL '30 days' 
                    THEN 1 
                END) as recent_activity
            FROM viral_invitations vi
            WHERE vi.sender_id = ANY(batch_users)
              AND vi.sent_at > NOW() - INTERVAL '1 year'
            GROUP BY vi.sender_id
        ),
        scored_users AS (
            SELECT 
                um.sender_id,
                -- Weighted scoring algorithm
                (
                    (um.unique_connections * 0.3) +
                    (um.successful_conversions * 0.25) +
                    (um.avg_connection_strength * 100 * 0.25) +
                    (um.recent_activity * 0.2)
                ) as calculated_score,
                CASE
                    WHEN um.successful_conversions >= 50 THEN 'platinum'
                    WHEN um.successful_conversions >= 15 THEN 'gold'
                    WHEN um.successful_conversions >= 5 THEN 'silver'
                    ELSE 'bronze'
                END as calculated_tier,
                um.unique_connections as couple_count,
                um.avg_connection_strength,
                um.recent_activity as recent_connections,
                um.successful_conversions as viral_successes
            FROM user_metrics um
        )
        INSERT INTO super_connectors (
            user_id, couple_count, avg_connection_strength, recent_connections,
            viral_successes, super_connector_score, tier, priority_level,
            reward_multiplier, last_analyzed_at, is_active, created_at, updated_at
        )
        SELECT 
            su.sender_id,
            su.couple_count,
            su.avg_connection_strength,
            su.recent_connections,
            su.viral_successes,
            su.calculated_score,
            su.calculated_tier,
            -- Priority based on tier and score
            CASE su.calculated_tier
                WHEN 'platinum' THEN 10
                WHEN 'gold' THEN 8
                WHEN 'silver' THEN 6
                ELSE 4
            END,
            -- Reward multiplier based on tier
            CASE su.calculated_tier
                WHEN 'platinum' THEN 2.0
                WHEN 'gold' THEN 1.5
                WHEN 'silver' THEN 1.25
                ELSE 1.0
            END,
            NOW(),
            true,
            NOW(),
            NOW()
        FROM scored_users su
        ON CONFLICT (user_id) DO UPDATE SET
            couple_count = EXCLUDED.couple_count,
            avg_connection_strength = EXCLUDED.avg_connection_strength,
            recent_connections = EXCLUDED.recent_connections,
            viral_successes = EXCLUDED.viral_successes,
            super_connector_score = EXCLUDED.super_connector_score,
            tier = EXCLUDED.tier,
            priority_level = EXCLUDED.priority_level,
            reward_multiplier = EXCLUDED.reward_multiplier,
            last_analyzed_at = NOW(),
            updated_at = NOW();
        
        processed_count := processed_count + array_length(batch_users, 1);
    END LOOP;
    
    RETURN processed_count;
END;
$$;

-- Referral reward expiration cleanup function
CREATE OR REPLACE FUNCTION expire_old_referral_rewards() 
RETURNS TABLE (expired_count INTEGER, total_value NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expired_count INTEGER;
    total_value NUMERIC;
BEGIN
    -- Expire pending rewards that have passed their expiration date
    WITH expired_rewards AS (
        UPDATE referral_rewards
        SET status = 'expired', updated_at = NOW()
        WHERE status = 'pending' 
          AND expires_at < NOW()
        RETURNING final_reward_amount
    )
    SELECT 
        COUNT(*)::INTEGER,
        COALESCE(SUM(final_reward_amount), 0)
    INTO expired_count, total_value
    FROM expired_rewards;
    
    RETURN QUERY SELECT expired_count, total_value;
END;
$$;

-- =====================================================
-- 3. REALTIME TRIGGERS FOR LIVE UPDATES
-- =====================================================

-- Trigger function for viral invitation updates
CREATE OR REPLACE FUNCTION notify_viral_invitation_change() 
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    payload JSON;
BEGIN
    -- Create payload for realtime notification
    payload = json_build_object(
        'table', 'viral_invitations',
        'type', TG_OP,
        'id', COALESCE(NEW.id, OLD.id),
        'sender_id', COALESCE(NEW.sender_id, OLD.sender_id),
        'status', COALESCE(NEW.status, OLD.status),
        'generation', COALESCE(NEW.generation, OLD.generation),
        'timestamp', EXTRACT(EPOCH FROM NOW())
    );
    
    -- Send notification to Supabase realtime
    PERFORM pg_notify('viral_invitation_change', payload::TEXT);
    
    -- Update related analytics tables if status changed
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        -- Trigger super-connector score recalculation for sender
        INSERT INTO background_jobs (job_type, job_data, created_at)
        VALUES (
            'update_super_connector_score',
            json_build_object('user_id', NEW.sender_id),
            NOW()
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply trigger to viral_invitations table
DROP TRIGGER IF EXISTS viral_invitation_change_trigger ON viral_invitations;
CREATE TRIGGER viral_invitation_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON viral_invitations
    FOR EACH ROW 
    EXECUTE FUNCTION notify_viral_invitation_change();

-- Trigger function for A/B test result updates
CREATE OR REPLACE FUNCTION notify_ab_test_result_change() 
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    payload JSON;
BEGIN
    payload = json_build_object(
        'table', 'viral_ab_test_results',
        'type', TG_OP,
        'template_variant_id', COALESCE(NEW.template_variant_id, OLD.template_variant_id),
        'result_type', COALESCE(NEW.result_type, OLD.result_type),
        'test_group', COALESCE(NEW.test_group, OLD.test_group),
        'timestamp', EXTRACT(EPOCH FROM NOW())
    );
    
    PERFORM pg_notify('ab_test_change', payload::TEXT);
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply trigger to A/B test results
DROP TRIGGER IF EXISTS ab_test_result_change_trigger ON viral_ab_test_results;
CREATE TRIGGER ab_test_result_change_trigger
    AFTER INSERT OR UPDATE ON viral_ab_test_results
    FOR EACH ROW 
    EXECUTE FUNCTION notify_ab_test_result_change();

-- Trigger function for referral reward updates
CREATE OR REPLACE FUNCTION notify_referral_reward_change() 
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    payload JSON;
BEGIN
    payload = json_build_object(
        'table', 'referral_rewards',
        'type', TG_OP,
        'id', COALESCE(NEW.id, OLD.id),
        'referrer_id', COALESCE(NEW.referrer_id, OLD.referrer_id),
        'status', COALESCE(NEW.status, OLD.status),
        'final_reward_amount', COALESCE(NEW.final_reward_amount, OLD.final_reward_amount),
        'timestamp', EXTRACT(EPOCH FROM NOW())
    );
    
    PERFORM pg_notify('referral_reward_change', payload::TEXT);
    
    -- Auto-approve small rewards (under $50)
    IF TG_OP = 'INSERT' AND NEW.status = 'pending' AND NEW.final_reward_amount < 50 THEN
        NEW.status = 'approved';
        NEW.updated_at = NOW();
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply trigger to referral_rewards table
DROP TRIGGER IF EXISTS referral_reward_change_trigger ON referral_rewards;
CREATE TRIGGER referral_reward_change_trigger
    BEFORE INSERT OR AFTER UPDATE ON referral_rewards
    FOR EACH ROW 
    EXECUTE FUNCTION notify_referral_reward_change();

-- =====================================================
-- 4. MATERIALIZED VIEWS FOR ANALYTICS PERFORMANCE
-- =====================================================

-- Materialized view for viral analytics summary
CREATE MATERIALIZED VIEW IF NOT EXISTS viral_analytics_summary AS
SELECT 
    DATE_TRUNC('day', vi.sent_at) as date,
    vi.channel,
    vi.relationship_type,
    COUNT(*) as total_invites,
    COUNT(CASE WHEN vi.status = 'delivered' THEN 1 END) as delivered_count,
    COUNT(CASE WHEN vi.opened_at IS NOT NULL THEN 1 END) as opened_count,
    COUNT(CASE WHEN vi.clicked_at IS NOT NULL THEN 1 END) as clicked_count,
    COUNT(CASE WHEN vi.responded_at IS NOT NULL THEN 1 END) as responded_count,
    COUNT(CASE WHEN vi.status = 'converted' THEN 1 END) as converted_count,
    ROUND(
        COUNT(CASE WHEN vi.status = 'converted' THEN 1 END)::NUMERIC / 
        NULLIF(COUNT(*), 0) * 100, 2
    ) as conversion_rate,
    AVG(EXTRACT(EPOCH FROM (vi.responded_at - vi.sent_at)) / 3600) as avg_response_time_hours
FROM viral_invitations vi
WHERE vi.sent_at > NOW() - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', vi.sent_at), vi.channel, vi.relationship_type;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_viral_analytics_summary_unique 
ON viral_analytics_summary (date, channel, relationship_type);

-- Materialized view for super-connector network analysis
CREATE MATERIALIZED VIEW IF NOT EXISTS super_connector_network_summary AS
SELECT 
    sc.tier,
    COUNT(*) as connector_count,
    AVG(sc.super_connector_score) as avg_score,
    SUM(sc.viral_successes) as total_viral_successes,
    AVG(sc.couple_count) as avg_couple_count,
    MAX(sc.last_analyzed_at) as last_updated
FROM super_connectors sc
WHERE sc.is_active = true
GROUP BY sc.tier;

-- =====================================================
-- 5. AUTOMATED REFRESH JOBS
-- =====================================================

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_viral_analytics_views() 
RETURNS VOID 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Refresh materialized views concurrently for better performance
    REFRESH MATERIALIZED VIEW CONCURRENTLY viral_analytics_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY super_connector_network_summary;
    
    -- Log refresh completion
    INSERT INTO system_logs (log_level, message, created_at)
    VALUES ('INFO', 'Viral analytics materialized views refreshed', NOW());
END;
$$;

-- =====================================================
-- 6. PERFORMANCE MONITORING TABLES
-- =====================================================

-- Table for tracking query performance
CREATE TABLE IF NOT EXISTS viral_query_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_type VARCHAR(100) NOT NULL,
    endpoint VARCHAR(200) NOT NULL,
    execution_time_ms INTEGER NOT NULL,
    user_id UUID,
    ip_address INET,
    query_params JSONB,
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    index_usage TEXT[],
    slow_query_threshold_exceeded BOOLEAN DEFAULT FALSE
);

-- Index for performance monitoring
CREATE INDEX IF NOT EXISTS idx_viral_query_performance_monitoring 
ON viral_query_performance (query_type, executed_at DESC, execution_time_ms DESC);

-- Function to log query performance
CREATE OR REPLACE FUNCTION log_query_performance(
    p_query_type VARCHAR(100),
    p_endpoint VARCHAR(200),
    p_execution_time_ms INTEGER,
    p_user_id UUID DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_query_params JSONB DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO viral_query_performance (
        query_type, endpoint, execution_time_ms, user_id, 
        ip_address, query_params, slow_query_threshold_exceeded
    )
    VALUES (
        p_query_type, p_endpoint, p_execution_time_ms, p_user_id,
        p_ip_address, p_query_params,
        p_execution_time_ms > 1000 -- Flag queries over 1 second
    );
    
    -- Alert on consistently slow queries
    IF p_execution_time_ms > 2000 THEN
        INSERT INTO system_alerts (alert_type, message, severity, created_at)
        VALUES (
            'SLOW_QUERY', 
            format('Slow query detected: %s took %sms', p_query_type, p_execution_time_ms),
            'WARNING',
            NOW()
        );
    END IF;
END;
$$;

-- =====================================================
-- 7. BACKGROUND JOB SCHEDULING
-- =====================================================

-- Enable pg_cron if available (requires superuser)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule regular maintenance tasks (would require pg_cron)
/*
-- Refresh materialized views every 5 minutes
SELECT cron.schedule('refresh-viral-analytics', '*/5 * * * *', 'SELECT refresh_viral_analytics_views();');

-- Update super-connector scores every hour
SELECT cron.schedule('update-super-connectors', '0 * * * *', 'SELECT update_super_connector_scores(500, 30);');

-- Expire old referral rewards every 6 hours
SELECT cron.schedule('expire-referral-rewards', '0 */6 * * *', 'SELECT expire_old_referral_rewards();');

-- Clean up old performance logs daily
SELECT cron.schedule('cleanup-performance-logs', '0 2 * * *', 
    'DELETE FROM viral_query_performance WHERE executed_at < NOW() - INTERVAL ''30 days'';');
*/

-- =====================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on viral analytics tables
ALTER TABLE viral_analytics_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_connector_network_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_query_performance ENABLE ROW LEVEL SECURITY;

-- RLS Policy for viral analytics summary (admin/marketing managers only)
CREATE POLICY viral_analytics_access ON viral_analytics_summary
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users au
            JOIN user_profiles up ON au.id = up.id
            WHERE au.id = auth.uid()
              AND up.role IN ('admin', 'marketing_manager', 'data_analyst')
        )
    );

-- RLS Policy for super connector network summary
CREATE POLICY super_connector_network_access ON super_connector_network_summary
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users au
            JOIN user_profiles up ON au.id = up.id
            WHERE au.id = auth.uid()
              AND up.role IN ('admin', 'marketing_manager', 'business_manager')
        )
    );

-- RLS Policy for query performance monitoring (admin only)
CREATE POLICY viral_query_performance_access ON viral_query_performance
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users au
            JOIN user_profiles up ON au.id = up.id
            WHERE au.id = auth.uid()
              AND up.role = 'admin'
        )
    );

-- =====================================================
-- 9. FINAL OPTIMIZATIONS
-- =====================================================

-- Update table statistics for better query planning
ANALYZE viral_invitations;
ANALYZE template_variants;
ANALYZE viral_ab_test_results;
ANALYZE super_connectors;
ANALYZE referral_rewards;

-- Set appropriate work_mem for complex analytics queries
-- This would typically be done at the session level
-- SET work_mem = '256MB';

-- Comment with completion status
COMMENT ON SCHEMA public IS 'WS-141 Round 2 Database Optimizations Applied - Performance Enhanced';

-- Log successful migration
INSERT INTO system_logs (log_level, message, created_at)
VALUES ('INFO', 'WS-141 Round 2 database optimizations migration completed successfully', NOW());