-- Wedding Data Encryption System
-- Stores encryption key metadata for per-wedding data protection

-- Create wedding encryption keys table
CREATE TABLE wedding_encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL,
  key_hash TEXT NOT NULL, -- Hashed master key
  salt TEXT NOT NULL, -- Salt for key derivation
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT wedding_encryption_keys_wedding_id_fkey 
    FOREIGN KEY (wedding_id) REFERENCES weddings(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_wedding_encryption_keys_wedding_id ON wedding_encryption_keys(wedding_id);
CREATE INDEX idx_wedding_encryption_keys_active ON wedding_encryption_keys(wedding_id, is_active) WHERE is_active = true;
CREATE INDEX idx_wedding_encryption_keys_version ON wedding_encryption_keys(wedding_id, version);

-- Ensure only one active key per wedding
CREATE UNIQUE INDEX idx_wedding_encryption_keys_unique_active 
  ON wedding_encryption_keys(wedding_id) 
  WHERE is_active = true;

-- Update trigger for updated_at
CREATE TRIGGER update_wedding_encryption_keys_updated_at
  BEFORE UPDATE ON wedding_encryption_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for wedding encryption keys
ALTER TABLE wedding_encryption_keys ENABLE ROW LEVEL SECURITY;

-- Users can only access keys for their own weddings
CREATE POLICY "Users can access their wedding encryption keys" ON wedding_encryption_keys
  FOR ALL USING (
    wedding_id IN (
      SELECT id FROM weddings 
      WHERE owner_id = auth.uid() 
      OR id IN (
        SELECT wedding_id FROM wedding_collaborators 
        WHERE user_id = auth.uid() AND status = 'accepted'
      )
    )
  );

-- Service role can access all keys (for background operations)
CREATE POLICY "Service role can access all encryption keys" ON wedding_encryption_keys
  FOR ALL USING (auth.role() = 'service_role');

-- Create encryption audit log table
CREATE TABLE encryption_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL,
  key_id UUID,
  operation TEXT NOT NULL, -- 'encrypt', 'decrypt', 'key_create', 'key_rotate'
  field_path TEXT,
  user_id UUID,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT encryption_audit_log_wedding_id_fkey 
    FOREIGN KEY (wedding_id) REFERENCES weddings(id) ON DELETE CASCADE,
  CONSTRAINT encryption_audit_log_key_id_fkey 
    FOREIGN KEY (key_id) REFERENCES wedding_encryption_keys(id) ON DELETE SET NULL,
  CONSTRAINT encryption_audit_log_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for audit log
CREATE INDEX idx_encryption_audit_log_wedding_id ON encryption_audit_log(wedding_id);
CREATE INDEX idx_encryption_audit_log_created_at ON encryption_audit_log(created_at);
CREATE INDEX idx_encryption_audit_log_operation ON encryption_audit_log(operation);
CREATE INDEX idx_encryption_audit_log_user_id ON encryption_audit_log(user_id);

-- RLS Policies for encryption audit log
ALTER TABLE encryption_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can view audit logs for their weddings
CREATE POLICY "Users can view their wedding encryption audit logs" ON encryption_audit_log
  FOR SELECT USING (
    wedding_id IN (
      SELECT id FROM weddings 
      WHERE owner_id = auth.uid() 
      OR id IN (
        SELECT wedding_id FROM wedding_collaborators 
        WHERE user_id = auth.uid() AND status = 'accepted'
      )
    )
  );

-- Service role can manage all audit logs
CREATE POLICY "Service role can manage all encryption audit logs" ON encryption_audit_log
  FOR ALL USING (auth.role() = 'service_role');

-- Function to log encryption operations
CREATE OR REPLACE FUNCTION log_encryption_operation(
  p_wedding_id UUID,
  p_key_id UUID DEFAULT NULL,
  p_operation TEXT DEFAULT 'unknown',
  p_field_path TEXT DEFAULT NULL,
  p_success BOOLEAN DEFAULT true,
  p_error_message TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO encryption_audit_log (
    wedding_id,
    key_id,
    operation,
    field_path,
    user_id,
    ip_address,
    success,
    error_message,
    created_at
  ) VALUES (
    p_wedding_id,
    p_key_id,
    p_operation,
    p_field_path,
    auth.uid(),
    inet_client_addr(),
    p_success,
    p_error_message,
    NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to rotate wedding encryption key
CREATE OR REPLACE FUNCTION rotate_wedding_encryption_key(p_wedding_id UUID)
RETURNS UUID AS $$
DECLARE
  new_key_id UUID;
BEGIN
  -- Check if user has permission to manage this wedding
  IF NOT EXISTS (
    SELECT 1 FROM weddings 
    WHERE id = p_wedding_id 
    AND (owner_id = auth.uid() OR id IN (
      SELECT wedding_id FROM wedding_collaborators 
      WHERE user_id = auth.uid() AND status = 'accepted' AND role IN ('admin', 'planner')
    ))
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to rotate encryption key';
  END IF;

  -- Deactivate current key
  UPDATE wedding_encryption_keys 
  SET is_active = false, updated_at = NOW()
  WHERE wedding_id = p_wedding_id AND is_active = true;

  -- Log key rotation
  PERFORM log_encryption_operation(
    p_wedding_id,
    NULL,
    'key_rotate',
    NULL,
    true,
    NULL
  );

  -- Return success (new key will be generated on next access)
  RETURN gen_random_uuid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get wedding encryption key info (metadata only)
CREATE OR REPLACE FUNCTION get_wedding_encryption_info(p_wedding_id UUID)
RETURNS TABLE (
  key_id UUID,
  version INTEGER,
  created_at TIMESTAMPTZ,
  is_active BOOLEAN
) AS $$
BEGIN
  -- Check if user has permission to access this wedding
  IF NOT EXISTS (
    SELECT 1 FROM weddings 
    WHERE id = p_wedding_id 
    AND (owner_id = auth.uid() OR id IN (
      SELECT wedding_id FROM wedding_collaborators 
      WHERE user_id = auth.uid() AND status = 'accepted'
    ))
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to access encryption info';
  END IF;

  RETURN QUERY
  SELECT wek.id, wek.version, wek.created_at, wek.is_active
  FROM wedding_encryption_keys wek
  WHERE wek.wedding_id = p_wedding_id
  ORDER BY wek.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for encryption statistics
CREATE VIEW encryption_stats AS
SELECT 
  w.id as wedding_id,
  w.title as wedding_title,
  COUNT(wek.id) as total_keys,
  COUNT(CASE WHEN wek.is_active THEN 1 END) as active_keys,
  MAX(wek.created_at) as latest_key_created,
  COUNT(eal.id) as total_operations,
  COUNT(CASE WHEN eal.operation = 'encrypt' THEN 1 END) as encrypt_operations,
  COUNT(CASE WHEN eal.operation = 'decrypt' THEN 1 END) as decrypt_operations,
  COUNT(CASE WHEN eal.success = false THEN 1 END) as failed_operations
FROM weddings w
LEFT JOIN wedding_encryption_keys wek ON w.id = wek.wedding_id
LEFT JOIN encryption_audit_log eal ON w.id = eal.wedding_id
GROUP BY w.id, w.title;

-- Grant permissions
GRANT SELECT ON encryption_stats TO authenticated;

-- Add helpful comments
COMMENT ON TABLE wedding_encryption_keys IS 'Stores encryption key metadata for per-wedding data protection';
COMMENT ON TABLE encryption_audit_log IS 'Audit trail for all encryption/decryption operations';
COMMENT ON FUNCTION log_encryption_operation IS 'Logs encryption operations for audit trail';
COMMENT ON FUNCTION rotate_wedding_encryption_key IS 'Rotates encryption key for a wedding';
COMMENT ON FUNCTION get_wedding_encryption_info IS 'Gets encryption key metadata for a wedding';
COMMENT ON VIEW encryption_stats IS 'Statistics about encryption usage per wedding';

-- Create initial encryption keys for existing weddings (if any)
DO $$
DECLARE
  wedding_record RECORD;
BEGIN
  FOR wedding_record IN SELECT id FROM weddings LOOP
    -- Insert placeholder key record (actual key will be generated on first use)
    INSERT INTO wedding_encryption_keys (
      wedding_id,
      key_hash,
      salt,
      version,
      is_active
    ) VALUES (
      wedding_record.id,
      'placeholder_' || gen_random_uuid(),
      'placeholder_' || gen_random_uuid(),
      1,
      true
    );
  END LOOP;
END $$;