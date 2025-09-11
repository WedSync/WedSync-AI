-- WS-342: Real-Time Wedding Collaboration - Collaboration Sessions Table
-- Team B Backend Development - Batch 1 Round 1
-- Description: Create collaboration sessions table for managing real-time collaboration sessions

-- Create collaboration_sessions table
CREATE TABLE collaboration_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    permissions JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '24 hours',
    
    -- Performance indexes
    INDEX idx_collaboration_sessions_wedding (wedding_id, is_active, last_activity),
    INDEX idx_collaboration_sessions_user (user_id, is_active, last_activity),
    INDEX idx_collaboration_sessions_token (session_token),
    INDEX idx_collaboration_sessions_active (is_active, last_activity)
);

-- Add row level security
ALTER TABLE collaboration_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for collaboration sessions
CREATE POLICY "Users can view their own collaboration sessions" ON collaboration_sessions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own collaboration sessions" ON collaboration_sessions
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own collaboration sessions" ON collaboration_sessions
    FOR UPDATE USING (user_id = auth.uid());

-- Create function to automatically update last_activity
CREATE OR REPLACE FUNCTION update_collaboration_session_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic activity updates
CREATE TRIGGER trigger_update_collaboration_session_activity
    BEFORE UPDATE ON collaboration_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_collaboration_session_activity();

-- Create function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_collaboration_sessions()
RETURNS void AS $$
BEGIN
    UPDATE collaboration_sessions 
    SET is_active = false 
    WHERE expires_at < NOW() AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Create index for cleanup function performance
CREATE INDEX idx_collaboration_sessions_cleanup ON collaboration_sessions (expires_at, is_active);

-- Add comments for documentation
COMMENT ON TABLE collaboration_sessions IS 'Manages real-time collaboration sessions for wedding planning';
COMMENT ON COLUMN collaboration_sessions.wedding_id IS 'Reference to the wedding being collaborated on';
COMMENT ON COLUMN collaboration_sessions.user_id IS 'Reference to the user in the collaboration session';
COMMENT ON COLUMN collaboration_sessions.session_token IS 'Unique token for WebSocket authentication';
COMMENT ON COLUMN collaboration_sessions.permissions IS 'JSON object defining collaboration permissions';
COMMENT ON COLUMN collaboration_sessions.expires_at IS 'Session expiration timestamp';