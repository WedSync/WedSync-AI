-- WS-204: Comprehensive Presence Tracking System
-- Migration: 20250831235116_ws204_presence_tracking_system.sql
-- Backend infrastructure for real-time presence tracking with privacy controls and enterprise analytics

-- ============================================================================
-- PRESENCE SETTINGS TABLE
-- Stores user presence preferences and visibility settings
-- ============================================================================

CREATE TABLE IF NOT EXISTS presence_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    visibility TEXT CHECK (visibility IN ('everyone', 'team', 'contacts', 'nobody')) DEFAULT 'contacts' NOT NULL,
    show_activity BOOLEAN DEFAULT true NOT NULL,
    show_current_page BOOLEAN DEFAULT false NOT NULL,
    appear_offline BOOLEAN DEFAULT false NOT NULL,
    custom_status TEXT CHECK (LENGTH(custom_status) <= 100),
    custom_status_emoji TEXT CHECK (LENGTH(custom_status_emoji) <= 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- USER LAST SEEN TABLE
-- Persistent storage for user presence and activity tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_last_seen (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    last_page TEXT,
    last_device TEXT CHECK (last_device IN ('desktop', 'mobile', 'tablet')),
    last_activity_type TEXT,
    session_duration_minutes INTEGER DEFAULT 0,
    is_online BOOLEAN DEFAULT false NOT NULL,
    last_status TEXT CHECK (last_status IN ('online', 'idle', 'away', 'busy')) DEFAULT 'offline',
    session_id UUID,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- PRESENCE ACTIVITY LOGS TABLE  
-- Enterprise analytics and audit trail for presence activities
-- ============================================================================

CREATE TABLE IF NOT EXISTS presence_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'status_change', 'page_view', 'session_start', 'session_end',
        'typing_start', 'typing_stop', 'focus_change', 'device_change',
        'settings_update', 'presence_query'
    )),
    page_viewed TEXT,
    from_status TEXT,
    to_status TEXT,
    device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
    session_id UUID,
    duration_seconds INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT valid_status_change CHECK (
        (activity_type != 'status_change') OR 
        (from_status IS NOT NULL AND to_status IS NOT NULL)
    ),
    CONSTRAINT valid_session_timing CHECK (
        (activity_type NOT IN ('session_start', 'session_end')) OR 
        session_id IS NOT NULL
    )
);

-- ============================================================================
-- PRESENCE RELATIONSHIP CACHE TABLE
-- Cached relationship data for performance optimization
-- ============================================================================

CREATE TABLE IF NOT EXISTS presence_relationship_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    relationship_type TEXT NOT NULL CHECK (relationship_type IN (
        'same_user', 'organization_member', 'wedding_collaborator', 'public', 'none'
    )),
    can_view_presence BOOLEAN DEFAULT false NOT NULL,
    can_view_activity BOOLEAN DEFAULT false NOT NULL,
    can_view_current_page BOOLEAN DEFAULT false NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '10 minutes') NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    UNIQUE(user_id, target_user_id)
);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- Privacy enforcement at the database level
-- ============================================================================

-- Enable RLS on all presence tables
ALTER TABLE presence_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_last_seen ENABLE ROW LEVEL SECURITY;
ALTER TABLE presence_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE presence_relationship_cache ENABLE ROW LEVEL SECURITY;

-- PRESENCE SETTINGS POLICIES
-- Users can only manage their own presence settings
CREATE POLICY "Users manage own presence settings" ON presence_settings
    FOR ALL USING (auth.uid() = user_id);

-- LAST SEEN POLICIES  
-- Complex visibility based on privacy settings and relationships
CREATE POLICY "Last seen visibility based on relationship and privacy" ON user_last_seen
    FOR SELECT USING (
        -- Users can always see their own data
        user_id = auth.uid() OR
        
        -- Check privacy settings and relationship permissions
        EXISTS (
            SELECT 1 FROM presence_settings ps 
            WHERE ps.user_id = user_last_seen.user_id 
            AND ps.appear_offline = false
            AND ps.visibility != 'nobody'
            AND (
                -- Everyone visibility
                ps.visibility = 'everyone' OR
                
                -- Team visibility - same organization
                (ps.visibility = 'team' AND EXISTS (
                    SELECT 1 FROM user_profiles up1, user_profiles up2
                    WHERE up1.user_id = auth.uid() 
                    AND up2.user_id = user_last_seen.user_id
                    AND up1.organization_id = up2.organization_id
                    AND up1.organization_id IS NOT NULL
                    AND up2.organization_id IS NOT NULL
                )) OR
                
                -- Contacts visibility - wedding collaboration
                (ps.visibility = 'contacts' AND EXISTS (
                    SELECT 1 FROM vendor_wedding_connections vwc
                    WHERE (
                        (vwc.supplier_id = auth.uid() AND vwc.client_id = user_last_seen.user_id) OR
                        (vwc.client_id = auth.uid() AND vwc.supplier_id = user_last_seen.user_id)
                    )
                    AND vwc.connection_status = 'active'
                ))
            )
        )
    );

