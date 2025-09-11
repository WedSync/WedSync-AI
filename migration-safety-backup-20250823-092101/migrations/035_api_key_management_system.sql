-- 035_api_key_management_system.sql
-- Complete API Key Management System for Third-Party Integrations
-- WS-072: Platform Integration with Secure API Key Management

-- Drop existing tables if they exist
DROP TABLE IF EXISTS api_key_usage CASCADE;
DROP TABLE IF EXISTS api_key_scopes CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS api_scopes CASCADE;
DROP TABLE IF EXISTS api_rate_limits CASCADE;
DROP TABLE IF EXISTS api_integration_logs CASCADE;

-- Create API scopes table (defines available permissions)
CREATE TABLE api_scopes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    scope VARCHAR(100) UNIQUE NOT NULL,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create API keys table
CREATE TABLE api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(10) NOT NULL, -- First 10 chars for identification
    key_hash TEXT NOT NULL, -- Hashed API key
    description TEXT,
    integration_type VARCHAR(100), -- e.g., 'zapier', 'hubspot', 'custom'
    last_used_at TIMESTAMPTZ,
    last_used_ip INET,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    rate_limit_per_minute INTEGER DEFAULT 60,
    rate_limit_per_hour INTEGER DEFAULT 1000,
    rate_limit_per_day INTEGER DEFAULT 10000,
    allowed_ips INET[], -- IP whitelist (optional)
    allowed_origins TEXT[], -- CORS origins (optional)
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    revoked_reason TEXT,
    
    CONSTRAINT unique_user_name UNIQUE(user_id, name)
);

-- Create API key scopes junction table
CREATE TABLE api_key_scopes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    scope_id UUID NOT NULL REFERENCES api_scopes(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    granted_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT unique_key_scope UNIQUE(api_key_id, scope_id)
);

-- Create API key usage tracking table
CREATE TABLE api_key_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    ip_address INET,
    user_agent TEXT,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create rate limiting table
CREATE TABLE api_rate_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    window_type VARCHAR(20) NOT NULL, -- 'minute', 'hour', 'day'
    window_start TIMESTAMPTZ NOT NULL,
    request_count INTEGER DEFAULT 0,
    last_request_at TIMESTAMPTZ,
    
    CONSTRAINT unique_key_window UNIQUE(api_key_id, window_type, window_start)
);

-- Create integration logs table for monitoring
CREATE TABLE api_integration_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    integration_type VARCHAR(100),
    event_type VARCHAR(100), -- 'webhook_sent', 'data_synced', 'error', etc.
    event_status VARCHAR(50), -- 'success', 'failed', 'pending'
    event_data JSONB DEFAULT '{}',
    error_details TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default API scopes
INSERT INTO api_scopes (scope, resource, action, description) VALUES
    -- Client scopes
    ('read:clients', 'clients', 'read', 'Read client information'),
    ('write:clients', 'clients', 'write', 'Create and update clients'),
    ('delete:clients', 'clients', 'delete', 'Delete clients'),
    
    -- Form scopes
    ('read:forms', 'forms', 'read', 'Read form responses'),
    ('write:forms', 'forms', 'write', 'Submit form responses'),
    
    -- Journey scopes
    ('read:journeys', 'journeys', 'read', 'Read journey data'),
    ('write:journeys', 'journeys', 'write', 'Update journey progress'),
    
    -- Vendor scopes
    ('read:vendors', 'vendors', 'read', 'Read vendor information'),
    ('write:vendors', 'vendors', 'write', 'Update vendor information'),
    
    -- Guest scopes
    ('read:guests', 'guests', 'read', 'Read guest lists'),
    ('write:guests', 'guests', 'write', 'Update guest information'),
    
    -- RSVP scopes
    ('read:rsvps', 'rsvps', 'read', 'Read RSVP responses'),
    ('write:rsvps', 'rsvps', 'write', 'Submit RSVP responses'),
    
    -- Analytics scopes
    ('read:analytics', 'analytics', 'read', 'Read analytics data'),
    
    -- Webhook scopes
    ('manage:webhooks', 'webhooks', 'manage', 'Manage webhook configurations'),
    
    -- Admin scopes
    ('admin:all', '*', '*', 'Full administrative access');

