-- WS-342 Real-Time Wedding Collaboration - User Presence Table
-- Team B Backend Development - Real-time presence tracking

-- User presence table for real-time collaboration tracking
CREATE TABLE IF NOT EXISTS user_presence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'offline',
    current_section TEXT,
    active_document TEXT,
    cursor_position JSONB,
    is_typing BOOLEAN DEFAULT false,
    wedding_role TEXT NOT NULL,
    current_task TEXT,
    availability JSONB DEFAULT '[]',
    device_type TEXT DEFAULT 'desktop',
    location JSONB,
    timezone TEXT DEFAULT 'UTC',
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_status CHECK (
        status IN ('online', 'away', 'busy', 'offline', 'do_not_disturb')
    ),
    CONSTRAINT valid_wedding_role CHECK (
        wedding_role IN (
            'couple_primary', 'couple_secondary', 'wedding_planner',
            'vendor_photographer', 'vendor_venue', 'vendor_catering',
            'vendor_florist', 'vendor_music', 'vendor_transport', 'vendor_other',
            'family_immediate', 'family_extended', 'bridal_party', 'groomsmen',
            'friend', 'coordinator', 'admin'
        )
    ),
    CONSTRAINT valid_device_type CHECK (
        device_type IN ('desktop', 'mobile', 'tablet', 'smart_watch')
    ),
    CONSTRAINT valid_timestamps CHECK (updated_at >= session_start),
    
    -- Unique constraint for user-wedding combination
    UNIQUE(user_id, wedding_id)
);

-- High-performance indexes for presence queries
CREATE INDEX idx_user_presence_wedding_active ON user_presence (wedding_id, status, last_activity) 
    WHERE status != 'offline';
CREATE INDEX idx_user_presence_user_active ON user_presence (user_id, last_activity) 
    WHERE status != 'offline';
CREATE INDEX idx_user_presence_activity_recent ON user_presence (last_activity DESC) 
    WHERE last_activity > NOW() - INTERVAL '1 hour';
CREATE INDEX idx_user_presence_typing ON user_presence (wedding_id, is_typing, updated_at) 
    WHERE is_typing = true;
CREATE INDEX idx_user_presence_section ON user_presence (wedding_id, current_section, status);
CREATE INDEX idx_user_presence_role ON user_presence (wedding_role, status);

-- Specialized index for wedding day coordination
CREATE INDEX idx_user_presence_wedding_day ON user_presence (wedding_id, wedding_role, status, last_activity)
    WHERE status IN ('online', 'busy');

-- Presence analytics table for historical tracking
CREATE TABLE IF NOT EXISTS presence_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_active_minutes INTEGER DEFAULT 0,
    sessions_count INTEGER DEFAULT 0,
    sections_visited TEXT[] DEFAULT '{}',
    collaboration_events INTEGER DEFAULT 0,
    peak_activity_hour INTEGER, -- 0-23
    device_types_used TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(wedding_id, user_id, date)
);

-- Indexes for analytics
CREATE INDEX idx_presence_analytics_wedding_date ON presence_analytics (wedding_id, date);
CREATE INDEX idx_presence_analytics_user_date ON presence_analytics (user_id, date);
CREATE INDEX idx_presence_analytics_activity ON presence_analytics (date, total_active_minutes DESC);

-- Activity tracking table for detailed user actions
CREATE TABLE IF NOT EXISTS user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    activity_details JSONB NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration INTEGER, -- in seconds
    location JSONB,
    session_id TEXT,
    
    CONSTRAINT valid_activity_type CHECK (
        activity_type IN (
            'viewing_timeline', 'editing_budget', 'managing_vendors',
            'updating_guests', 'uploading_photos', 'messaging',
            'phone_call', 'meeting', 'site_visit', 'admin_task'
        )
    )
);

-- Indexes for activity tracking
CREATE INDEX idx_user_activities_wedding_time ON user_activities (wedding_id, timestamp DESC);
CREATE INDEX idx_user_activities_user_time ON user_activities (user_id, timestamp DESC);
CREATE INDEX idx_user_activities_type_time ON user_activities (activity_type, timestamp DESC);
CREATE INDEX idx_user_activities_session ON user_activities (session_id, timestamp);

-- Row Level Security
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE presence_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_presence
CREATE POLICY "Users can view presence for their weddings" ON user_presence
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM wedding_participants wp 
            WHERE wp.wedding_id = user_presence.wedding_id 
            AND wp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage own presence" ON user_presence
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- RLS Policies for activities
CREATE POLICY "Users can view activities for their weddings" ON user_activities
    FOR SELECT 
    USING (
        user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM wedding_participants wp 
            WHERE wp.wedding_id = user_activities.wedding_id 
            AND wp.user_id = auth.uid()
            AND wp.role IN ('couple_primary', 'couple_secondary', 'wedding_planner')
        )
    );

