-- Enhanced Security Audit Logging System
-- Comprehensive security event tracking and monitoring
-- 🔐 SECURITY MONITORING ENHANCEMENT

-- =============================================
-- ENHANCED SECURITY AUDIT LOGS TABLE
-- =============================================

-- Create enhanced security audit logs table
CREATE TABLE IF NOT EXISTS enhanced_security_audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID,
  event_type VARCHAR(100) NOT NULL,
  event_category VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  event_data JSONB NOT NULL DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  request_id VARCHAR(100),
  session_id VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  CONSTRAINT chk_event_type CHECK (event_type IN (
    'LOGIN_ATTEMPT', 'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT',
    'PASSWORD_CHANGE', 'ACCOUNT_LOCKOUT', 'PRIVILEGE_ESCALATION_ATTEMPT',
    'UNAUTHORIZED_ACCESS_ATTEMPT', 'DATA_ACCESS', 'DATA_MODIFICATION', 
    'DATA_DELETION', 'EXPORT_DATA', 'ADMIN_ACTION', 'API_KEY_USAGE',
    'RATE_LIMIT_EXCEEDED', 'SUSPICIOUS_ACTIVITY', 'SECURITY_POLICY_VIOLATION',
    'CSRF_ATTACK_BLOCKED', 'XSS_ATTEMPT_BLOCKED', 'SQL_INJECTION_ATTEMPT',
    'FILE_UPLOAD', 'PAYMENT_EVENT', 'CONFIGURATION_CHANGE', 'SYSTEM_ERROR',
    'PERFORMANCE_ANOMALY'
  )),
  
  CONSTRAINT chk_event_category CHECK (event_category IN (
    'AUTHENTICATION', 'AUTHORIZATION', 'DATA_ACCESS', 'SYSTEM_SECURITY',
    'COMPLIANCE', 'PERFORMANCE', 'BUSINESS_LOGIC', 'INFRASTRUCTURE'
  ))
);

-- Enable RLS
ALTER TABLE enhanced_security_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "org_audit_logs_read" 
  ON enhanced_security_audit_logs FOR SELECT 
  USING (
    organization_id = (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() 
      LIMIT 1
    )
    AND (
      SELECT role IN ('ADMIN', 'OWNER') FROM user_profiles 
      WHERE user_id = auth.uid() 
      LIMIT 1
    )
  );

-- Only system can insert audit logs (via service role)
CREATE POLICY "system_audit_logs_insert" 
  ON enhanced_security_audit_logs FOR INSERT 
  WITH CHECK (true); -- System-level inserts only

-- =============================================
-- SECURITY MONITORING VIEWS
-- =============================================

-- Real-time security dashboard view
CREATE OR REPLACE VIEW security_dashboard_summary AS
SELECT 
  organization_id,
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE severity = 'CRITICAL') as critical_events,
  COUNT(*) FILTER (WHERE severity = 'HIGH') as high_events,
  COUNT(*) FILTER (WHERE severity = 'MEDIUM') as medium_events,
  COUNT(*) FILTER (WHERE severity = 'LOW') as low_events,
  COUNT(*) FILTER (WHERE event_category = 'AUTHENTICATION') as auth_events,
  COUNT(*) FILTER (WHERE event_category = 'AUTHORIZATION') as authz_events,
  COUNT(*) FILTER (WHERE event_category = 'DATA_ACCESS') as data_events,
  COUNT(*) FILTER (WHERE event_type = 'LOGIN_FAILURE') as failed_logins,
  COUNT(*) FILTER (WHERE event_type = 'UNAUTHORIZED_ACCESS_ATTEMPT') as unauthorized_attempts,
  COUNT(DISTINCT ip_address) as unique_ips,
  MAX(created_at) as last_event_time
FROM enhanced_security_audit_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY organization_id;

-- Security incidents view (high severity events)
CREATE OR REPLACE VIEW security_incidents AS
SELECT 
  id,
  organization_id,
  user_id,
  event_type,
  event_category,
  severity,
  event_data,
  ip_address,
  user_agent,
  created_at,
  -- Additional computed fields
  CASE 
    WHEN event_type IN ('LOGIN_FAILURE', 'UNAUTHORIZED_ACCESS_ATTEMPT') 
         AND created_at >= NOW() - INTERVAL '1 hour'
    THEN 'ACTIVE_THREAT'
    WHEN severity = 'CRITICAL'
    THEN 'CRITICAL_INCIDENT'
    WHEN severity = 'HIGH'
    THEN 'HIGH_PRIORITY'
    ELSE 'STANDARD'
  END as incident_priority,
  
  -- Risk score calculation
  CASE severity
    WHEN 'CRITICAL' THEN 100
    WHEN 'HIGH' THEN 75
    WHEN 'MEDIUM' THEN 50
    ELSE 25
  END as risk_score
