-- WS-233: API Usage Monitoring & Management System
-- Comprehensive API usage tracking, analytics, rate limiting, and health monitoring
-- Team B - Backend/Database Implementation
-- Date: 2025-01-20

-- =============================================
-- API USAGE TRACKING TABLES
-- =============================================

-- Main API usage logs (time-series optimized)
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Request Information
  endpoint VARCHAR(500) NOT NULL,
  http_method VARCHAR(10) NOT NULL CHECK (http_method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD')),
  request_id VARCHAR(100) UNIQUE NOT NULL, -- For correlation with logs
  
  -- Response Information
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER NOT NULL CHECK (response_time_ms >= 0),
  response_size_bytes INTEGER DEFAULT 0 CHECK (response_size_bytes >= 0),
  
  -- Usage Context
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  subscription_tier VARCHAR(20) NOT NULL DEFAULT 'FREE' 
    CHECK (subscription_tier IN ('FREE', 'STARTER', 'PROFESSIONAL', 'SCALE', 'ENTERPRISE')),
  
  -- Request Metadata (no sensitive data)
  user_agent TEXT,
  ip_address INET,
  referrer TEXT,
  country_code CHAR(2),
  
  -- Timing and Performance
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_received_at TIMESTAMPTZ NOT NULL,
  response_sent_at TIMESTAMPTZ NOT NULL,
  
  -- Error Information (if applicable)
  error_code VARCHAR(100),
  error_type VARCHAR(50),
  
  -- Analytics Flags
  is_successful BOOLEAN GENERATED ALWAYS AS (status_code < 400) STORED,
  is_rate_limited BOOLEAN DEFAULT FALSE,
  
  -- Indexes for performance
  CONSTRAINT valid_response_time CHECK (response_sent_at >= request_received_at)
);

-- Partition by month for performance
SELECT create_monthly_partitions('api_usage_logs', 'created_at', 12);

-- API quotas and limits by tier
CREATE TABLE IF NOT EXISTS api_quotas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_tier VARCHAR(20) NOT NULL UNIQUE
    CHECK (subscription_tier IN ('FREE', 'STARTER', 'PROFESSIONAL', 'SCALE', 'ENTERPRISE')),
  
  -- Quota Limits
  daily_quota INTEGER NOT NULL CHECK (daily_quota > 0),
  monthly_quota INTEGER NOT NULL CHECK (monthly_quota > 0),
  rate_limit_per_minute INTEGER NOT NULL CHECK (rate_limit_per_minute > 0),
  burst_limit INTEGER NOT NULL DEFAULT 10 CHECK (burst_limit > 0),
  
  -- Feature Limits
  max_concurrent_requests INTEGER NOT NULL DEFAULT 5 CHECK (max_concurrent_requests > 0),
  max_request_size_mb DECIMAL(5,2) NOT NULL DEFAULT 10.0 CHECK (max_request_size_mb > 0),
  max_response_size_mb DECIMAL(5,2) NOT NULL DEFAULT 50.0 CHECK (max_response_size_mb > 0),
  
  -- Advanced Features by Tier
  analytics_retention_days INTEGER NOT NULL DEFAULT 30 CHECK (analytics_retention_days > 0),
  webhook_support BOOLEAN NOT NULL DEFAULT FALSE,
  priority_support BOOLEAN NOT NULL DEFAULT FALSE,
  custom_rate_limits BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default quotas for each tier
INSERT INTO api_quotas (subscription_tier, daily_quota, monthly_quota, rate_limit_per_minute, burst_limit, max_concurrent_requests, analytics_retention_days, webhook_support, priority_support, custom_rate_limits) VALUES
  ('FREE', 100, 2000, 5, 5, 2, 7, FALSE, FALSE, FALSE),
  ('STARTER', 1000, 25000, 20, 10, 3, 30, FALSE, FALSE, FALSE),
  ('PROFESSIONAL', 10000, 250000, 50, 20, 5, 90, TRUE, FALSE, FALSE),
  ('SCALE', 50000, 1000000, 100, 50, 10, 180, TRUE, TRUE, TRUE),
  ('ENTERPRISE', -1, -1, -1, 100, 20, 365, TRUE, TRUE, TRUE); -- -1 means unlimited

