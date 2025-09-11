-- ============================================================================
-- WS-233: API Usage Monitoring & Management System
-- Migration: API monitoring tables and functions
-- Created: 2025-02-02
-- Team: Team D
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- API KEYS TABLE
-- Stores API key configurations and metadata
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    supplier_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    scopes TEXT[] DEFAULT '{}',
    rate_limit_tier TEXT NOT NULL DEFAULT 'free' CHECK (rate_limit_tier IN ('free', 'basic', 'premium', 'enterprise')),
    max_requests_per_hour INTEGER NOT NULL DEFAULT 100,
    max_requests_per_day INTEGER NOT NULL DEFAULT 1000,
    allowed_ips TEXT[] DEFAULT NULL,
    allowed_domains TEXT[] DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NULL,
    request_count BIGINT DEFAULT 0,
    
    -- Constraints
    CONSTRAINT valid_rate_limits CHECK (
        max_requests_per_hour > 0 AND 
        max_requests_per_day > 0 AND 
        max_requests_per_day >= max_requests_per_hour
    )
);

-- Indexes for api_keys
CREATE INDEX idx_api_keys_supplier_id ON api_keys(supplier_id);
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_active ON api_keys(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_api_keys_expires_at ON api_keys(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_api_keys_last_used ON api_keys(last_used_at);

-- ============================================================================
-- API USAGE METRICS TABLE
-- Stores detailed metrics for every API request
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_usage_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS')),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    subscription_tier TEXT NOT NULL DEFAULT 'free',
    response_time_ms INTEGER NOT NULL CHECK (response_time_ms >= 0),
    status_code INTEGER NOT NULL CHECK (status_code >= 100 AND status_code < 600),
    request_size_bytes INTEGER DEFAULT 0 CHECK (request_size_bytes >= 0),
    response_size_bytes INTEGER DEFAULT 0 CHECK (response_size_bytes >= 0),
    ip_address INET,
    user_agent TEXT,
    referer TEXT,
    api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    error_type TEXT,
    error_message TEXT,
    rate_limited BOOLEAN DEFAULT FALSE,
    cache_hit BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for api_usage_metrics (optimized for analytics queries)
CREATE INDEX idx_api_usage_metrics_timestamp ON api_usage_metrics(timestamp DESC);
CREATE INDEX idx_api_usage_metrics_endpoint ON api_usage_metrics(endpoint);
CREATE INDEX idx_api_usage_metrics_supplier_id ON api_usage_metrics(supplier_id);
CREATE INDEX idx_api_usage_metrics_user_id ON api_usage_metrics(user_id);
CREATE INDEX idx_api_usage_metrics_api_key_id ON api_usage_metrics(api_key_id);
CREATE INDEX idx_api_usage_metrics_status_code ON api_usage_metrics(status_code);
CREATE INDEX idx_api_usage_metrics_rate_limited ON api_usage_metrics(rate_limited) WHERE rate_limited = TRUE;
CREATE INDEX idx_api_usage_metrics_subscription_tier ON api_usage_metrics(subscription_tier);

-- Composite indexes for common query patterns
CREATE INDEX idx_api_usage_metrics_supplier_timestamp ON api_usage_metrics(supplier_id, timestamp DESC);
CREATE INDEX idx_api_usage_metrics_endpoint_timestamp ON api_usage_metrics(endpoint, timestamp DESC);
CREATE INDEX idx_api_usage_metrics_tier_timestamp ON api_usage_metrics(subscription_tier, timestamp DESC);

-- ============================================================================
-- API USAGE ALERTS TABLE
-- Stores alerts for unusual API usage patterns
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_usage_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL CHECK (type IN ('rate_limit_exceeded', 'unusual_activity', 'error_spike', 'performance_degradation', 'quota_warning')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    message TEXT NOT NULL,
    supplier_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT,
    threshold NUMERIC NOT NULL,
    actual_value NUMERIC NOT NULL,
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_acknowledged_fields CHECK (
        (acknowledged = FALSE) OR 
        (acknowledged = TRUE AND acknowledged_by IS NOT NULL AND acknowledged_at IS NOT NULL)
    )
);

-- Indexes for api_usage_alerts
CREATE INDEX idx_api_usage_alerts_supplier_id ON api_usage_alerts(supplier_id);
CREATE INDEX idx_api_usage_alerts_user_id ON api_usage_alerts(user_id);
CREATE INDEX idx_api_usage_alerts_type ON api_usage_alerts(type);
CREATE INDEX idx_api_usage_alerts_severity ON api_usage_alerts(severity);
CREATE INDEX idx_api_usage_alerts_unacknowledged ON api_usage_alerts(acknowledged) WHERE acknowledged = FALSE;
CREATE INDEX idx_api_usage_alerts_triggered_at ON api_usage_alerts(triggered_at DESC);

-- ============================================================================
-- API KEY EVENTS TABLE
-- Audit log for API key operations
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_key_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('created', 'rotated', 'deactivated', 'accessed', 'rate_limited')),
    supplier_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for api_key_events
CREATE INDEX idx_api_key_events_api_key_id ON api_key_events(api_key_id);
CREATE INDEX idx_api_key_events_event_type ON api_key_events(event_type);
CREATE INDEX idx_api_key_events_created_at ON api_key_events(created_at DESC);
CREATE INDEX idx_api_key_events_supplier_id ON api_key_events(supplier_id);

-- ============================================================================
-- RATE LIMIT BUCKETS TABLE  
-- Enhanced version of existing rate limiting with better tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS rate_limit_buckets_enhanced (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier TEXT NOT NULL,
    endpoint_pattern TEXT NOT NULL,
    requests_count INTEGER NOT NULL DEFAULT 0,
    window_start TIMESTAMPTZ NOT NULL,
    window_duration_seconds INTEGER NOT NULL,
    max_requests INTEGER NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
    subscription_tier TEXT NOT NULL DEFAULT 'free',
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicate buckets
    UNIQUE(identifier, endpoint_pattern, window_start)
);

-- Indexes for rate_limit_buckets_enhanced
CREATE INDEX idx_rate_limit_buckets_enhanced_identifier ON rate_limit_buckets_enhanced(identifier);
CREATE INDEX idx_rate_limit_buckets_enhanced_window_start ON rate_limit_buckets_enhanced(window_start);
CREATE INDEX idx_rate_limit_buckets_enhanced_supplier_id ON rate_limit_buckets_enhanced(supplier_id);
CREATE INDEX idx_rate_limit_buckets_enhanced_api_key_id ON rate_limit_buckets_enhanced(api_key_id);

-- ============================================================================
-- API ANALYTICS SUMMARY TABLES
-- Pre-aggregated data for faster dashboard queries
-- ============================================================================

-- Hourly analytics summary
CREATE TABLE IF NOT EXISTS api_analytics_hourly (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hour_start TIMESTAMPTZ NOT NULL,
    supplier_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    endpoint TEXT,
    subscription_tier TEXT,
    total_requests INTEGER NOT NULL DEFAULT 0,
    successful_requests INTEGER NOT NULL DEFAULT 0,
    failed_requests INTEGER NOT NULL DEFAULT 0,
    rate_limited_requests INTEGER NOT NULL DEFAULT 0,
    avg_response_time_ms NUMERIC(10,2) DEFAULT 0,
    p95_response_time_ms INTEGER DEFAULT 0,
    total_request_bytes BIGINT DEFAULT 0,
    total_response_bytes BIGINT DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    unique_ips INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one record per hour/supplier/endpoint/tier combination
    UNIQUE(hour_start, supplier_id, endpoint, subscription_tier)
);

-- Indexes for api_analytics_hourly
CREATE INDEX idx_api_analytics_hourly_hour_start ON api_analytics_hourly(hour_start DESC);
CREATE INDEX idx_api_analytics_hourly_supplier_id ON api_analytics_hourly(supplier_id);
CREATE INDEX idx_api_analytics_hourly_endpoint ON api_analytics_hourly(endpoint);
CREATE INDEX idx_api_analytics_hourly_tier ON api_analytics_hourly(subscription_tier);

-- Daily analytics summary  
CREATE TABLE IF NOT EXISTS api_analytics_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    supplier_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    endpoint TEXT,
    subscription_tier TEXT,
    total_requests INTEGER NOT NULL DEFAULT 0,
    successful_requests INTEGER NOT NULL DEFAULT 0,
    failed_requests INTEGER NOT NULL DEFAULT 0,
    rate_limited_requests INTEGER NOT NULL DEFAULT 0,
    avg_response_time_ms NUMERIC(10,2) DEFAULT 0,
    p95_response_time_ms INTEGER DEFAULT 0,
    total_request_bytes BIGINT DEFAULT 0,
    total_response_bytes BIGINT DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    unique_ips INTEGER DEFAULT 0,
    peak_hour INTEGER, -- Hour of day with most requests (0-23)
    peak_requests INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one record per date/supplier/endpoint/tier combination
    UNIQUE(date, supplier_id, endpoint, subscription_tier)
);

