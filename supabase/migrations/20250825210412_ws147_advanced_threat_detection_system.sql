-- WS-147 Advanced Threat Detection & Adaptive Security System
-- Migration for advanced security analytics tables and ML behavior analysis
-- Generated: 2025-08-25 | Team: C | Batch: 12 | Round: 2

-- Security audit log table (if not exists)
CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_severity TEXT NOT NULL CHECK (event_severity IN ('low', 'medium', 'high', 'critical')),
  event_data JSONB,
  ip_address INET,
  user_agent TEXT,
  device_fingerprint TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for performance
  CONSTRAINT valid_event_types CHECK (
    event_type IN (
      'login_attempt', 
      'failed_login', 
      'suspicious_activity', 
      'device_change', 
      'location_anomaly',
      'behavior_anomaly',
      'adaptive_security_adjustment',
      'threat_detected',
      'data_access_anomaly'
    )
  )
);

-- User security profiles table
CREATE TABLE IF NOT EXISTS user_security_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_method TEXT, -- 'totp', 'sms', 'email'
  password_changed_at TIMESTAMPTZ DEFAULT NOW(),
  last_successful_login TIMESTAMPTZ,
  failed_login_count INTEGER DEFAULT 0,
  account_locked_until TIMESTAMPTZ,
  security_questions_set BOOLEAN DEFAULT false,
  backup_codes_generated BOOLEAN DEFAULT false,
  trusted_devices INTEGER DEFAULT 0,
  risk_score NUMERIC DEFAULT 0,
  behavior_baseline JSONB, -- Stores normal behavior patterns
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User devices table for device tracking
CREATE TABLE IF NOT EXISTS user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT,
  device_type TEXT, -- 'desktop', 'mobile', 'tablet'
  browser_info JSONB,
  location_data JSONB,
  trusted BOOLEAN DEFAULT false,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  access_count INTEGER DEFAULT 1,
  
  UNIQUE(user_id, device_fingerprint)
);

-- Auth attempts table for tracking all authentication attempts
CREATE TABLE IF NOT EXISTS auth_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_type TEXT NOT NULL, -- 'login', 'mfa', 'password_reset'
  success BOOLEAN NOT NULL,
  ip_address INET,
  user_agent TEXT,
  device_fingerprint TEXT,
  location_data JSONB,
  session_duration INTEGER, -- in seconds, null if failed
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Advanced security analytics tables for WS-147
CREATE TABLE IF NOT EXISTS behavior_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  
  -- Behavioral metrics
  session_duration INTEGER,
  actions_per_minute NUMERIC,
  click_patterns JSONB,
  typing_metrics JSONB,
  mouse_patterns JSONB,
  
  -- Context data
  is_wedding_day BOOLEAN DEFAULT false,
  venue_location JSONB,
  network_type TEXT CHECK (network_type IN ('public', 'private', 'cellular')),
  time_context TEXT CHECK (time_context IN ('morning', 'afternoon', 'evening', 'night')),
  
  -- Risk assessment
  behavior_score NUMERIC CHECK (behavior_score >= 0 AND behavior_score <= 1),
  anomaly_flags TEXT[],
  risk_factors JSONB,
  
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Machine learning training data
CREATE TABLE IF NOT EXISTS ml_training_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_vector JSONB NOT NULL,
  label TEXT NOT NULL CHECK (label IN ('normal', 'suspicious', 'malicious')),
  confidence_score NUMERIC CHECK (confidence_score >= 0 AND confidence_score <= 1),
  model_version TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security contexts table for adaptive security
CREATE TABLE IF NOT EXISTS security_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  context_data JSONB NOT NULL,
  security_config JSONB NOT NULL,
  active_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wedding events table for context-aware security (if not exists)
CREATE TABLE IF NOT EXISTS wedding_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES auth.users(id),
  photographer_id UUID REFERENCES auth.users(id),
  planner_id UUID REFERENCES auth.users(id),
  vendor_id UUID REFERENCES auth.users(id),
  event_name TEXT NOT NULL,
  event_date DATE NOT NULL,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  venue_location JSONB,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Threat intelligence table
CREATE TABLE IF NOT EXISTS threat_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  threat_type TEXT NOT NULL,
  threat_indicators JSONB NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT,
  source TEXT,
  confidence_score NUMERIC CHECK (confidence_score >= 0 AND confidence_score <= 1),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security alerts table
