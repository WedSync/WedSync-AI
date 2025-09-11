-- Migration: Row Level Security Policies for Backup System
-- WS-337: Secure backup and disaster recovery access control
-- Created: 2025-01-22
-- Team: B, Round 1

-- Enable RLS on all backup-related tables
ALTER TABLE backup_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wedding_backup_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_system_config ENABLE ROW LEVEL SECURITY;

-- BACKUP JOBS POLICIES
-- Policy: Users can view backup jobs for their own weddings or if they're admin
CREATE POLICY "backup_jobs_select_policy" ON backup_jobs
    FOR SELECT USING (
        -- Admin users can see all backup jobs
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
        OR
        -- Users can see backup jobs for weddings they're associated with
        EXISTS (
            SELECT 1 FROM weddings w
            WHERE w.id = ANY(target_wedding_ids)
            AND (w.supplier_id = auth.uid() OR w.couple_id = auth.uid())
        )
        OR
        -- Service role can access all
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Policy: Only admins and service role can create backup jobs
CREATE POLICY "backup_jobs_insert_policy" ON backup_jobs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND (role = 'admin' OR emergency_restore_authorized = true)
        )
        OR
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Policy: Only admins and service role can update backup jobs
CREATE POLICY "backup_jobs_update_policy" ON backup_jobs
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND (role = 'admin' OR emergency_restore_authorized = true)
        )
        OR
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Policy: Only admins can delete backup jobs
CREATE POLICY "backup_jobs_delete_policy" ON backup_jobs
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
        OR
        auth.jwt() ->> 'role' = 'service_role'
    );

