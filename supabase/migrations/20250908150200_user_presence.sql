-- WS-342: Real-Time Wedding Collaboration - User Presence Table
-- Team B Backend Development - Batch 1 Round 1
-- Description: Create user presence table for tracking real-time user activity and availability

-- Create user_presence table
CREATE TABLE user_presence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'away', 'busy', 'offline')),
    current_section TEXT,
    active_document TEXT,
    cursor_position JSONB DEFAULT '{}',
    is_typing BOOLEAN DEFAULT false,
    wedding_role TEXT NOT NULL CHECK (wedding_role IN ('couple', 'vendor', 'planner', 'family', 'friend', 'admin')),
    current_task TEXT,
    availability JSONB DEFAULT '[]',
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    device_info JSONB DEFAULT '{}',
    location_info JSONB DEFAULT '{}',
    
    UNIQUE(user_id, wedding_id),
    
    -- Performance indexes
    INDEX idx_user_presence_wedding (wedding_id, status, last_activity DESC),
    INDEX idx_user_presence_user (user_id, status, last_activity DESC),
    INDEX idx_user_presence_active (status, wedding_role, last_activity DESC) WHERE status != 'offline',
    INDEX idx_user_presence_typing (wedding_id, is_typing) WHERE is_typing = true
);

-- Add row level security
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Create policies for user presence
CREATE POLICY "Users can view presence for weddings they have access to" ON user_presence
    FOR SELECT USING (
        wedding_id IN (
            SELECT w.id FROM weddings w
            LEFT JOIN wedding_team wt ON w.id = wt.wedding_id
            WHERE w.couple_user_id = auth.uid() 
               OR w.partner_user_id = auth.uid()
               OR wt.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own presence" ON user_presence
    FOR ALL USING (user_id = auth.uid());

-- Create function to automatically update timestamp
CREATE OR REPLACE FUNCTION update_user_presence_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.last_activity = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER trigger_update_user_presence_timestamp
    BEFORE UPDATE ON user_presence
    FOR EACH ROW
    EXECUTE FUNCTION update_user_presence_timestamp();

-- Create function to upsert user presence
CREATE OR REPLACE FUNCTION upsert_user_presence(
    p_user_id UUID,
    p_wedding_id UUID,
    p_status TEXT,
    p_current_section TEXT DEFAULT NULL,
    p_wedding_role TEXT DEFAULT 'vendor',
    p_device_info JSONB DEFAULT NULL
)
RETURNS user_presence AS $$
DECLARE
    result user_presence;
BEGIN
    INSERT INTO user_presence (
        user_id, 
        wedding_id, 
        status, 
        current_section, 
        wedding_role,
        device_info,
        last_activity,
        updated_at
    )
    VALUES (
        p_user_id, 
        p_wedding_id, 
        p_status, 
        p_current_section, 
        p_wedding_role,
        COALESCE(p_device_info, '{}'),
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id, wedding_id)
    DO UPDATE SET
        status = EXCLUDED.status,
        current_section = COALESCE(EXCLUDED.current_section, user_presence.current_section),
        device_info = COALESCE(EXCLUDED.device_info, user_presence.device_info),
        last_activity = NOW(),
        updated_at = NOW()
    RETURNING * INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get active users for a wedding
CREATE OR REPLACE FUNCTION get_active_wedding_users(
    p_wedding_id UUID,
    p_include_away BOOLEAN DEFAULT true
)
RETURNS TABLE (
    user_id UUID,
    status TEXT,
    current_section TEXT,
    wedding_role TEXT,
    last_activity TIMESTAMP WITH TIME ZONE,
    is_typing BOOLEAN,
    current_task TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.user_id,
        up.status,
        up.current_section,
        up.wedding_role,
        up.last_activity,
        up.is_typing,
        up.current_task
    FROM user_presence up
    WHERE up.wedding_id = p_wedding_id
      AND (
          up.status = 'online' 
          OR up.status = 'busy'
          OR (p_include_away AND up.status = 'away')
      )
      AND up.last_activity > NOW() - INTERVAL '5 minutes'
    ORDER BY up.last_activity DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update user typing status
CREATE OR REPLACE FUNCTION update_typing_status(
    p_user_id UUID,
    p_wedding_id UUID,
    p_is_typing BOOLEAN,
    p_current_section TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    UPDATE user_presence 
    SET 
        is_typing = p_is_typing,
        current_section = COALESCE(p_current_section, current_section),
        last_activity = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id 
      AND wedding_id = p_wedding_id;
    
    -- Create presence record if it doesn't exist
    IF NOT FOUND THEN
        INSERT INTO user_presence (user_id, wedding_id, is_typing, current_section, wedding_role)
        VALUES (p_user_id, p_wedding_id, p_is_typing, p_current_section, 'vendor');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark users as offline after inactivity
CREATE OR REPLACE FUNCTION mark_inactive_users_offline()
RETURNS void AS $$
BEGIN
    UPDATE user_presence 
    SET 
        status = 'offline',
        is_typing = false,
        updated_at = NOW()
    WHERE status != 'offline' 
      AND last_activity < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- Create function to get presence statistics
CREATE OR REPLACE FUNCTION get_presence_statistics(
    p_wedding_id UUID,
    p_time_range INTERVAL DEFAULT INTERVAL '24 hours'
)
RETURNS TABLE (
    status TEXT,
    wedding_role TEXT,
    user_count BIGINT,
    avg_session_duration INTERVAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.status,
        up.wedding_role,
        COUNT(DISTINCT up.user_id) as user_count,
        AVG(up.updated_at - up.last_activity) as avg_session_duration
    FROM user_presence up
    WHERE up.wedding_id = p_wedding_id
      AND up.last_activity >= NOW() - p_time_range
    GROUP BY up.status, up.wedding_role
    ORDER BY user_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE user_presence IS 'Tracks real-time user presence and activity for wedding collaboration';
COMMENT ON COLUMN user_presence.status IS 'Current user status (online, away, busy, offline)';
COMMENT ON COLUMN user_presence.current_section IS 'Current section/page user is viewing';
COMMENT ON COLUMN user_presence.wedding_role IS 'Users role in the wedding (couple, vendor, planner, etc.)';
COMMENT ON COLUMN user_presence.availability IS 'JSON array of availability windows';
COMMENT ON COLUMN user_presence.device_info IS 'Information about users device/browser';
COMMENT ON COLUMN user_presence.location_info IS 'Optional location information';
COMMENT ON FUNCTION upsert_user_presence IS 'Creates or updates user presence information';
COMMENT ON FUNCTION get_active_wedding_users IS 'Returns list of currently active users for a wedding';
COMMENT ON FUNCTION update_typing_status IS 'Updates user typing status for real-time indicators';
COMMENT ON FUNCTION mark_inactive_users_offline IS 'Marks inactive users as offline for cleanup';