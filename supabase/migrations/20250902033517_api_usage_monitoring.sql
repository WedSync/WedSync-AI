-- API Usage Monitoring & Management System
-- WS-233: Comprehensive API tracking, rate limiting, and analytics

-- API Usage Logs: Track every API call
CREATE TABLE api_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER NOT NULL,
    request_size_bytes INTEGER DEFAULT 0,
    response_size_bytes INTEGER DEFAULT 0,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    rate_limited BOOLEAN DEFAULT FALSE,
    subscription_tier TEXT,
    api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL
);

-- API Keys: For external integrations and tracking
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_hash TEXT UNIQUE NOT NULL,
    key_prefix TEXT NOT NULL, -- Show first 8 characters for identification
    permissions JSONB DEFAULT '[]'::jsonb, -- Array of allowed endpoints/permissions
    rate_limit_per_minute INTEGER DEFAULT 60,
    rate_limit_per_hour INTEGER DEFAULT 1000,
    rate_limit_per_day INTEGER DEFAULT 10000,
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Usage Summary: Aggregated usage data for billing and analytics
CREATE TABLE api_usage_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_requests INTEGER DEFAULT 0,
    unique_endpoints INTEGER DEFAULT 0,
    total_response_time_ms BIGINT DEFAULT 0,
    total_request_size_bytes BIGINT DEFAULT 0,
    total_response_size_bytes BIGINT DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    rate_limited_count INTEGER DEFAULT 0,
    subscription_tier TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, date)
);

-- Rate Limit Tracking: Track current usage for rate limiting
CREATE TABLE rate_limit_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
    window_start TIMESTAMPTZ NOT NULL,
    window_type TEXT NOT NULL CHECK (window_type IN ('minute', 'hour', 'day')),
    request_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, api_key_id, window_start, window_type)
);

-- API Usage Alerts: Configure alerts for usage thresholds
CREATE TABLE api_usage_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('usage_threshold', 'rate_limit', 'unusual_activity', 'quota_exceeded')),
    threshold_value INTEGER NOT NULL,
    threshold_period TEXT NOT NULL CHECK (threshold_period IN ('hour', 'day', 'month')),
    notification_channels JSONB DEFAULT '[]'::jsonb, -- email, webhook, etc.
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Usage Quotas: Define usage limits per subscription tier
CREATE TABLE api_usage_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_tier TEXT NOT NULL,
    quota_type TEXT NOT NULL CHECK (quota_type IN ('requests_per_minute', 'requests_per_hour', 'requests_per_day', 'requests_per_month')),
    limit_value INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(subscription_tier, quota_type)
);

-- Insert default quotas for each subscription tier
INSERT INTO api_usage_quotas (subscription_tier, quota_type, limit_value) VALUES
-- FREE tier (very limited after trial)
('free', 'requests_per_minute', 10),
('free', 'requests_per_hour', 100),
('free', 'requests_per_day', 1000),
('free', 'requests_per_month', 10000),

-- STARTER tier
('starter', 'requests_per_minute', 30),
('starter', 'requests_per_hour', 500),
('starter', 'requests_per_day', 5000),
('starter', 'requests_per_month', 100000),

-- PROFESSIONAL tier
('professional', 'requests_per_minute', 100),
('professional', 'requests_per_hour', 2000),
('professional', 'requests_per_day', 20000),
('professional', 'requests_per_month', 500000),

-- SCALE tier
('scale', 'requests_per_minute', 200),
('scale', 'requests_per_hour', 5000),
('scale', 'requests_per_day', 50000),
('scale', 'requests_per_month', 1000000),

-- ENTERPRISE tier (highest limits)
('enterprise', 'requests_per_minute', 500),
('enterprise', 'requests_per_hour', 10000),
('enterprise', 'requests_per_day', 100000),
('enterprise', 'requests_per_month', 2000000);

-- Create indexes for performance
CREATE INDEX idx_api_usage_logs_org_timestamp ON api_usage_logs(organization_id, timestamp DESC);
CREATE INDEX idx_api_usage_logs_endpoint ON api_usage_logs(endpoint);
CREATE INDEX idx_api_usage_logs_status ON api_usage_logs(status_code);
CREATE INDEX idx_api_usage_logs_timestamp ON api_usage_logs(timestamp);
CREATE INDEX idx_api_keys_org ON api_keys(organization_id);
CREATE INDEX idx_api_keys_active ON api_keys(is_active);
CREATE INDEX idx_api_usage_summary_org_date ON api_usage_summary(organization_id, date DESC);
CREATE INDEX idx_rate_limit_tracking_org_window ON rate_limit_tracking(organization_id, window_start, window_type);
CREATE INDEX idx_api_usage_alerts_org ON api_usage_alerts(organization_id);

-- Row Level Security Policies

-- API Usage Logs: Only organization members can view their logs
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their organization's API usage logs" ON api_usage_logs
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- API Keys: Only organization members can manage their API keys
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their organization's API keys" ON api_keys
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- API Usage Summary: Only organization members can view their usage summary
ALTER TABLE api_usage_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their organization's usage summary" ON api_usage_summary
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Rate Limit Tracking: Only organization members can view their rate limits
ALTER TABLE rate_limit_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their organization's rate limits" ON rate_limit_tracking
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- API Usage Alerts: Only organization members can manage their alerts
ALTER TABLE api_usage_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their organization's usage alerts" ON api_usage_alerts
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- API Usage Quotas: Everyone can read quotas, only admins can modify
ALTER TABLE api_usage_quotas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view API usage quotas" ON api_usage_quotas
    FOR SELECT USING (TRUE);

