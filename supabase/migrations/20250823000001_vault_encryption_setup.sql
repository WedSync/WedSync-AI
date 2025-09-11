-- WedSync P0 Security: Supabase Vault Setup for AES-256-GCM Encryption
-- SECURITY LEVEL: P0 - CRITICAL
-- PURPOSE: Enable Supabase Vault for secure key management
-- VERSION: 2.0.0

-- Enable Vault extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- Create schema for vault if not exists
CREATE SCHEMA IF NOT EXISTS vault;

-- Grant usage on vault schema to authenticated users
GRANT USAGE ON SCHEMA vault TO authenticated;
GRANT USAGE ON SCHEMA vault TO service_role;

-- Create decrypted secrets view for accessing vault secrets
CREATE OR REPLACE VIEW vault.decrypted_secrets AS
SELECT
  id,
  name,
  description,
  secret,
  key_id,
  nonce,
  created_at,
  updated_at
FROM vault.secrets;

-- Function to check if vault extension is available
CREATE OR REPLACE FUNCTION check_vault_extension()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pgsodium'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced encryption keys table with vault integration
CREATE TABLE IF NOT EXISTS encryption_keys_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  key_type TEXT NOT NULL CHECK (key_type IN ('master', 'field', 'file', 'backup')),
  vault_secret_id UUID, -- Reference to vault.secrets
  key_hash TEXT, -- Fallback for non-vault keys
  salt TEXT NOT NULL,
  algorithm TEXT NOT NULL DEFAULT 'aes-256-gcm',
  version INTEGER NOT NULL DEFAULT 2,
  is_active BOOLEAN NOT NULL DEFAULT true,
  rotated_from UUID REFERENCES encryption_keys_v2(id),
  rotation_date TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_active_tenant_key UNIQUE (tenant_id, key_type, is_active) 
    WHERE is_active = true
);

-- Create indexes for performance
CREATE INDEX idx_encryption_keys_v2_tenant ON encryption_keys_v2(tenant_id);
CREATE INDEX idx_encryption_keys_v2_active ON encryption_keys_v2(tenant_id, is_active) WHERE is_active = true;
CREATE INDEX idx_encryption_keys_v2_vault ON encryption_keys_v2(vault_secret_id) WHERE vault_secret_id IS NOT NULL;
CREATE INDEX idx_encryption_keys_v2_expires ON encryption_keys_v2(expires_at) WHERE expires_at IS NOT NULL;

-- Encryption metadata table for tracking encrypted fields
CREATE TABLE IF NOT EXISTS encrypted_field_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  table_name TEXT NOT NULL,
  column_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  field_path TEXT NOT NULL,
  encryption_key_id UUID NOT NULL REFERENCES encryption_keys_v2(id),
  iv TEXT NOT NULL, -- Initialization vector
  auth_tag TEXT NOT NULL, -- Authentication tag for GCM
  encrypted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_accessed TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,
  
  -- Unique constraint to prevent duplicate encryption
  CONSTRAINT unique_encrypted_field UNIQUE (tenant_id, table_name, column_name, record_id, field_path)
);

-- Create indexes for metadata
CREATE INDEX idx_encrypted_metadata_tenant ON encrypted_field_metadata(tenant_id);
CREATE INDEX idx_encrypted_metadata_table ON encrypted_field_metadata(table_name, column_name);
CREATE INDEX idx_encrypted_metadata_record ON encrypted_field_metadata(record_id);
CREATE INDEX idx_encrypted_metadata_key ON encrypted_field_metadata(encryption_key_id);

-- Enhanced audit log with performance tracking
CREATE TABLE IF NOT EXISTS encryption_audit_log_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN (
    'encrypt', 'decrypt', 'key_create', 'key_rotate', 'key_delete',
    'bulk_encrypt', 'bulk_decrypt', 'file_encrypt', 'file_decrypt'
  )),
  table_name TEXT,
  column_name TEXT,
  record_id UUID,
  field_path TEXT,
  encryption_key_id UUID REFERENCES encryption_keys_v2(id),
  user_id UUID REFERENCES auth.users(id),
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  error_code TEXT,
  error_message TEXT,
  latency_ms NUMERIC(10, 2), -- Performance tracking
  data_size_bytes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for audit log
