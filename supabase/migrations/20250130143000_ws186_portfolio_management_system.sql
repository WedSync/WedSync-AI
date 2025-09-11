-- WS-186: Portfolio Management System Database Schema
-- Team B Round 1 - Comprehensive database architecture for portfolio image processing

-- ========================================
-- Portfolio Image Management Tables
-- ========================================

-- Main portfolio images table with comprehensive metadata
CREATE TABLE IF NOT EXISTS portfolio_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  upload_job_id UUID REFERENCES portfolio_upload_jobs(id) ON DELETE SET NULL,
  original_filename TEXT NOT NULL,
  title TEXT,
  description TEXT,
  file_path TEXT NOT NULL,
  thumbnail_path TEXT,
  medium_path TEXT,
  large_path TEXT,
  category TEXT NOT NULL CHECK (category IN ('ceremony', 'reception', 'portraits', 'details', 'venue')),
  tags TEXT[] DEFAULT '{}',
  featured BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  downloads_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'processing' CHECK (status IN ('active', 'processing', 'failed', 'archived', 'deleted')),
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  ai_analysis_complete BOOLEAN DEFAULT FALSE,
  ai_analysis JSONB,
  ai_analysis_error TEXT,
  ai_generated_alt_text TEXT,
  aesthetic_score NUMERIC(3,2) CHECK (aesthetic_score >= 0 AND aesthetic_score <= 10),
  metadata JSONB DEFAULT '{}',
  search_vector TSVECTOR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Upload jobs tracking table
CREATE TABLE IF NOT EXISTS portfolio_upload_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('ceremony', 'reception', 'portraits', 'details', 'venue')),
  status TEXT DEFAULT 'preparing' CHECK (status IN ('preparing', 'ready', 'uploading', 'processing', 'completed', 'failed', 'cancelled')),
  total_files INTEGER DEFAULT 0,
  processed_files INTEGER DEFAULT 0,
  failed_files INTEGER DEFAULT 0,
  upload_urls JSONB,
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity logging for portfolio operations
CREATE TABLE IF NOT EXISTS portfolio_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_id UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI analysis results table (separate for performance)
CREATE TABLE IF NOT EXISTS portfolio_ai_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID NOT NULL REFERENCES portfolio_images(id) ON DELETE CASCADE,
  scene_primary TEXT NOT NULL,
  scene_confidence NUMERIC(4,3) CHECK (scene_confidence >= 0 AND scene_confidence <= 1),
  scene_secondary TEXT[],
  aesthetic_score NUMERIC(3,2) CHECK (aesthetic_score >= 0 AND aesthetic_score <= 10),
  style TEXT,
  style_confidence NUMERIC(4,3) CHECK (style_confidence >= 0 AND style_confidence <= 1),
  style_characteristics TEXT[],
  objects_detected JSONB DEFAULT '[]',
  dominant_colors JSONB DEFAULT '[]',
  color_mood TEXT,
  color_temperature TEXT CHECK (color_temperature IN ('warm', 'cool', 'neutral')),
  alt_text TEXT,
  description TEXT,
  tags TEXT[],
  processing_time_ms INTEGER,
  model_used TEXT,
  overall_confidence NUMERIC(4,3) CHECK (overall_confidence >= 0 AND overall_confidence <= 1),
  analysis_version TEXT DEFAULT '1.0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(image_id)
);

-- Processing error tracking
CREATE TABLE IF NOT EXISTS portfolio_processing_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  upload_job_id UUID REFERENCES portfolio_upload_jobs(id) ON DELETE CASCADE,
  image_id UUID REFERENCES portfolio_images(id) ON DELETE CASCADE,
  original_filename TEXT,
  file_path TEXT,
  error_type TEXT NOT NULL CHECK (error_type IN ('upload', 'processing', 'ai_analysis', 'optimization')),
  error_code TEXT,
  error_message TEXT NOT NULL,
  error_details JSONB DEFAULT '{}',
  retry_count INTEGER DEFAULT 0,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI analysis error tracking (separate for specific AI failures)
