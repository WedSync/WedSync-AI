-- Marketing Automation System Migration
-- WS-134: Automated Marketing Campaigns and Workflows

BEGIN;

-- Create Marketing Campaigns table
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    campaign_type TEXT NOT NULL CHECK (campaign_type IN ('email', 'sms', 'mixed', 'drip', 'trigger')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
    
    -- Campaign configuration
    target_audience JSONB NOT NULL DEFAULT '{}',
    segmentation_rules JSONB NOT NULL DEFAULT '{}',
    
    -- Automation settings
    trigger_conditions JSONB DEFAULT NULL, -- For trigger-based campaigns
    schedule_settings JSONB DEFAULT NULL, -- For scheduled campaigns
    workflow_config JSONB NOT NULL DEFAULT '{}',
    
    -- A/B testing integration (will be enabled when A/B testing tables exist)
    enable_ab_testing BOOLEAN NOT NULL DEFAULT false,
    ab_test_id UUID, -- Will reference ab_tests(id) when available
    
    -- Performance tracking
    total_sent INTEGER NOT NULL DEFAULT 0,
    total_delivered INTEGER NOT NULL DEFAULT 0,
    total_opened INTEGER NOT NULL DEFAULT 0,
    total_clicked INTEGER NOT NULL DEFAULT 0,
    total_converted INTEGER NOT NULL DEFAULT 0,
    
    -- Calculated rates (updated via triggers)
    delivery_rate DECIMAL(5,4) NOT NULL DEFAULT 0,
    open_rate DECIMAL(5,4) NOT NULL DEFAULT 0,
    click_rate DECIMAL(5,4) NOT NULL DEFAULT 0,
    conversion_rate DECIMAL(5,4) NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    
    -- Organization and user tracking
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create Marketing Campaign Steps table (for workflow automation)
CREATE TABLE IF NOT EXISTS marketing_campaign_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    
    step_name TEXT NOT NULL,
    step_type TEXT NOT NULL CHECK (step_type IN ('email', 'sms', 'delay', 'condition', 'webhook', 'update_profile')),
    step_order INTEGER NOT NULL,
    
    -- Step configuration
    config JSONB NOT NULL DEFAULT '{}', -- Step-specific configuration
    template_id UUID, -- Reference to email/sms template
    
    -- Conditional logic
    conditions JSONB DEFAULT NULL, -- Conditions for this step
    true_next_step_id UUID REFERENCES marketing_campaign_steps(id) ON DELETE SET NULL,
    false_next_step_id UUID REFERENCES marketing_campaign_steps(id) ON DELETE SET NULL,
    
    -- Performance tracking
    total_executions INTEGER NOT NULL DEFAULT 0,
    successful_executions INTEGER NOT NULL DEFAULT 0,
    failed_executions INTEGER NOT NULL DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create User Segmentation table
CREATE TABLE IF NOT EXISTS user_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    
    -- Segmentation rules
    rules JSONB NOT NULL DEFAULT '{}', -- Complex segmentation logic
    dynamic BOOLEAN NOT NULL DEFAULT true, -- Whether segment updates automatically
    
    -- Performance metrics
    total_users INTEGER NOT NULL DEFAULT 0,
    active_users INTEGER NOT NULL DEFAULT 0,
    last_calculated_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create User Segment Memberships table
CREATE TABLE IF NOT EXISTS user_segment_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    segment_id UUID NOT NULL REFERENCES user_segments(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    -- Membership metadata
    added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    score DECIMAL(5,4) DEFAULT NULL, -- Relevance score for this membership
    metadata JSONB DEFAULT '{}',
    
    UNIQUE(segment_id, client_id)
);

-- Create Campaign Executions table (tracks individual campaign runs)
CREATE TABLE IF NOT EXISTS marketing_campaign_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    -- Execution tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'skipped')),
    current_step_id UUID REFERENCES marketing_campaign_steps(id) ON DELETE SET NULL,
    
    -- Performance data
    steps_completed INTEGER NOT NULL DEFAULT 0,
    total_steps INTEGER NOT NULL DEFAULT 0,
    
    -- Metadata
    execution_data JSONB DEFAULT '{}', -- Store variable data during execution
    error_message TEXT,
    
    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    next_execution_at TIMESTAMP WITH TIME ZONE, -- For delayed steps
    
    -- A/B testing (will be enabled when A/B testing tables exist)
    variant_id UUID -- Will reference ab_test_variants(id) when available
);

