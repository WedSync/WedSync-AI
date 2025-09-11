-- Migration: Backup Recovery System
-- WS-337: Comprehensive backup and disaster recovery infrastructure
-- Created: 2025-01-22
-- Team: B, Round 1

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Backup job tracking and scheduling
CREATE TABLE backup_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL CHECK (job_type IN ('full', 'incremental', 'emergency', 'selective')),
  backup_scope TEXT NOT NULL CHECK (backup_scope IN ('complete', 'wedding-only', 'data-type')),
  target_wedding_ids UUID[],
  target_data_types TEXT[],
  scheduled_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'running', 'completed', 'failed', 'cancelled')),
  backup_size_bytes BIGINT,
  backup_location TEXT,
  retention_until TIMESTAMPTZ,
  priority_level INTEGER DEFAULT 5 CHECK (priority_level BETWEEN 1 AND 10),
  created_by UUID REFERENCES user_profiles(id),
  error_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backup snapshots with wedding context
CREATE TABLE backup_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_job_id UUID REFERENCES backup_jobs(id),
  snapshot_timestamp TIMESTAMPTZ NOT NULL,
  wedding_count INTEGER NOT NULL DEFAULT 0,
  guest_count INTEGER NOT NULL DEFAULT 0,
  photo_count INTEGER NOT NULL DEFAULT 0,
  timeline_event_count INTEGER NOT NULL DEFAULT 0,
  data_integrity_hash TEXT NOT NULL,
  encryption_key_id TEXT NOT NULL,
  storage_location TEXT NOT NULL,
  storage_provider TEXT NOT NULL CHECK (storage_provider IN ('supabase', 'aws-s3', 'azure', 'gcp')),
  compression_ratio DECIMAL(5,2),
  validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'corrupted', 'incomplete')),
  validation_completed_at TIMESTAMPTZ,
  accessible_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recovery operations audit trail
CREATE TABLE recovery_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_snapshot_id UUID NOT NULL REFERENCES backup_snapshots(id),
  operation_type TEXT NOT NULL CHECK (operation_type IN ('full-restore', 'selective-restore', 'emergency-restore', 'point-in-time')),
  recovery_scope JSONB NOT NULL, -- Details of what was restored
  initiated_by UUID NOT NULL REFERENCES user_profiles(id),
  authorized_by UUID REFERENCES user_profiles(id),
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'initiated' CHECK (status IN ('initiated', 'in-progress', 'completed', 'failed', 'cancelled')),
  affected_weddings UUID[],
  data_restored JSONB, -- Summary of restored data
  pre_recovery_snapshot TEXT, -- Snapshot ID before recovery
  success_metrics JSONB, -- Recovery validation results
  error_details JSONB,
  estimated_duration_minutes INTEGER,
  actual_duration_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wedding-specific backup settings
CREATE TABLE wedding_backup_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  backup_frequency_minutes INTEGER DEFAULT 60 CHECK (backup_frequency_minutes >= 15),
  high_priority_period_start TIMESTAMPTZ, -- Start of high-frequency backups
  high_priority_period_end TIMESTAMPTZ,   -- End of high-frequency backups
  retention_policy TEXT DEFAULT 'standard' CHECK (retention_policy IN ('minimal', 'standard', 'extended', 'permanent')),
  encryption_required BOOLEAN DEFAULT true,
  off_site_backup_enabled BOOLEAN DEFAULT true,
  notification_preferences JSONB DEFAULT '{"backup_success": false, "backup_failures": true, "recovery_operations": true}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(wedding_id)
);

-- Backup system configuration
CREATE TABLE backup_system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default system configuration
INSERT INTO backup_system_config (config_key, config_value, description) VALUES
('default_retention_days', '30', 'Default retention period for backups in days'),
('max_concurrent_backups', '3', 'Maximum number of concurrent backup operations'),
('emergency_backup_priority', '10', 'Priority level for emergency backups'),
('wedding_day_backup_frequency', '15', 'Backup frequency for wedding day in minutes'),
('compression_enabled', 'true', 'Enable backup compression'),
('encryption_key_rotation_days', '90', 'Encryption key rotation period in days'),
('off_site_backup_delay_hours', '4', 'Delay before off-site backup in hours'),
('validation_failure_retry_count', '3', 'Number of retries for validation failures');