CREATE POLICY "Users can insert own activities" ON user_activities
    FOR INSERT 
    WITH CHECK (user_id = auth.uid());

-- Function to update presence with automatic status detection
CREATE OR REPLACE FUNCTION update_user_presence(
    p_user_id UUID,
    p_wedding_id UUID,
    p_status TEXT DEFAULT NULL,
    p_current_section TEXT DEFAULT NULL,
    p_active_document TEXT DEFAULT NULL,
    p_cursor_position JSONB DEFAULT NULL,
    p_is_typing BOOLEAN DEFAULT NULL,
    p_current_task TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    current_time TIMESTAMP WITH TIME ZONE := NOW();
    auto_status TEXT;
BEGIN
    -- Auto-detect status if not provided
    IF p_status IS NULL THEN
        SELECT 
            CASE 
                WHEN last_activity < current_time - INTERVAL '30 minutes' THEN 'away'
                WHEN last_activity < current_time - INTERVAL '5 minutes' THEN 'away'
                WHEN is_typing THEN 'online'
                ELSE COALESCE(status, 'online')
            END INTO auto_status
        FROM user_presence 
        WHERE user_id = p_user_id AND wedding_id = p_wedding_id;
        
        p_status := COALESCE(auto_status, 'online');
    END IF;

    -- Upsert presence record
    INSERT INTO user_presence (
        user_id, wedding_id, status, current_section, active_document,
        cursor_position, is_typing, current_task, last_activity, updated_at,
        wedding_role
    )
    VALUES (
        p_user_id, p_wedding_id, p_status, p_current_section, p_active_document,
        p_cursor_position, COALESCE(p_is_typing, false), p_current_task, 
        current_time, current_time,
        COALESCE(
            (SELECT role FROM wedding_participants 
             WHERE user_id = p_user_id AND wedding_id = p_wedding_id), 
            'friend'
        )
    )
    ON CONFLICT (user_id, wedding_id) 
    DO UPDATE SET
        status = EXCLUDED.status,
        current_section = COALESCE(EXCLUDED.current_section, user_presence.current_section),
        active_document = COALESCE(EXCLUDED.active_document, user_presence.active_document),
        cursor_position = COALESCE(EXCLUDED.cursor_position, user_presence.cursor_position),
        is_typing = COALESCE(EXCLUDED.is_typing, user_presence.is_typing),
        current_task = COALESCE(EXCLUDED.current_task, user_presence.current_task),
        last_activity = EXCLUDED.last_activity,
        updated_at = EXCLUDED.updated_at;

    -- Update daily analytics
    INSERT INTO presence_analytics (wedding_id, user_id, date, sessions_count)
    VALUES (p_wedding_id, p_user_id, CURRENT_DATE, 1)
    ON CONFLICT (wedding_id, user_id, date)
    DO UPDATE SET
        sessions_count = presence_analytics.sessions_count + 1,
        sections_visited = array_append(
            COALESCE(presence_analytics.sections_visited, '{}'), 
            p_current_section
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active collaborators for a wedding
CREATE OR REPLACE FUNCTION get_active_collaborators(
    p_wedding_id UUID,
    p_include_away BOOLEAN DEFAULT false
)
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
    avatar_url TEXT,
    status TEXT,
    wedding_role TEXT,
    current_section TEXT,
    is_typing BOOLEAN,
    last_activity TIMESTAMP WITH TIME ZONE,
    session_duration INTERVAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.user_id,
        u.first_name || ' ' || u.last_name as user_name,
        u.email as user_email,
        u.avatar_url,
        up.status,
        up.wedding_role,
        up.current_section,
        up.is_typing,
        up.last_activity,
        NOW() - up.session_start as session_duration
    FROM user_presence up
    JOIN users u ON up.user_id = u.id
    WHERE up.wedding_id = p_wedding_id
    AND up.last_activity > NOW() - INTERVAL '30 minutes'
    AND (
        p_include_away = true 
        OR up.status IN ('online', 'busy', 'do_not_disturb')
    )
    ORDER BY 
        CASE up.status 
            WHEN 'online' THEN 1
            WHEN 'busy' THEN 2 
            WHEN 'do_not_disturb' THEN 3
            WHEN 'away' THEN 4
            ELSE 5
        END,
        up.last_activity DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to detect idle users and update their status
CREATE OR REPLACE FUNCTION detect_and_update_idle_users()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Mark users as away if idle for more than 5 minutes
    UPDATE user_presence 
    SET status = 'away', updated_at = NOW()
    WHERE status = 'online' 
    AND last_activity < NOW() - INTERVAL '5 minutes';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- Mark users as offline if idle for more than 30 minutes
    UPDATE user_presence 
    SET status = 'offline', updated_at = NOW()
    WHERE status IN ('away', 'online') 
    AND last_activity < NOW() - INTERVAL '30 minutes';
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track user activity
CREATE OR REPLACE FUNCTION track_user_activity(
    p_user_id UUID,
    p_wedding_id UUID,
    p_activity_type TEXT,
    p_activity_details JSONB,
    p_duration INTEGER DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    activity_id UUID;
BEGIN
    INSERT INTO user_activities (
        user_id, wedding_id, activity_type, activity_details,
        duration, session_id
    )
    VALUES (
        p_user_id, p_wedding_id, p_activity_type, p_activity_details,
        p_duration, p_session_id
    )
    RETURNING id INTO activity_id;
    
    -- Update presence to show recent activity
    PERFORM update_user_presence(
        p_user_id => p_user_id,
        p_wedding_id => p_wedding_id,
        p_current_section => p_activity_details->>'section'
    );
    
    -- Update analytics
    UPDATE presence_analytics 
    SET 
        collaboration_events = collaboration_events + 1,
        total_active_minutes = total_active_minutes + COALESCE(p_duration / 60, 1)
    WHERE wedding_id = p_wedding_id 
    AND user_id = p_user_id 
    AND date = CURRENT_DATE;
    
    RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get presence analytics
CREATE OR REPLACE FUNCTION get_presence_analytics(
    p_wedding_id UUID,
    p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
    date DATE,
    total_users BIGINT,
    total_active_minutes BIGINT,
    avg_session_duration NUMERIC,
    peak_activity_hour INTEGER,
    most_active_sections TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pa.date,
        COUNT(DISTINCT pa.user_id) as total_users,
        SUM(pa.total_active_minutes) as total_active_minutes,
        AVG(pa.total_active_minutes::NUMERIC / pa.sessions_count) as avg_session_duration,
        MODE() WITHIN GROUP (ORDER BY pa.peak_activity_hour) as peak_activity_hour,
        array_agg(DISTINCT unnest(pa.sections_visited)) as most_active_sections
    FROM presence_analytics pa
    WHERE pa.wedding_id = p_wedding_id
    AND pa.date >= CURRENT_DATE - (p_days || ' days')::INTERVAL
    GROUP BY pa.date
    ORDER BY pa.date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old presence data
CREATE OR REPLACE FUNCTION cleanup_presence_data()
RETURNS void AS $$
BEGIN
    -- Remove offline users that haven't been active for 24 hours
    DELETE FROM user_presence 
    WHERE status = 'offline' 
    AND last_activity < NOW() - INTERVAL '24 hours';
    
    -- Archive old activities (older than 30 days)
    DELETE FROM user_activities 
    WHERE timestamp < NOW() - INTERVAL '30 days';
    
    -- Keep analytics for 1 year
    DELETE FROM presence_analytics 
    WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update presence analytics
CREATE OR REPLACE FUNCTION update_presence_analytics()
RETURNS trigger AS $$
BEGIN
    -- Calculate session duration for completed sessions
    IF OLD.status != 'offline' AND NEW.status = 'offline' THEN
        UPDATE presence_analytics 
        SET total_active_minutes = total_active_minutes + 
            EXTRACT(EPOCH FROM (NEW.updated_at - OLD.session_start)) / 60
        WHERE wedding_id = NEW.wedding_id 
        AND user_id = NEW.user_id 
        AND date = CURRENT_DATE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_presence_analytics
    AFTER UPDATE ON user_presence
    FOR EACH ROW
    EXECUTE FUNCTION update_presence_analytics();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_presence TO authenticated;
GRANT SELECT, INSERT, UPDATE ON presence_analytics TO authenticated;
GRANT SELECT, INSERT ON user_activities TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_presence(UUID, UUID, TEXT, TEXT, TEXT, JSONB, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_collaborators(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION track_user_activity(UUID, UUID, TEXT, JSONB, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_presence_analytics(UUID, INTEGER) TO authenticated;

-- Comments
COMMENT ON TABLE user_presence IS 'Real-time presence tracking for wedding collaboration with <50ms updates';
COMMENT ON TABLE user_activities IS 'Detailed activity tracking for user behavior analytics';
COMMENT ON TABLE presence_analytics IS 'Daily aggregated presence statistics for performance monitoring';
COMMENT ON FUNCTION update_user_presence(UUID, UUID, TEXT, TEXT, TEXT, JSONB, BOOLEAN, TEXT) IS 'Updates user presence with automatic status detection';
COMMENT ON FUNCTION get_active_collaborators(UUID, BOOLEAN) IS 'Returns currently active users for a wedding';
COMMENT ON FUNCTION detect_and_update_idle_users() IS 'Automatically updates status for idle users';
COMMENT ON FUNCTION track_user_activity(UUID, UUID, TEXT, JSONB, INTEGER, TEXT) IS 'Records user activity for analytics and presence updates';