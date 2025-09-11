-- WS-168: Customer Success Dashboard - Support Interactions Table  
-- Team D - Round 1 - Support interactions for intervention tracking

-- Create support_interactions table for tracking customer success interventions
CREATE TABLE support_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Interaction Classification
    interaction_type VARCHAR(50) NOT NULL, -- 'proactive_outreach', 'support_ticket', 'health_check', 'churn_prevention', 'onboarding_assistance'
    interaction_category VARCHAR(30) NOT NULL, -- 'support', 'success', 'sales', 'technical', 'billing'
    interaction_method VARCHAR(30) NOT NULL, -- 'email', 'phone', 'chat', 'in_app', 'video_call', 'automated'
    
    -- Trigger and Context
    trigger_event VARCHAR(100), -- What triggered this interaction ('low_health_score', 'milestone_delay', 'support_request')
    trigger_threshold JSONB, -- Specific thresholds that triggered intervention
    health_score_at_interaction DECIMAL(5,2), -- Customer health score when interaction occurred
    churn_risk_level VARCHAR(20), -- 'low', 'medium', 'high', 'critical'
    
    -- Interaction Details
    subject VARCHAR(300) NOT NULL,
    description TEXT,
    interaction_data JSONB DEFAULT '{}', -- Structured data about the interaction
    
    -- Priority and Urgency
    priority VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    urgency VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    
    -- Assignment and Ownership
    assigned_user_id UUID REFERENCES user_profiles(id),
    assigned_team VARCHAR(50), -- 'customer_success', 'support', 'sales', 'technical'
    escalation_level INTEGER DEFAULT 0 CHECK (escalation_level >= 0 AND escalation_level <= 5),
    
    -- Status Tracking
    status VARCHAR(30) NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'pending_customer', 'resolved', 'closed', 'escalated'
    resolution_type VARCHAR(50), -- 'issue_resolved', 'question_answered', 'feature_request', 'bug_fixed', 'training_provided'
    
    -- Timeline and SLA
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    first_response_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    
    -- SLA tracking
    sla_target_response_hours INTEGER DEFAULT 24,
    sla_target_resolution_hours INTEGER DEFAULT 72,
    sla_response_met BOOLEAN,
    sla_resolution_met BOOLEAN,
    
    -- Customer Interaction
    customer_contacted BOOLEAN DEFAULT false,
    customer_response_received BOOLEAN DEFAULT false,
    customer_satisfaction_rating INTEGER CHECK (customer_satisfaction_rating >= 1 AND customer_satisfaction_rating <= 5),
    customer_feedback TEXT,
    
    -- Outcome and Impact
    outcome_category VARCHAR(50), -- 'issue_resolved', 'process_improved', 'feature_adopted', 'churn_prevented', 'upsell_opportunity'
    resolution_notes TEXT,
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date DATE,
    
    -- Health Score Impact
    health_score_impact_predicted DECIMAL(5,2), -- Expected impact on health score
    health_score_impact_actual DECIMAL(5,2), -- Actual impact measured post-interaction
    engagement_impact DECIMAL(5,2),
    satisfaction_impact DECIMAL(5,2),
    
    -- Related Records
    related_milestone_id UUID REFERENCES success_milestones(id),
    related_support_ticket_id VARCHAR(50), -- External support system ticket ID
    related_interaction_ids UUID[], -- Array of related interaction IDs
    
    -- Automation and AI
    auto_generated BOOLEAN DEFAULT false,
    ai_sentiment_score DECIMAL(5,2), -- AI-analyzed sentiment (-100 to +100)
    ai_suggested_actions JSONB DEFAULT '{}',
    ai_risk_assessment JSONB DEFAULT '{}',
    
    -- Communication Tracking
    messages_sent INTEGER DEFAULT 0,
    messages_received INTEGER DEFAULT 0,
    total_touchpoints INTEGER DEFAULT 1,
    communication_preferences JSONB DEFAULT '{}',
    
    -- Metadata
    interaction_version VARCHAR(10) DEFAULT 'v1.0',
    tags TEXT[], -- Array of tags for categorization
    custom_fields JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT valid_resolution CHECK (
        (status IN ('resolved', 'closed') AND resolved_at IS NOT NULL) OR
        (status NOT IN ('resolved', 'closed'))
    ),
    CONSTRAINT valid_satisfaction CHECK (
        (customer_satisfaction_rating IS NULL) OR 
        (customer_satisfaction_rating >= 1 AND customer_satisfaction_rating <= 5)
    )
);

