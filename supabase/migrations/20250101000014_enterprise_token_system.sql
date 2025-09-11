-- =====================================================
-- Enterprise OAuth 2.0 + JWT Token System Migration
-- =====================================================
-- B-MAD Enhancement: Advanced token management for enterprise security
-- Supports token rotation, device fingerprinting, and session management

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS refresh_token_families CASCADE;
DROP TABLE IF EXISTS active_sessions CASCADE;
DROP TABLE IF EXISTS token_blacklist CASCADE;

-- =====================================================
-- Active Sessions Table
-- =====================================================
-- Track all active user sessions across devices
CREATE TABLE active_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL UNIQUE,
  
  -- Device fingerprinting for security
  device_fingerprint VARCHAR(255) NOT NULL,
  device_info JSONB DEFAULT '{}',
  
  -- Location and network info
  ip_address INET,
  user_agent TEXT,
  location JSONB DEFAULT '{}',
  
  -- Session lifecycle
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Session status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  logout_reason TEXT,
  
  -- Wedding season burst mode tracking
  is_wedding_season BOOLEAN NOT NULL DEFAULT FALSE,
  extended_expiry BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Audit fields
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_active_sessions_user ON active_sessions(user_id);
CREATE INDEX idx_active_sessions_organization ON active_sessions(organization_id);
CREATE INDEX idx_active_sessions_device ON active_sessions(device_fingerprint);
CREATE INDEX idx_active_sessions_expires ON active_sessions(expires_at);
CREATE INDEX idx_active_sessions_active ON active_sessions(is_active);
CREATE INDEX idx_active_sessions_last_used ON active_sessions(last_used_at);

