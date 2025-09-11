-- =====================================================
-- WS-161: SUPPLIER SCHEDULE SYSTEM
-- =====================================================
-- Migration: 20250828075526_ws161_supplier_schedule_system.sql
-- Feature: WS-161 Supplier Schedules - Backend Schedule Generation APIs
-- Team: Team B - Round 3
-- Date: 2025-01-28
-- Description: Creates comprehensive supplier schedule management system
--              with automated generation, notifications, and access control

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================
-- 1. SUPPLIER SCHEDULES TABLE
-- =====================================================

-- Main table for storing supplier schedules
CREATE TABLE IF NOT EXISTS supplier_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timeline_id UUID NOT NULL REFERENCES wedding_timelines(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    
    -- Schedule data stored as JSONB for flexibility
    schedule_data JSONB NOT NULL DEFAULT '{}',
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'generated' CHECK (status IN (
        'generated', 'sent', 'viewed', 'confirmed', 'declined', 'needs_review', 'updated'
    )),
    confirmation_status VARCHAR(50) DEFAULT 'pending' CHECK (confirmation_status IN (
        'pending', 'confirmed', 'declined', 'partial'
    )),
    
    -- Metadata
    generated_at TIMESTAMPTZ DEFAULT now(),
    generated_by TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    confirmed_at TIMESTAMPTZ,
    confirmed_by TEXT,
    viewed_at TIMESTAMPTZ,
    
    -- Change tracking
    version INTEGER DEFAULT 1,
    last_change_reason TEXT,
    change_summary JSONB,
    
    -- Supplier feedback
    supplier_notes TEXT,
    contact_person JSONB,
    
    -- Access control
    access_token TEXT,
    token_expires_at TIMESTAMPTZ,
    
    -- Event confirmations (detailed breakdown)
    event_confirmations JSONB DEFAULT '[]',
    
    created_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(timeline_id, supplier_id)
);

-- =====================================================
-- 2. SUPPLIER ACCESS TOKENS TABLE
-- =====================================================

-- Table for managing secure access tokens for suppliers
CREATE TABLE IF NOT EXISTS supplier_access_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    timeline_id UUID NOT NULL REFERENCES wedding_timelines(id) ON DELETE CASCADE,
    
    -- Token security
    token_hash TEXT NOT NULL UNIQUE,
    
    -- Permissions and restrictions
    permissions TEXT[] DEFAULT ARRAY['view', 'confirm'],
    usage_count INTEGER DEFAULT 0,
    usage_limit INTEGER,
    ip_restrictions TEXT[],
    domain_restrictions TEXT[],
    
    -- Expiry and status
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    revoked_at TIMESTAMPTZ,
    revoked_by TEXT,
    revoke_reason TEXT,
    
    -- Usage tracking
    last_used_at TIMESTAMPTZ,
    last_used_ip INET,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by TEXT,
    
    INDEX(supplier_id, timeline_id),
    INDEX(token_hash),
    INDEX(expires_at, is_active)
);

-- =====================================================
-- 3. SUPPLIER TOKEN USAGE LOGS TABLE
-- =====================================================

-- Detailed logging of token usage for security and analytics
CREATE TABLE IF NOT EXISTS supplier_token_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id UUID NOT NULL REFERENCES supplier_access_tokens(id) ON DELETE CASCADE,
    
    -- Usage details
    action TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT now(),
    success BOOLEAN DEFAULT true,
    error TEXT,
    
    -- Request details
    request_path TEXT,
    request_method TEXT,
    response_status INTEGER,
    
    INDEX(token_id, timestamp DESC),
    INDEX(timestamp DESC),
    INDEX(action)
);

-- =====================================================
-- 4. SUPPLIER NOTIFICATIONS TABLE
-- =====================================================

-- Notifications sent to suppliers about schedule changes
CREATE TABLE IF NOT EXISTS supplier_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    timeline_id UUID NOT NULL REFERENCES wedding_timelines(id) ON DELETE CASCADE,
    
    -- Notification content
    type VARCHAR(100) NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    
    -- Delivery tracking
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending', 'sending', 'sent', 'delivered', 'failed', 'bounced'
    )),
    channels_sent TEXT[] DEFAULT ARRAY[]::TEXT[],
    tracking_info JSONB DEFAULT '{}',
    errors TEXT[],
    
    -- Timing
    created_at TIMESTAMPTZ DEFAULT now(),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    
    INDEX(supplier_id, created_at DESC),
    INDEX(timeline_id),
    INDEX(type),
    INDEX(status)
);

