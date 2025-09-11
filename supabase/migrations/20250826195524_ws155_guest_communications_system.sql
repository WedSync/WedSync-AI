-- WS-155: Guest Communications Database Schema & Message Storage
-- Team E - Round 1: Database foundation for guest communications with efficient querying
-- Feature ID: WS-155 - Guest Communications System
-- Date: 2025-08-26

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS public.delivery_status CASCADE;
DROP TABLE IF EXISTS public.communication_recipients CASCADE;
DROP TABLE IF EXISTS public.communication_preferences CASCADE;
DROP TABLE IF EXISTS public.message_templates CASCADE;
DROP TABLE IF EXISTS public.guest_communications CASCADE;

-- **TABLE 3: message_templates - Reusable message templates**
-- Support for wedding-specific templates with personalization
CREATE TABLE public.message_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Template identification
    template_name VARCHAR(255) NOT NULL,
    template_category VARCHAR(100) NOT NULL, -- 'invitation', 'reminder', 'thank_you', 'update'
    template_type VARCHAR(50) NOT NULL DEFAULT 'email' CHECK (
        template_type IN ('email', 'sms', 'in_app', 'push', 'multi_channel')
    ),
    
    -- Content and structure
    subject_template VARCHAR(500),
    content_template TEXT NOT NULL,
    html_template TEXT,
    
    -- Personalization variables
    available_variables JSONB DEFAULT '[]', -- List of variables like ['guest_name', 'wedding_date']
    required_variables JSONB DEFAULT '[]', -- Required variables for template to work
    
    -- Wedding-specific context
    wedding_phase VARCHAR(100), -- 'save_the_date', 'invitation', 'pre_wedding', 'post_wedding'
    guest_type_compatibility JSONB DEFAULT '["all"]', -- Which guest types this template works for
    
    -- Usage and performance
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    performance_metrics JSONB DEFAULT '{}', -- Open rates, click rates, etc.
    
    -- Template status and validation
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_system_template BOOLEAN NOT NULL DEFAULT FALSE, -- System vs user created
    validation_rules JSONB DEFAULT '{}',
    
    -- Metadata and audit
    metadata JSONB DEFAULT '{}',
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- **TABLE 1: guest_communications - Message metadata and content storage**
-- Handles bulk messaging with rich content and personalization
CREATE TABLE public.guest_communications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    
    -- Message identification and content
    message_title VARCHAR(500) NOT NULL,
    message_content TEXT NOT NULL,
    message_type VARCHAR(50) NOT NULL DEFAULT 'bulk' CHECK (
        message_type IN ('bulk', 'targeted', 'individual', 'reminder', 'announcement')
    ),
    
    -- Communication channels
    channels JSONB NOT NULL DEFAULT '["email"]' CHECK (
        jsonb_array_length(channels) > 0
    ), -- ['email', 'sms', 'in_app', 'push']
    
    -- Personalization and template support
    template_id UUID REFERENCES public.message_templates(id) ON DELETE SET NULL,
    personalization_data JSONB DEFAULT '{}', -- Variables for message customization
    rich_content JSONB DEFAULT '{}', -- Images, links, formatting
    
    -- Scheduling and timing
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (
        status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled', 'failed')
    ),
    
    -- Tracking and analytics
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    
    -- Segmentation and targeting
    target_criteria JSONB DEFAULT '{}', -- Guest segmentation rules
    exclusion_criteria JSONB DEFAULT '{}', -- Who to exclude
    
    -- Performance and archiving
    priority INTEGER NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    archive_after INTERVAL DEFAULT '6 months',
    
    -- Metadata and audit
    metadata JSONB DEFAULT '{}',
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- **TABLE 2: communication_recipients - Individual recipient tracking**
-- Optimized for bulk insert operations and fast recipient queries
CREATE TABLE public.communication_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    communication_id UUID NOT NULL REFERENCES public.guest_communications(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Recipient identification
    guest_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_phone VARCHAR(50),
    recipient_name VARCHAR(255) NOT NULL,
    
    -- Recipient grouping and segmentation
    guest_group VARCHAR(100), -- 'bride_family', 'groom_family', 'friends', 'vendors'
    guest_category VARCHAR(100), -- 'vip', 'plus_one', 'child', 'vendor'
    relationship_to_couple VARCHAR(100),
    
    -- Delivery tracking per channel
    email_status VARCHAR(50) DEFAULT 'pending' CHECK (
        email_status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'opted_out')
    ),
    sms_status VARCHAR(50) DEFAULT 'pending' CHECK (
        sms_status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'failed', 'opted_out')
    ),
    push_status VARCHAR(50) DEFAULT 'pending' CHECK (
        push_status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'failed', 'opted_out')
    ),
    in_app_status VARCHAR(50) DEFAULT 'pending' CHECK (
        in_app_status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'failed', 'opted_out')
    ),
    
    -- Engagement tracking
    first_opened_at TIMESTAMPTZ,
    last_opened_at TIMESTAMPTZ,
    click_count INTEGER DEFAULT 0,
    engagement_score INTEGER DEFAULT 0, -- 0-100 based on interaction
    
    -- Personalization data for this recipient
    personalized_content JSONB DEFAULT '{}',
    
    -- Metadata and timestamps
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- **TABLE 4: delivery_status - Detailed delivery tracking per recipient**
-- Comprehensive tracking for each delivery attempt across all channels
CREATE TABLE public.delivery_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    communication_id UUID NOT NULL REFERENCES public.guest_communications(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.communication_recipients(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Delivery attempt details
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'in_app')),
    attempt_number INTEGER NOT NULL DEFAULT 1,
    
    -- Provider information
    provider VARCHAR(100), -- 'resend', 'twilio', 'firebase', etc.
    provider_message_id VARCHAR(255),
    provider_response JSONB DEFAULT '{}',
    
    -- Status and timing
    status VARCHAR(50) NOT NULL CHECK (
        status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'rejected', 'opted_out')
    ),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    
    -- Error handling
    error_code VARCHAR(100),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    next_retry_at TIMESTAMPTZ,
    
    -- Engagement details
    user_agent TEXT,
    ip_address INET,
    clicked_links JSONB DEFAULT '[]', -- Array of clicked link IDs
    interaction_data JSONB DEFAULT '{}',
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- **TABLE 5: communication_preferences - Guest opt-out preferences**
-- Comprehensive preference management for guest communication consent
CREATE TABLE public.communication_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    guest_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    
    -- Guest identification (for cases where guest_id is null)
    guest_email VARCHAR(255) NOT NULL,
    guest_phone VARCHAR(50),
    
    -- Channel preferences
    email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sms_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Message type preferences  
    invitations_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updates_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    marketing_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Frequency preferences
    max_messages_per_day INTEGER DEFAULT 10,
    max_messages_per_week INTEGER DEFAULT 50,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    quiet_days JSONB DEFAULT '[]', -- Array of days ['saturday', 'sunday']
    
    -- Opt-out tracking
    global_opt_out BOOLEAN NOT NULL DEFAULT FALSE,
    opt_out_date TIMESTAMPTZ,
    opt_out_reason VARCHAR(500),
    opt_out_ip INET,
    
    -- Legal compliance
    consent_given_at TIMESTAMPTZ DEFAULT NOW(),
    consent_ip INET,
    consent_source VARCHAR(100), -- 'website', 'email', 'phone', 'in_person'
    gdpr_compliant BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Metadata and audit
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- **PERFORMANCE OPTIMIZATION: Message Query Indexes**
-- Optimized for history and status queries
CREATE INDEX idx_guest_comms_org_status ON public.guest_communications(organization_id, status);
CREATE INDEX idx_guest_comms_client_created ON public.guest_communications(client_id, created_at DESC);
CREATE INDEX idx_guest_comms_scheduled ON public.guest_communications(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX idx_guest_comms_sent_analytics ON public.guest_communications(sent_at DESC, status) WHERE sent_at IS NOT NULL;
CREATE INDEX idx_guest_comms_archive ON public.guest_communications(is_archived, created_at) WHERE is_archived = FALSE;
CREATE INDEX idx_guest_comms_type_priority ON public.guest_communications(message_type, priority);

-- **BULK INSERT OPERATIONS: Efficient bulk recipient storage**
CREATE INDEX idx_comm_recipients_communication ON public.communication_recipients(communication_id);
CREATE INDEX idx_comm_recipients_guest_email ON public.communication_recipients(guest_id, recipient_email);
CREATE INDEX idx_comm_recipients_bulk_insert ON public.communication_recipients(organization_id, created_at DESC);
CREATE INDEX idx_comm_recipients_group_category ON public.communication_recipients(guest_group, guest_category);
CREATE INDEX idx_comm_recipients_engagement ON public.communication_recipients(engagement_score DESC, last_opened_at);

-- **STATUS UPDATE INDEXES: Fast delivery status updates**
CREATE INDEX idx_delivery_status_comm_channel ON public.delivery_status(communication_id, channel);
CREATE INDEX idx_delivery_status_recipient_status ON public.delivery_status(recipient_id, status);
CREATE INDEX idx_delivery_status_provider ON public.delivery_status(provider, provider_message_id);
CREATE INDEX idx_delivery_status_retry ON public.delivery_status(next_retry_at) WHERE next_retry_at IS NOT NULL;
CREATE INDEX idx_delivery_status_failed ON public.delivery_status(status, failed_at) WHERE status = 'failed';

-- **GUEST SEGMENTATION INDEXES: Quick filtering for bulk messages**  
CREATE INDEX idx_comm_recipients_guest_group ON public.communication_recipients(guest_group);
CREATE INDEX idx_comm_recipients_guest_category ON public.communication_recipients(guest_category);
CREATE INDEX idx_comm_recipients_relationship ON public.communication_recipients(relationship_to_couple);
CREATE INDEX idx_comm_recipients_email_status ON public.communication_recipients(email_status, recipient_email);
CREATE INDEX idx_comm_recipients_multi_channel ON public.communication_recipients
    (communication_id, email_status, sms_status);

-- **MESSAGE TEMPLATES INDEXES: Template management and performance**
CREATE INDEX idx_templates_org_category ON public.message_templates(organization_id, template_category);
CREATE INDEX idx_templates_type_active ON public.message_templates(template_type, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_templates_wedding_phase ON public.message_templates(wedding_phase, template_category);
CREATE INDEX idx_templates_usage ON public.message_templates(usage_count DESC, last_used_at DESC);

-- **COMMUNICATION PREFERENCES INDEXES: Fast preference lookups**
CREATE INDEX idx_comm_prefs_guest_email ON public.communication_preferences(guest_id, guest_email);
CREATE INDEX idx_comm_prefs_opt_out ON public.communication_preferences(global_opt_out) WHERE global_opt_out = TRUE;
CREATE INDEX idx_comm_prefs_channels ON public.communication_preferences(email_enabled, sms_enabled, push_enabled);
CREATE INDEX idx_comm_prefs_consent ON public.communication_preferences(consent_given_at, gdpr_compliant);

-- **ARCHIVE STRATEGY: Manage large message history efficiently**
-- Partial indexes for active vs archived data
CREATE INDEX idx_guest_comms_active_recent ON public.guest_communications(created_at DESC, updated_at DESC) 
    WHERE is_archived = FALSE;

CREATE INDEX idx_delivery_status_recent ON public.delivery_status(created_at DESC, status);

-- Composite index for archive queries
CREATE INDEX idx_guest_comms_archive_eligible ON public.guest_communications(created_at, is_archived) 
    WHERE is_archived = FALSE;

-- **UPDATE TRIGGERS: Automatic updated_at and stats maintenance**

-- Update triggers for updated_at columns
CREATE TRIGGER update_guest_comms_updated_at BEFORE UPDATE ON public.guest_communications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comm_recipients_updated_at BEFORE UPDATE ON public.communication_recipients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON public.message_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_status_updated_at BEFORE UPDATE ON public.delivery_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comm_prefs_updated_at BEFORE UPDATE ON public.communication_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- **FUNCTION: Update communication statistics**
-- Automatically update recipient counts and engagement metrics
CREATE OR REPLACE FUNCTION update_communication_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update guest_communications statistics when recipients change
    UPDATE public.guest_communications
    SET 
        total_recipients = (
            SELECT COUNT(*) 
            FROM public.communication_recipients 
            WHERE communication_id = COALESCE(NEW.communication_id, OLD.communication_id)
        ),
        sent_count = (
            SELECT COUNT(*) 
            FROM public.communication_recipients 
            WHERE communication_id = COALESCE(NEW.communication_id, OLD.communication_id)
            AND email_status IN ('sent', 'delivered', 'opened', 'clicked')
        ),
        delivered_count = (
            SELECT COUNT(*) 
            FROM public.communication_recipients 
            WHERE communication_id = COALESCE(NEW.communication_id, OLD.communication_id)
            AND email_status IN ('delivered', 'opened', 'clicked')
        ),
        opened_count = (
            SELECT COUNT(*) 
            FROM public.communication_recipients 
            WHERE communication_id = COALESCE(NEW.communication_id, OLD.communication_id)
            AND email_status IN ('opened', 'clicked')
        ),
        clicked_count = (
            SELECT COUNT(*) 
            FROM public.communication_recipients 
            WHERE communication_id = COALESCE(NEW.communication_id, OLD.communication_id)
            AND email_status = 'clicked'
        ),
        failed_count = (
            SELECT COUNT(*) 
            FROM public.communication_recipients 
            WHERE communication_id = COALESCE(NEW.communication_id, OLD.communication_id)
            AND email_status IN ('bounced', 'failed')
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.communication_id, OLD.communication_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update stats when recipient status changes
CREATE TRIGGER update_communication_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.communication_recipients
    FOR EACH ROW EXECUTE FUNCTION update_communication_stats();

-- **FUNCTION: Update template usage stats**
CREATE OR REPLACE FUNCTION update_template_usage()
RETURNS TRIGGER AS $$
BEGIN
    -- Update template usage count when template is used
    IF NEW.template_id IS NOT NULL THEN
        UPDATE public.message_templates
        SET 
            usage_count = usage_count + 1,
            last_used_at = NOW()
        WHERE id = NEW.template_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to track template usage
CREATE TRIGGER update_template_usage_trigger
    AFTER INSERT ON public.guest_communications
    FOR EACH ROW EXECUTE FUNCTION update_template_usage();

-- **UNIQUE CONSTRAINTS**
-- Ensure data integrity for critical relationships
ALTER TABLE public.communication_recipients 
ADD CONSTRAINT unique_comm_recipient 
UNIQUE(communication_id, guest_id, recipient_email);

ALTER TABLE public.communication_preferences 
ADD CONSTRAINT unique_guest_preferences 
UNIQUE(organization_id, guest_email);

ALTER TABLE public.message_templates
ADD CONSTRAINT unique_template_name
UNIQUE(organization_id, template_name);

-- **ROW LEVEL SECURITY SETUP**
-- Enable RLS for all tables
ALTER TABLE public.guest_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_preferences ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies for organization isolation
CREATE POLICY "guest_comms_org_isolation" ON public.guest_communications
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM public.user_profiles WHERE user_id = auth.uid()
    ));

CREATE POLICY "comm_recipients_org_isolation" ON public.communication_recipients
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM public.user_profiles WHERE user_id = auth.uid()
    ));