-- Create Campaign Messages table (tracks individual messages sent)
CREATE TABLE IF NOT EXISTS marketing_campaign_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    execution_id UUID NOT NULL REFERENCES marketing_campaign_executions(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES marketing_campaign_steps(id) ON DELETE CASCADE,
    
    -- Message details
    message_type TEXT NOT NULL CHECK (message_type IN ('email', 'sms', 'whatsapp')),
    recipient TEXT NOT NULL, -- Email or phone number
    subject TEXT,
    content TEXT NOT NULL,
    
    -- Delivery tracking
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed')),
    external_id TEXT, -- ID from email/sms provider
    
    -- Engagement tracking
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    replied_at TIMESTAMP WITH TIME ZONE,
    bounced_at TIMESTAMP WITH TIME ZONE,
    
    -- Error tracking
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Marketing Analytics table
CREATE TABLE IF NOT EXISTS marketing_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Dimensions
    date DATE NOT NULL,
    campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    segment_id UUID REFERENCES user_segments(id) ON DELETE CASCADE,
    message_type TEXT,
    
    -- Metrics
    sent_count INTEGER NOT NULL DEFAULT 0,
    delivered_count INTEGER NOT NULL DEFAULT 0,
    opened_count INTEGER NOT NULL DEFAULT 0,
    clicked_count INTEGER NOT NULL DEFAULT 0,
    replied_count INTEGER NOT NULL DEFAULT 0,
    converted_count INTEGER NOT NULL DEFAULT 0,
    bounced_count INTEGER NOT NULL DEFAULT 0,
    unsubscribed_count INTEGER NOT NULL DEFAULT 0,
    
    -- Calculated rates
    delivery_rate DECIMAL(5,4) NOT NULL DEFAULT 0,
    open_rate DECIMAL(5,4) NOT NULL DEFAULT 0,
    click_rate DECIMAL(5,4) NOT NULL DEFAULT 0,
    conversion_rate DECIMAL(5,4) NOT NULL DEFAULT 0,
    bounce_rate DECIMAL(5,4) NOT NULL DEFAULT 0,
    
    -- Revenue metrics
    total_revenue DECIMAL(10,2) DEFAULT 0,
    average_order_value DECIMAL(10,2) DEFAULT 0,
    
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    UNIQUE(date, campaign_id, segment_id, message_type, organization_id)
);