-- Create indexes for performance
CREATE INDEX idx_support_interactions_client_id ON support_interactions(client_id);
CREATE INDEX idx_support_interactions_organization_id ON support_interactions(organization_id);
CREATE INDEX idx_support_interactions_status ON support_interactions(status, priority);
CREATE INDEX idx_support_interactions_assigned ON support_interactions(assigned_user_id, status);
CREATE INDEX idx_support_interactions_type_method ON support_interactions(interaction_type, interaction_method);
CREATE INDEX idx_support_interactions_created ON support_interactions(created_at DESC);
CREATE INDEX idx_support_interactions_health_score ON support_interactions(health_score_at_interaction, churn_risk_level);

-- Create composite indexes for dashboard queries
CREATE INDEX idx_support_interactions_dashboard_main ON support_interactions(organization_id, status, priority, created_at DESC);
CREATE INDEX idx_support_interactions_team_workload ON support_interactions(assigned_team, status, priority);
CREATE INDEX idx_support_interactions_sla_tracking ON support_interactions(sla_response_met, sla_resolution_met, created_at DESC);
CREATE INDEX idx_support_interactions_customer_health ON support_interactions(client_id, health_score_at_interaction, created_at DESC);

-- Create GIN indexes for JSONB fields and arrays
CREATE INDEX idx_support_interactions_interaction_data ON support_interactions USING GIN (interaction_data);
CREATE INDEX idx_support_interactions_tags ON support_interactions USING GIN (tags);
CREATE INDEX idx_support_interactions_ai_suggestions ON support_interactions USING GIN (ai_suggested_actions);

-- RLS Policy - Admin access only
ALTER TABLE support_interactions ENABLE ROW LEVEL SECURITY;

-- Policy for organization members to view interactions for their org
CREATE POLICY "support_interactions_org_select" ON support_interactions
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

-- Policy for organization admins to manage all interactions
CREATE POLICY "support_interactions_org_admin_all" ON support_interactions
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'owner')
        )
    );

-- Policy for assigned users to update their interactions
CREATE POLICY "support_interactions_assigned_update" ON support_interactions
    FOR UPDATE
    USING (assigned_user_id = auth.uid());

-- Policy for customer success team members
CREATE POLICY "support_interactions_cs_team_access" ON support_interactions
    FOR ALL
    USING (
        assigned_team = 'customer_success' AND 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'owner', 'customer_success')
        )
    );

-- Policy for system processes
CREATE POLICY "support_interactions_system_all" ON support_interactions
    FOR ALL
    USING (true);

-- Add trigger for updated_at timestamp and SLA tracking
CREATE OR REPLACE FUNCTION update_support_interactions_updated_at()
RETURNS TRIGGER AS $$
DECLARE
    response_hours DECIMAL;
    resolution_hours DECIMAL;