CREATE TABLE IF NOT EXISTS security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  alert_data JSONB,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id_created_at 
ON security_audit_log(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_type_severity 
ON security_audit_log(event_type, event_severity);

CREATE INDEX IF NOT EXISTS idx_user_security_profiles_user_id 
ON user_security_profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_user_devices_user_id 
ON user_devices(user_id);

CREATE INDEX IF NOT EXISTS idx_user_devices_fingerprint 
ON user_devices(device_fingerprint);

CREATE INDEX IF NOT EXISTS idx_auth_attempts_user_id_created_at 
ON auth_attempts(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_auth_attempts_success 
ON auth_attempts(success, created_at);

CREATE INDEX IF NOT EXISTS idx_behavior_analytics_user_id_recorded_at 
ON behavior_analytics(user_id, recorded_at);

CREATE INDEX IF NOT EXISTS idx_behavior_analytics_behavior_score 
ON behavior_analytics(behavior_score);

CREATE INDEX IF NOT EXISTS idx_ml_training_data_user_id 
ON ml_training_data(user_id);

CREATE INDEX IF NOT EXISTS idx_ml_training_data_label 
ON ml_training_data(label, created_at);

CREATE INDEX IF NOT EXISTS idx_security_contexts_user_id 
ON security_contexts(user_id, active_until);

CREATE INDEX IF NOT EXISTS idx_wedding_events_date_participants 
ON wedding_events(event_date, photographer_id, planner_id, vendor_id);

CREATE INDEX IF NOT EXISTS idx_threat_intelligence_type_severity 
ON threat_intelligence(threat_type, severity);

CREATE INDEX IF NOT EXISTS idx_security_alerts_user_id_status 
ON security_alerts(user_id, status, created_at);

-- Row Level Security (RLS) policies

-- Security audit log - users can only see their own logs, admins see all
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own security logs" ON security_audit_log
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all security logs" ON security_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('admin', 'security_admin')
    )
  );

-- User security profiles - users can view/update their own profile
ALTER TABLE user_security_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own security profile" ON user_security_profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own security profile" ON user_security_profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own security profile" ON user_security_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- User devices - users can view their own devices
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own devices" ON user_devices
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own devices" ON user_devices
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own devices" ON user_devices
  FOR UPDATE USING (user_id = auth.uid());

-- Auth attempts - users can view their own attempts, admins see all
ALTER TABLE auth_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own auth attempts" ON auth_attempts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert auth attempts" ON auth_attempts
  FOR INSERT WITH CHECK (true);

-- Behavior analytics - restricted access
ALTER TABLE behavior_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own behavior analytics" ON behavior_analytics
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Security system can insert behavior analytics" ON behavior_analytics
  FOR INSERT WITH CHECK (true);

-- ML training data - restricted to system and security admins
ALTER TABLE ml_training_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Security admins can access ML training data" ON ml_training_data
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('admin', 'security_admin', 'ml_admin')
    )
  );

-- Security contexts - users can view their own contexts
ALTER TABLE security_contexts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own security contexts" ON security_contexts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can manage security contexts" ON security_contexts
  FOR ALL WITH CHECK (true);

-- Wedding events - participants can view relevant events
ALTER TABLE wedding_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their wedding events" ON wedding_events
  FOR SELECT USING (
    couple_id = auth.uid() OR 
    photographer_id = auth.uid() OR 
    planner_id = auth.uid() OR 
    vendor_id = auth.uid()
  );

-- Threat intelligence - restricted to security personnel
ALTER TABLE threat_intelligence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Security personnel can access threat intelligence" ON threat_intelligence
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('admin', 'security_admin', 'security_analyst')
    )
  );

-- Security alerts - users see their alerts, security personnel see all
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their security alerts" ON security_alerts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Security personnel can view all alerts" ON security_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('admin', 'security_admin', 'security_analyst')
    )
  );

-- Functions for advanced security analytics

