-- API Key Management System for Production Security
-- Supports automatic rotation, usage tracking, and lifecycle management

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'revoked', 'expired')),
  expires_at timestamptz,
  last_used_at timestamptz,
  usage_count bigint NOT NULL DEFAULT 0,
  rate_limit integer NOT NULL DEFAULT 1000,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  metadata jsonb DEFAULT '{}',
  
  -- Constraints
  CONSTRAINT api_keys_name_org_unique UNIQUE (organization_id, name),
  CONSTRAINT api_keys_rate_limit_positive CHECK (rate_limit > 0),
  CONSTRAINT api_keys_usage_count_non_negative CHECK (usage_count >= 0)
);

-- Security events table (if not exists)
CREATE TABLE IF NOT EXISTS security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  ip_address inet,
  user_agent text,
  endpoint text,
  details jsonb DEFAULT '{}',
  severity text NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high')),
  created_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid REFERENCES organizations(id),
  user_id uuid,
  
  -- Indexes for efficient querying
  INDEX idx_security_events_created_at ON security_events(created_at DESC),
  INDEX idx_security_events_severity ON security_events(severity),
  INDEX idx_security_events_type ON security_events(event_type),
  INDEX idx_security_events_ip ON security_events(ip_address),
  INDEX idx_security_events_org ON security_events(organization_id)
);