-- Function to get current subscription tier for an organization
CREATE OR REPLACE FUNCTION get_organization_subscription_tier(org_id UUID)
RETURNS TEXT AS $$
DECLARE
    tier TEXT;
BEGIN
    SELECT COALESCE(subscription_tier, 'free') INTO tier
    FROM organizations
    WHERE id = org_id;
    
    RETURN COALESCE(tier, 'free');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if organization has exceeded rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(org_id UUID, api_key_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    tier TEXT;
    minute_limit INTEGER;
    hour_limit INTEGER;
    day_limit INTEGER;
    current_minute_count INTEGER;
    current_hour_count INTEGER;
    current_day_count INTEGER;
BEGIN
    -- Get subscription tier
    tier := get_organization_subscription_tier(org_id);
    
    -- Get limits for this tier
    SELECT limit_value INTO minute_limit FROM api_usage_quotas 
    WHERE subscription_tier = tier AND quota_type = 'requests_per_minute';
    
    SELECT limit_value INTO hour_limit FROM api_usage_quotas 
    WHERE subscription_tier = tier AND quota_type = 'requests_per_hour';
    
    SELECT limit_value INTO day_limit FROM api_usage_quotas 
    WHERE subscription_tier = tier AND quota_type = 'requests_per_day';
    
    -- Count current usage
    SELECT COALESCE(SUM(request_count), 0) INTO current_minute_count
    FROM rate_limit_tracking
    WHERE organization_id = org_id 
    AND window_type = 'minute'
    AND window_start >= NOW() - INTERVAL '1 minute';
    
    SELECT COALESCE(SUM(request_count), 0) INTO current_hour_count
    FROM rate_limit_tracking
    WHERE organization_id = org_id 
    AND window_type = 'hour'
    AND window_start >= NOW() - INTERVAL '1 hour';
    
    SELECT COALESCE(SUM(request_count), 0) INTO current_day_count
    FROM rate_limit_tracking
    WHERE organization_id = org_id 
    AND window_type = 'day'
    AND window_start >= NOW() - INTERVAL '1 day';
    
    -- Check if any limits are exceeded
    IF current_minute_count >= minute_limit OR 
       current_hour_count >= hour_limit OR 
       current_day_count >= day_limit THEN
        RETURN FALSE; -- Rate limited
    END IF;
    
    RETURN TRUE; -- Not rate limited
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log API usage
CREATE OR REPLACE FUNCTION log_api_usage(
    org_id UUID,
    user_id UUID,
    endpoint TEXT,
    method TEXT,
    status_code INTEGER,
    response_time_ms INTEGER,
    request_size_bytes INTEGER DEFAULT 0,
    response_size_bytes INTEGER DEFAULT 0,
    ip_address INET DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    api_key_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
    tier TEXT;
    is_rate_limited BOOLEAN;
BEGIN
    -- Get subscription tier
    tier := get_organization_subscription_tier(org_id);
    
    -- Check rate limiting
    is_rate_limited := NOT check_rate_limit(org_id, api_key_id);
    
    -- Insert usage log
    INSERT INTO api_usage_logs (
        organization_id, user_id, endpoint, method, status_code,
        response_time_ms, request_size_bytes, response_size_bytes,
        ip_address, user_agent, rate_limited, subscription_tier, api_key_id
    ) VALUES (
        org_id, user_id, endpoint, method, status_code,
        response_time_ms, request_size_bytes, response_size_bytes,
        ip_address, user_agent, is_rate_limited, tier, api_key_id
    ) RETURNING id INTO log_id;
    
    -- Update rate limit tracking
    INSERT INTO rate_limit_tracking (organization_id, api_key_id, window_start, window_type, request_count)
    VALUES 
        (org_id, api_key_id, date_trunc('minute', NOW()), 'minute', 1),
        (org_id, api_key_id, date_trunc('hour', NOW()), 'hour', 1),
        (org_id, api_key_id, date_trunc('day', NOW()), 'day', 1)
    ON CONFLICT (organization_id, api_key_id, window_start, window_type)
    DO UPDATE SET 
        request_count = rate_limit_tracking.request_count + 1,
        updated_at = NOW();
    
    -- Update daily summary
    INSERT INTO api_usage_summary (organization_id, date, total_requests, total_response_time_ms, 
                                 total_request_size_bytes, total_response_size_bytes, 
                                 error_count, rate_limited_count, subscription_tier)
    VALUES (org_id, CURRENT_DATE, 1, response_time_ms, request_size_bytes, response_size_bytes,
            CASE WHEN status_code >= 400 THEN 1 ELSE 0 END,
            CASE WHEN is_rate_limited THEN 1 ELSE 0 END,
            tier)
    ON CONFLICT (organization_id, date)
    DO UPDATE SET 
        total_requests = api_usage_summary.total_requests + 1,
        total_response_time_ms = api_usage_summary.total_response_time_ms + response_time_ms,
        total_request_size_bytes = api_usage_summary.total_request_size_bytes + request_size_bytes,
        total_response_size_bytes = api_usage_summary.total_response_size_bytes + response_size_bytes,
        error_count = api_usage_summary.error_count + CASE WHEN status_code >= 400 THEN 1 ELSE 0 END,
        rate_limited_count = api_usage_summary.rate_limited_count + CASE WHEN is_rate_limited THEN 1 ELSE 0 END,
        updated_at = NOW();
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a cleanup job for old logs (keep 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_api_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM api_usage_logs 
    WHERE timestamp < NOW() - INTERVAL '90 days';
    
    DELETE FROM rate_limit_tracking 
    WHERE window_start < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;