BEGIN
    NEW.updated_at = NOW();
    
    -- Auto-set first response timestamp and SLA tracking
    IF NEW.first_response_at IS NOT NULL AND OLD.first_response_at IS NULL THEN
        response_hours = EXTRACT(EPOCH FROM (NEW.first_response_at - NEW.created_at)) / 3600;
        NEW.sla_response_met = response_hours <= NEW.sla_target_response_hours;
    END IF;
    
    -- Auto-set resolution timestamp and SLA tracking
    IF NEW.status IN ('resolved', 'closed') AND OLD.status NOT IN ('resolved', 'closed') THEN
        NEW.resolved_at = COALESCE(NEW.resolved_at, NOW());
        
        IF NEW.resolved_at IS NOT NULL THEN
            resolution_hours = EXTRACT(EPOCH FROM (NEW.resolved_at - NEW.created_at)) / 3600;
            NEW.sla_resolution_met = resolution_hours <= NEW.sla_target_resolution_hours;
        END IF;
    END IF;
    
    -- Auto-set closed timestamp
    IF NEW.status = 'closed' AND OLD.status != 'closed' THEN
        NEW.closed_at = COALESCE(NEW.closed_at, NOW());
    END IF;
    
    -- Update message counts
    IF NEW.messages_sent IS NOT NULL AND OLD.messages_sent IS NOT NULL THEN
        IF NEW.messages_sent > OLD.messages_sent THEN
            NEW.customer_contacted = true;
        END IF;
    END IF;
    
    IF NEW.messages_received IS NOT NULL AND OLD.messages_received IS NOT NULL THEN
        IF NEW.messages_received > OLD.messages_received THEN
            NEW.customer_response_received = true;
        END IF;
    END IF;
    
    -- Calculate total touchpoints
    NEW.total_touchpoints = COALESCE(NEW.messages_sent, 0) + COALESCE(NEW.messages_received, 0);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_support_interactions_updated_at
    BEFORE UPDATE ON support_interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_support_interactions_updated_at();

-- Add trigger for insert to set initial SLA targets
CREATE OR REPLACE FUNCTION set_support_interactions_initial_values()
RETURNS TRIGGER AS $$
BEGIN
    -- Set SLA targets based on priority and type
    CASE NEW.priority
        WHEN 'critical' THEN 
            NEW.sla_target_response_hours = 2;
            NEW.sla_target_resolution_hours = 24;
        WHEN 'high' THEN 
            NEW.sla_target_response_hours = 4;
            NEW.sla_target_resolution_hours = 48;
        WHEN 'medium' THEN 
            NEW.sla_target_response_hours = 12;
            NEW.sla_target_resolution_hours = 72;
        ELSE 
            NEW.sla_target_response_hours = 24;
            NEW.sla_target_resolution_hours = 120;
    END CASE;
    
    -- Set urgency based on churn risk level if not specified
    IF NEW.urgency = 'medium' AND NEW.churn_risk_level IS NOT NULL THEN
        CASE NEW.churn_risk_level
            WHEN 'critical' THEN NEW.urgency = 'critical';
            WHEN 'high' THEN NEW.urgency = 'high';
            WHEN 'low' THEN NEW.urgency = 'low';
        END CASE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_support_interactions_insert
    BEFORE INSERT ON support_interactions
    FOR EACH ROW
    EXECUTE FUNCTION set_support_interactions_initial_values();

-- Add comments for documentation
COMMENT ON TABLE support_interactions IS 'WS-168: Support interactions for customer success interventions and tracking';
COMMENT ON COLUMN support_interactions.interaction_type IS 'Type of interaction (proactive_outreach, support_ticket, health_check, etc.)';
COMMENT ON COLUMN support_interactions.trigger_event IS 'Event that triggered this interaction (low_health_score, milestone_delay, etc.)';
COMMENT ON COLUMN support_interactions.health_score_at_interaction IS 'Customer health score when interaction occurred';
COMMENT ON COLUMN support_interactions.sla_target_response_hours IS 'Target hours for first response based on priority';
COMMENT ON COLUMN support_interactions.health_score_impact_predicted IS 'Expected impact on customer health score';
COMMENT ON COLUMN support_interactions.ai_sentiment_score IS 'AI-analyzed sentiment score (-100 to +100)';
COMMENT ON COLUMN support_interactions.escalation_level IS 'Number of times this interaction has been escalated (0-5)';