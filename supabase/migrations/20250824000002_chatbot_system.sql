-- WS-126: AI-Powered Support Chatbot System Database Schema
-- Creates tables for chatbot contexts, analytics, and escalations

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Chatbot conversation contexts table
CREATE TABLE IF NOT EXISTS chatbot_contexts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    conversation_turn INTEGER DEFAULT 0,
    last_intent TEXT,
    last_confidence DECIMAL(3,2),
    context_data JSONB DEFAULT '{}',
    escalated BOOLEAN DEFAULT FALSE,
    escalated_at TIMESTAMPTZ,
    escalation_reason TEXT,
    assigned_agent_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ
);

-- Chatbot analytics table for tracking interactions
CREATE TABLE IF NOT EXISTS chatbot_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_message TEXT NOT NULL,
    detected_intent TEXT NOT NULL,
    intent_confidence DECIMAL(3,2) NOT NULL,
    response_type TEXT NOT NULL,
    knowledge_sources TEXT[] DEFAULT '{}',
    response_time_ms INTEGER,
    escalated BOOLEAN DEFAULT FALSE,
    user_satisfaction INTEGER CHECK (user_satisfaction BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Foreign key to context
    CONSTRAINT fk_chatbot_context 
        FOREIGN KEY (session_id) 
        REFERENCES chatbot_contexts(session_id) 
        ON DELETE CASCADE
);

-- Chatbot escalations table
CREATE TABLE IF NOT EXISTS chatbot_escalations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    conversation_context JSONB DEFAULT '{}',
    conversation_history JSONB DEFAULT '[]',
    assigned_agent_id UUID,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'resolved', 'cancelled')),
    estimated_wait_time INTEGER, -- in seconds
    chat_room_id UUID,
    requested_at TIMESTAMPTZ NOT NULL,
    assigned_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),
    metadata JSONB DEFAULT '{}',
    
    -- Foreign key to context
    CONSTRAINT fk_chatbot_escalation_context 
        FOREIGN KEY (session_id) 
        REFERENCES chatbot_contexts(session_id) 
        ON DELETE CASCADE
);