-- Add emergency restore authorization to user profiles (if not exists)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'emergency_restore_authorized'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN emergency_restore_authorized BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Indexes for performance optimization
CREATE INDEX idx_backup_jobs_status_scheduled ON backup_jobs(status, scheduled_at) WHERE status IN ('scheduled', 'running');
CREATE INDEX idx_backup_jobs_wedding_ids ON backup_jobs USING GIN(target_wedding_ids) WHERE target_wedding_ids IS NOT NULL;
CREATE INDEX idx_backup_jobs_priority ON backup_jobs(priority_level DESC, scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_backup_jobs_created_by ON backup_jobs(created_by, created_at DESC);

CREATE INDEX idx_backup_snapshots_timestamp ON backup_snapshots(snapshot_timestamp DESC);
CREATE INDEX idx_backup_snapshots_validation ON backup_snapshots(validation_status, validation_completed_at);
CREATE INDEX idx_backup_snapshots_provider_location ON backup_snapshots(storage_provider, storage_location);
CREATE INDEX idx_backup_snapshots_accessible ON backup_snapshots(accessible_until) WHERE accessible_until IS NOT NULL;

CREATE INDEX idx_recovery_operations_wedding ON recovery_operations USING GIN(affected_weddings) WHERE affected_weddings IS NOT NULL;
CREATE INDEX idx_recovery_operations_status ON recovery_operations(status, started_at DESC);
CREATE INDEX idx_recovery_operations_initiated_by ON recovery_operations(initiated_by, started_at DESC);
CREATE INDEX idx_recovery_operations_snapshot ON recovery_operations(backup_snapshot_id);

CREATE INDEX idx_wedding_backup_settings_priority_period ON wedding_backup_settings(high_priority_period_start, high_priority_period_end) 
WHERE high_priority_period_start IS NOT NULL AND high_priority_period_end IS NOT NULL;
CREATE INDEX idx_wedding_backup_settings_frequency ON wedding_backup_settings(backup_frequency_minutes);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_backup_jobs_updated_at BEFORE UPDATE ON backup_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_backup_snapshots_updated_at BEFORE UPDATE ON backup_snapshots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recovery_operations_updated_at BEFORE UPDATE ON recovery_operations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wedding_backup_settings_updated_at BEFORE UPDATE ON wedding_backup_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_backup_system_config_updated_at BEFORE UPDATE ON backup_system_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get backup system statistics
CREATE OR REPLACE FUNCTION get_backup_system_stats()
RETURNS TABLE (
    total_backups BIGINT,
    successful_backups BIGINT,
    failed_backups BIGINT,
    total_data_backed_up_gb NUMERIC,
    last_successful_backup TIMESTAMPTZ,
    upcoming_weddings_protected BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_backups,
        COUNT(*) FILTER (WHERE bj.status = 'completed') as successful_backups,
        COUNT(*) FILTER (WHERE bj.status = 'failed') as failed_backups,
        COALESCE(SUM(bj.backup_size_bytes), 0)::NUMERIC / (1024^3) as total_data_backed_up_gb,
        MAX(bj.completed_at) FILTER (WHERE bj.status = 'completed') as last_successful_backup,
        COUNT(DISTINCT w.id) FILTER (
            WHERE w.date >= CURRENT_DATE 
            AND w.date <= CURRENT_DATE + INTERVAL '7 days'
            AND wbs.wedding_id IS NOT NULL
        ) as upcoming_weddings_protected
    FROM backup_jobs bj
    LEFT JOIN wedding_backup_settings wbs ON bj.target_wedding_ids && ARRAY[wbs.wedding_id]
    LEFT JOIN weddings w ON wbs.wedding_id = w.id
    WHERE bj.created_at >= CURRENT_DATE - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically set wedding backup settings for new weddings
CREATE OR REPLACE FUNCTION create_wedding_backup_settings()
RETURNS TRIGGER AS $$
DECLARE
    days_to_wedding INTEGER;
    high_priority_start TIMESTAMPTZ;
    high_priority_end TIMESTAMPTZ;
BEGIN
    -- Calculate days to wedding
    days_to_wedding := EXTRACT(DAY FROM NEW.date - CURRENT_DATE);
    
    -- Set high priority period (7 days before to 1 day after wedding)
    high_priority_start := NEW.date - INTERVAL '7 days';
    high_priority_end := NEW.date + INTERVAL '1 day';
    
    -- Insert backup settings with appropriate frequency based on wedding proximity
    INSERT INTO wedding_backup_settings (
        wedding_id,
        backup_frequency_minutes,
        high_priority_period_start,
        high_priority_period_end,
        retention_policy,
        encryption_required,
        off_site_backup_enabled
    ) VALUES (
        NEW.id,
        CASE 
            WHEN days_to_wedding <= 7 THEN 30  -- Every 30 minutes for weddings within a week
            WHEN days_to_wedding <= 30 THEN 60 -- Every hour for weddings within a month
            ELSE 240 -- Every 4 hours for distant weddings
        END,
        high_priority_start,
        high_priority_end,
        CASE 
            WHEN days_to_wedding <= 30 THEN 'extended'
            ELSE 'standard'
        END,
        true,
        days_to_wedding <= 30
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create backup settings for new weddings
CREATE TRIGGER create_wedding_backup_settings_trigger
    AFTER INSERT ON weddings
    FOR EACH ROW
    EXECUTE FUNCTION create_wedding_backup_settings();

-- Function to clean up expired backups
CREATE OR REPLACE FUNCTION cleanup_expired_backups()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Delete expired backup snapshots
    WITH deleted AS (
        DELETE FROM backup_snapshots 
        WHERE accessible_until < NOW()
        AND validation_status != 'corrupted' -- Keep corrupted backups for analysis
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    -- Delete backup jobs older than retention policy
    DELETE FROM backup_jobs 
    WHERE retention_until < NOW()
    AND status IN ('completed', 'failed', 'cancelled');
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies will be added in a separate section after this migration

-- Comments for documentation
COMMENT ON TABLE backup_jobs IS 'Tracks all backup operations with scheduling and priority information';
COMMENT ON TABLE backup_snapshots IS 'Stores metadata about backup snapshots including integrity information';
COMMENT ON TABLE recovery_operations IS 'Audit trail for all disaster recovery operations';
COMMENT ON TABLE wedding_backup_settings IS 'Wedding-specific backup configuration and policies';
COMMENT ON TABLE backup_system_config IS 'System-wide backup configuration settings';

COMMENT ON COLUMN backup_jobs.priority_level IS '1=Lowest, 10=Highest priority. Emergency backups default to 10';
COMMENT ON COLUMN backup_snapshots.data_integrity_hash IS 'Hash for verifying backup data integrity';
COMMENT ON COLUMN recovery_operations.recovery_scope IS 'JSON describing what data was restored';
COMMENT ON COLUMN wedding_backup_settings.backup_frequency_minutes IS 'How often to backup this wedding data';
COMMENT ON COLUMN wedding_backup_settings.high_priority_period_start IS 'When to start high-frequency backups';

-- Grant permissions to authenticated users (will be refined with RLS)
GRANT SELECT ON backup_jobs TO authenticated;
GRANT SELECT ON backup_snapshots TO authenticated;
GRANT SELECT ON recovery_operations TO authenticated;
GRANT SELECT ON wedding_backup_settings TO authenticated;
GRANT SELECT ON backup_system_config TO authenticated;

-- Grant execute permission on functions
GRANT EXECUTE ON FUNCTION get_backup_system_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_backups() TO service_role;