-- Create Email Templates table (enhanced for marketing)
CREATE TABLE IF NOT EXISTS marketing_email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    
    -- Template content
    subject TEXT NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    
    -- Template configuration
    template_type TEXT NOT NULL CHECK (template_type IN ('welcome', 'promotional', 'transactional', 'reminder', 'follow_up', 'newsletter')),
    merge_fields JSONB NOT NULL DEFAULT '[]', -- List of available merge fields
    
    -- Design settings
    brand_config JSONB DEFAULT '{}', -- Brand colors, fonts, etc.
    responsive BOOLEAN NOT NULL DEFAULT true,
    
    -- Usage tracking
    usage_count INTEGER NOT NULL DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Performance metrics
    average_open_rate DECIMAL(5,4),
    average_click_rate DECIMAL(5,4),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_organization_id ON marketing_campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_type ON marketing_campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_created_at ON marketing_campaigns(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaign_steps_campaign_id ON marketing_campaign_steps(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_steps_order ON marketing_campaign_steps(campaign_id, step_order);

CREATE INDEX IF NOT EXISTS idx_user_segments_organization_id ON user_segments(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_segments_dynamic ON user_segments(dynamic);

CREATE INDEX IF NOT EXISTS idx_segment_memberships_segment_id ON user_segment_memberships(segment_id);
CREATE INDEX IF NOT EXISTS idx_segment_memberships_client_id ON user_segment_memberships(client_id);

CREATE INDEX IF NOT EXISTS idx_campaign_executions_campaign_id ON marketing_campaign_executions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_executions_client_id ON marketing_campaign_executions(client_id);
CREATE INDEX IF NOT EXISTS idx_campaign_executions_status ON marketing_campaign_executions(status);
CREATE INDEX IF NOT EXISTS idx_campaign_executions_next_execution ON marketing_campaign_executions(next_execution_at) WHERE next_execution_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campaign_messages_campaign_id ON marketing_campaign_messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_messages_execution_id ON marketing_campaign_messages(execution_id);
CREATE INDEX IF NOT EXISTS idx_campaign_messages_status ON marketing_campaign_messages(status);
CREATE INDEX IF NOT EXISTS idx_campaign_messages_type ON marketing_campaign_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_campaign_messages_created_at ON marketing_campaign_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketing_analytics_date ON marketing_analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_analytics_campaign_id ON marketing_analytics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_marketing_analytics_organization_id ON marketing_analytics(organization_id);

CREATE INDEX IF NOT EXISTS idx_marketing_email_templates_organization_id ON marketing_email_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_marketing_email_templates_type ON marketing_email_templates(template_type);

-- Create updated_at triggers
CREATE TRIGGER update_marketing_campaigns_updated_at 
    BEFORE UPDATE ON marketing_campaigns 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_steps_updated_at 
    BEFORE UPDATE ON marketing_campaign_steps 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_segments_updated_at 
    BEFORE UPDATE ON user_segments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_messages_updated_at 
    BEFORE UPDATE ON marketing_campaign_messages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketing_email_templates_updated_at 
    BEFORE UPDATE ON marketing_email_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate campaign performance rates
CREATE OR REPLACE FUNCTION calculate_campaign_performance_rates()
RETURNS TRIGGER AS $$
BEGIN
    -- Update delivery rate
    IF NEW.total_sent > 0 THEN
        NEW.delivery_rate = CAST(NEW.total_delivered AS DECIMAL) / NEW.total_sent;
    ELSE
        NEW.delivery_rate = 0;
    END IF;
    
    -- Update open rate
    IF NEW.total_delivered > 0 THEN
        NEW.open_rate = CAST(NEW.total_opened AS DECIMAL) / NEW.total_delivered;
    ELSE
        NEW.open_rate = 0;
    END IF;
    
    -- Update click rate
    IF NEW.total_delivered > 0 THEN
        NEW.click_rate = CAST(NEW.total_clicked AS DECIMAL) / NEW.total_delivered;
    ELSE
        NEW.click_rate = 0;
    END IF;
    
    -- Update conversion rate
    IF NEW.total_sent > 0 THEN
        NEW.conversion_rate = CAST(NEW.total_converted AS DECIMAL) / NEW.total_sent;
    ELSE
        NEW.conversion_rate = 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate performance rates
CREATE TRIGGER calculate_campaign_performance_rates_trigger
    BEFORE INSERT OR UPDATE ON marketing_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION calculate_campaign_performance_rates();

-- Create function to update segment membership counts
CREATE OR REPLACE FUNCTION update_segment_user_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE user_segments 
        SET total_users = total_users + 1,
            last_calculated_at = NOW()
        WHERE id = NEW.segment_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE user_segments 
        SET total_users = GREATEST(total_users - 1, 0),
            last_calculated_at = NOW()
        WHERE id = OLD.segment_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to maintain segment counts
CREATE TRIGGER update_segment_counts_trigger
    AFTER INSERT OR DELETE ON user_segment_memberships
    FOR EACH ROW
    EXECUTE FUNCTION update_segment_user_counts();

-- Create function for campaign message status updates
CREATE OR REPLACE FUNCTION handle_campaign_message_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Update campaign aggregates when message status changes
    IF OLD.status != NEW.status THEN
        -- Update campaign totals based on new status
        CASE NEW.status
            WHEN 'sent' THEN
                UPDATE marketing_campaigns 
                SET total_sent = total_sent + 1
                WHERE id = NEW.campaign_id;
                
            WHEN 'delivered' THEN
                UPDATE marketing_campaigns 
                SET total_delivered = total_delivered + 1
                WHERE id = NEW.campaign_id;
                
            WHEN 'opened' THEN
                IF NEW.opened_at IS NOT NULL AND OLD.opened_at IS NULL THEN
                    UPDATE marketing_campaigns 
                    SET total_opened = total_opened + 1
                    WHERE id = NEW.campaign_id;
                END IF;
                
            WHEN 'clicked' THEN
                IF NEW.clicked_at IS NOT NULL AND OLD.clicked_at IS NULL THEN
                    UPDATE marketing_campaigns 
                    SET total_clicked = total_clicked + 1
                    WHERE id = NEW.campaign_id;
                END IF;
        END CASE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for message status changes
CREATE TRIGGER handle_campaign_message_status_trigger
    AFTER UPDATE ON marketing_campaign_messages
    FOR EACH ROW
    EXECUTE FUNCTION handle_campaign_message_status_change();

-- Create function to get next campaign step
CREATE OR REPLACE FUNCTION get_next_campaign_step(
    p_current_step_id UUID,
    p_execution_data JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    v_step_record RECORD;
    v_next_step_id UUID;
    v_condition_result BOOLEAN;
BEGIN
    -- Get current step details
    SELECT * INTO v_step_record
    FROM marketing_campaign_steps
    WHERE id = p_current_step_id;
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    -- If step has conditions, evaluate them
    IF v_step_record.conditions IS NOT NULL THEN
        -- Simple condition evaluation (can be extended)
        -- For now, just check if condition is true in execution_data
        v_condition_result := COALESCE(
            (p_execution_data->>'condition_result')::boolean, 
            true
        );
        
        IF v_condition_result THEN
            v_next_step_id := v_step_record.true_next_step_id;
        ELSE
            v_next_step_id := v_step_record.false_next_step_id;
        END IF;
    ELSE
        -- Get next step in sequence
        SELECT id INTO v_next_step_id
        FROM marketing_campaign_steps
        WHERE campaign_id = v_step_record.campaign_id
        AND step_order = v_step_record.step_order + 1
        ORDER BY step_order
        LIMIT 1;
    END IF;
    
    RETURN v_next_step_id;
END;
$$ LANGUAGE plpgsql;

-- Create views for reporting
CREATE OR REPLACE VIEW campaign_performance_summary AS
SELECT 
    c.id,
    c.name,
    c.campaign_type,
    c.status,
    c.total_sent,
    c.total_delivered,
    c.total_opened,
    c.total_clicked,
    c.total_converted,
    c.delivery_rate,
    c.open_rate,
    c.click_rate,
    c.conversion_rate,
    c.created_at,
    c.started_at,
    c.ended_at,
    o.name as organization_name,
    -- Calculate campaign ROI if revenue data available
    CASE 
        WHEN c.total_sent > 0 
        THEN COALESCE(
            (SELECT SUM(total_revenue) FROM marketing_analytics WHERE campaign_id = c.id), 
            0
        ) / NULLIF(c.total_sent, 0)
        ELSE 0 
    END as revenue_per_recipient
FROM marketing_campaigns c
JOIN organizations o ON c.organization_id = o.id
ORDER BY c.created_at DESC;

-- Enable Row Level Security
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaign_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_segment_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaign_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaign_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_email_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view campaigns in their organization" ON marketing_campaigns
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM user_profiles 
            WHERE id = ( SELECT auth.uid() )
        )
    );

CREATE POLICY "Users can create campaigns in their organization" ON marketing_campaigns
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM user_profiles 
            WHERE id = ( SELECT auth.uid() )
        ) AND created_by = ( SELECT auth.uid() )
    );

