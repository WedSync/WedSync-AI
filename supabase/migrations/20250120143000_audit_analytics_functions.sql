-- Advanced audit analytics functions for WS-177 Audit Logging System
-- These functions support the audit analytics and reporting APIs

-- Function: Get audit time series data
CREATE OR REPLACE FUNCTION get_audit_time_series(
    base_query TEXT,
    time_format TEXT DEFAULT 'YYYY-MM-DD',
    metric_type TEXT DEFAULT 'events'
)
RETURNS TABLE(
    time_bucket TEXT,
    event_count BIGINT,
    avg_risk_score NUMERIC,
    unique_users BIGINT,
    critical_events BIGINT
) AS $$
BEGIN
    RETURN QUERY EXECUTE format('
        SELECT 
            to_char(timestamp, %L) as time_bucket,
            COUNT(*) as event_count,
            COALESCE(AVG(risk_score), 0) as avg_risk_score,
            COUNT(DISTINCT user_id) as unique_users,
            COUNT(*) FILTER (WHERE severity = ''critical'') as critical_events
        FROM audit_logs_optimized
        WHERE %s
        GROUP BY to_char(timestamp, %L)
        ORDER BY time_bucket
    ', time_format, base_query, time_format);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get event distribution by type
CREATE OR REPLACE FUNCTION get_audit_event_distribution(base_query TEXT)
RETURNS TABLE(
    event_type TEXT,
    event_count BIGINT,
    percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY EXECUTE format('
        WITH event_counts AS (
            SELECT 
                event_type,
                COUNT(*) as count
            FROM audit_logs_optimized
            WHERE %s
            GROUP BY event_type
        ),
        total_count AS (
            SELECT SUM(count) as total FROM event_counts
        )
        SELECT 
            ec.event_type,
            ec.count as event_count,
            ROUND((ec.count * 100.0 / tc.total), 2) as percentage
        FROM event_counts ec
        CROSS JOIN total_count tc
        ORDER BY ec.count DESC
    ', base_query);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get resource activity analysis
CREATE OR REPLACE FUNCTION get_audit_resource_activity(base_query TEXT)
RETURNS TABLE(
    resource_type TEXT,
    action TEXT,
    event_count BIGINT,
    avg_risk_score NUMERIC,
    last_activity TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY EXECUTE format('
        SELECT 
            resource_type,
            action,
            COUNT(*) as event_count,
            COALESCE(AVG(risk_score), 0) as avg_risk_score,
            MAX(timestamp) as last_activity
        FROM audit_logs_optimized
        WHERE %s
        GROUP BY resource_type, action
        ORDER BY event_count DESC
    ', base_query);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get user activity analysis
CREATE OR REPLACE FUNCTION get_audit_user_activity(base_query TEXT)
RETURNS TABLE(
    user_id UUID,
    user_email TEXT,
    event_count BIGINT,
    avg_risk_score NUMERIC,
    unique_resources BIGINT,
    last_activity TIMESTAMP WITH TIME ZONE,
    most_common_action TEXT
) AS $$
BEGIN
    RETURN QUERY EXECUTE format('
        WITH user_stats AS (
            SELECT 
                user_id,
                user_email,
                COUNT(*) as event_count,
                COALESCE(AVG(risk_score), 0) as avg_risk_score,
                COUNT(DISTINCT CONCAT(resource_type, ''-'', resource_id)) as unique_resources,
                MAX(timestamp) as last_activity
            FROM audit_logs_optimized
            WHERE %s AND user_id IS NOT NULL
            GROUP BY user_id, user_email
        ),
        user_actions AS (
            SELECT DISTINCT ON (user_id)
                user_id,
                action as most_common_action
            FROM (
                SELECT 
                    user_id,
                    action,
                    COUNT(*) as action_count,
                    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY COUNT(*) DESC) as rn
                FROM audit_logs_optimized
                WHERE %s AND user_id IS NOT NULL
                GROUP BY user_id, action
            ) ranked_actions
            WHERE rn = 1
        )
        SELECT 
            us.user_id,
            us.user_email,
            us.event_count,
            us.avg_risk_score,
            us.unique_resources,
            us.last_activity,
            ua.most_common_action
        FROM user_stats us
        LEFT JOIN user_actions ua ON us.user_id = ua.user_id
        ORDER BY us.event_count DESC
        LIMIT 100
    ', base_query, base_query);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get risk distribution analysis
CREATE OR REPLACE FUNCTION get_risk_distribution(base_query TEXT)
RETURNS TABLE(
    risk_level TEXT,
    event_count BIGINT,
    percentage NUMERIC,
    avg_risk_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY EXECUTE format('
        WITH risk_buckets AS (
            SELECT 
                CASE 
                    WHEN risk_score <= 25 THEN ''low''
                    WHEN risk_score <= 50 THEN ''medium''
                    WHEN risk_score <= 75 THEN ''high''
                    ELSE ''critical''
                END as risk_level,
                risk_score
            FROM audit_logs_optimized
            WHERE %s AND risk_score IS NOT NULL
        ),
        risk_counts AS (
            SELECT 
                risk_level,
                COUNT(*) as count,
                AVG(risk_score) as avg_score
            FROM risk_buckets
            GROUP BY risk_level
        ),
        total_count AS (
            SELECT SUM(count) as total FROM risk_counts
        )
        SELECT 
            rc.risk_level,
            rc.count as event_count,
            ROUND((rc.count * 100.0 / tc.total), 2) as percentage,
            ROUND(rc.avg_score, 2) as avg_risk_score
        FROM risk_counts rc
        CROSS JOIN total_count tc
        ORDER BY 
            CASE rc.risk_level 
                WHEN ''critical'' THEN 4
                WHEN ''high'' THEN 3
                WHEN ''medium'' THEN 2
                WHEN ''low'' THEN 1
            END DESC
    ', base_query);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get top risk users
CREATE OR REPLACE FUNCTION get_top_risk_users(base_query TEXT)
RETURNS TABLE(
    user_id UUID,
    user_email TEXT,
    avg_risk_score NUMERIC,
    max_risk_score INTEGER,
    high_risk_events BIGINT,
    total_events BIGINT,
    risk_ratio NUMERIC
) AS $$
BEGIN
    RETURN QUERY EXECUTE format('
        WITH user_risk_stats AS (
            SELECT 
                user_id,
                user_email,
                AVG(risk_score) as avg_risk_score,
                MAX(risk_score) as max_risk_score,
                COUNT(*) FILTER (WHERE risk_score > 60) as high_risk_events,
                COUNT(*) as total_events
            FROM audit_logs_optimized
            WHERE %s AND user_id IS NOT NULL AND risk_score IS NOT NULL
            GROUP BY user_id, user_email
            HAVING COUNT(*) >= 5
        )
        SELECT 
            user_id,
            user_email,
            ROUND(avg_risk_score, 2) as avg_risk_score,
            max_risk_score,
            high_risk_events,
            total_events,
            ROUND((high_risk_events * 100.0 / total_events), 2) as risk_ratio
        FROM user_risk_stats
        ORDER BY avg_risk_score DESC, high_risk_events DESC
        LIMIT 50
    ', base_query);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get risk by resource type
CREATE OR REPLACE FUNCTION get_risk_by_resource(base_query TEXT)
RETURNS TABLE(
    resource_type TEXT,
    avg_risk_score NUMERIC,
    max_risk_score INTEGER,
    high_risk_events BIGINT,
    total_events BIGINT,
    risk_trend_7d NUMERIC
) AS $$
BEGIN
    RETURN QUERY EXECUTE format('
        WITH resource_risk AS (
            SELECT 
                resource_type,
                AVG(risk_score) as avg_risk_score,
                MAX(risk_score) as max_risk_score,
                COUNT(*) FILTER (WHERE risk_score > 60) as high_risk_events,
                COUNT(*) as total_events
            FROM audit_logs_optimized
            WHERE %s AND risk_score IS NOT NULL
            GROUP BY resource_type
        ),
        recent_trend AS (
            SELECT 
                resource_type,
                AVG(risk_score) as recent_avg_risk_score
            FROM audit_logs_optimized
            WHERE %s AND risk_score IS NOT NULL 
                AND timestamp >= NOW() - INTERVAL ''7 days''
            GROUP BY resource_type
        )
        SELECT 
            rr.resource_type,
            ROUND(rr.avg_risk_score, 2) as avg_risk_score,
            rr.max_risk_score,
            rr.high_risk_events,
            rr.total_events,
            COALESCE(ROUND(rt.recent_avg_risk_score, 2), 0) as risk_trend_7d
        FROM resource_risk rr
        LEFT JOIN recent_trend rt ON rr.resource_type = rt.resource_type
        ORDER BY rr.avg_risk_score DESC
    ', base_query, base_query);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get audit summary statistics
CREATE OR REPLACE FUNCTION get_audit_summary_stats(base_query TEXT)
RETURNS TABLE(
    total_events BIGINT,
    unique_users BIGINT,
    unique_weddings BIGINT,
    avg_risk_score NUMERIC,
    events_by_severity JSONB,
    most_active_resource TEXT,
    most_common_action TEXT
) AS $$
DECLARE
    result_row RECORD;
BEGIN
    -- Get basic statistics
    EXECUTE format('
        SELECT 
            COUNT(*) as total_events,
            COUNT(DISTINCT user_id) as unique_users,
            COUNT(DISTINCT wedding_id) FILTER (WHERE wedding_id IS NOT NULL) as unique_weddings,
            COALESCE(AVG(risk_score), 0) as avg_risk_score
        FROM audit_logs_optimized
        WHERE %s
    ', base_query) INTO result_row;

    total_events := result_row.total_events;
    unique_users := result_row.unique_users;
    unique_weddings := result_row.unique_weddings;
    avg_risk_score := ROUND(result_row.avg_risk_score, 2);

    -- Get severity distribution
    EXECUTE format('
        SELECT jsonb_object_agg(severity, count) as events_by_severity
        FROM (
            SELECT 
                severity,
                COUNT(*) as count
            FROM audit_logs_optimized
            WHERE %s
            GROUP BY severity
        ) severity_counts
    ', base_query) INTO events_by_severity;

    -- Get most active resource type
    EXECUTE format('
        SELECT resource_type
        FROM audit_logs_optimized
        WHERE %s
        GROUP BY resource_type
        ORDER BY COUNT(*) DESC
        LIMIT 1
    ', base_query) INTO most_active_resource;

    -- Get most common action
    EXECUTE format('
        SELECT action
        FROM audit_logs_optimized
        WHERE %s
        GROUP BY action
        ORDER BY COUNT(*) DESC
        LIMIT 1
    ', base_query) INTO most_common_action;

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Detect unusual access patterns
CREATE OR REPLACE FUNCTION detect_unusual_access_patterns(
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE(
    type TEXT,
    description TEXT,
    user_id UUID,
    user_email TEXT,
    severity TEXT,
    first_occurrence TIMESTAMP WITH TIME ZONE,
    last_occurrence TIMESTAMP WITH TIME ZONE,
    occurrence_count BIGINT
) AS $$
BEGIN
    -- Unusual time access patterns
    RETURN QUERY
    WITH unusual_times AS (
        SELECT 
            user_id,
            user_email,
            COUNT(*) as count,
            MIN(timestamp) as first_time,
            MAX(timestamp) as last_time
        FROM audit_logs_optimized
        WHERE timestamp BETWEEN start_date AND end_date
            AND (
                EXTRACT(hour FROM timestamp) < 6 OR 
                EXTRACT(hour FROM timestamp) > 22
            )
            AND user_id IS NOT NULL
        GROUP BY user_id, user_email
        HAVING COUNT(*) >= 10
    )
    SELECT 
        'UNUSUAL_TIME_ACCESS' as type,
        'Access during unusual hours (before 6 AM or after 10 PM)' as description,
        user_id,
        user_email,
        CASE WHEN count >= 50 THEN 'critical'
             WHEN count >= 20 THEN 'high'
             ELSE 'medium'
        END as severity,
        first_time as first_occurrence,
        last_time as last_occurrence,
        count as occurrence_count
    FROM unusual_times
    
    UNION ALL
    
    -- Excessive resource access
    SELECT 
        'EXCESSIVE_RESOURCE_ACCESS' as type,
        'Excessive access to ' || resource_type || ' resources' as description,
        user_id,
        user_email,
        CASE WHEN count >= 1000 THEN 'critical'
             WHEN count >= 500 THEN 'high'
             ELSE 'medium'
        END as severity,
        MIN(timestamp) as first_occurrence,
        MAX(timestamp) as last_occurrence,
        COUNT(*) as occurrence_count
    FROM audit_logs_optimized
    WHERE timestamp BETWEEN start_date AND end_date
        AND user_id IS NOT NULL
    GROUP BY user_id, user_email, resource_type
    HAVING COUNT(*) >= 100
    
    UNION ALL
    
    -- Geographic anomalies (different IP addresses)
    SELECT 
        'GEOGRAPHIC_ANOMALY' as type,
        'Access from multiple IP addresses' as description,
        user_id,
        user_email,
        CASE WHEN COUNT(DISTINCT ip_address) >= 20 THEN 'critical'
             WHEN COUNT(DISTINCT ip_address) >= 10 THEN 'high'
             ELSE 'medium'
        END as severity,
        MIN(timestamp) as first_occurrence,
        MAX(timestamp) as last_occurrence,
        COUNT(DISTINCT ip_address) as occurrence_count
    FROM audit_logs_optimized
    WHERE timestamp BETWEEN start_date AND end_date
        AND user_id IS NOT NULL
        AND ip_address IS NOT NULL
        AND ip_address != 'unknown'
    GROUP BY user_id, user_email
    HAVING COUNT(DISTINCT ip_address) >= 5
    
    ORDER BY severity DESC, occurrence_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Calculate user risk profiles
CREATE OR REPLACE FUNCTION calculate_user_risk_profiles(
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE(
    user_id UUID,
    user_email TEXT,
    risk_profile TEXT,
    avg_risk_score NUMERIC,
    total_events BIGINT,
    high_risk_events BIGINT,
    failed_logins BIGINT,
    unusual_patterns BIGINT,
    risk_factors JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH user_base_stats AS (
        SELECT 
            a.user_id,
            a.user_email,
            AVG(a.risk_score) as avg_risk_score,
            COUNT(*) as total_events,
            COUNT(*) FILTER (WHERE a.risk_score > 60) as high_risk_events,
            COUNT(*) FILTER (WHERE a.event_type = 'auth_failure') as failed_logins,
            COUNT(DISTINCT a.ip_address) FILTER (WHERE a.ip_address != 'unknown') as unique_ips,
            COUNT(*) FILTER (WHERE 
                EXTRACT(hour FROM a.timestamp) < 6 OR 
                EXTRACT(hour FROM a.timestamp) > 22
            ) as unusual_time_access
        FROM audit_logs_optimized a
        WHERE a.timestamp BETWEEN start_date AND end_date
            AND a.user_id IS NOT NULL
        GROUP BY a.user_id, a.user_email
        HAVING COUNT(*) >= 5
    ),
    risk_calculations AS (
        SELECT 
            *,
            CASE 
                WHEN avg_risk_score >= 70 OR failed_logins >= 10 THEN 'HIGH_RISK'
                WHEN avg_risk_score >= 50 OR failed_logins >= 5 OR high_risk_events >= 10 THEN 'MEDIUM_RISK'
                WHEN avg_risk_score >= 30 OR high_risk_events >= 3 THEN 'LOW_RISK'
                ELSE 'MINIMAL_RISK'
            END as risk_profile,
            jsonb_build_object(
                'multiple_ips', unique_ips >= 5,
                'unusual_hours', unusual_time_access >= 10,
                'failed_login_attempts', failed_logins > 0,
                'high_risk_actions', high_risk_events > 0,
                'excessive_activity', total_events >= 100
            ) as risk_factors
        FROM user_base_stats
    )
    SELECT 
        r.user_id,
        r.user_email,
        r.risk_profile,
        ROUND(r.avg_risk_score, 2) as avg_risk_score,
        r.total_events,
        r.high_risk_events,
        r.failed_logins,
        r.unusual_time_access as unusual_patterns,
        r.risk_factors
    FROM risk_calculations r
    ORDER BY 
        CASE r.risk_profile
            WHEN 'HIGH_RISK' THEN 4
            WHEN 'MEDIUM_RISK' THEN 3
            WHEN 'LOW_RISK' THEN 2
            ELSE 1
        END DESC,
        r.avg_risk_score DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for optimal performance of analytics functions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_timestamp_resource 
    ON audit_logs_optimized(timestamp, resource_type, action);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_risk 
    ON audit_logs_optimized(user_id, risk_score) 
    WHERE user_id IS NOT NULL AND risk_score IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_wedding_timestamp 
    ON audit_logs_optimized(wedding_id, timestamp) 
    WHERE wedding_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_severity_timestamp 
    ON audit_logs_optimized(severity, timestamp);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_ip_timestamp 
    ON audit_logs_optimized(ip_address, timestamp) 
    WHERE ip_address IS NOT NULL AND ip_address != 'unknown';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_audit_time_series TO authenticated;
GRANT EXECUTE ON FUNCTION get_audit_event_distribution TO authenticated;
GRANT EXECUTE ON FUNCTION get_audit_resource_activity TO authenticated;
GRANT EXECUTE ON FUNCTION get_audit_user_activity TO authenticated;
GRANT EXECUTE ON FUNCTION get_risk_distribution TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_risk_users TO authenticated;
GRANT EXECUTE ON FUNCTION get_risk_by_resource TO authenticated;
GRANT EXECUTE ON FUNCTION get_audit_summary_stats TO authenticated;
GRANT EXECUTE ON FUNCTION detect_unusual_access_patterns TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_user_risk_profiles TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION get_audit_time_series IS 'Generates time series data for audit events with configurable bucketing';
COMMENT ON FUNCTION get_audit_event_distribution IS 'Returns event type distribution with percentages';
COMMENT ON FUNCTION get_audit_resource_activity IS 'Analyzes activity patterns by resource type and action';
COMMENT ON FUNCTION get_audit_user_activity IS 'Provides comprehensive user activity analysis';
COMMENT ON FUNCTION get_risk_distribution IS 'Analyzes risk score distribution across events';
COMMENT ON FUNCTION get_top_risk_users IS 'Identifies users with highest risk profiles';
COMMENT ON FUNCTION get_risk_by_resource IS 'Analyzes risk patterns by resource type';
COMMENT ON FUNCTION get_audit_summary_stats IS 'Provides summary statistics for audit data';
COMMENT ON FUNCTION detect_unusual_access_patterns IS 'Detects suspicious access patterns and anomalies';
COMMENT ON FUNCTION calculate_user_risk_profiles IS 'Calculates comprehensive risk profiles for users';