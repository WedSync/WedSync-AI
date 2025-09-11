-- =====================================================
-- PDF Processing Progress Tracking Migration - FIXED
-- =====================================================
-- B-MAD Enhancement: Real-time progress tracking for 
-- enterprise wedding guest list processing during high-load seasons

-- Create PDF processing progress tracking table
CREATE TABLE IF NOT EXISTS pdf_processing_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processing_id VARCHAR(255) UNIQUE NOT NULL,
  
  -- Progress metrics
  processed_pages INTEGER NOT NULL DEFAULT 0,
  total_pages INTEGER NOT NULL,
  guest_count INTEGER NOT NULL DEFAULT 0,
  progress_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  
  -- Processing metadata
  file_name VARCHAR(255),
  file_size_mb DECIMAL(10,2),
  processing_priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
  wedding_season BOOLEAN DEFAULT FALSE,
  
  -- Status and timing
  status VARCHAR(50) DEFAULT 'processing', -- processing, completed, failed, paused
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  estimated_completion_at TIMESTAMPTZ,
  
  -- Performance tracking
  avg_page_time_ms DECIMAL(10,3),
  peak_memory_mb DECIMAL(10,2),
  cache_hit_rate DECIMAL(5,2),
  
  -- Wedding-specific metrics
  expected_guest_count INTEGER,
  duplicate_guests_found INTEGER DEFAULT 0,
  validation_errors INTEGER DEFAULT 0,
  
  -- Organizational context (removed foreign key constraints that may not exist)
  organization_id UUID,
  user_id UUID,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT chk_progress_percentage CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  CONSTRAINT chk_processed_pages CHECK (processed_pages >= 0 AND processed_pages <= total_pages),
  CONSTRAINT chk_total_pages CHECK (total_pages > 0),
  CONSTRAINT chk_processing_priority CHECK (processing_priority IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT chk_status CHECK (status IN ('processing', 'completed', 'failed', 'paused'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pdf_processing_org ON pdf_processing_progress(organization_id);
CREATE INDEX IF NOT EXISTS idx_pdf_processing_user ON pdf_processing_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_processing_status ON pdf_processing_progress(status);
CREATE INDEX IF NOT EXISTS idx_pdf_processing_priority ON pdf_processing_progress(processing_priority);
CREATE INDEX IF NOT EXISTS idx_pdf_processing_created ON pdf_processing_progress(created_at);
CREATE INDEX IF NOT EXISTS idx_pdf_processing_id ON pdf_processing_progress(processing_id);
CREATE INDEX IF NOT EXISTS idx_pdf_processing_wedding_season ON pdf_processing_progress(wedding_season);

-- Create composite index for performance queries
CREATE INDEX IF NOT EXISTS idx_pdf_processing_status_priority ON pdf_processing_progress(status, processing_priority, created_at);

-- Function to update progress percentage automatically
CREATE OR REPLACE FUNCTION update_progress_percentage()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate progress percentage based on processed pages
  NEW.progress_percentage = CASE 
    WHEN NEW.total_pages > 0 THEN (NEW.processed_pages::DECIMAL / NEW.total_pages::DECIMAL) * 100
    ELSE 0
  END;
  
  -- Estimate completion time based on current progress
  IF NEW.processed_pages > 0 AND NEW.avg_page_time_ms > 0 THEN
    NEW.estimated_completion_at = NEW.started_at + 
      INTERVAL '1 millisecond' * (NEW.avg_page_time_ms * (NEW.total_pages - NEW.processed_pages));
  END IF;
  
  -- Update completion timestamp if finished
  IF NEW.progress_percentage >= 100 AND NEW.status = 'completed' AND NEW.completed_at IS NULL THEN
    NEW.completed_at = NOW();
  END IF;
  
  -- Auto-update timestamp
  NEW.updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic progress updates
DROP TRIGGER IF EXISTS tr_update_progress_percentage ON pdf_processing_progress;
CREATE TRIGGER tr_update_progress_percentage
  BEFORE UPDATE ON pdf_processing_progress
  FOR EACH ROW EXECUTE FUNCTION update_progress_percentage();

-- Function to get processing statistics
CREATE OR REPLACE FUNCTION get_pdf_processing_stats(
  org_id UUID DEFAULT NULL,
  time_window INTERVAL DEFAULT INTERVAL '24 hours'
)
RETURNS TABLE(
  total_processing_jobs INTEGER,
  completed_jobs INTEGER,
  failed_jobs INTEGER,
  avg_processing_time_minutes DECIMAL,
  total_guests_processed INTEGER,
  avg_guests_per_job DECIMAL,
  wedding_season_jobs INTEGER,
  high_priority_jobs INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_processing_jobs,
    COUNT(*) FILTER (WHERE status = 'completed')::INTEGER as completed_jobs,
    COUNT(*) FILTER (WHERE status = 'failed')::INTEGER as failed_jobs,
    COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) / 60), 0)::DECIMAL as avg_processing_time_minutes,
    COALESCE(SUM(guest_count), 0)::INTEGER as total_guests_processed,
    COALESCE(AVG(guest_count), 0)::DECIMAL as avg_guests_per_job,
    COUNT(*) FILTER (WHERE wedding_season = true)::INTEGER as wedding_season_jobs,
    COUNT(*) FILTER (WHERE processing_priority IN ('high', 'urgent'))::INTEGER as high_priority_jobs
  FROM pdf_processing_progress p
  WHERE 
    (org_id IS NULL OR p.organization_id = org_id) AND
    p.created_at >= NOW() - time_window;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old processing records
CREATE OR REPLACE FUNCTION cleanup_old_processing_records(
  days_to_keep INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM pdf_processing_progress 
  WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep
    AND status IN ('completed', 'failed');
    
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Real-time processing view for active jobs
CREATE OR REPLACE VIEW v_active_pdf_processing AS
SELECT 
  p.processing_id,
  p.progress_percentage,
  p.processed_pages,
  p.total_pages,
  p.guest_count,
  p.file_name,
  p.processing_priority,
  p.wedding_season,
  p.status,
  p.started_at,
  p.estimated_completion_at,
  EXTRACT(EPOCH FROM (NOW() - p.started_at))::INTEGER as elapsed_seconds,
  CASE 
    WHEN p.estimated_completion_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (p.estimated_completion_at - NOW()))::INTEGER 
    ELSE NULL 
  END as estimated_remaining_seconds,
  p.organization_id,
  p.user_id
FROM pdf_processing_progress p
WHERE p.status IN ('processing', 'paused')
ORDER BY 
  CASE p.processing_priority 
    WHEN 'urgent' THEN 1
    WHEN 'high' THEN 2  
    WHEN 'medium' THEN 3
    ELSE 4
  END,
  p.started_at;

-- Wedding season performance analytics view
CREATE OR REPLACE VIEW v_wedding_season_processing_analytics AS
SELECT 
  DATE_TRUNC('day', created_at) as processing_date,
  COUNT(*) as total_jobs,
  COUNT(*) FILTER (WHERE wedding_season = true) as wedding_season_jobs,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs,
  COALESCE(AVG(guest_count), 0) as avg_guests_per_job,
  COALESCE(AVG(progress_percentage), 0) as avg_completion_rate,
  COALESCE(AVG(peak_memory_mb), 0) as avg_memory_usage,
  COALESCE(AVG(cache_hit_rate), 0) as avg_cache_hit_rate,
  COUNT(*) FILTER (WHERE processing_priority = 'urgent') as urgent_jobs,
  COUNT(*) FILTER (WHERE processing_priority = 'high') as high_priority_jobs
FROM pdf_processing_progress
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY processing_date DESC;

-- Function to start a new processing job
CREATE OR REPLACE FUNCTION start_pdf_processing(
  p_processing_id VARCHAR(255),
  p_total_pages INTEGER,
  p_file_name VARCHAR(255),
  p_file_size_mb DECIMAL(10,2),
  p_expected_guest_count INTEGER DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_priority VARCHAR(20) DEFAULT 'medium'
)
RETURNS UUID AS $$
DECLARE
  v_record_id UUID;
  v_is_wedding_season BOOLEAN;
BEGIN
  -- Determine if it's wedding season (April through October)
  v_is_wedding_season := EXTRACT(MONTH FROM NOW()) BETWEEN 4 AND 10;
  
  -- Create processing record
  INSERT INTO pdf_processing_progress (
    processing_id,
    total_pages,
    file_name,
    file_size_mb,
    expected_guest_count,
    organization_id,
    user_id,
    processing_priority,
    wedding_season
  ) VALUES (
    p_processing_id,
    p_total_pages,
    p_file_name,
    p_file_size_mb,
    p_expected_guest_count,
    p_organization_id,
    p_user_id,
    p_priority,
    v_is_wedding_season
  ) RETURNING id INTO v_record_id;
  
  -- Log start in system_log if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_log') THEN
    INSERT INTO system_log (event_type, description, details)
    VALUES ('pdf_processing_started', 'PDF processing job started', 
            jsonb_build_object(
              'processing_id', p_processing_id,
              'file_name', p_file_name,
              'total_pages', p_total_pages,
              'priority', p_priority,
              'wedding_season', v_is_wedding_season
            ));
  END IF;
  
  RETURN v_record_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update processing progress
CREATE OR REPLACE FUNCTION update_pdf_processing_progress(
  p_processing_id VARCHAR(255),
  p_processed_pages INTEGER,
  p_guest_count INTEGER DEFAULT NULL,
  p_avg_page_time_ms DECIMAL(10,3) DEFAULT NULL,
  p_peak_memory_mb DECIMAL(10,2) DEFAULT NULL,
  p_cache_hit_rate DECIMAL(5,2) DEFAULT NULL,
  p_duplicate_guests INTEGER DEFAULT NULL,
  p_validation_errors INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated BOOLEAN := FALSE;
BEGIN
  UPDATE pdf_processing_progress
  SET 
    processed_pages = p_processed_pages,
    guest_count = COALESCE(p_guest_count, guest_count),
    avg_page_time_ms = COALESCE(p_avg_page_time_ms, avg_page_time_ms),
    peak_memory_mb = COALESCE(p_peak_memory_mb, peak_memory_mb),
    cache_hit_rate = COALESCE(p_cache_hit_rate, cache_hit_rate),
    duplicate_guests_found = COALESCE(p_duplicate_guests, duplicate_guests_found),
    validation_errors = COALESCE(p_validation_errors, validation_errors)
  WHERE processing_id = p_processing_id
    AND status = 'processing';
  
  GET DIAGNOSTICS v_updated = FOUND;
  
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete processing job
CREATE OR REPLACE FUNCTION complete_pdf_processing(
  p_processing_id VARCHAR(255),
  p_final_status VARCHAR(50) DEFAULT 'completed',
  p_final_guest_count INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated BOOLEAN := FALSE;
BEGIN
  UPDATE pdf_processing_progress
  SET 
    status = p_final_status,
    completed_at = NOW(),
    guest_count = COALESCE(p_final_guest_count, guest_count)
  WHERE processing_id = p_processing_id
    AND status IN ('processing', 'paused');
  
  GET DIAGNOSTICS v_updated = FOUND;
  
  -- Log completion in system_log if table exists
  IF v_updated AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_log') THEN
    INSERT INTO system_log (event_type, description, details)
    VALUES ('pdf_processing_completed', 'PDF processing job completed', 
            jsonb_build_object(
              'processing_id', p_processing_id,
              'final_status', p_final_status,
              'guest_count', p_final_guest_count
            ));
  END IF;
  
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RLS Policies
-- =====================================================

-- Enable RLS
ALTER TABLE pdf_processing_progress ENABLE ROW LEVEL SECURITY;

-- Users can view processing jobs for their organization
CREATE POLICY "Users can view own organization processing jobs" ON pdf_processing_progress
  FOR SELECT USING (
    organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
    ) OR user_id = auth.uid()
  );

-- Users can create processing jobs for their organization
CREATE POLICY "Users can create processing jobs" ON pdf_processing_progress
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
    ) OR user_id = auth.uid()
  );

