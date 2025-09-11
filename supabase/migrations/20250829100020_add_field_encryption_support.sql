-- WS-175 Advanced Data Encryption - Database Migration
-- Team B - Round 1 Implementation
-- 
-- Creates tables and infrastructure for field-level encryption
-- GDPR compliance and 90-day key rotation support

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- ENCRYPTION KEYS TABLE
-- =============================================
-- Stores encryption key metadata (never actual keys)
CREATE TABLE encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash TEXT NOT NULL UNIQUE, -- Hash of the actual key for verification
  status TEXT NOT NULL CHECK (status IN ('active', 'rotating', 'deprecated')) DEFAULT 'active',
  algorithm TEXT NOT NULL DEFAULT 'aes-256-gcm',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days'),
  rotation_scheduled_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Constraints
  CONSTRAINT valid_expiry CHECK (expires_at > created_at),
  CONSTRAINT valid_rotation_schedule CHECK (
    rotation_scheduled_at IS NULL OR rotation_scheduled_at > created_at
  )
);

-- Create indexes for performance
CREATE INDEX idx_encryption_keys_status ON encryption_keys(status);
CREATE INDEX idx_encryption_keys_expires_at ON encryption_keys(expires_at);
CREATE INDEX idx_encryption_keys_created_at ON encryption_keys(created_at);

-- Enable RLS
ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies for encryption_keys
CREATE POLICY "Service role can manage encryption keys" ON encryption_keys
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Authenticated users can view active keys" ON encryption_keys
  FOR SELECT USING (
    auth.role() = 'authenticated' AND status = 'active'
  );

-- =============================================
-- ENCRYPTION AUDIT TABLE
-- =============================================
-- Logs all encryption/decryption operations for security auditing
CREATE TABLE encryption_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  field_type TEXT,
  key_id UUID REFERENCES encryption_keys(id) ON DELETE SET NULL,
  success BOOLEAN NOT NULL DEFAULT TRUE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Constraints
  CONSTRAINT valid_action CHECK (action IN (
    'FIELD_ENCRYPTED',
    'FIELD_DECRYPTED', 
    'BULK_ENCRYPTION_COMPLETED',
    'BULK_DECRYPTION_COMPLETED',
    'BULK_ENCRYPTION_FAILED',
    'BULK_DECRYPTION_FAILED',
    'KEY_GENERATED',
    'KEY_ROTATED',
    'KEY_DEPRECATED',
    'KEY_ROTATION_SCHEDULED',
    'KEY_ROTATION_FAILED',
    'KEY_HEALTH_CHECK',
    'KEY_HEALTH_CHECK_FAILED',
    'ENCRYPTION_FAILED',
    'DECRYPTION_FAILED',
    'UNAUTHORIZED_ACCESS',
    'GDPR_DATA_REQUEST',
    'GDPR_DATA_DELETION',
    'GDPR_BULK_DATA_DELETION',
    'GDPR_DATA_DELETION_FAILED',
    'FIELD_UPDATED',
    'FIELD_UPDATE_FAILED'
  )),
  CONSTRAINT valid_field_type CHECK (field_type IS NULL OR field_type IN (
    'email', 'phone', 'notes', 'address', 'dietary_requirements', 
    'contact_info', 'personal_details'
  ))
);

-- Create indexes for audit queries and performance
CREATE INDEX idx_encryption_audit_user_id ON encryption_audit(user_id);
CREATE INDEX idx_encryption_audit_action ON encryption_audit(action);
CREATE INDEX idx_encryption_audit_timestamp ON encryption_audit(timestamp DESC);
CREATE INDEX idx_encryption_audit_success ON encryption_audit(success);
CREATE INDEX idx_encryption_audit_key_id ON encryption_audit(key_id);
CREATE INDEX idx_encryption_audit_field_type ON encryption_audit(field_type);

-- Composite indexes for common query patterns
CREATE INDEX idx_encryption_audit_user_action_time ON encryption_audit(user_id, action, timestamp DESC);
CREATE INDEX idx_encryption_audit_failed_operations ON encryption_audit(success, timestamp DESC) 
  WHERE success = FALSE;

