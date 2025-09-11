-- WS-033: CSV/Excel Import System
-- Tables and functions for managing client import jobs

-- Create import_jobs table
CREATE TABLE IF NOT EXISTS public.import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN (
      'pending', 'processing', 'preview', 'completed', 
      'completed_with_errors', 'failed', 'cancelled', 'timeout'
    )
  ),
  total_rows INTEGER,
  processed_rows INTEGER DEFAULT 0,
  successful_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  progress INTEGER DEFAULT 0,
  column_mappings JSONB,
  validation_summary JSONB,
  performance_metrics JSONB,
  imported_client_ids UUID[],
  errors JSONB,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_import_jobs_user_id ON public.import_jobs(user_id);
CREATE INDEX idx_import_jobs_status ON public.import_jobs(status);
CREATE INDEX idx_import_jobs_created_at ON public.import_jobs(created_at DESC);

-- Add import tracking columns to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS import_id UUID REFERENCES public.import_jobs(id);

-- Create index for imported clients
CREATE INDEX IF NOT EXISTS idx_clients_import_id ON public.clients(import_id);

-- Create temp storage bucket for import files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'temp',
  'temp',
  false,
  52428800, -- 50MB
  ARRAY['application/json']::text[]
)
ON CONFLICT (id) DO UPDATE
SET 
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS policies for import_jobs
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own import jobs
CREATE POLICY "Users can view own import jobs"
  ON public.import_jobs
  FOR SELECT
  USING (( SELECT auth.uid() ) = user_id);

-- Users can create their own import jobs
CREATE POLICY "Users can create import jobs"
  ON public.import_jobs
  FOR INSERT
  WITH CHECK (( SELECT auth.uid() ) = user_id);

-- Users can update their own import jobs
CREATE POLICY "Users can update own import jobs"
  ON public.import_jobs
  FOR UPDATE
  USING (( SELECT auth.uid() ) = user_id)
  WITH CHECK (( SELECT auth.uid() ) = user_id);

-- Users can delete their own import jobs
CREATE POLICY "Users can delete own import jobs"
  ON public.import_jobs
  FOR DELETE
  USING (( SELECT auth.uid() ) = user_id);

-- Storage policies for temp bucket
CREATE POLICY "Users can upload to temp storage"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'temp' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = 'imports' AND
    (storage.foldername(name))[2] = ( SELECT auth.uid() )::text
  );

CREATE POLICY "Users can read own temp files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'temp' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = 'imports' AND
    (storage.foldername(name))[2] = ( SELECT auth.uid() )::text
  );

CREATE POLICY "Users can delete own temp files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'temp' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = 'imports' AND
    (storage.foldername(name))[2] = ( SELECT auth.uid() )::text
  );

-- Function to clean up old import jobs
CREATE OR REPLACE FUNCTION cleanup_old_import_jobs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete completed import jobs older than 30 days
  DELETE FROM public.import_jobs
  WHERE completed_at < now() - INTERVAL '30 days'
    AND status IN ('completed', 'failed', 'cancelled');

  -- Delete stuck processing jobs older than 1 day
  UPDATE public.import_jobs
  SET 
    status = 'timeout',
    error = 'Import timed out after 24 hours'
  WHERE status = 'processing'
    AND created_at < now() - INTERVAL '1 day';

  -- Clean up orphaned temp files
  DELETE FROM storage.objects
  WHERE bucket_id = 'temp'
    AND created_at < now() - INTERVAL '7 days';
END;
$$;

-- Schedule cleanup function (requires pg_cron extension)
-- Run daily at 2 AM
-- SELECT cron.schedule('cleanup-import-jobs', '0 2 * * *', 'SELECT cleanup_old_import_jobs();');

-- Function to get import statistics
CREATE OR REPLACE FUNCTION get_import_statistics(p_user_id UUID)
RETURNS TABLE (
  total_imports BIGINT,
  successful_imports BIGINT,
  failed_imports BIGINT,
  total_clients_imported BIGINT,
  avg_processing_time_ms NUMERIC,
  last_import_date TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_imports,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as successful_imports,
    COUNT(*) FILTER (WHERE status IN ('failed', 'timeout'))::BIGINT as failed_imports,
    COALESCE(SUM(successful_rows), 0)::BIGINT as total_clients_imported,
    AVG((performance_metrics->>'processing_time_ms')::NUMERIC) as avg_processing_time_ms,
    MAX(completed_at) as last_import_date
  FROM public.import_jobs
  WHERE user_id = p_user_id;
END;
$$;

-- Grant necessary permissions
GRANT ALL ON public.import_jobs TO authenticated;
GRANT EXECUTE ON FUNCTION get_import_statistics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_import_jobs() TO service_role;