FROM enhanced_security_audit_logs
WHERE severity IN ('HIGH', 'CRITICAL')
   OR event_type IN ('SUSPICIOUS_ACTIVITY', 'UNAUTHORIZED_ACCESS_ATTEMPT', 'SECURITY_POLICY_VIOLATION')
ORDER BY created_at DESC;

-- =============================================
-- SECURITY ALERT FUNCTIONS
-- =============================================

-- Function to detect suspicious IP patterns
CREATE OR REPLACE FUNCTION detect_suspicious_ip_activity()
RETURNS TABLE(
  ip_address INET,
  organization_id UUID,
  event_count BIGINT,
  failed_login_count BIGINT,
  unique_users_targeted BIGINT,
  risk_level TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    logs.ip_address,
    logs.organization_id,
    COUNT(*) as event_count,
    COUNT(*) FILTER (WHERE logs.event_type = 'LOGIN_FAILURE') as failed_login_count,
    COUNT(DISTINCT logs.user_id) as unique_users_targeted,
    CASE 
      WHEN COUNT(*) FILTER (WHERE logs.event_type = 'LOGIN_FAILURE') > 10 THEN 'HIGH'
      WHEN COUNT(DISTINCT logs.user_id) > 5 THEN 'MEDIUM'
      WHEN COUNT(*) > 20 THEN 'MEDIUM'
      ELSE 'LOW'
    END as risk_level
  FROM enhanced_security_audit_logs logs
  WHERE logs.created_at >= NOW() - INTERVAL '1 hour'
    AND logs.ip_address IS NOT NULL
  GROUP BY logs.ip_address, logs.organization_id
  HAVING COUNT(*) > 5 -- Only IPs with significant activity
  ORDER BY event_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate security alerts
CREATE OR REPLACE FUNCTION generate_security_alerts(org_id UUID DEFAULT NULL)
RETURNS TABLE(
  alert_id UUID,
  organization_id UUID,
  alert_type TEXT,
  severity TEXT,
  message TEXT,
  event_count BIGINT,
  first_seen TIMESTAMP WITH TIME ZONE,
  last_seen TIMESTAMP WITH TIME ZONE,
  affected_users BIGINT,
  recommendations TEXT[]
) AS $$
DECLARE
  time_window INTERVAL := INTERVAL '1 hour';
BEGIN
  -- Multiple failed logins alert
  RETURN QUERY
  SELECT 
    uuid_generate_v4() as alert_id,
    logs.organization_id,
    'MULTIPLE_FAILED_LOGINS' as alert_type,
    'HIGH' as severity,
    FORMAT('Multiple failed login attempts detected from IP %s', logs.ip_address::TEXT) as message,
    COUNT(*) as event_count,
    MIN(logs.created_at) as first_seen,
    MAX(logs.created_at) as last_seen,
    COUNT(DISTINCT logs.user_id) as affected_users,
    ARRAY['Block suspicious IP', 'Enable account lockout', 'Investigate user accounts'] as recommendations
  FROM enhanced_security_audit_logs logs
  WHERE logs.event_type = 'LOGIN_FAILURE'
    AND logs.created_at >= NOW() - time_window
    AND (org_id IS NULL OR logs.organization_id = org_id)
  GROUP BY logs.organization_id, logs.ip_address
  HAVING COUNT(*) >= 5;

  -- Privilege escalation attempts
  RETURN QUERY
  SELECT 
    uuid_generate_v4() as alert_id,
    logs.organization_id,
    'PRIVILEGE_ESCALATION' as alert_type,
    'CRITICAL' as severity,
    'Privilege escalation attempts detected' as message,
    COUNT(*) as event_count,
    MIN(logs.created_at) as first_seen,
    MAX(logs.created_at) as last_seen,
    COUNT(DISTINCT logs.user_id) as affected_users,
    ARRAY['Review user permissions', 'Investigate user activity', 'Enable additional monitoring'] as recommendations
  FROM enhanced_security_audit_logs logs
  WHERE logs.event_type IN ('PRIVILEGE_ESCALATION_ATTEMPT', 'UNAUTHORIZED_ACCESS_ATTEMPT')
    AND logs.created_at >= NOW() - time_window
    AND (org_id IS NULL OR logs.organization_id = org_id)
  GROUP BY logs.organization_id
  HAVING COUNT(*) >= 3;

  -- Suspicious data access patterns
  RETURN QUERY
  SELECT 
    uuid_generate_v4() as alert_id,
    logs.organization_id,
    'SUSPICIOUS_DATA_ACCESS' as alert_type,
    'MEDIUM' as severity,
    'Unusual data access patterns detected' as message,
    COUNT(*) as event_count,
    MIN(logs.created_at) as first_seen,
    MAX(logs.created_at) as last_seen,
    COUNT(DISTINCT logs.user_id) as affected_users,
    ARRAY['Review data access logs', 'Verify user permissions', 'Monitor data export activity'] as recommendations
  FROM enhanced_security_audit_logs logs
  WHERE logs.event_type IN ('DATA_ACCESS', 'EXPORT_DATA')
    AND logs.created_at >= NOW() - time_window
    AND (org_id IS NULL OR logs.organization_id = org_id)
  GROUP BY logs.organization_id, logs.user_id
  HAVING COUNT(*) >= 50; -- High volume data access
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- PERFORMANCE INDEXES
-- =============================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_enhanced_audit_org_time ON enhanced_security_audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enhanced_audit_severity_time ON enhanced_security_audit_logs(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enhanced_audit_event_type ON enhanced_security_audit_logs(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enhanced_audit_event_category ON enhanced_security_audit_logs(event_category, created_at DESC);

-- Security-specific indexes
CREATE INDEX IF NOT EXISTS idx_enhanced_audit_ip_time ON enhanced_security_audit_logs(ip_address, created_at DESC) WHERE ip_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_enhanced_audit_user_time ON enhanced_security_audit_logs(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_enhanced_audit_failed_logins ON enhanced_security_audit_logs(organization_id, ip_address, created_at DESC) 
  WHERE event_type = 'LOGIN_FAILURE';

-- GIN index for JSONB event_data queries
CREATE INDEX IF NOT EXISTS idx_enhanced_audit_event_data_gin ON enhanced_security_audit_logs USING GIN(event_data);
CREATE INDEX IF NOT EXISTS idx_enhanced_audit_metadata_gin ON enhanced_security_audit_logs USING GIN(metadata);

-- =============================================
-- AUTOMATED CLEANUP
-- =============================================

-- Function to clean up old audit logs (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM enhanced_security_audit_logs
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the cleanup operation
  INSERT INTO enhanced_security_audit_logs (
    event_type,
    event_category,
    severity,
    event_data
  ) VALUES (
    'SYSTEM_MAINTENANCE',
    'INFRASTRUCTURE',
    'LOW',
    jsonb_build_object(
      'operation', 'audit_log_cleanup',
      'deleted_records', deleted_count,
      'retention_days', retention_days
    )
  );
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup job (can be called by cron or application scheduler)
-- This is just the function - actual scheduling would be done externally
COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Cleans up audit logs older than specified days. Should be called regularly by scheduler.';

-- =============================================
-- SECURITY MONITORING TRIGGERS
-- =============================================

-- Trigger to detect and log unusual patterns in real-time
CREATE OR REPLACE FUNCTION security_pattern_detector()
RETURNS TRIGGER AS $$
DECLARE
  recent_similar_events INTEGER;
  suspicious_threshold INTEGER := 5;
BEGIN
  -- Check for rapid repeated events from same IP
  IF NEW.ip_address IS NOT NULL THEN
    SELECT COUNT(*)
    INTO recent_similar_events
    FROM enhanced_security_audit_logs
    WHERE ip_address = NEW.ip_address
      AND event_type = NEW.event_type
      AND created_at >= NOW() - INTERVAL '5 minutes';
    
    -- If too many similar events, log as suspicious
    IF recent_similar_events >= suspicious_threshold THEN
      INSERT INTO enhanced_security_audit_logs (
        organization_id,
        event_type,
        event_category,
        severity,
        event_data,
        ip_address
      ) VALUES (
        NEW.organization_id,
        'SUSPICIOUS_ACTIVITY',
        'SYSTEM_SECURITY',
        'HIGH',
        jsonb_build_object(
          'pattern_type', 'rapid_repeated_events',
          'original_event_type', NEW.event_type,
          'event_count', recent_similar_events,
          'time_window_minutes', 5
        ),
        NEW.ip_address
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply the pattern detector trigger
CREATE TRIGGER security_pattern_detection_trigger
  AFTER INSERT ON enhanced_security_audit_logs
  FOR EACH ROW EXECUTE FUNCTION security_pattern_detector();

-- =============================================
-- VALIDATION AND TESTING
-- =============================================

-- Test that the enhanced audit system is working
DO $$
BEGIN
  -- Insert a test log entry
  INSERT INTO enhanced_security_audit_logs (
    event_type,
    event_category,
    severity,
    event_data
  ) VALUES (
    'SYSTEM_ERROR',
    'INFRASTRUCTURE',
    'LOW',
    '{"test": "Enhanced audit system initialization", "version": "2.0"}'
  );
  
  RAISE NOTICE 'Enhanced security audit system successfully initialized';
  RAISE NOTICE 'Created enhanced_security_audit_logs table with RLS policies';
  RAISE NOTICE 'Created security monitoring views and functions';
  RAISE NOTICE 'Created automated pattern detection triggers';
  RAISE NOTICE 'Security audit system ready for use';
END $$;