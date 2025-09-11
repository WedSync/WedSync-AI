-- WS-342 Real-Time Wedding Collaboration - Collaboration Sessions Table
-- Team B Backend Development - Database Migration

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Collaboration sessions table
CREATE TABLE IF NOT EXISTS collaboration_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    permissions JSONB NOT NULL DEFAULT '{}',
    device_info JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    is_active BOOLEAN DEFAULT true,
    
    -- Constraints
    CONSTRAINT valid_session_token CHECK (length(session_token) >= 32),
    CONSTRAINT valid_permissions CHECK (permissions IS NOT NULL),
    CONSTRAINT valid_timestamps CHECK (expires_at > created_at)
);

-- Indexes for performance
CREATE INDEX idx_collaboration_sessions_wedding ON collaboration_sessions (wedding_id, is_active);
CREATE INDEX idx_collaboration_sessions_user ON collaboration_sessions (user_id, is_active);
CREATE INDEX idx_collaboration_sessions_active ON collaboration_sessions (is_active, last_activity);
CREATE INDEX idx_collaboration_sessions_token ON collaboration_sessions (session_token) WHERE is_active = true;
CREATE INDEX idx_collaboration_sessions_expires ON collaboration_sessions (expires_at) WHERE is_active = true;

-- Row Level Security
ALTER TABLE collaboration_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own collaboration sessions" ON collaboration_sessions
    FOR SELECT 
    USING (
        user_id = auth.uid() 
        OR 
        EXISTS (
            SELECT 1 FROM wedding_participants wp 
            WHERE wp.wedding_id = collaboration_sessions.wedding_id 
            AND wp.user_id = auth.uid()
            AND wp.role IN ('couple_primary', 'couple_secondary', 'wedding_planner', 'admin')
        )
    );

CREATE POLICY "Users can create own collaboration sessions" ON collaboration_sessions
    FOR INSERT 
    WITH CHECK (
        user_id = auth.uid()
        AND
        EXISTS (
            SELECT 1 FROM wedding_participants wp 
            WHERE wp.wedding_id = collaboration_sessions.wedding_id 
            AND wp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own collaboration sessions" ON collaboration_sessions
    FOR UPDATE 
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can deactivate own collaboration sessions" ON collaboration_sessions
    FOR DELETE 
    USING (user_id = auth.uid());

-- Function to automatically expire old sessions
CREATE OR REPLACE FUNCTION expire_collaboration_sessions()
RETURNS void AS $$
BEGIN
    UPDATE collaboration_sessions 
    SET is_active = false 
    WHERE expires_at < NOW() AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old sessions
CREATE OR REPLACE FUNCTION cleanup_collaboration_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM collaboration_sessions 
    WHERE created_at < NOW() - INTERVAL '7 days' 
    AND is_active = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate secure session token
CREATE OR REPLACE FUNCTION generate_session_token()
RETURNS text AS $$
DECLARE
    token text;
BEGIN
    -- Generate a secure random token
    token := encode(gen_random_bytes(32), 'hex');
    
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM collaboration_sessions WHERE session_token = token AND is_active = true) LOOP
        token := encode(gen_random_bytes(32), 'hex');
    END LOOP;
    
    RETURN token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate session and return user context
CREATE OR REPLACE FUNCTION validate_collaboration_session(p_session_token text)
RETURNS TABLE (
    session_id UUID,
    user_id UUID,
    wedding_id UUID,
    permissions JSONB,
    is_valid BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.id,
        cs.user_id,
        cs.wedding_id,
        cs.permissions,
        (cs.is_active AND cs.expires_at > NOW()) as is_valid
    FROM collaboration_sessions cs
    WHERE cs.session_token = p_session_token
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to refresh session activity
CREATE OR REPLACE FUNCTION refresh_session_activity(p_session_token text)
RETURNS boolean AS $$
DECLARE
    session_exists boolean;
BEGIN
    UPDATE collaboration_sessions 
    SET 
        last_activity = NOW(),
        expires_at = NOW() + INTERVAL '24 hours'
    WHERE session_token = p_session_token 
    AND is_active = true 
    AND expires_at > NOW();
    
    GET DIAGNOSTICS session_exists = ROW_COUNT;
    RETURN session_exists > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update last_activity
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS trigger AS $$
BEGIN
    NEW.last_activity = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_session_activity
    BEFORE UPDATE ON collaboration_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_session_activity();

-- Schedule cleanup functions (if pg_cron is available)
-- SELECT cron.schedule('expire-collaboration-sessions', '* * * * *', 'SELECT expire_collaboration_sessions();');
-- SELECT cron.schedule('cleanup-collaboration-sessions', '0 2 * * *', 'SELECT cleanup_collaboration_sessions();');

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON collaboration_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION generate_session_token() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_collaboration_session(text) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_session_activity(text) TO authenticated;

-- Add helpful comments
COMMENT ON TABLE collaboration_sessions IS 'Tracks active collaboration sessions for wedding planning with security and expiration';
COMMENT ON COLUMN collaboration_sessions.session_token IS 'Secure random token for session authentication';
COMMENT ON COLUMN collaboration_sessions.permissions IS 'JSON object defining user permissions in the collaboration session';
COMMENT ON COLUMN collaboration_sessions.device_info IS 'Information about the device/browser for security tracking';
COMMENT ON FUNCTION expire_collaboration_sessions() IS 'Automatically expires sessions past their expiration time';
COMMENT ON FUNCTION cleanup_collaboration_sessions() IS 'Removes old inactive sessions to maintain database performance';
COMMENT ON FUNCTION generate_session_token() IS 'Generates cryptographically secure unique session tokens';
COMMENT ON FUNCTION validate_collaboration_session(text) IS 'Validates session token and returns session context';
COMMENT ON FUNCTION refresh_session_activity(text) IS 'Updates session activity timestamp and extends expiration';

-- Insert initial test data for development (remove in production)
DO $$
BEGIN
    -- Only insert test data if we're not in production
    IF current_setting('app.environment', true) != 'production' THEN
        -- Test session data will be inserted by application logic
        NULL;
    END IF;
END
$$;