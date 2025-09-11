-- WS-151 Guest List Builder - Team C Infrastructure
-- Database tables for file upload, validation, and import processing
-- Team C - Batch 13: Secure guest import with background processing

-- Guest imports table for tracking file uploads and processing
CREATE TABLE IF NOT EXISTS guest_imports (
  id TEXT PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT,
  upload_url TEXT,
  status TEXT NOT NULL DEFAULT 'uploading' CHECK (status IN ('uploading', 'uploaded', 'processing', 'completed', 'failed', 'rolled_back')),
  processed_rows INTEGER DEFAULT 0,
  total_rows INTEGER DEFAULT 0,
  valid_rows INTEGER DEFAULT 0,
  error_rows INTEGER DEFAULT 0,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  errors JSONB DEFAULT '[]'::jsonb,
  warnings JSONB DEFAULT '[]'::jsonb,
  rollback_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  rolled_back_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_guest_imports_client_id ON guest_imports(client_id);
CREATE INDEX IF NOT EXISTS idx_guest_imports_status ON guest_imports(status);
CREATE INDEX IF NOT EXISTS idx_guest_imports_created_at ON guest_imports(created_at);

-- Guest import jobs table for background processing
CREATE TABLE IF NOT EXISTS guest_import_jobs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('guest_import_process', 'guest_import_rollback')),
  import_id TEXT NOT NULL REFERENCES guest_imports(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  total_rows INTEGER DEFAULT 0,
  processed_rows INTEGER DEFAULT 0,
  valid_rows INTEGER DEFAULT 0,
  error_rows INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3
);

-- Create indexes for job processing performance
CREATE INDEX IF NOT EXISTS idx_guest_import_jobs_status ON guest_import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_guest_import_jobs_priority ON guest_import_jobs(priority);
CREATE INDEX IF NOT EXISTS idx_guest_import_jobs_client_id ON guest_import_jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_guest_import_jobs_created_at ON guest_import_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_guest_import_jobs_type ON guest_import_jobs(type);

-- Add import_id column to guests table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'guests' AND column_name = 'import_id'
  ) THEN
    ALTER TABLE guests ADD COLUMN import_id TEXT REFERENCES guest_imports(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_guests_import_id ON guests(import_id);
  END IF;
END $$;

-- Create storage bucket for guest uploads if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'guest-uploads',
  'guest-uploads',
  false,
  10485760, -- 10MB limit
  ARRAY['text/csv', 'application/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for guest_imports table
ALTER TABLE guest_imports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access imports for clients in their organization
CREATE POLICY "guest_imports_org_access" ON guest_imports
FOR ALL USING (
  client_id IN (
    SELECT c.id 
    FROM clients c
    JOIN user_profiles up ON c.organization_id = up.organization_id
    WHERE up.user_id = auth.uid()
  )
);

-- RLS policies for guest_import_jobs table
ALTER TABLE guest_import_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access jobs for clients in their organization
CREATE POLICY "guest_import_jobs_org_access" ON guest_import_jobs
FOR ALL USING (
  client_id IN (
    SELECT c.id 
    FROM clients c
    JOIN user_profiles up ON c.organization_id = up.organization_id
    WHERE up.user_id = auth.uid()
  )
);

-- Storage policy for guest-uploads bucket
CREATE POLICY "guest_uploads_org_access" ON storage.objects
FOR ALL USING (
  bucket_id = 'guest-uploads' AND
  -- Extract client_id from path structure: guest-imports/{import_id}/{filename}
  -- Then verify the client belongs to user's organization
  EXISTS (
    SELECT 1 FROM guest_imports gi
    JOIN clients c ON gi.client_id = c.id
    JOIN user_profiles up ON c.organization_id = up.organization_id
    WHERE up.user_id = auth.uid()
    AND gi.id = (string_to_array(name, '/'))[(array_upper(string_to_array(name, '/'), 1) - 1)]
  )
);

-- Update trigger for guest_imports
CREATE OR REPLACE FUNCTION update_guest_imports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_guest_imports_updated_at ON guest_imports;
CREATE TRIGGER trigger_guest_imports_updated_at
  BEFORE UPDATE ON guest_imports
  FOR EACH ROW
  EXECUTE FUNCTION update_guest_imports_updated_at();

-- Update trigger for guest_import_jobs
CREATE OR REPLACE FUNCTION update_guest_import_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_guest_import_jobs_updated_at ON guest_import_jobs;
CREATE TRIGGER trigger_guest_import_jobs_updated_at
  BEFORE UPDATE ON guest_import_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_guest_import_jobs_updated_at();

-- Helper function to clean up old completed import jobs (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_import_jobs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM guest_import_jobs
  WHERE status IN ('completed', 'failed', 'cancelled')
  AND created_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Helper function to get import progress with detailed statistics
CREATE OR REPLACE FUNCTION get_import_progress(import_id_param TEXT)
RETURNS JSON AS $$
DECLARE
  import_data guest_imports%ROWTYPE;
  job_data guest_import_jobs%ROWTYPE;
  result JSON;
BEGIN
  -- Get import record
  SELECT * INTO import_data FROM guest_imports WHERE id = import_id_param;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Import not found');
  END IF;
  
  -- Get latest job for this import
  SELECT * INTO job_data 
  FROM guest_import_jobs 
  WHERE import_id = import_id_param 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- Build result object
  result := json_build_object(
    'import_id', import_data.id,
    'status', import_data.status,
    'progress', import_data.progress,
    'total_rows', import_data.total_rows,
    'processed_rows', import_data.processed_rows,
    'valid_rows', import_data.valid_rows,
    'error_rows', import_data.error_rows,
    'file_name', import_data.file_name,
    'file_size', import_data.file_size,
    'created_at', import_data.created_at,
    'updated_at', import_data.updated_at,
    'completed_at', import_data.completed_at,
    'errors', import_data.errors,
    'warnings', import_data.warnings
  );
  
  -- Add job information if available
  IF FOUND THEN
    result := result || json_build_object(
      'job_status', job_data.status,
      'job_started_at', job_data.started_at,
      'job_retry_count', job_data.retry_count,
      'job_error', job_data.error
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON guest_imports TO authenticated;
GRANT ALL ON guest_import_jobs TO authenticated;
GRANT EXECUTE ON FUNCTION get_import_progress(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_import_jobs() TO authenticated;

-- Comment on tables for documentation
COMMENT ON TABLE guest_imports IS 'WS-151: Tracks guest list file uploads and import progress. Integrates with Team C infrastructure for secure file processing.';
COMMENT ON TABLE guest_import_jobs IS 'WS-151: Background job queue for processing guest imports with retry logic and progress tracking.';
COMMENT ON COLUMN guest_imports.errors IS 'JSON array of validation and processing errors with row numbers, field names, and error messages.';
COMMENT ON COLUMN guest_imports.warnings IS 'JSON array of validation warnings that do not prevent import completion.';
COMMENT ON COLUMN guest_import_jobs.data IS 'JSON object containing job configuration, validation rules, and transformation settings.';