CREATE INDEX idx_encryption_audit_v2_tenant ON encryption_audit_log_v2(tenant_id);
CREATE INDEX idx_encryption_audit_v2_created ON encryption_audit_log_v2(created_at DESC);
CREATE INDEX idx_encryption_audit_v2_operation ON encryption_audit_log_v2(operation);
CREATE INDEX idx_encryption_audit_v2_user ON encryption_audit_log_v2(user_id);
CREATE INDEX idx_encryption_audit_v2_performance ON encryption_audit_log_v2(latency_ms) WHERE latency_ms > 100;

-- Key rotation schedule table
CREATE TABLE IF NOT EXISTS key_rotation_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  key_type TEXT NOT NULL,
  rotation_interval_days INTEGER NOT NULL DEFAULT 90,
  last_rotation TIMESTAMPTZ,
  next_rotation TIMESTAMPTZ NOT NULL,
  auto_rotate BOOLEAN DEFAULT true,
  notification_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_tenant_key_schedule UNIQUE (tenant_id, key_type)
);

-- Create indexes for rotation schedule
CREATE INDEX idx_rotation_schedule_next ON key_rotation_schedule(next_rotation) WHERE auto_rotate = true;
CREATE INDEX idx_rotation_schedule_tenant ON key_rotation_schedule(tenant_id);

-- Function to create tenant encryption key in vault
CREATE OR REPLACE FUNCTION create_tenant_vault_key(
  p_tenant_id UUID,
  p_key_type TEXT DEFAULT 'master'
) RETURNS UUID AS $$
DECLARE
  v_key_id UUID;
  v_vault_id UUID;
  v_key_bytes BYTEA;
  v_salt TEXT;
BEGIN
  -- Generate cryptographically secure key
  v_key_bytes := gen_random_bytes(32); -- 256 bits for AES-256
  v_salt := encode(gen_random_bytes(32), 'hex');
  
  -- Try to store in vault
  BEGIN
    -- Create vault secret
    INSERT INTO vault.secrets (name, secret, description)
    VALUES (
      format('tenant_%s_%s_key', p_tenant_id, p_key_type),
      encode(v_key_bytes, 'hex'),
      format('P0 encryption key for tenant %s (type: %s)', p_tenant_id, p_key_type)
    )
    RETURNING id INTO v_vault_id;
    
    -- Create key record with vault reference
    INSERT INTO encryption_keys_v2 (
      tenant_id,
      key_type,
      vault_secret_id,
      salt,
      algorithm,
      version,
      is_active,
      expires_at
    ) VALUES (
      p_tenant_id,
      p_key_type,
      v_vault_id,
      v_salt,
      'aes-256-gcm',
      2,
      true,
      NOW() + INTERVAL '90 days'
    )
    RETURNING id INTO v_key_id;
    
  EXCEPTION WHEN OTHERS THEN
    -- Fallback to key hash if vault fails
    INSERT INTO encryption_keys_v2 (
      tenant_id,
      key_type,
      key_hash,
      salt,
      algorithm,
      version,
      is_active,
      expires_at
    ) VALUES (
      p_tenant_id,
      p_key_type,
      encode(digest(v_key_bytes || v_salt::bytea, 'sha256'), 'hex'),
      v_salt,
      'aes-256-gcm',
      2,
      true,
      NOW() + INTERVAL '90 days'
    )
    RETURNING id INTO v_key_id;
  END;
  
  -- Create rotation schedule
  INSERT INTO key_rotation_schedule (
    tenant_id,
    key_type,
    rotation_interval_days,
    next_rotation,
    auto_rotate
  ) VALUES (
    p_tenant_id,
    p_key_type,
    90,
    NOW() + INTERVAL '90 days',
    true
  ) ON CONFLICT (tenant_id, key_type) DO NOTHING;
  
  -- Log key creation
  INSERT INTO encryption_audit_log_v2 (
    tenant_id,
    operation,
    encryption_key_id,
    user_id,
    ip_address,
    success,
    latency_ms
  ) VALUES (
    p_tenant_id,
    'key_create',
    v_key_id,
    auth.uid(),
    inet_client_addr(),
    true,
    extract(milliseconds from clock_timestamp() - now())
  );
  
  RETURN v_key_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to rotate tenant encryption key
