-- ============================================================================
-- WS-168: Customer Success Dashboard - Health Database Schema
-- ============================================================================
-- Team D - Round 1 Implementation
-- Date: 2025-08-27
-- 
-- This migration creates the database schema for customer health tracking,
-- success milestones, and support interactions to enable proactive customer
-- success management and churn prevention.
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm" SCHEMA public;

-- ============================================================================
-- CUSTOMER HEALTH TABLE
-- ============================================================================
-- Tracks overall health scores and metrics for each supplier organization

CREATE TABLE IF NOT EXISTS customer_health (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign keys
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Health metrics (0-100 scale)
    overall_health_score NUMERIC(5, 2) NOT NULL CHECK (overall_health_score >= 0 AND overall_health_score <= 100),
    engagement_score NUMERIC(5, 2) CHECK (engagement_score >= 0 AND engagement_score <= 100),
    feature_adoption_score NUMERIC(5, 2) CHECK (feature_adoption_score >= 0 AND feature_adoption_score <= 100),
    activity_score NUMERIC(5, 2) CHECK (activity_score >= 0 AND activity_score <= 100),
    satisfaction_score NUMERIC(5, 2) CHECK (satisfaction_score >= 0 AND satisfaction_score <= 100),
    
    -- Health status categorization
    health_status TEXT NOT NULL CHECK (health_status IN ('healthy', 'at_risk', 'critical', 'churning')),
    
    -- Usage metrics
    last_login_at TIMESTAMPTZ,
    days_since_last_activity INTEGER DEFAULT 0,
    total_logins_30d INTEGER DEFAULT 0,
    total_actions_30d INTEGER DEFAULT 0,
    
    -- Feature adoption
    features_used JSONB DEFAULT '[]'::jsonb,
    features_total INTEGER DEFAULT 0,
    core_features_adopted INTEGER DEFAULT 0,
    
    -- Client metrics
    active_clients INTEGER DEFAULT 0,
    total_clients INTEGER DEFAULT 0,
    client_growth_rate NUMERIC(5, 2),
    
    -- Engagement metrics
    messages_sent_30d INTEGER DEFAULT 0,
    forms_created_30d INTEGER DEFAULT 0,
    journeys_created_30d INTEGER DEFAULT 0,
    documents_uploaded_30d INTEGER DEFAULT 0,
    
    -- Risk indicators
    risk_factors JSONB DEFAULT '[]'::jsonb,
    risk_level TEXT CHECK (risk_level IN ('none', 'low', 'medium', 'high', 'critical')),
    churn_probability NUMERIC(5, 2) CHECK (churn_probability >= 0 AND churn_probability <= 100),
    
    -- Intervention tracking
    last_intervention_at TIMESTAMPTZ,
    intervention_needed BOOLEAN DEFAULT FALSE,
    intervention_reason TEXT,
    
    -- Billing & subscription
    subscription_tier TEXT,
    mrr_value NUMERIC(10, 2),
    payment_status TEXT CHECK (payment_status IN ('current', 'overdue', 'failed', 'cancelled')),
    next_renewal_date DATE,
    
    -- Metadata
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_org_health UNIQUE (organization_id)
);

-- ============================================================================
-- SUCCESS MILESTONES TABLE
-- ============================================================================
-- Tracks achievement milestones and success events for each organization

CREATE TABLE IF NOT EXISTS success_milestones (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign keys
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Milestone information
    milestone_type TEXT NOT NULL CHECK (milestone_type IN (
        'first_login',
        'first_client',
        'first_form',
        'first_journey',
        'first_payment',
        'ten_clients',
        'fifty_clients',
        'hundred_clients',
        'first_month_active',
        'three_months_active',
        'six_months_active',
        'one_year_active',
        'feature_power_user',
        'high_engagement',
        'referral_made',
        'case_study',
        'testimonial',
        'custom'
    )),
    
    -- Achievement details
    milestone_name TEXT NOT NULL,
    milestone_description TEXT,
    milestone_value JSONB DEFAULT '{}'::jsonb,
    
    -- Impact metrics
    health_score_impact NUMERIC(5, 2),
    retention_impact TEXT,
    
    -- Achievement tracking
    achieved_at TIMESTAMPTZ NOT NULL,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES user_profiles(id),
    
    -- Rewards/recognition
    reward_type TEXT,
    reward_value JSONB,
    reward_delivered BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Indexes for common queries
    CONSTRAINT unique_org_milestone_type UNIQUE (organization_id, milestone_type)
);

-- ============================================================================
-- SUPPORT INTERACTIONS TABLE
-- ============================================================================
-- Tracks all support and customer success interactions with organizations