-- Enable RLS
ALTER TABLE encryption_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies for encryption_audit
CREATE POLICY "Service role can manage audit logs" ON encryption_audit
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view their own audit logs" ON encryption_audit
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all audit logs" ON encryption_audit
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- GDPR COMPLIANCE TABLE
-- =============================================
-- Tracks data processing activities for GDPR Article 30 compliance
CREATE TABLE gdpr_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_subject_id UUID NOT NULL, -- References the person whose data is encrypted
  field_type TEXT NOT NULL CHECK (field_type IN (
    'email', 'phone', 'notes', 'address', 'dietary_requirements', 
    'contact_info', 'personal_details'
  )),
  encryption_key_id UUID NOT NULL REFERENCES encryption_keys(id) ON DELETE CASCADE,
  legal_basis TEXT NOT NULL DEFAULT 'consent',
  consent_timestamp TIMESTAMPTZ,
  retention_period INTEGER NOT NULL DEFAULT 2555, -- 7 years in days
  scheduled_deletion TIMESTAMPTZ GENERATED ALWAYS AS (
    COALESCE(consent_timestamp, NOW()) + (retention_period || ' days')::INTERVAL
  ) STORED,
  processing_purpose TEXT NOT NULL DEFAULT 'Wedding planning services',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_legal_basis CHECK (legal_basis IN (
    'consent', 'contract', 'legal_obligation', 'vital_interests', 
    'public_task', 'legitimate_interests'
  )),
  CONSTRAINT valid_retention_period CHECK (retention_period > 0 AND retention_period <= 3650), -- Max 10 years
  CONSTRAINT consent_required_for_consent_basis CHECK (
    legal_basis != 'consent' OR consent_timestamp IS NOT NULL
  )
);

-- Create indexes
CREATE INDEX idx_gdpr_compliance_data_subject ON gdpr_compliance(data_subject_id);
CREATE INDEX idx_gdpr_compliance_field_type ON gdpr_compliance(field_type);
CREATE INDEX idx_gdpr_compliance_scheduled_deletion ON gdpr_compliance(scheduled_deletion);
CREATE INDEX idx_gdpr_compliance_encryption_key ON gdpr_compliance(encryption_key_id);

-- Unique constraint to prevent duplicate records
CREATE UNIQUE INDEX idx_gdpr_compliance_unique ON gdpr_compliance(data_subject_id, field_type);

-- Enable RLS
ALTER TABLE gdpr_compliance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gdpr_compliance
CREATE POLICY "Service role can manage GDPR records" ON gdpr_compliance
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view their own GDPR records" ON gdpr_compliance
  FOR SELECT USING (auth.uid()::TEXT = data_subject_id::TEXT);

CREATE POLICY "Admins can view all GDPR records" ON gdpr_compliance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- ADD ENCRYPTED COLUMNS TO EXISTING TABLES
-- =============================================
-- Add encrypted field columns to user_profiles table
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS encrypted_email JSONB,
  ADD COLUMN IF NOT EXISTS encrypted_phone JSONB,
  ADD COLUMN IF NOT EXISTS encrypted_notes JSONB,
  ADD COLUMN IF NOT EXISTS encrypted_address JSONB,
  ADD COLUMN IF NOT EXISTS encrypted_dietary JSONB,
  ADD COLUMN IF NOT EXISTS encrypted_contact JSONB,
  ADD COLUMN IF NOT EXISTS encrypted_personal JSONB;