-- Support agents table (for escalations)
CREATE TABLE IF NOT EXISTS support_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    specialties TEXT[] DEFAULT '{}',
    availability_status TEXT NOT NULL DEFAULT 'offline' CHECK (availability_status IN ('available', 'busy', 'offline')),
    current_chats INTEGER DEFAULT 0,
    max_concurrent_chats INTEGER DEFAULT 5,
    average_response_time INTEGER DEFAULT 300, -- seconds
    satisfaction_rating DECIMAL(3,2) DEFAULT 5.0,
    total_escalations_handled INTEGER DEFAULT 0,
    languages_supported TEXT[] DEFAULT '{"en"}',
    timezone TEXT DEFAULT 'UTC',
    work_schedule JSONB DEFAULT '{}', -- Working hours per day
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent notifications table
CREATE TABLE IF NOT EXISTS agent_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES support_agents(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    escalation_id UUID REFERENCES chatbot_escalations(id) ON DELETE CASCADE,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    action_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- FAQ search function for chatbot knowledge retrieval (public version)
CREATE OR REPLACE FUNCTION search_faqs_public(
    p_query TEXT,
    p_category_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
    id UUID,
    question TEXT,
    answer TEXT,
    category_name TEXT,
    tags TEXT[],
    relevance_score NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fi.id,
        fi.question,
        fi.answer,
        fc.name as category_name,
        fi.tags,
        (
            CASE 
                WHEN fi.question ILIKE '%' || p_query || '%' THEN 1.0
                WHEN fi.answer ILIKE '%' || p_query || '%' THEN 0.8
                WHEN array_to_string(fi.tags, ' ') ILIKE '%' || p_query || '%' THEN 0.6
                ELSE 0.5
            END
        )::NUMERIC as relevance_score
    FROM faq_items fi
    LEFT JOIN faq_categories fc ON fi.category_id = fc.id
    WHERE 
        fi.is_published = TRUE
        AND (p_category_id IS NULL OR fi.category_id = p_category_id)
        AND (
            fi.question ILIKE '%' || p_query || '%'
            OR fi.answer ILIKE '%' || p_query || '%'
            OR array_to_string(fi.tags, ' ') ILIKE '%' || p_query || '%'
        )
    ORDER BY relevance_score DESC
    LIMIT p_limit;
END;
$$;

-- Function to update chatbot context timestamp
CREATE OR REPLACE FUNCTION update_chatbot_context_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update support agent timestamp
CREATE OR REPLACE FUNCTION update_support_agent_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updating timestamps
CREATE TRIGGER chatbot_contexts_update_timestamp
    BEFORE UPDATE ON chatbot_contexts
    FOR EACH ROW
    EXECUTE FUNCTION update_chatbot_context_timestamp();

CREATE TRIGGER support_agents_update_timestamp
    BEFORE UPDATE ON support_agents
    FOR EACH ROW
    EXECUTE FUNCTION update_support_agent_timestamp();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chatbot_contexts_session_id ON chatbot_contexts(session_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_contexts_user_id ON chatbot_contexts(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_contexts_escalated ON chatbot_contexts(escalated);
CREATE INDEX IF NOT EXISTS idx_chatbot_contexts_created_at ON chatbot_contexts(created_at);

CREATE INDEX IF NOT EXISTS idx_chatbot_analytics_session_id ON chatbot_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_analytics_user_id ON chatbot_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_analytics_intent ON chatbot_analytics(detected_intent);
CREATE INDEX IF NOT EXISTS idx_chatbot_analytics_created_at ON chatbot_analytics(created_at);

CREATE INDEX IF NOT EXISTS idx_chatbot_escalations_session_id ON chatbot_escalations(session_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_escalations_user_id ON chatbot_escalations(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_escalations_status ON chatbot_escalations(status);
CREATE INDEX IF NOT EXISTS idx_chatbot_escalations_assigned_agent ON chatbot_escalations(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_escalations_priority ON chatbot_escalations(priority);
CREATE INDEX IF NOT EXISTS idx_chatbot_escalations_requested_at ON chatbot_escalations(requested_at);

CREATE INDEX IF NOT EXISTS idx_support_agents_user_id ON support_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_support_agents_status ON support_agents(availability_status);
CREATE INDEX IF NOT EXISTS idx_support_agents_specialties ON support_agents USING GIN(specialties);
CREATE INDEX IF NOT EXISTS idx_support_agents_active ON support_agents(is_active);

CREATE INDEX IF NOT EXISTS idx_agent_notifications_agent_id ON agent_notifications(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_notifications_escalation_id ON agent_notifications(escalation_id);
CREATE INDEX IF NOT EXISTS idx_agent_notifications_is_read ON agent_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_agent_notifications_created_at ON agent_notifications(created_at);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE chatbot_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_notifications ENABLE ROW LEVEL SECURITY;

-- Chatbot contexts policies
CREATE POLICY "Users can access their own chatbot contexts" 
    ON chatbot_contexts FOR ALL 
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Service role can access all chatbot contexts" 
    ON chatbot_contexts FOR ALL 
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Chatbot analytics policies
CREATE POLICY "Users can access their own chatbot analytics" 
    ON chatbot_analytics FOR ALL 
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Service role can access all chatbot analytics" 
    ON chatbot_analytics FOR ALL 
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Chatbot escalations policies
CREATE POLICY "Users can access their own escalations" 
    ON chatbot_escalations FOR ALL 
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Support agents can access assigned escalations" 
    ON chatbot_escalations FOR SELECT 
    USING (
        assigned_agent_id IN (
            SELECT id FROM support_agents 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can access all escalations" 
    ON chatbot_escalations FOR ALL 
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Support agents policies
CREATE POLICY "Agents can access their own profile" 
    ON support_agents FOR ALL 
    USING (auth.uid() = user_id);

CREATE POLICY "Public read access to active agents" 
    ON support_agents FOR SELECT 
    USING (is_active = true);

CREATE POLICY "Service role can access all agents" 
    ON support_agents FOR ALL 
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Agent notifications policies
CREATE POLICY "Agents can access their own notifications" 
    ON agent_notifications FOR ALL 
    USING (
        agent_id IN (
            SELECT id FROM support_agents 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can access all notifications" 
    ON agent_notifications FOR ALL 
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Grant permissions
GRANT ALL ON chatbot_contexts TO authenticated, service_role;
GRANT ALL ON chatbot_analytics TO authenticated, service_role;
GRANT ALL ON chatbot_escalations TO authenticated, service_role;
GRANT ALL ON support_agents TO authenticated, service_role;
GRANT ALL ON agent_notifications TO authenticated, service_role;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION search_faqs_public TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION update_chatbot_context_timestamp TO service_role;
GRANT EXECUTE ON FUNCTION update_support_agent_timestamp TO service_role;

-- Insert some sample support agents for testing
INSERT INTO support_agents (user_id, name, email, specialties, availability_status, max_concurrent_chats)
VALUES 
    (
        -- This would need to be a real user ID in production
        uuid_generate_v4(),
        'AI Assistant',
        'ai@wedsync.com',
        ARRAY['general', 'wedding_planning', 'technical'],
        'available',
        10
    );

-- Comments for documentation
COMMENT ON TABLE chatbot_contexts IS 'Stores conversation context for chatbot sessions';
COMMENT ON TABLE chatbot_analytics IS 'Tracks all chatbot interactions for analysis and training';
COMMENT ON TABLE chatbot_escalations IS 'Manages escalations from chatbot to human support';
COMMENT ON TABLE support_agents IS 'Support agent profiles and availability';
COMMENT ON TABLE agent_notifications IS 'Notifications for support agents about new escalations';

COMMENT ON FUNCTION search_faqs_public IS 'Public function to search FAQ database for chatbot knowledge retrieval';
COMMENT ON FUNCTION update_chatbot_context_timestamp IS 'Automatically updates the updated_at timestamp for chatbot contexts';
COMMENT ON FUNCTION update_support_agent_timestamp IS 'Automatically updates the updated_at timestamp for support agents';