-- Users can only update their own last seen data
CREATE POLICY "Users update own last seen" ON user_last_seen
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users insert own last seen" ON user_last_seen
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ACTIVITY LOGS POLICIES
-- Enterprise activity logs restricted to organization admins and user themselves
CREATE POLICY "Users see own activity logs" ON presence_activity_logs
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.user_id = auth.uid()
            AND up.organization_id = presence_activity_logs.organization_id
            AND up.role IN ('admin', 'owner')
        )
    );

-- Only system can insert activity logs (service role)
CREATE POLICY "System inserts activity logs" ON presence_activity_logs
    FOR INSERT WITH CHECK (
        -- Allow service role to insert
        auth.role() = 'service_role' OR
        -- Allow users to insert their own logs
        user_id = auth.uid()
    );

-- RELATIONSHIP CACHE POLICIES
-- Users can only access their own cached relationship data
CREATE POLICY "Users access own relationship cache" ON presence_relationship_cache
    FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- PERFORMANCE INDEXES
-- Optimized indexes for presence query patterns
-- ============================================================================

-- Presence settings indexes
CREATE INDEX idx_presence_settings_user_id ON presence_settings(user_id);
CREATE INDEX idx_presence_settings_visibility ON presence_settings(visibility) WHERE visibility != 'nobody';

-- Last seen indexes for performance
CREATE INDEX idx_user_last_seen_user_id ON user_last_seen(user_id);
CREATE INDEX idx_user_last_seen_online_status ON user_last_seen(is_online, last_seen_at DESC);
CREATE INDEX idx_user_last_seen_updated_at ON user_last_seen(updated_at DESC);

-- Activity logs indexes for analytics
CREATE INDEX idx_presence_activity_user_timestamp ON presence_activity_logs(user_id, timestamp DESC);
CREATE INDEX idx_presence_activity_org_timestamp ON presence_activity_logs(organization_id, timestamp DESC);
CREATE INDEX idx_presence_activity_type_timestamp ON presence_activity_logs(activity_type, timestamp DESC);
CREATE INDEX idx_presence_activity_session ON presence_activity_logs(session_id, timestamp);

-- JSONB indexes for metadata queries
CREATE INDEX idx_presence_activity_metadata_gin ON presence_activity_logs USING GIN (metadata);

-- Relationship cache indexes
CREATE INDEX idx_relationship_cache_user_target ON presence_relationship_cache(user_id, target_user_id);
CREATE INDEX idx_relationship_cache_expires ON presence_relationship_cache(expires_at);
CREATE INDEX idx_relationship_cache_relationship_type ON presence_relationship_cache(relationship_type);

-- Composite indexes for wedding industry queries
CREATE INDEX idx_vendor_wedding_connections_presence ON vendor_wedding_connections(supplier_id, client_id) 
    WHERE connection_status = 'active';
CREATE INDEX idx_user_profiles_organization ON user_profiles(user_id, organization_id) 
    WHERE organization_id IS NOT NULL;

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- Automated maintenance and data consistency
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at columns
CREATE TRIGGER update_presence_settings_updated_at 
    BEFORE UPDATE ON presence_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_last_seen_updated_at 
    BEFORE UPDATE ON user_last_seen 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired relationship cache
CREATE OR REPLACE FUNCTION cleanup_expired_relationship_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM presence_relationship_cache 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to initialize default presence settings for new users
CREATE OR REPLACE FUNCTION initialize_user_presence_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO presence_settings (user_id, visibility, show_activity, show_current_page, appear_offline)
    VALUES (NEW.id, 'contacts', true, false, false)
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO user_last_seen (user_id, last_seen_at, is_online)
    VALUES (NEW.id, NOW(), false)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to initialize presence settings for new users