CREATE TABLE IF NOT EXISTS support_interactions (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign keys
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    initiated_by UUID REFERENCES user_profiles(id),
    assigned_to UUID REFERENCES user_profiles(id),
    
    -- Interaction details
    interaction_type TEXT NOT NULL CHECK (interaction_type IN (
        'check_in',
        'onboarding',
        'training',
        'support_ticket',
        'feature_request',
        'bug_report',
        'account_review',
        'retention_call',
        'upgrade_discussion',
        'downgrade_prevention',
        'churn_prevention',
        'win_back',
        'feedback_session',
        'success_planning',
        'escalation'
    )),
    
    -- Communication channel
    channel TEXT CHECK (channel IN ('email', 'phone', 'chat', 'video', 'in_app', 'ticket')),
    
    -- Interaction content
    subject TEXT NOT NULL,
    description TEXT,
    notes TEXT,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
        'open',
        'in_progress',
        'waiting_customer',
        'waiting_internal',
        'resolved',
        'closed',
        'cancelled'
    )),
    
    -- Priority and urgency
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    urgency_reason TEXT,
    
    -- Outcome tracking
    outcome TEXT CHECK (outcome IN (
        'resolved',
        'escalated',
        'deferred',
        'no_response',
        'customer_satisfied',
        'customer_unsatisfied',
        'retained',
        'churned',
        'upgraded',
        'downgraded'
    )),
    outcome_notes TEXT,
    
    -- Health impact
    health_score_before NUMERIC(5, 2),
    health_score_after NUMERIC(5, 2),
    health_impact NUMERIC(5, 2) GENERATED ALWAYS AS (health_score_after - health_score_before) STORED,
    
    -- Sentiment analysis
    sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', 'mixed')),
    sentiment_score NUMERIC(3, 2),
    
    -- Follow-up tracking
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    follow_up_completed BOOLEAN DEFAULT FALSE,
    
    -- Resolution metrics
    response_time_hours NUMERIC(6, 2),
    resolution_time_hours NUMERIC(6, 2),
    customer_effort_score INTEGER CHECK (customer_effort_score >= 1 AND customer_effort_score <= 5),
    satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
    
    -- Related items
    related_ticket_id TEXT,
    related_feature_id UUID,
    related_milestone_id UUID REFERENCES success_milestones(id),
    
    -- Timestamps
    interaction_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Customer Health indexes
CREATE INDEX idx_customer_health_org_id ON customer_health(organization_id);
CREATE INDEX idx_customer_health_status ON customer_health(health_status);
CREATE INDEX idx_customer_health_score ON customer_health(overall_health_score DESC);
CREATE INDEX idx_customer_health_risk ON customer_health(risk_level) WHERE risk_level IN ('high', 'critical');
CREATE INDEX idx_customer_health_intervention ON customer_health(intervention_needed) WHERE intervention_needed = TRUE;
CREATE INDEX idx_customer_health_churn ON customer_health(churn_probability DESC) WHERE churn_probability > 50;
CREATE INDEX idx_customer_health_calculated ON customer_health(calculated_at DESC);
CREATE INDEX idx_customer_health_last_login ON customer_health(last_login_at DESC NULLS LAST);
CREATE INDEX idx_customer_health_payment ON customer_health(payment_status) WHERE payment_status != 'current';

-- Success Milestones indexes
CREATE INDEX idx_milestones_org_id ON success_milestones(organization_id);
CREATE INDEX idx_milestones_type ON success_milestones(milestone_type);
CREATE INDEX idx_milestones_achieved ON success_milestones(achieved_at DESC);
CREATE INDEX idx_milestones_unacknowledged ON success_milestones(acknowledged) WHERE acknowledged = FALSE;

-- Support Interactions indexes
CREATE INDEX idx_support_org_id ON support_interactions(organization_id);
CREATE INDEX idx_support_status ON support_interactions(status) WHERE status NOT IN ('resolved', 'closed');
CREATE INDEX idx_support_priority ON support_interactions(priority) WHERE priority IN ('high', 'critical');
CREATE INDEX idx_support_type ON support_interactions(interaction_type);
CREATE INDEX idx_support_assigned ON support_interactions(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_support_follow_up ON support_interactions(follow_up_date) WHERE follow_up_required = TRUE;
CREATE INDEX idx_support_interaction_date ON support_interactions(interaction_at DESC);
CREATE INDEX idx_support_sentiment ON support_interactions(sentiment) WHERE sentiment IN ('negative', 'mixed');

-- Composite indexes for common dashboard queries
CREATE INDEX idx_health_dashboard ON customer_health(
    health_status,
    overall_health_score DESC,
    organization_id
);

CREATE INDEX idx_intervention_queue ON customer_health(
    intervention_needed,
    risk_level,
    churn_probability DESC
) WHERE intervention_needed = TRUE;

CREATE INDEX idx_support_dashboard ON support_interactions(
    organization_id,
    status,
    interaction_at DESC
) WHERE status IN ('open', 'in_progress');

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE customer_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE success_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_interactions ENABLE ROW LEVEL SECURITY;

-- Customer Health policies - Admin only access
CREATE POLICY "Admin users can view all customer health data"
    ON customer_health FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admin users can manage customer health data"
    ON customer_health FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role IN ('admin', 'super_admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role IN ('admin', 'super_admin')
        )
    );