-- Create indexes for performance
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX idx_api_keys_expires_at ON api_keys(expires_at);
CREATE INDEX idx_api_key_usage_api_key_id ON api_key_usage(api_key_id);
CREATE INDEX idx_api_key_usage_created_at ON api_key_usage(created_at);
CREATE INDEX idx_api_rate_limits_lookup ON api_rate_limits(api_key_id, window_type, window_start);
CREATE INDEX idx_api_integration_logs_api_key_id ON api_integration_logs(api_key_id);
CREATE INDEX idx_api_integration_logs_created_at ON api_integration_logs(created_at);

-- Create function to check API key rate limits
CREATE OR REPLACE FUNCTION check_api_rate_limit(
    p_api_key_id UUID,
    p_current_time TIMESTAMPTZ DEFAULT NOW()
) RETURNS TABLE(
    minute_limit_ok BOOLEAN,
    hour_limit_ok BOOLEAN,
    day_limit_ok BOOLEAN,
    minute_remaining INTEGER,
    hour_remaining INTEGER,
    day_remaining INTEGER
) AS $$
DECLARE
    v_key_record RECORD;
    v_minute_count INTEGER;
    v_hour_count INTEGER;
    v_day_count INTEGER;
BEGIN
    -- Get API key limits
    SELECT * INTO v_key_record FROM api_keys WHERE id = p_api_key_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, false, false, 0, 0, 0;
        RETURN;
    END IF;
    
    -- Count requests in last minute
    SELECT COALESCE(SUM(request_count), 0) INTO v_minute_count
    FROM api_rate_limits
    WHERE api_key_id = p_api_key_id
        AND window_type = 'minute'
        AND window_start >= p_current_time - INTERVAL '1 minute';
    
    -- Count requests in last hour
    SELECT COALESCE(SUM(request_count), 0) INTO v_hour_count
    FROM api_rate_limits
    WHERE api_key_id = p_api_key_id
        AND window_type = 'hour'
        AND window_start >= p_current_time - INTERVAL '1 hour';
    
    -- Count requests in last day
    SELECT COALESCE(SUM(request_count), 0) INTO v_day_count
    FROM api_rate_limits
    WHERE api_key_id = p_api_key_id
        AND window_type = 'day'
        AND window_start >= p_current_time - INTERVAL '1 day';
    
    RETURN QUERY SELECT
        v_minute_count < v_key_record.rate_limit_per_minute,
        v_hour_count < v_key_record.rate_limit_per_hour,
        v_day_count < v_key_record.rate_limit_per_day,
        GREATEST(0, v_key_record.rate_limit_per_minute - v_minute_count),
        GREATEST(0, v_key_record.rate_limit_per_hour - v_hour_count),
        GREATEST(0, v_key_record.rate_limit_per_day - v_day_count);
END;
$$ LANGUAGE plpgsql;

-- Create function to increment rate limit counters
CREATE OR REPLACE FUNCTION increment_api_rate_limit(
    p_api_key_id UUID,
    p_current_time TIMESTAMPTZ DEFAULT NOW()
) RETURNS VOID AS $$
BEGIN
    -- Update minute window
    INSERT INTO api_rate_limits (api_key_id, window_type, window_start, request_count, last_request_at)
    VALUES (
        p_api_key_id,
        'minute',
        date_trunc('minute', p_current_time),
        1,
        p_current_time
    )
    ON CONFLICT (api_key_id, window_type, window_start)
    DO UPDATE SET
        request_count = api_rate_limits.request_count + 1,
        last_request_at = p_current_time;
    
    -- Update hour window
    INSERT INTO api_rate_limits (api_key_id, window_type, window_start, request_count, last_request_at)
    VALUES (
        p_api_key_id,
        'hour',
        date_trunc('hour', p_current_time),
        1,
        p_current_time
    )
    ON CONFLICT (api_key_id, window_type, window_start)
    DO UPDATE SET
        request_count = api_rate_limits.request_count + 1,
        last_request_at = p_current_time;
    
    -- Update day window
    INSERT INTO api_rate_limits (api_key_id, window_type, window_start, request_count, last_request_at)
    VALUES (
        p_api_key_id,
        'day',
        date_trunc('day', p_current_time),
        1,
        p_current_time
    )
    ON CONFLICT (api_key_id, window_type, window_start)
    DO UPDATE SET
        request_count = api_rate_limits.request_count + 1,
        last_request_at = p_current_time;
    
    -- Update last used timestamp on API key
    UPDATE api_keys
    SET last_used_at = p_current_time
    WHERE id = p_api_key_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to get API key analytics