-- Users can update their own processing jobs
CREATE POLICY "Users can update own processing jobs" ON pdf_processing_progress
  FOR UPDATE USING (
    organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
    ) OR user_id = auth.uid()
  );

-- Service role can manage all processing jobs
CREATE POLICY "Service role can manage all processing jobs" ON pdf_processing_progress
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- Comments and Documentation
-- =====================================================

COMMENT ON TABLE pdf_processing_progress IS 'Tracks real-time progress of PDF processing jobs for wedding guest lists';
COMMENT ON FUNCTION get_pdf_processing_stats(UUID, INTERVAL) IS 'Returns processing statistics for organization within time window';
COMMENT ON FUNCTION cleanup_old_processing_records(INTEGER) IS 'Cleans up completed/failed processing records older than specified days';
COMMENT ON FUNCTION start_pdf_processing(VARCHAR, INTEGER, VARCHAR, DECIMAL, INTEGER, UUID, UUID, VARCHAR) IS 'Starts a new PDF processing job';
COMMENT ON FUNCTION update_pdf_processing_progress(VARCHAR, INTEGER, INTEGER, DECIMAL, DECIMAL, DECIMAL, INTEGER, INTEGER) IS 'Updates progress of existing processing job';
COMMENT ON FUNCTION complete_pdf_processing(VARCHAR, VARCHAR, INTEGER) IS 'Marks a processing job as completed or failed';

COMMENT ON VIEW v_active_pdf_processing IS 'Real-time view of active PDF processing jobs';
COMMENT ON VIEW v_wedding_season_processing_analytics IS 'Analytics view for PDF processing performance during wedding season';