-- Real-time rate limiting counters (Redis-backed)
CREATE TABLE IF NOT EXISTS api_rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Rate Limiting Keys
  rate_limit_key VARCHAR(200) NOT NULL, -- format: "org:{id}:endpoint:{endpoint}:minute:{timestamp}"
  endpoint VARCHAR(500) NOT NULL,
  time_window TIMESTAMPTZ NOT NULL,
  window_size_seconds INTEGER NOT NULL DEFAULT 60,
  
  -- Counters
  request_count INTEGER NOT NULL DEFAULT 0,
  successful_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  rate_limited_count INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
  
  -- Unique constraint for time windows
  UNIQUE(organization_id, endpoint, time_window)
);

-- =============================================
-- API ANALYTICS AND HEALTH MONITORING
-- =============================================

-- API health metrics and performance monitoring
CREATE TABLE IF NOT EXISTS api_health_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Time-series data
  metric_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  collection_interval_minutes INTEGER NOT NULL DEFAULT 5,
  
  -- System-wide Metrics
  total_requests_per_minute INTEGER NOT NULL DEFAULT 0,
  average_response_time_ms DECIMAL(8,2) NOT NULL DEFAULT 0,
  p95_response_time_ms DECIMAL(8,2) NOT NULL DEFAULT 0,
  p99_response_time_ms DECIMAL(8,2) NOT NULL DEFAULT 0,
  error_rate_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  
  -- Resource Utilization
  cpu_usage_percentage DECIMAL(5,2) DEFAULT 0,
  memory_usage_percentage DECIMAL(5,2) DEFAULT 0,
  database_connection_pool_usage DECIMAL(5,2) DEFAULT 0,
  redis_memory_usage_percentage DECIMAL(5,2) DEFAULT 0,
  
  -- Endpoint-specific Metrics
  top_endpoints JSONB DEFAULT '[]', -- Array of {endpoint, count, avg_time}
  slow_endpoints JSONB DEFAULT '[]', -- Array of {endpoint, p99_time}
  error_endpoints JSONB DEFAULT '[]', -- Array of {endpoint, error_count, error_rate}
  
  -- Anomaly Detection Flags
  is_anomaly BOOLEAN DEFAULT FALSE,
  anomaly_type VARCHAR(100), -- 'traffic_spike', 'high_latency', 'error_spike', 'resource_exhaustion'
  anomaly_severity VARCHAR(20) CHECK (anomaly_severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  
  -- Alert Status
  alerts_triggered INTEGER DEFAULT 0,
  alert_recipients TEXT[], -- Array of email addresses or Slack channels
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Usage analytics aggregated by organization and time period
CREATE TABLE IF NOT EXISTS api_usage_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Time Period
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('HOUR', 'DAY', 'WEEK', 'MONTH')),
  
  -- Usage Statistics
  total_requests INTEGER NOT NULL DEFAULT 0,
  successful_requests INTEGER NOT NULL DEFAULT 0,
  failed_requests INTEGER NOT NULL DEFAULT 0,
  rate_limited_requests INTEGER NOT NULL DEFAULT 0,
  
  -- Performance Metrics
  avg_response_time_ms DECIMAL(8,2) NOT NULL DEFAULT 0,
  p95_response_time_ms DECIMAL(8,2) NOT NULL DEFAULT 0,
  total_bandwidth_bytes BIGINT NOT NULL DEFAULT 0,
  
  -- Top Usage Patterns
  top_endpoints JSONB DEFAULT '[]',
  user_agents JSONB DEFAULT '[]',
  geographic_distribution JSONB DEFAULT '{}', -- {country_code: request_count}
  hourly_distribution JSONB DEFAULT '{}', -- {hour: request_count} for day periods
  
  -- Quota Usage
  daily_quota_used INTEGER DEFAULT 0,
  daily_quota_limit INTEGER DEFAULT 0,
  monthly_quota_used INTEGER DEFAULT 0,
  monthly_quota_limit INTEGER DEFAULT 0,
  quota_utilization_percentage DECIMAL(5,2) GENERATED ALWAYS AS 
    (CASE WHEN daily_quota_limit > 0 THEN (daily_quota_used::DECIMAL / daily_quota_limit) * 100 ELSE 0 END) STORED,
  
  -- Billing Information
  estimated_cost_usd DECIMAL(10,4) DEFAULT 0,
  overage_charges_usd DECIMAL(10,4) DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint per org/period
  UNIQUE(organization_id, period_start, period_type)
);