-- =====================================================
-- Refresh Token Families Table
-- =====================================================
-- Support refresh token rotation with family tracking
CREATE TABLE refresh_token_families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL REFERENCES active_sessions(session_id) ON DELETE CASCADE,
  
  -- Token family for rotation
  family_id UUID NOT NULL DEFAULT uuid_generate_v4(),
  token_id UUID NOT NULL UNIQUE, -- JWT ID (jti claim)
  
  -- Token metadata
  token_hash VARCHAR(255) NOT NULL, -- SHA256 hash of token for lookup
  device_fingerprint VARCHAR(255) NOT NULL,
  
  -- Lifecycle tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  
  -- Rotation tracking
  parent_token_id UUID REFERENCES refresh_token_families(token_id),
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  rotation_reason TEXT,
  
  -- Security flags
  is_compromised BOOLEAN NOT NULL DEFAULT FALSE,
  compromise_reason TEXT,
  
  -- Audit fields
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance and security
CREATE INDEX idx_refresh_tokens_user ON refresh_token_families(user_id);
CREATE INDEX idx_refresh_tokens_session ON refresh_token_families(session_id);
CREATE INDEX idx_refresh_tokens_family ON refresh_token_families(family_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_token_families(token_hash);
CREATE INDEX idx_refresh_tokens_current ON refresh_token_families(is_current);
CREATE INDEX idx_refresh_tokens_expires ON refresh_token_families(expires_at);
CREATE INDEX idx_refresh_tokens_device ON refresh_token_families(device_fingerprint);
CREATE UNIQUE INDEX idx_refresh_tokens_token_id ON refresh_token_families(token_id);

-- =====================================================
-- Token Blacklist Table
-- =====================================================
-- Track revoked and compromised tokens
CREATE TABLE token_blacklist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id UUID NOT NULL, -- JWT ID (jti claim)
  token_type VARCHAR(50) NOT NULL CHECK (token_type IN ('access', 'refresh')),
  
  -- Token metadata
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id VARCHAR(255),
  token_hash VARCHAR(255),
  
  -- Revocation details
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revocation_reason TEXT NOT NULL,
  revoked_by UUID REFERENCES auth.users(id),
  
  -- Security incident tracking
  is_security_incident BOOLEAN NOT NULL DEFAULT FALSE,
  incident_details JSONB DEFAULT '{}',
  
  -- Expiry (for cleanup)
  original_expires_at TIMESTAMPTZ NOT NULL,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast blacklist lookups
CREATE UNIQUE INDEX idx_blacklist_token_id ON token_blacklist(token_id);
CREATE INDEX idx_blacklist_user ON token_blacklist(user_id);
CREATE INDEX idx_blacklist_type ON token_blacklist(token_type);
CREATE INDEX idx_blacklist_revoked ON token_blacklist(revoked_at);
CREATE INDEX idx_blacklist_expires ON token_blacklist(original_expires_at);
CREATE INDEX idx_blacklist_hash ON token_blacklist(token_hash) WHERE token_hash IS NOT NULL;

-- =====================================================
-- Session Management Functions
-- =====================================================

-- Function to update session last used time
CREATE OR REPLACE FUNCTION update_session_last_used(p_session_id VARCHAR)
RETURNS VOID AS $$
BEGIN
  UPDATE active_sessions 
  SET 
    last_used_at = NOW(),
    updated_at = NOW()
  WHERE session_id = p_session_id AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revoke all user sessions (for security incidents)
CREATE OR REPLACE FUNCTION revoke_all_user_sessions(
  p_user_id UUID,
  p_reason TEXT DEFAULT 'Security incident'
)
RETURNS INTEGER AS $$
DECLARE
  revoked_count INTEGER;
BEGIN
  -- Deactivate all sessions
  UPDATE active_sessions 
  SET 
    is_active = FALSE,
    logout_reason = p_reason,
    updated_at = NOW()
  WHERE user_id = p_user_id AND is_active = TRUE;
  
  GET DIAGNOSTICS revoked_count = ROW_COUNT;
  
  -- Mark all refresh tokens as revoked
  UPDATE refresh_token_families
  SET 
    revoked_at = NOW(),
    is_current = FALSE,
    rotation_reason = p_reason,
    updated_at = NOW()
  WHERE user_id = p_user_id AND revoked_at IS NULL;
  
  -- Add tokens to blacklist
  INSERT INTO token_blacklist (token_id, token_type, user_id, revocation_reason, is_security_incident)
  SELECT 
    token_id,
    'refresh',
    user_id,
    p_reason,
    TRUE
  FROM refresh_token_families
  WHERE user_id = p_user_id AND revoked_at = NOW();
  
  RETURN revoked_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired tokens and sessions
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS JSONB AS $$
DECLARE
  expired_sessions INTEGER;
  expired_tokens INTEGER;
  cleaned_blacklist INTEGER;
  result JSONB;
BEGIN
  -- Clean up expired sessions
  DELETE FROM active_sessions 
  WHERE expires_at < NOW() - INTERVAL '7 days';
  GET DIAGNOSTICS expired_sessions = ROW_COUNT;
  
  -- Clean up expired refresh tokens
  DELETE FROM refresh_token_families 
  WHERE expires_at < NOW() - INTERVAL '7 days';
  GET DIAGNOSTICS expired_tokens = ROW_COUNT;
  
  -- Clean up old blacklist entries (keep for 90 days)
  DELETE FROM token_blacklist 
  WHERE original_expires_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS cleaned_blacklist = ROW_COUNT;
  
  result := jsonb_build_object(
    'expired_sessions', expired_sessions,
    'expired_tokens', expired_tokens,
    'cleaned_blacklist', cleaned_blacklist,
    'cleaned_at', NOW()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Wedding Season Detection Function
-- =====================================================
CREATE OR REPLACE FUNCTION is_wedding_season()
RETURNS BOOLEAN AS $$
BEGIN
  -- Wedding season is April through October (months 4-10)
  RETURN EXTRACT(MONTH FROM NOW()) BETWEEN 4 AND 10;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- User Session Limit Enforcement
-- =====================================================
CREATE OR REPLACE FUNCTION enforce_session_limit(
  p_user_id UUID,
  p_max_sessions INTEGER DEFAULT 5
)
RETURNS INTEGER AS $$
DECLARE
  current_sessions INTEGER;
  sessions_to_remove INTEGER;
  oldest_sessions UUID[];
BEGIN
  -- Count active sessions
  SELECT COUNT(*) INTO current_sessions
  FROM active_sessions
  WHERE user_id = p_user_id AND is_active = TRUE;
  
  -- If under limit, return
  IF current_sessions <= p_max_sessions THEN
    RETURN 0;
  END IF;
  
  sessions_to_remove := current_sessions - p_max_sessions;
  
  -- Get oldest sessions to remove
  SELECT ARRAY(
    SELECT id 
    FROM active_sessions 
    WHERE user_id = p_user_id AND is_active = TRUE
    ORDER BY last_used_at ASC
    LIMIT sessions_to_remove
  ) INTO oldest_sessions;
  
  -- Deactivate oldest sessions
  UPDATE active_sessions
  SET 
    is_active = FALSE,
    logout_reason = 'Session limit exceeded',
    updated_at = NOW()
  WHERE id = ANY(oldest_sessions);
  
  -- Revoke associated refresh tokens
  UPDATE refresh_token_families
  SET 
    revoked_at = NOW(),
    rotation_reason = 'Session limit exceeded',
    is_current = FALSE,
    updated_at = NOW()
  WHERE session_id IN (
    SELECT session_id FROM active_sessions WHERE id = ANY(oldest_sessions)
  );
  
  RETURN sessions_to_remove;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_token_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_blacklist ENABLE ROW LEVEL SECURITY;

-- Active Sessions RLS Policies
-- Users can only see their own sessions
CREATE POLICY active_sessions_user_policy ON active_sessions
  FOR ALL USING (
    ( SELECT auth.uid() ) = user_id OR 
    auth.uid() IN (
      SELECT user_id FROM user_profiles 
      WHERE organization_id = (
        SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
      ) AND role IN ('ADMIN', 'OWNER')
    )
  );

-- Service role can access all sessions
CREATE POLICY active_sessions_service_policy ON active_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- Refresh Token Families RLS Policies
-- Users can only access their own refresh tokens
CREATE POLICY refresh_tokens_user_policy ON refresh_token_families
  FOR ALL USING (( SELECT auth.uid() ) = user_id);

-- Service role can access all tokens
CREATE POLICY refresh_tokens_service_policy ON refresh_token_families
  FOR ALL USING (auth.role() = 'service_role');

-- Token Blacklist RLS Policies
-- Users can see blacklisted tokens for audit purposes
CREATE POLICY blacklist_user_policy ON token_blacklist
  FOR SELECT USING (
    ( SELECT auth.uid() ) = user_id OR 
    auth.uid() IN (
      SELECT user_id FROM user_profiles 
      WHERE role IN ('ADMIN', 'OWNER')
    )
  );

-- Service role can manage blacklist
CREATE POLICY blacklist_service_policy ON token_blacklist
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- Triggers for Automatic Updates
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER active_sessions_updated_at
  BEFORE UPDATE ON active_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER refresh_token_families_updated_at
  BEFORE UPDATE ON refresh_token_families
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Scheduled Jobs for Maintenance
-- =====================================================

-- Note: In production, set up pg_cron or similar to run:
-- SELECT cleanup_expired_tokens();
-- This should run daily during low-traffic hours

-- =====================================================
-- Audit and Monitoring Views
-- =====================================================

-- Active sessions overview for monitoring
CREATE OR REPLACE VIEW session_monitoring AS
SELECT 
  u.email,
  up.organization_id,
  o.name as organization_name,
  COUNT(*) as active_sessions,
  MAX(s.last_used_at) as last_activity,
  BOOL_OR(s.is_wedding_season) as has_wedding_season_sessions,
  ARRAY_AGG(DISTINCT s.device_fingerprint) as devices
FROM active_sessions s
JOIN auth.users u ON s.user_id = u.id
LEFT JOIN user_profiles up ON s.user_id = up.user_id
LEFT JOIN organizations o ON up.organization_id = o.id
WHERE s.is_active = TRUE
GROUP BY u.email, up.organization_id, o.name;

-- Token security metrics
CREATE OR REPLACE VIEW token_security_metrics AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as total_blacklisted_tokens,
  COUNT(*) FILTER (WHERE is_security_incident = TRUE) as security_incidents,
  COUNT(*) FILTER (WHERE token_type = 'access') as revoked_access_tokens,
  COUNT(*) FILTER (WHERE token_type = 'refresh') as revoked_refresh_tokens
FROM token_blacklist
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- =====================================================
-- Initial Data and Configuration
-- =====================================================

-- Insert configuration for enterprise OAuth system
INSERT INTO system_config (key, value, description, category)
VALUES 
  ('oauth.access_token_expiry', '900', 'Access token expiry in seconds (15 minutes)', 'authentication'),
  ('oauth.refresh_token_expiry', '2592000', 'Refresh token expiry in seconds (30 days)', 'authentication'),
  ('oauth.max_sessions_per_user', '5', 'Maximum concurrent sessions per user', 'authentication'),
  ('oauth.wedding_season_burst_mode', 'true', 'Enable extended tokens during wedding season', 'authentication'),
  ('oauth.token_rotation_enabled', 'true', 'Enable refresh token rotation', 'authentication')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- =====================================================
-- Grants and Permissions
-- =====================================================

-- Grant necessary permissions for API functions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role, authenticated;

-- Grant specific permissions for session management
GRANT INSERT, UPDATE ON active_sessions TO authenticated;
GRANT INSERT, UPDATE ON refresh_token_families TO authenticated;
GRANT SELECT ON token_blacklist TO authenticated;

-- =====================================================
-- Migration Complete
-- =====================================================

-- Log migration completion
INSERT INTO migration_log (version, name, applied_at, description)
VALUES (
  '010',
  'Enterprise OAuth 2.0 + JWT Token System',
  NOW(),
  'Added comprehensive token management with rotation, device fingerprinting, and wedding season optimizations'
);

-- Notify completion
DO $$
BEGIN
  RAISE NOTICE 'Enterprise OAuth 2.0 + JWT Token System migration completed successfully';
  RAISE NOTICE 'Tables created: active_sessions, refresh_token_families, token_blacklist';
  RAISE NOTICE 'Functions added: session management, token cleanup, wedding season detection';
  RAISE NOTICE 'Views created: session_monitoring, token_security_metrics';
END $$;