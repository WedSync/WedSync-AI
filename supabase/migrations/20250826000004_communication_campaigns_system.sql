-- Communication Campaigns System for WS-155
-- Tracks bulk messaging campaigns and their delivery status

-- Create communication campaigns table
CREATE TABLE IF NOT EXISTS communication_campaigns (
    id VARCHAR(255) PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL,
    template_type VARCHAR(50) NOT NULL CHECK (template_type IN ('wedding_update', 'venue_change', 'menu_info', 'rsvp_reminder', 'thank_you', 'custom')),
    subject VARCHAR(255),
    message_content TEXT NOT NULL,
    channels TEXT[] NOT NULL DEFAULT '{}',
    total_recipients INTEGER NOT NULL DEFAULT 0,
    queued_count INTEGER NOT NULL DEFAULT 0,
    sent_count INTEGER NOT NULL DEFAULT 0,
    delivered_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    opened_count INTEGER NOT NULL DEFAULT 0,
    clicked_count INTEGER NOT NULL DEFAULT 0,
    priority VARCHAR(10) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'processing', 'completed', 'failed', 'cancelled')),
    scheduled_for TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    test_mode BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create bulk message recipients table for tracking individual message status
CREATE TABLE IF NOT EXISTS bulk_message_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id VARCHAR(255) NOT NULL REFERENCES communication_campaigns(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL,
    recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('client', 'vendor', 'guest')),
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(50),
    recipient_name VARCHAR(255) NOT NULL,
    channels TEXT[] NOT NULL DEFAULT '{}',
    personalization_data JSONB DEFAULT '{}',
    
    -- Email tracking
    email_status VARCHAR(20) CHECK (email_status IN ('pending', 'queued', 'sent', 'delivered', 'failed', 'bounced', 'spam')),
    email_message_id VARCHAR(255),
    email_sent_at TIMESTAMPTZ,
    email_delivered_at TIMESTAMPTZ,
    email_opened_at TIMESTAMPTZ,
    email_clicked_at TIMESTAMPTZ,
    email_error_message TEXT,
    
    -- SMS tracking  
    sms_status VARCHAR(20) CHECK (sms_status IN ('pending', 'queued', 'sent', 'delivered', 'failed', 'undelivered')),
    sms_message_id VARCHAR(255),
    sms_sent_at TIMESTAMPTZ,
    sms_delivered_at TIMESTAMPTZ,
    sms_error_message TEXT,
    sms_cost DECIMAL(10,4),
    sms_segments INTEGER,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create message templates table for reusable templates
CREATE TABLE IF NOT EXISTS communication_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_type VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'custom',
    channels TEXT[] NOT NULL DEFAULT '{}',
    subject VARCHAR(255),
    content TEXT NOT NULL,
    variables TEXT[] DEFAULT '{}', -- Available personalization variables
    is_system_template BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create SMS notifications table (parallel to email_notifications)
CREATE TABLE IF NOT EXISTS sms_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    campaign_id VARCHAR(255) REFERENCES communication_campaigns(id) ON DELETE SET NULL,
    recipient_phone VARCHAR(50) NOT NULL,
    recipient_name VARCHAR(255),
    recipient_id UUID,
    recipient_type VARCHAR(20) NOT NULL DEFAULT 'client' CHECK (recipient_type IN ('client', 'vendor', 'admin', 'guest')),
    sender_id UUID,
    sender_name VARCHAR(255),
    template_type VARCHAR(50) NOT NULL,
    template_id UUID REFERENCES communication_templates(id) ON DELETE SET NULL,
    message_content TEXT NOT NULL,
    variables JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'sent', 'delivered', 'failed', 'undelivered')),
    provider VARCHAR(20) NOT NULL DEFAULT 'twilio' CHECK (provider IN ('twilio')),
    provider_id VARCHAR(255),
    provider_response JSONB,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    priority VARCHAR(10) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    scheduled_for TIMESTAMPTZ,
    cost DECIMAL(10,4),
    segments INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_communication_campaigns_org_id ON communication_campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_communication_campaigns_status ON communication_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_communication_campaigns_scheduled_for ON communication_campaigns(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_communication_campaigns_created_at ON communication_campaigns(created_at);

CREATE INDEX IF NOT EXISTS idx_bulk_message_recipients_campaign_id ON bulk_message_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_bulk_message_recipients_recipient_id ON bulk_message_recipients(recipient_id);
CREATE INDEX IF NOT EXISTS idx_bulk_message_recipients_email_status ON bulk_message_recipients(email_status);
CREATE INDEX IF NOT EXISTS idx_bulk_message_recipients_sms_status ON bulk_message_recipients(sms_status);

CREATE INDEX IF NOT EXISTS idx_communication_templates_org_id ON communication_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_communication_templates_type ON communication_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_communication_templates_active ON communication_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_sms_notifications_org_id ON sms_notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_status ON sms_notifications(status);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_recipient_phone ON sms_notifications(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_scheduled_for ON sms_notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_created_at ON sms_notifications(created_at);

-- Add triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_communication_campaigns_updated_at BEFORE UPDATE ON communication_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bulk_message_recipients_updated_at BEFORE UPDATE ON bulk_message_recipients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_communication_templates_updated_at BEFORE UPDATE ON communication_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sms_notifications_updated_at BEFORE UPDATE ON sms_notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add Row Level Security
ALTER TABLE communication_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_message_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for communication_campaigns
CREATE POLICY "communication_campaigns_select_policy" ON communication_campaigns FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "communication_campaigns_insert_policy" ON communication_campaigns FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
            AND role IN ('OWNER', 'ADMIN', 'MEMBER')
        )
    );