-- =============================================
-- API ALERTING AND NOTIFICATION SYSTEM
-- =============================================

-- Alert configuration and rules
CREATE TABLE IF NOT EXISTS api_alert_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- NULL for system-wide rules
  
  -- Rule Configuration
  rule_name VARCHAR(100) NOT NULL,
  rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('QUOTA_THRESHOLD', 'ERROR_RATE', 'LATENCY_SPIKE', 'TRAFFIC_ANOMALY', 'SYSTEM_HEALTH')),
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Threshold Configuration
  threshold_value DECIMAL(10,2) NOT NULL,
  threshold_operator VARCHAR(10) NOT NULL CHECK (threshold_operator IN ('>', '>=', '<', '<=', '=', '!=')),
  threshold_unit VARCHAR(20) NOT NULL, -- 'PERCENTAGE', 'COUNT', 'MILLISECONDS', 'BYTES'
  
  -- Time Window
  evaluation_window_minutes INTEGER NOT NULL DEFAULT 5,
  consecutive_breaches_required INTEGER NOT NULL DEFAULT 1,
  
  -- Alert Actions
  notification_channels JSONB NOT NULL DEFAULT '[]', -- ['email:user@example.com', 'slack:#alerts', 'webhook:https://...']
  escalation_delay_minutes INTEGER DEFAULT 30,
  auto_resolve_enabled BOOLEAN DEFAULT TRUE,
  auto_resolve_threshold DECIMAL(10,2),
  
  -- Metadata
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0
);