CREATE POLICY "Users can update their organization's campaigns" ON marketing_campaigns
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id 
            FROM user_profiles 
            WHERE id = ( SELECT auth.uid() )
        )
    );

-- Similar policies for other tables
CREATE POLICY "Users can manage campaign steps in their organization" ON marketing_campaign_steps
    FOR ALL USING (
        campaign_id IN (
            SELECT id FROM marketing_campaigns WHERE organization_id IN (
                SELECT organization_id 
                FROM user_profiles 
                WHERE id = ( SELECT auth.uid() )
            )
        )
    );

CREATE POLICY "Users can manage segments in their organization" ON user_segments
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id 
            FROM user_profiles 
            WHERE id = ( SELECT auth.uid() )
        )
    );

-- Grant permissions to service role for backend operations
GRANT ALL ON marketing_campaigns TO service_role;
GRANT ALL ON marketing_campaign_steps TO service_role;
GRANT ALL ON user_segments TO service_role;
GRANT ALL ON user_segment_memberships TO service_role;
GRANT ALL ON marketing_campaign_executions TO service_role;
GRANT ALL ON marketing_campaign_messages TO service_role;
GRANT ALL ON marketing_analytics TO service_role;
GRANT ALL ON marketing_email_templates TO service_role;

-- Comments for documentation
COMMENT ON TABLE marketing_campaigns IS 'Marketing automation campaigns with workflows and A/B testing';
COMMENT ON TABLE marketing_campaign_steps IS 'Individual steps in marketing campaign workflows';
COMMENT ON TABLE user_segments IS 'User segmentation for targeted marketing';
COMMENT ON TABLE user_segment_memberships IS 'Relationships between users and segments';
COMMENT ON TABLE marketing_campaign_executions IS 'Individual campaign execution instances per user';
COMMENT ON TABLE marketing_campaign_messages IS 'Individual messages sent as part of campaigns';
COMMENT ON TABLE marketing_analytics IS 'Aggregated analytics for marketing performance tracking';
COMMENT ON TABLE marketing_email_templates IS 'Email templates for marketing campaigns';

COMMIT;