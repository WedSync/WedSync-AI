-- ============================================================================
-- WS-147: Authentication Security Enhancements System
-- ============================================================================
-- Description: Enterprise-grade authentication security for WedSync
-- Features: MFA, device fingerprinting, rate limiting, security monitoring
-- Author: Team C - Batch 12
-- Created: 2025-01-25
-- ============================================================================

-- Create auth_security schema
CREATE SCHEMA IF NOT EXISTS auth_security;

-- Create enum types for security levels and events
CREATE TYPE security_level_enum AS ENUM ('standard', 'high', 'critical');
CREATE TYPE attempt_type_enum AS ENUM ('login', 'password_reset', 'mfa_verify', 'token_refresh');
CREATE TYPE security_event_enum AS ENUM (
  'login_success', 'login_failed', 'password_changed', 'mfa_enabled', 'mfa_disabled',
  'device_trusted', 'suspicious_login', 'account_locked', 'token_refresh', 'device_revoked',
  'password_reset_requested', 'password_reset_completed', 'mfa_backup_used', 'session_expired'
);
CREATE TYPE severity_enum AS ENUM ('low', 'medium', 'high', 'critical');

-- ============================================================================
-- User Security Profiles Table
-- ============================================================================
CREATE TABLE auth_security.user_security_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  security_level security_level_enum DEFAULT 'standard',
  
  -- MFA Configuration
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_secret TEXT, -- Encrypted TOTP secret
  mfa_backup_codes TEXT[], -- Encrypted backup codes
  mfa_enforced_at TIMESTAMPTZ,
  mfa_last_used TIMESTAMPTZ,
  
  -- Device Management
  trusted_devices UUID[] DEFAULT '{}',
  max_trusted_devices INTEGER DEFAULT 5,
  device_trust_duration_days INTEGER DEFAULT 30,
  
  -- Password Security
  password_changed_at TIMESTAMPTZ DEFAULT NOW(),
  password_history TEXT[], -- Hashes of last 5 passwords
  password_expires_at TIMESTAMPTZ,
  force_password_change BOOLEAN DEFAULT false,
  
  -- Risk Assessment
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  last_risk_assessment TIMESTAMPTZ,
  risk_factors JSONB DEFAULT '{}',
  
  -- Account Security
  account_locked BOOLEAN DEFAULT false,
  locked_until TIMESTAMPTZ,
  lock_reason TEXT,
  failed_login_count INTEGER DEFAULT 0,
  last_failed_login TIMESTAMPTZ,
  
  -- Session Management
  max_concurrent_sessions INTEGER DEFAULT 5,
  session_timeout_minutes INTEGER DEFAULT 60,
  require_reauthentication_hours INTEGER DEFAULT 24,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- User Devices Table
-- ============================================================================
CREATE TABLE auth_security.user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL,
  
  -- Device Information
  device_name TEXT,
  device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'unknown')),
  browser_info JSONB DEFAULT '{}',
  os_info JSONB DEFAULT '{}',
  
  -- Location Data
  ip_address INET,
  ip_location JSONB DEFAULT '{}',
  country_code TEXT,
  city TEXT,
  
  -- Trust Status
  trusted BOOLEAN DEFAULT false,
  trusted_at TIMESTAMPTZ,
  trust_expires_at TIMESTAMPTZ,
  trust_token TEXT UNIQUE,
  
  -- Activity Tracking
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  login_count INTEGER DEFAULT 1,
  
  -- Security Monitoring
  suspicious_activity_count INTEGER DEFAULT 0,
  last_suspicious_activity TIMESTAMPTZ,
  blocked BOOLEAN DEFAULT false,
  blocked_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_device_fingerprint UNIQUE (user_id, device_fingerprint)
);

-- ============================================================================
-- Authentication Attempts Table
-- ============================================================================
CREATE TABLE auth_security.auth_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  attempt_type attempt_type_enum NOT NULL,
  
  -- Attempt Details
  success BOOLEAN NOT NULL,
  failure_reason TEXT,
  error_code TEXT,
  
  -- Request Information
  ip_address INET NOT NULL,
  user_agent TEXT,
  device_fingerprint TEXT,
  
  -- Location Data
  location_data JSONB DEFAULT '{}',
  country_code TEXT,
  city TEXT,
  
  -- Security Context
  mfa_used BOOLEAN DEFAULT false,
  trusted_device BOOLEAN DEFAULT false,
  risk_score INTEGER,
  suspicious_indicators TEXT[],
  
  -- Response Actions
  action_taken TEXT,
  alert_sent BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Security Audit Log Table