-- Function to calculate user risk score
CREATE OR REPLACE FUNCTION calculate_user_risk_score(target_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  risk_score NUMERIC := 0;
  failed_logins INTEGER;
  mfa_enabled BOOLEAN;
  password_age INTEGER;
  recent_security_events INTEGER;
BEGIN
  -- Count failed logins in last 24 hours
  SELECT COUNT(*) INTO failed_logins
  FROM auth_attempts
  WHERE user_id = target_user_id
    AND success = false
    AND created_at > NOW() - INTERVAL '24 hours';
  
  risk_score := risk_score + LEAST(failed_logins * 5, 25);
  
  -- Check MFA status
  SELECT COALESCE(mfa_enabled, false) INTO mfa_enabled
  FROM user_security_profiles
  WHERE user_id = target_user_id;
  
  IF NOT mfa_enabled THEN
    risk_score := risk_score + 30;
  END IF;
  
  -- Check password age
  SELECT EXTRACT(EPOCH FROM (NOW() - password_changed_at))/86400 INTO password_age
  FROM user_security_profiles
  WHERE user_id = target_user_id;
  
  IF password_age > 90 THEN
    risk_score := risk_score + 20;
  END IF;
  
  -- Count recent high/critical security events
  SELECT COUNT(*) INTO recent_security_events
  FROM security_audit_log
  WHERE user_id = target_user_id
    AND event_severity IN ('high', 'critical')
    AND created_at > NOW() - INTERVAL '7 days';
  
  risk_score := risk_score + recent_security_events * 10;
  
  RETURN LEAST(risk_score, 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to detect behavioral anomalies
CREATE OR REPLACE FUNCTION detect_behavior_anomaly(
  target_user_id UUID,
  session_data JSONB
) RETURNS JSONB AS $$
DECLARE
  anomaly_score NUMERIC := 0;
  anomaly_factors TEXT[] := '{}';
  user_baseline JSONB;
  current_hour INTEGER;
  avg_session_duration NUMERIC;
  avg_actions_per_minute NUMERIC;
BEGIN
  current_hour := EXTRACT(HOUR FROM NOW());
  
  -- Get user's behavior baseline
  SELECT behavior_baseline INTO user_baseline
  FROM user_security_profiles
  WHERE user_id = target_user_id;
  
  -- Calculate averages from recent behavior
  SELECT 
    AVG(session_duration),
    AVG(actions_per_minute)
  INTO avg_session_duration, avg_actions_per_minute
  FROM behavior_analytics
  WHERE user_id = target_user_id
    AND recorded_at > NOW() - INTERVAL '30 days';
  
  -- Check time anomaly
  IF current_hour < 6 OR current_hour > 23 THEN
    anomaly_score := anomaly_score + 0.2;
    anomaly_factors := array_append(anomaly_factors, 'unusual_time');
  END IF;
  
  -- Check session duration anomaly
  IF (session_data->>'session_duration')::INTEGER > (avg_session_duration * 3) THEN
    anomaly_score := anomaly_score + 0.3;
    anomaly_factors := array_append(anomaly_factors, 'unusual_session_duration');
  END IF;
  
  -- Check actions per minute anomaly
  IF (session_data->>'actions_per_minute')::NUMERIC > (avg_actions_per_minute * 5) THEN
    anomaly_score := anomaly_score + 0.4;
    anomaly_factors := array_append(anomaly_factors, 'rapid_actions');
  END IF;
  
  RETURN jsonb_build_object(
    'anomaly_score', LEAST(anomaly_score, 1.0),
    'anomaly_factors', anomaly_factors,
    'risk_level', 
    CASE 
      WHEN anomaly_score >= 0.8 THEN 'critical'
      WHEN anomaly_score >= 0.6 THEN 'high'
      WHEN anomaly_score >= 0.4 THEN 'medium'
      ELSE 'low'
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update user security profiles
CREATE OR REPLACE FUNCTION update_security_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_security_profile_updated_at
  BEFORE UPDATE ON user_security_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_security_profile_updated_at();

-- Views for security analytics

-- View for security dashboard
CREATE OR REPLACE VIEW security_dashboard AS
SELECT
  u.id as user_id,
  u.email,
  usp.risk_score,
  usp.mfa_enabled,
  usp.failed_login_count,
  usp.last_successful_login,
  COUNT(CASE WHEN sal.event_severity = 'critical' THEN 1 END) as critical_events_7d,
  COUNT(CASE WHEN sal.event_severity = 'high' THEN 1 END) as high_events_7d,
  COUNT(ud.id) as trusted_devices,
  MAX(ba.behavior_score) as max_behavior_score_30d
FROM auth.users u
LEFT JOIN user_security_profiles usp ON u.id = usp.user_id
LEFT JOIN security_audit_log sal ON u.id = sal.user_id 
  AND sal.created_at > NOW() - INTERVAL '7 days'
LEFT JOIN user_devices ud ON u.id = ud.user_id AND ud.trusted = true
LEFT JOIN behavior_analytics ba ON u.id = ba.user_id 
  AND ba.recorded_at > NOW() - INTERVAL '30 days'
GROUP BY u.id, u.email, usp.risk_score, usp.mfa_enabled, 
         usp.failed_login_count, usp.last_successful_login;

-- Grant appropriate permissions
GRANT SELECT ON security_dashboard TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_user_risk_score(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION detect_behavior_anomaly(UUID, JSONB) TO authenticated;

-- Insert default security profile for existing users
INSERT INTO user_security_profiles (user_id, mfa_enabled)
SELECT id, false FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_security_profiles WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;

COMMENT ON TABLE security_audit_log IS 'Comprehensive security event logging for WS-147 advanced threat detection';
COMMENT ON TABLE behavior_analytics IS 'ML behavior analysis data for anomaly detection';
COMMENT ON TABLE ml_training_data IS 'Machine learning training data for behavior models';
COMMENT ON TABLE security_contexts IS 'Adaptive security context storage';
COMMENT ON FUNCTION calculate_user_risk_score(UUID) IS 'Calculates comprehensive user risk score';
COMMENT ON FUNCTION detect_behavior_anomaly(UUID, JSONB) IS 'ML-powered behavioral anomaly detection';