-- Alert incidents and history
CREATE TABLE IF NOT EXISTS api_alert_incidents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_rule_id UUID NOT NULL REFERENCES api_alert_rules(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Incident Details
  incident_title VARCHAR(200) NOT NULL,
  incident_description TEXT,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'SUPPRESSED')),
  
  -- Trigger Information
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  triggered_value DECIMAL(10,2) NOT NULL,
  trigger_threshold DECIMAL(10,2) NOT NULL,
  
  -- Context Data
  affected_endpoints TEXT[],
  metrics_snapshot JSONB, -- Detailed metrics at time of trigger
  
  -- Resolution
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  auto_resolved BOOLEAN DEFAULT FALSE,
  
  -- Notifications
  notifications_sent JSONB DEFAULT '[]', -- Array of {channel, timestamp, success}
  escalation_level INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- API Usage Logs Indexes
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_org_created ON api_usage_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_endpoint_created ON api_usage_logs(endpoint, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_created ON api_usage_logs(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_status_created ON api_usage_logs(status_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_request_id ON api_usage_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_performance ON api_usage_logs(response_time_ms DESC, created_at DESC) WHERE response_time_ms > 1000;

-- Rate Limiting Indexes
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_org_endpoint ON api_rate_limits(organization_id, endpoint, time_window DESC);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_expires ON api_rate_limits(expires_at) WHERE expires_at < NOW();
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_key ON api_rate_limits(rate_limit_key);

-- Analytics Indexes
CREATE INDEX IF NOT EXISTS idx_api_usage_analytics_org_period ON api_usage_analytics(organization_id, period_start DESC, period_type);
CREATE INDEX IF NOT EXISTS idx_api_usage_analytics_quota_high ON api_usage_analytics(quota_utilization_percentage DESC) WHERE quota_utilization_percentage > 80;

-- Health Metrics Indexes
CREATE INDEX IF NOT EXISTS idx_api_health_metrics_timestamp ON api_health_metrics(metric_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_health_metrics_anomaly ON api_health_metrics(is_anomaly, anomaly_severity) WHERE is_anomaly = TRUE;

-- Alert Rules Indexes
CREATE INDEX IF NOT EXISTS idx_api_alert_rules_org_enabled ON api_alert_rules(organization_id, is_enabled) WHERE is_enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_api_alert_incidents_rule_status ON api_alert_incidents(alert_rule_id, status, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_alert_incidents_org_active ON api_alert_incidents(organization_id, status) WHERE status = 'ACTIVE';

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to cleanup old usage logs (GDPR compliance)
CREATE OR REPLACE FUNCTION cleanup_old_api_usage_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER := 0;
  retention_days INTEGER;
BEGIN
  -- Delete logs based on organization's retention policy
  WITH deletion_candidates AS (
    SELECT aul.id
    FROM api_usage_logs aul
    JOIN organizations o ON aul.organization_id = o.id
    JOIN subscriptions s ON o.id = s.organization_id AND s.status = 'active'
    JOIN api_quotas aq ON s.tier = aq.subscription_tier
    WHERE aul.created_at < NOW() - (aq.analytics_retention_days || ' days')::INTERVAL
    LIMIT 10000 -- Process in batches to avoid long locks
  )
  DELETE FROM api_usage_logs 
  WHERE id IN (SELECT id FROM deletion_candidates);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Also cleanup expired rate limit entries
  DELETE FROM api_rate_limits WHERE expires_at < NOW();
  
  RETURN deleted_count;
END;
$$;

-- Function to aggregate usage analytics
CREATE OR REPLACE FUNCTION aggregate_api_usage_analytics(
  p_organization_id UUID,
  p_period_start TIMESTAMPTZ,
  p_period_end TIMESTAMPTZ,
  p_period_type TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  analytics_id UUID;
  quota_info RECORD;
BEGIN
  -- Get quota information for the organization
  SELECT aq.daily_quota, aq.monthly_quota
  INTO quota_info
  FROM organizations o
  JOIN subscriptions s ON o.id = s.organization_id AND s.status = 'active'
  JOIN api_quotas aq ON s.tier = aq.subscription_tier
  WHERE o.id = p_organization_id;
  
  -- Insert or update analytics record
  INSERT INTO api_usage_analytics (
    organization_id, period_start, period_end, period_type,
    total_requests, successful_requests, failed_requests, rate_limited_requests,
    avg_response_time_ms, p95_response_time_ms, total_bandwidth_bytes,
    top_endpoints, geographic_distribution, daily_quota_limit, monthly_quota_limit
  )
  SELECT 
    p_organization_id,
    p_period_start,
    p_period_end,
    p_period_type,
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE status_code < 400) as successful_requests,
    COUNT(*) FILTER (WHERE status_code >= 400) as failed_requests,
    COUNT(*) FILTER (WHERE is_rate_limited = TRUE) as rate_limited_requests,
    AVG(response_time_ms) as avg_response_time_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time_ms,
    SUM(COALESCE(response_size_bytes, 0)) as total_bandwidth_bytes,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('endpoint', endpoint, 'count', cnt, 'avg_time', avg_time))
       FROM (
         SELECT endpoint, COUNT(*) as cnt, AVG(response_time_ms) as avg_time
         FROM api_usage_logs
         WHERE organization_id = p_organization_id 
           AND created_at >= p_period_start 
           AND created_at < p_period_end
         GROUP BY endpoint
         ORDER BY cnt DESC
         LIMIT 10
       ) top_eps), '[]'::jsonb
    ) as top_endpoints,
    COALESCE(
      (SELECT jsonb_object_agg(country_code, cnt)
       FROM (
         SELECT COALESCE(country_code, 'unknown') as country_code, COUNT(*) as cnt
         FROM api_usage_logs
         WHERE organization_id = p_organization_id 
           AND created_at >= p_period_start 
           AND created_at < p_period_end
           AND country_code IS NOT NULL
         GROUP BY country_code
       ) geo_dist), '{}'::jsonb
    ) as geographic_distribution,
    quota_info.daily_quota,
    quota_info.monthly_quota
  FROM api_usage_logs
  WHERE organization_id = p_organization_id
    AND created_at >= p_period_start
    AND created_at < p_period_end
  ON CONFLICT (organization_id, period_start, period_type)
  DO UPDATE SET
    total_requests = EXCLUDED.total_requests,
    successful_requests = EXCLUDED.successful_requests,
    failed_requests = EXCLUDED.failed_requests,
    rate_limited_requests = EXCLUDED.rate_limited_requests,
    avg_response_time_ms = EXCLUDED.avg_response_time_ms,
    p95_response_time_ms = EXCLUDED.p95_response_time_ms,
    total_bandwidth_bytes = EXCLUDED.total_bandwidth_bytes,
    top_endpoints = EXCLUDED.top_endpoints,
    geographic_distribution = EXCLUDED.geographic_distribution,
    updated_at = NOW()
  RETURNING id INTO analytics_id;
  
  RETURN analytics_id;
END;
$$;

-- Function to check API quotas and rate limits
CREATE OR REPLACE FUNCTION check_api_usage_limits(
  p_organization_id UUID,
  p_endpoint TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  quota_info RECORD;
  usage_info RECORD;
  rate_limit_info RECORD;
  result jsonb;
BEGIN
  -- Get quota limits for organization's tier
  SELECT aq.*
  INTO quota_info
  FROM organizations o
  JOIN subscriptions s ON o.id = s.organization_id AND s.status = 'active'
  JOIN api_quotas aq ON s.tier = aq.subscription_tier
  WHERE o.id = p_organization_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'NO_ACTIVE_SUBSCRIPTION'
    );
  END IF;
  
  -- Check daily usage
  SELECT COUNT(*) as daily_count
  INTO usage_info
  FROM api_usage_logs
  WHERE organization_id = p_organization_id
    AND created_at >= CURRENT_DATE;
  
  -- Check if over daily quota (unless unlimited)
  IF quota_info.daily_quota > 0 AND usage_info.daily_count >= quota_info.daily_quota THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'DAILY_QUOTA_EXCEEDED',
      'daily_usage', usage_info.daily_count,
      'daily_limit', quota_info.daily_quota
    );
  END IF;
  
  -- Check rate limiting (last minute)
  SELECT COALESCE(SUM(request_count), 0) as minute_count
  INTO rate_limit_info
  FROM api_rate_limits
  WHERE organization_id = p_organization_id
    AND time_window >= NOW() - INTERVAL '1 minute'
    AND (p_endpoint IS NULL OR endpoint = p_endpoint);
  
  -- Check if over rate limit (unless unlimited)
  IF quota_info.rate_limit_per_minute > 0 AND rate_limit_info.minute_count >= quota_info.rate_limit_per_minute THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'RATE_LIMIT_EXCEEDED',
      'minute_usage', rate_limit_info.minute_count,
      'minute_limit', quota_info.rate_limit_per_minute
    );
  END IF;
  
  -- Usage is allowed
  RETURN jsonb_build_object(
    'allowed', true,
    'daily_usage', usage_info.daily_count,
    'daily_limit', quota_info.daily_quota,
    'minute_usage', COALESCE(rate_limit_info.minute_count, 0),
    'minute_limit', quota_info.rate_limit_per_minute,
    'subscription_tier', quota_info.subscription_tier
  );