-- ============================================================================
CREATE TABLE auth_security.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  event_type security_event_enum NOT NULL,
  event_severity severity_enum NOT NULL,
  
  -- Event Details
  event_data JSONB NOT NULL,
  event_description TEXT,
  affected_resources TEXT[],
  
  -- Request Context
  ip_address INET,
  user_agent TEXT,
  device_fingerprint TEXT,
  session_id TEXT,
  
  -- Security Response
  automated_response TEXT,
  manual_review_required BOOLEAN DEFAULT false,
  admin_notified BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ,
  
  -- Investigation
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Rate Limiting Table
-- ============================================================================
CREATE TABLE auth_security.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- email, IP, or user_id
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('email', 'ip', 'user_id')),
  action_type TEXT NOT NULL, -- login, password_reset, mfa_verify, etc.
  
  -- Rate Limit Tracking
  attempt_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  window_end TIMESTAMPTZ,
  
  -- Limits
  max_attempts INTEGER NOT NULL,
  window_duration_minutes INTEGER NOT NULL,
  
  -- Lock Status
  locked BOOLEAN DEFAULT false,
  locked_until TIMESTAMPTZ,
  lock_duration_minutes INTEGER,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_rate_limit UNIQUE (identifier, identifier_type, action_type, window_start)
);

-- ============================================================================
-- MFA Recovery Codes Table
-- ============================================================================
CREATE TABLE auth_security.mfa_recovery_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL, -- Hashed recovery code
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  used_ip INET,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Session Management Table
-- ============================================================================
CREATE TABLE auth_security.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  
  -- Session Details
  device_id UUID REFERENCES auth_security.user_devices(id),
  ip_address INET,
  user_agent TEXT,
  
  -- Session Status
  active BOOLEAN DEFAULT true,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Security Context
  mfa_verified BOOLEAN DEFAULT false,
  mfa_verified_at TIMESTAMPTZ,
  elevated_privileges BOOLEAN DEFAULT false,
  elevation_expires_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  terminated_at TIMESTAMPTZ,
  termination_reason TEXT
);

-- ============================================================================
-- Security Alerts Configuration Table
-- ============================================================================
CREATE TABLE auth_security.alert_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Alert Preferences
  email_alerts BOOLEAN DEFAULT true,
  sms_alerts BOOLEAN DEFAULT false,
  push_alerts BOOLEAN DEFAULT true,
  
  -- Alert Types
  alert_on_new_device BOOLEAN DEFAULT true,
  alert_on_suspicious_login BOOLEAN DEFAULT true,
  alert_on_password_change BOOLEAN DEFAULT true,
  alert_on_mfa_change BOOLEAN DEFAULT true,
  alert_on_failed_logins BOOLEAN DEFAULT true,
  alert_on_location_change BOOLEAN DEFAULT true,
  
  -- Alert Thresholds
  failed_login_threshold INTEGER DEFAULT 3,
  location_change_radius_km INTEGER DEFAULT 100,
  
  -- Contact Information
  alert_email TEXT,
  alert_phone TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================
CREATE INDEX idx_security_profiles_user_id ON auth_security.user_security_profiles(user_id);
CREATE INDEX idx_security_profiles_mfa_enabled ON auth_security.user_security_profiles(mfa_enabled);
CREATE INDEX idx_security_profiles_account_locked ON auth_security.user_security_profiles(account_locked);

CREATE INDEX idx_user_devices_user_id ON auth_security.user_devices(user_id);
CREATE INDEX idx_user_devices_fingerprint ON auth_security.user_devices(device_fingerprint);
CREATE INDEX idx_user_devices_trusted ON auth_security.user_devices(trusted);
CREATE INDEX idx_user_devices_trust_token ON auth_security.user_devices(trust_token);