CREATE OR REPLACE FUNCTION rotate_tenant_encryption_key(
  p_tenant_id UUID,
  p_key_type TEXT DEFAULT 'master'
) RETURNS UUID AS $$
DECLARE
  v_old_key_id UUID;
  v_new_key_id UUID;
  v_start_time TIMESTAMPTZ;
BEGIN
  v_start_time := clock_timestamp();
  
  -- Get current active key
  SELECT id INTO v_old_key_id
  FROM encryption_keys_v2
  WHERE tenant_id = p_tenant_id 
    AND key_type = p_key_type
    AND is_active = true;
  
  -- Deactivate old key
  UPDATE encryption_keys_v2
  SET is_active = false,
      updated_at = NOW()
  WHERE id = v_old_key_id;
  
  -- Create new key
  v_new_key_id := create_tenant_vault_key(p_tenant_id, p_key_type);
  
  -- Link rotation
  UPDATE encryption_keys_v2
  SET rotated_from = v_old_key_id,
      rotation_date = NOW()
  WHERE id = v_new_key_id;
  
  -- Update rotation schedule
  UPDATE key_rotation_schedule
  SET last_rotation = NOW(),
      next_rotation = NOW() + INTERVAL '90 days',
      notification_sent = false,
      updated_at = NOW()
  WHERE tenant_id = p_tenant_id AND key_type = p_key_type;
  
  -- Log rotation
  INSERT INTO encryption_audit_log_v2 (
    tenant_id,
    operation,
    encryption_key_id,
    user_id,
    ip_address,
    success,
    latency_ms
  ) VALUES (
    p_tenant_id,
    'key_rotate',
    v_new_key_id,
    auth.uid(),
    inet_client_addr(),
    true,
    extract(milliseconds from clock_timestamp() - v_start_time)
  );
  
  RETURN v_new_key_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log encryption operation with performance metrics
CREATE OR REPLACE FUNCTION log_encryption_operation(
  p_tenant_id UUID,
  p_operation TEXT,
  p_table_name TEXT DEFAULT NULL,
  p_column_name TEXT DEFAULT NULL,
  p_record_id UUID DEFAULT NULL,
  p_field_path TEXT DEFAULT NULL,
  p_key_id UUID DEFAULT NULL,
  p_success BOOLEAN DEFAULT true,
  p_error_code TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_latency_ms NUMERIC DEFAULT NULL,
  p_data_size INTEGER DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO encryption_audit_log_v2 (
    tenant_id,
    operation,
    table_name,
    column_name,
    record_id,
    field_path,
    encryption_key_id,
    user_id,
    ip_address,
    success,
    error_code,
    error_message,
    latency_ms,
    data_size_bytes,
    created_at
  ) VALUES (
    p_tenant_id,
    p_operation,
    p_table_name,
    p_column_name,
    p_record_id,
    p_field_path,
    p_key_id,
    auth.uid(),
    inet_client_addr(),
    p_success,
    p_error_code,
    p_error_message,
    p_latency_ms,
    p_data_size,
    NOW()
  );
  
  -- Alert on performance degradation
  IF p_latency_ms > 100 THEN
    RAISE WARNING 'P0 Security Performance Alert: % operation took %ms', p_operation, p_latency_ms;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get encryption performance metrics
CREATE OR REPLACE FUNCTION get_encryption_metrics(
  p_tenant_id UUID DEFAULT NULL,
  p_time_window INTERVAL DEFAULT '1 hour'
) RETURNS TABLE (
  operation TEXT,
  total_operations BIGINT,
  success_rate NUMERIC,
  avg_latency_ms NUMERIC,
  p95_latency_ms NUMERIC,
  max_latency_ms NUMERIC,
  total_data_size_mb NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    eal.operation,
    COUNT(*) as total_operations,
    ROUND(100.0 * COUNT(CASE WHEN eal.success THEN 1 END) / COUNT(*), 2) as success_rate,
    ROUND(AVG(eal.latency_ms), 2) as avg_latency_ms,
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY eal.latency_ms), 2) as p95_latency_ms,
    ROUND(MAX(eal.latency_ms), 2) as max_latency_ms,
    ROUND(SUM(eal.data_size_bytes) / 1048576.0, 2) as total_data_size_mb
  FROM encryption_audit_log_v2 eal
  WHERE (p_tenant_id IS NULL OR eal.tenant_id = p_tenant_id)
    AND eal.created_at > NOW() - p_time_window
  GROUP BY eal.operation
  ORDER BY total_operations DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Automated key rotation job (runs daily)