-- Indexes for api_analytics_daily
CREATE INDEX idx_api_analytics_daily_date ON api_analytics_daily(date DESC);
CREATE INDEX idx_api_analytics_daily_supplier_id ON api_analytics_daily(supplier_id);
CREATE INDEX idx_api_analytics_daily_endpoint ON api_analytics_daily(endpoint);
CREATE INDEX idx_api_analytics_daily_tier ON api_analytics_daily(subscription_tier);

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to increment request count for API keys
CREATE OR REPLACE FUNCTION increment_request_count()
RETURNS INTEGER
LANGUAGE SQL
AS $$
    SELECT request_count + 1;
$$;

-- Function to get rate limit info for a user/API key
CREATE OR REPLACE FUNCTION get_rate_limit_status(
    p_identifier TEXT,
    p_endpoint TEXT,
    p_window_seconds INTEGER DEFAULT 3600
)
RETURNS TABLE(
    current_requests INTEGER,
    max_requests INTEGER,
    window_start TIMESTAMPTZ,
    remaining_requests INTEGER,
    reset_time TIMESTAMPTZ
) 
LANGUAGE SQL
STABLE
AS $$
    SELECT 
        COALESCE(requests_count, 0) as current_requests,
        COALESCE(max_requests, 100) as max_requests,
        COALESCE(window_start, date_trunc('hour', NOW())) as window_start,
        GREATEST(0, COALESCE(max_requests, 100) - COALESCE(requests_count, 0)) as remaining_requests,
        COALESCE(window_start, date_trunc('hour', NOW())) + INTERVAL '1 second' * p_window_seconds as reset_time
    FROM rate_limit_buckets_enhanced
    WHERE identifier = p_identifier 
      AND endpoint_pattern = p_endpoint
      AND window_start >= date_trunc('hour', NOW())
    LIMIT 1;