CREATE INDEX idx_auth_attempts_email ON auth_security.auth_attempts(email);
CREATE INDEX idx_auth_attempts_user_id ON auth_security.auth_attempts(user_id);
CREATE INDEX idx_auth_attempts_created_at ON auth_security.auth_attempts(created_at DESC);
CREATE INDEX idx_auth_attempts_ip_address ON auth_security.auth_attempts(ip_address);

CREATE INDEX idx_audit_log_user_id ON auth_security.security_audit_log(user_id);
CREATE INDEX idx_audit_log_event_type ON auth_security.security_audit_log(event_type);
CREATE INDEX idx_audit_log_created_at ON auth_security.security_audit_log(created_at DESC);
CREATE INDEX idx_audit_log_severity ON auth_security.security_audit_log(event_severity);

CREATE INDEX idx_rate_limits_identifier ON auth_security.rate_limits(identifier, identifier_type);
CREATE INDEX idx_rate_limits_window_end ON auth_security.rate_limits(window_end);

CREATE INDEX idx_sessions_user_id ON auth_security.user_sessions(user_id);
CREATE INDEX idx_sessions_token ON auth_security.user_sessions(session_token);
CREATE INDEX idx_sessions_active ON auth_security.user_sessions(active);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================
ALTER TABLE auth_security.user_security_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_security.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_security.auth_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_security.security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_security.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_security.mfa_recovery_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_security.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_security.alert_configurations ENABLE ROW LEVEL SECURITY;

-- User Security Profiles Policies
CREATE POLICY "Users can view own security profile" ON auth_security.user_security_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own security profile" ON auth_security.user_security_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- User Devices Policies
CREATE POLICY "Users can view own devices" ON auth_security.user_devices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own devices" ON auth_security.user_devices
  FOR ALL USING (auth.uid() = user_id);

-- MFA Recovery Codes Policies
CREATE POLICY "Users can view own recovery codes" ON auth_security.mfa_recovery_codes
  FOR SELECT USING (auth.uid() = user_id);

-- User Sessions Policies
CREATE POLICY "Users can view own sessions" ON auth_security.user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can terminate own sessions" ON auth_security.user_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Alert Configurations Policies
CREATE POLICY "Users can manage own alert settings" ON auth_security.alert_configurations
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- Functions and Triggers
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION auth_security.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_security_profiles_updated_at
  BEFORE UPDATE ON auth_security.user_security_profiles
  FOR EACH ROW EXECUTE FUNCTION auth_security.update_updated_at_column();

CREATE TRIGGER update_user_devices_updated_at
  BEFORE UPDATE ON auth_security.user_devices
  FOR EACH ROW EXECUTE FUNCTION auth_security.update_updated_at_column();

CREATE TRIGGER update_rate_limits_updated_at
  BEFORE UPDATE ON auth_security.rate_limits
  FOR EACH ROW EXECUTE FUNCTION auth_security.update_updated_at_column();

CREATE TRIGGER update_alert_configurations_updated_at
  BEFORE UPDATE ON auth_security.alert_configurations
  FOR EACH ROW EXECUTE FUNCTION auth_security.update_updated_at_column();

-- Function to check rate limits
CREATE OR REPLACE FUNCTION auth_security.check_rate_limit(
  p_identifier TEXT,
  p_identifier_type TEXT,
  p_action_type TEXT,
  p_max_attempts INTEGER DEFAULT 5,
  p_window_minutes INTEGER DEFAULT 15
) RETURNS JSONB AS $$
DECLARE
  v_current_attempts INTEGER;
  v_window_start TIMESTAMPTZ;
  v_result JSONB;
