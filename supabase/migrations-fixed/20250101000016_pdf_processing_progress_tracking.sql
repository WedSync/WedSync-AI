-- =====================================================
-- PDF Processing Progress Tracking Migration
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
  
  -- Organizational context
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES auth.users(id),
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pdf_processing_org ON pdf_processing_progress(organization_id);
CREATE INDEX IF NOT EXISTS idx_pdf_processing_user ON pdf_processing_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_processing_status ON pdf_processing_progress(status);
CREATE INDEX IF NOT EXISTS idx_pdf_processing_priority ON pdf_processing_progress(processing_priority);
CREATE INDEX IF NOT EXISTS idx_pdf_processing_created ON pdf_processing_progress(created_at);
CREATE INDEX IF NOT EXISTS idx_pdf_processing_id ON pdf_processing_progress(processing_id);
CREATE INDEX IF NOT EXISTS idx_pdf_processing_wedding_season ON pdf_processing_progress(wedding_season);

-- Enhanced guest_lists table for wedding processing
DO $$ 
BEGIN
  -- Add wedding-specific columns to guest_lists if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guest_lists' AND column_name = 'confidence_score') THEN
    ALTER TABLE guest_lists ADD COLUMN confidence_score DECIMAL(5,4) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guest_lists' AND column_name = 'page_number') THEN
    ALTER TABLE guest_lists ADD COLUMN page_number INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guest_lists' AND column_name = 'source_fields') THEN
    ALTER TABLE guest_lists ADD COLUMN source_fields TEXT[];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guest_lists' AND column_name = 'validation_errors') THEN
    ALTER TABLE guest_lists ADD COLUMN validation_errors TEXT[];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guest_lists' AND column_name = 'processing_id') THEN
    ALTER TABLE guest_lists ADD COLUMN processing_id VARCHAR(255);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guest_lists' AND column_name = 'plus_one') THEN
    ALTER TABLE guest_lists ADD COLUMN plus_one BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guest_lists' AND column_name = 'dietary_restrictions') THEN
    ALTER TABLE guest_lists ADD COLUMN dietary_restrictions TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guest_lists' AND column_name = 'table_number') THEN
    ALTER TABLE guest_lists ADD COLUMN table_number VARCHAR(50);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guest_lists' AND column_name = 'rsvp_status') THEN
    ALTER TABLE guest_lists ADD COLUMN rsvp_status VARCHAR(20) DEFAULT 'pending';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guest_lists' AND column_name = 'invitation_type') THEN
    ALTER TABLE guest_lists ADD COLUMN invitation_type VARCHAR(50);
  END IF;
END $$;

-- Add indexes for guest_lists wedding processing
CREATE INDEX IF NOT EXISTS idx_guest_lists_processing_id ON guest_lists(processing_id);
CREATE INDEX IF NOT EXISTS idx_guest_lists_confidence ON guest_lists(confidence_score);
CREATE INDEX IF NOT EXISTS idx_guest_lists_page ON guest_lists(page_number);
CREATE INDEX IF NOT EXISTS idx_guest_lists_rsvp ON guest_lists(rsvp_status);

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
    AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) / 60)::DECIMAL as avg_processing_time_minutes,
    SUM(guest_count)::INTEGER as total_guests_processed,
    AVG(guest_count)::DECIMAL as avg_guests_per_job,
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
  o.name as organization_name,
  u.email as user_email
FROM pdf_processing_progress p
LEFT JOIN organizations o ON p.organization_id = o.id
LEFT JOIN auth.users u ON p.user_id = u.id
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
  AVG(guest_count) as avg_guests_per_job,
  AVG(progress_percentage) as avg_completion_rate,
  AVG(peak_memory_mb) as avg_memory_usage,
  AVG(cache_hit_rate) as avg_cache_hit_rate,
  COUNT(*) FILTER (WHERE processing_priority = 'urgent') as urgent_jobs,
  COUNT(*) FILTER (WHERE processing_priority = 'high') as high_priority_jobs
FROM pdf_processing_progress
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY processing_date DESC;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON pdf_processing_progress TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON pdf_processing_progress TO authenticated;
GRANT SELECT ON v_active_pdf_processing TO authenticated;
GRANT SELECT ON v_wedding_season_processing_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_pdf_processing_stats(UUID, INTERVAL) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_processing_records(INTEGER) TO service_role;

-- Log migration completion
INSERT INTO migration_log (version, name, applied_at, description)
VALUES (
  '012',
  'PDF Processing Progress Tracking',
  NOW(),
  'Added enterprise PDF processing progress tracking for wedding guest list optimization with real-time monitoring, performance analytics, and wedding season scaling'
);

-- Notify completion
DO $$
BEGIN
  RAISE NOTICE 'PDF Processing Progress Tracking migration completed successfully';
  RAISE NOTICE 'Features: Real-time progress tracking, wedding season optimization, performance analytics';
  RAISE NOTICE 'Tables: pdf_processing_progress with enhanced guest_lists columns';
  RAISE NOTICE 'Views: v_active_pdf_processing, v_wedding_season_processing_analytics';
  RAISE NOTICE 'Functions: progress tracking, cleanup, statistics';
END $$;