CREATE OR REPLACE FUNCTION get_api_key_analytics(
    p_api_key_id UUID,
    p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    p_end_date TIMESTAMPTZ DEFAULT NOW()
) RETURNS TABLE(
    total_requests BIGINT,
    successful_requests BIGINT,
    failed_requests BIGINT,
    avg_response_time_ms NUMERIC,
    total_data_transferred_mb NUMERIC,
    unique_endpoints BIGINT,
    most_used_endpoint TEXT,
    error_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH usage_stats AS (
        SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status_code BETWEEN 200 AND 299) AS successful,
            COUNT(*) FILTER (WHERE status_code >= 400) AS failed,
            AVG(response_time_ms) AS avg_response_time,
            SUM(request_size_bytes + COALESCE(response_size_bytes, 0)) / 1048576.0 AS data_mb,
            COUNT(DISTINCT endpoint) AS unique_endpoints
        FROM api_key_usage
        WHERE api_key_id = p_api_key_id
            AND created_at BETWEEN p_start_date AND p_end_date
    ),
    top_endpoint AS (
        SELECT endpoint
        FROM api_key_usage
        WHERE api_key_id = p_api_key_id
            AND created_at BETWEEN p_start_date AND p_end_date
        GROUP BY endpoint
        ORDER BY COUNT(*) DESC
        LIMIT 1
    )
    SELECT
        usage_stats.total,
        usage_stats.successful,
        usage_stats.failed,
        ROUND(usage_stats.avg_response_time, 2),
        ROUND(usage_stats.data_mb, 2),
        usage_stats.unique_endpoints,
        top_endpoint.endpoint,
        CASE 
            WHEN usage_stats.total > 0 
            THEN ROUND((usage_stats.failed::NUMERIC / usage_stats.total) * 100, 2)
            ELSE 0
        END AS error_rate
    FROM usage_stats
    CROSS JOIN top_endpoint;
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_integration_logs ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own API keys
CREATE POLICY "Users can view own API keys"
    ON api_keys FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own API keys"
    ON api_keys FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys"
    ON api_keys FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys"
    ON api_keys FOR DELETE
    USING (auth.uid() = user_id);

-- Users can view scopes for their API keys
CREATE POLICY "Users can view own API key scopes"
    ON api_key_scopes FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM api_keys
        WHERE api_keys.id = api_key_scopes.api_key_id
        AND api_keys.user_id = auth.uid()
    ));

-- Users can view usage for their API keys
CREATE POLICY "Users can view own API key usage"
    ON api_key_usage FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM api_keys
        WHERE api_keys.id = api_key_usage.api_key_id
        AND api_keys.user_id = auth.uid()
    ));

-- Users can view rate limits for their API keys
CREATE POLICY "Users can view own API rate limits"
    ON api_rate_limits FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM api_keys
        WHERE api_keys.id = api_rate_limits.api_key_id
        AND api_keys.user_id = auth.uid()
    ));

-- Users can view integration logs for their API keys
CREATE POLICY "Users can view own integration logs"
    ON api_integration_logs FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM api_keys
        WHERE api_keys.id = api_integration_logs.api_key_id
        AND api_keys.user_id = auth.uid()
    ));

-- Create cleanup function for old data
CREATE OR REPLACE FUNCTION cleanup_old_api_data()
RETURNS VOID AS $$
BEGIN
    -- Delete usage data older than 90 days
    DELETE FROM api_key_usage
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Delete rate limit data older than 7 days
    DELETE FROM api_rate_limits
    WHERE window_start < NOW() - INTERVAL '7 days';
    
    -- Delete integration logs older than 30 days
    DELETE FROM api_integration_logs
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres;

-- Add comments for documentation
COMMENT ON TABLE api_keys IS 'Stores API keys for third-party integrations';
COMMENT ON TABLE api_scopes IS 'Defines available API permission scopes';
COMMENT ON TABLE api_key_scopes IS 'Maps API keys to their granted scopes';
COMMENT ON TABLE api_key_usage IS 'Tracks API key usage for analytics';
COMMENT ON TABLE api_rate_limits IS 'Manages rate limiting per API key';
COMMENT ON TABLE api_integration_logs IS 'Logs integration events for monitoring';