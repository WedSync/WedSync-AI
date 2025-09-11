-- WS-342: Real-Time Wedding Collaboration - WebSocket Connections Table
-- Team B Backend Development - Batch 1 Round 1
-- Description: Create websocket connections table for managing real-time WebSocket connections

-- Create websocket_connections table
CREATE TABLE websocket_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    connection_id TEXT UNIQUE NOT NULL,
    session_token TEXT REFERENCES collaboration_sessions(session_token) ON DELETE CASCADE,
    server_instance TEXT NOT NULL,
    server_region TEXT DEFAULT 'us-east-1',
    connection_type TEXT DEFAULT 'websocket' CHECK (connection_type IN ('websocket', 'sse', 'polling')),
    client_info JSONB DEFAULT '{}',
    connection_quality JSONB DEFAULT '{}',
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_ping TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_pong TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    disconnect_reason TEXT,
    disconnected_at TIMESTAMP WITH TIME ZONE,
    reconnect_count INTEGER DEFAULT 0,
    total_messages_sent INTEGER DEFAULT 0,
    total_messages_received INTEGER DEFAULT 0,
    
    -- Performance indexes
    INDEX idx_websocket_active (is_active, last_ping DESC),
    INDEX idx_websocket_server (server_instance, is_active, connected_at DESC),
    INDEX idx_websocket_user (user_id, is_active, connected_at DESC),
    INDEX idx_websocket_wedding (wedding_id, is_active, connected_at DESC),
    INDEX idx_websocket_cleanup (is_active, last_ping) WHERE is_active = false,
    INDEX idx_websocket_health (last_ping, last_pong) WHERE is_active = true
);

-- Add row level security
ALTER TABLE websocket_connections ENABLE ROW LEVEL SECURITY;

-- Create policies for websocket connections
CREATE POLICY "Users can view their own websocket connections" ON websocket_connections
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can manage all websocket connections" ON websocket_connections
    FOR ALL USING (true); -- This will be restricted by application logic

-- Create function to register websocket connection
CREATE OR REPLACE FUNCTION register_websocket_connection(
    p_user_id UUID,
    p_wedding_id UUID,
    p_connection_id TEXT,
    p_session_token TEXT,
    p_server_instance TEXT,
    p_server_region TEXT DEFAULT 'us-east-1',
    p_client_info JSONB DEFAULT '{}'
)
RETURNS websocket_connections AS $$
DECLARE
    result websocket_connections;