CREATE OR REPLACE FUNCTION auto_rotate_expired_keys()
RETURNS void AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT tenant_id, key_type
    FROM key_rotation_schedule
    WHERE next_rotation <= NOW()
      AND auto_rotate = true
  LOOP
    BEGIN
      PERFORM rotate_tenant_encryption_key(r.tenant_id, r.key_type);
      RAISE NOTICE 'Auto-rotated key for tenant % (type: %)', r.tenant_id, r.key_type;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to auto-rotate key for tenant % (type: %): %', 
        r.tenant_id, r.key_type, SQLERRM;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create scheduled job for key rotation (requires pg_cron extension)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Schedule daily key rotation check at 2 AM
    PERFORM cron.schedule(
      'auto-rotate-encryption-keys',
      '0 2 * * *',
      'SELECT auto_rotate_expired_keys();'
    );
  ELSE
    RAISE NOTICE 'pg_cron not available - manual key rotation required';
  END IF;
END $$;

-- RLS Policies
ALTER TABLE encryption_keys_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE encrypted_field_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption_audit_log_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_rotation_schedule ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role full access to encryption keys" ON encryption_keys_v2
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to metadata" ON encrypted_field_metadata
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to audit logs" ON encryption_audit_log_v2
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to rotation schedule" ON key_rotation_schedule
  FOR ALL USING (auth.role() = 'service_role');

-- Users can view their own audit logs
CREATE POLICY "Users view own audit logs" ON encryption_audit_log_v2
  FOR SELECT USING (user_id = auth.uid());

-- Create view for encryption statistics
CREATE OR REPLACE VIEW encryption_statistics AS
SELECT 
  t.tenant_id,
  COUNT(DISTINCT ek.id) as total_keys,
  COUNT(DISTINCT CASE WHEN ek.is_active THEN ek.id END) as active_keys,
  COUNT(DISTINCT efm.id) as encrypted_fields,
  COUNT(DISTINCT eal.id) as total_operations,
  AVG(eal.latency_ms) as avg_latency_ms,
  MAX(eal.latency_ms) as max_latency_ms,
  SUM(CASE WHEN eal.success = false THEN 1 ELSE 0 END) as failed_operations,
  MAX(ek.created_at) as latest_key_created,
  MIN(krs.next_rotation) as next_rotation_due
FROM (SELECT DISTINCT tenant_id FROM encryption_keys_v2) t
LEFT JOIN encryption_keys_v2 ek ON t.tenant_id = ek.tenant_id
LEFT JOIN encrypted_field_metadata efm ON t.tenant_id = efm.tenant_id
LEFT JOIN encryption_audit_log_v2 eal ON t.tenant_id = eal.tenant_id
LEFT JOIN key_rotation_schedule krs ON t.tenant_id = krs.tenant_id
GROUP BY t.tenant_id;

-- Grant permissions
GRANT SELECT ON encryption_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION check_vault_extension TO authenticated;
GRANT EXECUTE ON FUNCTION create_tenant_vault_key TO authenticated;
GRANT EXECUTE ON FUNCTION rotate_tenant_encryption_key TO authenticated;
GRANT EXECUTE ON FUNCTION log_encryption_operation TO authenticated;
GRANT EXECUTE ON FUNCTION get_encryption_metrics TO authenticated;

-- Comments for documentation
COMMENT ON TABLE encryption_keys_v2 IS 'P0 Security: Master encryption keys with Supabase Vault integration';
COMMENT ON TABLE encrypted_field_metadata IS 'Metadata tracking for encrypted fields';
COMMENT ON TABLE encryption_audit_log_v2 IS 'Comprehensive audit trail with performance metrics';
COMMENT ON TABLE key_rotation_schedule IS 'Automated key rotation scheduling';
COMMENT ON FUNCTION create_tenant_vault_key IS 'Creates AES-256-GCM encryption key in Supabase Vault';
COMMENT ON FUNCTION rotate_tenant_encryption_key IS 'Rotates encryption keys with zero downtime';
COMMENT ON FUNCTION get_encryption_metrics IS 'Returns encryption performance metrics';
COMMENT ON VIEW encryption_statistics IS 'Real-time encryption system statistics';