BEGIN
  v_window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Count recent attempts
  SELECT COUNT(*) INTO v_current_attempts
  FROM auth_security.rate_limits
  WHERE identifier = p_identifier
    AND identifier_type = p_identifier_type
    AND action_type = p_action_type
    AND window_start >= v_window_start;
  
  -- Check if rate limit exceeded
  IF v_current_attempts >= p_max_attempts THEN
    -- Lock the identifier
    INSERT INTO auth_security.rate_limits (
      identifier, identifier_type, action_type,
      attempt_count, max_attempts, window_duration_minutes,
      locked, locked_until, lock_duration_minutes
    ) VALUES (
      p_identifier, p_identifier_type, p_action_type,
      v_current_attempts + 1, p_max_attempts, p_window_minutes,
      true, NOW() + (p_window_minutes || ' minutes')::INTERVAL, p_window_minutes
    );
    
    v_result := jsonb_build_object(
      'allowed', false,
      'remaining_attempts', 0,
      'reset_time', NOW() + (p_window_minutes || ' minutes')::INTERVAL,
      'locked', true
    );
  ELSE
    -- Record the attempt
    INSERT INTO auth_security.rate_limits (
      identifier, identifier_type, action_type,
      attempt_count, max_attempts, window_duration_minutes
    ) VALUES (
      p_identifier, p_identifier_type, p_action_type,
      1, p_max_attempts, p_window_minutes
    );
    
    v_result := jsonb_build_object(
      'allowed', true,
      'remaining_attempts', p_max_attempts - v_current_attempts - 1,
      'reset_time', v_window_start + (p_window_minutes || ' minutes')::INTERVAL,
      'locked', false
    );
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log security events
CREATE OR REPLACE FUNCTION auth_security.log_security_event(
  p_user_id UUID,
  p_event_type security_event_enum,
  p_severity severity_enum,
  p_event_data JSONB,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_device_fingerprint TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO auth_security.security_audit_log (
    user_id, event_type, event_severity, event_data,
    ip_address, user_agent, device_fingerprint
  ) VALUES (
    p_user_id, p_event_type, p_severity, p_event_data,
    p_ip_address, p_user_agent, p_device_fingerprint
  ) RETURNING id INTO v_log_id;
  
  -- Check if admin notification needed for high/critical events
  IF p_severity IN ('high', 'critical') THEN
    UPDATE auth_security.security_audit_log
    SET admin_notified = true, notification_sent_at = NOW()
    WHERE id = v_log_id;
  END IF;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate user risk score
CREATE OR REPLACE FUNCTION auth_security.calculate_risk_score(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_risk_score INTEGER := 0;
  v_failed_logins INTEGER;
  v_suspicious_devices INTEGER;
  v_location_changes INTEGER;
BEGIN
  -- Count recent failed login attempts
  SELECT COUNT(*) INTO v_failed_logins
  FROM auth_security.auth_attempts
  WHERE user_id = p_user_id
    AND success = false
    AND created_at >= NOW() - INTERVAL '7 days';
  
  v_risk_score := v_risk_score + (v_failed_logins * 5);
  
  -- Count suspicious devices
  SELECT COUNT(*) INTO v_suspicious_devices
  FROM auth_security.user_devices
  WHERE user_id = p_user_id
    AND suspicious_activity_count > 0;
  
  v_risk_score := v_risk_score + (v_suspicious_devices * 10);
  
  -- Count location changes
  SELECT COUNT(DISTINCT country_code) INTO v_location_changes
  FROM auth_security.auth_attempts
  WHERE user_id = p_user_id
    AND created_at >= NOW() - INTERVAL '30 days';
  
  IF v_location_changes > 3 THEN
    v_risk_score := v_risk_score + 15;
  END IF;
  
  -- Cap risk score at 100
  IF v_risk_score > 100 THEN
    v_risk_score := 100;
  END IF;
  
  -- Update user profile with new risk score
  UPDATE auth_security.user_security_profiles
  SET risk_score = v_risk_score, last_risk_assessment = NOW()
  WHERE user_id = p_user_id;
  
  RETURN v_risk_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Initial Data and Configuration
-- ============================================================================

-- Create default security profiles for existing users
INSERT INTO auth_security.user_security_profiles (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Create default alert configurations for existing users
INSERT INTO auth_security.alert_configurations (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- Grants for API Access
-- ============================================================================
GRANT USAGE ON SCHEMA auth_security TO authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA auth_security TO service_role;
GRANT SELECT, INSERT, UPDATE ON auth_security.user_security_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON auth_security.user_devices TO authenticated;
GRANT SELECT ON auth_security.mfa_recovery_codes TO authenticated;
GRANT SELECT, UPDATE ON auth_security.user_sessions TO authenticated;
GRANT ALL ON auth_security.alert_configurations TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION auth_security.check_rate_limit TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth_security.log_security_event TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth_security.calculate_risk_score TO authenticated, service_role;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- WS-147: Authentication Security System successfully created
-- Features enabled: MFA, device fingerprinting, rate limiting, security monitoring