-- Create indexes on encrypted columns for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_encrypted_email ON user_profiles 
  USING GIN (encrypted_email) WHERE encrypted_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_profiles_encrypted_phone ON user_profiles 
  USING GIN (encrypted_phone) WHERE encrypted_phone IS NOT NULL;

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to get encryption audit statistics
CREATE OR REPLACE FUNCTION get_encryption_audit_statistics(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
) RETURNS TABLE (
  total_events BIGINT,
  successful_operations BIGINT,
  failed_operations BIGINT,
  encryption_events BIGINT,
  decryption_events BIGINT,
  key_rotation_events BIGINT,
  gdpr_events BIGINT,
  suspicious_activity BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE success = TRUE) as successful_operations,
    COUNT(*) FILTER (WHERE success = FALSE) as failed_operations,
    COUNT(*) FILTER (WHERE action LIKE '%ENCRYPT%') as encryption_events,
    COUNT(*) FILTER (WHERE action LIKE '%DECRYPT%') as decryption_events,
    COUNT(*) FILTER (WHERE action LIKE '%KEY_ROTAT%') as key_rotation_events,
    COUNT(*) FILTER (WHERE action LIKE 'GDPR_%') as gdpr_events,
    COUNT(*) FILTER (WHERE 
      success = FALSE AND action IN ('UNAUTHORIZED_ACCESS', 'DECRYPTION_FAILED')
    ) as suspicious_activity
  FROM encryption_audit
  WHERE timestamp BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old audit logs (for GDPR compliance)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(
  retention_days INTEGER DEFAULT 2555
) RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM encryption_audit 
  WHERE timestamp < (NOW() - (retention_days || ' days')::INTERVAL);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the cleanup operation
  INSERT INTO encryption_audit (action, user_id, success, metadata)
  VALUES (
    'AUDIT_LOG_CLEANUP',
    NULL,
    TRUE,
    jsonb_build_object('deleted_count', deleted_count, 'retention_days', retention_days)
  );
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to identify records scheduled for GDPR deletion
CREATE OR REPLACE FUNCTION get_gdpr_deletion_candidates()
RETURNS TABLE (
  data_subject_id UUID,
  field_type TEXT,
  scheduled_deletion TIMESTAMPTZ,
  days_until_deletion INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gc.data_subject_id,
    gc.field_type,
    gc.scheduled_deletion,
    EXTRACT(days FROM (gc.scheduled_deletion - NOW()))::INTEGER as days_until_deletion
  FROM gdpr_compliance gc
  WHERE gc.scheduled_deletion <= (NOW() + INTERVAL '30 days')
  ORDER BY gc.scheduled_deletion ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger to update updated_at timestamp on gdpr_compliance
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gdpr_compliance_updated_at
  BEFORE UPDATE ON gdpr_compliance
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =============================================
-- INITIAL DATA
-- =============================================

-- Create an initial encryption key if none exists
DO $$
DECLARE
  key_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM encryption_keys WHERE status = 'active') INTO key_exists;
  
  IF NOT key_exists THEN
    INSERT INTO encryption_keys (
      id,
      key_hash,
      status,
      algorithm,
      created_by
    ) VALUES (
      gen_random_uuid(),
      encode(digest('initial_key_' || extract(epoch from now())::text, 'sha256'), 'hex'),
      'active',
      'aes-256-gcm',
      NULL
    );
    
    -- Log the initial key creation
    INSERT INTO encryption_audit (
      action,
      user_id,
      success,
      metadata
    ) VALUES (
      'KEY_GENERATED',
      NULL,
      TRUE,
      '{"source": "migration", "type": "initial_key"}'
    );
  END IF;
END $$;

-- =============================================
-- GRANTS AND PERMISSIONS
-- =============================================

-- Grant necessary permissions to the service role
GRANT ALL ON encryption_keys TO service_role;
GRANT ALL ON encryption_audit TO service_role;
GRANT ALL ON gdpr_compliance TO service_role;

-- Grant read access to authenticated users for their own data
GRANT SELECT ON encryption_audit TO authenticated;
GRANT SELECT ON gdpr_compliance TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_encryption_audit_statistics TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_audit_logs TO service_role;
GRANT EXECUTE ON FUNCTION get_gdpr_deletion_candidates TO service_role;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE encryption_keys IS 'WS-175: Stores metadata for encryption keys used in field-level encryption. Never stores actual keys for security.';
COMMENT ON TABLE encryption_audit IS 'WS-175: Comprehensive audit log for all encryption/decryption operations and security events.';
COMMENT ON TABLE gdpr_compliance IS 'WS-175: GDPR Article 30 compliance tracking for encrypted personal data processing activities.';

COMMENT ON COLUMN encryption_keys.key_hash IS 'SHA-256 hash of the encryption key for verification purposes only';
COMMENT ON COLUMN encryption_keys.status IS 'Key lifecycle status: active (in use), rotating (being replaced), deprecated (no longer used)';
COMMENT ON COLUMN encryption_keys.expires_at IS 'Automatic expiration date (90 days from creation) to enforce key rotation policy';

COMMENT ON COLUMN gdpr_compliance.scheduled_deletion IS 'Automatically calculated deletion date based on consent timestamp and retention period';
COMMENT ON COLUMN gdpr_compliance.legal_basis IS 'GDPR Article 6 legal basis for processing this personal data';
COMMENT ON COLUMN gdpr_compliance.retention_period IS 'Data retention period in days (default 7 years for wedding industry)';

COMMENT ON FUNCTION get_encryption_audit_statistics IS 'WS-175: Returns encryption operation statistics for compliance dashboards and monitoring';
COMMENT ON FUNCTION cleanup_old_audit_logs IS 'WS-175: Removes audit logs older than retention period for GDPR compliance';
COMMENT ON FUNCTION get_gdpr_deletion_candidates IS 'WS-175: Identifies personal data scheduled for deletion under GDPR retention policies';

-- Migration completed successfully
-- WS-175 Advanced Data Encryption infrastructure ready for Team A UI components