-- Security Enhancement Tables for PDF Import System

-- Audit logs table for comprehensive security tracking
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  organization_id UUID REFERENCES organizations(id),
  resource_id TEXT,
  resource_type TEXT,
  ip_address INET,
  user_agent TEXT,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  session_id TEXT,
  
  -- Indexes for fast queries
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit logs
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_organization ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Secure file metadata table
CREATE TABLE secure_file_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path TEXT NOT NULL UNIQUE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  original_filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  encryption_metadata JSONB, -- Contains IV, auth tag, algorithm
  auto_delete_at TIMESTAMPTZ,
  custom_metadata JSONB,
  virus_scan_result JSONB,
  security_assessment JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for secure file metadata
CREATE INDEX idx_secure_files_org ON secure_file_metadata(organization_id);
CREATE INDEX idx_secure_files_user ON secure_file_metadata(user_id);
CREATE INDEX idx_secure_files_path ON secure_file_metadata(file_path);
CREATE INDEX idx_secure_files_auto_delete ON secure_file_metadata(auto_delete_at);

-- Update pdf_imports table with security fields
ALTER TABLE pdf_imports 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS security_scan_result JSONB,
ADD COLUMN IF NOT EXISTS threat_level TEXT,
ADD COLUMN IF NOT EXISTS encryption_status TEXT,
ADD COLUMN IF NOT EXISTS signed_url_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auto_delete_at TIMESTAMPTZ;

-- Add organization_id constraint if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'pdf_imports_organization_id_not_null'
  ) THEN
    ALTER TABLE pdf_imports 
    ALTER COLUMN organization_id SET NOT NULL;
  END IF;
END $$;

-- RLS Policies for audit logs (restricted access)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs for their organization
CREATE POLICY "Admins can view organization audit logs"
  ON audit_logs FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = ( SELECT auth.uid() ) 
      AND role IN ('ADMIN', 'OWNER')
    )
  );

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- RLS Policies for secure file metadata
ALTER TABLE secure_file_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organization files"
  ON secure_file_metadata FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
    )
  );

CREATE POLICY "Users can insert files for their organization"
  ON secure_file_metadata FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
    )
  );

CREATE POLICY "Users can update own organization files"
  ON secure_file_metadata FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
    )
  );

CREATE POLICY "Users can delete own organization files"
  ON secure_file_metadata FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
    )
  );

-- Function to automatically delete expired files
CREATE OR REPLACE FUNCTION delete_expired_files()
RETURNS void AS $$
BEGIN
  -- Delete files past their auto_delete_at time
  DELETE FROM secure_file_metadata 
  WHERE auto_delete_at IS NOT NULL 
  AND auto_delete_at < NOW();
  
  -- Also delete from pdf_imports
  DELETE FROM pdf_imports
  WHERE auto_delete_at IS NOT NULL
  AND auto_delete_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run cleanup (requires pg_cron extension)
-- In production, this would be scheduled via pg_cron or external scheduler
-- SELECT cron.schedule('delete-expired-files', '0 * * * *', 'SELECT delete_expired_files();');

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
  p_event_type TEXT,
  p_severity TEXT,
  p_action TEXT,
  p_details JSONB DEFAULT '{}',
  p_user_id UUID DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    event_type,
    severity,
    action,
    details,
    user_id,
    organization_id
  ) VALUES (
    p_event_type,
    p_severity,
    p_action,
    p_details,
    p_user_id,
    p_organization_id
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_secure_file_metadata_updated_at
  BEFORE UPDATE ON secure_file_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();