$$;

-- Function to clean up old API usage metrics (keep 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_api_metrics()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM api_usage_metrics 
    WHERE timestamp < (NOW() - INTERVAL '90 days');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;

-- Function to clean up old rate limit buckets (keep 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limit_buckets()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM rate_limit_buckets_enhanced 
    WHERE window_start < (NOW() - INTERVAL '7 days');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_buckets_enhanced ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_analytics_hourly ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_analytics_daily ENABLE ROW LEVEL SECURITY;

-- API Keys policies
CREATE POLICY "Users can view their own API keys" ON api_keys
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own API keys" ON api_keys
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own API keys" ON api_keys
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own API keys" ON api_keys
    FOR DELETE USING (user_id = auth.uid());

-- Service role can manage all API keys
CREATE POLICY "Service role can manage all API keys" ON api_keys
    FOR ALL USING (current_setting('role', true) = 'service_role');

-- API Usage Metrics policies
CREATE POLICY "Users can view their own usage metrics" ON api_usage_metrics
    FOR SELECT USING (user_id = auth.uid() OR supplier_id = auth.uid());

CREATE POLICY "Service role can manage all usage metrics" ON api_usage_metrics
    FOR ALL USING (current_setting('role', true) = 'service_role');

-- API Usage Alerts policies  
CREATE POLICY "Users can view their own alerts" ON api_usage_alerts
    FOR SELECT USING (user_id = auth.uid() OR supplier_id = auth.uid());

CREATE POLICY "Users can acknowledge their own alerts" ON api_usage_alerts
    FOR UPDATE USING (user_id = auth.uid() OR supplier_id = auth.uid());

CREATE POLICY "Service role can manage all alerts" ON api_usage_alerts
    FOR ALL USING (current_setting('role', true) = 'service_role');

-- API Key Events policies
CREATE POLICY "Users can view their own API key events" ON api_key_events
    FOR SELECT USING (user_id = auth.uid() OR supplier_id = auth.uid());

CREATE POLICY "Service role can manage all API key events" ON api_key_events
    FOR ALL USING (current_setting('role', true) = 'service_role');

-- Rate Limit Buckets policies
CREATE POLICY "Service role can manage rate limit buckets" ON rate_limit_buckets_enhanced
    FOR ALL USING (current_setting('role', true) = 'service_role');

-- Analytics tables policies
CREATE POLICY "Users can view their own analytics" ON api_analytics_hourly
    FOR SELECT USING (supplier_id = auth.uid());

CREATE POLICY "Service role can manage analytics" ON api_analytics_hourly
    FOR ALL USING (current_setting('role', true) = 'service_role');

CREATE POLICY "Users can view their own daily analytics" ON api_analytics_daily
    FOR SELECT USING (supplier_id = auth.uid());

CREATE POLICY "Service role can manage daily analytics" ON api_analytics_daily
    FOR ALL USING (current_setting('role', true) = 'service_role');

-- ============================================================================
-- TRIGGERS AND AUTOMATION
-- ============================================================================

-- Update updated_at timestamp on api_keys
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_api_keys_updated_at 
    BEFORE UPDATE ON api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rate_limit_buckets_enhanced_updated_at 
    BEFORE UPDATE ON rate_limit_buckets_enhanced
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_analytics_hourly_updated_at 
    BEFORE UPDATE ON api_analytics_hourly
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_analytics_daily_updated_at 
    BEFORE UPDATE ON api_analytics_daily
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA AND CONFIGURATION
-- ============================================================================

-- Insert default API scopes configuration
INSERT INTO system_config (key, value, description) VALUES
('api_scopes', '{
  "forms:read": "Read access to forms and form responses",
  "forms:write": "Create and modify forms",
  "guests:read": "Read access to guest information",
  "guests:write": "Create and modify guest information", 
  "suppliers:read": "Read access to supplier directory",
  "suppliers:write": "Modify supplier profiles",
  "analytics:read": "Access to analytics and reporting data",
  "webhooks:manage": "Create and manage webhook endpoints",
  "admin:all": "Full administrative access"
}', 'Available API scopes and their descriptions')
ON CONFLICT (key) DO NOTHING;

-- Insert default rate limit configurations
INSERT INTO system_config (key, value, description) VALUES
('rate_limit_tiers', '{
  "free": {
    "api": {"windowSeconds": 3600, "maxRequests": 100, "burstLimit": 10},
    "forms": {"windowSeconds": 3600, "maxRequests": 20, "burstLimit": 3},
    "ai": {"windowSeconds": 3600, "maxRequests": 10, "burstLimit": 2},
    "search": {"windowSeconds": 60, "maxRequests": 30, "burstLimit": 10}
  },
  "basic": {
    "api": {"windowSeconds": 3600, "maxRequests": 500, "burstLimit": 25},
    "forms": {"windowSeconds": 3600, "maxRequests": 100, "burstLimit": 10},
    "ai": {"windowSeconds": 3600, "maxRequests": 50, "burstLimit": 5},
    "search": {"windowSeconds": 60, "maxRequests": 100, "burstLimit": 20}
  },
  "premium": {
    "api": {"windowSeconds": 3600, "maxRequests": 2000, "burstLimit": 100},
    "forms": {"windowSeconds": 3600, "maxRequests": 500, "burstLimit": 25},
    "ai": {"windowSeconds": 3600, "maxRequests": 200, "burstLimit": 20},
    "search": {"windowSeconds": 60, "maxRequests": 300, "burstLimit": 50}
  },
  "enterprise": {
    "api": {"windowSeconds": 3600, "maxRequests": 10000, "burstLimit": 500},
    "forms": {"windowSeconds": 3600, "maxRequests": 2000, "burstLimit": 100},
    "ai": {"windowSeconds": 3600, "maxRequests": 1000, "burstLimit": 100},
    "search": {"windowSeconds": 60, "maxRequests": 1000, "burstLimit": 200}
  }
}', 'Rate limiting configuration by subscription tier')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE api_keys IS 'Stores API key configurations for external access to WedSync APIs';
COMMENT ON TABLE api_usage_metrics IS 'Detailed metrics for every API request for analytics and monitoring';
COMMENT ON TABLE api_usage_alerts IS 'Alerts for unusual API usage patterns or threshold violations';
COMMENT ON TABLE api_key_events IS 'Audit log for all API key related events and operations';
COMMENT ON TABLE rate_limit_buckets_enhanced IS 'Enhanced rate limiting tracking with detailed metadata';
COMMENT ON TABLE api_analytics_hourly IS 'Pre-aggregated hourly API usage statistics for dashboards';
COMMENT ON TABLE api_analytics_daily IS 'Pre-aggregated daily API usage statistics for reporting';

COMMENT ON FUNCTION cleanup_old_api_metrics() IS 'Cleanup function to remove API metrics older than 90 days';
COMMENT ON FUNCTION cleanup_old_rate_limit_buckets() IS 'Cleanup function to remove rate limit buckets older than 7 days';
COMMENT ON FUNCTION get_rate_limit_status(TEXT, TEXT, INTEGER) IS 'Get current rate limit status for an identifier and endpoint';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration completion
INSERT INTO system_config (key, value, description) VALUES
('migration_ws233_api_monitoring', '{"completed_at": "' || NOW()::text || '", "version": "1.0.0", "tables_created": 7, "functions_created": 3}', 'WS-233 API Monitoring System migration status')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Migration successful
SELECT 'WS-233 API Monitoring & Management System migration completed successfully' as status;