CREATE POLICY "templates_org_isolation" ON public.message_templates
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM public.user_profiles WHERE user_id = auth.uid()
    ));

CREATE POLICY "delivery_status_org_isolation" ON public.delivery_status
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM public.user_profiles WHERE user_id = auth.uid()
    ));

CREATE POLICY "comm_prefs_org_isolation" ON public.communication_preferences
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM public.user_profiles WHERE user_id = auth.uid()
    ));

-- **PERMISSIONS**
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- **COMMENTS FOR DOCUMENTATION**
COMMENT ON TABLE public.guest_communications IS 'WS-155: Core guest communication messages with bulk messaging support and analytics';
COMMENT ON TABLE public.communication_recipients IS 'WS-155: Individual recipient tracking for bulk communications with delivery status';
COMMENT ON TABLE public.message_templates IS 'WS-155: Reusable message templates for wedding communications with personalization';
COMMENT ON TABLE public.delivery_status IS 'WS-155: Detailed delivery tracking per recipient across all communication channels';
COMMENT ON TABLE public.communication_preferences IS 'WS-155: Guest communication preferences and opt-out management with GDPR compliance';

COMMENT ON COLUMN public.guest_communications.target_criteria IS 'JSON criteria for guest segmentation (e.g., {"guest_group": "bride_family", "rsvp_status": "confirmed"})';
COMMENT ON COLUMN public.guest_communications.personalization_data IS 'JSON data for message personalization (e.g., {"wedding_date": "2025-09-15", "venue": "Garden Hall"})';
COMMENT ON COLUMN public.communication_recipients.engagement_score IS 'Calculated engagement score 0-100 based on opens, clicks, and interaction history';
COMMENT ON COLUMN public.delivery_status.retry_count IS 'Number of delivery retry attempts for failed messages';
COMMENT ON COLUMN public.communication_preferences.consent_source IS 'Source of consent: website, email, phone, in_person - for GDPR compliance';