BEGIN
    -- Deactivate any existing connections for this user/wedding
    UPDATE websocket_connections 
    SET 
        is_active = false,
        disconnect_reason = 'new_connection_established',
        disconnected_at = NOW()
    WHERE user_id = p_user_id 
      AND wedding_id = p_wedding_id 
      AND is_active = true;
    
    -- Create new connection record
    INSERT INTO websocket_connections (
        user_id,
        wedding_id,
        connection_id,
        session_token,
        server_instance,
        server_region,
        client_info,
        connected_at,
        last_ping
    )
    VALUES (
        p_user_id,
        p_wedding_id,
        p_connection_id,
        p_session_token,
        p_server_instance,
        p_server_region,
        p_client_info,
        NOW(),
        NOW()
    )
    RETURNING * INTO result;
    
    -- Update user presence to online
    PERFORM upsert_user_presence(
        p_user_id,
        p_wedding_id,
        'online',
        NULL,
        'vendor', -- Default role
        p_client_info
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update connection ping
CREATE OR REPLACE FUNCTION update_connection_ping(
    p_connection_id TEXT,
    p_message_count INTEGER DEFAULT 0
)
RETURNS boolean AS $$
BEGIN
    UPDATE websocket_connections 
    SET 
        last_ping = NOW(),
        total_messages_received = total_messages_received + p_message_count
    WHERE connection_id = p_connection_id 
      AND is_active = true;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Create function to update connection pong
CREATE OR REPLACE FUNCTION update_connection_pong(
    p_connection_id TEXT
)
RETURNS boolean AS $$
DECLARE
    connection_record websocket_connections;
    latency_ms INTEGER;
BEGIN
    -- Get connection and calculate latency
    SELECT * INTO connection_record 
    FROM websocket_connections 
    WHERE connection_id = p_connection_id 
      AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    latency_ms := EXTRACT(EPOCH FROM (NOW() - connection_record.last_ping)) * 1000;
    
    UPDATE websocket_connections 
    SET 
        last_pong = NOW(),
        connection_quality = connection_quality || jsonb_build_object(
            'last_latency_ms', latency_ms,
            'updated_at', NOW()
        )
    WHERE connection_id = p_connection_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Create function to disconnect websocket connection
CREATE OR REPLACE FUNCTION disconnect_websocket_connection(
    p_connection_id TEXT,
    p_disconnect_reason TEXT DEFAULT 'client_disconnect'
)
RETURNS boolean AS $$
DECLARE
    connection_record websocket_connections;
BEGIN
    -- Get connection record
    SELECT * INTO connection_record 
    FROM websocket_connections 
    WHERE connection_id = p_connection_id 
      AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Update connection as disconnected
    UPDATE websocket_connections 
    SET 
        is_active = false,
        disconnect_reason = p_disconnect_reason,
        disconnected_at = NOW()
    WHERE connection_id = p_connection_id;
    
    -- Update user presence to offline if no other active connections
    IF NOT EXISTS (
        SELECT 1 FROM websocket_connections 
        WHERE user_id = connection_record.user_id 
          AND wedding_id = connection_record.wedding_id 
          AND is_active = true
          AND connection_id != p_connection_id
    ) THEN
        UPDATE user_presence 
        SET 
            status = 'offline',
            is_typing = false,
            updated_at = NOW()
        WHERE user_id = connection_record.user_id 
          AND wedding_id = connection_record.wedding_id;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get active connections for a wedding
CREATE OR REPLACE FUNCTION get_active_wedding_connections(
    p_wedding_id UUID
)
RETURNS TABLE (
    connection_id TEXT,
    user_id UUID,
    server_instance TEXT,
    connected_at TIMESTAMP WITH TIME ZONE,
    last_ping TIMESTAMP WITH TIME ZONE,
    connection_quality JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wc.connection_id,
        wc.user_id,
        wc.server_instance,
        wc.connected_at,
        wc.last_ping,
        wc.connection_quality
    FROM websocket_connections wc
    WHERE wc.wedding_id = p_wedding_id
      AND wc.is_active = true
      AND wc.last_ping > NOW() - INTERVAL '30 seconds'
    ORDER BY wc.connected_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to cleanup stale connections
CREATE OR REPLACE FUNCTION cleanup_stale_websocket_connections()
RETURNS INTEGER AS $$
DECLARE
    cleaned_count INTEGER := 0;
BEGIN
    -- Mark stale connections as inactive
    UPDATE websocket_connections 
    SET 
        is_active = false,
        disconnect_reason = 'connection_timeout',
        disconnected_at = NOW()
    WHERE is_active = true 
      AND last_ping < NOW() - INTERVAL '2 minutes';
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    
    -- Update user presence for users with no active connections
    UPDATE user_presence 
    SET 
        status = 'offline',
        is_typing = false,
        updated_at = NOW()
    WHERE (user_id, wedding_id) NOT IN (
        SELECT wc.user_id, wc.wedding_id 
        FROM websocket_connections wc 
        WHERE wc.is_active = true
    ) AND status != 'offline';
    
    -- Delete old inactive connections (older than 24 hours)
    DELETE FROM websocket_connections
    WHERE is_active = false 
      AND disconnected_at < NOW() - INTERVAL '24 hours';
    
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get connection statistics
CREATE OR REPLACE FUNCTION get_websocket_connection_stats()
RETURNS TABLE (
    server_instance TEXT,
    active_connections BIGINT,
    total_messages_sent BIGINT,
    total_messages_received BIGINT,
    avg_connection_duration INTERVAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wc.server_instance,
        COUNT(*) FILTER (WHERE wc.is_active) as active_connections,
        SUM(wc.total_messages_sent) as total_messages_sent,
        SUM(wc.total_messages_received) as total_messages_received,
        AVG(COALESCE(wc.disconnected_at, NOW()) - wc.connected_at) as avg_connection_duration
    FROM websocket_connections wc
    WHERE wc.connected_at > NOW() - INTERVAL '24 hours'
    GROUP BY wc.server_instance
    ORDER BY active_connections DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to get server load balance information
CREATE OR REPLACE FUNCTION get_server_load_balance()
RETURNS TABLE (
    server_instance TEXT,
    server_region TEXT,
    active_connections BIGINT,
    connection_types JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wc.server_instance,
        wc.server_region,
        COUNT(*) as active_connections,
        jsonb_object_agg(wc.connection_type, COUNT(*)) as connection_types
    FROM websocket_connections wc
    WHERE wc.is_active = true
    GROUP BY wc.server_instance, wc.server_region
    ORDER BY active_connections DESC;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE websocket_connections IS 'Manages real-time WebSocket connections for wedding collaboration';
COMMENT ON COLUMN websocket_connections.connection_id IS 'Unique identifier for the WebSocket connection';
COMMENT ON COLUMN websocket_connections.server_instance IS 'Server instance handling the connection';
COMMENT ON COLUMN websocket_connections.connection_quality IS 'JSON object tracking connection quality metrics';
COMMENT ON COLUMN websocket_connections.reconnect_count IS 'Number of times this connection has been reestablished';
COMMENT ON FUNCTION register_websocket_connection IS 'Registers a new WebSocket connection';
COMMENT ON FUNCTION disconnect_websocket_connection IS 'Properly disconnects a WebSocket connection';
COMMENT ON FUNCTION cleanup_stale_websocket_connections IS 'Cleans up stale and inactive connections';
COMMENT ON FUNCTION get_active_wedding_connections IS 'Returns active connections for a specific wedding';