END;
$$;

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_alert_incidents ENABLE ROW LEVEL SECURITY;

-- API Usage Logs Policies
CREATE POLICY "api_usage_logs_select_own_org" ON api_usage_logs
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organization_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "api_usage_logs_insert_system" ON api_usage_logs
  FOR INSERT WITH CHECK (true); -- System can insert all usage logs

-- API Quotas Policies (read-only for users)
CREATE POLICY "api_quotas_select_all" ON api_quotas
  FOR SELECT USING (true);

-- Rate Limits Policies
CREATE POLICY "api_rate_limits_select_own_org" ON api_rate_limits
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organization_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "api_rate_limits_all_system" ON api_rate_limits
  FOR ALL USING (true); -- System needs full access for rate limiting

-- Health Metrics Policies (admin only)
CREATE POLICY "api_health_metrics_admin_only" ON api_health_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_organization_roles uor
      JOIN organizations o ON uor.organization_id = o.id
      WHERE uor.user_id = auth.uid() AND uor.role = 'admin'
    )
  );

-- Usage Analytics Policies
CREATE POLICY "api_usage_analytics_select_own_org" ON api_usage_analytics
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organization_roles 
      WHERE user_id = auth.uid()
    )
  );

-- Alert Rules Policies
CREATE POLICY "api_alert_rules_select_own_org" ON api_alert_rules
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organization_roles 
      WHERE user_id = auth.uid()
    ) OR organization_id IS NULL -- System-wide rules visible to all
  );

