-- =====================================================
-- WS-160: Timeline Export System
-- =====================================================
-- Professional timeline export system with secure file handling
-- Supports PDF, CSV, Excel, and iCal formats with expiry and download limits
-- Feature: Timeline Builder UI
-- Created: 2025-08-27
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TIMELINE EXPORTS TABLE
-- =====================================================
-- Tracks secure timeline export files with expiry and download limits

CREATE TABLE IF NOT EXISTS timeline_exports (
    -- Primary identifiers
    id TEXT PRIMARY KEY,
    timeline_id UUID NOT NULL REFERENCES wedding_timelines(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- File information
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    mime_type TEXT NOT NULL,
    
    -- Export configuration
    export_format TEXT NOT NULL CHECK (export_format IN ('pdf', 'csv', 'excel', 'ical', 'google')),
    export_options JSONB DEFAULT '{}',
    version_type TEXT CHECK (version_type IN ('client', 'vendor', 'standard')) DEFAULT 'standard',
    
    -- Security and access control
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    download_limit INTEGER NOT NULL DEFAULT 10,
    downloads_count INTEGER NOT NULL DEFAULT 0,
    is_password_protected BOOLEAN NOT NULL DEFAULT false,
    password_hash TEXT,
    
    -- Tracking
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_downloaded_at TIMESTAMP WITH TIME ZONE,
    
    -- Soft delete for cleanup
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT timeline_exports_download_limit_check CHECK (downloads_count <= download_limit),
    CONSTRAINT timeline_exports_file_size_check CHECK (file_size > 0)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_timeline_exports_timeline_id ON timeline_exports(timeline_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_timeline_exports_user_id ON timeline_exports(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_timeline_exports_created_at ON timeline_exports(created_at DESC) WHERE deleted_at IS NULL;

-- Expiry and cleanup indexes
CREATE INDEX IF NOT EXISTS idx_timeline_exports_expires_at ON timeline_exports(expires_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_timeline_exports_cleanup ON timeline_exports(expires_at, downloads_count, download_limit) WHERE deleted_at IS NULL;

-- Format and version analytics
CREATE INDEX IF NOT EXISTS idx_timeline_exports_format ON timeline_exports(export_format, version_type) WHERE deleted_at IS NULL;

-- Performance optimization index
CREATE INDEX IF NOT EXISTS idx_timeline_exports_active_downloads 
ON timeline_exports(id, expires_at, downloads_count, download_limit) 
WHERE deleted_at IS NULL AND expires_at > NOW();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE timeline_exports ENABLE ROW LEVEL SECURITY;

-- Users can view their own exports
CREATE POLICY timeline_exports_select_own ON timeline_exports
FOR SELECT USING (
    auth.uid() = user_id 
    AND deleted_at IS NULL 
    AND expires_at > NOW()
);

-- Users can create exports for timelines they have access to
CREATE POLICY timeline_exports_insert_own ON timeline_exports
FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
        -- Timeline owner
        EXISTS (
            SELECT 1 FROM wedding_timelines 
            WHERE id = timeline_id 
            AND created_by = auth.uid()
        )
        OR
        -- Timeline collaborator with access
        EXISTS (
            SELECT 1 FROM timeline_collaborators
            WHERE timeline_id = timeline_exports.timeline_id
            AND user_id = auth.uid()
            AND status = 'active'
        )
    )
);

-- Users can update (soft delete) their own exports
CREATE POLICY timeline_exports_update_own ON timeline_exports
FOR UPDATE USING (
    auth.uid() = user_id
) WITH CHECK (
    auth.uid() = user_id
);

-- No delete policy - use soft delete only
CREATE POLICY timeline_exports_no_delete ON timeline_exports
FOR DELETE USING (false);

-- =====================================================
-- EXPORT ANALYTICS VIEW
-- =====================================================
-- Provides insights into export usage patterns

CREATE OR REPLACE VIEW timeline_export_analytics AS
SELECT 
    -- Time periods
    DATE_TRUNC('day', created_at) as export_date,
    DATE_TRUNC('week', created_at) as export_week,
    DATE_TRUNC('month', created_at) as export_month,
    
    -- Format breakdown
    export_format,
    version_type,
    
    -- Usage statistics
    COUNT(*) as total_exports,
    COUNT(CASE WHEN downloads_count > 0 THEN 1 END) as downloaded_exports,
    AVG(downloads_count) as avg_downloads_per_export,
    AVG(file_size / 1024.0 / 1024.0) as avg_file_size_mb,
    
    -- User engagement
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT timeline_id) as unique_timelines,
    
    -- Success rates
    ROUND(
        COUNT(CASE WHEN downloads_count > 0 THEN 1 END) * 100.0 / COUNT(*), 
        2
    ) as download_rate_percent
    
FROM timeline_exports 
WHERE deleted_at IS NULL
  AND created_at >= NOW() - INTERVAL '90 days'
GROUP BY 
    DATE_TRUNC('day', created_at),
    DATE_TRUNC('week', created_at), 
    DATE_TRUNC('month', created_at),
    export_format,
    version_type;

-- Grant access to analytics view
GRANT SELECT ON timeline_export_analytics TO authenticated;

-- =====================================================
-- AUTOMATED CLEANUP FUNCTIONS
-- =====================================================

-- Function to cleanup expired exports
CREATE OR REPLACE FUNCTION cleanup_expired_timeline_exports()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    cleanup_count INTEGER;
BEGIN
    -- Soft delete expired exports
    UPDATE timeline_exports 
    SET deleted_at = NOW()
    WHERE deleted_at IS NULL
      AND expires_at < NOW() - INTERVAL '7 days'; -- Keep for 7 days after expiry for recovery
    
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    
    -- Log cleanup activity
    INSERT INTO system_logs (level, category, message, metadata)
    VALUES (
        'info',
        'cleanup',
        'Timeline exports cleanup completed',
        jsonb_build_object(
            'cleaned_count', cleanup_count,
            'cleanup_time', NOW()
        )
    );
    
    RETURN cleanup_count;
END;
$$;

-- Function to get export statistics
CREATE OR REPLACE FUNCTION get_timeline_export_stats(
    timeline_id_param UUID DEFAULT NULL,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    format TEXT,
    version TEXT,
    count BIGINT,
    total_downloads BIGINT,
    avg_file_size_mb NUMERIC,
    success_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        te.export_format::TEXT,
        te.version_type::TEXT,
        COUNT(*) as count,
        SUM(te.downloads_count) as total_downloads,
        ROUND(AVG(te.file_size / 1024.0 / 1024.0)::NUMERIC, 2) as avg_file_size_mb,
        ROUND((COUNT(CASE WHEN te.downloads_count > 0 THEN 1 END) * 100.0 / COUNT(*))::NUMERIC, 1) as success_rate
    FROM timeline_exports te
    WHERE te.deleted_at IS NULL
      AND te.created_at >= NOW() - (days_back || ' days')::INTERVAL
      AND (timeline_id_param IS NULL OR te.timeline_id = timeline_id_param)
      AND (
          -- User can see own exports
          te.user_id = auth.uid()
          OR
          -- Or exports from timelines they have access to
          EXISTS (
              SELECT 1 FROM wedding_timelines wt
              WHERE wt.id = te.timeline_id
              AND wt.created_by = auth.uid()
          )
          OR
          EXISTS (
              SELECT 1 FROM timeline_collaborators tc
              WHERE tc.timeline_id = te.timeline_id
              AND tc.user_id = auth.uid()
              AND tc.status = 'active'
          )
      )
    GROUP BY te.export_format, te.version_type
    ORDER BY count DESC;
END;
$$;

-- =====================================================
-- SECURITY FUNCTIONS
-- =====================================================

-- Function to validate export access
CREATE OR REPLACE FUNCTION validate_timeline_export_access(
    export_id_param TEXT,
    user_id_param UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    export_record RECORD;
BEGIN
    -- Get export record
    SELECT * INTO export_record
    FROM timeline_exports
    WHERE id = export_id_param
      AND deleted_at IS NULL;
    
    -- Check if export exists
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if expired
    IF export_record.expires_at < NOW() THEN
        RETURN FALSE;
    END IF;
    
    -- Check download limit
    IF export_record.downloads_count >= export_record.download_limit THEN
        RETURN FALSE;
    END IF;
    
    -- Check user access
    IF export_record.user_id = user_id_param THEN
        RETURN TRUE;
    END IF;
    
    -- Check timeline access
    IF EXISTS (
        SELECT 1 FROM wedding_timelines 
        WHERE id = export_record.timeline_id 
        AND created_by = user_id_param
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Check collaborator access
    IF EXISTS (
        SELECT 1 FROM timeline_collaborators
        WHERE timeline_id = export_record.timeline_id
        AND user_id = user_id_param
        AND status = 'active'
    ) THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$;

-- =====================================================
-- SCHEDULED CLEANUP JOB
-- =====================================================

-- Create a scheduled job for cleanup (if pg_cron is available)
-- This should be run daily to cleanup expired exports
DO $$
BEGIN
    -- Only create if pg_cron extension exists
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Schedule daily cleanup at 2 AM
        PERFORM cron.schedule(
            'timeline-export-cleanup',
            '0 2 * * *',
            'SELECT cleanup_expired_timeline_exports();'
        );
    END IF;
EXCEPTION
    WHEN undefined_function THEN
        -- pg_cron not available, skip scheduling
        NULL;
END;
$$;

-- =====================================================
-- GRANTS AND PERMISSIONS
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON timeline_exports TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_timeline_exports() TO service_role;
GRANT EXECUTE ON FUNCTION get_timeline_export_stats(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_timeline_export_access(TEXT, UUID) TO authenticated;

-- Grant storage access for file operations
INSERT INTO storage.buckets (id, name, public) VALUES ('timeline-exports', 'timeline-exports', false) ON CONFLICT DO NOTHING;

-- Storage policies for timeline exports
DO $$
BEGIN
    -- Policy for authenticated users to upload their own exports
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Timeline exports upload access'
    ) THEN
        CREATE POLICY "Timeline exports upload access" ON storage.objects
        FOR INSERT TO authenticated WITH CHECK (
            bucket_id = 'timeline-exports' 
            AND (storage.foldername(name))[1] IN (
                SELECT t.id::TEXT 
                FROM wedding_timelines t 
                WHERE t.created_by = auth.uid()
                UNION
                SELECT tc.timeline_id::TEXT
                FROM timeline_collaborators tc
                WHERE tc.user_id = auth.uid() AND tc.status = 'active'
            )
        );
    END IF;

    -- Policy for authenticated users to download exports they have access to
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Timeline exports download access'
    ) THEN
        CREATE POLICY "Timeline exports download access" ON storage.objects
        FOR SELECT TO authenticated USING (
            bucket_id = 'timeline-exports' 
            AND (storage.foldername(name))[1] IN (
                SELECT t.id::TEXT 
                FROM wedding_timelines t 
                WHERE t.created_by = auth.uid()
                UNION
                SELECT tc.timeline_id::TEXT
                FROM timeline_collaborators tc
                WHERE tc.user_id = auth.uid() AND tc.status = 'active'
            )
        );
    END IF;
END;
$$;

-- =====================================================
-- MONITORING AND ALERTS
-- =====================================================

-- Create monitoring view for export system health
CREATE OR REPLACE VIEW timeline_export_system_health AS
SELECT
    -- Current system status
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as exports_last_24h,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as exports_last_7d,
    COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_exports,
    COUNT(*) FILTER (WHERE downloads_count >= download_limit) as maxed_out_exports,
    
    -- Storage usage
    SUM(file_size) FILTER (WHERE deleted_at IS NULL) as active_storage_bytes,
    ROUND(SUM(file_size) FILTER (WHERE deleted_at IS NULL) / 1024.0 / 1024.0 / 1024.0, 2) as active_storage_gb,
    
    -- Performance metrics
    ROUND(AVG(file_size / 1024.0 / 1024.0), 2) as avg_file_size_mb,
    ROUND(AVG(downloads_count), 2) as avg_downloads_per_export,
    
    -- Health indicators
    ROUND(
        COUNT(*) FILTER (WHERE downloads_count > 0) * 100.0 / 
        NULLIF(COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days'), 0),
        1
    ) as download_success_rate_7d
    
FROM timeline_exports
WHERE created_at >= NOW() - INTERVAL '30 days';

GRANT SELECT ON timeline_export_system_health TO authenticated;

-- =====================================================
-- COMPLETION LOG
-- =====================================================

INSERT INTO system_logs (level, category, message, metadata)
VALUES (
    'info',
    'migration',
    'WS-160 Timeline Export System migration completed successfully',
    jsonb_build_object(
        'feature', 'WS-160',
        'tables_created', ARRAY['timeline_exports'],
        'functions_created', ARRAY[
            'cleanup_expired_timeline_exports',
            'get_timeline_export_stats',
            'validate_timeline_export_access'
        ],
        'views_created', ARRAY['timeline_export_analytics', 'timeline_export_system_health'],
        'migration_date', NOW()
    )
);

COMMIT;