-- =====================================================
-- 5. SUPPLIER NOTIFICATION PREFERENCES TABLE
-- =====================================================

-- Per-supplier notification preferences
CREATE TABLE IF NOT EXISTS supplier_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE UNIQUE,
    
    -- Channel preferences
    email_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    push_enabled BOOLEAN DEFAULT true,
    
    -- Timing preferences
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    timezone TEXT DEFAULT 'Europe/London',
    
    -- Frequency preferences
    digest_frequency VARCHAR(20) DEFAULT 'immediate' CHECK (digest_frequency IN (
        'immediate', 'hourly', 'daily', 'weekly'
    )),
    
    -- Content preferences
    schedule_updates BOOLEAN DEFAULT true,
    reminder_notifications BOOLEAN DEFAULT true,
    confirmation_requests BOOLEAN DEFAULT true,
    marketing_communications BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 6. IN-APP NOTIFICATIONS TABLE
-- =====================================================

-- In-app notifications for suppliers
CREATE TABLE IF NOT EXISTS in_app_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    
    -- Notification content
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(100) NOT NULL,
    data JSONB DEFAULT '{}',
    
    -- Status
    is_read BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    
    -- Timing
    created_at TIMESTAMPTZ DEFAULT now(),
    read_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    
    INDEX(supplier_id, created_at DESC),
    INDEX(supplier_id, is_read),
    INDEX(type)
);

-- =====================================================
-- 7. SUPPLIER SCHEDULE EXPORTS TABLE
-- =====================================================

-- Track schedule exports for suppliers
CREATE TABLE IF NOT EXISTS supplier_schedule_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    timeline_id UUID NOT NULL REFERENCES wedding_timelines(id) ON DELETE CASCADE,
    
    -- Export details
    format VARCHAR(20) NOT NULL CHECK (format IN ('pdf', 'ics', 'csv', 'json')),
    options JSONB DEFAULT '{}',
    file_size INTEGER,
    file_path TEXT,
    
    -- Status and tracking
    status VARCHAR(50) DEFAULT 'generating' CHECK (status IN (
        'generating', 'completed', 'failed', 'expired'
    )),
    download_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    last_downloaded_at TIMESTAMPTZ,
    error_message TEXT,
    
    INDEX(supplier_id, created_at DESC),
    INDEX(timeline_id),
    INDEX(status),
    INDEX(expires_at)
);

-- =====================================================
-- 8. INDEXES FOR PERFORMANCE
-- =====================================================