-- Indexes for API keys table
CREATE INDEX idx_api_keys_organization_id ON api_keys(organization_id);
CREATE INDEX idx_api_keys_status ON api_keys(status);
CREATE INDEX idx_api_keys_expires_at ON api_keys(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_last_used ON api_keys(last_used_at DESC);
CREATE INDEX idx_api_keys_created_at ON api_keys(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX idx_api_keys_org_status ON api_keys(organization_id, status);
CREATE INDEX idx_api_keys_hash_prefix ON api_keys(key_hash, key_prefix);
CREATE INDEX idx_api_keys_status_expires ON api_keys(status, expires_at) WHERE expires_at IS NOT NULL;

-- API key usage tracking table
CREATE TABLE IF NOT EXISTS api_key_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  method text NOT NULL,
  status_code integer NOT NULL,
  response_time_ms integer,
  ip_address inet,
  user_agent text,
  request_size bigint,
  response_size bigint,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Partitioning preparation
  CONSTRAINT api_key_usage_created_at_check CHECK (created_at >= '2024-01-01'::timestamptz)
);

-- Indexes for usage tracking
CREATE INDEX idx_api_key_usage_key_id ON api_key_usage(api_key_id);
CREATE INDEX idx_api_key_usage_created_at ON api_key_usage(created_at DESC);
CREATE INDEX idx_api_key_usage_endpoint ON api_key_usage(endpoint);
CREATE INDEX idx_api_key_usage_status ON api_key_usage(status_code);

-- Composite indexes for analytics
CREATE INDEX idx_api_key_usage_key_endpoint ON api_key_usage(api_key_id, endpoint);
CREATE INDEX idx_api_key_usage_key_created ON api_key_usage(api_key_id, created_at DESC);

-- Row Level Security (RLS) policies
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- API Keys RLS policies
CREATE POLICY "api_keys_select_own_org" ON api_keys
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "api_keys_insert_own_org" ON api_keys
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "api_keys_update_own_org" ON api_keys
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "api_keys_delete_own_org" ON api_keys
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- API Key Usage RLS policies
CREATE POLICY "api_key_usage_select_own_org" ON api_key_usage
  FOR SELECT USING (
    api_key_id IN (
      SELECT id FROM api_keys 
      WHERE organization_id IN (
        SELECT organization_id FROM user_profiles 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Security Events RLS policies
CREATE POLICY "security_events_select_own_org" ON security_events
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid()
    ) OR organization_id IS NULL
  );

-- Functions for API key management
CREATE OR REPLACE FUNCTION validate_api_key_scopes(scopes text[])
RETURNS boolean AS $$
DECLARE
  valid_scopes text[] := ARRAY[
    'read:forms', 'write:forms', 'delete:forms',
    'read:clients', 'write:clients', 'delete:clients',
    'read:payments', 'write:payments',
    'read:webhooks', 'write:webhooks',
    'read:analytics', 'admin:all'
  ];
  scope text;
BEGIN
  FOREACH scope IN ARRAY scopes
  LOOP
    IF scope NOT = ANY(valid_scopes) THEN
      RETURN false;
    END IF;
  END LOOP;
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate scopes
CREATE OR REPLACE FUNCTION check_api_key_scopes()
RETURNS trigger AS $$
BEGIN
  IF NOT validate_api_key_scopes(NEW.scopes) THEN
    RAISE EXCEPTION 'Invalid scope in API key: %', array_to_string(NEW.scopes, ', ');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER api_keys_validate_scopes
  BEFORE INSERT OR UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION check_api_key_scopes();

-- Function to automatically expire old keys
CREATE OR REPLACE FUNCTION expire_old_api_keys()
RETURNS void AS $$
BEGIN
  UPDATE api_keys 
  SET status = 'expired'
  WHERE status = 'active' 
    AND expires_at IS NOT NULL 
    AND expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Function to get API key statistics
CREATE OR REPLACE FUNCTION get_api_key_stats(org_id uuid)
RETURNS TABLE (
  total_keys bigint,
  active_keys bigint,
  expired_keys bigint,
  total_usage bigint,
  avg_daily_usage numeric,
  last_activity timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_keys,
    COUNT(*) FILTER (WHERE status = 'active') as active_keys,
    COUNT(*) FILTER (WHERE status = 'expired') as expired_keys,
    COALESCE(SUM(usage_count), 0) as total_usage,
    COALESCE(AVG(usage_count), 0) as avg_daily_usage,
    MAX(last_used_at) as last_activity
  FROM api_keys
  WHERE organization_id = org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old usage records (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_api_usage(days_to_keep integer DEFAULT 90)
RETURNS bigint AS $$
DECLARE
  deleted_count bigint;
BEGIN
  DELETE FROM api_key_usage 
  WHERE created_at < now() - (days_to_keep || ' days')::interval;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to track API key usage
CREATE OR REPLACE FUNCTION track_api_key_usage(
  p_api_key_id uuid,
  p_endpoint text,
  p_method text,
  p_status_code integer,
  p_response_time_ms integer DEFAULT NULL,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_request_size bigint DEFAULT NULL,
  p_response_size bigint DEFAULT NULL,
  p_error_message text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Insert usage record
  INSERT INTO api_key_usage (
    api_key_id, endpoint, method, status_code,
    response_time_ms, ip_address, user_agent,
    request_size, response_size, error_message
  ) VALUES (
    p_api_key_id, p_endpoint, p_method, p_status_code,
    p_response_time_ms, p_ip_address, p_user_agent,
    p_request_size, p_response_size, p_error_message
  );
  
  -- Update API key usage count and last used timestamp
  UPDATE api_keys 
  SET 
    usage_count = usage_count + 1,
    last_used_at = now()
  WHERE id = p_api_key_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view for API key dashboard
CREATE OR REPLACE VIEW api_key_dashboard AS
SELECT 
  ak.id,
  ak.name,
  ak.key_prefix,
  ak.status,
  ak.scopes,
  ak.rate_limit,
  ak.usage_count,
  ak.last_used_at,
  ak.expires_at,
  ak.created_at,
  o.name as organization_name,
  
  -- Usage statistics
  COALESCE(usage_stats.requests_last_24h, 0) as requests_last_24h,
  COALESCE(usage_stats.requests_last_7d, 0) as requests_last_7d,
  COALESCE(usage_stats.avg_response_time, 0) as avg_response_time_ms,
  COALESCE(usage_stats.error_rate, 0) as error_rate_percent,
  
  -- Status indicators
  CASE 
    WHEN ak.expires_at IS NOT NULL AND ak.expires_at < now() THEN 'expired'
    WHEN ak.expires_at IS NOT NULL AND ak.expires_at < now() + interval '7 days' THEN 'expiring_soon'
    WHEN ak.last_used_at IS NULL THEN 'unused'
    WHEN ak.last_used_at < now() - interval '30 days' THEN 'inactive'
    ELSE 'active'
  END as health_status

FROM api_keys ak
JOIN organizations o ON ak.organization_id = o.id
LEFT JOIN (
  SELECT 
    api_key_id,
    COUNT(*) FILTER (WHERE created_at > now() - interval '24 hours') as requests_last_24h,
    COUNT(*) FILTER (WHERE created_at > now() - interval '7 days') as requests_last_7d,
    AVG(response_time_ms) as avg_response_time,
    (COUNT(*) FILTER (WHERE status_code >= 400)::float / NULLIF(COUNT(*), 0) * 100) as error_rate
  FROM api_key_usage 
  WHERE created_at > now() - interval '7 days'
  GROUP BY api_key_id
) usage_stats ON ak.id = usage_stats.api_key_id;

-- Grant permissions to authenticated users
GRANT SELECT ON api_key_dashboard TO authenticated;
GRANT EXECUTE ON FUNCTION get_api_key_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_api_key_scopes(text[]) TO authenticated;

-- Grant service role permissions for management functions
GRANT ALL ON api_keys TO service_role;
GRANT ALL ON api_key_usage TO service_role;
GRANT ALL ON security_events TO service_role;
GRANT EXECUTE ON FUNCTION expire_old_api_keys() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_api_usage(integer) TO service_role;
GRANT EXECUTE ON FUNCTION track_api_key_usage(uuid, text, text, integer, integer, inet, text, bigint, bigint, text) TO service_role;

-- Comments for documentation
COMMENT ON TABLE api_keys IS 'API keys for external integrations with automatic rotation support';
COMMENT ON TABLE api_key_usage IS 'Tracks API key usage for analytics and security monitoring';
COMMENT ON TABLE security_events IS 'Security events and incidents for monitoring and alerting';
COMMENT ON FUNCTION expire_old_api_keys() IS 'Automatically expire API keys past their expiration date';
COMMENT ON FUNCTION cleanup_old_api_usage(integer) IS 'Clean up old API usage records for maintenance';
COMMENT ON FUNCTION track_api_key_usage(uuid, text, text, integer, integer, inet, text, bigint, bigint, text) IS 'Track API key usage with detailed metrics';
COMMENT ON VIEW api_key_dashboard IS 'Comprehensive dashboard view for API key management and monitoring';

-- Create scheduled job for automatic key expiration (requires pg_cron extension)
-- This would be set up in production with appropriate scheduling
-- SELECT cron.schedule('expire-api-keys', '0 */6 * * *', 'SELECT expire_old_api_keys();');
-- SELECT cron.schedule('cleanup-api-usage', '0 2 * * 0', 'SELECT cleanup_old_api_usage(90);');