CREATE TABLE IF NOT EXISTS portfolio_ai_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID NOT NULL REFERENCES portfolio_images(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  original_filename TEXT,
  error_message TEXT NOT NULL,
  error_details JSONB DEFAULT '{}',
  model_used TEXT,
  retry_count INTEGER DEFAULT 0,
  retryable BOOLEAN DEFAULT TRUE,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Portfolio analytics and engagement tracking
CREATE TABLE IF NOT EXISTS portfolio_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID REFERENCES portfolio_images(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'like', 'share', 'download', 'zoom', 'fullscreen')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_address INET,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Background processing queue
CREATE TABLE IF NOT EXISTS portfolio_processing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL CHECK (job_type IN ('image_processing', 'ai_analysis', 'optimization', 'cleanup')),
  priority INTEGER DEFAULT 5,
  data JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- Performance Indexes
-- ========================================

-- Primary indexes for portfolio_images
CREATE INDEX IF NOT EXISTS idx_portfolio_images_supplier_id ON portfolio_images(supplier_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_images_category ON portfolio_images(category);
CREATE INDEX IF NOT EXISTS idx_portfolio_images_status ON portfolio_images(status);
CREATE INDEX IF NOT EXISTS idx_portfolio_images_featured ON portfolio_images(featured) WHERE featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_portfolio_images_processing_status ON portfolio_images(processing_status);
CREATE INDEX IF NOT EXISTS idx_portfolio_images_created_at ON portfolio_images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_images_display_order ON portfolio_images(supplier_id, display_order);
CREATE INDEX IF NOT EXISTS idx_portfolio_images_aesthetic_score ON portfolio_images(aesthetic_score DESC) WHERE aesthetic_score IS NOT NULL;

-- JSONB and array indexes
CREATE INDEX IF NOT EXISTS idx_portfolio_images_tags ON portfolio_images USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_portfolio_images_metadata ON portfolio_images USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_portfolio_images_ai_analysis ON portfolio_images USING GIN (ai_analysis);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_portfolio_images_search ON portfolio_images USING GIN (search_vector);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_portfolio_images_supplier_category_featured 
  ON portfolio_images(supplier_id, category, featured);
CREATE INDEX IF NOT EXISTS idx_portfolio_images_supplier_status_created 
  ON portfolio_images(supplier_id, status, created_at DESC);

-- Upload jobs indexes
CREATE INDEX IF NOT EXISTS idx_portfolio_upload_jobs_supplier_id ON portfolio_upload_jobs(supplier_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_upload_jobs_user_id ON portfolio_upload_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_upload_jobs_status ON portfolio_upload_jobs(status);
CREATE INDEX IF NOT EXISTS idx_portfolio_upload_jobs_created_at ON portfolio_upload_jobs(created_at DESC);

-- Activity logs indexes
CREATE INDEX IF NOT EXISTS idx_portfolio_activity_logs_supplier_id ON portfolio_activity_logs(supplier_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_activity_logs_user_id ON portfolio_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_activity_logs_action ON portfolio_activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_portfolio_activity_logs_created_at ON portfolio_activity_logs(created_at DESC);

-- AI analysis indexes
CREATE INDEX IF NOT EXISTS idx_portfolio_ai_analysis_scene_primary ON portfolio_ai_analysis(scene_primary);
CREATE INDEX IF NOT EXISTS idx_portfolio_ai_analysis_aesthetic_score ON portfolio_ai_analysis(aesthetic_score DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_ai_analysis_style ON portfolio_ai_analysis(style);
CREATE INDEX IF NOT EXISTS idx_portfolio_ai_analysis_confidence ON portfolio_ai_analysis(overall_confidence DESC);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_portfolio_analytics_image_id ON portfolio_analytics_events(image_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_analytics_supplier_id ON portfolio_analytics_events(supplier_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_analytics_event_type ON portfolio_analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_portfolio_analytics_created_at ON portfolio_analytics_events(created_at DESC);

-- Processing queue indexes
CREATE INDEX IF NOT EXISTS idx_portfolio_queue_status_priority ON portfolio_processing_queue(status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_queue_job_type ON portfolio_processing_queue(job_type);
CREATE INDEX IF NOT EXISTS idx_portfolio_queue_scheduled_for ON portfolio_processing_queue(scheduled_for) WHERE status = 'pending';

-- ========================================
-- Database Functions and Triggers
-- ========================================

-- Function to update search vector for full-text search
CREATE OR REPLACE FUNCTION update_portfolio_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector = 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', array_to_string(NEW.tags, ' ')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for search vector updates
CREATE TRIGGER update_portfolio_search_vector_trigger
  BEFORE INSERT OR UPDATE ON portfolio_images
  FOR EACH ROW EXECUTE FUNCTION update_portfolio_search_vector();

-- Function to update timestamp columns
CREATE OR REPLACE FUNCTION update_portfolio_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at columns
CREATE TRIGGER update_portfolio_images_updated_at
  BEFORE UPDATE ON portfolio_images
  FOR EACH ROW EXECUTE FUNCTION update_portfolio_updated_at();

CREATE TRIGGER update_portfolio_upload_jobs_updated_at
  BEFORE UPDATE ON portfolio_upload_jobs
  FOR EACH ROW EXECUTE FUNCTION update_portfolio_updated_at();

-- Function to automatically update analytics counters
CREATE OR REPLACE FUNCTION update_portfolio_analytics_counters()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_type = 'view' THEN
    UPDATE portfolio_images 
    SET views_count = views_count + 1,
        updated_at = NOW()
    WHERE id = NEW.image_id;
  ELSIF NEW.event_type = 'like' THEN
    UPDATE portfolio_images 
    SET likes_count = likes_count + 1,
        updated_at = NOW()
    WHERE id = NEW.image_id;
  ELSIF NEW.event_type = 'share' THEN
    UPDATE portfolio_images 
    SET shares_count = shares_count + 1,
        updated_at = NOW()
    WHERE id = NEW.image_id;
  ELSIF NEW.event_type = 'download' THEN
    UPDATE portfolio_images 
    SET downloads_count = downloads_count + 1,
        updated_at = NOW()
    WHERE id = NEW.image_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for analytics counter updates
CREATE TRIGGER update_portfolio_analytics_counters_trigger
  AFTER INSERT ON portfolio_analytics_events
  FOR EACH ROW EXECUTE FUNCTION update_portfolio_analytics_counters();

-- Function to update upload job progress
CREATE OR REPLACE FUNCTION update_upload_job_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Update processed file count when an image is successfully processed
  IF NEW.processing_status = 'completed' AND OLD.processing_status != 'completed' THEN
    UPDATE portfolio_upload_jobs
    SET processed_files = processed_files + 1,
        updated_at = NOW()
    WHERE id = NEW.upload_job_id;
  ELSIF NEW.processing_status = 'failed' AND OLD.processing_status != 'failed' THEN
    UPDATE portfolio_upload_jobs
    SET failed_files = failed_files + 1,
        updated_at = NOW()
    WHERE id = NEW.upload_job_id;
  END IF;
  
  -- Update job status to completed when all files are processed
  UPDATE portfolio_upload_jobs
  SET status = CASE 
    WHEN (processed_files + failed_files) = total_files THEN 'completed'
    ELSE status
  END,
  updated_at = NOW()
  WHERE id = NEW.upload_job_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for upload job progress tracking
CREATE TRIGGER update_upload_job_progress_trigger
  AFTER UPDATE ON portfolio_images
  FOR EACH ROW 
  WHEN (NEW.upload_job_id IS NOT NULL)
  EXECUTE FUNCTION update_upload_job_progress();

-- ========================================
-- Row Level Security (RLS) Policies
-- ========================================

-- Enable RLS on all tables
ALTER TABLE portfolio_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_upload_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_ai_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_processing_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_ai_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_processing_queue ENABLE ROW LEVEL SECURITY;

-- Portfolio Images Policies
CREATE POLICY "Suppliers can manage their portfolio images" ON portfolio_images
  FOR ALL USING (
    supplier_id IN (
      SELECT s.id FROM suppliers s
      JOIN user_profiles up ON up.organization_id = s.organization_id
      WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view active portfolio images" ON portfolio_images
  FOR SELECT USING (status = 'active');

-- Upload Jobs Policies
CREATE POLICY "Users can manage their upload jobs" ON portfolio_upload_jobs
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Organization members can view upload jobs" ON portfolio_upload_jobs
  FOR SELECT USING (
    supplier_id IN (
      SELECT s.id FROM suppliers s
      JOIN user_profiles up ON up.organization_id = s.organization_id
      WHERE up.user_id = auth.uid()
    )
  );

-- Activity Logs Policies
CREATE POLICY "Users can view their activity logs" ON portfolio_activity_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Organization members can view supplier activity" ON portfolio_activity_logs
  FOR SELECT USING (
    supplier_id IN (
      SELECT s.id FROM suppliers s
      JOIN user_profiles up ON up.organization_id = s.organization_id
      WHERE up.user_id = auth.uid()
    )
  );

-- AI Analysis Policies
CREATE POLICY "Suppliers can view their AI analysis" ON portfolio_ai_analysis
  FOR SELECT USING (
    image_id IN (
      SELECT pi.id FROM portfolio_images pi
      JOIN suppliers s ON s.id = pi.supplier_id
      JOIN user_profiles up ON up.organization_id = s.organization_id
      WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view AI analysis for active images" ON portfolio_ai_analysis
  FOR SELECT USING (
    image_id IN (
      SELECT id FROM portfolio_images WHERE status = 'active'
    )
  );

-- Error Tracking Policies
CREATE POLICY "Organization members can view processing errors" ON portfolio_processing_errors
  FOR SELECT USING (
    supplier_id IN (
      SELECT s.id FROM suppliers s
      JOIN user_profiles up ON up.organization_id = s.organization_id
      WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can view AI errors" ON portfolio_ai_errors
  FOR SELECT USING (
    supplier_id IN (
      SELECT s.id FROM suppliers s
      JOIN user_profiles up ON up.organization_id = s.organization_id
      WHERE up.user_id = auth.uid()
    )
  );

-- Analytics Policies
CREATE POLICY "Public can create analytics events" ON portfolio_analytics_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Organization members can view analytics" ON portfolio_analytics_events
  FOR SELECT USING (
    supplier_id IN (
      SELECT s.id FROM suppliers s
      JOIN user_profiles up ON up.organization_id = s.organization_id
      WHERE up.user_id = auth.uid()
    )
  );

-- Processing Queue Policies (Service role access only)
CREATE POLICY "Service role can manage processing queue" ON portfolio_processing_queue
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ========================================
-- Utility Functions for Analytics
-- ========================================

-- Function to get portfolio statistics for a supplier
CREATE OR REPLACE FUNCTION get_portfolio_stats(p_supplier_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_images', COUNT(*),
    'active_images', COUNT(*) FILTER (WHERE status = 'active'),
    'featured_images', COUNT(*) FILTER (WHERE featured = true),
    'total_views', SUM(views_count),
    'total_likes', SUM(likes_count),
    'total_shares', SUM(shares_count),
    'total_downloads', SUM(downloads_count),
    'avg_aesthetic_score', AVG(aesthetic_score),
    'category_breakdown', json_object_agg(
      category, 
      json_build_object(
        'count', category_count,
        'avg_views', category_avg_views,
        'avg_score', category_avg_score
      )
    )
  )
  INTO result
  FROM (
    SELECT 
      *,
      COUNT(*) OVER (PARTITION BY category) as category_count,
      AVG(views_count) OVER (PARTITION BY category) as category_avg_views,
      AVG(aesthetic_score) OVER (PARTITION BY category) as category_avg_score
    FROM portfolio_images 
    WHERE supplier_id = p_supplier_id AND status = 'active'
  ) stats;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old processing errors and logs
CREATE OR REPLACE FUNCTION cleanup_portfolio_data(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
  cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
  cutoff_date := NOW() - (days_to_keep || ' days')::INTERVAL;
  
  -- Delete old resolved errors
  DELETE FROM portfolio_processing_errors 
  WHERE resolved = true AND created_at < cutoff_date;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  DELETE FROM portfolio_ai_errors 
  WHERE resolved = true AND created_at < cutoff_date;
  GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
  
  -- Delete old activity logs (keep for audit trail)
  DELETE FROM portfolio_activity_logs 
  WHERE created_at < cutoff_date - INTERVAL '1 year';
  GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
  
  -- Delete old analytics events (aggregated data should be preserved)
  DELETE FROM portfolio_analytics_events 
  WHERE created_at < cutoff_date;
  GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
  
  -- Delete completed/failed processing queue items
  DELETE FROM portfolio_processing_queue 
  WHERE status IN ('completed', 'failed') AND created_at < cutoff_date;
  GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- Comments and Documentation
-- ========================================

COMMENT ON TABLE portfolio_images IS 'WS-186: Main portfolio images table with AI analysis and metadata';
COMMENT ON TABLE portfolio_upload_jobs IS 'WS-186: Tracks multi-file upload jobs with progress monitoring';
COMMENT ON TABLE portfolio_activity_logs IS 'WS-186: Audit trail for all portfolio operations';
COMMENT ON TABLE portfolio_ai_analysis IS 'WS-186: AI analysis results with scene detection and aesthetic scoring';
COMMENT ON TABLE portfolio_processing_errors IS 'WS-186: Error tracking for image processing pipeline';
COMMENT ON TABLE portfolio_ai_errors IS 'WS-186: Specific error tracking for AI analysis failures';
COMMENT ON TABLE portfolio_analytics_events IS 'WS-186: User engagement tracking and analytics';
COMMENT ON TABLE portfolio_processing_queue IS 'WS-186: Background job queue for image processing';

COMMENT ON COLUMN portfolio_images.search_vector IS 'Full-text search vector for title, description, tags, and category';
COMMENT ON COLUMN portfolio_images.aesthetic_score IS 'AI-generated aesthetic quality score (1-10)';
COMMENT ON COLUMN portfolio_images.metadata IS 'EXIF data, processing info, and optimization metrics';
COMMENT ON COLUMN portfolio_ai_analysis.overall_confidence IS 'Overall confidence score for AI analysis (0-1)';

-- Grant necessary permissions
GRANT SELECT ON portfolio_images TO anon, authenticated;
GRANT ALL ON portfolio_images TO service_role;
GRANT ALL ON portfolio_upload_jobs TO authenticated, service_role;
GRANT ALL ON portfolio_activity_logs TO authenticated, service_role;
GRANT SELECT ON portfolio_ai_analysis TO anon, authenticated;
GRANT ALL ON portfolio_ai_analysis TO service_role;
GRANT SELECT ON portfolio_processing_errors TO authenticated;
GRANT ALL ON portfolio_processing_errors TO service_role;
GRANT SELECT ON portfolio_ai_errors TO authenticated;
GRANT ALL ON portfolio_ai_errors TO service_role;
GRANT INSERT ON portfolio_analytics_events TO anon, authenticated;
GRANT SELECT ON portfolio_analytics_events TO authenticated;
GRANT ALL ON portfolio_analytics_events TO service_role;
GRANT ALL ON portfolio_processing_queue TO service_role;

-- Execute initial cleanup to establish baseline
SELECT cleanup_portfolio_data(30);

-- Create initial indexes for optimal performance
ANALYZE portfolio_images;
ANALYZE portfolio_upload_jobs;
ANALYZE portfolio_activity_logs;
ANALYZE portfolio_ai_analysis;
ANALYZE portfolio_analytics_events;