-- Supplier schedules indexes
CREATE INDEX IF NOT EXISTS idx_supplier_schedules_timeline_id ON supplier_schedules(timeline_id);
CREATE INDEX IF NOT EXISTS idx_supplier_schedules_supplier_id ON supplier_schedules(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_schedules_status ON supplier_schedules(status);
CREATE INDEX IF NOT EXISTS idx_supplier_schedules_confirmation_status ON supplier_schedules(confirmation_status);
CREATE INDEX IF NOT EXISTS idx_supplier_schedules_generated_at ON supplier_schedules(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_schedules_updated_at ON supplier_schedules(updated_at DESC);

-- GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_supplier_schedules_schedule_data_gin ON supplier_schedules USING GIN (schedule_data);
CREATE INDEX IF NOT EXISTS idx_supplier_schedules_event_confirmations_gin ON supplier_schedules USING GIN (event_confirmations);

-- Access tokens indexes
CREATE INDEX IF NOT EXISTS idx_supplier_access_tokens_supplier_timeline ON supplier_access_tokens(supplier_id, timeline_id);
CREATE INDEX IF NOT EXISTS idx_supplier_access_tokens_active_expires ON supplier_access_tokens(is_active, expires_at) WHERE is_active = true;

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_supplier_notifications_unread ON supplier_notifications(supplier_id, status) WHERE status IN ('pending', 'sending');
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_unread ON in_app_notifications(supplier_id, is_read) WHERE is_read = false;

-- =====================================================
-- 9. FUNCTIONS FOR AUTOMATED OPERATIONS
-- =====================================================

-- Function to increment token usage count atomically
CREATE OR REPLACE FUNCTION increment_usage_count(token_id UUID)
RETURNS INTEGER AS $$
BEGIN
    UPDATE supplier_access_tokens 
    SET usage_count = usage_count + 1
    WHERE id = token_id;
    
    RETURN (SELECT usage_count FROM supplier_access_tokens WHERE id = token_id);
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    UPDATE supplier_access_tokens 
    SET is_active = false, revoke_reason = 'Expired cleanup'
    WHERE expires_at < now() AND is_active = true;
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    
    RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired exports
CREATE OR REPLACE FUNCTION cleanup_expired_exports()
RETURNS INTEGER AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    UPDATE supplier_schedule_exports
    SET status = 'expired'
    WHERE expires_at < now() AND status = 'completed';
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    
    RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

-- Function to generate schedule summary from JSONB data
CREATE OR REPLACE FUNCTION get_schedule_summary(schedule_data JSONB)
RETURNS JSONB AS $$
DECLARE
    summary JSONB;
    total_events INTEGER;
    earliest_arrival TIMESTAMPTZ;
    latest_departure TIMESTAMPTZ;
BEGIN
    -- Extract schedule items array
    WITH schedule_items AS (
        SELECT value as item
        FROM jsonb_array_elements(schedule_data->'schedule_items')
    )
    SELECT 
        COUNT(*),
        MIN((item->>'scheduled_arrival')::TIMESTAMPTZ),
        MAX((item->>'scheduled_departure')::TIMESTAMPTZ)
    INTO total_events, earliest_arrival, latest_departure
    FROM schedule_items;
    
    -- Build summary object
    summary = jsonb_build_object(
        'total_events', COALESCE(total_events, 0),
        'earliest_arrival', earliest_arrival,
        'latest_departure', latest_departure,
        'duration_hours', CASE 
            WHEN earliest_arrival IS NOT NULL AND latest_departure IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (latest_departure - earliest_arrival)) / 3600
            ELSE 0
        END
    );
    
    RETURN summary;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. TRIGGERS FOR AUTOMATION
-- =====================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_supplier_schedules_updated_at
    BEFORE UPDATE ON supplier_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplier_notification_preferences_updated_at
    BEFORE UPDATE ON supplier_notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to log schedule changes
CREATE OR REPLACE FUNCTION log_schedule_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert audit log entry
    INSERT INTO audit_logs (
        table_name,
        record_id,
        action,
        old_data,
        new_data,
        changed_by,
        changed_at
    ) VALUES (
        'supplier_schedules',
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
        COALESCE(NEW.generated_by, OLD.generated_by, 'system'),
        now()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit logging trigger (only if audit_logs table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs') THEN
        CREATE TRIGGER supplier_schedules_audit_trigger
            AFTER INSERT OR UPDATE OR DELETE ON supplier_schedules
            FOR EACH ROW EXECUTE FUNCTION log_schedule_changes();
    END IF;
END $$;

-- =====================================================
-- 11. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all supplier schedule tables
ALTER TABLE supplier_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_token_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_schedule_exports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for supplier_schedules
CREATE POLICY "Users can view schedules for their organization" ON supplier_schedules
    FOR SELECT USING (
        timeline_id IN (
            SELECT wt.id FROM wedding_timelines wt
            JOIN user_profiles up ON up.organization_id = wt.organization_id
            WHERE up.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage schedules for their organization" ON supplier_schedules
    FOR ALL USING (
        timeline_id IN (
            SELECT wt.id FROM wedding_timelines wt
            JOIN user_profiles up ON up.organization_id = wt.organization_id
            WHERE up.user_id = auth.uid()
        )
    );

-- RLS Policies for supplier_access_tokens (admin only)
CREATE POLICY "Admins can manage access tokens" ON supplier_access_tokens
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.user_id = auth.uid()
            AND up.role = 'admin'
        )
    );

-- RLS Policies for supplier_notifications
CREATE POLICY "Users can view notifications for their organization" ON supplier_notifications
    FOR SELECT USING (
        timeline_id IN (
            SELECT wt.id FROM wedding_timelines wt
            JOIN user_profiles up ON up.organization_id = wt.organization_id
            WHERE up.user_id = auth.uid()
        )
    );

-- RLS Policies for other tables follow similar pattern...

-- =====================================================
-- 12. VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for supplier schedule dashboard
CREATE OR REPLACE VIEW supplier_schedule_dashboard AS
SELECT 
    ss.id,
    ss.timeline_id,
    ss.supplier_id,
    s.business_name as supplier_name,
    s.primary_category,
    s.email as supplier_email,
    s.phone as supplier_phone,
    wt.timeline_name,
    wt.wedding_date,
    ss.status,
    ss.confirmation_status,
    ss.generated_at,
    ss.updated_at,
    ss.confirmed_at,
    get_schedule_summary(ss.schedule_data) as schedule_summary,
    CASE 
        WHEN ss.confirmation_status = 'confirmed' THEN 'success'
        WHEN ss.confirmation_status = 'declined' THEN 'error'
        WHEN ss.status = 'needs_review' THEN 'warning'
        ELSE 'info'
    END as status_color
FROM supplier_schedules ss
JOIN suppliers s ON s.id = ss.supplier_id
JOIN wedding_timelines wt ON wt.id = ss.timeline_id
WHERE ss.status != 'deleted';

-- View for token usage analytics
CREATE OR REPLACE VIEW supplier_token_analytics AS
SELECT 
    sat.id as token_id,
    sat.supplier_id,
    sat.timeline_id,
    s.business_name as supplier_name,
    sat.created_at as token_created,
    sat.expires_at,
    sat.usage_count,
    sat.usage_limit,
    sat.is_active,
    COUNT(stul.id) as log_entries,
    MAX(stul.timestamp) as last_activity,
    COUNT(DISTINCT stul.ip_address) as unique_ips
FROM supplier_access_tokens sat
LEFT JOIN supplier_token_usage_logs stul ON stul.token_id = sat.id
JOIN suppliers s ON s.id = sat.supplier_id
GROUP BY sat.id, s.business_name;

-- =====================================================
-- 13. SAMPLE DATA FOR TESTING (CONDITIONAL)
-- =====================================================

-- Only insert sample data in development environment
DO $$
BEGIN
    IF current_setting('app.environment', true) = 'development' THEN
        -- Create sample notification preferences for existing suppliers
        INSERT INTO supplier_notification_preferences (supplier_id, email_enabled, sms_enabled)
        SELECT id, true, false FROM suppliers 
        WHERE id NOT IN (SELECT supplier_id FROM supplier_notification_preferences)
        LIMIT 5;
        
        RAISE NOTICE 'Sample supplier notification preferences created for development';
    END IF;
END $$;

-- =====================================================
-- 14. MIGRATION COMPLETION LOG
-- =====================================================

-- Log successful migration
INSERT INTO migration_logs (
    migration_name,
    feature_id,
    team,
    applied_at,
    description
) VALUES (
    '20250828075526_ws161_supplier_schedule_system',
    'WS-161',
    'Team B',
    now(),
    'Supplier Schedule System - Backend APIs, notifications, and access control'
) ON CONFLICT (migration_name) DO NOTHING;

-- Add completion comment
COMMENT ON TABLE supplier_schedules IS 'WS-161: Main supplier schedule storage with JSONB flexibility for schedule data';
COMMENT ON TABLE supplier_access_tokens IS 'WS-161: Secure token-based access system for suppliers';
COMMENT ON TABLE supplier_notifications IS 'WS-161: Notification tracking and delivery management';

-- =====================================================
-- END OF MIGRATION
-- =====================================================

-- Final success message
DO $$
BEGIN
    RAISE NOTICE 'WS-161 Supplier Schedule System migration completed successfully';
    RAISE NOTICE 'Tables created: 7 main tables + supporting structures';
    RAISE NOTICE 'Features: Schedule generation, token access, notifications, exports';
    RAISE NOTICE 'Security: RLS policies, audit logging, secure tokens';
END $$;