-- Success Milestones policies - Admin only access
CREATE POLICY "Admin users can view all milestones"
    ON success_milestones FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admin users can manage milestones"
    ON success_milestones FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role IN ('admin', 'super_admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role IN ('admin', 'super_admin')
        )
    );

-- Support Interactions policies - Admin and assigned support staff
CREATE POLICY "Admin users can view all support interactions"
    ON support_interactions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role IN ('admin', 'super_admin', 'support')
        )
        OR assigned_to = auth.uid()
    );

CREATE POLICY "Admin and support users can manage interactions"
    ON support_interactions FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role IN ('admin', 'super_admin', 'support')
        )
        OR assigned_to = auth.uid()
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role IN ('admin', 'super_admin', 'support')
        )
    );

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables
CREATE TRIGGER update_customer_health_updated_at
    BEFORE UPDATE ON customer_health
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_success_milestones_updated_at
    BEFORE UPDATE ON success_milestones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_interactions_updated_at
    BEFORE UPDATE ON support_interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate overall health score
CREATE OR REPLACE FUNCTION calculate_health_score(
    p_organization_id UUID
) RETURNS NUMERIC AS $$
DECLARE
    v_health_score NUMERIC(5, 2);
    v_engagement NUMERIC(5, 2);
    v_adoption NUMERIC(5, 2);
    v_activity NUMERIC(5, 2);
    v_satisfaction NUMERIC(5, 2);
BEGIN
    -- Calculate component scores (simplified example)
    -- In production, these would be more sophisticated calculations
    
    -- Calculate engagement score based on recent activity
    SELECT 
        LEAST(100, (total_logins_30d * 2 + total_actions_30d * 0.5))::NUMERIC(5, 2)
    INTO v_engagement
    FROM customer_health
    WHERE organization_id = p_organization_id;
    
    -- Calculate adoption score based on features used
    SELECT 
        CASE 
            WHEN features_total > 0 THEN 
                (core_features_adopted::NUMERIC / features_total * 100)::NUMERIC(5, 2)
            ELSE 0
        END
    INTO v_adoption
    FROM customer_health
    WHERE organization_id = p_organization_id;
    
    -- Calculate activity score based on days since last activity
    SELECT 
        GREATEST(0, 100 - (days_since_last_activity * 2))::NUMERIC(5, 2)
    INTO v_activity
    FROM customer_health
    WHERE organization_id = p_organization_id;
    
    -- Default satisfaction score (would come from surveys/NPS in production)
    v_satisfaction := 75.00;
    
    -- Calculate weighted overall score
    v_health_score := (
        v_engagement * 0.3 +
        v_adoption * 0.3 +
        v_activity * 0.25 +
        v_satisfaction * 0.15
    )::NUMERIC(5, 2);
    
    RETURN v_health_score;
END;
$$ LANGUAGE plpgsql;

-- Function to determine health status based on score
CREATE OR REPLACE FUNCTION determine_health_status(
    p_health_score NUMERIC
) RETURNS TEXT AS $$
BEGIN
    RETURN CASE
        WHEN p_health_score >= 80 THEN 'healthy'
        WHEN p_health_score >= 60 THEN 'at_risk'
        WHEN p_health_score >= 40 THEN 'critical'
        ELSE 'churning'
    END;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE customer_health IS 'Tracks overall health metrics and scores for each supplier organization to enable proactive customer success management';
COMMENT ON TABLE success_milestones IS 'Records achievement milestones and success events for organizations to track progress and celebrate wins';
COMMENT ON TABLE support_interactions IS 'Logs all support and customer success interactions with organizations for tracking intervention history and outcomes';

COMMENT ON COLUMN customer_health.overall_health_score IS 'Composite health score from 0-100 calculated from multiple factors';
COMMENT ON COLUMN customer_health.health_status IS 'Categorized health status: healthy (80+), at_risk (60-79), critical (40-59), churning (<40)';
COMMENT ON COLUMN customer_health.churn_probability IS 'ML-predicted probability of churn in next 30 days (0-100%)';

COMMENT ON COLUMN success_milestones.milestone_type IS 'Type of milestone achieved by the organization';
COMMENT ON COLUMN success_milestones.health_score_impact IS 'Impact on health score when milestone was achieved';

COMMENT ON COLUMN support_interactions.interaction_type IS 'Type of support or success interaction';
COMMENT ON COLUMN support_interactions.health_impact IS 'Change in health score as a result of this interaction';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================