CREATE POLICY "api_alert_rules_manage_own_org" ON api_alert_rules
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_organization_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Alert Incidents Policies
CREATE POLICY "api_alert_incidents_select_own_org" ON api_alert_incidents
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organization_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "api_alert_incidents_manage_own_org" ON api_alert_incidents
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_organization_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- =============================================
-- DEFAULT ALERT RULES FOR SYSTEM MONITORING
-- =============================================

-- System-wide alert rules (organization_id = NULL)
INSERT INTO api_alert_rules (organization_id, rule_name, rule_type, threshold_value, threshold_operator, threshold_unit, notification_channels) VALUES
  (NULL, 'High Error Rate System-wide', 'ERROR_RATE', 5.0, '>', 'PERCENTAGE', '["email:admin@wedsync.com", "slack:#alerts"]'),
  (NULL, 'System Latency Spike', 'LATENCY_SPIKE', 2000, '>', 'MILLISECONDS', '["email:admin@wedsync.com", "slack:#alerts"]'),
  (NULL, 'High Traffic Anomaly', 'TRAFFIC_ANOMALY', 200, '>', 'PERCENTAGE', '["email:admin@wedsync.com", "slack:#alerts"]');

-- =============================================
-- COMMENTS AND DOCUMENTATION
-- =============================================

COMMENT ON TABLE api_usage_logs IS 'Comprehensive API usage tracking for all endpoints with performance metrics and security monitoring';
COMMENT ON TABLE api_quotas IS 'Subscription tier limits and quotas for API usage management';
COMMENT ON TABLE api_rate_limits IS 'Real-time rate limiting counters with sliding window algorithm support';
COMMENT ON TABLE api_health_metrics IS 'System-wide API health monitoring and performance metrics';
COMMENT ON TABLE api_usage_analytics IS 'Aggregated usage analytics by organization and time period for dashboards and billing';
COMMENT ON TABLE api_alert_rules IS 'Configurable alert rules for monitoring API usage, performance, and health';
COMMENT ON TABLE api_alert_incidents IS 'Active and historical incidents triggered by alert rules';

COMMENT ON FUNCTION cleanup_old_api_usage_logs() IS 'GDPR-compliant cleanup function for old API usage logs based on retention policies';
COMMENT ON FUNCTION aggregate_api_usage_analytics(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) IS 'Aggregates raw usage data into analytics records for reporting and dashboards';
COMMENT ON FUNCTION check_api_usage_limits(UUID, TEXT) IS 'Validates API usage against quotas and rate limits before allowing requests';

-- =============================================
-- INITIAL DATA VERIFICATION
-- =============================================

-- Verify default quotas are inserted
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM api_quotas WHERE subscription_tier = 'ENTERPRISE') THEN
    RAISE EXCEPTION 'Default API quotas not properly inserted';
  END IF;
  
  RAISE NOTICE 'WS-233 API Usage Monitoring System successfully installed with % tier quotas and % alert rules', 
    (SELECT COUNT(*) FROM api_quotas),
    (SELECT COUNT(*) FROM api_alert_rules);
END;
$$;