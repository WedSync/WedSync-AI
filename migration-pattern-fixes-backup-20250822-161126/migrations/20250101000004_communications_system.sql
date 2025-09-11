-- Communications System Tables for WedSync/WedMe (Fixed)
-- Real-time messaging, email notifications, and activity feeds

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS public.notification_preferences CASCADE;
DROP TABLE IF EXISTS public.activity_feeds CASCADE;
DROP TABLE IF EXISTS public.email_notifications CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;

-- Conversations table (groups messages between parties)
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    title VARCHAR(255),
    type VARCHAR(50) NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group', 'broadcast')),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    last_message_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Messages table (actual messages in conversations)
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    sender_type VARCHAR(50) NOT NULL CHECK (sender_type IN ('client', 'vendor', 'system')),
    content TEXT NOT NULL,
    message_type VARCHAR(50) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'system')),
    attachments JSONB DEFAULT '[]',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Email notifications table (track sent emails)
CREATE TABLE public.email_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    recipient_email VARCHAR(255) NOT NULL,
    template_type VARCHAR(100) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    content TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced', 'opened', 'clicked')),
    provider VARCHAR(50) DEFAULT 'resend',
    provider_id VARCHAR(255),
    sent_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activity feeds table (track all activities)
CREATE TABLE public.activity_feeds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL,
    actor_type VARCHAR(50) NOT NULL CHECK (actor_type IN ('user', 'contact', 'system')),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    entity_name VARCHAR(255),
    description TEXT,
    importance VARCHAR(50) NOT NULL DEFAULT 'low' CHECK (importance IN ('low', 'medium', 'high', 'critical')),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notification preferences table (user notification settings)
CREATE TABLE public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    contact_id UUID,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('email', 'sms', 'in_app', 'push')),
    event_type VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    frequency VARCHAR(50) DEFAULT 'immediate' CHECK (frequency IN ('immediate', 'hourly', 'daily', 'weekly', 'never')),
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add unique constraint separately (fixing syntax)
ALTER TABLE public.notification_preferences 
ADD CONSTRAINT unique_notification_pref 
UNIQUE(user_id, contact_id, organization_id, channel, event_type);

-- Create indexes for performance
CREATE INDEX idx_conversations_organization ON public.conversations(organization_id);
CREATE INDEX idx_conversations_client ON public.conversations(client_id);
CREATE INDEX idx_conversations_status ON public.conversations(status);
CREATE INDEX idx_conversations_last_message ON public.conversations(last_message_at DESC);

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_id, sender_type);
CREATE INDEX idx_messages_created ON public.messages(created_at DESC);
CREATE INDEX idx_messages_unread ON public.messages(conversation_id, is_read) WHERE is_read = FALSE;

CREATE INDEX idx_email_notifications_organization ON public.email_notifications(organization_id);
CREATE INDEX idx_email_notifications_recipient ON public.email_notifications(recipient_id);
CREATE INDEX idx_email_notifications_status ON public.email_notifications(status);
CREATE INDEX idx_email_notifications_created ON public.email_notifications(created_at DESC);

CREATE INDEX idx_activity_feeds_organization ON public.activity_feeds(organization_id);
CREATE INDEX idx_activity_feeds_actor ON public.activity_feeds(actor_id, actor_type);
CREATE INDEX idx_activity_feeds_entity ON public.activity_feeds(entity_type, entity_id);
CREATE INDEX idx_activity_feeds_unread ON public.activity_feeds(organization_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_activity_feeds_created ON public.activity_feeds(created_at DESC);

CREATE INDEX idx_notification_preferences_user ON public.notification_preferences(user_id);
CREATE INDEX idx_notification_preferences_contact ON public.notification_preferences(contact_id);
CREATE INDEX idx_notification_preferences_org ON public.notification_preferences(organization_id);

-- Create update triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_notifications_updated_at BEFORE UPDATE ON public.email_notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update conversation's last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversation_last_message_trigger
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- Function to create activity feed entry on new message
CREATE OR REPLACE FUNCTION create_message_activity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.activity_feeds (
        organization_id,
        actor_id,
        actor_type,
        action,
        entity_type,
        entity_id,
        description,
        importance
    )
    SELECT 
        c.organization_id,
        NEW.sender_id,
        NEW.sender_type,
        'message_sent',
        'message',
        NEW.id,
        'New message in conversation',
        'medium'
    FROM public.conversations c
    WHERE c.id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER create_message_activity_trigger
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION create_message_activity();

-- Note: RLS and permissions will be handled by Supabase auth system
-- For now, grant basic permissions to postgres user for development
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;