-- BACKUP SNAPSHOTS POLICIES
-- Policy: Users can view snapshots for their weddings
CREATE POLICY "backup_snapshots_select_policy" ON backup_snapshots
    FOR SELECT USING (
        -- Admin users can see all snapshots
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
        OR
        -- Users can see snapshots for their weddings
        EXISTS (
            SELECT 1 FROM backup_jobs bj
            JOIN weddings w ON w.id = ANY(bj.target_wedding_ids)
            WHERE bj.id = backup_job_id
            AND (w.supplier_id = auth.uid() OR w.couple_id = auth.uid())
        )
        OR
        -- Service role can access all
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Policy: Only service role can manage backup snapshots
CREATE POLICY "backup_snapshots_insert_policy" ON backup_snapshots
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'role' = 'service_role'
        OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "backup_snapshots_update_policy" ON backup_snapshots
    FOR UPDATE USING (
        auth.jwt() ->> 'role' = 'service_role'
        OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "backup_snapshots_delete_policy" ON backup_snapshots
    FOR DELETE USING (
        auth.jwt() ->> 'role' = 'service_role'
        OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- RECOVERY OPERATIONS POLICIES
-- Policy: Users can view recovery operations for their weddings
CREATE POLICY "recovery_operations_select_policy" ON recovery_operations
    FOR SELECT USING (
        -- Admin users can see all recovery operations
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
        OR
        -- Users can see recovery operations they initiated
        initiated_by = auth.uid()
        OR
        -- Users can see recovery operations for their weddings
        EXISTS (
            SELECT 1 FROM weddings w
            WHERE w.id = ANY(affected_weddings)
            AND (w.supplier_id = auth.uid() OR w.couple_id = auth.uid())
        )
        OR
        -- Service role can access all
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Policy: Only authorized users can create recovery operations
CREATE POLICY "recovery_operations_insert_policy" ON recovery_operations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND (role = 'admin' OR emergency_restore_authorized = true)
        )
        AND initiated_by = auth.uid()
    );

-- Policy: Only service role and admins can update recovery operations
CREATE POLICY "recovery_operations_update_policy" ON recovery_operations
    FOR UPDATE USING (
        auth.jwt() ->> 'role' = 'service_role'
        OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Policy: No deletion of recovery operations (audit trail)
CREATE POLICY "recovery_operations_delete_policy" ON recovery_operations
    FOR DELETE USING (
        false -- Never allow deletion for audit compliance
    );

-- WEDDING BACKUP SETTINGS POLICIES
-- Policy: Users can view backup settings for their weddings
CREATE POLICY "wedding_backup_settings_select_policy" ON wedding_backup_settings
    FOR SELECT USING (
        -- Admin users can see all settings
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
        OR
        -- Users can see settings for their weddings
        EXISTS (
            SELECT 1 FROM weddings w
            WHERE w.id = wedding_id
            AND (w.supplier_id = auth.uid() OR w.couple_id = auth.uid())
        )
        OR
        -- Service role can access all
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Policy: Users can update backup settings for their weddings
CREATE POLICY "wedding_backup_settings_insert_policy" ON wedding_backup_settings
    FOR INSERT WITH CHECK (
        -- Admin users can create settings for any wedding
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
        OR
        -- Users can create settings for their weddings
        EXISTS (
            SELECT 1 FROM weddings w
            WHERE w.id = wedding_id
            AND w.supplier_id = auth.uid() -- Only suppliers can manage backup settings
        )
        OR
        -- Service role can create settings
        auth.jwt() ->> 'role' = 'service_role'
    );

CREATE POLICY "wedding_backup_settings_update_policy" ON wedding_backup_settings
    FOR UPDATE USING (
        -- Admin users can update any settings
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
        OR
        -- Suppliers can update settings for their weddings
        EXISTS (
            SELECT 1 FROM weddings w
            WHERE w.id = wedding_id
            AND w.supplier_id = auth.uid()
        )
        OR
        -- Service role can update settings
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Policy: Only admins can delete backup settings
CREATE POLICY "wedding_backup_settings_delete_policy" ON wedding_backup_settings
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
        OR
        auth.jwt() ->> 'role' = 'service_role'
    );

-- BACKUP SYSTEM CONFIG POLICIES
-- Policy: Only admins and service role can view system config
CREATE POLICY "backup_system_config_select_policy" ON backup_system_config
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
        OR
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Policy: Only admins can modify system config
CREATE POLICY "backup_system_config_insert_policy" ON backup_system_config
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
        AND created_by = auth.uid()
    );

CREATE POLICY "backup_system_config_update_policy" ON backup_system_config
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "backup_system_config_delete_policy" ON backup_system_config
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- ADDITIONAL SECURITY FUNCTIONS

-- Function to check if user can perform emergency restore
CREATE OR REPLACE FUNCTION can_perform_emergency_restore(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = user_id 
        AND (role = 'admin' OR emergency_restore_authorized = true)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user owns wedding or is authorized to access it
CREATE OR REPLACE FUNCTION can_access_wedding_backup(user_id UUID, wedding_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM weddings w
        JOIN user_profiles up ON up.id = user_id
        WHERE w.id = wedding_id
        AND (
            w.supplier_id = user_id 
            OR w.couple_id = user_id 
            OR up.role = 'admin'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log backup access attempts
CREATE OR REPLACE FUNCTION log_backup_access(
    user_id UUID,
    action_type TEXT,
    resource_type TEXT,
    resource_id UUID,
    success BOOLEAN
)
RETURNS VOID AS $$
BEGIN
    -- In a production system, this would log to an audit table
    -- For now, we'll use PostgreSQL's built-in logging
    RAISE NOTICE 'BACKUP_AUDIT: User % attempted % on % % - Success: %', 
        user_id, action_type, resource_type, resource_id, success;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to functions
GRANT EXECUTE ON FUNCTION can_perform_emergency_restore(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_wedding_backup(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION log_backup_access(UUID, TEXT, TEXT, UUID, BOOLEAN) TO service_role;

-- Create audit trigger function for backup operations
CREATE OR REPLACE FUNCTION backup_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Log all backup-related operations
    PERFORM log_backup_access(
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        true
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers
CREATE TRIGGER backup_jobs_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON backup_jobs
    FOR EACH ROW EXECUTE FUNCTION backup_audit_trigger();

CREATE TRIGGER recovery_operations_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON recovery_operations
    FOR EACH ROW EXECUTE FUNCTION backup_audit_trigger();

-- Create indexes for RLS policy performance
CREATE INDEX idx_user_profiles_role_emergency ON user_profiles(role, emergency_restore_authorized) WHERE role = 'admin' OR emergency_restore_authorized = true;
CREATE INDEX idx_weddings_supplier_couple ON weddings(supplier_id, couple_id);

-- Comments for security documentation
COMMENT ON POLICY "backup_jobs_select_policy" ON backup_jobs IS 'Users can only view backup jobs for weddings they are associated with or if they are admin';
COMMENT ON POLICY "recovery_operations_insert_policy" ON recovery_operations IS 'Only users with emergency restore authorization can initiate recovery operations';
COMMENT ON FUNCTION can_perform_emergency_restore(UUID) IS 'Security function to verify emergency restore permissions';
COMMENT ON FUNCTION log_backup_access(UUID, TEXT, TEXT, UUID, BOOLEAN) IS 'Audit logging function for backup system access';

-- Final security validation
DO $$
BEGIN
    -- Verify that RLS is enabled on all tables
    IF NOT (
        SELECT bool_and(relrowsecurity) 
        FROM pg_class 
        WHERE relname IN ('backup_jobs', 'backup_snapshots', 'recovery_operations', 'wedding_backup_settings', 'backup_system_config')
    ) THEN
        RAISE EXCEPTION 'RLS not properly enabled on all backup tables';
    END IF;
    
    RAISE NOTICE 'Backup system RLS policies successfully applied';
END $$;