CREATE POLICY "communication_campaigns_update_policy" ON communication_campaigns FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
            AND role IN ('OWNER', 'ADMIN', 'MEMBER')
        )
    );

-- RLS Policies for bulk_message_recipients
CREATE POLICY "bulk_message_recipients_select_policy" ON bulk_message_recipients FOR SELECT
    USING (
        campaign_id IN (
            SELECT id FROM communication_campaigns 
            WHERE organization_id IN (
                SELECT organization_id FROM user_profiles 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "bulk_message_recipients_insert_policy" ON bulk_message_recipients FOR INSERT
    WITH CHECK (
        campaign_id IN (
            SELECT id FROM communication_campaigns 
            WHERE organization_id IN (
                SELECT organization_id FROM user_profiles 
                WHERE user_id = auth.uid()
                AND role IN ('OWNER', 'ADMIN', 'MEMBER')
            )
        )
    );

CREATE POLICY "bulk_message_recipients_update_policy" ON bulk_message_recipients FOR UPDATE
    USING (
        campaign_id IN (
            SELECT id FROM communication_campaigns 
            WHERE organization_id IN (
                SELECT organization_id FROM user_profiles 
                WHERE user_id = auth.uid()
                AND role IN ('OWNER', 'ADMIN', 'MEMBER')
            )
        )
    );

-- RLS Policies for communication_templates  
CREATE POLICY "communication_templates_select_policy" ON communication_templates FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
        OR is_system_template = true
    );

CREATE POLICY "communication_templates_insert_policy" ON communication_templates FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
            AND role IN ('OWNER', 'ADMIN', 'MEMBER')
        )
    );

CREATE POLICY "communication_templates_update_policy" ON communication_templates FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
            AND role IN ('OWNER', 'ADMIN', 'MEMBER')
        )
        AND is_system_template = false
    );

-- RLS Policies for sms_notifications
CREATE POLICY "sms_notifications_select_policy" ON sms_notifications FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "sms_notifications_insert_policy" ON sms_notifications FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
            AND role IN ('OWNER', 'ADMIN', 'MEMBER')
        )
    );

CREATE POLICY "sms_notifications_update_policy" ON sms_notifications FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
            AND role IN ('OWNER', 'ADMIN', 'MEMBER')
        )
    );

-- Insert some default system templates
INSERT INTO communication_templates (name, description, template_type, category, channels, subject, content, variables, is_system_template, created_by) VALUES
(
    'Wedding Update Notification',
    'General wedding update template for important announcements',
    'wedding_update',
    'system',
    ARRAY['email', 'sms'],
    'Important Wedding Update from {{vendor_name}}',
    'Hi {{guest_name}},

We have an important update about {{couple_names}} wedding:

{{update_message}}

Please visit your wedding portal for more details: {{portal_link}}

Best regards,
{{vendor_name}}',
    ARRAY['guest_name', 'couple_names', 'vendor_name', 'update_message', 'portal_link'],
    true,
    '00000000-0000-0000-0000-000000000000'
),
(
    'Venue Change Notification',
    'Template for notifying guests about venue changes',
    'venue_change',
    'system',
    ARRAY['email', 'sms'],
    'URGENT: Venue Change for {{couple_names}} Wedding',
    'Hi {{guest_name}},

Important venue change for {{couple_names}} wedding on {{wedding_date}}:

New Venue: {{new_venue_name}}
Address: {{new_venue_address}}
Date & Time: {{wedding_date}} at {{wedding_time}}

Please update your calendar and GPS. Contact us with any questions.

{{vendor_name}}
{{contact_info}}',
    ARRAY['guest_name', 'couple_names', 'wedding_date', 'wedding_time', 'new_venue_name', 'new_venue_address', 'vendor_name', 'contact_info'],
    true,
    '00000000-0000-0000-0000-000000000000'
),
(
    'RSVP Reminder',
    'Template for RSVP deadline reminders',
    'rsvp_reminder',
    'system',
    ARRAY['email', 'sms'],
    'RSVP Reminder: {{couple_names}} Wedding',
    'Hi {{guest_name}},

This is a friendly reminder to RSVP for {{couple_names}} wedding on {{wedding_date}}.

RSVP Deadline: {{rsvp_deadline}}
RSVP Link: {{rsvp_link}}

We need your response to finalize catering and seating arrangements.

Thank you!
{{vendor_name}}',
    ARRAY['guest_name', 'couple_names', 'wedding_date', 'rsvp_deadline', 'rsvp_link', 'vendor_name'],
    true,
    '00000000-0000-0000-0000-000000000000'
);

-- Add comment
COMMENT ON TABLE communication_campaigns IS 'Tracks bulk messaging campaigns with delivery statistics';
COMMENT ON TABLE bulk_message_recipients IS 'Individual recipient tracking for bulk campaigns';
COMMENT ON TABLE communication_templates IS 'Reusable message templates with personalization variables';
COMMENT ON TABLE sms_notifications IS 'SMS notification tracking parallel to email_notifications';