CREATE TRIGGER initialize_presence_on_user_creation
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION initialize_user_presence_settings();

-- ============================================================================
-- HELPER FUNCTIONS
-- Business logic functions for presence management
-- ============================================================================

-- Function to check if user can view another user's presence
CREATE OR REPLACE FUNCTION can_view_user_presence(
    target_user_id UUID,
    viewer_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
DECLARE
    target_settings presence_settings%ROWTYPE;
    has_relationship BOOLEAN := false;
BEGIN
    -- Users can always see their own presence
    IF target_user_id = viewer_user_id THEN
        RETURN true;
    END IF;
    
    -- Get target user's privacy settings
    SELECT * INTO target_settings
    FROM presence_settings 
    WHERE user_id = target_user_id;
    
    -- If no settings found, default to 'contacts' visibility
    IF NOT FOUND THEN
        target_settings.visibility := 'contacts';
        target_settings.appear_offline := false;
    END IF;
    
    -- Check appear offline override
    IF target_settings.appear_offline OR target_settings.visibility = 'nobody' THEN
        RETURN false;
    END IF;
    
    -- Check visibility level
    CASE target_settings.visibility
        WHEN 'everyone' THEN
            RETURN true;
            
        WHEN 'team' THEN
            -- Check organization membership
            SELECT EXISTS (
                SELECT 1 FROM user_profiles up1, user_profiles up2
                WHERE up1.user_id = viewer_user_id 
                AND up2.user_id = target_user_id
                AND up1.organization_id = up2.organization_id
                AND up1.organization_id IS NOT NULL
                AND up2.organization_id IS NOT NULL
            ) INTO has_relationship;
            
        WHEN 'contacts' THEN
            -- Check wedding collaboration
            SELECT EXISTS (
                SELECT 1 FROM vendor_wedding_connections vwc
                WHERE (
                    (vwc.supplier_id = viewer_user_id AND vwc.client_id = target_user_id) OR
                    (vwc.client_id = viewer_user_id AND vwc.supplier_id = target_user_id)
                )
                AND vwc.connection_status = 'active'
            ) INTO has_relationship;
            
        ELSE
            RETURN false;
    END CASE;
    
    RETURN has_relationship;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to bulk check presence permissions (for performance)
CREATE OR REPLACE FUNCTION get_viewable_user_presence_ids(
    target_user_ids UUID[],
    viewer_user_id UUID DEFAULT auth.uid()
)
RETURNS UUID[] AS $$
DECLARE
    viewable_ids UUID[] := ARRAY[]::UUID[];
    target_id UUID;
BEGIN
    FOREACH target_id IN ARRAY target_user_ids
    LOOP
        IF can_view_user_presence(target_id, viewer_user_id) THEN
            viewable_ids := array_append(viewable_ids, target_id);
        END IF;
    END LOOP;
    
    RETURN viewable_ids;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- INITIAL DATA AND CONSTRAINTS
-- ============================================================================

-- Add comments for documentation
COMMENT ON TABLE presence_settings IS 'User presence privacy settings and preferences';
COMMENT ON TABLE user_last_seen IS 'Persistent last seen tracking and session data';
COMMENT ON TABLE presence_activity_logs IS 'Enterprise activity logging and analytics';
COMMENT ON TABLE presence_relationship_cache IS 'Cached relationship permissions for performance';

COMMENT ON COLUMN presence_settings.visibility IS 'Who can see user presence: everyone, team, contacts, nobody';
COMMENT ON COLUMN presence_settings.appear_offline IS 'Override to always appear offline regardless of actual status';
COMMENT ON COLUMN user_last_seen.session_duration_minutes IS 'Duration of last session in minutes';
COMMENT ON COLUMN presence_activity_logs.metadata IS 'JSON metadata for activity context and analytics';

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON presence_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_last_seen TO authenticated;
GRANT SELECT ON presence_activity_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON presence_relationship_cache TO authenticated;

-- Grant service role permissions for activity logging
GRANT INSERT ON presence_activity_logs TO service_role;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration completion
INSERT INTO migration_logs (migration_name, completed_at, description) 
VALUES (
    '20250831235116_ws204_presence_tracking_system',
    NOW(),
    'WS-204: Comprehensive presence tracking system with privacy controls and enterprise analytics'
)
ON CONFLICT (migration_name) DO UPDATE SET 
    completed_at = NOW(),
    description = EXCLUDED.description;